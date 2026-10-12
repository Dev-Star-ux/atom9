// Physics for Millikan's oil-drop experiment (Ch.1 Sec.1 — the electron).
//
// Tiny charged oil drops are suspended between capacitor plates. By balancing
// gravity against the electric force (qE = mg) Millikan found every drop's
// charge is a whole-number multiple of a single elementary charge e. We work in
// units of 10⁻¹⁹ C so numbers stay O(1).

export const E_TRUE = 1.602176634;         // elementary charge (×10⁻¹⁹ C)
export const OIL_DENSITY = 860;            // kg/m³
export const G = 9.81;
export const ETA_AIR = 1.81e-5;            // air viscosity (Pa·s)
export const PLATE_GAP = 5e-3;             // m

function randn() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

// Generate one drop: an integer number of electrons (1..8) → a measured charge
// (×10⁻¹⁹ C) with measurement noise.
export function makeDrop(noiseFrac = 0.03) {
  const n = 1 + Math.floor(Math.random() * 8);
  const radiusUm = 0.5 + Math.random() * 0.7;         // 0.5–1.2 µm
  const q = n * E_TRUE * (1 + noiseFrac * randn());
  return { n, q, radiusUm };
}

// Balance voltage that suspends a drop of the given radius (µm) and charge
// q (×10⁻¹⁹ C) across PLATE_GAP.  qE = mg,  E = V/d  →  V = m g d / q.
export function balanceVoltage(radiusUm, q19) {
  const r = radiusUm * 1e-6;
  const mass = (4 / 3) * Math.PI * r * r * r * OIL_DENSITY;
  const q = q19 * 1e-19;
  return (mass * G * PLATE_GAP) / q;                  // volts
}
