// EM wave radiation — RF short dipole on a lab tripod/bench stand with coax feed.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { wavelength, farFieldDistance, patternSinTheta } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  glowSphere,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
  dashedGuide,
  attachGlow,
} from '../common/sceneVisuals.js';

export class EmWaveRadiationScene3D {
  constructor(container) {
    this.container = container;
    this.state = { frequency: 1e8, amplitude: 0.8, showNearFar: 1 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.4, 3.4, 6.8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.2, 0.55, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -0.95;
    const antennaX = 0.35;
    const antennaY = 1.15;

    // --- Bench pad under the whole apparatus ---
    const pad = new THREE.Mesh(
      roundedBoxGeometry(3.6, 0.12, 2.2, 0.06, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    pad.position.set(0.1, padY, 0);
    this.scene.add(pad);
    const shadow = contactShadow(2.0, 1.25, 0.42);
    shadow.position.set(0.1, padY - 0.061, 0);
    this.scene.add(shadow);

    // --- Tripod stand (three splayed legs + collar + mast) ---
    const standMat = metalMaterial(0x64748b, { metalness: 0.75, roughness: 0.3 });
    const collarY = 0.05;
    const legLen = collarY - (padY + 0.06);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.35;
      const footX = antennaX + Math.cos(a) * 0.55;
      const footZ = Math.sin(a) * 0.55;
      const midX = (antennaX + footX) * 0.5;
      const midZ = (0 + footZ) * 0.5;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, legLen, 10), standMat);
      leg.position.set(midX, (collarY + padY + 0.06) / 2, midZ);
      leg.rotation.z = Math.atan2(footX - antennaX, legLen) * 0.55;
      leg.rotation.x = -Math.atan2(footZ, legLen) * 0.55;
      this.scene.add(leg);
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.04, 12),
        metalMaterial(0x334155, { metalness: 0.6, roughness: 0.4 }),
      );
      foot.position.set(footX, padY + 0.08, footZ);
      this.scene.add(foot);
    }
    const collar = new THREE.Mesh(
      roundedBoxGeometry(0.28, 0.14, 0.28, 0.04, 3),
      metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 }),
    );
    collar.position.set(antennaX, collarY, 0);
    this.scene.add(collar);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, antennaY - collarY - 0.15, 16),
      standMat,
    );
    mast.position.set(antennaX, (antennaY + collarY - 0.05) / 2, 0);
    this.scene.add(mast);

    // Insulator clamp holding the dipole
    const clamp = new THREE.Mesh(
      roundedBoxGeometry(0.22, 0.18, 0.22, 0.03, 3),
      plasticMaterial(0x1e3a5f, { roughness: 0.55 }),
    );
    clamp.position.set(antennaX, antennaY - 0.02, 0);
    this.scene.add(clamp);

    // --- Vertical short dipole (two rods + feed gap) ---
    this.dipoleGroup = new THREE.Group();
    this.dipoleGroup.position.set(antennaX, antennaY, 0);
    this.scene.add(this.dipoleGroup);

    const armMat = metalMaterial(0xcbd5e1, { metalness: 0.65, roughness: 0.28 });
    this.upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 16), armMat);
    this.upperArm.position.y = 0.58;
    this.dipoleGroup.add(this.upperArm);
    const upperTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), armMat);
    upperTip.position.y = 1.06;
    this.dipoleGroup.add(upperTip);

    this.lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 16), armMat);
    this.lowerArm.position.y = -0.58;
    this.dipoleGroup.add(this.lowerArm);
    const lowerTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), armMat);
    lowerTip.position.y = -1.06;
    this.dipoleGroup.add(lowerTip);

    // Feed gap block (balun / center insulator)
    this.feed = new THREE.Mesh(
      roundedBoxGeometry(0.14, 0.16, 0.14, 0.02, 3),
      metalMaterial(0x38bdf8, { metalness: 0.45, roughness: 0.4, emissive: 0x0c4a6e, emissiveIntensity: 0.25 }),
    );
    this.dipoleGroup.add(this.feed);
    attachGlow(this.feed, 0x38bdf8, 0.55);
    tip(this.feed, 'Dipole feed gap', 'Oscillating charge separation across the feed launches EM waves. Far-field pattern ~ sinθ.');
    tip(this.upperArm, 'Dipole arm', 'Half of a short RF dipole. Strongest radiation broadside; nulls along the axis.');

    // Charge markers at tips (oscillation cue)
    this.qPlus = glowSphere(0.09, 0xf87171, { pick: false });
    this.qPlus.position.y = 1.12;
    this.dipoleGroup.add(this.qPlus);
    this.qMinus = glowSphere(0.09, 0x60a5fa, { pick: false });
    this.qMinus.position.y = -1.12;
    this.dipoleGroup.add(this.qMinus);

    // --- RF generator box on the bench ---
    const genX = -1.35;
    const genY = padY + 0.38;
    this.rfBox = new THREE.Mesh(
      roundedBoxGeometry(0.95, 0.55, 0.7, 0.05, 3),
      plasticMaterial(0x0f172a, { roughness: 0.5 }),
    );
    this.rfBox.position.set(genX, genY, 0.15);
    this.scene.add(this.rfBox);
    tip(this.rfBox, 'RF source', 'Signal generator driving the dipole through a coax feed. Frequency sets λ = c/f.');

    // Panel face + dials/LEDs
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.32, 0.03),
      metalMaterial(0x1e293b, { metalness: 0.35, roughness: 0.55 }),
    );
    panel.position.set(genX, genY + 0.02, 0.15 + 0.36);
    this.scene.add(panel);
    this.rfLed = glowSphere(0.05, 0x4ade80, { pick: false });
    this.rfLed.position.set(genX + 0.28, genY + 0.12, 0.15 + 0.4);
    this.scene.add(this.rfLed);
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16),
      metalMaterial(0x94a3b8, { metalness: 0.6, roughness: 0.35 }),
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.set(genX - 0.2, genY + 0.02, 0.15 + 0.4);
    this.scene.add(dial);

    // Coax from generator to feed (segmented cable)
    const coaxMat = plasticMaterial(0x111827, { roughness: 0.65 });
    const coaxPts = [
      new THREE.Vector3(genX + 0.48, genY, 0.15),
      new THREE.Vector3(genX + 0.85, genY - 0.15, 0.05),
      new THREE.Vector3(antennaX - 0.35, padY + 0.25, 0),
      new THREE.Vector3(antennaX - 0.08, antennaY - 0.35, 0),
      new THREE.Vector3(antennaX, antennaY, 0),
    ];
    for (let i = 0; i < coaxPts.length - 1; i++) {
      const a = coaxPts[i];
      const b = coaxPts[i + 1];
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length() || 0.01;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), coaxMat);
      seg.position.copy(a).addScaledVector(dir, 0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      this.scene.add(seg);
    }
    // Connector ferrules
    const ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10),
      metalMaterial(0xd4d4d8, { metalness: 0.8, roughness: 0.25 }),
    );
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.set(genX + 0.5, genY, 0.15);
    this.scene.add(ferrule);

    // --- Expanding translucent wavefront rings (figure-8 flattened) ---
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.TorusGeometry(1.0, 0.018, 8, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(antennaX, antennaY, 0);
      this.scene.add(mesh);
      this.rings.push({ mesh: mesh, seed: i / 6 });
    }

    // Optional faint figure-8 lobes (polar pattern silhouette)
    this.patternGroup = new THREE.Group();
    this.patternGroup.position.set(antennaX, antennaY, 0);
    this.scene.add(this.patternGroup);
    const lobeMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 16), lobeMat.clone());
      lobe.scale.set(1.15, 0.55, 0.75);
      lobe.position.x = side * 0.55;
      this.patternGroup.add(lobe);
    }

    // Near/far teaching sphere
    this.nearSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.07,
        wireframe: true,
      }),
    );
    this.nearSphere.position.set(antennaX, antennaY, 0);
    this.scene.add(this.nearSphere);
    tip(this.nearSphere, 'Near / far boundary', 'Teaching estimate r_far ≈ 2λ. Inside: reactive near fields; outside: radiating 1/r waves.');

    this.axisGuide = dashedGuide(
      [
        new THREE.Vector3(antennaX, antennaY - 1.4, 0),
        new THREE.Vector3(antennaX, antennaY + 1.4, 0),
      ],
      0x64748b,
      0.3,
    );
    this.scene.add(this.axisGuide);

    this.scene.add(placeLabel('dipole', antennaX + 0.55, antennaY + 1.35, 0, '#cbd5e1', 0.95));
    this.scene.add(placeLabel('RF source', genX, genY + 0.55, 0.2, '#94a3b8', 0.9));
    this.scene.add(placeLabel('wavefront', antennaX + 2.0, antennaY + 0.9, 0, '#67e8f9', 0.9));
    this._liveLbl = placeLabel('λ = --', antennaX, antennaY + 1.85, 0, '#67e8f9', 1.05);
    this.scene.add(this._liveLbl);

    this._antennaX = antennaX;
    this._antennaY = antennaY;
  }

  setParams(p) {
    if (!p) return;
    if (p.frequency != null) this.state.frequency = p.frequency;
    if (p.amplitude != null) this.state.amplitude = p.amplitude;
    if (p.showNearFar != null) this.state.showNearFar = p.showNearFar;

    const lam = wavelength(this.state.frequency);
    const rff = farFieldDistance(this.state.frequency);
    this.nearSphere.visible = this.state.showNearFar > 0.5;
    this.nearSphere.scale.setScalar(Math.max(0.55, Math.min(2.1, rff / 4)));
    this.patternGroup.visible = this.state.showNearFar > 0.5;
    this._updateLabel(lam, rff);
  }

  _updateLabel(lam, rff) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#67e8f9';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('λ=' + lam.toFixed(2) + ' m   r_far≈' + rff.toFixed(2) + ' m', 192, 24);
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.upperArm, this.feed, this.rfBox, this.nearSphere].filter(Boolean);
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
      const amp = this.state.amplitude;
      const osc = Math.sin(this.phase * 2.2);
      const stretch = 1 + 0.07 * osc * amp;
      this.upperArm.scale.y = stretch;
      this.lowerArm.scale.y = stretch;
      this.qPlus.position.y = 1.12 * stretch;
      this.qMinus.position.y = -1.12 * stretch;
      this.qPlus.material.opacity = 0.45 + 0.45 * Math.max(0, osc);
      this.qMinus.material.opacity = 0.45 + 0.45 * Math.max(0, -osc);
      if (this.rfLed && this.rfLed.material) {
        this.rfLed.material.opacity = 0.55 + 0.4 * Math.abs(osc);
        this.rfLed.scale.setScalar(0.85 + 0.25 * Math.abs(osc));
      }

      const sy = 0.32 + 0.68 * patternSinTheta(Math.PI / 2);
      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i];
        const t = (this.phase * 0.11 + r.seed) % 1;
        const radius = 0.55 + t * 3.6;
        r.mesh.scale.set(radius, radius * sy, radius);
        r.mesh.material.opacity = (1 - t) * 0.42 * Math.min(1.2, amp);
      }
      this.patternGroup.rotation.y = this.phase * 0.15;
      const pulse = 0.06 + 0.04 * Math.sin(this.phase * 1.5);
      for (let li = 0; li < this.patternGroup.children.length; li++) {
        const lobe = this.patternGroup.children[li];
        if (lobe.material) lobe.material.opacity = pulse * amp;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
