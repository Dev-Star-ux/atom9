import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider } from '../common/ui.js';
import { ComplexPhasor2D } from './scene2d.js';
import { magnitude, phase, resultant, interferenceAmplitude } from './physics.js';

export default exportMathLab({
  id: 'complex_phasor',
  icon: 'ℂ',
  group: 'math_physics',
  Scene2D: ComplexPhasor2D,
  initialState: { phi1: 0, phi2: 1.2 },
  buildPanel(inst) {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));
    paramSlider(card, {
      label: inst.T('controls.phi1'),
      unit: ' rad',
      min: -Math.PI,
      max: Math.PI,
      step: 0.05,
      value: inst.state.phi1,
      decimals: 2,
      help: inst.T('controls.phi1Help'),
      onInput(v) {
        inst.state.phi1 = v;
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.phi2'),
      unit: ' rad',
      min: -Math.PI,
      max: Math.PI,
      step: 0.05,
      value: inst.state.phi2,
      decimals: 2,
      help: inst.T('controls.phi2Help'),
      onInput(v) {
        inst.state.phi2 = v;
        inst._refresh();
      },
    });
    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const sum = resultant(this.state.phi1, this.state.phi2);
    return [
      [this.T('info.mag'), magnitude(sum).toFixed(3)],
      [this.T('info.arg'), phase(sum).toFixed(3) + ' rad'],
      [this.T('info.interference'), interferenceAmplitude(this.state.phi1, this.state.phi2).toFixed(3)],
      [this.T('info.wave'), this.T('info.waveVal')],
    ];
  },
});
