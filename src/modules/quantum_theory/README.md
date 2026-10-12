# Quantum Theory of Light (Ch.2 §2)

Einstein's photon model: E = hν, one photon frees one electron,
KE_max = hν − W. Below threshold ν₀ = W/h, no emission regardless of intensity.

## Principle
Animated photons strike a metal; electrons eject only above threshold.
KE_max vs frequency plot shows a straight line of slope h.

## The AI — discovers h
Grid search on h to fit noisy KE_max measurements at several frequencies.

## Files
- `physics.js` — materials, photon energy, threshold
- `fit.js` — h grid search
- `module.js` — canvas animation + KE plot + AI panel
