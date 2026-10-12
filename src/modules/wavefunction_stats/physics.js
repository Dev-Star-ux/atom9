// Statistical buildup of |ψ|² in a 1-D box (Ch.3 §3).
import { infiniteWellProb, sampleFromProb } from '../common/wavePhysics.js';

export { infiniteWellProb, sampleFromProb };

export const DEFAULT_A = 1e-9;
export const BATCH_SIZE = 25;
export const HIST_BINS = 20;

export function probAt(n, x, a = DEFAULT_A) {
  return infiniteWellProb(n, x, a);
}

export function fireBatch(n, a, count = BATCH_SIZE) {
  const hits = [];
  const fn = (x) => probAt(n, x, a);
  for (let i = 0; i < count; i++) hits.push(sampleFromProb(fn, 0, a));
  return hits;
}

export function histogram(hits, a = DEFAULT_A, bins = HIST_BINS) {
  const hist = new Array(bins).fill(0);
  for (const x of hits) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(x / a * bins)));
    hist[b]++;
  }
  return hist;
}
