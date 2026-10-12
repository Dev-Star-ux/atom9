import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { K_SCALE } from "./physics.js";
import { stat } from "../common/sceneChrome.js";
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow } from "../common/sceneVisuals.js";
const X0 = 20;
const B_MAX = 8;
const DT = 0.1;
const R_SOFT2 = 0.09;
const N_ALPHA = 60;
const TRAIL = 7e3;
function sprite(color) {
  const s = 64, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  return t;
}
export class ScatterScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.camera.position.set(0, 14, 34);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(2, 0, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 40, -1);
    this.kappa = K_SCALE * 79;
    this.v0 = 2;
    this.Z = 79;
    this.E = 2;
    this.targetName = "Gold (Au)";
    this.paused = false;
    this._active = false;
    this._tipTexts = {};
    this._buildNucleus();
    this._buildParticles();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }
  _buildNucleus() {
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 24, 24),
      new THREE.MeshStandardMaterial({ color: 16765514, emissive: 16756768, emissiveIntensity: 0.52, metalness: 0.3, roughness: 0.4 })
    );
    this.scene.add(this.nucleus);
    attachGlow(this.nucleus, 16764762, 3.2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(B_MAX, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: 3821696, transparent: true, opacity: 0.85 }));
    ring.position.x = -X0;
    ring.rotation.y = Math.PI / 2;
    this.beamRing = ring;
    this.scene.add(ring);
  }
  setPaused(v) {
    this.paused = !!v;
  }
  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }
  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.nucleus) return;
    const alphaTip = (_obj, hit) => this._alphaTip(tips, hit);
    this.nucleus.userData.sceneTip = () => ({
      title: tips.nucleus.title,
      desc: tips.nucleus.desc,
      stats: [stat(tips, "nuclearCharge", `Z = ${this.Z}`)]
    });
    this.beamRing.userData.sceneTip = () => ({
      title: tips.beam.title,
      desc: tips.beam.desc,
      stats: [
        stat(tips, "alphaEnergy", `${this.E.toFixed(1)} (model units)`),
        stat(tips, "nuclearCharge", `Z = ${this.Z}`)
      ]
    });
    this.aPoints.userData.sceneTip = alphaTip;
    this.tPoints.userData.sceneTip = alphaTip;
  }
  _alphaAtHit(hit) {
    if ((hit == null ? void 0 : hit.object) === this.aPoints && hit.index != null) return this.alphas[hit.index];
    if (hit == null ? void 0 : hit.point) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < N_ALPHA; i++) {
        const p = this.alphas[i];
        const d = (p.x - hit.point.x) ** 2 + (p.y - hit.point.y) ** 2 + (p.z - hit.point.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return this.alphas[best];
    }
    return this.alphas[0];
  }
  _angleFromVelocity(p) {
    const vperp = Math.hypot(p.vy, p.vz);
    return Math.atan2(vperp, p.vx) * (180 / Math.PI);
  }
  _alphaTip(tips, hit) {
    const p = this._alphaAtHit(hit);
    const theta = this._angleFromVelocity(p);
    const stats = [
      stat(tips, "scatteringAngle", `${theta.toFixed(1)}\xB0`),
      stat(tips, "alphaEnergy", `${this.E.toFixed(1)} (model units)`),
      stat(tips, "charge", "+2e"),
      stat(tips, "nuclearCharge", `Z = ${this.Z}`)
    ];
    if (p.b != null) stats.splice(1, 0, stat(tips, "impactParameter", p.b.toFixed(2)));
    return { title: tips.alpha.title, desc: tips.alpha.desc, stats };
  }
  getPickables() {
    return [this.nucleus, this.beamRing, this.aPoints, this.tPoints].filter(Boolean);
  }
  _buildParticles() {
    this.aPos = new Float32Array(N_ALPHA * 3);
    this.alphas = [];
    for (let i = 0; i < N_ALPHA; i++) {
      this.alphas.push({});
      this._spawn(i, true);
    }
    const ageo = new THREE.BufferGeometry();
    ageo.setAttribute("position", new THREE.BufferAttribute(this.aPos, 3));
    this.aMat = new THREE.PointsMaterial({ size: 1.5, map: sprite("rgba(150,230,255,0.95)"), color: 13496063, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.aPoints = new THREE.Points(ageo, this.aMat);
    this.scene.add(this.aPoints);
    this.tPos = new Float32Array(TRAIL * 3);
    this.tCol = new Float32Array(TRAIL * 3);
    this.tHead = 0;
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute("position", new THREE.BufferAttribute(this.tPos, 3));
    tgeo.setAttribute("color", new THREE.BufferAttribute(this.tCol, 3));
    this.tMat = new THREE.PointsMaterial({ size: 0.62, map: sprite("rgba(120,200,255,0.9)"), vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending });
    this.tPoints = new THREE.Points(tgeo, this.tMat);
    this.scene.add(this.tPoints);
  }
  _spawn(i, prewarm = false) {
    const b = 0.15 + Math.pow(Math.random(), 0.8) * B_MAX;
    const ang = Math.random() * Math.PI * 2;
    const p = { x: -X0, y: b * Math.cos(ang), z: b * Math.sin(ang), vx: this.v0, vy: 0, vz: 0, b };
    this.alphas[i] = p;
    if (prewarm) {
      const n = Math.floor(Math.random() * 360);
      for (let k = 0; k < n; k++) {
        this._stepParticle(p);
        if (this._escaped(p)) {
          this._spawn(i, false);
          return;
        }
      }
      this.aPos[i * 3] = p.x;
      this.aPos[i * 3 + 1] = p.y;
      this.aPos[i * 3 + 2] = p.z;
    }
  }
  _escaped(p) {
    return p.x * p.x + p.y * p.y + p.z * p.z > (X0 + 4) * (X0 + 4);
  }
  _stepParticle(p) {
    const step = (px, py, pz) => {
      const r2 = Math.max(px * px + py * py + pz * pz, R_SOFT2);
      const r = Math.sqrt(r2);
      const f = this.kappa / (r2 * r);
      return [f * px, f * py, f * pz];
    };
    let [ax, ay, az] = step(p.x, p.y, p.z);
    p.vx += 0.5 * ax * DT;
    p.vy += 0.5 * ay * DT;
    p.vz += 0.5 * az * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.z += p.vz * DT;
    [ax, ay, az] = step(p.x, p.y, p.z);
    p.vx += 0.5 * ax * DT;
    p.vy += 0.5 * ay * DT;
    p.vz += 0.5 * az * DT;
  }
  setParams(Z, E, name) {
    if (Z && typeof Z === 'object') {
      const p = Z;
      this.Z = p.Z != null ? p.Z : this.Z;
      this.E = p.E != null ? p.E : this.E;
      if (p.targetName) this.targetName = p.targetName;
    } else {
      this.Z = Z;
      this.E = E;
      if (name) this.targetName = name;
    }
    this.kappa = K_SCALE * this.Z;
    this.v0 = Math.sqrt(2 * this.E);
    for (let i = 0; i < N_ALPHA; i++) this._spawn(i);
    this._bindTips();
  }
  setActive(v) { this._active = !!v; }
  _step() {
    for (let i = 0; i < N_ALPHA; i++) {
      const p = this.alphas[i];
      this._stepParticle(p);
      this.aPos[i * 3] = p.x;
      this.aPos[i * 3 + 1] = p.y;
      this.aPos[i * 3 + 2] = p.z;
      const h = this.tHead;
      this.tPos[h * 3] = p.x;
      this.tPos[h * 3 + 1] = p.y;
      this.tPos[h * 3 + 2] = p.z;
      this.tCol[h * 3] = 0.5;
      this.tCol[h * 3 + 1] = 0.85;
      this.tCol[h * 3 + 2] = 1;
      this.tHead = (h + 1) % TRAIL;
      if (this._escaped(p)) this._spawn(i);
    }
    for (let k = 0; k < TRAIL; k++) {
      this.tCol[k * 3] *= 0.992;
      this.tCol[k * 3 + 1] *= 0.992;
      this.tCol[k * 3 + 2] *= 0.992;
    }
    this.aPoints.geometry.attributes.position.needsUpdate = true;
    this.tPoints.geometry.attributes.position.needsUpdate = true;
    this.tPoints.geometry.attributes.color.needsUpdate = true;
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (this._active && !this.paused) this._step();
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
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}
