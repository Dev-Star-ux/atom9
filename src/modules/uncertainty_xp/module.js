import { UncertaintyXPScene } from "./scene3d.js";
import { UncertaintyXP2D } from "./scene2d.js";
import { el, principleCard, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { HbarFitter } from "./fit.js";
import {
  HBAR,
  HBAR_HALF,
  gaussianDx,
  gaussianDp,
  xpProduct,
} from "./physics.js";

class UncertaintyXPInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { sigma: 1e-10, excess: 1 };
    this.fit = new HbarFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.uncertainty_xp." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.uncertainty_xp"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new UncertaintyXP2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new UncertaintyXPScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.uncertainty_xp", self.t));
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
      unit: " Å",
      min: 0.2,
      max: 3,
      step: 0.05,
      value: this.state.sigma * 1e10,
      decimals: 2,
      help: this.T("controls.widthHelp"),
      onInput: (v) => {
        this.state.sigma = v * 1e-10;
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.excess"),
      unit: "×",
      min: 1,
      max: 4,
      step: 0.05,
      value: this.state.excess,
      decimals: 2,
      help: this.T("controls.excessHelp"),
      onInput: (v) => {
        this.state.excess = v;
        this._refresh();
      },
    });
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }

  _refresh() {
    if (this.dual) this.dual.setParams(this.state);
    const dx = gaussianDx(this.state.sigma);
    const dp = gaussianDp(this.state.sigma, this.state.excess);
    const product = xpProduct(this.state.sigma, this.state.excess);
    const above = product / HBAR_HALF - 1;
    const rows = [
      [this.T("controls.deltaX"), (dx * 1e10).toFixed(3) + " Å"],
      [this.T("controls.deltaP"), dp.toExponential(3) + " kg·m/s"],
      [this.T("controls.product"), product.toExponential(3) + " J·s"],
      [this.T("controls.limit"), "ℏ/2 = " + HBAR_HALF.toExponential(3) + " J·s"],
      [this.T("controls.above"), above < 0.005 ? this.T("status.saturated") : (above * 100).toFixed(1) + "%"],
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.uncertainty_xp", {
      onCollect: ({ logger }) => this._collect({ logger: logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger: logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      trueLine: this.T("ai.true") + ": " + HBAR.toExponential(4) + " J·s",
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(undefined, undefined, logger);
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
      if (this.fit.errorPct < 1 && this.fit.iter > 8) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: ℏ≈" + this.fit.estimate.toExponential(4) + " J·s, error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", this.fit.estimate.toExponential(4) + " J·s");
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
  id: "uncertainty_xp",
  icon: "⊗",
  navKey: "modules.uncertainty_xp.navTitle",
  titleKey: "modules.uncertainty_xp.title",
  descKey: "modules.uncertainty_xp.desc",
  create(ctx) {
    return new UncertaintyXPInstance(ctx);
  },
};
