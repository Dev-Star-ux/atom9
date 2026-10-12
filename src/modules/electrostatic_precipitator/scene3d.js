// Electrostatic precipitator — 3D duct schematic: corona wire, collector plates, drifting/charging dust.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fieldVm, driftVelocity, gasFlow, collectionEfficiency } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassMaterial,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const DUCT_LEN = 8; // world units along z (gas flow direction)
const N_PARTICLES = 24;
const MAX_PILE_PER_SIDE = 60;

export class PrecipitatorScene3D {
  constructor(container) {
    this.container = container;
    this.state = {
      voltageKV: 40,
      particleRadiusUm: 2,
      gasVelocityMs: 1.5,
      plateSpacingCm: 20,
      plateAreaM2: 4,
      ductCrossSectionM2: 0.5,
      fieldOn: true,
    };
    this.paused = false;
    this._active = false;
    this.phase = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(7.2, 4.6, 10);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.5, 0);
    addStudioLights(this.scene);

    this._plateGapWorld = 2.4; // updated by setParams
    this._particles = [];
    this._pileTop = [];
    this._pileBot = [];

    this._buildStage();
    this._buildParticles();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const FLOOR_Y = -2.6;
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    this.scene.add(floor);
    this._floorY = FLOOR_Y;

    const half = DUCT_LEN / 2;

    // --- Base plate: grounds the whole assembly as one installed unit
    // instead of plates floating in space. Flat plate: width along X,
    // thin height along Y, length along Z — NO extra rotation.
    const baseMat = metalMaterial(0x151b26, { metalness: 0.4, roughness: 0.6 });
    this.basePlate = new THREE.Mesh(
      roundedBoxGeometry(2.9, 0.14, DUCT_LEN + 1.0, 0.06, 3),
      baseMat
    );
    this.basePlate.position.y = FLOOR_Y + 0.07;
    this.scene.add(this.basePlate);
    const floorShadow = contactShadow(2.4, DUCT_LEN * 0.66, 0.4);
    floorShadow.position.set(0, FLOOR_Y + 0.005, 0);
    this.scene.add(floorShadow);

    // Support legs — 4 short metal posts connecting the duct housing to
    // the base plate; their height is re-tuned per plate gap in
    // _applyGeometry() so they always touch the underside of the unit.
    const legMat = metalMaterial(0x3a4658, { metalness: 0.75, roughness: 0.32 });
    const legRadius = 0.09;
    this._legs = [];
    const legX = [-0.95, 0.95];
    const legZ = [-half + 0.5, half - 0.5];
    for (const lx of legX) {
      for (const lz of legZ) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius * 1.15, 1, 14), legMat);
        leg.position.set(lx, 0, lz);
        this.scene.add(leg);
        this._legs.push(leg);
      }
    }

    // Duct enclosure (open-ended glass box) — half-length along z.
    this.duct = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, this._plateGapWorld, DUCT_LEN),
      glassMaterial(0x334155, 0.10)
    );
    this.scene.add(this.duct);

    // End frames — thin metal rectangles outlining each duct opening so
    // the duct reads as a real enclosure rather than two bare planes.
    const frameMat = metalMaterial(0x475569, { metalness: 0.7, roughness: 0.3 });
    this._endFrames = [];
    for (const fz of [-half, half]) {
      const frame = new THREE.Group();
      frame.position.z = fz;
      frame.userData.mat = frameMat;
      this.scene.add(frame);
      this._endFrames.push(frame);
    }

    // Top / bottom collector plates — brushed-steel look.
    const plateMat = metalMaterial(0x8b95a5, { metalness: 0.8, roughness: 0.28 });
    this.plateTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, DUCT_LEN + 0.2), plateMat);
    this.plateBot = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, DUCT_LEN + 0.2), plateMat.clone());
    this.scene.add(this.plateTop, this.plateBot);
    tip(this.plateTop, 'Collector plate', 'Grounded plate — collects charged dust that drifts across the field.');
    tip(this.plateBot, 'Collector plate', 'Grounded plate — collects charged dust that drifts across the field.');

    this.scene.add(placeLabel('collector plate', 0, 0, half + 1.1, '#cbd5e1', 1.05));
    this.scene.add(placeLabel('gas flow →', 0, 0, -half - 1.15, '#7dd3fc', 1.0));

    // Corona wire along duct's center axis — brushed metal with a warm glow.
    this.wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, DUCT_LEN, 12),
      metalMaterial(0xfbbf24, { metalness: 0.4, roughness: 0.25, emissive: 0x92700a, emissiveIntensity: 0.6 })
    );
    this.wire.rotation.x = Math.PI / 2;
    this.scene.add(this.wire);
    this._wireGlow = attachGlow(this.wire, 0xfbbf24, 1.1);
    tip(this.wire, 'Corona wire (HV)', 'Ionizes the gas and charges dust particles that pass near it.');
    this.scene.add(placeLabel('corona wire', 0, 0.35, -half + 0.6, '#fde68a', 0.95));

    // Small mounting brackets holding the wire at each end.
    const bracketMat = metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 });
    this._brackets = [];
    for (const bz of [-half + 0.15, half - 0.15]) {
      const bracket = new THREE.Mesh(roundedBoxGeometry(0.16, 0.16, 0.1, 0.03, 2), bracketMat);
      bracket.position.set(0, 0, bz);
      this.scene.add(bracket);
      this._brackets.push(bracket);
    }

    this._pileGroupTop = new THREE.Group();
    this._pileGroupBot = new THREE.Group();
    this.scene.add(this._pileGroupTop, this._pileGroupBot);

    this._applyGeometry();
  }

  _buildParticles() {
    const group = new THREE.Group();
    this.scene.add(group);
    for (let i = 0; i < N_PARTICLES; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      const seed = i * 0.6180339887;
      mesh.userData.seed = seed;
      mesh.userData.lane = ((seed * 997) % 1) * 2 - 1; // -1..1 toward top or bottom
      group.add(mesh);
      this._particles.push(mesh);
    }
    this._particleGroup = group;
  }

  _buildFrameBars(frameGroup, width, height) {
    while (frameGroup.children.length) {
      const c = frameGroup.children.pop();
      c.geometry.dispose();
      frameGroup.remove(c);
    }
    const thick = 0.07;
    const mat = frameGroup.userData.mat;
    const hw = width / 2;
    const hh = height / 2;
    const topBar = new THREE.Mesh(roundedBoxGeometry(width + thick, thick, thick, 0.02, 2), mat);
    topBar.position.y = hh;
    const botBar = topBar.clone();
    botBar.position.y = -hh;
    const leftBar = new THREE.Mesh(roundedBoxGeometry(thick, height + thick, thick, 0.02, 2), mat);
    leftBar.position.x = -hw;
    const rightBar = leftBar.clone();
    rightBar.position.x = hw;
    frameGroup.add(topBar, botBar, leftBar, rightBar);
  }

  _applyGeometry() {
    const s = this.state;
    const gap = Math.min(3.2, Math.max(1.0, s.plateSpacingCm / 100 * 6)); // world-scale mapping
    this._plateGapWorld = gap;
    if (this.duct) {
      this.duct.geometry.dispose();
      this.duct.geometry = new THREE.BoxGeometry(2.2, gap, DUCT_LEN);
    }
    const half = gap / 2;
    if (this.plateTop) this.plateTop.position.y = half + 0.04;
    if (this.plateBot) this.plateBot.position.y = -half - 0.04;
    this._halfGap = half;

    // Re-tune support legs so they always span from the base plate up to
    // the underside of the bottom collector plate — no floating gap.
    if (this._legs && this._legs.length) {
      const legTopY = -half - 0.04;
      const legBotY = this._floorY + 0.14;
      const legLen = Math.max(0.05, legTopY - legBotY);
      for (const leg of this._legs) {
        leg.scale.y = legLen;
        leg.position.y = legBotY + legLen / 2;
      }
    }

    // Rebuild the metal end-frames to match the current duct cross-section.
    if (this._endFrames) {
      for (const frame of this._endFrames) {
        this._buildFrameBars(frame, 2.2, gap);
      }
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.voltageKV != null) this.state.voltageKV = p.voltageKV;
    if (p.particleRadiusUm != null) this.state.particleRadiusUm = p.particleRadiusUm;
    if (p.gasVelocityMs != null) this.state.gasVelocityMs = p.gasVelocityMs;
    if (p.plateSpacingCm != null) this.state.plateSpacingCm = p.plateSpacingCm;
    if (p.plateAreaM2 != null) this.state.plateAreaM2 = p.plateAreaM2;
    if (p.ductCrossSectionM2 != null) this.state.ductCrossSectionM2 = p.ductCrossSectionM2;
    if (p.fieldOn != null) this.state.fieldOn = p.fieldOn;
    this._applyGeometry();

    const s = this.state;
    const fieldOn = s.fieldOn !== false;
    const w = fieldOn ? driftVelocity(s.voltageKV, s.plateSpacingCm, s.particleRadiusUm) : 0;
    this._driftScale = fieldOn ? Math.min(1, w * 40) : 0;
    this._speedScale = 0.05 + s.gasVelocityMs * 0.04;
    this._fieldOn = fieldOn;

    const E = fieldOn ? fieldVm(s.voltageKV, s.plateSpacingCm) : 0;
    const glowStrength = fieldOn ? Math.min(2.2, 0.5 + E / 200000) : 0;
    if (this.wire) {
      this.wire.material.emissiveIntensity = glowStrength;
      this.wire.material.color.set(fieldOn ? 0xfbbf24 : 0x64748b);
    }
  }

  /** Clears accumulated dust piles and recycles particles — wired to the
   *  viewport's "Reset" button. */
  reset() {
    const clearPile = (group, arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const g = arr[i];
        group.remove(g);
        g.geometry.dispose();
        g.material.dispose();
      }
      arr.length = 0;
    };
    if (this._pileGroupTop) clearPile(this._pileGroupTop, this._pileTop);
    if (this._pileGroupBot) clearPile(this._pileGroupBot, this._pileBot);
    for (let i = 0; i < this._particles.length; i++) {
      this._particles[i].userData.seed = Math.random();
      this._particles[i].visible = true;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.wire, this.plateTop, this.plateBot].filter(Boolean);
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

  _depositPile(group, pileArr, x, sign) {
    if (pileArr.length >= MAX_PILE_PER_SIDE) {
      const old = pileArr.shift();
      group.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
    const grain = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 })
    );
    const jitter = (Math.random() - 0.5) * 0.12;
    const bump = sign * (0.02 + Math.random() * 0.05);
    grain.position.set(jitter, bump, x);
    group.add(grain);
    pileArr.push(grain);
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;

      // Corona pulse — subtle glow flicker to depict ionization (base intensity set in setParams).
      if (this._wireGlow) {
        if (this._fieldOn === false) {
          this._wireGlow.material.opacity = 0;
        } else {
          this._wirePulseT = (this._wirePulseT || 0) + dt * 6;
          const pulse = 1 + 0.25 * Math.sin(this._wirePulseT);
          this._wireGlow.material.opacity = 0.45 * pulse;
        }
      }

      const half = DUCT_LEN / 2;
      const speedScale = this._speedScale != null ? this._speedScale : 0.08;
      const driftScale = this._driftScale != null ? this._driftScale : 0.3;
      const chargeT = 0.09;

      for (let i = 0; i < this._particles.length; i++) {
        const m = this._particles[i];
        const seed = m.userData.seed;
        const t = (this.phase * speedScale + seed) % 1;
        const z = -half + DUCT_LEN * t;
        const lane = m.userData.lane;
        const towardSign = lane >= 0 ? 1 : -1;
        const curve = towardSign * driftScale * Math.pow(t, 1.3) * (this._halfGap - 0.05);
        let y = lane * (this._halfGap - 0.08) * (1 - 0.55 * t) + curve;
        const reachedTop = y >= this._halfGap - 0.06;
        const reachedBot = y <= -(this._halfGap - 0.06);

        if (reachedTop || reachedBot) {
          if (reachedTop) this._depositPile(this._pileGroupTop, this._pileTop, z, 1);
          else this._depositPile(this._pileGroupBot, this._pileBot, z, -1);
          // recycle particle to a fresh random phase offset so it re-enters
          m.userData.seed = Math.random();
          m.visible = false;
          continue;
        }
        m.visible = true;
        y = Math.min(this._halfGap - 0.06, Math.max(-(this._halfGap - 0.06), y));
        m.position.set(0, y, z);

        const charged = this._fieldOn !== false && t >= chargeT;
        const justCharged = charged && t < chargeT + 0.02;
        if (justCharged) {
          m.material.color.setHex(0xfde047);
          m.scale.setScalar(1.6);
        } else if (charged) {
          m.material.color.setHex(0x38bdf8);
          m.scale.setScalar(1.0);
        } else {
          m.material.color.setHex(0x94a3b8);
          m.scale.setScalar(1.0);
        }
      }

      // Re-position pile grains so tops/bottoms track current plate gap.
      this._pileGroupTop.position.y = this._halfGap - 0.02;
      this._pileGroupBot.position.y = -(this._halfGap - 0.02);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
