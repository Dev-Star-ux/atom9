import { BohrScene } from "./scene3d.js";
import { RydbergFitter } from "./rhfit.js";
import { energyLevelEV, orbitRadiusUnits, H_LINES, R_H, wavelengthToRgb, transitionEnergyEV } from "./physics.js";
import { el, principleCard, sceneLegend, paramSlider, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
class BohrInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { n: 3, showAll: true };
    this.fit = new RydbergFitter();
    this.searching = false;
    this.hasData = false;
    this._selectedLine = null;
    this._lineBtns = [];
    this._transMsg = null;
    this._tick = this._tick.bind(this);
  }
  T(k, v) {
    return this.t("modules.bohr." + k, v);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    this._buildFlowGuide();
    this._hud = el("div", "compton-hud bohr-hud");
    this.viewport.appendChild(this._hud);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.bohr"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ffd24a", label: this.T("legend.nucleus") },
      { color: "#22d3ee", label: this.T("legend.orbit") },
      { color: "#7fdfff", label: this.T("legend.electron") },
      { color: "#fbbf24", label: this.T("legend.photon") }
    ]);
    this.scene = new BohrScene(this.viewport);
    this.scene.setN(this.state.n);
    this.scene.onTransitionStart = ({ n2, n1 }) => {
      const line = H_LINES.find((l) => l.n2 === n2 && l.n1 === n1);
      this._transMsg = line ? this.T("hud.transition", { n2, n1, label: line.label, nm: line.nm.toFixed(1) }) : this.T("hud.falling", { n2, n1 });
      this._refreshHud();
    };
    this.scene.onTransitionComplete = (n1) => {
      this._transMsg = null;
      this.state.n = n1;
      this._nSlider.set(n1);
      this._refresh();
    };
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.bohr" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this._interval = setInterval(this._tick, 50);
  }
  _buildFlowGuide() {
    const flow = el("div", "scene-flow");
    const steps = ["flow.excited", "flow.jump", "flow.photon", "flow.line"];
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) flow.appendChild(el("span", "flow-arrow", "\u2192"));
      flow.appendChild(el("span", "flow-step", this.T(steps[i])));
    }
    this.viewport.appendChild(flow);
  }
  _buildParamCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    this._nSlider = paramSlider(card, {
      label: this.T("controls.n"),
      unit: "",
      min: 1,
      max: 6,
      step: 1,
      value: this.state.n,
      decimals: 0,
      help: this.T("controls.nHelp"),
      onInput: (v) => {
        if (this.scene.isTransitioning()) return;
        this.state.n = v;
        this.scene.setN(v);
        this._selectedLine = null;
        this._refresh();
      }
    });
    const chkWrap = el("div", "field");
    const lbl = el("label");
    const chk = el("input");
    chk.type = "checkbox";
    chk.checked = this.state.showAll;
    chk.onchange = () => {
      this.state.showAll = chk.checked;
      this.scene.setShowAll(chk.checked);
    };
    lbl.append(chk, document.createTextNode(" " + this.T("controls.showAll")));
    chkWrap.appendChild(lbl);
    card.appendChild(chkWrap);
    this._info = el("table", "info");
    card.appendChild(this._info);
    card.appendChild(el("div", "field-label", this.T("chart.levelsTitle")));
    this._levelCanvas = el("canvas", "ai-plot");
    this._levelCanvas.width = 300;
    this._levelCanvas.height = 110;
    card.appendChild(this._levelCanvas);
    card.appendChild(el("div", "field-label", this.T("chart.linesTitle")));
    card.appendChild(el("div", "param-help", this.T("chart.linesHelp")));
    this._lineBox = el("div", "chips");
    card.appendChild(this._lineBox);
    this._specCanvas = el("canvas", "ai-plot massspec-chart");
    this._specCanvas.width = 300;
    this._specCanvas.height = 100;
    card.appendChild(this._specCanvas);
    return card;
  }
  _refresh() {
    const { n } = this.state;
    const E = energyLevelEV(n);
    const rows = [
      [this.T("info.level"), `n = ${n}`],
      [this.T("info.energy"), `${E.toFixed(2)} eV`],
      [this.T("info.radius"), `r \u221D n\xB2 \u2192 ${orbitRadiusUnits(n).toFixed(1)} units`],
      [this.T("info.meaning"), this.T("info.meaningText")]
    ];
    this._info.innerHTML = "";
    for (const [k, v] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k));
      tr.appendChild(el("td", "v", v));
      this._info.appendChild(tr);
    }
    this._rebuildLineChips();
    this._drawLevels();
    this._drawSpectrum();
    this._refreshHud();
  }
  _rebuildLineChips() {
    this._lineBox.innerHTML = "";
    this._lineBtns = [];
    H_LINES.forEach((line, i) => {
      const hex = `#${wavelengthToRgb(line.nm).toString(16).padStart(6, "0")}`;
      const dE = transitionEnergyEV(line.n1, line.n2);
      const measured = this.hasData ? this.fit.data[i] : null;
      const nmTxt = measured ? measured.nm.toFixed(1) : line.nm.toFixed(1);
      const b = el("button", "chip" + (this._selectedLine === i ? " active" : ""), `${line.label}  n=${line.n2}\u2192${line.n1}`);
      b.title = `${nmTxt} nm \xB7 \u0394E = ${dE.toFixed(2)} eV`;
      b.style.borderColor = hex;
      b.style.color = hex;
      b.onclick = () => this._playLine(i);
      this._lineBox.appendChild(b);
      this._lineBtns.push(b);
    });
  }
  _playLine(i) {
    if (this.scene.isTransitioning()) return;
    const line = H_LINES[i];
    this._selectedLine = i;
    this.state.n = line.n2;
    this._nSlider.set(line.n2);
    this.scene.playTransition(line.n2, line.n1, wavelengthToRgb(line.nm));
    for (let k = 0; k < this._lineBtns.length; k++) this._lineBtns[k].classList.toggle("active", k === i);
    this._drawSpectrum();
    this._drawLevels();
  }
  _refreshHud() {
    this._hud.innerHTML = "";
    if (this._transMsg) {
      const s = el("span", "out", this._transMsg);
      this._hud.appendChild(s);
      return;
    }
    const { n } = this.state;
    const E = energyLevelEV(n);
    this._hud.appendChild(el("span", "inc", `${this.T("hud.level")} n = ${n}`));
    this._hud.appendChild(el("span", "shift", `${this.T("hud.energy")} ${E.toFixed(2)} eV`));
    if (this._selectedLine != null) {
      const line = H_LINES[this._selectedLine];
      this._hud.appendChild(el("span", "ang", `${line.label} ${line.nm} nm`));
    } else {
      this._hud.appendChild(el("span", "ang", this.T("hud.clickLine")));
    }
  }
  _drawLevels() {
    const c = this._levelCanvas.getContext("2d");
    const W = this._levelCanvas.width, H = this._levelCanvas.height;
    const padL = 36, padR = 12, padT = 14, padB = 22;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "#1e293b";
    c.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    c.font = "10px system-ui,sans-serif";
    c.fillStyle = "#64748b";
    c.fillText("E", 8, padT + 10);
    c.fillText("0", padL - 4, padT + 4);
    const levels = [1, 2, 3, 4, 5, 6];
    const eMin = energyLevelEV(6);
    const yOf = (Ev) => padT + (H - padT - padB) * (0 - Ev) / (0 - eMin);
    for (const lv of levels) {
      const Ev = energyLevelEV(lv);
      const y = yOf(Ev);
      c.strokeStyle = lv === this.state.n ? "#22d3ee" : "#334155";
      c.lineWidth = lv === this.state.n ? 2 : 1;
      c.beginPath();
      c.moveTo(padL, y);
      c.lineTo(W - padR, y);
      c.stroke();
      c.fillStyle = lv === this.state.n ? "#22d3ee" : "#64748b";
      c.fillText(`n=${lv}`, padL + 4, y - 3);
      c.fillStyle = "#94a3b8";
      c.fillText(`${Ev.toFixed(1)} eV`, W - padR - 44, y - 3);
    }
    const yE = yOf(energyLevelEV(this.state.n));
    c.fillStyle = "#7fdfff";
    c.beginPath();
    c.arc(padL + 18, yE, 5, 0, Math.PI * 2);
    c.fill();
    if (this._selectedLine != null) {
      const line = H_LINES[this._selectedLine];
      c.strokeStyle = `#${wavelengthToRgb(line.nm).toString(16).padStart(6, "0")}`;
      c.setLineDash([3, 3]);
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(padL + 40, yOf(energyLevelEV(line.n2)));
      c.lineTo(padL + 40, yOf(energyLevelEV(line.n1)));
      c.stroke();
      c.setLineDash([]);
    }
  }
  _drawSpectrum() {
    const c = this._specCanvas.getContext("2d");
    const W = this._specCanvas.width, H = this._specCanvas.height;
    const pad = 24;
    const nmMin = 390, nmMax = 670;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "#1e293b";
    c.strokeRect(pad, pad - 6, W - 2 * pad, H - 2 * pad + 6);
    const X = (nm) => pad + (W - 2 * pad) * (nm - nmMin) / (nmMax - nmMin);
    c.font = "9px system-ui,sans-serif";
    c.fillStyle = "#64748b";
    for (const tick of [400, 500, 600, 650]) {
      c.fillText(`${tick}`, X(tick) - 8, H - 6);
    }
    c.fillText("\u03BB (nm)", W / 2 - 14, H - 6);
    H_LINES.forEach((line, i) => {
      const x = X(line.nm);
      const hex = `#${wavelengthToRgb(line.nm).toString(16).padStart(6, "0")}`;
      c.strokeStyle = hex;
      c.lineWidth = this._selectedLine === i ? 3 : 1.5;
      c.globalAlpha = this._selectedLine === i ? 1 : 0.75;
      c.beginPath();
      c.moveTo(x, pad - 4);
      c.lineTo(x, H - pad);
      c.stroke();
      c.globalAlpha = 1;
      if (this.hasData && this.fit.data[i]) {
        const mx = X(this.fit.data[i].nm);
        c.fillStyle = "#fbbf24";
        c.beginPath();
        c.arc(mx, H - pad - 8, 3, 0, Math.PI * 2);
        c.fill();
      }
    });
  }
  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.bohr", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") }
      ],
      trueLine: `${this.T("ai.true")}: ${(R_H / 1e7).toFixed(4)} \xD710\u2077 m\u207B\xB9`,
      showLossPlot: false
    }, aiHowBlock);
    this._findBtn = this._ai.findBtn;
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    this.fit.generateData(4e-3, logger);
    this.hasData = true;
    this.searching = false;
    this._findBtn.disabled = false;
    this._rebuildLineChips();
    this._drawSpectrum();
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
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.searching && this.hasData) {
      this.fit.step();
      this._updateAI();
      this._drawSpectrum();
      if (this.fit.errorPct < 0.5 && this.fit.iter > 6) this._toggle();
    }
  }
  _updateAI() {
    if (!this.hasData) return;
    this._ai.setReadout("est", `${(this.fit.estimate / 1e7).toFixed(4)} \xD710\u2077 m\u207B\xB9`);
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
  id: "bohr",
  icon: "🪐",
  navKey: "modules.bohr.navTitle",
  titleKey: "modules.bohr.title",
  descKey: "modules.bohr.desc",
  create(ctx) {
    return new BohrInstance(ctx);
  }
};
