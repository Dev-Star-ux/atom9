/** Harmonic oscillator ẍ = −ω²x — compare explicit integrators. */

export const METHODS = [
  { id: 'euler', color: '#f87171', label: 'Euler' },
  { id: 'leapfrog', color: '#22d3ee', label: 'Leapfrog' },
  { id: 'rk4', color: '#fbbf24', label: 'RK4' },
];

export function accel(x, omega) {
  return -omega * omega * x;
}

export function exactSolution(t, x0, v0, omega) {
  const c = Math.cos(omega * t);
  const s = Math.sin(omega * t);
  return {
    x: x0 * c + (v0 / omega) * s,
    v: v0 * c - x0 * omega * s,
  };
}

export function energy(x, v, omega) {
  return 0.5 * (v * v + omega * omega * x * x);
}

export function stepEuler(state, dt, omega) {
  const a = accel(state.x, omega);
  return { x: state.x + dt * state.v, v: state.v + dt * a };
}

/** Velocity Verlet / leapfrog — symplectic, good long-time energy behaviour. */
export function stepLeapfrog(state, dt, omega) {
  const a = accel(state.x, omega);
  const vHalf = state.v + 0.5 * dt * a;
  const xNew = state.x + dt * vHalf;
  const aNew = accel(xNew, omega);
  return { x: xNew, v: vHalf + 0.5 * dt * aNew };
}

export function stepRK4(state, dt, omega) {
  const deriv = function (s) {
    return { dx: s.v, dv: accel(s.x, omega) };
  };
  const k1 = deriv(state);
  const s2 = { x: state.x + 0.5 * dt * k1.dx, v: state.v + 0.5 * dt * k1.dv };
  const k2 = deriv(s2);
  const s3 = { x: state.x + 0.5 * dt * k2.dx, v: state.v + 0.5 * dt * k2.dv };
  const k3 = deriv(s3);
  const s4 = { x: state.x + dt * k3.dx, v: state.v + dt * k3.dv };
  const k4 = deriv(s4);
  return {
    x: state.x + dt * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) / 6,
    v: state.v + dt * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv) / 6,
  };
}

export const STEPPERS = {
  euler: stepEuler,
  leapfrog: stepLeapfrog,
  rk4: stepRK4,
};

export function createIntegrators(x0, v0, omega) {
  const init = { x: x0, v: v0 };
  const out = {};
  for (const m of METHODS) {
    out[m.id] = {
      state: { x: init.x, v: init.v },
      trail: [{ x: init.x, v: init.v }],
      energy: energy(init.x, init.v, omega),
    };
  }
  return out;
}

export function advanceAll(integrators, dt, omega, maxTrail) {
  for (const m of METHODS) {
    const box = integrators[m.id];
    box.state = STEPPERS[m.id](box.state, dt, omega);
    box.trail.push({ x: box.state.x, v: box.state.v });
    if (box.trail.length > maxTrail) box.trail.shift();
    box.energy = energy(box.state.x, box.state.v, omega);
  }
}
