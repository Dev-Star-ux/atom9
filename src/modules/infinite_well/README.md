# Particle in a Box (Ch.3 §4)

**Infinite square well**: ψ_n = √(2/a) sin(nπx/a), E_n = n²π²ħ²/(2ma²).

## Principle
Wave function vanishes at walls. Only integer half-wavelengths fit — energies
are quantised as E_n ∝ n²/a².

## Physics
- Eigenfunctions, |ψ|², energy ladder
- Uses `wavePhysics.js`: `infiniteWellPsi`, `infiniteWellProb`, `infiniteWellEnergyEV`

## Parameters
| Control | Meaning |
|---|---|
| Level n | Quantum number (1–6) |
| Width a | Box size (nm) |

## The AI — discovers well width a
Collect noisy E_n measurements. Grid search finds a that reproduces the
quantised spectrum.

## Files
- `physics.js` — ψ, |ψ|², energy ladder
- `fit.js` — a grid search
- `module.js` — potential diagram + plots
- Ported from `infinite_well.py`
