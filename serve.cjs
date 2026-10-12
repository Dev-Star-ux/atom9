// Tiny zero-dependency static server for the offline web app. Serves this
// folder to Google Chrome over http://localhost so that TensorFlow.js WASM and
// the external lang/ + fonts/ files load correctly (browsers block those over
// file://). Uses only Node built-ins — nothing to install. Fully offline.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { exportProject, knownFolders } = require('./tools/exportProject.cjs');

const APP_DIR = __dirname;
const LANG_DIR = path.join(APP_DIR, 'lang');
const FONTS_DIR = path.join(APP_DIR, 'fonts');
const CONFIG = path.join(APP_DIR, 'config.json');
const START_PORT = parseInt(process.env.PORT || '8123', 10);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.map': 'application/json',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return d; } };
const sendJSON = (res, obj) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

function isChildProject() {
  const cfg = readJSON(CONFIG, {});
  return cfg.childProject === true || cfg.exportEnabled === false;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () { resolve(body); });
    req.on('error', reject);
  });
}

function safeExerciseId(id) {
  return typeof id === 'string' && /^[a-z][a-z0-9_]{0,80}$/.test(id);
}

function clipStr(v, n) {
  return String(v == null ? '' : v).slice(0, n);
}

function sanitizeProblem(raw, i) {
  const type = raw && (raw.type === 'blank' || raw.type === 'calculation') ? raw.type : 'selection';
  const p = {
    id: clipStr(raw && raw.id, 40) || ('q' + (i + 1)),
    type: type,
    prompt: clipStr(raw && raw.prompt, 2000),
    explain: clipStr(raw && raw.explain, 2000),
  };
  if (type === 'selection') {
    const src = Array.isArray(raw.choices) ? raw.choices : [];
    const choices = [];
    for (let c = 0; c < src.length && c < 12; c++) choices.push(clipStr(src[c], 400));
    if (choices.length < 2) {
      while (choices.length < 2) choices.push('');
    }
    let ans = parseInt(raw.answer, 10);
    if (isNaN(ans) || ans < 0) ans = 0;
    if (ans >= choices.length) ans = 0;
    p.choices = choices;
    p.answer = ans;
  } else if (type === 'blank') {
    p.answer = clipStr(raw && raw.answer, 200);
    const acc = [];
    const src = Array.isArray(raw.accept) ? raw.accept : [];
    for (let a = 0; a < src.length && a < 20; a++) {
      const s = clipStr(src[a], 200);
      if (s) acc.push(s);
    }
    p.accept = acc;
  } else {
    const n = Number(raw && raw.answer);
    p.answer = isFinite(n) ? n : 0;
    const tol = Number(raw && raw.tolerance);
    p.tolerance = isFinite(tol) && tol >= 0 ? tol : 0;
    p.unit = clipStr(raw && raw.unit, 40);
  }
  return p;
}

function sanitizePack(data) {
  if (!data || !safeExerciseId(data.moduleId)) return null;
  const incoming = Array.isArray(data.problems) ? data.problems : [];
  const problems = [];
  for (let i = 0; i < incoming.length && i < 80; i++) {
    problems.push(sanitizeProblem(incoming[i] || {}, i));
  }
  return {
    moduleId: data.moduleId,
    title: clipStr(data.title, 200),
    problems: problems,
  };
}

function handleApi(req, res, url) {
  if (url.indexOf('/api/exercises/') === 0 && req.method === 'GET') {
    const id = url.slice('/api/exercises/'.length);
    if (!safeExerciseId(id)) {
      return sendJSON(res, { ok: false, error: 'Bad module id' });
    }
    const file = path.join(APP_DIR, 'exercises', id + '.json');
    if (!file.startsWith(path.join(APP_DIR, 'exercises'))) {
      return sendJSON(res, { ok: false, error: 'Bad path' });
    }
    if (!fs.existsSync(file)) {
      return sendJSON(res, { ok: true, missing: true, moduleId: id, title: '', problems: [] });
    }
    return sendJSON(res, Object.assign({ ok: true }, readJSON(file, { moduleId: id, title: '', problems: [] })));
  }
  if (url === '/api/exercises' && req.method === 'POST') {
    readBody(req).then(function (body) {
      try {
        if (body.length > 800000) {
          return sendJSON(res, { ok: false, error: 'File too large' });
        }
        const pack = sanitizePack(JSON.parse(body || '{}'));
        if (!pack) return sendJSON(res, { ok: false, error: 'Invalid exercise set' });
        const dir = path.join(APP_DIR, 'exercises');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, pack.moduleId + '.json');
        fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n', 'utf-8');
        sendJSON(res, { ok: true, pack: pack });
      } catch (e) {
        sendJSON(res, { ok: false, error: (e && e.message) || 'Save failed' });
      }
    }).catch(function () {
      res.writeHead(400);
      res.end('bad');
    });
    return;
  }
  if (url === '/api/config' && req.method === 'GET') {
    return sendJSON(res, readJSON(CONFIG, { language: 'en', fontFamily: '', fontSize: 15 }));
  }
  if (url === '/api/config' && req.method === 'POST') {
    readBody(req).then(function (body) {
      try {
        const incoming = JSON.parse(body);
        const prev = readJSON(CONFIG, {});
        // Never allow a child project to turn export back on via a partial save.
        if (prev.childProject || prev.exportEnabled === false) {
          incoming.childProject = true;
          incoming.exportEnabled = false;
        }
        fs.writeFileSync(CONFIG, JSON.stringify(incoming, null, 2), 'utf-8');
        sendJSON(res, { ok: true });
      } catch {
        res.writeHead(400);
        res.end('bad');
      }
    });
    return;
  }
  if (url === '/api/langs') {
    const out = [];
    try {
      for (const f of fs.readdirSync(LANG_DIR)) {
        if (!f.endsWith('.json')) continue;
        const code = f.replace(/\.json$/, '');
        const data = readJSON(path.join(LANG_DIR, f), {});
        out.push({ code, name: (data._meta && data._meta.name) || code });
      }
    } catch { /* none */ }
    return sendJSON(res, out);
  }
  if (url === '/api/fonts') {
    const out = [];
    try {
      for (const f of fs.readdirSync(FONTS_DIR)) {
        if (!/\.(ttf|otf|woff2?)$/i.test(f)) continue;
        out.push({ family: f.replace(/\.(ttf|otf|woff2?)$/i, ''), url: '/fonts/' + f });
      }
    } catch { /* none */ }
    return sendJSON(res, out);
  }
  if (url === '/api/export/folders' && req.method === 'GET') {
    if (isChildProject()) {
      return sendJSON(res, { ok: false, error: 'Export is disabled in this project', folders: [] });
    }
    return sendJSON(res, { ok: true, folders: knownFolders() });
  }
  if (url === '/api/export' && req.method === 'POST') {
    if (isChildProject()) {
      return sendJSON(res, { ok: false, error: 'Export is disabled in this project' });
    }
    readBody(req).then(async function (body) {
      try {
        const data = JSON.parse(body || '{}');
        const result = await exportProject({
          modules: data.modules || [],
          baseDir: data.baseDir || data.directory || '',
          projectName: data.projectName || 'Atomic_Physics_Export',
        });
        sendJSON(res, { ok: true, outDir: result.outDir, modules: result.modules });
      } catch (e) {
        sendJSON(res, { ok: false, error: (e && e.message) || String(e) });
      }
    }).catch(function () {
      res.writeHead(400);
      res.end('bad');
    });
    return;
  }
  res.writeHead(404); res.end('not found');
}

function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(APP_DIR, safe);
  if (!filePath.startsWith(APP_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  serveStatic(req, res, pathname);
});

function openChrome(url) {
  if (process.platform === 'win32') {
    const p = spawn('cmd', ['/c', 'start', 'chrome', url], { detached: true, stdio: 'ignore' });
    p.on('error', () => spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }));
  } else if (process.platform === 'darwin') {
    spawn('open', ['-a', 'Google Chrome', url]).on('error', () => spawn('open', [url]));
  } else {
    spawn('google-chrome', [url]).on('error', () => spawn('xdg-open', [url]));
  }
}

function listen(port, attemptsLeft) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && attemptsLeft > 0) listen(port + 1, attemptsLeft - 1);
    else { console.error(e); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Atomic Visual AI running at ${url}`);
    console.log('(Leave this window open. Close it to stop the app.)');
    if (!process.env.NO_OPEN) openChrome(url);
  });
}

listen(START_PORT, 15);
