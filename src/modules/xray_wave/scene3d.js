// 3D Bragg chamber — crystal planes, glancing X-rays, bright reflection when nλ = 2d sin θ.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  attachGlow,
  placeLabel,
} from '../common/sceneVisuals.js';
import { braggSummary, braggIntensity } from './physics.js';

export class XrayWaveScene {
  constructor(container) {
    this.container = container;
    this.lam = 100;
    this.d = 200;
    this.theta = 30;
    this.paused = false;
    this._active = false;
    this.phase = 0;
    this._packets = [];

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(4, 7, 14);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.2, 0);
    addStudioLights(this.scene);

    this.pktGroup = new THREE.Group();
    this.scene.add(this.pktGroup);

    this._build();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._updateBeams();
  }

  _build() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.4;
    this.scene.add(floor);

    // Crystal block with visible planes
    this.crystal = new THREE.Group();
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.35,
      roughness: 0.45,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    this._planes = [];
    for (let i = -3; i <= 3; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), planeMat.clone());
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = i * 0.38;
      this.crystal.add(plane);
      this._planes.push(plane);
      // atom dots
      for (let ix = -2; ix <= 2; ix++) {
        for (let iz = -2; iz <= 2; iz++) {
          const a = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.35 })
          );
          a.position.set(ix * 0.7, i * 0.38, iz * 0.55);
          this.crystal.add(a);
        }
      }
    }
    this.scene.add(this.crystal);
    tip(this.crystal, 'Crystal planes', 'Parallel atomic planes separated by d. Specular reflection + interference → Bragg peaks.');

    // d bracket visual (side rod)
    this.dBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.38, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa })
    );
    this.dBar.position.set(2.4, 0.19, 0);
    this.scene.add(this.dBar);

    // Incident beam cylinder (reoriented each update)
    this.incBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 7, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    this.scene.add(this.incBeam);
    this._incGlow = attachGlow(this.incBeam, 0x38bdf8, 1.3);

    this.refBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 7, 10),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9 })
    );
    this.scene.add(this.refBeam);
    this._refGlow = attachGlow(this.refBeam, 0x4ade80, 1.5);

    // Detector plate
    this.detector = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.6, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x14532d,
        emissiveIntensity: 0,
      })
    );
    this.scene.add(this.detector);
    tip(this.detector, 'Detector', 'Bright when Bragg condition nλ = 2d sin θ is met.');

    // Source block
    this.source = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.4 })
    );
    this.scene.add(this.source);
    tip(this.source, 'X-ray source', 'Monochromatic X-rays of wavelength λ. Wave nature shown by interference.');

    this._lblTitle = placeLabel("Bragg  nλ = 2d sin θ", 0, 3.2, 0, '#e2e8f0', 1.05);
    this.scene.add(this._lblTitle);
    this._lblD = placeLabel('d', 2.7, 0.3, 0, '#a78bfa', 0.9);
    this.scene.add(this._lblD);
    this._lblTheta = placeLabel('θ', -1.2, 1.6, 0, '#fbbf24', 0.9);
    this.scene.add(this._lblTheta);
    this._lblStatus = placeLabel('constructive', 0, -2.2, 0, '#4ade80', 1.0);
    this.scene.add(this._lblStatus);
  }

  setParams(p) {
    if (!p) return;
    if (p.lam != null) this.lam = p.lam;
    if (p.d != null) this.d = p.d;
    if (p.theta != null) this.theta = p.theta;
    this._updateBeams();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (tips && tips.crystal) tip(this.crystal, tips.crystal.title, tips.crystal.desc);
    if (tips && tips.source) tip(this.source, tips.source.title, tips.source.desc);
    if (tips && tips.detector) tip(this.detector, tips.detector.title, tips.detector.desc);
  }

  getPickables() {
    return [this.crystal, this.source, this.detector];
  }

  _placeCylinder(mesh, ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    mesh.scale.set(1, len / 7, 1); // geometry height was 7
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx / len, dy / len, dz / len)
    );
  }

  _updateBeams() {
    const rad = (this.theta * Math.PI) / 180;
    const s = braggSummary(this.lam, this.d, this.theta);
    const I = braggIntensity(this.theta, this.d, this.lam);
    const bright = s.bright;

    // Scale plane spacing slightly with d
    const gap = 0.28 + (this.d / 400) * 0.28;
    for (let i = 0; i < this._planes.length; i++) {
      const k = i - 3;
      this._planes[i].position.y = k * gap;
    }
    this.dBar.scale.y = gap / 0.38;
    this.dBar.position.y = gap / 2;

    // Hit point at origin-ish
    const hx = 0;
    const hy = gap / 2;
    const hz = 0;
    const reach = 5.5;

    // Incident from upper-left (glancing θ to horizontal planes)
    const ix = -Math.cos(rad);
    const iy = Math.sin(rad);
    const sx = hx + ix * reach;
    const sy = hy + iy * reach;
    const sz = 0;

    // Specular reflection
    const rx = Math.cos(rad);
    const ry = Math.sin(rad);
    const dx = hx + rx * reach;
    const dy = hy + ry * reach;

    this._placeCylinder(this.incBeam, sx, sy, sz, hx, hy, hz);
    this._placeCylinder(this.refBeam, hx, hy, hz, dx, dy, 0);

    this.source.position.set(sx, sy, sz);
    this.detector.position.set(dx, dy, 0);
    // Face detector toward crystal
    this.detector.lookAt(hx, hy, hz);

    this.incBeam.material.opacity = 0.75;
    this.refBeam.material.color.setHex(bright ? 0x4ade80 : 0x475569);
    this.refBeam.material.opacity = bright ? 0.95 : 0.35;
    this._refGlow.visible = bright;
    this.detector.material.emissiveIntensity = bright ? 0.65 : 0;
    this.detector.material.color.setHex(bright ? 0x4ade80 : 0x64748b);

    // Status label rebuild
    this.scene.remove(this._lblStatus);
    this._lblStatus = placeLabel(
      bright ? 'CONSTRUCTIVE  δ ≈ nλ' : 'destructive  (out of phase)',
      0,
      -2.4,
      0,
      bright ? '#4ade80' : '#94a3b8',
      1.0
    );
    this.scene.add(this._lblStatus);

    this._lblTheta.position.set(-1.4, hy + 1.2, 0.5);

    this._bright = bright;
    this._I = I;
    this._hit = { x: hx, y: hy, z: hz };
    this._src = { x: sx, y: sy, z: sz };
    this._det = { x: dx, y: dy, z: 0 };
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    this.phase += dt;
    const rate = 2 + (this._I || 0) * 4;
    this._emit = (this._emit || 0) + dt * rate;
    while (this._emit >= 1 && this._packets.length < 28) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      m.position.set(this._src.x, this._src.y, this._src.z);
      this.pktGroup.add(m);
      this._packets.push({ mesh: m, u: 0, stage: 0 });
    }

    const keep = [];
    for (let i = 0; i < this._packets.length; i++) {
      const p = this._packets[i];
      p.u += dt * 0.55;
      if (p.stage === 0) {
        const t = Math.min(1, p.u);
        p.mesh.position.set(
          this._src.x + (this._hit.x - this._src.x) * t,
          this._src.y + (this._hit.y - this._src.y) * t,
          this._src.z
        );
        if (t >= 1) {
          p.stage = 1;
          p.u = 0;
          p.mesh.material.color.setHex(this._bright ? 0x4ade80 : 0x64748b);
        }
        keep.push(p);
      } else {
        const t = Math.min(1, p.u);
        p.mesh.position.set(
          this._hit.x + (this._det.x - this._hit.x) * t,
          this._hit.y + (this._det.y - this._hit.y) * t,
          0
        );
        if (t < 1) keep.push(p);
        else this.pktGroup.remove(p.mesh);
      }
    }
    this._packets = keep;
  }

  resize() {
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.renderer) {
      this.renderer.dispose();
      const el = this.renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }
}
