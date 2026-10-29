/* RL.Fusion — building blocks for the Fusion 360 missions (Unit 1).
 *  shots()      a guided walk-through of real Fusion screenshots: it zooms to the part of the screen that matters, a cursor
 *               glides to what to click, fields fill in as if typed, and key presses pop up. "Play" runs it like a video.
 *  viewer()     a 3D view that handles like Fusion (orbit, pan, zoom, ViewCube, Home), drawn with three.js (loaded on demand).
 *  navTrainer() find the letter on every face of a cube (practise orbit, pan, zoom and the ViewCube).
 *  sketchLab()  "make it black": add dimensions to a sketch until it's fully defined.
 *  extrudeLab(), filletLab(), textLab()  try each tool on the keychain before doing it in Fusion.
 *  stlCheck()   open an exported .stl, see it in 3D and check its size and that it's closed (ready to print).
 *  stlView()    the same 3D preview, for the teacher's grading view.
 * Everything that's saved goes through ctx (progress syncs to the teacher). */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  var F = RL.Fusion = {};
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/js\/kit\/fusion\.js.*$/, '') : ''; })();
  F.base = BASE;
  function leave(fn) { if (RL.onLeave) RL.onLeave(fn); }
  var ease = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  var MARK = '#ff6a13';

  /* ============ loading three.js and the font ============ */
  var threeP = null, fontP = null;
  F.three = function () {
    if (root.THREE) return Promise.resolve(root.THREE);
    if (!threeP) threeP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = BASE + 'assets/vendor/three-r128.min.js';
      s.onload = function () { res(root.THREE); }; s.onerror = function () { threeP = null; rej(new Error('three.js did not load')); };
      document.head.appendChild(s);
    });
    return threeP;
  };
  F.font = function () {
    return F.three().then(function (T) {
      if (!fontP) fontP = new Promise(function (res, rej) { new T.FontLoader().load(BASE + 'assets/vendor/helvetiker_bold.typeface.json', res, undefined, function (e) { fontP = null; rej(e); }); });
      return fontP;
    });
  };

  /* ============ screenshot walk-through ============
   * o: { label, title, steps: [{ img, view: [cx, cy, width] | 'full', cap: html, marks: [...] }], ctx, key }
   * marks (in screenshot pixels): { t: 'ring', x, y, r } · { t: 'box', x, y, w, h } · { t: 'click', x, y, dbl } ·
   *   { t: 'drag', x1, y1, x2, y2 } · { t: 'type', x, y, w, h, text, align } · { t: 'key', k: 'E' } ·
   *   { t: 'label', x, y, text, dx, dy } · { t: 'arrow', x1, y1, x2, y2 } · { t: 'wait', ms } · { t: 'cover', x, y, w, h } ·
   *   { t: 'move', x, y } (cursor only) · { t: 'circle', x, y, r } (a sketch circle being drawn) */
  var IMG = { recttype: [1372, 891, 0.6], underdefined: [794, 456], defined: [882, 507], textdone: [1254, 524] };
  var AR = 1.6;
  function info(name) { var i = IMG[name] || [1372, 891]; return { w: i[0], h: i[1], shot: i[1] === 891 }; }
  function vbOf(step) {
    var I = info(step.img), v = step.view;
    if (!v || v === 'full') v = I.shot ? [686, 461, 1372] : [I.w / 2, I.h / 2, Math.max(I.w, I.h * AR) * 1.04];
    var w = v[2], h = w / AR, x = v[0] - w / 2, y = v[1] - h / 2, top = I.shot ? 31 : 0;
    if (w <= I.w) x = Math.max(0, Math.min(I.w - w, x));
    if (h <= I.h - top) y = Math.max(top, Math.min(I.h - h, y));
    return [x, y, w, h];
  }
  F.img = function (name) { return BASE + 'assets/fusion/' + name + '.jpg'; };
  var preloaded = {};
  function preload(name) { if (!name || preloaded[name]) return; preloaded[name] = 1; var im = new Image(); im.src = F.img(name); }

  F.shots = function (container, o) {
    var box = el('div', 'xp fx-shots');
    box.innerHTML = '<div class="xp-h"><span class="label">' + esc(o.label || 'In Fusion') + '</span><h3>' + esc(o.title) + '</h3><span class="label fx-count"></span></div>';
    var stage = el('div', 'fx-stage');
    var svg = S('svg', { viewBox: '0 0 1372 857', 'data-art': 'keep', role: 'img', 'aria-label': o.title, preserveAspectRatio: 'xMidYMid meet' });
    S('rect', { x: -4000, y: -4000, width: 9000, height: 9000, fill: '#e7eaee' }, svg);
    var imgs = [S('image', { x: 0, y: 0, width: 1372, height: 891, preserveAspectRatio: 'none' }, svg), S('image', { x: 0, y: 0, width: 1372, height: 891, preserveAspectRatio: 'none' }, svg)];
    imgs.forEach(function (im) { im.style.transition = 'opacity .35s'; im.style.opacity = 0; });
    var marks = S('g', {}, svg), top = S('g', {}, svg);
    var cursor = S('g', { 'class': 'fx-cursor', opacity: 0 }, top);
    S('path', { d: 'M0 0 L0 22 L5.5 16.8 L9.6 26 L13.4 24.4 L9.4 15.4 L16.6 15.4 Z', fill: '#fff', stroke: '#111', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, cursor);
    stage.appendChild(svg);
    var keyPop = el('div', 'fx-key'); stage.appendChild(keyPop);
    box.appendChild(stage);
    var cap = el('div', 'xp-cap fx-cap'); box.appendChild(cap);
    var ctl = el('div', 'xp-ctl');
    function btn(cls, html, title) { var b = el('button', 'btn btn-small ' + cls, html); b.type = 'button'; if (title) b.title = title; ctl.appendChild(b); return b; }
    var prev = btn('btn-ghost', '← Back'), play = btn('btn-ghost fx-play', '▶ Play all', 'Play every step like a video'), next = btn('btn-primary', 'Next →');
    var again = btn('btn-ghost', '↻ Replay step'), whole = btn('btn-ghost', '⤢ Whole screen', 'Zoom out to see the whole Fusion window');
    var dots = el('div', 'dots'); ctl.appendChild(dots); box.appendChild(ctl);
    container.appendChild(box);

    var steps = o.steps, i = -1, front = 0, curImg = null, timers = [], tweens = [], raf = 0, playing = false, zoomedOut = false;
    var vb = vbOf(steps[0]).slice(), cur = { x: vb[0] + vb[2] * 0.6, y: vb[1] + vb[3] * 0.7 }, scaled = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function k() { return vb[2] / 1000; }
    function tween(dur, fn, done) { tweens.push({ t0: performance.now(), dur: dur, fn: fn, done: done }); loop(); }
    function loop() { if (!raf) raf = requestAnimationFrame(tick); }
    function tick(now) {
      raf = 0;
      tweens = tweens.filter(function (tw) { var p = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(ease(p), p); if (p >= 1 && tw.done) tw.done(); return p < 1; });
      svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(1); }).join(' '));
      var kk = k();
      cursor.setAttribute('transform', 'translate(' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1) + ') scale(' + (kk * 1.15).toFixed(3) + ')');
      scaled.forEach(function (g) { g.el.setAttribute('transform', 'translate(' + g.x + ' ' + g.y + ') scale(' + kk.toFixed(3) + ')'); });
      if (tweens.length) loop();
    }
    function zoomTo(target, dur, done) {
      var from = vb.slice();
      if (!dur) { vb = target.slice(); loop(); if (done) done(); return; }
      tween(dur, function (p) { for (var j = 0; j < 4; j++) vb[j] = from[j] + (target[j] - from[j]) * p; }, done);
    }
    function moveCursor(x, y, dur, done) {
      var fx = cur.x, fy = cur.y; cursor.setAttribute('opacity', 1);
      tween(dur, function (p) { cur.x = fx + (x - fx) * p; cur.y = fy + (y - fy) * p; }, done);
    }
    function ripple(x, y) {
      var c = S('circle', { cx: x, cy: y, r: 0, fill: 'none', stroke: MARK, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }, marks);
      var R = 26 * k();
      tween(520, function (p, raw) { c.setAttribute('r', (R * raw).toFixed(1)); c.setAttribute('opacity', (1 - raw).toFixed(2)); }, function () { c.remove(); });
    }
    function showKey(label) {
      keyPop.innerHTML = label.split('+').map(function (s) { return '<kbd>' + esc(s) + '</kbd>'; }).join('<span>+</span>');
      keyPop.classList.remove('on'); void keyPop.offsetWidth; keyPop.classList.add('on');
      later(function () { keyPop.classList.remove('on'); }, 1500);
    }
    function scaledGroup(x, y) { var g = S('g', {}, marks); scaled.push({ el: g, x: x, y: y }); return g; }
    function label(m) {
      var g = scaledGroup(m.x, m.y), dx = m.dx == null ? 18 : m.dx, dy = m.dy == null ? -18 : m.dy;
      var t = S('text', { x: dx + 10, y: dy + 5, 'font-family': 'IBM Plex Sans, system-ui, sans-serif', 'font-size': 16, 'font-weight': 600, fill: '#fff' }, g); t.textContent = m.text;
      var w = Math.max(30, m.text.length * 8.6 + 20);
      var r = S('rect', { x: dx, y: dy - 14, width: w, height: 28, rx: 6, fill: MARK }, g); g.insertBefore(r, t);
      if (dx || dy) { var ln = S('line', { x1: 0, y1: 0, x2: dx + (dx < 0 ? w : 0), y2: dy, stroke: MARK, 'stroke-width': 2.5 }, g); g.insertBefore(ln, r); }
      S('circle', { cx: 0, cy: 0, r: 4, fill: MARK }, g);
      loop();
    }
    function typeInto(m, done) {
      var g = S('g', {}, marks), h = m.h || 24;
      S('rect', { x: m.x - (m.w || 110) / 2, y: m.y - h / 2, width: m.w || 110, height: h, rx: 3, fill: '#fff', stroke: '#2f7ad8', 'stroke-width': 1.6 }, g);
      var tx = m.align === 'left' ? m.x - (m.w || 110) / 2 + 8 : m.x, t = S('text', { x: tx, y: m.y + h * 0.22, 'text-anchor': m.align === 'left' ? 'start' : 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': h * 0.58, fill: '#111' }, g);
      var n = 0, str = String(m.text);
      (function one() { n++; t.textContent = str.slice(0, n) + (n < str.length ? '|' : ''); if (n < str.length) later(one, 95); else if (done) later(done, 250); })();
    }
    function run(list, j) {
      if (j >= list.length) { stepDone(); return; }
      var m = list[j], nxt = function () { run(list, j + 1); };
      if (m.t === 'ring') { S('circle', { cx: m.x, cy: m.y, r: m.r || 22, fill: 'none', stroke: MARK, 'stroke-width': 3.5, 'vector-effect': 'non-scaling-stroke', 'class': 'fx-pulse' }, marks); later(nxt, 250); }
      else if (m.t === 'box') { S('rect', { x: m.x, y: m.y, width: m.w, height: m.h, rx: 6, fill: 'none', stroke: MARK, 'stroke-width': 3.5, 'vector-effect': 'non-scaling-stroke', 'class': 'fx-pulse' }, marks); later(nxt, 250); }
      else if (m.t === 'cover') { S('rect', { x: m.x, y: m.y, width: m.w, height: m.h, fill: m.fill || '#f4f5f6' }, marks); nxt(); }
      else if (m.t === 'label') { label(m); later(nxt, 300); }
      else if (m.t === 'arrow') {
        S('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, stroke: MARK, 'stroke-width': 3.5, 'vector-effect': 'non-scaling-stroke' }, marks);
        var a = Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180 / Math.PI, g = scaledGroup(m.x2, m.y2);
        S('path', { d: 'M0 0 L-16 -8 L-16 8 Z', fill: MARK, transform: 'rotate(' + a.toFixed(1) + ')' }, g); loop(); later(nxt, 300);
      }
      else if (m.t === 'click') { moveCursor(m.x, m.y, 650, function () { ripple(m.x, m.y); if (m.dbl) later(function () { ripple(m.x, m.y); }, 160); later(nxt, m.dbl ? 450 : 350); }); }
      else if (m.t === 'drag') {
        moveCursor(m.x1, m.y1, 550, function () {
          ripple(m.x1, m.y1);
          var ln = S('line', { x1: m.x1, y1: m.y1, x2: m.x1, y2: m.y1, stroke: MARK, 'stroke-width': 2.5, 'stroke-dasharray': '6 5', 'vector-effect': 'non-scaling-stroke' }, marks);
          later(function () { moveCursor(m.x2, m.y2, 900, function () { later(nxt, 300); }); tween(900, function (p) { ln.setAttribute('x2', cur.x); ln.setAttribute('y2', cur.y); }); }, 200);
        });
      }
      else if (m.t === 'move') moveCursor(m.x, m.y, m.ms || 600, function () { later(nxt, 200); });
      else if (m.t === 'circle') {
        var cc = S('circle', { cx: m.x, cy: m.y, r: 0.1, fill: 'rgba(80,150,230,.12)', stroke: m.color || '#1f6fd1', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, marks);
        moveCursor(m.x + m.r * 0.71, m.y - m.r * 0.71, 600); tween(600, function (p) { cc.setAttribute('r', Math.max(0.1, m.r * p).toFixed(2)); }, function () { later(nxt, 150); });
      }
      else if (m.t === 'type') typeInto(m, nxt);
      else if (m.t === 'key') { showKey(m.k); later(nxt, 900); }
      else if (m.t === 'wait') later(nxt, m.ms || 600);
      else nxt();
    }
    function stepDone() {
      if (o.ctx && o.key && i === steps.length - 1) { var s0 = o.ctx.check(o.key) || {}; if (!s0.done) o.ctx.check(o.key, { done: 1 }); }
      if (playing) { if (i < steps.length - 1) later(function () { if (playing) go(i + 1); }, 1600 + cap.textContent.length * 28); else setPlay(false); }
    }
    function setImage(name) {
      if (curImg === name) return;
      var I = info(name), im = imgs[1 - front];
      im.setAttribute('href', F.img(name));
      im.setAttribute('width', I.shot ? 1372 : I.w); im.setAttribute('height', I.shot ? 891 : I.h);
      im.style.opacity = 1; imgs[front].style.opacity = 0; front = 1 - front; curImg = name;
    }
    function go(n, opts) {
      timers.splice(0).forEach(clearTimeout); tweens = []; scaled = []; keyPop.classList.remove('on');
      while (marks.firstChild) marks.removeChild(marks.firstChild);
      var prevInfo = i >= 0 ? info(steps[i].img) : null;
      i = Math.max(0, Math.min(steps.length - 1, n)); zoomedOut = false; whole.textContent = '⤢ Whole screen';
      var st = steps[i], I = info(st.img), target = vbOf(st);
      setImage(st.img); preload(steps[i + 1] && steps[i + 1].img); preload(steps[i + 2] && steps[i + 2].img);
      cap.innerHTML = '<p><span class="fx-n">' + (i + 1) + '</span>' + st.cap + '</p>';
      box.querySelector('.fx-count').textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      prev.disabled = i === 0; next.textContent = i === steps.length - 1 ? 'Start over' : 'Next →';
      dots.innerHTML = steps.map(function (_, j) { return '<i class="' + (j <= i ? 'on' : '') + '"></i>'; }).join('');
      var sameFrame = prevInfo && prevInfo.w === I.w && prevInfo.h === I.h && !(opts && opts.jump);
      if (!sameFrame) { cursor.setAttribute('opacity', 0); cur = { x: target[0] + target[2] * 0.62, y: target[1] + target[3] * 0.72 }; }
      zoomTo(target, sameFrame ? 750 : 0, function () { later(function () { run(st.marks || [], 0); }, sameFrame ? 150 : 380); });
    }
    function setPlay(on) { playing = on; play.textContent = on ? '❚❚ Pause' : '▶ Play all'; play.classList.toggle('on', on); }
    prev.addEventListener('click', function () { setPlay(false); go(i - 1); });
    next.addEventListener('click', function () { setPlay(false); go(i === steps.length - 1 ? 0 : i + 1, { jump: i === steps.length - 1 }); });
    again.addEventListener('click', function () { setPlay(false); var j = i; i = -1; go(j, { jump: true }); });
    play.addEventListener('click', function () { if (playing) { setPlay(false); timers.splice(0).forEach(clearTimeout); } else { setPlay(true); go(i === steps.length - 1 ? 0 : i, { jump: true }); } });
    whole.addEventListener('click', function () {
      zoomedOut = !zoomedOut; whole.textContent = zoomedOut ? '⤡ Zoom in' : '⤢ Whole screen';
      zoomTo(zoomedOut ? vbOf({ img: steps[i].img }) : vbOf(steps[i]), 600);
    });
    stage.addEventListener('click', function () { if (!playing) next.click(); });
    var started = false; function start() { if (!started) { started = true; preload(steps[0].img); go(0); } }
    if (root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { start(); io.disconnect(); } }, { threshold: 0.3 }); io.observe(box); setTimeout(function () { if (!started && box.getBoundingClientRect().top < innerHeight) start(); }, 400); }
    else start();
    leave(function () { setPlay(false); timers.splice(0).forEach(clearTimeout); tweens = []; if (raf) cancelAnimationFrame(raf); });
    return { box: box, go: go };
  };

  /* a screenshot with tappable spots (for the interface tour) */
  F.hotspotShot = function (container, o) {
    var I = info(o.img), v = vbOf({ img: o.img, view: o.view });
    var svg = S('svg', { viewBox: v.join(' '), 'data-art': 'keep', role: 'img', 'aria-label': o.title });
    S('image', { href: F.img(o.img), x: 0, y: 0, width: I.w, height: I.h }, svg);
    (o.covers || []).forEach(function (c) { S('rect', { x: c.x, y: c.y, width: c.w, height: c.h, fill: c.fill || '#f4f5f6' }, svg); });
    var spots = o.spots.map(function (s) { return Object.assign({}, s); });
    var box = RL.UI.hotspots(container, { title: o.title, label: o.label || 'Explore', svg: svg, spots: spots, ctx: o.ctx, key: o.key, intro: o.intro });
    box.classList.add('fx-hs');
    var f = v[2] / 1150; box.querySelectorAll('.hs-dot circle').forEach(function (c) { c.setAttribute('r', (+c.getAttribute('r')) * f); });
    return box;
  };

  /* ============ 3D viewer ============ */
  var VIEWS = { home: [-Math.PI / 4, 0.9553], top: [-Math.PI / 2, 0.0008], bottom: [-Math.PI / 2, Math.PI - 0.0008], front: [-Math.PI / 2, Math.PI / 2], back: [Math.PI / 2, Math.PI / 2], right: [0, Math.PI / 2], left: [Math.PI, Math.PI / 2] };
  F.viewer = function (container, o) {
    o = o || {};
    var box = el('div', 'fx-view'); box.style.height = (o.height || 380) + 'px';
    var msg = el('div', 'fx-load', 'Loading the 3D view…'); box.appendChild(msg);
    container.appendChild(box);
    var api = box.__fx = { box: box, stats: { orbit: 0, pan: 0, zoom: 0, cube: 0, fusionOrbit: 0, home: 0 }, onChange: null };
    var killed = false; api.dispose = function () { killed = true; };
    api.ready = F.three().then(function (T) { if (killed) throw new Error('closed'); build(T); return api; }, function (e) { msg.textContent = 'The 3D view couldn’t load. Check your internet connection and reload the page.'; throw e; });
    function build(T) {
      api.T = T; msg.remove();
      var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!o.keepBuffer });
      renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1)); renderer.autoClear = false;
      var canvas = renderer.domElement; canvas.className = 'fx-canvas'; canvas.setAttribute('aria-label', o.label || '3D view'); box.appendChild(canvas);
      var scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
      scene.add(new T.HemisphereLight(0xffffff, 0x80858c, 0.55));
      var dl = new T.DirectionalLight(0xffffff, 0.5); dl.position.set(0.6, 1.2, 2); camera.add(dl); scene.add(camera);
      var amb = new T.AmbientLight(0xffffff, 0.12); scene.add(amb);
      if (o.grid !== false) scene.add(grid(T, o.gridSize || 100));
      var rootG = new T.Group(); scene.add(rootG);
      var st = { target: new T.Vector3(0, 0, 0), dist: 160, theta: VIEWS.home[0], phi: VIEWS.home[1] }, homeFit = null;
      var dirty = true, raf = 0, tws = [], dead = false, frameFns = [];
      function place() {
        st.phi = Math.max(0.0008, Math.min(Math.PI - 0.0008, st.phi));
        var sp = Math.sin(st.phi);
        camera.position.set(st.target.x + st.dist * sp * Math.cos(st.theta), st.target.y + st.dist * sp * Math.sin(st.theta), st.target.z + st.dist * Math.cos(st.phi));
        camera.lookAt(st.target);
      }
      function render() { dirty = true; if (!raf && !dead) raf = requestAnimationFrame(draw); }
      // ---- ViewCube ----
      var cube = o.cube === false ? null : makeCube(T), CUBE = 112;
      function draw(now) {
        raf = 0; if (dead) return;
        tws = tws.filter(function (tw) { var p = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(ease(p)); if (p >= 1 && tw.done) tw.done(); return p < 1; });
        place(); frameFns.forEach(function (f) { f(); });
        var w = box.clientWidth, h = box.clientHeight;
        renderer.setViewport(0, 0, w, h); renderer.setScissorTest(false); renderer.clear();
        renderer.render(scene, camera);
        if (cube) {
          cube.cam.position.copy(camera.position).sub(st.target).normalize().multiplyScalar(6); cube.cam.quaternion.copy(camera.quaternion);
          renderer.clearDepth(); renderer.setScissorTest(true);
          renderer.setScissor(w - CUBE - 6, h - CUBE - 6, CUBE, CUBE); renderer.setViewport(w - CUBE - 6, h - CUBE - 6, CUBE, CUBE);
          renderer.render(cube.scene, cube.cam); renderer.setScissorTest(false);
        }
        if (tws.length) render();
        if (api.onChange) api.onChange(api);
      }
      function size() { var w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); render(); }
      var ro = root.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(box); size();
      function tween(dur, fn, done) { tws.push({ t0: performance.now(), dur: dur, fn: fn, done: done }); render(); }
      function view(name, dur) {
        var v = VIEWS[name] || name, t0 = st.theta, p0 = st.phi, t1 = v[0], p1 = v[1];
        var d = ((t1 - t0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; t1 = t0 + d;
        tween(dur == null ? 550 : dur, function (p) { st.theta = t0 + (t1 - t0) * p; st.phi = p0 + (p1 - p0) * p; });
      }
      /* the distance that fits a box in the view, looking from (theta, phi) */
      function fitDist(b, ang) {
        var th = ang ? ang[0] : st.theta, ph = ang ? ang[1] : st.phi, sp = Math.sin(ph);
        var z = new T.Vector3(sp * Math.cos(th), sp * Math.sin(th), Math.cos(ph)), x = new T.Vector3().crossVectors(camera.up, z).normalize(), y = new T.Vector3().crossVectors(z, x);
        var c = b.getCenter(new T.Vector3()), tv = Math.tan(camera.fov * Math.PI / 360), thz = tv * (camera.aspect || 1), d = 0;
        for (var i = 0; i < 8; i++) {
          var v = new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(c);
          d = Math.max(d, v.dot(z) + Math.abs(v.dot(x)) / thz, v.dot(z) + Math.abs(v.dot(y)) / tv);
        }
        return { c: c, d: d };
      }
      function fit(obj, opts) {
        var b = obj && obj.isBox3 ? obj : new T.Box3().setFromObject(obj || rootG); if (b.isEmpty()) return;
        var f = fitDist(b, opts && opts.ang), d = f.d * ((opts && opts.pad) || 1.12);
        var c0 = st.target.clone(), d0 = st.dist;
        if (opts && opts.now) { st.target.copy(f.c); st.dist = d; render(); return; }
        tween(500, function (p) { st.target.lerpVectors(c0, f.c, p); st.dist = d0 + (d - d0) * p; });
      }
      function home() { api.stats.home++; view('home'); if (homeFit) fit(homeFit, { ang: VIEWS.home, pad: homePad }); }
      // ---- pointer controls (Fusion: wheel = zoom, middle-drag = pan, Shift + middle-drag = orbit; here left-drag orbits too) ----
      var pointers = {}, drag = null, pinch = null;
      function inCube(e) { if (!cube) return false; var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return x > r.width - CUBE - 6 && y < CUBE + 6 && x < r.width - 6 && y > 6; }
      function cubePick(e) {
        var r = canvas.getBoundingClientRect(), x = e.clientX - r.left - (r.width - CUBE - 6), y = e.clientY - r.top - 6;
        var ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(x / CUBE * 2 - 1, -(y / CUBE * 2 - 1)), cube.cam);
        var hit = ray.intersectObject(cube.mesh)[0]; return hit ? cube.faces[hit.face.materialIndex] : null;
      }
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });
      canvas.addEventListener('pointerdown', function (e) {
        if (inCube(e)) { var f = cubePick(e); if (f) { api.stats.cube++; api.stats['cube_' + f] = 1; view(f); } return; }
        canvas.setPointerCapture(e.pointerId); pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pointers);
        if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; return; }
        var mode = e.button === 1 ? (e.shiftKey ? 'forbit' : 'pan') : e.button === 2 ? 'pan' : (e.shiftKey || e.ctrlKey || e.metaKey) ? 'pan' : 'orbit';
        drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, mode: mode, moved: false };
        if (e.button === 1) e.preventDefault();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (cube && !drag && !pinch) { var hv = inCube(e) ? cubePick(e) : null; if (hv !== cube.hover) { cube.highlight(hv); render(); } canvas.style.cursor = hv ? 'pointer' : ''; }
        if (!pointers[e.pointerId]) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (pinch) {
          var ids = Object.keys(pointers); if (ids.length < 2) return; var a = pointers[ids[0]], b = pointers[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          st.dist = Math.max(15, Math.min(3000, st.dist * pinch.d / Math.max(10, d))); panBy(mx - pinch.mx, my - pinch.my);
          pinch.d = d; pinch.mx = mx; pinch.my = my; api.stats.zoom++; api.stats.pan++; render(); return;
        }
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 4) drag.moved = true;
        if (drag.mode === 'pan') { panBy(dx, dy); api.stats.pan++; }
        else { st.theta -= dx * 0.0085; st.phi -= dy * 0.0085; api.stats.orbit++; if (drag.mode === 'forbit') api.stats.fusionOrbit++; }
        render();
      });
      function up(e) {
        if (!pointers[e.pointerId]) return;
        delete pointers[e.pointerId];
        if (drag && !drag.moved && drag.mode === 'orbit' && api.onPick) api.onPick(e);
        if (Object.keys(pointers).length < 2) pinch = null;
        if (!Object.keys(pointers).length) drag = null;
      }
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('pointerleave', function () { if (cube && cube.hover) { cube.highlight(null); render(); } });
      canvas.addEventListener('wheel', function (e) { e.preventDefault(); st.dist = Math.max(15, Math.min(3000, st.dist * Math.exp(e.deltaY * 0.0012))); api.stats.zoom++; render(); }, { passive: false });
      function panBy(dx, dy) {
        var h = box.clientHeight || 300, s = 2 * st.dist * Math.tan(camera.fov * Math.PI / 360) / h;
        var right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0), upv = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
        st.target.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
      }
      // home button (next to the ViewCube, like Fusion's)
      if (cube) { var hb = el('button', 'fx-home', '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10 L10 3.5 L17 10 M5.5 8 V16.5 H14.5 V8"/></svg>'); hb.type = 'button'; hb.title = 'Home view'; hb.setAttribute('aria-label', 'Home view'); hb.addEventListener('click', home); box.appendChild(hb); }
      if (o.help !== false) box.appendChild(el('div', 'fx-help', o.helpText || 'Drag to orbit · Right-drag or Shift-drag to pan · Scroll or pinch to zoom · Click the cube for a view'));
      // ---- api ----
      api.scene = scene; api.camera = camera; api.renderer = renderer; api.root = rootG; api.canvas = canvas; api.state = st;
      api.render = render; api.view = view; api.fit = fit; api.home = home; api.tween = tween;
      var homePad = 1.12; api.setHome = function (obj, pad) { homeFit = obj; if (pad) homePad = pad; };
      api.onFrame = function (fn) { frameFns.push(fn); };
      api.pick = function (e, objs) {
        var r = canvas.getBoundingClientRect(), ray = new T.Raycaster(); ray.params.Line = { threshold: 1.2 };
        ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)), camera);
        return ray.intersectObjects(objs || rootG.children, true);
      };
      api.clear = function () { while (rootG.children.length) { var c = rootG.children.pop(); disposeTree(c); } render(); };
      api.dispose = function () { if (dead) return; dead = true; if (ro) ro.disconnect(); api.clear(); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); };
      api.faceOn = function (normal) { var d = camera.position.clone().sub(st.target).normalize(); return d.dot(normal); };
      leave(api.dispose);
      place(); render();
    }
    return api;
  };
  function disposeTree(o) { o.traverse(function (c) { if (c.geometry) c.geometry.dispose(); if (c.material) [].concat(c.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }); }
  function grid(T, n) {
    var g = new T.Group(), minor = [], major = [];
    for (var v = -n; v <= n; v += 5) { var arr = v % 25 === 0 ? major : minor; if (v === 0) continue; arr.push(-n, v, 0, n, v, 0, v, -n, 0, v, n, 0); }
    function seg(arr, c, op) { var ge = new T.BufferGeometry(); ge.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return new T.LineSegments(ge, new T.LineBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false })); }
    g.add(seg(minor, 0x9aa3ad, 0.28)); g.add(seg(major, 0x8a939e, 0.5));
    g.add(seg([-n, 0, 0, n, 0, 0], 0xd9534f, 0.6)); g.add(seg([0, -n, 0, 0, n, 0], 0x4caf50, 0.6));
    g.renderOrder = -1; g.position.z = -0.02; return g;
  }
  function labelTex(T, text, bg, fg, size) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#9aa3ad'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 250);
    x.fillStyle = fg; x.font = '600 ' + (size || 52) + 'px "IBM Plex Sans", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 132);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  /* the ViewCube: a cube with face names, turned to match the main camera */
  function makeCube(T) {
    var names = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'], faces = ['right', 'left', 'top', 'bottom', 'front', 'back'];
    var mats = names.map(function (n) { return new T.MeshBasicMaterial({ map: labelTex(T, n, '#eef1f4', '#5b6673', n.length > 5 ? 44 : 50) }); });
    var geo = new T.BoxGeometry(2, 2, 2); geo.rotateX(Math.PI / 2);
    var mesh = new T.Mesh(geo, mats), scene = new T.Scene(); scene.add(mesh);
    mesh.add(new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0x7c8692 })));
    var cam = new T.OrthographicCamera(-1.85, 1.85, 1.85, -1.85, 0.1, 20); cam.up.set(0, 0, 1);
    var c = { scene: scene, cam: cam, mesh: mesh, faces: faces, hover: null };
    c.highlight = function (f) { c.hover = f; mats.forEach(function (m, i) { m.color.set(faces[i] === f ? 0x9fd0f5 : 0xffffff); }); };
    return c;
  }

  /* ============ keychain geometry ============ */
  /* o: { w, h, r: number | [bl, br, tr, tl], hole: { x, y, d } } (mm, centred on the origin) */
  F.tagShape = function (T, o) {
    var w = o.w / 2, h = o.h / 2, r = o.r || 0; if (typeof r === 'number') r = [r, r, r, r];
    r = r.map(function (v) { return Math.max(0, Math.min(v || 0, w - 0.01, h - 0.01)); });
    var s = new T.Shape();
    s.moveTo(-w + r[0], -h);
    s.lineTo(w - r[1], -h); if (r[1]) s.absarc(w - r[1], -h + r[1], r[1], -Math.PI / 2, 0, false);
    s.lineTo(w, h - r[2]); if (r[2]) s.absarc(w - r[2], h - r[2], r[2], 0, Math.PI / 2, false);
    s.lineTo(-w + r[3], h); if (r[3]) s.absarc(-w + r[3], h - r[3], r[3], Math.PI / 2, Math.PI, false);
    s.lineTo(-w, -h + r[0]); if (r[0]) s.absarc(-w + r[0], -h + r[0], r[0], Math.PI, 1.5 * Math.PI, false);
    if (o.hole) { var p = new T.Path(); p.absarc(o.hole.x, o.hole.y, o.hole.d / 2, 0, Math.PI * 2, true); s.holes.push(p); }
    return s;
  };
  F.MAT = {
    body: function (T) { return new T.MeshStandardMaterial({ color: 0xaeb3b8, metalness: 0.22, roughness: 0.55 }); },
    preview: function (T) { return new T.MeshStandardMaterial({ color: 0x6aa0e6, metalness: 0, roughness: 0.6, transparent: true, opacity: 0.6, depthWrite: false }); },
    edge: function (T) { return new T.LineBasicMaterial({ color: 0x2b2e33 }); }
  };
  function solid(T, geo, mat) { var g = new T.Group(), m = new T.Mesh(geo, mat || F.MAT.body(T)); g.add(m); g.add(new T.LineSegments(new T.EdgesGeometry(geo, 28), F.MAT.edge(T))); g.userData.mesh = m; return g; }
  F.solid = solid;
  function extrude(T, shapes, depth, z) { var g = new T.ExtrudeGeometry(shapes, { depth: Math.abs(depth), bevelEnabled: false, curveSegments: 28 }); g.translate(0, 0, depth < 0 ? (z || 0) + depth : (z || 0)); return g; }
  F.extrude = extrude;
  /* name text as shapes, centred at (cx, cy), cap height ≈ size; shrunk to fit maxW */
  F.textShapes = function (T, font, text, size, cx, cy, maxW) {
    var sh = font.generateShapes(text || ' ', size), geo = new T.ShapeGeometry(sh); geo.computeBoundingBox();
    var b = geo.boundingBox; geo.dispose();
    var w = b.max.x - b.min.x, k = maxW && w > maxW ? maxW / w : 1, dx = cx - (b.min.x + w / 2) * k, dy = cy - (b.min.y + (b.max.y - b.min.y) / 2) * k;
    function mv(pts) { return pts.map(function (p) { return new T.Vector2(p.x * k + dx, p.y * k + dy); }); }
    var out = sh.map(function (s) { var n = new T.Shape(mv(s.getPoints(8))); s.holes.forEach(function (hh) { n.holes.push(new T.Path(mv(hh.getPoints(8)))); }); return n; });
    out.width = w * k; out.height = (b.max.y - b.min.y) * k; out.fits = k === 1; return out;
  };
  /* the whole keychain: { r (fillet), t (thickness), text, size, style: 'raised' | 'engraved', depth } → THREE.Group */
  F.keychain = function (T, font, o) {
    var P = { w: 50, h: 20, r: o.r == null ? 4 : o.r, hole: { x: -19, y: 0, d: 5 } }, t = o.t || 4, d = o.depth || 1, g = new T.Group();
    var letters = o.text && font ? F.textShapes(T, font, o.text, o.size || 9, 4.75, 0, 37) : null;
    if (!letters || o.style !== 'engraved') {
      g.add(solid(T, extrude(T, F.tagShape(T, P), t)));
      if (letters) g.add(solid(T, extrude(T, letters, d, t)));
    } else {
      // two layers (no boolean cut here); leave out the outline where they meet so it reads as one piece
      var zs = t - d, rr = Math.min(P.r, 9.99);
      function seam(x, y) {
        if (Math.abs(Math.hypot(x - P.hole.x, y - P.hole.y) - P.hole.d / 2) < 0.08) return true;
        if (Math.abs(x) > 24.95 || Math.abs(y) > 9.95) return true;
        var cx = 25 - rr, cy = 10 - rr; return rr > 0 && Math.abs(x) >= cx - 0.01 && Math.abs(y) >= cy - 0.01 && Math.abs(Math.hypot(Math.abs(x) - cx, Math.abs(y) - cy) - rr) < 0.08;
      }
      function layer(geo, zz) {
        var gg = new T.Group(); gg.add(new T.Mesh(geo, F.MAT.body(T)));
        var e = new T.EdgesGeometry(geo, 28), a = e.attributes.position.array, keep = [];
        for (var i = 0; i < a.length; i += 6) { var onSeam = Math.abs(a[i + 2] - zz) < 0.01 && Math.abs(a[i + 5] - zz) < 0.01 && seam(a[i], a[i + 1]) && seam(a[i + 3], a[i + 4]); if (!onSeam) for (var j = 0; j < 6; j++) keep.push(a[i + j]); }
        e.dispose(); var ke = new T.BufferGeometry(); ke.setAttribute('position', new T.Float32BufferAttribute(keep, 3)); gg.add(new T.LineSegments(ke, F.MAT.edge(T))); return gg;
      }
      g.add(layer(extrude(T, F.tagShape(T, P), zs + 0.03), zs + 0.03));
      var topS = F.tagShape(T, P), islands = [];
      letters.forEach(function (s) { topS.holes.push(new T.Path(s.getPoints())); s.holes.forEach(function (hh) { islands.push(new T.Shape(hh.getPoints())); }); });
      g.add(layer(extrude(T, [topS].concat(islands), d, zs), zs));
    }
    g.userData.letters = letters;
    return g;
  };

  /* ============ navigation trainer ============ */
  F.navTrainer = function (container, ctx, key) {
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Find the hidden word</h3><span class="label fx-count"></span></div>';
    container.appendChild(box);
    var v = F.viewer(box, { height: 400, gridSize: 75 });
    var info2 = el('div', 'fx-labinfo'); box.appendChild(info2);
    var saved = ctx.check(key) || {}, found = saved.found || {}, used = { pan: !!saved.pan, zoom: !!saved.zoom, cube: !!saved.cube };
    var FACES = [['top', 'F', [0, 0, 1]], ['front', 'U', [0, -1, 0]], ['right', 'S', [1, 0, 0]], ['back', 'I', [0, 1, 0]], ['left', 'O', [-1, 0, 0]], ['bottom', 'N', [0, 0, -1]]];
    function draw() {
      var n = Object.keys(found).length;
      box.querySelector('.fx-count').textContent = n + ' / 6 faces';
      info2.innerHTML = '<div class="fx-word">' + FACES.map(function (f) { return '<span class="' + (found[f[0]] ? 'on' : '') + '">' + (found[f[0]] ? f[1] : '?') + '</span>'; }).join('') + '</div>' +
        '<div class="fx-chips"><span class="' + (n ? 'on' : '') + '">Orbit</span><span class="' + (used.pan ? 'on' : '') + '">Pan</span><span class="' + (used.zoom ? 'on' : '') + '">Zoom</span><span class="' + (used.cube ? 'on' : '') + '">ViewCube</span></div>' +
        (n === 6 && used.pan && used.zoom ? '<p class="fx-ok"><b class="pass">PASS</b> · You found <b>FUSION</b> and used every way of moving around. Those same moves work in Fusion.</p>'
          : '<p class="small muted">Look straight at each face of the cube to reveal its letter. One is underneath — orbit below the grid to see it. Then pan (move sideways) and zoom at least once.</p>');
    }
    draw();
    v.ready.then(function () {
      var T = v.T, mats = FACES.map(function (f) { return new T.MeshStandardMaterial({ map: letterTex(T, f[1]), roughness: 0.7 }); });
      // BoxGeometry material order: +x, -x, +y, -y, +z, -z (after rotateX: +x right, -x left, +y top→+z, -y bottom, +z front→-y, -z back→+y)
      var order = ['right', 'left', 'top', 'bottom', 'front', 'back'].map(function (n) { return mats[FACES.findIndex(function (f) { return f[0] === n; })]; });
      var geo = new T.BoxGeometry(30, 30, 30); geo.rotateX(Math.PI / 2); geo.translate(0, 0, 15);
      var m = new T.Mesh(geo, order); v.root.add(m); v.root.add(new T.LineSegments(new T.EdgesGeometry(geo), F.MAT.edge(T)));
      v.setHome(m, 1.5); v.fit(m, { now: true, pad: 1.5 });
      var normals = FACES.map(function (f) { return new T.Vector3(f[2][0], f[2][1], f[2][2]); }), last = 0;
      v.onChange = function () {
        var ch = false;
        FACES.forEach(function (f, i) { if (!found[f[0]] && v.faceOn(normals[i]) > 0.93) { found[f[0]] = 1; ch = true; } });
        if (!used.pan && v.stats.pan > 8) { used.pan = true; ch = true; }
        if (!used.zoom && v.stats.zoom > 2) { used.zoom = true; ch = true; }
        if (!used.cube && v.stats.cube) { used.cube = true; ch = true; }
        if (ch) { draw(); var now = Date.now(); if (now - last > 400) { last = now; ctx.check(key, { found: found, pan: used.pan, zoom: used.zoom, cube: used.cube, ok: Object.keys(found).length === 6 && used.pan && used.zoom }); } }
      };
    });
    return box;
  };
  function letterTex(T, L) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    x.fillStyle = '#d7dce2'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#ff6a13'; x.font = '700 170px "IBM Plex Sans", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(L, 128, 140);
    return new T.CanvasTexture(c);
  }

  /* ============ sketch lab: make it black ============ */
  var BLUE = '#1f6fd1', BLACK = '#121417', GRIDC = '#dfe3e8';
  F.sketchLab = function (container, ctx, key) {
    var box = el('div', 'xp fx-lab fx-sk');
    box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Make it black: fully define the sketch</h3><span class="label fx-count"></span></div>';
    var bar = el('div', 'fx-bar'), stage = el('div', 'fx-skstage'), status = el('div', 'fx-labinfo');
    var selB = el('button', 'btn btn-small btn-ghost on', 'Select / drag'), dimB = el('button', 'btn btn-small btn-ghost', '<span class="fx-dimic">⟷</span> Sketch Dimension <kbd>D</kbd>'), resB = el('button', 'btn btn-small btn-ghost', 'Start over');
    [selB, dimB, resB].forEach(function (b) { b.type = 'button'; bar.appendChild(b); });
    box.appendChild(bar); box.appendChild(stage); box.appendChild(status); container.appendChild(box);
    var SC = 7, VB = [-300, -135, 600, 270];
    var svg = S('svg', { viewBox: VB.join(' '), 'data-art': 'keep', tabindex: 0, 'aria-label': 'Sketch: a rectangle with a circle. Drag shapes or add dimensions.' }, null);
    stage.appendChild(svg);
    var inputBox = el('div', 'fx-dimin'); inputBox.innerHTML = '<input type="text" inputmode="decimal" aria-label="Dimension value"><span>mm</span>'; stage.appendChild(inputBox);
    var inp = inputBox.querySelector('input');
    var START = { W: 38, H: 26, cx: -9, cy: 5, d: 8 }, PLAN = { W: 50, H: 20, d: 5, cx: -19, cy: 0 };
    var g, dims, tool = 'select', pick1 = null, editing = null, saved = ctx.check(key) || {};
    function reset() { g = Object.assign({}, START); dims = {}; pick1 = null; editing = null; hideInput(); }
    reset();
    if (saved.dims) { dims = saved.dims; solve(); }
    function solve() {
      if (dims.W != null) g.W = dims.W; if (dims.H != null) g.H = dims.H; if (dims.d != null) g.d = dims.d;
      if (dims.hx) g.cx = dims.hx.edge === 'left' ? -g.W / 2 + dims.hx.v : g.W / 2 - dims.hx.v;
      if (dims.vy) g.cy = dims.vy.edge === 'bottom' ? -g.H / 2 + dims.vy.v : g.H / 2 - dims.vy.v;
    }
    function free() { var f = []; if (dims.W == null) f.push('width'); if (dims.H == null) f.push('height'); if (dims.d == null) f.push('hole size'); if (!dims.hx) f.push('hole left/right'); if (!dims.vy) f.push('hole up/down'); return f; }
    function X(mm) { return mm * SC; } function Y(mm) { return -mm * SC; }
    function line(x1, y1, x2, y2, a, p) { return S('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, a), p || svg); }
    function txt(x, y, s, a, p) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'Arial, sans-serif', 'font-size': 13, fill: BLACK, 'text-anchor': 'middle' }, a), p || svg); t.textContent = s; return t; }
    function arrowDim(x1, y1, x2, y2, label, id, vert) {
      var gg = S('g', { 'class': 'fx-dim', 'data-dim': id }, svg);
      line(x1, y1, x2, y2, { stroke: BLACK, 'stroke-width': 1 }, gg);
      [[x1, y1, 1], [x2, y2, -1]].forEach(function (p) { var a = vert ? 'M' + p[0] + ' ' + p[1] + ' l-3.5 ' + (7 * p[2]) + ' l7 0 z' : 'M' + p[0] + ' ' + p[1] + ' l' + (7 * p[2]) + ' -3.5 l0 7 z'; S('path', { d: a, fill: BLACK }, gg); });
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, t = vert ? txt(mx - 8, my + 4, label, { 'text-anchor': 'end' }, gg) : txt(mx, my - 5, label, {}, gg);
      S('rect', { x: (vert ? mx - 56 : mx - 26), y: (vert ? my - 10 : my - 19), width: 52, height: 20, fill: 'transparent', 'class': 'fx-dimhit' }, gg);
      gg.addEventListener('dblclick', function () { edit(id); }); gg.addEventListener('click', function () { if (tool === 'dim') edit(id); });
      return gg;
    }
    function fmt(v) { return (Math.round(v * 100) / 100).toFixed(2); }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      S('rect', { x: VB[0], y: VB[1], width: VB[2], height: VB[3], fill: '#fbfcfd' }, svg);
      for (var gx = -40; gx <= 40; gx += 5) line(X(gx), VB[1], X(gx), VB[1] + VB[3], { stroke: GRIDC, 'stroke-width': gx % 25 ? 0.6 : 1.1 });
      for (var gy = -20; gy <= 20; gy += 5) line(VB[0], Y(gy), VB[0] + VB[2], Y(gy), { stroke: GRIDC, 'stroke-width': gy % 25 ? 0.6 : 1.1 });
      line(VB[0], 0, VB[0] + VB[2], 0, { stroke: '#e8a0a0', 'stroke-width': 0.8 }); line(0, VB[1], 0, VB[1] + VB[3], { stroke: '#9bd09b', 'stroke-width': 0.8 });
      var rc = dims.W != null && dims.H != null ? BLACK : BLUE, cc = dims.d != null && dims.hx && dims.vy ? BLACK : BLUE;
      var L = X(-g.W / 2), R = X(g.W / 2), Tp = Y(g.H / 2), B = Y(-g.H / 2);
      S('rect', { x: L, y: Tp, width: R - L, height: B - Tp, fill: 'rgba(80,150,230,.10)' }, svg);
      line(L, Tp, R, B, { stroke: '#9aa3ad', 'stroke-dasharray': '5 4', 'stroke-width': 0.8 }); line(L, B, R, Tp, { stroke: '#9aa3ad', 'stroke-dasharray': '5 4', 'stroke-width': 0.8 });
      [['top', L, Tp, R, Tp], ['bottom', L, B, R, B], ['left', L, Tp, L, B], ['right', R, Tp, R, B]].forEach(function (e) {
        line(e[1], e[2], e[3], e[4], { stroke: pick1 && pick1.edge === e[0] ? MARK : rc, 'stroke-width': 2 });
        var h = line(e[1], e[2], e[3], e[4], { stroke: 'transparent', 'stroke-width': 14, 'class': 'fx-hit', 'data-edge': e[0] });
        h.addEventListener('pointerdown', function (ev) { down(ev, { edge: e[0] }); });
      });
      S('circle', { cx: 0, cy: 0, r: 3, fill: BLACK }, svg);
      // circle
      var cx = X(g.cx), cy = Y(g.cy), r = X(g.d / 2);
      S('circle', { cx: cx, cy: cy, r: r, fill: 'rgba(255,255,255,.7)', stroke: cc, 'stroke-width': 2 }, svg);
      var ch = S('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: 'transparent', 'stroke-width': 12, 'class': 'fx-hit' }, svg);
      ch.addEventListener('pointerdown', function (ev) { down(ev, { circle: 1 }); });
      var cp = S('circle', { cx: cx, cy: cy, r: 3.5, fill: pick1 && pick1.centre ? MARK : cc }, svg);
      var cph = S('circle', { cx: cx, cy: cy, r: 9, fill: 'transparent', 'class': 'fx-hit fx-pt' }, svg); cph.addEventListener('pointerdown', function (ev) { down(ev, { centre: 1 }); });
      // corner handles
      [[R, Tp], [L, Tp], [R, B], [L, B]].forEach(function (p) {
        S('rect', { x: p[0] - 3, y: p[1] - 3, width: 6, height: 6, fill: rc }, svg);
        var hh = S('circle', { cx: p[0], cy: p[1], r: 9, fill: 'transparent', 'class': 'fx-hit fx-pt' }, svg); hh.addEventListener('pointerdown', function (ev) { down(ev, { corner: 1 }); });
      });
      // dimensions
      if (dims.W != null) arrowDim(L, B + 46, R, B + 46, fmt(g.W), 'W');
      if (dims.W != null) { line(L, B + 4, L, B + 52, { stroke: BLACK, 'stroke-width': 0.6 }); line(R, B + 4, R, B + 52, { stroke: BLACK, 'stroke-width': 0.6 }); }
      if (dims.H != null) { arrowDim(L - 50, Tp, L - 50, B, fmt(g.H), 'H', true); line(L - 56, Tp, L - 4, Tp, { stroke: BLACK, 'stroke-width': 0.6 }); line(L - 56, B, L - 4, B, { stroke: BLACK, 'stroke-width': 0.6 }); }
      if (dims.d != null) { var a = -Math.PI * 0.75, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r; var gd = S('g', { 'class': 'fx-dim' }, svg); line(ex, ey, ex - 22, ey - 22, { stroke: BLACK, 'stroke-width': 1 }, gd); line(ex - 22, ey - 22, ex - 60, ey - 22, { stroke: BLACK, 'stroke-width': 1 }, gd); S('path', { d: 'M' + ex + ' ' + ey + ' l-7 -2 l5 -5 z', fill: BLACK }, gd); txt(ex - 41, ey - 27, 'Ø' + fmt(g.d), {}, gd); S('rect', { x: ex - 66, y: ey - 42, width: 52, height: 22, fill: 'transparent', 'class': 'fx-dimhit' }, gd); gd.addEventListener('dblclick', function () { edit('d'); }); gd.addEventListener('click', function () { if (tool === 'dim') edit('d'); }); }
      if (dims.hx) { var ex2 = dims.hx.edge === 'left' ? L : R; arrowDim(Math.min(ex2, cx), B + 20, Math.max(ex2, cx), B + 20, fmt(dims.hx.v), 'hx'); line(cx, cy, cx, B + 26, { stroke: BLACK, 'stroke-width': 0.6 }); line(ex2, B + 4, ex2, B + 26, { stroke: BLACK, 'stroke-width': 0.6 }); }
      if (dims.vy) { var ey2 = dims.vy.edge === 'bottom' ? B : Tp; arrowDim(L - 20, Math.min(ey2, cy), L - 20, Math.max(ey2, cy), fmt(dims.vy.v), 'vy', true); line(cx, cy, L - 26, cy, { stroke: BLACK, 'stroke-width': 0.6, 'stroke-dasharray': '3 3' }); }
      var f = free();
      box.querySelector('.fx-count').textContent = (5 - f.length) + ' / 5 defined';
      var ok = !f.length, plan = ok && Math.abs(g.W - PLAN.W) < 0.01 && Math.abs(g.H - PLAN.H) < 0.01 && Math.abs(g.d - PLAN.d) < 0.01 && Math.abs(g.cx - PLAN.cx) < 0.01 && Math.abs(g.cy - PLAN.cy) < 0.01;
      status.innerHTML = ok ? '<p class="fx-ok"><b class="pass">FULLY DEFINED</b> · Everything turned black: nothing can move by accident now. ' + (plan ? 'And your numbers match the keychain plan exactly.' : 'Your numbers don’t match the plan yet (50 × 20 tag, Ø5 hole, 6 mm from the left edge, 10 mm from the bottom edge). Double-click a dimension to change it.') + '</p>'
        : '<p><b>Still free:</b> ' + f.join(' · ') + '</p><p class="small muted">' + (tool === 'dim' ? (pick1 && pick1.centre ? 'Now click an <b>edge</b> of the rectangle: the left or right edge for a left/right distance, the top or bottom edge for an up/down distance. (Esc cancels.)' : 'Click an edge for its length, the circle’s outline for its diameter, or the circle’s <b>centre point</b> and then an edge for a distance.') : 'Drag the corners, the circle or its centre to see what can still move. Then choose Sketch Dimension.') + '</p>';
      return { ok: ok, plan: plan };
    }
    function save() { var r = draw(); ctx.check(key, { dims: dims, ok: r.ok, plan: r.plan }); }
    function setTool(t) { tool = t; pick1 = null; selB.classList.toggle('on', t === 'select'); dimB.classList.toggle('on', t === 'dim'); svg.classList.toggle('dimming', t === 'dim'); draw(); }
    selB.addEventListener('click', function () { setTool('select'); }); dimB.addEventListener('click', function () { setTool('dim'); });
    resB.addEventListener('click', function () { reset(); setTool('select'); save(); });
    svg.addEventListener('keydown', function (e) { if (e.key === 'd' || e.key === 'D') { setTool('dim'); e.preventDefault(); } if (e.key === 'Escape') { if (editing) hideInput(); else setTool('select'); } });
    function toMM(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x / SC, y: -q.y / SC }; }
    function nudge(msg) { status.insertAdjacentHTML('afterbegin', '<p class="fx-warn">' + msg + '</p>'); }
    function down(ev, what) {
      ev.preventDefault(); ev.stopPropagation(); svg.focus({ preventScroll: true });
      if (tool === 'dim') { dimPick(what); return; }
      var target = ev.target; target.setPointerCapture && target.setPointerCapture(ev.pointerId);
      var locked = what.corner ? (dims.W != null && dims.H != null) : what.centre ? (dims.hx && dims.vy) : what.circle ? dims.d != null : (what.edge === 'top' || what.edge === 'bottom') ? dims.H != null : dims.W != null;
      if (locked) { draw(); nudge('That can’t move: a dimension is holding it in place.'); return; }
      function mv(e) {
        var p = toMM(e);
        if (what.corner) { if (dims.W == null) g.W = clamp(Math.abs(p.x) * 2, 10, 80); if (dims.H == null) g.H = clamp(Math.abs(p.y) * 2, 8, 34); }
        else if (what.edge) { if (what.edge === 'top' || what.edge === 'bottom') g.H = clamp(Math.abs(p.y) * 2, 8, 34); else g.W = clamp(Math.abs(p.x) * 2, 10, 80); }
        else if (what.centre) { if (!dims.hx) g.cx = clamp(p.x, -40, 40); if (!dims.vy) g.cy = clamp(p.y, -17, 17); }
        else if (what.circle) g.d = clamp(Math.hypot(p.x - g.cx, p.y - g.cy) * 2, 1, 16);
        solve(); draw();
      }
      function upf() { target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', upf); svg.removeEventListener('pointermove', mv); root.removeEventListener('pointerup', upf); }
      target.addEventListener('pointermove', mv); target.addEventListener('pointerup', upf); svg.addEventListener('pointermove', mv); root.addEventListener('pointerup', upf);
    }
    function dimPick(w) {
      if (pick1 && pick1.centre) {
        if (w.edge === 'left' || w.edge === 'right') { pick1 = null; dims.hx = { edge: w.edge, v: Math.abs(g.cx - (w.edge === 'left' ? -g.W / 2 : g.W / 2)) }; draw(); edit('hx'); return; }
        if (w.edge === 'top' || w.edge === 'bottom') { pick1 = null; dims.vy = { edge: w.edge, v: Math.abs(g.cy - (w.edge === 'bottom' ? -g.H / 2 : g.H / 2)) }; draw(); edit('vy'); return; }
        pick1 = null; draw(); return;
      }
      if (w.centre) { pick1 = { centre: 1 }; draw(); return; }
      if (w.circle) { if (dims.d == null) dims.d = g.d; draw(); edit('d'); return; }
      if (w.edge === 'top' || w.edge === 'bottom') { if (dims.W == null) dims.W = g.W; draw(); edit('W'); return; }
      if (w.edge === 'left' || w.edge === 'right') { if (dims.H == null) dims.H = g.H; draw(); edit('H'); return; }
    }
    function edit(id) {
      editing = id;
      var val = id === 'hx' ? dims.hx.v : id === 'vy' ? dims.vy.v : dims[id];
      var pos = { W: [0, -g.H / 2 - 6.6], H: [-g.W / 2 - 7, 0], d: [g.cx - 6, g.cy + g.d / 2 + 3.5], hx: [g.cx - 4, -g.H / 2 - 2.9], vy: [-g.W / 2 - 3, g.cy] }[id];
      var px = (X(pos[0]) - VB[0]) / VB[2] * 100, py = (Y(pos[1]) - VB[1]) / VB[3] * 100;
      inputBox.style.left = Math.max(8, Math.min(82, px)) + '%'; inputBox.style.top = Math.max(6, Math.min(88, py)) + '%';
      inputBox.classList.add('on'); inp.value = fmt(val); setTimeout(function () { inp.focus(); inp.select(); }, 30);
      save();
    }
    function hideInput() { editing = null; inputBox.classList.remove('on'); }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideInput(); svg.focus(); return; }
      if (e.key !== 'Enter' && e.key !== 'Tab') return;
      e.preventDefault();
      var v = parseFloat(String(inp.value).replace(/[^\d.]/g, ''));
      if (!(v > 0)) { inp.select(); return; }
      var id = editing;
      if (id === 'W') dims.W = clamp(v, 10, 80); else if (id === 'H') dims.H = clamp(v, 8, 34); else if (id === 'd') dims.d = clamp(v, 1, 16);
      else if (id === 'hx') dims.hx.v = clamp(v, 0, 80); else if (id === 'vy') dims.vy.v = clamp(v, 0, 34);
      var from = Object.assign({}, g); solve(); var to = Object.assign({}, g); hideInput();
      var t0 = performance.now(); (function an(now) { var p = Math.min(1, (now - t0) / 350), e2 = ease(p); Object.keys(to).forEach(function (k2) { g[k2] = from[k2] + (to[k2] - from[k2]) * e2; }); draw(); if (p < 1) requestAnimationFrame(an); else { g = to; save(); svg.focus({ preventScroll: true }); } })(t0);
    });
    inp.addEventListener('blur', function () { setTimeout(function () { if (editing && document.activeElement !== inp) hideInput(); }, 150); });
    draw();
    return box;
  };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ============ extrude lab ============ */
  F.extrudeLab = function (container, ctx, key) {
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Extrude: pick a profile, pull it up</h3></div>';
    container.appendChild(box);
    var v = F.viewer(box, { height: 360, gridSize: 75, helpText: 'Click a shaded area to select it · Drag to orbit · Scroll to zoom' });
    var panel = el('div', 'fx-panel');
    panel.innerHTML = '<div class="fx-ph">EXTRUDE</div><label><span>Profiles</span><b class="fx-prof">Select</b></label>' +
      '<label><span>Distance</span><input type="range" min="-8" max="15" step="0.5" value="0"><input type="number" step="0.5" value="0" class="fx-num"> mm</label>' +
      '<label><span>Operation</span><b>New Body</b></label><div class="fx-pb"><button type="button" class="btn btn-small btn-primary" disabled>OK</button></div>';
    box.appendChild(panel);
    var info2 = el('div', 'fx-labinfo', '<p class="small muted">Click the big shaded area of the tag (not the circle) to select it, then drag the distance to 4 mm and press OK.</p>'); box.appendChild(info2);
    var range = panel.querySelector('input[type=range]'), num = panel.querySelector('.fx-num'), ok = panel.querySelector('button'), prof = panel.querySelector('.fx-prof');
    var sel = { tag: false, hole: false }, dist = 0, done = (ctx.check(key) || {}).ok;
    v.ready.then(function () {
      var T = v.T, P = { w: 50, h: 20, hole: { x: -19, y: 0, d: 5 } };
      var selC = 0x3d8bd9, baseC = 0xcfe3f7;
      var tagM = new T.Mesh(new T.ShapeGeometry(F.tagShape(T, P), 24), new T.MeshBasicMaterial({ color: baseC, transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false }));
      var hs = new T.Shape(); hs.absarc(-19, 0, 2.5, 0, Math.PI * 2, false);
      var holeM = new T.Mesh(new T.ShapeGeometry(hs, 24), new T.MeshBasicMaterial({ color: baseC, transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false }));
      tagM.position.z = holeM.position.z = 0.03;
      var outline = new T.Group();
      [F.tagShape(T, { w: 50, h: 20 }), hs].forEach(function (s) { var pts = s.getPoints(48).map(function (p) { return new T.Vector3(p.x, p.y, 0.05); }); pts.push(pts[0]); outline.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x1d4f91 }))); });
      v.root.add(tagM, holeM, outline);
      var body = null;
      function rebuild() {
        if (body) { v.root.remove(body); disposeTree(body); body = null; }
        tagM.material.color.set(sel.tag ? selC : baseC); holeM.material.color.set(sel.hole ? selC : baseC);
        prof.textContent = (sel.tag + sel.hole) ? (sel.tag + sel.hole) + ' selected' : 'Select';
        ok.disabled = !(sel.tag || sel.hole) || !dist;
        if ((sel.tag || sel.hole) && dist) {
          var shapes = sel.tag && sel.hole ? [F.tagShape(T, { w: 50, h: 20 })] : sel.tag ? [F.tagShape(T, P)] : [hs];
          body = solid(T, extrude(T, shapes, dist), done && sel.tag && !sel.hole && dist === 4 ? F.MAT.body(T) : F.MAT.preview(T));
          v.root.add(body);
        }
        v.render(); say();
      }
      function say(final) {
        var msg;
        if (!sel.tag && !sel.hole) msg = 'Nothing is selected yet. In Fusion the Extrude panel says <b>Profiles: Select</b> until you click a profile.';
        else if (sel.hole && !sel.tag) msg = 'You selected only the <b>circle</b>. Extruding it makes a little peg, not a keychain. Click the circle again to unselect it and pick the big area instead.';
        else if (sel.hole && sel.tag) msg = 'Both profiles are selected, so the hole fills in: no way to attach a key ring. Click the circle to unselect it.';
        else if (!dist) msg = 'Good: one profile, with a hole. Now drag the distance (or type a number).';
        else if (dist < 0) msg = 'A negative distance extrudes <i>downward</i>, under the sketch. That works too, but the plan says up: 4 mm.';
        else if (dist !== 4) msg = dist + ' mm. ' + (dist < 3 ? 'Thin keychains snap easily.' : 'That’s thick and uses lots of plastic.') + ' The plan says <b>4 mm</b>.';
        else msg = done ? '<b class="pass">PASS</b> · A 4 mm body with a hole through it. That’s exactly what you’ll make in Fusion.' : '4 mm, one profile: press <b>OK</b>.';
        info2.innerHTML = '<p>' + msg + '</p>';
      }
      v.onPick = function (e) {
        var hit = v.pick(e, [holeM, tagM])[0]; if (!hit) return;
        if (hit.object === holeM) sel.hole = !sel.hole; else sel.tag = !sel.tag;
        if (done) done = false; rebuild();
      };
      function setD(x) { dist = Math.round(clamp(parseFloat(x) || 0, -8, 15) * 2) / 2; range.value = dist; num.value = dist; if (done) done = false; rebuild(); }
      range.addEventListener('input', function () { setD(range.value); }); num.addEventListener('change', function () { setD(num.value); });
      ok.addEventListener('click', function () {
        var good = sel.tag && !sel.hole && dist === 4; done = good;
        ctx.check(key, { ok: good, dist: dist, tag: sel.tag, hole: sel.hole });
        if (good) rebuild(); else { say(); info2.insertAdjacentHTML('afterbegin', '<p class="fx-warn">Fusion would make that, but it isn’t the keychain plan. Check the message below.</p>'); }
      });
      var hb = new T.Box3(new T.Vector3(-26, -11, 0), new T.Vector3(26, 11, 6)); v.setHome(hb, 1.15); v.fit(hb, { now: true, pad: 1.15 });
      if (done) { sel.tag = true; dist = 4; range.value = 4; num.value = 4; } rebuild();
    });
    return box;
  };

  /* ============ fillet lab ============ */
  F.filletLab = function (container, ctx, key) {
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Fillet: round the corners</h3></div>';
    container.appendChild(box);
    var v = F.viewer(box, { height: 360, gridSize: 75, helpText: 'Click the 4 short corner edges · Drag to orbit to reach the back ones · Scroll to zoom' });
    var panel = el('div', 'fx-panel');
    panel.innerHTML = '<div class="fx-ph">FILLET</div><label><span>Edges</span><b class="fx-prof">0 Edges</b></label>' +
      '<label><span>Radius</span><input type="range" min="0" max="12" step="0.5" value="0"><input type="number" step="0.5" value="0" class="fx-num"> mm</label>' +
      '<div class="fx-pb"><button type="button" class="btn btn-small btn-primary" disabled>OK</button></div>';
    box.appendChild(panel);
    var info2 = el('div', 'fx-labinfo'); box.appendChild(info2);
    var range = panel.querySelector('input[type=range]'), num = panel.querySelector('.fx-num'), ok = panel.querySelector('button'), cnt = panel.querySelector('.fx-prof');
    var picked = [false, false, false, false], rad = 0, done = (ctx.check(key) || {}).ok;
    var CORN = [[-25, -10], [25, -10], [25, 10], [-25, 10]];
    v.ready.then(function () {
      var T = v.T, body = null, edges = [];
      CORN.forEach(function (c, i) {
        var hl = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 4, 10), new T.MeshBasicMaterial({ color: 0x3d8bd9, transparent: true, opacity: 0 }));
        hl.rotation.x = Math.PI / 2; hl.position.set(c[0], c[1], 2); hl.userData.i = i;
        var hit = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 4.4, 8), new T.MeshBasicMaterial({ visible: false })); hit.rotation.x = Math.PI / 2; hit.position.copy(hl.position); hit.userData.i = i;
        v.root.add(hl, hit); edges.push({ hl: hl, hit: hit });
      });
      function rebuild() {
        var n = picked.filter(Boolean).length, tooBig = rad > 10;
        if (body) { v.root.remove(body); disposeTree(body); }
        var r = tooBig ? 0 : rad, rs = [0, 1, 2, 3].map(function (i) { return picked[i] ? r : 0; });
        body = solid(T, extrude(T, F.tagShape(T, { w: 50, h: 20, r: rs, hole: { x: -19, y: 0, d: 5 } }), 4)); v.root.add(body);
        edges.forEach(function (e, i) {
          e.hl.material.opacity = picked[i] ? 0.95 : 0;
          var c = CORN[i], sx = Math.sign(c[0]), sy = Math.sign(c[1]), rr = picked[i] ? r : 0;
          e.hl.position.set(c[0] - sx * rr * 0.29, c[1] - sy * rr * 0.29, 2); e.hit.position.copy(e.hl.position);
        });
        cnt.textContent = n + ' Edge' + (n === 1 ? '' : 's'); ok.disabled = !n || !rad || tooBig;
        var msg;
        if (tooBig) msg = '<span class="fx-warn">Fusion stops you here: the tag is only 20 mm tall, so the biggest corner it can round is 10 mm (half the height). Bring the radius back down.</span>';
        else if (!n) msg = 'Click a short vertical edge at a corner of the tag. It turns blue when it’s selected. Orbit around to reach the corners at the back.';
        else if (n < 4) msg = n + ' of 4 corners selected. ' + (rad ? 'See how only the selected corners get rounded?' : 'Find the rest — orbit to see the back of the tag.');
        else if (!rad) msg = 'All 4 corners selected. Now drag the radius (or type a number).';
        else if (rad < 3) msg = rad + ' mm: rounded, but corners this sharp can poke through a pocket. The plan says 4 mm.';
        else if (rad > 6) msg = rad + ' mm: very round. It works, but there’s less room for your name. The plan says 4 mm.';
        else msg = done ? '<b class="pass">PASS</b> · Four smooth corners. A fillet makes parts nicer to hold and stronger at the corners.' : rad + ' mm on all 4 corners: press <b>OK</b>.';
        info2.innerHTML = '<p>' + msg + '</p>';
        v.render();
      }
      v.onPick = function (e) { var hit = v.pick(e, edges.map(function (x) { return x.hit; }))[0]; if (!hit) return; picked[hit.object.userData.i] = !picked[hit.object.userData.i]; done = false; rebuild(); };
      function setR(x) { rad = Math.round(clamp(parseFloat(x) || 0, 0, 12) * 2) / 2; range.value = rad; num.value = rad; done = false; rebuild(); }
      range.addEventListener('input', function () { setR(range.value); }); num.addEventListener('change', function () { setR(num.value); });
      ok.addEventListener('click', function () { var good = picked.every(Boolean) && rad >= 3 && rad <= 6; ctx.check(key, { ok: good, r: rad, edges: picked.filter(Boolean).length }); done = good; rebuild(); if (!good) info2.insertAdjacentHTML('afterbegin', '<p class="fx-warn">Not quite the plan yet: round all 4 corners, between 3 and 6 mm.</p>'); });
      var hb = new T.Box3(new T.Vector3(-26, -11, 0), new T.Vector3(26, 11, 4)); v.setHome(hb, 1.15); v.fit(hb, { now: true, pad: 1.15 });
      if (done) { picked = [true, true, true, true]; setR(4); done = true; rebuild(); } else rebuild();
    });
    return box;
  };

  /* ============ text lab: plan your name ============ */
  F.textLab = function (container, ctx, key) {
    var saved = ctx.check(key) || {};
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Plan your name: raised or engraved?</h3></div>';
    var bar = el('div', 'fx-bar');
    bar.innerHTML = '<label class="fx-in">Text <input type="text" maxlength="12" value="' + esc(saved.text || 'ALEX') + '"></label>' +
      '<label class="fx-in">Height <input type="range" min="5" max="14" step="0.5" value="' + (saved.size || 9) + '"> <b class="fx-sz"></b></label>' +
      '<span class="fx-seg"><button type="button" data-s="raised">Raised</button><button type="button" data-s="engraved">Engraved</button></span>';
    box.appendChild(bar); container.appendChild(box);
    var v = F.viewer(box, { height: 340, gridSize: 75 });
    var info2 = el('div', 'fx-labinfo'); box.appendChild(info2);
    var tIn = bar.querySelector('input[type=text]'), sIn = bar.querySelector('input[type=range]'), sz = bar.querySelector('.fx-sz'), style = saved.style || 'raised', model = null, t = null;
    function seg() { bar.querySelectorAll('.fx-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === style); }); }
    seg();
    Promise.all([v.ready, F.font()]).then(function (r) {
      var T = v.T, font = r[1];
      function build() {
        sz.textContent = sIn.value + ' mm';
        if (model) { v.root.remove(model); disposeTree(model); }
        model = F.keychain(T, font, { text: tIn.value.trim(), size: +sIn.value, style: style, r: 4 }); v.root.add(model); v.render();
        var L = model.userData.letters, fits = !L || L.fits;
        info2.innerHTML = '<p>' + (!tIn.value.trim() ? 'Type your name (or a nickname or initials).' : fits ? 'Fits: about ' + Math.round(L.width) + ' mm wide (the space beside the hole is about 37 mm).' : '<span class="fx-warn">Too long at ' + sIn.value + ' mm: it had to shrink to fit. Use a smaller height, a nickname or your initials.</span>') +
          ' ' + (style === 'raised' ? '<b>Raised</b> letters stick up 1 mm (Extrude, Join). Easy to read and to paint.' : '<b>Engraved</b> letters are cut 1 mm down (Extrude, Cut). Smooth to touch, and they can’t snap off.') + '</p>';
        ctx.check(key, { text: tIn.value.trim(), size: +sIn.value, style: style, fits: fits });
      }
      tIn.addEventListener('input', function () { clearTimeout(t); t = setTimeout(build, 250); });
      sIn.addEventListener('input', function () { clearTimeout(t); t = setTimeout(build, 120); });
      bar.querySelectorAll('.fx-seg button').forEach(function (b) { b.addEventListener('click', function () { style = b.dataset.s; seg(); build(); }); });
      build(); var hb = new T.Box3(new T.Vector3(-26, -11, 0), new T.Vector3(26, 11, 5)); v.setHome(hb, 1.12); v.fit(hb, { now: true, pad: 1.12 });
    }).catch(function () { info2.innerHTML = '<p class="fx-warn">The 3D preview couldn’t load. You can still do this step in Fusion.</p>'; });
    return box;
  };

  /* ============ STL files ============ */
  F.parseSTL = function (buf) {
    var dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0, pos;
    var head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 512)));
    var ascii = /^\s*solid[\s\S]*facet/.test(head) && buf.byteLength !== 84 + n * 50;
    if (!ascii) {
      if (buf.byteLength < 84 + n * 50 || !n) throw new Error('This doesn’t look like an STL file.');
      pos = new Float32Array(n * 9);
      for (var i = 0; i < n; i++) { var o = 84 + i * 50 + 12; for (var j = 0; j < 9; j++) pos[i * 9 + j] = dv.getFloat32(o + j * 4, true); }
    } else {
      var txt = new TextDecoder().decode(new Uint8Array(buf)), re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g, m, arr = [];
      while ((m = re.exec(txt))) arr.push(+m[1], +m[2], +m[3]);
      if (!arr.length || arr.length % 9) throw new Error('This doesn’t look like an STL file.');
      pos = new Float32Array(arr); n = arr.length / 9;
    }
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (var p = 0; p < pos.length; p += 3) for (var a = 0; a < 3; a++) { if (pos[p + a] < mn[a]) mn[a] = pos[p + a]; if (pos[p + a] > mx[a]) mx[a] = pos[p + a]; }
    // closed (watertight): every edge is shared by exactly two triangles
    var ids = new Map(), next = 0, edges = new Map(), q = function (v) { return Math.round(v * 1000); };
    function vid(k) { var key = q(pos[k]) + ',' + q(pos[k + 1]) + ',' + q(pos[k + 2]); var v2 = ids.get(key); if (v2 == null) { v2 = next++; ids.set(key, v2); } return v2; }
    var bad = 0;
    if (n <= 400000) {
      for (var t = 0; t < n; t++) {
        var v0 = vid(t * 9), v1 = vid(t * 9 + 3), v3 = vid(t * 9 + 6);
        [[v0, v1], [v1, v3], [v3, v0]].forEach(function (e) { var k2 = e[0] < e[1] ? e[0] * 4194304 + e[1] : e[1] * 4194304 + e[0]; edges.set(k2, (edges.get(k2) || 0) + 1); });
      }
      edges.forEach(function (c) { if (c !== 2) bad++; });
    }
    return { pos: pos, tris: n, ascii: ascii, min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], closed: n <= 400000 ? bad === 0 : null, openEdges: bad };
  };
  F.stlView = function (container, buf, o) {
    o = o || {};
    var stl = F.parseSTL(buf), v = F.viewer(container, { height: o.height || 340, gridSize: Math.max(50, Math.ceil(Math.max(stl.size[0], stl.size[1]) / 25) * 25) });
    v.ready.then(function () {
      var T = v.T, geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(stl.pos, 3)); geo.computeVertexNormals();
      geo.translate(-(stl.min[0] + stl.max[0]) / 2, -(stl.min[1] + stl.max[1]) / 2, -stl.min[2]);
      var g = new T.Group(), mat = F.MAT.body(T); mat.side = T.DoubleSide; g.add(new T.Mesh(geo, mat)); if (stl.tris < 150000) g.add(new T.LineSegments(new T.EdgesGeometry(geo, 30), F.MAT.edge(T)));
      v.root.add(g); v.setHome(g); v.fit(g, { now: true });
    });
    v.stl = stl; return v;
  };
  F.stlFacts = function (stl) {
    var s = stl.size.map(function (x) { return Math.round(x * 10) / 10; }), big = Math.max.apply(null, s), rows = [];
    rows.push(['Size', s[0] + ' × ' + s[1] + ' × ' + s[2] + ' mm', big >= 25 && big <= 120 ? 'ok' : 'warn', big < 25 ? (big < 8 ? 'Very small. Was it exported in centimetres or inches? In Fusion, check Document Settings → Units: mm.' : 'Smaller than planned (the tag should be 50 mm long).') : big > 120 ? 'Bigger than planned (the tag should be 50 mm long). Check your dimensions.' : 'Keychain-sized.']);
    rows.push(['Closed (watertight)', stl.closed == null ? 'not checked (very big file)' : stl.closed ? 'Yes' : 'No — ' + stl.openEdges + ' open edges', stl.closed === false ? 'warn' : 'ok', stl.closed === false ? 'A printer needs a closed shape. Did you export the body (not a sketch or a surface)?' : 'A closed solid: a slicer can print it.']);
    rows.push(['Triangles', stl.tris.toLocaleString(), 'ok', 'STL files describe the surface with flat triangles.']);
    return rows;
  };
  F.stlCheck = function (container, ctx, key) {
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">Check</span><h3>Check your STL file</h3></div>';
    var bar = el('div', 'fx-bar'), pick = el('label', 'btn btn-small btn-primary', 'Open my .stl file'), inp = el('input'); inp.type = 'file'; inp.accept = '.stl'; inp.className = 'sr'; inp.id = 'stl-' + Math.random().toString(36).slice(2, 7); pick.htmlFor = inp.id; pick.tabIndex = 0;
    bar.appendChild(pick); bar.appendChild(inp); bar.appendChild(el('span', 'small muted', 'It stays on your computer: this only opens it to look.'));
    var view = el('div', 'fx-stlview'), facts = el('div', 'fx-labinfo'); box.appendChild(bar); box.appendChild(view); box.appendChild(facts); container.appendChild(box);
    var saved = ctx.check(key); if (saved && saved.size) facts.innerHTML = '<p class="small muted">Last checked: ' + esc(saved.name || '') + ' · ' + saved.size.join(' × ') + ' mm · ' + (saved.closed ? 'closed' : 'open edges') + '</p>';
    var cur = null;
    pick.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', function () {
      var f = inp.files[0]; if (!f) return; inp.value = '';
      f.arrayBuffer().then(function (buf) {
        if (cur && cur.dispose) cur.dispose(); view.innerHTML = '';
        try { cur = F.stlView(view, buf); } catch (e) { facts.innerHTML = '<p class="fx-warn">' + esc(e.message) + ' Export again with File → Export… and Type: STL Files (*.stl).</p>'; return; }
        var st = cur.stl, rows = F.stlFacts(st);
        facts.innerHTML = '<table class="fx-facts">' + rows.map(function (r) { return '<tr class="' + r[2] + '"><th>' + r[0] + '</th><td><b>' + esc(r[1]) + '</b><br><span class="small muted">' + esc(r[3]) + '</span></td></tr>'; }).join('') + '</table>';
        ctx.check(key, { name: f.name, size: st.size.map(function (x) { return Math.round(x * 10) / 10; }), closed: st.closed, tris: st.tris, ok: rows.every(function (r) { return r[2] === 'ok'; }) });
      });
    });
    return box;
  };
})(window);
