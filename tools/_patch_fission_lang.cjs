const fs = require('fs');
const j = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'));

j.modules.nuclear_fission = {
  navTitle: 'Nuclear Fission',
  title: 'Nuclear Fission — Chain Reaction',
  desc: 'General fission: a neutron splits U-235 into fragments plus more neutrons (~200 MeV). Change enrichment to grow or stop the chain.',
  hint: '2D|3D · Fire a neutron · raise enrichment to grow the chain · lower it to die out',
  note: 'k = neutrons next generation / neutrons now. More U-235 → higher k. k<1 dies out, k≈1 steady, k>1 grows. (Reactor rods are a separate lab.)',
  principle: {
    desc: 'A slow neutron can split a uranium-235 nucleus into two lighter fragments, free 2–3 more neutrons, and release about 200 MeV. If those neutrons cause more fissions, you get a chain reaction. This lab shows that general process — not reactor control hardware.',
    equation: 'U-235 + n → fragments A + B + (2–3)n + ~200 MeV    ·    k = N_next / N_now',
    observe: 'Orange = U-235 (can fission). Grey = U-238 (usually absorbs/scatters). Blue = neutron. Orange pieces flying out = fission fragments.',
  },
  guide: {
    title: 'What you are watching',
    s1: 'Blue neutron flies into the uranium grid.',
    s2: 'If it hits orange U-235 → FISSION (flash + two fragments).',
    s3: 'New neutrons fly out — they may hit more U-235.',
    s4: 'Higher enrichment (more U-235) → chain more likely to grow.',
    tip: 'Press "Fire neutron". Try low enrichment (dies out) then high enrichment (grows).',
  },
  how: {
    title: 'How to use this lab',
    body: 'Think: hit → split → multiply.',
    a: 'Fire a neutron and watch one fission (flash + fragments + new neutrons).',
    b: 'Raise enrichment — more orange U-235 → chain continues more easily.',
    c: 'Lower enrichment — mostly grey U-238 → chain dies out.',
    d: 'Switch to 3D to see the same grid in space.',
  },
  controls: {
    title: 'Controls',
    enrichment: 'U-235 enrichment',
    enrichmentHelp: 'Percent of nuclei that are fissile U-235 (rest mostly U-238).',
    fire: 'Fire neutron',
    reset: 'Reset sample',
  },
  info: { k: 'Multiplication k', status: 'Chain status', meaning: 'In plain words' },
  status: {
    subcritical: 'Subcritical (dies out)',
    critical: 'Near critical (steady)',
    supercritical: 'Supercritical (grows)',
  },
  ai: {
    title: 'AI — Finds critical enrichment',
    desc: 'Collect (enrichment → k) data. AI finds enrichment that makes k≈1.',
    collect: 'Collect k data',
    find: 'Find critical %',
    stop: 'Stop',
    estimate: 'Enrichment',
    error: 'Error',
    true: 'Critical %',
    how: 'Criticality needs k≈1.\nThe AI sees noisy k at many enrichments and searches for the % that best gives k=1.',
  },
  tips: {
    fuel: { title: 'Uranium nuclei', desc: 'Orange U-235 can fission; grey U-238 usually does not.' },
  },
};

fs.writeFileSync('lang/en.json', JSON.stringify(j, null, 2) + '\n');
console.log('lang fission updated');
