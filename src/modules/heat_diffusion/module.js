import { exportMathLab } from '../common/mathLabModule.js';
import { HeatDiffusion2D } from './scene2d.js';
import { el, paramSlider, infoTable } from '../common/ui.js';

export default exportMathLab({
  id: 'heat_diffusion',
  icon: '♨',
  group: 'math_physics',
  initialState: { D: 0.18, dim: 2 },
  Scene2D: HeatDiffusion2D,
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title', 'Controls')));

    paramSlider(card, {
      label: inst.T('controls.diffusion', 'Diffusion D'),
      unit: '',
      min: 0.05,
      max: 0.5,
      step: 0.01,
      value: inst.state.D,
      decimals: 2,
      help: inst.T('controls.diffusionHelp', 'Higher D spreads heat faster (watch stability).'),
      onInput(v) {
        inst.state.D = v;
        inst._refresh();
      },
    });

    card.appendChild(el('div', 'field-label', inst.T('controls.dimension', 'Dimension')));
    const chips = el('div', 'chips');
    [1, 2].forEach(function (d) {
      const b = el('button', 'chip' + (inst.state.dim === d ? ' active' : ''), d + 'D');
      b.onclick = function () {
        inst.state.dim = d;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        inst._refresh(true);
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    const resetBtn = el('button', 'btn', inst.T('controls.reset', 'Reset pulse'));
    resetBtn.onclick = function () { inst._refresh(true); };
    card.appendChild(resetBtn);

    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows(inst) {
    const sim = inst.scene && inst.scene.sim;
    if (!sim) return [];
    return [
      [inst.T('info.equation', 'Equation'), '∂u/∂t = D∇²u'],
      [inst.T('info.scheme', 'Scheme'), 'Explicit 5-point FD'],
      [inst.T('info.dt', 'Δt (stable)'), sim.maxDt().toExponential(2)],
      [inst.T('info.peak', 'Peak u'), sim.peak().toFixed(4)],
      [inst.T('info.mean', 'Mean u'), sim.totalEnergy().toFixed(4)],
    ];
  },
});
