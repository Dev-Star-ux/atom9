// 3D cavity modes — Rayleigh–Jeans divergence vs Planck cutoff.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel, glassMaterial } from '../common/sceneVisuals.js';

export class RayleighJeansScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 9, 18], target: [0, 0, 0] });
    this.temp = 5000;
    this.modeGroup = new THREE.Group();
    this.scene.add(this.modeGroup);
    this._build();
  }

  _build() {
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 5),
      glassMaterial(0x1e293b, 0.22),
    );
    this.scene.add(cavity);
    this.source = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.45 }),
    );
    this.tip(this.source, 'cavity');
    attachGlow(this.source, 0xfbbf24, 2.4);
    this.scene.add(this.source);
    this.scene.add(placeLabel('UV catastrophe', 0, 3.2, 0, '#f87171'));
    this._rebuildModes();
  }

  setParams({ temp }) {
    if (temp != null) this.temp = temp;
    this._rebuildModes();
  }

  _rebuildModes() {
    while (this.modeGroup.children.length) this.modeGroup.remove(this.modeGroup.children[0]);
    for (let n = 1; n <= 8; n++) {
      const amp = n <= 3 ? 0.35 : 0.15 + n * 0.12;
      const geo = new THREE.TorusKnotGeometry(0.8 + n * 0.15, 0.04, 64, 8, 2, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: n > 5 ? 0xef4444 : 0x38bdf8,
        transparent: true,
        opacity: Math.min(0.85, amp),
        wireframe: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.set(n * 0.2, n * 0.35, 0);
      this.modeGroup.add(m);
    }
  }

  tick(dt) {
    this.modeGroup.rotation.y += dt * 0.25;
  }

  _bindTips() {
    if (this._tipTexts.cavity) this.source.userData.tip = this._tipTexts.cavity;
  }
}
