# Schrödinger Equation (Ch.3 §4)

Schrödinger's equation governs ψ evolution. A **superposition** of box
eigenstates shows oscillating Re ψ and flowing |ψ|².

## Principle
iħ ∂ψ/∂t = Ĥψ. For ψ = ψ_{n₁} + ψ_{n₂}, probability density oscillates in
time — dynamical quantum behaviour.

## Physics
- Superposition ψ(x,t) and |ψ|²
- Uses `wavePhysics.js`: `psiSuperposition`, `probSuperposition`, `infiniteWellEnergyEV`

## Parameters
| Control | Meaning |
|---|---|
| Level n₁ | First eigenstate |
| Level n₂ | Second eigenstate (must exceed n₁) |

## The AI — discovers box width a
Collect quantised energies E_n. Grid search finds a from E_n = n²π²ħ²/(2ma²).

## Files
- `physics.js` — superposition curves
- `fit.js` — a grid search from energy levels
- `module.js` — ψ and |ψ|² time evolution
- Ported from `schrodinger_discovery.py`
