// Electron microscope vs optical microscope — 3D comparison: two vertical
// "columns" side by side, each with a source, a pair of lenses, converging
// onto a shared sample stage at the centre, then diverging back out to each
// column's own detector screen. The optical column uses glass lenses and a
// light source; the electron column uses magnetic-lens coils (with a field
// line hint) and an electron gun. Each detector screen shows a live texture
// of the same two-point resolving-power demo used in the 2D view, so the
// "electrons resolve finer detail" payoff is visible in 3D too.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { electronWavelength, rayleighResolution, LIGHT_WAVELENGTH_M } from './physics.js';
import { drawTwoPointBlobs } from './resolveDemo.js';
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

const SAMPLE_SEP_NM = 2;
const COL_X = 2.05;
const Y_SOURCE = 2.55;
const Y_LENS_TOP = 1.5;
const Y_SAMPLE = 0.35;
const Y_LENS_BOT = -0.85;
const Y_DETECTOR = -2.05;
const N_PARTICLES = 10;

export class ElectronMicroscopeScene3D {
  constructor(container) {
    this.container = container;
    this.state = { voltage: 20000, NA: 0.02, NAlight: 1.0 };
    this.phase = 0;
    this.paused = false;
    this._active = false;

    this.scene = setupScene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0.6, 1.6, 9.4);
    this.renderer = setupRenderer(container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.15, 0);
    addStudioLights(this.scene);
    addFloorGrid(this.scene, 24, -2.9);

    this._particles = { optical: [], electron: [] };
    this._buildStage();
    this._alive = true;
    this._animate = this._animate.bind(this);
    this._animate();
    this.resize();
    this._updateScreens();
  }

  _beamCurve(sign) {
    const pts = [
      new THREE.Vector3(sign * COL_X, Y_SOURCE, 0),
      new THREE.Vector3(sign * COL_X * 0.68, Y_LENS_TOP, 0),
      new THREE.Vector3(0, Y_SAMPLE, 0),
      new THREE.Vector3(sign * COL_X * 0.68, Y_LENS_BOT, 0),
      new THREE.Vector3(sign * COL_X, Y_DETECTOR, 0),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }

  _makeBeamTube(curve, color) {
    const geo = new THREE.TubeGeometry(curve, 64, 0.032, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    return new THREE.Mesh(geo, mat);
  }

  _makeLensTorus(x, y, mat, radius = 0.52, tube = 0.07) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 28), mat);
    torus.position.set(x, y, 0);
    torus.rotation.x = Math.PI / 2;
    return torus;
  }

  _buildStage() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.92;
    this.scene.add(floor);

    // ---------- Optical column (left) ----------
    const sL = -1;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.4 }),
    );
    bulb.position.set(sL * COL_X, Y_SOURCE, 0);
    this.scene.add(bulb);
    attachGlow(bulb, 0xfde68a, 0.9);
    this.opticalSource = bulb;
    tip(bulb, 'Light source', 'An ordinary lamp — visible light has λ ≈ 550 nm, thousands of times longer than an electron’s de Broglie wavelength.');
    this.scene.add(placeLabel('Optical microscope', sL * COL_X, Y_SOURCE + 0.55, 0, '#fbbf24', 1.05));

    const glass = glassMaterial(0xbfdbfe, 0.28);
    const condenserLens = this._makeLensTorus(sL * COL_X * 0.68, Y_LENS_TOP, glass, 0.5, 0.09);
    const objectiveLens = this._makeLensTorus(sL * COL_X * 0.68, Y_LENS_BOT, glass, 0.5, 0.09);
    this.scene.add(condenserLens, objectiveLens);
    tip(condenserLens, 'Glass condenser lens', 'Bends light by refraction. The diffraction limit d ≈ 0.61λ/NA is set by the wavelength — no amount of polishing beats it.');
    this.scene.add(placeLabel('glass lenses', sL * COL_X * 0.68, Y_LENS_TOP + 0.42, 0, '#93c5fd', 0.85));

    this.opticalScreen = this._buildDetector(sL * COL_X, '#f59e0b');

    // ---------- Electron column (right) ----------
    const sR = 1;
    const gunHousing = new THREE.Mesh(
      roundedBoxGeometry(0.52, 0.62, 0.52, 0.08, 3),
      metalMaterial(0x334155, { metalness: 0.7, roughness: 0.4 }),
    );
    gunHousing.position.set(sR * COL_X, Y_SOURCE, 0);
    this.scene.add(gunHousing);
    const cathodeTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x60a5fa, emissiveIntensity: 1.1, roughness: 0.3 }),
    );
    cathodeTip.position.set(sR * COL_X, Y_SOURCE - 0.42, 0);
    cathodeTip.rotation.x = Math.PI;
    this.scene.add(cathodeTip);
    attachGlow(cathodeTip, 0x60a5fa, 0.6);
    this.electronGun = gunHousing;
    tip(gunHousing, 'Electron gun', 'Accelerates electrons through voltage V. λ_e = h/√(2meV) — raising V shortens the electron wavelength and sharpens resolution.');
    this.scene.add(placeLabel('Electron microscope', sR * COL_X, Y_SOURCE + 0.55, 0, '#7dd3fc', 1.05));

    const coilMat = metalMaterial(0xb87333, { metalness: 0.82, roughness: 0.35 });
    const magLensTop = this._makeLensTorus(sR * COL_X * 0.68, Y_LENS_TOP, coilMat, 0.48, 0.1);
    const magLensBot = this._makeLensTorus(sR * COL_X * 0.68, Y_LENS_BOT, coilMat, 0.48, 0.1);
    this.scene.add(magLensTop, magLensBot);
    tip(magLensTop, 'Magnetic lens coil', 'A current-carrying coil focuses the electron beam magnetically — no glass involved. Its usable aperture (NA) is far smaller than a glass lens.');
    this.scene.add(placeLabel('magnetic lens coils', sR * COL_X * 0.68, Y_LENS_TOP + 0.42, 0, '#fcd34d', 0.85));

    // Subtle field-line hint bending around the top coil.
    this._fieldLines = [];
    for (let i = -1; i <= 1; i += 2) {
      const fl = this._makeFieldLine(sR * COL_X * 0.68, Y_LENS_TOP, i * 0.22);
      this.scene.add(fl);
      this._fieldLines.push(fl);
    }

    this.electronScreen = this._buildDetector(sR * COL_X, '#38bdf8');

    // ---------- Shared sample stage ----------
    const stage = new THREE.Mesh(
      roundedBoxGeometry(0.9, 0.1, 0.6, 0.03, 2),
      plasticMaterial(0x1e293b, { roughness: 0.55 }),
    );
    stage.position.set(0, Y_SAMPLE - 0.1, 0);
    this.scene.add(stage);
    const feature = (dx, dz) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
      );
      dot.position.set(dx, Y_SAMPLE - 0.04, dz);
      attachGlow(dot, 0xfacc15, 0.22);
      return dot;
    };
    const f1 = feature(-0.09, 0.05);
    const f2 = feature(0.09, -0.05);
    this.scene.add(f1, f2);
    this.sampleStage = stage;
    tip(stage, 'Sample stage', SAMPLE_SEP_NM + ' nm apart, two point-like features sit here. Whether each microscope sees them as two dots or one blur depends on its resolution d ≈ 0.61λ/NA.');
    const stageShadow = contactShadow(1.0, 0.7, 0.45);
    stageShadow.position.set(0, Y_SAMPLE - 0.15 + 0.002, 0);
    this.scene.add(stageShadow);
    this.scene.add(placeLabel('sample (2 point features)', 0, Y_SAMPLE + 0.32, 0, '#fde68a', 0.95));

    // ---------- Beams ----------
    this.opticalCurve = this._beamCurve(sL);
    this.electronCurve = this._beamCurve(sR);
    this.opticalBeam = this._makeBeamTube(this.opticalCurve, 0xf59e0b);
    this.electronBeam = this._makeBeamTube(this.electronCurve, 0x60a5fa);
    this.scene.add(this.opticalBeam, this.electronBeam);

    attachGlow(stage, 0xfde68a, 0.5);

    for (let i = 0; i < N_PARTICLES; i++) {
      this._particles.optical.push(this._makeParticle(0xfde68a, i / N_PARTICLES));
      this._particles.electron.push(this._makeParticle(0x93c5fd, i / N_PARTICLES));
    }

    this._pickables = [gunHousing, magLensTop, stage, bulb, condenserLens];
  }

  _makeFieldLine(x, y, r) {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, Math.sin(a) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: 0x7dd3fc, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.5,
    }));
    line.computeLineDistances();
    return line;
  }

  _makeParticle(color, seed) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    attachGlow(mesh, color, 0.18);
    mesh.userData.seed = seed;
    this.scene.add(mesh);
    return mesh;
  }

  _buildDetector(x, hexColor) {
    const housing = new THREE.Mesh(
      roundedBoxGeometry(1.2, 0.9, 0.12, 0.05, 3),
      plasticMaterial(0x1e293b, { roughness: 0.6 }),
    );
    housing.position.set(x, Y_DETECTOR - 0.05, -0.2);
    this.scene.add(housing);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 190;
    const texture = new THREE.CanvasTexture(canvas);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.78),
      new THREE.MeshBasicMaterial({ map: texture, transparent: false }),
    );
    plane.position.set(x, Y_DETECTOR - 0.05, -0.08);
    plane.renderOrder = 5;
    this.scene.add(plane);

    const shadow = contactShadow(0.75, 0.55, 0.4);
    shadow.position.set(x, -2.9 + 0.006, -0.15);
    this.scene.add(shadow);

    return { canvas, ctx: canvas.getContext('2d'), texture, plane, housing };
  }

  _updateScreens() {
    const s = this.state;
    const lambdaE = electronWavelength(s.voltage);
    const dE_nm = rayleighResolution(lambdaE, s.NA) * 1e9;
    const dL_nm = rayleighResolution(LIGHT_WAVELENGTH_M, s.NAlight) * 1e9;

    this._paintScreen(this.opticalScreen, dL_nm, 'rgba(255,247,214,0.95)', 'rgba(245,158,11,0.75)');
    this._paintScreen(this.electronScreen, dE_nm, 'rgba(224,242,254,0.95)', 'rgba(56,189,248,0.8)');
  }

  _paintScreen(screen, dNm, core, mid) {
    if (!screen) return;
    const { ctx, canvas } = screen;
    const info = drawTwoPointBlobs(ctx, 0, 0, canvas.width, canvas.height, {
      dNm, sepNm: SAMPLE_SEP_NM, core, mid, bg: '#0b1224',
    });
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
    ctx.fillStyle = info.resolved ? '#4ade80' : '#f87171';
    ctx.font = '700 20px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(info.resolved ? 'RESOLVED' : 'NOT RESOLVED', canvas.width / 2, canvas.height - 14);
    screen.texture.needsUpdate = true;
  }

  setParams(p) {
    if (!p) return;
    if (p.voltage != null) this.state.voltage = p.voltage;
    if (p.NA != null) this.state.NA = p.NA;
    if (p.NAlight != null) this.state.NAlight = p.NAlight;
    this._updateScreens();
  }

  setPaused(v) { this.paused = !!v; }
  setActive(v) { this._active = !!v; }
  applyTips(tips) { this._tipTexts = tips; }

  getPickables() {
    return (this._pickables || []).filter(Boolean);
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

  _animateParticles(list, curve, speed) {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const tt = (this.phase * speed + m.userData.seed) % 1;
      const pos = curve.getPointAt(Math.max(0.001, Math.min(0.999, tt)));
      m.position.copy(pos);
      const fade = Math.min(1, Math.min(tt, 1 - tt) * 8);
      m.material.opacity = 0.3 + 0.6 * fade;
    }
  }

  _animate() {
    if (!this._alive) return;
    requestAnimationFrame(this._animate);

    if (this._active && !this.paused) {
      this.phase += 0.016;
      this._animateParticles(this._particles.optical, this.opticalCurve, 0.22);
      this._animateParticles(this._particles.electron, this.electronCurve, 0.34);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
