# Rutherford Scattering — the Nucleus (Ch.1 §2)

Fire alpha particles at a foil and discover the atomic nucleus; deduce its
charge **Z** from the scattering pattern.

## Principle
Positively-charged alpha particles are repelled by the atom's positive charge.
Most pass far from it and barely bend, but a rare few aimed nearly dead-on are
flung sharply backward. That backscatter is only possible if the positive charge
is concentrated in a tiny, dense **nucleus** — not spread out. How often large
angles occur reveals the nuclear charge Z.

## Physics
- Coulomb trajectory, integrated numerically (velocity Verlet) for the 3D view.
- Impact parameter ↔ angle: `b = (D/2)·cot(θ/2)`, with `D = k·Z₁Z₂e²/E`.
- Rutherford's law (counts vs angle): `N(θ) ∝ Z² / sin⁴(θ/2)`.
- Head-on (`b=0`) → 180° backscatter.

## Parameters
| Control | Meaning |
|---|---|
| Target nucleus | Element = nuclear charge Z (Au, Ag, Cu, Al). |
| Alpha energy | Faster alphas bend less (less scattering). |

## The AI — infers the nuclear charge Z

### What the AI is given
After you click **Collect data**, the experiment simulates a **detector** that
counts scattered alphas at fixed angles θ = 20°, 28°, …, 160° (20 bins). Each
count is noisy but follows Rutherford's law for the **hidden** true Z of the
selected target. The AI is **not** told Z — only the list `(θᵢ, Nᵢ)`.

### Physical model (forward problem)
For a nucleus with charge Z, the expected count at angle θ is:

```
N(θ) = K · Z² / sin⁴(θ/2)
```

where `K = FIT_K · (1/E²)` lumps together beam flux, detector geometry, and
alpha energy E (held fixed during one measurement run). Taking logarithms
linearizes the unknown:

```
ln N = ln K + 2·ln Z − 4·ln sin(θ/2)
```

Only **Z** is unknown; `K` is a fixed calibration constant in code (`FIT_K`).

### Inverse problem (what the AI solves)
Find Z that makes predicted `ln N` match measured `ln N` at every angle.
Equivalently: minimize mean squared error in log-space:

```
L(Z) = (1/M) Σᵢ [ ln Nᵢ − ln K − 2 ln Z + 4 ln sin(θᵢ/2) ]²
```

### Implementation (`scatterfit.js`)
| Step | Detail |
|---|---|
| Backend | TensorFlow.js with **WASM** backend (falls back to CPU). Offline in browser. |
| Parameterization | Optimizer variable `u = ln Z` (log-space keeps Z > 0). Initial guess `Z ≈ 20` (deliberately wrong for gold Z=79). |
| Optimizer | **Adam**, learning rate 0.08, one or more steps per UI tick. |
| Loss | `tf.losses.meanSquaredError(obsLogN, predLogN)` where `predLogN = lnK + 2u − 4·logSinHalf`. |
| Data generation | True counts from `rutherfordCount(Ztrue, θ, FIT_K)`, then log-normal multiplicative noise (~6%). |
| Convergence | UI auto-stops when `\|Z_est − Z_true\| / Z_true < 0.4%` and epoch > 150. |

### Why log-space?
Counts span orders of magnitude (small at large θ, huge near forward angles).
Fitting in **ln N** weights relative errors evenly and makes the loss landscape
smoother for gradient descent — the same trick Rutherford used when comparing
ratios of counts, not raw numbers.

### UI feedback
- **Scatter plot**: pink dots = measured `(θ, N)`; cyan curve = AI's current `N(θ)`.
- **Loss sparkline**: log₁₀ of training loss vs epoch — should decrease as Z converges.
- Readouts: `Z ≈ …` and percent error vs true Z.

## Files
| File | Role |
|---|---|
| `physics.js` | Coulomb integrator, `scatteringAngle`, `rutherfordCount`, elements |
| `scatterfit.js` | TensorFlow.js Adam fit for `u = ln Z` |
| `scene3d.js` | 3D nucleus, alpha stream, trail buffer, click tips (θ, b) |
| `module.js` | Principle card, target/energy controls, AI panel, plots |
| `../../../test/test_rutherford.mjs` | Physics + fit sanity checks |

## Related
Changing target element resets collected data — the AI must re-measure for the
new hidden Z.
