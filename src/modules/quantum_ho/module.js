import { exportMathLab } from '../common/mathLabModule.js';
import { QuantumHO2D } from './scene2d.js';
import { el, paramSlider } from '../common/ui.js';
import { hoEnergy, nodeCount, N_MAX } from './physics.js';

export default exportMathLab({
  id: 'quantum_ho',
  icon: '⌇',
  group: 'math_physics',
  Scene2D: QuantumHO2D,
  initialState: { level: 0, showProb: true },
  buildPanel: function (inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    paramSlider(card, {
      label: inst.T('controls.level'),
      unit: '',
      min: 0,
      max: N_MAX,
      step: 1,
      value: inst.state.level,
      decimals: 0,
      help: inst.T('controls.levelHelp'),
      onInput: function (v) {
        inst.state.level = v;
        inst._refresh();
      },
    });
    card.appendChild(el('div', 'field-label', inst.T('controls.display')));
    const chips = el('div', 'chips');
    [
      { id: true, label: inst.T('controls.probOn') },
      { id: false, label: inst.T('controls.psiOnly') },
    ].forEach(function (opt) {
      const b = el('button', 'chip' + (inst.state.showProb === opt.id ? ' active' : ''), opt.label);
      b.onclick = function () {
        inst.state.showProb = opt.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        inst._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows: function (inst) {
    const n = Math.round(inst.state.level);
    return [
      [inst.T('info.n'), String(n)],
      [inst.T('info.energy'), hoEnergy(n).toFixed(1) + ' ℏω'],
      [inst.T('info.nodes'), String(nodeCount(n))],
      [inst.T('info.units'), inst.T('info.unitsVal')],
    ];
  },
});
