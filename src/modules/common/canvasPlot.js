// 2-D plot helper for CanvasScene experiments (ported from Project plot.py).
export const CANVAS_COLORS = {
  accent: '#22d3ee',
  accent2: '#38bdf8',
  warn: '#fbbf24',
  muted: '#64748b',
  canvas_text: '#94a3b8',
};

export class Plot {
  constructor(ctx, box, xrange, yrange, colors = CANVAS_COLORS) {
    this.ctx = ctx;
    this.x0 = box[0];
    this.y0 = box[1];
    this.x1 = box[2];
    this.y1 = box[3];
    this.xmin = xrange[0];
    this.xmax = xrange[1];
    this.ymin = yrange[0];
    this.ymax = yrange[1];
    this.colors = colors;
  }

  X(x) {
    return this.x0 + (x - this.xmin) / (this.xmax - this.xmin) * (this.x1 - this.x0);
  }

  Y(y) {
    const clamped = Math.max(this.ymin, Math.min(this.ymax, y));
    return this.y1 - (clamped - this.ymin) / (this.ymax - this.ymin) * (this.y1 - this.y0);
  }

  axes(xlabel, ylabel, xticks = [], xtickFmt = (v) => String(Math.round(v))) {
    const { ctx, colors: c } = this;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x0, this.y0, this.x1 - this.x0, this.y1 - this.y0);
    ctx.fillStyle = c.canvas_text;
    ctx.font = '10px system-ui,sans-serif';
    for (const xv of xticks) {
      const px = this.X(xv);
      ctx.beginPath();
      ctx.moveTo(px, this.y1);
      ctx.lineTo(px, this.y1 + 4);
      ctx.stroke();
      ctx.fillText(xtickFmt(xv), px - 8, this.y1 + 14);
    }
    ctx.textAlign = 'center';
    ctx.fillText(xlabel, (this.x0 + this.x1) / 2, this.y1 + 28);
    ctx.textAlign = 'left';
    ctx.fillText(ylabel, this.x0 - 4, this.y0 - 6);
    ctx.textAlign = 'start';
  }

  curve(xs, ys, color, width = 2, dash = null) {
    const { ctx } = this;
    if (xs.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    xs.forEach((x, i) => {
      const px = this.X(x);
      const py = this.Y(ys[i]);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  vline(x, color, dash = [3, 3]) {
    const px = this.X(x);
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px, this.y0);
    ctx.lineTo(px, this.y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  bar(x, halfW, height, color) {
    const { ctx } = this;
    const left = this.X(x - halfW);
    const right = this.X(x + halfW);
    const top = this.Y(height);
    const bot = this.Y(0);
    ctx.fillStyle = color;
    ctx.fillRect(left, top, right - left, bot - top);
  }
}
