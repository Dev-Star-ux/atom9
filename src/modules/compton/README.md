# Compton Effect (Ch.2 §5)

X-ray photons scatter off electrons; wavelength **increases** by
`Δλ = λ_C(1 − cos θ)`. Proves photons carry momentum.

## Principle
Compton (1923) treated scattering as a collision between a photon and a nearly
free electron. Energy and momentum conservation fix the wavelength shift vs
scattering angle θ. The shift depends only on **Compton wavelength**
λ_C = h/(m_e c).

## Physics
- `Δλ = λ_C (1 − cos θ)`
- Scattered wavelength `λ' = λ + Δλ`
- Recoil electron kinetic energy from energy balance.

## Parameters
| Control | Meaning |
|---|---|
| Incident wavelength λ | Initial photon energy. |
| Scattering angle θ | Larger θ → larger Δλ. |

## The AI — measures Compton wavelength λ_C
Collect noisy `(θ, Δλ)` measurements. Search for λ_C that best satisfies
`Δλ = λ_C(1 − cos θ)` across all angles (grid search / refinement in
`comptonfit.js`).

## Files
- `physics.js` — shift, scattered λ, electron KE, shift curve
- `comptonfit.js` — λ_C fitter
- `scene3d.js` — phased animation: incident → collision → scattered + recoil
- `module.js` — HUD, flow guide, Δλ vs θ chart, AI panel
