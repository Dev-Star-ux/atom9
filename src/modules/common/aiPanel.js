import { el } from "./ui.js";
export class AILogger {
  constructor() {
    this.lines = [];
    this.maxLines = 250;
  }
  clear() {
    this.lines = [];
  }
  log(level, msg) {
    const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString(void 0, { hour12: false });
    this.lines.push({ ts, level, msg: String(msg) });
    if (this.lines.length > this.maxLines) this.lines.shift();
  }
  info(msg) {
    this.log("info", msg);
  }
  data(msg) {
    this.log("data", msg);
  }
  step(msg) {
    this.log("step", msg);
  }
  warn(msg) {
    this.log("warn", msg);
  }
  ok(msg) {
    this.log("ok", msg);
  }
  render() {
    if (!this.lines.length) return "(no log entries yet \u2014 collect data and run Find)";
    return this.lines.map((l) => `[${l.ts}] ${l.level.toUpperCase().padEnd(5)} ${l.msg}`).join("\n");
  }
}
export function createAIPanel(t, prefix, {
  onCollect,
  onToggleFind,
  readouts = [],
  // [{ key, label }]
  showLossPlot = true,
  howKey
}) {
  const logger = new AILogger();
  const lossHistory = [];
  const card = el("div", "card ai");
  card.appendChild(el("div", "card-title", t(`${prefix}.ai.title`)));
  card.appendChild(el("p", "ai-desc", t(`${prefix}.ai.desc`)));
  if (howKey !== false) {
    const { aiHowBlock } = requireHow();
    card.appendChild(aiHowBlock(t, howKey || `${prefix}.ai.how`));
  }
  const btns = el("div", "ai-btns");
  const collectBtn = el("button", "btn primary", t(`${prefix}.ai.collect`));
  collectBtn.onclick = () => {
    logger.info(t("common.aiLogCollect"));
    onCollect == null ? void 0 : onCollect({ logger });
  };
  const findBtn = el("button", "btn", t(`${prefix}.ai.find`));
  findBtn.disabled = true;
  findBtn.onclick = () => onToggleFind == null ? void 0 : onToggleFind({ logger });
  btns.append(collectBtn, findBtn);
  card.appendChild(btns);
  const roWrap = el("div", "ai-readouts");
  const roEls = {};
  for (const r of readouts) {
    const row = el("div", "ai-ro");
    row.appendChild(el("span", "k", r.label));
    const v = el("span", "v", "\u2014");
    row.appendChild(v);
    roWrap.appendChild(row);
    roEls[r.key] = v;
  }
  card.appendChild(roWrap);
  let plotCanvas = null;
  let lossCanvas = null;
  if (showLossPlot) {
    plotCanvas = el("canvas", "ai-plot");
    plotCanvas.width = 300;
    plotCanvas.height = 130;
    card.appendChild(plotCanvas);
    lossCanvas = el("canvas", "ai-loss");
    lossCanvas.width = 300;
    lossCanvas.height = 54;
    card.appendChild(lossCanvas);
  }
  const logBtn = el("button", "btn ai-log-btn", t("common.aiLogs"));
  const logPanel = el("pre", "ai-log-panel");
  logPanel.style.display = "none";
  logBtn.onclick = () => {
    const open = logPanel.style.display === "none";
    logPanel.style.display = open ? "block" : "none";
    logBtn.classList.toggle("active", open);
    if (open) logPanel.textContent = logger.render();
  };
  card.appendChild(logBtn);
  card.appendChild(logPanel);
  function refreshLogs() {
    if (logPanel.style.display !== "none") logPanel.textContent = logger.render();
  }
  function pushLoss(loss) {
    if (!showLossPlot || loss == null || !Number.isFinite(loss)) return;
    lossHistory.push(loss);
    if (lossHistory.length > 240) lossHistory.shift();
    drawLossSparkline(lossCanvas, lossHistory);
  }
  function setReadout(key, val) {
    if (roEls[key]) roEls[key].textContent = val;
  }
  return {
    card,
    logger,
    collectBtn,
    findBtn,
    setReadout,
    pushLoss,
    refreshLogs,
    lossHistory,
    plotCanvas,
    lossCanvas
  };
}
function requireHow() {
  return {};
}
export function createAIPanelWithHow(t, prefix, opts, aiHowBlockFn) {
  const logger = new AILogger();
  const lossHistory = [];
  const card = el("div", "card ai");
  card.appendChild(el("div", "card-title", t(`${prefix}.ai.title`)));
  card.appendChild(el("p", "ai-desc", t(`${prefix}.ai.desc`)));
  if (aiHowBlockFn) card.appendChild(aiHowBlockFn(t, opts.howKey || `${prefix}.ai.how`));
  const btns = el("div", "ai-btns");
  const collectBtn = el("button", "btn primary", t(`${prefix}.ai.collect`));
  collectBtn.onclick = () => {
    var _a;
    logger.info(t("common.aiLogCollect"));
    (_a = opts.onCollect) == null ? void 0 : _a.call(opts, { logger });
  };
  const findBtn = el("button", "btn", t(`${prefix}.ai.find`));
  findBtn.disabled = true;
  findBtn.onclick = () => {
    var _a;
    return (_a = opts.onToggleFind) == null ? void 0 : _a.call(opts, { logger });
  };
  btns.append(collectBtn, findBtn);
  card.appendChild(btns);
  const roWrap = el("div", "ai-readouts");
  const roEls = {};
  for (const r of opts.readouts || []) {
    const row = el("div", "ai-ro");
    row.appendChild(el("span", "k", r.label));
    const v = el("span", "v", "\u2014");
    row.appendChild(v);
    roWrap.appendChild(row);
    roEls[r.key] = v;
  }
  card.appendChild(roWrap);
  if (opts.trueLine) {
    const tl = el("div", "ai-true", opts.trueLine);
    card.appendChild(tl);
  }
  let plotCanvas = null;
  let lossCanvas = null;
  if (opts.showLossPlot !== false) {
    plotCanvas = el("canvas", "ai-plot");
    plotCanvas.width = 300;
    plotCanvas.height = opts.plotHeight || 130;
    card.appendChild(plotCanvas);
    if (opts.legendHtml) {
      const lg = el("div", "ai-legend");
      lg.innerHTML = opts.legendHtml;
      card.appendChild(lg);
    }
    lossCanvas = el("canvas", "ai-loss");
    lossCanvas.width = 300;
    lossCanvas.height = 54;
    card.appendChild(lossCanvas);
  }
  const logBtn = el("button", "btn ai-log-btn", t("common.aiLogs"));
  const logPanel = el("pre", "ai-log-panel");
  logPanel.style.display = "none";
  logBtn.onclick = () => {
    const open = logPanel.style.display === "none";
    logPanel.style.display = open ? "block" : "none";
    logBtn.classList.toggle("active", open);
    if (open) logPanel.textContent = logger.render();
  };
  card.appendChild(logBtn);
  card.appendChild(logPanel);
  return {
    card,
    logger,
    collectBtn,
    findBtn,
    setReadout(k, v) {
      if (roEls[k]) roEls[k].textContent = v;
    },
    pushLoss(loss) {
      if (!lossCanvas || loss == null || !Number.isFinite(loss)) return;
      lossHistory.push(loss);
      if (lossHistory.length > 240) lossHistory.shift();
      drawLossSparkline(lossCanvas, lossHistory);
    },
    refreshLogs() {
      if (logPanel.style.display !== "none") logPanel.textContent = logger.render();
    },
    lossHistory,
    plotCanvas,
    lossCanvas
  };
}
export function drawLossSparkline(canvas, history) {
  if (!canvas || history.length < 2) return;
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  c.fillStyle = "#0a1122";
  c.fillRect(0, 0, W, H);
  const logs = history.map((v) => Math.log10(Math.max(v, 1e-12)));
  const mn = Math.min(...logs);
  const mx = Math.max(...logs);
  const span = mx - mn || 1;
  c.strokeStyle = "#4f8cff";
  c.lineWidth = 1.6;
  c.beginPath();
  logs.forEach((v, i) => {
    const x = (W - 4) * i / (logs.length - 1) + 2;
    const y = H - 4 - (H - 8) * (v - mn) / span;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
}
export function logGridStep(logger, { iter, estimate, loss, window, trueValue, label = "parameter" }) {
  const err = trueValue != null ? Math.abs(estimate - trueValue) / (Math.abs(trueValue) || 1) * 100 : null;
  logger.step(
    `iter ${iter}: ${label}=${formatSci(estimate)}, loss=${loss.toExponential(3)}` + (window ? `, search [${formatSci(window[0])}, ${formatSci(window[1])}]` : "") + (err != null ? `, error ${err.toFixed(2)}%` : "")
  );
}
export function formatSci(x) {
  if (x == null || !Number.isFinite(x)) return "\u2014";
  if (Math.abs(x) >= 1e4 || Math.abs(x) < 0.01 && x !== 0) return x.toExponential(3);
  return x.toFixed(4);
}
