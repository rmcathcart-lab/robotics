/* RL.Fusion labs for Missions F2–F7 (each tries one idea on the page before doing it in Fusion).
 *  standLab()      phone stand: change the angle, lip and slot and see if a phone fits and stays up (dimensions drive a design)
 *  revolveLab()    spinning top: drag the points of a half-profile, see it revolved, and keep the centre of mass low
 *  organizerLab()  desk organizer: shell thickness and a rectangular pattern of dividers
 *  spinnerLab()    fidget spinner: user parameters (arms, bearing, thickness, tolerance) and a press fit
 *  clearanceLab()  snap lid: how much gap a 3D printed fit needs (section view, interference)
 *  loftLab()       bottle: blend between three profiles with Loft
 * Uses RL.Fusion.viewer etc. from fusion.js. Saves through ctx.check(key, {...}). */
(function (root) {
  'use strict';
  var RL = root.RL, F = RL.Fusion;
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = RL.esc;
  var NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* a lab box: header, a bar of sliders, a 3D view, and a message area */
  function labBox(container, title, label) {
    var box = el('div', 'xp fx-lab');
    box.innerHTML = '<div class="xp-h"><span class="label">' + esc(label || 'Try it') + '</span><h3>' + esc(title) + '</h3></div>';
    container.appendChild(box); return box;
  }
  /* sliders: [{ id, label, min, max, step, value, unit }] → { values, onChange(fn), set(id, v) } */
  function sliders(parent, list) {
    var bar = el('div', 'fx-panel fx-sliders'), vals = {}, fns = [], inputs = {};
    list.forEach(function (s) {
      vals[s.id] = s.value;
      var lab = el('label', '', '<span>' + esc(s.label) + '</span>');
      var r = el('input'); r.type = 'range'; r.min = s.min; r.max = s.max; r.step = s.step || 1; r.value = s.value; r.setAttribute('aria-label', s.label);
      var out = el('b', 'fx-val', fmt(s.value, s.unit));
      r.addEventListener('input', function () { vals[s.id] = +r.value; out.textContent = fmt(+r.value, s.unit); fns.forEach(function (f) { f(vals, s.id); }); });
      lab.appendChild(r); lab.appendChild(out); bar.appendChild(lab); inputs[s.id] = { r: r, out: out, s: s };
    });
    parent.appendChild(bar);
    function fmt(v, u) { return (u === '°' ? v + '°' : u ? v + ' ' + u : String(v)); }
    return { values: vals, onChange: function (f) { fns.push(f); }, set: function (id, v) { var i = inputs[id]; if (!i) return; vals[id] = v; i.r.value = v; i.out.textContent = fmt(v, i.s.unit); }, bar: bar };
  }
  function info(box) { var d = el('div', 'fx-labinfo'); box.appendChild(d); return d; }
  function saveVals(ctx, key, extra) { ctx.check(key, extra); }
  function swap(v, obj) { if (obj.cur) { v.root.remove(obj.cur); F.dispose(obj.cur); } return obj; }

  /* ============ shared mission pieces ============ */
  /* the brief: { lead (html), edp: [stages], hand: [what they hand in], preview(api, T) → Box3 for the home view, previewCap } */
  F.brief = function (b, m, o) {
    var UI = RL.UI, wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = o.lead; UI.edp(left, o.edp || [4, 5, 6, 7]); wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">New tools</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll need</span>' + m.parts.concat(m.extras || []).map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll hand in</span>' + (o.hand || ['Your design (.f3d)', 'A print file (.stl)', 'A screenshot']).map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    if (o.preview) {
      var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Preview</span><h3>What you’re building</h3></div>'; b.appendChild(box);
      var v = F.viewer(box, { height: 320, gridSize: o.grid || 75, helpText: 'Drag to turn it around · Scroll or pinch to zoom' });
      if (o.previewCap) box.appendChild(el('div', 'xp-cap', '<p>' + o.previewCap + '</p>'));
      v.ready.then(function (api) {
        var hb = o.preview(api, api.T); api.setHome(hb, 1.1); api.fit(hb, { now: true, pad: 1.1 });
        var spin = true; api.canvas.addEventListener('pointerdown', function () { spin = false; }); api.canvas.addEventListener('wheel', function () { spin = false; });
        (function sp() { if (!spin || !api.canvas.isConnected) return; api.state.theta += 0.0035; api.render(); requestAnimationFrame(sp); })();
      }).catch(function () {});
    }
  };
  /* the usual evidence for a Fusion mission */
  F.evidence = function (name, intro, questions, extra) {
    var files = [
      { id: 'f3d', kind: 'model', ext: ['f3d'], extHelp: 'In Fusion: File → Export… → Type: Autodesk Fusion Archive Files (*.f3d).', label: 'Your Fusion design (.f3d)', help: 'File → Export… → Type: Autodesk Fusion Archive Files (*.f3d).', required: true, max: 1 },
      { id: 'stl', kind: 'model', ext: ['stl'], extHelp: 'In Fusion: File → Export… → Type: STL Files (*.stl).', label: 'Your print file (.stl)', help: 'File → Export… → Type: STL Files (*.stl). For more than one part, export each one.', required: true, max: 3 },
      { id: 'shot', kind: 'photo', label: 'A screenshot of Fusion', help: 'The whole Fusion window, showing your ' + name + ' and the timeline at the bottom.', required: true, max: 2 }
    ].concat(extra || []);
    return { intro: intro, files: files, questions: questions };
  };
  /* a reminder card of how to export (used near the end of each mission) */
  F.exportReminder = function (b) {
    RL.UI.callout(b, '', 'Save & export', '<p>Save into your <b>Robotics Missions</b> project, then <b>File ▸ Export…</b> twice: once as <b>.f3d</b> (your whole design) and once as <b>.stl</b> (for printing). Check the STL in the checker below before you hand it in.</p>');
  };

  /* ============ F2: phone stand ============ */
  F.standProfile = function (T, p) {
    var A = p.angle * Math.PI / 180, xf = p.top - (p.back - p.shelf) * Math.cos(A) / Math.sin(A);
    var pts = [[0, 0], [p.base, 0], [p.base, p.lip], [p.base - p.lipT, p.lip], [p.base - p.lipT, p.shelf], [xf, p.shelf], [p.top, p.back], [0, p.back]];
    var s = new T.Shape(); pts.forEach(function (q, i) { if (i) s.lineTo(q[0], q[1]); else s.moveTo(q[0], q[1]); }); s.closePath();
    return { shape: s, foot: xf, slot: p.base - p.lipT - xf, pts: pts };
  };
  F.standLab = function (container, ctx, key) {
    var box = labBox(container, 'Design the stand around your phone');
    var saved = ctx.check(key) || {};
    var sl = sliders(box, [
      { id: 'angle', label: 'Support angle', min: 95, max: 140, step: 1, value: saved.angle || 110, unit: '°' },
      { id: 'lip', label: 'Lip height', min: 7, max: 30, step: 1, value: saved.lip || 15, unit: 'mm' },
      { id: 'base', label: 'Base length', min: 60, max: 130, step: 1, value: saved.base || 90, unit: 'mm' },
      { id: 'phone', label: 'Phone + case thickness', min: 7, max: 18, step: 0.5, value: saved.phone || 11, unit: 'mm' }
    ]);
    var v = F.viewer(box, { height: 360, gridSize: 100, helpText: 'Drag to orbit · Scroll to zoom' });
    var msg = info(box), cur = null, phone = null, t = null;
    v.ready.then(function (api) {
      var T = api.T;
      function build() {
        var p = { angle: sl.values.angle, lip: sl.values.lip, base: sl.values.base, back: 62, top: 14, shelf: 7, lipT: 4 }, prof = F.standProfile(T, p);
        if (cur) { api.root.remove(cur); F.dispose(cur); } if (phone) { api.root.remove(phone); F.dispose(phone); }
        var geo = F.extrude(T, prof.shape, 70); geo.translate(0, 0, -35); geo.rotateX(Math.PI / 2); geo.translate(-p.base / 2, 0, 0);
        cur = F.solid(T, geo); api.root.add(cur);
        // the phone: a slab resting on the shelf against the support face
        var tilt = (p.angle - 90) * Math.PI / 180, th = sl.values.phone, L = 150;
        var pg = new T.BoxGeometry(th, 72, L); pg.translate(th / 2, 0, L / 2);
        phone = new T.Mesh(pg, new T.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.88 }));
        phone.rotation.y = -tilt; phone.position.set(prof.foot - p.base / 2 + 0.3, 0, p.shelf + 0.2); api.root.add(phone);
        // checks
        var need = th / Math.cos(tilt) + 1, fits = prof.slot >= need, holds = p.lip >= 10, view = p.angle >= 100 && p.angle <= 125;
        var com = prof.foot + (th / 2) * Math.cos(tilt) - (L / 2) * Math.sin(tilt), stable = com > 3;
        var rows = [
          [fits, fits ? 'The phone fits in the slot (' + r1(prof.slot) + ' mm of space for a ' + th + ' mm phone).' : 'Too tight: the slot is ' + r1(prof.slot) + ' mm but a ' + th + ' mm phone at this angle needs about ' + r1(need) + ' mm. Make the base longer or the angle smaller.'],
          [holds, holds ? 'The ' + p.lip + ' mm lip will stop the phone sliding off.' : 'A ' + p.lip + ' mm lip is low: the phone could slide over it. Try at least 10 mm.'],
          [view, view ? 'At ' + p.angle + '° the screen leans back ' + Math.round(p.angle - 90) + '° — comfortable to watch on a desk.' : p.angle < 100 ? 'Almost upright: the phone may tip forward when you tap it.' : 'Leaning far back: good for a bedside table, hard to read on a desk.'],
          [stable, stable ? 'Stable: the phone’s weight is over the base.' : 'It tips over backward: the phone’s centre of mass is behind the base. Make the angle smaller.']
        ];
        var ok = rows.every(function (r) { return r[0]; });
        msg.innerHTML = '<ul class="fx-checks">' + rows.map(function (r) { return '<li class="' + (r[0] ? 'ok' : 'no') + '">' + r[1] + '</li>'; }).join('') + '</ul>' + (ok ? '<p class="fx-ok"><b class="pass">PASS</b> · Every check is green. Write these numbers down: you’ll use them in Fusion.</p>' : '');
        api.render();
        clearTimeout(t); t = setTimeout(function () { saveVals(ctx, key, { angle: p.angle, lip: p.lip, base: p.base, phone: th, ok: ok }); }, 400);
      }
      sl.onChange(build); build();
      var hb = new T.Box3(new T.Vector3(-70, -40, 0), new T.Vector3(70, 40, 150)); api.setHome(hb, 1.05); api.fit(hb, { now: true, pad: 1.05 });
    });
    return box;
  };

  /* ============ F3: revolve + centre of mass ============ */
  /* profile: [[r, z]...] from the tip (0,0) up to the top of the stem on the axis */
  F.revolveStats = function (pts) {
    var V = 0, M = 0, rmax = 0, H = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], h = b[1] - a[1], r1_ = a[0], r2 = b[0];
      rmax = Math.max(rmax, r1_, r2); H = Math.max(H, a[1], b[1]);
      if (Math.abs(h) < 1e-6) continue;
      var k = r1_ * r1_ + r1_ * r2 + r2 * r2, vol = Math.PI * h * k / 3;
      var zc = k > 0 ? a[1] + h * (r1_ * r1_ + 2 * r1_ * r2 + 3 * r2 * r2) / (4 * k) : a[1];
      V += vol; M += vol * zc;
    }
    V = Math.abs(V);
    return { volume: V, com: V ? Math.abs(M) / V : 0, rmax: rmax, height: H, grams: V / 1000 * 1.24 };
  };
  F.revolveLab = function (container, ctx, key) {
    var box = labBox(container, 'Shape a top that spins');
    var saved = ctx.check(key) || {};
    var pts = saved.pts || [[0, 0], [22, 9], [22, 15], [6, 17], [4, 17], [4, 42], [0, 42]];
    var wrap = el('div', 'fx-split'); box.appendChild(wrap);
    var left = el('div', 'fx-skstage fx-rev'); wrap.appendChild(left);
    var right = el('div'); wrap.appendChild(right);
    var SC = 6, VB = [-40, -290, 220, 310];
    var svg = S('svg', { viewBox: VB.join(' '), 'data-art': 'keep', 'aria-label': 'Half-profile: drag the blue points' }, left);
    var v = F.viewer(right, { height: 330, gridSize: 50, helpText: 'Drag to orbit · Scroll to zoom' });
    var msg = info(box), mesh = null, comDot = null, t = null, drag = null;
    var FIXED = { 0: 'tip', 6: 'top' };
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      S('rect', { x: VB[0], y: VB[1], width: VB[2], height: VB[3], fill: '#fbfcfd' }, svg);
      for (var gx = 0; gx <= 30; gx += 5) S('line', { x1: gx * SC, y1: VB[1], x2: gx * SC, y2: VB[1] + VB[3], stroke: '#e3e7ec', 'stroke-width': gx % 10 ? 0.6 : 1 }, svg);
      for (var gz = 0; gz <= 45; gz += 5) S('line', { x1: VB[0], y1: -gz * SC, x2: VB[0] + VB[2], y2: -gz * SC, stroke: '#e3e7ec', 'stroke-width': gz % 10 ? 0.6 : 1 }, svg);
      S('line', { x1: 0, y1: VB[1], x2: 0, y2: VB[1] + VB[3], stroke: '#5b6673', 'stroke-width': 1.4, 'stroke-dasharray': '8 4 2 4' }, svg);
      var tx = S('text', { x: 6, y: VB[1] + 14, 'font-family': 'Arial, sans-serif', 'font-size': 11, fill: '#5b6673' }, svg); tx.textContent = 'axis (construction line)';
      S('polygon', { points: pts.map(function (p) { return p[0] * SC + ',' + (-p[1] * SC); }).join(' '), fill: 'rgba(80,150,230,.14)', stroke: '#1f6fd1', 'stroke-width': 2 }, svg);
      var st = F.revolveStats(pts);
      S('circle', { cx: 0, cy: -st.com * SC, r: 6, fill: '#ff6a13', stroke: '#fff', 'stroke-width': 1.5 }, svg);
      var ct = S('text', { x: 10, y: -st.com * SC + 4, 'font-family': 'Arial, sans-serif', 'font-size': 11, fill: '#c2410c' }, svg); ct.textContent = 'centre of mass ' + r1(st.com) + ' mm';
      pts.forEach(function (p, i) {
        if (FIXED[i]) { S('circle', { cx: p[0] * SC, cy: -p[1] * SC, r: 4, fill: '#121417' }, svg); return; }
        var c = S('circle', { cx: p[0] * SC, cy: -p[1] * SC, r: 7, fill: '#fff', stroke: '#1f6fd1', 'stroke-width': 2.5, 'class': 'fx-pt', tabindex: 0 }, svg);
        c.addEventListener('pointerdown', function (e) { e.preventDefault(); drag = i; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); });
      });
      return st;
    }
    function toMM(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x / SC, -q.y / SC]; }
    svg.addEventListener('pointermove', function (e) {
      if (drag == null) return;
      var m = toMM(e), lo = pts[drag - 1][1], hi = pts[drag + 1][1];
      pts[drag] = [r1(clamp(m[0], 1, 30)), r1(clamp(m[1], lo, hi))];
      if (drag === 5) pts[6] = [0, pts[5][1]]; // keep the top on the axis level with the stem
      update();
    });
    function end() { drag = null; }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('pointerleave', end);
    function update() {
      var st = draw();
      if (v.T) {
        var T = v.T;
        if (mesh) { v.root.remove(mesh); F.dispose(mesh); }
        var lp = pts.map(function (p) { return new T.Vector2(Math.max(0.001, p[0]), p[1]); });
        var g = new T.LatheGeometry(lp, 72); g.rotateX(Math.PI / 2);
        mesh = new T.Group(); var mat = new T.MeshStandardMaterial({ color: 0xb53a32, roughness: 0.35, metalness: 0.05, side: T.DoubleSide }); mesh.add(new T.Mesh(g, mat));
        v.root.add(mesh);
        if (!comDot) { comDot = new T.Mesh(new T.SphereGeometry(1.6, 16, 12), new T.MeshBasicMaterial({ color: 0xff6a13, depthTest: false })); comDot.renderOrder = 5; v.root.add(comDot); }
        comDot.position.set(0, 0, st.com); v.render();
      }
      var ratio = st.com / Math.max(1, st.height), wide = st.rmax >= 15, low = ratio <= 0.36, ok = wide && low && st.grams <= 40;
      msg.innerHTML = '<p><b>Height</b> ' + r1(st.height) + ' mm · <b>Widest</b> Ø' + r1(st.rmax * 2) + ' mm · <b>Centre of mass</b> ' + r1(st.com) + ' mm up (' + Math.round(ratio * 100) + '% of the height) · <b>Mass</b> about ' + r1(st.grams) + ' g in PLA</p>' +
        '<ul class="fx-checks"><li class="' + (low ? 'ok' : 'no') + '">' + (low ? 'Low centre of mass: it will stay upright while it spins.' : 'The centre of mass is high, so it will wobble and fall. Move weight down: make the disc wider and lower, or the stem thinner.') + '</li>' +
        '<li class="' + (wide ? 'ok' : 'no') + '">' + (wide ? 'A wide disc stores more spin, like a figure skater with arms out.' : 'Make the widest part at least Ø30 mm so it keeps spinning.') + '</li>' +
        '<li class="' + (st.grams <= 40 ? 'ok' : 'no') + '">' + (st.grams <= 40 ? 'Small enough to print in under an hour.' : 'That’s a lot of plastic (' + r1(st.grams) + ' g). Slim it down.') + '</li></ul>' +
        (ok ? '<p class="fx-ok"><b class="pass">PASS</b> · This should spin well. In Fusion, INSPECT ▸ Center of Mass shows the same orange dot.</p>' : '');
      clearTimeout(t); t = setTimeout(function () { ctx.check(key, { pts: pts, com: r1(st.com), ok: ok }); }, 400);
    }
    v.ready.then(function (api) { var T = api.T; var hb = new T.Box3(new T.Vector3(-30, -30, 0), new T.Vector3(30, 30, 45)); api.setHome(hb, 1.05); api.fit(hb, { now: true, pad: 1.05 }); update(); });
    update();
    var reset = el('button', 'btn btn-small btn-ghost', 'Start over'); reset.type = 'button';
    reset.addEventListener('click', function () { pts = [[0, 0], [22, 9], [22, 15], [6, 17], [4, 17], [4, 42], [0, 42]]; update(); });
    var rb = el('div', 'fx-bar'); rb.appendChild(reset); rb.appendChild(el('span', 'small muted', 'Drag the blue points. The black points stay on the axis.')); box.insertBefore(rb, wrap);
    return box;
  };

  /* ============ F4: shell + rectangular pattern ============ */
  F.organizerLab = function (container, ctx, key) {
    var box = labBox(container, 'Shell it, then pattern the dividers');
    var saved = ctx.check(key) || {};
    var sl = sliders(box, [
      { id: 'wall', label: 'Shell thickness', min: 0.8, max: 5, step: 0.1, value: saved.wall || 2.5, unit: 'mm' },
      { id: 'first', label: 'First divider', min: 10, max: 80, step: 1, value: saved.first || 35, unit: 'mm' },
      { id: 'qty', label: 'Quantity', min: 1, max: 6, step: 1, value: saved.qty || 2 },
      { id: 'gap', label: 'Distance (spacing)', min: 8, max: 80, step: 1, value: saved.gap || 60, unit: 'mm' }
    ]);
    var v = F.viewer(box, { height: 340, gridSize: 100 });
    var msg = info(box), cur = null, t = null;
    var L = 120, W = 80, H = 50;
    v.ready.then(function (api) {
      var T = api.T;
      function build() {
        var w = sl.values.wall, first = sl.values.first, q = sl.values.qty, gap = sl.values.gap;
        if (cur) { api.root.remove(cur); F.dispose(cur); }
        cur = new T.Group();
        var outer = new T.Shape(); outer.moveTo(-L / 2, -W / 2); outer.lineTo(L / 2, -W / 2); outer.lineTo(L / 2, W / 2); outer.lineTo(-L / 2, W / 2); outer.closePath();
        var hole = new T.Path(); hole.moveTo(-L / 2 + w, -W / 2 + w); hole.lineTo(-L / 2 + w, W / 2 - w); hole.lineTo(L / 2 - w, W / 2 - w); hole.lineTo(L / 2 - w, -W / 2 + w); hole.closePath(); outer.holes.push(hole);
        cur.add(F.solid(T, F.extrude(T, outer, H - w, w)));
        var floor = new T.BoxGeometry(L, W, w); floor.translate(0, 0, w / 2); cur.add(F.solid(T, floor));
        var inner = L - 2 * w, xs = [], out = 0, pockets = [];
        for (var i = 0; i < q; i++) { var x = first + i * gap; if (x + w > inner) { out++; continue; } xs.push(x); }
        xs.forEach(function (x, i) {
          var g = new T.BoxGeometry(w, W - 2 * w, 40); g.translate(-L / 2 + w + x + w / 2, 0, w + 20);
          cur.add(F.solid(T, g, i ? F.MAT.preview(T) : F.MAT.body(T)));
        });
        var edges = [0].concat(xs.map(function (x) { return x; })), prev = 0;
        xs.forEach(function (x) { pockets.push(x - prev); prev = x + w; }); pockets.push(inner - prev);
        api.root.add(cur); api.render();
        var tiny = pockets.filter(function (p) { return p < 12; }).length, thin = w < 1.2, thick = w > 4;
        var ok = !out && !tiny && !thin && !thick && xs.length >= 1;
        msg.innerHTML = '<p><b>Compartments</b> (inside widths): ' + pockets.map(function (p) { return '<span class="tag">' + r1(p) + ' mm</span>'; }).join(' ') + '</p><ul class="fx-checks">' +
          '<li class="' + (thin || thick ? 'no' : 'ok') + '">' + (thin ? 'Walls under 1.2 mm print weak and see-through. Thicker!' : thick ? 'Walls over 4 mm waste plastic and print time.' : w + ' mm walls: strong, and quick to print.') + '</li>' +
          '<li class="' + (out ? 'no' : 'ok') + '">' + (out ? out + ' of the ' + q + ' dividers would land outside the box. Fusion would show them sticking out — lower the quantity or the spacing.' : 'All ' + q + ' divider' + (q === 1 ? '' : 's') + ' fit inside (blue = the copies the pattern makes).') + '</li>' +
          '<li class="' + (tiny ? 'no' : 'ok') + '">' + (tiny ? 'A compartment under 12 mm is too narrow for fingers.' : 'Every compartment is wide enough to reach into.') + '</li></ul>' +
          (ok ? '<p class="fx-ok"><b class="pass">PASS</b> · One divider, patterned. Change one number and they all move: that’s why patterns beat copying.</p>' : '');
        clearTimeout(t); t = setTimeout(function () { ctx.check(key, { wall: w, first: first, qty: q, gap: gap, ok: ok }); }, 400);
      }
      sl.onChange(build); build();
      var hb = new T.Box3(new T.Vector3(-60, -40, 0), new T.Vector3(60, 40, 50)); api.setHome(hb, 1.1); api.fit(hb, { now: true, pad: 1.1 });
    });
    return box;
  };

  /* ============ F5: parameters + press fit ============ */
  F.spinnerGroup = function (T, p, mat) {
    var g = new T.Group(), D = p.bearing + p.tol, R = D / 2 + p.wall, arm = p.reach, h = p.thick;
    function ring(cx, cy) { var s = new T.Shape(); s.absarc(cx, cy, R, 0, Math.PI * 2, false); var hp = new T.Path(); hp.absarc(cx, cy, D / 2, 0, Math.PI * 2, true); s.holes.push(hp); return s; }
    var shapes = [ring(0, 0)];
    for (var i = 0; i < p.arms; i++) {
      var a = Math.PI / 2 + i * 2 * Math.PI / p.arms, cx = Math.cos(a) * arm, cy = Math.sin(a) * arm;
      shapes.push(ring(cx, cy));
      var nx = -Math.sin(a), ny = Math.cos(a), w = R * 0.9, r0 = Math.sqrt(Math.max(0, R * R - w * w / 4)) * 0.98, r1_ = arm - r0;
      var st = new T.Shape(); st.moveTo(Math.cos(a) * r0 + nx * w / 2, Math.sin(a) * r0 + ny * w / 2); st.lineTo(Math.cos(a) * r1_ + nx * w / 2, Math.sin(a) * r1_ + ny * w / 2); st.lineTo(Math.cos(a) * r1_ - nx * w / 2, Math.sin(a) * r1_ - ny * w / 2); st.lineTo(Math.cos(a) * r0 - nx * w / 2, Math.sin(a) * r0 - ny * w / 2); st.closePath();
      shapes.push(st);
    }
    shapes.forEach(function (s) { g.add(new T.Mesh(F.extrude(T, s, h), mat)); });
    return g;
  };
  F.spinnerLab = function (container, ctx, key) {
    var box = labBox(container, 'Drive the design with parameters');
    var saved = ctx.check(key) || {};
    var P = Object.assign({ arms: 3, thick: 7, reach: 30, tol: 0.2 }, saved);
    var sl = sliders(box, [
      { id: 'arms', label: 'arms', min: 2, max: 6, step: 1, value: P.arms },
      { id: 'thick', label: 'thick', min: 4, max: 10, step: 0.5, value: P.thick, unit: 'mm' },
      { id: 'reach', label: 'reach', min: 24, max: 40, step: 1, value: P.reach, unit: 'mm' },
      { id: 'tol', label: 'tolerance', min: -0.2, max: 0.8, step: 0.05, value: P.tol, unit: 'mm' }
    ]);
    sl.bar.classList.add('fx-params');
    var table = el('div', 'fx-ptable'); box.appendChild(table);
    var v = F.viewer(box, { height: 340, gridSize: 75 });
    var msg = info(box), cur = null, brg = null, t = null;
    v.ready.then(function (api) {
      var T = api.T;
      function build() {
        var p = { arms: sl.values.arms, thick: sl.values.thick, reach: sl.values.reach, tol: Math.round(sl.values.tol * 100) / 100, bearing: 22, wall: 7 };
        if (cur) { api.root.remove(cur); F.dispose(cur); } if (brg) { api.root.remove(brg); F.dispose(brg); }
        cur = F.spinnerGroup(T, p, F.MAT.body(T)); api.root.add(cur);
        // one 608 bearing in the middle (22 mm outside, 8 mm hole, 7 mm thick)
        var bs = new T.Shape(); bs.absarc(0, 0, 11, 0, Math.PI * 2, false); var bh = new T.Path(); bh.absarc(0, 0, 4, 0, Math.PI * 2, true); bs.holes.push(bh);
        var bg = F.extrude(T, bs, 7, (p.thick - 7) / 2); brg = new T.Mesh(bg, new T.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.3, roughness: 0.3 })); api.root.add(brg);
        var D = 22 + p.tol, verdict, cls;
        if (p.tol < 0) { verdict = 'Interference: the hole (Ø' + D.toFixed(2) + ') is smaller than the bearing (Ø22). It won’t go in without breaking the part.'; cls = 'no'; }
        else if (p.tol < 0.1) { verdict = 'Very tight. 3D printed holes come out a little small, so Ø' + D.toFixed(2) + ' will probably be too tight.'; cls = 'no'; }
        else if (p.tol <= 0.3) { verdict = 'Press fit: Ø' + D.toFixed(2) + ' mm is a hair bigger than the bearing, so it pushes in snugly and stays.'; cls = 'ok'; }
        else if (p.tol <= 0.5) { verdict = 'Slip fit: the bearing drops in easily but may fall out. Add a drop of glue, or tighten the tolerance.'; cls = 'no'; }
        else { verdict = 'Loose: Ø' + D.toFixed(2) + ' is too big and the bearing will rattle.'; cls = 'no'; }
        var gapA = 2 * Math.PI * p.reach / p.arms - 2 * (11 + 7), overlap = gapA < 0;
        table.innerHTML = '<table class="fx-plan fx-params-t"><thead><tr><th>Name</th><th>Expression</th><th>Value</th></tr></thead><tbody>' +
          '<tr><td>bearing</td><td>22 + tolerance</td><td>' + D.toFixed(2) + ' mm</td></tr><tr><td>arms</td><td>' + p.arms + '</td><td>' + p.arms + '</td></tr>' +
          '<tr><td>thick</td><td>' + p.thick + ' mm</td><td>' + p.thick + ' mm</td></tr><tr><td>ring</td><td>bearing + 2 * 7 mm</td><td>' + (D + 14).toFixed(2) + ' mm</td></tr></tbody></table>';
        var ok = cls === 'ok' && !overlap && p.thick >= 7;
        msg.innerHTML = '<ul class="fx-checks"><li class="' + cls + '">' + verdict + '</li>' +
          '<li class="' + (overlap ? 'no' : 'ok') + '">' + (overlap ? 'The arms crash into each other. Fewer arms, or more reach.' : p.arms + ' arms, evenly spaced: Fusion’s circular pattern does that from one arm.') + '</li>' +
          '<li class="' + (p.thick >= 7 ? 'ok' : 'no') + '">' + (p.thick >= 7 ? 'At least as thick as the 7 mm bearing.' : 'Thinner than the 7 mm bearing — it would stick out.') + '</li></ul>' +
          (ok ? '<p class="fx-ok"><b class="pass">PASS</b> · Every size comes from a parameter, so changing one number updates the whole spinner.</p>' : '');
        api.render();
        clearTimeout(t); t = setTimeout(function () { ctx.check(key, { arms: p.arms, thick: p.thick, reach: p.reach, tol: p.tol, ok: ok }); }, 400);
      }
      sl.onChange(build); build();
      var hb = new T.Box3(new T.Vector3(-50, -50, 0), new T.Vector3(50, 50, 8)); api.setHome(hb, 1.05); api.fit(hb, { now: true, pad: 1.05 });
    });
    return box;
  };

  /* ============ F6: clearance for a snap lid ============ */
  F.clearanceLab = function (container, ctx, key) {
    var box = labBox(container, 'How much gap does a printed lid need?');
    var saved = ctx.check(key) || {};
    var sl = sliders(box, [{ id: 'gap', label: 'Clearance per side', min: -0.3, max: 1, step: 0.05, value: saved.gap != null ? saved.gap : 0, unit: 'mm' }]);
    var stage = el('div', 'fx-skstage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 640 300', 'data-art': 'keep', 'aria-label': 'Section through the box wall and the lid' }, stage);
    var msg = info(box), t = null;
    var K = 60; // px per mm in the zoomed view
    function draw() {
      var g = Math.round(sl.values.gap * 100) / 100;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      S('rect', { x: 0, y: 0, width: 640, height: 300, fill: '#fbfcfd' }, svg);
      // a hatch pattern for cut faces
      var defs = S('defs', {}, svg);
      [['hb', '#7ec8e3'], ['hl', '#f2dd8c']].forEach(function (h) { var p = S('pattern', { id: h[0], width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs); S('rect', { width: 8, height: 8, fill: h[1] }, p); S('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#2b3138', 'stroke-width': 1 }, p); });
      var wallX = 330; // inner face of the box wall
      S('rect', { x: wallX, y: 150, width: 2 * K, height: 150, fill: 'url(#hb)', stroke: '#2b3138', 'stroke-width': 1.5 }, svg);
      var lipR = wallX - g * K; // outer face of the lid lip
      S('rect', { x: 120, y: 90, width: wallX + 2 * K - 120, height: 2 * K * 0.5, fill: 'url(#hl)', stroke: '#2b3138', 'stroke-width': 1.5 }, svg);
      S('rect', { x: 120, y: 150, width: lipR - 120, height: 100, fill: 'url(#hl)', stroke: '#2b3138', 'stroke-width': 1.5 }, svg);
      if (g < 0) S('rect', { x: wallX, y: 150, width: -g * K, height: 100, fill: 'rgba(229,72,77,.55)', stroke: '#c81e1e', 'stroke-width': 1.5 }, svg);
      function txt(x, y, s, a) { var e = S('text', Object.assign({ x: x, y: y, 'font-family': 'Arial, sans-serif', 'font-size': 13, fill: '#1b2026' }, a || {}), svg); e.textContent = s; return e; }
      txt(140, 82, 'LID (yellow = cut face)'); txt(wallX + 6, 290, 'BOX WALL (blue)'); txt(130, 270, 'lid lip');
      // dimension
      var y = 205, xa = Math.min(lipR, wallX), xb = Math.max(lipR, wallX);
      if (Math.abs(g) > 0.001) {
        S('line', { x1: xa, y1: y, x2: xb, y2: y, stroke: '#121417', 'stroke-width': 1 }, svg);
        S('line', { x1: xa, y1: y - 10, x2: xa, y2: y + 10, stroke: '#121417' }, svg); S('line', { x1: xb, y1: y - 10, x2: xb, y2: y + 10, stroke: '#121417' }, svg);
      }
      txt((xa + xb) / 2, y - 14, (g < 0 ? 'overlap ' : 'gap ') + Math.abs(g).toFixed(2) + ' mm', { 'text-anchor': 'middle', 'font-weight': 700, fill: g < 0 ? '#c81e1e' : '#1b2026' });
      txt(630, 20, 'zoomed in 60×', { 'text-anchor': 'end', fill: '#6b7682', 'font-size': 11 });
      var v, c;
      if (g < 0) { v = 'Interference: the lid overlaps the wall (red). INSPECT ▸ Interference in Fusion would find this. It can’t close.'; c = 'no'; }
      else if (g < 0.1) { v = 'Zero gap looks perfect on screen, but printed parts come out slightly fat. This lid won’t fit.'; c = 'no'; }
      else if (g <= 0.25) { v = 'Snug: about right for a lid that clicks on and stays (the Bambu Lab A1 prints to about ±0.1 mm).'; c = 'ok'; }
      else if (g <= 0.45) { v = 'Easy fit: the lid slides on and off. Good for a box you open a lot.'; c = 'ok'; }
      else { v = 'Loose: the lid will rattle and fall off.'; c = 'no'; }
      msg.innerHTML = '<ul class="fx-checks"><li class="' + c + '">' + v + '</li></ul>';
      clearTimeout(t); t = setTimeout(function () { ctx.check(key, { gap: g, ok: c === 'ok' }); }, 400);
    }
    sl.onChange(draw); draw();
    return box;
  };

  /* ============ F7: loft ============ */
  function profilePts(kind, size, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, r = size / 2, x, y;
      if (kind === 'circle') { x = Math.cos(a) * r; y = Math.sin(a) * r; }
      else {
        var k = kind === 'square' ? 4 : kind === 'hexagon' ? 6 : 5;
        if (kind === 'star') { var tt = (a * 5 / (Math.PI * 2)) % 1, rr = r * (1 - 0.45 * (1 - Math.abs(tt * 2 - 1))); x = Math.cos(a) * rr; y = Math.sin(a) * rr; }
        else { var seg = Math.PI * 2 / k, a0 = Math.floor((a + (kind === 'square' ? seg / 2 : 0)) / seg) * seg - (kind === 'square' ? seg / 2 : 0), p = (a - a0) / seg; var x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r, x1 = Math.cos(a0 + seg) * r, y1 = Math.sin(a0 + seg) * r; var dx = x1 - x0, dy = y1 - y0, det = Math.cos(a) * dy - Math.sin(a) * dx, s2 = (x0 * dy - y0 * dx) / det; x = Math.cos(a) * s2; y = Math.sin(a) * s2; }
      }
      out.push([x, y]);
    }
    return out;
  }
  F.loftGeometry = function (T, profs, hs, n) {
    var rings = profs.length, steps = 24, pos = [], idx = [];
    function lerpRing(t) { // Catmull-Rom through the profiles
      var seg = Math.min(rings - 2, Math.floor(t * (rings - 1))), u = t * (rings - 1) - seg, out = [];
      for (var i = 0; i < n; i++) {
        var P = function (k) { k = clamp(k, 0, rings - 1); return [profs[k][i][0], profs[k][i][1], hs[k]]; };
        var p0 = P(seg - 1), p1 = P(seg), p2 = P(seg + 1), p3 = P(seg + 2), q = [];
        for (var c = 0; c < 3; c++) q.push(0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u * u * u));
        out.push(q);
      }
      return out;
    }
    for (var s = 0; s <= steps; s++) lerpRing(s / steps).forEach(function (q) { pos.push(q[0], q[1], q[2]); });
    for (s = 0; s < steps; s++) for (var i = 0; i < n; i++) { var a = s * n + i, b = s * n + (i + 1) % n, c = (s + 1) * n + i, d = (s + 1) * n + (i + 1) % n; idx.push(a, b, d, a, d, c); }
    var base = pos.length / 3; pos.push(0, 0, hs[0]); for (i = 0; i < n; i++) idx.push(base, (i + 1) % n, i); // bottom cap
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  F.loftLab = function (container, ctx, key) {
    var box = labBox(container, 'Loft between three profiles');
    var saved = ctx.check(key) || {};
    var P = saved.p || [{ kind: 'circle', size: 40, h: 0 }, { kind: 'circle', size: 24, h: 35 }, { kind: 'hexagon', size: 36, h: 75 }];
    var bar = el('div', 'fx-panel fx-loftbar');
    var names = ['Bottom (Profile 1)', 'Middle (Profile 2)', 'Top (Profile 3)'];
    P.forEach(function (p, i) {
      var g = el('div', 'fx-lp'); g.innerHTML = '<b>' + names[i] + '</b>';
      var sel = el('select'); ['circle', 'square', 'hexagon', 'star'].forEach(function (k) { var o = new Option(k, k); if (k === p.kind) o.selected = true; sel.appendChild(o); });
      sel.setAttribute('aria-label', names[i] + ' shape');
      var sz = el('input'); sz.type = 'range'; sz.min = 10; sz.max = 60; sz.value = p.size; sz.setAttribute('aria-label', names[i] + ' size');
      var lab = el('span', 'small muted', 'Ø' + p.size);
      sel.addEventListener('change', function () { p.kind = sel.value; build(); });
      sz.addEventListener('input', function () { p.size = +sz.value; lab.textContent = 'Ø' + p.size; build(); });
      g.appendChild(sel); g.appendChild(sz); g.appendChild(lab);
      if (i === 1) { var hh = el('input'); hh.type = 'range'; hh.min = 10; hh.max = 65; hh.value = p.h; hh.setAttribute('aria-label', 'Middle profile height'); var hl = el('span', 'small muted', 'at ' + p.h + ' mm'); hh.addEventListener('input', function () { p.h = +hh.value; hl.textContent = 'at ' + p.h + ' mm'; build(); }); g.appendChild(hh); g.appendChild(hl); }
      bar.appendChild(g);
    });
    box.appendChild(bar);
    var v = F.viewer(box, { height: 360, gridSize: 75 });
    var msg = info(box), cur = null, rings = null, t = null, build = function () {};
    v.ready.then(function (api) {
      var T = api.T;
      build = function () {
        if (cur) { api.root.remove(cur); F.dispose(cur); } if (rings) { api.root.remove(rings); F.dispose(rings); }
        var n = 120, profs = P.map(function (p) { return profilePts(p.kind, p.size, n); }), hs = P.map(function (p) { return p.h; });
        cur = new T.Mesh(F.loftGeometry(T, profs, hs, n), new T.MeshStandardMaterial({ color: 0xa3a8ad, metalness: 0.2, roughness: 0.45, side: T.DoubleSide }));
        api.root.add(cur);
        rings = new T.Group();
        profs.forEach(function (pr, k) { var pts = pr.map(function (q) { return new T.Vector3(q[0], q[1], hs[k] + 0.05); }); pts.push(pts[0]); rings.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x1f6fd1 }))); });
        api.root.add(rings); api.render();
        var narrow = Math.min.apply(null, P.map(function (p) { return p.size; })), ok = narrow >= 14;
        msg.innerHTML = '<p>Loft builds a smooth surface that passes through every profile, in order. ' + (ok ? 'Try a star at the top, or make the middle wider than the ends for a vase.' : '<span class="fx-warn">The narrowest profile is Ø' + narrow + ' mm: too thin to print a sturdy neck. Keep every profile at least Ø14.</span>') + '</p>';
        clearTimeout(t); t = setTimeout(function () { ctx.check(key, { p: P, ok: ok }); }, 400);
      };
      build();
      var hb = new T.Box3(new T.Vector3(-30, -30, 0), new T.Vector3(30, 30, 75)); api.setHome(hb, 1.05); api.fit(hb, { now: true, pad: 1.05 });
    });
    return box;
  };
})(window);
