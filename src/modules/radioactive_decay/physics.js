// Radioactive decay: N = N0 e^(-λt), T½ = ln(2)/λ. Activity A = λN.
// Individual nuclei decay randomly; large samples use a binomial step.

export function decayConstantFromHalfLife(halfLife) {
  if (halfLife <= 0) return 0;
  return Math.LN2 / halfLife;
}

export function remainingFraction(t, halfLife) {
  const lam = decayConstantFromHalfLife(halfLife);
  return Math.exp(-lam * t);
}

export function remainingCount(n0, t, halfLife) {
  return n0 * remainingFraction(t, halfLife);
}

export function activity(n, halfLife) {
  return decayConstantFromHalfLife(halfLife) * n;
}

export function halfLivesElapsed(t, halfLife) {
  if (halfLife <= 0) return 0;
  return t / halfLife;
}

export function plainDecay(frac) {
  if (frac > 0.75) return 'Most of the sample is still radioactive';
  if (frac > 0.45) return 'About half the nuclei have decayed (near one half-life)';
  if (frac > 0.2) return 'Only a quarter or less remain — several half-lives passed';
  return 'Almost gone — many half-lives passed';
}

/**
 * How many of `alive` nuclei decay in dt, each with probability p = 1−e^(−λdt).
 * Exact Bernoulli for small N; normal approximation for large N (keeps statistical noise).
 */
export function binomialDecayed(alive, p) {
  if (alive <= 0 || p <= 0) return 0;
  if (p >= 1) return alive;
  if (alive <= 2500) {
    let died = 0;
    for (let i = 0; i < alive; i++) {
      if (Math.random() < p) died++;
    }
    return died;
  }
  const mean = alive * p;
  const sd = Math.sqrt(alive * p * (1 - p));
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.min(alive, Math.round(mean + sd * z)));
}

/** Suggested N₀ chips for the lab. */
export const N0_PRESETS = [100, 500, 1000, 5000, 10000];

/**
 * Teaching isotopes.
 * halfLife = lab-clock seconds (for animation).
 * halfLifeReal = physical half-life shown to students.
 */
export const ISOTOPES = [
  { id: 'c14', name: 'Carbon-14', halfLife: 12.0, halfLifeReal: '5,730 y', decay: 'β⁻' },
  { id: 'i131', name: 'Iodine-131', halfLife: 8.0, halfLifeReal: '8.02 d', decay: 'β⁻' },
  { id: 'rn222', name: 'Radon-222', halfLife: 4.0, halfLifeReal: '3.82 d', decay: 'α' },
  { id: 'co60', name: 'Cobalt-60', halfLife: 10.0, halfLifeReal: '5.27 y', decay: 'β⁻' },
  { id: 'u238', name: 'Uranium-238', halfLife: 22.0, halfLifeReal: '4.468×10⁹ y', decay: 'α' },
];

export function getIsotope(id) {
  for (let i = 0; i < ISOTOPES.length; i++) {
    if (ISOTOPES[i].id === id) return ISOTOPES[i];
  }
  return ISOTOPES[0];
}
