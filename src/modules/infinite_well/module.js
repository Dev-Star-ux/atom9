import { InfiniteWellScene } from "./scene3d.js";
import { InfiniteWell2D } from "./scene2d.js";
import { WellAFitter } from "./fit.js";
import {
  DEFAULT_A,
  N_MAX,
  WellState,
  infiniteWellEnergyEV,
  energyRatio,
} from "./physics.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";

class InfiniteWellInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { n: 1, a: DEFAULT_A, speed: 1, viewMode: "reim" };
    this.well = new WellState();
    this.well.setLevel(1);
    this.well.setParams(this.state);
    this.fit = new WellAFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.infinite_well." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport well-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.infinite_well"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new InfiniteWell2D(host, self.well);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new InfiniteWellScene(host, self.well);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.infinite_well", self.t));
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
      label: this.T("controls.level"),
      unit: "",
      min: 1,
      max: N_MAX,
      step: 1,
      value: this.state.n,
      decimals: 0,
      help: this.T("controls.levelHelp"),
      onInput: (v) => {
        this.state.n = Math.round(v);
        this.well.setLevel(this.state.n);
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.width"),
      unit: " nm",
      min: 0.5,
      max: 2,
      step: 0.1,
      value: this.state.a * 1e9,
      decimals: 1,
      help: this.T("controls.widthHelp"),
      onInput: (v) => {
        this.state.a = v * 1e-9;
        this.well.setParams({ a: this.state.a });
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.speed"),
      unit: "×",
      min: 0,
      max: 3,
      step: 0.1,
      value: this.state.speed,
      decimals: 1,
      help: this.T("controls.speedHelp"),
      onInput: (v) => {
        this.state.speed = v;
        this.well.setParams({ speed: v });
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const n = this.well.dominantLevel();
    const a = this.state.a;
    const E = infiniteWellEnergyEV(n, a);
    const next = infoTable([
      [this.T("readouts.energy"), "E_" + n + " ≈ " + E.toFixed(3) + " eV (dominant)"],
      [this.T("readouts.nodes"), String(n - 1)],
      [this.T("readouts.ratio"), "E_n/E₁ = " + energyRatio(n)],
      [this.T("readouts.basis"), "n = 1…" + N_MAX + " (click clocks in 2D)"],
    ]);
    this._info.replaceWith(next);
    this._info = next;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.infinite_well", {
      onCollect: ({ logger }) => this._collect({ logger: logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger: logger }),
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
    this.fit.generateData(this.state.n, this.state.a, undefined, undefined, logger);
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
    if (this.dual) {
      this.dual.setParams(this.state);
      this.dual.tick(0.04);
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
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: "infinite_well",
  icon: "▭",
  navKey: "modules.infinite_well.navTitle",
  titleKey: "modules.infinite_well.title",
  descKey: "modules.infinite_well.desc",
  create(ctx) {
    return new InfiniteWellInstance(ctx);
  },
};
