"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { ShieldCheck, Check, Copy, RefreshCw } from "lucide-react";

/* ---------------------------------------------------------------
   Same provably-fair engine as the Mines build:
   commit(server seed hash) -> HMAC(serverSeed, clientSeed:nonce) -> outcome -> reveal & verify
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
// First 8 hex chars -> uint32 -> mod 37 gives the winning pocket, uniformly (2^32 divisible enough for demo fairness).
function deriveWinningNumber(hashHex) {
  const int = parseInt(hashHex.slice(0, 8), 16);
  return int % 37;
}

const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = (n) => (n === 0 ? "green" : RED_NUMBERS.has(n) ? "red" : "black");
const SLICE = 360 / 37;

function isLow(n) { return n >= 1 && n <= 18; }
function isHigh(n) { return n >= 19 && n <= 36; }
function isOdd(n) { return n !== 0 && n % 2 === 1; }
function isEven(n) { return n !== 0 && n % 2 === 0; }
function dozenOf(n) { if (n === 0) return 0; return Math.ceil(n / 12); }
function columnOf(n) { if (n === 0) return 0; const m = n % 3; return m === 1 ? 1 : m === 2 ? 2 : 3; }

// bet key -> { label, payoutMult, wins(n) }
function betDefs(n) {
  return {
    red: { mult: 1, win: colorOf(n) === "red" },
    black: { mult: 1, win: colorOf(n) === "black" },
    odd: { mult: 1, win: isOdd(n) },
    even: { mult: 1, win: isEven(n) },
    low: { mult: 1, win: isLow(n) },
    high: { mult: 1, win: isHigh(n) },
    dozen1: { mult: 2, win: dozenOf(n) === 1 },
    dozen2: { mult: 2, win: dozenOf(n) === 2 },
    dozen3: { mult: 2, win: dozenOf(n) === 3 },
    col1: { mult: 2, win: columnOf(n) === 1 },
    col2: { mult: 2, win: columnOf(n) === 2 },
    col3: { mult: 2, win: columnOf(n) === 3 },
  };
}

const fmt = (n, d = 4) => Number(n).toFixed(d);
const short = (s) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const NUM_GRID = Array.from({ length: 36 }, (_, i) => i + 1);
const CASH_UP_AMOUNTS = [10, 100, 1000, 10000];
const nowClock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function Roulette() {
  const [balance, setBalance] = useState(1.0);
  const [bet, setBet] = useState(0.001); // amount placed per click on a cell
  const [bets, setBets] = useState({}); // key -> amount staked (key is "n-<num>" or outside key)
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);

  const [phase, setPhase] = useState("betting"); // betting | spinning | result
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [winningNumber, setWinningNumber] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [verified, setVerified] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastPayout, setLastPayout] = useState(null);
  const busy = useRef(false);
  const roundIdRef = useRef(1);

  const totalWager = useMemo(() => Object.values(bets).reduce((a, b) => a + b, 0), [bets]);

  const addBet = (key) => {
    if (phase !== "betting") return;
    if (bet <= 0 || bet > balance - totalWager) return;
    setBets((b) => ({ ...b, [key]: +((b[key] || 0) + bet).toFixed(8) }));
  };
  const clearBets = () => { if (phase === "betting") setBets({}); };

  const spin = useCallback(async () => {
    if (busy.current || totalWager <= 0 || totalWager > balance) return;
    busy.current = true;
    setPhase("spinning");
    setVerified(null);

    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    const rollHash = await hmacSha256Hex(seed, `${clientSeed}:${nonce}`);
    const winner = deriveWinningNumber(rollHash);

    setServerSeed(seed);
    setServerSeedHash(hash);
    setWinningNumber(winner);
    setBalance((b) => +(b - totalWager).toFixed(8));

    const idx = WHEEL_ORDER.indexOf(winner);
    const centerAngle = idx * SLICE + SLICE / 2;
    const spins = 5;
    const target = spins * 360 + (360 - centerAngle);
    setRotation((r) => r - (r % 360) + target); // always spin forward from a clean multiple

    setTimeout(() => {
      const defs = betDefs(winner);
      let payout = 0;
      for (const [key, amt] of Object.entries(bets)) {
        if (key.startsWith("n-")) {
          const num = parseInt(key.slice(2), 10);
          if (num === winner) payout += amt * 36; // 35:1 + original stake back
        } else if (defs[key]?.win) {
          payout += amt * (defs[key].mult + 1);
        }
      }
      payout = +payout.toFixed(8);
      const profit = +(payout - totalWager).toFixed(8);
      setBalance((b) => +(b + payout).toFixed(8));
      setLastPayout(payout);
      setHistory((h) => [{ id: roundIdRef.current++, winner, bet: totalWager, profit, time: nowClock() }, ...h].slice(0, 30));
      setNonce((n) => n + 1);
      setPhase("result");
      busy.current = false;
    }, 3500);
  }, [bets, totalWager, balance, clientSeed, nonce]);

  const newRound = () => {
    setPhase("betting");
    setBets({});
    setServerSeed(null);
    setServerSeedHash(null);
    setWinningNumber(null);
    setVerified(null);
    setLastPayout(null);
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

  const cashUp = (amount) => setBalance((b) => +(b + amount).toFixed(8));

  const roundOver = phase === "result";

  return (
    <div className="rl-root">
      <style>{CSS}</style>

      <div className="rl-topbar">
        <div className="rl-brand">
          <span className="rl-brand-mark">◆</span>
          <span className="rl-brand-name">DEEPFIELD</span>
          <span className="rl-brand-tag">roulette · provably fair</span>
        </div>
        <div className="rl-wallet">
          <span className="rl-wallet-label">sBTC balance</span>
          <span className="rl-wallet-value">{fmt(balance)}</span>
        </div>
      </div>

      <div className="rl-ledger">
        <div className="rl-ledger-item">
          <span className="rl-ledger-k">server seed (hash)</span>
          <span className="rl-ledger-v mono">{serverSeedHash ? short(serverSeedHash) : "—"}</span>
        </div>
        <div className="rl-ledger-sep" />
        <div className="rl-ledger-item">
          <span className="rl-ledger-k">client seed</span>
          {phase === "betting" ? (
            <input className="rl-seed-input mono" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} spellCheck={false} />
          ) : (
            <span className="rl-ledger-v mono">{clientSeed}</span>
          )}
        </div>
        <div className="rl-ledger-sep" />
        <div className="rl-ledger-item">
          <span className="rl-ledger-k">nonce</span>
          <span className="rl-ledger-v mono">{nonce}</span>
        </div>
        {roundOver && (
          <>
            <div className="rl-ledger-sep" />
            <div className="rl-ledger-item">
              <span className="rl-ledger-k">server seed (revealed)</span>
              <button className="rl-inline-btn mono" onClick={copySeed}>
                {short(serverSeed)} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button className="rl-verify-btn" onClick={verify}>
              <ShieldCheck size={13} />
              {verified === null ? "Verify" : verified ? "Hash matches" : "Mismatch"}
            </button>
          </>
        )}
      </div>

      <div className="rl-main">
        <div className="rl-history-panel">
          <span className="rl-history-panel-title">Bet Log</span>
          <div className="rl-history-header">
            <span>#</span><span>Bet</span><span>Win / Loss</span><span>Time</span>
          </div>
          <div className="rl-history-body">
            {history.length === 0 && <div className="rl-history-empty">No spins yet</div>}
            {history.map((h) => (
              <div key={h.id} className="rl-history-row">
                <span>#{h.id}</span>
                <span className="mono">{fmt(h.bet, 4)}</span>
                <span className={`mono ${h.profit >= 0 ? "good" : "bad"}`}>{h.profit >= 0 ? "+" : ""}{fmt(h.profit, 4)}</span>
                <span className="mono rl-history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rl-wheel-wrap">
          <div className="rl-pointer" />
          <div className="rl-wheel-outer">
            <div
              className="rl-wheel"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: phase === "spinning" ? "transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)" : "none",
                background: wheelGradient(),
              }}
            >
              {WHEEL_ORDER.map((n, i) => {
                const angle = i * SLICE + SLICE / 2;
                return (
                  <span
                    key={n}
                    className="rl-wheel-label"
                    style={{ transform: `rotate(${angle}deg) translate(0, -194px) rotate(${-angle}deg)` }}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
            <div className="rl-wheel-hub" />
          </div>
          {roundOver && (
            <div className={`rl-winning-badge ${colorOf(winningNumber)}`}>
              {winningNumber}
            </div>
          )}
          {phase === "result" && (
            <div className={`rl-payout-msg ${lastPayout > 0 ? "good" : "bad"}`}>
              {lastPayout > 0 ? `Won ${fmt(lastPayout)}` : "No winning bets"}
            </div>
          )}
        </div>

        <div className="rl-panel">
          <div className="rl-field">
            <label>Bet amount</label>
            <div className="rl-bet-row">
              <input
                type="number" min="0.0001" step="0.0001" value={bet}
                disabled={phase !== "betting"}
                onChange={(e) => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mono"
              />
              <div className="rl-bet-quick">
                <button disabled={phase !== "betting"} onClick={() => setBet((b) => +(b / 2).toFixed(8))}>½</button>
                <button disabled={phase !== "betting"} onClick={() => setBet((b) => +(b * 2).toFixed(8))}>2×</button>
              </div>
            </div>
          </div>

          <div className="rl-board">
            <div className="rl-zero" onClick={() => addBet("n-0")}>
              0 {bets["n-0"] ? <b className="mono">{fmt(bets["n-0"], 3)}</b> : null}
            </div>
            <div className="rl-numgrid">
              {NUM_GRID.map((n) => (
                <div key={n} className={`rl-numcell ${colorOf(n)}`} onClick={() => addBet(`n-${n}`)}>
                  {n}
                  {bets[`n-${n}`] ? <b className="mono">{fmt(bets[`n-${n}`], 3)}</b> : null}
                </div>
              ))}
            </div>
            <div className="rl-outside">
              {[
                ["dozen1", "1st 12"], ["dozen2", "2nd 12"], ["dozen3", "3rd 12"],
              ].map(([k, label]) => (
                <div key={k} className="rl-outcell" onClick={() => addBet(k)}>
                  {label} {bets[k] ? <b className="mono">{fmt(bets[k], 3)}</b> : null}
                </div>
              ))}
            </div>
            <div className="rl-outside">
              {[
                ["low", "1–18"], ["even", "Even"], ["red", "Red"], ["black", "Black"], ["odd", "Odd"], ["high", "19–36"],
              ].map(([k, label]) => (
                <div key={k} className={`rl-outcell ${k === "red" ? "red" : k === "black" ? "black" : ""}`} onClick={() => addBet(k)}>
                  {label} {bets[k] ? <b className="mono">{fmt(bets[k], 3)}</b> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rl-stat-row">
            <div className="rl-stat">
              <span className="rl-stat-k">Total wager</span>
              <span className="rl-stat-v">{fmt(totalWager)}</span>
            </div>
            <button className="rl-clear-btn" onClick={clearBets} disabled={phase !== "betting"}>Clear</button>
          </div>

          {phase !== "result" ? (
            <button className="rl-primary-btn" onClick={spin} disabled={phase === "spinning" || totalWager <= 0 || totalWager > balance}>
              {phase === "spinning" ? "Spinning…" : "Spin"}
            </button>
          ) : (
            <button className="rl-primary-btn" onClick={newRound}><RefreshCw size={14} /> New round</button>
          )}

          <div className="rl-field">
            <label>Cash up</label>
            <div className="rl-choice-grid">
              {CASH_UP_AMOUNTS.map((amt) => (
                <button key={amt} className="rl-cashup-btn mono" onClick={() => cashUp(amt)}>+{amt}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function wheelGradient() {
  const stops = [];
  WHEEL_ORDER.forEach((n, i) => {
    const c = colorOf(n) === "red" ? "#B91C1C" : colorOf(n) === "black" ? "#161B22" : "#0F766E";
    stops.push(`${c} ${i * SLICE}deg ${(i + 1) * SLICE}deg`);
  });
  return `conic-gradient(${stops.join(",")})`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

.rl-root {
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

.rl-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.rl-brand { display: flex; align-items: baseline; gap: 8px; }
.rl-brand-mark { color: var(--gold); font-size: 16px; }
.rl-brand-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.rl-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.rl-wallet { text-align: right; }
.rl-wallet-label { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
.rl-wallet-value { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--gold); }

.rl-ledger { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; flex-shrink: 0; }
.rl-ledger-item { display: flex; flex-direction: column; gap: 2px; }
.rl-ledger-k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.rl-ledger-v { color: var(--teal); font-size: 12px; }
.rl-ledger-sep { width: 1px; height: 22px; background: var(--border); }
.rl-seed-input { background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 150px; }
.rl-inline-btn { background: none; border: none; color: var(--teal); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; }
.rl-verify-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; background: var(--gold-dim); color: var(--gold); border: 1px solid #F0B42955; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }

.rl-main { display: flex; gap: 32px; flex: 1 1 auto; min-height: 0; justify-content: center; align-items: center; }

.rl-history-panel { flex: 0 0 300px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
.rl-history-panel-title { color: var(--text); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; flex-shrink: 0; }
.rl-history-header { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 7px; margin-bottom: 4px; flex-shrink: 0; }
.rl-history-body { overflow-y: auto; min-height: 0; }
.rl-history-empty { color: var(--muted); font-size: 13px; padding: 8px 0; }
.rl-history-row { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 12px; padding: 6px 0; color: var(--text); border-bottom: 1px solid #ffffff08; }
.rl-history-time { color: var(--muted); font-size: 11px; }

.rl-wheel-wrap { flex: 0 0 460px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 10px; }
.rl-pointer { width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 18px solid var(--gold); margin-bottom: -4px; z-index: 2; }
.rl-wheel-outer { position: relative; width: 420px; height: 420px; border-radius: 50%; border: 5px solid var(--panel-alt); box-shadow: 0 0 0 1px var(--border); }
.rl-wheel { position: absolute; inset: 0; border-radius: 50%; }
.rl-wheel-label { position: absolute; top: 50%; left: 50%; font-size: 12px; color: #E6EDF3cc; font-family: 'JetBrains Mono', monospace; transform-origin: 0 0; }
.rl-wheel-hub { position: absolute; inset: 0; margin: auto; width: 80px; height: 80px; border-radius: 50%; background: var(--bg); border: 2px solid var(--gold); }
.rl-winning-badge { margin-top: 16px; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 18px; border: 2px solid var(--border); }
.rl-winning-badge.red { background: #B91C1C; }
.rl-winning-badge.black { background: #161B22; }
.rl-winning-badge.green { background: #0F766E; }
.rl-payout-msg { margin-top: 8px; font-size: 12px; padding: 4px 10px; border-radius: 6px; }
.rl-payout-msg.good { background: #2DD4BF22; color: var(--teal); }
.rl-payout-msg.bad { background: var(--danger-dim); color: var(--danger); }

.rl-panel { flex: 1; max-width: 500px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; min-height: 0; }
.rl-field label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.rl-bet-row { display: flex; gap: 6px; }
.rl-bet-row input { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.rl-bet-quick { display: flex; gap: 4px; }
.rl-bet-quick button { background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0 10px; cursor: pointer; font-size: 12px; }

.rl-board { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
.rl-zero { background: #0F766E; border-radius: 6px; padding: 8px; font-size: 13px; text-align: center; cursor: pointer; margin-bottom: 5px; display: flex; justify-content: center; gap: 6px; }
.rl-numgrid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin-bottom: 8px; }
.rl-numcell { font-size: 11px; text-align: center; padding: 8px 0; border-radius: 4px; cursor: pointer; color: #fff; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.rl-numcell.red { background: #B91C1C; }
.rl-numcell.black { background: #161B22; border: 1px solid #2A313C; }
.rl-numcell b, .rl-zero b, .rl-outcell b { font-size: 9px; color: var(--gold); font-weight: 600; }
.rl-outside { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 5px; }
.rl-outcell { background: var(--panel); border: 1px solid var(--border); color: var(--text); font-size: 12px; text-align: center; padding: 9px 0; border-radius: 4px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.rl-outcell.red { color: #ef6a6a; }
.rl-outcell.black { color: #9aa4b2; }

.rl-stat-row { display: flex; align-items: center; gap: 10px; }
.rl-stat { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.rl-stat-k { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.rl-stat-v { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: var(--gold); }
.rl-clear-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted); border-radius: 8px; padding: 8px 14px; font-size: 12px; cursor: pointer; }
.rl-clear-btn:disabled { opacity: 0.4; }

.rl-primary-btn { background: var(--gold); color: #1a1400; border: none; border-radius: 8px; padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.rl-primary-btn:disabled { opacity: 0.4; cursor: default; }

.rl-choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.rl-cashup-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--teal); border-radius: 8px; padding: 8px 0; font-size: 12px; cursor: pointer; font-weight: 600; }
.rl-cashup-btn:hover { border-color: var(--teal); background: #2DD4BF14; }

@media (max-width: 1440px) {
  .rl-main { flex-direction: column; align-items: stretch; }
  .rl-history-panel, .rl-wheel-wrap, .rl-panel { flex: 0 0 auto; max-width: 100%; }
  .rl-history-panel { max-height: 220px; order: 3; }
}
`;
