// 3D X-ray particle model — photons scatter off electrons (Compton-like).
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';

export class XrayParticleScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 7, 15], target: [0, 0, 0] });
    this.angle = 45;
    this.energy = 50;
    this.photons = [];
    this._emit = 0;
    this._build();
  }

  _build() {
    this.target = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
    );
    this.tip(this.target, 'electron');
    this.scene.add(this.target);
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
    );
    attachGlow(this.electron, 0x67e8f9, 1);
    this.scene.add(this.electron);
    this.scene.add(placeLabel('particle X-rays', 0, 2, 0));
    this.pGroup = new THREE.Group();
    this.scene.add(this.pGroup);
  }

  setParams({ angle, energy }) {
    if (angle != null) this.angle = angle;
    if (energy != null) this.energy = energy;
  }

  tick(dt) {
    this._emit += dt * 3;
    while (this._emit >= 1 && this.photons.length < 15) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
      );
      attachGlow(m, 0x4ade80, 0.9);
      m.position.set(-4, 0, 0);
      this.pGroup.add(m);
      this.photons.push({ mesh: m, x: -4, scattered: false });
    }
    const rad = (this.angle * Math.PI) / 180;
    for (const p of this.photons) {
      if (!p.scattered) {
        p.x += dt * 8;
        p.mesh.position.x = p.x;
        if (p.x >= -0.3) {
          p.scattered = true;
          p.vx = Math.cos(rad) * 5;
          p.vy = Math.sin(rad) * 5;
        }
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
      }
    }
    this.photons = this.photons.filter((p) => p.mesh.position.x < 6 && p.mesh.position.y < 5);
    for (const p of this.photons) {
      if (p.mesh.position.x > 5 || p.mesh.position.y > 4) this.pGroup.remove(p.mesh);
    }
    this.photons = this.photons.filter((p) => p.mesh.position.x < 5);
  }

  _bindTips() {
    if (this._tipTexts.electron) this.target.userData.tip = this._tipTexts.electron;
  }
}
