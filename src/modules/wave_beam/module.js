import { WaveBeamScene } from "./scene3d.js";
import { WaveBeam2D } from "./scene2d.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { WaveSpreadFitter } from "./fit.js";
import { gaussianDk, sigmaMetres } from "./physics.js";

class WaveBeamInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { sigma: 40, momentum: 35, dispersion: 45 };
    this.fit = new WaveSpreadFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.wave_beam." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport wb-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.wave_beam"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new WaveBeam2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new WaveBeamScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.wave_beam", self.t));
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
        if (s3 && typeof s3.setActive === "function") {
          s3.setActive(mode === "3d");
          if (mode === "3d") s3.setParams(self.state);
        }
      },
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this.dual.resize();
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.width"),
      unit: "",
      min: 10,
      max: 100,
      step: 1,
      value: this.state.sigma,
      decimals: 0,
      help: this.T("controls.widthHelp"),
      onInput: (v) => {
        this.state.sigma = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.momentum"),
      unit: "",
      min: 5,
      max: 95,
      step: 1,
      value: this.state.momentum,
      decimals: 0,
      help: this.T("controls.momentumHelp"),
      onInput: (v) => {
        this.state.momentum = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.dispersion"),
      unit: "",
      min: 0,
      max: 100,
      step: 1,
      value: this.state.dispersion,
      decimals: 0,
      help: this.T("controls.dispersionHelp"),
      onInput: (v) => {
        this.state.dispersion = v;
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("p", "param-help", this.T("note")));
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const sigmaM = sigmaMetres(this.state.sigma);
    const dk = gaussianDk(sigmaM);
    this._info.replaceWith(infoTable([
      [this.T("controls.spread"), "Δx ≈ " + sigmaM.toExponential(2) + " m"],
      [this.T("controls.kSpread"), "Δk ≈ " + dk.toExponential(2) + " m⁻¹"],
      [this.T("controls.momentum"), String(this.state.momentum)],
      [this.T("controls.dispersion"), String(this.state.dispersion)],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.wave_beam", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      trueLine: this.T("ai.true") + ": 0.5",
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(void 0, void 0, logger);
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
    if (this.dual && typeof this.dual.tick === "function") this.dual.tick(0.04);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: k≈" + this.fit.estimate.toFixed(3) + ", error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", this.fit.estimate.toFixed(3));
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    if (this.dual && typeof this.dual.dispose === "function") this.dual.dispose();
  }
}

export default {
  id: "wave_beam",
  icon: "≋",
  navKey: "modules.wave_beam.navTitle",
  titleKey: "modules.wave_beam.title",
  descKey: "modules.wave_beam.desc",
  create(ctx) {
    return new WaveBeamInstance(ctx);
  },
};
