/* Mission 06: Fortune teller — the guide.
 * A cardboard "magic box": shake it and an LCD1602 shows a random answer; hold it tipped over to switch to a live
 * thermometer. Same structure as m01: { id, title, stage, time, render(body, ctx) }, last step = evidence form.
 * Circuit parts are shared below so the build guides and the Virtual UNO always match.
 * Layout note: the LCD's circuit board lies over the RIGHT-hand rails, so everything is powered from the LEFT rails. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', BG = '#070d17';
  var SANS = 'IBM Plex Sans, sans-serif';
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  function ln(src, s, from) { var a = src.split('\n'); for (var i = (from || 1) - 1; i < a.length; i++) if (a[i].indexOf(s) >= 0) return i + 1; throw new Error('m06: line not found: ' + s); }
  function bgGrid(svg, w, h) { S('rect', { x: 0, y: 0, width: w, height: h, fill: BG }, svg); for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, opacity: 0.35 }, svg); for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, opacity: 0.35 }, svg); }
  function glowDefs(svg) {
    var d = svg.querySelector('defs') || S('defs', {}, svg);
    [['cyan', CY], ['blue', '#6ea8ff'], ['orange', SIG], ['white', '#f4f7fb']].forEach(function (c) {
      if (d.querySelector('#m6g-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm6g-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  function pad16(s) { s = String(s); while (s.length < 16) s += ' '; return s.slice(0, 16); }

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → left + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-2', color: 'black', name: 'Black wire: GND → left − rail' }
  };
  var LCD = {
    lcd: { type: 'lcd', at: 'j3', name: 'LCD1602 (pins in j3–j18)' },
    l_vss: { type: 'wire', from: 'L-3', to: 'f3', color: 'black', via: [[480, 102]], name: 'Black: − rail → f3 (VSS)' },
    l_vdd: { type: 'wire', from: 'L+4', to: 'f4', color: 'red', via: [[480, 118]], name: 'Red: + rail → f4 (VDD)' },
    pot: { type: 'pot', at: 'c21', label: ' ', name: '10 kΩ potentiometer' },
    pot5: { type: 'wire', from: 'd21', to: 'L+21', color: 'red', name: 'Red: d21 → + rail' },
    potg: { type: 'wire', from: 'L-25', to: 'd25', color: 'black', via: [[455, 454]], name: 'Black: − rail → d25' },
    potw: { type: 'wire', from: 'e23', to: 'f5', color: 'green', via: [[538, 410], [540, 300], [540, 160]], name: 'Green: wiper e23 → f5 (V0)' },
    l_rw: { type: 'wire', from: 'L-7', to: 'f7', color: 'black', via: [[480, 166]], name: 'Black: − rail → f7 (RW)' },
    l_rs: { type: 'wire', from: 'D7', to: 'g6', color: 'orange', name: 'Orange: pin 7 → g6 (RS)' },
    l_e: { type: 'wire', from: 'D8', to: 'g8', color: 'yellow', name: 'Yellow: pin 8 → g8 (E)' },
    l_d4: { type: 'wire', from: 'D9', to: 'g13', color: 'green', name: 'Green: pin 9 → g13 (D4)' },
    l_d5: { type: 'wire', from: 'D10', to: 'g14', color: 'blue', name: 'Blue: pin 10 → g14 (D5)' },
    l_d6: { type: 'wire', from: 'D11', to: 'g15', color: 'purple', name: 'Purple: pin 11 → g15 (D6)' },
    l_d7: { type: 'wire', from: 'D12', to: 'g16', color: 'white', name: 'White: pin 12 → g16 (D7)' },
    l_blr: { type: 'res', from: 'L+17', to: 'a17', ohms: 220, name: '220 Ω resistor: + rail → a17' },
    l_bla: { type: 'wire', from: 'c17', to: 'f17', color: 'red', via: [[520, 326]], name: 'Red: c17 → f17 (A)' },
    l_k: { type: 'wire', from: 'L-18', to: 'f18', color: 'black', via: [[480, 342]], name: 'Black: − rail → f18 (K)' }
  };
  var TILT = {
    tilt: { type: 'tilt', from: 'h19', to: 'h21', name: 'Tilt ball switch' },
    t_d2: { type: 'wire', from: 'D2', to: 'f19', color: 'blue', via: [[420, 360]], name: 'Blue: pin 2 → f19' },
    t_g: { type: 'wire', from: 'g21', to: 'g18', color: 'black', name: 'Black: g21 → g18 (ground)' }
  };
  var THERM = {
    th5: { type: 'wire', from: 'L+27', to: 'a27', color: 'red', name: 'Red: + rail → a27' },
    th: { type: 'therm', from: 'c27', to: 'c29', name: 'Thermistor' },
    thr: { type: 'res', from: 'a29', to: 'L-29', ohms: 10000, name: '10 kΩ resistor: a29 → − rail' },
    tha: { type: 'wire', from: 'A0', to: 'e29', color: 'yellow', via: [[10, 380], [14, 520], [90, 552], [400, 555], [530, 552], [536, 532]], name: 'Yellow: A0 → e29' }
  };
  var ALL = merge(POWER, LCD, TILT, THERM);
  var IDS_LCD = Object.keys(merge(POWER, LCD)), IDS_TILT = IDS_LCD.concat(Object.keys(TILT)), IDS_THERM = IDS_LCD.concat(Object.keys(THERM)), IDS_ALL = Object.keys(ALL);
  var WIDE = B.WIDE, SIM_VIEW = [290, 30, 706, 540];

  /* ================= code ================= */
  var HELLO = [
    '// Hello, LCD: your first words on the screen',
    '#include <LiquidCrystal.h>      // the library that talks to the LCD',
    '',
    '// LiquidCrystal lcd(RS, E, D4, D5, D6, D7);',
    'LiquidCrystal lcd(7, 8, 9, 10, 11, 12);',
    '',
    'void setup() {',
    '  lcd.begin(16, 2);             // 16 columns, 2 rows',
    '  lcd.print("Hello, LCD!");     // starts at column 0, row 0',
    '}',
    '',
    'void loop() {',
    '  lcd.setCursor(0, 1);          // column 0, row 1 (the bottom row)',
    '  lcd.print("Awake: ");',
    '  lcd.print(millis() / 1000);   // seconds since the UNO started',
    '  lcd.print(" s");',
    '  delay(200);',
    '}'].join('\n');
  var TILTSHOW = [
    '// Show the tilt switch on the LCD',
    '#include <LiquidCrystal.h>',
    '',
    'LiquidCrystal lcd(7, 8, 9, 10, 11, 12);',
    'const int TILT = 2;               // tilt switch: pin 2 and ground',
    '',
    'void setup() {',
    '  lcd.begin(16, 2);',
    '  pinMode(TILT, INPUT_PULLUP);    // switch on the UNO\'s own pull-up resistor',
    '  lcd.print("Tilt switch:");',
    '}',
    '',
    'void loop() {',
    '  int reading = digitalRead(TILT);',
    '  lcd.setCursor(0, 1);',
    '  if (reading == LOW) {',
    '    lcd.print("LOW  = upright ");  // ball on the contacts: switch closed',
    '  } else {',
    '    lcd.print("HIGH = tipped  ");  // ball rolled away: switch open',
    '  }',
    '  delay(50);',
    '}'].join('\n');
  var SHAKE = [
    '/*',
    '  Mission 06, part 2: a random answer on every shake',
    '*/',
    '#include <LiquidCrystal.h>',
    '',
    'LiquidCrystal lcd(7, 8, 9, 10, 11, 12);',
    'const int TILT = 2;',
    '',
    '// The answers (keep each one 16 characters or less)',
    'String answers[] = {',
    '  "Yes!",',
    '  "No way",',
    '  "Ask again later",',
    '  "Without a doubt",',
    '  // YOUR TURN: add at least 4 answers of your own here',
    '',
    '};',
    'const int NUM_ANSWERS = 4;       // YOUR TURN: how many answers are in the list now?',
    '',
    'int lastReading = LOW;           // what the switch read last time through loop()',
    'unsigned long lastAnswer = 0;    // when the last answer appeared (in ms)',
    '',
    'void setup() {',
    '  lcd.begin(16, 2);',
    '  pinMode(TILT, INPUT_PULLUP);',
    '  randomSeed(analogRead(A1));    // nothing is connected to A1: its noise makes a good seed',
    '  lcd.print("Ask a question,");',
    '  lcd.setCursor(0, 1);',
    '  lcd.print("then shake me!");',
    '  lastReading = digitalRead(TILT);',
    '}',
    '',
    'void loop() {',
    '  int reading = digitalRead(TILT);',
    '',
    '  // a shake = the switch CHANGES from LOW (still) to HIGH (moving),',
    '  // and it\'s been over 1 second since the last answer (that ignores the bouncing ball)',
    '  if (reading == HIGH && lastReading == LOW && millis() - lastAnswer > 1000) {',
    '    int pick = random(NUM_ANSWERS);     // 0, 1, 2 … up to NUM_ANSWERS - 1',
    '    lcd.clear();',
    '    lcd.print("The answer is:");',
    '    lcd.setCursor(0, 1);',
    '    lcd.print(answers[pick]);',
    '    lastAnswer = millis();',
    '  }',
    '',
    '  lastReading = reading;           // remember it for next time',
    '}'].join('\n');
  var SHAKE_HINT = [
    'String answers[] = {',
    '  "Yes!",',
    '  "No way",',
    '  "Ask again later",',
    '  "Without a doubt",',
    '  "Not today",',
    '  "Signs say yes",',
    '  "Very doubtful",',
    '  "Try a pizza",',
    '};',
    'const int NUM_ANSWERS = 8;'].join('\n');
  var THERMO = [
    '// Thermometer: read the thermistor and show the temperature',
    '#include <LiquidCrystal.h>',
    '',
    'LiquidCrystal lcd(7, 8, 9, 10, 11, 12);',
    'const int THERMISTOR = A0;       // the middle of the thermistor + 10 kΩ divider',
    '',
    'void setup() {',
    '  lcd.begin(16, 2);',
    '  lcd.print("Thermometer");',
    '}',
    '',
    'void loop() {',
    '  int reading = analogRead(THERMISTOR);                        // 0 to 1023',
    '  float resistance = 10000.0 * (1024.0 / reading - 1);         // the thermistor, in ohms',
    '  float logR = log(resistance);                                // natural log',
    '  float tempK = 1 / (0.001129148 + (0.000234125 + 0.0000000876741 * logR * logR) * logR);',
    '  float tempC = tempK - 273.15;                                // kelvin → Celsius',
    '',
    '  lcd.setCursor(0, 1);',
    '  lcd.print(tempC, 1);           // 1 decimal place',
    '  lcd.print(" C      ");         // spaces wipe out old characters',
    '  delay(500);',
    '}'].join('\n');
  var FINAL = [
    '/*',
    '  Mission 06: Fortune teller',
    '  Ask a question and shake the box for an answer.',
    '  Hold the box tipped over for 2 seconds to switch to thermometer mode (and back).',
    '*/',
    '#include <LiquidCrystal.h>',
    '',
    'LiquidCrystal lcd(7, 8, 9, 10, 11, 12);   // RS, E, D4, D5, D6, D7',
    'const int TILT = 2;                       // tilt switch to ground (INPUT_PULLUP)',
    'const int THERMISTOR = A0;                // thermistor + 10 kΩ divider',
    '',
    'String answers[] = {',
    '  "Yes!", "No way", "Ask again later", "Without a doubt",',
    '  "Not today", "Signs say yes", "Very doubtful", "Try a pizza",',
    '};',
    'const int NUM_ANSWERS = 8;',
    '',
    '// the two modes',
    'const int FORTUNE = 0;',
    'const int THERMO = 1;',
    'int mode = FORTUNE;',
    '',
    'int lastReading = LOW;           // the switch, last time through loop()',
    'unsigned long tipStart = 0;      // when the box was last tipped (ms)',
    'bool handled = true;             // has this tip already done its job?',
    'unsigned long lastTemp = 0;      // when the temperature was last updated',
    '',
    'void setup() {',
    '  lcd.begin(16, 2);',
    '  pinMode(TILT, INPUT_PULLUP);',
    '  randomSeed(analogRead(A1));',
    '  titleScreen();',
    '  lastReading = digitalRead(TILT);',
    '}',
    '',
    'void loop() {',
    '  int reading = digitalRead(TILT);',
    '',
    '  if (reading == HIGH && lastReading == LOW) {      // just tipped: start the timer',
    '    tipStart = millis();',
    '    handled = false;',
    '  }',
    '  if (reading == HIGH && !handled && millis() - tipStart > 2000) {   // tipped for 2 s',
    '    switchMode();',
    '    handled = true;',
    '  }',
    '  if (reading == LOW && lastReading == HIGH && !handled) {           // upright again',
    '    if (millis() - tipStart > 30 && mode == FORTUNE) {   // a real shake, not a tiny bounce',
    '      tellFortune();',
    '    }',
    '    handled = true;',
    '  }',
    '  lastReading = reading;',
    '',
    '  switch (mode) {',
    '    case FORTUNE:',
    '      break;                     // the answer stays on screen until the next shake',
    '    case THERMO:',
    '      if (millis() - lastTemp > 500) {',
    '        showTemperature();',
    '        lastTemp = millis();',
    '      }',
    '      break;',
    '  }',
    '}',
    '',
    'void titleScreen() {',
    '  lcd.clear();',
    '  lcd.print("* MAGIC  BOX *");',
    '  lcd.setCursor(0, 1);',
    '  lcd.print("Shake to ask...");',
    '}',
    '',
    'void tellFortune() {',
    '  lcd.clear();',
    '  lcd.print("Thinking");',
    '  for (int i = 0; i < 3; i++) {   // three dots, one every 0.4 s',
    '    delay(400);',
    '    lcd.print(".");',
    '  }',
    '  delay(400);',
    '  int pick = random(NUM_ANSWERS);',
    '  lcd.clear();',
    '  lcd.print("The box says:");',
    '  lcd.setCursor(0, 1);',
    '  lcd.print(answers[pick]);',
    '}',
    '',
    'void switchMode() {',
    '  if (mode == FORTUNE) {',
    '    mode = THERMO;',
    '    lcd.clear();',
    '    lcd.print("Thermometer");',
    '  } else {',
    '    mode = FORTUNE;',
    '    titleScreen();',
    '  }',
    '}',
    '',
    'void showTemperature() {',
    '  int reading = analogRead(THERMISTOR);',
    '  float resistance = 10000.0 * (1024.0 / reading - 1);',
    '  float logR = log(resistance);',
    '  float tempK = 1 / (0.001129148 + (0.000234125 + 0.0000000876741 * logR * logR) * logR);',
    '  float tempC = tempK - 273.15;',
    '  lcd.setCursor(0, 1);',
    '  lcd.print(tempC, 1);',
    '  lcd.print(" C      ");',
    '}'].join('\n');

  /* ================= science helpers ================= */
  var SH = [0.001129148, 0.000234125, 0.0000000876741];
  function shTemp(R) { var l = Math.log(R); return 1 / (SH[0] + (SH[1] + SH[2] * l * l) * l) - 273.15; }
  function shRes(tC) { var lo = Math.log(100), hi = Math.log(1e6); for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (shTemp(Math.exp(mid)) > tC) lo = mid; else hi = mid; } return Math.exp((lo + hi) / 2); }

  /* ================= art helpers ================= */
  /* a 16×2 character LCD; cw = cell width. Returns { set(lines), cells, texts, W, H, g } */
  function lcdArt(svg, x, y, cw, o) {
    o = o || {};
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ')' }, svg);
    var ch = cw * 1.6, gap = Math.max(1.5, cw * 0.16), W = 16 * (cw + gap) - gap, H = 2 * ch + gap, pd = cw * 0.8;
    if (!o.bare) {
      S('rect', { x: -pd * 2.2, y: -pd * 2.4, width: W + pd * 4.4, height: H + pd * 4.8, rx: 6, fill: '#1d6b3a', stroke: '#2f8f50' }, g);
      S('rect', { x: -pd * 1.4, y: -pd * 1.4, width: W + pd * 2.8, height: H + pd * 2.8, rx: 3, fill: '#0c1a2e', stroke: '#33475e' }, g);
    }
    var scr = S('rect', { x: -pd, y: -pd, width: W + 2 * pd, height: H + 2 * pd, fill: '#2563eb' }, g);
    var cells = [[], []], texts = [[], []];
    for (var r = 0; r < 2; r++) for (var c = 0; c < 16; c++) {
      cells[r].push(S('rect', { x: c * (cw + gap), y: r * (ch + gap), width: cw, height: ch, fill: '#3b78f0', opacity: 0.55 }, g));
      texts[r].push(T(g, c * (cw + gap) + cw / 2, r * (ch + gap) + ch * 0.76, '', { 'text-anchor': 'middle', 'font-size': cw * 1.3, fill: '#f4f7fb' }));
    }
    function set(lines) { for (var r = 0; r < 2; r++) { var L = String((lines || [])[r] || ''); for (var c = 0; c < 16; c++) texts[r][c].textContent = L[c] && L[c] !== ' ' ? L[c] : ''; } }
    return { g: g, set: set, cells: cells, texts: texts, W: W, H: H, cw: cw, ch: ch, gap: gap, scr: scr, cellXY: function (c, r) { return [x + c * (cw + gap), y + r * (ch + gap)]; } };
  }
  /* 5×8 pixel glyphs (rows, top to bottom) from the HD44780's built-in font */
  var GLYPH = {
    A: ['01110', '10001', '10001', '10001', '11111', '10001', '10001', '00000'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001', '00000'],
    i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110', '00000'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100', '00000'],
    '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100', '00000'],
    heart: ['00000', '01010', '11111', '11111', '01110', '00100', '00000', '00000']
  };
  function pixelCell(svg, x, y, px, rows, upto) {
    var g = S('g', {}, svg), n = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 5; c++) {
      var on = rows && rows[r][c] === '1' && (upto == null || n < upto);
      S('rect', { x: x + c * (px + 2), y: y + r * (px + 2), width: px, height: px, rx: 1.5, fill: on ? '#f4f7fb' : '#3b78f0', opacity: on ? 1 : 0.5 }, g);
      if (rows && rows[r][c] === '1') n++;
    }
    return g;
  }
  /* the cardboard magic box seen from above (lid with a screen window) */
  function boxArt(svg, cx, cy, sc) {
    var g = S('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, svg), inner = S('g', {}, g);
    S('rect', { x: -170 * sc, y: -110 * sc, width: 340 * sc, height: 220 * sc, rx: 12 * sc, fill: '#b98d55', stroke: '#8a6438', 'stroke-width': 3 }, inner);
    S('rect', { x: -156 * sc, y: -96 * sc, width: 312 * sc, height: 192 * sc, rx: 8 * sc, fill: '#1a1033' }, inner);
    [[-120, -70], [110, -60], [-130, 60], [126, 70], [-40, 78], [60, -80], [0, -84]].forEach(function (p) { S('circle', { cx: p[0] * sc, cy: p[1] * sc, r: 2.2 * sc, fill: '#f4f7fb', opacity: 0.8 }, inner); });
    T(inner, 0, -60 * sc, 'ASK  ·  SHAKE  ·  KNOW', { 'text-anchor': 'middle', 'font-size': 13 * sc, fill: '#d7c3ff', 'letter-spacing': '3' });
    var L = lcdArt(inner, -118 * sc, -20 * sc, 12.5 * sc, { bare: true }), pd = 12.5 * sc * 0.8;
    S('rect', { x: -118 * sc - pd - 4 * sc, y: -20 * sc - pd - 4 * sc, width: L.W + 2 * pd + 8 * sc, height: L.H + 2 * pd + 8 * sc, rx: 4 * sc, fill: 'none', stroke: '#8a6438', 'stroke-width': 4 * sc }, inner);
    return { g: g, inner: inner, lcd: L, set: L.set };
  }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '5 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m06;
    var wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = '<p class="lead">Ask the box a yes-or-no question, give it a shake, and a glowing screen tells your fortune. Tip it on its side and hold it there, and it turns into a thermometer. In this mission you’ll build that magic box.</p>' +
      '<p>Screens like yours are everywhere: microwaves, 3D printers, parking meters, the pump at a gas station. You’ll learn how a character LCD draws its letters, how a tilt switch feels motion, how a computer “rolls dice” with <code>random()</code>, and how to make code react to a <i>change</i> instead of a state.</p>';
    UI.edp(left, [3, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360, frames: [{
      cap: 'Ask a question, shake the box, read your fortune. Hold it on its side for 2 seconds and it switches to thermometer mode.',
      draw: function (svg, _, st) {
        clear(svg); bgGrid(svg, 800, 360);
        var bx = boxArt(svg, 300, 180, 1), lab = T(svg, 560, 130, '', { 'font-size': 13, 'letter-spacing': '2', fill: CY }), lab2 = T(svg, 560, 156, '', { 'font-size': 12, fill: MUT });
        var shaking = false, tilt = 0, t0 = performance.now();
        (function anim(t) {
          var dx = shaking ? Math.sin(t / 28) * 9 : 0, dy = shaking ? Math.cos(t / 37) * 5 : 0;
          bx.g.setAttribute('transform', 'translate(' + (300 + dx) + ' ' + (180 + dy) + ') rotate(' + tilt + ') scale(' + (1 - Math.abs(tilt) / 400) + ')');
          st.raf = requestAnimationFrame(anim);
        })(t0);
        st.stop = function () { cancelAnimationFrame(st.raf); };
        var ans = ['Yes!', 'Signs say yes', 'Ask again later', 'Not today'], k = 0;
        var seq = [
          [function () { shaking = false; tilt = 0; bx.set(['* MAGIC  BOX *', 'Shake to ask...']); }, 'READY', 'ask your question out loud', 2000],
          [function () { shaking = true; }, 'SHAKE!', 'the tilt switch rattles', 900],
          [function () { shaking = false; bx.set(['Thinking', '']); }, 'THINKING', 'a little suspense…', 450],
          [function () { bx.set(['Thinking.', '']); }, 'THINKING', 'a little suspense…', 450],
          [function () { bx.set(['Thinking..', '']); }, 'THINKING', 'a little suspense…', 450],
          [function () { bx.set(['Thinking...', '']); }, 'THINKING', 'a little suspense…', 450],
          [function () { bx.set(['The box says:', ans[k++ % ans.length]]); }, 'YOUR FORTUNE', 'random() picked an answer', 2600],
          [function () { tilt = -90; }, 'HOLD IT TIPPED', '2 seconds on its side…', 2000],
          [function () { bx.set(['Thermometer', '21.8 C']); }, 'THERMOMETER', 'a thermistor measures the room', 1000],
          [function () { tilt = 0; bx.set(['Thermometer', '21.9 C']); }, 'THERMOMETER', 'pinch the sensor to warm it', 1000],
          [function () { bx.set(['Thermometer', '23.4 C']); }, 'THERMOMETER', 'pinch the sensor to warm it', 900],
          [function () { bx.set(['Thermometer', '25.1 C']); }, 'THERMOMETER', 'pinch the sensor to warm it', 1400],
          [function () { tilt = -90; }, 'HOLD IT TIPPED', 'and back to fortunes', 1800]
        ];
        var i = 0;
        (function go() { var s = seq[i % seq.length]; s[0](); lab.textContent = s[1]; lab2.textContent = s[2]; i++; st.later(go, s[3]); })();
      } }] });
  } });

  /* ---------- 02 how a character LCD works ---------- */
  steps.push({ id: 'lcd', title: 'How a character LCD works', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your kit’s <b>LCD1602</b> is a <b>character display</b>: it can’t draw pictures like a phone screen, but it shows 2 rows of 16 letters, numbers and symbols — perfect for short messages. Before you wire its 16 pins, see how it actually works.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'From pixels to print()', w: 820, h: 360,
      init: function (svg, S2, st) {
        S('rect', { x: 0, y: 0, width: 820, height: 360, fill: BG }, svg);
        st.layer = S('g', {}, svg);
      },
      frames: [
        { cap: '<b>16 columns × 2 rows = 32 characters.</b> Each spot on the screen holds exactly one character. Programmers count from zero, so the columns are numbered <b>0–15</b> and the rows are <b>0</b> (top) and <b>1</b> (bottom).', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          var L = lcdArt(g, 120, 130, 26); L.set(['Ask me anything!', 'Shake for answer']);
          for (var c = 0; c < 16; c++) { var p = L.cellXY(c, 0); T(g, p[0] + 13, 66, String(c), { 'text-anchor': 'middle', 'font-size': 12, fill: c === 0 || c === 15 ? CY : MUT }); }
          T(g, 56, 130 + 33, '0', { 'text-anchor': 'middle', fill: CY }); T(g, 56, 130 + 33 + 44, '1', { 'text-anchor': 'middle', fill: CY });
          T(g, 410, 40, 'COLUMNS 0 – 15', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          T(g, 30, 185, 'ROWS', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2', transform: 'rotate(-90 30 185)' });
          T(g, 410, 300, 'one character per cell · 16 × 2 = 32 cells', { 'text-anchor': 'middle', fill: MUT, 'font-family': SANS, 'font-size': 14 });
        } },
        { cap: '<b>Each cell is a tiny grid of 5 × 8 pixels.</b> Look closely at your screen and you’ll see them. A pixel is a spot of liquid crystal that goes dark when a voltage twists it, blocking the blue backlight. Lighting the right pixels draws a letter.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          var L = lcdArt(g, 40, 140, 15); L.set(['Hi!', '']);
          var p = L.cellXY(0, 0); S('rect', { x: p[0] - 3, y: p[1] - 3, width: 21, height: 30, fill: 'none', stroke: CY, 'stroke-width': 2 }, g);
          S('path', { d: 'M' + (p[0] + 18) + ' ' + p[1] + ' L470 50 M' + (p[0] + 18) + ' ' + (p[1] + 24) + ' L470 330', stroke: CY, 'stroke-dasharray': '4 4', fill: 'none', opacity: 0.6 }, g);
          var n = 0, holder = S('g', {}, g);
          (function grow() { clear(holder); pixelCell(holder, 500, 46, 30, GLYPH.H, n); n++; if (n <= 17) st.later(grow, 110); })();
          T(g, 610, 344, '5 × 8 = 40 PIXELS PER CELL', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        } },
        { cap: '<b>A chip on the back draws the letters for you.</b> It’s called the <b>HD44780 controller</b>, and it has a font of about 200 characters built in. You never send pixels — you send a character’s <b>code number</b> (the letter A is 65) and the chip lights the right 40 pixels. It also remembers what’s on the screen until you change it.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          S('rect', { x: 60, y: 120, width: 170, height: 120, rx: 6, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, g);
          T(g, 145, 105, 'YOUR UNO SENDS', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var code = T(g, 145, 192, '65', { 'text-anchor': 'middle', 'font-size': 40, fill: CY, 'font-weight': 600 });
          S('rect', { x: 320, y: 110, width: 170, height: 140, rx: 4, fill: '#1a1d22', stroke: '#3b4350', 'stroke-width': 2 }, g);
          T(g, 405, 172, 'HD44780', { 'text-anchor': 'middle', fill: '#c9d3de', 'font-size': 15, 'letter-spacing': '2' });
          T(g, 405, 196, 'built-in font', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
          T(g, 405, 96, 'THE CONTROLLER CHIP', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var dot = S('circle', { cx: 230, cy: 180, r: 7, fill: CY }, g);
          S('path', { d: 'M232 180 H318 M492 180 H566', stroke: '#9fb3c8', 'stroke-width': 2, fill: 'none' }, g);
          var holder = S('g', {}, g);
          var seq = [['65', 'A'], ['72', 'H'], ['89', 'Y'], ['63', '?']], k = 0;
          (function cyc() {
            var s = seq[k % seq.length]; code.textContent = s[0]; clear(holder);
            pixelCell(holder, 590, 90, 22, GLYPH[s[1]]);
            T(holder, 650, 312, 'code ' + s[0] + '  →  “' + s[1] + '”', { 'text-anchor': 'middle', fill: CY, 'font-size': 13 });
            var x0 = 232, t0 = performance.now();
            (function mv(t) { var f = Math.min(1, (t - t0) / 600); dot.setAttribute('cx', x0 + f * 86); if (f < 1) st.raf2 = requestAnimationFrame(mv); })(t0);
            k++; st.later(cyc, 1500);
          })();
        } },
        { cap: '<b>Four data wires, two trips per letter.</b> The LCD has 8 data pins (D0–D7), but to save UNO pins you’ll use just <b>D4–D7</b>: “4-bit mode.” Each code is sent as two halves: 65 is <code>0100 0001</code> in binary, so first <code>0100</code>, then <code>0001</code>. A pulse on <b>E</b> (enable) says “read the wires now.” <b>RS</b> says what the bits mean: HIGH = a character to show, LOW = a command, like “clear the screen.”', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          var names = ['RS', 'E', 'D4', 'D5', 'D6', 'D7'], ys = [70, 110, 170, 210, 250, 290], lines = {};
          names.forEach(function (n, i) {
            T(g, 70, ys[i] + 4, n, { 'text-anchor': 'end', fill: n === 'E' ? SIG : n === 'RS' ? INK : CY, 'font-size': 13 });
            S('line', { x1: 84, y1: ys[i], x2: 620, y2: ys[i], stroke: GRID, 'stroke-width': 2 }, g);
            lines[n] = S('polyline', { points: '', fill: 'none', stroke: n === 'E' ? SIG : CY, 'stroke-width': 3 }, g);
          });
          T(g, 700, 60, 'SENDING  “A” = 65', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var half1 = T(g, 700, 190, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 22 }), half2 = T(g, 700, 230, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 22 });
          var bits1 = [0, 0, 1, 0], bits2 = [1, 0, 0, 0]; // D4, D5, D6, D7 for 0100 then 0001
          function wave(n, segs) { var pts = [], hi = 20; segs.forEach(function (s) { var y = ys[names.indexOf(n)] - (s[2] ? hi : 0); pts.push(s[0] + ',' + y, s[1] + ',' + y); }); lines[n].setAttribute('points', pts.join(' ')); }
          var step = 0, bl = {};
          ['D4', 'D5', 'D6', 'D7'].forEach(function (n, i) { bl[n] = [T(g, 300, ys[2 + i] - 4, '', { fill: INK, 'font-size': 12, 'text-anchor': 'middle' }), T(g, 560, ys[2 + i] - 4, '', { fill: INK, 'font-size': 12, 'text-anchor': 'middle' })]; });
          (function draw() {
            var x1 = 100, xm = 360, x2 = 610, up = Math.min(step, 4);
            wave('RS', [[x1, x2, up >= 1]]);
            wave('E', [[x1, 200, 0], [200, 250, up >= 2], [250, 460, 0], [460, 510, up >= 4], [510, x2, 0]]);
            ['D4', 'D5', 'D6', 'D7'].forEach(function (n, i) { wave(n, [[x1, xm, up >= 1 && bits1[i]], [xm, x2, up >= 3 && bits2[i]]]); bl[n][0].textContent = up >= 1 ? bits1[i] : ''; bl[n][1].textContent = up >= 3 ? bits2[i] : ''; });
            half1.textContent = up >= 2 ? '0100 ✓' : up >= 1 ? '0100' : '';
            half2.textContent = up >= 4 ? '0001 ✓' : up >= 3 ? '0001' : '';
            step = (step + 1) % 6; st.later(draw, 800);
          })();
          T(g, 225, 340, 'first half', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); T(g, 485, 340, 'second half', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
        } },
        { cap: '<b>The library does all the talking.</b> The <code>LiquidCrystal</code> library knows the whole conversation. You just write <code>lcd.setCursor(col, row);</code> to pick where the next character goes and <code>lcd.print("…");</code> to write it. The cursor moves one cell right after every character, like typing.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          S('rect', { x: 40, y: 60, width: 330, height: 150, rx: 6, fill: '#0e1826', stroke: GRID }, g);
          var l1 = T(g, 60, 104, 'lcd.setCursor(4, 1);', { fill: CY, 'font-size': 15 }), l2 = T(g, 60, 144, 'lcd.print("Hi?");', { fill: CY, 'font-size': 15 });
          var L = lcdArt(g, 420, 110, 19); L.set(['', '']);
          var cur = S('rect', { x: 0, y: 0, width: 19, height: 3, fill: SIG }, g);
          function mv(c, r) { var p = L.cellXY(c, r); cur.setAttribute('x', p[0]); cur.setAttribute('y', p[1] + 32); }
          var msg = 'Hi?', k = 0;
          (function go() {
            if (k === 0) { L.set(['', '']); mv(0, 0); l1.setAttribute('fill', MUT); l2.setAttribute('fill', MUT); }
            else if (k === 1) { l1.setAttribute('fill', CY); mv(4, 1); }
            else if (k >= 2 && k <= 4) { l2.setAttribute('fill', CY); L.set(['', '    ' + msg.slice(0, k - 1)]); mv(4 + k - 1, 1); }
            k = (k + 1) % 7; st.later(go, 800);
          })();
          T(g, 205, 250, 'the orange line = where the next character goes', { 'text-anchor': 'middle', fill: MUT, 'font-family': SANS, 'font-size': 13 });
        } }
      ] });
    UI.html(b, '<h2>Try it: the screen designer</h2><p>Type some text, pick a column and row, and press <b>print</b>. Watch the code build up underneath. Then try the experiment in the checkpoint below.</p>');
    lcdLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-lcd1', q: 'Where does the next character appear after <code>lcd.setCursor(3, 1);</code>?', options: ['Row 3, column 1', 'Column 3 of the bottom row (the 4th cell from the left)', 'Column 3 of the top row', 'Three characters after the last one printed'], answer: 1, explain: 'setCursor takes the column first, then the row. Counting from 0, column 3 is the 4th cell, and row 1 is the bottom row.', hints: { 0: 'Column comes first: setCursor(col, row). And there is no row 3 — only 0 and 1.', 2: 'Row 0 is the top. Row 1 is the bottom.' } });
    UI.mcq(b, ctx, { id: 'q-lcd2', q: 'The screen shows <code>Hello</code> on the top row. Your code does <code>lcd.setCursor(0, 0); lcd.print("Hi");</code>. What does the top row show now?', options: ['<code>Hi</code>', '<code>HiHello</code>', '<code>Hillo</code>', '<code>Hello Hi</code>'], answer: 2, explain: 'The LCD only changes the cells you write to. “Hi” replaces “He”, and “llo” is left behind. Use <code>lcd.clear()</code> first, or print spaces after short text to wipe old characters.', hints: { 0: 'The LCD remembers everything until something overwrites it. Did anything overwrite “llo”?', 1: 'print() doesn’t push old text along — it overwrites cells.' } });
  } });
  function lcdLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The screen designer</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 230', role: 'img', 'aria-label': 'A 16 by 2 LCD you can print text on' }); stage.appendChild(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 230, fill: BG }, svg);
    var L = lcdArt(svg, 120, 70, 30);
    for (var c = 0; c < 16; c++) { var p = L.cellXY(c, 0); T(svg, p[0] + 15, 40, String(c), { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); }
    T(svg, 50, 70 + 34, '0', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); T(svg, 50, 70 + 34 + 51, '1', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); T(svg, 50, 70 + 68 + 30, 'ROW', { 'text-anchor': 'middle', fill: MUT, 'font-size': 9, 'letter-spacing': '1' });
    var cur = S('rect', { x: 0, y: 0, width: 30, height: 3, fill: SIG }, svg), lost = T(svg, 400, 222, '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 12 });
    var buf = [pad16(''), pad16('')], cc = 0, cr = 0, code = ['lcd.begin(16, 2);'];
    function draw() { L.set(buf); var q = L.cellXY(Math.min(cc, 15), cr); cur.setAttribute('x', q[0]); cur.setAttribute('y', q[1] + 50); cur.setAttribute('opacity', cc > 15 ? 0 : 1); codeBox.textContent = code.slice(-7).join('\n'); }
    var row1 = el('div', 'slider-row'); row1.innerHTML = '<label>Text</label>';
    var inp = el('input'); inp.type = 'text'; inp.maxLength = 24; inp.value = 'Hello'; inp.setAttribute('aria-label', 'Text to print'); inp.style.cssText = 'flex:1;min-width:140px;font:15px var(--mono);padding:6px 8px;background:var(--bg);color:var(--ink);border:1px solid var(--grid);border-radius:var(--r-xs)';
    row1.appendChild(inp); box.appendChild(row1);
    var row2 = el('div', 'slider-row'); row2.innerHTML = '<label>Column</label>';
    var col = el('input'); col.type = 'range'; col.min = 0; col.max = 15; col.value = 0; col.setAttribute('aria-label', 'Column');
    var colv = el('b', '', '0'); row2.appendChild(col); row2.appendChild(colv);
    var rp = el('div', 'res-pills'); rp.innerHTML = '<label style="margin-right:6px">Row</label>'; var rows = [];
    [0, 1].forEach(function (r) { var bt = el('button', r === 0 ? 'on' : '', String(r)); bt.type = 'button'; bt.addEventListener('click', function () { rows.forEach(function (x) { x.classList.remove('on'); }); bt.classList.add('on'); selRow = r; }); rows.push(bt); rp.appendChild(bt); });
    row2.appendChild(rp); box.appendChild(row2);
    var selRow = 0;
    col.addEventListener('input', function () { colv.textContent = col.value; });
    var row3 = el('div', 'slider-row');
    var pr = el('button', 'btn btn-primary btn-small', 'lcd.print()'); pr.type = 'button';
    var cl = el('button', 'btn btn-ghost btn-small', 'lcd.clear()'); cl.type = 'button';
    row3.appendChild(pr); row3.appendChild(cl); row3.appendChild(el('span', 'small muted', 'Experiment: print <b>Hello</b> at column 0, row 0. Then print <b>Hi</b> in the same place.'));
    box.appendChild(row3);
    var codeBox = el('pre', ''); codeBox.style.cssText = 'margin:0;padding:12px 16px;border-top:1px solid var(--grid);font:13px/20px var(--mono);color:var(--cyan);background:var(--bg);min-height:60px;white-space:pre-wrap';
    box.appendChild(codeBox);
    b.appendChild(box);
    pr.addEventListener('click', function () {
      var c0 = Number(col.value), r0 = selRow, s = inp.value, a = buf[r0].split(''), off = '';
      for (var i = 0; i < s.length; i++) { if (c0 + i < 16) a[c0 + i] = s[i]; else off += s[i]; }
      buf[r0] = a.join(''); cc = c0 + s.length; cr = r0;
      code.push('lcd.setCursor(' + c0 + ', ' + r0 + ');'); code.push('lcd.print("' + s.replace(/"/g, '\\"') + '");');
      lost.textContent = off ? '“' + off + '” fell off the edge: only 16 cells per row, and print() never wraps to the next row' : '';
      draw(); ctx.check('lcdlab', (ctx.check('lcdlab') || 0) + 1);
    });
    cl.addEventListener('click', function () { buf = [pad16(''), pad16('')]; cc = 0; cr = 0; code.push('lcd.clear();   // blank screen, cursor back to 0, 0'); lost.textContent = ''; draw(); });
    draw();
  }

  /* ---------- 03 build: wire the LCD ---------- */
  steps.push({ id: 'build-lcd', title: 'Build: wire the LCD', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The LCD has 16 pins. That sounds like a lot, but they fall into four groups: <b>power</b> for the chip, <b>contrast</b>, <b>control and data</b> from the UNO, and the <b>backlight</b>. Build it one group at a time.</p>' +
      '<div class="two"><div class="callout plain"><span class="label">One rail pair only</span><p>When the LCD is pushed into column j, its circuit board lies flat over the <b>right-hand rails</b>, so you can’t reach them. This circuit takes power from the <b>left</b> rails only.</p></div><div class="callout plain"><span class="label">Pin 1</span><p>Pin 1 is <b>VSS</b>. It’s usually marked with a <b>1</b> or a square pad on the back. Put pin 1 in <b>j3</b> so pins 1–16 land in rows 3–18.</p></div></div>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable while you wire. Push the LCD in gently and straight: its pins bend easily.</p>');
    B.guide(b, { title: 'LCD circuit', vb: WIDE, parts: ALL, base: [], steps: [
      { title: 'Power the left rails', add: ['p5v', 'pgnd'], html: '<p>Red wire from <b>5V</b> to the left <b>+</b> rail, black wire from <b>GND</b> (beside pin 13) to the left <b>−</b> rail. No rail bridges this time — the right rails will be under the LCD.</p>' },
      { title: 'Place the LCD', add: ['lcd'], html: '<p>Push the LCD’s pins into <b>column j, rows 3 to 18</b>, pin 1 (VSS) in <b>j3</b>. The screen faces up and the board hangs off the right side of the breadboard.</p><p>Each LCD pin now owns a row: anything you plug into f, g, h or i of that row connects to that pin.</p>' },
      { title: 'Power the LCD’s chip', add: ['l_vss', 'l_vdd'], html: '<p>Black jumper from the left <b>− rail to f3</b> (pin 1, VSS = ground). Red jumper from the left <b>+ rail to f4</b> (pin 2, VDD = 5 V). Run them straight across rows 3 and 4.</p>' },
      { title: 'The contrast knob', add: ['pot', 'pot5', 'potg', 'potw'], html: '<p>Press the <b>10 kΩ potentiometer</b> into <b>c21, c23, c25</b>. Red jumper <b>d21 → + rail</b>, black jumper <b>− rail → d25</b>. The middle leg (the wiper) is the output: run a green wire from <b>e23</b> up the centre gap to <b>f5</b> (pin 3, V0). The step after this explains why.</p>' },
      { title: 'RW to ground', add: ['l_rw'], html: '<p>Black jumper from the <b>− rail to f7</b> (pin 5, RW). RW chooses <i>read</i> or <i>write</i>. Grounding it means “always write”: the UNO only ever sends.</p>' },
      { title: 'Control pins: RS and E', add: ['l_rs', 'l_e'], html: '<p><b>Pin 7 → g6</b> (RS, register select) and <b>pin 8 → g8</b> (E, enable). Remember: RS says “character or command,” and E says “read the data now.”</p>' },
      { title: 'Data pins D4–D7', add: ['l_d4', 'l_d5', 'l_d6', 'l_d7'], html: '<p><b>Pin 9 → g13</b> (D4), <b>pin 10 → g14</b> (D5), <b>pin 11 → g15</b> (D6), <b>pin 12 → g16</b> (D7). Rows 9–12 (D0–D3) stay empty: 4-bit mode doesn’t use them.</p>' },
      { title: 'The backlight', add: ['l_blr', 'l_bla', 'l_k'], html: '<p>Pins 15 (A) and 16 (K) are an LED behind the screen. Like every LED, it gets a resistor: a <b>220 Ω</b> (' + RL.resistorName(220) + ') from the <b>+ rail to a17</b>, then a red jumper <b>c17 → f17</b> (A). Black jumper <b>− rail → f18</b> (K).</p><p class="small muted">Some LCD modules have a backlight resistor built in. The 220 Ω keeps yours safe either way; the light is just a little softer.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Trace each LCD pin: 1 VSS ground, 2 VDD 5 V, 3 V0 knob, 4 RS pin 7, 5 RW ground, 6 E pin 8, 11–14 D4–D7 pins 9–12, 15 A through 220 Ω, 16 K ground.</p><p>Plug in the USB. The backlight should glow. Turn the knob until you see a row of dark boxes, then back off a little.</p>' }
    ] });
    UI.html(b, '<h2>Why the contrast knob matters</h2><p>Pin 3, <b>V0</b>, sets how hard the LCD twists its pixels. The knob is a <b>voltage divider</b> (Mission 02): turning it slides V0 anywhere from 0 V to 5 V. Drag the knob and watch the screen.</p>');
    contrastLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-contrast', q: 'You upload your code. The backlight is on, but the screen shows nothing at all — not even faint boxes. What do you try first?', options: ['Rewrite the code', 'Turn the contrast knob slowly from one end to the other', 'Swap the 220 Ω resistor for a 10 kΩ', 'Move the LCD to column a'], answer: 1, explain: 'With V0 too high the pixels barely change, so text is invisible even when everything else works. Sweep the knob before you touch anything else.', hints: { 0: 'Code problems usually leave a row of solid boxes or random symbols. A totally blank screen is usually contrast.', 2: 'That would make the backlight dimmer, not the text visible.' } });
  } });
  function contrastLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The contrast knob</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 250', role: 'img', 'aria-label': 'A potentiometer setting the LCD contrast' }); stage.appendChild(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 250, fill: BG }, svg);
    // divider schematic
    T(svg, 70, 40, '5V', { 'text-anchor': 'middle', fill: '#e5484d', 'font-size': 13, 'font-weight': 600 });
    S('line', { x1: 70, y1: 48, x2: 70, y2: 70, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
    S('rect', { x: 58, y: 70, width: 24, height: 120, rx: 3, fill: '#1e5aa8', stroke: '#2e74c3' }, svg);
    S('line', { x1: 70, y1: 190, x2: 70, y2: 212, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
    S('path', { d: 'M54 212 h32 M60 219 h20 M66 226 h8', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
    var arrow = S('path', { d: '', fill: CY }, svg), wire = S('path', { d: '', stroke: CY, 'stroke-width': 3, fill: 'none' }, svg);
    var vt = T(svg, 120, 245, '', { fill: CY, 'font-size': 13 });
    T(svg, 200, 132, 'V0', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
    var L = lcdArt(svg, 285, 100, 24);
    var ro = el('div', 'readouts'); var row = el('div', 'slider-row'); row.innerHTML = '<label>Knob</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = 70; r.setAttribute('aria-label', 'Contrast knob'); row.appendChild(r);
    box.appendChild(row); box.appendChild(ro); b.appendChild(box);
    function upd() {
      var pos = Number(r.value), v0 = 5 * (1 - pos / 100), y = 70 + 120 * (1 - v0 / 5);
      arrow.setAttribute('d', 'M88 ' + y + ' l12 -7 v14 z'); wire.setAttribute('d', 'M100 ' + y + ' H170 V140 H242');
      vt.textContent = 'V0 = ' + v0.toFixed(1) + ' V';
      var txt = Math.max(0, Math.min(1, (1.9 - v0) / 0.8)), boxes = Math.max(0, Math.min(1, (0.75 - v0) / 0.75));
      L.set(['Hello, LCD!', 'Awake: 12 s']);
      for (var rr = 0; rr < 2; rr++) for (var c = 0; c < 16; c++) { L.texts[rr][c].setAttribute('opacity', txt); L.cells[rr][c].setAttribute('fill', boxes > 0.05 ? '#0b2a7a' : '#3b78f0'); L.cells[rr][c].setAttribute('opacity', 0.55 + boxes * 0.45); }
      var verdict = v0 > 1.9 ? '<b class="muted">BLANK</b>' : v0 > 1.2 ? '<b>FAINT</b>' : v0 >= 0.4 ? '<b style="color:var(--go)">CRISP</b>' : '<b style="color:var(--signal)">DARK BOXES</b>';
      ro.innerHTML = '<div><span class="label">V0</span><b>' + v0.toFixed(2) + ' V</b></div><div><span class="label">Screen</span>' + verdict + '</div><div><span class="label">What’s happening</span><span class="small">' +
        (v0 > 1.9 ? 'Too little voltage across the crystals: the pixels never twist enough to go dark.' : v0 > 1.2 ? 'The letters are there, just pale.' : v0 >= 0.4 ? 'Just right: lit pixels are dark, unlit ones stay clear.' : 'So much voltage that even the “off” pixels start to darken.') + '</span></div>';
      ctx.check('contrast', 1);
    }
    r.addEventListener('input', upd); upd();
  }

  /* ---------- 04 hello LCD ---------- */
  steps.push({ id: 'hello', title: 'Code it: Hello, LCD', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time to put words on the screen. <code>LiquidCrystal</code> comes with the Arduino IDE (and the Cloud Editor), so there’s nothing to install — you just <code>#include</code> it.</p>');
    RL.Code.walk(b, HELLO, [
      { lines: [2, 2], title: 'Include the library', html: '<p><code>#include &lt;LiquidCrystal.h&gt;</code> adds the library’s code to your sketch. It knows the whole HD44780 conversation: RS, E, the two halves of every character…</p>' },
      { lines: [4, 5], title: 'Make an lcd object', html: '<p>This line creates an <b>object</b> called <code>lcd</code> and tells it which UNO pins go to RS, E, D4, D5, D6 and D7, in that order. They match your wiring: 7, 8, 9, 10, 11, 12.</p><p>From now on, <code>lcd.something()</code> means “ask the LCD to do something.”</p>' },
      { lines: [8, 8], title: 'lcd.begin()', html: '<p>Wakes the display up and tells the library its size: 16 columns, 2 rows.</p>' },
      { lines: [9, 9], title: 'lcd.print()', html: '<p>Prints text starting at the cursor, which begins at column 0, row 0. Text goes in double quotes.</p>' },
      { lines: [13, 16], title: 'Numbers, too', html: '<p><code>setCursor(0, 1)</code> jumps to the bottom row. <code>millis() / 1000</code> is the number of seconds since the UNO started (whole-number division), and <code>print()</code> shows numbers as well as text.</p><p>Because the number only grows, it never leaves old digits behind. (When it <i>can</i> shrink, print a few spaces after it.)</p>' }
    ], { name: 'hello_lcd' });
    RL.Sim.create(b, { title: 'Hello, LCD', code: HELLO, name: 'hello_lcd', key: 'sim-hello', ctx: ctx, board: { parts: ALL, show: IDS_LCD, view: SIM_VIEW, vb: WIDE }, lcd: 'lcd', checkAfter: 1600,
      check: function (log, sim) {
        var s = sim.state().lcd, r;
        if (!/hello/i.test(s[0])) r = { pass: false, msg: 'The top row should say hello. It shows “' + s[0].trim() + '”. Is lcd.print("Hello, LCD!") in setup()?' };
        else if (!/\d/.test(s[1])) r = { pass: false, msg: 'The bottom row should show the seconds counting up. Check setCursor(0, 1) and print(millis() / 1000).' };
        else r = { pass: true, msg: 'Top row: “' + s[0].trim() + '”. Bottom row: “' + s[1].trim() + '”. Your LCD code works.' };
        ctx.check('sim-hello-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Upload the sketch and adjust the contrast knob until the text is crisp. Then change the message to your name. Can you centre it? (16 cells minus the length of your name, divided by 2, gives the starting column.)</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Backlight off</b><br><span class="small muted">Check the 220 Ω from the + rail to a17, the jumper c17 → f17, and K (f18) to the − rail.</span></div></div><div class="trow"><div><b>Lit, but blank</b><br><span class="small muted">Sweep the contrast knob. Check the wiper wire to f5 and the knob’s two outer legs.</span></div></div><div class="trow"><div><b>A row of solid boxes</b><br><span class="small muted">The LCD has power but never got set up: check RS (pin 7 → g6), E (pin 8 → g8) and RW (f7 → ground).</span></div></div><div class="trow"><div><b>Random symbols</b><br><span class="small muted">Two data wires are swapped or loose: check pins 9–12 go to g13–g16 in order.</span></div></div></div>');
  } });

  /* ---------- 05 tilt switch ---------- */
  steps.push({ id: 'tilt', title: 'The tilt switch', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">How does the box know it’s being shaken? A <b>tilt ball switch</b>: a tiny metal can with a ball rolling around inside. It’s a switch that gravity presses for you.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Inside a tilt switch', w: 820, h: 340,
      init: function (svg, S2, st) {
        S('rect', { x: 0, y: 0, width: 820, height: 340, fill: BG }, svg);
        T(svg, 150, 34, 'INSIDE THE SWITCH', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        T(svg, 590, 34, 'WHAT PIN 2 READS', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        st.can = S('g', {}, svg);
        S('rect', { x: -40, y: -90, width: 80, height: 160, rx: 14, fill: '#1c1f24', stroke: '#6b7280', 'stroke-width': 3 }, st.can);
        S('rect', { x: -30, y: -80, width: 60, height: 140, rx: 10, fill: '#0b0e12' }, st.can);
        st.cA = S('rect', { x: -26, y: 50, width: 20, height: 8, fill: '#c9b458' }, st.can); st.cB = S('rect', { x: 6, y: 50, width: 20, height: 8, fill: '#c9b458' }, st.can);
        S('line', { x1: -16, y1: 70, x2: -16, y2: 120, stroke: '#b8c2cc', 'stroke-width': 4 }, st.can); S('line', { x1: 16, y1: 70, x2: 16, y2: 120, stroke: '#b8c2cc', 'stroke-width': 4 }, st.can);
        st.ball = S('circle', { cx: 0, cy: 34, r: 16, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, st.can);
        st.spark = S('circle', { cx: 0, cy: 50, r: 30, fill: 'url(#m6g-cyan)', opacity: 0 }, st.can);
        glowDefs(svg);
        st.state = T(svg, 170, 318, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 12 });
        S('line', { x1: 380, y1: 90, x2: 790, y2: 90, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 372, 94, 'HIGH', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        S('line', { x1: 380, y1: 200, x2: 790, y2: 200, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 372, 204, 'LOW', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        st.trace = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
        st.read = T(svg, 585, 250, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 14, 'letter-spacing': '1' });
        st.pu = S('g', { opacity: 0 }, svg);
        var mode = 'up', pts = [], x = 0, last = 0, ang = 0, tAng = 0, bounceT = 0;
        st.set = function (m) { mode = m; pts = []; x = 0; };
        (function tick(t) {
          tAng += ((mode === 'tip' ? 70 : 0) - tAng) * 0.08; ang = tAng;
          var closed;
          if (mode === 'shake') { bounceT += 1; var jig = Math.sin(t / 22) * 10; st.can.setAttribute('transform', 'translate(' + (150 + jig) + ' 170)'); var by = 34 - Math.abs(Math.sin(t / 45)) * 40; st.ball.setAttribute('cy', by); closed = by > 30; }
          else { st.can.setAttribute('transform', 'translate(150 170) rotate(' + ang + ')'); var settled = mode === 'up'; st.ball.setAttribute('cy', settled ? 34 : -60 + Math.max(0, 70 - ang) * 1.3); closed = settled && ang < 20; }
          st.spark.setAttribute('opacity', closed ? 0.9 : 0);
          if (t - last > 30) { last = t; x += 3; pts.push([380 + x, closed ? 200 : 90]); if (x > 400) { x = 0; pts = []; }
            st.trace.setAttribute('points', pts.map(function (p, i) { var pr = pts[i - 1]; return (pr ? p[0] + ',' + pr[1] + ' ' : '') + p[0] + ',' + p[1]; }).join(' ')); }
          st.read.textContent = mode === 'shake' ? 'FLICKERING: LOW, HIGH, LOW, HIGH…' : closed ? 'LOW  (switch closed)' : 'HIGH  (switch open)';
          st.state.textContent = mode === 'shake' ? 'ball bouncing on the contacts' : closed ? 'ball touches both contacts' : 'ball rolled away from the contacts';
          st.raf = requestAnimationFrame(tick);
        })(0);
        st.stop = function () { cancelAnimationFrame(st.raf); };
      },
      frames: [
        { cap: '<b>Standing upright, the ball rests on two metal contacts</b> at the bottom, connecting them — the switch is <b>closed</b>. Your circuit connects one leg to pin 2 and the other to ground, so a closed switch pulls pin 2 down to 0 V: it reads <code>LOW</code>.', draw: function (svg, S2, st) { st.set('up'); } },
        { cap: '<b>Tip it past about 45° and the ball rolls away.</b> The contacts are no longer connected — the switch is <b>open</b>. Something has to give pin 2 a definite voltage now, or it would float (remember Mission 01). That something is a pull-up resistor, and pin 2 reads <code>HIGH</code>.', draw: function (svg, S2, st) { st.set('tip'); } },
        { cap: '<b>Shake it and the ball bounces.</b> Every bounce opens and closes the contacts, so pin 2 flickers between LOW and HIGH many times in a fraction of a second. That flicker is how your box will feel a shake — and it’s also a problem you’ll solve below.', draw: function (svg, S2, st) { st.set('shake'); } }
      ] });
    UI.html(b, '<h2>A pull-up resistor you don’t have to wire</h2><p>In Mission 01 you added a 10 kΩ <b>pull-down</b> resistor so the button pin read LOW until pressed. The UNO has a resistor of about 35 kΩ <b>built into every pin</b>, connected to 5 V. You switch it on with one word:</p>');
    RL.Code.block(b, 'pinMode(TILT, INPUT_PULLUP);   // pin 2 is an input, with the internal pull-up switched on', { download: false });
    UI.html(b, '<div class="two"><div class="callout plain"><span class="label">Mission 01: pull-down</span><p>Resistor to <b>GND</b>, switch to <b>5V</b>.<br>Pressed = <b>HIGH</b>, released = LOW.</p></div><div class="callout plain"><span class="label">Now: INPUT_PULLUP</span><p>Resistor (inside the UNO) to <b>5V</b>, switch to <b>GND</b>.<br>Closed = <b>LOW</b>, open = HIGH. It reads “backwards” — that’s normal.</p></div></div>');
    UI.mcq(b, ctx, { id: 'q-tilt1', q: 'With <code>INPUT_PULLUP</code>, the box is sitting still and upright on your desk. What does <code>digitalRead(2)</code> give?', options: ['HIGH, because the pull-up connects it to 5 V', 'LOW, because the ball closes the switch and connects pin 2 to ground', 'Random HIGHs and LOWs', 'It depends on the temperature'], answer: 1, explain: 'Upright, the ball sits on the contacts, so the switch connects pin 2 straight to ground. The weak pull-up loses, and the pin reads LOW.', hints: { 0: 'The pull-up only wins when the switch is open. Is it open when the box is upright?', 2: 'The pull-up resistor stops the pin floating.' } });
    UI.html(b, '<h2>Build: add the tilt switch</h2><p>The tilt switch has two legs and works either way round. Stand it straight up so the ball rests on its contacts.</p>');
    B.guide(b, { title: 'Tilt switch', vb: WIDE, parts: ALL, base: IDS_LCD, steps: [
      { title: 'Start from your LCD circuit', view: 'all', html: '<p>Everything from the last build stays. The tilt switch goes in the empty rows <b>below the LCD</b>.</p>' },
      { title: 'Place the switch', add: ['tilt'], html: '<p>Push the tilt switch’s legs into <b>h19</b> and <b>h21</b>, standing upright.</p>' },
      { title: 'One leg to pin 2', add: ['t_d2'], html: '<p>Blue wire from <b>pin 2 to f19</b>. Row 19 now joins pin 2 to the top leg.</p>' },
      { title: 'Other leg to ground', add: ['t_g'], html: '<p>Short black jumper from <b>g21 to g18</b>. Row 18 is already ground (it feeds the LCD’s K pin), so this connects the bottom leg to GND. No resistor needed: INPUT_PULLUP has one built in.</p>' }
    ] });
    UI.html(b, '<h2>See the switch on the screen</h2><p>Run this sketch, then <b>click the tilt switch</b> on the breadboard to stand it upright or tip it over. (The Virtual UNO starts with it tipped.)</p>');
    RL.Code.walk(b, TILTSHOW, [
      { lines: [9, 9], title: 'INPUT_PULLUP', html: '<p>Pin 2 listens, with its internal pull-up resistor on. No pull-up = a floating pin whenever the switch is open.</p>' },
      { lines: [14, 20], title: 'Read and show', html: '<p>Read the pin, then print one of two messages on the bottom row. Both are padded with spaces to 15 characters so the longer message never leaves leftovers behind.</p>' }
    ], { name: 'tilt_lcd', download: false });
    RL.Sim.create(b, { title: 'Tilt switch on the LCD', code: TILTSHOW, name: 'tilt_lcd', key: 'sim-tilt', ctx: ctx, board: { parts: ALL, show: IDS_TILT, view: SIM_VIEW, vb: WIDE }, lcd: 'lcd', buttons: { 2: { part: 'tilt', wiring: 'pullup', toggle: true, label: 'Tilt switch' } },
      runHint: 'click the tilt switch to stand it up or tip it over.', checkAfter: 900,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          sim.press(2, true);
          setTimeout(function () {
            var up = sim.state().lcd[1]; sim.press(2, false);
            setTimeout(function () {
              var tip = sim.state().lcd[1], r;
              if (!/LOW|upright/i.test(up)) r = { pass: false, msg: 'With the switch upright (closed), the bottom row showed “' + up.trim() + '”. Upright should read LOW.' };
              else if (!/HIGH|tipped/i.test(tip)) r = { pass: false, msg: 'With the switch tipped (open), the bottom row showed “' + tip.trim() + '”. Tipped should read HIGH — is pinMode set to INPUT_PULLUP?' };
              else r = { pass: true, msg: 'Upright: “' + up.trim() + '”. Tipped: “' + tip.trim() + '”. Your switch and pull-up work.' };
              ctx.check('sim-tilt-pass', r.pass ? 1 : 0); resolve(r);
            }, 400);
          }, 400);
        });
      } });
    UI.html(b, '<p style="margin-top:16px">Upload it to your board and tilt the breadboard gently. Then give it a little shake and watch the bottom row flicker.</p>');
    UI.html(b, '<h2>One shake, one answer</h2><p>Your fortune teller should give <b>one</b> answer per shake. But the switch flickers dozens of times during a shake, and <code>loop()</code> runs thousands of times a second. Watch what different kinds of code would do with the same shake:</p>');
    bounceTimeline(b);
    UI.mcq(b, ctx, { id: 'q-edge', q: 'Why does the code check <code>reading == HIGH &amp;&amp; lastReading == LOW</code> instead of just <code>reading == HIGH</code>?', options: ['HIGH readings are less reliable', 'It reacts only at the moment the switch <i>changes</i> to HIGH, not every time loop() sees HIGH', 'It makes the code run faster', 'lastReading stores the answer'], answer: 1, explain: '<code>reading == HIGH</code> is true on every pass of loop() while the box is tipped — thousands of times. Comparing with the last reading catches only the change, once.', hints: { 0: 'Both readings come from the same pin. What’s different about the moment the two values disagree?' } });
  } });
  function bounceTimeline(b) {
    // one shake: LOW, then a burst of bounces, then LOW again
    var edges = [0.20, 0.215, 0.24, 0.26, 0.275, 0.30, 0.33, 0.345, 0.37, 0.40, 0.42, 0.45, 0.47, 0.50, 0.53, 0.55, 0.58, 0.60]; // toggle times (0..1)
    function lev(t) { var hi = false; for (var i = 0; i < edges.length; i++) if (t >= edges[i]) hi = !hi; return hi; }
    var X0 = 70, X1 = 760, YH = 70, YL = 150;
    function px(t) { return X0 + (X1 - X0) * t; }
    UI.explainer(b, { label: 'Explainer', title: 'Detecting a change (and ignoring the bounce)', w: 820, h: 300,
      init: function (svg, S2, st) {
        S('rect', { x: 0, y: 0, width: 820, height: 300, fill: BG }, svg);
        T(svg, X0, 32, 'PIN 2 DURING ONE SHAKE', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        T(svg, X0 - 8, YH + 4, 'HIGH', { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); T(svg, X0 - 8, YL + 4, 'LOW', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        var pts = [], prev = false; pts.push(px(0) + ',' + YL);
        for (var t = 0; t <= 1.0001; t += 0.0025) { var h = lev(t); if (h !== prev) { pts.push(px(t) + ',' + (prev ? YH : YL)); prev = h; } pts.push(px(t) + ',' + (h ? YH : YL)); }
        S('polyline', { points: pts.join(' '), fill: 'none', stroke: '#4b6a8a', 'stroke-width': 2.5 }, svg);
        st.quiet = S('rect', { x: px(0.20), y: 50, width: px(0.20 + 0.5) - px(0.20), height: 118, fill: CY, opacity: 0 }, svg);
        st.ql = T(svg, px(0.45), 64, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 11, 'letter-spacing': '1' });
        st.play = S('line', { x1: X0, y1: 46, x2: X0, y2: 172, stroke: SIG, 'stroke-width': 2 }, svg);
        S('line', { x1: X0, y1: 196, x2: X1, y2: 196, stroke: GRID }, svg);
        T(svg, X0, 216, 'ANSWERS SHOWN', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        st.marks = S('g', {}, svg);
        st.count = T(svg, X1, 270, '', { 'text-anchor': 'end', 'font-size': 22, 'font-weight': 600, fill: CY });
        st.codeT = T(svg, X0, 270, '', { fill: INK, 'font-size': 13 });
        st.run = function (mode) {
          clear(st.marks); st.quiet.setAttribute('opacity', mode === 'quiet' ? 0.12 : 0); st.ql.textContent = mode === 'quiet' ? 'IGNORE THE SWITCH FOR 1 SECOND' : '';
          st.codeT.textContent = { level: 'if (reading == HIGH)', edge: 'if (reading == HIGH && lastReading == LOW)', quiet: '... && millis() - lastAnswer > 1000' }[mode];
          var n = 0, lastT = -1, lastAns = -9, prevH = false, t0 = performance.now(), dur = 3200;
          if (st.raf) cancelAnimationFrame(st.raf);
          (function tick(now) {
            var f = Math.min(1, (now - t0) / dur), tt = f;
            st.play.setAttribute('x1', px(f)); st.play.setAttribute('x2', px(f));
            // sample like loop() would, every 0.004 of the timeline
            while (lastT + 0.004 <= tt) {
              lastT += 0.004; var h = lev(lastT), fire = false;
              if (mode === 'level') fire = h;
              else if (mode === 'edge') fire = h && !prevH;
              else fire = h && !prevH && lastT - lastAns > 0.5;
              if (fire) { n++; lastAns = lastT; S('rect', { x: px(lastT) - 1.5, y: 222 + (mode === 'level' ? (n % 3) * 4 : 0), width: 3, height: 18, fill: mode === 'quiet' ? GO : SIG }, st.marks); }
              prevH = h;
            }
            st.count.textContent = n + (n === 1 ? ' answer' : ' answers');
            st.count.setAttribute('fill', mode === 'quiet' ? GO : SIG);
            if (f < 1) st.raf = requestAnimationFrame(tick);
          })(t0);
        };
        st.stop = function () { cancelAnimationFrame(st.raf); };
      },
      frames: [
        { cap: '<b>The raw signal.</b> The box sits still (LOW), gets one shake, and settles again. One shake makes the ball bounce about 18 times in half a second. The orange line is <code>loop()</code> checking the pin over and over.', draw: function (svg, S2, st) { clear(st.marks); st.count.textContent = ''; st.codeT.textContent = 'one shake'; st.quiet.setAttribute('opacity', 0); st.ql.textContent = ''; var t0 = performance.now(); (function tick(now) { var f = Math.min(1, (now - t0) / 3200); st.play.setAttribute('x1', px(f)); st.play.setAttribute('x2', px(f)); if (f < 1) st.raf = requestAnimationFrame(tick); })(t0); } },
        { cap: '<b>React whenever it’s HIGH?</b> loop() sees HIGH on every pass while the ball is off the contacts, so this code would pick a new answer dozens of times. The screen would just flicker.', draw: function (svg, S2, st) { st.run('level'); } },
        { cap: '<b>React to a change.</b> Remember the last reading in a variable. Only when the pin <i>changes</i> from LOW to HIGH is it a new event. Better — but every bounce is a change, so one shake still gives 9 answers.', draw: function (svg, S2, st) { st.run('edge'); } },
        { cap: '<b>A change, plus quiet time.</b> After an answer, ignore the switch for 1 second using <code>millis()</code>. The first bounce triggers one answer and the rest of the rattle is ignored. This trick is called <b>debouncing</b>, and every keyboard and game controller does it.', draw: function (svg, S2, st) { st.run('quiet'); } }
      ] });
  }

  /* ---------- 06 random answers ---------- */
  steps.push({ id: 'answers', title: 'Random answers on a shake', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A fortune teller that always says the same thing isn’t much fun. Your box needs to pick an answer at random, from a list you write.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'How a computer rolls dice', w: 820, h: 330,
      init: function (svg, S2, st) { S('rect', { x: 0, y: 0, width: 820, height: 330, fill: BG }, svg); st.layer = S('g', {}, svg); },
      frames: [
        { cap: '<b><code>random(8)</code> is an 8-sided die.</b> It gives a whole number from <b>0 up to 7</b> — never 8. The number in the brackets is how many possible results there are. <code>random(1, 7)</code> would give 1 to 6, like a normal die.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer, boxes = [];
          for (var i = 0; i < 8; i++) { boxes.push(S('rect', { x: 130 + i * 72, y: 110, width: 60, height: 60, rx: 6, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, g)); T(g, 160 + i * 72, 148, String(i), { 'text-anchor': 'middle', 'font-size': 22 }); }
          T(g, 410, 70, 'random(8)', { 'text-anchor': 'middle', fill: CY, 'font-size': 20 });
          var res = T(g, 410, 230, '', { 'text-anchor': 'middle', fill: MUT, 'font-family': SANS, 'font-size': 15 });
          var spin = 0, target = 0;
          (function roll() {
            target = Math.floor(Math.random() * 8); var k = 0, n = 10 + target;
            (function hop() { boxes.forEach(function (bx, j) { bx.setAttribute('stroke', j === k % 8 ? CY : '#9fb3c8'); bx.setAttribute('fill', j === k % 8 ? '#0a2a36' : '#0e1826'); }); k++; if (k <= n) st.later(hop, 60 + k * 6); else { res.textContent = 'this time: ' + target; st.later(roll, 1500); } })();
          })();
        } },
        { cap: '<b>It isn’t truly random.</b> A computer can only follow instructions, so <code>random()</code> uses a formula that turns each number into the next one. The numbers <i>look</i> random — but every time the UNO restarts, the formula starts from the same place and gives the <b>same list in the same order</b>.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer, seq = [6, 1, 3, 3, 7, 0, 5, 2];
          [0, 1].forEach(function (run) {
            var y = 100 + run * 110;
            T(g, 70, y + 36, run ? 'RESET' : 'POWER ON', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
            seq.forEach(function (n, i) { st.later(function () { S('rect', { x: 200 + i * 66, y: y, width: 54, height: 54, rx: 6, fill: '#0e1826', stroke: run ? SIG : CY, 'stroke-width': 2, 'class': 'part-new' }, g); T(g, 227 + i * 66, y + 36, String(n), { 'text-anchor': 'middle', 'font-size': 22, fill: run ? SIG : CY }); }, 200 + run * 1800 + i * 180); });
          });
          st.later(function () { T(g, 410, 310, 'same order every time: your box would give the same fortunes after each reset', { 'text-anchor': 'middle', fill: SIG, 'font-family': SANS, 'font-size': 14 }); }, 3700);
        } },
        { cap: '<b>Give it a random starting point: a seed.</b> <code>randomSeed(analogRead(A1));</code> reads A1, a pin with <b>nothing connected</b>. Like the floating button pin in Mission 01, it picks up electrical noise, so it reads a slightly different number every time. That number becomes the formula’s starting point, and each restart gives a different list.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          T(g, 140, 70, 'analogRead(A1)', { 'text-anchor': 'middle', fill: CY, 'font-size': 15 });
          var tr = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 2 }, g), pts = [];
          for (var i = 0; i <= 60; i++) pts.push((40 + i * 3.4) + ',' + (150 + Math.sin(i * 1.7) * 18 + (Math.random() - 0.5) * 26));
          tr.setAttribute('points', pts.join(' '));
          T(g, 140, 210, 'nothing connected = noise', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
          var runs = [[389, [2, 7, 4, 0, 6, 1]], [412, [5, 0, 3, 6, 6, 2]], [377, [1, 4, 7, 3, 0, 5]]];
          runs.forEach(function (rn, k) {
            var y = 70 + k * 80;
            st.later(function () {
              T(g, 330, y + 30, 'seed ' + rn[0], { fill: SIG, 'font-size': 13 });
              rn[1].forEach(function (n, i) { S('rect', { x: 440 + i * 56, y: y, width: 46, height: 46, rx: 6, fill: '#0e1826', stroke: CY, 'stroke-width': 2 }, g); T(g, 463 + i * 56, y + 31, String(n), { 'text-anchor': 'middle', 'font-size': 20, fill: CY }); });
            }, 300 + k * 900);
          });
        } },
        { cap: '<b>An array holds the list of answers.</b> <code>String answers[] = { … };</code> is one variable that holds many pieces of text, numbered from 0. <code>answers[pick]</code> grabs the one at position <code>pick</code>. Roll <code>random(8)</code>, and you have a random answer.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer, A = ['Yes!', 'No way', 'Ask again later', 'Without a doubt', 'Not today', 'Signs say yes', 'Very doubtful', 'Try a pizza'], rows = [];
          A.forEach(function (a, i) { var y = 40 + i * 34; rows.push(S('rect', { x: 120, y: y, width: 250, height: 28, rx: 4, fill: '#0e1826', stroke: GRID }, g)); T(g, 104, y + 19, String(i), { 'text-anchor': 'end', fill: MUT }); T(g, 134, y + 19, '"' + a + '"', { fill: INK, 'font-size': 13 }); });
          T(g, 245, 26, 'answers[]', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var pickT = T(g, 430, 90, '', { fill: CY, 'font-size': 15 }), L = lcdArt(g, 470, 180, 17);
          (function go() { var p = Math.floor(Math.random() * 8); rows.forEach(function (r, i) { r.setAttribute('stroke', i === p ? CY : GRID); r.setAttribute('fill', i === p ? '#0a2a36' : '#0e1826'); }); pickT.textContent = 'pick = random(8);  // ' + p; L.set(['The answer is:', A[p]]); st.later(go, 1800); })();
        } }
      ] });
    answerLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-rand', q: 'Which numbers can <code>random(6)</code> give?', options: ['1, 2, 3, 4, 5, 6', '0, 1, 2, 3, 4, 5', '0 to 6', '1 to 5'], answer: 1, explain: 'random(n) gives 0 up to n − 1 — six possible numbers, starting at 0. That’s exactly the right range for an array with 6 items.', hints: { 0: 'random() starts counting at 0, like array positions.', 2: 'random(n) never gives n itself.' } });
    UI.numq(b, ctx, { id: 'q-arr', q: 'An array has 10 answers. What is the position (index) of the <b>last</b> one?', answer: 9, tol: 0, unit: '', explain: 'Positions start at 0, so 10 items are numbered 0 to 9. Asking for answers[10] would read past the end of the list.', hint: 'The first one is at position 0.' });
    UI.html(b, '<h2>Code it: an answer on every shake</h2><p>This sketch puts together everything from the last two steps: the tilt switch, change detection with a quiet time, a seed, and an array. Step through it, then make the answers your own.</p>');
    RL.Code.walk(b, SHAKE, [
      { lines: [ln(SHAKE, 'String answers'), ln(SHAKE, 'NUM_ANSWERS = 4')], title: 'The list of answers', html: '<p>A <code>String</code> array with one answer per line, in double quotes, with a comma after each one (even the last). <code>NUM_ANSWERS</code> must match how many there are: <code>random(NUM_ANSWERS)</code> uses it to choose a position.</p><p>The screen is 16 characters wide, so longer answers get cut off.</p>' },
      { lines: [ln(SHAKE, 'int lastReading'), ln(SHAKE, 'unsigned long lastAnswer')], title: 'Two memory variables', html: '<p><code>lastReading</code> remembers what the switch read last time, so we can spot a change. <code>lastAnswer</code> remembers <i>when</i> the last answer appeared. <code>millis()</code> gets huge, so it needs an <code>unsigned long</code> (a whole number up to about 4 billion).</p>' },
      { lines: [ln(SHAKE, 'randomSeed'), ln(SHAKE, 'randomSeed')], title: 'Plant the seed', html: '<p>Once, in setup(): a noisy reading from the empty A1 pin seeds the random formula. (In the Virtual UNO you’ll see a “Heads up” that nothing is connected to A1. Here that’s exactly the point.)</p>' },
      { lines: [ln(SHAKE, 'if (reading == HIGH'), ln(SHAKE, 'if (reading == HIGH')], title: 'A shake = a change + quiet time', html: '<p>Three conditions joined by <code>&amp;&amp;</code> (“and”): the pin is HIGH now, it was LOW last time, and more than 1000 ms have passed since the last answer.</p>' },
      { lines: [ln(SHAKE, 'int pick'), ln(SHAKE, 'lastAnswer = millis()')], title: 'Show a random answer', html: '<p>Pick a position, clear the screen, print a heading, then <code>answers[pick]</code> on the bottom row. Store the time for the quiet-time check.</p>' },
      { lines: [ln(SHAKE, 'lastReading = reading;'), ln(SHAKE, 'lastReading = reading;')], title: 'Remember for next time', html: '<p>The last line of loop() saves this reading. Next time around, it becomes the “before” in the comparison.</p>' }
    ], { name: 'fortune_shake', download: false });
    UI.html(b, '<h2>Your turn</h2><p>In the Virtual UNO, add <b>at least 4 answers of your own</b> to the list (funny, mysterious, or useful — keep each one to 16 characters), and update <code>NUM_ANSWERS</code> to match. Then click the tilt switch twice — stand it up, tip it over — to shake.</p>');
    RL.Sim.create(b, { title: 'Fortune on a shake', code: SHAKE, name: 'fortune_shake', key: 'sim-shake', ctx: ctx, board: { parts: ALL, show: IDS_TILT, view: SIM_VIEW, vb: WIDE }, lcd: 'lcd', buttons: { 2: { part: 'tilt', wiring: 'pullup', toggle: true, label: 'Tilt switch' } },
      runHint: 'click the tilt switch to stand it up, then click again to tip it: that’s a shake.', checkAfter: 1300,
      check: function (log, sim) {
        var src = sim.editor.value, m = /answers\s*\[\s*\]\s*=\s*\{([\s\S]*?)\}\s*;/.exec(src);
        var list = m ? (m[1].replace(/\/\/[^\n]*/g, '').match(/"(?:[^"\\]|\\.)*"/g) || []).map(function (s) { return s.slice(1, -1); }) : [];
        var nm = /NUM_ANSWERS\s*=\s*(\d+)/.exec(src), num = nm ? Number(nm[1]) : 0;
        if (list.length < 6) return { pass: false, msg: 'Your list has ' + list.length + ' answers. Add at least ' + (6 - list.length) + ' more of your own between the { and the };' };
        if (num !== list.length) return { pass: false, msg: 'Your list has ' + list.length + ' answers, but NUM_ANSWERS is ' + num + '. ' + (num < list.length ? 'The last ' + (list.length - num) + ' could never be picked.' : 'random() could pick a position past the end of the list.') + ' Make them match.' };
        var long = list.filter(function (s) { return s.length > 16; });
        return new Promise(function (resolve) {
          var seen = {}, shown = [], k = 0;
          (function shake() {
            sim.press(2, true);
            setTimeout(function () { sim.press(2, false); setTimeout(function () { var l = sim.state().lcd[1].trim(); shown.push(l); seen[l] = 1; k++; if (k < 6) shake(); else done(); }, 1150); }, 160);
          })();
          function done() {
            var bad = shown.filter(function (s) { return list.every(function (a) { return a.slice(0, 16).trim() !== s; }); }), n = Object.keys(seen).length, r;
            if (bad.length) r = { pass: false, msg: 'After a shake the bottom row showed “' + bad[0] + '”, which isn’t one of your answers. Is answers[pick] printed on row 1?' };
            else if (n < 2) r = { pass: false, msg: 'Six shakes all gave “' + shown[0] + '”. Is pick = random(NUM_ANSWERS) inside the if?' };
            else r = { pass: true, msg: 'Six shakes gave ' + n + ' different answers, like “' + Object.keys(seen).slice(0, 3).join('”, “') + '”.' + (long.length ? ' (Heads up: “' + long[0] + '” is longer than 16 characters and will be cut off.)' : '') };
            ctx.check('sim-shake-pass', r.pass ? 1 : 0); resolve(r);
          }
        });
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show a finished list</summary><p class="small">Eight answers, and NUM_ANSWERS set to 8 to match. Note the comma after every answer.</p>';
    RL.Code.block(hint, SHAKE_HINT, { download: false }); b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">Upload it to your board. Hold the breadboard flat, then give it a quick shake.</p>');
  } });
  function answerLab(b, ctx) {
    var A = ['Yes!', 'No way', 'Ask again later', 'Without a doubt', 'Not today', 'Signs say yes', 'Very doubtful', 'Try a pizza'];
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Two ways to choose the text</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 300', role: 'img', 'aria-label': 'An answer picked at random from a list' }); stage.appendChild(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 300, fill: BG }, svg);
    var rows = A.map(function (a, i) { var y = 22 + i * 33; var r = S('rect', { x: 70, y: y, width: 230, height: 27, rx: 4, fill: '#0e1826', stroke: GRID }, svg); T(svg, 56, y + 18, String(i), { 'text-anchor': 'end', fill: MUT }); T(svg, 82, y + 18, a, { fill: INK, 'font-size': 13 }); return r; });
    var L = lcdArt(svg, 385, 120, 19); L.set(['Ask a question,', 'then shake me!']);
    var pk = T(svg, 560, 60, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 16 });
    var row = el('div', 'slider-row');
    var go = el('button', 'btn btn-primary btn-small', 'Shake'); go.type = 'button';
    var tabs = el('div', 'res-pills'); var view = 'array';
    [['array', 'Array version'], ['switch', 'switch / case version']].forEach(function (t) { var bt = el('button', t[0] === view ? 'on' : '', t[1]); bt.type = 'button'; bt.addEventListener('click', function () { view = t[0]; tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === bt); }); show(last); }); tabs.appendChild(bt); });
    row.appendChild(go); row.appendChild(tabs); box.appendChild(row);
    var code = el('pre', ''); code.style.cssText = 'margin:0;padding:12px 16px;border-top:1px solid var(--grid);font:13px/20px var(--mono);color:var(--ink);background:var(--bg);white-space:pre-wrap';
    box.appendChild(code); b.appendChild(box);
    var last = null;
    function show(p) {
      if (view === 'array') code.innerHTML = 'int pick = random(8);' + (p != null ? '            <span style="color:var(--cyan)">// pick = ' + p + '</span>' : '') + '\nlcd.print(answers[pick]);' + (p != null ? '        <span style="color:var(--cyan)">// "' + esc(A[p]) + '"</span>' : '');
      else code.innerHTML = 'int pick = random(8);' + (p != null ? '   <span style="color:var(--cyan)">// pick = ' + p + '</span>' : '') + '\nswitch (pick) {\n' + A.map(function (a, i) { return (i === p ? '<span style="color:var(--cyan)">' : '') + '  case ' + i + ': lcd.print("' + esc(a) + '"); break;' + (i === p ? '   ← runs this one</span>' : ''); }).join('\n') + '\n}';
    }
    go.addEventListener('click', function () {
      go.disabled = true; var p = Math.floor(Math.random() * 8), k = 0, n = 12 + p;
      (function hop() { rows.forEach(function (r, i) { r.setAttribute('stroke', i === k % 8 ? CY : GRID); r.setAttribute('fill', i === k % 8 ? '#0a2a36' : '#0e1826'); }); k++; if (k <= n) setTimeout(hop, 40 + k * 5); else { last = p; pk.textContent = 'random(8) → ' + p; L.set(['The answer is:', A[p]]); show(p); go.disabled = false; ctx.check('answerlab', 1); } })();
    });
    show(null);
    UI.html(b, '<p class="small muted">Both versions do the same job. An <b>array</b> is shorter and easy to grow. <b>switch / case</b> jumps to the <code>case</code> that matches a number; it shines when each choice needs different code, not just different text. You’ll use it for the box’s modes.</p>');
  }

  /* ---------- 07 thermometer mode ---------- */
  steps.push({ id: 'thermo', title: 'Thermometer mode', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your box gets a second trick: a live thermometer. The sensor is a <b>thermistor</b> — a <i>therm</i>al res<i>istor</i> whose resistance changes with temperature.</p>' +
      '<p>Yours is an <b>NTC</b> thermistor (negative temperature coefficient): <b>warmer means less resistance</b>. At 25 °C it’s 10 kΩ; pinch it between your fingers and it drops to about 7 kΩ. The UNO can’t measure resistance directly, but you already know the trick from Mission 02: put it in a <b>voltage divider</b> and measure the voltage.</p>');
    thermLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-therm', q: 'In your divider the thermistor is on the 5 V side and the 10 kΩ is on the ground side. You warm the thermistor with your fingers. What happens to the analogRead() number?', options: ['It goes up: less resistance on top lets the middle voltage rise', 'It goes down: warmer means less voltage', 'It stays the same: the 10 kΩ doesn’t change', 'It jumps to 1023'], answer: 0, explain: 'The two resistors share the 5 V. When the top one shrinks, it takes a smaller share, so more is left across the bottom 10 kΩ — and that is the voltage A0 measures.', hints: { 1: 'Which resistor’s share of the voltage gets smaller?', 2: 'The divider’s output depends on both resistors.' } });
    UI.html(b, '<h2>Build: add the thermistor</h2>');
    B.guide(b, { title: 'Thermometer', vb: WIDE, parts: ALL, base: IDS_TILT, steps: [
      { title: 'Start from the fortune circuit', view: 'all', html: '<p>Keep everything. The thermistor goes in the bottom-left corner of the breadboard.</p>' },
      { title: 'Thermistor to 5 V', add: ['th5', 'th'], html: '<p>Push the thermistor (black bead, two legs, either way round) into <b>c27</b> and <b>c29</b>. Red jumper from the <b>+ rail to a27</b>.</p>' },
      { title: 'The 10 kΩ to ground', add: ['thr'], html: '<p>A <b>10 kΩ</b> resistor (' + RL.resistorName(10000) + ') from <b>a29</b> to the <b>− rail</b>. Row 29 is now the middle of the divider.</p>' },
      { title: 'The middle → A0', add: ['tha'], html: '<p>Yellow wire from <b>A0</b> to <b>e29</b>. Route it around the bottom of the UNO and along the bottom of the breadboard.</p>' }
    ] });
    UI.html(b, '<h2>Code it: from a reading to degrees</h2><p>Turning the reading into a temperature takes two steps: work out the thermistor’s resistance from the divider, then use the <b>Steinhart–Hart equation</b>, a formula from the thermistor’s datasheet that matches its curve. (This is the same maths ELEGOO’s thermometer example uses.)</p>');
    RL.Code.walk(b, THERMO, [
      { lines: [13, 13], title: 'Read the divider', html: '<p>0 to 1023 for 0 to 5 V. At 25 °C both resistors are 10 kΩ, the middle sits at 2.5 V, and you read about 512.</p>' },
      { lines: [14, 14], title: 'Reading → resistance', html: '<p>The divider rule, turned around to find the top resistor: R = 10 000 × (1024 ÷ reading − 1). For 512: 10 000 × (2 − 1) = 10 000 Ω. The <code>.0</code> on the numbers makes the UNO do decimal maths instead of whole-number maths.</p>' },
      { lines: [15, 17], title: 'Resistance → temperature', html: '<p>Steinhart–Hart works in <b>kelvin</b> using the natural log of the resistance (<code>log()</code> in Arduino). The three long numbers are this thermistor’s constants. Subtract 273.15 to get Celsius.</p>' },
      { lines: [19, 21], title: 'Show it', html: '<p><code>lcd.print(tempC, 1)</code> prints a decimal with 1 digit after the point. The spaces afterwards wipe out any old characters when the number gets shorter.</p>' }
    ], { name: 'thermometer' });
    UI.html(b, '<p>Run it, then drag the <b>A0 · thermistor</b> slider: right is warmer (a higher reading).</p>');
    RL.Sim.create(b, { title: 'Thermometer', code: THERMO, name: 'thermometer', key: 'sim-thermo', ctx: ctx, board: { parts: ALL, show: IDS_THERM, view: SIM_VIEW, vb: WIDE }, lcd: 'lcd', analog: { 0: { label: 'thermistor (right = warmer)', value: 512, part: 'th' } },
      runHint: 'drag the thermistor slider to warm it up.', checkAfter: 1200,
      check: function (log, sim) {
        function temp() { var m = /(-?\d+\.\d)/.exec(sim.state().lcd.join(' ')); return m ? Number(m[1]) : null; }
        return new Promise(function (resolve) {
          sim.setAnalog(0, 512);
          setTimeout(function () {
            var t1 = temp(); sim.setAnalog(0, 700);
            setTimeout(function () {
              var t2 = temp(), r; sim.setAnalog(0, 512);
              if (t1 == null) r = { pass: false, msg: 'No temperature with a decimal point on the screen. Is lcd.print(tempC, 1) there?' };
              else if (Math.abs(t1 - 25) > 1.5) r = { pass: false, msg: 'A reading of 512 should be about 25 °C, but the screen shows ' + t1 + '. Check the resistance and Steinhart lines.' };
              else if (t2 == null || t2 < t1 + 10) r = { pass: false, msg: 'Warming the thermistor (reading 700) should show about 43 °C, but the screen shows ' + t2 + '.' };
              else r = { pass: true, msg: 'Reading 512 → ' + t1 + ' °C, reading 700 → ' + t2 + ' °C. Your thermometer works.' };
              ctx.check('sim-thermo-pass', r.pass ? 1 : 0); resolve(r);
            }, 1100);
          }, 900);
        });
      } });
    UI.html(b, '<p style="margin-top:16px">Upload it and check it against a real thermometer if your classroom has one. Pinch the thermistor and watch it climb toward body temperature. Breathe on it. Hold an ice cube in a bag near it.</p>');
    UI.numq(b, ctx, { id: 'q-res', q: 'analogRead gives <b>682</b>. Use R = 10 000 × (1024 ÷ reading − 1) to find the thermistor’s resistance in ohms.', answer: 5015, tol: 40, unit: 'Ω', explain: '1024 ÷ 682 = 1.501, minus 1 = 0.501, × 10 000 ≈ <b>5015 Ω</b>. Less than 10 kΩ, so it’s warmer than 25 °C (about 41 °C).', hint: 'Divide 1024 by 682 first, subtract 1, then multiply by 10 000.' });
  } });
  function thermLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>From temperature to a number</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 280', role: 'img', 'aria-label': 'A thermistor voltage divider' }); stage.appendChild(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 280, fill: BG }, svg); glowDefs(svg);
    T(svg, 120, 34, '5V', { 'text-anchor': 'middle', fill: '#e5484d', 'font-size': 14, 'font-weight': 600 });
    S('path', { d: 'M120 42 V70 M120 130 V150 H260 M120 150 V170 M120 230 V252', stroke: '#9fb3c8', 'stroke-width': 3, fill: 'none' }, svg);
    S('path', { d: 'M102 252 h36 M108 259 h24 M114 266 h12', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
    var therm = S('rect', { x: 106, y: 70, width: 28, height: 60, rx: 8, fill: '#1c1f24', stroke: '#4b5563', 'stroke-width': 2 }, svg);
    var heat = S('circle', { cx: 120, cy: 100, r: 44, fill: 'url(#m6g-orange)', opacity: 0 }, svg);
    var rT = T(svg, 148, 96, '', { fill: CY, 'font-size': 13 }); T(svg, 148, 116, 'THERMISTOR', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    RL.drawResistorBody(S('g', { transform: 'translate(120 200) rotate(90)' }, svg), 10000, 56, 24);
    T(svg, 148, 204, '10 kΩ', { fill: MUT, 'font-size': 12 });
    S('rect', { x: 260, y: 132, width: 64, height: 36, rx: 3, fill: '#15497a', stroke: '#2e6aa3' }, svg); T(svg, 292, 155, 'A0', { 'text-anchor': 'middle', 'font-size': 13 });
    var vT = T(svg, 190, 142, '', { fill: CY, 'font-size': 13, 'text-anchor': 'middle' });
    // the chain of numbers
    var labels = ['TEMPERATURE', 'RESISTANCE', 'VOLTAGE AT A0', 'analogRead()', 'STEINHART SAYS'], vals = [];
    labels.forEach(function (l, i) { var y = 40 + i * 50; T(svg, 420, y, l, { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' }); vals.push(T(svg, 420, y + 24, '', { fill: i === 4 ? GO : CY, 'font-size': 18, 'font-weight': 600 })); if (i < 4) S('path', { d: 'M400 ' + (y + 30) + ' v14 l-4 -5 M400 ' + (y + 44) + ' l4 -5', stroke: GRID, 'stroke-width': 2, fill: 'none' }, svg); });
    var thermo = S('rect', { x: 700, y: 50, width: 24, height: 190, rx: 12, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg), merc = S('rect', { x: 706, y: 100, width: 12, height: 134, rx: 6, fill: SIG }, svg);
    S('circle', { cx: 712, cy: 244, r: 16, fill: SIG }, svg);
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Temperature</label>';
    var r = el('input'); r.type = 'range'; r.min = -10; r.max = 50; r.value = 25; r.setAttribute('aria-label', 'Temperature'); var o = el('b', '', '25 °C');
    row.appendChild(r); row.appendChild(o); box.appendChild(row); b.appendChild(box);
    function upd() {
      var t = Number(r.value), R = shRes(t), v = 5 * 10000 / (10000 + R), reading = Math.round(1024 * 10000 / (10000 + R)), back = shTemp(10000 * (1024 / reading - 1));
      o.textContent = t + ' °C';
      rT.textContent = (R / 1000).toFixed(1) + ' kΩ'; vT.textContent = v.toFixed(2) + ' V';
      vals[0].textContent = t + ' °C'; vals[1].textContent = Math.round(R).toLocaleString('en-CA') + ' Ω'; vals[2].textContent = v.toFixed(2) + ' V'; vals[3].textContent = String(reading); vals[4].textContent = back.toFixed(1) + ' °C';
      heat.setAttribute('opacity', Math.max(0, (t - 15) / 40));
      var h = 20 + (t + 10) / 60 * 160; merc.setAttribute('y', 234 - h); merc.setAttribute('height', h);
      ctx.check('thermlab', 1);
    }
    r.addEventListener('input', upd); upd();
  }

  /* ---------- 08 final code ---------- */
  steps.push({ id: 'final', title: 'Code it: the fortune teller', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now combine everything into one program with two <b>modes</b>. The box only has one input — the tilt switch — so it has to tell a quick shake apart from a long tip, just like a phone can tell a tap from a long-press.</p>');
    modeFlow(b);
    RL.Code.walk(b, FINAL, [
      { lines: [ln(FINAL, 'String answers'), ln(FINAL, 'NUM_ANSWERS = 8')], title: 'Your answers', html: '<p>Paste in your own list from the last step (and its NUM_ANSWERS).</p>' },
      { lines: [ln(FINAL, '// the two modes'), ln(FINAL, 'int mode = FORTUNE')], title: 'Modes as numbers', html: '<p>The variable <code>mode</code> remembers which mode the box is in. Giving the numbers names (<code>FORTUNE</code> = 0, <code>THERMO</code> = 1) makes the code read like English.</p>' },
      { lines: [ln(FINAL, 'unsigned long tipStart'), ln(FINAL, 'bool handled')], title: 'Timing a tip', html: '<p><code>tipStart</code> stores <i>when</i> the box was tipped. <code>handled</code> is a <code>bool</code> (true or false) that stops one tip from doing two jobs.</p>' },
      { lines: [ln(FINAL, 'just tipped'), ln(FINAL, 'just tipped') + 3], title: 'Just tipped: start the clock', html: '<p>The switch changed from LOW to HIGH: note the time. Nothing happens yet — the box doesn’t know if this is a shake or a long tip.</p>' },
      { lines: [ln(FINAL, 'tipped for 2 s'), ln(FINAL, 'tipped for 2 s') + 3], title: 'Still tipped after 2 seconds?', html: '<p>If it has stayed HIGH for more than 2000 ms, it’s a long tip: switch modes, and mark it handled so setting the box down again does nothing.</p>' },
      { lines: [ln(FINAL, 'upright again'), ln(FINAL, 'upright again') + 5], title: 'Back upright: was it a shake?', html: '<p>The switch went back to LOW before 2 seconds were up. If the tip lasted more than 30 ms (not just a tiny bounce) and we’re in fortune mode, tell a fortune. <code>!handled</code> means “not handled”: <code>!</code> flips true and false.</p>' },
      { lines: [ln(FINAL, 'switch (mode)'), ln(FINAL, 'switch (mode)') + 9], title: 'switch / case on the mode', html: '<p>Each <code>case</code> holds the code for one mode, and <code>break</code> ends it. Fortune mode has nothing to update. Thermometer mode refreshes the temperature every 500 ms — timed with millis(), not delay(), so the box keeps watching the switch in between.</p>' },
      { lines: [ln(FINAL, 'void tellFortune'), ln(FINAL, 'lcd.print(answers[pick])')], title: 'A bit of suspense', html: '<p>A <code>for</code> loop prints three dots with a pause between each before revealing the answer. The pauses also give the ball time to stop bouncing.</p>' },
      { lines: [ln(FINAL, 'void switchMode'), ln(FINAL, 'void switchMode') + 9], title: 'Flip the mode', html: '<p>If it was fortune mode, go to thermometer mode, and vice versa.</p>' }
    ], { name: 'fortune_teller' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Click the tilt switch to stand the box up. Then: <b>click twice quickly</b> (tip and back) for a fortune, or <b>click once and wait 2 seconds</b> for thermometer mode. <b>Check my code</b> tries both for you.</p>');
    RL.Sim.create(b, { title: 'Fortune teller', code: FINAL, name: 'fortune_teller', key: 'sim-final', ctx: ctx, board: { parts: ALL, show: IDS_ALL, view: SIM_VIEW, vb: WIDE }, lcd: 'lcd', buttons: { 2: { part: 'tilt', wiring: 'pullup', toggle: true, label: 'Tilt switch' } }, analog: { 0: { label: 'thermistor (right = warmer)', value: 512, part: 'th' } },
      runHint: 'click the tilt switch: twice quickly for a fortune, once and wait 2 s to change mode.', checkAfter: 1500,
      check: function (log, sim) {
        function txt() { return sim.state().lcd.join(' | '); }
        function temp() { var m = /(-?\d+\.\d)/.exec(sim.state().lcd.join(' ')); return m ? Number(m[1]) : null; }
        var title = txt();
        return new Promise(function (resolve) {
          function fin(r) { ctx.check('sim-final-pass', r.pass ? 1 : 0); sim.setAnalog(0, 512); resolve(r); }
          if (!title.replace(/[ |]/g, '')) return fin({ pass: false, msg: 'The screen is blank at the start. Is titleScreen() called in setup()?' });
          sim.press(2, true);
          setTimeout(function () {
            sim.press(2, false);
            setTimeout(function () {
              sim.press(2, true);
              setTimeout(function () {
                var f = sim.state().lcd;
                if (txt() === title || !f[1].trim() || /think/i.test(txt())) return fin({ pass: false, msg: 'A quick shake (tip and back) should end with an answer on the bottom row. The screen shows “' + txt() + '”.' });
                var fortune = f[1].trim();
                sim.press(2, false);
                setTimeout(function () {
                  var t1 = temp();
                  if (t1 == null) return fin({ pass: false, msg: 'Holding the box tipped for 2.5 s should switch to thermometer mode and show a temperature like 25.0. The screen shows “' + txt() + '”.' });
                  sim.setAnalog(0, 700);
                  setTimeout(function () {
                    var t2 = temp();
                    if (t2 == null || t2 < t1 + 5) return fin({ pass: false, msg: 'In thermometer mode the temperature should keep updating. Warming the thermistor didn’t change it (' + t1 + ' → ' + t2 + ').' });
                    sim.press(2, true);
                    fin({ pass: true, msg: 'Shake → “' + fortune + '”. Long tip → thermometer mode, ' + t1 + ' °C rising to ' + t2 + ' °C when warmed. Your fortune teller works.' });
                  }, 1200);
                }, 2900);
              }, 2700);
            }, 400);
          }, 400);
        });
      } });
    UI.html(b, '<h2>Upload to your board</h2><p>Paste your own answers in, upload, and try both gestures for real. If something’s off, check here before changing the code:</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>A fortune every time you set it down</b><br><span class="small muted">Your tilt switch is leaning. Straighten it so the ball rests on the contacts when the board is flat.</span></div></div><div class="trow"><div><b>Shaking does nothing</b><br><span class="small muted">Shake up and down, not side to side, so the ball lifts off the contacts. Check pin 2 → f19 and g21 → g18.</span></div></div><div class="trow"><div><b>The temperature is way off (like −40 or 300)</b><br><span class="small muted">The thermistor and 10 kΩ are swapped, or A0 isn’t connected to row 29.</span></div></div><div class="trow"><div><b>Same fortunes in the same order after every reset</b><br><span class="small muted">randomSeed(analogRead(A1)) is missing, or something is plugged into A1.</span></div></div></div>');
  } });
  function modeFlow(b) {
    UI.explainer(b, { label: 'Flowchart', title: 'One switch, two gestures', w: 820, h: 330,
      init: function (svg, S2, st) {
        S('rect', { x: 0, y: 0, width: 820, height: 330, fill: BG }, svg);
        var mk = S('defs', {}, svg), m = S('marker', { id: 'm6arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, mk); S('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#9fb3c8' }, m);
        function arrow(d) { return S('path', { d: d, fill: 'none', stroke: '#9fb3c8', 'stroke-width': 2, 'marker-end': 'url(#m6arr)' }, svg); }
        st.boxes = {};
        function boxx(id, x, y, w, h, t, t2) { var r = S('rect', { x: x, y: y, width: w, height: h, rx: 8, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg); T(svg, x + w / 2, y + h / 2 + (t2 ? -2 : 5), t, { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 15 }); if (t2) T(svg, x + w / 2, y + h / 2 + 18, t2, { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 }); st.boxes[id] = r; }
        boxx('fort', 60, 40, 220, 70, 'FORTUNE mode', 'title screen, answers');
        boxx('therm', 60, 220, 220, 70, 'THERMO mode', 'live temperature');
        boxx('ans', 470, 40, 220, 70, 'Thinking… answer', 'random(NUM_ANSWERS)');
        arrow('M280 66 C 360 66, 390 66, 468 66'); T(svg, 375, 56, 'quick shake', { 'text-anchor': 'middle', fill: CY, 'font-size': 12 });
        arrow('M468 92 C 390 92, 360 92, 282 92'); T(svg, 375, 112, 'stays on screen', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
        arrow('M140 110 V218'); arrow('M200 220 V112');
        T(svg, 130, 170, 'tipped 2 s', { 'text-anchor': 'end', fill: SIG, 'font-size': 12 }); T(svg, 212, 170, 'tipped 2 s', { fill: SIG, 'font-size': 12 });
        T(svg, 170, 314, 'quick shakes are ignored here', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
        st.L = lcdArt(svg, 470, 205, 13);
        st.hl = function (id) { Object.keys(st.boxes).forEach(function (k) { var on = k === id; st.boxes[k].setAttribute('stroke', on ? CY : '#9fb3c8'); st.boxes[k].setAttribute('fill', on ? '#0a2a36' : '#0e1826'); st.boxes[k].setAttribute('stroke-width', on ? 3 : 2); }); };
      },
      frames: [
        { cap: '<b>The box starts in fortune mode</b> with a title screen, waiting for a shake.', draw: function (svg, S2, st) { st.hl('fort'); st.L.set(['* MAGIC  BOX *', 'Shake to ask...']); } },
        { cap: '<b>A quick shake</b> — tipped for less than 2 seconds, then upright again — shows “Thinking…” and an answer. The answer stays until the next shake.', draw: function (svg, S2, st) { st.hl('ans'); st.L.set(['Thinking', '']); st.later(function () { st.L.set(['Thinking...', '']); }, 700); st.later(function () { st.L.set(['The box says:', 'Signs say yes']); st.hl('fort'); }, 1600); } },
        { cap: '<b>Tipped for 2 seconds</b> (lay it on its side) switches to thermometer mode. The code times the tip with <code>millis()</code>: it notes when the box tipped, and keeps checking how long ago that was.', draw: function (svg, S2, st) { st.hl('therm'); st.L.set(['Thermometer', '22.4 C']); var t = 22.4; (function up() { t += 0.3; st.L.set(['Thermometer', t.toFixed(1) + ' C']); st.later(up, 600); })(); } },
        { cap: '<b>Another 2-second tip goes back</b> to fortune mode and the title screen. Two gestures, one switch: all it took was a timer and a variable that remembers the mode.', draw: function (svg, S2, st) { st.hl('fort'); st.L.set(['* MAGIC  BOX *', 'Shake to ask...']); } }
      ] });
  }

  /* ---------- 09 the case ---------- */
  steps.push({ id: 'case', title: 'Design & build the magic box', stage: '03 Imagine · 05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A fortune teller needs mystery: no wires, just a glowing window. Your job is to design a box that hides the circuit, shows the screen, and still lets the tilt switch do its job.</p><p>Here’s one way to do it. Change the size, shape or style as you like — the rules are in the callout below.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut on a cutting mat, away from your body, with a sharp blade (dull blades slip). Hot glue burns: hold pieces by the edges and let glue cool before touching. Unplug the USB while you move the circuit into the box.</p>');
    caseBuild(b);
    UI.callout(b, '', 'Three rules for a working box', '<ul><li><b>The tilt switch must stand upright</b> when the box sits normally. That’s why the breadboard lies flat on the floor of the box and the window is in the lid.</li><li><b>The screen sits right under the window.</b> Raise the breadboard on a cardboard platform until the LCD almost touches the lid.</li><li><b>Leave a way in</b> for the USB cable, and a small hole above the contrast knob so you can adjust it with a pencil.</li></ul>');
    UI.callout(b, '', 'Design ideas', '<ul><li>Paint the lid dark and add stars, an eye, or crystal-ball art around the window.</li><li>Tape tissue paper or tracing paper over the window for a spooky glow.</li><li>Extend the thermistor on two female-to-male wires and poke it out of a small hole, labelled “touch me.”</li><li>Write instructions on the side: “Ask. Shake. Know. (Hold on side for temperature.)”</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your box, and why. Mention where you put the tilt switch.', placeholder: 'I put the window… because… The tilt switch is…' });
  } });
  function caseBuild(b) {
    var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72';
    function base(svg) { clear(svg); glowDefs(svg); S('rect', { x: 0, y: 0, width: 800, height: 380, fill: BG }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard magic box', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Plan the inside.</b> Use a box at least <b>15 × 10 cm</b> on the bottom and about 6 cm deep. Seen from above: the UNO on one side, the breadboard on the other, the LCD on top of the breadboard facing up.', draw: function (svg) {
        base(svg);
        S('rect', { x: 150, y: 40, width: 500, height: 300, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg);
        S('rect', { x: 166, y: 56, width: 468, height: 268, rx: 4, fill: '#6b4a26' }, svg);
        S('rect', { x: 190, y: 90, width: 150, height: 200, rx: 6, fill: '#15497a', stroke: '#2e6aa3', 'stroke-width': 2, 'class': 'part-new' }, svg); T(svg, 265, 196, 'UNO', { 'text-anchor': 'middle', 'font-size': 16, fill: '#cfe3f5' });
        S('rect', { x: 380, y: 76, width: 220, height: 228, rx: 4, fill: '#d3dbe4', 'class': 'part-new' }, svg); T(svg, 490, 290, 'BREADBOARD', { 'text-anchor': 'middle', 'font-size': 11, fill: '#3b4756', 'letter-spacing': '1.5' });
        S('rect', { x: 470, y: 100, width: 120, height: 150, rx: 4, fill: '#1d6b3a', stroke: '#2f8f50', 'stroke-width': 2, 'class': 'part-new' }, svg); S('rect', { x: 490, y: 112, width: 80, height: 126, fill: '#2563eb' }, svg);
        T(svg, 530, 180, 'LCD', { 'text-anchor': 'middle', 'font-size': 14, fill: '#f4f7fb', transform: 'rotate(90 530 180)' });
        S('circle', { cx: 410, cy: 200, r: 7, fill: '#1c1f24', stroke: CY, 'stroke-width': 2 }, svg); T(svg, 400, 226, 'tilt', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 });
        S('path', { d: 'M150 200 h-30', stroke: CY, 'stroke-width': 3 }, svg); T(svg, 112, 204, 'USB hole', { 'text-anchor': 'end', fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 2 · Cut the window.</b> Measure your LCD’s dark screen area (about <b>7 × 2.5 cm</b>). Mark it on the lid exactly above where the screen will sit, and cut it out with a craft knife. Cut a pencil-sized hole above the contrast knob too.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 150, y: 50, width: 500, height: 290, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); T(svg, 400, 326, 'THE LID', { 'text-anchor': 'middle', fill: '#3a2a16', 'letter-spacing': '2' });
        var win = S('rect', { x: 320, y: 150, width: 210, height: 75, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
        S('line', { x1: 320, y1: 125, x2: 530, y2: 125, stroke: CY }, svg); T(svg, 425, 116, '7 cm', { 'text-anchor': 'middle', fill: CY });
        S('line', { x1: 550, y1: 150, x2: 550, y2: 225, stroke: CY }, svg); T(svg, 560, 192, '2.5 cm', { fill: CY });
        st.later(function () { S('rect', { x: 320, y: 150, width: 210, height: 75, fill: '#1a1208', 'class': 'part-new' }, svg); S('circle', { cx: 250, cy: 260, r: 7, fill: '#1a1208', 'class': 'part-new' }, svg); T(svg, 250, 290, 'knob hole', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 }); }, 900);
      } },
      { cap: '<b>Step 3 · Raise the screen.</b> Glue a stack of cardboard squares (or a small box) to the floor as a platform. Stick the breadboard on it with its own sticky back or double-sided tape, so the LCD sits just under the lid. Seen from the side:', draw: function (svg, S2, st) {
        base(svg);
        S('path', { d: 'M150 70 V320 H650 V70', fill: 'none', stroke: CBD, 'stroke-width': 6 }, svg);
        S('rect', { x: 140, y: 56, width: 520, height: 14, fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg); S('rect', { x: 420, y: 56, width: 130, height: 14, fill: BG }, svg);
        T(svg, 600, 48, 'lid with window', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
        var pf = S('g', { 'class': 'part-new' }, svg);
        for (var i = 0; i < 5; i++) S('rect', { x: 380, y: 300 - i * 30, width: 220, height: 28, fill: i % 2 ? CB : CBL, stroke: CBD }, pf);
        S('rect', { x: 380, y: 140, width: 220, height: 26, fill: '#d3dbe4' }, svg); T(svg, 370, 160, 'breadboard', { 'text-anchor': 'end', fill: MUT, 'font-size': 11 });
        S('rect', { x: 410, y: 96, width: 150, height: 14, fill: '#1d6b3a' }, svg); S('rect', { x: 430, y: 86, width: 110, height: 10, fill: '#2563eb' }, svg);
        S('rect', { x: 420, y: 110, width: 8, height: 30, fill: '#c9b458' }, svg); T(svg, 600, 104, 'LCD', { fill: CY, 'font-size': 12 });
        S('rect', { x: 395, y: 118, width: 10, height: 22, rx: 3, fill: '#1c1f24', stroke: '#6b7280' }, svg); T(svg, 362, 118, 'tilt switch (upright)', { 'text-anchor': 'end', fill: CY, 'font-size': 12 }); S('path', { d: 'M366 122 h24', stroke: CY }, svg);
        S('rect', { x: 180, y: 290, width: 150, height: 30, rx: 3, fill: '#15497a' }, svg); T(svg, 255, 310, 'UNO', { 'text-anchor': 'middle', fill: '#cfe3f5', 'font-size': 12 });
        T(svg, 490, 250, 'PLATFORM', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 12, 'letter-spacing': '2' });
      } },
      { cap: '<b>Step 4 · Move it in.</b> Unplug the USB. Lift the UNO and breadboard in together — any wire that pops out is a bug you’ll hunt for later. Run the USB cable out through its hole, close the lid and check the screen lines up with the window.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 150, y: 120, width: 500, height: 220, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); S('rect', { x: 166, y: 136, width: 468, height: 190, rx: 4, fill: '#6b4a26' }, svg);
        var g = S('g', {}, svg);
        S('rect', { x: 210, y: 0, width: 130, height: 150, rx: 6, fill: '#15497a', stroke: '#2e6aa3' }, g); S('rect', { x: 380, y: -10, width: 200, height: 170, rx: 4, fill: '#d3dbe4' }, g); S('rect', { x: 460, y: 10, width: 110, height: 120, rx: 4, fill: '#1d6b3a' }, g); S('rect', { x: 478, y: 22, width: 74, height: 96, fill: '#2563eb' }, g);
        var y = -160; (function drop() { y = Math.min(150, y + 10); g.setAttribute('transform', 'translate(0 ' + y + ')'); if (y < 150) st.later(drop, 30); })();
        S('path', { d: 'M150 230 C 100 230, 80 260, 40 270', stroke: '#3b82f6', 'stroke-width': 6, fill: 'none' }, svg); T(svg, 60, 300, 'USB out', { fill: MUT, 'font-size': 12 });
      } },
      { cap: '<b>Step 5 · Decorate and test.</b> Close it up, plug in, and shake. The screen glows through the window. Then check every test in the next step — moving a circuit loosens wires.', draw: function (svg, S2, st) {
        base(svg); var bx = boxArt(svg, 400, 190, 1.05), ans = ['Yes!', 'Signs say yes', 'Try a pizza'], k = 0;
        (function cyc() { bx.set(['The box says:', ans[k++ % 3]]); st.later(cyc, 1600); })();
      } }
    ] });
  }

  /* ---------- 10 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Test the finished box like a user would. Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Readable:</b> the screen is crisp through the window (adjust contrast through the knob hole if not).',
      '<b>One shake, one answer:</b> a single shake gives exactly one new fortune.',
      '<b>Sitting still:</b> left alone on the desk for a minute, the box does nothing by itself.',
      '<b>Random:</b> ten shakes give a mix of answers, and a different order after pressing reset.',
      '<b>Modes:</b> a 2-second tip switches to temperature and back; pinching the thermistor raises the reading.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2><p>Try a challenge in the Virtual UNO first if you like, then upload it to your box.</p>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Thinking countdown', html: 'Replace the three dots with a dramatic countdown: “3… 2… 1…” in the middle of the screen, or a bar that fills across the bottom row before the answer appears.', hint: 'A for loop that counts down: <code>for (int i = 3; i &gt; 0; i--) { lcd.setCursor(7, 0); lcd.print(i); delay(500); }</code>. For a bar, print one block character per pass with <code>lcd.write(255);</code> (character 255 is a solid box).' },
      { tag: 'Code', title: 'Scrolling answers', html: 'Let answers be longer than 16 characters and scroll them across the bottom row like a news ticker.', hint: 'Print the long text, then call <code>lcd.scrollDisplayLeft();</code> with a short delay in a for loop, once for each extra character. (It scrolls both rows.) Or print a different 16-character slice each time: <code>answer.substring(i, i + 16)</code>.' },
      { tag: 'Code', title: 'Custom characters', html: 'Design your own 5 × 8 pixel symbols — an eye, a star, a skull — and show them beside the answer.', hint: 'Make a pattern with one number per row: <code>byte eye[8] = { B00000, B01110, B10001, B10101, B10001, B01110, B00000, B00000 };</code>. In setup(): <code>lcd.createChar(0, eye);</code> (up to 8, numbered 0–7). Show it with <code>lcd.write(byte(0));</code>. The Virtual UNO doesn’t draw custom characters, so test this one on your real LCD.' },
      { tag: 'Code + modes', cls: 'c', title: 'Dice mode', html: 'Add a third mode: a dice roller for board games. A shake rolls two dice and shows both numbers and their total.', hint: 'Add <code>const int DICE = 2;</code>. In switchMode(), go FORTUNE → THERMO → DICE → FORTUNE. Use <code>random(1, 7)</code> for each die (1 to 6), and add a <code>case DICE:</code> where the shake is handled.' },
      { tag: 'Build', title: 'Mood lighting', html: 'Use a spare pin to light an LED inside the box (with its 220 Ω resistor) that glows while the box is thinking. Which pins are still free?', hint: 'Pins 3, 4, 5 and 6 aren’t used. Pin 3, 5 or 6 can even fade the LED with analogWrite().' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 11 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m06 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working fortune teller. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of your finished box and one of the circuit inside (lid open). Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: ask a question, shake for an answer, then hold it tipped to show thermometer mode.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'fortune_teller' }
      ],
      questions: [
        { id: 'r1', q: 'Explain how the tilt switch tells your UNO the box was shaken. Use the words ball, contacts, INPUT_PULLUP, HIGH and LOW.' },
        { id: 'r2', q: 'One shake makes the switch flicker many times. Explain how your code makes sure you get only one answer per shake.' },
        { id: 'r3', q: 'How does your code pick an answer? Explain random(), your array (or switch / case), and why randomSeed(analogRead(A1)) is needed.' },
        { id: 'r4', q: 'How does the text get onto the LCD? Explain what lcd.setCursor() and lcd.print() do, and why the contrast knob matters.' }
      ]
    }
  };
})(window);
