import { el, infoTable } from './ui.js';

function renderTraceTable(trace) {
  const wrap = el('div', 'mp-calc-trace-wrap');
  wrap.appendChild(el('div', 'mp-calc-trace-head', 'Iteration trace'));
  const table = el('table', 'mp-calc-trace');
  if (!trace || !trace.length) return wrap;
  const head = el('tr');
  trace[0].forEach(function (cell) {
    head.appendChild(el('th', '', String(cell)));
  });
  const thead = el('thead');
  thead.appendChild(head);
  table.appendChild(thead);
  const tbody = el('tbody');
  for (let r = 1; r < trace.length; r++) {
    const tr = el('tr');
    trace[r].forEach(function (cell) {
      tr.appendChild(el('td', '', String(cell)));
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/** Render calculator output: summary table + numbered steps + optional trace. */
export function renderCalcOutput(host, result, t) {
  host.innerHTML = '';
  if (!result) return;

  if (result.rows && result.rows.length) {
    const block = el('div', 'mp-calc-result');
    block.appendChild(el('div', 'mp-calc-result-head', t('common.mathLab.resultTitle')));
    block.appendChild(infoTable(result.rows));
    host.appendChild(block);
  }

  if (result.steps && result.steps.length) {
    const sec = el('div', 'mp-calc-steps');
    sec.appendChild(el('div', 'mp-calc-steps-head', t('common.mathLab.stepsTitle')));
    result.steps.forEach(function (step, i) {
      const row = el('div', 'mp-calc-step');
      row.appendChild(el('div', 'mp-calc-step-n', String(i + 1)));
      const body = el('div', 'mp-calc-step-body');
      body.appendChild(el('div', 'mp-calc-step-title', step.title));
      if (step.formula) body.appendChild(el('div', 'mp-calc-step-formula', step.formula));
      if (step.detail) body.appendChild(el('div', 'mp-calc-step-detail', step.detail));
      row.appendChild(body);
      sec.appendChild(row);
    });
    host.appendChild(sec);
  }

  if (result.trace && result.trace.length) {
    host.appendChild(renderTraceTable(result.trace));
  }

  if (result.note) {
    host.appendChild(el('p', 'mp-calc-note', result.note));
  }
}
