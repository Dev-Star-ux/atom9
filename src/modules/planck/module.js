import { PlanckScene } from "./scene3d.js";
import { Spectrum2D } from "./scene2d.js";
import { PlanckHFitter } from "./planckfit.js";
import { spectrumNm, wienPeakNm, stefanBoltzmann } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
class PlanckInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { T: 4e3, hScale: 1 };
    this.fit = new PlanckHFitter();
    this.training = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.planck." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.planck"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ff8040", label: this.T("legend.cavity") },
      { color: "#22d3ee", label: this.T("legend.planck") },
      { color: "#f87171", label: this.T("legend.classical") }
    ]);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new Spectrum2D(host, { mode: "planck-rj" });
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new PlanckScene(host);
        s.setParams(self.state);
        return s;
      }
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 45);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.temperature"),
      unit: " K",
      min: 1e3,
      max: 8e3,
      step: 100,
      value: this.state.T,
      decimals: 0,
      help: this.T("controls.temperatureHelp"),
      onInput: (v) => {
        this.state.T = v;
        this.dual.setParams({ T: v });
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.hscale"),
      unit: "\xD7 h",
      min: 0.05,
      max: 1.5,
      step: 0.05,
      value: this.state.hScale,
      decimals: 2,
      help: this.T("controls.hscaleHelp"),
      onInput: (v) => {
        this.state.hScale = v;
        this._refresh();
      }
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    card.appendChild(el("div", "field-label", this.T("chart.spectrumTitle")));
    this._specCanvas = el("canvas", "ai-plot massspec-chart");
    this._specCanvas.width = 300;
    this._specCanvas.height = 140;
    card.appendChild(this._specCanvas);
    const lg = el("div", "ai-legend");
    lg.innerHTML = `<span class="ex">${this.T("chart.planck")}</span><span class="pr">${this.T("chart.rj")}</span>`;
    card.appendChild(lg);
    return card;
  }
  _refresh() {
    this.dual.setParams(this.state);
    const T = this.state.T;
    const hScale = this.state.hScale;
    const rows = [
      [this.T("info.peak"), wienPeakNm(T).toFixed(0) + " nm"],
      [this.T("info.power"), (stefanBoltzmann(T) / 1e3).toFixed(1) + " kW/m²"],
      [this.T("info.hused"), (hScale * 6626e-37).toExponential(2) + " J·s"]
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
    this._drawSpectrum();
  }
  _drawSpectrum() {
    const c = this._specCanvas.getContext("2d");
    const W = this._specCanvas.width, Hc = this._specCanvas.height, pad = 28;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, Hc);
    const { pts, peak } = spectrumNm(this.state.T, this.state.hScale);
    const X = (nm) => pad + (W - 2 * pad) * (nm - 100) / 2900;
    const Y = (u) => Hc - pad - (Hc - 2 * pad) * u / peak;
    c.strokeStyle = "#f87171";
    c.setLineDash([4, 4]);
    c.lineWidth = 1.5;
    c.beginPath();
    pts.forEach((p, k) => {
      k ? c.lineTo(X(p.nm), Y(p.rj)) : c.moveTo(X(p.nm), Y(p.rj));
    });
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2.2;
    c.beginPath();
    pts.forEach((p, k) => {
      k ? c.lineTo(X(p.nm), Y(p.planck)) : c.moveTo(X(p.nm), Y(p.planck));
    });
    c.stroke();
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.planck", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: 6.626 \xD710\u207B\xB3\u2074 J\xB7s`,
      showLossPlot: false
    }, aiHowBlock);
    this._measureBtn = this._ai.findBtn;
    this._measureBtn.textContent = this.T("ai.measure");
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(this.state.T, 0.06, logger);
    this.hasData = true;
    this.training = false;
    this._measureBtn.disabled = false;
    this._measureBtn.textContent = this.T("ai.measure");
    this._updateAI();
  }
  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.training = !this.training;
    this._measureBtn.textContent = this.training ? this.T("ai.stop") : this.T("ai.measure");
    if (this.training) logger == null ? void 0 : logger.info("Gradient descent started");
    else logger == null ? void 0 : logger.info("Training paused");
  }
  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.training && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.epoch > 30) this._toggle();
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", this.fit.hEstimate.toExponential(3) + " J\xB7s");
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.refreshLogs();
  }
  unmount() {
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    if (this.dual) this.dual.dispose();
  }
}
export default {
  id: "planck",
  icon: "\u{1F525}",
  navKey: "modules.planck.navTitle",
  titleKey: "modules.planck.title",
  descKey: "modules.planck.desc",
  create(ctx) {
    return new PlanckInstance(ctx);
  }
};
