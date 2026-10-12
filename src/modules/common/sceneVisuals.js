// Shared 3D scene polish: lighting, grid, glow particles, compact labels.
import * as THREE from 'three';
import { pickShell } from './sceneChrome.js';

export const SCENE_BG = 0x05070d;

export function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);
  scene.fog = new THREE.FogExp2(SCENE_BG, 0.015);
  return scene;
}

export function setupRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setClearColor(SCENE_BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = 'webgl-fill';
  renderer.domElement.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
  container.appendChild(renderer.domElement);
  return renderer;
}

export function addStudioLights(scene) {
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x0a0f1c, 0.42));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xffffff, 0.72);
  key.position.set(6, 14, 10);
  scene.add(key);
  // Cool fill — warm cream fill looked muddy/brown on older GPUs
  const fill = new THREE.DirectionalLight(0xdbeafe, 0.18);
  fill.position.set(-4, 2, 12);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.28);
  rim.position.set(-8, 5, -8);
  scene.add(rim);
}

export function addFloorGrid(scene, size = 30, y = -2.5) {
  const grid = new THREE.GridHelper(size, size, 0x152035, 0x0c1218);
  grid.position.y = y;
  scene.add(grid);
  return grid;
}

export function glowTexture(hexColor, size = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.28, hexColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

const EFFECT_HALO = 0.62; // scales glow halos only — not parent mesh/particle size

export function attachGlow(parent, colorHex, scale = 1.5) {
  const hex = typeof colorHex === 'number'
    ? `#${colorHex.toString(16).padStart(6, '0')}`
    : colorHex;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(hex),
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const s = scale * EFFECT_HALO;
  spr.scale.set(s, s, 1);
  parent.add(spr);
  return spr;
}

export function glowSphere(radius, color, { pick = false } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, depthTest: false }),
  );
  mesh.renderOrder = 10;
  attachGlow(mesh, color, radius * 1.55);
  if (pick) pickShell(mesh, radius * 2.2);
  return mesh;
}

/** Position a smallLabel sprite in world space. */
export function placeLabel(text, x, y, z, color = '#a9c4ff', scale = 1.35) {
  const lbl = smallLabel(text, color, scale);
  lbl.position.set(x, y, z);
  return lbl;
}

/** Compact 3D caption — intentionally small (not billboard posters). */
export function smallLabel(text, color = '#a9c4ff', scale = 1.35) {
  const cv = document.createElement('canvas');
  cv.width = 384;
  cv.height = 48;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(10,17,34,0.78)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(4, 6, 376, 36, 8);
  } else {
    // Fallback rounded rect without roundRect API
    const x = 4, y = 6, w = 376, h = 36, r = 8;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = '600 16px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 192, 24);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  spr.scale.set(scale * 1.55, scale * 0.32, 1);
  return spr;
}

/** Simple glass/enclosure — MeshStandard (no transmission). Physical+transmission
 *  often draws muddy brown slabs on older WebGL / Chrome. */
export function glassMaterial(color = 0x334155, opacity = 0.18) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.25,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function glassTube(radius, length, opacity = 0.14) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 32, 1, true),
    glassMaterial(0x334155, opacity),
  );
  return m;
}

export function dashedGuide(points, color, opacity = 0.42) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
    color, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity,
  }));
  line.computeLineDistances();
  return line;
}

export function solidGuide(points, color, opacity = 0.34) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

export function collisionFlash(scene) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.userData.life = 0;
  scene.add(ring);
  return ring;
}

export function tickFlash(ring, dt) {
  if (ring.userData.life <= 0) return;
  ring.userData.life -= dt * 2.5;
  ring.material.opacity = Math.max(0, ring.userData.life) * 0.55;
  ring.scale.setScalar(1 + (1 - ring.userData.life) * 1.4);
}

export function triggerFlash(ring) {
  ring.userData.life = 1;
  ring.material.opacity = 0.55;
  ring.scale.setScalar(1);
}

// ── Higher-polish building blocks (rounded housings, grounded shadows,
//    leader-line labels) so schematic scenes read as crafted objects
//    rather than a pile of raw primitives floating in space. ──────────

/** A box with rounded vertical edges — reads as a manufactured housing
 *  instead of a raw BoxGeometry. Built from an extruded rounded-rect
 *  profile (cheap: no bevel segments, no transmission). */
export function roundedBoxGeometry(w, h, depth, radius = 0.06, segments = 4) {
  const r = Math.min(radius, w / 2, h / 2);
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x, y + r);
  shape.lineTo(x, y + h - r);
  shape.quadraticCurveTo(x, y + h, x + r, y + h);
  shape.lineTo(x + w - r, y + h);
  shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  shape.lineTo(x + w, y + r);
  shape.quadraticCurveTo(x + w, y, x + w - r, y);
  shape.lineTo(x + r, y);
  shape.quadraticCurveTo(x, y, x, y + r);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: r * 0.5, bevelSize: r * 0.4,
    bevelSegments: 2, curveSegments: segments,
  });
  geo.translate(0, 0, -depth / 2);
  geo.center();
  return geo;
}

/** Tuned-metal material — consistent brushed-metal look across modules. */
export function metalMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: opts.metalness != null ? opts.metalness : 0.75,
    roughness: opts.roughness != null ? opts.roughness : 0.32,
    emissive: opts.emissive != null ? opts.emissive : 0x000000,
    emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 0,
  });
}

/** Tuned matte-plastic material — housings, hoppers, casings. */
export function plasticMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.05,
    roughness: opts.roughness != null ? opts.roughness : 0.55,
    emissive: opts.emissive != null ? opts.emissive : 0x000000,
    emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 0,
  });
}

/** A soft radial-gradient disc laid flat under an object to fake ground
 *  contact / AO cheaply (no real shadow map needed). */
export function contactShadow(radiusX, radiusZ = radiusX, opacity = 0.45) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(0,0,0,${opacity})`);
  g.addColorStop(0.7, `rgba(0,0,0,${opacity * 0.35})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radiusX, radiusZ, 1);
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * A callout: small dot at the anchor point + a thin leader line + an
 * offset text label, so captions never overlap the geometry they name.
 * Returns { group, setAnchor(pos), setText(str) }.
 */
export function leaderLabel(anchor, labelPos, text, color = '#a9c4ff', scale = 1.1) {
  const group = new THREE.Group();
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 10),
    new THREE.MeshBasicMaterial({ color }),
  );
  dot.position.copy(anchor);
  group.add(dot);
  const line = solidGuide([anchor, labelPos], color, 0.55);
  group.add(line);
  const lbl = smallLabel(text, color, scale);
  lbl.position.copy(labelPos);
  group.add(lbl);
  return {
    group,
    setAnchor(pos) { dot.position.copy(pos); line.geometry.setFromPoints([pos, labelPos]); },
    label: lbl,
  };
}
