# X-Ray Discovery (Ch.2 §5)

Röntgen's 1895 discovery: cathode-ray tubes emit penetrating X-rays when
electrons strike a metal target.

## Principle
Electrons accelerated by tube voltage V produce bremsstrahlung X-rays. The
Duane–Hunt cutoff λ_min = hc/(eV) sets the shortest wavelength and maximum
photon energy.

## Physics
- `../xray/physics.js` — shared λ_min, hc constants
- Animated tube: electrons → target → X-ray fan → fluorescent hand

## The AI — discovers hc
Grid search on hc in λ_min = hc/V from noisy (V, λ_min) tube measurements.

## Files
- `physics.js` — re-exports cutoff helpers
- `fit.js` — DuaneHuntFitter
- `module.js` — 2D canvas (CanvasScene)
