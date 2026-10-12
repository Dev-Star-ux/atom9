// NMR / MRI — 3D Bloch sphere, B₀, RF coil, MRI bore.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { larmorMHz, magTransverse } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassTube,
  dashedGuide,
} from '../common/sceneVisuals.js';

export class NmrMri3D {
  constructor(container) {
    this.container = container;
    this.M = { x: 0, y: 0, z: 1 };
    this.M0 = 1;
    this.B0 = 1.5;
    this.T1 = 1.0;
    this.T2 = 0.5;
    this.time = 0;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(5.5, 4.5, 8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.5, 0);
    addStudioLights(this.scene);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    this.scene.add(floor);

    // MRI bore (teaching enclosure)
    const bore = glassTube(1.35, 5.2, 0.12);
    bore.rotation.z = Math.PI / 2;
    bore.position.set(0, 0.2, -2.8);
    this.scene.add(bore);
    this.scene.add(placeLabel('MRI bore', 0, 1.8, -2.8, '#94a3b8', 0.95));

    // Bloch sphere wireframe
    this.sphereGroup = new THREE.Group();
    this.sphereGroup.position.set(0, 0.5, 0);
    this.scene.add(this.sphereGroup);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true, transparent: true, opacity: 0.45 })
    );
    this.sphereGroup.add(sphere);

    const equator = dashedGuide([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(1.5, 0, 0),
    ], 0x475569, 0.5);
    this.sphereGroup.add(equator);

    // B0 arrow (z)
    this.b0Group = new THREE.Group();
    this.b0Group.position.set(-2.6, 0.5, 0);
    this.scene.add(this.b0Group);
    const bShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    bShaft.position.y = 1.1;
    this.b0Group.add(bShaft);
    const bHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.32, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    bHead.position.y = 2.35;
    this.b0Group.add(bHead);
    this.scene.add(placeLabel('B₀', -2.6, 2.8, 0, '#fbbf24', 0.9));
    tip(bHead, 'B₀', 'Static field — defines Larmor frequency f = γB₀/2π.');

    // RF coil (torus-like ring)
    this.coil = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.07, 10, 48),
      new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.35 })
    );
    this.coil.rotation.x = Math.PI / 2;
    this.coil.position.set(0, 0.5, 0);
    this.scene.add(this.coil);
    this.scene.add(placeLabel('RF coil B₁', 0, 2.35, 0, '#c4b5fd', 0.95));
    tip(this.coil, 'RF pulse', 'B₁ along x tips M with 90° or 180° pulses.');

    // M vector arrow
    this.mArrow = new THREE.Group();
    this.sphereGroup.add(this.mArrow);
    this.mShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    this.mShaft.position.y = 0.5;
    this.mArrow.add(this.mShaft);
    this.mHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 10),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    this.mHead.position.y = 1.05;
    this.mArrow.add(this.mHead);
    this._mGlow = attachGlow(this.mHead, 0x34d399, 1.2);
    tip(this.mHead, 'M', 'Net magnetisation — precesses and decays (T1, T2).');

    this._fidLbl = placeLabel('FID ∝ M⊥', 2.4, 2.2, 0, '#38bdf8', 0.9);
    this.scene.add(this._fidLbl);

    this._title = placeLabel('Bloch NMR / MRI', 0, 3.2, 0, '#e2e8f0', 1.05);
    this.scene.add(this._title);
  }

  setParams(p) {
    if (!p) return;
    if (p.M) this.M = { x: p.M.x, y: p.M.y, z: p.M.z };
    if (p.M0 != null) this.M0 = p.M0;
    if (p.B0 != null) this.B0 = p.B0;
    if (p.T1 != null) this.T1 = p.T1;
    if (p.T2 != null) this.T2 = p.T2;
    if (p.time != null) this.time = p.time;
    this._updateMVector();
  }

  _updateMVector() {
    const mx = this.M.x;
    const my = this.M.y;
    const mz = this.M.z;
    const len = Math.sqrt(mx * mx + my * my + mz * mz) || 0.001;
    const dir = new THREE.Vector3(mx, mz, -my).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.mArrow.quaternion.copy(quat);
    const scale = len * 1.05;
    this.mShaft.scale.y = scale;
    this.mHead.position.y = scale;
    this.mHead.position.copy(dir.clone().multiplyScalar(scale));

    const mt = magTransverse(this.M);
    if (this._fidLbl && this._fidLbl.material && this._fidLbl.material.map) {
      const cv = this._fidLbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.78)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 16px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FID ∝ M⊥ = ' + mt.toFixed(3), 192, 24);
        this._fidLbl.material.map.needsUpdate = true;
      }
    }

    // Coil glow when transverse component large
    if (this.coil && this.coil.material) {
      this.coil.material.emissiveIntensity = 0.25 + mt * 0.55;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.coil, this.mHead, this.b0Group && this.b0Group.children[1]].filter(Boolean);
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

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    if (this._active && !this.paused) {
      this.phase += 0.016;
      this.sphereGroup.rotation.y = Math.sin(this.phase * 0.4) * 0.08;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
