// 3D blackbody features — glowing star + Kirchhoff cavity (not a flat chart).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassMaterial,
} from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import { blackbodyRgb, wienPeakNm, stefanBoltzmann } from './physics.js';

function parseRgb(str) {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(str || '');
  if (!m) return new THREE.Color(0xff8844);
  return new THREE.Color(parseInt(m[1], 10) / 255, parseInt(m[2], 10) / 255, parseInt(m[3], 10) / 255);
}

export class BBFeaturesScene {
  constructor(container) {
    this.container = container;
    this.temp = 5000;
    this.paused = false;
    this._active = false;
    this._t = 0;

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(6, 5.5, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);

    this.photonGroup = new THREE.Group();
    this.scene.add(this.photonGroup);
    this._photons = [];

    this._build();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._update();
  }

  _build() {
    // Soft floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    this.scene.add(floor);

    // Kirchhoff cavity (hohlraum) — left
    this.cavity = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 3.2, 3.2),
      glassMaterial(0x1e293b, 0.4)
    );
    this.cavity.position.set(-5.2, 0.6, 0);
    this.scene.add(this.cavity);

    // Inner hot wall
    this.inner = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.4, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        emissive: 0xff6622,
        emissiveIntensity: 0.35,
      })
    );
    this.inner.position.copy(this.cavity.position);
    this.scene.add(this.inner);

    // Aperture hole (dark disc on +x face)
    this.aperture = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617 })
    );
    this.aperture.position.set(-3.05, 0.6, 0);
    this.aperture.rotation.y = Math.PI / 2;
    this.scene.add(this.aperture);
    tip(this.cavity, 'Hohlraum cavity', 'Kirchhoff: a hole in a hot cavity is an ideal blackbody.');
    tip(this.aperture, 'Aperture', 'Radiation escaping the hole has the blackbody spectrum.');

    // Glowing star / radiator — right (colour = T)
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 40, 40),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff8844,
        emissiveIntensity: 0.7,
        roughness: 0.35,
        metalness: 0.05,
      })
    );
    this.sphere.position.set(3.2, 1.0, 0);
    this.scene.add(this.sphere);
    this.halo = attachGlow(this.sphere, 0xff8844, 3.4);
    tip(this.sphere, 'Thermal radiator', 'Approximate blackbody colour for temperature T. Hotter → bluer & brighter.');

    // Emission beam from aperture toward star metaphor (guide)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.55, 5.2, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(-0.2, 0.6, 0);
    this.scene.add(beam);
    this._beam = beam;

    // Sparse labels
    this.scene.add(placeLabel('cavity', -5.2, 3.3, 0, '#94a3b8', 0.95));
    this.scene.add(placeLabel('aperture', -2.6, 2.0, 1.4, '#64748b', 0.85));
    this.scene.add(placeLabel('blackbody glow', 3.2, 3.6, 0, '#fbbf24', 1.0));
    this._wienLbl = placeLabel('λ_max', 3.2, -0.6, 2.2, '#fbbf24', 0.9);
    this._powerLbl = placeLabel('σT⁴', 3.2, -1.2, 2.2, '#94a3b8', 0.85);
    this.scene.add(this._wienLbl, this._powerLbl);

    // Photon pool
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd24a }));
      m.visible = false;
      this.photonGroup.add(m);
      this._photons.push({ mesh: m, active: false, vx: 0, vy: 0, vz: 0 });
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.temp != null) this.temp = p.temp;
    this._update();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (tips && tips.cavity) {
      tip(this.cavity, tips.cavity.title, tips.cavity.desc);
      tip(this.aperture, tips.cavity.title, tips.cavity.desc);
    }
  }

  getPickables() {
    return [this.cavity, this.aperture, this.sphere];
  }

  _update() {
    const rgb = parseRgb(blackbodyRgb(this.temp));
    this.sphere.material.color.copy(rgb);
    this.sphere.material.emissive.copy(rgb);
    this.inner.material.emissive.copy(rgb);
    const power = stefanBoltzmann(this.temp);
    const scale = 1.0 + Math.min(0.85, Math.log10(power + 1) * 0.12);
    this.sphere.scale.setScalar(scale);
    if (this.halo) {
      this.halo.scale.setScalar(2.8 * scale);
      if (this.halo.material) this.halo.material.color.copy(rgb);
    }
    this.sphere.material.emissiveIntensity = 0.4 + Math.min(0.75, (this.temp / 8000) * 0.9);
    this.inner.material.emissiveIntensity = 0.2 + (this.temp / 8000) * 0.55;
    this._beam.material.color.copy(rgb);
    this._beam.material.opacity = 0.08 + (this.temp / 8000) * 0.18;

    const peak = wienPeakNm(this.temp);
    // Rebuild small labels by replacing texture is heavy — keep static captions; HUD is in 2D.
    // Tint photons
    for (let i = 0; i < this._photons.length; i++) {
      this._photons[i].mesh.material.color.copy(rgb);
    }
    this._peak = peak;
  }

  _spawnPhoton() {
    const p = this._photons.find(function (q) { return !q.active; });
    if (!p) return;
    p.mesh.position.set(-3.0, 0.6 + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
    const speed = 0.12 + Math.random() * 0.1;
    p.vx = speed;
    p.vy = (Math.random() - 0.5) * 0.04;
    p.vz = (Math.random() - 0.5) * 0.04;
    p.active = true;
    p.mesh.visible = true;
    p.life = 1.2 + Math.random();
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    this._t += dt;
    // Emission rate grows with T (pedagogical)
    const rate = 0.15 + (this.temp / 8000) * 0.85;
    if (Math.random() < rate) this._spawnPhoton();

    for (let i = 0; i < this._photons.length; i++) {
      const p = this._photons[i];
      if (!p.active) continue;
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      p.life -= dt;
      if (p.life <= 0 || p.mesh.position.x > 8) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
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
