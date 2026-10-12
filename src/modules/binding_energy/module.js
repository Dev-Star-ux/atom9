import { BindingEnergy2D } from './scene2d.js';
import { el, principleCard, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { fissionReleaseMeV, fusionReleaseMeV, FISSION_PARENTS, FUSION_PAIR } from './physics.js';

class BindingEnergyInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { mode: 'view', fissionA: 235 };
  }

  T(k, v) { return this.t('modules.binding_energy.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport be-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel be-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.binding_energy'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.scene = new BindingEnergy2D(this.viewport);
    this.scene.setParams(this.state);
    wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh(true);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    card.appendChild(el('div', 'field-label', this.T('controls.mode')));
    const modeChips = el('div', 'chips');
    ['view', 'fission', 'fusion'].forEach(function (m) {
      const b = el('button', 'chip' + (self.state.mode === m ? ' active' : ''), self.T('controls.modes.' + m));
      b.onclick = function () {
        self.state.mode = m;
        modeChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh(true);
      };
      modeChips.appendChild(b);
    });
    card.appendChild(modeChips);

    card.appendChild(el('div', 'field-label', this.T('controls.fissionTarget')));
    const fisChips = el('div', 'chips');
    FISSION_PARENTS.forEach(function (fp) {
      const b = el('button', 'chip' + (self.state.fissionA === fp.A ? ' active' : ''), fp.sym);
      b.onclick = function () {
        self.state.fissionA = fp.A;
        fisChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh(true);
      };
      fisChips.appendChild(b);
    });
    card.appendChild(fisChips);

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh(reset) {
    this.scene.setParams(Object.assign({}, this.state, { reset: !!reset }));
    const fQ = fissionReleaseMeV(this.state.fissionA);
    const fuQ = fusionReleaseMeV(FUSION_PAIR.a1, FUSION_PAIR.a2);
    const rows = [
      [this.T('info.mode'), this.T('controls.modes.' + this.state.mode)],
      [this.T('info.fissionQ'), fQ.toFixed(0) + ' MeV (' + this.state.fissionA + 'U)'],
      [this.T('info.fusionQ'), fuQ.toFixed(1) + ' MeV (D+T→⁴He)'],
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
  id: 'binding_energy',
  icon: 'Δ',
  navKey: 'binding_energy',
  titleKey: 'modules.binding_energy.title',
  descKey: 'modules.binding_energy.desc',
  create: function (ctx) { return new BindingEnergyInstance(ctx); },
};
