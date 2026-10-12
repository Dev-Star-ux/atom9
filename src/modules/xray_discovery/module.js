import { XrayDiscoveryScene } from "./scene3d.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { DuaneHuntFitter } from "./fit.js";
import { HC_KEV_NM, lambdaMinNm, penetrationLabel } from "./physics.js";
class XrayDiscoveryInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { voltage: 50, intensity: 70 };
    this.electrons = [];
    this.xrays = [];
    this._emit = 0;
    this._glow = 0;
    this.fit = new DuaneHuntFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.xray_discovery." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.xray_discovery"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#38bdf8", label: this.T("legend.electron") },
      { color: "#4ade80", label: this.T("legend.xray") },
      { color: "#fbbf24", label: this.T("legend.screen") }
    ]);
    this.scene = new XrayDiscoveryScene(this.viewport);
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.xray_discovery" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.voltage"),
      unit: " kV",
      min: 20,
      max: 100,
      step: 1,
      value: this.state.voltage,
      decimals: 0,
      help: this.T("controls.voltageHelp"),
      onInput: (v) => {
        this.state.voltage = v;
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.intensity"),
      unit: "%",
      min: 0,
      max: 100,
      step: 1,
      value: this.state.intensity,
      decimals: 0,
      help: this.T("controls.intensityHelp"),
      onInput: (v) => {
        this.state.intensity = v;
      }
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    return card;
  }
  _refresh() {
    var _a, _b;
    (_b = (_a = this.scene) == null ? void 0 : _a.setParams) == null ? void 0 : _b.call(_a, this.state);
    const lam = lambdaMinNm(this.state.voltage);
    const pen = penetrationLabel(this.state.voltage);
    const rows = [
      [this.T("controls.lambdaMin"), `${lam.toFixed(3)} nm`],
      [this.T("controls.maxEnergy"), `${this.state.voltage.toFixed(0)} keV`],
      [this.T("controls.penetration"), this.T(`pen.${pen}`)]
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
    this._ai = createAIPanelWithHow(this.t, "modules.xray_discovery", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${HC_KEV_NM.toFixed(4)} keV\xB7nm`,
      showLossPlot: true
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(0.04, 28, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T("ai.find");
    this._updateAI();
    this._drawAI();
  }
  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T("ai.stop") : this.T("ai.find");
    if (this.searching) logger == null ? void 0 : logger.info("Grid search started");
    else logger == null ? void 0 : logger.info("Search paused");
  }
  _tick() {
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    this.scene.setParams(this.state);
    this.scene.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      this._drawAI();
      if (this.fit.errorPct < 0.5 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(4)} keV\xB7nm`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }
  _drawAI() {
    const canvas = this._ai.plotCanvas;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, pad = 28;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    if (!this.hasData) return;
    const vs = this.fit.data.map((d) => d.V);
    const vmax = Math.max(...vs), vmin = Math.min(...vs);
    const lams = this.fit.data.map((d) => d.lam);
    const ymax = Math.max(...lams) * 1.15;
    const X = (v) => pad + (W - 2 * pad) * (v - vmin) / (vmax - vmin || 1);
    const Y = (l) => H - pad - (H - 2 * pad) * l / ymax;
    c.fillStyle = "#f472b6";
    for (const d of this.fit.data) {
      c.beginPath();
      c.arc(X(d.V), Y(d.lam), 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2;
    c.beginPath();
    this.fit.modelCurve().forEach((p, k) => {
      k ? c.lineTo(X(p.V), Y(p.lam)) : c.moveTo(X(p.V), Y(p.lam));
    });
    c.stroke();
  }
  unmount() {
    var _a;
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    (_a = this.scene) == null ? void 0 : _a.dispose();
  }
}
export default {
  id: "xray_discovery",
  icon: "X",
  navKey: "modules.xray_discovery.navTitle",
  titleKey: "modules.xray_discovery.title",
  descKey: "modules.xray_discovery.desc",
  create(ctx) {
    return new XrayDiscoveryInstance(ctx);
  }
};
