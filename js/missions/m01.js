/* Mission 01: Crosswalk signal — the guide.
 * Each step: { id, title, stage (design-process label), time, render(body, ctx) }. The last step ({ submit: true })
 * is the evidence form, built by app.js from `evidence`. Circuit parts for the build guides and the Virtual UNO are
 * shared below so the drawings always match. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80';

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var FIRST = {
    fr: { type: 'res', from: 'e5', to: 'f5', ohms: 220, name: '220 Ω resistor' },
    fl: { type: 'led', a: 'j5', k: 'R-5', color: 'red', name: 'Red LED' },
    fj: { type: 'wire', from: 'L+5', to: 'a5', color: 'red', name: 'Red jumper: + rail → a5' },
    fb: { type: 'button', at: 'e7', name: 'Push button' },
    fj2: { type: 'wire', from: 'L+9', to: 'a9', color: 'red', name: 'Red jumper: + rail → a9' },
    fj3: { type: 'wire', from: 'c7', to: 'c5', color: 'yellow', name: 'Yellow jumper: c7 → c5' }
  };
  var TL = {
    r_red: { type: 'res', from: 'e5', to: 'f5', ohms: 220, name: '220 Ω resistor' },
    l_red: { type: 'led', a: 'j5', k: 'R-5', color: 'red', label: 'RED', name: 'Red LED' },
    w_red: { type: 'wire', from: 'D12', to: 'a5', color: 'orange', name: 'Wire: pin 12 → a5' },
    r_yel: { type: 'res', from: 'e9', to: 'f9', ohms: 220, name: '220 Ω resistor' },
    l_yel: { type: 'led', a: 'j9', k: 'R-9', color: 'yellow', label: 'YELLOW', name: 'Yellow LED' },
    w_yel: { type: 'wire', from: 'D11', to: 'a9', color: 'yellow', name: 'Wire: pin 11 → a9' },
    r_grn: { type: 'res', from: 'e13', to: 'f13', ohms: 220, name: '220 Ω resistor' },
    l_grn: { type: 'led', a: 'j13', k: 'R-13', color: 'green', label: 'GREEN', name: 'Green LED' },
    w_grn: { type: 'wire', from: 'D10', to: 'a13', color: 'green', name: 'Wire: pin 10 → a13' },
    r_walk: { type: 'res', from: 'e19', to: 'f19', ohms: 220, name: '220 Ω resistor' },
    l_walk: { type: 'led', a: 'j19', k: 'R-19', color: 'white', label: 'WALK', name: 'White LED' },
    w_walk: { type: 'wire', from: 'D8', to: 'a19', color: 'white', name: 'Wire: pin 8 → a19' },
    btn: { type: 'button', at: 'e23', name: 'Push button', label: '' },
    w_b5v: { type: 'wire', from: 'L+23', to: 'a23', color: 'red', name: 'Red jumper: + rail → a23' },
    w_b2: { type: 'wire', from: 'D2', to: 'a25', color: 'blue', name: 'Wire: pin 2 → a25' },
    r_pd: { type: 'res', from: 'j25', to: 'R-25', ohms: 10000, name: '10 kΩ resistor (pull-down)' }
  };
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  var ALL_TL = merge(POWER, TL);
  var TL_IDS = Object.keys(ALL_TL);
  var SIM_VIEW = [236, 30, 480, 450];
  var SIM_LEDS = { 12: 'l_red', 11: 'l_yel', 10: 'l_grn', 8: 'l_walk' };

  /* ================= code ================= */
  var BLINK = [
    '// Blink: turns the UNO\'s built-in LED (marked L) on and off',
    '',
    'void setup() {',
    '  pinMode(13, OUTPUT);     // pin 13 is wired to the L LED',
    '}',
    '',
    'void loop() {',
    '  digitalWrite(13, HIGH);  // LED on (pin 13 = 5 volts)',
    '  delay(1000);             // wait 1000 milliseconds = 1 second',
    '  digitalWrite(13, LOW);   // LED off (pin 13 = 0 volts)',
    '  delay(1000);             // wait another second',
    '}'].join('\n');
  var CYCLE = [
    '// Mission 01, part 1: cycle the car lights',
    '// Finish loop() so the lights go green, yellow, red, over and over.',
    '',
    'const int RED_LIGHT = 12;',
    'const int YELLOW_LIGHT = 11;',
    'const int GREEN_LIGHT = 10;',
    '',
    'void setup() {',
    '  pinMode(RED_LIGHT, OUTPUT);',
    '  pinMode(YELLOW_LIGHT, OUTPUT);',
    '  pinMode(GREEN_LIGHT, OUTPUT);',
    '}',
    '',
    'void loop() {',
    '  digitalWrite(GREEN_LIGHT, HIGH);   // green on',
    '  delay(4000);                       // for 4 seconds',
    '  digitalWrite(GREEN_LIGHT, LOW);    // green off',
    '',
    '  // YOUR TURN: yellow on for 1.5 seconds, then off',
    '',
    '  // YOUR TURN: red on for 4 seconds, then off',
    '',
    '}'].join('\n');
  var CROSS = [
    '/*',
    '  Mission 01: Crosswalk signal',
    '  Cars get a green light until someone presses the button.',
    '  Then: yellow, red + WALK, a flashing WALK warning, and back to green.',
    '*/',
    '',
    '// Which pin each part is connected to',
    'const int RED_LIGHT = 12;',
    'const int YELLOW_LIGHT = 11;',
    'const int GREEN_LIGHT = 10;',
    'const int WALK_LIGHT = 8;',
    'const int BUTTON = 2;',
    '',
    'int buttonState = 0;   // will hold HIGH (pressed) or LOW (not pressed)',
    '',
    'void setup() {',
    '  pinMode(RED_LIGHT, OUTPUT);',
    '  pinMode(YELLOW_LIGHT, OUTPUT);',
    '  pinMode(GREEN_LIGHT, OUTPUT);',
    '  pinMode(WALK_LIGHT, OUTPUT);',
    '  pinMode(BUTTON, INPUT);',
    '}',
    '',
    'void loop() {',
    '  // cars go: green on, everything else off',
    '  digitalWrite(GREEN_LIGHT, HIGH);',
    '  digitalWrite(YELLOW_LIGHT, LOW);',
    '  digitalWrite(RED_LIGHT, LOW);',
    '  digitalWrite(WALK_LIGHT, LOW);',
    '',
    '  buttonState = digitalRead(BUTTON);',
    '',
    '  if (buttonState == HIGH) {',
    '    // someone wants to cross',
    '    delay(1000);                       // a short wait, like a real crosswalk',
    '    digitalWrite(GREEN_LIGHT, LOW);',
    '    digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down',
    '    delay(2000);',
    '    digitalWrite(YELLOW_LIGHT, LOW);',
    '    digitalWrite(RED_LIGHT, HIGH);     // cars: stop',
    '    digitalWrite(WALK_LIGHT, HIGH);    // people: walk',
    '    delay(5000);',
    '',
    '    // flash the WALK light: time is running out',
    '    for (int i = 0; i < 6; i++) {',
    '      digitalWrite(WALK_LIGHT, LOW);',
    '      delay(300);',
    '      digitalWrite(WALK_LIGHT, HIGH);',
    '      delay(300);',
    '    }',
    '    digitalWrite(WALK_LIGHT, LOW);',
    '    delay(1000);                       // everyone clear before cars go',
    '  }',
    '}'].join('\n');

  /* ================= art helpers ================= */
  /* a little traffic light + pedestrian signal (used in the brief) */
  function trafficArt(svg, x, y) {
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ')' }, svg);
    S('rect', { x: 46, y: 150, width: 8, height: 170, fill: '#3a4a5e' }, g);
    S('rect', { x: 10, y: 0, width: 80, height: 190, rx: 10, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, g);
    var lamps = {};
    [['red', '#ff4d4d', 34], ['yellow', '#ffd23f', 94], ['green', '#3ee07a', 154]].forEach(function (l) {
      S('circle', { cx: 50, cy: l[2] + 2, r: 30, fill: 'url(#bg-' + l[0] + ')', opacity: 0, 'class': 'gl-' + l[0] }, g);
      lamps[l[0]] = S('circle', { cx: 50, cy: l[2] + 2, r: 21, fill: '#1d2735', stroke: '#2b3a4f', 'stroke-width': 2 }, g); lamps[l[0]].dataset.c = l[1];
    });
    S('rect', { x: 0, y: 318, width: 100, height: 10, rx: 3, fill: '#2b3a4f' }, g);
    // pedestrian signal
    var p = S('g', { transform: 'translate(150 60)' }, g);
    S('rect', { x: 0, y: 0, width: 90, height: 90, rx: 8, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, p);
    var walker = S('g', { opacity: 0.15 }, p);
    S('circle', { cx: 45, cy: 22, r: 7, fill: '#f4f7fb' }, walker);
    S('path', { d: 'M45 30 L42 52 M44 36 L30 46 M44 36 L58 44 M42 52 L32 72 M42 52 L54 70', stroke: '#f4f7fb', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, walker);
    T(p, 45, 108, 'WALK', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
    S('rect', { x: 28, y: 100 + 30, width: 34, height: 56, rx: 4, fill: '#1d2735', stroke: GRID }, p);
    var btn = S('circle', { cx: 45, cy: 158, r: 9, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, p);
    T(p, 45, 204, 'PUSH', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '2' });
    return {
      set: function (c, on) { var l = lamps[c]; l.setAttribute('fill', on ? l.dataset.c : '#1d2735'); g.querySelector('.gl-' + c).setAttribute('opacity', on ? 0.9 : 0); },
      walk: function (on) { walker.setAttribute('opacity', on ? 1 : 0.15); },
      press: function (on) { btn.setAttribute('fill', on ? CY : '#2b3038'); btn.setAttribute('r', on ? 8 : 9); }
    };
  }
  function glowDefs(svg) {
    var d = svg.querySelector('defs') || S('defs', {}, svg);
    [['red', '#ff4d4d'], ['yellow', '#ffd23f'], ['green', '#3ee07a'], ['white', '#f4f7fb'], ['cyan', CY]].forEach(function (c) {
      if (d.querySelector('#bg-' + c[0])) return;
      var gr = S('radialGradient', { id: 'bg-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  /* dots that move along a path: returns { setSpeed(px per s), stop() } */
  function flow(svg, pathEl, n, color, r) {
    var L = pathEl.getTotalLength(), dots = [], speed = 60, off = 0, last = performance.now(), raf = null, g = S('g', {}, svg);
    for (var i = 0; i < n; i++) dots.push(S('circle', { r: r || 4, fill: color || CY }, g));
    function tick(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; off = (off + speed * dt) % L; dots.forEach(function (d, i) { var p = pathEl.getPointAtLength((off + i * L / n) % L); d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); }); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return { setSpeed: function (v) { speed = v; }, stop: function () { cancelAnimationFrame(raf); }, g: g };
  }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m01;
    var wrap = el('div', 'brief');
    var left = el('div', '');
    left.innerHTML = '<p class="lead">Every day, crosswalk signals decide who gets to go. In this mission you’ll build one: a traffic light that stays green for cars until someone presses the button — then it switches to yellow, red, and a WALK light, warns people with a flashing signal, and goes back to green.</p>' +
      '<p>Along the way you’ll learn what electricity actually is, how to build circuits on a breadboard, and how to write your first Arduino programs. By the end you’ll have a working signal inside a cardboard housing that <i>you</i> design.</p>';
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
      cap: 'Watch one full cycle. The button is the “push to cross” request; the white light is the WALK signal.',
      draw: function (svg, _, st) {
        clear(svg); glowDefs(svg);
        S('rect', { x: 0, y: 0, width: 800, height: 360, fill: '#070d17' }, svg);
        for (var x = 0; x <= 800; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: 360, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
        for (var y = 0; y <= 360; y += 64) S('line', { x1: 0, y1: y, x2: 800, y2: y, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
        var a = trafficArt(svg, 250, 18), lab = T(svg, 560, 120, '', { 'font-size': 13, 'letter-spacing': '2', fill: CY });
        var lab2 = T(svg, 560, 146, '', { 'font-size': 12, fill: MUT });
        var seq = [
          [function () { a.set('green', 1); a.set('yellow', 0); a.set('red', 0); a.walk(0); }, 'CARS: GO', 'waiting for a button press', 2600],
          [function () { a.press(1); }, 'BUTTON PRESSED', 'someone wants to cross', 500],
          [function () { a.press(0); }, 'BUTTON PRESSED', 'wait 1 second…', 900],
          [function () { a.set('green', 0); a.set('yellow', 1); }, 'CARS: SLOW DOWN', 'yellow for 2 seconds', 1800],
          [function () { a.set('yellow', 0); a.set('red', 1); a.walk(1); }, 'CARS: STOP', 'people: WALK (5 seconds)', 3000]
        ];
        for (var k = 0; k < 6; k++) { seq.push([function () { a.walk(0); }, 'HURRY UP', 'WALK flashes 6 times', 300]); seq.push([function () { a.walk(1); }, 'HURRY UP', 'WALK flashes 6 times', 300]); }
        seq.push([function () { a.walk(0); }, 'ALL CLEAR', 'red for 1 more second', 1000]);
        var i = 0;
        (function stepA() { var s2 = seq[i % seq.length]; s2[0](); lab.textContent = s2[1]; lab2.textContent = s2[2]; i++; st.later(stepA, s2[3]); })();
      } }] });
    UI.callout(b, 'safety', 'Safety', '<p>Your UNO runs on 5 volts from the USB cable — safe to touch. Two rules protect your board: <b>unplug the USB cable while you change wiring</b>, and <b>never connect 5V straight to GND</b> with nothing in between (that’s a short circuit — it makes the board hot and can damage it).</p>');
  } });

  /* ---------- 02 gear ---------- */
  steps.push({ id: 'gear', title: 'Meet your gear', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your UNO is a tiny computer called a <b>microcontroller</b>. It can’t run apps, but it can do one job forever: read what’s connected to its pins, make decisions with your code, and switch things on and off — thousands of times a second.</p>');
    var R = B.render({ bb: false, parts: {}, view: [0, 34, 350, 452], hover: false, label: 'The UNO R3 board' });
    UI.hotspots(b, { title: 'Explore the UNO R3', label: 'Board tour', svg: R.svg, ctx: ctx, key: 'tour', intro: 'Tap each glowing dot to find out what that part of the board does. Find all of them.', spots: [
      { id: 'usb', x: 223, y: 80, title: 'USB port', html: '<p>Two jobs: it powers the board with 5 volts, and it’s how your laptop uploads code to the UNO (and how the UNO sends messages back).</p>' },
      { id: 'jack', x: 77, y: 92, title: 'Power jack', html: '<p>For running the UNO without a computer, from a 9V battery or wall adapter (7–12 V). You won’t need it in this mission.</p>' },
      { id: 'reset', x: 148, y: 94, title: 'Reset button', html: '<p>Restarts your program from the very beginning — like turning it off and on again. Your code stays saved.</p>' },
      { id: 'digital', x: 324, y: 236, title: 'Digital pins 0–13', html: '<p>Each pin can be an <b>output</b> (your code switches it to 5 V = <code>HIGH</code> or 0 V = <code>LOW</code>) or an <b>input</b> (your code checks whether it’s getting voltage). Pins 0 and 1 are used for talking to the computer, so start with pin 2.</p>' },
      { id: 'pwm', x: 296, y: 220, title: 'The ~ pins', html: '<p>Pins marked with a <code>~</code> (3, 5, 6, 9, 10, 11) can fake an in-between voltage by switching on and off very fast. That’s how you’ll fade LEDs in Mission 02.</p>' },
      { id: 'L', x: 268, y: 176, title: 'The L LED', html: '<p>A tiny LED wired to pin 13 inside the board. Your first program will blink it — no wiring needed.</p>' },
      { id: 'power', x: 36, y: 296, title: '5V and GND', html: '<p><b>5V</b> supplies a steady 5 volts. <b>GND</b> (ground) is 0 volts — the return path every circuit needs. There’s another GND pin up beside pin 13.</p>' },
      { id: 'analog', x: 36, y: 404, title: 'Analog inputs A0–A5', html: '<p>These measure <i>how much</i> voltage there is (0 to 1023), not just on/off. Perfect for knobs and light sensors in Mission 02.</p>' },
      { id: 'chip', x: 136, y: 384, title: 'ATmega328P chip', html: '<p>The brain: a processor running at 16 million steps per second, with 32 KB of memory for your program. Your code lives here, even when the USB is unplugged.</p>' },
      { id: 'on', x: 256, y: 404, title: 'ON light', html: '<p>Glows green whenever the board has power. If it’s off, check the USB cable first.</p>' }
    ] });
    UI.html(b, '<h2>Check your kit</h2><p>Find each of these in your ELEGOO box and tap it once you have it on your desk.</p>');
    UI.gear(b, ctx, 'kit', [
      { id: 'uno', name: 'UNO R3 board', note: 'The blue board', icon: function (svg, S) { S('rect', { x: 20, y: 10, width: 80, height: 50, rx: 4, fill: '#15497a' }, svg); S('rect', { x: 22, y: 20, width: 18, height: 16, fill: '#aab6c3' }, svg); S('rect', { x: 50, y: 34, width: 40, height: 9, fill: '#1a1f27' }, svg); S('rect', { x: 46, y: 12, width: 50, height: 5, fill: '#0c0f14' }, svg); } },
      { id: 'usb', name: 'USB cable', note: 'Square end goes in the UNO', icon: function (svg, S) { S('path', { d: 'M15 50 C 45 50, 55 20, 90 20', stroke: '#3b82f6', 'stroke-width': 5, fill: 'none' }, svg); S('rect', { x: 88, y: 12, width: 18, height: 16, rx: 2, fill: '#aab6c3' }, svg); S('rect', { x: 6, y: 44, width: 14, height: 12, rx: 1, fill: '#aab6c3' }, svg); } },
      { id: 'bb', name: 'Breadboard', note: 'The white board with holes', icon: function (svg, S) { S('rect', { x: 10, y: 14, width: 100, height: 44, rx: 3, fill: '#d3dbe4' }, svg); for (var i = 0; i < 12; i++) for (var j = 0; j < 4; j++) S('rect', { x: 16 + i * 8, y: 22 + j * 8 + (j > 1 ? 6 : 0), width: 3, height: 3, fill: '#3b4756' }, svg); } },
      { id: 'leds', name: 'LEDs', note: 'Red, yellow, green, white', icon: function (svg, S) { ['#ff4d4d', '#ffd23f', '#3ee07a', '#f4f7fb'].forEach(function (c, i) { S('path', { d: 'M' + (22 + i * 24) + ' 40 v-16 a8 8 0 0 1 16 0 v16 z', fill: c, opacity: 0.9 }, svg); S('line', { x1: 26 + i * 24, y1: 40, x2: 26 + i * 24, y2: 62, stroke: '#9aa5b1', 'stroke-width': 2 }, svg); S('line', { x1: 34 + i * 24, y1: 40, x2: 34 + i * 24, y2: 56, stroke: '#9aa5b1', 'stroke-width': 2 }, svg); }); } },
      { id: 'res', name: 'Resistors', note: '4 × 220 Ω, 1 × 10 kΩ', icon: function (svg, S) { [[20, 220], [42, 10000]].forEach(function (r) { S('line', { x1: 10, y1: r[0], x2: 110, y2: r[0], stroke: '#b8c2cc', 'stroke-width': 2 }, svg); S('rect', { x: 40, y: r[0] - 6, width: 40, height: 12, rx: 6, fill: '#e3c99a' }, svg); RL.resistorBands(r[1]).forEach(function (c, i) { S('rect', { x: 46 + i * 7 + (i === 3 ? 6 : 0), y: r[0] - 6, width: 3.5, height: 12, fill: c }, svg); }); }); } },
      { id: 'btn', name: 'Push button', note: 'Square with 4 legs', icon: function (svg, S) { S('rect', { x: 40, y: 14, width: 40, height: 40, rx: 3, fill: '#1c2129' }, svg); S('circle', { cx: 60, cy: 34, r: 11, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg); [[44, 10], [72, 10], [44, 54], [72, 54]].forEach(function (p) { S('rect', { x: p[0], y: p[1], width: 4, height: 8, fill: '#9aa5b1' }, svg); }); } },
      { id: 'mm', name: 'Jumper wires', note: 'Pins on both ends', icon: function (svg, S) { ['#e5484d', '#30363f', '#facc15', '#22c55e'].forEach(function (c, i) { S('path', { d: 'M' + (14 + i * 6) + ' 58 C 30 ' + (10 + i * 6) + ', 80 ' + (10 + i * 6) + ', ' + (96 + i * 4) + ' 58', stroke: c, 'stroke-width': 3.5, fill: 'none' }, svg); }); } },
      { id: 'fm', name: 'Female-to-male wires', note: 'A socket on one end (for the housing)', icon: function (svg, S) { S('path', { d: 'M14 40 C 40 10, 80 70, 100 40', stroke: '#fb923c', 'stroke-width': 3.5, fill: 'none' }, svg); S('rect', { x: 4, y: 34, width: 14, height: 12, fill: '#111' }, svg); S('line', { x1: 100, y1: 40, x2: 112, y2: 40, stroke: '#c0c8d0', 'stroke-width': 2 }, svg); } }
    ]);
  } });

  /* ---------- 03 electricity ---------- */
  steps.push({ id: 'electricity', title: 'Electricity 101', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before you wire anything, you need a picture of what electricity is doing. Three words explain almost everything in this unit: <b>voltage</b>, <b>current</b> and <b>resistance</b>.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Voltage, current and resistance', w: 820, h: 360,
      init: function (svg, S, st) {
        glowDefs(svg);
        // circuit (left)
        var cg = S('g', {}, svg); st.cg = cg;
        S('rect', { x: 0, y: 0, width: 820, height: 360, fill: '#070d17' }, cg);
        T(cg, 40, 34, 'THE CIRCUIT', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        T(cg, 450, 34, 'THE WATER MODEL', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        S('line', { x1: 420, y1: 30, x2: 420, y2: 340, stroke: GRID }, cg);
        var loop = S('path', { d: 'M80 300 L80 80 L340 80 L340 300 Z', fill: 'none', stroke: '#9fb3c8', 'stroke-width': 3 }, cg);
        st.loop = loop;
        st.short = S('path', { d: 'M80 300 C 140 250, 280 250, 340 300', fill: 'none', stroke: SIG, 'stroke-width': 4, opacity: 0 }, cg);
        // battery
        S('rect', { x: 56, y: 150, width: 48, height: 80, rx: 4, fill: '#121c2b', stroke: '#9fb3c8', 'stroke-width': 2 }, cg);
        st.vlab = T(cg, 80, 196, '5V', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: INK });
        T(cg, 80, 146, '+', { 'text-anchor': 'middle', 'font-size': 16, fill: '#e5484d' }); T(cg, 80, 248, '−', { 'text-anchor': 'middle', 'font-size': 16, fill: '#6c8ee0' });
        // switch on the top wire
        S('rect', { x: 150, y: 70, width: 70, height: 20, fill: '#070d17' }, cg);
        S('circle', { cx: 155, cy: 80, r: 4, fill: '#9fb3c8' }, cg); S('circle', { cx: 215, cy: 80, r: 4, fill: '#9fb3c8' }, cg);
        st.lever = S('line', { x1: 155, y1: 80, x2: 215, y2: 80, stroke: '#9fb3c8', 'stroke-width': 3, 'stroke-linecap': 'round' }, cg);
        T(cg, 185, 62, 'SWITCH', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // resistor on the right wire
        S('rect', { x: 330, y: 120, width: 20, height: 70, fill: '#070d17' }, cg);
        st.res = S('rect', { x: 326, y: 124, width: 28, height: 62, rx: 12, fill: '#e3c99a', stroke: '#b59a6a' }, cg);
        RL.resistorBands(220).forEach(function (c, i) { S('rect', { x: 326, y: 134 + i * 10 + (i === 3 ? 8 : 0), width: 28, height: 5, fill: c }, cg); });
        T(cg, 366, 160, 'RESISTOR', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // LED on the bottom wire
        S('rect', { x: 190, y: 286, width: 50, height: 28, fill: '#070d17' }, cg);
        st.ledGlow = S('circle', { cx: 215, cy: 300, r: 42, fill: 'url(#bg-red)', opacity: 0 }, cg);
        st.led = S('circle', { cx: 215, cy: 300, r: 15, fill: '#7a1d1d', stroke: '#ff4d4d', 'stroke-width': 2 }, cg);
        T(cg, 215, 334, 'LED', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // water model (right)
        st.tank = S('rect', { x: 470, y: 90, width: 70, height: 170, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, cg);
        st.water = S('rect', { x: 472, y: 120, width: 66, height: 138, fill: '#1e6fa8', opacity: 0.8 }, cg);
        st.vtext = T(cg, 505, 82, 'HIGH = BIG PUSH', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
        var pipe = S('path', { d: 'M540 240 L760 240 L760 300 L505 300 L505 260', fill: 'none', stroke: '#2a4058', 'stroke-width': 18, 'stroke-linejoin': 'round' }, cg);
        st.pipePath = S('path', { d: 'M540 240 L760 240 L760 300 L505 300 L505 260', fill: 'none', stroke: 'none' }, cg);
        st.narrow = S('rect', { x: 620, y: 232, width: 60, height: 16, fill: '#070d17', opacity: 0 }, cg);
        st.narrowIn = S('rect', { x: 620, y: 236, width: 60, height: 8, fill: '#2a4058', opacity: 0 }, cg);
        st.valve = S('rect', { x: 566, y: 226, width: 8, height: 28, fill: '#9fb3c8' }, cg);
        st.wheel = S('g', { transform: 'translate(700 300)' }, cg);
        S('circle', { r: 20, fill: '#121c2b', stroke: '#9fb3c8', 'stroke-width': 2 }, st.wheel);
        for (var k = 0; k < 6; k++) S('line', { x1: 0, y1: 0, x2: 18 * Math.cos(k * Math.PI / 3), y2: 18 * Math.sin(k * Math.PI / 3), stroke: '#9fb3c8', 'stroke-width': 2 }, st.wheel);
        T(cg, 700, 340, 'WATER WHEEL = LED', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
        st.meter = T(cg, 210, 220, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY });
        st.warn = T(cg, 210, 200, '', { 'text-anchor': 'middle', 'font-size': 14, fill: SIG, 'font-weight': 600 });
        st.f1 = flow(svg, loop, 14, CY, 4.5); st.f2 = flow(svg, st.pipePath, 12, '#7dd3fc', 4);
        var ang = 0, wspd = 0, last = performance.now();
        (function spin(t) { var dt = (t - last) / 1000; last = t; ang += wspd * dt; st.wheel.setAttribute('transform', 'translate(700 300) rotate(' + ang + ')'); st.raf = requestAnimationFrame(spin); })(last);
        st.setWheel = function (v) { wspd = v; };
        st.stop = function () { st.f1.stop(); st.f2.stop(); cancelAnimationFrame(st.raf); };
        st.set = function (o) {
          var on = o.closed !== false;
          st.lever.setAttribute('x2', on ? 215 : 205); st.lever.setAttribute('y2', on ? 80 : 50);
          st.valve.setAttribute('height', on ? 28 : 8); st.valve.setAttribute('y', on ? 226 : 210);
          var sp = on ? (o.speed || 60) : 0; st.f1.setSpeed(sp); st.f2.setSpeed(sp); st.setWheel(on ? sp * 3 : 0);
          var lit = on && !o.short ? Math.min(1, (o.bright || 0.8)) : 0;
          st.led.setAttribute('fill', lit ? '#ff4d4d' : '#7a1d1d'); st.ledGlow.setAttribute('opacity', lit);
          st.water.setAttribute('y', 258 - (o.level || 138)); st.water.setAttribute('height', o.level || 138);
          st.narrow.setAttribute('opacity', o.narrow ? 1 : 0); st.narrowIn.setAttribute('opacity', o.narrow ? 1 : 0);
          st.res.setAttribute('stroke', o.hlRes ? CY : '#b59a6a'); st.res.setAttribute('stroke-width', o.hlRes ? 3 : 1);
          st.vlab.setAttribute('fill', o.hlV ? CY : INK);
          st.short.setAttribute('opacity', o.short ? 1 : 0);
          st.meter.textContent = o.meter || ''; st.warn.textContent = o.warnText || '';
          st.tank.setAttribute('stroke', o.hlV ? CY : '#9fb3c8');
        };
      },
      frames: [
        { cap: '<b>A circuit is a loop.</b> Electric charge flows out of the + side of the power supply, through every part, and back into the − side. The LED lights up because charge is flowing through it. Water in a loop of pipe works the same way.', draw: function (svg, S, st) { st.set({ speed: 70 }); } },
        { cap: '<b>Break the loop and everything stops.</b> Opening the switch makes a gap. No complete loop means no flow, so the LED goes dark — even though the battery still has its 5 volts. A button is just a switch you hold closed.', draw: function (svg, S, st) { st.set({ closed: false }); } },
        { cap: '<b>Voltage (V) is the push.</b> It’s measured in volts. Your UNO’s 5V pin pushes with 5 volts. In the water model, voltage is how high the water tank is: a taller tank pushes water harder through the pipes.', draw: function (svg, S, st) { st.set({ speed: 70, hlV: true }); } },
        { cap: '<b>Current (I) is the flow</b> — how much charge passes a point every second. It’s measured in amps (A). An LED needs only about <b>0.02 A</b>, which we write as <b>20 milliamps (mA)</b>.', draw: function (svg, S, st) { st.set({ speed: 70, meter: 'current: 13.6 mA' }); } },
        { cap: '<b>Resistance (R) slows the flow.</b> It’s measured in ohms (Ω). A resistor is like a narrow section of pipe: the more resistance, the less current — and the dimmer the LED.', draw: function (svg, S, st) { st.set({ speed: 28, narrow: true, hlRes: true, bright: 0.35, meter: 'current: 3 mA' }); } },
        { cap: '<b>Short circuit: the one to avoid.</b> If a wire connects + straight to − with nothing in the way, there’s almost no resistance, so a huge current rushes through the wire instead of the LED. Wires get hot and boards get damaged. Always have a part (like an LED + resistor) in the loop.', draw: function (svg, S, st) { st.set({ speed: 240, short: true, warnText: 'SHORT CIRCUIT' }); } }
      ] });
    UI.html(b, '<div class="callout"><span class="label">The key idea</span><p>These three are linked by <b>Ohm’s law</b>: <code>V = I × R</code>. You’ll use it in Step 05 to pick the right resistor for every LED.</p></div>');
    UI.mcq(b, ctx, { id: 'q-elec1', q: 'You press a button and the LED lights up. What did pressing the button do?', options: ['It made the battery’s voltage higher', 'It completed the loop so current could flow', 'It added more resistance', 'It created a short circuit'], answer: 1, explain: 'A button is a switch: pressing it closes the gap, the loop is complete, and current flows through the LED.', hints: { 0: 'The battery’s push stays the same. What changed about the path?', 2: 'More resistance would make the LED dimmer, not turn it on.', 3: 'A short circuit skips the LED entirely — it wouldn’t light.' } });
    UI.mcq(b, ctx, { id: 'q-elec2', q: 'Which change would make an LED <i>dimmer</i>?', options: ['A smaller resistor', 'A bigger resistor', 'A shorter wire', 'Pressing the button harder'], answer: 1, explain: 'More resistance means less current, and less current means less light.' });
  } });

  /* ---------- 04 breadboard ---------- */
  steps.push({ id: 'breadboard', title: 'How a breadboard works', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A breadboard lets you build circuits without soldering: push a part’s legs into the holes and hidden metal strips connect them.</p><p>The trick is knowing <b>which holes are connected</b>. Hover over (or tap) any hole below to light up everything it’s connected to. Then switch on X-ray to see the metal strips inside.</p>');
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Interactive</span><h3>Inside the breadboard</h3></div>';
    var stage = el('div', 'xp-stage'); stage.style.position = 'relative'; box.appendChild(stage);
    var BB = B.BB, R = B.render({ uno: false, parts: {}, view: [BB[0] - 10, BB[1] - 6, BB[2] + 20, 340], label: 'A breadboard' });
    R.svg.style.maxWidth = '520px'; R.svg.style.margin = '0 auto';
    stage.appendChild(R.svg);
    var row = el('div', 'slider-row');
    var xr = el('button', 'btn btn-small', 'X-ray: off'); xr.type = 'button'; var on = false;
    xr.addEventListener('click', function () { on = !on; R.xray(on); xr.textContent = 'X-ray: ' + (on ? 'on' : 'off'); xr.classList.toggle('btn-primary', on); ctx.check('xray', 1); });
    var more = el('button', 'btn btn-ghost btn-small', 'Show all 30 rows'); more.type = 'button'; var all = false;
    more.addEventListener('click', function () { all = !all; R.setView(all ? [BB[0] - 10, BB[1] - 6, BB[2] + 20, BB[3] + 12] : [BB[0] - 10, BB[1] - 6, BB[2] + 20, 340], true); more.textContent = all ? 'Show fewer rows' : 'Show all 30 rows'; });
    row.appendChild(xr); row.appendChild(more); row.appendChild(el('span', 'small muted', 'Your kit’s breadboard is longer (63 rows), but it works exactly the same.'));
    box.appendChild(row);
    b.appendChild(box);
    UI.html(b, '<div class="two"><div class="callout plain"><span class="label">Terminal strips</span><p>In the middle, each numbered <b>row of 5 holes</b> (a–e, or f–j) is one connection. The gap down the centre splits every row in two.</p></div><div class="callout plain"><span class="label">Power rails</span><p>The long columns marked <b style="color:#e5484d">+</b> and <b style="color:#6c8ee0">−</b> run the whole length of the board. You’ll connect them to 5V and GND so power is never far away.</p></div></div>');
    UI.mcq(b, ctx, { id: 'q-bb1', q: 'Which hole is connected to <code>b7</code>?', options: ['<code>b8</code>', '<code>e7</code>', '<code>f7</code>', 'The + rail'], answer: 1, explain: 'a7, b7, c7, d7 and e7 are all one strip. f7 is across the gap, so it isn’t connected.', hints: { 0: 'b8 is in a different row. Rows go across, not down.', 2: 'f7 is on the other side of the centre gap.', 3: 'The rails are only connected to other rail holes.' } });
    UI.mcq(b, ctx, { id: 'q-bb2', q: 'You push an LED’s two legs into <code>c10</code> and <code>d10</code>. What happens?', options: ['It lights up', 'Nothing — both legs are on the same strip, so they’re connected to each other', 'It burns out', 'It works only if you add a wire'], answer: 1, explain: 'Both legs end up connected together (a tiny short across the LED), so current never goes <i>through</i> it. Each leg needs its own row.' });
  } });

  /* ---------- 05 LEDs, resistors and Ohm's law ---------- */
  steps.push({ id: 'ohm', title: 'LEDs, resistors & Ohm’s law', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">An LED (light-emitting diode) turns current into light — but only in one direction, and only if the current is kept small. That’s the resistor’s job.</p>');
    // LED anatomy
    UI.explainer(b, { label: 'Explainer', title: 'Reading an LED', w: 800, h: 300, frames: [
      { cap: '<b>The long leg is +.</b> It’s called the <b>anode</b>, and it connects toward 5V. The short leg is the <b>cathode</b> (−) and connects toward GND. There’s also a flat edge on the rim beside the cathode.', draw: function (svg, S) { clear(svg); glowDefs(svg); drawLED(svg, S, false); } },
      { cap: '<b>Current only flows one way:</b> in the anode, out the cathode. Put an LED in backwards and it simply won’t light (it won’t be damaged). If an LED doesn’t light, flipping it is the first thing to try.', draw: function (svg, S) { clear(svg); glowDefs(svg); drawLED(svg, S, true); } }
    ] });
    function drawLED(svg, S, flowOn) {
      S('rect', { x: 0, y: 0, width: 800, height: 300, fill: '#070d17' }, svg);
      if (flowOn) S('circle', { cx: 300, cy: 96, r: 80, fill: 'url(#bg-red)', opacity: 0.9 }, svg);
      S('path', { d: 'M270 150 v-56 a30 30 0 0 1 60 0 v56 z', fill: flowOn ? '#ff4d4d' : '#b33030', opacity: 0.9, stroke: '#ff8080', 'stroke-width': 2 }, svg);
      S('rect', { x: 262, y: 146, width: 76, height: 10, rx: 2, fill: '#b33030' }, svg);
      S('rect', { x: 334, y: 146, width: 4, height: 10, fill: '#070d17' }, svg);
      S('line', { x1: 284, y1: 156, x2: 284, y2: 280, stroke: '#b8c2cc', 'stroke-width': 4 }, svg);
      S('path', { d: 'M316 156 v40 l-6 10 v40', stroke: '#b8c2cc', 'stroke-width': 4, fill: 'none' }, svg);
      T(svg, 160, 270, 'ANODE (+)', { fill: '#e5484d', 'font-size': 14, 'letter-spacing': '1' }); T(svg, 160, 290, 'long leg', { fill: MUT, 'font-size': 12 });
      S('line', { x1: 250, y1: 266, x2: 280, y2: 266, stroke: '#e5484d' }, svg);
      T(svg, 352, 250, 'CATHODE (−)', { fill: '#6c8ee0', 'font-size': 14, 'letter-spacing': '1' }); T(svg, 352, 270, 'short leg', { fill: MUT, 'font-size': 12 });
      T(svg, 350, 156, '← flat edge', { fill: MUT, 'font-size': 12 });
      if (flowOn) {
        var p = S('path', { d: 'M284 290 L284 160 L316 160 L316 250', fill: 'none', stroke: 'none' }, svg);
        var f = flow(svg, p, 7, CY, 4); f.setSpeed(70); svg._flow = f;
        T(svg, 470, 120, 'CURRENT IN → ANODE', { fill: CY, 'font-size': 13, 'letter-spacing': '1' });
        T(svg, 470, 144, 'OUT ← CATHODE', { fill: CY, 'font-size': 13, 'letter-spacing': '1' });
      } else if (svg._flow) { svg._flow.stop(); svg._flow = null; }
    }
    UI.html(b, '<h2>Why every LED needs a resistor</h2><p>An LED uses up about 2 volts. If you connect it straight to 5V, the other 3 volts have nothing to slow them down, so the current shoots way past the LED’s 20 mA limit — and it burns out, sometimes with a pop. A resistor in the loop takes up those extra 3 volts and keeps the current safe.</p>' +
      '<p>Ohm’s law tells you how much current flows: <code>I = V ÷ R</code>, where <b>V is the voltage across the resistor</b> (5 V − 2 V = 3 V). Try different resistors from your kit:</p>');
    ohmLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-ohm1', q: 'Use <code>I = V ÷ R</code> with 3 V across a <b>330 Ω</b> resistor. How many <b>milliamps</b> flow? (1 A = 1000 mA)', answer: 9.09, tol: 0.25, unit: 'mA', explain: '3 ÷ 330 = 0.00909 A, and × 1000 = <b>9.1 mA</b>. Safely under 20 mA, so the LED glows bright and lasts.', hint: 'Divide 3 by 330 to get amps, then multiply by 1000.' });
    UI.mcq(b, ctx, { id: 'q-ohm2', q: 'Your partner wants to use a 10 Ω resistor “so the LED is extra bright.” What do you tell them?', options: ['Great idea — brighter is better', 'It will make the LED dimmer', 'That lets about 300 mA through: the LED will burn out', 'Resistors don’t affect brightness'], answer: 2, explain: '3 V ÷ 10 Ω = 0.3 A = 300 mA — fifteen times the LED’s limit. Stick with 220 Ω.' });
  } });
  function ohmLab(b, ctx) {
    var VALS = [10, 100, 220, 330, 1000, 10000, 100000], cur = 220;
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The resistor lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 260', role: 'img', 'aria-label': 'LED circuit with a resistor you can change' }); stage.appendChild(svg); glowDefs(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 260, fill: '#070d17' }, svg);
    var path = S('path', { d: 'M120 200 L120 70 L680 70 L680 200 Z', fill: 'none', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
    S('rect', { x: 92, y: 100, width: 56, height: 74, rx: 4, fill: '#121c2b', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
    T(svg, 120, 142, '5V', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600 }); T(svg, 120, 192, 'UNO', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT });
    S('rect', { x: 300, y: 56, width: 140, height: 28, fill: '#070d17' }, svg);
    S('line', { x1: 290, y1: 70, x2: 450, y2: 70, stroke: '#b8c2cc', 'stroke-width': 3 }, svg);
    S('rect', { x: 320, y: 56, width: 100, height: 28, rx: 13, fill: '#e3c99a', stroke: '#b59a6a' }, svg);
    var bands = [0, 1, 2, 3].map(function (i) { return S('rect', { x: 334 + i * 16 + (i === 3 ? 18 : 0), y: 56, width: 8, height: 28, fill: '#000' }, svg); });
    var rl = T(svg, 370, 44, '220 Ω', { 'text-anchor': 'middle', 'font-size': 14, fill: CY });
    S('rect', { x: 540, y: 180, width: 60, height: 40, fill: '#070d17' }, svg);
    var glow = S('circle', { cx: 570, cy: 200, r: 60, fill: 'url(#bg-red)', opacity: 0 }, svg);
    var dome = S('circle', { cx: 570, cy: 200, r: 17, fill: '#7a1d1d', stroke: '#ff4d4d', 'stroke-width': 2 }, svg);
    var smoke = S('g', { opacity: 0 }, svg);
    [[560, 170, 8], [575, 155, 10], [565, 138, 12]].forEach(function (c) { S('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#6b7785', opacity: 0.6 }, smoke); });
    T(svg, 570, 244, 'LED (uses 2 V)', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
    var f = flow(svg, path, 16, CY, 4.5);
    if (RL.onLeave) RL.onLeave(f.stop);
    var pills = el('div', 'slider-row'); pills.innerHTML = '<label>Resistor</label>';
    var pr = el('div', 'res-pills'); pills.appendChild(pr);
    VALS.forEach(function (v) { var btn = el('button', v === cur ? 'on' : '', fmtR(v)); btn.type = 'button'; btn.addEventListener('click', function () { cur = v; pr.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); btn.classList.add('on'); upd(); ctx.check('lab', Object.assign(ctx.check('lab') || {}, (function () { var o = {}; o[v] = 1; return o; })())); }); pr.appendChild(btn); });
    box.appendChild(pills);
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    function fmtR(v) { return v >= 1000000 ? v / 1000000 + ' MΩ' : v >= 1000 ? v / 1000 + ' kΩ' : v + ' Ω'; }
    function upd() {
      var mA = 3000 / cur, burnt = mA > 60, hot = mA > 20 && !burnt;
      RL.resistorBands(cur).forEach(function (c, i) { bands[i].setAttribute('fill', c); });
      rl.textContent = fmtR(cur);
      var bright = burnt ? 0 : Math.min(1, Math.pow(mA / 15, 0.6));
      glow.setAttribute('opacity', bright); dome.setAttribute('fill', burnt ? '#2b2f36' : bright > 0.05 ? '#ff4d4d' : '#7a1d1d'); dome.setAttribute('stroke', burnt ? '#4b5563' : '#ff4d4d');
      smoke.setAttribute('opacity', burnt ? 1 : 0);
      f.setSpeed(burnt ? 0 : Math.min(400, 20 + mA * 6));
      var status = burnt ? '<b style="color:var(--signal)">BURNT OUT</b>' : hot ? '<b style="color:var(--signal)">TOO MUCH</b>' : mA >= 5 ? '<b style="color:var(--go)">BRIGHT · SAFE</b>' : mA >= 1 ? '<b>DIM · SAFE</b>' : '<b class="muted">BARELY GLOWS</b>';
      var bnames = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'], bb = (function () { var e = 0, v = cur; while (v >= 100) { v /= 10; e++; } v = Math.round(v); return [Math.floor(v / 10), v % 10, e]; })();
      ro.innerHTML = '<div><span class="label">Current</span><b>' + (mA >= 1 ? mA.toFixed(1) : mA.toFixed(2)) + ' mA</b></div><div><span class="label">LED</span>' + status + '</div>' +
        '<div><span class="label">Colour bands</span><span class="small">' + bnames[bb[0]] + ' · ' + bnames[bb[1]] + ' · ' + bnames[bb[2]] + ' · gold</span></div>' +
        '<div><span class="label">Working</span><span class="small">3 V ÷ ' + cur + ' Ω = ' + (3 / cur).toPrecision(2) + ' A</span></div>';
    }
    upd();
    UI.html(b, '<p class="small muted">Reading the bands: the first two colours are digits and the third says how many zeros to add. Red (2), red (2), brown (1 zero) = 220 Ω. Gold means it’s within 5%. The colours are: black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9.</p>');
  }

  /* ---------- 06 build: first light ---------- */
  steps.push({ id: 'firstlight', title: 'Build: first light (no code)', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your first circuit uses the UNO only as a 5-volt power supply — no code yet. Follow the build guide one step at a time. Each step zooms in on the new part, and the rings show exactly which holes to use.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Keep the USB cable unplugged until the guide tells you to plug it in.</p>');
    B.guide(b, { title: 'First light', parts: merge(POWER, FIRST), base: [], steps: [
      { title: 'Power the + rail', add: ['p5v'], html: '<p>Use a <b>red</b> jumper wire. Plug one end into the UNO’s <b>5V</b> pin and the other into the <b>+</b> rail on the left side of the breadboard (any hole near the top).</p><p class="small muted">Red for power and black for ground is a habit engineers use so anyone can read a circuit.</p>' },
      { title: 'Connect the − rail to GND', add: ['pgnd'], html: '<p>Use a <b>black</b> wire from the <b>GND</b> pin beside pin 13 to the <b>−</b> rail next to it.</p>' },
      { title: 'Bridge the rails', add: ['pbr1', 'pbr2'], html: '<p>At the bottom of the breadboard, connect the left + rail to the right + rail (red), and the left − rail to the right − rail (black). Now there’s power and ground on both sides.</p>' },
      { title: 'Add the resistor', add: ['fr'], html: '<p>Bend the legs of a <b>220 Ω</b> resistor (red-red-brown) and push it into <b>e5</b> and <b>f5</b>, so it crosses the centre gap. Resistors work either way around.</p>' },
      { title: 'Add the LED', add: ['fl'], html: '<p>Put the red LED’s <b>long leg in j5</b> and its <b>short leg in the − rail</b> on the right. Long leg = anode = toward power.</p>' },
      { title: 'Close the loop', add: ['fj'], lit: { fl: 1 }, html: '<p>Add a short red jumper from the <b>+ rail into a5</b>. Now plug in the USB cable. <b>The LED should light up!</b></p><p>Trace the loop with your finger: 5V → + rail → a5 → resistor → LED → − rail → GND.</p>' },
      { title: 'Try other resistors', lit: { fl: 0.3 }, html: '<p>Unplug the USB, then swap the 220 Ω resistor for a <b>1 kΩ</b> (brown-black-red), then a <b>10 kΩ</b> (brown-black-orange). Plug in and compare the brightness each time. Put the 220 Ω back when you’re done.</p>' },
      { title: 'Add a push button', add: ['fb', 'fj2', 'fj3'], remove: ['fj'], lit: { fl: 0 }, html: '<p>Remove the red jumper from a5. Press the button into the breadboard so it straddles the centre gap, with its legs in <b>e7, f7, e9 and f9</b>. Add a red jumper from the <b>+ rail to a9</b>, and a yellow jumper from <b>c7 to c5</b>.</p><p>Plug in. The LED is off — until you <b>press the button</b>. Pressing it connects row 9 (5V) to row 7, which carries power to the resistor and LED.</p>' }
    ] });
    UI.note(b, ctx, { id: 'n-res', label: 'What did you notice when you swapped in the 1 kΩ and 10 kΩ resistors? Use the word “current” in your answer.', placeholder: 'With the 1 kΩ resistor the LED…' });
    UI.callout(b, 'plain', 'Not lighting?', '<ul><li>Is the LED the right way around? Long leg in j5.</li><li>Are the resistor legs in two different rows across the gap (e5 and f5)?</li><li>Push every leg and wire all the way in — loose parts are the #1 problem.</li><li>Is the UNO’s green ON light on?</li></ul>');
  } });

  /* ---------- 07 blink ---------- */
  steps.push({ id: 'blink', title: 'Your first program: Blink', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now the UNO gets to think. Code you write on your laptop is called a <b>sketch</b>. You’ll upload it through the USB cable, and the UNO runs it on its own.</p>');
    UI.callout(b, '', 'Set up the Arduino IDE', '<ol><li>Open the <b>Arduino IDE</b> on your laptop (or the Arduino Cloud Editor in a browser).</li><li>Plug in your UNO with the USB cable.</li><li>At the top, choose <b>Select Board</b> → <b>Arduino Uno</b> and pick the port it shows (it may be called COM3, /dev/cu.usbmodem…, or similar).</li><li>Make a new sketch: <b>File → New Sketch</b>.</li></ol><p class="small">No port showing up? Try another USB port or cable, then ask your teacher.</p>');
    UI.html(b, '<h2>Read the code</h2><p>Step through the Blink sketch. Every Arduino sketch has the same two parts: <code>setup()</code> runs once when the board starts, and <code>loop()</code> runs over and over, forever.</p>');
    RL.Code.walk(b, BLINK, [
      { lines: [1, 1], title: 'Comments', html: '<p>Anything after <code>//</code> is a <b>comment</b>: a note for humans. The UNO ignores it. Good engineers leave comments so others (and future you) can understand the code.</p>' },
      { lines: [3, 5], title: 'setup() runs once', html: '<p><code>void setup()</code> is a <b>function</b> — a named group of instructions. Everything between its curly brackets <code>{ }</code> runs once, right when the UNO powers on or resets.</p>' },
      { lines: [4, 4], title: 'pinMode()', html: '<p><code>pinMode(13, OUTPUT);</code> tells pin 13 it will <b>send out</b> voltage. The numbers and words inside the brackets are called <b>arguments</b>.</p><p>Every instruction ends with a <b>semicolon</b> <code>;</code> — forget one and the code won’t upload.</p>' },
      { lines: [7, 12], title: 'loop() runs forever', html: '<p>When <code>loop()</code> reaches its last line, it jumps back to the top and starts again — thousands of times a second if nothing slows it down.</p>' },
      { lines: [8, 8], title: 'digitalWrite()', html: '<p><code>digitalWrite(13, HIGH);</code> switches pin 13 to <b>HIGH = 5 volts</b>, so current flows through the L LED. <code>LOW</code> means 0 volts (off).</p>' },
      { lines: [9, 9], title: 'delay()', html: '<p><code>delay(1000);</code> pauses for 1000 <b>milliseconds</b> = 1 second. Without delays, the LED would flash so fast it would just look dim.</p>' },
      { lines: [10, 11], title: 'Off, wait, repeat', html: '<p>LED off, wait a second, and then loop() starts again from the top: on, wait, off, wait… That’s a blink.</p>' }
    ], { name: 'blink' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Press <b>Upload &amp; run</b> and watch the L LED. Then change the delays to make a quick double-flash “heartbeat,” and run it again. Try deleting a semicolon to see what an error looks like.</p>');
    RL.Sim.create(b, { title: 'Blink', code: BLINK, name: 'blink', key: 'sim-blink', ctx: ctx, board: { parts: {}, view: [186, 112, 170, 124] }, leds: { 13: 'L' },
      check: function (log) { var t = log.filter(function (e) { return e.pin === 13; }); var ons = t.filter(function (e) { return e.v; }).length; return t.length >= 4 ? { pass: true, msg: 'Pin 13 switched ' + t.length + ' times — the L LED is blinking.' } : { pass: false, msg: 'Pin 13 didn’t switch on and off enough. Check that loop() turns it HIGH and LOW with a delay after each.' }; }, checkAfter: 4500 });
    UI.html(b, '<h2>Now upload it for real</h2><p>Copy the code into the Arduino IDE (or download the .ino file), then click the <b>→ Upload</b> arrow. The TX and RX lights flicker while it uploads, then the <b>L</b> LED on your board starts blinking. You just programmed a microcontroller.</p>');
    UI.mcq(b, ctx, { id: 'q-blink', q: 'What would <code>delay(250);</code> do instead of <code>delay(1000);</code>?', options: ['Wait 250 seconds', 'Wait a quarter of a second, so the blink is 4 × faster', 'Make the LED 4 × brighter', 'Cause an error'], answer: 1, explain: '250 milliseconds = 0.25 seconds.' });
  } });

  /* ---------- 08 build: traffic light circuit ---------- */
  steps.push({ id: 'build', title: 'Build: the signal circuit', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time for the real thing: four LEDs controlled by four different pins, plus a button the UNO can read. Keep your power wires and the red LED from First light — the red LED becomes your red light.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable before you start. Remove the button and the jumpers in rows 5–9 from First light.</p>');
    B.guide(b, { title: 'Signal circuit', parts: ALL_TL, base: ['p5v', 'pgnd', 'pbr1', 'pbr2', 'r_red', 'l_red'], steps: [
      { title: 'Start from First light', view: 'all', html: '<p>You should have the power wires, the 220 Ω resistor in e5–f5, and the red LED (long leg j5, short leg in the − rail). Everything else comes off.</p>' },
      { title: 'Red light → pin 12', add: ['w_red'], html: '<p>Run a wire from <b>pin 12</b> on the UNO to <b>a5</b>. Now pin 12, not the + rail, decides when the red LED gets power.</p>' },
      { title: 'Yellow light → pin 11', add: ['r_yel', 'l_yel', 'w_yel'], html: '<p>Same pattern, four rows down: resistor <b>e9–f9</b>, yellow LED long leg <b>j9</b> and short leg in the − rail, and a wire from <b>pin 11 to a9</b>.</p>' },
      { title: 'Green light → pin 10', add: ['r_grn', 'l_grn', 'w_grn'], html: '<p>Resistor <b>e13–f13</b>, green LED long leg <b>j13</b> → − rail, wire <b>pin 10 → a13</b>.</p>' },
      { title: 'WALK light → pin 8', add: ['r_walk', 'l_walk', 'w_walk'], html: '<p>Leave a gap, then build the white WALK light: resistor <b>e19–f19</b>, white LED long leg <b>j19</b> → − rail, wire <b>pin 8 → a19</b>.</p>' },
      { title: 'The crosswalk button', add: ['btn', 'w_b5v'], html: '<p>Press the button across the gap with legs in <b>e23, f23, e25, f25</b>. Add a red jumper from the <b>+ rail to a23</b>. Pressing the button will connect row 23 (5V) to row 25.</p>' },
      { title: 'Button → pin 2, with a pull-down', add: ['w_b2', 'r_pd'], html: '<p>Wire <b>a25 to pin 2</b>. Then add a <b>10 kΩ</b> resistor (brown-black-orange) from <b>j25 to the − rail</b>. This is the <b>pull-down resistor</b> — the next explainer shows why it matters.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Compare your board with this picture, row by row. Each LED: wire in column a, resistor across the gap, long leg in column j, short leg in the − rail.</p>' }
    ] });
    UI.html(b, '<h2>Why the pull-down resistor?</h2>');
    pullDown(b);
    UI.mcq(b, ctx, { id: 'q-pd', q: 'With the pull-down resistor in place, what does pin 2 read when <b>no one</b> is pressing the button?', options: ['HIGH, because 5V is nearby', 'LOW, because the resistor connects pin 2 to GND', 'A random mix of HIGH and LOW', 'Nothing — it causes an error'], answer: 1, explain: 'The 10 kΩ resistor gently “pulls” pin 2 down to 0 V, so it reads a steady LOW until the button connects it to 5V.', hints: { 2: 'That’s what happens with no resistor at all (a floating pin).' } });
  } });
  function pullDown(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Floating pins and pull-down resistors', w: 800, h: 320,
      init: function (svg, S, st) {
        S('rect', { x: 0, y: 0, width: 800, height: 320, fill: '#070d17' }, svg);
        T(svg, 110, 40, '5V', { 'text-anchor': 'middle', 'font-size': 14, fill: '#e5484d', 'font-weight': 600 });
        S('line', { x1: 110, y1: 50, x2: 110, y2: 100, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
        S('circle', { cx: 110, cy: 104, r: 4, fill: '#9fb3c8' }, svg); S('circle', { cx: 110, cy: 146, r: 4, fill: '#9fb3c8' }, svg);
        st.lever = S('line', { x1: 110, y1: 146, x2: 130, y2: 108, stroke: '#9fb3c8', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
        T(svg, 140, 130, 'BUTTON', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        S('line', { x1: 110, y1: 150, x2: 110, y2: 220, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
        S('line', { x1: 110, y1: 180, x2: 250, y2: 180, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
        S('rect', { x: 250, y: 162, width: 70, height: 36, rx: 3, fill: '#15497a', stroke: '#2e6aa3' }, svg);
        T(svg, 285, 185, 'PIN 2', { 'text-anchor': 'middle', 'font-size': 12 });
        st.rg = S('g', {}, svg);
        S('rect', { x: 98, y: 220, width: 24, height: 50, rx: 10, fill: '#e3c99a', stroke: '#b59a6a' }, st.rg);
        RL.resistorBands(10000).forEach(function (c, i) { S('rect', { x: 98, y: 228 + i * 9 + (i === 3 ? 6 : 0), width: 24, height: 4, fill: c }, st.rg); });
        S('line', { x1: 110, y1: 270, x2: 110, y2: 290, stroke: '#9fb3c8', 'stroke-width': 3 }, st.rg);
        S('path', { d: 'M92 290 h36 M98 297 h24 M104 304 h12', stroke: '#9fb3c8', 'stroke-width': 3 }, st.rg);
        T(st.rg, 136, 250, '10 kΩ', { 'font-size': 11, fill: MUT });
        st.gap = S('rect', { x: 100, y: 205, width: 20, height: 105, fill: '#070d17', opacity: 0 }, svg);
        T(svg, 420, 60, 'WHAT PIN 2 READS', { 'font-size': 11, fill: MUT, 'letter-spacing': '2' });
        S('line', { x1: 420, y1: 110, x2: 770, y2: 110, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 410, 114, 'HIGH', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        S('line', { x1: 420, y1: 230, x2: 770, y2: 230, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 410, 234, 'LOW', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        st.trace = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
        st.read = T(svg, 595, 282, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY, 'letter-spacing': '1' });
        var pts = [], mode = 'float', pressed = false, x = 0, last = 0;
        st.set = function (m, p) { mode = m; pressed = p; st.gap.setAttribute('opacity', m === 'float' ? 1 : 0); st.rg.setAttribute('opacity', m === 'float' ? 0.15 : 1); st.lever.setAttribute('x2', p ? 110 : 130); st.lever.setAttribute('y2', p ? 104 : 108); };
        (function tick(t) {
          if (t - last > 40) { last = t; x += 4; var hi = mode === 'float' ? (Math.random() < 0.5) : pressed; pts.push([420 + x, hi ? 110 : 230]); if (x > 350) { x = 0; pts = []; }
            st.trace.setAttribute('points', pts.map(function (p, i) { var prev = pts[i - 1]; return (prev ? p[0] + ',' + prev[1] + ' ' : '') + p[0] + ',' + p[1]; }).join(' '));
            st.read.textContent = mode === 'float' ? 'RANDOM — FLOATING' : pressed ? 'HIGH (pressed)' : 'LOW (not pressed)';
            st.read.setAttribute('fill', mode === 'float' ? SIG : CY);
          }
          st.raf = requestAnimationFrame(tick);
        })(0);
        st.stop = function () { cancelAnimationFrame(st.raf); };
      },
      frames: [
        { cap: '<b>No resistor: the pin floats.</b> When the button isn’t pressed, pin 2 isn’t connected to anything. It picks up electrical noise from the air (and your hands), so it reads random HIGHs and LOWs. Your code would think the button is being mashed.', draw: function (svg, S, st) { st.set('float', false); } },
        { cap: '<b>Add a pull-down resistor.</b> The 10 kΩ resistor connects pin 2 to GND. With the button released, pin 2 is pulled down to 0 V — a steady, reliable <b>LOW</b>.', draw: function (svg, S, st) { st.set('pd', false); } },
        { cap: '<b>Press the button:</b> 5V connects straight to pin 2, so it reads <b>HIGH</b>. A tiny current (5 V ÷ 10 000 Ω = 0.5 mA) leaks through the resistor to GND — harmless, and far too small to be a short circuit.', draw: function (svg, S, st) { st.set('pd', true); st.later(function () { st.set('pd', false); }, 1600); st.later(function () { st.set('pd', true); }, 2600); st.later(function () { st.set('pd', false); }, 3800); } }
      ] });
  }

  /* ---------- 09 code part 1 ---------- */
  steps.push({ id: 'code1', title: 'Code it: cycle the lights', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">First, make the car lights cycle on their own: green, yellow, red, repeat. You’ll meet <b>constants</b> — names for numbers — which make code much easier to read and change.</p>');
    RL.Code.walk(b, CYCLE, [
      { lines: [4, 6], title: 'Give your pins names', html: '<p><code>const int RED_LIGHT = 12;</code> creates a <b>constant</b>: a name that stands for the number 12. <code>int</code> means it’s a whole number, and <code>const</code> means it never changes.</p><p>Now you can write <code>RED_LIGHT</code> instead of remembering “12.” If you ever move a wire, you only change the number in one place.</p>' },
      { lines: [8, 12], title: 'Set three outputs', html: '<p>Each light gets a <code>pinMode(…, OUTPUT);</code> line in setup().</p>' },
      { lines: [15, 17], title: 'Green for 4 seconds', html: '<p>On, wait 4000 ms, off. That’s the pattern for every light.</p>' },
      { lines: [19, 21], title: 'Your turn', html: '<p>Write the yellow and red parts yourself in the Virtual UNO below, using the same three-line pattern. Yellow stays on for <b>1.5 seconds</b> (how many milliseconds is that?) and red for <b>4 seconds</b>.</p>' }
    ], { name: 'cycle_lights', download: false });
    RL.Sim.create(b, { title: 'Cycle the lights', code: CYCLE, name: 'cycle_lights', key: 'sim-cycle', ctx: ctx, board: { parts: ALL_TL, show: TL_IDS, view: SIM_VIEW }, leds: SIM_LEDS, buttons: { 2: { part: 'btn', wiring: 'pulldown' } },
      checkAfter: 10500,
      check: function (log) {
        function on(p) { return log.some(function (e) { return e.pin === p && e.v; }); }
        function off(p) { return log.some(function (e) { return e.pin === p && !e.v; }); }
        var miss = [];
        if (!on(10) || !off(10)) miss.push('green'); if (!on(11) || !off(11)) miss.push('yellow'); if (!on(12) || !off(12)) miss.push('red');
        var r = miss.length ? { pass: false, msg: 'These lights didn’t turn on and off: ' + miss.join(', ') + '. Check the pin names and that each one is turned HIGH, then LOW after a delay.' } : { pass: true, msg: 'All three lights cycle. On to the button!' };
        ctx.check('sim-cycle-pass', r.pass ? 1 : 0); return r;
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the yellow part</summary><p class="small">Yellow on, wait 1.5 s, yellow off:</p>';
    RL.Code.block(hint, '  digitalWrite(YELLOW_LIGHT, HIGH);\n  delay(1500);\n  digitalWrite(YELLOW_LIGHT, LOW);', { download: false });
    b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">When it works in the Virtual UNO, upload it to your real board and watch your breadboard cycle.</p>');
  } });

  /* ---------- 10 code part 2 ---------- */
  steps.push({ id: 'code2', title: 'Code it: push to cross', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Real crosswalks don’t cycle forever — they wait for someone to ask. Your program needs to <b>read the button</b> and <b>make a decision</b>.</p><p>Before writing code, engineers often plan the logic as a <b>flowchart</b>. Follow this one:</p>');
    flowchart(b);
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, CROSS, [
      { lines: [1, 5], title: 'A block comment', html: '<p>Comments can span many lines between <code>/*</code> and <code>*/</code>. Use one at the top to say what your sketch does.</p>' },
      { lines: [7, 12], title: 'Five pins, five names', html: '<p>The four lights plus the button. Check these match your wiring.</p>' },
      { lines: [14, 14], title: 'A variable', html: '<p><code>int buttonState = 0;</code> creates a <b>variable</b> — like a constant, but its value can change. It will remember what the button was doing the last time we checked.</p>' },
      { lines: [21, 21], title: 'An INPUT pin', html: '<p>The button pin is an <code>INPUT</code>: the UNO listens to it instead of powering it.</p>' },
      { lines: [24, 29], title: 'The default state', html: '<p>Every time loop() starts, cars get green and everything else is off.</p>' },
      { lines: [31, 31], title: 'digitalRead()', html: '<p><code>digitalRead(BUTTON)</code> checks pin 2 and gives back <code>HIGH</code> (5 V: pressed) or <code>LOW</code> (0 V: not pressed). The <code>=</code> stores that answer in <code>buttonState</code>.</p>' },
      { lines: [33, 33], title: 'if: making a decision', html: '<p>The code inside <code>if ( … ) { }</code> runs <b>only when the condition is true</b>. Notice the <b>double</b> equals <code>==</code>: it <i>compares</i>. A single <code>=</code> would <i>set</i> the value instead — a classic bug.</p><p>If the button isn’t pressed, the whole block is skipped and loop() starts again.</p>' },
      { lines: [35, 42], title: 'The crossing sequence', html: '<p>Wait a second, green off, yellow on for 2 s, then red and WALK together for 5 s. This is just like your cycle code.</p>' },
      { lines: [45, 50], title: 'A for loop', html: '<p>To flash WALK 6 times, instead of copying 4 lines six times, a <code>for</code> loop repeats them.</p><p><code>int i = 0</code> starts a counter, <code>i &lt; 6</code> keeps going while it’s under 6, and <code>i++</code> adds 1 each time around.</p>' },
      { lines: [51, 54], title: 'All clear', html: '<p>WALK off, one more second of red so the crosswalk is empty, then loop() starts over — and cars get green again.</p>' }
    ], { name: 'crosswalk' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Run it, then <b>press the button on the breadboard</b> (click and hold it, or tab to it and press Space). <b>Check my code</b> presses the button for you and watches the lights.</p>');
    RL.Sim.create(b, { title: 'Crosswalk signal', code: CROSS, name: 'crosswalk', key: 'sim-cross', ctx: ctx, board: { parts: ALL_TL, show: TL_IDS, view: SIM_VIEW }, leds: SIM_LEDS, buttons: { 2: { part: 'btn', wiring: 'pulldown' } },
      checkAfter: 600,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var start = log.length;
          sim.press(2, true); setTimeout(function () { sim.press(2, false); }, 500);
          setTimeout(function () {
            var ev = log.slice(start), t = {};
            function first(p, v) { for (var i = 0; i < ev.length; i++) if (ev[i].pin === p && !!ev[i].v === v) return ev[i].t; return null; }
            var y = first(11, true), r = first(12, true), w = first(8, true), walkOn = ev.filter(function (e) { return e.pin === 8 && e.v; }).length;
            var res;
            if (y == null) res = { pass: false, msg: 'After the button press, the yellow light never came on. Is your if checking the button with == HIGH?' };
            else if (r == null || w == null) res = { pass: false, msg: 'Red and WALK need to come on after yellow.' };
            else if (walkOn < 4) res = { pass: false, msg: 'The WALK light should flash a few times before it goes off.' };
            else res = { pass: true, msg: 'Button → yellow → red + WALK → flashing WALK. Your crosswalk logic works.' };
            ctx.check('sim-cross-pass', res.pass ? 1 : 0); resolve(res);
          }, 10200);
        });
      } });
    UI.html(b, '<h2>Upload to your board</h2><p>Download or copy the code, upload it, and test it with your real button. If something doesn’t work, check the table below before changing any code.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>An LED never lights</b><br><span class="small muted">Flip the LED (long leg in column j). Check its wire goes to the pin in the code.</span></div></div><div class="trow"><div><b>The wrong LED lights</b><br><span class="small muted">Two wires are swapped, or a constant has the wrong pin number.</span></div></div><div class="trow"><div><b>The sequence starts by itself</b><br><span class="small muted">The pull-down resistor is missing or not in row 25, so pin 2 is floating.</span></div></div><div class="trow"><div><b>Pressing does nothing</b><br><span class="small muted">Turn the button 90°: its legs need to straddle the centre gap. Check the red jumper to a23.</span></div></div></div>');
  } });
  function flowchart(b) {
    var BOX = [
      { id: 'loop', x: 300, y: 20, w: 200, h: 44, t: 'loop() starts' },
      { id: 'green', x: 300, y: 92, w: 200, h: 44, t: 'Green on, others off' },
      { id: 'read', x: 300, y: 164, w: 200, h: 44, t: 'Read the button' },
      { id: 'q', x: 330, y: 236, w: 140, h: 80, t: 'Pressed?', diamond: true },
      { id: 'yel', x: 560, y: 254, w: 200, h: 44, t: 'Yellow for 2 s' },
      { id: 'red', x: 560, y: 326, w: 200, h: 44, t: 'Red + WALK for 5 s' },
      { id: 'flash', x: 560, y: 398, w: 200, h: 44, t: 'Flash WALK 6 times' }
    ];
    UI.explainer(b, { label: 'Flowchart', title: 'The crosswalk logic', w: 800, h: 470,
      init: function (svg, S, st) {
        glowDefs(svg);
        S('rect', { x: 0, y: 0, width: 800, height: 470, fill: '#070d17' }, svg);
        var mk = S('defs', {}, svg), m = S('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, mk); S('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#9fb3c8' }, m);
        function arrow(d) { S('path', { d: d, fill: 'none', stroke: '#9fb3c8', 'stroke-width': 2, 'marker-end': 'url(#arr)' }, svg); }
        arrow('M400 64 L400 90'); arrow('M400 136 L400 162'); arrow('M400 208 L400 234');
        arrow('M470 276 L558 276'); arrow('M660 298 L660 324'); arrow('M660 370 L660 396');
        arrow('M560 420 L240 420 L240 42 L298 42');
        arrow('M330 276 L260 276 L260 42');
        T(svg, 512, 268, 'YES', { 'font-size': 11, fill: GO, 'letter-spacing': '1.5' }); T(svg, 300, 268, 'NO', { 'font-size': 11, fill: SIG, 'letter-spacing': '1.5', 'text-anchor': 'end' });
        st.boxes = {};
        BOX.forEach(function (bx) {
          var g = S('g', {}, svg), sh;
          if (bx.diamond) sh = S('path', { d: 'M' + (bx.x + bx.w / 2) + ' ' + bx.y + ' L' + (bx.x + bx.w) + ' ' + (bx.y + bx.h / 2) + ' L' + (bx.x + bx.w / 2) + ' ' + (bx.y + bx.h) + ' L' + bx.x + ' ' + (bx.y + bx.h / 2) + ' Z', fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, g);
          else sh = S('rect', { x: bx.x, y: bx.y, width: bx.w, height: bx.h, rx: 4, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, g);
          T(g, bx.x + bx.w / 2, bx.y + bx.h / 2 + 5, bx.t, { 'text-anchor': 'middle', 'font-size': 13, 'font-family': 'IBM Plex Sans, sans-serif' });
          st.boxes[bx.id] = sh;
        });
        // mini signal
        var mini = S('g', { transform: 'translate(60 120)' }, svg);
        S('rect', { x: 0, y: 0, width: 60, height: 150, rx: 8, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, mini);
        st.lamps = {};
        [['red', '#ff4d4d', 30], ['yellow', '#ffd23f', 75], ['green', '#3ee07a', 120]].forEach(function (l) { st.lamps[l[0]] = S('circle', { cx: 30, cy: l[2], r: 16, fill: '#1d2735' }, mini); st.lamps[l[0]].dataset.c = l[1]; });
        st.walk = S('rect', { x: 10, y: 170, width: 40, height: 26, rx: 3, fill: '#1d2735' }, mini);
        T(mini, 30, 188, 'WALK', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT });
        st.light = function (o) { Object.keys(st.lamps).forEach(function (k) { st.lamps[k].setAttribute('fill', o[k] ? st.lamps[k].dataset.c : '#1d2735'); }); st.walk.setAttribute('fill', o.walk ? '#f4f7fb' : '#1d2735'); };
        st.hl = function (ids) { Object.keys(st.boxes).forEach(function (k) { var on = ids.indexOf(k) >= 0; st.boxes[k].setAttribute('stroke', on ? CY : '#9fb3c8'); st.boxes[k].setAttribute('stroke-width', on ? 3 : 2); st.boxes[k].setAttribute('fill', on ? '#0a2a36' : '#0e1826'); }); };
      },
      frames: [
        { cap: '<b>Every pass through loop()</b> starts by giving cars a green light.', draw: function (svg, S, st) { st.hl(['loop', 'green']); st.light({ green: 1 }); } },
        { cap: '<b>Then it reads the button</b> and asks a yes/no question. This diamond is the <code>if</code> in your code.', draw: function (svg, S, st) { st.hl(['read', 'q']); st.light({ green: 1 }); } },
        { cap: '<b>No one pressed it?</b> Go straight back to the top. loop() runs thousands of times a second, so it’s checking the button constantly.', draw: function (svg, S, st) { st.hl(['q', 'loop']); st.light({ green: 1 }); } },
        { cap: '<b>Pressed!</b> Run the crossing sequence: yellow, then red with WALK, then a flashing WALK warning…', draw: function (svg, S, st) {
          st.hl(['yel']); st.light({ yellow: 1 });
          st.later(function () { st.hl(['red']); st.light({ red: 1, walk: 1 }); }, 1400);
          for (var k = 0; k < 6; k++) { (function (k) { st.later(function () { st.hl(['flash']); st.light({ red: 1, walk: k % 2 }); }, 3000 + k * 300); })(k); }
        } },
        { cap: '<b>…and back to the top,</b> where cars get green again and the UNO waits for the next press.', draw: function (svg, S, st) { st.hl(['flash', 'loop']); st.light({ red: 1 }); st.later(function () { st.hl(['green']); st.light({ green: 1 }); }, 900); } }
      ] });
  }

  /* ---------- 11 housing ---------- */
  steps.push({ id: 'housing', title: 'Design & build the housing', stage: '03 Imagine · 05 Create', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">LEDs on a breadboard are hard to read from across a street. Real signals put each light in a housing that makes it big, bright and obvious. Your job: design one out of cardboard.</p><p>Here’s one way to do it. You can change the shape, size or style — as long as the lights stay readable and the wiring still works.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue is hot enough to burn: hold pieces by the edges and let glue cool before touching it. Unplug the UNO while you move LEDs.</p>');
    housing(b);
    UI.html(b, '<h2>Moving the LEDs off the breadboard</h2><p>Use <b>female-to-male wires</b> to extend each LED: the socket end slides onto an LED leg, and the pin end goes into the breadboard hole where that leg used to be. Do one leg at a time so nothing gets mixed up — long leg back into column j, short leg back into the − rail.</p>');
    UI.callout(b, '', 'Design ideas', '<ul><li>Make each light bigger with a paper “visor” or a ring around the hole.</li><li>Tape a little tissue paper behind each hole to spread the light.</li><li>Label the WALK light (a walking-person stencil looks great).</li><li>Build a separate push-button box for the pedestrian side.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your housing, and why.', placeholder: 'I made the lights… because…' });
  } });
  function housing(b) {
    var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72';
    function base(svg, S) { clear(svg); glowDefs(svg); S('rect', { x: 0, y: 0, width: 800, height: 380, fill: '#070d17' }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard signal housing', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Cut a strip</b> of cardboard about <b>8 cm × 28 cm</b>. Mark four fold lines across it: panels of 7 cm, 6 cm, 7 cm and 6 cm, plus a 2 cm glue tab at the end.', draw: function (svg, S) {
        base(svg, S);
        var x0 = 120, y0 = 120, sc = 20;
        S('rect', { x: x0, y: y0, width: 28 * sc, height: 8 * sc, fill: CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg);
        [7, 13, 20, 26].forEach(function (c) { S('line', { x1: x0 + c * sc, y1: y0, x2: x0 + c * sc, y2: y0 + 8 * sc, stroke: CBD, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg); });
        [[0, 7, 'FRONT'], [7, 6, 'SIDE'], [13, 7, 'BACK'], [20, 6, 'SIDE'], [26, 2, 'TAB']].forEach(function (p) { T(svg, x0 + (p[0] + p[1] / 2) * sc, y0 + 4 * sc + 4, p[2], { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 12, 'letter-spacing': '2' }); });
        S('line', { x1: x0, y1: y0 - 20, x2: x0 + 28 * sc, y2: y0 - 20, stroke: CY }, svg); T(svg, x0 + 14 * sc, y0 - 28, '28 cm', { 'text-anchor': 'middle', fill: CY });
        S('line', { x1: x0 - 20, y1: y0, x2: x0 - 20, y2: y0 + 8 * sc, stroke: CY }, svg); T(svg, x0 - 28, y0 + 4 * sc + 4, '8 cm', { 'text-anchor': 'end', fill: CY });
        T(svg, x0 + 14 * sc, y0 + 8 * sc + 36, 'dashed lines = fold, don’t cut', { 'text-anchor': 'middle', fill: MUT });
      } },
      { cap: '<b>Step 2 · Punch three holes</b> down the middle of the FRONT panel, about 2 cm apart. Poke through with a sharp pencil so each LED fits snugly (5 mm).', draw: function (svg, S, st) {
        base(svg, S);
        var x0 = 300, y0 = 40;
        S('rect', { x: x0, y: y0, width: 140, height: 300, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        T(svg, x0 + 70, y0 + 290, 'FRONT', { 'text-anchor': 'middle', fill: '#3a2a16', 'letter-spacing': '2' });
        [80, 150, 220].forEach(function (y, i) { st.later(function () { S('circle', { cx: x0 + 70, cy: y0 + y, r: 12, fill: '#1a1208', 'class': 'part-new' }, svg); S('circle', { cx: x0 + 70, cy: y0 + y, r: 20, 'class': 'ring' }, svg); }, 300 + i * 500); });
        T(svg, x0 + 170, y0 + 154, '2 cm apart', { fill: CY }); S('path', { d: 'M' + (x0 + 160) + ' ' + (y0 + 80) + ' v140', stroke: CY, 'stroke-dasharray': '4 4' }, svg);
      } },
      { cap: '<b>Step 3 · Fold and glue</b> along the fold lines to make a tall box. Glue the tab inside. Cut a small notch at the bottom of the BACK panel for the wires to come out.', draw: function (svg, S) {
        base(svg, S);
        var g = S('g', { 'class': 'part-new' }, svg);
        S('path', { d: 'M300 60 L440 60 L490 30 L350 30 Z', fill: CBL, stroke: CBD, 'stroke-width': 2 }, g);
        S('path', { d: 'M440 60 L490 30 L490 310 L440 340 Z', fill: CBD, stroke: '#6b4a26', 'stroke-width': 2 }, g);
        S('rect', { x: 300, y: 60, width: 140, height: 280, fill: CB, stroke: CBD, 'stroke-width': 2 }, g);
        [120, 190, 260].forEach(function (y) { S('circle', { cx: 370, cy: y, r: 12, fill: '#1a1208' }, g); });
        S('path', { d: 'M460 328 l10 -6 v-16 l-10 6 z', fill: '#070d17' }, g);
        T(svg, 520, 320, '← wire notch (back)', { fill: MUT, 'font-size': 12 });
      } },
      { cap: '<b>Step 4 · Fit the LEDs</b> from the inside: red at the top, yellow in the middle, green at the bottom — the same order as real traffic lights. Leave the legs pointing back.', draw: function (svg, S, st) {
        base(svg, S);
        S('path', { d: 'M300 60 L440 60 L490 30 L350 30 Z', fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: 'M440 60 L490 30 L490 310 L440 340 Z', fill: CBD, stroke: '#6b4a26', 'stroke-width': 2 }, svg);
        S('rect', { x: 300, y: 60, width: 140, height: 280, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        [['red', '#ff4d4d', 120], ['yellow', '#ffd23f', 190], ['green', '#3ee07a', 260]].forEach(function (l, i) {
          st.later(function () { S('circle', { cx: 370, cy: l[2], r: 34, fill: 'url(#bg-' + l[0] + ')', opacity: 0.8 }, svg); S('circle', { cx: 370, cy: l[2], r: 11, fill: l[1], 'class': 'part-new' }, svg); T(svg, 250, l[2] + 4, l[0].toUpperCase(), { 'text-anchor': 'end', fill: l[1], 'letter-spacing': '2' }); }, 200 + i * 450);
        });
      } },
      { cap: '<b>Step 5 · Extend the legs</b> with female-to-male wires. Push a socket onto each leg, then plug the pin end into the breadboard exactly where that leg used to be. Mark the long-leg wires with a bit of tape so you can tell them apart.', draw: function (svg, S, st) {
        base(svg, S);
        S('rect', { x: 120, y: 60, width: 130, height: 260, fill: CBD, stroke: '#6b4a26', 'stroke-width': 2 }, svg);
        T(svg, 185, 345, 'BACK OF THE HOUSING', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        var cols = ['#fb923c', '#facc15', '#22c55e'];
        [110, 180, 250].forEach(function (y, i) {
          S('circle', { cx: 185, cy: y, r: 10, fill: '#1a1208' }, svg);
          S('line', { x1: 180, y1: y, x2: 220, y2: y - 6, stroke: '#b8c2cc', 'stroke-width': 3 }, svg); S('line', { x1: 190, y1: y, x2: 222, y2: y + 8, stroke: '#b8c2cc', 'stroke-width': 3 }, svg);
          st.later(function () {
            S('rect', { x: 220, y: y - 12, width: 18, height: 10, fill: '#111', 'class': 'part-new' }, svg); S('rect', { x: 222, y: y + 3, width: 18, height: 10, fill: '#111', 'class': 'part-new' }, svg);
            S('path', { d: 'M238 ' + (y - 7) + ' C 400 ' + (y - 7) + ', 460 ' + (220 + i * 30) + ', 600 ' + (220 + i * 30), stroke: cols[i], 'stroke-width': 4, fill: 'none', 'class': 'part-new' }, svg);
            S('path', { d: 'M240 ' + (y + 8) + ' C 400 ' + (y + 8) + ', 460 ' + (234 + i * 30) + ', 600 ' + (234 + i * 30), stroke: '#30363f', 'stroke-width': 4, fill: 'none', 'class': 'part-new' }, svg);
          }, 300 + i * 500);
        });
        S('rect', { x: 600, y: 190, width: 150, height: 150, rx: 6, fill: '#d3dbe4' }, svg);
        T(svg, 675, 180, 'TO THE BREADBOARD', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        T(svg, 300, 70, 'long leg → column j', { fill: CY, 'font-size': 12 }); T(svg, 300, 90, 'short leg → − rail', { fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 6 · Mount it.</b> Hot-glue a popsicle-stick pole to the back and stand it in a cardboard base. Put the white WALK LED and the button in a small box for the pedestrian side. Then test everything again — moving parts loosens wires.', draw: function (svg, S, st) {
        base(svg, S);
        S('rect', { x: 250, y: 330, width: 200, height: 18, rx: 3, fill: CBD }, svg);
        S('rect', { x: 340, y: 200, width: 18, height: 132, fill: '#e8d3a8', stroke: '#c4a978', 'class': 'part-new' }, svg);
        S('rect', { x: 305, y: 30, width: 90, height: 180, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        var lamps = [['red', '#ff4d4d', 70], ['yellow', '#ffd23f', 120], ['green', '#3ee07a', 170]].map(function (l) { var gl = S('circle', { cx: 350, cy: l[2], r: 30, fill: 'url(#bg-' + l[0] + ')', opacity: 0 }, svg); var c = S('circle', { cx: 350, cy: l[2], r: 12, fill: '#3a2a16' }, svg); return [gl, c, l[1]]; });
        S('rect', { x: 500, y: 240, width: 90, height: 100, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg);
        var wg = S('circle', { cx: 545, cy: 270, r: 26, fill: 'url(#bg-white)', opacity: 0 }, svg), w = S('circle', { cx: 545, cy: 270, r: 10, fill: '#3a2a16' }, svg);
        S('circle', { cx: 545, cy: 315, r: 11, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        T(svg, 545, 362, 'WALK + BUTTON', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        function set(i, on) { lamps[i][0].setAttribute('opacity', on ? 0.9 : 0); lamps[i][1].setAttribute('fill', on ? lamps[i][2] : '#3a2a16'); }
        function walk(on) { wg.setAttribute('opacity', on ? 0.9 : 0); w.setAttribute('fill', on ? '#f4f7fb' : '#3a2a16'); }
        var seq = [[2, 0, 1800], [1, 0, 1000], [0, 1, 1800]], k = 0;
        (function cyc() { var s2 = seq[k % 3]; [0, 1, 2].forEach(function (i) { set(i, i === s2[0]); }); walk(s2[1]); k++; st.later(cyc, s2[2]); })();
      } }
    ] });
  }

  /* ---------- 12 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Engineers don’t stop at “it works once.” Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Idle:</b> with no one pressing, green stays on and nothing else lights.',
      '<b>Press:</b> one quick press starts the sequence (within about a second).',
      '<b>Sequence:</b> yellow → red + WALK → flashing WALK → green, in that order.',
      '<b>Readable:</b> from 3 metres away, a classmate can tell which light is on.',
      '<b>Sturdy:</b> moving the housing gently doesn’t make any light flicker or stop.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2><p>Real crosswalks do more than yours does (yet). Choose a challenge, try it in the Virtual UNO first if you like, then build it.</p>');
    UI.challenges(b, [
      { tag: 'Accessibility', cls: 'c', title: 'Make it talk', html: 'Many crosswalks beep for people who can’t see the signal. Add the <b>active buzzer</b> (pin 7 → buzzer + leg, − leg → GND) and make it chirp while WALK is on.', hint: 'An active buzzer works like an LED: <code>digitalWrite(7, HIGH)</code> makes it sound. Turn it on and off with the WALK light.' },
      { tag: 'Code', title: 'Hurry-up countdown', html: 'Make the WALK flashes speed up as time runs out, like a countdown.', hint: 'Use the for loop’s counter: <code>delay(400 - i * 50);</code>' },
      { tag: 'Code', title: 'Night mode', html: 'Late at night, many lights just flash yellow. Make yours flash yellow until the button is pressed.' },
      { tag: 'Build', title: 'Don’t walk', html: 'Add an orange or red “DON’T WALK” LED to the pedestrian box that’s on whenever WALK is off. Which pin will you use?' },
      { tag: 'Build + code', cls: 'c', title: 'Two sides of the street', html: 'Add a second button so people on either side can request a crossing. Both should start the same sequence.', hint: 'You can read two pins in one if: <code>if (a == HIGH || b == HIGH)</code>. <code>||</code> means “or.”' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 13 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m01 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working crosswalk signal. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of your housing and one close-up of your breadboard wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: show green, press the button, and film the whole crossing sequence.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'crosswalk' }
      ],
      questions: [
        { id: 'r1', q: 'Each LED in your circuit has a 220 Ω resistor. Use Ohm’s law (I = V ÷ R) to explain what the resistor does and what would happen without it.' },
        { id: 'r2', q: 'What is the 10 kΩ pull-down resistor on the button for? What would your crosswalk do without it?' },
        { id: 'r3', q: 'Explain how your code decides when to start the crossing sequence. Use the words digitalRead, HIGH and if.' },
        { id: 'r4', q: 'Describe one problem you ran into (wiring, code or building) and how you solved it.' }
      ]
    }
  };
})(window);
