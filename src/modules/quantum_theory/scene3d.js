// 3D photon model — photons strike metal, eject electrons when hν > φ.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';
import { keMaxEV, photonColor, MATERIALS } from './physics.js';

export class QuantumTheoryScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 6, 14], target: [0, 0, 0] });
    this.freq = 8;
    this.material = 'sodium';
    this.photons = [];
    this.electrons = [];
    this._emit = 0;
    this._build();
  }

  _build() {
    this.metal = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 }),
    );
    this.metal.position.y = -0.5;
    this.tip(this.metal, 'plateN');
    this.scene.add(this.metal);
    this.scene.add(placeLabel('photoelectric', 0, 2, 0));
    this.pGroup = new THREE.Group();
    this.eGroup = new THREE.Group();
    this.scene.add(this.pGroup, this.eGroup);
    this.gun = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569 }),
    );
    this.gun.rotation.z = Math.PI / 2;
    this.gun.position.set(-5, 1, 0);
    this.tip(this.gun, 'source');
    this.scene.add(this.gun);
  }

  setParams({ freq, material }) {
    if (freq != null) this.freq = freq;
    if (material != null) this.material = material;
  }

  tick(dt) {
    this._emit += dt * 4;
    while (this._emit >= 1 && this.photons.length < 25) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(photonColor(this.freq)) }),
      );
      attachGlow(m, photonColor(this.freq), 0.9);
      m.position.set(-4, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
      this.pGroup.add(m);
      this.photons.push({ mesh: m, x: m.position.x, hit: false });
    }
    const work = MATERIALS[this.material];
    const ke = keMaxEV(this.freq, work);
    for (const p of this.photons) {
      if (!p.hit) {
        p.x += dt * 6;
        p.mesh.position.x = p.x;
        if (p.x >= -0.5) {
          p.hit = true;
          this.pGroup.remove(p.mesh);
          if (ke > 0) {
            const e = new THREE.Mesh(
              new THREE.SphereGeometry(0.1, 8, 8),
              new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
            );
            attachGlow(e, 0x67e8f9, 1);
            e.position.set(0, 0.2, 0);
            this.eGroup.add(e);
            this.electrons.push({ mesh: e, vx: 2 + ke, vy: 1.5 + ke * 0.3, life: 2 });
          }
        }
      }
    }
    this.photons = this.photons.filter((p) => !p.hit);
    for (let i = this.electrons.length - 1; i >= 0; i--) {
      const e = this.electrons[i];
      e.mesh.position.x += e.vx * dt;
      e.mesh.position.y += e.vy * dt;
      e.life -= dt;
      if (e.life <= 0) { this.eGroup.remove(e.mesh); this.electrons.splice(i, 1); }
    }
  }

  _bindTips() {
    const t = this._tipTexts;
    if (t.plateN) this.metal.userData.tip = t.plateN;
    if (t.source) this.gun.userData.tip = t.source;
  }
}
