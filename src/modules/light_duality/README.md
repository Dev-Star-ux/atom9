# Wave–Particle Duality of Light (Ch.3 §1)

lookang / EJS-inspired double-slit lab: interference when unobserved;
which-path measurement destroys fringes. Both 2D and 3D views.

Reference: [Double Slit Wave Particle Duality Model](https://iwant2study.org/lookangejss/06QuantumPhysics/ejss_model_DoubleSlitWaveParticleDualitywee/index.html)

## Principle
- **Wave** — continuous interference fringes  
- **Photons (unobserved)** — discrete hits sample the interference probability  
- **Which-path (observed)** — detectors at the slits → two clumps, no fringes  

Tune frequency (λ) and slit separation d. Complementarity: you cannot see path and fringes together.

## The AI — discovers Planck constant h
Collect noisy photon-energy vs frequency measurements. Grid search finds h in E = hν.

## Files
- `physics.js` — hit probability, colours, λ / E helpers  
- `scene2d.js` / `scene3d.js` — dual teaching views  
- `fit.js` — h grid search  
- `module.js` — controls + AI panel  
