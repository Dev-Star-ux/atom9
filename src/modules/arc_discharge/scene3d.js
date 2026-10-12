// Electric arc discharge — 3D electrode/arc schematic.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { arcVoltage, arcPower, A0, B0, C0, D0 } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  glowSphere,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

// World units per cm of gap (keeps the gap visually generous at typical L).
const GAP_SCALE = 1.6;
const GAP_MIN = 1.2;

// Shared base plate that grounds both electrode holders — geometry is
// rebuilt (width only) as the gap changes, but always a flat, unrotated box.
const ROD_LEN = 2.4;
const CLAMP_X_FRAC = 0.78; // fraction of ROD_LEN back from the tip
const PLATE_THICK = 0.14;
const PLATE_TOP_Y = -0.55;
const PLATE_CENTER_Y = PLATE_TOP_Y - PLATE_THICK / 2;

export class ArcDischargeScene3D {
  constructor(container) {
    this.container = container;
    this.I = 50;
    this.L = 0.5;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(5.4, 2.9, 7.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.15, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -1.4);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // Electrode rods facing each other along X, tips near origin.
    this.gap = Math.max(GAP_MIN, this.L * GAP_SCALE);

    // Shared metal base plate the whole rig mounts to (flat plate: width
    // along X, thin along Y, depth along Z — no extra rotation). Rebuilt
    // (width only) whenever the gap changes so it always spans under the
    // two electrode holders.
    this.baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, PLATE_THICK, 1),
      metalMaterial(0x14161c, { metalness: 0.4, roughness: 0.6 }),
    );
    this.scene.add(this.baseMesh);
    this.baseShadow = contactShadow(3, 1.2, 0.45);
    this.baseShadow.position.set(0, PLATE_TOP_Y - 0.01, 0);
    this.scene.add(this.baseShadow);

    this.electrodeGroup = new THREE.Group();
    this.scene.add(this.electrodeGroup);

    this.cathode = this._buildElectrode(0xb45309);
    this.anode = this._buildElectrode(0x71717a);
    this.electrodeGroup.add(this.cathode.group, this.anode.group);

    this.scene.add(placeLabel('cathode', -3.2, 1.1, 0, '#fbbf24', 1.0));
    this.scene.add(placeLabel('anode', 3.2, 1.1, 0, '#cbd5e1', 1.0));
    this._gapLbl = placeLabel('gap L', 0, 1.5, 0, '#93c5fd', 1.0);
    this.scene.add(this._gapLbl);

    tip(this.cathode.rod, 'Cathode (hot spot)', 'Thermionic emission supplies electrons without a large cathode-fall voltage — why arc voltage stays comparatively low even at high current.');
    tip(this.anode.rod, 'Anode', 'Collects the arc current; bombardment heats the tip to incandescence.');

    // Arc channel: a tube built along a jittering centerline, rebuilt each frame.
    this.arcMat = new THREE.MeshBasicMaterial({
      color: 0xfffaf0,
      transparent: true,
      opacity: 0.95,
    });
    this.arcMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.arcMat);
    this.scene.add(this.arcMesh);
    this.arcGlow = attachGlow(this.arcMesh, 0xfb923c, 1.6);
    tip(this.arcMesh, 'Arc channel — negative differential resistance', 'As current I rises, arc voltage FALLS (over this range) — opposite to a normal resistor. The channel widens and brightens with I because more current means more power P = VI dissipated as heat and light.');

    this._vpLbl = placeLabel('V = --, P = --', 0, 2.1, 0, '#fde68a', 1.05);
    this.scene.add(this._vpLbl);

    this._layoutElectrodes();
    this._rebuildArc(0);
    this._updateLabels();
  }

  _buildElectrode(accentColor) {
    const group = new THREE.Group();
    const rodLen = ROD_LEN;
    // Carbon/metal rod — brushed dark metal, not a raw flat-colored cylinder.
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, rodLen, 20),
      metalMaterial(0x2a2a2e, { metalness: 0.65, roughness: 0.38 }),
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.x = -rodLen / 2; // rod extends in -x from local tip at x=0
    group.add(rod);

    const tipCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.36, 20),
      metalMaterial(0x1c1c1f, { metalness: 0.5, roughness: 0.3 }),
    );
    tipCone.rotation.z = -Math.PI / 2;
    tipCone.position.x = 0.16;
    group.add(tipCone);

    const hotSpot = glowSphere(0.09, 0xffedd5, { pick: false });
    hotSpot.position.x = 0.3;
    group.add(hotSpot);

    // Electrode holder/clamp gripping the rod near its back end, with a
    // colored accent band (cathode/anode identity) and a post grounding it
    // to the shared base plate below — reads as a mounted rig, not two
    // rods floating in space.
    const clampX = -rodLen * CLAMP_X_FRAC;
    const clamp = new THREE.Mesh(
      roundedBoxGeometry(0.5, 0.4, 0.4, 0.06, 3),
      plasticMaterial(0x24242a, { roughness: 0.6 }),
    );
    clamp.position.set(clampX, 0, 0);
    group.add(clamp);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 8, 24),
      metalMaterial(accentColor, { metalness: 0.8, roughness: 0.3 }),
    );
    band.rotation.y = Math.PI / 2;
    band.position.set(clampX + 0.02, 0, 0);
    group.add(band);

    const postH = 0.75;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, postH, 14),
      metalMaterial(0x3f3f46, { metalness: 0.7, roughness: 0.35 }),
    );
    post.position.set(clampX, -(postH / 2 + 0.2), 0);
    group.add(post);

    return { group, rod, tipCone, hotSpot, clamp };
  }

  _layoutElectrodes() {
    const half = this.gap / 2;
    this.cathode.group.position.set(-half, 0.4, 0);
    this.cathode.group.rotation.y = 0;
    this.anode.group.position.set(half, 0.4, 0);
    this.anode.group.rotation.y = Math.PI;
    if (this._gapLbl) this._gapLbl.position.set(0, 1.5, 0);

    // Rebuild the shared base plate to always span under both electrode
    // holders, however far apart the gap slider pushes them. Flat plate:
    // width along X, thin along Y, depth along Z — NO extra rotation.
    const clampReach = ROD_LEN * CLAMP_X_FRAC;
    const margin = 0.7;
    const plateHalfW = half + clampReach + margin;
    const plateW = plateHalfW * 2;
    const plateDepth = 1.7;
    if (this.baseMesh) {
      if (this.baseMesh.geometry) this.baseMesh.geometry.dispose();
      this.baseMesh.geometry = new THREE.BoxGeometry(plateW, PLATE_THICK, plateDepth);
      this.baseMesh.position.set(0, PLATE_CENTER_Y, 0);
    }
    if (this.baseShadow) {
      this.baseShadow.scale.set(plateHalfW * 1.05, plateDepth * 0.62, 1);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.I = p.I;
    if (p.L != null) this.L = p.L;
    this.gap = Math.max(GAP_MIN, this.L * GAP_SCALE);
    this._layoutElectrodes();
    this._rebuildArc(this.phase);
    this._updateLabels();
  }

  _updateLabels() {
    const V = arcVoltage(this.I, this.L, A0, B0, C0, D0);
    const P = arcPower(V, this.I);
    if (this._vpLbl && this._vpLbl.material && this._vpLbl.material.map) {
      const cv = this._vpLbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.78)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 15px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V ≈ ' + V.toFixed(1) + ' V, P = VI ≈ ' + (P / 1000).toFixed(2) + ' kW', 192, 24);
        this._vpLbl.material.map.needsUpdate = true;
      }
    }
  }

  /** Rebuild the arc tube along a deterministic phase-jittering centerline. */
  _rebuildArc(phase) {
    const half = this.gap / 2;
    const x0 = -half + 0.32;
    const x1 = half - 0.32;
    const n = 24;
    const pts = [];
    const ampBase = 0.06 + Math.min(0.22, this.I / 900);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const envelope = Math.sin(Math.PI * t);
      const jitter =
        Math.sin(phase * 3.1 + t * 11) * 0.5 +
        Math.sin(phase * 7.3 + t * 5 + 1.1) * 0.3 +
        Math.sin(phase * 1.7 - t * 9 + 2.4) * 0.2;
      const y = 0.4 + jitter * ampBase * envelope;
      const z = Math.cos(phase * 2.3 + t * 6 + 0.7) * ampBase * 0.6 * envelope;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const radius = Math.max(0.02, Math.min(0.14, 0.02 + this.I / 900));
    const geo = new THREE.TubeGeometry(curve, 48, radius, 8, false);
    if (this.arcMesh.geometry) this.arcMesh.geometry.dispose();
    this.arcMesh.geometry = geo;

    const brightness = Math.min(1, 0.35 + this.I / 220);
    this.arcMat.color.setHSL(0.09, 1, 0.55 + 0.25 * brightness);
    this.arcMat.opacity = Math.min(1, 0.6 + brightness * 0.4);
    if (this.arcGlow) {
      const s = (0.9 + radius * 6) * (0.8 + brightness * 0.6);
      this.arcGlow.scale.set(s, s, 1);
      this.arcGlow.material.opacity = 0.35 + brightness * 0.4;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.cathode && this.cathode.rod, this.anode && this.anode.rod, this.arcMesh].filter(Boolean);
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
      this.phase += 0.045;
      this._rebuildArc(this.phase);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
