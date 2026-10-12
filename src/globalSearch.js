// Global Search — finds experiments + learn/exercise text among Settings-visible modules only.
import { el } from './modules/common/ui.js';
import { NAV_GROUPS } from './modules/registry.js';

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function snippetAround(text, query, radius) {
  const t = String(text || '');
  const q = norm(query);
  if (!q) return t.slice(0, radius * 2);
  const lower = t.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return t.slice(0, radius * 2) + (t.length > radius * 2 ? '…' : '');
  const start = Math.max(0, idx - radius);
  const end = Math.min(t.length, idx + q.length + radius);
  return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
}

function tSafe(shell, key) {
  const v = shell.t(key);
  return (!v || v === key) ? '' : v;
}

function groupTitleKey(groupId) {
  for (let i = 0; i < NAV_GROUPS.length; i++) {
    if (NAV_GROUPS[i].id === groupId) return NAV_GROUPS[i].titleKey;
  }
  return null;
}

export class GlobalSearchController {
  constructor(shell) {
    this.shell = shell;
    this._overlay = null;
    this._contentCache = {};
    this._entries = [];
  }

  t(k, v) {
    return this.shell.t(k, v);
  }

  invalidateExercises(id) {
    const cache = this._contentCache[id];
    if (!cache) return;
    cache.exFetched = false;
    cache.exercises = '';
  }

  open() {
    this.close();
    if (this.shell.learnEx) this.shell.learnEx.close();

    const self = this;
    const overlay = el('div', 'overlay gs-overlay');
    const panel = el('div', 'gs-modal');

    const head = el('div', 'gs-modal-head');
    head.appendChild(el('div', 'gs-modal-title', this.t('search.title')));
    const close = el('button', 'gs-close');
    close.type = 'button';
    close.setAttribute('aria-label', this.t('common.close') || 'Close');
    close.innerHTML = '<span aria-hidden="true">&times;</span>';
    close.onclick = function () { self.close(); };
    head.appendChild(close);
    panel.appendChild(head);

    const body = el('div', 'gs-modal-body');
    this._scope = el('p', 'gs-scope');
    body.appendChild(this._scope);

    const inputWrap = el('div', 'gs-input-wrap');
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'gs-input';
    input.placeholder = this.t('search.placeholder');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    inputWrap.appendChild(input);
    body.appendChild(inputWrap);

    this._results = el('div', 'gs-results');
    body.appendChild(this._results);
    panel.appendChild(body);

    overlay.appendChild(panel);
    overlay.onclick = function (e) {
      if (e.target === overlay) self.close();
    };
    document.addEventListener('keydown', this._onKey = function (e) {
      if (e.key === 'Escape') self.close();
    });
    this.shell.root.appendChild(overlay);
    this._overlay = overlay;
    this._input = input;

    this._buildIndex();
    this._render('');
    input.oninput = function () { self._render(input.value); };
    input.onkeydown = function (e) {
      if (e.key === 'Enter') {
        const first = self._results.querySelector('.gs-hit');
        if (first) first.click();
      }
    };
    setTimeout(function () { input.focus(); }, 30);
    this._enrichContent();
  }

  close() {
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._input = null;
    this._results = null;
    this._scope = null;
  }

  _visible() {
    return this.shell.getVisibleModules();
  }

  _buildIndex() {
    const vis = this._visible();
    const entries = [];
    for (let i = 0; i < vis.length; i++) {
      const m = vis[i];
      const prefix = 'modules.' + m.id;
      const nav = this.t(m.navKey);
      const title = this.t(m.titleKey);
      const desc = this.t(m.descKey);
      const principle = tSafe(this.shell, prefix + '.principle.desc');
      const observe = tSafe(this.shell, prefix + '.principle.observe');
      const equation = tSafe(this.shell, prefix + '.principle.equation');
      const pageDesc = tSafe(this.shell, prefix + '.pageDesc');
      const gKey = groupTitleKey(m.group);
      const groupLabel = gKey ? this.t(gKey) : '';
      const cached = this._contentCache[m.id] || {};
      const hay = [
        m.id, nav, title, desc, pageDesc, principle, observe, equation, groupLabel,
        cached.learn || '', cached.exercises || '',
      ].join(' \n ');
      entries.push({
        id: m.id,
        icon: m.icon || '•',
        nav: nav,
        title: title,
        desc: desc,
        groupLabel: groupLabel,
        meta: [pageDesc, principle, observe, equation].filter(Boolean).join(' '),
        hay: hay,
        learn: cached.learn || '',
        exercises: cached.exercises || '',
      });
    }
    this._entries = entries;
    if (this._scope) {
      this._scope.textContent = this.t('search.scope', { n: String(vis.length) });
    }
  }

  _enrichContent() {
    const self = this;
    const vis = this._visible();
    let pending = 0;
    let changed = false;

    function doneOne() {
      pending -= 1;
      if (pending <= 0 && changed && self._overlay && self._input) {
        self._buildIndex();
        self._render(self._input.value);
      }
    }

    for (let i = 0; i < vis.length; i++) {
      const id = vis[i].id;
      const cache = this._contentCache[id] || (this._contentCache[id] = {});
      if (!cache.learnFetched) {
        cache.learnFetched = true;
        pending += 1;
        fetch('/learn/' + id + '.html')
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (html) {
            const text = stripHtml(html);
            if (text && text !== cache.learn) {
              cache.learn = text;
              changed = true;
            }
          })
          .catch(function () { /* offline / missing ok */ })
          .then(doneOne);
      }
      if (!cache.exFetched) {
        cache.exFetched = true;
        pending += 1;
        fetch('/exercises/' + id + '.json')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data) return;
            const bits = [];
            if (data.title) bits.push(data.title);
            const probs = data.problems || [];
            for (let p = 0; p < probs.length; p++) {
              const pr = probs[p];
              if (pr.prompt) bits.push(pr.prompt);
              if (pr.explain) bits.push(pr.explain);
              if (pr.choices) bits.push(pr.choices.join(' '));
            }
            const text = bits.join(' ');
            if (text && text !== cache.exercises) {
              cache.exercises = text;
              changed = true;
            }
          })
          .catch(function () { /* missing ok */ })
          .then(doneOne);
      }
    }
  }

  _matchKind(entry, q) {
    const ql = norm(q);
    if (!ql) return { kind: 'experiment', snippet: entry.desc || entry.title, score: 0 };
    const fields = [
      { kind: 'experiment', text: entry.nav + ' ' + entry.title + ' ' + entry.desc, weight: 40 },
      { kind: 'experiment', text: entry.id + ' ' + entry.groupLabel + ' ' + (entry.meta || ''), weight: 22 },
      { kind: 'learn', text: entry.learn, weight: 15 },
      { kind: 'exercise', text: entry.exercises, weight: 12 },
    ];
    let best = null;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.text) continue;
      const lower = f.text.toLowerCase();
      const idx = lower.indexOf(ql);
      if (idx < 0) continue;
      let score = f.weight;
      if (norm(entry.nav) === ql || norm(entry.title) === ql || entry.id === ql) score += 100;
      else if (norm(entry.nav).indexOf(ql) === 0 || norm(entry.title).indexOf(ql) === 0) score += 50;
      else if (idx < 24) score += 10;
      if (!best || score > best.score) {
        best = {
          kind: f.kind,
          score: score,
          snippet: snippetAround(f.text, q, 56),
        };
      }
    }
    return best;
  }

  _render(query) {
    if (!this._results) return;
    const self = this;
    const q = String(query || '').trim();
    this._results.innerHTML = '';

    const hits = [];
    for (let i = 0; i < this._entries.length; i++) {
      const e = this._entries[i];
      if (!q) {
        hits.push({
          entry: e,
          kind: 'experiment',
          snippet: e.desc || e.title,
          score: 0,
        });
        continue;
      }
      const m = this._matchKind(e, q);
      if (m) hits.push({ entry: e, kind: m.kind, snippet: m.snippet, score: m.score });
    }

    if (q) {
      hits.sort(function (a, b) { return b.score - a.score || a.entry.nav.localeCompare(b.entry.nav); });
    } else {
      hits.sort(function (a, b) { return a.entry.nav.localeCompare(b.entry.nav); });
    }

    if (!hits.length) {
      this._results.appendChild(el('p', 'gs-empty', this.t('search.empty')));
      return;
    }

    if (!q) {
      this._results.appendChild(el('p', 'gs-hint', this.t('search.hint')));
    }

    const limit = q ? hits.length : Math.min(hits.length, 40);
    for (let i = 0; i < limit; i++) {
      const hit = hits[i];
      const e = hit.entry;
      const row = el('button', 'gs-hit');
      row.type = 'button';

      const top = el('div', 'gs-hit-top');
      top.appendChild(el('span', 'gs-hit-icon', e.icon));
      const titles = el('div', 'gs-hit-titles');
      titles.appendChild(el('div', 'gs-hit-name', e.nav));
      if (e.groupLabel) titles.appendChild(el('div', 'gs-hit-group', e.groupLabel));
      top.appendChild(titles);

      const badgeKey =
        hit.kind === 'learn' ? 'search.typeLearn'
          : hit.kind === 'exercise' ? 'search.typeExercise'
            : 'search.typeExperiment';
      top.appendChild(el('span', 'gs-hit-badge gs-hit-badge-' + hit.kind, this.t(badgeKey)));
      row.appendChild(top);

      if (hit.snippet) {
        const sn = el('div', 'gs-hit-snippet');
        sn.textContent = hit.snippet;
        row.appendChild(sn);
      }

      row.onclick = (function (id, kind) {
        return function () {
          self.close();
          self.shell.switchTo(id);
          if (kind === 'learn' && self.shell.learnEx) {
            setTimeout(function () { self.shell.learnEx.openLearn(); }, 40);
          } else if (kind === 'exercise' && self.shell.learnEx && self.shell.config.exercisesEnabled !== false) {
            setTimeout(function () { self.shell.learnEx.openExercises(); }, 40);
          }
        };
      })(e.id, hit.kind);

      this._results.appendChild(row);
    }
  }
}
