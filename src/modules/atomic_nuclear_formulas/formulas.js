/**
 * Atomic & nuclear physics — principles, theories, and formulas (LaTeX via KaTeX).
 * Each entry: { id, title, principle, equations: string[], note? }
 */
export const FORMULA_SECTIONS = [
  {
    id: 'theories',
    title: 'Basic principles & theories',
    entries: [
      {
        id: 'conservation',
        title: 'Conservation laws',
        principle: 'In every isolated process, energy, momentum, angular momentum, and electric charge are conserved. Nuclear reactions also conserve baryon number (to excellent accuracy) and lepton number in the Standard Model.',
        equations: [
          '\\sum E_{\\mathrm{in}} = \\sum E_{\\mathrm{out}}',
          '\\sum \\mathbf{p}_{\\mathrm{in}} = \\sum \\mathbf{p}_{\\mathrm{out}}',
          '\\sum q_{\\mathrm{in}} = \\sum q_{\\mathrm{out}}',
        ],
        note: 'Q-values in nuclear physics are just energy conservation written with rest masses: Q = (Σm_in − Σm_out)c².',
      },
      {
        id: 'atom_models',
        title: 'Evolution of the atomic model',
        principle: 'Thomson’s “plum pudding” was replaced by Rutherford’s nuclear atom (tiny +Z core). Bohr added quantized orbits for hydrogen spectra. Quantum mechanics replaces orbits with stationary states and orbitals.',
        equations: [
          '\\text{Thomson} \\rightarrow \\text{Rutherford} \\rightarrow \\text{Bohr} \\rightarrow \\text{QM orbitals}',
        ],
        note: 'Rutherford explained large-angle α scattering; Bohr explained discrete line spectra; full QM explains multi-electron atoms and chemistry.',
      },
      {
        id: 'wave_particle',
        title: 'Wave–particle duality',
        principle: 'Light and matter both show wave and particle aspects. Photons have E = hf; electrons have de Broglie wavelength λ = h/p. Which aspect you see depends on the experiment.',
        equations: [
          'E = hf,\\quad p = \\frac{h}{\\lambda}',
          '\\lambda_{\\mathrm{matter}} = \\frac{h}{p}',
        ],
      },
      {
        id: 'quantum_postulates',
        title: 'Core quantum postulates',
        principle: 'A system is described by a wavefunction ψ. Measurable quantities are eigenvalues of operators. Measurement yields probabilities from |ψ|². Time evolution follows the Schrödinger equation.',
        equations: [
          '\\hat{A}\\psi = a\\psi',
          'P = |\\psi|^{2}',
          'i\\hbar\\partial_t\\psi = \\hat{H}\\psi',
        ],
      },
      {
        id: 'uncertainty_principle',
        title: 'Uncertainty principle',
        principle: 'Complementary observables cannot be sharp together. This is not measurement clumsiness — it is built into the wave nature of quantum states.',
        equations: [
          '\\Delta x\\,\\Delta p \\ge \\frac{\\hbar}{2}',
          '\\Delta E\\,\\Delta t \\ge \\frac{\\hbar}{2}',
        ],
      },
      {
        id: 'pauli',
        title: 'Pauli exclusion principle',
        principle: 'No two identical fermions (electrons, protons, neutrons) may occupy the same quantum state. This fills atomic shells and shapes nuclear shell structure.',
        equations: [
          '\\text{fermions: }\\; \\psi(1,2) = -\\psi(2,1)',
          '\\text{electrons: }\\; (n,\\ell,m_\\ell,m_s)\\ \\text{unique}',
        ],
      },
      {
        id: 'correspondence',
        title: 'Correspondence principle',
        principle: 'Quantum predictions must approach classical physics for large quantum numbers (or macroscopic actions ≫ ℏ). Bohr used this to connect his atom to Maxwell radiation.',
        equations: [
          'n \\to \\infty \\quad\\Rightarrow\\quad \\text{quantum} \\to \\text{classical}',
        ],
      },
      {
        id: 'mass_energy',
        title: 'Mass–energy equivalence',
        principle: 'Rest mass is a form of energy. Nuclear binding and Q-values are mass differences converted via E = mc². This is why MeV/c² is a mass unit in nuclear physics.',
        equations: [
          'E_0 = mc^{2}',
          'E^{2} = (pc)^{2} + (mc^{2})^{2}',
        ],
      },
      {
        id: 'nuclear_force',
        title: 'Strong force & nuclear stability',
        principle: 'The strong interaction binds nucleons at ~1 fm; it saturates (short range). Coulomb repulsion grows with Z², so heavy nuclei need extra neutrons and eventually become unstable.',
        equations: [
          'R \\approx R_0 A^{1/3}',
          '\\text{stable: balance of strong vs Coulomb + weak decay}',
        ],
      },
      {
        id: 'quantization_radiation',
        title: 'Quantization of radiation (Planck / Einstein)',
        principle: 'Blackbody radiation and the photoelectric effect forced the idea that EM energy is exchanged in quanta. Einstein’s photons made E = hf a particle property of light.',
        equations: [
          'E = hf = \\hbar\\omega',
          'hf = \\Phi + K_{\\max}',
        ],
      },
      {
        id: 'standard_interaction',
        title: 'Four interactions (nuclear context)',
        principle: 'Gravity is negligible in atoms/nuclei. Electromagnetic binds atoms and causes Coulomb barriers. Strong binds nuclei. Weak drives β decay and neutrino emission.',
        equations: [
          '\\text{EM: }\\; \\alpha \\approx \\tfrac{1}{137}',
          '\\text{weak: }\\; n\\to p+e^{-}+\\bar\\nu_e',
        ],
      },
      {
        id: 'chain_criticality',
        title: 'Chain reaction & criticality',
        principle: 'If each fission yields enough neutrons that on average one causes another fission, the reactor is critical (k_eff = 1). Control rods and moderators tune this balance.',
        equations: [
          'k_{\\mathrm{eff}} = 1 \\;\\text{(critical)}',
          'k_{\\mathrm{eff}} > 1 \\;\\text{(supercritical)},\\quad k_{\\mathrm{eff}} < 1 \\;\\text{(subcritical)}',
        ],
      },
    ],
  },
  {
    id: 'constants',
    title: 'Fundamental constants',
    entries: [
      {
        id: 'c_h_e',
        title: 'Speed of light, Planck, elementary charge',
        principle: 'These constants set the scales of relativity, quantum mechanics, and electromagnetism in atomic and nuclear physics.',
        equations: [
          'c = 2.998\\times 10^{8}\\,\\mathrm{m\\,s^{-1}}',
          'h = 6.626\\times 10^{-34}\\,\\mathrm{J\\,s},\\quad \\hbar = \\frac{h}{2\\pi}',
          'e = 1.602\\times 10^{-19}\\,\\mathrm{C}',
        ],
      },
      {
        id: 'rest_mass',
        title: 'Rest energies (useful conversions)',
        principle: 'Nuclear energies are often quoted in MeV. Electron and nucleon rest energies are standard references.',
        equations: [
          'm_e c^{2} = 511\\,\\mathrm{keV}',
          'm_p c^{2} \\approx 938.3\\,\\mathrm{MeV},\\quad m_n c^{2} \\approx 939.6\\,\\mathrm{MeV}',
          '1\\,\\mathrm{u}\\,c^{2} = 931.494\\,\\mathrm{MeV}',
        ],
      },
    ],
  },
  {
    id: 'atomic',
    title: 'Atomic structure',
    entries: [
      {
        id: 'rutherford',
        title: 'Rutherford scattering (Coulomb)',
        principle: 'A pointlike nucleus deflects α particles. The differential cross section falls steeply with scattering angle.',
        equations: [
          '\\frac{d\\sigma}{d\\Omega} = \\left(\\frac{1}{4\\pi\\varepsilon_0}\\frac{Z_1 Z_2 e^{2}}{4E}\\right)^{2}\\frac{1}{\\sin^{4}(\\theta/2)}',
        ],
        note: 'E = kinetic energy in the CM (or lab for heavy target). Large-angle events are rare but prove a compact nucleus.',
      },
      {
        id: 'thomson_em',
        title: 'Thomson e/m (CRT)',
        principle: 'Balanced electric and magnetic forces on a cathode-ray beam give the electron speed; combined with deflection yields e/m.',
        equations: [
          'v = \\frac{E}{B}\\quad(\\text{force balance } eE = evB)',
          '\\frac{e}{m} = \\frac{E}{B^{2} R}\\quad(\\text{with magnetic radius } R)',
        ],
      },
      {
        id: 'millikan',
        title: 'Millikan oil drop',
        principle: 'At balance the electric force on a charged drop equals its weight, so charge is quantized in units of e.',
        equations: [
          'qE = mg \\quad\\Rightarrow\\quad q = \\frac{mg}{E}',
          'q = ne,\\quad n = 1,2,3,\\ldots',
        ],
      },
    ],
  },
  {
    id: 'quantum_light',
    title: 'Light quanta & spectra',
    entries: [
      {
        id: 'planck',
        title: 'Planck’s relation',
        principle: 'Electromagnetic energy is exchanged in quanta. Frequency and energy are proportional.',
        equations: [
          'E = hf = \\hbar\\omega',
          '\\lambda f = c',
        ],
      },
      {
        id: 'photoelectric',
        title: 'Photoelectric effect',
        principle: 'A photon gives all its energy to one electron. Electrons leave only if hf exceeds the work function.',
        equations: [
          'hf = \\Phi + K_{\\max}',
          'K_{\\max} = eV_{s}\\quad(V_{s}=\\text{stopping potential})',
        ],
      },
      {
        id: 'compton',
        title: 'Compton scattering',
        principle: 'X-ray / γ photons scatter from electrons with a wavelength shift that depends on angle — particle-like collision kinematics.',
        equations: [
          '\\Delta\\lambda = \\lambda\' - \\lambda = \\frac{h}{m_e c}(1 - \\cos\\theta)',
          '\\lambda_{C} = \\frac{h}{m_e c} = 2.426\\times 10^{-12}\\,\\mathrm{m}',
        ],
      },
      {
        id: 'bohr',
        title: 'Bohr hydrogen energies',
        principle: 'Stationary orbits with quantized angular momentum give discrete levels and the Rydberg formula for spectral lines.',
        equations: [
          'E_n = -\\frac{13.6\\,\\mathrm{eV}}{n^{2}},\\quad n=1,2,3,\\ldots',
          '\\frac{1}{\\lambda} = R_{\\infty}\\left(\\frac{1}{n_{1}^{2}}-\\frac{1}{n_{2}^{2}}\\right)',
          'L = n\\hbar\\quad(\\text{Bohr postulate})',
        ],
      },
    ],
  },
  {
    id: 'waves_qm',
    title: 'Matter waves & quantum mechanics',
    entries: [
      {
        id: 'debroglie',
        title: 'de Broglie relation',
        principle: 'Every free particle has an associated wavelength set by its momentum.',
        equations: [
          '\\lambda = \\frac{h}{p} = \\frac{h}{mv}\\quad(\\text{non-relativistic})',
          'p = \\hbar k,\\quad E = \\hbar\\omega',
        ],
      },
      {
        id: 'uncertainty',
        title: 'Heisenberg uncertainty',
        principle: 'Position and momentum (and energy and time) cannot both be arbitrarily sharp.',
        equations: [
          '\\Delta x\\,\\Delta p \\ge \\frac{\\hbar}{2}',
          '\\Delta E\\,\\Delta t \\ge \\frac{\\hbar}{2}',
        ],
      },
      {
        id: 'schrodinger',
        title: 'Time-dependent Schrödinger equation',
        principle: 'The wavefunction ψ evolves unitarily under the Hamiltonian. |ψ|² is the probability density.',
        equations: [
          'i\\hbar\\frac{\\partial\\psi}{\\partial t} = \\hat{H}\\psi',
          '\\hat{H} = -\\frac{\\hbar^{2}}{2m}\\nabla^{2} + V(\\mathbf{r},t)',
          '\\int |\\psi|^{2}\\,dV = 1',
        ],
      },
      {
        id: 'infinite_well',
        title: 'Infinite square well (1D)',
        principle: 'A particle confined to 0 < x < L has sine eigenfunctions and quadratic energy levels.',
        equations: [
          '\\psi_n(x) = \\sqrt{\\frac{2}{L}}\\sin\\!\\left(\\frac{n\\pi x}{L}\\right)',
          'E_n = \\frac{n^{2}\\pi^{2}\\hbar^{2}}{2mL^{2}},\\quad n=1,2,3,\\ldots',
        ],
      },
      {
        id: 'qho',
        title: 'Quantum harmonic oscillator',
        principle: 'Equally spaced levels; ground state has zero-point energy ½ℏω.',
        equations: [
          'E_n = \\left(n+\\tfrac{1}{2}\\right)\\hbar\\omega,\\quad n=0,1,2,\\ldots',
          'V(x) = \\tfrac{1}{2}m\\omega^{2}x^{2}',
        ],
      },
      {
        id: 'tunnel',
        title: 'Tunneling (rectangular barrier, sketch)',
        principle: 'For E < V₀ a particle still has nonzero transmission that falls exponentially with barrier width and κ.',
        equations: [
          '\\kappa = \\frac{\\sqrt{2m(V_0-E)}}{\\hbar}',
          'T \\sim e^{-2\\kappa a}\\quad(\\text{thick barrier estimate})',
        ],
      },
    ],
  },
  {
    id: 'nuclear_basics',
    title: 'Nuclear structure',
    entries: [
      {
        id: 'notation',
        title: 'Nuclide notation',
        principle: 'A nucleus is specified by proton number Z and mass number A. Neutron number is N = A − Z.',
        equations: [
          '{}^{A}_{Z}X_{N},\\quad N = A - Z',
        ],
        note: 'X is the chemical symbol. Isotopes share Z; isotones share N; isobars share A.',
      },
      {
        id: 'radius',
        title: 'Nuclear radius',
        principle: 'Nuclei are roughly constant-density spheres; radius grows as A¹ᐟ³.',
        equations: [
          'R \\approx R_0 A^{1/3},\\quad R_0 \\approx 1.2\\,\\mathrm{fm}',
        ],
      },
      {
        id: 'binding',
        title: 'Mass defect & binding energy',
        principle: 'The nucleus weighs less than its free nucleons. The missing mass is the binding energy.',
        equations: [
          '\\Delta m = Z m_H + (A-Z)m_n - M({}^{A}X)',
          'B = \\Delta m\\,c^{2}',
          '\\frac{B}{A}\\quad(\\text{binding per nucleon; peak near Fe/Ni})',
        ],
      },
      {
        id: 'semf',
        title: 'Semi-empirical mass formula (sketch)',
        principle: 'Liquid-drop terms approximate binding: volume, surface, Coulomb, asymmetry, pairing.',
        equations: [
          'B \\approx a_v A - a_s A^{2/3} - a_c\\frac{Z(Z-1)}{A^{1/3}} - a_a\\frac{(A-2Z)^{2}}{A} \\pm a_p A^{-1/2}',
        ],
      },
    ],
  },
  {
    id: 'decay',
    title: 'Radioactive decay',
    entries: [
      {
        id: 'law',
        title: 'Exponential decay law',
        principle: 'Each nucleus has a constant decay probability per time. Activity is proportional to the number remaining.',
        equations: [
          'N(t) = N_0 e^{-\\lambda t}',
          'A(t) = \\lambda N(t) = A_0 e^{-\\lambda t}',
          'T_{1/2} = \\frac{\\ln 2}{\\lambda},\\quad \\tau = \\frac{1}{\\lambda}',
        ],
      },
      {
        id: 'alpha',
        title: 'α decay',
        principle: 'Emission of a ⁴He nucleus. Daughter Z and A drop by 2 and 4. Q-value sets the α kinetic energy (two-body).',
        equations: [
          '{}^{A}_{Z}X \\to {}^{A-4}_{Z-2}Y + {}^{4}_{2}\\mathrm{He}',
          'Q_{\\alpha} = \\bigl[M_X - M_Y - M_{\\alpha}\\bigr]c^{2}',
        ],
      },
      {
        id: 'beta',
        title: 'β⁻ and β⁺ decay',
        principle: 'Weak interaction changes a nucleon. Continuous electron (or positron) spectrum shares energy with a neutrino.',
        equations: [
          'n \\to p + e^{-} + \\bar{\\nu}_e \\quad(\\beta^{-})',
          'p \\to n + e^{+} + \\nu_e \\quad(\\beta^{+},\\text{ in nuclei})',
          '{}^{A}_{Z}X \\xrightarrow{\\beta^{-}} {}^{A}_{Z+1}Y',
        ],
      },
      {
        id: 'gamma',
        title: 'γ decay',
        principle: 'An excited nucleus drops to a lower level by emitting a photon. A and Z unchanged.',
        equations: [
          '{}^{A}X^{*} \\to {}^{A}X + \\gamma',
          'E_{\\gamma} \\approx E_i - E_f',
        ],
      },
      {
        id: 'chain',
        title: 'Parent–daughter (secular equilibrium sketch)',
        principle: 'In a chain, if the parent is much longer-lived, daughter activity can approach the parent activity.',
        equations: [
          '\\frac{dN_2}{dt} = \\lambda_1 N_1 - \\lambda_2 N_2',
          'A_2 \\approx A_1 \\quad(\\lambda_2 \\gg \\lambda_1,\\; t\\gg 1/\\lambda_2)',
        ],
      },
    ],
  },
  {
    id: 'fission_fusion',
    title: 'Fission & fusion',
    entries: [
      {
        id: 'fission',
        title: 'Nuclear fission (energy release)',
        principle: 'Heavy nuclei near U/Pu split into fragments with higher B/A, releasing ~200 MeV per fission mostly as fragment KE.',
        equations: [
          '{}^{235}\\mathrm{U} + n \\to \\text{fragments} + \\nu n + \\gamma',
          'Q \\approx \\bigl[M_{\\mathrm{parent}}+m_n - \\sum M_{\\mathrm{frag}} - \\nu m_n\\bigr]c^{2}',
        ],
        note: 'Typical ν ≈ 2–3 prompt neutrons enable a chain reaction if k_eff ≥ 1.',
      },
      {
        id: 'keff',
        title: 'Reactor multiplication factor',
        principle: 'k_eff is the average neutrons in one generation that cause fission in the next. Critical when k_eff = 1.',
        equations: [
          'k_{\\mathrm{eff}} = \\frac{\\text{neutrons in generation }n+1}{\\text{neutrons in generation }n}',
          'k_{\\mathrm{eff}}=1\\;\\text{critical},\\quad <1\\;\\text{subcritical},\\quad >1\\;\\text{supercritical}',
        ],
      },
      {
        id: 'fusion',
        title: 'Nuclear fusion',
        principle: 'Light nuclei fuse to heavier ones with higher B/A (up toward Fe). Coulomb barrier requires high temperature / tunneling.',
        equations: [
          '{}^{2}\\mathrm{H}+{}^{3}\\mathrm{H} \\to {}^{4}\\mathrm{He}+n+17.6\\,\\mathrm{MeV}',
          'Q = \\bigl[\\sum M_{\\mathrm{in}} - \\sum M_{\\mathrm{out}}\\bigr]c^{2}',
        ],
      },
    ],
  },
  {
    id: 'radiation',
    title: 'Radiation & applications',
    entries: [
      {
        id: 'activity_dose',
        title: 'Activity units (definitions)',
        principle: 'Activity counts decays per second. Dose measures energy deposited in matter (simplified teaching note).',
        equations: [
          '1\\,\\mathrm{Bq} = 1\\,\\mathrm{s^{-1}},\\quad 1\\,\\mathrm{Ci} = 3.7\\times 10^{10}\\,\\mathrm{Bq}',
          'D = \\frac{dE}{dm}\\quad(\\mathrm{Gy}=\\mathrm{J\\,kg^{-1}})',
        ],
      },
      {
        id: 'pet',
        title: 'PET annihilation',
        principle: 'A β⁺ emitter’s positron annihilates with an electron into two 511 keV photons, used for coincidence imaging.',
        equations: [
          'e^{+} + e^{-} \\to \\gamma + \\gamma',
          'E_{\\gamma} = m_e c^{2} = 511\\,\\mathrm{keV}',
        ],
      },
      {
        id: 'moderator',
        title: 'Neutron moderation (elastic estimate)',
        principle: 'Light nuclei (H, C) slow fast fission neutrons via elastic collisions toward thermal energies.',
        equations: [
          '\\xi \\approx \\Bigl\\langle \\ln\\frac{E_{\\mathrm{before}}}{E_{\\mathrm{after}}}\\Bigr\\rangle',
          'A\\to 1 \\Rightarrow \\text{more energy loss per collision}',
        ],
      },
    ],
  },
];

export function allEntries() {
  const out = [];
  for (let s = 0; s < FORMULA_SECTIONS.length; s++) {
    const sec = FORMULA_SECTIONS[s];
    for (let i = 0; i < sec.entries.length; i++) {
      out.push(Object.assign({ sectionId: sec.id, sectionTitle: sec.title }, sec.entries[i]));
    }
  }
  return out;
}
