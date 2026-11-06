/* Mission R5: Remote pilot — IR codes, reading your own remote, switch/case, millis() timeouts (drive only while a key
 * is held), state variables (gears + LED), and a sensor safety override. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb';
  var C = RL.Car.CODES;

  /* ================= code ================= */
  var KEYS = [
    '// ---- remote keys (check these against YOUR remote!) ----',
    'const int KEY_UP = 0x46;',
    'const int KEY_DOWN = 0x15;',
    'const int KEY_LEFT = 0x44;',
    'const int KEY_RIGHT = 0x43;',
    'const int KEY_OK = 0x40;'];
  var KEYS_GEARS = KEYS.concat(['const int KEY_1 = 0x16;', 'const int KEY_2 = 0x19;', 'const int KEY_3 = 0x0D;']);
  var IR_SETUP = ['  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);   // start listening for the remote'];
  var CODES = K.join(['// R5 part 1: what code does each key send?', '#include <IRremote.hpp>', '', 'const int IR_PIN = 9;   // the IR receiver on the expansion board', '',
    'void setup() {', '  Serial.begin(9600);'], IR_SETUP, ['}', '',
    'void loop() {',
    '  if (IrReceiver.decode()) {                       // has a code arrived?',
    '    int code = IrReceiver.decodedIRData.command;   // the key\'s number',
    '    Serial.print("Code: 0x");',
    '    Serial.println(code, HEX);                     // print it in hexadecimal',
    '    IrReceiver.resume();                           // get ready for the next one',
    '  }',
    '}']);
  var SETUP_IR = ['  Serial.begin(9600);'].concat(K.SETUP_MOTORS, IR_SETUP);
  var DRIVE = K.join(['// R5 part 2: drive with the remote', '#include <IRremote.hpp>'], K.PINS, ['const int IR_PIN = 9;', 'const int SPEED = 150;', ''], KEYS, ['',
    'void setup() {'], SETUP_IR, ['}', '',
    'void loop() {',
    '  if (IrReceiver.decode()) {',
    '    int code = IrReceiver.decodedIRData.command;',
    '    switch (code) {',
    '      case KEY_UP:',
    '        forward(SPEED);',
    '        break;',
    '      case KEY_DOWN:',
    '        backward(SPEED);',
    '        break;',
    '      case KEY_LEFT:',
    '        spinLeft(SPEED);',
    '        break;',
    '      case KEY_RIGHT:',
    '        spinRight(SPEED);',
    '        break;',
    '      case KEY_OK:',
    '        stopCar();',
    '        break;',
    '    }',
    '    IrReceiver.resume();',
    '  }',
    '}', ''], K.MOVES);
  var HOLD = K.join(['// R5 part 3: only drive while a key is held down', '#include <IRremote.hpp>'], K.PINS, ['const int IR_PIN = 9;', 'const int SPEED = 150;', 'const int TIMEOUT = 200;       // stop if no signal for this many ms', ''], KEYS, ['',
    'unsigned long lastSignal = 0;   // when the last code arrived (in ms)', '',
    'void setup() {'], SETUP_IR, ['}', '',
    'void loop() {',
    '  if (IrReceiver.decode()) {',
    '    int code = IrReceiver.decodedIRData.command;',
    '    lastSignal = millis();       // remember WHEN it arrived',
    '    switch (code) {',
    '      case KEY_UP:    forward(SPEED);   break;',
    '      case KEY_DOWN:  backward(SPEED);  break;',
    '      case KEY_LEFT:  spinLeft(SPEED);  break;',
    '      case KEY_RIGHT: spinRight(SPEED); break;',
    '    }',
    '    IrReceiver.resume();',
    '  }',
    '',
    '  // no signal for a while? the key has been let go: stop',
    '  if (millis() - lastSignal > TIMEOUT) {',
    '    stopCar();',
    '  }',
    '}', ''], K.MOVES);
  var PILOT = K.join(['// R5 part 4: the full remote pilot — gears, lights and a crash bumper', '#include <IRremote.hpp>', '#include <FastLED.h>'], K.PINS, K.SONAR, [
    'const int IR_PIN = 9;',
    'const int LED_PIN = 4;',
    'const int TIMEOUT = 200;',
    'const int SAFE_CM = 20;        // never drive forward closer than this', ''], KEYS_GEARS, ['',
    'CRGB leds[1];',
    'int speed = 150;               // the current gear (this variable remembers it)',
    'unsigned long lastSignal = 0;',
    'bool goingForward = false;     // true while driving forward', '',
    'void setup() {', '  Serial.begin(9600);', '  pinMode(TRIG, OUTPUT);', '  pinMode(ECHO, INPUT);'], K.SETUP_MOTORS, IR_SETUP, [
    '  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);',
    '  FastLED.setBrightness(40);',
    '  showColour(CRGB::Green);',
    '}', '',
    'void loop() {',
    '  if (IrReceiver.decode()) {',
    '    int code = IrReceiver.decodedIRData.command;',
    '    lastSignal = millis();',
    '    goingForward = false;',
    '    switch (code) {',
    '      case KEY_UP:',
    '        if (readDistance() > SAFE_CM) {   // only if the way is clear',
    '          forward(speed);',
    '          goingForward = true;',
    '        }',
    '        break;',
    '      case KEY_DOWN:  backward(speed);  break;',
    '      case KEY_LEFT:  spinLeft(speed);  break;',
    '      case KEY_RIGHT: spinRight(speed); break;',
    '      case KEY_1: speed = 100; showColour(CRGB::Green);  break;',
    '      case KEY_2: speed = 170; showColour(CRGB::Yellow); break;',
    '      case KEY_3: speed = 255; showColour(CRGB::Red);    break;',
    '    }',
    '    IrReceiver.resume();',
    '  }',
    '',
    '  if (millis() - lastSignal > TIMEOUT) {',
    '    stopCar();',
    '    goingForward = false;',
    '  }',
    '',
    '  // safety bumper: stop if something appears in front while driving forward',
    '  if (goingForward && readDistance() < SAFE_CM) {',
    '    stopCar();',
    '    goingForward = false;',
    '    Serial.println("Bumper!");',
    '  }',
    '}', '',
    'void showColour(CRGB colour) {',
    '  leds[0] = colour;',
    '  FastLED.show();',
    '}', ''], K.READ_DIST, [''], K.MOVES);

  /* ================= check helpers ================= */
  function hold(api, code, ms) { api.ir(code); var t = setInterval(function () { api.ir('rep'); }, 110); return api.wait(ms).then(function () { clearInterval(t); }); }
  function moved(w, since) { return w.travelled() - since; }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r05, {
      lead: '<p class="lead">Time to drive. In this mission you turn your robot into a remote-control car — but one <b>you</b> programmed, so it does exactly what you want. It drives only while you hold a key, has three gears with a different colour light for each, and has a bumper made of sound: it refuses to drive into anything.</p>' +
        '<p>You’ll find out what the remote actually sends, use <b>switch / case</b> to handle lots of keys neatly, use <code>millis()</code> to notice when a key is let go, and keep track of the car’s <b>state</b> (its gear, whether it’s moving) in variables that remember.</p>',
      edp: [2, 4, 5, 6, 7],
      demo: { title: 'Remote pilot', world: { w: 240, h: 130, start: { x: 40, y: 85, h: 90 }, boxes: [{ x: 190, y: 64, w: 24, h: 42, label: 'WALL' }] },
        cap: 'Gear 1 (green), gear 3 (red, full speed)… and when a wall appears, the bumper stops the car even though ▲ is still held down.',
        program: async function (car) {
          car.say('▲ held · gear 1'); car.led(0, 255, 0); await car.drive(100, 100, 1200); await car.stop(400);
          car.say('◀ held'); await car.drive(-100, 100, 600); await car.stop(200); car.say('▶ held'); await car.drive(100, -100, 600); await car.stop(400);
          car.say('key 3 → gear 3'); car.led(255, 0, 0); await car.wait(600);
          car.say('▲ held · gear 3'); await car.drive(255, 255, 0);
          for (var i = 0; i < 200 && car.dist() > 20; i++) await car.wait(15);
          await car.stop(0); car.say('BUMPER! (▲ still held)'); await car.wait(1600);
        } }
    });
  } });

  steps.push({ id: 'codes', title: 'Code it: read your remote', stage: '02 Research · 05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">When you press a key, the remote flashes an infrared LED on and off in a special pattern — far too fast and too red for your eyes to see. The pattern spells out a number. The IR receiver on the car turns the flashes back into that number, and the <b>IRremote</b> library hands it to your program.</p>');
    UI.callout(b, '', 'See it for yourself', '<p>Point the remote at your phone’s camera (the front camera usually works best) and press a key. Many cameras can see infrared: the LED flickers purple-white.</p>');
    UI.html(b, '<h2>Hexadecimal</h2><p>Remote codes are usually written in <b>hexadecimal</b> (“hex”): counting in 16s, using 0–9 then A–F. In code, a hex number starts with <code>0x</code>. So <code>0x46</code> is just another way to write the number 70. You don’t need to convert them — just copy them exactly.</p>');
    RL.Code.walk(b, CODES, [
      { title: 'The plan', html: '<p>Whenever a code arrives, print it. Press every key and you have a table of codes for your remote.</p>' },
      { lines: [2, 2], title: 'The library', html: '<p>Install <b>IRremote</b> by shirriff, z3t0, ArminJo in the Library Manager if you haven’t. This line pulls it in.</p>' },
      { lines: [K.line(CODES, /IrReceiver.begin/), K.line(CODES, /IrReceiver.begin/)], title: 'Start listening', html: '<p><code>IrReceiver</code> is an object the library made for you. <code>.begin(IR_PIN, ENABLE_LED_FEEDBACK)</code> tells it the receiver is on pin 9 and to flicker the little LED when a signal arrives.</p>' },
      { lines: [K.line(CODES, /if \(IrReceiver.decode/), K.line(CODES, /IrReceiver.resume/) + 1], title: 'Check, read, print, resume', html: '<p><code>IrReceiver.decode()</code> is true only when a complete code has arrived. Then <code>.decodedIRData.command</code> is the key’s number. <code>Serial.println(code, HEX)</code> prints it in hex. <code>IrReceiver.resume()</code> is essential: without it the receiver waits forever and never reads another key.</p>' }
    ], { name: 'remote_codes' });
    UI.html(b, '<h2>Try it</h2><p>Run it and click keys on the virtual remote. Then upload it to the real car and press every key on <b>your</b> remote.</p>');
    K.sim(b, { remote: true, title: 'Read the remote', code: CODES, name: 'remote_codes', key: 'sim-codes', ctx: ctx, runHint: 'click keys on the remote.', checkAfter: 500,
      world: { w: 140, h: 70, start: { x: 70, y: 40, h: 0 } },
      check: function (w, api) { return api.wait(300).then(function () { api.ir(C['▲']); return api.wait(400); }).then(function () { return /Code: 0x46/.test(api.serialText()) ? { pass: true, msg: '▲ sends 0x46 on the virtual remote. Now find out what yours sends.' } : { pass: false, msg: 'No code printed. Is IrReceiver.resume() still there?' }; }); } });
    UI.html(b, '<h2>Your remote’s codes</h2><p>ELEGOO has made two versions of this remote. Here are the codes for the common one (the virtual remote uses these). <b>Check yours</b> — if they’re different, use your numbers in every program from now on.</p>' + K.REMOTE_TABLE());
    UI.note(b, ctx, { id: 'n-codes', label: 'Codes from YOUR remote (at least the arrows, OK, 1, 2 and 3):', placeholder: '▲ 0x46 · ▼ 0x15 · ◀ 0x44 · ▶ 0x43 · OK 0x40 · 1 0x16 · 2 0x19 · 3 0xD', rows: 3 });
    UI.html(b, '<p class="small muted">Hold a key down: the first press prints the code, then repeat signals follow about 9 times a second. With IRremote 4 the repeats carry the same command number — you’ll use that in part 3.</p>');
  } });

  steps.push({ id: 'drive', title: 'Code it: switch / case', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Five keys, five different moves. You could write five <code>if</code>s, but there’s a neater tool for “do one of many things depending on a number”: <b>switch / case</b>.</p>');
    UI.html(b, '<div class="two"><div>');
    var two = b.lastChild; two.innerHTML = '';
    var a = el('div', ''), c = el('div', ''); two.appendChild(a); two.appendChild(c);
    UI.html(a, '<h3>With if / else if</h3>'); RL.Code.block(a, ['if (code == KEY_UP) {', '  forward(SPEED);', '} else if (code == KEY_DOWN) {', '  backward(SPEED);', '} else if (code == KEY_LEFT) {', '  spinLeft(SPEED);', '}'].join('\n'), { download: false });
    UI.html(c, '<h3>With switch / case</h3>'); RL.Code.block(c, ['switch (code) {', '  case KEY_UP:', '    forward(SPEED);', '    break;', '  case KEY_DOWN:', '    backward(SPEED);', '    break;', '}'].join('\n'), { download: false });
    UI.html(b, '<p><code>switch (code)</code> looks at the value of <code>code</code> and jumps straight to the <code>case</code> with the same value. The code runs until <code>break;</code>, which jumps out of the switch. If no case matches, nothing happens (so other keys are ignored).</p>');
    UI.callout(b, '', 'Don’t forget break', '<p>Without <code>break;</code> the program “falls through” into the next case and runs that too. So <code>case KEY_UP: forward(SPEED);</code> with no break would also run <code>backward(SPEED)</code> — and the car would go backward!</p>');
    RL.Code.walk(b, DRIVE, [
      { title: 'The plan', html: '<p>When a code arrives, switch on it: each arrow starts a move, OK stops. The car keeps doing the last move until you press another key.</p>' },
      { lines: [K.line(DRIVE, /remote keys/), K.line(DRIVE, /KEY_OK =/)], title: 'Names for the codes', html: '<p>Just like pin names: <code>KEY_UP</code> is much easier to read than <code>0x46</code>. <b>Put your remote’s codes here.</b></p>' },
      { lines: [K.line(DRIVE, /switch \(code\)/), K.line(DRIVE, /switch \(code\)/) + 16], title: 'The switch', html: '<p>One case per key. The order of the cases doesn’t matter.</p>' }
    ], { name: 'remote_drive' });
    K.sim(b, { remote: true, title: 'Drive with the remote', code: DRIVE, name: 'remote_drive', key: 'sim-drive', ctx: ctx, runHint: 'click the arrows on the remote (OK stops).', checkAfter: 500,
      world: { w: 240, h: 150, start: { x: 120, y: 75, h: 0 } },
      check: function (w, api) {
        var t0;
        return api.wait(200).then(function () { t0 = w.travelled(); api.ir(C['▲']); return api.wait(900); }).then(function () { var f = moved(w, t0); if (f < 10) return { pass: false, msg: '▲ didn’t drive the car forward. Check the KEY_UP case.' }; api.ir(C['OK']); return api.wait(500).then(function () { var p0 = w.pose(); api.ir(C['▶']); return api.wait(500).then(function () { api.ir(C['OK']); var dh = Math.abs(((w.pose().h - p0.h) % 360 + 540) % 360 - 180); return dh > 20 ? { pass: true, msg: 'Forward, stop and turn all work. Upload it and take it for a spin.' } : { pass: false, msg: '▶ didn’t turn the car.' }; }); }); });
      } });
    UI.mcq(b, ctx, { id: 'q-switch', q: 'What happens if you press <b>5</b> (code 0x18) with this program?', options: ['The car stops', 'Nothing — no case matches, so the switch is skipped', 'The program crashes', 'It runs the first case'], answer: 1, explain: 'When no case matches, the whole switch is skipped and the car keeps doing whatever it was doing. (You can add <code>default:</code> to handle “any other key”.)' });
    K.uploadSteps(b, { button: false });
    UI.callout(b, 'plain', 'Not responding?', '<p>Use the codes from <b>your</b> remote. Aim at the receiver. And make sure <code>IrReceiver.resume();</code> is inside the if, after the switch.</p>');
  } });

  steps.push({ id: 'hold', title: 'Code it: let go to stop', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Driving with part 2 is a bit scary: let go of ▲ and the car keeps going until you find the OK key. A real RC car stops when you let go. The remote doesn’t send a “let go” signal — but while you <b>hold</b> a key it sends a repeat signal about every 110 ms. So: <b>if no signal has arrived for 200 ms, the key must have been released.</b></p>');
    UI.html(b, '<h2>Telling the time with millis()</h2><p><code>millis()</code> gives the number of milliseconds since the UNO started (it counts up by itself, like a stopwatch that never stops). To measure how long ago something happened: store <code>millis()</code> in a variable when it happens, and later subtract.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'How long since the last signal?', w: 820, h: 260, frames: [
      { cap: 'A code arrives at 5000 ms. The program stores it: <code>lastSignal = millis();</code> → lastSignal = 5000.', draw: function (svg) { timeline(svg, 0); } },
      { cap: 'While you hold the key, repeats arrive at 5110, 5220, 5330… each one updates lastSignal. <code>millis() - lastSignal</code> is never more than about 110.', draw: function (svg) { timeline(svg, 1); } },
      { cap: 'You let go after 5330. At 5450 the gap is 120 ms — still OK. At 5540 it’s 210 ms: more than 200, so the program decides the key is up and stops the car.', draw: function (svg) { timeline(svg, 2); } }
    ] });
    RL.Code.walk(b, HOLD, [
      { title: 'The plan', html: '<p>Each time any code arrives, remember the time. Every time round loop(), if more than <code>TIMEOUT</code> ms have passed since then, stop.</p>' },
      { lines: [K.line(HOLD, /unsigned long lastSignal/), K.line(HOLD, /unsigned long lastSignal/)], title: 'A variable that remembers', html: '<p>This variable is made <b>outside</b> any function, at the top. That makes it a <b>global variable</b>: it’s created once and keeps its value between runs of loop(). (A variable made inside loop() is wiped and made fresh every time round.) <code>unsigned long</code> is the type for big, never-negative numbers like millis().</p>' },
      { lines: [K.line(HOLD, /lastSignal = millis/), K.line(HOLD, /lastSignal = millis/)], title: 'Remember when', html: '<p>Every code — the first press <b>and</b> each repeat — updates lastSignal. Repeats carry the same command number, so the switch keeps the same move going.</p>' },
      { lines: [K.line(HOLD, /no signal for a while/), K.line(HOLD, /no signal for a while/) + 3], title: 'Check the gap', html: '<p><code>millis() - lastSignal</code> is how many ms ago the last code arrived. More than 200? Stop. This runs every time round loop(), whether or not a code arrived.</p>' }
    ], { name: 'remote_hold' });
    K.sim(b, { remote: true, title: 'Let go to stop', code: HOLD, name: 'remote_hold', key: 'sim-hold', ctx: ctx, runHint: 'press and HOLD an arrow, then let go.', checkAfter: 500,
      world: { w: 240, h: 150, start: { x: 120, y: 110, h: 0 } },
      check: function (w, api) {
        var t0;
        return api.wait(200).then(function () { t0 = w.travelled(); return hold(api, C['▲'], 1000); }).then(function () { if (moved(w, t0) < 12) return { pass: false, msg: 'Holding ▲ didn’t drive forward.' }; return api.wait(500).then(function () { var a = w.travelled(); return api.wait(600).then(function () { return moved(w, a) < 1 ? { pass: true, msg: 'It drives while held and stops when you let go.' } : { pass: false, msg: 'The car kept going after the key was released. Check the TIMEOUT if.' }; }); }); });
      } });
    UI.numq(b, ctx, { id: 'q-gap', q: '<code>lastSignal</code> is 12 400 and <code>millis()</code> is 12 650. How many ms since the last signal?', answer: 250, tol: 0, unit: 'ms', explain: '12 650 − 12 400 = 250 ms. That’s more than 200, so the car stops.' });
  } });
  function timeline(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 260, fill: '#070d17' }, svg);
    var X = function (ms) { return 60 + (ms - 4900) * 1.05; };
    S('line', { x1: 40, y1: 160, x2: 790, y2: 160, stroke: '#22364f', 'stroke-width': 2 }, svg);
    for (var t = 5000; t <= 5600; t += 100) { S('line', { x1: X(t), y1: 154, x2: X(t), y2: 166, stroke: '#3b5372' }, svg); T(svg, X(t), 186, String(t), { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 }); }
    var sig = [5000, 5110, 5220, 5330].slice(0, k === 0 ? 1 : 4);
    sig.forEach(function (s, i) { S('rect', { x: X(s) - 5, y: 112, width: 10, height: 40, rx: 2, fill: i ? '#7dd3fc' : CY }, svg); T(svg, X(s), 104, i ? 'repeat' : '▲', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 }); });
    if (k === 0) T(svg, X(5000), 70, 'lastSignal = 5000', { 'text-anchor': 'middle', fill: SIG, 'font-size': 14 });
    if (k === 1) { S('rect', { x: X(5000), y: 40, width: X(5330) - X(5000), height: 8, rx: 4, fill: '#4ade80', opacity: 0.6 }, svg); T(svg, X(5165), 34, 'key held: gaps of ~110 ms', { 'text-anchor': 'middle', fill: '#4ade80', 'font-size': 13 }); }
    if (k === 2) { S('rect', { x: X(5330), y: 196, width: X(5540) - X(5330), height: 10, rx: 4, fill: SIG }, svg); T(svg, X(5540), 230, 'gap 210 ms > 200 → stopCar()', { 'text-anchor': 'middle', fill: SIG, 'font-size': 13 }); S('line', { x1: X(5540), y1: 60, x2: X(5540), y2: 196, stroke: SIG, 'stroke-dasharray': '5 4' }, svg); T(svg, X(5330), 70, 'let go', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); }
  }

  steps.push({ id: 'pilot', title: 'Code it: gears, lights & a bumper', stage: '05 Create', time: '50 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The full pilot program adds three things: <b>gears</b> (keys 1, 2, 3 change the speed), the <b>LED</b> shows which gear you’re in, and a <b>bumper</b>: the car won’t drive forward into anything closer than 20 cm, even if you hold ▲.</p>');
    UI.html(b, '<h2>State: what the robot remembers</h2><p>A program’s <b>state</b> is everything it remembers between loops. This one remembers three things, each in a global variable:</p><ul><li><code>speed</code> — the current gear (100, 170 or 255).</li><li><code>lastSignal</code> — when the last remote code arrived.</li><li><code>goingForward</code> — whether it’s driving forward right now. This is a <code>bool</code> (boolean): a variable that’s only ever <code>true</code> or <code>false</code>.</li></ul>');
    RL.Code.walk(b, PILOT, [
      { title: 'The plan', html: '<p>Each loop: handle any remote code, stop if the key was released, and check the bumper. Each job is a few lines and they don’t get in each other’s way.</p>' },
      { lines: [K.line(PILOT, /CRGB leds/), K.line(PILOT, /bool goingForward/)], title: 'The state', html: '<p>Three variables that remember. <code>int speed = 150;</code> starts in a middle gear; pressing 1, 2 or 3 changes it, and every move uses <code>speed</code>, so the new gear sticks until you change it again.</p>' },
      { lines: [K.line(PILOT, /case KEY_UP:/), K.line(PILOT, /case KEY_UP:/) + 5], title: 'Only forward if it’s clear', html: '<p>Before driving forward, measure. Only if the way is clear: drive, and set <code>goingForward = true</code> so the bumper knows to watch.</p>' },
      { lines: [K.line(PILOT, /case KEY_1:/), K.line(PILOT, /case KEY_3:/)], title: 'Gears', html: '<p>Several instructions on one line are fine: change the speed, change the colour, break. The <code>CRGB</code> colour is handed to our own <code>showColour()</code> function.</p>' },
      { lines: [K.line(PILOT, /safety bumper/), K.line(PILOT, /safety bumper/) + 5], title: 'The bumper', html: '<p><code>&amp;&amp;</code> means <b>and</b>: both must be true. “If we’re going forward <b>and</b> something is closer than 20 cm, stop.” Only checking while going forward means you can still back away from a wall.</p>' },
      { lines: K.fn(PILOT, 'showColour'), title: 'showColour(colour)', html: '<p>A function whose parameter is a colour. Two lines of FastLED wrapped up so the switch stays readable.</p>' }
    ], { name: 'remote_pilot' });
    K.sim(b, { remote: true, title: 'Remote pilot', code: PILOT, name: 'remote_pilot', key: 'sim-pilot', ctx: ctx, runHint: 'hold ▲ toward the box. Press 1, 2, 3 to change gear.', checkAfter: 500,
      world: { w: 260, h: 140, start: { x: 40, y: 70, h: 90 }, boxes: [{ x: 200, y: 48, w: 24, h: 44, drag: true, label: 'WALL' }] },
      check: function (w, api) {
        return api.wait(200).then(function () { api.ir(C['3']); return api.wait(300); }).then(function () {
          var led = w.led(); if (!led || led.r < 200 || led.g > 80) return { pass: false, msg: 'Key 3 should switch to gear 3 and turn the LED red.' };
          return hold(api, C['▲'], 4000).then(function () { var d = w.distTo(w.cfg.boxes[0]); if (w.bumps()) return { pass: false, msg: 'Crash! The bumper didn’t stop the car in time.' }; if (d > 30) return { pass: false, msg: 'The car stopped ' + Math.round(d) + ' cm from the wall — the bumper should let it get to about 20 cm.' }; return { pass: true, msg: 'Gear 3, full speed, and the bumper stopped it ' + Math.round(d) + ' cm from the wall.' }; });
        });
      } });
    UI.callout(b, '', 'Real-car note', '<p>At full speed the real car rolls a little after stopping. If it still taps the wall in gear 3, make <code>SAFE_CM</code> bigger — or make the safe distance depend on the gear (a challenge!).</p>');
  } });

  steps.push({ id: 'course', title: 'Obstacle course race', stage: '06 Test', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Build an obstacle course with boxes, cones or chairs: a start line, a slalom, a tight turn, a “garage” to park in, and a finish line. Each driver gets two timed runs. Every time the bumper saves you, that’s fine — every touch is a 5-second penalty.</p>');
    UI.tests(b, ctx, { id: 'course', rows: [
      'All four arrows drive the right way, and the car stops when you let go.',
      'Keys 1, 2 and 3 change the speed and the LED colour.',
      'Holding ▲ toward a wall: the car stops before touching it, in every gear.',
      'You can still back away and turn after the bumper stops you.',
      'Completed the course.'
    ] });
    UI.note(b, ctx, { id: 'n-course', label: 'Race log: your times, penalties, and one thing you changed in the code to drive better.', placeholder: 'Run 1: 48 s + 2 touches… We changed the turning speed so…', rows: 4 });
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '07 Improve', time: '30 min', render: function (b, ctx) {
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Gentle turns', html: 'Turning at full speed is hard to control. Make the spins always use half the current speed: <code>spinLeft(speed / 2)</code>.' },
      { tag: 'Code', title: 'Trick button', html: 'Make the OK key do a trick: a 360° spin while the LED flashes rainbow colours.', hint: 'FastLED can make a rainbow colour from a number: <code>leds[0] = CHSV(hue, 255, 255);</code> with hue from 0 to 255.' },
      { tag: 'Arrays', title: 'Record & replay', html: 'Store each key press in an array (<code>int moves[50];</code>) with a counter. When you press #, the robot replays the moves on its own.', hint: '<code>moves[count] = code; count++;</code> to record. To replay: <code>for (int i = 0; i &lt; count; i++) { … }</code>' },
      { tag: 'Code', cls: 'c', title: 'Smarter bumper', html: 'Make the safe distance grow with speed (gear 3 needs more room to stop), and turn the LED red while the bumper is blocking you.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try and what did you learn?', placeholder: 'We built record & replay…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r05 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your remote pilot. Upload your video and code, answer the questions, then press Submit.', [
      K.videoFile('Under 45 seconds: drive the course, change gears (show the LED), and show the bumper stopping the car at a wall while ▲ is held.'),
      K.codeFile('remote_pilot')
    ], [
      { id: 'r1', q: 'How does the remote send a key press to the car? How did you find the codes for your remote?' },
      { id: 'r2', q: 'Explain how your switch / case works. What does break do, and what happens to keys that aren’t in any case?' },
      { id: 'r3', q: 'How does the program know a key has been let go? Explain lastSignal, millis() and TIMEOUT.' },
      { id: 'r4', q: 'What is the program’s “state”? Name the variables that remember things and explain why they must be made outside loop().' }
    ])
  };
})(window);
