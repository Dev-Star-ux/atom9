// The AI for the mass spectrometer: it identifies the ELEMENT from a noisy
// measured spectrum by pattern recognition. It compares the measurement to each
// element's known isotope fingerprint (cosine similarity) and turns the
// similarities into confidences with a softmax. Instant, offline, deterministic.
import { ELEMENT_NAMES, spectrumVector } from './physics.js';

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export class SpectrumClassifier {
  constructor() {
    // ideal (noise-free) fingerprint for each candidate element
    this.templates = ELEMENT_NAMES.map((name) => ({ name, vec: spectrumVector(name, { noise: 0 }) }));
  }

  // Returns [{ name, prob }] sorted by confidence (softmax over similarities).
  classify(observed, temperature = 12) {
    const sims = this.templates.map((t) => ({ name: t.name, sim: cosine(observed, t.vec) }));
    const exps = sims.map((s) => Math.exp(s.sim * temperature));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    return sims
      .map((s, i) => ({ name: s.name, prob: exps[i] / sum }))
      .sort((a, b) => b.prob - a.prob);
  }
}
