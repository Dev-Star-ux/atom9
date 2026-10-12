import { PetCoincidence2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { rates } from './physics.js';

class PetCoincidenceInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      activityMBq: 40,
      windowNs: 12,
      geometry: 0.012,
    };
  }

  T(k, v) { return this.t('modules.pet_coincidence.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-petc');
    this.viewport = el('div', 'viewport petc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel petc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.pet_coincidence'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.scene = new PetCoincidence2D(this.viewport);
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

    paramSlider(card, {
      label: this.T('controls.activity'),
      min: 5, max: 200, step: 5, value: this.state.activityMBq, unit: ' MBq',
      help: this.T('controls.activityHelp'),
      onInput: function (v) {
        self.state.activityMBq = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.window'),
      min: 2, max: 40, step: 1, value: this.state.windowNs, unit: ' ns',
      help: this.T('controls.windowHelp'),
      onInput: function (v) {
        self.state.windowNs = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.geometry'),
      min: 0.004, max: 0.04, step: 0.002, value: this.state.geometry, unit: '',
      decimals: 3,
      help: this.T('controls.geometryHelp'),
      onInput: function (v) {
        self.state.geometry = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card petc-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'petc-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const r = rates(this.state.activityMBq, this.state.windowNs, this.state.geometry);
    const rows = [
      [this.T('info.activity'), this.state.activityMBq + ' MBq'],
      [this.T('info.window'), this.state.windowNs + ' ns'],
      [this.T('info.true'), r.trueRate.toFixed(0) + ' /s'],
      [this.T('info.scatter'), r.scatterRate.toFixed(0) + ' /s'],
      [this.T('info.random'), r.randomRate.toFixed(0) + ' /s'],
      [this.T('info.trueFrac'), (100 * r.trueFrac).toFixed(1) + '%'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'petc-feat');
      row.appendChild(el('div', 'petc-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'pet_coincidence',
  icon: '💊',
  navKey: 'modules.pet_coincidence.navTitle',
  titleKey: 'modules.pet_coincidence.title',
  descKey: 'modules.pet_coincidence.desc',
  create: function (ctx) { return new PetCoincidenceInstance(ctx); },
};
