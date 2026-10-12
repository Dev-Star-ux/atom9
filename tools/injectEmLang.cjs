/* Inject lang blocks for 10 new EM modules into lang/en.json */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'lang', 'en.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));

function block(nav, title, desc, hint, principle, controls, info, teach) {
  return {
    navTitle: nav,
    title: title,
    desc: desc,
    hint: hint,
    principle: principle,
    controls: controls,
    info: info,
    teach: teach,
  };
}

const mods = {
  eddy_currents: block(
    'Eddy Currents',
    'Eddy Currents & Inductive Braking',
    'A conducting plate moving through a magnetic field develops circulating eddy currents that oppose the motion (Lenz) and dissipate heat — the basis of inductive brakes and damping.',
    '1) Raise B or speed · 2) Watch circulating loops and heating · 3) See braking force grow with v and B²',
    {
      desc: 'When a conductor moves through a magnetic field (or the field changes), Faraday’s law induces an electric field and circulating currents — eddy currents. By Lenz’s law those currents create a field that opposes the change, so they produce a drag force that slows the motion and convert kinetic energy into Joule heat. Stronger B, higher conductivity, thicker plates, and higher speed all raise the braking power in a simple teaching model P ∝ σ B² v² t².',
      equation: 'E \\sim B v\\quad\\cdot\\quad P_{\\mathrm{eddy}} \\propto \\sigma B^2 v^2 t^2\\quad\\cdot\\quad F_{\\mathrm{brake}} \\sim P/v',
      goal: 'See Lenz braking: raise B and speed, watch eddy loops and the F_brake vs speed curve.',
      steps: 'Start with moderate B and low speed — weak loops, small drag.\nRaise speed — loops intensify and F_brake climbs on the plot.\nRaise B — braking and heating jump (≈ B²).\nIncrease thickness or conductivity — more circulating current and stronger braking.',
      observe: 'Circulating arrows = eddy loops. Glow = heating. Plot: F_brake vs speed with live marker.',
    },
    {
      title: 'Eddy lab',
      B: 'Magnetic field B',
      BHelp: 'Stronger field → larger induced E and braking (~B²).',
      thickness: 'Plate thickness t',
      thicknessHelp: 'Thicker plate → more current paths → stronger braking.',
      sigma: 'Relative conductivity σ',
      sigmaHelp: 'Higher σ (e.g. aluminum vs poor conductor) → stronger eddy currents.',
      speed: 'Plate speed v',
      speedHelp: 'Faster motion through B → larger induced E and drag.',
    },
    {
      inducedE: 'Induced E (rel.)',
      power: 'Eddy power (rel.)',
      brake: 'Braking force (rel.)',
    },
    {
      title: 'Key ideas',
      t1: 'Eddy currents are closed loops induced by motion (or dB/dt) in a bulk conductor.',
      t2: 'Lenz’s law: the loops oppose the change → drag force (inductive brake).',
      t3: 'Energy is not lost mysteriously — it becomes heat (I²R in the metal).',
      t4: 'Used in train brakes, galvanometer damping, metal detectors, and induction heating.',
    }
  ),

  faraday_disc: block(
    'Faraday Disc',
    'Faraday Disc Generator (Homopolar)',
    'A conducting disc spinning in an axial magnetic field develops a radial EMF between hub and rim — Faraday’s homopolar generator.',
    '1) Set B and spin rate · 2) Watch radial current · 3) Read ε = ½ B ω R² and load current',
    {
      desc: 'Michael Faraday’s disc: a metal disc rotates in an axial B field. Each radial element of length dr moves with speed ωr, so dε = B ω r dr. Integrating from hub to rim gives ε = ½ B ω R². Brushes at the axis and rim close a circuit through a load. Unlike an AC alternator, the polarity is steady for constant ω (homopolar / DC). Inspired by open EJS Faraday Disk Dynamo teaching models.',
      equation: '\\varepsilon = \\tfrac{1}{2} B \\omega R^2\\quad\\cdot\\quad I = \\varepsilon / R_{\\mathrm{load}}',
      goal: 'Generate radial EMF with a spinning disc in B, and see ε grow with ω, B, and R².',
      steps: 'Set a nonzero B and spin rate ω — watch the disc turn and radial current arrows.\nRaise ω — ε and I increase linearly with ω.\nRaise B or disc radius R — ε jumps (note R²).\nIncrease load resistance — current falls while ε stays set by B, ω, R.',
      observe: 'Disc spins in axial B (× marks). Radial arrows = current. Plot: ε vs ω with live point.',
    },
    {
      title: 'Homopolar lab',
      B: 'Axial field B',
      BHelp: 'Magnetic field through the disc (axial).',
      omega: 'Angular speed ω',
      omegaHelp: 'Faster spin → larger radial EMF.',
      R: 'Disc radius R',
      RHelp: 'EMF scales as R².',
      Rload: 'Load resistance',
      RloadHelp: 'I = ε / R_load through the brushes.',
    },
    {
      emf: 'EMF ε',
      current: 'Load current I',
      power: 'Electrical power',
    },
    {
      title: 'Key ideas',
      t1: 'Homopolar: polarity is DC for constant rotation — no commutator needed.',
      t2: 'ε = ½ B ω R² comes from integrating B v dr along a radius.',
      t3: 'Brushes at hub and rim complete the circuit.',
      t4: 'Same physics underlies liquid-metal dynamos and some specialty DC generators.',
    }
  ),

  ac_power_factor: block(
    'AC Power Factor',
    'AC Power Factor in Motors',
    'Inductive motors draw current that lags the voltage; real power is P = VI cosφ while apparent power is S = VI — power factor cosφ measures that lag.',
    '1) Set V and I · 2) Increase lag angle φ · 3) Watch P fall while S stays VI; read the power triangle',
    {
      desc: 'In AC circuits, voltage and current sinusoids may be out of phase. For a lagging (inductive) motor load, current peaks after voltage. Instantaneous power averages to P = V_rms I_rms cosφ (real / average power). Apparent power S = V I is what wires and transformers must be sized for; reactive power Q = V I sinφ sloshes back and forth. Power factor cosφ = P/S is near 1 for resistive loads and drops when motors run lightly or highly inductive — industry corrects it with capacitors.',
      equation: 'P = VI\\cos\\phi\\quad\\cdot\\quad Q = VI\\sin\\phi\\quad\\cdot\\quad S = VI\\quad\\cdot\\quad \\mathrm{pf}=\\cos\\phi',
      goal: 'See how motor lag angle φ cuts real power and power factor while apparent power stays VI.',
      steps: 'Set V and I — note S = VI and, at φ = 0, P = S (resistive).\nIncrease φ (lag) — phasor I rotates behind V; P = VI cosφ falls.\nRead the power triangle: P (real), Q (reactive), S (hypotenuse).\nWatch time-domain v(t) and i(t): larger lag → average of vi shrinks.',
      observe: 'Phasors: V (gold) and lagging I (cyan). Triangle: P–Q–S. Waves show phase shift.',
    },
    {
      title: 'Motor PF lab',
      V: 'Voltage (rms)',
      VHelp: 'AC supply voltage.',
      I: 'Current (rms)',
      IHelp: 'Line current drawn by the motor.',
      phi: 'Lag angle φ',
      phiHelp: '0° = resistive; larger φ = more inductive motor lag.',
    },
    {
      P: 'Real power P',
      Q: 'Reactive power Q',
      S: 'Apparent power S',
      pf: 'Power factor cosφ',
    },
    {
      title: 'Key ideas',
      t1: 'Motors are inductive → current lags voltage → pf < 1.',
      t2: 'You pay for energy ~P, but equipment is rated by S — low pf wastes capacity.',
      t3: 'Q is not “used up”; it oscillates between source and inductors.',
      t4: 'Capacitor banks raise cosφ toward 1 (pf correction).',
    }
  ),

  rotating_magnetic_field: block(
    'Rotating B Field',
    'Three-Phase Rotating Magnetic Field',
    'Three stator windings 120° apart, fed by three-phase AC, produce a magnetic field of nearly constant magnitude that rotates at synchronous speed — the heart of induction motors.',
    '1) Watch three phase axes · 2) See the resultant B arrow rotate · 3) Raise frequency to spin faster',
    {
      desc: 'Each phase winding makes a pulsating field along its axis: B_a = B₀ cos(ωt), B_b = B₀ cos(ωt−120°), B_c = B₀ cos(ωt+120°). Vector-summed in the plane, the three components yield a resultant of magnitude (3/2)B₀ that rotates steadily at angular speed ω — a rotating magnetic field (RMF). A squirrel-cage rotor follows this field (with slip) to make torque. Classic textbook animation; same idea as open three-phase motor demos.',
      equation: '\\mathbf{B}(t)=\\mathbf{B}_a+\\mathbf{B}_b+\\mathbf{B}_c\\quad\\Rightarrow\\quad |B|=\\tfrac{3}{2}B_0\\ \\mathrm{(rotating)}',
      goal: 'See three 120° AC windings create one smoothly rotating B vector.',
      steps: 'Watch the three phase arrows along 120° axes and the gold resultant.\nNote |B_resultant| stays roughly constant while direction rotates.\nRaise frequency — the field spins faster (synchronous speed ∝ f).\nRaise B₀ — stronger field, same rotation pattern.',
      observe: 'Three phase arrows + gold resultant rotating. Optional rotor follows the field.',
    },
    {
      title: 'RMF lab',
      B0: 'Phase amplitude B₀',
      B0Help: 'Amplitude of each phase’s pulsating field.',
      freq: 'Frequency f',
      freqHelp: 'Synchronous rotation speed scales with f.',
      showRotor: 'Show rotor',
      showRotorHelp: '1 = draw a rotor bar that follows the RMF.',
    },
    {
      Bret: '|B| resultant',
      speed: 'Rotation speed',
      sync: 'Synchronous note',
    },
    {
      title: 'Key ideas',
      t1: 'Three phases at 120° electrical/spatial degrees make a rotating field from stationary coils.',
      t2: 'Resultant magnitude is constant (ideal) — not a vibrating field.',
      t3: 'Induction motors: rotor currents lag the RMF → torque.',
      t4: 'Reverse two phases → reverse rotation direction.',
    }
  ),

  forced_em_resonance: block(
    'EM Resonance',
    'Forced Electromagnetic Oscillation & Resonance',
    'A series RLC circuit driven by AC has maximum current at ω₀ = 1/√(LC); impedance is minimum and the phase between V and I flips across resonance.',
    '1) Set L and C (note f₀) · 2) Sweep drive frequency through f₀ · 3) Watch I peak on the resonance curve',
    {
      desc: 'A series RLC driven by V = V₀ cos(ωt) has impedance Z = √[R² + (ωL − 1/(ωC))²]. Current amplitude I = V/Z is largest when the reactances cancel: ω₀ = 1/√(LC). That is forced resonance — the drive frequency matches the natural frequency of the LC tank. Quality factor Q = ω₀L/R measures how sharp the peak is. Teaching cousin of PhET/circuit-lab resonance demos.',
      equation: '\\omega_0 = 1/\\sqrt{LC}\\quad\\cdot\\quad Z=\\sqrt{R^2+(\\omega L-1/\\omega C)^2}\\quad\\cdot\\quad I=V/Z',
      goal: 'Sweep drive frequency through f₀ and see the current resonance peak.',
      steps: 'Note f₀ from L and C in the info panel.\nSet drive f far below f₀ — current small, circuit looks capacitive.\nSweep f through f₀ — I peaks; Z is minimum.\nRaise R — peak lowers and widens (lower Q).',
      observe: 'RLC schematic with live I. Plot: I vs f with marker at drive frequency.',
    },
    {
      title: 'Driven RLC lab',
      V: 'Drive voltage V',
      VHelp: 'AC source amplitude.',
      R: 'Resistance R',
      RHelp: 'Larger R → lower, broader resonance peak.',
      L: 'Inductance L',
      LHelp: 'Affects f₀ = 1/(2π√(LC)).',
      C: 'Capacitance C',
      CHelp: 'Affects f₀ = 1/(2π√(LC)).',
      f: 'Drive frequency f',
      fHelp: 'Sweep through f₀ to hit resonance.',
    },
    {
      f0: 'Natural f₀',
      Z: 'Impedance Z',
      I: 'Current amplitude',
      Q: 'Quality factor Q',
    },
    {
      title: 'Key ideas',
      t1: 'Resonance when ωL = 1/(ωC) — inductive and capacitive reactances cancel.',
      t2: 'Maximum current and minimum Z at f₀.',
      t3: 'Below f₀: capacitive; above f₀: inductive (phase flips).',
      t4: 'Used in radio tuners, wireless charging, and filters.',
    }
  ),

  em_wave_radiation: block(
    'EM Radiation',
    'Electromagnetic Wave Radiation',
    'Accelerating charges radiate EM waves; a Hertzian dipole launches a figure‑8 far-field pattern with E and B transverse and a radial Poynting flux.',
    '1) Oscillate the dipole · 2) Watch expanding wavefronts · 3) Read the sinθ radiation pattern',
    {
      desc: 'Static charges and steady currents do not radiate. Accelerating charges do: a Hertzian dipole (tiny oscillating current element) produces a far-field wave with E_θ ∝ sinθ / r, B_φ matching E/c, and Poynting vector S outward. Near the antenna the fields are more complicated (near-field / induction zone). Teaching view matches classic dipole-radiation animations used in EM courses.',
      equation: 'E_\\theta \\propto \\frac{\\sin\\theta}{r}\\quad\\cdot\\quad \\mathbf{S}=\\frac{1}{\\mu_0}\\mathbf{E}\\times\\mathbf{B}',
      goal: 'See that only acceleration radiates, and map the dipole’s sinθ pattern.',
      steps: 'Watch the dipole oscillate and wavefronts expand outward.\nNote strongest radiation broadside (θ = 90°), nulls along the axis.\nRaise frequency — shorter wavelength, faster wavefronts.\nRaise amplitude — stronger fields and Poynting flux.',
      observe: 'Oscillating dipole + expanding rings. Polar plot: figure‑8 intensity pattern.',
    },
    {
      title: 'Dipole radiator',
      frequency: 'Frequency',
      frequencyHelp: 'Sets wavelength λ = c/f of the radiated wave.',
      amplitude: 'Dipole strength',
      amplitudeHelp: 'Stronger oscillation → stronger radiated fields.',
      showNearFar: 'Near/far cue',
      showNearFarHelp: '1 = highlight near-field zone vs far wave zone.',
    },
    {
      lambda: 'Wavelength λ',
      far: 'Far-field distance (cue)',
      S: 'Poynting (rel.)',
    },
    {
      title: 'Key ideas',
      t1: 'Radiation requires acceleration — not static E or steady I.',
      t2: 'Dipole pattern ∝ sin²θ: zero along the wire axis.',
      t3: 'Far away: transverse E, B with S = E×B/μ₀ carrying energy.',
      t4: 'Antennas are engineered distributions of such radiating currents.',
    }
  ),

  em_wave_refraction: block(
    'EM Refraction',
    'Reflection & Refraction of EM Waves',
    'At a dielectric interface EM waves obey Snell’s law n₁ sinθ₁ = n₂ sinθ₂ with n = c/v = √(ε_r μ_r); part reflects, part transmits.',
    '1) Set n₁, n₂ · 2) Change incidence θ₁ · 3) Watch reflected & refracted rays track Snell',
    {
      desc: 'Electromagnetic waves slow in materials with higher refractive index n = c/v ≈ √(ε_r μ_r). At an interface, boundary conditions force the usual laws of reflection (θ_r = θ_i) and refraction (Snell). If n₂ > n₁ the ray bends toward the normal; if n₂ < n₁ it bends away (and may totally reflect beyond critical angle). Same geometry as optical benches, but here it is explicitly an EM wave — microwave labs use the same Snell demo.',
      equation: 'n=\\sqrt{\\varepsilon_r\\mu_r}\\quad\\cdot\\quad n_1\\sin\\theta_1=n_2\\sin\\theta_2\\quad\\cdot\\quad \\theta_r=\\theta_1',
      goal: 'Verify Snell’s law for EM waves by changing n and θ₁.',
      steps: 'Set n₁ and n₂ (e.g. air → glass).\nRaise incidence θ₁ — watch θ₂ follow Snell; reflected ray mirrors θ₁.\nSwap to n₂ < n₁ — ray bends away; find when θ₂ would exceed 90° (critical).\nRead the live Snell check in the info panel.',
      observe: 'Wavefronts + incident/reflected/refracted rays at the interface. Plot: θ₂ vs θ₁.',
    },
    {
      title: 'Interface lab',
      n1: 'Index n₁ (incident)',
      n1Help: 'Usually air ≈ 1.',
      n2: 'Index n₂ (transmitted)',
      n2Help: 'Dielectric; larger n₂ bends toward the normal.',
      theta1: 'Incidence angle θ₁',
      theta1Help: 'Angle from the surface normal.',
    },
    {
      theta2: 'Refraction θ₂',
      thetar: 'Reflection θ_r',
      snell: 'Snell check',
      critical: 'Critical angle',
    },
    {
      title: 'Key ideas',
      t1: 'n = c/v slows the wave in the medium.',
      t2: 'Snell: n₁ sinθ₁ = n₂ sinθ₂.',
      t3: 'Reflection angle equals incidence.',
      t4: 'Beyond critical angle (n₁ > n₂): total internal reflection.',
    }
  ),

  radar_principles: block(
    'Radar',
    'Principles of Radar',
    'Pulse radar measures range from echo delay R = cτ/2; received power falls steeply with range (teaching form ∝ σ / R⁴).',
    '1) Fire pulses · 2) Move the target · 3) Read range from echo delay on the A-scope',
    {
      desc: 'Radar transmits a short RF pulse, then listens. A target at range R reflects a fraction of the power; the echo returns after delay τ = 2R/c, so R = cτ/2. The radar equation (teaching form) says received power drops as 1/R⁴ because the outbound wave spreads (~1/R²) and the echo spreads again (~1/R²), times radar cross section σ. A-scopes display echo amplitude vs time; PPI scopes map azimuth. Inspired by classic pulse-radar teaching sims.',
      equation: 'R = \\frac{c\\tau}{2}\\quad\\cdot\\quad P_r \\propto \\frac{P_t\\,\\sigma}{R^4}',
      goal: 'Measure target range from echo delay and see how echo strength falls with R.',
      steps: 'Watch the outbound pulse and returning echo on the A-scope.\nIncrease target range — delay grows; R = cτ/2 updates.\nRaise RCS σ — louder echo at the same range.\nShorten pulse width — finer range resolution (teaching cue).',
      observe: 'Antenna → pulse → target → echo. A-scope: blip delay = range. Plot: echo power vs R.',
    },
    {
      title: 'Radar lab',
      pulseWidth: 'Pulse width',
      pulseWidthHelp: 'Shorter pulses → better range resolution (teaching).',
      period: 'Pulse period',
      periodHelp: 'Time between pulses (sets max unambiguous range cue).',
      range: 'Target range',
      rangeHelp: 'Distance to the reflector.',
      rcs: 'Radar cross section σ',
      rcsHelp: 'How strongly the target reflects.',
    },
    {
      delay: 'Echo delay τ',
      rangeCalc: 'Range cτ/2',
      Pr: 'Relative P_r',
    },
    {
      title: 'Key ideas',
      t1: 'Range from time-of-flight: R = cτ/2.',
      t2: 'Echo power falls steeply with range (~1/R⁴).',
      t3: 'σ (RCS) summarizes target reflectivity.',
      t4: 'Pulse length trades energy vs range resolution.',
    }
  ),

  stealth_technology: block(
    'Stealth',
    'Principles of Stealth Technology',
    'Stealth reduces radar cross section by shaping (deflect specular returns) and radar-absorbent materials — teaching model σ_eff = σ₀ · shape · (1 − absorb).',
    '1) Compare conventional vs stealth silhouette · 2) Raise shaping & absorption · 3) Watch RCS bar drop',
    {
      desc: 'Radar “sees” the power scattered back toward the receiver. Stealth aircraft cut that return by (1) shaping: facets and edges steer specular reflections away from the threat radar, and (2) radar-absorbent materials (RAM) that dissipate RF as heat. Tip diffraction and cavities still scatter some energy, so stealth is reduction, not invisibility. Teaching contrast with a corner-reflector-like conventional airframe.',
      equation: '\\sigma_{\\mathrm{eff}} = \\sigma_0 \\cdot f_{\\mathrm{shape}} \\cdot (1-a)\\quad\\cdot\\quad P_r \\propto \\sigma_{\\mathrm{eff}}/R^4',
      goal: 'Lower effective RCS with shaping and absorption and compare to a conventional target.',
      steps: 'Start with shaping = 0, absorb = 0 — high RCS bar (conventional).\nRaise shaping — specular lobe deflects off-boresight; RCS falls.\nRaise absorption — RAM eats more of the remaining return.\nToggle wavelength cue — finer features matter more at shorter λ (teaching note).',
      observe: 'Two silhouettes; incident radar and scattered lobes; RCS comparison bars.',
    },
    {
      title: 'Stealth lab',
      shaping: 'Shaping factor',
      shapingHelp: '0 = blunt/conventional; 1 = strong specular deflection.',
      absorb: 'RAM absorption',
      absorbHelp: '0 = reflective skin; 1 = strong absorber.',
      wavelength: 'Wavelength cue',
      wavelengthHelp: 'Shorter λ interacts with finer edge features (teaching).',
    },
    {
      sigma0: 'Baseline σ₀',
      sigmaEff: 'Effective σ',
      reduction: 'RCS reduction',
    },
    {
      title: 'Key ideas',
      t1: 'Shaping aims specular bounce away from the radar.',
      t2: 'RAM converts RF to heat, cutting residual return.',
      t3: 'Stealth reduces σ — it does not make P_r zero.',
      t4: 'Edges, inlets, and gaps still scatter; design is a trade-off.',
    }
  ),

  microwave_oven: block(
    'Microwave Oven',
    'Principles of Microwave Ovens',
    'A magnetron feeds ~2.45 GHz microwaves into a metal cavity; standing waves create hot/cold spots; water’s dielectric loss absorbs energy as heat (P ∝ ε″ E²).',
    '1) See cavity standing waves · 2) Raise power / water fraction · 3) Use turntable to smear hot spots',
    {
      desc: 'A microwave oven’s magnetron generates microwaves near 2.45 GHz. The metal box is a resonant cavity: waves reflect and form standing-wave patterns with antinodes (hot) and nodes (cold). Food heats because polar molecules (especially water) experience dielectric loss in the oscillating E field — absorbed power density scales as ε″ E². A turntable (or mode stirrer) moves food through the pattern so heating averages out. Door mesh keeps microwaves in while letting you look in.',
      equation: 'f \\approx 2.45\\,\\mathrm{GHz}\\quad\\cdot\\quad P_{\\mathrm{abs}} \\propto \\varepsilon\'\' |E|^2',
      goal: 'Connect magnetron → cavity modes → water heating, and see why turntables help.',
      steps: 'Watch the cavity |E| pattern — bright = antinode (hot), dark = node (cold).\nRaise power — heating rate increases.\nRaise water fraction — more dielectric absorption.\nEnable turntable — food moves through hot/cold spots and averages.',
      observe: 'Cavity shading = standing-wave |E|. Food glow = heating. Plot: |E| along a cavity cut.',
    },
    {
      title: 'Oven lab',
      power: 'Magnetron power',
      powerHelp: 'Higher power → faster heating.',
      mode: 'Mode index',
      modeHelp: 'Changes the standing-wave pattern in the cavity.',
      turntable: 'Turntable',
      turntableHelp: '1 = rotate food through hot/cold spots.',
      water: 'Water fraction',
      waterHelp: 'Higher water content → stronger microwave absorption.',
    },
    {
      freq: 'Frequency',
      heat: 'Heating rate (rel.)',
      pattern: 'Mode note',
    },
    {
      title: 'Key ideas',
      t1: 'Magnetron → waveguide → cavity standing waves.',
      t2: 'Water (and fats) absorb via dielectric loss ∝ ε″ E².',
      t3: 'Hot/cold spots are antinodes/nodes of the mode.',
      t4: 'Turntable or stirrer averages the pattern for even cooking.',
    }
  ),
};

let n = 0;
for (const id of Object.keys(mods)) {
  j.modules[id] = mods[id];
  n++;
}

fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
console.log('Injected', n, 'module lang blocks');
