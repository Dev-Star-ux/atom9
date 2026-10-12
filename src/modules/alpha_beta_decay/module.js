import { AlphaBeta2D } from './scene2d.js';
import { el, principleCard, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { SCHEMES, getScheme, modeMeta } from './physics.js';

class AlphaBetaInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { schemeId: 'u238a' };
  }

  T(k, v) { return this.t('modules.alpha_beta_decay.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport abd-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel abd-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.alpha_beta_decay'));
    this.panel.appendChild(this._buildParamCard());
    root.appendChild(this.panel);

    this.scene = new AlphaBeta2D(this.viewport);
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
    card.appendChild(el('div', 'field-label', this.T('controls.scheme')));
    const chips = el('div', 'chips');
    SCHEMES.forEach(function (sc) {
      const b = el('button', 'chip' + (self.state.schemeId === sc.id ? ' active' : ''), sc.name);
      b.onclick = function () {
        self.state.schemeId = sc.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh(true);
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _refresh(reset) {
    this.scene.setParams({ schemeId: this.state.schemeId, reset: !!reset });
    const sc = getScheme(this.state.schemeId);
    const m = modeMeta(sc.mode);
    const rows = [
      [this.T('info.mode'), m.label],
      [this.T('info.Q'), sc.Q + ' MeV'],
      [this.T('info.halfLife'), sc.halfLife],
      [this.T('info.zChange'), (sc.zChange > 0 ? '+' : '') + sc.zChange],
      [this.T('info.nChange'), (sc.nChange > 0 ? '+' : '') + sc.nChange],
      [this.T('info.radiation'), m.particle],
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
  id: 'alpha_beta_decay',
  icon: 'β',
  navKey: 'alpha_beta_decay',
  titleKey: 'modules.alpha_beta_decay.title',
  descKey: 'modules.alpha_beta_decay.desc',
  create: function (ctx) { return new AlphaBetaInstance(ctx); },
};
