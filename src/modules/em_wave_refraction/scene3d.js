// EM wave refraction — microwave/optical bench with dielectric blocks and ray paths.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { degToRad, radToDeg, snellTheta2, criticalAngle, reflectance } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
  dashedGuide,
  glowSphere,
  attachGlow,
} from '../common/sceneVisuals.js';

export class EmWaveRefractionScene3D {
  constructor(container) {
    this.container = container;
    this.state = { n1: 1.0, n2: 1.5, theta1: 30 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.2, 3.6, 6.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.3, 0.35, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.4);

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _makeRay(color) {
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), mat);
    mesh.geometry.translate(0, 0.5, 0);
    return mesh;
  }

  _buildStage() {
    const padY = -1.15;

    // Optical / microwave bench
    const bench = new THREE.Mesh(
      roundedBoxGeometry(7.2, 0.16, 3.0, 0.07, 3),
      metalMaterial(0x1e293b, { metalness: 0.4, roughness: 0.62 }),
    );
    bench.position.set(0.2, padY, 0);
    this.scene.add(bench);
    this.scene.add(contactShadow(3.6, 1.55, 0.42).translateY(padY - 0.08));

    // Rail along bench
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.06, 0.12),
      metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.32 }),
    );
    rail.position.set(0.2, padY + 0.12, -0.95);
    this.scene.add(rail);

    // --- Two dielectric blocks side by side (vertical interface) ---
    const blockH = 1.7;
    const blockD = 1.9;
    const blockW = 1.7;
    const blockY = padY + 0.08 + blockH / 2;

    this.med1 = new THREE.Mesh(
      roundedBoxGeometry(blockW, blockH, blockD, 0.04, 3),
      new THREE.MeshStandardMaterial({
        color: 0x1e40af,
        transparent: true,
        opacity: 0.38,
        metalness: 0.05,
        roughness: 0.55,
        depthWrite: false,
      }),
    );
    this.med1.position.set(-0.85, blockY, 0);
    this.scene.add(this.med1);
    tip(this.med1, 'Medium 1 (n₁)', 'Incident side dielectric. Snell: n₁ sinθ₁ = n₂ sinθ₂.');

    this.med2 = new THREE.Mesh(
      roundedBoxGeometry(blockW, blockH, blockD, 0.04, 3),
      new THREE.MeshStandardMaterial({
        color: 0x047857,
        transparent: true,
        opacity: 0.48,
        metalness: 0.05,
        roughness: 0.5,
        depthWrite: false,
      }),
    );
    this.med2.position.set(0.85, blockY, 0);
    this.scene.add(this.med2);
    tip(this.med2, 'Medium 2 (n₂)', 'Transmitted side. Higher n bends the refracted ray toward the normal.');

    this.interface = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, blockH + 0.05, blockD + 0.05),
      metalMaterial(0x94a3b8, { metalness: 0.45, roughness: 0.45 }),
    );
    this.interface.position.set(0, blockY, 0);
    this.scene.add(this.interface);
    tip(this.interface, 'Interface', 'Reflection always present; TIR when θ₁ > θ_c for n₁ > n₂.');

    for (const x of [-0.85, 0.85]) {
      const foot = new THREE.Mesh(
        roundedBoxGeometry(1.3, 0.1, 1.5, 0.04, 3),
        metalMaterial(0x334155, { metalness: 0.55, roughness: 0.45 }),
      );
      foot.position.set(x, padY + 0.13, 0);
      this.scene.add(foot);
    }

    // Surface normal (dashed) through the interface — along +x
    this.normalLine = dashedGuide(
      [new THREE.Vector3(-1.6, blockY, 0), new THREE.Vector3(1.6, blockY, 0)],
      0x94a3b8,
      0.5,
    );
    this.scene.add(this.normalLine);
    this.scene.add(placeLabel('normal', 0, blockY + blockH / 2 + 0.4, 0, '#94a3b8', 0.75));

    this._hit = new THREE.Vector3(0, blockY, 0);
    this._padY = padY;

    // --- Microwave / optical horn on a carriage (left) ---
    this.hornGroup = new THREE.Group();
    this.scene.add(this.hornGroup);

    const carriage = new THREE.Mesh(
      roundedBoxGeometry(0.7, 0.14, 0.85, 0.04, 3),
      metalMaterial(0x334155, { metalness: 0.6, roughness: 0.4 }),
    );
    carriage.position.y = -0.95;
    this.hornGroup.add(carriage);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.95, 12),
      metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.32 }),
    );
    post.position.y = -0.4;
    this.hornGroup.add(post);

    const throat = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.22, 0.28),
      metalMaterial(0x94a3b8, { metalness: 0.65, roughness: 0.35 }),
    );
    throat.position.set(0.15, 0, 0);
    this.hornGroup.add(throat);

    this.horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.7, 4, 1, true),
      metalMaterial(0xcbd5e1, { metalness: 0.55, roughness: 0.4 }),
    );
    this.horn.rotation.z = -Math.PI / 2;
    this.horn.position.set(0.65, 0, 0);
    this.hornGroup.add(this.horn);
    tip(this.horn, 'Horn / source', 'Microwave or laser launcher on the optical bench. Sets the incident angle θ₁.');

    this.hornGlow = glowSphere(0.1, 0x38bdf8, { pick: false });
    this.hornGlow.position.set(0.95, 0, 0);
    this.hornGroup.add(this.hornGlow);
    attachGlow(this.horn, 0x38bdf8, 0.7);

    this.rayI = this._makeRay(0x38bdf8);
    this.rayR = this._makeRay(0xa78bfa);
    this.rayT = this._makeRay(0x34d399);
    this.scene.add(this.rayI);
    this.scene.add(this.rayR);
    this.scene.add(this.rayT);

    this.scene.add(placeLabel('medium 1', -0.85, blockY + blockH / 2 + 0.45, 0, '#67e8f9', 0.9));
    this.scene.add(placeLabel('medium 2', 0.85, blockY + blockH / 2 + 0.45, 0, '#34d399', 0.9));
    this.scene.add(placeLabel('horn / source', -3.0, blockY + 1.0, 0, '#94a3b8', 0.85));
    this._liveLbl = placeLabel('θ₂ = --', 2.4, blockY + 1.2, 0, '#e2e8f0', 1.0);
    this.scene.add(this._liveLbl);
  }

  _orientRay(mesh, from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 1e-6) return;
    dir.normalize();
    mesh.position.copy(from);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  setParams(p) {
    if (!p) return;
    if (p.n1 != null) this.state.n1 = p.n1;
    if (p.n2 != null) this.state.n2 = p.n2;
    if (p.theta1 != null) this.state.theta1 = p.theta1;

    const th1 = degToRad(this.state.theta1);
    const th2 = snellTheta2(this.state.n1, this.state.n2, th1);
    const R = reflectance(this.state.n1, this.state.n2, th1);
    const crit = criticalAngle(this.state.n1, this.state.n2);
    const L = 2.35;
    const origin = this._hit.clone();

    // Vertical interface (normal +x). θ measured from the normal in the xy plane.
    const iStart = new THREE.Vector3(
      origin.x - Math.cos(th1) * L,
      origin.y + Math.sin(th1) * L,
      0,
    );
    this.hornGroup.position.set(iStart.x - 0.15, origin.y, 0);
    this.hornGroup.rotation.z = th1;
    this._orientRay(this.rayI, iStart, origin);

    const rEnd = new THREE.Vector3(
      origin.x - Math.cos(th1) * L * 0.95,
      origin.y - Math.sin(th1) * L * 0.95,
      0,
    );
    this._orientRay(this.rayR, origin, rEnd);
    this.rayR.material.opacity = 0.35 + 0.55 * R;
    this.rayR.material.transparent = true;

    if (th2 != null) {
      this.rayT.visible = true;
      const tEnd = new THREE.Vector3(
        origin.x + Math.cos(th2) * L,
        origin.y - Math.sin(th2) * L,
        0,
      );
      this._orientRay(this.rayT, origin, tEnd);
    } else {
      this.rayT.visible = false;
    }

    const n1s = Math.min(1, (this.state.n1 - 0.8) / 1.2);
    const n2s = Math.min(1, (this.state.n2 - 1) / 1.5);
    this.med1.material.opacity = 0.28 + 0.25 * n1s;
    this.med2.material.opacity = 0.32 + 0.38 * n2s;

    this._updateLabel(th2, R, crit);
  }

  _updateLabel(th2, R, crit) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = th2 == null ? '#f87171' : '#34d399';
    ctx.font = '600 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t2 = th2 == null ? 'TIR' : radToDeg(th2).toFixed(1) + '°';
    const c = crit == null ? '' : '  θc=' + radToDeg(crit).toFixed(1) + '°';
    ctx.fillText('θ₂=' + t2 + '  R≈' + (R * 100).toFixed(0) + '%' + c, 192, 24);
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.interface, this.med1, this.med2, this.horn, this.rayI].filter(Boolean);
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
    if (this._active && !this.paused) {
      this.phase += 0.04;
      const pulse = 0.72 + 0.28 * Math.sin(this.phase * 3.2);
      if (this.rayI.material) {
        this.rayI.material.opacity = 0.55 + 0.35 * pulse;
      }
      if (this.hornGlow) {
        this.hornGlow.scale.setScalar(0.85 + 0.3 * pulse);
        this.hornGlow.material.opacity = 0.5 + 0.4 * pulse;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
