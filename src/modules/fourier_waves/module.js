import { exportMathLab } from '../common/mathLabModule.js';
import { FourierWaves2D } from './scene2d.js';
import { el, paramSlider } from '../common/ui.js';
import { PRESETS, harmonicCoeff } from './physics.js';

export default exportMathLab({
  id: 'fourier_waves',
  icon: '∿',
  group: 'math_physics',
  Scene2D: FourierWaves2D,
  initialState: { preset: 'square', nHarmonics: 7, speed: 1 },
  buildPanel: function (inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    card.appendChild(el('div', 'field-label', inst.T('controls.preset')));
    const chips = el('div', 'chips');
    PRESETS.forEach(function (pr) {
      const b = el('button', 'chip' + (inst.state.preset === pr.id ? ' active' : ''), pr.label);
      b.onclick = function () {
        inst.state.preset = pr.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        inst._refresh(true);
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);
    paramSlider(card, {
      label: inst.T('controls.harmonics'),
      unit: '',
      min: 1,
      max: 25,
      step: 1,
      value: inst.state.nHarmonics,
      decimals: 0,
      help: inst.T('controls.harmonicsHelp'),
      onInput: function (v) {
        inst.state.nHarmonics = v;
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.speed'),
      unit: '×',
      min: 0,
      max: 3,
      step: 0.1,
      value: inst.state.speed,
      decimals: 1,
      help: inst.T('controls.speedHelp'),
      onInput: function (v) {
        inst.state.speed = v;
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows: function (inst) {
    const n = Math.round(inst.state.nHarmonics);
    const a1 = harmonicCoeff(inst.state.preset, 1);
    return [
      [inst.T('info.preset'), inst.state.preset],
      [inst.T('info.terms'), String(n)],
      [inst.T('info.a1'), a1.toFixed(3)],
      [inst.T('info.period'), '2π'],
    ];
  },
});
