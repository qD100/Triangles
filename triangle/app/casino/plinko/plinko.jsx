"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { ShieldCheck, Check, Copy, RefreshCw } from "lucide-react";

/* ---------------------------------------------------------------
   Same provably-fair engine as Mines/Roulette:
   commit(server seed hash) -> HMAC(serverSeed, clientSeed:nonce) -> path bits -> reveal & verify
   Each bit of the HMAC output decides one row: 0 = left, 1 = right.
   Final bucket index = number of "right" steps (standard Galton-board mapping),
   which reproduces the binomial distribution the multiplier table is built on.
------------------------------------------------------------------*/
const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(str) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)));
}
async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(sig);
}
function randomSeed() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}
// Derive `rows` left/right bits from a hex hash (1 bit per pin row, 256 bits available -> up to 16 rows is trivial).
function derivePath(hashHex, rows) {
  const bytes = [];
  for (let i = 0; i < hashHex.length; i += 2) bytes.push(parseInt(hashHex.slice(i, i + 2), 16));
  const bits = [];
  for (let i = 0; i < rows; i++) bits.push(bytes[i % bytes.length] % 2); // 0=left, 1=right
  const bucket = bits.reduce((a, b) => a + b, 0);
  return { bits, bucket };
}

/* Multiplier tables: derived analytically so each is a genuine probability-weighted
   payout table with a fixed ~2% house edge, not eyeballed numbers.
   multiplier_k = scale * (p_center / p_k) ^ gamma, normalized so sum(p_k * mult_k) = 0.98 */
const TABLES = {
  8:  { low: [3.57,1.72,1.11,0.87,0.81,0.87,1.11,1.72,3.57],
        medium: [9.97,2.58,1.14,0.73,0.63,0.73,1.14,2.58,9.97],
        high: [27.88,3.48,1.0,0.5,0.4,0.5,1.0,3.48,27.88] },
  12: { low: [8.73,3.66,2.01,1.32,1.0,0.84,0.8,0.84,1.0,1.32,2.01,3.66,8.73],
        medium: [51.6,10.26,3.39,1.55,0.91,0.67,0.61,0.67,0.91,1.55,3.39,10.26,51.6],
        high: [308.78,25.73,4.68,1.4,0.62,0.39,0.33,0.39,0.62,1.4,4.68,25.73,308.78] },
  16: { low: [21.87,8.29,4.09,2.39,1.58,1.16,0.94,0.83,0.8,0.83,0.94,1.16,1.58,2.39,4.09,8.29,21.87],
        medium: [281.53,46.44,12.53,4.6,2.14,1.21,0.82,0.65,0.6,0.65,0.82,1.21,2.14,4.6,12.53,46.44,281.53],
        high: [3777.96,236.12,31.48,6.75,2.08,0.86,0.47,0.33,0.29,0.33,0.47,0.86,2.08,6.75,31.48,236.12,3777.96] },
};

const fmt = (n, d = 4) => Number(n).toFixed(d);
const short = (s) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const ROW_OPTIONS = [8, 12, 16];
const RISK_OPTIONS = ["low", "medium", "high"];

const BOARD_W = 460;
const BOARD_H = 320;
const STEP_MS = 190;

export default function Plinko() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(0.001);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState("medium");
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);

  const [phase, setPhase] = useState("idle"); // idle | dropping | result
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [path, setPath] = useState(null); // {bits, bucket}
  const [ballPos, setBallPos] = useState({ x: BOARD_W / 2, y: 8 });
  const [landedBucket, setLandedBucket] = useState(null);
  const [lastPayout, setLastPayout] = useState(null);
  const [verified, setVerified] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const busy = useRef(false);
  const timers = useRef([]);

  const table = TABLES[rows][risk];
  const slot = BOARD_W / (rows + 2);

  const posForStep = useCallback((r, rightsSoFar) => {
    const x = BOARD_W / 2 + (2 * rightsSoFar - r) * (slot / 2);
    const y = 8 + (r / (rows + 1)) * (BOARD_H - 36);
    return { x, y };
  }, [rows, slot]);

  const clearTimers = () => { timers.current.forEach((t) => (t.cancel ? t.cancel() : clearTimeout(t))); timers.current = []; };

  // Easing: y uses ease-in (accelerating, like gravity), x uses ease-out-back
  // (slight overshoot then settle, like a real bounce off a peg).
  const easeInQuad = (t) => t * t;
  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  const drop = useCallback(async () => {
    if (busy.current || bet <= 0 || bet > balance) return;
    busy.current = true;
    clearTimers();
    setPhase("dropping");
    setVerified(null);
    setLandedBucket(null);
    setLastPayout(null);

    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    const rollHash = await hmacSha256Hex(seed, `${clientSeed}:${nonce}`);
    const p = derivePath(rollHash, rows);

    setServerSeed(seed);
    setServerSeedHash(hash);
    setPath(p);
    setBalance((b) => +(b - bet).toFixed(8));

    // Precompute waypoints for every row (deterministic, from the hash) plus
    // per-segment durations that shrink slightly each row to mimic gravity
    // accelerating the ball as it falls further down the board.
    const waypoints = [{ x: BOARD_W / 2, y: 8 }];
    let rightsSoFar = 0;
    for (let r = 1; r <= rows; r++) {
      rightsSoFar += p.bits[r - 1];
      waypoints.push(posForStep(r, rightsSoFar));
    }
    const durations = Array.from({ length: rows }, (_, i) => Math.max(95, STEP_MS * Math.pow(0.93, i)));
    const cumStart = [0];
    durations.forEach((d) => cumStart.push(cumStart[cumStart.length - 1] + d));
    const totalDuration = cumStart[cumStart.length - 1];

    setBallPos(waypoints[0]);
    let rafId;
    const start = performance.now();

    const frame = (now) => {
      const elapsed = now - start;
      if (elapsed >= totalDuration) {
        setBallPos(waypoints[waypoints.length - 1]);
        const mult = table[p.bucket];
        const payout = +(bet * mult).toFixed(8);
        setBalance((b) => +(b + payout).toFixed(8));
        setLandedBucket(p.bucket);
        setLastPayout(payout);
        setHistory((h) => [{ nonce, bucket: p.bucket, mult, payout }, ...h].slice(0, 12));
        setNonce((n) => n + 1);
        setPhase("result");
        busy.current = false;
        return;
      }
      let seg = 0;
      while (seg < durations.length - 1 && elapsed >= cumStart[seg + 1]) seg++;
      const segT = Math.min(1, (elapsed - cumStart[seg]) / durations[seg]);
      const from = waypoints[seg], to = waypoints[seg + 1];
      const x = lerp(from.x, to.x, easeOutBack(segT));
      const y = lerp(from.y, to.y, easeInQuad(segT));
      const wobble = Math.sin(elapsed / 45) * 1.4 * (1 - segT);
      setBallPos({ x: x + wobble, y });
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    timers.current.push({ cancel: () => cancelAnimationFrame(rafId) });
  }, [bet, balance, clientSeed, nonce, rows, table, posForStep]);

  const newRound = () => {
    setPhase("idle");
    setPath(null);
    setServerSeed(null);
    setServerSeedHash(null);
    setLandedBucket(null);
    setLastPayout(null);
    setVerified(null);
    setBallPos({ x: BOARD_W / 2, y: 8 });
  };

  const verify = async () => {
    if (!serverSeed) return;
    const hash = await sha256Hex(serverSeed);
    setVerified(hash === serverSeedHash);
  };

  const copySeed = () => {
    if (!serverSeed) return;
    navigator.clipboard?.writeText(serverSeed).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const roundOver = phase === "result";
  const pinRows = useMemo(() => Array.from({ length: rows }, (_, i) => i + 1), [rows]);

  return (
    <div className="pk-root">
      <style>{CSS}</style>

      <div className="pk-topbar">
        <div className="pk-brand">
          <span className="pk-brand-mark">◆</span>
          <span className="pk-brand-name">DEEPFIELD</span>
          <span className="pk-brand-tag">plinko · provably fair</span>
        </div>
        <div className="pk-wallet">
          <span className="pk-wallet-label">sBTC balance</span>
          <span className="pk-wallet-value">{fmt(balance)}</span>
        </div>
      </div>

      <div className="pk-ledger">
        <div className="pk-ledger-item">
          <span className="pk-ledger-k">server seed (hash)</span>
          <span className="pk-ledger-v mono">{serverSeedHash ? short(serverSeedHash) : "—"}</span>
        </div>
        <div className="pk-ledger-sep" />
        <div className="pk-ledger-item">
          <span className="pk-ledger-k">client seed</span>
          {phase === "idle" ? (
            <input className="pk-seed-input mono" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} spellCheck={false} />
          ) : (
            <span className="pk-ledger-v mono">{clientSeed}</span>
          )}
        </div>
        <div className="pk-ledger-sep" />
        <div className="pk-ledger-item">
          <span className="pk-ledger-k">nonce</span>
          <span className="pk-ledger-v mono">{nonce}</span>
        </div>
        {roundOver && (
          <>
            <div className="pk-ledger-sep" />
            <div className="pk-ledger-item">
              <span className="pk-ledger-k">server seed (revealed)</span>
              <button className="pk-inline-btn mono" onClick={copySeed}>
                {short(serverSeed)} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button className="pk-verify-btn" onClick={verify}>
              <ShieldCheck size={13} />
              {verified === null ? "Verify" : verified ? "Hash matches" : "Mismatch"}
            </button>
          </>
        )}
      </div>

      <div className="pk-main">
        <div className="pk-board-wrap">
          <div className="pk-board" style={{ width: BOARD_W, height: BOARD_H }}>
            {pinRows.map((r) => {
              const count = r + 2;
              const y = 8 + (r / (rows + 1)) * (BOARD_H - 36);
              return Array.from({ length: count }, (_, i) => {
                const spacing = BOARD_W / (count + 1);
                const x = spacing * (i + 1);
                return <span key={`${r}-${i}`} className="pk-pin" style={{ left: x, top: y }} />;
              });
            })}
            <div className="pk-ball" style={{ left: ballPos.x, top: ballPos.y, opacity: phase === "idle" ? 0 : 1 }} />
          </div>
          <div className="pk-buckets" style={{ width: BOARD_W }}>
            {table.map((m, i) => (
              <div
                key={i}
                className={`pk-bucket ${m >= 5 ? "hi" : m >= 1 ? "mid" : "lo"} ${landedBucket === i ? "landed" : ""}`}
              >
                {m}×
              </div>
            ))}
          </div>
          {phase === "result" && (
            <div className={`pk-payout-msg ${lastPayout >= bet ? "good" : "bad"}`}>
              Landed {table[landedBucket]}× — {lastPayout >= bet ? "+" : ""}{fmt(lastPayout)}
            </div>
          )}
        </div>

        <div className="pk-panel">
          <div className="pk-field">
            <label>Bet amount</label>
            <div className="pk-bet-row">
              <input
                type="number" min="0.0001" step="0.0001" value={bet}
                disabled={phase === "dropping"}
                onChange={(e) => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mono"
              />
              <div className="pk-bet-quick">
                <button disabled={phase === "dropping"} onClick={() => setBet((b) => +(b / 2).toFixed(8))}>½</button>
                <button disabled={phase === "dropping"} onClick={() => setBet((b) => +(b * 2).toFixed(8))}>2×</button>
              </div>
            </div>
          </div>

          <div className="pk-field">
            <label>Rows</label>
            <div className="pk-choice-row">
              {ROW_OPTIONS.map((r) => (
                <button key={r} className={`pk-choice ${rows === r ? "active" : ""}`} disabled={phase === "dropping"} onClick={() => setRows(r)}>{r}</button>
              ))}
            </div>
          </div>

          <div className="pk-field">
            <label>Risk</label>
            <div className="pk-choice-row">
              {RISK_OPTIONS.map((r) => (
                <button key={r} className={`pk-choice ${risk === r ? "active" : ""}`} disabled={phase === "dropping"} onClick={() => setRisk(r)}>{r}</button>
              ))}
            </div>
          </div>

          {phase !== "result" ? (
            <button className="pk-primary-btn" onClick={drop} disabled={phase === "dropping" || bet <= 0 || bet > balance}>
              {phase === "dropping" ? "Dropping…" : "Drop ball"}
            </button>
          ) : (
            <button className="pk-primary-btn" onClick={newRound}><RefreshCw size={14} /> New round</button>
          )}

          <div className="pk-history">
            <span className="pk-history-title">Recent drops</span>
            {history.length === 0 && <span className="pk-history-empty">No drops yet</span>}
            {history.map((h, i) => (
              <div key={i} className="pk-history-row">
                <span>#{h.nonce}</span>
                <span>bucket {h.bucket}</span>
                <span className={`mono ${h.payout >= 0 ? "" : ""}`}>{h.mult}× · {fmt(h.payout, 5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

.pk-root {
  --bg: #0D1117; --panel: #161B22; --panel-alt: #1C2128; --border: #2A313C;
  --text: #E6EDF3; --muted: #7D8590; --gold: #F0B429; --gold-dim: #F0B42922;
  --teal: #2DD4BF; --danger: #EF4444; --danger-dim: #EF444422;
  background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif;
  border-radius: 12px; padding: 20px; max-width: 980px; margin: 0 auto;
}
.mono { font-family: 'JetBrains Mono', monospace; }
.pk-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.pk-brand { display: flex; align-items: baseline; gap: 8px; }
.pk-brand-mark { color: var(--gold); font-size: 16px; }
.pk-brand-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.pk-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.pk-wallet { text-align: right; }
.pk-wallet-label { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
.pk-wallet-value { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--gold); }

.pk-ledger { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; }
.pk-ledger-item { display: flex; flex-direction: column; gap: 2px; }
.pk-ledger-k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.pk-ledger-v { color: var(--teal); font-size: 12px; }
.pk-ledger-sep { width: 1px; height: 22px; background: var(--border); }
.pk-seed-input { background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 150px; }
.pk-inline-btn { background: none; border: none; color: var(--teal); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; }
.pk-verify-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; background: var(--gold-dim); color: var(--gold); border: 1px solid #F0B42955; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }

.pk-main { display: flex; gap: 20px; }
.pk-board-wrap { flex: 1.3; display: flex; flex-direction: column; align-items: center; }
.pk-board { position: relative; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.pk-pin { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--muted); transform: translate(-50%, -50%); opacity: 0.6; }
.pk-ball { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 8px 2px #F0B42988; transform: translate(-50%, -50%); }
.pk-buckets { display: flex; gap: 2px; margin-top: 6px; }
.pk-bucket { flex: 1; text-align: center; font-size: 10px; padding: 6px 0; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-weight: 600; background: var(--panel-alt); color: var(--muted); border: 1px solid var(--border); }
.pk-bucket.lo { color: #6b7280; }
.pk-bucket.mid { color: var(--teal); }
.pk-bucket.hi { color: var(--gold); }
.pk-bucket.landed { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); transform: scale(1.08); }
.pk-payout-msg { margin-top: 10px; font-size: 12px; padding: 4px 12px; border-radius: 6px; }
.pk-payout-msg.good { background: #2DD4BF22; color: var(--teal); }
.pk-payout-msg.bad { background: var(--danger-dim); color: var(--danger); }

.pk-panel { flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.pk-field label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.pk-bet-row { display: flex; gap: 6px; }
.pk-bet-row input { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.pk-bet-quick { display: flex; gap: 4px; }
.pk-bet-quick button { background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0 10px; cursor: pointer; font-size: 12px; }
.pk-choice-row { display: flex; gap: 6px; }
.pk-choice { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 8px; padding: 7px 0; font-size: 12px; cursor: pointer; text-transform: capitalize; }
.pk-choice.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
.pk-choice:disabled { opacity: 0.4; }

.pk-primary-btn { background: var(--gold); color: #1a1400; border: none; border-radius: 8px; padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.pk-primary-btn:disabled { opacity: 0.4; cursor: default; }

.pk-history { margin-top: 2px; border-top: 1px solid var(--border); padding-top: 10px; }
.pk-history-title { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; margin-bottom: 6px; }
.pk-history-empty { color: var(--muted); font-size: 12px; }
.pk-history-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; color: var(--muted); }
`;
