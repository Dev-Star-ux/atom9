// Electrostatic shielding / Faraday cage — 3D schematic.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getMaterial, shieldingFactor, interiorField } from './physics.js';
import { tip } from '../common/sceneChrome.js';
import {
  setupScene,
  setupRenderer,
  addStudioLights,
  addFloorGrid,
  placeLabel,
  glassMaterial,
  glowSphere,
  attachGlow,
  metalMaterial,
  roundedBoxGeometry,
  contactShadow,
} from '../common/sceneVisuals.js';

const CAGE_HALF = 1.4; // half-width of cage box
const FIELD_X0 = -4.4; // where external field arrows start
const FIELD_X1 = -CAGE_HALF - 0.15; // where they approach the cage's left face
const FLOOR_Y = -2.2; // matches addFloorGrid() below

function makeArrow(color, shaftLen, shaftR, headLen, headR) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = shaftLen / 2;
  g.add(shaft);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(headR, headLen, 10),
    new THREE.MeshBasicMaterial({ color })
  );
  head.rotation.z = -Math.PI / 2;
  head.position.x = shaftLen + headLen / 2;
  g.add(head);
  g.userData.head = head;
  g.userData.shaft = shaft;
  attachGlow(head, color, headR * 3.2);
  return g;
}

/** A wireframe "enclosure frame" made from 12 slim metal cylinders along
 *  the edges of a cube — reads as a real conductive cage rather than a
 *  bare translucent box. `size` is the full edge length of the cube. */
function buildEdgeFrame(size, radius, material) {
  const group = new THREE.Group();
  const h = size / 2;
  const mkBar = () => new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, size, 8), material);
  // Edges running along X: cylinder default axis is Y, so rotate 90° about Z.
  [-h, h].forEach((y) => [-h, h].forEach((z) => {
    const bar = mkBar();
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, y, z);
    group.add(bar);
  }));
  // Edges running along Y: no rotation needed.
  [-h, h].forEach((x) => [-h, h].forEach((z) => {
    const bar = mkBar();
    bar.position.set(x, 0, z);
    group.add(bar);
  }));
  // Edges running along Z: rotate 90° about X.
  [-h, h].forEach((x) => [-h, h].forEach((y) => {
    const bar = mkBar();
    bar.rotation.x = Math.PI / 2;
    bar.position.set(x, y, 0);
    group.add(bar);
  }));
  return group;
}

export class ElectrostaticShielding3D {
  constructor(container) {
    this.container = container;
    this.state = { E0: 5, cageOn: true, materialId: 'conductor', holeMm: 5 };
    this.paused = false;
    this._active = false;
    this._t = 0;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(3.7, 3.3, 8.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(-0.3, 0.05, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, FLOOR_Y);

    this._extArrows = [];
    this._leakArrows = [];
    this._cageParts = new THREE.Group();
    this.scene.add(this._cageParts);
    this._chargeMarkers = [];
    this._labels = [];

    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  _buildStage() {
    // Pedestal: a flat metal base plate the cage sits on, plus a soft
    // contact shadow, so the cage reads as a grounded apparatus rather
    // than a shape floating in space. roundedBoxGeometry(w,h,depth,...)
    // already lies flat in the XZ plane — no extra rotation needed.
    const padSize = CAGE_HALF * 2 + 1.0;
    const padTopY = -CAGE_HALF - 0.15;
    const pedestal = new THREE.Mesh(
      roundedBoxGeometry(padSize, 0.22, padSize, 0.05, 4),
      metalMaterial(0x1a2332, { metalness: 0.55, roughness: 0.55 }),
    );
    pedestal.position.set(0, padTopY - 0.11, 0);
    this.scene.add(pedestal);
    // Thin metal edge frame around the plate's top face — the perimeter of
    // a square is just 2 bars running along X (at z=±half) and 2 along Z
    // (at x=±half), so no arbitrary-angle rotation math is needed.
    const rimMat = metalMaterial(0x94a3b8, { metalness: 0.85, roughness: 0.25 });
    const rimBarR = 0.02;
    const padHalf = padSize / 2;
    [-padHalf, padHalf].forEach((z) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(rimBarR, rimBarR, padSize, 8), rimMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, padTopY, z);
      this.scene.add(bar);
    });
    [-padHalf, padHalf].forEach((x) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(rimBarR, rimBarR, padSize, 8), rimMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(x, padTopY, 0);
      this.scene.add(bar);
    });
    this.scene.add(contactShadow(padSize * 0.62, padSize * 0.62, 0.5).translateY(padTopY - 0.215));

    // External field arrow row (approaching from the left, along +x).
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const y = -1.0 + (i / (rows - 1)) * 2.0;
      const shaftLen = (FIELD_X1 - FIELD_X0) * 0.72;
      const arrow = makeArrow(0x38bdf8, shaftLen, 0.035, 0.22, 0.09);
      arrow.position.set(FIELD_X0, y, 0);
      arrow.userData.baseX = FIELD_X0;
      arrow.userData.row = i;
      this.scene.add(arrow);
      this._extArrows.push(arrow);
      tip(arrow.userData.head, 'External field E₀', 'Uniform field approaching the cage from the left. Field lines terminate on induced charge or pass through, depending on material.');
    }
    this.scene.add(placeLabel('External field E₀', FIELD_X0 - 0.1, 1.6, 0, '#7dd3fc', 1.1));

    // A phone sitting inside the cage — same tangible "watch the bars drop"
    // demo as the 2D view, instead of an abstract probe arrow + number.
    this._phoneCanvas = document.createElement('canvas');
    this._phoneCanvas.width = 96;
    this._phoneCanvas.height = 96;
    this._phoneTexture = new THREE.CanvasTexture(this._phoneCanvas);
    this.phoneSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._phoneTexture, transparent: true, depthTest: false,
    }));
    this.phoneSprite.scale.set(0.85, 0.85, 1);
    this.phoneSprite.position.set(0, 0.05, 0);
    this.phoneSprite.renderOrder = 5;
    this.scene.add(this.phoneSprite);
    tip(this.phoneSprite, 'Phone inside the cage', 'Signal bars = interior field relative to the external field — the same tangible demo as sealing a phone in foil.');

    this._rebuildCage();
  }

  _clearGroup(group) {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i];
      group.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }

  _rebuildCage() {
    this._clearGroup(this._cageParts);
    // dispose old leak arrows
    for (let i = 0; i < this._leakArrows.length; i++) {
      const a = this._leakArrows[i];
      this.scene.remove(a);
      a.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    this._leakArrows = [];
    for (let i = 0; i < this._chargeMarkers.length; i++) this.scene.remove(this._chargeMarkers[i]);
    this._chargeMarkers = [];

    const mat = getMaterial(this.state.materialId);
    const cageOn = this.state.cageOn;
    const solid = cageOn && this.state.materialId === 'conductor';
    const isMesh = cageOn && this.state.materialId === 'mesh';
    const isInsulator = cageOn && this.state.materialId === 'insulator';
    const passThrough = !cageOn || isInsulator;
    const S = shieldingFactor(this.state.materialId, this.state.holeMm);
    const size = CAGE_HALF * 2;

    if (solid) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), glassMaterial(0x94a3b8, 0.3));
      this._cageParts.add(box);
      tip(box, 'Solid conductor', 'Free charges redistribute on the surface, canceling the field everywhere inside.');
      // Metal edge frame so the box reads as a manufactured enclosure
      // rather than a bare translucent shape.
      const frame = buildEdgeFrame(size, 0.028, metalMaterial(0xcbd5e1, { metalness: 0.85, roughness: 0.25 }));
      this._cageParts.add(frame);
    } else if (isMesh) {
      // Lattice of thin cylinders forming a visible grid on each face; spacing
      // shrinks as holeMm shrinks (finer mesh -> better shielding).
      const cols = Math.max(2, Math.round(10 - this.state.holeMm / 6));
      const barR = 0.02;
      const group = new THREE.Group();
      const barMat = metalMaterial(0x4ade80, { metalness: 0.3, roughness: 0.4 });
      for (let c = 0; c <= cols; c++) {
        const off = -CAGE_HALF + (c / cols) * size;
        // vertical bars on front/back faces
        [-CAGE_HALF, CAGE_HALF].forEach(function (z) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, size, 6), barMat);
          bar.position.set(off, 0, z);
          group.add(bar);
        });
        // horizontal bars on front/back faces
        [-CAGE_HALF, CAGE_HALF].forEach(function (z) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, size, 6), barMat);
          bar.rotation.z = Math.PI / 2;
          bar.position.set(0, off, z);
          group.add(bar);
        });
        // vertical bars on left/right faces
        [-CAGE_HALF, CAGE_HALF].forEach(function (x) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, size, 6), barMat);
          bar.position.set(x, 0, off);
          group.add(bar);
        });
      }
      const shell = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), glassMaterial(0x4ade80, 0.06));
      group.add(shell);
      tip(shell, 'Conducting mesh', 'Partial shielding — smaller holes give a larger shielding factor S = ' + S.toFixed(1) + '.');
      // Metal corner posts frame the mesh lattice like real cage hardware.
      const frame = buildEdgeFrame(size, 0.03, metalMaterial(0x94a3b8, { metalness: 0.8, roughness: 0.3 }));
      group.add(frame);
      this._cageParts.add(group);
    } else {
      // Insulator or cage off: dashed-outline transparent box.
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineDashedMaterial({ color: isInsulator ? 0xf87171 : 0x64748b, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.7 })
      );
      line.computeLineDistances();
      this._cageParts.add(line);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), glassMaterial(isInsulator ? 0xf87171 : 0x64748b, 0.05));
      tip(shell, isInsulator ? 'Insulator' : 'Cage off', isInsulator ? 'No free charges to redistribute — the field passes straight through.' : 'No enclosure present — the field is completely unaffected.');
      this._cageParts.add(shell);
    }

    // Induced charge markers on left (upwind, −) / right (downwind, +) faces.
    if (cageOn && (solid || isMesh)) {
      const rows = 3;
      for (let i = 0; i < rows; i++) {
        const y = -0.8 + (i / (rows - 1)) * 1.6;
        const neg = glowSphere(0.09, 0x60a5fa, { pick: true });
        neg.position.set(-CAGE_HALF - 0.05, y, 0);
        tip(neg, 'Induced charge (−)', 'Electrons pile up on the face nearest the source field.');
        this.scene.add(neg);
        this._chargeMarkers.push(neg);

        const pos = glowSphere(0.09, 0xf87171, { pick: true });
        pos.position.set(CAGE_HALF + 0.05, y, 0);
        tip(pos, 'Induced charge (+)', 'The far face is left with a net positive charge.');
        this.scene.add(pos);
        this._chargeMarkers.push(pos);
      }
    }

    // External arrows: stop at face for solid; partial leak-through for mesh;
    // pass straight through for insulator / cage off.
    const fullLen = (FIELD_X1 - FIELD_X0) * 0.72;
    for (let i = 0; i < this._extArrows.length; i++) {
      const arrow = this._extArrows[i];
      if (passThrough) {
        arrow.userData.stopLen = fullLen + size + 1.6; // continues across & beyond cage
        arrow.userData.passesThrough = true;
      } else {
        arrow.userData.stopLen = fullLen;
        arrow.userData.passesThrough = false;
      }
      this._setArrowLength(arrow, arrow.userData.stopLen);
    }

    if (isMesh) {
      // A few dimmer/shorter arrows continuing partway into the interior,
      // count and depth scaled by shielding factor (weaker shielding -> deeper).
      const depthFrac = Math.min(0.85, 4 / Math.max(S, 1));
      const count = Math.max(1, Math.round(5 * Math.min(1, 8 / Math.max(S, 1))));
      for (let i = 0; i < count; i++) {
        const y = -0.9 + (i / Math.max(1, count - 1)) * 1.8;
        const depth = size * depthFrac;
        const leak = makeArrow(0x38bdf8, Math.max(0.08, depth * 0.75), 0.02, 0.1, 0.045);
        leak.position.set(-CAGE_HALF, y, 0);
        leak.material && leak.material.transparent;
        leak.traverse(function (o) { if (o.material) { o.material.transparent = true; o.material.opacity = 0.45; } });
        this.scene.add(leak);
        this._leakArrows.push(leak);
      }
    }

    // Phone signal bars ~ interiorField relative to E0 (near-zero for conductor).
    const Ein = interiorField(this.state.E0, this.state.materialId, this.state.holeMm, cageOn);
    const sigFrac = Math.max(0, Math.min(1, Ein / Math.max(this.state.E0, 1e-9)));
    const barsLit = passThrough ? 4 : Math.round(sigFrac * 4);
    this._drawPhoneTexture(barsLit);
  }

  _setArrowLength(arrow, len) {
    const shaft = arrow.userData.shaft;
    const head = arrow.userData.head;
    const headLen = head.geometry.parameters.height;
    const shaftLen = Math.max(0.01, len - headLen);
    shaft.scale.y = shaftLen / shaft.geometry.parameters.height;
    shaft.position.x = shaftLen / 2;
    head.position.x = shaftLen + headLen / 2;
  }

  /** Draws a small phone-with-signal-bars icon onto the sprite texture —
   *  bars drop to none once the cage actually blocks the field, same
   *  language as the 2D view. */
  _drawPhoneTexture(barsLit) {
    const cv = this._phoneCanvas;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    const cx = cv.width / 2;
    const pw = 26;
    const ph = 46;
    const px = cx - pw / 2;
    const py = 40;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(px, py, pw, ph, 5);
    else ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = barsLit > 0 ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.28)';
    ctx.fillRect(px + 3, py + 5, pw - 6, ph - 10);

    const barsX = cx - 22;
    const barsY = py - 6;
    for (let i = 0; i < 4; i++) {
      const bw = 5;
      const bh = 6 + i * 5;
      const bx = barsX + i * (bw + 2);
      const by = barsY - bh;
      ctx.fillStyle = i < barsLit ? '#4ade80' : 'rgba(148,163,184,0.35)';
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = barsLit > 0 ? '#4ade80' : '#f87171';
    ctx.fillText(barsLit > 0 ? barsLit + ' bars' : 'NO SIGNAL', cx, barsY - 30);
    this._phoneTexture.needsUpdate = true;
  }

  setParams(p) {
    if (!p) return;
    let dirty = false;
    if (p.E0 != null && p.E0 !== this.state.E0) { this.state.E0 = p.E0; dirty = true; }
    if (p.cageOn != null && p.cageOn !== this.state.cageOn) { this.state.cageOn = p.cageOn; dirty = true; }
    if (p.materialId != null && p.materialId !== this.state.materialId) { this.state.materialId = p.materialId; dirty = true; }
    if (p.holeMm != null && p.holeMm !== this.state.holeMm) { this.state.holeMm = p.holeMm; dirty = true; }
    if (dirty) this._rebuildCage();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }

  applyTips(tips) {
    this._tipTexts = tips;
  }

  getPickables() {
    const list = [];
    this._cageParts.children.forEach(function (c) { list.push(c); if (c.children) c.children.forEach(function (cc) { list.push(cc); }); });
    return list.concat(this._chargeMarkers, [this.phoneSprite].filter(Boolean));
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
      this._t += 0.02;
      // Subtle flowing/pulsing motion on the external field arrows so the
      // field lines read as "live" rather than a static drawing.
      for (let i = 0; i < this._extArrows.length; i++) {
        const a = this._extArrows[i];
        const wobble = Math.sin(this._t * 2 + a.userData.row) * 0.06;
        a.position.x = a.userData.baseX + wobble;
      }
      for (let i = 0; i < this._leakArrows.length; i++) {
        const a = this._leakArrows[i];
        a.traverse(function (o) {
          if (o.material) o.material.opacity = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(this._t * 3 + i));
        }.bind(this));
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
