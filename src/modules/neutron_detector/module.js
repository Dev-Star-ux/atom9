import { NeutronDetector2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import {
  DETECTORS,
  getDetector,
  moderatedCountRate,
  moderatedEfficiency,
  energyLabel,
} from './physics.js';

class NeutronDetectorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      detectorId: 'he3',
      energyLog10: -1.6,
      flux: 1,
      strength: 1,
      moderated: false,
      wallEffect: true,
    };
  }

  T(k, v) { return this.t('modules.neutron_detector.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-nDet');
    this.viewport = el('div', 'viewport nDet-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel nDet-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.neutron_detector'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.scene = new NeutronDetector2D(this.viewport);
    this.scene.setParams(this.state);
    wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    card.appendChild(el('div', 'field-label', this.T('controls.detector')));
    const chips = el('div', 'chips');
    DETECTORS.forEach(function (d) {
      const b = el('button', 'chip' + (self.state.detectorId === d.id ? ' active' : ''), d.name);
      b.onclick = function () {
        self.state.detectorId = d.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    this._detNote = el('div', 'param-help', '');
    card.appendChild(this._detNote);

    paramSlider(card, {
      label: this.T('controls.energy'),
      min: -2.5, max: 6.5, step: 0.1, value: this.state.energyLog10, unit: '',
      decimals: 1,
      help: this.T('controls.energyHelp'),
      onInput: function (v) {
        self.state.energyLog10 = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.flux'),
      min: 0.2, max: 3, step: 0.1, value: this.state.flux, unit: '×',
      decimals: 1,
      onInput: function (v) {
        self.state.flux = v;
        self._refresh();
      },
    });

    card.appendChild(el('div', 'field-label', this.T('controls.options')));
    const optChips = el('div', 'chips');
    const modBtn = el('button', 'chip' + (this.state.moderated ? ' active' : ''), this.T('controls.moderated'));
    modBtn.onclick = function () {
      self.state.moderated = !self.state.moderated;
      modBtn.classList.toggle('active', self.state.moderated);
      self._refresh();
    };
    const wallBtn = el('button', 'chip' + (this.state.wallEffect ? ' active' : ''), this.T('controls.wallEffect'));
    wallBtn.onclick = function () {
      self.state.wallEffect = !self.state.wallEffect;
      wallBtn.classList.toggle('active', self.state.wallEffect);
      self._refresh();
    };
    optChips.appendChild(modBtn);
    optChips.appendChild(wallBtn);
    card.appendChild(optChips);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card nDet-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'nDet-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const det = getDetector(this.state.detectorId);
    this._detNote.textContent = det.note || '';
    const eff = moderatedEfficiency(this.state.energyLog10, this.state.detectorId, this.state.moderated);
    const rate = moderatedCountRate(this.state.flux, this.state.energyLog10, this.state.detectorId, this.state.strength, this.state.moderated);
    const rows = [
      [this.T('info.detector'), det.name],
      [this.T('info.reaction'), det.reaction],
      [this.T('info.Q'), det.QMeV + ' MeV'],
      [this.T('info.energy'), energyLabel(this.state.energyLog10)],
      [this.T('info.eff'), (100 * eff).toFixed(1) + '% (rel.)'],
      [this.T('info.rate'), rate.toFixed(0) + ' (arb.)'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'nDet-feat');
      row.appendChild(el('div', 'nDet-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'neutron_detector',
  icon: 'n',
  navKey: 'modules.neutron_detector.navTitle',
  titleKey: 'modules.neutron_detector.title',
  descKey: 'modules.neutron_detector.desc',
  create: function (ctx) { return new NeutronDetectorInstance(ctx); },
};
