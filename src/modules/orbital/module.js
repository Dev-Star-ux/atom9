import { Orbital3D } from "./orbital3d.js";
import { WavefunctionNet } from "./pinn.js";
import {
  sampleCloud,
  orbitalLabel,
  energyEV,
  SHELL,
  clampL,
  clampM
} from "../../wavefunction.js";
import { el, principleCard, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
const PRESETS = [
  { label: "1s", n: 1, l: 0, m: 0 },
  { label: "2s", n: 2, l: 0, m: 0 },
  { label: "2p", n: 2, l: 1, m: 0 },
  { label: "3p", n: 3, l: 1, m: 1 },
  { label: "3d", n: 3, l: 2, m: 0 },
  { label: "4d", n: 4, l: 2, m: 1 },
  { label: "4f", n: 4, l: 3, m: 0 }
];
class OrbitalInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { n: 2, l: 1, m: 0, points: 12e3, autorotate: true };
    this.training = false;
    this.net = new WavefunctionNet();
    this._tick = this._tick.bind(this);
  }
  /** Orbital i18n keys live at root (ai.*, controls.*), not under modules.orbital. */
  _orbT(key, vars) {
    const k = key.startsWith("modules.orbital.") ? key.slice("modules.orbital.".length) : key;
    if (k.startsWith("ai.") || k.startsWith("controls.") || k === "hint" || k.startsWith("info.") || k.startsWith("legend.")) {
      return this.t(k, vars);
    }
    return this.t(key, vars);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.legend = el("div", "legend");
    this.legend.innerHTML = `<span class="p">${this.t("legend.pos")}</span><span class="n">${this.t("legend.neg")}</span>`;
    this.hint = el("div", "hint", this.t("hint"));
    this.viewport.appendChild(this.legend);
    this.viewport.appendChild(this.hint);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.orbital"));
    this.panel.appendChild(this._buildOrbitalCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    this.viz = new Orbital3D(this.viewport);
    this._resizeHandler = () => this.viz.resize();
    window.addEventListener("resize", this._resizeHandler);
    this.rebuildCloud();
    this._chrome = wireExperimentScene(this.viewport, this.viz, { t: this.t, prefix: "modules.orbital" });
    this._refreshInfo();
    this.net.init().then(() => {
      this.net.setTarget(this.state.n, this.state.l, this._ai.logger);
      this._ai.setReadout("backend", this.net.backendName.toUpperCase());
      this._drawAIPlot();
      this._ai.refreshLogs();
    });
    this._interval = setInterval(this._tick, 33);
  }
  _buildOrbitalCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.t("controls.title")));
    card.appendChild(el("div", "field-label", this.t("controls.presets")));
    this._presetBox = el("div", "presets");
    card.appendChild(this._presetBox);
    this._nLabel = el("div", "field-label", this.t("controls.n"));
    this._nBox = el("div", "chips");
    this._lLabel = el("div", "field-label", this.t("controls.l"));
    this._lBox = el("div", "chips");
    this._mLabel = el("div", "field-label", this.t("controls.m"));
    this._mBox = el("div", "chips");
    card.append(this._nLabel, this._nBox, this._lLabel, this._lBox, this._mLabel, this._mBox);
    const q = el("div", "field");
    const qtop = el("div", "row");
    qtop.appendChild(el("label", null, this.t("controls.quality")));
    this._qVal = el("span", "val", String(this.state.points));
    qtop.appendChild(this._qVal);
    const qs = el("input");
    qs.type = "range";
    qs.min = "3000";
    qs.max = "50000";
    qs.step = "1000";
    qs.value = String(this.state.points);
    qs.setAttribute("aria-valuemax", "50000");
    const self = this;
    let rebuildTimer = null;
    function applyPoints(v) {
      self._qVal.textContent = String(v);
      self.state.points = +v;
    }
    qs.oninput = function () {
      applyPoints(qs.value);
      // Rebuild while dragging (debounced) so the count change is visible
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(function () {
        self.rebuildCloud();
      }, 180);
    };
    qs.onchange = function () {
      if (rebuildTimer) clearTimeout(rebuildTimer);
      applyPoints(qs.value);
      self.rebuildCloud();
    };
    q.append(qtop, qs);
    const qHint = el("div", "param-help", "3,000 – 50,000 points");
    q.appendChild(qHint);
    card.appendChild(q);
    const ar = el("label", "toggle");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = this.state.autorotate;
    cb.onchange = () => {
      this.state.autorotate = cb.checked;
      this.viz.setAutoRotate(cb.checked);
    };
    ar.appendChild(cb);
    ar.appendChild(el("span", null, " " + this.t("controls.autorotate")));
    card.appendChild(ar);
    this._info = el("table", "info");
    card.appendChild(this._info);
    this._renderChips();
    this._renderPresets();
    return card;
  }
  _renderPresets() {
    this._presetBox.innerHTML = "";
    for (const p of PRESETS) {
      const active = this.state.n === p.n && this.state.l === p.l && this.state.m === p.m;
      const b = el("button", "preset" + (active ? " active" : ""), p.label);
      b.onclick = () => {
        this.state.n = p.n;
        this.state.l = p.l;
        this.state.m = p.m;
        this._onOrbitalChange();
      };
      this._presetBox.appendChild(b);
    }
  }
  _chip(text, active, disabled, onClick) {
    const c = el("button", "chip" + (active ? " active" : "") + (disabled ? " disabled" : ""), text);
    if (!disabled) c.onclick = onClick;
    return c;
  }
  _renderChips() {
    const s = this.state;
    this._nBox.innerHTML = "";
    for (let n = 1; n <= 4; n++) {
      this._nBox.appendChild(this._chip(String(n), s.n === n, false, () => {
        s.n = n;
        s.l = clampL(n, s.l);
        s.m = clampM(s.l, s.m);
        this._onOrbitalChange();
      }));
    }
    this._lBox.innerHTML = "";
    for (let l = 0; l <= 3; l++) {
      const dis = l > s.n - 1;
      this._lBox.appendChild(this._chip(`${l} (${["s", "p", "d", "f"][l]})`, s.l === l, dis, () => {
        s.l = l;
        s.m = clampM(l, s.m);
        this._onOrbitalChange();
      }));
    }
    this._mBox.innerHTML = "";
    for (let m = -s.l; m <= s.l; m++) {
      this._mBox.appendChild(this._chip((m > 0 ? "+" : "") + m, s.m === m, false, () => {
        s.m = m;
        this._onOrbitalChange();
      }));
    }
  }
  _onOrbitalChange() {
    this._renderChips();
    this._renderPresets();
    this.rebuildCloud();
    this._refreshInfo();
    if (this.net.backendName) {
      this.net.setTarget(this.state.n, this.state.l, this._ai.logger);
      this._ai.lossHistory.length = 0;
      this._drawAIPlot();
      this._ai.refreshLogs();
    }
  }
  rebuildCloud() {
    const { n, l, m, points } = this.state;
    const cloud = sampleCloud(n, l, m, points);
    this.viz.setCloud(cloud);
    this.viz.setAutoRotate(this.state.autorotate);
    this.viz.setQuantumState(n, l, m, energyEV(n));
  }
  _refreshInfo() {
    const { n, l, m } = this.state;
    const rows = [
      [orbitalLabel(n, l), `n=${n}, \u2113=${l}, m\u2097=${m}`],
      [this.t("info.energy"), `${energyEV(n).toFixed(2)} eV`],
      [this.t("info.shell"), SHELL[n - 1] || `n=${n}`],
      [this.t("info.nodes"), String(n - 1)],
      [this.t("info.radialAngular"), `${n - l - 1} / ${l}`]
    ];
    this._info.innerHTML = "";
    for (const [a, b] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", a));
      tr.appendChild(el("td", "v", b));
      this._info.appendChild(tr);
    }
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this._orbT.bind(this), "modules.orbital", {
      onToggleFind: ({ logger }) => this._toggleTrain({ logger }),
      readouts: [
        { key: "epoch", label: this.t("ai.epoch") },
        { key: "loss", label: this.t("ai.loss") },
        { key: "backend", label: this.t("ai.backend") }
      ],
      showLossPlot: true,
      plotHeight: 150,
      legendHtml: `<span class="ex">${this.t("ai.exact")}</span><span class="pr">${this.t("ai.predicted")}</span>`
    }, (t, key) => aiHowBlock(this.t, "ai.how"));
    this._ai.collectBtn.style.display = "none";
    this._ai.findBtn.textContent = this.t("ai.train");
    this._ai.findBtn.disabled = false;
    this._ai.findBtn.classList.add("primary");
    this._resetBtn = el("button", "btn", this.t("ai.reset"));
    this._resetBtn.onclick = () => this._reset({ logger: this._ai.logger });
    this._ai.findBtn.parentElement.appendChild(this._resetBtn);
    return this._ai.card;
  }
  _toggleTrain({ logger } = {}) {
    if (!this.net.backendName) return;
    this.training = !this.training;
    this._ai.findBtn.textContent = this.training ? this.t("ai.stop") : this.t("ai.train");
    this._ai.findBtn.classList.toggle("primary", !this.training);
    if (this.training) logger == null ? void 0 : logger.info("Training started");
    else logger == null ? void 0 : logger.info("Training paused");
  }
  _reset({ logger } = {}) {
    this.training = false;
    this._ai.findBtn.textContent = this.t("ai.train");
    this._ai.findBtn.classList.add("primary");
    this.net.setTarget(this.state.n, this.state.l, logger);
    this._ai.lossHistory.length = 0;
    this._drawAIPlot();
    this._updateReadouts();
    this._ai.refreshLogs();
    logger == null ? void 0 : logger.info("Network reset");
  }
  _tick() {
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.training && this.net.backendName) {
      this.net.step(3, this._ai.logger);
      this._updateReadouts();
      if (this.net.epoch % 2 === 0) {
        this._ai.pushLoss(this.net.lastLoss);
        this._drawAIPlot();
        this._ai.refreshLogs();
      }
    }
  }
  _updateReadouts() {
    this._ai.setReadout("epoch", String(this.net.epoch));
    this._ai.setReadout("loss", isNaN(this.net.lastLoss) ? "\u2014" : this.net.lastLoss.toExponential(2));
  }
  _drawAIPlot() {
    const plot = this._ai.plotCanvas;
    if (!plot) return;
    const c = plot.getContext("2d");
    const W = plot.width, H = plot.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    const pad = 8;
    const exact = this.net.pMax ? this.net.exactCurve(this.state.n, this.state.l, 120) : [];
    const pred = this.net.backendName ? this.net.predictCurve(120) : [];
    const drawCurve = (arr, color, width) => {
      if (!arr.length) return;
      c.strokeStyle = color;
      c.lineWidth = width;
      c.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = pad + (W - 2 * pad) * i / (arr.length - 1);
        const y = H - pad - (H - 2 * pad) * Math.max(0, Math.min(1, arr[i]));
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    };
    drawCurve(exact, "#22d3ee", 2.2);
    drawCurve(pred, "#f472b6", 2);
  }
  unmount() {
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    if (this._resizeHandler) window.removeEventListener("resize", this._resizeHandler);
    if (this.viz) this.viz.dispose();
    if (this.net) this.net.dispose();
  }
}
export default {
  id: "orbital",
  icon: '◉',
  navKey: "modules.orbital.navTitle",
  titleKey: "modules.orbital.title",
  descKey: "modules.orbital.desc",
  create(ctx) {
    return new OrbitalInstance(ctx);
  }
};
