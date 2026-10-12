// Clear 3D hydrogen spectrum: Bohr orbits + energy ladder + emission spectrum strip.
// Teaching companion to the oPhysics-style 2D energy-level diagram.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel, dashedGuide, solidGuide } from '../common/sceneVisuals.js';
import {
  energyLevelEV,
  hydrogenSeries,
  hydrogenWavelengthNm,
  wavelengthToCss,
} from './physics.js';

function cssToHex(css) {
  if (!css || css.charAt(0) !== 'r') return 0xaaaaaa;
  const m = css.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return 0xaaaaaa;
  return (parseInt(m[1], 10) << 16) + (parseInt(m[2], 10) << 8) + parseInt(m[3], 10);
}

function makeSpectrumTexture(n1, n2) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#eaf0fb';
  ctx.font = '600 16px system-ui,sans-serif';
  ctx.fillText('Emission spectrum', 16, 24);
  const series = hydrogenSeries(n1, 7);
  const nmMin = 380;
  const nmMax = 750;
  const left = 20;
  const right = 492;
  const top = 40;
  const bot = 130;
  ctx.fillStyle = '#111827';
  ctx.fillRect(left, top, right - left, bot - top);
  for (let i = 0; i < series.length; i++) {
    const nm = series[i][0];
    const int = series[i][1];
    const lbl = series[i][2];
    if (nm < nmMin || nm > nmMax) continue;
    const x = left + (nm - nmMin) / (nmMax - nmMin) * (right - left);
    const selected = (n1 + 1 + i) === n2;
    const h = (bot - top) * (0.4 + 0.55 * int);
    ctx.fillStyle = wavelengthToCss(nm);
    ctx.globalAlpha = selected ? 1 : 0.5;
    ctx.fillRect(x - (selected ? 3 : 1.5), bot - h, selected ? 6 : 3, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = selected ? '#fff' : '#94a3b8';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, x, top - 4);
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  for (let nm = 400; nm <= 700; nm += 100) {
    const x = left + (nm - nmMin) / (nmMax - nmMin) * (right - left);
    ctx.fillText(String(nm), x, bot + 16);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export class HydrogenSpectrumScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [2, 7, 14], target: [0.5, 0.5, 0], gridY: -2.6 });
    this.n1 = 2;
    this.n2 = 3;
    this.pulse = 0;
    this.levelY = {};
    this._build();
  }

  _orbitR(n) {
    return 0.55 + (n - 1) * 0.38;
  }

  _levelY(n) {
    // Energy → vertical (ground near bottom)
    const E = energyLevelEV(n);
    const eMin = energyLevelEV(1);
    return -1.6 + ((E - eMin) / (0 - eMin)) * 3.4;
  }

  _build() {
    // Nucleus
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.4,
      })
    );
    this.nucleus.position.set(-3.2, 0, 0);
    this.tip(this.nucleus, 'nucleus');
    attachGlow(this.nucleus, 0xef4444, 1.5);
    this.scene.add(this.nucleus);
    this.scene.add(placeLabel('proton', -3.2, -1.15, 0, '#fca5a5', 1.1));

    // Bohr orbits
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.position.set(-3.2, 0, 0);
    this.scene.add(this.orbitGroup);
    this.orbits = [];
    for (let n = 1; n <= 6; n++) {
      const r = this._orbitR(n);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 6, 64),
        new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.45 })
      );
      ring.rotation.x = Math.PI / 2;
      this.orbitGroup.add(ring);
      this.orbits[n] = ring;
      this.orbitGroup.add(placeLabel('n=' + n, r * 0.7, 0.05, r * 0.7, '#94a3b8', 0.75));
    }

    // Electron
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    attachGlow(this.electron, 0x38bdf8, 0.9);
    this.tip(this.electron, 'electron');
    this.scene.add(this.electron);

    // Energy ladder (right of atom)
    this.ladderGroup = new THREE.Group();
    this.ladderGroup.position.set(0.6, 0, 0);
    this.scene.add(this.ladderGroup);
    this.scene.add(placeLabel('energy levels', 0.6, 2.45, 0, '#a9c4ff', 1.2));

    // Photon
    this.photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    attachGlow(this.photon, 0xffffff, 1.1);
    this.scene.add(this.photon);

    // Transition arrow (dynamic)
    this.arrowGroup = new THREE.Group();
    this.scene.add(this.arrowGroup);

    // Spectrum panel
    this.specSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSpectrumTexture(2, 3),
      transparent: true,
      depthTest: false,
    }));
    this.specSprite.position.set(5.2, 0.2, 0);
    this.specSprite.scale.set(5.2, 1.7, 1);
    this.scene.add(this.specSprite);
    this.tip(this.specSprite, 'spectrum');

    // Guide linking atom → ladder → spectrum
    this.scene.add(dashedGuide([
      new THREE.Vector3(-1.6, 0.8, 0),
      new THREE.Vector3(0.2, 0.8, 0),
    ], 0x64748b, 0.35));
    this.scene.add(dashedGuide([
      new THREE.Vector3(2.4, 0.2, 0),
      new THREE.Vector3(3.4, 0.2, 0),
    ], 0x64748b, 0.35));

    this._rebuild();
  }

  setParams(p) {
    if (!p) return;
    if (p.n1 != null) this.n1 = p.n1;
    if (p.n2 != null) this.n2 = p.n2;
    if (p.pulse != null) this.pulse = p.pulse;
    this._rebuild();
  }

  _rebuild() {
    const n1 = this.n1;
    const n2 = Math.max(n1 + 1, this.n2);

    // Highlight orbits
    for (let n = 1; n <= 6; n++) {
      if (!this.orbits[n]) continue;
      const on = n === n1 || n === n2;
      this.orbits[n].material.color.setHex(on ? 0x38bdf8 : 0x64748b);
      this.orbits[n].material.opacity = on ? 0.9 : 0.3;
    }

    // Ladder
    while (this.ladderGroup.children.length) this.ladderGroup.remove(this.ladderGroup.children[0]);
    this.levelY = {};
    for (let n = 1; n <= 7; n++) {
      const y = this._levelY(n);
      this.levelY[n] = y;
      const on = n === n1 || n === n2;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.1, y, 0),
        new THREE.Vector3(1.3, y, 0),
      ]);
      const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: on ? 0x38bdf8 : 0x475569,
        transparent: true,
        opacity: on ? 1 : 0.7,
      }));
      this.ladderGroup.add(ln);
      this.ladderGroup.add(placeLabel(
        'n=' + n + '  ' + energyLevelEV(n).toFixed(1) + ' eV',
        -1.85,
        y,
        0,
        on ? '#7dd3fc' : '#94a3b8',
        0.9
      ));
    }

    // Transition arrow
    while (this.arrowGroup.children.length) this.arrowGroup.remove(this.arrowGroup.children[0]);
    const yU = this.levelY[n2];
    const yL = this.levelY[n1];
    const lam = hydrogenWavelengthNm(n1, n2);
    const col = cssToHex(wavelengthToCss(lam));
    const ax = 0.6;
    this.arrowGroup.add(solidGuide([
      new THREE.Vector3(ax, yU, 0.05),
      new THREE.Vector3(ax, yL, 0.05),
    ], col, 0.95));
    // Arrow tip
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 10),
      new THREE.MeshBasicMaterial({ color: col })
    );
    tip.position.set(ax, yL + 0.05, 0.05);
    tip.rotation.x = Math.PI;
    this.arrowGroup.add(tip);
    this.arrowGroup.add(placeLabel(
      'n' + n2 + '→n' + n1 + (lam > 0 ? '  λ=' + lam.toFixed(0) + ' nm' : ''),
      ax + 1.35,
      (yU + yL) / 2,
      0,
      '#' + col.toString(16).padStart(6, '0'),
      1.05
    ));

    this.photon.material.color.setHex(col);
    if (this.photon.children[0] && this.photon.children[0].material) {
      // glow sprite may exist
    }

    // Spectrum texture
    if (this.specSprite.material.map) this.specSprite.material.map.dispose();
    this.specSprite.material.map = makeSpectrumTexture(n1, n2);
    this.specSprite.material.needsUpdate = true;
  }

  tick(dt) {
    this.pulse = (this.pulse + dt * 1.2) % 1;
    const n1 = this.n1;
    const n2 = Math.max(n1 + 1, this.n2);
    const ang = this.pulse * Math.PI * 2;

    // Electron on upper orbit, then briefly on lower after emission
    const onUpper = this.pulse < 0.72;
    const nOrb = onUpper ? Math.min(6, n2) : Math.min(6, n1);
    const r = this._orbitR(nOrb);
    this.electron.position.set(
      -3.2 + Math.cos(ang) * r,
      Math.sin(ang) * r * 0.15,
      Math.sin(ang) * r
    );

    // Photon drops on ladder then flies toward spectrum
    const yU = this.levelY[n2] != null ? this.levelY[n2] : 1;
    const yL = this.levelY[n1] != null ? this.levelY[n1] : -1;
    if (this.pulse < 0.55) {
      const t = this.pulse / 0.55;
      this.photon.visible = true;
      this.photon.position.set(0.6, yU + (yL - yU) * t, 0.25);
    } else if (this.pulse < 0.9) {
      const t = (this.pulse - 0.55) / 0.35;
      this.photon.visible = true;
      this.photon.position.set(0.6 + t * 3.8, yL + t * 0.2, 0.25);
    } else {
      this.photon.visible = false;
    }
  }

  _bindTips() {
    if (this._tipTexts.nucleus) this.nucleus.userData.tip = this._tipTexts.nucleus;
    if (this._tipTexts.electron) this.electron.userData.tip = this._tipTexts.electron;
    if (this._tipTexts.spectrum) this.specSprite.userData.tip = this._tipTexts.spectrum;
  }
}
