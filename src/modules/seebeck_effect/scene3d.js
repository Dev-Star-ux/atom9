// Seebeck effect — 3D thermocouple demo: a hot-water beaker and an ice-water
// beaker, each holding one junction of a two-metal wire loop, running to a
// small analog meter whose needle deflects live with the EMF.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { seebeckEMF, findPair, needleAngleRad, METER_FULL_SCALE_MV } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  glassMaterial,
  metalMaterial,
  plasticMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const N_CARRIERS = 10;
const N_BUBBLES = 10;

function tempColor(T) {
  const f = Math.max(0, Math.min(1, (T - 253) / 220));
  const r = Math.round(50 + f * 205);
  const g = Math.round(80 + f * 50);
  const b = Math.round(230 - f * 190);
  return (r << 16) | (g << 8) | b;
}

export class SeebeckScene3D {
  constructor(container) {
    this.container = container;
    this.state = { Th: 373, Tc: 293, pairId: 'cuConstantan' };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._labelTick = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(5.6, 4.0, 7.6);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, -0.4, -0.2);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.4);

    this._carriers = [];
    this._bubbles = [];
    this._buildStage();
    this._buildCarriers();
    this._buildBubbles();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.42;
    this.scene.add(floor);

    const benchW = 5.4;
    const benchD = 3.2;
    const benchH = 0.16;
    const benchZ = 0.1;
    const benchTopY = -1.9;
    this.bench = new THREE.Mesh(
      new THREE.BoxGeometry(benchW, benchH, benchD),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    this.bench.position.set(0, benchTopY - benchH / 2, benchZ);
    this.scene.add(this.bench);
    const benchEdge = new THREE.Mesh(
      new THREE.BoxGeometry(benchW + 0.04, 0.02, benchD + 0.04),
      metalMaterial(0x475569, { metalness: 0.8, roughness: 0.3 }),
    );
    benchEdge.position.set(0, benchTopY - 0.005, benchZ);
    this.scene.add(benchEdge);

    const spanX = 1.9;
    const beakerZ = benchZ + 0.35;
    this._hot = this._buildBeaker(-spanX, beakerZ, benchTopY, true);
    this._cold = this._buildBeaker(spanX, beakerZ, benchTopY, false);

    // --- Meter housing on a small stand between the two beakers, set back
    // so the wires arc up and over into view. ---
    const meterX = 0, meterZ = beakerZ - 1.95, meterY = benchTopY + 1.05;
    const standH = 0.9;
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, standH, 12),
      metalMaterial(0x475569, { metalness: 0.8, roughness: 0.35 }),
    );
    stand.position.set(meterX, benchTopY + standH / 2, meterZ);
    this.scene.add(stand);
    const standShadow = contactShadow(0.3, 0.3, 0.4);
    standShadow.position.set(meterX, benchTopY + 0.006, meterZ);
    this.scene.add(standShadow);

    const dialR = 0.55;
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(dialR + 0.09, dialR + 0.09, 0.14, 32),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.set(meterX, meterY, meterZ);
    this.scene.add(housing);
    this._housing = housing;
    tip(housing, 'Galvanometer', 'The needle deflects proportionally to the live thermocouple EMF — right for one sign, left for the other.');

    const face = new THREE.Mesh(
      new THREE.CircleGeometry(dialR, 40),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
    );
    face.position.set(meterX, meterY, meterZ + 0.075);
    this.scene.add(face);

    // Tick marks on the dial face (static, world-space small boxes).
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    for (let i = -4; i <= 4; i++) {
      const frac = i / 4;
      const ang = (frac * 58 * Math.PI) / 180;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, i === 0 ? 0.12 : 0.07, 0.01), tickMat);
      const rr = dialR - 0.07;
      tick.position.set(meterX + Math.sin(ang) * rr, meterY + Math.cos(ang) * rr, meterZ + 0.08);
      tick.rotation.z = -ang;
      this.scene.add(tick);
    }

    // Needle pivot group — rotate .rotation.z to deflect.
    this._needlePivot = new THREE.Group();
    this._needlePivot.position.set(meterX, meterY, meterZ + 0.09);
    this.scene.add(this._needlePivot);
    const needle = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, dialR * 0.82, 10),
      new THREE.MeshStandardMaterial({ color: 0xf87171, emissive: 0x7f1d1d, emissiveIntensity: 0.4 }),
    );
    needle.position.y = dialR * 0.41;
    this._needlePivot.add(needle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), metalMaterial(0x1e293b, { metalness: 0.6, roughness: 0.4 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.set(meterX, meterY, meterZ + 0.085);
    this.scene.add(hub);

    this.scene.add(placeLabel('galvanometer', meterX, meterY + dialR + 0.32, meterZ, '#e2e8f0', 1.0));
    this._emfLbl = placeLabel('EMF = 0.000 mV', meterX, meterY - dialR - 0.62, meterZ, '#4ade80', 1.0);
    this._emfLbl.userData.color = '#4ade80';
    this.scene.add(this._emfLbl);

    // --- Wires: metal A (copper) from hot junction to meter's left side;
    // metal B (constantan) from meter's right side to cold junction. ---
    const wireAMat = metalMaterial(0xf59e0b, { metalness: 0.7, roughness: 0.35 });
    const wireBMat = metalMaterial(0xcbd5e1, { metalness: 0.75, roughness: 0.3 });
    const meterLeft = new THREE.Vector3(meterX - dialR * 0.75, meterY, meterZ + 0.15);
    const meterRight = new THREE.Vector3(meterX + dialR * 0.75, meterY, meterZ + 0.15);
    this._wireA = this._makeWireTube(this._hot.junctionPos, meterLeft, wireAMat);
    this._wireB = this._makeWireTube(meterRight, this._cold.junctionPos, wireBMat);
    this.scene.add(this._wireA, this._wireB);
    this._wireACurve = this._wireA.userData.curve;
    this._wireBCurve = this._wireB.userData.curve;

    // Wire labels sit at 30% along each curve (close to the junction end,
    // away from both the bath label above the beaker and the meter labels).
    const aPt = this._wireACurve.getPointAt(0.5);
    const bPt = this._wireBCurve.getPointAt(0.5);
    this.scene.add(placeLabel('metal A (Cu)', aPt.x, aPt.y + 0.4, aPt.z, '#fbbf24', 0.85));
    this.scene.add(placeLabel('metal B (constantan)', bPt.x, bPt.y + 0.4, bPt.z, '#cbd5e1', 0.85));
  }

  _buildBeaker(x, z, benchTopY, hot) {
    const beakerR = 0.85;
    const beakerH = 1.5;
    const beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(beakerR, beakerR * 0.94, beakerH, 32, 1, true),
      glassMaterial(0x94a3b8, 0.16)
    );
    beaker.position.set(x, benchTopY + beakerH / 2, z);
    this.scene.add(beaker);
    const bottomY = beaker.position.y - beakerH / 2;
    const shadow = contactShadow(beakerR * 1.15, beakerR * 1.05, 0.5);
    shadow.position.set(x, benchTopY + 0.006, z);
    this.scene.add(shadow);

    const liquidH = beakerH * 0.72;
    const liquidR = beakerR * 0.93;
    const liquidColor = hot ? 0xea580c : 0x2563eb;
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(liquidR, liquidR * 0.95, liquidH, 32),
      glassMaterial(liquidColor, hot ? 0.4 : 0.42)
    );
    liquid.position.set(x, bottomY + liquidH / 2 + 0.04, z);
    this.scene.add(liquid);
    const liquidTopY = liquid.position.y + liquidH / 2;
    const liquidBottomY = liquid.position.y - liquidH / 2 + 0.04;

    if (hot) {
      // Small heater block resting at the base of the beaker.
      const heater = new THREE.Mesh(
        new THREE.CylinderGeometry(liquidR * 0.4, liquidR * 0.45, 0.12, 20),
        metalMaterial(0x7c2d12, { metalness: 0.6, roughness: 0.5, emissive: 0xea580c, emissiveIntensity: 0.25 }),
      );
      heater.position.set(x, bottomY + 0.1, z);
      this.scene.add(heater);
    } else {
      // Floating ice cubes near the surface.
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.05 });
      const cubePositions = [[-0.28, 0.05, 0.06], [0.22, -0.02, -0.1], [0.02, 0.06, 0.22]];
      for (let i = 0; i < cubePositions.length; i++) {
        const [dx, dy, dz] = cubePositions[i];
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), iceMat);
        cube.position.set(x + dx, liquidTopY - 0.06 + dy, z + dz);
        cube.rotation.set(0.15 * i, 0.3 * i, 0);
        this.scene.add(cube);
      }
    }

    // The cold beaker sits nearer the camera than the hot one at this
    // orbit angle, so its overhead label needs a bit more clearance to
    // stay clear of the meter's wire-B / EMF labels behind it.
    const bathLabelY = liquidTopY + (hot ? 0.45 : 0.72);
    this.scene.add(placeLabel(hot ? 'hot bath' : 'ice bath', x, bathLabelY, z + beakerR * 0.5, hot ? '#fdba74' : '#bae6fd', 0.95));
    const tempColorHex = hot ? '#fb923c' : '#7dd3fc';
    const tempLbl = placeLabel(((hot ? this.state.Th : this.state.Tc) - 273).toFixed(0) + ' °C', x, bottomY - 0.28, z, tempColorHex, 0.9);
    tempLbl.userData.color = tempColorHex;
    this.scene.add(tempLbl);

    // Junction: a small glowing sphere dipped into the liquid.
    const junctionPos = new THREE.Vector3(x, liquidTopY - (liquidTopY - liquidBottomY) * 0.4, z);
    const junction = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: tempColor(hot ? this.state.Th : this.state.Tc), roughness: 0.4, metalness: 0.3 }),
    );
    junction.position.copy(junctionPos);
    attachGlow(junction, tempColor(hot ? this.state.Th : this.state.Tc), 0.35);
    this.scene.add(junction);
    tip(junction, hot ? 'Hot junction' : 'Cold junction', hot
      ? 'Held at Th in the hot bath — carriers here diffuse away faster, seeding the EMF.'
      : 'Held at Tc in the ice bath — the reference junction the EMF is measured against.');

    return {
      x, z, bottomY, liquidTopY, liquidBottomY, junction, junctionPos,
      tempLbl, beakerR,
    };
  }

  _makeWireTube(from, to, mat) {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.7;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    const geo = new THREE.TubeGeometry(curve, 24, 0.032, 8, false);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.curve = curve;
    return mesh;
  }

  _buildCarriers() {
    const group = new THREE.Group();
    this.scene.add(group);
    for (let i = 0; i < N_CARRIERS; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 }),
      );
      mesh.userData.seed = i / N_CARRIERS;
      mesh.userData.onA = i % 2 === 0;
      group.add(mesh);
      this._carriers.push(mesh);
    }
  }

  _buildBubbles() {
    const group = new THREE.Group();
    this.scene.add(group);
    for (let i = 0; i < N_BUBBLES; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + 0.02 * Math.random(), 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfed7aa, transparent: true, opacity: 0.6 }),
      );
      mesh.userData.seed = i / N_BUBBLES;
      mesh.userData.lane = (Math.random() - 0.5) * 0.4;
      group.add(mesh);
      this._bubbles.push(mesh);
    }
    this._bubbleGroup = group;
  }

  setParams(p) {
    if (!p) return;
    let changed = false;
    if (p.Th != null && p.Th !== this.state.Th) { this.state.Th = p.Th; changed = true; }
    if (p.Tc != null && p.Tc !== this.state.Tc) { this.state.Tc = p.Tc; changed = true; }
    if (p.pairId != null) this.state.pairId = p.pairId;
    if (changed && this._hot && this._cold) {
      this._hot.junction.material.color.setHex(tempColor(this.state.Th));
      this._cold.junction.material.color.setHex(tempColor(this.state.Tc));
    }
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips() { /* tips are attached inline via tip() at build time */ }

  getPickables() {
    return [
      this._hot && this._hot.junction,
      this._cold && this._cold.junction,
      this._housing,
    ].filter(Boolean);
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

  _updateLabels() {
    this._labelTick++;
    if (this._labelTick % 6 !== 0) return;
    const pair = findPair(this.state.pairId);
    const emfMv = 1000 * seebeckEMF(pair.S, this.state.Th, this.state.Tc);
    this._setLabelText(this._emfLbl, 'EMF = ' + emfMv.toFixed(3) + ' mV');
    if (this._hot && this._hot.tempLbl) this._setLabelText(this._hot.tempLbl, (this.state.Th - 273).toFixed(0) + ' °C');
    if (this._cold && this._cold.tempLbl) this._setLabelText(this._cold.tempLbl, (this.state.Tc - 273).toFixed(0) + ' °C');
  }

  _setLabelText(sprite, text) {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    const cv = sprite.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 6, 376, 36, 8);
    else ctx.rect(4, 6, 376, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sprite.userData.color || '#a9c4ff';
    ctx.font = '600 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 24);
    sprite.material.map.needsUpdate = true;
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;

      const pair = findPair(this.state.pairId);
      const emfV = seebeckEMF(pair.S, this.state.Th, this.state.Tc);
      const emfMv = emfV * 1000;

      if (this._needlePivot) {
        const target = needleAngleRad(emfMv, METER_FULL_SCALE_MV, 58);
        this._needlePivot.rotation.z += (-target - this._needlePivot.rotation.z) * 0.15;
      }

      this._updateLabels();

      // Carriers drift along the two wire curves, direction set by EMF sign.
      const speed = Math.max(0.12, Math.min(1.8, Math.abs(emfMv) / 4));
      const dir = emfV >= 0 ? 1 : -1;
      for (let i = 0; i < this._carriers.length; i++) {
        const c = this._carriers[i];
        const curve = c.userData.onA ? this._wireACurve : this._wireBCurve;
        if (!curve) continue;
        let t = ((this.phase * speed * 0.12 * dir) + c.userData.seed) % 1;
        t = (t + 1) % 1;
        const pos = curve.getPointAt(t);
        c.position.copy(pos);
        const fade = Math.min(1, Math.min(t, 1 - t) * 6);
        c.material.opacity = 0.3 + 0.55 * fade;
      }

      // Rising bubbles in the hot beaker only.
      if (this._hot) {
        const yMin = this._hot.liquidBottomY + 0.1;
        const yMax = this._hot.liquidTopY - 0.05;
        for (let i = 0; i < this._bubbles.length; i++) {
          const b = this._bubbles[i];
          const t = (this.phase * 0.4 + b.userData.seed) % 1;
          b.position.set(this._hot.x + b.userData.lane, yMin + t * (yMax - yMin), this._hot.z + b.userData.lane * 0.5);
          b.material.opacity = 0.6 * (1 - t);
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
