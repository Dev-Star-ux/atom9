/**
 * Curated Lab Canvas experiments — deeper teaching layouts + guided notes.
 * Fields used by the knowledge panel: goal, physics, apparatus, observe, steps,
 * challenges, pitfalls (plus title/blurb for the list).
 */

export const EXPERIMENTS = [
  {
    id: 'detector_match',
    icon: '📡',
    level: 'intro',
    title: 'Match detector to particle',
    blurb: 'α→Si, β→GM, γ→NaI, n→³He — watch HIT vs MISS when the sensor is wrong.',
    goal: 'Learn which detector senses which radiation, and what “miss” means.',
    physics: [
      'Detectors are not universal. Each technology couples to a different interaction.',
      'α: Si surface-barrier (thin window / vacuum). Stopped by paper — never reach a thick γ crystal easily.',
      'β: GM tubes count ionizing trails well; they do not measure energy.',
      'γ: NaI / HPGe scintillation or semiconductor — photons need high-Z / thick sensors.',
      'n: Neutral — need capture converters (³He, BF₃, ¹⁰B) that make charged products.',
    ],
    equations: [
      '\\varepsilon = P(\\mathrm{register}\\,|\\,\\mathrm{particle},\\,\\mathrm{detector})',
    ],
    apparatus: 'Four parallel lanes: α→Si-α, β→GM, γ→NaI, n→³He. Green badges on each detector show what it senses.',
    observe: [
      'Each correct lane: mostly HIT flashes and rising hit counts.',
      'Swap a detector kind in Selected part (e.g. put NaI on the neutron lane) — MISS flashes dominate.',
      'AI log explains why a miss happened and which detector to try.',
    ],
    steps: [
      'Press Run and compare hit rates on all four detectors.',
      'Select the ³He card — read the sense badges (only n is green).',
      'Change the neutron-lane detector to GM — watch misses climb.',
      'Restore ³He. Try NaI on the α lane — α should mostly miss.',
    ],
    challenges: [
      'Build a “wrong on purpose” lane: γ → ³He — prove almost no counts.',
      'Put HPGe on the γ lane — still hits, teaching “γ family”.',
      'Wire one γ source to both NaI and GM — NaI should win on efficiency.',
    ],
    pitfalls: [
      'A miss is not always “particle disappeared” — often the detector simply cannot couple to that radiation.',
      'GM can see some γ (low ε) — rare hits do not mean it is a γ spectrometer.',
    ],
    nodes: [
      { id: 'a1', type: 'source', x: 40, y: 40, props: { kind: 'alpha', rate: 36, energyMeV: 5.5 } },
      { id: 'a2', type: 'detector', x: 420, y: 40, props: { kind: 'si_alpha' } },
      { id: 'b1', type: 'source', x: 40, y: 150, props: { kind: 'beta', rate: 36, energyMeV: 0.5 } },
      { id: 'b2', type: 'detector', x: 420, y: 150, props: { kind: 'gm' } },
      { id: 'g1', type: 'source', x: 40, y: 260, props: { kind: 'gamma', rate: 36, energyMeV: 0.662 } },
      { id: 'g2', type: 'detector', x: 420, y: 260, props: { kind: 'nai' } },
      { id: 'n1', type: 'source', x: 40, y: 370, props: { kind: 'neutron', rate: 36, energyMeV: 0.000025 } },
      { id: 'n2', type: 'detector', x: 420, y: 370, props: { kind: 'he3' } },
    ],
    wires: [
      { id: 'wa', from: 'a1', fromPort: 'beam', to: 'a2', toPort: 'beam' },
      { id: 'wb', from: 'b1', fromPort: 'beam', to: 'b2', toPort: 'beam' },
      { id: 'wg', from: 'g1', fromPort: 'beam', to: 'g2', toPort: 'beam' },
      { id: 'wn', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
    ],
  },
  {
    id: 'fission',
    icon: '💥',
    level: 'core',
    title: 'Induced fission (U-235)',
    blurb: 'Thermal n + ²³⁵U → fission neutrons, ~200 MeV, and a measurable energy branch.',
    goal: 'See how a thermal neutron can split ²³⁵U, releasing energy and more neutrons — the seed of a chain reaction.',
    physics: [
      'Induced fission: ¹n + ²³⁵U → (excited ²³⁶U*) → fragments + ν neutrons + γ/β cascade.',
      'Typical Q ≈ 200 MeV per fission (mostly fragment kinetic energy).',
      'Average neutrons per fission ν ≈ 2.4–2.5; if ≥1 causes another fission, a chain can grow.',
      'Thermal neutrons (E ≈ 0.025 eV) have a large fission cross-section on ²³⁵U — that is why reactors moderate neutrons.',
    ],
    equations: [
      'n + ^{235}U \\rightarrow FF_1 + FF_2 + \\nu\\,n + \\gamma',
      'Q \\sim 200\\,\\mathrm{MeV},\\quad \\nu \\approx 2.5',
    ],
    apparatus: 'Neutron source → U-235 target. Beam port feeds a count detector (escape neutrons). Energy port feeds an energy detector (~MeV deposit from the fission event).',
    observe: [
      'Fission counter in the live stats climbs when neutrons hit the target.',
      'Count detector sees delayed neutrons leaving the target.',
      'Energy detector accumulates large MeV deposits per fission — much bigger than a single incident neutron.',
    ],
    steps: [
      'Read the wiring: source → target, then beam vs energy branches to two detectors.',
      'Press Run. Watch fissions, emitted, and both detector readouts.',
      'Select the Source and raise rate — fission rate should rise roughly with neutron flux.',
      'Ask the AI observer to narrate paths and live events.',
    ],
    challenges: [
      'Lower the source rate until fissions become rare — statistics of a rare process.',
      'Swap the target nuclide to U-238 (parts tray / Selected part). Thermal fission should nearly vanish — fertile vs fissile.',
      'Add a second detector on the beam line to “count” leakage neutrons.',
    ],
    pitfalls: [
      'The energy wire is not a photon spectrum — it is a teaching channel for deposited fission energy.',
      'Real reactors need moderation, control rods, and delayed neutrons; this bench only shows the local fission event.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 60, y: 200, props: { kind: 'neutron', rate: 40, energyMeV: 0.000025 } },
      { id: 'n2', type: 'target', x: 280, y: 200, props: { nuclide: 'U-235' } },
      { id: 'n3', type: 'detector', x: 520, y: 80, props: { kind: 'he3' } },
      { id: 'n4', type: 'detector', x: 520, y: 200, props: { kind: 'he3' } },
      { id: 'n5', type: 'detector', x: 520, y: 320, props: { kind: 'energy' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n2', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n2', fromPort: 'energy', to: 'n5', toPort: 'energy' },
    ],
  },
  {
    id: 'fissile_vs_fertile',
    icon: '⚖',
    level: 'core',
    title: 'Fissile vs fertile (U-235 / U-238)',
    blurb: 'Same thermal neutron beam splits to U-235 and U-238 — only fissile fuel fissions readily.',
    goal: 'Contrast fissile ²³⁵U with fertile ²³⁸U under thermal neutrons — why enrichment matters.',
    physics: [
      'Fissile: fission with thermal neutrons (²³⁵U, ²³⁹Pu, ²³³U).',
      'Fertile: ²³⁸U mostly captures thermal n → ²³⁹U → β → ²³⁹Np → ²³⁹Pu (breeding), but thermal fission probability is tiny.',
      'Natural uranium is ~0.7% ²³⁵U — reactors either enrich or use heavy-water/graphite to keep neutrons thermal with less absorption.',
      'Fast neutrons can fission ²³⁸U, but this bench uses a thermal source to highlight the difference.',
    ],
    equations: [
      '\\sigma_f(^{235}\\mathrm{U},\\,\\mathrm{thermal}) \\gg \\sigma_f(^{238}\\mathrm{U},\\,\\mathrm{thermal})',
      '^{238}\\mathrm{U}(n,\\gamma)^{239}\\mathrm{U}\\xrightarrow{\\beta}{}^{239}\\mathrm{Pu}',
    ],
    apparatus: 'One neutron source fans out to two targets (U-235 and U-238), each with its own count + energy detectors — a controlled A/B comparison.',
    observe: [
      'U-235 branch: frequent fissions and large energy deposits.',
      'U-238 branch: mostly absorption/scatter; almost no fission energy.',
      'Live fission counter is dominated by the U-235 side.',
    ],
    steps: [
      'Press Run and compare the two energy detectors side by side.',
      'Note which target produces fission-like energy pulses.',
      'Select U-238 target — confirm nuclide label — then U-235.',
      'Change source rate and see both branches scale, but only one fissions.',
    ],
    challenges: [
      'Temporarily rewire so both targets share one detector — interpretation gets harder (why separate sensors help).',
      'Replace U-238 with Pu-239 and compare to U-235 (both fissile).',
    ],
    pitfalls: [
      '“Uranium doesn’t fission” is false — which isotope and which neutron energy matter.',
      'Breeding to Pu-239 is a slow decay chain; this sim only teaches the thermal fission contrast.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 40, y: 200, props: { kind: 'neutron', rate: 50, energyMeV: 0.000025 } },
      { id: 'n2', type: 'target', x: 260, y: 100, props: { nuclide: 'U-235' } },
      { id: 'n3', type: 'target', x: 260, y: 300, props: { nuclide: 'U-238' } },
      { id: 'n4', type: 'detector', x: 500, y: 60, props: { kind: 'he3' } },
      { id: 'n5', type: 'detector', x: 500, y: 140, props: { kind: 'energy' } },
      { id: 'n6', type: 'detector', x: 500, y: 260, props: { kind: 'he3' } },
      { id: 'n7', type: 'detector', x: 500, y: 340, props: { kind: 'energy' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n1', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n2', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n2', fromPort: 'energy', to: 'n5', toPort: 'energy' },
      { id: 'w5', from: 'n3', fromPort: 'beam', to: 'n6', toPort: 'beam' },
      { id: 'w6', from: 'n3', fromPort: 'energy', to: 'n7', toPort: 'energy' },
    ],
  },
  {
    id: 'shielded',
    icon: '🛡️',
    level: 'core',
    title: 'γ attenuation & build-up',
    blurb: 'Open path vs lead-shielded path — exponential attenuation I = I₀ e^(−μx).',
    goal: 'Measure how a γ beam is reduced by an absorber and compare to an unshielded reference arm.',
    physics: [
      'Narrow-beam attenuation: I(x) = I₀ e^(−μx), where μ depends on material and γ energy.',
      'Lead has high Z → strong photoelectric absorption at ~MeV energies used in labs.',
      'Broad-beam geometry adds build-up (scattered photons still reach the detector) — real shielding is thicker than the simple law suggests.',
      'Half-value layer (HVL): thickness that halves intensity, x½ = ln(2)/μ.',
    ],
    equations: [
      'I = I_0 e^{-\\mu x}',
      'x_{1/2} = \\ln 2 / \\mu',
    ],
    apparatus: 'γ source splits: upper arm is open (reference detector); lower arm goes through lead then a detector. Same emission statistics, different transmission.',
    observe: [
      'Open-arm detector counts much faster than the shielded arm.',
      'Increasing shield thickness (Selected part) further suppresses the shielded detector.',
      'Switching lead → water or concrete raises the shielded counts (lower μ).',
    ],
    steps: [
      'Run and read both detectors for ~10 s of live time.',
      'Estimate a rough transmission ≈ N_shield / N_open.',
      'Select the Shield — raise thickness — rerun (Stop → Run) and compare.',
      'Change material to concrete, then back to lead.',
    ],
    challenges: [
      'Find a thickness where shielded counts are ~half the open arm (teaching HVL).',
      'Replace γ with neutron source — lead becomes a poor shield; try borated poly.',
      'Add a second shield in series on the lower arm.',
    ],
    pitfalls: [
      'Counts ≠ dose. Dose also depends on energy absorbed in tissue.',
      'This model uses a simplified μ; real μ(E) tables are energy-dependent.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 50, y: 200, props: { kind: 'gamma', rate: 55, energyMeV: 1.25 } },
      { id: 'n2', type: 'detector', x: 420, y: 80, props: { kind: 'nai' } },
      { id: 'n3', type: 'shield', x: 280, y: 300, props: { material: 'lead', thickness: 0.65 } },
      { id: 'n4', type: 'detector', x: 500, y: 300, props: { kind: 'nai' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n1', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n3', fromPort: 'beam', to: 'n4', toPort: 'beam' },
    ],
  },
  {
    id: 'rad_types',
    icon: '☢',
    level: 'intro',
    title: 'α / β / γ penetration',
    blurb: 'Three radiation kinds, three shield lanes — which radiation survives?',
    goal: 'Build intuition for range and shielding: α stopped easily, β intermediate, γ most penetrating.',
    physics: [
      'α (⁴He²⁺): high LET, range ~cm in air, stopped by paper or dead skin — external α is usually low hazard, internal is serious.',
      'β (e±): mm–cm in tissue; light metals / plastic stop most lab β.',
      'γ / X: exponential attenuation; need high-Z or thick concrete for strong sources.',
      'Neutrons (see other labs) need hydrogenous moderators + absorbers (B, Cd), not just lead.',
    ],
    equations: [
      '\\mathrm{Range}_\\alpha \\ll \\mathrm{Range}_\\beta \\ll \\mathrm{mfp}_\\gamma',
    ],
    apparatus: 'Three sources (α, β, γ). α faces a thin-ish shield; β faces aluminum-like concrete proxy; γ faces lead. Each lane has its own detector.',
    observe: [
      'α lane: almost everything absorbed in the shield — detector stays quiet.',
      'β lane: partial transmission depending on thickness.',
      'γ lane: lead reduces but does not eliminate counts.',
    ],
    steps: [
      'Run all three lanes together.',
      'Compare detector counts — which radiation “gets through”?',
      'On the α shield, switch material / thickness and watch absorption.',
      'On the γ shield, thin the lead and watch counts rise.',
    ],
    challenges: [
      'Remove the α shield (delete wire + shield, rewire source→detector) — α counts surge.',
      'Send γ through borated poly — poor γ shield compared with lead.',
    ],
    pitfalls: [
      'Never assume “shielded” means zero dose — always verify with a meter.',
      'Bremsstrahlung: stopping high-energy β in high-Z can make X-rays (not modeled here).',
    ],
    nodes: [
      { id: 'a1', type: 'source', x: 40, y: 70, props: { kind: 'alpha', rate: 40, energyMeV: 5.5 } },
      { id: 'a2', type: 'shield', x: 260, y: 70, props: { material: 'water', thickness: 0.35 } },
      { id: 'a3', type: 'detector', x: 480, y: 70, props: { kind: 'si_alpha' } },
      { id: 'b1', type: 'source', x: 40, y: 200, props: { kind: 'beta', rate: 40, energyMeV: 0.5 } },
      { id: 'b2', type: 'shield', x: 260, y: 200, props: { material: 'concrete', thickness: 0.45 } },
      { id: 'b3', type: 'detector', x: 480, y: 200, props: { kind: 'gm' } },
      { id: 'g1', type: 'source', x: 40, y: 330, props: { kind: 'gamma', rate: 40, energyMeV: 0.662 } },
      { id: 'g2', type: 'shield', x: 260, y: 330, props: { material: 'lead', thickness: 0.55 } },
      { id: 'g3', type: 'detector', x: 480, y: 330, props: { kind: 'nai' } },
    ],
    wires: [
      { id: 'wa1', from: 'a1', fromPort: 'beam', to: 'a2', toPort: 'beam' },
      { id: 'wa2', from: 'a2', fromPort: 'beam', to: 'a3', toPort: 'beam' },
      { id: 'wb1', from: 'b1', fromPort: 'beam', to: 'b2', toPort: 'beam' },
      { id: 'wb2', from: 'b2', fromPort: 'beam', to: 'b3', toPort: 'beam' },
      { id: 'wg1', from: 'g1', fromPort: 'beam', to: 'g2', toPort: 'beam' },
      { id: 'wg2', from: 'g2', fromPort: 'beam', to: 'g3', toPort: 'beam' },
    ],
  },
  {
    id: 'ebeam',
    icon: '🧲',
    level: 'core',
    title: 'Charged beams in E and B',
    blurb: 'β → e⁻ split across E-field and B-field arms — Lorentz force selects who reaches the detector.',
    goal: 'Connect F = qE and F = q(v×B) to beam steering / spectrometry ideas.',
    physics: [
      'Electric field: force along E; accelerates or deflects charges; does no work distinction in pure magnetic fields.',
      'Magnetic field: force ⊥ v and B → circular/helical motion; kinetic energy unchanged by B alone.',
      'Wien filter (E×B): only one speed has zero net force — velocity selector used in mass spectrometers.',
      'Neutrons ignore E and B — only matter (scatter/capture) affects them.',
    ],
    equations: [
      '\\vec F = q\\vec E + q(\\vec v \\times \\vec B)',
      'r = p / (|q|B)\\ \\mathrm{(magnetic\\ bend)}',
    ],
    apparatus: 'β source → electron tag → parallel E and B modules → shared detector. Stronger fields increase “lost from beamline” probability in this teaching model.',
    observe: [
      'Particles stream along both field arms.',
      'Raising field strength increases particles steered off the line (absorbed counter).',
      'Detector rate falls as fields get “too strong” for this geometry.',
    ],
    steps: [
      'Run at default field strengths; note detector rate and absorbed.',
      'Select E-field — raise strength — watch more losses.',
      'Reset strength, then push B-field high.',
      'Compare with a neutron source substituted (fields should barely matter).',
    ],
    challenges: [
      'Wire only the E arm or only the B arm — isolate each effect.',
      'Add a second detector after one field to count survivors on that arm alone.',
    ],
    pitfalls: [
      'This is not a full particle-tracking spectrometer — it teaches selection/loss, not exact orbits.',
      'Sign of charge (e⁻ vs p⁺) flips deflection direction in a real lab.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 40, y: 200, props: { kind: 'beta', rate: 50, energyMeV: 0.3 } },
      { id: 'n2', type: 'electron', x: 200, y: 200, props: { energyKeV: 300 } },
      { id: 'n3', type: 'efield', x: 360, y: 100, props: { strength: 0.55, polarity: 1 } },
      { id: 'n4', type: 'bfield', x: 360, y: 300, props: { strength: 0.55, direction: 1 } },
      { id: 'n5', type: 'detector', x: 560, y: 200, props: { kind: 'gm' } },
      { id: 'n6', type: 'detector', x: 560, y: 80, props: { kind: 'gm' } },
      { id: 'n7', type: 'detector', x: 560, y: 320, props: { kind: 'gm' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n2', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n3', fromPort: 'beam', to: 'n6', toPort: 'beam' },
      { id: 'w5', from: 'n3', fromPort: 'beam', to: 'n5', toPort: 'beam' },
      { id: 'w6', from: 'n4', fromPort: 'beam', to: 'n7', toPort: 'beam' },
      { id: 'w7', from: 'n4', fromPort: 'beam', to: 'n5', toPort: 'beam' },
    ],
  },
  {
    id: 'moderation_fission',
    icon: '🌊',
    level: 'core',
    title: 'Moderation then fission',
    blurb: 'Fast-ish neutrons → water moderator → U-235. Slowing down raises fission chance.',
    goal: 'See why reactors moderate neutrons: thermal energies couple strongly to fissile fuel.',
    physics: [
      'Fission neutrons are born fast (~MeV). Elastic scatters on light nuclei (H in water) remove energy each collision.',
      'Lethargy gain per collision is largest for hydrogen — water/PE are excellent moderators.',
      'After moderation, σ_f on ²³⁵U is much larger → higher fission probability in this teaching model.',
      'Over-moderation or absorber in the moderator (boron) can kill the chain — control rods exploit absorption.',
    ],
    equations: [
      'E_{n+1} \\approx E_n e^{-\\xi},\\quad \\xi_{\\mathrm{H}} \\approx 1',
      '\\sigma_f^{\\mathrm{thermal}}(^{235}\\mathrm{U}) \\gg \\sigma_f^{\\mathrm{fast}}',
    ],
    apparatus: 'Neutron source → water shield (stand-in moderator) → U-235 → count & energy detectors. Compare mentally with direct fast-neutron fission (lower probability in the model).',
    observe: [
      'Fissions still occur after the water stage — neutrons that “thermalize” drive the target.',
      'Energy detector shows large fission deposits.',
      'If you bypass the water (rewire source→target), fission rate feel changes.',
    ],
    steps: [
      'Run the moderated layout; note fission rate.',
      'Delete the water shield wire path and connect source directly to U-235; compare.',
      'Put water back; switch water → borated poly (absorber) and watch fissions drop.',
    ],
    challenges: [
      'Add a second water block in series — more moderation / more absorption tradeoff.',
      'Replace U-235 with U-238 after moderation — still little thermal fission.',
    ],
    pitfalls: [
      'A “shield” card here is a crude moderator proxy — real moderation is a continuous slowing-down spectrum.',
      'Criticality needs geometry, enrichment, and reflection; one target on a canvas is not a reactor.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 40, y: 200, props: { kind: 'neutron', rate: 45, energyMeV: 2 } },
      { id: 'n2', type: 'shield', x: 220, y: 200, props: { material: 'water', thickness: 0.7 } },
      { id: 'n3', type: 'target', x: 400, y: 200, props: { nuclide: 'U-235' } },
      { id: 'n4', type: 'detector', x: 580, y: 100, props: { kind: 'he3' } },
      { id: 'n5', type: 'detector', x: 580, y: 280, props: { kind: 'energy' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n3', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n3', fromPort: 'energy', to: 'n5', toPort: 'energy' },
    ],
  },
  {
    id: 'boron_capture',
    icon: 'B',
    level: 'core',
    title: '¹⁰B neutron capture (n,α)',
    blurb: 'Thermal n on B-10 → α signal — the physics behind borated shields & BNCT ideas.',
    goal: 'Show neutron detection / absorption via the ¹⁰B(n,α)⁷Li reaction.',
    physics: [
      '¹⁰B has a huge thermal capture cross-section; products are α + ⁷Li (plus a γ in some branches).',
      'The charged α is easy to detect locally — basis of some neutron detectors (BF₃, boron-lined).',
      'Borated polyethylene mixes moderator (H) with absorber (B) — ideal neutron shield layer.',
      'BNCT medicine uses the same capture idea inside tissue (advanced topic).',
    ],
    equations: [
      '^{10}\\mathrm{B} + n \\rightarrow ^{7}\\mathrm{Li} + \\alpha + 2.79\\,\\mathrm{MeV}\\ (\\mathrm{ground})',
    ],
    apparatus: 'Neutron source → B-10 target. Capture emits an α on the signal/energy path to a detector; a parallel beam detector watches leftovers.',
    observe: [
      'Energy/signal detector records α-like deposits when captures happen.',
      'Absorbed counter rises — neutrons disappear into ¹⁰B.',
      'Beam detector counts fewer neutrons than a bare source→detector would.',
    ],
    steps: [
      'Run and watch both detectors + absorbed.',
      'Raise neutron rate — capture events scale up.',
      'Change target to C-12 — capture channel should go quiet (teaching contrast).',
      'Restore B-10.',
    ],
    challenges: [
      'Put water before B-10 to “thermalize” more — capture should feel stronger.',
      'Compare with borated shield experiment (bulk attenuation vs tagged capture).',
    ],
    pitfalls: [
      'Natural boron is only ~20% ¹⁰B; enriched boron is used in detectors.',
      'The sim collapses detector physics into a simple α pulse — not a full pulse-height spectrum.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 60, y: 200, props: { kind: 'neutron', rate: 48, energyMeV: 0.000025 } },
      { id: 'n2', type: 'target', x: 300, y: 200, props: { nuclide: 'B-10' } },
      { id: 'n3', type: 'detector', x: 540, y: 100, props: { kind: 'he3' } },
      { id: 'n4', type: 'detector', x: 540, y: 280, props: { kind: 'si_alpha' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n2', fromPort: 'energy', to: 'n4', toPort: 'energy' },
      { id: 'w4', from: 'n2', fromPort: 'signal', to: 'n4', toPort: 'signal' },
    ],
  },
  {
    id: 'neutron_shield',
    icon: 'n',
    level: 'core',
    title: 'Neutron shielding strategy',
    blurb: 'n → borated poly → detector, with a lead bypass arm — right shield for the right particle.',
    goal: 'Learn that neutron shielding ≠ γ shielding: use H + boron, not only lead.',
    physics: [
      'Neutrons do not feel charge; Coulomb shields are useless.',
      'Step 1: slow fast neutrons in hydrogenous material (water, PE).',
      'Step 2: capture thermals in ¹⁰B, ⁶Li, or Cd.',
      'Lead is excellent for γ that accompany capture, but alone it is a weak neutron attenuator.',
    ],
    equations: [
      '\\Sigma_a(\\mathrm{borated\\ PE}) \\gg \\Sigma_a(\\mathrm{Pb})\\ \\mathrm{for\\ thermal\\ }n',
    ],
    apparatus: 'Neutron source splits to (1) borated polyethylene → detector and (2) lead → detector. Compare transmission.',
    observe: [
      'Borated arm: strong attenuation.',
      'Lead arm: many more neutrons get through.',
      'Absorbed counts rise mainly on the borated path.',
    ],
    steps: [
      'Run and compare the two detector rates.',
      'Swap materials on each shield — make lead “borated” and vice versa.',
      'Increase borated thickness until the neutron detector is nearly dark.',
    ],
    challenges: [
      'Add a γ source instead — now lead should win. Same geometry, opposite material ranking.',
      'Series: water then borated — moderator + absorber stack.',
    ],
    pitfalls: [
      'Capture γ rays from (n,γ) on many nuclei create a secondary γ field — real shields are multi-layered.',
      'Cd and B also produce capture radiation that may need lead outer layers.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 40, y: 200, props: { kind: 'neutron', rate: 55, energyMeV: 0.000025 } },
      { id: 'n2', type: 'shield', x: 260, y: 100, props: { material: 'borated', thickness: 0.75 } },
      { id: 'n3', type: 'detector', x: 500, y: 100, props: { kind: 'he3' } },
      { id: 'n4', type: 'shield', x: 260, y: 300, props: { material: 'lead', thickness: 0.75 } },
      { id: 'n5', type: 'detector', x: 500, y: 300, props: { kind: 'he3' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n1', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n4', fromPort: 'beam', to: 'n5', toPort: 'beam' },
    ],
  },
  {
    id: 'pu_fission',
    icon: '⚛',
    level: 'core',
    title: 'Pu-239 fission chain seed',
    blurb: 'Thermal n on ²³⁹Pu — another fissile isotope, with ν slightly different from ²³⁵U.',
    goal: 'Recognize plutonium as fissile fuel and compare its fission signature to uranium.',
    physics: [
      '²³⁹Pu is produced from ²³⁸U breeding in reactors.',
      'It is fissile with thermal neutrons; ν is typically a bit higher than ²³⁵U.',
      'Weapons and MOX fuel discussions center on this isotope — handle as pure teaching physics here.',
      'Compare energy and neutron branches with the U-235 lab.',
    ],
    equations: [
      'n + ^{239}\\mathrm{Pu} \\rightarrow FF + \\nu n + \\cdots,\\quad \\nu \\gtrsim \\nu_{^{235}\\mathrm{U}}',
    ],
    apparatus: 'Same topology as U-235 fission: neutron source, Pu-239 target, dual count detectors + energy detector.',
    observe: [
      'Clear fission bursts in the log / AI feed.',
      'Energy detector accumulates ~200 MeV-scale deposits.',
      'Neutron detectors see multiplication-like extras after each fission.',
    ],
    steps: [
      'Run and note fission rate vs the U-235 experiment at similar source rate.',
      'Switch target to U-235 without changing source — qualitative compare.',
      'Restore Pu-239; ask AI to summarize the path.',
    ],
    challenges: [
      'Insert borated shield before Pu — starve the target of neutrons.',
      'Add water moderator if you raise source energy to ~MeV.',
    ],
    pitfalls: [
      'Critical mass and weapon design are outside this teaching canvas.',
      'Isotopics, chemistry, and health physics of Pu are far stricter than U in real labs.',
    ],
    nodes: [
      { id: 'n1', type: 'source', x: 60, y: 200, props: { kind: 'neutron', rate: 40, energyMeV: 0.000025 } },
      { id: 'n2', type: 'target', x: 280, y: 200, props: { nuclide: 'Pu-239' } },
      { id: 'n3', type: 'detector', x: 520, y: 80, props: { kind: 'he3' } },
      { id: 'n4', type: 'detector', x: 520, y: 200, props: { kind: 'he3' } },
      { id: 'n5', type: 'detector', x: 520, y: 320, props: { kind: 'energy' } },
    ],
    wires: [
      { id: 'w1', from: 'n1', fromPort: 'beam', to: 'n2', toPort: 'beam' },
      { id: 'w2', from: 'n2', fromPort: 'beam', to: 'n3', toPort: 'beam' },
      { id: 'w3', from: 'n2', fromPort: 'beam', to: 'n4', toPort: 'beam' },
      { id: 'w4', from: 'n2', fromPort: 'energy', to: 'n5', toPort: 'energy' },
    ],
  },
  {
    id: 'blank',
    icon: '🧩',
    level: 'free',
    title: 'Design your own lab',
    blurb: 'Empty bench with a design brief — compose a question, then wire the answer.',
    goal: 'Practice experimental design: hypothesis → apparatus graph → observable → control comparison.',
    physics: [
      'Every nuclear measurement is a graph: source of radiation → interactions → sensor.',
      'Good labs isolate one variable (thickness, nuclide, field strength) and keep a reference path.',
      'Detectors answer different questions: counts (rate), energy deposits (calorimetry teaching), coincidence (not yet on this bench).',
    ],
    equations: [],
    apparatus: 'Empty canvas. Use the parts tray. Prefer two detectors when comparing two conditions.',
    observe: [
      'AI inventory should list parts, wires, and source→detector paths.',
      'Live stats only move after Run with a complete path.',
    ],
    steps: [
      'Write a one-sentence question (e.g. “Does lead stop neutrons?”).',
      'Place source, interaction pieces, and ≥1 detector; wire green→blue.',
      'Add a control arm if you can (open vs shielded).',
      'Run, read AI observer, then tweak one variable.',
    ],
    challenges: [
      'Rebuild the fissile-vs-fertile comparison from scratch.',
      'Build α vs γ shielding with shared geometry.',
      'Make a “failing” lab on purpose (no path) and fix it from the AI hints.',
    ],
    pitfalls: [
      'More parts ≠ better experiment. One clear comparison beats a spaghetti graph.',
      'If nothing counts, check wires before blaming the physics.',
    ],
    nodes: [],
    wires: [],
  },
];

export function getExperiment(id) {
  for (let i = 0; i < EXPERIMENTS.length; i++) {
    if (EXPERIMENTS[i].id === id) return EXPERIMENTS[i];
  }
  return EXPERIMENTS[0];
}

/** Backward-compatible preset map used by older call sites. */
export const PRESETS = (function () {
  const map = {};
  for (let i = 0; i < EXPERIMENTS.length; i++) {
    const e = EXPERIMENTS[i];
    map[e.id] = {
      name: e.title,
      nodes: e.nodes,
      wires: e.wires,
    };
  }
  return map;
})();
