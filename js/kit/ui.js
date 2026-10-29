/* RL.UI — building blocks for mission steps: checkpoints, notes, explainer animations, hotspot diagrams, test checklists,
 * challenge cards and the parts checklist. Every interactive block saves through ctx (progress syncs to the teacher). */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UI = RL.UI = {};
  RL.el = RL.el || el; RL.esc = RL.esc || esc;

  UI.html = function (container, html) { var d = el('div', '', html); while (d.firstChild) container.appendChild(d.firstChild); };
  UI.callout = function (container, kind, label, html) { var c = el('div', 'callout' + (kind ? ' ' + kind : ''), '<span class="label">' + esc(label) + '</span>' + html); container.appendChild(c); return c; };
  UI.edp = function (container, on) {
    var st = ['ASK', 'RESEARCH', 'IMAGINE', 'PLAN', 'CREATE', 'TEST', 'IMPROVE'], d = el('div', 'edp');
    st.forEach(function (s, i) { d.appendChild(el('span', (on || []).indexOf(i + 1) >= 0 ? 'on' : '', '0' + (i + 1) + ' ' + s)); });
    container.appendChild(d); return d;
  };

  /* multiple choice: { id, q, options: [html], answer: index, explain: html, hints: { index: html } } */
  UI.mcq = function (container, ctx, o) {
    var box = el('div', 'chk'), saved = ctx.check(o.id);
    box.innerHTML = '<div class="label c">Checkpoint</div><div class="chk-q">' + o.q + '</div>';
    var opts = el('div', 'chk-opts'), fb = el('div', 'chk-fb'), tries = saved ? saved.tries || 0 : 0;
    o.options.forEach(function (t, i) {
      var b = el('button', 'chk-opt', '<span class="k">' + 'ABCDEF'[i] + '</span><span>' + t + '</span>'); b.type = 'button';
      b.addEventListener('click', function () { pick(i, true); });
      opts.appendChild(b);
    });
    function pick(i, fresh) {
      var right = i === o.answer, bs = opts.children;
      for (var k = 0; k < bs.length; k++) { bs[k].classList.remove('right', 'wrong'); }
      bs[i].classList.add(right ? 'right' : 'wrong');
      if (right) { for (k = 0; k < bs.length; k++) bs[k].disabled = true; }
      fb.innerHTML = right ? '<b class="pass">PASS</b> · ' + (o.explain || 'That’s it.') : '<b class="retry">RETRY</b> · ' + ((o.hints && o.hints[i]) || 'Not quite — think it through and try another answer.');
      if (fresh) { tries++; ctx.check(o.id, { pick: i, ok: right, tries: tries, first: saved && saved.first != null ? saved.first : right }); if (!saved) saved = { first: right }; }
    }
    box.appendChild(opts); box.appendChild(fb); container.appendChild(box);
    if (saved && saved.pick != null) pick(saved.pick, false);
    return box;
  };
  /* number answer: { id, q, answer, tol (absolute), unit, explain, hint } */
  UI.numq = function (container, ctx, o) {
    var box = el('div', 'chk'), saved = ctx.check(o.id);
    box.innerHTML = '<div class="label c">Checkpoint</div><div class="chk-q">' + o.q + '</div>';
    var row = el('div', 'chk-num'), inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.setAttribute('aria-label', 'Your answer');
    var unit = el('span', 'muted', esc(o.unit || '')), go = el('button', 'btn btn-small', 'Check'); go.type = 'button';
    row.appendChild(inp); row.appendChild(unit); row.appendChild(go);
    var fb = el('div', 'chk-fb'), tries = saved ? saved.tries || 0 : 0;
    function test(v, fresh) {
      var n = Number(String(v).replace(/[^\d.\-]/g, '')), ok = String(v).trim() !== '' && !isNaN(n) && Math.abs(n - o.answer) <= (o.tol || 0);
      fb.innerHTML = ok ? '<b class="pass">PASS</b> · ' + (o.explain || '') : '<b class="retry">RETRY</b> · ' + (o.hint || 'Check your working and try again.');
      if (ok) { inp.disabled = true; go.disabled = true; }
      if (fresh) { tries++; ctx.check(o.id, { val: v, ok: ok, tries: tries, first: saved && saved.first != null ? saved.first : ok }); if (!saved) saved = { first: ok }; }
    }
    go.addEventListener('click', function () { test(inp.value, true); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') test(inp.value, true); });
    box.appendChild(row); box.appendChild(fb); container.appendChild(box);
    if (saved && saved.val != null) { inp.value = saved.val; test(saved.val, false); }
    return box;
  };
  /* a short written answer saved with the mission: { id, label, placeholder, rows } */
  UI.note = function (container, ctx, o) {
    var box = el('div', 'note-box'), id = 'n-' + o.id;
    box.innerHTML = '<label for="' + id + '">' + o.label + '</label>';
    var ta = el('textarea'); ta.id = id; ta.rows = o.rows || 3; ta.placeholder = o.placeholder || ''; ta.value = ctx.answer(o.id);
    var s = el('div', 'saved', ''), t = null;
    ta.addEventListener('input', function () { clearTimeout(t); s.textContent = 'Saving…'; t = setTimeout(function () { ctx.answer(o.id, ta.value); s.textContent = 'Saved'; }, 500); });
    box.appendChild(ta); box.appendChild(s); container.appendChild(box);
    return ta;
  };

  /* an animated explainer: { label, title, w, h, frames: [{ cap: html, draw(svg, S, prev) }], init(svg, S), interactive (no auto-advance) }
   * S = RL.Board.el (makes SVG elements). Tapping the picture goes to the next frame. */
  UI.explainer = function (container, o) {
    var S = RL.Board.el, box = el('div', 'xp');
    box.innerHTML = '<div class="xp-h"><span class="label">' + esc(o.label || 'Explainer') + '</span><h3>' + esc(o.title) + '</h3></div>';
    var stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 ' + (o.w || 800) + ' ' + (o.h || 360), role: 'img', 'aria-label': o.title });
    stage.appendChild(svg); box.appendChild(stage);
    var cap = el('div', 'xp-cap'); box.appendChild(cap);
    var ctl = el('div', 'xp-ctl');
    var prev = el('button', 'btn btn-ghost btn-small', '← Back'), next = el('button', 'btn btn-primary btn-small', 'Next →'), dots = el('div', 'dots');
    prev.type = next.type = 'button';
    if (o.frames.length > 1) { ctl.appendChild(prev); ctl.appendChild(next); ctl.appendChild(dots); box.appendChild(ctl); }
    if (o.extra) o.extra(box);
    container.appendChild(box);
    var state = {}, i = -1, timers = [];
    state.later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    state.svg = svg;
    if (o.init) o.init(svg, S, state);
    function go(k) {
      if (i >= 0) timers.splice(0).forEach(clearTimeout); // (the first frame keeps animations init started)
      i = Math.max(0, Math.min(o.frames.length - 1, k));
      var f = o.frames[i];
      cap.innerHTML = '<p>' + f.cap + '</p>';
      f.draw(svg, S, state);
      prev.disabled = i === 0; next.textContent = i === o.frames.length - 1 ? 'Replay' : 'Next →';
      dots.innerHTML = o.frames.map(function (_, j) { return '<i class="' + (j <= i ? 'on' : '') + '"></i>'; }).join('');
    }
    prev.addEventListener('click', function () { go(i - 1); });
    next.addEventListener('click', function () { go(i === o.frames.length - 1 ? 0 : i + 1); });
    if (o.frames.length > 1 && !o.interactive) stage.addEventListener('click', function (e) { if (e.target.closest('button,input,a,[role=button]')) return; go(i === o.frames.length - 1 ? 0 : i + 1); });
    var started = false; function start() { if (!started) { started = true; go(0); } }
    if (root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { start(); io.disconnect(); } }, { threshold: 0.35 }); io.observe(box); setTimeout(function () { if (!started && box.getBoundingClientRect().top < innerHeight) start(); }, 400); }
    else start();
    if (RL.onLeave) RL.onLeave(function () { timers.splice(0).forEach(clearTimeout); if (state.stop) state.stop(); });
    return { box: box, go: go, state: state };
  };

  /* hotspot diagram: { title, label, svg (element), spots: [{ id, x, y, title, html }], ctx, key } */
  UI.hotspots = function (container, o) {
    var S = RL.Board.el, box = el('div', 'xp');
    box.innerHTML = '<div class="xp-h"><span class="label">' + esc(o.label || 'Explore') + '</span><h3>' + esc(o.title) + '</h3><span class="label hs-count"></span></div>';
    var hs = el('div', 'hs'), stage = el('div', 'hs-stage'), info = el('div', 'hs-info');
    stage.appendChild(o.svg); hs.appendChild(stage); hs.appendChild(info); box.appendChild(hs); container.appendChild(box);
    var seen = (o.ctx && o.key && o.ctx.check(o.key)) || {}, dots = {}, list = el('div', 'hs-list');
    var layer = S('g', {}, o.svg);
    o.spots.forEach(function (sp) {
      var g = S('g', { 'class': 'hs-dot', tabindex: 0, role: 'button', 'aria-label': sp.title }, layer);
      S('circle', { cx: sp.x, cy: sp.y, r: 14, 'class': 'r' }, g); S('circle', { cx: sp.x, cy: sp.y, r: 8, 'class': 'd' }, g);
      g.addEventListener('click', function () { show(sp); }); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(sp); } });
      dots[sp.id] = g;
      var b = el('button', seen[sp.id] ? 'seen' : '', esc(sp.title)); b.type = 'button'; b.addEventListener('click', function () { show(sp); }); b.dataset.id = sp.id; list.appendChild(b);
    });
    function count() { var n = Object.keys(seen).length; box.querySelector('.hs-count').textContent = n + ' / ' + o.spots.length + ' explored'; }
    function show(sp) {
      Object.keys(dots).forEach(function (k) { dots[k].classList.toggle('on', k === sp.id); });
      list.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.id === sp.id); if (b.dataset.id === sp.id) b.classList.add('seen'); });
      info.innerHTML = '<div class="label c">' + esc(o.label || 'Explore') + '</div><h3>' + esc(sp.title) + '</h3>' + sp.html;
      info.appendChild(list);
      if (!seen[sp.id]) { seen[sp.id] = 1; if (o.ctx && o.key) o.ctx.check(o.key, seen); count(); }
    }
    info.innerHTML = '<p class="muted">' + (o.intro || 'Tap a glowing dot to learn what that part does.') + '</p>'; info.appendChild(list);
    count();
    return box;
  };

  /* PASS / RETRY test checklist: { id, rows: [html] } */
  UI.tests = function (container, ctx, o) {
    var box = el('div', 'tests'), st = ctx.check(o.id) || {};
    o.rows.forEach(function (r, i) {
      var row = el('div', 'trow', '<div>' + r + '</div>'), tb = el('div', 'tb');
      var p = el('button', 'pass', 'PASS'), f = el('button', 'retry', 'RETRY'); p.type = f.type = 'button';
      function set(v) { st[i] = v; p.classList.toggle('on', v === 'P'); f.classList.toggle('on', v === 'R'); ctx.check(o.id, st); }
      p.addEventListener('click', function () { set('P'); }); f.addEventListener('click', function () { set('R'); });
      if (st[i] === 'P') p.classList.add('on'); if (st[i] === 'R') f.classList.add('on');
      tb.appendChild(p); tb.appendChild(f); row.appendChild(tb); box.appendChild(row);
    });
    container.appendChild(box); return box;
  };
  /* challenge cards: [{ tag, title, html, hint }] */
  UI.challenges = function (container, list) {
    var box = el('div', 'challenges');
    list.forEach(function (c) { box.appendChild(el('div', 'chal', '<span class="tag ' + (c.cls || '') + '">' + esc(c.tag) + '</span><h3>' + esc(c.title) + '</h3><p>' + c.html + '</p>' + (c.hint ? '<details><summary>Hint</summary>' + c.hint + '</details>' : ''))); });
    container.appendChild(box); return box;
  };
  /* parts checklist: [{ id, name, note, icon(svg, S) }] — tap to tick off what you've found in your kit */
  UI.gear = function (container, ctx, key, items) {
    var S = RL.Board.el, box = el('div', 'gear'), got = ctx.check(key) || {};
    items.forEach(function (it) {
      var b = el('button', 'gear-it' + (got[it.id] ? ' got' : '')); b.type = 'button'; b.setAttribute('aria-pressed', got[it.id] ? 'true' : 'false');
      var svg = S('svg', { viewBox: '0 0 120 70', 'aria-hidden': 'true' }); it.icon(svg, S); b.appendChild(svg);
      b.appendChild(el('b', '', esc(it.name))); b.appendChild(el('span', 'small', esc(it.note || '')));
      var m = el('span', 'chkm', got[it.id] ? '✓ Found' : 'Tap when found'); b.appendChild(m);
      b.addEventListener('click', function () { got[it.id] = !got[it.id]; if (!got[it.id]) delete got[it.id]; b.classList.toggle('got', !!got[it.id]); b.setAttribute('aria-pressed', got[it.id] ? 'true' : 'false'); m.textContent = got[it.id] ? '✓ Found' : 'Tap when found'; ctx.check(key, got); });
      box.appendChild(b);
    });
    container.appendChild(box); return box;
  };
})(window);
