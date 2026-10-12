import { NaiSpectrometer2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import {
  SOURCES,
  getSource,
  createSpectrum,
  accumulate,
  peakInfo,
} from './physics.js';

function eMaxForSource(src) {
  let maxE = 200;
  const lines = src.lines || [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].E > maxE) maxE = lines[i].E;
  }
  // Headroom above highest line
  return Math.ceil((maxE * 1.25) / 50) * 50;
}

class NaiSpectrometerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      sourceId: 'cs137',
      resolutionPct: 7,
      rate: 180,
      running: true,
      showLabels: true,
    };
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.nai_spectrometer.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-nai');
    this.viewport = el('div', 'viewport nai-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nai-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nai_spectrometer'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildFeaturesCard());
    root.appendChild(this.panel);

    this._resetSpectrum();
    this.scene = new NaiSpectrometer2D(this.viewport);
    this.scene.setSpectrum(this.spec);
    this.scene.setParams(this.state);
    this._chrome = wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 80);
  }

  _resetSpectrum() {
    const src = getSource(this.state.sourceId);
    const eMax = eMaxForSource(src);
    this.spec = createSpectrum(512, eMax);
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (!this.state.running) return;
    const src = getSource(this.state.sourceId);
    // ~rate events per second → per 80 ms tick
    const n = Math.max(1, Math.round((this.state.rate * 0.08)));
    accumulate(this.spec, src, this.state.resolutionPct, n);
    this.scene.setSpectrum(this.spec);
    this.scene.setParams({ flash: true });
    this._updateLiveCounts();
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

    paramSlider(card, {
      label: this.T('controls.resolution'),
      min: 4, max: 12, step: 0.5, value: this.state.resolutionPct, unit: '%',
      decimals: 1,
      help: this.T('controls.resolutionHelp'),
      onInput: function (v) {
        self.state.resolutionPct = v;
        self._resetSpectrum();
        self.scene.setSpectrum(self.spec);
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.rate'),
      min: 20, max: 600, step: 10, value: this.state.rate, unit: ' /s',
      onInput: function (v) {
        self.state.rate = v;
        self.scene.setParams(self.state);
      },
    });

    const actions = el('div', 'qc-actions nai-actions');
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
      self._updateLiveCounts();
    };
    const labelBtn = el('button', 'btn', this.T('controls.toggleLabels'));
    labelBtn.type = 'button';
    labelBtn.onclick = function () {
      self.state.showLabels = !self.state.showLabels;
      self.scene.setParams(self.state);
    };
    actions.appendChild(runBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(labelBtn);
    card.appendChild(actions);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildFeaturesCard() {
    const card = el('div', 'card nai-features');
    card.appendChild(el('div', 'card-title', this.T('features.title')));
    this._featBody = el('div', 'nai-feat-list');
    card.appendChild(this._featBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const src = getSource(this.state.sourceId);
    this._sourceNote.textContent = src.note || '';
    const peaks = peakInfo(src, this.state.resolutionPct);
    const p0 = peaks[0];
    const rows = [
      [this.T('info.source'), src.name],
      [this.T('info.resolution'), this.state.resolutionPct.toFixed(1) + '% @ 662 keV'],
      [this.T('info.fwhm'), p0 ? p0.fwhm.toFixed(1) + ' keV @ ' + Math.round(p0.E) : '—'],
      [this.T('info.R'), p0 ? p0.resolutionPct.toFixed(1) + '%' : '—'],
      [this.T('info.comptonEdge'), p0 ? p0.comptonEdge.toFixed(0) + ' keV' : '—'],
      [this.T('info.backscatter'), p0 ? p0.backscatter.toFixed(0) + ' keV' : '—'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    // Feature explainer bullets
    this._featBody.innerHTML = '';
    const items = [
      { cls: 'peak', title: this.T('features.photopeak'), body: this.T('features.photopeakBody') },
      { cls: 'compton', title: this.T('features.compton'), body: this.T('features.comptonBody') },
      { cls: 'edge', title: this.T('features.edge'), body: this.T('features.edgeBody') },
      { cls: 'back', title: this.T('features.backscatter'), body: this.T('features.backscatterBody') },
      { cls: 'res', title: this.T('features.resolution'), body: this.T('features.resolutionBody') },
    ];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const row = el('div', 'nai-feat ' + it.cls);
      row.appendChild(el('div', 'nai-feat-title', it.title));
      row.appendChild(el('div', 'nai-feat-body', it.body));
      this._featBody.appendChild(row);
    }
  }

  _updateLiveCounts() {
    // Keep info table static; counts shown on canvas
  }

  unmount() {
    clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'nai_spectrometer',
  icon: '📊',
  navKey: 'modules.nai_spectrometer.navTitle',
  titleKey: 'modules.nai_spectrometer.title',
  descKey: 'modules.nai_spectrometer.desc',
  create: function (ctx) { return new NaiSpectrometerInstance(ctx); },
};
