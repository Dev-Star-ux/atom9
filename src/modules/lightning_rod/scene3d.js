// Lightning rod (Franklin rod) — 3D rolling-sphere protection schematic.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { strikingDistance, protectionRadius } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  glassMaterial,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

// Visual (not physical) scaling: keeps the schematic framed nicely across the
// full slider range (h: 1-30 m, I: 2-200 kA => r_s can span ~5-360 m) while
// preserving the true tangency geometry (uniform scale keeps all ratios exact).
function sceneScale(rs, h) {
  return 5 / Math.max(rs, h, 3);
}

export class LightningRodScene3D {
  constructor(container) {
    this.container = container;
    this.h = 8;
    this.I = 10;
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(9, 6, 11);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 40, 0);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this.setParams({ h: this.h, I: this.I });
  }

  _buildStage() {
    // Ground disc (slightly below the grid to avoid z-fighting).
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(20, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.scene.add(ground);

    // Building block topped by the rod — rounded-edge concrete/masonry
    // housing (roundedBoxGeometry already has width/X, height/Y, depth/Z —
    // no extra rotation needed for a plain upright block).
    this.buildingMesh = new THREE.Mesh(
      roundedBoxGeometry(1.4, 1, 1.4, 0.08, 3),
      plasticMaterial(0x64748b, { roughness: 0.88 })
    );
    this.scene.add(this.buildingMesh);
    this.scene.add(contactShadow(1.05, 1.05, 0.48).translateY(0.02));

    // Grounded rod — brushed-metal conductor (real lightning rods are bare
    // or galvanized metal, not a flat cartoon color).
    this.rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.06, 1, 12),
      metalMaterial(0xb6c2d1, { metalness: 0.85, roughness: 0.28, emissive: 0x1a1400, emissiveIntensity: 0.12 })
    );
    this.scene.add(this.rodMesh);
    tip(this.rodMesh, 'Grounded rod', 'A sharp grounded conductor: its tip concentrates the electric field, then safely conducts the captured strike current to earth.');

    // Rolling sphere — translucent, tangent to both the rod tip and the ground.
    this.sphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      glassMaterial(0x38bdf8, 0.14)
    );
    this.scene.add(this.sphereMesh);
    tip(this.sphereMesh, 'Rolling sphere (r_s)', 'Imaginary sphere of radius = striking distance r_s, rolled over the terrain. Anywhere it touches is exposed; anywhere it cannot reach is protected.');

    // Protected zone disc on the ground.
    this.zoneMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    this.zoneMesh.rotation.x = -Math.PI / 2;
    this.zoneMesh.position.y = 0.015;
    this.scene.add(this.zoneMesh);
    tip(this.zoneMesh, 'Protected zone (R_p)', 'Ground footprint the rolling sphere can never touch while resting against the rod tip — the region shielded from a direct strike.');

    // Labels.
    this.rodLabel = placeLabel('grounded rod', 0, 1, 0, '#facc15', 1.05);
    this.scene.add(this.rodLabel);
    this.sphereLabel = placeLabel('rolling sphere (r_s)', 0, 1, 0, '#7dd3fc', 1.05);
    this.scene.add(this.sphereLabel);
    this.zoneLabel = placeLabel('protected zone (R_p)', 0, 0.2, 0, '#fde68a', 1.0);
    this.scene.add(this.zoneLabel);
    this.iLabel = placeLabel('I = 10 kA', 0, 4.4, 0, '#e0f2fe', 1.1);
    this.scene.add(this.iLabel);

    // Deterministic jagged lightning bolt (points regenerated in _rebuildBolt).
    this.boltLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.9 })
    );
    this.boltLine.visible = false;
    this.scene.add(this.boltLine);
    this._boltSegs = 9;
  }

  setParams(p) {
    if (!p) return;
    if (p.h != null) this.h = p.h;
    if (p.I != null) this.I = p.I;

    const rs = strikingDistance(this.I);
    const Rp = protectionRadius(this.h, rs);
    const k = sceneScale(rs, this.h);
    this._k = k;
    this._rs = rs;
    this._Rp = Rp;

    const hS = this.h * k;
    const rsS = Math.max(0.05, rs * k);
    const RpS = Math.max(0.02, Rp * k);
    const buildingH = Math.min(hS * 0.55, hS - 0.15 > 0 ? hS - 0.15 : hS * 0.5);
    const rodLen = Math.max(0.1, hS - buildingH);

    // Rebuild geometry-dependent meshes (Cylinder/Box/Circle/Sphere sizes are immutable).
    this.buildingMesh.geometry.dispose();
    this.buildingMesh.geometry = roundedBoxGeometry(1.4, buildingH, 1.4, 0.08, 3);
    this.buildingMesh.position.set(0, buildingH / 2, 0);

    this.rodMesh.geometry.dispose();
    this.rodMesh.geometry = new THREE.CylinderGeometry(0.045, 0.06, rodLen, 12);
    this.rodMesh.position.set(0, buildingH + rodLen / 2, 0);
    const tipY = buildingH + rodLen;

    this.sphereMesh.geometry.dispose();
    this.sphereMesh.geometry = new THREE.SphereGeometry(rsS, 32, 24);
    this.sphereMesh.position.set(RpS, rsS, 0);

    this.zoneMesh.geometry.dispose();
    this.zoneMesh.geometry = new THREE.CircleGeometry(RpS, 48);

    this.rodLabel.position.set(0.4, tipY + 0.35, 0);
    this.sphereLabel.position.set(RpS, rsS + rsS * 0.55 + 0.25, 0);
    this.zoneLabel.position.set(RpS + 0.3, 0.25, 0);
    this.iLabel.position.set(0, tipY + 1.1, 0);

    this._tipY = tipY;
    this._updateLabels();
    this._rebuildBolt();

    this.controls.target.set(0, Math.max(1, tipY * 0.4), 0);
    const dist = Math.max(8, (rsS + RpS) * 1.4);
    if (this.camera.position.length() < dist * 0.6) {
      this.camera.position.setLength(dist);
    }
  }

  _updateLabels() {
    const lbl = this.iLabel;
    if (lbl && lbl.material && lbl.material.map) {
      const cv = lbl.material.map.image;
      if (cv && cv.getContext) {
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(10,17,34,0.78)';
        ctx.fillRect(4, 6, 376, 36);
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '600 16px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          'I = ' + this.I.toFixed(0) + ' kA   r_s = ' + this._rs.toFixed(1) + ' m   R_p = ' + this._Rp.toFixed(1) + ' m',
          192, 24
        );
        lbl.material.map.needsUpdate = true;
      }
    }
  }

  _rebuildBolt() {
    const k = this._k;
    const tipY = this._tipY;
    const startY = tipY + 4.5;
    const segs = this._boltSegs;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const y = startY + (tipY - startY) * f;
      // Deterministic zigzag — not per-frame random.
      const jag = Math.sin(i * 2.1) * 0.35 * (1 - f * 0.5);
      const jagZ = Math.cos(i * 1.7) * 0.3 * (1 - f * 0.5);
      pts.push(new THREE.Vector3(jag, y, jagZ));
    }
    pts[segs].set(0, tipY, 0);
    if (this.boltLine.geometry) this.boltLine.geometry.dispose();
    this.boltLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.boltLine.geometry.setDrawRange(0, 0);
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.rodMesh, this.sphereMesh, this.zoneMesh].filter(Boolean);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this._alive = false;
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);
    if (this._active && !this.paused && this.boltLine.geometry) {
      this.phase += 0.016;
      const cyclePos = this.phase % 3.0;
      const total = this._boltSegs + 1;
      if (cyclePos < 0.5) {
        const t = cyclePos / 0.5;
        this.boltLine.visible = true;
        this.boltLine.material.opacity = 0.9 * (1 - t * 0.3);
        this.boltLine.geometry.setDrawRange(0, Math.max(2, Math.floor(t * total)));
      } else {
        this.boltLine.visible = false;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
