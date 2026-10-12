// Spark discharge — 3D RC relaxation-oscillator circuit: battery -> R -> node -> (C, spark gap) -> back.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  collisionFlash,
  tickFlash,
  triggerFlash,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';
import {
  paschenVoltage,
  chargeTimeToBreakdown,
  sawtoothVoltage,
  sparkFrequency,
} from './physics.js';

const WIRE_COLOR = 0x64748b;

function cylinderBetween(a, b, radius, color, opts) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(1e-4, dir.length());
  const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
  const mat = new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.55, roughness: 0.4 }, opts || {}));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function coneBetween(base, apexTip, radius, color) {
  const dir = new THREE.Vector3().subVectors(apexTip, base);
  const len = Math.max(1e-4, dir.length());
  const geo = new THREE.ConeGeometry(radius, len, 14);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.28 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(base).lerp(apexTip, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export class SparkDischargeScene3D {
  constructor(container) {
    this.container = container;
    this.pressureTorr = 1;
    this.spacingCm = 2;
    this.Vsupply = 600;
    this.R = 1e6;
    this.C = 1e-8;
    this._recomputeElectrical();

    this._t = 0;
    this._lastCycleIndex = null;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(-1.1, 4.6, 8.3);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(-1.4, 0.35, 0);
    addStudioLights(this.scene);

    this._buildStage();
    this._clock = new THREE.Clock();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _recomputeElectrical() {
    const pd = this.pressureTorr * this.spacingCm;
    this.Vb = paschenVoltage(pd);
    this.period = chargeTimeToBreakdown(this.R, this.C, this.Vsupply, this.Vb);
    this.freq = sparkFrequency(this.R, this.C, this.Vsupply, this.Vb);
  }

  _buildStage() {
    const y = 0.4;

    // Circuit board base plate: grounds the whole RC circuit as one
    // assembled apparatus instead of parts floating separately in space.
    // roundedBoxGeometry(w,h,depth,...) already lies flat (width=X,
    // thin=Y, length=Z) — NO extra rotation needed here.
    const boardW = 6.7, boardD = 2.3, boardT = 0.14;
    const boardCenterX = -1.4;
    const boardTopY = -0.1; // flush with the battery's underside
    const board = new THREE.Mesh(
      roundedBoxGeometry(boardW, boardT, boardD, 0.05, 3),
      metalMaterial(0x131b28, { metalness: 0.3, roughness: 0.7 }),
    );
    board.position.set(boardCenterX, boardTopY - boardT / 2, 0);
    this.scene.add(board);
    addFloorGrid(this.scene, 26, boardTopY - boardT - 0.9);
    const boardShadow = contactShadow(boardW * 0.52, boardD * 0.6, 0.4);
    boardShadow.position.set(boardCenterX, boardTopY - boardT - 0.02, 0);
    this.scene.add(boardShadow);

    // -- key points (all in the XZ plane, top rail z=-0.6, bottom rail z=0.6) --
    const supplyTop = new THREE.Vector3(-4.2, y, -0.6);
    const supplyBot = new THREE.Vector3(-4.2, y, 0.6);
    const rIn = new THREE.Vector3(-2.6, y, -0.6);
    const rOut = new THREE.Vector3(-1.0, y, -0.6);
    const node = new THREE.Vector3(0.2, y, -0.6);
    const capIn = new THREE.Vector3(0.2, y, -0.17);
    const capOut = new THREE.Vector3(0.2, y, 0.17);
    const bottomAtCap = new THREE.Vector3(0.2, y, 0.6);
    const gapTopNode = new THREE.Vector3(1.4, y, -0.6);
    const gapWireIn = new THREE.Vector3(1.4, y, -0.32);
    const eTip1 = new THREE.Vector3(1.4, y, -0.1);
    const eTip2 = new THREE.Vector3(1.4, y, 0.1);
    const gapWireOut = new THREE.Vector3(1.4, y, 0.32);
    const bottomAtGap = new THREE.Vector3(1.4, y, 0.6);

    // Battery / supply block
    const battery = new THREE.Mesh(
      roundedBoxGeometry(0.55, 1.0, 1.5, 0.06, 3),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    battery.position.set(-4.2, y, 0);
    this.scene.add(battery);
    const cap1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.14, 1.58),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x78350f, emissiveIntensity: 0.3 })
    );
    cap1.position.set(-4.2, y + 0.5, 0);
    this.scene.add(cap1);
    this.scene.add(placeLabel('V_supply', -4.2, y + 1.0, 0, '#fbbf24', 1.05));
    tip(battery, 'Supply V_supply', 'The DC source that charges the capacitor through R. Must exceed V_b for the gap to ever fire.');

    // Wires: top rail (supply -> resistor -> node -> gap branch point)
    this.scene.add(cylinderBetween(supplyTop, rIn, 0.035, WIRE_COLOR));
    this.scene.add(cylinderBetween(rOut, node, 0.035, WIRE_COLOR));
    this.scene.add(cylinderBetween(node, gapTopNode, 0.035, WIRE_COLOR));
    // Bottom rail (supply -> under capacitor -> under gap)
    this.scene.add(cylinderBetween(supplyBot, bottomAtCap, 0.035, WIRE_COLOR));
    this.scene.add(cylinderBetween(bottomAtCap, bottomAtGap, 0.035, WIRE_COLOR));
    // Capacitor branch stub wires
    this.scene.add(cylinderBetween(node, capIn, 0.03, WIRE_COLOR));
    this.scene.add(cylinderBetween(capOut, bottomAtCap, 0.03, WIRE_COLOR));
    // Spark-gap branch stub wires
    this.scene.add(cylinderBetween(gapTopNode, gapWireIn, 0.03, WIRE_COLOR));
    this.scene.add(cylinderBetween(gapWireOut, bottomAtGap, 0.03, WIRE_COLOR));

    // Resistor: banded cylinder body between rIn and rOut
    const resistorGeo = new THREE.CylinderGeometry(0.13, 0.13, rIn.distanceTo(rOut), 16);
    const resistorBody = new THREE.Mesh(resistorGeo, metalMaterial(0xd6c8a8, { metalness: 0.2, roughness: 0.55 }));
    resistorBody.position.copy(rIn).lerp(rOut, 0.5);
    resistorBody.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(rOut, rIn).normalize());
    this.scene.add(resistorBody);
    this._resistorMesh = resistorBody;
    const bandColors = [0x92400e, 0x1e293b, 0x92400e];
    for (let i = 0; i < bandColors.length; i++) {
      const frac = 0.22 + i * 0.28;
      const bp = rIn.clone().lerp(rOut, frac);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.145, 0.022, 8, 20),
        new THREE.MeshStandardMaterial({ color: bandColors[i], roughness: 0.5 })
      );
      ring.position.copy(bp);
      ring.quaternion.copy(resistorBody.quaternion);
      ring.rotateX(Math.PI / 2);
      this.scene.add(ring);
    }
    this.scene.add(placeLabel('R', (rIn.x + rOut.x) / 2, y + 0.55, -0.6, '#e2e8f0', 0.9));
    tip(resistorBody, 'Resistor R', 'Limits the charging current — a larger R slows charging, giving fewer sparks per second.');

    // Capacitor: two facing plates at the branch (thin box, normal along Z)
    const plateGeo = new THREE.BoxGeometry(0.55, 0.55, 0.045);
    const plate1 = new THREE.Mesh(plateGeo, metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.28 }));
    plate1.position.copy(capIn);
    const plate2 = new THREE.Mesh(plateGeo, metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.28 }));
    plate2.position.copy(capOut);
    this._capGroup = new THREE.Group();
    this._capGroup.add(plate1, plate2);
    this.scene.add(this._capGroup);
    this.scene.add(placeLabel('C', 0.2, y + 0.55, 0, '#e2e8f0', 0.9));
    tip(this._capGroup, 'Capacitor C', 'Stores charge; its voltage V_C(t) climbs toward V_supply until it reaches breakdown V_b.');

    // Spark gap: two cone electrodes facing each other with a visible air gap
    const eMat1 = metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.22 });
    const eMat2 = metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.22 });
    this._tipMat1 = eMat1;
    this._tipMat2 = eMat2;
    const electrode1 = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 14), eMat1);
    electrode1.position.copy(gapWireIn).lerp(eTip1, 0.5);
    electrode1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(eTip1, gapWireIn).normalize());
    const electrode2 = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 14), eMat2);
    electrode2.position.copy(gapWireOut).lerp(eTip2, 0.5);
    electrode2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(eTip2, gapWireOut).normalize());
    this._gapGroup = new THREE.Group();
    this._gapGroup.add(electrode1, electrode2);
    this.scene.add(this._gapGroup);
    this.scene.add(placeLabel('spark gap', 1.4, y + 0.55, 0, '#e2e8f0', 1.05));
    tip(this._gapGroup, 'Spark gap', "Ionizes and conducts once V_C(t) reaches the Paschen breakdown voltage V_b(p·d), instantly discharging C and resetting the cycle.");

    // Baseline glow at the gap (brightens sharply at the spark instant)
    this._gapGlowAnchor = new THREE.Object3D();
    this._gapGlowAnchor.position.set(1.4, y, 0);
    this.scene.add(this._gapGlowAnchor);
    this._gapGlow = attachGlow(this._gapGlowAnchor, 0x7dd3fc, 0.9);
    this._gapGlow.material.opacity = 0.18;

    // Flash ring + point light for the spark instant
    this._flashRing = collisionFlash(this.scene);
    this._flashRing.position.set(1.4, y, 0);
    this._sparkLight = new THREE.PointLight(0xbfe8ff, 0, 5, 2);
    this._sparkLight.position.set(1.4, y + 0.1, 0);
    this.scene.add(this._sparkLight);

    // Traveling charge indicator: position tracks charge fraction, brightness tracks V_C(t)/V_supply
    this._pathPoints = [supplyTop, rIn, rOut, node, capIn];
    this._pathCum = [0];
    for (let i = 1; i < this._pathPoints.length; i++) {
      this._pathCum.push(this._pathCum[i - 1] + this._pathPoints[i].distanceTo(this._pathPoints[i - 1]));
    }
    const indMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.4 });
    this._indicator = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), indMat);
    this._indicator.position.copy(supplyTop);
    this.scene.add(this._indicator);
    this._indicatorGlow = attachGlow(this._indicator, 0xfde047, 0.55);

    // Live readout label
    this._liveLbl = placeLabel('', -1.4, y + 2.0, 0, '#7dd3fc', 1.25);
    this.scene.add(this._liveLbl);
    this._updateLabel();
  }

  _pointAlongPath(frac) {
    const pts = this._pathPoints;
    const cum = this._pathCum;
    const total = cum[cum.length - 1] || 1;
    const target = Math.max(0, Math.min(1, frac)) * total;
    for (let i = 1; i < cum.length; i++) {
      if (target <= cum[i] || i === cum.length - 1) {
        const segStart = cum[i - 1];
        const segLen = Math.max(1e-6, cum[i] - segStart);
        const t = Math.max(0, Math.min(1, (target - segStart) / segLen));
        return pts[i - 1].clone().lerp(pts[i], t);
      }
    }
    return pts[pts.length - 1].clone();
  }

  _updateLabel() {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const tooLow = !(this.Vsupply > this.Vb);
    ctx.fillStyle = tooLow ? 'rgba(127,29,29,0.85)' : 'rgba(10,17,34,0.78)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 6, 376, 36, 8);
    else ctx.rect(4, 6, 376, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tooLow ? '#fecaca' : '#7dd3fc';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = tooLow
      ? 'V_supply too low — no sparks'
      : 'V_b ≈ ' + this.Vb.toFixed(0) + ' V   f ≈ ' + (this.freq > 0 ? this.freq.toFixed(2) : '0') + ' Hz';
    ctx.fillText(text, 192, 24);
    this._liveLbl.material.map.needsUpdate = true;
  }

  _triggerSpark() {
    triggerFlash(this._flashRing);
    this._sparkLight.intensity = 6;
  }

  setParams(p) {
    if (!p) return;
    if (p.pressureTorr != null) this.pressureTorr = p.pressureTorr;
    if (p.spacingCm != null) this.spacingCm = p.spacingCm;
    if (p.Vsupply != null) this.Vsupply = p.Vsupply;
    if (p.R != null) this.R = p.R;
    if (p.C != null) this.C = p.C;
    this._recomputeElectrical();
    if (isFinite(this.period) && this.period > 0) {
      this._lastCycleIndex = Math.floor(this._t / this.period);
    } else {
      this._lastCycleIndex = null;
    }
    this._updateLabel();
  }

  _timeScale() {
    if (!isFinite(this.period) || this.period <= 0) return 1;
    return this.period / 2.2;
  }

  _updateCircuit(dt) {
    this._t += dt * this._timeScale();
    const v = sawtoothVoltage(this._t, this.R, this.C, this.Vsupply, this.Vb);
    const frac = this.Vsupply > 0 ? Math.min(1, v / this.Vsupply) : 0;

    const pos = this._pointAlongPath(frac);
    this._indicator.position.copy(pos);
    this._indicator.material.opacity = 0.3 + 0.65 * frac;
    if (this._indicatorGlow) this._indicatorGlow.material.opacity = 0.2 + 0.55 * frac;

    let tMod = 0;
    let sparking = false;
    if (isFinite(this.period) && this.period > 0) {
      tMod = this._t % this.period;
      if (tMod < 0) tMod += this.period;
      sparking = tMod < this.period * 0.045;
      const cycleIndex = Math.floor(this._t / this.period);
      if (this._lastCycleIndex != null && cycleIndex !== this._lastCycleIndex) {
        this._triggerSpark();
      }
      this._lastCycleIndex = cycleIndex;
    }
    const glowOpacity = sparking ? Math.max(0.45, 1 - tMod / (this.period * 0.045)) : 0.18;
    if (this._gapGlow) this._gapGlow.material.opacity = glowOpacity;
    const tipColor = sparking ? 0xe0f2fe : 0x94a3b8;
    if (this._tipMat1) this._tipMat1.color.setHex(tipColor);
    if (this._tipMat2) this._tipMat2.color.setHex(tipColor);

    if (this._sparkLight.intensity > 0.02) {
      this._sparkLight.intensity = Math.max(0, this._sparkLight.intensity - dt * 14);
    } else {
      this._sparkLight.intensity = 0;
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    if (!tips) return;
    this._tipTexts = tips;
  }

  getPickables() {
    return [this._resistorMesh, this._capGroup, this._gapGroup].filter(Boolean);
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
    const dt = Math.min(0.1, this._clock.getDelta());
    if (this._active && !this.paused) {
      this._updateCircuit(dt);
    }
    tickFlash(this._flashRing, dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
