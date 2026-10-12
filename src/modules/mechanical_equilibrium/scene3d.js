import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene, setupRenderer, addStudioLights, addFloorGrid, placeLabel, metalMaterial, plasticMaterial,
} from '../common/sceneVisuals.js';
import { heightStable, heightUnstable } from './physics.js';

export class MechanicalEquilibriumScene3D {
  constructor(container) {
    this.container = container;
    this.state = { k: 8, damp: 0.35, kick: 0.9 };
    this.paused = false;
    this._active = false;
    this.st = { x: 0.45, z: 0.1, vx: 0, vz: 0 };
    this.un = { x: 0.04, z: 0.02, vx: 0, vz: 0 };

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(0, 5.2, 9.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.8, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -1.6);

    this._build();
    this.st.vx -= this.state.kick * 0.6;
    this.un.vx += this.state.kick * 0.3;
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _bowlGeo(sign) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const r = (i / 28) * 1.55;
      const y = sign > 0 ? heightStable(r) : heightUnstable(r);
      pts.push(new THREE.Vector2(Math.max(r, 0.02), y));
    }
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.computeVertexNormals();
    return geo;
  }

  _build() {
    this.bowl = new THREE.Mesh(
      this._bowlGeo(1),
      metalMaterial(0x14532d, { metalness: 0.35, roughness: 0.45 }),
    );
    this.bowl.position.set(-2.3, 0, 0);
    this.scene.add(this.bowl);
    tip(this.bowl, 'Stable well', 'Any small slide comes back. V″ > 0 at the bottom.');

    this.hill = new THREE.Mesh(
      this._bowlGeo(-1),
      metalMaterial(0x7f1d1d, { metalness: 0.35, roughness: 0.45 }),
    );
    this.hill.position.set(2.3, 0, 0);
    this.scene.add(this.hill);
    tip(this.hill, 'Unstable hill', 'Balanced only at the peak. V″ < 0 — a nudge runs away.');

    const marble = (color) => new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 32, 24),
      plasticMaterial(color, { roughness: 0.25 }),
    );
    this.mS = marble(0xe2e8f0);
    this.mU = marble(0xfde68a);
    this.scene.add(this.mS, this.mU);
    this.scene.add(placeLabel('stable', -2.3, 2.35, 0, '#86efac', 0.9));
    this.scene.add(placeLabel('unstable', 2.3, 2.55, 0, '#fca5a5', 0.9));

    this.arrS = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.6, 0x67e8f9, 0.18, 0.12);
    this.arrU = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.6, 0x67e8f9, 0.18, 0.12);
    this.scene.add(this.arrS, this.arrU);
    this._auto = 0;
    this._hud = document.createElement('div');
    this._hud.className = 'eq-hud';
    this._hud.textContent = '3D: green bowl comes back, red hill falls away';
    this.container.appendChild(this._hud);
  }

  _place(ball, mesh, ox, kind) {
    const r = Math.hypot(ball.x, ball.z);
    const y = kind === 'stable' ? heightStable(r) : heightUnstable(r);
    mesh.position.set(ox + ball.x, y + 0.16, ball.z);
  }

  _arrow(helper, mesh, ball, kind) {
    const dir = new THREE.Vector3(kind === 'stable' ? -ball.x : ball.x, 0, kind === 'stable' ? -ball.z : ball.z);
    if (dir.lengthSq() < 1e-6) dir.set(0.05, 0, 0);
    dir.normalize();
    helper.position.copy(mesh.position);
    helper.position.y += 0.28;
    helper.setDirection(dir);
    const len = 0.35 + Math.min(0.9, Math.hypot(ball.vx, ball.vz) * 0.4);
    helper.setLength(len, 0.16, 0.1);
  }

  _step(ball, kind, dt) {
    const k = this.state.k * 0.55;
    const g = kind === 'stable' ? 1 : -1;
    const ax = -g * k * ball.x - this.state.damp * ball.vx;
    const az = -g * k * ball.z - this.state.damp * ball.vz;
    ball.vx += ax * dt;
    ball.vz += az * dt;
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;
    const r = Math.hypot(ball.x, ball.z);
    if (kind === 'stable' && r > 1.45) {
      const s = 1.45 / r;
      ball.x *= s; ball.z *= s;
      ball.vx *= 0.3; ball.vz *= 0.3;
    }
    if (kind === 'unstable' && r > 1.7) {
      ball.x = 0.03; ball.z = 0.02; ball.vx = 0; ball.vz = 0;
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.k != null) this.state.k = p.k;
    if (p.damp != null) this.state.damp = p.damp;
    if (p.kick != null) this.state.kick = p.kick;
    if (p.nudge) {
      this.st.vx -= this.state.kick * 0.8;
      this.un.vx += this.state.kick * 0.35;
      this.un.vz += this.state.kick * 0.12;
    }
    if (p.reset) {
      this.st = { x: 0.45, z: 0.1, vx: 0, vz: 0 };
      this.un = { x: 0.04, z: 0.02, vx: 0, vz: 0 };
      this._auto = 0;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) {
    this._active = !!v;
    if (this._hud) this._hud.style.display = v ? '' : 'none';
    if (v) this.resize();
  }
  applyTips() {}
  getPickables() { return [this.bowl, this.hill, this.mS, this.mU]; }

  tick(dt) {
    if (!this._active || this.paused) return;
    this._auto += dt;
    if (this._auto > 3.4) {
      this._auto = 0;
      this.un = { x: 0.04, z: 0.02, vx: 0, vz: 0 };
      this.st.vx -= this.state.kick * 0.8;
      this.un.vx += this.state.kick * 0.4;
    }
    this._step(this.st, 'stable', dt);
    this._step(this.un, 'unstable', dt);
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
    if (this.mS) this._place(this.st, this.mS, -2.3, 'stable');
    if (this.mU) this._place(this.un, this.mU, 2.3, 'unstable');
    if (this.arrS && this.mS) this._arrow(this.arrS, this.mS, this.st, 'stable');
    if (this.arrU && this.mU) this._arrow(this.arrU, this.mU, this.un, 'unstable');
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
