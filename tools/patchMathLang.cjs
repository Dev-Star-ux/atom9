// One-off: patch lang/en.json with nav groups + math module strings.
const fs = require('fs');
const path = require('path');
const langPath = path.join(__dirname, '..', 'lang', 'en.json');
const lang = JSON.parse(fs.readFileSync(langPath, 'utf8'));

lang.nav.groups = {
  intro: 'Classical & early experiments',
  thermal: 'Thermal radiation & spectra',
  waves: 'Waves & matter waves',
  quantum: 'Quantum mechanics',
  mathPhysics: 'Mathematical physics',
  xray: 'X-rays & Compton',
  nuclear: 'Nuclear physics',
  applications: 'Applications & technology',
};

const mathMods = {
  fourier_waves: {
    navTitle: 'Fourier Synthesis', title: 'Fourier Wave Synthesis',
    desc: 'Build complex waves from harmonics — square, saw, triangle; Gibbs ringing.',
    hint: 'Preset · harmonics N · watch sum vs target',
    principle: { desc: 'Any periodic function can be expanded in sin/cos harmonics. Truncating the series causes overshoot near jumps (Gibbs phenomenon).', equation: 'f(t)=Σ aₙ sin(nωt)+bₙ cos(nωt)', observe: 'Top: target (dashed) vs partial sum. Bottom: harmonic amplitudes.' },
  },
  wave_equation_2d: {
    navTitle: '2D Wave Equation', title: '2D Wave Equation / Ripple Tank',
    desc: 'FDTD simulation of ∂²u/∂t²=c²∇²u — sources, barriers, slits.',
    hint: 'Open or slit · amplitude · frequency',
    principle: { desc: 'The wave equation governs ripples, sound, and EM waves. Finite-difference time domain (FDTD) updates each cell from neighbours (Laplacian).', equation: '∂²u/∂t² = c²∇²u', observe: 'Bright regions = crests. Slit → diffraction pattern.' },
  },
  quantum_ho: {
    navTitle: 'Harmonic Oscillator', title: 'Quantum Harmonic Oscillator',
    desc: 'ψₙ(x) and |ψ|² for n=0…6; Eₙ=(n+½)ℏω.',
    hint: 'Level n · toggle |ψ|²',
    principle: { desc: 'The HO is exactly solvable. Wavefunctions are Hermite polynomials × Gaussian. Energies are equally spaced.', equation: 'Eₙ=(n+½)ℏω   ·   ψₙ ∝ Hₙ(x)e^{-x²/2}', observe: 'Cyan: ψ(x). Fill: probability density.' },
  },
  quantum_tunneling: {
    navTitle: 'Quantum Tunneling', title: 'Barrier Tunneling',
    desc: 'Rectangular barrier — ψ(x) and transmission T(E).',
    hint: 'Energy E · barrier height V₀ · width',
    principle: { desc: 'Classically forbidden regions allow small but nonzero ψ inside barriers. Transmission drops exponentially with barrier width.', equation: 'T(E) ≈ e^{-2κa}   for E<V₀', observe: 'Left: ψ oscillates in wells, decays in barrier. Right: T(E) curve.' },
  },
  heat_diffusion: {
    navTitle: 'Heat / Diffusion', title: 'Heat & Diffusion Equation',
    desc: '∂u/∂t=D∇²u — hot pulse spreading in 1D or 2D.',
    hint: 'Diffusion D · 1D/2D · reset',
    principle: { desc: 'Diffusion smooths sharp temperature gradients. Fourier modes decay exponentially — high k modes die fastest.', equation: '∂u/∂t = D∇²u', observe: 'Heatmap or curve flattens over time.' },
  },
  eigenvalue_lab: {
    navTitle: 'Eigenvalue Lab', title: 'Eigenvalues & Eigenmodes',
    desc: '2×2 matrix eigenvectors + string modes sin(nπx/L).',
    hint: 'Matrix entries · mode n · length L',
    principle: { desc: 'Av=λv defines special directions unchanged by A. Sturm–Liouville problems yield orthogonal eigenmodes on strings.', equation: 'det(A−λI)=0   ·   sin(nπx/L)', observe: 'Left: eigenvectors from matrix. Right: standing wave mode.' },
  },
  schrodinger_calculator: {
    navTitle: 'Schrödinger Calculator', title: '1D Schrödinger Calculator',
    desc: 'Finite-difference eigenvalues in a square well — compare to exact Eₙ.',
    hint: 'Well width · level n',
    principle: { desc: 'Discretise −ℏ²/2m d²/dx² on a grid inside V=0 well. Diagonalising gives approximate quantized energies.', equation: '−ℏ²/2m · d²ψ/dx² = Eψ', observe: 'Ladder: computed Eₙ. Plot: ψ and |ψ|².' },
  },
  fourier_transform: {
    navTitle: 'Fourier Transform', title: 'Fourier Transform Explorer',
    desc: 'Gaussian and pulse f(t) with |F(ω)| — width controls bandwidth.',
    hint: 'Shape · width σ or w',
    principle: { desc: 'The Fourier transform maps time ↔ frequency. Narrow pulses have broad spectra (uncertainty principle).', equation: 'F(ω)=∫ f(t)e^{-iωt} dt', observe: 'Left: f(t). Right: |F(ω)|.' },
  },
  variational_method: {
    navTitle: 'Variational Method', title: 'Variational Method (Rayleigh–Ritz)',
    desc: 'Trial ψ(α)=e^{-αx²} for HO ground state — minimise ⟨H⟩.',
    hint: 'Slide α · find minimum ⟨H⟩',
    principle: { desc: 'Any trial wavefunction gives an upper bound on ground-state energy. Minimising ⟨ψ|H|ψ⟩ improves the estimate.', equation: 'E₀ ≤ ⟨H⟩[ψ(α)]', observe: 'Green curve: ⟨H⟩ vs α. Minimum ≈ true E₀.' },
  },
  complex_phasor: {
    navTitle: 'Complex Phasors', title: 'Complex Phasors & Superposition',
    desc: 'Add rotating phasors e^{iφ}; see resultant wave.',
    hint: 'Phases φ₁, φ₂ · animation',
    principle: { desc: 'AC and wave optics use e^{iωt} phasors. Superposition is vector addition in the complex plane.', equation: 'z = A e^{i(ωt+φ)}', observe: 'Circles: individual phasors. Wave: Re[z₁+z₂].' },
  },
  spherical_harmonics: {
    navTitle: 'Spherical Harmonics', title: 'Spherical Harmonics Yₗᵐ',
    desc: '2D map of |Yₗᵐ(θ,φ)|² — quantum angular momentum shapes.',
    hint: 'l and m sliders (l≤4)',
    principle: { desc: 'Yₗᵐ are eigenfunctions of L² and L_z on the sphere. They label atomic orbital angular patterns.', equation: 'Yₗᵐ(θ,φ)   ·   l=0,1,2…', observe: 'Heatmap over θ (vertical) and φ (horizontal).' },
  },
  sturm_liouville: {
    navTitle: 'Sturm–Liouville', title: 'Orthogonal Functions',
    desc: 'Legendre Pₗ(x) and Bessel Jₙ(x) — orthogonality on intervals.',
    hint: 'Legendre or Bessel · orders',
    principle: { desc: 'SL problems d/dx[p(x)y\']+(λw−q)y=0 yield complete orthogonal sets used in PDE separation.', equation: '∫ PₘPₙ dx ∝ δₘₙ', observe: 'Plotted functions; product shows orthogonality when distinct.' },
  },
  pde_visual: {
    navTitle: 'PDE Patterns', title: 'Reaction–Diffusion Patterns',
    desc: 'Gray–Scott model — spots, stripes, coral presets.',
    hint: 'Preset · F and k · speed',
    principle: { desc: 'Coupled diffusion-reaction PDEs produce Turing patterns — spatial structure from instability of uniform state.', equation: '∂u/∂t = Dᵤ∇²u − uv² + F(1−u)', observe: 'v-field heatmap evolves in time.' },
  },
  numerical_methods: {
    navTitle: 'Numerical Methods', title: 'ODE Integrators Compared',
    desc: 'Euler vs leapfrog vs RK4 on harmonic oscillator — energy drift.',
    hint: 'ω · Δt · initial x',
    principle: { desc: 'Different finite-difference schemes trade accuracy vs stability. Symplectic leapfrog preserves energy better than Euler.', equation: 'ẍ = −ω²x', observe: 'Time plot + phase-space spirals (Euler) vs closed loops (leapfrog).' },
  },
};

Object.assign(lang.modules, mathMods);
fs.writeFileSync(langPath, JSON.stringify(lang, null, 2) + '\n');
console.log('Patched lang/en.json');
