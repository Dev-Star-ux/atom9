import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sigma2d, numberDensity, meanFreePath, transmissionFraction } from "./physics.js";
import { stat } from "../common/sceneChrome.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, dashedGuide } from "../common/sceneVisuals.js";
const SLAB = { x0: -7, x1: 7, y: 4, z: 0 };
const BEAM_X = -11;
export class CrossSectionScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.set(0, 12, 22);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 30, -5);
    this.density = 45;
    this.radius = 10;
    this.paused = false;
    this._tipTexts = {};
    this.particles = [];
    this.targets = [];
    this.hits = [];
    this.stats = { sumPath: 0, nCollided: 0, nTransmitted: 0, nTotal: 0 };
    this._emitAcc = 0;
    this.slab = new THREE.Mesh(
      new THREE.BoxGeometry(SLAB.x1 - SLAB.x0, SLAB.y * 2, 6),
      new THREE.MeshStandardMaterial({ color: 1976635, transparent: true, opacity: 0.18, depthWrite: false, emissive: 1920728, emissiveIntensity: 0.08 })
    );
    this.slab.position.set(0, 0, 0);
    this.scene.add(this.slab);
    this.targetGroup = new THREE.Group();
    this.scene.add(this.targetGroup);
    this.beamGroup = new THREE.Group();
    this.scene.add(this.beamGroup);
    this.hitGroup = new THREE.Group();
    this.scene.add(this.hitGroup);
    this.sourceMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1, 8),
      new THREE.MeshBasicMaterial({ color: 16638023 })
    );
    this.sourceMarker.rotation.z = -Math.PI / 2;
    this.sourceMarker.position.set(BEAM_X, 0, 0);
    attachGlow(this.sourceMarker, 16638023, 1.2);
    this.scene.add(this.sourceMarker);
    this.scene.add(dashedGuide([new THREE.Vector3(BEAM_X, 0, 0), new THREE.Vector3(SLAB.x1 + 2, 0, 0)], 16638023, 0.4));
    this._rebuildTargets();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  setDensity(v) {
    this.density = v;
    this._rebuildTargets();
    this._resetStats();
    this._bindTips();
  }
  setRadius(v) {
    this.radius = v;
    this._rebuildTargets();
    this._resetStats();
    this._bindTips();
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }
  _sigma() {
    return sigma2d(this.radius * 0.08);
  }
  _n() {
    return numberDensity(this.density, SLAB.x1 - SLAB.x0, SLAB.y * 2);
  }
  _lambda() {
    return meanFreePath(this._n(), this._sigma());
  }
  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.slab) return;
    const lam = this._lambda();
    const lamStr = isFinite(lam) ? `${(lam * 8).toFixed(0)} (units)` : "\u221E";
    this.slab.userData.sceneTip = () => ({
      title: tips.slab.title,
      desc: tips.slab.desc,
      stats: [
        stat(tips, "sigma", `${this._sigma().toFixed(2)} (units)`),
        stat(tips, "meanFreePath", lamStr),
        stat(tips, "transmission", `${this.getTransmission().toFixed(0)}%`)
      ]
    });
    this.sourceMarker.userData.sceneTip = () => ({
      title: tips.beam.title,
      desc: tips.beam.desc,
      stats: [stat(tips, "transmission", `${this.getTransmission().toFixed(0)}%`)]
    });
    this.targetGroup.userData.sceneTip = this.slab.userData.sceneTip;
  }
  getTransmission() {
    if (!this.stats.nTotal) return transmissionFraction(this._n(), this._sigma(), SLAB.x1 - SLAB.x0) * 100;
    return 100 * this.stats.nTransmitted / this.stats.nTotal;
  }
  getMeasuredLambda() {
    return this.stats.nCollided ? this.stats.sumPath / this.stats.nCollided * 8 : null;
  }
  getPickables() {
    return [this.slab, this.sourceMarker, this.targetGroup, ...this.beamGroup.children];
  }
  _resetStats() {
    this.stats = { sumPath: 0, nCollided: 0, nTransmitted: 0, nTotal: 0 };
    for (const p of this.particles) {
      this.beamGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.particles = [];
  }
  _rebuildTargets() {
    while (this.targetGroup.children.length) {
      const c = this.targetGroup.children[0];
      this.targetGroup.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
    this.targets = [];
    const r = this.radius * 0.08;
    const mat = new THREE.MeshStandardMaterial({ color: 3900150, emissive: 1920728, emissiveIntensity: 0.38, metalness: 0.35 });
    for (let i = 0; i < this.density; i++) {
      const x = SLAB.x0 + 1 + Math.random() * (SLAB.x1 - SLAB.x0 - 2);
      const y = (Math.random() - 0.5) * SLAB.y * 1.6;
      const z = (Math.random() - 0.5) * 4;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), mat);
      m.position.set(x, y, z);
      this.targetGroup.add(m);
      this.targets.push({ x, y, z, r });
    }
    this._bindTips();
  }
  _spawn() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 16638023, depthTest: false })
    );
    m.renderOrder = 10;
    attachGlow(m, 16638023, 1);
    m.position.set(BEAM_X, (Math.random() - 0.5) * SLAB.y * 1.5, (Math.random() - 0.5) * 3);
    this.beamGroup.add(m);
    this.particles.push({ mesh: m, x: BEAM_X, vx: 8 });
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) {
      this._emitAcc += 0.06;
      while (this._emitAcc >= 1) {
        this._emitAcc -= 1;
        this._spawn();
      }
      const alive = [];
      for (const p of this.particles) {
        p.x += p.vx * 0.08;
        p.mesh.position.x = p.x;
        let hit = false;
        for (const t of this.targets) {
          const dx = p.x - t.x, dy = p.mesh.position.y - t.y, dz = p.mesh.position.z - t.z;
          if (dx * dx + dy * dy + dz * dz < t.r * t.r) {
            this.stats.sumPath += p.x - SLAB.x0;
            this.stats.nCollided++;
            this.stats.nTotal++;
            this._flashHit(p.mesh.position);
            hit = true;
            this.beamGroup.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            break;
          }
        }
        if (hit) continue;
        if (p.x >= SLAB.x1 + 2) {
          this.stats.nTransmitted++;
          this.stats.nTotal++;
          this.beamGroup.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          continue;
        }
        alive.push(p);
      }
      this.particles = alive;
      for (let i = this.hitGroup.children.length - 1; i >= 0; i--) {
        const h = this.hitGroup.children[i];
        h.userData.life -= 0.04;
        h.scale.setScalar(1 + (1 - h.userData.life) * 0.5);
        h.material.opacity = h.userData.life;
        if (h.userData.life <= 0) {
          this.hitGroup.remove(h);
          h.geometry.dispose();
          h.material.dispose();
        }
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  _flashHit(pos) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10),
      new THREE.MeshBasicMaterial({ color: 16281969, transparent: true, opacity: 1, depthTest: false })
    );
    m.position.copy(pos);
    m.userData.life = 1;
    attachGlow(m, 16281969, 1.5);
    this.hitGroup.add(m);
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
