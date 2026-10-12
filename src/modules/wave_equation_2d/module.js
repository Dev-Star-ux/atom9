import { exportMathLab } from '../common/mathLabModule.js';
import { WaveEquation2D } from './scene2d.js';
import { el, paramSlider } from '../common/ui.js';
import { COLS, ROWS } from './physics.js';

export default exportMathLab({
  id: 'wave_equation_2d',
  icon: '▦',
  group: 'math_physics',
  Scene2D: WaveEquation2D,
  initialState: { slit: false, sourceStrength: 45, omega: 50 },
  buildPanel: function (inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    card.appendChild(el('div', 'field-label', inst.T('controls.barrier')));
    const chips = el('div', 'chips');
    [
      { id: false, label: inst.T('controls.open') },
      { id: true, label: inst.T('controls.slit') },
    ].forEach(function (opt) {
      const b = el('button', 'chip' + (inst.state.slit === opt.id ? ' active' : ''), opt.label);
      b.onclick = function () {
        inst.state.slit = opt.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        inst._refresh(true);
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    paramSlider(card, {
      label: inst.T('controls.amplitude'),
      unit: '%',
      min: 10,
      max: 100,
      step: 1,
      value: inst.state.sourceStrength,
      decimals: 0,
      help: inst.T('controls.amplitudeHelp'),
      onInput: function (v) {
        inst.state.sourceStrength = v;
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.frequency'),
      unit: '%',
      min: 10,
      max: 100,
      step: 1,
      value: inst.state.omega,
      decimals: 0,
      help: inst.T('controls.frequencyHelp'),
      onInput: function (v) {
        inst.state.omega = v;
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows: function (inst) {
    return [
      [inst.T('info.grid'), COLS + ' × ' + ROWS],
      [inst.T('info.scheme'), '2-D FDTD'],
      [inst.T('info.barrier'), inst.state.slit ? inst.T('info.barrierSlit') : inst.T('info.barrierNone')],
      [inst.T('info.source'), inst.T('info.sourceCentre')],
    ];
  },
});
