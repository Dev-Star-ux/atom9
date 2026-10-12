// Cyclotron — 3D scene: a flat vacuum chamber holding two D-shaped dee
// electrodes, sandwiched between the pole faces of a large electromagnet,
// with the charged particle spiraling outward in the horizontal plane and
// being extracted at the dee edge. Reuses physics.js's OrbitSim so the 2D
// and 3D views always agree on where the particle is.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  OrbitSim,
  ORBIT_R_MAX,
  rfVoltagePhase,
  physicalRadius,
  findParticle,
  energyAtRadius,
  joulesToEV,
} from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  glassMaterial,
  metalMaterial,
  contactShadow,
} from '../common/sceneVisuals.js';

const PHYS_R_MAX_M = 0.5;
const DEE_RADIUS = 1.9;
const DEE_THICK = 0.22;
const DEE_WORLD_R_MAX = DEE_RADIUS * 0.92;
const CHAMBER_RADIUS = 2.08;
const CHAMBER_HEIGHT = 0.4;
const POLE_RADIUS = 2.6;
const POLE_THICK = 0.22;
const POLE_GAP_HALF = 0.55;
const GAP_HALF_ANGLE = 0.06; // matches the 2D scene's dee gap
const TRAIL_LEN = 260;

export class CyclotronScene3D {
  constructor(container) {
    this.container = container;
    this.state = { particleId: 'proton', B: 1.5, ratio: 1.0, dee: 1.0 };
    this.sim = new OrbitSim();
    this.paused = false;
    this._active = false;
    this._trail = [];
    this._beamVisible = false;
    this._labelTick = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
    this.camera.position.set(9.8, 5.8, 11.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 28;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 30, -2.9);

    this._buildStage();
    this._buildTrail();
    this._buildBeam();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floorShadow = contactShadow(3.4, 3.4, 0.4);
    floorShadow.position.set(0, -2.88, 0);
    this.scene.add(floorShadow);

    // --- Magnet pole pieces (top + bottom), sandwiching the flat chamber ---
    // The top pole has a wedge cut away (a "cutaway" teaching view) so the
    // default camera angle can see the dees and spiral underneath it instead
    // of just a solid disc.
    const poleMat = metalMaterial(0x334155, { metalness: 0.72, roughness: 0.4 });
    const notchCenter = 0.885; // rad — faces the default camera azimuth
    const notchWidth = 1.5; // rad (~86°)
    const topPoleGeo = new THREE.CylinderGeometry(
      POLE_RADIUS, POLE_RADIUS, POLE_THICK, 40, 1, false,
      notchCenter + notchWidth / 2, Math.PI * 2 - notchWidth,
    );
    const poleGeo = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS, POLE_THICK, 40);
    this.topPole = new THREE.Mesh(topPoleGeo, poleMat);
    this.topPole.position.set(0, POLE_GAP_HALF + POLE_THICK / 2, 0);
    this.scene.add(this.topPole);
    tip(this.topPole, 'Magnet pole (top)', 'Upper pole face of the electromagnet (shown cut away) — the vertical B field it produces bends the particle into circular arcs.');

    this.bottomPole = new THREE.Mesh(poleGeo, poleMat.clone());
    this.bottomPole.position.set(0, -(POLE_GAP_HALF + POLE_THICK / 2), 0);
    this.scene.add(this.bottomPole);
    tip(this.bottomPole, 'Magnet pole (bottom)', 'Lower pole face — together the two poles clamp a uniform field through the chamber.');

    // Coil rings suggesting an energized electromagnet winding.
    const coilMat = metalMaterial(0x7f1d1d, { metalness: 0.3, roughness: 0.55, emissive: 0x7f1d1d, emissiveIntensity: 0.3 });
    const coilGeo = new THREE.TorusGeometry(POLE_RADIUS * 0.82, 0.09, 12, 40);
    const topCoil = new THREE.Mesh(coilGeo, coilMat);
    topCoil.position.copy(this.topPole.position);
    topCoil.position.y += POLE_THICK / 2 + 0.05;
    this.scene.add(topCoil);
    const bottomCoil = new THREE.Mesh(coilGeo.clone(), coilMat.clone());
    bottomCoil.position.copy(this.bottomPole.position);
    bottomCoil.position.y -= POLE_THICK / 2 + 0.05;
    this.scene.add(bottomCoil);

    this.scene.add(placeLabel('Electromagnet pole', POLE_RADIUS * 0.5, this.topPole.position.y + 0.3, 0, '#93c5fd', 1.05));

    // --- Flat cylindrical vacuum chamber ---
    this.chamber = new THREE.Mesh(
      new THREE.CylinderGeometry(CHAMBER_RADIUS, CHAMBER_RADIUS, CHAMBER_HEIGHT, 48, 1, true),
      glassMaterial(0x94a3b8, 0.13),
    );
    this.scene.add(this.chamber);

    // --- Two D-shaped dee electrodes: thin wedge cylinders coplanar in the
    // horizontal (X/Z) plane, split by a small gap on each side. ---
    const dee1Mat = metalMaterial(0x2c4a6b, { metalness: 0.7, roughness: 0.34, emissive: 0x38bdf8, emissiveIntensity: 0 });
    const dee2Mat = metalMaterial(0x6b3a1f, { metalness: 0.7, roughness: 0.34, emissive: 0xf97316, emissiveIntensity: 0 });
    this._dee1Mat = dee1Mat;
    this._dee2Mat = dee2Mat;

    this.dee1 = new THREE.Mesh(
      new THREE.CylinderGeometry(DEE_RADIUS, DEE_RADIUS, DEE_THICK, 40, 1, false, -Math.PI / 2 + GAP_HALF_ANGLE, Math.PI - 2 * GAP_HALF_ANGLE),
      dee1Mat,
    );
    this.scene.add(this.dee1);
    tip(this.dee1, 'Dee D1', 'Hollow D-shaped electrode. The RF supply swings its voltage relative to D2 — the particle is kicked every time it crosses the gap into this dee.');

    this.dee2 = new THREE.Mesh(
      new THREE.CylinderGeometry(DEE_RADIUS, DEE_RADIUS, DEE_THICK, 40, 1, false, Math.PI / 2 + GAP_HALF_ANGLE, Math.PI - 2 * GAP_HALF_ANGLE),
      dee2Mat,
    );
    this.scene.add(this.dee2);
    tip(this.dee2, 'Dee D2', 'The second hollow electrode — opposite polarity to D1 at any instant, so the field in the gap always pushes the particle forward.');

    this.scene.add(placeLabel('D1', DEE_RADIUS * 0.85, DEE_THICK / 2 + 0.18, 0, '#38bdf8', 0.9));
    this.scene.add(placeLabel('D2', -DEE_RADIUS * 0.85, DEE_THICK / 2 + 0.18, 0, '#f97316', 0.9));

    // --- Extraction deflector + beam port at the chamber edge ---
    this.deflector = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.3, 0.5),
      metalMaterial(0xcbd5e1, { metalness: 0.6, roughness: 0.35 }),
    );
    this.deflector.position.set(CHAMBER_RADIUS + 0.06, 0, 0);
    this.scene.add(this.deflector);
    tip(this.deflector, 'Extraction deflector', 'Once the spiral reaches the outer edge, a deflector plate steers the beam out of the chamber for use.');

    this.scene.add(placeLabel('cyclotron — horizontal orbit plane between the dees', 0, POLE_GAP_HALF + POLE_THICK + 0.95, 0, '#a9c4ff', 1.05));
  }

  _buildTrail() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_LEN * 3);
    const colors = new Float32Array(TRAIL_LEN * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
    this.trailLine = new THREE.Line(geo, mat);
    this.scene.add(this.trailLine);

    this.particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
    );
    attachGlow(this.particle, 0x4ade80, 0.45);
    this.scene.add(this.particle);
  }

  _buildBeam() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const mat = new THREE.LineBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.85 });
    this.beamLine = new THREE.Line(geo, mat);
    this.beamLine.visible = false;
    this.scene.add(this.beamLine);
  }

  setParams(p) {
    if (!p) return;
    if (p.particleId != null) this.state.particleId = p.particleId;
    if (p.B != null) this.state.B = p.B;
    if (p.ratio != null) this.state.ratio = p.ratio;
    if (p.dee != null) this.state.dee = p.dee;
    this.sim.setParams(p);
    if (p.reset) {
      this._trail = [];
      this._beamVisible = false;
      this.beamLine.visible = false;
    }
  }

  // Only the abstract sim state (theta/r/crossing/extracted) is exchanged
  // between the 2D and 3D views — each view keeps its own trail geometry.
  getSnapshot() {
    return { sim: this.sim.snapshot() };
  }

  applySnapshot(snap) {
    if (!snap || !snap.sim) return;
    this.sim.applySnapshot(snap.sim);
    this._trail = [];
    this.trailLine.geometry.setDrawRange(0, 0);
    if (this.sim.extracted) {
      this._beamVisible = true;
      this._updateBeam();
    } else {
      this._beamVisible = false;
      this.beamLine.visible = false;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.dee1, this.dee2, this.topPole, this.bottomPole, this.deflector].filter(Boolean);
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

  _worldPos(r, theta) {
    const worldR = (r / ORBIT_R_MAX) * DEE_WORLD_R_MAX;
    // Sit just above the dees' top face so the particle/trail aren't
    // embedded inside the solid electrode geometry.
    return new THREE.Vector3(worldR * Math.cos(theta), DEE_THICK / 2 + 0.03, worldR * Math.sin(theta));
  }

  _updateTrail() {
    const geo = this.trailLine.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const n = this._trail.length;
    for (let i = 0; i < n; i++) {
      const pt = this._trail[i];
      const v = this._worldPos(pt.r, pt.theta);
      posAttr.setXYZ(i, v.x, v.y, v.z);
      const fade = (i + 1) / n;
      colAttr.setXYZ(i, 0.98 * fade, 0.82 * fade, 0.08 * fade);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.setDrawRange(0, n);
  }

  _updateBeam() {
    const worldEdge = this._worldPos(this.sim.r, this.sim.theta);
    const ux = Math.cos(this.sim.theta), uz = Math.sin(this.sim.theta);
    const far = worldEdge.clone().add(new THREE.Vector3(ux * 1.1, 0, uz * 1.1));
    const geo = this.beamLine.geometry;
    geo.setFromPoints([worldEdge, far]);
    this.beamLine.visible = true;
  }

  _kineticEnergyEV() {
    const p = findParticle(this.state.particleId);
    const rM = physicalRadius(this.sim.r, PHYS_R_MAX_M);
    const E = energyAtRadius(p.q, this.state.B, rM, p.m);
    return joulesToEV(E);
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      const wasExtracted = this.sim.extracted;
      const res = this.sim.step(dt, ORBIT_R_MAX);
      if (res) {
        this._trail.push({ r: this.sim.r, theta: this.sim.theta });
        if (this._trail.length > TRAIL_LEN) this._trail.shift();
        this._updateTrail();
      }
      if (this.sim.extracted && !wasExtracted) this._updateBeam();

      const pos = this._worldPos(this.sim.r, this.sim.theta);
      this.particle.position.copy(pos);
      this.particle.material.color.setHex(this.sim.extracted ? 0xf87171 : 0x4ade80);

      // RF phase glow on the dees, matching the 2D inset waveform.
      const rf = rfVoltagePhase(this.sim.theta, this.state.ratio) * this.state.dee;
      this._dee1Mat.emissiveIntensity = Math.max(0, rf) * 0.3;
      this._dee2Mat.emissiveIntensity = Math.max(0, -rf) * 0.3;

      this._labelTick++;
      if (this._labelTick % 12 === 0) this._syncLabel();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _syncLabel() {
    if (!this._keLabel) {
      this._keLabel = placeLabel('KE ≈ 0 eV', 0, -(POLE_GAP_HALF + POLE_THICK + 0.35), 0, '#fde68a', 1.05);
      this.scene.add(this._keLabel);
    }
    const keV = this._kineticEnergyEV() / 1000;
    const text = 'KE ≈ ' + (keV >= 1 ? keV.toFixed(2) + ' keV' : (keV * 1000).toFixed(1) + ' eV') +
      (this.sim.extracted ? '  ·  extracted' : '  ·  crossings ' + this.sim.crossing);
    const cv = this._keLabel.material.map.image;
    if (cv && cv.getContext) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(10,17,34,0.78)';
      ctx.fillRect(4, 6, 376, 36);
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 15px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 192, 24);
      this._keLabel.material.map.needsUpdate = true;
    }
  }
}
