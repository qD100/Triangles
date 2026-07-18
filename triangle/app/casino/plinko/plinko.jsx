"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Matter from "matter-js";
import { ShieldCheck, Check, Copy, Volume2, VolumeX } from "lucide-react";
import * as physics from "./plinkoPhysics";

/* ---------------------------------------------------------------
   Same provably-fair engine as Mines/Roulette:
   commit(server seed hash) -> HMAC(serverSeed, clientSeed:nonce) -> path bits -> reveal & verify
   Each bit of the HMAC output decides one row: 0 = left, 1 = right.
   Final bucket index = number of "right" steps (standard Galton-board mapping),
   which reproduces the binomial distribution the multiplier table is built on.
   One server seed is committed per round; every ball in that round derives
   its own path from the same seed via a distinct nonce (nonce, nonce+1, ...),
   so a multi-ball round stays fully verifiable after the seed is revealed.

   The board below now runs *real* physics (gravity/restitution/friction via
   matter-js, see ./plinkoPhysics.js) for how a ball falls and bounces —
   but the bucket it ends up in is still decided by derivePath() below,
   before the ball ever starts moving. Physics only controls how the fall
   looks; it can never change who wins. See plinkoPhysics.js's header
   comment for the full guided-physics/safety-net design, and
   verify_plinko_fairness.js (run during development) for a 5,400-round
   headless proof that the two never disagree.
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
const DROP_STAGGER_MS = 90; // launch gap between balls in the same round
const PEG_TICK_BALL_THRESHOLD = 15; // above this many balls, per-peg-hit ticks would wall-of-noise

/* ================= SOUND (synthesized, no audio files) =================
   Short procedural tones via Web Audio oscillators + gain envelopes —
   avoids sourcing/licensing external audio assets entirely. Lazily
   created/resumed on first user gesture (the Drop button) to respect
   browser autoplay policy. Every call is wrapped so a synthesis failure
   can never interrupt gameplay. */
let audioCtx = null;
function getAudioContext() {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone({ freq, duration, type = "sine", volume = 0.12, freqEnd = null }) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // synthesis must never break the drop flow
  }
}

const sound = {
  drop: () => playTone({ freq: 320, freqEnd: 160, duration: 0.15, type: "sine", volume: 0.07 }),
  pegHit: () => playTone({ freq: 750 + Math.random() * 500, duration: 0.035, type: "square", volume: 0.04 }),
  land: (multiplier) =>
    playTone({
      freq: 380 + Math.min(multiplier, 60) * 14,
      freqEnd: 700 + Math.min(multiplier, 60) * 20,
      duration: 0.16,
      type: "triangle",
      volume: 0.1,
    }),
};

export default function Plinko() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(0.001);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState("medium");
  const [ballCount, setBallCount] = useState(10);
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);
  const [muted, setMuted] = useState(false);

  const [phase, setPhase] = useState("idle"); // idle | dropping | result
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [verified, setVerified] = useState(null);
  const [copied, setCopied] = useState(false);

  const [bucketCounts, setBucketCounts] = useState([]);
  const [lastRoundProfit, setLastRoundProfit] = useState(null);
  const [history, setHistory] = useState([]); // per-round: {id, ballCount, profit}

  // Session-wide (cumulative) stats, shown in the bottom bar.
  const [totalBallsDropped, setTotalBallsDropped] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [highestMultiplier, setHighestMultiplier] = useState(0);

  const busy = useRef(false);
  const roundIdRef = useRef(1);
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const table = TABLES[rows][risk];

  // The board fills whatever space its wrapper gives it (flex layout, full
  // viewport) rather than a fixed pixel size — measured via ResizeObserver
  // so pin/ball geometry stays correct at any screen size. A round in
  // progress locks its own snapshot (roundStateRef.boardWidth/Height) so a
  // mid-round resize can't reposition physics bodies out from under a
  // ball in flight; the next round picks up whatever size is current.
  const boardWrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [boardSize, setBoardSize] = useState({ width: DEFAULT_BOARD_W, height: DEFAULT_BOARD_H });
  const boardSizeRef = useRef(boardSize);
  useEffect(() => { boardSizeRef.current = boardSize; }, [boardSize]);

  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

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

  // Current round's physics world + ball bookkeeping. Null while idle.
  // A plain mutable ref (not React state) since it's mutated every animation
  // frame — driving it through setState would mean 100 re-renders/second.
  const roundStateRef = useRef(null);

  const applyBallSettlement = useCallback((def) => {
    const mult = table[def.bucket];
    const payout = +(def.bet * mult).toFixed(8);

    setBalance((b) => +(b + payout).toFixed(8));
    setBucketCounts((counts) => {
      const next = [...counts];
      next[def.bucket] = (next[def.bucket] ?? 0) + 1;
      return next;
    });
    setHighestMultiplier((h) => Math.max(h, mult));
    if (!mutedRef.current) sound.land(mult);

    return payout;
  }, [table]);

  const finalizeRound = useCallback((roundState) => {
    const netProfit = +(roundState.profitAccum - roundState.totalBet).toFixed(8);
    setHistory((h) => [
      { id: roundIdRef.current++, bet: roundState.totalBet, ballCount: roundState.totalBalls, profit: netProfit, time: nowClock() },
      ...h,
    ].slice(0, 30));
    setTotalBallsDropped((t) => t + roundState.totalBalls);
    setTotalProfit((t) => +(t + netProfit).toFixed(8));
    setLastRoundProfit(netProfit);
    setPhase("result");
    busy.current = false;
  }, []);

  // Single persistent render/physics loop for the component's lifetime —
  // reads live values via refs (boardSizeRef/rowsRef/roundStateRef) rather
  // than restarting on every state change, since restarting would tear
  // down an in-flight round's animation.
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();

    const loop = (now) => {
      const deltaMs = Math.min(now - lastTime, 100); // clamp a tab-throttle spike
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const roundState = roundStateRef.current;
        const size = roundState
          ? { width: roundState.boardWidth, height: roundState.boardHeight }
          : boardSizeRef.current;
        const rows = roundState ? roundState.rows : rowsRef.current;

        let ballsToDraw = [];

        if (roundState) {
          roundState.elapsedMs += deltaMs;

          const stillPending = [];
          for (const def of roundState.pending) {
            if (roundState.elapsedMs >= def.spawnDelayMs) {
              const body = physics.spawnBall(Matter, roundState.world, {
                id: def.id, bits: def.bits, bucket: def.bucket, boardWidth: size.width, rows,
              });
              roundState.active.push({ body, def, spawnedAtMs: roundState.elapsedMs, settledHandled: false });
            } else {
              stillPending.push(def);
            }
          }
          roundState.pending = stillPending;

          const beforeNudges = roundState.active.map((e) => e.body.plugin.lastNudgedRow);
          roundState.step(deltaMs);

          if (ballCountForSound(roundState.totalBalls) && !mutedRef.current) {
            roundState.active.forEach((e, i) => {
              if (e.body.plugin.lastNudgedRow > beforeNudges[i]) sound.pegHit();
            });
          }

          for (const entry of roundState.active) {
            if (entry.settledHandled) continue;
            const elapsedSinceSpawn = roundState.elapsedMs - entry.spawnedAtMs;
            const justSettled = physics.checkSettle(Matter, entry.body, {
              rows, boardHeight: size.height, elapsedMs: elapsedSinceSpawn,
            });
            if (justSettled) {
              entry.settledHandled = true;
              const payout = applyBallSettlement(entry.def);
              roundState.profitAccum += payout;
            }
          }

          ballsToDraw = roundState.active.map((e) => ({
            x: e.body.position.x, y: e.body.position.y, settled: e.body.plugin.settled,
          }));

          if (
            roundState.pending.length === 0 &&
            roundState.active.length === roundState.totalBalls &&
            roundState.active.every((e) => e.settledHandled)
          ) {
            finalizeRound(roundState);
            roundStateRef.current = null;
          }
        }

        drawBoard(ctx, {
          boardWidth: size.width,
          boardHeight: size.height,
          pegs: physics.buildPegLayout(rows, size.width, size.height),
          balls: ballsToDraw,
        });
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [applyBallSettlement, finalizeRound]);

  // Canvas backing-store resolution follows the wrapper size (and device
  // pixel ratio) so it isn't blurry on high-DPI screens; drawBoard() always
  // draws in CSS-pixel coordinates via the transform set here.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(boardSize.width * dpr);
    canvas.height = Math.round(boardSize.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [boardSize]);

  const dropBalls = useCallback(async () => {
    const totalBet = +(bet * ballCount).toFixed(8);
    if (busy.current || bet <= 0 || totalBet > balance) return;
    busy.current = true;
    setPhase("dropping");
    setVerified(null);
    setLastRoundProfit(null);
    setBucketCounts(new Array(table.length).fill(0));
    if (!mutedRef.current) sound.drop();

    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    setServerSeed(seed);
    setServerSeedHash(hash);
    setBalance((b) => +(b - totalBet).toFixed(8));

    const startNonce = nonce;
    const lockedSize = boardSizeRef.current;

    const ballDefs = await Promise.all(
      Array.from({ length: ballCount }, async (_, i) => {
        const rollHash = await hmacSha256Hex(seed, `${clientSeed}:${startNonce + i}`);
        const p = derivePath(rollHash, rows);
        return { id: i, bits: p.bits, bucket: p.bucket, bet, spawnDelayMs: i * DROP_STAGGER_MS };
      })
    );

    setNonce((n) => n + ballCount);

    const { engine } = physics.createWorld(Matter, {
      rows, boardWidth: lockedSize.width, boardHeight: lockedSize.height,
    });

    roundStateRef.current = {
      world: engine.world,
      step: physics.createStepper(Matter, engine),
      elapsedMs: 0,
      pending: ballDefs,
      active: [],
      totalBalls: ballCount,
      totalBet,
      profitAccum: 0,
      rows,
      boardWidth: lockedSize.width,
      boardHeight: lockedSize.height,
    };
  }, [bet, balance, ballCount, clientSeed, nonce, rows, table]);

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

  return (
    <div className="pk-root">
      <style>{CSS}</style>

      <div className="pk-topbar">
        <div className="pk-brand">
          <span className="pk-brand-mark">☣</span>
          <span className="pk-brand-name">MORG CITY</span>
          <span className="pk-brand-tag">plinko · provably fair</span>
        </div>
        <div className="pk-topbar-right">
          <button
            type="button"
            className="pk-mute-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="pk-wallet">
            <span className="pk-wallet-label">Essence</span>
            <span className="pk-wallet-value">{fmt(balance)}</span>
          </div>
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
              <canvas ref={canvasRef} className="pk-board-canvas" />
            </div>
          </div>

          <div className="pk-buckets" style={{ width: boardSize.width }}>
            {table.map((m, i) => (
              <div key={i} className={`pk-bucket ${m >= 5 ? "hi" : m >= 1 ? "mid" : "lo"} ${bucketCounts[i] ? "landed" : ""}`}>
                {m}×
              </div>
            ))}
          </div>

          <div className="pk-bucket-counts" style={{ width: boardSize.width }}>
            {table.map((_, i) => (
              <div key={i} className="pk-bucket-count mono">{bucketCounts[i] ?? 0}</div>
            ))}
          </div>

          <div className={`pk-payout-msg ${roundOver && lastRoundProfit !== null ? (lastRoundProfit >= 0 ? "good" : "bad") : ""}`}>
            {roundOver && lastRoundProfit !== null
              ? `${ballCount} ball${ballCount > 1 ? "s" : ""} dropped — ${lastRoundProfit >= 0 ? "+" : ""}${fmt(lastRoundProfit)} this round`
              : " "}
          </div>
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
          <span className={`pk-stat-box-v mono ${totalProfit >= 0 ? "good" : "bad"}`}>{totalProfit >= 0 ? "+" : ""}{fmt(totalProfit, 2)} Essence</span>
        </div>
        <div className="pk-stat-box">
          <span className="pk-stat-box-k">Highest multiplier</span>
          <span className="pk-stat-box-v mono gold">{fmt(highestMultiplier, 2)}×</span>
        </div>
      </div>
    </div>
  );
}

function ballCountForSound(totalBalls) {
  return totalBalls <= PEG_TICK_BALL_THRESHOLD;
}

/* ================= CANVAS RENDERING ================= */
function drawBoard(ctx, { boardWidth, boardHeight, pegs, balls }) {
  ctx.clearRect(0, 0, boardWidth, boardHeight);

  const bg = ctx.createRadialGradient(
    boardWidth / 2, boardHeight * 0.25, 10,
    boardWidth / 2, boardHeight * 0.25, Math.max(boardWidth, boardHeight) * 0.85
  );
  bg.addColorStop(0, "#1E1430");
  bg.addColorStop(1, "#0A0612");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  for (const peg of pegs) {
    const grad = ctx.createRadialGradient(peg.x - 1.2, peg.y - 1.2, 0.3, peg.x, peg.y, physics.PEG_RADIUS);
    grad.addColorStop(0, "#E4DBF2");
    grad.addColorStop(0.55, "#9C8FB8");
    grad.addColorStop(1, "#4A3866");
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, physics.PEG_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  for (const ball of balls) {
    ctx.save();
    ctx.shadowColor = "rgba(229,185,78,0.8)";
    ctx.shadowBlur = ball.settled ? 16 : 9;
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2.2, 0.5, ball.x, ball.y, physics.BALL_RADIUS);
    grad.addColorStop(0, "#fff8e1");
    grad.addColorStop(0.45, "#f7cb5e");
    grad.addColorStop(1, "#b9790f");
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, physics.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Oswald:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

.pk-root {
  --bg: #0A0612; --panel: #171025; --panel-alt: #1A1128; --border: #3D2B5C;
  --text: #E8E0F5; --muted: #8B7BA8; --gold: #E5B94E; --gold-dim: #E5B94E22;
  --teal: #3DDBD9; --danger: #E5484D; --danger-dim: #E5484D22;
  --purple: #9333EA; --purple-dim: #9333EA22;
  background: var(--bg); color: var(--text); font-family: 'Oswald', sans-serif;
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
.pk-brand-name { font-family: 'Cinzel', serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.pk-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.pk-topbar-right { display: flex; align-items: center; gap: 10px; }
.pk-mute-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); cursor: pointer; }
.pk-mute-btn:hover { color: var(--text); border-color: #5C4A80; }
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
.pk-verify-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; background: var(--gold-dim); color: var(--gold); border: 1px solid #E5B94E55; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }

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
.pk-board { position: relative; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; contain: layout paint; }
.pk-board-canvas { display: block; width: 100%; height: 100%; }
.pk-buckets { display: flex; gap: 2px; margin-top: 6px; max-width: 1100px; flex-shrink: 0; }
.pk-bucket { flex: 1; text-align: center; font-size: 10px; padding: 6px 0; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-weight: 600; background: var(--panel-alt); color: var(--muted); border: 1px solid var(--border); }
.pk-bucket.lo { color: #6E5C94; }
.pk-bucket.mid { color: var(--teal); }
.pk-bucket.hi { color: var(--gold); }
.pk-bucket.landed { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.pk-bucket-counts { display: flex; gap: 2px; margin-top: 3px; max-width: 1100px; flex-shrink: 0; }
.pk-bucket-count { flex: 1; text-align: center; font-size: 10px; color: var(--muted); }
.pk-payout-msg { margin-top: 10px; font-size: 12px; padding: 4px 12px; border-radius: 6px; flex-shrink: 0; box-sizing: border-box; height: 26px; background: transparent; }
.pk-payout-msg.good { background: #3DDBD922; }
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
.pk-cashup-btn:hover { border-color: var(--teal); background: #3DDBD914; }

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
