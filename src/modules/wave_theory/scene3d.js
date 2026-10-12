// 3D wave theory failure — classical accumulation vs instant photoelectric ejection.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';
import { keMaxEV } from './physics.js';

export class WaveTheoryScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 7, 16], target: [0, 0, 0], gridY: -3 });
    this.freq = 7;
    this.intensity = 60;
    this.accum = 0;
    this.phase = 0;
    this._build();
  }

  _build() {
    this.classical = new THREE.Group();
    this.quantum = new THREE.Group();
    this.classical.position.x = -4;
    this.quantum.position.x = 4;
    this.scene.add(this.classical, this.quantum);

    const plateL = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2.5, 2),
      new THREE.MeshStandardMaterial({ color: 0x64748b }),
    );
    this.classical.add(plateL);
    this.tip(plateL, 'plateN');
    this.waveLines = [];
    for (let i = 0; i < 5; i++) {
      const ln = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xf87171 }),
      );
      ln.position.set(-2 + i * 0.5, 0, (i - 2) * 0.4);
      this.classical.add(ln);
      this.waveLines.push(ln);
    }
    this.fillBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.01, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xf87171 }),
    );
    this.fillBar.position.set(0.6, -1.2, 0);
    this.classical.add(this.fillBar);
    this.scene.add(placeLabel('classical wave', -4, 2.2, 0, '#f87171'));

    const plateR = plateL.clone();
    this.quantum.add(plateR);
    this.tip(plateR, 'plateP');
    this.photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 0.5 }),
    );
    attachGlow(this.photon, 0x4ade80, 1.6);
    this.quantum.add(this.photon);
    this.electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
    );
    attachGlow(this.electron, 0x67e8f9, 1.2);
    this.quantum.add(this.electron);
    this.scene.add(placeLabel('quantum photon', 4, 2.2, 0, '#4ade80'));
  }

  setParams({ freq, intensity, accum }) {
    if (freq != null) this.freq = freq;
    if (intensity != null) this.intensity = intensity;
    if (accum != null) this.accum = accum;
  }

  tick(dt) {
    this.phase += dt * 3;
    this.waveLines.forEach((ln, i) => {
      ln.position.y = Math.sin(this.phase + i * 0.6) * 0.8;
    });
    const h = Math.max(0.05, this.accum * 2);
    this.fillBar.scale.y = h;
    this.fillBar.position.y = -1.2 + h * 0.5;
    const ke = keMaxEV(this.freq);
    this.photon.position.set(-1.2 + (this.phase % 1.2) * 1.5, 0.3, 0);
    this.electron.visible = ke > 0;
    if (ke > 0 && this.photon.position.x > 0.2) {
      this.electron.position.set(0.8, 0.5 + ke * 0.15, 0);
    } else {
      this.electron.position.set(0.5, 0, 0);
    }
  }

  _bindTips() {
    const t = this._tipTexts;
    if (t.plateN) this.classical.children[0].userData.tip = t.plateN;
    if (t.plateP) this.quantum.children[0].userData.tip = t.plateP;
  }
}
