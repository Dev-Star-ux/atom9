import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { blackbodyColor, wienPeakNm, stefanBoltzmann } from "./physics.js";
import { stat } from "../common/sceneChrome.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow } from "../common/sceneVisuals.js";
export class PlanckScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camera.position.set(0, 4, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -4);
    this.T = 4e3;
    this.hScale = 1;
    this.paused = false;
    this._tipTexts = {};
    this.cavity = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 48, 48),
      new THREE.MeshStandardMaterial({ color: 16748608, emissive: 16736288, emissiveIntensity: 0.95, metalness: 0.1, roughness: 0.55 })
    );
    this.scene.add(this.cavity);
    attachGlow(this.cavity, 16744512, 5.5);
    this.glow = new THREE.PointLight(16744512, 2, 30);
    this.cavity.add(this.glow);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.1, 8, 64),
      new THREE.MeshBasicMaterial({ color: 3359061, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);
    this._updateColor();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  setParams({ T, hScale }) {
    if (T != null) this.T = T;
    if (hScale != null) this.hScale = hScale;
    this._updateColor();
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
    if (!tips.cavity) return;
    this.cavity.userData.sceneTip = () => ({
      title: tips.cavity.title,
      desc: tips.cavity.desc,
      stats: [
        stat(tips, "temperature", `${this.T.toFixed(0)} K`),
        stat(tips, "peakWavelength", `${wienPeakNm(this.T).toFixed(0)} nm`),
        stat(tips, "power", `${(stefanBoltzmann(this.T) / 1e3).toFixed(0)} kW/m\xB2`)
      ]
    });
  }
  getPickables() {
    return [this.cavity];
  }
  _updateColor() {
    const col = blackbodyColor(this.T);
    this.cavity.material.color.setHex(col);
    this.cavity.material.emissive.setHex(col);
    this.glow.color.setHex(col);
    const inten = 0.8 + Math.min(2, this.T / 6e3 * 2);
    this.cavity.material.emissiveIntensity = inten;
    this.glow.intensity = inten * 2;
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) this.cavity.rotation.y += 4e-3;
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
