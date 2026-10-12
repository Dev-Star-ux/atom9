# Frank–Hertz Experiment (Ch.2 §3)

Accelerate electrons through gas; current **dips** at V = n·E₀/e — direct
evidence that atomic excitation energies are **quantized**.

## Principle
Electrons from a heated cathode gain KE = eV. Elastic collisions don't change
current much. When KE ≥ first excitation energy E₀, inelastic collisions leave
electrons with less energy — fewer reach the collector → **dip in I–V curve**.
Repeating dips at 2E₀, 3E₀, … prove quantization.

## Physics
- Model current with dips at multiples of E₀ (gas-specific E₀).
- Inelastic hits shown in 3D (electrons turn red after collision).

## Parameters
| Control | Meaning |
|---|---|
| Gas fill | Mercury, neon, … each has its own E₀. |
| Accelerating voltage | Sweep to cross excitation thresholds. |

## The AI — discovers excitation energy E₀
**Coarse-to-fine grid search** on E₀. Given noisy (V, I) pairs, score how well
the theoretical dip pattern matches. Window narrows until E₀ converges (e.g.
4.9 eV for mercury).

## Files
- `physics.js` — I–V model, gases, dip positions
- `fhfit.js` — E₀ grid search
- `scene3d.js` — tube, electrodes, gas atoms, electrons
- `module.js` — I–V chart, AI panel
