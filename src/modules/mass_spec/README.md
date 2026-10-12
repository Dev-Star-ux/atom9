# Mass Spectrometer — Isotopes (Ch.1 §1)

Separate ions by mass and identify an unknown element from its isotope pattern.

## Principle
The sample is ionised and accelerated to a fixed energy, then a magnetic field
bends each ion into a semicircle. Heavier ions are harder to bend, so they travel
a wider arc and land farther along the detector. The pattern of landing positions
— the mass spectrum — is a fingerprint unique to each element.

## Physics
- Radius in the field: `r = √(2·m·V/q)/B`  →  `r ∝ √(m/q)`
- Singly-charged ions of mass `m` land at `2r` on the detector.
- Each element has characteristic isotopes (mass + natural abundance), e.g.
  chlorine = 35 (76%) + 37 (24%).

## Parameters
| Control | Meaning |
|---|---|
| Accelerating voltage `V` | Ion energy; higher V → wider arcs. |
| Magnetic field `B` | Bending strength; higher B → tighter arcs. |
| Detector noise | Random scatter added to the measured spectrum. |

## The AI — identifies the element
**Pattern-recognition classification.** The AI knows each candidate element's
ideal isotope fingerprint. It compares the measured spectrum to each one with
**cosine similarity**, then converts the similarities into confidence percentages
with a **softmax**. The best match is its answer — the same idea used in image
recognition, applied to spectra. (100% accuracy on the built-in set in testing.)

## Files
- `physics.js` — isotope data, radius, spectrum vectors
- `classifier.js` — cosine-similarity + softmax classifier
- `scene3d.js` — 3D ion separation + detector spectrum
- `module.js` — UI (principle, parameters, AI panel with confidence bars)
- test: `../../../test/test_massspec.mjs`
