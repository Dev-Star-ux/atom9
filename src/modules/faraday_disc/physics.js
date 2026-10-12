/** Faraday disc dynamo — rotating disc in axial B, radial EMF. */

/** ε = (1/2) B ω R²  (SI teaching form). */
export function emf(B, omega, R) {
  return 0.5 * B * omega * R * R;
}

/** I = ε / R_load */
export function current(B, omega, R, Rload) {
  const Rl = Math.max(Rload, 1e-9);
  return emf(B, omega, R) / Rl;
}

/** Convert RPM to rad/s. */
export function rpmToOmega(rpm) {
  return (rpm * 2 * Math.PI) / 60;
}

/** Sample ε vs ω for the plot. */
export function emfVsOmega(B, R, omegaMax, n) {
  const N = n || 80;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const w = (i / N) * omegaMax;
    pts.push({ omega: w, emf: emf(B, w, R) });
  }
  return pts;
}
