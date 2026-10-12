import { MillikanScene } from "./scene3d.js";
import { ChargeQuantumFinder } from "./chargefinder.js";
import { E_TRUE } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
class MillikanInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.finder = new ChargeQuantumFinder();
    this.searching = false;
    this.hasData = false;
    this.count = 48;
    this.noise = 0.03;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.millikan." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.hint = el("div", "hint", this.T("hint"));
    this.viewport.appendChild(this.hint);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.millikan"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    this.scene = new MillikanScene(this.viewport);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.millikan" });
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ff5c7a", label: this.T("legend.plateP") },
      { color: "#4aa3ff", label: this.T("legend.plateN") },
      { color: "#22d3ee", label: this.T("legend.drop") }
    ]);
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._collect({ logger: this._ai.logger });
    this._interval = setInterval(this._tick, 60);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    this.voltage = 400;
    this._voltSlider = paramSlider(card, {
      label: this.T("controls.voltage"),
      unit: " V",
      min: 0,
      max: 900,
      step: 20,
      value: this.voltage,
      help: this.T("controls.voltageHelp"),
      onInput: (v) => {
        this.voltage = v;
        if (this.scene) this.scene.setVoltage(v);
        this._updateInfo();
      }
    });
    this._countSlider = paramSlider(card, {
      label: this.T("controls.count"),
      unit: "",
      min: 12,
      max: 80,
      step: 4,
      value: this.count,
      onInput: (v) => {
        this.count = v;
        this._updateInfo();
      },
      decimals: 0
    });
    this._noiseSlider = paramSlider(card, {
      label: this.T("controls.noise"),
      unit: "",
      min: 0,
      max: 0.08,
      step: 5e-3,
      value: this.noise,
      decimals: 3,
      help: this.T("controls.noiseHelp"),
      onInput: (v) => {
        this.noise = v;
        this._updateInfo();
      }
    });
    const actions = el("div", "chips");
    const reset = el("button", "chip", this.T("controls.reset"));
    reset.type = "button";
    reset.onclick = () => this._reset();
    const newDrops = el("button", "chip", this.T("ai.collect"));
    newDrops.type = "button";
    newDrops.onclick = () => this._collect({ logger: this._ai && this._ai.logger });
    actions.appendChild(reset);
    actions.appendChild(newDrops);
    card.appendChild(actions);
    this._info = el("table", "info");
    card.appendChild(this._info);
    this._updateInfo();
    return card;
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.millikan", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
        { key: "iter", label: this.T("ai.iter") }
      ],
      trueLine: `${this.T("ai.true")}: ${E_TRUE.toFixed(4)} \xD710\u207B\xB9\u2079 C`,
      showLossPlot: true
    }, aiHowBlock);
    this._ai.findBtn.classList.add("primary");
    this._ai.findBtn.disabled = false;
    const chargesLabel = el("div", "field-label", this.T("ai.charges"));
    this._ai.card.insertBefore(chargesLabel, this._ai.plotCanvas);
    if (this._ai.lossCanvas) this._ai.lossCanvas.style.display = "none";
    const logBtn = this._ai.card.querySelector(".ai-log-btn");
    const landscapeLabel = el("div", "field-label", this.T("ai.landscape"));
    this._landscape = el("canvas", "ai-plot");
    this._landscape.width = 300;
    this._landscape.height = 90;
    this._ai.card.insertBefore(landscapeLabel, logBtn);
    this._ai.card.insertBefore(this._landscape, logBtn);
    return this._ai.card;
  }
  _reset() {
    this.voltage = 400;
    this.count = 48;
    this.noise = 0.03;
    if (this._voltSlider) this._voltSlider.set(this.voltage);
    if (this._countSlider) this._countSlider.set(this.count);
    if (this._noiseSlider) this._noiseSlider.set(this.noise);
    if (this.scene) this.scene.setVoltage(this.voltage);
    this._collect({ logger: this._ai && this._ai.logger });
  }

  _collect({ logger } = {}) {
    this.finder.generateData(this.count, this.noise, logger);
    this.hasData = true;
    this.searching = false;
    this._ai.findBtn.textContent = this.T("ai.find");
    this._ai.findBtn.classList.add("primary");
    this.scene.setDrops(this.finder.data);
    this._draw();
    this._update();
    this._ai.refreshLogs();
  }
  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.searching = !this.searching;
    this._ai.findBtn.textContent = this.searching ? this.T("ai.stop") : this.T("ai.find");
    this._ai.findBtn.classList.toggle("primary", !this.searching);
    if (this.searching) logger == null ? void 0 : logger.info("Grid search started");
    else logger == null ? void 0 : logger.info("Search paused");
  }
  _tick() {
    var _a, _b;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.searching && this.hasData) {
      this.finder.step(this._ai.logger);
      this._update();
      this._draw();
      if (this.finder.iter >= 12) {
        (_b = this._ai.logger) == null ? void 0 : _b.ok(`Converged: e\u2248${this.finder.estimate.toFixed(3)}e-19, error ${this.finder.errorPct.toFixed(2)}%`);
        this._toggle({ logger: this._ai.logger });
      }
    }
  }
  _update() {
    this._ai.setReadout("est", this.finder.estimate.toFixed(3) + "e-19");
    this._ai.setReadout("err", this.finder.errorPct.toFixed(2) + "%");
    this._ai.setReadout("iter", String(this.finder.iter));
    this._ai.pushLoss(this.finder.lastLoss);
    this._ai.refreshLogs();
    this._updateInfo();
  }

  _updateInfo() {
    if (!this._info) return;
    const hasEst = this.hasData && isFinite(this.finder.estimate);
    const rows = [
      [this.T("info.voltage"), this.voltage.toFixed(0) + " V"],
      [this.T("info.drops"), String(this.hasData ? this.finder.data.length : this.count)],
      [this.T("info.estimate"), hasEst ? this.finder.estimate.toFixed(3) + " ×10⁻¹⁹ C" : "—"],
      [this.T("info.error"), hasEst ? this.finder.errorPct.toFixed(2) + "%" : "—"],
      [this.T("info.trueE"), E_TRUE.toFixed(4) + " ×10⁻¹⁹ C"]
    ];
    this._info.innerHTML = "";
    for (let i = 0; i < rows.length; i++) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", rows[i][0]));
      tr.appendChild(el("td", "v", rows[i][1]));
      this._info.appendChild(tr);
    }
  }
  _draw() {
    const scatter = this._ai.plotCanvas;
    if (!scatter) return;
    const c = scatter.getContext("2d");
    const W = scatter.width, H = scatter.height, pad = 6;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    const data = this.finder.data;
    const qmax = Math.max(...data.map((d) => d.q)) * 1.08;
    const Y = (q) => H - pad - (H - 2 * pad) * q / qmax;
    const e = this.finder.estimate;
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 1;
    c.setLineDash([4, 3]);
    for (let k = 1; k * e <= qmax; k++) {
      const y = Y(k * e);
      c.beginPath();
      c.moveTo(pad, y);
      c.lineTo(W - pad, y);
      c.stroke();
    }
    c.setLineDash([]);
    c.fillStyle = "#f472b6";
    data.forEach((d, i) => {
      const x = pad + (W - 2 * pad) * i / (data.length - 1);
      c.beginPath();
      c.arc(x, Y(d.q), 2.2, 0, 6.28);
      c.fill();
    });
    const lc = this._landscape.getContext("2d");
    const LW = this._landscape.width, LH = this._landscape.height, lp = 6;
    lc.fillStyle = "#0a1122";
    lc.fillRect(0, 0, LW, LH);
    const curve = this.finder.lossCurve(160);
    const lmax = Math.max(...curve.map((p) => p.loss)) || 1;
    const [lo, hi] = this.finder.searchRange;
    const X = (ev) => lp + (LW - 2 * lp) * (ev - lo) / (hi - lo);
    const YL = (l) => LH - lp - (LH - 2 * lp) * l / lmax;
    lc.strokeStyle = "#4f8cff";
    lc.lineWidth = 1.6;
    lc.beginPath();
    curve.forEach((p, i) => {
      const x = X(p.e), y = YL(p.loss);
      i ? lc.lineTo(x, y) : lc.moveTo(x, y);
    });
    lc.stroke();
    lc.strokeStyle = "#34d399";
    lc.beginPath();
    lc.moveTo(X(E_TRUE), lp);
    lc.lineTo(X(E_TRUE), LH - lp);
    lc.stroke();
    lc.fillStyle = "#f472b6";
    lc.beginPath();
    lc.arc(X(e), YL(this.finder.combLoss(e)), 3, 0, 6.28);
    lc.fill();
  }
  unmount() {
    this.searching = false;
    if (this._interval) clearInterval(this._interval);
    if (this._resize) window.removeEventListener("resize", this._resize);
    if (this.scene) this.scene.dispose();
  }
}
export default {
  id: "millikan",
  icon: "\u{1F4A7}",
  navKey: "modules.millikan.navTitle",
  titleKey: "modules.millikan.title",
  descKey: "modules.millikan.desc",
  create(ctx) {
    return new MillikanInstance(ctx);
  }
};
