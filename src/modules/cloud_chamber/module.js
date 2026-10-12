import { CloudChamberScene } from "./scene3d.js";
import { CloudChamber2D } from "./scene2d.js";
import { ChamberSim, BATCH_SIZE, COL_THROUGH, COL_WIDE, COL_BACK } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";
import { ZFromBackscatterFitter } from "./fit.js";

class CloudChamberInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { energy: 55, zcharge: 79, persist: true, autoEmit: true, colorCode: true };
    this.counts = { total: 0, through: 0, wide: 0, back: 0 };
    this.fit = new ZFromBackscatterFitter();
    this.searching = false;
    this.hasData = false;
    this._sharedSim = new ChamberSim();
    this._sharedSim.setParams(this.state);
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.cloud_chamber." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.cloud_chamber"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: COL_THROUGH, label: this.T("legend.through") },
      { color: COL_WIDE, label: this.T("legend.wide") },
      { color: COL_BACK, label: this.T("legend.back") },
    ]);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new CloudChamber2D(host, self._sharedSim);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new CloudChamberScene(host, self._sharedSim);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.cloud_chamber", self.t));
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
        // Pull existing trails into the newly shown view
        if (mode === "3d" && s3 && typeof s3.syncFromSim === "function") s3.syncFromSim();
      },
    });
    this.scene = this.dual;
    // Ensure the initial view is marked active (onModeChange already ran with scenes)
    if (this.dual.scene2d && typeof this.dual.scene2d.setActive === "function") {
      this.dual.scene2d.setActive(this.dual.mode === "2d");
    }
    if (this.dual.scene3d && typeof this.dual.scene3d.setActive === "function") {
      this.dual.scene3d.setActive(this.dual.mode === "3d");
    }
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this.dual.resize();
    this._sharedSim.fireBatch(16);
    this._interval = setInterval(this._tick, 40);
  }

  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.energy"),
      unit: "",
      min: 20,
      max: 120,
      step: 1,
      value: this.state.energy,
      decimals: 0,
      help: this.T("controls.energyHelp"),
      onInput: (v) => {
        this.state.energy = v;
        this._sharedSim.setParams(this.state);
      },
    });
    paramSlider(card, {
      label: this.T("controls.zcharge"),
      unit: "",
      min: 10,
      max: 92,
      step: 1,
      value: this.state.zcharge,
      decimals: 0,
      help: this.T("controls.zchargeHelp"),
      onInput: (v) => {
        this.state.zcharge = v;
        this._sharedSim.setParams(this.state);
      },
    });

    const row = el("div", "param");
    row.appendChild(el("label", null, this.T("controls.persist")));
    this._persistBtn = el("button", "chip active", this.T("controls.persistOn"));
    this._persistBtn.onclick = () => {
      this.state.persist = !this.state.persist;
      this._persistBtn.textContent = this.state.persist ? this.T("controls.persistOn") : this.T("controls.persistOff");
      this._persistBtn.classList.toggle("active", this.state.persist);
      this._sharedSim.setParams(this.state);
    };
    row.appendChild(this._persistBtn);
    card.appendChild(row);

    const actions = el("div", "param cloud-actions");
    this._fireBtn = el("button", "btn primary", this.T("controls.fireBatch"));
    this._fireBtn.onclick = () => {
      this._sharedSim.fireBatch(BATCH_SIZE);
    };
    this._clearBtn = el("button", "btn", this.T("controls.clearTracks"));
    this._clearBtn.onclick = () => {
      this._sharedSim.clear();
      const s3 = this.dual && this.dual.scene3d;
      if (s3 && typeof s3.clearTracks === "function") s3.clearTracks();
      this.counts = { total: 0, through: 0, wide: 0, back: 0 };
      this._refreshInfo();
    };
    actions.appendChild(this._fireBtn);
    actions.appendChild(this._clearBtn);
    card.appendChild(actions);

    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.cloud_chamber", {
      onCollect: ({ logger }) => this._collect({ logger: logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger: logger }),
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
    this.fit.generateData(this.state.zcharge, this.state.energy, logger);
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
    // 3D advances the shared sim while active; 2D advances it in its canvas loop
    this.dual.tick(0.04);
    this.counts = this._sharedSim.counts;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 3 && this.fit.iter > 6) {
        if (this._ai.logger) {
          this._ai.logger.ok("Converged: Z≈" + Math.round(this.fit.estimate) + ", error " + this.fit.errorPct.toFixed(2) + "%");
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
    this._refreshInfo();
  }

  _refreshInfo() {
    const tot = this.counts.total || 1;
    const rows = [
      [this.T("controls.fired"), String(this.counts.total)],
      [this.T("controls.through"), this.counts.through + " (" + (100 * this.counts.through / tot).toFixed(0) + "%)"],
      [this.T("controls.wide"), this.counts.wide + " (" + (100 * this.counts.wide / tot).toFixed(0) + "%)"],
      [this.T("controls.back"), this.counts.back + " (" + (100 * this.counts.back / tot).toFixed(1) + "%)"],
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
    this._ai.setReadout("est", "Z ≈ " + Math.round(this.fit.estimate));
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
  id: "cloud_chamber",
  icon: "☁️",
  navKey: "modules.cloud_chamber.navTitle",
  titleKey: "modules.cloud_chamber.title",
  descKey: "modules.cloud_chamber.desc",
  create(ctx) {
    return new CloudChamberInstance(ctx);
  },
};
