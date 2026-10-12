// Faraday disc — bench dynamo: copper disc, axial magnets, brushes, load + meter.
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
  solidGuide,
} from '../common/sceneVisuals.js';
import { emf, current } from './physics.js';

function copperMaterial() {
  return metalMaterial(0xb87333, { metalness: 0.85, roughness: 0.28 });
}

function wireSeg(a, b, color) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 0.001;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, len, 8),
    metalMaterial(color != null ? color : 0x334155, { metalness: 0.7, roughness: 0.35 }),
  );
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function resistorBanded() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 16;
  const c = cv.getContext('2d');
  c.fillStyle = '#d6c199';
  c.fillRect(0, 0, 64, 16);
  const bands = ['#8b5e34', '#1f2937', '#dc2626', '#f59e0b'];
  for (let i = 0; i < bands.length; i++) {
    c.fillStyle = bands[i];
    c.fillRect(10 + i * 11, 0, 5, 16);
  }
  const tex = new THREE.CanvasTexture(cv);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.15 });
}

export class FaradayDiscScene3D {
  constructor(container) {
    this.container = container;
    this.state = { B: 0.5, omega: 50, R: 0.1, Rload: 10 };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._discScale = 1;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.2, 3.8, 6.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.4, 0.35, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const padY = -1.55;
    const discY = 0.55;

    // Bench pad
    const pad = new THREE.Mesh(
      roundedBoxGeometry(5.6, 0.14, 3.0, 0.08, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.6 }),
    );
    pad.position.set(0.3, padY, 0);
    this.scene.add(pad);
    this.scene.add(contactShadow(2.6, 1.5, 0.4).translateY(padY - 0.072).translateX(0.3));

    // Motor / base pedestal
    const base = new THREE.Mesh(
      roundedBoxGeometry(1.1, 0.35, 1.1, 0.06, 3),
      plasticMaterial(0x334155, { roughness: 0.5 }),
    );
    base.position.set(0, padY + 0.25, 0);
    this.scene.add(base);

    const motorBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.55, 24),
      metalMaterial(0x64748b, { metalness: 0.55, roughness: 0.4 }),
    );
    motorBody.position.set(0, padY + 0.72, 0);
    this.scene.add(motorBody);
    tip(motorBody, 'Drive motor', 'Spins the Faraday disc at angular speed ω.');

    // Vertical axle
    this.axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.85, 16),
      metalMaterial(0xcbd5e1, { metalness: 0.75, roughness: 0.25 }),
    );
    this.axle.position.set(0, discY + 0.15, 0);
    this.scene.add(this.axle);

    // Disc group (rotates)
    this.discGroup = new THREE.Group();
    this.discGroup.position.set(0, discY, 0);
    this.scene.add(this.discGroup);

    this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.07, 48),
      copperMaterial(),
    );
    this.discGroup.add(this.disc);
    tip(this.disc, 'Faraday disc', 'ε = ½ B ω R² between axis and rim. Copper conducting disc in axial B.');
    this.scene.add(placeLabel('disc', -1.35, discY + 0.55, 0.2, '#fdba74', 0.9));

    // Radial segment lines (optional copper look)
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.01, 0.02),
        metalMaterial(0x8b5a2b, { metalness: 0.7, roughness: 0.35 }),
      );
      seg.position.set(Math.cos(ang) * 0.45, 0.04, Math.sin(ang) * 0.45);
      seg.rotation.y = -ang;
      this.discGroup.add(seg);
    }
    // Hub collar
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.1, 20),
      metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.25 }),
    );
    hub.position.y = 0.06;
    this.discGroup.add(hub);

    // Permanent magnets above / below (U-style yoke behind)
    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2.2, 0.55),
      metalMaterial(0x374151, { metalness: 0.6, roughness: 0.38 }),
    );
    yoke.position.set(-0.15, discY, -1.35);
    this.scene.add(yoke);

    this.magTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.28, 36),
      metalMaterial(0xef4444, {
        metalness: 0.55,
        roughness: 0.35,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.2,
      }),
    );
    this.magTop.position.set(0, discY + 0.72, 0);
    this.scene.add(this.magTop);
    tip(this.magTop, 'Magnet (N)', 'Axial B through the disc — field leaves the north face.');
    this.scene.add(placeLabel('N', 0, discY + 1.05, 0, '#fca5a5', 0.85));

    this.magBot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.28, 36),
      metalMaterial(0x3b82f6, {
        metalness: 0.55,
        roughness: 0.35,
        emissive: 0x1e3a8a,
        emissiveIntensity: 0.2,
      }),
    );
    this.magBot.position.set(0, discY - 0.72, 0);
    this.scene.add(this.magBot);
    tip(this.magBot, 'Magnet (S)', 'Completes the axial field path under the disc.');
    this.scene.add(placeLabel('S', 0, discY - 1.05, 0, '#93c5fd', 0.85));

    // Arm bridges from yoke to magnets
    for (const mag of [this.magTop, this.magBot]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, 0.9),
        metalMaterial(0x475569, { metalness: 0.65, roughness: 0.35 }),
      );
      arm.position.set(-0.05, mag.position.y, -0.85);
      this.scene.add(arm);
    }

    // Hub brush with spring arm (from post at +z)
    const brushPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, discY + 0.55 - (padY + 0.07), 12),
      metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.3 }),
    );
    brushPost.position.set(0, (discY + 0.55 + padY + 0.07) / 2, 1.55);
    this.scene.add(brushPost);

    this.hubArm = new THREE.Group();
    this.hubArm.position.set(0, discY + 0.42, 1.55);
    this.scene.add(this.hubArm);
    const springArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 1.35),
      metalMaterial(0x94a3b8, { metalness: 0.75, roughness: 0.3 }),
    );
    springArm.position.set(0, 0, -0.65);
    this.hubArm.add(springArm);
    this.hubBrush = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.28, 12),
      metalMaterial(0xf97316, { metalness: 0.45, roughness: 0.45 }),
    );
    this.hubBrush.position.set(0, -0.12, -1.35);
    this.hubArm.add(this.hubBrush);
    tip(this.hubBrush, 'Hub brush', 'Sliding contact at the axis — one terminal of the generated EMF.');
    this.scene.add(placeLabel('hub brush', 0.55, discY + 0.95, 0.4, '#fdba74', 0.85));

    // Rim brush with spring arm from the side
    const rimPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, discY - (padY + 0.07), 12),
      metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.3 }),
    );
    rimPost.position.set(1.85, (discY + padY + 0.07) / 2, 0);
    this.scene.add(rimPost);

    this.rimArm = new THREE.Group();
    this.rimArm.position.set(1.85, discY, 0);
    this.scene.add(this.rimArm);
    const rimSpring = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.04, 0.06),
      metalMaterial(0x94a3b8, { metalness: 0.75, roughness: 0.3 }),
    );
    rimSpring.position.set(-0.35, 0.08, 0);
    this.rimArm.add(rimSpring);
    this.rimBrush = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.28, 0.16),
      metalMaterial(0xf97316, { metalness: 0.45, roughness: 0.45 }),
    );
    this.rimBrush.position.set(-0.78, 0, 0);
    this.rimArm.add(this.rimBrush);
    tip(this.rimBrush, 'Rim brush', 'Contact at the rim — closes the circuit through the load resistor.');
    this.scene.add(placeLabel('rim brush', 1.55, discY + 0.55, 0.55, '#fdba74', 0.85));

    // Load resistor block + meter box on the right of the pad
    this.loadBlock = new THREE.Group();
    this.loadBlock.position.set(2.55, padY + 0.45, 0.7);
    this.scene.add(this.loadBlock);

    const loadCase = new THREE.Mesh(
      roundedBoxGeometry(0.85, 0.55, 0.7, 0.05, 3),
      plasticMaterial(0x1e3a5f, { roughness: 0.5 }),
    );
    this.loadBlock.add(loadCase);
    const resBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.45, 14),
      resistorBanded(),
    );
    resBody.rotation.z = Math.PI / 2;
    resBody.position.set(0, 0.12, 0);
    this.loadBlock.add(resBody);
    tip(loadCase, 'Load resistor', 'R_load sets the current I = ε / R_load drawn from the disc.');
    tip(resBody, 'Load resistor', 'R_load sets the current I = ε / R_load drawn from the disc.');
    this.scene.add(placeLabel('load', 2.55, padY + 0.95, 0.7, '#93c5fd', 0.85));

    // Small meter box
    this.meter = new THREE.Group();
    this.meter.position.set(2.55, padY + 0.45, -0.65);
    this.scene.add(this.meter);
    const meterCase = new THREE.Mesh(
      roundedBoxGeometry(0.75, 0.5, 0.65, 0.05, 3),
      plasticMaterial(0x0f172a, { roughness: 0.45 }),
    );
    this.meter.add(meterCase);
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24),
      metalMaterial(0x1e293b, { metalness: 0.5, roughness: 0.4 }),
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 0.12, 0.28);
    this.meter.add(dial);
    this.meterNeedle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    this.meterNeedle.position.set(0, 0.14, 0.34);
    this.meter.add(this.meterNeedle);
    attachGlow(this.meterNeedle, 0xfbbf24, 0.45);
    tip(meterCase, 'Meter', 'Indicates generated EMF / load current from the Faraday disc.');

    // Banana wires: hub → load, rim → meter → load
    const hubPt = new THREE.Vector3(0, discY + 0.55, 0.15);
    const rimPt = new THREE.Vector3(1.05, discY, 0);
    const loadIn = new THREE.Vector3(2.2, padY + 0.55, 0.7);
    const meterIn = new THREE.Vector3(2.2, padY + 0.55, -0.65);
    this.scene.add(wireSeg(hubPt, new THREE.Vector3(0, discY + 0.9, 1.2), 0xdc2626));
    this.scene.add(wireSeg(new THREE.Vector3(0, discY + 0.9, 1.2), loadIn, 0xdc2626));
    this.scene.add(wireSeg(rimPt, meterIn, 0x2563eb));
    this.scene.add(wireSeg(meterIn, loadIn, 0x2563eb));
    this.scene.add(solidGuide(
      [new THREE.Vector3(2.2, padY + 0.55, 0.7), new THREE.Vector3(2.55, padY + 0.55, 0.35)],
      0x64748b,
      0.35,
    ));

    this._liveLbl = placeLabel('ε = -- V', 0.3, 2.35, 0, '#e2e8f0', 1.1);
    this.scene.add(this._liveLbl);
  }

  setParams(p) {
    if (!p) return;
    if (p.B != null) this.state.B = p.B;
    if (p.omega != null) this.state.omega = p.omega;
    if (p.R != null) this.state.R = p.R;
    if (p.Rload != null) this.state.Rload = p.Rload;

    const scale = Math.max(0.5, Math.min(1.5, this.state.R / 0.1));
    this._discScale = scale;
    this.discGroup.scale.set(scale, 1, scale);
    this.rimBrush.position.x = -0.78 * scale;
    this.rimArm.position.x = 1.0 * scale + 0.85;
    this.magTop.scale.set(scale, 1, scale);
    this.magBot.scale.set(scale, 1, scale);

    const eps = emf(this.state.B, this.state.omega, this.state.R);
    const I = current(this.state.B, this.state.omega, this.state.R, this.state.Rload);
    this._updateLabel(eps, I);

    if (this.meterNeedle) {
      const ang = Math.max(-0.6, Math.min(0.6, I * 8));
      this.meterNeedle.rotation.y = ang;
    }
  }

  _updateLabel(eps, I) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ε=' + eps.toFixed(4) + ' V   I=' + I.toFixed(4) + ' A', 192, 24);
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.disc, this.magTop, this.magBot, this.hubBrush, this.rimBrush].filter(Boolean);
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
      this.discGroup.rotation.y += this.state.omega * 0.002;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
