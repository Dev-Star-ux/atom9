// X-ray discovery (Ch.2 §5). Duane–Hunt cutoff λ_min = hc/(eV).
export { HC_KEV_NM, lambdaMinNm } from '../xray/physics.js';

export function penetrationLabel(voltageKV) {
  return voltageKV > 60 ? 'high' : 'medium';
}
