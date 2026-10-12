// Diffusion cloud chamber — teaching model (Wilson / classroom demo style).
// Alphas leave white condensation trails on a dark cold plate. Most go straight
// (atom is empty); rare Rutherford kicks bend a track. Elevated scatter rate
// (~3–4 of ~40) so students can see it; historical large-angle rate is ~1/8000.

export const COL_THROUGH = '#e8f0ff';
export const COL_WIDE = '#fbbf24';
export const COL_BACK = '#f87171';
export const N_NUCLEI = 1;
export const MAX_TRACKS = 36;
export const BATCH_SIZE = 40;
export const MAX_LIVE = 10;

export const SIM_W = 760;
export const SIM_H = 460;

export function chamberGeom(w, h) {
  if (w == null) w = SIM_W;
  if (h == null) h = SIM_H;
  return { w: w, h: h, sb: h - 16, fx: w * 0.42, srcX: 28 };
}

export function makeNuclei(w, h) {
  if (w == null) w = SIM_W;
  if (h == null) h = SIM_H;
  return [[w * 0.42, h * 0.5]];
}

/** Map sim pixels → Three.js (chamber floor centred at origin). */
export function simToScene(sx, sy, z) {
  if (z == null) z = 0;
  return {
    x: (sx - SIM_W / 2) * (18 / SIM_W),
    y: z,
    z: (sy - SIM_H / 2) * (11 / SIM_H),
  };
}

export function classifyTrack(vx, vy) {
  const speed = Math.hypot(vx, vy) || 1;
  const theta = Math.acos(Math.max(-1, Math.min(1, vx / speed))) * (180 / Math.PI);
  if (theta < 12) return { kind: 'through', color: COL_THROUGH, theta: theta };
  if (theta <= 90) return { kind: 'wide', color: COL_WIDE, theta: theta };
  return { kind: 'back', color: COL_BACK, theta: theta };
}

/**
 * Historical large-angle rate ~1/8000. Teaching rate ≈ 1/12 at Au, E=55
 * → about 3–4 scatters in a batch of ~40.
 */
export function scatterProbability(Z, energy) {
  const z = Math.max(10, Z);
  const e = Math.max(20, energy);
  const pRef = 1 / 12;
  return Math.min(0.22, pRef * Math.pow(z / 79, 2) * (55 / e));
}

export function pickScatterDeflection(Z, energy) {
  const z = Math.max(10, Z);
  const e = Math.max(20, energy);
  const pBack = Math.min(0.35, 0.18 * (z / 79) * (55 / e));
  const sign = Math.random() < 0.5 ? 1 : -1;
  const deg = Math.random() < pBack
    ? 95 + Math.random() * 75
    : 20 + Math.random() * 60;
  return sign * deg * (Math.PI / 180);
}

export function spawnAlpha(energy, opts) {
  const g = chamberGeom();
  const laneCount = 6;
  const lane = opts && opts.lane != null
    ? opts.lane % laneCount
    : Math.floor(Math.random() * laneCount);
  const mid = g.h * 0.5;
  const span = g.h * 0.38;
  const y = mid - span / 2 + (lane + 0.5) * (span / laneCount) + (Math.random() - 0.5) * 6;
  // Range shortens slightly at lower energy (classroom alpha tracks are short)
  const range = 220 + energy * 2.2 + Math.random() * 40;
  const v0 = 95 + energy * 1.4;
  return {
    x: g.srcX,
    y: y,
    vx: v0,
    vy: (Math.random() - 0.5) * 2,
    energy: energy,
    rangeLeft: range,
    pts: [g.srcX, y],
    scatterDecided: false,
    willScatter: false,
    scattered: false,
    scatterAngle: 0,
    kink: null,
  };
}

export function stepAlpha(a, nuclei, zcharge, dt) {
  void nuclei;
  if (dt == null) dt = 0.04;
  const g = chamberGeom();
  const E = a.energy != null ? a.energy : 55;

  if (!a.scatterDecided && a.x >= g.fx - 40) {
    a.scatterDecided = true;
    if (Math.random() < scatterProbability(zcharge, E)) {
      a.willScatter = true;
      a.scatterAngle = pickScatterDeflection(zcharge, E);
    }
  }

  if (a.willScatter && !a.scattered && a.x >= g.fx) {
    a.scattered = true;
    a.kink = { x: a.x, y: a.y };
    const speed = Math.hypot(a.vx, a.vy) || 1;
    const ang0 = Math.atan2(a.vy, a.vx);
    const ang1 = ang0 + a.scatterAngle;
    a.vx = speed * Math.cos(ang1);
    a.vy = speed * Math.sin(ang1);
  }

  const speed = Math.hypot(a.vx, a.vy) || 1;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  a.rangeLeft -= speed * dt;
  a.pts.push(a.x, a.y);
}

export function alphaAlive(a) {
  const g = chamberGeom();
  if (a.rangeLeft <= 0) return false;
  if (a.x < -10 || a.x > g.w + 10) return false;
  if (a.y < 8 || a.y > g.sb) return false;
  return true;
}

export function backscatterFraction(Z, energy) {
  const z = Math.max(10, Z);
  const e = Math.max(20, energy);
  const pScatter = scatterProbability(z, e);
  const pBackGiven = Math.min(0.35, 0.18 * (z / 79) * (55 / e));
  return pScatter * pBackGiven;
}

export function simulateCounts(Z, energy, n) {
  if (n == null) n = 400;
  let through = 0;
  let wide = 0;
  let back = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() >= scatterProbability(Z, energy)) {
      through++;
      continue;
    }
    const deg = Math.abs(pickScatterDeflection(Z, energy)) * (180 / Math.PI);
    if (deg > 90) back++;
    else wide++;
  }
  return { total: n, through: through, wide: wide, back: back, fracBack: back / n };
}

/** Shared sim used by 2D top-down view and 3D chamber. */
export class ChamberSim {
  constructor() {
    this.energy = 55;
    this.zcharge = 79;
    this.persist = true;
    this.autoEmit = true;
    this.colorCode = true;
    this.nuclei = makeNuclei();
    this.alphas = [];
    this.tracks = [];
    this.counts = { total: 0, through: 0, wide: 0, back: 0 };
    this._burstLeft = 0;
    this._emitAcc = 0;
    this._lane = 0;
    this.flashes = []; // {x,y,life} nucleus flash at kink
  }

  setParams(p) {
    if (!p) return;
    if (p.energy != null) this.energy = p.energy;
    if (p.zcharge != null) this.zcharge = p.zcharge;
    if (p.persist != null) this.persist = !!p.persist;
    if (p.autoEmit != null) this.autoEmit = !!p.autoEmit;
    if (p.colorCode != null) this.colorCode = !!p.colorCode;
  }

  fireBatch(n) {
    this._burstLeft += n != null ? n : BATCH_SIZE;
  }

  clear() {
    this.alphas = [];
    this.tracks = [];
    this.flashes = [];
    this._burstLeft = 0;
    this.counts = { total: 0, through: 0, wide: 0, back: 0 };
  }

  _spawn() {
    this.alphas.push(spawnAlpha(this.energy, { lane: this._lane++ }));
  }

  tick(dt) {
    if (dt == null) dt = 0.04;
    this._emitAcc += dt;
    // Real demo: roughly one track per second; batches queue extra
    const rate = 0.55;
    while (this._emitAcc >= rate && this.alphas.length < MAX_LIVE) {
      this._emitAcc -= rate;
      if (this._burstLeft > 0) {
        this._burstLeft--;
        this._spawn();
      } else if (this.autoEmit) {
        this._spawn();
      }
    }

    for (let i = this.alphas.length - 1; i >= 0; i--) {
      const a = this.alphas[i];
      const wasScattered = a.scattered;
      stepAlpha(a, this.nuclei, this.zcharge, dt);
      if (a.scattered && !wasScattered && a.kink) {
        this.flashes.push({ x: a.kink.x, y: a.kink.y, life: 1.2 });
      }
      if (!alphaAlive(a)) {
        this._finish(a);
        this.alphas.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life -= dt;
      if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }

    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      tr.life -= dt;
      if (tr.life <= 0) this.tracks.splice(i, 1);
    }
  }

  _finish(a) {
    const cls = classifyTrack(a.vx, a.vy);
    this.counts.total++;
    this.counts[cls.kind]++;
    const life = this.persist
      ? (cls.kind === 'through' ? 6 : 14)
      : (cls.kind === 'through' ? 2.2 : 5);
    this.tracks.push({
      pts: a.pts.slice(),
      kind: cls.kind,
      color: cls.color,
      theta: cls.theta,
      kink: a.kink,
      life: life,
      max: life,
    });
    while (this.tracks.length > MAX_TRACKS) {
      let drop = 0;
      for (let i = 0; i < this.tracks.length; i++) {
        if (this.tracks[i].kind === 'through') {
          drop = i;
          break;
        }
      }
      this.tracks.splice(drop, 1);
    }
  }
}
