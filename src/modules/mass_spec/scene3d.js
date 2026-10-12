// 3D mass spectrometer styled as a real magnetic-sector instrument:
//   ion source chamber → acceleration slits → electromagnet pole gap where ions
//   fan out by mass → focal-plane detector array that builds the spectrum.
// Ions of mass m curve with radius r ∝ √(mV)/B; heavier ions swing wider.
// Works on software WebGL (CPU-only).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ELEMENTS, M_MIN, M_MAX } from './physics.js';
import { noPick, pickShell, stat } from '../common/sceneChrome.js';
import { setupScene, setupRenderer, addStudioLights, addFloorGrid, dashedGuide, smallLabel } from '../common/sceneVisuals.js';

const R_SCALE = 0.72;
const SOURCE = new THREE.Vector3(-12.5, 5.2, 0); // label anchor only (far left)
const ION_PLANE = 1.05;                                    // all ions fly on this z plane, in front of housing
const ION_R = 0.32;                                        // sphere radius
const BEAM_START = new THREE.Vector3(-10.5, 5.0, ION_PLANE); // ions spawn in open air, right of source
const BEAM_END = new THREE.Vector3(-7.0, 5.0, ION_PLANE);   // field entry — same height & depth as beam
const ENTRY = new THREE.Vector3(-7, 5, 0);                 // arc geometry reference (z added per ion)
const A_MAX = 1.70;                              // sweep angle through the sector (rad)
const N_BARS = 80;

const METAL = () => new THREE.MeshStandardMaterial({ color: 0x8d97ab, metalness: 0.85, roughness: 0.35 });
const DARK = () => new THREE.MeshStandardMaterial({ color: 0x3a4252, metalness: 0.7, roughness: 0.5 });

function massColor(m) {
  const t = (m - M_MIN) / (M_MAX - M_MIN);
  const c = new THREE.Color(); c.setHSL(0.62 - 0.62 * t, 0.8, 0.6); return c;
}
// exit point on the focal plane for an ion of radius r after sweeping A_MAX
function exitPoint(r) {
  return new THREE.Vector3(ENTRY.x + r * Math.sin(A_MAX), ENTRY.y - r * (1 - Math.cos(A_MAX)), ION_PLANE);
}

function arcPoints(r, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * A_MAX;
    pts.push(new THREE.Vector3(ENTRY.x + r * Math.sin(a), (ENTRY.y - r) + r * Math.cos(a), ION_PLANE));
  }
  return pts;
}

export class MassSpecScene {
  constructor(container) {
    this.container = container;
    this.labels = {};
    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
    this.camera.position.set(4, 12, 22);

    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(-2, 2, 0);
    this.controls.enableDamping = true;

    addStudioLights(this.scene);
    addFloorGrid(this.scene, 36, -2.5);

    // V/B must exist before guides/detector — radii feed BufferGeometry positions
    this.V = 2000;
    this.B = 1.0;
    this.nIons = 1;
    this.paused = false;
    this._tipTexts = {};

    this.guides = new THREE.Group();
    noPick(this.guides);
    this.scene.add(this.guides);
    this._buildVisualGuides();

    this.apparatus = new THREE.Group();   // instrument shell (toggleable)
    this.scene.add(this.apparatus);
    this._buildInstrument();

    this.detBins = new Float32Array(N_BARS);
    this._buildDetector();

    this.ionGroup = new THREE.Group();
    this.scene.add(this.ionGroup);

    this.isos = ELEMENTS['Chlorine (Cl)'];
    this.elementName = 'Chlorine (Cl)';
    this.ions = [];
    for (let i = 0; i < this.nIons; i++) this.ions.push(this._newIon());
    this._buildIonMeshes();

    this._alive = true; this._animate = this._animate.bind(this); this._animate(); this.resize();
  }

  setLabels(labels) {
    this.labels = labels || {};
    this._rebuildGuideLabels();
  }

  _buildVisualGuides() {
    // straight beam — dashed guide only (no solid pipe around ions)
    const beam = dashedGuide([BEAM_START.clone(), BEAM_END.clone()], 0xffd27f, 0.55);
    this.guides.add(beam);

    // reference arcs: light vs heavy ion paths (the key teaching visual)
    this._refArcs = [];
    const refMasses = [
      { m: 20, labelKey: 'light', color: 0x22d3ee, opacity: 0.7 },
      { m: 55, labelKey: null, color: 0x7dd3fc, opacity: 0.35 },
      { m: 75, labelKey: 'heavy', color: 0xf472b6, opacity: 0.7 },
    ];
    for (const ref of refMasses) {
      const r = this._radiusFor(ref.m);
      const geo = new THREE.BufferGeometry().setFromPoints(arcPoints(r, 56));
      const mat = new THREE.LineDashedMaterial({
        color: ref.color, dashSize: 0.28, gapSize: 0.18, transparent: true, opacity: ref.opacity, linewidth: 1,
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.guides.add(line);
      this._refArcs.push({ line, ref, r });
    }

    // focal plane marker along the detector line
    this._focalLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        exitPoint(this._radiusFor(M_MIN + 2)),
        exitPoint(this._radiusFor(M_MAX - 2)),
      ]),
      new THREE.LineBasicMaterial({ color: 0x2fe0d0, transparent: true, opacity: 0.45 }),
    );
    this.guides.add(this._focalLine);

    // B-field hint: small crosses in the pole gap
    for (let ix = -2; ix <= 2; ix++) {
      for (let iy = -1; iy <= 2; iy++) {
        const cx = -3 + ix * 1.6, cy = 1 + iy * 1.8;
        for (const sgn of [-1, 1]) {
          const h = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(cx - 0.22 * sgn, cy, 0.05),
              new THREE.Vector3(cx + 0.22 * sgn, cy, 0.05),
            ]),
            new THREE.LineBasicMaterial({ color: 0x6b8cff, transparent: true, opacity: 0.35 }),
          );
          const v = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(cx, cy - 0.22, 0.05),
              new THREE.Vector3(cx, cy + 0.22, 0.05),
            ]),
            new THREE.LineBasicMaterial({ color: 0x6b8cff, transparent: true, opacity: 0.35 }),
          );
          this.guides.add(h, v);
        }
      }
    }

    this._guideLabels = new THREE.Group();
    noPick(this._guideLabels);
    this.guides.add(this._guideLabels);
  }

  _rebuildGuideLabels() {
    while (this._guideLabels.children.length) this._guideLabels.remove(this._guideLabels.children[0]);
    const L = this.labels;
    if (L.source) this._addGuideLabel(L.source, SOURCE.clone().add(new THREE.Vector3(0, 1.5, 0)), '#ffd27f', 1.35);
    if (L.beam) this._addGuideLabel(L.beam, SOURCE.clone().lerp(ENTRY, 0.55).add(new THREE.Vector3(0, 1.0, 0)), '#c4a060', 1.2);
    if (L.magnet) this._addGuideLabel(L.magnet, new THREE.Vector3(-3, 6.2, 0), '#a9c4ff', 1.35);
    if (L.detector) this._addGuideLabel(L.detector, exitPoint(this._radiusFor(50)).add(new THREE.Vector3(0, 2.2, 0)), '#2fe0d0', 1.35);
    for (const { ref, r } of this._refArcs) {
      if (!ref.labelKey || !L[ref.labelKey]) continue;
      const mid = arcPoints(r, 2)[1];
      const col = ref.labelKey === 'light' ? '#22d3ee' : '#f472b6';
      this._addGuideLabel(L[ref.labelKey], mid.clone().add(new THREE.Vector3(0, 1.1, 0.2)), col, 1.25);
    }
  }

  _addGuideLabel(text, pos, color, scale = 1.35) {
    const spr = smallLabel(text, color, scale);
    spr.position.copy(pos);
    this._guideLabels.add(spr);
  }

  _buildInstrument() {
    // ---- electromagnet: two pole pieces above/below the flight plane + C-yoke
    const poleGeo = new THREE.BoxGeometry(9, 9, 1.8);
    // near pole is a translucent cutaway so you can see the ions fan in the gap
    const north = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0xd05863, metalness: 0.4, roughness: 0.5, emissive: 0x35090d, emissiveIntensity: 0.35, transparent: true, opacity: 0.12, depthWrite: false }));
    north.position.set(-3, 1, 3.4);
    const south = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x4f7ad6, metalness: 0.5, roughness: 0.5, emissive: 0x0a1838, emissiveIntensity: 0.4, transparent: true, opacity: 0.22, depthWrite: false }));
    south.position.set(-3, 1, -3.4);
    this.northPole = north;
    this.apparatus.add(north, south);
    // pole labels
    this._addLabel('N', new THREE.Vector3(1.2, 5, 3.4), '#ffb3ba');
    this._addLabel('S', new THREE.Vector3(1.2, 5, -3.4), '#a9c4ff');
    // C-yoke connecting the poles behind
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x5a6274, metalness: 0.8, roughness: 0.45 });
    const yokeFront = new THREE.MeshStandardMaterial({ color: 0x5a6274, metalness: 0.8, roughness: 0.45, transparent: true, opacity: 0.10, depthWrite: false });
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 9), yokeMat); back.position.set(-8.8, 1, 0);
    const armT = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 2.2), yokeFront); armT.position.set(-7.5, 1, 3.4);
    const armB = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 2.2), yokeMat); armB.position.set(-7.5, 1, -3.4);
    this.apparatus.add(back, armT, armB);
    // coil hint (torus around the back arm)
    const coil = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.35, 10, 28), new THREE.MeshStandardMaterial({ color: 0xcaa14a, metalness: 0.6, roughness: 0.5 }));
    coil.position.set(-8.5, 1, 0); coil.rotation.y = Math.PI / 2; this.apparatus.add(coil);

    // ---- ion source: small nozzle marker only (no box — ions are plain spheres in open space)
    this.sourceGroup = new THREE.Group();
    this.sourceGroup.position.copy(SOURCE);
    this.scene.add(this.sourceGroup);

    const nozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd27f }),
    );
    nozzle.rotation.z = -Math.PI / 2;
    nozzle.position.set(0.5, 0, 0);
    this.sourceGroup.add(nozzle);

    const glow = new THREE.PointLight(0xffcf7a, 0.3, 3); glow.position.set(0.6, 0, 0);
    this.sourceGroup.add(glow);

    // acceleration slits — thin flat plates below the ion flight plane
    this.slitGroup = new THREE.Group();
    const slitMat = new THREE.MeshStandardMaterial({ color: 0xc8843a, emissive: 0xff7020, emissiveIntensity: 0.35, metalness: 0.75, roughness: 0.3 });
    for (let k = 0; k < 2; k++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.08), slitMat);
      plate.position.set(BEAM_END.x - 0.45 + k * 0.45, BEAM_END.y - 0.5, 0);
      this.slitGroup.add(plate);
    }
    this.scene.add(this.slitGroup);
  }

  setPaused(v) { this.paused = !!v; }

  setIonCount(n) {
    n = Math.max(1, Math.round(n));
    if (n === this.nIons) return;
    this.nIons = n;
    while (this.ions.length < n) this.ions.push(this._newIon());
    this.ions.length = n;
    this._buildIonMeshes();
  }

  applyTips(tips) {
    this._tipTexts = tips || {};
    this._bindTips();
  }

  _bindTips() {
    const tips = this._tipTexts;
    if (!tips.source) return;
    const vStr = `${this.V} V`;
    const bStr = `${this.B.toFixed(2)} T`;
    this.sourceGroup.userData.sceneTip = () => ({
      title: tips.source.title, desc: tips.source.desc,
      stats: [stat(tips, 'sample', this.elementName), stat(tips, 'voltage', vStr)],
    });
    this.slitGroup.userData.sceneTip = () => ({
      title: tips.slits.title, desc: tips.slits.desc,
      stats: [stat(tips, 'voltage', vStr)],
    });
    this.northPole.userData.sceneTip = () => ({
      title: tips.magnet.title, desc: tips.magnet.desc,
      stats: [stat(tips, 'fieldB', bStr), stat(tips, 'voltage', vStr)],
    });
    this.detHousing.userData.sceneTip = () => ({
      title: tips.detector.title, desc: tips.detector.desc,
      stats: [stat(tips, 'sample', this.elementName)],
    });
    for (let i = 0; i < (this.ionMeshes || []).length; i++) {
      const ion = this.ions[i];
      if (!ion) continue;
      const m = ion.m;
      const r = this._radiusFor(m);
      this.ionMeshes[i].userData.sceneTip = () => ({
        title: tips.ion.title, desc: tips.ion.desc,
        stats: [
          stat(tips, 'mass', `${m.toFixed(1)} u`),
          stat(tips, 'arcRadius', r.toFixed(2)),
          stat(tips, 'voltage', vStr),
          stat(tips, 'fieldB', bStr),
        ],
      });
    }
    for (let b = 0; b < N_BARS; b++) {
      const mass = M_MIN + (M_MAX - M_MIN) * b / (N_BARS - 1);
      const bar = this.bars[b];
      bar.userData.sceneTip = () => ({
        title: tips.detector.title, desc: tips.detector.desc,
        stats: [
          stat(tips, 'mass', `${mass.toFixed(1)} m/z`),
          stat(tips, 'hits', Math.round(this.detBins[b])),
        ],
      });
    }
  }

  getPickables() {
    return [
      this.ionGroup, this.sourceGroup, this.northPole, this.detHousing,
      this.slitGroup, ...this.bars,
    ].filter(Boolean);
  }

  setApparatusVisible(v) { this.apparatus.visible = v; }

  _addLabel(text, pos, color) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const ctx = cv.getContext('2d'); ctx.fillStyle = color; ctx.font = 'bold 44px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 34);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
    spr.scale.set(1.4, 1.4, 1); spr.position.copy(pos); this.apparatus.add(spr);
  }

  _buildDetector() {
    // metallic housing running along the focal (exit) line + a bar array
    const p0 = exitPoint(this._radiusFor(M_MIN + 1));
    const p1 = exitPoint(this._radiusFor(M_MAX));
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1) + 2;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, 2.6), DARK());
    housing.position.copy(mid).add(new THREE.Vector3(0, -0.9, 0));
    housing.rotation.z = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    this.detHousing = housing;
    this.apparatus.add(housing);

    // glowing detector base strip
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.08, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2fe0d0, transparent: true, opacity: 0.35 }),
    );
    strip.position.copy(mid).add(new THREE.Vector3(0, -0.35, 0.5));
    strip.rotation.z = housing.rotation.z;
    this.guides.add(strip);

    this.bars = [];
    for (let b = 0; b < N_BARS; b++) {
      const m = M_MIN + (M_MAX - M_MIN) * b / (N_BARS - 1);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.5),
        new THREE.MeshStandardMaterial({ color: massColor(m), emissive: massColor(m), emissiveIntensity: 0.28, metalness: 0.2, roughness: 0.4 }),
      );
      this.scene.add(bar); this.bars.push(bar);
    }
    this._layoutBars();
  }

  _layoutBars() {
    for (let b = 0; b < N_BARS; b++) {
      const r = this._radiusForBar(b);
      const p = exitPoint(r);
      this.bars[b].position.set(p.x, p.y, 0.35);
      this.bars[b].scale.z = 0.001;
    }
  }

  _radiusFor(m) {
    const V = Number(this.V);
    const B = Number(this.B);
    const mass = Number(m);
    if (!(mass > 0) || !(V > 0) || !(B > 0)) return R_SCALE; // safe fallback — never NaN
    return R_SCALE * Math.sqrt(mass) * Math.sqrt(V / 2000) / B;
  }
  _radiusForBar(b) {
    const m = M_MIN + (M_MAX - M_MIN) * b / (N_BARS - 1);
    return this._radiusFor(m);
  }

  _updateRefArcs() {
    const refMasses = [20, 55, 75];
    for (let i = 0; i < this._refArcs.length; i++) {
      const r = this._radiusFor(refMasses[i]);
      this._refArcs[i].r = r;
      this._refArcs[i].line.geometry.dispose();
      this._refArcs[i].line.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints(r, 56));
      this._refArcs[i].line.computeLineDistances();
    }
    if (this._focalLine) {
      this._focalLine.geometry.dispose();
      this._focalLine.geometry = new THREE.BufferGeometry().setFromPoints([
        exitPoint(this._radiusFor(M_MIN + 2)),
        exitPoint(this._radiusFor(M_MAX - 2)),
      ]);
    }
    this._rebuildGuideLabels();
  }

  _pickMass() { const r = Math.random(); let a = 0; for (const iso of this.isos) { a += iso.ab; if (r <= a) return iso.m; } return this.isos[this.isos.length - 1].m; }
  _newIon() {
    const m = this._pickMass();
    return { m, r: this._radiusFor(m), phase: 'beam', beamT: Math.random(), a: 0, speed: 0.9 / Math.sqrt(m) + 0.02 };
  }

  _beamPos(t) {
    return BEAM_START.clone().lerp(BEAM_END, t);
  }

  _buildIonMeshes() {
    for (const m of this.ionMeshes || []) this.ionGroup.remove(m);
    this.ionMeshes = this.ions.map((ion) => {
      const col = massColor(ion.m);
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(ION_R, 16, 16),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false, depthWrite: false }),
      );
      s.renderOrder = 10;
      s.position.copy(this._ionMeshPos(ion));
      pickShell(s, ION_R * 3);
      this.ionGroup.add(s);
      return s;
    });
    this._bindTips();
  }

  _ionMeshPos(ion) {
    if (ion.phase === 'beam') return this._beamPos(ion.beamT);
    return this._ionPos(ion);
  }

  setElement(name) {
    this.elementName = name;
    this.isos = ELEMENTS[name];
    this.detBins.fill(0); this._layoutBars();
    for (let i = 0; i < this.ions.length; i++) { this.ions[i] = this._newIon(); this._tintIon(i); }
    this._bindTips();
  }
  setParams(V, B) {
    this.V = V; this.B = B;
    this.detBins.fill(0); this._layoutBars(); this._updateRefArcs();
    for (let i = 0; i < this.ions.length; i++) this.ions[i] = this._newIon();
    for (let i = 0; i < this.ions.length; i++) this._tintIon(i);
    this._bindTips();
  }

  _tintIon(i) {
    const col = massColor(this.ions[i].m);
    this.ionMeshes[i].material.color.copy(col);
    this.ionMeshes[i].position.copy(this._ionMeshPos(this.ions[i]));
  }

  _ionPos(ion) {
    const r = ion.r, a = ion.a;
    return new THREE.Vector3(ENTRY.x + r * Math.sin(a), (ENTRY.y - r) + r * Math.cos(a), ION_PLANE);
  }

  _animate() {
    if (!this._alive) return;
    this._raf = requestAnimationFrame(this._animate);
    if (!this.paused) {
    for (let i = 0; i < this.ions.length; i++) {
      const ion = this.ions[i];
      if (ion.phase === 'beam') {
        ion.beamT += ion.speed * 0.07;
        if (ion.beamT >= 1) { ion.phase = 'arc'; ion.a = 0; }
        else { this.ionMeshes[i].position.copy(this._beamPos(ion.beamT)); continue; }
      }
      ion.a += ion.speed * 0.12;
      if (ion.a >= A_MAX) {
        // landed on the focal plane → find nearest detector bar by radius
        let bi = Math.round((Math.sqrt(ion.m) - Math.sqrt(M_MIN)) / (Math.sqrt(M_MAX) - Math.sqrt(M_MIN)) * (N_BARS - 1));
        bi = Math.max(0, Math.min(N_BARS - 1, bi));
        this.detBins[bi] += 1;
        const mx = Math.max(...this.detBins) || 1;
        for (let k = 0; k < N_BARS; k++) {
          const s = Math.max(0.001, this.detBins[k] / mx * 6);
          this.bars[k].scale.z = s;
          this.bars[k].position.z = 0.35 + s / 2;
          this.bars[k].material.emissiveIntensity = 0.2 + 0.4 * (this.detBins[k] / mx);
        }
        this.ions[i] = this._newIon(); this._tintIon(i);
        continue;
      }
      this.ionMeshes[i].position.copy(this._ionMeshPos(ion));
    }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false);
  }
  dispose() { this._alive = false; if (this._raf) cancelAnimationFrame(this._raf); this.renderer.dispose(); const el = this.renderer.domElement; if (el && el.parentNode) el.parentNode.removeChild(el); }
}
