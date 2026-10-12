# Features of Blackbody Radiation (Ch.2 §1)

Inspired by
[Lookang EJS spectrum](https://iwant2study.org/lookangejss/04waves_13electromagneticspectrum/ejss_model_BlackbodyRadiationSpectrumwee/index.html),
[physics-simulations blackbody](https://physics-simulations.org/simulation/blackbody-radiation/),
and [space-charts](https://space-charts.vercel.app/).

## Views
- **2D** — Planck u(λ), visible rainbow band, Wien peak, colour orb, ghost 3000 K / 5800 K curves
- **3D** — Kirchhoff cavity + aperture emission + glowing thermal sphere (colour = T)

## Laws
- Wien: λ_max = b/T
- Stefan–Boltzmann: P/A = σT⁴

## AI
Infers T from a noisy Wien peak.

## Files
- `physics.js` — Planck, Wien, σT⁴, colour
- `scene2d.js` / `scene3d.js` — dual views
- `module.js` — controls + AI
- `fit.js` — T from λ_max
