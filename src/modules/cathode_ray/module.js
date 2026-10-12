import { TubeScene } from "./scene3d.js";
import { EMFitter } from "./emfit.js";
import {
  speed,
  netDeflection,
  deflectionAtPlateExit,
  balanceB,
  GEO,
  EM_TRUE
} from "./physics.js";
import { el, principleCard, sceneLegend, aiHowBlock } from "../common/ui.js";
import { createAIPanelWithHow } from "../common/aiPanel.js";
import { wireExperimentScene } from "../common/sceneChrome.js";
class CathodeRayInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.state = { Vacc: 2e3, Vd: 300, B: 0 };
    this.fit = new EMFitter();
    this.training = false;
    this.hasData = false;
    this._tick = this._tick.bind(this);
  }
  mount(root) {
    root.classList.add("module-orbital");
    this.viewport = el("div", "viewport");
    this.hint = el("div", "hint", this.t("modules.cathode_ray.hint"));
    this.viewport.appendChild(this.hint);
    root.appendChild(this.viewport);
    this.panel = el("div", "panel");
    this.panel.appendChild(principleCard(this.t, "modules.cathode_ray"));
    this.panel.appendChild(this._buildApparatusCard());
    this.panel.appendChild(this._buildAICard());
    root.appendChild(this.panel);
    sceneLegend(this.viewport, this.t("common.legend"), [
      { color: "#ff5c7a", label: this.T("legend.plateP") },
      { color: "#4aa3ff", label: this.T("legend.plateN") },
      { color: "#fbbf24", label: this.T("legend.coils") },
      { color: "#22d3ee", label: this.T("legend.beam") },
      { color: "#8bffea", label: this.T("legend.spot") }
    ]);
    this.scene = new TubeScene(this.viewport);
    this._chrome = wireExperimentScene(this.viewport, this.scene, { t: this.t, prefix: "modules.cathode_ray" });
    this._resize = () => this.scene.resize();
    window.addEventListener("resize", this._resize);
    this._refresh();
    this.fit.init().then(() => {
      var _a;
      (_a = this._ai) == null ? void 0 : _a.setReadout("backend", this.fit.backendName.toUpperCase());
    });
    this._interval = setInterval(this._tick, 33);
  }
  T(k, v) {
    return this.t("modules.cathode_ray." + k, v);
  }
  _buildApparatusCard() {
    const card = el("div", "card");
    card.appendChild(el("div", "card-title", this.T("controls.title")));
    this._sVacc = this._slider(
      card,
      this.T("controls.vacc"),
      1e3,
      4e3,
      this.state.Vacc,
      100,
      " V",
      (v) => {
        this.state.Vacc = v;
        this._refresh();
      },
      this.T("controls.vaccHelp")
    );
    this._sVd = this._slider(
      card,
      this.T("controls.vd"),
      0,
      500,
      this.state.Vd,
      10,
      " V",
      (v) => {
        this.state.Vd = v;
        this._refresh();
      },
      this.T("controls.vdHelp")
    );
    this._sB = this._slider(
      card,
      this.T("controls.b"),
      0,
      2,
      this.state.B * 1e3,
      0.05,
      " mT",
      (v) => {
        this.state.B = v * 1e-3;
        this._refresh();
      },
      this.T("controls.bHelp")
    );
    const bal = el("button", "btn", this.T("controls.balance"));
    bal.style.marginTop = "12px";
    bal.onclick = () => {
      const Bb = balanceB(this.state.Vd, this.state.Vacc);
      this.state.B = Bb;
      this._sB.set(Bb * 1e3);
      this._refresh();
    };
    card.appendChild(bal);
    this._info = el("table", "info");
    card.appendChild(this._info);
    return card;
  }
  _slider(parent, label, min, max, value, step, unit, onInput, help) {
    const wrap = el("div", "param");
    const top = el("div", "row");
    top.appendChild(el("label", null, label));
    const val = el("span", "val", value.toFixed(step < 1 ? 2 : 0) + unit);
    top.appendChild(val);
    const s = el("input");
    s.type = "range";
    s.min = min;
    s.max = max;
    s.step = step;
    s.value = value;
    s.oninput = () => {
      val.textContent = (+s.value).toFixed(step < 1 ? 2 : 0) + unit;
      onInput(+s.value);
    };
    wrap.append(top, s);
    if (help) wrap.appendChild(el("div", "param-help", help));
    parent.appendChild(wrap);
    return { set: (v) => {
      s.value = v;
      val.textContent = (+v).toFixed(step < 1 ? 2 : 0) + unit;
    } };
  }
  _refresh() {
    const { Vacc, Vd, B } = this.state;
    const Y = netDeflection(Vd, B, Vacc);
    const y1 = deflectionAtPlateExit(Vd, B, Vacc);
    const v = speed(Vacc);
    this.scene.setBeam(y1, Y, { Vacc, Vd, B, v });
    const Bb = balanceB(Vd, Vacc);
    const status = Math.abs(Y) < 2e-4 ? this.T("controls.straight") : Y > 0 ? this.T("controls.up") : this.T("controls.down");
    const rows = [
      [this.T("controls.speed"), `${(v / 1e7).toFixed(2)} \xD710\u2077 m/s`],
      [this.T("controls.deflection"), `${(Y * 100).toFixed(2)} cm`],
      [this.T("controls.balanceB"), `${(Bb * 1e3).toFixed(3)} mT`],
      [this.T("controls.statusLabel"), status]
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
    this._ai = createAIPanelWithHow(this.t, "modules.cathode_ray", {
      onCollect: ({ logger }) => this._collect({ logger }),
      onToggleFind: ({ logger }) => this._toggleTrain({ logger }),
      readouts: [
        { key: "est", label: this.T("ai.estimate") },
        { key: "err", label: this.T("ai.error") },
        { key: "backend", label: this.T("ai.backend") }
      ],
      trueLine: `${this.T("ai.true")}: ${(EM_TRUE / 1e11).toFixed(4)} \xD710\xB9\xB9 C/kg`,
      showLossPlot: true,
      plotHeight: 150,
      legendHtml: `<span class="ex">${this.T("ai.fit")}</span><span class="pr">${this.T("ai.data")}</span>`
    }, aiHowBlock);
    this._measureBtn = this._ai.findBtn;
    this._measureBtn.textContent = this.T("ai.measure");
    this._ai.setReadout("backend", "\u2026");
    return this._ai.card;
  }
  _collect({ logger } = {}) {
    if (!this.fit.backendName) return;
    this.fit.generateData(150, 0.03, logger);
    this.hasData = true;
    this._measureBtn.disabled = false;
    this._drawPlot();
    this._updateReadouts();
  }
  _toggleTrain({ logger } = {}) {
    if (!this.hasData) return;
    this.training = !this.training;
    this._measureBtn.textContent = this.training ? this.T("ai.stop") : this.T("ai.measure");
    this._measureBtn.classList.toggle("primary", !this.training);
    if (this.training) logger == null ? void 0 : logger.info("Gradient descent started");
    else logger == null ? void 0 : logger.info("Training paused");
  }
  _tick() {
    var _a;
    if ((_a = this._chrome) == null ? void 0 : _a.paused) return;
    if (this.training && this.hasData) {
      this.fit.step(4);
      this._updateReadouts();
      this._drawPlot();
      if (this.fit.errorPct < 0.5 && this.fit.epoch > 200) this._toggleTrain({ logger: this._ai.logger });
    }
  }
  _updateReadouts() {
    if (!this.hasData) return;
    this._ai.setReadout("est", (this.fit.emEstimate / 1e11).toFixed(3) + "e11");
    this._ai.setReadout("err", this.fit.errorPct.toFixed(2) + "%");
    this._ai.pushLoss(this.fit.lastLoss);
    this._ai.refreshLogs();
  }
  _drawPlot() {
    const canvas = this._ai.plotCanvas;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, pad = 8;
    c.fillStyle = "#0a1122";
    c.fillRect(0, 0, W, H);
    if (!this.hasData) return;
    const C = GEO.L * (GEO.L / 2 + GEO.L2);
    const data = this.fit.data.map((d) => ({ x: d.B * Math.sqrt(1 / (2 * d.Vacc)), y: d.Y }));
    const xmax = Math.max(...data.map((d) => d.x)) * 1.05;
    const ymax = Math.max(...data.map((d) => d.y)) * 1.1;
    const X = (x) => pad + (W - 2 * pad) * x / xmax;
    const Yp = (y) => H - pad - (H - 2 * pad) * y / ymax;
    c.fillStyle = "#f472b6";
    for (const d of data) {
      c.beginPath();
      c.arc(X(d.x), Yp(d.y), 2, 0, 6.28);
      c.fill();
    }
    const slope = C * Math.sqrt(this.fit.emEstimate);
    c.strokeStyle = "#22d3ee";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(X(0), Yp(0));
    c.lineTo(X(xmax), Yp(slope * xmax));
    c.stroke();
  }
  unmount() {
    this.training = false;
    if (this._interval) clearInterval(this._interval);
    if (this._resize) window.removeEventListener("resize", this._resize);
    if (this.scene) this.scene.dispose();
    if (this.fit) this.fit.dispose();
  }
}
export default {
  id: "cathode_ray",
  icon: "📺",
  navKey: "modules.cathode_ray.navTitle",
  titleKey: "modules.cathode_ray.title",
  descKey: "modules.cathode_ray.desc",
  create(ctx) {
    return new CathodeRayInstance(ctx);
  }
};
