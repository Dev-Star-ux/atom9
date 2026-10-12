# de Broglie Matter Waves (Ch.3 §1)

Every moving particle has wavelength **λ = h/p**. Wave nature becomes visible
for light particles (electrons) at atomic scales.

## Principle
de Broglie (1924): if light behaves as particles, particles behave as waves.
Momentum p = mv fixes λ = h/p. A baseball's λ is far too small to detect; an
electron's λ is picometres — the scale of atoms and crystal lattices.

## Physics
- `λ = h / (mv)`
- Electron λ from accelerating voltage (non-relativistic): `λ = h/√(2m_e eV)`
- Regimes: sub-atomic (< 1 pm), atomic (1 pm – 1 nm), macroscopic (unobservable)

## Parameters
| Control | Meaning |
|---|---|
| Particle | electron, proton, neutron, alpha — mass sets λ at given v. |
| Speed | Higher v → larger p → **shorter** λ. |

## The AI — discovers Planck constant h
Collect noisy `(p, λ)` pairs at random speeds. For candidate h, predict
`λ = h/p` and minimize relative squared error (`dbfit.js` — coarse-to-fine
search). Converges to h ≈ 6.626×10⁻³⁴ J·s.

## Files
- `physics.js` — masses, λ, momentum, regime helpers
- `dbfit.js` — h grid-search fitter
- `scene3d.js` — matter-wave ripple + moving particle, λ label
- `module.js` — λ vs 1/v plot, AI panel, viewport HUD

## Ported from
`D:\Atomic\Project\simulations\de_broglie.py`
