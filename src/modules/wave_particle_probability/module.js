import { WaveParticleProbability2D } from "./scene2d.js";
import { wireCanvasExperiment } from "../common/sceneChrome.js";
import { SigmaFitter } from "./fit.js";
import {
  VIEW_MODES,
  sigmaM,
  sampleHit,
  deltaX,
  deltaP,
  xpProduct,
  HBAR,
} from "./physics.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";

class WaveParticleProbabilityInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { mode: "wave", sigma: 50, rate: 50 };
    this.hits = [];
    this.fit = new SigmaFitter();
    this.searching = false;
    this.hasData = false;
    this._emit = 0;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.wave_particle_probability." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport wpp-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.wave_particle_probability"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.scene = new WaveParticleProbability2D(this.viewport);
    this.scene.setParams(this.state);
    this.scene.setHits(this.hits);
    this.scene.onModeChange = function (m) {
      self.state.mode = m;
      self._refresh();
    };
    this._chrome = wireCanvasExperiment(this.viewport, this.scene, { t: this.t });
    this._resize = function () { self.scene.resize(); };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.width"),
      unit: "",
      min: 20,
      max: 90,
      step: 1,
      value: this.state.sigma,
      decimals: 0,
      help: this.T("controls.widthHelp"),
      onInput: (v) => {
        this.state.sigma = v;
        this.hits = [];
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.rate"),
      unit: "%",
      min: 10,
      max: 100,
      step: 1,
      value: this.state.rate,
      decimals: 0,
      help: this.T("controls.rateHelp"),
      onInput: (v) => {
        this.state.rate = v;
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    card.appendChild(el("p", "param-help", this.T("notes." + this.state.mode)));
    this._note = card.querySelector(".param-help");
    const clearBtn = el("button", "btn", this.T("controls.clear"));
    clearBtn.onclick = () => {
      this.hits = [];
      this._refresh();
    };
    card.appendChild(clearBtn);
    return card;
  }

  _refresh() {
    if (this.scene) {
      this.scene.setParams(this.state);
      this.scene.setHits(this.hits);
    }
    const sm = sigmaM(this.state.sigma);
    const dxA = deltaX(sm) * 1e10;
    const dpPlot = deltaP(sm) / (HBAR / 1e-10);
    const prodH = xpProduct(sm) / HBAR;
    this._info.replaceWith(infoTable([
      [this.T("readouts.detections"), String(this.hits.length)],
      [this.T("readouts.deltaX"), dxA.toFixed(2) + " Å"],
      [this.T("readouts.deltaP"), dpPlot.toFixed(2) + " ħ/Å"],
      [this.T("readouts.product"), prodH.toFixed(2) + " ħ"],
      [this.T("readouts.interpretation"), this.T("meaning." + this.state.mode)],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
    if (this._note) this._note.textContent = this.T("notes." + this.state.mode);
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.wave_particle_probability", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
      ],
      showLossPlot: true,
      trueLine: this.T("ai.true") + ": " + this.state.sigma + " (arb. units)",
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(this.state.sigma, void 0, void 0, logger);
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
    if (logger) {
      logger.info(this.searching ? "Grid search started" : "Search paused");
    }
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;

    if (this.state.mode === "detections" && this.state.rate > 0) {
      this._emit += 0.04 * this.state.rate * 0.08;
      let added = false;
      while (this._emit >= 1) {
        this._emit -= 1;
        this.hits.push(sampleHit(sigmaM(this.state.sigma)));
        if (this.hits.length > 600) this.hits = this.hits.slice(-600);
        added = true;
      }
      if (added) {
        if (this.scene) this.scene.setHits(this.hits);
        this._refresh();
      }
    }

    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 8) {
        const nm = this.fit.estimate / 1e-10;
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: σ≈" + nm.toFixed(1) + " (arb.), error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _updateAI() {
    if (!this.hasData) return;
    const nm = this.fit.estimate / 1e-10;
    this._ai.setReadout("est", nm.toFixed(1) + " (arb.)");
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    if (this.scene && typeof this.scene.dispose === "function") this.scene.dispose();
  }
}

export default {
  id: "wave_particle_probability",
  icon: "◎",
  navKey: "modules.wave_particle_probability.navTitle",
  titleKey: "modules.wave_particle_probability.title",
  descKey: "modules.wave_particle_probability.desc",
  create(ctx) {
    return new WaveParticleProbabilityInstance(ctx);
  },
};
