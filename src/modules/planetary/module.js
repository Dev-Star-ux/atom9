import { PlanetaryScene } from "./scene3d.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { spawnElectrons, tickElectrons, orbitStatus, toSceneRadius } from "./physics.js";
import { OrbitRadiusFitter } from "./fit.js";
class PlanetaryInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { nElectrons: 3, baseRadius: 130, speed: 1, radiate: false };
    this.electrons = spawnElectrons(3, 130);
    this.fit = new OrbitRadiusFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.planetary." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    this._hud = el("div", "compton-hud bohr-hud");
    this.viewport.appendChild(this._hud);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.planetary"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ef4444", label: this.T("legend.nucleus") },
      { color: "#38bdf8", label: this.T("legend.electron") },
      { color: "#233047", label: this.T("legend.orbit") },
      { color: "#fbbf24", label: this.T("legend.photon") }
    ]);
    this.scene = new PlanetaryScene(this.viewport);
    this.scene.setElectrons(this.electrons);
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.planetary" });
    this._resize = () => {
      this.scene.resize();
    };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    this._compare = el("div", "prism-compare is-continuous");
    card.appendChild(this._compare);
    paramSlider(card, {
      label: this.T("controls.electrons"),
      unit: "",
      min: 1,
      max: 6,
      step: 1,
      value: this.state.nElectrons,
      decimals: 0,
      help: this.T("controls.electronsHelp"),
      onInput: (v) => {
        var _a, _b;
        this.state.nElectrons = Math.round(v);
        this.electrons = spawnElectrons(this.state.nElectrons, this.state.baseRadius);
        (_b = (_a = this.scene) == null ? void 0 : _a.setElectrons) == null ? void 0 : _b.call(_a, this.electrons);
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.radius"),
      unit: "",
      min: 70,
      max: 190,
      step: 5,
      value: this.state.baseRadius,
      decimals: 0,
      help: this.T("controls.radiusHelp"),
      onInput: (v) => {
        var _a, _b;
        this.state.baseRadius = v;
        this.electrons = spawnElectrons(this.state.nElectrons, v);
        (_b = (_a = this.scene) == null ? void 0 : _a.setElectrons) == null ? void 0 : _b.call(_a, this.electrons);
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.speed"),
      unit: "\xD7",
      min: 0.2,
      max: 2.5,
      step: 0.1,
      value: this.state.speed,
      decimals: 1,
      help: this.T("controls.speedHelp"),
      onInput: (v) => {
        this.state.speed = v;
      }
    });
    const row = el("div", "param");
    row.appendChild(el("label", null, this.T("controls.radiate")));
    this._radBtn = el("button", "chip", this.T("controls.radiateOff"));
    this._radBtn.onclick = () => {
      var _a, _b;
      this.state.radiate = !this.state.radiate;
      this._radBtn.textContent = this.state.radiate ? this.T("controls.radiateOn") : this.T("controls.radiateOff");
      this._radBtn.classList.toggle("active", this.state.radiate);
      if (!this.state.radiate) {
        this.electrons = spawnElectrons(this.state.nElectrons, this.state.baseRadius);
        (_b = (_a = this.scene) == null ? void 0 : _a.setElectrons) == null ? void 0 : _b.call(_a, this.electrons);
      }
      this._refresh();
    };
    row.appendChild(this._radBtn);
    card.appendChild(row);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.planetary", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      showLossPlot: true
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(this.state.baseRadius, 14, 0.05, logger);
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
  _tick() {
    var _a, _b;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    this.scene.setParams(this.state);
    this.scene.tick(0.04, (electrons, dt, opts) => tickElectrons(electrons, dt, { ...this.state, ...opts }));
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 2 && this.fit.iter > 6) {
        (_b = this._ai.logger) == null ? void 0 : _b.ok(`Converged: r\u2248${this.fit.estimate.toFixed(0)}, error ${this.fit.errorPct.toFixed(2)}%`);
        this._toggle({ logger: this._ai.logger });
      }
    }
    this._refresh();
  }
  _refresh() {
    var _a, _b;
    (_b = (_a = this.scene) == null ? void 0 : _a.setParams) == null ? void 0 : _b.call(_a, this.state);
    const st = orbitStatus(this.electrons, this.state.radiate);
    const sr = toSceneRadius(this.state.baseRadius).toFixed(1);
    this._compare.textContent = this.state.radiate ? this.T("compare.radiating") : this.T("compare.stable");
    this._compare.className = "prism-compare " + (this.state.radiate ? "is-line" : "is-continuous");
    const rows = [
      [this.T("controls.count"), String(this.state.nElectrons)],
      [this.T("controls.status"), this.T(`status.${st}`)],
      [this.T("info.orbitSize"), `${sr} (scene units)`],
      [this.T("info.model"), this.T("info.solarSystem")]
    ];
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
    this._updateHud(st);
    if (this.hasData) this._updateAI();
  }
  _updateHud(st) {
    this._hud.innerHTML = "";
    const cls = st === "stable" ? "inc" : st === "collapsed" ? "out" : "shift";
    this._hud.appendChild(el("span", cls, this.T(`hud.${st}`)));
    this._hud.appendChild(el("span", "ang", this.T(`hud.${st}Sub`)));
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(0)}`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }
  unmount() {
    var _a;
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    window.removeEventListener("resize", this._resize);
    (_a = this.scene) == null ? void 0 : _a.dispose();
  }
}
export default {
  id: "planetary",
  icon: "\u2600\uFE0F",
  navKey: "modules.planetary.navTitle",
  titleKey: "modules.planetary.title",
  descKey: "modules.planetary.desc",
  create(ctx) {
    return new PlanetaryInstance(ctx);
  }
};
