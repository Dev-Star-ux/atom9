// 3D Röntgen tube — electrons strike target, emit X-rays toward detector.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, glassTube, placeLabel } from '../common/sceneVisuals.js';

export class XrayDiscoveryScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 6, 14], target: [0, 0, 0] });
    this.voltage = 50;
    this.intensity = 70;
    this.electrons = [];
    this.xrays = [];
    this._emit = 0;
    this._glow = 0;
    this._build();
  }

  _build() {
    const tube = glassTube(1.2, 8, 0.18);
    tube.rotation.z = Math.PI / 2;
    this.scene.add(tube);
    this.cathode = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b }),
    );
    this.cathode.rotation.z = Math.PI / 2;
    this.cathode.position.set(-3.5, 0, 0);
    this.tip(this.cathode, 'cathode');
    this.scene.add(this.cathode);
    this.target = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, emissive: 0x6b4f0a, emissiveIntensity: 0.2 }),
    );
    this.target.position.set(1.5, 0, 0);
    this.tip(this.target, 'anode');
    attachGlow(this.target, 0xffd24a, 2);
    this.scene.add(this.target);
    this.detector = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2.5),
      new THREE.MeshBasicMaterial({ color: 0x14532d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    this.detector.position.set(4.5, 0, 0);
    this.tip(this.detector, 'detector');
    this.scene.add(this.detector);
    this.scene.add(placeLabel('X-ray tube', 0, 2.2, 0));
    this.eGroup = new THREE.Group();
    this.xGroup = new THREE.Group();
    this.scene.add(this.eGroup, this.xGroup);
  }

  setParams({ voltage, intensity, glow }) {
    if (voltage != null) this.voltage = voltage;
    if (intensity != null) this.intensity = intensity;
    if (glow != null) this._glow = glow;
    this.target.material.emissiveIntensity = 0.15 + this._glow * 0.5;
  }

  tick(dt) {
    this._emit += dt * this.intensity * 0.06;
    while (this._emit >= 1 && this.electrons.length < 20) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
      );
      attachGlow(m, 0x38bdf8, 0.9);
      m.position.set(-3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
      this.eGroup.add(m);
      this.electrons.push({ mesh: m, x: -3 });
    }
    for (let i = this.electrons.length - 1; i >= 0; i--) {
      const e = this.electrons[i];
      e.x += dt * (4 + this.voltage * 0.04);
      e.mesh.position.x = e.x;
      if (e.x >= 1.3) {
        this.eGroup.remove(e.mesh);
        this.electrons.splice(i, 1);
        this._glow = 1;
        const x = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
        );
        attachGlow(x, 0x4ade80, 0.8);
        x.position.set(1.5, 0, 0);
        this.xGroup.add(x);
        this.xrays.push({ mesh: x, t: 0 });
      }
    }
    this._glow = Math.max(0, this._glow - dt * 2);
    for (let i = this.xrays.length - 1; i >= 0; i--) {
      const x = this.xrays[i];
      x.t += dt;
      x.mesh.position.x = 1.5 + x.t * 5;
      if (x.t > 1.2) { this.xGroup.remove(x.mesh); this.xrays.splice(i, 1); }
    }
  }

  _bindTips() {
    const t = this._tipTexts;
    if (t.cathode) this.cathode.userData.tip = t.cathode;
    if (t.anode) this.target.userData.tip = t.anode;
    if (t.detector) this.detector.userData.tip = t.detector;
  }
}
