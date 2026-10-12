import * as THREE from "three";
import { SceneShell } from "../common/sceneBase.js";
import { attachGlow, glassTube, placeLabel, glassMaterial } from "../common/sceneVisuals.js";
import { wienPeakNm, blackbodyRgb } from "../bb_features/physics.js";
export class SpectralDensityScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 8, 16], target: [0, 0, 0] });
    this.temp = 5e3;
    this.cursor = 600;
    this._build();
  }
  _build() {
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 4),
      glassMaterial(0x1e293b, 0.25)
    );
    this.scene.add(cavity);
    this.source = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 24, 24),
      new THREE.MeshStandardMaterial({ color: 16777215, emissive: 16755268, emissiveIntensity: 0.6 })
    );
    this.tip(this.source, "cavity");
    attachGlow(this.source, 16755268, 3.2);
    this.scene.add(this.source);
    this.scene.add(placeLabel("blackbody cavity", 0, 2.8, 0));
    this.aperture = glassTube(0.35, 2.5, 0.2);
    this.aperture.rotation.z = Math.PI / 2;
    this.aperture.position.set(4.2, 0, 0);
    this.tip(this.aperture, "slab");
    this.scene.add(this.aperture);
    this.strip = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 0.5),
      new THREE.MeshBasicMaterial({ color: 16777215, side: THREE.DoubleSide })
    );
    this.strip.position.set(0, -2.2, 0);
    this.strip.rotation.x = -0.4;
    this.scene.add(this.strip);
    this._updateColor();
  }
  setParams({ temp, cursor }) {
    if (temp != null) this.temp = temp;
    if (cursor != null) this.cursor = cursor;
    this._updateColor();
  }
  _updateColor() {
    var _a;
    const rgb = blackbodyRgb(this.temp);
    const c = new THREE.Color(rgb);
    this.source.material.color.copy(c);
    this.source.material.emissive.copy(c);
    const peak = wienPeakNm(this.temp);
    const ctx = document.createElement("canvas");
    ctx.width = 256;
    ctx.height = 8;
    const g = ctx.getContext("2d");
    for (let i = 0; i < 256; i++) {
      const nm = 100 + (3e3 - 100) * i / 255;
      const t = nm / peak;
      g.fillStyle = blackbodyRgb(this.temp * (0.7 + 0.6 * Math.exp(-((t - 1) ** 2) * 2)));
      g.fillRect(i, 0, 1, 8);
    }
    (_a = this.strip.material.map) == null ? void 0 : _a.dispose();
    this.strip.material.map = new THREE.CanvasTexture(ctx);
    this.strip.material.needsUpdate = true;
  }
  _bindTips() {
    const tips = this._tipTexts;
    if (tips.cavity) this.source.userData.tip = tips.cavity;
    if (tips.slab) this.aperture.userData.tip = tips.slab;
  }
}
