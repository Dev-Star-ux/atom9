import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow } from '../common/sceneVisuals.js';

export class Pet3D {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 3, 6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 12, -1.5);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.12, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.35, metalness: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8;
    this.scene.add(ring);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.2, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.85 })
    );
    body.position.y = 0.6;
    this.scene.add(body);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 })
    );
    this.glow.position.set(0.1, 0.9, 0);
    body.add(this.glow);
    attachGlow(this.glow, 0xf472b6, 0.8);

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  setParams(p) {
    if (!p || p.tMin == null || !this.glow) return;
    const frac = Math.max(0.1, 1 - p.tMin / 400);
    this.glow.material.opacity = 0.2 + frac * 0.5;
    this.glow.scale.setScalar(0.5 + frac);
  }

  setActive() {}
  applyTips() {}
  getPickables() { return []; }

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
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
