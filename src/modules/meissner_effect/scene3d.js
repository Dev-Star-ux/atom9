// Meissner effect — 3D levitation schematic (superconducting puck + hovering magnet).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isSuperconducting } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
  glowTexture,
} from '../common/sceneVisuals.js';

const FIELD_COLOR = 0xa78bfa;

export class Meissner3D {
  constructor(container) {
    this.container = container;
    this.tempK = 70;
    this.tcK = 92;
    this.B0mT = 20;
    this.lambdaNm = 150;
    this.heightMm = 5;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(4.6, 3.1, 5.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.35, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -1.6);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // Pedestal: a squat cylinder with a bright metal rim so it reads as a
    // manufactured cryostat base rather than a floating grey disc.
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.45, 0.3, 48),
      metalMaterial(0x0f1622, { metalness: 0.4, roughness: 0.7 }),
    );
    pedestal.position.y = -0.55;
    this.scene.add(pedestal);
    const pedestalRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.02, 8, 56),
      metalMaterial(0x64748b, { metalness: 0.85, roughness: 0.25 }),
    );
    pedestalRim.rotation.x = Math.PI / 2;
    pedestalRim.position.y = -0.4;
    this.scene.add(pedestalRim);
    this.scene.add(contactShadow(1.6, 1.6, 0.5).translateY(-0.68));

    // Superconducting puck: dark metallic disc with a bright amber
    // screening-current rim near the edge.
    this.puck = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.32, 56),
      metalMaterial(0x1c3a52, { metalness: 0.55, roughness: 0.3 }),
    );
    this.puck.position.y = -0.24;
    this.scene.add(this.puck);
    tip(this.puck, 'Superconducting puck', 'Below T_c it expels magnetic flux (Meissner effect) — not merely zero resistance.');

    const puckCap = new THREE.Mesh(
      new THREE.CircleGeometry(0.96, 56),
      metalMaterial(0x24506e, { metalness: 0.5, roughness: 0.22 }),
    );
    puckCap.rotation.x = -Math.PI / 2;
    puckCap.position.y = -0.24 + 0.161;
    this.scene.add(puckCap);
    this.puckCap = puckCap;

    this.screenShell = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.03, 10, 56),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 }),
    );
    this.screenShell.rotation.x = Math.PI / 2;
    this.screenShell.position.y = -0.08;
    this.scene.add(this.screenShell);

    this._puckGlow = attachGlow(this.puck, 0x22d3ee, 2.6);

    // A few slow drifting mist sprites near the rim — a light "cryogenic
    // cold" cue, only visible while superconducting.
    this._mist = [];
    for (let i = 0; i < 5; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('#bcd7ff', 48), transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      const ang = (i / 5) * Math.PI * 2;
      spr.userData.baseAng = ang;
      spr.userData.r = 0.85 + (i % 2) * 0.15;
      spr.scale.set(0.34, 0.34, 1);
      this.scene.add(spr);
      this._mist.push(spr);
    }

    this.scene.add(placeLabel('superconducting puck', 0, -0.85, 1.3, '#7dd3fc', 1.1));

    // Bar magnet: rounded red (N, top) / blue (S, bottom) halves with a
    // thin metal seam band, plus a contact shadow that reacts to height.
    this.magnet = new THREE.Group();
    this.scene.add(this.magnet);
    const halfGeo = roundedBoxGeometry(0.62, 0.2, 0.38, 0.05, 3);
    const nHalf = new THREE.Mesh(halfGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.15 }));
    nHalf.position.y = 0.1;
    this.magnet.add(nHalf);
    const sHalf = new THREE.Mesh(halfGeo, new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.15 }));
    sHalf.position.y = -0.1;
    this.magnet.add(sHalf);
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.02, 0.4),
      metalMaterial(0xcbd5e1, { metalness: 0.9, roughness: 0.2 }),
    );
    this.magnet.add(seam);
    tip(nHalf, 'Magnet (N pole up)', 'Its field lines leave the top and curve down into the S pole below.');
    tip(sHalf, 'Magnet (S pole)', 'Field returns here. When hovering over a superconductor the return path bows around the puck.');
    attachGlow(this.magnet, 0xf87171, 1.15);

    this._magnetShadow = contactShadow(0.42, 0.3, 0.4);
    this._magnetShadow.position.y = -0.24 + 0.162;
    this.scene.add(this._magnetShadow);

    this.scene.add(placeLabel('magnet', 0, 1.05, 0.85, '#fca5a5', 1.05));

    // Field-line group (rebuilt on setParams) — smooth glowing tubes with
    // small arrow cones instead of dashed segments.
    this.fieldGroup = new THREE.Group();
    this.scene.add(this.fieldGroup);
    this.fieldLines = [];

    this._tLbl = placeLabel('T = -- K (T_c = -- K)', 0, 1.85, 0, '#a9c4ff', 1.15);
    this.scene.add(this._tLbl);

    this._layoutMagnet();
    this._rebuildFieldLines();
    this._updateLabels();
  }

  _puckTopY() {
    return -0.24 + 0.16; // puck center + half height
  }

  _layoutMagnet() {
    const sc = isSuperconducting(this.tempK, this.tcK);
    const puckTop = this._puckTopY();
    const magnetHalfH = 0.1;
    const restY = puckTop + magnetHalfH; // resting flush, no gap
    const hoverGap = 0.5 + this.heightMm * 0.09; // scaled visible distance
    this._restY = restY;
    this._hoverY = puckTop + hoverGap;
    this._sc = sc;
    if (!sc) {
      this.magnet.position.y = restY;
    }
    this._updateContactShadow(sc ? this._hoverY : restY, sc);
  }

  _updateContactShadow(magnetY, sc) {
    if (!this._magnetShadow) return;
    const gap = Math.max(0.001, magnetY - this._puckTopY());
    // Farther above the surface -> larger, softer (lighter) shadow.
    const spread = 0.32 + gap * 0.22;
    const fade = Math.max(0.12, 0.42 - gap * 0.12);
    this._magnetShadow.scale.set(spread, spread * 0.72, 1);
    this._magnetShadow.material.opacity = sc ? fade : 0.5;
  }

  _rebuildFieldLines() {
    for (let i = 0; i < this.fieldLines.length; i++) {
      const grp = this.fieldLines[i];
      this.fieldGroup.remove(grp);
      grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    this.fieldLines = [];

    const sc = isSuperconducting(this.tempK, this.tcK);
    const puckTop = this._puckTopY();
    const magnetY = sc ? this._hoverY : this._restY;
    const startY = magnetY - 0.11; // bottom (S) pole of magnet
    const n = 6;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const pts = [];
      if (sc) {
        const outR = 1.5 + Math.abs(Math.sin(ang)) * 0.12;
        const steps = 20;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const y = startY - u * (startY - (puckTop - 0.5));
          const r = 0.24 + (outR - 0.24) * Math.sin(u * Math.PI);
          pts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
        }
      } else {
        const rx = Math.cos(ang) * 0.26;
        const rz = Math.sin(ang) * 0.26;
        const steps = 10;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          pts.push(new THREE.Vector3(rx, startY - u * (startY - (puckTop - 0.85)), rz));
        }
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, sc ? 0.014 : 0.01, 6, false);
      const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({
        color: FIELD_COLOR, transparent: true, opacity: sc ? 0.65 : 0.4,
      }));
      const grp = new THREE.Group();
      grp.add(tube);
      // Small arrow cone ~40% along, oriented along the local tangent.
      const arrowU = 0.42;
      const arrowPos = curve.getPoint(arrowU);
      const tangent = curve.getTangent(arrowU).normalize();
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(sc ? 0.032 : 0.022, sc ? 0.09 : 0.06, 8),
        new THREE.MeshBasicMaterial({ color: FIELD_COLOR, transparent: true, opacity: sc ? 0.85 : 0.55 }),
      );
      cone.position.copy(arrowPos);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      grp.add(cone);
      this.fieldGroup.add(grp);
      this.fieldLines.push(grp);
    }
  }

  _updateLabels() {
    if (this._tLbl && this._tLbl.material && this._tLbl.material.map) {
      const cv = this._tLbl.material.map.image;
      if (cv && cv.getContext) {
        const c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        c.fillStyle = 'rgba(10,17,34,0.78)';
        c.fillRect(4, 6, 376, 36);
        const sc = isSuperconducting(this.tempK, this.tcK);
        c.fillStyle = sc ? '#67e8f9' : '#fbbf24';
        c.font = '600 16px system-ui,sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('T = ' + this.tempK.toFixed(0) + ' K  (T_c = ' + this.tcK.toFixed(0) + ' K)', 192, 24);
        this._tLbl.material.map.needsUpdate = true;
      }
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.tempK != null) this.tempK = p.tempK;
    if (p.tcK != null) this.tcK = p.tcK;
    if (p.B0mT != null) this.B0mT = p.B0mT;
    if (p.lambdaNm != null) this.lambdaNm = p.lambdaNm;
    if (p.heightMm != null) this.heightMm = p.heightMm;

    const sc = isSuperconducting(this.tempK, this.tcK);
    this._layoutMagnet();
    this._rebuildFieldLines();
    this._updateLabels();

    if (this._puckGlow) this._puckGlow.material.opacity = sc ? 0.55 : 0.12;
    if (this.screenShell) this.screenShell.material.opacity = sc ? 0.55 : 0.08;
    if (this.puck && this.puck.material) {
      this.puck.material.color.set(sc ? 0x1c3a52 : 0x33415a);
    }
    if (this.puckCap && this.puckCap.material) {
      this.puckCap.material.color.set(sc ? 0x24506e : 0x3a4a5c);
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.puck, this.magnet].filter(Boolean);
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
      this.phase += 0.045;
      if (this._sc && this.magnet) {
        const y = this._hoverY + Math.sin(this.phase) * 0.06;
        this.magnet.position.y = y;
        if (this.fieldGroup) this.fieldGroup.position.y = Math.sin(this.phase) * 0.02;
        this._updateContactShadow(y, true);
      } else if (this.fieldGroup) {
        this.fieldGroup.position.y = 0;
      }
      // Drift the cold-mist sprites slowly upward and fade them, looping.
      const scActive = this._sc ? 1 : 0;
      for (let i = 0; i < this._mist.length; i++) {
        const spr = this._mist[i];
        const t = (this.phase * 0.15 + i / this._mist.length) % 1;
        const ang = spr.userData.baseAng;
        spr.position.set(Math.cos(ang) * spr.userData.r, -0.35 + t * 1.1, Math.sin(ang) * spr.userData.r);
        spr.material.opacity = scActive * Math.sin(t * Math.PI) * 0.35;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
