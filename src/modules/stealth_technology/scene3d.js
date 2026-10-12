// Stealth technology — radar dish vs conventional and faceted stealth airframes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { stealthSigmaEff, conventionalSigma, wavelength, diffractionHint, scatterLobes, formatSigmaM2 } from './physics.js';
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
  glowSphere,
  dashedGuide,
  attachGlow,
  glassMaterial,
} from '../common/sceneVisuals.js';

export class StealthTechnologyScene3D {
  constructor(container) {
    this.container = container;
    this.state = { shapeId: 'faceted', shaping: 0.86, absorb: 0, frequency: 1e10, sigma0: 5 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
    this.camera.position.set(6.2, 3.8, 7.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0.4, 0.5, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 26, -2.2);

    this._buildStage();
    this._radarOn = true;
    this._convReturnOn = false;
    this._steReturnOn = false;
    this._bindClicks();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
  }

  /** Click-to-interact: click the dish to start/stop the radar sweep beam;
   *  click either jet to toggle its RCS "return signal" readout. Uses its
   *  own raycaster (separate from the hover-tooltip one in sceneChrome). */
  _bindClicks() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dom = this.renderer.domElement;
    let down = null;
    this._onPointerDown = (e) => {
      if (e.button === 0) down = { x: e.clientX, y: e.clientY };
    };
    this._onPointerUp = (e) => {
      if (e.button !== 0 || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 10) return;
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const targets = [this.radarDish, this.conv, this.stealth].filter(Boolean);
      const hits = raycaster.intersectObjects(targets, true);
      if (!hits.length) return;
      let o = hits[0].object;
      while (o && o !== this.radarDish && o !== this.conv && o !== this.stealth) o = o.parent;
      if (o === this.radarDish) {
        this._radarOn = !this._radarOn;
      } else if (o === this.conv) {
        this._convReturnOn = !this._convReturnOn;
        this._updateReturnReadout('conv');
      } else if (o === this.stealth) {
        this._steReturnOn = !this._steReturnOn;
        this._updateReturnReadout('stealth');
      }
    };
    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('pointerup', this._onPointerUp);
  }

  /** Small canvas-sprite readout + glow marker anchored above a jet,
   *  toggled visible on click; text shows the jet's current RCS value. */
  _makeReturnReadout(color) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 48;
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false,
    }));
    sprite.scale.set(1.55, 0.29, 1);
    sprite.renderOrder = 12;
    sprite.visible = false;
    const glow = glowSphere(0.16, color, { pick: false });
    glow.visible = false;
    return { sprite, glow, canvas: cv, ctx: cv.getContext('2d'), tex, color };
  }

  /** Swept trapezoid wing in the XZ plane (span along ±Z, chord along X). */
  _planformMesh(rootChord, tipChord, span, sweep, thick, mat) {
    const s = new THREE.Shape();
    s.moveTo(rootChord * 0.42, 0);
    s.lineTo(sweep + tipChord * 0.18, span);
    s.lineTo(sweep - tipChord * 0.72, span);
    s.lineTo(-rootChord * 0.48, 0);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: thick,
      bevelEnabled: true,
      bevelThickness: thick * 0.45,
      bevelSize: thick * 0.22,
      bevelSegments: 10,
      curveSegments: 32,
    });
    geo.translate(0, 0, -thick / 2);
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return new THREE.Mesh(this._subdivideGeo(geo, 1), mat);
  }

  /** Lathed fighter fuselage: ogive nose, cockpit swell, boat tail. Length along +X. */
  _latheFuselage(profile, segs) {
    const pts = this._denseProfile(profile, 8);
    const geo = new THREE.LatheGeometry(pts, segs != null ? segs : 96);
    geo.rotateZ(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  _denseProfile(profile, nPer) {
    const pts = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i];
      const b = profile[i + 1];
      for (let k = 0; k < nPer; k++) {
        const t = k / nPer;
        pts.push(new THREE.Vector2(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
      }
    }
    const last = profile[profile.length - 1];
    pts.push(new THREE.Vector2(last[0], last[1]));
    return pts;
  }

  _denseXY(points, nPer) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      for (let k = 0; k < nPer; k++) {
        const t = k / nPer;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  /** Mid-point triangle split so hulls shade like high-poly Sketchfab ref meshes. */
  _subdivideGeo(geo, levels) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    const lv = levels != null ? levels : 1;
    for (let L = 0; L < lv; L++) {
      const pos = g.attributes.position;
      const next = new Float32Array(pos.count * 4 * 3);
      let w = 0;
      for (let i = 0; i < pos.count; i += 3) {
        const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
        const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
        const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
        const abx = (ax + bx) * 0.5, aby = (ay + by) * 0.5, abz = (az + bz) * 0.5;
        const bcx = (bx + cx) * 0.5, bcy = (by + cy) * 0.5, bcz = (bz + cz) * 0.5;
        const cax = (cx + ax) * 0.5, cay = (cy + ay) * 0.5, caz = (cz + az) * 0.5;
        const tri = [
          ax, ay, az, abx, aby, abz, cax, cay, caz,
          abx, aby, abz, bx, by, bz, bcx, bcy, bcz,
          cax, cay, caz, bcx, bcy, bcz, cx, cy, cz,
          abx, aby, abz, bcx, bcy, bcz, cax, cay, caz,
        ];
        next.set(tri, w);
        w += 36;
      }
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(next, 3));
    }
    g.computeVertexNormals();
    return g;
  }

  _hqExtrude(shape, thick, mat, subdiv) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick,
      bevelEnabled: true,
      bevelThickness: thick * 0.38,
      bevelSize: thick * 0.18,
      bevelSegments: 12,
      curveSegments: 48,
      steps: 2,
    });
    geo.translate(0, 0, -thick / 2);
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return new THREE.Mesh(this._subdivideGeo(geo, subdiv != null ? subdiv : 1), mat);
  }

  _buildConvAircraft() {
    const g = new THREE.Group();
    const bodyMat = metalMaterial(0xb8c4d4, { metalness: 0.72, roughness: 0.28 });
    const wingMat = metalMaterial(0xd5dee8, { metalness: 0.62, roughness: 0.34 });
    const darkMat = metalMaterial(0x3f4c5e, { metalness: 0.55, roughness: 0.42 });
    const exhaustMat = metalMaterial(0x1c1917, {
      metalness: 0.35, roughness: 0.48, emissive: 0xff6a1a, emissiveIntensity: 1.15,
    });
    this._convExhaustMats = [];

    const fuse = new THREE.Mesh(this._latheFuselage([
      [0.02, -1.28],
      [0.11, -1.18],
      [0.2, -0.95],
      [0.24, -0.55],
      [0.255, -0.05],
      [0.24, 0.35],
      [0.2, 0.62],
      [0.13, 0.92],
      [0.06, 1.15],
      [0.012, 1.32],
    ], 96), bodyMat);
    g.add(fuse);
    tip(fuse, 'Conventional airframe', 'Smooth curves and a tall vertical tail bounce radar straight back — large RCS.');
    this.convBody = fuse;

    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.28, 8), darkMat);
    pitot.rotation.z = Math.PI / 2;
    pitot.position.set(1.42, 0.02, 0);
    g.add(pitot);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55),
      glassMaterial(0x7dd3fc, 0.38),
    );
    canopy.scale.set(1.9, 0.78, 0.72);
    canopy.position.set(0.42, 0.2, 0);
    g.add(canopy);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 14, Math.PI * 0.7), darkMat);
    bow.rotation.y = Math.PI / 2;
    bow.scale.set(1.1, 0.85, 1);
    bow.position.set(0.62, 0.2, 0);
    g.add(bow);
    const hud = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.05),
      metalMaterial(0x22d3ee, { metalness: 0.2, roughness: 0.4, emissive: 0x0891b2, emissiveIntensity: 0.6 }),
    );
    hud.position.set(0.55, 0.14, 0);
    g.add(hud);
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.012, 8, 18, Math.PI),
      darkMat,
    );
    frame.rotation.y = Math.PI / 2;
    frame.rotation.z = Math.PI / 2;
    frame.scale.set(1.7, 0.7, 1);
    frame.position.set(0.42, 0.22, 0);
    g.add(frame);
    tip(canopy, 'Bubble canopy', 'Curved cockpit glass is a strong radar reflector.');
    this.convCanopy = canopy;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), darkMat);
    seat.position.set(0.42, 0.08, 0);
    g.add(seat);

    const wingL = this._planformMesh(0.95, 0.38, 1.35, -0.42, 0.045, wingMat);
    wingL.position.set(0.05, -0.02, 0.12);
    g.add(wingL);
    const wingR = this._planformMesh(0.95, 0.38, 1.35, -0.42, 0.045, wingMat);
    wingR.position.set(0.05, -0.02, -0.12);
    wingR.scale.z = -1;
    g.add(wingR);

    const lex = this._planformMesh(0.55, 0.12, 0.38, 0.15, 0.03, bodyMat);
    lex.position.set(0.35, 0.02, 0.08);
    g.add(lex);
    const lexR = lex.clone();
    lexR.position.z = -0.08;
    lexR.scale.z = -1;
    g.add(lexR);

    const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 16), darkMat);
    intake.rotation.z = Math.PI / 2;
    intake.position.set(0.15, -0.16, 0);
    g.add(intake);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 20), darkMat);
    lip.rotation.y = Math.PI / 2;
    lip.position.set(0.36, -0.16, 0);
    g.add(lip);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 20), darkMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(-1.12, 0, 0);
    g.add(nozzle);
    for (let i = 0; i < 3; i++) {
      const petal = new THREE.Mesh(new THREE.TorusGeometry(0.145 - i * 0.012, 0.012, 6, 18), darkMat);
      petal.rotation.y = Math.PI / 2;
      petal.position.set(-1.18 - i * 0.045, 0, 0);
      g.add(petal);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 16, 1, true), exhaustMat);
    flame.rotation.z = -Math.PI / 2;
    flame.position.set(-1.38, 0, 0);
    g.add(flame);
    const glow = attachGlow(flame, 0xff8c3c, 0.55);
    glow.position.x = -0.08;
    this._convExhaustMats.push(flame.material, glow.material);

    const vTail = this._planformMesh(0.55, 0.22, 0.62, -0.18, 0.035, bodyMat);
    vTail.position.set(-0.72, 0.18, 0);
    vTail.rotation.x = -Math.PI / 2;
    g.add(vTail);
    const rudder = this._planformMesh(0.28, 0.12, 0.48, -0.22, 0.012, darkMat);
    rudder.position.set(-0.82, 0.28, 0.012);
    rudder.rotation.x = -Math.PI / 2;
    g.add(rudder);
    const hL = this._planformMesh(0.42, 0.18, 0.48, -0.12, 0.028, wingMat);
    hL.position.set(-0.78, 0.06, 0.06);
    g.add(hL);
    const hR = this._planformMesh(0.42, 0.18, 0.48, -0.12, 0.028, wingMat);
    hR.position.set(-0.78, 0.06, -0.06);
    hR.scale.z = -1;
    g.add(hR);

    const railMat = metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.3 });
    const addMissile = (z) => {
      const m = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 10), railMat);
      body.rotation.z = Math.PI / 2;
      m.add(body);
      const noseM = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 10), metalMaterial(0xf8fafc, { metalness: 0.4, roughness: 0.35 }));
      noseM.rotation.z = -Math.PI / 2;
      noseM.position.x = 0.26;
      m.add(noseM);
      for (let k = 0; k < 4; k++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.01), railMat);
        fin.position.set(-0.16, 0, 0);
        fin.rotation.x = (k * Math.PI) / 2;
        m.add(fin);
      }
      m.position.set(0.05, -0.05, z);
      return m;
    };
    g.add(addMissile(1.42));
    g.add(addMissile(-1.42));

    // Panel breaks and control-surface gaps — the cues that this is a
    // smooth, curved airframe rather than one solid blob.
    const stations = [[-0.95, 0.2], [-0.45, 0.245], [0.15, 0.25], [0.55, 0.21], [0.9, 0.12]];
    for (let i = 0; i < stations.length; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(stations[i][1], 0.004, 6, 28), darkMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(stations[i][0], 0, 0);
      g.add(ring);
    }
    const flapL = this._planformMesh(0.38, 0.16, 1.05, -0.62, 0.016, darkMat);
    flapL.position.set(-0.12, -0.03, 0.22);
    g.add(flapL);
    const flapR = this._planformMesh(0.38, 0.16, 1.05, -0.62, 0.016, darkMat);
    flapR.position.set(-0.12, -0.03, -0.22);
    flapR.scale.z = -1;
    g.add(flapR);
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.008), darkMat);
    ant.position.set(-0.15, 0.3, 0);
    g.add(ant);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 12, 1, true), exhaustMat.clone());
    core.rotation.z = -Math.PI / 2;
    core.position.set(-1.48, 0, 0);
    g.add(core);
    this._convExhaustMats.push(core.material);

    return g;
  }

  /** RAM panel-line seams — a faint darker grid drawn onto a canvas and
   *  tiled across the faceted stealth hull. Deliberately coarse/irregular
   *  (not a clean UI grid) so it reads as riveted composite panels. */
  _panelTexture() {
    if (this._panelTex) return this._panelTex;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#12181f';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(4,7,12,0.85)';
    ctx.lineWidth = 2;
    const cells = 6;
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * 256;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
    }
    // sparse fastener dots along the seams
    ctx.fillStyle = 'rgba(30,41,59,0.9)';
    for (let i = 0; i <= cells; i++) {
      for (let j = 0; j <= cells; j++) {
        if ((i + j) % 2) continue;
        ctx.beginPath();
        ctx.arc((i / cells) * 256, (j / cells) * 256, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1.4);
    this._panelTex = tex;
    return tex;
  }

  _facet(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 8, 3, 6), mat);
  }

  /** F-117-style half planform: sharp nose, swept tip, sawtooth trailing edge. */
  _serratedWing(mat, thick) {
    const pts = this._denseXY([
      [1.52, 0.012],
      [0.08, 1.52],
      [-0.44, 1.34],
      [-0.14, 1.04],
      [-0.72, 0.84],
      [-0.3, 0.54],
      [-1.02, 0.34],
      [-0.5, 0.14],
      [-1.22, 0.012],
    ], 10);
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return this._hqExtrude(s, thick, mat, 1);
  }

  _shapeCaption(id) {
    if (id === 'blended') return 'stealth · F-22 blended';
    if (id === 'flyingWing') return 'stealth · B-2 flying wing';
    if (id === 'cruise') return 'stealth · cruise / UAV';
    return 'stealth · F-117 faceted';
  }

  _planformFrom(points, thick, mat) {
    const pts = this._denseXY(points, 12);
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return this._hqExtrude(s, thick, mat, 1);
  }

  _mirrorHalf(mesh) {
    const other = mesh.clone();
    other.material = mesh.material;
    other.scale.z *= -1;
    other.position.z *= -1;
    return other;
  }

  _hullMats(kind) {
    const pan = kind === 'faceted' || kind === 'flyingWing';
    const mat = metalMaterial(0x1a2330, { metalness: kind === 'blended' ? 0.55 : 0.42, roughness: kind === 'blended' ? 0.38 : 0.55 });
    const edgeMat = metalMaterial(0x0b1220, { metalness: 0.3, roughness: 0.68 });
    const bellyMat = metalMaterial(0x141c28, { metalness: 0.38, roughness: 0.6 });
    if (pan) {
      const tex = this._panelTexture();
      mat.map = tex; mat.needsUpdate = true;
      edgeMat.map = tex;
      bellyMat.map = tex;
    }
    return { mat: mat, edgeMat: edgeMat, bellyMat: bellyMat };
  }

  _attachLobeMarkers() {
    this.lobeMarkers = [];
    if (!this.stealth) return;
    for (let i = 0; i < 3; i++) {
      const m = glowSphere(0.1, 0x38bdf8, { pick: false });
      m.userData.skipRam = true;
      this.stealth.add(m);
      this.lobeMarkers.push(m);
    }
  }

  _rebuildStealth() {
    const pos = this.stealth ? this.stealth.position.clone() : new THREE.Vector3(0.6, 1.25, -1.7);
    if (this.stealth) this.scene.remove(this.stealth);
    this.stealth = this._buildStealthAircraft(this.state.shapeId);
    this.stealth.position.copy(pos);
    this.scene.add(this.stealth);
    this._mountedShapeId = this.state.shapeId;
    this._attachLobeMarkers();
    if (this._stealthCaption && this._stealthCaption.parent) {
      this.scene.remove(this._stealthCaption);
    }
    this._stealthCaption = placeLabel(this._shapeCaption(this.state.shapeId), 0.6, 2.2, -1.7, '#7dd3fc', 0.95);
    this.scene.add(this._stealthCaption);
  }

  _buildStealthAircraft(shapeId) {
    const id = shapeId || 'faceted';
    if (id === 'blended') return this._buildBlendedStealth();
    if (id === 'flyingWing') return this._buildFlyingWingStealth();
    if (id === 'cruise') return this._buildCruiseStealth();
    return this._buildFacetedStealth();
  }

  _finishStealth(g, body, canopy, extras) {
    this.stealthBody = body;
    this.stealthCanopy = canopy || null;
    const mats = extras ? extras.slice() : [];
    g.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && !o.userData.skipRam) mats.push(o);
    });
    this._stealthMats = mats;
    return g;
  }

  _buildFacetedStealth() {
    const g = new THREE.Group();
    const hull = this._hullMats('faceted');
    const mat = hull.mat;
    const edgeMat = hull.edgeMat;
    const bellyMat = hull.bellyMat;

    const body = this._serratedWing(mat, 0.045);
    body.position.set(0, 0.035, 0.01);
    g.add(body);
    const bodyR = this._serratedWing(mat, 0.045);
    bodyR.position.set(0, 0.035, -0.01);
    bodyR.scale.z = -1;
    g.add(bodyR);
    const belly = this._serratedWing(bellyMat, 0.04);
    belly.position.set(0, -0.03, 0.01);
    g.add(belly);
    const bellyR = this._serratedWing(bellyMat, 0.04);
    bellyR.position.set(0, -0.03, -0.01);
    bellyR.scale.z = -1;
    g.add(bellyR);

    const spine = this._planformMesh(1.15, 0.18, 0.32, -0.28, 0.07, mat);
    spine.position.set(0.12, 0.08, 0.008);
    g.add(spine);
    const spineR = this._planformMesh(1.15, 0.18, 0.32, -0.28, 0.07, mat);
    spineR.position.set(0.12, 0.08, -0.008);
    spineR.scale.z = -1;
    g.add(spineR);

    const noseTip = this._facet(0.22, 0.035, 0.06, edgeMat);
    noseTip.position.set(1.52, 0.03, 0);
    g.add(noseTip);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.028, 0.32, 8, 2, 6),
      glassMaterial(0xc4a35a, 0.72),
    );
    canopy.position.set(0.38, 0.145, 0);
    canopy.rotation.z = 0.32;
    g.add(canopy);
    const canopyFrame = this._facet(0.5, 0.016, 0.36, edgeMat);
    canopyFrame.position.set(0.36, 0.132, 0);
    canopyFrame.rotation.z = 0.32;
    g.add(canopyFrame);
    tip(canopy, 'Faceted canopy', 'One flat gold pane. The tilt sends the reflection past the radar.');
    this.stealthCanopy = canopy;

    const addInlet = (zSign) => {
      const ramp = this._facet(0.38, 0.045, 0.18, edgeMat);
      ramp.position.set(0.48, 0.1, zSign * 0.2);
      ramp.rotation.x = zSign * 0.4;
      ramp.rotation.z = 0.18;
      g.add(ramp);
      for (let i = 0; i < 5; i++) {
        const bar = this._facet(0.22, 0.01, 0.01, edgeMat);
        bar.position.set(0.46, 0.118, zSign * (0.14 + i * 0.028));
        g.add(bar);
      }
      return ramp;
    };
    const inletL = addInlet(1);
    const inletR = addInlet(-1);

    const leL = this._facet(1.85, 0.018, 0.028, edgeMat);
    leL.position.set(0.72, 0.05, 0.72);
    leL.rotation.y = Math.atan2(-1.48, -1.43);
    g.add(leL);
    const leR = this._facet(1.85, 0.018, 0.028, edgeMat);
    leR.position.set(0.72, 0.05, -0.72);
    leR.rotation.y = Math.atan2(1.48, -1.43);
    g.add(leR);

    const sensor = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 4), edgeMat);
    sensor.position.set(0.85, 0.12, 0);
    sensor.rotation.y = Math.PI / 4;
    g.add(sensor);

    const exhaustMat = metalMaterial(0x0f172a, {
      metalness: 0.2, roughness: 0.7, emissive: 0xb1490f, emissiveIntensity: 0.55,
    });
    const deck = this._facet(0.62, 0.028, 0.55, mat);
    deck.position.set(-0.95, 0.045, 0);
    g.add(deck);
    const exhaustL = this._facet(0.32, 0.028, 0.12, exhaustMat);
    exhaustL.position.set(-1.12, 0.02, 0.14);
    g.add(exhaustL);
    const exhaustR = exhaustL.clone();
    exhaustR.material = exhaustMat.clone();
    exhaustR.position.z = -0.14;
    g.add(exhaustR);
    attachGlow(exhaustL, 0xb1490f, 0.22);
    attachGlow(exhaustR, 0xb1490f, 0.22);
    for (let i = 0; i < 3; i++) {
      const chev = this._facet(0.08, 0.02, 0.07, edgeMat);
      chev.position.set(-1.22, 0.04, 0.08 + (i - 1) * 0.1);
      chev.rotation.y = (i - 1) * 0.5;
      g.add(chev);
    }
    tip(exhaustL, 'Shielded exhaust', 'A flat slit and chevrons hide the turbine from radar and infrared.');
    exhaustL.userData.skipRam = true;
    exhaustR.userData.skipRam = true;
    this._stealthExhaustMats = [exhaustL.material, exhaustR.material];

    const mountTail = (z, cant) => {
      const mount = new THREE.Group();
      mount.position.set(-0.78, 0.06, z);
      const fin = this._planformMesh(0.42, 0.14, 0.38, -0.12, 0.022, mat);
      fin.rotation.x = -Math.PI / 2;
      mount.add(fin);
      mount.rotation.x = cant;
      g.add(mount);
      return fin;
    };
    mountTail(0.22, -0.55);
    mountTail(-0.22, 0.55);

    const chin = this._facet(0.9, 0.03, 0.28, bellyMat);
    chin.position.set(0.35, -0.055, 0);
    chin.rotation.z = 0.22;
    g.add(chin);

    tip(body, 'Faceted stealth (F-117)', 'Sawtooth edges and flat facets bounce radar off to the side.');
    canopy.userData.skipRam = true;
    return this._finishStealth(g, body, canopy);
  }

  _buildBlendedStealth() {
    const g = new THREE.Group();
    const hull = this._hullMats('blended');
    const mat = hull.mat;
    const edgeMat = hull.edgeMat;
    const dark = hull.bellyMat;

    const fuse = new THREE.Mesh(this._latheFuselage([
      [0.018, -1.22],
      [0.1, -1.08],
      [0.16, -0.72],
      [0.2, -0.18],
      [0.19, 0.28],
      [0.155, 0.62],
      [0.1, 0.95],
      [0.045, 1.18],
      [0.01, 1.32],
    ], 96), mat);
    fuse.scale.set(1, 0.52, 0.78);
    g.add(fuse);

    const wingPts = [
      [1.05, 0.04],
      [0.22, 1.22],
      [-0.55, 1.18],
      [-1.05, 0.04],
    ];
    const wingL = this._planformFrom(wingPts, 0.055, mat);
    wingL.position.set(0.02, 0.02, 0.04);
    g.add(wingL);
    g.add(this._mirrorHalf(wingL));

    const lex = this._planformFrom([[0.72, 0.02], [0.28, 0.42], [-0.05, 0.38], [0.15, 0.02]], 0.03, mat);
    lex.position.set(0.22, 0.04, 0.06);
    g.add(lex);
    g.add(this._mirrorHalf(lex));

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.52),
      glassMaterial(0x67e8f9, 0.42),
    );
    canopy.scale.set(1.55, 0.55, 0.62);
    canopy.position.set(0.48, 0.14, 0);
    canopy.userData.skipRam = true;
    g.add(canopy);
    tip(canopy, 'Blended canopy', 'A low, blended bubble — fewer corner reflectors than a faceted pane.');

    const intake = (z) => {
      const box = this._facet(0.42, 0.1, 0.16, dark);
      box.position.set(0.22, -0.08, z);
      box.rotation.z = 0.12;
      g.add(box);
    };
    intake(0.18);
    intake(-0.18);

    const exhaustMat = metalMaterial(0x1c1917, {
      metalness: 0.3, roughness: 0.5, emissive: 0xb1490f, emissiveIntensity: 0.7,
    });
    const noz = (z) => {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.22, 48, 6), dark);
      n.rotation.z = Math.PI / 2;
      n.position.set(-1.18, 0.02, z);
      g.add(n);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 32, 1, true), exhaustMat.clone());
      fl.rotation.z = -Math.PI / 2;
      fl.position.set(-1.34, 0.02, z);
      fl.userData.skipRam = true;
      g.add(fl);
      attachGlow(fl, 0xb1490f, 0.18);
      return fl.material;
    };
    this._stealthExhaustMats = [noz(0.16), noz(-0.16)];

    const mountTail = (z, cant) => {
      const mount = new THREE.Group();
      mount.position.set(-0.72, 0.08, z);
      const fin = this._planformMesh(0.48, 0.16, 0.42, -0.14, 0.02, mat);
      fin.rotation.x = -Math.PI / 2;
      mount.add(fin);
      mount.rotation.x = cant;
      g.add(mount);
    };
    mountTail(0.2, -0.48);
    mountTail(-0.2, 0.48);

    const hStab = this._planformMesh(0.32, 0.14, 0.38, -0.08, 0.022, mat);
    hStab.position.set(-0.85, 0.04, 0.05);
    g.add(hStab);
    g.add(this._mirrorHalf(hStab));

    tip(fuse, 'Blended stealth (F-22)', 'Aligned edges and a smooth diamond planform steer energy aside.');
    return this._finishStealth(g, fuse, canopy);
  }

  _buildFlyingWingStealth() {
    const g = new THREE.Group();
    const hull = this._hullMats('flyingWing');
    const mat = hull.mat;
    const bellyMat = hull.bellyMat;
    const edgeMat = hull.edgeMat;

    const half = [
      [1.42, 0.02],
      [0.95, 0.55],
      [0.35, 1.35],
      [0.12, 2.12],
      [-0.55, 1.92],
      [-0.18, 1.22],
      [-0.72, 0.95],
      [-0.22, 0.48],
      [-0.88, 0.08],
      [-0.48, 0.02],
    ];
    const wingL = this._planformFrom(half, 0.08, mat);
    wingL.position.set(0, 0.04, 0.02);
    g.add(wingL);
    const wingR = this._mirrorHalf(wingL);
    g.add(wingR);
    const bellyL = this._planformFrom(half, 0.055, bellyMat);
    bellyL.position.set(0, -0.02, 0.02);
    g.add(bellyL);
    g.add(this._mirrorHalf(bellyL));

    const spine = this._planformMesh(1.35, 0.35, 0.42, -0.22, 0.09, mat);
    spine.position.set(0.08, 0.09, 0.01);
    g.add(spine);
    g.add(this._mirrorHalf(spine));

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.42),
      glassMaterial(0xc4a35a, 0.7),
    );
    canopy.position.set(0.55, 0.16, 0);
    canopy.rotation.z = 0.18;
    canopy.userData.skipRam = true;
    g.add(canopy);
    const pane = this._facet(0.12, 0.035, 0.16, glassMaterial(0xc4a35a, 0.7));
    pane.position.set(0.62, 0.165, 0.12);
    pane.rotation.z = 0.18;
    pane.userData.skipRam = true;
    g.add(pane);
    const paneR = pane.clone();
    paneR.position.z = -0.12;
    paneR.userData.skipRam = true;
    g.add(paneR);
    tip(canopy, 'Flying-wing cockpit', 'Tiny windows sit on the wing body — no tall tail to bounce radar.');

    const exhaustMat = metalMaterial(0x0f172a, {
      metalness: 0.2, roughness: 0.7, emissive: 0xb1490f, emissiveIntensity: 0.45,
    });
    const slit = (z) => {
      const e = this._facet(0.42, 0.025, 0.16, exhaustMat.clone());
      e.position.set(-0.72, 0.08, z);
      e.userData.skipRam = true;
      g.add(e);
      attachGlow(e, 0xb1490f, 0.16);
      return e.material;
    };
    this._stealthExhaustMats = [slit(0.22), slit(-0.22)];

    const bevel = this._facet(2.2, 0.016, 0.03, edgeMat);
    bevel.position.set(0.55, 0.055, 1.05);
    bevel.rotation.y = Math.atan2(-2.05, -1.1);
    g.add(bevel);
    const bevelR = bevel.clone();
    bevelR.position.z = -1.05;
    bevelR.rotation.y = Math.atan2(2.05, -1.1);
    g.add(bevelR);

    tip(wingL, 'Flying wing (B-2)', 'No vertical tail. The whole planform is one aligned radar-deflecting surface.');
    return this._finishStealth(g, wingL, canopy);
  }

  _buildCruiseStealth() {
    const g = new THREE.Group();
    const hull = this._hullMats('cruise');
    const mat = hull.mat;
    const dark = hull.edgeMat;

    const body = new THREE.Mesh(this._latheFuselage([
      [0.008, -1.22],
      [0.055, -1.12],
      [0.095, -0.85],
      [0.1, -0.2],
      [0.1, 0.45],
      [0.088, 0.95],
      [0.045, 1.22],
      [0.01, 1.38],
    ], 96), mat);
    g.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), mat);
    nose.position.x = 1.38;
    nose.scale.set(1.4, 0.9, 0.9);
    g.add(nose);
    const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.28, 48, 4), dark);
    tailCone.rotation.z = Math.PI / 2;
    tailCone.position.x = -1.18;
    g.add(tailCone);

    const wing = this._planformFrom([[0.35, 0.02], [0.05, 0.72], [-0.28, 0.68], [-0.12, 0.02]], 0.028, mat);
    wing.position.set(0.05, 0.0, 0.08);
    g.add(wing);
    g.add(this._mirrorHalf(wing));

    for (let k = 0; k < 4; k++) {
      const fin = this._facet(0.28, 0.12, 0.012, mat);
      fin.position.set(-1.05, 0, 0);
      fin.rotation.x = (k * Math.PI) / 2;
      g.add(fin);
    }

    const inlet = this._facet(0.32, 0.07, 0.12, dark);
    inlet.position.set(0.15, -0.12, 0);
    g.add(inlet);

    const exhaustMat = metalMaterial(0x1c1917, {
      metalness: 0.25, roughness: 0.55, emissive: 0xb1490f, emissiveIntensity: 0.65,
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 32, 1, true), exhaustMat);
    flame.rotation.z = -Math.PI / 2;
    flame.position.set(-1.38, 0, 0);
    flame.userData.skipRam = true;
    g.add(flame);
    attachGlow(flame, 0xb1490f, 0.2);
    this._stealthExhaustMats = [exhaustMat];

    const canopy = this._facet(0.22, 0.04, 0.08, glassMaterial(0x67e8f9, 0.35));
    canopy.position.set(0.55, 0.1, 0);
    canopy.userData.skipRam = true;
    g.add(canopy);

    tip(body, 'Cruise / UAV', 'A slender low-RCS body with small cropped wings — louder than a bomber, quieter than a fighter.');
    return this._finishStealth(g, body, canopy);
  }


  _makeLobeCone(color) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.0, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.geometry.translate(0, 0.5, 0);
    return mesh;
  }

  _buildStage() {
    const padY = -1.05;

    // Shared ground apron
    const apron = new THREE.Mesh(
      roundedBoxGeometry(9.5, 0.12, 5.0, 0.07, 3),
      metalMaterial(0x0f172a, { metalness: 0.3, roughness: 0.7 }),
    );
    apron.position.set(0.2, padY, 0);
    this.scene.add(apron);
    this.scene.add(contactShadow(4.8, 2.5, 0.4).translateY(padY - 0.07));

    // --- Radar dish (left) ---
    const radX = -3.8;
    const base = new THREE.Mesh(
      roundedBoxGeometry(1.3, 0.14, 1.3, 0.05, 3),
      metalMaterial(0x1e293b, { metalness: 0.45, roughness: 0.55 }),
    );
    base.position.set(radX, padY + 0.1, 0);
    this.scene.add(base);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 1.5, 12),
      metalMaterial(0x64748b, { metalness: 0.7, roughness: 0.32 }),
    );
    mast.position.set(radX, padY + 0.9, 0);
    this.scene.add(mast);

    this.radarGroup = new THREE.Group();
    this.radarGroup.position.set(radX, padY + 1.75, 0);
    this.scene.add(this.radarGroup);

    this.radarDish = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 48, 28, 0, Math.PI),
      metalMaterial(0x94a3b8, { metalness: 0.58, roughness: 0.34 }),
    );
    this.radarDish.rotation.y = Math.PI / 2;
    this.radarDish.position.x = 0.12;
    this.radarGroup.add(this.radarDish);
    tip(this.radarDish, 'Radar', 'Illuminates both airframes from the left. Compare backscattered return.');

    const feed = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.28, 10),
      metalMaterial(0xe2e8f0, { metalness: 0.5, roughness: 0.4 }),
    );
    feed.rotation.z = -Math.PI / 2;
    feed.position.set(0.55, 0, 0);
    this.radarGroup.add(feed);
    this.radarGlow = glowSphere(0.1, 0x4ade80, { pick: false });
    this.radarGlow.position.set(0.75, 0, 0);
    this.radarGroup.add(this.radarGlow);

    // Toggleable radar sweep beam — a widening wedge that rotates in
    // azimuth to pass over both jets. Click the dish to start/stop it.
    this.sweepGroup = new THREE.Group();
    this.sweepGroup.position.set(radX, padY + 1.75, 0);
    this.scene.add(this.sweepGroup);
    this.sweepBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.85, 6.4, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x4ade80, transparent: true, opacity: 0.16,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.sweepBeam.geometry.rotateZ(Math.PI / 2);
    this.sweepBeam.geometry.translate(3.2, 0, 0);
    this.sweepGroup.add(this.sweepBeam);
    tip(this.sweepBeam, 'Radar sweep', 'Click the dish again to stop/start this sweep — the return each jet sends back sets its RCS readout.');

    // Aircraft stands
    this.conv = this._buildConvAircraft();
    this.conv.position.set(0.6, 1.35, 1.7);
    this.scene.add(this.conv);
    const convPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 1.15, 10),
      metalMaterial(0x475569, { metalness: 0.6, roughness: 0.4 }),
    );
    convPost.position.set(0.6, padY + 0.65, 1.7);
    this.scene.add(convPost);

    this.stealth = this._buildStealthAircraft(this.state.shapeId);
    this.stealth.position.set(0.6, 1.25, -1.7);
    this.scene.add(this.stealth);
    this._mountedShapeId = this.state.shapeId;
    const stePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 1.05, 10),
      metalMaterial(0x334155, { metalness: 0.55, roughness: 0.45 }),
    );
    stePost.position.set(0.6, padY + 0.6, -1.7);
    this.scene.add(stePost);

    // Incident beam cylinder
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1, 10),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.45 }),
    );
    this.beam.geometry.translate(0, 0.5, 0);
    this.scene.add(this.beam);

    // Scatter lobe cones — conventional (bright back) vs stealth (side)
    this.convLobes = new THREE.Group();
    this.convLobes.position.copy(this.conv.position);
    this.scene.add(this.convLobes);
    this.convBack = this._makeLobeCone(0xf87171);
    this.convLobes.add(this.convBack);

    this.stealthLobes = new THREE.Group();
    this.stealthLobes.position.copy(this.stealth.position);
    this.scene.add(this.stealthLobes);
    this.steBack = this._makeLobeCone(0x38bdf8);
    this.steSide = this._makeLobeCone(0x67e8f9);
    this.stealthLobes.add(this.steBack);
    this.stealthLobes.add(this.steSide);

    this._attachLobeMarkers();

    // Return-signal readouts — toggled by clicking a jet, showing its
    // current RCS value pulled straight from physics.js.
    this.convReturn = this._makeReturnReadout(0xf87171);
    this.convReturn.sprite.position.set(this.conv.position.x, this.conv.position.y + 0.55, this.conv.position.z);
    this.convReturn.glow.position.copy(this.conv.position);
    this.scene.add(this.convReturn.sprite, this.convReturn.glow);

    this.steReturn = this._makeReturnReadout(0x38bdf8);
    this.steReturn.sprite.position.set(this.stealth.position.x, this.stealth.position.y + 0.5, this.stealth.position.z);
    this.steReturn.glow.position.copy(this.stealth.position);
    this.scene.add(this.steReturn.sprite, this.steReturn.glow);

    this.incidentGuide = dashedGuide(
      [new THREE.Vector3(radX + 0.9, padY + 1.75, 0), new THREE.Vector3(-0.4, 1.3, 0)],
      0x4ade80,
      0.4,
    );
    this.scene.add(this.incidentGuide);

    this.scene.add(placeLabel('radar', radX, 2.7, 0, '#86efac', 0.95));
    this.scene.add(placeLabel('conventional', 0.6, 2.35, 1.7, '#fca5a5', 0.9));
    this._stealthCaption = placeLabel(this._shapeCaption(this.state.shapeId), 0.6, 2.2, -1.7, '#7dd3fc', 0.95);
    this.scene.add(this._stealthCaption);
    this._liveLbl = placeLabel('σ_eff = --', 0.5, 3.0, 0, '#e2e8f0', 1.05);
    this.scene.add(this._liveLbl);

    this._radX = radX;
    this._padY = padY;
  }

  _orientCone(mesh, dir) {
    const d = dir.clone().normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  }

  setParams(p) {
    if (!p) return;
    if (p.shapeId != null) this.state.shapeId = p.shapeId;
    if (p.shaping != null) this.state.shaping = p.shaping;
    if (p.absorb != null) this.state.absorb = p.absorb;
    if (p.frequency != null) this.state.frequency = p.frequency;
    if (p.sigma0 != null) this.state.sigma0 = p.sigma0;

    if (this.state.shapeId !== this._mountedShapeId) this._rebuildStealth();

    const ste = stealthSigmaEff(this.state.shapeId, this.state.absorb, this.state.frequency);
    const conv = conventionalSigma(this.state.sigma0);
    const lam = wavelength(this.state.frequency);
    const dif = diffractionHint(this.state.frequency);
    const lobes = scatterLobes(this.state.shaping, this.state.absorb);

    // Darken stealth with absorb (RAM)
    if (this._stealthMats) {
      for (let i = 0; i < this._stealthMats.length; i++) {
        const m = this._stealthMats[i].material;
        if (!m || m.roughness == null || !m.color) continue;
        m.roughness = 0.4 + 0.45 * this.state.absorb;
        m.metalness = 0.4 - 0.28 * this.state.absorb;
        const shade = 0.12 + 0.08 * (1 - this.state.absorb);
        m.color.setRGB(shade, shade + 0.02, shade + 0.05);
      }
    }

    // Conventional strong backscatter lobe toward radar (−x)
    this._orientCone(this.convBack, new THREE.Vector3(-1, 0.05, 0));
    this.convBack.scale.set(0.9, 1.2 + 0.8 * (conv / Math.max(this.state.sigma0, 0.1)), 0.9);
    this.convBack.material.opacity = 0.18 + 0.25 * Math.min(1, conv / 15);

    // Stealth: weak back, stronger side
    this._orientCone(this.steBack, new THREE.Vector3(-1, 0.05, 0));
    this.steBack.scale.set(0.5, 0.4 + 1.2 * lobes.back, 0.5);
    this.steBack.material.opacity = 0.08 + 0.25 * lobes.back;
    this._orientCone(this.steSide, new THREE.Vector3(0.2, 0.05, 1));
    this.steSide.scale.set(0.55, 0.5 + 1.4 * lobes.side, 0.55);
    this.steSide.material.opacity = 0.1 + 0.3 * lobes.side;

    const dirs = [
      new THREE.Vector3(-1.1 * lobes.back, 0.15, 0),
      new THREE.Vector3(0.25 * lobes.side, 0.1, 0.95 * lobes.side),
      new THREE.Vector3(0.75 * lobes.forward, 0.1, 0),
    ];
    for (let i = 0; i < this.lobeMarkers.length; i++) {
      this.lobeMarkers[i].position.copy(dirs[i]);
      const amp = i === 0 ? lobes.back : i === 1 ? lobes.side : lobes.forward;
      this.lobeMarkers[i].scale.setScalar(0.5 + 1.5 * amp);
    }

    // Incident beam from radar toward mid
    const from = new THREE.Vector3(this._radX + 0.85, this._padY + 1.75, 0);
    const to = new THREE.Vector3(0.0, 1.3, 0);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    this.beam.position.copy(from);
    this.beam.scale.set(1, len, 1);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());

    this._updateLabel(conv, ste, lam, dif);

    this._lastConv = conv;
    this._lastSte = ste;
    this._updateReturnReadout('conv');
    this._updateReturnReadout('stealth');
  }

  /** Redraws the click-toggled RCS readout sprite for one jet using the
   *  most recently computed physics.js values (no new numbers invented). */
  _updateReturnReadout(which) {
    const rd = which === 'conv' ? this.convReturn : this.steReturn;
    if (!rd) return;
    const on = which === 'conv' ? this._convReturnOn : this._steReturnOn;
    rd.sprite.visible = !!on;
    rd.glow.visible = !!on;
    if (!on || this._lastConv == null || this._lastSte == null) return;
    const sigma = which === 'conv' ? this._lastConv : this._lastSte;
    const label = which === 'conv' ? 'Conventional return' : 'Stealth return';
    const ctx = rd.ctx;
    const cv = rd.canvas;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.82)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(4, 4, cv.width - 8, cv.height - 8, 8);
    else ctx.rect(4, 4, cv.width - 8, cv.height - 8);
    ctx.fill();
    ctx.fillStyle = which === 'conv' ? '#fca5a5' : '#7dd3fc';
    ctx.font = '600 15px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label + ':  σ = ' + formatSigmaM2(sigma), cv.width / 2, cv.height / 2);
    rd.tex.needsUpdate = true;
    // Glow size/brightness scales with RCS so a bigger echo reads as a
    // stronger visual return, same physical quantity as the info panel.
    const amp = Math.max(0.35, Math.min(2.2, sigma / Math.max(this.state.sigma0, 0.1)));
    rd.glow.scale.setScalar(amp);
  }

  _updateLabel(conv, ste, lam, dif) {
    if (!this._liveLbl || !this._liveLbl.material || !this._liveLbl.material.map) return;
    const cv = this._liveLbl.material.map.image;
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(10,17,34,0.8)';
    ctx.fillRect(4, 6, 376, 36);
    ctx.fillStyle = '#67e8f9';
    ctx.font = '600 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'σ_c=' + formatSigmaM2(conv) + '  σ_eff=' + formatSigmaM2(ste) +
      '  λ=' + (lam * 100).toFixed(1) + 'cm  dif~' + (dif * 100).toFixed(0) + '%',
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
    const list = [];
    if (this.convBody) list.push(this.convBody);
    if (this.convCanopy) list.push(this.convCanopy);
    if (this.stealth) list.push(this.stealth);
    if (this.radarDish) list.push(this.radarDish);
    if (this.sweepBeam) list.push(this.sweepBeam);
    return list;
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
    if (this._onPointerDown) this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
    if (this._onPointerUp) this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
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
      const pulse = 0.7 + 0.3 * Math.sin(this.phase * 4);
      if (this.radarGlow) {
        this.radarGlow.scale.setScalar(0.85 + 0.35 * pulse);
        this.radarGlow.material.opacity = 0.45 + 0.4 * pulse;
      }
      if (this.beam && this.beam.material) {
        this.beam.material.opacity = 0.25 + 0.35 * pulse;
      }
      this.radarGroup.rotation.y = 0.08 * Math.sin(this.phase * 0.35);
      this.conv.rotation.y = 0.12 * Math.sin(this.phase * 0.4);
      this.stealth.rotation.y = -0.08 * Math.sin(this.phase * 0.35);
      this.convLobes.position.copy(this.conv.position);
      this.stealthLobes.position.copy(this.stealth.position);
      if (this.convBack && this.convBack.material) {
        this.convBack.material.opacity = (0.18 + 0.12 * pulse) * (0.7 + 0.3);
      }

      // Conventional afterburner-glow flicker.
      if (this._convExhaustMats) {
        const flick = 0.85 + 0.3 * Math.sin(this.phase * 7.3);
        for (let i = 0; i < this._convExhaustMats.length; i++) {
          const m = this._convExhaustMats[i];
          if (m.emissiveIntensity != null) m.emissiveIntensity = 1.1 * flick;
          else if (m.opacity != null) m.opacity = 0.5 * flick;
        }
      }
      if (this._stealthExhaustMats) {
        const flickS = 0.65 + 0.35 * Math.sin(this.phase * 4.7);
        for (let i = 0; i < this._stealthExhaustMats.length; i++) {
          this._stealthExhaustMats[i].emissiveIntensity = 0.5 * flickS;
        }
      }

      // Toggleable radar sweep beam — rotates across both jets while on.
      if (this.sweepGroup && this.sweepBeam) {
        this.sweepGroup.visible = !!this._radarOn;
        if (this._radarOn) {
          this.sweepGroup.rotation.y = 0.55 * Math.sin(this.phase * 0.6);
          this.sweepBeam.material.opacity = 0.12 + 0.08 * (0.5 + 0.5 * Math.sin(this.phase * 4));
        }
      }

      // Pulsing return-signal glows, amplitude already scaled by RCS.
      const rpulse = 0.75 + 0.25 * Math.sin(this.phase * 5);
      if (this.convReturn && this.convReturn.glow.visible) {
        this.convReturn.glow.material.opacity = 0.55 + 0.35 * rpulse;
      }
      if (this.steReturn && this.steReturn.glow.visible) {
        this.steReturn.glow.material.opacity = 0.55 + 0.35 * rpulse;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
