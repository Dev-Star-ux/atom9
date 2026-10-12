# Prism Spectroscope (Ch.2 §3)

White light from a hot solid gives a continuous spectrum; gas discharge lamps
give discrete line spectra. A prism disperses wavelengths onto a viewing screen.

## Principle
Switch between continuous (blackbody) and line sources (H, He, Na). Prism
deviation depends on wavelength and refractive index n.

## The AI — discovers prism index n
Collect noisy line positions for hydrogen. Grid search finds n that best
predicts dispersion angles.

## Files
- `physics.js` — spectral lines, dispersion, blackbody colour
- `fit.js` — n_prism grid search
- `module.js` — apparatus + spectrum strip canvas + AI panel
