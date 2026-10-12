// P-N junction diode: Shockley equation + simple rectifier models.
export const Q_CHARGE = 1.602176634e-19;
export const K_BOLTZ = 1.380649e-23;
export const IDEAL_VF = 0.65; // practical forward "knee" voltage used for the rectifier waveform demo

export function thermalVoltage(T) {
  return (K_BOLTZ * T) / Q_CHARGE;
}

// Shockley diode equation: I = Is*(exp(V/(n*Vt)) - 1)
export function diodeCurrent(V, Is, n, T) {
  const Vt = thermalVoltage(T);
  return Is * (Math.exp(V / (n * Vt)) - 1);
}

export function rectifiedHalfWave(vin) {
  return vin > IDEAL_VF ? vin - IDEAL_VF : 0;
}

// Full-wave (bridge): both halves of the AC cycle are folded up and clipped by the diode drop.
export function rectifiedFullWave(vin) {
  const a = Math.abs(vin);
  return a > IDEAL_VF ? a - IDEAL_VF : 0;
}

export function acSample(amplitude, freqHz, tSec) {
  return amplitude * Math.sin(2 * Math.PI * freqHz * tSec);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Depletion-region half-width as a 0..1 fraction of its maximum extent.
// Forward bias (Vbias > 0) injects majority carriers that neutralize the
// exposed dopant ions near the junction, so the depletion region SHRINKS
// as bias approaches the ~0.65 V conduction knee. Reverse bias pulls
// majority carriers further away, widening the depletion region toward
// its (clamped) maximum. Tuned so the -2..0.85 V slider range used by the
// UI produces a visually sensible shrink/grow across the whole span.
export function depletionWidthFrac(Vbias) {
  return clamp(0.5 - Vbias / 2.4, 0.08, 1);
}

// Describes carrier behavior at a given bias: whether majority carriers
// are actively diffusing across the (now-narrow) junction to make a real
// forward current, or blocked by the (now-wide) depletion field so only a
// tiny reverse minority-carrier leakage/drift current flows.
export function carrierState(Vbias) {
  const diffusing = Vbias > 0.3;
  const strength = diffusing ? clamp((Vbias - 0.3) / 0.55, 0, 1) : 0;
  return {
    forward: Vbias > 0.15,
    diffusing,
    strength,
    leakage: !diffusing,
  };
}
