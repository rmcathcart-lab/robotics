/* Mission 05: Parking assistant — the guide.
 * Students build a "parking sensor" for a cardboard garage: an HC-SR04 measures the distance to a toy car, a green /
 * yellow / red LED bar shows the zone and an active buzzer beeps faster (then solid) as the car gets closer.
 * Pins: Trig 12, Echo 11, buzzer 8, green LED 7, yellow LED 6, red LED 5 (each LED through 220 Ω).
 * Circuit parts are shared below so the build guide and every Virtual UNO always match. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', NAVY = '#070d17';
  var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72', CINK = '#3a2a16';
  var SANS = 'IBM Plex Sans, sans-serif';
  var LEDC = { green: '#3ee07a', yellow: '#ffd23f', red: '#ff4d4d' }, LEDD = { green: '#14532d', yellow: '#7a5d0a', red: '#7a1d1d' };
  function bg(svg, w, h) {
    S('rect', { x: 0, y: 0, width: w, height: h, fill: NAVY }, svg);
    for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
    for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, 'stroke-width': 1, opacity: 0.35 }, svg);
  }
  function glowDefs(svg) {
    var d = svg.querySelector('defs') || S('defs', {}, svg);
    [['red', LEDC.red], ['yellow', LEDC.yellow], ['green', LEDC.green], ['cyan', CY]].forEach(function (c) {
      if (d.querySelector('#m5-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm5-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  function loopAnim(st, fn) {
    stopAnim(st); var t0 = performance.now();
    (function tick(t) { fn(Math.max(0, (t - t0) / 1000)); st.raf = requestAnimationFrame(tick); })(t0);
    st.stop = function () { stopAnim(st); };
  }
  function stopAnim(st) { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  /* an arc of a sound wave: centre cx, cy, radius r, facing right (dir 1) or left (dir -1), half-angle deg */
  function arcD(cx, cy, r, dir, deg) {
    var a = (deg || 32) * Math.PI / 180, x = cx + dir * r * Math.cos(a), y0 = cy - r * Math.sin(a), y1 = cy + r * Math.sin(a);
    return 'M' + x.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + x.toFixed(1) + ' ' + y1.toFixed(1);
  }
  /* a short travelling wave front at x (dir 1 = moving right, -1 = moving left) */
  function front(x, y, dir, r) { r = r || 26; return arcD(x - dir * r, y, r, dir, 42); }
  function slider(box, label, min, max, step, val, fmt, on) {
    var row = el('div', 'slider-row'); row.innerHTML = '<label>' + esc(label) + '</label>';
    var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; r.setAttribute('aria-label', label);
    var o = el('b', '', esc(fmt(val)));
    r.addEventListener('input', function () { o.textContent = fmt(Number(r.value)); on(Number(r.value)); });
    row.appendChild(r); row.appendChild(o); box.appendChild(row);
    return { set: function (v) { r.value = v; o.textContent = fmt(v); on(v); } };
  }
  /* the HC-SR04 drawn front-on (two silver "eyes"), centred at x, y */
  function sonarArt(g, x, y, s) {
    var gg = S('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')' }, g);
    S('rect', { x: -46, y: -22, width: 92, height: 44, rx: 4, fill: '#1d5fa8', stroke: '#2e74c3', 'stroke-width': 1.5 }, gg);
    [-24, 24].forEach(function (cx, i) { S('circle', { cx: cx, cy: 0, r: 17, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, gg); S('circle', { cx: cx, cy: 0, r: 11, fill: '#3b4350' }, gg); T(gg, cx, 3.5, i ? 'R' : 'T', { 'text-anchor': 'middle', 'font-size': 10, fill: '#c9d3de' }); });
    return gg;
  }
  /* a toy car seen from the side, nose pointing right; x = front bumper */
  function carArt(g, x, y, col) {
    var gg = S('g', { transform: 'translate(' + x + ' ' + y + ')' }, g);
    S('path', { d: 'M-150 -14 L-150 -38 Q-148 -46 -138 -46 L-108 -48 L-84 -74 Q-80 -78 -72 -78 L-34 -78 Q-26 -78 -22 -72 L-4 -48 Q4 -46 4 -38 L4 -14 Z', fill: col || '#e5484d', stroke: '#9b1c1c', 'stroke-width': 2 }, gg);
    S('path', { d: 'M-102 -50 L-82 -72 L-56 -72 L-56 -50 Z M-50 -72 L-30 -72 L-14 -50 L-50 -50 Z', fill: '#bfe3f5', opacity: 0.85 }, gg);
    S('rect', { x: -2, y: -34, width: 8, height: 14, rx: 2, fill: '#3b4350' }, gg);
    [-118, -32].forEach(function (wx) { S('circle', { cx: wx, cy: -12, r: 14, fill: '#1c1f24', stroke: '#6b7280', 'stroke-width': 3 }, gg); S('circle', { cx: wx, cy: -12, r: 5, fill: '#9aa5b1' }, gg); });
    return gg;
  }
  function ledBar(g, x, y, gap, r) {
    var lamps = {};
    ['green', 'yellow', 'red'].forEach(function (c, i) {
      var cx = x + i * gap;
      var gl = S('circle', { cx: cx, cy: y, r: r * 2.6, fill: 'url(#m5-' + c + ')', opacity: 0 }, g);
      var d = S('circle', { cx: cx, cy: y, r: r, fill: LEDD[c], stroke: LEDC[c], 'stroke-width': 1.5 }, g);
      lamps[c] = function (on) { gl.setAttribute('opacity', on ? 0.9 : 0); d.setAttribute('fill', on ? LEDC[c] : LEDD[c]); };
    });
    return function (zone) { lamps.green(zone === 'green'); lamps.yellow(zone === 'yellow'); lamps.red(zone === 'red'); };
  }
  function zoneOf(cm) { return cm > 50 ? 'green' : cm > 20 ? 'yellow' : 'red'; }
  function gapOf(cm) { return cm <= 10 ? 0 : cm > 50 ? -1 : Math.trunc((cm - 10) * 540 / 40 + 60); }

  /* ================= circuit parts ================= */
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var PARK = {
    sonar: { type: 'sonar', at: [806, 150], name: 'HC-SR04 ultrasonic sensor' },
    so_v: { type: 'wire', from: 'R+8', to: 'sonar.VCC', color: 'red', via: [[744, 192]], name: 'Red wire: + rail → Vcc' },
    so_t: { type: 'wire', from: 'D12', to: 'sonar.TRIG', color: 'purple', via: [[350, 190], [560, 200], [752, 212]], name: 'Purple wire: pin 12 → Trig' },
    so_e: { type: 'wire', from: 'D11', to: 'sonar.ECHO', color: 'yellow', via: [[350, 206], [560, 216], [752, 228]], name: 'Yellow wire: pin 11 → Echo' },
    so_g: { type: 'wire', from: 'R-12', to: 'sonar.GND', color: 'black', via: [[744, 246]], name: 'Black wire: − rail → Gnd' },
    bz: { type: 'buzzer', a: 'c12', k: 'c14', variant: 'active', name: 'Active buzzer' },
    bz_8: { type: 'wire', from: 'D8', to: 'a12', color: 'orange', name: 'Orange wire: pin 8 → a12' },
    bz_g: { type: 'wire', from: 'a14', to: 'L-14', color: 'black', name: 'Black jumper: a14 → − rail' },
    r_grn: { type: 'res', from: 'e16', to: 'f16', ohms: 220, name: '220 Ω resistor' },
    l_grn: { type: 'led', a: 'j16', k: 'R-16', color: 'green', label: 'GREEN', name: 'Green LED' },
    w_grn: { type: 'wire', from: 'D7', to: 'a16', color: 'green', name: 'Green wire: pin 7 → a16' },
    r_yel: { type: 'res', from: 'e20', to: 'f20', ohms: 220, name: '220 Ω resistor' },
    l_yel: { type: 'led', a: 'j20', k: 'R-20', color: 'yellow', label: 'YELLOW', name: 'Yellow LED' },
    w_yel: { type: 'wire', from: 'D6', to: 'a20', color: 'white', name: 'White wire: pin 6 → a20' },
    r_red: { type: 'res', from: 'e24', to: 'f24', ohms: 220, name: '220 Ω resistor' },
    l_red: { type: 'led', a: 'j24', k: 'R-24', color: 'red', label: 'RED', name: 'Red LED' },
    w_red: { type: 'wire', from: 'D5', to: 'a24', color: 'blue', name: 'Blue wire: pin 5 → a24' }
  };
  var ALL = merge(POWER, PARK);
  var IDS = Object.keys(ALL);
  var SIM_VIEW = [236, 8, 766, 564];
  function devices(o) {
    return merge({
      board: { parts: ALL, show: IDS, vb: B.WIDE, view: SIM_VIEW },
      leds: { 7: 'l_grn', 6: 'l_yel', 5: 'l_red' },
      buzzers: { 8: { part: 'bz', type: 'active' } },
      sonar: { trig: 12, echo: 11, part: 'sonar', cm: 60 }
    }, o || {});
  }
  /* helpers for the checks */
  function lit(sim, p) { var s = sim.pin(p); return !!(s && s.v > 0.5); }
  function zoneNow(sim) { return [lit(sim, 7) ? 'G' : '', lit(sim, 6) ? 'Y' : '', lit(sim, 5) ? 'R' : ''].join(''); }
  function beeps(log, from, to) { var n = 0, prev = 0; log.forEach(function (e) { if (e.pin !== 8) return; if (e.t >= from && e.t <= to && e.v && !prev) n++; prev = e.v; }); return n; }
  function lastT(log) { return log.length ? log[log.length - 1].t : 0; }

  /* ================= code ================= */
  var PING = [
    'digitalWrite(TRIG, LOW);',
    'delayMicroseconds(2);',
    'digitalWrite(TRIG, HIGH);   // 10 us HIGH = ping!',
    'delayMicroseconds(10);',
    'digitalWrite(TRIG, LOW);'];
  var DIST = [
    '// Mission 05, part 1: measure distance',
    'const int TRIG = 12;',
    'const int ECHO = 11;',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  pinMode(TRIG, OUTPUT);',
    '  pinMode(ECHO, INPUT);',
    '}',
    '',
    'void loop() {',
    '  // 1. send a ping'].concat(PING.map(function (l) { return '  ' + l; })).concat([
    '',
    '  // 2. time the echo (in microseconds)',
    '  long duration = pulseIn(ECHO, HIGH);',
    '',
    '  // 3. time -> distance (58 us per cm)',
    '  int cm = duration / 58;',
    '',
    '  Serial.print("Echo: ");',
    '  Serial.print(duration);',
    '  Serial.print(" us   Distance: ");',
    '  Serial.print(cm);',
    '  Serial.println(" cm");',
    '  delay(200);',
    '}']).join('\n');
  var READ_FN = [
    '// pings once; returns cm (999 = nothing there)',
    'int readDistance() {'].concat(PING.map(function (l) { return '  ' + l; })).concat([
    '  long duration = pulseIn(ECHO, HIGH, 30000);  // max 30 ms',
    '  if (duration == 0) return 999;   // no echo',
    '  return duration / 58;',
    '}']);
  var ZONE_FN = [
    '// lights the LED for distance d',
    'void showZone(int d) {',
    '  if (d > FAR_CM) {                 // far away: green',
    '    digitalWrite(GREEN_LED, HIGH);',
    '    digitalWrite(YELLOW_LED, LOW);',
    '    digitalWrite(RED_LED, LOW);',
    '  } else if (d > NEAR_CM) {         // getting close: yellow',
    '    digitalWrite(GREEN_LED, LOW);',
    '    digitalWrite(YELLOW_LED, HIGH);',
    '    digitalWrite(RED_LED, LOW);',
    '  } else {                          // nearly there: red',
    '    digitalWrite(GREEN_LED, LOW);',
    '    digitalWrite(YELLOW_LED, LOW);',
    '    digitalWrite(RED_LED, HIGH);',
    '  }',
    '}'];
  var PINS = [
    'const int TRIG = 12;',
    'const int ECHO = 11;',
    'const int BUZZER = 8;',
    'const int GREEN_LED = 7;',
    'const int YELLOW_LED = 6;',
    'const int RED_LED = 5;'];
  var SETUP = [
    'void setup() {',
    '  Serial.begin(9600);',
    '  pinMode(TRIG, OUTPUT);',
    '  pinMode(ECHO, INPUT);',
    '  pinMode(BUZZER, OUTPUT);',
    '  pinMode(GREEN_LED, OUTPUT);',
    '  pinMode(YELLOW_LED, OUTPUT);',
    '  pinMode(RED_LED, OUTPUT);',
    '}'];
  var ZONES = ['// Mission 05, part 2: distance zones'].concat(PINS.filter(function (l) { return !/BUZZER/.test(l); })).concat([
    '',
    'const int FAR_CM = 50;    // beyond: all clear',
    'const int NEAR_CM = 20;   // closer: nearly there',
    ''], SETUP.filter(function (l) { return !/BUZZER/.test(l); }), [''], READ_FN, [
    '',
    'void loop() {',
    '  int cm = readDistance();     // call it, keep the answer',
    '',
    '  if (cm > FAR_CM) {           // far away: green',
    '    digitalWrite(GREEN_LED, HIGH);',
    '    digitalWrite(YELLOW_LED, LOW);',
    '    digitalWrite(RED_LED, LOW);',
    '  } else if (cm > NEAR_CM) {   // getting close: yellow',
    '    digitalWrite(GREEN_LED, LOW);',
    '    digitalWrite(YELLOW_LED, HIGH);',
    '    digitalWrite(RED_LED, LOW);',
    '  } else {                     // nearly there: red',
    '    digitalWrite(GREEN_LED, LOW);',
    '    digitalWrite(YELLOW_LED, LOW);',
    '    digitalWrite(RED_LED, HIGH);',
    '  }',
    '',
    '  Serial.print(cm);',
    '  Serial.println(" cm");',
    '  delay(100);',
    '}']).join('\n');
  var CONSTS = [
    'const int FAR_CM = 50;    // beyond: green, quiet',
    'const int NEAR_CM = 20;   // closer: red',
    'const int STOP_CM = 10;   // closer: solid tone',
    'const int BEEP_MS = 40;   // beep length (ms)',
    '',
    'int cm = 999;                 // latest distance',
    'unsigned long lastPing = 0;   // last measurement',
    'unsigned long lastBeep = 0;   // last beep start',
    'bool buzzing = false;         // is the buzzer on now?'];
  var SET_FN = [
    '// turns the buzzer on or off, but only if it needs to change',
    'void setBuzzer(bool on) {',
    '  if (on != buzzing) {',
    '    digitalWrite(BUZZER, on);',
    '    buzzing = on;',
    '  }',
    '}'];
  var FROZEN = ['// The delay() version: it works, but watch the LEDs'].concat(PINS, [''], CONSTS.slice(0, 4), [''], SETUP, [''], READ_FN, [''], ZONE_FN, [
    '',
    'void loop() {',
    '  int cm = readDistance();',
    '  showZone(cm);',
    '  if (cm <= STOP_CM) {',
    '    digitalWrite(BUZZER, HIGH);',
    '  } else if (cm <= FAR_CM) {',
    '    digitalWrite(BUZZER, HIGH);   // beep...',
    '    delay(BEEP_MS);',
    '    digitalWrite(BUZZER, LOW);',
    '    delay(map(cm, STOP_CM, FAR_CM, 60, 600));  // frozen!',
    '  } else {',
    '    digitalWrite(BUZZER, LOW);',
    '  }',
    '}']).join('\n');
  var BEEPER = ['// Mission 05, part 3: beep faster as it gets closer, without delay()'].concat(PINS, [''], CONSTS, [''], SETUP, [''], READ_FN, [''], ZONE_FN, [''], SET_FN, [
    '',
    'void loop() {',
    '  unsigned long now = millis();   // what time is it?',
    '',
    '  // measure every 60 ms (the sensor needs a rest)',
    '  if (now - lastPing >= 60) {',
    '    lastPing = now;',
    '    cm = readDistance();',
    '    showZone(cm);',
    '  }',
    '',
    '  // the beeper',
    '  if (cm <= STOP_CM) {',
    '    setBuzzer(true);    // too close: solid tone',
    '  } else if (cm <= FAR_CM) {',
    '    int gap = map(cm, STOP_CM, FAR_CM, 60, 600);  // ms',
    '    // YOUR TURN: if at least gap ms have passed since lastBeep,',
    '    //   remember the time and turn the buzzer on',
    '',
    '    // YOUR TURN: once the beep has lasted BEEP_MS, turn the buzzer off',
    '',
    '  } else {',
    '    setBuzzer(false);   // far away: quiet',
    '  }',
    '}']).join('\n');
  var BEEP_ANSWER = [
    '    if (now - lastBeep >= gap) {      // time to beep?',
    '      lastBeep = now;',
    '      setBuzzer(true);',
    '    }',
    '    if (now - lastBeep >= BEEP_MS) {  // beep long enough?',
    '      setBuzzer(false);',
    '    }'].join('\n');
  var FINAL = [
    '/*',
    '  Mission 05: Parking assistant',
    '  An HC-SR04 measures the distance to the car. The LED bar shows the zone,',
    '  and the buzzer beeps faster as the car gets closer, then goes solid.',
    '*/'].concat(PINS, [''], CONSTS, ['unsigned long lastPrint = 0;  // last report', ''], SETUP, [
    '',
    'void loop() {',
    '  unsigned long now = millis();',
    '',
    '  if (now - lastPing >= 60) {     // ~16 times a second',
    '    lastPing = now;',
    '    cm = readDistance();',
    '    showZone(cm);',
    '  }',
    '',
    '  updateBeeper(now);',
    '',
    '  if (now - lastPrint >= 500) {   // twice a second',
    '    lastPrint = now;',
    '    Serial.print("Distance: ");',
    '    if (cm == 999) {',
    '      Serial.println("nothing in range");',
    '    } else {',
    '      Serial.print(cm);',
    '      Serial.println(" cm");',
    '    }',
    '  }',
    '}',
    ''], READ_FN, [''], ZONE_FN, [''], SET_FN, [
    '',
    '// beeps faster as the car gets closer, never stopping',
    'void updateBeeper(unsigned long now) {',
    '  if (cm <= STOP_CM) {',
    '    setBuzzer(true);    // too close: solid tone',
    '  } else if (cm <= FAR_CM) {',
    '    int gap = map(cm, STOP_CM, FAR_CM, 60, 600);'], BEEP_ANSWER.split('\n'), [
    '  } else {',
    '    setBuzzer(false);   // far away: quiet',
    '  }',
    '}']).join('\n');
  /* Workaround (kit): the Virtual UNO keeps every pass of a delay-free loop() in memory while it runs, and a millis()
   * sketch passes through loop() tens of thousands of times a second. Pause those sims after a while so a Chromebook
   * doesn't run out of memory. */
  function pauseAfter(api, secs) {
    var sim = api.board.svg.closest('.sim'), t = null;
    if (!sim) return;
    function arm() { clearTimeout(t); t = setTimeout(function () { api.stop(); var m = sim.querySelector('.sim-msg'); if (m) { m.className = 'sim-msg'; m.innerHTML = '<b>Paused.</b> The Virtual UNO pauses a delay-free sketch after ' + secs + ' seconds to save your computer’s memory. Press <b>Upload &amp; run</b> to keep going.'; } }, secs * 1000); }
    sim.querySelectorAll('.sim-ctl button').forEach(function (bt) { if (/Upload|Check/.test(bt.textContent)) bt.addEventListener('click', arm); if (/^Stop$/.test(bt.textContent.trim())) bt.addEventListener('click', function () { clearTimeout(t); }); });
    if (RL.onLeave) RL.onLeave(function () { clearTimeout(t); });
  }
  function lineOf(src, needle, from) { var ls = src.split('\n'); for (var i = (from || 0); i < ls.length; i++) if (ls[i].indexOf(needle) >= 0) return i + 1; return 1; }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '5 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m05;
    var wrap = el('div', 'brief');
    var left = el('div', '');
    left.innerHTML = '<p class="lead">Back a modern car toward a wall and it starts to beep — slowly at first, then faster, then one long tone that means STOP. In this mission you’ll build that parking assistant for a cardboard garage: an ultrasonic sensor measures how far away the car is, a green-yellow-red LED bar shows the zone, and a buzzer counts down the last few centimetres.</p>' +
      '<p>You’ll measure distance with the speed of sound, write your own functions that hand back answers, and learn the trick that lets one program do several things at once: timing with <code>millis()</code> instead of <code>delay()</code>.</p>';
    UI.edp(left, [2, 4, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360, frames: [{
      cap: 'The sensor pings the car about 16 times a second. Green means plenty of room, yellow means slow down (and the beeping starts), red means nearly there — and a solid tone means stop.',
      draw: function (svg, _, st) {
        clear(svg); glowDefs(svg); bg(svg, 800, 360);
        S('rect', { x: 0, y: 300, width: 800, height: 60, fill: '#0e1826' }, svg);
        S('line', { x1: 0, y1: 300, x2: 800, y2: 300, stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        // garage wall + sensor
        S('rect', { x: 700, y: 110, width: 26, height: 190, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 690, y: 254, width: 10, height: 36, rx: 2, fill: '#1d5fa8' }, svg);
        S('circle', { cx: 694, cy: 263, r: 5, fill: '#c0c6cc' }, svg); S('circle', { cx: 694, cy: 281, r: 5, fill: '#c0c6cc' }, svg);
        var setBar = ledBar(svg, 676, 86, 24, 9);
        S('rect', { x: 664, y: 72, width: 72, height: 28, rx: 4, fill: 'none', stroke: GRID }, svg);
        // stop lines (tape)
        var X = function (cm) { return 690 - cm * 5.6; };
        [[10, '#ff4d4d', '10'], [20, '#ffd23f', '20'], [50, '#3ee07a', '50']].forEach(function (z) { S('rect', { x: X(z[0]) - 2, y: 302, width: 4, height: 18, fill: z[1], opacity: 0.85 }, svg); T(svg, X(z[0]), 338, z[2] + ' cm', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); });
        var car = carArt(svg, 200, 300);
        var waves = [0, 1, 2].map(function () { return S('path', { d: '', stroke: CY, 'stroke-width': 2.5, fill: 'none', opacity: 0 }, svg); });
        var dl = T(svg, 40, 60, '', { 'font-size': 34, fill: CY, 'font-weight': 600 });
        T(svg, 40, 86, 'DISTANCE TO THE CAR', { 'font-size': 10, fill: MUT, 'letter-spacing': '2' });
        var beepT = T(svg, 560, 70, 'BEEP', { 'font-size': 16, fill: CY, 'letter-spacing': '3', 'font-weight': 600, opacity: 0 });
        var zl = T(svg, 40, 120, '', { 'font-size': 12, 'letter-spacing': '2' });
        var lastBeep = 0;
        loopAnim(st, function (t) {
          var c = t % 15, cm;
          if (c < 9) cm = 95 - c * 10; else if (c < 11.5) cm = 5; else cm = 5 + (c - 11.5) / 3.5 * 90;
          cm = Math.max(5, cm);
          car.setAttribute('transform', 'translate(' + (X(cm) - 8) + ' 300)');
          dl.textContent = Math.round(cm) + ' cm';
          var z = zoneOf(cm); setBar(z); zl.textContent = cm <= 10 ? 'STOP' : z === 'green' ? 'ALL CLEAR' : z === 'yellow' ? 'SLOW DOWN' : 'NEARLY THERE'; zl.setAttribute('fill', LEDC[z]);
          var gp = gapOf(cm), ms = t * 1000, on;
          if (gp === 0) on = true; else if (gp < 0) on = false; else { if (ms - lastBeep >= gp) lastBeep = ms; on = ms - lastBeep < 60; }
          beepT.setAttribute('opacity', on ? 1 : 0); beepT.textContent = gp === 0 ? 'BEEEEEEP' : 'BEEP';
          var D = 690 - X(cm) + 6, ph = (t * 1.6) % 1;
          waves.forEach(function (w, i) { var f = (ph + i * 0.06) % 1, r = f * D * 2, out = r < D, x = out ? 690 - r : 690 - 2 * D + r; w.setAttribute('d', front(x, 272, out ? -1 : 1, 22)); w.setAttribute('opacity', 0.95 - i * 0.3); w.setAttribute('stroke', out ? CY : '#7dd3fc'); });
        });
      } }] });
    UI.callout(b, 'safety', 'Safety', '<p>Everything runs on 5 V from USB, so it’s safe to touch. <b>Unplug the USB cable while you change wiring</b>, and take care with the craft knife and hot glue when you build the garage.</p>');
  } });

  /* ---------- 02 echolocation ---------- */
  steps.push({ id: 'echo', title: 'Seeing with sound', stage: '02 Research', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your sensor doesn’t see the car — it hears it. It shouts a short, very high-pitched ping and listens for the echo. The longer the echo takes to come back, the farther away the car is. Animals figured this out millions of years before engineers did.</p>');
    echoExplainer(b);
    UI.html(b, '<h2>The speed of sound</h2><p>Sound travels through air at about <b>343 metres per second</b> (at 20 °C). That’s fast — about a kilometre every three seconds — so for things a few centimetres away the echo takes only <b>microseconds</b> (millionths of a second). In those units the speed of sound is <b>0.0343 cm per microsecond</b>.</p>' +
      '<div class="callout"><span class="label">The key idea</span><p>The sound travels to the object <b>and back</b>, so it covers the distance twice:<br><code>distance = time × 0.0343 ÷ 2</code></p></div><p>Move the wall below and watch the echo time change. Then change the air temperature — sound is faster in warm air.</p>');
    wallLab(b, ctx);
    UI.html(b, '<h3>The ÷58 shortcut</h3><p>Dividing by 2 and multiplying by 0.0343 is the same as dividing by about <b>58</b> (because 2 ÷ 0.0343 ≈ 58.3). That’s why Arduino code for this sensor almost always says <code>cm = duration / 58;</code> — it’s the speed of sound, hiding in a single number.</p>');
    UI.numq(b, ctx, { id: 'q-echo1', q: 'The echo takes <b>1740 µs</b> to come back. How far away is the object, in cm?', answer: 29.8, tol: 0.6, unit: 'cm', explain: '1740 × 0.0343 ÷ 2 = <b>29.8 cm</b> (or 1740 ÷ 58 = 30). About the length of a ruler.', hint: 'Multiply the time by 0.0343, then divide by 2 because the sound went there and back.' });
    UI.numq(b, ctx, { id: 'q-echo2', q: 'A wall is <b>100 cm</b> away. How long does the echo take, in microseconds?', answer: 5831, tol: 40, unit: 'µs', explain: 'The sound travels 200 cm in total: 200 ÷ 0.0343 = <b>about 5830 µs</b> (5.8 thousandths of a second).', hint: 'Total trip = 2 × 100 cm. Time = distance ÷ speed = 200 ÷ 0.0343.' });
    UI.mcq(b, ctx, { id: 'q-echo3', q: 'Why does the formula divide by 2?', options: ['Because the sensor has two “eyes”', 'Because the sound goes to the object and comes back, so it travels the distance twice', 'To convert microseconds to milliseconds', 'To round the answer'], answer: 1, explain: 'The echo time is for the round trip. Half of it is the trip there.', hints: { 0: 'One eye sends and one listens, but that’s not why we halve the time.' } });
  } });
  function echoExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Echolocation: bats, cars and your sensor', w: 820, h: 340,
      init: function (svg) { glowDefs(svg); },
      frames: [
        { cap: '<b>Bats hunt in the dark with sound.</b> A bat clicks and listens. When the echo bounces back off a moth, the bat’s brain measures how long it took — a short delay means the moth is close. Dolphins and whales do the same thing underwater.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          var bat = S('g', { transform: 'translate(150 170)' }, svg);
          S('path', { d: 'M0 0 C -20 -30, -60 -40, -90 -20 C -70 -14, -64 -4, -60 8 C -48 -2, -36 0, -26 10 C -18 0, -8 2, 0 12 C 8 2, 18 0, 26 10 C 36 0, 48 -2, 60 8 C 64 -4, 70 -14, 90 -20 C 60 -40, 20 -30, 0 0 Z', fill: '#4b5563', stroke: '#9ca3af', 'stroke-width': 1.5 }, bat);
          S('circle', { cx: 0, cy: -2, r: 10, fill: '#6b7280' }, bat); S('path', { d: 'M-6 -10 l-3 -10 l7 6 M6 -10 l3 -10 l-7 6', fill: '#6b7280', stroke: '#6b7280' }, bat);
          var moth = S('g', {}, svg);
          S('ellipse', { cx: 606, cy: 162, rx: 16, ry: 10, fill: '#b98d55', transform: 'rotate(-35 606 162)' }, moth); S('ellipse', { cx: 634, cy: 162, rx: 16, ry: 10, fill: '#b98d55', transform: 'rotate(35 634 162)' }, moth);
          S('ellipse', { cx: 620, cy: 172, rx: 5, ry: 14, fill: '#d3aa72' }, moth); T(moth, 620, 214, 'MOTH', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var w = [0, 1, 2].map(function () { return S('path', { d: '', fill: 'none', 'stroke-width': 3 }, svg); });
          var lab = T(svg, 410, 300, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '1.5' });
          var D = 600 - 150;
          loopAnim(st, function (t) {
            var f = (t * 0.45) % 1, r = f * 2 * D;
            w.forEach(function (p, i) { var rr = r - i * 16; if (rr <= 2) { p.setAttribute('opacity', 0); return; } var out = rr < D; p.setAttribute('d', out ? arcD(160, 170, rr, 1, 30) : arcD(160 + 2 * D - 20, 170, rr - D + 2, -1, 30)); p.setAttribute('stroke', out ? CY : '#7dd3fc'); p.setAttribute('opacity', 0.9 - i * 0.25); });
            lab.textContent = r < D ? 'CLICK →' : '← ECHO: the moth is ' + 'close';
            moth.setAttribute('transform', 'translate(0 ' + (Math.sin(t * 5) * 6) + ')');
          });
        } },
        { cap: '<b>Cars do it too.</b> Those little round buttons in a car’s bumper are ultrasonic sensors. Each one pings, times the echo, and the car beeps faster as you get closer to something. Your parking assistant is a mini version of exactly this.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          S('line', { x1: 0, y1: 270, x2: 820, y2: 270, stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
          var car = S('g', { transform: 'translate(560 270) scale(-1.6 1.6)' }, svg); carArt(car, 0, 0, '#3b82f6'); S('circle', { cx: 3, cy: -25, r: 3.5, fill: '#c0c6cc', stroke: '#e1e8ef' }, car);
          T(svg, 600, 316, 'SENSORS IN THE BUMPER', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          S('rect', { x: 120, y: 130, width: 30, height: 140, fill: '#6b7280' }, svg); T(svg, 135, 120, 'POLE', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var w = [0, 1, 2].map(function () { return S('path', { d: '', fill: 'none', 'stroke-width': 3 }, svg); });
          var setBar = ledBar(svg, 620, 60, 26, 10), beep = T(svg, 700, 66, 'BEEP', { 'font-size': 14, fill: CY, 'letter-spacing': '2', opacity: 0 });
          var cg = car;
          loopAnim(st, function (t) {
            var c = t % 8, off = c < 6 ? c * 50 : 300, x = 560 - off, D = x - 150;
            cg.setAttribute('transform', 'translate(' + x + ' 270) scale(-1.6 1.6)');
            var cm = D / 4; setBar(zoneOf(cm));
            var gp = gapOf(cm), ms = (t * 1000) % 100000, on = gp === 0 ? true : gp < 0 ? false : (ms % gp) < 60; beep.setAttribute('opacity', on ? 1 : 0);
            var f = (t * 1.2) % 1, r = f * 2 * D;
            w.forEach(function (p, i) { var rr = r - i * 14; if (rr <= 2) { p.setAttribute('opacity', 0); return; } var out = rr < D, xx = out ? x - rr : x - 2 * D + rr; p.setAttribute('d', front(xx, 230, out ? -1 : 1, 24)); p.setAttribute('stroke', out ? CY : '#7dd3fc'); p.setAttribute('opacity', 0.9 - i * 0.25); });
          });
        } },
        { cap: '<b>Your HC-SR04 has a speaker and a microphone.</b> The <b>T</b> (transmitter) sends a burst of 8 pulses at 40 000 vibrations per second (40 kHz) — far too high for humans to hear (we top out around 20 kHz). The <b>R</b> (receiver) listens for the echo. A chip on the board times the gap.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          sonarArt(svg, 130, 170, 1.5);
          S('rect', { x: 700, y: 50, width: 30, height: 240, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg); T(svg, 715, 316, 'WALL', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var burst = S('path', { d: '', stroke: CY, 'stroke-width': 2.5, fill: 'none' }, svg);
          var tl = T(svg, 410, 60, '', { 'text-anchor': 'middle', 'font-size': 22, fill: CY, 'font-weight': 600 });
          T(svg, 410, 84, 'THE CHIP’S STOPWATCH', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          var lab = T(svg, 410, 300, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT, 'letter-spacing': '1' });
          var x0 = 166, x1 = 700, yo = 134, yb = 206, D = x1 - x0;
          loopAnim(st, function (t) {
            var f = (t * 0.35) % 1, sx, y, out, us;
            if (f < 0.5) { sx = x0 + f * 2 * D; y = yo; out = true; } else { sx = x1 - (f - 0.5) * 2 * D; y = yb; out = false; }
            var d = '', n = 8, len = 64;
            for (var i = 0; i <= n * 8; i++) { var xx = sx - (out ? 1 : -1) * i * len / (n * 8), yy = y + Math.sin(i / 8 * Math.PI * 2) * 9; d += (i ? 'L' : 'M') + xx.toFixed(1) + ' ' + yy.toFixed(1); }
            burst.setAttribute('d', d); burst.setAttribute('stroke', out ? CY : '#7dd3fc');
            us = Math.round(f * 4373); tl.textContent = us + ' µs';
            lab.textContent = out ? 'T SENDS 8 PULSES AT 40 kHz →' : '← R HEARS THE ECHO · stopwatch stops';
          });
        } },
        { cap: '<b>There and back.</b> The time the chip measures is for the whole round trip. To find the distance, multiply by the speed of sound and <b>divide by 2</b>. For a wall 75 cm away: the sound travels 150 cm, which takes 150 ÷ 0.0343 ≈ 4373 µs.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 340);
          sonarArt(svg, 130, 170, 1.5);
          S('rect', { x: 700, y: 50, width: 30, height: 240, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
          S('path', { d: 'M200 120 H690', stroke: CY, 'stroke-width': 3 }, svg); S('path', { d: 'M690 120 l-12 -6 v12z', fill: CY }, svg);
          S('path', { d: 'M690 220 H200', stroke: '#7dd3fc', 'stroke-width': 3 }, svg); S('path', { d: 'M200 220 l12 -6 v12z', fill: '#7dd3fc' }, svg);
          T(svg, 445, 108, 'THERE: 75 cm', { 'text-anchor': 'middle', fill: CY, 'letter-spacing': '1.5' });
          T(svg, 445, 246, 'BACK: 75 cm', { 'text-anchor': 'middle', fill: '#7dd3fc', 'letter-spacing': '1.5' });
          var g = S('g', { opacity: 0 }, svg);
          S('rect', { x: 250, y: 150, width: 390, height: 46, rx: 6, fill: '#0e1826', stroke: GRID }, g);
          T(g, 445, 179, 'distance = 4373 × 0.0343 ÷ 2 = 75 cm', { 'text-anchor': 'middle', 'font-size': 15, fill: INK });
          st.later(function () { g.setAttribute('opacity', 1); g.classList.add('part-new'); }, 700);
          T(svg, 445, 300, 'or the shortcut: 4373 ÷ 58 = 75', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
        } }
      ] });
  }
  function wallLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Move the wall</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 280', role: 'img', 'aria-label': 'An ultrasonic ping travelling to a wall and back' }); stage.appendChild(svg);
    glowDefs(svg); bg(svg, 800, 280);
    var X0 = 96, PX = 3.2; // 1 cm = 3.2 px
    S('line', { x1: X0, y1: 236, x2: X0 + 200 * PX, y2: 236, stroke: MUT }, svg);
    for (var c = 0; c <= 200; c += 25) { S('line', { x1: X0 + c * PX, y1: 230, x2: X0 + c * PX, y2: 242, stroke: MUT }, svg); T(svg, X0 + c * PX, 258, c + (c === 200 ? ' cm' : ''), { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); }
    sonarArt(svg, 50, 120, 0.9);
    S('rect', { x: 88, y: 98, width: 8, height: 44, fill: '#1d5fa8' }, svg);
    var wall = S('rect', { x: 0, y: 40, width: 22, height: 180, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
    var waves = [0, 1, 2].map(function () { return S('path', { d: '', fill: 'none', 'stroke-width': 3 }, svg); });
    var tl = T(svg, 400, 30, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT, 'letter-spacing': '1' });
    var cm = 75, temp = 20, ph = 0, last = performance.now(), raf;
    var ctl = el('div', ''); box.appendChild(ctl);
    slider(ctl, 'Wall distance', 5, 200, 1, cm, function (v) { return v + ' cm'; }, function (v) { cm = v; upd(); ctx.check('lab-wall', 1); });
    slider(ctl, 'Air temperature', -20, 40, 1, temp, function (v) { return v + ' °C'; }, function (v) { temp = v; upd(); });
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    function upd() {
      var v = 331.3 + 0.606 * temp, vcm = v / 10000, us = 2 * cm / vcm, naive = us * 0.0343 / 2;
      wall.setAttribute('x', X0 + cm * PX);
      tl.textContent = 'ECHO TIME: ' + Math.round(us) + ' µs  (slowed down a million times so you can see it)';
      var err = naive - cm;
      ro.innerHTML = '<div><span class="label">Speed of sound</span><b>' + v.toFixed(1) + ' m/s</b><span class="small muted"> = ' + vcm.toFixed(4) + ' cm/µs</span></div>' +
        '<div><span class="label">Echo time</span><b>' + Math.round(us) + ' µs</b></div>' +
        '<div><span class="label">The maths</span><span class="small">' + Math.round(us) + ' × ' + vcm.toFixed(4) + ' ÷ 2 = ' + cm + ' cm<br>shortcut: ' + Math.round(us) + ' ÷ 58 = ' + (us / 58).toFixed(1) + ' cm</span></div>' +
        '<div><span class="label">If the code assumes 343 m/s</span><span class="small">' + (Math.abs(err) < 0.25 ? 'spot on' : 'it says ' + naive.toFixed(1) + ' cm (' + (err > 0 ? '+' : '') + err.toFixed(1) + ' cm out)') + '</span></div>';
    }
    (function tick(t) {
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      var D = cm * PX + 4; ph += dt * 520 / (2 * D); ph %= 1;
      waves.forEach(function (p, i) { var f = (ph + i * 0.03) % 1, r = f * 2 * D; if (r < 2) { p.setAttribute('opacity', 0); return; } var out = r < D, xx = out ? X0 + r : X0 + 2 * D - r; p.setAttribute('d', front(xx, 120, out ? 1 : -1, 30)); p.setAttribute('stroke', out ? CY : '#7dd3fc'); p.setAttribute('opacity', 0.95 - i * 0.3); });
      raf = requestAnimationFrame(tick);
    })(last);
    if (RL.onLeave) RL.onLeave(function () { cancelAnimationFrame(raf); });
    upd();
    UI.html(b, '<p class="small muted">On a −20 °C Alberta morning, sound is about 12 m/s slower than in your classroom. A sensor that assumes 343 m/s would think a car 100 cm away is about 4 cm farther than it really is. Real car sensors correct for temperature.</p>');
  }

  /* ---------- 03 build ---------- */
  steps.push({ id: 'build', title: 'Build: sensor, buzzer & LED bar', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The sensor module sits beside the breadboard with four wires. On the breadboard go the active buzzer and three LEDs — the same LED + resistor pattern you used for the crosswalk.</p>');
    UI.html(b, '<h2>Find your parts</h2>');
    UI.gear(b, ctx, 'kit', [
      { id: 'sonar', name: 'HC-SR04 sensor', note: 'Two silver “eyes”, 4 pins', icon: function (svg, S) { S('rect', { x: 18, y: 14, width: 84, height: 40, rx: 3, fill: '#1d5fa8' }, svg); [40, 80].forEach(function (x) { S('circle', { cx: x, cy: 34, r: 15, fill: '#c0c6cc' }, svg); S('circle', { cx: x, cy: 34, r: 9, fill: '#3b4350' }, svg); }); [0, 1, 2, 3].forEach(function (i) { S('rect', { x: 50 + i * 6, y: 54, width: 3, height: 10, fill: '#c9b458' }, svg); }); } },
      { id: 'buzz', name: 'Active buzzer', note: 'The one with a sticker, sealed bottom', icon: function (svg, S) { S('circle', { cx: 60, cy: 30, r: 20, fill: '#16191e', stroke: '#4b5563', 'stroke-width': 2 }, svg); S('circle', { cx: 60, cy: 30, r: 9, fill: '#f4f7fb', opacity: 0.85 }, svg); S('path', { d: 'M54 50 v14 M66 50 v10', stroke: '#b8c2cc', 'stroke-width': 2 }, svg); } },
      { id: 'leds', name: 'LEDs', note: 'Green, yellow, red', icon: function (svg, S) { ['#3ee07a', '#ffd23f', '#ff4d4d'].forEach(function (c, i) { S('path', { d: 'M' + (30 + i * 24) + ' 40 v-16 a8 8 0 0 1 16 0 v16 z', fill: c, opacity: 0.9 }, svg); S('line', { x1: 34 + i * 24, y1: 40, x2: 34 + i * 24, y2: 62, stroke: '#9aa5b1', 'stroke-width': 2 }, svg); S('line', { x1: 42 + i * 24, y1: 40, x2: 42 + i * 24, y2: 56, stroke: '#9aa5b1', 'stroke-width': 2 }, svg); }); } },
      { id: 'res', name: '220 Ω resistors ×3', note: RL.resistorName(220), icon: function (svg, S) { S('line', { x1: 10, y1: 35, x2: 110, y2: 35, stroke: '#b8c2cc', 'stroke-width': 2 }, svg); RL.drawResistorBody(S('g', { transform: 'translate(60 35)' }, svg), 220, 50, 13); } },
      { id: 'fm', name: 'Female-to-male wires', note: '4 for the sensor', icon: function (svg, S) { S('path', { d: 'M14 40 C 40 10, 80 70, 100 40', stroke: '#a78bfa', 'stroke-width': 3.5, fill: 'none' }, svg); S('rect', { x: 4, y: 34, width: 14, height: 12, fill: '#111' }, svg); S('line', { x1: 100, y1: 40, x2: 112, y2: 40, stroke: '#c0c8d0', 'stroke-width': 2 }, svg); } }
    ]);
    UI.callout(b, '', 'Active or passive?', '<p>Your kit has two buzzers that look alike. The <b>active</b> buzzer has a sticker on top and a sealed black bottom; the passive one shows a green circuit board underneath. The active one has its own oscillator inside, so it beeps as soon as it gets 5 V — perfect for <code>digitalWrite()</code>. Its longer leg (marked +) is positive.</p>');
    B.guide(b, { title: 'Parking assistant circuit', parts: ALL, base: [], vb: B.WIDE, steps: [
      { title: 'Power the rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p><b>5V → + rail</b> (red), <b>GND → − rail</b> (black), and bridge both pairs of rails at the bottom.</p>' },
      { title: 'Sensor power', add: ['sonar', 'so_v', 'so_g'], view: [440, 60, 562, 324], html: '<p>Use <b>female-to-male</b> wires on the sensor’s four pins. <b>Vcc</b> → right <b>+ rail</b>, <b>Gnd</b> → right <b>− rail</b>.</p><p class="small muted">Read the labels printed on your module: Vcc, Trig, Echo, Gnd.</p>' },
      { title: 'Trig → 12, Echo → 11', add: ['so_t', 'so_e'], view: [282, 60, 720, 415], html: '<p><b>Trig</b> (trigger) → <b>pin 12</b>: the UNO uses it to say “ping now”. <b>Echo</b> → <b>pin 11</b>: the sensor uses it to report how long the echo took.</p>' },
      { title: 'The active buzzer → pin 8', add: ['bz', 'bz_8', 'bz_g'], html: '<p>Push the buzzer’s <b>+ (long) leg into c12</b> and its other leg into <b>c14</b>. Wire <b>pin 8 → a12</b>, and add a black jumper from <b>a14 to the − rail</b>.</p>' },
      { title: 'Green LED → pin 7', add: ['r_grn', 'l_grn', 'w_grn'], html: '<p>Just like Mission 01: 220 Ω resistor (' + RL.resistorName(220) + ') from <b>e16 to f16</b>, green LED long leg in <b>j16</b>, short leg in the right <b>− rail</b>, and a wire from <b>pin 7 to a16</b>.</p>' },
      { title: 'Yellow LED → pin 6', add: ['r_yel', 'l_yel', 'w_yel'], html: '<p>Resistor <b>e20–f20</b>, yellow LED long leg <b>j20</b> → − rail, wire <b>pin 6 → a20</b>.</p>' },
      { title: 'Red LED → pin 5', add: ['r_red', 'l_red', 'w_red'], html: '<p>Resistor <b>e24–f24</b>, red LED long leg <b>j24</b> → − rail, wire <b>pin 5 → a24</b>.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Pins used: <b>12</b> Trig, <b>11</b> Echo, <b>8</b> buzzer, <b>7</b> green, <b>6</b> yellow, <b>5</b> red. The sensor gets 5 V and GND from the right rails.</p>' }
    ] });
    UI.mcq(b, ctx, { id: 'q-build', q: 'Which wire carries the information about <i>how far away</i> the object is?', options: ['Trig (pin 12)', 'Echo (pin 11)', 'Vcc', 'The buzzer wire'], answer: 1, explain: 'The sensor holds Echo HIGH for exactly as long as the sound took to come back. The length of that pulse is the measurement.', hints: { 0: 'Trig goes <i>from</i> the UNO <i>to</i> the sensor. It only says “start”.' } });
  } });

  /* ---------- 04 measure distance ---------- */
  steps.push({ id: 'distance', title: 'Code it: measure distance', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">No library this time: you’ll talk to the sensor directly. The UNO sends a tiny trigger pulse, then times how long the Echo pin stays HIGH. Here’s the conversation in slow motion.</p>');
    timingExplainer(b);
    UI.html(b, '<h2>Read the code</h2>');
    var L0 = lineOf(DIST, 'digitalWrite(TRIG, LOW)'), Ld = lineOf(DIST, 'pulseIn'), Lc = lineOf(DIST, 'int cm');
    RL.Code.walk(b, DIST, [
      { lines: [2, 3], title: 'Two pins', html: '<p>Trig is an <b>output</b> (the UNO talks), Echo is an <b>input</b> (the UNO listens).</p>' },
      { lines: [L0, L0 + 4], title: 'Send a ping', html: '<p>A short LOW first makes sure the pulse starts cleanly. Then Trig goes HIGH for 10 microseconds and back LOW. <code>delayMicroseconds()</code> is like <code>delay()</code> but a thousand times finer.</p>' },
      { lines: [Ld - 1, Ld], title: 'pulseIn() — a stopwatch', html: '<p><code>pulseIn(ECHO, HIGH)</code> waits for Echo to go HIGH, starts a stopwatch, and stops it when Echo goes LOW. It gives back the time in microseconds.</p><p>It’s a <code>long</code> because the number can be big: up to about 38 000 when nothing is in range.</p>' },
      { lines: [Lc - 1, Lc], title: 'Time → centimetres', html: '<p>The ÷58 shortcut from the lab. Both numbers are whole numbers, so the answer is too — the UNO drops the fraction (35.9 becomes 35).</p>' },
      { lines: [Lc + 2, Lc + 8], title: 'Report', html: '<p>Print the raw echo time and the distance, five times a second. Seeing the raw number helps you check the maths yourself.</p>' }
    ], { name: 'measure_distance' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Run it and drag the <b>Distance to object</b> slider. Check the Serial Monitor: does echo time ÷ 58 match the distance?</p>');
    RL.Sim.create(b, devices({ title: 'Measure distance', code: DIST, name: 'measure_distance', key: 'sim-dist', ctx: ctx, runHint: 'drag the distance slider and watch the Serial Monitor.', checkAfter: 1200,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var got = {};
          function last() { var ls = sim.serialText().trim().split('\n'); var m = /Distance:\s*(-?\d+)/.exec(ls[ls.length - 1] || ''); return m ? Number(m[1]) : null; }
          sim.setDistance(30);
          setTimeout(function () { got.a = last(); sim.setDistance(120); }, 900);
          setTimeout(function () {
            got.b = last(); var r;
            if (got.a == null) r = { pass: false, msg: 'I couldn’t find “Distance: … cm” in the Serial Monitor. Keep the print lines from the example.' };
            else if (Math.abs(got.a - 30) > 2 || Math.abs(got.b - 120) > 4) r = { pass: false, msg: 'At 30 cm your code printed ' + got.a + ' cm, and at 120 cm it printed ' + got.b + ' cm. Check the trigger pulse and the ÷ 58.' };
            else r = { pass: true, msg: '30 cm → ' + got.a + ' cm and 120 cm → ' + got.b + ' cm. Your sensor maths works. Upload it and test with a ruler.' };
            sim.setDistance(60); ctx.check('sim-dist-pass', r.pass ? 1 : 0); resolve(r);
          }, 1900);
        });
      } }));
    UI.html(b, '<h2>Now on the real board</h2><p>Upload, open the Serial Monitor (9600 baud), and point the sensor at a wall or a book. Move it closer and farther. Then try aiming it at something soft (a sweater) or at an angle — what happens to the readings?</p>');
    UI.callout(b, 'plain', 'Troubleshooting', '<ul><li><b>Always 0 cm</b> — Trig and Echo are probably swapped, or Vcc/Gnd aren’t connected. Check the labels on the module.</li><li><b>Big jumpy numbers</b> — nothing is in range (more than about 4 m), or the sensor is aimed at something soft or slanted that scatters the sound.</li><li><b>Stuck at one number</b> — check that Echo really goes to pin 11 and the code says <code>pulseIn(ECHO, HIGH)</code>.</li></ul>');
  } });
  function timingExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Trigger, burst, echo, pulseIn()', w: 820, h: 320,
      init: function (svg, S, st) {
        glowDefs(svg); bg(svg, 820, 320);
        var lanes = [['TRIG · pin 12', 70], ['SOUND', 160], ['ECHO · pin 11', 250]];
        lanes.forEach(function (l) { T(svg, 20, l[1] - 26, l[0], { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); S('line', { x1: 140, y1: l[1], x2: 800, y2: l[1], stroke: GRID }, svg); });
        // x scale: t (µs, compressed) → x
        st.trig = S('polyline', { points: '140,70 180,70 180,40 200,40 200,70 800,70', fill: 'none', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
        var bd = '', i; for (i = 0; i <= 64; i++) bd += (i ? 'L' : 'M') + (210 + i * 1.25).toFixed(1) + ' ' + (160 + Math.sin(i / 8 * Math.PI * 2) * 16).toFixed(1);
        st.burst = S('path', { d: bd, fill: 'none', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        var ed = ''; for (i = 0; i <= 64; i++) ed += (i ? 'L' : 'M') + (640 + i * 1.25).toFixed(1) + ' ' + (160 + Math.sin(i / 8 * Math.PI * 2) * 10).toFixed(1);
        st.echoW = S('path', { d: ed, fill: 'none', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        st.echo = S('polyline', { points: '140,250 300,250 300,220 640,220 640,250 800,250', fill: 'none', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
        st.lt = T(svg, 190, 28, '10 µs', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
        st.lb = T(svg, 250, 196, '8 pulses · 40 kHz', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
        st.le = T(svg, 670, 196, 'echo', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
        st.span = S('g', { opacity: 0 }, svg);
        S('path', { d: 'M300 282 v-8 M640 282 v-8 M300 278 H640', stroke: CY, 'stroke-width': 2 }, st.span);
        T(st.span, 470, 302, 'duration = how long Echo stays HIGH (µs)', { 'text-anchor': 'middle', 'font-size': 12, fill: CY });
        st.watch = T(svg, 470, 204, '', { 'text-anchor': 'middle', 'font-size': 18, fill: CY, 'font-weight': 600 });
        st.head = S('line', { x1: 140, y1: 30, x2: 140, y2: 270, stroke: CY, 'stroke-width': 1.5, 'stroke-dasharray': '4 4', opacity: 0 }, svg);
        st.hl = function (on) {
          [['trig', 'lt'], ['burst', 'lb'], ['echoW', 'le'], ['echo', null]].forEach(function (k, i) { var o = on.indexOf(i) >= 0; st[k[0]].setAttribute('stroke', o ? CY : '#9fb3c8'); st[k[0]].setAttribute('opacity', o ? 1 : 0.4); if (k[1]) st[k[1]].setAttribute('fill', o ? CY : MUT); });
        };
      },
      frames: [
        { cap: '<b>1 · The trigger.</b> Your code sets Trig HIGH for just <b>10 microseconds</b>, then LOW again. That’s the “ping now!” signal.', draw: function (svg, S, st) { stopAnim(st); st.hl([0]); st.span.setAttribute('opacity', 0); st.watch.textContent = ''; st.head.setAttribute('opacity', 0); } },
        { cap: '<b>2 · The burst.</b> The sensor’s own chip fires 8 quick pulses of 40 kHz ultrasound from the T speaker — and at the same moment it sets <b>Echo HIGH</b>.', draw: function (svg, S, st) { stopAnim(st); st.hl([1, 3]); st.span.setAttribute('opacity', 0); st.watch.textContent = ''; } },
        { cap: '<b>3 · The echo.</b> When the R microphone hears the sound come back, the chip sets <b>Echo LOW</b>. So the length of the Echo pulse is exactly the round-trip time of the sound.', draw: function (svg, S, st) { stopAnim(st); st.hl([2, 3]); st.span.setAttribute('opacity', 1); st.span.classList.add('part-new'); st.watch.textContent = ''; } },
        { cap: '<b>4 · pulseIn() is the UNO’s stopwatch.</b> <code>pulseIn(ECHO, HIGH)</code> waits for Echo to go HIGH, counts microseconds while it stays HIGH, and returns the count when it drops. If no echo comes back, Echo stays HIGH for about 38 ms; adding a <b>timeout</b> (like <code>pulseIn(ECHO, HIGH, 30000)</code>) makes it give up and return 0.', draw: function (svg, S, st) {
          st.hl([3]); st.span.setAttribute('opacity', 1); st.head.setAttribute('opacity', 1);
          loopAnim(st, function (t) {
            var f = (t * 0.3) % 1, x = 140 + f * 660; st.head.setAttribute('x1', x); st.head.setAttribute('x2', x);
            var us = x < 300 ? 0 : Math.round((Math.min(x, 640) - 300) / 340 * 1740);
            st.watch.textContent = x < 300 ? 'waiting for HIGH…' : x < 640 ? 'timing: ' + us + ' µs' : 'returns 1740  →  30 cm';
          });
        } }
      ] });
  }

  /* ---------- 05 functions & zones ---------- */
  steps.push({ id: 'zones', title: 'Code it: functions & zones', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Six lines just to ping the sensor is a lot to copy around. Engineers wrap a job like that in a <b>function</b> with a good name, so the rest of the program can just say <code>readDistance()</code> and get an answer back.</p>');
    fnExplainer(b);
    UI.html(b, '<h2>Zones with if / else if</h2><p>An <code>if</code> picks between two paths. An <b>if / else if / else</b> chain picks between several: the UNO checks each condition in order and runs the <b>first</b> one that’s true, then skips the rest.</p>');
    zoneLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-zone', q: 'With <code>if (cm &gt; 50) … else if (cm &gt; 20) … else …</code>, which zone is <b>20 cm</b> in?', options: ['Green', 'Yellow', 'Red', 'None of them'], answer: 2, explain: '20 is not greater than 50, and not greater than 20 either (it’s equal), so the UNO falls through to the <code>else</code>: red.', hints: { 1: 'Check carefully: is 20 <i>greater than</i> 20?' } });
    UI.html(b, '<h2>Read the code</h2>');
    var Lf = lineOf(ZONES, 'int readDistance'), Lp = lineOf(ZONES, 'pulseIn'), Ll = lineOf(ZONES, 'void loop'), Li = lineOf(ZONES, 'if (cm > FAR_CM)');
    RL.Code.walk(b, ZONES, [
      { lines: [8, 9], title: 'The zone boundaries', html: '<p>Two constants define the zones. Change them to suit your garage — nothing else needs to change.</p>' },
      { lines: [Lf - 1, Lf], title: 'A function that returns a value', html: '<p><code>int readDistance()</code>: the <code>int</code> at the front says this function hands back a whole number. Empty brackets mean it needs no information to do its job.</p>' },
      { lines: [Lp, Lp + 2], title: 'Two ways out', html: '<p>The 30 000 µs <b>timeout</b> stops pulseIn() waiting forever when nothing is in front of the sensor. If no echo arrived, the function returns <b>999</b> — a number no real reading could be, so the rest of the code can treat it as “far away”.</p><p><code>return</code> ends the function immediately and hands back the value.</p>' },
      { lines: [Ll + 1, Ll + 1], title: 'Calling it', html: '<p>loop() calls the function and stores the answer in <code>cm</code>. All the pinging is hidden behind one readable line.</p>' },
      { lines: [Li, Li + 12], title: 'Three zones', html: '<p>Far (green), getting close (yellow), nearly there (red). Each branch turns one LED on and the other two off, so exactly one is lit at a time.</p>' }
    ], { name: 'distance_zones' });
    RL.Sim.create(b, devices({ title: 'Distance zones', code: ZONES, name: 'distance_zones', key: 'sim-zones', ctx: ctx, runHint: 'drag the distance slider and watch the LEDs.', checkAfter: 800,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var tests = [[90, 'G'], [35, 'Y'], [12, 'R'], [60, 'G']], res = [], i = 0;
          (function next() {
            if (i >= tests.length) {
              var bad = res.filter(function (r) { return r[1] !== r[2]; }), out;
              if (bad.length) out = { pass: false, msg: 'At ' + bad[0][0] + ' cm the LEDs showed ' + (bad[0][2] || 'nothing') + ' but should show ' + ({ G: 'only green', Y: 'only yellow', R: 'only red' })[bad[0][1]] + '. Check the if / else if conditions and the pin numbers.' };
              else out = { pass: true, msg: '90 cm → green, 35 cm → yellow, 12 cm → red. Exactly one LED at a time.' };
              ctx.check('sim-zones-pass', out.pass ? 1 : 0); resolve(out); return;
            }
            sim.setDistance(tests[i][0]);
            setTimeout(function () { res.push([tests[i][0], tests[i][1], zoneNow(sim)]); i++; next(); }, 600);
          })();
        });
      } }));
    UI.html(b, '<p>Upload it and move your hand toward the sensor. Watch the bar go green → yellow → red.</p>');
  } });
  function fnExplainer(b) {
    var LOOP = ['void loop() {', '  int cm = readDistance();', '  …', '}'];
    var FN = ['int readDistance() {', '  // ping…', '  long duration = pulseIn(…);', '  return duration / 58;', '}'];
    UI.explainer(b, { label: 'Explainer', title: 'Functions that return a value', w: 820, h: 300,
      init: function (svg, S, st) {
        glowDefs(svg); bg(svg, 820, 300);
        function codeBox(x, y, lines, title) {
          var g = S('g', {}, svg), rows = [];
          T(g, x, y - 12, title, { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          S('rect', { x: x, y: y, width: 300, height: 30 + lines.length * 26, rx: 8, fill: '#0b1422', stroke: GRID, 'stroke-width': 1.5 }, g);
          lines.forEach(function (l, i) { var hl = S('rect', { x: x + 6, y: y + 12 + i * 26, width: 288, height: 24, rx: 3, fill: CY, opacity: 0 }, g); rows.push([hl, T(g, x + 16, y + 30 + i * 26, l, { 'font-size': 14, style: 'white-space:pre' })]); });
          return rows;
        }
        st.loop = codeBox(40, 70, LOOP, 'LOOP()');
        st.fn = codeBox(480, 70, FN, 'THE FUNCTION');
        st.arrow = S('path', { d: 'M330 108 C 400 108, 410 94, 476 94', fill: 'none', stroke: CY, 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0 }, svg);
        st.back = S('path', { d: 'M480 172 C 400 172, 360 120, 180 112', fill: 'none', stroke: '#7dd3fc', 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0 }, svg);
        st.token = S('g', { opacity: 0 }, svg); S('rect', { x: -24, y: -14, width: 48, height: 26, rx: 13, fill: CY }, st.token); st.tokT = T(st.token, 0, 5, '34', { 'text-anchor': 'middle', 'font-size': 14, fill: NAVY, 'font-weight': 600 });
        st.note = T(svg, 410, 262, '', { 'text-anchor': 'middle', 'font-size': 13, fill: INK, 'font-family': SANS });
        st.note2 = T(svg, 410, 284, '', { 'text-anchor': 'middle', 'font-size': 13, fill: INK, 'font-family': SANS });
        st.cmBox = T(svg, 40, 236, '', { 'font-size': 14, fill: CY });
        st.mark = function (which, i) { [st.loop, st.fn].forEach(function (rows, k) { rows.forEach(function (r, j) { var on = (k === 0 ? 'loop' : 'fn') === which && j === i; r[0].setAttribute('opacity', on ? 0.18 : 0); }); }); };
      },
      frames: [
        { cap: '<b>A function is a named set of instructions.</b> You’ve been writing two all along: <code>setup()</code> and <code>loop()</code>. Now you’ll write your own. <code>readDistance()</code> holds all the pinging and timing in one place.', draw: function (svg, S, st) { stopAnim(st); st.mark('fn', 0); st.arrow.setAttribute('opacity', 0); st.back.setAttribute('opacity', 0); st.token.setAttribute('opacity', 0); st.note.textContent = 'The name says what it does. The body is the recipe.'; st.note2.textContent = ''; st.cmBox.textContent = ''; } },
        { cap: '<b>Calling it.</b> When loop() reaches <code>readDistance()</code>, the UNO jumps into the function and runs it from the top. loop() waits until the function finishes.', draw: function (svg, S, st) {
          st.back.setAttribute('opacity', 0); st.token.setAttribute('opacity', 0); st.cmBox.textContent = ''; st.note2.textContent = '';
          loopAnim(st, function (t) { var f = t % 4; st.arrow.setAttribute('opacity', f > 0.6 ? 1 : 0); if (f < 0.6) st.mark('loop', 1); else st.mark('fn', Math.min(3, Math.floor((f - 0.6) / 0.8) + 1)); st.note.textContent = f < 0.6 ? 'loop() calls readDistance()…' : '…and the function runs, line by line.'; });
        } },
        { cap: '<b>return hands back an answer.</b> <code>return duration / 58;</code> ends the function and sends the value back to where it was called. There, <code>int cm = …</code> catches it. The <code>int</code> in front of the function’s name promises what type of value comes back.', draw: function (svg, S, st) {
          st.arrow.setAttribute('opacity', 1); st.back.setAttribute('opacity', 1); st.note2.textContent = '';
          var P = st.back;
          loopAnim(st, function (t) {
            var f = (t % 3) / 3, L = P.getTotalLength(), p = P.getPointAtLength(Math.min(1, f * 1.4) * L);
            st.token.setAttribute('opacity', 1); st.token.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
            st.mark(f < 0.15 ? 'fn' : 'loop', f < 0.15 ? 3 : 1);
            st.cmBox.textContent = f > 0.72 ? 'cm is now 34' : ''; st.note.textContent = 'return sends 34 back; cm stores it.';
          });
        } },
        { cap: '<b>void means “returns nothing”.</b> <code>setup()</code> and <code>loop()</code> are <code>void</code>: they do things but don’t hand back an answer. Later you’ll write <code>void showZone(int d)</code>: it needs a distance <i>in</i> (inside the brackets), but gives nothing back.', draw: function (svg, S, st) {
          stopAnim(st); st.mark(null, -1); st.arrow.setAttribute('opacity', 0); st.back.setAttribute('opacity', 0); st.token.setAttribute('opacity', 0); st.cmBox.textContent = '';
          st.note.textContent = 'int readDistance()  → gives a number back'; st.note2.textContent = 'void showZone(int d)  → takes a number in, gives nothing back';
        } }
      ] });
  }
  function zoneLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Follow the if / else if chain</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 250', role: 'img', 'aria-label': 'An if / else if chain choosing an LED for a distance' }); stage.appendChild(svg);
    glowDefs(svg); bg(svg, 800, 250);
    var rows = [['if (cm > 50)', 'green', 'green on'], ['else if (cm > 20)', 'yellow', 'yellow on'], ['else', 'red', 'red on']];
    var boxes = rows.map(function (r, i) {
      var y = 40 + i * 64, g = S('g', {}, svg);
      var rect = S('rect', { x: 40, y: y, width: 300, height: 46, rx: 6, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, g);
      T(g, 60, y + 29, r[0], { 'font-size': 16 });
      var res = T(g, 360, y + 29, '', { 'font-size': 13, fill: MUT });
      return { rect: rect, res: res };
    });
    var setBar = ledBar(svg, 660, 120, 50, 18);
    var dl = T(svg, 710, 70, '', { 'text-anchor': 'middle', 'font-size': 24, fill: CY, 'font-weight': 600 });
    var cm = 35;
    var ctl = el('div', ''); box.appendChild(ctl);
    slider(ctl, 'cm', 2, 120, 1, cm, function (v) { return v + ' cm'; }, function (v) { cm = v; upd(); ctx.check('lab-zone', 1); });
    b.appendChild(box);
    function upd() {
      var z = cm > 50 ? 0 : cm > 20 ? 1 : 2;
      boxes.forEach(function (bx, i) {
        var st = i < z ? 'false → skip' : i === z ? (i === 2 ? 'nothing was true → run this' : 'TRUE → run this, skip the rest') : 'skipped';
        bx.res.textContent = st; bx.res.setAttribute('fill', i === z ? CY : MUT);
        bx.rect.setAttribute('stroke', i === z ? CY : '#9fb3c8'); bx.rect.setAttribute('fill', i === z ? '#0a2a36' : '#0e1826'); bx.rect.setAttribute('opacity', i > z ? 0.45 : 1);
      });
      setBar(['green', 'yellow', 'red'][z]); dl.textContent = cm + ' cm';
    }
    upd();
  }

  /* ---------- 06 beeper ---------- */
  steps.push({ id: 'beeper', title: 'Code it: beep without freezing', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now the buzzer: the closer the car, the shorter the gap between beeps. The obvious way to make a gap is <code>delay()</code>. Try it first — and watch what happens to the LEDs.</p>');
    RL.Sim.create(b, devices({ title: 'The delay() version', code: FROZEN, name: 'delay_version', key: 'sim-frozen', ctx: ctx, runHint: 'set the distance to about 45 cm, wait, then drag it quickly to 5 cm. How long until the red LED comes on?' }));
    UI.html(b, '<p>At 45 cm the UNO spends about half a second inside <code>delay()</code> after each beep. During a delay it does <b>nothing</b>: no measuring, no LEDs, no checking. A real car moving at walking speed covers 70 cm in that half second.</p>');
    timelineExplainer(b);
    UI.html(b, '<div class="callout"><span class="label">The key idea</span><p><code>millis()</code> gives the number of milliseconds since the UNO started. To do something every <code>gap</code> ms without stopping: remember <b>when</b> you last did it, and each time round loop() ask <code>if (now - lastBeep &gt;= gap)</code>. If it’s not time yet, carry on with everything else.</p></div>');
    UI.mcq(b, ctx, { id: 'q-millis', q: '<code>lastBeep</code> is 12 000 and <code>millis()</code> is now 12 350. The gap is 400 ms. What should the code do?', options: ['Beep now', 'Nothing yet — only 350 ms have passed, so keep measuring and check again next time', 'Wait 50 ms with delay(50)', 'Reset millis() to 0'], answer: 1, explain: '12 350 − 12 000 = 350, which is less than 400. Not time yet — loop() carries on and checks again a moment later.', hints: { 2: 'That would freeze the UNO again, just for less time.' } });
    UI.html(b, '<h2>Your turn</h2><p>This sketch measures every 60 ms with the millis() pattern (look at the first <code>if</code> in loop()). Use the same pattern to finish the beeper: start a beep when <code>gap</code> ms have passed since <code>lastBeep</code>, and end it once it has lasted <code>BEEP_MS</code>.</p>');
    var Ll = lineOf(BEEPER, 'void loop'), Lp = lineOf(BEEPER, 'if (now - lastPing'), Lb = lineOf(BEEPER, 'if (cm <= STOP_CM)', Ll), Lg = lineOf(BEEPER, 'int gap');
    RL.Code.walk(b, BEEPER, [
      { lines: [lineOf(BEEPER, 'int cm = 999'), lineOf(BEEPER, 'bool buzzing')], title: 'Variables that remember', html: '<p><code>unsigned long</code> holds big whole numbers that are never negative — just right for millis(), which reaches 86 400 000 after a day. These variables live outside loop(), so they keep their values between passes.</p>' },
      { lines: [lineOf(BEEPER, 'void showZone'), lineOf(BEEPER, 'void showZone') + 14], title: 'showZone()', html: '<p>The zone code from the last step, moved into a <code>void</code> function. It takes the distance <i>in</i> as <code>d</code> and returns nothing.</p>' },
      { lines: [lineOf(BEEPER, 'void setBuzzer') - 1, lineOf(BEEPER, 'void setBuzzer') + 5], title: 'setBuzzer(): change only when needed', html: '<p>Without delays, loop() runs thousands of times a second. Writing “off, off, off…” to the buzzer every time is wasted work. <code>setBuzzer(true)</code> or <code>setBuzzer(false)</code> remembers the buzzer’s state in <code>buzzing</code> and only calls digitalWrite when it actually changes. <code>!=</code> means “is not equal to”.</p><p class="small muted">A <code>bool</code> works in digitalWrite: <code>true</code> is HIGH and <code>false</code> is LOW.</p>' },
      { lines: [Ll + 1, Ll + 1], title: 'What time is it?', html: '<p>Read the clock once at the top of loop(), and use <code>now</code> everywhere below.</p>' },
      { lines: [Lp - 1, Lp + 4], title: 'The pattern', html: '<p>Has it been 60 ms since the last ping? If yes: write down the time, measure, and update the LEDs. If no: skip it — loop() will come round again in a fraction of a millisecond.</p>' },
      { lines: [Lb, Lb + 1], title: 'Solid when too close', html: '<p>Closer than STOP_CM: the buzzer just stays on. (Far away, the <code>else</code> at the bottom keeps it off.)</p>' },
      { lines: [Lg, Lg + 5], title: 'Your turn', html: '<p><code>map()</code> turns 10–50 cm into a gap of 60–600 ms. Write two ifs: one that starts a beep (<code>lastBeep = now;</code> and <code>setBuzzer(true);</code>) when <code>now - lastBeep &gt;= gap</code>, and one that calls <code>setBuzzer(false);</code> when <code>now - lastBeep &gt;= BEEP_MS</code>. No delay() allowed!</p>' }
    ], { name: 'beeper', download: false });
    var simB = RL.Sim.create(b, devices({ title: 'Beep without freezing', code: BEEPER, name: 'beeper', key: 'sim-beeper', ctx: ctx, runHint: 'drag the distance slider from 100 cm down to 5 cm.', checkAfter: 600,
      check: function (log, sim) { return beepCheck(log, sim, ctx, 'sim-beeper-pass'); } }));
    // (the Virtual UNO no longer needs pausing: its loop frees memory as it goes)
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the two ifs</summary><p class="small">Put these where the YOUR TURN comments are:</p>';
    RL.Code.block(hint, BEEP_ANSWER, { download: false });
    b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">When it passes, upload it and bring your hand slowly toward the sensor. The beeps should speed up smoothly, and the LEDs should change the instant you cross a line.</p>');
  } });
  /* shared check for the beeper and the final sketch */
  function beepCheck(log, sim, ctx, key) {
    return new Promise(function (resolve) {
      var src = sim.editor.value, w = {};
      if (/\bdelay\s*\(/.test(src.replace(/\/\/[^\n]*/g, ''))) { var r0 = { pass: false, msg: 'Your sketch still uses <code>delay()</code>, which freezes the UNO. Use the <code>now - lastBeep &gt;= gap</code> pattern instead.' }; ctx.check(key, 0); resolve(r0); return; }
      sim.setDistance(100);
      setTimeout(function () { w.t0 = lastT(log); sim.setDistance(40); }, 700);
      setTimeout(function () { w.t1 = lastT(log); w.z40 = zoneNow(sim); sim.setDistance(15); }, 3700);
      setTimeout(function () { w.t2 = lastT(log); w.z15 = zoneNow(sim); sim.setDistance(5); }, 6700);
      setTimeout(function () { w.solidA = lit(sim, 8); }, 7300);
      setTimeout(function () { w.solidB = lit(sim, 8); w.z5 = zoneNow(sim); w.t3 = lastT(log); sim.setDistance(100); }, 7800);
      setTimeout(function () {
        var quiet = beeps(log, w.t0 - 400, w.t0), b40 = beeps(log, w.t1 - 2600, w.t1), b15 = beeps(log, w.t2 - 2600, w.t2), off = !lit(sim, 8), r;
        if (b40 < 2) r = { pass: false, msg: 'At 40 cm the buzzer should beep every half second or so, but I heard ' + b40 + ' beep' + (b40 === 1 ? '' : 's') + '. Check your two ifs: start a beep when <code>now - lastBeep &gt;= gap</code>.' };
        else if (b15 <= b40 + 3) r = { pass: false, msg: 'The buzzer beeps, but not faster when closer: ' + b40 + ' beeps at 40 cm and ' + b15 + ' at 15 cm. Is it using <code>gap</code>?' };
        else if (!w.solidA || !w.solidB) r = { pass: false, msg: 'At 5 cm the buzzer should give one solid tone, but it switched off.' };
        else if (quiet > 0 || !off) r = { pass: false, msg: 'Far away (100 cm) the buzzer should be quiet.' };
        else if (w.z40 !== 'Y' || w.z15 !== 'R' || w.z5 !== 'R') r = { pass: false, msg: 'The beeping works, but the LEDs are wrong: 40 cm showed ' + (w.z40 || 'nothing') + ' and 15 cm showed ' + (w.z15 || 'nothing') + '.' };
        else r = { pass: true, msg: 'Quiet at 100 cm, ' + b40 + ' beeps in 2.6 s at 40 cm, ' + b15 + ' at 15 cm, and a solid tone at 5 cm — with no delay(). The LEDs never freeze.' };
        ctx.check(key, r.pass ? 1 : 0); resolve(r);
      }, 9000);
    });
  }
  function timelineExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'delay() freezes, millis() keeps going', w: 820, h: 330,
      init: function (svg) { glowDefs(svg); },
      frames: [
        { cap: '<b>With delay(), the UNO naps between beeps.</b> Each pass: measure, beep for 40 ms, then sleep for the whole gap (orange). When the car suddenly moves closer (the dashed line), nobody notices until the nap is over — the red LED comes on late.', draw: function (svg, S, st) { lanes(svg, S, st, 'delay'); } },
        { cap: '<b>With millis(), loop() never stops.</b> It runs thousands of times a second. Every 60 ms it measures; every <i>gap</i> ms it starts a beep. In between it just checks the clock and moves on. When the car moves, the next measurement is never more than 60 ms away.', draw: function (svg, S, st) { lanes(svg, S, st, 'millis'); } },
        { cap: '<b>Think of a kitchen timer you glance at.</b> <code>lastBeep</code> is when the timer started. <code>now - lastBeep</code> is how long it’s been. When that reaches <code>gap</code>: beep, and restart the timer (<code>lastBeep = now</code>). You never stand and stare at it — you glance and get on with cooking.', draw: function (svg, S, st) {
          stopAnim(st); clear(svg); bg(svg, 820, 330);
          var cx = 200, cy = 170, R = 100;
          S('circle', { cx: cx, cy: cy, r: R, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 3 }, svg);
          for (var k = 0; k < 12; k++) { var a = k / 12 * Math.PI * 2; S('line', { x1: cx + Math.sin(a) * (R - 10), y1: cy - Math.cos(a) * (R - 10), x2: cx + Math.sin(a) * (R - 2), y2: cy - Math.cos(a) * (R - 2), stroke: MUT, 'stroke-width': 2 }, svg); }
          var sweep = S('path', { d: '', fill: CY, opacity: 0.25 }, svg), hand = S('line', { x1: cx, y1: cy, x2: cx, y2: cy - R + 14, stroke: CY, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
          S('circle', { cx: cx, cy: cy, r: 6, fill: CY }, svg);
          var l1 = T(svg, 380, 90, '', { 'font-size': 16 }), l2 = T(svg, 380, 130, '', { 'font-size': 16 }), l3 = T(svg, 380, 170, '', { 'font-size': 16 }), l4 = T(svg, 380, 220, '', { 'font-size': 18, 'font-weight': 600 });
          var bar = S('rect', { x: 380, y: 250, width: 0, height: 14, rx: 4, fill: CY }, svg); S('rect', { x: 380, y: 250, width: 380, height: 14, rx: 4, fill: 'none', stroke: GRID }, svg);
          var gap = 400, last = 0;
          loopAnim(st, function (t) {
            var now = Math.floor(t * 1000 * 0.5) + 12000, el2 = now - (last || 12000);
            if (!last) last = 12000;
            if (now - last >= gap) last = now;
            el2 = now - last;
            var a = el2 / gap * Math.PI * 2;
            hand.setAttribute('x2', cx + Math.sin(a) * (R - 14)); hand.setAttribute('y2', cy - Math.cos(a) * (R - 14));
            sweep.setAttribute('d', 'M' + cx + ' ' + cy + ' L' + cx + ' ' + (cy - R + 4) + ' A' + (R - 4) + ' ' + (R - 4) + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + (cx + Math.sin(a) * (R - 4)) + ' ' + (cy - Math.cos(a) * (R - 4)) + ' Z');
            l1.textContent = 'now        = ' + now; l2.textContent = 'lastBeep   = ' + last; l3.textContent = 'now - lastBeep = ' + el2 + '   (gap = ' + gap + ')';
            var beep = el2 < 40; l4.textContent = beep ? 'BEEP!  lastBeep = now' : 'not yet → carry on'; l4.setAttribute('fill', beep ? CY : MUT);
            bar.setAttribute('width', Math.min(380, el2 / gap * 380));
          });
        } }
      ] });
    function lanes(svg, S, st, mode) {
      stopAnim(st); clear(svg); bg(svg, 820, 330);
      var names = [['UNO IS…', 70], ['MEASURES', 150], ['BUZZER', 210], ['RED LED', 270]];
      names.forEach(function (n) { T(svg, 20, n[1] + 4, n[0], { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); S('line', { x1: 120, y1: n[1] + 14, x2: 800, y2: n[1] + 14, stroke: GRID }, svg); });
      var g = S('g', {}, svg), head = S('line', { x1: 120, y1: 40, x2: 120, y2: 300, stroke: INK, 'stroke-width': 1.5, opacity: 0.7 }, svg);
      var ev = S('line', { x1: 0, y1: 36, x2: 0, y2: 300, stroke: '#ffd23f', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg), evl = T(svg, 0, 30, 'CAR MOVES CLOSER', { 'text-anchor': 'middle', 'font-size': 10, fill: '#ffd23f', 'letter-spacing': '1' });
      var lag = T(svg, 470, 322, '', { 'text-anchor': 'middle', 'font-size': 12, 'letter-spacing': '1' });
      // build a 2.4 s schedule in ms → x (120 → 800 = 680 px)
      var PX = 680 / 2400, evT = 610, blocks = [];
      function X(ms) { return 120 + ms * PX; }
      var t = 0, gapFar = 500, gapNear = 120, redAt = null;
      if (mode === 'delay') {
        while (t < 2400) {
          var near = t >= evT; if (near && redAt == null) redAt = t;
          blocks.push(['m', t, 4]); blocks.push(['b', t + 4, 40]); var gp = near ? gapNear : gapFar; blocks.push(['d', t + 44, gp]); t += 44 + gp;
        }
      } else {
        for (var m = 0; m < 2400; m += 60) { blocks.push(['m', m, 4]); if (m >= evT && redAt == null) redAt = m; }
        var lb = 0; for (var q = 0; q < 2400; q += 1) { var gq = q >= redAt ? gapNear : gapFar; if (q - lb >= gq || q === 0) { blocks.push(['b', q, 40]); lb = q; } }
        blocks.push(['r', 0, 2400]);
      }
      blocks.forEach(function (bl) {
        var x = X(bl[1]), w = Math.max(2, bl[2] * PX);
        if (bl[0] === 'm') S('rect', { x: x, y: 140, width: Math.max(3, w), height: 22, fill: CY }, g);
        if (bl[0] === 'b') S('rect', { x: x, y: 200, width: w, height: 22, fill: '#7dd3fc' }, g);
        if (bl[0] === 'd') { S('rect', { x: x, y: 56, width: w - 1, height: 26, fill: SIG, opacity: 0.85 }, g); if (w > 60) T(g, x + w / 2, 74, 'delay(): FROZEN', { 'text-anchor': 'middle', 'font-size': 9, fill: NAVY, 'font-weight': 600 }); }
        if (bl[0] === 'r') { S('rect', { x: x, y: 56, width: w, height: 26, fill: CY, opacity: 0.25 }, g); T(g, x + w / 2, 74, 'running loop() over and over: checking the clock', { 'text-anchor': 'middle', 'font-size': 10, fill: INK }); }
      });
      // red LED lane
      var redX = X(redAt + 4);
      S('rect', { x: redX, y: 260, width: 800 - redX, height: 22, fill: LEDC.red, opacity: 0.9 }, g);
      ev.setAttribute('x1', X(evT)); ev.setAttribute('x2', X(evT)); evl.setAttribute('x', X(evT));
      S('path', { d: 'M' + X(evT) + ' 292 H' + redX, stroke: mode === 'delay' ? SIG : GO, 'stroke-width': 3 }, svg);
      lag.textContent = (mode === 'delay' ? 'NOTICED ' : 'NOTICED ') + Math.round(redAt + 4 - evT) + ' ms LATER'; lag.setAttribute('fill', mode === 'delay' ? SIG : GO); lag.setAttribute('x', (X(evT) + redX) / 2 + 60);
      var cover = S('rect', { x: 120, y: 36, width: 680, height: 270, fill: NAVY }, svg);
      loopAnim(st, function (tt) { var f = Math.min(1, (tt % 6) / 4.5), x = 120 + f * 680; cover.setAttribute('x', x); cover.setAttribute('width', Math.max(0, 800 - x)); head.setAttribute('x1', x); head.setAttribute('x2', x); });
    }
  }

  /* ---------- 07 final ---------- */
  steps.push({ id: 'final', title: 'Code it: the finished assistant', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The final sketch tidies everything into functions, so <code>loop()</code> reads almost like English: measure, update the beeper, report. It also uses a <b>third</b> millis() timer to print the distance twice a second without slowing anything down.</p>');
    var Ll = lineOf(FINAL, 'void loop'), Lu = lineOf(FINAL, 'void updateBeeper');
    RL.Code.walk(b, FINAL, [
      { lines: [Ll, Ll + 21], title: 'loop() tells the story', html: '<p>Three jobs, three timers or calls. Each job checks if it’s its turn and gets out of the way. That’s how one small chip juggles a sensor, three LEDs, a buzzer and the Serial Monitor at once.</p>' },
      { lines: [Ll + 11, Ll + 20], title: 'A third timer', html: '<p>The report runs every 500 ms using exactly the same pattern. It also handles the 999 “nothing in range” value so the Serial Monitor says something sensible.</p>' },
      { lines: [lineOf(FINAL, 'int readDistance'), lineOf(FINAL, 'int readDistance') + 9], title: 'Functions after loop()', html: '<p>The functions can come after <code>loop()</code>. The Arduino IDE finds them before compiling, so the order doesn’t matter.</p>' },
      { lines: [Lu - 1, Lu + 15], title: 'updateBeeper()', html: '<p>Your beeper code from the last step, now in its own function. It takes <code>now</code> in, so it uses the same time as the rest of loop().</p>' }
    ], { name: 'parking_assistant' });
    var simF = RL.Sim.create(b, devices({ title: 'Parking assistant', code: FINAL, name: 'parking_assistant', key: 'sim-final', ctx: ctx, runHint: 'drive the car in: drag the distance slider down slowly.', checkAfter: 600,
      check: function (log, sim) {
        return beepCheck(log, sim, ctx, 'sim-final-pass').then(function (r) {
          if (r.pass && !/Distance:\s*\d+ cm/.test(sim.serialText())) { r = { pass: false, msg: 'The LEDs and beeper work, but I didn’t see “Distance: … cm” in the Serial Monitor.' }; ctx.check('sim-final-pass', 0); }
          return r;
        });
      } }));
    // (no pause needed)
    UI.html(b, '<h2>Upload to your assistant</h2><div class="tests"><div class="trow"><div><b>It beeps when nothing is there</b><br><span class="small muted">The sensor may be seeing the floor or a table edge. Aim it straight and level, a few centimetres above the floor.</span></div></div><div class="trow"><div><b>Always green, never beeps</b><br><span class="small muted">No echo is coming back, so readDistance() returns 999 (“nothing in range”). Check Trig → 12 and Echo → 11 — swapping them is the classic mistake — and that Vcc and Gnd are on the rails.</span></div></div><div class="trow"><div><b>The buzzer never stops</b><br><span class="small muted">Something is within 10 cm of the sensor: a wire, a strip of tape, the edge of the wall. Keep the space in front of its eyes clear.</span></div></div><div class="trow"><div><b>The LEDs flicker between two zones</b><br><span class="small muted">The car is sitting right on a boundary and the reading wobbles by a centimetre. Challenge: add smoothing (see Test &amp; improve).</span></div></div><div class="trow"><div><b>An LED never lights</b><br><span class="small muted">Long leg in column j, and check its wire goes to the pin in the code (7, 6 or 5).</span></div></div></div>');
  } });

  /* ---------- 08 garage + accuracy ---------- */
  steps.push({ id: 'garage', title: 'Build the garage & test accuracy', stage: '03 Imagine · 05 Create · 06 Test', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time to give your assistant a job. Build a cardboard garage wall with the sensor at bumper height, mark the stopping lines on the floor, and then find out how accurate your sensor really is.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue burns. Don’t glue directly onto the sensor’s silver eyes or the breadboard.</p>');
    garageBuild(b);
    UI.callout(b, '', 'Design ideas', '<ul><li>Put the LED bar on top of the wall, facing the driver, like a real garage light.</li><li>Paint or draw a parking spot, with the stop line in red.</li><li>Make the garage big enough for two cars — which one does the sensor see?</li><li>Hide the UNO and breadboard behind the wall so only the sensor, LEDs and buzzer show.</li></ul>');
    UI.html(b, '<h2>How accurate is it?</h2><p>Engineers never assume a sensor is right — they <b>test it against something they trust</b>. Put a ruler or measuring tape on the floor from the sensor’s face. Place a box at each distance below, read the Serial Monitor, and type what the sensor says.</p>');
    accuracyTable(b, ctx);
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your garage (sensor height, stop distance, where the LEDs go…) and why.', placeholder: 'I mounted the sensor at… because…' });
  } });
  function garageBuild(b) {
    function base(svg) { clear(svg); glowDefs(svg); S('rect', { x: 0, y: 0, width: 800, height: 380, fill: NAVY }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard garage', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · The back wall.</b> Cut a piece of cardboard about <b>30 cm wide × 15 cm tall</b>, plus a floor about 30 × 60 cm. Glue the wall upright at one end of the floor, with triangle braces behind it so it doesn’t wobble.', draw: function (svg, S, st) {
        stopAnim(st); base(svg);
        S('path', { d: 'M120 300 L620 300 L740 220 L240 220 Z', fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        var w = S('g', { 'class': 'part-new' }, svg);
        S('path', { d: 'M240 220 L740 220 L740 90 L240 90 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, w);
        S('path', { d: 'M300 220 L300 120 L340 220 Z M680 220 L680 120 L720 220 Z', fill: CBD, opacity: 0.8 }, svg);
        T(svg, 490, 80, '30 cm', { 'text-anchor': 'middle', fill: CY }); T(svg, 752, 160, '15 cm', { fill: CY });
        T(svg, 300, 340, 'floor: about 30 × 60 cm', { fill: MUT });
      } },
      { cap: '<b>Step 2 · Sensor at bumper height.</b> Measure the height of your toy car’s front bumper. Cut two holes in the wall at that height, about <b>1.6 cm wide and 2.6 cm apart</b> (centre to centre), and push the sensor’s eyes through from behind. The sound has to hit the car, not go over it.', draw: function (svg, S, st) {
        base(svg);
        S('line', { x1: 40, y1: 300, x2: 760, y2: 300, stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        S('rect', { x: 640, y: 120, width: 24, height: 180, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 664, y: 256, width: 10, height: 36, fill: '#1d5fa8', 'class': 'part-new' }, svg);
        S('circle', { cx: 650, cy: 266, r: 6, fill: '#c0c6cc' }, svg); S('circle', { cx: 650, cy: 282, r: 6, fill: '#c0c6cc' }, svg);
        carArt(svg, 420, 300);
        S('path', { d: 'M440 274 H630', stroke: CY, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
        S('path', { d: 'M600 300 V274 M594 300 h12 M594 274 h12', stroke: CY, 'stroke-width': 2 }, svg); T(svg, 590, 294, 'bumper height', { 'text-anchor': 'end', fill: CY, 'font-size': 11 });
        T(svg, 530, 262, 'same height', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 });
      } },
      { cap: '<b>Step 3 · Keep it level.</b> The HC-SR04 listens in a cone only about 15° wide. Tilt it down and it measures the floor; tilt it up and it measures the ceiling. Check it’s level, and keep wires and tape out of the way of its eyes.', draw: function (svg, S, st) {
        base(svg);
        S('line', { x1: 40, y1: 300, x2: 760, y2: 300, stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        S('rect', { x: 640, y: 120, width: 24, height: 180, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        var good = S('path', { d: 'M640 274 L240 220 L240 328 Z', fill: CY, opacity: 0.18 }, svg), goodL = S('path', { d: 'M640 274 L240 274', stroke: CY, 'stroke-width': 2 }, svg);
        var bad = S('path', { d: 'M640 274 L380 300 L460 300 Z', fill: SIG, opacity: 0.25 }, svg);
        var lab = T(svg, 400, 90, '', { 'text-anchor': 'middle', 'font-size': 14, 'letter-spacing': '1.5' });
        var k = 0;
        (function flip() { var lv = k % 2 === 0; good.setAttribute('opacity', lv ? 0.18 : 0); goodL.setAttribute('opacity', lv ? 1 : 0); bad.setAttribute('opacity', lv ? 0 : 0.35); lab.textContent = lv ? 'LEVEL: THE PING REACHES THE CAR' : 'TILTED: IT MEASURES THE FLOOR'; lab.setAttribute('fill', lv ? CY : SIG); k++; st.later(flip, 1800); })();
        carArt(svg, 230, 300);
        S('rect', { x: 664, y: 256, width: 10, height: 36, fill: '#1d5fa8' }, svg);
      } },
      { cap: '<b>Step 4 · Tape the stopping lines.</b> Measure from the face of the sensor and put tape across the floor at <b>10 cm</b> (stop), <b>20 cm</b> (red zone starts) and <b>50 cm</b> (yellow zone starts). These lines let you check the LEDs change at the right places.', draw: function (svg, S, st) {
        base(svg);
        S('rect', { x: 80, y: 80, width: 640, height: 220, fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 700, y: 80, width: 20, height: 220, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 690, y: 176, width: 10, height: 28, fill: '#1d5fa8' }, svg);
        var X = function (cm) { return 690 - cm * 11; };
        [[10, '#ff4d4d', 'STOP · 10 cm'], [20, '#ff4d4d', '20 cm'], [50, '#ffd23f', '50 cm']].forEach(function (z, i) {
          st.later(function () { S('rect', { x: X(z[0]) - 4, y: 84, width: 8, height: 212, fill: z[1], opacity: 0.85, 'class': 'part-new' }, svg); T(svg, X(z[0]), 324, z[2], { 'text-anchor': 'middle', fill: z[1], 'font-size': 12 }); }, 300 + i * 500);
        });
        T(svg, 400, 60, 'TOP VIEW · measure from the sensor’s face', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1' });
        T(svg, 520, 200, 'RED', { 'text-anchor': 'middle', fill: CINK, 'font-size': 12, 'letter-spacing': '2' });
        T(svg, 330, 200, 'YELLOW', { 'text-anchor': 'middle', fill: CINK, 'font-size': 12, 'letter-spacing': '2' });
        T(svg, 110, 200, 'GREEN', { 'text-anchor': 'middle', fill: CINK, 'font-size': 11, 'letter-spacing': '1' });
      } },
      { cap: '<b>Step 5 · Lights on top, wiring behind.</b> Move the three LEDs and the buzzer onto the top of the wall with <b>female-to-male wires</b> (long leg back into column j, short leg back into the − rail — like the crosswalk housing). The UNO and breadboard hide behind the wall.', draw: function (svg, S, st) {
        base(svg);
        S('path', { d: 'M160 300 L700 300 L700 120 L160 120 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        T(svg, 430, 110, 'FRONT OF THE WALL', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '1.5' });
        sonarArt(svg, 430, 262, 0.8);
        var setBar = ledBar(svg, 380, 150, 50, 12);
        S('circle', { cx: 600, cy: 150, r: 16, fill: '#16191e', stroke: '#4b5563', 'stroke-width': 2 }, svg); S('circle', { cx: 600, cy: 150, r: 7, fill: '#f4f7fb', opacity: 0.85 }, svg);
        var z = ['green', 'yellow', 'red'], k = 0;
        (function cyc() { setBar(z[k % 3]); k++; st.later(cyc, 900); })();
        T(svg, 430, 340, 'UNO + breadboard hidden behind', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      } },
      { cap: '<b>Step 6 · Drive in.</b> Upload the finished sketch and roll the car in slowly. Green until the 50 cm line, yellow and slow beeps, red at 20 cm with fast beeps, and a solid tone at the 10 cm stop line.', draw: function (svg, S, st) {
        base(svg);
        S('line', { x1: 0, y1: 300, x2: 800, y2: 300, stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        S('rect', { x: 700, y: 110, width: 26, height: 190, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 690, y: 254, width: 10, height: 36, rx: 2, fill: '#1d5fa8' }, svg);
        var setBar = ledBar(svg, 680, 86, 22, 8);
        var X = function (cm) { return 690 - cm * 6; };
        [[10, '#ff4d4d'], [20, '#ff4d4d'], [50, '#ffd23f']].forEach(function (z) { S('rect', { x: X(z[0]) - 2, y: 302, width: 4, height: 16, fill: z[1] }, svg); });
        var car = carArt(svg, 100, 300), beep = T(svg, 560, 70, 'BEEP', { 'font-size': 16, fill: CY, 'letter-spacing': '3', opacity: 0 }), dl = T(svg, 40, 60, '', { 'font-size': 26, fill: CY, 'font-weight': 600 });
        var lb = 0;
        loopAnim(st, function (t) {
          var c = t % 11, cm = c < 9 ? 100 - c * 10.5 : 5.5; cm = Math.max(5.5, cm);
          car.setAttribute('transform', 'translate(' + (X(cm) - 6) + ' 300)'); setBar(zoneOf(cm)); dl.textContent = Math.round(cm) + ' cm';
          var gp = gapOf(cm), ms = t * 1000, on; if (gp === 0) on = true; else if (gp < 0) on = false; else { if (ms - lb >= gp) lb = ms; on = ms - lb < 60; }
          beep.setAttribute('opacity', on ? 1 : 0);
        });
      } }
    ] });
  }
  function accuracyTable(b, ctx) {
    var DIST = [5, 10, 20, 30, 50, 100];
    var saved = {}; try { saved = JSON.parse(ctx.answer('acc') || '{}'); } catch (e) { saved = {}; }
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Test</span><h3>Accuracy log</h3></div>';
    var wrap = el('div', ''); wrap.style.padding = '12px 16px 16px'; wrap.style.overflowX = 'auto'; box.appendChild(wrap);
    var tbl = el('table', ''); tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px';
    tbl.innerHTML = '<thead><tr>' + ['Ruler (true)', 'Sensor says', 'Difference', 'Error'].map(function (h) { return '<th style="text-align:left;padding:8px 6px;font-family:IBM Plex Mono,monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted,#8ea6bb);font-weight:500;border-bottom:1px solid #22364f">' + h + '</th>'; }).join('') + '</tr></thead>';
    var tb = el('tbody', ''); tbl.appendChild(tb); wrap.appendChild(tbl);
    var sum = el('div', 'readouts'); box.appendChild(sum);
    var rows = DIST.map(function (d) {
      var tr = el('tr', ''); tr.innerHTML = '<td style="padding:6px;border-bottom:1px solid #22364f"><b>' + d + ' cm</b></td>';
      var td = el('td', ''); td.style.cssText = 'padding:6px;border-bottom:1px solid #22364f';
      var inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.placeholder = 'cm'; inp.setAttribute('aria-label', 'Sensor reading at ' + d + ' cm'); inp.style.cssText = 'width:90px'; inp.className = 'acc-in';
      if (saved[d] != null) inp.value = saved[d];
      td.appendChild(inp); tr.appendChild(td);
      var diff = el('td', ''), err = el('td', ''); diff.style.cssText = err.style.cssText = 'padding:6px;border-bottom:1px solid #22364f;font-family:IBM Plex Mono,monospace';
      tr.appendChild(diff); tr.appendChild(err); tb.appendChild(tr);
      inp.addEventListener('input', function () { upd(); });
      return { d: d, inp: inp, diff: diff, err: err };
    });
    b.appendChild(box);
    var t = null;
    function upd() {
      var out = {}, errs = [];
      rows.forEach(function (r) {
        var v = r.inp.value.trim(), n = Number(v.replace(',', '.'));
        if (v === '' || isNaN(n)) { r.diff.textContent = ''; r.err.textContent = ''; return; }
        out[r.d] = v; var dd = n - r.d, pct = Math.abs(dd) / r.d * 100; errs.push(Math.abs(dd));
        r.diff.textContent = (dd > 0 ? '+' : '') + dd.toFixed(1) + ' cm'; r.err.textContent = pct.toFixed(0) + '%';
        r.err.style.color = pct <= 5 ? 'var(--go,#4ade80)' : pct <= 15 ? '' : 'var(--signal,#ff8a3d)';
      });
      var avg = errs.length ? errs.reduce(function (a, x) { return a + x; }, 0) / errs.length : null;
      sum.innerHTML = '<div><span class="label">Readings logged</span><b>' + errs.length + ' / ' + rows.length + '</b></div><div><span class="label">Average difference</span><b>' + (avg == null ? '—' : avg.toFixed(1) + ' cm') + '</b></div><div><span class="label">Verdict</span><span class="small">' + (avg == null ? 'Log some readings' : avg <= 1 ? 'Excellent: within a centimetre' : avg <= 3 ? 'Good enough for parking' : 'Check the sensor is level and the box is flat-faced') + '</span></div>';
      clearTimeout(t); t = setTimeout(function () { ctx.answer('acc', JSON.stringify(out)); ctx.check('acc-n', errs.length); }, 500);
    }
    upd();
    UI.html(b, '<p class="small muted">The datasheet says ±3 mm, but real readings are worse: the UNO drops fractions (35.9 → 35), the box may not be square to the sensor, and you may be measuring from a slightly different point. Is your error the same at every distance, or does it grow?</p>');
  }

  /* ---------- 09 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Test your parking assistant like a car company would: the same test, several times, with different cars. Mark each one PASS or RETRY, fix what fails, and test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Zones:</b> the LED changes within 2 cm of each tape line (50 cm and 20 cm).',
      '<b>Beeping:</b> beeps get steadily faster as the car rolls in, then go solid at the 10 cm line.',
      '<b>Quiet:</b> with no car in the garage, the buzzer is silent and green is on.',
      '<b>Never frozen:</b> pull the car away suddenly — the LEDs change straight away.',
      '<b>Any car:</b> it works with a second, different-shaped car or box.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Smooth it out', html: 'Stop the LEDs flickering when the car sits on a line: use the average of the last 5 readings instead of just one.', hint: 'Keep an array <code>int last[5]</code> and an index that goes round 0–4. Each new reading replaces the oldest; add them up and divide by 5.' },
      { tag: 'Build + code', title: 'Adjustable stop line', html: 'Add a potentiometer (wiper to A0) so the driver can set the stop distance anywhere from 5 to 30 cm without changing the code.', hint: '<code>STOP_CM</code> can’t be a constant any more: make it an <code>int</code> and set it each loop with <code>map(analogRead(A0), 0, 1023, 5, 30)</code>.' },
      { tag: 'Build + code', cls: 'c', title: 'Sonar radar', html: 'Mount the sensor on the servo from Mission 04 and sweep it from 0° to 180°, printing <code>angle,distance</code> each step. Open <b>Tools → Serial Plotter</b> to see what’s around it.', hint: 'Servo signal on pin 9, power on the rails. In the sweep loop: <code>needle.write(a); delay(30); Serial.print(a); Serial.print(","); Serial.println(readDistance());</code>' },
      { tag: 'Code', title: 'Temperature-corrected', html: 'Use the DHT11 from Mission 04 to correct the speed of sound: <code>v = 331.3 + 0.606 × temperature</code> m/s. Does your accuracy log improve?', hint: 'Speed in cm/µs is <code>v / 10000.0</code>. Distance = <code>duration * speed / 2.0</code> — use floats.' },
      { tag: 'Build', title: 'Readout display', html: 'Show the distance on the LCD1602 (you’ll meet it properly in Mission 06), or make a big paper scale beside the garage so the driver can read the distance in centimetres.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 10 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m05 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working parking assistant. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of your garage with the tape lines, and one close-up of your breadboard wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds, with sound: roll the car in slowly from beyond 50 cm to the stop line so we see every zone and hear the beeps speed up.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'parking_assistant' }
      ],
      questions: [
        { id: 'r1', q: 'Explain how the HC-SR04 measures distance. Use the speed of sound, and work through one real echo time from your Serial Monitor to show how it becomes centimetres.' },
        { id: 'r2', q: 'Why does the formula divide by 2? Where does the number 58 in duration / 58 come from?' },
        { id: 'r3', q: 'Why does using delay() for the beeps make the parking assistant react late? Explain how your millis() code avoids this, using now, lastBeep and gap.' },
        { id: 'r4', q: 'How accurate is your sensor? Use your accuracy log, describe what affected the readings, and one thing you changed to improve it.' }
      ]
    }
  };
})(window);
