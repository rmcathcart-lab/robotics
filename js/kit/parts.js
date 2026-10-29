/* More parts for RL.Board: every component in the ELEGOO Super Starter Kit.
 * Breadboard parts give hole names (like the LED): rgb, pot, ldr, therm, tilt, buzzer, chip.
 * Modules sit beside the breadboard (at: [x, y], use a wider vb such as RL.Board.WIDE) with their pins on the left edge,
 * so wires can be drawn to 'partId.PIN' (e.g. 'dht.S'): servo, dht, sonar, joystick, ir, relay, stepper, dcmotor, seg1,
 * seg4. The LCD plugs into the breadboard (at: 'j3' = its pin 1) and shows its screen beside the board. psu = the
 * power-supply module on the top of the breadboard.
 * Each part exposes setters the Virtual UNO uses (g._setRGB, g._setValue, g._sound, g._setAngle, g._setText …). */
(function (root) {
  'use strict';
  var RL = root.RL, Bd = RL.Board, P = 16;
  var MONO = 'IBM Plex Mono, monospace';
  var BB = Bd.BB, RIGHT = BB[0] + BB[2]; // right edge of the breadboard
  Bd.WIDE = [0, 0, RIGHT + 300, BB[1] + BB[3] + 14];
  function lbl(t, g, x, y, str, a) { return t(g, x, y, str, Object.assign({ 'font-family': MONO, 'font-size': 8, fill: '#e6f1fa' }, a || {})); }
  function legs(c, g, pts, w) { pts.forEach(function (q) { c.s('circle', { cx: q[0], cy: q[1], r: 2.2, fill: '#9aa5b1' }, g); }); }
  function lead(c, g, a, b, col) { c.s('path', { d: 'M' + a + ' L' + b, stroke: col || '#b8c2cc', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' }, g); }
  function hole(name) { return Bd.holeXY(name); }
  function rowOf(name) { return Number(/(\d+)$/.exec(name)[1]); }
  function colOf(name) { return /^([a-j])/.exec(name)[1]; }
  /* module: pins on the left edge, top to bottom */
  function modPins(p, names, top) { var o = {}; names.forEach(function (n, i) { o[n] = [p.at[0] - 10, p.at[1] + (top || 16) + i * P]; }); return o; }
  function header(c, g, p, names, top, labels) {
    names.forEach(function (n, i) {
      var y = p.at[1] + (top || 16) + i * P;
      c.s('rect', { x: p.at[0] - 12, y: y - 2, width: 14, height: 4, fill: '#c9b458' }, g);
      c.s('rect', { x: p.at[0] - 2, y: y - 6, width: 8, height: 12, fill: '#111' }, g);
      lbl(c.txt, g, p.at[0] + 10, y + 3, (labels && labels[i]) || n, { 'font-size': 7.5 });
    });
  }
  function pcb(c, g, p, w, h, col) { return c.s('rect', { x: p.at[0], y: p.at[1], width: w, height: h, rx: 4, fill: col || '#1d5fa8', stroke: '#2e74c3', 'stroke-width': 1.2 }, g); }

  /* ---------- RGB LED (common cathode): legs in 4 rows of one column: R, − (longest), G, B ---------- */
  Bd.part('rgb', {
    pins: function (p) { var c = colOf(p.at), r = rowOf(p.at); return { R: hole(c + r), GND: hole(c + (r + 1)), G: hole(c + (r + 2)), B: hole(c + (r + 3)) }; },
    draw: function (g, p, c) {
      var pins = this.pins(p), xs = pins.R[0], cx = xs + (p.side === 'left' ? -26 : 26), cy = (pins.R[1] + pins.B[1]) / 2;
      ['R', 'GND', 'G', 'B'].forEach(function (k) { lead(c, g, pins[k], [cx + (p.side === 'left' ? 8 : -8), cy + (pins[k][1] - cy) * 0.35]); });
      legs(c, g, [pins.R, pins.GND, pins.G, pins.B]);
      g._glow = c.s('circle', { cx: cx, cy: cy, r: 30, fill: '#fff', opacity: 0, style: 'filter:blur(6px)' }, g);
      g._dome = c.s('circle', { cx: cx, cy: cy, r: 15, fill: '#d9e1ea', 'fill-opacity': 0.75, stroke: '#f4f7fb', 'stroke-width': 1.5 }, g);
      c.s('circle', { cx: cx - 5, cy: cy - 5, r: 4, fill: '#fff', opacity: 0.4 }, g);
      if (p.labels !== false) ['R', '−', 'G', 'B'].forEach(function (k, i) { var q = pins[['R', 'GND', 'G', 'B'][i]]; lbl(c.txt, g, q[0] + (p.side === 'left' ? 8 : -8), q[1] - 4, k, { 'font-size': 7, fill: '#1c2733', 'text-anchor': p.side === 'left' ? 'start' : 'end' }); });
      g._setRGB = function (r, gg, b) {
        var m = Math.max(r, gg, b);
        var col = 'rgb(' + Math.round(255 * Math.min(1, r * 1.1)) + ',' + Math.round(255 * Math.min(1, gg * 1.1)) + ',' + Math.round(255 * Math.min(1, b * 1.1)) + ')';
        g._dome.setAttribute('fill', m > 0.02 ? col : '#d9e1ea'); g._glow.setAttribute('fill', col); g._glow.setAttribute('opacity', Math.min(0.9, m));
      };
    }
  });

  /* ---------- potentiometer: 3 legs 2 rows apart in one column (left, wiper, right) ---------- */
  Bd.part('pot', {
    pins: function (p) { var c = colOf(p.at), r = rowOf(p.at); return { L: hole(c + r), W: hole(c + (r + 2)), R: hole(c + (r + 4)) }; },
    draw: function (g, p, c) {
      var pins = this.pins(p), dx = p.side === 'right' ? 34 : -34, cx = pins.W[0] + dx, cy = pins.W[1];
      [pins.L, pins.W, pins.R].forEach(function (q) { lead(c, g, q, [cx - dx * 0.5, q[1]]); });
      legs(c, g, [pins.L, pins.W, pins.R]);
      c.s('rect', { x: cx - 24, y: cy - 30, width: 48, height: 60, rx: 4, fill: '#1e5aa8', stroke: '#2e74c3' }, g);
      c.s('circle', { cx: cx, cy: cy, r: 18, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 1.5 }, g);
      g._knob = c.s('line', { x1: cx, y1: cy, x2: cx, y2: cy - 16, stroke: '#e6f1fa', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      lbl(c.txt, g, cx, cy + 40, p.label || '10 kΩ', { 'text-anchor': 'middle', fill: '#1c2733' });
      g._setValue = function (v) { var a = -135 + 270 * (v / 1023); g._knob.setAttribute('transform', 'rotate(' + a + ' ' + cx + ' ' + cy + ')'); };
      g._setValue(p.value != null ? p.value : 512);
    }
  });

  /* ---------- two-leg parts: photoresistor, thermistor, tilt switch ---------- */
  function twoLeg(type, body) {
    Bd.part(type, {
      pins: function (p) { return { A: hole(p.from), B: hole(p.to) }; },
      draw: function (g, p, c) {
        var a = hole(p.from), b = hole(p.to), mx = (a[0] + b[0]) / 2 + (p.off ? p.off[0] : 0), my = (a[1] + b[1]) / 2 + (p.off ? p.off[1] : 0);
        lead(c, g, a, [mx, my]); lead(c, g, b, [mx, my]); legs(c, g, [a, b]);
        body(g, p, c, mx, my, Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI);
      }
    });
  }
  twoLeg('ldr', function (g, p, c, x, y) {
    c.s('circle', { cx: x, cy: y, r: 11, fill: '#d97a2b', stroke: '#f0a35e', 'stroke-width': 1.2 }, g);
    c.s('path', { d: 'M' + (x - 7) + ' ' + (y - 5) + ' h12 v3 h-12 v3 h12 v3 h-12', stroke: '#7a3b0c', 'stroke-width': 1.3, fill: 'none' }, g);
    g._shade = c.s('circle', { cx: x, cy: y, r: 13, fill: '#000', opacity: 0 }, g);
    g._setValue = function (v) { g._shade.setAttribute('opacity', 0.55 * (1 - v / 1023)); };
  });
  twoLeg('therm', function (g, p, c, x, y) {
    c.s('ellipse', { cx: x, cy: y, rx: 7, ry: 9, fill: '#1c1f24', stroke: '#4b5563' }, g);
    lbl(c.txt, g, x + 11, y + 3, p.label || 'THERMISTOR', { 'font-size': 7, fill: '#1c2733' });
  });
  twoLeg('tilt', function (g, p, c, x, y, ang) {
    var b = c.s('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + (ang - 90) + ')' }, g);
    c.s('rect', { x: -6, y: -14, width: 12, height: 22, rx: 3, fill: '#1c1f24', stroke: '#4b5563' }, b);
    g._ball = c.s('circle', { cx: 0, cy: 3, r: 3.5, fill: '#c0c6cc' }, b);
    g._tilt = function (on) { g._ball.setAttribute('cy', on ? -8 : 3); };
  });

  /* ---------- buzzer: + leg (a) and − leg (k), like an LED. variant: 'active' (sticker) or 'passive' (green board) ---------- */
  Bd.part('buzzer', {
    pins: function (p) { return { P: hole(p.a), N: hole(p.k) }; },
    draw: function (g, p, c) {
      var a = hole(p.a), k = hole(p.k), x = (a[0] + k[0]) / 2 + (p.off ? p.off[0] : 0), y = (a[1] + k[1]) / 2 + (p.off ? p.off[1] : -4);
      lead(c, g, a, [x - 4, y]); lead(c, g, k, [x + 4, y]); legs(c, g, [a, k]);
      g._waves = c.s('g', { opacity: 0 }, g);
      [24, 31, 38].forEach(function (r) { c.s('path', { d: 'M' + (x + r * 0.7) + ' ' + (y - r * 0.7) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x + r * 0.7) + ' ' + (y + r * 0.7), stroke: '#22d3ee', 'stroke-width': 2, fill: 'none' }, g._waves); });
      c.s('circle', { cx: x, cy: y, r: 19, fill: p.variant === 'passive' ? '#1f6b3a' : '#16191e', stroke: '#4b5563', 'stroke-width': 1.5 }, g);
      if (p.variant === 'passive') c.s('circle', { cx: x, cy: y, r: 13, fill: '#16191e' }, g);
      else c.s('circle', { cx: x, cy: y, r: 9, fill: '#f4f7fb', opacity: 0.85 }, g);
      c.s('circle', { cx: x, cy: y, r: 3, fill: '#0b0d10' }, g);
      lbl(c.txt, g, x - 13, y - 9, '+', { 'font-size': 10, fill: '#ff6b6b', 'font-weight': 700 });
      if (p.label) lbl(c.txt, g, x, y + 31, p.label, { 'text-anchor': 'middle', fill: '#1c2733' });
      g._sound = function (on) { g._waves.setAttribute('opacity', on ? 1 : 0); };
    }
  });

  /* ---------- DIP chip straddling the centre gap: at = 'e<row>' (pin 1). pins 1..n/2 down column e, the rest up column f ---------- */
  Bd.part('chip', {
    pins: function (p) { var r = rowOf(p.at), n = p.pins || 16, h = n / 2, o = {}; for (var i = 1; i <= n; i++) o[i] = i <= h ? hole('e' + (r + i - 1)) : hole('f' + (r + n - i)); return o; },
    draw: function (g, p, c) {
      var pins = this.pins(p), n = p.pins || 16, x0 = pins[1][0] + 4, x1 = pins[n][0] - 4, y0 = pins[1][1] - 10, y1 = pins[n / 2][1] + 10;
      for (var i = 1; i <= n; i++) { var q = pins[i]; c.s('rect', { x: q[0] - 3, y: q[1] - 2.5, width: 7, height: 5, fill: '#c0c6cc' }, g); }
      c.s('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 2, fill: '#1a1d22', stroke: '#3b4350' }, g);
      c.s('path', { d: 'M' + ((x0 + x1) / 2 - 6) + ' ' + y0 + ' a6 6 0 0 0 12 0', fill: '#3b4350' }, g);
      c.s('circle', { cx: x0 + 6, cy: y0 + 8, r: 2.2, fill: '#3b4350' }, g);
      c.txt(g, (x0 + x1) / 2, (y0 + y1) / 2, p.label || 'CHIP', { 'font-family': MONO, 'font-size': 9, fill: '#c9d3de', 'text-anchor': 'middle', transform: 'rotate(90 ' + ((x0 + x1) / 2) + ' ' + ((y0 + y1) / 2) + ')', 'letter-spacing': '1' });
      if (p.pinNames) for (var j = 1; j <= n; j++) { var q2 = pins[j], left = j <= n / 2; lbl(c.txt, g, q2[0] + (left ? -6 : 6), q2[1] + 3, p.pinNames[j - 1], { 'font-size': 6.5, fill: '#1c2733', 'text-anchor': left ? 'end' : 'start' }); }
    }
  });

  /* ---------- LCD1602: pins 1–16 in one column (at = pin 1), screen drawn beside the breadboard ---------- */
  var LCDN = ['VSS', 'VDD', 'V0', 'RS', 'RW', 'E', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'A', 'K'];
  Bd.part('lcd', {
    pins: function (p) { var c = colOf(p.at), r = rowOf(p.at), o = {}; LCDN.forEach(function (n, i) { o[n] = hole(c + (r + i)); o[i + 1] = o[n]; }); return o; },
    draw: function (g, p, c) {
      var pins = this.pins(p), x = pins.VSS[0], y0 = pins.VSS[1] - 8, y1 = pins.K[1] + 8, sx = RIGHT + 24, sy = (y0 + y1) / 2 - 62;
      c.s('rect', { x: x - 5, y: y0, width: 10, height: y1 - y0, fill: '#111', opacity: 0.9 }, g);
      LCDN.forEach(function (n) { var q = pins[n]; c.s('rect', { x: q[0] - 2.5, y: q[1] - 2.5, width: 5, height: 5, fill: '#c9b458' }, g); lbl(c.txt, g, q[0] - 7, q[1] + 3, n, { 'font-size': 6.5, fill: '#1c2733', 'text-anchor': 'end' }); });
      c.s('path', { d: 'M' + (x + 5) + ' ' + y0 + ' L' + sx + ' ' + (sy + 20) + ' M' + (x + 5) + ' ' + y1 + ' L' + sx + ' ' + (sy + 104), stroke: '#2e74c3', 'stroke-width': 1, 'stroke-dasharray': '3 4', fill: 'none' }, g);
      c.s('rect', { x: sx, y: sy, width: 262, height: 124, rx: 6, fill: '#1d6b3a', stroke: '#2f8f50' }, g);
      c.s('rect', { x: sx + 12, y: sy + 22, width: 238, height: 80, rx: 3, fill: '#0c1a2e', stroke: '#33475e' }, g);
      c.s('rect', { x: sx + 20, y: sy + 30, width: 222, height: 64, fill: '#2563eb' }, g);
      lbl(c.txt, g, sx + 131, sy + 15, 'LCD1602 · PIN 1 ←', { 'text-anchor': 'middle', 'font-size': 8, fill: '#cfe3f5' });
      var cells = [];
      for (var r = 0; r < 2; r++) { cells.push([]); for (var i = 0; i < 16; i++) { c.s('rect', { x: sx + 24 + i * 13.5, y: sy + 36 + r * 28, width: 12, height: 22, fill: '#3b78f0', opacity: 0.55 }, g); cells[r].push(c.txt(g, sx + 30 + i * 13.5, sy + 53 + r * 28, '', { 'font-family': MONO, 'font-size': 16, fill: '#f4f7fb', 'text-anchor': 'middle' })); } }
      g._setText = function (lines) { for (var r = 0; r < 2; r++) { var L = String(lines[r] || ''); for (var i = 0; i < 16; i++) cells[r][i].textContent = L[i] && L[i] !== ' ' ? L[i] : ''; } };
    }
  });

  /* ---------- power supply module on the top of the breadboard ---------- */
  Bd.part('psu', {
    under: false,
    draw: function (g, p, c) {
      var x = BB[0] - 6, y = BB[1] - 30;
      c.s('rect', { x: x, y: y, width: BB[2] + 12, height: 62, rx: 4, fill: '#16191e', stroke: '#3b4350' }, g);
      c.s('rect', { x: x + BB[2] / 2 - 26, y: y - 16, width: 52, height: 40, rx: 3, fill: '#0b0d10', stroke: '#3b4350' }, g);
      c.s('rect', { x: x + BB[2] / 2 + 34, y: y + 8, width: 26, height: 20, rx: 2, fill: '#c0c6cc' }, g);
      [[x + 18, '5V'], [x + BB[2] - 30, '5V']].forEach(function (j) { c.s('rect', { x: j[0], y: y + 16, width: 22, height: 14, rx: 2, fill: '#facc15' }, g); lbl(c.txt, g, j[0] + 11, y + 44, j[1], { 'text-anchor': 'middle', fill: '#facc15', 'font-size': 9 }); });
      g._led = c.s('circle', { cx: x + 80, cy: y + 22, r: 3.5, fill: '#4ade80' }, g);
      lbl(c.txt, g, x + BB[2] / 2, y + 54, 'POWER SUPPLY MODULE · 9V IN', { 'text-anchor': 'middle', fill: '#8ea6bb' });
      g._ends = [];
    }
  });

  /* ---------- modules beside the breadboard ---------- */
  Bd.part('servo', {
    pins: function (p) { return { GND: [p.at[0] - 30, p.at[1] + 30], V: [p.at[0] - 30, p.at[1] + 46], S: [p.at[0] - 30, p.at[1] + 62] }; },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1], pins = this.pins(p);
      [['GND', '#7b4a12'], ['V', '#e5484d'], ['S', '#fb923c']].forEach(function (w, i) { c.s('path', { d: 'M' + (x + 2) + ' ' + (y + 70 + i * 3) + ' C ' + (x - 10) + ' ' + (y + 70) + ', ' + (x - 6) + ' ' + pins[w[0]][1] + ', ' + (pins[w[0]][0] + 8) + ' ' + pins[w[0]][1], stroke: w[1], 'stroke-width': 3, fill: 'none' }, g); });
      c.s('rect', { x: pins.GND[0] - 2, y: pins.GND[1] - 8, width: 12, height: 48, rx: 2, fill: '#111' }, g);
      ['GND', 'V', 'S'].forEach(function (k, i) { lbl(c.txt, g, pins.GND[0] - 6, pins[k][1] + 3, ['−', '+', 'S'][i], { 'text-anchor': 'end', 'font-size': 8 }); });
      c.s('rect', { x: x, y: y + 20, width: 64, height: 110, rx: 4, fill: '#2563eb', stroke: '#3b82f6' }, g);
      c.s('rect', { x: x - 10, y: y + 40, width: 84, height: 10, rx: 2, fill: '#1d4ed8' }, g);
      lbl(c.txt, g, x + 32, y + 116, 'SG90', { 'text-anchor': 'middle', 'font-size': 10, 'letter-spacing': '1' });
      var hx = x + 32, hy = y + 40;
      g._horn = c.s('g', {}, g);
      c.s('path', { d: 'M' + (hx - 6) + ' ' + hy + ' L' + (hx - 3) + ' ' + (hy - 52) + ' L' + (hx + 3) + ' ' + (hy - 52) + ' L' + (hx + 6) + ' ' + hy + ' Z', fill: '#f4f7fb', stroke: '#c9d3de' }, g._horn);
      c.s('circle', { cx: hx, cy: hy, r: 9, fill: '#f4f7fb', stroke: '#c9d3de' }, g._horn);
      c.s('circle', { cx: hx, cy: hy, r: 3, fill: '#9aa5b1' }, g);
      g._angleText = lbl(c.txt, g, x + 32, y + 146, '90°', { 'text-anchor': 'middle', 'font-size': 10, fill: '#22d3ee' });
      g._setAngle = function (a) { a = Math.max(0, Math.min(180, a)); g._horn.setAttribute('transform', 'rotate(' + (a - 90) + ' ' + hx + ' ' + hy + ')'); g._angleText.textContent = Math.round(a) + '°'; };
      g._setAngle(p.angle != null ? p.angle : 90);
    }
  });
  Bd.part('dht', {
    pins: function (p) { return modPins(p, ['S', 'V', 'G'], 22); },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 56, 76, '#1d5fa8');
      header(c, g, p, ['S', 'V', 'G'], 22, ['S', '+', '−']);
      c.s('rect', { x: x + 18, y: y + 6, width: 32, height: 46, rx: 3, fill: '#4aa3f0', stroke: '#9fd0fa' }, g);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) c.s('rect', { x: x + 22 + j * 9, y: y + 11 + i * 10, width: 6, height: 6, fill: '#1d5fa8' }, g);
      lbl(c.txt, g, x + 34, y + 68, 'DHT11', { 'text-anchor': 'middle' });
    }
  });
  Bd.part('sonar', {
    pins: function (p) { return modPins(p, ['VCC', 'TRIG', 'ECHO', 'GND'], 46); },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 70, 150, '#1d5fa8');
      header(c, g, p, ['VCC', 'TRIG', 'ECHO', 'GND'], 46, ['Vcc', 'Trig', 'Echo', 'Gnd']);
      [32, 118].forEach(function (cy) { c.s('circle', { cx: x + 44, cy: y + cy, r: 21, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, g); c.s('circle', { cx: x + 44, cy: y + cy, r: 14, fill: '#3b4350' }, g); });
      lbl(c.txt, g, x + 44, y + 148, 'HC-SR04', { 'text-anchor': 'middle', 'font-size': 6.5 });
      g._wave = c.s('g', { opacity: 0 }, g);
      [30, 48, 66].forEach(function (r) { c.s('path', { d: 'M' + (x + 70 + r * 0.3) + ' ' + (y + 75 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x + 70 + r * 0.3) + ' ' + (y + 75 + r), stroke: '#22d3ee', 'stroke-width': 2, fill: 'none' }, g._wave); });
      var t = null; g._ping = function () { g._wave.setAttribute('opacity', 1); clearTimeout(t); t = setTimeout(function () { g._wave.setAttribute('opacity', 0); }, 120); };
    }
  });
  Bd.part('joystick', {
    pins: function (p) { return modPins(p, ['GND', 'V', 'X', 'Y', 'SW'], 16); },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 96, 100, '#16191e');
      header(c, g, p, ['GND', 'V', 'X', 'Y', 'SW'], 16, ['GND', '+5V', 'VRx', 'VRy', 'SW']);
      var cx = x + 62, cy = y + 50;
      c.s('rect', { x: cx - 26, y: cy - 26, width: 52, height: 52, rx: 4, fill: '#2b3038' }, g);
      g._knob = c.s('circle', { cx: cx, cy: cy, r: 16, fill: '#3b4350', stroke: '#6b7280', 'stroke-width': 2 }, g);
      g._setStick = function (vx, vy, down) { g._knob.setAttribute('cx', cx + (vx - 512) / 512 * 14); g._knob.setAttribute('cy', cy + (vy - 512) / 512 * 14); g._knob.setAttribute('fill', down ? '#22d3ee' : '#3b4350'); };
    }
  });
  Bd.part('ir', {
    pins: function (p) { return modPins(p, ['S', 'V', 'G'], 14); },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 52, 58, '#16191e');
      header(c, g, p, ['S', 'V', 'G'], 14, ['S', '+', '−']);
      c.s('rect', { x: x + 26, y: y + 10, width: 20, height: 26, rx: 3, fill: '#0b0d10' }, g);
      c.s('circle', { cx: x + 36, cy: y + 22, r: 7, fill: '#2b3038' }, g);
      g._led = c.s('circle', { cx: x + 36, cy: y + 48, r: 3, fill: '#5b1d1d' }, g);
      var t = null; g._blink = function () { g._led.setAttribute('fill', '#ff4d4d'); clearTimeout(t); t = setTimeout(function () { g._led.setAttribute('fill', '#5b1d1d'); }, 150); };
    }
  });
  Bd.part('relay', {
    pins: function (p) { var o = modPins(p, ['S', 'V', 'G'], 30); o.NO = [p.at[0] + 92, p.at[1] + 24]; o.COM = [p.at[0] + 92, p.at[1] + 52]; o.NC = [p.at[0] + 92, p.at[1] + 80]; return o; },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 84, 104, '#1d5fa8');
      header(c, g, p, ['S', 'V', 'G'], 30, ['S', '+', '−']);
      c.s('rect', { x: x + 20, y: y + 12, width: 40, height: 58, rx: 3, fill: '#2563eb', stroke: '#93c5fd' }, g);
      lbl(c.txt, g, x + 40, y + 44, 'RELAY', { 'text-anchor': 'middle', 'font-size': 7 });
      ['NO', 'COM', 'NC'].forEach(function (k, i) { c.s('rect', { x: x + 64, y: y + 16 + i * 28, width: 18, height: 18, rx: 2, fill: '#2a7de1', stroke: '#93c5fd' }, g); c.s('circle', { cx: x + 73, cy: y + 25 + i * 28, r: 4, fill: '#c0c6cc' }, g); lbl(c.txt, g, x + 73, y + 13 + i * 28, k, { 'text-anchor': 'middle', 'font-size': 6.5 }); });
      g._led = c.s('circle', { cx: x + 12, cy: y + 92, r: 3.5, fill: '#5b1d1d' }, g);
      g._arm = c.s('line', { x1: x + 30, y1: y + 60, x2: x + 50, y2: y + 52, stroke: '#facc15', 'stroke-width': 2 }, g);
      g._click = function (on) { g._led.setAttribute('fill', on ? '#ff4d4d' : '#5b1d1d'); g._arm.setAttribute('y2', on ? y + 22 : y + 52); };
    }
  });
  Bd.part('stepper', {
    pins: function (p) { return modPins(p, ['IN1', 'IN2', 'IN3', 'IN4', 'GND', 'VCC'], 16); },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1];
      pcb(c, g, p, 92, 112, '#1f7a3e');
      header(c, g, p, ['IN1', 'IN2', 'IN3', 'IN4', 'GND', 'VCC'], 16, ['IN1', 'IN2', 'IN3', 'IN4', '−', '+']);
      c.s('rect', { x: x + 42, y: y + 22, width: 26, height: 56, rx: 2, fill: '#1a1d22' }, g);
      lbl(c.txt, g, x + 55, y + 50, 'ULN2003', { 'text-anchor': 'middle', 'font-size': 6, transform: 'rotate(90 ' + (x + 55) + ' ' + (y + 50) + ')' });
      g._leds = ['A', 'B', 'C', 'D'].map(function (k, i) { lbl(c.txt, g, x + 80, y + 20 + i * 18, k, { 'font-size': 6.5, 'text-anchor': 'middle' }); return c.s('circle', { cx: x + 80, cy: y + 28 + i * 18, r: 3.5, fill: '#5b1d1d' }, g); });
      // motor (28BYJ-48) above the driver
      var mx = x + 46, my = y - 70;
      c.s('path', { d: 'M' + (x + 60) + ' ' + (y + 4) + ' C ' + (x + 60) + ' ' + (y - 20) + ', ' + (mx + 30) + ' ' + (my + 40) + ', ' + (mx + 20) + ' ' + (my + 30), stroke: '#e5e7eb', 'stroke-width': 5, fill: 'none' }, g);
      c.s('circle', { cx: mx, cy: my, r: 38, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, g);
      c.s('rect', { x: mx - 30, y: my + 18, width: 60, height: 24, rx: 3, fill: '#2563eb' }, g);
      g._shaft = c.s('g', {}, g);
      c.s('circle', { cx: mx, cy: my - 8, r: 14, fill: '#f4f7fb', stroke: '#9aa5b1' }, g._shaft);
      c.s('rect', { x: mx - 2, y: my - 30, width: 4, height: 22, fill: '#facc15' }, g._shaft);
      lbl(c.txt, g, mx, my + 34, '28BYJ-48', { 'text-anchor': 'middle', 'font-size': 7 });
      var ang = 0;
      g._step = function (n, total) { ang += 360 * n / (total || 2048); g._shaft.setAttribute('transform', 'rotate(' + ang + ' ' + mx + ' ' + (my - 8) + ')'); };
      g._coils = function (bits) { g._leds.forEach(function (l, i) { l.setAttribute('fill', bits[i] ? '#ff4d4d' : '#5b1d1d'); }); };
    }
  });
  Bd.part('dcmotor', {
    pins: function (p) { return { A: [p.at[0] - 10, p.at[1] + 40], B: [p.at[0] - 10, p.at[1] + 56] }; },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1], pins = this.pins(p);
      lead(c, g, pins.A, [x + 14, y + 44], '#e5484d'); lead(c, g, pins.B, [x + 14, y + 52], '#30363f');
      c.s('rect', { x: x + 10, y: y + 26, width: 70, height: 44, rx: 18, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, g);
      c.s('rect', { x: x + 80, y: y + 44, width: 14, height: 8, fill: '#9aa5b1' }, g);
      var fx = x + 112, fy = y + 48;
      g._fan = c.s('g', {}, g);
      for (var i = 0; i < 3; i++) c.s('ellipse', { cx: fx, cy: fy - 26, rx: 11, ry: 26, fill: '#fcd34d', opacity: 0.9, transform: 'rotate(' + (i * 120) + ' ' + fx + ' ' + fy + ')' }, g._fan);
      c.s('circle', { cx: fx, cy: fy, r: 6, fill: '#f59e0b' }, g);
      lbl(c.txt, g, x + 45, y + 86, p.label || 'DC MOTOR', { 'text-anchor': 'middle' });
      var ang = 0, spd = 0, raf = null, last = 0;
      function tick(t) { var dt = last ? (t - last) / 1000 : 0; last = t; ang += spd * 1080 * dt; g._fan.setAttribute('transform', 'rotate(' + ang + ' ' + fx + ' ' + fy + ')'); raf = spd ? requestAnimationFrame(tick) : null; if (!raf) last = 0; }
      g._spin = function (s) { spd = s; if (spd && !raf) raf = requestAnimationFrame(tick); };
    }
  });
  /* 7-segment displays (common cathode), pins listed in their physical order with what each one does */
  var SEG1 = [['1', 'E'], ['2', 'D'], ['3', 'COM'], ['4', 'C'], ['5', 'DP'], ['6', 'B'], ['7', 'A'], ['8', 'COM'], ['9', 'F'], ['10', 'G']];
  var SEG4 = [['1', 'E'], ['2', 'D'], ['3', 'DP'], ['4', 'C'], ['5', 'G'], ['6', 'D4'], ['7', 'B'], ['8', 'D3'], ['9', 'D2'], ['10', 'F'], ['11', 'A'], ['12', 'D1']];
  function digit(c, g, x, y, s) { // returns 8 segment elements a b c d e f g dp
    var w = 24, h = 44, t = 5, segs = [
      [x + t, y, w - 2 * t, t], [x + w - t, y + t, t, h / 2 - t], [x + w - t, y + h / 2, t, h / 2 - t], [x + t, y + h - t, w - 2 * t, t],
      [x, y + h / 2, t, h / 2 - t], [x, y + t, t, h / 2 - t], [x + t, y + h / 2 - t / 2, w - 2 * t, t]];
    var out = segs.map(function (r) { return c.s('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 1.5, fill: '#3a1010' }, g); });
    out.push(c.s('circle', { cx: x + w + 5, cy: y + h - 2, r: 2.5, fill: '#3a1010' }, g));
    return out;
  }
  function segPart(type, map, digits) {
    Bd.part(type, {
      pins: function (p) { var o = {}; map.forEach(function (m, i) { var q = [p.at[0] - 10, p.at[1] + 14 + i * P]; o[m[0]] = q; if (!o[m[1]]) o[m[1]] = q; }); return o; },
      draw: function (g, p, c) {
        var x = p.at[0], y = p.at[1], H = 14 + map.length * P;
        c.s('rect', { x: x, y: y, width: 34 + digits * 38, height: H, rx: 4, fill: '#16191e', stroke: '#3b4350' }, g);
        map.forEach(function (m, i) { var yy = y + 14 + i * P; c.s('rect', { x: x - 12, y: yy - 2, width: 14, height: 4, fill: '#c0c6cc' }, g); lbl(c.txt, g, x + 6, yy + 3, m[0] + ' ' + m[1], { 'font-size': 7 }); });
        g._digits = [];
        for (var d = 0; d < digits; d++) g._digits.push(digit(c, g, x + 52 + d * 38, y + H / 2 - 22));
        g._setDigit = function (i, bits) { var D = g._digits[i]; if (!D) return; for (var k = 0; k < 8; k++) D[k].setAttribute('fill', (bits >> k) & 1 ? '#ff3b3b' : '#3a1010'); };
      }
    });
  }
  segPart('seg1', SEG1, 1); segPart('seg4', SEG4, 4);
  Bd.SEG4_PINS = SEG4; Bd.SEG1_PINS = SEG1;
})(window);
