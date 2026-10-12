# Davisson–Germer (Ch.3 §1)

Electron diffraction from Ni crystal (d ≈ 218 pm). Peak at θ ≈ 50° for V ≈ 54 V.

## Principle
λ = h/√(2meV). Bragg condition nλ = d sin θ gives intensity peaks.

## The AI — discovers crystal spacing d
Grid search on d from noisy (V, peak θ) diffraction data.

## Files
- `physics.js` — NI_SPACING_PM, intensity model
- `fit.js` — CrystalSpacingFitter
- `module.js` — gun, crystal, detector canvas + I(θ) chart
