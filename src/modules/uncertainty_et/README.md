# Energy–Time Uncertainty (Ch.3 §2)

Short-lived excited states have **broad spectral lines**. The bound
**ΔE·Δt ≥ ħ/2** links natural linewidth to state lifetime.

## Principle
A state with lifetime τ has energy uncertainty ΔE ≈ ħ/2τ. The Lorentzian
spectrum has FWHM Γ ≈ 2ΔE. Shorter τ → broader line.

## Physics
- Decay envelope |ψ(t)|² = exp(−t/τ)
- Lorentzian energy distribution centred on E₀
- Uses `wavePhysics.js`: `energyUncertaintyEV`, `decayEnvelope`, `lorentzianEnergy`

## Parameters
| Control | Meaning |
|---|---|
| Lifetime τ | Excited-state lifetime (fs). Shorter → larger ΔE. |

## The AI — discovers ħ
Collect noisy (τ, ΔE) pairs. Grid search finds ħ that best satisfies
ΔE ≈ ħ/2τ (`fit.js` — `GridSearch1D`).

## Files
- `physics.js` — decay, spectrum, readouts
- `fit.js` — ħ grid search
- `module.js` — CanvasScene plots, AI panel
- Ported from `uncertainty_et.py`
