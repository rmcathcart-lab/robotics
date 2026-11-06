/* RL.CarKit — shared pieces for the robot car missions (R1–R8): the mission brief, animated demos on the virtual floor,
 * the virtual car with sensible defaults, a hotspot tour of the car, standard code blocks and the evidence helper. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, el = RL.el, esc = RL.esc;
  var K = RL.CarKit = {};

  /* ---------- the brief (same layout as the other units) ---------- */
  K.brief = function (b, m, o) {
    var wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = o.lead; UI.edp(left, o.edp || [4, 5, 6, 7]); wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll need</span>' + m.parts.concat(m.extras || []).map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll hand in</span>' + (o.hand || ['Your code (.ino)', 'A video of the robot', 'Answers to 4 questions']).map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    if (o.demo) K.demo(b, Object.assign({ label: 'Preview', title: 'What your robot will do' }, o.demo));
  };

  /* ---------- an animated demo on the virtual floor (a scripted car, not student code) ----------
   * o: { label, title, cap, world, program: async function (car) { await car.drive(150, 150, 1000); … } }
   * car: drive(left, right, ms) (negative = backwards) · stop(ms) · servo(angle, ms) · led(r, g, b) · dist() · line(i: 0 R, 1 M, 2 L) · wait(ms) · say(text) */
  K.demo = function (container, o) {
    var box = el('div', 'xp car-demo');
    box.innerHTML = '<div class="xp-h"><span class="label">' + esc(o.label || 'Demo') + '</span><h3>' + esc(o.title || '') + '</h3></div>';
    var stage = el('div', 'xp-stage car-demo-stage'); box.appendChild(stage);
    var cap = el('div', 'xp-cap', '<p>' + (o.cap || '') + '</p>'); box.appendChild(cap);
    container.appendChild(box);
    var world = new RL.Car.World(o.world || {}), on = true, gen = 0;
    var pins = { 3: { mode: 'OUT', v: 1 }, 5: { mode: 'OUT', v: 0 }, 6: { mode: 'OUT', v: 0 }, 7: { mode: 'OUT', v: 1 }, 8: { mode: 'OUT', v: 1 }, 13: { mode: o.sonar === false ? null : 'OUT', v: 0 } }, state = { servo: { 10: 90 } };
    var frt = { running: function () { return on; }, pin: function (p) { return pins[p] || { mode: null, v: 0 }; }, state: state };
    world.mount(stage); world.attach(frt);
    var sayEl = el('div', 'car-say'); stage.appendChild(sayEl);
    function set(l, r) { pins[8].v = l >= 0 ? 1 : 0; pins[6].v = Math.min(255, Math.abs(l)) / 255; pins[7].v = r >= 0 ? 1 : 0; pins[5].v = Math.min(255, Math.abs(r)) / 255; }
    function wait(ms, g) { return new Promise(function (res, rej) { setTimeout(function () { if (g !== gen || !on) rej('stop'); else res(); }, ms); }); }
    function api(g) {
      return {
        drive: function (l, r, ms) { set(l, r); return wait(ms || 0, g); },
        stop: function (ms) { set(0, 0); return wait(ms || 0, g); },
        servo: function (a, ms) { state.servo[10] = a; return wait(ms || 0, g); },
        led: function (r, gg, bb) { world.setLed(r == null ? null : { r: r, g: gg, b: bb }); },
        dist: function () { return world.measure(); }, line: function (i) { return world.lineValue(i); },
        wait: function (ms) { return wait(ms, g); }, say: function (t) { sayEl.textContent = t || ''; sayEl.style.opacity = t ? 1 : 0; },
        world: world
      };
    }
    function cycle() {
      var g = ++gen; set(0, 0); world.reset(); world.setLed(null); state.servo[10] = 90; sayEl.style.opacity = 0;
      Promise.resolve().then(function () { return o.program(api(g)); }).then(function () { set(0, 0); return wait(1600, g); }).then(function () { if (g === gen) cycle(); }).catch(function () {});
    }
    var started = false;
    function start() { if (started) return; started = true; cycle(); }
    if (root.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { start(); io.disconnect(); } }, { threshold: 0.25 }); io.observe(box); setTimeout(function () { if (!started && box.getBoundingClientRect().top < innerHeight) start(); }, 500); } else start();
    if (RL.onLeave) RL.onLeave(function () { on = false; gen++; });
    return { box: box, world: world, restart: cycle };
  };

  /* ---------- the virtual car with the unit's defaults ---------- */
  K.sim = function (b, o) { return RL.Car.sim(b, o); };

  /* ---------- the code everyone shares ---------- */
  K.PINS = [
    '// ---- motor pins (ELEGOO Smart Robot Car V4, TB6612 driver) ----',
    'const int STBY = 3;   // standby: HIGH lets the motors run',
    'const int PWMA = 5;   // right motors: speed (0-255)',
    'const int AIN1 = 7;   // right motors: direction (HIGH = forward)',
    'const int PWMB = 6;   // left motors: speed (0-255)',
    'const int BIN1 = 8;   // left motors: direction (HIGH = forward)'];
  K.BUTTON_PIN = ['const int BUTTON = 2;  // the MODE button on the car'];
  K.SETUP_MOTORS = [
    '  pinMode(STBY, OUTPUT);',
    '  pinMode(PWMA, OUTPUT);',
    '  pinMode(AIN1, OUTPUT);',
    '  pinMode(PWMB, OUTPUT);',
    '  pinMode(BIN1, OUTPUT);',
    '  digitalWrite(STBY, HIGH);   // wake up the motor driver'];
  K.MOVES = [
    '// ---- moves ----',
    'void forward(int speed) {',
    '  digitalWrite(AIN1, HIGH);   // right side: forward',
    '  analogWrite(PWMA, speed);',
    '  digitalWrite(BIN1, HIGH);   // left side: forward',
    '  analogWrite(PWMB, speed);',
    '}',
    '',
    'void backward(int speed) {',
    '  digitalWrite(AIN1, LOW);    // right side: backward',
    '  analogWrite(PWMA, speed);',
    '  digitalWrite(BIN1, LOW);    // left side: backward',
    '  analogWrite(PWMB, speed);',
    '}',
    '',
    'void spinLeft(int speed) {',
    '  digitalWrite(AIN1, HIGH);   // right side forward...',
    '  analogWrite(PWMA, speed);',
    '  digitalWrite(BIN1, LOW);    // ...left side backward',
    '  analogWrite(PWMB, speed);',
    '}',
    '',
    'void spinRight(int speed) {',
    '  digitalWrite(AIN1, LOW);    // right side backward...',
    '  analogWrite(PWMA, speed);',
    '  digitalWrite(BIN1, HIGH);   // ...left side forward',
    '  analogWrite(PWMB, speed);',
    '}',
    '',
    'void stopCar() {',
    '  analogWrite(PWMA, 0);',
    '  analogWrite(PWMB, 0);',
    '}'];
  K.WAIT_BUTTON = [
    '// waits here until someone presses the MODE button',
    'void waitForButton() {',
    '  while (digitalRead(BUTTON) == HIGH) {   // HIGH = not pressed',
    '    delay(10);',
    '  }',
    '  delay(500);   // half a second to take your hand away',
    '}'];
  K.SONAR = [
    'const int TRIG = 13;  // ultrasonic sensor: Trig pin',
    'const int ECHO = 12;  // ultrasonic sensor: Echo pin'];
  K.READ_DIST = [
    '// pings once and returns the distance in cm (999 = nothing there)',
    'int readDistance() {',
    '  digitalWrite(TRIG, LOW);',
    '  delayMicroseconds(2);',
    '  digitalWrite(TRIG, HIGH);   // a 10 microsecond pulse = "ping!"',
    '  delayMicroseconds(10);',
    '  digitalWrite(TRIG, LOW);',
    '  long duration = pulseIn(ECHO, HIGH, 30000);   // wait up to 30 ms for the echo',
    '  if (duration == 0) {',
    '    return 999;   // no echo came back',
    '  }',
    '  return duration / 58;   // microseconds -> centimetres',
    '}'];
  /* the line numbers [first, last] of a function in a sketch (for code walkthroughs) */
  K.fn = function (src, name) {
    var ls = src.split('\n'), st = -1, d = 0;
    for (var i = 0; i < ls.length; i++) {
      if (st < 0 && new RegExp('\\b' + name + '\\s*\\([^;]*\\)\\s*\\{').test(ls[i]) && !/^\s*\/\//.test(ls[i])) st = i;
      if (st >= 0) { d += (ls[i].match(/\{/g) || []).length - (ls[i].match(/\}/g) || []).length; if (d <= 0) return [st + 1, i + 1]; }
    }
    return [1, 1];
  };
  /* the line number of the first line matching re */
  K.line = function (src, re) { var ls = src.split('\n'); for (var i = 0; i < ls.length; i++) if (re.test(ls[i])) return i + 1; return 1; };
  K.join = function () { var out = []; for (var i = 0; i < arguments.length; i++) out = out.concat(arguments[i]); return out.join('\n'); };

  /* the remote in the car kit (IRremote 4 command numbers) */
  K.REMOTE_TABLE = function () {
    var rows = [['▲', 0x46], ['▼', 0x15], ['◀', 0x44], ['▶', 0x43], ['OK', 0x40], ['1', 0x16], ['2', 0x19], ['3', 0x0D], ['4', 0x0C], ['5', 0x18], ['6', 0x5E], ['7', 0x08], ['8', 0x1C], ['9', 0x5A], ['*', 0x42], ['0', 0x52], ['#', 0x4A]];
    return '<table class="fx-plan"><thead><tr><th>Key</th><th>Code (hex)</th><th>Key</th><th>Code (hex)</th></tr></thead><tbody>' +
      rows.slice(0, 9).map(function (r, i) { var q = rows[i + 9]; return '<tr><td><b>' + r[0] + '</b></td><td><code>0x' + r[1].toString(16).toUpperCase() + '</code></td><td>' + (q ? '<b>' + q[0] + '</b>' : '') + '</td><td>' + (q ? '<code>0x' + q[1].toString(16).toUpperCase() + '</code>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
  };

  /* ---------- the car from above, big, with hotspots ---------- */
  K.carSvg = function (scale) {
    var S = RL.Board.el, sc = scale || 13, svg = S('svg', { viewBox: '0 0 520 420', role: 'img', 'aria-label': 'The robot car seen from above' });
    S('rect', { x: 0, y: 0, width: 520, height: 420, fill: '#0b1320' }, svg);
    for (var x = 0; x <= 520; x += 26) S('line', { x1: x, y1: 0, x2: x, y2: 420, stroke: '#16243a', 'stroke-width': 1 }, svg);
    for (var y = 0; y <= 420; y += 26) S('line', { x1: 0, y1: y, x2: 520, y2: y, stroke: '#16243a', 'stroke-width': 1 }, svg);
    var g = S('g', { transform: 'translate(260 222) scale(' + sc + ')' }, svg), a = RL.Car.art(g); a.servo(90); a.line([105, 105, 105]);
    var t = S('text', { x: 260, y: 26, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#8ea6bb', 'letter-spacing': '3' }, svg); t.textContent = '▲ FRONT';
    return svg;
  };
  /* positions (in the 520 × 420 picture) of the parts, for the tour */
  K.at = function (lx, ly, scale) { var sc = scale || 13; return { x: 260 + lx * sc, y: 222 + ly * sc }; };

  /* ---------- evidence ---------- */
  K.evidence = function (intro, files, questions) { return { intro: intro, files: files, questions: questions }; };
  K.codeFile = function (name, help) { return { id: 'code', kind: 'code', label: 'Your final code', help: help || 'Upload your .ino file (Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: name }; };
  K.videoFile = function (help) { return { id: 'video', kind: 'video', label: 'A video of your robot', help: help, required: true, max: 1 }; };
  K.photoFile = function (label, help, max, req) { return { id: 'photos', kind: 'photo', label: label, help: help, required: req !== false, max: max || 3 }; };

  /* ---------- the uploading reminder used in every mission ---------- */
  K.uploadSteps = function (b, o) {
    o = o || {};
    UI.callout(b, '', 'Uploading to the real car', '<ol><li>Switch the car’s <b>power off</b> and plug the USB cable into the UNO.</li><li>Check the small <b>Upload / Cam</b> switch on the expansion board is on <b>Upload</b> (in the Cam position the camera module blocks uploads).</li><li>In the Arduino IDE check <b>Tools ▸ Board: Arduino Uno</b> and <b>Tools ▸ Port</b>, then click <b>Upload</b> (→).</li><li>' +
      (o.keepUsb ? 'Wait for <b>Done uploading</b>. Leave the USB cable plugged in, switch the car’s power <b>on</b> (motors need the battery) and open the <b>Serial Monitor</b> at 9600 baud.' : 'Wait for <b>Done uploading</b>, unplug the cable, put the car on the floor and switch the power on.' + (o.button === false ? '' : ' It waits until you <b>press the MODE button</b>, then go.')) + '</li></ol>');
  };
  /* for checks: press the MODE button like a student would */
  K.pressStart = function (api) { api.press(2, true); return api.wait(160).then(function () { api.press(2, false); }); };
  /* for checks: wait until the car has been still for `still` ms (or `max` ms have passed) */
  K.waitStill = function (world, api, max, still) {
    var t0 = Date.now(), quiet = 0; still = still || 1200;
    return new Promise(function (res) { (function tick() { if (world.moving()) quiet = Date.now(); else if (!quiet) quiet = Date.now(); if (Date.now() - quiet > still && world.travelled() > 1 || Date.now() - t0 > max) return res(); setTimeout(tick, 100); })(); });
  };
})(window);
