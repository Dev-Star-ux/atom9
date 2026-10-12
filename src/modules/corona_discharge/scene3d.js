// Corona discharge — 3D needle-plane schematic: field concentration at a sharp tip.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { peekOnsetField, tipField, coronaActive } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  glowSphere,
  placeLabel,
  dashedGuide,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

export class CoronaDischargeScene3D {
  constructor(container) {
    this.container = container;
    this.state = { V: 20, r: 0.05, d: 10, delta: 1.0 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.1, 2.9, 6.9);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.2, 0.05, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // Layout constants (world units), independent of live r/d so geometry stays stable.
    this.xTip = -2.2;
    this.xPlane = 2.6;

    // --- Grounded plane: brushed-metal panel mounted on a small frame stand
    // so it reads as bench-mounted lab hardware, not a floating slab. ---
    const plane = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.6, 2.6),
      metalMaterial(0x94a3b8, { metalness: 0.55, roughness: 0.4 }),
    );
    plane.position.set(this.xPlane, 0.3, 0);
    this.scene.add(plane);
    this.plane = plane;
    this.scene.add(placeLabel('grounded plane', this.xPlane, 1.85, 0, '#cbd5e1', 1.0));
    tip(plane, 'Grounded plane', "Field lines terminate here — spread over a large area, so the local field stays low even near breakdown voltage.");

    // Plane mounting frame + base pad (flat plates: no extra rotation).
    const planeStandMat = metalMaterial(0x475569, { metalness: 0.7, roughness: 0.35 });
    const planePadY = -0.98;
    const planePad = new THREE.Mesh(
      roundedBoxGeometry(1.1, 0.12, 1.9, 0.05, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    planePad.position.set(this.xPlane, planePadY, 0);
    this.scene.add(planePad);
    const planeBottom = 0.3 - 1.3; // plane box bottom edge (-1.0)
    for (const zOff of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, planeBottom - (planePadY + 0.06), 12),
        planeStandMat,
      );
      leg.position.set(this.xPlane, (planeBottom + (planePadY + 0.06)) / 2, zOff);
      this.scene.add(leg);
    }
    const planeShadow = contactShadow(0.85, 1.3, 0.4);
    planeShadow.position.set(this.xPlane, planePadY - 0.061, 0);
    this.scene.add(planeShadow);

    // --- Needle group (cone tip pointing toward the plane, +x direction) ---
    this.needleGroup = new THREE.Group();
    this.needleGroup.position.set(this.xTip, 0.3, 0);
    this.scene.add(this.needleGroup);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 1.4, 20),
      metalMaterial(0xcbd5e1, { metalness: 0.6, roughness: 0.3 }),
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -0.7;
    this.needleGroup.add(shaft);

    this.needleCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.7, 24),
      metalMaterial(0xe2e8f0, { metalness: 0.65, roughness: 0.25 }),
    );
    this.needleCone.rotation.z = -Math.PI / 2;
    this.needleCone.position.x = 0.35;
    this.needleGroup.add(this.needleCone);
    tip(this.needleCone, 'Needle tip (radius r)', "Peek's law: E_onset = 30·δ·(1 + 0.301/√(δr)). A smaller r drives E_onset up steeply, but the tip field E_tip ~ V/(r·ln(2d/r)) rises even faster — so sharp tips corona first.");

    this.scene.add(placeLabel('needle (radius r)', this.xTip - 0.9, 1.1, 0, '#cbd5e1', 1.0));

    // Needle mounting post + clamp on its own base pad (kept outside
    // needleGroup so the sharpness-scaling on that group never distorts it).
    const needlePadY = -0.9;
    const needlePad = new THREE.Mesh(
      roundedBoxGeometry(0.85, 0.12, 0.85, 0.05, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    needlePad.position.set(this.xTip, needlePadY, 0);
    this.scene.add(needlePad);
    const needlePostTopY = 0.08;
    const needlePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, needlePostTopY - (needlePadY + 0.06), 16),
      metalMaterial(0x64748b, { metalness: 0.75, roughness: 0.3 }),
    );
    needlePost.position.set(this.xTip, (needlePostTopY + (needlePadY + 0.06)) / 2, 0);
    this.scene.add(needlePost);
    const needleClamp = new THREE.Mesh(
      roundedBoxGeometry(0.3, 0.2, 0.3, 0.04, 3),
      metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 }),
    );
    needleClamp.position.set(this.xTip, needlePostTopY, 0);
    this.scene.add(needleClamp);
    const needleShadow = contactShadow(0.6, 0.6, 0.4);
    needleShadow.position.set(this.xTip, needlePadY - 0.061, 0);
    this.scene.add(needleShadow);

    // Tip point in world space (local x=0.7 along cone axis end)
    this.tipLocalX = 0.7;

    // Gap guide line
    this.gapLine = dashedGuide(
      [new THREE.Vector3(this.xTip + this.tipLocalX, 1.3, 0), new THREE.Vector3(this.xPlane, 1.3, 0)],
      0x64748b, 0.4
    );
    this.scene.add(this.gapLine);
    this.scene.add(placeLabel('gap d', (this.xTip + this.tipLocalX + this.xPlane) / 2, 1.5, 0, '#94a3b8', 0.85));

    // "Full breakdown would look like this" contrast arc — faint, always dim red, never active.
    const arcPts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = (this.xTip + this.tipLocalX) + (this.xPlane - (this.xTip + this.tipLocalX)) * t;
      const yy = 0.3 + Math.sin(t * Math.PI) * 0.45;
      arcPts.push(new THREE.Vector3(x, yy, 0));
    }
    this.contrastArc = dashedGuide(arcPts, 0xf87171, 0.28);
    this.scene.add(this.contrastArc);
    this.scene.add(placeLabel('(full breakdown would look like this — corona does NOT)', (this.xTip + this.xPlane) / 2, 1.05, 0, '#f87171', 0.75));

    // Corona halo + streamers at the tip (toggled by setParams via coronaActive)
    this.tipWorld = new THREE.Vector3(this.xTip + this.tipLocalX, 0.3, 0);
    this.haloGroup = new THREE.Group();
    this.haloGroup.position.copy(this.tipWorld);
    this.scene.add(this.haloGroup);

    this.haloSphere = glowSphere(0.12, 0x67e8f9, { pick: false });
    this.haloGroup.add(this.haloSphere);
    tip(this.haloSphere, 'Corona glow', 'Localized ionization exactly where E_tip ≥ E_onset. It does NOT extend across the gap — that would be a full spark/arc.');

    this.streamers = [];
    const N_STREAM = 6;
    for (let i = 0; i < N_STREAM; i++) {
      const geo = new THREE.CylinderGeometry(0.012, 0.02, 0.5, 6);
      geo.translate(0, 0.25, 0);
      const mat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      this.haloGroup.add(mesh);
      this.streamers.push({ mesh: mesh, seed: i * 2.399963 });
    }
    this.haloGroup.visible = false;

    // Live readout label above the tip
    this._liveLbl = placeLabel('E_tip = --   E_onset = --', this.xTip + 0.3, 2.15, 0, '#e2e8f0', 1.15);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.V != null) this.state.V = p.V;
    if (p.r != null) this.state.r = p.r;
    if (p.d != null) this.state.d = p.d;
    if (p.delta != null) this.state.delta = p.delta;

    const { V, r, d, delta } = this.state;
    const Etip = tipField(V, r, d);
    const Eon = peekOnsetField(r, delta);
    const active = coronaActive(V, r, d, delta);

    // Scale needle sharpness visually with r (kept within a readable range).
    const scale = Math.max(0.5, Math.min(1.8, 0.06 / Math.max(r, 0.01)));
    this.needleGroup.scale.set(1, Math.min(1.4, Math.max(0.7, scale)), Math.min(1.4, Math.max(0.7, scale)));

    this.haloGroup.visible = active;
    this._activePhysics = active;
    this._updateLabel(Etip, Eon, active);
  }

  _updateLabel(Etip, Eon, active) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = active ? '#a78bfa' : '#94a3b8';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'E_tip=' + Etip.toFixed(1) + '  E_onset=' + Eon.toFixed(1) + ' kV/cm  ' + (active ? '(ACTIVE)' : '(inactive)'),
      192, 24
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
    return [this.needleCone, this.plane, this.haloSphere].filter(Boolean);
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
      if (this.haloGroup.visible) {
        const flick = 0.75 + 0.25 * Math.sin(this.phase * 9.3) * (0.6 + 0.4 * Math.sin(this.phase * 2.1));
        this.haloSphere.scale.setScalar(0.85 + 0.3 * flick);
        for (let i = 0; i < this.streamers.length; i++) {
          const s = this.streamers[i];
          const baseAngle = s.seed + this.phase * 0.4;
          const jitter = Math.sin(this.phase * 6 + i * 7.1) * 0.2;
          const angle = baseAngle + jitter;
          const elev = 0.4 + 0.3 * Math.sin(this.phase * 3 + i * 1.7);
          const dir = new THREE.Vector3(Math.cos(angle) * 0.7, elev, Math.sin(angle) * 0.7).normalize();
          s.mesh.position.set(0, 0, 0);
          s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          const len = 0.35 + 0.15 * (0.5 + 0.5 * Math.sin(this.phase * 5 + i * 3.3));
          s.mesh.scale.set(1, len / 0.5, 1);
          s.mesh.material.opacity = 0.35 + 0.35 * flick;
        }
      }
      if (this.contrastArc && this.contrastArc.material) {
        this.contrastArc.material.opacity = 0.22 + 0.06 * Math.sin(this.phase * 0.8);
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
