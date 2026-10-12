# Planetary Nuclear Model (Ch.2 §2)

Electrons orbit a tiny nucleus like planets around the Sun — the picture
Rutherford's scattering forced on physics.

## Principle
Almost all mass and positive charge sit in a tiny central nucleus; electrons
orbit far outside. Toggle classical radiation to see the fatal flaw: an
accelerating charge should spiral inward.

## Physics
- Kepler-like orbits: angular speed ω ∝ r^{-1.5}
- Optional radiative collapse: r decreases, electrons die at the nucleus

## Parameters
| Control | Meaning |
|---|---|
| Electrons | Number of orbiting electrons (1–6) |
| Orbit radius | Characteristic orbital size |
| Speed | Animation rate |
| Radiate | Classical energy loss → spiral collapse |

## The AI — infers orbit radius
Collects noisy orbital-period measurements and searches for the radius that
best reproduces Kepler-like timing.

## Files
- `physics.js` — spawn, tick, period sampling
- `fit.js` — GridSearch1D on orbit radius
- `module.js` — 2D canvas UI (principle, parameters, AI)
