// 3D matter-wave packet — Re/Im ribbon spiral + |ψ|² glow floor.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, placeLabel, attachGlow } from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import { samplePacket } from './physics.js';

var N_PTS = 160;
var N_BARS = 80;

function hueColor(h, out) {
  out.setHSL(0.55 - h * 0.35, 0.85, 0.55);
  return out;
}

export class WaveBeamScene {
  constructor(container) {
    this.container = container;
    this.width = 40;
    this.momentum = 35;
    this.dispersion = 45;
    this.paused = false;
    this._active = false;
    this._t = 0;
    this._tmpC = new THREE.Color();

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 9, 16);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);

    this._buildStatic();
    this._buildDynamic();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._updateGeometry(0);
  }

  _buildStatic() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    this.scene.add(floor);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    rail.position.y = 1.6;
    this.scene.add(rail);

    this.source = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
      })
    );
    this.source.rotation.y = Math.PI / 2;
    this.source.position.set(-9.5, 1.6, 0);
    this.scene.add(this.source);
    attachGlow(this.source, 0x38bdf8, 2.2);
    tip(this.source, 'Wave source', 'Matter-wave packet leaves the aperture and drifts with ⟨p⟩.');

    this.scene.add(placeLabel('source', -9.5, 3.2, 0, '#7dd3fc', 0.9));
    this.scene.add(placeLabel('Re / Im ψ', 0, 5.2, -2.2, '#22d3ee', 1.0));
    this.scene.add(placeLabel('|ψ|²', 0, 0.35, 2.4, '#c084fc', 0.95));
  }

  _buildDynamic() {
    // Ribbon line
    this._pos = new Float32Array(N_PTS * 3);
    this._col = new Float32Array(N_PTS * 3);
    this._lineGeo = new THREE.BufferGeometry();
    this._lineGeo.setAttribute('position', new THREE.BufferAttribute(this._pos, 3));
    this._lineGeo.setAttribute('color', new THREE.BufferAttribute(this._col, 3));
    this._line = new THREE.Line(
      this._lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    this.scene.add(this._line);

    // Envelope rails
    this._upPos = new Float32Array(N_PTS * 3);
    this._dnPos = new Float32Array(N_PTS * 3);
    this._upGeo = new THREE.BufferGeometry();
    this._upGeo.setAttribute('position', new THREE.BufferAttribute(this._upPos, 3));
    this._dnGeo = new THREE.BufferGeometry();
    this._dnGeo.setAttribute('position', new THREE.BufferAttribute(this._dnPos, 3));
    this._upLine = new THREE.Line(
      this._upGeo,
      new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.45 })
    );
    this._dnLine = new THREE.Line(
      this._dnGeo,
      new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.45 })
    );
    this.scene.add(this._upLine, this._dnLine);

    // Beads
    this._beads = [];
    const beadGeo = new THREE.SphereGeometry(0.09, 8, 8);
    for (let i = 0; i < 40; i++) {
      const bead = new THREE.Mesh(
        beadGeo,
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
      );
      bead.visible = false;
      this.scene.add(bead);
      this._beads.push(bead);
    }

    // Density bars
    this._bars = [];
    const barGeo = new THREE.BoxGeometry(0.22, 1, 0.55);
    for (let i = 0; i < N_BARS; i++) {
      const bar = new THREE.Mesh(
        barGeo,
        new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x6b21a8,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.75,
        })
      );
      bar.visible = false;
      this.scene.add(bar);
      this._bars.push(bar);
    }

    this._mark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    this.scene.add(this._mark);
  }

  setParams(p) {
    if (!p) return;
    if (p.sigma != null) this.width = p.sigma;
    if (p.momentum != null) this.momentum = p.momentum;
    if (p.dispersion != null) this.dispersion = p.dispersion;
    if (p.wavelength != null && p.momentum == null) {
      this.momentum = Math.max(5, Math.min(95, 100 - p.wavelength));
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (tips && tips.source) tip(this.source, tips.source.title, tips.source.desc);
  }

  getPickables() {
    return [this.source];
  }

  _wx(x) {
    return (x / 120) * 10;
  }

  _updateGeometry(t) {
    const mom = this.momentum / 100;
    const disp = this.dispersion / 100;
    const pack = samplePacket(this.width, mom, disp, t, N_PTS, -120, 120);
    const st = pack.state;

    let aMax = 1e-12;
    let dMax = 1e-12;
    for (let i = 0; i < N_PTS; i++) {
      if (pack.amp[i] > aMax) aMax = pack.amp[i];
      if (pack.dens[i] > dMax) dMax = pack.dens[i];
    }

    const scale = 2.2;
    for (let i = 0; i < N_PTS; i++) {
      const xw = this._wx(pack.xs[i]);
      const y = 1.6 + pack.re[i] * scale;
      const z = pack.im[i] * scale;
      this._pos[i * 3] = xw;
      this._pos[i * 3 + 1] = y;
      this._pos[i * 3 + 2] = z;
      const h = (Math.atan2(pack.im[i], pack.re[i]) + Math.PI) / (Math.PI * 2);
      hueColor(h, this._tmpC);
      this._col[i * 3] = this._tmpC.r;
      this._col[i * 3 + 1] = this._tmpC.g;
      this._col[i * 3 + 2] = this._tmpC.b;

      const env = pack.amp[i] * scale;
      this._upPos[i * 3] = xw;
      this._upPos[i * 3 + 1] = 1.6 + env;
      this._upPos[i * 3 + 2] = 0;
      this._dnPos[i * 3] = xw;
      this._dnPos[i * 3 + 1] = 1.6 - env;
      this._dnPos[i * 3 + 2] = 0;
    }
    this._lineGeo.attributes.position.needsUpdate = true;
    this._lineGeo.attributes.color.needsUpdate = true;
    this._upGeo.attributes.position.needsUpdate = true;
    this._dnGeo.attributes.position.needsUpdate = true;

    // Beads every 4th point
    let bi = 0;
    for (let i = 0; i < N_PTS && bi < this._beads.length; i += 4) {
      const a = pack.amp[i] / aMax;
      const bead = this._beads[bi++];
      if (a < 0.08) {
        bead.visible = false;
        continue;
      }
      bead.visible = true;
      bead.position.set(this._pos[i * 3], this._pos[i * 3 + 1], this._pos[i * 3 + 2]);
      const h = (Math.atan2(pack.im[i], pack.re[i]) + Math.PI) / (Math.PI * 2);
      bead.material.color.copy(hueColor(h, this._tmpC));
      const s = 0.7 + a * 0.8;
      bead.scale.set(s, s, s);
    }
    for (; bi < this._beads.length; bi++) this._beads[bi].visible = false;

    // Density bars
    const step = Math.floor(N_PTS / N_BARS);
    for (let b = 0; b < N_BARS; b++) {
      const i = Math.min(N_PTS - 1, b * step);
      const d = pack.dens[i] / dMax;
      const bar = this._bars[b];
      if (d < 0.02) {
        bar.visible = false;
        continue;
      }
      bar.visible = true;
      const h = 0.06 + d * 1.8;
      bar.position.set(this._wx(pack.xs[i]), h / 2, 1.15);
      bar.scale.set(1, h, 1);
      bar.material.emissiveIntensity = 0.2 + d * 0.6;
    }

    this._mark.position.set(this._wx(st.center), 1.6, 0);
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    this._t += dt;
    this._updateGeometry(this._t);
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
