// Wheatstone bridge — 3D diamond circuit with battery, galvanometer, and resistor arms.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { balanceCondition, bridgeVoltage, isBalanced, solvedRx } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  solidGuide,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const WIRE_COLOR = 0x64748b;
const RES_COLOR = 0x38bdf8;

function resistorMaterial() {
  // Banded look (like a real resistor body) via a small striped canvas texture.
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 16;
  const c = cv.getContext('2d');
  c.fillStyle = '#d6c199';
  c.fillRect(0, 0, 64, 16);
  const bands = ['#8b5e34', '#1f2937', '#dc2626', '#f59e0b'];
  for (let i = 0; i < bands.length; i++) {
    c.fillStyle = bands[i];
    c.fillRect(10 + i * 11, 0, 5, 16);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  // Tuned like metalMaterial's low-roughness metallic leads, but keep the
  // banded texture map (a metalMaterial() call would drop the map).
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.15 });
}

function wireSegment(a, b, color) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 0.001;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, len, 10),
    metalMaterial(color != null ? color : WIRE_COLOR, { metalness: 0.75, roughness: 0.3 }),
  );
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function resistorBody(a, b, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() * 0.5;
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, len, 16), material);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export class WheatstoneScene3D {
  constructor(container) {
    this.container = container;
    this.state = { R1: 100, R2: 100, R3: 150, Rx: 150, V: 6 };
    this.needleAngle = 0;
    this.needleTarget = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(4.9, 3.6, 7.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.1, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 20, -2.4);

    this._buildCircuit();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildCircuit() {
    const half = 1.5;
    this.T = new THREE.Vector3(0, half, 0);
    this.B = new THREE.Vector3(0, -half, 0);
    this.L = new THREE.Vector3(-half, 0, 0);
    this.R = new THREE.Vector3(half, 0, 0);

    // PCB-style base plate: grounds the diamond circuit + battery + galvo
    // as one mounted apparatus instead of floating wires. A plain flat
    // rounded box already sits correctly (width=X, thin=Y, depth=Z) —
    // no extra rotation needed.
    const boardY = -half - 0.45;
    const board = new THREE.Mesh(
      roundedBoxGeometry(4.4, 0.14, 3.2, 0.08, 3),
      metalMaterial(0x0f2418, { metalness: 0.15, roughness: 0.75 }),
    );
    board.position.set(0, boardY, 0);
    this.scene.add(board);
    this.scene.add(contactShadow(2.3, 1.7, 0.45).translateY(boardY + 0.001));

    // Diagonal guide wires (battery line, galvanometer line)
    this.scene.add(solidGuide([this.T, this.B], 0x334155, 0.25));
    this.scene.add(solidGuide([this.L, this.R], 0x334155, 0.25));

    // 4 arms: wire leads + resistor body in the middle third
    this._arm1 = this._buildArm(this.T, this.L);
    this._arm2 = this._buildArm(this.T, this.R);
    this._arm3 = this._buildArm(this.L, this.B);
    this._armX = this._buildArm(this.R, this.B);

    // Labels for each resistor — position is already obvious from the
    // diamond layout, so just the name + live value (set in setParams).
    this._lblR1 = this._armLabel(this.T, this.L, 'R1');
    this._lblR2 = this._armLabel(this.T, this.R, 'R2');
    this._lblR3 = this._armLabel(this.L, this.B, 'R3');
    this._lblRx = this._armLabel(this.R, this.B, 'Rx');

    tip(this._arm1.body, 'R1 — top-left arm', 'Fixed reference resistor. Balance requires R1·Rx = R2·R3.');
    tip(this._arm2.body, 'R2 — top-right arm', 'Fixed reference resistor forming the ratio arm with R1.');
    tip(this._arm3.body, 'R3 — bottom-left arm', 'Fixed reference resistor forming the ratio arm with Rx.');
    tip(this._armX.body, 'Rx — unknown resistor', 'The resistance being measured. Adjust it until the galvanometer nulls.');

    // Battery symbol on the vertical diagonal (between center and T)
    this._buildBattery();

    // Galvanometer at the center (on the horizontal diagonal)
    this._buildGalvanometer();

    this.scene.add(placeLabel('Wheatstone Bridge', 0, 2.3, 0, '#e2e8f0', 1.15));
  }

  _buildArm(a, b) {
    const group = new THREE.Group();
    const dir = new THREE.Vector3().subVectors(b, a);
    const leadA = a.clone().addScaledVector(dir, 0.22);
    const leadB = a.clone().addScaledVector(dir, 0.78);
    group.add(wireSegment(a, leadA));
    group.add(wireSegment(leadB, b));
    const mat = resistorMaterial();
    const body = resistorBody(leadA, leadB, mat);
    group.add(body);
    this.scene.add(group);
    return { group, body, mat };
  }

  _armLabel(a, b, text) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const normal = new THREE.Vector3(a.y > b.y ? -1 : 1, 0, 1).normalize();
    const pos = mid.clone().addScaledVector(normal, 0.55);
    const lbl = placeLabel(text, pos.x, pos.y, pos.z, '#7dd3fc', 1.0);
    lbl.userData.color = '#7dd3fc';
    this.scene.add(lbl);
    return lbl;
  }

  _buildBattery() {
    const mid = new THREE.Vector3().addVectors(this.T, this.B).multiplyScalar(0.5);
    this.battery = new THREE.Group();
    this.battery.position.copy(mid);
    this.scene.add(this.battery);

    // Standard battery symbol: one long/thin plate (+), one short/thick plate (-)
    const plateLong = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.5),
      metalMaterial(0xfbbf24, { metalness: 0.7, roughness: 0.25 }),
    );
    plateLong.position.y = 0.08;
    this.battery.add(plateLong);

    const plateShort = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.09, 0.28),
      metalMaterial(0xfbbf24, { metalness: 0.7, roughness: 0.25 }),
    );
    plateShort.position.y = -0.08;
    this.battery.add(plateShort);

    this._vLbl = placeLabel('Battery V = 6.0 V', mid.x + 0.75, mid.y, mid.z, '#fbbf24', 1.05);
    this._vLbl.userData.color = '#fbbf24';
    this.scene.add(this._vLbl);
    tip(plateLong, 'Battery V', 'Drives current around the bridge; sets the scale of the imbalance voltage Vg.');
    tip(plateShort, 'Battery V', 'Drives current around the bridge; sets the scale of the imbalance voltage Vg.');
  }

  _buildGalvanometer() {
    const mid = new THREE.Vector3().addVectors(this.L, this.R).multiplyScalar(0.5);
    this.galvo = new THREE.Group();
    this.galvo.position.copy(mid);
    this.scene.add(this.galvo);

    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24),
      metalMaterial(0x1e293b, { metalness: 0.55, roughness: 0.35 }),
    );
    dial.rotation.x = Math.PI / 2;
    this.galvo.add(dial);

    this.galvoRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf87171 })
    );
    this.galvo.add(this.galvoRing);

    this.needlePivot = new THREE.Group();
    this.galvo.add(this.needlePivot);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    needle.position.z = 0.24;
    needle.position.y = 0.05;
    this.needlePivot.add(needle);
    this.needleMesh = needle;
    attachGlow(needle, 0xfbbf24, 0.5);
    this._needleGlow = needle.children[needle.children.length - 1];

    this._gLbl = placeLabel('Galvanometer G', mid.x, mid.y + 0.55, mid.z, '#e2e8f0', 1.05);
    this.scene.add(this._gLbl);
    this._vgLbl = placeLabel('Vg = 0.00 mV', mid.x, mid.y - 0.55, mid.z, '#fbbf24', 1.0);
    this._vgLbl.userData.color = '#fbbf24';
    this.scene.add(this._vgLbl);

    tip(dial, 'Galvanometer G', 'Detects the bridge imbalance current. Needle deflection direction and size follow the sign and magnitude of Vg. Zero deflection = balanced.');
    tip(needle, 'Galvanometer needle', 'Deflects toward the higher-potential side; settles at zero when R1·Rx = R2·R3.');
  }

  _updateLabel(sprite, text) {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    const cv = sprite.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 6, 376, 36, 8);
    else ctx.rect(4, 6, 376, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sprite.userData.color || '#a9c4ff';
    ctx.font = '600 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 24);
    sprite.material.map.needsUpdate = true;
  }

  setParams(p) {
    if (!p) return;
    const s = this.state;
    if (p.R1 != null) s.R1 = p.R1;
    if (p.R2 != null) s.R2 = p.R2;
    if (p.R3 != null) s.R3 = p.R3;
    if (p.Rx != null) s.Rx = p.Rx;
    if (p.V != null) s.V = p.V;

    this._updateLabel(this._lblR1, 'R1  ' + s.R1.toFixed(0) + ' Ω');
    this._updateLabel(this._lblR2, 'R2  ' + s.R2.toFixed(0) + ' Ω');
    this._updateLabel(this._lblR3, 'R3  ' + s.R3.toFixed(0) + ' Ω');
    this._updateLabel(this._lblRx, 'Rx  ' + s.Rx.toFixed(0) + ' Ω');
    this._updateLabel(this._vLbl, 'Battery V = ' + s.V.toFixed(1) + ' V');

    const Vg = bridgeVoltage(s.R1, s.R2, s.R3, s.Rx, s.V);
    const bal = isBalanced(s.R1, s.R2, s.R3, s.Rx, 0.01);
    const rxSolved = solvedRx(s.R1, s.R2, s.R3);
    this._updateLabel(
      this._vgLbl,
      'Vg = ' + (Vg * 1000).toFixed(2) + ' mV' + (bal ? '  BALANCED' : '  → Rx≈' + (isFinite(rxSolved) ? rxSolved.toFixed(0) : '—'))
    );

    const maxDeflect = Math.PI / 3.0;
    const scale = 40;
    this.needleTarget = Math.max(-maxDeflect, Math.min(maxDeflect, Vg * scale));
    this._balanced = bal;

    this.galvoRing.material.color.set(bal ? 0x4ade80 : 0xf87171);
    if (this._needleGlow) {
      this._needleGlow.material.opacity = bal ? 0.9 : 0.4;
      this._needleGlow.material.color.set(bal ? 0x4ade80 : 0xfbbf24);
    }
    if (this.needleMesh) this.needleMesh.material.color.set(bal ? 0x4ade80 : 0xfbbf24);

    void balanceCondition; // (kept for parity with 2D readouts; not directly used here)
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips;
  }

  getPickables() {
    const list = [
      this._arm1 && this._arm1.body,
      this._arm2 && this._arm2.body,
      this._arm3 && this._arm3.body,
      this._armX && this._armX.body,
      this.galvo,
      this.needleMesh,
      this.battery,
    ].filter(Boolean);
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
      // Needle settles toward its target angle each frame rather than snapping.
      this.needleAngle += (this.needleTarget - this.needleAngle) * 0.12;
      if (this.needlePivot) this.needlePivot.rotation.y = this.needleAngle;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
