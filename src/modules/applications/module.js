import { ApplicationsScene } from "./scene3d.js";
import { Applications2D } from "./scene2d.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { DeltaFitter } from "./fit.js";
import { DELTA_TRUE, pmtGain } from "./physics.js";
class ApplicationsInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { device: "pmt", nDynodes: 6, delta: 3, intensity: 60 };
    this.fit = new DeltaFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.applications." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    this._hud = el("div", "compton-hud bohr-hud");
    this.viewport.appendChild(this._hud);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.applications"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#86efac", label: this.T("legend.photon") },
      { color: "#38bdf8", label: this.T("legend.electron") },
      { color: "#fbbf24", label: this.T("legend.anode") }
    ]);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new Applications2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new ApplicationsScene(host);
        s.setParams(self.state);
        return s;
      }
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this._syncPanels();
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    card.appendChild(el("div", "field-label", this.T("controls.device")));
    this._devBox = el("div", "chips");
    for (const d of ["pmt", "solar"]) {
      const b = el("button", "chip" + (d === this.state.device ? " active" : ""), this.T(`devices.${d}`));
      b.onclick = () => {
        this.state.device = d;
        for (const c of this._devBox.children) c.classList.toggle("active", c === b);
        this._syncPanels();
        this._refresh();
      };
      this._devBox.appendChild(b);
    }
    card.appendChild(this._devBox);
    this._compare = el("div", "prism-compare");
    card.appendChild(this._compare);
    this._pmtPanel = el("div");
    paramSlider(this._pmtPanel, {
      label: this.T("controls.dynodes"),
      unit: "",
      min: 3,
      max: 10,
      step: 1,
      value: this.state.nDynodes,
      decimals: 0,
      help: this.T("controls.dynodesHelp"),
      onInput: (v) => {
        this.state.nDynodes = Math.round(v);
        this._refresh();
      }
    });
    paramSlider(this._pmtPanel, {
      label: this.T("controls.secondary"),
      unit: "\xD7",
      min: 2,
      max: 5,
      step: 0.1,
      value: this.state.delta,
      decimals: 1,
      help: this.T("controls.secondaryHelp"),
      onInput: (v) => {
        this.state.delta = v;
        this._refresh();
      }
    });
    this._solarPanel = el("div");
    paramSlider(this._solarPanel, {
      label: this.T("controls.intensity"),
      unit: "%",
      min: 0,
      max: 100,
      step: 1,
      value: this.state.intensity,
      decimals: 0,
      help: this.T("controls.intensityHelp"),
      onInput: (v) => {
        this.state.intensity = v;
        this._refresh();
      }
    });
    card.appendChild(this._pmtPanel);
    card.appendChild(this._solarPanel);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _syncPanels() {
    this._pmtPanel.style.display = this.state.device === "pmt" ? "" : "none";
    this._solarPanel.style.display = this.state.device === "solar" ? "" : "none";
    const cont = this.state.device === "pmt";
    this._compare.textContent = cont ? this.T("compare.pmt") : this.T("compare.solar");
    this._compare.className = "prism-compare " + (cont ? "is-continuous" : "is-line");
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.applications", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${DELTA_TRUE.toFixed(1)}\xD7`
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
    this._syncPanels();
    const s3 = this.dual.scene3d;
    const s2 = this.dual.scene2d;
    let stats = {};
    if (s3 && typeof s3.getStats === "function") stats = s3.getStats() || {};
    else if (s2 && typeof s2.getStats === "function") stats = s2.getStats() || {};
    this._info.innerHTML = "";
    if (this.state.device === "pmt") {
      const gain = pmtGain(this.state.nDynodes, this.state.delta);
      const rows = [
        [this.T("info.gain"), gain.toLocaleString()],
        [this.T("info.formula"), "δ^N = " + this.state.delta.toFixed(1) + "^" + this.state.nDynodes],
        [this.T("info.pulses"), String(stats.pulseCount != null ? stats.pulseCount : 0)]
      ];
      for (let i = 0; i < rows.length; i++) {
        const tr = el("tr");
        tr.appendChild(el("td", "k", rows[i][0]));
        tr.appendChild(el("td", "v", rows[i][1]));
        this._info.appendChild(tr);
      }
    } else {
      const rows = [
        [this.T("info.current"), (stats.iUA != null ? stats.iUA : 0).toFixed(1) + " µA"],
        [this.T("info.power"), (stats.powerUW != null ? stats.powerUW : 0).toFixed(1) + " µW"],
        [this.T("info.intensity"), this.state.intensity + "%"]
      ];
      for (let i = 0; i < rows.length; i++) {
        const tr = el("tr");
        tr.appendChild(el("td", "k", rows[i][0]));
        tr.appendChild(el("td", "v", rows[i][1]));
        this._info.appendChild(tr);
      }
    }
    this._updateHud(stats);
  }
  _updateHud(stats) {
    this._hud.innerHTML = "";
    if (this.state.device === "pmt") {
      const gain = pmtGain(this.state.nDynodes, this.state.delta);
      this._hud.appendChild(el("span", "inc", this.T("hud.pmt")));
      this._hud.appendChild(el("span", "ang", this.T("hud.gain") + " ≈ " + gain.toLocaleString()));
    } else {
      this._hud.appendChild(el("span", "out", this.T("hud.solar")));
      this._hud.appendChild(el("span", "ang", (stats.iUA != null ? stats.iUA : 0).toFixed(1) + " µA"));
    }
  }
  _tick() {
    if (this._chrome && this._chrome.paused) return;
    this.dual.tick(0.04);
    this._refresh();
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) {
        if (this._ai.logger) this._ai.logger.ok("Converged: δ≈" + this.fit.estimate.toFixed(2) + "×, error " + this.fit.errorPct.toFixed(2) + "%");
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(2)}\xD7`);
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
  id: "applications",
  icon: '🧰',
  navKey: "modules.applications.navTitle",
  titleKey: "modules.applications.title",
  descKey: "modules.applications.desc",
  create(ctx) {
    return new ApplicationsInstance(ctx);
  }
};
