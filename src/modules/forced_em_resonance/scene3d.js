// Forced EM resonance — RLC bench with FG, ammeter, banana wires, resonance glow.
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
import { f0, currentAmp, qualityFactor } from './physics.js';

function resistorMaterial() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 16;
  const c = cv.getContext('2d');
  c.fillStyle = '#d6c199';
  c.fillRect(0, 0, 64, 16);
  const bands = ['#8b5e34', '#1f2937', '#dc2626', '#f59e0b'];
  for (let i = 0; i < bands.length; i++) {
    c.fillStyle = bands[i];
    c.fillRect(10 + i * 11, 0, 5, 16);
  }
  const tex = new THREE.CanvasTexture(cv);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.15 });
}

function bananaWire(a, b, color) {
  // Slightly bowed cable via mid control offset
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mid.y += 0.22;
  const group = new THREE.Group();
  const segs = [
    [a, mid],
    [mid, b],
  ];
  for (let i = 0; i < segs.length; i++) {
    const p0 = segs[i][0];
    const p1 = segs[i][1];
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length() || 0.001;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, len, 8),
      plasticMaterial(color, { roughness: 0.5 }),
    );
    mesh.position.copy(p0).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(mesh);
  }
  // Banana plugs
  for (const p of [a, b]) {
    const plug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10),
      metalMaterial(color, { metalness: 0.6, roughness: 0.35 }),
    );
    plug.position.copy(p);
    group.add(plug);
  }
  return group;
}

export class ForcedEmResonanceScene3D {
  constructor(container) {
    this.container = container;
    this.state = { V: 10, R: 10, L: 0.05, C: 1e-6, f: 700 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._nearRes = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.2, 3.4, 6.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.05, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -1.45;
    const boardY = padY + 0.12;
    const compY = boardY + 0.28;

    // Acrylic / wood breadboard base
    this.bench = new THREE.Mesh(
      roundedBoxGeometry(5.6, 0.16, 2.4, 0.08, 3),
      plasticMaterial(0x3d2914, { roughness: 0.72 }),
    );
    this.bench.position.set(0, boardY, 0);
    this.scene.add(this.bench);
    // Lighter acrylic top strip
    const acrylic = new THREE.Mesh(
      roundedBoxGeometry(5.2, 0.04, 2.0, 0.05, 3),
      plasticMaterial(0x1e293b, { roughness: 0.35 }),
    );
    acrylic.position.set(0, boardY + 0.1, 0);
    this.scene.add(acrylic);
    this.scene.add(contactShadow(2.6, 1.2, 0.4).translateY(padY - 0.05));

    // Breadboard hole texture hint (rows of dots)
    for (let row = -3; row <= 3; row++) {
      for (let col = -8; col <= 8; col++) {
        if ((col + row) % 2 !== 0) continue;
        const hole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.02, 6),
          metalMaterial(0x0f172a, { metalness: 0.3, roughness: 0.7 }),
        );
        hole.position.set(col * 0.28, boardY + 0.13, row * 0.22);
        this.scene.add(hole);
      }
    }

    // --- Function generator ---
    this.source = new THREE.Mesh(
      roundedBoxGeometry(0.95, 0.7, 0.85, 0.06, 3),
      plasticMaterial(0xfbbf24, { roughness: 0.48 }),
    );
    this.source.position.set(-2.15, compY + 0.15, 0);
    this.scene.add(this.source);
    const fgPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.4, 0.04),
      plasticMaterial(0x0f172a, { roughness: 0.4 }),
    );
    fgPanel.position.set(-2.15, compY + 0.22, 0.42);
    this.scene.add(fgPanel);
    // Knobs
    for (const dx of [-0.2, 0.05, 0.28]) {
      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
        metalMaterial(0x94a3b8, { metalness: 0.7, roughness: 0.3 }),
      );
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-2.15 + dx, compY + 0.28, 0.45);
      this.scene.add(knob);
    }
    tip(this.source, 'Function generator', 'Drive voltage V at frequency f. Sweep f through resonance to maximize I.');
    this.scene.add(placeLabel('FG', -2.15, compY + 0.75, 0, '#fde68a', 0.85));

    // --- Resistor (banded cylinder) ---
    this.resistor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.65, 16),
      resistorMaterial(),
    );
    this.resistor.rotation.z = Math.PI / 2;
    this.resistor.position.set(-0.85, compY, 0);
    this.scene.add(this.resistor);
    // End caps / leads
    for (const sx of [-0.4, 0.4]) {
      const lead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8),
        metalMaterial(0xcbd5e1, { metalness: 0.8, roughness: 0.25 }),
      );
      lead.rotation.z = Math.PI / 2;
      lead.position.set(-0.85 + sx, compY, 0);
      this.scene.add(lead);
    }
    tip(this.resistor, 'Resistor R', 'Sets bandwidth and Q = ω₀ L / R. Larger R lowers peak current.');
    this.scene.add(placeLabel('R', -0.85, compY + 0.45, 0.35, '#fca5a5', 0.8));

    // --- Inductor (multi-turn coil on former) ---
    this.inductorGroup = new THREE.Group();
    this.inductorGroup.position.set(0.35, compY, 0);
    this.scene.add(this.inductorGroup);

    const former = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16),
      plasticMaterial(0x334155, { roughness: 0.55 }),
    );
    former.rotation.z = Math.PI / 2;
    this.inductorGroup.add(former);

    this.inductor = new THREE.Group();
    this.inductorGroup.add(this.inductor);
    for (let i = 0; i < 9; i++) {
      const turn = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.035, 8, 20),
        metalMaterial(0x60a5fa, { metalness: 0.7, roughness: 0.28 }),
      );
      turn.rotation.y = Math.PI / 2;
      turn.position.x = (i - 4) * 0.065;
      this.inductor.add(turn);
    }
    // Pickable stand-in (Group itself is not a clean raycast target)
    this._inductorPick = this.inductor.children[4] || this.inductor.children[0];
    tip(this._inductorPick, 'Inductor L', 'ωL term in series impedance. Cancels 1/(ωC) at resonance.');
    this.scene.add(placeLabel('L', 0.35, compY + 0.5, 0.4, '#93c5fd', 0.8));

    // --- Capacitor cans ---
    this.capGroup = new THREE.Group();
    this.capGroup.position.set(1.45, boardY + 0.1, 0);
    this.scene.add(this.capGroup);

    this.capA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.55, 20),
      metalMaterial(0x34d399, { metalness: 0.45, roughness: 0.4 }),
    );
    this.capA.position.set(-0.16, 0.35, 0);
    this.capGroup.add(this.capA);
    this.capB = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.55, 20),
      metalMaterial(0x10b981, { metalness: 0.45, roughness: 0.4 }),
    );
    this.capB.position.set(0.16, 0.35, 0);
    this.capGroup.add(this.capB);
    // Cap tops
    for (const cap of [this.capA, this.capB]) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20),
        metalMaterial(0xcbd5e1, { metalness: 0.7, roughness: 0.3 }),
      );
      top.position.y = 0.3;
      cap.add(top);
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6),
        metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.25 }),
      );
      pin.position.y = -0.35;
      cap.add(pin);
    }
    tip(this.capA, 'Capacitor C', '1/(ωC) cancels ωL at resonance — current peaks at f₀.');
    tip(this.capB, 'Capacitor C', '1/(ωC) cancels ωL at resonance — current peaks at f₀.');
    this.scene.add(placeLabel('C', 1.45, compY + 0.55, 0.4, '#6ee7b7', 0.8));

    // --- Ammeter ---
    this.ammeter = new THREE.Group();
    this.ammeter.position.set(2.35, compY + 0.1, 0);
    this.scene.add(this.ammeter);
    const amCase = new THREE.Mesh(
      roundedBoxGeometry(0.75, 0.65, 0.7, 0.05, 3),
      plasticMaterial(0x0f172a, { roughness: 0.45 }),
    );
    this.ammeter.add(amCase);
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24),
      metalMaterial(0xf1f5f9, { metalness: 0.1, roughness: 0.55 }),
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 0.08, 0.32);
    this.ammeter.add(dial);
    this.amNeedle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    );
    this.amNeedle.position.set(0, 0.1, 0.36);
    this.ammeter.add(this.amNeedle);
    tip(amCase, 'Ammeter', 'Series current I = V / Z. Peaks when f ≈ f₀.');
    this.scene.add(placeLabel('ammeter', 2.35, compY + 0.7, 0, '#e2e8f0', 0.85));

    // Banana wires along the series chain
    const yW = compY + 0.05;
    const pts = [
      new THREE.Vector3(-1.75, yW, 0.35),
      new THREE.Vector3(-1.25, yW, 0.35),
      new THREE.Vector3(-0.45, yW, 0.35),
      new THREE.Vector3(0.0, yW, 0.35),
      new THREE.Vector3(0.75, yW, 0.35),
      new THREE.Vector3(1.15, yW, 0.35),
      new THREE.Vector3(1.85, yW, 0.35),
      new THREE.Vector3(2.05, yW, 0.35),
    ];
    this.scene.add(bananaWire(new THREE.Vector3(-1.75, yW + 0.15, 0.2), pts[1], 0xdc2626));
    this.scene.add(bananaWire(pts[2], pts[3], 0x2563eb));
    this.scene.add(bananaWire(pts[4], pts[5], 0x16a34a));
    this.scene.add(bananaWire(pts[6], new THREE.Vector3(2.1, yW + 0.1, 0.2), 0xf59e0b));
    // Return path under board front
    this.scene.add(bananaWire(
      new THREE.Vector3(2.1, yW - 0.15, -0.45),
      new THREE.Vector3(-1.75, yW - 0.15, -0.45),
      0x64748b,
    ));

    // Resonance glow along the circuit path
    this.wireGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 4.0, 10),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    this.wireGlow.rotation.z = Math.PI / 2;
    this.wireGlow.position.set(0.1, boardY + 0.18, 0);
    this.scene.add(this.wireGlow);
    this.resGlow = glowSphere(0.2, 0x2dd4bf, { pick: false });
    this.resGlow.position.set(0.35, compY + 0.35, 0);
    this.resGlow.material.opacity = 0.05;
    this.scene.add(this.resGlow);
    attachGlow(this.inductorGroup, 0x2dd4bf, 1.4);
    this._coilHalo = this.inductorGroup.children[this.inductorGroup.children.length - 1];
    if (this._coilHalo && this._coilHalo.material) this._coilHalo.material.opacity = 0.08;

    this._liveLbl = placeLabel('I = --', 0, 1.55, 0, '#e2e8f0', 1.1);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.V != null) this.state.V = p.V;
    if (p.R != null) this.state.R = p.R;
    if (p.L != null) this.state.L = p.L;
    if (p.C != null) this.state.C = p.C;
    if (p.f != null) this.state.f = p.f;

    const fres = f0(this.state.L, this.state.C);
    const w = 2 * Math.PI * this.state.f;
    const I = currentAmp(this.state.V, this.state.R, w, this.state.L, this.state.C);
    const Q = qualityFactor(this.state.L, this.state.C, this.state.R);
    const near = Math.abs(this.state.f - fres) / Math.max(fres, 1) < 0.1;
    this._nearRes = near;

    if (this.wireGlow && this.wireGlow.material) {
      this.wireGlow.material.opacity = near ? 0.5 : 0.1;
    }
    if (this.resGlow && this.resGlow.material) {
      this.resGlow.material.opacity = near ? 0.55 : 0.05;
      this.resGlow.scale.setScalar(near ? 1.4 : 0.6);
    }
    if (this._coilHalo && this._coilHalo.material) {
      this._coilHalo.material.opacity = near ? 0.55 : 0.08;
    }
    if (this.amNeedle) {
      const ang = Math.max(-0.7, Math.min(0.7, I * 0.15));
      this.amNeedle.rotation.y = ang;
    }

    this._updateLabel(I, fres, Q, near);
  }

  _updateLabel(I, fres, Q, near) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = near ? '#2dd4bf' : '#94a3b8';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'I=' + I.toFixed(3) + ' A  f₀=' + fres.toFixed(0) + ' Hz  Q=' + Q.toFixed(1) +
      (near ? '  RES' : ''),
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
    const ind = this._inductorPick || this.inductor;
    return [this.source, this.resistor, ind, this.capA, this.capB].filter(Boolean);
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
      this.inductor.rotation.x += this._nearRes ? 0.04 : 0.012;
      if (this.wireGlow && this.wireGlow.material && this._nearRes) {
        this.wireGlow.material.opacity = 0.35 + 0.25 * Math.sin(this.phase * 6);
      }
      if (this.resGlow && this._nearRes) {
        this.resGlow.scale.setScalar(1.2 + 0.25 * Math.sin(this.phase * 5));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
