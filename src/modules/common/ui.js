// Shared UI helpers so every experiment explains itself the same clear way:
// a Principle card (what & why + the equation + what to watch), a scene legend
// (what each 3D element is), and labelled parameter sliders with units.

import { equationEl } from './latex.js';

export const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

// A collapsible card with a clickable header (title + caret). Returns { card,
// body, setOpen } — append content to body. `open` sets the initial state.
export function collapsibleCard(title, { open = true, extraClass = '' } = {}) {
  const card = el('div', 'card collapsible' + (extraClass ? ' ' + extraClass : ''));
  const header = el('button', 'collapse-header');
  header.type = 'button';
  header.appendChild(el('span', 'card-title', title));
  const caret = el('span', 'caret', open ? '▾' : '▸');
  header.appendChild(caret);
  const body = el('div', 'collapse-body');
  if (!open) body.style.display = 'none';
  function setOpen(v) {
    const show = !!v;
    body.style.display = show ? '' : 'none';
    caret.textContent = show ? '▾' : '▸';
  }
  header.onclick = function () {
    setOpen(body.style.display === 'none');
  };
  card.append(header, body);
  return { card: card, body: body, setOpen: setOpen };
}

// A "Principle" card (collapsible) built from lang keys under
// <prefix>.principle.* :
//   desc (required), equation (optional), goal (optional),
//   steps (optional, "\n"-separated), observe (optional)
export function principleCard(t, prefix) {
  const { card, body } = collapsibleCard(t('common.principle'), { open: false, extraClass: 'principle' });
  body.appendChild(el('p', 'principle-desc', t(prefix + '.principle.desc')));
  const eq = t(prefix + '.principle.equation');
  if (eq && eq !== prefix + '.principle.equation') {
    const parts = String(eq).split(/\n|;;/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length > 1) {
      const wrap = el('div', 'equation-stack');
      parts.forEach(function (part) {
        wrap.appendChild(equationEl(part, 'equation'));
      });
      body.appendChild(wrap);
    } else {
      body.appendChild(equationEl(eq, 'equation'));
    }
  }
  const goal = t(prefix + '.principle.goal');
  if (goal && goal !== prefix + '.principle.goal') {
    const g = el('div', 'principle-goal');
    g.appendChild(el('div', 'principle-label', t('common.labGoal')));
    g.appendChild(el('p', 'principle-goal-text', goal));
    body.appendChild(g);
  }
  const steps = t(prefix + '.principle.steps');
  if (steps && steps !== prefix + '.principle.steps') {
    const wrap = el('div', 'principle-steps');
    wrap.appendChild(el('div', 'principle-label', t('common.tryThis')));
    const ol = el('ol', 'principle-steps-list');
    String(steps).split('\n').forEach(function (line) {
      const s = String(line).trim();
      if (s) ol.appendChild(el('li', null, s));
    });
    wrap.appendChild(ol);
    body.appendChild(wrap);
  }
  const ob = t(prefix + '.principle.observe');
  if (ob && ob !== prefix + '.principle.observe') {
    const o = el('div', 'observe');
    o.appendChild(el('span', 'observe-ico', '👁'));
    o.appendChild(el('span', null, ob));
    body.appendChild(o);
  }
  return card;
}

// A collapsible "How the AI works" block to append inside an AI card. Reads a
// multi-line explanation from the given lang key (use "\n" for separate points).
export function aiHowBlock(t, howKey) {
  const wrap = el('div', 'ai-how');
  const btn = el('button', 'ai-how-toggle');
  btn.appendChild(el('span', null, t('common.howAI')));
  const caret = el('span', 'caret', '▸');
  btn.appendChild(caret);
  const body = el('div', 'ai-how-body');
  body.style.display = 'none';
  const text = t(howKey);
  for (const line of String(text).split('\n')) {
    if (line.trim()) body.appendChild(el('p', 'ai-how-line', line.trim()));
  }
  btn.onclick = () => {
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
    caret.textContent = hidden ? '▾' : '▸';
  };
  wrap.append(btn, body);
  return wrap;
}

// A floating legend inside the 3D viewport: items = [{ color, label }]
export function sceneLegend(viewport, title, items) {
  const box = el('div', 'scene-legend');
  if (title) box.appendChild(el('div', 'scene-legend-title', title));
  for (const it of items) {
    const row = el('div', 'leg-item');
    const dot = el('span', 'leg-dot'); dot.style.background = it.color;
    row.appendChild(dot);
    row.appendChild(el('span', null, it.label));
    box.appendChild(row);
  }
  viewport.appendChild(box);
  return box;
}

// A labelled slider with a live value + unit and an optional one-line help.
// Returns { set(v) } to update programmatically.
export function paramSlider(parent, { label, unit = '', min, max, step, value, help, decimals, onInput }) {
  const dec = decimals != null ? decimals : (step < 1 ? 2 : 0);
  const wrap = el('div', 'param');
  const top = el('div', 'row');
  top.appendChild(el('label', null, label));
  const val = el('span', 'val', (+value).toFixed(dec) + unit);
  top.appendChild(val);
  wrap.appendChild(top);
  const s = el('input'); s.type = 'range'; s.min = min; s.max = max; s.step = step; s.value = value;
  s.oninput = () => { val.textContent = (+s.value).toFixed(dec) + unit; onInput(+s.value); };
  wrap.appendChild(s);
  if (help) wrap.appendChild(el('div', 'param-help', help));
  parent.appendChild(wrap);
  return { set: (v) => { s.value = v; val.textContent = (+v).toFixed(dec) + unit; } };
}

// A simple label→value readout table. rows = [[k, v], ...]
export function infoTable(rows) {
  const table = el('table', 'info');
  for (const [k, v] of rows) {
    const tr = el('tr');
    tr.appendChild(el('td', 'k', k));
    tr.appendChild(el('td', 'v', v));
    table.appendChild(tr);
  }
  return table;
}
