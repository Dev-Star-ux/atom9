// 3D planetary model failures — spiraling electron, collapse, discrete spectrum.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';
import { HYDROGEN_LINES, wavelengthToRgb } from './physics.js';

export class PlanetaryDisadvantagesScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 8, 16], target: [0, 0, 0] });
    this.problem = 'radiation';
    this.angle = 0;
    this.radius = 3;
    this.energy = 100;
    this.collapsed = false;
    this.trailPts = [];
    this.trail = null;
    this._build();
  }

  _build() {
    this.nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5 }),
    );
    this.tip(this.nucleus, 'nucleus');
    attachGlow(this.nucleus, 0xef4444, 2);
    this.scene.add(this.nucleus);
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
    );
    attachGlow(this.electron, 0x38bdf8, 1.2);
    this.scene.add(this.electron);
    this.orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.03, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x233047, transparent: true, opacity: 0.7 }),
    );
    this.orbitRing.rotation.x = Math.PI / 2;
    this.scene.add(this.orbitRing);
    this.specGroup = new THREE.Group();
    this.specGroup.position.set(4, 0, 0);
    this.scene.add(this.specGroup);
    this.scene.add(placeLabel('classical atom', 0, 3, 0));
    this._rebuildSpectrum();
  }

  setParams({ problem, angle, radius, energy, collapsed }) {
    if (problem != null) this.problem = problem;
    if (angle != null) this.angle = angle;
    if (radius != null) this.radius = radius;
    if (energy != null) this.energy = energy;
    if (collapsed != null) this.collapsed = collapsed;
    this.orbitRing.visible = this.problem === 'radiation' && !this.collapsed;
    this.specGroup.visible = this.problem === 'spectrum';
    this._updatePos();
  }

  _rebuildSpectrum() {
    while (this.specGroup.children.length) this.specGroup.remove(this.specGroup.children[0]);
    for (const [nm, int] of HYDROGEN_LINES) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.2 + int, 0.08),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(wavelengthToRgb(nm)) }),
      );
      b.position.y = ((nm - 400) / 400 - 0.5) * 2;
      this.specGroup.add(b);
    }
  }

  _updatePos() {
    if (this.collapsed) {
      this.electron.position.set(0, 0, 0);
      this.electron.scale.setScalar(0.3);
      return;
    }
    this.electron.scale.setScalar(1);
    const r = this.problem === 'stability' ? 2 + Math.sin(this.angle) * 0.5 : this.radius * 0.04;
    this.electron.position.set(r * Math.cos(this.angle), 0, r * Math.sin(this.angle));
    if (this.problem === 'radiation') {
      this.orbitRing.scale.setScalar(this.radius * 0.04 / 3);
      this.trailPts.push(this.electron.position.clone());
      if (this.trailPts.length > 80) this.trailPts.shift();
      if (this.trail) this.scene.remove(this.trail);
      if (this.trailPts.length > 2) {
        const geo = new THREE.BufferGeometry().setFromPoints(this.trailPts);
        this.trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.6 }));
        this.scene.add(this.trail);
      }
    }
  }

  tick(dt) {
    this.angle += dt * (this.problem === 'stability' ? 1.5 : 2);
    this._updatePos();
  }

  _bindTips() {
    if (this._tipTexts.nucleus) this.nucleus.userData.tip = this._tipTexts.nucleus;
  }
}
