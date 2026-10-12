import { SPECIES, REACTIONS, getSpecies } from './reactionsData.js';

export const U_TO_MEV = 931.494;

export function massOf(id) {
  const s = getSpecies(id);
  return s ? s.mass : 0;
}

export function labelOf(id) {
  const s = getSpecies(id);
  return s ? s.label : id;
}

export function sumZA(ids) {
  let Z = 0;
  let A = 0;
  for (let i = 0; i < ids.length; i++) {
    const s = getSpecies(ids[i]);
    if (!s) continue;
    Z += s.Z;
    A += s.A;
  }
  return { Z: Z, A: A };
}

export function sumMass(ids) {
  let m = 0;
  for (let i = 0; i < ids.length; i++) m += massOf(ids[i]);
  return m;
}

/** Q-value (MeV) from mass defect, or override for fission teaching channels. */
export function qValueMeV(reaction) {
  if (reaction.qMeVOverride != null) return reaction.qMeVOverride;
  const left = [reaction.projectile, reaction.target];
  const mIn = sumMass(left);
  const mOut = sumMass(reaction.products);
  return (mIn - mOut) * U_TO_MEV;
}

/**
 * Approximate lab-frame threshold for endothermic reactions (non-relativistic).
 * Eth ≈ −Q (1 + m_projectile / m_target) when Q < 0; else 0.
 */
export function thresholdMeV(reaction) {
  if (reaction.thresholdMeV != null) return reaction.thresholdMeV;
  const Q = qValueMeV(reaction);
  if (Q >= 0) return 0;
  const mp = massOf(reaction.projectile);
  const mt = massOf(reaction.target);
  if (mt <= 0) return -Q;
  return -Q * (1 + mp / mt);
}

/** Energy available to products in CM-ish teaching sense: E_lab + Q (simplified). */
export function energyReleaseMeV(reaction, eLabMeV) {
  const Q = qValueMeV(reaction);
  return Q + (eLabMeV || 0);
}

export function conservationChecks(reaction) {
  const left = [reaction.projectile, reaction.target];
  const right = reaction.products || [];
  const inZA = sumZA(left);
  const outZA = sumZA(right);
  const dZ = inZA.Z - outZA.Z;
  const dA = inZA.A - outZA.A;
  // Photons and neutrons: A/Z accounting already in species table
  return {
    ZIn: inZA.Z,
    ZOut: outZA.Z,
    AIn: inZA.A,
    AOut: outZA.A,
    zOk: dZ === 0,
    aOk: dA === 0,
    dZ: dZ,
    dA: dA,
  };
}

export function isOpen(reaction, eLabMeV) {
  return (eLabMeV || 0) + 1e-9 >= thresholdMeV(reaction);
}

export function findReactions(projectileId, targetId) {
  const out = [];
  for (let i = 0; i < REACTIONS.length; i++) {
    const r = REACTIONS[i];
    if (r.projectile === projectileId && r.target === targetId) out.push(r);
  }
  return out;
}

export function analyzeReaction(reaction, eLabMeV) {
  const Q = qValueMeV(reaction);
  const Eth = thresholdMeV(reaction);
  const open = isOpen(reaction, eLabMeV);
  const Erel = energyReleaseMeV(reaction, eLabMeV);
  const cons = conservationChecks(reaction);
  const products = (reaction.products || []).map(function (id) {
    const s = getSpecies(id);
    return {
      id: id,
      label: s ? s.label : id,
      name: s ? s.name : id,
      Z: s ? s.Z : 0,
      A: s ? s.A : 0,
      color: s ? s.color : '#94a3b8',
    };
  });
  return {
    reaction: reaction,
    Q: Q,
    Eth: Eth,
    open: open,
    energyAvailable: Erel,
    conservation: cons,
    products: products,
    exoergic: Q > 0,
    endoergic: Q < 0,
  };
}

export function analyzePair(projectileId, targetId, eLabMeV) {
  const list = findReactions(projectileId, targetId);
  return list.map(function (r) { return analyzeReaction(r, eLabMeV); });
}

export { SPECIES, REACTIONS, getSpecies };
