import { DavissonGermerScene } from "./scene3d.js";
import { DavissonGermer2D } from "./scene2d.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { CrystalSpacingFitter } from "./fit.js";
import {
  NI_SPACING_PM,
  davissonPeakAngleDeg,
  davissonIntensity,
  electronWavelengthPm,
} from "./physics.js";

class DavissonGermerInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { voltage: 54, angle: 50 };
    this.fit = new CrystalSpacingFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.davisson_germer." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport dg-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.davisson_germer"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new DavissonGermer2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new DavissonGermerScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.davisson_germer", self.t));
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
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.voltage"),
      unit: " V",
      min: 20,
      max: 120,
      step: 1,
      value: this.state.voltage,
      decimals: 0,
      help: this.T("controls.voltageHelp"),
      onInput: (v) => {
        this.state.voltage = v;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.angle"),
      unit: "°",
      min: 20,
      max: 80,
      step: 1,
      value: this.state.angle,
      decimals: 0,
      help: this.T("controls.angleHelp"),
      onInput: (v) => {
        this.state.angle = v;
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("p", "param-help", this.T("note").replace("{d}", String(Math.round(NI_SPACING_PM)))));
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const voltage = this.state.voltage;
    const angle = this.state.angle;
    const lam = electronWavelengthPm(voltage);
    const peak = davissonPeakAngleDeg(voltage, NI_SPACING_PM);
    const intensity = davissonIntensity(angle, voltage, NI_SPACING_PM);
    this._info.replaceWith(infoTable([
      [this.T("controls.wavelength"), "λ = " + lam.toFixed(1) + " pm"],
      [this.T("controls.peakAngle"), peak != null ? peak.toFixed(1) + "°" : "—"],
      [this.T("controls.intensity"), intensity.toFixed(2) + " (rel.)"],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.davisson_germer", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      trueLine: this.T("ai.true") + ": " + NI_SPACING_PM.toFixed(0) + " pm",
      showLossPlot: false,
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(NI_SPACING_PM, 0.02, 20, logger);
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
      if (this.fit.errorPct < 1 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", this.fit.estimate.toFixed(1) + " pm");
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
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
  id: "davisson_germer",
  icon: "◇",
  navKey: "modules.davisson_germer.navTitle",
  titleKey: "modules.davisson_germer.title",
  descKey: "modules.davisson_germer.desc",
  create(ctx) {
    return new DavissonGermerInstance(ctx);
  },
};
