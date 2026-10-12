// Clear 3D double-slit apparatus — mirrors 2D teaching: source → slits → waves → screen + I(y).
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel, dashedGuide, solidGuide } from '../common/sceneVisuals.js';
import { intensityProfile, Y_SPAN } from './physics.js';
import { freqToNm } from '../common/wavePhysics.js';

function nmToHex(nm) {
  // Approximate visible colour for teaching (matches 2D cyan–amber feel).
  if (nm < 420) return 0x8866ff;
  if (nm < 490) return 0x38bdf8;
  if (nm < 570) return 0x4ade80;
  if (nm < 590) return 0xfbbf24;
  if (nm < 650) return 0xfb923c;
  return 0xf87171;
}

function makeFringeTexture(freq, slitSep, distance) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const { ys, Is } = intensityProfile(freq, slitSep, distance, 128);
  let iMax = 1e-9;
  for (let i = 0; i < Is.length; i++) if (Is[i] > iMax) iMax = Is[i];
  const nm = freqToNm(freq);
  const hex = nmToHex(nm);
  const r0 = (hex >> 16) & 255;
  const g0 = (hex >> 8) & 255;
  const b0 = hex & 255;
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < ys.length; i++) {
    const t = (ys[i] + Y_SPAN) / (2 * Y_SPAN);
    const py = Math.floor((1 - t) * 255);
    const bright = Is[i] / iMax;
    const r = Math.floor(20 + r0 * bright);
    const g = Math.floor(20 + g0 * bright);
    const b = Math.floor(30 + b0 * bright);
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fillRect(8, py - 1, 48, 3);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

function makeIyTexture(freq, slitSep, distance) {
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 220;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(10,17,34,0.92)';
  ctx.fillRect(0, 0, 160, 220);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(1, 1, 158, 218);
  ctx.fillStyle = '#eaf0fb';
  ctx.font = '600 14px system-ui,sans-serif';
  ctx.fillText('I(y)', 12, 22);
  const { ys, Is, fringe } = intensityProfile(freq, slitSep, distance, 100);
  let iMax = 1e-9;
  for (let i = 0; i < Is.length; i++) if (Is[i] > iMax) iMax = Is[i];
  const left = 28;
  const right = 140;
  const top = 36;
  const bot = 190;
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(left, top, right - left, bot - top);
  ctx.beginPath();
  for (let i = 0; i < ys.length; i++) {
    const t = (ys[i] + Y_SPAN) / (2 * Y_SPAN);
    const py = top + (1 - t) * (bot - top);
    const px = left + (Is[i] / iMax) * (right - left) * 0.92;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#8092b4';
  ctx.font = '11px system-ui,sans-serif';
  if (fringe > 0) ctx.fillText('Δy ≈ ' + (fringe * 1e3).toFixed(2) + ' mm', 12, 210);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export class DoubleSlitScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 9, 12], target: [0.5, 0.4, 0], gridY: -2.2 });
    this.freq = 7;
    this.slitSep = 80;
    this.distance = 1;
    this.phase = 0;
    this._build();
  }

  _build() {
    // Optical bench base
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.15 })
    );
    bench.position.set(0.3, -1.55, 0);
    this.scene.add(bench);

    // Source (left)
    this.source = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    attachGlow(this.source, 0xfbbf24, 1.4);
    this.source.position.set(-4.6, 0, 0);
    this.tip(this.source, 'source');
    this.scene.add(this.source);
    this.scene.add(placeLabel('source', -4.6, -1.05, 0, '#fbbf24', 1.2));

    // Collimator / beam pipe hint
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 1.2, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide })
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-3.6, 0, 0);
    this.scene.add(pipe);

    // Barrier with two slit openings (composite)
    this.barrier = new THREE.Group();
    this.barrier.position.set(-1.2, 0, 0);
    this.tip(this.barrier, 'slits');
    this.scene.add(this.barrier);
    this.scene.add(placeLabel('double slit', -1.2, 2.15, 0, '#38bdf8', 1.25));

    this._barrierMat = new THREE.MeshStandardMaterial({
      color: 0x475569, metalness: 0.25, roughness: 0.45,
    });
    // Rebuild barrier pieces when slit gap changes
    this._slitMarks = [];

    // Incoming plane-wave guides (group of vertical lines)
    this.planeWaves = new THREE.Group();
    this.scene.add(this.planeWaves);
    for (let i = 0; i < 7; i++) {
      const g = solidGuide([
        new THREE.Vector3(-4.1, -0.7, 0),
        new THREE.Vector3(-4.1, 0.7, 0),
      ], 0xfbbf24, 0.35);
      this.planeWaves.add(g);
    }

    // Circular wavefronts from each slit
    this.waveGroup = new THREE.Group();
    this.scene.add(this.waveGroup);
    this.rings = [[], []];
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 8; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.018, 6, 48, Math.PI * 1.05),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
          })
        );
        ring.rotation.y = Math.PI / 2;
        ring.rotation.z = -Math.PI * 0.525;
        this.waveGroup.add(ring);
        this.rings[s].push(ring);
      }
    }

    // Maxima rays group
    this.maximaGroup = new THREE.Group();
    this.scene.add(this.maximaGroup);

    // Detection screen
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 3.6),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    this.screen.position.set(4.4, 0, 0);
    this.tip(this.screen, 'screen');
    this.scene.add(this.screen);
    this.scene.add(placeLabel('screen', 4.4, 2.15, 0, '#fbbf24', 1.2));

    // Fringe texture overlay on screen
    this.fringePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 3.4),
      new THREE.MeshBasicMaterial({ map: makeFringeTexture(7, 80, 1), transparent: true })
    );
    this.fringePlane.position.set(4.42, 0, 0.02);
    this.scene.add(this.fringePlane);

    // Soft screen frame
    this.screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.8, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.5 })
    );
    this.screenFrame.position.set(4.55, 0, 0);
    this.scene.add(this.screenFrame);

    // Floating I(y) panel (sprite)
    this.iySprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeIyTexture(7, 80, 1),
      transparent: true,
      depthTest: false,
    }));
    this.iySprite.position.set(6.35, 0.4, 0);
    this.iySprite.scale.set(2.6, 3.4, 1);
    this.scene.add(this.iySprite);

    // Path guides source → slits
    this.pathGuides = new THREE.Group();
    this.scene.add(this.pathGuides);

    this._rebuildBarrier();
    this._rebuildOptics();
  }

  _slitHalf() {
    return Math.max(0.22, Math.min(0.95, 0.18 + this.slitSep * 0.0045));
  }

  _rebuildBarrier() {
    while (this.barrier.children.length) this.barrier.remove(this.barrier.children[0]);
    this._slitMarks = [];
    const half = this._slitHalf();
    const slitH = 0.28;
    const topY = 1.55;
    const slitTop = half + slitH / 2;
    const slitBot = -half - slitH / 2;
    const slabs = [
      { cy: (topY + slitTop) / 2, h: topY - slitTop },
      { cy: 0, h: Math.max(0.06, 2 * half - slitH) },
      { cy: (-topY + slitBot) / 2, h: topY + slitBot },
    ];
    for (let i = 0; i < slabs.length; i++) {
      const p = slabs[i];
      if (p.h < 0.04) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, p.h, 1.6), this._barrierMat);
      m.position.y = p.cy;
      this.barrier.add(m);
    }
    for (let zi = 0; zi < 2; zi++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 0.12), this._barrierMat);
      wall.position.z = zi === 0 ? -0.85 : 0.85;
      this.barrier.add(wall);
    }
    for (let si = 0; si < 2; si++) {
      const sy = si === 0 ? half : -half;
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, slitH, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
      );
      mark.position.set(0.02, sy, 0);
      attachGlow(mark, 0x38bdf8, 0.9);
      this.barrier.add(mark);
      this._slitMarks.push(mark);
    }
  }

  _rebuildOptics() {
    const nm = freqToNm(this.freq);
    const col = nmToHex(nm);
    this.source.material.color.setHex(0xfbbf24);
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < this.rings[s].length; i++) {
        this.rings[s][i].material.color.setHex(col);
      }
    }
    for (let i = 0; i < this._slitMarks.length; i++) {
      this._slitMarks[i].material.color.setHex(col);
    }

    // Screen fringe + I(y)
    if (this.fringePlane.material.map) this.fringePlane.material.map.dispose();
    this.fringePlane.material.map = makeFringeTexture(this.freq, this.slitSep, this.distance);
    this.fringePlane.material.needsUpdate = true;
    if (this.iySprite.material.map) this.iySprite.material.map.dispose();
    this.iySprite.material.map = makeIyTexture(this.freq, this.slitSep, this.distance);
    this.iySprite.material.needsUpdate = true;

    // Screen distance scales slightly with L
    const sx = 2.2 + this.distance * 2.2;
    this.screen.position.x = sx;
    this.fringePlane.position.x = sx + 0.02;
    if (this.screenFrame) this.screenFrame.position.x = sx + 0.15;
    this.iySprite.position.x = sx + 2.0;

    // Maxima rays
    while (this.maximaGroup.children.length) this.maximaGroup.remove(this.maximaGroup.children[0]);
    const profile = intensityProfile(this.freq, this.slitSep, this.distance, 80);
    const half = this._slitHalf();
    const slitX = -1.2;
    if (profile.fringe > 0) {
      for (let m = -3; m <= 3; m++) {
        const y = (m * profile.fringe / Y_SPAN) * 1.55;
        if (Math.abs(y) > 1.7) continue;
        const line = dashedGuide([
          new THREE.Vector3(slitX, 0, 0),
          new THREE.Vector3(sx, y, 0),
        ], m === 0 ? 0xfbbf24 : 0xf59e0b, m === 0 ? 0.7 : 0.4);
        this.maximaGroup.add(line);
        if (m === 0 || Math.abs(m) === 1) {
          this.maximaGroup.add(placeLabel(
            'm=' + m,
            sx - 0.55,
            y + 0.15,
            0.2,
            '#fbbf24',
            0.95
          ));
        }
      }
    }

    // Paths from source to slits
    while (this.pathGuides.children.length) this.pathGuides.remove(this.pathGuides.children[0]);
    this.pathGuides.add(dashedGuide([
      new THREE.Vector3(-4.4, 0, 0),
      new THREE.Vector3(slitX, half, 0),
    ], 0x94a3b8, 0.45));
    this.pathGuides.add(dashedGuide([
      new THREE.Vector3(-4.4, 0, 0),
      new THREE.Vector3(slitX, -half, 0),
    ], 0x94a3b8, 0.45));

    // Position rings origins at slits
    for (let s = 0; s < 2; s++) {
      const sy = s === 0 ? half : -half;
      for (let i = 0; i < this.rings[s].length; i++) {
        this.rings[s][i].position.set(slitX, sy, 0);
      }
    }
  }

  setParams(p) {
    if (!p) return;
    let rebuildBarrier = false;
    if (p.freq != null) this.freq = p.freq;
    if (p.slitSep != null) {
      if (p.slitSep !== this.slitSep) rebuildBarrier = true;
      this.slitSep = p.slitSep;
    }
    if (p.distance != null) this.distance = p.distance;
    if (p.phase != null) this.phase = p.phase;
    if (rebuildBarrier) this._rebuildBarrier();
    this._rebuildOptics();
  }

  tick(dt) {
    this.phase = (this.phase + dt * 2.8) % (Math.PI * 2);
    const lamScale = Math.max(0.35, Math.min(1.1, freqToNm(this.freq) / 550));

    // Animate plane waves toward slits
    for (let i = 0; i < this.planeWaves.children.length; i++) {
      const g = this.planeWaves.children[i];
      const x = -4.15 + ((this.phase * 0.55 + i * 0.28) % 2.4);
      g.position.x = x + 4.1;
      g.material.opacity = 0.15 + 0.35 * (1 - (x + 4.15) / 2.4);
    }

    // Expanding rings from each slit
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < this.rings[s].length; i++) {
        const ring = this.rings[s][i];
        const span = 5.2;
        const r = 0.25 + ((this.phase * 1.4 * lamScale + i * (span / this.rings[s].length)) % span);
        ring.scale.set(r, r, r);
        ring.material.opacity = Math.max(0.05, 0.55 * (1 - r / span));
      }
    }
  }

  _bindTips() {
    const t = this._tipTexts;
    if (t.slits) this.barrier.userData.tip = t.slits;
    if (t.screen) this.screen.userData.tip = t.screen;
    if (t.source) this.source.userData.tip = t.source;
  }
}
