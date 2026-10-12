import { CrossSectionScene } from "./scene3d.js";
import { CrossSectionFitter } from "./crossfit.js";
import { sigma2d, meanFreePath, numberDensity } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
const SLAB_W = 14;
const SLAB_H = 8;
class CrossSectionInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { density: 45, radius: 10 };
    this.fit = new CrossSectionFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.cross_section." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.cross_section"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#fde047", label: this.T("legend.beam") },
      { color: "#3b82f6", label: this.T("legend.target") },
      { color: "#f87171", label: this.T("legend.collision") }
    ]);
    this.scene = new CrossSectionScene(this.viewport);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.cross_section" });
    this._resize = () => {
      this.scene.resize();
      this._refresh();
    };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
    this._refreshInterval = setInterval(() => this._refresh(), 500);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.density"),
      unit: "",
      min: 5,
      max: 120,
      step: 1,
      value: this.state.density,
      decimals: 0,
      help: this.T("controls.densityHelp"),
      onInput: (v) => {
        this.state.density = v;
        this.scene.setDensity(v);
      }
    });
    paramSlider(card, {
      label: this.T("controls.radius"),
      unit: "",
      min: 4,
      max: 22,
      step: 1,
      value: this.state.radius,
      decimals: 0,
      help: this.T("controls.radiusHelp"),
      onInput: (v) => {
        this.state.radius = v;
        this.scene.setRadius(v);
      }
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _refresh() {
    const { density, radius } = this.state;
    const n = numberDensity(density, SLAB_W, SLAB_H);
    const sig = sigma2d(radius * 0.08);
    const lam = meanFreePath(n, sig);
    const meas = this.scene.getMeasuredLambda();
    const rows = [
      [this.T("info.sigma"), `${sig.toFixed(2)} (units)`],
      [this.T("info.lambdaTheory"), isFinite(lam) ? `${(lam * 8).toFixed(0)} (units)` : "\u221E"],
      [this.T("info.lambdaMeasured"), meas != null ? `${meas.toFixed(0)} (units)` : "\u2014"],
      [this.T("info.transmission"), `${this.scene.getTransmission().toFixed(0)} %`]
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
    this._ai = createAIPanelWithHow(this.t, "modules.cross_section", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${sigma2d(this.state.radius * 0.08).toFixed(2)} (units)`,
      showLossPlot: false
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    const densities = [15, 30, 45, 60, 75, 90];
    this.fit.generateData(this.state.radius, densities, 0.05, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
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
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 6) this._toggle();
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(2)} (units)`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.refreshLogs();
  }
  unmount() {
    var _a;
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    window.removeEventListener("resize", this._resize);
    (_a = this.scene) == null ? void 0 : _a.dispose();
  }
}
export default {
  id: "cross_section",
  icon: "\u{1F3AF}",
  navKey: "modules.cross_section.navTitle",
  titleKey: "modules.cross_section.title",
  descKey: "modules.cross_section.desc",
  create(ctx) {
    return new CrossSectionInstance(ctx);
  }
};
