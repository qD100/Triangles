// Deterministic pseudo-random generator (mulberry32) so seeded series are
// identical on server and client render — avoids hydration mismatches from
// Math.random() inside components that render during SSR.
export function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash;
}

// A realistic-looking random walk: gentle drift + noise, never negative.
export function generateWalk(seed: number, length: number, drift = 0.52): number[] {
  const rand = mulberry32(seed);
  const points: number[] = [];
  let value = 50 + rand() * 20;

  for (let i = 0; i < length; i++) {
    const step = (rand() - (1 - drift)) * 6;
    value = Math.max(8, value + step);
    points.push(value);
  }

  return points;
}

// Advances a walk by one step using a live (unseeded) random source, for
// continuous client-side animation after the initial deterministic render.
export function stepWalk(points: number[], volatility = 6): number[] {
  const last = points[points.length - 1] ?? 50;
  const next = Math.max(8, last + (Math.random() - 0.46) * volatility);
  return [...points.slice(1), next];
}
