import { AtomicBombScene2D } from './scene2d.js';
import { AtomicBombScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { TYPES, kEff, assemblyStatus, statusPlain } from './physics.js';

class AtomicBombInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { typeId: 'gun', speed: 0.7, compress: 0.55, boost: 0.4 };
  }
  T(k, v) { return this.t('modules.atomic_bomb.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear');
    this.viewport = el('div', 'viewport ab-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel');
    this.panel.appendChild(principleCard(this.t, 'modules.atomic_bomb'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._teach());
    this._rail = el('div', 'panel-rail');
    this._rail.appendChild(this.panel);
    root.appendChild(this._rail);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new AtomicBombScene2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new AtomicBombScene3D(host);
        s.setParams(self.state);
        s.setActive(true);
        s.applyTips(loadModuleTips('modules.atomic_bomb', self.t));
        if (s.camera) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () { return s.getPickables(); },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && s2.setActive) s2.setActive(mode === '2d');
        if (s3 && s3.setActive) {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self.state);
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(function () {
      if (self.dual) self.dual.tick(0.04);
      self._refreshInfo();
    }, 40);
    setTimeout(function () { if (self.dual) self.dual.resize(); }, 80);
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));
    const row = el('div', 'param');
    row.appendChild(el('label', null, this.T('controls.type')));
    const chips = el('div', 'chips');
    this._chips = {};
    TYPES.forEach(function (tp) {
      const b = el('button', 'chip' + (self.state.typeId === tp.id ? ' active' : ''), self.T('controls.types.' + tp.id));
      b.onclick = function () {
        self.state.typeId = tp.id;
        Object.keys(self._chips).forEach(function (id) {
          self._chips[id].classList.toggle('active', id === tp.id);
        });
        self._refresh();
      };
      self._chips[tp.id] = b;
      chips.appendChild(b);
    });
    row.appendChild(chips);
    row.appendChild(el('div', 'param-help', this.T('controls.typeHelp')));
    card.appendChild(row);

    this._speed = paramSlider(card, {
      label: this.T('controls.speed'), min: 0.15, max: 1, step: 0.01,
      value: this.state.speed, unit: '', decimals: 2,
      help: this.T('controls.speedHelp'),
      onInput: function (v) { self.state.speed = v; self._refresh(); },
    });
    this._compHost = el('div', '');
    card.appendChild(this._compHost);
    this._comp = paramSlider(this._compHost, {
      label: this.T('controls.compress'), min: 0, max: 1, step: 0.01,
      value: this.state.compress, unit: '', decimals: 2,
      help: this.T('controls.compressHelp'),
      onInput: function (v) { self.state.compress = v; self._refresh(); },
    });
    this._boostHost = el('div', '');
    card.appendChild(this._boostHost);
    this._boost = paramSlider(this._boostHost, {
      label: this.T('controls.boost'), min: 0, max: 1, step: 0.01,
      value: this.state.boost, unit: '', decimals: 2,
      help: this.T('controls.boostHelp'),
      onInput: function (v) { self.state.boost = v; self._refresh(); },
    });
    const btns = el('div', 'qc-actions');
    const fire = el('button', 'btn primary', this.T('controls.fire'));
    fire.onclick = function () { self.dual.setParams({ fire: true }); self._refresh(); };
    const reset = el('button', 'btn', this.T('controls.reset'));
    reset.onclick = function () { self.dual.setParams({ reset: true }); };
    btns.append(fire, reset);
    card.appendChild(btns);
    this._infoHost = el('div', 'eq-info');
    card.appendChild(this._infoHost);
    this._refresh();
    this._refreshInfo();
    return card;
  }

  _teach() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    ['t1', 't2', 't3', 't4'].forEach((k) => {
      card.appendChild(el('p', 'param-help', this.T('teach.' + k)));
    });
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    if (this._compHost) {
      const gun = this.state.typeId === 'gun';
      const boosted = this.state.typeId === 'boosted';
      this._compHost.style.display = gun ? 'none' : '';
      this._boostHost.style.display = boosted ? '' : 'none';
    }
    this._refreshInfo();
  }

  _refreshInfo() {
    if (!this._infoHost) return;
    let u = 1;
    if (this.dual && this.dual.scene2d && this.dual.scene2d.u != null) u = this.dual.scene2d.u;
    if (this.dual && this.dual.scene3d && this.dual.scene3d.u != null) {
      const mode = this.dual.mode;
      if (mode === '3d') u = this.dual.scene3d.u;
    }
    const k = kEff(this.state.typeId, u, this.state.compress, this.state.boost);
    this._infoHost.replaceChildren(infoTable([
      [this.T('info.type'), this.T('controls.types.' + this.state.typeId)],
      [this.T('info.know'), k.toFixed(2)],
      [this.T('info.status'), this.T('status.' + assemblyStatus(k))],
      [this.T('info.meaning'), statusPlain(k)],
    ]));
  }

  unmount() {
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: 'atomic_bomb',
  icon: '💣',
  navKey: 'modules.atomic_bomb.navTitle',
  titleKey: 'modules.atomic_bomb.title',
  descKey: 'modules.atomic_bomb.desc',
  create: function (ctx) { return new AtomicBombInstance(ctx); },
};
