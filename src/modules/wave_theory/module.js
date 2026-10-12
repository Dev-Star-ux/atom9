import { WaveTheoryScene } from "./scene3d.js";
import { WaveTheory2D } from "./scene2d.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { el, principleCard, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { HFromKEFitter } from "./fit.js";
import { classicalDelayS, keMaxEV } from "./physics.js";
class WaveTheoryInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { freq: 7, intensity: 60, accum: 0 };
    this.fit = new HFromKEFitter();
    this.searching = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.wave_theory." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.wave_theory"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    const self = this;
    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new WaveTheory2D(host);
        s.setParams(self.state);
        return s;
      },
      create3D: function (host) {
        const s = new WaveTheoryScene(host);
        s.setParams(self.state);
        return s;
      }
    });
    this.scene = this.dual;
    this._chrome = wireDualPause(this.viewport, this.dual, this.t);
    this._resize = function () { self.dual.resize(); };
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 40);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    paramSlider(card, {
      label: this.T("controls.frequency"),
      unit: " \xD710\xB9\u2074Hz",
      min: 3,
      max: 15,
      step: 0.1,
      value: this.state.freq,
      decimals: 1,
      help: this.T("controls.frequencyHelp"),
      onInput: (v) => {
        this.state.freq = v;
        this._refresh();
      }
    });
    paramSlider(card, {
      label: this.T("controls.intensity"),
      unit: "%",
      min: 5,
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
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.wave_theory", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: 6.626 \xD710\u207B\xB3\u2074 J\xB7s`
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
    const freq = this.state.freq;
    const intensity = this.state.intensity;
    const ke = keMaxEV(freq);
    const delay = classicalDelayS(intensity);
    const rows = [
      [this.T("info.delay"), delay.toFixed(1) + " s"],
      [this.T("info.actualKe"), ke > 0 ? ke.toFixed(2) + " eV" : this.T("info.none")]
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
  }
  _tick() {
    if (this._chrome && this._chrome.paused) return;
    this.dual.setParams(this.state);
    this.dual.tick(0.04);
    this.state.accum += 0.016 * this.state.intensity / 100 * 0.55;
    if (this.state.accum >= 1) this.state.accum = 0;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      if (this.fit.errorPct < 1 && this.fit.iter > 8) {
        if (this._ai.logger) this._ai.logger.ok("Converged: h≈" + (this.fit.estimate * 1e34).toFixed(2) + " ×10⁻³⁴ J·s, error " + this.fit.errorPct.toFixed(2) + "%");
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${(this.fit.estimate * 1e34).toFixed(2)} \xD710\u207B\xB3\u2074 J\xB7s`);
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
  id: "wave_theory",
  icon: "\u3030\uFE0F",
  navKey: "modules.wave_theory.navTitle",
  titleKey: "modules.wave_theory.title",
  descKey: "modules.wave_theory.desc",
  create(ctx) {
    return new WaveTheoryInstance(ctx);
  }
};
