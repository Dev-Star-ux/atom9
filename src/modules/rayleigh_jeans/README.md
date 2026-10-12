# Rayleigh–Jeans Law — UV Catastrophe (Ch.2 §1 T3)

Classical u = 8πkT/λ⁴ vs measured Planck spectrum.

## Principle
Rayleigh–Jeans matches experiment at long λ but diverges as λ→0 — infinite
total energy. Planck fixes the short-wavelength roll-off.

## Physics
- Classical: u_RJ = 8πkT/λ⁴
- Quantum: Planck u(λ,T)
- Ratio blows up in the ultraviolet

## Parameters
| Control | Meaning |
|---|---|
| Temperature | Cavity temperature |

## The AI — infers T from Planck spectrum
Noisy spectral samples; grid-search T to match the measured blackbody shape.

## Files
- `physics.js` — Rayleigh–Jeans & Planck densities
- `fit.js` — GridSearch1D temperature fitter
- `module.js` — overlaid curves + annotations
