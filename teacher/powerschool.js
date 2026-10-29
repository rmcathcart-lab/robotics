/* Robotics Lab ledger — PowerSchool files (shared with the math sites' Teacher Ledger).
 * A PowerSchool "scores template" (PowerTeacher Pro: an assignment's Export/Import scores file) looks like
 *   Teacher Name:,Ryan Cathcart,
 *   Class:,Mathematics 10C,
 *   Assignment Name:,AN1 HW,
 *   Due Date:,2027-01-28,
 *   Points Possible:,10.0,
 *   Extra Points:,0.0,
 *   Score Type:,GRADESCALE,
 *   Student Num,Student Name,Score
 *   84025458,Abner Ghidey,
 * RL.PS.parse reads one (the class list comes from it); RL.PS.file writes one with scores filled in; RL.PS.zip bundles
 * several files into one download (a plain "stored" zip, no compression); RL.PS.match lines a template's students up with
 * the names already on a class list. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}, PS = RL.PS = {};

  /* one CSV line → cells (quotes, doubled quotes) */
  function cells(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (q) { if (ch === '"') { if (line.charAt(i + 1) === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out.map(function (c) { return c.trim(); });
  }
  PS.cells = cells;
  var HEAD = { 'teacher name': 'teacher', 'class': 'course', 'assignment name': 'assignment', 'due date': 'due', 'points possible': 'points', 'extra points': 'extra', 'score type': 'type' };
  /* → { teacher, course, assignment, due, points, extra, type, students: [{ num, name }] } or { error } */
  PS.parse = function (text) {
    var lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/), info = { students: [] }, at = -1, cN = 0, cName = 1;
    for (var i = 0; i < lines.length; i++) {
      var c = cells(lines[i]), k = String(c[0] || '').replace(/:$/, '').toLowerCase();
      if (at < 0 && HEAD[k] && c.length > 1) { info[HEAD[k]] = c[1]; continue; }
      if (at < 0) {
        var low = c.map(function (x) { return x.toLowerCase(); }), a = -1, b = -1;
        low.forEach(function (x, j) { if (a < 0 && /student\s*(num|number|#|id)/.test(x)) a = j; if (b < 0 && /student\s*name|^name$/.test(x)) b = j; });
        if (a >= 0 && b >= 0) { at = i; cN = a; cName = b; }
        continue;
      }
      var num = String(c[cN] || '').replace(/[^0-9A-Za-z]/g, ''), name = String(c[cName] || '').replace(/\s+/g, ' ').trim();
      if (name) info.students.push({ num: num, name: name });
    }
    if (at < 0) return { error: 'This doesn’t look like a PowerSchool scores template: there’s no “Student Num, Student Name” row.' };
    if (!info.students.length) return { error: 'The file has no students in it.' };
    return info;
  };

  function q(v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function dec(v, dflt) { var n = Number(v); return isFinite(n) && String(v).trim() !== '' ? n.toFixed(1) : dflt; }
  /* the file PowerSchool imports. head = { teacher, course, assignment, due, points, extra, type }; rows = [{ num, name, score }] */
  PS.file = function (head, rows) {
    var L = [['Teacher Name:', head.teacher || ''], ['Class:', head.course || ''], ['Assignment Name:', head.assignment || ''], ['Due Date:', head.due || ''],
      ['Points Possible:', dec(head.points, '10.0')], ['Extra Points:', dec(head.extra, '0.0')], ['Score Type:', head.type || 'GRADESCALE']]
      .map(function (x) { return q(x[0]) + ',' + q(x[1]) + ','; });
    L.push('Student Num,Student Name,Score');
    rows.forEach(function (r) { L.push(q(r.num) + ',' + q(r.name) + ',' + q(r.score)); });
    return L.join('\r\n') + '\r\n';
  };
  PS.fileName = function (s) { return String(s || 'scores').replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'scores'; };

  /* ---- a stored zip (no compression): enough for a handful of small CSV files ---- */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  /* files = [{ name, text }] → Blob */
  PS.zip = function (files) {
    var parts = [], central = [], off = 0, d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var used = {};
    files.forEach(function (f) {
      var nm = f.name, k = 2; while (used[nm.toLowerCase()]) nm = f.name.replace(/(\.\w+)?$/, ' (' + (k++) + ')$1'); used[nm.toLowerCase()] = 1;
      var name = utf8(nm), data = utf8(f.text), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(c.buffer, name);
      off += 30 + name.length + data.length;
    });
    var size = central.reduce(function (a, b) { return a + (b.byteLength != null ? b.byteLength : b.length); }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [e.buffer]), { type: 'application/zip' });
  };
  PS.save = function (name, blobOrText, type) {
    var blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type: type || 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };

  /* ---- lining up a template's students with a class list ---- */
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function words(s) { return norm(s).split(' ').filter(function (w) { return w && !/^(jr|sr|ii|iii|iv)$/.test(w); }); }
  /* same student, written a little differently: every word of the shorter name is in the longer one, and the first and
     last words agree (Gurmahi Dhaliwal / Gurmahi Kaur Dhaliwal) */
  function close(a, b) {
    var x = words(a), y = words(b); if (x.length < 2 || y.length < 2) return false;
    if (x[0] !== y[0] || x[x.length - 1] !== y[y.length - 1]) return false;
    var s = x.length <= y.length ? x : y, l = s === x ? y : x;
    return s.every(function (w) { return l.indexOf(w) >= 0; });
  }
  /* students = [{ num, name }], roster = [{ name, num }] → { rows: [{ num, name, as (roster name or ''), how: 'name'|'number'|'close'|'new' }], missing: [roster names not in the file] } */
  PS.match = function (students, roster) {
    var left = (roster || []).slice(), rows = [];
    function take(fn) { for (var i = 0; i < left.length; i++) if (fn(left[i])) return left.splice(i, 1)[0]; return null; }
    students.forEach(function (s) {
      var hit = s.num ? take(function (r) { return r.num && String(r.num) === s.num; }) : null, how = 'number';
      if (!hit) { hit = take(function (r) { return norm(r.name) === norm(s.name); }); how = 'name'; }
      if (!hit) { hit = take(function (r) { return !r.num && close(r.name, s.name); }); how = 'close'; }
      rows.push({ num: s.num, name: s.name, as: hit ? hit.name : '', how: hit ? how : 'new' });
    });
    return { rows: rows, missing: left.map(function (r) { return r.name; }) };
  };
})(window);
