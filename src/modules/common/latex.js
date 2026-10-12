/** Offline LaTeX via KaTeX (bundled; CSS/fonts from /vendor/katex/). */
import katex from 'katex';

/** True if string should be rendered as math (not plain prose). */
export function looksLikeLatex(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (/^\$\$[\s\S]*\$\$$/.test(t)) return true;
  if (/^\$[^$]+\$/.test(t)) return true;
  if (/^\\\([\s\S]*\\\)$/.test(t)) return true;
  if (/^\\\[[\s\S]*\\\]$/.test(t)) return true;
  // Raw TeX commands / math markup common in this app
  if (/\\[a-zA-Z]+/.test(t)) return true;
  if (/[_^]\{/.test(t)) return true;
  if (/[_^]/.test(t) && /[=+\-]/.test(t)) return true;
  // Compact physics identities: E = hf, v = E/B, …
  if (/^[A-Za-z0-9\\{}^_+\-./\\s,;:()]+$/.test(t) && /=/.test(t) && t.length < 120) return true;
  if (/[=+\-*/<>≤≥≈∝]/.test(t) && /[₀₁₂₃₄₅₆₇₈₉ⁿₘₐₑᵢₒᵤ]|_|\^|\\/.test(t)) return true;
  return false;
}

function stripDelimiters(tex) {
  let t = String(tex).trim();
  if (/^\$\$[\s\S]*\$\$$/.test(t)) return { tex: t.slice(2, -2).trim(), display: true };
  if (/^\\\[[\s\S]*\\\]$/.test(t)) return { tex: t.slice(2, -2).trim(), display: true };
  if (/^\$[^$]*\$$/.test(t)) return { tex: t.slice(1, -1).trim(), display: false };
  if (/^\\\([\s\S]*\\\)$/.test(t)) return { tex: t.slice(2, -2).trim(), display: false };
  return { tex: t, display: true };
}

/**
 * Render LaTeX into an element. Falls back to plain text if not math-like or on error.
 * @returns {boolean} whether KaTeX rendered successfully
 */
export function renderLatex(el, tex, opts) {
  if (!el) return false;
  const options = opts || {};
  const raw = tex == null ? '' : String(tex);
  if (!raw.trim()) {
    el.textContent = '';
    return false;
  }
  if (!options.force && !looksLikeLatex(raw)) {
    el.textContent = raw;
    el.classList.add('eq-plain');
    return false;
  }
  const parsed = stripDelimiters(raw);
  try {
    katex.render(parsed.tex, el, {
      throwOnError: false,
      displayMode: options.display != null ? !!options.display : parsed.display,
      strict: 'ignore',
      trust: false,
      output: 'html',
    });
    el.classList.remove('eq-plain');
    el.classList.add('eq-latex');
    return true;
  } catch (e) {
    el.textContent = raw;
    el.classList.add('eq-plain');
    return false;
  }
}

/** Create a block equation element with KaTeX (or plain fallback). */
export function equationEl(tex, className) {
  const box = document.createElement('div');
  box.className = className || 'equation';
  renderLatex(box, tex, { display: true, force: true });
  return box;
}

/** Inline math span. */
export function inlineMath(tex) {
  const span = document.createElement('span');
  span.className = 'eq-inline';
  renderLatex(span, tex, { display: false, force: true });
  return span;
}
