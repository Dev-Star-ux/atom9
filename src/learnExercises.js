// Learn + Exercises modals (header buttons). Content from /learn/*.html and /exercises/*.json.
import { el } from './modules/common/ui.js';

function normBlank(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/θ/g, 'theta')
    .replace(/φ|ϕ/g, 'phi')
    .replace(/λ/g, 'lambda')
    .replace(/ħ/g, 'hbar');
}

function nearlyEqual(a, b, tol) {
  const t = tol != null ? tol : Math.max(1e-9, Math.abs(b) * 0.02);
  return Math.abs(Number(a) - Number(b)) <= t;
}

export class LearnExercisesController {
  constructor(shell) {
    this.shell = shell;
    this._overlay = null;
    this._panel = null;
  }

  t(k, v) {
    return this.shell.t(k, v);
  }

  currentModuleId() {
    return this.shell.active && this.shell.active.module
      ? this.shell.active.module.id
      : null;
  }

  openLearn() {
    const id = this.currentModuleId();
    if (!id) return;
    this._openModal(this.t('learn.title'), 'learn');
    const body = this._body;
    body.innerHTML = '';
    body.appendChild(el('p', 'le-loading', this.t('learn.loading')));
    const self = this;
    fetch('/learn/' + id + '.html')
      .then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.text();
      })
      .then(function (html) {
        body.innerHTML = '';
        const frame = el('iframe', 'le-iframe');
        frame.setAttribute('title', self.t('learn.title'));
        frame.srcdoc = html;
        body.appendChild(frame);
      })
      .catch(function () {
        body.innerHTML = '';
        body.appendChild(el('p', 'le-error', self.t('learn.missing')));
      });
  }

  openExercises() {
    if (!this.shell.config.exercisesEnabled) return;
    const id = this.currentModuleId();
    if (!id) return;
    this._openModal(this.t('exercises.title'), 'exercises');
    const body = this._body;
    body.innerHTML = '';
    body.appendChild(el('p', 'le-loading', this.t('exercises.loading')));
    const self = this;
    fetch('/exercises/' + id + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.json();
      })
      .then(function (data) {
        self._renderExercises(data);
      })
      .catch(function () {
        body.innerHTML = '';
        body.appendChild(el('p', 'le-error', self.t('exercises.missing')));
      });
  }

  _openModal(title, kind) {
    this.close();
    const overlay = el('div', 'overlay le-overlay');
    const panel = el('div', 'le-modal');
    panel.setAttribute('data-kind', kind || '');

    const head = el('div', 'le-modal-head');
    const titleWrap = el('div', 'le-modal-title-wrap');
    const badge = el('span', 'le-modal-badge', kind === 'exercises' ? this.t('nav.exercises') : this.t('nav.learn'));
    titleWrap.appendChild(badge);
    titleWrap.appendChild(el('div', 'le-modal-title', title));
    head.appendChild(titleWrap);

    const close = el('button', 'le-close');
    close.type = 'button';
    close.setAttribute('aria-label', this.t('common.close') || 'Close');
    close.innerHTML = '<span aria-hidden="true">&times;</span>';
    const self = this;
    close.onclick = function () { self.close(); };
    head.appendChild(close);
    panel.appendChild(head);

    this._body = el('div', 'le-modal-body');
    panel.appendChild(this._body);
    overlay.appendChild(panel);
    overlay.onclick = function (e) {
      if (e.target === overlay) self.close();
    };
    document.addEventListener('keydown', this._onKey = function (e) {
      if (e.key === 'Escape') self.close();
    });
    this.shell.root.appendChild(overlay);
    this._overlay = overlay;
    this._panel = panel;
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
    this._panel = null;
    this._body = null;
  }

  _renderExercises(data) {
    const body = this._body;
    body.innerHTML = '';
    if (data.title) body.appendChild(el('p', 'le-sub', data.title));
    body.appendChild(el('p', 'le-hint', this.t('exercises.hint')));

    const list = el('div', 'le-problems');
    const problems = data.problems || [];
    for (let i = 0; i < problems.length; i++) {
      list.appendChild(this._problemCard(problems[i], i + 1));
    }
    body.appendChild(list);
  }

  _problemCard(p, num) {
    const card = el('div', 'le-problem');
    const typeLabel =
      p.type === 'selection' ? this.t('exercises.typeSelection')
        : p.type === 'blank' ? this.t('exercises.typeBlank')
          : this.t('exercises.typeCalc');
    card.appendChild(el('div', 'le-prob-type', typeLabel));
    card.appendChild(el('div', 'le-prob-prompt', num + '. ' + (p.prompt || '')));

    const answerBox = el('div', 'le-answer hidden');
    answerBox.appendChild(el('div', 'le-answer-label', this.t('exercises.answer')));
    let answerText = '';
    if (p.type === 'selection') {
      const idx = p.answer;
      answerText = (p.choices && p.choices[idx] != null) ? p.choices[idx] : String(idx);
    } else if (p.type === 'blank') {
      answerText = String(p.answer);
    } else {
      answerText = String(p.answer) + (p.unit ? ' ' + p.unit : '');
    }
    answerBox.appendChild(el('div', 'le-answer-val', answerText));
    if (p.explain) answerBox.appendChild(el('p', 'le-explain', p.explain));

    const feedback = el('div', 'le-feedback');

    if (p.type === 'selection') {
      const choices = el('div', 'le-choices');
      let selected = -1;
      const btns = [];
      for (let c = 0; c < (p.choices || []).length; c++) {
        const b = el('button', 'le-choice', p.choices[c]);
        b.type = 'button';
        b.onclick = (function (idx, btn) {
          return function () {
            selected = idx;
            for (let k = 0; k < btns.length; k++) btns[k].classList.remove('selected');
            btn.classList.add('selected');
            feedback.textContent = '';
            feedback.className = 'le-feedback';
          };
        })(c, b);
        btns.push(b);
        choices.appendChild(b);
      }
      card.appendChild(choices);
      card.appendChild(this._actionRow(function () {
        if (selected < 0) {
          feedback.textContent = this.t('exercises.pickFirst');
          feedback.className = 'le-feedback warn';
          return;
        }
        const ok = selected === p.answer;
        feedback.textContent = ok ? this.t('exercises.correct') : this.t('exercises.incorrect');
        feedback.className = 'le-feedback ' + (ok ? 'ok' : 'bad');
      }.bind(this), function () {
        answerBox.classList.remove('hidden');
      }));
    } else if (p.type === 'blank') {
      const input = el('input', 'le-input');
      input.type = 'text';
      input.placeholder = this.t('exercises.blankPlaceholder');
      card.appendChild(input);
      card.appendChild(this._actionRow(function () {
        const got = normBlank(input.value);
        const accept = (p.accept || [p.answer]).map(normBlank);
        let ok = false;
        for (let i = 0; i < accept.length; i++) {
          if (got === accept[i]) { ok = true; break; }
        }
        feedback.textContent = ok ? this.t('exercises.correct') : this.t('exercises.incorrect');
        feedback.className = 'le-feedback ' + (ok ? 'ok' : 'bad');
      }.bind(this), function () {
        answerBox.classList.remove('hidden');
      }));
    } else {
      const row = el('div', 'le-calc-row');
      const input = el('input', 'le-input');
      input.type = 'number';
      input.step = 'any';
      input.placeholder = this.t('exercises.calcPlaceholder');
      row.appendChild(input);
      if (p.unit) row.appendChild(el('span', 'le-unit', p.unit));
      card.appendChild(row);
      card.appendChild(this._actionRow(function () {
        const val = parseFloat(input.value);
        if (isNaN(val)) {
          feedback.textContent = this.t('exercises.pickFirst');
          feedback.className = 'le-feedback warn';
          return;
        }
        const ok = nearlyEqual(val, p.answer, p.tolerance);
        feedback.textContent = ok ? this.t('exercises.correct') : this.t('exercises.incorrect');
        feedback.className = 'le-feedback ' + (ok ? 'ok' : 'bad');
      }.bind(this), function () {
        answerBox.classList.remove('hidden');
      }));
    }

    card.appendChild(feedback);
    card.appendChild(answerBox);
    return card;
  }

  _actionRow(onCheck, onReveal) {
    const row = el('div', 'le-actions');
    const check = el('button', 'le-btn', this.t('exercises.check'));
    check.type = 'button';
    check.onclick = onCheck;
    const reveal = el('button', 'le-btn secondary', this.t('exercises.showAnswer'));
    reveal.type = 'button';
    reveal.onclick = onReveal;
    row.appendChild(check);
    row.appendChild(reveal);
    return row;
  }
}
