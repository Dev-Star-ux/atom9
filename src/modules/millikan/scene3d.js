// 3D Millikan chamber (Three.js): charged oil drops floating between two
// capacitor plates, jittering with Brownian motion. Drop colour encodes its
// number of electrons. Simple, works on software WebGL (CPU-only).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { balanceVoltage } from './physics.js';
import { stat } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, attachGlow, dashedGuide } from '../common/sceneVisuals.js';

const CHARGE_COLORS = [0x4aa3ff, 0x22d3ee, 0x34d399, 0xa3e635, 0xfbbf24, 0xfb923c, 0xf87171, 0xf472b6];

export class MillikanScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camera.position.set(0, 2, 22);

    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -7.5);

    this.voltage = 400;
    this.paused = false;
    this._tipTexts = {};
    this._buildPlates();
    this.drops = [];
    this.dropMeshes = [];

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildPlates() {
    const plateGeo = new THREE.BoxGeometry(14, 0.4, 8);
    const top = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: 0xff5c7a, emissive: 0xff5c7a, emissiveIntensity: 0.32, metalness: 0.3 }));
    top.position.y = 6;
    const bot = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: 0x4aa3ff, emissive: 0x4aa3ff, emissiveIntensity: 0.32, metalness: 0.3 }));
    bot.position.y = -6;
    this.plateTop = top; this.plateBot = bot;
    this.scene.add(top, bot);
    for (let x = -6; x <= 6; x += 3) {
      const pts = [new THREE.Vector3(x, 5.6, 0), new THREE.Vector3(x, -5.6, 0)];
      this.scene.add(dashedGuide(pts, 0x4aa3ff, 0.45));
    }
  }

  setVoltage(v) { this.voltage = v; this._bindTips(); }

  setPaused(v) { this.paused = !!v; }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.plateP) return;
    const vPlate = `${this.voltage.toFixed(0)} V`;
    this.plateTop.userData.sceneTip = () => ({
      title: tips.plateP.title,
      desc: tips.plateP.desc,
      stats: [stat(tips, 'plateV', vPlate)],
    });
    this.plateBot.userData.sceneTip = () => ({
      title: tips.plateN.title,
      desc: tips.plateN.desc,
      stats: [stat(tips, 'plateV', vPlate)],
    });
    for (let i = 0; i < this.dropMeshes.length; i++) {
      const m = this.dropMeshes[i];
      const d = this.drops[i];
      if (!d) continue;
      m.userData.sceneTip = () => ({
        title: tips.drop.title,
        desc: tips.drop.desc,
        stats: [
          stat(tips, 'electrons', d.n),
          stat(tips, 'charge', `${d.q.toFixed(2)} ×10⁻¹⁹ C`),
          stat(tips, 'radius', `${d.radiusUm.toFixed(2)} µm`),
          stat(tips, 'balanceV', `${m.userData.Vbal.toFixed(0)} V`),
          stat(tips, 'plateV', vPlate),
        ],
      });
    }
  }

  getPickables() {
    return [this.plateTop, this.plateBot, ...this.dropMeshes].filter(Boolean);
  }

  setDrops(drops) {
    for (const m of this.dropMeshes) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.dropMeshes = [];
    this.drops = drops;
    drops.forEach((d, i) => {
      const r = 0.22 + d.radiusUm * 0.18;
      const color = CHARGE_COLORS[Math.min(d.n - 1, CHARGE_COLORS.length - 1)];
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.38, roughness: 0.35 })
      );
      attachGlow(m, color, r * 3.5);
      m.position.set(-6 + (i % 12) * 1.1, -5 + Math.random() * 10, -2 + Math.random() * 4);
      m.userData.vx = 0; m.userData.vy = 0; m.userData.vz = 0;
      m.userData.Vbal = balanceVoltage(d.radiusUm, d.q);
      this.scene.add(m);
      this.dropMeshes.push(m);
    });
    this.applyTips(this._tipTexts);
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) {
    for (const m of this.dropMeshes) {
      const u = m.userData;
      // net vertical push: 0 at the balance voltage, up if V higher, down if lower
      const net = (this.voltage / u.Vbal - 1);
      u.vy += Math.max(-0.03, Math.min(0.03, net * 0.02)) + (Math.random() - 0.5) * 0.004;
      u.vx += (Math.random() - 0.5) * 0.006; u.vz += (Math.random() - 0.5) * 0.005;
      u.vx *= 0.9; u.vy *= 0.9; u.vz *= 0.9;
      m.position.x += u.vx; m.position.y += u.vy; m.position.z += u.vz;
      if (Math.abs(m.position.x) > 6.5) { u.vx *= -0.6; m.position.x = Math.sign(m.position.x) * 6.5; }
      if (m.position.y > 5.4) { u.vy *= -0.5; m.position.y = 5.4; }
      if (m.position.y < -5.4) { u.vy *= -0.5; m.position.y = -5.4; }
      if (Math.abs(m.position.z) > 3.5) u.vz *= -1;
    }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
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
