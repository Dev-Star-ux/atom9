// GPU 3D point-cloud renderer for a hydrogen orbital. Uses a single THREE.Points
// object (one draw call) so it stays fast even on Chromium's software WebGL
// (no-GPU / CPU-only machines). Soft round glowing sprites for a nice look.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { stat } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, glowTexture, SCENE_BG } from '../common/sceneVisuals.js';

function makeSprite() {
  return glowTexture('#ffffff', 64);
}

const POS_COLOR = [0.29, 0.64, 1.0];  // blue  (ψ > 0)
const NEG_COLOR = [1.0, 0.36, 0.48];  // red   (ψ < 0)

export class Orbital3D {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    this.camera.position.set(15, 10, 30);

    this.renderer = setupRenderer(container);
    this.renderer.setClearColor(SCENE_BG, 1);

    addStudioLights(this.scene);
    addFloorGrid(this.scene, 40, -8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.7;

    this.sprite = makeSprite();
    this.points = null;
    this.paused = false;
    this._autoRotate = true;
    this._tipTexts = {};
    this.quantum = { n: 2, l: 1, m: 0, energyEV: -3.4 };
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  setCloud(cloud) {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.points = null;
    }
    const n = cloud.count;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = cloud.xs[i];
      pos[i * 3 + 1] = cloud.ys[i];
      pos[i * 3 + 2] = cloud.zs[i];
      const c = cloud.signs[i] > 0 ? POS_COLOR : NEG_COLOR;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: Math.max(0.14, cloud.rMax * 0.012),
      map: this.sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);
    this._bindTips();

    // frame the camera to the orbital size
    const d = cloud.rMax * 2.4;
    this.camera.position.set(d * 0.45, d * 0.32, d);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setAutoRotate(v) { this._autoRotate = !!v; this.controls.autoRotate = !!v && !this.paused; }

  setPaused(v) {
    this.paused = !!v;
    this.controls.autoRotate = this._autoRotate && !this.paused;
  }

  setQuantumState(n, l, m, energyEV) {
    this.quantum = { n, l, m, energyEV };
    this._bindTips();
  }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.cloud || !this.points) return;
    const q = this.quantum;
    this.points.userData.sceneTip = () => ({
      title: tips.cloud.title,
      desc: tips.cloud.desc,
      stats: [
        stat(tips, 'quantumN', q.n),
        stat(tips, 'quantumL', q.l),
        stat(tips, 'quantumM', q.m),
        stat(tips, 'energy', `${q.energyEV.toFixed(2)} eV`),
      ],
    });
  }

  getPickables() {
    return this.points ? [this.points] : [];
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
    if (this.points) {
      this.points.geometry.dispose();
      this.points.material.dispose();
    }
    this.sprite.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}
