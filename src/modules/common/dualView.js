// Shared 2D | 3D viewport toggle. Default 2D for teaching; 3D keeps Three.js apparatus.
// Scenes should implement: setParams, resize, setPaused?, dispose, tick? (optional).

import { el } from './ui.js';

/**
 * @param {HTMLElement} viewport
 * @param {{
 *   t: Function,
 *   create2D: (host: HTMLElement) => object,
 *   create3D: (host: HTMLElement) => object,
 *   initial?: '2d'|'3d',
 *   prefix?: string,
 * }} opts
 */
export function mountDualView(viewport, opts) {
  const t = opts.t;
  const initial = opts.initial === '3d' ? '3d' : '2d';

  const bar = el('div', 'view-toggle');
  const btn2 = el('button', 'view-toggle-btn' + (initial === '2d' ? ' active' : ''), t('common.view2d') || '2D');
  const btn3 = el('button', 'view-toggle-btn' + (initial === '3d' ? ' active' : ''), t('common.view3d') || '3D');
  bar.appendChild(btn2);
  bar.appendChild(btn3);
  viewport.appendChild(bar);

  const host2 = el('div', 'view-host view-host-2d');
  const host3 = el('div', 'view-host view-host-3d');
  viewport.appendChild(host2);
  viewport.appendChild(host3);

  let mode = initial;
  let scene2 = null;
  let scene3 = null;
  let paused = false;

  function active() {
    return mode === '2d' ? scene2 : scene3;
  }

  function showMode(next) {
    mode = next;
    btn2.className = 'view-toggle-btn' + (mode === '2d' ? ' active' : '');
    btn3.className = 'view-toggle-btn' + (mode === '3d' ? ' active' : '');
    host2.style.display = mode === '2d' ? 'block' : 'none';
    host3.style.display = mode === '3d' ? 'block' : 'none';

    if (mode === '2d' && !scene2) {
      scene2 = opts.create2D(host2);
      if (scene2 && typeof scene2.setPaused === 'function') scene2.setPaused(paused);
    }
    if (mode === '3d' && !scene3) {
      try {
        scene3 = opts.create3D(host3);
      } catch (err) {
        console.error('3D view failed to start', err);
        scene3 = null;
      }
      if (scene3 && typeof scene3.setPaused === 'function') scene3.setPaused(paused);
    }
    const sc = active();
    if (sc && typeof sc.resize === 'function') sc.resize();
    if (typeof opts.onModeChange === 'function') {
      opts.onModeChange(mode, { scene2d: scene2, scene3d: scene3 });
    }
  }

  btn2.onclick = function () { showMode('2d'); };
  btn3.onclick = function () { showMode('3d'); };

  // Eager-create initial view
  showMode(initial);

  const api = {
    get mode() { return mode; },
    get scene() { return active(); },
    get scene2d() { return scene2; },
    get scene3d() { return scene3; },
    get paused() { return paused; },
    setParams: function (p) {
      if (scene2 && typeof scene2.setParams === 'function') scene2.setParams(p);
      if (scene3 && typeof scene3.setParams === 'function') scene3.setParams(p);
    },
    setPaused: function (v) {
      paused = !!v;
      if (scene2 && typeof scene2.setPaused === 'function') scene2.setPaused(paused);
      if (scene3 && typeof scene3.setPaused === 'function') scene3.setPaused(paused);
    },
    tick: function (dt) {
      const sc = active();
      if (sc && !paused && typeof sc.tick === 'function') sc.tick(dt);
    },
    resize: function () {
      const sc = active();
      if (sc && typeof sc.resize === 'function') sc.resize();
    },
    dispose: function () {
      if (scene2 && typeof scene2.dispose === 'function') scene2.dispose();
      if (scene3 && typeof scene3.dispose === 'function') scene3.dispose();
      scene2 = scene3 = null;
      if (bar.parentNode) bar.parentNode.removeChild(bar);
      if (host2.parentNode) host2.parentNode.removeChild(host2);
      if (host3.parentNode) host3.parentNode.removeChild(host3);
    },
    // For wireExperimentScene compatibility when 3D is active
    getPickables: function () {
      const sc = active();
      if (sc && typeof sc.getPickables === 'function') return sc.getPickables();
      return [];
    },
    applyTips: function (tips) {
      if (scene3 && typeof scene3.applyTips === 'function') scene3.applyTips(tips);
    },
    camera: null,
    renderer: null,
  };

  // Lazy proxy for chrome that expects scene.camera / scene.renderer
  Object.defineProperty(api, 'camera', {
    get: function () { return scene3 && scene3.camera; },
  });
  Object.defineProperty(api, 'renderer', {
    get: function () { return scene3 && scene3.renderer; },
  });

  return api;
}

/** Pause button that drives dualView.setPaused */
export function wireDualPause(viewport, dual, t) {
  const btn = el('button', 'viewport-btn pause-btn', t('common.pause'));
  let paused = false;
  btn.onclick = function () {
    paused = !paused;
    dual.setPaused(paused);
    btn.textContent = paused ? t('common.resume') : t('common.pause');
  };
  viewport.appendChild(btn);
  return {
    get paused() { return paused; },
    set paused(v) {
      paused = !!v;
      dual.setPaused(paused);
      btn.textContent = paused ? t('common.resume') : t('common.pause');
    },
  };
}
