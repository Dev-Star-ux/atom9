// Laser printer (xerographic process) — 3D schematic of drum, laser, toner, paper, fuser.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { contrastV, opticalDensity, fuserOk, tonerCoveragePattern } from './physics.js';
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
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const N_CELLS = 48;
const COL_CHARGED = 0x1e1b4b;   // dark indigo/purple — charged, no toner
const COL_EXPOSED = 0xfde047;   // bright yellow — discharged / latent image
const COL_LASER = 0x38bdf8;
const COL_TONER = 0x111827;
const COL_CORONA = 0xa78bfa;
const COL_FUSER_OK = 0x4ade80;
const COL_FUSER_COLD = 0xf87171;
const COL_FUSER_HOT = 0xfb923c;

function hexToCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

export class LaserPrinter3D {
  constructor(container) {
    this.container = container;
    this.state = {
      chargeV: 800,
      expResidualV: 100,
      density: 0.35,
      fuserTempC: 195,
    };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    this.camera.position.set(1.3, 3.0, 8.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.35, 0.6);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.4);

    this.drumRadius = 1.05;
    this.drumLen = 2.2;
    this.halfLen = this.drumLen / 2;

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _pattern() {
    return tonerCoveragePattern(this.state.density, N_CELLS);
  }

  _makeDrumTexture(pattern) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 64;
    const c = cv.getContext('2d');
    const n = pattern.length;
    for (let i = 0; i < n; i++) {
      const x0 = Math.floor((i / n) * cv.width);
      const x1 = Math.ceil(((i + 1) / n) * cv.width);
      c.fillStyle = pattern[i] ? hexToCss(COL_EXPOSED) : hexToCss(COL_CHARGED);
      c.fillRect(x0, 0, x1 - x0 + 1, cv.height);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  _makePaperTexture(pattern, od) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#e9edf5';
    c.fillRect(0, 0, cv.width, cv.height);
    const n = pattern.length;
    const alpha = 0.4 + 0.5 * od;
    for (let i = 0; i < n; i++) {
      if (!pattern[i]) continue;
      const x0 = Math.floor((i / n) * cv.width);
      const x1 = Math.ceil(((i + 1) / n) * cv.width);
      c.fillStyle = 'rgba(15,23,42,' + alpha.toFixed(2) + ')';
      c.fillRect(x0, 0, x1 - x0 + 1, cv.height);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  _buildStage() {
    const r = this.drumRadius;
    const len = this.drumLen;

    // --- Chassis base plate: grounds the mechanism as one machine instead
    // of parts floating independently in space. A plain flat box already
    // sits correctly (width=X, thin=Y, length=Z) — no rotation needed. ---
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(len + 0.7, 0.12, 4.6),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    chassis.position.set(0, -r - 0.94, 0.55);
    this.scene.add(chassis);
    const railMat = metalMaterial(0x475569, { metalness: 0.75, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.76, 0.05, 0.05), railMat);
      rail.position.set(0, -r - 0.87, 0.55 + side * 2.25);
      this.scene.add(rail);
    }

    // --- Drum: cylinder lying on its side, spinning about its own axis ---
    this.drumGroup = new THREE.Group();
    this.drumGroup.rotation.z = Math.PI / 2;
    this.scene.add(this.drumGroup);

    const pattern = this._pattern();
    this.drumTexture = this._makeDrumTexture(pattern);
    this.drumMat = new THREE.MeshStandardMaterial({
      map: this.drumTexture,
      roughness: 0.4,
      metalness: 0.3,
    });
    this.drumMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 56, 1, false), this.drumMat);
    this.drumGroup.add(this.drumMesh);
    // End caps read as a real roller, not an open tube.
    const capMat = metalMaterial(0x1f2937, { metalness: 0.6, roughness: 0.35 });
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 24), capMat);
      cap.position.y = side * (len / 2);
      cap.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.drumGroup.add(cap);
    }
    tip(this.drumMesh, 'Photoreceptor drum', 'Uniformly charged by the corona wire, then selectively discharged by the laser to form a latent electrostatic image; toner sticks where the surface is discharged.');
    this.scene.add(placeLabel('Drum', 0, r + 0.55, 0, '#cbd5e1', 1.1));
    const floorShadow = contactShadow(len * 0.9, 1.6, 0.35);
    floorShadow.position.set(0, -2.39, 0.5);
    this.scene.add(floorShadow);

    // --- Corona wire (charging station) — thin rod beside the drum ---
    const chargeZ = -r - 0.55;
    const coronaGeo = new THREE.CylinderGeometry(0.02, 0.02, len * 0.9, 10);
    this.corona = new THREE.Mesh(coronaGeo, metalMaterial(COL_CORONA, { metalness: 0.5, roughness: 0.25, emissive: 0x4c1d95, emissiveIntensity: 0.5 }));
    this.corona.rotation.z = Math.PI / 2;
    this.corona.position.set(0, 0, chargeZ);
    this.scene.add(this.corona);
    attachGlow(this.corona, COL_CORONA, 0.55);
    // Small mounting brackets so the wire reads as installed hardware.
    const bracketMat = metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 });
    for (const side of [-1, 1]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), bracketMat);
      bracket.position.set(0, -0.1, chargeZ + side * (len * 0.43));
      this.scene.add(bracket);
    }
    tip(this.corona, 'Corona wire', 'Sprays ions onto the drum to lay down a uniform electrostatic charge before exposure.');
    this.scene.add(placeLabel('Corona wire (charge)', 0, 0.35, chargeZ - 0.35, '#c4b5fd', 0.95));

    // --- Laser beam: thin bright cylinder sweeping across the drum length ---
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
    this.laserBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: COL_LASER }));
    this.scene.add(this.laserBeam);
    attachGlow(this.laserBeam, COL_LASER, 0.7);
    tip(this.laserBeam, 'Laser (exposure)', 'Scans across the charged drum, discharging pixels that should receive toner — writing the latent image line by line.');
    this.scene.add(placeLabel('Laser (expose)', 0, r + 1.7, 0, '#7dd3fc', 1.0));

    const emitterGeo = roundedBoxGeometry(0.22, 0.14, 0.22, 0.03, 2);
    this.laserEmitter = new THREE.Mesh(emitterGeo, plasticMaterial(0x1e293b, { emissive: COL_LASER, emissiveIntensity: 0.25 }));
    this.scene.add(this.laserEmitter);

    // --- Toner hopper at the develop station ---
    const devZ = r + 0.85;
    const hopperGeo = roundedBoxGeometry(0.5, 0.46, 0.5, 0.06, 3);
    this.hopper = new THREE.Mesh(hopperGeo, plasticMaterial(COL_TONER, { roughness: 0.7 }));
    this.hopper.position.set(0.15, 0.23, devZ);
    this.scene.add(this.hopper);
    const hopperLid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20), metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.3 }));
    hopperLid.position.set(0.15, 0.47, devZ);
    this.scene.add(hopperLid);
    tip(this.hopper, 'Toner hopper (develop)', 'Holds charged toner powder that is attracted onto the discharged (exposed) regions of the drum.');
    this.scene.add(placeLabel('Toner hopper (develop)', 0.15, 0.9, devZ, '#e2e8f0', 1.0));

    // --- Paper: thin plane moving under the drum, picking up the pattern ---
    const paperGeo = new THREE.BoxGeometry(len * 0.92, 0.04, 1.1);
    this.paperTexture = this._makePaperTexture(pattern, opticalDensity(contrastV(this.state.chargeV, this.state.expResidualV)));
    this.paperMat = new THREE.MeshStandardMaterial({ map: this.paperTexture, roughness: 0.85 });
    this.paper = new THREE.Mesh(paperGeo, this.paperMat);
    this.paperY = -r - 0.45;
    this.paper.position.set(0, this.paperY, 0);
    this.scene.add(this.paper);
    this.scene.add(placeLabel('Paper (transfer)', 0, this.paperY + 0.4, 0, '#cbd5e1', 0.95));

    // Small idler rollers under the drum, cueing a feed path.
    const rollerMat = metalMaterial(0x475569, { metalness: 0.7, roughness: 0.35 });
    for (const zOff of [-0.55, 0.55]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len * 0.8, 16), rollerMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(0, this.paperY - 0.11, zOff);
      this.scene.add(roller);
    }

    // --- Fuser roller pair near the paper's exit ---
    this.fuserZ = 1.9;
    this.fuserGroup = new THREE.Group();
    this.fuserGroup.position.set(0, this.paperY, this.fuserZ);
    this.scene.add(this.fuserGroup);
    const fuserGeo = new THREE.CylinderGeometry(0.2, 0.2, len * 0.82, 28);
    this.fuserMat1 = metalMaterial(0x1e293b, { metalness: 0.55, roughness: 0.3, emissive: COL_FUSER_OK, emissiveIntensity: 0.6 });
    this.fuserMat2 = this.fuserMat1.clone();
    this.fuserTop = new THREE.Mesh(fuserGeo, this.fuserMat1);
    this.fuserTop.rotation.z = Math.PI / 2;
    this.fuserTop.position.y = 0.24;
    this.fuserGroup.add(this.fuserTop);
    this.fuserBottom = new THREE.Mesh(fuserGeo, this.fuserMat2);
    this.fuserBottom.rotation.z = Math.PI / 2;
    this.fuserBottom.position.y = -0.24;
    this.fuserGroup.add(this.fuserBottom);
    tip(this.fuserGroup, 'Fuser rollers', 'A heated roller pair (~180-220C) that melts and bonds the toner permanently onto the paper.');
    this.scene.add(placeLabel('Fuser (fuse)', 0, this.paperY + 0.55, this.fuserZ, '#fbbf24', 1.0));
  }

  setParams(p) {
    if (!p) return;
    if (p.chargeV != null) this.state.chargeV = p.chargeV;
    if (p.expResidualV != null) this.state.expResidualV = p.expResidualV;
    if (p.density != null) this.state.density = p.density;
    if (p.fuserTempC != null) this.state.fuserTempC = p.fuserTempC;

    const pattern = this._pattern();
    const cV = contrastV(this.state.chargeV, this.state.expResidualV);
    const od = opticalDensity(cV);

    if (this.drumTexture) this.drumTexture.dispose();
    this.drumTexture = this._makeDrumTexture(pattern);
    this.drumMat.map = this.drumTexture;
    this.drumMat.needsUpdate = true;

    if (this.paperTexture) this.paperTexture.dispose();
    this.paperTexture = this._makePaperTexture(pattern, od);
    this.paperMat.map = this.paperTexture;
    this.paperMat.needsUpdate = true;

    const fOk = fuserOk(this.state.fuserTempC);
    const fCol = fOk ? COL_FUSER_OK : (this.state.fuserTempC < 180 ? COL_FUSER_COLD : COL_FUSER_HOT);
    this.fuserMat1.emissive.setHex(fCol);
    this.fuserMat2.emissive.setHex(fCol);
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips() {
    // Tips are already attached directly to meshes via tip() in _buildStage().
  }

  getPickables() {
    return [this.drumMesh, this.laserBeam, this.hopper, this.fuserGroup, this.corona].filter(Boolean);
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
      this.phase += 0.016;

      // Spin the drum about its own axis.
      this.drumMesh.rotation.y += 0.02;

      // Laser sweeps back and forth along the drum's length.
      const r = this.drumRadius;
      const sweepT = (this.phase * 0.3) % 1;
      const beamX = -this.halfLen + sweepT * this.drumLen;
      this.laserBeam.position.set(beamX, r + 0.7, 0);
      this.laserEmitter.position.set(beamX, r + 1.4, 0);

      // Paper feeds along Z under the drum, past the fuser.
      const feedLen = this.fuserZ + 1.6;
      const paperT = (this.phase * 0.18) % 1;
      this.paper.position.z = -feedLen * 0.5 + paperT * feedLen;

      // Fuser rollers pulse subtly to show they are active.
      const pulse = 0.5 + 0.15 * Math.sin(this.phase * 3);
      this.fuserMat1.emissiveIntensity = pulse;
      this.fuserMat2.emissiveIntensity = pulse;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
