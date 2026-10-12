/** Mechanical equilibrium: F = −∇V. Stable if V″>0, unstable if V″<0. */

export const G = 9.8;

export function potential(x, k, kind) {
  if (kind === 'unstable') return -0.5 * k * x * x;
  return 0.5 * k * x * x;
}

export function force(x, k, kind) {
  if (kind === 'unstable') return k * x;
  return -k * x;
}

export function curvature(k, kind) {
  return kind === 'unstable' ? -k : k;
}

export function statusLabel(x, v, kind) {
  if (kind === 'unstable') {
    if (Math.abs(x) < 0.04 && Math.abs(v) < 0.08) return 'balanced — but any nudge runs away';
    return 'runaway — displacement grows';
  }
  if (Math.abs(x) < 0.05 && Math.abs(v) < 0.12) return 'settled at the bottom';
  return 'oscillating about the minimum';
}

export function stepBall(ball, k, kind, damp, dt) {
  const a = force(ball.x, k, kind) - damp * ball.v;
  ball.v += a * dt;
  ball.x += ball.v * dt;
  if (kind === 'stable') {
    if (ball.x > 1.35) { ball.x = 1.35; ball.v *= -0.2; }
    if (ball.x < -1.35) { ball.x = -1.35; ball.v *= -0.2; }
  }
}

export function heightStable(r) {
  return 0.32 * r * r;
}

export function heightUnstable(r) {
  return 1.15 - 0.38 * r * r;
}
