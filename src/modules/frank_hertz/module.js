import { FrankHertzScene } from "./scene3d.js";
import { FrankHertz2D } from "./scene2d.js";
import { ExcitationFitter } from "./fhfit.js";
import { GASES, frankHertzCurrent, nextDipVoltage, V_MAX } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
class FrankHertzInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { gasIdx: 0, voltage: 6 };
    this.fit = new ExcitationFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.frank_hertz." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.frank_hertz"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#64748b", label: this.T("legend.cathode") },
      { color: "#fbbf24", label: this.T("legend.grid") },
      { color: "#7dd3fc", label: this.T("legend.gas") },
      { color: "#7fdfff", label: this.T("legend.electron") },
      { color: "#f87171", label: this.T("legend.inelastic") }
    ]);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new FrankHertz2D(host);
        s.setGas(self._gas().E0);
        s.setVoltage(self.state.voltage);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new FrankHertzScene(host);
        s.setGas(self._gas().E0);
        s.setVoltage(self.state.voltage);
        return s;
      }
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _gas() {
    return GASES[this.state.gasIdx];
  }
  _syncGasVoltage() {
    const E0 = this._gas().E0;
    this.dual.setParams({ gasIdx: this.state.gasIdx, voltage: this.state.voltage, E0: E0 });
    const s2 = this.dual.scene2d;
    const s3 = this.dual.scene3d;
    if (s2) {
      if (typeof s2.setGas === "function") s2.setGas(E0);
      if (typeof s2.setVoltage === "function") s2.setVoltage(this.state.voltage);
    }
    if (s3) {
      if (typeof s3.setGas === "function") s3.setGas(E0);
      if (typeof s3.setVoltage === "function") s3.setVoltage(this.state.voltage);
    }
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    card.appendChild(el("div", "field-label", this.T("controls.gas")));
    this._gasBox = el("div", "chips");
    GASES.forEach((g, i) => {
      const b = el("button", "chip" + (i === this.state.gasIdx ? " active" : ""), g.name);
      b.onclick = () => {
        this.state.gasIdx = i;
        for (const c of this._gasBox.children) c.classList.toggle("active", c === b);
        this._syncGasVoltage();
        this._refresh();
        this.hasData = false;
        this._findBtn.disabled = true;
      };
      this._gasBox.appendChild(b);
    });
    card.appendChild(this._gasBox);
    paramSlider(card, {
      label: this.T("controls.voltage"),
      unit: " V",
      min: 0,
      max: V_MAX,
      step: 0.25,
      value: this.state.voltage,
      decimals: 1,
      help: this.T("controls.voltageHelp"),
      onInput: (v) => {
        this.state.voltage = v;
        this._syncGasVoltage();
        this._refresh();
      }
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _refresh() {
    const g = this._gas();
    const I = frankHertzCurrent(this.state.voltage, g.E0);
    const rows = [
      [this.T("controls.excitation"), `${g.E0.toFixed(2)} eV`],
      [this.T("controls.current"), `${I.toFixed(2)} (rel.)`],
      [this.T("controls.nextDip"), `${nextDipVoltage(this.state.voltage, g.E0).toFixed(1)} V`]
    ];
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.frank_hertz", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${this._gas().E0.toFixed(2)} eV`,
      showLossPlot: true
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    const g = this._gas();
    this.fit.generateData(g.E0, 0.07, 55, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T("ai.find");
    this._drawAI();
    this._updateAI();
  }
  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T("ai.stop") : this.T("ai.find");
    if (this.searching) logger == null ? void 0 : logger.info("Grid search started");
    else logger == null ? void 0 : logger.info("Search paused");
  }
  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      this._drawAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) this._toggle();
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(2)} eV`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }
  _drawAI() {
    const canvas = this._ai.plotCanvas;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, pad = 24;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    if (!this.hasData) return;
    const ymax = Math.max(...this.fit.data.map((d) => d.I)) * 1.15 || 1;
    const X = (v) => pad + (W - 2 * pad) * v / V_MAX;
    const Y = (i) => H - pad - (H - 2 * pad) * i / ymax;
    c.fillStyle = "#f472b6";
    for (const d of this.fit.data) {
      c.beginPath();
      c.arc(X(d.V), Y(d.I), 2, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2;
    c.beginPath();
    const model = this.fit.modelCurve();
    model.forEach((p, k) => {
      k ? c.lineTo(X(p.V), Y(p.I)) : c.moveTo(X(p.V), Y(p.I));
    });
    c.stroke();
  }
  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    if (this.dual) this.dual.dispose();
  }
}
export default {
  id: "frank_hertz",
  icon: "\u26A1",
  navKey: "modules.frank_hertz.navTitle",
  titleKey: "modules.frank_hertz.title",
  descKey: "modules.frank_hertz.desc",
  create(ctx) {
    return new FrankHertzInstance(ctx);
  }
};
