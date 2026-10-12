# Hydrogen Spectrum (Ch.2 §3)

Balmer, Lyman, and Paschen series follow 1/λ = R_H(1/n₁² − 1/n₂²).
Energy-level diagram links to spectrum strip and Rydberg overview.

## Principle
Pick a series and upper level n₂; see transition wavelength, photon energy,
and highlighted line on the spectrum.

## The AI — discovers Rydberg constant R_H
Collect noisy Balmer-line wavelengths. Grid search finds R_H minimizing
wavelength mismatch across all lines.

## Files
- `physics.js` — Rydberg formula, series, energy levels
- `fit.js` — R_H grid search
- `module.js` — level diagram + spectrum canvas + AI panel
