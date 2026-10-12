// P-N junction — 3D crystal cross-section: a doped crystal block split into
// P (left) / N (right) halves with a depletion slab between them that
// widens/narrows with bias, drifting hole/electron carriers that recombine
// at the junction under forward bias, and simple circuit context (a
// source block wired to the P side, a load block wired to the N side).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { depletionWidthFrac, carrierState } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  glassMaterial,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const N_HOLES = 10;
const N_ELECTRONS = 10;
const CRYSTAL_W = 2.6;
const CRYSTAL_H = 0.9;
const CRYSTAL_D = 1.0;
const MAX_DEP_HALF = CRYSTAL_W * 0.16;

export class PnJunctionScene3D {
  constructor(container) {
    this.container = container;
    this.state = { Vf: 0.6 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(4.6, 3.0, 5.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.1, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -1.8);

    this._holes = [];
    this._electrons = [];
    this._flashes = [];
    this._buildStage();
    this._buildCarriers();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.82;
    this.scene.add(floor);

    const benchW = 5.4, benchD = 2.6, benchH = 0.14;
    const benchTopY = -0.62;
    this.bench = new THREE.Mesh(
      new THREE.BoxGeometry(benchW, benchH, benchD),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    this.bench.position.set(0, benchTopY - benchH / 2, 0);
    this.scene.add(this.bench);

    const crystalY = benchTopY + CRYSTAL_H / 2 + 0.02;

    // P half (left)
    this.pMesh = new THREE.Mesh(
      roundedBoxGeometry(CRYSTAL_W / 2, CRYSTAL_H, CRYSTAL_D, 0.05, 3),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.55, metalness: 0.08 }),
    );
    this.pMesh.position.set(-CRYSTAL_W / 4, crystalY, 0);
    this.scene.add(this.pMesh);
    tip(this.pMesh, 'P region', 'Doped with acceptors — fixed negative ions and mobile holes (majority carriers).');

    // N half (right)
    this.nMesh = new THREE.Mesh(
      roundedBoxGeometry(CRYSTAL_W / 2, CRYSTAL_H, CRYSTAL_D, 0.05, 3),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55, metalness: 0.08 }),
    );
    this.nMesh.position.set(CRYSTAL_W / 4, crystalY, 0);
    this.scene.add(this.nMesh);
    tip(this.nMesh, 'N region', 'Doped with donors — fixed positive ions and mobile electrons (majority carriers).');

    // Depletion slab at the junction — width animates with bias
    this.depletion = new THREE.Mesh(
      new THREE.BoxGeometry(MAX_DEP_HALF * 2, CRYSTAL_H * 1.02, CRYSTAL_D * 1.02),
      glassMaterial(0xcbd5e1, 0.28),
    );
    this.depletion.position.set(0, crystalY, 0);
    this.scene.add(this.depletion);
    tip(this.depletion, 'Depletion region', 'Carrier-free zone with a built-in field. Shrinks under forward bias, widens under reverse bias.');

    this._crystalY = crystalY;
    const shadow = contactShadow(CRYSTAL_W * 0.65, CRYSTAL_D * 0.65, 0.4);
    shadow.position.set(0, benchTopY + 0.005, 0);
    this.scene.add(shadow);

    this.scene.add(placeLabel('P region', -CRYSTAL_W / 4, crystalY + CRYSTAL_H / 2 + 0.34, CRYSTAL_D / 2 + 0.55, '#fca5a5', 1.0));
    this.scene.add(placeLabel('N region', CRYSTAL_W / 4, crystalY + CRYSTAL_H / 2 + 0.34, CRYSTAL_D / 2 + 0.55, '#93c5fd', 1.0));
    this._depLabel = placeLabel('depletion', 0, crystalY + CRYSTAL_H / 2 + 0.72, CRYSTAL_D / 2 + 0.65, '#e2e8f0', 0.9);
    this.scene.add(this._depLabel);

    // --- circuit context: a source block wired to the P side, a load block wired to the N side ---
    const sourceX = -CRYSTAL_W / 2 - 1.15;
    const loadX = CRYSTAL_W / 2 + 1.15;
    const boxY = benchTopY + 0.24;

    this.source = new THREE.Mesh(
      roundedBoxGeometry(0.55, 0.42, 0.5, 0.05, 3),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    this.source.position.set(sourceX, boxY, 0);
    this.scene.add(this.source);
    const sourceFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xf59e0b, emissiveIntensity: 0.32, roughness: 0.4 }),
    );
    sourceFace.position.set(sourceX, boxY + 0.01, 0.26);
    this.scene.add(sourceFace);
    this.scene.add(placeLabel('bias source', sourceX, boxY + 0.42, 0, '#fbbf24', 0.85));

    this.load = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16),
      metalMaterial(0xb45309, { metalness: 0.4, roughness: 0.5 }),
    );
    this.load.rotation.z = Math.PI / 2;
    this.load.position.set(loadX, boxY, 0);
    this.scene.add(this.load);
    this.scene.add(placeLabel('load R', loadX, boxY + 0.32, 0, '#fde68a', 0.85));

    const wireMat = metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.3 });
    this.scene.add(this._wireTube(
      new THREE.Vector3(sourceX + 0.3, boxY, 0),
      new THREE.Vector3(-CRYSTAL_W / 2, crystalY - CRYSTAL_H / 2 + 0.1, 0),
      wireMat,
    ));
    this.scene.add(this._wireTube(
      new THREE.Vector3(loadX - 0.3, boxY, 0),
      new THREE.Vector3(CRYSTAL_W / 2, crystalY - CRYSTAL_H / 2 + 0.1, 0),
      wireMat,
    ));

    // Live bias/regime label above the crystal
    this._biasLbl = placeLabel('bias = 0.60 V', 0, crystalY + CRYSTAL_H / 2 + 1.15, CRYSTAL_D / 2 + 0.3, '#eaf0fb', 1.05);
    this.scene.add(this._biasLbl);
  }

  _wireTube(from, to, mat) {
    const mid = from.clone().lerp(to, 0.5);
    mid.y -= 0.18;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    const geo = new THREE.TubeGeometry(curve, 16, 0.025, 8, false);
    return new THREE.Mesh(geo, mat);
  }

  _buildCarriers() {
    const holeGroup = new THREE.Group();
    const elGroup = new THREE.Group();
    this.scene.add(holeGroup, elGroup);
    for (let i = 0; i < N_HOLES; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.9 }),
      );
      attachGlow(m, 0xf87171, 0.16);
      m.userData.seed = i / N_HOLES;
      m.userData.lane = (((i * 0.618) % 1) - 0.5);
      m.userData.laneZ = ((((i + 2) * 0.381) % 1) - 0.5);
      holeGroup.add(m);
      this._holes.push(m);
    }
    for (let i = 0; i < N_ELECTRONS; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 }),
      );
      attachGlow(m, 0x60a5fa, 0.16);
      m.userData.seed = i / N_ELECTRONS;
      m.userData.lane = (((i * 0.437 + 0.2) % 1) - 0.5);
      m.userData.laneZ = ((((i + 5) * 0.291) % 1) - 0.5);
      elGroup.add(m);
      this._electrons.push(m);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.Vf != null) this.state.Vf = p.Vf;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.pMesh, this.nMesh, this.depletion].filter(Boolean);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this._alive = false;
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  _spawnFlash(pos) {
    if (this._flashes.length > 6) return;
    if (Math.random() > 0.1) return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.09, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.position.copy(pos);
    ring.lookAt(this.camera.position);
    ring.userData.life = 1;
    this.scene.add(ring);
    this._flashes.push(ring);
  }

  _tickFlashes(dt) {
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      const r = this._flashes[i];
      r.userData.life -= dt * 2.2;
      if (r.userData.life <= 0) {
        this.scene.remove(r);
        this._flashes.splice(i, 1);
        continue;
      }
      r.material.opacity = Math.max(0, r.userData.life) * 0.85;
      const s = 1 + (1 - r.userData.life) * 2.2;
      r.scale.set(s, s, s);
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;

      const Vbias = this.state.Vf;
      const df = depletionWidthFrac(Vbias);
      const cs = carrierState(Vbias);
      const depHalf = MAX_DEP_HALF * df;
      this.depletion.scale.x = depHalf / MAX_DEP_HALF;

      const halfW = CRYSTAL_W / 2;
      const speed = 0.35 + cs.strength * 1.1;

      // Carriers sit just in front of the crystal's front face (rather than
      // buried inside the opaque block) so they read as a visible
      // cross-section rather than being hidden by solid geometry.
      const carrierZ = CRYSTAL_D / 2 + 0.035;
      for (let i = 0; i < this._holes.length; i++) {
        const m = this._holes[i];
        const y = this._crystalY + m.userData.lane * (CRYSTAL_H * 0.7);
        const z = carrierZ + m.userData.laneZ * 0.05;
        let x;
        if (cs.diffusing) {
          const t = ((this.phase * speed) + m.userData.seed) % 1;
          const start = -halfW + 0.08;
          const end = depHalf * 0.5 + 0.05;
          x = start + (end - start) * t;
          if (t > 0.95) this._spawnFlash(new THREE.Vector3(end, y, z));
        } else {
          const wob = Math.sin(this.phase * 0.6 + m.userData.seed * 6.28);
          x = -halfW + 0.14 + wob * 0.03;
        }
        const visible = x < depHalf + 0.2;
        m.visible = visible;
        m.position.set(x, y, z);
      }
      for (let i = 0; i < this._electrons.length; i++) {
        const m = this._electrons[i];
        const y = this._crystalY + m.userData.lane * (CRYSTAL_H * 0.7);
        const z = carrierZ + m.userData.laneZ * 0.05;
        let x;
        if (cs.diffusing) {
          const t = ((this.phase * speed) + m.userData.seed) % 1;
          const start = halfW - 0.08;
          const end = -depHalf * 0.5 - 0.05;
          x = start - (start - end) * t;
          if (t > 0.95) this._spawnFlash(new THREE.Vector3(end, y, z));
        } else {
          const wob = Math.sin(this.phase * 0.6 + m.userData.seed * 6.28 + 1.7);
          x = halfW - 0.14 + wob * 0.03 + 0.15;
        }
        const visible = x > -depHalf - 0.2;
        m.visible = visible;
        m.position.set(x, y, z);
      }

      this._tickFlashes(dt);

      if (this._biasLbl && this._biasLbl.material && this._biasLbl.material.map) {
        this._labelTick = (this._labelTick || 0) + 1;
        if (this._labelTick % 8 === 0) {
          const cv = this._biasLbl.material.map.image;
          if (cv && cv.getContext) {
            const c2 = cv.getContext('2d');
            c2.clearRect(0, 0, cv.width, cv.height);
            c2.fillStyle = 'rgba(10,17,34,0.8)';
            c2.fillRect(4, 6, 376, 36);
            c2.fillStyle = '#eaf0fb';
            c2.font = '700 15px system-ui,sans-serif';
            c2.textAlign = 'center';
            c2.textBaseline = 'middle';
            const regime = cs.diffusing ? 'forward — diffusing' : 'reverse/blocked — leakage only';
            c2.fillText('bias = ' + Vbias.toFixed(2) + ' V (' + regime + ')', 192, 24);
            this._biasLbl.material.map.needsUpdate = true;
          }
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
