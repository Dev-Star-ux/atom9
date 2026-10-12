// Clearer 3D photoelectric tube — Explerify-style apparatus, sparse labels.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { freqToColor, thresholdFreq, keMaxEV, H_TRUE, E as E_CHARGE } from './physics.js';
import { tip, pickShell } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
  glassTube,
} from '../common/sceneVisuals.js';

var SRC_X = -11;
var PLATE_X = -1.5;
var ANODE_X = 7.5;

export class PhotoScene {
  constructor(container) {
    this.container = container;
    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(2, 7, 18);

    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(-1, 0.5, 0);

    addStudioLights(this.scene);

    // Soft floor (no busy grid)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    this.scene.add(floor);

    this._buildApparatus();
    this.params = { fHz: 7e14, intensity: 0.6, Vstop: 0, phi: 2.28 };
    this.paused = false;
    this._active = false;
    this._tipTexts = {};
    this.photons = [];
    this.electrons = [];
    this._buildPools();
    this._updateBeamColor();

    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildApparatus() {
    // Glass vacuum tube
    const tube = glassTube(3.4, ANODE_X - SRC_X + 2, 0.1);
    tube.rotation.z = Math.PI / 2;
    tube.position.set((SRC_X + ANODE_X) / 2 + 1, 0, 0);
    this.scene.add(tube);

    // Light source / lamp
    this.lightSrc = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffd27f,
        emissive: 0xffb020,
        emissiveIntensity: 0.65,
      })
    );
    this.lightSrc.position.set(SRC_X, 0, 0);
    this.scene.add(this.lightSrc);
    this._lampGlow = attachGlow(this.lightSrc, 0xffd27f, 2.4);
    tip(this.lightSrc, 'Light source', 'Photons of energy hf. Colour follows frequency.');

    // Lamp housing
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.7, 18),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 })
    );
    housing.rotation.z = Math.PI / 2;
    housing.position.set(SRC_X - 1.1, 0, 0);
    this.scene.add(housing);

    // Beam cone (visual)
    const beamGeo = new THREE.CylinderGeometry(0.35, 1.6, PLATE_X - SRC_X - 1.2, 16, 1, true);
    this.beamMesh = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffd24a,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.beamMesh.rotation.z = Math.PI / 2;
    this.beamMesh.position.set((SRC_X + PLATE_X) / 2 - 0.2, 0, 0);
    this.scene.add(this.beamMesh);

    // Cathode
    this.cathode = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 5.5, 5.5),
      new THREE.MeshStandardMaterial({
        color: 0xb0bec5,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x334455,
        emissiveIntensity: 0.2,
      })
    );
    this.cathode.position.set(PLATE_X, 0, 0);
    this.scene.add(this.cathode);
    tip(this.cathode, 'Cathode', 'Metal with work function φ. Electrons need hf ≥ φ.');

    // Anode
    this.anode = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 4.8, 4.8),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.7,
        roughness: 0.35,
        emissive: 0x14532d,
        emissiveIntensity: 0,
      })
    );
    this.anode.position.set(ANODE_X, 0, 0);
    this.scene.add(this.anode);
    tip(this.anode, 'Anode', 'Collector. Stopping voltage can turn electrons back.');
    this._anodeGlow = attachGlow(this.anode, 0x4ade80, 1.6);
    this._anodeGlow.visible = false;

    // Sparse labels — offset so they do not cover the tube
    this.scene.add(placeLabel('light', SRC_X, 3.6, 0, '#fbbf24', 1.0));
    this.scene.add(placeLabel('cathode', PLATE_X, 4.0, 2.8, '#cbd5e1', 0.95));
    this.scene.add(placeLabel('anode', ANODE_X, 3.8, 2.8, '#94a3b8', 0.95));
    this.scene.add(placeLabel('e⁻', (PLATE_X + ANODE_X) / 2, -2.6, 0, '#7dd3fc', 0.9));
    this.scene.add(placeLabel('vacuum tube', (SRC_X + ANODE_X) / 2, 5.2, -3.2, '#64748b', 0.85));
  }

  _buildPools() {
    const pGeo = new THREE.SphereGeometry(0.2, 10, 10);
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      pickShell(m, 0.4);
      m.visible = false;
      this.scene.add(m);
      this.photons.push({ mesh: m, active: false, glow: null });
    }
    const eGeo = new THREE.SphereGeometry(0.16, 10, 10);
    for (let i = 0; i < 44; i++) {
      const m = new THREE.Mesh(eGeo, new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
      pickShell(m, 0.35);
      m.visible = false;
      this.scene.add(m);
      this.electrons.push({ mesh: m, active: false });
    }
  }

  _updateBeamColor() {
    const rgb = freqToColor(this.params.fHz);
    const col = new THREE.Color(rgb[0], rgb[1], rgb[2]);
    this.beamMesh.material.color.copy(col);
    this.lightSrc.material.color.copy(col);
    this.lightSrc.material.emissive.copy(col);
    this.beamMesh.material.opacity = 0.12 + this.params.intensity * 0.2;
  }

  setParams(p) {
    if (!p) return;
    Object.assign(this.params, p);
    this._updateBeamColor();
    this._bindTips();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  _bindTips() {
    const tips = this._tipTexts;
    if (!tips || !tips.cathode) return;
    const p = this.params;
    const ePhoton = (H_TRUE * p.fHz / E_CHARGE).toFixed(2);
    const ke = keMaxEV(p.fHz, p.phi).toFixed(2);
    const fTh = (thresholdFreq(p.phi) / 1e14).toFixed(2);

    tip(this.lightSrc, tips.source.title, tips.source.desc + '  hf ≈ ' + ePhoton + ' eV');
    tip(this.cathode, tips.cathode.title, tips.cathode.desc + '  φ = ' + p.phi.toFixed(2) + ' eV · ν₀ ≈ ' + fTh + '×10¹⁴ Hz');
    tip(this.anode, tips.anode.title, tips.anode.desc + '  Vₛ = ' + p.Vstop.toFixed(1) + ' V · KE_max = ' + ke + ' eV');
  }

  getPickables() {
    return [this.lightSrc, this.cathode, this.anode];
  }

  _spawnPhoton() {
    const p = this.photons.find(function (q) { return !q.active; });
    if (!p) return;
    const rgb = freqToColor(this.params.fHz);
    p.mesh.material.color.setRGB(rgb[0], rgb[1], rgb[2]);
    p.y = (Math.random() - 0.5) * 4.2;
    p.z = (Math.random() - 0.5) * 4.2;
    p.x = SRC_X + 0.8;
    p.active = true;
    p.mesh.visible = true;
  }

  _ejectElectron(y, z) {
    const ke = keMaxEV(this.params.fHz, this.params.phi);
    if (ke <= 0) return;
    const e = this.electrons.find(function (q) { return !q.active; });
    if (!e) return;
    e.x = PLATE_X + 0.35;
    e.y = y;
    e.z = z;
    e.ke = ke;
    e.vx = 0.16 + 0.06 * ke;
    e.ax = -0.0022 * Math.max(0, this.params.Vstop) * (0.16 + 0.06 * ke) / Math.max(0.25, ke);
    e.active = true;
    e.mesh.visible = true;
  }

  tick() {
    // animation runs in _animate; tick kept for dualView compatibility
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);

    if (!this.paused && this._active) {
      if (Math.random() < this.params.intensity * 0.9) this._spawnPhoton();

      let collected = false;
      for (let i = 0; i < this.photons.length; i++) {
        const p = this.photons[i];
        if (!p.active) continue;
        p.x += 0.32;
        p.mesh.position.set(p.x, p.y, p.z);
        if (p.x >= PLATE_X - 0.1) {
          p.active = false;
          p.mesh.visible = false;
          this._ejectElectron(p.y, p.z);
        }
      }
      for (let i = 0; i < this.electrons.length; i++) {
        const e = this.electrons[i];
        if (!e.active) continue;
        e.vx += e.ax;
        e.x += e.vx;
        e.mesh.position.set(e.x, e.y, e.z);
        if (e.x >= ANODE_X - 0.2) {
          e.active = false;
          e.mesh.visible = false;
          collected = true;
        } else if (e.vx <= 0) {
          e.active = false;
          e.mesh.visible = false;
        }
      }
      if (collected) {
        this.anode.material.emissiveIntensity = 0.55;
        this._anodeGlow.visible = true;
      } else {
        this.anode.material.emissiveIntensity *= 0.92;
        if (this.anode.material.emissiveIntensity < 0.05) {
          this.anode.material.emissiveIntensity = 0;
          this._anodeGlow.visible = false;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
