# Wavefunction Statistics (Ch.3 §3)

Born's rule: **P(x)dx = |ψ|²dx**.

## Views
- **2D** — Wavefiz-style ψ / |ψ|² plot + detection histogram
- **3D** — *Born-rule chamber* (not a flat chart): glowing |ψ|² lobes,
  detections fall from the ceiling and stack on a detector strip

## Principle
Individual detections are random; stacks rebuild the theoretical |ψ_n|² pattern.
Raise **n** → more lobes (antinodes).

## AI
Discovers box width **a** from the hit histogram.

## Files
- `physics.js` — sampling / histogram
- `scene2d.js` — Wavefiz-style plots
- `scene3d.js` — measurement chamber
- `module.js` — dualView + AI
- `fit.js` — width search
