import * as THREE from "three";
import { SceneShell } from "../common/sceneBase.js";
import { attachGlow, placeLabel, glassMaterial } from "../common/sceneVisuals.js";
import {
  pmtGain,
  solarCurrentUA,
  dynodePos3D,
  anodePos,
  cathodePos,
  CATHODE_X,
  ANODE_X
} from "./physics.js";
export class ApplicationsScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 2.5, 13], target: [0, 0, 0], gridY: -2.5 });
    this.device = "pmt";
    this.nDynodes = 6;
    this.delta = 3;
    this.intensity = 60;
    this.particles = [];
    this._photonTimer = 0;
    this._anodeCount = 0;
    this._solarCurrent = 0;
    this._build();
    this.setParams({ device: "pmt" });
    this._prewarm();
  }
  _prewarm() {
    if (this.device === "pmt") {
      this._spawnPhoton();
      this._photonTimer = 0.4;
    } else {
      for (let i = 0; i < 3; i++) this._spawnSolarPhoton();
    }
  }
  _spawnSolarPhoton() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 16639626 })
    );
    attachGlow(m, 16498468, 1.3);
    m.position.set(-4.5 + Math.random() * 0.3, 2.2, (Math.random() - 0.5) * 0.5);
    this.particleGroup.add(m);
    this.particles.push({
      mesh: m,
      kind: "sunPhoton",
      target: new THREE.Vector3(0, 0, 0),
      speed: 6
    });
  }
  _build() {
    this.pmtGroup = new THREE.Group();
    this.solarGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    this.scene.add(this.pmtGroup, this.solarGroup, this.particleGroup);
    this._buildPMT();
    this._buildSolar();
  }
  _buildPMT() {
    while (this.pmtGroup.children.length) this.pmtGroup.remove(this.pmtGroup.children[0]);
    this.dynodeMeshes = [];
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 10.5, 24, 1, true),
      glassMaterial(0x334155, 0.18)
    );
    tube.rotation.z = Math.PI / 2;
    this.pmtGroup.add(tube);
    this.cathode = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 4674921, metalness: 0.85, emissive: 1976635, emissiveIntensity: 0.3 })
    );
    this.cathode.position.copy(cathodePos());
    this.tip(this.cathode, "photocathode");
    this.pmtGroup.add(this.cathode);
    attachGlow(this.cathode, 6583435, 1.4);
    for (let i = 0; i < this.nDynodes; i++) {
      const pos = dynodePos3D(i, this.nDynodes);
      const d = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.1, 0.7),
        new THREE.MeshStandardMaterial({ color: 9741240, metalness: 0.75 })
      );
      d.position.copy(pos);
      d.userData.dynodeIndex = i;
      this.tip(d, "dynode");
      this.pmtGroup.add(d);
      this.dynodeMeshes.push(d);
      this.pmtGroup.add(placeLabel(`D${i + 1}`, pos.x, pos.y + 0.85, 0));
    }
    this.anode = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.4, 1),
      new THREE.MeshStandardMaterial({ color: 16498468, metalness: 0.8, emissive: 16096779, emissiveIntensity: 0.35 })
    );
    this.anode.position.copy(anodePos());
    this.tip(this.anode, "anode");
    this.pmtGroup.add(this.anode);
    attachGlow(this.anode, 16498468, 1.6);
    this.pmtGroup.add(placeLabel("photon in", CATHODE_X, 2.2, 0));
    this.pmtGroup.add(placeLabel("electrons \xD7\u03B4 each stage", 0, -1.8, 0));
    this.pmtGroup.add(placeLabel("anode pulse", ANODE_X, 1.5, 0));
  }
  _buildSolar() {
    while (this.solarGroup.children.length) this.solarGroup.remove(this.solarGroup.children[0]);
    this.lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshStandardMaterial({ color: 16498468, emissive: 16096779, emissiveIntensity: 1 })
    );
    this.lamp.position.set(-4.5, 2.2, 0);
    this.tip(this.lamp, "lamp");
    this.solarGroup.add(this.lamp);
    attachGlow(this.lamp, 16498468, 2.8);
    const pLayer = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 2.2),
      new THREE.MeshStandardMaterial({ color: 3900150, emissive: 1920728, emissiveIntensity: 0.2 })
    );
    pLayer.position.set(-0.9, 0, 0);
    this.tip(pLayer, "pSide");
    this.solarGroup.add(pLayer);
    const nLayer = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.35, 2.2),
      new THREE.MeshStandardMaterial({ color: 6583435, emissive: 3359061, emissiveIntensity: 0.15 })
    );
    nLayer.position.set(0.9, 0, 0);
    this.tip(nLayer, "nSide");
    this.solarGroup.add(nLayer);
    this.junction = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 2.4),
      new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0.6 })
    );
    this.tip(this.junction, "junction");
    this.solarGroup.add(this.junction);
    const wireMat = new THREE.LineBasicMaterial({ color: 16498468 });
    const wirePts = [
      new THREE.Vector3(2.2, 0.3, 0),
      new THREE.Vector3(3.5, 0.3, 0),
      new THREE.Vector3(3.5, -1.2, 0),
      new THREE.Vector3(-3.5, -1.2, 0),
      new THREE.Vector3(-3.5, 0.3, 0),
      new THREE.Vector3(-2.2, 0.3, 0)
    ];
    for (let i = 0; i < wirePts.length - 1; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([wirePts[i], wirePts[i + 1]]);
      this.solarGroup.add(new THREE.Line(geo, wireMat));
    }
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 16498468, emissive: 16096779, emissiveIntensity: 0.8 })
    );
    bulb.position.set(0, -1.2, 0);
    this.tip(bulb, "load");
    this.solarGroup.add(bulb);
    this.solarGroup.add(placeLabel("sunlight", -4.5, 2.9, 0));
    this.solarGroup.add(placeLabel("p-type", -0.9, 1.1, 0));
    this.solarGroup.add(placeLabel("n-type", 0.9, 1.1, 0));
    this.solarGroup.add(placeLabel("e\u207B \u2192", 2.5, 0.5, 0));
    this.solarGroup.add(placeLabel("\u2190 h\u207A", -2.5, 0.5, 0));
    this.solarGroup.add(placeLabel("load", 0, -1.7, 0));
  }
  setParams({ device, nDynodes, delta, intensity }) {
    const deviceChanged = device != null && device !== this.device;
    const rebuild = nDynodes != null && nDynodes !== this.nDynodes;
    if (device != null) this.device = device;
    if (nDynodes != null) this.nDynodes = nDynodes;
    if (delta != null) this.delta = delta;
    if (intensity != null) this.intensity = intensity;
    if (rebuild) this._buildPMT();
    this.pmtGroup.visible = this.device === "pmt";
    this.solarGroup.visible = this.device === "solar";
    if (deviceChanged) {
      this._clearParticles();
      this._prewarm();
    }
  }
  _clearParticles() {
    var _a, _b;
    for (const p of this.particles) {
      this.particleGroup.remove(p.mesh);
      (_a = p.mesh.geometry) == null ? void 0 : _a.dispose();
      (_b = p.mesh.material) == null ? void 0 : _b.dispose();
    }
    this.particles = [];
  }
  getStats() {
    if (this.device === "pmt") {
      return { gain: pmtGain(this.nDynodes, this.delta), pulseCount: this._anodeCount };
    }
    const { iUA, powerUW } = solarCurrentUA(this.intensity, this._solarCurrent);
    return { iUA, powerUW, current: this._solarCurrent };
  }
  tick(dt) {
    if (this.device === "pmt") this._tickPMT(dt);
    else this._tickSolar(dt);
    this._updateParticles(dt);
  }
  _tickPMT(dt) {
    this._photonTimer += dt;
    if (this._photonTimer >= 0.85 && this.particles.length < 120) {
      this._photonTimer = 0;
      this._spawnPhoton();
    }
  }
  _spawnPhoton() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 8843180 })
    );
    attachGlow(m, 8843180, 1.5);
    m.position.set(CATHODE_X, 2.5, 0);
    this.particleGroup.add(m);
    this.particles.push({
      mesh: m,
      kind: "photon",
      target: cathodePos(),
      speed: 7
    });
  }
  _spawnElectron(pos, stage) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshBasicMaterial({ color: 3718648 })
    );
    attachGlow(m, 3718648, 1.1);
    m.position.copy(pos);
    m.position.y += (Math.random() - 0.5) * 0.15;
    m.position.z += (Math.random() - 0.5) * 0.1;
    this.particleGroup.add(m);
    const nextTarget = stage >= this.nDynodes ? anodePos() : dynodePos3D(stage, this.nDynodes);
    this.particles.push({
      mesh: m,
      kind: "electron",
      stage,
      target: nextTarget.clone(),
      speed: 8
    });
  }
  _tickSolar(dt) {
    const rate = Math.max(0.5, this.intensity / 100 * 8);
    this._photonTimer += dt * rate;
    while (this._photonTimer >= 1 && this.particles.length < 80) {
      this._photonTimer -= 1;
      this._spawnSolarPhoton();
    }
    const res = solarCurrentUA(this.intensity, this._solarCurrent, dt);
    this._solarCurrent = res.current;
    if (this.lamp) {
      const pulse = 0.7 + 0.3 * (this.intensity / 100);
      this.lamp.material.emissiveIntensity = pulse;
    }
  }
  _updateParticles(dt) {
    const born = [];
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dx = p.target.x - p.mesh.position.x;
      const dy = p.target.y - p.mesh.position.y;
      const dz = p.target.z - p.mesh.position.z;
      const dist = Math.hypot(dx, dy, dz) || 1e-3;
      const step = p.speed * dt;
      if (dist <= step) {
        p.mesh.position.copy(p.target);
        if (p.kind === "photon") {
          born.push({ pos: p.target.clone(), stage: 0 });
          this._removeParticle(i);
        } else if (p.kind === "electron") {
          if (p.stage >= this.nDynodes) {
            this._anodeCount++;
            this._removeParticle(i);
          } else {
            const nSec = Math.max(2, Math.floor(this.delta));
            for (let k = 0; k < nSec && born.length < 40; k++) {
              born.push({ pos: p.target.clone(), stage: p.stage + 1 });
            }
            this._removeParticle(i);
          }
        } else if (p.kind === "sunPhoton") {
          born.push({ pos: p.target.clone(), kind: "pair" });
          this._removeParticle(i);
        } else if (p.kind === "carrierE") {
          p.mesh.position.x += dt * 5;
          if (p.mesh.position.x > 3.5) this._removeParticle(i);
        } else if (p.kind === "carrierH") {
          p.mesh.position.x -= dt * 5;
          if (p.mesh.position.x < -3.5) this._removeParticle(i);
        }
      } else {
        p.mesh.position.x += dx / dist * step;
        p.mesh.position.y += dy / dist * step;
        p.mesh.position.z += dz / dist * step;
      }
    }
    for (const b of born) {
      if (b.kind === "pair") {
        this._spawnCarrier(b.pos, "carrierE", 3718648);
        this._spawnCarrier(b.pos, "carrierH", 16020150);
      } else {
        this._spawnElectron(b.pos, b.stage);
      }
    }
  }
  _spawnCarrier(pos, kind, color) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    attachGlow(m, color, 0.9);
    m.position.copy(pos);
    this.particleGroup.add(m);
    this.particles.push({ mesh: m, kind, target: pos.clone(), speed: 0 });
  }
  _removeParticle(i) {
    var _a, _b;
    const p = this.particles[i];
    this.particleGroup.remove(p.mesh);
    (_a = p.mesh.geometry) == null ? void 0 : _a.dispose();
    (_b = p.mesh.material) == null ? void 0 : _b.dispose();
    this.particles.splice(i, 1);
  }
  getPickables() {
    if (this.device === "pmt") {
      return [this.cathode, this.anode, ...this.dynodeMeshes].filter(Boolean);
    }
    return [this.lamp, this.junction, this.solarGroup.children.find((c) => {
      var _a;
      return ((_a = c.userData) == null ? void 0 : _a.tipKey) === "load";
    })].filter(Boolean);
  }
  _bindTips() {
    var _a;
    const t = this._tipTexts;
    for (const obj of this._pickList) {
      const key = (_a = obj == null ? void 0 : obj.userData) == null ? void 0 : _a.tipKey;
      if (key && t[key]) obj.userData.tip = t[key];
    }
  }
}
