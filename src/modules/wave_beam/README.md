# Wave Beam — Matter-Wave Packet (Ch.3 §2)

Localized packet: **Re(ψ)** inside **|ψ|²**, drifts with momentum, spreads with
dispersion. Inspired by
[physics-simulations.org wave packet](https://physics-simulations.org/simulation/wave-packet/).

## Views
- **2D** — stacked Re(ψ) (cyan) and |ψ|² (purple), like the reference
- **3D** — phase-coloured Re/Im ribbon corkscrew over a |ψ|² glow floor

## Controls
| Slider | Effect |
|---|---|
| Width | Initial Δx (narrower → larger Δk) |
| Momentum | Drift speed + carrier λ |
| Dispersion | How fast the packet spreads |

## AI
Discovers k in Δk = k/(2Δx) from noisy spread data.

## Files
- `physics.js` — packet evolution
- `scene2d.js` / `scene3d.js` — dual views
- `module.js` — dualView + AI
- `fit.js` — Δk–Δx search
