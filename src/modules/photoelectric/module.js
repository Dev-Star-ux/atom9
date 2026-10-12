import { PhotoScene } from "./scene3d.js";
import { Photoelectric2D } from "./scene2d.js";
import { PlanckFitter } from "./hfit.js";
import { METALS, thresholdFreq, keMaxEV, photocurrent, H_TRUE, E, C } from "./physics.js";
import { el, principleCard, paramSlider, aiHowBlock, infoTable } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { mountDualView, wireDualPause } from "../common/dualView.js";
import { loadModuleTips, bindSceneTips } from "../common/sceneChrome.js";

class PhotoInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { phi: 2.28, fHz: 7e14, intensity: 0.6, Vstop: 0 };
    this.fit = new PlanckFitter();
    this.training = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }

  T(k, v) {
    return this.t("modules.photoelectric." + k, v);
  }

  mount(root) {
    const self = this;
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport pe-viewport");
    this.viewport.appendChild(el("div", "hint", this.T("hint")));
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.photoelectric"));
    this.panel.appendChild(this._buildParamCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);

    this.dual = mountDualView(this.viewport, {
      t: this.t,
      initial: "2d",
      create2D: function (host) {
        const s = new Photoelectric2D(host);
        s.setParams(self.state);
        s.setActive(true);
        return s;
      },
      create3D: function (host) {
        const s = new PhotoScene(host);
        s.setParams(self.state);
        s.applyTips(loadModuleTips("modules.photoelectric", self.t));
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
    card.appendChild(el("div", "field-label", this.T("controls.metal")));
    this._metalBox = el("div", "chips");
    for (let i = 0; i < METALS.length; i++) {
      const m = METALS[i];
      const b = el("button", "chip" + (m.phi === this.state.phi ? " active" : ""), m.name);
      b.onclick = () => {
        this.state.phi = m.phi;
        this._onParam();
        for (let j = 0; j < this._metalBox.children.length; j++) {
          const c = this._metalBox.children[j];
          c.classList.toggle("active", c.textContent === m.name);
        }
      };
      this._metalBox.appendChild(b);
    }
    card.appendChild(this._metalBox);
    paramSlider(card, {
      label: this.T("controls.freq"),
      unit: " ×10¹⁴Hz",
      min: 3,
      max: 15,
      step: 0.2,
      value: this.state.fHz / 1e14,
      decimals: 1,
      help: this.T("controls.freqHelp"),
      onInput: (v) => {
        this.state.fHz = v * 1e14;
        this._onParam();
      },
    });
    paramSlider(card, {
      label: this.T("controls.intensity"),
      unit: "",
      min: 0.1,
      max: 1,
      step: 0.05,
      value: this.state.intensity,
      decimals: 2,
      help: this.T("controls.intensityHelp"),
      onInput: (v) => {
        this.state.intensity = v;
        this.dual.setParams({ intensity: v });
        this._refresh();
      },
    });
    paramSlider(card, {
      label: this.T("controls.vstop"),
      unit: " V",
      min: 0,
      max: 4,
      step: 0.1,
      value: this.state.Vstop,
      decimals: 1,
      help: this.T("controls.vstopHelp"),
      onInput: (v) => {
        this.state.Vstop = v;
        this.dual.setParams({ Vstop: v });
        this._refresh();
      },
    });
    this._info = infoTable([]);
    card.appendChild(this._info);
    return card;
  }

  _onParam() {
    this.dual.setParams(this.state);
    this._refresh();
  }

  _refresh() {
    const phi = this.state.phi;
    const fHz = this.state.fHz;
    const intensity = this.state.intensity;
    const Vstop = this.state.Vstop;
    const f0 = thresholdFreq(phi);
    const ke = keMaxEV(fHz, phi);
    const emits = fHz >= f0;
    const cur = photocurrent(fHz, intensity, Vstop, phi);
    const ePh = (H_TRUE * fHz) / E;
    const wl = (C / fHz) * 1e9;
    this._info.replaceWith(infoTable([
      [this.T("info.threshold"), (f0 / 1e14).toFixed(2) + " ×10¹⁴ Hz"],
      [this.T("info.photonE"), ePh.toFixed(2) + " eV"],
      [this.T("info.wavelength"), wl.toFixed(0) + " nm"],
      [this.T("info.emits"), emits ? this.T("info.yes") : this.T("info.no")],
      [this.T("info.ke"), emits ? ke.toFixed(2) + " eV" : "—"],
      [this.T("info.current"), cur > 0 ? this.T("info.flowing") : this.T("info.zero")],
    ]));
    this._info = this.panel.querySelector(".card:not(.ai) .info");
  }

  _buildAICard() {
    this._ai = createAIPanelWithHow(this.t, "modules.photoelectric", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggle({ logger }),
      readouts: [
        { key: "hEst", label: this.T("ai.hEst") },
        { key: "err", label: this.T("ai.error") },
        { key: "phiEst", label: this.T("ai.phi") },
      ],
      trueLine: this.T("ai.true") + ": 6.626 ×10⁻³⁴ J·s",
      showLossPlot: true,
      plotHeight: 150,
      legendHtml: '<span class="ex">' + this.T("ai.line") + '</span><span class="pr">' + this.T("ai.data") + "</span>",
    }, aiHowBlock);
    this._ai.findBtn.textContent = this.T("ai.measure");
    const plotLabel = el("div", "field-label", this.T("ai.plot"));
    this._ai.card.insertBefore(plotLabel, this._ai.plotCanvas);
    return this._ai.card;
  }

  _collect({ logger } = {}) {
    this.fit.generateData(this.state.phi, 0.05, 26, logger);
    this.hasData = true;
    this.training = false;
    this._ai.lossHistory.length = 0;
    this._ai.findBtn.disabled = false;
    this._ai.findBtn.textContent = this.T("ai.measure");
    this._ai.findBtn.classList.add("primary");
    this._draw();
    this._update();
    this._ai.refreshLogs();
  }

  _toggle({ logger } = {}) {
    if (!this.hasData) return;
    this.training = !this.training;
    this._ai.findBtn.textContent = this.training ? this.T("ai.stop") : this.T("ai.measure");
    this._ai.findBtn.classList.toggle("primary", !this.training);
    if (logger) logger.info(this.training ? "Gradient descent started" : "Training paused");
  }

  _tick() {
    if (this._chrome && this._chrome.paused) return;
    if (this.training && this.hasData) {
      for (let k = 0; k < 20; k++) this.fit.step(0.05, this._ai.logger);
      this._update();
      this._draw();
      if (this.fit.errorPct < 0.5 && this.fit.epoch > 400) {
        if (this._ai.logger) {
          this._ai.logger.ok(
            "Converged: h≈" + (this.fit.hEstimate * 1e34).toFixed(2) + "e-34, error " + this.fit.errorPct.toFixed(2) + "%"
          );
        }
        this._toggle({ logger: this._ai.logger });
      }
    }
  }

  _update() {
    if (!this.hasData) return;
    this._ai.setReadout("hEst", (this.fit.hEstimate * 1e34).toFixed(2) + "e-34");
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
    this._ai.setReadout("phiEst", this.fit.workFunctionEstimate.toFixed(2) + " eV");
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }

  _draw() {
    const plot = this._ai.plotCanvas;
    if (!plot) return;
    const c = plot.getContext("2d");
    const W = plot.width;
    const H = plot.height;
    const pad = 24;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    if (!this.hasData) return;
    const data = this.fit.data;
    const fs = data.map(function (d) { return d.f / 1e14; });
    const vss = data.map(function (d) { return d.Vs; });
    let fmin = fs[0];
    let fmax = fs[0];
    let vmin = 0;
    let vmax = vss[0];
    for (let i = 0; i < fs.length; i++) {
      if (fs[i] < fmin) fmin = fs[i];
      if (fs[i] > fmax) fmax = fs[i];
      if (vss[i] < vmin) vmin = vss[i];
      if (vss[i] > vmax) vmax = vss[i];
    }
    fmin *= 0.95;
    fmax *= 1.03;
    vmax *= 1.1;
    function X(f) { return pad + (W - pad - 6) * (f - fmin) / (fmax - fmin); }
    function Y(v) { return H - pad - (H - pad - 6) * (v - vmin) / (vmax - vmin); }
    c.strokeStyle = "#22304f";
    c.beginPath();
    c.moveTo(pad, 6);
    c.lineTo(pad, H - pad);
    c.lineTo(W - 6, H - pad);
    c.stroke();
    const line = this.fit.fittedLine();
    if (line.length) {
      c.strokeStyle = "#22d3ee";
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(X(line[0].f / 1e14), Y(line[0].Vs));
      c.lineTo(X(line[1].f / 1e14), Y(line[1].Vs));
      c.stroke();
    }
    c.fillStyle = "#f472b6";
    for (let i = 0; i < data.length; i++) {
      c.beginPath();
      c.arc(X(data[i].f / 1e14), Y(data[i].Vs), 2.4, 0, 6.28);
      c.fill();
    }
  }

  unmount() {
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    if (this._resize) window.removeEventListener("resize", this._resize);
    if (this.dual) this.dual.dispose();
  }
}

export default {
  id: "photoelectric",
  icon: "💡",
  navKey: "modules.photoelectric.navTitle",
  titleKey: "modules.photoelectric.title",
  descKey: "modules.photoelectric.desc",
  create(ctx) {
    return new PhotoInstance(ctx);
  },
};
