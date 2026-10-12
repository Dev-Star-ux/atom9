// 3D Davisson–Germer — clear gun → Ni lattice → detector chamber.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
} from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import { davissonIntensity, NI_SPACING_PM, davissonPeakAngleDeg } from './physics.js';

export class DavissonGermerScene {
  constructor(container) {
    this.container = container;
    this.voltage = 54;
    this.angle = 50;
    this.paused = false;
    this._active = false;
    this.electrons = [];
    this._emit = 0;

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(3, 7, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.2, 0);
    addStudioLights(this.scene);

    this.eGroup = new THREE.Group();
    this.scene.add(this.eGroup);

    this._build();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._updateDetector();
  }

  _build() {
    // Soft floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    this.scene.add(floor);

    // Subtle vacuum chamber hoop
    const chamber = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.7 })
    );
    chamber.rotation.x = Math.PI / 2;
    chamber.position.y = 0.1;
    this.scene.add(chamber);

    // Electron gun
    this.gun = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 1.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.45 })
    );
    this.gun.rotation.z = Math.PI / 2;
    this.gun.position.set(-5.2, 0, 0);
    this.scene.add(this.gun);
    const nozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.7, 14),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    nozzle.rotation.z = -Math.PI / 2;
    nozzle.position.set(-4.2, 0, 0);
    this.scene.add(nozzle);
    attachGlow(nozzle, 0x38bdf8, 1.6);
    tip(this.gun, 'Electron gun', 'Accelerates electrons; V sets de Broglie λ = h/√(2meV).');

    // Beam guide
    const guide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 })
    );
    guide.rotation.z = Math.PI / 2;
    guide.position.set(-2.4, 0, 0);
    this.scene.add(guide);

    // Ni crystal — atom lattice (FCC-like rows)
    this.crystal = new THREE.Group();
    const atomMat = new THREE.MeshStandardMaterial({
      color: 0xa8b4c4,
      metalness: 0.75,
      roughness: 0.3,
      emissive: 0x334155,
      emissiveIntensity: 0.15,
    });
    const atomGeo = new THREE.SphereGeometry(0.14, 12, 12);
    for (let iy = -3; iy <= 3; iy++) {
      for (let iz = -3; iz <= 3; iz++) {
        for (let ix = -1; ix <= 1; ix++) {
          const a = new THREE.Mesh(atomGeo, atomMat);
          a.position.set(ix * 0.42, iy * 0.38, iz * 0.38);
          this.crystal.add(a);
        }
      }
    }
    this.crystal.position.set(0, 0, 0);
    this.scene.add(this.crystal);
    tip(this.crystal, 'Ni crystal', 'Surface grating D ≈ 218 pm. Diffraction peaks when nλ = D sin θ.');

    // Detector on swing arm
    this.arm = new THREE.Group();
    this.scene.add(this.arm);
    const armBar = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x475569 })
    );
    armBar.position.x = 1.8;
    this.arm.add(armBar);
    this.detector = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.4, 0.9),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x14532d,
        emissiveIntensity: 0,
        metalness: 0.3,
      })
    );
    this.detector.position.x = 3.6;
    this.arm.add(this.detector);
    this._detGlow = attachGlow(this.detector, 0x4ade80, 1.5);
    this._detGlow.visible = false;
    tip(this.detector, 'Detector', 'Counts scattered electrons. Bright when θ hits a diffraction peak.');

    // Peak angle guide ring (subtle)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.025, 8, 64, Math.PI * 0.55),
      new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.55 })
    );
    ring.rotation.y = Math.PI / 2;
    ring.rotation.z = -Math.PI * 0.05;
    this.scene.add(ring);

    // Sparse labels
    this.scene.add(placeLabel('gun', -5.2, 1.8, 0, '#7dd3fc', 0.95));
    this.scene.add(placeLabel('Ni crystal', 0, 2.4, 0, '#cbd5e1', 1.0));
    this._detLbl = placeLabel('detector', 3.2, 2.0, 0, '#94a3b8', 0.95);
    this.scene.add(this._detLbl);
    this.scene.add(placeLabel('θ', 1.6, -1.8, 1.2, '#a78bfa', 0.9));
  }

  setParams(p) {
    if (!p) return;
    if (p.voltage != null) this.voltage = p.voltage;
    if (p.angle != null) this.angle = p.angle;
    this._updateDetector();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (tips && tips.gun) tip(this.gun, tips.gun.title, tips.gun.desc);
    if (tips && tips.crystal) tip(this.crystal, tips.crystal.title, tips.crystal.desc);
    if (tips && tips.detector) tip(this.detector, tips.detector.title, tips.detector.desc);
  }

  getPickables() {
    return [this.gun, this.crystal, this.detector];
  }

  _updateDetector() {
    const rad = (this.angle * Math.PI) / 180;
    this.arm.rotation.z = -rad;
    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    const hot = I > 0.55;
    this.detector.material.emissiveIntensity = hot ? 0.55 : 0;
    this.detector.material.color.setHex(hot ? 0x4ade80 : 0x64748b);
    this._detGlow.visible = hot;

    // Move label roughly with detector
    const lx = 3.6 * Math.cos(rad);
    const ly = -3.6 * Math.sin(rad);
    this._detLbl.position.set(lx, ly + 1.5, 0.8);
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    const I = davissonIntensity(this.angle, this.voltage, NI_SPACING_PM);
    const rad = (this.angle * Math.PI) / 180;
    const peak = davissonPeakAngleDeg(this.voltage, NI_SPACING_PM);
    const peakRad = peak != null ? (peak * Math.PI) / 180 : rad;

    this._emit += dt * (3 + I * 8);
    while (this._emit >= 1 && this.electrons.length < 36) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      m.position.set(-4.0, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3);
      this.eGroup.add(m);
      // Prefer scattering toward detector when near peak
      const towardPeak = Math.random() < Math.min(0.9, 0.2 + I * 0.7);
      const scatterAng = towardPeak ? rad + (Math.random() - 0.5) * 0.12 : peakRad * Math.random();
      this.electrons.push({
        mesh: m,
        x: -4.0,
        scattered: false,
        ang: scatterAng,
        speed: 5 + Math.random() * 2,
      });
    }

    const keep = [];
    for (let i = 0; i < this.electrons.length; i++) {
      const e = this.electrons[i];
      if (!e.scattered) {
        e.x += dt * 8;
        e.mesh.position.x = e.x;
        if (e.x >= -0.15) {
          e.scattered = true;
          e.mesh.material.color.setHex(0xa78bfa);
          e.vx = Math.cos(e.ang) * e.speed;
          e.vy = -Math.sin(e.ang) * e.speed;
        }
        keep.push(e);
      } else {
        e.mesh.position.x += e.vx * dt;
        e.mesh.position.y += e.vy * dt;
        if (e.mesh.position.x < 6 && e.mesh.position.y > -5) keep.push(e);
        else this.eGroup.remove(e.mesh);
      }
    }
    this.electrons = keep;
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
