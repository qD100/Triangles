"use client";

// Small, self-contained animated icons replacing plain emoji on the casino
// hub cards — pure CSS transforms/opacity (no image assets, no SVG paths),
// matching the games' own inline-CSS-in-JS convention and the Shadows of
// Evil token palette (purple/gold/teal).

// 4-row pyramid (1, 2, 3, 4 pegs) with constant peg-to-peg spacing, matching
// a real Galton board's expanding-triangle shape rather than a loose
// triangle of 3 dots.
const PEG_STEP = 20; // %, constant spacing so each row is genuinely wider than the last
const PLINKO_ROWS = [1, 2, 3, 4].map((count, r) => {
  const top = 12 + r * 24; // %
  const start = -((count - 1) * PEG_STEP) / 2;
  return Array.from({ length: count }, (_, i) => ({
    top,
    left: 50 + start + i * PEG_STEP,
  }));
}).flat();

export function PlinkoIcon() {
  return (
    <div className="gi-plinko">
      <style>{ICON_CSS}</style>
      {PLINKO_ROWS.map((p, i) => (
        <span key={i} className="gi-peg" style={{ left: `${p.left}%`, top: `${p.top}%` }} />
      ))}
      <span className="gi-plinko-ball" />
    </div>
  );
}

export function MinesIcon() {
  return (
    <div className="gi-mines">
      <style>{ICON_CSS}</style>
      <span className="gi-mines-ring" />
      <span className="gi-mines-ring gi-delay" />
      <span className="gi-mines-gem" />
    </div>
  );
}

export function RouletteIcon() {
  return (
    <div className="gi-roulette">
      <style>{ICON_CSS}</style>
      <span className="gi-roulette-wheel" />
      <span className="gi-roulette-hub" />
    </div>
  );
}

export function SlotsIcon() {
  const colors = ["#E5B94E", "#9333EA", "#3DDBD9", "#E5B94E", "#9333EA", "#3DDBD9"];
  return (
    <div className="gi-slots">
      <style>{ICON_CSS}</style>
      <div className="gi-slots-window">
        <div className="gi-slots-reel">
          {colors.map((c, i) => (
            <span key={i} className="gi-slots-tile">
              <i style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const ICON_CSS = `
.gi-plinko, .gi-mines, .gi-roulette, .gi-slots { position: relative; width: 40px; height: 40px; }

.gi-peg { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #9333EA; box-shadow: 0 0 4px #9333EA; transform: translate(-50%, -50%); }
.gi-plinko-ball {
  position: absolute; left: 50%; top: 0; width: 7px; height: 7px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff8e1, #E5B94E 60%, #b9790f);
  box-shadow: 0 0 6px #E5B94E; transform: translate(-50%, 0);
  animation: gi-plinko-drop 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes gi-plinko-drop {
  0% { top: 0%; left: 50%; opacity: 0; }
  6% { opacity: 1; }
  24% { top: 12%; left: 40%; }
  42% { top: 36%; left: 61%; }
  60% { top: 60%; left: 30%; }
  80% { top: 84%; left: 60%; }
  92% { top: 100%; left: 55%; opacity: 1; }
  100% { top: 108%; left: 55%; opacity: 0; }
}

.gi-mines { display: flex; align-items: center; justify-content: center; }
.gi-mines-gem {
  width: 16px; height: 16px; background: linear-gradient(135deg, #3DDBD9, #1a8f8d);
  clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
  box-shadow: 0 0 10px #3DDBD9aa; animation: gi-mines-pulse 2s ease-in-out infinite;
}
.gi-mines-ring {
  position: absolute; width: 16px; height: 16px; border-radius: 50%; border: 1px solid #E5484D;
  animation: gi-mines-ring 2s ease-out infinite;
}
.gi-mines-ring.gi-delay { animation-delay: 1s; }
@keyframes gi-mines-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
@keyframes gi-mines-ring { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.6); opacity: 0; } }

.gi-roulette-wheel {
  position: absolute; inset: 0; border-radius: 50%; border: 2px solid #E5B94E;
  background: conic-gradient(#A3223F 0deg 30deg, #1A1128 30deg 60deg, #A3223F 60deg 90deg, #1A1128 90deg 120deg,
    #A3223F 120deg 150deg, #0F9B86 150deg 165deg, #1A1128 165deg 195deg, #A3223F 195deg 225deg,
    #1A1128 225deg 255deg, #A3223F 255deg 285deg, #1A1128 285deg 315deg, #A3223F 315deg 345deg, #1A1128 345deg 360deg);
  box-shadow: 0 0 8px #9333ea88; animation: gi-roulette-spin 5s linear infinite;
}
.gi-roulette-hub { position: absolute; inset: 0; margin: auto; width: 10px; height: 10px; border-radius: 50%; background: #0A0612; border: 1.5px solid #E5B94E; }
@keyframes gi-roulette-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.gi-slots { display: flex; align-items: center; justify-content: center; }
.gi-slots-window {
  width: 34px; height: 34px; border-radius: 6px; background: #0A0612; border: 1.5px solid #E5B94E;
  overflow: hidden; position: relative; box-shadow: inset 0 0 8px #E5B94E66;
}
.gi-slots-reel { display: flex; flex-direction: column; animation: gi-slots-spin 1.8s cubic-bezier(0.3, 0, 0.2, 1) infinite; }
.gi-slots-tile { width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.gi-slots-tile i { display: block; width: 12px; height: 12px; border-radius: 50%; }
@keyframes gi-slots-spin { 0% { transform: translateY(0); } 100% { transform: translateY(-102px); } }
`;
