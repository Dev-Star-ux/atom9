import { exportMathLab } from '../common/mathLabModule.js';
import { QuantumTunneling2D } from './scene2d.js';
import { el, paramSlider } from '../common/ui.js';
import { transmission } from './physics.js';

export default exportMathLab({
  id: 'quantum_tunneling',
  icon: '⊏',
  group: 'math_physics',
  Scene2D: QuantumTunneling2D,
  initialState: { energy: 1.2, barrierV: 2.5, barrierW: 1.0 },
  buildPanel: function (inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    paramSlider(card, {
      label: inst.T('controls.energy'),
      unit: '',
      min: 0.2,
      max: 4,
      step: 0.05,
      value: inst.state.energy,
      decimals: 2,
      help: inst.T('controls.energyHelp'),
      onInput: function (v) {
        inst.state.energy = v;
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.barrierV'),
      unit: '',
      min: 0.5,
      max: 5,
      step: 0.1,
      value: inst.state.barrierV,
      decimals: 1,
      help: inst.T('controls.barrierVHelp'),
      onInput: function (v) {
        inst.state.barrierV = v;
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.barrierW'),
      unit: '',
      min: 0.3,
      max: 2.5,
      step: 0.05,
      value: inst.state.barrierW,
      decimals: 2,
      help: inst.T('controls.barrierWHelp'),
      onInput: function (v) {
        inst.state.barrierW = v;
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows: function (inst) {
    const E = inst.state.energy;
    const V0 = inst.state.barrierV;
    const a = inst.state.barrierW;
    const T = transmission(E, V0, a);
    const regime = E >= V0 ? inst.T('info.above') : inst.T('info.tunneling');
    return [
      [inst.T('info.E'), E.toFixed(2)],
      [inst.T('info.V0'), V0.toFixed(2)],
      [inst.T('info.T'), (T * 100).toFixed(1) + '%'],
      [inst.T('info.regime'), regime],
    ];
  },
});
