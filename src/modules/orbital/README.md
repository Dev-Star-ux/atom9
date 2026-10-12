# 3D Orbital Explorer (Ch.3 §4)

See real hydrogen atomic orbitals in 3D, and watch a neural network learn the
wavefunction.

## Principle
An atomic electron isn't a dot on an orbit — it is a cloud of probability.
Solving the Schrödinger equation for hydrogen gives these clouds, the orbitals
`ψₙₗₘ`. Each dot drawn here is a likely electron position; blue/red mark where the
wavefunction is positive/negative, and the boundary between them is a **node**.

## Physics
- `ψₙₗₘ(r,θ,φ) = Rₙₗ(r)·Yₗₘ(θ,φ)` — radial part (associated Laguerre) × real
  spherical harmonic.
- Energy levels: `Eₙ = −13.6 / n² eV`.
- Node counts: total `n−1`, angular `ℓ`, radial `n−ℓ−1`.
- Point cloud sampled by rejection sampling with probability ∝ `|ψ|²`.
- Verified: `∫|ψ|²dV ≈ 1`, `R_2p(0)=0`, `R_1s(0)=2`.

## Parameters
| Control | Meaning |
|---|---|
| `n` principal | Shell / energy level. |
| `ℓ` azimuthal | Subshell shape (s, p, d, f). |
| `mₗ` magnetic | Orientation of the orbital. |
| Detail (points) | Cloud density vs. speed. |

## The AI — learns the wavefunction (PINN-style)
A small **neural network** maps radius `r` → wavefunction value. Starting from
random weights, it compares its curve to the exact radial probability and adjusts
every weight by **gradient descent** to shrink the error. Its curve converges onto
the true quantum solution — neural-network training shown live, in the browser.

## Files
- `../../wavefunction.js` — hydrogen math (shared, verified)
- `orbital3d.js` — Three.js glowing point-cloud renderer
- `pinn.js` — TensorFlow.js network that learns Rₙₗ(r) (WASM/CPU)
- `module.js` — UI (principle, parameters, AI panel)
- tests: `../../../test/test_math.mjs`, `../../../test/test_pinn.mjs`
