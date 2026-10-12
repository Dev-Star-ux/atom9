# Cross-Section & Mean Free Path (Ch.1 §2)

Send a particle beam through a thin target slab; measure how many particles
**transmit** vs **scatter**. Infer the microscopic **cross-section σ**.

## Principle
Each target atom presents an effective area σ. A beam particle collides if it
passes within distance related to σ. Higher target density or larger σ → more
collisions → fewer particles emerge. Transmission follows
`T ≈ exp(−n σ L)` where n is number density and L is path length.

## Physics
- 2D cross-section model: `σ = π r²` (target radius r in scene units).
- Number density from atom count in slab volume.
- Monte Carlo: each beam particle has random impact parameter; hit if within σ.
- Mean free path: `λ = 1/(n σ)`.

## Parameters
| Control | Meaning |
|---|---|
| Target density | More atoms in slab → more collisions. |
| Target radius | Larger effective area σ → more collisions. |

## The AI — estimates σ from transmission data
**Coarse-to-fine grid search.** Collect transmission T at several densities.
For each candidate σ, predict `T = exp(−n σ L)` and score squared error vs
measurements. Window shrinks around the best σ each iteration until convergence.

## Files
- `physics.js` — σ, density, transmission, mean free path
- `crossfit.js` — grid-search fit for σ
- `scene3d.js` — beam, target slab, collision flashes
- `module.js` — UI + AI panel
