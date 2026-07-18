"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { Gem, Bomb, ShieldCheck, RefreshCw, Check, Copy } from "lucide-react";

/* ---------------------------------------------------------------
   Crypto helpers — Web Crypto API, no external libs.
   Provably-fair flow:
   1) Server seed generated + hashed BEFORE the round (commitment).
   2) Mine layout derived deterministically from HMAC(serverSeed, clientSeed:nonce).
   3) After the round, server seed is revealed so the hash can be re-verified.
------------------------------------------------------------------*/
const toHex = (buf) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return toHex(buf);
}

async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(sig);
}

function randomSeed() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return toHex(arr.buffer);
}

// Derive a shuffled tile order from a hex hash, then take the first N as mines.
function deriveMinePositions(hashHex, mineCount, totalTiles = 25) {
  const bytes = [];
  for (let i = 0; i < hashHex.length; i += 2) bytes.push(parseInt(hashHex.slice(i, i + 2), 16));
  const order = Array.from({ length: totalTiles }, (_, i) => i);
  let bi = 0;
  for (let i = order.length - 1; i > 0; i--) {
    const b = bytes[bi % bytes.length];
    bi++;
    const j = b % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, mineCount));
}

const HOUSE_EDGE = 0.02; // 2%, applied to the fair multiplier
function multiplierFor(revealed, mines, total = 25) {
  if (revealed === 0) return 1;
  let p = 1;
  for (let i = 0; i < revealed; i++) p *= (total - mines - i) / (total - i);
  return (1 / p) * (1 - HOUSE_EDGE);
}

const fmt = (n, d = 4) => Number(n).toFixed(d);
const short = (s) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const CASH_UP_AMOUNTS = [10, 100, 1000, 10000];
const nowClock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function MinesCasino() {
  const [balance, setBalance] = useState(1.0); // simulated units, "Essence"
  const [bet, setBet] = useState(0.001);
  const [mineCount, setMineCount] = useState(5);
  const [clientSeed, setClientSeed] = useState("player-seed-0001");
  const [nonce, setNonce] = useState(0);

  const [phase, setPhase] = useState("idle"); // idle | playing | busted | cashed
  const [serverSeed, setServerSeed] = useState(null);
  const [serverSeedHash, setServerSeedHash] = useState(null);
  const [mines, setMines] = useState(new Set());
  const [revealed, setRevealed] = useState(new Set());
  const [hitTile, setHitTile] = useState(null);
  const [history, setHistory] = useState([]);
  const [verified, setVerified] = useState(null); // null | true
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const roundIdRef = useRef(1);

  const revealedCount = revealed.size;
  const multiplier = useMemo(() => multiplierFor(revealedCount, mineCount), [revealedCount, mineCount]);
  const nextMultiplier = useMemo(() => multiplierFor(revealedCount + 1, mineCount), [revealedCount, mineCount]);
  const potential = bet * multiplier;

  const startRound = useCallback(async () => {
    if (busy.current || bet <= 0 || bet > balance) return;
    busy.current = true;
    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    const layoutHash = await hmacSha256Hex(seed, `${clientSeed}:${nonce}`);
    const mineSet = deriveMinePositions(layoutHash, mineCount);

    setServerSeed(seed);
    setServerSeedHash(hash);
    setMines(mineSet);
    setRevealed(new Set());
    setHitTile(null);
    setVerified(null);
    setBalance((b) => +(b - bet).toFixed(8));
    setPhase("playing");
    busy.current = false;
  }, [bet, balance, clientSeed, nonce, mineCount]);

  const revealTile = (idx) => {
    if (phase !== "playing" || revealed.has(idx)) return;
    if (mines.has(idx)) {
      setHitTile(idx);
      setPhase("busted");
      setHistory((h) => [{ id: roundIdRef.current++, bet, profit: -bet, mines: mineCount, time: nowClock() }, ...h].slice(0, 30));
      setNonce((n) => n + 1);
      return;
    }
    const next = new Set(revealed);
    next.add(idx);
    setRevealed(next);
  };

  const cashOut = () => {
    if (phase !== "playing" || revealedCount === 0) return;
    const payout = +(bet * multiplier).toFixed(8);
    const profit = +(payout - bet).toFixed(8);
    setBalance((b) => +(b + payout).toFixed(8));
    setPhase("cashed");
    setHistory((h) => [{ id: roundIdRef.current++, bet, profit, mines: mineCount, time: nowClock() }, ...h].slice(0, 30));
    setNonce((n) => n + 1);
  };

  const newRound = () => {
    setPhase("idle");
    setRevealed(new Set());
    setMines(new Set());
    setHitTile(null);
    setServerSeed(null);
    setServerSeedHash(null);
    setVerified(null);
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

  const roundOver = phase === "busted" || phase === "cashed";

  return (
    <div className="mc-root">
      <style>{CSS}</style>

      <div className="mc-topbar">
        <div className="mc-brand">
          <span className="mc-brand-mark">☣</span>
          <span className="mc-brand-name">MORG CITY</span>
          <span className="mc-brand-tag">provably fair · demo</span>
        </div>
        <div className="mc-wallet">
          <span className="mc-wallet-label">Essence</span>
          <span className="mc-wallet-value">{fmt(balance)}</span>
        </div>
      </div>

      <div className="mc-ledger">
        <div className="mc-ledger-item">
          <span className="mc-ledger-k">server seed (hash)</span>
          <span className="mc-ledger-v mono">{serverSeedHash ? short(serverSeedHash) : "—"}</span>
        </div>
        <div className="mc-ledger-sep" />
        <div className="mc-ledger-item">
          <span className="mc-ledger-k">client seed</span>
          {phase === "idle" ? (
            <input
              className="mc-seed-input mono"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <span className="mc-ledger-v mono">{clientSeed}</span>
          )}
        </div>
        <div className="mc-ledger-sep" />
        <div className="mc-ledger-item">
          <span className="mc-ledger-k">nonce</span>
          <span className="mc-ledger-v mono">{nonce}</span>
        </div>
        {roundOver && (
          <>
            <div className="mc-ledger-sep" />
            <div className="mc-ledger-item">
              <span className="mc-ledger-k">server seed (revealed)</span>
              <button className="mc-inline-btn mono" onClick={copySeed} title="Copy">
                {short(serverSeed)} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button className="mc-verify-btn" onClick={verify}>
              <ShieldCheck size={13} />
              {verified === null ? "Verify" : verified ? "Hash matches" : "Mismatch"}
            </button>
          </>
        )}
      </div>

      <div className="mc-main">
        <div className="mc-history-panel">
          <span className="mc-history-panel-title">Bet Log</span>
          <div className="mc-history-header">
            <span>#</span><span>Bet</span><span>Win / Loss</span><span>Time</span>
          </div>
          <div className="mc-history-body">
            {history.length === 0 && <div className="mc-history-empty">No bets yet</div>}
            {history.map((h) => (
              <div key={h.id} className="mc-history-row">
                <span>#{h.id}</span>
                <span className="mono">{fmt(h.bet, 4)}</span>
                <span className={`mono ${h.profit >= 0 ? "good" : "bad"}`}>{h.profit >= 0 ? "+" : ""}{fmt(h.profit, 4)}</span>
                <span className="mono mc-history-time">{h.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-board-wrap">
          <div className="mc-board">
            {Array.from({ length: 25 }, (_, idx) => {
              const isRevealed = revealed.has(idx);
              const isMine = mines.has(idx);
              const isHit = hitTile === idx;
              const showMine = roundOver && isMine;
              let cls = "mc-tile";
              if (isRevealed) cls += " mc-tile-safe";
              if (isHit) cls += " mc-tile-hit";
              else if (showMine) cls += " mc-tile-mine";
              return (
                <button
                  key={idx}
                  className={cls}
                  disabled={phase !== "playing" || isRevealed}
                  onClick={() => revealTile(idx)}
                >
                  {isRevealed && <Gem size={20} strokeWidth={2} />}
                  {isHit && <Bomb size={20} strokeWidth={2} />}
                  {showMine && !isHit && <Bomb size={16} strokeWidth={2} className="mc-mine-dim" />}
                </button>
              );
            })}
          </div>
          {phase === "playing" && (
            <div className="mc-hint">
              next safe tile → <span className="mono">{fmt(nextMultiplier, 2)}×</span>
            </div>
          )}
        </div>

        <div className="mc-panel">
          <div className="mc-field">
            <label>Bet amount</label>
            <div className="mc-bet-row">
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={bet}
                disabled={phase === "playing"}
                onChange={(e) => setBet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mono"
              />
              <div className="mc-bet-quick">
                <button disabled={phase === "playing"} onClick={() => setBet((b) => +(b / 2).toFixed(8))}>½</button>
                <button disabled={phase === "playing"} onClick={() => setBet((b) => +(b * 2).toFixed(8))}>2×</button>
              </div>
            </div>
          </div>

          <div className="mc-field">
            <label>Mines</label>
            <div className="mc-mine-select">
              <input
                type="range"
                min="1"
                max="24"
                value={mineCount}
                disabled={phase === "playing"}
                onChange={(e) => setMineCount(parseInt(e.target.value))}
              />
              <span className="mono mc-mine-count">{mineCount}</span>
            </div>
          </div>

          <div className="mc-stat-row">
            <div className="mc-stat">
              <span className="mc-stat-k">Multiplier</span>
              <span className="mc-stat-v">{fmt(multiplier, 2)}×</span>
            </div>
            <div className="mc-stat">
              <span className="mc-stat-k">Payout</span>
              <span className="mc-stat-v gold">{fmt(potential)}</span>
            </div>
          </div>

          {phase === "idle" && (
            <button className="mc-primary-btn" onClick={startRound} disabled={bet <= 0 || bet > balance}>
              Place bet
            </button>
          )}
          {phase === "playing" && (
            <button className="mc-primary-btn cashout" onClick={cashOut} disabled={revealedCount === 0}>
              Cash out {revealedCount > 0 && `· ${fmt(potential)}`}
            </button>
          )}
          {roundOver && (
            <button className="mc-primary-btn" onClick={newRound}>
              <RefreshCw size={14} /> New round
            </button>
          )}
          {phase === "busted" && <div className="mc-result bad">Hit a mine — round lost</div>}
          {phase === "cashed" && <div className="mc-result good">Cashed out at {fmt(multiplier, 2)}×</div>}

          <div className="mc-field">
            <label>Cash up</label>
            <div className="mc-choice-grid">
              {CASH_UP_AMOUNTS.map((amt) => (
                <button key={amt} className="mc-cashup-btn mono" onClick={() => cashUp(amt)}>+{amt}</button>
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

.mc-root {
  --bg: #0A0612;
  --panel: #171025;
  --panel-alt: #1A1128;
  --border: #3D2B5C;
  --text: #E8E0F5;
  --muted: #8B7BA8;
  --gold: #E5B94E;
  --gold-dim: #E5B94E22;
  --teal: #3DDBD9;
  --danger: #E5484D;
  --danger-dim: #E5484D22;
  --purple: #9333EA;
  --purple-dim: #9333EA22;

  background: var(--bg);
  color: var(--text);
  font-family: 'Oswald', sans-serif;
  width: 100vw; height: 100vh; box-sizing: border-box;
  padding: 20px; display: flex; flex-direction: column;
  overflow-x: hidden; overflow-y: auto;
}
.mono { font-family: 'JetBrains Mono', monospace; }
.good { color: var(--teal) !important; }
.bad { color: var(--danger) !important; }

.mc-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.mc-brand { display: flex; align-items: baseline; gap: 8px; }
.mc-brand-mark { color: var(--gold); font-size: 16px; }
.mc-brand-name { font-family: 'Cinzel', serif; font-weight: 700; letter-spacing: 0.5px; font-size: 16px; }
.mc-brand-tag { color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.mc-wallet { text-align: right; }
.mc-wallet-label { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
.mc-wallet-value { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--gold); }

.mc-ledger {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  padding: 10px 14px; margin-bottom: 14px; font-size: 12px; flex-shrink: 0;
}
.mc-ledger-item { display: flex; flex-direction: column; gap: 2px; }
.mc-ledger-k { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.mc-ledger-v { color: var(--teal); font-size: 12px; }
.mc-ledger-sep { width: 1px; height: 22px; background: var(--border); }
.mc-seed-input {
  background: var(--panel-alt); border: 1px solid var(--border); color: var(--text);
  border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 150px;
}
.mc-inline-btn {
  background: none; border: none; color: var(--teal); font-size: 12px; cursor: pointer;
  display: flex; align-items: center; gap: 5px; padding: 0;
}
.mc-verify-btn {
  margin-left: auto; display: flex; align-items: center; gap: 6px;
  background: var(--gold-dim); color: var(--gold); border: 1px solid #E5B94E55;
  border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500;
}

.mc-main { display: flex; gap: 20px; flex: 1 1 auto; min-height: 0; }

.mc-history-panel { flex: 0 0 260px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; min-height: 0; }
.mc-history-panel-title { color: var(--text); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; flex-shrink: 0; }
.mc-history-header { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 4px; flex-shrink: 0; }
.mc-history-body { overflow-y: auto; min-height: 0; }
.mc-history-empty { color: var(--muted); font-size: 12px; padding: 8px 0; }
.mc-history-row { display: grid; grid-template-columns: 0.6fr 1fr 1fr 1fr; gap: 4px; font-size: 11px; padding: 5px 0; color: var(--text); border-bottom: 1px solid #ffffff08; }
.mc-history-time { color: var(--muted); font-size: 10px; }

.mc-board-wrap { flex: 1.3; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; min-width: 0; }
.mc-board {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px;
  width: 100%; max-width: 560px;
}
.mc-tile {
  aspect-ratio: 1; background: var(--panel-alt); border: 1px solid var(--border);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: var(--muted); cursor: pointer; transition: all 0.12s ease;
}
.mc-tile:hover:not(:disabled) { border-color: var(--gold); background: #241a38; }
.mc-tile:disabled { cursor: default; }
.mc-tile-safe { background: var(--gold-dim); border-color: #E5B94E66; color: var(--gold); }
.mc-tile-hit { background: var(--danger-dim); border-color: var(--danger); color: var(--danger); }
.mc-tile-mine { background: var(--panel-alt); border-color: var(--border); color: #5C4A80; }
.mc-mine-dim { opacity: 0.55; }
.mc-hint { margin-top: 10px; text-align: center; color: var(--muted); font-size: 12px; }

.mc-panel {
  flex: 1; max-width: 300px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; min-height: 0;
}
.mc-field label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.mc-bet-row { display: flex; gap: 6px; }
.mc-bet-row input {
  flex: 1; background: var(--panel-alt); border: 1px solid var(--border); color: var(--text);
  border-radius: 8px; padding: 8px 10px; font-size: 13px;
}
.mc-bet-quick { display: flex; gap: 4px; }
.mc-bet-quick button {
  background: var(--panel-alt); border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; padding: 0 10px; cursor: pointer; font-size: 12px;
}
.mc-mine-select { display: flex; align-items: center; gap: 10px; }
.mc-mine-select input[type="range"] { flex: 1; accent-color: var(--gold); }
.mc-mine-count { color: var(--gold); font-size: 13px; width: 20px; text-align: right; }

.mc-stat-row { display: flex; gap: 10px; }
.mc-stat { flex: 1; background: var(--panel-alt); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.mc-stat-k { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.mc-stat-v { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; }
.mc-stat-v.gold { color: var(--gold); }

.mc-primary-btn {
  background: var(--gold); color: #1a1400; border: none; border-radius: 8px;
  padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.mc-primary-btn:disabled { opacity: 0.4; cursor: default; }
.mc-primary-btn.cashout { background: var(--teal); }

.mc-result { text-align: center; font-size: 12px; padding: 6px; border-radius: 6px; }
.mc-result.bad { background: var(--danger-dim); color: var(--danger); }
.mc-result.good { background: #3DDBD922; color: var(--teal); }

.mc-choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.mc-cashup-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--teal); border-radius: 8px; padding: 8px 0; font-size: 12px; cursor: pointer; font-weight: 600; }
.mc-cashup-btn:hover { border-color: var(--teal); background: #3DDBD914; }

@media (max-width: 860px) {
  .mc-main { flex-direction: column; }
  .mc-panel { max-width: 100%; }
  .mc-history-panel { flex: 0 0 auto; max-height: 220px; order: 3; }
}
`;
