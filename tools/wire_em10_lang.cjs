/**
 * Insert/update lang/en.json modules.<id> for the 10 new EM modules.
 * Keys match what each module.js reads via T('...').
 */
const fs = require('fs');
const path = require('path');

const LANG = path.join(__dirname, '..', 'lang', 'en.json');

const MODULES = {
  eddy_currents: {
    navTitle: 'Eddy Currents',
    title: 'Eddy Currents & Inductive Braking',
    desc: 'A conducting plate moving through a magnetic gap develops circulating eddy currents that dissipate power and produce a braking force opposing the motion.',
    hint: '1) Raise B · 2) Thicken the plate or raise σ · 3) Sweep speed — watch braking force and heating grow',
    principle: {
      desc: 'When a conductor cuts magnetic flux, Faraday induction drives circulating eddy currents. Lenz’s law makes those currents produce a force that opposes the relative motion — inductive braking. Dissipated power scales roughly as σ B² v² t² in this teaching model. Inspired by classic eddy-brake demos and classroom plate-in-magnet labs.',
      equation: 'E_{ind}\\sim B v\\quad\\cdot\\quad P\\sim\\sigma B^{2}v^{2}t^{2}\\quad\\cdot\\quad F_{brake}\\sim P/v',
      goal: 'Show that stronger B, thicker or more conductive plates, and higher speed all increase eddy heating and braking.',
      steps: 'Set a moderate B and plate thickness.\nRaise speed and watch F_brake and power climb.\nIncrease σ or thickness at fixed speed — braking strengthens.\nLower B toward zero and confirm the brake nearly vanishes.',
      observe: '2D: plate motion vs F_brake(v) curve. 3D: gap magnet and plate with eddy loops.',
    },
    controls: {
      title: 'Eddy brake lab',
      B: 'Magnetic field B',
      BHelp: 'Stronger gap field induces larger eddy currents for the same speed.',
      thickness: 'Plate thickness t',
      thicknessHelp: 'Thicker conductors carry more eddy current and dissipate more power.',
      sigma: 'Conductivity σ (rel.)',
      sigmaHelp: 'Relative conductivity — copper-like materials brake harder than poor conductors.',
      speed: 'Plate speed v',
      speedHelp: 'Relative speed through the gap; braking force and heating both grow with v.',
    },
    info: {
      Eind: 'Induced E scale',
      power: 'Eddy power P',
      Fbrake: 'Brake force F',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Eddy currents are closed loops of induced current inside a bulk conductor — not a single wire path.',
      t2: 'Lenz’s law: the magnetic force on those currents always opposes the motion that created them (braking).',
      t3: 'Heating P ∝ σ B² v² t² in this model — thick, conductive plates in strong fields dump kinetic energy as heat.',
      t4: 'Real uses: roller-coaster brakes, train retarders, induction cooktops, and laminated cores to suppress unwanted eddy loss.',
    },
  },

  faraday_disc: {
    navTitle: 'Faraday Disc',
    title: 'Faraday Disc (Homopolar Generator)',
    desc: 'A conducting disc spinning in an axial magnetic field develops a radial emf between hub and rim — the classic homopolar generator.',
    hint: '1) Set B · 2) Raise ω · 3) Set radius R and load R_load · read ε and I',
    principle: {
      desc: 'Charges in a spinning disc feel a Lorentz force in an axial B field, separating until the radial electric field balances v×B. The open-circuit emf between hub and rim is ε = ½ B ω R². Connecting a load draws current I = ε / R_load. Inspired by open-source EJS Faraday-disc / homopolar-generator simulations.',
      equation: '\\varepsilon = \\tfrac{1}{2} B\\omega R^{2}\\quad\\cdot\\quad I = \\varepsilon / R_{load}',
      goal: 'Verify that emf grows with B, ω, and R², and that load current follows Ohm’s law.',
      steps: 'Start with modest B and ω; note ε.\nDouble ω — emf should roughly double.\nIncrease R and watch the R² sensitivity.\nLower R_load and see current rise while ε stays the same (ideal source).',
      observe: '2D: ε vs ω plot. 3D: spinning disc, axial B, radial current path to the load.',
    },
    controls: {
      title: 'Homopolar lab',
      B: 'Axial field B',
      BHelp: 'Uniform field along the disc axis.',
      omega: 'Angular speed ω',
      omegaHelp: 'Spin rate of the disc (rad/s).',
      R: 'Disc radius R',
      RHelp: 'Outer radius from hub brush to rim brush.',
      Rload: 'Load resistance R_load',
      RloadHelp: 'External resistance closing the hub–rim circuit.',
    },
    info: {
      emf: 'Emf ε',
      I: 'Load current I',
      formula: 'Formula',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Homopolar generators produce DC without commutators — the geometry itself keeps polarity fixed.',
      t2: 'ε = ½ B ω R² comes from integrating (v×B)·dr from hub to rim with v = ω r.',
      t3: 'Current needs a sliding contact (brushes) at hub and rim; the disc alone is not a closed circuit.',
      t4: 'Faraday’s disc is historically important: it showed motional emf without an obvious “changing flux through a loop.”',
    },
  },

  ac_power_factor: {
    navTitle: 'AC Power Factor',
    title: 'AC Power Factor & Phasors',
    desc: 'Real, reactive, and apparent power from V_rms, I_rms, and phase angle φ — power factor cos φ on the phasor diagram.',
    hint: '1) Set V_rms and I_rms · 2) Sweep φ · 3) Watch P, Q, S and cos φ',
    principle: {
      desc: 'In AC circuits, voltage and current phasors can be out of phase by φ. Instantaneous average real power is P = V_rms I_rms cos φ; reactive power Q = V_rms I_rms sin φ; apparent power S = V_rms I_rms. Power factor PF = cos φ (lagging or leading). Inspired by classroom phasor / power-factor lab animations.',
      equation: 'P=V I\\cos\\phi\\quad\\cdot\\quad Q=V I\\sin\\phi\\quad\\cdot\\quad S=VI\\quad\\cdot\\quad PF=\\cos\\phi',
      goal: 'Connect the phase angle on the phasor diagram to P, Q, S, and the power factor.',
      steps: 'Set φ ≈ 0° — PF near 1, mostly real power.\nRaise |φ| toward 90° — P falls, |Q| rises, S stays V·I.\nCompare lagging (+) vs leading (−) φ on the phasor plot.',
      observe: '2D: P–Q–S bars and PF. 3D: rotating V and I phasors with angle φ.',
    },
    controls: {
      title: 'Power-factor lab',
      Vrms: 'Voltage V_rms',
      VrmsHelp: 'RMS line or source voltage.',
      Irms: 'Current I_rms',
      IrmsHelp: 'RMS current drawn by the load.',
      phi: 'Phase φ',
      phiHelp: 'Angle of current relative to voltage (degrees). Positive ≈ lagging inductive.',
    },
    info: {
      P: 'Real power P',
      Q: 'Reactive Q',
      S: 'Apparent S',
      pf: 'Power factor',
    },
    teach: {
      title: 'Key ideas',
      t1: 'S is the “size” of the VI product; only the in-phase part P does useful work on average.',
      t2: 'PF = cos φ = P/S. Utilities bill for poor PF because generators and wires must still carry the full S.',
      t3: 'Inductive loads lag (φ > 0); capacitors lead — capacitor banks correct industrial PF.',
      t4: 'Phasors make the triangle P² + Q² = S² geometric and easy to read at a glance.',
    },
  },

  rotating_magnetic_field: {
    navTitle: 'Rotating B Field',
    title: 'Three-Phase Rotating Magnetic Field',
    desc: 'Three 120°-shifted AC windings produce a magnetic field of nearly constant magnitude that rotates at supply frequency — the basis of induction motors.',
    hint: '1) Set frequency · 2) Set B₀ · 3) Toggle phase components · watch the resultant rotate',
    principle: {
      desc: 'Three spatial axes 120° apart, each driven by AC currents 120° apart in time, sum to a vector of magnitude ≈ 1.5 B₀ that rotates smoothly. That rotating field induces rotor currents and torque in an induction machine. Inspired by textbook three-phase RMF animations.',
      equation: '\\mathbf{B}_{rot}=\\mathbf{B}_a+\\mathbf{B}_b+\\mathbf{B}_c\\quad\\cdot\\quad |B|_{ideal}\\approx 1.5\\,B_0',
      goal: 'See how three phase components combine into one rotating resultant of nearly constant length.',
      steps: 'Enable “show components” and watch three oscillating axes.\nHide components — only the rotating resultant remains.\nRaise frequency and confirm faster rotation.\nChange B₀ and check that |B_rot| ≈ 1.5 B₀.',
      observe: '2D: component arrows + resultant tip path. 3D: stator axes and rotating B vector.',
    },
    controls: {
      title: 'RMF lab',
      freq: 'Supply frequency f',
      freqHelp: 'Electrical frequency; the field rotates at this rate (synchronous speed in teaching units).',
      B0: 'Phase amplitude B₀',
      B0Help: 'Peak field contribution from each phase winding.',
      showComponents: 'Show phase components',
      showComponentsHelp: 'Overlay the three oscillating phase vectors along with the resultant.',
    },
    info: {
      B0: 'Phase B₀',
      Brot: 'Resultant |B|',
      freq: 'Frequency f',
    },
    teach: {
      title: 'Key ideas',
      t1: 'A single-phase winding makes a pulsating field; three phases make a traveling / rotating field.',
      t2: 'Ideal magnitude ≈ 1.5 B₀ when phases are balanced and 120° apart.',
      t3: 'Direction of rotation reverses if you swap any two phase connections.',
      t4: 'Induction motors “chase” this rotating field; slip between field and rotor sets torque.',
    },
  },

  forced_em_resonance: {
    navTitle: 'RLC Resonance',
    title: 'Forced RLC Resonance',
    desc: 'Series RLC driven by AC: impedance dips at f₀ = 1/(2π√(LC)), current peaks, and Q = (1/R)√(L/C) sets the sharpness.',
    hint: '1) Set L and C to fix f₀ · 2) Sweep drive f · 3) Lower R to raise Q — watch the peak sharpen',
    principle: {
      desc: 'A series RLC circuit driven by V cos(ωt) has impedance Z(ω) = √(R² + (ωL − 1/(ωC))²). Current I = V/Z is maximum at resonance f₀ = 1/(2π√(LC)) where the reactances cancel. Quality factor Q = (1/R)√(L/C) measures peak sharpness. Inspired by standard forced-RLC resonance lab benches.',
      equation: 'f_0=\\dfrac{1}{2\\pi\\sqrt{LC}}\\quad\\cdot\\quad I=\\dfrac{V}{Z}\\quad\\cdot\\quad Q=\\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}}',
      goal: 'Tune drive frequency through f₀ and relate peak current and bandwidth to R, L, and C.',
      steps: 'Note f₀ from L and C.\nSweep f across f₀ and find the current peak.\nLower R — peak rises and narrows (higher Q).\nChange C or L and watch f₀ shift.',
      observe: '2D: I(f) resonance curve with marker. 3D: series R–L–C driven by the source.',
    },
    controls: {
      title: 'RLC drive lab',
      V: 'Drive voltage V',
      VHelp: 'Amplitude of the AC source.',
      R: 'Resistance R',
      RHelp: 'Series resistance — smaller R means higher Q and a taller, narrower peak.',
      L: 'Inductance L',
      LHelp: 'Series inductance (henries in teaching scale).',
      C: 'Capacitance C',
      CHelp: 'Series capacitance; with L it sets f₀.',
      f: 'Drive frequency f',
      fHelp: 'Source frequency; resonance when f ≈ f₀.',
    },
    info: {
      f0: 'Resonance f₀',
      I: 'Current I',
      Z: 'Impedance |Z|',
      Q: 'Quality Q',
    },
    teach: {
      title: 'Key ideas',
      t1: 'At resonance, ωL = 1/(ωC), so Z collapses to R and current is V/R.',
      t2: 'Below f₀ the circuit looks capacitive; above f₀ it looks inductive.',
      t3: 'High Q means energy rings longer and the I(f) peak is sharp — useful for filters and tuning.',
      t4: 'Forced resonance is everywhere: radio tuners, wireless charging, and mechanical analogues (driven oscillators).',
    },
  },

  em_wave_radiation: {
    navTitle: 'EM Radiation',
    title: 'Dipole EM Wave Radiation',
    desc: 'An oscillating electric dipole launches electromagnetic waves; wavelength, far-field distance, and radiated power density scale with frequency and amplitude.',
    hint: '1) Set frequency · 2) Set amplitude · 3) Toggle near/far markers · watch λ and the radiation pattern',
    principle: {
      desc: 'Accelerating charges radiate. A short oscillating dipole produces an EM wave with λ = c/f and a sin²θ power pattern in the far field. The far-field (radiation) zone begins roughly beyond r ~ λ. Peak Poynting flux grows with amplitude and frequency in this teaching model. Inspired by open dipole-radiation / EM-wave classroom animations.',
      equation: '\\lambda=c/f\\quad\\cdot\\quad S\\propto (amp\\,f/r)^{2}\\sin^{2}\\theta\\quad\\cdot\\quad r_{far}\\sim\\lambda',
      goal: 'Link frequency to wavelength and see how the radiation zone and pattern depend on f and amplitude.',
      steps: 'Raise frequency — λ shrinks and the far-field marker moves in.\nIncrease amplitude — radiated intensity rises.\nToggle near/far overlay to separate reactive near field from radiating far field.',
      observe: '2D: λ, r_far, and S peak. 3D: dipole and expanding wavefronts / pattern.',
    },
    controls: {
      title: 'Radiation lab',
      frequency: 'Frequency f',
      frequencyHelp: 'Oscillation frequency of the dipole; sets λ = c/f.',
      amplitude: 'Amplitude',
      amplitudeHelp: 'Relative dipole strength — scales radiated intensity.',
      showNearFar: 'Show near/far boundary',
      showNearFarHelp: 'Mark the approximate transition to the radiation (far-field) zone.',
    },
    info: {
      wavelength: 'Wavelength λ',
      rFar: 'Far-field scale',
      Speak: 'Peak |S| (arb.)',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Static charges do not radiate; radiation needs acceleration (time-varying currents/dipoles).',
      t2: 'In the far field, E and B are transverse and travel together as an EM wave at c.',
      t3: 'Dipole pattern: strongest broadside (θ = 90°), null along the dipole axis.',
      t4: 'Antennas, radio, and light all share this same radiated-wave physics at different frequencies.',
    },
  },

  em_wave_refraction: {
    navTitle: 'EM Refraction',
    title: 'EM Wave Refraction (Snell)',
    desc: 'A plane EM wave hitting a dielectric interface bends according to Snell’s law; beyond the critical angle you get total internal reflection.',
    hint: '1) Set n₁ and n₂ · 2) Sweep θ₁ · 3) Watch θ₂, R, and the TIR threshold',
    principle: {
      desc: 'Boundary conditions force the tangential wavevector to match, giving Snell’s law n₁ sin θ₁ = n₂ sin θ₂. When light goes from high to low index, θ₂ grows faster than θ₁; past the critical angle there is no real θ₂ — total internal reflection (TIR). Fresnel reflectance R rises toward TIR. Inspired by Snell / EM-interface teaching apps.',
      equation: 'n_1\\sin\\theta_1=n_2\\sin\\theta_2\\quad\\cdot\\quad \\theta_c=\\arcsin(n_2/n_1)\\ (n_1>n_2)',
      goal: 'Verify Snell’s law and find the critical angle where TIR begins.',
      steps: 'Start with n₁ < n₂ (air→glass) and increase θ₁ — θ₂ stays smaller.\nSwap to n₁ > n₂ and raise θ₁ until θ₂ disappears (TIR).\nRead critical angle and watch reflectance climb.',
      observe: '2D: ray diagram + θ₂(θ₁). 3D: interface with incident, reflected, and refracted rays.',
    },
    controls: {
      title: 'Snell lab',
      n1: 'Index n₁',
      n1Help: 'Refractive index of the incident medium.',
      n2: 'Index n₂',
      n2Help: 'Refractive index of the transmitted medium.',
      theta1: 'Incidence θ₁',
      theta1Help: 'Angle from the surface normal in medium 1.',
    },
    info: {
      theta2: 'Refraction θ₂',
      tir: 'TIR (no real θ₂)',
      R: 'Reflectance R',
      snell: 'Snell residual',
      critical: 'Critical θ_c',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Snell’s law is phase matching along the boundary — the same physics for light and radio waves.',
      t2: 'Critical angle exists only when n₁ > n₂; beyond it, energy reflects (evanescent field still exists).',
      t3: 'Fresnel R depends on angle and polarization; this lab shows a teaching s-polarized scale.',
      t4: 'Fiber optics, prisms, and radar ground bounce all use refraction and TIR at interfaces.',
    },
  },

  radar_principles: {
    navTitle: 'Radar Principles',
    title: 'Pulse Radar Principles',
    desc: 'Pulse width, PRF, and target range set delay, unambiguous range, range resolution, and relative echo power.',
    hint: '1) Set pulse width & PRF · 2) Place the target range · 3) Check unambiguous status and echo strength',
    principle: {
      desc: 'A pulse radar sends a short RF burst and listens for the echo. Round-trip delay τ = 2R/c. Unambiguous range R_unamb = c/(2·PRF) — beyond that, echoes may be attributed to the wrong pulse. Range resolution ≈ c·τ_pulse/2. Echo power falls roughly as σ/R⁴ (radar equation teaching form). Inspired by pulse-radar A-scope teaching demos.',
      equation: '\\tau=2R/c\\quad\\cdot\\quad R_{unamb}=c/(2\\,PRF)\\quad\\cdot\\quad \\Delta R\\approx c\\tau_p/2',
      goal: 'See how PRF and pulse width trade unambiguous range, resolution, and echo timing.',
      steps: 'Place a target inside R_unamb — status OK.\nRaise PRF until the same range becomes ambiguous.\nShorten the pulse — range resolution improves.\nIncrease σ or shrink R — relative Pr rises.',
      observe: '2D: A-scope echo and Pr(R). 3D: antenna, pulse outbound, and target return.',
    },
    controls: {
      title: 'Pulse radar lab',
      pulseWidth: 'Pulse width τ_p',
      pulseWidthHelp: 'Duration of the transmit pulse — shorter pulses resolve range better.',
      prf: 'PRF',
      prfHelp: 'Pulse repetition frequency — higher PRF shrinks unambiguous range.',
      range: 'Target range R',
      rangeHelp: 'One-way distance to the reflector.',
      sigma: 'RCS σ',
      sigmaHelp: 'Radar cross-section of the target (relative).',
    },
    info: {
      tau: 'Echo delay τ',
      Runamb: 'Unambiguous R',
      Pr: 'Echo power',
      res: 'Range resolution',
      status: 'Range status',
      ok: 'Unambiguous',
      ambiguous: 'Ambiguous',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Time of flight measures range: every microsecond of delay is about 150 m one-way.',
      t2: 'PRF sets how often you listen — too high and far echoes wrap into the next interval.',
      t3: 'Short pulses give fine ΔR but carry less energy unless peak power rises.',
      t4: 'Received power plummets with range (∼1/R⁴) — big antennas and high peak power fight that loss.',
    },
  },

  stealth_technology: {
    navTitle: 'Stealth Tech',
    title: 'Stealth & Radar Cross-Section',
    desc: 'Shaping and absorbent coatings reduce effective RCS relative to a conventional target; wavelength vs feature size sets diffraction limits.',
    hint: '1) Raise shaping · 2) Raise absorb · 3) Change frequency — compare σ_conv vs σ_stealth',
    principle: {
      desc: 'Radar cross-section (RCS) σ measures how strongly a target reradiates toward the radar. Stealth combines geometric shaping (deflect scatter away from the receiver) and radar-absorbent materials (convert RF to heat). Effective σ drops as shaping and absorb increase; when λ approaches feature size, diffraction softens the benefit. Inspired by RCS / stealth teaching comparisons.',
      equation: '\\sigma_{eff}\\approx\\sigma_0\\,(1-s)(1-a)\\quad\\cdot\\quad \\lambda=c/f',
      goal: 'Quantify how shaping and absorption cut RCS, and when diffraction limits the reduction.',
      steps: 'Start with low shaping/absorb — σ_eff ≈ σ_conv.\nRaise shaping — specular lobes deflect, σ_eff falls.\nAdd absorb — residual scatter shrinks further.\nLower frequency (longer λ) and watch diffraction hint grow.',
      observe: '2D: conventional vs stealth scatter bars. 3D: shaped body and reduced return lobes.',
    },
    controls: {
      title: 'RCS stealth lab',
      shaping: 'Shaping factor',
      shapingHelp: 'How strongly geometry deflects energy away from the radar line of sight (0–1).',
      absorb: 'Absorber factor',
      absorbHelp: 'How much incident RF the coating dissipates as heat (0–1).',
      frequency: 'Radar frequency f',
      frequencyHelp: 'Carrier frequency — sets λ and whether edges look “sharp” or diffractive.',
    },
    info: {
      sigmaConv: 'Conventional σ',
      sigmaStealth: 'Stealth σ_eff',
      ratio: 'Reduction ratio',
      lambda: 'Wavelength λ',
      diffraction: 'Diffraction hint',
    },
    teach: {
      title: 'Key ideas',
      t1: 'Shaping aims specular reflections away from the threat radar — facets and smooth blends matter.',
      t2: 'RAM (radar-absorbent material) trades reflected power for heat inside the coating.',
      t3: 'Reduction ratio σ_conv/σ_eff shows how many times “smaller” the echo looks.',
      t4: 'At long λ (low f), edges diffract and cavities resonate — perfect geometric stealth fails.',
    },
  },

  microwave_oven: {
    navTitle: 'Microwave Oven',
    title: 'Microwave Oven Cavity',
    desc: 'A magnetron at 2.45 GHz feeds a metal cavity; standing-wave modes heat food, and a turntable averages hot/cold spots.',
    hint: '1) Set power · 2) Pick mode index · 3) Toggle turntable · 4) Raise water fraction — watch heating',
    principle: {
      desc: 'A magnetron produces microwaves near 2.45 GHz (λ₀ ≈ 12.2 cm). The oven cavity supports standing-wave modes; |E| peaks heat water dipoles (dielectric loss). Without motion, cold spots sit at nodes; a turntable averages exposure. Cavity wavelength depends on mode index and cavity size. Inspired by magnetron / cavity microwave-oven teaching models.',
      equation: 'f\\approx 2.45\\,\\mathrm{GHz}\\quad\\cdot\\quad \\lambda_0=c/f\\quad\\cdot\\quad P_{heat}\\propto P\\,\\varepsilon^{\\prime\\prime}\\,|E|^{2}\\,w',
      goal: 'Relate cavity modes and turntable motion to heating uniformity and power absorbed by water.',
      steps: 'Note f and free-space λ.\nChange mode index — watch the |E| pattern and λ_c shift.\nTurn the turntable on — hot spots smear in time.\nRaise water fraction — heating proxy increases.',
      observe: '2D: |E|(x) and spot grid. 3D: cavity, magnetron, turntable, and mode glow.',
    },
    controls: {
      title: 'Oven cavity lab',
      power: 'Magnetron power',
      powerHelp: 'Transmit power feeding the cavity (teaching watts).',
      modeIndex: 'Mode index',
      modeIndexHelp: 'Which standing-wave pattern the cavity is illustrating.',
      turntable: 'Turntable',
      turntableHelp: '1 = rotating food averages nodes/antinodes; 0 = fixed cold spots.',
      waterFrac: 'Water fraction',
      waterFracHelp: 'Relative water content of the load — more water absorbs more microwave power.',
    },
    info: {
      freq: 'Magnetron f',
      lambda: 'Free-space λ',
      lamC: 'Cavity λ_c',
      heat: 'Heating proxy',
    },
    teach: {
      title: 'Key ideas',
      t1: '2.45 GHz is in an ISM band where water absorbs efficiently and the cavity size is practical.',
      t2: 'Metal walls enforce boundary conditions → discrete cavity modes and standing waves.',
      t3: 'Nodes are cold; antinodes are hot — turntables (or mode stirrers) improve uniformity.',
      t4: 'Heating is dielectric loss in polar molecules, not “radioactive” and not uniform like a conventional oven.',
    },
  },
};

function main() {
  const raw = fs.readFileSync(LANG, 'utf8');
  const data = JSON.parse(raw);
  if (!data.modules || typeof data.modules !== 'object') {
    throw new Error('lang/en.json missing modules object');
  }

  const ids = Object.keys(MODULES);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    data.modules[id] = MODULES[id];
    console.log('upserted modules.' + id);
  }

  fs.writeFileSync(LANG, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Wrote', LANG);
  console.log('Done:', ids.length, 'modules');
}

main();
