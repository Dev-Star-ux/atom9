const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(file, 'utf8');

const keep = [];
css = css.replace(/linear-gradient\(\s*rgba\(148,\s*163,\s*184,\s*0\.06\) 1px,\s*transparent 1px\)/g, (m) => {
  keep.push(m);
  return `%%KEEP${keep.length - 1}%%`;
});
css = css.replace(/linear-gradient\(90deg,\s*rgba\(148,\s*163,\s*184,\s*0\.06\) 1px,\s*transparent 1px\)/g, (m) => {
  keep.push(m);
  return `%%KEEP${keep.length - 1}%%`;
});

function splitArgs(inner) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function pickSolid(fn) {
  const open = fn.indexOf('(');
  const inner = fn.slice(open + 1, -1);
  const args = splitArgs(inner).filter(function (a) {
    return !/^(to |from |circle|ellipse|\d|transparent|-?\d)/i.test(a) || /rgba?\(|hsla?\(|#|var\(/.test(a);
  });
  const colors = [];
  for (let i = 0; i < args.length; i++) {
    const m = args[i].match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#(?:[0-9a-fA-F]{3,8})|var\([^)]+\))/);
    if (m && m[1] !== 'transparent') colors.push(m[1]);
  }
  if (!colors.length) return 'var(--panel)';
  const last = colors[colors.length - 1];
  if (last === 'transparent' && colors[0]) return colors[0];
  // Prefer a non-transparent mid/last stop for Win11 flat surfaces
  return colors[0];
}

function replaceFn(src, name) {
  const needle = name + '(';
  let out = '';
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf(needle, i);
    if (idx < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    let depth = 0;
    let j = idx + name.length;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      if (src[j] === ')') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const fn = src.slice(idx, j);
    out += pickSolid(fn);
    i = j;
  }
  return out;
}

css = replaceFn(css, 'radial-gradient');
css = replaceFn(css, 'linear-gradient');

keep.forEach(function (m, i) {
  css = css.split('%%KEEP' + i + '%%').join(m);
});

fs.writeFileSync(file, css);
console.log('Flattened gradients in styles.css');
