import { exportMathLab } from '../common/mathLabModule.js';
import { EigenvalueLab2D } from './scene2d.js';
import { el, paramSlider, infoTable } from '../common/ui.js';
import { eigen2x2, stringModeFreq } from './physics.js';

export default exportMathLab({
  id: 'eigenvalue_lab',
  icon: 'λ',
  group: 'math_physics',
  initialState: { a: 2, b: 1, c: 1, d: 0, n: 1, L: 1 },
  Scene2D: EigenvalueLab2D,
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title', 'Controls')));

    ['a', 'b', 'c', 'd'].forEach(function (key) {
      paramSlider(card, {
        label: inst.T('controls.' + key, key),
        unit: '',
        min: -3,
        max: 3,
        step: 0.1,
        value: inst.state[key],
        decimals: 1,
        onInput(v) {
          inst.state[key] = v;
          inst._refresh();
        },
      });
    });

    paramSlider(card, {
      label: inst.T('controls.mode', 'String mode n'),
      unit: '',
      min: 1,
      max: 6,
      step: 1,
      value: inst.state.n,
      decimals: 0,
      help: inst.T('controls.modeHelp', 'Standing wave sin(nπx/L).'),
      onInput(v) {
        inst.state.n = Math.round(v);
        inst._refresh();
      },
    });

    paramSlider(card, {
      label: inst.T('controls.length', 'String length L'),
      unit: ' m',
      min: 0.5,
      max: 2,
      step: 0.1,
      value: inst.state.L,
      decimals: 1,
      onInput(v) {
        inst.state.L = v;
        inst._refresh();
      },
    });

    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows(inst) {
    const s = inst.state;
    const ev = eigen2x2(s.a, s.b, s.c, s.d);
    const rows = [
      [inst.T('info.trace', 'tr(A)'), ev.trace.toFixed(3)],
      [inst.T('info.det', 'det(A)'), ev.det.toFixed(3)],
    ];
    if (ev.real) {
      rows.push([inst.T('info.lambda1', 'λ₁'), ev.lambda1.toFixed(4)]);
      rows.push([inst.T('info.lambda2', 'λ₂'), ev.lambda2.toFixed(4)]);
    } else {
      rows.push([inst.T('info.lambda', 'λ'), ev.lambda1.re.toFixed(4) + ' ± ' + ev.lambda1.im.toFixed(4) + 'i']);
    }
    rows.push([inst.T('info.freq', 'f_n (c=1)'), stringModeFreq(s.n, s.L).toFixed(3) + ' Hz']);
    return rows;
  },
});
