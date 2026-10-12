# Cloud Chamber — Alpha Tracks (Ch.2 §3)

Qualitative gold-foil experiment: alpha particles leave colour-coded tracks in a
mist chamber.

## Principle
Most alphas pass straight through (atom is mostly empty). Rare wide angles and
even rarer backscatter prove a tiny dense nucleus.

## Physics
- Coulomb repulsion from foil nuclei (numerical integration)
- Track colour by scattering angle θ

## Parameters
| Control | Meaning |
|---|---|
| Alpha energy | Beam speed / penetration |
| Nuclear charge Z | Target element (default gold Z=79) |
| Persist tracks | Keep fading trail history |

## The AI — infers Z from backscatter
Measures the backscatter fraction and searches Z so the empirical
backscatter model matches the observation.

## Files
- `physics.js` — chamber geometry, Coulomb step, track classes
- `fit.js` — GridSearch1D on nuclear charge Z
- `module.js` — 2D canvas tracks + counters + AI
