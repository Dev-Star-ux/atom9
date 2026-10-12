const fs = require('fs');
const j = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'));
const ids = [
  'eddy_currents', 'faraday_disc', 'ac_power_factor', 'rotating_magnetic_field',
  'forced_em_resonance', 'em_wave_radiation', 'em_wave_refraction',
  'radar_principles', 'stealth_technology', 'microwave_oven',
];
let ok = 0;
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const m = j.modules[id];
  if (!m) {
    console.log('MISSING LANG', id);
    continue;
  }
  if (!m.navTitle || !m.principle || !m.controls || !m.info || !m.teach) {
    console.log('INCOMPLETE LANG', id, Object.keys(m));
    continue;
  }
  console.log('LANG OK', id, m.navTitle);
  ok++;
}
const r = fs.readFileSync('src/modules/registry.js', 'utf8');
console.log('registry eddy', r.indexOf('eddy_currents') >= 0);
console.log('registry microwaveOven', r.indexOf('microwaveOven') >= 0);
const s = fs.readFileSync('styles.css', 'utf8');
const classes = ['edc-viewport', 'fdisc-viewport', 'acpf-viewport', 'rmf-viewport', 'femr-viewport', 'emrad-viewport', 'emref-viewport', 'radar-viewport', 'stealth-viewport', 'mwo-viewport'];
for (let i = 0; i < classes.length; i++) {
  console.log('css', classes[i], s.indexOf(classes[i]) >= 0);
}
const html = fs.readFileSync('index.html', 'utf8');
const vm = html.match(/bundle\.js\?v=([^\"]+)/);
console.log('cache', vm && vm[1]);
console.log('lang modules ok', ok + '/' + ids.length);
