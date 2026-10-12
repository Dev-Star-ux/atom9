import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, placeLabel } from "../common/sceneVisuals.js";
import { tip } from "../common/sceneChrome.js";
import { toSceneRadius } from "./physics.js";
const ATOM_R = 3.2;
const NUCLEUS_R = 0.18;
export class PlanetaryScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 8, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 20, -4);
    this.paused = false;
    this.electrons = [];
    this.orbitMeshes = [];
    this.radiate = false;
    this.speed = 1;
    this.baseRadius = 130;
    this._photons = [];
    this._tipTexts = {};
    this._buildAtom();
    this.eGroup = new THREE.Group();
    this.photonGroup = new THREE.Group();
    this.scene.add(this.eGroup, this.photonGroup);
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  _buildAtom() {
    this.atomShell = new THREE.Mesh(
      new THREE.SphereGeometry(ATOM_R, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 3718648,
        transparent: true,
        opacity: 0.06,
        wireframe: false,
        side: THREE.DoubleSide
      })
    );
    this.scene.add(this.atomShell);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ATOM_R, 0.02, 8, 64),
      new THREE.MeshBasicMaterial({ color: 4674921, transparent: true, opacity: 0.45 })
    );
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(NUCLEUS_R, 20, 20),
      new THREE.MeshStandardMaterial({ color: 15680580, emissive: 14427686, emissiveIntensity: 0.65 })
    );
    this.nucleus.userData.tipKey = "nucleus";
    this.scene.add(this.nucleus);
    attachGlow(this.nucleus, 15680580, 1.8);
    this.scene.add(placeLabel("tiny nucleus +", 0, 0.55, 0));
    this.scene.add(placeLabel("electron orbits (mostly empty space)", 0, ATOM_R + 0.5, 0));
    const scaleBar = new THREE.Group();
    const barGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.2, -ATOM_R - 0.6, 0),
      new THREE.Vector3(1.2, -ATOM_R - 0.6, 0)
    ]);
    scaleBar.add(new THREE.Line(barGeo, new THREE.LineBasicMaterial({ color: 6583435 })));
    this.scene.add(scaleBar);
    this.scene.add(placeLabel("~10\u2074\xD7 smaller than atom", 0, -ATOM_R - 1, 0));
  }
  setElectrons(list) {
    this.electrons = list;
    while (this.eGroup.children.length) this.eGroup.remove(this.eGroup.children[0]);
    for (const m of this.orbitMeshes) this.scene.remove(m);
    this.orbitMeshes = [];
    for (const e of list) {
      const sr = toSceneRadius(e.r0);
      const ry = sr * (0.72 + 0.14 * Math.abs(e.tilt || 0));
      const curve = new THREE.EllipseCurve(0, 0, sr, ry, 0, 2 * Math.PI);
      const pts = curve.getPoints(72).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 2306119, transparent: true, opacity: 0.75 }));
      this.scene.add(ring);
      this.orbitMeshes.push(ring);
      e.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({ color: 3718648, emissive: 959977, emissiveIntensity: 0.45 })
      );
      e.mesh.userData.tipKey = "electron";
      attachGlow(e.mesh, 3718648, 1.2);
      this.eGroup.add(e.mesh);
      e.trailMesh = null;
      e.trailPts = [];
    }
  }
  setParams({ speed, radiate, baseRadius }) {
    if (speed != null) this.speed = speed;
    if (radiate != null) this.radiate = radiate;
    if (baseRadius != null) this.baseRadius = baseRadius;
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    var _a, _b, _c, _d, _e;
    this._tipTexts = tips || {};
    tip(this.nucleus, (_a = tips.nucleus) == null ? void 0 : _a.title, (_b = tips.nucleus) == null ? void 0 : _b.desc);
    for (const c of this.eGroup.children) {
      if (((_c = c.userData) == null ? void 0 : _c.tipKey) === "electron") {
        tip(c, (_d = tips.electron) == null ? void 0 : _d.title, (_e = tips.electron) == null ? void 0 : _e.desc);
      }
    }
  }
  getPickables() {
    return [this.nucleus, ...this.eGroup.children];
  }
  tick(dt, tickFn) {
    if (this.paused) return;
    tickFn == null ? void 0 : tickFn(this.electrons, dt, { speed: this.speed, radiate: this.radiate });
    for (const e of this.electrons) {
      if (e.dead) {
        if (e.mesh) e.mesh.visible = false;
        continue;
      }
      const sr = toSceneRadius(e.r);
      const ry = sr * (0.72 + 0.14 * Math.abs(e.tilt || 0));
      const ex = sr * Math.cos(e.angle);
      const ez = ry * Math.sin(e.angle);
      e.mesh.position.set(ex, 0, ez);
      e.mesh.visible = true;
      if (this.radiate && !e.dead && Math.random() < dt * 2.5) {
        this._emitPhoton(ex, 0, ez);
      }
      e.trailPts.push(ex, 0, ez);
      if (e.trailPts.length > 36) e.trailPts.splice(0, 3);
      if (e.trailPts.length >= 6) {
        if (e.trailMesh) this.eGroup.remove(e.trailMesh);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(e.trailPts), 3));
        const col = this.radiate ? 16498468 : 2781071;
        e.trailMesh = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 }));
        this.eGroup.add(e.trailMesh);
      }
    }
    for (let i = this._photons.length - 1; i >= 0; i--) {
      const ph = this._photons[i];
      ph.life -= dt;
      ph.mesh.position.addScaledVector(ph.vel, dt);
      ph.mesh.material.opacity = Math.max(0, ph.life / ph.max);
      if (ph.life <= 0) {
        this.photonGroup.remove(ph.mesh);
        this._photons.splice(i, 1);
      }
    }
  }
  _emitPhoton(x, y, z) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 16498468, transparent: true, opacity: 0.9 })
    );
    attachGlow(m, 16498468, 0.8);
    m.position.set(x, y, z);
    const angle = Math.atan2(z, x) + Math.PI / 2;
    const vel = new THREE.Vector3(Math.cos(angle), 0.2, Math.sin(angle)).multiplyScalar(2.5);
    this.photonGroup.add(m);
    this._photons.push({ mesh: m, vel, life: 0.8, max: 0.8 });
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.controls.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
