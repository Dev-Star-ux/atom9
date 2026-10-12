// 3D radioactive decay — sample vial with nuclei; decay emits α and leaves daughter.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, attachGlow, placeLabel } from '../common/sceneVisuals.js';
import { halfLivesElapsed, binomialDecayed } from './physics.js';

const VISUAL_MAX = 280;

export class DecayScene {
  constructor(container) {
    this.container = container;
    this.n0 = 10000;
    this.halfLife = 12;
    this.halfLifeReal = '5,730 y';
    this.paused = false;
    this._active = false;
    this._t = 0;
    this._alive = this.n0;
    this._particles = [];

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x0a1020);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 6, 12);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.8, 0);
    addStudioLights(this.scene);

    this.cloud = new THREE.Group();
    this.scene.add(this.cloud);
    this.fx = new THREE.Group();
    this.scene.add(this.fx);

    this._atoms = [];
    this._buildVial();
    this._rebuildCloud();
    tip(this.cloud, 'Radioactive nuclei', 'Each green sphere is an unstable nucleus. Decay is random for each one; the average wait is the half-life.');

    this._status = placeLabel('decay sample', 0, 4.8, 0, '#4ade80', 1.05);
    this.scene.add(this._status);

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildVial() {
    // Glass sample container
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 4.2, 32, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x64748b, transparent: true, opacity: 0.22, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.35,
      })
    );
    wall.position.y = 2.1;
    this.scene.add(wall);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.6, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.45 })
    );
    base.position.y = 0.05;
    this.scene.add(base);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.08, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.35 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 4.2;
    this.scene.add(rim);

    this.scene.add(placeLabel('sample vial', 0, 0.55, 4.2, '#94a3b8', 0.85));
  }

  _rebuildCloud() {
    while (this.cloud.children.length) this.cloud.remove(this.cloud.children[0]);
    this._atoms = [];
    this._alive = this.n0;
    const visual = Math.min(VISUAL_MAX, Math.max(1, this.n0));
    for (let i = 0; i < visual; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x4ade80,
          emissive: 0x166534,
          emissiveIntensity: 0.4,
        })
      );
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * 2.6;
      m.position.set(Math.cos(ang) * rad, 0.5 + Math.random() * 3.4, Math.sin(ang) * rad);
      m.userData.alive = true;
      this.cloud.add(m);
      this._atoms.push(m);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.halfLife != null) this.halfLife = p.halfLife;
    if (p.halfLifeReal != null) this.halfLifeReal = p.halfLifeReal;
    if (p.n0 != null && p.n0 !== this.n0) {
      this.n0 = p.n0;
      this._t = 0;
      this._rebuildCloud();
    }
    if (p.reset) {
      this._t = 0;
      this._rebuildCloud();
    }
    this._refreshLabel();
  }

  _aliveCount() {
    return this._alive;
  }

  aliveCount() {
    return this._alive;
  }

  _syncVisuals() {
    const vCount = this._atoms.length;
    if (!vCount) return;
    const wantAlive = Math.round((this._alive / Math.max(1, this.n0)) * vCount);
    let visualAlive = 0;
    for (let i = 0; i < vCount; i++) if (this._atoms[i].userData.alive) visualAlive++;

    while (visualAlive > wantAlive) {
      const idx = Math.floor(Math.random() * vCount);
      const a = this._atoms[idx];
      if (!a.userData.alive) continue;
      a.userData.alive = false;
      a.material.color.setHex(0x64748b);
      a.material.emissive.setHex(0x000000);
      a.material.emissiveIntensity = 0;
      a.scale.setScalar(0.7);
      visualAlive--;

      if (this._particles.length < 20) {
        const ray = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        ray.position.copy(a.position);
        this.fx.add(ray);
        attachGlow(ray, 0xfbbf24, 0.9);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
        this._particles.push({ mesh: ray, dir: dir, life: 0 });
      }
    }
  }

  _refreshLabel() {
    const n = this._alive;
    const frac = n / Math.max(1, this.n0);
    this.scene.remove(this._status);
    this._status = placeLabel(
      'N=' + n + '/' + this.n0 + ' (' + Math.round(frac * 100) + '%)  ·  t=' + this._t.toFixed(1) +
      's  ·  ' + halfLivesElapsed(this._t, this.halfLife).toFixed(2) + ' × T½' +
      (this.halfLifeReal ? '  ·  T½=' + this.halfLifeReal : ''),
      0, 5.0, 0, '#4ade80', 1.05
    );
    this.scene.add(this._status);
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) {
    if (tips && tips.cloud) tip(this.cloud, tips.cloud.title, tips.cloud.desc);
  }
  getPickables() { return [this.cloud]; }

  tick(dt) {
    if (this.paused || !this._active) return;
    this._t += dt;
    const lam = Math.LN2 / Math.max(0.1, this.halfLife);
    const p = 1 - Math.exp(-lam * dt);
    const died = binomialDecayed(this._alive, p);
    this._alive = Math.max(0, this._alive - died);
    this._syncVisuals();

    const keep = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p2 = this._particles[i];
      p2.life += dt;
      p2.mesh.position.addScaledVector(p2.dir, dt * 4.5);
      if (p2.life < 1.3) keep.push(p2);
      else this.fx.remove(p2.mesh);
    }
    this._particles = keep;
    this._refreshLabel();
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
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.renderer) {
      this.renderer.dispose();
      const el = this.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }
}
