# Cathode Ray Tube — Thomson (Ch.1 §1)

Discover the electron and measure its charge-to-mass ratio **e/m**, the way
J.J. Thomson did in 1897.

## Principle
Electrons boiled off a hot cathode are accelerated through a voltage `V_acc`,
then pass between charged plates (an electric field that pushes them one way) and
through magnetic coils (a field that pushes them the other way). When the two
forces cancel the beam is straight — a **velocity selector** — which pins down
the beam speed. The remaining deflection then gives e/m.

## Physics
- Beam speed from the accelerating voltage: `v = √(2·(e/m)·V_acc)`
- Electric deflection at the screen: `Y_E = (e/m)·(V_d/d)·L·(L/2+L₂)/v²`
- Magnetic deflection: `Y_B = (e/m)·B·L·(L/2+L₂)/v`
- Velocity-selector balance (`Y_E = Y_B`): `v = E/B = (V_d/d)/B`
- True value recovered: `e/m = 1.75882×10¹¹ C/kg`

## Parameters
| Control | Meaning |
|---|---|
| Accelerating voltage `V_acc` | Speeds up the electrons (faster beam). |
| Deflection voltage `V_d` | Electric field between the plates (deflects up). |
| Magnetic field `B` | Field from the coils (deflects down). |
| **Balance** button | Sets B to the velocity-selector value (straight beam). |

## The AI — measures e/m
A one-parameter **gradient-descent fit**. The magnetic deflection depends on e/m
via `Y_B = C·B·√((e/m)/(2V_acc))`. The AI is given many noisy `(B, V_acc, Y_B)`
measurements, starts from a wrong guess for e/m, and repeatedly nudges it to
minimise the mean-squared error between prediction and data. The estimate
converges to the true e/m — a fundamental constant *measured from data*.

## Files
- `physics.js` — deflection model, velocity selector, e/m extraction
- `emfit.js` — TensorFlow.js gradient-descent estimator (WASM/CPU)
- `scene3d.js` — 3D tube, plates, coils, deflecting beam, screen spot
- `module.js` — UI (principle, parameters, AI panel)
- test: `../../../test/test_cathode.mjs`
