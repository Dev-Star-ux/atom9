import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider } from '../common/ui.js';
import { SphericalHarmonics2D } from './scene2d.js';
import { L_MAX, clampM, buildProbGrid } from './physics.js';

export default exportMathLab({
  id: 'spherical_harmonics',
  icon: 'Y',
  group: 'math_physics',
  Scene2D: SphericalHarmonics2D,
  initialState: { l: 2, m: 1 },
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    paramSlider(card, {
      label: inst.T('controls.l'),
      unit: '',
      min: 0,
      max: L_MAX,
      step: 1,
      value: inst.state.l,
      decimals: 0,
      help: inst.T('controls.lHelp'),
      onInput(v) {
        inst.state.l = Math.round(v);
        inst.state.m = clampM(inst.state.l, inst.state.m);
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.m'),
      unit: '',
      min: -L_MAX,
      max: L_MAX,
      step: 1,
      value: inst.state.m,
      decimals: 0,
      help: inst.T('controls.mHelp'),
      onInput(v) {
        inst.state.m = clampM(inst.state.l, v);
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const l = this.state.l;
    const m = clampM(l, this.state.m);
    const grid = buildProbGrid(l, m, 36, 18);
    return [
      [this.T('info.l'), String(l)],
      [this.T('info.m'), m >= 0 ? '+' + m : String(m)],
      [this.T('info.plot'), this.T('info.plotVal')],
      [this.T('info.peak'), grid.vmax.toExponential(3)],
      [this.T('info.grid'), this.T('info.gridVal')],
    ];
  },
});
