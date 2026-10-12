import { exportMathLab } from '../common/mathLabModule.js';
import { SchrodingerCalculator2D } from './scene2d.js';
import { el, paramSlider, infoTable } from '../common/ui.js';
import { analyticEnergyEV, N_LEVELS } from './physics.js';

export default exportMathLab({
  id: 'schrodinger_calculator',
  icon: '∫',
  group: 'math_physics',
  initialState: { L: 1e-9, level: 1 },
  Scene2D: SchrodingerCalculator2D,
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title', 'Controls')));

    paramSlider(card, {
      label: inst.T('controls.width', 'Well width L'),
      unit: ' nm',
      min: 0.5,
      max: 3,
      step: 0.1,
      value: inst.state.L,
      decimals: 1,
      help: inst.T('controls.widthHelp', 'Infinite square well — walls at x=0 and x=L.'),
      onInput(v) {
        inst.state.L = v * 1e-9;
        inst._refresh(true);
      },
    });

    paramSlider(card, {
      label: inst.T('controls.level', 'Level n'),
      unit: '',
      min: 1,
      max: N_LEVELS,
      step: 1,
      value: inst.state.level,
      decimals: 0,
      onInput(v) {
        inst.state.level = Math.round(v);
        inst._refresh();
      },
    });

    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows(inst) {
    const L = inst.state.L;
    const idx = inst.state.level - 1;
    const sc = inst.scene;
    const lvl = sc && sc.solution && sc.solution.levels[idx];
    const Efdm = lvl ? lvl.E : 0;
    const Eex = analyticEnergyEV(inst.state.level, L);
    const err = Eex > 0 ? Math.abs(Efdm - Eex) / Eex * 100 : 0;
    return [
      [inst.T('info.method', 'Method'), 'FDM + Jacobi diagonalisation'],
      [inst.T('info.L', 'L'), (L * 1e9).toFixed(2) + ' nm'],
      [inst.T('info.n', 'Level n'), String(inst.state.level)],
      [inst.T('info.Efdm', 'E (FDM)'), Efdm.toFixed(4) + ' eV'],
      [inst.T('info.Eexact', 'E (exact)'), Eex.toFixed(4) + ' eV'],
      [inst.T('info.err', '|ΔE|/E'), err.toFixed(2) + '%'],
    ];
  },
});
