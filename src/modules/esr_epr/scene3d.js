// ESR / EPR — 3D spin precession in B, EPR cavity.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resonanceFieldMT, G_FREE } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassMaterial,
  dashedGuide,
} from '../common/sceneVisuals.js';

export class EsrEpr3D {
  constructor(container) {
    this.container = container;
    this.g = G_FREE;
    this.A = 2.5;
    this.hyperfineN = 1;
    this.freqGHz = 9.5;
    this.B0mT = resonanceFieldMT(G_FREE, 9.5);
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(6, 4, 9);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.3, 0);
    addStudioLights(this.scene);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    this.scene.add(floor);

    // EPR cavity (rectangular resonator)
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.6, 2.4),
      glassMaterial(0x334155, 0.22)
    );
    cavity.position.set(0, 0.4, 0);
    this.scene.add(cavity);
    this.scene.add(placeLabel('microwave cavity', 0, 1.55, 0, '#94a3b8', 0.95));

    // B field solenoid hint
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.06, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x78350f, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.4 })
    );
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, 0.4, 0);
    this.scene.add(coil);

    // B0 arrow
    this.bArrow = new THREE.Group();
    this.bArrow.position.set(-2.2, 0.4, 0);
    this.scene.add(this.bArrow);
    const bShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    bShaft.rotation.z = Math.PI / 2;
    bShaft.position.x = 1.2;
    this.bArrow.add(bShaft);
    const bHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    bHead.rotation.z = -Math.PI / 2;
    bHead.position.x = 2.5;
    this.bArrow.add(bHead);
    this.scene.add(placeLabel('B (sweep)', 2.6, 0.4, 0, '#fbbf24', 0.9));
    tip(bHead, 'Magnetic field', 'Sweep B until hν = gμ_BB — EPR resonance.');

    // Electron spin vector (precesses about B)
    this.spinGroup = new THREE.Group();
    this.spinGroup.position.set(0, 0.4, 0);
    this.scene.add(this.spinGroup);

    this.spinArrow = new THREE.Group();
    this.spinGroup.add(this.spinArrow);
    const sShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sShaft.position.y = 0.6;
    this.spinArrow.add(sShaft);
    const sHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.3, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sHead.position.y = 1.25;
    this.spinArrow.add(sHead);
    attachGlow(sHead, 0x38bdf8, 1.3);
    tip(sHead, 'Electron spin S', 'Precesses at ω = g μ_B B / ℏ. Hyperfine splits resonance fields by A.');

    // Precession path
    this.orbitLine = dashedGuide([], 0x38bdf8, 0.45);
    this.spinGroup.add(this.orbitLine);

    this._gLbl = placeLabel('g = 2.0023', 0, 2.5, 0, '#7dd3fc', 1.0);
    this.scene.add(this._gLbl);

    // MW photon hint
    const mw = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.85 })
    );
    mw.position.set(1.4, 0.9, 0.8);
    this.scene.add(mw);
    attachGlow(mw, 0xf472b6, 0.9);
    this.scene.add(placeLabel('hν microwave', 1.4, 1.35, 0.8, '#f9a8d4', 0.85));
  }

  setParams(p) {
    if (!p) return;
    if (p.g != null) this.g = p.g;
    if (p.A != null) this.A = p.A;
    if (p.hyperfineN != null) this.hyperfineN = p.hyperfineN;
    if (p.freqGHz != null) this.freqGHz = p.freqGHz;
    this.B0mT = resonanceFieldMT(this.g, this.freqGHz);
    this._updateLabels();
    this._rebuildOrbit();
  }

  _updateLabels() {
    if (this._gLbl && this._gLbl.material && this._gLbl.material.map) {
      const cv = this._gLbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.78)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = '600 16px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('g = ' + this.g.toFixed(4) + '   B₀ = ' + this.B0mT.toFixed(1) + ' mT', 192, 24);
        this._gLbl.material.map.needsUpdate = true;
      }
    }
  }

  _rebuildOrbit() {
    const pts = [];
    const r = 0.85;
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, 0.15, Math.sin(t) * r));
    }
    if (this.orbitLine.geometry) this.orbitLine.geometry.dispose();
    this.orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.orbitLine.computeLineDistances();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.spinArrow && this.spinArrow.children[1], this.bArrow && this.bArrow.children[1]].filter(Boolean);
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
      this.phase += 0.035 * (this.g / G_FREE);
      this.spinGroup.rotation.y = this.phase;
      const tilt = 0.55 + 0.15 * Math.sin(this.phase * 0.7);
      this.spinArrow.rotation.x = tilt;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
