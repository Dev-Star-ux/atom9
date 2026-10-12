// Photomultiplier tube — 3D schematic: photocathode → dynode zigzag cascade → anode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { secondaryYield, gain } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassTube,
  glowSphere,
  dashedGuide,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const DYNODE_COUNT = 6; // representative visual chain, independent of nStages slider
const TUBE_LEN = 9;
const TUBE_R = 1.15;
const ELECTRON_POOL = 48; // hard cap on simultaneously-drawn electron sprites per burst

export class PMTScene3D {
  constructor(container) {
    this.container = container;
    this.intensityRel = 0.5;
    this.quantumEfficiency = 0.25;
    this.voltagePerStage = 100;
    this.nStages = 9;
    this.delta = secondaryYield(this.voltagePerStage);
    this.G = gain(this.delta, this.nStages);
    this.spawnMul = 1.6;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
    this.camera.position.set(3.4, 5.8, 14.5);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.35, 0);
    addStudioLights(this.scene);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const xL = -TUBE_LEN / 2;
    const xR = TUBE_LEN / 2;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.4;
    this.scene.add(floor);

    // --- Base plate / pedestal: grounds the tube as mounted lab hardware
    // instead of floating in space. Flat plate already sits correctly
    // (width=X, thin=Y, length=Z) — no extra rotation. ---
    const BASE_Y = -1.95;
    const baseGeo = roundedBoxGeometry(TUBE_LEN + 2.0, 0.16, 2.1, 0.05, 3);
    const basePlate = new THREE.Mesh(baseGeo, metalMaterial(0x1a212c, { metalness: 0.4, roughness: 0.6 }));
    basePlate.position.set(0, BASE_Y, 0);
    this.scene.add(basePlate);
    const baseShadow = contactShadow(TUBE_LEN * 0.85 + 1.2, 1.5, 0.42);
    baseShadow.position.set(0, BASE_Y - 0.09, 0);
    this.scene.add(baseShadow);

    // Support cradles holding the glass tube above the base plate.
    const cradleMat = metalMaterial(0x475569, { metalness: 0.75, roughness: 0.3 });
    const baseTopY = BASE_Y + 0.08;
    const tubeBottomY = -TUBE_R;
    const postH = tubeBottomY - baseTopY;
    const postCenterY = (tubeBottomY + baseTopY) / 2;
    for (const cx of [xL + 1.6, 0, xR - 1.9]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, postH, 0.16), cradleMat);
      post.position.set(cx, postCenterY, 0);
      this.scene.add(post);
      const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 12), cradleMat);
      saddle.rotation.x = Math.PI / 2;
      saddle.position.set(cx, tubeBottomY + 0.02, 0);
      this.scene.add(saddle);
    }

    // --- Tube base / socket: dark plastic pin socket beyond the anode ---
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(TUBE_R * 0.82, TUBE_R * 0.82, 0.55, 24),
      plasticMaterial(0x0c1117, { roughness: 0.7 }),
    );
    socket.rotation.z = Math.PI / 2;
    socket.position.set(xR + 0.6, 0, 0);
    this.scene.add(socket);
    tip(socket, 'Tube base / socket', 'The pin base plugs into a socket that supplies dynode bias voltages and carries the amplified anode signal out.');
    this.scene.add(placeLabel('base / socket', xR + 0.6, -(TUBE_R + 0.9), 0, '#94a3b8', 0.9));

    // Glass tube envelope, horizontal
    const tube = glassTube(TUBE_R, TUBE_LEN, 0.12);
    tube.rotation.z = Math.PI / 2;
    this.scene.add(tube);

    // --- Photocathode plate (flat disc capping the left end) ---
    const cathodeGroup = new THREE.Group();
    cathodeGroup.position.set(xL, 0, 0);
    this.scene.add(cathodeGroup);
    const cathode = new THREE.Mesh(
      new THREE.CylinderGeometry(TUBE_R * 0.92, TUBE_R * 0.92, 0.12, 28),
      metalMaterial(0xfacc15, { metalness: 0.4, roughness: 0.5, emissive: 0x78350f, emissiveIntensity: 0.35 }),
    );
    cathode.rotation.z = Math.PI / 2;
    cathodeGroup.add(cathode);
    this._cathodeMesh = cathode;
    tip(cathode, 'Photocathode', 'Incident photons eject photoelectrons via the photoelectric effect. Photocurrent ∝ intensity × quantum efficiency.');
    this.scene.add(placeLabel('photocathode', xL, TUBE_R + 0.9, 0, '#facc15', 1.05));

    // Incoming photons: small glowing spheres arriving from outside the tube.
    this._photons = [];
    const nPhotons = 5;
    for (let i = 0; i < nPhotons; i++) {
      const s = glowSphere(0.09, 0xfde047);
      s.position.set(xL - 3 - i * 0.6, (i - nPhotons / 2) * 0.32, Math.cos(i) * 0.4);
      this.scene.add(s);
      this._photons.push({ mesh: s, offset: i / nPhotons, laneY: (i - nPhotons / 2) * 0.32, laneZ: Math.cos(i) * 0.4 });
    }

    // --- Dynode zigzag chain ---
    this._dynodePositions = [];
    const chainL = xL + 1.4;
    const chainR = xR - 1.6;
    for (let i = 0; i < DYNODE_COUNT; i++) {
      const x = chainL + ((chainR - chainL) * (i + 0.5)) / DYNODE_COUNT;
      const up = (i % 2 === 0);
      const y = up ? TUBE_R * 0.55 : -TUBE_R * 0.55;
      this._dynodePositions.push(new THREE.Vector3(x, y, 0));
    }
    // Prepend cathode and append anode so cascade segments are cathode->d1->...->dN->anode.
    this._pathPoints = [new THREE.Vector3(xL + 0.1, 0, 0)]
      .concat(this._dynodePositions)
      .concat([new THREE.Vector3(xR - 0.1, 0, 0)]);

    this._dynodeMeshes = [];
    const plateGeo = roundedBoxGeometry(0.55, 0.55, 0.9, 0.06, 2);
    for (let i = 0; i < DYNODE_COUNT; i++) {
      const p = this._dynodePositions[i];
      const up = (i % 2 === 0);
      const mat = metalMaterial(0x60a5fa, { metalness: 0.6, roughness: 0.3, emissive: 0x1e3a8a, emissiveIntensity: 0.4 });
      const plate = new THREE.Mesh(plateGeo, mat);
      plate.position.copy(p);
      plate.rotation.z = up ? -0.5 : 0.5;
      this.scene.add(plate);
      this._dynodeMeshes.push(plate);
      this.scene.add(placeLabel(String(i + 1), p.x, p.y + (up ? 0.65 : -0.65), 0, '#93c5fd', 0.75));
      if (i === Math.floor(DYNODE_COUNT / 2)) {
        tip(plate, 'Dynode', 'Each accelerated electron strikes a dynode and knocks loose δ secondary electrons — the cloud multiplies stage by stage.');
      }
    }
    this.scene.add(placeLabel('dynode chain', (chainL + chainR) / 2, TUBE_R + 1.4, 0, '#93c5fd', 1.0));
    this._chainGuide = dashedGuide(this._pathPoints, 0x60a5fa, 0.35);
    this.scene.add(this._chainGuide);

    // --- Anode ---
    const anodeGroup = new THREE.Group();
    anodeGroup.position.set(xR, 0, 0);
    this.scene.add(anodeGroup);
    const anode = new THREE.Mesh(
      new THREE.CylinderGeometry(TUBE_R * 0.7, TUBE_R * 0.7, 0.14, 24),
      metalMaterial(0xfacc15, { metalness: 0.6, roughness: 0.3, emissive: 0x92400e, emissiveIntensity: 0.3 }),
    );
    anode.rotation.z = Math.PI / 2;
    anodeGroup.add(anode);
    this._anodeMesh = anode;
    tip(anode, 'Anode', 'Collects the fully multiplied electron cloud: I_out = I_cathode · G, a measurable current pulse from a single photon.');
    this.scene.add(placeLabel('anode', xR, TUBE_R + 0.9, 0, '#facc15', 1.0));
    this._anodeGlow = attachGlow(anode, 0xfacc15, 1.4);

    // --- Live gain label ---
    this._gLbl = placeLabel('Gain G = ...', 0, -(TUBE_R + 1.5), 0, '#fca5a5', 1.05);
    this.scene.add(this._gLbl);

    // --- Electron cascade pool ---
    this._electrons = [];
    for (let i = 0; i < ELECTRON_POOL; i++) {
      const e = glowSphere(0.055, 0x67e8f9);
      e.visible = false;
      this.scene.add(e);
      this._electrons.push(e);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.intensityRel != null) this.intensityRel = p.intensityRel;
    if (p.quantumEfficiency != null) this.quantumEfficiency = p.quantumEfficiency;
    if (p.voltagePerStage != null) this.voltagePerStage = p.voltagePerStage;
    if (p.nStages != null) this.nStages = p.nStages;
    this.delta = secondaryYield(this.voltagePerStage);
    this.G = gain(this.delta, this.nStages);
    // Visual per-stage multiplier for the electron cascade: tracks delta but clamped
    // so the representative (fixed-length) 3D chain stays legible rather than exploding.
    this.spawnMul = Math.max(1.15, Math.min(2.4, this.delta));
    this._updateLabels();
  }

  _updateLabels() {
    if (this._gLbl && this._gLbl.material && this._gLbl.material.map) {
      const cv = this._gLbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.78)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '600 16px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Gain G = ' + this.G.toExponential(2) + '  (n=' + this.nStages + ')', 192, 24);
        this._gLbl.material.map.needsUpdate = true;
      }
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this._cathodeMesh, this._anodeMesh].concat(this._dynodeMeshes || []).filter(Boolean);
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

  _tickPhotons(dt) {
    const xL = -TUBE_LEN / 2;
    const xStart = xL - 3.2;
    const xEnd = xL - 0.2;
    for (let i = 0; i < this._photons.length; i++) {
      const ph = this._photons[i];
      ph.offset = (ph.offset + dt * 0.35) % 1;
      ph.mesh.position.set(xStart + (xEnd - xStart) * ph.offset, ph.laneY, ph.laneZ);
      ph.mesh.visible = true;
    }
  }

  _tickCascade() {
    const nSeg = this._pathPoints.length - 1; // cathode->d1, ..., dN->anode
    const cyclePeriod = 2.2;
    const t = (this.phase / cyclePeriod) % 1;
    const segT = t * nSeg;
    const seg = Math.min(nSeg - 1, Math.floor(segT));
    const localT = segT - seg;

    const p0 = this._pathPoints[seg];
    const p1 = this._pathPoints[seg + 1];
    const count = Math.min(ELECTRON_POOL, Math.max(1, Math.round(Math.pow(this.spawnMul, seg + 1))));
    const spread = Math.min(0.9, 0.15 + count * 0.02);
    const finalStage = seg >= nSeg - 1;

    for (let i = 0; i < this._electrons.length; i++) {
      const e = this._electrons[i];
      if (i >= count) { e.visible = false; continue; }
      e.visible = true;
      const jitter = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
      const jz = Math.sin(i * 2.4) * spread * 0.5;
      const x = p0.x + (p1.x - p0.x) * localT;
      const y = p0.y + (p1.y - p0.y) * localT + jitter;
      const z = p0.z + (p1.z - p0.z) * localT + jz;
      e.position.set(x, y, z);
    }

    // Bright burst at the anode near the end of the final segment.
    if (finalStage && localT > 0.75) {
      const burst = (localT - 0.75) / 0.25;
      this._anodeGlow.material.opacity = 0.5 + 0.5 * burst;
      this._anodeGlow.scale.setScalar((1.4 + burst * 1.8) * 0.62);
    } else {
      this._anodeGlow.material.opacity = 0.5;
      this._anodeGlow.scale.setScalar(1.4 * 0.62);
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    if (this._active && !this.paused) {
      this.phase += 0.016;
      this._tickPhotons(0.016);
      this._tickCascade();
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
