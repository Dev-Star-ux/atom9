import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { orbitRadiusUnits, orbitAngularSpeed, energyLevelEV } from "./physics.js";
import { noPick, stat } from "../common/sceneChrome.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, glowSphere, smallLabel } from "../common/sceneVisuals.js";
function easeOut(t) {
  return 1 - (1 - t) ** 3;
}
export class BohrScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camera.position.set(0, 14, 18);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -0.5);
    this.n = 3;
    this.showAll = true;
    this.angle = 0;
    this.paused = false;
    this._tipTexts = {};
    this._trans = null;
    this.photon = null;
    this.labelGroup = new THREE.Group();
    noPick(this.labelGroup);
    this.scene.add(this.labelGroup);
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshStandardMaterial({ color: 16765514, emissive: 16756768, emissiveIntensity: 0.52, metalness: 0.3 })
    );
    this.scene.add(this.nucleus);
    attachGlow(this.nucleus, 16765514, 2.6);
    this.orbitGroup = new THREE.Group();
    this.scene.add(this.orbitGroup);
    this.orbitMeshes = [];
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 14),
      new THREE.MeshBasicMaterial({ color: 8380415, depthTest: false })
    );
    this.electron.renderOrder = 10;
    this.scene.add(this.electron);
    attachGlow(this.electron, 8380415, 1.5);
    this._rebuildOrbits();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  isTransitioning() {
    return !!this._trans;
  }
  setN(n) {
    if (this._trans) return;
    this.n = n;
    this._rebuildOrbits();
    this._bindTips();
  }
  setShowAll(v) {
    this.showAll = v;
    this._rebuildOrbits();
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }
  /** Animate electron falling from upper level n2 to lower n1; photon leaves atom. */
  playTransition(n2, n1, color = 16737928) {
    var _a;
    if (this._trans || n2 <= n1) return;
    this._clearPhoton();
    this.n = n2;
    this._rebuildOrbits();
    this._trans = { n2, n1, t: 0, color, photonT: 0 };
    (_a = this.onTransitionStart) == null ? void 0 : _a.call(this, { n2, n1 });
  }
  _clearPhoton() {
    var _a, _b;
    if (!this.photon) return;
    this.scene.remove(this.photon);
    (_a = this.photon.geometry) == null ? void 0 : _a.dispose();
    (_b = this.photon.material) == null ? void 0 : _b.dispose();
    this.photon = null;
  }
  _spawnPhoton(color, pos, dir) {
    this._clearPhoton();
    this.photon = glowSphere(0.18, color);
    this.photon.position.copy(pos);
    this.photon.userData.dir = dir.clone().normalize();
    this.photon.userData.life = 1;
    this.scene.add(this.photon);
  }
  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.nucleus) return;
    const E = energyLevelEV(this.n);
    this.nucleus.userData.sceneTip = () => ({
      title: tips.nucleus.title,
      desc: tips.nucleus.desc,
      stats: [stat(tips, "nuclearCharge", "Z = 1")]
    });
    this.electron.userData.sceneTip = () => ({
      title: tips.electron.title,
      desc: tips.electron.desc,
      stats: [
        stat(tips, "quantumN", this.n),
        stat(tips, "energy", `${E.toFixed(2)} eV`),
        stat(tips, "radius", `r \u221D ${this.n}\xB2`)
      ]
    });
    for (const om of this.orbitMeshes) {
      if (om.userData.level === this.n) om.userData.sceneTip = this.electron.userData.sceneTip;
    }
  }
  getPickables() {
    return [this.nucleus, this.electron, ...this.orbitMeshes.filter((m) => m.userData.level === this.n)];
  }
  _rebuildOrbits() {
    var _a, _b, _c;
    for (const m of this.orbitMeshes) {
      this.orbitGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.orbitMeshes = [];
    while (this.labelGroup.children.length) {
      const c = this.labelGroup.children[0];
      this.labelGroup.remove(c);
      (_b = (_a = c.material) == null ? void 0 : _a.map) == null ? void 0 : _b.dispose();
      (_c = c.material) == null ? void 0 : _c.dispose();
    }
    const maxN = 6;
    for (let gn = 1; gn <= maxN; gn++) {
      const r = orbitRadiusUnits(gn);
      const active = gn === this.n;
      if (!this.showAll && !active) continue;
      const geo = new THREE.TorusGeometry(r, active ? 0.045 : 0.022, 8, 96);
      const mat = new THREE.MeshBasicMaterial({
        color: active ? 2282478 : 1976635,
        transparent: !active,
        opacity: active ? 1 : 0.4,
        depthWrite: false
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      if (active) attachGlow(ring, 2282478, r * 0.35);
      ring.userData.level = gn;
      this.orbitGroup.add(ring);
      this.orbitMeshes.push(ring);
      const lbl = smallLabel(`n = ${gn}`, active ? "#22d3ee" : "#64748b", active ? 1.1 : 0.95);
      lbl.position.set(r + 0.35, 0.35, 0);
      this.labelGroup.add(lbl);
    }
    this._bindTips();
  }
  _tickTransition(dt) {
    var _a;
    const tr = this._trans;
    tr.t += dt;
    const fallDur = 0.85;
    const u = Math.min(1, tr.t / fallDur);
    const e = easeOut(u);
    const r2 = orbitRadiusUnits(tr.n2);
    const r1 = orbitRadiusUnits(tr.n1);
    const r = r2 + (r1 - r2) * e;
    this.angle += orbitAngularSpeed(tr.n2) * dt * 1.4;
    const ex = r * Math.cos(this.angle);
    const ez = r * Math.sin(this.angle);
    this.electron.position.set(ex, 0, ez);
    if (u >= 0.42 && !this.photon) {
      const dir = new THREE.Vector3(ex, 0.25, ez).normalize();
      this._spawnPhoton(tr.color, new THREE.Vector3(ex, 0, ez), dir);
    }
    if (this.photon) {
      tr.photonT += dt;
      const p = this.photon;
      p.position.addScaledVector(p.userData.dir, dt * 5.5);
      p.userData.life -= dt * 1.1;
      p.material.opacity = Math.max(0, p.userData.life) * 0.85;
      if (p.userData.life <= 0) this._clearPhoton();
    }
    if (u >= 1) {
      const n1 = tr.n1;
      this._trans = null;
      this.n = n1;
      this._rebuildOrbits();
      this.electron.position.set(r1 * Math.cos(this.angle), 0, r1 * Math.sin(this.angle));
      (_a = this.onTransitionComplete) == null ? void 0 : _a.call(this, n1);
    }
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    const dt = 0.016;
    if (!this.paused) {
      if (this._trans) this._tickTransition(dt);
      else {
        this.angle += orbitAngularSpeed(this.n) * dt;
        const r = orbitRadiusUnits(this.n);
        this.electron.position.set(r * Math.cos(this.angle), 0, r * Math.sin(this.angle));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
    this._clearPhoton();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
