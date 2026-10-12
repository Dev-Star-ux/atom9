# Wave Theory vs Experiment (Ch.2 §2)

Classical wave predictions for the photoelectric effect fail: KE should grow with
intensity, any frequency should work if bright enough, and dim light should show
a delay. Experiment shows the opposite.

## Principle
Side-by-side comparison of classical wave theory (left) and quantum experiment
(right). Classical KE ∝ intensity; actual KE = hν − W depends only on frequency.

## The AI — discovers Planck constant h
Collect noisy KE_max vs frequency measurements. Grid search finds h that best
fits KE = hν − W.

## Files
- `physics.js` — photon energy, classical vs quantum KE
- `fit.js` — h grid search (GridSearch1D)
- `module.js` — 2D canvas animation + AI panel
