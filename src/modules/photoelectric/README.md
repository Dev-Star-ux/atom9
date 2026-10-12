# Photoelectric Effect — the Quantum of Light (Ch.2 §2)

Inspired by [Explerify photoelectric simulator](https://explerify.com/simulator-photo-electric-effect/).

## Views
- **2D** — labeled schematic (lamp → cathode → anode), hf vs φ bars, ammeter, Einstein KE plot
- **3D** — clear vacuum-tube apparatus: coloured photon beam, ejected electrons, anode glow when current flows

## Principle
`KE_max = hf − φ`. Below threshold frequency: no emission at any intensity.
Stopping voltage cancels the fastest electrons when `eV_s = KE_max`.

## AI
Gradient-descent fit of `V_s` vs `f` → slope `h/e` → Planck’s constant.

## Files
- `physics.js` — Einstein equation, colours
- `scene2d.js` / `scene3d.js` — dual views
- `module.js` — controls + AI
- `hfit.js` — line fit for h
