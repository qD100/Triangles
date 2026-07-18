"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ShieldCheck, Check, Copy, RefreshCw, Volume2, VolumeX } from "lucide-react";

/* ---------------------------------------------------------------
   Same provably-fair engine as Mines/Roulette/Plinko:
   commit(server seed hash) -> HMAC(serverSeed, clientSeed:nonce) -> outcome -> reveal & verify.
   Extends Roulette's `parseInt(hashHex.slice(0,8),16) % 37` pattern to 3
   independent 8-hex-char slices, one per reel.
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
function deriveStops(hashHex, stripLength) {
  return [0, 8, 16].map((off) => parseInt(hashHex.slice(off, off + 8), 16) % stripLength);
}
function reelWindow(strip, stop) {
  const n = strip.length;
  return [strip[stop % n], strip[(stop + 1) % n], strip[(stop + 2) % n]]; // [top, middle, bottom]
}

/* ================= SYMBOLS, REEL STRIP, PAYTABLE =================
   50-slot weighted strip (counts: skull 24, kronorium 12, perk 7, key 4,
   raygun 2, mysterybox 1). Independent 3-reel draws, full-line 3-of-a-kind
   only (no wilds/partials) -> RTP = sum(p_i^3 * mult_i).
   Verified analytically (94.32%) and via a 2M-spin Monte Carlo (94.44%)
   during planning — see scripts/verify-slots-rtp.mjs. */
const SYMBOLS = { skull: "💀", kronorium: "📖", perk: "🧪", key: "🗝", raygun: "🔫", mysterybox: "🎁" };

const REEL_STRIP = [
  "skull", "kronorium", "skull", "perk", "skull", "kronorium", "key", "skull", "skull", "kronorium",
  "perk", "skull", "raygun", "skull", "kronorium", "skull", "skull", "perk", "kronorium", "key",
  "skull", "skull", "kronorium", "skull", "perk", "mysterybox", "skull", "kronorium", "skull", "skull",
  "kronorium", "key", "perk", "skull", "skull", "kronorium", "skull", "raygun", "skull", "perk",
  "kronorium", "skull", "skull", "kronorium", "key", "skull", "perk", "skull", "kronorium", "skull",
];
const REEL_STRIP_X2 = [...REEL_STRIP, ...REEL_STRIP];

const PAYTABLE = { skull: 6, kronorium: 12, perk: 25, key: 60, raygun: 150, mysterybox: 600 };
const SYMBOL_ORDER = ["skull", "kronorium", "perk", "key", "raygun", "mysterybox"];

const PAYLINES = [
  { name: "top", cells: [[0, 0], [1, 0], [2, 0]] },
  { name: "middle", cells: [[0, 1], [1, 1], [2, 1]] },
  { name: "bottom", cells: [[0, 2], [1, 2], [2, 2]] },
  { name: "diag-down", cells: [[0, 0], [1, 1], [2, 2]] },
  { name: "diag-up", cells: [[0, 2], [1, 1], [2, 0]] },
];

function evaluateSpin(grid, betPerLine) {
  let totalPayout = 0;
  const wins = [];
  for (const line of PAYLINES) {
    const [a, b, c] = line.cells.map(([reel, row]) => grid[reel][row]);
    if (a === b && b === c) {
      const payout = +(betPerLine * PAYTABLE[a]).toFixed(8);
      totalPayout += payout;
      wins.push({ line: line.name, symbol: a, mult: PAYTABLE[a], payout });
    }
  }
  return { totalPayout: +totalPayout.toFixed(8), wins };
}

/* ================= REEL SPIN ANIMATION =================
   Manually driven (requestAnimationFrame), not a plain CSS transition —
   a repeating reel needs its scroll position wrapped modulo one strip-loop
   every frame so the track never has to grow past 2 strip-copies (100
   tiles), however long the session runs. Distance traveled is eased with
   easeOutQuint so each reel decelerates into its derived stop; duration is
   staggered per reel for a cascading-stop feel, matching Roulette's
   wheel-spin easing family in spirit. The bucket/outcome itself is already
   fixed by deriveStops() before this ever starts — the animation is purely
   decorative, exactly like Plinko's physics can never change who wins. */
const TILE = 108;
const STRIP_LEN = REEL_STRIP.length;
const LOOP_PX = STRIP_LEN * TILE;
const EXTRA_LOOPS = 4;
const REEL_DURATIONS_MS = [1600, 2000, 2400];

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function animateReels(stops, onFrame, onDone) {
  const distances = stops.map((s) => (EXTRA_LOOPS * STRIP_LEN + s) * TILE);
  const start = performance.now();
  let rafId;

  const tick = (now) => {
    const ys = distances.map((dist, i) => {
      const t = Math.min((now - start) / REEL_DURATIONS_MS[i], 1);
      const traveled = easeOutQuint(t) * dist;
      return -(traveled % LOOP_PX);
    });
    onFrame(ys);

    const allDone = REEL_DURATIONS_MS.every((dur) => now - start >= dur);
    if (allDone) {
      onDone();
    } else {
      rafId = requestAnimationFrame(tick);
    }
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

/* ================= SOUND (synthesized, no audio files) =================
   Same playTone/AudioContext/mute pattern as Plinko — the only sound
   reference in the codebase. */
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
    // synthesis must never break the spin flow
  }
}
const sound = {
  spinStart: () => playTone({ freq: 220, freqEnd: 90, duration: 1.4, type: "sawtooth", volume: 0.04 }),
  reelStop: () => playTone({ freq: 140, duration: 0.09, type: "square", volume: 0.09 }),
  win: (jackpot) => {
    if (!jackpot) {
      playTone({ freq: 520, freqEnd: 880, duration: 0.18, type: "triangle", volume: 0.1 });
      return;
    }
    [660, 880, 1100, 1320].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, duration: 0.22, type: "triangle", volume: 0.12 }), i * 90)
    );
  },
};

const fmt = (n, d = 4) => Number(n).toFixed(d);
const short = (s) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const CASH_UP_AMOUNTS = [10, 100, 1000, 10000];
const nowClock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function SlotMachine() {
  const [balance, setBalance] = useState(1.0);
  const [bet, setBet] = useState(0.001); // stake per line
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);
  const [muted, setMuted] = useState(false);

  const [phase, setPhase] = useState("idle"); // idle | spinning | result
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [reelY, setReelY] = useState([0, 0, 0]);
  const [lastResult, setLastResult] = useState(null); // { wins, totalPayout, wager }
  const [verified, setVerified] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const busy = useRef(false);
  const roundIdRef = useRef(1);
  const mutedRef = useRef(muted);
  const cancelAnimRef = useRef(null);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => () => { if (cancelAnimRef.current) cancelAnimRef.current(); }, []);

  const totalWager = +(bet * PAYLINES.length).toFixed(8);

  const spin = useCallback(async () => {
    if (busy.current || bet <= 0 || totalWager > balance) return;
    busy.current = true;
    setPhase("spinning");
    setVerified(null);
    setLastResult(null);
    if (!mutedRef.current) sound.spinStart();

    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    const rollHash = await hmacSha256Hex(seed, `${clientSeed}:${nonce}`);
    const stops = deriveStops(rollHash, REEL_STRIP.length);
    const nextGrid = stops.map((s) => reelWindow(REEL_STRIP, s));

    setServerSeed(seed);
    setServerSeedHash(hash);
    setBalance((b) => +(b - totalWager).toFixed(8));
    setNonce((n) => n + 1);

    REEL_DURATIONS_MS.forEach((ms) => {
      setTimeout(() => { if (!mutedRef.current) sound.reelStop(); }, ms);
    });

    cancelAnimRef.current = animateReels(
      stops,
      (ys) => setReelY(ys),
      () => {
        const { totalPayout, wins } = evaluateSpin(nextGrid, bet);
        setBalance((b) => +(b + totalPayout).toFixed(8));
        setLastResult({ wins, totalPayout, wager: totalWager });
        setHistory((h) => [
          { id: roundIdRef.current++, bet: totalWager, profit: +(totalPayout - totalWager).toFixed(8), time: nowClock() },
          ...h,
        ].slice(0, 30));
        setPhase("result");
        if (!mutedRef.current && totalPayout > 0) sound.win(wins.some((w) => w.symbol === "mysterybox"));
        busy.current = false;
      }
    );
  }, [bet, balance, clientSeed, nonce, totalWager]);

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

  const spinning = phase === "spinning";
  const roundOver = phase === "result";
  const jackpot = !!lastResult?.wins.some((w) => w.symbol === "mysterybox");

  return (
    <div className="sl-root">
      <style>{CSS}</style>

      <div className="sl-topbar">
        <div className="sl-brand">
          <span className="sl-brand-mark">☣</span>
          <span className="sl-brand-name">MORG CITY</span>
          <span className="sl-brand-tag">slots · provably fair</span>
        </div>
        <div className="sl-topbar-right">
          <button
            type="button"
            className="sl-mute-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="sl-wallet">
            <span className="sl-wallet-label">Essence</span>
            <span className="sl-wallet-value">{fmt(balance)}</span>
          </div>
        </div>
      </div>

      <div className="sl-ledger">
        <div className="sl-ledger-item">
          <span className="sl-ledger-k">server seed (hash)</span>
          <span className="sl-ledger-v mono">{serverSeedHash ? short(serverSeedHash) : "—"}</span>
        </div>
        <div className="sl-ledger-sep" />
        <div className="sl-ledger-item">
          <span className="sl-ledger-k">client seed</span>
          {!spinning ? (
            <input className="sl-seed-input mono" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} spellCheck={false} />
          ) : (
            <span className="sl-ledger-v mono">{clientSeed}</span>
          )}
        </div>
        <div className="sl-ledger-sep" />
        <div className="sl-ledger-item">
          <span className="sl-ledger-k">nonce</span>
          <span className="sl-ledger-v mono">{nonce}</span>
        </div>
        {roundOver && (
          <>
            <div className="sl-ledger-sep" />
            <div className="sl-ledger-item">
              <span className="sl-ledger-k">server seed (revealed)</span>
              <button className="sl-inline-btn mono" onClick={copySeed}>
                {short(serverSeed)} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button className="sl-verify-btn" onClick={verify}>
              <ShieldCheck size={13} />
              {verified === null ? "Verify" : verified ? "Hash matches" : "Mismatch"}
            </button>
          </>
        )}
      </div>

      <div className="sl-main">
        <div className="sl-history-panel">
          <span className="sl-history-panel-title">Bet Log</span>
          <div className="sl-history-header">
            <span>#</span><span>Bet</span><span>Win / Loss</span><span>Time</span>
          </div>
          <div className="sl-history-body">
            {history.length === 0 && <div className="sl-history-empty">No spins yet</div>}
            {history.map((h) => (
              <div key={h.id} className="sl-history-row">
                <span>#{h.id}</span>
                <span className="mono">{fmt(h.bet, 4)}</span>
                <span className={`mono ${h.profit >= 0 ? "good" : "bad"}`}>{h.profit >= 0 ? "+" : ""}{fmt(h.profit, 4)}</span>
                <span className="mono sl-history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sl-reels-wrap">
          <div className={`sl-reel-frame ${spinning ? "spinning" : ""}`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sl-reel-window">
                <div className="sl-reel-track" style={{ transform: `translateY(${reelY[i]}px)` }}>
                  {REEL_STRIP_X2.map((sym, idx) => (
                    <div key={idx} className="sl-reel-tile">{SYMBOLS[sym]}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {roundOver && lastResult && (
            <div className={`sl-result-banner ${lastResult.totalPayout > 0 ? "good" : ""} ${jackpot ? "jackpot" : ""}`}>
              {lastResult.totalPayout > 0
                ? `${jackpot ? "MYSTERY BOX JACKPOT — " : ""}WIN ${fmt(lastResult.totalPayout)} · ${lastResult.wins.length} line${lastResult.wins.length > 1 ? "s" : ""}`
                : "No opportunity. No winning lines."}
            </div>
          )}
        </div>

        <div className="sl-panel">
          <div className="sl-field">
            <label>Bet per line</label>
            <div className="sl-bet-row">
              <input
                type="number" min="0.0001" step="0.0001" value={bet}
                disabled={spinning}
                onChange={(e) => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mono"
              />
              <div className="sl-bet-quick">
                <button disabled={spinning} onClick={() => setBet((b) => +(b / 2).toFixed(8))}>½</button>
                <button disabled={spinning} onClick={() => setBet((b) => +(b * 2).toFixed(8))}>2×</button>
              </div>
            </div>
          </div>

          <div className="sl-note">5 fixed paylines: top, middle, bottom, both diagonals.</div>

          <div className="sl-paytable">
            {SYMBOL_ORDER.map((sym) => (
              <div key={sym} className="sl-paytable-cell">
                <span className="glyph">{SYMBOLS[sym]}</span>
                <span className="mult mono">{PAYTABLE[sym]}×</span>
              </div>
            ))}
          </div>

          <div className="sl-stat-row">
            <div className="sl-stat">
              <span className="sl-stat-k">Total wager</span>
              <span className="sl-stat-v">{fmt(totalWager)}</span>
            </div>
            <div className="sl-stat">
              <span className="sl-stat-k">Last payout</span>
              <span className="sl-stat-v gold">{lastResult ? fmt(lastResult.totalPayout) : "—"}</span>
            </div>
          </div>

          <button className="sl-primary-btn" onClick={spin} disabled={spinning || bet <= 0 || totalWager > balance}>
            {spinning ? "Spinning…" : <><RefreshCw size={14} /> Spin</>}
          </button>

          <div className="sl-field">
            <label>Cash up</label>
            <div className="sl-choice-grid">
              {CASH_UP_AMOUNTS.map((amt) => (
                <button key={amt} className="sl-cashup-btn mono" onClick={() => cashUp(amt)}>+{amt}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Oswald:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

.sl-root {
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

.sl-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.sl-brand { display: flex; align-items: baseline; gap: 8px; }
.sl-brand-mark { color: var(--gold); font-size: 16px; }
.sl-brand-name { font-family: 'Cinzel', serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.sl-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.sl-topbar-right { display: flex; align-items: center; gap: 10px; }
.sl-mute-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); cursor: pointer; }
.sl-mute-btn:hover { color: var(--text); border-color: #5C4A80; }
.sl-wallet { text-align: right; }
.sl-wallet-label { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
.sl-wallet-value { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--gold); }

.sl-ledger { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; flex-shrink: 0; }
.sl-ledger-item { display: flex; flex-direction: column; gap: 2px; }
.sl-ledger-k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.sl-ledger-v { color: var(--teal); font-size: 12px; }
.sl-ledger-sep { width: 1px; height: 22px; background: var(--border); }
.sl-seed-input { background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 150px; }
.sl-inline-btn { background: none; border: none; color: var(--teal); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; }
.sl-verify-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; background: var(--gold-dim); color: var(--gold); border: 1px solid #E5B94E55; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }

.sl-main { display: flex; gap: 20px; flex: 1 1 auto; min-height: 0; justify-content: center; align-items: center; }

.sl-history-panel { flex: 0 0 260px; align-self: stretch; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.sl-history-panel-title { color: var(--text); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; flex-shrink: 0; }
.sl-history-header { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 4px; flex-shrink: 0; }
.sl-history-body { overflow-y: auto; min-height: 0; }
.sl-history-empty { color: var(--muted); font-size: 12px; padding: 8px 0; }
.sl-history-row { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 11px; padding: 5px 0; color: var(--text); border-bottom: 1px solid #ffffff08; }
.sl-history-time { color: var(--muted); font-size: 10px; }

.sl-reels-wrap { flex: 0 0 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.sl-reel-frame { display: flex; gap: 6px; background: var(--panel-alt); border: 2px solid var(--border); border-radius: 14px; padding: 10px; transition: box-shadow 0.3s ease, border-color 0.3s ease; }
.sl-reel-frame.spinning { border-color: var(--purple); box-shadow: 0 0 22px var(--purple-dim), 0 0 6px var(--purple); }
.sl-reel-window { width: 108px; height: 324px; overflow: hidden; border-radius: 8px; background: var(--bg); position: relative; }
.sl-reel-window::before, .sl-reel-window::after { content: ""; position: absolute; left: 0; right: 0; height: 36px; z-index: 2; pointer-events: none; }
.sl-reel-window::before { top: 0; background: linear-gradient(var(--bg), transparent); }
.sl-reel-window::after { bottom: 0; background: linear-gradient(transparent, var(--bg)); }
.sl-reel-track { display: flex; flex-direction: column; will-change: transform; }
.sl-reel-tile { width: 108px; height: 108px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 52px; }
.sl-result-banner { font-family: 'Cinzel', serif; text-align: center; font-size: 14px; letter-spacing: 0.4px; padding: 8px 18px; border-radius: 8px; background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); }
.sl-result-banner.good { color: var(--teal); border-color: #3DDBD955; background: #3DDBD914; }
.sl-result-banner.jackpot { color: var(--gold); border-color: var(--purple); background: var(--purple-dim); box-shadow: 0 0 16px var(--purple-dim); }

.sl-panel { flex: 1; max-width: 320px; align-self: stretch; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; min-height: 0; }
.sl-field label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.sl-bet-row { display: flex; gap: 6px; }
.sl-bet-row input { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.sl-bet-quick { display: flex; gap: 4px; }
.sl-bet-quick button { background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0 10px; cursor: pointer; font-size: 12px; }
.sl-note { color: var(--muted); font-size: 11px; line-height: 1.4; }

.sl-paytable { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.sl-paytable-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--panel-alt); border: 1px solid var(--border); border-radius: 8px; padding: 6px 0; }
.sl-paytable-cell .glyph { font-size: 18px; }
.sl-paytable-cell .mult { font-size: 11px; color: var(--gold); }

.sl-stat-row { display: flex; gap: 10px; }
.sl-stat { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.sl-stat-k { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.sl-stat-v { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; }
.sl-stat-v.gold { color: var(--gold); }

.sl-primary-btn { background: var(--gold); color: #1a1400; border: none; border-radius: 8px; padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.sl-primary-btn:disabled { opacity: 0.4; cursor: default; }

.sl-choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.sl-cashup-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--teal); border-radius: 8px; padding: 8px 0; font-size: 12px; cursor: pointer; font-weight: 600; }
.sl-cashup-btn:hover { border-color: var(--teal); background: #3DDBD914; }

@media (max-width: 860px) {
  .sl-main { flex-direction: column; align-items: stretch; }
  .sl-history-panel, .sl-reels-wrap, .sl-panel { flex: 0 0 auto; max-width: 100%; }
  .sl-history-panel { max-height: 220px; order: 3; }
}
`;
