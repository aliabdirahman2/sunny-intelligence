// Deterministic random utilities. Fixed seeds → identical demo every time.

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GLOBAL_SEED = 20260824;

/** Independent, reproducible stream per purpose key. */
export function rngFor(key: string) {
  return mulberry32(hashString(`${GLOBAL_SEED}:${key}`));
}

export function pick<T>(rng: () => number, xs: T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}

export function sample<T>(rng: () => number, xs: T[], n: number): T[] {
  const copy = [...xs];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}

