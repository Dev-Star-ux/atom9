// Shared "two point features" resolving-power demo. Draws two diffraction
// blobs (Airy-disk-like radial-gradient glows) separated by a fixed
// real-world distance, so the viewer can SEE whether a given microscope
// resolves them as two separate points or blurs them into one — the classic
// Rayleigh-criterion demonstration. Used by both the 2D canvas view
// (scene2d.js) and as a live detector-screen texture in the 3D view
// (scene3d.js), so the same physics-driven picture appears in both.
export function drawTwoPointBlobs(ctx, x0, y0, w, h, opts) {
  opts = opts || {};
  const dNm = Math.max(1e-4, opts.dNm || 1);
  const sepNm = opts.sepNm || 2;
  const core = opts.core || 'rgba(255,255,255,0.95)';
  const mid = opts.mid || 'rgba(56,189,248,0.85)';
  const bg = opts.bg;

  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y0, w, h);
  }

  // Fixed physical window: a few times the feature spacing, so the same
  // 2 nm gap is shown at the same "magnification" in every panel — a large
  // blob genuinely floods the whole window (unresolved), a tiny blob stays
  // a sharp dot inside it (resolved).
  const windowNm = Math.max(sepNm * 3, 6);
  const pxPerNm = (Math.min(w, h) * 0.82) / windowNm;
  const sepPx = sepNm * pxPerNm;
  const radiusPx = Math.max(1.4, dNm * pxPerNm);
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const gx = cx + (s * sepPx) / 2;
    const gy = cy;
    const rr = Math.max(radiusPx, 2) * 1.7;
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
    grad.addColorStop(0, core);
    grad.addColorStop(0.32, mid);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  return { resolved: dNm <= sepNm, cx, cy, sepPx, radiusPx };
}
