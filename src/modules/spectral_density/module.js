import { SpectralDensityScene } from "./scene3d.js";
import { Spectrum2D } from "./scene2d.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { el, principleCard, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import {
  spectrumNm,
  wienPeakNm,
  planckU,
  bandEnergyFraction,
  BAND_NM
} from "./physics.js";
import { TemperatureFitter } from "./fit.js";

class SpectralDensityInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { temp: 5e3, cursor: 600 };
    this.fit = new TemperatureFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.spectral_density." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.spectral_density"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new Spectrum2D(host, { mode: "cursor" });
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new SpectralDensityScene(host);
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
      value: this.state.temp,
      decimals: 0,
      help: this.T("controls.temperatureHelp"),
      onInput: (v) => {
        this.state.temp = v;
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.cursor"),
      unit: " nm",
      min: 100,
      max: 3e3,
      step: 10,
      value: this.state.cursor,
      decimals: 0,
      help: this.T("controls.cursorHelp"),
      onInput: (v) => {
        this.state.cursor = v;
        this._refresh();
      }
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.spectral_density", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ]
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(this.state.temp, 0.06, logger);
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
    if (this._chrome && this._chrome.paused) return;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 6) {
        if (this._ai.logger) this._ai.logger.ok("Converged: T≈" + Math.round(this.fit.estimate) + " K, error " + this.fit.errorPct.toFixed(2) + "%");
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _refresh() {
    this.dual.setParams(this.state);
    const peak = wienPeakNm(this.state.temp);
    const spec = spectrumNm(this.state.temp);
    const ymax = spec.peak;
    const uHere = planckU(this.state.cursor * 1e-9, this.state.temp);
    const band = bandEnergyFraction(this.state.temp, this.state.cursor, BAND_NM);
    const rows = [
      [this.T("info.peak"), peak.toFixed(0) + " nm"],
      [this.T("info.uHere"), (uHere / ymax * 115).toFixed(0) + " %"],
      [this.T("info.band"), (band * 100).toFixed(1) + " %"]
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${Math.round(this.fit.estimate)} K`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }
  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    if (this.dual) this.dual.dispose();
  }
}
export default {
  id: "spectral_density",
  icon: "\u{1F4C8}",
  navKey: "modules.spectral_density.navTitle",
  titleKey: "modules.spectral_density.title",
  descKey: "modules.spectral_density.desc",
  create(ctx) {
    return new SpectralDensityInstance(ctx);
  }
};
