import { MassSpecScene } from './scene3d.js';
import { MassSpec2D } from './scene2d.js';
import { SpectrumClassifier } from './classifier.js';
import { ELEMENTS, ELEMENT_NAMES, spectrumVector, binToMass, M_MIN, M_MAX, BINS } from './physics.js';
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips } from '../common/sceneChrome.js';

function wrapMassParams(scene) {
  const orig = scene.setParams.bind(scene);
  scene.setParams = function (a, b) {
    if (a != null && typeof a === 'object' && b == null) {
      const V = a.V != null ? a.V : scene.V;
      const B = a.B != null ? a.B : scene.B;
      orig(V, B);
      if (a.elementName) scene.setElement(a.elementName);
      if (a.ionCount != null && typeof scene.setIonCount === 'function') scene.setIonCount(a.ionCount);
    } else {
      orig(a, b);
    }
  };
  return scene;
}

class MassSpecInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.clf = new SpectrumClassifier();
    this.trueName = 'Chlorine (Cl)';
    this.observed = null;
    this.result = null;
    this.revealed = false;
    this.V = 2e3;
    this.B = 1;
    this.noise = 0.07;
    this.ionCount = 8;
  }

  T(k, v) {
    return this.t('modules.mass_spec.' + k, v);
  }

  mount(root) {
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport');
    this.hint = el('div', 'hint', this.T('hint'));
    this.viewport.appendChild(this.hint);
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.mass_spec'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    sceneLegend(this.viewport, this.t('common.legend'), [
      { color: '#ffd27f', label: this.T('legend.source') },
      { color: '#22d3ee', label: this.T('legend.ion') },
      { color: '#2fe0d0', label: this.T('legend.detector') },
    ]);
    this._buildFlowGuide();

    const self = this;
    const labels = {
      source: this.T('scene.source'),
      beam: this.T('scene.beam'),
      magnet: this.T('scene.magnet'),
      detector: this.T('scene.detector'),
      light: this.T('scene.light'),
      heavy: this.T('scene.heavy'),
    };

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = wrapMassParams(new MassSpec2D(host));
        s.setLabels(labels);
        s.setIonCount(self.ionCount);
        s.setParams(self.V, self.B);
        s.setElement(self.trueName);
        return s;
      },
      create3D: function (host) {
        const s = wrapMassParams(new MassSpecScene(host));
        s.setLabels(labels);
        if (typeof s.applyTips === 'function') {
          s.applyTips(loadModuleTips('modules.mass_spec', self.t));
        }
        s.setIonCount(self.ionCount);
        s.setParams(self.V, self.B);
        s.setElement(self.trueName);
        return s;
      },
      onModeChange: function (mode) {
        if (self._apBtn) {
          self._apBtn.style.display = mode === '3d' ? '' : 'none';
        }
      },
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);

    this._apparatusOn = true;
    this._apBtn = el('button', 'viewport-btn apparatus-btn', this.T('controls.hideApparatus'));
    this._apBtn.style.display = this.dual.mode === '3d' ? '' : 'none';
    this._apBtn.onclick = function () {
      self._apparatusOn = !self._apparatusOn;
      const s3 = self.dual.scene3d;
      if (s3 && typeof s3.setApparatusVisible === 'function') {
        s3.setApparatusVisible(self._apparatusOn);
      }
      self._apBtn.textContent = self._apparatusOn
        ? self.T('controls.hideApparatus')
        : self.T('controls.showApparatus');
    };
    this.viewport.appendChild(this._apBtn);

    this._resize = function () {
      self.dual.resize();
      self._drawSpectrum();
    };
    window.addEventListener('resize', this._resize);
    this._newSample({ logger: this._ai.logger });
  }

  _buildFlowGuide() {
    const flow = el('div', 'scene-flow');
    const steps = ['flow.sample', 'flow.ionise', 'flow.bend', 'flow.detect'];
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) flow.appendChild(el('span', 'flow-arrow', '→'));
      flow.appendChild(el('span', 'flow-step', this.T(steps[i])));
    }
    this.viewport.appendChild(flow);
  }

  _syncScenes() {
    this.dual.setParams({ V: this.V, B: this.B, ionCount: this.ionCount, elementName: this.trueName });
    const s2 = this.dual.scene2d;
    const s3 = this.dual.scene3d;
    if (s2) {
      if (typeof s2.setIonCount === 'function') s2.setIonCount(this.ionCount);
      if (typeof s2.setElement === 'function') s2.setElement(this.trueName);
      if (typeof s2.setParams === 'function') s2.setParams(this.V, this.B);
    }
    if (s3) {
      if (typeof s3.setIonCount === 'function') s3.setIonCount(this.ionCount);
      if (typeof s3.setElement === 'function') s3.setElement(this.trueName);
      if (typeof s3.setParams === 'function') s3.setParams(this.V, this.B);
    }
  }

  _buildParamCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    paramSlider(card, {
      label: this.T('controls.ionCount'),
      unit: '',
      min: 1,
      max: 120,
      step: 1,
      value: this.ionCount,
      decimals: 0,
      help: this.T('controls.ionCountHelp'),
      onInput: (v) => {
        this.ionCount = v;
        this._syncScenes();
      },
    });
    paramSlider(card, {
      label: this.T('controls.voltage'),
      unit: ' V',
      min: 1500,
      max: 2500,
      step: 50,
      value: this.V,
      help: this.T('controls.voltageHelp'),
      onInput: (v) => {
        this.V = v;
        this._syncScenes();
      },
    });
    paramSlider(card, {
      label: this.T('controls.field'),
      unit: ' T',
      min: 0.7,
      max: 1.5,
      step: 0.05,
      value: this.B,
      decimals: 2,
      help: this.T('controls.fieldHelp'),
      onInput: (v) => {
        this.B = v;
        this._syncScenes();
      },
    });
    paramSlider(card, {
      label: this.T('controls.noise'),
      unit: '',
      min: 0,
      max: 0.14,
      step: 0.01,
      value: this.noise,
      decimals: 2,
      onInput: (v) => {
        this.noise = v;
        this.observed = spectrumVector(this.trueName, { noise: this.noise });
        this._drawSpectrum();
      },
    });
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.mass_spec', {
      onCollect: ({ logger }) => this._newSample({ logger: logger }),
      onToggleFind: ({ logger }) => this._analyze({ logger: logger }),
      showLossPlot: false,
    }, aiHowBlock);
    this._ai.collectBtn.textContent = this.T('ai.newSample');
    this._ai.findBtn.textContent = this.T('ai.analyze');
    this._ai.findBtn.disabled = false;
    this._ai.findBtn.classList.add('primary');
    const logBtn = this._ai.card.querySelector('.ai-log-btn');
    const specLabel = el('div', 'field-label', this.T('ai.spectrum'));
    this._spec = el('canvas', 'ai-plot massspec-chart');
    this._spec.width = 320;
    this._spec.height = 260;
    this._ai.card.insertBefore(specLabel, logBtn);
    this._ai.card.insertBefore(this._spec, logBtn);
    const confLabel = el('div', 'field-label', this.T('ai.confidence'));
    this._conf = el('div', 'conf');
    this._verdict = el('div', 'ai-true', '—');
    this._ai.card.insertBefore(confLabel, logBtn);
    this._ai.card.insertBefore(this._conf, logBtn);
    this._ai.card.insertBefore(this._verdict, logBtn);
    return this._ai.card;
  }

  _newSample(opts) {
    const logger = opts && opts.logger;
    this.trueName = ELEMENT_NAMES[Math.floor(Math.random() * ELEMENT_NAMES.length)];
    this.observed = spectrumVector(this.trueName, { noise: this.noise });
    this._syncScenes();
    this.result = null;
    this.revealed = false;
    this._verdict.textContent = this.T('ai.unknown');
    this._ai.findBtn.disabled = false;
    this._drawSpectrum();
    this._drawConfidence([]);
    if (logger) {
      logger.data('New sample loaded (element hidden from AI)');
      logger.info('Detector noise σ=' + (this.noise * 100).toFixed(0) + '%, ' + BINS + ' mass bins');
    }
    this._ai.refreshLogs();
  }

  _analyze(opts) {
    const logger = opts && opts.logger;
    this.result = this.clf.classify(this.observed);
    this.revealed = true;
    const top = this.result[0];
    const right = top.name === this.trueName;
    this._verdict.innerHTML =
      this.T('ai.aiSays') + ': <b>' + top.name + '</b> (' + (top.prob * 100).toFixed(0) + '%) — ' +
      (right ? '✓ ' : '✗ ') + this.T('ai.actual') + ': ' + this.trueName;
    this._drawConfidence(this.result);
    this._drawSpectrum();
    if (logger) {
      logger.step('Top match: ' + top.name + ' (' + (top.prob * 100).toFixed(1) + '% confidence)');
      for (let i = 0; i < Math.min(5, this.result.length); i++) {
        const r = this.result[i];
        logger.step('  ' + r.name + ': ' + (r.prob * 100).toFixed(1) + '%');
      }
      if (right) logger.ok('Correct — actual element is ' + this.trueName);
      else logger.warn('Mismatch — actual element is ' + this.trueName);
    }
    this._ai.refreshLogs();
  }

  _massToX(m, padL, plotW, mLo, mHi) {
    const lo = mLo != null ? mLo : M_MIN;
    const hi = mHi != null ? mHi : M_MAX;
    return padL + plotW * (m - lo) / Math.max(1e-6, hi - lo);
  }

  /** Zoom mass axis around detector signal so isotope peaks are easier to classify. */
  _massWindow() {
    let lo = M_MAX;
    let hi = M_MIN;
    for (let b = 0; b < BINS; b++) {
      if (this.observed[b] > 0.06) {
        const m = binToMass(b);
        if (m < lo) lo = m;
        if (m > hi) hi = m;
      }
    }
    if (!(lo <= hi)) return { lo: M_MIN, hi: M_MAX };
    const span = Math.max(8, hi - lo);
    const pad = Math.max(5, span * 0.45);
    return {
      lo: Math.max(M_MIN, Math.floor(lo - pad)),
      hi: Math.min(M_MAX, Math.ceil(hi + pad)),
    };
  }

  _drawSpectrum() {
    if (!this._spec || !this.observed) return;
    const c = this._spec.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this._spec.clientWidth || 320;
    const cssH = Math.max(240, Math.round(cssW * 0.78));
    if (this._spec.width !== Math.round(cssW * dpr) || this._spec.height !== Math.round(cssH * dpr)) {
      this._spec.width = Math.round(cssW * dpr);
      this._spec.height = Math.round(cssH * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cssW;
    const H = cssH;
    const padL = 40;
    const padR = 12;
    const padT = 22;
    const padB = 36;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const win = this._massWindow();
    const mLo = win.lo;
    const mHi = win.hi;

    c.fillStyle = '#0a1122';
    c.fillRect(0, 0, W, H);

    const span = mHi - mLo;
    const majorStep = span <= 20 ? 2 : span <= 40 ? 5 : 10;
    const minorStep = majorStep <= 2 ? 1 : majorStep === 5 ? 1 : 5;
    c.textAlign = 'center';
    for (let m = Math.ceil(mLo / minorStep) * minorStep; m <= mHi; m += minorStep) {
      const x = this._massToX(m, padL, plotW, mLo, mHi);
      const isMajor = m % majorStep === 0;
      c.beginPath();
      c.moveTo(x, padT);
      c.lineTo(x, padT + plotH);
      c.strokeStyle = isMajor ? 'rgba(128,146,180,0.22)' : 'rgba(128,146,180,0.08)';
      c.stroke();
      if (isMajor) {
        c.fillStyle = '#a8b8d4';
        c.font = '600 11px system-ui';
        c.fillText(String(m), x, padT + plotH + 14);
      }
    }

    const isos = ELEMENTS[this.trueName] || [];
    for (let i = 0; i < isos.length; i++) {
      const m = isos[i].m;
      if (m < mLo || m > mHi) continue;
      const x = this._massToX(m, padL, plotW, mLo, mHi);
      c.strokeStyle = 'rgba(34,211,238,0.4)';
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(x, padT);
      c.lineTo(x, padT + plotH);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(34,211,238,0.95)';
      c.font = '700 12px system-ui';
      c.textAlign = 'center';
      c.fillText(String(m), x, padT - 6);
    }

    const binsInView = Math.max(8, BINS * (mHi - mLo) / (M_MAX - M_MIN));
    const barW = Math.max(3, plotW / binsInView * 0.85);
    for (let b = 0; b < BINS; b++) {
      const m = binToMass(b);
      if (m < mLo || m > mHi) continue;
      const x = this._massToX(m, padL, plotW, mLo, mHi);
      const h = plotH * this.observed[b];
      if (h < 0.5) continue;
      c.fillStyle = '#22d3ee';
      c.fillRect(x - barW / 2, padT + plotH - h, barW, h);
    }

    c.strokeStyle = 'rgba(128,146,180,0.5)';
    c.beginPath();
    c.moveTo(padL, padT);
    c.lineTo(padL, padT + plotH);
    c.lineTo(padL + plotW, padT + plotH);
    c.stroke();

    c.fillStyle = '#8092b4';
    c.font = '11px system-ui';
    c.textAlign = 'center';
    c.fillText(this.T('chart.massAxis') + '  (m/z ' + mLo + '\u2013' + mHi + ')', padL + plotW / 2, H - 6);
  }

  _drawConfidence(res) {
    this._conf.innerHTML = '';
    const list = res.length ? res : ELEMENT_NAMES.map(function (name) { return { name: name, prob: 0 }; });
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const row = el('div', 'conf-row');
      row.appendChild(el('span', 'conf-name', r.name));
      const barWrap = el('div', 'conf-bar');
      const bar = el('div', 'conf-fill');
      bar.style.width = (r.prob * 100).toFixed(0) + '%';
      if (this.revealed && this.result && r.name === this.result[0].name) bar.classList.add('top');
      barWrap.appendChild(bar);
      row.appendChild(barWrap);
      row.appendChild(el('span', 'conf-pct', (r.prob * 100).toFixed(0) + '%'));
      this._conf.appendChild(row);
    }
  }

  unmount() {
    if (this._resize) window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'mass_spec',
  icon: '🧲',
  navKey: 'modules.mass_spec.navTitle',
  titleKey: 'modules.mass_spec.title',
  descKey: 'modules.mass_spec.desc',
  create(ctx) {
    return new MassSpecInstance(ctx);
  },
};
