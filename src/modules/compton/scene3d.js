import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { comptonShiftPm, scatteredLambdaPm, electronKeV, LAMBDA_C_PM } from "./physics.js";
import { noPick, stat } from "../common/sceneChrome.js";
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  glowSphere,
  smallLabel,
  dashedGuide,
  solidGuide,
  attachGlow
} from "../common/sceneVisuals.js";
const INC_COLOR = 3718648;
const OUT_COLOR = 16498468;
const RECOIL_COLOR = 16020150;
const CYCLE = 3.2;
export class ComptonScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.labels = {};
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
    this.camera.position.set(0, 5, 18);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 28, -2.2);
    this.lamPm = 50;
    this.thetaDeg = 60;
    this.paused = false;
    this._tipTexts = {};
    this._phase = 0;
    this.guides = new THREE.Group();
    noPick(this.guides);
    this.scene.add(this.guides);
    this.labelGroup = new THREE.Group();
    noPick(this.labelGroup);
    this.scene.add(this.labelGroup);
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 24, 24),
      new THREE.MeshStandardMaterial({ color: 9741240, emissive: 4478310, emissiveIntensity: 0.38, metalness: 0.5 })
    );
    this.scene.add(this.electron);
    attachGlow(this.electron, 9741240, 2.4);
    this.incPhoton = glowSphere(0.42, INC_COLOR, { pick: true });
    this.outPhoton = glowSphere(0.48, OUT_COLOR, { pick: true });
    this.recoilE = glowSphere(0.28, RECOIL_COLOR, { pick: true });
    this.scene.add(this.incPhoton, this.outPhoton, this.recoilE);
    this.flash = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 1.2, 32),
      new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this.flash.rotation.x = -Math.PI / 2;
    this.scene.add(this.flash);
    this._alive = true;
    this._last = performance.now();
    this._animate = this._animate.bind(this);
    this._rebuildGuides();
    this._animate();
    this.resize();
  }
  setLabels(labels) {
    this.labels = labels || {};
    this._rebuildGuides();
  }
  setParams({ lamPm, thetaDeg }) {
    if (lamPm != null) this.lamPm = lamPm;
    if (thetaDeg != null) this.thetaDeg = thetaDeg;
    this._rebuildGuides();
    this._bindTips();
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
    if (!tips.electron) return;
    const rad = this.thetaDeg * Math.PI / 180;
    const shift = comptonShiftPm(rad);
    const base = () => [
      stat(tips, "wavelength", `${this.lamPm.toFixed(0)} pm`),
      stat(tips, "scatteringAngle", `${this.thetaDeg.toFixed(0)}\xB0`),
      stat(tips, "shift", `${shift.toFixed(3)} pm`),
      stat(tips, "lambdaC", `${LAMBDA_C_PM.toFixed(3)} pm`)
    ];
    this.electron.userData.sceneTip = () => ({
      title: tips.electron.title,
      desc: tips.electron.desc,
      stats: [...base(), stat(tips, "kineticEnergy", `${electronKeV(this.lamPm, rad).toFixed(3)} keV`)]
    });
    this.incPhoton.userData.sceneTip = () => ({ title: tips.incident.title, desc: tips.incident.desc, stats: base() });
    this.outPhoton.userData.sceneTip = () => ({
      title: tips.scattered.title,
      desc: tips.scattered.desc,
      stats: [...base(), stat(tips, "wavelength", `${scatteredLambdaPm(this.lamPm, rad).toFixed(1)} pm (\u03BB')`)]
    });
    this.recoilE.userData.sceneTip = () => ({
      title: tips.recoil.title,
      desc: tips.recoil.desc,
      stats: [...base(), stat(tips, "kineticEnergy", `${electronKeV(this.lamPm, rad).toFixed(3)} keV`)]
    });
  }
  getPickables() {
    return [this.electron, this.incPhoton, this.outPhoton, this.recoilE];
  }
  _rebuildGuides() {
    while (this.guides.children.length) this.guides.remove(this.guides.children[0]);
    while (this.labelGroup.children.length) this.labelGroup.remove(this.labelGroup.children[0]);
    const rad = this.thetaDeg * Math.PI / 180;
    const shift = comptonShiftPm(rad);
    const L = this.labels;
    const incPts = [];
    for (let x = -11; x <= 0; x += 0.5) incPts.push(new THREE.Vector3(x, 0, 0));
    this.guides.add(dashedGuide(incPts, INC_COLOR, 0.6));
    const outPts = [];
    for (let t = 0; t <= 9; t += 0.4) outPts.push(new THREE.Vector3(t * Math.cos(rad), t * Math.sin(rad), 0));
    this.guides.add(dashedGuide(outPts, OUT_COLOR, 0.65));
    const arcPts = [];
    for (let a = 0; a <= this.thetaDeg; a += 3) {
      const r = 3.2;
      arcPts.push(new THREE.Vector3(r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180), 0.05));
    }
    this.guides.add(solidGuide(arcPts, 3137744, 0.85));
    if (L.incident) {
      const s = smallLabel(L.incident, "#38bdf8", 1.25);
      s.position.set(-8, 1, 0);
      this.labelGroup.add(s);
    }
    if (L.scattered) {
      const s = smallLabel(L.scattered, "#fbbf24", 1.25);
      s.position.set(5 * Math.cos(rad), 5 * Math.sin(rad) + 0.4, 0);
      this.labelGroup.add(s);
    }
    if (L.theta) {
      const s = smallLabel(`\u03B8 ${this.thetaDeg.toFixed(0)}\xB0`, "#2fe0d0", 1.15);
      s.position.set(3.5 * Math.cos(rad / 2), 3.5 * Math.sin(rad / 2), 0.15);
      this.labelGroup.add(s);
    }
    if (L.shift) {
      const s = smallLabel(`\u0394\u03BB ${shift.toFixed(2)} pm`, "#34d399", 1.2);
      s.position.set(0, -2.6, 0);
      this.labelGroup.add(s);
    }
  }
  _updateAnimation(phase) {
    const rad = this.thetaDeg * Math.PI / 180;
    const ke = electronKeV(this.lamPm, rad);
    const recoilLen = 3.5 + ke * 4;
    const recoilAng = rad / 2 + 0.45;
    if (phase < 1) {
      this.incPhoton.visible = true;
      this.outPhoton.visible = false;
      this.recoilE.visible = false;
      this.incPhoton.position.set(-10 + phase * 10, 0, 0);
      this.flash.material.opacity = 0;
    } else if (phase < 1.2) {
      const t = (phase - 1) / 0.2;
      this.incPhoton.visible = false;
      this.outPhoton.visible = t > 0.5;
      this.recoilE.visible = t > 0.5;
      this.flash.material.opacity = (1 - t) * 0.85;
      this.flash.scale.setScalar(0.45 + t * 1.2);
      if (t > 0.5) {
        const u = (t - 0.5) * 2;
        this.outPhoton.position.set(u * 4 * Math.cos(rad), u * 4 * Math.sin(rad), 0);
        this.recoilE.position.set(-u * recoilLen * 0.35 * Math.cos(recoilAng), -u * recoilLen * 0.35 * Math.sin(recoilAng), 0);
      }
    } else if (phase < 2.8) {
      const t = (phase - 1.2) / 1.6;
      this.incPhoton.visible = false;
      this.outPhoton.visible = true;
      this.recoilE.visible = true;
      this.flash.material.opacity = 0;
      this.outPhoton.position.set(t * 8 * Math.cos(rad), t * 8 * Math.sin(rad), 0);
      this.recoilE.position.set(-t * recoilLen * Math.cos(recoilAng), -t * recoilLen * Math.sin(recoilAng), 0);
    } else {
      this.incPhoton.visible = false;
      this.outPhoton.visible = false;
      this.recoilE.visible = false;
      this.flash.material.opacity = 0;
    }
  }
  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1e3);
    this._last = now;
    if (!this.paused) {
      this._phase = (this._phase + dt) % CYCLE;
      this._updateAnimation(this._phase);
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
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el == null ? void 0 : el.parentNode) el.parentNode.removeChild(el);
  }
}
