import { HpgeVsNai2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import {
  SOURCES,
  getSource,
  createSpectrum,
  accumulate,
  peakInfo,
  eMaxForSource,
} from './physics.js';

class HpgeVsNaiInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      sourceId: 'cs137',
      naiRes: 7,
      hpgeRes: 0.2,
      rate: 180,
      running: true,
    };
    this._tick = this._tick.bind(this);
  }

  T(k, v) { return this.t('modules.hpge_vs_nai.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-hpge');
    this.viewport = el('div', 'viewport hpge-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel hpge-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.hpge_vs_nai'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildFeaturesCard());
    root.appendChild(this.panel);

    this._resetSpectra();
    this.scene = new HpgeVsNai2D(this.viewport);
    this.scene.setSpectra(this.specNai, this.specHpge);
    this.scene.setParams(this.state);
    this._chrome = wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 80);
  }

  _resetSpectra() {
    const src = getSource(this.state.sourceId);
    const eMax = eMaxForSource(src);
    this.specNai = createSpectrum(512, eMax);
    this.specHpge = createSpectrum(512, eMax);
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (!this.state.running) return;
    const src = getSource(this.state.sourceId);
    const n = Math.max(1, Math.round(this.state.rate * 0.08));
    accumulate(this.specNai, src, this.state.naiRes, n);
    accumulate(this.specHpge, src, this.state.hpgeRes, n);
    this.scene.setSpectra(this.specNai, this.specHpge);
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
        self._resetSpectra();
        self.scene.setSpectra(self.specNai, self.specHpge);
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    this._sourceNote = el('div', 'param-help', '');
    card.appendChild(this._sourceNote);

    paramSlider(card, {
      label: this.T('controls.naiRes'),
      min: 4, max: 12, step: 0.5, value: this.state.naiRes, unit: '%',
      decimals: 1,
      help: this.T('controls.naiResHelp'),
      onInput: function (v) {
        self.state.naiRes = v;
        self._resetSpectra();
        self.scene.setSpectra(self.specNai, self.specHpge);
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.hpgeRes'),
      min: 0.1, max: 1.0, step: 0.05, value: this.state.hpgeRes, unit: '%',
      decimals: 2,
      help: this.T('controls.hpgeResHelp'),
      onInput: function (v) {
        self.state.hpgeRes = v;
        self._resetSpectra();
        self.scene.setSpectra(self.specNai, self.specHpge);
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.rate'),
      min: 20, max: 500, step: 10, value: this.state.rate, unit: ' /s',
      onInput: function (v) {
        self.state.rate = v;
        self.scene.setParams(self.state);
      },
    });

    const actions = el('div', 'qc-actions hpge-actions');
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
      self._resetSpectra();
      self.scene.setSpectra(self.specNai, self.specHpge);
    };
    actions.appendChild(runBtn);
    actions.appendChild(clearBtn);
    card.appendChild(actions);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildFeaturesCard() {
    const card = el('div', 'card hpge-features');
    card.appendChild(el('div', 'card-title', this.T('features.title')));
    this._featBody = el('div', 'hpge-feat-list');
    card.appendChild(this._featBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const src = getSource(this.state.sourceId);
    this._sourceNote.textContent = src.note || '';
    const naiP = peakInfo(src, this.state.naiRes);
    const hpP = peakInfo(src, this.state.hpgeRes);
    const n0 = naiP[0];
    const h0 = hpP[0];
    const rows = [
      [this.T('info.source'), src.name],
      [this.T('info.naiR'), n0 ? n0.resolutionPct.toFixed(1) + '%' : '—'],
      [this.T('info.naiFwhm'), n0 ? n0.fwhm.toFixed(1) + ' keV' : '—'],
      [this.T('info.hpgeR'), h0 ? h0.resolutionPct.toFixed(2) + '%' : '—'],
      [this.T('info.hpgeFwhm'), h0 ? h0.fwhm.toFixed(2) + ' keV' : '—'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._featBody.innerHTML = '';
    const items = [
      { cls: 'res', title: this.T('features.resolution'), body: this.T('features.resolutionBody') },
      { cls: 'cool', title: this.T('features.cooling'), body: this.T('features.coolingBody') },
      { cls: 'cost', title: this.T('features.cost'), body: this.T('features.costBody') },
      { cls: 'use', title: this.T('features.use'), body: this.T('features.useBody') },
    ];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const row = el('div', 'hpge-feat ' + it.cls);
      row.appendChild(el('div', 'hpge-feat-title', it.title));
      row.appendChild(el('div', 'hpge-feat-body', it.body));
      this._featBody.appendChild(row);
    }
  }

  unmount() {
    clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'hpge_vs_nai',
  icon: '💎',
  navKey: 'modules.hpge_vs_nai.navTitle',
  titleKey: 'modules.hpge_vs_nai.title',
  descKey: 'modules.hpge_vs_nai.desc',
  create: function (ctx) { return new HpgeVsNaiInstance(ctx); },
};
