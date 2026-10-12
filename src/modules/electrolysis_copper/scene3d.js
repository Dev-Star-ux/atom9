// Copper sulfate electrolysis — 3D cell: beaker, electrodes, drifting Cu2+ ions,
// a growing copper deposit on the cathode and a shrinking (dissolving) anode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { massDepositedGrams, F_CONST, Z_CU, M_CU } from './physics.js';
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

// Same convention as scene2d.js: elapsed "clock" runs faster than wall time so
// the deposit visibly grows and loops within [0, t].
const RATE_S_PER_PHASE = 40;
const N_IONS = 16;
const BASE_PLATE_W = 0.34;
const MAX_DEPOSIT_W = 0.5; // extra half-thickness at full target-time deposit
const MAX_ANODE_SHRINK = 0.55; // fraction of BASE_PLATE_W the anode can lose

export class ElectrolysisScene3D {
  constructor(container) {
    this.container = container;
    this.state = { I: 0.5, t: 600 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._labelTick = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(5.4, 3.7, 7.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.55, -0.35);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.4);

    this._ions = [];
    this._buildStage();
    this._buildIons();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.42;
    this.scene.add(floor);

    // --- Lab bench: flat metal base plate grounding the beaker and the
    // supply block as one benchtop setup. Plain box, no extra rotation —
    // width along X, thin height along Y, depth along Z, as-is. ---
    const benchW = 4.6;
    const benchD = 4.7;
    const benchH = 0.16;
    const benchZ = -0.33;
    const benchTopY = -1.9;
    this.bench = new THREE.Mesh(
      new THREE.BoxGeometry(benchW, benchH, benchD),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    this.bench.position.set(0, benchTopY - benchH / 2, benchZ);
    this.scene.add(this.bench);
    const benchEdge = new THREE.Mesh(
      new THREE.BoxGeometry(benchW + 0.04, 0.02, benchD + 0.04),
      metalMaterial(0x475569, { metalness: 0.8, roughness: 0.3 }),
    );
    benchEdge.position.set(0, benchTopY - 0.005, benchZ);
    this.scene.add(benchEdge);

    // --- Beaker: open-top glass cylinder resting on the bench ---
    const beakerR = 1.5;
    const beakerH = 2.1;
    this.beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(beakerR, beakerR * 0.94, beakerH, 40, 1, true),
      glassMaterial(0x94a3b8, 0.16)
    );
    this.beaker.position.set(0, benchTopY + beakerH / 2, 0.35);
    this.scene.add(this.beaker);
    this._beakerBottomY = this.beaker.position.y - beakerH / 2;
    this._beakerTopY = this.beaker.position.y + beakerH / 2;
    this._beakerZ = this.beaker.position.z;
    const beakerShadow = contactShadow(beakerR * 1.15, beakerR * 1.05, 0.5);
    beakerShadow.position.set(0, benchTopY + 0.006, this._beakerZ);
    this.scene.add(beakerShadow);

    // --- CuSO4 liquid: blue-tinted transparent cylinder filling most of the beaker ---
    const liquidH = beakerH * 0.8;
    const liquidR = beakerR * 0.93;
    this.liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(liquidR, liquidR * 0.95, liquidH, 40),
      glassMaterial(0x2563eb, 0.38)
    );
    this.liquid.position.set(0, this._beakerBottomY + liquidH / 2 + 0.03, this._beakerZ);
    this.scene.add(this.liquid);
    this._liquidTopY = this.liquid.position.y + liquidH / 2;
    this._liquidBottomY = this.liquid.position.y - liquidH / 2 + 0.05;
    this.scene.add(placeLabel('CuSO₄ (aq)', 0, this._liquidTopY + 0.15, this._beakerZ + beakerR * 0.55, '#93c5fd', 0.9));

    // --- Electrode plates dipping into the liquid from opposite sides ---
    const plateH = liquidH * 0.86;
    const plateD = 0.7;
    const plateY = this._liquidBottomY + plateH / 2 + 0.06;
    this._plateY = plateY;
    this._plateH = plateH;
    this._plateD = plateD;
    const spanX = beakerR * 0.62;
    const z = this._beakerZ;

    // Real copper metal for the electrodes: high metalness, moderate
    // roughness so they read as bright metal, not flat orange plastic.
    const copperMat = metalMaterial(0xb87333, { metalness: 0.85, roughness: 0.32 });
    const anodeMat = metalMaterial(0xa8622a, { metalness: 0.78, roughness: 0.4 });

    // Cathode (−, left): copper deposits and grows here.
    this.cathode = new THREE.Mesh(new THREE.BoxGeometry(BASE_PLATE_W, plateH, plateD), copperMat);
    this.cathode.position.set(-spanX, plateY, z);
    this.scene.add(this.cathode);
    tip(this.cathode, 'Cathode (−)', 'Cu²⁺ + 2e⁻ → Cu — copper ions are reduced and plate out here.');

    // Deposit shell — thin box on the liquid-facing side of the cathode, grows over time.
    this.deposit = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, plateH, plateD),
      metalMaterial(0xd97a3d, { metalness: 0.9, roughness: 0.24 })
    );
    this.deposit.position.set(-spanX + BASE_PLATE_W / 2 + 0.01, plateY, z);
    this.scene.add(this.deposit);

    // Anode (+, right): copper dissolves here (visible shrink over time).
    this.anode = new THREE.Mesh(new THREE.BoxGeometry(BASE_PLATE_W, plateH, plateD), anodeMat);
    this.anode.position.set(spanX, plateY, z);
    this.scene.add(this.anode);
    tip(this.anode, 'Anode (+)', 'Cu → Cu²⁺ + 2e⁻ — copper metal dissolves into solution here.');

    this._spanX = spanX;

    // --- DC supply: a rounded housing sitting on the bench behind the
    // beaker, with wires curving up from each electrode to its terminals. ---
    const supplyW = 1.3;
    const supplyH = 0.55;
    const supplyD = 0.6;
    const supplyX = 0;
    const supplyZ = z - beakerR - 1.05;
    const supplyY = benchTopY + supplyH / 2;
    const supply = new THREE.Mesh(
      roundedBoxGeometry(supplyW, supplyH, supplyD, 0.06, 3),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    supply.position.set(supplyX, supplyY, supplyZ);
    this.scene.add(supply);
    const supplyFace = new THREE.Mesh(
      new THREE.PlaneGeometry(supplyW * 0.72, supplyH * 0.42),
      new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xf59e0b, emissiveIntensity: 0.35, roughness: 0.4 }),
    );
    supplyFace.position.set(supplyX, supplyY + 0.02, supplyZ + supplyD / 2 + 0.005);
    this.scene.add(supplyFace);
    const supplyShadow = contactShadow(supplyW * 0.75, supplyD * 0.75, 0.4);
    supplyShadow.position.set(supplyX, benchTopY + 0.006, supplyZ);
    this.scene.add(supplyShadow);
    this.scene.add(placeLabel('DC supply', supplyX, supplyY + supplyH / 2 + 0.28, supplyZ, '#fbbf24', 0.9));

    const wireMat = metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.3 });
    const negTerm = new THREE.Vector3(supplyX - supplyW * 0.28, supplyY + supplyH / 2, supplyZ);
    const posTerm = new THREE.Vector3(supplyX + supplyW * 0.28, supplyY + supplyH / 2, supplyZ);
    this.cathodeWire = this._makeWireTube(
      new THREE.Vector3(-spanX, plateY + plateH / 2, z),
      negTerm,
      wireMat,
    );
    this.anodeWire = this._makeWireTube(
      new THREE.Vector3(spanX, plateY + plateH / 2, z),
      posTerm,
      wireMat,
    );
    this.scene.add(this.cathodeWire, this.anodeWire);

    // Polarity + reaction labels next to each electrode.
    this.scene.add(placeLabel('cathode (Cu²⁺ + 2e⁻ → Cu)', -spanX, plateY + plateH / 2 + 0.35, z + plateD / 2 + 0.3, '#fdba74', 1.1));
    this.scene.add(placeLabel('anode (Cu → Cu²⁺ + 2e⁻)', spanX, plateY + plateH / 2 + 0.35, z + plateD / 2 + 0.3, '#fca5a5', 1.1));

    // Live mass-deposited label.
    this._massLbl = placeLabel('mass deposited = 0.0000 g', 0, this._beakerTopY + 0.35, z + beakerR + 0.2, '#fde68a', 1.2);
    this.scene.add(this._massLbl);
  }

  _makeWireTube(from, to, mat) {
    // A gently arcing wire (rather than a straight rigid rod) so the bench
    // reads as a wired circuit rather than skewers stuck in the beaker.
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.55;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    const geo = new THREE.TubeGeometry(curve, 20, 0.035, 8, false);
    return new THREE.Mesh(geo, mat);
  }

  _buildIons() {
    const group = new THREE.Group();
    this.scene.add(group);
    for (let i = 0; i < N_IONS; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85 })
      );
      attachGlow(mesh, 0x60a5fa, 0.22);
      mesh.userData.seed = i / N_IONS;
      mesh.userData.laneY = (((i * 0.618) % 1) - 0.5);
      mesh.userData.laneZ = ((((i + 3) * 0.427) % 1) - 0.5);
      group.add(mesh);
      this._ions.push(mesh);
    }
    this._ionGroup = group;
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.state.I = p.I;
    if (p.t != null) this.state.t = p.t;
    this._ionSpeed = 0.12 + Math.min(1.2, this.state.I) * 0.22;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.cathode, this.anode].filter(Boolean);
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

  _elapsedS() {
    const tMax = Math.max(1, this.state.t);
    return (this.phase * RATE_S_PER_PHASE) % tMax;
  }

  _updateDepositAndLabel(elapsed) {
    const tMax = Math.max(1, this.state.t);
    const growFrac = Math.min(1, elapsed / tMax);
    const massG = massDepositedGrams(this.state.I, elapsed, M_CU, Z_CU, F_CONST);

    // Deposit shell thickens on the cathode's liquid-facing side.
    const depositW = 0.02 + MAX_DEPOSIT_W * growFrac;
    this.deposit.scale.x = depositW / 0.02;
    this.deposit.position.x = -this._spanX + BASE_PLATE_W / 2 + depositW / 2;

    // Anode visibly thins (dissolves).
    const shrink = MAX_ANODE_SHRINK * BASE_PLATE_W * growFrac;
    const anodeW = Math.max(0.06, BASE_PLATE_W - shrink);
    this.anode.scale.x = anodeW / BASE_PLATE_W;

    this._labelTick++;
    if (this._massLbl && this._massLbl.material && this._massLbl.material.map && this._labelTick % 6 === 0) {
      const cv = this._massLbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.8)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 16px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('mass deposited ≈ ' + massG.toFixed(4) + ' g', 192, 24);
        this._massLbl.material.map.needsUpdate = true;
      }
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;
      const elapsed = this._elapsedS();
      this._updateDepositAndLabel(elapsed);

      const speed = this._ionSpeed != null ? this._ionSpeed : 0.15;
      const yMin = this._liquidBottomY + 0.15;
      const yMax = this._liquidTopY - 0.15;
      const zHalf = this._plateD / 2 - 0.1;
      for (let i = 0; i < this._ions.length; i++) {
        const ion = this._ions[i];
        const seed = ion.userData.seed;
        const tt = (this.phase * speed + seed) % 1;
        // Drift from anode (x=+spanX) toward cathode (x=-spanX).
        const x = this._spanX - (this._spanX * 2) * tt;
        const y = yMin + ((ion.userData.laneY + 0.5) * (yMax - yMin));
        const z = this._beakerZ + ion.userData.laneZ * zHalf * 2;
        ion.position.set(x, y, z);
        const fade = Math.min(1, Math.min(tt, 1 - tt) * 6);
        ion.material.opacity = 0.35 + 0.55 * fade;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
