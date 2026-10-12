// Eddy currents — C-shaped magnet brake demo with sliding aluminum plate.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
  attachGlow,
  glowSphere,
} from '../common/sceneVisuals.js';
import { brakeForce } from './physics.js';

function eddyRingTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(250,204,21,0.95)';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(32, 32, 22, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = 'rgba(253,224,71,0.45)';
  c.lineWidth = 8;
  c.beginPath();
  c.arc(32, 32, 22, 0, Math.PI * 2);
  c.stroke();
  return new THREE.CanvasTexture(cv);
}

export class EddyCurrentsScene3D {
  constructor(container) {
    this.container = container;
    this.state = { B: 0.5, thickness: 2, sigma: 1, speed: 1 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._plateX = -1.4;
    this._dir = 1;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.8, 3.4, 6.8);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.15, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._eddySprites = [];
    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -1.55;
    const gapCy = 0.35;

    // Bench pad under the whole apparatus
    const pad = new THREE.Mesh(
      roundedBoxGeometry(5.2, 0.14, 2.6, 0.08, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    pad.position.set(0, padY, 0);
    this.scene.add(pad);
    const shadow = contactShadow(2.4, 1.3, 0.42);
    shadow.position.set(0, padY - 0.072, 0);
    this.scene.add(shadow);

    // Rail supports + sliding rail through the magnet gap
    const railMat = metalMaterial(0x64748b, { metalness: 0.8, roughness: 0.28 });
    const railY = gapCy - 0.72;
    for (const z of [-0.55, 0.55]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.08), railMat);
      rail.position.set(0, railY, z);
      this.scene.add(rail);
    }
    this.scene.add(placeLabel('rail', 1.9, railY + 0.35, 0.95, '#94a3b8', 0.85));

    // End stops / posts for the rail
    for (const x of [-2.15, 2.15]) {
      for (const z of [-0.55, 0.55]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.06, railY - (padY + 0.07), 10),
          railMat,
        );
        post.position.set(x, (railY + padY + 0.07) / 2, z);
        this.scene.add(post);
      }
    }

    // --- Horseshoe / C-magnet on a vertical stand ---
    const yokeMat = metalMaterial(0x374151, { metalness: 0.65, roughness: 0.35 });
    this.magnetGroup = new THREE.Group();
    this.scene.add(this.magnetGroup);

    // Vertical stand column behind the C
    const standCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, gapCy + 1.35 - (padY + 0.07), 16),
      metalMaterial(0x475569, { metalness: 0.7, roughness: 0.32 }),
    );
    standCol.position.set(0, (gapCy + 1.35 + padY + 0.07) / 2, -1.05);
    this.scene.add(standCol);
    const clamp = new THREE.Mesh(
      roundedBoxGeometry(0.55, 0.22, 0.4, 0.04, 3),
      metalMaterial(0x334155, { metalness: 0.7, roughness: 0.35 }),
    );
    clamp.position.set(0, gapCy + 0.35, -0.95);
    this.scene.add(clamp);

    // Yoke: rear vertical + top/bottom arms forming the C opening toward +z / along x gap
    // Layout: poles face each other vertically; plate slides in X through the gap.
    const poleW = 2.4;
    const poleD = 1.35;
    const poleH = 0.38;
    const gapHalf = 0.55;

    const yokeBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, gapHalf * 2 + poleH * 2 + 0.15, poleD * 0.85),
      yokeMat,
    );
    yokeBack.position.set(0, gapCy, -0.55);
    this.magnetGroup.add(yokeBack);

    // Top arm (toward N pole)
    const armTop = new THREE.Mesh(
      new THREE.BoxGeometry(poleW * 0.55, 0.28, poleD * 0.7),
      yokeMat,
    );
    armTop.position.set(0, gapCy + gapHalf + poleH * 0.5 + 0.05, -0.15);
    this.magnetGroup.add(armTop);

    const armBot = new THREE.Mesh(
      new THREE.BoxGeometry(poleW * 0.55, 0.28, poleD * 0.7),
      yokeMat,
    );
    armBot.position.set(0, gapCy - gapHalf - poleH * 0.5 - 0.05, -0.15);
    this.magnetGroup.add(armBot);

    // N pole (red, top)
    this.poleN = new THREE.Mesh(
      new THREE.BoxGeometry(poleW, poleH, poleD),
      metalMaterial(0xef4444, {
        metalness: 0.5,
        roughness: 0.4,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.22,
      }),
    );
    this.poleN.position.set(0, gapCy + gapHalf + poleH / 2, 0.15);
    this.magnetGroup.add(this.poleN);
    tip(this.poleN, 'North pole', 'Magnet pole above the gap. B points downward through the aluminum plate.');
    this.scene.add(placeLabel('N', 0, gapCy + gapHalf + poleH + 0.28, 0.15, '#fca5a5', 0.9));

    // S pole (blue, bottom)
    this.poleS = new THREE.Mesh(
      new THREE.BoxGeometry(poleW, poleH, poleD),
      metalMaterial(0x3b82f6, {
        metalness: 0.5,
        roughness: 0.4,
        emissive: 0x1e3a8a,
        emissiveIntensity: 0.22,
      }),
    );
    this.poleS.position.set(0, gapCy - gapHalf - poleH / 2, 0.15);
    this.magnetGroup.add(this.poleS);
    tip(this.poleS, 'South pole', 'Magnet pole below the gap — field returns here after threading the plate.');
    this.scene.add(placeLabel('S', 0, gapCy - gapHalf - poleH - 0.28, 0.15, '#93c5fd', 0.9));

    // Pole face polish caps
    for (const pole of [this.poleN, this.poleS]) {
      const face = new THREE.Mesh(
        new THREE.BoxGeometry(poleW * 0.92, 0.04, poleD * 0.92),
        metalMaterial(0xcbd5e1, { metalness: 0.85, roughness: 0.2 }),
      );
      face.position.y = pole === this.poleN ? -poleH / 2 + 0.02 : poleH / 2 - 0.02;
      pole.add(face);
    }

    // Aluminum plate on a sled that rides the rails
    this.plateGroup = new THREE.Group();
    this.plateGroup.position.set(this._plateX, gapCy, 0);
    this.scene.add(this.plateGroup);

    this.plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.35, 1.15),
      metalMaterial(0xa8b4c4, { metalness: 0.78, roughness: 0.28 }),
    );
    this.plateGroup.add(this.plate);
    tip(
      this.plate,
      'Aluminum plate',
      'Conducting plate sliding through B. Eddy currents circulate (Lenz) and produce a braking force opposing motion.',
    );
    this.scene.add(placeLabel('aluminum plate', -1.5, gapCy + 1.05, 0.85, '#cbd5e1', 0.9));

    // Sled carriage under the plate
    const sled = new THREE.Mesh(
      roundedBoxGeometry(0.55, 0.12, 1.25, 0.04, 3),
      plasticMaterial(0x334155, { roughness: 0.55 }),
    );
    sled.position.set(0, -0.78, 0);
    this.plateGroup.add(sled);
    for (const z of [-0.55, 0.55]) {
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 0.14),
        metalMaterial(0x94a3b8, { metalness: 0.7, roughness: 0.3 }),
      );
      shoe.position.set(0, -0.86, z);
      this.plateGroup.add(shoe);
    }

    // Heat glow sheet (emissive overlay on plate faces)
    this.heatGlow = attachGlow(this.plate, 0xf97316, 1.6);
    this.heatGlow.material.opacity = 0.05;

    // Eddy-current ring sprites / torus loops on the plate
    const ringTex = eddyRingTexture();
    for (let i = 0; i < 4; i++) {
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: ringTex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const u = (i % 2) * 0.35 - 0.18;
      const v = Math.floor(i / 2) * 0.45 - 0.22;
      spr.position.set(0.09, u, v);
      spr.scale.set(0.55, 0.55, 1);
      this.plateGroup.add(spr);
      this._eddySprites.push(spr);
    }
    this.eddyTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.025, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.eddyTorus.rotation.y = Math.PI / 2;
    this.eddyTorus.position.set(0.1, 0.05, 0);
    this.plateGroup.add(this.eddyTorus);
    tip(this.eddyTorus, 'Eddy current loops', 'Circulating currents induced by motion through B; they dissipate as heat and brake the plate.');

    // Soft field-gap indicator
    this.gapGlow = glowSphere(0.18, 0x38bdf8, { pick: false });
    this.gapGlow.position.set(0, gapCy, 0.15);
    this.gapGlow.material.opacity = 0.2;
    this.scene.add(this.gapGlow);

    this._liveLbl = placeLabel('F_brake = --', 0, 2.45, 0, '#e2e8f0', 1.1);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.B != null) this.state.B = p.B;
    if (p.thickness != null) this.state.thickness = p.thickness;
    if (p.sigma != null) this.state.sigma = p.sigma;
    if (p.speed != null) this.state.speed = p.speed;

    const sx = Math.max(0.08, Math.min(0.4, this.state.thickness * 0.04));
    this.plate.scale.set(sx / 0.14, 1, 1);

    if (this.gapGlow) {
      this.gapGlow.scale.setScalar(0.7 + 0.6 * Math.min(1.5, this.state.B));
      this.gapGlow.material.opacity = 0.12 + 0.2 * Math.min(1, this.state.B);
    }

    const F = brakeForce(this.state.B, this.state.speed, this.state.thickness, this.state.sigma);
    this._updateLabel(F);
  }

  _updateLabel(F) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F_brake = ' + F.toFixed(2) + ' (arb)  v=' + this.state.speed.toFixed(2), 192, 24);
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.poleN, this.poleS, this.plate, this.eddyTorus].filter(Boolean);
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
      this.phase += 0.05;
      const v = this.state.speed * this._dir;
      this._plateX += v * 0.014;
      if (this._plateX > 1.7) {
        this._plateX = 1.7;
        this._dir = -1;
      } else if (this._plateX < -1.7) {
        this._plateX = -1.7;
        this._dir = 1;
      }
      this.plateGroup.position.x = this._plateX;

      const heat = Math.min(1, this.state.B * Math.abs(this.state.speed) * this.state.sigma * 0.18);
      if (this.plate.material) {
        this.plate.material.color.setRGB(
          0.62 + 0.35 * heat,
          0.68 - 0.25 * heat,
          0.72 - 0.4 * heat,
        );
        this.plate.material.emissive.setHex(0xf97316);
        this.plate.material.emissiveIntensity = 0.05 + 0.55 * heat;
      }
      if (this.heatGlow && this.heatGlow.material) {
        this.heatGlow.material.opacity = 0.08 + 0.55 * heat;
      }

      const moving = Math.abs(this.state.speed) > 0.05;
      const inGap = Math.abs(this._plateX) < 1.05;
      const eddyOp = moving && inGap ? 0.35 + 0.45 * heat : 0;
      for (let i = 0; i < this._eddySprites.length; i++) {
        const s = this._eddySprites[i];
        s.material.opacity = eddyOp * (0.7 + 0.3 * Math.sin(this.phase * 5 + i * 1.7));
        const pulse = 0.45 + 0.12 * Math.sin(this.phase * 4 + i);
        s.scale.set(pulse, pulse, 1);
      }
      if (this.eddyTorus && this.eddyTorus.material) {
        this.eddyTorus.material.opacity = eddyOp * 0.85;
        this.eddyTorus.rotation.z += 0.08 * this._dir * Math.max(0.2, Math.abs(this.state.speed));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
