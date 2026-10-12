import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider } from '../common/ui.js';
import { Variational2D } from './scene2d.js';
import {
  EXACT_ALPHA,
  EXACT_ENERGY,
  expectationEnergy,
  optimalAlpha,
  energyErrorPct,
} from './physics.js';

export default exportMathLab({
  id: 'variational_method',
  icon: 'V',
  group: 'math_physics',
  Scene2D: Variational2D,
  initialState: { alpha: 0.5 },
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    paramSlider(card, {
      label: inst.T('controls.alpha'),
      unit: '',
      min: 0.05,
      max: 2,
      step: 0.01,
      value: inst.state.alpha,
      decimals: 2,
      help: inst.T('controls.alphaHelp'),
      onInput(v) {
        inst.state.alpha = v;
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const a = this.state.alpha;
    const e = expectationEnergy(a);
    const aOpt = optimalAlpha();
    return [
      [this.T('info.energy'), e.toFixed(4)],
      [this.T('info.exact'), EXACT_ENERGY.toFixed(4)],
      [this.T('info.bestAlpha'), aOpt.toFixed(4)],
      [this.T('info.error'), energyErrorPct(a).toFixed(2) + '%'],
      [this.T('info.trial'), this.T('info.trialVal')],
    ];
  },
});
