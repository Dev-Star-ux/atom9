// 3D Infinite Square Well — clear walls, ψ ribbon, |ψ|² floor, energy ladder.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupScene, setupRenderer, addStudioLights, placeLabel } from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import { N_MAX, WellState, levelEnergies, phaseHue } from './physics.js';

function disposeMesh(m) {
  if (!m) return;
  if (m.geometry) m.geometry.dispose();
  if (m.material) {
    if (Array.isArray(m.material)) {
      for (let i = 0; i < m.material.length; i++) m.material[i].dispose();
    } else m.material.dispose();
  }
}

export class InfiniteWellScene {
  constructor(container, sharedState) {
    this.container = container;
    this.state = sharedState || new WellState();
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 6, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);

    this.wellW = 10;
    this._buildStatic();
    this.psiGroup = new THREE.Group();
    this.densGroup = new THREE.Group();
    this.levelGroup = new THREE.Group();
    this.scene.add(this.psiGroup, this.densGroup, this.levelGroup);

    this._alive = true;
    this._raf = 0;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._rebuildLevels();
  }

  _buildStatic() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.5,
    });
    this.leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.5, 3.2), wallMat);
    this.leftWall.position.set(-this.wellW / 2, 2.2, 0);
    this.rightWall = this.leftWall.clone();
    this.rightWall.position.set(this.wellW / 2, 2.2, 0);
    this.scene.add(this.leftWall, this.rightWall);
    tip(this.leftWall, 'Infinite wall', 'V = ∞ — the wavefunction must vanish here (ψ = 0).');
    tip(this.rightWall, 'Infinite wall', 'V = ∞ — the wavefunction must vanish here (ψ = 0).');

    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(this.wellW - 0.4, 0.12, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    this.floor.position.y = -0.4;
    this.scene.add(this.floor);

    const axis = new THREE.Mesh(
      new THREE.BoxGeometry(this.wellW - 0.5, 0.03, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x64748b })
    );
    axis.position.set(0, 1.6, 0);
    this.scene.add(axis);

    // Sparse labels — offset so they do not stack on walls / ladder
    this.scene.add(placeLabel('V=∞', -this.wellW / 2 - 0.2, 5.4, 1.2, '#fca5a5', 1.0));
    this.scene.add(placeLabel('V=∞', this.wellW / 2 + 0.2, 5.4, 1.2, '#fca5a5', 1.0));
    this.scene.add(placeLabel('Re / Im ψ', 0, 5.5, -1.6, '#a9c4ff', 1.05));
    this.scene.add(placeLabel('Eₙ', this.wellW / 2 + 2.8, 5.2, 0, '#94a3b8', 0.95));
  }

  setParams(p) {
    this.state.setParams(p);
    this._rebuildLevels();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (tips && tips.grid) {
      tip(this.leftWall, tips.grid.title, tips.grid.desc);
      tip(this.rightWall, tips.grid.title, tips.grid.desc);
    }
  }

  getPickables() {
    return [this.leftWall, this.rightWall];
  }

  _clearGroup(g) {
    while (g.children.length) {
      const c = g.children[0];
      g.remove(c);
      disposeMesh(c);
    }
  }

  _rebuildLevels() {
    this._clearGroup(this.levelGroup);
    const levels = levelEnergies(this.state.a, N_MAX);
    const eMax = levels[levels.length - 1].E || 1;
    const dominant = this.state.dominantLevel();
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i];
      const y = 0.2 + (lvl.E / eMax) * 4.6;
      const active = lvl.n === dominant;
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: active ? 0x38bdf8 : 0x475569 })
      );
      bar.position.set(this.wellW / 2 + 2.2, y, 0);
      this.levelGroup.add(bar);
      // Compact digit only — avoids eight overlapping caption sprites
      const lab = placeLabel(String(lvl.n), this.wellW / 2 + 3.15, y, 0, active ? '#7dd3fc' : '#64748b', 0.75);
      this.levelGroup.add(lab);
    }
  }

  _syncWave() {
    this._clearGroup(this.psiGroup);
    this._clearGroup(this.densGroup);

    const sample = this.state.sample(96);
    let amp = 1e-9;
    let dmax = 1e-9;
    for (let i = 0; i < sample.re.length; i++) {
      amp = Math.max(amp, Math.abs(sample.re[i]), Math.abs(sample.im[i]));
      if (sample.dens[i] > dmax) dmax = sample.dens[i];
    }

    const rePts = [];
    const imPts = [];
    for (let i = 0; i < sample.xs.length; i++) {
      const u = sample.xs[i] / sample.aNm;
      const x = -this.wellW / 2 + u * this.wellW;
      rePts.push(new THREE.Vector3(x, 1.6 + (sample.re[i] / amp) * 2.2, 0.15));
      imPts.push(new THREE.Vector3(x, 1.6 + (sample.im[i] / amp) * 2.2, -0.15));
    }

    this.psiGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rePts),
      new THREE.LineBasicMaterial({ color: 0xfb923c, linewidth: 2 })
    ));
    this.psiGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(imPts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    ));

    // |ψ|² bars on the floor, coloured by phase
    const n = sample.dens.length;
    const barW = this.wellW / n * 0.9;
    for (let i = 0; i < n; i += 2) {
      const u = sample.xs[i] / sample.aNm;
      const x = -this.wellW / 2 + u * this.wellW;
      const h = Math.max(0.02, (sample.dens[i] / dmax) * 1.8);
      const hue = phaseHue(sample.phase[i]) / 360;
      const col = new THREE.Color().setHSL(hue, 0.85, 0.55);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(barW * 2, h, 1.4),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.8,
        })
      );
      bar.position.set(x, -0.28 + h / 2, 0);
      this.densGroup.add(bar);
    }
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    if (dt == null) dt = 0.04;
    this.state.tick(dt);
    this._syncWave();
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    // Keep drawing even when inactive so the last frame stays visible
    if (this._active && !this.paused) {
      // wave updated in tick from module interval
    }
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
