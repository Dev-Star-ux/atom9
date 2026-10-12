# Photoelectric Applications (Ch.2 §2)

Two devices: photomultiplier tube (PMT) with dynode cascade, and solar cell
with p-n junction converting photons to current.

## Principle
PMT: one photoelectron triggers δ secondary electrons per dynode stage;
total gain ≈ δ^N. Solar: photons create e-h pairs swept by built-in field.

## The AI — discovers secondary emission factor δ
Collect noisy gain vs dynode-count data. Grid search finds δ in gain = δ^N.

## Files
- `physics.js` — PMT gain, solar current model
- `fit.js` — δ grid search
- `module.js` — interactive PMT/solar canvas + AI panel
