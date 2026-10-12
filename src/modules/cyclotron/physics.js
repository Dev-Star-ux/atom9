// Cyclotron: a charged particle in a uniform magnetic field moves in a circle
// whose orbital frequency is independent of speed/radius (non-relativistic) —
// so a fixed-frequency RF voltage across the dee gap stays in resonance as the
// particle spirals outward and gains energy each crossing.
export const PARTICLES = [
  { id: 'proton', name: 'Proton', m: 1.67262192e-27, q: 1.602176634e-19 },
  { id: 'deuteron', name: 'Deuteron', m: 3.3435837e-27, q: 1.602176634e-19 },
  { id: 'alpha', name: 'Alpha particle', m: 6.6446573e-27, q: 2 * 1.602176634e-19 },
  { id: 'electron', name: 'Electron', m: 9.1093837e-31, q: 1.602176634e-19 },
];

export function findParticle(id) {
  return PARTICLES.find(function (p) { return p.id === id; }) || PARTICLES[0];
}

// f = qB / (2*pi*m)
export function cyclotronFrequency(q, B, m) {
  return (q * B) / (2 * Math.PI * m);
}

// r = m*v / (q*B)
export function orbitRadius(m, v, q, B) {
  if (q === 0 || B === 0) return 0;
  return (m * v) / (q * B);
}

// Kinetic energy (non-relativistic) reached at radius r: E = (qBr)^2 / (2m)
export function energyAtRadius(q, B, r, m) {
  return Math.pow(q * B * r, 2) / (2 * m);
}

export function joulesToEV(J) {
  return J / 1.602176634e-19;
}

// --- Shared spiral-orbit / resonance model, used identically by the 2D and
// 3D scenes so the two views always agree on where the particle is. Radius
// is tracked in abstract "orbit units" (not metres) — physicalRadius() maps
// it to a real length for energy readouts.
export const ORBIT_R_START = 26;
export const ORBIT_R_MIN = 14;
export const ORBIT_R_MAX = 150;
export const ORBIT_ANGULAR_SPEED = 3.2; // rad/s, visual constant per revolution

export class OrbitSim {
  constructor() {
    this.ratio = 1.0;
    this.dee = 1.0;
    this.reset();
  }

  reset() {
    this.theta = 0;
    this.r = ORBIT_R_START;
    this.crossing = 0;
    this.lastQuadrant = 0;
    this.extracted = false;
  }

  setParams(p) {
    if (!p) return;
    if (p.ratio != null) this.ratio = p.ratio;
    if (p.dee != null) this.dee = p.dee;
    if (p.reset) this.reset();
  }

  snapshot() {
    return {
      theta: this.theta, r: this.r, crossing: this.crossing,
      lastQuadrant: this.lastQuadrant, extracted: this.extracted,
    };
  }

  applySnapshot(s) {
    if (!s) return;
    this.theta = s.theta; this.r = s.r; this.crossing = s.crossing;
    this.lastQuadrant = s.lastQuadrant; this.extracted = s.extracted;
  }

  // Advances the sim by dt seconds; returns the new (x,y) position (orbit
  // units) and whether a gap crossing (RF kick) happened this step, or null
  // once the beam has been extracted.
  step(dt, maxR) {
    const limit = maxR != null ? maxR : ORBIT_R_MAX;
    if (this.extracted) return null;
    this.theta += ORBIT_ANGULAR_SPEED * dt;
    const quadrant = Math.floor(this.theta / Math.PI);
    let crossed = false;
    let kick = 0;
    if (quadrant !== this.lastQuadrant) {
      this.lastQuadrant = quadrant;
      this.crossing += 1;
      crossed = true;
      const phaseError = Math.PI * (this.ratio - 1) * this.crossing;
      kick = this.dee * Math.cos(phaseError);
      this.r += kick * 6;
      this.r = Math.max(ORBIT_R_MIN, this.r);
    }
    if (this.r > limit) this.extracted = true;
    return {
      x: this.r * Math.cos(this.theta),
      y: this.r * Math.sin(this.theta),
      crossed, kick,
    };
  }
}

// Instantaneous RF dee-gap voltage (normalised -1..1, scaled by dee below),
// driven at ratio*f_c relative to the same theta clock as the orbit.
export function rfVoltagePhase(theta, ratio) {
  return Math.sin(theta * ratio);
}

// Maps an abstract orbit radius (ORBIT_R_MIN..ORBIT_R_MAX) to a physical
// radius in metres for energy readouts.
export function physicalRadius(r, maxRadiusM) {
  return (r / ORBIT_R_MAX) * maxRadiusM;
}
