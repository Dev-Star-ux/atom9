// AC power factor — induction motor bench with supply box and wattmeter.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
  attachGlow,
} from '../common/sceneVisuals.js';
import { powerFactor, degToRad, realPower } from './physics.js';

function cable(a, b, color) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 0.001;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, len, 8),
    plasticMaterial(color, { roughness: 0.55 }),
  );
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export class AcPowerFactorScene3D {
  constructor(container) {
    this.container = container;
    this.state = { Vrms: 120, Irms: 10, phiDeg: 36 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._spinRate = 0.04;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.6, 3.2, 6.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.2, 0.15, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -1.55;
    const shaftY = 0.25;

    // Bench pad
    const pad = new THREE.Mesh(
      roundedBoxGeometry(5.8, 0.14, 2.8, 0.08, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    pad.position.set(0.15, padY, 0);
    this.scene.add(pad);
    this.scene.add(contactShadow(2.7, 1.35, 0.42).translateY(padY - 0.072).translateX(0.15));

    // --- Induction motor housing ---
    this.motorGroup = new THREE.Group();
    this.motorGroup.position.set(-1.1, shaftY, 0);
    this.scene.add(this.motorGroup);

    // Foot / cradle
    const cradle = new THREE.Mesh(
      roundedBoxGeometry(1.6, 0.18, 1.1, 0.05, 3),
      metalMaterial(0x334155, { metalness: 0.55, roughness: 0.4 }),
    );
    cradle.position.set(0, padY + 0.16 - shaftY, 0);
    this.motorGroup.add(cradle);
    for (const xz of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8),
        metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.25 }),
      );
      bolt.position.set(xz[0], padY + 0.26 - shaftY, xz[1]);
      this.motorGroup.add(bolt);
    }

    // Main cylinder housing (axis along +X)
    this.motor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 1.45, 32),
      metalMaterial(0x64748b, { metalness: 0.6, roughness: 0.35 }),
    );
    this.motor.rotation.z = Math.PI / 2;
    this.motorGroup.add(this.motor);
    tip(this.motor, 'Induction motor', 'Lagging inductive load: current lags voltage by φ. Real power is V·I·cosφ.');
    this.scene.add(placeLabel('motor', -1.1, shaftY + 1.05, 0, '#94a3b8', 0.9));

    // Cooling fins around housing
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.04, 0.12),
        metalMaterial(0x475569, { metalness: 0.55, roughness: 0.4 }),
      );
      fin.position.set(0, Math.cos(ang) * 0.68, Math.sin(ang) * 0.68);
      fin.rotation.x = ang;
      this.motorGroup.add(fin);
    }

    // End bells
    for (const x of [-0.78, 0.78]) {
      const bell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.12, 28),
        metalMaterial(0x475569, { metalness: 0.65, roughness: 0.32 }),
      );
      bell.rotation.z = Math.PI / 2;
      bell.position.x = x;
      this.motorGroup.add(bell);
    }

    // Terminal box on top
    const termBox = new THREE.Mesh(
      roundedBoxGeometry(0.45, 0.28, 0.4, 0.04, 3),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    termBox.position.set(-0.15, 0.78, 0);
    this.motorGroup.add(termBox);

    // Shaft + coupling + load disc
    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1.15, 16),
      metalMaterial(0xcbd5e1, { metalness: 0.75, roughness: 0.25 }),
    );
    this.shaft.rotation.z = Math.PI / 2;
    this.shaft.position.set(1.15, 0, 0);
    this.motorGroup.add(this.shaft);

    const coupling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16),
      metalMaterial(0xf59e0b, { metalness: 0.5, roughness: 0.4 }),
    );
    coupling.rotation.z = Math.PI / 2;
    coupling.position.set(0.95, 0, 0);
    this.motorGroup.add(coupling);

    this.loadDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.14, 28),
      plasticMaterial(0x334155, { roughness: 0.55 }),
    );
    this.loadDisc.rotation.z = Math.PI / 2;
    this.loadDisc.position.set(1.65, 0, 0);
    this.motorGroup.add(this.loadDisc);
    tip(this.loadDisc, 'Load / flywheel', 'Mechanical load on the shaft. Spin rate slows visually when power factor is poor.');

    // Keyway mark on disc for spin visibility
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.5, 0.06),
      metalMaterial(0xfbbf24, { metalness: 0.4, roughness: 0.45 }),
    );
    key.position.set(1.74, 0.2, 0);
    this.motorGroup.add(key);
    this._discKey = key;

    // --- AC supply box ---
    this.acSupply = new THREE.Group();
    this.acSupply.position.set(-2.45, padY + 0.55, 0.55);
    this.scene.add(this.acSupply);
    const supplyCase = new THREE.Mesh(
      roundedBoxGeometry(0.9, 0.75, 0.75, 0.06, 3),
      plasticMaterial(0xf59e0b, { roughness: 0.48 }),
    );
    this.acSupply.add(supplyCase);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.04),
      plasticMaterial(0x0f172a, { roughness: 0.4 }),
    );
    panel.position.set(0, 0.12, 0.38);
    this.acSupply.add(panel);
    // Pilot lamp
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
    );
    lamp.position.set(0.22, 0.22, 0.4);
    this.acSupply.add(lamp);
    attachGlow(lamp, 0x4ade80, 0.35);
    tip(supplyCase, 'AC supply', 'Provides V_rms to the motor. Apparent power S = V·I; real power is S·cosφ.');
    this.scene.add(placeLabel('AC supply', -2.45, padY + 1.15, 0.55, '#fde68a', 0.9));

    // --- Wattmeter panel ---
    this.wattmeter = new THREE.Group();
    this.wattmeter.position.set(2.15, padY + 0.6, 0);
    this.scene.add(this.wattmeter);
    const wmCase = new THREE.Mesh(
      roundedBoxGeometry(1.05, 0.95, 0.7, 0.06, 3),
      plasticMaterial(0x1e293b, { roughness: 0.45 }),
    );
    this.wattmeter.add(wmCase);
    const dialFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.05, 28),
      metalMaterial(0xf1f5f9, { metalness: 0.15, roughness: 0.55 }),
    );
    dialFace.rotation.x = Math.PI / 2;
    dialFace.position.set(0, 0.15, 0.32);
    this.wattmeter.add(dialFace);
    this.wmNeedle = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    );
    this.wmNeedle.position.set(0, 0.18, 0.38);
    this.wattmeter.add(this.wmNeedle);
    // Scale ticks
    for (let i = -3; i <= 3; i++) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.012, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x334155 }),
      );
      const a = (i / 3) * 0.7;
      tick.position.set(Math.sin(a) * 0.22, 0.18, 0.32 + Math.cos(a) * 0.22);
      this.wattmeter.add(tick);
    }
    tip(wmCase, 'Wattmeter', 'Reads real power P = V I cosφ. Needle drops as φ grows (poorer PF).');
    this.scene.add(placeLabel('wattmeter', 2.15, padY + 1.3, 0, '#e2e8f0', 0.9));

    // Connecting cables: supply → motor → wattmeter
    const sOut = new THREE.Vector3(-2.1, padY + 0.7, 0.55);
    const mIn = new THREE.Vector3(-1.25, shaftY + 0.78, 0);
    const mOut = new THREE.Vector3(-0.95, shaftY + 0.78, 0);
    const wIn = new THREE.Vector3(1.7, padY + 0.75, 0);
    this.scene.add(cable(sOut, new THREE.Vector3(-1.7, padY + 1.1, 0.35), 0xdc2626));
    this.scene.add(cable(new THREE.Vector3(-1.7, padY + 1.1, 0.35), mIn, 0xdc2626));
    this.scene.add(cable(sOut.clone().add(new THREE.Vector3(0, -0.12, -0.15)), new THREE.Vector3(-1.7, padY + 0.95, -0.1), 0x2563eb));
    this.scene.add(cable(new THREE.Vector3(-1.7, padY + 0.95, -0.1), mIn.clone().add(new THREE.Vector3(0.1, 0, -0.1)), 0x2563eb));
    this.scene.add(cable(mOut, wIn, 0x16a34a));

    // Phasor arrows above the motor (kept for teaching / pickables)
    this.vArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.75, 12),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    );
    this.vArrow.position.set(-1.1, 1.85, 0);
    this.scene.add(this.vArrow);
    tip(this.vArrow, 'Voltage phasor', 'Reference phasor V.');
    attachGlow(this.vArrow, 0x60a5fa, 0.7);

    this.iArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.65, 12),
      new THREE.MeshBasicMaterial({ color: 0xf472b6 }),
    );
    this.iArrow.position.set(-0.5, 1.85, 0);
    this.scene.add(this.iArrow);
    tip(this.iArrow, 'Current phasor', 'I lags V by φ for inductive motors.');
    attachGlow(this.iArrow, 0xf472b6, 0.65);

    this._liveLbl = placeLabel('PF = --', 0.2, 2.55, 0, '#e2e8f0', 1.1);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.Vrms != null) this.state.Vrms = p.Vrms;
    if (p.Irms != null) this.state.Irms = p.Irms;
    if (p.phiDeg != null) this.state.phiDeg = p.phiDeg;

    const phi = degToRad(this.state.phiDeg);
    this.iArrow.rotation.z = -phi;
    this.iArrow.position.set(
      -1.1 + 0.55 * Math.cos(-phi),
      1.85 + 0.3 * Math.sin(-phi),
      0,
    );

    const pf = powerFactor(this.state.Vrms, this.state.Irms, phi);
    const P = realPower(this.state.Vrms, this.state.Irms, phi);
    // Shaft spins slower when PF is poor
    this._spinRate = 0.015 + 0.055 * Math.max(0.05, pf);

    if (this.wmNeedle) {
      const deflect = Math.max(-0.75, Math.min(0.75, (pf - 0.5) * 1.5));
      this.wmNeedle.rotation.y = deflect;
    }

    this._updateLabel(pf, P);
  }

  _updateLabel(pf, P) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'PF=' + pf.toFixed(3) + ' lag  P=' + P.toFixed(0) + ' W  φ=' + this.state.phiDeg.toFixed(0) + '°',
      192, 24,
    );
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.motor, this.loadDisc, this.vArrow, this.iArrow].filter(Boolean);
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
      this.phase += 0.05;
      const r = this._spinRate != null ? this._spinRate : 0.04;
      this.loadDisc.rotation.x += r;
      this.shaft.rotation.x += r;
      if (this._discKey) this._discKey.rotation.x += r;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
