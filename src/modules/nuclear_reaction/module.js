import { Reaction2D } from './scene2d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { PROJECTILES, TARGETS, getSpecies } from './reactionsData.js';
import { analyzePair, labelOf } from './physics.js';

class NuclearReactionInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      projectile: 'n',
      target: 'U-235',
      energyMeV: 2,
      selectedIndex: 0,
    };
    this._analyses = [];
  }

  T(k, v) { return this.t('modules.nuclear_reaction.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-nr');
    this.viewport = el('div', 'viewport nr-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel nr-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.nuclear_reaction'));
    this.panel.appendChild(this._buildParamCard());
    this._resultsCard = this._buildResultsCard();
    this.panel.appendChild(this._resultsCard);
    root.appendChild(this.panel);

    this.scene = new Reaction2D(this.viewport);
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

    card.appendChild(el('div', 'field-label', this.T('controls.projectile')));
    this._projBox = el('div', 'chips');
    PROJECTILES.forEach(function (p) {
      const b = el('button', 'chip' + (p.id === self.state.projectile ? ' active' : ''), p.label);
      b.onclick = function () {
        self.state.projectile = p.id;
        self.state.selectedIndex = 0;
        self._syncProj();
        self._refresh(true);
      };
      self._projBox.appendChild(b);
    });
    card.appendChild(this._projBox);

    card.appendChild(el('div', 'field-label', this.T('controls.target')));
    this._tgtBox = el('div', 'chips nr-target-chips');
    TARGETS.forEach(function (id) {
      const s = getSpecies(id);
      const b = el('button', 'chip' + (id === self.state.target ? ' active' : ''), s ? s.label : id);
      b.title = s ? s.name : id;
      b.onclick = function () {
        self.state.target = id;
        self.state.selectedIndex = 0;
        self._syncTgt();
        self._refresh(true);
      };
      self._tgtBox.appendChild(b);
    });
    card.appendChild(this._tgtBox);

    this._energyHost = el('div', '');
    card.appendChild(this._energyHost);
    this._buildEnergySlider();

    const presets = el('div', 'chips');
    [
      { label: this.T('controls.thermal'), e: 0.000025 },
      { label: '100 keV', e: 0.1 },
      { label: '2 MeV', e: 2 },
      { label: '14 MeV', e: 14 },
    ].forEach(function (pr) {
      const b = el('button', 'chip', pr.label);
      b.onclick = function () {
        self.state.energyMeV = pr.e;
        self._buildEnergySlider();
        self._refresh(false);
      };
      presets.appendChild(b);
    });
    card.appendChild(el('div', 'field-label', this.T('controls.energyPresets')));
    card.appendChild(presets);

    const fire = el('button', 'btn primary', this.T('controls.fire'));
    fire.type = 'button';
    fire.style.marginTop = '8px';
    fire.onclick = function () { self._fire(); };
    card.appendChild(fire);

    return card;
  }

  _buildEnergySlider() {
    const self = this;
    this._energyHost.innerHTML = '';
    const e = this.state.energyMeV;
    const useFine = e > 0 && e < 0.5;
    paramSlider(this._energyHost, {
      label: this.T('controls.energy'),
      unit: ' MeV',
      min: useFine ? 0 : 0,
      max: useFine ? 0.5 : 20,
      step: useFine ? 0.001 : 0.05,
      value: Math.min(useFine ? 0.5 : 20, e),
      decimals: useFine ? 4 : 2,
      help: this.T('controls.energyHelp'),
      onInput: function (v) {
        self.state.energyMeV = v;
        self._refresh(false);
      },
    });
  }

  _buildResultsCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('results.title')));
    this._channelBox = el('div', 'nr-channels');
    card.appendChild(this._channelBox);
    this._infoHost = el('div', 'nr-info-host');
    this._info = infoTable([]);
    this._infoHost.appendChild(this._info);
    card.appendChild(this._infoHost);
    this._cons = el('div', 'nr-cons');
    card.appendChild(this._cons);
    this._note = el('p', 'param-help', '');
    card.appendChild(this._note);
    return card;
  }

  _syncProj() {
    for (let i = 0; i < PROJECTILES.length; i++) {
      this._projBox.children[i].classList.toggle('active', PROJECTILES[i].id === this.state.projectile);
    }
  }

  _syncTgt() {
    for (let i = 0; i < TARGETS.length; i++) {
      this._tgtBox.children[i].classList.toggle('active', TARGETS[i] === this.state.target);
    }
  }

  _fire() {
    if (this.scene) {
      this.scene.setParams({
        projectile: this.state.projectile,
        target: this.state.target,
        energyMeV: this.state.energyMeV,
        analyses: this._analyses,
        selectedIndex: this.state.selectedIndex,
        fire: true,
      });
    }
  }

  _refresh(rebuildSlider) {
    this._analyses = analyzePair(this.state.projectile, this.state.target, this.state.energyMeV);
    if (this.state.selectedIndex >= this._analyses.length) this.state.selectedIndex = 0;

    this._renderChannels();
    this._renderInfo();

    if (this.scene) {
      this.scene.setParams({
        projectile: this.state.projectile,
        target: this.state.target,
        energyMeV: this.state.energyMeV,
        analyses: this._analyses,
        selectedIndex: this.state.selectedIndex,
      });
    }
  }

  _renderChannels() {
    const self = this;
    this._channelBox.innerHTML = '';
    if (!this._analyses.length) {
      this._channelBox.appendChild(el('p', 'nr-empty', this.T('results.none')));
      return;
    }
    this._channelBox.appendChild(el('div', 'field-label', this.T('results.channels')));
    const list = el('div', 'nr-channel-list');
    this._analyses.forEach(function (a, idx) {
      const btn = el('button', 'nr-channel' + (idx === self.state.selectedIndex ? ' active' : ''));
      btn.type = 'button';
      const status = a.open
        ? '<span class="nr-badge open">' + self.T('results.open') + '</span>'
        : '<span class="nr-badge closed">' + self.T('results.closed') + '</span>';
      btn.innerHTML =
        '<div class="nr-ch-title">' + a.reaction.title + status + '</div>' +
        '<div class="nr-ch-eq">' +
        labelOf(self.state.projectile) + ' + ' + labelOf(self.state.target) + ' → ' +
        a.products.map(function (p) { return p.label; }).join(' + ') +
        '</div>' +
        '<div class="nr-ch-meta">Q = ' + a.Q.toFixed(2) + ' MeV · E_th ≈ ' + a.Eth.toFixed(2) + ' MeV</div>';
      btn.onclick = function () {
        self.state.selectedIndex = idx;
        self._refresh(false);
        self._fire();
      };
      list.appendChild(btn);
    });
    this._channelBox.appendChild(list);
  }

  _renderInfo() {
    const a = this._analyses[this.state.selectedIndex];
    if (!a) {
      const empty = infoTable([
        [this.T('results.products'), '—'],
        [this.T('results.q'), '—'],
        [this.T('results.eth'), '—'],
        [this.T('results.eavail'), '—'],
      ]);
      this._infoHost.innerHTML = '';
      this._infoHost.appendChild(empty);
      this._info = empty;
      this._cons.innerHTML = '';
      this._note.textContent = this.T('results.none');
      return;
    }

    const prod = a.products.map(function (p) { return p.label + ' (' + p.name + ')'; }).join(', ');
    const next = infoTable([
      [this.T('results.type'), a.reaction.type],
      [this.T('results.products'), prod],
      [this.T('results.q'), a.Q.toFixed(3) + ' MeV' + (a.exoergic ? ' (exoergic)' : a.endoergic ? ' (endoergic)' : '')],
      [this.T('results.eth'), a.Eth.toFixed(3) + ' MeV'],
      [this.T('results.eavail'), a.energyAvailable.toFixed(3) + ' MeV'],
      [this.T('results.status'), a.open ? this.T('results.open') : this.T('results.closed')],
    ]);
    this._infoHost.innerHTML = '';
    this._infoHost.appendChild(next);
    this._info = next;

    const c = a.conservation;
    this._cons.innerHTML = '';
    this._cons.appendChild(el('div', 'field-label', this.T('results.conservation')));
    const row = el('div', 'nr-cons-row');
    row.appendChild(this._consPill('Z', c.ZIn + ' → ' + c.ZOut, c.zOk));
    row.appendChild(this._consPill('A', c.AIn + ' → ' + c.AOut, c.aOk));
    row.appendChild(this._consPill('E', a.open ? '≥ E_th' : '< E_th', a.open));
    this._cons.appendChild(row);

    this._note.textContent = a.reaction.note || '';
  }

  _consPill(label, value, ok) {
    const pill = el('div', 'nr-pill' + (ok ? ' ok' : ' bad'));
    pill.appendChild(el('span', 'nr-pill-k', label));
    pill.appendChild(el('span', 'nr-pill-v', value + (ok ? ' ✓' : ' ✗')));
    return pill;
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.scene) this.scene.dispose();
  }
}

export default {
  id: 'nuclear_reaction',
  icon: '💥',
  group: 'nuclear',
  navKey: 'modules.nuclear_reaction.navTitle',
  titleKey: 'modules.nuclear_reaction.title',
  descKey: 'modules.nuclear_reaction.desc',
  create: function (ctx) {
    return new NuclearReactionInstance(ctx);
  },
};
