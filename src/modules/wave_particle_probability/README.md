# Wave–Particle & Probability (Ch.3 §3)

Born rule: **P(x) = |ψ|²**. Layout inspired by
[École Polytechnique — free wavepacket](https://www.quantum-physics.polytechnique.fr/freeWavepacket.php?lang=1):
**φ(p)** on top, **ψ(x)** below, phase as colour.

**2D only** — a 3D twin would not teach more than the dual panels.

## Views
| Chip | Shows |
|---|---|
| ψ(x) | Phase-coloured packet + optional Re ψ |
| \|ψ\|² | Probability density |
| Detections | Random hits rebuilding \|ψ\|² |

## Parameters
| Control | Meaning |
|---|---|
| Width σ | Packet width (wider x ⇒ narrower p) |
| Rate | Detection fire rate |
| Clear | Reset hits |

## AI
Grid search finds σ matching the detection histogram.

## Files
- `physics.js` — Gaussian ψ/φ, sampling, Δx Δp
- `scene2d.js` — Polytechnique-style dual panels
- `module.js` — controls + AI
- `fit.js` — σ search
