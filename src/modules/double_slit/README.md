# Double-Slit Interference (Ch.3 §3)

Two slits produce fringes **I ∝ cos²(πdy/λL)** — classic wave interference.

## Principle
Path difference δ ≈ dy/L between slits gives constructive/destructive
interference on the screen.

## Physics
- Fringe spacing Δy = λL/d
- Uses `wavePhysics.js`: `doubleSlitIntensity`, `freqToNm`, `fringeSpacingM`

## Parameters
| Control | Meaning |
|---|---|
| Frequency | Light frequency (×10¹⁴ Hz) → λ |
| Separation d | Slit separation (µm) |
| Distance L | Slit-to-screen distance (m) |

## The AI — discovers slit separation d
Collect noisy fringe-spacing data. Grid search finds d from Δy = λL/d.

## Files
- `physics.js` — intensity profile, fringe spacing
- `fit.js` — d grid search
- `module.js` — apparatus + I(y) plot
- Ported from `double_slit.py`
