/* Mission 09: Reaction timer — the guide.
 * Part A: a 74HC595 shift register (DS ← pin 8, ST_CP ← pin 9, SH_CP ← pin 10) drives an 8-LED light bar.
 * Part B: the 595's outputs drive the segments of the 4-digit 7-segment display (digits D1–D4 on pins 2–5, LOW = on),
 * plus two player buttons (pins 6 and 7, INPUT_PULLUP) and an active buzzer (pin 12) for a two-player reaction game.
 * Circuit parts are shared below so the build guides and the Virtual UNOs always match. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function P(parent, x, y, str, a) { return T(parent, x, y, str, Object.assign({ 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 13 }, a || {})); }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', BG = '#070d17', LINE = '#9fb3c8', PANEL = '#0e1826';
  var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72', SEG_ON = '#ff3b3b', SEG_OFF = '#3a1010';
  var DIG = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
  function hex(v) { return '0x' + ('0' + v.toString(16).toUpperCase()).slice(-2); }
  function bin(v) { return ('00000000' + v.toString(2)).slice(-8); }

  function defs(svg) { var d = svg.querySelector('defs'); if (!d) { d = S('defs', {}, null); svg.insertBefore(d, svg.firstChild); } return d; }
  function glowDefs(svg) {
    var d = defs(svg);
    [['red', '#ff4d4d'], ['cyan', CY], ['orange', SIG], ['green', GO], ['yellow', '#ffd23f']].forEach(function (c) {
      if (d.querySelector('#m9g-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm9g-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  function arrowDefs(svg) {
    var d = defs(svg);
    [['c', CY], ['o', SIG], ['l', LINE], ['g', GO]].forEach(function (c) {
      if (d.querySelector('#m9a-' + c[0])) return;
      var m = S('marker', { id: 'm9a-' + c[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, d);
      S('path', { d: 'M0 0 L10 5 L0 10 z', fill: c[1] }, m);
    });
  }
  function bg(svg, w, h) { S('rect', { x: 0, y: 0, width: w, height: h, fill: BG }, svg); }
  function grid(svg, w, h) { for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, opacity: 0.35 }, svg); for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, opacity: 0.35 }, svg); }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  function minus(list, drop) { return list.filter(function (x) { return drop.indexOf(x) < 0; }); }

  /* a wire route with rounded corners: corner points in, dense via points out (so the board's smooth curve follows it) */
  function route(pts, r) {
    r = r || 8; var out = [];
    function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    function seg(a, b) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 14)); for (var i = 1; i < n; i++) out.push(lerp(a, b, i / n)); }
    var prev = pts[0];
    for (var i = 1; i < pts.length - 1; i++) {
      var c = pts[i], a = pts[i - 1], b = pts[i + 1];
      var la = Math.hypot(c[0] - a[0], c[1] - a[1]), lb = Math.hypot(b[0] - c[0], b[1] - c[1]), rr = Math.min(r, la / 2, lb / 2);
      var p1 = lerp(c, a, rr / la), p2 = lerp(c, b, rr / lb);
      seg(prev, p1); out.push(p1);
      for (var k = 1; k < 4; k++) { var t = k / 4, q = [(1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0], (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]]; out.push(q); }
      out.push(p2); prev = p2;
    }
    seg(prev, pts[pts.length - 1]);
    return out.map(function (q) { return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; });
  }
  /* a big 7-segment digit: returns [a,b,c,d,e,f,g,dp] shape elements and set(bits) */
  function bigDigit(parent, x, y, w, h, t, opts) {
    opts = opts || {}; var gap = t * 0.35, g = S('g', {}, parent);
    function hseg(x0, x1, yy) { x0 += gap; x1 -= gap; return S('polygon', { points: [[x0, yy], [x0 + t / 2, yy - t / 2], [x1 - t / 2, yy - t / 2], [x1, yy], [x1 - t / 2, yy + t / 2], [x0 + t / 2, yy + t / 2]].join(' ') }, g); }
    function vseg(xx, y0, y1) { y0 += gap; y1 -= gap; return S('polygon', { points: [[xx, y0], [xx + t / 2, y0 + t / 2], [xx + t / 2, y1 - t / 2], [xx, y1], [xx - t / 2, y1 - t / 2], [xx - t / 2, y0 + t / 2]].join(' ') }, g); }
    var segs = [hseg(x, x + w, y), vseg(x + w, y, y + h / 2), vseg(x + w, y + h / 2, y + h), hseg(x, x + w, y + h), vseg(x, y + h / 2, y + h), vseg(x, y, y + h / 2), hseg(x, x + w, y + h / 2)];
    segs.push(S('circle', { cx: x + w + t * 1.3, cy: y + h + t * 0.2, r: t * 0.55 }, g));
    var on = opts.on || SEG_ON, off = opts.off || SEG_OFF;
    function set(bits, dim) { segs.forEach(function (s, i) { var lit = (bits >> i) & 1; s.setAttribute('fill', lit ? on : off); s.setAttribute('opacity', lit && dim != null ? dim : 1); }); }
    set(0);
    return { segs: segs, set: set, g: g };
  }

  /* ================= custom parts ================= */
  /* a player's press pad (the kit's push button under a big cardboard target), pins G and S on the left */
  B.part('m09-pad', {
    pins: function (p) { return { G: [p.at[0] - 10, p.at[1] + 22], S: [p.at[0] - 10, p.at[1] + 38] }; },
    draw: function (g, p, c) {
      var x = p.at[0], y = p.at[1], pins = this.pins(p);
      ['G', 'S'].forEach(function (k) { var q = pins[k]; c.s('rect', { x: q[0] - 2, y: q[1] - 2, width: 14, height: 4, fill: '#c0c6cc' }, g); c.txt(g, x + 8, q[1] + 3, k === 'G' ? '−' : 'S', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#3a2a16' }); });
      c.s('rect', { x: x, y: y, width: 104, height: 76, rx: 5, fill: CB, stroke: CBD, 'stroke-width': 1.5 }, g);
      c.s('rect', { x: x + 34, y: y + 12, width: 52, height: 52, rx: 4, fill: '#1c2129', stroke: '#4b5563' }, g);
      g._cap = c.s('circle', { cx: x + 60, cy: y + 38, r: 21, fill: p.cap || '#e5484d', stroke: '#111', 'stroke-width': 1.5, 'class': 'cap' }, g);
      c.txt(g, x + 60, y + 72, p.label || 'PLAYER', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 7.5, fill: '#3a2a16', 'text-anchor': 'middle', 'letter-spacing': '1' });
      var col = p.cap || '#e5484d';
      g._tilt = function (on) { g._cap.setAttribute('r', on ? 18 : 21); g._cap.setAttribute('fill', on ? '#22d3ee' : col); };
    }
  });

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var PIN595 = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'GND', 'Q7′', 'MR', 'SHCP', 'STCP', 'OE', 'DS', 'Q0', 'VCC'];
  var CHIP = {
    sr: { type: 'chip', at: 'e3', pins: 16, label: '74HC595', pinNames: PIN595, name: '74HC595 chip (notch up)' },
    svcc: { type: 'wire', from: 'j3', to: 'R+3', color: 'red', name: 'Red jumper: VCC (pin 16) → + rail' },
    smr: { type: 'wire', from: 'j9', to: 'R+9', color: 'red', name: 'Red jumper: MR (pin 10) → + rail' },
    soe: { type: 'wire', from: 'j6', to: 'R-6', color: 'black', name: 'Black jumper: OE (pin 13) → − rail' },
    sgnd: { type: 'wire', from: 'a10', to: 'L-10', color: 'black', name: 'Black jumper: GND (pin 8) → − rail' },
    wds: { type: 'wire', from: 'D8', to: 'h5', color: 'blue', via: [[352, 250], [452, 104], [560, 102]], name: 'Wire: pin 8 → DS (h5)' },
    wst: { type: 'wire', from: 'D9', to: 'h7', color: 'green', via: [[360, 234], [470, 150], [560, 152]], name: 'Wire: pin 9 → ST_CP latch (h7)' },
    wsh: { type: 'wire', from: 'D10', to: 'h8', color: 'yellow', via: [[368, 218], [480, 178], [560, 176]], name: 'Wire: pin 10 → SH_CP clock (h8)' }
  };
  // LED bar: Q7 at the top (row 12) down to Q0 at the bottom (row 26), each with its own 220 Ω resistor
  var BAR = {}, LED_IDS = [], BARCOL = ['green', 'green', 'green', 'yellow', 'yellow', 'yellow', 'red', 'red'];
  function rowOf(k) { return 26 - 2 * k; }
  for (var k = 0; k < 8; k++) {
    var r = rowOf(k);
    var hy = function (row) { return 70 + (row - 1) * 16; };
    BAR['q' + k] = k === 0
      ? { type: 'wire', from: 'g4', to: 'a26', color: 'white', via: route([[580, 118], [580, 50], [418, 50], [418, hy(26)], [452, hy(26)]], 10), name: 'White wire: Q0 (g4) → a26' }
      : { type: 'wire', from: 'c' + (k + 2), to: 'a' + r, color: ['', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey', 'brown'][k], via: route([[484, hy(k + 2)], [419 + k * 4, hy(k + 2)], [419 + k * 4, hy(r)], [452, hy(r)]], 7), name: 'Wire: Q' + k + ' (c' + (k + 2) + ') → a' + r };
    BAR['r' + k] = { type: 'res', from: 'e' + r, to: 'f' + r, ohms: 220, name: '220 Ω resistor' };
    BAR['l' + k] = { type: 'led', a: 'j' + r, k: 'R-' + r, color: BARCOL[k], name: BARCOL[k][0].toUpperCase() + BARCOL[k].slice(1) + ' LED (Q' + k + ')' };
    BAR['t' + k] = { type: 'label', at: 'R+' + r, dx: 10, dy: 3, text: 'Q' + k, size: 9, fill: '#8ea6bb' };
    LED_IDS.push('l' + k);
  }
  // Part B: the display, the buttons and the buzzer beside the board (wider view)
  var VB9 = [0, 0, B.BB[0] + B.BB[2] + 300, B.BB[1] + B.BB[3] + 64];
  var SEGNAME = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
  var SEGCOL = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white', 'grey'];
  function bus(pinY, laneL, yB, laneR, ty) { return route([[304, pinY], [laneL, pinY], [laneL, yB], [laneR, yB], [laneR, ty], [780, ty]], 8); }
  var DISP = { seg: { type: 'seg4', at: [790, 316], name: '4-digit 7-segment display' } };
  for (k = 0; k < 8; k++) DISP['g' + k] = { type: 'wire', from: 'j' + rowOf(k), to: 'seg.' + SEGNAME[k], color: SEGCOL[k], name: 'Wire: Q' + k + ' row (j' + rowOf(k) + ') → segment ' + SEGNAME[k].toLowerCase(), _seg: 1 };
  var UNOY = { 2: 358, 3: 342, 4: 326, 5: 310, 6: 294, 7: 278 };
  var LANE_L = { 7: 376, 6: 368, 5: 360, 4: 352, 3: 344, 2: 336 }, LANE_Y = { 7: 574, 6: 582, 5: 590, 4: 598, 3: 606, 2: 614 }, LANE_R = { 7: 712, 6: 720, 5: 728, 4: 736, 3: 744, 2: 752 };
  var SEGPIN_Y = function (n) { return 316 + 14 + (n - 1) * 16; };
  [[2, 'D1', 12], [3, 'D2', 9], [4, 'D3', 8], [5, 'D4', 6]].forEach(function (d) {
    DISP['d' + d[0]] = { type: 'wire', from: 'D' + d[0], to: 'seg.' + d[1], color: ['', '', 'blue', 'green', 'yellow', 'orange'][d[0]], via: bus(UNOY[d[0]], LANE_L[d[0]], LANE_Y[d[0]], LANE_R[d[0]], SEGPIN_Y(d[2])), name: 'Wire: pin ' + d[0] + ' → digit ' + d[1] + ' (display pin ' + d[2] + ')' };
  });
  var GAME = {
    p2: { type: 'm09-pad', at: [790, 98], label: 'PLAYER 2', cap: '#3b82f6', name: 'Player 2 button (on its press pad)' },
    p1: { type: 'm09-pad', at: [790, 202], label: 'PLAYER 1', cap: '#e5484d', name: 'Player 1 button (on its press pad)' },
    w7: { type: 'wire', from: 'D7', to: 'p2.S', color: 'blue', via: bus(UNOY[7], LANE_L[7], LANE_Y[7], LANE_R[7], 136), name: 'Wire: pin 7 → player 2 button' },
    w6: { type: 'wire', from: 'D6', to: 'p1.S', color: 'red', via: bus(UNOY[6], LANE_L[6], LANE_Y[6], LANE_R[6], 240), name: 'Wire: pin 6 → player 1 button' },
    pg2: { type: 'wire', from: 'p2.G', to: 'R-5', color: 'black', via: [[740, 118]], name: 'Black wire: player 2 button → − rail' },
    pg1: { type: 'wire', from: 'p1.G', to: 'R-13', color: 'black', via: [[700, 228]], name: 'Black wire: player 1 button → − rail' },
    bz: { type: 'buzzer', a: [796, 62], k: [846, 62], variant: 'active', name: 'Active buzzer (sticker on top)' },
    wbz: { type: 'wire', from: 'D12', to: 'bz.P', color: 'orange', via: route([[304, 188], [380, 188], [380, 14], [796, 14], [796, 62]], 10), name: 'Wire: pin 12 → buzzer +' },
    gbz: { type: 'wire', from: 'bz.N', to: 'R-2', color: 'black', via: [[856, 84], [820, 92], [700, 90]], name: 'Black wire: buzzer − → − rail' }
  };
  var PARTS_A = merge(POWER, CHIP, BAR);
  var IDS_A = Object.keys(PARTS_A);
  var PARTS_B = merge(POWER, CHIP, BAR, DISP, GAME);
  var LABEL_IDS = Object.keys(BAR).filter(function (id) { return id[0] === 't'; });
  var IDS_DISP = minus(IDS_A, LED_IDS.concat(LABEL_IDS)).concat(Object.keys(DISP));
  var IDS_GAME = IDS_DISP.concat(Object.keys(GAME));
  var VIEW_A = [232, 26, 486, 540];
  var VIEW_B = [280, 0, VB9[2] - 280, VB9[3]];
  var SHIFT_A = { data: 8, clock: 10, latch: 9, leds: LED_IDS };
  var SHIFT_B = { data: 8, clock: 10, latch: 9 };
  var SEG4 = { part: 'seg', digits: [2, 3, 4, 5] };

  /* ================= code ================= */
  var BARCODE = [
    '// Mission 09, part A: patterns on the LED bar',
    '',
    'const int DATA_PIN = 8;    // 74HC595 pin 14 (DS)',
    'const int LATCH_PIN = 9;   // 74HC595 pin 12 (ST_CP)',
    'const int CLOCK_PIN = 10;  // 74HC595 pin 11 (SH_CP)',
    '',
    '// send one byte to the shift register: each bit lights one LED',
    'void show(byte pattern) {',
    '  digitalWrite(LATCH_PIN, LOW);                      // get ready',
    '  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);  // 8 clock ticks',
    '  digitalWrite(LATCH_PIN, HIGH);                     // copy to the outputs',
    '}',
    '',
    'void setup() {',
    '  pinMode(DATA_PIN, OUTPUT);',
    '  pinMode(LATCH_PIN, OUTPUT);',
    '  pinMode(CLOCK_PIN, OUTPUT);',
    '}',
    '',
    'void loop() {',
    '  // 1. flash every other LED',
    '  for (int i = 0; i < 4; i++) {',
    '    show(0b10101010);',
    '    delay(250);',
    '    show(0b01010101);',
    '    delay(250);',
    '  }',
    '',
    '  // 2. a "get ready" bar that fills up from the top, one LED at a time',
    '  byte bar = 0;',
    '  for (int i = 7; i >= 0; i--) {',
    '    bar = bar | (1 << i);    // switch on bit i, keep the others',
    '    show(bar);',
    '    delay(300);',
    '  }',
    '  delay(500);',
    '',
    '  // 3. YOUR TURN: a Knight Rider sweep. One LED runs down the bar',
    '  //    and back up again. Use show(1 << i) inside two for loops.',
    '',
    '}'].join('\n');
  var COUNT = [
    '// Mission 09: count in binary on the LED bar',
    '',
    'const int DATA_PIN = 8;',
    'const int LATCH_PIN = 9;',
    'const int CLOCK_PIN = 10;',
    '',
    'byte count = 0;   // a byte holds 0 to 255: exactly 8 bits',
    '',
    'void show(byte pattern) {',
    '  digitalWrite(LATCH_PIN, LOW);',
    '  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);',
    '  digitalWrite(LATCH_PIN, HIGH);',
    '}',
    '',
    'void setup() {',
    '  pinMode(DATA_PIN, OUTPUT);',
    '  pinMode(LATCH_PIN, OUTPUT);',
    '  pinMode(CLOCK_PIN, OUTPUT);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  show(count);',
    '  Serial.print(count);',
    '  Serial.print(" = ");',
    '  Serial.println(count, BIN);   // print it in binary too',
    '  count = (count + 1) % 256;    // after 255 comes 0 again',
    '  delay(300);',
    '}'].join('\n');
  var ONE = [
    '// Mission 09, part B: count 0 to 9 on the first digit',
    '',
    'const int DATA_PIN = 8;',
    'const int LATCH_PIN = 9;',
    'const int CLOCK_PIN = 10;',
    'const int DIGIT_PINS[4] = {2, 3, 4, 5};   // D1 to D4: LOW = on',
    '',
    '// which segments make each number (bit 0 = a ... bit 6 = g, bit 7 = dp)',
    'const byte DIGITS[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66,',
    '                         0x6D, 0x7D, 0x07, 0x7F, 0x6F};',
    '',
    'void show(byte pattern) {',
    '  digitalWrite(LATCH_PIN, LOW);',
    '  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);',
    '  digitalWrite(LATCH_PIN, HIGH);',
    '}',
    '',
    'void setup() {',
    '  pinMode(DATA_PIN, OUTPUT);',
    '  pinMode(LATCH_PIN, OUTPUT);',
    '  pinMode(CLOCK_PIN, OUTPUT);',
    '  for (int i = 0; i < 4; i++) {',
    '    pinMode(DIGIT_PINS[i], OUTPUT);',
    '    digitalWrite(DIGIT_PINS[i], HIGH);   // HIGH = digit off',
    '  }',
    '  digitalWrite(DIGIT_PINS[0], LOW);      // switch on digit 1 only',
    '}',
    '',
    'void loop() {',
    '  for (int n = 0; n < 10; n++) {',
    '    show(DIGITS[n]);',
    '    delay(500);',
    '  }',
    '}'].join('\n');
  var MULTI = [
    '// Mission 09, part B: a 4-digit counter (multiplexing)',
    '',
    'const int DATA_PIN = 8;',
    'const int LATCH_PIN = 9;',
    'const int CLOCK_PIN = 10;',
    'const int DIGIT_PINS[4] = {2, 3, 4, 5};',
    'const byte DIGITS[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66,',
    '                         0x6D, 0x7D, 0x07, 0x7F, 0x6F};',
    '',
    'byte screen[4];               // the pattern for each digit',
    'int current = 0;              // the digit that is lit right now',
    'int count = 0;',
    'unsigned long lastCount = 0;',
    '',
    'void show(byte pattern) {',
    '  digitalWrite(LATCH_PIN, LOW);',
    '  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);',
    '  digitalWrite(LATCH_PIN, HIGH);',
    '}',
    '',
    '// split a number into 4 digits and store their patterns',
    'void showNumber(int n) {',
    '  screen[3] = DIGITS[n % 10];          // ones',
    '  // YOUR TURN: the tens, hundreds and thousands go in screen[2], [1] and [0]',
    '',
    '}',
    '',
    '// light the next digit (call this over and over, very fast)',
    'void showNextDigit() {',
    '  digitalWrite(DIGIT_PINS[current], HIGH);  // switch off the digit that was on',
    '  current = (current + 1) % 4;              // move to the next digit',
    '  show(screen[current]);                    // send its pattern',
    '  digitalWrite(DIGIT_PINS[current], LOW);   // switch it on',
    '}',
    '',
    'void setup() {',
    '  pinMode(DATA_PIN, OUTPUT);',
    '  pinMode(LATCH_PIN, OUTPUT);',
    '  pinMode(CLOCK_PIN, OUTPUT);',
    '  for (int i = 0; i < 4; i++) {',
    '    pinMode(DIGIT_PINS[i], OUTPUT);',
    '    digitalWrite(DIGIT_PINS[i], HIGH);',
    '  }',
    '}',
    '',
    'void loop() {',
    '  if (millis() - lastCount >= 100) {   // every 100 ms, count up',
    '    lastCount = millis();',
    '    count = (count + 1) % 10000;',
    '    showNumber(count);',
    '  }',
    '  showNextDigit();',
    '  delay(3);                            // each digit glows for 3 ms',
    '}'].join('\n');
  var GAMECODE = [
    '/*',
    '  Mission 09: Reaction timer',
    '  Two players, one button each. Press either button to start a round,',
    '  then wait for the beep. The first to press after the beep wins.',
    '  Press before the beep and you lose: false start!',
    '  The display shows the winner (with a dot) and their time in ms.',
    '*/',
    '',
    'const int DATA_PIN = 8;      // 74HC595 DS',
    'const int LATCH_PIN = 9;     // 74HC595 ST_CP',
    'const int CLOCK_PIN = 10;    // 74HC595 SH_CP',
    'const int DIGIT_PINS[4] = {2, 3, 4, 5};   // D1 to D4 (LOW = on)',
    'const int P1_BUTTON = 6;',
    'const int P2_BUTTON = 7;',
    'const int BUZZER = 12;',
    '',
    '// segment patterns: bit 0 = a ... bit 6 = g, bit 7 = dp',
    'const byte DIGITS[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66,',
    '                         0x6D, 0x7D, 0x07, 0x7F, 0x6F};',
    'const byte BLANK = 0x00;',
    'const byte DASH = 0x40;',
    'const byte DOT = 0x80;',
    'const byte LETTER_F = 0x71;',
    'const byte LETTER_S = 0x6D;',
    'const byte LETTER_G = 0x3D;',
    'const byte LETTER_O = 0x3F;',
    '',
    '// the game\'s states',
    'const int WAITING = 0;',
    'const int READY = 1;',
    'const int GO = 2;',
    'const int RESULT = 3;',
    'int state = WAITING;',
    '',
    'byte screen[4] = {DASH, DASH, DASH, DASH};  // what each digit shows',
    'int current = 0;               // the digit that is lit right now',
    'unsigned long goTime = 0;      // when GO happens (ms)',
    'unsigned long resultTime = 0;  // when the last round ended',
    'unsigned long p1Time = 0;      // reaction times (0 = not pressed yet)',
    'unsigned long p2Time = 0;',
    '',
    'void setup() {',
    '  pinMode(DATA_PIN, OUTPUT);',
    '  pinMode(LATCH_PIN, OUTPUT);',
    '  pinMode(CLOCK_PIN, OUTPUT);',
    '  for (int i = 0; i < 4; i++) {',
    '    pinMode(DIGIT_PINS[i], OUTPUT);',
    '    digitalWrite(DIGIT_PINS[i], HIGH);   // all digits off',
    '  }',
    '  pinMode(P1_BUTTON, INPUT_PULLUP);       // pressed = LOW',
    '  pinMode(P2_BUTTON, INPUT_PULLUP);',
    '  pinMode(BUZZER, OUTPUT);',
    '  randomSeed(analogRead(A0));             // A0 is unconnected: random noise',
    '  Serial.begin(9600);',
    '  Serial.println("Reaction timer: press a button to start");',
    '}',
    '',
    'void loop() {',
    '  showNextDigit();                        // keep the display alive',
    '  unsigned long now = millis();',
    '  bool p1 = digitalRead(P1_BUTTON) == LOW;',
    '  bool p2 = digitalRead(P2_BUTTON) == LOW;',
    '',
    '  if (state == WAITING) {',
    '    if (p1 || p2) startRound();',
    '  } else if (state == READY) {',
    '    if (p1 || p2) {                       // pressed before GO',
    '      falseStart(p1 ? 1 : 2);',
    '    } else if (now >= goTime) {           // the random wait is over: GO!',
    '      digitalWrite(BUZZER, HIGH);',
    '      setScreen(BLANK, LETTER_G, LETTER_O, BLANK);',
    '      goTime = now;',
    '      state = GO;',
    '    }',
    '  } else if (state == GO) {',
    '    if (now - goTime > 200) digitalWrite(BUZZER, LOW);   // a short beep',
    '    if (p1 && p1Time == 0) p1Time = now - goTime;',
    '    if (p2 && p2Time == 0) p2Time = now - goTime;',
    '    if ((p1Time > 0 && p2Time > 0) || now - goTime > 3000) {',
    '      finishRound();                      // both pressed, or time is up',
    '    }',
    '  } else if (state == RESULT) {',
    '    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);',
    '    if (now - resultTime > 1500 && (p1 || p2)) startRound();',
    '  }',
    '  delay(2);',
    '}',
    '',
    'void startRound() {',
    '  setScreen(DASH, DASH, DASH, DASH);',
    '  Serial.println("Get ready...");',
    '  while (digitalRead(P1_BUTTON) == LOW || digitalRead(P2_BUTTON) == LOW) {',
    '    showNextDigit();                      // wait until both buttons are released',
    '    delay(2);',
    '  }',
    '  goTime = millis() + random(2000, 5000); // GO comes in 2 to 5 seconds',
    '  p1Time = 0;',
    '  p2Time = 0;',
    '  state = READY;',
    '}',
    '',
    'void falseStart(int player) {',
    '  setScreen(LETTER_F, LETTER_S, DASH, DIGITS[player]);   // "FS-1" or "FS-2"',
    '  Serial.print("False start by player ");',
    '  Serial.println(player);',
    '  digitalWrite(BUZZER, HIGH);             // a long buzz (switched off in RESULT)',
    '  state = RESULT;',
    '  resultTime = millis();',
    '}',
    '',
    'void finishRound() {',
    '  digitalWrite(BUZZER, LOW);',
    '  Serial.print("Player 1: ");',
    '  printTime(p1Time);',
    '  Serial.print("   Player 2: ");',
    '  printTime(p2Time);',
    '  Serial.println();',
    '  if (p1Time == 0 && p2Time == 0) {',
    '    setScreen(DASH, DASH, DASH, DASH);',
    '    Serial.println("Nobody pressed!");',
    '  } else if (p2Time == 0 || (p1Time > 0 && p1Time <= p2Time)) {',
    '    showResult(1, p1Time);',
    '    Serial.println("Player 1 wins!");',
    '  } else {',
    '    showResult(2, p2Time);',
    '    Serial.println("Player 2 wins!");',
    '  }',
    '  state = RESULT;',
    '  resultTime = millis();',
    '}',
    '',
    '// winner number with a dot, then the time: 1.234',
    'void showResult(int player, unsigned long ms) {',
    '  if (ms > 999) ms = 999;',
    '  setScreen(DIGITS[player] | DOT, DIGITS[ms / 100], DIGITS[ms / 10 % 10], DIGITS[ms % 10]);',
    '}',
    '',
    'void printTime(unsigned long ms) {',
    '  if (ms == 0) {',
    '    Serial.print("--");',
    '  } else {',
    '    Serial.print(ms);',
    '    Serial.print(" ms");',
    '  }',
    '}',
    '',
    'void setScreen(byte a, byte b, byte c, byte d) {',
    '  screen[0] = a;',
    '  screen[1] = b;',
    '  screen[2] = c;',
    '  screen[3] = d;',
    '}',
    '',
    'void writeSegments(byte pattern) {',
    '  digitalWrite(LATCH_PIN, LOW);',
    '  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);',
    '  digitalWrite(LATCH_PIN, HIGH);',
    '}',
    '',
    'void showNextDigit() {',
    '  digitalWrite(DIGIT_PINS[current], HIGH);  // switch off the digit that was on',
    '  current = (current + 1) % 4;',
    '  writeSegments(screen[current]);',
    '  digitalWrite(DIGIT_PINS[current], LOW);   // switch on the next one',
    '}'].join('\n');

  RL.guides.m09 = { steps: [], _dev: { parts: PARTS_B, sets: { a: IDS_A, disp: IDS_DISP, game: IDS_GAME }, vb: VB9 } };
  var steps = RL.guides.m09.steps;

  /* ================= art helpers ================= */
  /* the finished game board (used in the brief and the build guide): returns { show([4 bytes]), press(p, on), buzz(on) } */
  function boardArt(svg, x, y, sc) {
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (sc || 1) + ')' }, svg);
    S('rect', { x: 0, y: 0, width: 640, height: 260, rx: 10, fill: CB, stroke: CBD, 'stroke-width': 3 }, g);
    S('rect', { x: 8, y: 8, width: 624, height: 244, rx: 8, fill: 'none', stroke: CBL, 'stroke-width': 1.5, 'stroke-dasharray': '6 6' }, g);
    // display window
    S('rect', { x: 190, y: 50, width: 260, height: 110, rx: 6, fill: '#1a1208' }, g);
    S('rect', { x: 200, y: 60, width: 240, height: 90, rx: 4, fill: '#0b0d10' }, g);
    var digs = [0, 1, 2, 3].map(function (i) { return bigDigit(g, 222 + i * 56, 72, 32, 64, 7); });
    T(g, 320, 186, 'REACTION TIMER', { 'text-anchor': 'middle', 'font-size': 13, 'letter-spacing': '3', fill: '#3a2a16' });
    // pads
    var pads = [[90, 150, '#e5484d', 'PLAYER 1'], [550, 150, '#3b82f6', 'PLAYER 2']].map(function (pd) {
      S('circle', { cx: pd[0], cy: pd[1], r: 62, fill: CBD }, g);
      var cap = S('circle', { cx: pd[0], cy: pd[1], r: 52, fill: pd[2], stroke: '#111', 'stroke-width': 3 }, g);
      T(g, pd[0], pd[1] + 90, pd[3], { 'text-anchor': 'middle', 'font-size': 12, 'letter-spacing': '2', fill: '#3a2a16' });
      return { cap: cap, c: pd[2] };
    });
    // buzzer
    S('circle', { cx: 320, cy: 222, r: 14, fill: '#16191e', stroke: '#4b5563', 'stroke-width': 2 }, g);
    var waves = S('g', { opacity: 0 }, g);
    [22, 30, 38].forEach(function (r) { S('path', { d: 'M' + (320 + r * 0.7) + ' ' + (222 - r * 0.7) + ' A' + r + ' ' + r + ' 0 0 1 ' + (320 + r * 0.7) + ' ' + (222 + r * 0.7), stroke: CY, 'stroke-width': 2.5, fill: 'none' }, waves); S('path', { d: 'M' + (320 - r * 0.7) + ' ' + (222 - r * 0.7) + ' A' + r + ' ' + r + ' 0 0 0 ' + (320 - r * 0.7) + ' ' + (222 + r * 0.7), stroke: CY, 'stroke-width': 2.5, fill: 'none' }, waves); });
    return {
      show: function (b) { digs.forEach(function (d, i) { d.set(b[i] || 0); }); },
      press: function (p, on) { var pd = pads[p - 1]; pd.cap.setAttribute('r', on ? 46 : 52); pd.cap.setAttribute('fill', on ? CY : pd.c); },
      buzz: function (on) { waves.setAttribute('opacity', on ? 1 : 0); }
    };
  }
  var DASH4 = [0x40, 0x40, 0x40, 0x40];
  function resultBytes(pl, ms) { return [DIG[pl] | 0x80, DIG[Math.floor(ms / 100) % 10], DIG[Math.floor(ms / 10) % 10], DIG[ms % 10]]; }

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m09;
    var wrap = el('div', 'brief');
    var left = el('div', '');
    left.innerHTML = '<p class="lead">How fast are you? In this mission you’ll build a two-player reaction game: wait for the beep, slam your button, and a four-digit display shows who won and how many milliseconds it took. Jump the gun and you lose.</p>' +
      '<p>It’s the hardest mission of the unit. You’ll control 8 LEDs with just 3 pins using a <b>shift register</b>, speak to a display in <b>binary</b>, trick your eyes with <b>multiplexing</b>, time things to the millisecond with <code>millis()</code>, and organize the whole game as a <b>state machine</b>. Then you’ll build a game board people actually want to play.</p>';
    UI.edp(left, [2, 4, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '<span class="tag">Female-to-male wires (about 14)</span></div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360,
      init: function (svg, S2, st) {
        glowDefs(svg); bg(svg, 800, 360); grid(svg, 800, 360);
        var a = boardArt(svg, 80, 30, 1);
        var lab = T(svg, 400, 340, '', { 'text-anchor': 'middle', 'font-size': 13, 'letter-spacing': '2', fill: CY });
        var seq = [
          [function () { a.show(DASH4); a.press(1, 0); a.press(2, 0); a.buzz(0); }, 'PRESS A BUTTON TO START', 1600],
          [function () { a.press(1, 1); }, 'GET READY…', 250], [function () { a.press(1, 0); }, 'GET READY… (RANDOM WAIT)', 2300],
          [function () { a.buzz(1); a.show([0, 0x3D, 0x3F, 0]); }, 'GO!', 280],
          [function () { a.press(2, 1); a.buzz(0); }, 'PLAYER 2 PRESSES', 180], [function () { a.press(1, 1); }, 'PLAYER 1 PRESSES', 260],
          [function () { a.press(1, 0); a.press(2, 0); a.show(resultBytes(2, 248)); }, 'PLAYER 2 WINS: 248 ms', 2800],
          [function () { a.show(DASH4); a.press(1, 1); }, 'NEXT ROUND…', 250], [function () { a.press(1, 0); }, 'GET READY…', 1100],
          [function () { a.press(1, 1); a.buzz(1); a.show([0x71, 0x6D, 0x40, DIG[1]]); }, 'TOO EARLY: FALSE START BY PLAYER 1', 600],
          [function () { a.press(1, 0); a.buzz(0); }, 'TOO EARLY: FALSE START BY PLAYER 1', 2400]
        ], i = 0;
        (function stepA() { var s2 = seq[i % seq.length]; s2[0](); lab.textContent = s2[1]; i++; st.later(stepA, s2[2]); })();
      },
      frames: [{ cap: 'Press to start, wait for the beep, press as fast as you can. The display shows the winner’s number (with a dot) and their reaction time in milliseconds. Press before the beep and the display calls you out: <b>FS-1</b> means false start by player 1.', draw: function () {} }] });
    UI.callout(b, 'plain', 'Plan your time', '<p>This mission has two builds. <b>Part A</b> (class 1): a shift register and an 8-LED light bar. <b>Part B</b> (classes 2 and 3): the same chip drives the 4-digit display, then the buttons, buzzer and game code. Keep your Part A wiring — most of it stays.</p>');
  } });

  /* ---------- 02 binary ---------- */
  steps.push({ id: 'binary', title: 'Binary: 8 bits, 8 LEDs', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Computers store everything as <b>bits</b>: things that are either 0 or 1, off or on. Eight bits make a <b>byte</b>. In this mission one byte will light 8 LEDs — and, later, 8 segments of a digit — so you need to be able to read and write numbers the way the UNO does.</p>');
    binaryExplainer(b);
    UI.html(b, '<h2>Build a byte</h2><p>Click the LEDs to switch bits on and off. Watch the same byte written four ways. Then hit each target.</p>');
    byteLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-bin1', q: 'Only the top three bits (bit 7, bit 6 and bit 5) are on. What number is that in decimal?', answer: 224, tol: 0, unit: '', explain: '128 + 64 + 32 = <b>224</b>. In binary that’s 11100000, and in hex 0xE0.', hint: 'Add up the place values of bits 7, 6 and 5: 128, 64 and 32.' });
    UI.mcq(b, ctx, { id: 'q-bin2', q: 'Which pattern is <code>0x0F</code>?', options: ['<code>00001111</code> — the four lowest bits on', '<code>11110000</code> — the four highest bits on', '<code>00000101</code>', '<code>00001010</code>'], answer: 0, explain: 'Each hex digit is 4 bits. 0 = 0000 and F = 1111, so 0x0F = 0000 1111 = 15.', hints: { 1: 'That’s 0xF0. The first hex digit is the high four bits.' } });
  } });
  function bitsRow(svg, y, onClick) {
    var leds = [];
    for (var i = 0; i < 8; i++) {
      var bit = 7 - i, x = 130 + i * 80, g = S('g', { 'class': onClick ? 'sim-btn' : '', role: onClick ? 'button' : null, tabindex: onClick ? 0 : null, 'aria-label': onClick ? 'Bit ' + bit : null }, svg);
      var glow = S('circle', { cx: x, cy: y, r: 36, fill: 'url(#m9g-red)', opacity: 0 }, g);
      var dome = S('circle', { cx: x, cy: y, r: 22, fill: '#5b1d1d', stroke: '#ff4d4d', 'stroke-width': 2 }, g);
      var bt = T(g, x, y - 40, '0', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 600, fill: MUT });
      T(g, x, y + 46, 'BIT ' + bit, { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
      var pv = T(g, x, y + 64, String(1 << bit), { 'text-anchor': 'middle', 'font-size': 14, fill: INK });
      if (onClick) (function (bit) { g.addEventListener('click', function () { onClick(bit); }); g.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onClick(bit); } }); })(bit);
      leds[bit] = { glow: glow, dome: dome, bt: bt, pv: pv };
    }
    return function set(v, hlPlace) {
      for (var k = 0; k < 8; k++) { var on = (v >> k) & 1, L = leds[k]; L.glow.setAttribute('opacity', on ? 0.9 : 0); L.dome.setAttribute('fill', on ? '#ff4d4d' : '#5b1d1d'); L.bt.textContent = on ? '1' : '0'; L.bt.setAttribute('fill', on ? CY : MUT); L.pv.setAttribute('fill', hlPlace && on ? CY : INK); }
    };
  }
  function binaryExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Counting with on and off', w: 820, h: 330,
      init: function (svg, S2, st) {
        glowDefs(svg); bg(svg, 820, 330);
        st.set = bitsRow(svg, 120, null);
        T(svg, 90, 190, 'PLACE VALUE', { 'text-anchor': 'end', 'font-size': 9, fill: MUT, 'letter-spacing': '1' });
        st.dec = T(svg, 410, 262, '', { 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 600, fill: INK });
        st.sum = P(svg, 410, 300, '', { 'text-anchor': 'middle', fill: MUT, 'font-size': 14 });
        st.cover = S('rect', { x: 0, y: 0, width: 0, height: 210, fill: BG, opacity: 0.85 }, svg);
        st.show = function (v, opts) {
          opts = opts || {}; st.set(v, true);
          var parts = []; for (var k = 7; k >= 0; k--) if ((v >> k) & 1) parts.push(1 << k);
          st.dec.textContent = opts.label != null ? opts.label : v + '   =   0b' + bin(v) + '   =   ' + hex(v);
          st.sum.textContent = opts.sum != null ? opts.sum : (parts.length ? parts.join(' + ') + ' = ' + v : 'all off = 0');
          st.cover.setAttribute('width', opts.cover || 0);
        };
      },
      frames: [
        { cap: '<b>One bit, two choices.</b> A bit is 0 or 1, like an LED that’s off or on. On its own it can only count to 1. The trick is to use several bits side by side, just like you use several digits to write 47.', draw: function (svg, S2, st) { st.show(0, { cover: 650, label: 'bit 0 = off', sum: '' }); st.later(function () { st.show(1, { cover: 650, label: 'bit 0 = on → 1', sum: '' }); }, 1200); st.later(function () { st.show(0, { cover: 650, label: 'bit 0 = off', sum: '' }); }, 2400); st.later(function () { st.show(1, { cover: 650, label: 'bit 0 = on → 1', sum: '' }); }, 3600); } },
        { cap: '<b>Each place is worth double the one to its right:</b> 1, 2, 4, 8, 16, 32, 64, 128. To read a binary number, add up the places that are on. Here bits 2 and 0 are on: 4 + 1 = 5. In code you can write it as <code>0b00000101</code>.', draw: function (svg, S2, st) { st.show(5); } },
        { cap: '<b>Counting up</b> works just like an odometer: when a place is full it rolls back to 0 and carries 1 to the next place. Watch bit 0 flip every count, bit 1 every two counts, bit 2 every four…', draw: function (svg, S2, st) { var n = 0; (function c() { st.show(n); n = (n + 1) % 32; st.later(c, 650); })(); } },
        { cap: '<b>Eight bits make a byte</b>, which counts from 0 (all off) to 255 (all on). Writing 8 ones and zeros is long, so programmers use <b>hex</b>: each group of 4 bits becomes one symbol from 0–9 and A–F. 1111 1111 → FF, so 255 = <code>0xFF</code>. 1010 0101 = <code>0xA5</code> = 165.', draw: function (svg, S2, st) { st.show(255); st.later(function () { st.show(0xA5); }, 2200); } }
      ] });
  }
  function byteLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The byte lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 230', role: 'img', 'aria-label': 'Eight clickable bits' }); stage.appendChild(svg);
    glowDefs(svg); bg(svg, 820, 230);
    var v = 0, set = bitsRow(svg, 110, function (bit) { v ^= 1 << bit; upd(); });
    T(svg, 410, 22, 'CLICK AN LED TO FLIP ITS BIT', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Try</label>';
    var pills = el('div', 'res-pills'); row.appendChild(pills); box.appendChild(row);
    [['All off', function () { v = 0; }], ['All on', function () { v = 255; }], ['0b10101010', function () { v = 0xAA; }], ['× 2 (shift left)', function () { v = (v << 1) & 255; }], ['÷ 2 (shift right)', function () { v = v >> 1; }]].forEach(function (p) { var bt = el('button', '', esc(p[0])); bt.type = 'button'; bt.addEventListener('click', function () { p[1](); upd(); }); pills.appendChild(bt); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    var tg = el('div', 'readouts'); box.appendChild(tg);
    b.appendChild(box);
    var TARGETS = [[5, 'Make 5'], [200, 'Make 200'], [0x0F, 'Make 0x0F'], [255, 'Make the biggest byte']], got = ctx.check('bytelab') || {};
    function upd() {
      set(v, true);
      TARGETS.forEach(function (t) { if (v === t[0]) got[t[0]] = 1; }); ctx.check('bytelab', got);
      ro.innerHTML = '<div><span class="label">Decimal</span><b>' + v + '</b></div><div><span class="label">Binary</span><b>0b' + bin(v) + '</b></div><div><span class="label">Hex</span><b>' + hex(v) + '</b></div><div><span class="label">Code</span><span class="small"><code>show(0b' + bin(v) + ');</code><br>sent bit 7 first</span></div>';
      tg.innerHTML = '<div><span class="label">Targets</span><span class="small">' + TARGETS.map(function (t) { return got[t[0]] ? '<span style="color:var(--go);font-weight:600">✓ ' + esc(t[1]) + '</span>' : '<span class="muted">○ ' + esc(t[1]) + '</span>'; }).join(' &nbsp; ') + '</span></div>';
    }
    upd();
    UI.html(b, '<p class="small muted">Notice what “× 2” does: every bit moves one place left. Shifting bits along a row is exactly what the chip in the next step does — that’s why it’s called a <b>shift</b> register.</p>');
  }

  /* ---------- 03 shift register ---------- */
  /* the inside of a 74HC595: shift cells, storage cells and 8 LEDs (Q7 on the left), with the UNO on the right */
  function srDraw(svg) {
    glowDefs(svg); arrowDefs(svg); bg(svg, 820, 360);
    function cx(q) { return 560 - q * 64; } // q = 0 … 7 → x of the cell's left edge
    S('rect', { x: 20, y: 30, width: 620, height: 310, rx: 6, fill: '#121820', stroke: '#3b4350', 'stroke-width': 2 }, svg);
    T(svg, 36, 54, '74HC595', { 'font-size': 12, fill: MUT, 'letter-spacing': '2' });
    T(svg, 36, 112, 'SHIFT', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); T(svg, 36, 126, 'REGISTER', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
    T(svg, 36, 192, 'STORAGE', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); T(svg, 36, 206, '(LATCH)', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
    var store = [], leds = [];
    for (var q = 0; q < 8; q++) {
      S('rect', { x: cx(q), y: 92, width: 52, height: 40, rx: 4, fill: PANEL, stroke: GRID }, svg);
      var sr = S('rect', { x: cx(q), y: 172, width: 52, height: 40, rx: 4, fill: PANEL, stroke: GRID }, svg), stx = T(svg, cx(q) + 26, 198, '0', { 'text-anchor': 'middle', 'font-size': 16, fill: MUT });
      store.push({ r: sr, t: stx });
      T(svg, cx(q) + 26, 234, 'Q' + q, { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
      S('line', { x1: cx(q) + 26, y1: 240, x2: cx(q) + 26, y2: 262, stroke: LINE, 'stroke-width': 2 }, svg);
      var gl = S('circle', { cx: cx(q) + 26, cy: 290, r: 30, fill: 'url(#m9g-red)', opacity: 0 }, svg), dm = S('circle', { cx: cx(q) + 26, cy: 290, r: 15, fill: '#5b1d1d', stroke: '#ff4d4d', 'stroke-width': 2 }, svg);
      leds.push({ g: gl, d: dm });
    }
    for (q = 0; q < 7; q++) S('path', { d: 'M' + (cx(q) - 2) + ' 112 L' + (cx(q + 1) + 56) + ' 112', stroke: LINE, 'stroke-width': 1.5, 'marker-end': 'url(#m9a-l)' }, svg);
    // UNO side
    S('rect', { x: 680, y: 60, width: 120, height: 250, rx: 6, fill: '#15497a', stroke: '#2e6aa3' }, svg);
    T(svg, 740, 84, 'UNO', { 'text-anchor': 'middle', 'font-size': 11, 'letter-spacing': '2', fill: '#cfe3f5' });
    var dsLine = S('path', { d: 'M680 112 L588 112', stroke: LINE, 'stroke-width': 3, 'marker-end': 'url(#m9a-l)' }, svg);
    T(svg, 692, 108, 'PIN 8 · DS', { 'font-size': 10, fill: '#cfe3f5' });
    var ckLine = S('path', { d: 'M680 152 L600 152 L600 140', stroke: LINE, 'stroke-width': 3, fill: 'none' }, svg);
    T(svg, 692, 148, 'PIN 10 · CLOCK', { 'font-size': 10, fill: '#cfe3f5' });
    var ltLine = S('path', { d: 'M680 230 L600 230 L600 218', stroke: LINE, 'stroke-width': 3, fill: 'none' }, svg);
    T(svg, 692, 226, 'PIN 9 · LATCH', { 'font-size': 10, fill: '#cfe3f5' });
    var ds = T(svg, 634, 104, '0', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: MUT });
    var ckT = T(svg, 640, 172, '', { 'text-anchor': 'middle', 'font-size': 11, fill: CY, 'letter-spacing': '1' });
    var ltT = T(svg, 640, 250, '', { 'text-anchor': 'middle', 'font-size': 11, fill: CY, 'letter-spacing': '1' });
    var note = T(svg, 360, 78, '', { 'text-anchor': 'middle', 'font-size': 12, fill: CY, 'letter-spacing': '1.5' });
    var tokLayer = S('g', {}, svg), toks = [];
    function mkTok(bit, q) {
      var g = S('g', {}, tokLayer); g.style.transition = 'transform 0.32s ease, opacity 0.32s';
      S('rect', { x: 0, y: 92, width: 52, height: 40, rx: 4, fill: bit ? '#0a2a36' : PANEL, stroke: bit ? CY : GRID, 'stroke-width': 2 }, g);
      T(g, 26, 118, String(bit), { 'text-anchor': 'middle', 'font-size': 16, fill: bit ? CY : MUT });
      g.style.transform = 'translate(' + cx(q) + 'px, 0px)'; g._bit = bit; return g;
    }
    function bits() { return toks.map(function (t) { return t ? t._bit : 0; }); }
    var api = {
      reset: function (arr) { tokLayer.innerHTML = ''; toks = []; for (var q = 0; q < 8; q++) toks[q] = mkTok(arr ? arr[q] : 0, q); },
      setDS: function (v) { ds.textContent = String(v); ds.setAttribute('fill', v ? CY : MUT); dsLine.setAttribute('stroke', v ? CY : LINE); },
      tick: function (n) {
        var dsv = ds.textContent === '1' ? 1 : 0, old = toks[7];
        if (old) { old.style.opacity = 0; setTimeout(function () { old.remove(); }, 340); }
        for (var q = 7; q > 0; q--) { toks[q] = toks[q - 1]; toks[q].style.transform = 'translate(' + cx(q) + 'px, 0px)'; }
        var t = mkTok(dsv, 0); t.style.transform = 'translate(' + (cx(0) + 60) + 'px, 0px)'; t.style.opacity = 0; toks[0] = t;
        t.getBoundingClientRect(); requestAnimationFrame(function () { t.style.opacity = 1; t.style.transform = 'translate(' + cx(0) + 'px, 0px)'; });
        ckLine.setAttribute('stroke', CY); ckT.textContent = n ? 'TICK ' + n : 'TICK'; setTimeout(function () { ckLine.setAttribute('stroke', LINE); }, 220);
      },
      latch: function () {
        var bb = bits(); store.forEach(function (s, q) { s.t.textContent = String(bb[q]); s.t.setAttribute('fill', bb[q] ? CY : MUT); s.r.setAttribute('stroke', bb[q] ? CY : GRID); s.r.setAttribute('fill', bb[q] ? '#0a2a36' : PANEL); leds[q].g.setAttribute('opacity', bb[q] ? 0.9 : 0); leds[q].d.setAttribute('fill', bb[q] ? '#ff4d4d' : '#5b1d1d'); });
        ltLine.setAttribute('stroke', CY); ltT.textContent = 'LATCH!'; setTimeout(function () { ltLine.setAttribute('stroke', LINE); ltT.textContent = ''; }, 500);
      },
      clearStore: function () { store.forEach(function (s, q) { s.t.textContent = '0'; s.t.setAttribute('fill', MUT); s.r.setAttribute('stroke', GRID); s.r.setAttribute('fill', PANEL); leds[q].g.setAttribute('opacity', 0); leds[q].d.setAttribute('fill', '#5b1d1d'); }); },
      note: function (s) { note.textContent = s; ckT.textContent = ''; },
      bits: bits,
      stored: function () { return store.map(function (s) { return s.t.textContent === '1' ? 1 : 0; }); }
    };
    api.reset(); return api;
  }
  steps.push({ id: 'shift', title: 'How a shift register works', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Eight LEDs would normally need eight UNO pins — and the display needs even more. The <b>74HC595 shift register</b> lets you control 8 outputs with just <b>3 pins</b>: you send the 8 bits one after another down a single wire, and the chip lines them up.</p>');
    var PAT = [1, 0, 1, 1, 0, 0, 0, 1]; // bit 7 first (MSBFIRST): 10110001
    UI.explainer(b, { label: 'Explainer', title: 'Bits march in, then the latch copies them', w: 820, h: 360,
      init: function (svg, S2, st) { st.sr = srDraw(svg); },
      frames: [
        { cap: '<b>Three wires from the UNO.</b> <b>DS</b> (data) carries the next bit, 1 or 0. Each <b>clock</b> tick (SH_CP) pushes it into the chip. The <b>latch</b> (ST_CP) copies everything to the outputs Q0–Q7, which drive the LEDs. Inside there are two rows of 8 memory cells: the shift register and the storage.', draw: function (svg, S2, st) { st.sr.reset(); st.sr.clearStore(); st.sr.setDS(0); st.sr.note(''); } },
        { cap: '<b>Every clock tick, every bit moves one step left</b>, and whatever is on DS slides into the first cell. Here the UNO sends <code>10110001</code>, bit 7 first. Notice the LEDs don’t change while the bits march in: the outputs only listen to the storage row.', draw: function (svg, S2, st) {
          st.sr.reset(); st.sr.clearStore(); st.sr.setDS(0); st.sr.note('SENDING 10110001, BIT 7 FIRST');
          PAT.forEach(function (bit, i) { st.later(function () { st.sr.setDS(bit); }, 400 + i * 1100); st.later(function () { st.sr.tick(i + 1); }, 900 + i * 1100); });
          st.later(function () { st.sr.note('8 TICKS: THE BYTE IS IN — BUT THE LEDS HAVEN’T CHANGED'); }, 900 + 8 * 1100);
        } },
        { cap: '<b>Then the latch copies all 8 at once.</b> When the latch pin goes from LOW to HIGH, the storage row copies the shift row and the LEDs change together, in a single instant. The first bit sent (bit 7) ended up at Q7, so the LEDs read <code>10110001</code> from Q7 to Q0.', draw: function (svg, S2, st) { st.sr.reset([1, 0, 0, 0, 1, 1, 0, 1]); st.sr.clearStore(); st.sr.setDS(1); st.sr.note('LATCH: LOW → HIGH'); st.later(function () { st.sr.latch(); }, 900); } },
        { cap: '<b>Why bother with a latch?</b> Without it the LEDs would show every half-shifted pattern as the bits march past — a flicker of garbage. With it, you load the new byte quietly and reveal it in one go. And you never tick the clock by hand: <code>shiftOut()</code> does all 8 ticks in about a tenth of a millisecond.', draw: function (svg, S2, st) {
          st.sr.reset(); st.sr.clearStore(); st.sr.note('shiftOut() + LATCH, OVER AND OVER');
          var pats = [[1, 0, 0, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 0, 0, 0, 0], [1, 1, 1, 1, 0, 0, 0, 0], [1, 1, 1, 1, 1, 0, 0, 0], [1, 1, 1, 1, 1, 1, 0, 0], [1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1]], t = 300;
          pats.forEach(function (pt) { pt.forEach(function (bit, i) { st.later(function () { st.sr.setDS(bit); st.sr.tick(); }, t + i * 70); }); t += 8 * 70 + 120; st.later(function () { st.sr.latch(); }, t); t += 500; });
        } }
      ] });
    UI.html(b, '<h2>Be the UNO</h2><p>Now you run the chip. Set DS, tick the clock, and latch when you’re ready. <b>Goal: light only Q7, Q6 and Q0.</b> (Hint: the first bit you send ends up at Q7.)</p>');
    beTheUno(b, ctx);
    UI.mcq(b, ctx, { id: 'q-latch', q: 'You’ve sent 8 bits with 8 clock ticks, but the LEDs still show the old pattern. What’s missing?', options: ['A ninth clock tick', 'The latch: ST_CP has to go LOW then HIGH to copy the bits to the outputs', 'A delay()', 'More current from the 5V pin'], answer: 1, explain: 'The storage row only copies the shift row on the latch’s rising edge. That’s what the <code>digitalWrite(LATCH_PIN, HIGH)</code> after shiftOut does.', hints: { 0: 'A ninth tick would push bit 7 out of the end and shift everything along.' } });
    sr595Tour(b, ctx);
  } });
  function beTheUno(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Be the UNO</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 360', role: 'img', 'aria-label': 'A shift register you control' }); stage.appendChild(svg);
    var sr = srDraw(svg), dsv = 0, ticks = 0;
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Pins</label>';
    var pills = el('div', 'res-pills'); row.appendChild(pills); box.appendChild(row);
    var bD = el('button', '', 'DS (pin 8): LOW'), bC = el('button', '', 'Clock tick ↑ (pin 10)'), bL = el('button', '', 'Latch ↑ (pin 9)'), bR = el('button', '', 'Start over');
    [bD, bC, bL, bR].forEach(function (x) { x.type = 'button'; pills.appendChild(x); });
    var ro = el('div', 'readouts'); box.appendChild(ro); b.appendChild(box);
    function upd(msg) {
      bD.textContent = 'DS (pin 8): ' + (dsv ? 'HIGH (1)' : 'LOW (0)'); bD.classList.toggle('on', !!dsv); sr.setDS(dsv);
      var st = sr.stored(), goal = st.join('') === '10000011', done = ctx.check('beuno');
      if (goal && !done) ctx.check('beuno', 1);
      ro.innerHTML = '<div><span class="label">Ticks</span><b>' + ticks + '</b></div><div><span class="label">Shift row (Q7…Q0)</span><b>' + sr.bits().slice().reverse().join('') + '</b></div><div><span class="label">LEDs (Q7…Q0)</span><b>' + st.slice().reverse().join('') + '</b></div><div><span class="label">Goal</span>' + (goal ? '<b style="color:var(--go)">PASS · Q7, Q6 and Q0 are lit!</b>' : '<span class="small">' + (msg || 'Light only Q7, Q6, Q0 (11000001)') + '</span>') + '</div>';
    }
    bD.addEventListener('click', function () { dsv = 1 - dsv; upd(); });
    bC.addEventListener('click', function () { ticks++; sr.tick(ticks); setTimeout(function () { upd(); }, 360); });
    bL.addEventListener('click', function () { sr.latch(); upd(); });
    bR.addEventListener('click', function () { sr.reset(); sr.clearStore(); ticks = 0; dsv = 0; upd(); });
    sr.note('YOU ARE THE UNO'); upd();
  }
  function sr595Tour(b, ctx) {
    var svg = S('svg', { viewBox: '0 0 520 380', role: 'img', 'aria-label': '74HC595 pinout' });
    S('rect', { x: 0, y: 0, width: 520, height: 380, fill: BG }, svg);
    S('rect', { x: 190, y: 30, width: 140, height: 320, rx: 6, fill: '#1a1d22', stroke: '#3b4350', 'stroke-width': 2 }, svg);
    S('path', { d: 'M248 30 a12 12 0 0 0 24 0', fill: '#3b4350' }, svg); S('circle', { cx: 206, cy: 48, r: 4, fill: '#3b4350' }, svg);
    T(svg, 260, 196, '74HC595', { 'text-anchor': 'middle', 'font-size': 14, fill: '#c9d3de', 'letter-spacing': '2', transform: 'rotate(90 260 190)' });
    var NAMES = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'GND', 'Q7′', 'MR', 'SH_CP', 'ST_CP', 'OE', 'DS', 'Q0', 'VCC'];
    NAMES.forEach(function (n, i) { var left = i < 8, k = left ? i : 15 - i, y = 54 + k * 38, x = left ? 172 : 330; S('rect', { x: x, y: y - 6, width: 18, height: 12, fill: '#c0c6cc' }, svg); T(svg, left ? x - 8 : x + 26, y + 4, (i + 1) + ' ' + n, { 'text-anchor': left ? 'end' : 'start', 'font-size': 12, fill: /^Q\d$/.test(n) ? CY : INK }); });
    UI.hotspots(b, { title: 'Explore the 74HC595 pins', label: 'Chip tour', svg: svg, ctx: ctx, key: 'sr595tour', intro: 'Tap each dot. The notch marks the top; pin 1 is beside the dot.', spots: [
      { id: 'q', x: 181, y: 130, title: 'Q0–Q7 · the outputs', html: '<p>Eight outputs, one per bit. Q1–Q7 are pins 1–7 down the left side; <b>Q0 is pin 15</b>, alone on the right. Each one is HIGH (5 V) or LOW like an UNO pin, and can light an LED through a 220 Ω resistor.</p>' },
      { id: 'gnd', x: 181, y: 320, title: 'Pin 8 · GND', html: '<p>Ground. Goes to the − rail.</p>' },
      { id: 'vcc', x: 339, y: 54, title: 'Pin 16 · VCC', html: '<p>5 V power for the chip, from the + rail.</p>' },
      { id: 'ds', x: 339, y: 130, title: 'Pin 14 · DS (data)', html: '<p>The serial data input — the next bit to shift in. Wired to <b>UNO pin 8</b>.</p>' },
      { id: 'oe', x: 339, y: 168, title: 'Pin 13 · OE (output enable)', html: '<p>Turns all 8 outputs on or off. It’s <b>active LOW</b> (LOW = outputs on), so you connect it to GND to keep them always on.</p>' },
      { id: 'st', x: 339, y: 206, title: 'Pin 12 · ST_CP (latch)', html: '<p>The storage clock, or <b>latch</b>. A LOW → HIGH step copies the shift register to the outputs. Wired to <b>UNO pin 9</b>.</p>' },
      { id: 'sh', x: 339, y: 244, title: 'Pin 11 · SH_CP (clock)', html: '<p>The shift clock. Each LOW → HIGH step shifts every bit along by one and reads DS into the first cell. Wired to <b>UNO pin 10</b>.</p>' },
      { id: 'mr', x: 339, y: 282, title: 'Pin 10 · MR (master reset)', html: '<p>Clears the shift register when LOW. You never want that by accident, so connect it to <b>5 V</b>.</p>' },
      { id: 'q7s', x: 339, y: 320, title: 'Pin 9 · Q7′ (serial out)', html: '<p>The bit that falls off the end. Connect it to the DS of a second 595 and you get 16 outputs from the same 3 pins (“daisy-chaining”). Leave it empty here.</p>' }
    ] });
  }

  /* ---------- 04 build A ---------- */
  steps.push({ id: 'builda', title: 'Build: the LED light bar', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Part A: the 74HC595 and an 8-LED light bar. It’s the most wiring you’ve done so far, so work one step at a time and check each one. Every LED is the Mission 01 pattern — a wire, a 220 Ω resistor across the gap, and an LED to the − rail — but the wire comes from a chip output instead of an UNO pin.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Keep the USB unplugged while you wire. Chips are damaged by being plugged in backwards: double-check the notch before you power up. If the chip ever gets hot, unplug immediately and look for a short.</p>');
    var G = {}; for (var kk = 0; kk < 8; kk++) G[kk] = ['r' + kk, 'l' + kk, 'q' + kk, 't' + kk];
    B.guide(b, { title: 'Shift register + LED bar', parts: PARTS_A, base: [], steps: [
      { title: 'Power rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p>Same as Mission 01: <b>5V → left + rail</b> (red, around the top of the UNO), <b>GND → left − rail</b> (black), and two bridges at the bottom so both sides of the board have power.</p>' },
      { title: 'Place the 74HC595', add: ['sr'], html: '<p>Notch <b>up</b>. Press the chip across the centre gap with <b>pin 1 in e3</b>: pins 1–8 go down column e (rows 3–10) and pins 9–16 come back up column f.</p>' },
      { title: 'Power and control pins', add: ['svcc', 'sgnd', 'smr', 'soe'], html: '<p><b>VCC</b> (pin 16): <b>j3 → + rail</b>. <b>GND</b> (pin 8): <b>a10 → − rail</b>.</p><p><b>MR</b> (pin 10, master reset): <b>j9 → + rail</b>, so it never resets. <b>OE</b> (pin 13, output enable): <b>j6 → − rail</b>, so the outputs are always on.</p>' },
      { title: 'Three wires from the UNO', add: ['wds', 'wst', 'wsh'], html: '<p><b>Pin 8 → h5</b> (DS, data). <b>Pin 9 → h7</b> (ST_CP, latch). <b>Pin 10 → h8</b> (SH_CP, clock). These three pins are all the UNO needs.</p>' },
      { title: 'Q7 to Q4: the top of the bar', add: G[7].concat(G[6], G[5], G[4]), html: '<p>For each output, three parts: a wire from the chip’s pin row (column c) to the LED’s row, a <b>220 Ω</b> resistor (' + RL.resistorName(220) + ') from e to f, and an LED with its <b>long leg in j</b> and short leg in the − rail.</p><p><b>Q7</b> (c9) → row 12 (red). <b>Q6</b> (c8) → row 14 (red). <b>Q5</b> (c7) → row 16 (yellow). <b>Q4</b> (c6) → row 18 (yellow).</p>' },
      { title: 'Q3 to Q1', add: G[3].concat(G[2], G[1]), html: '<p>Same pattern: <b>Q3</b> (c5) → row 20 (yellow), <b>Q2</b> (c4) → row 22 (green), <b>Q1</b> (c3) → row 24 (green). Let the wires run neatly down the left edge, longest on the outside.</p>' },
      { title: 'Q0: the odd one out', add: G[0], html: '<p>Q0 is pin 15, on the <b>right</b> side of the chip (row 4). Run a long wire from <b>g4</b> over the top of the chip and down the edge to <b>a26</b>, then the resistor and a green LED in row 26.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Check: notch up; VCC and MR to +; GND and OE to −; pins 8, 9, 10 to h5, h7, h8; eight wire–resistor–LED rows with every long leg in column j. From top to bottom the bar is Q7, Q6 … Q0.</p>' }
    ] });
    UI.callout(b, 'plain', 'Nothing lights yet?', '<p>That’s normal — the chip shows whatever bits it has, which is often all zeros. The code in the next step brings it to life. If some LEDs glow before you upload anything, that’s random start-up data: also normal.</p>');
  } });

  /* ---------- 05 code: bar ---------- */
  function shiftVals(log) { return log.filter(function (e) { return e.dev === 'shift'; }).map(function (e) { return e.v; }); }
  steps.push({ id: 'bar', title: 'Code it: light bar patterns', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">With the chip wired, one function does all the work: <code>show(pattern)</code> sends a byte to the 74HC595, and each bit lights one LED. Patterns become numbers — and you already know how to write numbers in binary.</p>');
    RL.Code.walk(b, BARCODE, [
      { lines: [3, 5], title: 'Three pins', html: '<p>Data, latch and clock, matching your wires to h5, h7 and h8.</p>' },
      { lines: [8, 12], title: 'show(): your own function', html: '<p>You can write your own functions. <code>void show(byte pattern)</code> takes one byte called <code>pattern</code>.</p><p>Latch LOW (get ready) → <code>shiftOut()</code> sends the 8 bits with 8 clock ticks → latch HIGH (copy to the LEDs). <code>MSBFIRST</code> means “most significant bit first” (bit 7 first), so bit 7 ends up on Q7.</p>' },
      { lines: [21, 27], title: 'Alternating flash', html: '<p><code>0b10101010</code> is a binary number: bits 7, 5, 3 and 1 on. Then <code>0b01010101</code> lights the other four. Swapping between them four times makes the bar shimmer.</p>' },
      { lines: [29, 36], title: 'A bar that fills up', html: '<p><code>1 &lt;&lt; i</code> is a 1 shifted left <code>i</code> places: a byte with only bit <code>i</code> on. <code>bar | (1 &lt;&lt; i)</code> (“or”) switches that bit on and keeps the ones already on. Counting <code>i</code> down from 7 fills the bar from the top: a “get ready” countdown.</p>' },
      { lines: [38, 40], title: 'Your turn', html: '<p>A Knight Rider sweep: one LED runs down the bar and back up again, over and over. <code>show(1 &lt;&lt; i)</code> lights only LED <code>i</code>. You need one <code>for</code> loop going one way, and another coming back. Add a short delay so you can see it.</p>' }
    ], { name: 'light_bar', download: false });
    RL.Sim.create(b, { title: 'Light bar patterns', code: BARCODE, name: 'light_bar', key: 'sim-bar', ctx: ctx, board: { parts: PARTS_A, show: IDS_A, view: VIEW_A }, shift: SHIFT_A, runHint: 'watch the light bar.',
      checkAfter: 8500,
      check: function (log) {
        var v = shiftVals(log), single = v.filter(function (x) { return x && !(x & (x - 1)); }), up = 0, down = 0, seen = 0;
        for (var i = 1; i < single.length; i++) { if (single[i] === single[i - 1] * 2) up++; if (single[i] * 2 === single[i - 1]) down++; }
        single.forEach(function (x) { seen |= x; });
        var r = !v.length ? { pass: false, msg: 'Nothing reached the shift register. Check that show() is called and the pins are 8, 10 and 9.' }
          : up >= 5 && down >= 5 && seen === 255 ? { pass: true, msg: 'Down and back up, one LED at a time: that’s a Knight Rider sweep.' }
          : single.length < 6 ? { pass: false, msg: 'The flash and the filling bar work, but there’s no sweep yet. Add two for loops that call show(1 << i).' }
          : { pass: false, msg: 'There’s a sweep, but it should visit all 8 LEDs going one way and then come back the other way.' };
        ctx.check('sim-bar-pass', r.pass ? 1 : 0); return r;
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show a Knight Rider sweep</summary><p class="small">Down the bar (bit 7 to bit 0), then back up (bit 1 to bit 6) so the ends don’t flash twice:</p>';
    RL.Code.block(hint, '  for (int i = 7; i >= 0; i--) {\n    show(1 << i);\n    delay(60);\n  }\n  for (int i = 1; i < 7; i++) {\n    show(1 << i);\n    delay(60);\n  }', { download: false });
    b.appendChild(hint);
    UI.html(b, '<h2>Count in binary</h2><p>One more: this sketch counts up, sending each number to the bar, so you can watch binary counting happen in real LEDs. Read the bar from the top (bit 7) to the bottom (bit 0) — and compare with the Serial Monitor.</p>');
    RL.Sim.create(b, { title: 'Count in binary', code: COUNT, name: 'binary_count', key: 'sim-count', ctx: ctx, board: { parts: PARTS_A, show: IDS_A, view: VIEW_A }, shift: SHIFT_A, runHint: 'watch the bottom LEDs flip.',
      checkAfter: 3600,
      check: function (log) {
        var v = shiftVals(log), run = 1, best = 1;
        for (var i = 1; i < v.length; i++) { run = v[i] === v[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
        var r = best >= 8 ? { pass: true, msg: 'The bar counted ' + best + ' numbers in a row. Bit 0 flips every count.' } : { pass: false, msg: 'The bar should show 0, 1, 2, 3… in order. Check that count goes up by 1 each time.' };
        ctx.check('sim-count-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<p style="margin-top:16px">Upload both to your real board. If the bar runs backwards (the sweep starts at the bottom), two LED rows are swapped, or MSBFIRST was changed to LSBFIRST.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>No LEDs ever light</b><br><span class="small muted">Check VCC (j3) and MR (j9) go to +, and GND (a10) and OE (j6) go to −. Is the notch up?</span></div></div><div class="trow"><div><b>All LEDs flicker randomly</b><br><span class="small muted">Latch and clock are swapped: pin 9 → h7 (ST_CP), pin 10 → h8 (SH_CP).</span></div></div><div class="trow"><div><b>One LED never lights</b><br><span class="small muted">Flip that LED (long leg in j) and check its wire starts on the right chip row.</span></div></div><div class="trow"><div><b>The pattern is shifted by one</b><br><span class="small muted">The Q0 wire (g4 → a26) is missing or on the wrong row.</span></div></div></div>');
    UI.note(b, ctx, { id: 'n-pins', label: 'Your light bar uses 3 UNO pins for 8 LEDs. Explain, in your own words, how the chip turns 3 wires into 8 outputs.', placeholder: 'The UNO sends…' });
  } });

  /* ---------- 06 the display ---------- */
  steps.push({ id: 'display', title: 'Build: the 7-segment display', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A 7-segment digit is just <b>8 LEDs</b> arranged as a figure 8 plus a decimal point. Eight LEDs… and a shift register with 8 outputs. You can already see where this is going.</p>');
    segExplainer(b);
    UI.html(b, '<h2>Design a digit</h2><p>Click segments to light them. The 8 segments map to the 8 bits of a byte (a = bit 0 … g = bit 6, dp = bit 7), so every pattern is a number. Build all ten digits and you’ve written the table your code will use.</p>');
    segLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-seg1', q: 'The number <b>1</b> lights only segments <b>b</b> and <b>c</b>. What is that byte in decimal?', answer: 6, tol: 0, unit: '', explain: 'b is bit 1 (worth 2) and c is bit 2 (worth 4): 2 + 4 = <b>6</b> = 0x06.', hint: 'a = bit 0 = 1, b = bit 1 = 2, c = bit 2 = 4. Add the ones that are on.' });
    UI.mcq(b, ctx, { id: 'q-seg2', q: 'Which number does <code>0x7F</code> show?', options: ['7', '8', '0', 'Nothing — it’s too big'], answer: 1, explain: '0x7F = 0111 1111: bits 0–6 (a to g) all on, dp off. All seven segments make an 8.' });
    UI.html(b, '<h2>Wire the display</h2><p>Part B reuses your Part A circuit. The LEDs come out; the resistors stay; and each resistor’s row now feeds one segment of the display instead of an LED. The four <b>digit pins</b> go straight to UNO pins 2–5.</p>');
    UI.callout(b, '', 'Reading the display’s pins', '<p>Hold the display with the decimal points at the bottom. The bottom row is <b>pins 1–6</b> (left to right); the top row is <b>pins 12–7</b> (left to right). Connect each pin with a <b>female-to-male wire</b> (socket on the display pin, pin end in the breadboard) so the display can later sit in the game board’s window.</p><p class="small">Short on female-to-male wires? Plug the display into the empty bottom end of your long breadboard, across the centre gap, and use normal jumpers to the same places.</p>');
    B.guide(b, { title: 'The 4-digit display', parts: PARTS_B, vb: VB9, base: IDS_A, steps: [
      { title: 'Start from the LED bar', view: 'all', html: '<p>Your Part A circuit: chip, three control wires, eight resistor rows with LEDs.</p>' },
      { title: 'Remove the 8 LEDs', remove: LED_IDS.concat(LABEL_IDS), html: '<p>Unplug the eight LEDs (keep them for later projects). <b>Leave the resistors and the chip wires exactly where they are.</b> Each resistor’s right end (column j) is now a segment line.</p>' },
      { title: 'Place the display', add: ['seg'], html: '<p>Put the 4-digit display beside the board, decimal points at the bottom. Its 12 pins: four <b>digit</b> pins (D1–D4, one per digit) and eight <b>segment</b> pins (A–G and DP), shared by all four digits.</p>' },
      { title: 'Segments a to d', add: ['g0', 'g1', 'g2', 'g3'], html: '<p>Each output drives one segment: <b>Q0 → A</b> (j26 → pin 11), <b>Q1 → B</b> (j24 → pin 7), <b>Q2 → C</b> (j22 → pin 4), <b>Q3 → D</b> (j20 → pin 2).</p>' },
      { title: 'Segments e, f, g and dp', add: ['g4', 'g5', 'g6', 'g7'], html: '<p><b>Q4 → E</b> (j18 → pin 1), <b>Q5 → F</b> (j16 → pin 10), <b>Q6 → G</b> (j14 → pin 5), <b>Q7 → DP</b> (j12 → pin 3). Every segment still has its own 220 Ω resistor in the line.</p>' },
      { title: 'The four digit pins', add: ['d2', 'd3', 'd4', 'd5'], html: '<p><b>Pin 2 → D1</b> (display pin 12), <b>pin 3 → D2</b> (pin 9), <b>pin 4 → D3</b> (pin 8), <b>pin 5 → D4</b> (pin 6). Route them as a neat bundle around the bottom of the board.</p><p>This display is <b>common cathode</b>: a digit lights when its pin is <b>LOW</b>.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Eight segment wires (one per resistor row), four digit wires from pins 2–5. Nothing on the display lights until the code switches a digit pin LOW.</p>' }
    ] });
    UI.callout(b, 'plain', 'Engineer’s note: how much current?', '<p>Each lit segment draws roughly 8–10 mA through its 220 Ω resistor. When a digit shows 8 with its dot, all of that current flows out through <b>one</b> UNO digit pin — more than the 20 mA a pin is happy with. It works because each digit is only on a quarter of the time (next step) and the pin’s own resistance limits the current, which is why the digits look a little dimmer than single LEDs. A finished product would add one transistor per digit to carry that current instead.</p>');
  } });
  function segExplainer(b) {
    var NM = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
    UI.explainer(b, { label: 'Explainer', title: 'Inside a 7-segment display', w: 820, h: 340,
      init: function (svg, S2, st) {
        glowDefs(svg); arrowDefs(svg); bg(svg, 820, 340);
        st.layer = S('g', {}, svg);
      },
      frames: [
        { cap: '<b>Eight LEDs in a figure 8.</b> The segments are named <b>a</b> (top) clockwise to <b>f</b>, then <b>g</b> (middle) and <b>dp</b> (the dot). Light the right ones and you get any number, and even a few letters.', draw: function (svg, S2, st) {
          st.layer.innerHTML = ''; var d = bigDigit(st.layer, 150, 60, 110, 200, 22);
          var pos = [[205, 40], [290, 110], [290, 220], [205, 292], [118, 220], [118, 110], [205, 150], [304, 286]];
          NM.forEach(function (n, i) { T(st.layer, pos[i][0], pos[i][1] + (i === 6 ? -16 : 0), n, { 'text-anchor': 'middle', 'font-size': 16, fill: CY }); });
          var lab = T(st.layer, 560, 170, '', { 'text-anchor': 'middle', 'font-size': 28, fill: INK }), lab2 = P(st.layer, 560, 204, '', { 'text-anchor': 'middle', fill: MUT });
          var i = 0; (function c() { if (i < 8) { d.set(1 << i); lab.textContent = 'segment ' + NM[i]; lab2.textContent = 'bit ' + i; } else { var n = (i - 8) % 10; d.set(DIG[n]); lab.textContent = String(n); lab2.textContent = hex(DIG[n]) + ' = 0b' + bin(DIG[n]); } i = i >= 27 ? 0 : i + 1; st.later(c, i <= 8 ? 600 : 800); })();
        } },
        { cap: '<b>Common cathode.</b> Inside, all eight LEDs share one cathode (−) pin: the <b>digit pin</b>. A segment lights when its anode gets 5 V (from a 595 output, through its resistor) <b>and</b> the digit pin is LOW (connected to ground by the UNO). Digit pin HIGH = the whole digit is off.', draw: function (svg, S2, st) {
          st.layer.innerHTML = ''; var g = st.layer;
          T(g, 40, 40, '74HC595 OUTPUTS', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var on = [1, 1, 0, 1, 1, 0, 1, 0];
          NM.forEach(function (n, i) {
            var x = 70 + i * 82;
            S('line', { x1: x, y1: 60, x2: x, y2: 110, stroke: on[i] ? CY : LINE, 'stroke-width': 2.5 }, g);
            T(g, x, 56, 'Q' + i, { 'text-anchor': 'middle', 'font-size': 11, fill: on[i] ? CY : MUT });
            RL.drawResistorBody(S('g', { transform: 'translate(' + x + ' 128) rotate(90)' }, g), 220, 36, 10);
            S('line', { x1: x, y1: 146, x2: x, y2: 172, stroke: on[i] ? CY : LINE, 'stroke-width': 2.5 }, g);
            S('path', { d: 'M' + (x - 12) + ' 172 h24 l-12 20 z', fill: on[i] ? '#ff4d4d' : '#5b1d1d', stroke: '#ff4d4d' }, g); S('line', { x1: x - 12, y1: 192, x2: x + 12, y2: 192, stroke: '#ff4d4d', 'stroke-width': 2 }, g);
            if (on[i]) S('circle', { cx: x, cy: 182, r: 22, fill: 'url(#m9g-red)' }, g);
            T(g, x + 18, 186, n, { 'font-size': 13, fill: INK });
            S('line', { x1: x, y1: 192, x2: x, y2: 230, stroke: LINE, 'stroke-width': 2.5 }, g);
          });
          S('line', { x1: 70, y1: 230, x2: 644, y2: 230, stroke: CY, 'stroke-width': 4 }, g);
          S('line', { x1: 357, y1: 230, x2: 357, y2: 280, stroke: CY, 'stroke-width': 4 }, g);
          T(g, 357, 300, 'DIGIT PIN (COMMON CATHODE) → UNO PIN, LOW = ON', { 'text-anchor': 'middle', 'font-size': 12, fill: CY, 'letter-spacing': '1' });
          var mini = bigDigit(g, 712, 110, 50, 92, 11); mini.set(0x5B); T(g, 742, 250, 'shows 2', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
        } },
        { cap: '<b>Four digits, one set of segment wires.</b> To save pins, the four digits share the same 8 segment lines; each digit has only its own digit pin. That means whatever pattern is on the segment lines appears on <b>every</b> digit whose pin is LOW. Switch on D1 and D3 together and they show the same number. So how do you show 1234? Next step.', draw: function (svg, S2, st) {
          st.layer.innerHTML = ''; var g = st.layer;
          var ds = [0, 1, 2, 3].map(function (i) { return bigDigit(g, 110 + i * 150, 60, 66, 120, 13); });
          for (var k = 0; k < 8; k++) S('line', { x1: 60, y1: 228 + k * 9, x2: 700, y2: 228 + k * 9, stroke: CY, 'stroke-width': 1.5, opacity: 0.6 }, g);
          T(g, 52, 262, 'a–dp', { 'text-anchor': 'end', 'font-size': 11, fill: CY });
          var pins = [0, 1, 2, 3].map(function (i) { var x = 148 + i * 150; S('line', { x1: x, y1: 196, x2: x, y2: 316, stroke: LINE, 'stroke-width': 3 }, g); return T(g, x, 334, 'D' + (i + 1), { 'text-anchor': 'middle', 'font-size': 12, fill: MUT }); });
          var lab = T(g, 760, 140, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
          var on = [[1, 0, 1, 0], [1, 1, 1, 1], [0, 0, 1, 0]], pat = [DIG[3], DIG[8], DIG[7]], j = 0;
          (function c() { var o = on[j % 3]; ds.forEach(function (d, i) { d.set(o[i] ? pat[j % 3] : 0); pins[i].setAttribute('fill', o[i] ? CY : MUT); pins[i].textContent = 'D' + (i + 1) + (o[i] ? ' LOW' : ''); }); j++; st.later(c, 1600); })();
        } }
      ] });
  }
  function segLab(b, ctx) {
    var NM = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The segment encoder</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 300', role: 'img', 'aria-label': 'A digit with clickable segments' }); stage.appendChild(svg);
    bg(svg, 820, 300);
    var d = bigDigit(svg, 100, 50, 100, 190, 24, { off: '#2a1414' }), v = 0;
    d.segs.forEach(function (s, i) { s.setAttribute('class', 'sim-btn'); s.setAttribute('tabindex', 0); s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'Segment ' + NM[i]); s.style.cursor = 'pointer'; s.addEventListener('click', function () { v ^= 1 << i; upd(); }); s.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); v ^= 1 << i; upd(); } }); });
    T(svg, 160, 290, 'CLICK THE SEGMENTS', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
    var cells = [];
    T(svg, 340, 60, 'SEGMENT', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' }); T(svg, 340, 92, 'BIT', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' }); T(svg, 340, 128, 'VALUE', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
    for (var i = 7; i >= 0; i--) { var x = 420 + (7 - i) * 48; T(svg, x, 60, NM[i], { 'text-anchor': 'middle', 'font-size': 14, fill: INK }); T(svg, x, 92, String(i), { 'text-anchor': 'middle', 'font-size': 11, fill: MUT }); var r = S('rect', { x: x - 18, y: 104, width: 36, height: 34, rx: 4, fill: PANEL, stroke: GRID }, svg); cells[i] = { r: r, t: T(svg, x, 128, '0', { 'text-anchor': 'middle', 'font-size': 18, fill: MUT }) }; }
    var big = T(svg, 590, 200, '', { 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 600, fill: INK }), match = T(svg, 590, 240, '', { 'text-anchor': 'middle', 'font-size': 14, fill: MUT, 'letter-spacing': '1' });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Load</label>';
    var pills = el('div', 'res-pills'); row.appendChild(pills); box.appendChild(row);
    for (var n = 0; n < 10; n++) (function (n) { var bt = el('button', '', String(n)); bt.type = 'button'; bt.addEventListener('click', function () { v = DIG[n]; upd(true); }); pills.appendChild(bt); })(n);
    var clr = el('button', '', 'Clear'); clr.type = 'button'; clr.addEventListener('click', function () { v = 0; upd(); }); pills.appendChild(clr);
    var ro = el('div', 'readouts'); box.appendChild(ro); b.appendChild(box);
    var built = ctx.check('seglab') || {};
    function upd(loaded) {
      d.set(v);
      for (var i = 0; i < 8; i++) { var on = (v >> i) & 1; cells[i].t.textContent = on; cells[i].t.setAttribute('fill', on ? CY : MUT); cells[i].r.setAttribute('stroke', on ? CY : GRID); }
      var m = DIG.indexOf(v & 0x7F);
      big.textContent = hex(v) + '  =  ' + v;
      match.textContent = m >= 0 ? 'THAT’S A ' + m + ((v & 0x80) ? ' WITH ITS DOT' : '') : v ? 'NOT A DIGIT (YET)' : 'ALL OFF';
      match.setAttribute('fill', m >= 0 ? GO : MUT);
      if (m >= 0 && !loaded) { built[m] = 1; ctx.check('seglab', built); }
      ro.innerHTML = '<div><span class="label">In code</span><span class="small"><code>show(' + hex(v) + ');</code></span></div><div><span class="label">Digits you built</span><span class="small">' + DIG.map(function (_, k) { return built[k] ? '<span style="color:var(--go);font-weight:600">' + k + '</span>' : '<span class="muted">' + k + '</span>'; }).join(' ') + '</span></div><div><span class="label">Try</span><span class="small">Make the letters F, S and G: the game uses them.</span></div>';
    }
    upd();
  }

  /* ---------- 07 code: digits ---------- */
  function decode(bits) { var d = DIG.indexOf(bits & 0x7F); return d; }
  steps.push({ id: 'digits', title: 'Code it: one digit, then four', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">First, one digit: switch on D1 and send it patterns from your table. Then the clever part: four different numbers on four digits that share the same wires.</p>');
    RL.Code.walk(b, ONE, [
      { lines: [6, 6], title: 'An array of pins', html: '<p><code>int DIGIT_PINS[4] = {2, 3, 4, 5};</code> is an <b>array</b>: four numbers under one name. <code>DIGIT_PINS[0]</code> is 2 (digit 1) and <code>DIGIT_PINS[3]</code> is 5 (digit 4). Arrays count from 0.</p>' },
      { lines: [8, 10], title: 'The pattern table', html: '<p>The bytes you built in the segment lab. <code>DIGITS[7]</code> is 0x07, the pattern for 7.</p>' },
      { lines: [22, 25], title: 'All digits off', html: '<p>A <code>for</code> loop sets each digit pin as an OUTPUT and HIGH. Common cathode: HIGH = off.</p>' },
      { lines: [26, 26], title: 'Digit 1 on', html: '<p>Only D1 goes LOW, so only the first digit lights.</p>' },
      { lines: [29, 34], title: '0 to 9', html: '<p>Send <code>DIGITS[0]</code>, <code>DIGITS[1]</code> … <code>DIGITS[9]</code>, half a second each.</p>' }
    ], { name: 'one_digit' });
    RL.Sim.create(b, { title: 'One digit', code: ONE, name: 'one_digit', key: 'sim-one', ctx: ctx, board: { parts: PARTS_B, show: IDS_DISP, view: VIEW_B, vb: VB9 }, shift: SHIFT_B, seg4: SEG4, runHint: 'watch digit 1.',
      checkAfter: 2800,
      check: function (log, sim) {
        var v = shiftVals(log), st = sim.state().seg, idx = 0;
        v.forEach(function (x) { if (x === DIG[idx]) idx++; });
        var r = idx < 4 ? { pass: false, msg: 'The patterns 0x3F, 0x06, 0x5B, 0x4F… should be sent in order. Check the DIGITS table and the loop.' }
          : !st[0] ? { pass: false, msg: 'The patterns are sent, but digit 1 isn’t lit. Its pin (2) must be an OUTPUT set LOW.' }
          : (st[1] || st[2] || st[3]) ? { pass: false, msg: 'Other digits are lit too. Only digit 1 should be LOW; the others HIGH.' }
          : { pass: true, msg: 'Digit 1 counts 0, 1, 2, 3… Your pattern table works.' };
        ctx.check('sim-one-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<h2>Multiplexing: four digits, one at a time</h2>');
    muxExplainer(b);
    UI.html(b, '<h2>Your turn: a 4-digit counter</h2><p>This sketch counts up every 100 ms and keeps the display alive with <code>showNextDigit()</code>, which lights one digit each time it’s called. Your job: finish <code>showNumber()</code>, which splits a number like 2047 into its four digits.</p>');
    RL.Code.walk(b, MULTI, [
      { lines: [10, 13], title: 'Memory for the display', html: '<p><code>screen[4]</code> holds the pattern for each digit. <code>current</code> remembers which digit is lit. <code>lastCount</code> remembers when we last counted.</p>' },
      { lines: [22, 26], title: 'Split a number into digits', html: '<p><code>%</code> means “remainder after dividing.” <code>2047 % 10</code> is <b>7</b>: the ones digit.</p><p>Integer division throws away the remainder: <code>2047 / 10</code> is <b>204</b>. Arduino works left to right, so <code>2047 / 10 % 10</code> is 204 % 10 = <b>4</b>: the tens. Your turn: the tens, hundreds and thousands.</p>' },
      { lines: [29, 34], title: 'One digit per call', html: '<p>Switch off the current digit <b>first</b>, then move on, send the next pattern, and switch that digit on. In that order there’s never a moment when one digit shows another digit’s pattern (that would “ghost”).</p>' },
      { lines: [46, 53], title: 'Never stop refreshing', html: '<p>The counting uses <code>millis()</code> instead of <code>delay(100)</code>. A delay would freeze the multiplexing, and only one digit would glow. Each pass lights the next digit for 3 ms — about 80 full sweeps a second.</p>' }
    ], { name: 'four_digits', download: false });
    RL.Sim.create(b, { title: 'Four-digit counter', code: MULTI, name: 'four_digits', key: 'sim-multi', ctx: ctx, board: { parts: PARTS_B, show: IDS_DISP, view: VIEW_B, vb: VB9 }, shift: SHIFT_B, seg4: SEG4, runHint: 'watch all four digits.',
      checkAfter: 1600,
      check: function (log, sim) {
        function num() { var s = sim.state().seg, n = 0; for (var i = 0; i < 4; i++) { var d = decode(s[i]); if (d < 0) return null; n = n * 10 + d; } return n; }
        var a = num();
        return sim.wait(1000).then(function () {
          var c = num(), s = sim.state().seg;
          var r = a == null || c == null ? (decode(s[3]) >= 0 && !s[0] ? { pass: false, msg: 'Only the last digit shows a number. Finish showNumber(): screen[2], screen[1] and screen[0] need the tens, hundreds and thousands.' } : { pass: false, msg: 'Some digits don’t show a valid number. Check your / and % maths in showNumber().' })
            : c - a < 5 || c - a > 16 ? { pass: false, msg: 'The display shows ' + a + ' then ' + c + ' a second later — it should go up by about 10. Check the digit order: thousands in screen[0], ones in screen[3].' }
            : { pass: true, msg: 'The display counted from ' + a + ' to ' + c + ' in one second, on all four digits. That’s multiplexing.' };
          ctx.check('sim-multi-pass', r.pass ? 1 : 0); return r;
        });
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the rest of showNumber()</summary><p class="small">Divide to drop the digits you’ve done, then take the remainder:</p>';
    RL.Code.block(hint, '  screen[2] = DIGITS[n / 10 % 10];       // tens\n  screen[1] = DIGITS[n / 100 % 10];      // hundreds\n  screen[0] = DIGITS[n / 1000 % 10];     // thousands', { download: false });
    b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">Upload it. Then try changing <code>delay(3)</code> to <code>delay(50)</code> and watch the digits flicker — you’ve slowed the multiplexing down enough to see it.</p>');
    UI.mcq(b, ctx, { id: 'q-mux', q: 'Your counter works, but you add <code>delay(1000)</code> at the end of loop() to slow the counting down. What happens to the display?', options: ['Nothing changes', 'Only one digit lights at a time, one per second, because showNextDigit() is only called once a second', 'All four digits get brighter', 'The numbers count backwards'], answer: 1, explain: 'Multiplexing only works if the digits are refreshed many times a second. Long delays break it — that’s why the counting uses millis().' });
  } });
  function muxExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Persistence of vision', w: 820, h: 330,
      init: function (svg, S2, st) {
        glowDefs(svg); bg(svg, 820, 330);
        var NUM = [DIG[1], DIG[2], DIG[3], DIG[4]];
        st.ds = [0, 1, 2, 3].map(function (i) { return bigDigit(svg, 70 + i * 130, 40, 66, 120, 13); });
        st.pins = [0, 1, 2, 3].map(function (i) { return T(svg, 103 + i * 130, 196, 'D' + (i + 1), { 'text-anchor': 'middle', 'font-size': 12, fill: MUT }); });
        // timing strip
        T(svg, 40, 230, 'DIGIT ON', { 'font-size': 9, fill: MUT, 'letter-spacing': '1' });
        st.lanes = [0, 1, 2, 3].map(function (i) { S('line', { x1: 110, y1: 244 + i * 18, x2: 760, y2: 244 + i * 18, stroke: GRID }, svg); T(svg, 100, 248 + i * 18, 'D' + (i + 1), { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); return S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 2 }, svg); });
        st.lab = T(svg, 780, 110, '', { 'text-anchor': 'end', 'font-size': 13, fill: CY, 'letter-spacing': '1' });
        st.lab2 = P(svg, 780, 134, '', { 'text-anchor': 'end', fill: MUT, 'font-size': 12 });
        var per = 700, mode = 'scan', cur = 0, lastSw = performance.now(), hist = [], raf;
        st.cfg = function (o) { per = o.per || 700; mode = o.mode || 'scan'; hist = []; st.lab.setAttribute('fill', CY); st.lab.textContent = o.lab || ''; st.lab2.textContent = o.lab2 || ''; };
        (function tick(t) {
          if (mode === 'both') { st.ds.forEach(function (d, i) { d.set(i < 2 ? DIG[1] : 0); st.pins[i].setAttribute('fill', i < 2 ? CY : MUT); }); st.lanes.forEach(function (l, i) { l.setAttribute('points', i < 2 ? '110,' + (238 + i * 18) + ' 760,' + (238 + i * 18) : '110,' + (244 + i * 18) + ' 760,' + (244 + i * 18)); }); raf = requestAnimationFrame(tick); return; }
          var fast = per < 30;
          if (t - lastSw >= per) { cur = (cur + 1) % 4; lastSw = t; }
          // timing strip: last ~650px of history
          var phase = fast ? (t / 4) % 650 : null;
          st.ds.forEach(function (d, i) {
            if (fast) d.set(NUM[i] | (mode === 'ghost' ? 0 : 0), 0.82); else d.set(i === cur ? NUM[i] : 0);
            st.pins[i].setAttribute('fill', fast || i === cur ? CY : MUT);
          });
          if (mode === 'ghost') st.ds.forEach(function (d, i) { var nxt = NUM[(i + 1) % 4]; d.segs.forEach(function (s, k) { var own = (NUM[i] >> k) & 1, gh = (nxt >> k) & 1; if (!own && gh) { s.setAttribute('fill', SEG_ON); s.setAttribute('opacity', 0.22); } }); });
          st.lanes.forEach(function (l, i) {
            var pts = [], w = fast ? 4 : Math.max(16, 650 * per / 2800), y0 = 244 + i * 18, period = w * 4, off = fast ? phase : ((t - lastSw) / per) * w + cur * w;
            for (var x = 0; x < 650; x += 2) { var ph = ((x + period * 10 - off) % period + period) % period, on = ph >= i * w && ph < (i + 1) * w; pts.push((110 + x) + ',' + (on ? y0 - 6 : y0)); }
            l.setAttribute('points', pts.join(' '));
          });
          raf = requestAnimationFrame(tick);
        })(performance.now());
        st.stop = function () { cancelAnimationFrame(raf); };
      },
      frames: [
        { cap: '<b>The problem.</b> All four digits share the segment wires, so if D1 and D2 are both LOW, they both show the same pattern. You can’t show “1234” by switching on all four digits at once.', draw: function (svg, S2, st) { st.cfg({ mode: 'both', lab: 'D1 + D2 LOW', lab2: 'both show the same pattern' }); } },
        { cap: '<b>So light one digit at a time.</b> Send the pattern for 1 and switch on D1. Switch D1 off, send 2, switch on D2. Then 3 on D3, 4 on D4, and around again. Here it is in slow motion: 0.7 seconds per digit.', draw: function (svg, S2, st) { st.cfg({ per: 700, lab: '700 ms PER DIGIT', lab2: 'slow motion' }); } },
        { cap: '<b>Faster…</b> At 60 ms per digit, each digit is lit about 4 times a second. You can see the flicker, and your brain starts to blend the digits together.', draw: function (svg, S2, st) { st.cfg({ per: 60, lab: '60 ms PER DIGIT', lab2: 'about 4 sweeps a second: flickery' }); } },
        { cap: '<b>Fast enough to fool you.</b> At 3 ms per digit the whole display is refreshed over 80 times a second. Your eyes keep seeing light for a moment after it’s gone (<b>persistence of vision</b>), so anything faster than about 50 flashes a second looks steady. All four digits seem lit, even though only one ever is. Each digit is lit a quarter of the time, so it looks a little dimmer.', draw: function (svg, S2, st) { st.cfg({ per: 3, lab: '3 ms PER DIGIT', lab2: '80+ sweeps a second: looks steady' }); } },
        { cap: '<b>Order matters.</b> If you send the next pattern <i>before</i> switching off the digit that’s on, that digit briefly shows the wrong pattern, and you see faint “ghost” segments. Always: digit off → new pattern → next digit on.', draw: function (svg, S2, st) { st.cfg({ per: 3, mode: 'ghost', lab: 'WRONG ORDER = GHOSTING', lab2: 'faint segments from the next digit' }); st.lab.setAttribute('fill', SIG); } }
      ] });
  }

  /* ---------- 08 timing + state machine ---------- */
  steps.push({ id: 'timing', title: 'Timing and game logic', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A reaction game needs two things you haven’t done yet: measuring time to the millisecond, and doing several things at once — keeping the display alive, watching two buttons, and waiting a random time. The tools: <code>millis()</code> and a <b>state machine</b>.</p>');
    UI.html(b, '<h2>How fast are you?</h2><p>Test yourself first. Wait for the box to turn cyan, then click it (or press the space bar) as fast as you can. Do it five times.</p>');
    reactionLab(b, ctx);
    millisExplainer(b);
    UI.numq(b, ctx, { id: 'q-millis', q: 'The beep happened at <code>goTime = 6200</code>. Player 1’s button was read as pressed when <code>millis()</code> was <code>6431</code>. What’s their reaction time in ms?', answer: 231, tol: 0, unit: 'ms', explain: '6431 − 6200 = <b>231 ms</b>, a pretty good reaction.', hint: 'Reaction time = the time of the press − the time of the beep.' });
    UI.html(b, '<h2>Plan the game as a state machine</h2><p>Instead of one long sequence full of delays, the game is always in one of four <b>states</b>. Every pass through loop() asks: “What state am I in, and did anything happen that moves me to another state?”</p>');
    stateExplainer(b);
    UI.mcq(b, ctx, { id: 'q-state', q: 'The game is in the <b>READY</b> state (waiting for the random time to pass) and player 2 presses their button. Where does the game go?', options: ['GO', 'RESULT, showing a false start for player 2', 'WAITING', 'It ignores the press'], answer: 1, explain: 'Pressing during READY means you jumped the gun: the game shows FS-2 and goes to RESULT.' });
  } });
  function reactionLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The reaction tester</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 240', role: 'button', tabindex: 0, 'aria-label': 'Reaction test: click or press space when the box turns cyan' }); stage.appendChild(svg);
    svg.style.cursor = 'pointer';
    var pad = S('rect', { x: 0, y: 0, width: 820, height: 240, fill: PANEL }, svg);
    var big = T(svg, 410, 118, 'CLICK TO START', { 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: INK, 'letter-spacing': '3' });
    var small = P(svg, 410, 156, 'Wait for cyan, then click as fast as you can.', { 'text-anchor': 'middle', fill: MUT, 'font-size': 15 });
    var ro = el('div', 'readouts'); box.appendChild(ro); b.appendChild(box);
    var state = 'idle', goAt = 0, timer = null, times = (ctx.check('rlab') || {}).times || [];
    function render() {
      var avg = times.length ? Math.round(times.reduce(function (a, c) { return a + c; }, 0) / times.length) : null, best = times.length ? Math.min.apply(null, times) : null;
      ro.innerHTML = '<div><span class="label">Last 5</span><b>' + (times.length ? times.slice(-5).join(', ') + ' ms' : '—') + '</b></div><div><span class="label">Best</span><b>' + (best != null ? best + ' ms' : '—') + '</b></div><div><span class="label">Average</span><b>' + (avg != null ? avg + ' ms' : '—') + '</b></div><div><span class="label">Typical human</span><span class="small">about 250 ms to a light (a sound is a little faster)</span></div>';
    }
    function set(fill, a, s2, col) { pad.setAttribute('fill', fill); big.textContent = a; small.textContent = s2; big.setAttribute('fill', col || INK); }
    function hit() {
      if (state === 'idle' || state === 'done' || state === 'early') { state = 'wait'; set('#0b1220', 'WAIT…', 'Don’t click yet.'); timer = setTimeout(function () { state = 'go'; goAt = performance.now(); set(CY, 'CLICK!', '', BG); small.setAttribute('fill', BG); }, 1500 + Math.random() * 2500); }
      else if (state === 'wait') { clearTimeout(timer); state = 'early'; set('#2a160b', 'TOO SOON!', 'False start. Click to try again.', SIG); small.setAttribute('fill', MUT); }
      else if (state === 'go') { var ms = Math.round(performance.now() - goAt); times.push(ms); times = times.slice(-20); ctx.check('rlab', { times: times }); state = 'done'; set(PANEL, ms + ' ms', ms < 200 ? 'Lightning fast! Click to go again.' : ms < 300 ? 'Right around a typical human. Click to go again.' : 'Click to go again — try to beat it.', CY); small.setAttribute('fill', MUT); render(); }
    }
    svg.addEventListener('pointerdown', function (e) { e.preventDefault(); hit(); });
    svg.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); } });
    if (RL.onLeave) RL.onLeave(function () { clearTimeout(timer); });
    render();
    UI.html(b, '<p class="small muted">Your measured time includes the delay of your screen and mouse (often 20–50 ms). The UNO version is more accurate: it checks the buttons every 2–3 ms.</p>');
  }
  function millisExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Measuring time with millis()', w: 820, h: 300,
      init: function (svg, S2, st) { arrowDefs(svg); glowDefs(svg); st.layer = S('g', {}, svg); st.stop = function () { cancelAnimationFrame(st.raf); }; },
      frames: [
        { cap: '<b>millis() is a stopwatch that never stops.</b> It returns how many milliseconds have passed since the UNO powered on or reset. It doesn’t pause your program — it just tells you the time whenever you ask.', draw: function (svg, S2, st) {
          cancelAnimationFrame(st.raf); clear(svg); arrowDefs(svg); glowDefs(svg); bg(svg, 820, 300);
          T(svg, 410, 110, 'millis()', { 'text-anchor': 'middle', 'font-size': 20, fill: MUT });
          var c = T(svg, 410, 180, '0', { 'text-anchor': 'middle', 'font-size': 56, 'font-weight': 600, fill: CY }), t0 = performance.now();
          (function tick(t) { c.textContent = Math.floor(t - t0 + 4210).toLocaleString('en-CA'); st.raf = requestAnimationFrame(tick); })(t0);
          P(svg, 410, 230, 'milliseconds since power-on (1000 per second)', { 'text-anchor': 'middle', fill: MUT });
        } },
        { cap: '<b>Measuring a reaction is a subtraction.</b> When the beep sounds, remember the time: <code>goTime = millis();</code>. When the button is pressed, subtract: <code>reaction = millis() - goTime;</code>. 4447 − 4210 = 237 ms.', draw: function (svg, S2, st) {
          cancelAnimationFrame(st.raf); clear(svg); arrowDefs(svg); glowDefs(svg); bg(svg, 820, 300);
          var x0 = 80, x1 = 740; function X(ms) { return x0 + (ms - 4000) / 600 * (x1 - x0); }
          S('line', { x1: x0, y1: 160, x2: x1, y2: 160, stroke: LINE, 'stroke-width': 2, 'marker-end': 'url(#m9a-l)' }, svg);
          for (var m = 4000; m <= 4550; m += 50) { S('line', { x1: X(m), y1: 154, x2: X(m), y2: 166, stroke: LINE }, svg); if (m % 100 === 0) T(svg, X(m), 186, String(m), { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); }
          T(svg, x1, 206, 'millis()', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
          S('line', { x1: X(4210), y1: 90, x2: X(4210), y2: 160, stroke: CY, 'stroke-width': 3 }, svg); T(svg, X(4210), 80, 'BEEP · goTime = 4210', { 'text-anchor': 'middle', 'font-size': 12, fill: CY });
          var cur = S('line', { x1: X(4210), y1: 120, x2: X(4210), y2: 160, stroke: GO, 'stroke-width': 3 }, svg), band = S('rect', { x: X(4210), y: 140, width: 0, height: 14, fill: CY, opacity: 0.25 }, svg);
          var lab = T(svg, X(4447), 80, '', { 'text-anchor': 'middle', 'font-size': 12, fill: GO }), res = T(svg, 410, 250, '', { 'text-anchor': 'middle', 'font-size': 20, fill: INK });
          var t0 = performance.now();
          (function tick(t) { var ms = Math.min(4447, 4210 + (t - t0) / 6); cur.setAttribute('x1', X(ms)); cur.setAttribute('x2', X(ms)); band.setAttribute('width', X(ms) - X(4210)); res.textContent = 'reaction = ' + Math.floor(ms) + ' − 4210 = ' + Math.floor(ms - 4210) + ' ms'; if (ms >= 4447) { lab.textContent = 'PRESS · millis() = 4447'; res.setAttribute('fill', GO); } else st.raf = requestAnimationFrame(tick); })(t0);
        } },
        { cap: '<b>Why not just use delay()?</b> During <code>delay(3000)</code> the UNO does nothing else: it can’t refresh the display (one digit stays lit, the rest go dark) and it can’t see a button press. A player who presses early would never be caught.', draw: function (svg, S2, st) {
          cancelAnimationFrame(st.raf); clear(svg); arrowDefs(svg); glowDefs(svg); bg(svg, 820, 300);
          var ds = [0, 1, 2, 3].map(function (i) { return bigDigit(svg, 120 + i * 80, 50, 40, 76, 9); });
          T(svg, 600, 70, 'delay(3000);', { 'font-size': 18, fill: SIG });
          var bar = S('rect', { x: 500, y: 90, width: 0, height: 14, fill: SIG, opacity: 0.6 }, svg); S('rect', { x: 500, y: 90, width: 260, height: 14, fill: 'none', stroke: SIG }, svg);
          var btn = S('circle', { cx: 300, cy: 220, r: 28, fill: '#e5484d', stroke: '#111', 'stroke-width': 2 }, svg), miss = T(svg, 360, 228, '', { 'font-size': 16, fill: SIG, 'letter-spacing': '2' });
          T(svg, 300, 274, 'PLAYER 1', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT, 'letter-spacing': '1.5' });
          var t0 = performance.now();
          (function tick(t) {
            var e = (t - t0) % 4200, inDelay = e > 600 && e < 3600;
            ds.forEach(function (d, i) { d.set(inDelay ? (i === 3 ? DIG[0] : 0) : 0x40, inDelay ? 1 : 0.85); });
            bar.setAttribute('width', inDelay ? (e - 600) / 3000 * 260 : 0);
            var pr = e > 1600 && e < 2000; btn.setAttribute('fill', pr ? CY : '#e5484d'); btn.setAttribute('r', pr ? 24 : 28); miss.textContent = e > 1600 && e < 3600 ? 'PRESS MISSED!' : '';
            st.raf = requestAnimationFrame(tick);
          })(t0);
        } },
        { cap: '<b>Check, don’t wait.</b> The game’s loop() runs every 2–3 ms. Each pass it refreshes one digit, reads both buttons, and compares <code>millis()</code> with <code>goTime</code>. Nothing ever blocks, so the display never goes dark and no press is missed.', draw: function (svg, S2, st) {
          cancelAnimationFrame(st.raf); clear(svg); arrowDefs(svg); glowDefs(svg); bg(svg, 820, 300);
          var items = ['showNextDigit()', 'read both buttons', 'millis() ≥ goTime ?', 'delay(2)'], boxes = items.map(function (s, i) { var a = i * Math.PI / 2 - Math.PI / 2, x = 410 + 190 * Math.cos(a), y = 150 + 100 * Math.sin(a); var r = S('rect', { x: x - 90, y: y - 20, width: 180, height: 40, rx: 4, fill: PANEL, stroke: GRID, 'stroke-width': 2 }, svg); T(svg, x, y + 5, s, { 'text-anchor': 'middle', 'font-size': 13 }); return r; });
          T(svg, 410, 156, 'loop()', { 'text-anchor': 'middle', 'font-size': 14, fill: MUT }); T(svg, 410, 176, 'every ~3 ms', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
          var k = 0; (function c() { boxes.forEach(function (bx, i) { bx.setAttribute('stroke', i === k % 4 ? CY : GRID); }); k++; st.later(c, 260); })();
        } }
      ] });
  }
  function stateExplainer(b) {
    var POS = { WAITING: [60, 50], READY: [370, 50], GO: [370, 250], RESULT: [60, 250] };
    UI.explainer(b, { label: 'Flowchart', title: 'The game as a state machine', w: 820, h: 380,
      init: function (svg, S2, st) {
        arrowDefs(svg); glowDefs(svg); bg(svg, 820, 380);
        var arr = {};
        function arrow(id, d, lab, lx, ly, col) { arr[id] = S('path', { d: d, fill: 'none', stroke: col || LINE, 'stroke-width': 2, 'marker-end': 'url(#m9a-' + (col === SIG ? 'o' : 'l') + ')' }, svg); arr[id]._c = col || LINE; arr[id]._lab = P(svg, lx, ly, lab, { 'font-size': 12, fill: col === SIG ? SIG : MUT }); }
        arrow('wr', 'M250 80 L366 80', 'a button is pressed', 256, 70);
        arrow('rg', 'M465 112 L465 246', 'random wait is over', 474, 184);
        arrow('gr', 'M366 282 L254 282', 'both pressed, or 3 s', 256, 306);
        arrow('rr', 'M140 246 L140 116 L366 100', 'a button (after 1.5 s)', 150, 160);
        arrow('fs', 'M380 112 L246 250', 'pressed too early!', 300, 222, SIG);
        st.boxes = {};
        Object.keys(POS).forEach(function (k) { var p = POS[k]; st.boxes[k] = S('rect', { x: p[0], y: p[1], width: 190, height: 62, rx: 6, fill: PANEL, stroke: LINE, 'stroke-width': 2 }, svg); T(svg, p[0] + 95, p[1] + 38, k, { 'text-anchor': 'middle', 'font-size': 15, 'letter-spacing': '2' }); });
        // mini display + notes
        S('rect', { x: 600, y: 40, width: 200, height: 84, rx: 6, fill: '#0b0d10', stroke: GRID }, svg);
        st.ds = [0, 1, 2, 3].map(function (i) { return bigDigit(svg, 616 + i * 46, 56, 24, 48, 6); });
        st.note = T(svg, 604, 160, '', { 'font-size': 10.5, fill: INK }); st.note2 = T(svg, 604, 180, '', { 'font-size': 10.5, fill: MUT }); st.note3 = T(svg, 604, 200, '', { 'font-size': 10.5, fill: MUT });
        st.buzz = T(svg, 700, 240, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY, 'letter-spacing': '2' });
        st.at = function (state, arrows, disp, n1, n2, n3, buzz) {
          Object.keys(st.boxes).forEach(function (k) { var on = k === state; st.boxes[k].setAttribute('stroke', on ? (state === 'RESULT' && arrows.indexOf('fs') >= 0 ? SIG : CY) : LINE); st.boxes[k].setAttribute('fill', on ? '#0a2a36' : PANEL); st.boxes[k].setAttribute('stroke-width', on ? 3 : 2); });
          Object.keys(arr).forEach(function (k) { var on = arrows.indexOf(k) >= 0; arr[k].setAttribute('stroke', on ? (arr[k]._c === SIG ? SIG : CY) : (arr[k]._c === SIG ? '#6b3b20' : '#3b4b5e')); arr[k].setAttribute('stroke-width', on ? 3 : 2); });
          st.ds.forEach(function (d, i) { d.set(disp[i]); }); st.note.textContent = n1 || ''; st.note2.textContent = n2 || ''; st.note3.textContent = n3 || ''; st.buzz.textContent = buzz ? 'BEEP!' : '';
        };
      },
      frames: [
        { cap: '<b>WAITING.</b> The game has just started. The display shows dashes and loop() keeps checking the buttons. A press starts a round.', draw: function (svg, S2, st) { st.at('WAITING', ['wr'], DASH4, 'if (p1 || p2)', '  startRound();'); } },
        { cap: '<b>READY.</b> <code>startRound()</code> picks a random moment 2 to 5 seconds away: <code>goTime = millis() + random(2000, 5000);</code>. Each pass, loop() checks two things: has anyone pressed (too early!), and has <code>millis()</code> reached <code>goTime</code>?', draw: function (svg, S2, st) { st.at('READY', ['rg', 'fs'], DASH4, 'goTime = millis() +', '   random(2000, 5000);', 'pressed? FS · time? GO'); } },
        { cap: '<b>GO.</b> The buzzer beeps and the display shows GO. Now <code>goTime</code> is reset to the moment of the beep, and the first time each button is seen pressed, that player’s time is saved: <code>p1Time = now - goTime;</code>.', draw: function (svg, S2, st) { st.at('GO', ['gr'], [0, 0x3D, 0x3F, 0], 'p1Time = now - goTime;', 'p2Time = now - goTime;', 'until both pressed, or 3 s', true); } },
        { cap: '<b>RESULT.</b> <code>finishRound()</code> compares the two times and shows the winner — the player number with a dot, then the milliseconds. After a short pause (so a late press doesn’t start a new round by accident), any press starts the next round.', draw: function (svg, S2, st) { st.at('RESULT', ['rr'], resultBytes(2, 248), 'Player 2 wins: 2.248', 'a press after 1.5 s →', 'startRound() again'); } },
        { cap: '<b>The false start.</b> If a button is pressed while the game is READY, it skips GO entirely: <code>falseStart()</code> shows <b>FS</b>, a dash, and the guilty player’s number, buzzes, and goes to RESULT.', draw: function (svg, S2, st) { st.at('READY', ['fs'], DASH4, 'player 1 presses during READY…'); st.later(function () { st.at('RESULT', ['fs'], [0x71, 0x6D, 0x40, DIG[1]], 'FS-1: false start by player 1', 'buzzer: a long bzzzt', '', true); }, 1300); } }
      ] });
  }

  /* ---------- 09 code: the game ---------- */
  steps.push({ id: 'game', title: 'Code it: the reaction game', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Last wiring: two player buttons and the GO buzzer. Then the full game — every idea from this mission working together.</p>');
    B.guide(b, { title: 'Buttons + buzzer', parts: PARTS_B, vb: VB9, base: IDS_DISP, steps: [
      { title: 'Start from the display circuit', view: 'all', html: '<p>Your Part B circuit stays exactly as it is.</p>' },
      { title: 'Player 2 button', add: ['p2', 'w7', 'pg2'], html: '<p>Each player gets a push button on a cardboard press pad (you’ll build the pads in the next step; for now the button can sit on the desk). Use two <b>diagonally opposite legs</b> — they’re always on opposite sides of the switch.</p><p><b>One leg → pin 7</b>, the other → <b>− rail</b>. No resistor needed: the code turns on the UNO’s built-in <b>pull-up</b> resistor.</p>' },
      { title: 'Player 1 button', add: ['p1', 'w6', 'pg1'], html: '<p>Same again: <b>one leg → pin 6</b>, the other → <b>− rail</b>.</p>' },
      { title: 'The GO buzzer', add: ['bz', 'wbz', 'gbz'], html: '<p>The <b>active</b> buzzer (the one with a sticker on top). Its <b>+ leg</b> (the longer one, marked +) → <b>pin 12</b>, the other leg → <b>− rail</b>. It beeps whenever pin 12 is HIGH.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Pins 2–5: digits. Pins 6 and 7: buttons. Pins 8, 9, 10: the shift register. Pin 12: buzzer. That’s every pin from 2 to 12 except 11 — a full house.</p>' }
    ] });
    UI.callout(b, 'plain', 'INPUT_PULLUP vs the Mission 01 pull-down', '<p>In Mission 01 a 10 kΩ resistor pulled the button pin <b>down</b> to LOW, and pressing made it HIGH. <code>pinMode(pin, INPUT_PULLUP)</code> switches on a resistor <b>inside</b> the UNO that pulls the pin <b>up</b> to HIGH; pressing connects it to ground, so <b>pressed = LOW</b>. One less part per button — handy when the buttons live at the end of long wires.</p>');
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, GAMECODE, [
      { lines: [9, 15], title: 'Every pin', html: '<p>The shift register, the four digit pins (an array), two buttons and the buzzer. Check them against your wiring.</p>' },
      { lines: [17, 26], title: 'Patterns', html: '<p>The digit table, plus a few extra patterns: blank, a dash (just g), the dot, and the letters F, S, G and O. You designed some of these in the segment lab.</p>' },
      { lines: [28, 33], title: 'The states', html: '<p>Each state gets a name and a number. <code>state</code> holds the one the game is in now. Names like READY make the code far easier to read than 0, 1, 2, 3.</p>' },
      { lines: [35, 40], title: 'The game’s memory', html: '<p>What the screen shows, which digit is lit, when GO happens, when the last round ended, and each player’s time. <code>unsigned long</code> is the type for <code>millis()</code> values.</p>' },
      { lines: [50, 53], title: 'Pull-ups and a random seed', html: '<p><code>INPUT_PULLUP</code>: pressed = LOW. <code>random()</code> isn’t truly random — it follows a long fixed sequence. <code>randomSeed(analogRead(A0))</code> starts the sequence at a different place every time, using the random electrical noise on an unconnected pin.</p>' },
      { lines: [59, 62], title: 'Every pass', html: '<p>Refresh one digit, note the time, and read both buttons. <code>digitalRead(...) == LOW</code> is <code>true</code> when the button is pressed.</p>' },
      { lines: [64, 74], title: 'WAITING and READY', html: '<p>In WAITING, any press starts a round. In READY, a press means a false start; otherwise, once <code>now</code> reaches <code>goTime</code>: buzzer on, show GO, remember the exact moment, and switch to GO.</p>' },
      { lines: [75, 81], title: 'GO', html: '<p>After 200 ms the beep stops. The <b>first</b> time each button is seen pressed, its reaction time is saved (<code>p1Time == 0</code> means “not saved yet”). When both have pressed, or 3 s have passed, the round is over.</p>' },
      { lines: [82, 85], title: 'RESULT', html: '<p>Switch off a false-start buzz after 400 ms. After 1.5 s, a press starts the next round.</p>' },
      { lines: [89, 100], title: 'startRound()', html: '<p>Dashes, then a <code>while</code> loop that waits until both buttons are released (otherwise the press that started the round would count as a false start). Then pick the random GO time and reset both times.</p>' },
      { lines: [102, 109], title: 'falseStart()', html: '<p>Show FS-1 or FS-2, report it, buzz, and go to RESULT.</p>' },
      { lines: [111, 130], title: 'finishRound()', html: '<p>Print both times, then decide: nobody pressed; player 1 wins if player 2 never pressed or player 1 was faster (or tied); otherwise player 2 wins.</p>' },
      { lines: [132, 136], title: 'showResult()', html: '<p>The winner’s number with the dot added (<code>| DOT</code> switches on bit 7), then hundreds, tens and ones of the time — the same / and % trick as your counter.</p>' }
    ], { name: 'reaction_timer' });
    UI.html(b, '<h2>Play it on the Virtual UNO</h2><p>Click a button to start, wait for the beep (and GO), then click a button. Try jumping the gun too. <b>Check my code</b> plays a false start and a full round.</p>');
    RL.Sim.create(b, { title: 'Reaction timer', code: GAMECODE, name: 'reaction_timer', key: 'sim-game', ctx: ctx, board: { parts: PARTS_B, show: IDS_GAME, view: VIEW_B, vb: VB9 }, shift: SHIFT_B, seg4: SEG4,
      buttons: { 6: { part: 'p1', wiring: 'pullup', label: 'Player 1 button' }, 7: { part: 'p2', wiring: 'pullup', label: 'Player 2 button' } }, buzzers: { 12: { part: 'bz', type: 'active' } }, analog: { 0: { hidden: true, value: 517 } },
      runHint: 'click a player button to start a round.', checkAfter: 400,
      check: function (log, sim) {
        function tap(pin, ms) { sim.press(pin, true); return sim.wait(ms || 150).then(function () { sim.press(pin, false); }); }
        function segs() { return sim.state().seg.slice(); }
        function eq(a, bb) { return a.every(function (x, i) { return x === bb[i]; }); }
        var start;
        return tap(6).then(function () { return sim.wait(600); }).then(function () { return tap(7); }).then(function () { return sim.wait(300); }).then(function () {
          var txt = sim.serialText();
          if (!/false start/i.test(txt) && !eq(segs(), [0x71, 0x6D, 0x40, DIG[2]])) return { pass: false, msg: 'Player 2 pressed during READY (before GO) but no false start was caught. Check the READY branch.' };
          return sim.wait(1500).then(function () { start = log.length; return tap(6); }).then(function () {
            var t0 = Date.now();
            return (function poll() {
              var go = log.slice(start).some(function (e) { return e.pin === 12 && e.v; });
              if (go) return sim.wait(250).then(function () { sim.press(7, true); return sim.wait(120); }).then(function () { sim.press(6, true); return sim.wait(200); }).then(function () { sim.press(6, false); sim.press(7, false); return sim.wait(350); }).then(function () {
                var s = segs(), txt2 = sim.serialText(), ms = decode(s[1]) * 100 + decode(s[2]) * 10 + decode(s[3]);
                if (!/player 2 wins/i.test(txt2) && s[0] !== (DIG[2] | 0x80)) return { pass: false, msg: 'Player 2 pressed first (about 250 ms after GO), but didn’t win. Check finishRound().' };
                var sm = txt2.match(/Player 2: (\d+) ms/g), said = sm ? Number(/(\d+) ms/.exec(sm[sm.length - 1])[1]) : ms;
                if (Math.abs(Math.min(said, 999) - ms) > 1 || s[0] !== (DIG[2] | 0x80) || isNaN(ms) || ms < 180 || ms > 360) return { pass: false, msg: 'Player 2 won, but the display should show 2. and their time (about 250 ms). Check showResult().' };
                return { pass: true, msg: 'False start caught (FS-2), then a fair round: GO beep, player 2 wins in ' + ms + ' ms. Your game works!' };
              });
              if (Date.now() - t0 > 6500) return { pass: false, msg: 'No GO beep on pin 12 within 6 s of starting a round. Check the READY branch and goTime.' };
              return sim.wait(20).then(poll);
            })();
          });
        }).then(function (r) { ctx.check('sim-game-pass', r.pass ? 1 : 0); return r; });
      } });
    UI.html(b, '<h2>Upload and play</h2><p>Upload to your board, open the Serial Monitor at 9600 baud, and play a few rounds with your partner. The Serial Monitor shows both players’ times, even the loser’s.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>The display flickers or is very dim</b><br><span class="small muted">Something in loop() is blocking: look for a long delay(). Only delay(2) belongs there.</span></div></div><div class="trow"><div><b>Every round is a false start</b><br><span class="small muted">A button reads as pressed all the time: check INPUT_PULLUP, and that the two legs you used are diagonally opposite.</span></div></div><div class="trow"><div><b>Wrong segments light</b><br><span class="small muted">Two segment wires are swapped. Load a single segment (like 0x01 = a) to find which.</span></div></div><div class="trow"><div><b>Digits appear in the wrong order</b><br><span class="small muted">Two digit wires are swapped: pin 2 → D1 (display pin 12) … pin 5 → D4 (display pin 6).</span></div></div><div class="trow"><div><b>No beep</b><br><span class="small muted">Is it the active buzzer (sticker on top)? Is its + leg on pin 12?</span></div></div></div>');
  } });

  /* ---------- 10 game board ---------- */
  steps.push({ id: 'board', title: 'Build the game board', stage: '03 Imagine · 05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A reaction game lives or dies by its buttons. Players will slam them, so they need to be big, sturdy and far enough apart that nobody bumps elbows. The display needs a window everyone can read.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat, and let hot glue cool before touching it. Unplug the USB while you move the display and buttons onto their wires.</p>');
    gameBoardExplainer(b);
    UI.callout(b, '', 'Design ideas', '<ul><li>Give each player a colour and match their button cap to it.</li><li>Put the buttons at the two ends of the board so players face off.</li><li>Tissue paper or a strip of red plastic over the display window makes the digits easier to read in a bright room.</li><li>Add a scoreboard: tally marks on sticky notes, or the high-score challenge in the next step.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your game board, and why.', placeholder: 'I made the buttons… because…' });
  } });
  function gameBoardExplainer(b) {
    function base(svg) { clear(svg); glowDefs(svg); bg(svg, 800, 380); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard game board', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Plan.</b> Cut a sturdy piece of cardboard about <b>30 cm × 20 cm</b> (or use the lid of a box, which gives you space underneath for the wiring). Mark the display window in the middle and a button spot near each end.', draw: function (svg) {
        base(svg); var x0 = 175, y0 = 50, sc = 15;
        S('rect', { x: x0, y: y0, width: 30 * sc, height: 20 * sc, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg);
        S('rect', { x: x0 + 12.5 * sc, y: y0 + 4 * sc, width: 5 * sc, height: 2 * sc, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
        [[x0 + 5 * sc, y0 + 12 * sc], [x0 + 25 * sc, y0 + 12 * sc]].forEach(function (p) { S('circle', { cx: p[0], cy: p[1], r: 3 * sc, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg); });
        S('line', { x1: x0, y1: y0 - 14, x2: x0 + 30 * sc, y2: y0 - 14, stroke: CY }, svg); T(svg, x0 + 15 * sc, y0 - 20, '30 cm', { 'text-anchor': 'middle', fill: CY });
        S('line', { x1: x0 - 14, y1: y0, x2: x0 - 14, y2: y0 + 20 * sc, stroke: CY }, svg); T(svg, x0 - 20, y0 + 10 * sc + 4, '20 cm', { 'text-anchor': 'end', fill: CY });
        T(svg, x0 + 15 * sc, y0 + 3.2 * sc, 'DISPLAY WINDOW 5 × 2 cm', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11 });
        T(svg, x0 + 15 * sc, y0 + 9 * sc, 'buzzer', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11 }); S('circle', { cx: x0 + 15 * sc, cy: y0 + 10.5 * sc, r: 10, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg);
        T(svg, x0 + 5 * sc, y0 + 16.8 * sc, 'PLAYER 1', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11 }); T(svg, x0 + 25 * sc, y0 + 16.8 * sc, 'PLAYER 2', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11 });
      } },
      { cap: '<b>Step 2 · The display window.</b> Cut a <b>5 cm × 2 cm</b> window (the display’s face is about 5 × 1.9 cm). Tape the display behind it, digits facing out and the decimal points at the bottom, with its 12 female-to-male wires hanging down inside.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 200, y: 80, width: 400, height: 220, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 290, y: 150, width: 220, height: 80, fill: '#1a1208', 'class': 'part-new' }, svg);
        S('rect', { x: 296, y: 156, width: 208, height: 68, fill: '#0b0d10' }, svg);
        var ds = [0, 1, 2, 3].map(function (i) { return bigDigit(svg, 312 + i * 48, 168, 26, 44, 6); });
        var n = 0; (function c() { var v = String(1000 + (n * 37) % 9000); ds.forEach(function (d, i) { d.set(DIG[+v[i]]); }); n++; st.later(c, 500); })();
        T(svg, 400, 270, 'tape the display behind the window', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 12 });
      } },
      { cap: '<b>Step 3 · Big press targets.</b> Hot-glue each push button to a small cardboard square. Make a cardboard <b>flap</b> hinged with tape (or glue a bottle cap) so that pressing anywhere on it pushes the button. Wire the two diagonal legs with female-to-male wires before gluing.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 180, y: 260, width: 440, height: 30, fill: CBD }, svg); T(svg, 400, 320, 'SIDE VIEW', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        S('rect', { x: 370, y: 236, width: 60, height: 24, rx: 3, fill: '#1c2129' }, svg); var cap = S('rect', { x: 386, y: 222, width: 28, height: 14, rx: 3, fill: '#2b3038' }, svg);
        var flap = S('g', {}, svg); S('rect', { x: 230, y: 206, width: 300, height: 12, rx: 3, fill: CB, stroke: CBD, 'stroke-width': 2 }, flap); S('circle', { cx: 400, cy: 200, r: 30, fill: '#e5484d', stroke: '#111', 'stroke-width': 2 }, flap);
        S('rect', { x: 216, y: 200, width: 20, height: 60, fill: CBL, stroke: CBD }, svg); T(svg, 170, 196, 'tape hinge', { fill: MUT, 'font-size': 12 });
        T(svg, 560, 236, '← kit push button', { fill: MUT, 'font-size': 12 });
        var down = false; (function c() { down = !down; flap.setAttribute('transform', down ? 'rotate(2.2 226 212)' : ''); cap.setAttribute('fill', down ? CY : '#2b3038'); st.later(c, 700); })();
      } },
      { cap: '<b>Step 4 · Wire it underneath.</b> Run the display’s 12 wires and the buttons’ 4 wires to your breadboard. Label each wire with tape (D1, A, P1…) — future-you will be grateful. Keep the UNO and breadboard under or behind the board where hands can’t pull wires out.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 120, y: 40, width: 560, height: 150, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 2, opacity: 0.55 }, svg); T(svg, 400, 64, 'GAME BOARD (SEEN FROM BELOW)', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11, 'letter-spacing': '1' });
        S('rect', { x: 340, y: 100, width: 120, height: 40, fill: '#16191e' }, svg); [180, 620].forEach(function (x) { S('rect', { x: x - 20, y: 110, width: 40, height: 40, fill: '#1c2129' }, svg); });
        S('rect', { x: 300, y: 260, width: 200, height: 90, rx: 4, fill: '#d3dbe4' }, svg); T(svg, 400, 368, 'BREADBOARD + UNO', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        var cols = ['#e5484d', '#fb923c', '#facc15', '#22c55e', '#3b82f6', '#a78bfa', '#e5e7eb', '#9ca3af', '#3b82f6', '#22c55e', '#facc15', '#fb923c'];
        cols.forEach(function (c, i) { st.later(function () { S('path', { d: 'M' + (346 + i * 10) + ' 140 C ' + (346 + i * 10) + ' 200, ' + (320 + i * 14) + ' 220, ' + (320 + i * 14) + ' 262', stroke: c, 'stroke-width': 3, fill: 'none', 'class': 'part-new' }, svg); }, 100 + i * 80); });
        [[180, '#e5484d'], [620, '#3b82f6']].forEach(function (p, j) { st.later(function () { S('path', { d: 'M' + p[0] + ' 150 C ' + p[0] + ' 240, ' + (j ? 520 : 280) + ' 240, ' + (j ? 490 : 310) + ' 290', stroke: p[1], 'stroke-width': 3, fill: 'none', 'class': 'part-new' }, svg); S('path', { d: 'M' + (p[0] + 8) + ' 150 C ' + (p[0] + 8) + ' 250, ' + (j ? 524 : 284) + ' 250, ' + (j ? 494 : 314) + ' 300', stroke: '#30363f', 'stroke-width': 3, fill: 'none', 'class': 'part-new' }, svg); }, 1100 + j * 200); });
      } },
      { cap: '<b>Step 5 · Play-test.</b> Play ten rounds. Do both buttons always register? Can both players read the display? Does anything wobble or come loose when you slam a button? Fix it, then challenge another team.', draw: function (svg, S2, st) {
        base(svg); var a = boardArt(svg, 80, 60, 1);
        var seq = [[function () { a.show(DASH4); }, 1200], [function () { a.buzz(1); a.show([0, 0x3D, 0x3F, 0]); }, 260], [function () { a.buzz(0); a.press(1, 1); }, 200], [function () { a.press(1, 0); a.show(resultBytes(1, 213)); }, 2200]], i = 0;
        (function c() { var s2 = seq[i % seq.length]; s2[0](); i++; st.later(c, s2[1]); })();
      } }
    ] });
  }

  /* ---------- 11 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Fair start:</b> the wait before GO is different every round (you can’t predict it).',
      '<b>False start:</b> pressing before the beep always shows FS and the right player number.',
      '<b>Accurate:</b> the winner’s time is shown and matches the Serial Monitor.',
      '<b>Readable:</b> from where each player stands, all four digits are clear with no flicker or ghost segments.',
      '<b>Sturdy:</b> ten hard slams later, both buttons still work every time.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Best of 5', html: 'Turn it into a tournament: keep score across rounds and show the score (like <b>2-1</b>) between rounds. First to 3 wins; flash the winner’s number.', hint: 'Two <code>int</code> scores. Show them with <code>setScreen(DIGITS[s1], DASH, BLANK, DIGITS[s2])</code> or similar.' },
      { tag: 'Code', title: 'High score', html: 'Remember the fastest time ever and show <b>HI</b> plus the record when someone beats it. Extra: save it with <code>EEPROM</code> so it survives a reset.', hint: 'An <code>unsigned long best = 9999;</code> updated in finishRound(). EEPROM: <code>#include &lt;EEPROM.h&gt;</code> and <code>EEPROM.put()</code> / <code>EEPROM.get()</code>.' },
      { tag: 'Build + code', cls: 'c', title: 'Three players', html: 'Add a third button (pin 11 is free). Show the winner’s number 1, 2 or 3.', hint: 'An array of button pins and an array of times makes this much shorter than copying code three times.' },
      { tag: 'Code', title: 'Difficulty levels', html: 'Add an easy/hard mode: hard mode uses shorter random waits and fake-out “double beeps”, and calls a false start for anyone who presses on the fake.' },
      { tag: 'Build', title: 'Get-ready light', html: 'Bring back the LED bar on a second 74HC595, chained from Q7′ (pin 9) of the first, and use it as a countdown bar during READY.', hint: 'With two chips chained, call shiftOut twice before you latch: the first byte ends up in the far chip.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 12 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m09.evidence = {
    intro: 'Show your teacher your working reaction timer. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
    files: [
      { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of the finished game board and one close-up of the shift register wiring. Up to 4 photos.', required: true, max: 4 },
      { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: play one round to the end, and show one false start.', required: true, max: 1 },
      { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file or paste the code.', required: true, max: 2, fileName: 'reaction_timer' }
    ],
    questions: [
      { id: 'r1', q: 'Explain how the 74HC595 lets 3 UNO pins control 8 outputs. Use the words data, clock and latch.' },
      { id: 'r2', q: 'All four digits share the same 8 segment wires. How does your code show four different numbers at once? Why does it look steady to your eyes?' },
      { id: 'r3', q: 'How does your code measure a reaction time and catch a false start? Use millis() and the names of the states in your answer.' },
      { id: 'r4', q: 'Write the byte (in binary or hex) that shows the number 4 on a digit, and explain how you worked it out. Then describe one problem you solved in this mission.' }
    ]
  };
})(window);
