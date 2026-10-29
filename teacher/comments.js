/* Robotics Lab ledger — report card comments (the Comments tab).
 * Same shape as the math sites' comments (RVS guidelines): a course overview, one area of strength and one area for
 * growth, the IPP sentence for students on an IPP, and a sign-off. Report cards come at the end of the semester, so
 * nothing in a comment suggests the student can still turn things around.
 *
 * The evidence is the teacher's grades: every graded mission has a level (NM BEG PRG ADV MAS) on four rows —
 *   build   (Circuit)               → "building and wiring circuits"
 *   code    (Code)                  → "writing and debugging Arduino code"
 *   design  (Housing/Lamp/… & testing) → "designing, building and testing working prototypes"
 *   explain (Explain it)            → "explaining the science and the code behind the projects"
 * A student's strength is their best row across the missions (with the mission where it was best), their area for
 * growth the weakest one — or handing in missions, when several due missions are missing.
 * The course name comes from the student's level (Design Thinking for Innovation 15 / 25 / 35).
 *
 * RL.Comments: templates + C.personal / C.signoff / C.ipp / C.full (pure). RL.CommentsTab(view, ctx) draws the tab. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}, C = RL.Comments = {};

  var LADDER = ['NM', 'BEG', 'PRG', 'ADV', 'MAS'];
  var LNAME = { NM: 'Not Meeting', BEG: 'Beginning', PRG: 'Progressing', ADV: 'Advancing', MAS: 'Mastery' };
  C.LADDER = LADDER; C.LNAME = LNAME;
  C.AREAS = {
    build: { label: 'Circuits', topic: 'building and wiring circuits' },
    code: { label: 'Code', topic: 'writing and debugging Arduino code' },
    design: { label: 'Design & testing', topic: 'designing, building and testing working prototypes' },
    explain: { label: 'Explaining', topic: 'explaining the science and the code behind the projects' }
  };
  C.AREA_ORDER = ['build', 'code', 'design', 'explain'];

  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  C.firstName = function (name) { return String(name || '').trim().split(/\s+/)[0] || 'This student'; };
  C.forms = function (name, pr) {
    var f = C.firstName(name);
    if (pr === 'he') return { first: f, subj: 'he', obj: 'him', poss: 'his', s: true };
    if (pr === 'she') return { first: f, subj: 'she', obj: 'her', poss: 'her', s: true };
    if (pr === 'they') return { first: f, subj: 'they', obj: 'them', poss: 'their', s: false };
    return { first: f, subj: f, obj: f, poss: f + '’s', s: true, none: true };
  };
  function v(P, base) {
    if (!P.s) return base;
    if (base === 'be') return 'is'; if (base === 'have') return 'has'; if (base === 'do') return 'does'; if (base === 'go') return 'goes';
    if (/(s|sh|ch|x|z)$/.test(base)) return base + 'es';
    if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
    return base + 's';
  }

  /* the course overview that opens each comment ({course} = the student's course); the teacher can rewrite these in the tab */
  C.COURSE = [
    'In {course} this semester, we used the engineering design process to research, plan, build, test and improve our own projects, from wiring and programming Arduino circuits to building working prototypes from everyday materials.',
    '{course} this semester focused on design thinking and engineering: we built and programmed Arduino projects with sensors, motors and displays, and turned each circuit into a working prototype.',
    'This semester in {course}, we followed the engineering design process (ask, research, imagine, plan, create, test and improve) to design, build and program electronic projects with the Arduino.',
    'Our work in {course} this semester combined electronics, coding and hands-on design, as we wired circuits, wrote Arduino programs and built prototypes that sense and react to the world around them.',
    'In {course}, we worked through a series of self-paced engineering missions this semester, learning to build circuits, write and debug code, and test and improve our designs.'
  ];

  /* ---- templates ----
   * {First} {first} first name; {Subj} {subj} {obj} {poss} pronoun forms (the name when none is set); {v:verb} agrees with
   * the subject; {be}; {topic} the area; {esp} ", especially in the Smart fan mission" (or nothing); {espc} the same with
   * a closing comma; {eg} ", for example in the Smart fan mission"; {best} a mission title; {L} the level name;
   * {nin} {ndue} {nmiss} missions handed in / due / missing. A template needing {best}, {L} or {eg} is skipped when that
   * isn't known; one starting with ~ is skipped when the student has no pronouns set (it would repeat the name). */
  var STRENGTH = {
    high: [
      '{First} showed particular strength in {topic}{esp}, where {poss} work reached the {L} level.',
      '{First}’s strongest area this semester was {topic}. {Subj} {v:take} on challenging problems with confidence{esp}.',
      'A highlight of the semester for {First} was {topic}{esp}, where {subj} consistently {v:work} at the {L} level.',
      '{First} has a strong command of {topic}{espc} and {v:work} independently and carefully.',
      '~{First} excelled at {topic}; {poss} {best} project was a particular highlight.',
      'In {topic}, {first} {v:work} at the {L} level and {v:solve} problems creatively and independently.'
    ],
    mid: [
      '{First} showed strength in {topic}{esp}, where {subj} {v:handle} most challenges with confidence.',
      '{First}’s strongest area this semester was {topic}{espc} where {poss} work is at the {L} level.',
      '{First} did well with {topic}{espc} and {be} working at the {L} level there.',
      'One of {first}’s strengths this semester has been {topic}{esp}, where {subj} {v:show} a clear understanding.'
    ],
    emg: [
      '{First}’s strongest area this semester was {topic}{esp}, where {subj} {be} developing solid skills.',
      '{First} has made good progress with {topic}{espc} and {be} working at the {L} level there.',
      '{First} is building a good foundation in {topic}{esp}.'
    ],
    low: [
      '{First}’s most secure work this semester has been in {topic}{esp}, where {subj} {be} beginning to build a foundation.',
      '{First} has made the most progress with {topic}{esp}.',
      '{First} has shown the most confidence with {topic}{esp}.'
    ]
  };
  var GROWTH = {
    missing: [
      '{First} did not hand in evidence for {nmiss} of the {ndue} missions, so there was less evidence of {poss} learning this semester.',
      'An area for growth is completing and handing in each project: {first} submitted {nin} of the {ndue} missions.',
      'More consistent work on each mission, including handing in the evidence, would have helped {first} show more of what {subj} can do.'
    ],
    low: [
      'An area for growth is {topic}: {subj} {be} still building the basic skills here and would benefit from more practice.',
      'Going forward, {first} should focus on {topic}; working through the guides step by step and asking for help early will build confidence.',
      '{First} found {topic} challenging{eg}, and more practice would strengthen this skill.',
      '{First} can strengthen {poss} skills in {topic} by testing each step along the way instead of all at the end.'
    ],
    mid: [
      'A next step for {first} is {topic}: {subj} {v:understand} the main ideas but at times {v:find} the more complex steps difficult{eg}.',
      'In {topic}, {first} {v:know} the process but would benefit from slowing down and checking {poss} work against the guide.',
      '{First} can take {poss} work in {topic} to the next level by explaining each step and testing more carefully.',
      'An area for growth is {topic}, where {first} is on the right track but sometimes {v:miss} important details{eg}.'
    ],
    adv: [
      'To reach the Mastery level in {topic}, {first} should keep pushing into the extension challenges in each mission.',
      'A next step for {first} is applying {topic} to more open-ended, unfamiliar problems.',
      'In {topic}, {first} is close to Mastery; documenting and explaining {poss} thinking more fully will help {obj} get there.'
    ],
    mas: [
      'To keep growing, {first} can take on the extension challenges and design projects of {poss} own.',
      '~A next step for {first} is to share {poss} expertise by helping teammates troubleshoot their projects.',
      '{First} is ready for more open-ended design challenges that build on {topic}.'
    ]
  };
  var JOINED = [
    '{First} did well with {stopic}{sesp}, but at times found {gtopic} more challenging.',
    'While {first} {v:show} real confidence with {stopic}, {subj} would benefit from more practice with {gtopic}.',
    '{First} {v:handle} {stopic} with confidence, and {poss} next step is building the same confidence with {gtopic}.'
  ];
  var SIGNOFF = {
    strong: ['Overall, great work this semester, {first}!', 'Excellent work this semester, {first}!', 'Fantastic effort this semester, {first}. Keep building!',
      'Well done this semester, {first}!', 'It has been a pleasure having {first} in class. Great work this semester!', 'Great job this semester, {first}!'],
    good: ['Nice job this semester, {first}.', 'Good work this semester, {first}. Keep it up!', 'Overall, a solid semester, {first}. Keep it up!',
      'Keep up the good work, {first}!', 'Well done this semester, {first}. Keep it going!'],
    keep: ['Thank you for your effort this semester, {first}.', 'Thanks for a good semester, {first}. All the best next semester!',
      'I appreciated having you in class this semester, {first}. Best of luck!'],
    none: ['All the best next semester, {first}.', 'Best of luck next semester, {first}.']
  };
  C.STRENGTH = STRENGTH; C.GROWTH = GROWTH; C.SIGNOFF = SIGNOFF;

  function fill(t, P, x) {
    return t.replace(/\{(v:)?(\w+)\}/g, function (m, isV, k) {
      if (isV) return v(P, k);
      switch (k) {
        case 'First': case 'first': return P.first;
        case 'Subj': return cap(P.subj); case 'subj': return P.subj; case 'obj': return P.obj; case 'poss': return P.poss;
        case 'be': return P.s ? 'is' : 'are';
        default: return x[k] != null ? x[k] : '';
      }
    });
  }
  function usable(t, P, x) {
    if (t.charAt(0) === '~' && P.none) return false;
    if (/\{best\}/.test(t) && !x.best) return false;
    if (/\{L\}/.test(t) && !x.L) return false;
    if (/\{eg\}/.test(t) && !x.eg) return false;
    return true;
  }
  /* spread the wordings over a class (neighbours in the list don't read the same; redrawing one student keeps theirs) */
  C.rotation = function () { return { next: {}, got: {} }; };
  function choose(list, P, x, key, who, rot) {
    var T = list.filter(function (t) { return usable(t, P, x); }); if (!T.length) return '';
    var i;
    if (rot) { var ck = who + '|' + key; if (rot.got[ck] == null) { var n = rot.next[key] || 0; rot.next[key] = n + 1; rot.got[ck] = (n + hash(key)) % 997; } i = rot.got[ck] % T.length; }
    else i = hash(who + '|' + key) % T.length;
    return fill(T[i].replace(/^~/, ''), P, x);
  }
  function grp(lv) { var i = LADDER.indexOf(lv); return i >= 3 ? 'high' : i === 2 ? 'mid' : i === 1 ? 'emg' : 'low'; }
  function vars(a) { // a = { area, level, best: mission title, worst: mission title }
    var x = { topic: C.AREAS[a.area] ? C.AREAS[a.area].topic : a.area, L: a.level && a.level !== 'NM' ? LNAME[a.level] : '' };
    x.best = a.best || ''; x.esp = a.best ? ', especially in the ' + a.best + ' mission' : ''; x.espc = a.best ? x.esp + ',' : '';
    x.eg = a.worst ? ', for example in the ' + a.worst + ' mission' : '';
    return x;
  }
  C.courseLine = function (wordings, course, who, rot) { return choose(wordings && wordings.length ? wordings : C.COURSE, C.forms(who, ''), { course: course }, 'course', who, rot); };
  /* st = { name, pronouns, strength: { area, level, best }, growth: { area | 'missing', level, worst, nin, ndue, nmiss } } */
  C.personal = function (st, rot) {
    var P = C.forms(st.name, st.pronouns), who = st.name, S = st.strength, G = st.growth, out = [];
    var sx = S ? vars(S) : null, gx = G ? vars(G) : null;
    if (S && G && G.area !== 'missing' && S.area !== G.area && grp(S.level) !== 'low' && LADDER.indexOf(G.level) <= 3 && LADDER.indexOf(G.level) >= 1) {
      if (choose(['two', 'two', 'joined'], P, {}, 'shape', who, rot) === 'joined') return choose(JOINED, P, { stopic: sx.topic, sesp: sx.esp, gtopic: gx.topic }, 'joined', who, rot);
    }
    if (S) out.push(choose(STRENGTH[grp(S.level)], P, sx, 's-' + grp(S.level), who, rot));
    if (G) {
      var gk = G.area === 'missing' ? 'missing' : G.level === 'MAS' ? 'mas' : G.level === 'ADV' ? 'adv' : G.level === 'PRG' ? 'mid' : 'low';
      if (gk === 'missing') { gx.nin = String(G.nin); gx.ndue = String(G.ndue); gx.nmiss = String(G.nmiss); }
      out.push(choose(GROWTH[gk], P, gx, 'g-' + gk, who, rot));
    }
    return out.filter(Boolean).join(' ');
  };
  C.signoff = function (st, overall, rot) { // overall: average level index 0–4, or null with no grades
    var tier = overall == null ? 'none' : overall >= 2.9 ? 'strong' : overall >= 1.9 ? 'good' : 'keep';
    return choose(SIGNOFF[tier], C.forms(st.name, st.pronouns), {}, 'o-' + tier, st.name, rot);
  };
  C.ipp = function (name, pronouns) { var P = C.forms(name, pronouns); return P.first + ' is on an individual program plan (IPP) and accommodations have been provided for ' + (P.none ? 'their' : P.poss) + ' success. Please see the IPP for details regarding goals and progress.'; };
  C.full = function (body, st, signoff) { return [body, st && st.ipp ? C.ipp(st.name, st.pronouns) : '', signoff || ''].filter(Boolean).join(' '); };

  /* a student's evidence: subs = the class's submissions, due = mission ids due by now
     → { areas: { build: { level, score, n, best, worst } … }, nin, ndue, nmiss, overall, graded } */
  C.evidence = function (name, subs, due) {
    var mine = subs.filter(function (s) { return s.name === name; }), areas = {}, all = [];
    var graded = mine.filter(function (s) { return (s.status === 'graded' || s.status === 'revise') && s.levels && Object.keys(s.levels).length; });
    C.AREA_ORDER.forEach(function (a) {
      var pts = []; graded.forEach(function (s) { var lv = s.levels[a]; if (LADDER.indexOf(lv) >= 0) pts.push({ m: s.mission, i: LADDER.indexOf(lv) }); });
      if (!pts.length) return;
      var mean = pts.reduce(function (t, p) { return t + p.i; }, 0) / pts.length; all = all.concat(pts.map(function (p) { return p.i; }));
      var hi = pts.slice().sort(function (x, y) { return y.i - x.i; })[0], lo = pts.slice().sort(function (x, y) { return x.i - y.i; })[0];
      var title = function (m) { return (RL.MISSIONS[m] || {}).title || ''; };
      areas[a] = { area: a, score: mean, n: pts.length, level: LADDER[Math.round(mean)], best: hi.i >= Math.round(mean) && pts.length > 1 ? title(hi.m) : (pts.length === 1 ? title(hi.m) : ''), worst: lo.i < hi.i ? title(lo.m) : '' };
    });
    var handed = {}; mine.forEach(function (s) { handed[s.mission] = 1; });
    var ndue = due.length, nin = due.filter(function (m) { return handed[m]; }).length;
    return { areas: areas, nin: nin, ndue: ndue, nmiss: ndue - nin, overall: all.length ? all.reduce(function (t, x) { return t + x; }, 0) / all.length : null, graded: graded.length };
  };
  /* automatic picks: the best area, and the weakest other one (or handing in missions when 2+ due missions are missing
     and that's at least a quarter of them) */
  C.pick = function (ev) {
    var ks = Object.keys(ev.areas).sort(function (a, b) { return ev.areas[b].score - ev.areas[a].score || ev.areas[b].n - ev.areas[a].n || C.AREA_ORDER.indexOf(a) - C.AREA_ORDER.indexOf(b); });
    var s = ks[0] || null, g = null;
    if (ev.nmiss >= 2 && ev.nmiss >= ev.ndue / 4) g = 'missing';
    else if (ks.length > 1) g = ks[ks.length - 1];
    else if (ev.nmiss >= 1) g = 'missing';
    return { strength: s, growth: g };
  };

  /* ---------------- the tab ---------------- */
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, val) { try { if (val === undefined) return localStorage.getItem(k); if (val === null) localStorage.removeItem(k); else localStorage.setItem(k, val); } catch (e) { return null; } }
  function lsJ(k, d) { try { var x = JSON.parse(ls(k) || 'null'); return x == null ? d : x; } catch (e) { return d; } }
  function csvCell(x) { x = String(x == null ? '' : x); return /[",\r\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  function save(name, text) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400); }

  /* ctx = { D, cur, due: [mission ids due by today], onStudent(name) } */
  RL.CommentsTab = function (view, ctx) {
    var D = ctx.D, K = ctx.cur, roster = D.roster.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    view.appendChild(el('div', 'dhead', '<div><div class="label">' + esc(D.label) + '</div><h1>Report card comments</h1></div>'));
    var intro = el('section', 'panel rc-intro');
    intro.innerHTML = '<p class="small muted">Each comment is a course overview, one area of strength and one area for growth from your mission grades (Circuit, Code, Design &amp; testing, Explain it), the IPP sentence for students on an IPP, and a sign-off. The course name comes from each student’s level. Wording is shared out across the class so neighbours don’t read the same. Read every comment before it goes on a report card; change the strength or growth, or edit the words. Edits stay in this browser.</p>';
    view.appendChild(intro);
    var wordKey = 'rc-course', words = lsJ(wordKey, null) || C.COURSE.slice();
    var det = el('details', 'rc-words'); det.appendChild(el('summary', '', 'Course overview wordings (' + words.length + ')'));
    det.appendChild(el('p', 'small muted', 'One wording per line; <code>{course}</code> becomes the student’s course, e.g. Design Thinking for Innovation 25. Rewrite these as the semester’s units change. Students are given different wordings.'));
    var wt = el('textarea'); wt.rows = 7; wt.value = words.join('\n'); det.appendChild(wt);
    var wr = el('div', 'row2'), wsave = el('button', 'btn btn-primary btn-small', 'Save wordings'), wreset = el('button', 'btn btn-ghost btn-small', 'Back to the suggested wordings'); wsave.type = wreset.type = 'button';
    wsave.addEventListener('click', function () { var w = wt.value.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); if (!w.length) return; ls(wordKey, JSON.stringify(w)); words = w; redrawAll(); det.querySelector('summary').textContent = 'Course overview wordings (' + w.length + ')'; });
    wreset.addEventListener('click', function () { ls(wordKey, null); words = C.COURSE.slice(); wt.value = words.join('\n'); redrawAll(); });
    wr.appendChild(wsave); wr.appendChild(wreset); det.appendChild(wr); intro.appendChild(det);

    var editsKey = 'rc-edit:' + K, picksKey = 'rc-pick:' + K, signKey = 'rc-sign:' + K, signOnKey = 'rc-signon:' + K;
    var edits = lsJ(editsKey, {}), picks = lsJ(picksKey, {}), signs = lsJ(signKey, {}), signOn = ls(signOnKey) !== '0';
    var sl = el('label', 'row2 small'), sc = el('input'); sc.type = 'checkbox'; sc.checked = signOn;
    sc.addEventListener('change', function () { signOn = sc.checked; ls(signOnKey, signOn ? '1' : '0'); redrawAll(); });
    sl.appendChild(sc); sl.appendChild(document.createTextNode('End each comment with a sign-off (“Overall, great work this semester, …!”), matched to how the student did')); intro.appendChild(sl);
    var noLvl = roster.filter(function (s) { return !s.level; }).length, noPro = roster.filter(function (s) { return !s.pronouns; }).length;
    if (noLvl || noPro) intro.appendChild(el('p', 'small warn', [noLvl ? noLvl + ' without a level (their comment says “Design Thinking for Innovation” with no number)' : '', noPro ? noPro + ' without pronouns (their comment uses their first name instead)' : ''].filter(Boolean).join(' · ') + '. Set them in the table below or in the Roster tab.'));
    if (!ctx.due.length) intro.appendChild(el('p', 'small muted', 'No missions are due yet, so “handing in missions” isn’t used as an area for growth.'));

    if (!roster.length) { view.appendChild(el('div', 'empty', 'No students yet.')); return; }
    var t = el('table', 'tbl rc-tbl'); t.innerHTML = '<thead><tr><th>Student</th><th>Strength</th><th>Area for growth</th><th>Comment</th></tr></thead>';
    var tb = el('tbody'); t.appendChild(tb);
    var rot = C.rotation(), rows = [];
    var ladderIdx = function (lv) { return LADDER.indexOf(lv); };
    roster.forEach(function (s) {
      var ev = C.evidence(s.name, D.subs, ctx.due), pk = picks[s.name] || {}, tr = el('tr'), rec = { s: s, ev: ev };
      tr.innerHTML = '<td class="rc-who"><a href="#" class="slink">' + esc(s.name) + '</a><div class="rc-f"></div><div class="rc-ev small muted"></div></td><td class="rc-s"></td><td class="rc-g"></td><td class="rc-c"></td>';
      tr.querySelector('.slink').addEventListener('click', function (e) { e.preventDefault(); if (ctx.onStudent) ctx.onStudent(s.name); });
      var f = tr.querySelector('.rc-f');
      f.appendChild(RL.Dash.levelSelect(s, view, function () { draw(); }));
      f.appendChild(RL.Dash.pronounSelect(s, view, function () { draw(); }));
      var ipl = el('label', 'small rc-ipp'); ipl.appendChild(RL.Dash.ippBox(s, view, function () { draw(); })); ipl.appendChild(document.createTextNode(' IPP')); f.appendChild(ipl);
      tr.querySelector('.rc-ev').textContent = ev.graded ? ev.graded + ' graded · ' + (ev.ndue ? ev.nin + '/' + ev.ndue + ' due handed in' : 'none due yet') : (ev.ndue ? 'No grades yet · ' + ev.nin + '/' + ev.ndue + ' due handed in' : 'No grades yet');
      function areaLabel(a) { var x = ev.areas[a]; return C.AREAS[a].label + (x ? ' · ' + x.level + ' (' + x.n + ')' : ' · no grades'); }
      function sel(kind) {
        var x = el('select', 'field-sm rc-sel'); x.setAttribute('aria-label', (kind === 's' ? 'Strength' : 'Area for growth') + ' for ' + s.name);
        x.appendChild(new Option('Automatic', ''));
        C.AREA_ORDER.forEach(function (a) { var o = new Option(areaLabel(a), a); if (!ev.areas[a]) o.disabled = true; x.appendChild(o); });
        if (kind === 'g') x.appendChild(new Option('Handing in missions' + (ev.ndue ? ' · ' + ev.nin + '/' + ev.ndue : ''), 'missing'));
        x.value = pk[kind] || '';
        x.addEventListener('change', function () { pk[kind] = x.value; picks[s.name] = pk; ls(picksKey, JSON.stringify(picks)); delete edits[s.name]; ls(editsKey, JSON.stringify(edits)); draw(); });
        return x;
      }
      var sS = sel('s'), sG = sel('g'); tr.querySelector('.rc-s').appendChild(sS); tr.querySelector('.rc-g').appendChild(sG);
      var cc = tr.querySelector('.rc-c'), ta = el('textarea', 'rc-text'); ta.rows = 4; ta.setAttribute('aria-label', 'Comment for ' + s.name);
      var ippP = el('div', 'rc-ippline small'), so = el('input', 'field-sm rc-sign'), meta = el('div', 'rc-meta small muted'); so.type = 'text'; so.setAttribute('aria-label', 'Sign-off for ' + s.name);
      cc.appendChild(ta); cc.appendChild(ippP); cc.appendChild(so); cc.appendChild(meta);
      function draw() {
        var auto = C.pick(ev), sa = pk.s && ev.areas[pk.s] ? pk.s : auto.strength, ga = pk.g && (pk.g === 'missing' || ev.areas[pk.g]) ? pk.g : auto.growth;
        if (ga === sa && ga !== 'missing' && !pk.g) ga = null;
        sS.options[0].text = 'Automatic' + (sa && !pk.s ? ': ' + C.AREAS[sa].label : ''); sG.options[0].text = 'Automatic' + (ga && !pk.g ? ': ' + (ga === 'missing' ? 'Handing in missions' : C.AREAS[ga].label) : '');
        var S = sa ? Object.assign({}, ev.areas[sa]) : null, G = ga === 'missing' ? { area: 'missing', nin: ev.nin, ndue: ev.ndue, nmiss: ev.nmiss } : ga ? Object.assign({}, ev.areas[ga]) : null;
        if (S) S.worst = ''; if (G && G.area !== 'missing') G.best = '';
        var lv = RL.courseLevel(s.level), course = lv ? lv.name : 'Design Thinking for Innovation';
        var body = [C.courseLine(words, course, s.name, rot), (S || G) ? C.personal({ name: s.name, pronouns: s.pronouns, strength: S, growth: G }, rot) : ''].filter(Boolean).join(' ');
        var personal = edits[s.name] != null ? edits[s.name] : body;
        if (document.activeElement !== ta) ta.value = personal;
        fit(); requestAnimationFrame(fit);
        ippP.hidden = !s.ipp; ippP.textContent = s.ipp ? C.ipp(s.name, s.pronouns) : '';
        var autoSign = C.signoff(s, ev.overall, rot), sign = signOn ? (signs[s.name] != null ? signs[s.name] : autoSign) : '';
        so.hidden = !signOn; if (document.activeElement !== so) so.value = sign;
        var full = C.full(personal, s, sign);
        rec.full = full; rec.sign = sign; rec.sa = sa; rec.ga = ga;
        var empty = !S && !G && edits[s.name] == null;
        meta.innerHTML = (empty ? '<span class="warn">No grades yet: add your own strength and growth.</span> ' : '') + full.length + ' characters' + (edits[s.name] != null || (signOn && signs[s.name] != null) ? ' · edited <a href="#" class="rc-undo">use the suggested wording</a>' : '');
        var u = meta.querySelector('.rc-undo'); if (u) u.addEventListener('click', function (e) { e.preventDefault(); delete edits[s.name]; delete signs[s.name]; ls(editsKey, JSON.stringify(edits)); ls(signKey, JSON.stringify(signs)); so.value = ''; ta.blur(); draw(); });
        tr.classList.toggle('rc-empty', empty);
      }
      function fit() { if (!ta.isConnected) return; ta.style.height = 'auto'; ta.style.height = Math.max(72, ta.scrollHeight + 2) + 'px'; }
      ta.addEventListener('input', function () { edits[s.name] = ta.value; ls(editsKey, JSON.stringify(edits)); draw(); });
      so.addEventListener('input', function () { signs[s.name] = so.value; ls(signKey, JSON.stringify(signs)); draw(); });
      rec.draw = draw; rows.push(rec); draw();
      tb.appendChild(tr);
    });
    function redrawAll() { rot = C.rotation(); rows.forEach(function (r) { r.draw(); }); }
    var wrap = el('div', 'tbl-wrap'); wrap.appendChild(t); view.appendChild(wrap);
    var bar = el('div', 'row2 rc-bar'), dl = el('button', 'btn btn-primary btn-small', 'Download comments (.csv)'), cp = el('button', 'btn btn-ghost btn-small', 'Copy all'); dl.type = cp.type = 'button';
    function table() {
      var out = [['Student Num', 'Student Name', 'Level', 'Comment', 'IPP sentence', 'Sign-off', 'Strength', 'Area for growth']];
      rows.forEach(function (r) { var lv = RL.courseLevel(r.s.level); out.push([r.s.num || '', r.s.name, lv ? lv.short : '', r.full, r.s.ipp ? C.ipp(r.s.name, r.s.pronouns) : '', r.sign || '', r.sa ? C.AREAS[r.sa].label : '', r.ga === 'missing' ? 'Handing in missions' : r.ga ? C.AREAS[r.ga].label : '']); });
      return out;
    }
    dl.addEventListener('click', function () { save((D.label || 'Robotics') .replace(/[\\\/:*?"<>|]+/g, ' ') + ' report card comments.csv', '﻿' + table().map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'); });
    cp.addEventListener('click', function () { var txt = rows.map(function (r) { return r.s.name + '\n' + r.full; }).join('\n\n'); if (RL.Code && RL.Code.copy) RL.Code.copy(txt, cp); });
    bar.appendChild(dl); bar.appendChild(cp); view.appendChild(bar);
  };
})(window);
