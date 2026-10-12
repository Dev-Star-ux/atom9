const fs = require('fs');
const path = require('path');

const lang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lang', 'en.json'), 'utf8'));

function get(key) {
  let n = lang;
  for (const p of key.split('.')) n = n && n[p];
  return typeof n === 'string' ? n : undefined;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|cjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk(path.join(__dirname, '..', 'src'), []);
const missing = new Map();

function add(full, file) {
  if (get(full) !== undefined) return;
  const arr = missing.get(full) || [];
  arr.push(path.relative(path.join(__dirname, '..'), file));
  missing.set(full, arr);
}

const reT = /(?:this|inst|self)\.T\(\s*['"]([^'"]+)['"]/g;
const reAbs = /(?:this|inst|self|ctx)\.t\(\s*['"]([^'"]+)['"]/g;

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const norm = f.replace(/\\/g, '/');
  const parts = norm.split('/');
  const mi = parts.indexOf('modules');
  const id = mi >= 0 ? parts[mi + 1] : null;
  let m;
  reT.lastIndex = 0;
  while ((m = reT.exec(s))) {
    const k = m[1];
    const full = id && id !== 'common' ? 'modules.' + id + '.' + k : k;
    add(full, f);
  }
  reAbs.lastIndex = 0;
  while ((m = reAbs.exec(s))) add(m[1], f);
}

const keys = [...missing.keys()].sort();
console.log('MISSING', keys.length);
for (const k of keys) console.log(k);
