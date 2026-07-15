// Shared, framework-agnostic Plinko physics module — imported by the React
// component (via Next.js's bundler) AND directly `require()`-able from a
// plain Node script for headless fairness verification. Written as
// CommonJS deliberately: the project's package.json has no
// `"type": "module"`, so a plain Node process treats .js files as CommonJS,
// while Next.js's bundler interoperates with CommonJS modules from ESM
// `import` just fine — this way both consumers run the *exact same* code,
// which is the whole point (a verification script that reimplements the
// logic separately wouldn't actually prove anything about the live path).
//
// -----------------------------------------------------------------------
// FAIRNESS CONTRACT: a ball's final bucket is decided BEFORE it ever
// starts falling (by derivePath() in plinko.jsx, from the committed
// server-seed hash — untouched by this module). Everything here only
// controls how the fall LOOKS: real gravity/restitution/friction via
// matter-js, steered at each peg row toward the predetermined side, with
// a hard positional clamp at the bottom so the visual landing spot always
// matches the pre-computed bucket exactly. Payout is computed from that
// pre-computed bucket, never read back from where the ball visually ends
// up — this module cannot change who wins or loses, only how it looks.
// -----------------------------------------------------------------------

const GRAVITY_Y = 2.1;
const BALL_RADIUS = 7;
const PEG_RADIUS = 4;
const BALL_RESTITUTION = 0.4;
const PEG_RESTITUTION = 0.35;
const NUDGE_MAGNITUDE = 3.1;
const FIXED_DT_MS = 1000 / 60;
const MAX_SUBSTEPS_PER_FRAME = 5; // clamps a lag spike instead of a runaway catch-up spiral
const BOARD_TOP_MARGIN = 8;
const BOARD_BOTTOM_MARGIN = 36;

// A ball occasionally traps itself in a low-energy bounce loop between two
// pegs (random jitter in the nudge means each run's exact trajectory
// differs even for the same hash — measured empirically at ~4% of rounds
// with a headless script before this constant was added). Fairness is
// already fully decided by the pre-computed bucket regardless of how the
// physics resolves, so a stuck ball is a UX problem, not a fairness one —
// past this many simulated milliseconds it's force-settled the same way
// the bottom-of-board safety net does.
const MAX_FALL_MS = 4500;

function slotSize(boardWidth, rows) {
  return boardWidth / (rows + 2);
}

// Same math as the original DOM-waypoint version's posForStep — kept as
// the single source of truth for peg layout, physics targets, canvas
// drawing, and the DOM bucket-label strip below the board.
function targetXForRow(row, rightsSoFar, boardWidth, rows) {
  const slot = slotSize(boardWidth, rows);
  return boardWidth / 2 + (2 * rightsSoFar - row) * (slot / 2);
}

function pegY(row, rows, boardHeight) {
  return BOARD_TOP_MARGIN + (row / (rows + 1)) * (boardHeight - BOARD_BOTTOM_MARGIN);
}

function buildPegLayout(rows, boardWidth, boardHeight) {
  const pegs = [];
  for (let row = 1; row <= rows; row++) {
    const count = row + 2;
    const spacing = boardWidth / (count + 1);
    const y = pegY(row, rows, boardHeight);
    for (let i = 0; i < count; i++) {
      pegs.push({ row, x: spacing * (i + 1), y });
    }
  }
  return pegs;
}

function bucketFloorY(rows, boardHeight) {
  return pegY(rows, rows, boardHeight) + (boardHeight - BOARD_BOTTOM_MARGIN) / (rows + 1) * 0.6;
}

function createWorld(Matter, { rows, boardWidth, boardHeight }) {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: GRAVITY_Y } });
  const world = engine.world;

  const pegBodies = buildPegLayout(rows, boardWidth, boardHeight).map(({ row, x, y }) =>
    Matter.Bodies.circle(x, y, PEG_RADIUS, {
      isStatic: true,
      restitution: PEG_RESTITUTION,
      friction: 0,
      plugin: { isPeg: true, row },
    })
  );

  const wallThickness = 40;
  const walls = [
    Matter.Bodies.rectangle(-wallThickness / 2, boardHeight / 2, wallThickness, boardHeight * 2, { isStatic: true }),
    Matter.Bodies.rectangle(boardWidth + wallThickness / 2, boardHeight / 2, wallThickness, boardHeight * 2, {
      isStatic: true,
    }),
  ];

  Matter.World.add(world, [...pegBodies, ...walls]);

  // One collision handler for the whole world/round, shared by every ball
  // spawned into it — simpler and cheaper than per-ball listeners.
  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const ball = bodyA.plugin?.isBall ? bodyA : bodyB.plugin?.isBall ? bodyB : null;
      const peg = bodyA.plugin?.isPeg ? bodyA : bodyB.plugin?.isPeg ? bodyB : null;
      if (!ball || !peg || ball.plugin.settled) continue;

      const row = peg.plugin.row;
      if (row <= ball.plugin.lastNudgedRow) continue;
      ball.plugin.lastNudgedRow = row;

      // Self-correcting nudge: bias toward wherever the predetermined path
      // says the ball should be after this row, not a fixed left/right
      // kick — so real bounce variance from earlier rows doesn't compound,
      // it just gets steered back on course row by row.
      const targetX = ball.plugin.targetXPerRow[row];
      const error = targetX - ball.position.x;
      const bitDirection = ball.plugin.bits[row - 1] === 1 ? 1 : -1;
      const direction = error !== 0 ? Math.sign(error) : bitDirection;
      const jitter = 0.6 + Math.random() * 0.4;

      Matter.Body.setVelocity(ball, {
        x: ball.velocity.x + direction * NUDGE_MAGNITUDE * jitter,
        y: ball.velocity.y,
      });
    }
  });

  return { engine, world, pegBodies };
}

function spawnBall(Matter, world, { id, bits, bucket, boardWidth, rows }) {
  const targetXPerRow = [boardWidth / 2];
  let rightsSoFar = 0;
  for (let row = 1; row <= rows; row++) {
    rightsSoFar += bits[row - 1];
    targetXPerRow[row] = targetXForRow(row, rightsSoFar, boardWidth, rows);
  }

  const body = Matter.Bodies.circle(boardWidth / 2, BOARD_TOP_MARGIN, BALL_RADIUS, {
    restitution: BALL_RESTITUTION,
    friction: 0.01,
    frictionAir: 0.0008,
    density: 0.02,
    // Balls never collide with each other — only ball-peg and
    // ball-boundary contacts matter here, and skipping ball-ball pairs
    // avoids an O(n^2) blowup at up to 100 simultaneous balls. Balls
    // sharing the same (statistically common, central) path will visibly
    // pass through one another as a result — an accepted tradeoff.
    collisionFilter: { group: -1 },
    plugin: { isBall: true, id, bits, bucket, targetXPerRow, lastNudgedRow: 0, settled: false },
  });

  Matter.World.add(world, body);
  return body;
}

// Fixed-timestep accumulator: steps the engine in constant ~16.67ms
// substeps regardless of the caller's actual frame delta, so physics
// behaves identically whether driven by a live rAF loop (jittery, can
// spike under tab throttling) or a headless script feeding idealized
// deltas — the same accumulator logic runs either way.
function createStepper(Matter, engine) {
  let accumulator = 0;

  return function step(deltaMs) {
    accumulator += deltaMs;
    let steps = 0;

    while (accumulator >= FIXED_DT_MS && steps < MAX_SUBSTEPS_PER_FRAME) {
      Matter.Engine.update(engine, FIXED_DT_MS);
      accumulator -= FIXED_DT_MS;
      steps++;
    }

    if (steps === MAX_SUBSTEPS_PER_FRAME) accumulator = 0;
  };
}

// Hard safety net: once a ball reaches the bucket floor — OR has simply
// been falling too long (see MAX_FALL_MS) — its position is clamped
// directly to the predetermined bucket's center and frozen, regardless of
// exactly where physics left it. Bucket-match is guaranteed, not merely
// likely. `elapsedMs` is time since this specific ball was spawned (not
// round start), passed in by the caller. Returns true the frame a ball
// settles.
function checkSettle(Matter, ball, { rows, boardHeight, elapsedMs = 0 }) {
  if (ball.plugin.settled) return false;
  if (ball.position.y < bucketFloorY(rows, boardHeight) && elapsedMs < MAX_FALL_MS) return false;

  const finalX = ball.plugin.targetXPerRow[rows];
  Matter.Body.setPosition(ball, { x: finalX, y: bucketFloorY(rows, boardHeight) });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
  Matter.Body.setStatic(ball, true);
  ball.plugin.settled = true;
  return true;
}

// Inverse of targetXForRow at the last row — which bucket a raw x
// position falls into. Only used for sanity checks / verification, never
// for payout (payout always comes from the pre-computed bucket).
function bucketIndexForX(x, boardWidth, rows) {
  const slot = slotSize(boardWidth, rows);
  const rightsSoFar = rows / 2 + (x - boardWidth / 2) / slot;
  return Math.max(0, Math.min(rows, Math.round(rightsSoFar)));
}

module.exports = {
  GRAVITY_Y,
  BALL_RADIUS,
  PEG_RADIUS,
  FIXED_DT_MS,
  MAX_FALL_MS,
  buildPegLayout,
  targetXForRow,
  pegY,
  bucketFloorY,
  createWorld,
  spawnBall,
  createStepper,
  checkSettle,
  bucketIndexForX,
};
