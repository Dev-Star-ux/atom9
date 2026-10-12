// CRT oscilloscope — 3D view: a funnel-shaped glass tube containing (in
// order along the axis) an electron gun (heated cathode, grid, anode),
// vertical (Y) deflection plates, horizontal (X) deflection plates, and a
// circular phosphor screen whose CanvasTexture draws the live sweep /
// Lissajous trace — the same beamXY() math the 2D view uses. A small
// glowing particle continuously flies from the gun to its current landing
// spot so the beam itself is visible, not just the resulting trace.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { beamXY, PhosphorTrail } from './physics.js';
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
  contactShadow,
} from '../common/sceneVisuals.js';

// Tube geometry (world units), axis along Z.
const Z_GUN = -3.6;
const Z_SCREEN = 3.6;
const GUN_R = 0.34;
const SCREEN_R = 1.35;
const Z_BEAM_START = Z_GUN + 1.05; // beam travels straight after the anode
const Z_Y0 = Z_GUN + 1.3, Z_Y1 = Z_GUN + 2.15; // Y (vertical) plates span
const Z_X0 = Z_GUN + 2.4, Z_X1 = Z_GUN + 3.2;  // X (horizontal) plates span
const FLIGHT_S = 0.55; // seconds for the visible "traveling electron" to cross the tube

export class CrtScene3D {
  constructor(container) {
    this.container = container;
    this.state = { view: 'sweep', vAmp: 3, vFreq: 2, sweepHz: 1, fx: 2, fy: 3, phaseDeg: 0 };
    this.paused = false;
    this._active = false;
    this._simT = 0;
    this._flightT = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(6.4, 3.4, 6.8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.2, 0, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 22, -2.6);

    this._trail = new PhosphorTrail();
    this._buildStage();
    this._alive = true;
    this._last = performance.now();
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // --- Glass envelope: narrow at the gun, flaring toward the screen ---
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(SCREEN_R * 1.04, GUN_R * 1.15, Z_SCREEN - Z_GUN, 40, 1, true),
      glassMaterial(0x334155, 0.15),
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.z = (Z_GUN + Z_SCREEN) / 2;
    this.scene.add(tube);

    const shadow = contactShadow(SCREEN_R * 1.3, SCREEN_R * 1.1, 0.4);
    shadow.position.set(0, -2.58, (Z_GUN + Z_SCREEN) / 2);
    this.scene.add(shadow);

    // --- Electron gun assembly ---
    const gunGroup = new THREE.Group();
    gunGroup.position.z = Z_GUN + 0.4;
    this.scene.add(gunGroup);
    this.gunGroup = gunGroup;

    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(GUN_R * 0.72, GUN_R * 0.9, 0.5, 20),
      metalMaterial(0x6b7a99, { metalness: 0.7, roughness: 0.4 }),
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.z = -0.2;
    gunGroup.add(housing);

    // Heated cathode / filament — small emissive glow at the very back.
    const cathode = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.9 }),
    );
    cathode.position.z = -0.44;
    attachGlow(cathode, 0xfbbf24, 0.5);
    gunGroup.add(cathode);
    this.cathode = cathode;

    // Grid — thin ring that controls beam current.
    const grid = new THREE.Mesh(
      new THREE.TorusGeometry(GUN_R * 0.55, 0.012, 8, 24),
      metalMaterial(0x94a3b8, { metalness: 0.6, roughness: 0.5 }),
    );
    grid.position.z = -0.08;
    gunGroup.add(grid);

    // Anode — accelerating ring, wider and further forward.
    const anode = new THREE.Mesh(
      new THREE.TorusGeometry(GUN_R * 0.85, 0.03, 10, 28),
      metalMaterial(0x60a5fa, { metalness: 0.55, roughness: 0.35, emissive: 0x1d4ed8, emissiveIntensity: 0.15 }),
    );
    anode.position.z = 0.32;
    gunGroup.add(anode);

    this.scene.add(placeLabel('Electron gun', 0, GUN_R + 0.55, Z_GUN + 0.35, '#fbbf24', 1.0));

    // --- Y (vertical) deflection plates ---
    const plateLenY = Z_Y1 - Z_Y0;
    const yPlateGeo = new THREE.BoxGeometry(0.78, 0.045, plateLenY);
    const yMat = metalMaterial(0xf472b6, { metalness: 0.5, roughness: 0.4, emissive: 0xdb2777, emissiveIntensity: 0.12 });
    this.yPlateTop = new THREE.Mesh(yPlateGeo, yMat);
    this.yPlateTop.position.set(0, 0.34, (Z_Y0 + Z_Y1) / 2);
    this.yPlateBot = new THREE.Mesh(yPlateGeo, yMat);
    this.yPlateBot.position.set(0, -0.34, (Z_Y0 + Z_Y1) / 2);
    this.scene.add(this.yPlateTop, this.yPlateBot);
    this.scene.add(placeLabel('Y plates (vertical)', 0, 0.75, (Z_Y0 + Z_Y1) / 2, '#f472b6', 1.0));

    // --- X (horizontal) deflection plates ---
    const plateLenX = Z_X1 - Z_X0;
    const xPlateGeo = new THREE.BoxGeometry(0.045, 0.62, plateLenX);
    const xMat = metalMaterial(0x60a5fa, { metalness: 0.5, roughness: 0.4, emissive: 0x1d4ed8, emissiveIntensity: 0.12 });
    this.xPlateL = new THREE.Mesh(xPlateGeo, xMat);
    this.xPlateL.position.set(-0.36, 0, (Z_X0 + Z_X1) / 2);
    this.xPlateR = new THREE.Mesh(xPlateGeo, xMat);
    this.xPlateR.position.set(0.36, 0, (Z_X0 + Z_X1) / 2);
    this.scene.add(this.xPlateL, this.xPlateR);
    this.scene.add(placeLabel('X plates (horizontal)', 0, -0.72, (Z_X0 + Z_X1) / 2, '#60a5fa', 1.0));

    // --- Phosphor screen: a disc textured with the live trace ---
    this._texSize = 512;
    this._texCanvas = document.createElement('canvas');
    this._texCanvas.width = this._texCanvas.height = this._texSize;
    this._texCtx = this._texCanvas.getContext('2d');
    this._screenTex = new THREE.CanvasTexture(this._texCanvas);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x02150c,
      emissive: 0xffffff,
      emissiveMap: this._screenTex,
      emissiveIntensity: 1.15,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    this.screen = new THREE.Mesh(new THREE.CircleGeometry(SCREEN_R, 56), screenMat);
    this.screen.position.z = Z_SCREEN;
    this.scene.add(this.screen);

    const bezel = new THREE.Mesh(
      new THREE.RingGeometry(SCREEN_R, SCREEN_R * 1.1, 56),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    bezel.position.z = Z_SCREEN - 0.01;
    this.scene.add(bezel);
    this.scene.add(placeLabel('Phosphor screen', 0, SCREEN_R + 0.35, Z_SCREEN, '#4ade80', 1.05));

    // --- The traveling "beam" itself: a small particle flying gun→screen ---
    this.beamDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xbfe9ff, depthTest: false }),
    );
    this.beamDot.renderOrder = 10;
    attachGlow(this.beamDot, 0x8bffea, 0.5);
    this.beamDot.position.set(0, 0, Z_BEAM_START);
    this.scene.add(this.beamDot);

    this._applyTipsWithFallback({});
  }

  _curveXY(z, xFinal, yFinal) {
    let y;
    if (z <= Z_Y0) y = 0;
    else if (z <= Z_Y1) { const f = (z - Z_Y0) / (Z_Y1 - Z_Y0); y = yFinal * 0.32 * f * f; }
    else { const yExit = yFinal * 0.32; const t = (z - Z_Y1) / (Z_SCREEN - Z_Y1); y = yExit + (yFinal - yExit) * t; }

    let x;
    if (z <= Z_X0) x = 0;
    else if (z <= Z_X1) { const f = (z - Z_X0) / (Z_X1 - Z_X0); x = xFinal * 0.32 * f * f; }
    else { const xExit = xFinal * 0.32; const t = (z - Z_X1) / (Z_SCREEN - Z_X1); x = xExit + (xFinal - xExit) * t; }

    return { x, y };
  }

  setParams(p) {
    if (!p) return;
    const viewChanged = p.view != null && p.view !== this.state.view;
    const waveChanged = p.wave != null && p.wave !== this.state.wave;
    Object.assign(this.state, p);
    if (viewChanged || waveChanged) this._trail.reset();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) { this._applyTipsWithFallback(tips || {}); }

  _applyTipsWithFallback(tips) {
    const pick = (id, title, desc) => (tips[id] ? { title: tips[id].title, desc: tips[id].desc } : { title, desc });
    const gunT = pick('gun', 'Electron gun', 'A heated cathode boils off electrons; the grid controls how many reach the screen, and the anode ring accelerates them down the tube.');
    tip(this.gunGroup, gunT.title, gunT.desc);
    const yT = pick('yplates', 'Vertical (Y) plates', 'These deflect the beam up or down in proportion to the input voltage — this is what turns Vy(t) into vertical position on the screen.');
    tip(this.yPlateTop, yT.title, yT.desc);
    tip(this.yPlateBot, yT.title, yT.desc);
    const xT = pick('xplates', 'Horizontal (X) plates', 'These deflect the beam left or right — driven by the internal sawtooth time base in sweep mode, or by a second signal in X-Y mode.');
    tip(this.xPlateL, xT.title, xT.desc);
    tip(this.xPlateR, xT.title, xT.desc);
    const scrT = pick('screen', 'Phosphor screen', 'Where the beam lands, the phosphor coating glows and fades over a fraction of a second — that brief persistence is what lets a moving spot look like a continuous trace.');
    tip(this.screen, scrT.title, scrT.desc);
  }

  getPickables() {
    return [this.gunGroup, this.yPlateTop, this.yPlateBot, this.xPlateL, this.xPlateR, this.screen].filter(Boolean);
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

  _updateScreenTexture() {
    const ctx = this._texCtx;
    const size = this._texSize;
    const cx = size / 2, cy = size / 2;
    const r = size * 0.46;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#020d08';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(74,222,128,0.16)'; ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      const gx = cx + (i / 4) * r * 0.94;
      ctx.beginPath(); ctx.moveTo(gx, cy - r * 0.94); ctx.lineTo(gx, cy + r * 0.94); ctx.stroke();
      const gy = cy + (i / 4) * r * 0.94;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.94, gy); ctx.lineTo(cx + r * 0.94, gy); ctx.stroke();
    }

    const pts = this._trail.points;
    const persist = this._lastPersist || 1;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const age = this._simT - p.t;
      const alpha = Math.max(0, 1 - age / persist);
      if (alpha <= 0.02) continue;
      const c = clampToUnitDisc(p.x, p.y);
      const px = cx + c.x * r * 0.94;
      const py = cy - c.y * r * 0.94;
      ctx.fillStyle = 'rgba(74,222,128,' + (alpha * 0.9).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, 2.5 + alpha * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    if (pts.length) {
      const head = pts[pts.length - 1];
      const hc = clampToUnitDisc(head.x, head.y);
      const hx = cx + hc.x * r * 0.94, hy = cy - hc.y * r * 0.94;
      ctx.fillStyle = '#eafff2';
      ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
    this._screenTex.needsUpdate = true;
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;

    if (this._active && !this.paused) {
      this._simT += dt;
      const { persist } = this._trail.advance(this.state, this._simT);
      this._lastPersist = persist;
      this._updateScreenTexture();

      // Traveling electron: flies from the anode to the current landing
      // spot, over and over, so the beam itself is visible in flight.
      this._flightT = (this._flightT + dt / FLIGHT_S) % 1;
      const target = beamXY(this.state, this._simT);
      const clamped = clampToUnitDisc(target.x, target.y);
      const xFinal = clamped.x * SCREEN_R * 0.9;
      const yFinal = clamped.y * SCREEN_R * 0.9;
      const z = Z_BEAM_START + this._flightT * (Z_SCREEN - Z_BEAM_START);
      const pos = this._curveXY(z, xFinal, yFinal);
      this.beamDot.position.set(pos.x, pos.y, z);
      const nearScreen = Math.min(1, this._flightT / 0.9);
      this.beamDot.material.opacity = 1;
      this.beamDot.visible = true;
      // Fade the traveling dot in near the gun and brighten as it nears the screen.
      this.beamDot.scale.setScalar(0.6 + 0.6 * nearScreen);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

function clampToUnitDisc(x, y) {
  const mag = Math.hypot(x, y);
  if (mag <= 1) return { x, y };
  return { x: x / mag, y: y / mag };
}
