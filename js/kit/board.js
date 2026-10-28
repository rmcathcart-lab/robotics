/* RL.Board — an SVG illustration of the UNO R3 and a breadboard, with parts (wires, LEDs, resistors, buttons…).
 *   RL.Board.render(opts) → { svg, parts: {id: g}, setLit(id, brightness), view(box) }
 *   RL.Board.guide(container, spec)  an animated step-by-step build guide (see the spec at the bottom)
 * Hole names: 'c12' = column c, row 12 · rails 'L+5' 'L-5' 'R+5' 'R-5' · UNO pins 'D0'…'D13', '5V', '3V3', 'GND', 'GNDd' (GND beside pin 13),
 * 'VIN', 'A0'…'A5'. The breadboard drawn here is the first 30 rows of the kit's longer board (the numbers match). */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  RL.Board = {};
  var NS = 'http://www.w3.org/2000/svg';
  var P = 16;                       // hole pitch (0.1 inch)
  var UX = 20, UY = 74, UW = 300, UH = 400; // UNO (portrait, USB at the top)
  var BX = 386, BY = 40, ROWS = 30;  // breadboard
  var COLX = { 'L+': 8, 'L-': 24, a: 66, b: 82, c: 98, d: 114, e: 130, f: 178, g: 194, h: 210, i: 226, j: 242, 'R-': 284, 'R+': 300 };
  var BW = 316, BH = 30 + (ROWS - 1) * P + 30;
  var VB = [0, 0, BX + BW + 14, BY + BH + 14];

  function s(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, str, attrs) { var t = s('text', Object.assign({ x: x, y: y }, attrs || {}), parent); t.textContent = str; return t; }

  /* UNO pin positions */
  var DIG = ['SCL', 'SDA', 'AREF', 'GNDd', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', null, 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
  var PWR = ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND2', 'VIN', null, 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  var PIN = {};
  (function () {
    var y = UY + 34; DIG.forEach(function (n) { if (!n) { y += 10; return; } PIN[n] = [UX + UW - 16, y]; y += P; });
    y = UY + 150; PWR.forEach(function (n) { if (!n) { y += 10; return; } PIN[n] = [UX + 16, y]; y += P; });
  })();
  var PINLABEL = { GNDd: 'GND', GND2: 'GND', D13: '13', D12: '12', D11: '~11', D10: '~10', D9: '~9', D8: '8', D7: '7', D6: '~6', D5: '~5', D4: '4', D3: '~3', D2: '2', D1: 'TX→1', D0: 'RX←0', '3V3': '3.3V' };

  function holeXY(name) {
    if (PIN[name]) return PIN[name].slice();
    var m = /^([LR][+-])(\d+)$/.exec(name);
    if (m) return [BX + COLX[m[1]], BY + 30 + (Number(m[2]) - 1) * P];
    m = /^([a-j])(\d+)$/.exec(name);
    if (m) return [BX + COLX[m[1]], BY + 30 + (Number(m[2]) - 1) * P];
    if (Array.isArray(name)) return name.slice();
    throw new Error('Unknown hole ' + name);
  }
  /* which holes are connected to this one (for the x-ray / hover) */
  function groupOf(name) {
    var m = /^([LR][+-])(\d+)$/.exec(name); if (m) return 'rail' + m[1];
    m = /^([a-j])(\d+)$/.exec(name); if (m) return 'row' + m[2] + ('abcde'.indexOf(m[1]) >= 0 ? 'L' : 'R');
    return 'pin' + name;
  }
  function describe(name) {
    if (PIN[name]) return 'UNO pin ' + (PINLABEL[name] || name);
    var m = /^([LR])([+-])(\d+)$/.exec(name); if (m) return (m[1] === 'L' ? 'Left' : 'Right') + ' ' + (m[2] === '+' ? '+ (power)' : '− (ground)') + ' rail · whole rail is connected';
    m = /^([a-j])(\d+)$/.exec(name); if (m) { var L = 'abcde'.indexOf(m[1]) >= 0; return 'Row ' + m[2] + ', column ' + m[1] + ' · connected to ' + (L ? 'a–e' : 'f–j') + ' in row ' + m[2]; }
    return name;
  }
  function allHoles() {
    var out = [];
    for (var r = 1; r <= ROWS; r++) { 'abcdefghij'.split('').forEach(function (c) { out.push(c + r); }); ['L+', 'L-', 'R-', 'R+'].forEach(function (c) { out.push(c + r); }); }
    return out;
  }

  /* ---------- drawing the UNO ---------- */
  function drawUno(g) {
    var u = s('g', { 'class': 'uno' }, g);
    s('rect', { x: UX, y: UY, width: UW, height: UH, rx: 6, fill: '#15497a', stroke: '#2e6aa3', 'stroke-width': 1.5 }, u);
    // silkscreen lines
    s('rect', { x: UX + 8, y: UY + 8, width: UW - 16, height: UH - 16, rx: 4, fill: 'none', stroke: '#2a679e', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, u);
    [[UX + 14, UY + UH - 14], [UX + UW - 14, UY + 70], [UX + UW - 14, UY + UH - 14], [UX + 14, UY + 70]].forEach(function (p) { s('circle', { cx: p[0], cy: p[1], r: 6, fill: '#0a1220', stroke: '#9fb3c8', 'stroke-width': 1.5 }, u); });
    // barrel jack + USB
    s('rect', { x: UX + 28, y: UY - 12, width: 58, height: 66, rx: 3, fill: '#11161d', stroke: '#2b3440' }, u);
    s('circle', { cx: UX + 57, cy: UY + 4, r: 9, fill: '#05080c' }, u);
    s('rect', { x: UX + 166, y: UY - 18, width: 74, height: 62, rx: 3, fill: '#aab6c3', stroke: '#e1e8ef', 'stroke-width': 1.5 }, u);
    s('rect', { x: UX + 180, y: UY - 18, width: 46, height: 26, rx: 2, fill: '#6b7785' }, u);
    txt(u, UX + 203, UY + 34, 'USB', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 9, fill: '#33404e', 'text-anchor': 'middle' });
    // reset button
    s('rect', { x: UX + 117, y: UY + 9, width: 22, height: 22, rx: 3, fill: '#c9d3de' }, u);
    s('circle', { cx: UX + 128, cy: UY + 20, r: 6, fill: '#c0392b' }, u);
    txt(u, UX + 128, UY + 43, 'RESET', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 7, fill: '#cfe3f5', 'text-anchor': 'middle' });
    // chip
    s('rect', { x: UX + 96, y: UY + 214, width: 40, height: 176, rx: 3, fill: '#1a1f27', stroke: '#2f3946' }, u);
    for (var i = 0; i < 14; i++) { s('rect', { x: UX + 90, y: UY + 220 + i * 12, width: 6, height: 4, fill: '#b9c4cf' }, u); s('rect', { x: UX + 136, y: UY + 220 + i * 12, width: 6, height: 4, fill: '#b9c4cf' }, u); }
    s('circle', { cx: UX + 116, cy: UY + 224, r: 3, fill: '#2f3946' }, u);
    txt(u, UX + 116, UY + 310, 'ATMEGA328P', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#8ea6bb', 'text-anchor': 'middle', transform: 'rotate(-90 ' + (UX + 116) + ' ' + (UY + 310) + ')' });
    // brand
    txt(u, UX + 196, UY + 236, 'UNO', { 'font-family': 'Chakra Petch, sans-serif', 'font-size': 38, 'font-weight': 700, fill: '#2f75b3', 'text-anchor': 'middle', transform: 'rotate(90 ' + (UX + 196) + ' ' + (UY + 236) + ')' });
    txt(u, UX + 226, UY + 236, 'R3', { 'font-family': 'Chakra Petch, sans-serif', 'font-size': 18, 'font-weight': 700, fill: '#2f75b3', 'text-anchor': 'middle', transform: 'rotate(90 ' + (UX + 226) + ' ' + (UY + 236) + ')' });
    // on-board LEDs
    var leds = { L: [UX + 248, UY + 102], TX: [UX + 248, UY + 128], RX: [UX + 248, UY + 142], ON: [UX + 236, UY + 330] };
    Object.keys(leds).forEach(function (k) {
      var p = leds[k];
      if (k === 'L') s('circle', { cx: p[0], cy: p[1], r: 16, fill: 'url(#glow-yellow)', opacity: 0, 'data-glow': 'L' }, u);
      s('rect', { x: p[0] - 5, y: p[1] - 3, width: 10, height: 6, rx: 1, fill: k === 'ON' ? '#4ade80' : '#d9b36b', 'class': 'onboard', 'data-led': k, opacity: k === 'ON' ? 1 : 0.55 }, u);
      txt(u, p[0] - 10, p[1] + 3, k, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#cfe3f5', 'text-anchor': 'end' });
    });
    // headers
    function header(names, x) {
      var ys = names.filter(Boolean).map(function (n) { return PIN[n][1]; });
      var groups = [], gcur = [];
      names.forEach(function (n) { if (!n) { if (gcur.length) groups.push(gcur); gcur = []; } else gcur.push(n); });
      if (gcur.length) groups.push(gcur);
      groups.forEach(function (gr) {
        var y0 = PIN[gr[0]][1] - 8, y1 = PIN[gr[gr.length - 1]][1] + 8;
        s('rect', { x: x - 8, y: y0, width: 16, height: y1 - y0, rx: 1.5, fill: '#0c0f14', stroke: '#2b3440' }, u);
      });
      names.filter(Boolean).forEach(function (n) { var p = PIN[n]; s('rect', { x: p[0] - 3, y: p[1] - 3, width: 6, height: 6, fill: '#4b5563', 'class': 'pinhole', 'data-hole': n }, u); });
      return ys;
    }
    header(DIG, UX + UW - 16); header(PWR, UX + 16);
    DIG.forEach(function (n) { if (!n) return; var p = PIN[n]; txt(u, p[0] - 13, p[1] + 3, PINLABEL[n] || n, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8.5, fill: '#e6f1fa', 'text-anchor': 'end' }); });
    PWR.forEach(function (n) { if (!n || n === 'NC') return; var p = PIN[n]; txt(u, p[0] + 13, p[1] + 3, PINLABEL[n] || n, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8.5, fill: '#e6f1fa' }); });
    txt(u, UX + UW - 52, UY + 200, 'DIGITAL (PWM ~)', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, 'letter-spacing': '1.5', fill: '#9fc3e6', 'text-anchor': 'middle', transform: 'rotate(90 ' + (UX + UW - 52) + ' ' + (UY + 200) + ')' });
    txt(u, UX + 64, UY + 200, 'POWER', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, 'letter-spacing': '1.5', fill: '#9fc3e6', 'text-anchor': 'middle', transform: 'rotate(-90 ' + (UX + 64) + ' ' + (UY + 200) + ')' });
    txt(u, UX + 64, UY + 356, 'ANALOG IN', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, 'letter-spacing': '1.5', fill: '#9fc3e6', 'text-anchor': 'middle', transform: 'rotate(-90 ' + (UX + 64) + ' ' + (UY + 356) + ')' });
    return u;
  }

  /* ---------- drawing the breadboard ---------- */
  function drawBreadboard(g) {
    var b = s('g', { 'class': 'bb' }, g);
    s('rect', { x: BX, y: BY, width: BW, height: BH, rx: 6, fill: '#d3dbe4', stroke: '#eef2f6', 'stroke-width': 1 }, b);
    s('rect', { x: BX + 146, y: BY + 14, width: 24, height: BH - 28, rx: 2, fill: '#bcc6d1' }, b); // centre channel
    s('rect', { x: BX + 40, y: BY + 4, width: 1, height: BH - 8, fill: '#b5c0cc' }, b);
    s('rect', { x: BX + BW - 40, y: BY + 4, width: 1, height: BH - 8, fill: '#b5c0cc' }, b);
    // rail stripes
    [['L+', '#d64545', -7], ['L-', '#2f62c9', 7], ['R-', '#2f62c9', -7], ['R+', '#d64545', 7]].forEach(function (r) {
      var x = BX + COLX[r[0]] + r[2]; s('rect', { x: x - 0.75, y: BY + 14, width: 1.5, height: BH - 28, fill: r[1], opacity: 0.85 }, b);
      txt(b, BX + COLX[r[0]], BY + 14, r[0].slice(1) === '+' ? '+' : '−', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, 'font-weight': 700, fill: r[1], 'text-anchor': 'middle' });
      txt(b, BX + COLX[r[0]], BY + BH - 6, r[0].slice(1) === '+' ? '+' : '−', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, 'font-weight': 700, fill: r[1], 'text-anchor': 'middle' });
    });
    'abcdefghij'.split('').forEach(function (c) {
      txt(b, BX + COLX[c], BY + 18, c, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 9, fill: '#5b6b7c', 'text-anchor': 'middle' });
      txt(b, BX + COLX[c], BY + BH - 8, c, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 9, fill: '#5b6b7c', 'text-anchor': 'middle' });
    });
    for (var r = 1; r <= ROWS; r++) {
      var y = BY + 30 + (r - 1) * P;
      if (r === 1 || r % 5 === 0) { txt(b, BX + 50, y + 3, String(r), { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#5b6b7c', 'text-anchor': 'middle' }); txt(b, BX + 160 + 98, y + 3, String(r), { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#5b6b7c', 'text-anchor': 'middle' }); }
    }
    var holes = s('g', { 'class': 'holes' }, b);
    allHoles().forEach(function (h) { var p = holeXY(h); s('rect', { x: p[0] - 3, y: p[1] - 3, width: 6, height: 6, rx: 0.8, fill: '#3b4756', 'data-hole': h, 'data-grp': groupOf(h) }, holes); });
    return b;
  }
  /* metal strips shown in x-ray mode */
  function drawStrips(g) {
    var x = s('g', { 'class': 'strips', opacity: 0 }, g);
    for (var r = 1; r <= ROWS; r++) {
      var y = BY + 30 + (r - 1) * P;
      s('rect', { x: BX + COLX.a - 6, y: y - 4, width: COLX.e - COLX.a + 12, height: 8, rx: 2, fill: '#c9a227', opacity: 0.75 }, x);
      s('rect', { x: BX + COLX.f - 6, y: y - 4, width: COLX.j - COLX.f + 12, height: 8, rx: 2, fill: '#c9a227', opacity: 0.75 }, x);
    }
    ['L+', 'L-', 'R-', 'R+'].forEach(function (c) { s('rect', { x: BX + COLX[c] - 4, y: BY + 24, width: 8, height: (ROWS - 1) * P + 12, rx: 2, fill: c.slice(1) === '+' ? '#e07a5f' : '#6c8ee0', opacity: 0.8 }, x); });
    return x;
  }

  /* ---------- parts ---------- */
  var WIRE = { red: '#e5484d', black: '#30363f', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e', orange: '#fb923c', white: '#e5e7eb', purple: '#a78bfa', brown: '#a16207', grey: '#9ca3af' };
  var LEDC = { red: ['#ff4d4d', '#7a1d1d'], yellow: ['#ffd23f', '#7a5d0a'], green: ['#3ee07a', '#14532d'], blue: ['#4da3ff', '#1e3a8a'], white: ['#f4f7fb', '#7b8794'] };
  var BAND = ['#111', '#7b4a12', '#d62828', '#f77f00', '#fcbf49', '#2a9d38', '#1d4ed8', '#7c3aed', '#8d99ae', '#f8f9fa'];
  function bands(ohms) { var e = 0, v = ohms; while (v >= 100) { v /= 10; e++; } v = Math.round(v); return [Math.floor(v / 10), v % 10, e]; }
  RL.resistorBands = function (ohms) { var b = bands(ohms); return [BAND[b[0]], BAND[b[1]], BAND[b[2]], '#c9a227']; };
  RL.BAND_COLOURS = BAND;

  function smoothPath(pts) {
    if (pts.length === 2) {
      var a = pts[0], b = pts[1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), bow = Math.min(40, len * 0.18);
      var nx = -dy / (len || 1), ny = dx / (len || 1);
      var c1 = [a[0] + dx * 0.25 + nx * bow, a[1] + dy * 0.25 + ny * bow], c2 = [a[0] + dx * 0.75 + nx * bow, a[1] + dy * 0.75 + ny * bow];
      return 'M' + a + ' C' + c1 + ' ' + c2 + ' ' + b;
    }
    var d = 'M' + pts[0];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var cp1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], cp2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + cp1 + ' ' + cp2 + ' ' + p2;
    }
    return d;
  }
  function drawPart(layer, id, p) {
    var g = s('g', { 'class': 'part part-' + p.type, 'data-part': id });
    if (p.type === 'wire') {
      var a = holeXY(p.from), b = holeXY(p.to), pts = [a].concat((p.via || []).map(function (v) { return v; })).concat([b]);
      var d = smoothPath(pts), col = WIRE[p.color] || p.color || WIRE.blue;
      s('path', { d: d, fill: 'none', stroke: 'rgba(0,0,0,0.45)', 'stroke-width': 7, 'stroke-linecap': 'round', 'class': 'w-under' }, g);
      s('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'class': 'w-main' }, g);
      s('path', { d: d, fill: 'none', stroke: 'rgba(255,255,255,' + (p.color === 'black' ? 0.38 : 0.28) + ')', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'class': 'w-hi', transform: 'translate(-0.8 -0.8)' }, g);
      [a, b].forEach(function (q) { s('rect', { x: q[0] - 3.5, y: q[1] - 3.5, width: 7, height: 7, rx: 1, fill: '#2a2f36', stroke: col, 'stroke-width': 1.2 }, g); });
      g._ends = [p.from, p.to];
    } else if (p.type === 'res') {
      var a2 = holeXY(p.from), b2 = holeXY(p.to), mx = (a2[0] + b2[0]) / 2, my = (a2[1] + b2[1]) / 2, ang = Math.atan2(b2[1] - a2[1], b2[0] - a2[0]) * 180 / Math.PI, L = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
      s('line', { x1: a2[0], y1: a2[1], x2: b2[0], y2: b2[1], stroke: '#b8c2cc', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g);
      var body = s('g', { transform: 'translate(' + mx + ' ' + my + ') rotate(' + ang + ')' }, g);
      var bw = Math.min(34, L - 8);
      s('rect', { x: -bw / 2, y: -5.5, width: bw, height: 11, rx: 5, fill: '#e3c99a', stroke: '#b59a6a', 'stroke-width': 0.8 }, body);
      var cols = RL.resistorBands(p.ohms || 220), xs = [-bw / 2 + 6, -bw / 2 + 11, -bw / 2 + 16, bw / 2 - 6];
      cols.forEach(function (c, i) { s('rect', { x: xs[i] - 1.6, y: -5.5, width: 3.2, height: 11, fill: c }, body); });
      [a2, b2].forEach(function (q) { s('circle', { cx: q[0], cy: q[1], r: 2.2, fill: '#9aa5b1' }, g); });
      g._ends = [p.from, p.to];
    } else if (p.type === 'led') {
      var A = holeXY(p.a), K = holeXY(p.k), cx = (A[0] + K[0]) / 2, cy = (A[1] + K[1]) / 2, c = LEDC[p.color] || LEDC.red;
      var ox = p.off ? p.off[0] : 0, oy = p.off ? p.off[1] : -16;
      cx += ox; cy += oy;
      s('path', { d: 'M' + A + ' Q' + [A[0], cy + 6] + ' ' + [cx - 3, cy + 6], fill: 'none', stroke: '#b8c2cc', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      s('path', { d: 'M' + K + ' Q' + [K[0], cy + 6] + ' ' + [cx + 3, cy + 6], fill: 'none', stroke: '#b8c2cc', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      s('circle', { cx: A[0], cy: A[1], r: 2.2, fill: '#9aa5b1' }, g); s('circle', { cx: K[0], cy: K[1], r: 2.2, fill: '#9aa5b1' }, g);
      s('circle', { cx: cx, cy: cy, r: 26, fill: 'url(#glow-' + (p.color || 'red') + ')', opacity: 0, 'class': 'led-glow' }, g);
      // dome with a flat edge on the cathode side
      var flat = K[0] >= A[0] ? 1 : -1;
      s('path', { d: 'M' + (cx + flat * 10) + ' ' + (cy - 9) + ' A13 13 0 1 ' + (flat > 0 ? 0 : 1) + ' ' + (cx + flat * 10) + ' ' + (cy + 9) + ' Z', fill: c[1], stroke: c[0], 'stroke-width': 1.5, 'class': 'led-dome' }, g);
      s('circle', { cx: cx - 4, cy: cy - 4, r: 3.5, fill: '#fff', opacity: 0.35 }, g);
      if (p.label) txt(g, cx, cy + 30, p.label, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#e6f1fa', 'text-anchor': 'middle', 'letter-spacing': '1' });
      g._dome = g.querySelector('.led-dome'); g._glow = g.querySelector('.led-glow'); g._c = c;
      g._ends = [p.a, p.k];
    } else if (p.type === 'button') {
      var m = /^([a-j])(\d+)$/.exec(p.at), r0 = Number(m[2]), legs = ['e' + r0, 'f' + r0, 'e' + (r0 + 2), 'f' + (r0 + 2)].map(holeXY);
      var bx = (legs[0][0] + legs[1][0]) / 2, by = (legs[0][1] + legs[2][1]) / 2;
      legs.forEach(function (q) { s('line', { x1: q[0], y1: q[1], x2: q[0] + (q[0] < bx ? 6 : -6), y2: q[1], stroke: '#9aa5b1', 'stroke-width': 2.5 }, g); });
      var bg = s('g', { 'class': 'btn-body' }, g);
      s('rect', { x: bx - 19, y: by - 19, width: 38, height: 38, rx: 3, fill: '#1c2129', stroke: '#4b5563', 'stroke-width': 1.2 }, bg);
      [[-13, -13], [13, -13], [-13, 13], [13, 13]].forEach(function (o) { s('circle', { cx: bx + o[0], cy: by + o[1], r: 2, fill: '#3b4350' }, bg); });
      s('circle', { cx: bx, cy: by, r: 10.5, fill: p.cap || '#2b3038', stroke: '#6b7280', 'stroke-width': 1.5, 'class': 'cap' }, bg);
      if (p.label) txt(g, bx + 26, by + 3, p.label, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#1c2733' });
      g._ends = [p.at, 'f' + r0, 'e' + (r0 + 2), 'f' + (r0 + 2)]; g._cap = g.querySelector('.cap'); g._center = [bx, by];
    } else if (p.type === 'label') {
      var q2 = holeXY(p.at);
      txt(g, q2[0] + (p.dx || 0), q2[1] + (p.dy || 0), p.text, { 'font-family': 'IBM Plex Mono, monospace', 'font-size': p.size || 9, fill: p.fill || '#cfe3f5', 'text-anchor': p.anchor || 'start', 'letter-spacing': '1' });
      g._ends = [];
    }
    layer.appendChild(g);
    return g;
  }
  function defs(svg) {
    var d = s('defs', {}, svg);
    Object.keys(LEDC).forEach(function (k) {
      var gr = s('radialGradient', { id: 'glow-' + k }, d);
      s('stop', { offset: '0%', 'stop-color': LEDC[k][0], 'stop-opacity': 0.95 }, gr);
      s('stop', { offset: '45%', 'stop-color': LEDC[k][0], 'stop-opacity': 0.35 }, gr);
      s('stop', { offset: '100%', 'stop-color': LEDC[k][0], 'stop-opacity': 0 }, gr);
    });
  }

  /* opts: { uno: true, bb: true, parts: {id: spec}, show: [ids] (default all), view: [x,y,w,h], hover: true } */
  RL.Board.render = function (opts) {
    opts = opts || {};
    var svg = s('svg', { viewBox: (opts.view || VB).join(' '), role: 'img', 'aria-label': opts.label || 'Arduino UNO and breadboard' });
    defs(svg);
    var base = s('g', {}, svg);
    if (opts.bb !== false) drawBreadboard(base);
    var strips = opts.bb !== false ? drawStrips(base) : null;
    if (opts.uno !== false) drawUno(base);
    var hl = s('g', { 'class': 'hl' }, svg);
    var comp = s('g', { 'class': 'comps' }, svg), wires = s('g', { 'class': 'wires' }, svg), fx = s('g', { 'class': 'fx' }, svg);
    var parts = {}, specs = opts.parts || {};
    var show = opts.show || Object.keys(specs);
    show.forEach(function (id) { var p = specs[id]; if (p) parts[id] = drawPart(p.type === 'wire' ? wires : comp, id, p); });
    var api = { svg: svg, parts: parts, strips: strips, fx: fx, hl: hl, specs: specs };
    api.add = function (id) { var p = specs[id]; if (!p || parts[id]) return parts[id]; parts[id] = drawPart(p.type === 'wire' ? wires : comp, id, p); return parts[id]; };
    api.remove = function (id) { if (parts[id]) { parts[id].remove(); delete parts[id]; } };
    api.setLit = function (id, v) {
      var g = parts[id]; if (!g) {
        var ob = svg.querySelector('.onboard[data-led="' + id + '"]'); if (ob) ob.setAttribute('opacity', v > 0 ? 1 : 0.35);
        if (ob) ob.setAttribute('fill', v > 0 ? '#ffb020' : '#d9b36b');
        var gl = svg.querySelector('[data-glow="' + id + '"]'); if (gl) gl.setAttribute('opacity', Math.max(0, Math.min(1, v)));
        return;
      }
      if (!g._dome) return;
      v = Math.max(0, Math.min(1, v));
      g._glow.setAttribute('opacity', v);
      g._dome.setAttribute('fill', v > 0.02 ? g._c[0] : g._c[1]);
      g._dome.setAttribute('fill-opacity', v > 0.02 ? 0.5 + v * 0.5 : 1);
    };
    api.press = function (id, on) { var g = parts[id]; if (g && g._cap) { g._cap.setAttribute('r', on ? 9 : 10.5); g._cap.setAttribute('fill', on ? '#22d3ee' : (specs[id].cap || '#2b3038')); } };
    api.xray = function (on) { if (strips) strips.setAttribute('opacity', on ? 1 : 0); };
    api.highlight = function (holes, cls) {
      hl.innerHTML = '';
      (holes || []).forEach(function (h) { var p = holeXY(h); s('rect', { x: p[0] - 5, y: p[1] - 5, width: 10, height: 10, rx: 2, fill: 'none', stroke: '#22d3ee', 'stroke-width': 2 }, hl); });
    };
    api.rings = function (holes) {
      fx.innerHTML = '';
      (holes || []).forEach(function (h, i) { var p = holeXY(h); var c = s('circle', { cx: p[0], cy: p[1], r: 9, 'class': 'ring' }, fx); c.style.animationDelay = (i * 0.15) + 's'; });
    };
    api.setView = function (box, animate) {
      var from = svg.getAttribute('viewBox').split(' ').map(Number), to = box.slice();
      if (!animate || root.matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.setAttribute('viewBox', to.join(' ')); return; }
      var t0 = performance.now(), dur = 600;
      (function step(t) { var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        svg.setAttribute('viewBox', from.map(function (f, i) { return (f + (to[i] - f) * e).toFixed(1); }).join(' ')); if (k < 1) requestAnimationFrame(step); })(t0);
    };
    if (opts.hover !== false) hover(api, opts);
    return api;
  };
  function hover(api, opts) {
    var svg = api.svg, tip = null, holes = allHoles().concat(Object.keys(PIN));
    function pt(e) { var m = svg.getScreenCTM(); if (!m) return null; var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(m.inverse()); }
    svg.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch' || e.pointerType === 'pen') move(e); });
    svg.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') move(e); });
    function move(e) {
      var p = pt(e); if (!p) return;
      var best = null, bd = 64;
      holes.forEach(function (h) { var q = holeXY(h), d = (q[0] - p.x) * (q[0] - p.x) + (q[1] - p.y) * (q[1] - p.y); if (d < bd) { bd = d; best = h; } });
      if (!best) { if (tip) { tip.remove(); tip = null; } api.highlight([]); return; }
      var grp = groupOf(best), same = holes.filter(function (h) { return groupOf(h) === grp; });
      api.highlight(same);
      var host = svg.parentNode; if (!host) return;
      if (!tip) { tip = document.createElement('div'); tip.className = 'bg-tip'; host.appendChild(tip); }
      var r = host.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px';
      tip.textContent = describe(best);
    }
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; if (tip) { tip.remove(); tip = null; } api.highlight([]); });
  }
  RL.Board.holeXY = holeXY; RL.Board.groupOf = groupOf; RL.Board.describe = describe; RL.Board.VB = VB; RL.Board.PIN = PIN;
  RL.Board.BB = [BX, BY, BW, BH]; RL.Board.UNO = [UX, UY, UW, UH];
  RL.Board.el = s;

  /* ---------- the animated build guide ----------
   * spec: { title, parts: {id: part}, base: [ids already on the board], steps: [{ title, html, add: [ids], remove: [ids], lit: {id: 0..1}, view: 'all' | [x,y,w,h] }],
   *         done: html shown after the last step, parts list per step is worked out from `add` } */
  RL.Board.guide = function (container, spec) {
    var wrap = document.createElement('div'); wrap.className = 'bg';
    var head = document.createElement('div'); head.className = 'xp-h';
    head.innerHTML = '<span class="label">Build guide</span><h3>' + RL.esc(spec.title || 'Build it') + '</h3>';
    wrap.appendChild(head);
    var body = document.createElement('div'); body.className = 'bg-body'; wrap.appendChild(body);
    var stage = document.createElement('div'); stage.className = 'bg-stage'; body.appendChild(stage);
    var side = document.createElement('div'); side.className = 'bg-side'; body.appendChild(side);
    var B = RL.Board.render({ parts: spec.parts, show: [], label: spec.title });
    stage.appendChild(B.svg);
    var zoom = document.createElement('div'); zoom.className = 'bg-zoom';
    var zb = document.createElement('button'); zb.type = 'button'; zb.className = 'btn btn-ghost'; zb.textContent = 'Whole board';
    zoom.appendChild(zb); stage.appendChild(zoom);
    var follow = true;
    zb.addEventListener('click', function () { follow = !follow; zb.textContent = follow ? 'Whole board' : 'Zoom to step'; go(idx, false, true); });
    var idx = -1, steps = spec.steps;
    var t = document.createElement('div'); t.className = 'bg-text'; side.appendChild(t);
    var ctl = document.createElement('div'); ctl.className = 'bg-ctl';
    var prev = document.createElement('button'); prev.type = 'button'; prev.className = 'btn btn-ghost btn-small'; prev.textContent = '← Back';
    var rep = document.createElement('button'); rep.type = 'button'; rep.className = 'btn btn-ghost btn-small'; rep.textContent = 'Replay';
    var next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn-primary btn-small'; next.textContent = 'Next →';
    var lab = document.createElement('span'); lab.className = 'label';
    ctl.appendChild(prev); ctl.appendChild(rep); ctl.appendChild(next); ctl.appendChild(lab); side.appendChild(ctl);
    function present(upto) { // ids on the board after step `upto`
      var on = (spec.base || []).slice();
      for (var i = 0; i <= upto; i++) { (steps[i].remove || []).forEach(function (r) { on = on.filter(function (x) { return x !== r; }); }); (steps[i].add || []).forEach(function (a) { if (on.indexOf(a) < 0) on.push(a); }); }
      return on;
    }
    function boxFor(ids) {
      var xs = [], ys = [];
      ids.forEach(function (id) { var g = B.parts[id]; if (!g) return; try { var bb = g.getBBox(); xs.push(bb.x, bb.x + bb.width); ys.push(bb.y, bb.y + bb.height); } catch (e) {} });
      if (!xs.length) return VB;
      var x0 = Math.min.apply(null, xs) - 40, x1 = Math.max.apply(null, xs) + 40, y0 = Math.min.apply(null, ys) - 40, y1 = Math.max.apply(null, ys) + 40;
      var w = Math.max(320, x1 - x0), h = Math.max(260, y1 - y0), ar = VB[2] / VB[3];
      if (w / h > ar) h = w / ar; else w = h * ar;
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      var bx = Math.max(VB[0], Math.min(VB[0] + VB[2] - w, cx - w / 2)), by = Math.max(VB[1], Math.min(VB[1] + VB[3] - h, cy - h / 2));
      if (w >= VB[2] || h >= VB[3]) return VB;
      return [bx, by, w, h];
    }
    function go(i, animate, keepParts) {
      i = Math.max(0, Math.min(steps.length - 1, i));
      var st = steps[i], on = present(i), was = Object.keys(B.parts);
      was.forEach(function (id) { if (on.indexOf(id) < 0) B.remove(id); });
      var fresh = [];
      on.forEach(function (id) { if (!B.parts[id]) { B.add(id); } });
      (st.add || []).forEach(function (id) { fresh.push(id); });
      // animate the step's new parts
      Object.keys(B.parts).forEach(function (id) { B.parts[id].classList.remove('part-new'); });
      if (animate !== false && !keepParts) fresh.forEach(function (id, k) {
        var g = B.parts[id]; if (!g) return;
        if (specIs(id, 'wire')) {
          g.querySelectorAll('path').forEach(function (p) { var L = p.getTotalLength(); p.style.setProperty('--len', L); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.style.animation = 'drawwire 0.9s ' + (0.15 + k * 0.25) + 's ease forwards'; });
        } else { g.style.animationDelay = (k * 0.2) + 's'; g.classList.add('part-new'); }
      });
      var ends = []; fresh.forEach(function (id) { var g = B.parts[id]; if (g && g._ends) ends = ends.concat(g._ends); });
      B.rings(ends);
      Object.keys(spec.parts).forEach(function (id) { if (spec.parts[id].type === 'led') B.setLit(id, 0); });
      Object.keys(st.lit || {}).forEach(function (id) { B.setLit(id, st.lit[id]); });
      var box = !follow || st.view === 'all' ? VB : Array.isArray(st.view) ? st.view : boxFor(fresh.length ? fresh : on);
      B.setView(box, animate !== false);
      t.innerHTML = '<div class="label c">Step ' + (i < 9 ? '0' : '') + (i + 1) + '</div><h3>' + RL.esc(st.title) + '</h3>' + st.html +
        (fresh.length ? '<div class="bg-parts">' + fresh.map(function (id) { var p = spec.parts[id]; return p && p.name ? '<span class="tag">' + RL.esc(p.name) + '</span>' : ''; }).join('') + '</div>' : '');
      lab.textContent = (i + 1) + ' / ' + steps.length;
      prev.disabled = i === 0; next.textContent = i === steps.length - 1 ? 'Start over' : 'Next →';
      idx = i;
      if (spec.onStep) spec.onStep(i);
    }
    function specIs(id, type) { return spec.parts[id] && spec.parts[id].type === type; }
    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx === steps.length - 1 ? 0 : idx + 1); });
    rep.addEventListener('click', function () { var i = idx; (steps[i].add || []).forEach(function (id) { B.remove(id); }); go(i); });
    container.appendChild(wrap);
    // start when it scrolls into view (so the first animation is seen)
    var started = false;
    function start() { if (started) return; started = true; go(0); }
    if (root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { start(); io.disconnect(); } }, { threshold: 0.3 }); io.observe(wrap); setTimeout(function () { if (!started && wrap.getBoundingClientRect().top < innerHeight) start(); }, 400); }
    else start();
    return { board: B, go: go };
  };
})(window);
