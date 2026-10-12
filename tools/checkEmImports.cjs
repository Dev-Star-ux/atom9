const fs = require('fs');
const path = require('path');

const ids = [
  'eddy_currents', 'faraday_disc', 'ac_power_factor', 'rotating_magnetic_field',
  'forced_em_resonance', 'em_wave_radiation', 'em_wave_refraction',
  'radar_principles', 'stealth_technology', 'microwave_oven',
];

function exportsOf(code) {
  const names = [];
  const re1 = /export\s+function\s+(\w+)/g;
  const re2 = /export\s+class\s+(\w+)/g;
  const re3 = /export\s+\{([^}]+)\}/g;
  let m;
  while ((m = re1.exec(code))) names.push(m[1]);
  while ((m = re2.exec(code))) names.push(m[1]);
  while ((m = re3.exec(code))) {
    m[1].split(',').forEach(function (p) {
      const t = p.trim().split(/\s+as\s+/);
      names.push((t[1] || t[0]).trim());
    });
  }
  return names;
}

function importsFromPhysics(code) {
  const m = code.match(/import\s*\{([^}]+)\}\s*from\s*['\"]\.\/physics\.js['\"]/);
  if (!m) return [];
  return m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function importsFromScene(code, file) {
  const re = new RegExp("import\\s*\\{([^}]+)\\}\\s*from\\s*['\"]\\.\\/" + file + "['\"]");
  const m = code.match(re);
  if (!m) return [];
  return m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

let issues = 0;
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const dir = path.join('src/modules', id);
  const mod = fs.readFileSync(path.join(dir, 'module.js'), 'utf8');
  const phy = fs.readFileSync(path.join(dir, 'physics.js'), 'utf8');
  const s2 = fs.readFileSync(path.join(dir, 'scene2d.js'), 'utf8');
  const s3 = fs.readFileSync(path.join(dir, 'scene3d.js'), 'utf8');
  const pEx = exportsOf(phy);
  const s2Ex = exportsOf(s2);
  const s3Ex = exportsOf(s3);
  const pIm = importsFromPhysics(mod).concat(importsFromPhysics(s2)).concat(importsFromPhysics(s3));
  const s2Im = importsFromScene(mod, 'scene2d.js');
  const s3Im = importsFromScene(mod, 'scene3d.js');

  console.log('\n' + id);
  console.log('  physics exports:', pEx.join(', '));
  console.log('  scene2d exports:', s2Ex.join(', '));
  console.log('  scene3d exports:', s3Ex.join(', '));
  console.log('  module imports physics:', importsFromPhysics(mod).join(', '));
  console.log('  module imports 2d/3d:', s2Im.join(','), '/', s3Im.join(','));

  pIm.forEach(function (name) {
    if (pEx.indexOf(name) < 0) {
      console.log('  !! missing physics export:', name);
      issues++;
    }
  });
  s2Im.forEach(function (name) {
    if (s2Ex.indexOf(name) < 0) {
      console.log('  !! missing scene2d export:', name);
      issues++;
    }
  });
  s3Im.forEach(function (name) {
    if (s3Ex.indexOf(name) < 0) {
      console.log('  !! missing scene3d export:', name);
      issues++;
    }
  });
}
console.log('\nTotal issues:', issues);
