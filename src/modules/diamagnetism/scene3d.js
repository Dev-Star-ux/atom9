// Diamagnetism 3D scene — a checkerboard of small alternating-polarity
// magnet cubes (echoing the classic pyrolytic-graphite levitation demo)
// with a flat sample disk whose height is a genuine force-balance
// simulation: diamagnetic samples settle into a stable floating
// equilibrium above the magnets, paramagnetic ones sink onto them.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { findMaterial, localForcePerVolume, decayLength, SAMPLE_WEIGHT } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const WORLD_H_M = 0.09; // metres of physical height mapped onto the scene
const WORLD_SCALE = 11; // world units per metre
const M_EFF = 6000;
const DAMPING = 0.985;
const GRID_N = 3; // 3x3 checkerboard of magnet cubes
const CUBE = 0.34;
const CUBE_GAP = 0.02;

export class DiamagnetismScene3D {
  constructor(container) {
    this.container = container;
    this.state = { materialId: 'bismuth', B: 1.0, dBdz: 20 };
    this.paused = false;
    this._active = false;
    this._z = 0.02;
    this._v = 0;
    this._lastT = null;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(2.6, 2.1, 3.1);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.35, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 20, -1.05);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // Base plinth
    const baseW = GRID_N * (CUBE + CUBE_GAP) + 0.3;
    this.base = new THREE.Mesh(
      roundedBoxGeometry(baseW, 0.16, baseW, 0.05, 3),
      plasticMaterial(0x1b2436, { roughness: 0.6 }),
    );
    this.base.position.set(0, -0.08, 0);
    this.scene.add(this.base);
    const baseShadow = contactShadow(baseW * 0.85, baseW * 0.85, 0.4);
    baseShadow.position.set(0, -0.995, 0);
    this.scene.add(baseShadow);

    // Checkerboard of alternating-polarity NdFeB-style magnet cubes
    this._magnetTopY = 0.08;
    const nMat = metalMaterial(0x7f1d1d, { metalness: 0.55, roughness: 0.32 });
    const sMat = metalMaterial(0x1e3a8a, { metalness: 0.55, roughness: 0.32 });
    const start = -((GRID_N - 1) / 2) * (CUBE + CUBE_GAP);
    this.magnetGroup = new THREE.Group();
    for (let ix = 0; ix < GRID_N; ix++) {
      for (let iz = 0; iz < GRID_N; iz++) {
        const isN = (ix + iz) % 2 === 0;
        const cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE, 0.16, CUBE), isN ? nMat : sMat);
        cube.position.set(start + ix * (CUBE + CUBE_GAP), this._magnetTopY - 0.08, start + iz * (CUBE + CUBE_GAP));
        this.magnetGroup.add(cube);
      }
    }
    this.scene.add(this.magnetGroup);
    tip(this.magnetGroup, 'Checkerboard magnet', 'Small cubes glued alternating N-up / S-up (red/blue here) — the same trick real pyrolytic-graphite levitation demos use to make a tightly confined, strongly non-uniform field just above the surface.');

    // Field-line arcs from N cubes to neighboring S cubes
    this._buildFieldLines(start);

    // Sample: a thin flat disk
    this.sample = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.045, 28),
      metalMaterial(0x9aa4b2, { metalness: 0.3, roughness: 0.55 }),
    );
    this.sample.position.set(0, this._magnetTopY + this._z * WORLD_SCALE, 0);
    this.scene.add(this.sample);
    attachGlow(this.sample, 0x60a5fa, 0.55);
    tip(this.sample, 'Sample', 'A diamagnetic sample (bismuth, graphite) settles at the height where magnetic repulsion exactly balances its weight. A paramagnetic sample (aluminum) is instead pulled down onto the magnet.');

    this._sampleLbl = placeLabel(this._materialLabel(), 0, this._magnetTopY + 0.45, 0.4, '#fde68a', 0.95);
    this.scene.add(this._sampleLbl);

    this.resize();
  }

  _buildFieldLines(start) {
    const group = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.4 });
    for (let i = 0; i < GRID_N; i++) {
      const from = new THREE.Vector3(start + i * (CUBE + CUBE_GAP), this._magnetTopY, start - CUBE);
      const to = new THREE.Vector3(start + i * (CUBE + CUBE_GAP), this._magnetTopY, start + GRID_N * (CUBE + CUBE_GAP) - CUBE);
      const mid1 = new THREE.Vector3((from.x + to.x) / 2 - 0.5, this._magnetTopY + 0.55, (from.z + to.z) / 2);
      const curve = new THREE.CatmullRomCurve3([from, mid1, to]);
      const pts = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, mat));
    }
    this.scene.add(group);
    this._fieldLines = group;
  }

  _materialLabel() {
    const m = findMaterial(this.state.materialId);
    return m.name + ' (' + m.type + ')';
  }

  _updateLabel() {
    if (!this._sampleLbl || !this._sampleLbl.material || !this._sampleLbl.material.map) return;
    const cv = this._sampleLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const m = findMaterial(this.state.materialId);
    const gapMm = this._z * 1000;
    const txt = m.type === 'diamagnetic' && this._z > 0.003
      ? m.name + ' floating ≈ ' + gapMm.toFixed(1) + ' mm'
      : m.name + (m.type === 'diamagnetic' ? ' (too weak to lift off)' : ' — attracted, resting');
    ctx.fillText(txt, 192, 24);
    this._sampleLbl.material.map.needsUpdate = true;
  }

  setParams(p) {
    if (!p) return;
    if (p.materialId != null) this.state.materialId = p.materialId;
    if (p.B != null) this.state.B = p.B;
    if (p.dBdz != null) this.state.dBdz = p.dBdz;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips() {}

  getPickables() {
    return [this.magnetGroup, this.sample].filter(Boolean);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this._alive = false;
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  _integrate(dt) {
    const m = findMaterial(this.state.materialId);
    const F = localForcePerVolume(m.chi, this.state.B, this.state.dBdz, this._z);
    const a = (F - SAMPLE_WEIGHT) / M_EFF;
    this._v = (this._v + a * dt) * DAMPING;
    this._z += this._v * dt;
    const zMax = WORLD_H_M * 1.05;
    if (this._z <= 0) { this._z = 0; this._v = Math.min(this._v, 0) * 0.2; }
    if (this._z >= zMax) { this._z = zMax; this._v = Math.min(this._v, 0); }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this._integrate(dt);
      this._t = (this._t || 0) + dt;
      const settled = Math.abs(this._v) < 0.02 && this._z > 0.004;
      const bob = settled ? Math.sin(this._t * 2.2) * 0.0009 : 0;
      const yWorld = this._magnetTopY + Math.max(0, this._z + bob) * WORLD_SCALE;
      this.sample.position.y = yWorld;
      this.sample.rotation.y += 0.003;
      this._labelTick = (this._labelTick || 0) + 1;
      if (this._labelTick % 6 === 0) this._updateLabel();
      if (this._fieldLines) {
        this._fieldLines.children.forEach((l) => { l.material.opacity = 0.28 + 0.12 * Math.sin(this._t * 1.4); });
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
