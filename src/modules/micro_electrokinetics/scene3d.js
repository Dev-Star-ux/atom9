// Micro-electrokinetics — 3D microchannel schematic: electrophoresis / electroosmosis / dielectrophoresis.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  getMode,
  smoluchowskiVelocity,
  WATER_VISCOSITY_PAS,
} from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  glassMaterial,
  glowSphere,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const CHANNEL_LEN = 6.2;
const CHANNEL_W = 1.6;
const CHANNEL_H = 1.4;
const HALF_LEN = CHANNEL_LEN / 2 - 0.3;

function wrap(x, half) {
  const full = half * 2;
  let v = (x + half) % full;
  if (v < 0) v += full;
  return v - half;
}

export class MicroEK3D {
  constructor(container) {
    this.container = container;
    this.state = {
      mode: 'electrophoresis',
      fieldVm: 1e5,
      zetaMv: -50,
      particleRadiusUm: 1,
      epsR: 78,
      cmFactor: 0.3,
    };
    this._builtMode = null;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(5.8, 3.1, 7.7);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.1, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -1.7);

    this._buildStatic();
    this._modeGroup = null;
    this._movers = [];
    this._rebuildMode();

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStatic() {
    // Lab-bench base plate: grounds the microfluidic chip + electrodes as
    // one benchtop assembly instead of parts floating in space. Plain flat
    // plate — width along X, thin along Y, length along Z — NO extra
    // rotation (roundedBoxGeometry already orients that way).
    const plateW = (HALF_LEN + 0.32) * 2;
    const plateD = CHANNEL_W + 1.0;
    const plateY = -CHANNEL_H / 2 - 0.16;
    const basePlate = new THREE.Mesh(
      roundedBoxGeometry(plateW, 0.16, plateD, 0.05, 3),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    basePlate.position.set(0, plateY, 0);
    this.scene.add(basePlate);
    const railMat = metalMaterial(0x475569, { metalness: 0.75, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(plateW - 0.1, 0.03, 0.04), railMat);
      rail.position.set(0, plateY + 0.1, side * (plateD / 2 - 0.06));
      this.scene.add(rail);
    }
    this.scene.add(contactShadow(plateW * 0.62, plateD * 0.7, 0.4).translateY(-1.68));

    // Microfluidic chip: glass channel body plus a thin metal edge frame so
    // it reads as a manufactured chip rather than a bare transparent box.
    this.channel = new THREE.Mesh(
      new THREE.BoxGeometry(CHANNEL_LEN, CHANNEL_H, CHANNEL_W),
      glassMaterial(0x334155, 0.16)
    );
    this.scene.add(this.channel);

    const frameMat = metalMaterial(0x64748b, { metalness: 0.8, roughness: 0.28 });
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(CHANNEL_LEN + 0.04, 0.035, 0.035), frameMat);
        edge.position.set(0, ySign * (CHANNEL_H / 2), zSign * (CHANNEL_W / 2));
        this.scene.add(edge);
      }
    }
    for (const xSign of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.04, CHANNEL_H + 0.04, CHANNEL_W + 0.04), frameMat);
      cap.position.set(xSign * (CHANNEL_LEN / 2), 0, 0);
      this.scene.add(cap);
    }

    this.scene.add(placeLabel('channel', 0, -CHANNEL_H / 2 - 0.4, CHANNEL_W / 2 + 0.3, '#94a3b8', 0.9));

    this._modeLbl = placeLabel('Electrophoresis', 0, CHANNEL_H / 2 + 0.9, 0, '#7dd3fc', 1.05);
    this.scene.add(this._modeLbl);
  }

  _redrawLabel(sprite, text, color) {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    const cv = sprite.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = color || '#7dd3fc';
    ctx.font = '600 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 24);
    sprite.material.map.needsUpdate = true;
  }

  _addElectrodePlates(group) {
    const plateGeo = roundedBoxGeometry(0.24, CHANNEL_H + 0.3, CHANNEL_W + 0.3, 0.03, 2);
    const pos = new THREE.Mesh(plateGeo, metalMaterial(0xf87171, { metalness: 0.75, roughness: 0.3 }));
    pos.position.set(-HALF_LEN - 0.2, 0, 0);
    group.add(pos);
    const neg = new THREE.Mesh(plateGeo, metalMaterial(0x60a5fa, { metalness: 0.75, roughness: 0.3 }));
    neg.position.set(HALF_LEN + 0.2, 0, 0);
    group.add(neg);
    group.add(placeLabel('electrode (+)', -HALF_LEN - 0.2, CHANNEL_H / 2 + 0.4, 0, '#fca5a5', 0.85));
    group.add(placeLabel('electrode (−)', HALF_LEN + 0.2, CHANNEL_H / 2 + 0.4, 0, '#93c5fd', 0.85));
    tip(pos, 'Anode (+)', 'Drives the electric field through the channel. Charged species and the electric double layer respond to this field.');
    tip(neg, 'Cathode (−)', 'The field points from + to − through the fluid; charged particles and surface ions respond accordingly.');
    return { pos, neg };
  }

  _clearModeGroup() {
    if (this._modeGroup) {
      this.scene.remove(this._modeGroup);
      this._modeGroup.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
          else o.material.dispose();
        }
      });
    }
    this._modeGroup = new THREE.Group();
    this.scene.add(this._modeGroup);
    this._movers = [];
    this._particle = null;
  }

  _rebuildMode() {
    this._clearModeGroup();
    const mode = this.state.mode;
    this._builtMode = mode;
    if (mode === 'electrophoresis') this._buildElectrophoresis();
    else if (mode === 'electroosmosis') this._buildElectroosmosis();
    else this._buildDEP();
    const m = getMode(mode);
    this._redrawLabel(this._modeLbl, m.name, '#7dd3fc');
  }

  _buildElectrophoresis() {
    const g = this._modeGroup;
    this._addElectrodePlates(g);
    const charged = this.state.zetaMv >= 0;
    const color = charged ? 0xfbbf24 : 0x67e8f9;
    const particle = glowSphere(0.22, color, { pick: true });
    particle.position.set(-HALF_LEN * 0.6, 0, 0);
    g.add(particle);
    tip(particle, 'Charged particle', 'Electrophoresis: the field exerts a direct electrostatic force on the particle’s own charge, so it drifts through fluid that itself stays still.');
    this._particle = particle;
  }

  _buildElectroosmosis() {
    const g = this._modeGroup;
    this._addElectrodePlates(g);

    // Flow markers: small arrows spanning the channel's cross-section (y,z),
    // all moving at the same uniform speed along x — the "plug flow" signature.
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x14532d, emissiveIntensity: 0.35, roughness: 0.5 });
    const rows = [-0.35, 0, 0.35];
    const cols = [-0.4, 0, 0.4];
    const nX = 5;
    const movers = [];
    for (let xi = 0; xi < nX; xi++) {
      for (let ri = 0; ri < rows.length; ri++) {
        for (let ci = 0; ci < cols.length; ci++) {
          const arrow = new THREE.Group();
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), arrowMat);
          shaft.rotation.z = Math.PI / 2;
          arrow.add(shaft);
          const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), arrowMat);
          head.rotation.z = -Math.PI / 2;
          head.position.x = 0.24;
          arrow.add(head);
          arrow.position.set(0, rows[ri], cols[ci]);
          arrow.userData.baseX = -HALF_LEN + (xi / nX) * (HALF_LEN * 2);
          g.add(arrow);
          movers.push(arrow);
        }
      }
    }
    this._movers = movers;
    tip(movers[0], 'Uniform plug flow', 'Electroosmosis: the field acts on ions in the thin double layer at the walls, dragging the bulk fluid at the SAME speed everywhere across the channel — unlike parabolic pressure-driven flow.');

    const particle = glowSphere(0.16, 0xe2e8f0, { pick: true });
    particle.position.set(-HALF_LEN * 0.4, 0.1, 0.1);
    g.add(particle);
    tip(particle, 'Neutral particle', 'Carried passively by the moving fluid — it has no net charge of its own, so it simply rides along with the plug flow.');
    this._particle = particle;
  }

  _buildDEP() {
    const g = this._modeGroup;
    const gapHalf = 0.42;
    const wedgeMat1 = metalMaterial(0xf87171, { metalness: 0.75, roughness: 0.3 });
    const wedgeMat2 = metalMaterial(0x60a5fa, { metalness: 0.75, roughness: 0.3 });
    const wedgeGeo = new THREE.ConeGeometry(0.75, HALF_LEN * 1.5, 4, 1);

    const wedgeA = new THREE.Mesh(wedgeGeo, wedgeMat1);
    wedgeA.rotation.z = Math.PI / 2;
    wedgeA.rotation.y = Math.PI / 4;
    wedgeA.position.set(-gapHalf - HALF_LEN * 0.75, 0, 0);
    g.add(wedgeA);

    const wedgeB = new THREE.Mesh(wedgeGeo, wedgeMat2);
    wedgeB.rotation.z = -Math.PI / 2;
    wedgeB.rotation.y = Math.PI / 4;
    wedgeB.position.set(gapHalf + HALF_LEN * 0.75, 0, 0);
    g.add(wedgeB);

    tip(wedgeA, 'Electrode (narrowed gap)', 'The tapered electrode pair concentrates field lines at the gap, creating a strong field GRADIENT — the source of dielectrophoretic force.');
    tip(wedgeB, 'Electrode (narrowed gap)', 'Together with its partner, this electrode shapes a non-uniform field: strongest right at the gap, weaker away from it.');

    g.add(placeLabel('non-uniform field (gap)', 0, CHANNEL_H / 2 + 0.35, 0, '#c4b5fd', 0.95));

    const positive = this.state.cmFactor >= 0;
    const color = positive ? 0x4ade80 : 0xf87171;
    const particle = glowSphere(0.2, color, { pick: true });
    particle.position.set(-HALF_LEN * 0.55, 0, 0);
    g.add(particle);
    tip(particle, 'Neutral particle (DEP)', 'Dielectrophoresis: the particle carries no net charge, but the field GRADIENT polarizes it and pushes it — toward the gap for positive DEP (green), away for negative DEP (red).');
    this._particle = particle;
  }

  setParams(p) {
    if (!p) return;
    if (p.fieldVm != null) this.state.fieldVm = p.fieldVm;
    if (p.zetaMv != null) this.state.zetaMv = p.zetaMv;
    if (p.particleRadiusUm != null) this.state.particleRadiusUm = p.particleRadiusUm;
    if (p.epsR != null) this.state.epsR = p.epsR;
    if (p.cmFactor != null) this.state.cmFactor = p.cmFactor;
    const modeChanged = p.mode != null && p.mode !== this.state.mode;
    if (p.mode != null) this.state.mode = p.mode;

    if (modeChanged || this._builtMode !== this.state.mode) {
      this._rebuildMode();
      return;
    }
    this._refreshColors();
  }

  _refreshColors() {
    if (!this._particle) return;
    const mode = this.state.mode;
    if (mode === 'electrophoresis') {
      const charged = this.state.zetaMv >= 0;
      this._particle.material.color.set(charged ? 0xfbbf24 : 0x67e8f9);
    } else if (mode === 'dielectrophoresis') {
      const positive = this.state.cmFactor >= 0;
      this._particle.material.color.set(positive ? 0x4ade80 : 0xf87171);
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips;
  }

  getPickables() {
    const list = [];
    if (this._particle) list.push(this._particle);
    if (this._modeGroup) {
      this._modeGroup.children.forEach(function (c) {
        if (c.userData && c.userData.sceneTip) list.push(c);
      });
    }
    return list;
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

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    if (this._active && !this.paused) {
      this.phase += 0.016;
      this._tickMode();
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _tickMode() {
    const mode = this.state.mode;
    if (mode === 'electrophoresis' && this._particle) {
      const v = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
      const dir = this.state.zetaMv >= 0 ? 1 : -1;
      const speed = Math.min(2.2, Math.abs(v) * 4e2 + 0.15);
      const x = wrap(this._particle.position.x + dir * speed * 0.016, HALF_LEN);
      this._particle.position.x = x;
    } else if (mode === 'electroosmosis') {
      const v = smoluchowskiVelocity(this.state.epsR, this.state.zetaMv, this.state.fieldVm, WATER_VISCOSITY_PAS);
      const dir = this.state.zetaMv >= 0 ? -1 : 1;
      const speed = Math.min(2.2, Math.abs(v) * 4e2 + 0.15);
      const step = dir * speed * 0.016;
      for (let i = 0; i < this._movers.length; i++) {
        const mv = this._movers[i];
        mv.userData.baseX = wrap(mv.userData.baseX + step, HALF_LEN);
        mv.position.x = mv.userData.baseX;
      }
      if (this._particle) {
        this._particle.position.x = wrap(this._particle.position.x + step, HALF_LEN);
      }
    } else if (mode === 'dielectrophoresis' && this._particle) {
      const positive = this.state.cmFactor >= 0;
      const speed = Math.min(1.6, Math.abs(this.state.cmFactor) * 1.8 + 0.2);
      const t = (Math.sin(this.phase * speed) + 1) / 2;
      const gapX = -0.15;
      const farX = -HALF_LEN * 0.55;
      const x = positive ? farX + (gapX - farX) * t : gapX + (farX - gapX) * t;
      this._particle.position.x = x;
    }
  }
}
