// Physics for Thomson's cathode-ray tube (Ch.1 Sec.1, Topic 1).
//
// An electron is accelerated through a voltage V_acc, then passes between
// deflection plates (electric field, deflects UP) and through a magnetic field
// (deflects DOWN). Thomson balanced the two (velocity selector, v = E/B) and
// combined measurements to obtain the charge-to-mass ratio e/m.
//
// Small-angle model (all SI units, deflections in metres):
//   v      = sqrt(2 (e/m) V_acc)
//   Y_E    = (e/m) (V_d/d) (L / v²) (L/2 + L2)      electric deflection at screen
//   Y_B    = (e/m) B (L / v) (L/2 + L2)             magnetic deflection at screen
//   net    = Y_E − Y_B          (balanced when v = (V_d/d)/B = E/B)

export const EM_TRUE = 1.75882e11;   // true electron e/m (C/kg)

// Apparatus geometry (metres) — chosen to give centimetre-scale deflections.
export const GEO = {
  L: 0.05,    // deflection-plate length
  d: 0.02,    // plate gap
  L2: 0.20,   // plates-to-screen drift length
};

export function speed(Vacc, em = EM_TRUE) {
  return Math.sqrt(2 * em * Vacc);
}

// Electric deflection at the screen (metres).
export function deflectionE(Vd, Vacc, em = EM_TRUE) {
  const v = speed(Vacc, em);
  return em * (Vd / GEO.d) * (GEO.L / (v * v)) * (GEO.L / 2 + GEO.L2);
}

// Magnetic deflection at the screen (metres). Depends on √(e/m) at fixed V_acc.
export function deflectionB(B, Vacc, em = EM_TRUE) {
  const v = speed(Vacc, em);
  return em * B * (GEO.L / v) * (GEO.L / 2 + GEO.L2);
}

// Net vertical deflection (E up minus B down).
export function netDeflection(Vd, B, Vacc, em = EM_TRUE) {
  return deflectionE(Vd, Vacc, em) - deflectionB(B, Vacc, em);
}

// Magnetic field that balances the electric deflection (velocity selector).
export function balanceB(Vd, Vacc, em = EM_TRUE) {
  const v = speed(Vacc, em);
  return (Vd / GEO.d) / v;      // from E = vB  →  B = E/v
}

// Deflection at plate exit (for drawing the beam's kink), metres.
export function deflectionAtPlateExit(Vd, B, Vacc, em = EM_TRUE) {
  const v = speed(Vacc, em);
  const aE = em * (Vd / GEO.d);
  const aB = em * B * v;          // magnetic transverse accel ≈ (e/m) v B
  const aNet = aE - aB;
  const t = GEO.L / v;
  return 0.5 * aNet * t * t;
}

// True e/m extraction the way Thomson did it: balance to get v = E/B, then use
// the electric deflection. Returns e/m (C/kg). (Used to sanity-check the AI.)
export function measureEM({ Vd, Vacc, Bbalance, Ye }) {
  const v = (Vd / GEO.d) / Bbalance;                 // velocity selector
  return (Ye * v * v * GEO.d) / (Vd * GEO.L * (GEO.L / 2 + GEO.L2));
}
