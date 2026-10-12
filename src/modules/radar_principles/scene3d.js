// Pulse radar — parabolic dish station, pulse animation, distant target craft.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { delayFromRange, unambiguousRange, echoPowerRelative, withinUnambiguous } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  glowSphere,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
  dashedGuide,
} from '../common/sceneVisuals.js';

export class RadarPrinciplesScene3D {
  constructor(container) {
    this.container = container;
    this.state = {
      pulseWidth: 1e-6,
      prf: 1000,
      range: 30000,
      sigma: 10,
      Pt: 1,
    };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(7.0, 4.2, 8.0);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(1.2, 0.7, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 28, -2.2);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildAircraft() {
    const g = new THREE.Group();
    const mat = metalMaterial(0xcbd5e1, { metalness: 0.55, roughness: 0.4 });
    // Fuselage: cylinder + nose cone + tail
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 12), mat);
    fuse.rotation.z = Math.PI / 2;
    g.add(fuse);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), mat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 0.72;
    g.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 1.4), mat);
    wing.position.x = 0.05;
    g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.06), mat);
    tail.position.set(-0.45, 0.18, 0);
    g.add(tail);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.45), mat);
    stab.position.set(-0.45, 0.05, 0);
    g.add(stab);
    return g;
  }

  _buildStage() {
    this.xAnt = -3.4;
    this.xMax = 4.6;
    const padY = -1.05;

    // Ground apron under radar
    const apron = new THREE.Mesh(
      roundedBoxGeometry(2.4, 0.12, 2.4, 0.06, 3),
      metalMaterial(0x1e293b, { metalness: 0.35, roughness: 0.65 }),
    );
    apron.position.set(this.xAnt, padY, 0);
    this.scene.add(apron);
    const antShadow = contactShadow(1.35, 1.35, 0.42);
    antShadow.position.set(this.xAnt, padY - 0.061, 0);
    this.scene.add(antShadow);

    // Equipment cabinet
    const cab = new THREE.Mesh(
      roundedBoxGeometry(0.85, 0.7, 0.7, 0.05, 3),
      plasticMaterial(0x0f172a, { roughness: 0.5 }),
    );
    cab.position.set(this.xAnt - 0.95, padY + 0.4, 0.55);
    this.scene.add(cab);
    const cabLed = glowSphere(0.04, 0x4ade80, { pick: false });
    cabLed.position.set(this.xAnt - 0.95, padY + 0.62, 0.55 + 0.36);
    this.scene.add(cabLed);
    this.cabLed = cabLed;

    // Pedestal base + rotating head
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 0.55, 16),
      metalMaterial(0x475569, { metalness: 0.7, roughness: 0.35 }),
    );
    pedestal.position.set(this.xAnt, padY + 0.35, 0);
    this.scene.add(pedestal);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.35, 14),
      metalMaterial(0x64748b, { metalness: 0.75, roughness: 0.3 }),
    );
    mast.position.set(this.xAnt, padY + 1.15, 0);
    this.scene.add(mast);

    // Dish assembly (yaw group)
    this.dishGroup = new THREE.Group();
    this.dishGroup.position.set(this.xAnt, padY + 1.95, 0);
    this.scene.add(this.dishGroup);

    const yoke = new THREE.Mesh(
      roundedBoxGeometry(0.35, 0.22, 0.55, 0.04, 3),
      metalMaterial(0x334155, { metalness: 0.65, roughness: 0.35 }),
    );
    this.dishGroup.add(yoke);

    this.dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 28, 18, 0, Math.PI),
      metalMaterial(0x94a3b8, { metalness: 0.6, roughness: 0.32 }),
    );
    this.dish.rotation.y = Math.PI / 2;
    this.dish.position.set(0.2, 0.15, 0);
    this.dishGroup.add(this.dish);
    tip(this.dish, 'TX/RX dish', 'Parabolic reflector for pulse radar. Emits a short pulse, then listens. Range R = cτ/2.');

    // Strut + feed horn at focus
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8),
      metalMaterial(0xcbd5e1, { metalness: 0.7, roughness: 0.3 }),
    );
    strut.rotation.z = Math.PI / 2;
    strut.position.set(0.55, 0.15, 0);
    this.dishGroup.add(strut);

    this.feedHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.32, 12),
      metalMaterial(0xe2e8f0, { metalness: 0.55, roughness: 0.35 }),
    );
    this.feedHorn.rotation.z = -Math.PI / 2;
    this.feedHorn.position.set(0.85, 0.15, 0);
    this.dishGroup.add(this.feedHorn);
    tip(this.feedHorn, 'Feed horn', 'Illuminates the dish; shared TX/RX path for monostatic pulse radar.');

    this.txGlow = glowSphere(0.12, 0x4ade80, { pick: false });
    this.txGlow.position.set(1.05, 0.15, 0);
    this.dishGroup.add(this.txGlow);

    // Distant target aircraft
    this.target = this._buildAircraft();
    this.target.position.set(2.2, 1.35, 0);
    this.scene.add(this.target);
    tip(this.target, 'Target', 'Echo power teaching form: Pᵣ ∝ Pₜ σ / R⁴ — doubles range → ≈16× weaker echo.');

    // Target ground pad (distant)
    const tPad = new THREE.Mesh(
      roundedBoxGeometry(1.6, 0.08, 1.2, 0.04, 3),
      metalMaterial(0x1e293b, { metalness: 0.3, roughness: 0.7 }),
    );
    tPad.position.set(2.2, padY + 0.02, 0);
    this.scene.add(tPad);
    this._targetPad = tPad;
    const tShadow = contactShadow(0.9, 0.7, 0.35);
    tShadow.position.set(2.2, padY - 0.04, 0);
    this.scene.add(tShadow);
    this._targetShadow = tShadow;

    // Support post under aircraft (stylized stand so it isn't floating)
    this.targetPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.1, 10),
      metalMaterial(0x475569, { metalness: 0.6, roughness: 0.4 }),
    );
    this.targetPost.position.set(2.2, padY + 0.6, 0);
    this.scene.add(this.targetPost);

    this.pulse = glowSphere(0.16, 0x4ade80, { pick: false });
    this.scene.add(this.pulse);

    this.rangeLine = dashedGuide(
      [new THREE.Vector3(this.xAnt + 1.1, 1.85, 0), new THREE.Vector3(2.2, 1.85, 0)],
      0x64748b,
      0.4,
    );
    this.scene.add(this.rangeLine);

    this.scene.add(placeLabel('TX/RX dish', this.xAnt, 2.85, 0, '#cbd5e1', 0.95));
    this.scene.add(placeLabel('target', 2.2, 2.15, 0, '#fde68a', 0.9));
    this._rangeLbl = placeLabel('range', 0.2, 2.25, 0, '#94a3b8', 0.85);
    this.scene.add(this._rangeLbl);
    this._liveLbl = placeLabel('R = --', 0.4, 3.1, 0, '#4ade80', 1.05);
    this.scene.add(this._liveLbl);

    this._dishBaseY = padY + 1.95;
  }

  setParams(p) {
    if (!p) return;
    if (p.pulseWidth != null) this.state.pulseWidth = p.pulseWidth;
    if (p.prf != null) this.state.prf = p.prf;
    if (p.range != null) this.state.range = p.range;
    if (p.sigma != null) this.state.sigma = p.sigma;
    if (p.Pt != null) this.state.Pt = p.Pt;

    const Runamb = unambiguousRange(this.state.prf);
    const frac = Math.min(1, this.state.range / Math.max(Runamb, 1));
    const xT = this.xAnt + 1.4 + frac * (this.xMax - this.xAnt - 1.4);
    this.target.position.x = xT;
    this.targetPost.position.x = xT;
    if (this._targetPad) this._targetPad.position.x = xT;
    if (this._targetShadow) this._targetShadow.position.x = xT;

    const scale = 0.75 + 0.45 * Math.min(1, Math.log10(Math.max(this.state.sigma, 0.1)) / 2);
    this.target.scale.setScalar(scale);

    if (this.rangeLine) {
      this.scene.remove(this.rangeLine);
      this.rangeLine = dashedGuide(
        [
          new THREE.Vector3(this.xAnt + 1.1, 1.85, 0),
          new THREE.Vector3(xT, 1.85, 0),
        ],
        0x64748b,
        0.4,
      );
      this.scene.add(this.rangeLine);
    }
    if (this._rangeLbl) this._rangeLbl.position.x = (this.xAnt + 1.1 + xT) / 2;

    const tau = delayFromRange(this.state.range);
    const Pr = echoPowerRelative(this.state.Pt, this.state.sigma, this.state.range);
    const ok = withinUnambiguous(this.state.range, this.state.prf);
    this._updateLabel(tau, Pr, ok);
  }

  _updateLabel(tau, Pr, ok) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = ok ? '#4ade80' : '#f87171';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'R=' + (this.state.range / 1000).toFixed(1) + 'km  τ=' + (tau * 1e6).toFixed(1) +
      'µs  Pr~' + Pr.toExponential(1) + (ok ? '' : ' AMB'),
      192,
      24,
    );
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.dish, this.target, this.feedHorn].filter(Boolean);
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
      // Slow azimuth sweep
      this.dishGroup.rotation.y = 0.22 * Math.sin(this.phase * 0.25);

      const xT = this.target.position.x;
      const yBeam = this._dishBaseY + 0.15;
      const cycle = (this.phase * 0.07) % 1;
      const goingOut = cycle < 0.5;
      const u = goingOut ? cycle * 2 : (cycle - 0.5) * 2;
      const x0 = this.xAnt + 1.0;
      const x = goingOut ? x0 + u * (xT - x0) : xT - u * (xT - x0);
      this.pulse.position.set(x, yBeam, 0);
      this.pulse.material.color.setHex(goingOut ? 0x4ade80 : 0x38bdf8);
      this.pulse.scale.setScalar(goingOut ? 1.0 : 0.7 + 0.4 * (1 - u));
      if (this.txGlow) {
        this.txGlow.material.opacity = goingOut && u < 0.15 ? 0.9 : 0.35;
        this.txGlow.scale.setScalar(goingOut && u < 0.2 ? 1.4 : 0.8);
      }
      if (this.cabLed) {
        this.cabLed.material.opacity = 0.5 + 0.5 * Math.sin(this.phase * 4);
      }
      this.target.rotation.y += 0.008;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
