# Spectral Energy Density (Ch.2 §1 T1)

Blackbody spectral energy density u(λ,T) — energy per wavelength interval.

## Principle
Thermal radiation is described by u(λ,T). A movable cursor highlights a band
dλ and shows what fraction of total energy it holds.

## Physics
- Planck law: u(λ,T) = 8πhc/λ⁵ · 1/(e^{hc/λkT}−1)
- Wien peak: λ_max T = b

## Parameters
| Control | Meaning |
|---|---|
| Temperature | Blackbody temperature T |
| Cursor λ | Wavelength band centre |

## The AI — infers T from spectrum
Collects noisy u(λ) samples and grid-searches T to fit the Planck curve.

## Files
- `physics.js` — Planck u(λ,T), band fraction, wavelength grid
- `fit.js` — GridSearch1D temperature fitter
- `module.js` — spectrum plot canvas + AI panel
