// CRT oscilloscope: a horizontal time-base (sawtooth sweep) moves the spot
// left-to-right while the vertical plates deflect it by the input signal —
// tracing y(t) vs x(t). In X-Y (Lissajous) mode the sweep is disabled and two
// AC signals drive the horizontal and vertical plates directly.
//
// This file also holds a small phosphor-persistence trail model shared by
// the 2D canvas trace and the 3D phosphor-screen texture, so both views
// agree on exactly where the beam is and how the glow fades.
export function sawtoothPhase(tSec, sweepHz) {
  const period = 1 / Math.max(1e-6, sweepHz);
  return (tSec % period) / period; // 0..1
}

/** Unit waveform in -1..1, then scaled by amp. shape: sine | square | triangle | sawtooth | pulse. */
export function waveSample(shape, amp, freqHz, tSec, phaseRad) {
  let u = freqHz * tSec + (phaseRad || 0) / (2 * Math.PI);
  u = u - Math.floor(u);
  if (u < 0) u += 1;
  let v;
  if (shape === 'square') {
    v = u < 0.5 ? 1 : -1;
  } else if (shape === 'triangle') {
    v = u < 0.5 ? 4 * u - 1 : 3 - 4 * u;
  } else if (shape === 'sawtooth') {
    v = 2 * u - 1;
  } else if (shape === 'pulse') {
    v = u < 0.15 ? 1 : -0.2;
  } else {
    v = Math.sin(2 * Math.PI * u);
  }
  return amp * v;
}

export function sineSample(amp, freqHz, tSec, phaseRad) {
  return waveSample('sine', amp, freqHz, tSec, phaseRad);
}

/**
 * Beam position in normalized screen coordinates (-1..1) at simulation
 * time tSec, for the current instrument state. Shared by the 2D trace,
 * the 2D schematic strip and the 3D phosphor-screen texture.
 */
export function beamXY(state, tSec) {
  const shape = state.wave || 'sine';
  if (state.view === 'sweep') {
    const frac = sawtoothPhase(tSec, state.sweepHz);
    const x = frac * 2 - 1;
    const y = waveSample(shape, state.vAmp, state.vFreq, tSec) / 5; // vAmp maxes at 5 V
    return { x, y: Math.max(-1, Math.min(1, y)) };
  }
  const x = waveSample(shape, 1, state.fx, tSec, 0);
  const y = waveSample(shape, 1, state.fy, tSec, (state.phaseDeg || 0) * Math.PI / 180);
  return { x, y };
}

/**
 * How long a lit phosphor point should stay visible before fully decaying,
 * in simulation seconds. Sweep: a bit more than one full sweep period, so
 * a slow sweep visibly shows the spot outrunning the fading trace behind
 * it. X-Y: long enough to keep several signal periods on screen so closed
 * Lissajous loops read as closed loops rather than a single racing dot.
 */
export function persistenceS(state) {
  if (state.view === 'sweep') return (1 / Math.max(0.05, state.sweepHz)) * 1.35;
  const px = 1 / Math.max(0.5, state.fx);
  const py = 1 / Math.max(0.5, state.fy);
  return Math.min(4, Math.max(px, py) * 3.2);
}

const SAMPLE_HZ = 220; // fixed simulation sampling rate for the phosphor trail
const MAX_POINTS = 4000;

/**
 * A small ring-buffer of recently-lit phosphor points, decoupled from
 * frame rate. Call advance() once per animation frame with the current
 * simulation clock (seconds); it returns { spot, persist } and leaves the
 * decaying trail in .points as { x, y, t } (screen-normalized -1..1,
 * newest last, t = the simulation time it was sampled).
 */
export class PhosphorTrail {
  constructor() {
    this.points = [];
    this._lastT = null;
  }

  reset() {
    this.points = [];
    this._lastT = null;
  }

  advance(state, tSec) {
    if (this._lastT == null) this._lastT = tSec;
    let dt = tSec - this._lastT;
    if (dt < 0 || dt > 0.5) dt = 1 / 60; // clock jump (resize/tab switch) — resync gently
    const step = 1 / SAMPLE_HZ;
    const n = Math.min(40, Math.max(1, Math.round(dt / step)));
    for (let i = 1; i <= n; i++) {
      const t = this._lastT + (dt * i) / n;
      const p = beamXY(state, t);
      this.points.push({ x: p.x, y: p.y, t });
    }
    this._lastT = tSec;

    const persist = persistenceS(state);
    const cutoff = tSec - persist;
    while (this.points.length && this.points[0].t < cutoff) this.points.shift();
    if (this.points.length > MAX_POINTS) this.points.splice(0, this.points.length - MAX_POINTS);

    return {
      persist,
      spot: this.points.length ? this.points[this.points.length - 1] : beamXY(state, tSec),
    };
  }
}
