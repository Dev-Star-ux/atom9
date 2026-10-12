import { DecayChain2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { CHAIN } from './physics.js';

class DecayChainInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { tYears: 0 };
  }

  T(k, v) { return this.t('modules.decay_chain.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport dc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel dc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.decay_chain'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.scene = new DecayChain2D(this.viewport);
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
      label: this.T('controls.time'),
      min: 0, max: 8000, step: 50, value: this.state.tYears, unit: 'y',
      onInput: function (v) { self.state.tYears = v; self._refresh(); },
    });
    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const rows = [
      [this.T('info.steps'), String(CHAIN.length)],
      [this.T('info.radon'), '²²²Rn (3.8 d)'],
      [this.T('info.stable'), '²⁰⁶Pb endpoint'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info-table') || this._infoHost;
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'decay_chain',
  icon: '🔗',
  navKey: 'decay_chain',
  titleKey: 'modules.decay_chain.title',
  descKey: 'modules.decay_chain.desc',
  create: function (ctx) { return new DecayChainInstance(ctx); },
};
