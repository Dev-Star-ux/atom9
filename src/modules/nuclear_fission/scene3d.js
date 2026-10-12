// 3D fission — nuclei on a grid; chain reaction with fragments (no reactor rods).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, attachGlow, placeLabel } from '../common/sceneVisuals.js';
import {
  fissionMultiplication, criticalityLabel, neutronsFromFission,
} from './physics.js';

export class FissionScene {
  constructor(container) {
    this.container = container;
    this.enrichment = 40;
    this.paused = false;
    this._active = false;
    this.neutrons = [];
    this._burst = [];
    this._fragments = [];
    this.fissions = 0;
    this._seedT = 0;

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x0a1020);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(8, 9, 12);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);

    this.fx = new THREE.Group();
    this.scene.add(this.fx);
    this._build();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _build() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.Group();
    const cols = 7;
    const rows = 5;
    const spacing = 1.35;
    const x0 = -((cols - 1) * spacing) / 2;
    const z0 = -((rows - 1) * spacing) / 2;
    const yGrid = 0.02;
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155 });
    for (let r = 0; r < rows; r++) {
      const pts = [
        new THREE.Vector3(x0 - 0.4, yGrid, z0 + r * spacing),
        new THREE.Vector3(x0 + (cols - 1) * spacing + 0.4, yGrid, z0 + r * spacing),
      ];
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    for (let c = 0; c < cols; c++) {
      const pts = [
        new THREE.Vector3(x0 + c * spacing, yGrid, z0 - 0.4),
        new THREE.Vector3(x0 + c * spacing, yGrid, z0 + (rows - 1) * spacing + 0.4),
      ];
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    this.scene.add(grid);

    this.fuel = new THREE.Group();
    this.scene.add(this.fuel);
    this._nuclei = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u235 = Math.random() * 100 < this.enrichment;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 18, 18),
          new THREE.MeshStandardMaterial({
            color: u235 ? 0xf59e0b : 0x64748b,
            metalness: 0.25,
            roughness: 0.4,
            emissive: u235 ? 0xb45309 : 0x000000,
            emissiveIntensity: u235 ? 0.35 : 0,
          })
        );
        m.position.set(x0 + c * spacing, 1.15, z0 + r * spacing);
        m.userData.u235 = u235;
        m.userData.alive = true;
        this.fuel.add(m);
        this._nuclei.push(m);
      }
    }
    tip(this.fuel, 'Uranium nuclei', 'Orange = U-235 (can fission). Grey = U-238. A neutron hitting U-235 can split it into two fragments + more neutrons + ~200 MeV.');

    this.scene.add(placeLabel('U-235 / U-238 grid', 0, 3.2, -4.0, '#fbbf24', 1.0));
    this._status = placeLabel('chain reaction', 0, 4.6, 0, '#4ade80', 1.15);
    this.scene.add(this._status);

    this.injectNeutron();
    this._refreshStatus();
  }

  injectNeutron() {
    this._emitNeutron(-7.5, 1.15, (Math.random() - 0.5) * 2.5, 3.8, 0, 0);
  }

  _emitNeutron(x, y, z, vx, vy, vz) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    m.position.set(x, y, z);
    this.fx.add(m);
    attachGlow(m, 0x38bdf8, 1.0);
    this.neutrons.push({ mesh: m, vx: vx, vy: vy, vz: vz, life: 0 });
  }

  _refreshStatus() {
    const k = fissionMultiplication(this.enrichment);
    this.scene.remove(this._status);
    this._status = placeLabel(
      'k ≈ ' + k.toFixed(2) + ' · ' + criticalityLabel(k).toUpperCase() + ' · fissions ' + this.fissions,
      0, 4.6, 0,
      k >= 1 ? '#4ade80' : '#fbbf24',
      1.15
    );
    this.scene.add(this._status);
  }

  setParams(p) {
    if (!p) return;
    const prevE = this.enrichment;
    if (p.enrichment != null) this.enrichment = p.enrichment;
    if (p.reset || (p.enrichment != null && Math.abs(p.enrichment - prevE) > 8)) {
      this._respawnAll();
    }
    this._refreshStatus();
  }

  _respawnAll() {
    for (let j = 0; j < this._nuclei.length; j++) {
      const m = this._nuclei[j];
      m.userData.alive = true;
      m.visible = true;
      m.userData.u235 = Math.random() * 100 < this.enrichment;
      m.material.color.setHex(m.userData.u235 ? 0xf59e0b : 0x64748b);
      m.material.emissive.setHex(m.userData.u235 ? 0xb45309 : 0x000000);
      m.material.emissiveIntensity = m.userData.u235 ? 0.35 : 0;
    }
    this.fissions = 0;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) {
    if (tips && tips.fuel) tip(this.fuel, tips.fuel.title, tips.fuel.desc);
  }
  getPickables() { return [this.fuel]; }

  tick(dt) {
    if (this.paused || !this._active) return;
    const k = fissionMultiplication(this.enrichment);
    this._seedT += dt;
    if (this.neutrons.length === 0 && this._seedT > 2) {
      this._seedT = 0;
      this.injectNeutron();
    }

    const keep = [];
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      n.mesh.position.x += n.vx * dt;
      n.mesh.position.y += n.vy * dt;
      n.mesh.position.z += n.vz * dt;
      n.life += dt;

      let fissioned = false;
      for (let j = 0; j < this._nuclei.length; j++) {
        const u = this._nuclei[j];
        if (!u.userData.alive) continue;
        if (n.mesh.position.distanceTo(u.position) > 0.5) continue;

        if (!u.userData.u235) {
          fissioned = true;
          break;
        }

        fissioned = true;
        u.userData.alive = false;
        u.visible = false;
        this.fissions++;

        const count = neutronsFromFission(k);
        for (let s = 0; s < count; s++) {
          const ang = Math.random() * Math.PI * 2;
          const elev = (Math.random() - 0.5) * 2;
          this._emitNeutron(
            u.position.x, u.position.y, u.position.z,
            Math.cos(ang) * 2.8, elev, Math.sin(ang) * 2.8
          );
        }

        const ang0 = Math.random() * Math.PI * 2;
        for (let fi = 0; fi < 2; fi++) {
          const frag = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0x9a3412, emissiveIntensity: 0.4 })
          );
          frag.position.copy(u.position);
          this.fx.add(frag);
          const a = ang0 + fi * Math.PI;
          this._fragments.push({
            mesh: frag,
            vx: Math.cos(a) * 1.6,
            vy: 0.4,
            vz: Math.sin(a) * 1.6,
            life: 0,
          });
        }

        const flash = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
        );
        flash.position.copy(u.position);
        this.fx.add(flash);
        this._burst.push({ mesh: flash, t: 0 });
        break;
      }

      if (fissioned) this.fx.remove(n.mesh);
      else if (n.life < 5.5 && n.mesh.position.length() < 14) keep.push(n);
      else this.fx.remove(n.mesh);
    }
    this.neutrons = keep.slice(0, 70);

    const bkeep = [];
    for (let i = 0; i < this._burst.length; i++) {
      const b = this._burst[i];
      b.t += dt;
      b.mesh.material.opacity = Math.max(0, 0.85 - b.t * 1.8);
      b.mesh.scale.setScalar(1 + b.t * 2.4);
      if (b.t < 0.5) bkeep.push(b);
      else this.fx.remove(b.mesh);
    }
    this._burst = bkeep;

    const fkeep = [];
    for (let i = 0; i < this._fragments.length; i++) {
      const f = this._fragments[i];
      f.life += dt;
      f.mesh.position.x += f.vx * dt;
      f.mesh.position.y += f.vy * dt;
      f.mesh.position.z += f.vz * dt;
      f.mesh.material.opacity = Math.max(0, 1 - f.life);
      if (f.life < 0.9) fkeep.push(f);
      else this.fx.remove(f.mesh);
    }
    this._fragments = fkeep;

    let dead = 0;
    for (let j = 0; j < this._nuclei.length; j++) if (!this._nuclei[j].userData.alive) dead++;
    if (dead > this._nuclei.length * 0.55) this._respawnAll();

    if (Math.floor(this._seedT * 5) % 3 === 0) this._refreshStatus();
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
