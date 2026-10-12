// Font loader. Registers @font-face rules for any font files found in fonts/
// (via the preload bridge) and applies the chosen family + size to the app.
export class Fonts {
  constructor() { this.available = []; this._styleEl = null; }

  async init() {
    if (window.api) {
      try { this.available = await window.api.listFonts(); } catch { this.available = []; }
    }
    // inject @font-face for each discovered font
    if (this.available.length) {
      const css = this.available.map(f =>
        `@font-face{font-family:"${f.family}";src:url("${f.url}");font-display:swap;}`
      ).join('\n');
      this._styleEl = document.createElement('style');
      this._styleEl.textContent = css;
      document.head.appendChild(this._styleEl);
    }
    return this.available;
  }

  apply(family, size) {
    const stack = family
      ? '"' + family + '", system-ui, -apple-system, Segoe UI, sans-serif'
      : 'system-ui, -apple-system, Segoe UI, sans-serif';
    document.documentElement.style.setProperty('--font', stack);
    document.documentElement.style.setProperty('--font-size', `${size || 16}px`);
  }
}
