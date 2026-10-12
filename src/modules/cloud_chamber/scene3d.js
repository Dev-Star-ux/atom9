// 3D diffusion cloud chamber — black cold plate, acrylic walls, white vapour trails.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ChamberSim,
  BATCH_SIZE,
  simToScene,
  COL_THROUGH,
  COL_WIDE,
  COL_BACK,
} from './physics.js';
import { setupScene, setupRenderer, addStudioLights, placeLabel, glassMaterial } from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';

function hex(c) {
  return parseInt(String(c).replace('#', ''), 16);
}

export class CloudChamberScene {
  constructor(container, sharedSim) {
    this.container = container;
    this.sim = sharedSim || new ChamberSim();
    this.paused = false;
    this._active = false;
    this._tips = {};
    this._trackMeshes = [];
    this._liveMeshes = [];
    this._flashMeshes = [];

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    // Look down into the chamber like a lab demo
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(0, 16, 10);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 32;
    addStudioLights(this.scene);

    this._buildChamber();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  setActive(v) {
    this._active = !!v;
    if (this._active) this.syncFromSim();
  }

  /** Rebuild 3D trail meshes from the shared simulation state. */
  syncFromSim() {
    this._syncTracks();
    this._syncLive();
    this._syncFlashes();
  }

  _buildChamber() {
    const floorW = 18;
    const floorD = 11;
    const wallH = 3.2;

    // Black cold plate
    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(floorW, 0.18, floorD),
      new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.85, metalness: 0.05 })
    );
    this.floor.position.y = -0.05;
    this.scene.add(this.floor);

    // Acrylic walls
    const wallMat = glassMaterial(0x1e293b, 0.12);
    const walls = [
      { w: floorW, h: wallH, d: 0.12, x: 0, z: floorD / 2 },
      { w: floorW, h: wallH, d: 0.12, x: 0, z: -floorD / 2 },
      { w: 0.12, h: wallH, d: floorD, x: floorW / 2, z: 0 },
      { w: 0.12, h: wallH, d: floorD, x: -floorW / 2, z: 0 },
    ];
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), wallMat);
      m.position.set(w.x, wallH / 2, w.z);
      m.renderOrder = 1;
      this.scene.add(m);
    }

    // Mist sheet just above the plate
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW * 0.94, floorD * 0.94),
      new THREE.MeshBasicMaterial({
        color: 0xb8c8e0,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.y = 0.35;
    this.scene.add(mist);

    // Side lamp
    this.lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.6, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.8 })
    );
    this.lamp.position.set(floorW / 2 - 0.4, 1.1, 0);
    this.scene.add(this.lamp);
    const lampLight = new THREE.PointLight(0xffd27a, 0.55, 18);
    lampLight.position.copy(this.lamp.position);
    this.scene.add(lampLight);

    // α source pin
    this.source = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.35 })
    );
    body.rotation.z = Math.PI / 2;
    body.position.set(-floorW / 2 + 0.9, 0.35, 0);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x94a3b8, emissiveIntensity: 0.35 })
    );
    tip.position.set(-floorW / 2 + 1.35, 0.35, 0);
    this.source.add(body, tip);
    this.scene.add(this.source);

    this.scene.add(placeLabel('α source', -floorW / 2 + 0.9, 1.5, 0));
    this.scene.add(placeLabel('cold plate', 0, 0.2, floorD / 2 + 0.6));
    this.scene.add(placeLabel('lamp', floorW / 2 - 0.4, 2.2, 0));

    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.liveGroup = new THREE.Group();
    this.scene.add(this.liveGroup);
    this.flashGroup = new THREE.Group();
    this.scene.add(this.flashGroup);
  }

  setParams(p) { this.sim.setParams(p); }
  setPaused(v) { this.paused = !!v; }
  fireBatch(n) { this.sim.fireBatch(n != null ? n : BATCH_SIZE); }
  clearTracks() {
    this.sim.clear();
    this._disposeGroup(this.trackGroup, this._trackMeshes);
    this._disposeGroup(this.liveGroup, this._liveMeshes);
    this._disposeGroup(this.flashGroup, this._flashMeshes);
    this._trackMeshes = [];
    this._liveMeshes = [];
    this._flashMeshes = [];
  }
  get counts() { return this.sim.counts; }

  _disposeGroup(group, list) {
    for (let i = 0; i < list.length; i++) {
      group.remove(list[i]);
      if (list[i].geometry) list[i].geometry.dispose();
      if (list[i].material) list[i].material.dispose();
    }
  }

  applyTips(tips) {
    this._tips = tips || {};
    tip(this.floor, tips && tips.foil && tips.foil.title, tips && tips.foil && tips.foil.desc);
    tip(this.source, tips && tips.source && tips.source.title, tips && tips.source && tips.source.desc);
    tip(this.lamp, 'Side lamp', 'Grazing light makes white condensation trails visible on the dark plate.');
  }

  getPickables() {
    return [this.floor, this.source, this.lamp];
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    if (dt == null) dt = 0.04;
    this.sim.tick(dt);
    this._syncTracks();
    this._syncLive();
    this._syncFlashes();
  }

  _ptsToCurve(pts) {
    const path = [];
    const step = pts.length > 60 ? 4 : 2;
    for (let i = 0; i < pts.length; i += step) {
      const p = simToScene(pts[i], pts[i + 1], 0.2);
      path.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    if (pts.length >= 4) {
      const p = simToScene(pts[pts.length - 2], pts[pts.length - 1], 0.2);
      path.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    if (path.length < 2) return null;
    return path.length >= 3
      ? new THREE.CatmullRomCurve3(path)
      : new THREE.LineCurve3(path[0], path[path.length - 1]);
  }

  _makeTrail(pts, colorHex, radius, opacity) {
    const curve = this._ptsToCurve(pts);
    if (!curve) return null;
    const geo = new THREE.TubeGeometry(curve, Math.max(8, Math.floor(pts.length / 2)), radius, 5, false);
    const col = hex(colorHex);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: opacity,
      roughness: 0.5,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    return mesh;
  }

  _syncTracks() {
    // Rebuild finished trails from sim state (cheap at ≤36 tracks)
    this._disposeGroup(this.trackGroup, this._trackMeshes);
    this._trackMeshes = [];
    for (let i = 0; i < this.sim.tracks.length; i++) {
      const tr = this.sim.tracks[i];
      const fade = Math.max(0.15, tr.life / tr.max);
      const color = this.sim.colorCode ? tr.color : COL_THROUGH;
      const radius = tr.kind === 'through' ? 0.035 : 0.07;
      const mesh = this._makeTrail(tr.pts, color, radius, fade * (tr.kind === 'through' ? 0.55 : 0.95));
      if (mesh) {
        this.trackGroup.add(mesh);
        this._trackMeshes.push(mesh);
      }
    }
  }

  _syncLive() {
    this._disposeGroup(this.liveGroup, this._liveMeshes);
    this._liveMeshes = [];
    for (let i = 0; i < this.sim.alphas.length; i++) {
      const a = this.sim.alphas[i];
      let color = COL_THROUGH;
      if (a.scattered && this.sim.colorCode) {
        color = Math.abs(a.scatterAngle) * 180 / Math.PI > 90 ? COL_BACK : COL_WIDE;
      }
      const mesh = this._makeTrail(a.pts, color, 0.045, 0.9);
      if (mesh) {
        this.liveGroup.add(mesh);
        this._liveMeshes.push(mesh);
      }
    }
  }

  _syncFlashes() {
    this._disposeGroup(this.flashGroup, this._flashMeshes);
    this._flashMeshes = [];
    for (let i = 0; i < this.sim.flashes.length; i++) {
      const f = this.sim.flashes[i];
      const p = simToScene(f.x, f.y, 0.35);
      const t = Math.max(0, f.life / 1.2);
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + 0.2 * (1 - t), 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.85 * t,
          depthWrite: false,
        })
      );
      m.position.set(p.x, p.y, p.z);
      this.flashGroup.add(m);
      this._flashMeshes.push(m);
    }
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
    this.clearTracks();
    this.controls.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}
