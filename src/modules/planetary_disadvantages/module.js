import { PlanetaryDisadvantagesScene } from "./scene3d.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
import { el, principleCard, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import {
  PROBLEMS,
  HYDROGEN_LINES,
  wavelengthToRgb,
  tickRadiation,
  tickStability
} from "./physics.js";
import { CollapseRateFitter } from "./fit.js";
class PlanetaryDisadvantagesInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = {
      problem: "radiation",
      angle: 0,
      radius: 120,
      energy: 100,
      collapsed: false,
      specPhase: 0
    };
    this.fit = new CollapseRateFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.planetary_disadvantages." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.planetary_disadvantages"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    this.scene = new PlanetaryDisadvantagesScene(this.viewport);
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.planetary_disadvantages" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    card.appendChild(el("div", "field-label", this.T("controls.problem")));
    this._chipBox = el("div", "chips");
    PROBLEMS.forEach((p) => {
      const b = el("button", "chip" + (p === this.state.problem ? " active" : ""), this.T(`problems.${p}`));
      b.onclick = () => {
        this.state.problem = p;
        this._resetAnim();
        for (const c of this._chipBox.children) c.classList.toggle("active", c === b);
        this._refresh();
      };
      this._chipBox.appendChild(b);
    });
    card.appendChild(this._chipBox);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.planetary_disadvantages", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      showLossPlot: true
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(28, 12, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T("ai.find");
    this._updateAI();
  }
  _resetAnim() {
    this.state.angle = 0;
    this.state.radius = 120;
    this.state.energy = 100;
    this.state.collapsed = false;
    this.state.specPhase = 0;
  }
  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._findBtn.textContent = this.searching ? this.T("ai.stop") : this.T("ai.find");
    if (this.searching) logger == null ? void 0 : logger.info("Grid search started");
    else logger == null ? void 0 : logger.info("Search paused");
  }
  _tick() {
    var _a, _b, _c, _d, _e, _f;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    (_c = (_b = this.scene) == null ? void 0 : _b.setParams) == null ? void 0 : _c.call(_b, this.state);
    (_e = (_d = this.scene) == null ? void 0 : _d.tick) == null ? void 0 : _e.call(_d, 0.04);
    const dt = 0.04;
    this.state.specPhase = (this.state.specPhase + dt) % (Math.PI * 2);
    if (this.state.problem === "radiation") tickRadiation(this.state, dt);
    else if (this.state.problem === "stability") tickStability(this.state, dt);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 3 && this.fit.iter > 6) {
        (_f = this._ai.logger) == null ? void 0 : _f.ok(`Converged: rate\u2248${this.fit.estimate.toFixed(1)} %/s, error ${this.fit.errorPct.toFixed(2)}%`);
        this._toggle({ logger: this._ai.logger });
      }
    }
    this._refresh();
  }
  _refresh() {
    var _a, _b;
    (_b = (_a = this.scene) == null ? void 0 : _a.setParams) == null ? void 0 : _b.call(_a, this.state);
    const s = this.state;
    let rows;
    if (s.problem === "radiation") {
      rows = [
        [this.T("info.energy"), `${s.energy.toFixed(0)} %`],
        [this.T("info.radius"), s.collapsed ? "0" : `${s.radius.toFixed(0)} px`],
        [this.T("info.verdict"), this.T("verdict.radiation")]
      ];
    } else if (s.problem === "spectrum") {
      rows = [
        [this.T("info.energy"), "\u2014"],
        [this.T("info.radius"), this.T("info.anyRadius")],
        [this.T("info.verdict"), this.T("verdict.spectrum")]
      ];
    } else {
      rows = [
        [this.T("info.energy"), this.T("info.continuous")],
        [this.T("info.radius"), this.T("info.noSelection")],
        [this.T("info.verdict"), this.T("verdict.stability")]
      ];
    }
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(1)} %/s`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
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
  id: "planetary_disadvantages",
  icon: "\u26A0\uFE0F",
  navKey: "modules.planetary_disadvantages.navTitle",
  titleKey: "modules.planetary_disadvantages.title",
  descKey: "modules.planetary_disadvantages.desc",
  create(ctx) {
    return new PlanetaryDisadvantagesInstance(ctx);
  }
};
