// Polyfills Canvas 2D APIs missing on older Chromium (e.g. roundRect = Chrome 99+).
// Safe no-op when the native method already exists.

function normalizeRadii(radii, w, h) {
  let tl = 0, tr = 0, br = 0, bl = 0;
  if (typeof radii === 'number') {
    tl = tr = br = bl = radii;
  } else if (Array.isArray(radii) && radii.length) {
    if (radii.length === 1) tl = tr = br = bl = radii[0];
    else if (radii.length === 2) { tl = br = radii[0]; tr = bl = radii[1]; }
    else if (radii.length === 3) { tl = radii[0]; tr = bl = radii[1]; br = radii[2]; }
    else { tl = radii[0]; tr = radii[1]; br = radii[2]; bl = radii[3]; }
  }
  const maxR = Math.min(Math.abs(w), Math.abs(h)) / 2;
  return [
    Math.max(0, Math.min(tl, maxR)),
    Math.max(0, Math.min(tr, maxR)),
    Math.max(0, Math.min(br, maxR)),
    Math.max(0, Math.min(bl, maxR)),
  ];
}

/** arcTo-based roundRect — works back to early Chrome / Canvas. */
export function roundRectPath(ctx, x, y, w, h, radii = 0) {
  const [tl, tr, br, bl] = normalizeRadii(radii, w, h);
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
}

export function installCanvasCompat() {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  const proto = CanvasRenderingContext2D.prototype;
  if (typeof proto.roundRect !== 'function') {
    proto.roundRect = function (x, y, w, h, radii) {
      roundRectPath(this, x, y, w, h, radii);
      return this;
    };
  }
}

installCanvasCompat();
