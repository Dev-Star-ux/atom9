// Hall effect — 3D lab apparatus: a rectangular semiconductor slab held
// between two magnet pole pieces (N above, S below), current-supply leads
// on the two short ends feeding from a small current source, and
// Hall-voltage sense leads on the two long edges running to a voltmeter
// with a live digital readout. Carriers (small spheres) drift along the
// slab and visibly curve sideways toward one long edge as they travel —
// an animated stand-in for the Lorentz-force deflection.
//
// Axis convention used here: X = slab length (current direction),
// Y = slab thickness (sandwiched vertically between N above / S below,
// so B points -Y), Z = slab width (the Hall axis — the two long edges
// sit at z = +halfWidth and z = -halfWidth).
//
// Physics note (see physics.js for the full derivation): for fixed
// current and fixed B, F = q*v_drift x B pushes BOTH electrons and holes
// toward the SAME physical edge (q and v_drift flip sign together, so
// q*v_drift does not). What flips between n-type and p-type is the SIGN
// of the charge piling up there — so both carrier types curve toward the
// same edge here (z = -halfWidth), while the edge labels and the
// voltmeter sign flip with carrier type.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { hallVoltage, hallVoltageSigned } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  attachGlow,
  placeLabel,
  metalMaterial,
  plasticMaterial,
  glassMaterial,
  roundedBoxGeometry,
  contactShadow,
  solidGuide,
} from '../common/sceneVisuals.js';

const N_CARRIERS = 24;
const VISUAL_AMP = 2e6; // same exaggeration factor as the 2D view

const SLAB_LEN_X = 2.3;   // length (current axis)
const SLAB_THICK_Y = 0.26; // thickness (sandwiched by N/S poles)
const SLAB_WID_Z = 1.05;  // width (Hall axis, long edges at +-halfWidth)

export class HallScene3D {
  constructor(container) {
    this.container = container;
    this.state = { I: 1.0, B: 0.5, n: 8.5e28, t: 0.0005, carrier: 'n' };
    this.phase = 0;
    this.paused = false;
    this._active = false;
    this._labelTick = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(6.4, 1.7, 7.2);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.1, -0.9, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.1);

    this._carriers = [];
    this._buildStage();
    this._buildCarriers();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.12;
    this.scene.add(floor);

    // Bench
    const benchW = 6.4, benchD = 3.4, benchH = 0.14, benchTopY = -1.55;
    this.bench = new THREE.Mesh(
      new THREE.BoxGeometry(benchW, benchH, benchD),
      metalMaterial(0x11161f, { metalness: 0.35, roughness: 0.65 }),
    );
    this.bench.position.set(0, benchTopY - benchH / 2, 0);
    this.scene.add(this.bench);
    const benchShadow = contactShadow(benchW * 0.42, benchD * 0.46, 0.35);
    benchShadow.position.set(0, benchTopY + 0.005, 0);
    this.scene.add(benchShadow);

    const halfX = SLAB_LEN_X / 2;
    const halfY = SLAB_THICK_Y / 2;
    const halfZ = SLAB_WID_Z / 2;
    this._halfX = halfX;
    this._halfY = halfY;
    this._halfZ = halfZ;
    const slabCy = benchTopY + 1.05;
    this._slabCy = slabCy;

    // --- Semiconductor slab --- translucent so the drifting carriers
    // inside remain visible (an opaque slab would fully hide them).
    this.slab = new THREE.Mesh(
      new THREE.BoxGeometry(SLAB_LEN_X, SLAB_THICK_Y, SLAB_WID_Z),
      glassMaterial(0x475569, 0.45),
    );
    this.slab.position.set(0, slabCy, 0);
    this.scene.add(this.slab);
    tip(this.slab, 'Semiconductor sample', 'Current flows along its length; the Lorentz force on the drifting carriers pushes them toward one long edge, building up the Hall voltage across the width. (Shown translucent so the carriers inside stay visible.)');
    const slabEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.slab.geometry),
      new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 }),
    );
    this.slab.add(slabEdges);

    // --- Magnet pole pieces (N above, S below), sandwiching the slab ---
    const poleW = SLAB_LEN_X * 0.82;
    const poleThick = 0.34;
    const poleDepth = SLAB_WID_Z * 1.2;
    const gapY = 0.18;

    this.poleN = new THREE.Mesh(
      new THREE.BoxGeometry(poleW, poleThick, poleDepth),
      metalMaterial(0x7f1d1d, { metalness: 0.55, roughness: 0.4, emissive: 0x7f1d1d, emissiveIntensity: 0.18 }),
    );
    this.poleN.position.set(0, slabCy + halfY + gapY + poleThick / 2, 0);
    this.scene.add(this.poleN);
    tip(this.poleN, 'N pole piece', 'North pole of the electromagnet, sitting just above the sample. Field lines leave here and thread down through the slab toward the S pole.');
    this.scene.add(placeLabel('N', 0, this.poleN.position.y + poleThick / 2 + 0.22, 0, '#fca5a5', 0.9));

    this.poleS = new THREE.Mesh(
      new THREE.BoxGeometry(poleW, poleThick, poleDepth),
      metalMaterial(0x1e3a8a, { metalness: 0.55, roughness: 0.4, emissive: 0x1e3a8a, emissiveIntensity: 0.18 }),
    );
    this.poleS.position.set(0, slabCy - halfY - gapY - poleThick / 2, 0);
    this.scene.add(this.poleS);
    tip(this.poleS, 'S pole piece', 'South pole of the electromagnet, sitting just below the sample. Field lines return here after threading through the slab.');
    this.scene.add(placeLabel('S', 0, this.poleS.position.y - poleThick / 2 - 0.22, 0, '#93c5fd', 0.9));

    // Field arrow hint (N -> S) just beside the sandwich, offset toward
    // +X (away from the current-source side) to avoid label clutter.
    const fieldX = poleW * 0.5 - 0.12;
    this._fieldArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(fieldX, this.poleN.position.y - poleThick / 2, halfZ + 0.05),
      (this.poleN.position.y - poleThick / 2) - (this.poleS.position.y + poleThick / 2),
      0xcbd5e1, 0.12, 0.08,
    );
    this.scene.add(this._fieldArrow);
    this.scene.add(placeLabel('B', fieldX, slabCy, halfZ + 0.4, '#cbd5e1', 0.6));

    // --- Current source (short-end leads) ---
    const srcW = 0.52, srcH = 0.34, srcD = 0.4;
    const srcX = -halfX - 1.35;
    const srcY = benchTopY + srcH / 2;
    this.source = new THREE.Mesh(
      roundedBoxGeometry(srcW, srcH, srcD, 0.05, 3),
      plasticMaterial(0x1e293b, { roughness: 0.5 }),
    );
    this.source.position.set(srcX, srcY, 0);
    this.scene.add(this.source);
    tip(this.source, 'Current source', 'Drives a steady current I through the sample, entering and leaving at the two short ends.');
    this.scene.add(placeLabel('I source', srcX, srcY + srcH / 2 + 0.22, 0, '#fbbf24', 0.85));
    const srcShadow = contactShadow(0.42, 0.4, 0.35);
    srcShadow.position.set(srcX, benchTopY + 0.005, 0);
    this.scene.add(srcShadow);

    const wireI = metalMaterial(0xf59e0b, { metalness: 0.7, roughness: 0.35 });
    this._wireLeftI = this._makeWireTube(
      new THREE.Vector3(srcX + srcW / 2, srcY, 0),
      new THREE.Vector3(-halfX, slabCy, 0),
      wireI,
    );
    this._wireRightI = this._makeWireTube(
      new THREE.Vector3(halfX, slabCy, 0),
      new THREE.Vector3(srcX + srcW / 2, srcY, srcD * 0.9),
      wireI,
    );
    this.scene.add(this._wireLeftI, this._wireRightI);

    // --- Voltmeter (long-edge sense leads) ---
    const vmW = 0.62, vmH = 0.42, vmD = 0.4;
    const vmX = halfX + 1.55;
    const vmY = benchTopY + 1.35;
    this.voltmeter = new THREE.Mesh(
      roundedBoxGeometry(vmW, vmH, vmD, 0.05, 3),
      plasticMaterial(0x0b1220, { roughness: 0.45 }),
    );
    this.voltmeter.position.set(vmX, vmY, 0);
    this.scene.add(this.voltmeter);
    tip(this.voltmeter, 'Voltmeter', 'Reads the transverse Hall voltage across the sample’s long edges. Real Hall voltages are microvolts — this display and the carrier pile-up are exaggerated for visibility.');
    this.scene.add(placeLabel('Voltmeter', vmX, vmY + vmH / 2 + 0.24, 0, '#67e8f9', 0.85));
    this._vmFace = new THREE.Mesh(
      new THREE.PlaneGeometry(vmW * 0.82, vmH * 0.5),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    this._vmFace.position.set(vmX, vmY, vmD / 2 + 0.006);
    this.scene.add(this._vmFace);
    this._vmLbl = placeLabel('+0.000 µV', vmX, vmY, vmD / 2 + 0.02, '#4ade80', 0.62);
    this.scene.add(this._vmLbl);
    const vmShadow = contactShadow(0.5, 0.4, 0.35);
    vmShadow.position.set(vmX, benchTopY + 0.005, 0);
    this.scene.add(vmShadow);

    const wireV = metalMaterial(0x67e8f9, { metalness: 0.7, roughness: 0.35 });
    // Front long edge (z = +halfZ)
    this._wireFrontV = this._makeWireTube(
      new THREE.Vector3(0, slabCy + halfY, halfZ),
      new THREE.Vector3(vmX - vmW / 2, vmY, halfZ * 0.5),
      wireV,
    );
    // Back long edge (z = -halfZ) — this is the edge carriers pile toward
    this._wireBackV = this._makeWireTube(
      new THREE.Vector3(0, slabCy + halfY, -halfZ),
      new THREE.Vector3(vmX - vmW / 2, vmY, -halfZ * 0.5),
      wireV,
    );
    this.scene.add(this._wireFrontV, this._wireBackV);

    // Edge +/- labels (front = +Z, back = -Z, updated per carrier type).
    // Parked well clear of the pole-piece footprint (poles are deeper in Z
    // than the slab) with a thin leader line back to the actual edge.
    const lblZ = poleDepth / 2 + 0.34;
    const frontAnchor = new THREE.Vector3(0, slabCy + halfY * 0.4, halfZ);
    const frontLabelPos = new THREE.Vector3(0, slabCy, lblZ);
    this.scene.add(solidGuide([frontAnchor, frontLabelPos], '#f87171', 0.5));
    this._lblFront = placeLabel('+', frontLabelPos.x, frontLabelPos.y, frontLabelPos.z, '#f87171', 0.6);
    this.scene.add(this._lblFront);

    const backAnchor = new THREE.Vector3(0, slabCy + halfY * 0.4, -halfZ);
    const backLabelPos = new THREE.Vector3(0, slabCy, -lblZ);
    this.scene.add(solidGuide([backAnchor, backLabelPos], '#38bdf8', 0.5));
    this._lblBack = placeLabel('-', backLabelPos.x, backLabelPos.y, backLabelPos.z, '#38bdf8', 0.6);
    this.scene.add(this._lblBack);
  }

  _makeWireTube(from, to, mat) {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.4;
    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    const geo = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
    return new THREE.Mesh(geo, mat);
  }

  _buildCarriers() {
    const group = new THREE.Group();
    this.scene.add(group);
    for (let i = 0; i < N_CARRIERS; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 }),
      );
      mesh.userData.glow = attachGlow(mesh, 0x38bdf8, 0.16);
      mesh.userData.seed = i / N_CARRIERS;
      mesh.userData.laneY = (((i * 0.618) % 1) - 0.5) * 0.7;
      mesh.userData.laneZ0 = (((i + 4) * 0.427) % 1) - 0.5;
      group.add(mesh);
      this._carriers.push(mesh);
    }
    this._carrierGroup = group;
  }

  setParams(p) {
    if (!p) return;
    if (p.I != null) this.state.I = p.I;
    if (p.B != null) this.state.B = p.B;
    if (p.n != null) this.state.n = p.n;
    if (p.t != null) this.state.t = p.t;
    if (p.carrier != null) this.state.carrier = p.carrier;
    const isN = this.state.carrier === 'n';
    const color = isN ? 0x38bdf8 : 0xf87171;
    for (const c of this._carriers) {
      c.material.color.setHex(color);
      if (c.userData.glow) c.userData.glow.material.color.setHex(color);
    }
    this._speed = 0.16 + Math.min(1.2, this.state.I) * 0.2;
    if (this._lblFront && this._lblBack) {
      this._setLabelText(this._lblFront, isN ? '-' : '+', isN ? '#38bdf8' : '#f87171');
      this._setLabelText(this._lblBack, isN ? '+' : '-', isN ? '#f87171' : '#38bdf8');
    }
  }

  _setLabelText(sprite, text, color) {
    const cv = sprite.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.78)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 6, 376, 36, 8); else ctx.rect(4, 6, 376, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = '700 20px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 24);
    sprite.material.map.needsUpdate = true;
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return [this.slab, this.poleN, this.poleS, this.voltmeter, this.source].filter(Boolean);
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

  _updateVoltmeter(vhSigned) {
    this._labelTick++;
    if (this._labelTick % 6 !== 0) return;
    const cv = this._vmLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = vhSigned >= 0 ? '#f87171' : '#4ade80';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((vhSigned >= 0 ? '+' : '') + (vhSigned * 1e6).toFixed(3) + ' µV', 192, 24);
    this._vmLbl.material.map.needsUpdate = true;
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      const dt = 0.016;
      this.phase += dt;
      const s = this.state;
      const isN = s.carrier === 'n';
      const vh = hallVoltage(s.I, s.B, s.n, s.t);
      const vhSigned = hallVoltageSigned(s.I, s.B, s.n, s.t, s.carrier);
      this._updateVoltmeter(vhSigned);

      const driftDir = isN ? -1 : 1; // electrons drift -X, holes drift +X
      const speed = this._speed != null ? this._speed : 0.2;
      const pileFrac = Math.min(1, Math.abs(vh) * VISUAL_AMP); // 0..1
      const pileZ = -this._halfZ * 0.82 * pileFrac; // always toward z = -halfZ

      for (let i = 0; i < this._carriers.length; i++) {
        const c = this._carriers[i];
        const seed = c.userData.seed;
        let tt = (this.phase * speed + seed) % 1;
        // x position: progress tt represents how far the carrier has
        // travelled since entering the field region, for either drift sign.
        const x = driftDir > 0 ? (-this._halfX + this._halfX * 2 * tt) : (this._halfX - this._halfX * 2 * tt);
        const z0 = c.userData.laneZ0 * this._halfZ * 0.6;
        const z = z0 + (pileZ - z0) * tt; // curve toward the pile-up edge as it travels
        const y = this._slabCy + c.userData.laneY * this._halfY * 0.7;
        c.position.set(x, y, z);
        const fade = Math.min(1, Math.min(tt, 1 - tt) * 6);
        c.material.opacity = 0.35 + 0.55 * fade;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
