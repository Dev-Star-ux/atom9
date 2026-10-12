// Export a runnable subset project with only the selected experiment modules.
// Used by serve.cjs POST /api/export. Requires parent node_modules for esbuild.
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..');

function toCamel(id) {
  return String(id).replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (filterFn && !filterFn(from, ent)) continue;
    if (ent.isDirectory()) copyDir(from, to, filterFn);
    else copyFile(from, to);
  }
}

function writeRegistry(moduleIds) {
  const NAV_GROUP_DEFS = [
    { id: 'intro', titleKey: 'nav.groups.intro' },
    { id: 'thermal', titleKey: 'nav.groups.thermal' },
    { id: 'waves', titleKey: 'nav.groups.waves' },
    { id: 'quantum', titleKey: 'nav.groups.quantum' },
    { id: 'math_physics', titleKey: 'nav.groups.mathPhysics' },
    { id: 'xray', titleKey: 'nav.groups.xray' },
    { id: 'nuclear', titleKey: 'nav.groups.nuclear' },
    { id: 'detectors', titleKey: 'nav.groups.detectors' },
    { id: 'applications', titleKey: 'nav.groups.applications' },
    { id: 'electromagnetics', titleKey: 'nav.groups.electromagnetics' },
  ];

  const GROUP_MODULE_IDS = {
    intro: ['cathode_ray', 'millikan', 'mass_spec', 'cross_section', 'planetary', 'planetary_disadvantages', 'cloud_chamber', 'rutherford', 'mechanical_equilibrium'],
    thermal: ['spectral_density', 'bb_features', 'rayleigh_jeans', 'planck', 'photoelectric', 'prism_spectroscope', 'frank_hertz', 'hydrogen_spectrum'],
    waves: ['wave_theory', 'quantum_theory', 'wave_beam', 'double_slit', 'davisson_germer', 'de_broglie'],
    quantum: ['bohr', 'schrodinger_discovery', 'infinite_well', 'uncertainty_xp', 'uncertainty_et', 'wave_particle_probability', 'wavefunction_stats', 'orbital', 'light_duality'],
    math_physics: [
      'fourier_waves', 'wave_equation_2d', 'quantum_ho', 'quantum_tunneling', 'heat_diffusion', 'eigenvalue_lab',
      'schrodinger_calculator', 'fourier_transform', 'variational_method', 'complex_phasor',
      'spherical_harmonics', 'sturm_liouville', 'pde_visual', 'numerical_methods',
    ],
    xray: ['xray_discovery', 'xray_wave', 'xray_particle', 'compton'],
    nuclear: [
      'lab_canvas', 'atomic_nuclear_formulas', 'periodic_table', 'chart_of_nuclides', 'nuclear_reaction',
      'nuclear_reactor', 'nuclear_fission', 'fission_mechanism', 'atomic_bomb', 'nuclear_fusion', 'radioactive_decay', 'binding_energy', 'alpha_beta_decay',
      'neutron_moderator', 'decay_chain', 'pet_tracer',
    ],
    detectors: [
      'nai_spectrometer', 'hpge_vs_nai', 'gm_dead_time', 'geiger_counter',
      'alpha_spectroscopy', 'neutron_detector', 'pet_coincidence', 'shielding_detector',
    ],
    applications: ['applications', 'quantum_computer', 'nmr_mri', 'esr_epr'],
    electromagnetics: [
      'laser_printer', 'electrostatic_shielding', 'electrospray_spinning',
      'electrostatic_precipitator', 'micro_electrokinetics', 'meissner_effect',
      'wheatstone_bridge', 'thermionic_emission', 'photomultiplier_tube',
      'glow_discharge', 'arc_discharge', 'spark_discharge', 'corona_discharge',
      'lightning_rod', 'electrolysis_copper',
      'pn_junction', 'seebeck_effect', 'peltier_effect', 'cyclotron', 'oscilloscope_crt',
      'electron_microscope', 'hall_effect', 'diamagnetism',
      'eddy_currents', 'faraday_disc', 'ac_power_factor', 'rotating_magnetic_field', 'forced_em_resonance',
      'em_wave_radiation', 'em_wave_refraction', 'radar_principles', 'stealth_technology', 'microwave_oven',
    ],
  };

  function moduleGroupId(id) {
    for (let g = 0; g < NAV_GROUP_DEFS.length; g++) {
      const gid = NAV_GROUP_DEFS[g].id;
      const list = GROUP_MODULE_IDS[gid] || [];
      if (list.indexOf(id) >= 0) return gid;
    }
    return 'intro';
  }

  const usedGroups = {};
  for (let i = 0; i < moduleIds.length; i++) usedGroups[moduleGroupId(moduleIds[i])] = true;

  const lines = [
    '// Auto-generated registry for an exported subset project.',
    '// Order = sidebar order (grouped).',
  ];
  const names = [];
  for (let i = 0; i < moduleIds.length; i++) {
    const id = moduleIds[i];
    const name = toCamel(id);
    names.push(name);
    lines.push("import " + name + " from './" + id + "/module.js';");
  }
  lines.push('');
  lines.push('export const NAV_GROUPS = [');
  for (let g = 0; g < NAV_GROUP_DEFS.length; g++) {
    const grp = NAV_GROUP_DEFS[g];
    if (!usedGroups[grp.id]) continue;
    lines.push("  { id: '" + grp.id + "', titleKey: '" + grp.titleKey + "' },");
  }
  lines.push('];');
  lines.push('');
  lines.push('const GROUP_LISTS = {');
  for (let g = 0; g < NAV_GROUP_DEFS.length; g++) {
    const grp = NAV_GROUP_DEFS[g];
    if (!usedGroups[grp.id]) continue;
    const modsInGroup = [];
    for (let i = 0; i < moduleIds.length; i++) {
      if (moduleGroupId(moduleIds[i]) === grp.id) modsInGroup.push(moduleIds[i]);
    }
    if (!modsInGroup.length) continue;
    lines.push('  ' + grp.id + ': [');
    for (let i = 0; i < modsInGroup.length; i++) {
      const id = modsInGroup[i];
      const name = toCamel(id);
      const comma = i < modsInGroup.length - 1 ? ',' : '';
      lines.push("    Object.assign({}, " + name + ", { group: '" + grp.id + "' })" + comma);
    }
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
  lines.push('export const MODULES = NAV_GROUPS.reduce(function (acc, grp) {');
  lines.push('  const list = GROUP_LISTS[grp.id] || [];');
  lines.push('  for (let i = 0; i < list.length; i++) acc.push(list[i]);');
  lines.push('  return acc;');
  lines.push('}, []);');
  lines.push('');
  return lines.join('\n');
}

function pruneLang(full, moduleIds) {
  const out = {};
  const keepRoots = [
    '_meta', 'app', 'nav', 'common', 'learn', 'exercises', 'settings', 'hint', 'controls', 'ai',
  ];
  for (let i = 0; i < keepRoots.length; i++) {
    const k = keepRoots[i];
    if (full[k] != null) out[k] = full[k];
  }
  out.modules = {};
  const srcMods = full.modules || {};
  for (let i = 0; i < moduleIds.length; i++) {
    const id = moduleIds[i];
    if (srcMods[id]) out.modules[id] = srcMods[id];
  }
  return out;
}

function listAvailableModuleIds() {
  const regPath = path.join(APP_DIR, 'src', 'modules', 'registry.js');
  const text = fs.readFileSync(regPath, 'utf8');
  const ids = [];
  const re = /from\s+'\.\/([^/]+)\/module\.js'/g;
  let m;
  while ((m = re.exec(text)) !== null) ids.push(m[1]);
  return ids;
}

function validateModules(moduleIds) {
  const available = listAvailableModuleIds();
  const set = {};
  for (let i = 0; i < available.length; i++) set[available[i]] = true;
  const out = [];
  for (let i = 0; i < moduleIds.length; i++) {
    const id = moduleIds[i];
    if (!set[id]) throw new Error('Unknown module: ' + id);
    if (out.indexOf(id) < 0) out.push(id);
  }
  if (!out.length) throw new Error('Select at least one experiment');
  return out;
}

function resolveOutDir(baseDir, projectName) {
  const base = path.resolve(String(baseDir || '').trim());
  if (!base || base === path.parse(base).root) {
    throw new Error('Choose a valid save directory');
  }
  const name = String(projectName || 'Atomic_Physics_Export').trim().replace(/[<>:"|?*]/g, '_');
  if (!name) throw new Error('Enter a project name');
  const outDir = path.join(base, name);
  const appResolved = path.resolve(APP_DIR);
  const rel = path.relative(appResolved, outDir);
  if (rel === '' || (rel && !rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error('Save folder cannot be inside (or equal to) the main app folder');
  }
  return outDir;
}

async function buildExportBundle(outDir) {
  const esbuild = require(path.join(APP_DIR, 'node_modules', 'esbuild'));
  const outfile = path.join(outDir, 'dist', 'bundle.js');
  ensureDir(path.join(outDir, 'dist'));

  // Copy WASM binaries from parent dist or package
  const parentDist = path.join(APP_DIR, 'dist');
  if (fs.existsSync(parentDist)) {
    for (const f of fs.readdirSync(parentDist)) {
      if (f.endsWith('.wasm')) {
        copyFile(path.join(parentDist, f), path.join(outDir, 'dist', f));
      }
    }
  } else {
    const wasmPkg = path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json'));
    const wasmDist = path.join(wasmPkg, 'dist');
    for (const f of fs.readdirSync(wasmDist)) {
      if (f.endsWith('.wasm')) {
        copyFile(path.join(wasmDist, f), path.join(outDir, 'dist', f));
      }
    }
  }

  function patchEmbeddedWorker() {
    let code = fs.readFileSync(outfile, 'utf8');
    const next = code.split('e.reason??e').join('e.reason!=null?e.reason:e');
    if (next !== code) fs.writeFileSync(outfile, next);
  }

  await esbuild.build({
    entryPoints: [path.join(outDir, 'src', 'renderer.js')],
    bundle: true,
    outfile: outfile,
    platform: 'browser',
    format: 'iife',
    target: ['chrome80'],
    sourcemap: false,
    minify: true,
    logLevel: 'silent',
    nodePaths: [path.join(APP_DIR, 'node_modules')],
    absWorkingDir: outDir,
  });
  patchEmbeddedWorker();
}

function writeExportReadme(outDir, moduleIds) {
  const lines = [
    '# Atomic Physics — exported subset',
    '',
    'This folder is a **standalone** copy of Atomic Visual AI with only these experiments:',
    '',
  ];
  for (let i = 0; i < moduleIds.length; i++) lines.push('- `' + moduleIds[i] + '`');
  lines.push('');
  lines.push('## Run');
  lines.push('');
  lines.push('Needs **Node.js** and **Google Chrome**.');
  lines.push('');
  lines.push('```bat');
  lines.push('run.bat');
  lines.push('```');
  lines.push('');
  lines.push('`dist/` is already built. No internet required to run.');
  lines.push('');
  lines.push('To rebuild after editing source: run `setup.bat` once (needs internet), then `run.bat`.');
  lines.push('');
  fs.writeFileSync(path.join(outDir, 'README.md'), lines.join('\n'), 'utf8');
}

/**
 * @param {{ modules: string[], baseDir: string, projectName?: string }} opts
 * @returns {Promise<{ outDir: string, modules: string[] }>}
 */
async function exportProject(opts) {
  const moduleIds = validateModules(opts.modules || []);
  const outDir = resolveOutDir(opts.baseDir, opts.projectName);

  if (fs.existsSync(outDir)) {
    throw new Error('Folder already exists: ' + outDir + ' — choose another name or delete it first');
  }
  ensureDir(outDir);

  // Root runtime files
  const rootFiles = [
    'index.html', 'styles.css', 'serve.cjs', 'build.cjs',
    'package.json', 'run.bat', 'setup.bat',
  ];
  for (let i = 0; i < rootFiles.length; i++) {
    const f = rootFiles[i];
    const src = path.join(APP_DIR, f);
    if (fs.existsSync(src)) copyFile(src, path.join(outDir, f));
  }

  // Bump cache buster lightly
  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/bundle\.js\?v=[^"]+/, 'bundle.js?v=export1');
    fs.writeFileSync(indexPath, html, 'utf8');
  }

  // config
  const cfg = {
    language: 'en',
    fontFamily: '',
    fontSize: 16,
    activeModule: moduleIds[0],
    sidebarCollapsed: true,
    exercisesEnabled: true,
    problemEditorEnabled: false,
    showPrinciple: false,
    showAiPanel: false,
    showKeyIdeas: false,
    hiddenModules: {},
    exportEnabled: false,
    childProject: true,
  };
  fs.writeFileSync(path.join(outDir, 'config.json'), JSON.stringify(cfg, null, 2) + '\n', 'utf8');

  // fonts
  copyDir(path.join(APP_DIR, 'fonts'), path.join(outDir, 'fonts'));
  // offline KaTeX CSS + fonts
  copyDir(path.join(APP_DIR, 'vendor'), path.join(outDir, 'vendor'));

  // lang (pruned)
  ensureDir(path.join(outDir, 'lang'));
  const langFull = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'lang', 'en.json'), 'utf8'));
  const langOut = pruneLang(langFull, moduleIds);
  fs.writeFileSync(path.join(outDir, 'lang', 'en.json'), JSON.stringify(langOut, null, 2) + '\n', 'utf8');

  // learn + exercises
  ensureDir(path.join(outDir, 'learn'));
  ensureDir(path.join(outDir, 'exercises'));
  for (let i = 0; i < moduleIds.length; i++) {
    const id = moduleIds[i];
    const learnSrc = path.join(APP_DIR, 'learn', id + '.html');
    const exSrc = path.join(APP_DIR, 'exercises', id + '.json');
    if (fs.existsSync(learnSrc)) copyFile(learnSrc, path.join(outDir, 'learn', id + '.html'));
    if (fs.existsSync(exSrc)) copyFile(exSrc, path.join(outDir, 'exercises', id + '.json'));
  }

  // src tree: all root js + modules/common + selected modules + shared deps
  const srcRoot = path.join(APP_DIR, 'src');
  const outSrc = path.join(outDir, 'src');
  ensureDir(outSrc);
  for (const f of fs.readdirSync(srcRoot)) {
    const full = path.join(srcRoot, f);
    if (fs.statSync(full).isFile()) copyFile(full, path.join(outSrc, f));
  }
  copyDir(path.join(srcRoot, 'modules', 'common'), path.join(outSrc, 'modules', 'common'));

  const foldersToCopy = resolveSupportFolders(moduleIds);
  for (let i = 0; i < foldersToCopy.length; i++) {
    const id = foldersToCopy[i];
    const modSrc = path.join(srcRoot, 'modules', id);
    if (!fs.existsSync(modSrc)) {
      if (moduleIds.indexOf(id) >= 0) throw new Error('Missing module folder: ' + id);
      continue;
    }
    copyDir(modSrc, path.join(outSrc, 'modules', id));
  }
  fs.writeFileSync(path.join(outSrc, 'modules', 'registry.js'), writeRegistry(moduleIds), 'utf8');

  writeExportReadme(outDir, moduleIds);

  if (!fs.existsSync(path.join(APP_DIR, 'node_modules', 'esbuild'))) {
    throw new Error('esbuild not found. Run setup.bat in the main app once, then export again.');
  }
  await buildExportBundle(outDir);

  return { outDir: outDir, modules: moduleIds };
}

function listJsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) listJsFiles(full, out);
    else if (/\.m?js$/i.test(ent.name)) out.push(full);
  }
}

/** Folders imported as ../name/… (excluding common). */
function scanCrossModuleImports(modDir) {
  const deps = {};
  const files = [];
  listJsFiles(modDir, files);
  const re = /from\s+['"]\.\.\/([a-z0-9_]+)\//g;
  for (let i = 0; i < files.length; i++) {
    let text = '';
    try { text = fs.readFileSync(files[i], 'utf8'); } catch (e) { continue; }
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (name && name !== 'common') deps[name] = true;
    }
  }
  return Object.keys(deps);
}

/**
 * Selected experiment folders plus shared support folders they import
 * (e.g. xray_wave → xray, davisson_germer → de_broglie).
 * Support folders are copied for the bundle but not added to MODULES.
 */
function resolveSupportFolders(moduleIds) {
  const needed = {};
  for (let i = 0; i < moduleIds.length; i++) needed[moduleIds[i]] = true;

  let changed = true;
  const commonDir = path.join(APP_DIR, 'src', 'modules', 'common');
  while (changed) {
    changed = false;
    const keys = Object.keys(needed);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i];
      const modDir = path.join(APP_DIR, 'src', 'modules', id);
      const deps = scanCrossModuleImports(modDir);
      for (let j = 0; j < deps.length; j++) {
        if (!needed[deps[j]]) {
          needed[deps[j]] = true;
          changed = true;
        }
      }
    }
    const commonDeps = scanCrossModuleImports(commonDir);
    for (let j = 0; j < commonDeps.length; j++) {
      if (!needed[commonDeps[j]]) {
        needed[commonDeps[j]] = true;
        changed = true;
      }
    }
  }

  // Keep stable order: selected modules first, then extras
  const out = moduleIds.slice();
  const extras = Object.keys(needed).sort();
  for (let i = 0; i < extras.length; i++) {
    if (out.indexOf(extras[i]) < 0) out.push(extras[i]);
  }
  return out;
}

function knownFolders() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const out = [];
  function add(label, p) {
    if (p && fs.existsSync(p)) out.push({ label: label, path: p });
  }
  add('Desktop', path.join(home, 'Desktop'));
  add('Documents', path.join(home, 'Documents'));
  add('Downloads', path.join(home, 'Downloads'));
  if (process.platform === 'win32') {
    for (const letter of ['C', 'D', 'E', 'F']) {
      const root = letter + ':\\';
      if (fs.existsSync(root)) add(letter + ':', root);
    }
  }
  return out;
}

module.exports = {
  exportProject,
  knownFolders,
  listAvailableModuleIds,
  APP_DIR,
};
