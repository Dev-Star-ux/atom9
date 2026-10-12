// Electrospray / electrospinning — 3D nozzle → Taylor cone → collector schematic.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { onsetVoltageKV, regime } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  placeLabel,
  glowSphere,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
  glassTube,
  glassMaterial,
} from '../common/sceneVisuals.js';

const NOZZLE_Y = 3.2;
const COLLECTOR_Y = -2.6;
const GAP = NOZZLE_Y - COLLECTOR_Y;
const MAX_PARTICLES = 36;
const BASE_Y = COLLECTOR_Y - 1.0; // lab-stand base plate, below the collector pedestal
const RESERVOIR_Y = NOZZLE_Y + 0.7; // reservoir center height (matches original layout)

export class ElectrosprayScene3D {
  constructor(container) {
    this.container = container;
    this.state = {
      voltageKV: 50,
      flowRateMlH: 1.0,
      surfaceTensionMNm: 72,
      viscosityMode: 'low',
      nozzleDistanceMm: 100,
      dropletRadiusUm: 5,
    };
    this.mode = 'dripping';
    this.paused = false;
    this._active = false;
    this._t = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(7.2, 3.0, 10.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.32, 0);
    addStudioLights(this.scene);

    this._particles = [];
    this._drops = [];
    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // --- Lab-stand base plate: a flat, rounded metal plate grounding the
    // whole rig. roundedBoxGeometry(w, h, depth, ...) already lies flat
    // (width along X, thin height along Y, depth along Z) — no rotation. ---
    const basePlate = new THREE.Mesh(
      roundedBoxGeometry(6.2, 0.14, 6.2, 0.12, 3),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    basePlate.position.set(0, BASE_Y, 0);
    this.scene.add(basePlate);

    // --- Collector pedestal: short metal column carrying the grounded
    // collector plate up from the base, so it reads as mounted hardware. ---
    const pedHeight = (COLLECTOR_Y - 0.06) - (BASE_Y + 0.07);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.34, pedHeight, 24),
      metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 }),
    );
    pedestal.position.set(0, BASE_Y + 0.07 + pedHeight / 2, 0);
    this.scene.add(pedestal);
    this.scene.add(contactShadow(2.0, 2.0, 0.42).translateY(BASE_Y + 0.075));

    // --- Retort-stand post + arm: an off-axis vertical rod rising from the
    // base plate, with a horizontal arm and clamp holding the reservoir —
    // so the nozzle/reservoir assembly reads as mounted, not floating. ---
    const standX = -2.6;
    const standMat = metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.28 });
    const postHeight = RESERVOIR_Y - (BASE_Y + 0.07);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, postHeight, 16),
      standMat,
    );
    post.position.set(standX, BASE_Y + 0.07 + postHeight / 2, 0);
    this.scene.add(post);
    const postFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20), standMat);
    postFoot.position.set(standX, BASE_Y + 0.1, 0);
    this.scene.add(postFoot);

    const armLen = standX * -1 - 0.55; // from post to the reservoir's edge
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, armLen, 12), standMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(standX + armLen / 2, RESERVOIR_Y, 0);
    this.scene.add(arm);
    const clamp = new THREE.Mesh(
      roundedBoxGeometry(0.2, 0.34, 0.22, 0.05, 2),
      metalMaterial(0x475569, { metalness: 0.75, roughness: 0.3 }),
    );
    clamp.position.set(-0.55, RESERVOIR_Y, 0);
    this.scene.add(clamp);

    // --- Reservoir + nozzle ---
    const reservoir = glassTube(0.55, 0.7, 0.22);
    reservoir.position.set(0, RESERVOIR_Y, 0);
    this.scene.add(reservoir);
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.45, 0.48, 20),
      glassMaterial(0x38bdf8, 0.55),
    );
    liquid.position.set(0, RESERVOIR_Y - 0.08, 0);
    this.scene.add(liquid);
    const reservoirCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.57, 0.57, 0.06, 20),
      metalMaterial(0x64748b, { metalness: 0.75, roughness: 0.3 }),
    );
    reservoirCap.position.set(0, RESERVOIR_Y + 0.36, 0);
    this.scene.add(reservoirCap);

    const nozzleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.9, 20),
      metalMaterial(0x64748b, { metalness: 0.55, roughness: 0.32 }),
    );
    nozzleBody.position.set(0, NOZZLE_Y, 0);
    this.scene.add(nozzleBody);
    this.nozzle = nozzleBody;
    tip(nozzleBody, 'Nozzle (high voltage)', 'The liquid meniscus is charged relative to the grounded collector below.');

    this.scene.add(placeLabel('nozzle', 1.1, NOZZLE_Y + 0.2, 0, '#94a3b8', 1.0));

    this.tipY = NOZZLE_Y - 0.45;

    // --- Taylor cone (scaled/shown only above onset) ---
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.4, roughness: 0.3 })
    );
    this.cone.position.set(0, this.tipY - 0.14, 0);
    this.scene.add(this.cone);
    tip(this.cone, 'Taylor cone', 'Above the onset voltage, electrostatic stress deforms the meniscus into a sharp cone that emits a charged jet.');
    this.coneLabel = placeLabel('Taylor cone', 0.9, this.tipY - 0.1, 0, '#7dd3fc', 1.0);
    this.scene.add(this.coneLabel);

    // --- Field-line arrows nozzle -> collector ---
    this.fieldArrows = new THREE.Group();
    this.scene.add(this.fieldArrows);
    const arrowOffsets = [
      [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3],
    ];
    for (let i = 0; i < arrowOffsets.length; i++) {
      const [ox, oz] = arrowOffsets[i];
      const grp = new THREE.Group();
      const shaftLen = GAP * 0.86;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, shaftLen, 6),
        new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.4 })
      );
      shaft.position.set(ox, NOZZLE_Y - 0.6 - shaftLen / 2, oz);
      grp.add(shaft);
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.16, 8),
        new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.55 })
      );
      head.rotation.x = Math.PI;
      head.position.set(ox, NOZZLE_Y - 0.6 - shaftLen, oz);
      grp.add(head);
      this.fieldArrows.add(grp);
    }

    // --- Grounded collector: metal plate with a bright rim so it reads as
    // a manufactured grounded electrode, not a flat color swatch. ---
    const collector = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.12, 40),
      metalMaterial(0x1e293b, { metalness: 0.55, roughness: 0.4 }),
    );
    collector.position.set(0, COLLECTOR_Y, 0);
    this.scene.add(collector);
    this.collector = collector;
    tip(collector, 'Grounded collector', 'Charged droplets or fiber deposit here; the grounded plate completes the electric circuit.');
    const collectorRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.03, 8, 56),
      metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.22 }),
    );
    collectorRim.rotation.x = Math.PI / 2;
    collectorRim.position.set(0, COLLECTOR_Y + 0.06, 0);
    this.scene.add(collectorRim);
    this.scene.add(placeLabel('grounded collector', 0, COLLECTOR_Y - 0.55, 0, '#f472b6', 1.15));

    // Deposit mat (fades in for spinning; scattered dots for spray)
    this._depositGroup = new THREE.Group();
    this._depositGroup.position.y = COLLECTOR_Y + 0.08;
    this.scene.add(this._depositGroup);

    // --- Whipping-jet tube (electrospinning) ---
    this._tubeCurvePts = 48;
    this._tubeMesh = null;
    this._tubeMaterial = new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.92 });
  }

  // ---- particle / jet lifecycle -------------------------------------

  _clearParticles() {
    for (let i = 0; i < this._particles.length; i++) {
      this.scene.remove(this._particles[i].mesh);
    }
    this._particles.length = 0;
    for (let i = 0; i < this._drops.length; i++) {
      this.scene.remove(this._drops[i].mesh);
    }
    this._drops.length = 0;
    if (this._tubeMesh) {
      this.scene.remove(this._tubeMesh);
      this._tubeMesh.geometry.dispose();
      this._tubeMesh = null;
    }
    while (this._depositGroup.children.length) {
      this._depositGroup.remove(this._depositGroup.children[0]);
    }
  }

  _spawnSprayParticle() {
    const mesh = glowSphere(0.055, 0xf472b6, {});
    mesh.position.set(0, this.tipY - 0.14, 0);
    this.scene.add(mesh);
    return {
      mesh,
      life: 0,
      seed: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spreadRate: 0.6 + Math.random() * 0.6,
    };
  }

  _spawnDrop() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.3 })
    );
    mesh.position.set(0, this.tipY - 0.2, 0);
    this.scene.add(mesh);
    return { mesh, life: 0 };
  }

  setParams(p) {
    if (!p) return;
    Object.assign(this.state, p);
    const onset = onsetVoltageKV(this.state.surfaceTensionMNm, 0.5, this.state.nozzleDistanceMm);
    const nextMode = regime(this.state.voltageKV, onset, this.state.viscosityMode);
    const modeChanged = nextMode !== this.mode;
    this.mode = nextMode;
    this._onsetKV = onset;

    // Taylor cone visibility / scale
    const active = this.mode !== 'dripping';
    this.cone.visible = active;
    this.coneLabel.visible = active;
    if (active) {
      const over = Math.max(0, this.state.voltageKV - onset);
      const scale = 1 + Math.min(1.4, over / Math.max(1, onset) * 1.6);
      this.cone.scale.set(scale, scale, scale);
    }

    if (modeChanged) this._clearParticles();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.nozzle, this.cone, this.collector].filter(Boolean);
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
    this._clearParticles();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  // ---- per-frame updates ---------------------------------------------

  _tickSpray(dt) {
    // Maintain a steady population, spreading radially as they fall
    // (approximating mutual Coulomb repulsion) and landing scattered.
    while (this._particles.length < MAX_PARTICLES) {
      this._particles.push(this._spawnSprayParticle());
    }
    const dropY = this.tipY - COLLECTOR_Y - 0.1;
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life += dt * (0.35 + p.spreadRate * 0.15);
      if (p.life >= 1) {
        // land: leave a scatter mark, recycle
        if (this._depositGroup.children.length < 60) {
          const dot = new THREE.Mesh(
            new THREE.CircleGeometry(0.03, 8),
            new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.55 })
          );
          dot.rotation.x = -Math.PI / 2;
          const r = p.spreadRate * 1.7 * (0.4 + Math.random() * 0.6);
          dot.position.set(Math.cos(p.angle) * r, 0.01, Math.sin(p.angle) * r);
          this._depositGroup.add(dot);
        }
        this.scene.remove(p.mesh);
        this._particles[i] = this._spawnSprayParticle();
        continue;
      }
      const y = this.tipY - 0.14 - p.life * dropY;
      const radial = p.spreadRate * 1.7 * (p.life * p.life);
      const x = Math.cos(p.angle) * radial;
      const z = Math.sin(p.angle) * radial;
      p.mesh.position.set(x, y, z);
    }
  }

  _tickSpinning(dt) {
    this._t += dt;
    const y0 = this.tipY - 0.1;
    const y1 = COLLECTOR_Y + 0.05;
    const pts = [];
    const n = this._tubeCurvePts;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const y = y0 - u * (y0 - y1);
      const growth = u * u;
      const radius = 0.05 + 0.75 * growth;
      const freq = 5 + u * 9;
      const wobble = this._t * 3.2;
      const x = Math.cos(freq * u + wobble) * radius;
      const z = Math.sin(freq * u * 1.3 + wobble * 1.4) * radius;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, n, 0.02, 6, false);
    if (this._tubeMesh) {
      this.scene.remove(this._tubeMesh);
      this._tubeMesh.geometry.dispose();
    }
    this._tubeMesh = new THREE.Mesh(geo, this._tubeMaterial);
    this.scene.add(this._tubeMesh);

    // deposited tangled fiber mat, redrawn occasionally
    if (this._depositGroup.children.length < 1 || Math.random() < 0.02) {
      while (this._depositGroup.children.length > 24) {
        this._depositGroup.remove(this._depositGroup.children[0]);
      }
      const matPts = [];
      const cx = (Math.random() - 0.5) * 0.9;
      const cz = (Math.random() - 0.5) * 0.9;
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        matPts.push(new THREE.Vector3(
          cx + Math.sin(u * 7 + this._t) * 0.35,
          0.01,
          cz + Math.cos(u * 6 + this._t * 1.2) * 0.35
        ));
      }
      const matCurve = new THREE.CatmullRomCurve3(matPts);
      const matGeo = new THREE.TubeGeometry(matCurve, 16, 0.008, 4, false);
      const matMesh = new THREE.Mesh(matGeo, new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.4 }));
      this._depositGroup.add(matMesh);
    }
  }

  _tickDripping(dt) {
    if (this._drops.length === 0 && Math.random() < 0.02) {
      this._drops.push(this._spawnDrop());
    }
    const dropY = this.tipY - COLLECTOR_Y - 0.1;
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i];
      d.life += dt * 0.4;
      if (d.life >= 1) {
        this.scene.remove(d.mesh);
        this._drops.splice(i, 1);
        continue;
      }
      d.mesh.position.y = this.tipY - 0.2 - d.life * dropY;
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    if (this._active && !this.paused) {
      const dt = 0.033;
      if (this.mode === 'spray') {
        if (this._tubeMesh) { this.scene.remove(this._tubeMesh); this._tubeMesh.geometry.dispose(); this._tubeMesh = null; }
        this._tickSpray(dt);
      } else if (this.mode === 'spinning') {
        for (let i = this._particles.length - 1; i >= 0; i--) {
          this.scene.remove(this._particles[i].mesh);
        }
        this._particles.length = 0;
        this._tickSpinning(dt);
      } else {
        if (this._tubeMesh) { this.scene.remove(this._tubeMesh); this._tubeMesh.geometry.dispose(); this._tubeMesh = null; }
        this._tickDripping(dt);
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
