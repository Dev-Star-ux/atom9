# Bohr Model of Hydrogen (Ch.2 §4)

Quantized circular orbits; electron on level **n** with
`E_n = −13.6/n² eV`. Hydrogen spectral lines follow the **Rydberg formula**.

## Principle
Bohr (1913) kept Rutherford's nucleus but added:
1. Only certain orbits (n = 1, 2, 3…) are allowed.
2. No radiation on a stationary orbit.
3. Photons emitted only when jumping **n₂ → n₁** (n₂ > n₁).

Orbit radius `r_n ∝ n²`; energy `E_n ∝ −1/n²`.

## Parameters
| Control | Meaning |
|---|---|
| Principal n | Which orbit the electron occupies. |
| Show all orbits | Display n = 1…6 rings for context. |

## Interactive emission lines
Click **Hα, Hβ, Hγ, Hδ** to animate the transition (e.g. 3→2 for Hα).
A photon leaves the atom; the spectrum chart and energy-level diagram highlight
the line. This connects the 3D orbits to real spectroscopy.

## The AI — measures Rydberg constant R_H
Collect hydrogen line wavelengths (with noise). Search for R_H minimizing error
in `1/λ = R_H(1/n₁² − 1/n₂²)` for all lines (`rhfit.js` — grid search).

## Files
- `physics.js` — energies, radii, Rydberg λ, H line catalog, RGB from λ
- `rhfit.js` — R_H fitter
- `scene3d.js` — nucleus, orbits (n labels), electron, transition animation
- `module.js` — level diagram, spectrum chart, clickable lines, AI panel
