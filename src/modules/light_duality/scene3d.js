// 3D wave–particle duality — lookang double-slit apparatus:
// source → slits → wave / photon hits / which-path detectors → screen.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';
import {
  freqToNm,
  photonColor,
  photonRgb,
  hitProbability,
} from './physics.js';

function rgbToHex(rgb) {
  const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
  const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
  const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
  return (r << 16) | (g << 8) | b;
}

function makeScreenTexture(mode, freq, slitSep, hits) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const rgb = photonRgb(freq);
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, 64, 256);

  // Theory strip
  for (let i = 0; i < 256; i++) {
    const yNorm = 1 - (2 * i) / 255;
    const p = hitProbability(yNorm, mode, freq, slitSep);
    const r = Math.floor(18 + rgb[0] * 220 * p);
    const g = Math.floor(18 + rgb[1] * 220 * p);
    const b = Math.floor(28 + rgb[2] * 220 * p);
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fillRect(8, i, 48, 1);
  }

  // Overlay discrete hits
  if (hits && hits.length) {
    for (let i = 0; i < hits.length; i++) {
      const yNorm = hits[i];
      const py = Math.floor((1 - (yNorm + 1) / 2) * 255);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(20, py - 1, 24, 2);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export class LightDualityScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 7, 14], target: [0.2, 0.2, 0], gridY: -2 });
    this.mode = 'wave';
    this.freq = 7;
    this.intensity = 60;
    this.slitSep = 80;
    this.phase = 0;
    this._hitYs = [];
    this._hitMeshes = [];
    this._flyers = [];
    this._build();
  }

  _build() {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.1, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.1 })
    );
    bench.position.set(0.2, -1.5, 0);
    this.scene.add(bench);

    this.source = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    attachGlow(this.source, 0xfbbf24, 1.3);
    this.source.position.set(-4.5, 0, 0);
    this.tip(this.source, 'source');
    this.scene.add(this.source);
    this.scene.add(placeLabel('source', -4.5, -1.0, 0, '#fbbf24', 1.1));

    // Barrier plate with two slit holes (visual gaps via thinner slabs)
    this.barrierGroup = new THREE.Group();
    this.barrierGroup.position.set(0, 0, 0);
    this.scene.add(this.barrierGroup);
    this._rebuildBarrier();
    this.scene.add(placeLabel('double slit', 0, 2.1, 0, '#94a3b8', 1.1));

    this.detectors = new THREE.Group();
    this.scene.add(this.detectors);
    this._rebuildDetectors();

    this.screenMat = new THREE.MeshBasicMaterial({ map: makeScreenTexture('wave', 7, 80, []) });
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3.6), this.screenMat);
    this.screen.position.set(4.2, 0, 0);
    this.tip(this.screen, 'screen');
    this.scene.add(this.screen);
    this.scene.add(placeLabel('screen', 4.2, 2.1, 0, '#fbbf24', 1.1));

    this.waveGroup = new THREE.Group();
    this.scene.add(this.waveGroup);
    this._rebuildWaves();

    this.hitGroup = new THREE.Group();
    this.scene.add(this.hitGroup);
    this.flyerGroup = new THREE.Group();
    this.scene.add(this.flyerGroup);

    this._status = placeLabel('interference', 0, 2.8, 0, '#22d3ee', 1.3);
    this.scene.add(this._status);
  }

  _slitYs() {
    const half = Math.max(0.35, Math.min(1.4, this.slitSep / 70));
    return [-half / 2, half / 2];
  }

  _rebuildBarrier() {
    while (this.barrierGroup.children.length) {
      this.barrierGroup.remove(this.barrierGroup.children[0]);
    }
    const ys = this._slitYs();
    const mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.25, roughness: 0.55 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 1.6), mat);
    top.position.set(0, ys[1] + 0.7 + 0.15, 0);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.28, Math.max(0.15, ys[1] - ys[0] - 0.35), 1.6), mat);
    mid.position.set(0, (ys[0] + ys[1]) / 2, 0);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 1.6), mat);
    bot.position.set(0, ys[0] - 0.7 - 0.15, 0);
    this.barrierGroup.add(top);
    this.barrierGroup.add(mid);
    this.barrierGroup.add(bot);
    this.barrier = mid;
    this.tip(this.barrier, 'slits');
  }

  _rebuildDetectors() {
    while (this.detectors.children.length) {
      this.detectors.remove(this.detectors.children[0]);
    }
    const ys = this._slitYs();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf87171,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.4,
    });
    for (let i = 0; i < 2; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.35), mat);
      d.position.set(0.35, ys[i], 0.55);
      this.detectors.add(d);
    }
    this.detectors.visible = this.mode === 'which_path';
  }

  _rebuildWaves() {
    while (this.waveGroup.children.length) {
      this.waveGroup.remove(this.waveGroup.children[0]);
    }
    const hex = rgbToHex(photonRgb(this.freq));
    const ys = this._slitYs();
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 7; i++) {
        const w = new THREE.Mesh(
          new THREE.TorusGeometry(0.4 + i * 0.35, 0.018, 6, 40, Math.PI * 1.1),
          new THREE.MeshBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.38 - i * 0.04,
            side: THREE.DoubleSide,
          })
        );
        w.rotation.y = Math.PI / 2;
        w.rotation.z = -Math.PI / 2;
        w.position.set(0.2 + i * 0.35, ys[s], 0);
        w.userData.baseR = 0.4 + i * 0.35;
        w.userData.slit = s;
        this.waveGroup.add(w);
      }
    }
  }

  setParams(p) {
    if (!p) return;
    let rebuild = false;
    if (p.mode != null && p.mode !== this.mode) {
      this.mode = p.mode;
      this._clearHits();
      rebuild = true;
    }
    if (p.freq != null && Math.abs(p.freq - this.freq) > 0.01) {
      this.freq = p.freq;
      rebuild = true;
    }
    if (p.intensity != null) this.intensity = p.intensity;
    if (p.slitSep != null && Math.abs(p.slitSep - this.slitSep) > 0.5) {
      this.slitSep = p.slitSep;
      this._rebuildBarrier();
      this._rebuildDetectors();
      this._rebuildWaves();
      this._clearHits();
    }
    if (p.phase != null) this.phase = p.phase;

    this.waveGroup.visible = this.mode === 'wave' || this.mode === 'particle';
    this.detectors.visible = this.mode === 'which_path';
    this.hitGroup.visible = this.mode !== 'wave';

    const hex = rgbToHex(photonRgb(this.freq));
    this.source.material.color.setHex(hex);
    if (this.source.userData && this.source.userData.glow) {
      this.source.userData.glow.material.color.setHex(hex);
    }
    if (rebuild) {
      this._rebuildWaves();
      this._refreshScreen();
    }
    this._updateStatus();
  }

  _updateStatus() {
    if (!this._status) return;
    let text = 'interference';
    let color = '#22d3ee';
    if (this.mode === 'particle') {
      text = 'photon hits (unobserved)';
      color = '#fbbf24';
    } else if (this.mode === 'which_path') {
      text = 'which-path — no fringes';
      color = '#f87171';
    }
    // Replace label mesh via simple child text if placeLabel returns mesh with canvas — keep colour on material
    if (this._status.material && this._status.material.color) {
      // status is a sprite/label group — update via userData if present
    }
    this._status.userData.statusText = text;
  }

  _clearHits() {
    this._hitYs = [];
    while (this.hitGroup.children.length) {
      this.hitGroup.remove(this.hitGroup.children[0]);
    }
    this._hitMeshes = [];
    while (this.flyerGroup.children.length) {
      this.flyerGroup.remove(this.flyerGroup.children[0]);
    }
    this._flyers = [];
    this._refreshScreen();
  }

  _refreshScreen() {
    if (this.screenMat.map) this.screenMat.map.dispose();
    this.screenMat.map = makeScreenTexture(this.mode, this.freq, this.slitSep, this._hitYs);
    this.screenMat.needsUpdate = true;
  }

  tick(dt) {
    this.phase = (this.phase + dt * 3) % (Math.PI * 2);
    const ys = this._slitYs();

    // Animate wave rings
    this.waveGroup.children.forEach(function (w, i) {
      const pulse = 1 + Math.sin(this.phase + i * 0.45) * 0.12;
      w.scale.setScalar(pulse);
      w.material.opacity = Math.max(0.05, (0.38 - (i % 7) * 0.04) * (0.7 + 0.3 * Math.sin(this.phase + i)));
    }.bind(this));

    if (this.mode === 'wave') return;

    // Spawn flying photons
    const rate = this.intensity * 0.004;
    if (Math.random() < rate) {
      const which = Math.random() < 0.5 ? 0 : 1;
      const hex = rgbToHex(photonRgb(this.freq));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: hex })
      );
      mesh.position.set(-4.2, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2);
      this.flyerGroup.add(mesh);
      this._flyers.push({ mesh: mesh, which: which, stage: 0, ty: 0 });
    }

    const next = [];
    for (let i = 0; i < this._flyers.length; i++) {
      const f = this._flyers[i];
      const m = f.mesh;
      if (f.stage === 0) {
        m.position.x += 0.22;
        m.position.y += (ys[f.which] - m.position.y) * 0.15;
        if (m.position.x >= -0.1) {
          let yNorm = 0;
          let tries = 0;
          while (tries < 40) {
            yNorm = Math.random() * 2 - 1;
            if (Math.random() < hitProbability(yNorm, this.mode, this.freq, this.slitSep)) break;
            tries++;
          }
          f.ty = yNorm * 1.6;
          f.stage = 1;
        }
      } else {
        m.position.x += 0.28;
        m.position.y += (f.ty - m.position.y) * 0.2;
        if (m.position.x >= 4.0) {
          this._addHit(f.ty / 1.6);
          this.flyerGroup.remove(m);
          continue;
        }
      }
      next.push(f);
    }
    this._flyers = next;
  }

  _addHit(yNorm) {
    this._hitYs.push(yNorm);
    if (this._hitYs.length > 180) this._hitYs.shift();
    const hex = rgbToHex(photonRgb(this.freq));
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color: hex })
    );
    dot.position.set(4.25, yNorm * 1.6, (Math.random() - 0.5) * 0.25);
    this.hitGroup.add(dot);
    this._hitMeshes.push(dot);
    if (this._hitMeshes.length > 180) {
      const old = this._hitMeshes.shift();
      this.hitGroup.remove(old);
    }
    this._refreshScreen();
  }

  _bindTips() {
    const t = this._tipTexts;
    if (t.slits && this.barrier) this.barrier.userData.tip = t.slits;
    if (t.screen) this.screen.userData.tip = t.screen;
    if (t.source) this.source.userData.tip = t.source;
  }
}
