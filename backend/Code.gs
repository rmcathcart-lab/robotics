/* ============================================================
 * Robotics Lab — class records (Google Apps Script backend)
 * ------------------------------------------------------------
 * Deployed as a web app (Execute as: me · Who has access: Anyone). It only stores data: the student site and the
 * teacher dashboard are static pages on GitHub Pages (https://rmcathcart-lab.github.io/robotics/).
 *
 * Run setup() once from the editor: it creates the "Robotics Lab Records" spreadsheet, the "Robotics Lab Submissions"
 * Drive folder and a teacher key, and logs all three.
 *
 * Sheets:  Roster       one row per student: class, name, PIN (salted hash), first/last seen, devices, failed tries,
 *                       PowerSchool student number, pronouns and IPP (for report card comments), course level (15/25/35)
 *          Progress     one row per student per mission: steps done + the saved mission state (answers, checkpoints)
 *          Submissions  one row per student per mission: files (Google Drive ids), reflections, grade, feedback
 * Script properties: SHEET_ID, FOLDER_ID, TEACHER_KEY, SECRET, CLASSES, CAL:<class> (or CAL:* when calendars are
 *   synced), CALSYNC, NOSCHOOL, EQUIP (the teacher's product links). "Who is on right now" lives in the script cache.
 * Uploads: the student's browser sends a file in 4 MiB pieces; each piece is passed on to Google Drive's resumable
 *   upload, so videos far bigger than one request can hold still arrive as a single Drive file.
 * ============================================================ */

var COLS = {
  Roster: ['class', 'name', 'pin', 'pinSet', 'firstSeen', 'lastSeen', 'devices', 'fails', 'lockUntil', 'num', 'pronouns', 'ipp', 'level'],
  Progress: ['key', 'class', 'name', 'mission', 'stepsDone', 'step', 'updated', 'state'],
  Submissions: ['id', 'class', 'name', 'mission', 'version', 'submitted', 'files', 'reflections', 'checks', 'thumbs', 'status', 'levels', 'comment', 'gradedAt', 'history']
};
var TZ = 'America/Edmonton';

/* ---------------- plumbing ---------------- */
function props_() { return PropertiesService.getScriptProperties(); }
function cache_() { return CacheService.getScriptCache(); }
function ss_() {
  var id = props_().getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = SpreadsheetApp.create('Robotics Lab Records'); props_().setProperty('SHEET_ID', ss.getId());
  return ss;
}
var SHEETS_ = {};
function sheet_(name) {
  if (SHEETS_[name]) return SHEETS_[name];
  var ss = ss_(), sh = ss.getSheetByName(name), cols = COLS[name];
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(cols); sh.setFrozenRows(1); sh.getRange(1, 1, 1, cols.length).setFontWeight('bold'); }
  else if (sh.getLastColumn() < cols.length) sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); // a newer version added columns
  return (SHEETS_[name] = sh);
}
function rows_(name) { var sh = sheet_(name), n = sh.getLastRow() - 1; return n > 0 ? sh.getRange(2, 1, n, COLS[name].length).getValues() : []; }
function json_(obj, cb) {
  var txt = JSON.stringify(obj);
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + txt + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
function norm_(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
function clean_(s, max) { s = String(s == null ? '' : s).replace(/[<>]/g, ' ').replace(/[ \t]+/g, ' ').trim(); if (s.length > max) s = s.slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function cleanText_(s, max) { s = String(s == null ? '' : s).replace(/\r/g, ''); if (s.length > max) s = s.slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function parse_(s, dflt) { try { var v = JSON.parse(s); return v == null ? dflt : v; } catch (e) { return dflt; } }
function list_(p) { return parse_(props_().getProperty(p) || 'null', null); }
function save_(p, v) { props_().setProperty(p, JSON.stringify(v)); }
function teacherKey_() { return props_().getProperty('TEACHER_KEY') || ''; }
function secret_() { var s = props_().getProperty('SECRET'); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty('SECRET', s); } return s; }
function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function hashPin_(klass, name, pin) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secret_() + '|' + norm_(klass) + '|' + norm_(name) + '|' + pin)); }
function token_(klass, name, pinHash) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(norm_(klass) + '|' + norm_(name) + '|' + pinHash, secret_())).slice(0, 24); }
function ms_(v) { return v instanceof Date ? v.getTime() : (v ? new Date(v).getTime() || 0 : 0); }
function cget_(k) { try { var v = cache_().get(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function cput_(k, v, ttl) { try { cache_().put(k, JSON.stringify(v), ttl || 21600); } catch (e) {} }

function setup() {
  var ss = ss_(); Object.keys(COLS).forEach(function (n) { sheet_(n); });
  var s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  if (!teacherKey_()) props_().setProperty('TEACHER_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  secret_(); var f = folder_();
  // touch UrlFetchApp so the editor asks for permission to talk to Google Drive's upload service
  try { UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }); } catch (e) {}
  Logger.log('Records spreadsheet: ' + ss.getUrl());
  Logger.log('Submissions folder: ' + f.getUrl());
  Logger.log('Teacher key: ' + teacherKey_());
}

/* ---------------- classes and rosters ---------------- */
function classes_() { var c = list_('CLASSES'); return Array.isArray(c) ? c : []; } // [{ code, label }]
function classOf_(code) { var k = norm_(code), c = classes_(); for (var i = 0; i < c.length; i++) if (c[i].code === k) return c[i]; return null; }
function rosterRows_(klass) { var k = norm_(klass); return rows_('Roster').map(function (r, i) { return { row: i + 2, v: r }; }).filter(function (x) { return norm_(x.v[0]) === k; }); }
function findStudent_(klass, name) { var n = norm_(name), rs = rosterRows_(klass); for (var i = 0; i < rs.length; i++) if (norm_(rs[i].v[1]) === n) return rs[i]; return null; }

/* ---------------- reads (GET) ---------------- */
function doGet(e) {
  var p = (e && e.parameter) || {}, cb = p.callback || '';
  try {
    var a = p.action || 'ping';
    if (a === 'ping') return json_({ ok: true, t: Date.now() }, cb);
    if (a === 'roster') return json_(roster_(p['class']), cb);
    if (a === 'setpin') return json_(setPin_(p['class'], p.name, p.pin, p.device), cb);
    if (a === 'signin') return json_(signIn_(p['class'], p.name, p.pin, p.device), cb);
    if (a === 'me') return json_(me_(p['class'], p.name, p.token), cb);
    if (a === 'cal') return json_({ ok: true, cal: cal_(p['class']), noSchool: noSchool_() }, cb);
    if (!teacherKey_() || p.key !== teacherKey_()) return json_({ ok: false, error: 'bad key' }, cb);
    if (a === 'classes') return json_(classList_(), cb);
    if (a === 'dash') return json_(dash_(p['class']), cb);
    if (a === 'live') return json_({ ok: true, live: live_(p['class']), now: Date.now() }, cb);
    if (a === 'sub') return json_(subDetail_(p.id), cb);
    if (a === 'file') return json_(fileData_(p.id), cb);
    if (a === 'resetpin') return json_(resetPin_(p['class'], p.name), cb);
    if (a === 'removestudent') return json_(removeStudent_(p['class'], p.name), cb);
    if (a === 'rename') return json_(rename_(p['class'], p.name, p.to), cb);
    if (a === 'delclass') return json_(delClass_(p['class']), cb);
    if (a === 'calsync') { props_().setProperty('CALSYNC', p.on === '1' ? '1' : '0'); return json_({ ok: true, sync: p.on === '1' }, cb); }
    return json_({ ok: false, error: 'unknown action' }, cb);
  } catch (err) { return json_({ ok: false, error: String(err) }, cb); }
}

function roster_(klass) {
  var c = classOf_(klass); if (!c) return { ok: false, error: 'unknown class' };
  var names = rosterRows_(klass).map(function (x) { return { name: String(x.v[1]), pin: !!x.v[2] }; });
  names.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return { ok: true, code: c.code, show: c.code, label: c.label || c.code, names: names };
}
function addDevice_(st, device) {
  var d = parse_(st.v[6] || '[]', []);
  if (device && d.indexOf(String(device).slice(0, 40)) < 0) { d.push(String(device).slice(0, 40)); if (d.length > 12) d = d.slice(-12); }
  return JSON.stringify(d);
}
function setPin_(klass, name, pin, device) {
  if (!/^\d{4}$/.test(String(pin || ''))) return { ok: false, error: 'badpin' };
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var st = findStudent_(klass, name); if (!st) return { ok: false, error: 'unknown student' };
    if (st.v[2]) return { ok: false, error: 'haspin' };
    var h = hashPin_(klass, st.v[1], pin), now = new Date();
    sheet_('Roster').getRange(st.row, 3, 1, 7).setValues([[h, now, st.v[4] || now, now, addDevice_(st, device), 0, '']]);
    return { ok: true, token: token_(klass, st.v[1], h), name: st.v[1] };
  } finally { lock.releaseLock(); }
}
function signIn_(klass, name, pin, device) {
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var st = findStudent_(klass, name); if (!st) return { ok: false, error: 'unknown student' };
    if (!st.v[2]) return { ok: false, error: 'nopin' };
    if (Number(st.v[8] || 0) > Date.now()) return { ok: false, error: 'locked' };
    var sh = sheet_('Roster');
    if (hashPin_(klass, st.v[1], String(pin || '')) !== st.v[2]) {
      var fails = Number(st.v[7] || 0) + 1;
      sh.getRange(st.row, 8, 1, 2).setValues([[fails, fails >= 8 ? Date.now() + 10 * 60000 : '']]);
      return { ok: false, error: fails >= 8 ? 'locked' : 'badpin' };
    }
    sh.getRange(st.row, 6, 1, 4).setValues([[new Date(), addDevice_(st, device), 0, '']]);
    return { ok: true, token: token_(klass, st.v[1], st.v[2]), name: st.v[1] };
  } finally { lock.releaseLock(); }
}
function authed_(klass, name, token) {
  if (!token) return null;
  var ck = 'tok:' + norm_(klass) + '|' + norm_(name), c = cget_(ck);
  if (c && c.t === token) return { klass: c.k, name: c.n };
  var st = findStudent_(klass, name); if (!st || !st.v[2]) return null;
  if (token_(klass, st.v[1], st.v[2]) !== token) return null;
  cput_(ck, { t: token, k: String(st.v[0]), n: String(st.v[1]) });
  return { klass: String(st.v[0]), name: String(st.v[1]) };
}
function me_(klass, name, token) {
  var who = authed_(klass, name, token); if (!who) return { ok: false, error: 'badtoken' };
  var c = classOf_(who.klass), k = norm_(who.klass) + '|' + norm_(who.name) + '|', prog = {}, subs = {};
  rows_('Progress').forEach(function (r) { if (String(r[0]).indexOf(k) === 0) prog[r[3]] = parse_(r[7] || '{}', {}); });
  rows_('Submissions').forEach(function (r) { if (norm_(r[1]) === norm_(who.klass) && norm_(r[2]) === norm_(who.name)) subs[r[3]] = studentSub_(r); });
  var st = findStudent_(who.klass, who.name);
  return { ok: true, label: c ? c.label : who.klass, level: st ? String(st.v[12] || '') : '', progress: prog, subs: subs, cal: cal_(who.klass), noSchool: noSchool_() };
}
function studentSub_(r) {
  var graded = r[10] === 'graded' || r[10] === 'revise';
  return { id: String(r[0]), mission: String(r[3]), version: Number(r[4]) || 1, submitted: ms_(r[5]),
    files: parse_(r[6], []).map(function (f) { return { name: f.name, kind: f.kind, slot: f.slot }; }), reflections: parse_(r[7], {}), thumbs: parse_(r[9], []),
    status: String(r[10] || 'submitted'), levels: graded ? parse_(r[11], {}) : null, comment: graded ? String(r[12] || '') : '' };
}

/* ---------------- writes (POST) ---------------- */
function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  try {
    var k = body.kind;
    if (k === 'beat') return json_(beat_(body));
    if (k === 'upload-start') return json_(uploadStart_(body));
    if (k === 'upload-chunk') return json_(uploadChunk_(body));
    if (k === 'submit') return json_(submit_(body));
    if (!teacherKey_() || body.key !== teacherKey_()) return json_({ ok: false, error: 'bad key' });
    if (k === 'grade') return json_(grade_(body));
    if (k === 'setroster') return json_(setRoster_(body['class'], body.label, body.names, body.mode, body.students, body.ps, body.level));
    if (k === 'setstudent') return json_(setStudent_(body['class'], body.list || [body]));
    if (k === 'setcal') return json_(setCal_(body['class'], body.cal, !!body.all));
    if (k === 'setnoschool') return json_(setNoSchool_(body.dates));
    if (k === 'setequip') return json_(setEquip_(body.equip));
    return json_({ ok: false, error: 'unknown kind' });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

/* where a student is + their progress, every ~25 s while the site is open */
function beat_(b) {
  var who = authed_(b['class'], b.name, b.token); if (!who) return { ok: false, error: 'badtoken' };
  var now = Date.now(), st = b.status || {};
  var rec = { view: clean_(st.view, 12), mission: clean_(st.mission, 12), step: Number(st.step) || 0, label: clean_(st.label, 90), away: !!st.away, at: now, dev: clean_(b.device, 20) };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return { ok: false, error: 'busy' }; }
  try {
    var lk = 'live:' + norm_(who.klass), live = cget_(lk) || {}, prev = live[who.name];
    rec.since = prev && prev.label === rec.label && prev.view === rec.view ? (prev.since || now) : now;
    live[who.name] = rec; cput_(lk, live, 21600);
    var prog = b.progress || {}, keys = Object.keys(prog).slice(0, 20);
    if (keys.length) upsertProgress_(who, prog, keys, now);
    var seenKey = 'seen:' + norm_(who.klass) + '|' + norm_(who.name);
    if (!cget_(seenKey)) { var s = findStudent_(who.klass, who.name); if (s) sheet_('Roster').getRange(s.row, 6).setValue(new Date(now)); cput_(seenKey, 1, 120); }
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function upsertProgress_(who, prog, keys, now) {
  var sh = sheet_('Progress'), last = sh.getLastRow(), col = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], idx = {};
  col.forEach(function (r, i) { idx[r[0]] = i + 2; });
  var add = [];
  keys.forEach(function (m) {
    var state = prog[m]; if (!state || typeof state !== 'object' || !/^[a-z]\d\d$/.test(m)) return;
    var txt = JSON.stringify(state);
    if (txt.length > 45000) { var s2 = JSON.parse(txt); Object.keys(s2.answers || {}).forEach(function (a) { if (/^sim-/.test(a)) delete s2.answers[a]; }); txt = JSON.stringify(s2).slice(0, 49000); }
    var key = norm_(who.klass) + '|' + norm_(who.name) + '|' + m, done = Object.keys(state.done || {}).length;
    var row = [key, who.klass, who.name, m, done, (Number(state.step) || 0) + 1, new Date(now), txt];
    if (idx[key]) sh.getRange(idx[key], 1, 1, row.length).setValues([row]); else add.push(row);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, add[0].length).setValues(add);
}
function live_(klass) { return cget_('live:' + norm_(klass)) || {}; }

/* ---------------- files ---------------- */
function folder_() {
  var id = props_().getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Robotics Lab Submissions'); props_().setProperty('FOLDER_ID', f.getId());
  return f;
}
function sub_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function studentFolder_(who) { var c = classOf_(who.klass); return sub_(sub_(folder_(), (c && c.label) || who.klass), who.name); }
function uploadStart_(b) {
  var who = authed_(b['class'], b.name, b.token); if (!who) return { ok: false, error: 'badtoken' };
  var size = Number(b.size) || 0, mime = clean_(b.mime || 'application/octet-stream', 80);
  if (size <= 0) return { ok: false, error: 'That file is empty.' };
  if (size > 300 * 1024 * 1024) return { ok: false, error: 'That file is too big (over 300 MB).' };
  var mission = /^[a-z]\d\d$/.test(b.mission) ? b.mission : 'misc';
  var stamp = Utilities.formatDate(new Date(), TZ, 'MMM d HH-mm');
  var fname = clean_(mission.toUpperCase() + ' · ' + stamp + ' · ' + String(b.fileName || 'file').replace(/[\\\/]/g, '-'), 140);
  var r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    payload: JSON.stringify({ name: fname, mimeType: mime, parents: [studentFolder_(who).getId()] }),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) }
  });
  var h = r.getAllHeaders(), loc = h.Location || h.location;
  if (r.getResponseCode() !== 200 || !loc) return { ok: false, error: 'Google Drive refused the upload (' + r.getResponseCode() + ')' };
  var id = Utilities.getUuid();
  cput_('up:' + id, { loc: loc, size: size, mime: mime, k: who.klass, n: who.name }, 21600);
  return { ok: true, uploadId: id };
}
function uploadChunk_(b) {
  var up = cget_('up:' + b.uploadId); if (!up) return { ok: false, error: 'This upload expired. Try again.' };
  if (norm_(up.k) !== norm_(b['class']) || norm_(up.n) !== norm_(b.name)) return { ok: false, error: 'not your upload' };
  var bytes = Utilities.base64Decode(String(b.data || '')), off = Number(b.offset) || 0, end = off + bytes.length - 1;
  if (!bytes.length) return { ok: false, error: 'empty piece' };
  var r = UrlFetchApp.fetch(up.loc, { method: 'put', contentType: up.mime, payload: bytes, muteHttpExceptions: true, headers: { 'Content-Range': 'bytes ' + off + '-' + end + '/' + up.size } });
  var code = r.getResponseCode();
  if (code === 308) return { ok: true, done: false };
  if (code === 200 || code === 201) {
    var f = parse_(r.getContentText(), {});
    cput_('file:' + f.id, { k: up.k, n: up.n }, 21600);
    return { ok: true, done: true, fileId: f.id };
  }
  return { ok: false, error: 'Google Drive error ' + code };
}
function subRows_() { return rows_('Submissions').map(function (r, i) { return { row: i + 2, v: r }; }); }
function submit_(b) {
  var who = authed_(b['class'], b.name, b.token); if (!who) return { ok: false, error: 'badtoken' };
  var mission = String(b.mission || ''); if (!/^[a-z]\d\d$/.test(mission)) return { ok: false, error: 'bad mission' };
  var files = (b.files || []).slice(0, 12).filter(function (f) { var o = cget_('file:' + f.fileId); return o && norm_(o.k) === norm_(who.klass) && norm_(o.n) === norm_(who.name); })
    .map(function (f) { return { id: String(f.fileId), name: clean_(f.name, 120), mime: clean_(f.mime, 80), size: Number(f.size) || 0, kind: clean_(f.kind, 10), slot: clean_(f.slot, 20) }; });
  var refl = {}; Object.keys(b.reflections || {}).slice(0, 12).forEach(function (q) { refl[clean_(q, 12)] = cleanText_(b.reflections[q], 4000); });
  var thumbs = (b.thumbs || []).filter(function (t) { return /^data:image\/jpeg;base64,/.test(t) && t.length < 14000; }).slice(0, 3);
  var checks = JSON.stringify(b.checks || {}).slice(0, 20000);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet_('Submissions'), ex = null;
    subRows_().forEach(function (x) { if (norm_(x.v[1]) === norm_(who.klass) && norm_(x.v[2]) === norm_(who.name) && x.v[3] === mission) ex = x; });
    var now = new Date(), row;
    if (ex) {
      var old = parse_(ex.v[6], []), slots = {}; files.forEach(function (f) { slots[f.slot] = 1; });
      var merged = old.filter(function (f) { return !slots[f.slot]; }).concat(files);
      var hist = parse_(ex.v[14], []);
      if (ex.v[10] === 'graded' || ex.v[10] === 'revise') hist.push({ version: ex.v[4], status: ex.v[10], levels: parse_(ex.v[11], {}), comment: String(ex.v[12] || ''), at: ms_(ex.v[13]) });
      row = [ex.v[0], who.klass, who.name, mission, (Number(ex.v[4]) || 1) + 1, now, JSON.stringify(merged), JSON.stringify(refl), checks, JSON.stringify(thumbs.length ? thumbs : parse_(ex.v[9], [])),
        'submitted', ex.v[11] || '', ex.v[12] || '', ex.v[13] || '', JSON.stringify(hist).slice(0, 40000)];
      sh.getRange(ex.row, 1, 1, row.length).setValues([row]);
    } else {
      row = [Utilities.getUuid().slice(0, 8), who.klass, who.name, mission, 1, now, JSON.stringify(files), JSON.stringify(refl), checks, JSON.stringify(thumbs), 'submitted', '', '', '', '[]'];
      sh.appendRow(row);
    }
    return { ok: true, sub: studentSub_(row) };
  } finally { lock.releaseLock(); }
}

/* ---------------- teacher ---------------- */
function classList_() {
  var counts = {}; rows_('Roster').forEach(function (r) { var k = norm_(r[0]); counts[k] = (counts[k] || 0) + 1; });
  return { ok: true, classes: classes_().map(function (c) { return { code: c.code, label: c.label || c.code, count: counts[c.code] || 0, ps: c.ps || null }; }), calSync: props_().getProperty('CALSYNC') === '1', noSchool: noSchool_(), equip: list_('EQUIP') || {} };
}
function dash_(klass) {
  var c = classOf_(klass); if (!c) return { ok: false, error: 'unknown class' };
  var k = norm_(klass);
  var roster = rosterRows_(klass).map(function (x) { return { name: String(x.v[1]), pin: !!x.v[2], lastSeen: ms_(x.v[5]), devices: parse_(x.v[6] || '[]', []).length,
    num: String(x.v[9] || ''), pronouns: String(x.v[10] || ''), ipp: !!x.v[11], level: String(x.v[12] || '') }; });
  roster.sort(function (a, b) { return a.name.localeCompare(b.name); });
  var prog = {};
  rows_('Progress').forEach(function (r) { if (norm_(r[1]) !== k) return; var st = parse_(r[7] || '{}', {}); (prog[r[2]] = prog[r[2]] || {})[r[3]] = { done: Object.keys(st.done || {}), step: Number(r[5]) || 1, updated: ms_(r[6]) }; });
  var subs = [];
  subRows_().forEach(function (x) { var r = x.v; if (norm_(r[1]) !== k) return; subs.push({ id: String(r[0]), name: String(r[2]), mission: String(r[3]), version: Number(r[4]) || 1, submitted: ms_(r[5]), status: String(r[10] || 'submitted'), levels: parse_(r[11], {}), fileCount: parse_(r[6], []).length, gradedAt: ms_(r[13]) }); });
  return { ok: true, code: c.code, label: c.label || c.code, ps: c.ps || null, roster: roster, progress: prog, subs: subs, live: live_(klass), cal: cal_(klass), noSchool: noSchool_(), calSync: props_().getProperty('CALSYNC') === '1', now: Date.now() };
}
function subDetail_(id) {
  var x = null; subRows_().forEach(function (s) { if (String(s.v[0]) === String(id)) x = s; }); if (!x) return { ok: false, error: 'not found' };
  var r = x.v, key = norm_(r[1]) + '|' + norm_(r[2]) + '|' + r[3], state = {};
  rows_('Progress').forEach(function (p) { if (p[0] === key) state = parse_(p[7] || '{}', {}); });
  return { ok: true, sub: { id: String(r[0]), klass: String(r[1]), name: String(r[2]), mission: String(r[3]), version: Number(r[4]) || 1, submitted: ms_(r[5]), files: parse_(r[6], []), reflections: parse_(r[7], {}),
    checks: parse_(r[8], {}), thumbs: parse_(r[9], []), status: String(r[10] || 'submitted'), levels: parse_(r[11], {}), comment: String(r[12] || ''), gradedAt: ms_(r[13]), history: parse_(r[14], []),
    answers: state.answers || {}, done: Object.keys(state.done || {}) } };
}
function fileData_(id) {
  var known = false; subRows_().forEach(function (s) { if (String(s.v[6]).indexOf(String(id)) >= 0) known = true; });
  if (!known) return { ok: false, error: 'not a submitted file' };
  var f = DriveApp.getFileById(id), mime = f.getMimeType(), size = f.getSize();
  var out = { ok: true, id: id, name: f.getName(), mime: mime, size: size, url: f.getUrl(), preview: 'https://drive.google.com/file/d/' + id + '/preview' };
  var model = /\.(stl|f3d|step|stp|obj|3mf)$/i.test(f.getName());
  if (/^image\//.test(mime) && size < 8 * 1024 * 1024) out.data = 'data:' + mime + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
  else if (/\.stl$/i.test(f.getName()) && size < 20 * 1024 * 1024) out.b64 = Utilities.base64Encode(f.getBlob().getBytes()); // a 3D preview in the grading view
  else if (model) out.model = true;
  else if ((/^text\//.test(mime) || /\.(ino|txt|cpp|h|c)$/i.test(f.getName()) || mime === 'application/octet-stream') && size < 300000) out.text = f.getBlob().getDataAsString();
  return out;
}
function grade_(b) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var x = null; subRows_().forEach(function (s) { if (String(s.v[0]) === String(b.id)) x = s; }); if (!x) return { ok: false, error: 'not found' };
    var lv = {}; Object.keys(b.levels || {}).forEach(function (k) { if (/^(NM|BEG|PRG|ADV|MAS)$/.test(b.levels[k])) lv[clean_(k, 20)] = b.levels[k]; });
    var status = b.status === 'revise' ? 'revise' : b.status === 'submitted' ? 'submitted' : 'graded';
    sheet_('Submissions').getRange(x.row, 11, 1, 4).setValues([[status, JSON.stringify(lv), cleanText_(b.comment, 4000), new Date()]]);
    return { ok: true, status: status };
  } finally { lock.releaseLock(); }
}
/* names: text, one per line; students: [{ n, num, as }] from a PowerSchool scores template (as = the name already on the
   class list that this row matched, so a slightly different spelling keeps the student's PIN and work); ps: the template's
   header ({ teacher, course, points, type }), kept with the class for report cards. mode 'replace' removes anyone not listed.
   level ('15' | '25' | '35', optional): the course level of everyone listed (a template from one PowerSchool section). */
function setRoster_(klass, label, names, mode, students, ps, level) {
  var code = norm_(klass).replace(/[^a-z0-9\-_ ]/g, '').slice(0, 24); if (!code) return { ok: false, error: 'A class needs a code (letters and numbers).' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var cs = classes_(), c = null; cs.forEach(function (x) { if (x.code === code) c = x; });
    if (!c) { c = { code: code, label: clean_(label || code, 40) }; cs.push(c); } else if (label) c.label = clean_(label, 40);
    var psi = typeof ps === 'string' ? parse_(ps, null) : ps;
    if (psi && typeof psi === 'object') c.ps = { teacher: clean_(psi.teacher, 60), course: clean_(psi.course, 60), points: clean_(psi.points, 10), type: clean_(psi.type, 20) };
    save_('CLASSES', cs);
    var studs = typeof students === 'string' ? parse_(students, []) : (students || []);
    var list = (Array.isArray(studs) && studs.length ? studs : (Array.isArray(names) ? names : String(names || '').split(/\n/)).map(function (n) { return { n: n }; }))
      .map(function (x) { return { n: clean_(x.n, 60), num: String(x.num || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20), as: clean_(x.as || '', 60) }; }).filter(function (x) { return x.n; });
    var sh = sheet_('Roster'), have = {}; rosterRows_(code).forEach(function (x) { have[norm_(x.v[1])] = x; });
    var removed = 0, numbered = 0, leveled = 0, keep = {}, add = [], lvl = /^(15|25|35)$/.test(String(level || '')) ? String(level) : '';
    list.forEach(function (x) { keep[norm_(x.as || x.n)] = 1; });
    list.forEach(function (x) {
      var hit = have[norm_(x.as || x.n)] || have[norm_(x.n)];
      if (hit) {
        if (hit.row && x.num && String(hit.v[9] || '') !== x.num) { sh.getRange(hit.row, 10).setValue(x.num); numbered++; }
        if (hit.row && lvl && String(hit.v[12] || '') !== lvl) { sh.getRange(hit.row, 13).setValue(lvl); leveled++; }
        return;
      }
      add.push([code, x.n, '', '', '', '', '[]', 0, '', x.num || '', '', '', lvl]); have[norm_(x.n)] = { v: [] };
    });
    if (mode === 'replace') {
      var gone = rosterRows_(code).filter(function (x) { return !keep[norm_(x.v[1])]; }).map(function (x) { return x.row; }).sort(function (a, b) { return b - a; });
      gone.forEach(function (r) { sh.deleteRow(r); }); removed = gone.length;
    }
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, add[0].length).setValues(add);
    return { ok: true, code: code, added: add.length, numbered: numbered, leveled: leveled, removed: removed };
  } finally { lock.releaseLock(); }
}
/* one or more students' class-list details: [{ name, num?, pronouns?, ipp?, level? }] (a field left out stays as it is) */
function setStudent_(klass, list) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet_('Roster'), out = [];
    (Array.isArray(list) ? list : []).slice(0, 80).forEach(function (x) {
      var st = findStudent_(klass, x.name); if (!st) return;
      var v = st.v.slice(9, 13); while (v.length < 4) v.push('');
      if (x.num !== undefined) v[0] = String(x.num || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20);
      if (x.pronouns !== undefined) v[1] = /^(he|she|they)$/.test(x.pronouns) ? x.pronouns : '';
      if (x.ipp !== undefined) v[2] = x.ipp === true || x.ipp === '1' || x.ipp === 1 ? 1 : '';
      if (x.level !== undefined) v[3] = /^(15|25|35)$/.test(String(x.level)) ? String(x.level) : '';
      sh.getRange(st.row, 10, 1, 4).setValues([[v[0] || '', v[1], v[2], v[3]]]);
      out.push({ name: String(st.v[1]), num: String(v[0] || ''), pronouns: String(v[1] || ''), ipp: !!v[2], level: String(v[3] || '') });
    });
    if (!out.length) return { ok: false, error: 'unknown student' };
    return { ok: true, students: out, num: out[0].num, pronouns: out[0].pronouns, ipp: out[0].ipp, level: out[0].level };
  } finally { lock.releaseLock(); }
}
function resetPin_(klass, name) { var st = findStudent_(klass, name); if (!st) return { ok: false, error: 'unknown student' }; sheet_('Roster').getRange(st.row, 3, 1, 2).setValues([['', '']]); sheet_('Roster').getRange(st.row, 8, 1, 2).setValues([[0, '']]); try { cache_().remove('tok:' + norm_(klass) + '|' + norm_(name)); } catch (e) {} return { ok: true }; }
function removeStudent_(klass, name) { var st = findStudent_(klass, name); if (!st) return { ok: false, error: 'unknown student' }; sheet_('Roster').deleteRow(st.row); return { ok: true }; }
function rename_(klass, name, to) { var st = findStudent_(klass, name); to = clean_(to, 60); if (!st || !to) return { ok: false, error: 'unknown student' }; sheet_('Roster').getRange(st.row, 2, 1, 2).setValues([[to, '']]); return { ok: true, note: 'PIN cleared: the student makes a new one.' }; }
function delClass_(klass) {
  var k = norm_(klass); save_('CLASSES', classes_().filter(function (c) { return c.code !== k; }));
  rosterRows_(k).map(function (x) { return x.row; }).sort(function (a, b) { return b - a; }).forEach(function (r) { sheet_('Roster').deleteRow(r); });
  props_().deleteProperty('CAL:' + k); return { ok: true };
}

/* the teacher's own product links for the Equipment tab: { productKey: { url, product, price } } */
function setEquip_(eq) {
  var out = {}; Object.keys(eq || {}).slice(0, 60).forEach(function (k) {
    var x = eq[k] || {}, url = String(x.url || '').trim();
    if (!/^https?:\/\//.test(url)) return;
    out[clean_(k, 40)] = { url: url.slice(0, 500), product: clean_(x.product || '', 120), price: String(x.price || '').replace(/[^0-9.]/g, '').slice(0, 10) };
  });
  var txt = JSON.stringify(out); if (txt.length > 8500) return { ok: false, error: 'too many links' };
  save_('EQUIP', out); return { ok: true, equip: out };
}

/* ---------------- calendar ---------------- */
function noSchool_() { var d = list_('NOSCHOOL'); return Array.isArray(d) ? d : []; }
function cal_(klass) { if (props_().getProperty('CALSYNC') === '1') { var s = list_('CAL:*'); if (s) return s; } return list_('CAL:' + norm_(klass)); }
function setCal_(klass, cal, all) {
  var c = typeof cal === 'string' ? parse_(cal, null) : cal;
  if (c !== null && (!c || !/^\d{4}-\d{2}-\d{2}$/.test(c.start || '') || !Array.isArray(c.items))) return { ok: false, error: 'bad calendar' };
  var txt = JSON.stringify(c); if (txt.length > 8500) return { ok: false, error: 'calendar too big' };
  if (props_().getProperty('CALSYNC') === '1') { save_('CAL:*', c); return { ok: true, synced: true }; }
  if (all) { classes_().forEach(function (x) { save_('CAL:' + x.code, c); }); return { ok: true, copied: classes_().length }; }
  save_('CAL:' + norm_(klass), c); return { ok: true };
}
function setNoSchool_(dates) {
  var list = (Array.isArray(dates) ? dates : String(dates || '').split(/[\s,]+/)).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); });
  var u = {}; list.forEach(function (d) { u[d] = 1; }); list = Object.keys(u).sort();
  save_('NOSCHOOL', list); return { ok: true, noSchool: list };
}
