/* Mission 02: Mood lamp — the guide.
 * An RGB LED on PWM pins 11 (red), 10 (green) and 9 (blue), a 10 kΩ potentiometer on A0 that picks the colour,
 * and a photoresistor + 10 kΩ voltage divider on A1 that makes the lamp brighter as the room gets darker.
 * Same shape as m01: steps { id, title, stage, time, render(body, ctx) }, the last one is the evidence form. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function P(parent, x, y, str, a) { return T(parent, x, y, str, Object.assign({ 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 14 }, a || {})); }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', NAVY = '#070d17', WIREC = '#9fb3c8';
  var LBL = { 'font-size': 11, fill: MUT, 'letter-spacing': '2' };
  function bg(svg, w, h, grid) {
    S('rect', { x: 0, y: 0, width: w, height: h, fill: NAVY }, svg);
    if (grid) { for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, opacity: 0.35 }, svg); for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, opacity: 0.35 }, svg); }
  }
  function defsOf(svg) { return svg.querySelector('defs') || svg.insertBefore(S('defs', {}), svg.firstChild); }
  var GID = 0;
  /* a radial glow whose colour can change: returns { url, set(css) } */
  function grad(svg, c) {
    var id = 'm02g' + (++GID), g = S('radialGradient', { id: id }, defsOf(svg));
    var st = [S('stop', { offset: '0%', 'stop-opacity': 0.95 }, g), S('stop', { offset: '45%', 'stop-opacity': 0.35 }, g), S('stop', { offset: '100%', 'stop-opacity': 0 }, g)];
    var o = { url: 'url(#' + id + ')', set: function (col) { st.forEach(function (s) { s.setAttribute('stop-color', col); }); } };
    o.set(c || '#ffffff'); return o;
  }
  function clipRect(svg, x, y, w, h) { var id = 'm02c' + (++GID); S('rect', { x: x, y: y, width: w, height: h }, S('clipPath', { id: id }, defsOf(svg))); return 'url(#' + id + ')'; }
  /* one animation loop per explainer: fn(dt, seconds) every frame; stops on st.stop() */
  function loop(st, fn) {
    var last = performance.now(), t = 0;
    function tick(now) { var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; fn(dt, t); st.raf = requestAnimationFrame(tick); }
    st.raf = requestAnimationFrame(tick);
    st.stop = function () { cancelAnimationFrame(st.raf); };
  }
  function ease(cur, target, dt, k) { return cur + (target - cur) * Math.min(1, dt * (k || 5)); }
  function amap(x, a, b, c, d) { return Math.trunc((x - a) * (d - c) / (b - a) + c); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  /* the colour wheel exactly as the Arduino code computes it (knob 0–1023 → [r, g, b] 0–255) */
  function wheel(k) {
    var r, g, b;
    if (k < 341) { g = amap(k, 0, 340, 0, 255); r = 255 - g; b = 0; }
    else if (k < 682) { b = amap(k, 341, 681, 0, 255); g = 255 - b; r = 0; }
    else { r = amap(k, 682, 1023, 0, 255); b = 255 - r; g = 0; }
    return [r, g, b];
  }
  function css(c) { return 'rgb(' + c.map(function (v) { return Math.round(clamp(v, 0, 255)); }).join(',') + ')'; }
  function lerpC(a, b, t) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; }); }
  /* what a lit LED of colour c (0–255 each) looks like: full hue, brightness from the strongest channel */
  function shown(c) { var m = Math.max(c[0], c[1], c[2]); if (m < 3) return { col: [43, 52, 66], a: 0 }; return { col: c.map(function (v) { return v / m * 255; }), a: m / 255 }; }
  function ln(src, s) { var a = src.split('\n'); for (var i = 0; i < a.length; i++) if (a[i].indexOf(s) >= 0) return i + 1; throw new Error('m02: no line containing ' + s); }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  function slider(parent, label, min, max, val, on, unit, accent) {
    var row = el('div', 'slider-row'); row.innerHTML = '<label>' + esc(label) + '</label>';
    var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; r.setAttribute('aria-label', label); if (accent) r.style.accentColor = accent;
    var o = el('b', '', esc(val + (unit || ''))); o.style.minWidth = '64px';
    r.addEventListener('input', function () { o.textContent = r.value + (unit || ''); on(Number(r.value)); });
    row.appendChild(r); row.appendChild(o); parent.appendChild(row);
    return { input: r, set: function (v) { r.value = v; o.textContent = v + (unit || ''); on(Number(v)); } };
  }

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var LAMP = {
    rgb: { type: 'rgb', at: 'g5', name: 'RGB LED (longest leg in g6)' },
    w_c: { type: 'wire', from: 'j6', to: 'R-6', color: 'black', name: 'Black jumper: j6 → − rail' },
    r_r: { type: 'res', from: 'e5', to: 'f5', ohms: 220, name: '220 Ω resistor (red)' },
    r_g: { type: 'res', from: 'e7', to: 'f7', ohms: 220, name: '220 Ω resistor (green)' },
    r_b: { type: 'res', from: 'e8', to: 'f8', ohms: 220, name: '220 Ω resistor (blue)' },
    w_r: { type: 'wire', from: 'D11', to: 'a5', color: 'orange', name: 'Wire: pin 11 → a5 (red)' },
    w_g: { type: 'wire', from: 'D10', to: 'a7', color: 'green', name: 'Wire: pin 10 → a7 (green)' },
    w_b: { type: 'wire', from: 'D9', to: 'a8', color: 'blue', name: 'Wire: pin 9 → a8 (blue)' }
  };
  var SENSE = {
    w_l5: { type: 'wire', from: 'L+11', to: 'a11', color: 'red', name: 'Red jumper: + rail → a11' },
    ldr: { type: 'ldr', from: 'c11', to: 'c14', name: 'Photoresistor (c11–c14)' },
    r_ldr: { type: 'res', from: 'e14', to: 'e18', ohms: 10000, name: '10 kΩ resistor (e14–e18)' },
    w_lg: { type: 'wire', from: 'a18', to: 'L-18', color: 'black', name: 'Black jumper: a18 → − rail' },
    w_a1: { type: 'wire', from: 'A1', to: 'a14', color: 'yellow', via: [[18, 390], [20, 470], [64, 486], [300, 488], [336, 462], [340, 300]], name: 'Yellow wire: A1 → a14' },
    pot: { type: 'pot', at: 'e21', side: 'right', name: '10 kΩ potentiometer (e21, e23, e25)' },
    w_p5: { type: 'wire', from: 'L+21', to: 'a21', color: 'red', name: 'Red jumper: + rail → a21' },
    w_pg: { type: 'wire', from: 'a25', to: 'L-25', color: 'black', name: 'Black jumper: a25 → − rail' },
    w_a0: { type: 'wire', from: 'A0', to: 'a23', color: 'purple', via: [[6, 372], [8, 484], [52, 502], [300, 503], [354, 484], [360, 436]], name: 'Purple wire: A0 → a23' }
  };
  var ALL = merge(POWER, LAMP, SENSE);
  var LAMP_IDS = Object.keys(merge(POWER, LAMP)), ALL_IDS = Object.keys(ALL);
  var SIM_VIEW = [228, 34, 492, 484];
  function simOpts(o) {
    return Object.assign({
      board: { parts: ALL, show: ALL_IDS, view: SIM_VIEW },
      rgb: { part: 'rgb', r: 11, g: 10, b: 9 },
      analog: { 0: { label: 'knob', value: 300, part: 'pot' }, 1: { label: 'light sensor', value: 650, part: 'ldr' } }
    }, o);
  }

  /* ================= code ================= */
  var MIX = [
    '// Mission 02, part 1: mix colours with the RGB LED',
    '// Finish loop() so the LED also shows purple.',
    '',
    'const int RED_PIN = 11;     // all three are ~ (PWM) pins',
    'const int GREEN_PIN = 10;',
    'const int BLUE_PIN = 9;',
    '',
    'void setup() {',
    '  pinMode(RED_PIN, OUTPUT);',
    '  pinMode(GREEN_PIN, OUTPUT);',
    '  pinMode(BLUE_PIN, OUTPUT);',
    '}',
    '',
    '// sets all three colours at once: 0 = off, 255 = full brightness',
    'void setColor(int r, int g, int b) {',
    '  analogWrite(RED_PIN, r);',
    '  analogWrite(GREEN_PIN, g);',
    '  analogWrite(BLUE_PIN, b);',
    '}',
    '',
    'void loop() {',
    '  setColor(255, 0, 0);     // red',
    '  delay(1000);',
    '  setColor(0, 255, 0);     // green',
    '  delay(1000);',
    '  setColor(0, 0, 255);     // blue',
    '  delay(1000);',
    '  setColor(255, 160, 0);   // lots of red + some green = orange',
    '  delay(1000);',
    '',
    '  // YOUR TURN: mix purple (red + blue) and show it for 1 second',
    '',
    '  // fade from red to green, one small step at a time',
    '  for (int i = 0; i <= 255; i++) {',
    '    setColor(255 - i, i, 0);',
    '    delay(8);',
    '  }',
    '}'].join('\n');
  var READ = [
    '// Mission 02, part 2: read the knob and the light sensor',
    '',
    'const int KNOB = A0;     // potentiometer wiper',
    'const int LIGHT = A1;    // photoresistor + 10k divider',
    '',
    'void setup() {',
    '  Serial.begin(9600);    // open a link to the computer at 9600 bits per second',
    '}',
    '',
    'void loop() {',
    '  int knob = analogRead(KNOB);      // 0 to 1023',
    '  int light = analogRead(LIGHT);    // 0 to 1023 (higher = brighter)',
    '  float volts = knob * 5.0 / 1023;  // turn the reading back into volts',
    '',
    '  Serial.print("knob: ");',
    '  Serial.print(knob);',
    '  Serial.print("  (");',
    '  Serial.print(volts);',
    '  Serial.print(" V)   light: ");',
    '  Serial.println(light);',
    '  delay(250);',
    '}'].join('\n');
  var WHEEL = [
    '// Mission 02, part 3: the knob picks the colour',
    '',
    'const int RED_PIN = 11;',
    'const int GREEN_PIN = 10;',
    'const int BLUE_PIN = 9;',
    'const int KNOB = A0;',
    '',
    'int red = 0;      // the colour to show, 0 to 255 each',
    'int green = 0;',
    'int blue = 0;',
    '',
    'void setup() {',
    '  pinMode(RED_PIN, OUTPUT);',
    '  pinMode(GREEN_PIN, OUTPUT);',
    '  pinMode(BLUE_PIN, OUTPUT);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  int knob = analogRead(KNOB);    // 0 to 1023',
    '',
    '  if (knob < 341) {               // first third: red fades to green',
    '    green = map(knob, 0, 340, 0, 255);',
    '    red = 255 - green;',
    '    blue = 0;',
    '  } else if (knob < 682) {        // second third: green fades to blue',
    '    blue = map(knob, 341, 681, 0, 255);',
    '    green = 255 - blue;',
    '    red = 0;',
    '  } else {                        // last third: blue fades to red',
    '    red = map(knob, 682, 1023, 0, 255);',
    '    blue = 255 - red;',
    '    green = 0;',
    '  }',
    '',
    '  analogWrite(RED_PIN, red);',
    '  analogWrite(GREEN_PIN, green);',
    '  analogWrite(BLUE_PIN, blue);',
    '',
    '  Serial.print("knob ");',
    '  Serial.print(knob);',
    '  Serial.print("  R ");',
    '  Serial.print(red);',
    '  Serial.print("  G ");',
    '  Serial.print(green);',
    '  Serial.print("  B ");',
    '  Serial.println(blue);',
    '  delay(100);',
    '}'].join('\n');
  var LAMPCODE = [
    '/*',
    '  Mission 02: Mood lamp',
    '  The knob (A0) picks a colour on the colour wheel.',
    '  The light sensor (A1) sets the brightness: the darker the room,',
    '  the brighter the lamp glows.',
    '*/',
    '',
    'const int RED_PIN = 11;',
    'const int GREEN_PIN = 10;',
    'const int BLUE_PIN = 9;',
    'const int KNOB = A0;',
    'const int LIGHT = A1;',
    '',
    '// light readings for YOUR room (check them in the Serial Monitor)',
    'const int DARK = 200;     // sensor covered with your hand',
    'const int BRIGHT = 900;   // normal room light',
    '',
    'int red = 0;',
    'int green = 0;',
    'int blue = 0;',
    '',
    'void setup() {',
    '  pinMode(RED_PIN, OUTPUT);',
    '  pinMode(GREEN_PIN, OUTPUT);',
    '  pinMode(BLUE_PIN, OUTPUT);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  // 1. the knob picks the colour',
    '  int knob = analogRead(KNOB);',
    '  if (knob < 341) {',
    '    green = map(knob, 0, 340, 0, 255);',
    '    red = 255 - green;',
    '    blue = 0;',
    '  } else if (knob < 682) {',
    '    blue = map(knob, 341, 681, 0, 255);',
    '    green = 255 - blue;',
    '    red = 0;',
    '  } else {',
    '    red = map(knob, 682, 1023, 0, 255);',
    '    blue = 255 - red;',
    '    green = 0;',
    '  }',
    '',
    '  // 2. the light sensor picks the brightness (dark room = bright lamp)',
    '  int light = analogRead(LIGHT);',
    '  int brightness = map(light, DARK, BRIGHT, 255, 10);',
    '  brightness = constrain(brightness, 10, 255);',
    '',
    '  // 3. dim all three colours by the same amount, so the colour stays the same',
    '  analogWrite(RED_PIN, map(red, 0, 255, 0, brightness));',
    '  analogWrite(GREEN_PIN, map(green, 0, 255, 0, brightness));',
    '  analogWrite(BLUE_PIN, map(blue, 0, 255, 0, brightness));',
    '',
    '  Serial.print("light ");',
    '  Serial.print(light);',
    '  Serial.print("  brightness ");',
    '  Serial.println(brightness);',
    '  delay(50);',
    '}'].join('\n');

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '5 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m02;
    var wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = '<p class="lead">Mood lighting is everywhere: smart bulbs, gaming setups, the night-light in a little kid’s room. In this mission you’ll build one: an RGB lamp where <b>a knob picks the colour</b> and <b>a light sensor makes it glow brighter as the room gets darker</b>.</p>' +
      '<p>In Mission 01 every pin was either on or off. Now you’ll go <i>in between</i>: fading an LED to any brightness, mixing any colour out of red, green and blue light, and reading sensors that give you a whole range of numbers instead of just HIGH or LOW. It all ends up inside a glowing lampshade you design.</p>';
    UI.edp(left, [2, 3, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    preview(b);
    UI.callout(b, '', 'You’ll need from Mission 01', '<p>Breadboard rows and rails, LEDs and their 220 Ω resistors, <code>const int</code> pin names, <code>for</code> loops and <code>if</code>. Keep the 5V and GND wires on your board — everything else comes off.</p>');
  } });
  function preview(b) {
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360,
      init: function (svg, S, st) {
        var glow = grad(svg), clip = clipRect(svg, 60, 46, 200, 160);
        st.room = S('rect', { x: 0, y: 0, width: 800, height: 360, fill: '#13233a' }, svg);
        var win = S('g', { 'clip-path': clip }, svg);
        var sky = S('rect', { x: 60, y: 46, width: 200, height: 160, fill: '#6fb3dc' }, win);
        var stars = S('g', { opacity: 0 }, win);
        [[86, 70], [128, 98], [196, 62], [238, 112], [104, 150], [178, 132], [226, 168]].forEach(function (p) { S('circle', { cx: p[0], cy: p[1], r: 1.6, fill: INK }, stars); });
        var sun = S('circle', { cx: 150, cy: 100, r: 22, fill: '#ffd23f' }, win);
        var moon = S('path', { d: 'M214 74 a20 20 0 1 0 18 32 a16 16 0 1 1 -18 -32 z', fill: INK }, win);
        S('rect', { x: 60, y: 46, width: 200, height: 160, rx: 3, fill: 'none', stroke: '#2b3a4f', 'stroke-width': 7 }, svg);
        S('line', { x1: 160, y1: 46, x2: 160, y2: 206, stroke: '#2b3a4f', 'stroke-width': 4 }, svg);
        S('line', { x1: 60, y1: 126, x2: 260, y2: 126, stroke: '#2b3a4f', 'stroke-width': 4 }, svg);
        var lampGlow = S('circle', { cx: 470, cy: 220, r: 200, fill: glow.url, opacity: 0.4 }, svg);
        S('rect', { x: 290, y: 300, width: 470, height: 12, rx: 2, fill: '#2b3a4f' }, svg);
        // lamp: base + frosted cup shade
        S('rect', { x: 440, y: 284, width: 60, height: 16, rx: 3, fill: '#1d2735', stroke: GRID }, svg);
        var shade = S('path', { d: 'M436 158 L504 158 L528 284 L412 284 Z', fill: '#2b3442', stroke: INK, 'stroke-opacity': 0.35, 'stroke-width': 1.5 }, svg);
        S('path', { d: 'M444 170 L452 270', stroke: '#fff', 'stroke-opacity': 0.25, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
        // knob and light sensor on the base board
        S('rect', { x: 560, y: 276, width: 150, height: 24, rx: 4, fill: '#121c2b', stroke: GRID }, svg);
        S('circle', { cx: 586, cy: 270, r: 14, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        var knobLine = S('line', { x1: 586, y1: 270, x2: 586, y2: 258, stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
        S('circle', { cx: 680, cy: 270, r: 8, fill: '#d97a2b', stroke: '#f0a35e' }, svg);
        T(svg, 586, 330, 'KNOB', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        T(svg, 680, 330, 'LIGHT SENSOR', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // readouts
        T(svg, 540, 60, 'LIGHT SENSOR', LBL); var r1 = T(svg, 540, 84, '', { 'font-size': 15, fill: CY });
        T(svg, 540, 118, 'LAMP BRIGHTNESS', LBL); var r2 = T(svg, 540, 142, '', { 'font-size': 15, fill: CY });
        T(svg, 540, 176, 'COLOUR FROM THE KNOB', LBL); var r3 = T(svg, 540, 200, '', { 'font-size': 13, fill: INK });
        loop(st, function (dt, t) {
          var day = (1 + Math.cos(t * 2 * Math.PI / 14)) / 2;
          var light = Math.round(150 + 800 * day), bri = clamp(amap(light, 200, 900, 255, 10), 10, 255), knob = Math.floor((t * 85) % 1024);
          var c = wheel(knob), lit = bri / 255;
          st.room.setAttribute('fill', css(lerpC([7, 13, 23], [30, 52, 82], day)));
          sky.setAttribute('fill', css(lerpC([10, 20, 44], [111, 179, 220], day)));
          sun.setAttribute('cy', 96 + (1 - day) * 150); var nt = clamp((0.6 - day) / 0.4, 0, 1); moon.setAttribute('opacity', nt); stars.setAttribute('opacity', nt);
          glow.set(css(c)); lampGlow.setAttribute('opacity', 0.08 + 0.8 * lit);
          shade.setAttribute('fill', css(lerpC([43, 52, 66], lerpC(c, [255, 255, 255], 0.35), 0.25 + 0.75 * lit)));
          var a = -135 + 270 * knob / 1023; knobLine.setAttribute('transform', 'rotate(' + a + ' 586 270)');
          r1.textContent = light + (day > 0.5 ? ' · bright room' : ' · dark room');
          r2.textContent = Math.round(lit * 100) + '%' + (lit > 0.6 ? ' · night-light on' : '');
          r3.textContent = 'knob ' + knob + ' → R ' + c[0] + ' G ' + c[1] + ' B ' + c[2];
        });
      },
      frames: [{ cap: 'The knob sweeps through every colour. As the sun sets and the room gets dark, the light sensor notices and the lamp glows brighter; in daylight it fades right down.', draw: function () {} }] });
  }

  /* ---------- 02 analog, digital & PWM ---------- */
  steps.push({ id: 'pwm', title: 'Analog, digital & PWM', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A light switch is <b>digital</b>: on or off. A dimmer is <b>analog</b>: any level in between. Your UNO can measure analog voltages — but it can only <i>output</i> 0 V or 5 V. To dim an LED it uses a clever trick called <b>PWM</b>.</p>');
    analogXp(b);
    UI.html(b, '<h2>PWM: switching faster than your eye</h2><p><code>analogWrite(pin, value)</code> doesn’t make an in-between voltage. It switches the pin on and off about <b>490 times every second</b>. The <code>value</code> (0–255) sets what fraction of each on-off cycle the pin spends <b>on</b> — the <b>duty cycle</b>. Your eye can’t follow the flicker, so it sees the average: on 25% of the time looks like a quarter brightness. Drag the slider, then switch on slow motion to see what’s really happening.</p>');
    pwmLab(b, ctx);
    UI.callout(b, 'plain', 'Only the ~ pins', '<p>PWM needs special timer hardware inside the chip, so only pins <b>3, 5, 6, 9, 10 and 11</b> (marked <code>~</code> on the board) can do <code>analogWrite</code>. That’s why your RGB LED goes on pins 9, 10 and 11.</p>');
    UI.numq(b, ctx, { id: 'q-pwm1', q: '<code>analogWrite(9, 64);</code> — for roughly what <b>percentage</b> of each cycle is pin 9 on? (255 = 100%)', answer: 25, tol: 1.5, unit: '%', explain: '64 ÷ 255 = 0.25, so the pin is on about <b>25%</b> of the time and the LED gets about a quarter of full power.', hint: 'Divide 64 by 255, then multiply by 100.' });
    UI.mcq(b, ctx, { id: 'q-pwm2', q: 'With <code>analogWrite(10, 255)</code>, what is pin 10 doing?', options: ['Switching on and off very fast', 'Staying on (5 V) the whole time', 'Staying off (0 V)', 'Putting out 2.55 V'], answer: 1, explain: '255 means a 100% duty cycle: the pin never switches off, so it’s a steady 5 V — full brightness.', hints: { 0: 'At 255 the “on” part fills the whole cycle. Is there any “off” part left?', 3: 'Remember: the pin can only be 0 V or 5 V. PWM changes the timing, not the voltage.' } });
    UI.mcq(b, ctx, { id: 'q-pwm3', q: 'Your partner writes <code>analogWrite(8, 100);</code> but the LED on pin 8 doesn’t fade. Why?', options: ['100 is too small', 'Pin 8 has no ~, so it can’t do PWM', 'analogWrite only works on A0–A5', 'The LED needs a bigger resistor'], answer: 1, explain: 'Pin 8 isn’t a PWM pin. Move the wire to a ~ pin (3, 5, 6, 9, 10 or 11) and change the code to match.', hints: { 2: 'A0–A5 are analog <i>inputs</i>. analogWrite is about PWM outputs.' } });
  } });
  function analogXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Digital vs analog', w: 800, h: 330,
      init: function (svg, S, st) {
        bg(svg, 800, 330);
        T(svg, 50, 34, 'THE SIGNAL OVER TIME', LBL);
        var X0 = 70, XW = 400, YT = 70, YB = 250;
        S('line', { x1: X0, y1: YT, x2: X0 + XW, y2: YT, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, X0 - 8, YT + 4, '5 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        S('line', { x1: X0, y1: YB, x2: X0 + XW, y2: YB, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, X0 - 8, YB + 4, '0 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        st.mid = S('g', { opacity: 0 }, svg);
        S('line', { x1: X0, y1: (YT + YB) / 2, x2: X0 + XW, y2: (YT + YB) / 2, stroke: SIG, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, st.mid);
        T(st.mid, X0 + XW - 4, (YT + YB) / 2 - 8, '2.5 V? NOT POSSIBLE', { 'text-anchor': 'end', 'font-size': 11, fill: SIG, 'letter-spacing': '1' });
        st.trace = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
        st.dots = S('g', {}, svg);
        S('line', { x1: 500, y1: 30, x2: 500, y2: 300, stroke: GRID }, svg);
        st.ttl = T(svg, 640, 60, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '2' });
        // right-hand pictures
        st.sw = S('g', { transform: 'translate(640 160)' }, svg);
        S('rect', { x: -40, y: -60, width: 80, height: 120, rx: 8, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, st.sw);
        S('rect', { x: -14, y: -40, width: 28, height: 80, rx: 6, fill: '#0b1320', stroke: '#2b3a4f' }, st.sw);
        st.tog = S('rect', { x: -12, y: -38, width: 24, height: 36, rx: 5, fill: INK }, st.sw);
        st.dim = S('g', { transform: 'translate(640 160)' }, svg);
        S('circle', { r: 56, fill: '#121c2b', stroke: GRID, 'stroke-width': 2 }, st.dim);
        for (var k = 0; k <= 10; k++) { var a = (-135 + 27 * k) * Math.PI / 180; S('line', { x1: 64 * Math.sin(a), y1: -64 * Math.cos(a), x2: 72 * Math.sin(a), y2: -72 * Math.cos(a), stroke: MUT, 'stroke-width': 2 }, st.dim); }
        st.dimK = S('g', {}, st.dim); S('circle', { r: 38, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, st.dimK); S('line', { x1: 0, y1: -6, x2: 0, y2: -32, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, st.dimK);
        st.read = S('g', { transform: 'translate(640 160)' }, svg);
        S('rect', { x: -110, y: -40, width: 220, height: 80, rx: 6, fill: '#050a12', stroke: GRID, 'stroke-width': 2 }, st.read);
        st.readN = T(st.read, 0, 8, '', { 'text-anchor': 'middle', 'font-size': 32, fill: CY, 'font-weight': 600 });
        st.readV = T(st.read, 0, 64, '', { 'text-anchor': 'middle', 'font-size': 13, fill: MUT });
        T(st.read, 0, -52, 'analogRead(A0) =', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
        st.pin = S('g', { transform: 'translate(640 160)' }, svg);
        S('rect', { x: -60, y: -40, width: 120, height: 80, rx: 6, fill: '#15497a', stroke: '#2e6aa3', 'stroke-width': 2 }, st.pin);
        T(st.pin, 0, -6, 'PIN 9', { 'text-anchor': 'middle', 'font-size': 16, fill: INK });
        st.pinV = T(st.pin, 0, 20, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY });
        st.cap2 = P(svg, 640, 270, '', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 });
        var N = 134, dig = 1, cnt = 0, acc = 0; st.hist = [];
        st.mode = 'digital';
        loop(st, function (dt, t) {
          acc += dt; if (acc < 1 / 40) return; acc = 0;
          var m = st.mode, v;
          if (m === 'digital' || m === 'write') { if (--cnt <= 0) { dig = 1 - dig; cnt = 10 + Math.floor(Math.random() * 30); } v = dig; }
          else v = 0.5 + 0.3 * Math.sin(t * 1.3) + 0.15 * Math.sin(t * 3.7 + 1);
          var hist = st.hist; hist.push(v); if (hist.length > N) hist.shift();
          st.trace.setAttribute('points', hist.map(function (h, i) { var x = X0 + (N - hist.length + i) * XW / (N - 1), y = YB - h * (YB - YT), pv = hist[i - 1]; return (m === 'digital' || m === 'write') && pv !== undefined && pv !== h ? x + ',' + (YB - pv * (YB - YT)) + ' ' + x + ',' + y : x + ',' + y; }).join(' '));
          st.tog.setAttribute('y', v > 0.5 ? -38 : 2); st.tog.setAttribute('fill', v > 0.5 ? CY : '#4b5563');
          st.dimK.setAttribute('transform', 'rotate(' + (-135 + 270 * v) + ')');
          var rd = Math.round(v * 1023); st.readN.textContent = rd; st.readV.textContent = '= ' + (rd * 5 / 1023).toFixed(2) + ' V';
          st.pinV.textContent = v > 0.5 ? 'HIGH · 5 V' : 'LOW · 0 V';
          while (st.dots.firstChild) st.dots.removeChild(st.dots.firstChild);
          if (m === 'read') for (var i = hist.length - 1; i >= 0; i -= 16) { var x = X0 + (N - hist.length + i) * XW / (N - 1), y = YB - hist[i] * (YB - YT); S('circle', { cx: x, cy: y, r: 4, fill: INK }, st.dots); }
        });
        st.set = function (m, title, sub) {
          if (st.mode !== m) st.hist.length = 0; st.mode = m; st.ttl.textContent = title; st.cap2.textContent = sub;
          st.sw.setAttribute('opacity', m === 'digital' ? 1 : 0); st.dim.setAttribute('opacity', m === 'analog' ? 1 : 0);
          st.read.setAttribute('opacity', m === 'read' ? 1 : 0); st.pin.setAttribute('opacity', m === 'write' ? 1 : 0); st.mid.setAttribute('opacity', m === 'write' ? 1 : 0);
        };
      },
      frames: [
        { cap: '<b>Digital = two levels.</b> A digital signal is either HIGH (5 V) or LOW (0 V), nothing in between — like a light switch. Your button in Mission 01 was digital: pressed or not pressed.', draw: function (svg, S, st) { st.set('digital', 'DIGITAL', 'on or off'); } },
        { cap: '<b>Analog = any level.</b> Most of the real world is analog: how bright the room is, how far a knob is turned, how loud a sound is. These change smoothly through every value in between.', draw: function (svg, S, st) { st.set('analog', 'ANALOG', 'any level in between'); } },
        { cap: '<b>The UNO can read analog.</b> Pins A0–A5 measure a voltage from 0 to 5 V and turn it into a whole number from <b>0 to 1023</b> with <code>analogRead()</code>. That’s 1024 steps, each about 0.005 V (5 mV). To turn a reading back into volts: <b>V = 5 × reading ÷ 1023</b>.', draw: function (svg, S, st) { st.set('read', 'ANALOG INPUT', 'it takes a sample, many times a second'); } },
        { cap: '<b>…but it can’t write analog.</b> Every output pin is digital: 0 V or 5 V. There’s no way to set a pin to 2.5 V. So how do you dim an LED? You switch it on and off so fast that it <i>looks</i> half bright. That’s PWM — try it in the lab below.', draw: function (svg, S, st) { st.set('write', 'DIGITAL OUTPUT ONLY', '0 V or 5 V, nothing else'); } }
      ] });
  }
  function pwmLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The PWM lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 280', role: 'img', 'aria-label': 'A PWM signal on an oscilloscope and the LED it drives' }); stage.appendChild(svg);
    bg(svg, 800, 280);
    var X0 = 60, XW = 470, YH = 76, YL = 206, val = 64, slow = false, off = 0;
    T(svg, X0, 32, 'PIN 11 · OSCILLOSCOPE', LBL);
    for (var gx = X0; gx <= X0 + XW; gx += 47) S('line', { x1: gx, y1: 56, x2: gx, y2: 226, stroke: GRID, opacity: 0.6 }, svg);
    S('line', { x1: X0, y1: YH, x2: X0 + XW, y2: YH, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, X0 - 8, YH + 4, '5 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
    S('line', { x1: X0, y1: YL, x2: X0 + XW, y2: YL, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, X0 - 8, YL + 4, '0 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
    var clip = clipRect(svg, X0, 50, XW, 180);
    var area = S('path', { fill: CY, opacity: 0.12, 'clip-path': clip }, svg);
    var trace = S('path', { fill: 'none', stroke: CY, 'stroke-width': 3, 'stroke-linejoin': 'round', 'clip-path': clip }, svg);
    var avgL = S('line', { x1: X0, x2: X0 + XW, stroke: INK, 'stroke-width': 1.5, 'stroke-dasharray': '8 6' }, svg);
    var avgBg = S('rect', { x: X0 + 2, y: 0, width: 132, height: 17, rx: 3, fill: NAVY, opacity: 0.85 }, svg);
    var avgT = T(svg, X0 + 8, 0, '', { 'font-size': 11, fill: INK });
    S('line', { x1: X0 + XW, y1: 50, x2: X0 + XW, y2: 232, stroke: MUT, 'stroke-width': 1 }, svg);
    T(svg, X0 + XW, 248, 'NOW', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
    var speedT = T(svg, X0, 268, '', { 'font-size': 11, fill: MUT });
    var g = grad(svg, '#ff4d4d');
    var glow = S('circle', { cx: 670, cy: 130, r: 95, fill: g.url, opacity: 0 }, svg);
    var dome = S('path', { d: 'M640 168 v-46 a30 30 0 0 1 60 0 v46 z', fill: '#7a1d1d', stroke: '#ff4d4d', 'stroke-width': 2 }, svg);
    S('rect', { x: 632, y: 166, width: 76, height: 9, rx: 2, fill: '#7a1d1d' }, svg);
    S('line', { x1: 656, y1: 175, x2: 656, y2: 218, stroke: '#b8c2cc', 'stroke-width': 3 }, svg); S('line', { x1: 684, y1: 175, x2: 684, y2: 210, stroke: '#b8c2cc', 'stroke-width': 3 }, svg);
    var pinT = T(svg, 670, 250, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '1' });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>analogWrite(11, …)</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 255; r.value = val; r.setAttribute('aria-label', 'analogWrite value');
    var out = el('b', '', String(val)); out.style.minWidth = '40px';
    var sm = el('button', 'btn btn-small', 'Slow motion: off'); sm.type = 'button';
    row.appendChild(r); row.appendChild(out); row.appendChild(sm); box.appendChild(row);
    var pills = el('div', 'slider-row'); pills.innerHTML = '<label>Try</label>'; var pr = el('div', 'res-pills'); pills.appendChild(pr); box.appendChild(pills);
    [0, 32, 64, 128, 191, 255].forEach(function (v) { var bt = el('button', '', String(v)); bt.type = 'button'; bt.addEventListener('click', function () { r.value = v; upd(); }); pr.appendChild(bt); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    r.addEventListener('input', upd);
    sm.addEventListener('click', function () { slow = !slow; sm.textContent = 'Slow motion: ' + (slow ? 'on' : 'off'); sm.classList.toggle('btn-primary', slow); ctx.check('pwm-slow', 1); upd(); });
    function upd() {
      val = Number(r.value); out.textContent = val; var d = val / 255;
      var ay = YL - d * (YL - YH); avgL.setAttribute('y1', ay); avgL.setAttribute('y2', ay); avgT.setAttribute('y', ay - 6); avgBg.setAttribute('y', ay - 19); avgT.textContent = 'average ' + (5 * d).toFixed(2) + ' V';
      speedT.textContent = slow ? 'SLOWED DOWN ABOUT 500 TIMES: YOU CAN SEE EVERY BLINK' : 'REAL SPEED: 490 CYCLES EVERY SECOND (SHOWN SLOWER HERE)';
      ro.innerHTML = '<div><span class="label">Duty cycle</span><b>' + Math.round(d * 100) + '%</b></div><div><span class="label">On-time per cycle</span><b>' + (2.04 * d).toFixed(2) + ' ms</b><span class="small muted">of every 2.04 ms</span></div>' +
        '<div><span class="label">Average voltage</span><b>' + (5 * d).toFixed(2) + ' V</b></div><div><span class="label">Your eye sees</span><b>' + (slow ? 'blinking' : d === 0 ? 'off' : d === 1 ? 'full' : Math.round(d * 100) + '% bright') + '</b></div>';
      ctx.check('pwm-lab', Object.assign(ctx.check('pwm-lab') || {}, (function () { var o = {}; o[val] = 1; return o; })()));
    }
    upd();
    var st = {}; loop(st, function (dt) {
      var Pd = slow ? 235 : 47, d = val / 255;
      off += (slow ? 235 : 380) * dt;
      var o = off % Pd, pts = [], ap = [];
      if (d <= 0) { pts = ['M' + (X0 - 2) + ' ' + YL, 'L' + (X0 + XW + 2) + ' ' + YL]; }
      else if (d >= 1) { pts = ['M' + (X0 - 2) + ' ' + YH, 'L' + (X0 + XW + 2) + ' ' + YH]; ap = ['M' + X0 + ' ' + YL, 'L' + X0 + ' ' + YH, 'L' + (X0 + XW) + ' ' + YH, 'L' + (X0 + XW) + ' ' + YL, 'Z']; }
      else {
        pts.push('M' + (X0 - Pd) + ' ' + YL);
        for (var k = -1; k <= Math.ceil(XW / Pd) + 1; k++) { var xs = X0 - o + k * Pd, xe = xs + d * Pd; pts.push('L' + xs + ' ' + YL, 'L' + xs + ' ' + YH, 'L' + xe + ' ' + YH, 'L' + xe + ' ' + YL); ap.push('M' + xs + ' ' + YL, 'L' + xs + ' ' + YH, 'L' + xe + ' ' + YH, 'L' + xe + ' ' + YL, 'Z'); }
      }
      trace.setAttribute('d', pts.join(' ')); area.setAttribute('d', ap.join(' '));
      var phase = ((XW + o) % Pd) / Pd, on = phase < d, lvl = slow ? (on ? 1 : 0) : d;
      glow.setAttribute('opacity', 0.9 * lvl); dome.setAttribute('fill', lvl > 0.02 ? css(lerpC([122, 29, 29], [255, 77, 77], Math.min(1, lvl * 1.4))) : '#7a1d1d');
      pinT.textContent = slow ? (on ? 'PIN 11: HIGH' : 'PIN 11: LOW') : 'LED AT ' + Math.round(d * 100) + '%';
    });
    if (RL.onLeave) RL.onLeave(st.stop);
  }

  /* ---------- 03 mixing light ---------- */
  steps.push({ id: 'colour', title: 'Mixing light with an RGB LED', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Every colour on your phone screen is made of tiny red, green and blue lights. Mix them at different brightnesses and you can make almost any colour. An <b>RGB LED</b> puts those three lights in one package.</p>');
    additiveXp(b);
    UI.html(b, '<h2>Inside the RGB LED</h2>');
    anatomyXp(b);
    UI.html(b, '<h2>Mix your own</h2><p>Each slider is one <code>analogWrite</code> value. Try to make orange, pink, and a warm white like a cosy lamp. The code that would make your colour appears on the right.</p>');
    mixerLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-mix1', q: 'You run <code>setColor(255, 255, 0);</code> (red full, green full, blue off). What colour do you see?', options: ['Brown', 'Yellow', 'White', 'Green'], answer: 1, explain: 'Red light + green light = yellow. Light adds up — it isn’t like mixing paint.', hints: { 0: 'That’s what you’d get mixing red and green <i>paint</i>. Light works differently: it adds.', 2: 'White needs all three, including blue.' } });
    UI.mcq(b, ctx, { id: 'q-mix2', q: 'Which line makes <b>cyan</b> (blue-green)?', options: ['<code>setColor(0, 255, 255);</code>', '<code>setColor(255, 0, 255);</code>', '<code>setColor(255, 255, 255);</code>', '<code>setColor(0, 0, 0);</code>'], answer: 0, explain: 'Green + blue = cyan. (255, 0, 255) is magenta, all 255 is white, and all 0 is off.' });
    UI.mcq(b, ctx, { id: 'q-mix3', q: 'Why does the RGB LED need <b>three</b> 220 Ω resistors instead of one on the common leg?', options: ['It doesn’t — one is fine', 'Each colour is its own LED and needs its own current limit', 'To make it brighter', 'So the colours don’t mix'], answer: 1, explain: 'There are three separate LEDs inside. One shared resistor would let the colours fight over the same current (the red one, with the lowest voltage, would hog it). One resistor each keeps every colour safe and independent.' });
  } });
  function additiveXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Adding light: red, green and blue', w: 800, h: 330,
      init: function (svg, S, st) {
        bg(svg, 800, 330);
        var g = S('g', { style: 'isolation:isolate' }, svg);
        st.c = [['#ff0000', 'RED'], ['#00ff00', 'GREEN'], ['#0000ff', 'BLUE']].map(function (c) { return { el: S('circle', { r: 86, fill: c[0], style: 'mix-blend-mode:screen' }, g), x: 400, y: 165, o: 1, tx: 400, ty: 165, to: 1 }; });
        st.labels = S('g', {}, svg);
        st.read = T(svg, 400, 314, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '1' });
        loop(st, function (dt) { st.c.forEach(function (c) { c.x = ease(c.x, c.tx, dt, 4); c.y = ease(c.y, c.ty, dt, 4); c.o = ease(c.o, c.to, dt, 4); c.el.setAttribute('cx', c.x); c.el.setAttribute('cy', c.y); c.el.setAttribute('opacity', c.o); }); });
        st.set = function (pos, ops, read, labels) {
          st.c.forEach(function (c, i) { c.tx = pos[i][0]; c.ty = pos[i][1]; c.to = ops[i]; });
          st.read.textContent = read || '';
          while (st.labels.firstChild) st.labels.removeChild(st.labels.firstChild);
          (labels || []).forEach(function (l) { T(st.labels, l[0], l[1], l[2], { 'text-anchor': 'middle', 'font-size': 11, fill: l[3] || INK, 'letter-spacing': '1.5', stroke: l[3] ? 'none' : NAVY, 'stroke-width': 3, 'paint-order': 'stroke' }); });
        };
      },
      frames: [
        { cap: '<b>Three lights.</b> An RGB LED is really three tiny LEDs — red, green and blue — under one dome. Each one can be set from 0 (off) to 255 (full) with <code>analogWrite</code>.', draw: function (svg, S, st) { st.set([[180, 160], [400, 160], [620, 160]], [1, 1, 1], 'THREE SEPARATE LIGHTS', [[180, 270, 'RED', '#ff6b6b'], [400, 270, 'GREEN', '#4ade80'], [620, 270, 'BLUE', '#6ea8ff']]); } },
        { cap: '<b>Red + green = yellow.</b> When the lights overlap, their light <i>adds</i>. Your eye has three kinds of colour sensors (cone cells) tuned to red, green and blue. Red and green light together trigger both, and your brain reads that as yellow.', draw: function (svg, S, st) { st.set([[340, 165], [460, 165], [700, 165]], [1, 1, 0], 'R 255 · G 255 · B 0 = YELLOW', [[400, 170, 'YELLOW']]); } },
        { cap: '<b>All three = white.</b> Where all three overlap you get white. Where two overlap: red + blue = <b>magenta</b>, green + blue = <b>cyan</b>. This is <b>additive</b> colour — the opposite of paint, where mixing everything makes a muddy brown.', draw: function (svg, S, st) { st.set([[340, 130], [460, 130], [400, 225]], [1, 1, 1], 'R 255 · G 255 · B 255 = WHITE', [[400, 168, 'WHITE'], [326, 210, 'MAGENTA'], [474, 210, 'CYAN'], [400, 100, 'YELLOW']]); } },
        { cap: '<b>In-between amounts make every other colour.</b> Full red plus a little green is orange. With 256 levels for each colour, that’s 256 × 256 × 256 = about <b>16.7 million</b> possible colours — exactly what a phone or TV pixel can show.', draw: function (svg, S, st) { st.set([[400, 165], [400, 165], [400, 165]], [1, 0.4, 0], 'R 255 · G 100 · B 0 = ORANGE'); } },
        { cap: '<b>Zoom in on a screen</b> and you’ll find the same trick: every pixel is a red, green and blue light side by side, too small to see separately. Your LED lamp works the same way — and in Step 09 a lampshade will blend the three colours into one smooth glow.', draw: function (svg, S, st) { st.set([[400, 165], [400, 165], [400, 165]], [0.85, 0.35, 0.95], 'R 220 · G 90 · B 240 = LAVENDER'); } }
      ] });
  }
  function anatomyXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'An RGB LED, leg by leg', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        var g = grad(svg, '#ffffff'); st.g = g;
        st.glow = S('circle', { cx: 190, cy: 110, r: 110, fill: g.url, opacity: 0 }, svg);
        S('path', { d: 'M140 170 v-70 a50 50 0 0 1 100 0 v70 z', fill: '#d9e1ea', 'fill-opacity': 0.55, stroke: '#f4f7fb', 'stroke-width': 2 }, svg);
        S('rect', { x: 130, y: 166, width: 120, height: 10, rx: 2, fill: '#c3ccd6' }, svg);
        st.dies = [['#ff3b3b', 160], ['#3ee07a', 182], ['#4da3ff', 204]].map(function (d) { return S('rect', { x: d[1], y: 118, width: 14, height: 12, fill: d[0], opacity: 0.35 }, svg); });
        var LEGS = [[156, 262, 'R', '#ff6b6b'], [178, 296, '−', INK], [202, 266, 'G', '#4ade80'], [224, 262, 'B', '#6ea8ff']];
        st.legs = LEGS.map(function (l) { var ln = S('line', { x1: l[0], y1: 176, x2: l[0], y2: l[1], stroke: '#b8c2cc', 'stroke-width': 4 }, svg); T(svg, l[0], l[1] + 20, l[2], { 'text-anchor': 'middle', 'font-size': 14, fill: l[3], 'font-weight': 600 }); return ln; });
        st.longL = T(svg, 250, 300, '← LONGEST = COMMON −', { 'font-size': 11, fill: CY, 'letter-spacing': '1' });
        // schematic on the right
        st.sch = S('g', {}, svg);
        T(st.sch, 440, 34, 'INSIDE: THREE LEDS, ONE SHARED −', LBL);
        var XS = [[470, 'PIN 11', '#ff3b3b', '2.0 V', '13.6 mA'], [590, 'PIN 10', '#3ee07a', '3.0 V', '9.1 mA'], [710, 'PIN 9', '#4da3ff', '3.0 V', '9.1 mA']];
        st.br = XS.map(function (x) {
          var bg2 = S('g', {}, st.sch);
          T(bg2, x[0], 64, x[1], { 'text-anchor': 'middle', 'font-size': 12, fill: INK });
          S('line', { x1: x[0], y1: 72, x2: x[0], y2: 270, stroke: WIREC, 'stroke-width': 2.5 }, bg2);
          S('rect', { x: x[0] - 10, y: 84, width: 20, height: 56, fill: NAVY }, bg2);
          RL.drawResistorBody(S('g', { transform: 'translate(' + x[0] + ' 112) rotate(90)' }, bg2), 220, 50, 18);
          S('rect', { x: x[0] - 18, y: 160, width: 36, height: 50, fill: NAVY }, bg2);
          var tri = S('path', { d: 'M' + (x[0] - 15) + ' 168 h30 l-15 26 z', fill: x[2], opacity: 0.5 }, bg2);
          S('line', { x1: x[0] - 15, y1: 196, x2: x[0] + 15, y2: 196, stroke: x[2], 'stroke-width': 3 }, bg2);
          var info = T(bg2, x[0] + 10, 224, '', { 'font-size': 10, fill: MUT }), info2 = T(bg2, x[0] + 10, 238, '', { 'font-size': 10, fill: CY });
          return { tri: tri, info: info, info2: info2, x: x };
        });
        S('line', { x1: 470, y1: 270, x2: 710, y2: 270, stroke: WIREC, 'stroke-width': 2.5 }, st.sch);
        S('line', { x1: 590, y1: 270, x2: 590, y2: 290, stroke: WIREC, 'stroke-width': 2.5 }, st.sch);
        S('path', { d: 'M572 290 h36 M578 297 h24 M584 304 h12', stroke: WIREC, 'stroke-width': 2.5 }, st.sch);
        T(st.sch, 620, 296, 'GND (the longest leg)', { 'font-size': 11, fill: MUT });
        st.light = function (on) { // on = [r, g, b] 0..1
          st.dies.forEach(function (d, i) { d.setAttribute('opacity', 0.35 + 0.65 * on[i]); });
          st.br.forEach(function (bb, i) { bb.tri.setAttribute('opacity', 0.35 + 0.65 * on[i]); });
          var s = shown(on.map(function (v) { return v * 255; })); g.set(css(s.col)); st.glow.setAttribute('opacity', 0.85 * s.a);
        };
        st.info = function (on) { st.br.forEach(function (bb) { bb.info.textContent = on ? bb.x[3] : ''; bb.info2.textContent = on ? bb.x[4] : ''; }); };
        st.hl = function (i) { st.legs.forEach(function (l, k) { l.setAttribute('stroke', k === i ? CY : '#b8c2cc'); }); st.longL.setAttribute('opacity', i === 1 ? 1 : 0.25); };
      },
      frames: [
        { cap: '<b>Four legs.</b> Find the <b>longest</b> one: it’s the <b>common</b> leg that all three colours share. Our kit’s RGB LED is <b>common cathode</b>, so the common leg is − and connects to GND. Hold it with the longest leg second from the left: the legs are then <b>red, common −, green, blue</b>.', draw: function (svg, S, st) { st.light([0, 0, 0]); st.info(false); st.hl(1); } },
        { cap: '<b>Three LEDs share one −.</b> Inside the dome are three tiny LED chips. Their + sides (anodes) each have their own leg, and their − sides (cathodes) are all joined to the common leg. Each colour turns on when its pin pushes current through it to GND.', draw: function (svg, S, st) { st.light([0, 0, 0]); st.info(false); st.hl(-1); st.later(function () { st.light([1, 0, 0]); }, 600); st.later(function () { st.light([0, 1, 0]); }, 1400); st.later(function () { st.light([0, 0, 1]); }, 2200); st.later(function () { st.light([1, 1, 1]); }, 3000); } },
        { cap: '<b>Each colour gets its own 220 Ω.</b> The chips use different voltages: red about 2.0 V, green and blue about 3.0 V. With Ohm’s law, red gets (5 − 2) ÷ 220 = 13.6 mA and green and blue get (5 − 3) ÷ 220 = 9.1 mA. All safely under 20 mA.', draw: function (svg, S, st) { st.light([1, 1, 1]); st.info(true); st.hl(-1); } },
        { cap: '<b>PWM on each leg mixes the colour.</b> Pins 11, 10 and 9 each send their own PWM signal, so each chip has its own brightness. Here: red 100%, green 20%, blue 60% — a hot pink.', draw: function (svg, S, st) { st.light([1, 0.2, 0.6]); st.info(false); st.hl(-1); } }
      ] });
  }
  function mixerLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The colour mixer</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 270', role: 'img', 'aria-label': 'A virtual RGB LED and the code that sets its colour' }); stage.appendChild(svg);
    bg(svg, 800, 270);
    var g = grad(svg), c = [255, 100, 0];
    var glow = S('circle', { cx: 190, cy: 120, r: 130, fill: g.url, opacity: 0 }, svg);
    var dome = S('path', { d: 'M150 180 v-70 a40 40 0 0 1 80 0 v70 z', fill: '#d9e1ea', 'fill-opacity': 0.8, stroke: '#f4f7fb', 'stroke-width': 2 }, svg);
    S('rect', { x: 140, y: 176, width: 100, height: 10, rx: 2, fill: '#c3ccd6' }, svg);
    var dies = ['#ff3b3b', '#3ee07a', '#4da3ff'].map(function (col, i) { return S('rect', { x: 166 + i * 18, y: 132, width: 12, height: 10, fill: col }, svg); });
    [[168, 236], [180, 252], [200, 240], [212, 236]].forEach(function (l) { S('line', { x1: l[0], y1: 186, x2: l[0], y2: l[1], stroke: '#b8c2cc', 'stroke-width': 3 }, svg); });
    T(svg, 380, 46, 'THE CODE', LBL);
    var big = T(svg, 380, 84, '', { 'font-size': 20, fill: CY });
    var lines = ['RED_PIN, ', 'GREEN_PIN, ', 'BLUE_PIN, '].map(function (p, i) { return T(svg, 380, 130 + i * 26, '', { 'font-size': 14, fill: INK }); });
    T(svg, 380, 222, 'COLOUR CODE', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
    var hex = T(svg, 380, 246, '', { 'font-size': 16, fill: INK });
    var sw = S('rect', { x: 500, y: 228, width: 60, height: 24, rx: 3, stroke: GRID }, svg);
    var sl = [['Red · pin 11', '#ff4d4d'], ['Green · pin 10', '#3ee07a'], ['Blue · pin 9', '#4da3ff']].map(function (s, i) { return slider(box, s[0], 0, 255, c[i], function (v) { c[i] = v; upd(); }, '', s[1]); });
    var pills = el('div', 'slider-row'); pills.innerHTML = '<label>Presets</label>'; var pr = el('div', 'res-pills'); pills.appendChild(pr); box.appendChild(pills);
    [['Red', [255, 0, 0]], ['Orange', [255, 100, 0]], ['Yellow', [255, 200, 0]], ['Green', [0, 255, 0]], ['Cyan', [0, 255, 255]], ['Blue', [0, 0, 255]], ['Purple', [150, 0, 255]], ['Pink', [255, 40, 120]], ['Warm white', [255, 150, 60]], ['White', [255, 255, 255]], ['Off', [0, 0, 0]]].forEach(function (p) {
      var bt = el('button', '', esc(p[0])); bt.type = 'button'; bt.addEventListener('click', function () { p[1].forEach(function (v, i) { sl[i].set(v); }); }); pr.appendChild(bt);
    });
    b.appendChild(box);
    UI.html(b, '<p class="small muted">On the real LED the green chip looks brighter than the red one, so you may need less green than you expect (yellow often looks best around 255, 120, 0). Engineers call that <b>calibrating</b>: you adjust the numbers until it looks right to a real eye.</p>');
    var used = {};
    function upd() {
      var s = shown(c); g.set(css(s.col)); glow.setAttribute('opacity', 0.9 * s.a);
      dome.setAttribute('fill', s.a ? css(lerpC([217, 225, 234], s.col, 0.5 + 0.5 * s.a)) : '#d9e1ea');
      dies.forEach(function (d, i) { d.setAttribute('opacity', 0.25 + 0.75 * c[i] / 255); });
      big.textContent = 'setColor(' + c.join(', ') + ');';
      lines.forEach(function (t, i) { t.textContent = 'analogWrite(' + ['RED_PIN, ', 'GREEN_PIN, ', 'BLUE_PIN, '][i] + c[i] + ');'; });
      hex.textContent = '#' + c.map(function (v) { return ('0' + v.toString(16).toUpperCase()).slice(-2); }).join('');
      sw.setAttribute('fill', css(c));
      used[c.join(',')] = 1; if (Object.keys(used).length > 3) ctx.check('mixer', 1);
    }
    upd();
  }

  /* ---------- 04 build & code: the colour mixer ---------- */
  steps.push({ id: 'mixer', title: 'Build & code: colour mixer', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Wire the RGB LED to three PWM pins, then write code that mixes colours and fades between them.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable while you wire. Keep the 5V and GND wires from Mission 01 and take everything else off the breadboard.</p>');
    var G = null;
    G = B.guide(b, { title: 'RGB LED circuit', parts: ALL, base: [], onStep: function (i) {
      var p = G && G.board.parts.rgb; if (p && p._setRGB) { if (i === 5) p._setRGB(0.75, 0.15, 1); else p._setRGB(0, 0, 0); }
    }, steps: [
      { title: 'Power the rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p>Same as Mission 01: a <b>red</b> wire from <b>5V</b> to the left <b>+</b> rail, a <b>black</b> wire from <b>GND</b> (beside pin 13) to the <b>−</b> rail, and the two bridges at the bottom so both sides have power.</p>' },
      { title: 'Place the RGB LED', add: ['rgb'], html: '<p>Find the <b>longest leg</b>: that’s the common − leg. Push the four legs into column <b>g</b>, rows 5–8, in this order: <b>red g5</b>, <b>longest leg g6</b>, <b>green g7</b>, <b>blue g8</b>.</p><p class="small muted">Gently spread the legs so each one goes into its own row.</p>' },
      { title: 'Ground the common leg', add: ['w_c'], html: '<p>A short <b>black</b> jumper from <b>j6</b> to the right <b>−</b> rail. Row 6 now connects the common leg to GND.</p>' },
      { title: 'One resistor per colour', add: ['r_r', 'r_g', 'r_b'], html: '<p>Three <b>220 Ω</b> resistors (' + RL.resistorName(220) + ') across the centre gap: <b>e5–f5</b> (red), <b>e7–f7</b> (green) and <b>e8–f8</b> (blue). Row 6 gets no resistor: it’s the common leg.</p>' },
      { title: 'Wire the colours to ~ pins', add: ['w_r', 'w_g', 'w_b'], html: '<p>Three wires from the UNO: <b>pin 11 → a5</b> (red), <b>pin 10 → a7</b> (green), <b>pin 9 → a8</b> (blue). All three are PWM pins, so each colour can fade.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Trace each colour: pin → column a → resistor across the gap → LED leg in column g → through the LED → common leg (g6) → j6 → − rail → GND. Nothing lights yet: the LED waits for your code.</p>' }
    ] });
    UI.html(b, '<h2>Read the code</h2><p>This sketch introduces something new: your own <b>function</b>. <code>setColor()</code> bundles three <code>analogWrite</code> lines into one, so mixing a colour takes a single line.</p>');
    RL.Code.walk(b, MIX, [
      { lines: [ln(MIX, 'RED_PIN = 11'), ln(MIX, 'BLUE_PIN = 9')], title: 'Three PWM pins', html: '<p>One name per colour, matching your wiring. All three are ~ pins.</p>' },
      { lines: [ln(MIX, 'void setup'), ln(MIX, 'pinMode(BLUE_PIN') + 1], title: 'Outputs', html: '<p>Each colour pin is an <code>OUTPUT</code>, like your LEDs in Mission 01.</p>' },
      { lines: [ln(MIX, 'void setColor'), ln(MIX, 'void setColor') + 4], title: 'Your own function', html: '<p><code>void setColor(int r, int g, int b)</code> creates a new instruction called <code>setColor</code>. The three <b>parameters</b> <code>r</code>, <code>g</code> and <code>b</code> are numbers you pass in when you use it.</p><p>Inside, each one goes to <code>analogWrite</code>: a number from <b>0 (off) to 255 (full)</b> that sets the PWM duty cycle for that colour.</p>' },
      { lines: [ln(MIX, 'setColor(255, 0, 0)'), ln(MIX, 'setColor(255, 160, 0)') + 1], title: 'Using it', html: '<p><code>setColor(255, 0, 0);</code> runs the function with r = 255, g = 0, b = 0: pure red. Each colour stays on for a second. The orange line mixes full red with a bit of green.</p>' },
      { lines: [ln(MIX, 'YOUR TURN'), ln(MIX, 'YOUR TURN')], title: 'Your turn: purple', html: '<p>In the Virtual UNO below, add two lines here that show <b>purple</b> for 1 second. Purple is red + blue, with no green.</p>' },
      { lines: [ln(MIX, 'for (int i'), ln(MIX, 'for (int i') + 3], title: 'A smooth fade', html: '<p>The <code>for</code> loop counts <code>i</code> from 0 up to 255. Red is <code>255 - i</code> (going down) and green is <code>i</code> (going up), so the colour slides from red through orange and yellow to green. 256 steps × 8 ms ≈ 2 seconds.</p>' }
    ], { name: 'colour_mixer', download: false });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Add the purple lines, then press <b>Upload &amp; run</b>. <b>Check my code</b> watches one full cycle of colours.</p>');
    RL.Sim.create(b, simOpts({ title: 'Colour mixer', code: MIX, name: 'colour_mixer', key: 'sim-mix', ctx: ctx, board: { parts: ALL, show: LAMP_IDS, view: [236, 40, 480, 300] }, analog: {}, runHint: 'watch the RGB LED.',
      checkAfter: 7600,
      check: function (log) {
        var ev = log.filter(function (e) { return e.dev === 'rgb'; }), seen = {};
        ev.forEach(function (e) { seen[e.v.map(function (x) { return Math.round(x * 20); }).join(',')] = 1; });
        // a colour counts only if it stays for a while (setColor's three writes pass through in-between colours)
        var purple = ev.some(function (e, i) { var nx = ev[i + 1], dur = (nx ? nx.t : log.length ? log[log.length - 1].t + 1000 : 0) - e.t; return dur > 500 && e.v[0] > 0.55 && e.v[2] > 0.55 && e.v[1] < 0.2; });
        var reds = ev.some(function (e) { return e.v[0] > 0.9 && e.v[1] < 0.1 && e.v[2] < 0.1; }), blues = ev.some(function (e) { return e.v[2] > 0.9 && e.v[0] < 0.1 && e.v[1] < 0.1; });
        var r;
        if (!ev.length) r = { pass: false, msg: 'The LED never changed. Check that setColor() calls analogWrite on RED_PIN, GREEN_PIN and BLUE_PIN.' };
        else if (!reds || !blues) r = { pass: false, msg: 'Red and blue should each show on their own. Did a pin number change?' };
        else if (!purple) r = { pass: false, msg: 'No purple yet. Add a setColor() line with red and blue on and green off, then a delay(1000).' };
        else if (Object.keys(seen).length < 12) r = { pass: false, msg: 'The red-to-green fade didn’t run. Check the for loop at the end of loop().' };
        else r = { pass: true, msg: 'Red, green, blue, orange, purple and a smooth fade. You’re mixing light.' };
        ctx.check('sim-mix-pass', r.pass ? 1 : 0); return r;
      } }));
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the purple lines</summary><p class="small">Full red, no green, full blue, then wait one second:</p>';
    RL.Code.block(hint, '  setColor(255, 0, 255);   // red + blue = purple\n  delay(1000);', { download: false });
    b.appendChild(hint);
    UI.html(b, '<h2>Upload it for real</h2><p>Copy your finished code into the Arduino IDE and upload it. Look at the LED from the side, then through a piece of paper: the paper blends the three colours (that’s what your lampshade will do).</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Nothing lights at all</b><br><span class="small muted">The common (longest) leg must be in g6 with the black jumper from j6 to the − rail. If it still won’t light, your LED may be common <i>anode</i>: tell your teacher.</span></div></div><div class="trow"><div><b>Colours are in the wrong order</b><br><span class="small muted">Two colour wires are swapped. Check pin 11 → a5, pin 10 → a7, pin 9 → a8, or turn the LED around so the longest leg is in g6.</span></div></div><div class="trow"><div><b>One colour is missing</b><br><span class="small muted">Its resistor isn’t across the gap in the same row as the leg, or a leg is loose. Push everything in firmly.</span></div></div><div class="trow"><div><b>It blinks instead of fading</b><br><span class="small muted">A colour wire is on a pin without ~. Use 9, 10 and 11.</span></div></div></div>');
  } });

  /* ---------- 05 sensors ---------- */
  steps.push({ id: 'sensors', title: 'Knobs, light & voltage dividers', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your lamp needs two inputs: a <b>knob</b> to pick the colour and a <b>light sensor</b> to notice the dark. Both work the same way: they split 5 volts into a smaller voltage that the UNO can measure with <code>analogRead()</code>.</p>');
    potXp(b);
    UI.html(b, '<h2>The photoresistor</h2>');
    ldrXp(b);
    UI.html(b, '<h2>The voltage divider lab</h2><p>Both of your sensors are <b>voltage dividers</b>: two resistances in a row between 5V and GND, with the analog pin connected in the middle. The bigger the bottom resistance is compared with the top one, the higher the voltage in the middle. Switch between the two sensors and move the slider.</p>');
    dividerLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-div1', q: '<code>analogRead(A0)</code> gives <b>512</b>. What voltage is on A0? Use <code>V = 5 × reading ÷ 1023</code>.', answer: 2.5, tol: 0.03, unit: 'V', explain: '5 × 512 ÷ 1023 = <b>2.50 V</b>: the knob is turned halfway.', hint: 'Multiply 5 by 512, then divide by 1023.' });
    UI.mcq(b, ctx, { id: 'q-div2', q: 'Someone turns off the classroom lights. What happens to the light-sensor reading on A1?', options: ['It goes up: the photoresistor’s resistance drops', 'It goes down: the photoresistor’s resistance rises, so less voltage reaches A1', 'It stays the same: resistors don’t care about light', 'It jumps to exactly 0'], answer: 1, explain: 'In the dark the photoresistor’s resistance climbs (towards 50 kΩ). It takes a bigger share of the 5 V, so the middle of the divider (A1) drops and the reading goes down.', hints: { 0: 'Less light means fewer free electrons in the photoresistor. Does that make resistance go up or down?', 3: 'Even in the dark there’s still a little voltage: the 10 kΩ keeps some share.' } });
  } });
  function potXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'A potentiometer is a voltage divider', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        var cx = 170, cy = 180, R = 90;
        T(svg, 40, 34, 'INSIDE THE KNOB (TOP VIEW)', LBL);
        function pt(a, r) { a = a * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
        var a0 = pt(-135, R), a1 = pt(135, R);
        st.track = S('path', { d: 'M' + a0 + ' A' + R + ' ' + R + ' 0 1 1 ' + a1, fill: 'none', stroke: '#5b4a3a', 'stroke-width': 16, 'stroke-linecap': 'round' }, svg);
        st.trackHi = S('path', { d: 'M' + a0 + ' A' + R + ' ' + R + ' 0 1 1 ' + a1, fill: 'none', stroke: CY, 'stroke-width': 3, opacity: 0 }, svg);
        T(svg, a0[0] - 6, a0[1] + 30, 'GND', { 'text-anchor': 'middle', 'font-size': 12, fill: '#6c8ee0' });
        T(svg, a1[0] + 6, a1[1] + 30, '5V', { 'text-anchor': 'middle', 'font-size': 12, fill: '#e5484d' });
        st.arm = S('g', {}, svg);
        S('line', { x1: cx, y1: cy, x2: cx, y2: cy - R, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, st.arm);
        S('circle', { cx: cx, cy: cy - R, r: 7, fill: CY }, st.arm);
        S('circle', { cx: cx, cy: cy, r: 22, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        T(svg, cx, cy + R + 52, 'WIPER = MIDDLE LEG', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // straight-line version
        var X = 410, YT = 70, YB = 290;
        T(svg, X, 34, 'THE SAME THING, STRAIGHT', LBL);
        T(svg, X, YT - 10, '5V', { 'text-anchor': 'middle', 'font-size': 12, fill: '#e5484d' });
        S('rect', { x: X - 9, y: YT, width: 18, height: YB - YT, rx: 3, fill: '#5b4a3a' }, svg);
        T(svg, X, YB + 22, 'GND', { 'text-anchor': 'middle', 'font-size': 12, fill: '#6c8ee0' });
        st.top = T(svg, X - 20, 0, '', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
        st.bot = T(svg, X - 20, 0, '', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
        st.wip = S('g', {}, svg);
        S('path', { d: 'M' + (X + 12) + ' 0 l14 -8 v16 z', fill: CY }, st.wip);
        S('line', { x1: X + 26, y1: 0, x2: 560, y2: 0, stroke: CY, 'stroke-width': 2.5 }, st.wip);
        S('rect', { x: 560, y: -16, width: 50, height: 32, rx: 4, fill: '#15497a', stroke: '#2e6aa3' }, st.wip);
        T(st.wip, 585, 5, 'A0', { 'text-anchor': 'middle', 'font-size': 13 });
        // meter
        T(svg, 640, 60, 'VOLTAGE ON A0', LBL);
        S('rect', { x: 640, y: 74, width: 130, height: 16, rx: 3, fill: '#121c2b', stroke: GRID }, svg);
        st.bar = S('rect', { x: 641, y: 75, width: 0, height: 14, rx: 2, fill: CY }, svg);
        st.v = T(svg, 640, 122, '', { 'font-size': 22, fill: CY, 'font-weight': 600 });
        T(svg, 640, 170, 'analogRead(A0)', LBL);
        st.n = T(svg, 640, 204, '', { 'font-size': 30, fill: INK, 'font-weight': 600 });
        st.f = 0.5; st.tf = 0.5; st.sweep = false;
        loop(st, function (dt, t) {
          if (st.sweep) st.tf = 0.5 - 0.5 * Math.cos(t * 0.9);
          st.f = ease(st.f, st.tf, dt, 4);
          var f = st.f, ang = -135 + 270 * f;
          st.arm.setAttribute('transform', 'rotate(' + ang + ' ' + cx + ' ' + cy + ')');
          var y = YB - f * (YB - YT); st.wip.setAttribute('transform', 'translate(0 ' + y + ')');
          st.top.setAttribute('y', (YT + y) / 2 + 4); st.top.textContent = ((1 - f) * 10).toFixed(1) + ' kΩ';
          st.bot.setAttribute('y', (y + YB) / 2 + 4); st.bot.textContent = (f * 10).toFixed(1) + ' kΩ';
          var rd = Math.round(f * 1023); st.bar.setAttribute('width', 128 * f); st.v.textContent = (5 * f).toFixed(2) + ' V'; st.n.textContent = rd;
        });
      },
      frames: [
        { cap: '<b>Inside the knob</b> is a curved strip of carbon: a 10 kΩ resistor. The two outer legs connect to its ends, which you wire to <b>5V</b> and <b>GND</b>. The <b>middle leg</b> is the <b>wiper</b>, a metal finger that slides along the strip as you turn the knob.', draw: function (svg, S, st) { st.sweep = false; st.tf = 0.5; st.trackHi.setAttribute('opacity', 1); } },
        { cap: '<b>Wiper at the GND end:</b> there’s no resistance between the wiper and GND, so the wiper sits at <b>0 V</b>. <code>analogRead</code> gives <b>0</b>.', draw: function (svg, S, st) { st.sweep = false; st.tf = 0; st.trackHi.setAttribute('opacity', 0); } },
        { cap: '<b>Halfway:</b> 5 kΩ above the wiper and 5 kΩ below it. The 5 volts split evenly, so the wiper is at <b>2.5 V</b>. That reads about <b>512</b>. This is a <b>voltage divider</b>: the voltage in the middle depends on how the resistance is shared.', draw: function (svg, S, st) { st.sweep = false; st.tf = 0.5; } },
        { cap: '<b>Wiper at the 5V end:</b> the wiper sits at the full <b>5 V</b>, and the reading is <b>1023</b>, the biggest number <code>analogRead</code> can give.', draw: function (svg, S, st) { st.sweep = false; st.tf = 1; } },
        { cap: '<b>Every position in between</b> gives its own voltage and its own reading. To go from a reading back to volts: <b>V = 5 × reading ÷ 1023</b>. Your code will turn these numbers into colours.', draw: function (svg, S, st) { st.sweep = true; } }
      ] });
  }
  function rLdr(level) { return 50000 * Math.pow(0.01, level); } // level 0 = dark (50 kΩ) … 1 = bright (500 Ω)
  function fmtR(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' kΩ' : Math.round(v) + ' Ω'; }
  function ldrXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'How a photoresistor senses light', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        T(svg, 40, 34, 'THE PHOTORESISTOR', LBL);
        var g = grad(svg, '#ffe9a8');
        st.glow = S('circle', { cx: 90, cy: 120, r: 90, fill: g.url, opacity: 0.5 }, svg);
        S('path', { d: 'M74 150 h32 v14 h-32 z', fill: '#6b7785' }, svg);
        st.bulb = S('circle', { cx: 90, cy: 120, r: 26, fill: '#ffe9a8', stroke: '#f4f7fb', 'stroke-width': 2 }, svg);
        st.rays = S('g', {}, svg);
        [-30, -10, 10, 30].forEach(function (a) { var r0 = a * Math.PI / 180; S('line', { x1: 130, y1: 120 + 60 * Math.sin(r0), x2: 200, y2: 140 + 110 * Math.sin(r0) * 0.6, stroke: '#ffe9a8', 'stroke-width': 3, 'stroke-dasharray': '8 8', 'class': 'm02ray' }, st.rays); });
        // LDR face
        var lx = 280, ly = 170;
        S('circle', { cx: lx, cy: ly, r: 64, fill: '#d97a2b', stroke: '#f0a35e', 'stroke-width': 3 }, svg);
        S('path', { d: 'M232 130 h96 v16 h-96 v16 h96 v16 h-96 v16 h96 v16 h-96', stroke: '#7a3b0c', 'stroke-width': 7, fill: 'none', 'stroke-linejoin': 'round' }, svg);
        st.e = S('g', {}, svg);
        st.edots = []; for (var i = 0; i < 40; i++) st.edots.push({ el: S('circle', { r: 3, fill: CY, opacity: 0 }, st.e), x: lx - 48 + Math.random() * 96, y: 130 + Math.floor(Math.random() * 5) * 16 + 8, v: (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30) });
        T(svg, lx, ly + 90, 'FREE ELECTRONS', { 'text-anchor': 'middle', 'font-size': 10, fill: CY, 'letter-spacing': '1.5' });
        st.rT = T(svg, lx, 70, '', { 'text-anchor': 'middle', 'font-size': 18, fill: INK, 'font-weight': 600 });
        // divider
        var X = 520;
        T(svg, 460, 34, 'IN A VOLTAGE DIVIDER', LBL);
        T(svg, X, 66, '5V', { 'text-anchor': 'middle', 'font-size': 12, fill: '#e5484d' });
        S('line', { x1: X, y1: 72, x2: X, y2: 290, stroke: WIREC, 'stroke-width': 2.5 }, svg);
        S('rect', { x: X - 16, y: 88, width: 32, height: 50, fill: NAVY }, svg);
        S('circle', { cx: X, cy: 113, r: 15, fill: '#d97a2b', stroke: '#f0a35e', 'stroke-width': 1.5 }, svg);
        S('path', { d: 'M' + (X - 8) + ' 107 h16 v4 h-16 v4 h16 v4 h-16', stroke: '#7a3b0c', 'stroke-width': 1.5, fill: 'none' }, svg);
        st.rTop = T(svg, X - 26, 118, '', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
        S('rect', { x: X - 10, y: 200, width: 20, height: 60, fill: NAVY }, svg);
        RL.drawResistorBody(S('g', { transform: 'translate(' + X + ' 230) rotate(90)' }, svg), 10000, 52, 18);
        T(svg, X - 22, 234, '10 kΩ', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
        S('path', { d: 'M' + (X - 18) + ' 290 h36 M' + (X - 12) + ' 297 h24 M' + (X - 6) + ' 304 h12', stroke: WIREC, 'stroke-width': 2.5 }, svg);
        S('circle', { cx: X, cy: 170, r: 5, fill: CY }, svg);
        S('line', { x1: X, y1: 170, x2: 600, y2: 170, stroke: CY, 'stroke-width': 2.5 }, svg);
        S('rect', { x: 600, y: 154, width: 46, height: 32, rx: 4, fill: '#15497a', stroke: '#2e6aa3' }, svg); T(svg, 623, 175, 'A1', { 'text-anchor': 'middle', 'font-size': 13 });
        st.vT = T(svg, 660, 168, '', { 'font-size': 18, fill: CY, 'font-weight': 600 });
        st.nT = T(svg, 660, 192, '', { 'font-size': 12, fill: MUT });
        st.lv = 0.5; st.tl = 0.5;
        loop(st, function (dt) {
          st.lv = ease(st.lv, st.tl, dt, 3); var lv = st.lv, R = rLdr(lv), V = 5 * 10000 / (10000 + R), n = Math.round(V / 5 * 1023);
          st.glow.setAttribute('opacity', 0.1 + 0.8 * lv); st.bulb.setAttribute('fill', css(lerpC([58, 64, 72], [255, 233, 168], lv))); st.rays.setAttribute('opacity', lv);
          var nOn = Math.round(4 + 36 * lv);
          st.edots.forEach(function (d, i) { d.x += d.v * dt; if (d.x < 236) d.v = Math.abs(d.v); if (d.x > 324) d.v = -Math.abs(d.v); d.el.setAttribute('cx', d.x); d.el.setAttribute('cy', d.y); d.el.setAttribute('opacity', i < nOn ? 1 : 0); });
          st.rT.textContent = fmtR(R); st.rTop.textContent = fmtR(R);
          st.vT.textContent = V.toFixed(2) + ' V'; st.nT.textContent = 'analogRead → ' + n;
        });
      },
      frames: [
        { cap: '<b>A resistor that reacts to light.</b> The squiggly track is cadmium sulfide, a material that holds on to its electrons tightly in the dark. When light hits it, the light’s energy knocks electrons free, and free electrons can carry current. <b>More light → more free electrons → less resistance.</b>', draw: function (svg, S, st) { st.tl = 0.5; } },
        { cap: '<b>In the dark</b> (your hand over it) very few electrons are free, and the resistance climbs to about <b>50 kΩ</b>.', draw: function (svg, S, st) { st.tl = 0; } },
        { cap: '<b>In normal room light</b> it’s around <b>5 kΩ</b>: ten times less.', draw: function (svg, S, st) { st.tl = 0.5; } },
        { cap: '<b>In bright light</b> (a phone flashlight) it drops to about <b>500 Ω</b>. That’s a huge range, which makes it a great sensor.', draw: function (svg, S, st) { st.tl = 1; } },
        { cap: '<b>But the UNO measures volts, not ohms.</b> So the photoresistor goes on top of a <b>10 kΩ resistor</b> to make a voltage divider, with A1 in the middle: <b>V = 5 × 10 kΩ ÷ (10 kΩ + R<sub>photo</sub>)</b>. Bright light → small R on top → more voltage at A1 → a higher reading. Watch it swing from dark to bright.', draw: function (svg, S, st) { st.tl = 0; st.later(function () { st.tl = 1; }, 1500); st.later(function () { st.tl = 0.15; }, 3500); st.later(function () { st.tl = 0.6; }, 5200); } }
      ] });
  }
  function dividerLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Voltage divider lab</h3></div>';
    var tabs = el('div', 'res-pills'); tabs.style.padding = '12px 16px 0'; box.appendChild(tabs);
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 300', role: 'img', 'aria-label': 'A voltage divider with a sensor on top and the voltage it makes' }); stage.appendChild(svg);
    bg(svg, 800, 300);
    var X = 200;
    T(svg, X, 34, '5V', { 'text-anchor': 'middle', 'font-size': 13, fill: '#e5484d' });
    S('line', { x1: X, y1: 40, x2: X, y2: 262, stroke: WIREC, 'stroke-width': 3 }, svg);
    S('path', { d: 'M' + (X - 18) + ' 262 h36 M' + (X - 12) + ' 269 h24 M' + (X - 6) + ' 276 h12', stroke: WIREC, 'stroke-width': 3 }, svg);
    var topG = S('g', {}, svg), botG = S('g', {}, svg);
    var topL = T(svg, X - 34, 96, '', { 'text-anchor': 'end', 'font-size': 13, fill: INK }), topN = T(svg, X - 34, 114, '', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
    var botL = T(svg, X - 34, 214, '', { 'text-anchor': 'end', 'font-size': 13, fill: INK }), botN = T(svg, X - 34, 232, '', { 'text-anchor': 'end', 'font-size': 11, fill: MUT });
    S('circle', { cx: X, cy: 152, r: 5, fill: CY }, svg);
    S('line', { x1: X, y1: 152, x2: 300, y2: 152, stroke: CY, 'stroke-width': 3 }, svg);
    var pinR = S('rect', { x: 300, y: 136, width: 50, height: 32, rx: 4, fill: '#15497a', stroke: '#2e6aa3' }, svg), pinT = T(svg, 325, 157, 'A1', { 'text-anchor': 'middle', 'font-size': 13 });
    // big meter
    T(svg, 420, 60, 'VOLTAGE IN THE MIDDLE', LBL);
    S('rect', { x: 420, y: 74, width: 340, height: 22, rx: 4, fill: '#121c2b', stroke: GRID }, svg);
    var bar = S('rect', { x: 421, y: 75, width: 0, height: 20, rx: 3, fill: CY }, svg);
    [0, 1, 2, 3, 4, 5].forEach(function (v) { T(svg, 420 + v * 68, 114, v + ' V', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); });
    var vT = T(svg, 420, 160, '', { 'font-size': 30, fill: CY, 'font-weight': 600 });
    T(svg, 420, 200, 'analogRead GIVES', LBL);
    var nT = T(svg, 420, 236, '', { 'font-size': 30, fill: INK, 'font-weight': 600 });
    var fT = T(svg, 420, 278, '', { 'font-size': 11, fill: MUT });
    var row = el('div', 'slider-row'), lab = el('label', '', ''), r = el('input'), out = el('b', '');
    r.type = 'range'; r.min = 0; r.max = 100; r.value = 50; r.setAttribute('aria-label', 'Sensor setting'); out.style.minWidth = '90px';
    row.appendChild(lab); row.appendChild(r); row.appendChild(out); box.appendChild(row);
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var mode = 'ldr';
    function drawParts() {
      [topG, botG].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
      S('rect', { x: X - 16, y: 66, width: 32, height: 66, fill: NAVY }, topG);
      S('rect', { x: X - 12, y: 180, width: 24, height: 66, fill: NAVY }, botG);
      if (mode === 'ldr') {
        S('circle', { cx: X, cy: 100, r: 18, fill: '#d97a2b', stroke: '#f0a35e', 'stroke-width': 2 }, topG);
        S('path', { d: 'M' + (X - 10) + ' 92 h20 v5 h-20 v5 h20 v5 h-20', stroke: '#7a3b0c', 'stroke-width': 2, fill: 'none' }, topG);
        RL.drawResistorBody(S('g', { transform: 'translate(' + X + ' 213) rotate(90)' }, botG), 10000, 56, 20);
        lab.textContent = 'Light on the sensor'; pinT.textContent = 'A1';
      } else {
        S('rect', { x: X - 9, y: 70, width: 18, height: 170, rx: 3, fill: '#5b4a3a' }, topG);
        lab.textContent = 'Knob turned'; pinT.textContent = 'A0';
      }
      tabs.querySelectorAll('button').forEach(function (t) { t.classList.toggle('on', t.dataset.m === mode); });
    }
    [['ldr', 'Light sensor (A1)'], ['pot', 'Knob (A0)']].forEach(function (m) { var t = el('button', '', m[1]); t.type = 'button'; t.dataset.m = m[0]; t.addEventListener('click', function () { mode = m[0]; drawParts(); upd(); ctx.check('div-' + m[0], 1); }); tabs.appendChild(t); });
    var wip = S('path', { d: '', fill: CY }, svg);
    function upd() {
      var f = Number(r.value) / 100, top, bot;
      if (mode === 'ldr') { top = rLdr(f); bot = 10000; out.textContent = f < 0.15 ? 'dark' : f < 0.4 ? 'dim' : f < 0.7 ? 'room light' : 'bright'; topL.textContent = 'PHOTORESISTOR'; botL.textContent = '10 kΩ RESISTOR'; wip.setAttribute('d', ''); }
      else { bot = Math.max(1, f * 10000); top = Math.max(1, 10000 - bot); out.textContent = Math.round(f * 100) + '%'; topL.textContent = 'TRACK ABOVE WIPER'; botL.textContent = 'TRACK BELOW WIPER'; var y = 240 - f * 170; wip.setAttribute('d', 'M' + (X + 12) + ' ' + y + ' l14 -8 v16 z'); }
      topN.textContent = fmtR(top); botN.textContent = fmtR(bot);
      var V = 5 * bot / (top + bot), n = Math.round(V / 5 * 1023);
      bar.setAttribute('width', 338 * V / 5); vT.textContent = V.toFixed(2) + ' V'; nT.textContent = n;
      fT.textContent = 'V = 5 × ' + fmtR(bot) + ' ÷ (' + fmtR(top) + ' + ' + fmtR(bot) + ')';
      ro.innerHTML = '<div><span class="label">Top resistance</span><b>' + fmtR(top) + '</b></div><div><span class="label">Bottom resistance</span><b>' + fmtR(bot) + '</b></div><div><span class="label">Share of the 5 V on the bottom</span><b>' + Math.round(V / 5 * 100) + '%</b></div>';
    }
    r.addEventListener('input', function () { upd(); ctx.check('div-lab', 1); });
    drawParts(); upd();
  }

  /* ---------- 06 build: sensors & the Serial Monitor ---------- */
  steps.push({ id: 'build2', title: 'Build: sensors & the Serial Monitor', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Add the light sensor and the knob below the RGB LED. Each one is a voltage divider: <b>5V on top, GND on the bottom, analog pin in the middle</b>.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable first. Leave the RGB LED circuit exactly as it is.</p>');
    B.guide(b, { title: 'Light sensor and knob', parts: ALL, base: LAMP_IDS.slice(), steps: [
      { title: 'Start from the colour mixer', view: 'all', html: '<p>Your RGB LED, its three resistors and its four wires stay where they are. The new parts go in rows 11–25.</p>' },
      { title: 'Light sensor: the top half', add: ['w_l5', 'ldr'], html: '<p>A <b>red</b> jumper from the <b>+ rail to a11</b>. Then push the photoresistor’s legs into <b>c11</b> and <b>c14</b>. It works either way around.</p>' },
      { title: 'Light sensor: the bottom half', add: ['r_ldr', 'w_lg'], html: '<p>A <b>10 kΩ</b> resistor (' + RL.resistorName(10000) + ') from <b>e14 to e18</b>, and a <b>black</b> jumper from <b>a18 to the − rail</b>.</p><p>Row 14 is now the middle of the divider: photoresistor above (to 5V), 10 kΩ below (to GND).</p>' },
      { title: 'Row 14 → A1', add: ['w_a1'], html: '<p>A wire from <b>A1</b> (on the far side of the UNO) to <b>a14</b>. Run it around the bottom of the board, away from the other wires.</p>' },
      { title: 'The knob', add: ['pot', 'w_p5', 'w_pg'], html: '<p>Push the potentiometer’s three legs into <b>e21, e23 and e25</b>, with the knob over the centre gap. Add a <b>red</b> jumper from the <b>+ rail to a21</b> and a <b>black</b> jumper from <b>a25 to the − rail</b>. The two outer legs now sit at 5V and GND.</p>' },
      { title: 'Wiper → A0', add: ['w_a0'], html: '<p>A wire from <b>A0</b> to <b>a23</b>, the middle leg (the wiper). Route it around the bottom of the UNO too.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Two dividers, the same pattern: <b>red jumper on top, black jumper on the bottom, analog wire in the middle</b>. Light sensor: rows 11 / 14 / 18 → A1. Knob: rows 21 / 23 / 25 → A0.</p>' }
    ] });
    UI.html(b, '<h2>Talking to your laptop: the Serial Monitor</h2><p>How do you know what numbers your sensors are giving? You ask the UNO to <b>send them back</b> through the USB cable.</p>');
    serialXp(b);
    UI.html(b, '<h2>Read your sensors</h2>');
    RL.Code.walk(b, READ, [
      { lines: [ln(READ, 'KNOB = A0'), ln(READ, 'LIGHT = A1')], title: 'Analog pins have names', html: '<p><code>A0</code> and <code>A1</code> are the analog input pins. Giving them names makes the code read like English.</p>' },
      { lines: [ln(READ, 'Serial.begin'), ln(READ, 'Serial.begin')], title: 'Serial.begin(9600)', html: '<p>Opens the link to your computer at <b>9600 bits per second</b> (the <b>baud rate</b>). The Serial Monitor must be set to the same speed.</p><p class="small muted">Analog pins don’t need <code>pinMode</code>: they’re inputs already.</p>' },
      { lines: [ln(READ, 'int knob ='), ln(READ, 'int light =')], title: 'analogRead()', html: '<p>Each <code>analogRead</code> measures the voltage on that pin and gives back a whole number from <b>0 to 1023</b>. The answers are stored in two variables.</p>' },
      { lines: [ln(READ, 'float volts'), ln(READ, 'float volts')], title: 'A float', html: '<p>A <code>float</code> can hold decimals (an <code>int</code> can’t). Writing <code>5.0</code> instead of <code>5</code> tells the UNO to do decimal maths, so 512 becomes 2.50 V instead of 2.</p>' },
      { lines: [ln(READ, 'Serial.print("knob'), ln(READ, 'Serial.println(light)')], title: 'print vs println', html: '<p><code>Serial.print</code> sends text and stays on the same line. <code>Serial.println</code> sends text and then starts a new line. Words go in <code>"quotes"</code>; variables don’t.</p>' },
      { lines: [ln(READ, 'delay(250)'), ln(READ, 'delay(250)')], title: 'Four readings a second', html: '<p>Without a delay the numbers would scroll too fast to read.</p>' }
    ], { name: 'read_sensors' });
    UI.html(b, '<p>Run it and move the two sliders: the <b>A0 knob</b> slider turns the knob on the breadboard, and the <b>A1 light sensor</b> slider changes the light. Watch the Serial Monitor under the board.</p>');
    RL.Sim.create(b, simOpts({ title: 'Read the sensors', code: READ, name: 'read_sensors', key: 'sim-read', ctx: ctx, runHint: 'move the A0 and A1 sliders and watch the Serial Monitor.',
      checkAfter: 800,
      check: function (log, sim) {
        function last() { var ls = sim.serialText().trim().split('\n'), m = /knob:\s*(\d+).*V\)\s*light:\s*(\d+)/.exec(ls[ls.length - 1] || ''); return m ? [Number(m[1]), Number(m[2])] : null; }
        return new Promise(function (res) {
          sim.setAnalog(0, 1023); sim.setAnalog(1, 150);
          setTimeout(function () {
            var a = last(); sim.setAnalog(0, 0); sim.setAnalog(1, 900);
            setTimeout(function () {
              var z = last(), r;
              if (!a || !z) r = { pass: false, msg: 'The Serial Monitor doesn’t show lines like “knob: 512  (2.50 V)   light: 683”. Check Serial.begin(9600) and the print lines.' };
              else if (a[0] < 1000 || z[0] > 20) r = { pass: false, msg: 'The knob number didn’t follow the A0 slider. Is KNOB set to A0?' };
              else if (a[1] > 170 || z[1] < 880) r = { pass: false, msg: 'The light number didn’t follow the A1 slider. Is LIGHT set to A1?' };
              else r = { pass: true, msg: 'Knob went ' + z[0] + ' → ' + a[0] + ' and light went ' + a[1] + ' → ' + z[1] + '. Your sensors are talking.' };
              ctx.check('sim-read-pass', r.pass ? 1 : 0); sim.setAnalog(0, 300); sim.setAnalog(1, 650); res(r);
            }, 900);
          }, 900);
        });
      } }));
    UI.callout(b, '', 'On your real board', '<ol><li>Upload the sketch, then open the Serial Monitor: the <b>magnifying-glass</b> icon at the top right of the IDE, or <b>Tools → Serial Monitor</b>.</li><li>Set the speed menu to <b>9600 baud</b>.</li><li>Turn the knob from one end to the other. Then cover the light sensor with your hand, and shine a phone flashlight on it.</li></ol><p class="small">Want a graph instead? Close the monitor and open <b>Tools → Serial Plotter</b>.</p>');
    UI.note(b, ctx, { id: 'n-readings', label: 'Record your real readings. Light sensor covered with your hand: ___ . In normal room light: ___ . With a flashlight: ___ . Knob at each end: ___ and ___ .', placeholder: 'Covered: 180, room: 760, flashlight: 990. Knob: 0 and 1023.' });
  } });
  function serialXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'The Serial Monitor', w: 800, h: 320,
      init: function (svg, S, st) {
        bg(svg, 800, 320);
        S('rect', { x: 40, y: 100, width: 130, height: 150, rx: 6, fill: '#15497a', stroke: '#2e6aa3', 'stroke-width': 2 }, svg);
        S('rect', { x: 120, y: 88, width: 36, height: 30, rx: 2, fill: '#aab6c3' }, svg);
        T(svg, 105, 190, 'UNO', { 'text-anchor': 'middle', 'font-size': 18, fill: INK, 'font-weight': 600 });
        st.txl = S('circle', { cx: 70, cy: 130, r: 4, fill: '#3b4350' }, svg); T(svg, 80, 134, 'TX', { 'font-size': 9, fill: MUT });
        var cable = S('path', { d: 'M138 88 C 138 40, 300 30, 380 80 S 460 160, 500 160', fill: 'none', stroke: '#30363f', 'stroke-width': 9, 'stroke-linecap': 'round' }, svg);
        st.cable = cable;
        st.bits = S('g', {}, svg);
        S('rect', { x: 500, y: 60, width: 270, height: 190, rx: 6, fill: '#0b1320', stroke: '#3a4a5e', 'stroke-width': 2 }, svg);
        S('path', { d: 'M480 250 h310 l-20 18 h-270 z', fill: '#2b3a4f' }, svg);
        S('rect', { x: 510, y: 70, width: 250, height: 22, fill: '#16233a' }, svg);
        st.title = T(svg, 518, 85, 'SERIAL MONITOR', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        st.baud = T(svg, 752, 85, '9600 baud ▾', { 'text-anchor': 'end', 'font-size': 10, fill: CY });
        st.mag = S('g', { transform: 'translate(740 46)', opacity: 0 }, svg);
        S('circle', { r: 16, fill: 'none', stroke: CY, 'stroke-width': 3, 'class': 'ring' }, st.mag);
        S('circle', { cx: -2, cy: -2, r: 6, fill: 'none', stroke: INK, 'stroke-width': 2 }, st.mag); S('line', { x1: 2, y1: 2, x2: 8, y2: 8, stroke: INK, 'stroke-width': 2 }, st.mag);
        st.lines = S('g', {}, svg);
        st.plot = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 2.5 }, svg);
        st.code = T(svg, 40, 290, '', { 'font-size': 13, fill: CY });
        st.mode = 'off'; var acc = 0, L = cable.getTotalLength(), bits = [], rows = [], hist = [];
        loop(st, function (dt, t) {
          acc += dt;
          var sending = st.mode !== 'off';
          if (sending && acc > 0.09) { acc = 0; var g = T(st.bits, 0, 0, Math.random() < 0.5 ? '1' : '0', { 'font-size': 11, fill: st.mode === 'bad' ? SIG : CY, 'text-anchor': 'middle' }); bits.push({ el: g, p: 0 }); st.txl.setAttribute('fill', '#ffb020'); }
          else if (acc > 0.05) st.txl.setAttribute('fill', '#3b4350');
          bits = bits.filter(function (bt) { bt.p += dt * 0.9; if (bt.p >= 1) { bt.el.remove(); return false; } var q = st.cable.getPointAtLength(bt.p * L); bt.el.setAttribute('x', q.x); bt.el.setAttribute('y', q.y - 8); return true; });
          if (sending && Math.floor(t * 4) !== st.lastTick) {
            st.lastTick = Math.floor(t * 4);
            var knob = Math.round(512 + 400 * Math.sin(t * 0.7)), light = Math.round(680 + 120 * Math.sin(t * 0.37 + 1));
            hist.push(knob); if (hist.length > 60) hist.shift();
            var txt = st.mode === 'bad' ? 'ÿ⸮⸮␀' + String.fromCharCode(0x2591 + (st.lastTick % 3)) + '⸮x⸮⸮ÿ' : 'knob: ' + knob + '  (' + (knob * 5 / 1023).toFixed(2) + ' V)  light: ' + light;
            rows.push(txt); if (rows.length > 7) rows.shift();
            while (st.lines.firstChild) st.lines.removeChild(st.lines.firstChild);
            if (st.mode !== 'plot') rows.forEach(function (r, i) { T(st.lines, 516, 114 + i * 19, r, { 'font-size': 11, fill: st.mode === 'bad' ? SIG : '#a7f3d0' }); });
            st.plot.setAttribute('points', st.mode === 'plot' ? hist.map(function (v, i) { return (514 + i * 4) + ',' + (240 - v / 1023 * 136); }).join(' ') : '');
          }
        });
        st.set = function (m, code, baud, mag, title) { st.mode = m; st.code.textContent = code; st.baud.textContent = baud; st.baud.setAttribute('fill', /9600/.test(baud) ? CY : SIG); st.mag.setAttribute('opacity', mag ? 1 : 0); st.title.textContent = title || 'SERIAL MONITOR'; while (st.lines.firstChild) st.lines.removeChild(st.lines.firstChild); rows = []; };
      },
      frames: [
        { cap: '<b>Serial = one bit at a time.</b> <code>Serial.begin(9600)</code> opens a link through the USB cable that sends <b>9600 bits every second</b>. The TX (“transmit”) light on the board flickers whenever the UNO is sending.', draw: function (svg, S, st) { st.set('send', 'Serial.begin(9600);', '9600 baud ▾', false); } },
        { cap: '<b>println sends a line of text.</b> Each <code>Serial.println()</code> sends its message and starts a new line. Your laptop shows every line in the <b>Serial Monitor</b>. Open it with the <b>magnifying-glass icon</b> at the top right of the Arduino IDE (or <b>Tools → Serial Monitor</b>).', draw: function (svg, S, st) { st.set('send', 'Serial.println(knob);', '9600 baud ▾', true); } },
        { cap: '<b>Speeds must match.</b> If the Serial Monitor is set to a different speed than <code>Serial.begin</code>, the bits are read at the wrong time and you get gibberish. Seeing junk like this? Set the menu to <b>9600 baud</b>.', draw: function (svg, S, st) { st.set('bad', 'Serial.begin(9600);  ← but the monitor is at 115200', '115200 baud ▾', false); } },
        { cap: '<b>Or draw a graph.</b> <b>Tools → Serial Plotter</b> turns the numbers into a live line graph: great for seeing how a sensor reacts when you wave your hand over it.', draw: function (svg, S, st) { st.set('plot', 'Serial.println(knob);', '9600 baud ▾', false, 'SERIAL PLOTTER'); } }
      ] });
  }

  /* ---------- 07 code: knob → colour ---------- */
  steps.push({ id: 'code2', title: 'Code it: the knob picks the colour', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The knob gives 0–1023. The LED wants 0–255 for each colour. To connect them you need one of the most useful functions in Arduino: <code>map()</code>.</p>');
    mapXp(b);
    UI.numq(b, ctx, { id: 'q-map1', q: 'What does <code>map(300, 0, 1023, 0, 255)</code> give? (map drops any decimals)', answer: 74, tol: 0.6, unit: '', explain: '300 is about 29% of the way from 0 to 1023, and 29% of 255 is <b>74</b> (74.8, with the decimals dropped).', hint: 'Work out 300 × 255 ÷ 1023.' });
    UI.html(b, '<h2>A colour wheel in code</h2><p>To sweep through every colour with one knob, split the knob’s range into three parts. In each part, one colour fades out while the next one fades in.</p>');
    wheelXp(b);
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, WHEEL, [
      { lines: [ln(WHEEL, 'int red = 0'), ln(WHEEL, 'int blue = 0')], title: 'Three variables for the colour', html: '<p>The code works out the colour first, stores it in <code>red</code>, <code>green</code> and <code>blue</code>, then sends it to the LED.</p>' },
      { lines: [ln(WHEEL, 'int knob ='), ln(WHEEL, 'int knob =')], title: 'Read the knob', html: '<p>0 at one end, 1023 at the other.</p>' },
      { lines: [ln(WHEEL, 'if (knob < 341)'), ln(WHEEL, 'if (knob < 341)') + 3], title: 'First third: red → green', html: '<p>For knob values 0–340, <code>map</code> turns the knob into a green level from 0 to 255. Red is whatever is left (<code>255 - green</code>), so as green goes up, red goes down. Halfway through, both are about 128: orange-yellow.</p>' },
      { lines: [ln(WHEEL, 'else if (knob < 682)'), ln(WHEEL, 'else if (knob < 682)') + 3], title: 'else if: second third', html: '<p><code>else if</code> is only checked when the first <code>if</code> was false. Here, 341–681 fades green into blue.</p>' },
      { lines: [ln(WHEEL, '} else {'), ln(WHEEL, '} else {') + 4], title: 'else: the rest', html: '<p>Anything 682 and up lands in <code>else</code>: blue fades into red, so the end of the knob joins back up to the start of the wheel.</p>' },
      { lines: [ln(WHEEL, 'analogWrite(RED_PIN, red)'), ln(WHEEL, 'analogWrite(BLUE_PIN, blue)')], title: 'Send it to the LED', html: '<p>Three <code>analogWrite</code> lines set the three PWM duty cycles.</p>' },
      { lines: [ln(WHEEL, 'Serial.print("knob'), ln(WHEEL, 'Serial.println(blue)')], title: 'Show your working', html: '<p>The Serial Monitor shows the knob and the three colour numbers, so you can check the maths while you turn the knob.</p>' }
    ], { name: 'knob_colour' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Run it and drag the <b>A0 knob</b> slider from one end to the other. The LED should go red → yellow → green → cyan → blue → purple → red.</p>');
    RL.Sim.create(b, simOpts({ title: 'Knob picks the colour', code: WHEEL, name: 'knob_colour', key: 'sim-wheel', ctx: ctx, runHint: 'drag the A0 knob slider.',
      checkAfter: 600,
      check: function (log, sim) {
        return new Promise(function (res) {
          var got = [];
          function at(v, next) { sim.setAnalog(0, v); setTimeout(function () { got.push((sim.state().rgb || [0, 0, 0]).slice()); next(); }, 450); }
          at(20, function () { at(511, function () { at(1000, function () {
            var a = got[0], m = got[1], z = got[2], r;
            if (!(a[0] > 0.8 && a[1] < 0.2 && a[2] < 0.05)) r = { pass: false, msg: 'With the knob near 0 the LED should be red. Check the first if (knob < 341) block.' };
            else if (!(m[0] < 0.05 && m[1] > 0.3 && m[2] > 0.3)) r = { pass: false, msg: 'At the middle of the knob the LED should be green + blue (cyan). Check the else if block.' };
            else if (!(z[0] > 0.7 && z[1] < 0.05)) r = { pass: false, msg: 'Near the top of the knob the LED should be mostly red with some blue. Check the else block.' };
            else r = { pass: true, msg: 'Red at 0, cyan in the middle, red-purple at the top: a full colour wheel on one knob.' };
            ctx.check('sim-wheel-pass', r.pass ? 1 : 0); sim.setAnalog(0, 300); res(r);
          }); }); });
        });
      } }));
    UI.html(b, '<p style="margin-top:20px">Upload it to your board and turn the real knob. If the colours go the “wrong way” round the wheel, that’s fine: it just depends which outer leg is on 5V.</p>');
  } });
  function mapXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'map(): changing the scale', w: 800, h: 300,
      init: function (svg, S, st) {
        bg(svg, 800, 300);
        var X0 = 90, X1 = 710, YI = 110, YO = 210;
        T(svg, 40, 34, 'map(value, fromLow, fromHigh, toLow, toHigh)', { 'font-size': 13, fill: MUT });
        S('line', { x1: X0, y1: YI, x2: X1, y2: YI, stroke: WIREC, 'stroke-width': 3 }, svg);
        S('line', { x1: X0, y1: YO, x2: X1, y2: YO, stroke: WIREC, 'stroke-width': 3 }, svg);
        T(svg, X0 - 14, YI + 4, 'IN', { 'text-anchor': 'end', 'font-size': 11, fill: MUT, 'letter-spacing': '1.5' });
        T(svg, X0 - 14, YO + 4, 'OUT', { 'text-anchor': 'end', 'font-size': 11, fill: MUT, 'letter-spacing': '1.5' });
        st.ticksI = S('g', {}, svg); st.ticksO = S('g', {}, svg);
        st.link = S('line', { stroke: CY, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, svg);
        st.dI = S('circle', { r: 9, fill: CY }, svg); st.dO = S('circle', { r: 9, fill: CY }, svg);
        st.vI = T(svg, 0, YI - 18, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY });
        st.vO = T(svg, 0, YO + 32, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY });
        st.eq = T(svg, 400, 280, '', { 'text-anchor': 'middle', 'font-size': 15, fill: INK });
        st.over = S('rect', { x: 0, y: YO - 6, width: 0, height: 12, fill: SIG, opacity: 0.5 }, svg);
        st.p = { a: 0, b: 1023, c: 0, d: 255, x: 512, sweep: false, clamp: false };
        function ticks(g, y, lo, hi, step) { while (g.firstChild) g.removeChild(g.firstChild); for (var v = lo; v <= hi + 0.1; v += step) { var x = X0 + (v - lo) / (hi - lo) * (X1 - X0); S('line', { x1: x, y1: y - 6, x2: x, y2: y + 6, stroke: WIREC, 'stroke-width': 2 }, g); T(g, x, y + (g === st.ticksI ? 24 : -14), String(Math.round(v)), { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); } }
        st.cfg = function (p) {
          st.p = p; ticks(st.ticksI, YI, p.ia, p.ib, (p.ib - p.ia) / 4);
          ticks(st.ticksO, YO, Math.min(p.c, p.d), Math.max(p.c, p.d), Math.abs(p.d - p.c) / 4);
          if (p.flip) { var ts = st.ticksO.querySelectorAll('text'), n = ts.length; ts.forEach(function (t, i) { t.textContent = String(Math.round(p.d + (p.c - p.d) * (n - 1 - i) / (n - 1))); }); }
        };
        st.cur = 512;
        loop(st, function (dt, t) {
          var p = st.p; if (!p.ia && p.ia !== 0) return;
          var target = p.sweep ? p.ia + (p.ib - p.ia) * (0.5 - 0.5 * Math.cos(t * 0.8)) : p.x;
          st.cur = ease(st.cur, target, dt, 4);
          var x = Math.round(st.cur), out = amap(x, p.a, p.b, p.c, p.d);
          if (p.clamp) out = clamp(out, Math.min(p.c, p.d), Math.max(p.c, p.d));
          var xi = X0 + (x - p.ia) / (p.ib - p.ia) * (X1 - X0), lo = Math.min(p.c, p.d), hi = Math.max(p.c, p.d);
          var xo = X0 + (p.flip ? (p.c - out) : (out - lo)) / (hi - lo) * (X1 - X0);
          st.dI.setAttribute('cx', xi); st.dI.setAttribute('cy', YI); st.dO.setAttribute('cx', Math.min(780, xo)); st.dO.setAttribute('cy', YO);
          st.dO.setAttribute('fill', xo > X1 + 1 ? SIG : CY);
          st.over.setAttribute('x', X1); st.over.setAttribute('width', Math.max(0, Math.min(780, xo) - X1));
          st.link.setAttribute('x1', xi); st.link.setAttribute('y1', YI); st.link.setAttribute('x2', Math.min(780, xo)); st.link.setAttribute('y2', YO);
          st.vI.setAttribute('x', xi); st.vI.textContent = x; st.vO.setAttribute('x', Math.min(760, xo)); st.vO.textContent = out;
          st.eq.textContent = (p.clamp ? 'constrain(' : '') + 'map(' + x + ', ' + p.a + ', ' + p.b + ', ' + p.c + ', ' + p.d + ')' + (p.clamp ? ', 0, 255)' : '') + ' = ' + out;
        });
      },
      frames: [
        { cap: '<b>map() rescales a number.</b> You give it a value, the range it comes from (0 to 1023) and the range you want (0 to 255). It works out where the value sits along the first line, and finds the same spot on the second. 512 is halfway along, so it becomes 127.', draw: function (svg, S, st) { st.cfg({ ia: 0, ib: 1023, a: 0, b: 1023, c: 0, d: 255, x: 512 }); } },
        { cap: '<b>Every reading gets its own output.</b> As the knob sweeps 0 → 1023, the output sweeps 0 → 255. Under the hood: <b>out = value × 255 ÷ 1023</b>. map() only gives whole numbers, so any decimals are dropped.', draw: function (svg, S, st) { st.cfg({ ia: 0, ib: 1023, a: 0, b: 1023, c: 0, d: 255, sweep: true }); } },
        { cap: '<b>Flip it by swapping the ends.</b> <code>map(light, 0, 1023, 255, 0)</code> turns <i>high</i> readings into <i>low</i> outputs. That’s how your night-light will glow brighter when the light reading goes down.', draw: function (svg, S, st) { st.cfg({ ia: 0, ib: 1023, a: 0, b: 1023, c: 255, d: 0, flip: true, sweep: true }); } },
        { cap: '<b>Careful: map() doesn’t stop at the ends.</b> Here the input range is only 0–340, but the knob goes up to 1023. Past 340 the output keeps going past 255 (orange). Your colour wheel avoids this with if/else. Another fix is <code>constrain(x, 0, 255)</code>, which clamps a number inside a range.', draw: function (svg, S, st) { st.cfg({ ia: 0, ib: 1023, a: 0, b: 340, c: 0, d: 255, sweep: true }); } }
      ] });
  }
  function wheelXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'One knob, every colour', w: 800, h: 320,
      init: function (svg, S, st) {
        bg(svg, 800, 320);
        var cx = 190, cy = 150, R = 108;
        function pt(k, r) { var a = (-135 + 270 * k / 1023) * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
        for (var k = 0; k < 1023; k += 12) { var p0 = pt(k, R - 14), p1 = pt(k, R + 14), p2 = pt(Math.min(1023, k + 13), R + 14), p3 = pt(Math.min(1023, k + 13), R - 14); S('path', { d: 'M' + p0 + ' L' + p1 + ' L' + p2 + ' L' + p3 + ' Z', fill: css(wheel(k)) }, svg); }
        [[0, '0'], [341, '341'], [682, '682'], [1023, '1023']].forEach(function (m) { var a = pt(m[0], R - 18), c = pt(m[0], R + 18), tp = pt(m[0], R + 36); S('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], stroke: INK, 'stroke-width': 2 }, svg); T(svg, tp[0], tp[1] + 4, m[1], { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); });
        var g = grad(svg); st.glow = S('circle', { cx: cx, cy: cy, r: 80, fill: g.url, opacity: 0.8 }, svg);
        st.dome = S('circle', { cx: cx, cy: cy, r: 32, fill: '#ccc', stroke: '#f4f7fb', 'stroke-width': 2 }, svg);
        st.ptr = S('line', { x1: cx, y1: cy, x2: cx, y2: cy - R + 22, stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
        st.branch = [['if (knob < 341)', 'red → green'], ['else if (knob < 682)', 'green → blue'], ['else', 'blue → red']].map(function (br, i) { var y = 60 + i * 30; return [T(svg, 400, y, br[0], { 'font-size': 14, fill: MUT }), T(svg, 600, y, br[1], { 'font-size': 12, fill: MUT })]; });
        st.bars = [['RED', '#ff4d4d'], ['GREEN', '#3ee07a'], ['BLUE', '#4da3ff']].map(function (c, i) { var y = 180 + i * 38; T(svg, 400, y + 14, c[0], { 'font-size': 11, fill: MUT, 'letter-spacing': '1.5' }); S('rect', { x: 470, y: y, width: 255, height: 18, rx: 3, fill: '#121c2b', stroke: GRID }, svg); return [S('rect', { x: 470, y: y, width: 0, height: 18, rx: 3, fill: c[1] }, svg), T(svg, 735, y + 14, '', { 'font-size': 12, fill: INK })]; });
        st.kT = T(svg, cx, 306, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY });
        st.lo = 0; st.hi = 1023; st.cur = 0;
        loop(st, function (dt, t) {
          var k = Math.round(st.lo + (st.hi - st.lo) * (0.5 - 0.5 * Math.cos(t * 0.9)));
          var c = wheel(k), s = shown(c); g.set(css(s.col)); st.dome.setAttribute('fill', css(lerpC(c, [255, 255, 255], 0.25)));
          st.ptr.setAttribute('transform', 'rotate(' + (-135 + 270 * k / 1023) + ' ' + cx + ' ' + cy + ')');
          var br = k < 341 ? 0 : k < 682 ? 1 : 2;
          st.branch.forEach(function (x, i) { x[0].setAttribute('fill', i === br ? CY : MUT); x[1].setAttribute('fill', i === br ? INK : MUT); });
          st.bars.forEach(function (x, i) { x[0].setAttribute('width', c[i]); x[1].textContent = c[i]; });
          st.kT.textContent = 'knob = ' + k;
        });
      },
      frames: [
        { cap: '<b>First third (0–340): red fades into green.</b> Green rises from 0 to 255 while red drops from 255 to 0. Halfway, both are about 128, which looks orange-yellow.', draw: function (svg, S, st) { st.lo = 0; st.hi = 340; } },
        { cap: '<b>Second third (341–681): green fades into blue,</b> passing through cyan.', draw: function (svg, S, st) { st.lo = 341; st.hi = 681; } },
        { cap: '<b>Last third (682–1023): blue fades into red,</b> passing through purple and pink.', draw: function (svg, S, st) { st.lo = 682; st.hi = 1023; } },
        { cap: '<b>The whole knob</b> walks all the way round the colour wheel. Only one branch of the if / else if / else runs each time through loop(), picked by where the knob is.', draw: function (svg, S, st) { st.lo = 0; st.hi = 1023; } }
      ] });
  }

  /* ---------- 08 code: the night-light lamp ---------- */
  steps.push({ id: 'lamp', title: 'Code it: the night-light lamp', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Last piece: the light sensor controls the <b>brightness</b>. When the room is bright the lamp dims right down; when it gets dark the lamp glows at full power. The trick is to dim all three colours by the same fraction, so the colour you picked stays the same.</p>');
    brightXp(b);
    UI.html(b, '<h2>Read the code</h2><p>The colour part is the same as before. The new parts are steps 2 and 3 in <code>loop()</code>.</p>');
    RL.Code.walk(b, LAMPCODE, [
      { lines: [ln(LAMPCODE, 'const int DARK'), ln(LAMPCODE, 'const int BRIGHT')], title: 'Calibration constants', html: '<p><code>DARK</code> and <code>BRIGHT</code> are the light readings for <i>your</i> room. Every photoresistor and every room is a bit different, so you’ll change these to the numbers you recorded in Step 06.</p>' },
      { lines: [ln(LAMPCODE, '1. the knob'), ln(LAMPCODE, '2. the light') - 2], title: 'Step 1: colour', html: '<p>The same colour wheel as the last sketch.</p>' },
      { lines: [ln(LAMPCODE, 'int light ='), ln(LAMPCODE, 'int brightness =')], title: 'Step 2: a flipped map', html: '<p><code>map(light, DARK, BRIGHT, 255, 10)</code> has its output backwards: a <b>dark</b> reading gives <b>255</b> (full) and a <b>bright</b> reading gives <b>10</b> (a faint glow, so you can still see the lamp is on).</p>' },
      { lines: [ln(LAMPCODE, 'constrain(brightness'), ln(LAMPCODE, 'constrain(brightness')], title: 'Keep it in range', html: '<p>If the room is darker than <code>DARK</code> or brighter than <code>BRIGHT</code>, map would go past 255 or below 10. <code>constrain</code> clamps it so it stays between 10 and 255.</p>' },
      { lines: [ln(LAMPCODE, 'analogWrite(RED_PIN, map'), ln(LAMPCODE, 'analogWrite(BLUE_PIN, map')], title: 'Step 3: scale every colour', html: '<p><code>map(red, 0, 255, 0, brightness)</code> shrinks red’s 0–255 range down to 0–brightness. Doing the same to green and blue keeps the <i>ratio</i> between the colours, so orange stays orange: it just gets dimmer.</p>' },
      { lines: [ln(LAMPCODE, 'Serial.print("light'), ln(LAMPCODE, 'delay(50)')], title: 'Watch it work', html: '<p>The Serial Monitor shows the light reading and the brightness it chose. A short delay keeps the lamp responsive.</p>' }
    ], { name: 'mood_lamp' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Pick a colour with the <b>A0</b> slider, then slide <b>A1</b> down to “cover” the light sensor. The lamp should get brighter as the reading drops.</p>');
    RL.Sim.create(b, simOpts({ title: 'Mood lamp', code: LAMPCODE, name: 'mood_lamp', key: 'sim-lamp', ctx: ctx, runHint: 'slide A1 down to make the room dark.',
      checkAfter: 600,
      check: function (log, sim) {
        return new Promise(function (res) {
          var got = [];
          var cols = [];
          function at(l, next) { sim.setAnalog(1, l); setTimeout(function () { var c = (sim.state().rgb || [0, 0, 0]).slice(); cols.push(c); got.push(Math.max(c[0], c[1], c[2])); next(c); }, 450); }
          sim.setAnalog(0, 0);
          at(150, function () { at(550, function () { at(980, function () {
            var r, top = cols.slice().sort(function (x, y) { return Math.max.apply(null, y) - Math.max.apply(null, x); })[0];
            if (!(top[0] > 0.02 && top[1] <= top[0] * 0.25 && top[2] <= top[0] * 0.25)) r = { pass: false, msg: 'With the knob at 0 the lamp should be red. Is the colour wheel still there?' };
            else if (!(got[0] > 0.9)) r = { pass: false, msg: 'In the dark (A1 = 150) the lamp should be at full brightness. Check the map(light, DARK, BRIGHT, 255, 10) line.' };
            else if (!(got[2] < 0.15)) r = { pass: false, msg: 'In bright light (A1 = 980) the lamp should dim right down. Did you keep the constrain line?' };
            else if (!(got[1] < got[0] && got[1] > got[2])) r = { pass: false, msg: 'In between, the brightness should be in between too.' };
            else r = { pass: true, msg: 'Dark: ' + Math.round(got[0] * 100) + '%, half-light: ' + Math.round(got[1] * 100) + '%, bright: ' + Math.round(got[2] * 100) + '%. Your night-light works.' };
            ctx.check('sim-lamp-pass', r.pass ? 1 : 0); sim.setAnalog(0, 300); sim.setAnalog(1, 650); res(r);
          }); }); });
        });
      } }));
    UI.html(b, '<h2>Calibrate for your room</h2><p>Upload the sketch and open the Serial Monitor. Change <code>DARK</code> to your “covered” reading and <code>BRIGHT</code> to your “room light” reading from Step 06, then upload again. Now covering the sensor should take the lamp from a faint glow to full brightness.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>The lamp is always full brightness</b><br><span class="small muted">Your room is darker than <code>BRIGHT</code>. Lower BRIGHT to your room-light reading.</span></div></div><div class="trow"><div><b>It never gets bright</b><br><span class="small muted">Covering the sensor doesn’t get below <code>DARK</code>. Raise DARK a little. Check the A1 wire goes to a14.</span></div></div><div class="trow"><div><b>It does the opposite</b><br><span class="small muted">The photoresistor and the 10 kΩ are swapped: the photoresistor must go between the + rail row (11) and row 14.</span></div></div><div class="trow"><div><b>The colour changes when the light changes</b><br><span class="small muted">Make sure all three analogWrite lines use <code>map(…, 0, 255, 0, brightness)</code>.</span></div></div></div>');
    UI.mcq(b, ctx, { id: 'q-lamp1', q: 'Why does the code write <code>map(light, DARK, BRIGHT, 255, 10)</code> with <b>255 first</b>?', options: ['It’s a typo — it should be 10, 255', 'So a dark reading (low) gives high brightness', 'Because the photoresistor can’t read above 255', 'To make the colours change'], answer: 1, explain: 'Swapping the output range flips the relationship: low light readings map to high brightness. That’s what makes it a night-light.' });
  } });
  function brightXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'From darkness to brightness', w: 800, h: 320,
      init: function (svg, S, st) {
        bg(svg, 800, 320);
        T(svg, 40, 40, 'LIGHT READING (A1)', LBL);
        S('rect', { x: 40, y: 54, width: 220, height: 18, rx: 3, fill: '#121c2b', stroke: GRID }, svg);
        st.lb = S('rect', { x: 40, y: 54, width: 0, height: 18, rx: 3, fill: '#ffe9a8' }, svg); st.lt = T(svg, 270, 68, '', { 'font-size': 13, fill: INK });
        T(svg, 40, 104, 'map(light, 200, 900, 255, 10)', { 'font-size': 12, fill: MUT });
        T(svg, 40, 140, 'BRIGHTNESS', LBL);
        S('rect', { x: 40, y: 154, width: 220, height: 18, rx: 3, fill: '#121c2b', stroke: GRID }, svg);
        st.bb = S('rect', { x: 40, y: 154, width: 0, height: 18, rx: 3, fill: CY }, svg); st.bt = T(svg, 270, 168, '', { 'font-size': 13, fill: CY });
        T(svg, 330, 40, 'COLOUR FROM THE KNOB', LBL); T(svg, 330, 214, 'WHAT GOES TO THE LED', LBL);
        var cols = ['#ff4d4d', '#3ee07a', '#4da3ff'];
        st.before = cols.map(function (c, i) { S('rect', { x: 330 + i * 70, y: 60, width: 50, height: 110, fill: '#121c2b', stroke: GRID }, svg); return [S('rect', { x: 330 + i * 70, y: 60, width: 50, height: 0, fill: c }, svg), T(svg, 355 + i * 70, 186, '', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT })]; });
        st.after = cols.map(function (c, i) { S('rect', { x: 330 + i * 70, y: 224, width: 50, height: 60, fill: '#121c2b', stroke: GRID }, svg); return [S('rect', { x: 330 + i * 70, y: 224, width: 50, height: 0, fill: c }, svg), T(svg, 355 + i * 70, 300, '', { 'text-anchor': 'middle', 'font-size': 11, fill: CY })]; });
        var g = grad(svg); st.glow = S('circle', { cx: 680, cy: 160, r: 110, fill: g.url, opacity: 0 }, svg);
        st.dome = S('path', { d: 'M650 200 v-50 a30 30 0 0 1 60 0 v50 z', fill: '#d9e1ea', stroke: '#f4f7fb', 'stroke-width': 2 }, svg);
        st.sky = T(svg, 680, 260, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT, 'letter-spacing': '1.5' });
        st.col = [255, 120, 0]; st.l = 900; st.tl = 900; st.sweep = false;
        loop(st, function (dt, t) {
          if (st.sweep) st.tl = 550 + 400 * Math.cos(t * 0.8);
          st.l = ease(st.l, st.tl, dt, 3); var l = Math.round(st.l), bri = clamp(amap(l, 200, 900, 255, 10), 10, 255);
          st.lb.setAttribute('width', 220 * l / 1023); st.lt.textContent = l;
          st.bb.setAttribute('width', 220 * bri / 255); st.bt.textContent = bri;
          var c = st.col, o = c.map(function (v) { return amap(v, 0, 255, 0, bri); });
          st.before.forEach(function (x, i) { var h = 110 * c[i] / 255; x[0].setAttribute('y', 170 - h); x[0].setAttribute('height', h); x[1].textContent = c[i]; });
          st.after.forEach(function (x, i) { var h = 60 * o[i] / 255; x[0].setAttribute('y', 284 - h); x[0].setAttribute('height', h); x[1].textContent = o[i]; });
          var s = shown(o); g.set(css(s.col)); st.glow.setAttribute('opacity', 0.9 * s.a); st.dome.setAttribute('fill', s.a ? css(lerpC([150, 160, 172], s.col, s.a)) : '#969fac');
          st.sky.textContent = l > 700 ? 'BRIGHT ROOM' : l > 400 ? 'GETTING DARK' : 'DARK ROOM';
        });
      },
      frames: [
        { cap: '<b>Bright room:</b> the light reading is high (900). The flipped <code>map</code> turns that into a low brightness of 10: just a faint glow.', draw: function (svg, S, st) { st.sweep = false; st.tl = 900; } },
        { cap: '<b>Dark room:</b> the reading drops to 200, and the brightness goes all the way up to 255.', draw: function (svg, S, st) { st.sweep = false; st.tl = 200; } },
        { cap: '<b>Scaling keeps the colour.</b> The knob picked orange: R 255, G 120, B 0. Each colour is scaled by the same fraction (<code>map(red, 0, 255, 0, brightness)</code>), so at a brightness of 132 (about half) you send R 132, G 62, B 0: the same orange, half as bright.', draw: function (svg, S, st) { st.sweep = false; st.tl = 550; } },
        { cap: '<b>As the room changes, the lamp follows</b> — dim in daylight, glowing at night. Real automatic night-lights and phone screens adjust their brightness in exactly this way.', draw: function (svg, S, st) { st.sweep = true; } }
      ] });
  }

  /* ---------- 09 lampshade ---------- */
  steps.push({ id: 'shade', title: 'Design & build the lampshade', stage: '03 Imagine · 05 Create', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Look straight at the bare RGB LED and you’ll see a harsh point of light with coloured edges. A lampshade turns it into a soft, even glow. Your job: design one that blends the colours well — and doesn’t confuse the light sensor.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue burns: let it cool before you touch it. Keep paper away from anything hot; LEDs stay cool, so they’re safe inside a paper shade.</p>');
    shadeXp(b);
    UI.callout(b, '', 'Design ideas', '<ul><li>A frosted plastic cup upside down over the LED is the quickest diffuser. A layer of tissue inside makes it even smoother.</li><li>Roll tracing paper or vellum into a tube and add a tissue lid. Taller shades spread the light more.</li><li>Cut a pattern (stars, waves, your initials) in a cardboard outer layer so coloured light shines through the holes.</li><li>Build a base that hides the breadboard and leaves the knob and light sensor reachable.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe your lampshade. What material did you use to diffuse the light, and where did you put the light sensor? Why there?', placeholder: 'I used… The light sensor is… because…' });
  } });
  function shadeXp(b) {
    function base(svg) { clear(svg); bg(svg, 800, 380); }
    function bbBoard(svg, x, y) { S('rect', { x: x, y: y, width: 240, height: 40, rx: 4, fill: '#d3dbe4' }, svg); for (var i = 0; i < 24; i++) S('rect', { x: x + 8 + i * 9.5, y: y + 10, width: 3, height: 3, fill: '#3b4756' }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A lampshade that blends the colours', w: 800, h: 380, frames: [
      { cap: '<b>Why a shade?</b> The three colour chips sit side by side inside the LED, so up close you see red, green and blue edges instead of one colour. A <b>diffuser</b> scatters the light in all directions so the three colours mix before they reach your eye.', draw: function (svg, S, st) {
        base(svg);
        T(svg, 200, 40, 'BARE LED', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' }); T(svg, 600, 40, 'WITH A DIFFUSER', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        S('line', { x1: 400, y1: 30, x2: 400, y2: 350, stroke: GRID }, svg);
        var g0 = S('g', { style: 'isolation:isolate' }, svg);
        [['#ff0000', -26], ['#00ff00', 0], ['#0000ff', 26]].forEach(function (c) { S('ellipse', { cx: 200 + c[1] * 2.4, cy: 140, rx: 90, ry: 70, fill: c[0], opacity: 0.75, style: 'mix-blend-mode:screen' }, g0); });
        S('rect', { x: 80, y: 240, width: 240, height: 10, fill: '#2b3a4f' }, svg);
        S('circle', { cx: 200, cy: 236, r: 12, fill: '#f4f7fb' }, svg);
        T(svg, 200, 300, 'coloured fringes, a harsh dot', { 'text-anchor': 'middle', fill: MUT, 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 14 });
        var gg = grad(svg, '#c77dff'); S('circle', { cx: 600, cy: 170, r: 150, fill: gg.url, opacity: 0.85 }, svg);
        S('path', { d: 'M560 110 L640 110 L670 240 L530 240 Z', fill: '#e6d7ff', 'fill-opacity': 0.85, stroke: '#f4f7fb', 'stroke-width': 1.5 }, svg);
        S('rect', { x: 480, y: 240, width: 240, height: 10, fill: '#2b3a4f' }, svg);
        var rays = S('g', {}, svg);
        for (var k = 0; k < 14; k++) { (function (k) { st.later(function () { var a = (k * 47) % 360 * Math.PI / 180; S('line', { x1: 600 + 30 * Math.cos(a), y1: 180 + 30 * Math.sin(a), x2: 600 + 92 * Math.cos(a), y2: 180 + 92 * Math.sin(a), stroke: '#fff', 'stroke-width': 2, opacity: 0.5, 'stroke-dasharray': '4 6' }, rays); }, 200 + k * 120); })(k); }
        T(svg, 600, 300, 'one smooth, blended colour', { 'text-anchor': 'middle', fill: CY, 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 14 });
      } },
      { cap: '<b>Option A · Frosted cup.</b> Turn a frosted plastic cup upside down over the RGB LED. Cut a small notch in the rim so it sits flat over the wires. For an even smoother glow, scrunch a tissue inside.', draw: function (svg, S, st) {
        base(svg); bbBoard(svg, 280, 280);
        var gg = grad(svg, '#4da3ff'); var gl = S('circle', { cx: 400, cy: 200, r: 150, fill: gg.url, opacity: 0 }, svg);
        S('circle', { cx: 400, cy: 276, r: 9, fill: '#d9e1ea' }, svg);
        var cup = S('g', { 'class': 'part-new' }, svg);
        S('path', { d: 'M350 120 L450 120 L476 280 L324 280 Z', fill: '#e6f1fa', 'fill-opacity': 0.55, stroke: '#f4f7fb', 'stroke-width': 2 }, cup);
        S('path', { d: 'M390 280 v-12 h20 v12', fill: NAVY, stroke: '#f4f7fb', 'stroke-width': 1.5 }, cup);
        T(svg, 520, 270, '← notch for the wires', { fill: CY, 'font-size': 12 });
        T(svg, 400, 100, 'FROSTED CUP, UPSIDE DOWN', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        st.later(function () { gl.setAttribute('opacity', 0.8); }, 900);
      } },
      { cap: '<b>Option B · Paper tube.</b> Roll a sheet of tracing paper (about 20 cm × 14 cm) into a tube 6–7 cm across and tape the seam. Tape a circle of tissue over the top. Stand it over the LED on a cardboard ring.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 120, y: 90, width: 240, height: 170, fill: '#f4f7fb', 'fill-opacity': 0.8, stroke: '#cfd8e2', 'class': 'part-new' }, svg);
        S('line', { x1: 120, y1: 300, x2: 360, y2: 300, stroke: CY }, svg); T(svg, 240, 324, '20 cm', { 'text-anchor': 'middle', fill: CY });
        S('line', { x1: 96, y1: 90, x2: 96, y2: 260, stroke: CY }, svg); T(svg, 86, 180, '14 cm', { 'text-anchor': 'end', fill: CY });
        T(svg, 440, 180, '→', { 'font-size': 36, fill: MUT });
        var gg = grad(svg, '#3ee07a'), gl = S('circle', { cx: 620, cy: 180, r: 140, fill: gg.url, opacity: 0 }, svg);
        st.later(function () {
          S('path', { d: 'M570 90 L570 280 A50 14 0 0 0 670 280 L670 90', fill: '#f4f7fb', 'fill-opacity': 0.6, stroke: '#cfd8e2', 'stroke-width': 2, 'class': 'part-new' }, svg);
          S('ellipse', { cx: 620, cy: 90, rx: 50, ry: 14, fill: '#fff', 'fill-opacity': 0.75, stroke: '#cfd8e2', 'class': 'part-new' }, svg);
          T(svg, 690, 94, 'tissue lid', { fill: CY, 'font-size': 12 });
          gl.setAttribute('opacity', 0.75);
        }, 700);
      } },
      { cap: '<b>Keep the light sensor outside the shade.</b> If the sensor can see the lamp, you get a <b>feedback loop</b>: the lamp lights up the sensor, the code thinks the room is bright and dims the lamp, now the sensor sees dark and brightens it again… and the lamp flickers. Point the sensor away from the lamp, or shield it with a cardboard wall.', draw: function (svg, S, st) {
        base(svg); bbBoard(svg, 120, 290); bbBoard(svg, 470, 290);
        T(svg, 240, 40, 'SENSOR UNDER THE SHADE', { 'text-anchor': 'middle', fill: SIG, 'font-size': 11, 'letter-spacing': '2' }); T(svg, 590, 40, 'SENSOR OUTSIDE, FACING AWAY', { 'text-anchor': 'middle', fill: GO, 'font-size': 11, 'letter-spacing': '2' });
        S('line', { x1: 400, y1: 30, x2: 400, y2: 350, stroke: GRID }, svg);
        var g1 = grad(svg, '#ff8a3d'), gl1 = S('circle', { cx: 240, cy: 210, r: 120, fill: g1.url, opacity: 0.5 }, svg);
        var sh1 = S('path', { d: 'M196 140 L284 140 L306 290 L174 290 Z', fill: '#e6f1fa', 'fill-opacity': 0.5, stroke: '#f4f7fb', 'stroke-width': 1.5 }, svg);
        S('circle', { cx: 272, cy: 282, r: 7, fill: '#d97a2b', stroke: '#f0a35e' }, svg);
        var rd = T(svg, 240, 340, '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 12 });
        var g2 = grad(svg, '#ff8a3d'); S('circle', { cx: 590, cy: 210, r: 120, fill: g2.url, opacity: 0.85 }, svg);
        S('path', { d: 'M546 140 L634 140 L656 290 L524 290 Z', fill: '#ffd9bf', 'fill-opacity': 0.75, stroke: '#f4f7fb', 'stroke-width': 1.5 }, svg);
        S('rect', { x: 672, y: 252, width: 6, height: 38, fill: '#b98d55' }, svg);
        S('circle', { cx: 694, cy: 282, r: 7, fill: '#d97a2b', stroke: '#f0a35e' }, svg);
        T(svg, 590, 340, 'steady glow', { 'text-anchor': 'middle', fill: GO, 'font-size': 12 });
        T(svg, 700, 248, 'card wall', { fill: MUT, 'font-size': 10 });
        var on = true; (function flick() { on = !on; gl1.setAttribute('opacity', on ? 0.85 : 0.1); sh1.setAttribute('fill', on ? '#ffd9bf' : '#e6f1fa'); rd.textContent = on ? 'sensor: bright → dim the lamp' : 'sensor: dark → brighten the lamp'; st.later(flick, 450); })();
      } },
      { cap: '<b>Finished!</b> Hide the breadboard in a cardboard base, leave the knob where you can reach it, and give the light sensor a window to the room. Test it in a dark corner: turn the knob for colour, cover the sensor to check the night-light.', draw: function (svg, S, st) {
        base(svg);
        var g = grad(svg), gl = S('circle', { cx: 400, cy: 170, r: 190, fill: g.url, opacity: 0.8 }, svg);
        S('rect', { x: 290, y: 270, width: 220, height: 60, rx: 4, fill: '#b98d55', stroke: '#8a6438', 'stroke-width': 2 }, svg);
        var sh = S('path', { d: 'M350 90 L450 90 L480 270 L320 270 Z', fill: '#ccc', 'fill-opacity': 0.85, stroke: '#f4f7fb', 'stroke-width': 1.5 }, svg);
        S('circle', { cx: 330, cy: 300, r: 11, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg); T(svg, 330, 352, 'KNOB', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        S('circle', { cx: 480, cy: 300, r: 7, fill: '#d97a2b', stroke: '#f0a35e' }, svg); T(svg, 480, 352, 'SENSOR', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        var k = 0; (function cyc() { var c = wheel(k % 1024); g.set(css(c)); sh.setAttribute('fill', css(lerpC(c, [255, 255, 255], 0.4))); k += 24; st.later(cyc, 60); })();
      } }
    ] });
  }

  /* ---------- 10 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Test your lamp like a product tester would. Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Colour:</b> turning the knob end to end goes all the way round the colour wheel, with no flicker.',
      '<b>Blend:</b> through the shade, you see one smooth colour, not separate red, green and blue spots.',
      '<b>Night-light:</b> covering the sensor makes the lamp brighten within a second; uncovering it dims the lamp.',
      '<b>No feedback:</b> in a dark room the lamp glows steadily (it doesn’t flicker by lighting up its own sensor).',
      '<b>Serial:</b> the Serial Monitor shows sensible light readings for your room.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Mood mode', html: 'Make the lamp drift slowly round the colour wheel on its own, like a real mood light. Use a variable that counts from 0 to 1023 and starts again, instead of reading the knob.', hint: 'Make <code>int hue = 0;</code> a global variable. In loop(): <code>hue = hue + 2; if (hue > 1023) hue = 0;</code> and use <code>hue</code> instead of <code>knob</code> in the colour wheel. A <code>delay(20)</code> sets the speed.' },
      { tag: 'Build + code', title: 'Mode button', html: 'Add a push button that switches between “knob colour” and “mood mode.” Wire it like Mission 01 (with a 10 kΩ pull-down) to pin 2, and keep track of the mode in a variable.', hint: 'Use <code>int mode = 0;</code>. When <code>digitalRead(2) == HIGH</code>, do <code>mode = 1 - mode;</code>, then <code>delay(300)</code> so one press only counts once.' },
      { tag: 'Code', title: 'Sunrise alarm', html: 'Make a wake-up light: starting from off, fade from deep red through orange to warm white over 60 seconds, then stay on.', hint: 'A for loop from 0 to 255 with <code>delay(235)</code> takes about 60 s. Try <code>setColor(255, i * 6 / 10, i / 4);</code>.' },
      { tag: 'Code', title: 'Candle flicker', html: 'Make the lamp flicker like a candle flame: warm orange with a brightness that jumps around a little, many times a second.', hint: '<code>random(150, 256)</code> gives a random whole number from 150 to 255. Use it as the brightness, with <code>delay(random(30, 120));</code>.' },
      { tag: 'Science', cls: 'c', title: 'Smooth the sensor', html: 'Wave your hand over the sensor: the lamp jumps instantly. Make it react smoothly by averaging the last few readings.', hint: 'Read the sensor 10 times in a for loop, add the readings up, and divide by 10. Or keep a running average: <code>smooth = (smooth * 9 + light) / 10;</code>' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* Phone widths: the kit's one-column grids (.walk, .sim-body, .bg-body, .brief) use plain 1fr tracks, so a long code
   * line or a long tag would stretch the whole page sideways. Let this mission's grid items shrink instead. */
  function fit(b) {
    b.querySelectorAll('.walk > *, .sim-body > *, .bg-body > *, .brief > *, .two > *').forEach(function (e) { e.style.minWidth = '0'; });
    b.querySelectorAll('.brief-meta .tag').forEach(function (t) { t.style.whiteSpace = 'normal'; });
  }
  steps.forEach(function (s) { if (!s.render) return; var r = s.render; s.render = function (b, ctx) { r(b, ctx); fit(b); }; });

  /* ---------- 11 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m02 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working mood lamp. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your lamp', help: 'Your lamp glowing (try two different colours), and one close-up of your breadboard wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: turn the knob through the colours, then cover the light sensor and show the lamp getting brighter.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'mood_lamp' }
      ],
      questions: [
        { id: 'r1', q: 'A UNO pin can only be 0 V or 5 V. Explain how analogWrite(11, 64) makes the red LED look dim. Use the words PWM and duty cycle.' },
        { id: 'r2', q: 'Explain how the photoresistor and the 10 kΩ resistor turn the amount of light into a number from 0 to 1023. What happens to the reading when the room gets darker, and why?' },
        { id: 'r3', q: 'Pick one map() line from your code. Explain what it does, using real numbers as an example.' },
        { id: 'r4', q: 'Describe one problem you ran into (wiring, code or building the lampshade) and how you solved it.' }
      ]
    }
  };
})(window);
