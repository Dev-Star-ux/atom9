import * as THREE from "three";
import { el } from "./ui.js";
import langStrings from "../../../lang/en.json";
export function tip(obj, title, desc, stats) {
  if (obj) obj.userData.sceneTip = { title, desc, stats };
  return obj;
}
export function resolveSceneTip(obj, hit) {
  var _a;
  if (!(obj == null ? void 0 : obj.userData)) return null;
  const raw = (_a = obj.userData.sceneTip) != null ? _a : obj.userData.tip;
  if (!raw) return null;
  const resolved = typeof raw === "function" ? raw(obj, hit) : raw;
  if (!(resolved == null ? void 0 : resolved.title)) return null;
  return resolved;
}
export function stat(tips, key, value) {
  var _a;
  const label = ((_a = tips == null ? void 0 : tips.quantities) == null ? void 0 : _a[key]) || key;
  return { label, value: String(value) };
}
export function applyTips(map, tips) {
  for (const [id, obj] of Object.entries(map)) {
    const t = tips[id];
    if (t && obj) tip(obj, t.title, t.desc, t.stats);
  }
}
export function noPick(obj) {
  if (!obj) return obj;
  obj.raycast = () => {
  };
  if (obj.traverse) obj.traverse((c) => {
    c.raycast = () => {
    };
  });
  return obj;
}
export function pickShell(parent, radius) {
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  parent.add(shell);
  return shell;
}
export function resolveTip(raw, obj, hit) {
  if (!raw) return null;
  return typeof raw === "function" ? raw(obj, hit) : raw;
}
export function pauseResumeButton(viewport, { pauseLabel, resumeLabel, onToggle }) {
  let paused = false;
  const btn = el("button", "viewport-btn pause-btn", pauseLabel);
  btn.onclick = () => {
    paused = !paused;
    btn.textContent = paused ? resumeLabel : pauseLabel;
    onToggle(paused);
  };
  viewport.appendChild(btn);
  return {
    setPaused(p) {
      paused = p;
      btn.textContent = p ? resumeLabel : pauseLabel;
    }
  };
}
export function bindSceneTips(viewport, { camera, domElement, getPickables }) {
  const box = el("div", "scene-tip hidden");
  const titleEl = el("div", "scene-tip-title");
  const descEl = el("div", "scene-tip-desc");
  const statsEl = el("div", "scene-tip-stats");
  box.append(titleEl, descEl, statsEl);
  viewport.appendChild(box);
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 1.8 };
  raycaster.params.Line = { threshold: 0.4 };
  const mouse = new THREE.Vector2();
  const hide = () => box.classList.add("hidden");
  const show = (tip2, clientX, clientY) => {
    var _a;
    titleEl.textContent = tip2.title || "";
    descEl.textContent = tip2.desc || "";
    statsEl.innerHTML = "";
    if ((_a = tip2.stats) == null ? void 0 : _a.length) {
      for (const s of tip2.stats) {
        const row = el("div", "scene-tip-stat");
        row.appendChild(el("span", "k", s.label));
        row.appendChild(el("span", "v", s.value));
        statsEl.appendChild(row);
      }
    }
    box.classList.remove("hidden");
    const rect = viewport.getBoundingClientRect();
    box.style.left = `${Math.min(Math.max(clientX - rect.left + 14, 8), rect.width - 268)}px`;
    box.style.top = `${Math.min(Math.max(clientY - rect.top - 10, 8), rect.height - 90)}px`;
  };
  const findTip = (hit) => {
    let o = hit.object;
    while (o) {
      const t = resolveSceneTip(o, hit);
      if (t) return t;
      o = o.parent;
    }
    return null;
  };
  const onPick = (e) => {
    const rect = domElement.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(getPickables(), true).sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      const t = findTip(hit);
      if (t) {
        show(t, e.clientX, e.clientY);
        return;
      }
    }
    hide();
  };
  let down = null;
  domElement.addEventListener("pointerdown", (e) => {
    if (e.button === 0) down = { x: e.clientX, y: e.clientY };
  });
  domElement.addEventListener("pointerup", (e) => {
    if (e.button !== 0 || !down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) {
      down = null;
      return;
    }
    down = null;
    onPick(e);
  });
  return { hide };
}
const LEGACY_TIP_IDS = [
  "source",
  "lamp",
  "slit",
  "ion",
  "magnet",
  "detector",
  "slits",
  "nucleus",
  "alpha",
  "beam",
  "plateP",
  "plateN",
  "drop",
  "gun",
  "coils",
  "screen",
  "cathode",
  "anode",
  "photon",
  "electron",
  "cloud",
  "grid",
  "collector",
  "gas",
  "incident",
  "scattered",
  "recoil",
  "slab",
  "cavity",
  "orbit",
  "particle",
  "crystal",
  "prism",
  "foil",
  "photocathode",
  "dynode",
  "pSide",
  "nSide",
  "junction",
  "load",
  "wave",
  "packet",
  "well"
];
function moduleIdFromPrefix(prefix) {
  return prefix.startsWith("modules.") ? prefix.slice("modules.".length) : prefix;
}
export function loadModuleTips(prefix, t) {
  var _a, _b, _c;
  const tips = { quantities: {} };
  const block = (_c = (_b = (_a = langStrings) == null ? void 0 : _a.modules) == null ? void 0 : _b[moduleIdFromPrefix(prefix)]) == null ? void 0 : _c.tips;
  if (block && typeof block === "object") {
    for (const [id, val] of Object.entries(block)) {
      if (id === "quantities" && val && typeof val === "object") {
        for (const [k, label] of Object.entries(val)) {
          if (typeof label === "string") tips.quantities[k] = label;
        }
      } else if (val && typeof val === "object" && val.title) {
        tips[id] = { title: val.title, desc: val.desc || "" };
      }
    }
    return tips;
  }
  for (const id of LEGACY_TIP_IDS) {
    const title = t(`${prefix}.tips.${id}.title`);
    const desc = t(`${prefix}.tips.${id}.desc`);
    if (title !== `${prefix}.tips.${id}.title`) tips[id] = { title, desc };
  }
  return tips;
}
const Q_KEYS = [
  "electrons",
  "charge",
  "radius",
  "balanceV",
  "plateV",
  "mass",
  "arcRadius",
  "voltage",
  "fieldB",
  "sample",
  "photonEnergy",
  "frequency",
  "wavelength",
  "workFunction",
  "stopVoltage",
  "intensity",
  "kineticEnergy",
  "speed",
  "nuclearCharge",
  "alphaEnergy",
  "beamEnergy",
  "deflection",
  "screenY",
  "quantumN",
  "quantumL",
  "quantumM",
  "energy",
  "hits",
  "deflectVoltage",
  "magneticB",
  "accelVoltage",
  "scatteringAngle",
  "impactParameter",
  "excitation",
  "shift",
  "lambdaC",
  "meanFreePath",
  "sigma",
  "temperature",
  "peakWavelength",
  "power",
  "radius"
];
export function wireExperimentScene(viewport, scene, { t, prefix, onPaused }) {
  var _a, _b;
  const inst = { paused: false };
  pauseResumeButton(viewport, {
    pauseLabel: t("common.pause"),
    resumeLabel: t("common.resume"),
    onToggle: (p) => {
      var _a2;
      inst.paused = p;
      (_a2 = scene.setPaused) == null ? void 0 : _a2.call(scene, p);
      onPaused == null ? void 0 : onPaused(p);
    }
  });
  if (scene.camera && ((_a = scene.renderer) == null ? void 0 : _a.domElement)) {
    bindSceneTips(viewport, {
      camera: scene.camera,
      domElement: scene.renderer.domElement,
      getPickables: () => {
        var _a2, _b2;
        return (_b2 = (_a2 = scene.getPickables) == null ? void 0 : _a2.call(scene)) != null ? _b2 : scene.scene.children;
      }
    });
  }
  const tips = loadModuleTips(prefix, t);
  for (const key of Q_KEYS) {
    const label = t(`${prefix}.tips.quantities.${key}`);
    if (label !== `${prefix}.tips.quantities.${key}`) tips.quantities[key] = label;
  }
  (_b = scene.applyTips) == null ? void 0 : _b.call(scene, tips);
  return inst;
}
export function wireCanvasExperiment(viewport, scene, { t, onPaused }) {
  const inst = { paused: false };
  pauseResumeButton(viewport, {
    pauseLabel: t("common.pause"),
    resumeLabel: t("common.resume"),
    onToggle: (p) => {
      var _a;
      inst.paused = p;
      (_a = scene.setPaused) == null ? void 0 : _a.call(scene, p);
      onPaused == null ? void 0 : onPaused(p);
    }
  });
  return inst;
}
