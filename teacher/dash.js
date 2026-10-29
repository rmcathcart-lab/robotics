/* Robotics Lab Ledger — the teacher dashboard.
 * Tabs: Live (who's on and where) · Submissions (view + grade) · Progress (steps per mission) · Calendar · Equipment ·
 *   Comments (report cards, teacher/comments.js) · Roster.
 * Needs the teacher key from the Apps Script project (Project Settings → Script properties → TEACHER_KEY). */
(function (root) {
  'use strict';
  var RL = root.RL, A = RL.api, C = RL.Cal, cfg = root.RL_CONFIG || {};
  var el = RL.el, esc = RL.esc;
  RL.Dash = RL.Dash || {};
  var KEY = '', CLASSES = [], CUR = '', D = null, TAB = 'live', view, topbar, NS = [], SYNC = false, timers = [];
  var COURSES = [
    { mark: 'RL', name: 'Robotics Lab', colour: '#ff8a3d', ledger: 'https://rmcathcart-lab.github.io/robotics/teacher/' },
    { mark: '10C', name: 'Math 10C', colour: '#0f5f5a', ledger: 'https://rmcathcart-lab.github.io/math10c/teacher/' },
    { mark: '15', name: 'Math 15', colour: '#1e3a6e', ledger: 'https://rmcathcart-lab.github.io/math15/teacher/' }
  ];
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function toast(m, bad) { RL.toast ? RL.toast(m, bad) : alert(m); }
  RL.toast = function (msg, bad) { var t = el('div', 'toast' + (bad ? ' bad' : ''), esc(msg)); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3600); };
  function get(action, p) { return A.get(action, Object.assign({ key: KEY }, p || {})); }
  function post(body) { return A.post(Object.assign({ key: KEY }, body)); }
  function ago(ms) { if (!ms) return 'never'; var s = Math.round((Date.now() - ms) / 1000); if (s < 60) return 'just now'; var m = Math.round(s / 60); if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; var d = Math.round(h / 24); return d + ' day' + (d === 1 ? '' : 's') + ' ago'; }
  function dur(ms) { var m = Math.round(ms / 60000); return m < 1 ? '<1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function lvlName(id) { var L = RL.LEVELS.filter(function (x) { return x.id === id; })[0]; return L ? L.name : '—'; }
  function readyMissions() { return RL.missionList().filter(function (m) { return m.ready && RL.guides[m.id]; }); }

  /* ---------- shell ---------- */
  function drawTop() {
    topbar.innerHTML = '';
    var c = el('div', 'course');
    var b = el('button', 'course-btn', '<span class="course-robot">' + RL.ROBOT + '</span><span class="brand"><b>Robotics Lab</b><span>Teacher ledger</span></span>'); b.type = 'button';
    b.addEventListener('click', function (e) { e.stopPropagation(); var m = c.querySelector('.course-menu'); if (m) { m.remove(); return; } var menu = el('div', 'course-menu'); COURSES.forEach(function (x) { var a = el('a', '', (x.mark === 'RL' ? '<span class="m robot-m">' + RL.ROBOT + '</span>' : '<span class="m" style="background:' + x.colour + '">' + esc(x.mark) + '</span>') + esc(x.name)); a.href = x.ledger; menu.appendChild(a); }); c.appendChild(menu); });
    document.addEventListener('click', function () { var m = c.querySelector('.course-menu'); if (m) m.remove(); });
    c.appendChild(b); topbar.appendChild(c);
    if (!KEY) return;
    var tabs = el('nav', 'dash-tabs');
    var toGrade = D ? D.subs.filter(function (s) { return s.status === 'submitted'; }).length : 0;
    var online = D ? Object.keys(D.live || {}).filter(function (n) { return Date.now() - D.live[n].at < 75000; }).length : 0;
    [['live', 'Live' + (online ? '<span class="cnt c">' + online + '</span>' : '')], ['subs', 'Submissions' + (toGrade ? '<span class="cnt">' + toGrade + '</span>' : '')], ['progress', 'Progress'], ['calendar', 'Calendar'], ['equipment', 'Equipment'], ['comments', 'Comments'], ['roster', 'Roster']].forEach(function (t) {
      var x = el('button', TAB === t[0] ? 'on' : '', t[1]); x.type = 'button'; x.addEventListener('click', function () { TAB = t[0]; ls('tab', TAB); render(); }); tabs.appendChild(x);
    });
    topbar.appendChild(tabs);
    var cp = el('div', 'classpick');
    if (CLASSES.length) {
      var sel = el('select'); sel.setAttribute('aria-label', 'Class');
      CLASSES.forEach(function (k) { var o = el('option', '', esc(k.label + ' (' + k.count + ')')); o.value = k.code; if (k.code === CUR) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { CUR = sel.value; ls('class', CUR); load(); });
      cp.appendChild(sel);
    }
    var pv = el('a', 'btn btn-ghost btn-small', 'Student view'); pv.href = '../index.html?preview=1' + (CUR ? '&class=' + encodeURIComponent(CUR) : ''); pv.target = '_blank'; pv.rel = 'noopener'; cp.appendChild(pv);
    topbar.appendChild(cp);
  }
  function keyView(msg) {
    drawTop(); view.innerHTML = '';
    var wrap = el('div', 'signin-wrap blueprint'), box = el('div', 'signin-box panel cut');
    box.innerHTML = '<div class="label c">Teacher ledger</div><h1>Teacher key</h1><p class="muted">' + (A.enabled ? 'Enter the teacher key from the Apps Script project (Project Settings → Script properties → TEACHER_KEY).' : 'No backend is set yet: put the Apps Script web-app URL in <code>js/config.js</code>.') + '</p>';
    var f = el('form', 'signin-form', '<div class="row"><input id="tk" type="password" autocomplete="off" aria-label="Teacher key"><button class="btn btn-primary" type="submit">Open</button></div><p class="err small">' + esc(msg || '') + '</p>');
    box.appendChild(f); wrap.appendChild(box); view.appendChild(wrap);
    f.addEventListener('submit', function (e) { e.preventDefault(); KEY = f.querySelector('#tk').value.trim(); start(); });
  }
  function start() {
    if (!KEY) { keyView(); return; }
    view.innerHTML = '<div class="loading">CONNECTING…</div>';
    get('classes').then(function (r) {
      if (!r || !r.ok) { KEY = ''; ls('tkey', null); keyView(r && r.error === 'bad key' ? 'That key didn’t work.' : 'Couldn’t connect.'); return; }
      ls('tkey', KEY); CLASSES = r.classes; SYNC = r.calSync; NS = r.noSchool || []; EQUIP = r.equip || {};
      if (!CLASSES.some(function (c) { return c.code === CUR; })) CUR = CLASSES[0] ? CLASSES[0].code : '';
      if (!CUR) { D = null; TAB = 'roster'; render(); return; }
      load();
    }, function () { keyView('Couldn’t reach the Apps Script backend.'); });
  }
  function load(quiet) {
    if (!CUR) { render(); return Promise.resolve(); }
    if (!quiet) view.innerHTML = '<div class="loading">LOADING ' + esc(CUR.toUpperCase()) + '…</div>';
    return get('dash', { 'class': CUR }).then(function (d) {
      if (!d || !d.ok) { toast((d && d.error) || 'Couldn’t load the class', true); return; }
      D = d; D.cal = d.cal ? C.clean(d.cal) : null; NS = d.noSchool || []; SYNC = d.calSync;
      if (!quiet || TAB !== 'calendar') render(); else drawTop();
    }, function () { if (!quiet) toast('Couldn’t reach the backend', true); });
  }
  function render() {
    timers.splice(0).forEach(clearInterval);
    drawTop(); view.innerHTML = '';
    if (!CUR && TAB !== 'roster' && TAB !== 'equipment') TAB = 'roster';
    ({ live: liveTab, subs: subsTab, progress: progTab, calendar: calTab, equipment: equipTab, comments: commentsTab, roster: rosterTab })[TAB]();
    var foot = el('footer', 'dash-foot'); foot.appendChild(RL.themeSwitch()); view.appendChild(foot);
  }

  /* ---------- Live ---------- */
  function liveState(rec) { if (!rec) return 'off'; var age = Date.now() - rec.at; if (age < 75000) return rec.away ? 'away' : 'on'; return 'off'; }
  function liveTab() {
    var head = el('div', 'dhead', '<div><div class="label">' + esc(D.label) + '</div><h1>Live</h1></div>');
    view.appendChild(head);
    var sum = el('div', 'live-sum'); view.appendChild(sum);
    var grid = el('div', 'live-grid'); view.appendChild(grid);
    function draw() {
      var live = D.live || {}, n = { on: 0, away: 0, off: 0 };
      var list = D.roster.map(function (s) { var r = live[s.name]; var st = liveState(r); n[st]++; return { s: s, r: r, st: st }; });
      list.sort(function (a, b) { var o = { on: 0, away: 1, off: 2 }; return o[a.st] - o[b.st] || a.s.name.localeCompare(b.s.name); });
      sum.innerHTML = '<div><span class="label">Working now</span><b style="color:var(--go)">' + n.on + '</b></div><div><span class="label">Tab hidden</span><b style="color:var(--signal)">' + n.away + '</b></div><div><span class="label">Offline</span><b>' + n.off + '</b></div><div><span class="label">Updated</span><b class="small" style="font-size:16px">' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + '</b></div>';
      grid.innerHTML = '';
      if (!list.length) grid.appendChild(el('div', 'empty', 'No students in this class yet — add them on the Roster tab.'));
      list.forEach(function (x) {
        var c = el('button', 'lcard ' + x.st); c.type = 'button';
        var where = x.st === 'off' ? '<span class="muted">Last seen ' + esc(ago(Math.max(x.s.lastSeen || 0, x.r ? x.r.at : 0))) + '</span>' : esc(x.r.label || x.r.view) + (x.st === 'away' ? ' <span class="tag sig">tab hidden</span>' : '');
        c.innerHTML = '<div class="nm"><span class="dot ' + x.st + '"></span>' + esc(x.s.name) + '</div><div class="where">' + where + '</div>' + (x.st !== 'off' ? '<div class="meta">HERE FOR ' + esc(dur(Date.now() - (x.r.since || x.r.at))).toUpperCase() + '</div>' : '');
        c.addEventListener('click', function () { studentModal(x.s.name); });
        grid.appendChild(c);
      });
    }
    draw();
    timers.push(setInterval(function () { get('live', { 'class': CUR }).then(function (r) { if (r && r.ok) { D.live = r.live; draw(); drawTop(); } }).catch(function () {}); }, 10000));
  }
  function studentModal(name) {
    var box = modal(name), b = box.body;
    var prog = (D.progress[name] || {}), subs = D.subs.filter(function (s) { return s.name === name; });
    var t = el('table', 'tbl'); t.innerHTML = '<thead><tr><th>Mission</th><th>Steps</th><th>Last worked</th><th>Submission</th></tr></thead>';
    var tb = el('tbody');
    readyMissions().forEach(function (m) {
      var p = prog[m.id], n = RL.guides[m.id].steps.length, dn = p ? p.done.length : 0, s = subs.filter(function (x) { return x.mission === m.id; })[0];
      var tr = el('tr', s ? 'click' : '', '<td>M' + m.num + ' · ' + esc(m.title) + '</td><td><span class="pbar"><i style="width:' + Math.round(100 * dn / n) + '%"></i></span>' + dn + '/' + n + (p ? ' · on step ' + p.step : '') + '</td><td>' + (p ? esc(ago(p.updated)) : '—') + '</td><td>' + (s ? statusTag(s) : '<span class="muted">—</span>') + '</td>');
      if (s) tr.addEventListener('click', function () { box.close(); gradeModal(s.id, [s.id]); });
      tb.appendChild(tr);
    });
    t.appendChild(tb); b.appendChild(t);
    var st = D.roster.filter(function (r) { return r.name === name; })[0];
    if (st) b.appendChild(el('p', 'small muted', 'PIN ' + (st.pin ? 'set' : 'not made yet') + ' · last seen ' + esc(ago(st.lastSeen)) + ' · ' + st.devices + ' device' + (st.devices === 1 ? '' : 's')));
  }
  function statusTag(s) { return s.status === 'graded' ? '<span class="tag go">Graded</span>' : s.status === 'revise' ? '<span class="tag sig">Revising</span>' : '<span class="tag c">' + (s.version > 1 ? 'Resubmitted' : 'To grade') + '</span>'; }

  /* ---------- modal helper ---------- */
  function modal(title, cls) {
    var ov = el('div', 'modal'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var box = el('div', 'modal-box ' + (cls || '')), h = el('div', 'modal-h', '<h2>' + esc(title) + '</h2>');
    var x = el('button', 'btn btn-ghost iconbtn', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); h.appendChild(x);
    var body = el('div', 'modal-b'); box.appendChild(h); box.appendChild(body); ov.appendChild(box); document.body.appendChild(ov);
    function close() { ov.remove(); document.removeEventListener('keydown', k); }
    function k(e) { if (e.key === 'Escape') close(); }
    x.addEventListener('click', close); ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); document.addEventListener('keydown', k);
    return { ov: ov, box: box, head: h, body: body, close: close, title: h.querySelector('h2') };
  }

  /* ---------- Submissions ---------- */
  var SUBF = { status: 'todo', mission: 'all' };
  function subsTab() {
    view.appendChild(el('div', 'dhead', '<div><div class="label">' + esc(D.label) + '</div><h1>Submissions</h1></div>'));
    var f = el('div', 'filters');
    var seg = el('div', 'seg');
    [['todo', 'To grade'], ['revise', 'Revising'], ['graded', 'Graded'], ['all', 'All'], ['missing', 'Not handed in']].forEach(function (s) { var b = el('button', SUBF.status === s[0] ? 'on' : '', s[1]); b.type = 'button'; b.addEventListener('click', function () { SUBF.status = s[0]; render(); }); seg.appendChild(b); });
    f.appendChild(seg);
    var ms = el('select'); ms.innerHTML = '<option value="all">All missions</option>' + readyMissions().map(function (m) { return '<option value="' + m.id + '"' + (SUBF.mission === m.id ? ' selected' : '') + '>Mission ' + m.num + ': ' + esc(m.title) + '</option>'; }).join('');
    ms.addEventListener('change', function () { SUBF.mission = ms.value; render(); }); f.appendChild(ms);
    view.appendChild(f);
    if (SUBF.status === 'missing') {
      var t0 = el('table', 'tbl'); t0.innerHTML = '<thead><tr><th>Student</th><th>Mission</th><th>Steps done</th><th>Due</th></tr></thead>'; var tb0 = el('tbody');
      var L = D.cal ? C.layout(D.cal, NS) : null, rows = 0;
      readyMissions().filter(function (m) { return SUBF.mission === 'all' || SUBF.mission === m.id; }).forEach(function (m) {
        D.roster.forEach(function (s) {
          if (D.subs.some(function (x) { return x.name === s.name && x.mission === m.id; })) return;
          var p = (D.progress[s.name] || {})[m.id], n = RL.guides[m.id].steps.length, due = L && L.span[m.id] ? L.span[m.id].end : null, late = due && due < C.today();
          tb0.appendChild(el('tr', '', '<td>' + esc(s.name) + '</td><td>M' + m.num + ' · ' + esc(m.title) + '</td><td><span class="pbar"><i style="width:' + (p ? Math.round(100 * p.done.length / n) : 0) + '%"></i></span>' + (p ? p.done.length : 0) + '/' + n + '</td><td>' + (due ? (late ? '<span class="tag sig">Past due</span> ' : '') + esc(C.nice(due)) : '—') + '</td>')); rows++;
        });
      });
      t0.appendChild(tb0); view.appendChild(rows ? t0 : el('div', 'empty', 'Everyone has handed in.'));
      return;
    }
    var list = D.subs.filter(function (s) { return (SUBF.mission === 'all' || s.mission === SUBF.mission) && (SUBF.status === 'all' || (SUBF.status === 'todo' ? s.status === 'submitted' : s.status === SUBF.status)); });
    list.sort(function (a, b) { return SUBF.status === 'todo' ? a.submitted - b.submitted : b.submitted - a.submitted; });
    if (!list.length) { view.appendChild(el('div', 'empty', SUBF.status === 'todo' ? 'Nothing waiting to be graded.' : 'No submissions here.')); return; }
    var t = el('table', 'tbl'); t.innerHTML = '<thead><tr><th>Student</th><th>Mission</th><th>Handed in</th><th>Files</th><th>Status</th><th>Grade</th></tr></thead>';
    var tb = el('tbody'), ids = list.map(function (s) { return s.id; });
    list.forEach(function (s) {
      var m = RL.MISSIONS[s.mission] || { num: '?', title: s.mission };
      var g = s.levels && Object.keys(s.levels).length ? Object.keys(s.levels).map(function (k) { return s.levels[k]; }).join(' · ') : '';
      var tr = el('tr', 'click', '<td><b>' + esc(s.name) + '</b></td><td>M' + m.num + ' · ' + esc(m.title) + '</td><td>' + esc(new Date(s.submitted).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + (s.version > 1 ? ' <span class="muted small">v' + s.version + '</span>' : '') + '</td><td>' + s.fileCount + '</td><td>' + statusTag(s) + '</td><td class="small mono">' + esc(g) + '</td>');
      tr.addEventListener('click', function () { gradeModal(s.id, ids); });
      tb.appendChild(tr);
    });
    t.appendChild(tb); view.appendChild(t);
  }
  function gradeModal(id, ids) {
    var M = modal('Loading…', 'grade-box');
    M.body.className = 'grade'; M.body.style.padding = '0';
    var nav = el('div', 'row2');
    var pos = ids.indexOf(id);
    var pv = el('button', 'btn btn-ghost btn-small', '← Prev'), nx = el('button', 'btn btn-ghost btn-small', 'Next →'); pv.type = nx.type = 'button';
    pv.disabled = pos <= 0; nx.disabled = pos < 0 || pos >= ids.length - 1;
    pv.addEventListener('click', function () { M.close(); gradeModal(ids[pos - 1], ids); }); nx.addEventListener('click', function () { M.close(); gradeModal(ids[pos + 1], ids); });
    nav.appendChild(pv); nav.appendChild(nx); M.head.insertBefore(nav, M.head.lastChild);
    get('sub', { id: id }).then(function (r) {
      if (!r || !r.ok) { M.body.innerHTML = '<p class="err">Couldn’t load it.</p>'; return; }
      var s = r.sub, m = RL.MISSIONS[s.mission] || { num: '?', title: s.mission, criteria: [] }, g = RL.guides[s.mission] || {};
      M.title.textContent = s.name + ' · Mission ' + m.num + ': ' + m.title;
      var media = el('div', 'g-media'), side = el('div', 'g-side');
      M.body.appendChild(media); M.body.appendChild(side);
      media.appendChild(el('div', 'label', 'Version ' + s.version + ' · handed in ' + esc(new Date(s.submitted).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))));
      var slots = {}; ((g.evidence || {}).files || []).forEach(function (f) { slots[f.id] = f.label; });
      if (!s.files.length) media.appendChild(el('div', 'empty', 'No files.'));
      s.files.forEach(function (f) {
        var box = el('div', 'g-file'); box.innerHTML = '<div class="label"><span>' + esc(slots[f.slot] || f.kind) + ' · ' + esc(f.name) + '</span><a href="https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view" target="_blank" rel="noopener">Open in Drive ↗</a></div>';
        var c = el('div', 'muted small', 'Loading…'); box.appendChild(c); media.appendChild(box);
        if (f.kind === 'video' || /^video\//.test(f.mime)) { c.innerHTML = ''; var fr = el('iframe'); fr.src = 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/preview'; fr.allow = 'autoplay'; fr.setAttribute('allowfullscreen', ''); c.appendChild(fr); c.appendChild(el('p', 'small muted', 'Videos play from your Google Drive (sign in with your school account). A new video can take a minute to process.')); return; }
        get('file', { id: f.id }).then(function (d) {
          c.innerHTML = '';
          if (d && d.data) { var img = el('img'); img.src = d.data; img.alt = f.name; c.appendChild(img); }
          else if (d && d.text != null) RL.Code.block(c, d.text, { name: s.name.replace(/\W+/g, '_') + '_' + s.mission });
          else c.innerHTML = '<a href="' + esc((d && d.url) || '#') + '" target="_blank" rel="noopener">Open the file</a>';
        }, function () { c.textContent = 'Couldn’t load this file.'; });
      });
      // reflections
      var rf = el('div', 'g-refl'); rf.appendChild(el('h3', '', 'Reflection'));
      ((g.evidence || {}).questions || []).forEach(function (q, i) { rf.appendChild(el('div', '', '<div class="q">' + (i + 1) + '. ' + esc(q.q) + '</div><div class="a">' + (esc(s.reflections[q.id] || '') || '<span class="muted">(blank)</span>') + '</div>')); });
      side.appendChild(rf);
      // notes from the guide + checkpoints
      var notes = Object.keys(s.answers || {}).filter(function (k) { return /^n-/.test(k) && String(s.answers[k]).trim(); });
      if (notes.length) { var nb = el('div', 'g-refl'); nb.appendChild(el('h3', '', 'Notes from the guide')); var lab = { 'n-res': 'Swapping resistors', 'n-design': 'Housing design decision', 'n-improve': 'Improvement challenge' }; notes.forEach(function (k) { nb.appendChild(el('div', '', '<div class="q">' + esc(lab[k] || (k.replace(/^n-/, '').replace(/[-_]/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }))) + '</div><div class="a">' + esc(s.answers[k]) + '</div>')); }); side.appendChild(nb); }
      var ck = s.checks || {}, qs = Object.keys(ck).filter(function (k) { return /^q-/.test(k); }), first = qs.filter(function (k) { return ck[k] && ck[k].first; }).length, done = qs.filter(function (k) { return ck[k] && ck[k].ok; }).length;
      var sims = Object.keys(ck).filter(function (k) { return /-pass$/.test(k); }).map(function (k) { return '<span class="tag ' + (ck[k] ? 'go' : 'sig') + '">' + esc(k.replace(/^sim-|-pass$/g, '')) + ' ' + (ck[k] ? 'PASS' : 'RETRY') + '</span>'; }).join('');
      side.appendChild(el('div', '', '<h3>Checkpoints</h3><p class="small" style="margin:4px 0 6px">' + done + ' answered correctly · ' + first + ' right on the first try · ' + s.done.length + ' / ' + (g.steps ? g.steps.length : '?') + ' steps done</p><div class="chips">' + sims + '</div>'));
      // grading
      var lv = Object.assign({}, s.levels || {});
      var cg = el('div', 'crit-g'); cg.appendChild(el('h3', '', 'Grade'));
      (m.criteria || []).forEach(function (c) {
        var row = el('div', 'row', '<b>' + esc(c.name) + '</b><div class="desc">' + esc(c.desc) + '</div>'), bs = el('div', 'lvls');
        RL.LEVELS.forEach(function (L) { var b = el('button', lv[c.id] === L.id ? 'on' : '', esc(L.name)); b.type = 'button'; b.title = L.name; b.addEventListener('click', function () { lv[c.id] = L.id; bs.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); bs.appendChild(b); });
        row.appendChild(bs); cg.appendChild(row);
      });
      side.appendChild(cg);
      var cl = el('label', '', '<h3>Feedback for the student</h3>'), ta = el('textarea'); ta.rows = 4; ta.value = s.comment || ''; ta.setAttribute('aria-label', 'Feedback'); cl.appendChild(ta); side.appendChild(cl);
      if (s.history && s.history.length) side.appendChild(el('details', 'small', '<summary>Earlier grades (' + s.history.length + ')</summary>' + s.history.map(function (h) { return '<p>v' + h.version + ' · ' + esc(h.status) + ' · ' + Object.keys(h.levels || {}).map(function (k) { return esc(k) + ': ' + esc(lvlName(h.levels[k])); }).join(', ') + (h.comment ? '<br>“' + esc(h.comment) + '”' : '') + '</p>'; }).join('')));
      var acts = el('div', 'g-acts');
      var save = el('button', 'btn btn-primary', 'Save grade'), rev = el('button', 'btn btn-signal', 'Return for revision'), msg = el('span', 'small muted', s.gradedAt ? 'Last graded ' + ago(s.gradedAt) : ''); save.type = rev.type = 'button';
      function send(status) {
        if (status === 'graded' && (m.criteria || []).some(function (c) { return !lv[c.id]; })) { toast('Pick a level for every row first.', true); return; }
        save.disabled = rev.disabled = true; msg.textContent = 'Saving…';
        post({ kind: 'grade', id: s.id, levels: lv, comment: ta.value, status: status }).then(function (x) {
          save.disabled = rev.disabled = false;
          if (!x || !x.ok) { msg.textContent = 'Not saved: ' + ((x && x.error) || 'error'); return; }
          msg.textContent = status === 'revise' ? 'Returned for revision.' : 'Saved.';
          var row = D.subs.filter(function (q) { return q.id === s.id; })[0]; if (row) { row.status = x.status; row.levels = lv; row.gradedAt = Date.now(); }
          drawTop();
          if (TAB === 'subs') { var y = scrollY; subsRefresh(); scrollTo(0, y); }
          if (pos >= 0 && pos < ids.length - 1) setTimeout(function () { M.close(); gradeModal(ids[pos + 1], ids); }, 500);
        }, function () { save.disabled = rev.disabled = false; msg.textContent = 'Not saved — check your connection.'; });
      }
      save.addEventListener('click', function () { send('graded'); }); rev.addEventListener('click', function () { send('revise'); });
      acts.appendChild(save); acts.appendChild(rev); acts.appendChild(msg); side.appendChild(acts);
    }, function () { M.body.innerHTML = '<p class="err">Couldn’t reach the backend.</p>'; });
  }
  function subsRefresh() { render(); }

  /* ---------- Progress ---------- */
  function progTab() {
    view.appendChild(el('div', 'dhead', '<div><div class="label">' + esc(D.label) + '</div><h1>Progress</h1></div>'));
    var ms = readyMissions(), L = D.cal ? C.layout(D.cal, NS) : null;
    if (!ms.length) { view.appendChild(el('div', 'empty', 'No missions are online yet.')); return; }
    var t = el('table', 'tbl'), th = '<thead><tr><th>Student</th>' + ms.map(function (m) { var sp = L && L.span[m.id]; return '<th>M' + m.num + ' · ' + esc(m.title) + (sp ? '<br><span style="text-transform:none;letter-spacing:0">due ' + esc(C.nice(sp.end)) + '</span>' : '') + '</th>'; }).join('') + '<th>Last seen</th></tr></thead>';
    t.innerHTML = th; var tb = el('tbody');
    D.roster.forEach(function (s) {
      var cells = ms.map(function (m) {
        var p = (D.progress[s.name] || {})[m.id], n = RL.guides[m.id].steps.length, dn = p ? p.done.length : 0, sub = D.subs.filter(function (x) { return x.name === s.name && x.mission === m.id; })[0];
        var stepT = p ? RL.guides[m.id].steps[Math.min(n, p.step) - 1] : null;
        return '<td><span class="pbar"><i style="width:' + Math.round(100 * dn / n) + '%"></i></span>' + dn + '/' + n + (sub ? ' ' + statusTag(sub) : '') + (p && !sub ? '<br><span class="small muted">on: ' + esc(stepT ? stepT.title : '') + '</span>' : '') + '</td>';
      }).join('');
      var tr = el('tr', 'click', '<td><b>' + esc(s.name) + '</b></td>' + cells + '<td class="small muted">' + esc(ago(s.lastSeen)) + '</td>');
      tr.addEventListener('click', function () { studentModal(s.name); });
      tb.appendChild(tr);
    });
    t.appendChild(tb); view.appendChild(D.roster.length ? t : el('div', 'empty', 'No students yet.'));
  }

  /* ---------- Comments (report cards): teacher/comments.js ---------- */
  function commentsTab() {
    var L = D.cal ? C.layout(D.cal, NS) : null, today = C.today();
    var due = readyMissions().filter(function (m) { var sp = L && L.span[m.id]; return sp && sp.end <= today; }).map(function (m) { return m.id; });
    RL.CommentsTab(view, { D: D, cur: CUR, due: due, onStudent: studentModal });
  }

  /* ---------- Calendar ---------- */
  var calMode = 'view', saveT = null, CALW = null;
  function calTab() {
    CALW = D.cal ? C.copy(D.cal) : null;
    var head = el('div', 'dhead', '<div><div class="label">' + esc(SYNC ? 'All classes (synced)' : D.label) + '</div><h1>Calendar</h1></div>');
    view.appendChild(head);
    if (!CALW) {
      var p = el('div', 'panel', ''); p.style.padding = '20px'; p.style.maxWidth = '560px';
      p.innerHTML = '<h3>Set up the calendar</h3><p class="muted">Pick the first class day of the Arduino unit. Every mission is laid out back to back at its default length; you can change lengths, order and days off afterwards.</p>';
      var r = el('div', 'row2'), d = el('input'); d.type = 'date'; d.value = C.today(); var go = el('button', 'btn btn-primary', 'Create calendar'); go.type = 'button';
      go.addEventListener('click', function () { if (!C.parse(d.value)) return; CALW = C.make(d.value); saveCal(true); });
      r.appendChild(d); r.appendChild(go); p.appendChild(r); view.appendChild(p); return;
    }
    var wrap = el('div', 'calwrap'), side = el('div', 'calside'), main = el('div', 'calmain');
    wrap.appendChild(side); wrap.appendChild(main); view.appendChild(wrap);
    // settings
    var s1 = el('div', 'panel'); s1.innerHTML = '<h3>Unit start & class days</h3>';
    var r1 = el('div', 'row2'), sd = el('input'); sd.type = 'date'; sd.value = CALW.start; sd.setAttribute('aria-label', 'First class day');
    sd.addEventListener('change', function () { if (C.parse(sd.value)) { CALW.start = sd.value; saveCal(); } });
    r1.appendChild(el('span', 'label', 'Starts')); r1.appendChild(sd); s1.appendChild(r1);
    var dp = el('div', 'daypick'); dp.style.marginTop = '10px';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(function (n, i) {
      var lab = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.checked = (CALW.meet || [1, 2, 3, 4, 5]).indexOf(i + 1) >= 0;
      cb.addEventListener('change', function () { var m = []; dp.querySelectorAll('input').forEach(function (x, j) { if (x.checked) m.push(j + 1); }); if (!m.length) { cb.checked = true; return; } CALW.meet = m; saveCal(); });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(n)); dp.appendChild(lab);
    });
    s1.appendChild(el('div', 'small muted', 'Days this class meets:')); s1.appendChild(dp);
    var sy = el('label', 'row2 small'); sy.style.marginTop = '10px'; var sc = el('input'); sc.type = 'checkbox'; sc.checked = SYNC; sy.appendChild(sc); sy.appendChild(document.createTextNode('Keep all classes on one calendar'));
    sc.addEventListener('change', function () { get('calsync', { on: sc.checked ? '1' : '0' }).then(function () { SYNC = sc.checked; if (SYNC) saveCal(); else load(); }); });
    s1.appendChild(sy);
    if (!SYNC && CLASSES.length > 1) { var cp = el('button', 'btn btn-ghost btn-small', 'Copy this calendar to every class'); cp.type = 'button'; cp.style.marginTop = '8px'; cp.addEventListener('click', function () { if (!confirm('Replace every class’s calendar with this one?')) return; post({ kind: 'setcal', 'class': CUR, cal: CALW, all: true }).then(function (r) { toast(r && r.ok ? 'Copied to ' + r.copied + ' classes.' : 'Not copied', !(r && r.ok)); }); }); s1.appendChild(cp); }
    side.appendChild(s1);
    // missions
    var s2 = el('div', 'panel'); s2.innerHTML = '<h3>Missions</h3><p class="small muted" style="margin-bottom:8px">Use − / + to change how many classes a mission gets. Everything after it moves.</p>';
    var ml = el('div', 'mlist'); s2.appendChild(ml); side.appendChild(s2);
    var s3 = el('div', 'panel'); s3.innerHTML = '<h3>Days off & notes</h3>';
    var mb = el('div', 'modebar'), offB = el('button', 'btn btn-small ' + (calMode === 'off' ? 'btn-primary' : 'btn-ghost'), calMode === 'off' ? 'Done marking days off' : 'Mark days off'); offB.type = 'button';
    offB.addEventListener('click', function () { calMode = calMode === 'off' ? 'view' : 'off'; render(); });
    mb.appendChild(offB); mb.appendChild(el('span', 'small muted', 'No-school days are shared by every class.')); s3.appendChild(mb);
    var er = el('div', 'row2'), ed = el('input'), et = el('input'), etk = el('label', 'small'), ec = el('input');
    ed.type = 'date'; ed.value = C.today(); et.type = 'text'; et.placeholder = 'e.g. Field trip, assembly'; ec.type = 'checkbox'; ec.checked = true; etk.appendChild(ec); etk.appendChild(document.createTextNode(' no class'));
    var ea = el('button', 'btn btn-ghost btn-small', 'Add'); ea.type = 'button';
    ea.addEventListener('click', function () { if (!C.parse(ed.value) || !et.value.trim()) return; CALW.events = (CALW.events || []).concat([{ id: 'e' + Date.now(), date: ed.value, title: et.value.trim(), kind: 'event', takes: ec.checked }]); saveCal(); });
    er.appendChild(ed); er.appendChild(et); er.appendChild(etk); er.appendChild(ea); s3.appendChild(er);
    var evl = el('div', 'evlist'); s3.appendChild(evl);
    (CALW.events || []).forEach(function (e) { var row = el('div', '', '<span>' + esc(C.nice(e.date)) + ' · ' + esc(e.title) + (e.takes ? ' <span class="tag">no class</span>' : '') + '</span>'); var x = el('button', 'btn btn-ghost btn-small', 'Remove'); x.type = 'button'; x.addEventListener('click', function () { CALW.events = CALW.events.filter(function (y) { return y.id !== e.id; }); saveCal(); }); row.appendChild(x); evl.appendChild(row); });
    side.appendChild(s3);
    function drawList() {
      ml.innerHTML = '';
      var L = C.layout(CALW, NS);
      CALW.items.forEach(function (x, i) {
        var info = C.info(x.k), sp = L.span[x.k], row = el('div', 'mrow'); row.style.setProperty('--u', RL.unitColour(info.unit));
        row.innerHTML = '<div><div class="t">M' + esc(info.num) + ' · ' + esc(info.title) + (info.mission.ready ? '' : ' <span class="muted small">(in development)</span>') + '</div><div class="d">' + (sp ? esc(C.nice(sp.start, { month: 'short', day: 'numeric' })) + ' → due ' + esc(C.nice(sp.end)) : '') + '</div></div>';
        var ctl = el('div', 'ctl');
        function btn(t, title, fn, dis) { var b = el('button', '', t); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); if (dis) b.disabled = true; b.addEventListener('click', fn); ctl.appendChild(b); }
        btn('−', 'One class shorter', function () { CALW = C.setLen(CALW, x.k, x.len - 1); saveCal(); }, x.len <= 1);
        ctl.appendChild(el('span', 'len', x.len + 'd'));
        btn('+', 'One class longer', function () { CALW = C.setLen(CALW, x.k, x.len + 1); saveCal(); });
        btn('↑', 'Move earlier', function () { CALW = C.moveItem(CALW, x.k, -1); saveCal(); }, i === 0);
        btn('↓', 'Move later', function () { CALW = C.moveItem(CALW, x.k, 1); saveCal(); }, i === CALW.items.length - 1);
        btn('×', 'Take off the calendar', function () { CALW = C.skip(CALW, x.k); saveCal(); });
        row.appendChild(ctl); ml.appendChild(row);
      });
      if (CALW.skipped.length) {
        ml.appendChild(el('div', 'label', 'Not on the calendar'));
        CALW.skipped.forEach(function (k) { var i = C.info(k), row = el('div', 'mrow', '<div class="t muted">M' + esc(i.num) + ' · ' + esc(i.title) + '</div>'), b = el('button', 'btn btn-ghost btn-small', 'Add back'); b.type = 'button'; b.addEventListener('click', function () { CALW = C.restore(CALW, k); saveCal(); }); row.appendChild(b); ml.appendChild(row); });
      }
      var tot = CALW.items.reduce(function (a, x) { return a + x.len; }, 0);
      ml.appendChild(el('p', 'small muted', tot + ' class days · last due ' + esc(C.nice(L.last))));
    }
    function drawCal() {
      main.innerHTML = ''; main.className = 'calmain' + (calMode === 'off' ? ' mode-off' : '');
      if (calMode === 'off') main.appendChild(el('div', 'callout safety small', '<span class="label">Marking days off</span>Click weekdays to mark or unmark them as no-school days. Missions move around them.'));
      var v = C.view(CALW, { off: NS, onDay: calMode === 'off' ? function (date) {
        var d = C.parse(date); if (d.getDay() === 0 || d.getDay() === 6) return;
        var i = NS.indexOf(date); if (i >= 0) NS.splice(i, 1); else NS.push(date); NS.sort();
        post({ kind: 'setnoschool', dates: NS }).then(function (r) { if (!r || !r.ok) toast('Days off not saved', true); });
        var y = main.querySelector('.calv-scroll').scrollTop; drawCal(); drawList(); main.querySelector('.calv').setScroll(y);
      } : null, chip: function (k, slot) { var m = RL.MISSIONS[k]; return C.chip(k, slot, m && m.ready && RL.guides[k] ? '../index.html?preview=1#/m/' + k : null); } });
      main.appendChild(v);
      v.querySelectorAll('a.calv-chip').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
      requestAnimationFrame(function () { if (!drawCal.y) v.scrollToDate(C.today() < CALW.start ? CALW.start : C.today()); else v.setScroll(drawCal.y); });
      v.querySelector('.calv-scroll').addEventListener('scroll', function (e) { drawCal.y = e.target.scrollTop; }, { passive: true });
    }
    drawList(); drawCal();
    calTab.redraw = function () { drawList(); drawCal(); };
  }
  function saveCal(full) {
    CALW = C.clean(CALW); D.cal = C.copy(CALW);
    render();
    clearTimeout(saveT);
    saveT = setTimeout(function () { post({ kind: 'setcal', 'class': CUR, cal: CALW }).then(function (r) { if (!r || !r.ok) toast('Calendar not saved: ' + ((r && r.error) || 'error'), true); }, function () { toast('Calendar not saved — check your connection.', true); }); }, 700);
  }

  /* ---------- Equipment: extra materials per mission (specific Amazon.ca products) + an order email to Carla ---------- */
  var ORDER_TO = 'cmutch@rockyview.ab.ca', EQUIP = {};
  function eqState() { var st = null; try { st = JSON.parse(ls('equip2') || 'null'); } catch (e) {} st = st || {}; st.pick = st.pick || {}; st.qty = st.qty || {}; st.custom = st.custom || []; return st; }
  function eqSave(st) { ls('equip2', JSON.stringify(st)); }
  function prodOf(o) { var x = EQUIP[o.key]; return x && x.url ? { url: x.url, product: x.product || 'Your chosen product', custom: true } : { url: o.link, product: o.product, custom: false }; }
  function equipTab() {
    var st = eqState(), totalStudents = CLASSES.reduce(function (a, c) { return a + (c.count || 0); }, 0);
    var groups = st.groups || Math.max(1, Math.ceil(totalStudents / 2));
    view.appendChild(el('div', 'dhead', '<div><div class="label">Arduino unit</div><h1>Equipment</h1></div>'));
    view.appendChild(el('p', 'muted', 'What each mission needs besides the ELEGOO kits, in calendar order, with a specific Amazon.ca product for each. Tick what you want, check the number of packs, and email the list to Carla (the linked list and total are copied for you to paste into the email). <b>Change product</b> swaps in any link you prefer; it’s saved for every class and every device.'));
    var set = el('div', 'eq-set panel');
    set.innerHTML = '<label>Groups <input type="number" min="1" max="80" class="eq-groups" value="' + groups + '"></label><span class="small muted">' + totalStudents + ' student' + (totalStudents === 1 ? '' : 's') + ' on your class lists' + (totalStudents ? ' · ' + Math.ceil(totalStudents / 2) + ' pairs' : '') + '. Pack counts are worked out from this.</span>';
    view.appendChild(set);
    set.querySelector('.eq-groups').addEventListener('change', function (e) { st.groups = Math.max(1, Number(e.target.value) || 1); st.qty = {}; eqSave(st); render(); });
    var L = D && D.cal ? C.layout(D.cal, NS) : null, today = C.today();
    var order = RL.missionList().slice();
    if (L) order.sort(function (a, b) { var x = L.span[a.id], y = L.span[b.id]; return (x ? x.start : '9') < (y ? y.start : '9') ? -1 : 1; });
    function qtyOf(m, o, i) { var k = m.id + ':' + i; return st.qty[k] != null ? st.qty[k] : RL.orderQty(o, groups); }
    function picked(m, o, i) { var k = m.id + ':' + i; if (st.pick[k] != null) return st.pick[k]; if (o.optional) return false; var sp = L && L.span[m.id]; return !!(sp && sp.end >= today && C.classDaysBetween(D.cal, NS, today, sp.start) <= 15); }
    var list = el('div', 'eq-list'); view.appendChild(list);
    order.forEach(function (m) {
      var items = (RL.ORDERS || {})[m.id] || [], sp = L && L.span[m.id], card = el('div', 'eq-card panel');
      card.style.setProperty('--u', RL.unitColour(m.unit));
      card.innerHTML = '<div class="eq-h"><div><div class="label">Mission ' + esc(m.num) + (sp ? ' · ' + esc(C.nice(sp.start, { month: 'short', day: 'numeric' })) + ' – ' + esc(C.nice(sp.end)) : '') + '</div><h3>' + esc(m.title) + '</h3></div>' +
        (sp && sp.end < today ? '<span class="tag">Done</span>' : sp && sp.start <= today ? '<span class="tag c">On now</span>' : '') + '</div>' +
        '<p class="small"><span class="label">From the kits</span> ' + esc((m.parts || []).join(' · ')) + '</p>';
      var tb = el('div', 'eq-items');
      items.forEach(function (o, i) {
        var k = m.id + ':' + i, pr = prodOf(o), row = el('div', 'eq-item');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = picked(m, o, i); cb.setAttribute('aria-label', 'Order ' + o.item);
        cb.addEventListener('change', function () { st.pick[k] = cb.checked; eqSave(st); refresh(); });
        var q = el('input'); q.type = 'number'; q.min = 0; q.value = qtyOf(m, o, i); q.className = 'eq-q'; q.setAttribute('aria-label', 'Packs of ' + o.item);
        q.addEventListener('change', function () { st.qty[k] = Math.max(0, Number(q.value) || 0); eqSave(st); refresh(); });
        var info = el('div', 'eq-info');
        info.innerHTML = '<div class="eq-name">' + esc(o.item) + (o.optional ? ' <span class="tag">optional</span>' : '') + '</div>' +
          '<div class="small"><a href="' + esc(pr.url) + '" target="_blank" rel="noopener">' + esc(pr.product) + ' ↗</a>' + (pr.custom ? ' <span class="tag c">your pick</span>' + (EQUIP[o.key] && EQUIP[o.key].price ? ' <span class="muted">· $' + esc(EQUIP[o.key].price) + '</span>' : '') : ' <span class="muted">· ' + esc(o.price) + '</span>') + '</div>' +
          '<div class="small muted">' + (o.packs != null ? o.packs + ' pack' + (o.packs === 1 ? '' : 's') + ' for the class' : o.each + ' ' + esc(o.unit) + ' per group → ' + RL.orderQty(o, groups) + ' pack' + (RL.orderQty(o, groups) === 1 ? '' : 's') + ' of ' + o.pack) + '</div>';
        var ch = el('button', 'btn btn-ghost btn-small', 'Change product'); ch.type = 'button';
        ch.addEventListener('click', function () { editProduct(o, info, ch); });
        row.appendChild(cb); row.appendChild(q); row.appendChild(info); row.appendChild(ch);
        tb.appendChild(row);
      });
      if (!items.length) tb.appendChild(el('p', 'small muted', 'Nothing to order — everything is in the kits.'));
      card.appendChild(tb); list.appendChild(card);
    });
    function editProduct(o, info, btn) {
      if (info.querySelector('.eq-edit')) return;
      var pr = prodOf(o), f = el('div', 'eq-edit'), u = el('input'), n = el('input'), sv = el('button', 'btn btn-primary btn-small', 'Save'), cx = el('button', 'btn btn-ghost btn-small', 'Cancel');
      var pc = el('input'); pc.type = 'text'; pc.inputMode = 'decimal'; pc.placeholder = 'Price per pack, e.g. 12.99';
      u.type = n.type = 'text'; u.placeholder = 'Paste the product link (amazon.ca or any store)'; n.placeholder = 'Product name (shown here in the list)'; sv.type = cx.type = 'button';
      u.value = pr.custom ? pr.url : ''; n.value = pr.custom ? pr.product : ''; pc.value = pr.custom && EQUIP[o.key] && EQUIP[o.key].price ? EQUIP[o.key].price : '';
      f.appendChild(u); f.appendChild(n); f.appendChild(pc); var r = el('div', 'row2'); r.appendChild(sv); r.appendChild(cx);
      if (pr.custom) { var rs = el('button', 'btn btn-ghost btn-small', 'Use the suggested product'); rs.type = 'button'; rs.addEventListener('click', function () { var e2 = Object.assign({}, EQUIP); delete e2[o.key]; saveEquip(e2); }); r.appendChild(rs); }
      f.appendChild(r); info.appendChild(f); btn.disabled = true; u.focus();
      cx.addEventListener('click', function () { f.remove(); btn.disabled = false; });
      sv.addEventListener('click', function () {
        var url = u.value.trim(); if (!/^https?:\/\//.test(url)) { toast('Paste a full link starting with https://', true); return; }
        var e2 = Object.assign({}, EQUIP); e2[o.key] = { url: url, product: n.value.trim() || o.product.replace(/^[^(]*/, 'Alternative '), price: pc.value.trim().replace(/[^0-9.]/g, '') }; saveEquip(e2);
      });
    }
    function saveEquip(e2) { post({ kind: 'setequip', equip: e2 }).then(function (r) { if (r && r.ok) { EQUIP = r.equip; toast('Saved. This product is used everywhere it appears.'); render(); } else toast('Not saved: ' + ((r && r.error) || 'error'), true); }, function () { toast('Not saved — check your connection.', true); }); }
    // custom items
    var cu = el('div', 'eq-card panel'); cu.innerHTML = '<div class="eq-h"><div><div class="label">Anything else</div><h3>Your own items</h3></div></div>';
    var cl = el('div', 'eq-items'); cu.appendChild(cl);
    st.custom.forEach(function (c, i) {
      var row = el('div', 'eq-item');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = c.pick !== false; cb.addEventListener('change', function () { c.pick = cb.checked; eqSave(st); refresh(); });
      var q = el('input'); q.type = 'number'; q.min = 0; q.value = c.qty || 1; q.className = 'eq-q'; q.addEventListener('change', function () { c.qty = Math.max(0, Number(q.value) || 0); eqSave(st); refresh(); });
      var info = el('div', 'eq-info', '<div class="eq-name">' + esc(c.item) + '</div>' + (c.link ? '<div class="small"><a href="' + esc(c.link) + '" target="_blank" rel="noopener">' + esc(c.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) + ' ↗</a>' + (c.price ? ' <span class="muted">· $' + esc(c.price) + '</span>' : '') + '</div>' : (c.price ? '<div class="small muted">$' + esc(c.price) + '</div>' : '')));
      var x = el('button', 'btn btn-ghost btn-small', 'Remove'); x.type = 'button'; x.addEventListener('click', function () { st.custom.splice(i, 1); eqSave(st); render(); });
      row.appendChild(cb); row.appendChild(q); row.appendChild(info); row.appendChild(x); cl.appendChild(row);
    });
    var add = el('div', 'row2'), ni = el('input'), nl = el('input'), np2 = el('input'), nb = el('button', 'btn btn-ghost btn-small', 'Add item');
    ni.type = 'text'; ni.placeholder = 'Item (e.g. AA batteries)'; nl.type = 'text'; nl.placeholder = 'Product link'; np2.type = 'text'; np2.inputMode = 'decimal'; np2.placeholder = 'Price'; np2.className = 'eq-price'; nb.type = 'button';
    nb.addEventListener('click', function () { if (!ni.value.trim()) return; st.custom.push({ item: ni.value.trim(), link: /^https?:\/\//.test(nl.value.trim()) ? nl.value.trim() : '', price: np2.value.trim().replace(/[^0-9.]/g, ''), qty: 1, pick: true }); eqSave(st); render(); });
    add.appendChild(ni); add.appendChild(nl); add.appendChild(np2); add.appendChild(nb); cu.appendChild(add); list.appendChild(cu);
    // the email: one line per product (the same product in several missions is added up), with a total
    function money(n) { return '$' + n.toFixed(2); }
    function priceOf(x) { var n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? n : null; }
    function niceName(s) { s = String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); return s.replace(/(^|[\s\-\/])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\bAnd\b/g, 'and'); }
    function lines() {
      var byKey = {}, out = [];
      order.forEach(function (m) {
        ((RL.ORDERS || {})[m.id] || []).forEach(function (o, i) {
          var q = qtyOf(m, o, i); if (!picked(m, o, i) || q <= 0) return;
          var pr = prodOf(o), k = pr.url, x = byKey[k];
          if (!x) { x = byKey[k] = { name: pr.custom ? niceName(pr.product) : (o.name || niceName(o.item)), url: pr.url, qty: 0, each: pr.custom ? priceOf(EQUIP[o.key] && EQUIP[o.key].price) : priceOf(o.price) }; out.push(x); }
          x.qty += q;
        });
      });
      st.custom.forEach(function (c) { var q = c.qty || 1; if (c.pick === false || q <= 0) return; out.push({ name: c.item, url: c.link || '', qty: q, each: priceOf(c.price) }); });
      return out;
    }
    function total(ls2) { var t = 0, unknown = 0; ls2.forEach(function (x) { if (x.each == null) unknown++; else t += x.each * x.qty; }); return { t: t, unknown: unknown }; }
    function lineText(x) { return x.qty + ' x ' + x.name + (x.each != null ? ' (' + money(x.each * x.qty) + ')' : ''); }
    function totalText(ls2) { var T = total(ls2); return 'Total: ' + money(T.t) + (T.unknown ? ' (plus ' + T.unknown + ' item' + (T.unknown === 1 ? '' : 's') + ' without a price)' : '') + ', before tax'; }
    var GREET = 'Hi Carla,\n\nCould you please order the following for my robotics class?\n\n', SIGN = '\n\nThank you!\nRyan Cathcart';
    function bodyText(ls2) { return GREET + ls2.map(function (x) { return lineText(x) + (x.url ? '\n  ' + x.url : ''); }).join('\n') + '\n\n' + totalText(ls2) + SIGN; }
    function listHtml(ls2) {
      var e = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      return ls2.map(function (x) { var nm = x.url ? '<a href="' + e(x.url) + '">' + e(x.name) + '</a>' : e(x.name); return '<div>' + x.qty + ' x ' + nm + (x.each != null ? ' (' + money(x.each * x.qty) + ')' : '') + '</div>'; }).join('') + '<div><br></div><div><b>' + e(totalText(ls2)) + '</b></div>';
    }
    function listPlain(ls2) { return ls2.map(lineText).join('\n') + '\n\n' + totalText(ls2); }
    function copyRich(html, plain) {
      try { if (navigator.clipboard && root.ClipboardItem) return navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]).then(function () { return true; }, function () { return false; }); } catch (e) {}
      return Promise.resolve(false);
    }
    var bar = el('div', 'eq-bar');
    var mail = el('a', 'btn btn-primary', 'Email Carla for orders'), cp = el('button', 'btn btn-ghost', 'Copy the list'), cnt = el('span', 'small muted'), tot = el('span', 'eq-total');
    cp.type = 'button'; mail.href = '#';
    function refresh() { var ls2 = lines(), T = total(ls2); cnt.textContent = ls2.length ? ls2.length + ' item' + (ls2.length === 1 ? '' : 's') + ' ticked' : 'Nothing ticked yet'; tot.textContent = ls2.length ? 'Total ' + money(T.t) + (T.unknown ? ' + ' + T.unknown + ' unpriced' : '') : ''; mail.classList.toggle('disabled', !ls2.length); }
    /* A mailto link can only carry plain text, so the item names with their links go on the clipboard: the email opens with
       the greeting, and pasting adds the linked list and the total. Without clipboard access the plain list (with links) goes in. */
    mail.addEventListener('click', function (e) {
      e.preventDefault(); var ls2 = lines(); if (!ls2.length) { toast('Tick at least one item first.', true); return; }
      copyRich(listHtml(ls2), listPlain(ls2)).then(function (ok) {
        var body = ok ? GREET + '\n' + SIGN : bodyText(ls2);
        location.href = 'mailto:' + ORDER_TO + '?subject=' + encodeURIComponent('Robotics order request') + '&body=' + encodeURIComponent(body);
        if (ok) toast('The list is copied. Paste it into the email under the first line (Ctrl+V / ⌘V).');
      });
    });
    cp.addEventListener('click', function () { var ls2 = lines(); if (!ls2.length) { toast('Tick at least one item first.', true); return; } copyRich(GREET.replace(/\n/g, '<br>') + listHtml(ls2) + SIGN.replace(/\n/g, '<br>'), bodyText(ls2)).then(function (ok) { if (ok) { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy the list'; }, 1500); } else RL.Code.copy(bodyText(ls2), cp); }); });
    bar.appendChild(mail); bar.appendChild(cp); bar.appendChild(tot); bar.appendChild(cnt); bar.appendChild(el('span', 'small muted eq-to', 'To: ' + ORDER_TO));
    view.insertBefore(bar, list); refresh();
  }

  /* ---------- Roster: the class list (names, course level, PowerSchool numbers, pronouns, IPP), class link, new class ---------- */
  var PRONOUNS = [['', '—'], ['he', 'he/him'], ['she', 'she/her'], ['they', 'they/them']];
  function wrapTbl(t) { var w = el('div', 'tbl-wrap'); w.appendChild(t); return w; }
  function flash(node, msg, bad) { var m = el('p', 'flash small' + (bad ? ' bad' : ''), esc(msg)); node.appendChild(m); setTimeout(function () { m.remove(); }, 5000); }
  function fileButton(label, onText) {
    var lab = el('label', 'btn btn-ghost btn-small file-btn'), inp = el('input'); inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
    lab.appendChild(document.createTextNode(label)); lab.appendChild(inp);
    inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { onText(String(r.result || ''), f.name); inp.value = ''; }; r.readAsText(f); });
    return lab;
  }
  /* save class-list details for one student ({ num | pronouns | ipp | level }) */
  function setStudent(s, fields, node) {
    return post(Object.assign({ kind: 'setstudent', 'class': CUR, name: s.name }, fields)).then(function (d) {
      if (!d || !d.ok) { flash(node, (d && d.error) || 'Couldn’t save.', true); return false; }
      s.num = d.num; s.pronouns = d.pronouns; s.ipp = d.ipp; s.level = d.level; return true;
    }, function () { flash(node, 'Couldn’t reach the backend.', true); return false; });
  }
  RL.Dash.setStudent = setStudent;
  function levelSelect(s, node, onSaved) {
    var sel = el('select', 'field-sm'); sel.setAttribute('aria-label', 'Course level for ' + s.name);
    sel.appendChild(new Option('—', '')); RL.COURSE_LEVELS.forEach(function (c) { sel.appendChild(new Option(c.short, c.id)); });
    sel.value = s.level || '';
    sel.addEventListener('change', function () { setStudent(s, { level: sel.value }, node).then(function (ok) { sel.value = s.level || ''; if (ok) { sel.classList.add('saved'); if (onSaved) onSaved(); } }); });
    return sel;
  }
  function pronounSelect(s, node, onSaved) {
    var sel = el('select', 'field-sm'); sel.setAttribute('aria-label', 'Pronouns for ' + s.name);
    PRONOUNS.forEach(function (x) { sel.appendChild(new Option(x[1], x[0])); }); sel.value = s.pronouns || '';
    sel.addEventListener('change', function () { setStudent(s, { pronouns: sel.value }, node).then(function (ok) { sel.value = s.pronouns || ''; if (ok) { sel.classList.add('saved'); if (onSaved) onSaved(); } }); });
    return sel;
  }
  function ippBox(s, node, onSaved) {
    var lab = el('label', 'ipp-box'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!s.ipp; cb.setAttribute('aria-label', s.name + ' is on an IPP');
    cb.addEventListener('change', function () { setStudent(s, { ipp: cb.checked ? '1' : '0' }, node).then(function (ok) { cb.checked = !!s.ipp; if (ok && onSaved) onSaved(); }); });
    lab.appendChild(cb); return lab;
  }
  RL.Dash.levelSelect = levelSelect; RL.Dash.pronounSelect = pronounSelect; RL.Dash.ippBox = ippBox;
  function psInfo(t) { return { teacher: t.teacher || '', course: t.course || '', points: t.points || '', type: t.type || '' }; }
  function lvlPicker(value) {
    var sel = el('select', 'field-sm'); sel.appendChild(new Option('Leave levels as they are', '')); RL.COURSE_LEVELS.forEach(function (c) { sel.appendChild(new Option('Set everyone in the file to ' + c.short, c.id)); }); sel.value = value || ''; return sel;
  }
  /* what a template would change, before anything is saved */
  function importPreview(t, fname, box) {
    var m = RL.PS.match(t.students, D.roster), add = m.rows.filter(function (r) { return r.how === 'new'; }), close = m.rows.filter(function (r) { return r.how === 'close'; });
    var numbered = m.rows.filter(function (r) { return r.as && r.num && !D.roster.some(function (s) { return s.name === r.as && String(s.num) === r.num; }); });
    var lvl = RL.levelFromCourse(t.course);
    box.innerHTML = '';
    var h = '<p><b>' + t.students.length + ' students</b> in <i>' + esc(fname) + '</i>' + (t.course ? ' · ' + esc(t.course) : '') + '</p><ul class="ps-sum">';
    h += '<li>' + (m.rows.length - add.length) + ' already on the class list' + (numbered.length ? ' (' + numbered.length + ' get their student number)' : '') + '</li>';
    if (close.length) h += '<li>Matched by a slightly different name: ' + close.map(function (r) { return esc(r.name) + ' → <b>' + esc(r.as) + '</b>'; }).join(', ') + '</li>';
    h += '<li>' + (add.length ? add.length + ' new, added: ' + add.map(function (r) { return esc(r.name); }).join(', ') : 'No one new') + '</li>';
    if (m.missing.length) h += '<li>On the class list but not in this file: ' + m.missing.map(esc).join(', ') + (lvl ? ' <span class="muted">(normal if they’re in another PowerSchool section of this class)</span>' : '') + '</li>';
    box.innerHTML = h + '</ul>';
    var ls2 = lvlPicker(lvl), lw = el('label', 'row2 small'); lw.appendChild(el('span', 'label', 'Course level')); lw.appendChild(ls2); box.appendChild(lw);
    if (lvl) box.appendChild(el('p', 'small muted', 'The PowerSchool class name says <b>' + esc(RL.courseLevel(lvl).short) + '</b>, so everyone in this file will be set to that level.'));
    var rmL = null;
    if (m.missing.length) { rmL = el('label', 'row2 small'); var rc = el('input'); rc.type = 'checkbox'; rmL.appendChild(rc); rmL.appendChild(document.createTextNode('Also remove the ' + m.missing.length + ' not in this file (their work stays in the spreadsheet)')); box.appendChild(rmL); }
    var row = el('div', 'row2'), go = el('button', 'btn btn-primary btn-small', 'Update the class list'), no = el('button', 'btn btn-ghost btn-small', 'Cancel'); go.type = no.type = 'button';
    go.addEventListener('click', function () {
      go.disabled = true;
      post({ kind: 'setroster', 'class': CUR, students: m.rows.map(function (r) { return { n: r.name, num: r.num, as: r.as }; }), ps: psInfo(t), level: ls2.value, mode: rmL && rmL.querySelector('input').checked ? 'replace' : 'add' }).then(function (d) {
        if (!d || !d.ok) { go.disabled = false; flash(box, (d && d.error) || 'Not saved', true); return; }
        toast('Class list updated: ' + d.added + ' added' + (d.numbered ? ', ' + d.numbered + ' student numbers' : '') + (d.leveled ? ', ' + d.leveled + ' levels set' : '') + (d.removed ? ', ' + d.removed + ' removed' : '') + '.');
        refreshClasses().then(function () { load(true).then(render); });
      }, function () { go.disabled = false; flash(box, 'Couldn’t reach the backend.', true); });
    });
    no.addEventListener('click', function () { box.innerHTML = ''; });
    row.appendChild(go); row.appendChild(no); box.appendChild(row);
  }
  function rosterTab() {
    view.appendChild(el('div', 'dhead', '<div><div class="label">' + esc(D ? D.label : 'Classes') + '</div><h1>Roster</h1></div>'));
    if (D && CUR) {
      var p = el('section', 'panel rpanel'), roster = D.roster;
      p.appendChild(el('h3', '', 'Students in ' + esc(D.label)));
      var up = el('div', 'ps-up');
      up.appendChild(fileButton('Update from a PowerSchool scores template…', function (text, fname) { var t = RL.PS.parse(text); if (t.error) { flash(p, t.error, true); return; } importPreview(t, fname, box); }));
      up.appendChild(el('span', 'small muted', 'In PowerSchool, export the scores template of any assignment in this class (a .csv). It adds anyone new and saves student numbers; a template from a DTFI 15, 25 or 35 section also sets those students’ level.'));
      p.appendChild(up);
      var box = el('div', 'ps-preview'); p.appendChild(box);
      var noLvl = roster.filter(function (s) { return !s.level; }).length, noNum = roster.filter(function (s) { return !s.num; }).length, noPro = roster.filter(function (s) { return !s.pronouns; }).length;
      var counts = RL.COURSE_LEVELS.map(function (c) { var n = roster.filter(function (s) { return s.level === c.id; }).length; return n ? '<span class="tag">' + esc(c.short) + ' · ' + n + '</span>' : ''; }).join(' ');
      if (roster.length) p.appendChild(el('p', 'small rsum', counts + (noLvl ? ' <span class="tag sig">No level · ' + noLvl + '</span>' : '') + (noNum ? ' <span class="muted">· ' + noNum + ' without a student number</span>' : '') + (noPro ? ' <span class="muted">· ' + noPro + ' without pronouns (their report card comments use their first name)</span>' : '')));
      if (roster.length) {
        var bulk = el('div', 'row2 small'); bulk.appendChild(el('span', 'label', 'Everyone without a level'));
        RL.COURSE_LEVELS.forEach(function (c) { var b = el('button', 'btn btn-ghost btn-small', esc(c.short)); b.type = 'button'; b.disabled = !noLvl; b.addEventListener('click', function () { var list = roster.filter(function (s) { return !s.level; }); if (!list.length) return; b.disabled = true; post({ kind: 'setstudent', 'class': CUR, list: list.map(function (s) { return { name: s.name, level: c.id }; }) }).then(function (r) { toast(r && r.ok ? r.students.length + ' set to ' + c.short + '.' : 'Not saved', !(r && r.ok)); load(true).then(render); }); }); bulk.appendChild(b); });
        p.appendChild(bulk);
      }
      var t = el('table', 'tbl rtbl'); t.innerHTML = '<thead><tr><th>Name</th><th>Level</th><th>Student #</th><th>Pronouns</th><th title="On an individual program plan: the report card comment gets the IPP sentence">IPP</th><th>PIN</th><th>Last seen</th><th><span class="sr">Actions</span></th></tr></thead>';
      var tb = el('tbody');
      roster.forEach(function (s) {
        var tr = el('tr', '', '<td class="rn"><b>' + esc(s.name) + '</b></td><td class="rl"></td><td class="rnum"></td><td class="rp"></td><td class="ri"></td><td>' + (s.pin ? '<span class="tag go">Set</span>' : '<span class="tag">Not yet</span>') + '</td><td class="small muted">' + esc(ago(s.lastSeen)) + '</td><td class="ra"></td>');
        tr.querySelector('.rl').appendChild(levelSelect(s, p, function () { drawTop(); }));
        var num = el('input', 'field-sm rnum-in'); num.value = s.num || ''; num.inputMode = 'numeric'; num.placeholder = '—'; num.setAttribute('aria-label', 'Student number for ' + s.name);
        num.addEventListener('change', function () { setStudent(s, { num: num.value.trim() }, p).then(function (ok) { num.value = s.num || ''; if (ok) num.classList.add('saved'); }); });
        tr.querySelector('.rnum').appendChild(num);
        tr.querySelector('.rp').appendChild(pronounSelect(s, p)); tr.querySelector('.ri').appendChild(ippBox(s, p));
        var menu = el('details', 'rmenu'), sm = el('summary', 'btn btn-ghost btn-small', '⋯'); sm.setAttribute('aria-label', 'More for ' + s.name); menu.appendChild(sm);
        var mb = el('div', 'rmenu-b');
        [['Reset PIN', function () { if (confirm('Reset ' + s.name + '’s PIN? They’ll make a new one next time they sign in.')) get('resetpin', { 'class': CUR, name: s.name }).then(function () { toast('PIN reset.'); load(true).then(render); }); }],
         ['Rename', function () { var to = prompt('New name for ' + s.name + ':', s.name); if (to && to.trim() && to !== s.name) get('rename', { 'class': CUR, name: s.name, to: to.trim() }).then(function (r) { toast(r && r.ok ? 'Renamed. ' + (r.note || '') : 'Not renamed', !(r && r.ok)); load(true).then(render); }); }],
         ['Remove from class', function () { if (confirm('Remove ' + s.name + ' from this class? Their past work stays in the spreadsheet.')) get('removestudent', { 'class': CUR, name: s.name }).then(function () { refreshClasses().then(function () { load(true).then(render); }); }); }]].forEach(function (a) { var b = el('button', '', a[0]); b.type = 'button'; b.addEventListener('click', function () { menu.open = false; a[1](); }); mb.appendChild(b); });
        menu.appendChild(mb); tr.querySelector('.ra').appendChild(menu);
        tb.appendChild(tr);
      });
      t.appendChild(tb); p.appendChild(roster.length ? wrapTbl(t) : el('div', 'empty', 'No students yet. Add them below, or upload a PowerSchool scores template above.'));
      view.appendChild(p);
    }
    var g = el('div', 'rcards'); view.appendChild(g);
    if (D && CUR) {
      var ap = el('div', 'panel'); ap.innerHTML = '<h3>Add students</h3><p class="small muted">One name per line (first and last name).</p>';
      var ta = el('textarea'); ta.rows = 5; ap.appendChild(ta);
      var ab = el('button', 'btn btn-primary btn-small', 'Add to ' + esc(D.label)); ab.type = 'button';
      ab.addEventListener('click', function () { if (!ta.value.trim()) return; ab.disabled = true; post({ kind: 'setroster', 'class': CUR, names: ta.value, mode: 'add' }).then(function (r) { ab.disabled = false; toast(r && r.ok ? 'Added ' + r.added + ' student' + (r.added === 1 ? '' : 's') + '.' : 'Not added', !(r && r.ok)); refreshClasses().then(function () { load(true).then(render); }); }); });
      ap.appendChild(ab); g.appendChild(ap);
      var link = new URL('../index.html?c=' + encodeURIComponent(CUR), location.href).href;
      var lp = el('div', 'panel'); lp.innerHTML = '<h3>Class link</h3><p class="small muted">Students open this, or go to the site and type the code <b>' + esc(CUR) + '</b>.</p>';
      var lb = el('div', 'linkbox'), lc = el('input', 'field-sm'); lc.readOnly = true; lc.value = link; lc.setAttribute('aria-label', 'Class link');
      var cpb = el('button', 'btn btn-ghost btn-small', 'Copy'); cpb.type = 'button'; cpb.addEventListener('click', function () { RL.Code.copy(link, cpb); });
      lb.appendChild(lc); lb.appendChild(cpb); lp.appendChild(lb); g.appendChild(lp);
    }
    var np = el('div', 'panel'); np.innerHTML = '<h3>New class</h3><p class="small muted">The code is what students type, e.g. <code>robotics-b</code>. Fill the names from a PowerSchool scores template or paste them, one per line.</p>';
    var code = el('input'); code.type = 'text'; code.placeholder = 'Class code, e.g. robotics-b';
    var lab = el('input'); lab.type = 'text'; lab.placeholder = 'Name, e.g. Robotics · Block B';
    var tpl = null, tplNote = el('span', 'small muted', '');
    var tplRow = el('div', 'ps-up'); tplRow.appendChild(fileButton('Fill from a PowerSchool scores template…', function (text, fname) {
      var t = RL.PS.parse(text); if (t.error) { flash(np, t.error, true); return; }
      tpl = t; names.value = t.students.map(function (x) { return x.name; }).join('\n'); if (!lab.value.trim() && t.course) lab.value = t.course.slice(0, 40);
      var lv = RL.levelFromCourse(t.course); nl.value = lv;
      tplNote.innerHTML = '<b>' + t.students.length + ' students</b> from <i>' + esc(fname) + '</i>' + (t.course ? ' (' + esc(t.course) + ')' : '') + '. Student numbers are saved with the class list.';
    })); tplRow.appendChild(tplNote);
    var names = el('textarea'); names.placeholder = 'Student names, one per line'; names.rows = 5;
    var nl = lvlPicker(''); nl.options[0].text = 'No level yet'; RL.COURSE_LEVELS.forEach(function (c, i) { nl.options[i + 1].text = 'Everyone is ' + c.short; });
    var mk = el('button', 'btn btn-primary btn-small', 'Create class'); mk.type = 'button';
    mk.addEventListener('click', function () {
      if (!code.value.trim()) { toast('Give the class a code.', true); return; }
      var q = { kind: 'setroster', 'class': code.value.trim(), label: lab.value.trim() || code.value.trim(), names: names.value, mode: 'add', level: nl.value };
      if (tpl) { var byName = {}; tpl.students.forEach(function (x) { byName[x.name.toLowerCase()] = x.num; }); q.students = names.value.split(/\r?\n/).map(function (n) { n = n.trim(); return n ? { n: n, num: byName[n.toLowerCase()] || '' } : null; }).filter(Boolean); q.ps = psInfo(tpl); }
      mk.disabled = true;
      post(q).then(function (r) { mk.disabled = false; if (!r || !r.ok) { toast((r && r.error) || 'Not created', true); return; } CUR = r.code; ls('class', CUR); toast('Class created.'); refreshClasses().then(function () { TAB = 'roster'; load(); }); });
    });
    [code, lab, tplRow, names, nl, mk].forEach(function (x) { np.appendChild(x); }); g.appendChild(np);
    if (D && CUR) { var dp = el('div', 'panel danger'); dp.innerHTML = '<h3>Delete this class</h3><p class="small muted">Removes the class code and its class list. Submissions stay in the spreadsheet and Drive.</p>'; var dl = el('button', 'btn btn-signal btn-small', 'Delete ' + esc(D.label)); dl.type = 'button'; dl.addEventListener('click', function () { var typed = (prompt('Type the class code (' + CUR + ') to delete ' + D.label + '.') || '').trim().toLowerCase(); if (typed !== CUR) return; get('delclass', { 'class': CUR }).then(function () { CUR = ''; refreshClasses().then(function () { CUR = CLASSES[0] ? CLASSES[0].code : ''; D = null; load(); }); }); }); dp.appendChild(dl); g.appendChild(dp); }
  }
  function refreshClasses() { return get('classes').then(function (r) { if (r && r.ok) { CLASSES = r.classes; EQUIP = r.equip || EQUIP; } }); }

  function boot() {
    view = document.getElementById('view'); topbar = document.getElementById('topbar');
    KEY = ls('tkey') || ''; CUR = ls('class') || ''; TAB = ls('tab') || 'live';
    var q = new URLSearchParams(location.search); if (q.get('key')) { KEY = q.get('key'); history.replaceState(null, '', location.pathname); }
    if (!A.enabled) { keyView(); return; }
    start();
    setInterval(function () { if (KEY && CUR && document.visibilityState === 'visible' && TAB !== 'calendar' && !document.querySelector('.modal')) load(true); }, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
