import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider, infoTable } from '../common/ui.js';
import { NumericalMethods2D } from './scene2d.js';
import { METHODS, energy } from './physics.js';

export default exportMathLab({
  id: 'numerical_methods',
  icon: '🔢',
  group: 'math_physics',
  Scene2D: NumericalMethods2D,
  initialState: {
    omega: 2,
    dt: 0.08,
    x0: 1,
    v0: 0,
  },
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));

    paramSlider(card, {
      label: inst.T('controls.omega'),
      unit: ' rad/s',
      min: 0.5,
      max: 4,
      step: 0.1,
      value: inst.state.omega,
      decimals: 1,
      help: inst.T('controls.omegaHelp'),
      onInput: function (v) {
        inst.state.omega = v;
        inst._refresh(true);
      },
    });

    paramSlider(card, {
      label: inst.T('controls.dt'),
      unit: ' s',
      min: 0.01,
      max: 0.2,
      step: 0.005,
      value: inst.state.dt,
      decimals: 3,
      help: inst.T('controls.dtHelp'),
      onInput: function (v) {
        inst.state.dt = v;
        inst._refresh(true);
      },
    });

    paramSlider(card, {
      label: inst.T('controls.x0'),
      unit: '',
      min: 0.2,
      max: 1.5,
      step: 0.05,
      value: inst.state.x0,
      decimals: 2,
      help: inst.T('controls.x0Help'),
      onInput: function (v) {
        inst.state.x0 = v;
        inst._refresh(true);
      },
    });

    const resetRow = el('div', 'param');
    resetRow.appendChild(el('label', null, inst.T('controls.reset')));
    const resetBtn = el('button', 'chip', inst.T('controls.resetBtn'));
    resetBtn.onclick = function () { inst._refresh(true); };
    resetRow.appendChild(resetBtn);
    card.appendChild(resetRow);

    const legend = el('div', 'param-help');
    legend.textContent = METHODS.map(function (m) { return m.label; }).join(' · ');
    card.appendChild(legend);

    inst._infoHost = infoTable([]);
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const e0 = energy(this.state.x0, this.state.v0, this.state.omega);
    const period = (2 * Math.PI / this.state.omega).toFixed(2);
    return [
      [this.T('info.omega'), this.state.omega.toFixed(2) + ' rad/s'],
      [this.T('info.dt'), this.state.dt.toFixed(3) + ' s'],
      [this.T('info.period'), period + ' s'],
      [this.T('info.energy'), e0.toFixed(4)],
      [this.T('info.equation'), 'ẍ = −ω²x'],
    ];
  },
});
