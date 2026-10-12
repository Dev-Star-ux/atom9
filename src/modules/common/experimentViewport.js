import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid } from "./sceneVisuals.js";
export class ExperimentViewport {
  constructor(container, { cameraPos = [0, 8, 18], target = [0, 0, 0], fog = true } = {}) {
    this.container = container;
    this.scene = setupScene();
    if (!fog) this.scene.fog = null;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    this.camera.position.set(...cameraPos);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(...target);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 30, -2.5);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.paused = false;
    this._tipTexts = {};
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    this._tipTexts = tips || {};
  }
  getPickables() {
    return this._pickables || [];
  }
  _animate() {
    var _a;
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    const dt = this.paused ? 0 : 0.016;
    (_a = this.onTick) == null ? void 0 : _a.call(this, dt);
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
