import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow } from '../common/sceneVisuals.js';

export class Moderator3D {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(5, 4, 7);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 14, -1);

    const fuelMat = new THREE.MeshStandardMaterial({ color: 0xf87171, emissive: 0x450a0a, emissiveIntensity: 0.2 });
    for (let i = 0; i < 4; i++) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 12), fuelMat);
      rod.position.set(-1.5 + i * 1, 0.5, 0);
      this.scene.add(rod);
    }
    const mod = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 1.4, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: 0.75 })
    );
    mod.position.set(0.5, 0.2, 0);
    this.scene.add(mod);

    this.neutrons = [];
    for (let j = 0; j < 12; j++) {
      const n = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      n.position.set(-2 + Math.random(), 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
      this.scene.add(n);
      attachGlow(n, 0xfbbf24, 0.5);
      this.neutrons.push({ mesh: n, vx: 0.02 + Math.random() * 0.02, thermal: false });
    }

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  setParams() {}
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
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      n.mesh.position.x += n.vx;
      if (n.mesh.position.x > 1.8) {
        n.mesh.position.x = -2;
        n.thermal = false;
        n.mesh.material.color.setHex(0xfbbf24);
      }
      if (n.mesh.position.x > 0 && !n.thermal && Math.random() < 0.02) {
        n.thermal = true;
        n.mesh.material.color.setHex(0x38bdf8);
        n.vx *= 0.4;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
