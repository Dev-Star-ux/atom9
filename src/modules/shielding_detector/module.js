import { ShieldingDetector2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import {
  MATERIALS,
  RAD_KINDS,
  getMaterial,
  getRadKind,
  transmission,
  countRate,
  hvlCm,
  muCm,
} from './physics.js';

class ShieldingDetectorInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      materialId: 'lead',
      radId: 'gamma',
      thicknessCm: 2,
      I0: 1000,
    };
  }

  T(k, v) { return this.t('modules.shielding_detector.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-shield');
    this.viewport = el('div', 'viewport shield-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel shield-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.shielding_detector'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.scene = new ShieldingDetector2D(this.viewport);
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

    card.appendChild(el('div', 'field-label', this.T('controls.radiation')));
    const radChips = el('div', 'chips');
    RAD_KINDS.forEach(function (r) {
      const b = el('button', 'chip' + (self.state.radId === r.id ? ' active' : ''), r.name + ' ' + r.label);
      b.onclick = function () {
        self.state.radId = r.id;
        radChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      radChips.appendChild(b);
    });
    card.appendChild(radChips);

    card.appendChild(el('div', 'field-label', this.T('controls.material')));
    const matChips = el('div', 'chips');
    MATERIALS.forEach(function (m) {
      const b = el('button', 'chip' + (self.state.materialId === m.id ? ' active' : ''), m.name);
      b.onclick = function () {
        self.state.materialId = m.id;
        matChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      matChips.appendChild(b);
    });
    card.appendChild(matChips);

    paramSlider(card, {
      label: this.T('controls.thickness'),
      min: 0, max: 20, step: 0.2, value: this.state.thicknessCm, unit: ' cm',
      decimals: 1,
      help: this.T('controls.thicknessHelp'),
      onInput: function (v) {
        self.state.thicknessCm = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.I0'),
      min: 100, max: 5000, step: 50, value: this.state.I0, unit: ' /s',
      onInput: function (v) {
        self.state.I0 = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card shield-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'shield-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const mat = getMaterial(this.state.materialId);
    const rad = getRadKind(this.state.radId);
    const T = transmission(this.state.materialId, this.state.radId, this.state.thicknessCm);
    const rate = countRate(this.state.I0, this.state.materialId, this.state.radId, this.state.thicknessCm);
    const hvl = hvlCm(this.state.materialId, this.state.radId);
    const mu = muCm(this.state.materialId, this.state.radId);
    const rows = [
      [this.T('info.radiation'), rad.label],
      [this.T('info.material'), mat.name],
      [this.T('info.mu'), mu.toFixed(3) + ' cm⁻¹'],
      [this.T('info.T'), (100 * T).toFixed(2) + '%'],
      [this.T('info.rate'), rate.toFixed(1) + ' /s'],
      [this.T('info.hvl'), isFinite(hvl) ? hvl.toFixed(2) + ' cm' : '—'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'shield-feat');
      row.appendChild(el('div', 'shield-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'shielding_detector',
  icon: '🛡',
  navKey: 'modules.shielding_detector.navTitle',
  titleKey: 'modules.shielding_detector.title',
  descKey: 'modules.shielding_detector.desc',
  create: function (ctx) { return new ShieldingDetectorInstance(ctx); },
};
