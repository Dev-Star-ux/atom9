import { LaserPrinter2D } from './scene2d.js';
import { LaserPrinter3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import { contrastV, opticalDensity, fuserOk } from './physics.js';

class LaserPrinterInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      chargeV: 800,
      expResidualV: 100,
      density: 0.35,
      fuserTempC: 195,
    };
  }

  T(k, v) { return this.t('modules.laser_printer.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-lp');
    this.viewport = el('div', 'viewport lp-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel lp-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.laser_printer'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new LaserPrinter2D(host);
        s.setParams(self._sceneParams());
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new LaserPrinter3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.laser_printer', self.t));
        if (s.camera && s.renderer && s.renderer.domElement) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () {
              return typeof s.getPickables === 'function' ? s.getPickables() : [];
            },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && typeof s2.setActive === 'function') s2.setActive(mode === '2d');
        if (s3 && typeof s3.setActive === 'function') {
          s3.setActive(mode === '3d');
          if (mode === '3d') s3.setParams(self._sceneParams());
        }
      },
    });
    this.scene = this.dual;
    wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener('resize', this._resize);
    this.dual.resize();
    this._refresh();
  }

  _sceneParams() {
    return {
      chargeV: this.state.chargeV,
      expResidualV: this.state.expResidualV,
      density: this.state.density,
      fuserTempC: this.state.fuserTempC,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.chargeV'),
      min: 400, max: 1200, step: 10, value: this.state.chargeV, unit: ' V',
      help: this.T('controls.chargeVHelp'),
      onInput: function (v) {
        self.state.chargeV = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.expResidualV'),
      min: 0, max: 300, step: 5, value: this.state.expResidualV, unit: ' V',
      help: this.T('controls.expResidualVHelp'),
      onInput: function (v) {
        self.state.expResidualV = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.density'),
      min: 0, max: 1, step: 0.05, value: this.state.density,
      decimals: 2,
      help: this.T('controls.densityHelp'),
      onInput: function (v) {
        self.state.density = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.fuserTempC'),
      min: 100, max: 260, step: 5, value: this.state.fuserTempC, unit: ' °C',
      help: this.T('controls.fuserTempCHelp'),
      onInput: function (v) {
        self.state.fuserTempC = v;
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card lp-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'lp-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.dual.setParams(this._sceneParams());
    const cV = contrastV(this.state.chargeV, this.state.expResidualV);
    const od = opticalDensity(cV);
    const fOk = fuserOk(this.state.fuserTempC);
    const rows = [
      [this.T('info.contrastV'), cV.toFixed(0) + ' V'],
      [this.T('info.opticalDensity'), (100 * od).toFixed(0) + '%'],
      [this.T('info.fuserStatus'), fOk ? this.T('info.fuserOk') : this.T('info.fuserBad')],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'lp-feat');
      row.appendChild(el('div', 'lp-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'laser_printer',
  icon: '🖨',
  navKey: 'modules.laser_printer.navTitle',
  titleKey: 'modules.laser_printer.title',
  descKey: 'modules.laser_printer.desc',
  create: function (ctx) { return new LaserPrinterInstance(ctx); },
};
