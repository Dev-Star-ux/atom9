/**
 * Step-by-step calculator specs for math-physics modules.
 * compute(inputs) -> { rows, steps?, trace?, note? }
 */
import { harmonicCoeff, getPreset } from '../fourier_waves/physics.js';
import { hoEnergy, hoProb, hoPsi } from '../quantum_ho/physics.js';
import { transmission } from '../quantum_tunneling/physics.js';
import { analyticEnergyEV, solveWell, buildHamiltonian } from '../schrodinger_calculator/physics.js';
import { expectationEnergy, optimalAlpha, EXACT_ENERGY } from '../variational_method/physics.js';
import { eigen2x2, stringModeFreq } from '../eigenvalue_lab/physics.js';
import { gaussian, gaussianSpectrum, rectPulse, rectSpectrum } from '../fourier_transform/physics.js';
import { resultant, interferenceAmplitude } from '../complex_phasor/physics.js';
import { sphericalHarmonicProb } from '../spherical_harmonics/physics.js';
import { energy as shoEnergy, stepEuler, stepLeapfrog } from '../numerical_methods/physics.js';
import { legendreP, besselJ, legendreInnerProduct } from '../sturm_liouville/physics.js';

function waveSpeedCalc(f, lambda) { return f * lambda; }
function heatDiffusionTime(L, D) { return (L * L) / (Math.PI * Math.PI * D); }

function fmtLambda(l) {
  if (typeof l === 'number') return l.toFixed(4);
  const im = l.im >= 0 ? '+' + l.im.toFixed(4) : l.im.toFixed(4);
  return l.re.toFixed(4) + im + 'i';
}

function fourierFormula(preset, n) {
  if (preset === 'square') return n % 2 === 0 ? 'a_n = 0 (even harmonics vanish)' : 'a_n = 4/(nπ)';
  if (preset === 'saw') return 'a_n = (2/(nπ)) (−1)^(n+1)';
  if (preset === 'triangle') return n % 2 === 0 ? 'a_n = 0' : 'a_n = (8/(π²n²)) (−1)^((n−1)/2)';
  return 'a_n';
}

export const MATH_CALCULATORS = {
  fourier_waves: {
    fields: [
      { key: 'n', label: 'Harmonic n', min: 1, max: 25, step: 1, default: 5 },
      { key: 'preset', label: 'Preset', type: 'select', options: [
        { value: 'square', label: 'Square' },
        { value: 'saw', label: 'Saw' },
        { value: 'triangle', label: 'Triangle' },
      ], default: 'square' },
    ],
    compute: function (v) {
      const n = Math.round(v.n);
      const pr = getPreset(v.preset);
      const a = harmonicCoeff(v.preset, n);
      const formula = fourierFormula(v.preset, n);
      return {
        rows: [
          ['Coefficient aₙ', a.toFixed(6)],
          ['Preset', pr.label],
          ['Terms in sum', 'N harmonics (see simulator)'],
        ],
        steps: [
          { title: 'Start from preset shape', detail: pr.label + ' on period 2π, expanded in sine series.' },
          { title: 'Look up coefficient rule', formula: formula },
          { title: 'Substitute n = ' + n, formula: 'a_' + n + ' = ' + (n % 2 === 0 && v.preset !== 'saw' ? '0' : '…'), detail: '→ a_' + n + ' = ' + a.toFixed(6) },
          { title: 'Build partial sum', formula: 'f_N(x) = Σ_{k=1}^{N} a_k sin(kx − kωt)', detail: 'Simulator adds each harmonic; Gibbs overshoot appears near jumps when N is finite.' },
        ],
      };
    },
  },

  wave_equation_2d: {
    fields: [
      { key: 'f', label: 'Frequency f', unit: 'Hz', min: 0.5, max: 8, step: 0.1, default: 2 },
      { key: 'lambda', label: 'Wavelength λ', unit: 'm', min: 0.2, max: 4, step: 0.1, default: 1 },
    ],
    compute: function (v) {
      const c = waveSpeedCalc(v.f, v.lambda);
      const omega = 2 * Math.PI * v.f;
      const k = 2 * Math.PI / v.lambda;
      return {
        rows: [
          ['Wave speed c', c.toFixed(3) + ' m/s'],
          ['Angular frequency ω', omega.toFixed(3) + ' rad/s'],
          ['Wavenumber k', k.toFixed(3) + ' rad/m'],
        ],
        steps: [
          { title: 'Dispersion relation', formula: 'c = f · λ' },
          { title: 'Plug in values', formula: 'c = ' + v.f + ' × ' + v.lambda, detail: '= ' + c.toFixed(3) + ' m/s' },
          { title: 'Angular frequency', formula: 'ω = 2πf', detail: '= ' + omega.toFixed(3) + ' rad/s' },
          { title: 'Wavenumber', formula: 'k = 2π/λ', detail: '= ' + k.toFixed(3) + ' rad/m' },
          { title: 'FDTD update (simulator)', formula: 'u^{n+1} = 2u^n − u^{n−1} + (cΔt/Δx)² ∇²u^n', detail: 'Each grid cell updated from neighbours — same c governs ripple speed.' },
        ],
      };
    },
  },

  quantum_ho: {
    fields: [
      { key: 'n', label: 'Level n', min: 0, max: 6, step: 1, default: 0 },
      { key: 'x', label: 'Position x', min: -4, max: 4, step: 0.1, default: 0 },
    ],
    compute: function (v) {
      const n = Math.round(v.n);
      const En = hoEnergy(n);
      const psi = hoPsi(n, v.x);
      const prob = hoProb(n, v.x);
      return {
        rows: [
          ['Eₙ', En.toFixed(3) + ' ℏω'],
          ['ψₙ(x)', psi.toFixed(4)],
          ['|ψₙ|²', prob.toFixed(4)],
          ['Level spacing', 'ΔE = ℏω'],
        ],
        steps: [
          { title: 'Energy quantization', formula: 'E_n = (n + ½) ℏω', detail: 'n = ' + n + ' → E_n = ' + En.toFixed(3) + ' ℏω' },
          { title: 'Wavefunction form', formula: 'ψ_n(x) = N_n H_n(x) e^{−x²/2}', detail: 'H_n = Hermite polynomial of degree n (simulator plots exact ψ).' },
          { title: 'Evaluate at x = ' + v.x, formula: 'ψ_n(' + v.x + ')', detail: '= ' + psi.toFixed(4) },
          { title: 'Probability density', formula: '|ψ_n|²', detail: '= ' + prob.toFixed(4) + ' (integrates to 1 over x)' },
        ],
      };
    },
  },

  quantum_tunneling: {
    fields: [
      { key: 'E', label: 'Energy E', unit: 'eV', min: 0.05, max: 8, step: 0.05, default: 1 },
      { key: 'V0', label: 'Barrier V₀', unit: 'eV', min: 0.5, max: 10, step: 0.1, default: 3 },
      { key: 'a', label: 'Width a', unit: 'nm', min: 0.1, max: 2, step: 0.05, default: 0.5 },
    ],
    compute: function (v) {
      const T = transmission(v.E, v.V0, v.a);
      const classical = v.E >= v.V0;
      let steps;
      if (classical) {
        const kp = Math.sqrt(2 * (v.E - v.V0));
        steps = [
          { title: 'Regime', detail: 'E ≥ V₀ → classical transmission allowed; quantum interference still modulates T.' },
          { title: 'Propagation constant in barrier', formula: 'k′ = √(2m(E−V₀)/ℏ²)', detail: 'k′ = ' + kp.toFixed(4) + ' (teaching units)' },
          { title: 'Match ψ, dψ/dx at x=0 and x=a', detail: 'Coefficients for incident, reflected, transmitted amplitudes.' },
          { title: 'Transmission formula', formula: 'T = 1 / (1 + V₀² sin²(k′a) / (4E(E−V₀)))', detail: 'T = ' + (T * 100).toFixed(2) + ' %' },
        ];
      } else {
        const kappa = Math.sqrt(2 * (v.V0 - v.E));
        steps = [
          { title: 'Regime', detail: 'E < V₀ → classically forbidden; evanescent ψ inside barrier.' },
          { title: 'Decay constant', formula: 'κ = √(2m(V₀−E)/ℏ²)', detail: 'κ = ' + kappa.toFixed(4) + ' nm⁻¹' },
          { title: 'Evanescent solution', formula: 'ψ ∝ e^{±κx} inside barrier', detail: 'Amplitude drops ~ e^{−κa} across width a = ' + v.a + ' nm' },
          { title: 'Tunneling transmission', formula: 'T ∝ 1 / (1 + V₀² sinh²(κa) / (4E(V₀−E)))', detail: 'T = ' + (T * 100).toFixed(2) + ' %' },
        ];
      }
      return {
        rows: [
          ['Transmission T', (T * 100).toFixed(2) + ' %'],
          ['Reflection R', ((1 - T) * 100).toFixed(2) + ' %'],
          ['Classical allowed?', classical ? 'yes' : 'no — tunneling'],
        ],
        steps: steps,
      };
    },
  },

  heat_diffusion: {
    fields: [
      { key: 'L', label: 'Length L', unit: 'm', min: 0.1, max: 5, step: 0.1, default: 1 },
      { key: 'D', label: 'Diffusion D', unit: 'm²/s', min: 0.01, max: 2, step: 0.01, default: 0.2 },
    ],
    compute: function (v) {
      const tau = heatDiffusionTime(v.L, v.D);
      const rate = (Math.PI * Math.PI * v.D) / (v.L * v.L);
      return {
        rows: [
          ['Time scale τ ≈ L²/(π²D)', tau.toFixed(3) + ' s'],
          ['Decay rate π²D/L²', rate.toFixed(4) + ' s⁻¹'],
          ['PDE', '∂T/∂t = D∇²T'],
        ],
        steps: [
          { title: 'Heat equation', formula: '∂T/∂t = D ∇²T', detail: 'Diffusion spreads hot regions toward equilibrium.' },
          { title: 'Separate variables (1D, fixed ends)', formula: 'T_n(x,t) ∝ sin(nπx/L) e^{−(nπ/L)² D t}', detail: 'Mode n decays with rate (nπ/L)²D.' },
          { title: 'Fundamental mode (n=1)', formula: 'τ ∼ L²/(π²D)', detail: 'τ ≈ ' + tau.toFixed(3) + ' s for L=' + v.L + ' m, D=' + v.D },
          { title: 'Explicit FDM step (simulator)', formula: 'T^{n+1}_{i,j} = T^n + DΔt/Δx² (T_{i+1}+T_{i−1}+T_{j±1} − 4T)', detail: 'Stability needs DΔt/Δx² ≤ ¼.' },
        ],
      };
    },
  },

  eigenvalue_lab: {
    fields: [
      { key: 'a', label: 'a', default: 2, step: 0.5 },
      { key: 'b', label: 'b', default: 1, step: 0.5 },
      { key: 'c', label: 'c', default: 1, step: 0.5 },
      { key: 'd', label: 'd', default: 3, step: 0.5 },
      { key: 'n', label: 'String mode n', min: 1, max: 6, step: 1, default: 1 },
      { key: 'L', label: 'Length L', unit: 'm', min: 0.5, max: 3, step: 0.1, default: 1 },
    ],
    compute: function (v) {
      const ev = eigen2x2(v.a, v.b, v.c, v.d);
      const tr = v.a + v.d;
      const det = v.a * v.d - v.b * v.c;
      const disc = tr * tr - 4 * det;
      const n = Math.round(v.n);
      const f = stringModeFreq(n, v.L);
      return {
        rows: [
          ['λ₁', fmtLambda(ev.lambda1)],
          ['λ₂', fmtLambda(ev.lambda2)],
          ['Trace tr(A)', tr.toFixed(4)],
          ['fₙ string', f.toFixed(3) + ' Hz (c=1)'],
        ],
        steps: [
          { title: 'Characteristic polynomial', formula: 'det(A − λI) = 0', detail: 'For [[a,b],[c,d]]: λ² − tr(A)λ + det(A) = 0' },
          { title: 'Compute invariants', formula: 'tr = a+d,  det = ad−bc', detail: 'tr = ' + tr + ', det = ' + det.toFixed(4) + ', discriminant = ' + disc.toFixed(4) },
          { title: 'Solve for λ', detail: 'λ₁ = ' + fmtLambda(ev.lambda1) + ',  λ₂ = ' + fmtLambda(ev.lambda2) + (ev.real ? '' : ' (complex conjugate pair)') },
          { title: 'String eigenmode (fixed ends)', formula: 'y_n(x) = sin(nπx/L)', detail: 'Mode n = ' + n + ' → f_n = nc/(2L) = ' + f.toFixed(3) },
        ],
      };
    },
  },

  schrodinger_calculator: {
    fields: [
      { key: 'L', label: 'Well width L', unit: 'nm', min: 0.4, max: 3, step: 0.05, default: 1 },
      { key: 'n', label: 'Level n', min: 1, max: 4, step: 1, default: 1 },
    ],
    compute: function (v) {
      const n = Math.round(v.n);
      const exact = analyticEnergyEV(n, v.L);
      const exact1 = analyticEnergyEV(1, v.L);
      const ham = buildHamiltonian(v.L, 80);
      const sol = solveWell(v.L, 80);
      const num = sol.energies[n - 1] || exact;
      const dx = ham.L / (ham.nPts + 1);
      return {
        rows: [
          ['Eₙ exact', exact.toFixed(4) + ' eV'],
          ['Eₙ numerical', num.toFixed(4) + ' eV'],
          ['Eₙ/E₁ exact', (exact / exact1).toFixed(2) + ' (= n²)'],
        ],
        steps: [
          { title: 'Infinite well analytic', formula: 'E_n = n² π² ℏ² / (2mL²)', detail: 'E_' + n + ' = ' + exact.toFixed(4) + ' eV for L = ' + v.L + ' nm' },
          { title: 'Discretise Hamiltonian', formula: 'H_ij = −(ℏ²/2m) (δ_{i,j+1} − 2δ_{ij} + δ_{i,j−1}) / Δx²', detail: 'Grid: ' + ham.nPts + ' interior points, Δx = ' + dx.toFixed(4) + ' nm' },
          { title: 'Diagonalise H', detail: 'Jacobi rotations find eigenvalues E_n (same algorithm class as simulator).' },
          { title: 'Compare level n = ' + n, formula: 'E_n^{FDM} ≈ E_n^{exact}', detail: 'Numerical: ' + num.toFixed(4) + ' eV  ·  Error: ' + Math.abs(num - exact).toFixed(4) + ' eV' },
        ],
      };
    },
  },

  fourier_transform: {
    fields: [
      { key: 'mode', label: 'Shape', type: 'select', options: [
        { value: 'gaussian', label: 'Gaussian' },
        { value: 'rect', label: 'Rect pulse' },
      ], default: 'gaussian' },
      { key: 'width', label: 'Width σ or w', min: 0.1, max: 2, step: 0.05, default: 0.5 },
      { key: 'omega', label: 'Sample ω', min: 0, max: 10, step: 0.1, default: 1 },
    ],
    compute: function (v) {
      const gauss = v.mode === 'gaussian';
      const spec = gauss ? gaussianSpectrum(v.omega, v.width) : rectSpectrum(v.omega, v.width);
      const tVal = gauss ? gaussian(0, v.width) : rectPulse(0, v.width);
      return {
        rows: [
          ['f(0)', tVal.toFixed(4)],
          ['|F(ω)| at ω=' + v.omega, spec.toFixed(4)],
          ['Shape', gauss ? 'Gaussian' : 'Rect pulse'],
        ],
        steps: gauss ? [
          { title: 'Time-domain', formula: 'f(t) = e^{−t²/(2σ²)}', detail: 'σ = ' + v.width },
          { title: 'Fourier transform', formula: 'F(ω) = ∫ f(t) e^{−iωt} dt', detail: 'Analytic: F(ω) ∝ e^{−σ²ω²/2}' },
          { title: 'Evaluate |F(ω)| at ω = ' + v.omega, detail: '|F| = ' + spec.toFixed(4) },
          { title: 'Uncertainty', formula: 'Δt · Δω ≳ ½', detail: 'Narrower pulse → broader spectrum.' },
        ] : [
          { title: 'Time-domain', formula: 'f(t) = 1 for |t| < w/2', detail: 'w = ' + v.width },
          { title: 'Transform', formula: 'F(ω) = ∫_{−w/2}^{w/2} e^{−iωt} dt = (2/ω) sin(ωw/2)', detail: 'Sinc envelope in frequency.' },
          { title: 'Evaluate |F(ω)| at ω = ' + v.omega, detail: '|F| = ' + spec.toFixed(4) },
        ],
      };
    },
  },

  variational_method: {
    fields: [
      { key: 'alpha', label: 'Trial α', min: 0.05, max: 2, step: 0.01, default: 0.5 },
    ],
    compute: function (v) {
      const E = expectationEnergy(v.alpha);
      const opt = optimalAlpha();
      const Eopt = expectationEnergy(opt);
      const err = ((E - EXACT_ENERGY) / EXACT_ENERGY * 100);
      return {
        rows: [
          ['⟨H⟩(α)', E.toFixed(4) + ' ℏω'],
          ['Optimal α*', opt.toFixed(4)],
          ['⟨H⟩(α*)', Eopt.toFixed(4) + ' ℏω'],
          ['Exact E₀', EXACT_ENERGY.toFixed(4) + ' ℏω'],
        ],
        steps: [
          { title: 'Pick trial wavefunction', formula: 'ψ_α(x) = (2α/π)^{1/4} e^{−αx²}', detail: 'Gaussian with width parameter α.' },
          { title: 'Compute expectation', formula: '⟨H⟩ = ∫ ψ* (−½ d²/dx² + ½x²) ψ dx', detail: 'For this trial: ⟨H⟩(α) = α/2 + 1/(8α) (ℏω=1 units)' },
          { title: 'Substitute α = ' + v.alpha, detail: '⟨H⟩ = ' + E.toFixed(4) + ' ℏω  (error ' + err.toFixed(1) + '% vs exact)' },
          { title: 'Minimize w.r.t. α', formula: 'd⟨H⟩/dα = 0  →  α* = ' + opt.toFixed(4), detail: 'Variational principle: ⟨H⟩ ≥ E₀ always.' },
        ],
      };
    },
  },

  complex_phasor: {
    fields: [
      { key: 'phi1', label: 'Phase φ₁', unit: '°', min: 0, max: 360, step: 5, default: 0 },
      { key: 'phi2', label: 'Phase φ₂', unit: '°', min: 0, max: 360, step: 5, default: 90 },
    ],
    compute: function (v) {
      const p1 = v.phi1 * Math.PI / 180;
      const p2 = v.phi2 * Math.PI / 180;
      const z1 = { re: Math.cos(p1), im: Math.sin(p1) };
      const z2 = { re: Math.cos(p2), im: Math.sin(p2) };
      const sum = resultant(p1, p2);
      const amp = interferenceAmplitude(p1, p2);
      const I = amp * amp;
      return {
        rows: [
          ['|z₁+z₂|', amp.toFixed(4)],
          ['Intensity ∝ |z|²', I.toFixed(4)],
          ['Re(z₁+z₂)', sum.re.toFixed(4)],
          ['Im(z₁+z₂)', sum.im.toFixed(4)],
        ],
        steps: [
          { title: 'Unit phasors', formula: 'z_k = e^{iφ_k}', detail: 'z₁ = ' + z1.re.toFixed(3) + '+' + z1.im.toFixed(3) + 'i,  z₂ = ' + z2.re.toFixed(3) + '+' + z2.im.toFixed(3) + 'i' },
          { title: 'Vector addition', formula: 'z = z₁ + z₂', detail: 'Re = ' + sum.re.toFixed(4) + ', Im = ' + sum.im.toFixed(4) },
          { title: 'Resultant amplitude', formula: '|z| = √(Re² + Im²)', detail: '|z| = ' + amp.toFixed(4) },
          { title: 'Interference', formula: 'I ∝ |z₁ + z₂|²', detail: 'Phase difference Δφ = ' + (v.phi2 - v.phi1) + '° → constructive or destructive.' },
        ],
      };
    },
  },

  spherical_harmonics: {
    fields: [
      { key: 'l', label: 'l', min: 0, max: 4, step: 1, default: 2 },
      { key: 'm', label: 'm', min: -4, max: 4, step: 1, default: 1 },
      { key: 'theta', label: 'θ', unit: '°', min: 0, max: 180, step: 5, default: 60 },
      { key: 'phi', label: 'φ', unit: '°', min: 0, max: 360, step: 5, default: 45 },
    ],
    compute: function (v) {
      const l = Math.round(v.l);
      let m = Math.round(v.m);
      if (m > l) m = l;
      if (m < -l) m = -l;
      const th = v.theta * Math.PI / 180;
      const ph = v.phi * Math.PI / 180;
      const prob = sphericalHarmonicProb(l, m, th, ph);
      return {
        rows: [
          ['Quantum numbers', 'l=' + l + ', m=' + m],
          ['|Y_l^m|² at (θ,φ)', prob.toFixed(4)],
          ['Degeneracy', String(2 * l + 1) + ' states for fixed l'],
        ],
        steps: [
          { title: 'Angular momentum quantum numbers', formula: 'l = 0,1,2,… ;  −l ≤ m ≤ l', detail: 'Using l=' + l + ', m=' + m },
          { title: 'Separation in θ, φ', formula: 'Y_l^m(θ,φ) = N_l^m P_l^m(cos θ) e^{imφ}', detail: 'P_l^m = associated Legendre function.' },
          { title: 'Evaluate at θ=' + v.theta + '°, φ=' + v.phi + '°', detail: '|Y|² = ' + prob.toFixed(4) },
          { title: 'Physical meaning', detail: 'For atoms: |Y|² gives angular part of orbital probability (simulator shows polar lobes).' },
        ],
      };
    },
  },

  sturm_liouville: {
    fields: [
      { key: 'family', label: 'Family', type: 'select', options: [
        { value: 'legendre', label: 'Legendre P_l' },
        { value: 'bessel', label: 'Bessel J_n' },
      ], default: 'legendre' },
      { key: 'o1', label: 'Order 1', min: 0, max: 4, step: 1, default: 2 },
      { key: 'o2', label: 'Order 2', min: 0, max: 4, step: 1, default: 3 },
      { key: 'x', label: 'x', min: -1, max: 5, step: 0.1, default: 0.5 },
    ],
    compute: function (v) {
      const o1 = Math.round(v.o1);
      const o2 = Math.round(v.o2);
      if (v.family === 'bessel') {
        const j1 = besselJ(o1, v.x);
        const j2 = besselJ(o2, v.x);
        return {
          rows: [
            ['J_' + o1 + '(x)', j1.toFixed(4)],
            ['J_' + o2 + '(x)', j2.toFixed(4)],
            ['SL form', '(x y′)′ + (λx − n²/x) y = 0'],
          ],
          steps: [
            { title: 'Bessel equation', formula: 'x²y″ + xy′ + (λx² − n²)y = 0', detail: 'Radial part of Laplacian in cylindrical symmetry.' },
            { title: 'Series at x=0', formula: 'J_n(x) = Σ (−1)^k (x/2)^{n+2k} / (k!(n+k)!)', detail: 'Computed via recurrence (same as simulator).' },
            { title: 'Evaluate orders n=' + o1 + ', ' + o2 + ' at x=' + v.x, detail: 'J_' + o1 + '=' + j1.toFixed(4) + ', J_' + o2 + '=' + j2.toFixed(4) },
            { title: 'Orthogonality on [0,R]', formula: '∫₀^R J_n(λ_{nk} x/R) J_n(λ_{nm} x/R) x dx ∝ δ_{km}', detail: 'Eigenvalues λ_{nk} from zeros of J_n.' },
          ],
        };
      }
      const p1 = legendreP(o1, v.x);
      const p2 = legendreP(o2, v.x);
      const inner = legendreInnerProduct(o1, o2);
      return {
        rows: [
          ['P_' + o1 + '(x)', p1.toFixed(4)],
          ['P_' + o2 + '(x)', p2.toFixed(4)],
          ['∫_{−1}^{1} P_' + o1 + ' P_' + o2 + ' dx', inner.toFixed(4) + (o1 === o2 ? ' (norm)' : '')],
        ],
        steps: [
          { title: 'Legendre equation', formula: '((1−x²)y′)′ + l(l+1)y = 0', detail: 'Sturm–Liouville on [−1,1] with weight 1.' },
          { title: 'Rodrigues / recurrence', formula: 'P_l(x) from (l+1)P_{l+1} = (2l+1)x P_l − l P_{l−1}', detail: 'Same recurrence as simulator.' },
          { title: 'Evaluate at x = ' + v.x, detail: 'P_' + o1 + '=' + p1.toFixed(4) + ', P_' + o2 + '=' + p2.toFixed(4) },
          { title: 'Orthogonality', formula: '∫_{−1}^{1} P_l P_m dx = 2/(2l+1) δ_{lm}', detail: 'Numerical ∫ ≈ ' + inner.toFixed(4) },
        ],
      };
    },
  },

  pde_visual: {
    fields: [
      { key: 'F', label: 'Feed F', min: 0.01, max: 0.08, step: 0.001, default: 0.036 },
      { key: 'k', label: 'Kill k', min: 0.045, max: 0.065, step: 0.001, default: 0.065 },
    ],
    compute: function (v) {
      const diff = v.k - v.F;
      let regime = 'homogeneous (no pattern)';
      if (v.F > 0.03 && diff > 0.02) regime = 'spots / coral (high F, k−F large)';
      else if (diff < 0.005) regime = 'stripes / maze (k ≈ F)';
      return {
        rows: [
          ['k − F', diff.toFixed(4)],
          ['Expected regime', regime],
          ['Equations', '∂u/∂t = Du∇²u − uv² + F(1−u)'],
        ],
        steps: [
          { title: 'Gray–Scott model', formula: '∂u/∂t = Du∇²u − uv² + F(1−u)', detail: '∂v/∂t = Dv∇²v + uv² − (F+k)v' },
          { title: 'Set parameters', detail: 'F = ' + v.F + ', k = ' + v.k + ' → k−F = ' + diff.toFixed(4) },
          { title: 'Classify regime', detail: regime },
          { title: 'Explicit integration (simulator)', formula: 'u^{n+1} = u^n + Δt · RHS(u^n, v^n)', detail: 'Laplacian via 5-point stencil on 2D grid each step.' },
        ],
      };
    },
  },

  numerical_methods: {
    fields: [
      { key: 'omega', label: 'ω', min: 0.5, max: 4, step: 0.1, default: 1 },
      { key: 'dt', label: 'Δt', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      { key: 'x0', label: 'x₀', min: -2, max: 2, step: 0.1, default: 1 },
    ],
    compute: function (v) {
      const e0 = shoEnergy(v.x0, 0, v.omega);
      let sE = { x: v.x0, v: 0 };
      let sL = { x: v.x0, v: 0 };
      const trace = [['step', 'x (Euler)', 'E (Euler)', 'x (LF)', 'E (LF)']];
      trace.push(['0', sE.x.toFixed(4), e0.toFixed(4), sL.x.toFixed(4), e0.toFixed(4)]);
      for (let i = 1; i <= 8; i++) {
        sE = stepEuler(sE, v.dt, v.omega);
        sL = stepLeapfrog(sL, v.dt, v.omega);
        trace.push([
          String(i),
          sE.x.toFixed(4),
          shoEnergy(sE.x, sE.v, v.omega).toFixed(4),
          sL.x.toFixed(4),
          shoEnergy(sL.x, sL.v, v.omega).toFixed(4),
        ]);
      }
      for (let i = 9; i < 200; i++) {
        sE = stepEuler(sE, v.dt, v.omega);
        sL = stepLeapfrog(sL, v.dt, v.omega);
      }
      const eE = shoEnergy(sE.x, sE.v, v.omega);
      const eL = shoEnergy(sL.x, sL.v, v.omega);
      const stable = v.dt * v.omega < 2;
      return {
        rows: [
          ['Initial E', e0.toFixed(4)],
          ['E after 200 steps (Euler)', eE.toFixed(4)],
          ['E after 200 steps (leapfrog)', eL.toFixed(4)],
          ['Euler stability (ωΔt < 2)', stable ? 'likely stable' : 'unstable — blow-up risk'],
        ],
        steps: [
          { title: 'Equation of motion', formula: 'ẍ + ω²x = 0  →  ẋ = v,  v̇ = −ω²x', detail: 'Energy E = ½(v² + ω²x²) should stay constant.' },
          { title: 'Euler (explicit)', formula: 'x_{n+1} = x_n + Δt v_n ;  v_{n+1} = v_n + Δt(−ω²x_n)', detail: 'First-order; energy drifts or blows up if Δt too large.' },
          { title: 'Leapfrog (Verlet)', formula: 'v_{n+½} = v_n + ½Δt a_n ;  x_{n+1} = x_n + Δt v_{n+½} ;  v_{n+1} = v_{n+½} + ½Δt a_{n+1}', detail: 'Symplectic — much better energy conservation.' },
          { title: 'Stability check', formula: 'Euler: roughly need ωΔt ≲ 2', detail: 'ωΔt = ' + (v.omega * v.dt).toFixed(3) + ' → ' + (stable ? 'OK' : 'too large') },
        ],
        trace: trace,
      };
    },
  },
};

export function getCalculator(id) {
  return MATH_CALCULATORS[id] || null;
}
