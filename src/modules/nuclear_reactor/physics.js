// Educational PWR model — Dalton NRS / IAEA-style teaching plant.
// https://dalton-nrs.manchester.ac.uk/
// Simplified: control rods + coolant flow → fission power, heat, electric output.

export const P_RATED_MW = 1000;
export const T_NOMINAL_C = 320;
export const T_MAX_C = 420;

/**
 * @param {{ rodInsertion: number, coolantFlow: number, demandMw: number, powerMw?: number, tempC?: number }} s
 * rodInsertion: 0 = withdrawn (full power capability), 1 = fully inserted (scram)
 * coolantFlow: 0…100 %
 */
export function stepReactor(s, dt) {
  const rod = clamp(s.rodInsertion, 0, 1);
  const flow = clamp(s.coolantFlow, 0, 100) / 100;
  const demand = Math.max(0, s.demandMw);

  // Target thermal power: rods set reactivity ceiling; flow needed to unload heat.
  const rodAvail = Math.pow(1 - rod, 1.35);
  const flowAvail = 0.18 + 0.82 * flow;
  const targetThermal = P_RATED_MW * rodAvail * flowAvail;

  let power = s.powerMw != null ? s.powerMw : targetThermal * 0.4;
  // First-order approach (delayed neutrons / plant inertia feel)
  const tau = 2.2;
  power += (targetThermal - power) * (1 - Math.exp(-dt / tau));
  power = Math.max(0, power);

  // Core temperature: heat in vs coolant out
  let temp = s.tempC != null ? s.tempC : T_NOMINAL_C;
  const heatIn = power / P_RATED_MW;
  const heatOut = flow * (0.35 + 0.65 * (power / (P_RATED_MW + 1e-6)));
  temp += (heatIn - heatOut) * 28 * dt;
  temp += (T_NOMINAL_C - temp) * 0.08 * dt;
  temp = clamp(temp, 80, T_MAX_C + 40);

  // Temperature feedback reduces power slightly when hot
  if (temp > T_NOMINAL_C) {
    const over = (temp - T_NOMINAL_C) / 80;
    power *= Math.max(0.55, 1 - 0.22 * over);
  }

  const trip = temp >= T_MAX_C;
  if (trip) power *= 0.15;

  // Electric output ≈ thermal × efficiency × steam quality (flow)
  const eta = 0.33 * (0.55 + 0.45 * flow);
  const electric = power * eta;
  const match = demand > 1 ? clamp(1 - Math.abs(electric - demand) / demand, 0, 1) : 0;

  return {
    powerMw: power,
    thermalMw: power,
    electricMw: electric,
    tempC: temp,
    trip: trip,
    match: match,
    criticality: rodAvail,
  };
}

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

/** Steady-ish electric MW for given rods & flow (for AI / charts). */
export function predictElectricMw(rodInsertion, coolantFlow) {
  const s = stepReactor({
    rodInsertion: rodInsertion,
    coolantFlow: coolantFlow,
    demandMw: P_RATED_MW * 0.3,
    powerMw: P_RATED_MW * 0.5,
    tempC: T_NOMINAL_C,
  }, 8);
  return s.electricMw;
}

export function statusLabel(out) {
  if (out.trip) return 'trip';
  if (out.criticality < 0.08) return 'shutdown';
  if (out.electricMw < 40) return 'low';
  if (out.tempC > T_NOMINAL_C + 40) return 'hot';
  return 'ok';
}
