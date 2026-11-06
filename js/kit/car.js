/* RL.Car — the Virtual Robot Car: a top-down floor where students' real Arduino sketches drive an ELEGOO Smart Robot
 * Car V4.0 (TB6612 version). Built on RL.Sim (same editor, compiler checks and runtime), with a world instead of a circuit.
 *
 *   RL.Car.sim(container, {
 *     title, code, name, key, ctx, runHint, check(world, api) → { pass, msg }, checkAfter (ms),
 *     world: {
 *       w, h,                                   floor size in cm (default 240 × 160)
 *       start: { x, y, h },                     where the car starts; h = heading in degrees clockwise from "up" (90 = facing right)
 *       walls: [{ x, y, w, h }],                cardboard walls (solid)
 *       boxes: [{ x, y, w, h, drag, label }],   boxes (solid; drag: true lets students move them)
 *       cans:  [{ x, y, r, drag, label }],      round things (solid)
 *       lines: [{ pts: [[x, y]…], w, closed }], black electrical tape on the floor (w in cm, default 1.9)
 *       zones: [{ id, x, y, w, h, label, color }], marked areas (goal, start box…), not solid
 *       guides: [{ pts, closed }],              faint dashed paths to trace (letters, squares)
 *       grid: 10,                               grid spacing in cm (0 = none)
 *       drift: 0                                left motor slower by this fraction (real cars never drive perfectly straight)
 *     }
 *   })
 * Car pins (TB6612 shield): STBY 3 · right motors PWMA 5 + AIN1 7 · left motors PWMB 6 + BIN1 8 · RGB LED 4 (FastLED) ·
 * MODE button 2 · IR receiver 9 · servo 10 · ultrasonic Trig 13 / Echo 12 · line sensors L A2, M A1, R A0 · battery A3. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var DEG = Math.PI / 180;
  var TRACK = 14.5, SKID = 0.62, VMAX = 55, DEAD = 0.12;   // cm between wheels, skid-steer losses, cm/s at full PWM, dead zone
  var CAR_L = 25, CAR_W = 18.5;                              // outline used for bumping into things
  var SONAR_PIVOT = -9, LINE_Y = -10.5, LINE_X = 2;          // car-local positions (cm; −y is the front)
  var WHITE = 105, BLACK = 790;
  /* the car kit's remote (IRremote 4 command numbers); blanks keep the arrow keys in a cross */
  var REMOTE = [['', null], ['▲', 0x46, 'k-arrow'], ['', null], ['◀', 0x44, 'k-arrow'], ['OK', 0x40, 'k-ok'], ['▶', 0x43, 'k-arrow'], ['', null], ['▼', 0x15, 'k-arrow'], ['', null],
    ['1', 0x16], ['2', 0x19], ['3', 0x0D], ['4', 0x0C], ['5', 0x18], ['6', 0x5E], ['7', 0x08], ['8', 0x1C], ['9', 0x5A], ['*', 0x42], ['0', 0x52], ['#', 0x4A]];
  var CODES = {}; REMOTE.forEach(function (k) { if (k[1] != null) CODES[k[0]] = k[1]; });
  var COLORS = { Red: [255, 0, 0], Green: [0, 255, 0], Blue: [0, 0, 255], White: [255, 255, 255], Black: [0, 0, 0], Yellow: [255, 255, 0], Orange: [255, 165, 0],
    Purple: [128, 0, 128], Cyan: [0, 255, 255], Aqua: [0, 255, 255], Magenta: [255, 0, 255], Pink: [255, 192, 203], Violet: [238, 130, 238], Gold: [255, 215, 0],
    Teal: [0, 128, 128], Lime: [0, 255, 0], Navy: [0, 0, 128], Maroon: [128, 0, 0], DarkGreen: [0, 100, 0], HotPink: [255, 105, 180], Indigo: [75, 0, 130] };

  function S(tag, attrs, parent) { return RL.Board.el(tag, attrs, parent); }
  function T(parent, x, y, str, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 4, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toWorld(c, lx, ly) { var s = Math.sin(c.h), k = Math.cos(c.h); return [c.x + lx * k - ly * s, c.y + lx * s + ly * k]; }
  function segDist(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1) : 0, x = ax + t * dx - px, y = ay + t * dy - py; return Math.sqrt(x * x + y * y); }
  function rayBox(ox, oy, dx, dy, b) {
    var t0 = -Infinity, t1 = Infinity, lo = [b.x, b.y], hi = [b.x + b.w, b.y + b.h], o = [ox, oy], d = [dx, dy];
    for (var i = 0; i < 2; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return Infinity; } else { var a = (lo[i] - o[i]) / d[i], c = (hi[i] - o[i]) / d[i]; if (a > c) { var q = a; a = c; c = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); } }
    return t1 >= Math.max(t0, 0) ? Math.max(t0, 0) : Infinity;
  }
  function rayCircle(ox, oy, dx, dy, c) { var fx = ox - c.x, fy = oy - c.y, b = fx * dx + fy * dy, cc = fx * fx + fy * fy - c.r * c.r, disc = b * b - cc; if (disc < 0) return Infinity; var t = -b - Math.sqrt(disc); return t >= 0 ? t : (-b + Math.sqrt(disc) >= 0 ? 0 : Infinity); }
  function hsv(h, s, v) { h = (h % 256) / 256 * 6; s /= 255; v /= 255; var i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f)), r = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return { r: Math.round(r[0] * 255), g: Math.round(r[1] * 255), b: Math.round(r[2] * 255) }; }

  /* ---------- the car, drawn from above in cm, facing up, centred between the wheels ---------- */
  function art(parent, o) {
    o = o || {};
    var g = S('g', { 'class': 'car-art' }, parent);
    [[-1, -6], [1, -6], [-1, 6], [1, 6]].forEach(function (w) {
      var x = w[0] * 8.6 - 1.45, y = w[1] - 3.25;
      S('rect', { x: x, y: y, width: 2.9, height: 6.5, rx: 0.9, fill: '#1b1f24', stroke: '#3a414b', 'stroke-width': 0.3 }, g);
      for (var k = 0; k < 5; k++) S('line', { x1: x + 0.3, y1: y + 0.7 + k * 1.3, x2: x + 2.6, y2: y + 0.7 + k * 1.3, stroke: '#30363f', 'stroke-width': 0.35 }, g);
      S('rect', { x: x + 0.95, y: y + 2.3, width: 1, height: 1.9, rx: 0.3, fill: '#f2b705' }, g);
    });
    S('path', { d: 'M-6.6 -11.6 Q-6.6 -12.8 -5.2 -12.8 L5.2 -12.8 Q6.6 -12.8 6.6 -11.6 L6.8 -4 L7.2 8.4 Q7.2 11.2 4.6 11.2 L-4.6 11.2 Q-7.2 11.2 -7.2 8.4 L-6.8 -4 Z', fill: '#16191e', stroke: '#454d58', 'stroke-width': 0.35 }, g);
    S('rect', { x: -6.2, y: 2.2, width: 12.4, height: 7.4, rx: 1, fill: '#0f1216', stroke: '#2b3038', 'stroke-width': 0.3 }, g); // battery box
    S('rect', { x: -4.1, y: -3.4, width: 8.2, height: 6.2, rx: 0.5, fill: '#14507e', stroke: '#2f78b0', 'stroke-width': 0.3 }, g); // UNO + shield
    S('rect', { x: -3.4, y: -2.6, width: 2.4, height: 1.2, fill: '#0b2a44' }, g); S('rect', { x: 0.6, y: -2.7, width: 2.8, height: 1.4, fill: '#222' }, g);
    var ledGlow = S('circle', { cx: 2.2, cy: 1.6, r: 2.4, fill: '#fff', opacity: 0 }, g), led = S('circle', { cx: 2.2, cy: 1.6, r: 0.75, fill: '#e6f1fa', stroke: '#9fb3c8', 'stroke-width': 0.2 }, g);
    S('circle', { cx: 3.4, cy: 2.1, r: 0.5, fill: '#0b0d10', stroke: '#4b5563', 'stroke-width': 0.15 }, g);                         // IR receiver
    S('rect', { x: -3.9, y: 1.2, width: 1.1, height: 1.1, rx: 0.2, fill: '#cfd6dd' }, g); S('circle', { cx: -3.35, cy: 1.75, r: 0.3, fill: '#c0392b' }, g); // MODE button
    S('rect', { x: -3.9, y: -3.1, width: 1.2, height: 0.6, rx: 0.15, fill: '#f8fafc' }, g);                                         // Upload / Cam switch
    S('rect', { x: 6.1, y: 5.4, width: 0.7, height: 1.4, rx: 0.2, fill: '#cbd5e1' }, g);                                            // power switch
    S('rect', { x: -5.8, y: 5.2, width: 3.2, height: 2.2, rx: 0.4, fill: '#222831', stroke: '#3b4350', 'stroke-width': 0.2 }, g); // camera
    S('circle', { cx: -4.2, cy: 6.3, r: 0.7, fill: '#09101a', stroke: '#5b6573', 'stroke-width': 0.2 }, g);
    // line-tracking module (underneath, seen through)
    var lt = S('g', { opacity: 0.95 }, g);
    S('rect', { x: -3.6, y: LINE_Y - 1.1, width: 7.2, height: 2.2, rx: 0.4, fill: '#1d3b2a', stroke: '#3f7a57', 'stroke-width': 0.2, 'stroke-dasharray': '0.6 0.4' }, lt);
    var dots = [-1, 0, 1].map(function (i) { return S('circle', { cx: i * LINE_X, cy: LINE_Y, r: 0.65, fill: '#9fb3c8' }, lt); });
    // servo + ultrasonic sensor (turns with the servo)
    S('rect', { x: -1.6, y: SONAR_PIVOT - 1.2, width: 3.2, height: 2.6, rx: 0.4, fill: '#1f5fbf', stroke: '#3f86e8', 'stroke-width': 0.2 }, g);
    var head = S('g', {}, g);
    S('rect', { x: -4.4, y: SONAR_PIVOT - 3.6, width: 8.8, height: 1.7, rx: 0.3, fill: '#1d5fa8', stroke: '#4c8fd6', 'stroke-width': 0.2 }, head);
    [-2.2, 2.2].forEach(function (x) { S('rect', { x: x - 1.5, y: SONAR_PIVOT - 4.9, width: 3, height: 1.5, rx: 0.4, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 0.15 }, head); });
    return {
      g: g,
      servo: function (a) { head.setAttribute('transform', 'rotate(' + (90 - a).toFixed(1) + ' 0 ' + SONAR_PIVOT + ')'); },
      led: function (c) { var on = c && (c.r || c.g || c.b), col = on ? 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')' : '#e6f1fa'; led.setAttribute('fill', on ? col : '#3b4350'); ledGlow.setAttribute('fill', col); ledGlow.setAttribute('opacity', on ? 0.75 : 0); },
      line: function (vals) { dots.forEach(function (d, i) { var v = vals[i], k = clamp((v - WHITE) / (BLACK - WHITE), 0, 1); d.setAttribute('fill', k > 0.5 ? '#ff8a3d' : '#9fb3c8'); }); }
    };
  }

  /* ---------- the world ---------- */
  function World(cfg) {
    var W = this;
    cfg = Object.assign({ w: 240, h: 160, grid: 10, drift: 0, walls: [], boxes: [], cans: [], lines: [], zones: [], guides: [] }, cfg || {});
    cfg.start = Object.assign({ x: 40, y: cfg.h / 2, h: 90 }, cfg.start || {});
    W.cfg = cfg;
    var car = { x: cfg.start.x, y: cfg.start.y, h: cfg.start.h * DEG, vl: 0, vr: 0 }, home = { x: car.x, y: car.y, h: car.h };
    var servo = 90, ledC = null, rt = null, trail = [], bumps = 0, lastBump = -9, moving = 0, travelled = 0, tRun = 0, showTrail = true, flash = 0, beamCm = 0;
    var events = [];
    var solid = function () { return cfg.walls.concat(cfg.boxes); };
    var BORDER = [{ x: -50, y: -50, w: cfg.w + 100, h: 50 }, { x: -50, y: cfg.h, w: cfg.w + 100, h: 50 }, { x: -50, y: 0, w: 50, h: cfg.h }, { x: cfg.w, y: 0, w: 50, h: cfg.h }];

    function inside(px, py) {
      if (px < 0 || py < 0 || px > cfg.w || py > cfg.h) return true;
      var s = solid();
      for (var i = 0; i < s.length; i++) { var b = s[i]; if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return true; }
      for (i = 0; i < cfg.cans.length; i++) { var c = cfg.cans[i], dx = px - c.x, dy = py - c.y; if (dx * dx + dy * dy <= c.r * c.r) return true; }
      return false;
    }
    function hits(c) {
      var hw = CAR_W / 2, hl = CAR_L / 2, pts = [[-hw, -hl + 1.5], [hw, -hl + 1.5], [-hw, hl - 1], [hw, hl - 1], [0, -hl], [0, hl - 0.5], [-hw, 0], [hw, 0], [-hw / 2, -hl], [hw / 2, -hl]];
      for (var i = 0; i < pts.length; i++) { var p = toWorld(c, pts[i][0], pts[i][1]); if (inside(p[0], p[1])) return true; }
      return false;
    }
    /* ultrasonic: 5 rays across a ±8° cone from the sensor's face; returns cm (500 = nothing within 4 m) */
    W.measure = function () {
      var piv = toWorld(car, 0, SONAR_PIVOT), dir = car.h + (90 - servo) * DEG, best = Infinity;
      var ox = piv[0] + Math.sin(dir) * 3.6, oy = piv[1] - Math.cos(dir) * 3.6;
      for (var k = -2; k <= 2; k++) {
        var a = dir + k * 4 * DEG, dx = Math.sin(a), dy = -Math.cos(a), t = Infinity;
        solid().concat(BORDER).forEach(function (b) { t = Math.min(t, rayBox(ox, oy, dx, dy, b)); });
        cfg.cans.forEach(function (c) { t = Math.min(t, rayCircle(ox, oy, dx, dy, c)); });
        best = Math.min(best, t);
      }
      beamCm = best;
      return best > 400 ? 500 : Math.max(2, best + (Math.random() - 0.5) * 0.8);
    };
    /* line sensor i: 0 = right (A0), 1 = middle (A1), 2 = left (A2) */
    W.lineValue = function (i) {
      var p = toWorld(car, (1 - i) * LINE_X, LINE_Y), d = Infinity;
      cfg.lines.forEach(function (ln) {
        var pts = ln.pts, n = pts.length, half = (ln.w || 1.9) / 2, best = Infinity;
        for (var j = 0; j < n - 1 + (ln.closed ? 1 : 0); j++) { var a = pts[j], b = pts[(j + 1) % n]; best = Math.min(best, segDist(p[0], p[1], a[0], a[1], b[0], b[1])); }
        d = Math.min(d, best - half);
      });
      var k = clamp((0.6 - d) / 1.0, 0, 1);   // the sensor sees a spot about 1 cm wide, so its reading fades in over ~1 cm
      return WHITE + (BLACK - WHITE) * k + (Math.random() - 0.5) * 24;
    };
    W.setLed = function (c) { ledC = c && typeof c === 'object' ? { r: c.r | 0, g: c.g | 0, b: c.b | 0 } : null; if (W.view) W.view.art.led(ledC); };

    /* one physics step */
    function motorSpeed(pwm, dirPin) {
      if (!rt) return 0;
      var en = rt.pin(3), p = rt.pin(pwm), d = rt.pin(dirPin);
      if (!(en.mode === 'OUT' && en.v > 0.5) || p.mode !== 'OUT') return 0;
      var duty = p.v; if (duty <= DEAD) return 0;
      return (d.v > 0.5 ? 1 : -1) * VMAX * (duty - DEAD) / (1 - DEAD);
    }
    W.step = function (dt) {
      var running = !!(rt && rt.running());
      var tl = running ? motorSpeed(6, 8) * (1 - cfg.drift) : 0, tr = running ? motorSpeed(5, 7) : 0, k = Math.min(1, dt / 0.08);
      car.vl += (tl - car.vl) * k; car.vr += (tr - car.vr) * k;
      if (Math.abs(car.vl) < 0.05) car.vl = 0; if (Math.abs(car.vr) < 0.05) car.vr = 0;
      var target = rt && rt.state && rt.state.servo[10] != null ? rt.state.servo[10] : servo;
      var ds = clamp(target - servo, -420 * dt, 420 * dt); servo += ds;
      if (car.vl || car.vr) {
        var v = (car.vl + car.vr) / 2, w = (car.vl - car.vr) / TRACK * SKID;
        var n = { x: car.x + v * dt * Math.sin(car.h + w * dt / 2), y: car.y - v * dt * Math.cos(car.h + w * dt / 2), h: car.h + w * dt };
        if (hits(n)) { car.vl *= 0.2; car.vr *= 0.2; if (tRun - lastBump > 0.6) { bumps++; events.push({ t: tRun, e: 'bump' }); flash = 0.4; } lastBump = tRun; }
        else { travelled += Math.hypot(n.x - car.x, n.y - car.y); car.x = n.x; car.y = n.y; car.h = n.h; moving += dt; }
      }
      if (running) tRun += dt;
      var last = trail[trail.length - 1];
      if (!last || Math.hypot(last[0] - car.x, last[1] - car.y) > 0.6) { trail.push([car.x, car.y]); if (trail.length > 8000) trail.splice(0, 2000); }
      if (flash > 0) flash -= dt;
    };
    W.reset = function (keepTrail) { car.x = home.x; car.y = home.y; car.h = home.h; car.vl = car.vr = 0; servo = 90; if (!keepTrail) trail = [[car.x, car.y]]; bumps = 0; moving = 0; travelled = 0; tRun = 0; events = []; ledC = null; if (W.view) { W.view.art.led(null); W.draw(); } };
    W.attach = function (r) { rt = r; W.reset(); };
    W.detach = function () { rt = null; };
    W.setStart = function (x, y, hDeg) { home = { x: x, y: y, h: hDeg != null ? hDeg * DEG : home.h }; };

    /* ---- for checks ---- */
    W.pose = function () { return { x: car.x, y: car.y, h: ((car.h / DEG) % 360 + 360) % 360, vl: car.vl, vr: car.vr }; };
    W.trail = function () { return trail.slice(); };
    W.bumps = function () { return bumps; };
    W.travelled = function () { return travelled; };
    W.time = function () { return tRun; };
    W.moving = function () { return Math.abs(car.vl) > 0.5 || Math.abs(car.vr) > 0.5; };
    W.servo = function () { return servo; };
    W.led = function () { return ledC; };
    W.events = events;
    W.zone = function (id) { return cfg.zones.filter(function (z) { return z.id === id; })[0]; };
    W.inZone = function (id) { var z = W.zone(id); return !!z && car.x >= z.x && car.x <= z.x + z.w && car.y >= z.y && car.y <= z.y + z.h; };
    W.distTo = function (o) { // gap between the car's front bumper and a box / can
      var f = toWorld(car, 0, -CAR_L / 2);
      if (o.r != null) return Math.hypot(f[0] - o.x, f[1] - o.y) - o.r;
      var dx = Math.max(o.x - f[0], 0, f[0] - (o.x + o.w)), dy = Math.max(o.y - f[1], 0, f[1] - (o.y + o.h)); return Math.hypot(dx, dy);
    };
    W.onLine = function () { return W.lineValue(1) > 450 || W.lineValue(0) > 450 || W.lineValue(2) > 450; };

    /* ---------- drawing ---------- */
    W.mount = function (box) {
      var vw = cfg.w, vh = cfg.h, pad = 2;
      var wrap = RL.el('div', 'car-world'); box.appendChild(wrap);
      var svg = S('svg', { viewBox: (-pad) + ' ' + (-pad) + ' ' + (vw + 2 * pad) + ' ' + (vh + 2 * pad), role: 'img', 'aria-label': 'The virtual robot car on the floor' }); wrap.appendChild(svg);
      var defs = S('defs', {}, svg), gr = S('radialGradient', { id: 'car-beam' }, defs);
      S('stop', { offset: '0%', 'stop-color': '#22d3ee', 'stop-opacity': 0.4 }, gr); S('stop', { offset: '100%', 'stop-color': '#22d3ee', 'stop-opacity': 0.06 }, gr);
      S('rect', { x: 0, y: 0, width: vw, height: vh, fill: '#dfe5ea', rx: 1 }, svg);
      if (cfg.grid) {
        for (var x = 0; x <= vw; x += cfg.grid) S('line', { x1: x, y1: 0, x2: x, y2: vh, stroke: x % 50 ? '#cdd5dc' : '#b6c1cb', 'stroke-width': x % 50 ? 0.25 : 0.4 }, svg);
        for (var y = 0; y <= vh; y += cfg.grid) S('line', { x1: 0, y1: y, x2: vw, y2: y, stroke: y % 50 ? '#cdd5dc' : '#b6c1cb', 'stroke-width': y % 50 ? 0.25 : 0.4 }, svg);
      }
      cfg.zones.forEach(function (z) { S('rect', { x: z.x, y: z.y, width: z.w, height: z.h, fill: z.color || '#4ade80', 'fill-opacity': 0.16, stroke: z.color || '#16a34a', 'stroke-width': 0.6, 'stroke-dasharray': '2 1.4', rx: 1 }, svg); if (z.label) T(svg, z.x + z.w / 2, z.y + z.h / 2 + 1.6, z.label, { 'text-anchor': 'middle', 'font-size': 4.2, fill: z.color ? '#1f2937' : '#166534', 'font-weight': 600 }); });
      cfg.guides.forEach(function (gd) { S(gd.closed ? 'polygon' : 'polyline', { points: gd.pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#7c8a97', 'stroke-width': 0.8, 'stroke-dasharray': '2.2 1.6', 'stroke-linejoin': 'round' }, svg); });
      cfg.lines.forEach(function (ln) { S(ln.closed ? 'polygon' : 'polyline', { points: ln.pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#15181c', 'stroke-width': ln.w || 1.9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg); });
      var trailEl = S('polyline', { points: '', fill: 'none', stroke: '#ff8a3d', 'stroke-width': 0.9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.9 }, svg);
      cfg.walls.forEach(function (b) { S('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: '#b98d55', stroke: '#8a6438', 'stroke-width': 0.4 }, svg); });
      var movers = [];
      cfg.boxes.forEach(function (b) {
        var g = S('g', { 'class': b.drag ? 'car-drag' : '' }, svg), r = S('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 0.8, fill: '#c89a5e', stroke: '#8a6438', 'stroke-width': 0.5 }, g);
        S('line', { x1: b.x + 1, y1: b.y + b.h / 2, x2: b.x + b.w - 1, y2: b.y + b.h / 2, stroke: '#a77b44', 'stroke-width': 0.8 }, g);
        var lb = b.label ? T(g, b.x + b.w / 2, b.y + b.h / 2 - 1.6, b.label, { 'text-anchor': 'middle', 'font-size': 3.4, fill: '#3a2a16', 'font-weight': 600 }) : null;
        movers.push({ o: b, g: g, place: function () { r.setAttribute('x', b.x); r.setAttribute('y', b.y); g.querySelector('line').setAttribute('x1', b.x + 1); g.querySelector('line').setAttribute('x2', b.x + b.w - 1); g.querySelector('line').setAttribute('y1', b.y + b.h / 2); g.querySelector('line').setAttribute('y2', b.y + b.h / 2); if (lb) { lb.setAttribute('x', b.x + b.w / 2); lb.setAttribute('y', b.y + b.h / 2 - 1.6); } } });
      });
      cfg.cans.forEach(function (c) {
        var g = S('g', { 'class': c.drag ? 'car-drag' : '' }, svg), ci = S('circle', { cx: c.x, cy: c.y, r: c.r, fill: '#c0392b', stroke: '#7b241c', 'stroke-width': 0.5 }, g), ci2 = S('circle', { cx: c.x, cy: c.y, r: c.r * 0.6, fill: 'none', stroke: '#e6b0aa', 'stroke-width': 0.5 }, g);
        var lb = c.label ? T(g, c.x, c.y + c.r + 4.5, c.label, { 'text-anchor': 'middle', 'font-size': 3.4, fill: '#1f2937', 'font-weight': 600 }) : null;
        movers.push({ o: c, g: g, place: function () { [ci, ci2].forEach(function (e) { e.setAttribute('cx', c.x); e.setAttribute('cy', c.y); }); if (lb) { lb.setAttribute('x', c.x); lb.setAttribute('y', c.y + c.r + 4.5); } } });
      });
      var beam = S('path', { d: '', fill: 'url(#car-beam)', stroke: '#22d3ee', 'stroke-width': 0.3, 'stroke-opacity': 0.6 }, svg);
      var beamT = T(svg, 0, 0, '', { 'font-size': 3.6, fill: '#0e7490', 'font-weight': 600, 'text-anchor': 'middle' });
      var carG = S('g', { 'class': 'car-drag' }, svg), carArt = art(carG);
      var bumpT = T(svg, 0, 0, 'BUMP!', { 'font-size': 5, fill: '#dc2626', 'font-weight': 700, 'text-anchor': 'middle', opacity: 0 });
      var hud = RL.el('div', 'car-hud'); wrap.appendChild(hud);
      hud.innerHTML = '<span><i>Left</i><b data-k="l">0</b></span><span><i>Right</i><b data-k="r">0</b></span><span><i>Sonar</i><b data-k="s">–</b></span><span><i>Servo</i><b data-k="sv">90°</b></span><span><i>Line L·M·R</i><b data-k="ln">–</b></span><span><i>LED</i><b data-k="led" class="car-led"></b></span>';
      var hv = {}; hud.querySelectorAll('b').forEach(function (b) { hv[b.dataset.k] = b; });
      var tools = RL.el('div', 'car-tools'); wrap.appendChild(tools);
      var bReset = RL.el('button', 'btn btn-ghost btn-small', 'Put the car back'), bTrail = RL.el('button', 'btn btn-ghost btn-small', 'Trail: on'), bClear = RL.el('button', 'btn btn-ghost btn-small', 'Clear trail');
      [bReset, bTrail, bClear].forEach(function (b) { b.type = 'button'; tools.appendChild(b); });
      var tip = RL.el('span', 'small muted', (cfg.boxes.concat(cfg.cans).some(function (o) { return o.drag; }) ? 'Drag the car or the boxes to set things up. ' : 'Drag the car to move its start. ') + 'Shift-drag the car to turn it.'); tools.appendChild(tip);
      bReset.addEventListener('click', function () { W.reset(); });
      bTrail.addEventListener('click', function () { showTrail = !showTrail; bTrail.textContent = 'Trail: ' + (showTrail ? 'on' : 'off'); trailEl.style.display = showTrail ? '' : 'none'; });
      bClear.addEventListener('click', function () { trail = [[car.x, car.y]]; W.draw(); });
      W.view = { svg: svg, art: carArt };
      W.draw = function () {
        carG.setAttribute('transform', 'translate(' + car.x.toFixed(2) + ' ' + car.y.toFixed(2) + ') rotate(' + (car.h / DEG).toFixed(2) + ')');
        carArt.servo(servo);
        var lv = [W.lineValue(2), W.lineValue(1), W.lineValue(0)]; carArt.line([lv[2], lv[1], lv[0]]);
        if (showTrail) trailEl.setAttribute('points', trail.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
        // sonar beam
        W.measure(); var piv = toWorld(car, 0, SONAR_PIVOT), dir = car.h + (90 - servo) * DEG, ox = piv[0] + Math.sin(dir) * 3.6, oy = piv[1] - Math.cos(dir) * 3.6, L = Math.min(beamCm, 400), sp = 8 * DEG;
        var p1 = [ox + Math.sin(dir - sp) * L, oy - Math.cos(dir - sp) * L], p2 = [ox + Math.sin(dir + sp) * L, oy - Math.cos(dir + sp) * L];
        beam.setAttribute('d', 'M' + ox.toFixed(1) + ' ' + oy.toFixed(1) + ' L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z');
        var sonarOn = !!(rt && rt.pin(13).mode === 'OUT'); beam.style.display = sonarOn ? '' : 'none'; beamT.style.display = sonarOn && beamCm < 400 ? '' : 'none';
        var lx = ox + Math.sin(dir) * Math.min(L, 400) * 0.55, ly = oy - Math.cos(dir) * Math.min(L, 400) * 0.55; beamT.setAttribute('x', lx.toFixed(1)); beamT.setAttribute('y', (ly - 1.5).toFixed(1)); beamT.textContent = Math.round(beamCm) + ' cm';
        bumpT.setAttribute('x', car.x.toFixed(1)); bumpT.setAttribute('y', (car.y - 16).toFixed(1)); bumpT.setAttribute('opacity', flash > 0 ? 1 : 0);
        var pw = function (pin) { var p = rt ? rt.pin(pin) : null; return p && p.mode === 'OUT' ? Math.round(p.v * 255) : 0; }, dirS = function (pin) { var p = rt ? rt.pin(pin) : null; return p && p.v > 0.5 ? '' : '−'; };
        hv.l.textContent = rt && (car.vl || pw(6)) ? dirS(8) + pw(6) : '0'; hv.r.textContent = rt && (car.vr || pw(5)) ? dirS(7) + pw(5) : '0';
        hv.s.textContent = sonarOn ? (beamCm > 400 ? 'none' : Math.round(beamCm) + ' cm') : '–'; hv.sv.textContent = Math.round(servo) + '°';
        hv.ln.textContent = lv.map(function (v) { return Math.round(v); }).join(' · ');
        hv.led.style.background = ledC && (ledC.r || ledC.g || ledC.b) ? 'rgb(' + ledC.r + ',' + ledC.g + ',' + ledC.b + ')' : 'transparent';
      };
      // dragging
      function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
      var drag = null;
      carG.addEventListener('pointerdown', function (e) { if (rt && rt.running()) return; e.preventDefault(); var p = pt(e); drag = { car: true, dx: car.x - p.x, dy: car.y - p.y, rot: e.shiftKey, a0: Math.atan2(p.y - car.y, p.x - car.x), h0: car.h }; carG.setPointerCapture(e.pointerId); });
      movers.forEach(function (m) { if (!m.o.drag) return; m.g.addEventListener('pointerdown', function (e) { e.preventDefault(); var p = pt(e); drag = { m: m, dx: m.o.x - p.x, dy: m.o.y - p.y }; m.g.setPointerCapture(e.pointerId); }); });
      svg.addEventListener('pointermove', function (e) {
        if (!drag) return; var p = pt(e);
        if (drag.car) { if (drag.rot) car.h = drag.h0 + Math.atan2(p.y - car.y, p.x - car.x) - drag.a0; else { car.x = clamp(p.x + drag.dx, 10, cfg.w - 10); car.y = clamp(p.y + drag.dy, 10, cfg.h - 10); } home = { x: car.x, y: car.y, h: car.h }; trail = [[car.x, car.y]]; }
        else { var o = drag.m.o; o.x = clamp(p.x + drag.dx, 0, cfg.w - (o.w || 0)); o.y = clamp(p.y + drag.dy, 0, cfg.h - (o.h || 0)); drag.m.place(); }
        W.draw();
      });
      svg.addEventListener('pointerup', function () { drag = null; }); svg.addEventListener('pointercancel', function () { drag = null; });
      // physics runs on a fast timer in small steps (so a 630 ms turn is 630 ms, not "whenever the next frame came");
      // drawing runs once per animation frame. Both stop when the widget leaves the page.
      var last = performance.now(), alive = true, seen = false;
      var iv = setInterval(function () {
        var on = document.body.contains(wrap); if (on) seen = true; else if (seen) { alive = false; clearInterval(iv); return; }
        var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        while (dt > 1e-6) { var st = Math.min(dt, 0.004); W.step(st); dt -= st; }
      }, 4);
      (function frame() { if (!alive) return; W.draw(); requestAnimationFrame(frame); })();
      if (RL.onLeave) RL.onLeave(function () { alive = false; clearInterval(iv); });
      W.draw();
    };
  }

  /* ---------- FastLED, as much as the car needs ---------- */
  function fastled(world) {
    function CRGB(r, g, b) { return { r: clamp(r | 0, 0, 255), g: clamp(g | 0, 0, 255), b: clamp(b | 0, 0, 255) }; }
    Object.keys(COLORS).forEach(function (k) { var c = COLORS[k]; CRGB[k] = { r: c[0], g: c[1], b: c[2] }; });
    var leds = null, bright = 255;
    function out(c) { world.setLed(bright > 0 && c && typeof c === 'object' ? c : null); }   // shown at full colour (brightness only matters on the real LED)
    return {
      CRGB: CRGB, CHSV: function (h, s, v) { return hsv(h, s, v); },
      NEOPIXEL: 0, WS2812: 0, WS2812B: 0, WS2811: 0, GRB: 0, RGB: 0, BRG: 0,
      FastLED: {
        addLeds: function (arr) { leds = arr; return { setCorrection: function () {} }; },
        show: function () { out(leds && leds[0]); },
        setBrightness: function (b) { bright = clamp(Number(b) || 0, 0, 255); },
        clear: function (show) { if (leds) for (var i = 0; i < leds.length; i++) leds[i] = CRGB(0, 0, 0); if (show) out(null); },
        showColor: function (c) { out(c); }
      }
    };
  }
  function prep(src) { return src.replace(/FastLED\.addLeds\s*<[^<>()]*>\s*\(/g, 'FastLED.addLeds(').replace(/CRGB::(\w+)/g, 'CRGB.$1').replace(/CHSV::\w+/g, '0'); }

  RL.Car = {
    REMOTE: REMOTE, CODES: CODES, art: art, World: World,
    PINS: { STBY: 3, PWMA: 5, AIN1: 7, PWMB: 6, BIN1: 8, LED: 4, KEY: 2, IR: 9, SERVO: 10, TRIG: 13, ECHO: 12, LINE_L: 'A2', LINE_M: 'A1', LINE_R: 'A0', VOLT: 'A3' },
    sim: function (container, o) {
      var world = new World(o.world || {});
      var analog = {};
      [0, 1, 2].forEach(function (i) { analog[i] = { hidden: true, noise: false }; Object.defineProperty(analog[i], 'value', { get: function () { return world.lineValue(i); }, set: function () {} }); });
      analog[3] = { hidden: true, value: 205 };
      var sonar = { trig: 13, echo: 12, hidden: true }; Object.defineProperty(sonar, 'cm', { get: function () { return world.measure(); }, set: function () {} });
      var api = RL.Sim.create(container, {
        label: 'Virtual robot car', stack: o.stack, title: o.title, code: o.code, name: o.name, key: o.key, ctx: o.ctx,
        runHint: o.runHint || 'watch the car on the floor.',
        world: world, analog: analog, sonar: sonar, servos: { 10: 'servo' }, ir: o.remote ? { pin: 9, keys: REMOTE } : null,
        pushButtons: [{ pin: 2, label: 'Hold the MODE button' }],
        extraApi: function () { return fastled(world); }, prep: prep,
        onStart: function (rt) { world.attach(rt); }, onStop: function () { world.detach(); },
        checkAfter: o.checkAfter || 6000,
        check: o.check ? function (log, sapi) { return o.check(world, sapi, log); } : null
      });
      api.world = world;
      return api;
    }
  };
})(window);
