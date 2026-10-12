// U-238 decay series (teaching chain — scaled relative activities).
export const CHAIN = [
  { id: 'u238', sym: '²³⁸U', mode: 'α', halfLife: 4.47e9, unit: 'y' },
  { id: 'th234', sym: '²³⁴Th', mode: 'β⁻', halfLife: 24.1, unit: 'd' },
  { id: 'pa234', sym: '²³⁴Pa', mode: 'β⁻', halfLife: 1.17, unit: 'min' },
  { id: 'u234', sym: '²³⁴U', mode: 'α', halfLife: 2.45e5, unit: 'y' },
  { id: 'th230', sym: '²³⁰Th', mode: 'α', halfLife: 7.54e4, unit: 'y' },
  { id: 'ra226', sym: '²²⁶Ra', mode: 'α', halfLife: 1600, unit: 'y' },
  { id: 'rn222', sym: '²²²Rn', mode: 'α', halfLife: 3.82, unit: 'd' },
  { id: 'pb210', sym: '²¹⁰Pb', mode: 'β⁻', halfLife: 22.3, unit: 'y' },
  { id: 'bi210', sym: '²¹⁰Bi', mode: 'β⁻', halfLife: 5.01, unit: 'd' },
  { id: 'po210', sym: '²¹⁰Po', mode: 'α', halfLife: 138, unit: 'd' },
  { id: 'pb206', sym: '²⁰⁶Pb', mode: 'stable', halfLife: Infinity, unit: '' },
];

export function activityRelative(tYears, index) {
  const node = CHAIN[index];
  if (!node || node.halfLife === Infinity) return index === CHAIN.length - 1 ? 1 : 0;
  const hl = node.halfLife * (node.unit === 'y' ? 1 : node.unit === 'd' ? 1 / 365 : 1 / (365 * 24 * 60));
  return Math.exp(-Math.log(2) * tYears / Math.max(hl, 1e-12));
}

export function secularEquilibriumActivity(tYears) {
  let sum = 0;
  for (let i = 0; i < CHAIN.length - 1; i++) sum += activityRelative(tYears, i) * 0.15;
  return sum;
}
