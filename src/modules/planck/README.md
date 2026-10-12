# Planck Blackbody Radiation (Ch.2 §1)

A glowing cavity follows **Planck's law** — the first quantum formula. Compare
with the classical **Rayleigh–Jeans** catastrophe and measure **h**.

## Principle
Hot objects emit a continuous spectrum. Classical theory (`u ∝ 1/λ⁴`) diverges
at short wavelengths (UV catastrophe). Planck (1900) fixed it by assuming energy
comes in quanta `E = hν`, giving the correct blackbody curve.

## Physics
- Planck spectral density `u(λ,T,h)` vs Rayleigh–Jeans.
- Wien's law: peak wavelength `λ_max ∝ 1/T`.
- Stefan–Boltzmann: total power `∝ T⁴`.

## Parameters
| Control | Meaning |
|---|---|
| Temperature T | Cavity colour and peak wavelength shift. |
| h scale | Scale Planck curve (for comparing wrong h). |

## The AI — estimates Planck constant h
**Gradient descent on h.** Collect noisy spectral density points at several
wavelengths for known T. Adjust h to minimize relative error between measured
`u` and Planck prediction. Recovers h ≈ 6.626×10⁻³⁴ J·s.

## Files
- `physics.js` — Planck, RJ, Wien, Stefan–Boltzmann, spectrum helper
- `planckfit.js` — h optimizer
- `scene3d.js` — glowing cavity sphere (colour vs T)
- `module.js` — spectrum chart, AI panel
