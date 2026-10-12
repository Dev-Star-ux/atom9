// 3D de Broglie — particle rides a glowing matter-wave ribbon; λ brackets make h/p obvious.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  PARTICLES,
  wavelengthPmAt,
  wavePeriodUnits,
  formatWavelength,
  momentum,
  keEVFromVelocity,
} from './physics.js';
import { tip, stat } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
} from '../common/sceneVisuals.js';

export class DeBroglieScene {
  constructor(container) {
    this.container = container;
    this.particleKey = 'electron';
    this.velocity = 2e6;
    this.relativistic = false;
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._tipTexts = {};

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(2.5, 6.5, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.4, 0);
    addStudioLights(this.scene);

    this.waveGroup = new THREE.Group();
    this.scene.add(this.waveGroup);

    this._buildStage();
    this._rebuildWave();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.6;
    this.scene.add(floor);

    // Soft corridor rails (teaching: particle travels this path)
    const railMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.7 });
    for (let s = -1; s <= 1; s += 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 0.04), railMat);
      rail.position.set(0, -0.9, s * 1.6);
      this.scene.add(rail);
    }

    // Particle
    this.particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false })
    );
    this.particle.renderOrder = 12;
    this.scene.add(this.particle);
    this._pGlow = attachGlow(this.particle, 0x38bdf8, 1.6);

    // Momentum arrow (updated each frame-ish)
    this.arrowGroup = new THREE.Group();
    this.scene.add(this.arrowGroup);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = 0.7;
    this.arrowGroup.add(shaft);
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    head.rotation.z = -Math.PI / 2;
    head.position.x = 1.55;
    this.arrowGroup.add(head);

    this._titleLbl = placeLabel('matter wave λ = h/p', 0, 3.4, 0, '#e2e8f0', 1.05);
    this.scene.add(this._titleLbl);
    this._lamLbl = placeLabel('λ', 0, 2.2, 0, '#fbbf24', 1.0);
    this.scene.add(this._lamLbl);
    this._pLbl = placeLabel('p →', 2.2, -0.2, 0, '#fbbf24', 0.9);
    this.scene.add(this._pLbl);
    this._partLbl = placeLabel('e⁻', 0, 1.2, 0, '#38bdf8', 0.95);
    this.scene.add(this._partLbl);

    tip(this.particle, 'Particle', 'Mass m moving with momentum p = mv. Wavelength λ = h/p.');
  }

  setParams(p) {
    if (!p) return;
    if (p.particleKey != null) this.particleKey = p.particleKey;
    if (p.velocity != null) this.velocity = p.velocity;
    if (p.relativistic != null) this.relativistic = !!p.relativistic;
    this._rebuildWave();
    this._bindTips();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  getPickables() {
    return [this.particle];
  }

  _part() {
    return PARTICLES[this.particleKey] || PARTICLES.electron;
  }

  _clearWave() {
    while (this.waveGroup.children.length) {
      const c = this.waveGroup.children[0];
      this.waveGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (c.material.map) c.material.map.dispose();
        c.material.dispose();
      }
    }
  }

  _rebuildWave() {
    this._clearWave();
    const part = this._part();
    const lamPm = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
    const period = wavePeriodUnits(lamPm);
    const color = new THREE.Color(part.color || '#38bdf8');

    // Ribbon surface: sine wave extruded in z
    const segs = 100;
    const zSegs = 8;
    const len = 13;
    const amp = 0.85;
    const positions = [];
    const colors = [];
    const indices = [];

    for (let iz = 0; iz <= zSegs; iz++) {
      const z = -1.1 + (2.2 * iz) / zSegs;
      for (let i = 0; i <= segs; i++) {
        const x = -len / 2 + (len * i) / segs;
        const y = amp * Math.sin((2 * Math.PI * x) / period + this.phase);
        positions.push(x, y, z);
        const fade = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((2 * Math.PI * x) / period + this.phase));
        colors.push(color.r * fade, color.g * fade, color.b * fade);
      }
    }
    for (let iz = 0; iz < zSegs; iz++) {
      for (let i = 0; i < segs; i++) {
        const a = iz * (segs + 1) + i;
        const b = a + 1;
        const c = a + (segs + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this._ribbon = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.1,
        depthWrite: false,
      })
    );
    this.waveGroup.add(this._ribbon);

    // Crest markers (wavelength ticks)
    const nCrest = Math.floor(len / period);
    for (let k = -Math.floor(nCrest / 2); k <= Math.floor(nCrest / 2); k++) {
      const x = k * period;
      if (x < -len / 2 + 0.4 || x > len / 2 - 0.4) continue;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.15, 2.4),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 })
      );
      tick.position.set(x, amp + 0.25, 0);
      this.waveGroup.add(tick);
    }

    // One λ double-arrow between adjacent crests (visual)
    if (period < len * 0.9) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(period, 0.03, 0.03),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      bar.position.set(period / 2, amp + 0.55, 0);
      this.waveGroup.add(bar);
    }

    // Particle color
    const hex = part.color || '#38bdf8';
    this.particle.material.color.set(hex);
    if (this._pGlow && this._pGlow.material) {
      this._pGlow.material.color.set(hex);
    }

    this.scene.remove(this._lamLbl);
    this._lamLbl = placeLabel('λ ≈ ' + formatWavelength(lamPm), 0, 2.35, 0, '#fbbf24', 1.05);
    this.scene.add(this._lamLbl);

    this.scene.remove(this._partLbl);
    this._partLbl = placeLabel(part.name, 0, 1.35, 0, hex, 0.95);
    this.scene.add(this._partLbl);
  }

  _updateRibbonPhase() {
    if (!this._ribbon) return;
    const part = this._part();
    const lamPm = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
    const period = wavePeriodUnits(lamPm);
    const amp = 0.85;
    const len = 13;
    const segs = 100;
    const zSegs = 8;
    const color = new THREE.Color(part.color || '#38bdf8');
    const pos = this._ribbon.geometry.attributes.position;
    const col = this._ribbon.geometry.attributes.color;
    let idx = 0;
    for (let iz = 0; iz <= zSegs; iz++) {
      const z = -1.1 + (2.2 * iz) / zSegs;
      for (let i = 0; i <= segs; i++) {
        const x = -len / 2 + (len * i) / segs;
        const y = amp * Math.sin((2 * Math.PI * x) / period + this.phase);
        pos.setXYZ(idx, x, y, z);
        const fade = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((2 * Math.PI * x) / period + this.phase));
        col.setXYZ(idx, color.r * fade, color.g * fade, color.b * fade);
        idx++;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this._ribbon.geometry.computeVertexNormals();
  }

  _bindTips() {
    const tips = this._tipTexts;
    const part = this._part();
    const m = part.mass;
    const p = momentum(m, this.velocity);
    const lamPm = wavelengthPmAt(m, this.velocity, this.relativistic);
    const ke = keEVFromVelocity(m, this.velocity);
    const self = this;
    this.particle.userData.sceneTip = function () {
      return {
        title: (tips.particle && tips.particle.title) || part.name,
        desc: (tips.particle && tips.particle.desc) || 'Moving particle with de Broglie wavelength λ = h/p.',
        stats: [
          stat(tips, 'momentum', p.toExponential(2) + ' kg·m/s'),
          stat(tips, 'wavelength', formatWavelength(lamPm)),
          stat(tips, 'velocity', (self.velocity / 1e6).toFixed(2) + ' ×10⁶ m/s'),
          { label: 'KE', value: ke >= 1000 ? (ke / 1000).toFixed(2) + ' keV' : ke.toFixed(2) + ' eV' },
        ],
      };
    };
  }

  tick() {
    // animation in _animate; dualView may call tick
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused && this._active) {
      const speed = 0.035 + Math.min(0.08, this.velocity / 4e7);
      this.phase += speed;
      this._updateRibbonPhase();

      const part = this._part();
      const lamPm = wavelengthPmAt(part.mass, this.velocity, this.relativistic);
      const period = wavePeriodUnits(lamPm);
      const amp = 0.85;
      const t = 0.5 + 0.5 * Math.sin(this.phase * 0.28);
      const x = -5.5 + t * 11;
      const y = amp * Math.sin((2 * Math.PI * x) / period + this.phase);
      this.particle.position.set(x, y, 0);
      this.arrowGroup.position.set(x + 0.2, y + 0.55, 0);
      this._partLbl.position.set(x, y + 0.85, 0.4);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._clearWave();
    if (this.renderer) {
      this.renderer.dispose();
      const el = this.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }
}
