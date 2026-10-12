import { exportMathLab } from '../common/mathLabModule.js';
import { FourierTransform2D } from './scene2d.js';
import { el, paramSlider, infoTable } from '../common/ui.js';

export default exportMathLab({
  id: 'fourier_transform',
  icon: 'ℱ',
  group: 'math_physics',
  initialState: { mode: 'gauss', width: 0.8 },
  Scene2D: FourierTransform2D,
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title', 'Controls')));

    card.appendChild(el('div', 'field-label', inst.T('controls.pulse', 'Pulse shape')));
    const chips = el('div', 'chips');
    [
      { id: 'gauss', label: inst.T('controls.gauss', 'Gaussian') },
      { id: 'rect', label: inst.T('controls.rect', 'Rectangular') },
    ].forEach(function (m) {
      const b = el('button', 'chip' + (inst.state.mode === m.id ? ' active' : ''), m.label);
      b.onclick = function () {
        inst.state.mode = m.id;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        inst._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    paramSlider(card, {
      label: inst.T('controls.width', 'Width σ or w'),
      unit: '',
      min: 0.2,
      max: 2,
      step: 0.05,
      value: inst.state.width,
      decimals: 2,
      help: inst.T('controls.widthHelp', 'Narrower in time → wider spectrum (uncertainty).'),
      onInput(v) {
        inst.state.width = v;
        inst._refresh();
      },
    });

    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows(inst) {
    const w = inst.state.width;
    const isGauss = inst.state.mode === 'gauss';
    return [
      [inst.T('info.shape'), isGauss ? inst.T('info.gauss') : inst.T('info.rect')],
      [inst.T('info.width'), w.toFixed(2)],
      [inst.T('info.time'), isGauss ? '≈ ±3σ' : '±w/2'],
      [inst.T('info.note'), inst.T('info.noteVal')],
    ];
  },
});
