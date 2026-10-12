import { el, principleCard, infoTable } from '../common/ui.js';
import { CATEGORIES, ELEMENTS, getElement, getElementBySymbol } from './elementsData.js';

/** Nuclear highlight for teaching: decay series / α / β / other radio. */
const NUCLEAR_MARKS = {
  series: { labelKey: 'nuclear.series', color: '#fbbf24', className: 'pt-nuke-series' },
  alpha: { labelKey: 'nuclear.alpha', color: '#fb923c', className: 'pt-nuke-alpha' },
  beta: { labelKey: 'nuclear.beta', color: '#38bdf8', className: 'pt-nuke-beta' },
  radio: { labelKey: 'nuclear.radio', color: '#f472b6', className: 'pt-nuke-radio' },
};

function nuclearKind(edata) {
  if (edata.decayChains && edata.decayChains.length) return 'series';
  const isos = edata.isotopes || [];
  let hasAlpha = false;
  let hasBeta = false;
  let hasRadio = false;
  for (let i = 0; i < isos.length; i++) {
    const iso = isos[i];
    const d = String(iso.decay || '');
    const hl = String(iso.halfLife || '');
    if (hl === 'stable' || d === '—' || d === 'stable' || d === '') continue;
    hasRadio = true;
    if (d.indexOf('α') >= 0 || d.toLowerCase().indexOf('alpha') >= 0) hasAlpha = true;
    if (d.indexOf('β') >= 0 || d.toLowerCase().indexOf('beta') >= 0) hasBeta = true;
  }
  if (!hasRadio) return null;
  if (hasAlpha) return 'alpha';
  if (hasBeta) return 'beta';
  return 'radio';
}

/** Standard periodic-table cell positions (period, column 1–18). */
function cellPos(elData) {
  const z = elData.z;
  if (z === 1) return { row: 1, col: 1 };
  if (z === 2) return { row: 1, col: 18 };
  if (z >= 3 && z <= 4) return { row: 2, col: z - 2 };
  if (z >= 5 && z <= 10) return { row: 2, col: z + 8 };
  if (z >= 11 && z <= 12) return { row: 3, col: z - 10 };
  if (z >= 13 && z <= 18) return { row: 3, col: z };
  if (z >= 19 && z <= 36) return { row: 4, col: z - 18 };
  if (z >= 37 && z <= 54) return { row: 5, col: z - 36 };
  if (z === 55 || z === 56) return { row: 6, col: z - 54 };
  if (z >= 57 && z <= 71) return { row: 8, col: z - 54 };
  if (z >= 72 && z <= 86) return { row: 6, col: z - 68 };
  if (z === 87 || z === 88) return { row: 7, col: z - 86 };
  if (z >= 89 && z <= 103) return { row: 9, col: z - 86 };
  if (z >= 104 && z <= 118) return { row: 7, col: z - 100 };
  return { row: 1, col: 1 };
}

class PeriodicTableInstance {
  constructor(ctx) {
    this.t = ctx.t;
    this.selected = null;
    this._overlay = null;
    this._onKey = null;
  }

  T(k, v) { return this.t('modules.periodic_table.' + k, v); }

  mount(root) {
    root.classList.add('module-orbital', 'module-pt');
    this.viewport = el('div', 'viewport pt-viewport');
    root.appendChild(this.viewport);

    this.panel = el('div', 'panel pt-panel');
    this.panel.appendChild(principleCard(this.t, 'modules.periodic_table'));
    this.panel.appendChild(this._buildNuclearLegendCard());
    this.panel.appendChild(this._buildLegendCard());
    root.appendChild(this.panel);

    this._shell = el('div', 'pt-shell');
    this.viewport.appendChild(this._shell);
    this._buildTable();

    // Highlight Uranium as a suggested starting element (no modal until click)
    const u = getElementBySymbol('U') || getElement(92);
    if (u) this._setActive(u.z);
  }

  _buildNuclearLegendCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.nuclearLegend')));
    card.appendChild(el('p', 'param-help', this.T('controls.nuclearHelp')));
    const wrap = el('div', 'pt-legend');
    const self = this;
    ['series', 'alpha', 'beta', 'radio'].forEach(function (key) {
      const m = NUCLEAR_MARKS[key];
      const row = el('div', 'pt-legend-item');
      const sw = el('span', 'pt-swatch pt-nuke-swatch');
      sw.style.background = m.color;
      row.appendChild(sw);
      row.appendChild(el('span', null, self.T(m.labelKey)));
      wrap.appendChild(row);
    });
    card.appendChild(wrap);
    return card;
  }

  _buildLegendCard() {
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', this.T('controls.legend')));
    const wrap = el('div', 'pt-legend');
    Object.keys(CATEGORIES).forEach(function (key) {
      const c = CATEGORIES[key];
      const row = el('div', 'pt-legend-item');
      const sw = el('span', 'pt-swatch');
      sw.style.background = c.color;
      row.appendChild(sw);
      row.appendChild(el('span', null, c.label));
      wrap.appendChild(row);
    });
    card.appendChild(wrap);
    return card;
  }

  _buildTable() {
    const self = this;
    this._shell.innerHTML = '';
    this._shell.appendChild(el('div', 'pt-title', this.T('title')));
    this._shell.appendChild(el('p', 'pt-sub', this.T('pageDesc')));

    const grid = el('div', 'pt-grid');
    const laMark = el('div', 'pt-cell pt-mark');
    laMark.style.gridRow = '6';
    laMark.style.gridColumn = '3';
    laMark.innerHTML = '<span class="pt-z">57–71</span><span class="pt-sym">La–Lu</span>';
    grid.appendChild(laMark);
    const acMark = el('div', 'pt-cell pt-mark');
    acMark.style.gridRow = '7';
    acMark.style.gridColumn = '3';
    acMark.innerHTML = '<span class="pt-z">89–103</span><span class="pt-sym">Ac–Lr</span>';
    grid.appendChild(acMark);

    ELEMENTS.forEach(function (edata) {
      if (edata.z >= 57 && edata.z <= 71) return;
      if (edata.z >= 89 && edata.z <= 103) return;
      const pos = cellPos(edata);
      const cell = self._makeCell(edata);
      cell.style.gridRow = String(pos.row);
      cell.style.gridColumn = String(pos.col);
      grid.appendChild(cell);
    });
    this._shell.appendChild(grid);

    const fBlock = el('div', 'pt-fblock');
    fBlock.appendChild(el('div', 'pt-f-label', 'Lanthanides'));
    const laRow = el('div', 'pt-f-row');
    ELEMENTS.filter(function (e) { return e.z >= 57 && e.z <= 71; }).forEach(function (edata) {
      laRow.appendChild(self._makeCell(edata));
    });
    fBlock.appendChild(laRow);

    fBlock.appendChild(el('div', 'pt-f-label', 'Actinides'));
    const acRow = el('div', 'pt-f-row');
    ELEMENTS.filter(function (e) { return e.z >= 89 && e.z <= 103; }).forEach(function (edata) {
      acRow.appendChild(self._makeCell(edata));
    });
    fBlock.appendChild(acRow);
    this._shell.appendChild(fBlock);

    this._cells = this._shell.querySelectorAll('.pt-el');
  }

  _makeCell(edata) {
    const self = this;
    const cat = CATEGORIES[edata.category] || CATEGORIES.transition;
    const kind = nuclearKind(edata);
    const mark = kind ? NUCLEAR_MARKS[kind] : null;
    const cell = el('button', 'pt-cell pt-el' + (mark ? ' ' + mark.className : ''));
    cell.type = 'button';
    cell.dataset.z = String(edata.z);
    cell.style.setProperty('--pt-c', cat.color);
    if (mark) cell.style.setProperty('--pt-nuke', mark.color);
    let html =
      '<span class="pt-z">' + edata.z + '</span>' +
      '<span class="pt-sym">' + edata.symbol + '</span>' +
      '<span class="pt-mass">' + (edata.mass % 1 === 0 ? edata.mass : edata.mass.toFixed(2)) + '</span>';
    if (mark) {
      html += '<span class="pt-nuke-dot" title="' + this.T(mark.labelKey) + '"></span>';
    }
    cell.innerHTML = html;
    cell.title = edata.name + (mark ? ' · ' + this.T(mark.labelKey) : '');
    cell.onclick = function () {
      self.selected = edata;
      self._setActive(edata.z);
      self._openModal(edata);
    };
    return cell;
  }

  _setActive(z) {
    if (!this._cells) return;
    const zs = String(z);
    this._cells.forEach(function (c) {
      c.classList.toggle('active', c.dataset.z === zs);
    });
  }

  _openModal(e) {
    this._closeModal();
    const self = this;
    const overlay = el('div', 'overlay pt-overlay');
    overlay.onclick = function (ev) {
      if (ev.target === overlay) self._closeModal();
    };

    const modal = el('div', 'pt-modal');
    const head = el('div', 'pt-modal-head');
    const badge = el('div', 'pt-detail-badge');
    badge.textContent = e.symbol;
    badge.style.borderColor = (CATEGORIES[e.category] || {}).color || '#22d3ee';
    head.appendChild(badge);

    const titles = el('div', 'pt-modal-titles');
    titles.appendChild(el('div', 'pt-detail-name', e.name));
    const kind = nuclearKind(e);
    const mark = kind ? NUCLEAR_MARKS[kind] : null;
    const catLine = (CATEGORIES[e.category] || {}).label || e.category;
    titles.appendChild(el('div', 'pt-detail-cat',
      mark ? catLine + ' · ' + this.T(mark.labelKey) : catLine));
    if (mark) badge.style.boxShadow = '0 0 0 2px ' + mark.color;
    head.appendChild(titles);

    const close = el('button', 'btn pt-modal-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.onclick = function () { self._closeModal(); };
    head.appendChild(close);
    modal.appendChild(head);

    const body = el('div', 'pt-modal-body');
    body.appendChild(this._buildDetailContent(e));
    modal.appendChild(body);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._overlay = overlay;

    this._onKey = function (ev) {
      if (ev.key === 'Escape') self._closeModal();
    };
    window.addEventListener('keydown', this._onKey);
  }

  _buildDetailContent(e) {
    const wrap = el('div', 'pt-modal-content');

    const rows = [
      [this.T('info.z'), String(e.z)],
      [this.T('info.mass'), String(e.mass) + ' u'],
      [this.T('info.config'), e.config],
      [this.T('info.period'), String(e.period)],
      [this.T('info.group'), e.group ? String(e.group) : 'f-block'],
    ];
    wrap.appendChild(infoTable(rows));

    wrap.appendChild(el('div', 'pt-sec-title', this.T('info.isotopes')));
    const isoTable = el('table', 'pt-iso-table');
    const thead = el('tr');
    ['A', this.T('info.abund'), this.T('info.half'), this.T('info.decay'), this.T('info.spin'), this.T('info.be')].forEach(function (h) {
      thead.appendChild(el('th', '', h));
    });
    isoTable.appendChild(thead);
    (e.isotopes || []).forEach(function (iso) {
      const tr = el('tr');
      tr.appendChild(el('td', '', iso.aLabel ? iso.aLabel : String(iso.a)));
      tr.appendChild(el('td', '', iso.abundance != null ? iso.abundance + '%' : '—'));
      tr.appendChild(el('td', '', iso.halfLife || '—'));
      tr.appendChild(el('td', '', iso.decay || '—'));
      tr.appendChild(el('td', '', iso.spin || '—'));
      tr.appendChild(el('td', '', iso.bindingMeV != null ? iso.bindingMeV.toFixed(3) + ' MeV' : '—'));
      isoTable.appendChild(tr);
    });
    wrap.appendChild(isoTable);

    const modes = {};
    (e.isotopes || []).forEach(function (iso) {
      const d = iso.decay || '—';
      if (d === '—') return;
      modes[d] = (modes[d] || 0) + 1;
    });
    const modeKeys = Object.keys(modes);
    if (modeKeys.length) {
      wrap.appendChild(el('div', 'pt-sec-title', this.T('info.decayModes')));
      wrap.appendChild(el('p', 'pt-note', modeKeys.join(' · ')));
    }

    const mainIso = (e.isotopes || [])[0];
    if (mainIso && mainIso.spin && mainIso.spin !== '—') {
      wrap.appendChild(el('div', 'pt-sec-title', this.T('info.spinMain')));
      wrap.appendChild(el('p', 'pt-note',
        (mainIso.aLabel || ('A=' + mainIso.a)) + ' → Iπ = ' + mainIso.spin));
    }

    const withBE = (e.isotopes || []).filter(function (i) { return i.bindingMeV != null; });
    if (withBE.length) {
      wrap.appendChild(el('div', 'pt-sec-title', this.T('info.beTitle')));
      wrap.appendChild(el('p', 'pt-note', this.T('info.beHelp')));
      withBE.forEach(function (iso) {
        wrap.appendChild(el('div', 'pt-be-row',
          (iso.aLabel || String(iso.a)) + ' → B/A ≈ ' + iso.bindingMeV.toFixed(3) + ' MeV/nucleon'));
      });
    }

    if (e.decayChains && e.decayChains.length) {
      wrap.appendChild(el('div', 'pt-sec-title', this.T('info.chains')));
      e.decayChains.forEach(function (chain) {
        const box = el('div', 'pt-chain');
        box.appendChild(el('div', 'pt-chain-title', chain.title));
        const list = el('ol', 'pt-chain-list');
        (chain.steps || []).forEach(function (step) {
          const li = el('li', '');
          li.innerHTML = '<b>' + step.nuclide + '</b> · ' + step.mode +
            (step.hl && step.hl !== '—' ? ' · T½ = ' + step.hl : '');
          list.appendChild(li);
        });
        box.appendChild(list);
        wrap.appendChild(box);
      });
    } else {
      wrap.appendChild(el('p', 'pt-note muted', this.T('info.noChain')));
    }

    return wrap;
  }

  _closeModal() {
    if (this._onKey) {
      window.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
  }

  unmount() {
    this._closeModal();
    this._shell = null;
  }
}

export default {
  id: 'periodic_table',
  icon: '⚛',
  group: 'nuclear',
  navKey: 'modules.periodic_table.navTitle',
  titleKey: 'modules.periodic_table.title',
  descKey: 'modules.periodic_table.desc',
  create: function (ctx) {
    return new PeriodicTableInstance(ctx);
  },
};
