import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { stat } from "../common/sceneChrome.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, glassTube, dashedGuide } from "../common/sceneVisuals.js";
const Z_CATH = -9, Z_GRID = -5, Z_COLL = 8;
const TUBE_R = 1.6;
export class FrankHertzScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camera.position.set(4, 6, 16);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -2.8);
    this.voltage = 6;
    this.E0 = 4.89;
    this.paused = false;
    this._tipTexts = {};
    this.electrons = [];
    this._spawnAcc = 0;
    this._buildTube();
    this._buildGas();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  _buildTube() {
    const glass = glassTube(TUBE_R, Z_COLL - Z_CATH + 2, 0.18);
    glass.rotation.x = Math.PI / 2;
    glass.position.z = (Z_CATH + Z_COLL) / 2;
    this.scene.add(glass);
    const flowPts = [new THREE.Vector3(0, 0, Z_CATH), new THREE.Vector3(0, 0, Z_COLL)];
    this.scene.add(dashedGuide(flowPts, 16498468, 0.35));
    this.cathode = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 2.4, 2.4),
      new THREE.MeshStandardMaterial({ color: 6583435, emissive: 3359061, emissiveIntensity: 0.3, metalness: 0.8 })
    );
    this.cathode.position.z = Z_CATH;
    this.scene.add(this.cathode);
    this.grid = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.8, 2.8),
      new THREE.MeshStandardMaterial({ color: 16498468, emissive: 16498468, emissiveIntensity: 0.35 })
    );
    this.grid.position.z = Z_GRID;
    this.scene.add(this.grid);
    this.collector = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 2.2, 2.2),
      new THREE.MeshStandardMaterial({ color: 6583435, emissive: 2282478, emissiveIntensity: 0.15, metalness: 0.7 })
    );
    this.collector.position.z = Z_COLL;
    this.scene.add(this.collector);
    this.eGroup = new THREE.Group();
    this.scene.add(this.eGroup);
  }
  _buildGas() {
    this.gasGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 8246268, emissive: 959977, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 36; i++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.08, 10, 10), mat);
      a.position.set(
        (Math.random() - 0.5) * TUBE_R * 1.2,
        (Math.random() - 0.5) * TUBE_R * 1.2,
        Z_GRID + 1 + Math.random() * (Z_COLL - Z_GRID - 2)
      );
      this.gasGroup.add(a);
    }
    this.scene.add(this.gasGroup);
  }
  setVoltage(v) {
    this.voltage = v;
    this._bindTips();
  }
  setGas(E0) {
    this.E0 = E0;
    this._bindTips();
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }
  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.cathode) return;
    const vStr = `${this.voltage.toFixed(1)} V`;
    const eStr = `${this.E0.toFixed(2)} eV`;
    this.cathode.userData.sceneTip = () => ({
      title: tips.cathode.title,
      desc: tips.cathode.desc,
      stats: [stat(tips, "voltage", vStr)]
    });
    this.grid.userData.sceneTip = () => ({
      title: tips.grid.title,
      desc: tips.grid.desc,
      stats: [stat(tips, "voltage", vStr)]
    });
    this.collector.userData.sceneTip = () => ({
      title: tips.collector.title,
      desc: tips.collector.desc,
      stats: [stat(tips, "voltage", vStr), stat(tips, "excitation", eStr)]
    });
    this.gasGroup.userData.sceneTip = () => ({
      title: tips.gas.title,
      desc: tips.gas.desc,
      stats: [stat(tips, "excitation", eStr)]
    });
  }
  getPickables() {
    return [this.cathode, this.grid, this.collector, this.gasGroup, ...this.eGroup.children];
  }
  _spawnElectron() {
    const mat = new THREE.MeshBasicMaterial({ color: 8380415 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat);
    attachGlow(m, 8380415, 1.1);
    m.position.set(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8,
      Z_CATH + 0.5
    );
    m.userData = { z: Z_CATH + 0.5, ke: 0, inelastic: 0 };
    this.eGroup.add(m);
    this.electrons.push(m);
    if (this.electrons.length > 40) {
      const old = this.electrons.shift();
      this.eGroup.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) {
      this._spawnAcc += 0.08;
      while (this._spawnAcc >= 1) {
        this._spawnAcc -= 1;
        this._spawnElectron();
      }
      const tubeLen = Z_COLL - Z_CATH;
      for (const m of this.electrons) {
        const u = m.userData;
        const frac = (u.z - Z_CATH) / tubeLen;
        let ke = this.voltage * Math.max(0, frac);
        const nMax = this.E0 > 0 ? Math.floor(ke / this.E0) : 0;
        if (nMax > u.inelastic && Math.random() < 0.04) {
          u.inelastic = nMax;
          ke = Math.max(0.05, ke - this.E0);
          m.material.color.set(16281969);
        }
        u.ke = ke;
        u.z += 0.12 * Math.sqrt(ke);
        m.position.z = u.z;
        if (u.z > Z_COLL - 0.3) {
          this.eGroup.remove(m);
          m.geometry.dispose();
          m.material.dispose();
          const idx = this.electrons.indexOf(m);
          if (idx >= 0) this.electrons.splice(idx, 1);
        }
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
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
