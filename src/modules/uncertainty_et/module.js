import { UncertaintyETScene } from "./scene3d.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
import { HBAR_EV_S } from "../common/wavePhysics.js";
import { HbarFitter } from "./fit.js";
import {
  deltaEnergyEV,
  deltaTProductEVs,
  linewidthEV,
  decayCurve,
  spectrumPoints,
  E0_EV,
  tauFromFs
} from "./physics.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable, sceneLegend } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { makeTeachCanvas, drawDecayAndSpectrum } from "../common/teachPlots.js";
class UncertaintyETInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { tauFs: 5 };
    this.fit = new HbarFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
    this._animT = 0;
  }
  T(k, v) {
    return this.t("modules.uncertainty_et." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.uncertainty_et"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#a78bfa", label: this.T("panels.decay") },
      { color: "#fbbf24", label: this.T("panels.spectrum") }
    ]);
    this.scene = new UncertaintyETScene(this.viewport);
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.uncertainty_et" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.lifetime"),
      unit: " fs",
      min: 0.5,
      max: 20,
      step: 0.1,
      value: this.state.tauFs,
      decimals: 1,
      help: this.T("controls.lifetimeHelp"),
      onInput: (v) => {
        this.state.tauFs = v;
        this._refresh();
      }
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("div", "field-label", this.T("panels.decay") + " · " + this.T("panels.spectrum")));
    this._plot = makeTeachCanvas(card, "teach-plot tall");
    return card;
  }
  _refresh() {
    var _a, _b;
    const tau = this.state.tauFs;
    const dE = deltaEnergyEV(tau);
    (_b = (_a = this.scene) == null ? void 0 : _a.setParams) == null ? void 0 : _b.call(_a, {
      tauFs: tau,
      dt: tauFromFs(tau),
      dE: dE,
      phase: this._animT
    });
    this._info.replaceWith(infoTable([
      [this.T("readouts.deltaT"), `\u0394t \u2248 ${tau.toFixed(1)} fs`],
      [this.T("readouts.deltaE"), `\u0394E \u2248 ${dE.toFixed(3)} eV`],
      [this.T("readouts.product"), `\u0394E\xB7\u0394t \u2248 ${deltaTProductEVs(tau).toExponential(2)} eV\xB7s`],
      [this.T("readouts.linewidth"), `\u0393 \u2248 ${linewidthEV(tau).toFixed(3)} eV`]
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
    if (this._plot) {
      const dec = decayCurve(tau);
      const sp = spectrumPoints(tau);
      drawDecayAndSpectrum(this._plot, dec.ts, dec.decay, sp.Es, sp.spec);
    }
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.uncertainty_et", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${HBAR_EV_S.toExponential(3)} eV\xB7s`
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(this.state.tauFs, void 0, void 0, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._findBtn.textContent = this.T("ai.find");
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
    var _a, _b, _c, _d, _e, _f;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    (_c = (_b = this.scene) == null ? void 0 : _b.setParams) == null ? void 0 : _c.call(_b, this.state);
    (_e = (_d = this.scene) == null ? void 0 : _d.tick) == null ? void 0 : _e.call(_d, 0.04);
    const tau = tauFromFs(this.state.tauFs);
    this._animT = (this._animT + 0.016) % (tau * 6);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) {
        (_f = this._ai.logger) == null ? void 0 : _f.ok(`Converged: \u0127\u2248${this.fit.estimate.toExponential(3)} eV\xB7s, error ${this.fit.errorPct.toFixed(2)}%`);
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toExponential(3)} eV\xB7s`);
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
  id: "uncertainty_et",
  icon: "\u23F1",
  navKey: "modules.uncertainty_et.navTitle",
  titleKey: "modules.uncertainty_et.title",
  descKey: "modules.uncertainty_et.desc",
  create(ctx) {
    return new UncertaintyETInstance(ctx);
  }
};
