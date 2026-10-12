// 3D cathode-ray tube (Three.js). Electron gun → deflection plates (E field) and
// magnetic coils (B field) → phosphor screen. The beam bends according to the
// physics; small electron sprites stream along it. One draw pass, works on
// software WebGL (CPU-only).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { stat } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, glassMaterial } from '../common/sceneVisuals.js';

const COL = {
  glass: 0x22304f, plateP: 0xff5c7a, plateN: 0x4aa3ff, coil: 0xfbbf24,
  beam: 0x22d3ee, screen: 0x0a1122, spot: 0x8bffea, metal: 0x6b7a99,
};

// scene geometry (units)
const Z_GUN = -6.2, Z_PLATE0 = -1.5, Z_PLATE1 = 0.5, Z_SCREEN = 6.0;
const V_SCALE = 24;         // metres → units for deflection
const Y_CLAMP = 1.7;

export class TubeScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.set(6.5, 5.5, 12);

    this.renderer = setupRenderer(container);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    addStudioLights(this.scene);
    addFloorGrid(this.scene, 20, -2.5);

    this._buildStatic();
    this.beamGroup = new THREE.Group();
    this.scene.add(this.beamGroup);
    this.curve = null;
    this.electrons = [];
    this.paused = false;
    this._tipTexts = {};
    this.beamParams = { Vacc: 0, Vd: 0, B: 0, y1: 0, Y: 0, v: 0 };
    this._alive = true;
    this._last = performance.now();
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStatic() {
    // glass tube
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, Z_SCREEN - Z_GUN + 0.6, 32, 1, true),
      glassMaterial(COL.glass, 0.16)
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.z = (Z_GUN + Z_SCREEN) / 2 - 0.3 + 0.3;
    this.scene.add(tube);

    // electron gun (cathode)
    const gun = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 1.4, 20),
      new THREE.MeshStandardMaterial({ color: COL.metal, metalness: 0.7, roughness: 0.4 })
    );
    gun.rotation.x = Math.PI / 2;
    gun.position.z = Z_GUN + 0.7;
    this.gun = gun;
    this.scene.add(gun);

    // deflection plates (top +, bottom −)
    const plateGeo = new THREE.BoxGeometry(1.4, 0.14, Z_PLATE1 - Z_PLATE0);
    const top = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: COL.plateP, emissive: COL.plateP, emissiveIntensity: 0.25 }));
    top.position.set(0, 1.0, (Z_PLATE0 + Z_PLATE1) / 2);
    const bot = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: COL.plateN, emissive: COL.plateN, emissiveIntensity: 0.25 }));
    bot.position.set(0, -1.0, (Z_PLATE0 + Z_PLATE1) / 2);
    this.scene.add(top, bot);
    this.platePlus = top; this.plateMinus = bot;

    // magnetic coils (two rings around the beam near the plate region)
    const coilMat = new THREE.MeshStandardMaterial({ color: COL.coil, emissive: COL.coil, emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.5 });
    this.coilGroup = new THREE.Group();
    for (const zc of [Z_PLATE0 - 0.1, Z_PLATE1 + 0.1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.09, 12, 40), coilMat);
      ring.rotation.y = Math.PI / 2;    // axis along z
      ring.position.z = zc;
      this.coilGroup.add(ring);
    }
    this.scene.add(this.coilGroup);

    // phosphor screen
    const screen = new THREE.Mesh(
      new THREE.CircleGeometry(1.85, 48),
      new THREE.MeshStandardMaterial({ color: COL.screen, emissive: 0x0c1a30, emissiveIntensity: 0.4, side: THREE.DoubleSide })
    );
    screen.position.z = Z_SCREEN;
    this.screen = screen;
    this.scene.add(screen);

    // gridlines on the screen (a simple cross)
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.7, 0, Z_SCREEN + 0.01), new THREE.Vector3(1.7, 0, Z_SCREEN + 0.01),
      new THREE.Vector3(0, -1.7, Z_SCREEN + 0.01), new THREE.Vector3(0, 1.7, Z_SCREEN + 0.01),
    ]);
    this.scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a3a5a })));

    // the glowing spot where the beam hits the screen
    this.spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshBasicMaterial({ color: COL.spot })
    );
    this.spot.position.set(0, 0, Z_SCREEN + 0.02);
    this.scene.add(this.spot);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: COL.spot, transparent: true, opacity: 0.45 }));
    glow.scale.set(0.55, 0.55, 1);
    this.spot.add(glow);
  }

  setPaused(v) { this.paused = !!v; }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.gun) return;
    const p = this.beamParams;
    const vStr = `${(p.v / 1e7).toFixed(2)} ×10⁷ m/s`;
    const yStr = `${(p.Y * 100).toFixed(2)} cm`;
    this.gun.userData.sceneTip = () => ({
      title: tips.gun.title, desc: tips.gun.desc,
      stats: [stat(tips, 'accelVoltage', `${p.Vacc} V`)],
    });
    this.platePlus.userData.sceneTip = () => ({
      title: tips.plateP.title, desc: tips.plateP.desc,
      stats: [stat(tips, 'deflectVoltage', `${p.Vd} V`)],
    });
    this.plateMinus.userData.sceneTip = () => ({
      title: tips.plateN.title, desc: tips.plateN.desc,
      stats: [stat(tips, 'deflectVoltage', `${p.Vd} V`)],
    });
    this.coilGroup.userData.sceneTip = () => ({
      title: tips.coils.title, desc: tips.coils.desc,
      stats: [stat(tips, 'magneticB', `${(p.B * 1e3).toFixed(2)} mT`)],
    });
    this.screen.userData.sceneTip = () => ({
      title: tips.screen.title, desc: tips.screen.desc,
      stats: [stat(tips, 'screenY', yStr), stat(tips, 'deflection', yStr)],
    });
    this.spot.userData.sceneTip = () => ({
      title: tips.beam.title, desc: tips.beam.desc,
      stats: [
        stat(tips, 'speed', vStr),
        stat(tips, 'deflection', yStr),
        stat(tips, 'accelVoltage', `${p.Vacc} V`),
        stat(tips, 'magneticB', `${(p.B * 1e3).toFixed(2)} mT`),
      ],
    });
  }

  getPickables() {
    return [this.gun, this.platePlus, this.plateMinus, this.coilGroup, this.screen, this.spot, this.beamGroup].filter(Boolean);
  }

  // y1 = plate-exit deflection (m), Y = screen deflection (m)
  setBeam(y1m, Ym, params) {
    if (params) Object.assign(this.beamParams, params);
    this.beamParams.y1 = y1m;
    this.beamParams.Y = Ym;
    const y1 = THREE.MathUtils.clamp(y1m * V_SCALE, -Y_CLAMP, Y_CLAMP);
    const Y = THREE.MathUtils.clamp(Ym * V_SCALE, -Y_CLAMP, Y_CLAMP);

    const pts = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const z = Z_GUN + (Z_SCREEN - Z_GUN) * i / N;
      let y = 0;
      if (z <= Z_PLATE0) y = 0;
      else if (z <= Z_PLATE1) { const f = (z - Z_PLATE0) / (Z_PLATE1 - Z_PLATE0); y = y1 * f * f; }
      else { const t = (z - Z_PLATE1) / (Z_SCREEN - Z_PLATE1); y = y1 + (Y - y1) * t; }
      pts.push(new THREE.Vector3(0, y, z));
    }
    this.curve = new THREE.CatmullRomCurve3(pts);

    // rebuild beam tube
    this.beamGroup.clear();
    const tubeGeo = new THREE.TubeGeometry(this.curve, 80, 0.05, 8, false);
    const beam = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: COL.beam, transparent: true, opacity: 0.72 }));
    this.beamGroup.add(beam);

    this.electrons = [];
    for (let i = 0; i < 9; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, depthTest: false }));
      e.renderOrder = 10;
      attachGlow(e, 0xbfe9ff, 1.1);
      e.userData.t = i / 7;
      this.beamGroup.add(e);
      this.electrons.push(e);
    }
    this.spot.position.set(0, Y, Z_SCREEN + 0.02);
    attachGlow(this.spot, COL.spot, 1.4);
    this._bindTips();
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (!this.paused && this.curve) {
      for (const e of this.electrons) {
        e.userData.t = (e.userData.t + dt * 0.4) % 1;
        const p = this.curve.getPoint(e.userData.t);
        e.position.copy(p);
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}
