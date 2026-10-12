// 3D PWR — clearer “real plant” layout with numbered energy path.
// Story: ① fission in core → ② hot primary water → ③ steam generator →
//        ④ turbine/generator → ⑤ condenser → back.
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
import { T_NOMINAL_C, T_MAX_C } from './physics.js';

function matMetal(color, extras) {
  const o = {
    color: color,
    metalness: 0.55,
    roughness: 0.38,
  };
  if (extras) {
    for (const k in extras) o[k] = extras[k];
  }
  return new THREE.MeshStandardMaterial(o);
}

export class NuclearReactorScene {
  constructor(container) {
    this.container = container;
    this.rodInsertion = 0.35;
    this.coolantFlow = 70;
    this.powerMw = 200;
    this.electricMw = 60;
    this.tempC = T_NOMINAL_C;
    this.trip = false;
    this.paused = false;
    this._active = false;
    this._phase = 0;
    this._particles = [];
    this._steam = [];

    this.scene = setupScene();
    this.scene.background = new THREE.Color(0x071018);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    this.camera.position.set(16, 12, 20);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(1, 3, 0);
    this.controls.maxPolarAngle = Math.PI * 0.49;
    addStudioLights(this.scene);
    // Extra key light for metal plant
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(8, 14, 6);
    this.scene.add(key);

    this.fx = new THREE.Group();
    this.scene.add(this.fx);

    this._build();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._applyVisuals();
  }

  _build() {
    // Floor pad
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c1422, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a2336, roughness: 0.85 })
    );
    pad.position.set(1, 0.06, 0);
    this.scene.add(pad);

    // === ① REACTOR BUILDING (containment) — cutaway so core is visible ===
    this.containment = new THREE.Group();
    this.scene.add(this.containment);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      matMetal(0x6b7c93, { transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    dome.position.set(-7.2, 5.8, 0);
    this.containment.add(dome);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 5.5, 32, 1, true),
      matMetal(0x5a6b82, { transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    wall.position.set(-7.2, 2.9, 0);
    this.containment.add(wall);

    // Pressure vessel (opaque lower + glass upper cutaway)
    this.vessel = new THREE.Group();
    this.scene.add(this.vessel);
    const vShell = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.15, 5.0, 28),
      matMetal(0x8a96a8, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    vShell.position.set(-7.2, 3.0, 0);
    this.vessel.add(vShell);
    const vTop = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      matMetal(0x9aa8bc)
    );
    vTop.position.set(-7.2, 5.5, 0);
    this.vessel.add(vTop);
    const vBot = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      matMetal(0x7a8799)
    );
    vBot.position.set(-7.2, 0.5, 0);
    this.vessel.add(vBot);
    tip(this.vessel, '① Pressure vessel', 'Steel tank that holds the nuclear core. Water inside is kept liquid by high pressure (that is why it is called a Pressurised Water Reactor).');

    // Fuel assemblies (grid of yellow rods) = core
    this.core = new THREE.Group();
    this.vessel.add(this.core);
    this.core.position.set(-7.2, 2.5, 0);
    const fuelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.5,
    });
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        if (Math.abs(ix) === 2 && Math.abs(iz) === 2) continue;
        const fuel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), fuelMat);
        fuel.position.set(ix * 0.38, 0, iz * 0.38);
        this.core.add(fuel);
      }
    }
    this._coreGlow = attachGlow(this.core, 0xfbbf24, 2.8);
    tip(this.core, '① Nuclear fuel (core)', 'Uranium fuel rods. Splitting atoms (fission) makes heat. Brighter glow = more heat / more power.');

    // Control rods (dark grey, drop into core)
    this.rodGroup = new THREE.Group();
    this.vessel.add(this.rodGroup);
    this._rods = [];
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.28 });
    const driveMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.35 });
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), rodMat);
        rod.position.set(-7.2 + i * 0.5, 4.5, j * 0.5);
        this.rodGroup.add(rod);
        this._rods.push(rod);
        const drive = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8), driveMat);
        drive.position.set(-7.2 + i * 0.5, 6.1, j * 0.5);
        this.rodGroup.add(drive);
      }
    }
    tip(this.rodGroup, 'Control rods (your main power knob)', 'Dark rods that swallow neutrons. PUSH IN = less fission = plant cools down. PULL OUT = more fission = more power. Like a volume dial for the reactor.');

    // === ② PRIMARY PUMP ===
    this.pump = new THREE.Group();
    this.scene.add(this.pump);
    const pumpBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, 1.1, 16),
      matMetal(0x0ea5e9, { emissive: 0x0369a1, emissiveIntensity: 0.2 })
    );
    pumpBody.position.set(-3.6, 1.15, 2.2);
    this.pump.add(pumpBody);
    const pumpMotor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.9), matMetal(0x475569));
    pumpMotor.position.set(-3.6, 1.9, 2.2);
    this.pump.add(pumpMotor);
    this._pumpGlow = attachGlow(pumpBody, 0x38bdf8, 1.4);
    tip(this.pump, '② Coolant pump', 'Pushes hot water from the core to the steam generator, then back. More pump flow = better cooling. If power is high but flow is low, the core overheats and the reactor TRIPS (emergency stop).');

    // === ③ STEAM GENERATOR (U-tube heat exchanger look) ===
    this.sg = new THREE.Group();
    this.scene.add(this.sg);
    const sgShell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.85, 5.2, 24),
      matMetal(0x64748b)
    );
    sgShell.position.set(0.2, 3.1, 0);
    this.sg.add(sgShell);
    const sgDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      matMetal(0x94a3b8)
    );
    sgDome.position.set(0.2, 5.7, 0);
    this.sg.add(sgDome);
    // Window showing “steam” region
    const steamWin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 1.6, 20),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.35 })
    );
    steamWin.position.set(0.2, 4.4, 0);
    this.sg.add(steamWin);
    tip(this.sg, '③ Steam generator', 'Heat exchanger: radioactive primary water stays sealed inside tubes. Clean secondary water outside the tubes boils into steam. The two waters NEVER mix — that is a key safety idea of a PWR.');

    // === ④ TURBINE HALL ===
    this.turbine = new THREE.Group();
    this.scene.add(this.turbine);
    // Building shell (open front)
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 4.2, 5.5),
      matMetal(0x334155, { transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    hall.position.set(8.2, 2.4, 0);
    this.turbine.add(hall);

    const tHP = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 2.2, 16), matMetal(0x475569));
    tHP.rotation.z = Math.PI / 2;
    tHP.position.set(6.0, 2.2, 0);
    this.turbine.add(tHP);
    const tLP = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 2.8, 16), matMetal(0x3f4f63));
    tLP.rotation.z = Math.PI / 2;
    tLP.position.set(9.2, 2.2, 0);
    this.turbine.add(tLP);

    this._bladeGroup = new THREE.Group();
    this._bladeGroup.position.set(7.6, 2.2, 0);
    this.turbine.add(this._bladeGroup);
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.5, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
      );
      blade.rotation.z = (b * Math.PI) / 3;
      this._bladeGroup.add(blade);
    }

    // Generator
    this.generator = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 2.4, 20),
      matMetal(0x1d4ed8, { emissive: 0x1e3a8a, emissiveIntensity: 0.25 })
    );
    this.generator.rotation.z = Math.PI / 2;
    this.generator.position.set(12.2, 2.2, 0);
    this.turbine.add(this.generator);
    this._genGlow = attachGlow(this.generator, 0x38bdf8, 1.6);
    tip(this.turbine, '④ Turbine + generator', 'Steam pushes turbine blades (like a windmill for steam). The shaft turns a generator that makes electricity for homes and factories.');
    tip(this.generator, '④ Generator', 'Turns spinning motion into electric power (MW on the grid).');

    // === ⑤ CONDENSER + cooling ===
    this.condenser = new THREE.Group();
    this.scene.add(this.condenser);
    const cond = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.4), matMetal(0x1e3a5f));
    cond.position.set(9.0, 0.85, -3.4);
    this.condenser.add(cond);
    // Small cooling tower silhouette
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.6, 3.8, 20),
      matMetal(0x64748b, { transparent: true, opacity: 0.55 })
    );
    tower.position.set(12.5, 2.2, -3.6);
    this.condenser.add(tower);
    tip(this.condenser, '⑤ Condenser & cooling', 'After the turbine, steam is cooled back into water and returned to the steam generator. The cooling tower dumps leftover heat to the air.');

    // Pipes — color coded
    this._pipes = new THREE.Group();
    this.scene.add(this._pipes);
    // Hot leg (core → SG) amber
    this._addElbowPipe([
      [-5.2, 4.2, 0], [-2.4, 4.2, 0], [-1.0, 4.2, 0], [-0.2, 3.8, 0],
    ], 0xf59e0b, 0.22);
    // Cold leg (SG → pump → core) blue
    this._addElbowPipe([
      [-0.2, 1.5, 0], [-2.0, 1.5, 0], [-3.6, 1.5, 2.2], [-5.2, 1.5, 0], [-5.2, 1.8, 0],
    ], 0x38bdf8, 0.22);
    // Steam (SG → turbine) white
    this._addElbowPipe([
      [0.2, 5.5, 0], [2.5, 5.5, 0], [4.5, 3.8, 0], [5.2, 2.6, 0],
    ], 0xe2e8f0, 0.2);
    // Exhaust to condenser
    this._addElbowPipe([
      [9.2, 1.6, 0], [9.2, 1.2, -1.5], [9.0, 1.0, -3.0],
    ], 0x94a3b8, 0.16);

    // Numbered story labels
    this.scene.add(placeLabel('① FISSION HEAT', -7.2, 7.4, 0, '#fbbf24', 1.15));
    this.scene.add(placeLabel('② HOT WATER →', -3.5, 5.2, 0.8, '#f59e0b', 0.95));
    this.scene.add(placeLabel('③ MAKE STEAM', 0.2, 7.0, 0, '#e2e8f0', 1.05));
    this.scene.add(placeLabel('④ MAKE ELECTRICITY', 9.0, 5.0, 0, '#7dd3fc', 1.1));
    this.scene.add(placeLabel('⑤ COOL & REPEAT', 10.5, 0.2, -3.4, '#94a3b8', 0.95));
    this.scene.add(placeLabel('control rods', -7.2, 0.15, 2.8, '#cbd5e1', 0.85));
    this.scene.add(placeLabel('pump', -3.6, 0.2, 3.4, '#38bdf8', 0.8));

    this._statusLbl = placeLabel('Plant starting…', 2, 8.6, 0, '#4ade80', 1.15);
    this.scene.add(this._statusLbl);

    // Legend board (3D plaque)
    this._legend = placeLabel('Follow ①→②→③→④→⑤', 2, 9.4, 0, '#a5f3fc', 1.0);
    this.scene.add(this._legend);
  }

  _addElbowPipe(pts, color, radius) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, len, 10),
        new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 })
      );
      mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx / len, dy / len, dz / len)
      );
      this._pipes.add(mesh);
      // joint sphere
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.15, 10, 10),
        new THREE.MeshBasicMaterial({ color: color })
      );
      joint.position.set(a[0], a[1], a[2]);
      this._pipes.add(joint);
    }
  }

  setParams(p) {
    if (!p) return;
    if (p.rodInsertion != null) this.rodInsertion = p.rodInsertion;
    if (p.coolantFlow != null) this.coolantFlow = p.coolantFlow;
    if (p.powerMw != null) this.powerMw = p.powerMw;
    if (p.electricMw != null) this.electricMw = p.electricMw;
    if (p.tempC != null) this.tempC = p.tempC;
    if (p.trip != null) this.trip = !!p.trip;
    this._applyVisuals();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    if (tips.core) tip(this.core, tips.core.title, tips.core.desc);
    if (tips.rods) tip(this.rodGroup, tips.rods.title, tips.rods.desc);
    if (tips.vessel) tip(this.vessel, tips.vessel.title, tips.vessel.desc);
    if (tips.sg) tip(this.sg, tips.sg.title, tips.sg.desc);
    if (tips.turbine) tip(this.turbine, tips.turbine.title, tips.turbine.desc);
    if (tips.pump) tip(this.pump, tips.pump.title, tips.pump.desc);
    if (tips.condenser) tip(this.condenser, tips.condenser.title, tips.condenser.desc);
    if (tips.generator) tip(this.generator, tips.generator.title, tips.generator.desc);
  }

  getPickables() {
    return [this.core, this.rodGroup, this.vessel, this.sg, this.turbine, this.generator, this.pump, this.condenser];
  }

  _applyVisuals() {
    const y = 5.6 - this.rodInsertion * 2.6;
    for (let i = 0; i < this._rods.length; i++) this._rods[i].position.y = y;

    const hot = Math.min(1, this.powerMw / 900);
    this.core.traverse(function (c) {
      if (c.material && c.material.emissiveIntensity != null) {
        c.material.emissiveIntensity = 0.2 + hot * 0.85;
        if (c.material.color) {
          c.material.color.setRGB(0.96, 0.72 - hot * 0.25, 0.08);
        }
      }
    });
    this._coreGlow.visible = hot > 0.04;
    this._pumpGlow.visible = this.coolantFlow > 12;
    this._genGlow.visible = this.electricMw > 30;

    this.scene.remove(this._statusLbl);
    let msg;
    let col;
    if (this.trip) {
      msg = '⚠ EMERGENCY TRIP — core too hot · rods should go IN';
      col = '#f87171';
    } else if (this.rodInsertion > 0.9) {
      msg = 'Reactor shut down (control rods fully in)';
      col = '#94a3b8';
    } else {
      msg = 'Making ~' + Math.round(this.electricMw) + ' MW electricity  ·  core ~' + Math.round(this.tempC) + ' °C';
      col = this.tempC > T_NOMINAL_C + 35 ? '#fbbf24' : '#4ade80';
    }
    this._statusLbl = placeLabel(msg, 2.5, 8.6, 0, col, 1.2);
    this.scene.add(this._statusLbl);
  }

  tick(dt) {
    if (this.paused || !this._active) return;
    this._phase += dt;
    const spin = 0.4 + this.electricMw / 350;
    this._bladeGroup.rotation.x += dt * spin * 7;

    // Primary coolant particles
    const rate = (0.8 + this.coolantFlow / 30) * (0.4 + this.powerMw / 700);
    this._emit = (this._emit || 0) + dt * rate;
    while (this._emit >= 1 && this._particles.length < 48) {
      this._emit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      this.fx.add(m);
      this._particles.push({ mesh: m, u: 0, kind: Math.random() > 0.45 ? 'hot' : 'cold' });
    }
    const keep = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.u += dt * (0.28 + this.coolantFlow / 200);
      const t = p.u;
      if (p.kind === 'hot') {
        p.mesh.material.color.setHex(0xf59e0b);
        p.mesh.position.set(-5.2 + t * 5.0, 4.2 - t * 0.4, Math.sin(t * 6) * 0.15);
      } else {
        p.mesh.material.color.setHex(0x38bdf8);
        p.mesh.position.set(-0.5 - t * 4.5, 1.5, 0.3 + Math.sin(t * 5) * 0.2);
      }
      if (t < 1) keep.push(p);
      else this.fx.remove(p.mesh);
    }
    this._particles = keep;

    // Steam wisps SG → turbine
    this._steamEmit = (this._steamEmit || 0) + dt * (0.5 + this.electricMw / 200);
    while (this._steamEmit >= 1 && this._steam.length < 24) {
      this._steamEmit -= 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.7 })
      );
      this.fx.add(m);
      this._steam.push({ mesh: m, u: 0 });
    }
    const sk = [];
    for (let i = 0; i < this._steam.length; i++) {
      const p = this._steam[i];
      p.u += dt * 0.45;
      const t = p.u;
      p.mesh.position.set(0.4 + t * 5.0, 5.4 - t * 2.8, Math.sin(t * 8) * 0.2);
      p.mesh.material.opacity = 0.75 * (1 - t);
      if (t < 1) sk.push(p);
      else this.fx.remove(p.mesh);
    }
    this._steam = sk;
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
