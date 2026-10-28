/* Runs backend/Code.gs locally with stand-ins for the Apps Script services, as an HTTP server, so the student site
 * and dashboard can be tested end to end without deploying.
 *   node backend/mock_server.js [port]      → http://localhost:<port>/exec  (GET ?action=…, POST JSON)
 * Teacher key: "testkey". Data lives in memory (gone when it stops). Also serves the site itself from the repo
 * folder, so http://localhost:<port>/index.html works with js/config.js pointed at /exec (see tests/e2e.js). */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const PORT = +(process.argv[2] || 8790), ROOT = path.join(__dirname, '..');

/* ---- Apps Script stand-ins ---- */
const props = { TEACHER_KEY: 'testkey' }, cache = new Map(), drive = { files: new Map(), folders: new Map() }, uploads = new Map();
let uid = 0; const id = () => 'id' + (++uid) + crypto.randomBytes(3).toString('hex');
function Sheet(name) { this.name = name; this.data = []; }
Sheet.prototype = {
  appendRow(r) { this.data.push(r.slice()); },
  getLastRow() { return this.data.length; },
  setFrozenRows() {}, deleteRow(r) { this.data.splice(r - 1, 1); },
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    return {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.data[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      getValue() { return this.getValues()[0][0]; },
      setValues(v) { for (let i = 0; i < v.length; i++) { const k = r - 1 + i; while (sh.data.length <= k) sh.data.push([]); for (let j = 0; j < v[i].length; j++) sh.data[k][c - 1 + j] = v[i][j]; } },
      setValue(v) { this.setValues([[v]]); }, setFontWeight() { return this; }
    };
  }
};
const book = { sheets: {}, getId: () => 'sheet1', getUrl: () => 'http://mock/sheet', getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { return (this.sheets[n] = new Sheet(n)); }, getSheets() { return Object.values(this.sheets); }, deleteSheet() {} };
function Folder(name) { this.id = id(); this.name = name; drive.folders.set(this.id, this); }
Folder.prototype = { getId() { return this.id; }, getUrl() { return 'http://mock/folder/' + this.id; }, createFolder(n) { const f = new Folder(n); f.parent = this.id; return f; },
  getFoldersByName(n) { const list = [...drive.folders.values()].filter(f => f.parent === this.id && f.name === n); let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; } };
const bytesOf = b => Array.from(b).map(x => (x > 127 ? x - 256 : x));
const g = {
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cache.get(k) || null, put: (k, v) => { if (String(v).length > 100000) throw new Error('too big'); cache.set(k, v); }, remove: k => cache.delete(k) }) },
  SpreadsheetApp: { create: () => book, openById: () => book },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Logger: { log: m => console.log('[log]', m) },
  ScriptApp: { getOAuthToken: () => 'tok' },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: (a, s) => bytesOf(crypto.createHash('sha256').update(s).digest()),
    computeHmacSha256Signature: (s, k) => bytesOf(crypto.createHmac('sha256', k).update(s).digest()),
    base64EncodeWebSafe: b => Buffer.from(b.map(x => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64Encode: b => Buffer.from(b.map(x => x & 255)).toString('base64'),
    base64Decode: s => bytesOf(Buffer.from(s, 'base64')),
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => d.toISOString().slice(5, 16).replace('T', ' ')
  },
  ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'js' }, createTextOutput: t => ({ t, setMimeType(m) { this.m = m; return this; } }) },
  DriveApp: {
    createFolder: n => new Folder(n), getFolderById: i => { const f = drive.folders.get(i); if (!f) throw new Error('no folder'); return f; },
    getFileById: i => { const f = drive.files.get(i); if (!f) throw new Error('no file'); return { getMimeType: () => f.mime, getSize: () => f.bytes.length, getName: () => f.name, getUrl: () => 'http://mock/file/' + i, getBlob: () => ({ getBytes: () => bytesOf(f.bytes), getDataAsString: () => f.bytes.toString('utf8') }) }; }
  },
  UrlFetchApp: {
    fetch(url, o) {
      const hdr = o.headers || {};
      if (/uploadType=resumable/.test(url)) { const meta = JSON.parse(o.payload), u = 'http://mock/upload/' + id(); uploads.set(u, { meta, size: +hdr['X-Upload-Content-Length'], chunks: [], got: 0 }); return resp(200, '', { Location: u }); }
      if (uploads.has(url)) {
        const up = uploads.get(url), m = /bytes (\d+)-(\d+)\/(\d+)/.exec(hdr['Content-Range']), buf = Buffer.from(o.payload.map(x => x & 255));
        if (+m[1] !== up.got) return resp(400, 'bad offset');
        up.chunks.push(buf); up.got += buf.length;
        if (up.got < up.size) return resp(308, '');
        const fid = id(); drive.files.set(fid, { name: up.meta.name, mime: up.meta.mimeType, bytes: Buffer.concat(up.chunks) });
        return resp(200, JSON.stringify({ id: fid, name: up.meta.name }));
      }
      return resp(200, '{}');
    }
  }
};
function resp(code, text, headers) { return { getResponseCode: () => code, getContentText: () => text, getAllHeaders: () => headers || {}, getHeaders: () => headers || {} }; }
const ctx = vm.createContext(Object.assign({ console, JSON, Date, Math, Object, Array, String, Number, RegExp, Error }, g));
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
vm.runInContext('setup()', ctx);
global.MOCK = { props, drive, book };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/exec') {
    const send = out => { res.writeHead(200, { 'Content-Type': out.m === 'js' ? 'text/javascript' : 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(out.t); };
    if (req.method === 'GET') { const p = Object.fromEntries(u.searchParams); return send(ctx.doGet({ parameter: p })); }
    if (req.method === 'POST') { let b = ''; req.on('data', d => (b += d)); req.on('end', () => send(ctx.doPost({ postData: { contents: b } }))); return; }
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
  }
  let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  let body = fs.readFileSync(f);
  if (f.endsWith(path.join('js', 'config.js'))) body = Buffer.from(body.toString().replace(/backend: '[^']*'/, "backend: 'http://localhost:" + PORT + "/exec'"));
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(body);
}).listen(PORT, () => console.log('mock backend + site on http://localhost:' + PORT));
