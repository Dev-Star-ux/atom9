// 3D Born-rule chamber — not a flat chart: probability lobes + falling detections.
// Teaching metaphor: where |ψ|² glows, hits are more likely to land and stack.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  placeLabel,
  attachGlow,
} from '../common/sceneVisuals.js';
import { tip } from '../common/sceneChrome.js';
import { wellCurves } from '../infinite_well/physics.js';
import { DEFAULT_A, HIST_BINS, histogram } from './physics.js';

function disposeObj(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      for (let i = 0; i < obj.material.length; i++) obj.material[i].dispose();
    } else obj.material.dispose();
  }
}

export class WavefunctionStatsScene {
  constructor(container) {
    this.container = container;
    this.n = 2;
    this.a = DEFAULT_A;
    this.hits = [];
    this.paused = false;
    this._active = false;
    this.wellW = 11;
    this.wellD = 4.2;

    // Falling-hit animation queue: { mesh, x, y, z, vy, landed, bin }
    this._falling = [];
    this._pending = [];
    this._knownHits = 0;
    this._stacks = []; // per-bin stack heights (world)

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(7.5, 8.5, 12);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);

    this.lobeGroup = new THREE.Group();
    this.stackGroup = new THREE.Group();
    this.fallGroup = new THREE.Group();
    this.scene.add(this.lobeGroup, this.stackGroup, this.fallGroup);

    this._buildChamber();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._rebuildLobes();
    this._rebuildStacks();
  }

  _wx(x) {
    return (x / this.a) * this.wellW - this.wellW / 2;
  }

  _buildChamber() {
    // Floor detector plate
    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(this.wellW + 0.2, 0.18, this.wellD),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.88, metalness: 0.15 })
    );
    this.floor.position.y = -0.05;
    this.scene.add(this.floor);
    tip(this.floor, 'Position detector', 'Each amber sphere is one measurement of x. Stacks rebuild |ψ|².');

    // Detector bin grooves (visual slots)
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    for (let i = 0; i < HIST_BINS; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(this.wellW / HIST_BINS * 0.92, 0.04, this.wellD * 0.72), slotMat);
      const xc = ((i + 0.5) / HIST_BINS) * this.wellW - this.wellW / 2;
      slot.position.set(xc, 0.06, 0);
      this.scene.add(slot);
    }

    // Infinite walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x5b21b6,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.45,
      transparent: true,
      opacity: 0.92,
    });
    this.leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.2, this.wellD + 0.3), wallMat);
    this.leftWall.position.set(-this.wellW / 2, 2.8, 0);
    this.rightWall = this.leftWall.clone();
    this.rightWall.position.set(this.wellW / 2, 2.8, 0);
    this.scene.add(this.leftWall, this.rightWall);
    tip(this.leftWall, 'V = ∞', 'Hard wall — the wavefunction is zero here.');
    tip(this.rightWall, 'V = ∞', 'Hard wall — the wavefunction is zero here.');

    // Back panel (chamber depth cue)
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(this.wellW - 0.2, 6.0, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, transparent: true, opacity: 0.85 })
    );
    back.position.set(0, 2.7, -this.wellD / 2);
    this.scene.add(back);

    // Ceiling rail (hits fall from here)
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(this.wellW - 0.4, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    rail.position.set(0, 6.0, 0);
    this.scene.add(rail);

    // Soft theory ghost curve above detector (thin — not a 2D chart clone)
    this._ghostPts = new Float32Array(64 * 3);
    this._ghostGeo = new THREE.BufferGeometry();
    this._ghostGeo.setAttribute('position', new THREE.BufferAttribute(this._ghostPts, 3));
    this._ghost = new THREE.Line(
      this._ghostGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    this.scene.add(this._ghost);

    // Sparse labels — chamber corners only
    this.scene.add(placeLabel('V=∞', -this.wellW / 2 - 0.1, 6.3, 1.6, '#c4b5fd', 0.95));
    this.scene.add(placeLabel('V=∞', this.wellW / 2 + 0.1, 6.3, 1.6, '#c4b5fd', 0.95));
    this.scene.add(placeLabel('|ψ|² lobes', 0, 5.4, -this.wellD / 2 - 0.2, '#38bdf8', 1.0));
    this.scene.add(placeLabel('detector', 0, 0.55, this.wellD / 2 + 0.35, '#fbbf24', 0.95));
    this.scene.add(placeLabel('Born rule', 0, 6.6, 0, '#e2e8f0', 0.9));

    // ⟨x⟩ marker on floor centre
    this.expectX = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    this.expectX.position.set(0, 0.22, this.wellD * 0.28);
    this.scene.add(this.expectX);
    this.scene.add(placeLabel('⟨x⟩', 0, 0.7, this.wellD * 0.28, '#4ade80', 0.75));
  }

  setParams(p) {
    if (!p) return;
    if (p.n != null) this.n = p.n;
    if (p.a != null) this.a = p.a;
    this._rebuildLobes();
  }

  setHits(hits) {
    const prev = this._knownHits;
    this.hits = hits || [];
    const next = this.hits.length;

    if (next < prev || next === 0) {
      this._clearFalling();
      this._pending = [];
      this._rebuildStacks();
      this._knownHits = next;
      return;
    }

    if (next > prev) {
      if (this._active) {
        if (!this._pending) this._pending = [];
        for (let i = prev; i < next; i++) {
          this._pending.push({ x: this.hits[i], seed: i, delay: (i - prev) * 0.04 });
        }
      } else {
        this._rebuildStacks();
      }
    }
    this._knownHits = next;
  }

  setPaused(v) { this.paused = !!v; }

  setActive(v) {
    this._active = !!v;
    if (v) {
      // Sync stacks when entering 3D
      this._rebuildStacks();
      this._rebuildLobes();
    }
  }

  applyTips(tips) {
    if (tips && tips.grid) {
      tip(this.leftWall, tips.grid.title, tips.grid.desc);
      tip(this.rightWall, tips.grid.title, tips.grid.desc);
    }
    if (tips && tips.wave) {
      tip(this.floor, tips.wave.title, tips.wave.desc);
    }
  }

  getPickables() {
    return [this.leftWall, this.rightWall, this.floor, this.expectX];
  }

  _clearGroup(g) {
    while (g.children.length) {
      const c = g.children[0];
      g.remove(c);
      disposeObj(c);
    }
  }

  _clearFalling() {
    for (let i = 0; i < this._falling.length; i++) {
      const f = this._falling[i];
      if (f.mesh.parent) f.mesh.parent.remove(f.mesh);
      disposeObj(f.mesh);
    }
    this._falling = [];
  }

  /** Glowing probability lobes at antinodes of |ψ_n|² — the “where hits land” map. */
  _rebuildLobes() {
    this._clearGroup(this.lobeGroup);

    // One lobe per antinode: peaks of sin²(nπx/a) at x = (k+½)a/n
    for (let k = 0; k < this.n; k++) {
      const xPeak = ((k + 0.5) / this.n) * this.a;
      const wx = this._wx(xPeak);
      const rx = (this.wellW / this.n) * 0.38;
      const ry = 1.65;
      const rz = this.wellD * 0.28;

      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 18),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        })
      );
      lobe.scale.set(rx, ry, rz);
      lobe.position.set(wx, 1.1 + ry * 0.15, 0);
      this.lobeGroup.add(lobe);
      attachGlow(lobe, 0x38bdf8, 1.8);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })
      );
      core.position.set(wx, 1.25, 0);
      this.lobeGroup.add(core);
    }

    this._updateGhost();
  }

  _updateGhost() {
    const curves = wellCurves(this.n, this.a, 64);
    let pMax = 1e-12;
    for (let i = 0; i < curves.probs.length; i++) {
      if (curves.probs[i] > pMax) pMax = curves.probs[i];
    }
    for (let i = 0; i < 64; i++) {
      const x = curves.xs[i];
      const h = 0.35 + (curves.probs[i] / pMax) * 2.4;
      this._ghostPts[i * 3] = this._wx(x);
      this._ghostPts[i * 3 + 1] = h;
      this._ghostPts[i * 3 + 2] = -this.wellD * 0.35;
    }
    this._ghostGeo.attributes.position.needsUpdate = true;
  }

  _rebuildStacks() {
    this._clearGroup(this.stackGroup);
    this._stacks = new Array(HIST_BINS).fill(0);
    const hist = histogram(this.hits, this.a, HIST_BINS);
    const binW = this.wellW / HIST_BINS;
    const ballR = Math.min(0.11, binW * 0.38);

    for (let b = 0; b < HIST_BINS; b++) {
      const count = hist[b];
      const xc = ((b + 0.5) / HIST_BINS) * this.wellW - this.wellW / 2;
      for (let j = 0; j < count; j++) {
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(ballR, 10, 10),
          new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0xb45309,
            emissiveIntensity: 0.35,
          })
        );
        const layer = Math.floor(j / 2);
        const side = (j % 2) * 0.18 - 0.09;
        ball.position.set(xc + side * 0.3, 0.12 + ballR + layer * (ballR * 1.85), side);
        this.stackGroup.add(ball);
        this._stacks[b] = 0.12 + ballR + (layer + 1) * (ballR * 1.85);
      }
    }
  }

  _spawnFall(x, seed) {
    const bin = Math.min(HIST_BINS - 1, Math.max(0, Math.floor(x / this.a * HIST_BINS)));
    const wx = this._wx(x);
    const ballR = 0.1;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ballR, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
      })
    );
    const jitter = ((seed * 17) % 10) * 0.04 - 0.2;
    mesh.position.set(wx, 5.7 + (seed % 5) * 0.15, jitter);
    this.fallGroup.add(mesh);
    attachGlow(mesh, 0xfbbf24, 1.1);
    this._falling.push({
      mesh: mesh,
      x: wx,
      z: jitter,
      vy: -0.02 - (seed % 7) * 0.008,
      bin: bin,
      landed: false,
    });
  }

  tick(dt) {
    if (this.paused || !this._active) return;

    // Staggered spawn from pending queue
    if (this._pending && this._pending.length) {
      const keep = [];
      for (let i = 0; i < this._pending.length; i++) {
        const p = this._pending[i];
        p.delay -= dt;
        if (p.delay <= 0) this._spawnFall(p.x, p.seed);
        else keep.push(p);
      }
      this._pending = keep;
    }

    // Gentle lobe pulse
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.lobeGroup.children.length; i++) {
      const c = this.lobeGroup.children[i];
      if (c.material && c.material.opacity != null && c.scale && c.scale.x > 0.5) {
        c.material.opacity = 0.22 + 0.08 * Math.sin(t * 2 + i);
      }
    }

    // Animate falls
    const g = 18;
    const still = [];
    for (let i = 0; i < this._falling.length; i++) {
      const f = this._falling[i];
      if (f.landed) continue;
      f.vy -= g * dt * 0.08;
      f.mesh.position.y += f.vy;
      f.mesh.position.x += (f.x - f.mesh.position.x) * 0.08;
      const targetY = Math.max(0.2, this._stacks[f.bin] || 0.2);
      if (f.mesh.position.y <= targetY) {
        f.mesh.position.y = targetY;
        f.landed = true;
        this.fallGroup.remove(f.mesh);
        this.stackGroup.add(f.mesh);
        this._stacks[f.bin] = targetY + 0.18;
        if (f.mesh.material) f.mesh.material.emissiveIntensity = 0.3;
      } else {
        still.push(f);
      }
    }
    this._falling = still;
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
    this._clearFalling();
    this._clearGroup(this.lobeGroup);
    this._clearGroup(this.stackGroup);
    this._clearGroup(this.fallGroup);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
