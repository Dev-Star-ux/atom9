# Millikan Oil Drop — the Elementary Charge (Ch.1 §1)

Show that electric charge is quantized and find the **elementary charge e**.

## Principle
A tiny oil drop carrying a few extra electrons floats between two charged plates
when the upward electric force balances gravity (`qE = mg`). Measuring many drops
shows their charges are all whole-number multiples of one smallest value — the
elementary charge.

## Physics
- Balance condition: `q·(V/d) = m·g`  →  `q = m·g·d / V`
- Charge is quantized: `q = n·e`, with `e = 1.602176634×10⁻¹⁹ C`
- Drop mass from radius/density: `m = (4/3)π r³ ρ`

## Parameters
| Control | Meaning |
|---|---|
| Plate voltage | Electric field strength; drops rise/fall/float around their balance voltage. |
| Number of drops | How many measurements to collect. |
| Measurement noise | Random scatter added to each measured charge. |

## The AI — discovers the charge quantum
**Unsupervised search.** The AI is told only that every charge should be a
multiple of some unknown quantum `e`. It scores a candidate `e` with a "comb"
mismatch `L(e) = mean sin²(π·qᵢ/e)`, which is zero exactly when every charge lands
on a multiple of `e`. A coarse-to-fine search finds the **largest** `e` that fits
all drops — the elementary charge. No answer is given; the AI finds the hidden
quantum from the data alone.

## Files
- `physics.js` — drop charges, balance voltage
- `chargefinder.js` — comb-loss coarse-to-fine search
- `scene3d.js` — 3D chamber, plates, floating drops (colour = # electrons)
- `module.js` — UI (principle, parameters, AI panel)
- test: `../../../test/test_millikan.mjs`
