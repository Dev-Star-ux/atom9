import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene, setupRenderer, addStudioLights, addFloorGrid, placeLabel, plasticMaterial, glowSphere,
} from '../common/sceneVisuals.js';
import { getTarget, canFission, stageFromPhase, dropAxes } from './physics.js';

export class FissionMechanismScene3D {
  constructor(container) {
    this.container = container;
    this.state = { targetId: 'u235', neutronMeV: 0.025, speed: 1 };
    this.paused = false;
    this._active = false;
    this.phase = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(0, 3.6, 8.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.1, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -1.4);

    this.drop = new THREE.Group();
    this.drop.position.set(0, 1.15, 0);
    this.scene.add(this.drop);
    this._nucleons = [];
    const geo = new THREE.SphereGeometry(0.16, 16, 12);
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(geo, plasticMaterial(i % 2 ? 0xf59e0b : 0xfacc15, { roughness: 0.4 }));
      this.drop.add(m);
      this._nucleons.push(m);
    }
    tip(this.drop, 'Compound nucleus', 'Liquid drop: capture, wobble, elongate through the saddle, then scission.');

    this.neutron = glowSphere(0.09, 0x38bdf8, { pick: false });
    this.scene.add(this.neutron);
    this.frags = [plasticMaterial(0xfb923c), plasticMaterial(0xf97316)];
    this.fA = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), this.frags[0]);
    this.fB = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 20), this.frags[1]);
    this.fA.visible = this.fB.visible = false;
    this.scene.add(this.fA, this.fB);
    this.freeN = [];
    for (let i = 0; i < 3; i++) {
      const n = glowSphere(0.07, 0x7dd3fc, { pick: false });
      n.visible = false;
      this.scene.add(n);
      this.freeN.push(n);
    }
    this._lbl = placeLabel('n capture', 0, 2.7, 0, '#7dd3fc', 0.95);
    this.scene.add(this._lbl);
    this._hud = document.createElement('div');
    this._hud.className = 'fm-hud';
    this._hud.textContent = '3D: watch the drop stretch, then split';
    container.appendChild(this._hud);

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  setParams(p) {
    if (!p) return;
    if (p.targetId != null) this.state.targetId = p.targetId;
    if (p.neutronMeV != null) this.state.neutronMeV = p.neutronMeV;
    if (p.speed != null) this.state.speed = p.speed;
    if (p.reset) this.phase = 0;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) {
    this._active = !!v;
    if (this._hud) this._hud.style.display = v ? '' : 'none';
  }
  applyTips() {}
  getPickables() { return [this.drop]; }

  tick(dt) {
    if (!this._active || this.paused) return;
    const tgt = getTarget(this.state.targetId);
    const ok = canFission(tgt, this.state.neutronMeV);
    this.phase += dt * 0.14 * this.state.speed * (ok ? 1 : 0.35);
    if (this.phase > 1) this.phase -= 1;
    const st = stageFromPhase(this.phase);
    if (this._hud) {
      this._hud.textContent = tgt.a + '  ·  ' + st + (ok ? '  ·  path OPEN' : '  ·  barrier HOLDS');
    }
  }

  _layout() {
    const ax = dropAxes(this.phase);
    const st = stageFromPhase(this.phase);
    const showDrop = st !== 'fragments';
    this.drop.visible = showDrop;
    this.fA.visible = this.fB.visible = !showDrop;
    for (let i = 0; i < this._nucleons.length; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / this._nucleons.length));
      const th = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(phi) * Math.cos(th) * ax.a * 0.95;
      const y = Math.cos(phi) * ax.b * 0.95;
      const z = Math.sin(phi) * Math.sin(th) * ax.b * 0.95;
      this._nucleons[i].position.set(x, y, z);
    }
    if (st === 'approach' || st === 'capture') {
      const t = this.phase / 0.32;
      this.neutron.visible = true;
      this.neutron.position.set(-3.2 + t * 3.0, 1.15, 0);
    } else {
      this.neutron.visible = false;
    }
    if (!showDrop) {
      const t = (this.phase - 0.88) / 0.12;
      this.fA.position.set(-0.7 - t * 1.6, 1.15, 0);
      this.fB.position.set(0.7 + t * 1.6, 1.15, 0.1);
      for (let i = 0; i < this.freeN.length; i++) {
        this.freeN[i].visible = true;
        this.freeN[i].position.set((i - 1) * 0.45, 1.9 + t * 1.4, 0.2 * i);
      }
    } else {
      for (let i = 0; i < this.freeN.length; i++) this.freeN[i].visible = false;
    }
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    this._layout();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._alive = false;
    if (this._hud && this._hud.parentNode) this._hud.parentNode.removeChild(this._hud);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
