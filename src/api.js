// Browser data layer — talks to the LOCAL static server's /api endpoints only
// (127.0.0.1 via serve.cjs). Never contacts the public internet. Reads lang/ +
// fonts/ + config.json so language/font can be switched without a rebuild.
// Every call fails soft so the app still boots (bundled English) if opened
// without the server (file://). Chrome 70+ friendly (no AbortController required).
export const browserApi = {
  async getConfig() {
    try { return await (await fetch('/api/config')).json(); }
    catch { return { language: 'en', fontFamily: '', fontSize: 16, hiddenModules: {}, sidebarCollapsed: true, exercisesEnabled: true, problemEditorEnabled: false, showPrinciple: false, showAiPanel: false, showKeyIdeas: false, exportEnabled: true, childProject: false }; }
  },
  async saveConfig(cfg) {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      return true;
    } catch { return false; }
  },
  async listLanguages() {
    try { return await (await fetch('/api/langs')).json(); }
    catch { return [{ code: 'en', name: 'English' }]; }
  },
  async readLanguage(code) {
    try { return await (await fetch('/lang/' + code + '.json')).json(); }
    catch { return null; }
  },
  async listFonts() {
    try { return await (await fetch('/api/fonts')).json(); }
    catch { return []; }
  },
  async listExportFolders() {
    try { return await (await fetch('/api/export/folders')).json(); }
    catch { return { ok: false, folders: [] }; }
  },
  async exportProject(payload) {
    try {
      return await (await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      })).json();
    } catch (e) {
      return { ok: false, error: 'Export failed — is the local server running (run.bat)?' };
    }
  },
};
