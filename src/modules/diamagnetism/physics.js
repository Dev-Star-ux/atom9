// Diamagnetism: an applied field induces atomic currents (Lenz's law at the
// electron-orbit scale) that create a magnetic moment opposing the field, so
// chi (magnetic susceptibility) is small and negative. In a field gradient
// this produces a weak repulsive force, F/V = (chi/mu0)*B*(dB/dz).
export const MU0 = 4 * Math.PI * 1e-7;

export const MATERIALS = [
  { id: 'bismuth', name: 'Bismuth', chi: -1.66e-4, type: 'diamagnetic' },
  { id: 'graphite', name: 'Pyrolytic graphite', chi: -4.0e-4, type: 'diamagnetic' },
  { id: 'water', name: 'Water', chi: -9.05e-6, type: 'diamagnetic' },
  { id: 'copper', name: 'Copper', chi: -9.8e-6, type: 'diamagnetic' },
  { id: 'aluminum', name: 'Aluminum', chi: 2.2e-5, type: 'paramagnetic' },
];

export function findMaterial(id) {
  return MATERIALS.find(function (m) { return m.id === id; }) || MATERIALS[0];
}

export function forcePerVolume(chi, B, dBdz) {
  return (chi / MU0) * B * dBdz;
}

// ── Levitation equilibrium model ──────────────────────────────────
// Near a magnet pole the field falls off roughly exponentially with height:
// B(z) = B0*exp(-z/L). Matching dB/dz at the surface to the slider's dBdz
// value gives a self-consistent decay length L = B0/dBdz, so both sliders
// jointly set how tightly the field is confined near the pole face.
export function decayLength(B, dBdz) {
  const raw = dBdz > 1e-6 ? Math.abs(B) / Math.abs(dBdz) : 0.05;
  return Math.min(0.15, Math.max(0.015, raw));
}

// Signed force per volume at height z (m) above the pole face: positive
// pushes the sample up/away (diamagnetic, chi<0), negative pulls it down
// toward the magnet (paramagnetic, chi>0). Magnitude decays with height
// following B(z)*dB/dz(z) ~ exp(-2z/L).
export function localForcePerVolume(chi, B, dBdz, z) {
  const L = decayLength(B, dBdz);
  const F0 = (Math.abs(chi) / MU0) * B * B / L;
  const dir = chi < 0 ? 1 : -1;
  return dir * F0 * Math.exp((-2 * Math.max(0, z)) / L);
}

// Effective weight-per-volume of a small tabletop sample (a schematic
// constant, not a literal material density*g — it is tuned so that a
// strong diamagnetic sample like bismuth or graphite visibly levitates at
// realistic slider settings, mirroring the real bench-top demonstrations).
export const SAMPLE_WEIGHT = 1000;

/** Stable equilibrium height (m) for a diamagnetic sample, or 0 if the
 *  magnetic repulsion never exceeds the sample's weight (settles on the
 *  magnet) — also 0 for paramagnetic/non-diamagnetic materials, which have
 *  no stable levitation point and are simply pulled down onto the magnet. */
export function equilibriumHeight(chi, B, dBdz, weight) {
  if (weight == null) weight = SAMPLE_WEIGHT;
  if (chi >= 0) return 0;
  const L = decayLength(B, dBdz);
  const F0 = (Math.abs(chi) / MU0) * B * B / L;
  if (F0 <= weight) return 0;
  return (L / 2) * Math.log(F0 / weight);
}
