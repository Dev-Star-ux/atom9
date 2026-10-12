// Thermionic emission — 3D vacuum-diode schematic: heated filament (cathode)
// boiling off electrons that accelerate to a flat anode plate.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  richardsonCurrent,
  diodeCurrent,
  limitingRegime,
} from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassMaterial,
  glassTube,
  glowSphere,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const K_CL = 2e-6;
const TUBE_LEN = 4.6;
const TUBE_R = 1.1;

export class ThermionicScene3D {
  constructor(container) {
    this.container = container;
    this.T = 2000;
    this.W = 4.5;
    this.V = 50;
    this.paused = false;
    this._active = false;
    this._electrons = [];
    this._spawnAcc = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(6.9, 3.3, 8.9);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.05, 0);
    addStudioLights(this.scene);

    this._buildStage();
    this._alive = true;
    this._clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    this.scene.add(floor);

    // Metal chassis base plate the whole tube apparatus mounts on — grounds
    // the assembly so it reads as a mounted instrument, not floating glass.
    const baseY = -1.62;
    const baseGeo = roundedBoxGeometry(TUBE_LEN + 1.1, 0.16, 1.7, 0.05, 3);
    const base = new THREE.Mesh(baseGeo, metalMaterial(0x475569, { metalness: 0.7, roughness: 0.35 }));
    base.position.set(0, baseY, 0);
    this.scene.add(base);
    this.scene.add(contactShadow(TUBE_LEN * 0.62, 1.0, 0.4).translateY(baseY - 0.08 + 0.001));

    // Dark-plastic sockets/stands that lift the glass envelope off the base.
    const socketMat = plasticMaterial(0x111827, { roughness: 0.6 });
    const socketTopY = -TUBE_R + 0.04;
    [-TUBE_LEN / 2 + 0.35, TUBE_LEN / 2 - 0.35].forEach((sx) => {
      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.4, socketTopY - baseY - 0.08, 16),
        socketMat
      );
      socket.position.set(sx, baseY + 0.08 + (socketTopY - baseY - 0.08) / 2, 0);
      this.scene.add(socket);
    });

    // Glass envelope of the vacuum tube (oriented along X)
    const glass = glassTube(TUBE_R, TUBE_LEN, 0.16);
    glass.rotation.z = Math.PI / 2;
    this.scene.add(glass);
    this._tip = tip(glass, 'Vacuum tube', 'Sealed, evacuated envelope — electrons travel from cathode to anode with no air collisions.');

    // End caps (subtle) so the tube reads as an enclosed vessel
    const capMat = glassMaterial(0x334155, 0.22);
    const capL = new THREE.Mesh(new THREE.CircleGeometry(TUBE_R, 32), capMat);
    capL.rotation.y = Math.PI / 2;
    capL.position.x = -TUBE_LEN / 2;
    this.scene.add(capL);
    const capR = new THREE.Mesh(new THREE.CircleGeometry(TUBE_R, 32), capMat);
    capR.rotation.y = -Math.PI / 2;
    capR.position.x = TUBE_LEN / 2;
    this.scene.add(capR);

    // Cathode: a heated helical filament coil near the -X end.
    this.filamentX = -TUBE_LEN / 2 + 0.75;
    const helixPts = [];
    const coilR = 0.32;
    const coilLen = 0.9;
    const turns = 7;
    for (let i = 0; i <= 160; i++) {
      const u = i / 160;
      const ang = u * Math.PI * 2 * turns;
      helixPts.push(new THREE.Vector3(
        this.filamentX + (u - 0.5) * coilLen,
        Math.sin(ang) * coilR,
        Math.cos(ang) * coilR
      ));
    }
    const helixCurve = new THREE.CatmullRomCurve3(helixPts);
    const filamentGeo = new THREE.TubeGeometry(helixCurve, 220, 0.035, 8, false);
    this.filamentMat = new THREE.MeshStandardMaterial({
      color: 0xff6a3d,
      emissive: 0xff6a3d,
      emissiveIntensity: 1.0,
      roughness: 0.35,
      metalness: 0.4,
    });
    this.filament = new THREE.Mesh(filamentGeo, this.filamentMat);
    this.scene.add(this.filament);
    this.filamentGlow = attachGlow(this.filament, 0xff6a3d, 1.6);
    tip(this.filament, 'Cathode (filament)', 'Heating the filament gives electrons enough thermal energy to climb the work function W and escape (Richardson-Dushman law: J = A T² e^(−W/kT)).');
    this.scene.add(placeLabel('cathode (filament)', this.filamentX, -0.75, 0, '#fca5a5', 0.95));

    // Anode: a flat plate near the +X end.
    const anodeX = TUBE_LEN / 2 - 0.6;
    this.anodeX = anodeX;
    const anodeGeo = new THREE.CylinderGeometry(TUBE_R * 0.72, TUBE_R * 0.72, 0.08, 32);
    this.anodeMat = metalMaterial(0x38bdf8, {
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      metalness: 0.75,
      roughness: 0.3,
    });
    this.anode = new THREE.Mesh(anodeGeo, this.anodeMat);
    this.anode.rotation.z = Math.PI / 2;
    this.anode.position.x = anodeX;
    this.scene.add(this.anode);
    tip(this.anode, 'Anode (plate)', 'Positive anode voltage V accelerates and collects electrons. Raising V pulls the current up (Child-Langmuir, I ∝ V^1.5) until it saturates at the Richardson temperature-limited value.');
    this.scene.add(placeLabel('anode (plate)', anodeX, -0.9, 0, '#7dd3fc', 0.95));

    // Live readout label
    this._liveLbl = placeLabel('T = 2000 K, W = 4.50 eV', 0, 1.7, 0, '#e2e8f0', 1.05);
    this.scene.add(this._liveLbl);

    // Electron pool
    this._pool = [];
    const POOL_SIZE = 90;
    for (let i = 0; i < POOL_SIZE; i++) {
      const e = glowSphere(0.045, 0x67e8f9);
      e.visible = false;
      this.scene.add(e);
      this._pool.push({ mesh: e, active: false, t: 0, speed: 1, yz: new THREE.Vector2() });
    }

    this._updateFilamentVisual();
    this._updateAnodeVisual();
    this._updateLiveLabel();
  }

  setParams(p) {
    if (!p) return;
    if (p.T != null) this.T = p.T;
    if (p.W != null) this.W = p.W;
    if (p.V != null) this.V = p.V;
    this._updateFilamentVisual();
    this._updateAnodeVisual();
    this._updateLiveLabel();
  }

  _updateFilamentVisual() {
    // Dim red (low T) -> bright white-yellow (high T)
    const heat = Math.max(0, Math.min(1, (this.T - 800) / (3000 - 800)));
    const color = new THREE.Color();
    color.setRGB(
      0.55 + 0.45 * heat,
      0.14 + 0.75 * heat,
      0.06 + 0.62 * heat * heat
    );
    this.filamentMat.color.copy(color);
    this.filamentMat.emissive.copy(color);
    this.filamentMat.emissiveIntensity = 0.5 + 2.2 * heat;
    if (this.filamentGlow) {
      const s = (0.9 + 1.4 * heat) * 1.6;
      this.filamentGlow.scale.set(s, s, 1);
      this.filamentGlow.material.opacity = 0.35 + 0.5 * heat;
    }

    // Emission spawn rate: exaggerated log-scale of Richardson saturation
    // current so the exponential T/W dependence reads clearly on screen.
    const Irich = richardsonCurrent(this.T, this.W);
    const logI = Math.log10(Math.max(Irich, 1e-38));
    const visRate = Math.max(0, Math.min(1, (logI + 34) / 38));
    this._spawnRatePerSec = 4 + 56 * visRate;
  }

  _updateAnodeVisual() {
    const v = Math.max(0, Math.min(1, this.V / 300));
    this.anodeMat.emissiveIntensity = 0.15 + 0.9 * v;
    this._electronSpeed = 1.0 + 3.5 * v;
  }

  _updateLiveLabel() {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const regime = limitingRegime(this.T, this.W, null, this.V, K_CL);
    const I = diodeCurrent(this.T, this.W, null, this.V, K_CL);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.82)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'T=' + this.T.toFixed(0) + 'K  W=' + this.W.toFixed(2) + 'eV  V=' + this.V.toFixed(0) +
      'V  I≈' + I.toExponential(1) + 'A (' + (regime === 'temperature' ? 'T-limited' : 'space-charge') + ')',
      192, 24
    );
    this._liveLbl.material.map.needsUpdate = true;
  }

  _spawnElectron() {
    const free = this._pool.find(function (e) { return !e.active; });
    if (!free) return;
    free.active = true;
    free.t = 0;
    free.speed = this._electronSpeed * (0.85 + 0.3 * Math.random());
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.random() * 0.22;
    free.yz.set(Math.cos(ang) * rr, Math.sin(ang) * rr);
    free.mesh.visible = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.filament, this.anode].filter(Boolean);
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
    const dt = Math.min(0.05, this._clock.getDelta());
    if (this._active && !this.paused) {
      this._spawnAcc += dt * (this._spawnRatePerSec || 0);
      while (this._spawnAcc >= 1) {
        this._spawnAcc -= 1;
        this._spawnElectron();
      }

      const travel = TUBE_LEN * 0.7;
      for (let i = 0; i < this._pool.length; i++) {
        const e = this._pool[i];
        if (!e.active) continue;
        e.t += dt * e.speed * 0.35;
        if (e.t >= 1) {
          e.active = false;
          e.mesh.visible = false;
          continue;
        }
        const x = this.filamentX + travel * e.t;
        const settle = Math.min(1, e.t * 4);
        e.mesh.position.set(x, e.yz.y * (1 - settle * 0.5), e.yz.x * (1 - settle * 0.5));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
