// Peltier effect — 3D thermoelectric cooler (TEC) module: two ceramic
// plates sandwiching a folded series chain of alternating P/N pillars
// wired by copper tabs (the standard TEC1-12706-style construction), with
// glowing spheres tracing the current path and heat-flow arrows on each face.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { stepDeltaT } from './physics.js';
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
  contactShadow,
} from '../common/sceneVisuals.js';

const N_PILLARS = 8;
const PILLAR_H = 0.68;
const PILLAR_SZ = 0.26;
const PLATE_THICK = 0.12;
const TAB_THICK = 0.05;
const COLD_HEX = 0x60a5fa;
const HOT_HEX = 0xfb923c;
const COPPER_HEX = 0xd99a4e;
const N_LEG_HEX = 0x475569;
const P_LEG_HEX = 0xa8571e;
const N_CURRENT_DOTS = 6;

// A single row of 8 alternating pillars along X, mirroring the 2D
// cross-section exactly (same series-wiring pattern) — this keeps every
// pillar unambiguously visible from any orbit angle, the way a real TEC
// module diagram is drawn as a clean cross-sectional row.
const COL_GAP = 0.46;
function pillarXZ(i) {
  return { x: (i - (N_PILLARS - 1) / 2) * COL_GAP, z: 0 };
}
// Zig-zag copper-tab pairing: top tabs bridge (0,1)(2,3)..., bottom tabs
// bridge the offset pairs (1,2)(3,4)..., wiring the whole row in series.
const TOP_PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]];
const BOTTOM_PAIRS = [[1, 2], [3, 4], [5, 6]];

export class PeltierScene3D {
  constructor(container) {
    this.container = container;
    this.state = { I: 1.5, T0: 293, thermalMass: 6 };
    this._dT = 0;
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._labelTick = 0;
    this._cooling = true;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(1.6, 1.35, 4.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 20, -1.4);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const pillarTop = PILLAR_H / 2;
    const pillarBottom = -PILLAR_H / 2;
    this._pillarTop = pillarTop;
    this._pillarBottom = pillarBottom;
    const topTabY = pillarTop + TAB_THICK / 2;
    const bottomTabY = pillarBottom - TAB_THICK / 2;
    const topPlateY = pillarTop + TAB_THICK + PLATE_THICK / 2;
    const bottomPlateY = pillarBottom - TAB_THICK - PLATE_THICK / 2;
    this._topPlateY = topPlateY;
    this._bottomPlateY = bottomPlateY;

    // --- Ceramic plates: top = cold or hot face depending on polarity ---
    const plateW = COL_GAP * (N_PILLARS - 1) + PILLAR_SZ + 0.34;
    const plateD = PILLAR_SZ + 0.5;
    this.topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(plateW, PLATE_THICK, plateD),
      plasticMaterial(COLD_HEX, { roughness: 0.55 }),
    );
    this.topPlate.position.set(0, topPlateY, 0);
    this.scene.add(this.topPlate);
    tip(this.topPlate, 'Ceramic plate (top)', 'Alumina plate that thermally couples the pillar array to the outside; it becomes the cold or hot face depending on current polarity.');

    this.bottomPlate = new THREE.Mesh(
      new THREE.BoxGeometry(plateW, PLATE_THICK, plateD),
      plasticMaterial(HOT_HEX, { roughness: 0.55 }),
    );
    this.bottomPlate.position.set(0, bottomPlateY, 0);
    this.scene.add(this.bottomPlate);
    tip(this.bottomPlate, 'Ceramic plate (bottom)', 'The opposite ceramic plate — always the face opposite the one named above, so it swaps cold/hot with it.');

    const shadow = contactShadow(plateW * 0.6, plateD * 0.9, 0.4);
    shadow.position.set(0, bottomPlateY - PLATE_THICK / 2 - 0.02, 0);
    this.scene.add(shadow);

    // --- Pillars: alternating P/N semiconductor legs on the folded path ---
    const nMat = plasticMaterial(N_LEG_HEX, { roughness: 0.5 });
    const pMat = plasticMaterial(P_LEG_HEX, { roughness: 0.5 });
    this.pillars = [];
    this._pillarPos = [];
    for (let i = 0; i < N_PILLARS; i++) {
      const pos = pillarXZ(i);
      this._pillarPos.push(pos);
      const isN = i % 2 === 0;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(PILLAR_SZ, PILLAR_H, PILLAR_SZ),
        isN ? nMat : pMat,
      );
      mesh.position.set(pos.x, 0, pos.z);
      this.scene.add(mesh);
      this.pillars.push(mesh);
      if (i === 2) {
        tip(mesh, (isN ? 'N-type' : 'P-type') + ' pillar', 'One of the alternating P/N semiconductor legs. Under current, both leg types carry heat carriers from the cold face to the hot face, but electrons and holes drift in opposite electrical directions — that is why P and N legs must alternate for the heat flow to add up in series.');
      }
    }

    // --- Copper tabs wiring the pillars in series (top + bottom + jumper) ---
    const copperMat = metalMaterial(COPPER_HEX, { metalness: 0.82, roughness: 0.3 });
    this._addTabs(TOP_PAIRS, topTabY, copperMat);
    this._addTabs(BOTTOM_PAIRS, bottomTabY, copperMat);

    // --- External leads at the two free ends of the chain (bottom of 0, bottom of last) ---
    const p0 = this._pillarPos[0];
    const pLast = this._pillarPos[N_PILLARS - 1];
    this.leadNeg = this._makeLead(p0, bottomTabY, copperMat);
    this.leadPos = this._makeLead(pLast, bottomTabY, copperMat);

    // --- Series current path (through every tab & pillar end) for the moving glow dots ---
    this._buildCurrentPath(topTabY, bottomTabY);

    // --- Heat-flow arrow cones on each face ---
    const coneGeo = new THREE.ConeGeometry(0.09, 0.26, 14);
    this.topArrow = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ color: COLD_HEX, emissive: COLD_HEX, emissiveIntensity: 0.4 }));
    this.topArrow.position.set(0, topPlateY + PLATE_THICK / 2 + 0.22, 0);
    this.scene.add(this.topArrow);
    this.bottomArrow = new THREE.Mesh(coneGeo.clone(), new THREE.MeshStandardMaterial({ color: HOT_HEX, emissive: HOT_HEX, emissiveIntensity: 0.4 }));
    this.bottomArrow.position.set(0, bottomPlateY - PLATE_THICK / 2 - 0.22, 0);
    this.scene.add(this.bottomArrow);

    // --- Labels ---
    this.topLabel = placeLabel('cold ceramic plate', 0, topPlateY + PLATE_THICK / 2 + 0.45, 0.62, '#93c5fd', 1.05);
    this.scene.add(this.topLabel);
    this.bottomLabel = placeLabel('hot ceramic plate', 0, bottomPlateY - PLATE_THICK / 2 - 0.42, 0.62, '#fdba74', 1.05);
    this.scene.add(this.bottomLabel);
    this._dtLbl = placeLabel('ΔT ≈ 0.0 K', 0, topPlateY + PLATE_THICK / 2 + 0.75, 0, '#fde68a', 1.15);
    this.scene.add(this._dtLbl);

    // --- Moving current/heat-carrier glow dots ---
    this._currentDots = [];
    for (let i = 0; i < N_CURRENT_DOTS; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 }),
      );
      attachGlow(dot, 0xfbbf24, 0.2);
      dot.userData.seed = i / N_CURRENT_DOTS;
      this.scene.add(dot);
      this._currentDots.push(dot);
    }
  }

  _addTabs(pairs, y, mat) {
    for (const [a, b] of pairs) {
      const pa = this._pillarPos[a];
      const pb = this._pillarPos[b];
      const dx = pb.x - pa.x;
      const dz = pb.z - pa.z;
      const cx = (pa.x + pb.x) / 2;
      const cz = (pa.z + pb.z) / 2;
      let mesh;
      if (Math.abs(dx) >= Math.abs(dz)) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(dx) + PILLAR_SZ, TAB_THICK, PILLAR_SZ * 0.7), mat);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(PILLAR_SZ * 0.7, TAB_THICK, Math.abs(dz) + PILLAR_SZ), mat);
      }
      mesh.position.set(cx, y, cz);
      this.scene.add(mesh);
    }
  }

  _makeLead(pillarPos, y, mat) {
    const outX = pillarPos.x < 0 ? pillarPos.x - 0.55 : pillarPos.x + 0.55;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.abs(outX - pillarPos.x), 8), mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set((pillarPos.x + outX) / 2, y, pillarPos.z);
    this.scene.add(mesh);
    return mesh;
  }

  _buildCurrentPath(topTabY, bottomTabY) {
    const P = this._pillarPos;
    const top = this._pillarTop;
    const bot = this._pillarBottom;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const pts = [];
    const leadOut0 = P[0].x < 0 ? P[0].x - 0.55 : P[0].x + 0.55;
    const leadOutLast = P[7].x < 0 ? P[7].x - 0.55 : P[7].x + 0.55;
    pts.push(v(leadOut0, bottomTabY, P[0].z));
    pts.push(v(P[0].x, bot, P[0].z));
    pts.push(v(P[0].x, top, P[0].z));
    pts.push(v(P[1].x, top, P[1].z));
    pts.push(v(P[1].x, bot, P[1].z));
    pts.push(v(P[2].x, bot, P[2].z));
    pts.push(v(P[2].x, top, P[2].z));
    pts.push(v(P[3].x, top, P[3].z));
    pts.push(v(P[3].x, bot, P[3].z));
    pts.push(v(P[4].x, bot, P[4].z));
    pts.push(v(P[4].x, top, P[4].z));
    pts.push(v(P[5].x, top, P[5].z));
    pts.push(v(P[5].x, bot, P[5].z));
    pts.push(v(P[6].x, bot, P[6].z));
    pts.push(v(P[6].x, top, P[6].z));
    pts.push(v(P[7].x, top, P[7].z));
    pts.push(v(P[7].x, bot, P[7].z));
    pts.push(v(leadOutLast, bottomTabY, P[7].z));
    this._currentCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.state.I = p.I;
    if (p.T0 != null) this.state.T0 = p.T0;
    if (p.thermalMass != null) this.state.thermalMass = p.thermalMass;
    if (p.reset) { this._dT = 0; }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.topPlate, this.bottomPlate, this.pillars && this.pillars[2]].filter(Boolean);
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

  _updateFaces() {
    const cooling = this.state.I >= 0;
    if (cooling === this._cooling && this._facesInit) return;
    this._cooling = cooling;
    this._facesInit = true;
    const topHex = cooling ? COLD_HEX : HOT_HEX;
    const bottomHex = cooling ? HOT_HEX : COLD_HEX;
    this.topPlate.material.color.setHex(topHex);
    this.bottomPlate.material.color.setHex(bottomHex);
    this.topArrow.material.color.setHex(topHex);
    this.topArrow.material.emissive.setHex(topHex);
    this.bottomArrow.material.color.setHex(bottomHex);
    this.bottomArrow.material.emissive.setHex(bottomHex);
    // Cold face: arrow points INTO the plate (heat absorbed). Hot face: arrow points AWAY (heat released).
    this.topArrow.rotation.x = cooling ? Math.PI : 0;
    this.bottomArrow.rotation.x = cooling ? 0 : Math.PI;
    // Labels must swap wording too — the physical top face is whichever
    // is cold/hot right now, not fixed at construction time.
    this._redrawLabel(this.topLabel, cooling ? 'cold ceramic plate' : 'hot ceramic plate', cooling ? '#93c5fd' : '#fdba74');
    this._redrawLabel(this.bottomLabel, cooling ? 'hot ceramic plate' : 'cold ceramic plate', cooling ? '#fdba74' : '#93c5fd');
  }

  _redrawLabel(lbl, text, color) {
    if (!lbl || !lbl.material || !lbl.material.map) return;
    const cv = lbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 6, 376, 36, 8);
    } else {
      ctx.rect(4, 6, 376, 36);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = '600 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 24);
    lbl.material.map.needsUpdate = true;
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;
      this._dT = stepDeltaT(this._dT, this.state.I, this.state.T0, this.state.thermalMass, dt);
      this._updateFaces();

      const speed = 0.09 + Math.min(1, Math.abs(this.state.I) / 3) * 0.16;
      const reverse = !this._cooling;
      for (let i = 0; i < this._currentDots.length; i++) {
        const dot = this._currentDots[i];
        const seed = dot.userData.seed;
        let tt = (this.phase * speed + seed) % 1;
        if (reverse) tt = 1 - tt;
        const pos = this._currentCurve.getPointAt(Math.min(0.999, Math.max(0, tt)));
        dot.position.copy(pos);
      }

      this._labelTick++;
      if (this._labelTick % 6 === 0 && this._dtLbl && this._dtLbl.material.map) {
        const Tc = this.state.T0 - this._dT;
        const cv = this._dtLbl.material.map.image;
        const c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        c.fillStyle = 'rgba(10,17,34,0.8)';
        c.fillRect(4, 6, 376, 36);
        c.fillStyle = '#fde68a';
        c.font = '700 15px system-ui,sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('ΔT ≈ ' + this._dT.toFixed(1) + ' K  ·  cold face ' + Tc.toFixed(0) + ' K', 192, 24);
        this._dtLbl.material.map.needsUpdate = true;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
