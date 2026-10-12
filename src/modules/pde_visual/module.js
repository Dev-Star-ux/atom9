import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider, infoTable } from '../common/ui.js';
import { PdeVisual2D } from './scene2d.js';
import { PRESETS, DEFAULT_DU, DEFAULT_DV } from './physics.js';

export default exportMathLab({
  id: 'pde_visual',
  icon: '∂',
  group: 'math_physics',
  Scene2D: PdeVisual2D,
  initialState: {
    preset: 'spots',
    F: PRESETS.spots.F,
    k: PRESETS.spots.k,
    Du: DEFAULT_DU,
    Dv: DEFAULT_DV,
    speed: 1,
    showField: 'v',
  },
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));

    const presetRow = el('div', 'param');
    presetRow.appendChild(el('label', null, inst.T('controls.preset')));
    const chipWrap = el('div', 'chip-row');
    const chips = {};
    for (const key of Object.keys(PRESETS)) {
      const p = PRESETS[key];
      const btn = el('button', 'chip' + (inst.state.preset === key ? ' active' : ''), p.label);
      btn.onclick = function () {
        inst.state.preset = key;
        inst.state.F = p.F;
        inst.state.k = p.k;
        for (const id of Object.keys(chips)) {
          chips[id].classList.toggle('active', id === key);
        }
        if (inst._FSlider) inst._FSlider.set(p.F);
        if (inst._kSlider) inst._kSlider.set(p.k);
        inst._refresh(true);
      };
      chips[key] = btn;
      chipWrap.appendChild(btn);
    }
    presetRow.appendChild(chipWrap);
    card.appendChild(presetRow);

    inst._FSlider = paramSlider(card, {
      label: inst.T('controls.F'),
      unit: '',
      min: 0.01,
      max: 0.08,
      step: 0.001,
      value: inst.state.F,
      decimals: 3,
      help: inst.T('controls.FHelp'),
      onInput: function (v) {
        inst.state.F = v;
        inst.state.preset = 'custom';
        inst._refresh(true);
      },
    });

    inst._kSlider = paramSlider(card, {
      label: inst.T('controls.k'),
      unit: '',
      min: 0.045,
      max: 0.07,
      step: 0.001,
      value: inst.state.k,
      decimals: 3,
      help: inst.T('controls.kHelp'),
      onInput: function (v) {
        inst.state.k = v;
        inst.state.preset = 'custom';
        inst._refresh(true);
      },
    });

    paramSlider(card, {
      label: inst.T('controls.speed'),
      unit: '×',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: inst.state.speed,
      decimals: 2,
      help: inst.T('controls.speedHelp'),
      onInput: function (v) {
        inst.state.speed = v;
        inst._refresh(false);
      },
    });

    const resetRow = el('div', 'param');
    resetRow.appendChild(el('label', null, inst.T('controls.reset')));
    const resetBtn = el('button', 'chip', inst.T('controls.resetBtn'));
    resetBtn.onclick = function () { inst._refresh(true); };
    resetRow.appendChild(resetBtn);
    card.appendChild(resetRow);

    inst._infoHost = infoTable([]);
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const presetLabel = PRESETS[this.state.preset]
      ? PRESETS[this.state.preset].label
      : this.state.preset;
    return [
      [this.T('info.preset'), presetLabel],
      [this.T('info.F'), this.state.F.toFixed(4)],
      [this.T('info.k'), this.state.k.toFixed(4)],
      [this.T('info.Du'), this.state.Du.toFixed(3)],
      [this.T('info.Dv'), this.state.Dv.toFixed(3)],
    ];
  },
});
