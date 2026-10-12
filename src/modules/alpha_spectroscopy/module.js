import { AlphaSpectroscopy2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import {
  SOURCES,
  getSource,
  createSpectrum,
  accumulate,
  peakInfo,
  spectrumRange,
} from './physics.js';

class AlphaSpectroscopyInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      sourceId: 'am241',
      airMm: 0,
      vacuum: true,
      rate: 100,
      running: true,
    };
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.alpha_spectroscopy.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-alpha');
    this.viewport = el('div', 'viewport alpha-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel alpha-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.alpha_spectroscopy'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this._resetSpectrum();
    this.scene = new AlphaSpectroscopy2D(this.viewport);
    this.scene.setSpectrum(this.spec);
    this.scene.setParams(this.state);
    this._chrome = wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 80);
  }

  _airMm() {
    return this.state.vacuum ? 0 : this.state.airMm;
  }

  _resetSpectrum() {
    const src = getSource(this.state.sourceId);
    const range = spectrumRange(src, this._airMm());
    this.spec = createSpectrum(512, range.eMin, range.eMax);
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (!this.state.running) return;
    const src = getSource(this.state.sourceId);
    const n = Math.max(1, Math.round(this.state.rate * 0.08));
    accumulate(this.spec, src, this._airMm(), n);
    this.scene.setSpectrum(this.spec);
    this.scene.setParams({ flash: true });
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.source')));
    const chips = el('div', 'chips');
    SOURCES.forEach(function (src) {
      const b = el('button', 'chip' + (self.state.sourceId === src.id ? ' active' : ''), src.name);
      b.onclick = function () {
        self.state.sourceId = src.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._resetSpectrum();
        self.scene.setSpectrum(self.spec);
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    this._sourceNote = el('div', 'param-help', '');
    card.appendChild(this._sourceNote);

    card.appendChild(el('div', 'field-label', this.T('controls.chamber')));
    const vacChips = el('div', 'chips');
    const vacBtn = el('button', 'chip' + (this.state.vacuum ? ' active' : ''), this.T('controls.vacuum'));
    const airBtn = el('button', 'chip' + (!this.state.vacuum ? ' active' : ''), this.T('controls.air'));
    vacBtn.onclick = function () {
      self.state.vacuum = true;
      vacBtn.classList.add('active');
      airBtn.classList.remove('active');
      self._airSliderWrap.style.display = 'none';
      self._resetSpectrum();
      self.scene.setSpectrum(self.spec);
      self._refresh();
    };
    airBtn.onclick = function () {
      self.state.vacuum = false;
      if (self.state.airMm < 0.5) self.state.airMm = 2;
      airBtn.classList.add('active');
      vacBtn.classList.remove('active');
      self._airSliderWrap.style.display = '';
      self._resetSpectrum();
      self.scene.setSpectrum(self.spec);
      self._refresh();
    };
    vacChips.appendChild(vacBtn);
    vacChips.appendChild(airBtn);
    card.appendChild(vacChips);

    this._airSliderWrap = el('div', '');
    this._airSliderWrap.style.display = this.state.vacuum ? 'none' : '';
    paramSlider(this._airSliderWrap, {
      label: this.T('controls.airMm'),
      min: 0.5, max: 12, step: 0.5, value: this.state.airMm || 2, unit: ' mm',
      decimals: 1,
      help: this.T('controls.airHelp'),
      onInput: function (v) {
        self.state.airMm = v;
        self._resetSpectrum();
        self.scene.setSpectrum(self.spec);
        self._refresh();
      },
    });
    card.appendChild(this._airSliderWrap);

    paramSlider(card, {
      label: this.T('controls.rate'),
      min: 20, max: 400, step: 10, value: this.state.rate, unit: ' /s',
      onInput: function (v) {
        self.state.rate = v;
        self.scene.setParams(self.state);
      },
    });

    const actions = el('div', 'qc-actions alpha-actions');
    const runBtn = el('button', 'btn', this.T('controls.pauseAcq'));
    runBtn.type = 'button';
    runBtn.onclick = function () {
      self.state.running = !self.state.running;
      runBtn.textContent = self.state.running ? self.T('controls.pauseAcq') : self.T('controls.resumeAcq');
      self.scene.setParams(self.state);
    };
    const clearBtn = el('button', 'btn', this.T('controls.clear'));
    clearBtn.type = 'button';
    clearBtn.onclick = function () {
      self._resetSpectrum();
      self.scene.setSpectrum(self.spec);
    };
    actions.appendChild(runBtn);
    actions.appendChild(clearBtn);
    card.appendChild(actions);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card alpha-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'alpha-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const src = getSource(this.state.sourceId);
    this._sourceNote.textContent = src.note || '';
    const air = this._airMm();
    const peaks = peakInfo(src, air);
    const p0 = peaks[0];
    const rows = [
      [this.T('info.source'), src.name],
      [this.T('info.chamber'), air <= 0 ? this.T('controls.vacuum') : (air.toFixed(1) + ' mm air')],
      [this.T('info.Eobs'), p0 ? p0.Eobs.toFixed(3) + ' MeV' : '—'],
      [this.T('info.fwhm'), p0 ? (p0.fwhm * 1000).toFixed(0) + ' keV' : '—'],
      [this.T('info.R'), p0 ? p0.resolutionPct.toFixed(2) + '%' : '—'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'alpha-feat');
      row.appendChild(el('div', 'alpha-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'alpha_spectroscopy',
  icon: 'α',
  navKey: 'modules.alpha_spectroscopy.navTitle',
  titleKey: 'modules.alpha_spectroscopy.title',
  descKey: 'modules.alpha_spectroscopy.desc',
  create: function (ctx) { return new AlphaSpectroscopyInstance(ctx); },
};
