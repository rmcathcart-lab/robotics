/* The course bridge: how the Teaching Hub (https://rmcathcart-lab.github.io/teaching/) reads and changes this course.
 * The hub opens teacher/bridge.html in a hidden frame and calls window.COURSE_BRIDGE (the same calls as the math sites'
 * bridge.js). Everything goes through this course's own Apps Script backend with this ledger's teacher key, so a class
 * calendar has ONE copy: a change in the hub's universal calendar is a change to the class's calendar here, and the reverse.
 * Robotics missions run back to back (each takes `len` class days), so the hub changes them by length, not by dragging. */
(function (root) {
  'use strict';
  var RL = root.RL, C = RL.Cal, A = RL.api;
  var B = root.COURSE_BRIDGE = { kind: 'robotics', enabled: !!(A && A.enabled), version: 1 };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function key() { return ls('tkey') || ''; }
  B.hasKey = function () { return !!key(); };
  B.key = key;
  B.setKey = function (k) { ls('tkey', k ? String(k) : null); cache = { cal: {} }; };
  function get(action, params) { return A.get(action, Object.assign({ key: key() }, params || {}), 30000); }
  function post(body) { return A.post(Object.assign({ key: key() }, body)); }
  B.get = get;

  var cache = { cal: {} };
  B.classes = function (force) {
    if (cache.classes && !force) return cache.classes;
    var pr = cache.classes = get('classes').then(function (d) {
      if (!d || !d.ok) { cache.classes = null; return { ok: false, error: (d && d.error) || 'no answer' }; }
      cache.sync = !!d.calSync;
      return { ok: true, classes: d.classes.map(function (c) { return { code: c.code, show: c.code, label: c.label || c.code, students: c.count || 0, block: '' }; }), noSchool: d.noSchool || [], sync: !!d.calSync };
    }, function (e) { cache.classes = null; return { ok: false, error: e.message }; });
    return pr;
  };
  B.cal = function (code, force) {
    if (cache.cal[code] && !force) return cache.cal[code];
    var pr = cache.cal[code] = Promise.all([get('cal', { 'class': code }), B.classes()]).then(function (r) {
      var d = r[0]; if (!d || !d.ok) { delete cache.cal[code]; return { ok: false, error: (d && d.error) || 'no answer' }; }
      return { ok: true, cal: d.cal ? C.clean(d.cal) : null, noSchool: d.noSchool || [], sync: !!cache.sync };
    }, function (e) { delete cache.cal[code]; return { ok: false, error: e.message }; });
    return pr;
  };
  B.forget = function () { cache = { cal: {} }; };
  B.saveCal = function (code, cal) {
    return B.cal(code).then(function (x) {
      return post({ kind: 'setcal', 'class': code, cal: cal }).then(function (d) {
        if (d && d.ok) { if (x.sync) cache.cal = {}; cache.cal[code] = Promise.resolve({ ok: true, cal: cal ? C.clean(cal) : null, noSchool: x.noSchool, sync: x.sync }); }
        return d || { ok: false, error: 'no answer' };
      });
    });
  };
  B.makeCal = function (code, start) { return B.saveCal(code, C.make(start)); };

  function mix(a, b, t) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), out = '#'; [16, 8, 0].forEach(function (s) { var v = Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); out += ('0' + v.toString(16)).slice(-2); }); return out; }
  function site(p) { return new URL('../' + (p || ''), location.href).href; }
  B.site = site;
  B.item = function (k, slot) {
    var i = C.info(k); if (!i) return null;
    var c = RL.unitColour(i.unit), m = i.mission || {};
    var it = { key: k, label: RL.mcode(i.num), title: i.title, kind: 'mission', unit: i.unit, colour: mix(c, '#0b1422', 0.25), tint: mix(c, '#ffffff', 0.8), dark: mix(c, '#000000', 0.6), ready: !!m.ready, days: m.days || 2 };
    if (it.ready) it.teacherUrl = site('index.html?preview=1#/m/' + k);   // the mission guide, as the ledger's preview opens it
    if (slot) { it.day = slot.day; it.len = slot.len; it.sub = 'Day ' + slot.day + ' of ' + slot.len + (slot.day === slot.len ? ' · due' : ''); }
    return it;
  };
  function eventItem(e) { return { key: 'ev:' + e.id, id: e.id, label: e.kind === 'exam' ? 'Exam' : 'Note', title: e.title, kind: e.kind === 'exam' ? 'exam' : 'event', takes: !!e.takes, colour: '#7c6f57', tint: '#f3efe6', dark: '#4a4234' }; }
  B.entries = function (code, from, to) {
    return B.cal(code).then(function (x) {
      if (!x.ok) return x;
      if (!x.cal) return { ok: true, none: true, days: {} };
      var L = C.layout(x.cal, x.noSchool), days = {};
      Object.keys(L.byDate).forEach(function (d) { if (d >= from && d <= to) days[d] = L.byDate[d].map(function (s) { var it = B.item(s.k, s); var sp = L.span[s.k]; if (it && sp) it.due = sp.end; return it; }).filter(Boolean); });
      (x.cal.events || []).forEach(function (e) { if (e.date >= from && e.date <= to) (days[e.date] = days[e.date] || []).unshift(eventItem(e)); });
      return { ok: true, days: days, start: x.cal.start, last: L.last, skipped: x.cal.skipped.map(function (k) { return B.item(k); }).filter(Boolean), sync: x.sync, meet: x.cal.meet || [1, 2, 3, 4, 5] };
    });
  };
  function change(code, fn) {
    return B.cal(code).then(function (x) {
      if (!x.ok || !x.cal) return { ok: false, error: x.error || 'no calendar' };
      var before = x.cal, next = C.clean(fn(C.copy(x.cal)));
      return B.saveCal(code, next).then(function (d) { return d.ok ? { ok: true, before: before, cal: next } : d; });
    });
  }
  B.canDrag = false;
  B.skip = function (code, k) { return change(code, function (cal) { return C.skip(cal, k); }); };
  B.restore = function (code, k) { return change(code, function (cal) { return C.restore(cal, k); }); };
  /* one class day longer (+1) or shorter (−1): everything after it moves */
  B.lengthen = function (code, k, by) { return change(code, function (cal) { var x = cal.items.filter(function (i) { return i.k === k; })[0]; return x ? C.setLen(cal, k, x.len + by) : cal; }); };
  B.putCal = function (code, cal) { return B.saveCal(code, cal).then(function (d) { return d.ok ? { ok: true, cal: cal } : d; }); };

  B.createClass = function (code, label) {
    return post({ kind: 'setroster', 'class': code, label: label || code, names: '' }).then(function (d) { cache.classes = null; return d && d.ok ? { ok: true, code: d.code || code } : (d || { ok: false, error: 'no answer' }); });
  };
  B.setLabel = function (code, label) { return post({ kind: 'setroster', 'class': code, label: label, names: '' }).then(function (d) { cache.classes = null; return d || { ok: false }; }); };
  B.setBlock = function () { return Promise.resolve({ ok: true, none: true }); };   // robotics classes don't track class time
  B.setNoSchool = function (list) { return post({ kind: 'setnoschool', dates: list || [] }).then(function (d) { cache = { cal: {} }; return d || { ok: false }; }); };
  B.setBell = function () { return Promise.resolve({ ok: true, none: true }); };

  B.sub = function (code, date) {
    return Promise.all([B.classes(), B.entries(code, date, date)]).then(function (r) {
      var cls = r[0].ok ? r[0].classes.filter(function (c) { return c.code === code; })[0] : null, ent = r[1];
      var items = ((ent.ok && ent.days[date]) || []).map(function (it) {
        if (it.kind === 'mission') { var m = RL.MISSIONS[it.key] || {}; it.guideUrl = it.ready ? site('#/m/' + it.key) : ''; it.tagline = m.tagline || ''; it.parts = m.parts || []; it.extras = m.extras || []; }
        return it;
      });
      return { ok: true, kind: 'robotics', items: items, none: !!ent.none, signIn: { url: site(), code: cls ? cls.show : code, site: site() }, label: cls ? cls.label : code, students: cls ? cls.students : 0 };
    });
  };
  B.ledger = function (code) { return new URL('./' + (code ? '?class=' + encodeURIComponent(code) : ''), location.href).href; };
  try { root.parent && root.parent !== root && root.parent.postMessage({ type: 'course-bridge-ready' }, location.origin); } catch (e) {}
})(window);
