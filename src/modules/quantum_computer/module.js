import { QuantumComputer2D } from './scene2d.js';
import { wireCanvasExperiment } from '../common/sceneChrome.js';
import { QubitAngleFitter } from './fit.js';
import {
  LEARN_MODES,
  GATES,
  ket0,
  applyGate,
  applyNoise,
  sampleBit,
  probs,
  stateLabel,
  classicalNot,
  GATE_HELP,
  bellProbs,
  fromBlochAngles,
  blochAngles,
} from './physics.js';
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from '../common/ui.js';
import { createAIPanelWithHow } from '../common/aiPanel.js';

class QuantumComputerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      mode: 'compare',
      gate: 'H',
      noise: 0.08,
      qubit: ket0(),
      classical: [1, 0, 1, 1],
      hist: [0, 0],
      shots: 0,
      circuit: [],
      entangled: false,
      theta: 0,
      phi: 0,
    };
    this.fit = new QubitAngleFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
    this._thetaSlider = null;
    this._phiSlider = null;
  }

  T(k, v) {
    return this.t('modules.quantum_computer.' + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add('module-orbital');
    this.viewport = el('div', 'viewport qc-viewport');
    this.viewport.appendChild(el('div', 'hint', this.T('hint')));
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel qc-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.quantum_computer'));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.scene = new QuantumComputer2D(this.viewport);
    this.scene.setParams(this._sceneParams());
    this._chrome = wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener('resize', this._resize);
    this.scene.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _sceneParams() {
    return {
      mode: this.state.mode,
      gate: this.state.gate,
      noise: this.state.noise,
      qubit: this.state.qubit,
      classical: this.state.classical,
      hist: this.state.hist,
      shots: this.state.shots,
      circuit: this.state.circuit,
      entangled: this.state.entangled,
      theta: this.state.theta,
      phi: this.state.phi,
    };
  }

  _buildParamCard() {
    const card = el('div', 'card qc-controls');
    card.appendChild(el('div', 'card-title', this.T('controls.title')));

    // Learn mode — short chips that wrap cleanly
    const modeSec = el('div', 'qc-sec');
    modeSec.appendChild(el('div', 'qc-sec-label', this.T('controls.learnMode')));
    this._modeBox = el('div', 'chips qc-mode-chips');
    for (let i = 0; i < LEARN_MODES.length; i++) {
      const m = LEARN_MODES[i];
      const b = el('button', 'chip' + (m === this.state.mode ? ' active' : ''), this.T('modes.' + m));
      const self = this;
      b.onclick = function () {
        self.state.mode = m;
        for (let j = 0; j < self._modeBox.children.length; j++) {
          self._modeBox.children[j].classList.toggle('active', self._modeBox.children[j] === b);
        }
        self._refresh();
      };
      this._modeBox.appendChild(b);
    }
    modeSec.appendChild(this._modeBox);
    card.appendChild(modeSec);

    // Gates — compact grid
    const gateSec = el('div', 'qc-sec');
    gateSec.appendChild(el('div', 'qc-sec-label', this.T('controls.gate')));
    this._gateBox = el('div', 'chips qc-gate-chips');
    for (let i = 0; i < GATES.length; i++) {
      const g = GATES[i];
      const b = el('button', 'chip qc-gate' + (g === this.state.gate ? ' active' : ''), g);
      const self = this;
      b.onclick = function () {
        self.state.gate = g;
        for (let j = 0; j < self._gateBox.children.length; j++) {
          self._gateBox.children[j].classList.toggle('active', self._gateBox.children[j].textContent === g);
        }
        self._refreshInfo();
      };
      this._gateBox.appendChild(b);
    }
    gateSec.appendChild(this._gateBox);
    this._gateHelp = el('p', 'qc-gate-help', '');
    gateSec.appendChild(this._gateHelp);
    card.appendChild(gateSec);

    // Actions — 2-column grid, no overflow
    const actSec = el('div', 'qc-sec');
    actSec.appendChild(el('div', 'qc-sec-label', this.T('controls.actions')));
    const actions = el('div', 'qc-actions');
    const applyBtn = el('button', 'btn primary', this.T('controls.apply'));
    applyBtn.onclick = () => this._applyGate();
    const resetBtn = el('button', 'btn', this.T('controls.reset'));
    resetBtn.onclick = () => this._reset();
    const measureBtn = el('button', 'btn', this.T('controls.measure'));
    measureBtn.onclick = () => this._measure(1);
    const shotsBtn = el('button', 'btn', this.T('controls.shots'));
    shotsBtn.onclick = () => this._measure(40);
    const flipBtn = el('button', 'btn qc-span', this.T('controls.flipBit'));
    flipBtn.onclick = () => {
      this.state.classical = classicalNot(this.state.classical, 0);
      this._push();
    };
    actions.appendChild(applyBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(measureBtn);
    actions.appendChild(shotsBtn);
    actions.appendChild(flipBtn);
    actSec.appendChild(actions);
    card.appendChild(actSec);

    // Bloch & noise
    const blochSec = el('div', 'qc-sec');
    blochSec.appendChild(el('div', 'qc-sec-label', this.T('controls.blochNoise')));
    this._thetaSlider = paramSlider(blochSec, {
      label: this.T('controls.theta'),
      unit: '°',
      min: 0,
      max: 180,
      step: 1,
      value: this.state.theta,
      decimals: 0,
      onInput: (v) => {
        this.state.theta = v;
        this.state.qubit = fromBlochAngles(this.state.theta, this.state.phi);
        this.state.entangled = false;
        this._push();
        this._refreshInfo();
      },
    });
    this._phiSlider = paramSlider(blochSec, {
      label: this.T('controls.phi'),
      unit: '°',
      min: 0,
      max: 360,
      step: 1,
      value: this.state.phi,
      decimals: 0,
      onInput: (v) => {
        this.state.phi = v;
        this.state.qubit = fromBlochAngles(this.state.theta, this.state.phi);
        this.state.entangled = false;
        this._push();
        this._refreshInfo();
      },
    });
    paramSlider(blochSec, {
      label: this.T('controls.noise'),
      unit: '%',
      min: 0,
      max: 60,
      step: 1,
      value: Math.round(this.state.noise * 100),
      decimals: 0,
      onInput: (v) => {
        this.state.noise = v / 100;
        this._push();
      },
    });
    card.appendChild(blochSec);

    // Compact readout
    const readSec = el('div', 'qc-sec');
    readSec.appendChild(el('div', 'qc-sec-label', this.T('controls.readout')));
    this._info = infoTable([]);
    this._info.className = 'info qc-info';
    readSec.appendChild(this._info);
    card.appendChild(readSec);
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, 'modules.quantum_computer', {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: 'est', label: this.T('ai.estimate') },
        { key: 'err', label: this.T('ai.error') },
      ],
      trueLine: this.T('ai.trueHint'),
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _syncAnglesFromState() {
    const a = blochAngles(this.state.qubit);
    this.state.theta = a.theta;
    this.state.phi = a.phi;
    if (this._thetaSlider && this._thetaSlider.set) this._thetaSlider.set(Math.round(a.theta));
    if (this._phiSlider && this._phiSlider.set) this._phiSlider.set(Math.round(a.phi));
  }

  _applyGate() {
    const g = this.state.gate;
    if (g === 'CNOT') {
      this.state.entangled = true;
      this.state.circuit = (this.state.circuit || []).concat(['H', 'CNOT']).slice(-8);
      this.state.qubit = applyNoise(applyGate(ket0(), 'H'), this.state.noise * 0.5);
      this.state.hist = [0, 0];
      this.state.shots = 0;
    } else {
      this.state.entangled = false;
      this.state.qubit = applyNoise(applyGate(this.state.qubit, g), this.state.noise);
      this.state.circuit = (this.state.circuit || []).concat([g]).slice(-8);
    }
    this._syncAnglesFromState();
    this._refresh();
  }

  _reset() {
    this.state.qubit = ket0();
    this.state.hist = [0, 0];
    this.state.shots = 0;
    this.state.circuit = [];
    this.state.entangled = false;
    this.state.theta = 0;
    this.state.phi = 0;
    this._syncAnglesFromState();
    this._refresh();
  }

  _measure(n) {
    const count = n || 1;
    let last = 0;
    if (this.state.entangled) {
      const bp = bellProbs();
      for (let i = 0; i < count; i++) {
        last = Math.random() < bp['00'] ? 0 : 1;
        this.state.hist[last]++;
        this.state.shots++;
      }
    } else {
      for (let i = 0; i < count; i++) {
        last = sampleBit(this.state.qubit);
        this.state.hist[last]++;
        this.state.shots++;
      }
      if (count === 1) {
        this.state.qubit = last === 0 ? ket0() : applyGate(ket0(), 'X');
        this._syncAnglesFromState();
      }
    }
    this.state.circuit = (this.state.circuit || []).concat(['M']).slice(-8);
    this._refresh();
  }

  _push() {
    this.scene.setParams(this._sceneParams());
  }

  _refreshInfo() {
    const p = probs(this.state.qubit);
    this._gateHelp.textContent = GATE_HELP()[this.state.gate] || '';
    const rows = [
      [this.T('readouts.state'), stateLabel(this.state.qubit)],
      [this.T('readouts.p0'), p.p0.toFixed(3)],
      [this.T('readouts.p1'), p.p1.toFixed(3)],
      [this.T('readouts.shots'), String(this.state.shots)],
    ];
    const next = infoTable(rows);
    next.className = 'info qc-info';
    this._info.replaceWith(next);
    this._info = next;
  }

  _refresh() {
    this._push();
    this._refreshInfo();
  }

  _collect({ logger }) {
    this.fit.generateData(0.05, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T('ai.find');
    this._updateAI();
  }

  _toggle({ logger }) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T('ai.stop') : this.T('ai.find');
    if (logger) {
      if (this.searching) logger.info('Grid search for θ started');
      else logger.info('Search paused');
    }
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    // Hardware demo: when on the "Shots" step, auto-collect a few measurements
    if (this.state.mode === 'hardware' && this.scene && this.scene.state) {
      const step = Math.floor((this.scene.state.pulse || 0) / 2.2) % 6;
      if (step === 4 && Math.random() < 0.12) {
        // keep a superposition so histogram is interesting
        if (this.state.shots === 0 || this.state.shots % 20 === 0) {
          this.state.qubit = applyNoise(applyGate(ket0(), 'H'), this.state.noise * 0.3);
          this.state.entangled = false;
        }
        const bit = sampleBit(this.state.qubit);
        this.state.hist[bit]++;
        this.state.shots++;
        if (this.state.shots % 8 === 0) this._refreshInfo();
      }
      if (step === 2 && Math.random() < 0.04) {
        // brief gate flash on circuit during Control step
        this.state.circuit = (this.state.circuit || []).concat([this.state.gate || 'H']).slice(-6);
      }
    }
    this._push();
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 10) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            'Converged: θ≈' + this.fit.estimate.toFixed(3) + ' rad, error ' + this.fit.errorPct.toFixed(2) + '%'
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout('est', this.fit.estimate.toFixed(3) + ' rad');
    this._ai.setReadout('err', this.fit.errorPct.toFixed(2) + '%');
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener('resize', this._resize);
    if (this.scene && this.scene.dispose) this.scene.dispose();
  }
}

export default {
  id: 'quantum_computer',
  icon: '⌘',
  navKey: 'modules.quantum_computer.navTitle',
  titleKey: 'modules.quantum_computer.title',
  descKey: 'modules.quantum_computer.desc',
  create: function (ctx) {
    return new QuantumComputerInstance(ctx);
  },
};
