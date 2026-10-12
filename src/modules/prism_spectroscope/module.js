import { PrismSpectroscopeScene } from "./scene3d.js";
import { PrismSpectroscope2D } from "./scene2d.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { PrismIndexFitter } from "./fit.js";
import {
  N_PRISM_TRUE,
  SOURCES,
  linesForSource,
  isContinuous,
  wienPeakNm
} from "./physics.js";
class PrismSpectroscopeInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { source: "continuous", temp: 5500, beamPhase: 0 };
    this.fit = new PrismIndexFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.prism_spectroscope." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    this._hud = el("div", "compton-hud bohr-hud");
    this.viewport.appendChild(this._hud);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.prism_spectroscope"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ffffff", label: this.T("legend.whiteBeam") },
      { color: "#38bdf8", label: this.T("legend.rainbow") },
      { color: "#fbbf24", label: this.T("legend.lines") }
    ]);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new PrismSpectroscope2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new PrismSpectroscopeScene(host);
        s.setParams(self.state);
        return s;
      }
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () {
      self.dual.resize();
    };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    card.appendChild(el("div", "field-label", this.T("controls.source")));
    this._srcBox = el("div", "chips");
    for (const s of SOURCES) {
      const b = el("button", "chip" + (s === this.state.source ? " active" : ""), this.T(`sources.${s}`));
      b.onclick = () => {
        this.state.source = s;
        for (const c of this._srcBox.children) c.classList.toggle("active", c === b);
        this._refresh();
      };
      this._srcBox.appendChild(b);
    }
    card.appendChild(this._srcBox);
    this._compare = el("div", "prism-compare");
    card.appendChild(this._compare);
    this._tempWrap = el("div", "field");
    paramSlider(this._tempWrap, {
      label: this.T("controls.temperature"),
      unit: " K",
      min: 2e3,
      max: 8e3,
      step: 50,
      value: this.state.temp,
      decimals: 0,
      help: this.T("controls.temperatureHelp"),
      onInput: (v) => {
        this.state.temp = v;
        this._refresh();
      }
    });
    card.appendChild(this._tempWrap);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.prism_spectroscope", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${N_PRISM_TRUE}`
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(void 0, logger);
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
  _refresh() {
    this.dual.setParams(this.state);
    const cont = isContinuous(this.state.source);
    this._tempWrap.style.display = cont ? "" : "none";
    this._compare.textContent = cont ? this.T("compare.continuous") : this.T("compare.line");
    this._compare.className = "prism-compare " + (cont ? "is-continuous" : "is-line");
    const peak = wienPeakNm(this.state.temp);
    const lines = linesForSource(this.state.source);
    const rows = cont ? [
      [this.T("info.spectrumType"), this.T("info.continuous")],
      [this.T("info.peakWavelength"), peak.toFixed(0) + " nm"],
      [this.T("info.whatYouSee"), this.T("info.rainbowExplain")]
    ] : [
      [this.T("info.spectrumType"), this.T("info.line")],
      [this.T("info.lineCount"), String(lines.length)],
      [this.T("info.whatYouSee"), this.T("info.linesExplain")]
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
    this._updateHud();
  }
  _updateHud() {
    const cont = isContinuous(this.state.source);
    this._hud.innerHTML = "";
    const badge = el("span", cont ? "inc" : "out", cont ? this.T("hud.continuous") : this.T("hud.line"));
    this._hud.appendChild(badge);
    const sub = el("span", "ang", cont ? this.T("hud.continuousSub") : this.T("hud.lineSub"));
    this._hud.appendChild(sub);
  }
  _tick() {
    if (this._chrome && this._chrome.paused) return;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    this.state.beamPhase = (this.state.beamPhase + 0.016 * 2.5) % (2 * Math.PI);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 0.5 && this.fit.iter > 8) {
        if (this._ai.logger) this._ai.logger.ok("Converged: n≈" + this.fit.estimate.toFixed(3) + ", error " + this.fit.errorPct.toFixed(2) + "%");
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", this.fit.estimate.toFixed(3));
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
  id: "prism_spectroscope",
  icon: "\u{1F53A}",
  navKey: "modules.prism_spectroscope.navTitle",
  titleKey: "modules.prism_spectroscope.title",
  descKey: "modules.prism_spectroscope.desc",
  create(ctx) {
    return new PrismSpectroscopeInstance(ctx);
  }
};
