// Rotating magnetic field — cutaway 3-phase stator with animated B vector.
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
  glowSphere,
} from '../common/sceneVisuals.js';
import { resultantB, idealMagnitude, omegaFromFreq, phaseComponents } from './physics.js';

export class RotatingMagneticFieldScene3D {
  constructor(container) {
    this.container = container;
    this.state = { freq: 50, B0: 1, showComponents: 1 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._t = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(4.2, 5.2, 7.0);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.35, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this.coils = [];
    this._compArrows = [];
    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -1.55;
    const cy = 0.45;
    const R = 1.75;

    // Bench pad + pedestal
    const pad = new THREE.Mesh(
      roundedBoxGeometry(4.6, 0.14, 4.6, 0.08, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    pad.position.set(0, padY, 0);
    this.scene.add(pad);
    this.scene.add(contactShadow(2.2, 2.2, 0.4).translateY(padY - 0.072));

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.3, 0.35, 32),
      metalMaterial(0x334155, { metalness: 0.55, roughness: 0.4 }),
    );
    pedestal.position.set(0, padY + 0.28, 0);
    this.scene.add(pedestal);

    // Cutaway stator frame (open cylinder / laminated yoke)
    this.stator = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.22, R + 0.22, 1.35, 48, 1, true),
      metalMaterial(0x475569, { metalness: 0.5, roughness: 0.42 }),
    );
    this.stator.position.set(0, cy, 0);
    this.scene.add(this.stator);
    tip(this.stator, 'Stator', 'Cutaway frame of a 3-phase machine. Windings sit in slots at 120° spacing.');
    this.scene.add(placeLabel('stator', 0, cy + 1.15, R + 0.55, '#94a3b8', 0.9));

    // Outer reinforcing rings
    for (const yOff of [-0.55, 0.55]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(R + 0.22, 0.06, 10, 48),
        metalMaterial(0x334155, { metalness: 0.6, roughness: 0.35 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, cy + yOff, 0);
      this.scene.add(ring);
    }

    // Laminated look: thin axial ribs
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      // Leave a cutaway opening in +X hemisphere front for visibility
      if (ang > -0.35 && ang < 0.9) continue;
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.2, 0.12),
        metalMaterial(0x64748b, { metalness: 0.45, roughness: 0.5 }),
      );
      rib.position.set(Math.cos(ang) * (R + 0.18), cy, Math.sin(ang) * (R + 0.18));
      rib.rotation.y = -ang;
      this.scene.add(rib);
    }

    // Three phase windings at 120° — R / Y / B
    const colors = [0xef4444, 0xeab308, 0x3b82f6];
    const labels = ['Phase A', 'Phase B', 'Phase C'];
    const shortLabels = ['A', 'B', 'C'];
    const labelColors = ['#fca5a5', '#fde047', '#93c5fd'];

    for (let i = 0; i < 3; i++) {
      const ang = (i * 120 * Math.PI) / 180;
      const group = new THREE.Group();
      const cx = Math.cos(ang) * R;
      const cz = Math.sin(ang) * R;
      group.position.set(cx, cy, cz);
      // Face the stator axis so torus holes point radially (cutaway view).
      group.lookAt(0, cy, 0);

      // Wound cylinder / coil bundle
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.11, 10, 24),
        metalMaterial(colors[i], {
          metalness: 0.35,
          roughness: 0.5,
          emissive: colors[i],
          emissiveIntensity: 0.15,
        }),
      );
      group.add(coil);

      // Extra winding turns as stacked tori
      for (const s of [0.9, 1.1]) {
        const turn = new THREE.Mesh(
          new THREE.TorusGeometry(0.38 * s, 0.05, 8, 20),
          metalMaterial(colors[i], { metalness: 0.4, roughness: 0.45 }),
        );
        turn.position.z = (s - 1) * 0.12;
        group.add(turn);
      }

      // Slot wedge hint
      const wedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.9, 0.12),
        plasticMaterial(0x1e293b, { roughness: 0.55 }),
      );
      group.add(wedge);

      this.scene.add(group);
      this.coils.push(coil);
      tip(coil, labels[i], 'Winding axis for ' + labels[i] + '. Phase currents are 120° apart in time.');
      this.scene.add(placeLabel(
        shortLabels[i],
        Math.cos(ang) * (R + 0.85),
        cy + 0.75,
        Math.sin(ang) * (R + 0.85),
        labelColors[i],
        0.85,
      ));

      // Component axis arrow (optional visibility)
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)),
        new THREE.Vector3(0, cy, 0),
        1.1,
        colors[i],
        0.22,
        0.12,
      );
      if (arrow.line && arrow.line.material) {
        arrow.line.material.transparent = true;
        arrow.line.material.opacity = 0.35;
      }
      if (arrow.cone && arrow.cone.material) {
        arrow.cone.material.transparent = true;
        arrow.cone.material.opacity = 0.45;
      }
      this.scene.add(arrow);
      this._compArrows.push(arrow);
    }

    // Central rotor — squirrel-cage hint (bars + end rings)
    this.rotorGroup = new THREE.Group();
    this.rotorGroup.position.set(0, cy, 0);
    this.scene.add(this.rotorGroup);

    this.rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.05, 24),
      metalMaterial(0x94a3b8, { metalness: 0.55, roughness: 0.4 }),
    );
    this.rotorGroup.add(this.rotor);
    tip(this.rotor, 'Rotor', 'Follows the rotating field (ideal sync shown). Bars hint at a squirrel-cage construction.');
    this.scene.add(placeLabel('rotor', 0.85, cy + 0.95, 0.2, '#fde047', 0.85));

    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.95, 0.06),
        metalMaterial(0xfbbf24, { metalness: 0.65, roughness: 0.3 }),
      );
      bar.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);
      this.rotorGroup.add(bar);
    }
    for (const yOff of [-0.48, 0.48]) {
      const endRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.04, 8, 24),
        metalMaterial(0xf59e0b, { metalness: 0.7, roughness: 0.28 }),
      );
      endRing.rotation.x = Math.PI / 2;
      endRing.position.y = yOff;
      this.rotorGroup.add(endRing);
    }
    // Shaft stubs
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.6, 12),
      metalMaterial(0xcbd5e1, { metalness: 0.75, roughness: 0.25 }),
    );
    this.rotorGroup.add(shaft);

    // Animated rotating B resultant — glowing cone + trail sphere
    this.bArrowGroup = new THREE.Group();
    this.bArrowGroup.position.set(0, cy, 0);
    this.scene.add(this.bArrowGroup);

    this.bArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 1.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xe879f9 }),
    );
    this.bArrow.position.set(0.55, 0, 0);
    this.bArrow.rotation.z = -Math.PI / 2;
    this.bArrowGroup.add(this.bArrow);
    attachGlow(this.bArrow, 0xe879f9, 1.2);
    tip(this.bArrow, 'B_rot', 'Resultant rotating field — magnitude ≈ 1.5 B₀ for balanced three-phase.');

    this.bGlow = glowSphere(0.12, 0xe879f9, { pick: false });
    this.bGlow.position.set(1.15, 0, 0);
    this.bArrowGroup.add(this.bGlow);

    // Shaft of the arrow
    const bShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.85 }),
    );
    bShaft.rotation.z = Math.PI / 2;
    bShaft.position.set(0.2, 0, 0);
    this.bArrowGroup.add(bShaft);

    this._liveLbl = placeLabel('|B| = --', 0, 2.35, 0, '#e2e8f0', 1.1);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.freq != null) this.state.freq = p.freq;
    if (p.B0 != null) this.state.B0 = p.B0;
    if (p.showComponents != null) this.state.showComponents = p.showComponents;

    const show = !!this.state.showComponents;
    for (let i = 0; i < this._compArrows.length; i++) {
      this._compArrows[i].visible = show;
    }

    const Brot = idealMagnitude(this.state.B0);
    const sc = 0.65 + 0.45 * this.state.B0;
    this.bArrowGroup.scale.setScalar(sc);
    this._updateLabel(Brot);
  }

  _updateLabel(Brot) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#e879f9';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '|B_rot|≈' + Brot.toFixed(2) + ' (=1.5 B₀)  f=' + this.state.freq.toFixed(0) + ' Hz',
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
    const list = [this.stator, this.bArrow, this.rotor];
    for (let i = 0; i < this.coils.length; i++) list.push(this.coils[i]);
    return list.filter(Boolean);
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
      this._t += 0.02 * (this.state.freq / 50);
      const omega = omegaFromFreq(this.state.freq);
      const res = resultantB(this.state.B0, omega, this._t);
      const ang = Math.atan2(res.By, res.Bx);
      this.bArrowGroup.rotation.y = -ang;
      this.rotorGroup.rotation.y = -ang;

      // Pulse coil emissive with phase currents
      const comps = phaseComponents(this.state.B0, omega, this._t);
      const vals = [comps.Ba, comps.Bb, comps.Bc];
      for (let i = 0; i < this.coils.length; i++) {
        const c = this.coils[i];
        if (c.material) {
          c.material.emissiveIntensity = 0.08 + 0.35 * Math.abs(vals[i]);
        }
      }
      if (this.bGlow) {
        this.bGlow.scale.setScalar(0.85 + 0.25 * Math.sin(this.phase * 4));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
