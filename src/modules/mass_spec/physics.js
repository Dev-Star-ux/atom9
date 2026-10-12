// Physics for the mass spectrometer (Ch.1 Sec.1). Ions are accelerated through
// a voltage, then bent by a magnetic field into a circle of radius
//     r = (1/B)·√(2 m V / q)     ⇒   r ∝ √(m/q)
// so different masses land at different positions — the mass spectrum. Each
// element has a characteristic isotope pattern (masses + natural abundances),
// its "fingerprint".

export const ELEMENTS = {
  'Boron (B)':      [{ m: 10, ab: 0.199 }, { m: 11, ab: 0.801 }],
  'Neon (Ne)':      [{ m: 20, ab: 0.9048 }, { m: 21, ab: 0.0027 }, { m: 22, ab: 0.0925 }],
  'Chlorine (Cl)':  [{ m: 35, ab: 0.7576 }, { m: 37, ab: 0.2424 }],
  'Bromine (Br)':   [{ m: 79, ab: 0.5069 }, { m: 81, ab: 0.4931 }],
  'Magnesium (Mg)': [{ m: 24, ab: 0.79 }, { m: 25, ab: 0.10 }, { m: 26, ab: 0.11 }],
};
export const ELEMENT_NAMES = Object.keys(ELEMENTS);

export const M_MIN = 6, M_MAX = 86, BINS = 80;

// Radius (arbitrary units) for a singly-charged ion of mass m (amu).
export function radius(m, V = 2000, B = 1) { return Math.sqrt(2 * m * V) / B; }

// Build a binned spectrum vector for an element (ideal or noisy/broadened).
export function spectrumVector(name, { noise = 0, broaden = 0.9 } = {}) {
  const v = new Float32Array(BINS);
  const isos = ELEMENTS[name];
  for (const iso of isos) {
    const center = (iso.m - M_MIN) / (M_MAX - M_MIN) * (BINS - 1);
    for (let b = 0; b < BINS; b++) {
      const d = b - center;
      v[b] += iso.ab * Math.exp(-(d * d) / (2 * broaden * broaden));
    }
  }
  if (noise > 0) for (let b = 0; b < BINS; b++) v[b] = Math.max(0, v[b] + noise * (Math.random() - 0.5));
  // normalise to unit peak
  const mx = Math.max(...v) || 1;
  for (let b = 0; b < BINS; b++) v[b] /= mx;
  return v;
}

export function binToMass(b) { return M_MIN + (M_MAX - M_MIN) * b / (BINS - 1); }
