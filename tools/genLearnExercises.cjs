// Generates learn/<id>.html and exercises/<id>.json for every curriculum module.
// Run: node tools/genLearnExercises.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LANG = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', 'en.json'), 'utf8'));
const LEARN_DIR = path.join(ROOT, 'learn');
const EX_DIR = path.join(ROOT, 'exercises');

const MODULE_IDS = [
  'cathode_ray', 'millikan', 'mass_spec', 'cross_section', 'planetary',
  'cloud_chamber', 'rutherford', 'spectral_density', 'bb_features', 'rayleigh_jeans',
  'planck', 'photoelectric', 'wave_theory', 'quantum_theory',   'applications',
  'nuclear_reactor',
  'nuclear_fission', 'nuclear_fusion', 'radioactive_decay',
  'binding_energy', 'alpha_beta_decay', 'geiger_counter', 'neutron_moderator', 'decay_chain', 'pet_tracer',
  'nai_spectrometer', 'hpge_vs_nai', 'gm_dead_time',
  'alpha_spectroscopy', 'neutron_detector', 'pet_coincidence', 'shielding_detector',
  'lab_canvas', 'atomic_nuclear_formulas', 'periodic_table', 'chart_of_nuclides', 'nuclear_reaction',
  'prism_spectroscope', 'frank_hertz', 'hydrogen_spectrum', 'planetary_disadvantages',
  'bohr', 'xray_discovery', 'xray_wave', 'xray_particle', 'compton', 'light_duality',
  'de_broglie', 'davisson_germer', 'wave_beam', 'uncertainty_xp', 'uncertainty_et',
  'wave_particle_probability', 'wavefunction_stats', 'double_slit',
  'schrodinger_discovery', 'infinite_well', 'orbital', 'quantum_computer',
  'nmr_mri', 'esr_epr',
  'fourier_waves', 'wave_equation_2d', 'quantum_ho', 'quantum_tunneling', 'heat_diffusion', 'eigenvalue_lab',
  'schrodinger_calculator', 'fourier_transform', 'variational_method', 'complex_phasor',
  'spherical_harmonics', 'sturm_liouville', 'pde_visual', 'numerical_methods',
];

/** Curated exercises — nuclear_reactor included in EXERCISES map below. */
const EXERCISES = {
  cathode_ray: [
    { type: 'selection', prompt: 'In Thomson’s CRT, when the electric and magnetic forces on the beam cancel, the beam speed equals:', choices: ['E/B', 'B/E', 'e/m', '√(2eV/m) only, never E/B'], answer: 0, explain: 'Force balance: eE = evB ⇒ v = E/B.' },
    { type: 'blank', prompt: 'The charge-to-mass ratio of the electron is written ____.', answer: 'e/m', accept: ['e/m', 'e / m', 'q/m'], explain: 'Thomson measured e/m ≈ 1.76×10¹¹ C/kg.' },
    { type: 'calculation', prompt: 'If E = 2.0×10⁴ N/C and B = 1.0×10⁻³ T at balance, what is v in m/s?', answer: 2e7, tolerance: 1e5, unit: 'm/s', explain: 'v = E/B = 2×10⁴ / 10⁻³ = 2×10⁷ m/s.' },
  ],
  millikan: [
    { type: 'selection', prompt: 'Millikan’s oil-drop experiment measured:', choices: ['e (elementary charge)', 'e/m', 'Planck’s h', 'Avogadro’s number only'], answer: 0, explain: 'Balancing gravity and electric force on charged drops yields e.' },
    { type: 'blank', prompt: 'At balance, qE = ____ (weight of the drop).', answer: 'mg', accept: ['mg', 'm g', 'weight'], explain: 'Electric force upward equals gravitational force downward.' },
    { type: 'calculation', prompt: 'If q = 2e and e = 1.6×10⁻¹⁹ C, what is q in C?', answer: 3.2e-19, tolerance: 1e-21, unit: 'C', explain: 'q = 2 × 1.6×10⁻¹⁹ = 3.2×10⁻¹⁹ C.' },
  ],
  mass_spec: [
    { type: 'selection', prompt: 'In a magnetic mass spectrometer, radius of the ion path is proportional to:', choices: ['m/q (at fixed v, B)', 'q/m only', 'temperature', 'only charge q'], answer: 0, explain: 'r = mv/(qB) ⇒ r ∝ m/q for fixed v, B.' },
    { type: 'blank', prompt: 'The Lorentz force magnitude on a charge q with speed v in field B (⊥) is F = ____.', answer: 'qvB', accept: ['qvB', 'q v B', 'evB'], explain: 'F = qvB when v ⊥ B.' },
    { type: 'calculation', prompt: 'For r = mv/(qB), if m doubles and q, v, B stay fixed, r becomes how many times larger?', answer: 2, tolerance: 0.01, unit: '×', explain: 'r ∝ m ⇒ doubles.' },
  ],
  cross_section: [
    { type: 'selection', prompt: 'A scattering cross-section has dimensions of:', choices: ['area', 'volume', 'force', 'energy'], answer: 0, explain: 'σ is an effective area for scattering.' },
    { type: 'blank', prompt: 'The geometric cross-section of a hard sphere of radius R is σ = ____.', answer: 'πR²', accept: ['πR^2', 'pi R^2', 'πR²', 'pi*R^2'], explain: 'Target presents area πR².' },
    { type: 'calculation', prompt: 'If R = 2 (same units), what is πR²? Use π ≈ 3.14.', answer: 12.56, tolerance: 0.1, unit: '', explain: 'π×4 ≈ 12.56.' },
  ],
  planetary: [
    { type: 'selection', prompt: 'In a classical planetary atom model, electrons are imagined to:', choices: ['orbit the nucleus like planets', 'fill standing-wave orbitals only', 'have no charge', 'sit still at the nucleus'], answer: 0, explain: 'Rutherford–Bohr era “solar system” picture of the atom.' },
    { type: 'blank', prompt: 'Coulomb force provides the ____ force for a classical orbiting electron.', answer: 'centripetal', accept: ['centripetal', 'centrepetal'], explain: 'k e²/r² = m v²/r.' },
    { type: 'calculation', prompt: 'If orbital radius doubles and speed is unchanged, centripetal acceleration v²/r becomes what factor of the original?', answer: 0.5, tolerance: 0.01, unit: '×', explain: 'a ∝ 1/r ⇒ half.' },
  ],
  cloud_chamber: [
    { type: 'selection', prompt: 'A cloud chamber makes ionizing tracks visible as:', choices: ['condensation trails', 'X-ray shadows', 'sound waves', 'magnetic domains'], answer: 0, explain: 'Supersaturated vapor condenses along ion trails.' },
    { type: 'blank', prompt: 'Charged particles leave ____ trails in a cloud chamber.', answer: 'ionization', accept: ['ionization', 'ion', 'ionising', 'ionizing'], explain: 'Ions seed droplet formation.' },
    { type: 'calculation', prompt: 'If a particle creates 1000 ion pairs/cm and travels 5 cm, how many ion pairs (order of magnitude count)?', answer: 5000, tolerance: 1, unit: '', explain: '1000 × 5 = 5000.' },
  ],
  rutherford: [
    { type: 'selection', prompt: 'Rutherford scattering showed the atom’s positive charge is:', choices: ['concentrated in a tiny nucleus', 'spread uniformly (Thomson plum pudding)', 'on the electron cloud only', 'zero'], answer: 0, explain: 'Large-angle α scatters require a compact massive nucleus.' },
    { type: 'blank', prompt: 'The projectile in Rutherford’s classic experiment was an ____ particle.', answer: 'alpha', accept: ['alpha', 'α', 'helium nucleus'], explain: 'α particles from radioactive sources.' },
    { type: 'calculation', prompt: 'If closest approach distance scales as 1/E, and E doubles, closest approach becomes what factor of the original?', answer: 0.5, tolerance: 0.01, unit: '×', explain: 'd ∝ 1/E ⇒ half.' },
  ],
  spectral_density: [
    { type: 'selection', prompt: 'Blackbody spectral radiance depends strongly on:', choices: ['temperature T', 'only volume', 'only magnetic field', 'nuclear spin only'], answer: 0, explain: 'Planck / Wien / Stefan–Boltzmann all involve T.' },
    { type: 'blank', prompt: 'The peak wavelength of a blackbody shifts with T according to Wien’s ____ law.', answer: 'displacement', accept: ['displacement', 'wien', "Wien's"], explain: 'λ_max T = constant.' },
    { type: 'calculation', prompt: 'If λ_max T = 2.9×10⁻³ m·K and T = 2900 K, λ_max in μm is approximately?', answer: 1, tolerance: 0.05, unit: 'μm', explain: 'λ = 2.9e-3/2900 = 1×10⁻⁶ m = 1 μm.' },
  ],
  bb_features: [
    { type: 'selection', prompt: 'As a blackbody gets hotter, its spectrum peak moves toward:', choices: ['shorter wavelengths', 'longer wavelengths', 'zero intensity', 'only infrared forever'], answer: 0, explain: 'Wien: hotter → blue-shifted peak.' },
    { type: 'blank', prompt: 'Total radiated power ∝ T to the power ____ (Stefan–Boltzmann).', answer: '4', accept: ['4', 'four'], explain: 'P ∝ T⁴.' },
    { type: 'calculation', prompt: 'If T doubles, total power increases by what factor?', answer: 16, tolerance: 0.01, unit: '×', explain: '2⁴ = 16.' },
  ],
  rayleigh_jeans: [
    { type: 'selection', prompt: 'The Rayleigh–Jeans formula fails at short wavelengths — the:', choices: ['ultraviolet catastrophe', 'infrared catastrophe', 'photoelectric effect', 'Compton shift'], answer: 0, explain: 'Classical RJ ∝ T/λ⁴ diverges as λ→0.' },
    { type: 'blank', prompt: 'Rayleigh–Jeans spectral density is proportional to T / λ____.', answer: '4', accept: ['4', '^4'], explain: 'u(λ) ∝ T/λ⁴.' },
    { type: 'calculation', prompt: 'If λ is halved (RJ regime), intensity prediction scales by what factor?', answer: 16, tolerance: 0.01, unit: '×', explain: '1/(1/2)⁴ = 16.' },
  ],
  planck: [
    { type: 'selection', prompt: 'Planck resolved the UV catastrophe by quantizing:', choices: ['oscillator energy E = nhf', 'only electron charge', 'only gravity', 'temperature alone'], answer: 0, explain: 'Energy comes in quanta hf.' },
    { type: 'blank', prompt: 'A single quantum of energy for frequency f is E = ____.', answer: 'hf', accept: ['hf', 'h f', 'hν', 'hν'], explain: 'E = hf = hν.' },
    { type: 'calculation', prompt: 'If h = 6.63×10⁻³⁴ and f = 1.0×10¹⁴ Hz, E in joules (scientific, 2 sig)?', answer: 6.63e-20, tolerance: 5e-22, unit: 'J', explain: 'E = hf = 6.63×10⁻²⁰ J.' },
  ],
  photoelectric: [
    { type: 'selection', prompt: 'Photoelectrons are emitted only if photon energy exceeds:', choices: ['work function φ', 'rest energy mc² always', 'kT only', 'binding of the nucleus'], answer: 0, explain: 'hf ≥ φ for emission.' },
    { type: 'blank', prompt: 'Einstein’s photoelectric equation: KE_max = hf − ____.', answer: 'φ', accept: ['φ', 'phi', 'work function', 'W'], explain: 'KE_max = hf − φ.' },
    { type: 'calculation', prompt: 'If hf = 3.0 eV and φ = 2.0 eV, KE_max in eV is?', answer: 1, tolerance: 0.01, unit: 'eV', explain: 'KE = 3 − 2 = 1 eV.' },
  ],
  wave_theory: [
    { type: 'selection', prompt: 'Classical wave theory of light wrongly predicts photoelectric KE depends on:', choices: ['intensity (not frequency)', 'only frequency', 'only Planck’s h', 'nuclear charge'], answer: 0, explain: 'Waves dump continuous energy; quantum needs hf.' },
    { type: 'blank', prompt: 'In wave theory, brighter light means larger wave ____.', answer: 'amplitude', accept: ['amplitude', 'A'], explain: 'Intensity ∝ amplitude².' },
    { type: 'calculation', prompt: 'If intensity doubles and area is fixed, power through that area becomes what factor?', answer: 2, tolerance: 0.01, unit: '×', explain: 'P ∝ I.' },
  ],
  quantum_theory: [
    { type: 'selection', prompt: 'Quantum theory of light treats light as:', choices: ['photons of energy hf', 'only continuous fields', 'sound phonons', 'massive electrons'], answer: 0, explain: 'Einstein/Planck picture: discrete quanta.' },
    { type: 'blank', prompt: 'Photon energy is proportional to ____.', answer: 'frequency', accept: ['frequency', 'f', 'ν', 'nu'], explain: 'E = hf.' },
    { type: 'calculation', prompt: 'How many photons of 2 eV equal 10 eV total energy?', answer: 5, tolerance: 0.01, unit: '', explain: '10/2 = 5.' },
  ],
  applications: [
    { type: 'selection', prompt: 'A practical use of the photoelectric effect is:', choices: ['light sensors / photodiodes', 'nuclear fission reactors', 'only CRT magnetic focusing', 'measuring g'], answer: 0, explain: 'Photocells and detectors rely on photoemission / photoconduction.' },
    { type: 'blank', prompt: 'Solar cells convert light into ____ energy.', answer: 'electrical', accept: ['electrical', 'electric', 'electricity'], explain: 'Photovoltaic conversion.' },
    { type: 'calculation', prompt: 'If each photon frees at most one electron, 100 photons free at most how many electrons?', answer: 100, tolerance: 0, unit: '', explain: 'One-to-one in the ideal Einstein picture.' },
  ],
  nuclear_reactor: [
    { type: 'selection', prompt: 'In a PWR, inserting control rods deeper primarily:', choices: ['Absorbs neutrons and lowers fission power', 'Increases coolant pressure only', 'Speeds up the turbine directly', 'Removes the steam generator'], answer: 0, explain: 'Control rods are neutron absorbers; more insertion → lower reactivity → lower power.' },
    { type: 'blank', prompt: 'Primary and secondary loops exchange heat in the ____ generator.', answer: 'steam', accept: ['steam', 'Steam'], explain: 'Steam generator: heat exchanger; fluids do not mix.' },
    { type: 'calculation', prompt: 'If P_th = 900 MW and η = 0.33, P_e ≈ ? MW', answer: 297, tolerance: 5, unit: 'MW', explain: 'P_e = 0.33 × 900 = 297 MW.' },
  ],
  nuclear_fission: [
    { type: 'selection', prompt: 'If k > 1, the chain reaction typically:', choices: ['Grows (supercritical)', 'Dies out immediately', 'Stops producing neutrons', 'Requires zero enrichment'], answer: 0, explain: 'k > 1 → each generation grows.' },
    { type: 'blank', prompt: 'The fissile isotope that usually splits is U-____.', answer: '235', accept: ['235', 'U-235', 'U235'], explain: 'U-235 is fissile with slow neutrons.' },
    { type: 'calculation', prompt: 'If 1000 neutrons become 1200 next generation, k =?', answer: 1.2, tolerance: 0.01, unit: '', explain: '1200/1000 = 1.2.' },
  ],
  nuclear_fusion: [
    { type: 'selection', prompt: 'D–T fusion is hard mainly because nuclei:', choices: ['Repel each other (Coulomb barrier)', 'Attract at all distances', 'Have zero charge', 'Cannot release energy'], answer: 0, explain: 'Positive charges → Coulomb barrier.' },
    { type: 'blank', prompt: '²H + ³H → ⁴He + ____ + energy.', answer: 'n', accept: ['n', 'neutron', 'a neutron'], explain: 'D–T → He-4 + neutron + 17.6 MeV.' },
    { type: 'calculation', prompt: 'D–T releases ~17.6 MeV. Rounded to nearest integer?', answer: 18, tolerance: 1, unit: 'MeV', explain: '17.6 ≈ 18.' },
  ],
  radioactive_decay: [
    { type: 'selection', prompt: 'After two half-lives, remaining fraction (ideal) is about:', choices: ['1/4', '1/2', '1/8', 'zero always'], answer: 0, explain: '1 → 1/2 → 1/4.' },
    { type: 'blank', prompt: 'N(t) = N₀ e^(−____ t).', answer: 'λ', accept: ['λ', 'lambda', 'Λ'], explain: 'λ = decay constant; T½ = ln2/λ.' },
    { type: 'calculation', prompt: 'If T½ = 10 s, after 30 s fraction remaining?', answer: 0.125, tolerance: 0.01, unit: '', explain: '(1/2)³ = 0.125.' },
  ],
  binding_energy: [
    { type: 'selection', prompt: 'Binding energy per nucleon B/A is highest near:', choices: ['iron-56 (medium A)', 'hydrogen-1', 'uranium-238', 'helium-3 only'], answer: 0, explain: 'The curve peaks near A≈56 — most stable per nucleon.' },
    { type: 'blank', prompt: 'Both fission of heavy nuclei and fusion of light nuclei move toward ____ B/A.', answer: 'higher', accept: ['higher', 'greater', 'more'], explain: 'Products are closer to the iron peak.' },
    { type: 'calculation', prompt: 'If B/A rises from 7.0 to 8.0 MeV for A=100 nucleons, approximate ΔB in MeV?', answer: 100, tolerance: 1, unit: 'MeV', explain: 'ΔB ≈ (8−7)×100 = 100 MeV (teaching order).' },
  ],
  alpha_beta_decay: [
    { type: 'selection', prompt: 'Beta decay spectra are continuous because:', choices: ['energy is shared with a neutrino', 'alpha mass is wrong', 'gamma has no energy', 'half-life is zero'], answer: 0, explain: 'Neutrino carries variable energy → electron energy spectrum is continuous.' },
    { type: 'blank', prompt: 'Alpha decay emits a ____ nucleus.', answer: 'helium', accept: ['helium', 'He', '⁴He', 'alpha'], explain: 'α particle = ²He⁴ nucleus.' },
    { type: 'selection', prompt: 'In alpha decay, the daughter nucleus:', choices: ['recoils and shares energy with the alpha', 'never moves', 'becomes a neutrino', 'gains two protons always'], answer: 0, explain: 'Momentum conservation: daughter recoils; alpha carries most of Q but not always exactly all of it as KE.' },
  ],
  geiger_counter: [
    { type: 'selection', prompt: 'Doubling distance in open geometry (fixed source) typically reduces rate by about:', choices: ['4× (inverse square)', '2× only', 'no change', 'exactly 8× always'], answer: 0, explain: 'Flux ∝ 1/r² → rate ∝ 1/r².' },
    { type: 'blank', prompt: 'Shielding reduces intensity as I = I₀ e^(−____ x).', answer: 'μ', accept: ['μ', 'mu', 'mu x'], explain: 'μ = linear attenuation coefficient.' },
    { type: 'calculation', prompt: 'If rate is 400 cps at 1 m, at 2 m (same geometry) rate is about?', answer: 100, tolerance: 5, unit: 'cps', explain: '400×(1/2)² = 100.' },
  ],
  nai_spectrometer: [
    { type: 'selection', prompt: 'The photopeak corresponds to:', choices: ['full absorption of the γ energy in the crystal', 'only Compton scatter with escape', 'PMT dark noise', 'α particle tracks'], answer: 0, explain: 'Photoelectric (or multiple events that sum) deposits the full γ energy → photopeak.' },
    { type: 'blank', prompt: 'Energy resolution is often quoted as R = FWHM / ____.', answer: 'E', accept: ['E', 'energy', 'peak energy'], explain: 'R = FWHM/E; often given in % at 662 keV for NaI.' },
    { type: 'selection', prompt: 'The Compton edge is:', choices: ['the maximum energy a recoil electron can get in one scatter', 'the photopeak centroid', 'the PMT gain', 'always at 511 keV'], answer: 0, explain: 'E_C = E·2α/(1+2α); continuum ends near this energy.' },
    { type: 'calculation', prompt: 'If FWHM = 46 keV at E = 662 keV, R in percent is about?', answer: 7, tolerance: 0.5, unit: '%', explain: '100×46/662 ≈ 7%.' },
  ],
  gm_dead_time: [
    { type: 'selection', prompt: 'In the Geiger region, pulse height vs γ energy is roughly:', choices: ['the same for all energies (saturated)', 'strictly linear with E', 'zero always', 'proportional to 1/E'], answer: 0, explain: 'Avalanche saturates — GM counts events, it does not measure energy.' },
    { type: 'blank', prompt: 'Non-paralyzable: n = m / (1 + m ____).', answer: 'τ', accept: ['τ', 'tau', 'dead time', 'τ'], explain: 'τ = dead time; observed rate n is less than true rate m.' },
    { type: 'calculation', prompt: 'If m = 10000 s⁻¹ and τ = 100 µs, n ≈ ? (non-paralyzable)', answer: 5000, tolerance: 50, unit: 's⁻¹', explain: 'n = 10000/(1+10000·1e-4) = 10000/2 = 5000.' },
    { type: 'selection', prompt: 'You should operate a GM tube:', choices: ['on the flat Geiger plateau', 'in continuous discharge', 'below any gas ionization', 'only at 0 V'], answer: 0, explain: 'Plateau: nearly constant rate vs HV — stable counting.' },
  ],
  hpge_vs_nai: [
    { type: 'selection', prompt: 'Compared with NaI(Tl), HPGe energy resolution at 662 keV is typically:', choices: ['much better (~0.2% vs ~7%)', 'much worse', 'exactly the same', 'only better for alphas'], answer: 0, explain: 'Semiconductor HPGe peaks are far sharper than scintillator NaI peaks.' },
    { type: 'blank', prompt: 'Resolution R is defined as FWHM / ____.', answer: 'E', accept: ['E', 'energy'], explain: 'R = FWHM/E, often quoted in percent.' },
    { type: 'selection', prompt: 'HPGe detectors usually need cryogenic cooling mainly to:', choices: ['reduce leakage current / noise for good resolution', 'make gammas colder', 'block neutrons', 'increase dead time'], answer: 0, explain: 'Cooling (LN₂ or cryocooler) keeps leakage noise low so peaks stay sharp.' },
    { type: 'calculation', prompt: 'If FWHM = 1.3 keV at E = 662 keV, R in percent is about?', answer: 0.2, tolerance: 0.05, unit: '%', explain: '100×1.3/662 ≈ 0.2%.' },
  ],
  alpha_spectroscopy: [
    { type: 'selection', prompt: 'α spectroscopy with a Si detector is best done in:', choices: ['vacuum (or very short path)', 'thick air at STP', 'water', 'lead shielding only'], answer: 0, explain: 'Air causes energy loss and straggling that smear and shift α peaks.' },
    { type: 'blank', prompt: 'Am-241’s main α line is about 5.486 ____.', answer: 'MeV', accept: ['MeV', 'mev'], explain: 'Alpha energies are typically several MeV.' },
    { type: 'selection', prompt: 'Increasing air thickness between source and detector mainly:', choices: ['shifts peaks down and broadens them', 'makes peaks sharper', 'creates 511 keV peaks', 'stops all betas only'], answer: 0, explain: 'dE/dx loss + straggling → lower centroid and larger FWHM.' },
    { type: 'calculation', prompt: 'If FWHM = 20 keV at E = 5.486 MeV, R in percent is about?', answer: 0.36, tolerance: 0.05, unit: '%', explain: '100×0.020/5.486 ≈ 0.36%.' },
  ],
  neutron_detector: [
    { type: 'selection', prompt: 'A ³He tube detects neutrons primarily via:', choices: ['³He(n,p)³H charged products', 'direct neutron ionization only', 'photoelectric γ absorption', 'Cherenkov light from neutrons'], answer: 0, explain: 'Neutrons are neutral; capture produces ionizing charged particles.' },
    { type: 'blank', prompt: 'BF₃ tubes use the capture reaction ¹⁰B(n,____)⁷Li.', answer: 'α', accept: ['α', 'alpha', 'a'], explain: '¹⁰B(n,α)⁷Li releases charged products detected in the gas.' },
    { type: 'selection', prompt: 'Thermal neutrons vs fast neutrons in these gas counters:', choices: ['thermal efficiency is much higher', 'fast is always higher', 'equal always', 'zero for both'], answer: 0, explain: 'Capture cross-sections peak at thermal energies; moderators help fast beams.' },
    { type: 'selection', prompt: '“Wall effect” in a proportional counter refers to:', choices: ['partial energy deposit when products hit the wall', 'HV cable heating', 'dead time only', 'moderator melting'], answer: 0, explain: 'Charged products that strike the wall deposit less than Q → continuum below the peak.' },
  ],
  pet_coincidence: [
    { type: 'selection', prompt: 'PET coincidence detects:', choices: ['two 511 keV γ rays from e⁺e⁻ annihilation', 'alpha pairs', 'only single 140 keV γ', 'radio waves'], answer: 0, explain: 'β⁺ annihilates with e⁻ → two back-to-back 511 keV photons.' },
    { type: 'blank', prompt: 'Random coincidences grow with a wider coincidence ____.', answer: 'window', accept: ['window', 'time window', 'τ', 'tau'], explain: 'Randoms ∝ singles² × window width.' },
    { type: 'selection', prompt: 'A common PET tracer for metabolism imaging is:', choices: ['FDG (¹⁸F)', 'Am-241', 'Pu-239', 'BF₃ gas'], answer: 0, explain: 'Fluorodeoxyglucose labeled with ¹⁸F is widely used.' },
    { type: 'calculation', prompt: 'If true = 800 /s and random = 200 /s (ignore scatter), true fraction % is?', answer: 80, tolerance: 2, unit: '%', explain: '800/(800+200)=0.8 → 80%.' },
  ],
  shielding_detector: [
    { type: 'selection', prompt: 'Narrow-beam attenuation follows:', choices: ['I = I₀ e^(−μx)', 'I = I₀ + μx', 'I = I₀ / μx always', 'I independent of x'], answer: 0, explain: 'Exponential law with linear attenuation coefficient μ.' },
    { type: 'blank', prompt: 'The half-value layer (HVL) is the thickness that reduces I to ____ of I₀.', answer: '1/2', accept: ['1/2', '0.5', 'half', '50%'], explain: 'HVL = ln2 / μ.' },
    { type: 'selection', prompt: 'For fast neutrons, which shield is generally better in this teaching model?', choices: ['borated polyethylene / water', 'thin lead only', 'vacuum', 'glass'], answer: 0, explain: 'Hydrogenous + boron materials moderate and absorb neutrons better than lead.' },
    { type: 'calculation', prompt: 'If μ = 0.5 cm⁻¹ and x = 2 cm, I/I₀ = e^(−1) ≈ ?', answer: 0.37, tolerance: 0.02, unit: '', explain: 'e^(−1) ≈ 0.368.' },
  ],
  neutron_moderator: [
    { type: 'selection', prompt: 'Thermal neutrons are most effective for fission in U-235 because:', choices: ['fission cross-section peaks at low energy', 'they are faster', 'they have no mass', 'moderator absorbs all neutrons'], answer: 0, explain: 'σ_fission is largest near thermal energies (~0.025 eV).' },
    { type: 'blank', prompt: 'A moderator slows fast neutrons by elastic collisions with ____ nuclei.', answer: 'light', accept: ['light', 'low mass', 'hydrogen', 'H'], explain: 'Light nuclei take more energy per collision (ξ factor).' },
    { type: 'selection', prompt: 'Which moderator reaches thermal energy in fewer collisions (teaching model)?', choices: ['light water (~18)', 'graphite (~114)', 'same always', 'none work'], answer: 0, explain: 'Fewer collisions in water → faster moderation in this teaching model.' },
  ],
  decay_chain: [
    { type: 'selection', prompt: 'The U-238 series ends at stable:', choices: ['²⁰⁶Pb', '²³⁸U', '²²²Rn forever', '¹⁴C'], answer: 0, explain: 'Chain terminates at lead-206 after many α and β steps.' },
    { type: 'blank', prompt: '²²²Rn is a ____ — relevant to indoor air.', answer: 'gas', accept: ['gas', 'noble gas', 'radon gas'], explain: 'Radon is a gaseous decay product that can accumulate.' },
    { type: 'calculation', prompt: 'If one step has T½ = 3.82 d, after 3.82 d what fraction of that isotope remains?', answer: 0.5, tolerance: 0.02, unit: '', explain: 'One half-life → 50% remain.' },
  ],
  pet_tracer: [
    { type: 'selection', prompt: 'PET imaging uses coincidence detection of:', choices: ['511 keV gamma pairs from annihilation', 'alpha particles only', 'visible light', 'radio waves'], answer: 0, explain: 'β⁺ annihilates with e⁻ → two 511 keV γ back-to-back.' },
    { type: 'blank', prompt: 'Tracer activity falls as A(t) = A₀ e^(−____ t).', answer: 'λ', accept: ['λ', 'lambda'], explain: 'Same exponential law as other decays.' },
    { type: 'calculation', prompt: 'F-18 T½ ≈ 110 min. After 110 min, fraction remaining?', answer: 0.5, tolerance: 0.02, unit: '', explain: 'One half-life → 50%.' },
  ],
  prism_spectroscope: [
    { type: 'selection', prompt: 'A prism spectroscope separates light by:', choices: ['wavelength-dependent refraction', 'mass spectrometry', 'nuclear spin', 'only reflection'], answer: 0, explain: 'Dispersion: n = n(λ).' },
    { type: 'blank', prompt: 'Violet light typically bends ____ than red in a glass prism.', answer: 'more', accept: ['more', 'stronger', 'greater'], explain: 'Higher n for shorter λ.' },
    { type: 'calculation', prompt: 'If two lines are at 400 nm and 800 nm, the wavelength ratio (long/short) is?', answer: 2, tolerance: 0.01, unit: '', explain: '800/400 = 2.' },
  ],
  frank_hertz: [
    { type: 'selection', prompt: 'Franck–Hertz shows atomic energy levels are:', choices: ['quantized', 'continuous only', 'classical orbits forever', 'unobservable'], answer: 0, explain: 'Inelastic collisions at discrete voltages.' },
    { type: 'blank', prompt: 'Current drops when electrons lose energy in ____ collisions with atoms.', answer: 'inelastic', accept: ['inelastic', 'exciting', 'excitation'], explain: 'Excitation costs fixed ΔE.' },
    { type: 'calculation', prompt: 'If the first excitation is 4.9 eV, the voltage spacing between dips is about how many volts?', answer: 4.9, tolerance: 0.1, unit: 'V', explain: 'eΔV ≈ 4.9 eV ⇒ ΔV ≈ 4.9 V.' },
  ],
  hydrogen_spectrum: [
    { type: 'selection', prompt: 'Hydrogen emission lines come from electrons:', choices: ['jumping between levels', 'orbiting with any energy', 'annihilating protons', 'only vibrating molecules'], answer: 0, explain: 'ΔE = hf for transitions.' },
    { type: 'blank', prompt: 'The Balmer series involves transitions ending at n = ____.', answer: '2', accept: ['2', 'n=2'], explain: 'Balmer: n→2.' },
    { type: 'calculation', prompt: 'If E₂ = −3.4 eV and E₃ = −1.51 eV, photon energy |ΔE| in eV ≈?', answer: 1.89, tolerance: 0.05, unit: 'eV', explain: '3.4 − 1.51 = 1.89 eV.' },
  ],
  planetary_disadvantages: [
    { type: 'selection', prompt: 'A key failure of the classical planetary atom is:', choices: ['orbiting charges should radiate and spiral in', 'nuclei are too light', 'electrons have no mass', 'Coulomb’s law fails always'], answer: 0, explain: 'Accelerating charges radiate classically.' },
    { type: 'blank', prompt: 'Classical electrodynamics predicts atoms are ____ (unstable).', answer: 'unstable', accept: ['unstable', 'radiating', 'collapsing'], explain: 'Radiation damping collapses orbits.' },
    { type: 'calculation', prompt: 'If a classical orbit radiates and radius shrinks by 10%, remaining radius is what fraction of original?', answer: 0.9, tolerance: 0.01, unit: '', explain: '90% = 0.9.' },
  ],
  bohr: [
    { type: 'selection', prompt: 'Bohr postulated angular momentum quantization L =', choices: ['nħ', 'n h', 'only mvr = 0', '∞'], answer: 0, explain: 'L = nħ = nh/(2π).' },
    { type: 'blank', prompt: 'Hydrogen level energies scale as Eₙ ∝ −1/n____.', answer: '2', accept: ['2', '^2'], explain: 'Eₙ = −13.6/n² eV.' },
    { type: 'calculation', prompt: 'Ground-state energy of H is −13.6 eV. For n=2, E in eV is?', answer: -3.4, tolerance: 0.05, unit: 'eV', explain: '−13.6/4 = −3.4 eV.' },
  ],
  xray_discovery: [
    { type: 'selection', prompt: 'Röntgen discovered X-rays while studying:', choices: ['cathode rays / discharge tubes', 'radioactivity of uranium only', 'NMR', 'only sunlight'], answer: 0, explain: '1895 cathode-ray experiments.' },
    { type: 'blank', prompt: 'X-rays are a form of ____ radiation.', answer: 'electromagnetic', accept: ['electromagnetic', 'EM', 'em'], explain: 'High-energy EM waves/photons.' },
    { type: 'calculation', prompt: 'If tube voltage is 50 kV, max photon energy in keV is about?', answer: 50, tolerance: 1, unit: 'keV', explain: 'E_max ≈ eV_tube.' },
  ],
  xray_wave: [
    { type: 'selection', prompt: "Bragg's law for constructive reflection is:", choices: ['nλ = 2d sin θ', 'nλ = d sin θ', 'λ = 2d cos θ', 'E = hf only'], answer: 0, explain: 'Path difference 2d sinθ = nλ.' },
    { type: 'blank', prompt: 'In Bragg’s law, d is the ____ between crystal planes.', answer: 'spacing', accept: ['spacing', 'distance', 'separation'], explain: 'Interplanar spacing.' },
    { type: 'calculation', prompt: 'For n=1, λ=100 pm, d=200 pm, sin θ = λ/(2d). What is θ in degrees (nearest)?', answer: 14.5, tolerance: 0.5, unit: '°', explain: 'sinθ = 0.25 ⇒ θ ≈ 14.5°.' },
  ],
  xray_particle: [
    { type: 'selection', prompt: 'Hard X-rays eject electrons when photon energy exceeds:', choices: ['binding energy W', 'only kT', 'nuclear binding always', 'sound energy'], answer: 0, explain: 'Photoelectric absorption in matter.' },
    { type: 'blank', prompt: 'Photon energy E = hc / ____.', answer: 'λ', accept: ['λ', 'lambda', 'wavelength'], explain: 'E = hc/λ.' },
    { type: 'calculation', prompt: 'If E = 10 keV and W = 7 keV, photoelectron KE in keV is?', answer: 3, tolerance: 0.01, unit: 'keV', explain: 'KE = E − W = 3 keV.' },
  ],
  compton: [
    { type: 'selection', prompt: 'Compton shift Δλ depends on:', choices: ['scattering angle', 'only intensity', 'only slit width', 'temperature only'], answer: 0, explain: 'Δλ = λ_C (1 − cos θ).' },
    { type: 'blank', prompt: 'Compton wavelength λ_C = h / (m_e ____).', answer: 'c', accept: ['c', 'C'], explain: 'λ_C = h/(m_e c).' },
    { type: 'calculation', prompt: 'At θ = 90°, (1 − cos θ) = ?', answer: 1, tolerance: 0.01, unit: '', explain: 'cos 90° = 0 ⇒ 1 − 0 = 1.' },
  ],
  light_duality: [
    { type: 'selection', prompt: 'Wave–particle duality means light can show:', choices: ['both interference and photoelectric hits', 'only waves', 'only particles', 'neither'], answer: 0, explain: 'Interference vs photon detection.' },
    { type: 'blank', prompt: 'Young’s double slit demonstrates the ____ nature of light.', answer: 'wave', accept: ['wave', 'waves'], explain: 'Interference fringes.' },
    { type: 'calculation', prompt: 'If fringe spacing doubles when slit separation halves (small-angle), spacing becomes what factor?', answer: 2, tolerance: 0.01, unit: '×', explain: 'Δy ∝ 1/d.' },
  ],
  de_broglie: [
    { type: 'selection', prompt: 'de Broglie wavelength is λ =', choices: ['h/p', 'hf', '2d sin θ', 'e/m'], answer: 0, explain: 'λ = h/p = h/(mv) non-relativistically.' },
    { type: 'blank', prompt: 'Faster particles have ____ de Broglie wavelengths.', answer: 'shorter', accept: ['shorter', 'smaller', 'less'], explain: 'λ ∝ 1/p.' },
    { type: 'calculation', prompt: 'If momentum doubles, λ becomes what factor of the original?', answer: 0.5, tolerance: 0.01, unit: '×', explain: 'λ ∝ 1/p.' },
  ],
  davisson_germer: [
    { type: 'selection', prompt: 'Davisson–Germer proved electrons have:', choices: ['wave nature (diffraction)', 'only charge', 'zero mass', 'no momentum'], answer: 0, explain: 'Electron diffraction from Ni crystal.' },
    { type: 'blank', prompt: 'For electrons accelerated by V, λ = h / √(2m e ____).', answer: 'V', accept: ['V', 'voltage'], explain: 'p = √(2meV).' },
    { type: 'calculation', prompt: 'Classic peak near V = 54 V appears near θ ≈ how many degrees (order 50)?', answer: 50, tolerance: 5, unit: '°', explain: 'Historical peak ~50° at ~54 V.' },
  ],
  wave_beam: [
    { type: 'selection', prompt: 'A wave packet’s spatial width Δx and spread in k are linked by:', choices: ['uncertainty / Fourier width', 'Bragg only', 'Stefan–Boltzmann', 'Ohm’s law'], answer: 0, explain: 'Narrower packet ⇒ broader Δk.' },
    { type: 'blank', prompt: 'Group velocity of a packet is roughly the particle’s ____.', answer: 'velocity', accept: ['velocity', 'speed', 'v'], explain: 'v_g ≈ dω/dk ≈ p/m.' },
    { type: 'calculation', prompt: 'If Δx halves (minimum packet), Δk roughly becomes what factor?', answer: 2, tolerance: 0.2, unit: '×', explain: 'Δk ∼ 1/Δx.' },
  ],
  uncertainty_xp: [
    { type: 'selection', prompt: 'Heisenberg: Δx Δp ≥', choices: ['ħ/2', 'h', '0', 'mc'], answer: 0, explain: 'Δx Δp ≥ ħ/2.' },
    { type: 'blank', prompt: 'More precise position means ____ precise momentum.', answer: 'less', accept: ['less', 'worse', 'lower'], explain: 'Trade-off in the product.' },
    { type: 'calculation', prompt: 'If Δx = 1×10⁻¹⁰ m and ħ/2 ≈ 5×10⁻³⁵, minimum Δp (order) in kg·m/s is about 5×10^?', answer: -25, tolerance: 1, unit: '(exponent)', explain: 'Δp ≥ (ħ/2)/Δx ≈ 5×10⁻²⁵.' },
  ],
  uncertainty_et: [
    { type: 'selection', prompt: 'Energy–time uncertainty roughly says short-lived states have:', choices: ['broad energy width', 'zero energy', 'infinite lifetime', 'no spectrum'], answer: 0, explain: 'ΔE Δt ≳ ħ/2.' },
    { type: 'blank', prompt: 'ΔE Δt ≥ ħ/____.', answer: '2', accept: ['2'], explain: 'Same ħ/2 form as xp.' },
    { type: 'calculation', prompt: 'If lifetime Δt halves, minimum ΔE becomes what factor?', answer: 2, tolerance: 0.01, unit: '×', explain: 'ΔE ∝ 1/Δt.' },
  ],
  wave_particle_probability: [
    { type: 'selection', prompt: 'Born’s rule: probability density is related to:', choices: ['|ψ|²', 'Re(ψ) only', 'arg(ψ) only', '∇ψ only'], answer: 0, explain: 'P(x) = |ψ(x)|².' },
    { type: 'blank', prompt: 'The wavefunction ψ is a ____ amplitude.', answer: 'probability', accept: ['probability', 'complex probability'], explain: 'Probability amplitude.' },
    { type: 'calculation', prompt: 'If |ψ| doubles everywhere in a normalized region (then renormalize later conceptually), |ψ|² becomes what factor before renorm?', answer: 4, tolerance: 0.01, unit: '×', explain: '|ψ|² → 4|ψ|².' },
  ],
  wavefunction_stats: [
    { type: 'selection', prompt: 'Expectation value ⟨x⟩ is the average of x weighted by:', choices: ['|ψ|²', 'ψ alone', 'E only', 'random noise'], answer: 0, explain: '⟨x⟩ = ∫ x|ψ|² dx.' },
    { type: 'blank', prompt: 'Variance of x relates to uncertainty Δx = √(⟨x²⟩ − ⟨x⟩____).', answer: '2', accept: ['2', '²'], explain: 'Δx = √(⟨x²⟩ − ⟨x⟩²).' },
    { type: 'calculation', prompt: 'If ⟨x⟩ = 0 and ⟨x²⟩ = 4, Δx is?', answer: 2, tolerance: 0.01, unit: '', explain: '√4 = 2.' },
  ],
  double_slit: [
    { type: 'selection', prompt: 'Electrons in a double-slit build an interference pattern, showing:', choices: ['wave behaviour of matter', 'only particle hits with no wave', 'gravity waves', 'nuclear fission'], answer: 0, explain: 'Matter-wave interference.' },
    { type: 'blank', prompt: 'Which-path information destroys the ____ pattern.', answer: 'interference', accept: ['interference', 'fringe', 'fringes'], explain: 'Complementarity.' },
    { type: 'calculation', prompt: 'If slit separation doubles, fringe angular spacing roughly becomes what factor?', answer: 0.5, tolerance: 0.01, unit: '×', explain: 'θ ∝ λ/d.' },
  ],
  schrodinger_discovery: [
    { type: 'selection', prompt: 'Schrödinger’s equation governs the evolution of:', choices: ['the wavefunction ψ', 'only classical trajectories', 'nuclear binding always', 'temperature fields'], answer: 0, explain: 'iħ ∂ψ/∂t = Ĥψ.' },
    { type: 'blank', prompt: 'Stationary states have time factor e^(−iEt/____).', answer: 'ħ', accept: ['ħ', 'hbar', 'h-bar'], explain: 'Phase E t / ħ.' },
    { type: 'calculation', prompt: 'For a stationary state, |ψ|² is ____ in time (0 = changing, 1 = constant).', answer: 1, tolerance: 0, unit: '', explain: 'Probability density is time-independent.' },
  ],
  infinite_well: [
    { type: 'selection', prompt: 'Infinite square well energies are Eₙ ∝', choices: ['n²', 'n', '1/n', 'n³'], answer: 0, explain: 'Eₙ = n² π² ħ² / (2 m L²).' },
    { type: 'blank', prompt: 'ψ = 0 at the ____ of an infinite well.', answer: 'walls', accept: ['walls', 'boundaries', 'edges'], explain: 'Boundary condition.' },
    { type: 'calculation', prompt: 'E₂ / E₁ for the infinite well equals?', answer: 4, tolerance: 0.01, unit: '', explain: '(2/1)² = 4.' },
  ],
  orbital: [
    { type: 'selection', prompt: 'A hydrogen orbital ψₙₗₘ is labeled by quantum numbers:', choices: ['n, ℓ, m', 'only n', 'only spin', 'T, P, μ'], answer: 0, explain: 'Principal, angular, magnetic.' },
    { type: 'blank', prompt: 'Nodes (where ψ=0) total roughly n − ____.', answer: '1', accept: ['1'], explain: 'n − 1 nodes in the full wavefunction counting.' },
    { type: 'calculation', prompt: 'For n=3, Eₙ = −13.6/n² eV. E₃ in eV ≈?', answer: -1.51, tolerance: 0.05, unit: 'eV', explain: '−13.6/9 ≈ −1.51 eV.' },
  ],
  quantum_computer: [
    { type: 'selection', prompt: 'A qubit state α|0⟩ + β|1⟩ must satisfy:', choices: ['|α|² + |β|² = 1', 'α + β = 1', 'α = β always', 'α, β are only 0 or 1'], answer: 0, explain: 'Amplitudes are normalized complex numbers.' },
    { type: 'blank', prompt: 'Hadamard on |0⟩ produces the equal superposition ____.', answer: '|+⟩', accept: ['|+⟩', '|+>', '+', '(|0>+|1>)/√2', '(|0⟩+|1⟩)/√2'], explain: 'H|0⟩ = (|0⟩+|1⟩)/√2 = |+⟩.' },
    { type: 'selection', prompt: 'Measurement of a qubit:', choices: ['samples a classical bit and collapses the state', 'reads α and β without changing anything', 'is a unitary gate like H', 'always returns 0'], answer: 0, explain: 'P(0)=|α|², P(1)=|β|²; the state collapses.' },
    { type: 'selection', prompt: 'The CNOT gate is important because it can:', choices: ['create entanglement between qubits', 'only flip a classical LED', 'measure both qubits at once unitarily', 'remove all noise'], answer: 0, explain: 'CNOT is a standard entangling two-qubit gate.' },
    { type: 'calculation', prompt: 'If |α|² = 0.25, what is P(1) = |β|²?', answer: 0.75, tolerance: 0.01, unit: '', explain: '|α|²+|β|²=1 ⇒ P(1)=0.75.' },
    { type: 'blank', prompt: 'Pauli X is the quantum ____ gate (swaps |0⟩ and |1⟩).', answer: 'NOT', accept: ['NOT', 'not', 'X'], explain: 'X|0⟩=|1⟩, X|1⟩=|0⟩.' },
  ],
  nmr_mri: [
    { type: 'selection', prompt: 'After a 90° RF pulse, magnetisation lies mainly in the:', choices: ['transverse plane (M⊥)', 'longitudinal direction only', 'zero field direction', 'RF coil axis only'], answer: 0, explain: '90° tips M from +z into the xy plane — FID is detected.' },
    { type: 'blank', prompt: 'Transverse magnetisation decays with time constant ____.', answer: 'T2', accept: ['T2', 'T₂', 't2'], explain: 'FID envelope ∝ exp(−t/T2).' },
    { type: 'calculation', prompt: 'Proton γ ≈ 42.58 MHz/T. At B₀ = 1.5 T, Larmor frequency in MHz is approximately?', answer: 63.87, tolerance: 0.5, unit: 'MHz', explain: 'f = γB₀ ≈ 42.58 × 1.5 ≈ 64 MHz.' },
  ],
  esr_epr: [
    { type: 'selection', prompt: 'EPR resonance condition (isotropic) is:', choices: ['hν = gμ_BB', 'hf = φ', 'E = mc²', 'λ = h/p only'], answer: 0, explain: 'Microwave quantum matches Zeeman splitting.' },
    { type: 'blank', prompt: 'Hyperfine coupling splits EPR lines by spacing A in units of ____.', answer: 'mT', accept: ['mT', 'millitesla', 'gauss'], explain: 'Teaching model uses mT for field splitting.' },
    { type: 'calculation', prompt: 'One equivalent I=½ nucleus gives how many hyperfine lines?', answer: 2, tolerance: 0, unit: '', explain: '2^n lines with n equivalent I=½ nuclei; n=1 ⇒ 2 lines.' },
  ],
  fourier_waves: [
    { type: 'selection', prompt: 'Truncating a Fourier series at a jump causes overshoot called:', choices: ['Gibbs phenomenon', 'Rayleigh scattering', 'Compton shift', 'Stark effect'], answer: 0, explain: 'Ringing near discontinuities persists as N→∞.' },
    { type: 'blank', prompt: 'A square wave contains only ____ harmonics (odd/even).', answer: 'odd', accept: ['odd', 'odd only'], explain: 'Square wave symmetry ⇒ sine terms with n=1,3,5…' },
    { type: 'calculation', prompt: 'If fundamental frequency is f, the 3rd harmonic frequency is?', answer: 3, tolerance: 0.01, unit: '×f', explain: 'Third harmonic = 3f.' },
  ],
  wave_equation_2d: [
    { type: 'selection', prompt: 'The 2D wave equation is:', choices: ['∂²u/∂t²=c²∇²u', '∂u/∂t=D∇²u', '∇·E=ρ/ε₀', 'F=ma'], answer: 0, explain: 'Hyperbolic PDE for waves.' },
    { type: 'blank', prompt: 'Two sources create an ____ pattern when superposed.', answer: 'interference', accept: ['interference', 'interference pattern'], explain: 'Superposition of waves from two sources.' },
    { type: 'calculation', prompt: 'If wavelength halves, frequency doubles (fixed c). Speed c unchanged — frequency ratio f₂/f₁ when λ₂=λ₁/2?', answer: 2, tolerance: 0.01, unit: '×', explain: 'c=λf ⇒ f∝1/λ.' },
  ],
  quantum_ho: [
    { type: 'selection', prompt: 'HO energy spacing is:', choices: ['equally spaced ℏω', 'like 1/n²', 'continuous', 'zero always'], answer: 0, explain: 'Eₙ=(n+½)ℏω.' },
    { type: 'blank', prompt: 'Ground state HO energy is E₀ = ____ ℏω.', answer: '1/2', accept: ['1/2', '0.5', '½'], explain: 'Zero-point energy ½ℏω.' },
    { type: 'calculation', prompt: 'If E₀=0.5 and spacing is 1 (units ℏω), what is E₂?', answer: 2.5, tolerance: 0.01, unit: 'ℏω', explain: 'E₂=(2+½)=2.5.' },
  ],
  quantum_tunneling: [
    { type: 'selection', prompt: 'Tunneling transmission through a high wide barrier typically:', choices: ['decreases exponentially with width', 'always equals 1', 'increases with width', 'is independent of E'], answer: 0, explain: 'T∝e^{-2κa} for E<V₀.' },
    { type: 'blank', prompt: 'When E < V₀ inside a barrier, ψ ____ exponentially.', answer: 'decays', accept: ['decays', 'decreases', 'falls off'], explain: 'Evanescent wave in classically forbidden region.' },
    { type: 'calculation', prompt: 'If T drops by factor e⁻² when width doubles (teaching), T(a=2)/T(a=1) ≈?', answer: 0.135, tolerance: 0.02, unit: '', explain: 'e^{-2}≈0.135.' },
  ],
  heat_diffusion: [
    { type: 'selection', prompt: 'Heat equation type is:', choices: ['parabolic', 'hyperbolic', 'elliptic only', 'algebraic'], answer: 0, explain: '∂u/∂t=D∇²u is parabolic.' },
    { type: 'blank', prompt: 'Higher spatial Fourier modes decay ____ (faster/slower).', answer: 'faster', accept: ['faster', 'more quickly'], explain: 'Decay rate ∝ k².' },
    { type: 'calculation', prompt: 'If D doubles, diffusion spreads ____ as fast (same geometry).', answer: 2, tolerance: 0.1, unit: '×', explain: 'Spreading scales ~√(Dt) ⇒ 2× D gives √2 times faster spread in rms sense; teaching: linear D in rate.' },
  ],
  eigenvalue_lab: [
    { type: 'selection', prompt: 'For Av=λv, v is an:', choices: ['eigenvector', 'eigenvalue', 'determinant', 'trace only'], answer: 0, explain: 'v is eigenvector, λ is eigenvalue.' },
    { type: 'blank', prompt: 'String fixed at both ends: mode n has wavelength λₙ = ____ L.', answer: '2/n', accept: ['2L/n', '2/n L', '2L/n'], explain: 'λₙ=2L/n.' },
    { type: 'calculation', prompt: '2×2 matrix [[2,0],[0,3]] has eigenvalues?', answer: 2, tolerance: 0, unit: 'and 3', explain: 'Diagonal ⇒ 2 and 3.' },
  ],
  schrodinger_calculator: [
    { type: 'selection', prompt: 'Infinite square well energies scale as:', choices: ['n²', 'n', '1/n', 'n³'], answer: 0, explain: 'Eₙ∝n².' },
    { type: 'blank', prompt: 'FDM replaces d²/dx² by a ____ difference stencil.', answer: 'finite', accept: ['finite', 'second-order finite', 'discrete'], explain: 'Discrete Laplacian on grid.' },
    { type: 'calculation', prompt: 'If E₁=1 and E₂=4 (units), ratio E₂/E₁?', answer: 4, tolerance: 0.01, unit: '×', explain: '4/1=4.' },
  ],
  fourier_transform: [
    { type: 'selection', prompt: 'A narrow time pulse typically has:', choices: ['broad frequency spectrum', 'single frequency only', 'zero bandwidth', 'no transform'], answer: 0, explain: 'Δt·Δω uncertainty.' },
    { type: 'blank', prompt: 'F(ω)=∫ f(t) e^{-____ t} dt (sign convention).', answer: 'iω', accept: ['iω', 'i omega', 'iwt'], explain: 'Standard physics convention e^{-iωt}.' },
    { type: 'calculation', prompt: 'If σ doubles in Gaussian, bandwidth halves (roughly). σ→2σ gives width in ω about what factor?', answer: 0.5, tolerance: 0.1, unit: '×', explain: 'Fourier width ∝ 1/σ.' },
  ],
  variational_method: [
    { type: 'selection', prompt: 'Variational estimate of ground energy is always:', choices: ['≥ true E₀', '≤ true E₀', 'exact', 'zero'], answer: 0, explain: 'Rayleigh–Ritz upper bound.' },
    { type: 'blank', prompt: 'Minimise ⟨ψ|____|ψ⟩ over trial parameters.', answer: 'H', accept: ['H', 'Hamiltonian'], explain: 'Expectation of Hamiltonian.' },
    { type: 'calculation', prompt: 'For trial exp(-αx²) on HO, optimal α=0.5 gives ⟨H⟩=0.25 in units where exact E₀=0.5 — ratio estimate/exact?', answer: 0.5, tolerance: 0.02, unit: '', explain: '0.25/0.5=0.5 (teaching model numbers).' },
  ],
  complex_phasor: [
    { type: 'selection', prompt: 'Adding two same-frequency phasors is equivalent to:', choices: ['vector addition in complex plane', 'matrix multiplication only', 'differentiation', 'integration'], answer: 0, explain: 'Superposition = add complex amplitudes.' },
    { type: 'blank', prompt: 'Real part of e^{iωt} is ____.', answer: 'cos(ωt)', accept: ['cos(ωt)', 'cos ωt', 'cosine'], explain: 'Euler formula.' },
    { type: 'calculation', prompt: 'Two equal phasors 180° apart sum to amplitude?', answer: 0, tolerance: 0.01, unit: '', explain: 'Destructive interference ⇒ zero.' },
  ],
  spherical_harmonics: [
    { type: 'selection', prompt: 'Y_l^m are eigenfunctions of:', choices: ['angular momentum operators', 'only radial r', 'time translation only', 'mass matrix'], answer: 0, explain: 'L² and L_z on sphere.' },
    { type: 'blank', prompt: 'For given l, m ranges from −l to ____.', answer: 'l', accept: ['l', '+l'], explain: 'm=-l,…,l.' },
    { type: 'calculation', prompt: 'How many m values for l=2?', answer: 5, tolerance: 0, unit: '', explain: '2l+1=5.' },
  ],
  sturm_liouville: [
    { type: 'selection', prompt: 'Legendre polynomials are orthogonal on:', choices: ['[-1,1]', '[0,∞)', 'only integers', 'complex plane'], answer: 0, explain: 'Standard weight on [-1,1].' },
    { type: 'blank', prompt: 'Bessel functions J_n appear in ____ geometry problems.', answer: 'cylindrical', accept: ['cylindrical', 'circular', 'radial'], explain: 'Cylindrical symmetry.' },
    { type: 'calculation', prompt: 'P₀(x) is constant = 1. P₁(x)=x. At x=0, P₁ equals?', answer: 0, tolerance: 0, unit: '', explain: 'P₁(0)=0.' },
  ],
  pde_visual: [
    { type: 'selection', prompt: 'Gray–Scott is a ____ system.', choices: ['reaction–diffusion', 'only wave', 'only Laplace', 'algebraic'], answer: 0, explain: 'Coupled u,v with diffusion and reaction.' },
    { type: 'blank', prompt: 'Turing patterns arise from diffusion-driven ____ instability.', answer: 'spatial', accept: ['spatial', 'pattern'], explain: 'Uniform state becomes unstable to spatial modes.' },
    { type: 'calculation', prompt: 'If F parameter increases feed rate (teaching), pattern activity generally?', answer: 0, tolerance: 0, unit: '', explain: 'Selection: often more activity — teaching qualitative.' },
  ],
  numerical_methods: [
    { type: 'selection', prompt: 'Euler method on harmonic oscillator energy typically:', choices: ['drifts upward or downward', 'is exactly conserved', 'doubles every step', 'is undefined'], answer: 0, explain: 'Non-symplectic ⇒ energy drift.' },
    { type: 'blank', prompt: 'Leapfrog / Verlet is ____ (symplectic/non-symplectic).', answer: 'symplectic', accept: ['symplectic', 'symplectic-like'], explain: 'Better long-term energy behaviour.' },
    { type: 'calculation', prompt: 'If ω=1 and Δt=0.1, one Euler step on x=1,v=0 gives v≈?', answer: -0.1, tolerance: 0.02, unit: '', explain: 'v+=−ω²x·Δt = −0.1.' },
  ],
  atomic_nuclear_formulas: [
    { type: 'selection', prompt: 'Binding energy of a nucleus is most directly related to:', choices: ['mass defect × c²', 'only the proton charge', 'room temperature', 'Avogadro’s number alone'], answer: 0, explain: 'B = Δm c² from the mass defect relative to free nucleons.' },
    { type: 'blank', prompt: 'The radioactive decay law is N(t) = N₀ e^(−____ t).', answer: 'λ', accept: ['λ', 'lambda', 'Λ'], explain: 'λ is the decay constant; T½ = ln2/λ.' },
    { type: 'calculation', prompt: 'If T½ = 2.0 h, what is λ in h⁻¹? (ln2 ≈ 0.693)', answer: 0.3465, tolerance: 0.01, unit: 'h⁻¹', explain: 'λ = ln2 / T½ = 0.693/2 ≈ 0.3465 h⁻¹.' },
  ],
  periodic_table: [
    { type: 'selection', prompt: 'Uranium’s atomic number Z is:', choices: ['92', '238', '235', '90'], answer: 0, explain: 'Z = 92 protons. A = 238 or 235 labels isotopes.' },
    { type: 'blank', prompt: 'The most abundant natural uranium isotope is U-____.', answer: '238', accept: ['238', 'U-238', 'U238'], explain: '≈99.3% of natural U is ²³⁸U.' },
    { type: 'calculation', prompt: 'For ²³⁸U, neutron number N = A − Z. What is N?', answer: 146, tolerance: 0, unit: '', explain: 'N = 238 − 92 = 146.' },
  ],
  chart_of_nuclides: [
    { type: 'selection', prompt: 'On the chart of nuclides, the horizontal axis is usually:', choices: ['Neutron number N', 'Atomic mass in grams', 'Half-life in years', 'Binding energy only'], answer: 0, explain: 'N across, Z vertical — each cell is one (Z, N) nuclide.' },
    { type: 'blank', prompt: 'α decay of U-238 first produces Th-____.', answer: '234', accept: ['234', 'Th-234', 'Th234'], explain: 'α removes 2p+2n: A → A−4, Z → Z−2 → ²³⁴Th.' },
    { type: 'calculation', prompt: 'After U-238 → Th-234 (α), two β⁻ decays raise Z by 2 at fixed A. What is A of the resulting uranium isotope?', answer: 234, tolerance: 0, unit: '', explain: 'β⁻ keeps A; two β⁻: Th-234 → Pa-234 → U-234.' },
  ],
  nuclear_reaction: [
    { type: 'selection', prompt: 'A thermal neutron on ²³⁵U can induce:', choices: ['Fission (among other channels)', 'Only elastic scatter off electrons', 'Only pair production', 'Only β⁺ decay of the neutron'], answer: 0, explain: '²³⁵U is fissile — thermal n capture can lead to fission with ~200 MeV released.' },
    { type: 'blank', prompt: 'The Q-value is the energy from the ____ defect (converted with ≈931.5 MeV/u).', answer: 'mass', accept: ['mass', 'Mass', 'mass defect'], explain: 'Q = (m_reactants − m_products)c².' },
    { type: 'calculation', prompt: 'If Q = −1.88 MeV for ⁷Li(p,n)⁷Be, is E_lab = 1.0 MeV above threshold? Enter 0 for no, 1 for yes.', answer: 0, tolerance: 0, unit: '', explain: 'Need E ≳ threshold (~1.88 MeV); 1.0 MeV is below — channel closed.' },
  ],
  lab_canvas: [
    { type: 'selection', prompt: 'In the Lab Canvas, connecting a neutron source → U-235 target → detector is meant to demonstrate:', choices: ['Induced fission and detection of products/neutrons', 'Only chemical bonding', 'Only photoelectric effect', 'Only sound waves'], answer: 0, explain: 'Neutrons on fissile U-235 can induce fission; detectors count outgoing particles/energy.' },
    { type: 'blank', prompt: 'To reduce beam intensity before a detector, place ____ on the path.', answer: 'shielding', accept: ['shielding', 'shield', 'Shielding', 'a shield'], explain: 'Shielding attenuates radiation between source and detector.' },
    { type: 'calculation', prompt: 'If a source emits 40 particles/s and a shield transmits 30%, about how many reach the detector per second (ideal, no other losses)?', answer: 12, tolerance: 0.5, unit: '/s', explain: '40 × 0.30 = 12 /s.' },
  ],
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function learnHtml(id, mod) {
  const title = mod.title || mod.navTitle || id;
  const p = mod.principle || {};
  const eq = p.equation || '';
  const desc = p.desc || mod.desc || '';
  const observe = p.observe || '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} — Learn</title>
  <style>
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
    }
    .learn-doc { padding: 8px 6px 28px; max-width: 700px; }
    h1 {
      font-size: 1.4rem;
      margin: 0 0 10px;
      color: #0f172a;
      font-weight: 750;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    h2 {
      font-size: 0.95rem;
      margin: 22px 0 8px;
      color: #0369a1;
      font-weight: 700;
    }
    p { margin: 0 0 10px; color: #475569; }
    .formula {
      margin: 10px 0 14px;
      padding: 14px 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 1px solid #bae6fd;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: 0.98rem;
      color: #0c4a6e;
      white-space: pre-wrap;
    }
    .step {
      padding: 12px 14px;
      margin: 8px 0;
      border-left: 3px solid #38bdf8;
      background: #f8fafc;
      border-radius: 0 12px 12px 0;
      color: #334155;
    }
    .step strong { color: #0f172a; }
    ul { margin: 6px 0 10px 18px; color: #475569; }
    li { margin-bottom: 4px; }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0369a1;
      background: #e0f2fe;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <article class="learn-doc" data-module="${esc(id)}">
    <div class="tag">Experiment guide</div>
    <h1>${esc(title)}</h1>
    <p>${esc(mod.desc || '')}</p>

    <h2>1. Principle</h2>
    <div class="step"><strong>Idea.</strong> ${esc(desc)}</div>

    <h2>2. Key formulas</h2>
    <div class="formula">${esc(eq || '(See the live experiment panel.)')}</div>
    <ul>
      <li>Identify each symbol in the formula and its unit.</li>
      <li>Ask which quantity you control in the simulator, and which you measure.</li>
    </ul>

    <h2>3. What to observe</h2>
    <div class="step"><strong>In the sim.</strong> ${esc(observe || 'Use the sliders and watch how the visualization responds.')}</div>

    <h2>4. Step-by-step reasoning</h2>
    <div class="step"><strong>Step A.</strong> Start from the physical picture (particles, waves, fields, or levels) described above.</div>
    <div class="step"><strong>Step B.</strong> Write the governing relation: <span class="formula" style="display:inline;padding:4px 8px;margin:0">${esc(eq || '…')}</span></div>
    <div class="step"><strong>Step C.</strong> Change one control at a time in the experiment and predict the sign of the change before you look.</div>
    <div class="step"><strong>Step D.</strong> When an AI panel is present, collect data and compare the learned constant with the accepted value.</div>

    <h2>5. Check your understanding</h2>
    <p>Open <strong>Exercises</strong> in the top bar for selection, fill-in, and calculation problems on this topic.</p>
  </article>
</body>
</html>
`;
}

function defaultExercises(id, mod) {
  const title = mod.title || id;
  const eq = (mod.principle && mod.principle.equation) || '';
  const firstToken = (eq.match(/[A-Za-zλθφψΔ][A-Za-z₀-₉ₙₗₘ]*/ ) || ['λ'])[0];
  return [
    {
      type: 'selection',
      prompt: 'What is the main goal of the “‘ + title + ’” experiment in this course?',
      choices: [
        mod.desc || 'Illustrate the principle with interactive controls',
        'Measure only room temperature',
        'Disable quantum mechanics',
        'Prove classical physics is always exact',
      ],
      answer: 0,
      explain: mod.principle && mod.principle.desc ? mod.principle.desc.slice(0, 220) : 'See the Learn guide.',
    },
    {
      type: 'blank',
      prompt: 'A central symbol/quantity in this topic’s formula is ____ (from: ' + eq.slice(0, 80) + ').',
      answer: firstToken,
      accept: [firstToken, firstToken.toLowerCase()],
      explain: 'Formula: ' + eq,
    },
    {
      type: 'calculation',
      prompt: 'Conceptual check: if a linear quantity doubles and the result is proportional to it, the result becomes what factor of the original?',
      answer: 2,
      tolerance: 0.01,
      unit: '×',
      explain: 'Direct proportion → factor 2.',
    },
  ];
}

fs.mkdirSync(LEARN_DIR, { recursive: true });
fs.mkdirSync(EX_DIR, { recursive: true });

let nLearn = 0;
let nEx = 0;
for (let i = 0; i < MODULE_IDS.length; i++) {
  const id = MODULE_IDS[i];
  const mod = (LANG.modules && LANG.modules[id]) || { title: id, desc: '', principle: {} };
  fs.writeFileSync(path.join(LEARN_DIR, id + '.html'), learnHtml(id, mod), 'utf8');
  nLearn++;

  const problems = EXERCISES[id] || defaultExercises(id, mod);
  const payload = {
    moduleId: id,
    title: (mod.title || id) + ' — Exercises',
    problems: problems.map(function (p, idx) {
      return Object.assign({ id: 'q' + (idx + 1) }, p);
    }),
  };
  fs.writeFileSync(path.join(EX_DIR, id + '.json'), JSON.stringify(payload, null, 2), 'utf8');
  nEx++;
}

console.log('Wrote', nLearn, 'learn/*.html and', nEx, 'exercises/*.json');
