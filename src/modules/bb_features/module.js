import { BBFeaturesScene } from "./scene3d.js";
import { Spectrum2D } from "./scene2d.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wienPeakNm, stefanBoltzmann } from "./physics.js";
import { WienTemperatureFitter } from "./fit.js";

class BBFeaturesInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { temp: 5e3 };
    this.fit = new WienTemperatureFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.bb_features." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport bb-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.bb_features"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new Spectrum2D(host, { mode: "planck" });
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new BBFeaturesScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.bb_features", self.t));
        if (s.camera && s.renderer && s.renderer.domElement) {
          bindSceneTips(self.viewport, {
            camera: s.camera,
            domElement: s.renderer.domElement,
            getPickables: function () {
              return typeof s.getPickables === "function" ? s.getPickables() : [];
            },
          });
        }
        return s;
      },
      onModeChange: function (mode, scenes) {
        const s2 = scenes && scenes.scene2d;
        const s3 = scenes && scenes.scene3d;
        if (s2 && typeof s2.setActive === "function") s2.setActive(mode === "2d");
        if (s3 && typeof s3.setActive === "function") s3.setActive(mode === "3d");
      },
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this.dual.resize();
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
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("p", "param-help", this.T("note")));
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.bb_features", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      showLossPlot: true,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(this.state.temp, logger);
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
    if (logger) logger.info(this.searching ? "Grid search started" : "Search paused");
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.dual) this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 6) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: T≈" + Math.round(this.fit.estimate) + " K, error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const peak = wienPeakNm(this.state.temp);
    const power = stefanBoltzmann(this.state.temp);
    const ratio = Math.pow(this.state.temp / 1e3, 4);
    this._info.replaceWith(infoTable([
      [this.T("info.wien"), peak.toFixed(0) + " nm"],
      [this.T("info.power"), power.toExponential(2) + " W/m²"],
      [this.T("info.ratio"), ratio.toFixed(1) + "× vs 1000 K"],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", Math.round(this.fit.estimate) + " K");
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
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
  id: "bb_features",
  icon: "🌡",
  navKey: "modules.bb_features.navTitle",
  titleKey: "modules.bb_features.title",
  descKey: "modules.bb_features.desc",
  create(ctx) {
    return new BBFeaturesInstance(ctx);
  },
};
