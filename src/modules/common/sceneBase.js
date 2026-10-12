import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid } from "./sceneVisuals.js";
export class SceneShell {
  constructor(container, {
    fov = 48,
    cameraPos = [0, 10, 22],
    target = [0, 0, 0],
    gridSize = 30,
    gridY = -2.5
  } = {}) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
    this.camera.position.set(...cameraPos);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(...target);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, gridSize, gridY);
    this.paused = false;
    this._tipTexts = {};
    this._pickList = [];
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    var _a, _b;
    this._tipTexts = tips || {};
    (_a = this._bindTips) == null ? void 0 : _a.call(this);
    for (const obj of this._pickList) {
      const key = (_b = obj == null ? void 0 : obj.userData) == null ? void 0 : _b.tipKey;
      const t = tips == null ? void 0 : tips[key];
      if ((t == null ? void 0 : t.title) && !obj.userData.sceneTip) {
        obj.userData.sceneTip = { title: t.title, desc: t.desc || "" };
      }
    }
  }
  getPickables() {
    return this._pickList.filter(Boolean);
  }
  tip(obj, key) {
    if (obj) {
      obj.userData.tipKey = key;
      this._pickList.push(obj);
    }
    return obj;
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.controls.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
