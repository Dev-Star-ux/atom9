import { Cyclotron2D } from './scene2d.js';
import { CyclotronScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { PARTICLES, findParticle, cyclotronFrequency, energyAtRadius, joulesToEV } from './physics.js';

class CyclotronInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { particleId: 'proton', B: 1.5, ratio: 1.0, dee: 1.0, maxRadius: 0.5 };
  }

  T(k, v) { return this.t('modules.cyclotron.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-cyc');
    this.viewport = el('div', 'viewport cyc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel cyc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.cyclotron'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Cyclotron2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new CyclotronScene3D(host);
        s.setParams(self._sceneParams());
        if (self.dual && self.dual.scene2d && typeof self.dual.scene2d.getSnapshot === 'function') {
          s.applySnapshot(self.dual.scene2d.getSnapshot());
        }
        s.applyTips(loadModuleTips('modules.cyclotron', self.t));
        if (s.camera && s.renderer && s.renderer.domElement) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () {
              return typeof s.getPickables === 'function' ? s.getPickables() : [];
            },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s3 && typeof s3.setActive === 'function') {
          s3.setActive(mode === '3d');
        }
        if (mode === '3d' && s3 && s2 && typeof s3.applySnapshot === 'function' && typeof s2.getSnapshot === 'function') {
          s3.setParams(self._sceneParams());
          s3.applySnapshot(s2.getSnapshot());
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
  }

  _sceneParams() {
    return {
      particleId: this.state.particleId,
      B: this.state.B,
      ratio: this.state.ratio,
      dee: this.state.dee,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.particle')));
    const chips = el('div', 'chips');
    PARTICLES.forEach(function (p) {
      const b = el('button', 'chip' + (self.state.particleId === p.id ? ' active' : ''), p.name);
      b.onclick = function () {
        self.state.particleId = p.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self.dual.setParams(self._sceneParams());
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    paramSlider(card, {
      label: this.T('controls.field'),
      min: 0.2, max: 3, step: 0.05, value: this.state.B, unit: ' T', decimals: 2,
      onInput: function (v) { self.state.B = v; self.dual.setParams({ B: v }); self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.ratio'),
      min: 0.85, max: 1.15, step: 0.01, value: this.state.ratio, unit: '×', decimals: 2,
      help: this.T('controls.ratioHelp'),
      onInput: function (v) { self.state.ratio = v; self.dual.setParams({ ratio: v }); self._refresh(); },
    });
    paramSlider(card, {
      label: this.T('controls.dee'),
      min: 0.2, max: 2, step: 0.1, value: this.state.dee, unit: '×', decimals: 1,
      onInput: function (v) { self.state.dee = v; self.dual.setParams({ dee: v }); self._refresh(); },
    });

    const resetBtn = el('button', 'chip', this.T('controls.reset'));
    resetBtn.onclick = function () { self.dual.setParams({ reset: true }); };
    card.appendChild(resetBtn);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card cyc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    const p = findParticle(this.state.particleId);
    const f = cyclotronFrequency(p.q, this.state.B, p.m);
    const rMax = 0.5; // metres, typical small cyclotron
    const E = energyAtRadius(p.q, this.state.B, rMax, p.m);
    const rows = [
      [this.T('info.particle'), p.name],
      [this.T('info.freq'), (f / 1e6).toFixed(2) + ' MHz'],
      [this.T('info.energyAtR'), joulesToEV(E).toFixed(0) + ' eV @ r=0.5 m'],
      [this.T('info.resonance'), Math.abs(this.state.ratio - 1) < 0.005 ? this.T('info.inSync') : this.T('info.outSync')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    ['t1', 't2', 't3'].forEach((k) => {
      const row = el('div', 'emx-feat');
      row.appendChild(el('div', 'emx-feat-body', this.T('teach.' + k)));
      this._teachBody.appendChild(row);
    });
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'cyclotron',
  icon: '🔁',
  navKey: 'modules.cyclotron.navTitle',
  titleKey: 'modules.cyclotron.title',
  descKey: 'modules.cyclotron.desc',
  create: function (ctx) { return new CyclotronInstance(ctx); },
};
