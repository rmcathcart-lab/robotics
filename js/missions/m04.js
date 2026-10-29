/* Mission 04: Weather gauge — the guide.
 * Students build a cardboard dial with a servo needle that shows temperature (and humidity) from a DHT11, and compare
 * it with a thermistor on A0. Circuit parts for the build guide and every Virtual UNO are shared below so the drawings
 * always match: servo signal on pin 9, DHT11 data on pin 2, thermistor divider on A0, mode button on pin 4 (INPUT_PULLUP). */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', NAVY = '#070d17';
  var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72', CINK = '#3a2a16', STICK = '#e8d3a8';
  var SANS = 'IBM Plex Sans, sans-serif';
  function bg(svg, w, h) {
    S('rect', { x: 0, y: 0, width: w, height: h, fill: NAVY }, svg);
    for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
    for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
  }
  function glowDefs(svg) {
    var d = svg.querySelector('defs') || S('defs', {}, svg);
    [['red', '#ff4d4d'], ['yellow', '#ffd23f'], ['green', '#3ee07a'], ['white', '#f4f7fb'], ['cyan', CY], ['heat', '#ff5a5a']].forEach(function (c) {
      if (d.querySelector('#m4-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm4-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  /* a requestAnimationFrame loop owned by an explainer's state: fn(seconds since start). Starting a new one stops the old one. */
  function loopAnim(st, fn) {
    stopAnim(st); var t0 = performance.now();
    (function tick(t) { fn(Math.max(0, (t - t0) / 1000)); st.raf = requestAnimationFrame(tick); })(t0);
    st.stop = function () { stopAnim(st); };
  }
  function stopAnim(st) { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; }
  /* a point on a dial: servo angle a (0 = left end, 180 = right end), radius r around cx, cy */
  function pt(cx, cy, r, a) { var th = (180 - a) * Math.PI / 180; return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; }
  function arcPath(cx, cy, r, a0, a1) { var p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  /* thermistor maths (the ELEGOO Steinhart–Hart numbers) */
  var SH = [0.001129148, 0.000234125, 0.0000000876741];
  function thermC(reading) { var lr = Math.log(10000 * (1024 / reading - 1)); return 1 / (SH[0] + (SH[1] + SH[2] * lr * lr) * lr) - 273.15; }
  function thermR(c) { var lo = 100, hi = 1e6; for (var i = 0; i < 60; i++) { var mid = Math.sqrt(lo * hi), lr = Math.log(mid), t = 1 / (SH[0] + (SH[1] + SH[2] * lr * lr) * lr) - 273.15; if (t > c) lo = mid; else hi = mid; } return Math.sqrt(lo * hi); }
  function slider(box, label, min, max, step, val, fmt, on) {
    var row = el('div', 'slider-row'); row.innerHTML = '<label>' + esc(label) + '</label>';
    var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; r.setAttribute('aria-label', label);
    var o = el('b', '', esc(fmt(val)));
    r.addEventListener('input', function () { o.textContent = fmt(Number(r.value)); on(Number(r.value)); });
    row.appendChild(r); row.appendChild(o); box.appendChild(row);
    return { set: function (v) { r.value = v; o.textContent = fmt(v); on(v); }, input: r };
  }

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var GAUGE = {
    servo: { type: 'servo', at: [806, 40], angle: 90, name: 'SG90 servo' },
    sv_g: { type: 'wire', from: 'R-2', to: 'servo.GND', color: 'black', via: [[720, 76]], name: 'Black wire: − rail → servo brown (−)' },
    sv_v: { type: 'wire', from: 'R+3', to: 'servo.V', color: 'red', via: [[730, 92]], name: 'Red wire: + rail → servo red (+)' },
    sv_s: { type: 'wire', from: 'D9', to: 'servo.S', color: 'orange', via: [[350, 232], [560, 170], [736, 110]], name: 'Orange wire: pin 9 → servo signal' },
    dht: { type: 'dht', at: [806, 290], name: 'DHT11 module' },
    dh_s: { type: 'wire', from: 'D2', to: 'dht.S', color: 'yellow', via: [[350, 354], [560, 330], [740, 314]], name: 'Yellow wire: pin 2 → DHT11 S' },
    dh_v: { type: 'wire', from: 'R+19', to: 'dht.V', color: 'red', via: [[740, 336]], name: 'Red wire: + rail → DHT11 +' },
    dh_g: { type: 'wire', from: 'R-21', to: 'dht.G', color: 'black', via: [[740, 356]], name: 'Black wire: − rail → DHT11 −' },
    th_j: { type: 'wire', from: 'L+20', to: 'a20', color: 'red', name: 'Red jumper: + rail → a20' },
    th: { type: 'therm', from: 'c20', to: 'c23', name: 'Thermistor' },
    th_r: { type: 'res', from: 'e23', to: 'e27', ohms: 10000, name: '10 kΩ resistor' },
    th_g: { type: 'wire', from: 'a27', to: 'L-27', color: 'black', name: 'Black jumper: a27 → − rail' },
    th_a: { type: 'wire', from: 'A0', to: 'b23', color: 'green', via: [[12, 378], [12, 470], [44, 526], [240, 530], [384, 478], [438, 426]], name: 'Green wire: A0 → b23' },
    btn: { type: 'button', at: 'e11', name: 'Push button (mode)' },
    bt_4: { type: 'wire', from: 'D4', to: 'a13', color: 'blue', name: 'Blue wire: pin 4 → a13' },
    bt_g: { type: 'wire', from: 'a11', to: 'L-11', color: 'black', name: 'Black jumper: a11 → − rail' }
  };
  var ALL = merge(POWER, GAUGE);
  var IDS = Object.keys(ALL);
  var SIM_VIEW = [236, 8, 766, 564];
  function simBoard() { return { parts: ALL, show: IDS, vb: B.WIDE, view: SIM_VIEW }; }
  /* fresh device options for each Virtual UNO (the sim changes them as sliders move) */
  function devices(o) {
    return merge({
      board: simBoard(), servos: { 9: 'servo' }, dht: { pin: 2, temp: 22, hum: 45 },
      analog: { 0: { label: 'thermistor (warmer →)', value: 480, part: 'th' } },
      buttons: { 4: { part: 'btn', wiring: 'pullup', label: 'Mode button' } }
    }, o || {});
  }
  function servoAngle(sim) { var s = sim.state(); return s && s.servo[9] != null ? s.servo[9] : null; }

  /* ================= code ================= */
  var SWEEP = [
    '// Mission 04, part 1: sweep the servo',
    '#include <Servo.h>   // comes with the Arduino IDE',
    '',
    'Servo needle;        // a Servo object called needle',
    '',
    'void setup() {',
    '  needle.attach(9);  // signal wire on pin 9',
    '}',
    '',
    'void loop() {',
    '  // swing from 0 to 180 degrees, one degree at a time',
    '  for (int angle = 0; angle <= 180; angle++) {',
    '    needle.write(angle);',
    '    delay(15);       // time to get there',
    '  }',
    '  // and back again',
    '  for (int angle = 180; angle >= 0; angle--) {',
    '    needle.write(angle);',
    '    delay(15);',
    '  }',
    '}'].join('\n');
  var READ = [
    '// Mission 04, part 2: read the DHT11',
    '#include <DHT.h>   // Adafruit "DHT sensor library"',
    '',
    'const int DHT_PIN = 2;',
    'DHT dht(DHT_PIN, DHT11);   // a DHT11 on pin 2',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  dht.begin();',
    '  Serial.println("Weather gauge: reading the DHT11...");',
    '}',
    '',
    'void loop() {',
    '  delay(2000);   // a DHT11 can only measure every 2 seconds',
    '  float humidity = dht.readHumidity();        // in %',
    '  float temperature = dht.readTemperature();  // in degrees C',
    '',
    '  if (isnan(humidity) || isnan(temperature)) {',
    '    Serial.println("No reading - check the DHT11 wiring");',
    '    return;   // skip the rest of loop() and try again',
    '  }',
    '',
    '  Serial.print("Temperature: ");',
    '  Serial.print(temperature, 1);   // 1 decimal place',
    '  Serial.print(" C   Humidity: ");',
    '  Serial.print(humidity, 0);',
    '  Serial.println(" %");',
    '}'].join('\n');
  var NEEDLE = [
    '// Mission 04, part 3: the needle follows the temperature',
    '#include <Servo.h>',
    '#include <DHT.h>',
    '',
    'const int DHT_PIN = 2;',
    'const int SERVO_PIN = 9;',
    'const int LOW_TEMP = 0;     // left end of the dial (0 degrees)',
    'const int HIGH_TEMP = 40;   // right end (180 degrees)',
    '',
    'DHT dht(DHT_PIN, DHT11);',
    'Servo needle;',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  dht.begin();',
    '  needle.attach(SERVO_PIN);',
    '}',
    '',
    'void loop() {',
    '  float temperature = dht.readTemperature();',
    '  if (isnan(temperature)) return;   // no reading',
    '',
    '  // YOUR TURN: map() the temperature to an angle',
    '  int angle = 90;',
    '',
    '  // YOUR TURN: constrain() the angle to 0-180',
    '',
    '  needle.write(angle);',
    '  Serial.print(temperature, 1);',
    '  Serial.print(" C  ->  ");',
    '  Serial.print(angle);',
    '  Serial.println(" degrees");',
    '  delay(1000);',
    '}'].join('\n');
  var COMPARE = [
    '// Mission 04, part 4: two thermometers',
    '#include <DHT.h>',
    '',
    'const int DHT_PIN = 2;',
    'const int THERM_PIN = A0;',
    'DHT dht(DHT_PIN, DHT11);',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  dht.begin();',
    '}',
    '',
    '// returns the thermistor temperature in degrees C',
    'float readThermistor() {',
    '  long total = 0;',
    '  for (int i = 0; i < 10; i++) {',
    '    total = total + analogRead(THERM_PIN);',
    '    delay(2);',
    '  }',
    '  float reading = total / 10.0;   // the average',
    '  float resistance = 10000.0 * (1024.0 / reading - 1);   // ohms',
    '  float logR = log(resistance);',
    '  float kelvin = 1 / (0.001129148 + (0.000234125 + 0.0000000876741 * logR * logR) * logR);',
    '  return kelvin - 273.15;   // kelvin to degrees C',
    '}',
    '',
    'void loop() {',
    '  float dhtTemp = dht.readTemperature();',
    '  float thermTemp = readThermistor();',
    '',
    '  Serial.print("DHT11: ");',
    '  Serial.print(dhtTemp, 1);',
    '  Serial.print(" C   Thermistor: ");',
    '  Serial.print(thermTemp, 1);',
    '  Serial.print(" C   Difference: ");',
    '  Serial.println(abs(dhtTemp - thermTemp), 1);',
    '  delay(2000);',
    '}'].join('\n');
  var CALIB = [
    '// Mission 04: calibrate the dial',
    '// Points the needle at each tick so you can mark the dial where it ACTUALLY points.',
    '#include <Servo.h>',
    '',
    'Servo needle;',
    'const int TICKS[] = {0, 10, 20, 30, 40};   // the temperatures to mark',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  needle.attach(9);',
    '  needle.write(90);',
    '  Serial.println("Needle at 90 degrees: fit it pointing straight up.");',
    '  delay(5000);',
    '}',
    '',
    'void loop() {',
    '  for (int i = 0; i < 5; i++) {',
    '    int angle = map(TICKS[i], 0, 40, 0, 180);',
    '    needle.write(angle);',
    '    Serial.print("Mark ");',
    '    Serial.print(TICKS[i]);',
    '    Serial.print(" C here (servo at ");',
    '    Serial.print(angle);',
    '    Serial.println(" degrees)");',
    '    delay(4000);',
    '  }',
    '}'].join('\n');
  var GAUGE_CODE = [
    '/*',
    '  Mission 04: Weather gauge',
    '  A servo needle shows the temperature (or humidity) measured by a DHT11.',
    '  Press the button to switch modes. The L LED is on in humidity mode.',
    '*/',
    '#include <Servo.h>',
    '#include <DHT.h>',
    '',
    'const int DHT_PIN = 2;',
    'const int MODE_BUTTON = 4;',
    'const int SERVO_PIN = 9;',
    '',
    '// the scales on your dial (left end = 0, right end = 180)',
    'const int LOW_TEMP = 0;',
    'const int HIGH_TEMP = 40;',
    'const int LOW_HUM = 20;',
    'const int HIGH_HUM = 90;',
    '',
    'DHT dht(DHT_PIN, DHT11);',
    'Servo needle;',
    '',
    'bool showHumidity = false;   // true = humidity mode',
    'int needleAngle = 90;        // where the needle is now',
    'int lastTarget = -1;         // last target printed',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  dht.begin();',
    '  needle.attach(SERVO_PIN);',
    '  needle.write(needleAngle);',
    '  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW',
    '  pinMode(LED_BUILTIN, OUTPUT);',
    '}',
    '',
    'void loop() {',
    '  // 1. the button switches modes',
    '  if (digitalRead(MODE_BUTTON) == LOW) {',
    '    showHumidity = !showHumidity;',
    '    digitalWrite(LED_BUILTIN, showHumidity);',
    '    while (digitalRead(MODE_BUTTON) == LOW) {',
    '      // wait until the button is let go',
    '    }',
    '    delay(50);',
    '  }',
    '',
    '  // 2. read the sensor and work out where the needle should point',
    '  float reading;',
    '  if (showHumidity) reading = dht.readHumidity();',
    '  else reading = dht.readTemperature();',
    '  if (isnan(reading)) return;   // no reading this time',
    '',
    '  int target;',
    '  if (showHumidity) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);',
    '  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);',
    '  target = constrain(target, 0, 180);   // stay on the dial',
    '',
    '  if (target != lastTarget) {   // print only changes',
    '    Serial.print(showHumidity ? "Humidity " : "Temperature ");',
    '    Serial.print(reading, 0);',
    '    Serial.print(" -> needle to ");',
    '    Serial.println(target);',
    '    lastTarget = target;',
    '  }',
    '',
    '  // 3. move the needle one degree at a time (smooth)',
    '  if (needleAngle < target) needleAngle++;',
    '  if (needleAngle > target) needleAngle--;',
    '  needle.write(needleAngle);',
    '  delay(15);',
    '}'].join('\n');

  /* ================= art helpers ================= */
  /* a dial: scales [{ lo, hi, step, r, unit, col }], returns { set(angle), g } — angle 0 = left end, 180 = right end */
  function dialArt(svg, cx, cy, R, scales, o) {
    o = o || {};
    var g = S('g', {}, svg);
    if (o.card !== false) {
      S('path', { d: 'M' + (cx - R - 18) + ' ' + (cy + 26) + ' L' + (cx - R - 18) + ' ' + cy + ' A' + (R + 18) + ' ' + (R + 18) + ' 0 0 1 ' + (cx + R + 18) + ' ' + cy + ' L' + (cx + R + 18) + ' ' + (cy + 26) + ' Z', fill: CB, stroke: CBD, 'stroke-width': 3 }, g);
    }
    var ink = o.card === false ? INK : CINK;
    (o.zones || []).forEach(function (z) { S('path', { d: arcPath(cx, cy, z.r, z.a0, z.a1), stroke: z.col, 'stroke-width': z.w || 10, fill: 'none', opacity: z.op || 0.85 }, g); });
    scales.forEach(function (sc) {
      var n = Math.round((sc.hi - sc.lo) / sc.step);
      for (var i = 0; i <= n; i++) {
        var a = i / n * 180, p0 = pt(cx, cy, sc.r, a), p1 = pt(cx, cy, sc.r - (sc.tick || 14), a), pl = pt(cx, cy, sc.r - (sc.tick || 14) - 14, a);
        S('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: sc.col || ink, 'stroke-width': 2.5 }, g);
        if (!sc.every || i % sc.every === 0) T(g, pl[0], pl[1] + 4, String(sc.lo + i * sc.step), { 'text-anchor': 'middle', 'font-size': sc.fs || 13, fill: sc.col || ink, 'font-weight': 600 });
      }
      if (sc.unit) T(g, cx + (sc.ux || 0), cy + (sc.uy != null ? sc.uy : -14), sc.unit, { 'text-anchor': 'middle', 'font-size': 12, fill: sc.col || ink, 'letter-spacing': '2', 'font-weight': 600 });
    });
    var ng = S('g', {}, g), L = o.len || R * 0.92;
    S('rect', { x: cx - 6, y: cy - L, width: 12, height: L + 14, rx: 6, fill: STICK, stroke: '#c4a978', 'stroke-width': 1.5 }, ng);
    S('path', { d: 'M' + (cx - 6) + ' ' + (cy - L + 14) + ' L' + cx + ' ' + (cy - L - 8) + ' L' + (cx + 6) + ' ' + (cy - L + 14) + ' Z', fill: o.tip || '#e5484d' }, ng);
    S('circle', { cx: cx, cy: cy, r: 13, fill: '#f4f7fb', stroke: '#c9d3de', 'stroke-width': 2 }, g);
    S('circle', { cx: cx, cy: cy, r: 4, fill: '#9aa5b1' }, g);
    var api = { g: g, set: function (a) { a = Math.max(0, Math.min(180, a)); ng.setAttribute('transform', 'rotate(' + (a - 90).toFixed(2) + ' ' + cx + ' ' + cy + ')'); api.a = a; }, a: 90 };
    api.set(o.angle != null ? o.angle : 90);
    return api;
  }
  function dhtIcon(g, x, y, s) {
    s = s || 1;
    var gg = S('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, g);
    S('rect', { x: 0, y: 0, width: 56, height: 76, rx: 4, fill: '#1d5fa8', stroke: '#2e74c3', 'stroke-width': 1.2 }, gg);
    S('rect', { x: 12, y: 6, width: 32, height: 46, rx: 3, fill: '#4aa3f0', stroke: '#9fd0fa' }, gg);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) S('rect', { x: 16 + j * 9, y: 11 + i * 10, width: 6, height: 6, fill: '#1d5fa8' }, gg);
    T(gg, 28, 68, 'DHT11', { 'text-anchor': 'middle', 'font-size': 8 });
    return gg;
  }
  function gearPath(r, teeth) {
    var d = '', n = teeth * 4;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = (i % 4 < 2) ? r + 4 : r - 3; d += (i ? 'L' : 'M') + (rr * Math.cos(a)).toFixed(1) + ' ' + (rr * Math.sin(a)).toFixed(1); }
    return d + 'Z';
  }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '5 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m04;
    var wrap = el('div', 'brief');
    var left = el('div', '');
    left.innerHTML = '<p class="lead">Weather stations, car dashboards and old-school thermostats all have the same job: measure something invisible and show it so anyone can read it at a glance. In this mission you’ll build a weather gauge — a cardboard dial with a needle that swings to show the temperature, and flips to humidity at the press of a button.</p>' +
      '<p>You’ll meet your first <b>sensor modules</b> and <b>libraries</b>, find out how a servo motor always knows its angle, and use maths to turn a temperature into a needle position. Then you’ll add a second thermometer and find out which one you trust.</p>';
    UI.edp(left, [2, 3, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360, frames: [{
      cap: 'Breathe on the sensor and the temperature climbs. Press the mode button and the same needle shows humidity on the inner scale (the L LED tells you which mode you’re in).',
      draw: function (svg, _, st) {
        clear(svg); glowDefs(svg); bg(svg, 800, 360);
        var d = dialArt(svg, 270, 300, 200, [
          { lo: 0, hi: 40, step: 5, r: 200, unit: '°C', ux: -62, fs: 14 },
          { lo: 20, hi: 90, step: 10, r: 136, unit: '% RH', ux: 62, fs: 11, tick: 10, col: '#2c5f8a' }
        ], { zones: [{ r: 208, a0: 0, a1: 67, col: '#4da3ff', w: 8 }, { r: 208, a0: 81, a1: 108, col: '#3ee07a', w: 8 }, { r: 208, a0: 135, a1: 180, col: '#ff4d4d', w: 8 }] });
        dhtIcon(svg, 560, 40, 1.2);
        var breath = S('g', { opacity: 0 }, svg);
        [[660, 80, 14], [686, 60, 18], [660, 40, 11]].forEach(function (c) { S('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#cfe3f5', opacity: 0.35 }, breath); });
        var mode = T(svg, 560, 180, 'MODE · TEMPERATURE', { 'font-size': 11, fill: MUT, 'letter-spacing': '1.5' });
        var big = T(svg, 560, 228, '22 °C', { 'font-size': 38, fill: CY, 'font-weight': 600 });
        var ledG = S('circle', { cx: 572, cy: 272, r: 16, fill: 'url(#m4-yellow)', opacity: 0 }, svg);
        var led = S('rect', { x: 566, y: 268, width: 12, height: 8, rx: 1, fill: '#d9b36b', opacity: 0.5 }, svg);
        T(svg, 588, 276, 'L LED · humidity mode', { 'font-size': 11, fill: MUT });
        st.v = 22; st.hum = false; st.target = 22;
        loopAnim(st, function () {
          st.v += (st.target - st.v) * 0.035;
          var a = st.hum ? (st.v - 20) / 70 * 180 : st.v / 40 * 180;
          d.set(a); big.textContent = Math.round(st.v) + (st.hum ? ' %' : ' °C');
        });
        var seq = [
          [function () { st.hum = false; st.v = 22; st.target = 22; breath.setAttribute('opacity', 0); }, 'MODE · TEMPERATURE', 1800],
          [function () { st.target = 31; breath.setAttribute('opacity', 1); }, 'BREATHING ON IT', 2600],
          [function () { st.target = 23; breath.setAttribute('opacity', 0); }, 'COOLING DOWN', 2600],
          [function () { st.hum = true; st.v = 40; st.target = 40; led.setAttribute('fill', '#ffb020'); led.setAttribute('opacity', 1); ledG.setAttribute('opacity', 1); }, 'MODE · HUMIDITY', 1800],
          [function () { st.target = 78; breath.setAttribute('opacity', 1); }, 'BREATH IS DAMP AIR', 2600],
          [function () { st.target = 42; breath.setAttribute('opacity', 0); led.setAttribute('fill', '#d9b36b'); led.setAttribute('opacity', 0.5); ledG.setAttribute('opacity', 0); }, 'DRYING OUT', 2400]
        ];
        var i = 0;
        (function next() { var s = seq[i % seq.length]; s[0](); mode.textContent = s[1]; i++; st.later(next, s[2]); })();
      } }] });
    UI.callout(b, 'safety', 'Safety', '<p>A servo is a motor: keep fingers and hair clear of the needle while code is running, and <b>unplug the USB cable while you change wiring</b>. Hot glue burns — hold parts by the edges and let the glue cool.</p>');
  } });

  /* ---------- 02 sensors ---------- */
  steps.push({ id: 'sensors', title: 'Sensing the weather', stage: '02 Research', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A robot can’t feel warm or cold. It needs <b>sensors</b>: parts that turn something in the physical world into an electrical signal the UNO can measure. This mission uses two very different temperature sensors, and the difference between them is one of the big ideas in electronics.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Analog and digital sensors', w: 820, h: 360,
      init: function (svg) { glowDefs(svg); },
      frames: [
        { cap: '<b>A sensor is a translator.</b> It turns a physical quantity — heat, moisture, light, distance — into an electrical signal. The UNO turns that signal into a number your code can use. There are two ways the signal can travel: <b>analog</b> and <b>digital</b>.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 360);
          var boxes = [[40, 'THE WORLD', 'heat · moisture'], [320, 'SENSOR', 'translates'], [600, 'UNO', 'a number']];
          boxes.forEach(function (bx) { S('rect', { x: bx[0], y: 110, width: 180, height: 140, rx: 10, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg); T(svg, bx[0] + 90, 96, bx[1], { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' }); T(svg, bx[0] + 90, 280, bx[2], { 'text-anchor': 'middle', fill: MUT, 'font-size': 12, 'font-family': SANS }); });
          var sun = S('g', { transform: 'translate(100 180)' }, svg);
          S('circle', { r: 22, fill: '#ffd23f' }, sun);
          for (var k = 0; k < 8; k++) S('line', { x1: 30 * Math.cos(k * Math.PI / 4), y1: 30 * Math.sin(k * Math.PI / 4), x2: 40 * Math.cos(k * Math.PI / 4), y2: 40 * Math.sin(k * Math.PI / 4), stroke: '#ffd23f', 'stroke-width': 3, 'stroke-linecap': 'round' }, sun);
          S('path', { d: 'M170 150 C 156 172, 150 182, 150 194 a20 20 0 0 0 40 0 c0 -12 -6 -22 -20 -44z', fill: '#4da3ff' }, svg);
          dhtIcon(svg, 342, 140, 0.95);
          S('ellipse', { cx: 460, cy: 180, rx: 9, ry: 12, fill: '#1c1f24', stroke: '#4b5563', 'stroke-width': 2 }, svg);
          S('path', { d: 'M456 192 v40 M464 192 v40', stroke: '#b8c2cc', 'stroke-width': 2 }, svg);
          T(svg, 460, 160, 'THERMISTOR', { 'text-anchor': 'middle', 'font-size': 8, fill: MUT });
          S('rect', { x: 620, y: 140, width: 140, height: 80, rx: 6, fill: '#15497a', stroke: '#2e6aa3' }, svg);
          var num = T(svg, 690, 190, '22.4', { 'text-anchor': 'middle', 'font-size': 26, fill: CY, 'font-weight': 600 });
          [[220, 320], [500, 600]].forEach(function (a) { S('line', { x1: a[0] + 4, y1: 180, x2: a[1] - 8, y2: 180, stroke: '#9fb3c8', 'stroke-width': 2 }, svg); S('path', { d: 'M' + (a[1] - 8) + ' 174 l8 6 -8 6z', fill: '#9fb3c8' }, svg); });
          var dots = [0, 1, 2, 3].map(function () { return S('circle', { r: 4.5, fill: CY }, svg); });
          loopAnim(st, function (t) {
            dots.forEach(function (d, i) { var f = (t * 0.6 + i / 4) % 1, x = f < 0.5 ? 224 + f * 2 * 92 : 504 + (f - 0.5) * 2 * 92; d.setAttribute('cx', x); d.setAttribute('cy', 180); });
            num.textContent = (22 + Math.sin(t * 0.8) * 1.5).toFixed(1);
          });
        } },
        { cap: '<b>Analog: the signal is a voltage that can be anything in between.</b> A <b>thermistor</b> is a resistor whose resistance <i>drops</i> as it warms up. Put it in a voltage divider (like the light sensor in Mission 02) and the voltage at A0 rises smoothly with temperature. <code>analogRead(A0)</code> gives 0–1023, and <i>your code</i> does the maths to turn that into degrees.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 360);
          T(svg, 40, 34, 'ANALOG · THE THERMISTOR', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          T(svg, 120, 66, '5V', { 'text-anchor': 'middle', fill: '#e5484d', 'font-weight': 600, 'font-size': 14 });
          S('path', { d: 'M120 74 V100 M120 160 V250 M120 300 V318', stroke: '#9fb3c8', 'stroke-width': 3, fill: 'none' }, svg);
          var heat = S('circle', { cx: 120, cy: 130, r: 60, fill: 'url(#m4-heat)', opacity: 0.2 }, svg);
          S('rect', { x: 104, y: 100, width: 32, height: 60, rx: 4, fill: '#1c1f24', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
          S('path', { d: 'M96 166 L144 96 M144 96 l-10 2 M144 96 l-2 10', stroke: CY, 'stroke-width': 2, fill: 'none' }, svg);
          T(svg, 150, 124, 'THERMISTOR', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
          var rl = T(svg, 150, 142, '', { 'font-size': 12, fill: CY });
          S('circle', { cx: 120, cy: 205, r: 5, fill: '#9fb3c8' }, svg);
          S('line', { x1: 120, y1: 205, x2: 218, y2: 205, stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
          S('rect', { x: 218, y: 190, width: 52, height: 30, rx: 3, fill: '#15497a', stroke: '#2e6aa3' }, svg); T(svg, 244, 210, 'A0', { 'text-anchor': 'middle' });
          RL.drawResistorBody(S('g', { transform: 'translate(120 275) rotate(90)' }, svg), 10000, 50, 20);
          T(svg, 140, 280, '10 kΩ', { 'font-size': 11, fill: MUT });
          S('path', { d: 'M102 318 h36 M108 325 h24 M114 332 h12', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
          var tl = T(svg, 300, 96, '', { 'font-size': 22, fill: INK, 'font-weight': 600 });
          T(svg, 300, 70, 'TEMPERATURE', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
          T(svg, 300, 260, 'analogRead(A0)', { 'font-size': 11, fill: MUT });
          var rd = T(svg, 300, 290, '', { 'font-size': 22, fill: CY, 'font-weight': 600 }), vd = T(svg, 300, 316, '', { 'font-size': 13, fill: MUT });
          // voltage plot
          S('rect', { x: 450, y: 60, width: 340, height: 250, fill: '#0b1422', stroke: GRID }, svg);
          T(svg, 460, 52, 'VOLTAGE AT A0 OVER TIME', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          [0, 1.25, 2.5, 3.75, 5].forEach(function (v) { var y = 300 - v / 5 * 230; S('line', { x1: 450, y1: y, x2: 790, y2: y, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 444, y + 4, v + ' V', { 'text-anchor': 'end', 'font-size': 9, fill: MUT }); });
          var line = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
          T(svg, 620, 336, 'SMOOTH: ANY VALUE IN BETWEEN', { 'text-anchor': 'middle', 'font-size': 11, fill: CY, 'letter-spacing': '1.5' });
          var pts = [];
          loopAnim(st, function (t) {
            var c = 24 + 9 * Math.sin(t * 0.9) + 3 * Math.sin(t * 2.3), R = thermR(c), V = 5 * 10000 / (R + 10000), r = Math.round(V / 5 * 1023);
            heat.setAttribute('opacity', Math.max(0.05, (c - 12) / 30));
            rl.textContent = (R / 1000).toFixed(1) + ' kΩ'; tl.textContent = c.toFixed(1) + ' °C'; rd.textContent = String(r); vd.textContent = '= ' + V.toFixed(2) + ' V at A0';
            pts.push(V); if (pts.length > 170) pts.shift();
            line.setAttribute('points', pts.map(function (v, i) { return (450 + i * 2) + ',' + (300 - v / 5 * 230).toFixed(1); }).join(' '));
          });
        } },
        { cap: '<b>Digital: the sensor does the measuring and sends finished numbers.</b> Inside the DHT11 is its own tiny chip. When the UNO asks, it sends 40 bits down one wire as HIGH pulses: a <b>short</b> pulse means 0, a <b>long</b> pulse means 1. Five bytes come back — humidity, temperature and a checksum to catch mistakes. Decoding the pulses is fiddly, so you’ll use a <b>library</b> that does it for you.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 360);
          T(svg, 40, 34, 'DIGITAL · THE DHT11', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          dhtIcon(svg, 22, 120, 1.2);
          T(svg, 56, 238, 'a tiny chip inside', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT, 'font-family': SANS });
          S('rect', { x: 690, y: 130, width: 100, height: 70, rx: 6, fill: '#15497a', stroke: '#2e6aa3' }, svg); T(svg, 740, 170, 'PIN 2', { 'text-anchor': 'middle' });
          S('rect', { x: 130, y: 100, width: 548, height: 130, fill: '#0b1422', stroke: GRID }, svg);
          if (!svg.querySelector('#m4-clip')) S('clipPath', { id: 'm4-clip' }, svg.querySelector('defs')).appendChild(S('rect', { x: 130, y: 100, width: 548, height: 130 }));
          var tr = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3, 'clip-path': 'url(#m4-clip)' }, svg);
          T(svg, 124, 134, 'HIGH', { 'text-anchor': 'end', 'font-size': 9, fill: MUT }); T(svg, 124, 204, 'LOW', { 'text-anchor': 'end', 'font-size': 9, fill: MUT });
          var bytes = [['HUMIDITY', 45, ' %'], ['(DECIMAL)', 0, ''], ['TEMPERATURE', 22, ' °C'], ['(DECIMAL)', 0, ''], ['CHECKSUM', 67, ' ✓']];
          var bits = []; bytes.forEach(function (by) { for (var k = 7; k >= 0; k--) bits.push((by[1] >> k) & 1); });
          var labels = bytes.map(function (by, i) {
            var x = 70 + i * 150, g = S('g', { opacity: 0.2 }, svg);
            T(g, x + 60, 270, by[0], { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
            T(g, x + 60, 292, ('00000000' + by[1].toString(2)).slice(-8), { 'text-anchor': 'middle', 'font-size': 13, fill: INK });
            T(g, x + 60, 318, '= ' + by[1] + by[2], { 'text-anchor': 'middle', 'font-size': 15, fill: CY, 'font-weight': 600 });
            return g;
          });
          var bitLab = T(svg, 404, 92, '', { 'text-anchor': 'middle', 'font-size': 11, fill: CY, 'letter-spacing': '1' });
          // each bit: LOW 50 µs then HIGH 27 µs (0) or 70 µs (1); 1 µs = 1.6 px
          var xs = [], x = 0; bits.forEach(function (bt) { xs.push(x); x += (50 + (bt ? 70 : 27)) * 1.6; });
          var total = x;
          loopAnim(st, function (t) {
            var off = (t * 900) % (total + 900) - 300, pts = [];
            for (var i = 0; i < bits.length; i++) {
              var x0 = 678 - off + xs[i] - total * 0, x1 = x0 + 80, x2 = x1 + (bits[i] ? 112 : 43);
              if (x2 < 120 || x0 > 690) continue;
              pts.push(x0 + ',200', x1 + ',200', x1 + ',130', x2 + ',130', x2 + ',200');
            }
            tr.setAttribute('points', pts.join(' '));
            var done = 0; for (var j = 0; j < bits.length; j++) if (678 - off + xs[j] + 120 < 404) done = j + 1;
            labels.forEach(function (g, k) { g.setAttribute('opacity', done >= (k + 1) * 8 ? 1 : 0.2); });
            bitLab.textContent = done ? 'BIT ' + done + ' / 40' : 'WAITING FOR DATA';
          });
        } },
        { cap: '<b>So which is better?</b> Neither — they’re different tools. Analog sensors are simple and fast, but you do the maths and noise sneaks into the voltage. Digital sensors hand you finished, labelled numbers, but you need a library and they can be slow (a DHT11 can only measure once every 2 seconds). Your gauge uses both, so you can compare them.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 360);
          [[40, 'ANALOG', 'Thermistor on A0', ['A voltage anywhere from 0 to 5 V', 'analogRead() gives 0–1023', 'You turn it into °C with a formula', 'Fast: thousands of readings a second', 'Electrical noise can wobble it']],
           [430, 'DIGITAL', 'DHT11 on pin 2', ['Only HIGH or LOW: the pattern is the message', 'The sensor’s chip measures for you', 'A library decodes temperature and humidity', 'Slow: one reading every 2 seconds', 'Whole degrees only (±2 °C)']]].forEach(function (c, ci) {
            var g = S('g', { opacity: 0 }, svg);
            S('rect', { x: c[0], y: 40, width: 350, height: 290, rx: 10, fill: '#0e1826', stroke: ci ? CY : '#9fb3c8', 'stroke-width': 2 }, g);
            T(g, c[0] + 24, 76, c[1], { fill: CY, 'font-size': 16, 'letter-spacing': '3', 'font-weight': 600 });
            T(g, c[0] + 24, 100, c[2], { fill: MUT, 'font-size': 12, 'font-family': SANS });
            c[3].forEach(function (line, i) { T(g, c[0] + 24, 142 + i * 36, '·  ' + line, { 'font-size': 14, 'font-family': SANS }); });
            st.later(function () { g.setAttribute('opacity', 1); g.classList.add('part-new'); }, 200 + ci * 600);
          });
        } }
      ] });
    UI.html(b, '<h2>What is relative humidity?</h2><p>Air always has some invisible water vapour in it. Warm air can hold much more vapour than cold air. <b>Relative humidity (RH)</b> is how full the air is, as a percentage of the most it could hold <i>at that temperature</i>. 100% means the air is completely full: any more water and it turns into droplets — fog, dew, or the mist on a cold bathroom mirror.</p><p>Change the temperature and the amount of water in the lab below. Watch what happens to the humidity when you cool the air down <i>without</i> changing the water.</p>');
    rhLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-sens1', q: 'Which statement about your two sensors is true?', options: ['The thermistor sends numbers; the DHT11 sends a voltage', 'The thermistor gives a voltage the UNO measures; the DHT11 sends its readings as a pattern of HIGH and LOW pulses', 'Both are analog sensors', 'Both need a library'], answer: 1, explain: 'The thermistor changes the voltage at A0 (analog). The DHT11’s own chip measures and sends finished numbers as pulses (digital).', hints: { 0: 'It’s the other way around.', 3: 'Only the DHT11 needs a library to decode its pulses. The thermistor just needs analogRead().' } });
    UI.mcq(b, ctx, { id: 'q-sens2', q: 'On a clear night the air cools from 20 °C to 8 °C, but the amount of water vapour in it stays the same. What happens to the relative humidity?', options: ['It goes down, because cold air is dry', 'It stays the same, because the water didn’t change', 'It goes up — and may reach 100%, so dew forms on the grass', 'It drops to 0%'], answer: 2, explain: 'Cold air can hold less vapour, so the same amount of water fills a bigger share of it. At 100% the extra condenses into dew.', hints: { 0: 'The amount of water didn’t change. What changed is how much the air <i>could</i> hold.', 1: 'RH compares the water to how much the air could hold — and that depends on temperature.' } });
    UI.numq(b, ctx, { id: 'q-sens3', q: 'The thermistor’s voltage divider gives <code>analogRead(A0)</code> = <b>600</b>. What voltage is that? (Remember 1023 ↔ 5 V, from Mission 02.)', answer: 2.93, tol: 0.03, unit: 'V', explain: '600 ÷ 1023 × 5 = <b>2.93 V</b>. Your code will turn readings like this into degrees.', hint: 'Divide the reading by 1023, then multiply by 5.' });
  } });
  function rhLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The humidity lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 280', role: 'img', 'aria-label': 'A box of air with water vapour and a jug showing how full it is' }); stage.appendChild(svg);
    bg(svg, 800, 280);
    T(svg, 40, 30, 'A BOX OF AIR', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
    var air = S('rect', { x: 40, y: 44, width: 320, height: 210, rx: 8, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
    var molG = S('g', {}, svg), fogG = S('g', {}, svg);
    T(svg, 420, 30, 'HOW FULL IS THE AIR?', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
    var jug = S('rect', { x: 420, y: 44, width: 80, height: 210, fill: 'none', stroke: '#9fb3c8', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, svg);
    var water = S('rect', { x: 422, y: 200, width: 76, height: 52, fill: '#1e6fa8', opacity: 0.85 }, svg);
    var capL = T(svg, 508, 60, '', { 'font-size': 11, fill: MUT });
    var drips = S('g', { opacity: 0 }, svg);
    [[440, 266], [460, 272], [480, 266]].forEach(function (d) { S('circle', { cx: d[0], cy: d[1], r: 4, fill: '#4da3ff' }, drips); });
    var rh = T(svg, 700, 150, '', { 'font-size': 40, fill: CY, 'font-weight': 600, 'text-anchor': 'middle' });
    T(svg, 700, 178, 'RELATIVE HUMIDITY', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5', 'text-anchor': 'middle' });
    var warn = T(svg, 700, 214, '', { 'font-size': 12, fill: SIG, 'text-anchor': 'middle', 'letter-spacing': '1' });
    var temp = 22, vap = 8, mols = [];
    for (var i = 0; i < 140; i++) mols.push({ x: 50 + Math.random() * 300, y: 54 + Math.random() * 190, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, el: S('circle', { r: 3.2, fill: '#7dd3fc' }, molG) });
    var fog = []; for (var k = 0; k < 40; k++) fog.push(S('circle', { cx: 50 + Math.random() * 300, cy: 54 + Math.random() * 190, r: 7 + Math.random() * 9, fill: '#cfe3f5', opacity: 0 }, fogG));
    function cap(c) { return 5.018 + 0.32321 * c + 8.1847e-3 * c * c + 3.1243e-4 * c * c * c; }
    var ctl = el('div', ''); box.appendChild(ctl);
    slider(ctl, 'Air temperature', 0, 40, 1, temp, function (v) { return v + ' °C'; }, function (v) { temp = v; upd(); ctx.check('lab-rh', 1); });
    slider(ctl, 'Water vapour', 1, 30, 0.5, vap, function (v) { return v + ' g/m³'; }, function (v) { vap = v; upd(); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    function upd() {
      var c = cap(temp), full = vap / c, pct = Math.min(100, Math.round(full * 100));
      var n = Math.round(Math.min(vap, c) * 4.6);
      mols.forEach(function (m, i) { m.el.setAttribute('opacity', i < n ? 1 : 0); });
      var h = 206 * Math.min(1, c / 52), fill = 206 * Math.min(1, Math.min(vap, c) / 52);
      jug.setAttribute('y', 252 - h); jug.setAttribute('height', h);
      water.setAttribute('y', 252 - fill); water.setAttribute('height', fill);
      capL.setAttribute('y', 256 - h); capL.textContent = '← max ' + c.toFixed(1) + ' g/m³';
      var over = vap > c;
      drips.setAttribute('opacity', over ? 1 : 0);
      fog.forEach(function (f, i) { f.setAttribute('opacity', over ? Math.min(0.5, (vap - c) / 6) * (i % 3 ? 1 : 0.6) : 0); });
      rh.textContent = pct + '%'; warn.textContent = over ? 'FULL: WATER CONDENSES' : pct > 80 ? 'VERY HUMID' : pct < 30 ? 'DRY AIR' : '';
      ro.innerHTML = '<div><span class="label">Air can hold</span><b>' + c.toFixed(1) + ' g/m³</b></div><div><span class="label">Water in the air</span><b>' + Math.min(vap, c).toFixed(1) + ' g/m³</b></div>' +
        '<div><span class="label">Working</span><span class="small">' + Math.min(vap, c).toFixed(1) + ' ÷ ' + c.toFixed(1) + ' × 100 = ' + pct + '% RH</span></div>' +
        '<div><span class="label">The DHT11 says</span><span class="small">' + (temp) + ' °C · ' + Math.max(20, Math.min(90, pct)) + '% RH' + (pct > 90 || pct < 20 ? ' (its range is 20–90%)' : '') + '</span></div>';
    }
    var last = performance.now(), raf;
    (function tick(t) {
      var dt = Math.min(0.05, (t - last) / 1000), sp = 0.5 + temp / 25; last = t;
      mols.forEach(function (m) { m.x += m.vx * dt * sp; m.y += m.vy * dt * sp; if (m.x < 46 || m.x > 354) m.vx *= -1; if (m.y < 50 || m.y > 248) m.vy *= -1; m.el.setAttribute('cx', m.x.toFixed(1)); m.el.setAttribute('cy', m.y.toFixed(1)); });
      raf = requestAnimationFrame(tick);
    })(last);
    if (RL.onLeave) RL.onLeave(function () { cancelAnimationFrame(raf); });
    upd();
    UI.html(b, '<p class="small muted">Comfortable indoor air is about 30–50% RH. In an Alberta winter, indoor air can drop below 20% — that’s why you get static shocks and dry skin. Your DHT11 measures 20–90% RH (±5%) and 0–50 °C (±2 °C), so it’s an indoor sensor: it can’t read below freezing.</p>');
  }

  /* ---------- 03 build ---------- */
  steps.push({ id: 'build', title: 'Build: the gauge circuit', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Everything for the gauge goes on one breadboard: the servo, the DHT11, the thermistor and a mode button. The servo and DHT11 are <b>modules</b> that sit beside the breadboard and connect with wires.</p>');
    UI.html(b, '<h2>Find your parts</h2>');
    UI.gear(b, ctx, 'kit', [
      { id: 'servo', name: 'SG90 servo', note: 'Blue, with a bag of white horns', icon: function (svg, S) { S('rect', { x: 34, y: 20, width: 52, height: 38, rx: 3, fill: '#2563eb' }, svg); S('rect', { x: 26, y: 26, width: 68, height: 7, rx: 2, fill: '#1d4ed8' }, svg); S('circle', { cx: 48, cy: 20, r: 7, fill: '#f4f7fb' }, svg); S('rect', { x: 45, y: 4, width: 6, height: 18, rx: 3, fill: '#f4f7fb' }, svg); ['#7b4a12', '#e5484d', '#fb923c'].forEach(function (c, i) { S('path', { d: 'M86 ' + (50 + i * 3) + ' C 100 50, 104 60, 112 ' + (58 + i * 3), stroke: c, 'stroke-width': 2.5, fill: 'none' }, svg); }); } },
      { id: 'dht', name: 'DHT11 module', note: 'Blue grille, pins S + −', icon: function (svg, S) { S('rect', { x: 40, y: 8, width: 40, height: 54, rx: 3, fill: '#1d5fa8' }, svg); S('rect', { x: 48, y: 12, width: 24, height: 32, rx: 2, fill: '#4aa3f0' }, svg); [0, 1, 2].forEach(function (i) { S('rect', { x: 50 + i * 8, y: 60, width: 3, height: 9, fill: '#c9b458' }, svg); }); } },
      { id: 'therm', name: 'Thermistor', note: 'Black bead, two legs', icon: function (svg, S) { S('ellipse', { cx: 60, cy: 24, rx: 9, ry: 12, fill: '#1c1f24', stroke: '#4b5563' }, svg); S('path', { d: 'M56 36 v28 M64 36 v28', stroke: '#b8c2cc', 'stroke-width': 2 }, svg); } },
      { id: 'res', name: '10 kΩ resistor', note: RL.resistorName(10000), icon: function (svg, S) { S('line', { x1: 10, y1: 35, x2: 110, y2: 35, stroke: '#b8c2cc', 'stroke-width': 2 }, svg); RL.drawResistorBody(S('g', { transform: 'translate(60 35)' }, svg), 10000, 50, 13); } },
      { id: 'btn', name: 'Push button', note: 'For the mode switch', icon: function (svg, S) { S('rect', { x: 40, y: 14, width: 40, height: 40, rx: 3, fill: '#1c2129' }, svg); S('circle', { cx: 60, cy: 34, r: 11, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg); } },
      { id: 'fm', name: 'Female-to-male wires', note: '3 for the DHT11 (the servo plug takes male pins)', icon: function (svg, S) { S('path', { d: 'M14 40 C 40 10, 80 70, 100 40', stroke: '#facc15', 'stroke-width': 3.5, fill: 'none' }, svg); S('rect', { x: 4, y: 34, width: 14, height: 12, fill: '#111' }, svg); S('line', { x1: 100, y1: 40, x2: 112, y2: 40, stroke: '#c0c8d0', 'stroke-width': 2 }, svg); } }
    ]);
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable while you build. Double-check the DHT11’s <b>+</b> and <b>−</b> before you power up: reversing them can destroy the sensor.</p>');
    B.guide(b, { title: 'Weather gauge circuit', parts: ALL, base: [], vb: B.WIDE, steps: [
      { title: 'Power the rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p>Same as every mission: <b>5V → + rail</b> (red), <b>GND → − rail</b> (black), and bridge both pairs of rails at the bottom so power reaches the right side too.</p>' },
      { title: 'Servo power', add: ['servo', 'sv_g', 'sv_v'], html: '<p>The servo’s plug has three sockets. Push the male end of a jumper into each one. <b>Brown</b> is ground → right <b>− rail</b>. <b>Red</b> is power → right <b>+ rail</b>.</p><p class="small muted">Servo wire colours: brown (−), red (+), orange (signal). Some servos use black, red, white instead.</p>' },
      { title: 'Servo signal → pin 9', add: ['sv_s'], view: [282, 8, 720, 415], html: '<p>The <b>orange</b> signal wire goes to <b>pin 9</b>. The UNO sends it the position pulses — you’ll see how in the next step.</p>' },
      { title: 'DHT11 → pin 2', add: ['dht', 'dh_s', 'dh_v', 'dh_g'], view: [282, 140, 720, 415], html: '<p>Use three <b>female-to-male</b> wires. Module pin <b>S</b> (signal) → <b>pin 2</b>. The middle pin <b>+</b> → right <b>+ rail</b>. The <b>−</b> pin → right <b>− rail</b>.</p><p class="small muted">Read the tiny labels printed beside the pins on your module — they’re the boss, not the drawing.</p>' },
      { title: 'Thermistor', add: ['th_j', 'th'], html: '<p>Push the thermistor’s legs into <b>c20</b> and <b>c23</b> (either way round — it’s a kind of resistor). Add a red jumper from the <b>left + rail to a20</b>.</p>' },
      { title: 'The 10 kΩ resistor', add: ['th_r', 'th_g'], html: '<p>Put a <b>10 kΩ</b> resistor (' + RL.resistorName(10000) + ') from <b>e23 to e27</b>, then a black jumper from <b>a27 to the − rail</b>. The thermistor and resistor now make a <b>voltage divider</b> from 5V to GND.</p>' },
      { title: 'Divider middle → A0', add: ['th_a'], html: '<p>Run a green wire from <b>A0</b> (on the far side of the UNO) to <b>b23</b> — row 23 is the middle of the divider, between the thermistor and the resistor.</p><p>Warmer thermistor → lower resistance → <b>higher</b> voltage at A0.</p>' },
      { title: 'Mode button → pin 4', add: ['btn', 'bt_4', 'bt_g'], html: '<p>Press a button across the gap at <b>e11, f11, e13, f13</b>. Wire <b>pin 4 → a13</b>, and add a black jumper from <b>a11 to the − rail</b>.</p><p>No pull-down resistor this time: the code will use <code>INPUT_PULLUP</code>, so pin 4 reads HIGH until the button connects it to GND.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Compare row by row. Pins used: <b>9</b> servo, <b>2</b> DHT11, <b>A0</b> thermistor, <b>4</b> button. Both modules get power from the <b>right</b> rails.</p>' }
    ] });
    UI.mcq(b, ctx, { id: 'q-build', q: 'The thermistor and the 10 kΩ resistor meet in row 23. Why does the A0 wire go to row 23, and not to row 20?', options: ['Row 20 is always 5 V, so A0 would always read 1023 there', 'Row 23 is closer to the UNO', 'It doesn’t matter which row', 'Row 20 would cause a short circuit'], answer: 0, explain: 'Row 20 is joined to the + rail, so it never changes. The voltage in the middle of the divider (row 23) is the one that moves with temperature.', hints: { 2: 'Try it in your head: what voltage is row 20 connected to?', 3: 'Measuring a voltage doesn’t short anything — but would it ever change?' } });
  } });

  /* ---------- 04 servo ---------- */
  steps.push({ id: 'servo', title: 'How a servo knows its angle', stage: '02 Research', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">An ordinary motor just spins. A <b>servo</b> moves to an exact angle — 0° to 180° — and holds it, even if something pushes back. That makes it perfect for a gauge needle, a robot arm or a car’s steering. Here’s what’s inside the little blue box.</p>');
    servoExplainer(b);
    UI.html(b, '<h2>Talking to a servo: the control pulse</h2><p>The UNO tells the servo where to go with a <b>pulse</b> on the orange wire, 50 times a second (once every 20 ms). The <b>length</b> of the HIGH pulse is the message: about <b>1 ms means 0°</b>, <b>1.5 ms means 90°</b>, and <b>2 ms means 180°</b>. Drag the slider to change the pulse.</p>');
    pulseLab(b, ctx);
    UI.html(b, '<p class="small muted">Real hobby servos vary a little, so the Arduino Servo library actually stretches the range to about 0.5–2.4 ms to get the full swing out of an SG90. You never have to work out pulses yourself: <code>needle.write(90)</code> does it.</p>');
    UI.numq(b, ctx, { id: 'q-servo1', q: 'Using 1 ms = 0° and 2 ms = 180°, what angle does a <b>1.25 ms</b> pulse ask for?', answer: 45, tol: 1, unit: '°', explain: '1.25 ms is a quarter of the way from 1 to 2 ms, and a quarter of 180° is <b>45°</b>.', hint: 'How far is 1.25 between 1 and 2 (as a fraction)? Take that fraction of 180°.' });
    UI.mcq(b, ctx, { id: 'q-servo2', q: 'You push the needle with your finger while the servo is holding 90°. It pushes back. How does it know it’s been moved?', options: ['The motor feels it', 'The potentiometer on the output shaft reports the new angle, and the control board drives the motor back', 'The UNO sends a stronger pulse', 'It doesn’t know — it just guesses'], answer: 1, explain: 'That loop — measure, compare with the target, correct — is called <b>feedback</b>. It’s how almost every robot holds a position.', hints: { 2: 'The pulse stays exactly the same. Something <i>inside</i> the servo notices.' } });
    UI.html(b, '<h2>Libraries and objects</h2><p>Your sketches are about to start with lines like <code>#include &lt;Servo.h&gt;</code> and <code>Servo needle;</code>. Here’s what they mean.</p>');
    libExplainer(b);
    UI.html(b, '<h2>Sweep the servo</h2><p>Time to move something. The <b>Servo</b> library comes with the Arduino IDE, so there’s nothing to install. Step through the code, then run it.</p>');
    RL.Code.walk(b, SWEEP, [
      { lines: [2, 2], title: 'Include the library', html: '<p><code>#include &lt;Servo.h&gt;</code> copies the Servo library into your sketch. No semicolon: lines starting with <code>#</code> are instructions for the compiler, not for the UNO.</p>' },
      { lines: [4, 4], title: 'Make an object', html: '<p><code>Servo needle;</code> makes a Servo object called <code>needle</code> — like declaring a variable, but its type is <code>Servo</code>. You can name it anything.</p>' },
      { lines: [7, 7], title: 'attach()', html: '<p><code>needle.attach(9);</code> tells the object which pin its signal wire is on. From now on the library sends pulses to pin 9 in the background, 50 times a second.</p>' },
      { lines: [12, 15], title: 'Sweep up', html: '<p>A for loop counts from 0 to 180. Each time, <code>needle.write(angle)</code> moves to that angle, and <code>delay(15)</code> gives the motor time to get there. 181 steps × 15 ms ≈ 2.7 seconds for the whole sweep.</p>' },
      { lines: [17, 20], title: 'Sweep back', html: '<p>This loop counts <b>down</b>: it starts at 180, keeps going while <code>angle &gt;= 0</code>, and <code>angle--</code> subtracts 1 each time.</p>' }
    ], { name: 'servo_sweep' });
    RL.Sim.create(b, devices({ title: 'Sweep the servo', code: SWEEP, name: 'servo_sweep', key: 'sim-sweep', ctx: ctx, runHint: 'watch the servo on the right.', checkAfter: 6500,
      check: function (log) {
        var a = log.filter(function (e) { return e.dev === 'servo'; }).map(function (e) { return e.v; });
        var lo = Math.min.apply(null, a.concat([999])), hi = Math.max.apply(null, a.concat([-1]));
        var r = a.length < 20 ? { pass: false, msg: 'The servo barely moved. Is <code>needle.attach(9)</code> in setup(), and does loop() call <code>needle.write()</code>?' } :
          lo > 5 || hi < 175 ? { pass: false, msg: 'The servo only swung from ' + lo + '° to ' + hi + '°. Make the loops go all the way from 0 to 180.' } :
          { pass: true, msg: 'The servo swings the full 0°–180° and back. Upload it to your real servo.' };
        ctx.check('sim-sweep-pass', r.pass ? 1 : 0); return r;
      } }));
    UI.callout(b, 'plain', 'On the real board', '<ul><li>Upload the sweep and watch the servo’s shaft. Try changing the 15 to 5 (fast and jerky) or 40 (slow and smooth).</li><li><b>The UNO restarts or the servo twitches?</b> The servo is pulling too much current from USB. Check its wires are on the rails firmly, and try a different USB port.</li><li><b>Nothing moves?</b> Check the orange wire is on pin 9 and brown/red are on − and +.</li></ul>');
  } });
  function servoExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Inside a servo', w: 820, h: 380,
      init: function (svg, S, st) {
        glowDefs(svg); bg(svg, 820, 380);
        var g = S('g', {}, svg); st.g = g;
        st.parts = {};
        // wires
        st.parts.wires = S('g', {}, g);
        ['#7b4a12', '#e5484d', '#fb923c'].forEach(function (c, i) { S('path', { d: 'M62 ' + (276 + i * 10) + ' C 40 ' + (276 + i * 10) + ', 34 ' + (334 + i * 10) + ', 6 ' + (334 + i * 10), stroke: c, 'stroke-width': 5, fill: 'none' }, st.parts.wires); });
        // case
        st.parts.case = S('rect', { x: 60, y: 70, width: 420, height: 250, rx: 14, fill: '#1d4ed8', 'fill-opacity': 0.18, stroke: '#3b82f6', 'stroke-width': 2.5, 'stroke-dasharray': '8 5' }, g);
        T(g, 270, 62, 'SG90 · CUTAWAY', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
        // motor
        st.parts.motor = S('g', {}, g);
        S('rect', { x: 92, y: 196, width: 84, height: 76, rx: 10, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, st.parts.motor);
        st.rotor = S('g', {}, st.parts.motor);
        S('circle', { cx: 134, cy: 234, r: 26, fill: '#6b7785' }, st.rotor);
        [0, 120, 240].forEach(function (a) { S('path', { d: 'M134 234 L' + (134 + 24 * Math.cos(a * Math.PI / 180)) + ' ' + (234 + 24 * Math.sin(a * Math.PI / 180)), stroke: '#c9a227', 'stroke-width': 7, 'stroke-linecap': 'round' }, st.rotor); });
        T(st.parts.motor, 134, 290, 'DC MOTOR', { 'text-anchor': 'middle', 'font-size': 9, fill: INK, 'letter-spacing': '1' });
        // gears
        st.parts.gears = S('g', {}, g);
        function gearAt(cx, cy, r, n, fill) { var gg = S('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, st.parts.gears); var inner = S('g', {}, gg); S('path', { d: gearPath(r, n), fill: fill, stroke: '#f4f7fb', 'stroke-width': 1 }, inner); S('circle', { r: 4, fill: '#3b4350' }, inner); S('line', { x1: 0, y1: 0, x2: r - 6, y2: 0, stroke: '#3b4350', 'stroke-width': 2 }, inner); return inner; }
        st.gm = gearAt(196, 234, 11, 8, '#e5e7eb');
        st.g2 = gearAt(252, 196, 40, 22, '#d9e1ea'); st.g2p = gearAt(252, 196, 12, 8, '#f4f7fb');
        st.g3 = gearAt(318, 152, 34, 18, '#d9e1ea'); st.g3p = gearAt(318, 152, 11, 8, '#f4f7fb');
        st.go = gearAt(390, 128, 38, 20, '#e5e7eb');
        T(st.parts.gears, 300, 236, 'GEARS', { 'text-anchor': 'middle', 'font-size': 9, fill: INK, 'letter-spacing': '1' });
        // potentiometer under the output gear
        st.parts.pot = S('g', {}, g);
        S('line', { x1: 390, y1: 128, x2: 390, y2: 210, stroke: '#9aa5b1', 'stroke-width': 3, 'stroke-dasharray': '4 3' }, st.parts.pot);
        S('rect', { x: 360, y: 208, width: 60, height: 46, rx: 4, fill: '#1e5aa8', stroke: '#2e74c3' }, st.parts.pot);
        S('circle', { cx: 390, cy: 231, r: 15, fill: '#2b3038', stroke: '#6b7280' }, st.parts.pot);
        st.potKnob = S('line', { x1: 390, y1: 231, x2: 390, y2: 218, stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, st.parts.pot);
        T(st.parts.pot, 390, 268, 'POTENTIOMETER', { 'text-anchor': 'middle', 'font-size': 9, fill: INK, 'letter-spacing': '1' });
        // control board
        st.parts.board = S('g', {}, g);
        S('rect', { x: 92, y: 290, width: 320, height: 20, rx: 3, fill: '#1f7a3e', stroke: '#2f9a52' }, st.parts.board);
        S('rect', { x: 230, y: 293, width: 40, height: 14, fill: '#1a1d22' }, st.parts.board);
        T(st.parts.board, 330, 304, 'CONTROL BOARD', { 'text-anchor': 'middle', 'font-size': 8, fill: INK, 'letter-spacing': '1' });
        // horn (top view, on the output shaft)
        st.horn = S('g', {}, g);
        S('path', { d: 'M384 128 L387 62 L393 62 L396 128 Z', fill: '#f4f7fb', stroke: '#c9d3de' }, st.horn);
        S('circle', { cx: 390, cy: 128, r: 10, fill: '#f4f7fb', stroke: '#c9d3de' }, st.horn);
        S('circle', { cx: 390, cy: 128, r: 3, fill: '#9aa5b1' }, g);
        // right panel
        st.h1 = T(svg, 520, 92, '', { 'font-size': 14, fill: CY, 'letter-spacing': '2', 'font-weight': 600 });
        st.lines = [0, 1, 2, 3, 4].map(function (i) { return T(svg, 520, 130 + i * 30, '', { 'font-size': 14, 'font-family': SANS }); });
        st.err = S('rect', { x: 520, y: 290, width: 0, height: 12, rx: 3, fill: CY }, svg);
        st.setAngle = function (a) {
          st.a = a;
          var out = a - 90, g3 = -out * 38 / 11, g2 = -g3 * 34 / 12, m = -g2 * 40 / 12;
          st.go.setAttribute('transform', 'rotate(' + out + ')'); st.g3.setAttribute('transform', 'rotate(' + g3 + ')'); st.g3p.setAttribute('transform', 'rotate(' + g3 + ')');
          st.g2.setAttribute('transform', 'rotate(' + g2 + ')'); st.g2p.setAttribute('transform', 'rotate(' + g2 + ')'); st.gm.setAttribute('transform', 'rotate(' + m + ')');
          st.rotor.setAttribute('transform', 'rotate(' + m + ' 134 234)');
          st.horn.setAttribute('transform', 'rotate(' + out + ' 390 128)'); st.potKnob.setAttribute('transform', 'rotate(' + (out * 1.4) + ' 390 231)');
        };
        st.focus = function (keys) { Object.keys(st.parts).forEach(function (k) { st.parts[k].setAttribute('opacity', !keys || keys.indexOf(k) >= 0 ? 1 : 0.25); }); };
        st.text = function (h, ls) { st.h1.textContent = h; st.lines.forEach(function (l, i) { l.textContent = ls[i] || ''; l.setAttribute('fill', INK); }); st.err.setAttribute('width', 0); };
        st.setAngle(90);
      },
      frames: [
        { cap: '<b>Outside: three wires.</b> Brown is ground, red is power (5 V), and orange is the <b>signal</b> from the UNO that says which angle to go to. Everything else happens inside.', draw: function (svg, S, st) {
          stopAnim(st); st.focus(['wires', 'case']); st.setAngle(90);
          st.text('THREE WIRES', ['Brown  →  GND (−)', 'Red  →  5 V (+)', 'Orange  →  signal, pin 9', '', 'Servo = motor + gears + sensor + brain']);
          st.lines[0].setAttribute('fill', '#c08a4a'); st.lines[1].setAttribute('fill', '#ff6b6b'); st.lines[2].setAttribute('fill', '#fb923c');
        } },
        { cap: '<b>A tiny DC motor</b> does the work. On its own it spins thousands of times a minute but has almost no strength — you could stop it with a fingertip.', draw: function (svg, S, st) {
          st.focus(['motor', 'case']); st.text('THE MOTOR', ['Spins very fast', 'Very little force (torque)', 'Reverses when the current', 'flows the other way']);
          loopAnim(st, function (t) { st.setAngle(90 + 70 * Math.sin(t * 0.7)); });
        } },
        { cap: '<b>Gears trade speed for strength.</b> Each small gear turns a bigger one, so the output shaft turns much more slowly but with much more force. An SG90 can hold about 1.6 kg pulling 1 cm from its shaft. Watch how far the motor turns for one small move of the white horn.', draw: function (svg, S, st) {
          st.focus(['motor', 'gears', 'case']); st.text('THE GEARS', ['Small gear → big gear:', 'slower but stronger', 'Motor: many turns', 'Output shaft: a few degrees', 'Here: about 30 : 1']);
          loopAnim(st, function (t) { st.setAngle(90 + 70 * Math.sin(t * 0.7)); });
        } },
        { cap: '<b>A potentiometer is the servo’s sense of position.</b> It’s the same kind of knob you used in Mission 02, but the output shaft turns it. Its voltage tells the control board exactly which angle the shaft is at, right now.', draw: function (svg, S, st) {
          st.focus(['pot', 'gears', 'board', 'case']);
          loopAnim(st, function (t) { var a = 90 + 70 * Math.sin(t * 0.7); st.setAngle(a); st.text('THE SENSOR', ['Potentiometer on the', 'output shaft', 'Shaft angle: ' + Math.round(a) + '°', 'Pot voltage: ' + (0.5 + a / 180 * 4).toFixed(2) + ' V']); });
        } },
        { cap: '<b>Feedback: the brain compares and corrects.</b> The control board reads the pulse (the <b>target</b>) and the potentiometer (the <b>actual</b> angle). If they differ, it drives the motor toward the target and stops when the error reaches zero. Push the needle and the error grows — so the motor pushes back.', draw: function (svg, S, st) {
          st.focus(null);
          var targets = [150, 30, 120, 120, 60], a = st.a || 90, last = 0, kicked = -1, pushT = -9;
          loopAnim(st, function (t) {
            var seg = Math.floor(t / 2.6), tg = targets[seg % targets.length], dt = Math.min(0.05, t - last); last = t;
            if (seg % targets.length === 3 && t % 2.6 > 0.6 && kicked !== seg) { kicked = seg; a -= 50; pushT = t; }
            var e = tg - a, v = Math.max(-140, Math.min(140, e * 5)); if (Math.abs(e) < 0.5) v = 0;
            if (t - pushT < 0.35) v = 0;
            a += v * dt; st.setAngle(a);
            st.text('THE FEEDBACK LOOP', ['Target (from the pulse): ' + tg + '°', 'Actual (from the pot): ' + Math.round(a) + '°', 'Error: ' + Math.round(tg - a) + '°', 'Motor: ' + (v === 0 ? 'OFF — holding' : v > 0 ? 'ON →' : 'ON ←'), t - pushT < 1.4 ? 'A finger pushed the needle!' : '']);
            st.lines[4].setAttribute('fill', SIG);
            st.lines[3].setAttribute('fill', v === 0 ? GO : CY);
            st.err.setAttribute('width', Math.min(260, Math.abs(tg - a) * 2));
          });
        } }
      ] });
  }
  function pulseLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Pulse width → angle</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 300', role: 'img', 'aria-label': 'A servo control pulse and the angle it produces' }); stage.appendChild(svg);
    bg(svg, 800, 300);
    T(svg, 30, 28, 'SIGNAL ON PIN 9 · 40 ms', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    var over = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 2.5 }, svg);
    S('line', { x1: 30, y1: 104, x2: 470, y2: 104, stroke: GRID }, svg);
    var per = S('g', {}, svg);
    S('path', { d: 'M40 116 v8 M260 116 v8 M40 120 H260', stroke: MUT, 'stroke-width': 1.2 }, per); T(per, 150, 136, '20 ms (50 pulses every second)', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT });
    T(svg, 30, 160, 'ZOOMED IN · ONE PULSE', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    var X0 = 40, PX = 160;
    [[1, '1 ms', '0°'], [1.5, '1.5 ms', '90°'], [2, '2 ms', '180°']].forEach(function (m) { var x = X0 + m[0] * PX; S('line', { x1: x, y1: 186, x2: x, y2: 266, stroke: GRID, 'stroke-dasharray': '3 4' }, svg); T(svg, x, 280, m[1], { 'text-anchor': 'middle', 'font-size': 9, fill: MUT }); T(svg, x, 293, m[2], { 'text-anchor': 'middle', 'font-size': 9, fill: MUT }); });
    var zoom = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
    var wl = T(svg, 0, 194, '', { 'text-anchor': 'middle', 'font-size': 11, fill: CY });
    // servo (top view) with protractor
    var cx = 640, cy = 200;
    S('path', { d: arcPath(cx, cy, 120, 0, 180), stroke: GRID, 'stroke-width': 2, fill: 'none' }, svg);
    for (var a = 0; a <= 180; a += 15) { var p0 = pt(cx, cy, 120, a), p1 = pt(cx, cy, a % 45 ? 112 : 104, a); S('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: MUT, 'stroke-width': 1.5 }, svg); if (a % 45 === 0) { var pl = pt(cx, cy, 136, a); T(svg, pl[0], pl[1] + 4, a + '°', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); } }
    S('rect', { x: cx - 30, y: cy - 16, width: 60, height: 60, rx: 4, fill: '#2563eb', stroke: '#3b82f6' }, svg);
    var horn = S('g', {}, svg);
    S('path', { d: 'M' + (cx - 7) + ' ' + cy + ' L' + (cx - 3) + ' ' + (cy - 96) + ' L' + (cx + 3) + ' ' + (cy - 96) + ' L' + (cx + 7) + ' ' + cy + ' Z', fill: '#f4f7fb', stroke: '#c9d3de' }, horn);
    S('circle', { cx: cx, cy: cy, r: 12, fill: '#f4f7fb', stroke: '#c9d3de' }, horn);
    var al = T(svg, cx, cy + 74, '', { 'text-anchor': 'middle', 'font-size': 16, fill: CY, 'font-weight': 600 });
    var pw = 1.5, shown = 90;
    var ctl = el('div', ''); box.appendChild(ctl);
    slider(ctl, 'Pulse width', 1, 2, 0.01, pw, function (v) { return v.toFixed(2) + ' ms'; }, function (v) { pw = v; draw(); ctx.check('lab-pulse', 1); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    function draw() {
      var pts = [], pxms = 11;
      for (var k = 0; k < 2; k++) { var x0 = 40 + k * 20 * pxms; pts.push((x0 - (k ? 0 : 10)) + ',104', x0 + ',104', x0 + ',58', (x0 + pw * pxms) + ',58', (x0 + pw * pxms) + ',104'); }
      pts.push('470,104'); over.setAttribute('points', pts.join(' '));
      zoom.setAttribute('points', [[30, 260], [X0, 260], [X0, 202], [X0 + pw * PX, 202], [X0 + pw * PX, 260], [470, 260]].map(function (p) { return p.join(','); }).join(' '));
      wl.setAttribute('x', X0 + pw * PX / 2); wl.textContent = pw.toFixed(2) + ' ms';
      var ang = Math.round((pw - 1) * 180);
      ro.innerHTML = '<div><span class="label">Pulse</span><b>' + pw.toFixed(2) + ' ms HIGH</b></div><div><span class="label">Angle</span><b>' + ang + '°</b></div>' +
        '<div><span class="label">Working</span><span class="small">(' + pw.toFixed(2) + ' − 1) × 180 = ' + ang + '°</span></div><div><span class="label">In code</span><span class="small"><code>needle.write(' + ang + ');</code></span></div>';
      al.textContent = ang + '°'; target = ang;
    }
    var target = 90, raf;
    (function tick() { shown += (target - shown) * 0.12; horn.setAttribute('transform', 'rotate(' + (shown - 90).toFixed(2) + ' ' + cx + ' ' + cy + ')'); raf = requestAnimationFrame(tick); })();
    if (RL.onLeave) RL.onLeave(function () { cancelAnimationFrame(raf); });
    draw();
  }
  function libExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Libraries, classes and objects', w: 800, h: 290,
      init: function (svg, S, st) { glowDefs(svg); },
      frames: [
        { cap: '<b>A library is code someone else wrote, so you don’t have to.</b> Making servo pulses with exact timing, 50 times a second, is hard. The Servo library already does it. <code>#include &lt;Servo.h&gt;</code> brings it into your sketch.', draw: function (svg, S, st) {
          clear(svg); bg(svg, 800, 290);
          var bk = S('g', { 'class': 'part-new' }, svg);
          S('rect', { x: 80, y: 50, width: 200, height: 190, rx: 8, fill: '#15497a', stroke: '#2e6aa3', 'stroke-width': 2 }, bk);
          S('rect', { x: 80, y: 50, width: 18, height: 190, fill: '#0f3a63' }, bk);
          T(bk, 190, 90, 'Servo.h', { 'text-anchor': 'middle', 'font-size': 18, fill: CY, 'font-weight': 600 });
          ['attach(pin)', 'write(angle)', 'read()', 'detach()'].forEach(function (f, i) { T(bk, 116, 130 + i * 26, f, { 'font-size': 13 }); });
          S('path', { d: 'M300 145 H420', stroke: '#9fb3c8', 'stroke-width': 2 }, svg); S('path', { d: 'M420 139 l10 6 -10 6z', fill: '#9fb3c8' }, svg);
          S('rect', { x: 450, y: 90, width: 290, height: 110, rx: 8, fill: '#0b1422', stroke: GRID }, svg);
          T(svg, 470, 130, '#include <Servo.h>', { 'font-size': 15, fill: '#c792ea' });
          T(svg, 470, 166, '// now your sketch can use it', { 'font-size': 12, fill: MUT });
        } },
        { cap: '<b>A class is a blueprint. An object is a thing built from it.</b> <code>Servo</code> is the class. <code>Servo needle;</code> builds one object called <code>needle</code>. Need two servos? Build two objects — each one remembers its own pin and angle.', draw: function (svg, S, st) {
          clear(svg); bg(svg, 800, 290);
          S('rect', { x: 60, y: 70, width: 200, height: 150, rx: 6, fill: '#0e2a4a', stroke: '#4da3ff', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, svg);
          T(svg, 160, 60, 'CLASS · BLUEPRINT', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          T(svg, 160, 130, 'Servo', { 'text-anchor': 'middle', 'font-size': 22, fill: '#4da3ff', 'font-weight': 600 });
          T(svg, 160, 160, 'has: a pin, an angle', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT, 'font-family': SANS });
          T(svg, 160, 180, 'can: attach, write, read', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT, 'font-family': SANS });
          [['needle', 'pin 9 · 120°', 70], ['flag', 'pin 10 · 30°', 170]].forEach(function (o, i) {
            st.later(function () {
              S('path', { d: 'M262 145 C 320 145, 340 ' + (o[2] + 30) + ', 430 ' + (o[2] + 30), stroke: '#9fb3c8', 'stroke-width': 2, fill: 'none' }, svg);
              var g = S('g', { 'class': 'part-new' }, svg);
              S('rect', { x: 440, y: o[2], width: 300, height: 62, rx: 6, fill: '#0e1826', stroke: CY, 'stroke-width': 2 }, g);
              T(g, 460, o[2] + 26, 'Servo ' + o[0] + ';', { 'font-size': 15, fill: CY });
              T(g, 460, o[2] + 48, 'object: ' + o[1], { 'font-size': 12, fill: MUT });
            }, 300 + i * 700);
          });
        } },
        { cap: '<b>Use an object with a dot.</b> <code>needle.write(120);</code> means “needle, go to 120°.” The dot connects the object to one of its <b>functions</b> (also called methods). You’ll use the same pattern for the DHT11: <code>dht.readTemperature()</code>.', draw: function (svg, S, st) {
          clear(svg); bg(svg, 800, 290);
          S('rect', { x: 60, y: 100, width: 320, height: 70, rx: 8, fill: '#0b1422', stroke: GRID }, svg);
          T(svg, 84, 142, 'needle', { 'font-size': 20, fill: CY }); T(svg, 158, 142, '.', { 'font-size': 20, fill: INK }); T(svg, 172, 142, 'write', { 'font-size': 20, fill: '#82aaff' }); T(svg, 234, 142, '(120);', { 'font-size': 20, fill: INK });
          T(svg, 110, 200, 'WHICH OBJECT', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT, 'letter-spacing': '1' }); T(svg, 205, 200, 'WHAT TO DO', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT, 'letter-spacing': '1' }); T(svg, 285, 200, 'DETAILS', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT, 'letter-spacing': '1' });
          var cx = 600, cy = 200;
          S('path', { d: arcPath(cx, cy, 110, 0, 180), stroke: GRID, 'stroke-width': 2, fill: 'none' }, svg);
          S('rect', { x: cx - 28, y: cy - 14, width: 56, height: 56, rx: 4, fill: '#2563eb' }, svg);
          var horn = S('g', {}, svg);
          S('path', { d: 'M' + (cx - 6) + ' ' + cy + ' L' + (cx - 3) + ' ' + (cy - 90) + ' L' + (cx + 3) + ' ' + (cy - 90) + ' L' + (cx + 6) + ' ' + cy + ' Z', fill: '#f4f7fb' }, horn);
          S('circle', { cx: cx, cy: cy, r: 11, fill: '#f4f7fb' }, horn);
          var a = 90, tg = 90;
          loopAnim(st, function (t) { tg = Math.floor(t / 1.8) % 2 ? 120 : 90; a += (tg - a) * 0.08; horn.setAttribute('transform', 'rotate(' + (a - 90) + ' ' + cx + ' ' + cy + ')'); });
        } }
      ] });
  }

  /* ---------- 05 read the DHT11 ---------- */
  steps.push({ id: 'dht', title: 'Code it: read the DHT11', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The DHT11 speaks in 40-bit pulse patterns. Rather than decode them yourself, you’ll install a library that turns them into two friendly numbers: degrees and percent.</p>');
    UI.html(b, '<h2>Install the DHT library (first time only)</h2>');
    var box = el('div', 'xp'), head = el('div', 'xp-h', '<span class="label">Setup</span><h3>Install “DHT sensor library”</h3>'), tabs = el('div', 'res-pills'), panel = el('div', 'xp-cap');
    tabs.style.padding = '12px 16px 0'; box.appendChild(head); box.appendChild(tabs); box.appendChild(panel); b.appendChild(box);
    var OS = {
      ide: { name: 'Arduino IDE', html: '<ol><li>Open the <b>Library Manager</b>: click the books icon on the left edge of the IDE, or choose <b>Sketch → Include Library → Manage Libraries…</b></li><li>In the search box, type <b>DHT sensor library</b>.</li><li>Find <b>DHT sensor library</b> <i>by Adafruit</i> (not one of the look-alikes) and click <b>Install</b>.</li><li>A box pops up asking to install another library it needs, <b>Adafruit Unified Sensor</b>. Click <b>Install All</b>. (If you click “Install without dependencies”, your sketch won’t compile.)</li><li>When it says <b>INSTALLED</b>, you’re done. Every sketch can now use <code>#include &lt;DHT.h&gt;</code>.</li></ol>' },
      cloud: { name: 'Chromebook / Cloud Editor', html: '<p>The Arduino Cloud Editor already has every library from the Library Manager, including the Adafruit DHT library and Adafruit Unified Sensor. There’s nothing to install: keep the <code>#include &lt;DHT.h&gt;</code> line and upload.</p><p class="small muted">To check, open the <b>Libraries</b> panel on the left and search “DHT sensor library”.</p>' }
    };
    function show(k) { panel.innerHTML = OS[k].html; tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.k === k); }); ctx.answer('os4', k); }
    Object.keys(OS).forEach(function (k) { var t = el('button', '', esc(OS[k].name)); t.type = 'button'; t.dataset.k = k; t.addEventListener('click', function () { show(k); }); tabs.appendChild(t); });
    show(ctx.answer('os4') || (/CrOS/.test(navigator.userAgent) ? 'cloud' : 'ide'));
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, READ, [
      { lines: [2, 2], title: 'Include the library', html: '<p>Brings in the Adafruit library you just installed. It also pulls in Adafruit Unified Sensor behind the scenes.</p>' },
      { lines: [4, 5], title: 'Make a DHT object', html: '<p><code>DHT dht(DHT_PIN, DHT11);</code> builds a DHT object called <code>dht</code>. The brackets tell it two things: the data pin, and the kind of sensor (the library also handles the DHT22).</p><p>Notice the pattern: <b>class</b>, <b>object name</b>, then its settings.</p>' },
      { lines: [8, 10], title: 'Start up', html: '<p><code>Serial.begin(9600)</code> opens the Serial Monitor (you met it in Mission 02), and <code>dht.begin()</code> gets the sensor ready.</p>' },
      { lines: [14, 16], title: 'Two readings', html: '<p>A DHT11 can only take a fresh measurement every 2 seconds, so loop() waits first. Then <code>dht.readHumidity()</code> and <code>dht.readTemperature()</code> give back <code>float</code> numbers — numbers with a decimal point.</p><p class="small muted">Want Fahrenheit? <code>dht.readTemperature(true)</code>.</p>' },
      { lines: [18, 21], title: 'Not a number?', html: '<p>If a wire is loose, the library can’t decode anything and returns <b>NaN</b> — “not a number”. <code>isnan()</code> checks for that. <code>||</code> means “or”. <code>return;</code> ends this pass of loop() early, so the gauge never acts on a broken reading.</p>' },
      { lines: [23, 27], title: 'Print it nicely', html: '<p><code>Serial.print(temperature, 1)</code> prints with 1 digit after the decimal point. The last line uses <code>println</code> to start a new line.</p>' }
    ], { name: 'read_dht11' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Run it and watch the Serial Monitor. Drag the <b>DHT11 temperature</b> and <b>humidity</b> sliders — the next reading shows the change. <b>Check my code</b> changes the temperature and looks for it in the output.</p>');
    RL.Sim.create(b, devices({ title: 'Read the DHT11', code: READ, name: 'read_dht11', key: 'sim-dht', ctx: ctx, runHint: 'watch the Serial Monitor below and move the DHT11 sliders.', checkAfter: 2600,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          sim.setTemp(31); sim.setHum(62);
          setTimeout(function () {
            var txt = sim.serialText(), r;
            if (!/\d/.test(txt)) r = { pass: false, msg: 'Nothing was printed. Check <code>Serial.begin(9600)</code> and the Serial.print lines.' };
            else if (!/31/.test(txt)) r = { pass: false, msg: 'I set the temperature to 31 °C but didn’t see 31 in the Serial Monitor. Are you printing <code>temperature</code>?' };
            else if (!/62/.test(txt)) r = { pass: false, msg: 'Temperature works, but I set humidity to 62% and didn’t see 62. Print <code>humidity</code> too.' };
            else r = { pass: true, msg: 'Temperature and humidity both reach the Serial Monitor. Upload it and open your real Serial Monitor (set to 9600 baud).' };
            sim.setTemp(22); sim.setHum(45);
            ctx.check('sim-dht-pass', r.pass ? 1 : 0); resolve(r);
          }, 4600);
        });
      } }));
    UI.html(b, '<h2>Now on the real board</h2><p>Upload, then open <b>Tools → Serial Monitor</b> and set it to <b>9600 baud</b>. Then experiment like a scientist:</p><ul><li>Hold the sensor between your fingers for 20 seconds. How much does the temperature rise?</li><li>Breathe gently on it. What happens to the humidity? Why?</li></ul>');
    UI.callout(b, 'plain', 'Troubleshooting', '<ul><li><b>“DHT.h: No such file or directory”</b> — the library isn’t installed. Go back to the install steps.</li><li><b>“Adafruit_Sensor.h: No such file”</b> — you skipped Install All. Install <b>Adafruit Unified Sensor</b> from the Library Manager.</li><li><b>“No reading - check the DHT11 wiring”</b> — check S → pin 2, + and − on the right rails, and that the code says <code>DHT11</code>.</li><li><b>Strange symbols in the Serial Monitor</b> — set the baud rate menu to 9600.</li></ul>');
    UI.note(b, ctx, { id: 'n-breath', label: 'What happened to the temperature and humidity when you held and breathed on the sensor? Explain why, using what you learned about relative humidity.', placeholder: 'When I breathed on it, the humidity…' });
  } });

  /* ---------- 06 needle ---------- */
  steps.push({ id: 'needle', title: 'Code it: temperature → needle', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now join the two halves. The DHT11 gives a temperature; the servo wants an angle from 0 to 180. You need a rule that turns one into the other. That’s exactly what <code>map()</code> does — you used it in Mission 02 to turn knob readings into brightness.</p>');
    mapLab(b, ctx);
    UI.html(b, '<div class="callout"><span class="label">The key idea</span><p><code>map(value, fromLow, fromHigh, toLow, toHigh)</code> slides a number from one range onto another, keeping it the same fraction of the way along. 23 °C is 57.5% of the way from 0 to 40, so it becomes 57.5% of 180° = 103°. map() works in whole numbers, so 103.5 is cut down to <b>103</b>.</p></div>');
    UI.mcq(b, ctx, { id: 'q-map1', q: 'Your dial runs from 10 °C (left) to 30 °C (right). Which line gives the right angle?', options: ['<code>map(temperature, 0, 180, 10, 30)</code>', '<code>map(temperature, 10, 30, 0, 180)</code>', '<code>map(temperature, 10, 30, 180, 0)</code>', '<code>map(10, 30, temperature, 0, 180)</code>'], answer: 1, explain: 'The first range is where the number comes <b>from</b> (temperatures), the second is where it goes <b>to</b> (angles).', hints: { 0: 'That turns angles into temperatures — backwards.', 2: 'That would put 10 °C on the right end. Close: that’s how you’d flip the dial.', 3: 'The value you’re converting always comes first.' } });
    UI.numq(b, ctx, { id: 'q-map2', q: 'With <code>map(temperature, 0, 40, 0, 180)</code>, what angle does <b>45 °C</b> give?', answer: 202, tol: 1, unit: '°', explain: '45 × 180 ÷ 40 = 202.5 → <b>202</b>. map() doesn’t stop at the end of the range, so you’ll add <code>constrain()</code> to keep the angle between 0 and 180.', hint: 'map() just keeps going past the end of the range: 45 × 180 ÷ 40.' });
    UI.html(b, '<h2>Your turn</h2><p>Finish the sketch so the needle follows the temperature. Replace <code>int angle = 90;</code> with a <code>map()</code>, then add a <code>constrain()</code> line. Check the Serial Monitor: it prints the temperature and the angle you calculated.</p>');
    RL.Code.walk(b, NEEDLE, [
      { lines: [7, 8], title: 'The ends of your dial', html: '<p>Two constants say which temperature sits at each end of the dial. Want a different range? Change these two numbers — nothing else.</p>' },
      { lines: [10, 11], title: 'Two objects', html: '<p>One DHT object and one Servo object. Each library gives you its own class.</p>' },
      { lines: [20, 21], title: 'Read, and bail out on NaN', html: '<p><code>if (isnan(temperature)) return;</code> is a one-line if: no braces needed when there’s only one instruction.</p><p class="small muted">No <code>delay(2000)</code> this time: if you ask a DHT11 too often, the Adafruit library hands back the last reading instead of bothering the sensor.</p>' },
      { lines: [23, 26], title: 'Your turn', html: '<p>Turn <code>temperature</code> into <code>angle</code> with map(), using LOW_TEMP, HIGH_TEMP, 0 and 180. Then <code>angle = constrain(angle, 0, 180);</code> stops it going past either end.</p>' },
      { lines: [28, 33], title: 'Move and report', html: '<p>Move the needle, print the numbers, and wait a second before the next reading.</p>' }
    ], { name: 'temperature_needle', download: false });
    RL.Sim.create(b, devices({ title: 'Temperature → needle', code: NEEDLE, name: 'temperature_needle', key: 'sim-needle', ctx: ctx, runHint: 'drag the DHT11 temperature slider and watch the servo.', checkAfter: 1500,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var res = {};
          sim.setTemp(10);
          setTimeout(function () { res.a10 = servoAngle(sim); sim.setTemp(30); }, 1500);
          setTimeout(function () { res.a30 = servoAngle(sim); sim.setTemp(48); }, 3000);
          setTimeout(function () {
            var lines = sim.serialText().trim().split('\n'), last = lines[lines.length - 1] || '', m = /->\s*(-?\d+)/.exec(last), printed = m ? Number(m[1]) : null, r;
            if (res.a10 === 90 && res.a30 === 90) r = { pass: false, msg: 'The needle stays at 90°. Replace <code>int angle = 90;</code> with a map() that uses <code>temperature</code>.' };
            else if (Math.abs(res.a10 - 45) > 2 || Math.abs(res.a30 - 135) > 2) r = { pass: false, msg: 'At 10 °C the needle went to ' + res.a10 + '° and at 30 °C to ' + res.a30 + '°. With a 0–40 °C dial they should be 45° and 135°. Check the order of the numbers in map().' };
            else if (printed == null || printed > 180) r = { pass: false, msg: 'The needle follows the temperature. But at 48 °C your code printed ' + (printed == null ? 'no angle' : printed + '°') + ' — add <code>angle = constrain(angle, 0, 180);</code>.' };
            else r = { pass: true, msg: '10 °C → 45°, 30 °C → 135°, and 48 °C is held at ' + printed + '°. Your needle maths works.' };
            sim.setTemp(22); ctx.check('sim-needle-pass', r.pass ? 1 : 0); resolve(r);
          }, 4500);
        });
      } }));
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the two lines</summary><p class="small">Replace the angle line, and add the constrain line under it:</p>';
    RL.Code.block(hint, '  int angle = map(temperature, LOW_TEMP, HIGH_TEMP, 0, 180);\n  angle = constrain(angle, 0, 180);', { download: false });
    b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">When it passes, upload it to your board. Warm the sensor with your fingers: the servo shaft should creep round as the temperature climbs.</p>');
  } });
  function mapLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The map() lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 330', role: 'img', 'aria-label': 'A dial whose scale and needle follow your chosen range' }); stage.appendChild(svg);
    var lo = 0, hi = 40, temp = 23, d = null, cur = 90;
    var pills = el('div', 'res-pills'); pills.style.padding = '12px 16px 0';
    [['0–40 °C', 0, 40], ['15–30 °C (indoor)', 15, 30], ['0–50 °C (full DHT11 range)', 0, 50]].forEach(function (p) { var bt = el('button', p[1] === lo && p[2] === hi ? 'on' : '', esc(p[0])); bt.type = 'button'; bt.addEventListener('click', function () { sLo.set(p[1]); sHi.set(p[2]); pills.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === bt); }); }); pills.appendChild(bt); });
    box.appendChild(pills);
    var ctl = el('div', ''); box.appendChild(ctl);
    var sLo = slider(ctl, 'Left end (0°)', 0, 25, 1, lo, function (v) { return v + ' °C'; }, function (v) { lo = v; build(); });
    var sHi = slider(ctl, 'Right end (180°)', 20, 50, 1, hi, function (v) { return v + ' °C'; }, function (v) { hi = v; build(); });
    slider(ctl, 'Temperature', 0, 50, 0.5, temp, function (v) { return v + ' °C'; }, function (v) { temp = v; upd(); ctx.check('lab-map', 1); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var cx = 250, cy = 290, R = 210;
    function build() {
      clear(svg); bg(svg, 800, 330);
      var span = hi - lo, step = span <= 16 ? 2 : span <= 30 ? 5 : 10;
      var sc = { lo: lo, hi: hi, step: (hi - lo) / Math.max(1, Math.round(span / step)), r: R, unit: '°C', ux: -60, fs: 13 };
      d = dialArt(svg, cx, cy, R, [sc], { angle: cur });
      // relabel ticks with rounded values (the range may not divide evenly)
      d.g.querySelectorAll('text').forEach(function (t) { if (/^\d/.test(t.textContent)) t.textContent = String(Math.round(Number(t.textContent) * 10) / 10); });
      st.f1 = T(svg, 520, 70, '', { 'font-size': 15, fill: INK });
      st.f2 = T(svg, 520, 106, '', { 'font-size': 13, fill: MUT });
      st.f3 = T(svg, 520, 142, '', { 'font-size': 13, fill: MUT });
      st.f4 = T(svg, 520, 186, '', { 'font-size': 26, fill: CY, 'font-weight': 600 });
      st.f5 = T(svg, 520, 226, '', { 'font-size': 12, fill: SIG });
      st.f6 = T(svg, 520, 248, '', { 'font-size': 12, fill: SIG });
      T(svg, 520, 40, 'THE MATHS', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
      upd();
    }
    var st = {};
    function upd() {
      var raw = Math.trunc((Math.trunc(temp) - lo) * 180 / (hi - lo)), ang = Math.max(0, Math.min(180, raw));
      target = ang;
      st.f1.textContent = 'map(' + Math.trunc(temp) + ', ' + lo + ', ' + hi + ', 0, 180)';
      st.f2.textContent = '(' + Math.trunc(temp) + ' − ' + lo + ') × 180 ÷ (' + hi + ' − ' + lo + ')';
      st.f3.textContent = '= ' + ((Math.trunc(temp) - lo) * 180 / (hi - lo)).toFixed(1) + '  →  whole number';
      st.f4.textContent = raw + '°';
      var out = raw < 0 || raw > 180;
      st.f5.textContent = out ? 'OFF THE DIAL: a servo only goes 0–180°.' : '';
      st.f6.textContent = out ? 'constrain(angle, 0, 180) gives ' + ang + '°' : '';
      st.f4.setAttribute('fill', out ? SIG : CY);
      ro.innerHTML = '<div><span class="label">Temperature</span><b>' + temp + ' °C</b></div><div><span class="label">Angle</span><b>' + ang + '°</b></div><div><span class="label">Each degree C</span><span class="small">moves the needle ' + (180 / (hi - lo)).toFixed(1) + '°</span></div><div><span class="label">In code</span><span class="small"><code>map(temperature, ' + lo + ', ' + hi + ', 0, 180)</code></span></div>';
    }
    var target = 90, raf;
    (function tick() { cur += (target - cur) * 0.1; if (d) d.set(cur); raf = requestAnimationFrame(tick); })();
    if (RL.onLeave) RL.onLeave(function () { cancelAnimationFrame(raf); });
    build();
    UI.html(b, '<p class="small muted">Try the indoor range: each degree moves the needle much further, so small changes are easy to see — but anything below 15 °C or above 30 °C is off the dial. Choosing a range is a design decision.</p>');
  }

  /* ---------- 07 thermistor ---------- */
  steps.push({ id: 'thermistor', title: 'Code it: a second thermometer', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Engineers don’t trust a single sensor. Your thermistor is a completely different way of measuring temperature, so comparing it with the DHT11 tells you how much to believe either one. First you need to turn its reading into degrees.</p>');
    shExplainer(b);
    UI.html(b, '<h2>Taming a noisy signal</h2><p>Analog readings wobble. Tiny bits of electrical noise — from the USB power, from the servo, even from your hand — make the reading jump around by a few steps. The fix is simple: take several readings quickly and use their <b>average</b>. Random wobbles up and down cancel out.</p>');
    smoothLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-avg', q: 'Averaging 50 readings instead of 10 would make the thermistor reading…', options: ['smoother, but slower to react to a real change', 'noisier', 'more accurate in every way, with no downside', 'jump around more'], answer: 0, explain: 'More readings average out more noise, but the gauge takes longer to notice a real change. Engineers pick a balance.' });
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, COMPARE, [
      { lines: [13, 14], title: 'Your own function', html: '<p><code>float readThermistor()</code> is a function you’re writing yourself. <code>float</code> at the front means it <b>gives back</b> a number with a decimal point. loop() can then just say <code>readThermistor()</code> whenever it needs a temperature.</p>' },
      { lines: [15, 19], title: 'Add up 10 readings', html: '<p><code>total</code> is a <code>long</code> — a whole number that can get much bigger than an int. Ten readings of up to 1023 is fine either way, but it’s a good habit when adding lots of numbers.</p>' },
      { lines: [20, 20], title: 'The average', html: '<p>Dividing by <code>10.0</code> (not <code>10</code>) matters: with a decimal point, the UNO does decimal maths and keeps the fraction. <code>total / 10</code> would chop it off.</p>' },
      { lines: [21, 21], title: 'Reading → resistance', html: '<p>This is the voltage-divider formula turned around: from the reading, work out the thermistor’s resistance. A reading of 512 (half way) means the thermistor equals the 10 kΩ resistor.</p>' },
      { lines: [22, 24], title: 'Resistance → degrees', html: '<p>The Steinhart–Hart equation from the explainer, with ELEGOO’s three numbers for this thermistor. It gives kelvin, so the last line subtracts 273.15 to get °C.</p><p><code>return</code> hands the answer back to whoever called the function.</p>' },
      { lines: [28, 37], title: 'Compare', html: '<p>Read both sensors, print both, and print the difference. <code>abs()</code> gives the size of a number without its sign, so the difference is never negative.</p>' }
    ], { name: 'two_thermometers' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>The <b>A0 · thermistor</b> slider stands in for warming the thermistor. Make both sensors agree, then make them disagree.</p>');
    RL.Sim.create(b, devices({ title: 'Two thermometers', code: COMPARE, name: 'two_thermometers', key: 'sim-therm', ctx: ctx, runHint: 'move the thermistor slider and the DHT11 temperature slider.', checkAfter: 2500,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          sim.setAnalog(0, 480); sim.setTemp(22);
          setTimeout(function () {
            var lines = sim.serialText().trim().split('\n'), last = lines[lines.length - 1] || '', m = /Thermistor:\s*(-?[\d.]+)/.exec(last), d = /DHT11:\s*(-?[\d.]+)/.exec(last), r;
            if (!m) r = { pass: false, msg: 'I couldn’t find “Thermistor: …” in the Serial Monitor. Keep the print lines from the example.' };
            else if (Math.abs(Number(m[1]) - 22.2) > 0.8) r = { pass: false, msg: 'With a reading of 480 the thermistor should be about 22.2 °C, but your code printed ' + m[1] + '. Check the formula against the example (and 10.0, not 10).' };
            else if (!d) r = { pass: false, msg: 'The thermistor works. Print the DHT11 temperature too, so you can compare.' };
            else r = { pass: true, msg: 'Reading 480 → ' + m[1] + ' °C, right next to the DHT11’s ' + d[1] + ' °C. Your second thermometer works.' };
            ctx.check('sim-therm-pass', r.pass ? 1 : 0); resolve(r);
          }, 4300);
        });
      } }));
    UI.html(b, '<h2>Compare them for real</h2><p>Upload, open the Serial Monitor, and leave both sensors alone for a minute. Then try: pinch the thermistor (it reacts in seconds), and pinch the DHT11 (it takes much longer — it’s bigger and sealed in plastic).</p>');
    UI.tests(b, ctx, { id: 'tests-therm', rows: [
      '<b>Agree:</b> left alone, the two temperatures are within 2 °C of each other.',
      '<b>Fast:</b> pinching the thermistor raises its reading within 5 seconds.',
      '<b>Back to normal:</b> after you let go, both readings settle again within a few minutes.'
    ] });
    UI.note(b, ctx, { id: 'n-compare', label: 'Which sensor reacted faster when you warmed it, and why do you think that is? Which one would you trust for your gauge, and why?', placeholder: 'The thermistor reacted…' });
  } });
  function shExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'From a reading to degrees', w: 820, h: 340,
      init: function (svg) { glowDefs(svg); },
      frames: [
        { cap: '<b>Warmer = less resistance.</b> Your kit’s thermistor is an <b>NTC</b> (negative temperature coefficient) thermistor: at 25 °C it’s 10 kΩ, and as it heats up its resistance drops — but not in a straight line. That curve is why you need a formula, not just <code>map()</code>.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          var X = function (c) { return 90 + c / 50 * 420; }, Y = function (r) { return 300 - r / 35000 * 250; };
          S('line', { x1: 90, y1: 300, x2: 520, y2: 300, stroke: MUT }, svg); S('line', { x1: 90, y1: 40, x2: 90, y2: 300, stroke: MUT }, svg);
          [0, 10, 20, 30, 40, 50].forEach(function (c) { T(svg, X(c), 318, c + ' °C', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); });
          [0, 10, 20, 30].forEach(function (k) { T(svg, 82, Y(k * 1000) + 4, k + 'k', { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); S('line', { x1: 90, y1: Y(k * 1000), x2: 520, y2: Y(k * 1000), stroke: GRID, 'stroke-dasharray': '3 5' }, svg); });
          T(svg, 96, 34, 'RESISTANCE (Ω)', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var pts = []; for (var c = 0; c <= 50; c += 1) pts.push(X(c) + ',' + Y(thermR(c)).toFixed(1));
          var curve = S('polyline', { points: pts.join(' '), fill: 'none', stroke: CY, 'stroke-width': 3, 'class': 'part-new' }, svg);
          var dot = S('circle', { r: 7, fill: CY }, svg), lab = T(svg, 600, 120, '', { 'font-size': 22, fill: INK, 'font-weight': 600 }), lab2 = T(svg, 600, 160, '', { 'font-size': 22, fill: CY, 'font-weight': 600 });
          T(svg, 600, 92, 'TEMPERATURE', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' }); T(svg, 600, 186, 'RESISTANCE', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
          T(svg, 600, 240, 'Not a straight line:', { 'font-size': 13, fill: MUT, 'font-family': SANS }); T(svg, 600, 260, 'each degree changes R by less', { 'font-size': 13, fill: MUT, 'font-family': SANS }); T(svg, 600, 280, 'as it gets warmer.', { 'font-size': 13, fill: MUT, 'font-family': SANS });
          loopAnim(st, function (t) { var c2 = 25 + 22 * Math.sin(t * 0.6), r = thermR(c2); dot.setAttribute('cx', X(c2)); dot.setAttribute('cy', Y(r)); lab.textContent = c2.toFixed(1) + ' °C'; lab2.textContent = Math.round(r).toLocaleString('en-CA') + ' Ω'; });
        } },
        { cap: '<b>Step 1 · reading → resistance.</b> In your divider the thermistor is on top (toward 5V) and the 10 kΩ resistor below. Working the divider backwards gives <code>R = 10000 × (1024 ÷ reading − 1)</code>. A reading of 480 means the thermistor is about 11 300 Ω — a bit cooler than 25 °C.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          chain(svg, S, st, 1);
        } },
        { cap: '<b>Step 2 · resistance → kelvin.</b> The <b>Steinhart–Hart equation</b> is a curve that fits this kind of thermistor really well: <code>1/T = A + B·ln(R) + C·ln(R)³</code>. A, B and C are three numbers measured for the thermistor (ELEGOO supplies them). <code>ln</code> is the natural logarithm — the Arduino function is <code>log()</code>. You don’t need to derive it: engineers look it up and use it.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340); chain(svg, S, st, 2);
        } },
        { cap: '<b>Step 3 · kelvin → °C.</b> The equation gives the temperature in <b>kelvin</b>, the scientist’s scale that starts at absolute zero. Subtract 273.15 to get Celsius: 295.3 K − 273.15 = <b>22.2 °C</b>. Three steps, every time the gauge reads the thermistor.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340); chain(svg, S, st, 3);
        } }
      ] });
    function chain(svg, S, st, n) {
      var r = 10000 * (1024 / 480 - 1), lr = Math.log(r), k = 1 / (SH[0] + (SH[1] + SH[2] * lr * lr) * lr);
      var boxes = [['analogRead(A0)', '480', ''], ['RESISTANCE', Math.round(r).toLocaleString('en-CA') + ' Ω', 'R = 10000 × (1024 ÷ 480 − 1)'], ['KELVIN', k.toFixed(1) + ' K', '1/T = A + B·ln R + C·(ln R)³'], ['CELSIUS', (k - 273.15).toFixed(1) + ' °C', 'T − 273.15']];
      boxes.forEach(function (bx, i) {
        var x = 30 + i * 200, on = i <= n, g = S('g', { opacity: on ? 1 : 0.18 }, svg);
        S('rect', { x: x, y: 110, width: 160, height: 100, rx: 8, fill: '#0e1826', stroke: i === n ? CY : '#9fb3c8', 'stroke-width': i === n ? 3 : 2 }, g);
        T(g, x + 80, 140, bx[0], { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
        T(g, x + 80, 182, bx[1], { 'text-anchor': 'middle', 'font-size': 22, fill: i === n ? CY : INK, 'font-weight': 600 });
        if (i) { S('path', { d: 'M' + (x - 36) + ' 160 H' + (x - 8), stroke: '#9fb3c8', 'stroke-width': 2 }, g); S('path', { d: 'M' + (x - 8) + ' 154 l8 6 -8 6z', fill: '#9fb3c8' }, g); }
        if (i === n) { var f = T(svg, x + 80, 250, bx[2], { 'text-anchor': 'middle', 'font-size': 12, fill: CY, 'class': 'part-new' }); }
      });
      if (n === 1) {
        T(svg, 30, 300, 'Reading 512 (half of 1024) → R = 10 000 Ω → exactly 25 °C. Higher reading → warmer.', { 'font-size': 13, fill: MUT, 'font-family': SANS });
      }
      if (n === 2) {
        T(svg, 30, 290, 'A = 0.001129148     B = 0.000234125     C = 0.0000000876741', { 'font-size': 12, fill: MUT });
        T(svg, 30, 312, 'ln(11 333) = ' + lr.toFixed(3), { 'font-size': 12, fill: MUT });
      }
      if (n === 3) T(svg, 30, 300, 'Absolute zero (0 K) is −273.15 °C: nothing can be colder.', { 'font-size': 13, fill: MUT, 'font-family': SANS });
    }
  }
  function smoothLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The averaging lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 260', role: 'img', 'aria-label': 'A noisy sensor reading and its running average' }); stage.appendChild(svg);
    bg(svg, 800, 260);
    var Y = function (c) { return 230 - (c - 18) / 12 * 200; };
    [18, 21, 24, 27, 30].forEach(function (c) { S('line', { x1: 60, y1: Y(c), x2: 780, y2: Y(c), stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 52, Y(c) + 4, c + '°', { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); });
    var trueL = S('polyline', { points: '', fill: 'none', stroke: '#9fb3c8', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, svg);
    var rawL = S('polyline', { points: '', fill: 'none', stroke: MUT, 'stroke-width': 1.2, opacity: 0.8 }, svg);
    var avgL = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
    T(svg, 70, 24, '— — REAL TEMPERATURE', { 'font-size': 10, fill: '#9fb3c8', 'letter-spacing': '1' });
    T(svg, 290, 24, '—— RAW READINGS', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
    T(svg, 470, 24, '━━ AVERAGE', { 'font-size': 10, fill: CY, 'letter-spacing': '1' });
    var noise = 1.5, win = 10, raw = [], avg = [], tru = [], t = 0, buf = [];
    var pills = el('div', 'slider-row'); pills.innerHTML = '<label>Average of</label>';
    var pr = el('div', 'res-pills'); pills.appendChild(pr);
    [1, 5, 10, 25, 50].forEach(function (n) { var bt = el('button', n === win ? 'on' : '', n === 1 ? '1 (no average)' : n + ' readings'); bt.type = 'button'; bt.addEventListener('click', function () { win = n; pr.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === bt); }); ctx.check('lab-avg', 1); }); pr.appendChild(bt); });
    box.appendChild(pills);
    var ctl = el('div', ''); box.appendChild(ctl);
    slider(ctl, 'Noise', 0, 3, 0.1, noise, function (v) { return '± ' + v.toFixed(1) + ' °C'; }, function (v) { noise = v; });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var timer = setInterval(function () {
      t++;
      var real = Math.floor(t / 90) % 2 ? 26 : 22, r = real + (Math.random() + Math.random() + Math.random() - 1.5) * noise;
      buf.push(r); while (buf.length > win) buf.shift();
      var a = buf.reduce(function (s, x) { return s + x; }, 0) / buf.length;
      tru.push(real); raw.push(r); avg.push(a);
      [tru, raw, avg].forEach(function (arr) { while (arr.length > 180) arr.shift(); });
      function line(arr) { return arr.map(function (v, i) { return (60 + i * 4) + ',' + Y(Math.max(18, Math.min(30, v))).toFixed(1); }).join(' '); }
      trueL.setAttribute('points', line(tru)); rawL.setAttribute('points', line(raw)); avgL.setAttribute('points', line(avg));
      if (t % 10 === 0) {
        var recent = avg.slice(-20), wob = Math.max.apply(null, recent) - Math.min.apply(null, recent);
        ro.innerHTML = '<div><span class="label">Raw reading</span><b>' + r.toFixed(1) + ' °C</b></div><div><span class="label">Average</span><b>' + a.toFixed(1) + ' °C</b></div><div><span class="label">Needle wobble</span><span class="small">about ± ' + (wob / 2).toFixed(1) + ' °C</span></div><div><span class="label">Catching up after a change</span><span class="small">about ' + win + ' readings</span></div>';
      }
    }, 50);
    if (RL.onLeave) RL.onLeave(function () { clearInterval(timer); });
  }

  /* ---------- 08 dial ---------- */
  steps.push({ id: 'dial', title: 'Design & build the dial', stage: '03 Imagine · 05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A gauge is only useful if anyone can read it from across the room. Design a dial, mount the servo behind it, and then let the servo itself show you where to draw the ticks.</p><p>Here’s one way to build it. Change the shape, size and style however you like — as long as the needle can swing freely and the scale is accurate.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue is hot enough to burn. Don’t glue the servo’s moving shaft or horn to the cardboard — only its body.</p>');
    dialBuild(b);
    UI.html(b, '<h2>Calibrate: let the servo draw the scale</h2><p>Servos aren’t perfect, and you’ll never fit the horn at exactly the right angle. So don’t draw the ticks with a protractor — run this calibration sketch and mark the dial wherever the needle <i>actually</i> points.</p>');
    RL.Sim.create(b, devices({ title: 'Calibration', code: CALIB, name: 'calibrate_dial', key: 'sim-calib', ctx: ctx, runHint: 'read the Serial Monitor and watch the needle.', checkAfter: 17800,
      check: function (log) {
        var a = log.filter(function (e) { return e.dev === 'servo'; }).map(function (e) { return e.v; }), want = [90, 0, 45, 90, 135], ok = want.every(function (w) { return a.indexOf(w) >= 0; });
        var r = ok ? { pass: true, msg: 'The needle visited 0°, 45°, 90° and 135°, one tick every 4 seconds. Mark each one on your dial (the last one, 180°, comes next).' } : { pass: false, msg: 'The needle didn’t visit every tick. Check the TICKS array and the map() line.' };
        ctx.check('sim-calib-pass', r.pass ? 1 : 0); return r;
      } }));
    UI.html(b, '<ol><li>Upload the calibration sketch. The needle goes to <b>90°</b> for 5 seconds: push the horn on so the needle points <b>straight up</b>.</li><li>The Serial Monitor then says “Mark 0 C here”. Draw a tick under the needle tip and label it.</li><li>Repeat for 10, 20, 30 and 40. It loops, so you can check your ticks a second time.</li><li>Fill in the in-between ticks by eye, then add your humidity scale the same way (20, 37.5, 55, 72.5, 90% fall on the same five ticks).</li></ol>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your dial (the range, the colours, the size, where the sensor sits…) and why.', placeholder: 'I chose a range of… because…' });
  } });
  function dialBuild(b) {
    function base(svg) { clear(svg); glowDefs(svg); S('rect', { x: 0, y: 0, width: 800, height: 380, fill: NAVY }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard weather gauge', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Draw the dial.</b> On a piece of cardboard about 24 × 16 cm, draw a half circle with a radius of about <b>10 cm</b>, centred near the bottom edge. Leave a 4 cm strip underneath — that’s where the servo goes.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 160, y: 30, width: 480, height: 310, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg);
        S('path', { d: arcPath(400, 270, 200, 0, 180) + ' Z', fill: 'none', stroke: CINK, 'stroke-width': 2, 'stroke-dasharray': '8 6' }, svg);
        S('line', { x1: 400, y1: 270, x2: 600, y2: 270, stroke: CINK, 'stroke-width': 3 }, svg); T(svg, 500, 260, 'radius 10 cm', { 'text-anchor': 'middle', fill: CINK, 'font-weight': 600 });
        S('circle', { cx: 400, cy: 270, r: 5, fill: CINK }, svg); T(svg, 400, 300, 'centre', { 'text-anchor': 'middle', fill: CINK, 'font-size': 11 });
        S('line', { x1: 130, y1: 30, x2: 130, y2: 340, stroke: CY }, svg); T(svg, 122, 190, '16 cm', { 'text-anchor': 'end', fill: CY });
        S('line', { x1: 160, y1: 352, x2: 640, y2: 352, stroke: CY }, svg); T(svg, 400, 372, '24 cm', { 'text-anchor': 'middle', fill: CY });
      } },
      { cap: '<b>Step 2 · Make a hole for the shaft.</b> Poke a hole about 1 cm wide at the centre point with a pencil. The servo goes <b>behind</b> the dial with its shaft poking through the hole toward you.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 160, y: 40, width: 480, height: 320, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: arcPath(400, 280, 200, 0, 180) + ' Z', fill: 'none', stroke: CINK, 'stroke-width': 2 }, svg);
        S('circle', { cx: 400, cy: 280, r: 10, fill: '#1a1208', 'class': 'part-new' }, svg); S('circle', { cx: 400, cy: 280, r: 20, 'class': 'ring' }, svg);
        T(svg, 428, 316, 'shaft hole, 1 cm', { fill: CINK, 'font-weight': 600 });
      } },
      { cap: '<b>Step 3 · Mount the servo behind.</b> From the back, push the shaft through the hole and hot-glue the servo’s <b>body</b> (or its mounting tabs) to the cardboard. A cardboard strip folded into a stand at the back keeps the dial upright.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 160, y: 40, width: 480, height: 320, rx: 4, fill: CBD, stroke: '#6b4a26', 'stroke-width': 2 }, svg);
        T(svg, 400, 30, 'BACK OF THE DIAL', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        var g = S('g', { 'class': 'part-new' }, svg);
        S('rect', { x: 374, y: 250, width: 52, height: 90, rx: 4, fill: '#2563eb', stroke: '#3b82f6' }, g);
        S('rect', { x: 362, y: 262, width: 76, height: 9, rx: 2, fill: '#1d4ed8' }, g);
        S('circle', { cx: 400, cy: 280, r: 7, fill: '#f4f7fb' }, g);
        [['#7b4a12', 0], ['#e5484d', 4], ['#fb923c', 8]].forEach(function (w) { S('path', { d: 'M400 ' + (340) + ' C 400 360, 470 ' + (362 + w[1]) + ', 560 ' + (362 + w[1]), stroke: w[0], 'stroke-width': 3, fill: 'none' }, g); });
        S('circle', { cx: 365, cy: 266, r: 9, fill: '#f3e9c9', opacity: 0.85 }, svg); S('circle', { cx: 435, cy: 266, r: 9, fill: '#f3e9c9', opacity: 0.85 }, svg);
        T(svg, 452, 236, '← glue the tabs, not the shaft', { fill: '#f3e9c9', 'font-size': 12, 'font-weight': 600 });
        S('path', { d: 'M670 60 L670 340 L760 340 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, svg); T(svg, 715, 362, 'stand (side view)', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      } },
      { cap: '<b>Step 4 · Make the needle.</b> Take the single-arm servo horn from the bag. Hot-glue a popsicle stick to it (or trim one to about 9 cm and tape it on). Run the sweep code or <code>needle.write(90)</code>, then push the horn onto the shaft so the needle points <b>straight up</b>.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 160, y: 40, width: 480, height: 320, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: arcPath(400, 280, 200, 0, 180), fill: 'none', stroke: CINK, 'stroke-width': 2 }, svg);
        var d = dialArt(svg, 400, 280, 200, [], { card: false, len: 180 });
        d.g.classList.add('part-new');
        T(svg, 418, 78, '90° = straight up', { fill: CINK, 'font-weight': 600 });
      } },
      { cap: '<b>Step 5 · Calibrate and draw the scale.</b> Run the calibration sketch below. At each stop, draw a tick under the needle tip and label it. The ticks may not be perfectly even — that’s the point: your scale now matches <i>your</i> servo.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 160, y: 40, width: 480, height: 320, rx: 4, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: arcPath(400, 280, 200, 0, 180), fill: 'none', stroke: CINK, 'stroke-width': 2 }, svg);
        var d = dialArt(svg, 400, 280, 200, [], { card: false, len: 180, angle: 90 }), ticks = [0, 45, 90, 135, 180], lab = ['0', '10', '20', '30', '40'];
        var tickG = S('g', {}, svg), i = 0;
        loopAnim(st, function () { d.set(d.a + ((st.tg == null ? 90 : st.tg) - d.a) * 0.08); });
        (function next() {
          if (i === 0) { while (tickG.firstChild) tickG.removeChild(tickG.firstChild); }
          var a = ticks[i % 5]; st.tg = a + (i % 5 === 3 ? 3 : i % 5 === 1 ? -2 : 0);
          st.later(function () { var p0 = pt(400, 280, 200, st.tg), p1 = pt(400, 280, 182, st.tg), pl = pt(400, 280, 222, st.tg); S('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: CINK, 'stroke-width': 3, 'class': 'part-new' }, tickG); T(tickG, pl[0], pl[1] + 5, lab[i % 5], { 'text-anchor': 'middle', fill: CINK, 'font-weight': 600, 'font-size': 14 }); }, 1000);
          i = (i + 1) % 5; st.later(next, 1700);
        })();
      } },
      { cap: '<b>Step 6 · Finish it.</b> Add colour zones (cold, comfortable, hot), the units, and the humidity scale inside the temperature one. Mount the DHT11 on the <b>outside</b> edge of the dial where air can reach it — not right next to the UNO, which warms up a little while it runs.', draw: function (svg, S, st) {
        base(svg);
        var d = dialArt(svg, 400, 300, 210, [
          { lo: 0, hi: 40, step: 10, r: 210, unit: '°C', ux: -66, fs: 15 },
          { lo: 20, hi: 90, step: 17.5, r: 140, unit: '% RH', ux: 66, fs: 10, tick: 10, col: '#2c5f8a', every: 1 }
        ], { zones: [{ r: 218, a0: 0, a1: 67, col: '#4da3ff', w: 8 }, { r: 218, a0: 81, a1: 108, col: '#3ee07a', w: 8 }, { r: 218, a0: 135, a1: 180, col: '#ff4d4d', w: 8 }] });
        d.g.querySelectorAll('text').forEach(function (t) { if (/\./.test(t.textContent)) t.textContent = String(Math.round(Number(t.textContent))); });
        dhtIcon(svg, 680, 110, 1);
        T(svg, 708, 210, 'sensor on', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 }); T(svg, 708, 226, 'the outside', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 });
        loopAnim(st, function (t) { d.set(99 + 30 * Math.sin(t * 0.5)); });
      } }
    ] });
    UI.callout(b, '', 'Design ideas', '<ul><li>Use a bigger dial for a bigger needle swing — easier to read from far away.</li><li>Label the zones in words: “Sweater”, “T-shirt”, “Too hot”.</li><li>Make the humidity scale a different colour so nobody mixes them up.</li><li>Cut a little window for the L LED so the dial shows which mode it’s in.</li></ul>');
  }

  /* ---------- 09 the finished gauge ---------- */
  steps.push({ id: 'gauge', title: 'Code it: the finished gauge', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The final sketch adds two things: a <b>mode button</b> that flips between temperature and humidity, and a needle that <b>eases</b> into place one degree at a time instead of jumping.</p>');
    RL.Code.walk(b, GAUGE_CODE, [
      { lines: [13, 17], title: 'Two scales', html: '<p>Each scale on your dial gets its own pair of constants. If your calibrated dial uses different numbers, change them here.</p>' },
      { lines: [22, 24], title: 'Variables that remember', html: '<p><code>bool</code> holds just <code>true</code> or <code>false</code> — perfect for a two-way mode. <code>needleAngle</code> remembers where the needle is, so it can move a little each time loop() runs.</p>' },
      { lines: [31, 32], title: 'INPUT_PULLUP', html: '<p>Instead of an external pull-down resistor (Mission 01), the UNO switches on a resistor <i>inside</i> the chip that pulls pin 4 up to 5 V. So the button reads <b>HIGH when it’s not pressed</b> and <b>LOW when pressed</b>, because pressing connects the pin to GND.</p>' },
      { lines: [37, 44], title: 'Flip the mode', html: '<p><code>!</code> means “not”: <code>!showHumidity</code> turns true into false and false into true. The L LED shows the mode.</p><p>The empty <code>while</code> loop waits until the button is released, so holding the button flips the mode only once. The short delay ignores the button’s contact bounce.</p>' },
      { lines: [47, 50], title: 'Read the right sensor', html: '<p>A one-line <code>if</code> / <code>else</code>: in humidity mode read humidity, otherwise read temperature. Then skip a broken reading.</p>' },
      { lines: [52, 55], title: 'One reading, two scales', html: '<p>Map the reading onto the matching scale. Both scales share the same 0–180° swing, and constrain() keeps the target on the dial.</p>' },
      { lines: [57, 63], title: 'Print only changes', html: '<p>loop() runs about 60 times a second, so printing every time would flood the Serial Monitor. This prints only when the target changes. <code>condition ? a : b</code> picks <code>a</code> if the condition is true, otherwise <code>b</code>.</p>' },
      { lines: [66, 69], title: 'Ease the needle', html: '<p>Move one degree toward the target, wait 15 ms, repeat. A big change glides across the dial in a second or two, and a reading that flickers between two values only nudges the needle by a degree. That’s smoothing for the <i>movement</i>, as averaging was for the <i>reading</i>.</p>' }
    ], { name: 'weather_gauge' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Run it, drag the sliders, and click the <b>button on the breadboard</b> to switch modes (the L LED on the UNO lights in humidity mode). <b>Check my code</b> tests both modes.</p>');
    RL.Sim.create(b, devices({ title: 'Weather gauge', code: GAUGE_CODE, name: 'weather_gauge', key: 'sim-gauge', ctx: ctx, runHint: 'click the mode button on the breadboard, and move the DHT11 sliders.', checkAfter: 2200,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var res = {};
          sim.setTemp(20); sim.setHum(76);
          setTimeout(function () { res.temp = servoAngle(sim); res.led0 = sim.pin(13).v; sim.press(4, true); }, 2200);
          setTimeout(function () { sim.press(4, false); }, 2500);
          setTimeout(function () { res.hum = servoAngle(sim); res.led1 = sim.pin(13).v; sim.press(4, true); }, 4500);
          setTimeout(function () { sim.press(4, false); }, 4800);
          setTimeout(function () {
            res.back = servoAngle(sim); var r;
            if (Math.abs(res.temp - 90) > 3) r = { pass: false, msg: 'In temperature mode at 20 °C the needle should point at 90° (half way on a 0–40 °C dial), but it’s at ' + res.temp + '°.' };
            else if (Math.abs(res.hum - 144) > 3) r = { pass: false, msg: 'After pressing the button, 76% humidity should put the needle at 144°, but it’s at ' + res.hum + '°. Does the button flip <code>showHumidity</code>?' };
            else if (!res.led1 || res.led0) r = { pass: false, msg: 'The needle works in both modes, but the L LED should be on only in humidity mode.' };
            else if (Math.abs(res.back - 90) > 3) r = { pass: false, msg: 'A second press should go back to temperature mode (90°), but the needle is at ' + res.back + '°.' };
            else r = { pass: true, msg: 'Temperature mode → 90°, press → humidity mode → 144° with the L LED on, press → back to 90°. Your gauge is finished.' };
            sim.setTemp(22); sim.setHum(45);
            ctx.check('sim-gauge-pass', r.pass ? 1 : 0); resolve(r);
          }, 7000);
        });
      } }));
    UI.html(b, '<h2>Upload to your gauge</h2><p>Upload, and test it in its cardboard home. If something’s off, check here before you change the code.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>The needle points the wrong way (hot on the cold side)</b><br><span class="small muted">Your servo is mounted the other way round. Swap the 0 and 180 in both map() lines: <code>map(reading, LOW_TEMP, HIGH_TEMP, 180, 0)</code>.</span></div></div><div class="trow"><div><b>The needle is a few degrees off everywhere</b><br><span class="small muted">The horn is one notch out. Run the calibration sketch and refit the horn at 90°.</span></div></div><div class="trow"><div><b>The mode flips by itself, or never flips</b><br><span class="small muted">Check <code>INPUT_PULLUP</code>, and that the button straddles the gap with pin 4 on row 13 and GND on row 11.</span></div></div><div class="trow"><div><b>The needle jitters back and forth</b><br><span class="small muted">The reading is flickering between two values. That’s normal for a DHT11 sitting right on the edge of a degree — the easing keeps it small.</span></div></div><div class="trow"><div><b>The UNO restarts when the needle moves</b><br><span class="small muted">The servo is pulling too much current through USB. Make sure the needle isn’t rubbing on the dial, and use a powered USB port.</span></div></div></div>');
  } });

  /* ---------- 10 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A gauge is only as good as its accuracy. Test yours against something you trust, then make it better.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Accurate:</b> the needle reads within 2 °C of the classroom thermostat (or the Serial Monitor).',
      '<b>Responsive:</b> warming the sensor in your hand moves the needle up within 30 seconds.',
      '<b>Mode switch:</b> one press flips to humidity (L LED on), another press flips back.',
      '<b>Smooth:</b> the needle glides — no twitching or buzzing when the reading is steady.',
      '<b>Readable:</b> a classmate 3 metres away can read the temperature off your dial.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Highs and lows', html: 'Remember the lowest and highest temperature since the gauge was switched on, and print them every time they change. Bonus: hold the button for 2 seconds to show the high on the needle.', hint: 'Make two float variables, <code>lowest = 100</code> and <code>highest = -100</code>. Each reading: <code>if (reading &lt; lowest) lowest = reading;</code>' },
      { tag: 'Build + code', title: 'Comfort light', html: 'Add a green LED (with a 220 Ω resistor) on a spare pin that’s on only when the temperature is in your comfort zone, say 19–24 °C.', hint: 'Use <code>&amp;&amp;</code> (“and”): <code>if (t &gt;= 19 &amp;&amp; t &lt;= 24)</code>.' },
      { tag: 'Code', title: 'Fahrenheit mode', html: 'Add a third mode: temperature in °F on a third scale. Make the button cycle through all three modes.', hint: '<code>dht.readTemperature(true)</code> gives °F. Use an <code>int mode</code> that counts 0, 1, 2 and wraps back to 0.' },
      { tag: 'Build + code', cls: 'c', title: 'Humidity alarm', html: 'Make the gauge warn you when the air is too dry (below 25%) or too damp (above 70%): flash an LED or sound the active buzzer.', hint: 'Check the humidity every loop even in temperature mode, so the alarm works in both modes.' },
      { tag: 'Code', title: 'Two sensors, one answer', html: 'Show the <b>average</b> of the DHT11 and thermistor on the needle. Is it more accurate than either one alone? Test it.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 11 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m04 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working weather gauge. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of your finished dial and one close-up of your breadboard wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: warm the sensor and show the needle move, then press the button to switch to humidity.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'weather_gauge' }
      ],
      questions: [
        { id: 'r1', q: 'Explain the difference between how the thermistor and the DHT11 send their readings to the UNO. Use the words analog, digital and voltage.' },
        { id: 'r2', q: 'How does a servo know what angle it’s at, and how does it get there and stay there? Mention the pulse, the potentiometer and feedback.' },
        { id: 'r3', q: 'Explain what map() does in your code, using your own dial’s numbers. What would happen without constrain()?' },
        { id: 'r4', q: 'How accurate is your gauge? Describe how you tested it, what you found, and one thing you changed to improve it.' }
      ]
    }
  };
})(window);
