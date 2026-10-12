import { Crt2D } from './scene2d.js';
import { CrtScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';

class CrtInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { view: 'sweep', wave: 'sine', vAmp: 3, vFreq: 2, sweepHz: 1, fx: 2, fy: 3, phaseDeg: 0 };
  }

  T(k, v) { return this.t('modules.oscilloscope_crt.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-cro');
    this.viewport = el('div', 'viewport cro-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel cro-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.oscilloscope_crt'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new Crt2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new CrtScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.oscilloscope_crt', self.t));
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
      view: this.state.view,
      wave: this.state.wave,
      vAmp: this.state.vAmp,
      vFreq: this.state.vFreq,
      sweepHz: this.state.sweepHz,
      fx: this.state.fx,
      fy: this.state.fy,
      phaseDeg: this.state.phaseDeg,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.view')));
    const chips = el('div', 'chips');
    ['sweep', 'lissajous'].forEach(function (v) {
      const b = el('button', 'chip' + (self.state.view === v ? ' active' : ''), self.T('controls.views.' + v));
      b.onclick = function () {
        self.state.view = v;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    card.appendChild(el('div', 'field-label', this.T('controls.wave')));
    const waveChips = el('div', 'chips');
    ['sine', 'square', 'triangle', 'sawtooth', 'pulse'].forEach(function (w) {
      const b = el('button', 'chip' + (self.state.wave === w ? ' active' : ''), self.T('controls.waves.' + w));
      b.onclick = function () {
        self.state.wave = w;
        waveChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      waveChips.appendChild(b);
    });
    card.appendChild(waveChips);

    this._sweepControls = el('div', '');
    paramSlider(this._sweepControls, {
      label: this.T('controls.sweep'),
      min: 0.2, max: 5, step: 0.1, value: this.state.sweepHz, unit: ' Hz', decimals: 1,
      onInput: function (v) { self.state.sweepHz = v; self._refresh(); },
    });
    paramSlider(this._sweepControls, {
      label: this.T('controls.vAmp'),
      min: 0.5, max: 5, step: 0.1, value: this.state.vAmp, unit: ' V', decimals: 1,
      onInput: function (v) { self.state.vAmp = v; self._refresh(); },
    });
    paramSlider(this._sweepControls, {
      label: this.T('controls.vFreq'),
      min: 0.2, max: 8, step: 0.1, value: this.state.vFreq, unit: ' Hz', decimals: 1,
      onInput: function (v) { self.state.vFreq = v; self._refresh(); },
    });
    card.appendChild(this._sweepControls);

    this._lissControls = el('div', '');
    paramSlider(this._lissControls, {
      label: this.T('controls.fx'),
      min: 1, max: 8, step: 1, value: this.state.fx, unit: ' Hz',
      onInput: function (v) { self.state.fx = v; self._refresh(); },
    });
    paramSlider(this._lissControls, {
      label: this.T('controls.fy'),
      min: 1, max: 8, step: 1, value: this.state.fy, unit: ' Hz',
      onInput: function (v) { self.state.fy = v; self._refresh(); },
    });
    paramSlider(this._lissControls, {
      label: this.T('controls.phase'),
      min: 0, max: 360, step: 5, value: this.state.phaseDeg, unit: '°',
      onInput: function (v) { self.state.phaseDeg = v; self._refresh(); },
    });
    card.appendChild(this._lissControls);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card cro-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'emx-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const view = this.state.view;
    this._sweepControls.style.display = view === 'sweep' ? '' : 'none';
    this._lissControls.style.display = view === 'lissajous' ? '' : 'none';

    let rows;
    if (view === 'sweep') {
      rows = [
        [this.T('info.shape'), this.T('controls.waves.' + (this.state.wave || 'sine'))],
        [this.T('info.sweep'), this.state.sweepHz.toFixed(1) + ' Hz'],
        [this.T('info.signal'), this.state.vFreq.toFixed(1) + ' Hz'],
        [this.T('info.cycles'), (this.state.vFreq / this.state.sweepHz).toFixed(2) + ' per sweep'],
      ];
    } else {
      const ratio = this.state.fy / this.state.fx;
      rows = [
        [this.T('info.shape'), this.T('controls.waves.' + (this.state.wave || 'sine'))],
        [this.T('info.ratio'), 'fy:fx = ' + this.state.fy + ':' + this.state.fx],
        [this.T('info.phase'), this.state.phaseDeg.toFixed(0) + '°'],
        [this.T('info.pattern'), Number.isInteger(ratio) || Number.isInteger(1 / ratio) ? this.T('info.closed') : this.T('info.drifting')],
      ];
    }
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = view === 'sweep' ? ['s1', 's2', 's3', 's4'] : ['l1', 'l2', 'l3'];
    keys.forEach((k) => {
      const row = el('div', 'emx-feat');
      row.appendChild(el('div', 'emx-feat-body', this.T('teach.' + k)));
      this._teachBody.appendChild(row);
    });
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'oscilloscope_crt',
  icon: '📉',
  navKey: 'modules.oscilloscope_crt.navTitle',
  titleKey: 'modules.oscilloscope_crt.title',
  descKey: 'modules.oscilloscope_crt.desc',
  create: function (ctx) { return new CrtInstance(ctx); },
};
