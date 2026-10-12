// Glow discharge tube — 3D view of Paschen's law breakdown and band structure.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { paschenVoltage, isGlowing, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  glassTube,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

// Bands along the tube, cathode (left, -x) -> anode (right, +x).
// Matches the 2D scene's band list/colors.
const BANDS = [
  { name: 'cathode glow', frac: 0.05, color: 0xfca5a5, emissive: 0.9 },
  { name: 'cathode dark space', frac: 0.08, color: 0x1e293b, emissive: 0.0 },
  { name: 'negative glow', frac: 0.16, color: 0xc084fc, emissive: 1.1 },
  { name: 'Faraday dark space', frac: 0.09, color: 0x1e293b, emissive: 0.0 },
  { name: 'positive column', frac: 0.62, color: 0xf472b6, emissive: 0.55 },
];

const TUBE_LEN = 6.4;
const TUBE_R = 0.62;

export class GlowDischargeScene3D {
  constructor(container) {
    this.container = container;
    this.pressureTorr = 1;
    this.spacingCm = 5;
    this.V = 400;
    this.glowing = false;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(3.6, 2.7, 8.3);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.1, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.0);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // --- Bench base plate: grounds the tube as mounted apparatus instead of
    // a floating cylinder. A plain flat box already sits correctly
    // (width=X, thin=Y, length=Z) — no rotation applied. ---
    const baseW = TUBE_LEN + 1.2;
    const baseTopY = -1.54;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseW, 0.12, 1.4),
      metalMaterial(0x131a26, { metalness: 0.35, roughness: 0.65 }),
    );
    base.position.set(0, baseTopY - 0.06, 0);
    this.scene.add(base);
    this.scene.add(contactShadow(baseW * 0.58, 1.1, 0.42).translateY(baseTopY - 0.13));

    // Two support stands (post + collar ring) cradle the tube above the
    // base plate so it reads as bench-mounted rather than floating.
    const standMat = metalMaterial(0x475569, { metalness: 0.7, roughness: 0.35 });
    const collarMat = metalMaterial(0x64748b, { metalness: 0.8, roughness: 0.25 });
    const standX = TUBE_LEN / 2 - 1.0;
    const postTopY = -TUBE_R - 0.03;
    const postHeight = postTopY - baseTopY;
    this._stands = [];
    for (const sx of [-standX, standX]) {
      const post = new THREE.Mesh(
        roundedBoxGeometry(0.14, postHeight, 0.14, 0.03, 2),
        standMat,
      );
      post.position.set(sx, baseTopY + postHeight / 2, 0);
      this.scene.add(post);
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(TUBE_R * 0.98, 0.032, 8, 28),
        collarMat,
      );
      collar.rotation.y = Math.PI / 2;
      collar.position.set(sx, 0, 0);
      this.scene.add(collar);
      this._stands.push(post, collar);
    }

    // Outer glass envelope
    this.tube = glassTube(TUBE_R, TUBE_LEN, 0.12);
    this.tube.rotation.z = Math.PI / 2;
    this.scene.add(this.tube);

    // Cathode (left, -x) and anode (right, +x) discs
    const capGeo = new THREE.CylinderGeometry(TUBE_R * 0.92, TUBE_R * 0.92, 0.12, 24);
    this.cathode = new THREE.Mesh(
      capGeo,
      metalMaterial(0x94a3b8, { metalness: 0.65, roughness: 0.35 }),
    );
    this.cathode.rotation.z = Math.PI / 2;
    this.cathode.position.x = -TUBE_LEN / 2;
    this.scene.add(this.cathode);
    tip(this.cathode, 'Cathode (−)', 'Ion bombardment ejects secondary electrons (γ) that sustain the discharge.');

    this.anode = new THREE.Mesh(
      capGeo,
      metalMaterial(0x94a3b8, { metalness: 0.65, roughness: 0.35 }),
    );
    this.anode.rotation.z = Math.PI / 2;
    this.anode.position.x = TUBE_LEN / 2;
    this.scene.add(this.anode);
    tip(this.anode, 'Anode (+)', 'Collects the electron current completing the circuit.');

    this.scene.add(placeLabel('cathode (−)', -TUBE_LEN / 2, 1.05, 0, '#e2e8f0', 0.9));
    this.scene.add(placeLabel('anode (+)', TUBE_LEN / 2, 1.05, 0, '#e2e8f0', 0.9));

    // Band segments — built once, colored/toggled in _updateBands().
    this.bandMeshes = [];
    this.bandLabels = [];
    this.bandTips = [];
    let x = -TUBE_LEN / 2;
    for (let i = 0; i < BANDS.length; i++) {
      const b = BANDS[i];
      const len = TUBE_LEN * b.frac;
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        emissive: b.color,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.0,
        roughness: 0.35,
        metalness: 0.0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(TUBE_R * 0.86, TUBE_R * 0.86, Math.max(len - 0.02, 0.01), 24, 1, false),
        mat
      );
      mesh.rotation.z = Math.PI / 2;
      mesh.position.x = x + len / 2;
      this.scene.add(mesh);
      this.bandMeshes.push(mesh);

      const lbl = placeLabel(b.name, x + len / 2, TUBE_R + 0.55, 0, '#e2e8f0', 0.85);
      lbl.visible = false;
      this.scene.add(lbl);
      this.bandLabels.push(lbl);

      const tipDesc = i === 0
        ? 'Bright layer right at the cathode where ions strike and recombine.'
        : i === 2
          ? 'Brightest region — most excitation/ionization collisions happen here.'
          : i === 4
            ? 'Uniform, weakly luminous plasma carrying current to the anode.'
            : 'Low-luminosity gap where electrons gain energy before the next glow region.';
      tip(mesh, b.name, tipDesc);
      this.bandTips.push(mesh);

      x += len;
    }

    // Attach glow sprites on the brightest bands (negative glow, positive column).
    this._glowSprites = [];
    this._glowSprites.push(attachGlow(this.bandMeshes[2], BANDS[2].color, 1.4));
    this._glowSprites.push(attachGlow(this.bandMeshes[4], BANDS[4].color, 1.1));
    this._glowSprites.forEach(function (s) { s.visible = false; });

    // "not glowing" dim tube hint
    this._darkHint = placeLabel('below breakdown — no current flows', 0, -TUBE_R - 0.6, 0, '#94a3b8', 1.05);
    this.scene.add(this._darkHint);

    // Live p*d -> V_b readout label
    this._pdLbl = placeLabel('p·d = —, V_b = —', 0, TUBE_R + 1.5, 0, '#a78bfa', 1.15);
    this.scene.add(this._pdLbl);

    this._updateBands();
    this._updateLabel();
  }

  setParams(p) {
    if (!p) return;
    if (p.pressureTorr != null) this.pressureTorr = p.pressureTorr;
    if (p.spacingCm != null) this.spacingCm = p.spacingCm;
    if (p.V != null) this.V = p.V;
    const pd = this.pressureTorr * this.spacingCm;
    this.glowing = isGlowing(this.V, pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    this._updateBands();
    this._updateLabel();
  }

  _updateBands() {
    for (let i = 0; i < this.bandMeshes.length; i++) {
      const mesh = this.bandMeshes[i];
      const b = BANDS[i];
      mesh.material.opacity = this.glowing ? (b.emissive > 0 ? 0.75 : 0.18) : 0.0;
      mesh.material.emissiveIntensity = this.glowing ? b.emissive : 0;
      this.bandLabels[i].visible = this.glowing;
    }
    this._glowSprites.forEach(function (s) { s.visible = this.glowing; }, this);
    this._darkHint.visible = !this.glowing;
    this.tube.material.opacity = this.glowing ? 0.1 : 0.16;
  }

  _updateLabel() {
    if (!this._pdLbl || !this._pdLbl.material || !this._pdLbl.material.map) return;
    const pd = this.pressureTorr * this.spacingCm;
    const Vb = paschenVoltage(pd, A_DEFAULT, B_DEFAULT, GAMMA_DEFAULT);
    const cv = this._pdLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = this.glowing ? '#4ade80' : '#f87171';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const vbText = isFinite(Vb) && Vb < 1e8 ? Vb.toFixed(0) + ' V' : '—';
    ctx.fillText('p·d = ' + pd.toFixed(2) + ' Torr·cm  →  V_b = ' + vbText, 192, 24);
    this._pdLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.cathode, this.anode].concat(this.bandTips || []);
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
      this.phase += 0.03;
      if (this.glowing) {
        const shimmer = 0.85 + 0.15 * Math.sin(this.phase * 6);
        this.bandMeshes[2].material.emissiveIntensity = BANDS[2].emissive * shimmer;
        this.bandMeshes[4].material.emissiveIntensity = BANDS[4].emissive * shimmer;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
