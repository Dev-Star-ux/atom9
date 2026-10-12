import { MechanicalEquilibriumScene2D } from './scene2d.js';
import { MechanicalEquilibriumScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { curvature } from './physics.js';

class MechanicalEquilibriumInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { k: 8, damp: 0.35, kick: 0.9 };
  }
  T(k, v) { return this.t('modules.mechanical_equilibrium.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport eq-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.mechanical_equilibrium'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._teach());
    this._rail = el('div', 'panel-rail');
    this._rail.appendChild(this.panel);
    root.appendChild(this._rail);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new MechanicalEquilibriumScene2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new MechanicalEquilibriumScene3D(host);
        s.setParams(self.state);
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.mechanical_equilibrium', self.t));
        if (s.camera) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () { return s.getPickables(); },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && s2.setActive) s2.setActive(mode === '2d');
        if (s3 && s3.setActive) {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self.state);
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(function () {
      if (self.dual) self.dual.tick(0.04);
    }, 40);
    setTimeout(function () { if (self.dual) self.dual.resize(); }, 80);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    paramSlider(card, {
      label: this.T('controls.k'), min: 2, max: 18, step: 0.1, value: this.state.k,
      unit: '', decimals: 1, help: this.T('controls.kHelp'),
      onInput: function (v) { self.state.k = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.damp'), min: 0, max: 1.2, step: 0.01, value: this.state.damp,
      unit: '', decimals: 2, help: this.T('controls.dampHelp'),
      onInput: function (v) { self.state.damp = v; self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.kick'), min: 0.2, max: 2.2, step: 0.05, value: this.state.kick,
      unit: '', decimals: 2, help: this.T('controls.kickHelp'),
      onInput: function (v) { self.state.kick = v; self._refresh(); },
    });
    const row = el('div', 'qc-actions');
    const nudge = el('button', 'btn primary', this.T('controls.nudge'));
    nudge.onclick = function () { self.dual.setParams({ nudge: true, kick: self.state.kick }); };
    const reset = el('button', 'btn', this.T('controls.reset'));
    reset.onclick = function () { self.dual.setParams({ reset: true }); self._refresh(); };
    row.append(nudge, reset);
    card.appendChild(row);
    this._infoHost = el('div', 'eq-info');
    card.appendChild(this._infoHost);
    this._refresh();
    return card;
  }

  _teach() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    ['t1', 't2', 't3'].forEach((k) => {
      card.appendChild(el('p', 'param-help', this.T('teach.' + k)));
    });
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams({ k: this.state.k, damp: this.state.damp, kick: this.state.kick });
    if (!this._infoHost) return;
    const ks = curvature(this.state.k, 'stable');
    const ku = curvature(this.state.k, 'unstable');
    this._infoHost.replaceChildren(infoTable([
      [this.T('info.vppStable'), ks.toFixed(1) + '  (> 0)'],
      [this.T('info.vppUnstable'), ku.toFixed(1) + '  (< 0)'],
      [this.T('info.forceLaw'), 'F = −V′(x)'],
      [this.T('info.omega'), '√(k/m)  (small oscillations in the well)'],
    ]));
  }

  unmount() {
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'mechanical_equilibrium',
  icon: '🎢',
  navKey: 'modules.mechanical_equilibrium.navTitle',
  titleKey: 'modules.mechanical_equilibrium.title',
  descKey: 'modules.mechanical_equilibrium.desc',
  create: function (ctx) { return new MechanicalEquilibriumInstance(ctx); },
};
