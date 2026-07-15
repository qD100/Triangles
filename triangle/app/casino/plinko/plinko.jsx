"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ShieldCheck, Check, Copy } from "lucide-react";

/* ---------------------------------------------------------------
   Same provably-fair engine as Mines/Roulette:
   commit(server seed hash) -> HMAC(serverSeed, clientSeed:nonce) -> path bits -> reveal & verify
   Each bit of the HMAC output decides one row: 0 = left, 1 = right.
   Final bucket index = number of "right" steps (standard Galton-board mapping),
   which reproduces the binomial distribution the multiplier table is built on.
   One server seed is committed per round; every ball in that round derives
   its own path from the same seed via a distinct nonce (nonce, nonce+1, ...),
   so a multi-ball round stays fully verifiable after the seed is revealed.
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
const BALL_COUNT_OPTIONS = [1, 5, 10, 25, 50, 100];
const CASH_UP_AMOUNTS = [10, 100, 1000, 10000];
const nowClock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const DEFAULT_BOARD_W = 820;
const DEFAULT_BOARD_H = 480;
const STEP_MS = 190;
const DROP_STAGGER_MS = 90; // launch gap between balls in the same round

export default function Plinko() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(0.001);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState("medium");
  const [ballCount, setBallCount] = useState(10);
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);

  const [phase, setPhase] = useState("idle"); // idle | dropping | result
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [verified, setVerified] = useState(null);
  const [copied, setCopied] = useState(false);

  const [balls, setBalls] = useState([]); // [{id, x, y, visible}]
  const [bucketCounts, setBucketCounts] = useState([]);
  const [lastRoundProfit, setLastRoundProfit] = useState(null);
  const [history, setHistory] = useState([]); // per-round: {id, ballCount, profit}

  // Session-wide (cumulative) stats, shown in the bottom bar.
  const [totalBallsDropped, setTotalBallsDropped] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [highestMultiplier, setHighestMultiplier] = useState(0);

  const busy = useRef(false);
  const timers = useRef([]);
  const roundIdRef = useRef(1);

  const table = TABLES[rows][risk];

  // The board fills whatever space its wrapper gives it (flex layout, full
  // viewport) rather than a fixed pixel size — measured via ResizeObserver
  // so pin/ball geometry stays correct at any screen size.
  const boardWrapRef = useRef(null);
  const [boardSize, setBoardSize] = useState({ width: DEFAULT_BOARD_W, height: DEFAULT_BOARD_H });

  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setBoardSize({ width: Math.round(width), height: Math.round(height) });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const slot = boardSize.width / (rows + 2);

  const posForStep = useCallback((r, rightsSoFar) => {
    const x = boardSize.width / 2 + (2 * rightsSoFar - r) * (slot / 2);
    const y = 8 + (r / (rows + 1)) * (boardSize.height - 36);
    return { x, y };
  }, [rows, slot, boardSize]);

  const clearTimers = () => { timers.current.forEach((t) => (t.cancel ? t.cancel() : clearTimeout(t))); timers.current = []; };

  // Easing: y uses ease-in (accelerating, like gravity), x uses ease-out-back
  // (slight overshoot then settle, like a real bounce off a peg).
  const easeInQuad = (t) => t * t;
  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  const dropBalls = useCallback(async () => {
    const totalBet = +(bet * ballCount).toFixed(8);
    if (busy.current || bet <= 0 || totalBet > balance) return;
    busy.current = true;
    clearTimers();
    setPhase("dropping");
    setVerified(null);
    setLastRoundProfit(null);
    setBucketCounts(new Array(table.length).fill(0));

    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    setServerSeed(seed);
    setServerSeedHash(hash);
    setBalance((b) => +(b - totalBet).toFixed(8));

    const startNonce = nonce;

    // Precompute every ball's full path + timing up front (deterministic,
    // derived from the committed seed) so the animation loop below only
    // has to interpolate, not branch on async state.
    const ballDefs = await Promise.all(
      Array.from({ length: ballCount }, async (_, i) => {
        const rollHash = await hmacSha256Hex(seed, `${clientSeed}:${startNonce + i}`);
        const p = derivePath(rollHash, rows);

        const waypoints = [{ x: boardSize.width / 2, y: 8 }];
        let rightsSoFar = 0;
        for (let r = 1; r <= rows; r++) {
          rightsSoFar += p.bits[r - 1];
          waypoints.push(posForStep(r, rightsSoFar));
        }
        const durations = Array.from({ length: rows }, (_, r2) => Math.max(95, STEP_MS * Math.pow(0.93, r2)));
        const cumStart = [0];
        durations.forEach((d) => cumStart.push(cumStart[cumStart.length - 1] + d));

        return {
          id: i,
          bucket: p.bucket,
          waypoints,
          durations,
          cumStart,
          totalDuration: cumStart[cumStart.length - 1],
          startDelay: i * DROP_STAGGER_MS,
          landed: false,
        };
      })
    );

    setNonce((n) => n + ballCount);
    setBalls(ballDefs.map((b) => ({ id: b.id, x: b.waypoints[0].x, y: b.waypoints[0].y, visible: false })));

    const roundStart = performance.now();
    let profitAccum = 0;
    let rafId;

    const frame = (now) => {
      const elapsed = now - roundStart;
      let allDone = true;
      const bucketDelta = new Array(table.length).fill(0);
      let frameBalanceDelta = 0;
      let frameMaxMult = 0;

      const nextPositions = ballDefs.map((b) => {
        if (b.landed) {
          const last = b.waypoints[b.waypoints.length - 1];
          return { id: b.id, x: last.x, y: last.y, visible: true };
        }

        const localElapsed = elapsed - b.startDelay;
        if (localElapsed < 0) {
          allDone = false;
          return { id: b.id, x: b.waypoints[0].x, y: b.waypoints[0].y, visible: false };
        }

        if (localElapsed >= b.totalDuration) {
          b.landed = true;
          const mult = table[b.bucket];
          const payout = +(bet * mult).toFixed(8);
          profitAccum += payout;
          frameBalanceDelta += payout;
          bucketDelta[b.bucket] += 1;
          frameMaxMult = Math.max(frameMaxMult, mult);
          const last = b.waypoints[b.waypoints.length - 1];
          return { id: b.id, x: last.x, y: last.y, visible: true };
        }

        allDone = false;
        let seg = 0;
        while (seg < b.durations.length - 1 && localElapsed >= b.cumStart[seg + 1]) seg++;
        const segT = Math.min(1, (localElapsed - b.cumStart[seg]) / b.durations[seg]);
        const from = b.waypoints[seg], to = b.waypoints[seg + 1];
        const x = lerp(from.x, to.x, easeOutBack(segT));
        const y = lerp(from.y, to.y, easeInQuad(segT));
        const wobble = Math.sin((elapsed + b.id * 37) / 45) * 1.4 * (1 - segT);
        return { id: b.id, x: x + wobble, y, visible: true };
      });

      setBalls(nextPositions);
      if (frameBalanceDelta > 0) setBalance((bal) => +(bal + frameBalanceDelta).toFixed(8));
      if (bucketDelta.some((n) => n > 0)) {
        setBucketCounts((counts) => counts.map((c, i) => c + bucketDelta[i]));
      }
      if (frameMaxMult > 0) setHighestMultiplier((h) => Math.max(h, frameMaxMult));

      if (!allDone) {
        rafId = requestAnimationFrame(frame);
      } else {
        const netProfit = +(profitAccum - totalBet).toFixed(8);
        setHistory((h) => [{ id: roundIdRef.current++, bet: totalBet, ballCount, profit: netProfit, time: nowClock() }, ...h].slice(0, 30));
        setTotalBallsDropped((t) => t + ballCount);
        setTotalProfit((t) => +(t + netProfit).toFixed(8));
        setLastRoundProfit(netProfit);
        setPhase("result");
        busy.current = false;
      }
    };

    rafId = requestAnimationFrame(frame);
    timers.current.push({ cancel: () => cancelAnimationFrame(rafId) });
  }, [bet, balance, ballCount, clientSeed, nonce, rows, table, posForStep, boardSize]);

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

  const cashUp = (amount) => setBalance((b) => +(b + amount).toFixed(8));

  const roundOver = phase === "result";
  const controlsDisabled = phase === "dropping";
  const totalBet = +(bet * ballCount).toFixed(8);
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
          {!controlsDisabled ? (
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
        <div className="pk-history-panel">
          <span className="pk-history-panel-title">Bet Log</span>
          <div className="pk-history-header">
            <span>#</span><span>Bet</span><span>Win / Loss</span><span>Time</span>
          </div>
          <div className="pk-history-body">
            {history.length === 0 && <div className="pk-history-empty">No bets yet</div>}
            {history.map((h) => (
              <div key={h.id} className="pk-history-row">
                <span>#{h.id}</span>
                <span className="mono">{fmt(h.bet, 4)}</span>
                <span className={`mono ${h.profit >= 0 ? "good" : "bad"}`}>{h.profit >= 0 ? "+" : ""}{fmt(h.profit, 4)}</span>
                <span className="mono pk-history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pk-board-wrap">
          <div className="pk-board-measure" ref={boardWrapRef}>
            <div className="pk-board" style={{ width: boardSize.width, height: boardSize.height }}>
              {pinRows.map((r) => {
                const count = r + 2;
                const y = 8 + (r / (rows + 1)) * (boardSize.height - 36);
                return Array.from({ length: count }, (_, i) => {
                  const spacing = boardSize.width / (count + 1);
                  const x = spacing * (i + 1);
                  return <span key={`${r}-${i}`} className="pk-pin" style={{ left: x, top: y }} />;
                });
              })}
              {balls.map((b) => (
                <div key={b.id} className="pk-ball" style={{ left: b.x, top: b.y, opacity: b.visible ? 1 : 0 }} />
              ))}
            </div>
          </div>

          <div className="pk-buckets" style={{ width: boardSize.width }}>
            {table.map((m, i) => (
              <div key={i} className={`pk-bucket ${m >= 5 ? "hi" : m >= 1 ? "mid" : "lo"} ${bucketCounts[i] ? "landed" : ""}`}>
                {m}×
              </div>
            ))}
          </div>

          {bucketCounts.length > 0 && (
            <div className="pk-bucket-counts" style={{ width: boardSize.width }}>
              {bucketCounts.map((c, i) => (
                <div key={i} className="pk-bucket-count mono">{c}</div>
              ))}
            </div>
          )}

          {roundOver && lastRoundProfit !== null && (
            <div className={`pk-payout-msg ${lastRoundProfit >= 0 ? "good" : "bad"}`}>
              {ballCount} ball{ballCount > 1 ? "s" : ""} dropped — {lastRoundProfit >= 0 ? "+" : ""}{fmt(lastRoundProfit)} this round
            </div>
          )}
        </div>

        <div className="pk-panel">
          <div className="pk-field">
            <label>Bet amount</label>
            <div className="pk-bet-row">
              <input
                type="number" min="0.0001" step="0.0001" value={bet}
                disabled={controlsDisabled}
                onChange={(e) => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mono"
              />
              <div className="pk-bet-quick">
                <button disabled={controlsDisabled} onClick={() => setBet((b) => +(b / 2).toFixed(8))}>½</button>
                <button disabled={controlsDisabled} onClick={() => setBet((b) => +(b * 2).toFixed(8))}>2×</button>
              </div>
            </div>
          </div>

          <div className="pk-field">
            <label>Number of balls</label>
            <div className="pk-choice-grid">
              {BALL_COUNT_OPTIONS.map((n) => (
                <button key={n} className={`pk-choice ${ballCount === n ? "active" : ""}`} disabled={controlsDisabled} onClick={() => setBallCount(n)}>{n}</button>
              ))}
            </div>
          </div>

          <div className="pk-field">
            <label>Rows</label>
            <div className="pk-choice-row">
              {ROW_OPTIONS.map((r) => (
                <button key={r} className={`pk-choice ${rows === r ? "active" : ""}`} disabled={controlsDisabled} onClick={() => setRows(r)}>{r}</button>
              ))}
            </div>
          </div>

          <div className="pk-field">
            <label>Risk</label>
            <div className="pk-choice-row">
              {RISK_OPTIONS.map((r) => (
                <button key={r} className={`pk-choice ${risk === r ? "active" : ""}`} disabled={controlsDisabled} onClick={() => setRisk(r)}>{r}</button>
              ))}
            </div>
          </div>

          <button className="pk-primary-btn" onClick={dropBalls} disabled={controlsDisabled || bet <= 0 || totalBet > balance}>
            {controlsDisabled ? "Dropping…" : `Drop ${ballCount} Ball${ballCount > 1 ? "s" : ""}`}
          </button>

          <div className="pk-field">
            <label>Cash up</label>
            <div className="pk-choice-grid">
              {CASH_UP_AMOUNTS.map((amt) => (
                <button key={amt} className="pk-cashup-btn mono" onClick={() => cashUp(amt)}>+{amt}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pk-stats-bar">
        <div className="pk-stat-box">
          <span className="pk-stat-box-k">Balls dropped</span>
          <span className="pk-stat-box-v mono">{totalBallsDropped}</span>
        </div>
        <div className="pk-stat-box">
          <span className="pk-stat-box-k">Total profit / loss</span>
          <span className={`pk-stat-box-v mono ${totalProfit >= 0 ? "good" : "bad"}`}>{totalProfit >= 0 ? "+" : ""}{fmt(totalProfit, 2)} sBTC</span>
        </div>
        <div className="pk-stat-box">
          <span className="pk-stat-box-k">Highest multiplier</span>
          <span className="pk-stat-box-v mono gold">{fmt(highestMultiplier, 2)}×</span>
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
  width: 100vw; height: 100vh; box-sizing: border-box;
  padding: 20px; display: flex; flex-direction: column;
  overflow-x: hidden; overflow-y: auto;
}
.mono { font-family: 'JetBrains Mono', monospace; }
.good { color: var(--teal) !important; }
.bad { color: var(--danger) !important; }

.pk-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.pk-brand { display: flex; align-items: baseline; gap: 8px; }
.pk-brand-mark { color: var(--gold); font-size: 16px; }
.pk-brand-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.pk-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.pk-wallet { text-align: right; }
.pk-wallet-label { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
.pk-wallet-value { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--gold); }

.pk-ledger { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; flex-shrink: 0; }
.pk-ledger-item { display: flex; flex-direction: column; gap: 2px; }
.pk-ledger-k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.pk-ledger-v { color: var(--teal); font-size: 12px; }
.pk-ledger-sep { width: 1px; height: 22px; background: var(--border); }
.pk-seed-input { background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 150px; }
.pk-inline-btn { background: none; border: none; color: var(--teal); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; }
.pk-verify-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; background: var(--gold-dim); color: var(--gold); border: 1px solid #F0B42955; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }

.pk-main { display: flex; gap: 20px; flex: 1 1 auto; min-height: 0; }

.pk-history-panel { flex: 0 0 260px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.pk-history-panel-title { color: var(--text); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; flex-shrink: 0; }
.pk-history-header { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 4px; flex-shrink: 0; }
.pk-history-body { overflow-y: auto; min-height: 0; }
.pk-history-empty { color: var(--muted); font-size: 12px; padding: 8px 0; }
.pk-history-row { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 11px; padding: 5px 0; color: var(--text); border-bottom: 1px solid #ffffff08; }
.pk-history-time { color: var(--muted); font-size: 10px; }

.pk-board-wrap { flex: 1.3; display: flex; flex-direction: column; align-items: center; min-height: 0; min-width: 0; }
.pk-board-measure { width: 100%; flex: 1 1 auto; min-height: 0; max-width: 1100px; max-height: 100%; position: relative; }
.pk-board { position: relative; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.pk-pin { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--muted); transform: translate(-50%, -50%); opacity: 0.6; }
.pk-ball { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 8px 2px #F0B42988; transform: translate(-50%, -50%); }
.pk-buckets { display: flex; gap: 2px; margin-top: 6px; max-width: 1100px; flex-shrink: 0; }
.pk-bucket { flex: 1; text-align: center; font-size: 10px; padding: 6px 0; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-weight: 600; background: var(--panel-alt); color: var(--muted); border: 1px solid var(--border); }
.pk-bucket.lo { color: #6b7280; }
.pk-bucket.mid { color: var(--teal); }
.pk-bucket.hi { color: var(--gold); }
.pk-bucket.landed { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.pk-bucket-counts { display: flex; gap: 2px; margin-top: 3px; max-width: 1100px; flex-shrink: 0; }
.pk-bucket-count { flex: 1; text-align: center; font-size: 10px; color: var(--muted); }
.pk-payout-msg { margin-top: 10px; font-size: 12px; padding: 4px 12px; border-radius: 6px; flex-shrink: 0; }
.pk-payout-msg.good { background: #2DD4BF22; }
.pk-payout-msg.bad { background: var(--danger-dim); }

.pk-panel { flex: 1; max-width: 300px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; min-height: 0; }
.pk-field label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.pk-bet-row { display: flex; gap: 6px; }
.pk-bet-row input { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.pk-bet-quick { display: flex; gap: 4px; }
.pk-bet-quick button { background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0 10px; cursor: pointer; font-size: 12px; }
.pk-choice-row { display: flex; gap: 6px; }
.pk-choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pk-choice { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 8px; padding: 7px 0; font-size: 12px; cursor: pointer; text-transform: capitalize; }
.pk-choice.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
.pk-choice:disabled { opacity: 0.4; }

.pk-primary-btn { background: var(--gold); color: #1a1400; border: none; border-radius: 8px; padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.pk-primary-btn:disabled { opacity: 0.4; cursor: default; }

.pk-cashup-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--teal); border-radius: 8px; padding: 8px 0; font-size: 12px; cursor: pointer; font-weight: 600; }
.pk-cashup-btn:hover { border-color: var(--teal); background: #2DD4BF14; }

.pk-stats-bar { display: flex; gap: 12px; margin-top: 14px; flex-shrink: 0; }
.pk-stat-box { flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; }
.pk-stat-box-k { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.pk-stat-box-v { font-size: 16px; font-weight: 600; color: var(--text); }
.pk-stat-box-v.gold { color: var(--gold); }

@media (max-width: 860px) {
  .pk-main { flex-direction: column; }
  .pk-panel { max-width: 100%; }
  .pk-history-panel { flex: 0 0 auto; max-height: 220px; order: 3; }
  .pk-stats-bar { flex-direction: column; }
}
`;
