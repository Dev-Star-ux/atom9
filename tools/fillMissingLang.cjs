const fs = require('fs');
const path = require('path');
const langPath = path.join(__dirname, '..', 'lang', 'en.json');
const lang = JSON.parse(fs.readFileSync(langPath, 'utf8'));

function merge(dst, src) {
  if (!src || typeof src !== 'object') return dst;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
      merge(dst[k], v);
    } else if (dst[k] === undefined) {
      dst[k] = v;
    }
  }
  return dst;
}

lang.common.aiStop = lang.common.aiStop || 'Stop';

const math = {
  fourier_waves: {
    controls: {
      title: 'Parameters',
      preset: 'Wave preset',
      harmonics: 'Harmonics N',
      harmonicsHelp: 'More terms sharpen corners (Gibbs overshoot).',
      speed: 'Animation speed',
      speedHelp: 'Phase velocity of each harmonic component.',
    },
    info: {
      preset: 'Preset',
      terms: 'Terms',
      a1: 'a₁',
      period: 'Period',
    },
  },
  wave_equation_2d: {
    controls: {
      title: 'Parameters',
      barrier: 'Barrier',
      open: 'Open',
      slit: 'Slit barrier',
      amplitude: 'Source amplitude',
      amplitudeHelp: 'Strength of the oscillating point source.',
      frequency: 'Drive frequency',
      frequencyHelp: 'Oscillation rate of the source.',
    },
    info: {
      grid: 'Grid',
      scheme: 'Scheme',
      barrier: 'Barrier',
      barrierNone: 'none',
      barrierSlit: 'slit wall',
      source: 'Source',
      sourceCentre: 'centre point',
    },
  },
  quantum_ho: {
    controls: {
      title: 'Parameters',
      level: 'Level n',
      levelHelp: 'Energy eigenstate ψₙ of the harmonic oscillator.',
      display: 'Display',
      probOn: '|ψ|² on',
      psiOnly: 'ψ only',
    },
    info: {
      n: 'n',
      energy: 'Eₙ',
      nodes: 'Nodes',
      units: 'Units',
      unitsVal: 'ℏ = m = ω = 1',
    },
  },
  quantum_tunneling: {
    controls: {
      title: 'Parameters',
      energy: 'Energy E',
      energyHelp: 'Incident particle energy (teaching units).',
      barrierV: 'Barrier height V₀',
      barrierVHelp: 'Rectangular barrier potential height.',
      barrierW: 'Barrier width a',
      barrierWHelp: 'Width of the classically forbidden region.',
    },
    info: {
      E: 'E',
      V0: 'V₀',
      T: 'T(E)',
      regime: 'Regime',
      above: 'above barrier',
      tunneling: 'tunneling',
    },
  },
  heat_diffusion: {
    controls: {
      title: 'Parameters',
      diffusion: 'Diffusion D',
      diffusionHelp: 'Higher D spreads heat faster (watch stability).',
      dimension: 'Dimension',
      reset: 'Reset pulse',
    },
    info: {
      equation: 'Equation',
      scheme: 'Scheme',
      dt: 'Δt (stable)',
      peak: 'Peak u',
      mean: 'Mean u',
    },
  },
  eigenvalue_lab: {
    controls: {
      title: 'Parameters',
      a: 'a',
      b: 'b',
      c: 'c',
      d: 'd',
      mode: 'String mode n',
      modeHelp: 'Standing wave sin(nπx/L).',
      length: 'String length L',
    },
    info: {
      trace: 'tr(A)',
      det: 'det(A)',
      lambda1: 'λ₁',
      lambda2: 'λ₂',
      lambda: 'λ',
      freq: 'fₙ (c=1)',
    },
  },
  schrodinger_calculator: {
    controls: {
      title: 'Parameters',
      width: 'Well width L',
      widthHelp: 'Infinite square well — walls at x=0 and x=L.',
      level: 'Level n',
    },
    info: {
      method: 'Method',
      L: 'L',
      n: 'Level n',
      Efdm: 'E (FDM)',
      Eexact: 'E (exact)',
      err: '|ΔE|/E',
    },
  },
  fourier_transform: {
    controls: {
      title: 'Parameters',
      pulse: 'Pulse shape',
      gauss: 'Gaussian',
      rect: 'Rectangular',
      width: 'Width σ or w',
      widthHelp: 'Narrower in time → wider spectrum (uncertainty).',
    },
    info: {
      shape: 'Pulse',
      gauss: 'Gaussian',
      rect: 'Rectangular',
      width: 'Width',
      time: 'Time support',
      note: 'Observe',
      noteVal: 'Δt · Δω ~ 1 (qualitative)',
    },
  },
  variational_method: {
    controls: {
      title: 'Parameters',
      alpha: 'Trial width α',
      alphaHelp: 'Gaussian trial ψ ∝ exp(−αx²). Minimize ⟨H⟩ vs α.',
    },
    info: {
      energy: '⟨H⟩(α)',
      exact: 'Exact E₀',
      bestAlpha: 'Best α',
      error: 'Error vs E₀',
      trial: 'Trial',
      trialVal: 'ψ = N exp(−αx²)',
    },
  },
  complex_phasor: {
    controls: {
      title: 'Parameters',
      phi1: 'Phase φ₁',
      phi1Help: 'First phasor e^{iφ₁} on the unit circle.',
      phi2: 'Phase φ₂',
      phi2Help: 'Second phasor e^{iφ₂}. Watch constructive / destructive sum.',
    },
    info: {
      mag: '|z₁ + z₂|',
      arg: 'arg(z₁ + z₂)',
      interference: 'Interference',
      wave: 'Wave',
      waveVal: 'Re[(z₁+z₂)e^{iωt}]',
    },
  },
  spherical_harmonics: {
    controls: {
      title: 'Parameters',
      l: 'Orbital ℓ',
      lHelp: 'Total angular momentum quantum number (0…4).',
      m: 'Magnetic m',
      mHelp: 'Azimuthal quantum number (−ℓ…+ℓ).',
    },
    info: {
      l: 'ℓ',
      m: 'm',
      plot: 'Plot',
      plotVal: '|Y_ℓ^m(θ,φ)|²',
      peak: 'Peak density',
      grid: 'Grid',
      gridVal: 'θ × φ heatmap',
    },
  },
  sturm_liouville: {
    controls: {
      title: 'Parameters',
      family: 'Family',
      legendre: 'Legendre P_ℓ',
      bessel: 'Bessel J_n',
      order1: 'Order ₁',
      order1Help: 'First eigenfunction index.',
      order2: 'Order ₂',
      order2Help: 'Second index — compare orthogonality when the two orders differ.',
    },
    info: {
      family: 'Family',
      modes: 'Modes',
      inner: '∫ f₁ f₂ w dx',
      weight: 'Weight',
      orthogonal: 'Orthogonal?',
      yes: 'yes (≈0)',
      norm: 'norm',
      check: 'check',
      familyLegendre: 'Legendre',
      familyBessel: 'Bessel',
      wLegendre: 'w=1 on [−1,1]',
      wBessel: 'w=x on [0,10]',
    },
  },
  pde_visual: {
    controls: {
      title: 'Parameters',
      preset: 'Pattern preset',
      F: 'Feed F',
      FHelp: 'Gray–Scott feed rate. Higher F tends toward spots.',
      k: 'Kill k',
      kHelp: 'Gray–Scott kill rate. Together with F it selects the pattern.',
      speed: 'Animation speed',
      speedHelp: 'How many PDE steps run per frame.',
      reset: 'Reset field',
      resetBtn: 'Reset',
    },
    info: {
      preset: 'Preset',
      F: 'Feed F',
      k: 'Kill k',
      Du: 'Dᵤ',
      Dv: 'Dᵥ',
    },
  },
  numerical_methods: {
    controls: {
      title: 'Parameters',
      omega: 'Frequency ω',
      omegaHelp: 'Harmonic oscillator angular frequency.',
      dt: 'Time step Δt',
      dtHelp: 'Larger steps show Euler energy drift more clearly.',
      x0: 'Initial x',
      x0Help: 'Starting displacement (v₀ = 0).',
      reset: 'Restart',
      resetBtn: 'Reset',
    },
    info: {
      omega: 'ω',
      dt: 'Δt',
      period: 'Period',
      energy: 'Energy',
      equation: 'Equation',
    },
  },
};

for (const id of Object.keys(math)) {
  if (!lang.modules[id]) lang.modules[id] = {};
  merge(lang.modules[id], math[id]);
}

fs.writeFileSync(langPath, JSON.stringify(lang, null, 2) + '\n');
console.log('Filled missing English strings for', Object.keys(math).length, 'math labs + common.aiStop');
