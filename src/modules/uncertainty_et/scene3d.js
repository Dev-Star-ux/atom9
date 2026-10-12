// 3D ΔE·Δt — wave packet localization in time vs energy width.
import * as THREE from 'three';
import { SceneShell } from '../common/sceneBase.js';
import { attachGlow, placeLabel } from '../common/sceneVisuals.js';

export class UncertaintyETScene extends SceneShell {
  constructor(container) {
    super(container, { cameraPos: [0, 7, 14], target: [0, 0, 0] });
    this.dt = 1e-15;
    this.dE = 0.5;
    this.phase = 0;
    this._build();
  }

  _build() {
    this.envelope = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.2, wireframe: true }),
    );
    this.scene.add(this.envelope);
    this.waveLine = null;
    this.scene.add(placeLabel('ΔE · Δt ≥ ℏ/2', 0, 2.5, 0));
    this.pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.5 }),
    );
    attachGlow(this.pulse, 0xfbbf24, 1.4);
    this.tip(this.envelope, 'packet');
    this.tip(this.pulse, 'photon');
    this._rebuildWave();
  }

  setParams({ dt, dE, phase, tauFs }) {
    if (tauFs != null) {
      this.dt = tauFs * 1e-15;
      this.dE = Math.max(0.05, 0.658 / (2 * tauFs)); // ħ≈0.658 eV·fs
    }
    if (dt != null) this.dt = dt;
    if (dE != null) this.dE = dE;
    if (phase != null) this.phase = phase;
    const w = Math.max(0.4, Math.log10(this.dt * 1e15 + 1));
    this.envelope.scale.set(w, 0.5 + this.dE * 0.3, w);
    this._rebuildWave();
  }

  _rebuildWave() {
    if (this.waveLine) this.scene.remove(this.waveLine);
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64 - 0.5) * 8;
      const env = Math.exp(-t * t / (2 * (this.dt * 1e15) ** 2));
      pts.push(new THREE.Vector3(t, env * Math.sin(t * this.dE * 4 + this.phase), 0));
    }
    this.waveLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
    );
    this.scene.add(this.waveLine);
  }

  tick(dt) {
    this.phase = (this.phase + dt * 4) % (Math.PI * 2);
    this.pulse.position.x = Math.sin(this.phase) * 2;
    this._rebuildWave();
  }
}
