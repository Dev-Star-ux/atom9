import { RadarPrinciplesScene2D } from './scene2d.js';
import { RadarPrinciplesScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { delayFromRange, unambiguousRange, echoPowerRelative, pulseLengthMeters, withinUnambiguous } from './physics.js';

class RadarPrinciplesInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      pulseWidth: 1e-6,
      prf: 1000,
      range: 30000,
      sigma: 10,
      Pt: 1,
    };
  }

  T(k, v) { return this.t('modules.radar_principles.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-radar');
    this.viewport = el('div', 'viewport radar-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel radar-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.radar_principles'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new RadarPrinciplesScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new RadarPrinciplesScene3D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.radar_principles', self.t));
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
        const s3 = scenes && scenes.scene3d;
        if (s3 && typeof s3.setActive === 'function') {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self._sceneParams());
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
      pulseWidth: this.state.pulseWidth,
      prf: this.state.prf,
      range: this.state.range,
      sigma: this.state.sigma,
      Pt: this.state.Pt,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.pulseWidth'),
      min: 0.2e-6, max: 5e-6, step: 0.1e-6, value: this.state.pulseWidth, unit: ' s',
      decimals: 7,
      help: this.T('controls.pulseWidthHelp'),
      onInput: function (v) {
        self.state.pulseWidth = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.prf'),
      min: 200, max: 5000, step: 50, value: this.state.prf, unit: ' Hz',
      decimals: 0,
      help: this.T('controls.prfHelp'),
      onInput: function (v) {
        self.state.prf = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.range'),
      min: 1000, max: 150000, step: 500, value: this.state.range, unit: ' m',
      decimals: 0,
      help: this.T('controls.rangeHelp'),
      onInput: function (v) {
        self.state.range = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.sigma'),
      min: 0.1, max: 100, step: 0.1, value: this.state.sigma, unit: ' m²',
      decimals: 1,
      help: this.T('controls.sigmaHelp'),
      onInput: function (v) {
        self.state.sigma = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card radar-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'radar-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const tau = delayFromRange(this.state.range);
    const Runamb = unambiguousRange(this.state.prf);
    const Pr = echoPowerRelative(this.state.Pt, this.state.sigma, this.state.range);
    const dR = pulseLengthMeters(this.state.pulseWidth);
    const ok = withinUnambiguous(this.state.range, this.state.prf);
    const rows = [
      [this.T('controls.pulseWidth'), (this.state.pulseWidth * 1e6).toFixed(2) + ' µs'],
      [this.T('info.tau'), (tau * 1e6).toFixed(2) + ' µs'],
      [this.T('info.Runamb'), (Runamb / 1000).toFixed(1) + ' km'],
      [this.T('info.Pr'), Pr.toExponential(2) + ' (arb.)'],
      [this.T('info.res'), dR.toFixed(0) + ' m'],
      [this.T('info.status'), ok ? this.T('info.ok') : this.T('info.ambiguous')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'radar-feat');
      row.appendChild(el('div', 'radar-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'radar_principles',
  icon: '🛰️',
  navKey: 'modules.radar_principles.navTitle',
  titleKey: 'modules.radar_principles.title',
  descKey: 'modules.radar_principles.desc',
  create: function (ctx) { return new RadarPrinciplesInstance(ctx); },
};
