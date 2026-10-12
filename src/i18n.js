// Language loader. Reads external lang/<code>.json via the preload bridge so
// users can add languages without a rebuild. Falls back to a bundled English
// copy when the bridge is unavailable (e.g. opened in a plain browser).
import enBundled from '../lang/en.json';

export class I18n {
  constructor() {
    this.code = 'en';
    this.strings = enBundled;
    this.languages = [{ code: 'en', name: 'English' }];
  }

  async init(code) {
    if (window.api) {
      try {
        this.languages = await window.api.listLanguages();
      } catch { /* keep default */ }
    }
    await this.setLanguage(code || 'en');
  }

  async setLanguage(code) {
    let data = null;
    if (window.api) {
      try { data = await window.api.readLanguage(code); } catch { data = null; }
    }
    if (!data && code === 'en') data = enBundled;
    if (data) { this.code = code; this.strings = data; }
    return this.code;
  }

  // Dotted-key lookup with {placeholders}. `vars` may be an object of
  // {placeholder} substitutions, OR a plain string used as the fallback
  // text when the key is missing from the active language (many call
  // sites use `t(key, 'English default')` this way). Returns the key
  // itself if missing and no string fallback was given.
  t(key, vars) {
    let node = this.strings;
    for (const part of key.split('.')) {
      node = node && typeof node === 'object' ? node[part] : undefined;
    }
    const missing = typeof node !== 'string';
    let text = !missing ? node : (typeof vars === 'string' ? vars : key);
    if (vars && typeof vars === 'object') {
      for (const k of Object.keys(vars)) text = text.split(`{${k}}`).join(vars[k]);
    }
    return text;
  }
}
