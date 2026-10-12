import { PMTScene2D } from './scene2d.js';
import { PMTScene3D } from './scene3d.js';
import { el, principleCard, paramSlider, infoTable } from '../common/ui.js';
import { mountDualView, wireDualPause } from '../common/dualView.js';
import { loadModuleTips, bindSceneTips } from '../common/sceneChrome.js';
import {
  secondaryYield,
  gain,
  photocurrentFromIntensity,
  outputCurrent,
} from './physics.js';

class PMTInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      intensityRel: 0.5,
      quantumEfficiency: 0.25,
      voltagePerStage: 100,
      nStages: 9,
    };
  }

  T(k, v) { return this.t('modules.photomultiplier_tube.' + k, v); }

  mount(root) {
    const self = this;
    root.classList.add('module-nuclear', 'module-pmt');
    this.viewport = el('div', 'viewport pmt-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);
    this.panel = el('div', 'panel pmt-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.photomultiplier_tube'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildTeachCard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: '2d',
      create2D: function (host) {
        const s = new PMTScene2D(host);
        s.setParams(self._sceneParams());
        return s;
      },
      create3D: function (host) {
        const s = new PMTScene3D(host);
        s.setParams(self._sceneParams());
        s.applyTips(loadModuleTips('modules.photomultiplier_tube', self.t));
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
      intensityRel: this.state.intensityRel,
      quantumEfficiency: this.state.quantumEfficiency,
      voltagePerStage: this.state.voltagePerStage,
      nStages: this.state.nStages,
    };
  }

  _buildParamCard() {
    const self = this;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    paramSlider(card, {
      label: this.T('controls.intensity'),
      min: 0, max: 1, step: 0.01, value: this.state.intensityRel,
      decimals: 2,
      help: this.T('controls.intensityHelp'),
      onInput: function (v) {
        self.state.intensityRel = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.qe'),
      min: 0.05, max: 0.5, step: 0.01, value: this.state.quantumEfficiency,
      decimals: 2,
      help: this.T('controls.qeHelp'),
      onInput: function (v) {
        self.state.quantumEfficiency = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.voltage'),
      min: 20, max: 300, step: 5, value: this.state.voltagePerStage, unit: ' V',
      decimals: 0,
      help: this.T('controls.voltageHelp'),
      onInput: function (v) {
        self.state.voltagePerStage = v;
        self._refresh();
      },
    });

    paramSlider(card, {
      label: this.T('controls.nStages'),
      min: 2, max: 14, step: 1, value: this.state.nStages,
      decimals: 0,
      help: this.T('controls.nStagesHelp'),
      onInput: function (v) {
        self.state.nStages = Math.round(v);
        self._refresh();
      },
    });

    this._infoHost = el('div', '');
    card.appendChild(this._infoHost);
    return card;
  }

  _buildTeachCard() {
    const card = el('div', 'card pmt-teach');
    card.appendChild(el('div', 'card-title', this.T('teach.title')));
    this._teachBody = el('div', 'pmt-feat-list');
    card.appendChild(this._teachBody);
    return card;
  }

  _refresh() {
    this.scene.setParams(this.state);
    const delta = secondaryYield(this.state.voltagePerStage);
    const G = gain(delta, this.state.nStages);
    const iPhoto = photocurrentFromIntensity(this.state.intensityRel, this.state.quantumEfficiency);
    const iOut = outputCurrent(iPhoto, delta, this.state.nStages);
    const rows = [
      [this.T('info.delta'), delta.toFixed(2)],
      [this.T('info.gain'), G.toExponential(2)],
      [this.T('info.iCathode'), iPhoto.toExponential(2) + ' A'],
      [this.T('info.iOut'), iOut.toExponential(2) + ' A'],
    ];
    this._infoHost.replaceWith(infoTable(rows));
    this._infoHost = this.panel.querySelector('.info') || this._infoHost;

    this._teachBody.innerHTML = '';
    const keys = ['t1', 't2', 't3', 't4'];
    for (let i = 0; i < keys.length; i++) {
      const row = el('div', 'pmt-feat');
      row.appendChild(el('div', 'pmt-feat-body', this.T('teach.' + keys[i])));
      this._teachBody.appendChild(row);
    }
  }

  unmount() {
    window.removeEventListener('resize', this._resize);
    if (this.dual && typeof this.dual.dispose === 'function') this.dual.dispose();
  }
}

export default {
  id: 'photomultiplier_tube',
  icon: '👁️',
  navKey: 'modules.photomultiplier_tube.navTitle',
  titleKey: 'modules.photomultiplier_tube.title',
  descKey: 'modules.photomultiplier_tube.desc',
  create: function (ctx) { return new PMTInstance(ctx); },
};
