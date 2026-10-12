import { XrayParticleScene } from "./scene3d.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { PhotonEnergyFitter } from "./fit.js";
import { HC_KEV_NM, SHELLS, lambdaPmFromEnergyKeV, photoelectronKeV, canEject } from "./physics.js";
class XrayParticleInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { energy: 30, intensity: 60, shellIdx: 0 };
    this.photons = [];
    this.electrons = [];
    this._emit = 0;
    this._ionised = 0;
    this.fit = new PhotonEnergyFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.xray_particle." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.xray_particle"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#22d3ee", label: this.T("legend.photon") },
      { color: "#f472b6", label: this.T("legend.photoelectron") },
      { color: "#ef4444", label: this.T("legend.nucleus") }
    ]);
    this.scene = new XrayParticleScene(this.viewport);
    this.scene.setParams(this.state);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.xray_particle" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _shell() {
    return SHELLS[this.state.shellIdx];
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.energy"),
      unit: " keV",
      min: 5,
      max: 100,
      step: 1,
      value: this.state.energy,
      decimals: 0,
      help: this.T("controls.energyHelp"),
      onInput: (v) => {
        this.state.energy = v;
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.intensity"),
      unit: "%",
      min: 0,
      max: 100,
      step: 1,
      value: this.state.intensity,
      decimals: 0,
      onInput: (v) => {
        this.state.intensity = v;
      }
    });
    card.appendChild(el("div", "field-label", this.T("controls.shell")));
    this._shellBox = el("div", "chips");
    SHELLS.forEach((s, i) => {
      const b = el("button", "chip" + (i === this.state.shellIdx ? " active" : ""), this.T(`shells.${s.labelKey}`));
      b.onclick = () => {
        this.state.shellIdx = i;
        for (const c of this._shellBox.children) c.classList.toggle("active", c === b);
        this._refresh();
      };
      this._shellBox.appendChild(b);
    });
    card.appendChild(this._shellBox);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _refresh() {
    var _a, _b;
    (_b = (_a = this.scene) == null ? void 0 : _a.setParams) == null ? void 0 : _b.call(_a, this.state);
    const sh = this._shell();
    const lam = lambdaPmFromEnergyKeV(this.state.energy);
    const ke = photoelectronKeV(this.state.energy, sh.bindingKeV);
    const rows = [
      [this.T("controls.wavelength"), `${lam.toFixed(1)} pm`],
      [this.T("controls.binding"), `${sh.bindingKeV.toFixed(2)} keV`],
      [this.T("controls.photoelectron"), ke > 0 ? `${ke.toFixed(2)} keV` : this.T("controls.noEject")],
      [this.T("controls.ionised"), String(this._ionised)]
    ];
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.xray_particle", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${HC_KEV_NM.toFixed(4)} keV\xB7nm`,
      showLossPlot: false
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(0.035, 26, logger);
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
    var _a, _b, _c, _d, _e;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    (_c = (_b = this.scene) == null ? void 0 : _b.setParams) == null ? void 0 : _c.call(_b, this.state);
    (_e = (_d = this.scene) == null ? void 0 : _d.tick) == null ? void 0 : _e.call(_d, 0.04);
    const dt = 0.04;
    const w = this.scene.w || 400, h = this.scene.h || 300;
    const atomX = w * 0.55;
    const bind = this._shell().bindingKeV;
    const ke = photoelectronKeV(this.state.energy, bind);
    if (this.state.intensity > 0) {
      this._emit += dt * this.state.intensity * 0.04;
      while (this._emit >= 1) {
        this._emit -= 1;
        this.photons.push({ x: 30, y: h * (0.28 + Math.random() * 0.3), hit: false });
      }
    }
    for (const p of this.photons) {
      if (!p.hit) {
        p.x += 320 * dt;
        if (p.x >= atomX) {
          p.hit = true;
          if (ke > 0) {
            this._ionised++;
            const ang = -1.2 + Math.random() * 2.4;
            const speed = 80 + 40 * Math.sqrt(ke);
            this.electrons.push({
              x: atomX,
              y: p.y,
              vx: speed * Math.cos(ang),
              vy: speed * Math.sin(ang)
            });
          }
        }
      }
    }
    this.photons = this.photons.filter((p) => !p.hit);
    for (const e of this.electrons) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
    this.electrons = this.electrons.filter((e) => e.x > -20 && e.x < w + 20 && e.y > -20 && e.y < h + 20);
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 0.5 && this.fit.iter > 8) this._toggle({ logger: this._ai.logger });
    }
    if (Math.random() < 0.15) this._refresh();
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${this.fit.estimate.toFixed(4)} keV\xB7nm`);
    this._ai.setReadout("err", `${this.fit.errorPct.toFixed(2)}%`);
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
  id: "xray_particle",
  icon: "\u25C6",
  navKey: "modules.xray_particle.navTitle",
  titleKey: "modules.xray_particle.title",
  descKey: "modules.xray_particle.desc",
  create(ctx) {
    return new XrayParticleInstance(ctx);
  }
};
