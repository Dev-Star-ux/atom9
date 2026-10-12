import * as THREE from "three";
import { SceneShell } from "../common/sceneBase.js";
import { attachGlow, placeLabel, glassMaterial } from "../common/sceneVisuals.js";
import {
  isContinuous,
  raySamplesForSource,
  nmToScreenX,
  wavelengthToCss,
  drawSpectrum,
  blackbodyRgb
} from "./physics.js";
const SCREEN_X = 5.8;
const PRISM_X = 0;
const LAMP_X = -5.5;
const SLIT_X = -3.8;
function triPrismGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.7, -0.5);
  shape.lineTo(0.7, -0.5);
  shape.lineTo(0, 0.75);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
}
export class PrismSpectroscopeScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 3.5, 14], target: [1.5, 0, 0], gridY: -2.2 });
    this.source = "hydrogen";
    this.temp = 5500;
    this.beamPhase = 0;
    this.rays = new THREE.Group();
    this.scene.add(this.rays);
    this._texCanvas = document.createElement("canvas");
    this._texCanvas.width = 512;
    this._texCanvas.height = 160;
    this._texCtx = this._texCanvas.getContext("2d");
    this._build();
    this._rebuildAll();
  }
  _build() {
    this.lampGroup = new THREE.Group();
    this.lampGroup.position.set(LAMP_X, 0.3, 0);
    this.scene.add(this.lampGroup);
    this.filament = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: 16755285, emissive: 16746496, emissiveIntensity: 1.2 })
    );
    this.lampGroup.add(this.filament);
    attachGlow(this.filament, 16755268, 2.2);
    this.dischargeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: 3359061, emissive: 6693546, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
    );
    this.dischargeTube.visible = false;
    this.lampGroup.add(this.dischargeTube);
    attachGlow(this.dischargeTube, 11167487, 1.8);
    this.tip(this.filament, "lamp");
    this.tip(this.dischargeTube, "lamp");
    this.slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.55, 0.35),
      new THREE.MeshStandardMaterial({ color: 1120295, metalness: 0.8 })
    );
    this.slit.position.set(SLIT_X, 0.3, 0);
    this.tip(this.slit, "slit");
    this.scene.add(this.slit);
    this.scene.add(placeLabel("slit", SLIT_X, 1.05, 0));
    this.inBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.2, 10),
      new THREE.MeshBasicMaterial({ color: 16777215 })
    );
    this.inBeam.rotation.z = Math.PI / 2;
    this.inBeam.position.set((LAMP_X + SLIT_X) / 2 + 0.5, 0.3, 0);
    attachGlow(this.inBeam, 16777215, 1.4);
    this.scene.add(this.inBeam);
    this.prism = new THREE.Mesh(
      triPrismGeometry(),
      glassMaterial(0xaaccff, 0.55)
    );
    this.prism.position.set(PRISM_X, 0.15, 0);
    this.tip(this.prism, "prism");
    this.scene.add(this.prism);
    attachGlow(this.prism, 8965375, 1.6);
    this.scene.add(placeLabel("glass prism", PRISM_X, 1.35, 0));
    this._screenTex = new THREE.CanvasTexture(this._texCanvas);
    this._screenTex.needsUpdate = true;
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.35),
      new THREE.MeshBasicMaterial({ map: this._screenTex, side: THREE.DoubleSide })
    );
    this.screen.position.set(SCREEN_X, 0.25, 0);
    this.tip(this.screen, "screen");
    this.scene.add(this.screen);
    this.scene.add(placeLabel("detector screen", SCREEN_X, 1.15, 0));
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 1.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 1976635 })
    );
    frame.position.set(SCREEN_X, 0.25, -0.06);
    this.scene.add(frame);
    this.guide = new THREE.Group();
    const guideMat = new THREE.LineBasicMaterial({ color: 4674921, transparent: true, opacity: 0.5 });
    const pts = [
      new THREE.Vector3(LAMP_X + 0.5, -1.2, 0),
      new THREE.Vector3(SLIT_X, -1.2, 0),
      new THREE.Vector3(PRISM_X, -1.2, 0),
      new THREE.Vector3(SCREEN_X, -1.2, 0)
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([pts[i], pts[i + 1]]);
      this.guide.add(new THREE.Line(geo, guideMat));
    }
    this.scene.add(this.guide);
    this.scene.add(placeLabel("source", LAMP_X, -1.45, 0));
    this.scene.add(placeLabel("spectrum", SCREEN_X, -1.45, 0));
  }
  setParams({ source, temp, beamPhase }) {
    const changed = source != null && source !== this.source || temp != null && temp !== this.temp;
    if (source != null) this.source = source;
    if (temp != null) this.temp = temp;
    if (beamPhase != null) this.beamPhase = beamPhase;
    if (changed || source != null || temp != null) this._rebuildAll();
  }
  _rebuildAll() {
    this._updateLamp();
    this._updateScreenTexture();
    this._rebuildRays();
    this._updateInBeam();
  }
  _updateLamp() {
    const cont = isContinuous(this.source);
    this.filament.visible = cont;
    this.dischargeTube.visible = !cont;
    if (cont) {
      const col = new THREE.Color(blackbodyRgb(this.temp));
      this.filament.material.emissive.copy(col);
      this.filament.material.color.copy(col);
    } else {
      const glow = { hydrogen: 10053375, helium: 16737962, sodium: 16763955 }[this.source] || 8956671;
      this.dischargeTube.material.emissive.set(glow);
    }
  }
  _updateInBeam() {
    const col = isContinuous(this.source) ? blackbodyRgb(this.temp) : { hydrogen: "#b388ff", helium: "#ff88cc", sodium: "#ffd966" }[this.source] || "#ffffff";
    this.inBeam.material.color.set(col);
  }
  _updateScreenTexture() {
    drawSpectrum(this._texCtx, this._texCanvas.width, this._texCanvas.height, this.source, this.temp, { labels: true });
    this._screenTex.needsUpdate = true;
  }
  _screenPoint(nm) {
    const u = nmToScreenX(nm);
    return new THREE.Vector3(SCREEN_X - 1.75 + u * 3.5, 0.25, 0.02);
  }
  _prismExit() {
    return new THREE.Vector3(0.55, 0.35, 0);
  }
  _rebuildRays() {
    var _a, _b;
    while (this.rays.children.length) {
      const c = this.rays.children[0];
      (_a = c.geometry) == null ? void 0 : _a.dispose();
      (_b = c.material) == null ? void 0 : _b.dispose();
      this.rays.remove(c);
    }
    const samples = raySamplesForSource(this.source, this.temp);
    const exit = this._prismExit();
    samples.forEach(([nm, intensity]) => {
      if (intensity < 0.08) return;
      const hit = this._screenPoint(nm);
      const curve = new THREE.LineCurve3(exit, hit);
      const geo = new THREE.TubeGeometry(
        curve,
        4,
        isContinuous(this.source) ? 0.018 : 0.028 + intensity * 0.02,
        5,
        false
      );
      const col = new THREE.Color(wavelengthToCss(nm));
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: isContinuous(this.source) ? 0.35 + 0.45 * intensity : 0.65 + 0.35 * intensity
      });
      this.rays.add(new THREE.Mesh(geo, mat));
    });
  }
  tick(dt) {
    this.beamPhase = (this.beamPhase + dt * 1.2) % (Math.PI * 2);
    const pulse = 0.85 + 0.15 * Math.sin(this.beamPhase * 3);
    if (isContinuous(this.source)) {
      this.filament.material.emissiveIntensity = 0.9 * pulse;
    } else {
      this.dischargeTube.material.emissiveIntensity = 0.45 + 0.35 * pulse;
    }
    this.inBeam.material.opacity = 0.7 + 0.3 * pulse;
    this.inBeam.material.transparent = true;
  }
  _bindTips() {
    var _a;
    const t = this._tipTexts;
    for (const key of ["lamp", "slit", "prism", "screen"]) {
      if (t[key]) {
        for (const obj of this._pickList) {
          if (((_a = obj == null ? void 0 : obj.userData) == null ? void 0 : _a.tipKey) === key) obj.userData.tip = t[key];
        }
      }
    }
  }
}
