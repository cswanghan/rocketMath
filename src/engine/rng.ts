// Seedable RNG. ALL randomness in the engine must route through an injected
// rng() so tests are deterministic (SPEC §3, §10). mulberry32 is tiny, fast
// and good enough for shuffling drill prompts — this is not cryptographic.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
