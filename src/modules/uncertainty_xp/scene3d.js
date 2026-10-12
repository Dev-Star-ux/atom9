// 3D Heisenberg view — clear dual distributions + phase-space uncertainty ellipse.
// Inspired by PhysSandbox / SciPhyLabs teaching: narrow σ_x ↔ wide σ_p.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, placeLabel } from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import {
  samplePsiX,
  samplePhiP,
  gaussianDx,
  gaussianDp,
  xpProduct,
  HBAR_HALF,
} from './physics.js';

function disposeObj(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      for (let i = 0; i < obj.material.length; i++) obj.material[i].dispose();
    } else obj.material.dispose();
  }
}

export class UncertaintyXPScene {
  constructor(container) {
    this.container = container;
    this.sigma = 1e-10;
    this.excess = 1;
    this.paused = false;
    this._tips = {};

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 10, 18);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 2, 0);
    addStudioLights(this.scene);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Ground card
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 14),
      new THREE.MeshStandardMaterial({ color: 0x0a1122, roughness: 0.9, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.scene.add(ground);

    this.posGroup = new THREE.Group();
    this.momGroup = new THREE.Group();
    this.ellipseGroup = new THREE.Group();
    this.root.add(this.posGroup);
    this.root.add(this.momGroup);
    this.root.add(this.ellipseGroup);

    this.posLabel = placeLabel('|ψ(x)|²', -6.5, 5.2, 0);
    this.momLabel = placeLabel('|φ(p)|²', 6.5, 5.2, 0);
    this.prodLabel = placeLabel('σₓ σₚ ≥ ℏ/2', 0, 7.2, 0);
    this.scene.add(this.posLabel, this.momLabel, this.prodLabel);

    this._panelPos = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 5.2),
      new THREE.MeshBasicMaterial({ color: 0x0b1528, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    this._panelPos.position.set(-6.2, 2.4, -0.2);
    this.scene.add(this._panelPos);

    this._panelMom = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 5.2),
      new THREE.MeshBasicMaterial({ color: 0x180b1c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    this._panelMom.position.set(6.2, 2.4, -0.2);
    this.scene.add(this._panelMom);

    tip(this._panelPos, 'Position probability |ψ(x)|²', 'Narrower packet ⇒ smaller σₓ.');
    tip(this._panelMom, 'Momentum probability |φ(p)|²', 'Narrower σₓ forces a wider momentum spread.');

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._rebuild();
  }

  setParams(p) {
    if (!p) return;
    if (p.sigma != null) this.sigma = p.sigma;
    if (p.excess != null) this.excess = p.excess;
    this._rebuild();
  }

  setPaused(v) { this.paused = !!v; }

  applyTips(tips) {
    this._tips = tips || {};
    if (tips && tips.packet) {
      tip(this._panelPos, tips.packet.title, tips.packet.desc);
    }
    if (tips && tips.particle) {
      tip(this._panelMom, tips.particle.title, tips.particle.desc);
    }
  }

  getPickables() {
    return [this._panelPos, this._panelMom];
  }

  _clearGroup(g) {
    while (g.children.length) {
      const c = g.children[0];
      g.remove(c);
      disposeObj(c);
    }
  }

  _rebuild() {
    this._clearGroup(this.posGroup);
    this._clearGroup(this.momGroup);
    this._clearGroup(this.ellipseGroup);

    const psi = samplePsiX(this.sigma, 64);
    const phi = samplePhiP(this.sigma, this.excess, 64);
    this._buildBars(this.posGroup, psi, -6.2, 0x38bdf8, true);
    this._buildBars(this.momGroup, phi, 6.2, 0xf472b6, false);
    this._buildEllipse();

    const prod = xpProduct(this.sigma, this.excess);
    const above = prod / HBAR_HALF;
    this.prodLabel.material.map = null;
    // refresh floating label text via new sprite
    this.scene.remove(this.prodLabel);
    disposeObj(this.prodLabel);
    this.prodLabel = placeLabel(
      'σₓσₚ / (ℏ/2) = ' + above.toFixed(2),
      0, 7.2, 0
    );
    this.scene.add(this.prodLabel);
  }

  _buildBars(group, sample, centerX, color, isPos) {
    let ymax = 1e-9;
    for (let i = 0; i < sample.ys.length; i++) if (sample.ys[i] > ymax) ymax = sample.ys[i];
    const span = sample.xMax - sample.xMin;
    const width = 8.2;
    const n = sample.ys.length;
    const barW = width / n * 0.92;

    // baseline
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.04, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x475569 })
    );
    base.position.set(centerX, 0.4, 0.15);
    group.add(base);

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const xVal = sample.xMin + span * t;
      const h = Math.max(0.05, (sample.ys[i] / ymax) * 4.2);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(barW, h, 0.35),
        new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.35 + 0.45 * (sample.ys[i] / ymax),
          transparent: true,
          opacity: 0.85,
        })
      );
      const xLocal = -width / 2 + t * width;
      bar.position.set(centerX + xLocal, 0.4 + h / 2, 0.15);
      group.add(bar);
    }

    // ±σ markers
    const sig = isPos ? sample.sigmaA : sample.sigmaP;
    for (const s of [-sig, sig]) {
      const t = (s - sample.xMin) / span;
      if (t < 0 || t > 1) continue;
      const xLocal = -width / 2 + t * width;
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 4.4, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 })
      );
      mark.position.set(centerX + xLocal, 2.5, 0.4);
      group.add(mark);
    }

    const axisLab = placeLabel(isPos ? 'x' : 'p', centerX, 0.15, 1.1);
    group.add(axisLab);
  }

  _buildEllipse() {
    // Phase-space uncertainty ellipse: semi-axes ∝ σ_x and σ_p (normalized)
    const sx = Math.max(0.35, Math.min(3.2, gaussianDx(this.sigma) * 1e10));
    const spRaw = gaussianDp(this.sigma, this.excess) / (1.054571817e-34 / 1e-10);
    const sp = Math.max(0.35, Math.min(3.2, spRaw));

    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(sx * Math.cos(a), 0.05, sp * Math.sin(a)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const loop = new THREE.LineLoop(
      geo,
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 })
    );
    this.ellipseGroup.add(loop);

    // fill disc (thin)
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(sx, sp, 1);
    disc.position.y = 0.04;
    this.ellipseGroup.add(disc);

    const hx = new THREE.Mesh(
      new THREE.BoxGeometry(sx * 2, 0.03, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    hx.position.y = 0.06;
    this.ellipseGroup.add(hx);
    const hz = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, sp * 2),
      new THREE.MeshBasicMaterial({ color: 0xf472b6 })
    );
    hz.position.y = 0.06;
    this.ellipseGroup.add(hz);

    this.ellipseGroup.add(placeLabel('phase space  σₓ×σₚ', 0, 1.1, 0));
    this.ellipseGroup.position.set(0, 0, 0);
  }

  tick() {}

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) this.controls.update();
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
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
}
