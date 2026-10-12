import { WavefunctionStatsScene } from "./scene3d.js";
import { WavefunctionStats2D } from "./scene2d.js";
import { WellWidthFitter } from "./fit.js";
import {
  DEFAULT_A,
  HIST_BINS,
  probAt,
  fireBatch,
  histogram,
} from "./physics.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { makeTeachCanvas, drawHistVsTheory } from "../common/teachPlots.js";

class WavefunctionStatsInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { n: 2, a: DEFAULT_A, viewMode: "density" };
    this.hits = [];
    this.fit = new WellWidthFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.wavefunction_stats." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport wfs-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.wavefunction_stats"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new WavefunctionStats2D(host);
        s.setParams(self.state);
        s.setHits(self.hits);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new WavefunctionStatsScene(host);
        s.setParams(self.state);
        s.setHits(self.hits);
        s.applyTips(loadModuleTips("modules.wavefunction_stats", self.t));
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
        if (mode === "3d" && s3 && typeof s3.setHits === "function") s3.setHits(self.hits);
        if (mode === "2d" && s2 && typeof s2.setHits === "function") s2.setHits(self.hits);
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
      label: this.T("controls.level"),
      unit: "",
      min: 1,
      max: 5,
      step: 1,
      value: this.state.n,
      decimals: 0,
      help: this.T("controls.levelHelp"),
      onInput: (v) => {
        this.state.n = Math.round(v);
        this.hits = [];
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("div", "field-label", this.T("panels.hist")));
    this._plot = makeTeachCanvas(card, "teach-plot tall");
    const fireBtn = el("button", "btn primary", this.T("controls.fire"));
    fireBtn.onclick = () => {
      this.hits.push(...fireBatch(this.state.n, this.state.a));
      this._refresh();
    };
    card.appendChild(fireBtn);
    const clearBtn = el("button", "btn", this.T("controls.clear"));
    clearBtn.onclick = () => {
      this.hits = [];
      this._refresh();
    };
    card.appendChild(clearBtn);
    return card;
  }

  _syncScenes() {
    if (!this.dual) return;
    this.dual.setParams(this.state);
    if (this.dual.scene2d && typeof this.dual.scene2d.setHits === "function") {
      this.dual.scene2d.setHits(this.hits);
    }
    if (this.dual.scene3d && typeof this.dual.scene3d.setHits === "function") {
      this.dual.scene3d.setHits(this.hits);
    }
  }

  _refresh() {
    this._syncScenes();
    this._info.replaceWith(infoTable([
      [this.T("readouts.total"), String(this.hits.length)],
      [this.T("readouts.normalised"), this.T("readouts.yes")],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
    if (this._plot) {
      const a = this.state.a;
      const hist = histogram(this.hits, a, HIST_BINS);
      const theoryXs = [];
      const theoryYs = [];
      for (let i = 0; i < 80; i++) {
        const x = a * i / 79;
        theoryXs.push(x);
        theoryYs.push(probAt(this.state.n, x, a));
      }
      drawHistVsTheory(this._plot, hist, theoryXs, theoryYs, a * 1e9);
    }
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.wavefunction_stats", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      showLossPlot: true,
      trueLine: this.T("ai.true") + ": " + (this.state.a * 1e9).toFixed(2) + " nm",
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    if (this.hits.length < 30) {
      this.hits.push(...fireBatch(this.state.n, this.state.a, 8));
      this._refresh();
    }
    this.fit.generateData(this.state.n, this.state.a, void 0, logger);
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
    if (this.searching) {
      if (logger) logger.info("Grid search started");
    } else if (logger) {
      logger.info("Search paused");
    }
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.dual && this.dual.scene3d && typeof this.dual.scene3d.tick === "function") {
      this.dual.scene3d.tick(0.04);
    }
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: a≈" + (this.fit.estimate * 1e9).toFixed(2) + " nm, error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", (this.fit.estimate * 1e9).toFixed(2) + " nm");
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
  id: "wavefunction_stats",
  icon: "≡",
  navKey: "modules.wavefunction_stats.navTitle",
  titleKey: "modules.wavefunction_stats.title",
  descKey: "modules.wavefunction_stats.desc",
  create(ctx) {
    return new WavefunctionStatsInstance(ctx);
  },
};
