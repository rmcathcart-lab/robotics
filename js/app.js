/* The student site: sign-in, home (welcome, next due, calendar, units), mission guides, and evidence upload.
 * Routes: #/  home · #/m/<mission>  resume a mission · #/m/<mission>/<step number>
 * State on this device (localStorage 'state:<class>|<name>') and on the backend (Progress sheet, through RL.api.beat). */
(function (root) {
  'use strict';
  var RL = root.RL, cfg = root.RL_CONFIG || {}, A = RL.api, C = RL.Cal;
  var view, topbar, session = null, preview = false, S = null, D = { cal: null, noSchool: [], subs: {}, label: '' };
  var cur = { mission: null, step: 0 };

  /* ---------- helpers ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function toast(msg, bad) { var t = el('div', 'toast' + (bad ? ' bad' : ''), esc(msg)); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3600); }
  RL.el = el; RL.esc = esc; RL.toast = toast;
  function deviceId() { var d = ls('device'); if (!d) { d = Math.random().toString(36).slice(2, 10); ls('device', d); } return d; }
  function stateKey() { return 'state:' + (session ? session.klass + '|' + session.name : 'preview'); }
  function loadState() { try { S = JSON.parse(ls(stateKey()) || 'null'); } catch (e) { S = null; } if (!S || typeof S !== 'object') S = { missions: {} }; if (!S.missions) S.missions = {}; }
  var dirty = {};
  function saveState(mid) { ls(stateKey(), JSON.stringify(S)); if (mid) { dirty[mid] = 1; beatSoon(); } }
  function MS(mid) { var m = S.missions[mid]; if (!m) m = S.missions[mid] = { step: 0, done: {}, checks: {}, answers: {}, updated: 0 }; ['done', 'checks', 'answers'].forEach(function (k) { if (!m[k]) m[k] = {}; }); return m; }
  RL.state = function (mid) { return MS(mid); };
  function firstName() { return session ? String(session.name).split(' ')[0] : 'engineer'; }
  RL.session = function () { return session; };

  /* ---------- sync: where I am + progress ---------- */
  var status = { view: 'home' }, lastBeat = 0, beatTimer = null;
  function beatBody(away) {
    var prog = {}; Object.keys(dirty).forEach(function (k) { if (S.missions[k]) prog[k] = S.missions[k]; }); dirty = {};
    return { kind: 'beat', 'class': session.klass, name: session.name, token: session.token, device: deviceId(), status: Object.assign({ away: !!away }, status), progress: prog, sent: Date.now() };
  }
  function beat(beacon) { if (!session || preview || !A.enabled) return; lastBeat = Date.now(); A.beat(beatBody(document.visibilityState === 'hidden'), beacon); }
  function beatSoon() { if (beatTimer) return; beatTimer = setTimeout(function () { beatTimer = null; beat(); }, 2500); }
  function setStatus(st) { status = st; beatSoon(); }
  setInterval(function () { if (session && document.visibilityState === 'visible' && Date.now() - lastBeat > 25000) beat(); }, 5000);
  document.addEventListener('visibilitychange', function () { beat(document.visibilityState === 'hidden'); });
  root.addEventListener('pagehide', function () { beat(true); });

  /* ---------- top bar ---------- */
  function drawTop(crumbs) {
    topbar.innerHTML = '';
    var b = el('a', 'brand', '<b>Robotics Lab</b><span>' + esc(cfg.room || '') + '</span>'); b.href = '#/'; topbar.appendChild(b);
    var cr = el('div', 'crumbs'); cr.innerHTML = crumbs || ''; topbar.appendChild(cr);
    var who = el('div', 'who');
    if (session) {
      var dot = el('span', 'netdot' + (A.ok === true ? ' ok' : A.ok === false ? ' bad' : '')); dot.title = A.ok === false ? 'Not connected — your work is saved on this device and will sync' : 'Connected';
      if (!preview) who.appendChild(dot);
      who.appendChild(el('span', '', esc(preview ? 'Preview' : session.name)));
      if (!preview) { var so = el('button', 'btn btn-ghost btn-small', 'Sign out'); so.type = 'button'; so.addEventListener('click', signOut); who.appendChild(so); }
    }
    topbar.appendChild(who);
  }
  A.onStatus(function () { var d = topbar && topbar.querySelector('.netdot'); if (d) d.className = 'netdot' + (A.ok ? ' ok' : ' bad'); });

  /* ---------- sign-in ---------- */
  function signOut() { beat(true); ls('session', null); session = null; location.hash = '#/'; boot(); }
  function signInView(prefill) {
    document.body.className = 'signin';
    drawTop('');
    view.innerHTML = '';
    var wrap = el('div', 'signin-wrap blueprint');
    var box = el('div', 'signin-box panel cut');
    box.innerHTML = '<div class="label c">Mission control</div><h1>Sign in</h1><p class="muted">Use the class code your teacher gave you.</p>';
    var f = el('form', 'signin-form');
    f.innerHTML = '<label class="label" for="cc">Class code</label><div class="row"><input id="cc" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. robotics-a"><button class="btn btn-primary" type="submit">Next</button></div><p class="err small" aria-live="polite"></p>';
    box.appendChild(f); wrap.appendChild(box); view.appendChild(wrap);
    var inp = f.querySelector('#cc'), err = f.querySelector('.err');
    inp.value = prefill || ls('lastClass') || '';
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var code = inp.value.trim(); if (!code) return;
      err.textContent = 'Checking…';
      A.get('roster', { 'class': code }).then(function (r) {
        if (!r || !r.ok) { err.textContent = 'That class code wasn’t found. Check it and try again.'; return; }
        ls('lastClass', code); pickName(r);
      }, function () { err.textContent = 'Can’t reach the class server. Check your internet connection.'; });
    });
    setTimeout(function () { inp.focus(); }, 50);
  }
  function pickName(r) {
    view.innerHTML = '';
    var wrap = el('div', 'signin-wrap blueprint'), box = el('div', 'signin-box panel cut wide');
    box.innerHTML = '<div class="label c">' + esc(r.label) + '</div><h1>Who are you?</h1>';
    var list = el('div', 'name-list');
    r.names.forEach(function (n) {
      var b = el('button', 'name-btn', esc(n.name) + (n.pin ? '' : '<span class="tag c">new</span>')); b.type = 'button';
      b.addEventListener('click', function () { pinView(r, n); });
      list.appendChild(b);
    });
    if (!r.names.length) list.appendChild(el('p', 'muted', 'Your teacher hasn’t added names to this class yet.'));
    box.appendChild(list);
    var back = el('button', 'btn btn-ghost btn-small', 'Back'); back.type = 'button'; back.addEventListener('click', function () { signInView(r.show); }); box.appendChild(back);
    wrap.appendChild(box); view.appendChild(wrap);
  }
  function pinView(r, n) {
    view.innerHTML = '';
    var wrap = el('div', 'signin-wrap blueprint'), box = el('div', 'signin-box panel cut');
    var making = !n.pin;
    box.innerHTML = '<div class="label c">' + esc(r.label) + '</div><h1>' + esc(n.name) + '</h1><p class="muted">' + (making ? 'Make a 4-digit PIN. You’ll use it every time you sign in, so pick one you’ll remember.' : 'Enter your 4-digit PIN.') + '</p>';
    var f = el('form', 'signin-form');
    f.innerHTML = '<label class="label" for="pin">' + (making ? 'New PIN' : 'PIN') + '</label><div class="row"><input id="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="off"><button class="btn btn-primary" type="submit">' + (making ? 'Save PIN' : 'Sign in') + '</button></div>' +
      (making ? '<label class="label" for="pin2">Type it again</label><div class="row"><input id="pin2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>' : '') +
      '<p class="err small" aria-live="polite"></p>' + (making ? '' : '<p class="small muted">Forgot it? Ask your teacher to reset your PIN.</p>');
    box.appendChild(f);
    var back = el('button', 'btn btn-ghost btn-small', 'Not you?'); back.type = 'button'; back.addEventListener('click', function () { pickName(r); }); box.appendChild(back);
    wrap.appendChild(box); view.appendChild(wrap);
    var p1 = f.querySelector('#pin'), p2 = f.querySelector('#pin2'), err = f.querySelector('.err');
    setTimeout(function () { p1.focus(); }, 50);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^\d{4}$/.test(p1.value)) { err.textContent = 'Your PIN is 4 digits.'; return; }
      if (making && p1.value !== p2.value) { err.textContent = 'Those two PINs don’t match.'; return; }
      err.textContent = making ? 'Saving…' : 'Signing in…';
      A.get(making ? 'setpin' : 'signin', { 'class': r.code, name: n.name, pin: p1.value, device: deviceId() }).then(function (x) {
        if (!x || !x.ok) {
          err.textContent = x && x.error === 'locked' ? 'Too many tries. Wait 10 minutes or ask your teacher.' : x && x.error === 'haspin' ? 'You already have a PIN — go back and sign in.' : 'That PIN isn’t right.';
          return;
        }
        session = { klass: r.code, name: x.name, token: x.token, label: r.label };
        ls('session', JSON.stringify(session));
        loadState(); route(); refresh();
      }, function () { err.textContent = 'Can’t reach the class server.'; });
    });
  }

  /* ---------- data from the backend ---------- */
  function refresh() {
    if (!session || preview || !A.enabled) return Promise.resolve();
    return A.get('me', { 'class': session.klass, name: session.name, token: session.token }).then(function (d) {
      if (!d || !d.ok) { if (d && d.error === 'badtoken') { toast('Please sign in again.', true); signOut(); } return; }
      D.cal = d.cal ? C.clean(d.cal) : null; D.noSchool = d.noSchool || []; D.subs = d.subs || {}; D.label = d.label || '';
      // progress from the server wins when it's newer (work on another device)
      Object.keys(d.progress || {}).forEach(function (k) { var srv = d.progress[k], mine = S.missions[k]; if (srv && (!mine || (srv.updated || 0) > (mine.updated || 0))) S.missions[k] = srv; });
      ls(stateKey(), JSON.stringify(S)); ls('data:' + session.klass, JSON.stringify(D));
      if (!cur.mission) renderHome(true); else if (cur.step === lastIdx()) renderStep();
    }).catch(function () {});
  }
  setInterval(function () { if (session && !preview && document.visibilityState === 'visible' && !cur.mission) refresh(); }, 120000);

  /* ---------- home ---------- */
  function missionStatus(m) {
    var sub = D.subs[m.id], st = S.missions[m.id], g = RL.guides[m.id];
    if (sub) {
      if (sub.status === 'graded') return { cls: 'go', text: 'Graded' };
      if (sub.status === 'revise') return { cls: 'sig', text: 'Revise & resubmit' };
      return { cls: 'c', text: 'Submitted' };
    }
    if (!m.ready || !g) return { cls: '', text: 'In development' };
    var n = g.steps.length, done = st ? Object.keys(st.done).length : 0;
    if (!done) return { cls: '', text: 'Not started' };
    return { cls: 'c', text: 'Step ' + Math.min(n, done + 1) + ' of ' + n };
  }
  function renderHome(keepScroll) {
    var y = keepScroll ? root.scrollY : 0;
    cur.mission = null; document.body.className = 'home';
    drawTop('<span class="cur">' + esc(D.label || (session && session.label) || 'Missions') + '</span>');
    setStatus({ view: 'home', label: 'Home page' });
    view.innerHTML = '';
    var wrap = el('div', 'home-wrap');
    var hh = el('div', 'home-head');
    var left = el('div', 'hh-left', '<div class="label">' + esc(new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })) + '</div><h1>Hi, ' + esc(firstName()) + '.</h1>');
    var right = el('div', 'hh-right');
    var today = C.today(), nd = D.cal ? C.nextDue(D.cal, D.noSchool, today) : null;
    if (nd) {
      var when = nd.due === today ? 'today' : nd.inDays === 1 ? 'next class' : C.nice(nd.due);
      var chip = el('button', 'due-chip' + (nd.inDays <= 1 ? ' soon' : ''), '<span class="label">' + (nd.inDays <= 1 ? 'Due ' + esc(when) : 'Next due') + '</span><b>Mission ' + esc(nd.info.num) + ': ' + esc(nd.info.title) + '</b><span class="dc-when">' + (nd.inDays <= 1 ? '' : esc(when) + ' · ' + nd.inDays + ' class' + (nd.inDays === 1 ? '' : 'es') + ' left') + '</span>');
      chip.type = 'button'; chip.title = 'Open the class calendar';
      chip.addEventListener('click', function () { openCalendar(nd.due); });
      right.appendChild(chip);
    }
    var cb = el('button', 'btn btn-ghost cal-btn', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5"/></svg><span>Calendar</span>'); cb.type = 'button';
    cb.addEventListener('click', function () { openCalendar(); });
    right.appendChild(cb);
    hh.appendChild(left); hh.appendChild(right); wrap.appendChild(hh);
    if (preview) wrap.appendChild(el('div', 'callout plain small', '<span class="label">Preview mode</span>' + (A.enabled ? 'You’re viewing the site as a student would. Progress is saved on this device only and nothing is sent to the class records.' : 'No class server is connected yet, so progress is saved on this device only.')));
    // today strip
    var on = D.cal ? C.on(D.cal, D.noSchool, today) : [];
    if (on.length) {
      var t = on[0], i = C.info(t.k);
      var strip = el('a', 'today-strip', '<span class="label c">Today</span><span>Mission ' + esc(i.num) + ' · ' + esc(i.title) + ' — <b>day ' + t.day + ' of ' + t.len + '</b></span><span class="ts-go">Open →</span>');
      strip.href = '#/m/' + t.k; wrap.appendChild(strip);
    }
    RL.UNITS.forEach(function (u) {
      var sec = el('section', 'unit'); sec.style.setProperty('--u', RL.unitColour(u.n));
      var uh = el('div', 'unit-h', '<div class="unit-n">' + (u.n < 10 ? '0' : '') + u.n + '</div><div class="unit-t"><div class="label">Unit ' + (u.n < 10 ? '0' : '') + u.n + '</div><h2>' + esc(u.title) + '</h2><p class="small muted">' + esc(u.blurb) + '</p></div>');
      sec.appendChild(uh);
      if (u.soon || !u.missions.length) { sec.appendChild(el('div', 'unit-soon small muted', 'Missions for this unit will appear here.')); wrap.appendChild(sec); return; }
      var grid = el('div', 'mission-grid');
      var L = D.cal ? C.layout(D.cal, D.noSchool) : null;
      u.missions.forEach(function (id) {
        var m = RL.MISSIONS[id]; if (!m) return;
        var ready = m.ready && RL.guides[id], st = missionStatus(m), span = L && L.span[id];
        var card = el(ready ? 'a' : 'div', 'mcard' + (ready ? ' ready' : ' planned') + (on.length && on[0].k === id ? ' active' : ''));
        if (ready) card.href = '#/m/' + id;
        var dates = span ? '<span class="mc-dates">' + (span.start === span.end ? C.nice(span.start) : C.nice(span.start, { month: 'short', day: 'numeric' }) + ' – ' + C.nice(span.end)) + '</span>' : '<span class="mc-dates">' + m.days + ' class' + (m.days === 1 ? '' : 'es') + '</span>';
        var g = RL.guides[id], prog = '';
        if (ready) { var n = g.steps.length, dn = S.missions[id] ? Object.keys(S.missions[id].done).length : 0; prog = '<div class="mc-bar" role="img" aria-label="' + dn + ' of ' + n + ' steps done"><i style="width:' + Math.round(100 * Math.min(1, dn / n)) + '%"></i></div>'; }
        card.innerHTML = '<div class="mc-top"><span class="label">Mission ' + esc(m.num) + '</span>' + dates + '</div><h3>' + esc(m.title) + '</h3><p class="small">' + esc(m.tagline) + '</p>' +
          '<div class="mc-parts">' + (m.parts || []).slice(0, 4).map(function (p) { return '<span class="tag">' + esc(p) + '</span>'; }).join('') + '</div>' + prog +
          '<div class="mc-foot"><span class="tag ' + st.cls + '">' + esc(st.text) + '</span>' + (ready ? '<span class="mc-go">' + (st.text === 'Not started' ? 'Start' : 'Open') + ' →</span>' : '') + '</div>';
        grid.appendChild(card);
      });
      sec.appendChild(grid); wrap.appendChild(sec);
    });
    view.appendChild(wrap);
    if (keepScroll) root.scrollTo(0, y);
  }

  /* ---------- calendar pop-up ---------- */
  function openCalendar(date) {
    closeModal();
    var ov = el('div', 'modal'); ov.id = 'modal'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Class calendar');
    var box = el('div', 'modal-box cal-modal'), h = el('div', 'modal-h', '<h2>Class calendar</h2>');
    var x = el('button', 'btn btn-ghost iconbtn', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', closeModal); h.appendChild(x);
    box.appendChild(h);
    var b = el('div', 'modal-b cal-b');
    if (!D.cal) b.appendChild(el('p', 'muted', 'Your teacher hasn’t put up the class calendar yet.'));
    else {
      var v = C.view(D.cal, { off: D.noSchool, chip: function (k, slot) { var m = RL.MISSIONS[k]; return C.chip(k, slot, m && m.ready && RL.guides[k] ? '#/m/' + k : null); } });
      b.appendChild(v);
      b.appendChild(el('p', 'small muted', 'Each mission runs for several classes and is due on its last day. Dates can change — this always shows the latest plan.'));
      v.querySelectorAll('a.calv-chip').forEach(function (a) { a.addEventListener('click', closeModal); });
      requestAnimationFrame(function () { v.scrollToDate(date || C.today()); if (date) setTimeout(function () { v.flashDate(date); }, 150); });
    }
    box.appendChild(b); ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    document.addEventListener('keydown', escClose);
    document.body.appendChild(ov);
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() { var m = document.getElementById('modal'); if (m) m.remove(); document.removeEventListener('keydown', escClose); }
  RL.closeModal = closeModal;

  /* ---------- mission ---------- */
  function guide() { return RL.guides[cur.mission]; }
  function lastIdx() { var g = guide(); return g ? g.steps.length - 1 : 0; }
  function openMission(mid, stepNo) {
    var g = RL.guides[mid], m = RL.MISSIONS[mid];
    if (!g || !m) { location.hash = '#/'; return; }
    var fresh = cur.mission !== mid; cur.mission = mid;
    var ms = MS(mid);
    var idx = stepNo != null ? Math.max(0, Math.min(g.steps.length - 1, stepNo - 1)) : (ms.step || 0);
    cur.step = idx; ms.step = idx; saveState();
    document.body.className = 'mission';
    drawTop('<a href="#/">Missions</a><span class="sep">/</span><span class="cur">Mission ' + esc(m.num) + ' · ' + esc(m.title) + '</span>');
    if (fresh || !document.querySelector('.ms-wrap')) buildMissionFrame(m, g);
    renderNav(); renderStep();
  }
  function buildMissionFrame(m, g) {
    view.innerHTML = '';
    var wrap = el('div', 'ms-wrap');
    var side = el('nav', 'ms-side'); side.setAttribute('aria-label', 'Steps');
    side.innerHTML = '<div class="ms-side-h"><div class="label">Unit 0' + m.unit + ' · Mission ' + esc(m.num) + '</div><h2>' + esc(m.title) + '</h2><div class="ms-prog"></div></div><ol class="ms-steps"></ol>';
    var tog = el('button', 'btn btn-ghost btn-small ms-toggle', 'Steps'); tog.type = 'button'; tog.setAttribute('aria-expanded', 'false');
    tog.addEventListener('click', function () { var o = wrap.classList.toggle('nav-open'); tog.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    var main = el('main', 'ms-main'); main.id = 'ms-main';
    wrap.appendChild(tog); wrap.appendChild(side); wrap.appendChild(main);
    view.appendChild(wrap);
  }
  function renderNav() {
    var g = guide(), ms = MS(cur.mission), ol = document.querySelector('.ms-steps'); if (!ol) return;
    ol.innerHTML = '';
    g.steps.forEach(function (s, i) {
      var li = el('li'), a = el('a', 'ms-step' + (i === cur.step ? ' on' : '') + (ms.done[s.id] ? ' done' : ''));
      a.href = '#/m/' + cur.mission + '/' + (i + 1);
      a.innerHTML = '<span class="n">' + (ms.done[s.id] ? '<svg viewBox="0 0 16 16" aria-label="done"><path d="M3 8.5l3 3 7-7"/></svg>' : (i < 9 ? '0' : '') + (i + 1)) + '</span><span class="t">' + esc(s.title) + '</span>' + (s.stage ? '<span class="st">' + esc(s.stage) + '</span>' : '');
      if (i === cur.step) a.setAttribute('aria-current', 'step');
      a.addEventListener('click', function () { document.querySelector('.ms-wrap').classList.remove('nav-open'); });
      li.appendChild(a); ol.appendChild(li);
    });
    var n = g.steps.length, dn = Object.keys(ms.done).filter(function (k) { return g.steps.some(function (s) { return s.id === k; }); }).length;
    var p = document.querySelector('.ms-prog'); if (p) p.innerHTML = '<div class="mc-bar"><i style="width:' + Math.round(100 * dn / n) + '%"></i></div><span class="label">' + dn + ' / ' + n + ' steps</span>';
  }
  var cleanup = [];
  RL.onLeave = function (fn) { cleanup.push(fn); };
  function runCleanup() { cleanup.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function renderStep() {
    runCleanup();
    var g = guide(), m = RL.MISSIONS[cur.mission], s = g.steps[cur.step], ms = MS(cur.mission), main = document.getElementById('ms-main');
    if (!main) return;
    main.innerHTML = '';
    var head = el('header', 'step-h');
    head.innerHTML = '<div class="label">Step ' + (cur.step < 9 ? '0' : '') + (cur.step + 1) + ' / ' + (g.steps.length < 10 ? '0' : '') + g.steps.length + (s.stage ? ' · <span class="c">' + esc(s.stage) + '</span>' : '') + (s.time ? ' · ' + esc(s.time) : '') + '</div><h1>' + esc(s.title) + '</h1>';
    main.appendChild(head);
    var body = el('div', 'step-b'); main.appendChild(body);
    var ctx = makeCtx(body);
    try { if (s.submit) renderSubmit(body, m, g, ctx); else s.render(body, ctx); }
    catch (e) { body.appendChild(el('div', 'callout safety', '<span class="label">Error</span>This step couldn’t load: ' + esc(e.message))); if (root.console) console.error(e); }
    // footer
    var foot = el('div', 'step-foot');
    var prev = el('a', 'btn btn-ghost', '← Back'); if (cur.step > 0) prev.href = '#/m/' + cur.mission + '/' + cur.step; else { prev.href = '#/'; prev.textContent = '← Missions'; }
    foot.appendChild(prev);
    if (!s.submit) {
      var isDone = !!ms.done[s.id];
      var nxt = el('button', 'btn btn-primary', cur.step < g.steps.length - 1 ? (isDone ? 'Next step →' : 'Done — next step →') : 'Done'); nxt.type = 'button';
      nxt.addEventListener('click', function () {
        if (s.gate && !isDone) { var why = s.gate(ctx); if (why) { toast(why, true); return; } }
        ms.done[s.id] = Date.now(); ms.updated = Date.now(); saveState(cur.mission);
        if (cur.step < g.steps.length - 1) location.hash = '#/m/' + cur.mission + '/' + (cur.step + 2); else { renderNav(); renderStep(); }
      });
      foot.appendChild(nxt);
    }
    main.appendChild(foot);
    setStatus({ view: 'mission', mission: cur.mission, step: cur.step + 1, label: 'Mission ' + m.num + ' · Step ' + (cur.step + 1) + ': ' + s.title });
    root.scrollTo(0, 0);
  }
  function makeCtx(body) {
    var mid = cur.mission, ms = MS(mid);
    return {
      mission: mid, body: body, state: ms,
      save: function () { ms.updated = Date.now(); saveState(mid); },
      answer: function (id, v) { if (v === undefined) return ms.answers[id] || ''; ms.answers[id] = String(v).slice(0, 4000); ms.updated = Date.now(); saveState(mid); },
      check: function (id, v) { if (v === undefined) return ms.checks[id]; ms.checks[id] = v; ms.updated = Date.now(); saveState(mid); }
    };
  }

  /* ---------- evidence (the last step of every mission) ---------- */
  var UP = {}; // files picked but not yet submitted: { key: [{ blob, name, kind, thumb }] }
  function renderSubmit(body, m, g, ctx) {
    var ev = g.evidence || {}, sub = D.subs[m.id], ms = ctx.state;
    if (sub) body.appendChild(subStatus(sub, m));
    body.appendChild(el('p', 'lead', esc(ev.intro || 'Show what you built. Your teacher grades this mission from what you hand in here.')));
    if (m.criteria) {
      var rb = el('div', 'crit panel');
      rb.innerHTML = '<div class="label">How this mission is graded</div>' + m.criteria.map(function (c) { return '<div class="crit-row"><b>' + esc(c.name) + '</b><span class="small muted">' + esc(c.desc) + '</span></div>'; }).join('');
      body.appendChild(rb);
    }
    var form = el('div', 'ev-form');
    (ev.files || []).forEach(function (spec) { form.appendChild(fileSlot(spec, m.id)); });
    if (ev.questions && ev.questions.length) {
      var q = el('div', 'ev-q'); q.appendChild(el('h2', '', 'Reflect'));
      ev.questions.forEach(function (x, i) {
        var lab = el('label', 'ev-ql', '<span class="label">Question ' + (i + 1) + '</span><span>' + esc(x.q) + '</span>'); lab.htmlFor = 'rq-' + x.id;
        var ta = el('textarea'); ta.id = 'rq-' + x.id; ta.value = ctx.answer('r:' + x.id) || (sub && sub.reflections && sub.reflections[x.id]) || ''; ta.rows = 3;
        ta.addEventListener('input', function () { ctx.answer('r:' + x.id, ta.value); });
        q.appendChild(lab); q.appendChild(ta);
      });
      form.appendChild(q);
    }
    body.appendChild(form);
    var bar = el('div', 'ev-submit');
    var go = el('button', 'btn btn-primary', sub ? 'Update my submission' : 'Submit my work'); go.type = 'button';
    var msg = el('div', 'ev-msg small', '');
    bar.appendChild(go); bar.appendChild(msg); body.appendChild(bar);
    go.addEventListener('click', function () { submitWork(m, g, ctx, go, msg); });
  }
  function subStatus(sub, m) {
    var box = el('div', 'sub-status panel cut');
    var tag = sub.status === 'graded' ? '<span class="tag go">Graded</span>' : sub.status === 'revise' ? '<span class="tag sig">Revise &amp; resubmit</span>' : '<span class="tag c">Submitted</span>';
    var html = '<div class="ss-top">' + tag + '<span class="small muted">Version ' + (sub.version || 1) + ' · ' + esc(new Date(sub.submitted).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</span></div>';
    if (sub.thumbs && sub.thumbs.length) html += '<div class="ss-thumbs brackets">' + sub.thumbs.map(function (t) { return '<img alt="" src="' + t + '">'; }).join('') + '</div>';
    html += '<div class="small muted">' + (sub.files || []).map(function (f) { return esc(f.name); }).join(' · ') + '</div>';
    if (sub.status === 'graded' || sub.status === 'revise') {
      if (sub.levels && m.criteria) html += '<div class="ss-levels">' + m.criteria.map(function (c) { var lv = sub.levels[c.id]; var L = RL.LEVELS.filter(function (x) { return x.id === lv; })[0]; return '<div><span class="label">' + esc(c.name) + '</span><b>' + esc(L ? L.name : '—') + '</b></div>'; }).join('') + '</div>';
      if (sub.comment) html += '<div class="callout"><span class="label">Feedback</span>' + esc(sub.comment).replace(/\n/g, '<br>') + '</div>';
    } else html += '<p class="small muted" style="margin:8px 0 0">Your teacher hasn’t graded it yet. You can still update it below.</p>';
    box.innerHTML = html; return box;
  }
  function fileSlot(spec, mid) {
    var key = spec.id, box = el('div', 'ev-slot panel');
    var accept = spec.kind === 'photo' ? 'image/*' : spec.kind === 'video' ? 'video/*' : spec.kind === 'code' ? '.ino,.txt,.cpp,.h,text/plain' : '*/*';
    box.innerHTML = '<div class="ev-sh"><div><span class="label">' + esc(spec.kind) + (spec.required ? ' · required' : ' · optional') + '</span><h3>' + esc(spec.label) + '</h3><p class="small muted">' + esc(spec.help || '') + '</p></div></div>';
    var list = el('div', 'ev-files'); box.appendChild(list);
    var row = el('div', 'ev-row');
    var inp = el('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = (spec.max || 1) > 1; inp.className = 'sr'; inp.id = 'f-' + key;
    var pick = el('label', 'btn btn-ghost', spec.kind === 'photo' ? 'Add photo' : spec.kind === 'video' ? 'Add video' : 'Add file'); pick.htmlFor = inp.id; pick.tabIndex = 0;
    pick.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    row.appendChild(inp); row.appendChild(pick);
    if (spec.kind === 'code') {
      var pb = el('button', 'btn btn-ghost', 'Paste code instead'); pb.type = 'button'; row.appendChild(pb);
      var ta = el('textarea', 'ev-paste hide'); ta.placeholder = 'Paste your whole sketch here'; ta.spellcheck = false;
      pb.addEventListener('click', function () { ta.classList.toggle('hide'); if (!ta.classList.contains('hide')) ta.focus(); });
      ta.addEventListener('input', function () { var arr = (UP[key] || []).filter(function (f) { return !f.pasted; }); if (ta.value.trim()) arr.push({ blob: new Blob([ta.value], { type: 'text/plain' }), name: (spec.fileName || 'sketch') + '.ino', kind: 'code', pasted: true }); UP[key] = arr; draw(); });
      box.appendChild(row); box.appendChild(ta);
    } else box.appendChild(row);
    function draw() {
      list.innerHTML = '';
      (UP[key] || []).forEach(function (f, i) {
        var it = el('div', 'ev-file');
        it.innerHTML = (f.thumb ? '<img alt="" src="' + f.thumb + '">' : '<span class="ev-ic">' + (f.kind === 'code' ? '{ }' : f.kind === 'video' ? '▶' : '■') + '</span>') + '<span class="small">' + esc(f.name) + '<br><span class="muted">' + sizeStr(f.blob.size) + '</span></span>';
        var x = el('button', 'btn btn-ghost btn-small', 'Remove'); x.type = 'button'; x.addEventListener('click', function () { UP[key].splice(i, 1); draw(); });
        it.appendChild(x); list.appendChild(it);
      });
    }
    inp.addEventListener('change', function () {
      var files = Array.prototype.slice.call(inp.files || []); inp.value = '';
      var max = spec.max || 1, arr = UP[key] || [];
      files.forEach(function (file) {
        if (arr.length >= max) { toast('Up to ' + max + ' ' + spec.kind + (max === 1 ? '' : 's') + ' here.', true); return; }
        if (spec.kind === 'video' && file.size > 250 * 1024 * 1024) { toast('That video is too big (over 250 MB). Record a shorter clip.', true); return; }
        if (file.size > 300 * 1024 * 1024) { toast('That file is too big.', true); return; }
        var rec = { blob: file, name: file.name, kind: spec.kind };
        arr.push(rec);
        if (spec.kind === 'photo') shrinkImage(file, 1600, 0.85).then(function (b) { rec.blob = b; rec.name = file.name.replace(/\.\w+$/, '') + '.jpg'; return shrinkImage(file, 160, 0.6); }).then(function (t) { return blobToData(t); }).then(function (d) { rec.thumb = d; draw(); }).catch(function () { draw(); });
        if (spec.kind === 'video') videoThumb(file).then(function (d) { rec.thumb = d; draw(); }).catch(function () {});
      });
      UP[key] = arr; draw();
    });
    draw();
    return box;
  }
  function sizeStr(n) { return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function blobToData(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(b); }); }
  function shrinkImage(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('image')); }, 'image/jpeg', q);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  function videoThumb(file) {
    return new Promise(function (res, rej) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), done = false;
      v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
      v.addEventListener('loadeddata', function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { rej(e); } });
      v.addEventListener('seeked', function () {
        if (done) return; done = true;
        var s = 160 / Math.max(v.videoWidth || 160, v.videoHeight || 160), c = document.createElement('canvas'); c.width = Math.round((v.videoWidth || 200) * s); c.height = Math.round((v.videoHeight || 150) * s);
        try { c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.6)); } catch (e) { rej(e); }
        URL.revokeObjectURL(url);
      });
      v.addEventListener('error', function () { URL.revokeObjectURL(url); rej(new Error('video')); });
      setTimeout(function () { if (!done) { done = true; URL.revokeObjectURL(url); rej(new Error('timeout')); } }, 8000);
    });
  }
  function submitWork(m, g, ctx, btn, msg) {
    var ev = g.evidence || {}, sub = D.subs[m.id];
    var missing = (ev.files || []).filter(function (s) { return s.required && !(UP[s.id] || []).length && !(sub && (sub.files || []).some(function (f) { return f.slot === s.id; })); });
    if (missing.length) { toast('Add: ' + missing.map(function (s) { return s.label; }).join(', '), true); return; }
    var empty = (ev.questions || []).filter(function (q) { return !String(ctx.answer('r:' + q.id) || '').trim(); });
    if (empty.length) { toast('Answer all the reflection questions first.', true); return; }
    if (preview || !A.enabled) { toast('Preview mode: in class, this sends your files and answers to your teacher.'); return; }
    btn.disabled = true;
    var all = []; (ev.files || []).forEach(function (s) { (UP[s.id] || []).forEach(function (f) { all.push({ f: f, slot: s.id }); }); });
    var total = all.reduce(function (t, x) { return t + x.f.blob.size; }, 0) || 1, doneBytes = 0, out = [];
    function show(p) { msg.innerHTML = '<div class="up-bar"><i style="width:' + Math.round(p * 100) + '%"></i></div><span>Uploading… ' + Math.round(p * 100) + '%</span>'; }
    show(0);
    var chain = Promise.resolve();
    all.forEach(function (x) {
      chain = chain.then(function () {
        return A.upload(x.f.blob, x.f.name, session, m.id, x.f.kind, function (p) { show((doneBytes + p * x.f.blob.size) / total); })
          .then(function (r) { doneBytes += x.f.blob.size; r.slot = x.slot; out.push(r); });
      });
    });
    chain.then(function () {
      msg.textContent = 'Saving your submission…';
      var refl = {}; (ev.questions || []).forEach(function (q) { refl[q.id] = ctx.answer('r:' + q.id); });
      var thumbs = []; all.forEach(function (x) { if (x.f.thumb && thumbs.length < 3) thumbs.push(x.f.thumb); });
      var checks = {}; Object.keys(ctx.state.checks || {}).forEach(function (k) { checks[k] = ctx.state.checks[k]; });
      return A.post({ kind: 'submit', 'class': session.klass, name: session.name, token: session.token, mission: m.id, files: out, reflections: refl, thumbs: thumbs, checks: checks });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'The server didn’t accept it');
      D.subs[m.id] = r.sub; UP = {};
      var ms = ctx.state, s = g.steps[g.steps.length - 1]; ms.done[s.id] = Date.now(); ms.updated = Date.now(); saveState(m.id);
      toast('Submitted. Nice work!'); renderNav(); renderStep();
    }).catch(function (e) { btn.disabled = false; msg.innerHTML = '<span style="color:var(--signal)">Upload stopped: ' + esc(e.message) + '. Your files are still here — try again.</span>'; });
  }

  /* ---------- router ---------- */
  function route() {
    if (!session) { signInView(); return; }
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'm' && h[1]) { openMission(h[1], h[2] ? parseInt(h[2], 10) : null); return; }
    renderHome();
  }
  root.addEventListener('hashchange', function () { if (session) route(); });

  function boot() {
    view = document.getElementById('view'); topbar = document.getElementById('topbar');
    var q = new URLSearchParams(location.search);
    preview = q.has('preview') || !A.enabled;
    if (preview) { session = { klass: 'preview', name: 'Preview', token: '', label: 'Preview' }; }
    else { try { session = JSON.parse(ls('session') || 'null'); } catch (e) { session = null; } }
    if (session) {
      loadState();
      try { var cached = JSON.parse(ls('data:' + session.klass) || 'null'); if (cached) { D = cached; D.cal = D.cal ? C.clean(D.cal) : null; D.subs = D.subs || {}; } } catch (e) {}
    }
    if (preview && A.enabled && q.get('class')) {
      A.get('cal', { 'class': q.get('class') }).then(function (d) { if (d && d.ok) { D.cal = d.cal ? C.clean(d.cal) : null; D.noSchool = d.noSchool || []; if (!cur.mission) renderHome(true); } }).catch(function () {});
    }
    if (!session && q.get('c')) { signInView(q.get('c')); return; }
    route(); refresh();
  }
  RL.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
