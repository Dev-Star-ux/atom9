import { ComptonScene } from "./scene3d.js";
import { ComptonFitter } from "./comptonfit.js";
import { comptonShiftPm, scatteredLambdaPm, electronKeV, LAMBDA_C_PM, shiftCurve } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
class ComptonInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { lamPm: 50, thetaDeg: 60 };
    this.fit = new ComptonFitter();
    this.training = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.compton." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    this._buildFlowGuide();
    this._hud = el("div", "compton-hud");
    this.viewport.appendChild(this._hud);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.compton"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#38bdf8", label: this.T("legend.incident") },
      { color: "#fbbf24", label: this.T("legend.scattered") },
      { color: "#f472b6", label: this.T("legend.recoil") },
      { color: "#64748b", label: this.T("legend.electron") }
    ]);
    this.scene = new ComptonScene(this.viewport);
    this.scene.setLabels({
      incident: this.T("scene.incident"),
      scattered: this.T("scene.scattered"),
      theta: "\u03B8",
      shift: this.T("info.shift")
    });
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.compton" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildFlowGuide() {
    const flow = el("div", "scene-flow");
    const steps = ["flow.incident", "flow.collision", "flow.shift", "flow.recoil"];
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) flow.appendChild(el("span", "flow-arrow", "\u2192"));
      flow.appendChild(el("span", "flow-step", this.T(steps[i])));
    }
    this.viewport.appendChild(flow);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.wavelength"),
      unit: " pm",
      min: 10,
      max: 150,
      step: 1,
      value: this.state.lamPm,
      decimals: 0,
      help: this.T("controls.wavelengthHelp"),
      onInput: (v) => {
        this.state.lamPm = v;
        this.scene.setParams({ lamPm: v });
        this.scene.setLabels({ incident: this.T("scene.incident"), scattered: this.T("scene.scattered"), theta: "\u03B8", shift: this.T("info.shift") });
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.angle"),
      unit: "\xB0",
      min: 0,
      max: 180,
      step: 1,
      value: this.state.thetaDeg,
      decimals: 0,
      help: this.T("controls.angleHelp"),
      onInput: (v) => {
        this.state.thetaDeg = v;
        this.scene.setParams({ thetaDeg: v });
        this.scene.setLabels({ incident: this.T("scene.incident"), scattered: this.T("scene.scattered"), theta: "\u03B8", shift: this.T("info.shift") });
        this._refresh();
      }
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    card.appendChild(el("div", "field-label", this.T("chart.shiftTitle")));
    this._shiftCanvas = el("canvas", "ai-plot");
    this._shiftCanvas.width = 300;
    this._shiftCanvas.height = 120;
    card.appendChild(this._shiftCanvas);
    return card;
  }
  _refresh() {
    const rad = this.state.thetaDeg * Math.PI / 180;
    const shift = comptonShiftPm(rad);
    const rows = [
      [this.T("info.shift"), `\u0394\u03BB = ${shift.toFixed(3)} pm`],
      [this.T("info.scattered"), `\u03BB' = ${scatteredLambdaPm(this.state.lamPm, rad).toFixed(2)} pm`],
      [this.T("info.electronKe"), `${electronKeV(this.state.lamPm, rad).toFixed(3)} keV`],
      [this.T("info.lambdaC"), `${LAMBDA_C_PM.toFixed(3)} pm`]
    ];
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
    this._drawShift();
    this._hud.innerHTML = `<span class="inc">\u03BB = ${this.state.lamPm} pm</span><span class="out">\u03BB' = ${scatteredLambdaPm(this.state.lamPm, rad).toFixed(1)} pm</span><span class="shift">\u0394\u03BB = ${comptonShiftPm(rad).toFixed(2)} pm</span><span class="ang">\u03B8 = ${this.state.thetaDeg}\xB0</span>`;
  }
  _drawShift() {
    const c = this._shiftCanvas.getContext("2d");
    const W = this._shiftCanvas.width, H = this._shiftCanvas.height, pad = 24;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    const curve = shiftCurve();
    const ymax = LAMBDA_C_PM * 2.1;
    const X = (d) => pad + (W - 2 * pad) * d / 180;
    const Y = (s) => H - pad - (H - 2 * pad) * s / ymax;
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2;
    c.beginPath();
    curve.forEach((p, k) => {
      k ? c.lineTo(X(p.deg), Y(p.shift)) : c.moveTo(X(p.deg), Y(p.shift));
    });
    c.stroke();
    const rad = this.state.thetaDeg * Math.PI / 180;
    c.fillStyle = "#34d399";
    c.beginPath();
    c.arc(X(this.state.thetaDeg), Y(comptonShiftPm(rad)), 4, 0, Math.PI * 2);
    c.fill();
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.compton", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${LAMBDA_C_PM.toFixed(3)} pm`,
      showLossPlot: true
    }, aiHowBlock);
    this._measureBtn = this._ai.findBtn;
    this._measureBtn.textContent = this.T("ai.measure");
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(this.state.lamPm, 0.04, 20, logger);
    this.hasData = true;
    this.training = false;
    this._measureBtn.disabled = false;
    this._measureBtn.textContent = this.T("ai.measure");
    this._drawAI();
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
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.training && this.hasData) {
      this.fit.step();
      this._updateAI();
      this._drawAI();
      if (this.fit.errorPct < 0.5 && this.fit.epoch > 40) this._toggle();
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.lambdaCEstimate.toFixed(3)} pm`);
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
    const ymax = LAMBDA_C_PM * 2.1;
    const X = (x) => pad + (W - 2 * pad) * x / 2;
    const Y = (s) => H - pad - (H - 2 * pad) * s / ymax;
    c.fillStyle = "#f472b6";
    for (const d of this.fit.data) {
      c.beginPath();
      c.arc(X(d.x), Y(d.shift), 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(X(0), Y(0));
    c.lineTo(X(2), Y(this.fit.slope * 2));
    c.stroke();
  }
  unmount() {
    var _a;
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    (_a = this.scene) == null ? void 0 : _a.dispose();
  }
}
export default {
  id: "compton",
  icon: "γ",
  navKey: "modules.compton.navTitle",
  titleKey: "modules.compton.title",
  descKey: "modules.compton.desc",
  create(ctx) {
    return new ComptonInstance(ctx);
  }
};
