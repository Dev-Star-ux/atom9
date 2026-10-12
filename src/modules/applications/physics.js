// Photoelectric applications — PMT cascade & solar cell (Ch.2 §2).
import * as THREE from 'three';

export const DELTA_TRUE = 3.0;
export const CATHODE_X = -4.6;
export const ANODE_X = 4.4;

export function pmtGain(nDynodes, delta = DELTA_TRUE) {
  return Math.round(Math.max(2, Math.floor(delta)) ** nDynodes);
}

export function solarCurrentUA(intensity, current = 0, dt = 0.016) {
  const target = intensity;
  const next = current + (target - current) * Math.min(1, dt * 5);
  return { current: next, iUA: next * 0.4, powerUW: next * 0.4 * 0.5 };
}

/** 3D dynode positions — zigzag chain left → right. */
export function dynodePos3D(i, nDynodes) {
  const t = (i + 0.5) / Math.max(1, nDynodes);
  const x = -3.8 + t * 7.6;
  const y = (i % 2 === 0 ? -0.55 : 0.55) * (1.05 - t * 0.15);
  return new THREE.Vector3(x, y, 0);
}

export function anodePos() {
  return new THREE.Vector3(ANODE_X, 0, 0);
}

export function cathodePos() {
  return new THREE.Vector3(CATHODE_X, 0, 0);
}
