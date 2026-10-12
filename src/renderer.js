// Renderer entry point. Boots i18n + fonts from config, then builds the shell.
// Fully offline: TF.js WASM from /dist, lang/fonts from local server, CSP blocks CDNs.
import './modules/common/canvasCompat.js'; // roundRect etc. for older Chrome
import { setupOfflineTf } from './tfSetup.js';
import { I18n } from './i18n.js';
import { Fonts } from './fonts.js';
import { Shell } from './shell.js';
import { browserApi } from './api.js';

setupOfflineTf();

// Provide the data layer the rest of the app expects (config/lang/font access).
window.api = browserApi;

async function boot() {
  const i18n = new I18n();
  const fonts = new Fonts();
  let config = { language: 'en', fontFamily: '', fontSize: 16 };
  if (window.api) {
    try { config = await window.api.getConfig(); } catch { /* defaults */ }
  }
  await i18n.init(config.language);
  await fonts.init();
  fonts.apply(config.fontFamily, config.fontSize);

  const shell = new Shell({ i18n, fonts, config });
  shell.build();
}

boot().then(() => {
  console.log('[boot] app ready');
}).catch((e) => {
  console.error('[boot] ERROR', e && e.stack || e);
  document.body.innerHTML =
    `<pre style="color:#f87171;padding:24px;font-family:monospace">Boot error:\n${e && e.stack || e}</pre>`;
});
