// Microwave oven — realistic case, mesh door, magnetron, waveguide, turntable.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  freeSpaceWavelength, heatingPower, magnetronFreq, standingWaveE, cavityWavelength,
} from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
  glowSphere,
  attachGlow,
} from '../common/sceneVisuals.js';

export class MicrowaveOvenScene3D {
  constructor(container) {
    this.container = container;
    this.state = {
      power: 800,
      modeIndex: 3,
      turntable: 1,
      waterFrac: 0.7,
      cavityL: 0.35,
    };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(5.6, 3.8, 6.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.1, 0.7, 0.3);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.3);

    this._buildStage();
    this._alive = true;

    // Click-to-open/close the door: separate from bindSceneTips' click-to-tooltip
    // listener (same pointerdown/pointerup + drag-threshold pattern) so both
    // behaviors coexist without interfering with OrbitControls dragging.
    this._doorRaycaster = new THREE.Raycaster();
    this._doorPointer = new THREE.Vector2();
    this._doorDown = null;
    this._onDoorPointerDown = (e) => {
      if (e.button === 0) this._doorDown = { x: e.clientX, y: e.clientY };
    };
    this._onDoorPointerUp = (e) => {
      if (e.button !== 0 || !this._doorDown) return;
      const dx = e.clientX - this._doorDown.x;
      const dy = e.clientY - this._doorDown.y;
      this._doorDown = null;
      if (Math.hypot(dx, dy) > 10 || !this.doorGroup) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this._doorPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this._doorPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this._doorRaycaster.setFromCamera(this._doorPointer, this.camera);
      const hits = this._doorRaycaster.intersectObject(this.doorGroup, true);
      if (hits.length > 0) this._doorOpen = !this._doorOpen;
    };
    this.renderer.domElement.addEventListener('pointerdown', this._onDoorPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this._onDoorPointerUp);

    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _doorMeshTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#0b1220';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#64748b';
    c.lineWidth = 2;
    const step = 14;
    for (let x = 0; x <= 256; x += step) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    for (let y = 0; y <= 256; y += step) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(256, y);
      c.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1.6);
    return tex;
  }

  _buildStage() {
    const padY = -1.2;
    const W = 3.8;
    const H = 2.35;
    const D = 2.6;
    const ox = 0.15;
    const oy = padY + 0.2 + H / 2;
    const oz = 0.15;

    // Bench pad under oven
    const pad = new THREE.Mesh(
      roundedBoxGeometry(5.2, 0.14, 3.4, 0.07, 3),
      metalMaterial(0x1e293b, { metalness: 0.35, roughness: 0.65 }),
    );
    pad.position.set(ox, padY, oz);
    this.scene.add(pad);
    this.scene.add(contactShadow(2.7, 1.8, 0.45).translateY(padY - 0.072));

    this.oven = new THREE.Group();
    this.oven.position.set(ox, oy, oz);
    this.scene.add(this.oven);

    const caseMat = plasticMaterial(0x334155, { roughness: 0.48 });
    const steelMat = metalMaterial(0x64748b, { metalness: 0.55, roughness: 0.42 });

    // Outer case shells (open front for teaching cutaway)
    const shellBack = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, H + 0.2, 0.12), caseMat);
    shellBack.position.set(0, 0, -D / 2 - 0.02);
    this.oven.add(shellBack);
    const shellTop = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.12, D + 0.15), caseMat);
    shellTop.position.set(0, H / 2 + 0.02, 0);
    this.oven.add(shellTop);
    const shellBot = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.14, D + 0.15), caseMat);
    shellBot.position.set(0, -H / 2 - 0.02, 0);
    this.oven.add(shellBot);
    const shellL = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.2, D + 0.15), caseMat);
    shellL.position.set(-W / 2 - 0.02, 0, 0);
    this.oven.add(shellL);
    const shellR = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.2, D + 0.15), caseMat);
    shellR.position.set(W / 2 + 0.02, 0, 0);
    this.oven.add(shellR);

    // Interior cavity walls
    const cavMat = metalMaterial(0x94a3b8, { metalness: 0.65, roughness: 0.35 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.06, D - 0.2), cavMat);
    floor.position.y = -H / 2 + 0.2;
    this.oven.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, H - 0.35, 0.06), cavMat);
    back.position.set(0, 0, -D / 2 + 0.18);
    this.oven.add(back);
    tip(back, 'Cavity', 'Metal walls support standing-wave modes. Nodes stay cool; antinodes heat food.');
    this.cavityWall = back;

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.06, H - 0.35, D - 0.25), cavMat);
    left.position.set(-W / 2 + 0.18, 0, 0);
    this.oven.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.06, H - 0.35, D - 0.25), cavMat);
    right.position.set(W / 2 - 0.18, 0, 0);
    this.oven.add(right);
    const top = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.06, D - 0.25), cavMat);
    top.position.y = H / 2 - 0.18;
    this.oven.add(top);

    // Ribbed cavity wall detail — grooves typical of a real microwave interior,
    // reads clearly once the door swings open.
    const ribMat = metalMaterial(0x7c8aa0, { metalness: 0.6, roughness: 0.42 });
    for (let i = 0; i < 6; i++) {
      const ry = -H / 2 + 0.45 + i * 0.28;
      const ribBack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.32, 0.03, 0.015), ribMat);
      ribBack.position.set(0, ry, -D / 2 + 0.21);
      this.oven.add(ribBack);
      const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, D - 0.32), ribMat);
      ribL.position.set(-W / 2 + 0.21, ry, 0);
      this.oven.add(ribL);
      const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, D - 0.32), ribMat);
      ribR.position.set(W / 2 - 0.21, ry, 0);
      this.oven.add(ribR);
    }

    // ---- Front layout: hinged door (left, most of the width) + fixed control
    // panel column (right). Real ovens hinge on the side away from the handle.
    const frameMat = plasticMaterial(0x1e293b, { roughness: 0.5 });
    const doorZ = D / 2 + 0.02;
    const panelColW = 1.05;
    const hingeX = -W / 2 + 0.05;
    const doorRightX = W / 2 - panelColW - 0.15;
    const doorW = doorRightX - hingeX;
    const doorCenterX = (hingeX + doorRightX) / 2;

    // Fixed case bezel around the whole front — stays put; only the door leaf swings.
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(W + 0.15, 0.18, 0.1), frameMat);
    frameT.position.set(0, H / 2 - 0.05, doorZ - 0.05);
    this.oven.add(frameT);
    const frameB = new THREE.Mesh(new THREE.BoxGeometry(W + 0.15, 0.18, 0.1), frameMat);
    frameB.position.set(0, -H / 2 + 0.05, doorZ - 0.05);
    this.oven.add(frameB);
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.14, H - 0.2, 0.1), frameMat);
    frameL.position.set(hingeX, 0, doorZ - 0.05);
    this.oven.add(frameL);

    // Fixed control-panel bezel (right column)
    const panelX = W / 2 - panelColW / 2 - 0.05;
    const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(panelColW, H - 0.2, 0.1), frameMat);
    panelFrame.position.set(panelX, 0, doorZ - 0.05);
    this.oven.add(panelFrame);

    // ---- Hinged door group — pivot sits on the hinge edge (left), not the
    // door's center, so rotation.y swings the free (handle) edge outward. ----
    this.doorGroup = new THREE.Group();
    this.doorGroup.position.set(hingeX, 0, doorZ);
    this.oven.add(this.doorGroup);
    this._doorOpen = false;
    this._doorAngle = 0;
    this._doorOpenAngle = -Math.PI * 0.46;

    // Door leaf backing plate (children positioned relative to the hinge pivot)
    const doorLeaf = new THREE.Mesh(
      roundedBoxGeometry(doorW - 0.06, H - 0.24, 0.08, 0.04, 3),
      frameMat,
    );
    doorLeaf.position.set(doorCenterX - hingeX, 0, -0.02);
    this.doorGroup.add(doorLeaf);
    this.doorLeaf = doorLeaf;

    // Mesh door window (grid texture)
    const meshDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(doorW - 0.5, H - 0.55),
      new THREE.MeshStandardMaterial({
        map: this._doorMeshTexture(),
        color: 0x94a3b8,
        metalness: 0.7,
        roughness: 0.35,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    meshDoor.position.set(doorCenterX - hingeX, 0.05, 0.03);
    this.doorGroup.add(meshDoor);
    tip(meshDoor, 'Mesh door', 'Metal screen reflects microwaves while letting you see inside. Hole pitch ≪ λ. Click the door or handle to open/close it.');

    // Extra physical grid bars for depth
    const barMat = metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.3 });
    const barCols = 8;
    for (let i = 0; i < barCols; i++) {
      const bx = doorCenterX - hingeX - (doorW - 0.7) / 2 + (i * (doorW - 0.7)) / (barCols - 1);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.022, H - 0.7, 0.02), barMat);
      bar.position.set(bx, 0.05, 0.045);
      this.doorGroup.add(bar);
    }
    for (let j = 0; j < 6; j++) {
      const by = -0.85 + j * 0.34;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.7, 0.022, 0.02), barMat);
      bar.position.set(doorCenterX - hingeX, by, 0.045);
      this.doorGroup.add(bar);
    }

    // Handle — on the free edge, opposite the hinge
    const handle = new THREE.Mesh(
      roundedBoxGeometry(0.12, 0.9, 0.12, 0.03, 4),
      metalMaterial(0xcbd5e1, { metalness: 0.7, roughness: 0.28 }),
    );
    handle.position.set(doorRightX - hingeX - 0.12, 0.05, 0.14);
    this.doorGroup.add(handle);
    tip(handle, 'Door handle', 'Click to open or close the door on its hinge.');
    this.doorHandle = handle;

    // Control panel buttons (fixed to the case, beside the door)
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelColW - 0.15, 1.5, 0.08),
      plasticMaterial(0x0f172a, { roughness: 0.45 }),
    );
    panel.position.set(panelX, 0.05, doorZ + 0.02);
    this.oven.add(panel);
    this.panelLeds = [];
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16),
        plasticMaterial(i === 0 ? 0xfb923c : 0x475569, { roughness: 0.4 }),
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(panelX, 0.55 - i * 0.32, doorZ + 0.08);
      this.oven.add(btn);
      if (i === 0) {
        const led = glowSphere(0.035, 0xfb923c, { pick: false });
        led.position.copy(btn.position);
        led.position.z += 0.04;
        this.oven.add(led);
        this.panelLeds.push(led);
      }
    }

    // --- Magnetron: cylinder with cooling fins ---
    this.magnetronGroup = new THREE.Group();
    this.magnetronGroup.position.set(-W / 2 - 0.55, 0.15, -0.15);
    this.oven.add(this.magnetronGroup);

    this.magnetron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.55, 28),
      metalMaterial(0x1e293b, { metalness: 0.55, roughness: 0.4 }),
    );
    this.magnetronGroup.add(this.magnetron);
    tip(this.magnetron, 'Magnetron (~2.45 GHz)', 'Produces microwaves fed into the cavity via a waveguide. Water’s ε\'\' absorbs energy as P ∝ ε\'\' E².');

    // Cooling fins
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.5, 0.28),
        metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.32 }),
      );
      fin.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      fin.rotation.y = -a;
      this.magnetronGroup.add(fin);
    }
    const magCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20),
      metalMaterial(0x94a3b8, { metalness: 0.65, roughness: 0.3 }),
    );
    magCap.position.y = 0.32;
    this.magnetronGroup.add(magCap);

    this.magCore = glowSphere(0.14, 0xfb923c, { pick: false });
    this.magCore.position.y = 0;
    this.magnetronGroup.add(this.magCore);
    attachGlow(this.magnetron, 0xfb923c, 0.8);

    // Waveguide duct into cavity
    this.waveguide = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.32, 0.38),
      steelMat,
    );
    this.waveguide.position.set(-W / 2 + 0.15, 0.15, -0.15);
    this.oven.add(this.waveguide);
    tip(this.waveguide, 'Waveguide', 'Rectangular duct launching magnetron power into the cavity.');

    const flange = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.45, 0.5),
      metalMaterial(0x475569, { metalness: 0.6, roughness: 0.4 }),
    );
    flange.position.set(-W / 2 + 0.55, 0.15, -0.15);
    this.oven.add(flange);

    // Glass turntable
    this.turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.05, 48),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.1,
        roughness: 0.15,
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.turntable.position.set(0, -H / 2 + 0.32, 0.1);
    this.oven.add(this.turntable);
    tip(this.turntable, 'Turntable', 'Rotation averages hot/cold spots so food heats more evenly.');

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16),
      plasticMaterial(0x334155, { roughness: 0.5 }),
    );
    hub.position.set(0, -H / 2 + 0.28, 0.1);
    this.oven.add(hub);

    // Food lump
    this.food = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 22, 16),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        roughness: 0.7,
        metalness: 0.05,
        emissive: 0x422006,
        emissiveIntensity: 0.2,
      }),
    );
    this.food.position.set(0.15, -H / 2 + 0.58, 0.15);
    this.food.scale.set(1.25, 0.65, 1.05);
    this.oven.add(this.food);
    tip(this.food, 'Food (water fraction)', 'Higher water content → stronger dielectric heating at microwave frequencies.');

    // Standing-wave glow dots inside cavity
    this.modeGlows = [];
    for (let i = 0; i < 8; i++) {
      const g = glowSphere(0.16, 0xfb923c, { pick: false });
      this.oven.add(g);
      this.modeGlows.push(g);
    }

    this.scene.add(placeLabel('magnetron', ox - W / 2 - 0.55, oy + 0.95, oz - 0.15, '#fdba74', 0.9));
    this.scene.add(placeLabel('cavity', ox, oy + H / 2 + 0.55, oz, '#e2e8f0', 1.0));
    this.scene.add(placeLabel('turntable', ox, oy - H / 2 + 0.05, oz + 0.9, '#94a3b8', 0.85));
    this.scene.add(placeLabel('food', ox + 0.7, oy - 0.15, oz + 0.6, '#86efac', 0.85));
    this._liveLbl = placeLabel('mode --', ox, oy + H / 2 + 0.95, oz, '#fb923c', 1.0);
    this.scene.add(this._liveLbl);

    this._cavW = W;
    this._cavH = H;
  }

  setParams(p) {
    if (!p) return;
    if (p.power != null) this.state.power = p.power;
    if (p.modeIndex != null) this.state.modeIndex = p.modeIndex;
    if (p.turntable != null) this.state.turntable = p.turntable;
    if (p.waterFrac != null) this.state.waterFrac = p.waterFrac;
    if (p.cavityL != null) this.state.cavityL = p.cavityL;

    const m = Math.max(1, Math.round(this.state.modeIndex));
    const yGlow = 0.05;
    for (let i = 0; i < this.modeGlows.length; i++) {
      const x = -1.35 + (i / (this.modeGlows.length - 1)) * 2.7;
      const xn = (x + 1.35) / 2.7;
      const E = standingWaveE(xn * this.state.cavityL, this.state.cavityL, m);
      this.modeGlows[i].position.set(x, yGlow, -0.2);
      const inten = E * (this.state.power / 1200);
      const baseScale = 0.35 + 1.5 * inten;
      this.modeGlows[i].userData.baseScale = baseScale;
      this.modeGlows[i].scale.setScalar(baseScale);
      this.modeGlows[i].material.opacity = 0.12 + 0.65 * inten;
      this.modeGlows[i].visible = inten > 0.05;
    }

    const wf = this.state.waterFrac;
    this.food.scale.set(0.95 + 0.5 * wf, 0.5 + 0.28 * wf, 0.9 + 0.3 * wf);
    this.food.material.color.setRGB(0.3 + 0.2 * wf, 0.75, 0.4);

    const Efood = standingWaveE(0.5 * this.state.cavityL, this.state.cavityL, m);
    const heat = heatingPower(this.state.power, 1, Efood, wf);
    this.food.material.emissiveIntensity = 0.1 + Math.min(1.2, heat / 900);

    const lam = freeSpaceWavelength(magnetronFreq());
    const lamC = cavityWavelength(this.state.cavityL, m);
    this._updateLabel(m, lam, lamC, heat);
  }

  _updateLabel(m, lam, lamC, heat) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#fb923c';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'm=' + m + '  λ=' + (lam * 100).toFixed(1) + 'cm  λc=' + (lamC * 100).toFixed(1) +
      'cm  heat~' + heat.toFixed(0),
      192,
      24,
    );
    this._liveLbl.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this.magnetron, this.turntable, this.food, this.cavityWall, this.waveguide, this.doorGroup].filter(Boolean);
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
    if (this._onDoorPointerDown) this.renderer.domElement.removeEventListener('pointerdown', this._onDoorPointerDown);
    if (this._onDoorPointerUp) this.renderer.domElement.removeEventListener('pointerup', this._onDoorPointerUp);
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
      if (this.state.turntable > 0.5) {
        this.turntable.rotation.y += 0.02;
        this.food.rotation.y = this.turntable.rotation.y;
      }
      if (this.magCore) {
        this.magCore.scale.setScalar(0.85 + 0.3 * Math.sin(this.phase * 6));
      }
      for (let i = 0; i < this.panelLeds.length; i++) {
        const led = this.panelLeds[i];
        led.material.opacity = 0.55 + 0.4 * Math.sin(this.phase * 5);
      }
      for (let i = 0; i < this.modeGlows.length; i++) {
        const g = this.modeGlows[i];
        if (!g.visible) continue;
        const flick = 0.85 + 0.15 * Math.sin(this.phase * 4 + i);
        const base = g.userData.baseScale != null ? g.userData.baseScale : 1;
        g.scale.setScalar(base * flick);
      }
    }
    if (this.doorGroup) {
      const target = this._doorOpen ? this._doorOpenAngle : 0;
      this._doorAngle += (target - this._doorAngle) * 0.12;
      this.doorGroup.rotation.y = this._doorAngle;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
