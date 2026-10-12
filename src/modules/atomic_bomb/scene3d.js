import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene, setupRenderer, addStudioLights, addFloorGrid, placeLabel, metalMaterial, plasticMaterial, glowSphere,
} from '../common/sceneVisuals.js';
import { kEff, statusPlain } from './physics.js';

export class AtomicBombScene3D {
  constructor(container) {
    this.container = container;
    this.state = { typeId: 'gun', speed: 0.7, compress: 0.55, boost: 0.4 };
    this.paused = false;
    this._active = false;
    this.u = 0;
    this.running = true;
    this._hold = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camera.position.set(5.4, 3.2, 6.8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.7, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -1.6);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this._nGroup = new THREE.Group();
    this.scene.add(this._nGroup);
    this._freeN = [];
    for (let i = 0; i < 24; i++) {
      const n = glowSphere(0.07, 0x38bdf8, { pick: false });
      n.visible = false;
      this._nGroup.add(n);
      this._freeN.push({ mesh: n, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    this._hud = document.createElement('div');
    this._hud.className = 'ab-hud';
    this._hud.textContent = '3D: blue neutrons leak until the pieces join';
    this.container.appendChild(this._hud);
    this._build('gun');

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _clear() {
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }

  _build(id) {
    this._clear();
    this._type = id;
    if (id === 'gun') this._buildGun();
    else this._buildImplosion(id === 'boosted');
  }

  _buildGun() {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 5.2, 40),
      metalMaterial(0x64748b, { metalness: 0.55, roughness: 0.38 }),
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.material.transparent = true;
    barrel.material.opacity = 0.35;
    this.root.add(barrel);
    this.bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 24),
      metalMaterial(0xfbbf24, { metalness: 0.5, roughness: 0.32 }),
    );
    this.root.add(this.bullet);
    this.target = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 32, 24),
      metalMaterial(0xf59e0b, { metalness: 0.5, roughness: 0.32 }),
    );
    this.target.position.x = 1.55;
    this.root.add(this.target);
    this.root.add(placeLabel('piece A  (too small)', -1.8, 1.35, 0, '#fde68a', 0.85));
    this.root.add(placeLabel('piece B  (too small)', 1.55, 1.45, 0, '#fdba74', 0.85));
    tip(this.bullet, 'Piece A', 'A subcritical piece. Alone, neutrons leak and the chain dies.');
    tip(this.target, 'Piece B', 'Second subcritical piece. Joined with A, k can go above 1.');
    this.pit = null;
    this.core = null;
    this.lenses = null;
    this.shell = null;
  }

  _buildImplosion(boosted) {
    this.lenses = new THREE.Group();
    const mat = plasticMaterial(0xfb923c, { roughness: 0.5 });
    for (let i = 0; i < 24; i++) {
      const w = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 10), mat);
      const phi = Math.acos(1 - 2 * ((i + 0.5) / 24));
      const th = Math.PI * (1 + Math.sqrt(5)) * i;
      w.position.setFromSphericalCoords(1.7, phi, th);
      w.lookAt(0, 0, 0);
      w.rotateX(Math.PI);
      this.lenses.add(w);
    }
    this.root.add(this.lenses);
    this.shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.85, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c, transparent: true, opacity: 0.12, roughness: 0.4, metalness: 0.1,
      }),
    );
    this.root.add(this.shell);
    this.pit = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 48, 32),
      metalMaterial(0xd97706, { metalness: 0.55, roughness: 0.3 }),
    );
    this.root.add(this.pit);
    this.root.add(placeLabel('pit', 0, 1.55, 0, '#fdba74', 0.9));
    this.root.add(placeLabel('squeeze in', 0, -1.55, 0, '#fb923c', 0.8));
    tip(this.pit, 'Pit', 'Schematic core. Squeezing raises density so neutrons hit more often.');
    if (boosted) {
      this.core = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 24, 16),
        metalMaterial(0x22d3ee, { metalness: 0.15, roughness: 0.28, emissive: 0x0891b2, emissiveIntensity: 0.9 }),
      );
      this.root.add(this.core);
      this.root.add(placeLabel('D–T extra n', 0, 2.05, 0, '#67e8f9', 0.85));
      tip(this.core, 'D–T boost', 'Fusion neutrons (schematic) help the pit fission more completely.');
    } else {
      this.core = null;
    }
    this.bullet = this.target = null;
  }

  setParams(p) {
    if (!p) return;
    if (p.typeId != null && p.typeId !== this.state.typeId) {
      this.state.typeId = p.typeId;
      this._build(p.typeId);
      this.u = 0;
      this.running = true;
    }
    if (p.speed != null) this.state.speed = p.speed;
    if (p.compress != null) this.state.compress = p.compress;
    if (p.boost != null) this.state.boost = p.boost;
    if (p.reset) { this.u = 0; this.running = true; this._hold = 0; }
    if (p.fire) { this.u = 0; this.running = true; this._hold = 0; }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) {
    this._active = !!v;
    if (this._hud) this._hud.style.display = v ? '' : 'none';
    if (v) this.resize();
  }
  applyTips() {}
  getPickables() {
    const a = [];
    if (this.bullet) a.push(this.bullet);
    if (this.target) a.push(this.target);
    if (this.pit) a.push(this.pit);
    if (this.core) a.push(this.core);
    return a;
  }

  _kickNeutron(origin, speed) {
    for (let i = 0; i < this._freeN.length; i++) {
      const n = this._freeN[i];
      if (n.mesh.visible && n.life > 0) continue;
      const ang = Math.random() * Math.PI * 2;
      const elv = (Math.random() - 0.5) * 1.2;
      n.mesh.visible = true;
      n.mesh.position.copy(origin);
      n.vx = Math.cos(ang) * speed;
      n.vy = elv * speed * 0.4;
      n.vz = Math.sin(ang) * speed;
      n.life = 1.1;
      return;
    }
  }

  tick(dt) {
    if (!this._active || this.paused) return;
    if (this.running) {
      this.u += dt * (0.2 + 0.75 * this.state.speed);
      if (this.u > 1) { this.u = 1; this.running = false; this._hold = 0; }
    } else {
      this._hold += dt;
      if (this._hold > 1.3) { this.u = 0; this.running = true; this._hold = 0; }
    }
    const k = kEff(this.state.typeId, this.u, this.state.compress, this.state.boost);
    if (this._hud) this._hud.textContent = statusPlain(k) + '   ·   k = ' + k.toFixed(2);

    const origin = new THREE.Vector3();
    if (this.bullet) origin.copy(this.bullet.position);
    else if (this.pit) origin.copy(this.pit.position);
    const rate = 0.04 + Math.max(0, k - 0.7) * 0.25;
    if (Math.random() < rate) this._kickNeutron(origin, 1.6 + k);

    for (let i = 0; i < this._freeN.length; i++) {
      const n = this._freeN[i];
      if (!n.mesh.visible) continue;
      n.life -= dt;
      n.mesh.position.x += n.vx * dt;
      n.mesh.position.y += n.vy * dt;
      n.mesh.position.z += n.vz * dt;
      if (n.life <= 0) n.mesh.visible = false;
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
    const k = kEff(this.state.typeId, this.u, this.state.compress, this.state.boost);
    if (this.bullet) this.bullet.position.x = -1.85 + this.u * 2.85;
    if (this.pit) {
      const s = 1 - 0.24 * this.u * this.state.compress;
      this.pit.scale.setScalar(s);
      if (this.lenses) this.lenses.scale.setScalar(0.9 + 0.1 * (1 - this.u));
      if (this.shell) this.shell.scale.setScalar(0.88 + 0.12 * (1 - this.u));
      this.pit.material.emissive = new THREE.Color(0xf59e0b);
      this.pit.material.emissiveIntensity = Math.max(0, (k - 1) * 1.6);
    }
    if (this.core) {
      const pulse = this.u > 0.68 ? 1 + 0.25 * Math.sin(this.u * 20) : 1;
      this.core.scale.setScalar(pulse);
    }
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
