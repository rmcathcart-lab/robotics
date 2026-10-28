/* The class calendar. A class's calendar is saved as
 *   { v: 1, start: 'YYYY-MM-DD', meet: [1,2,3,4,5], items: [{ k: 'm01', len: 3 }, …], skipped: ['m05'], events: [...] }
 * items run back to back in order: each mission takes `len` class days, and its last day is its due date.
 * Class days = the weekdays in `meet` from `start` that aren't days off (the school's days off, shared by every
 * class, plus this class's events that take the class). Changing a mission's length or adding a day off moves
 * everything after it. events: [{ id, date, title, kind: 'event' | 'exam', takes }] — the teacher's own entries.
 * Used by the student home page (pop-up) and the teacher dashboard (Calendar tab). */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var C = RL.Cal = {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  C.key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  C.parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; };
  C.today = function () { return C.key(new Date()); };
  C.addDays = function (s, n) { var d = C.parse(s); d.setDate(d.getDate() + n); return C.key(d); };
  C.nice = function (s, opts) { var d = C.parse(s); return d ? d.toLocaleDateString([], opts || { weekday: 'short', month: 'short', day: 'numeric' }) : s; };
  C.long = function (s) { return C.nice(s, { weekday: 'long', month: 'long', day: 'numeric' }); };
  function set(list) { var o = {}; (list || []).forEach(function (s) { o[s] = 1; }); return o; }
  function meetOf(cal) { var m = (cal && Array.isArray(cal.meet) && cal.meet.length) ? cal.meet : [1, 2, 3, 4, 5]; return set(m); }
  C.offFor = function (cal, off) {
    var ev = (cal && cal.events || []).filter(function (e) { return e.takes; }).map(function (e) { return e.date; });
    return (off || []).concat(ev);
  };
  C.isClassDay = function (cal, off, s) { var d = C.parse(s); return !!d && !!meetOf(cal)[d.getDay()] && !set(C.offFor(cal, off))[s]; };
  /* the first n class days on or after start */
  C.classDays = function (cal, off, n, from) {
    var o = set(C.offFor(cal, off)), mt = meetOf(cal), out = [], d = C.parse(from || cal.start); if (!d) return out;
    for (var g = 0; out.length < n && g < 4000; g++) { var k = C.key(d); if (mt[d.getDay()] && !o[k]) out.push(k); d.setDate(d.getDate() + 1); }
    return out;
  };
  C.info = function (k) { var m = RL.MISSIONS[k]; return m ? { key: k, unit: m.unit, num: m.num, title: m.title, mission: m } : null; };

  C.make = function (start) { return { v: 1, start: start, meet: [1, 2, 3, 4, 5], items: RL.missionList().map(function (m) { return { k: m.id, len: m.days || 2 }; }), skipped: [] }; };
  C.clean = function (cal) {
    if (!cal || !C.parse(cal.start)) return null;
    var seen = {}, items = [];
    (cal.items || []).forEach(function (x) { if (x && C.info(x.k) && !seen[x.k]) { seen[x.k] = 1; items.push({ k: x.k, len: Math.max(1, Math.min(30, Math.round(Number(x.len) || 1))) }); } });
    var skipped = (cal.skipped || []).filter(function (k) { if (!C.info(k) || seen[k]) return false; seen[k] = 1; return true; });
    RL.missionList().forEach(function (m) { if (!seen[m.id]) items.push({ k: m.id, len: m.days || 2 }); });
    var meet = Array.isArray(cal.meet) && cal.meet.length ? cal.meet.filter(function (d) { return d >= 0 && d <= 6; }) : [1, 2, 3, 4, 5];
    var out = { v: 1, start: cal.start, meet: meet, items: items, skipped: skipped };
    var ev = C.cleanEvents(cal.events); if (ev.length) out.events = ev;
    return out;
  };
  C.cleanEvents = function (list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (e, i) {
      if (!e || !C.parse(e.date) || !String(e.title || '').trim()) return;
      out.push({ id: String(e.id || 'e' + i), date: e.date, title: String(e.title).trim().slice(0, 60), kind: e.kind === 'exam' ? 'exam' : 'event', takes: !!e.takes });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  };
  C.copy = function (cal) { return JSON.parse(JSON.stringify(cal)); };
  /* { span: { k: { start, end, dates, idx } }, byDate: { date: [{ k, day, len }] }, last } */
  C.layout = function (cal, off) {
    var n = cal.items.reduce(function (s, x) { return s + x.len; }, 0);
    var days = C.classDays(cal, off, Math.max(1, n)), span = {}, byDate = {}, i = 0;
    cal.items.forEach(function (x, idx) {
      var ds = days.slice(i, i + x.len); i += x.len; if (!ds.length) return;
      span[x.k] = { start: ds[0], end: ds[ds.length - 1], dates: ds, idx: idx, len: x.len };
      ds.forEach(function (d, j) { (byDate[d] = byDate[d] || []).push({ k: x.k, day: j + 1, len: x.len }); });
    });
    return { span: span, byDate: byDate, last: days[n - 1] || cal.start, days: days };
  };
  /* class days from a to b (a before b): 0 if same day */
  C.classDaysBetween = function (cal, off, a, b) {
    if (b <= a) return 0; var o = set(C.offFor(cal, off)), mt = meetOf(cal), d = C.parse(a), n = 0;
    for (var g = 0; g < 4000; g++) { d.setDate(d.getDate() + 1); var k = C.key(d); if (k > b) break; if (mt[d.getDay()] && !o[k]) n++; }
    return n;
  };
  /* the mission due next (due today or later): { k, info, due, start, inDays, today: [{k, day, len}] } */
  C.nextDue = function (cal, off, today) {
    if (!cal) return null;
    var L = C.layout(cal, off), best = null;
    cal.items.forEach(function (x) { var s = L.span[x.k]; if (s && s.end >= today && (!best || s.end < best.due)) best = { k: x.k, info: C.info(x.k), due: s.end, start: s.start }; });
    if (best) best.inDays = C.classDaysBetween(cal, off, today, best.due);
    return best;
  };
  C.on = function (cal, off, date) { return cal ? (C.layout(cal, off).byDate[date] || []) : []; };

  /* operations (each returns a new calendar) */
  C.setLen = function (cal, k, len) { var c = C.copy(cal); c.items.forEach(function (x) { if (x.k === k) x.len = Math.max(1, Math.min(30, len)); }); return c; };
  C.moveItem = function (cal, k, dir) {
    var c = C.copy(cal), i = c.items.findIndex(function (x) { return x.k === k; }), j = i + dir;
    if (i < 0 || j < 0 || j >= c.items.length) return c;
    var t = c.items[i]; c.items[i] = c.items[j]; c.items[j] = t; return c;
  };
  C.skip = function (cal, k) { var c = C.copy(cal); c.items = c.items.filter(function (x) { return x.k !== k; }); c.skipped.push(k); return c; };
  C.restore = function (cal, k) { var c = C.copy(cal); c.skipped = c.skipped.filter(function (x) { return x !== k; }); c.items.push({ k: k, len: (RL.MISSIONS[k] || {}).days || 2 }); return c; };

  /* ---- the month view: continuous scrolling weeks (Sun–Sat, weekends narrow) ---- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  C.esc = esc;
  /* opts: { off, today, chip(k, slot) → element, onDay(date, cell), height } */
  C.view = function (cal, opts) {
    opts = opts || {};
    var off = opts.off || [], today = opts.today || C.today(), offS = set(off), mt = meetOf(cal);
    var L = cal ? C.layout(cal, off) : { byDate: {}, last: today, span: {} };
    var first = cal ? (cal.start < today ? cal.start : today) : today;
    var last = L.last > today ? L.last : today;
    var s = C.parse(first); s.setDate(s.getDate() - s.getDay() - 21); // back to a Sunday, plus three weeks
    var e = C.parse(last); e.setDate(e.getDate() + (6 - e.getDay()) + 42);
    var root = el('div', 'calv');
    var head = el('div', 'calv-h'); var month = el('div', 'calv-month'); head.appendChild(month);
    var tb = el('button', 'btn btn-ghost btn-small', 'Today'); tb.type = 'button'; head.appendChild(tb);
    root.appendChild(head);
    var dow = el('div', 'calv-dow'); ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) { dow.appendChild(el('div', '', d)); }); root.appendChild(dow);
    var sc = el('div', 'calv-scroll'); if (opts.height) sc.style.height = opts.height; root.appendChild(sc);
    var cells = {}, weeks = [];
    var evs = {}; (cal && cal.events || []).forEach(function (x) { (evs[x.date] = evs[x.date] || []).push(x); });
    for (var d = new Date(s); d <= e;) {
      var wk = el('div', 'calv-week'); wk.dataset.start = C.key(d); weeks.push(wk);
      for (var i = 0; i < 7; i++) {
        var k = C.key(d), we = d.getDay() === 0 || d.getDay() === 6;
        var cell = el('div', 'calv-day' + (we ? ' we' : '') + (k === today ? ' today' : '') + (!we && (offS[k] || !mt[d.getDay()]) ? ' off' : ''));
        cell.dataset.date = k;
        var num = d.getDate() === 1 ? '<span class="mo">' + d.toLocaleDateString([], { month: 'short' }) + '</span><b>1</b>' : '<b>' + d.getDate() + '</b>';
        cell.appendChild(el('div', 'calv-num', num));
        if (!we && offS[k]) cell.appendChild(el('div', 'calv-note', 'No school'));
        (evs[k] || []).forEach(function (x) { cell.appendChild(el('div', 'calv-chip ev' + (x.kind === 'exam' ? ' exam' : ''), '<b>' + (x.takes ? 'No class' : 'Note') + '</b><span>' + esc(x.title) + '</span>')); });
        (L.byDate[k] || []).forEach(function (slot) {
          var ch = opts.chip ? opts.chip(slot.k, slot) : C.chip(slot.k, slot);
          if (ch) cell.appendChild(ch);
        });
        if (opts.onDay) { cell.classList.add('pick'); (function (kk, cc) { cc.addEventListener('click', function (ev) { if (ev.target.closest('a')) return; opts.onDay(kk, cc); }); })(k, cell); }
        cells[k] = cell; wk.appendChild(cell);
        d.setDate(d.getDate() + 1);
      }
      sc.appendChild(wk);
    }
    function setMonth() {
      var top = sc.scrollTop + 20, cur = weeks[0];
      for (var i = 0; i < weeks.length; i++) { if (weeks[i].offsetTop - sc.offsetTop <= top) cur = weeks[i]; else break; }
      var mid = C.parse(cur.dataset.start); mid.setDate(mid.getDate() + 3);
      month.textContent = mid.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }
    sc.addEventListener('scroll', setMonth, { passive: true });
    root.scrollToDate = function (date) {
      var c = cells[date] || cells[today]; if (!c) return;
      var wkEl = c.parentNode; sc.scrollTop = Math.max(0, wkEl.offsetTop - sc.offsetTop - 8); setMonth();
    };
    root.flashDate = function (date) { var c = cells[date]; if (c) { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); } };
    root.cells = cells;
    tb.addEventListener('click', function () { root.scrollToDate(today); root.flashDate(today); });
    setTimeout(setMonth, 0);
    return root;
  };
  C.chip = function (k, slot, href) {
    var i = C.info(k); if (!i) return null;
    var a = el(href ? 'a' : 'div', 'calv-chip' + (slot.day === slot.len ? ' due' : slot.day > 1 ? ' mid' : ''));
    if (href) a.href = href;
    a.style.setProperty('--u', RL.unitColour(i.unit));
    a.innerHTML = '<b>M' + esc(i.num) + ' · day ' + slot.day + '/' + slot.len + '</b><span>' + esc(i.title) + '</span>';
    a.title = 'Mission ' + i.num + ': ' + i.title + ' — day ' + slot.day + ' of ' + slot.len + (slot.day === slot.len ? ' (due)' : '');
    return a;
  };
})(window);
