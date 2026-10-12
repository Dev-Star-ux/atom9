// 3D fusion — D and T approach inside a tokamak ring; fuse → He + n or bounce with repulsion.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, attachGlow, placeLabel } from '../common/sceneVisuals.js';
import { fusionProbability, statusFusion, Q_VALUE_MEV } from './physics.js';

export class FusionScene {
  constructor(container) {
    this.container = container;
    this.tempMK = 80;
    this.confinement = 60;
    this.paused = false;
    this._active = false;
    this._t = 0;
    this._flash = 0;
    this._fusions = 0;
    this._bounces = 0;
    this._didFuse = false;
    this._gate = false;
    this._products = [];

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x0a1020);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 6, 13);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.4, 0);
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
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Tokamak vacuum vessel (simplified)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.22, 14, 72),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.55, roughness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.4;
    this.scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.08, 10, 72),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 1.4;
    this.scene.add(ring2);

    this.deuteron = this._makeNucleus(0.48, 0x38bdf8, 0x0369a1);
    this.triton = this._makeNucleus(0.55, 0xa78bfa, 0x5b21b6);
    this.scene.add(this.deuteron);
    this.scene.add(this.triton);
    tip(this.deuteron, 'Deuterium (D)', 'Heavy hydrogen: 1 proton + 1 neutron. Positive charge → repels tritium.');
    tip(this.triton, 'Tritium (T)', 'Heavier hydrogen: 1 proton + 2 neutrons. D+T is the easiest fusion fuel on Earth.');

    this.helium = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.5, transparent: true, opacity: 0,
      })
    );
    this.scene.add(this.helium);
    this._heGlow = attachGlow(this.helium, 0xfbbf24, 1.8);
    this._heGlow.visible = false;

    // Repulsion arrows (lines)
    this._repulse = new THREE.Group();
    this.scene.add(this._repulse);

    this.scene.add(placeLabel('D (deuterium)', -4.2, 2.8, 0, '#38bdf8', 0.9));
    this.scene.add(placeLabel('T (tritium)', 4.2, 2.8, 0, '#a78bfa', 0.9));
    this._status = placeLabel('heating…', 0, 4.0, 0, '#94a3b8', 1.05);
    this.scene.add(this._status);
    this._refreshStatus();
  }

  _makeNucleus(r, color, emissive) {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(r, 22, 22),
      new THREE.MeshStandardMaterial({
        color: color, emissive: emissive, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.4,
      })
    );
    g.add(shell);
    attachGlow(shell, color, 1.2);
    // Tiny nucleons inside for realism
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.28, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xf87171 })
    );
    p.position.set(-r * 0.25, 0, 0);
    g.add(p);
    const n = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.28, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    n.position.set(r * 0.25, 0, 0);
    g.add(n);
    g.userData.shell = shell;
    return g;
  }

  _refreshStatus() {
    const pF = fusionProbability(this.tempMK, this.confinement);
    this.scene.remove(this._status);
    this._status = placeLabel(
      statusFusion(pF).toUpperCase() + ' · P≈' + Math.round(pF * 100) + '% · Q=' + Q_VALUE_MEV + ' MeV · fused ' + this._fusions,
      0, 4.0, 0,
      pF > 0.45 ? '#4ade80' : '#fbbf24',
      1.05
    );
    this.scene.add(this._status);
  }

  setParams(p) {
    if (!p) return;
    if (p.tempMK != null) this.tempMK = p.tempMK;
    if (p.confinement != null) this.confinement = p.confinement;
    this._refreshStatus();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) {
    if (tips && tips.deuteron) tip(this.deuteron, tips.deuteron.title, tips.deuteron.desc);
    if (tips && tips.triton) tip(this.triton, tips.triton.title, tips.triton.desc);
  }
  getPickables() { return [this.deuteron, this.triton, this.helium]; }

  tick(dt) {
    if (this.paused || !this._active) return;
    this._t += dt;
    this._flash = Math.max(0, this._flash - dt);
    const cycle = (this._t % 2.8) / 2.8;
    const p = fusionProbability(this.tempMK, this.confinement);

    // Product motion
    for (let i = this._products.length - 1; i >= 0; i--) {
      const pr = this._products[i];
      pr.life += dt;
      pr.mesh.position.addScaledVector(pr.dir, dt * 3.2);
      if (pr.life > 1.1) {
        this.fx.remove(pr.mesh);
        this._products.splice(i, 1);
      }
    }

    if (this._flash > 0) {
      this.deuteron.visible = false;
      this.triton.visible = false;
      this.helium.material.opacity = Math.min(1, this._flash * 2);
      this.helium.position.set(0, 1.4, 0);
      this._heGlow.visible = true;
    } else {
      this.deuteron.visible = true;
      this.triton.visible = true;
      this.helium.material.opacity = 0;
      this._heGlow.visible = false;

      let gap;
      if (cycle <= 0.5) {
        gap = 6.2 * (1 - cycle / 0.5);
      } else if (this._didFuse) {
        gap = 0;
      } else {
        gap = ((cycle - 0.5) / 0.5) * 6.2;
      }
      this.deuteron.position.set(-gap / 2, 1.4, 0);
      this.triton.position.set(gap / 2, 1.4, 0);

      // Show repulsion when close
      while (this._repulse.children.length) this._repulse.remove(this._repulse.children[0]);
      if (gap < 2.2 && gap > 0.15 && !this._didFuse) {
        const mid = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.7 })
        );
        mid.position.set(0, 1.4, 0);
        this._repulse.add(mid);
      }

      if (cycle > 0.48 && cycle < 0.52 && !this._gate) {
        this._gate = true;
        this._didFuse = Math.random() < p;
        if (this._didFuse) {
          this._flash = 0.65;
          this._fusions++;
          // He stays; emit neutron
          const nMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          nMesh.position.set(0, 1.4, 0);
          this.fx.add(nMesh);
          attachGlow(nMesh, 0x38bdf8, 1);
          this._products.push({
            mesh: nMesh,
            dir: new THREE.Vector3(-1, 0.3, 0.2).normalize(),
            life: 0,
          });
          this._refreshStatus();
        } else {
          this._bounces++;
        }
      }
      if (cycle < 0.08) {
        this._gate = false;
        this._didFuse = false;
      }
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
