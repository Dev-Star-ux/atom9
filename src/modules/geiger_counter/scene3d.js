import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, attachGlow, addFloorGrid } from '../common/sceneVisuals.js';

export class Geiger3D {
  constructor(container) {
    this.container = container;
    this.distance = 0.5;
    this.shieldMm = 0;
    this._active = false;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 4, 8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 16, -1.2);

    this.source = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x78350f, emissiveIntensity: 0.5 })
    );
    this.source.position.set(-2.5, 0.3, 0);
    this.scene.add(this.source);
    attachGlow(this.source, 0xfbbf24, 1.4);

    this.detector = new THREE.Group();
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 })
    );
    tube.rotation.z = Math.PI / 2;
    this.detector.add(tube);
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.3 })
    );
    window.position.x = -0.55;
    this.detector.add(window);
    this.scene.add(this.detector);

    this.shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 })
    );
    this.scene.add(this.shield);

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.setParams({ distance: 0.5, shieldMm: 0 });
    this.resize();
  }

  setParams(p) {
    if (!p) return;
    if (p.distance != null) this.distance = p.distance;
    if (p.shieldMm != null) this.shieldMm = p.shieldMm;
    this.detector.position.x = -2.5 + this.distance * 4;
    this.shield.visible = this.shieldMm > 0;
    this.shield.position.copy(this.detector.position);
    this.shield.position.x -= 0.35;
    this.shield.scale.x = 0.5 + this.shieldMm * 0.02;
  }

  setActive(v) { this._active = !!v; }
  applyTips() {}
  getPickables() { return [this.source, this.detector]; }

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
