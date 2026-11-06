/* Mission R6: Line follower — infrared reflectance sensors, analogRead & thresholds, calibrating from data,
 * if / else if chains with && and ||, a memory of the last turn, and proportional steering. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb', GO = '#4ade80';

  /* a stadium-shaped tape track centred on (cx, cy) */
  function stadium(cx, cy, len, r, n) {
    var pts = [], i, a, k = Math.max(2, Math.round(len / 8));
    for (i = 0; i < k; i++) pts.push([cx - len / 2 + len * i / k, cy - r]);                 // top straight, left to right
    for (i = 0; i <= n; i++) { a = -Math.PI / 2 + Math.PI * i / n; pts.push([cx + len / 2 + r * Math.cos(a), cy + r * Math.sin(a)]); }
    for (i = 1; i < k; i++) pts.push([cx + len / 2 - len * i / k, cy + r]);                 // bottom straight, right to left
    for (i = 0; i < n; i++) { a = Math.PI / 2 + Math.PI * i / n; pts.push([cx - len / 2 + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts.map(function (p) { return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]; });
  }
  /* a wavier track: a stadium with an S-wiggle along the top straight */
  function wavy(cx, cy) {
    return stadium(cx, cy, 120, 42, 18).map(function (p) {
      var u = (p[0] - (cx - 60)) / 120;
      return p[1] < cy - 30 && u > 0 && u < 1 ? [p[0], Math.round((p[1] + 12 * Math.sin(u * Math.PI * 2)) * 10) / 10] : p;
    });
  }
  /* a rounded rectangle: long straights and tight corners of radius r */
  function rrect(cx, cy, w, h, r) {
    var pts = [], c = [[cx + w / 2 - r, cy - h / 2 + r, -90], [cx + w / 2 - r, cy + h / 2 - r, 0], [cx - w / 2 + r, cy + h / 2 - r, 90], [cx - w / 2 + r, cy - h / 2 + r, 180]];
    c.forEach(function (k) { for (var i = 0; i <= 6; i++) { var a = (k[2] + 15 * i) * Math.PI / 180; pts.push([Math.round((k[0] + r * Math.cos(a)) * 10) / 10, Math.round((k[1] + r * Math.sin(a)) * 10) / 10]); } });
    return pts;
  }
  var TRACK = { w: 260, h: 170, cx: 130, cy: 85 };
  function trackWorld(extra) { return Object.assign({ w: TRACK.w, h: TRACK.h, grid: 10, lines: [{ pts: stadium(TRACK.cx, TRACK.cy, 120, 50, 20), closed: true }], start: { x: 130, y: 35, h: 90 } }, extra || {}); }

  /* ================= code ================= */
  var LINE_PINS = [
    'const int LINE_L = A2;   // left line sensor',
    'const int LINE_M = A1;   // middle line sensor',
    'const int LINE_R = A0;   // right line sensor'];
  var READ = K.join(['// R6 part 1: what do the line sensors see?'], LINE_PINS, ['',
    'void setup() {', '  Serial.begin(9600);', '}', '',
    'void loop() {',
    '  int left = analogRead(LINE_L);     // 0 to 1023',
    '  int middle = analogRead(LINE_M);',
    '  int right = analogRead(LINE_R);',
    '  Serial.print(left);',
    '  Serial.print("  ");',
    '  Serial.print(middle);',
    '  Serial.print("  ");',
    '  Serial.println(right);',
    '  delay(200);',
    '}']);
  var DRIVE_FN = [
    '// sets each side\'s speed from -255 (full backward) to 255 (full forward)',
    'void drive(int left, int right) {',
    '  if (left >= 0) {',
    '    digitalWrite(BIN1, HIGH);',
    '    analogWrite(PWMB, left);',
    '  } else {',
    '    digitalWrite(BIN1, LOW);',
    '    analogWrite(PWMB, -left);',
    '  }',
    '  if (right >= 0) {',
    '    digitalWrite(AIN1, HIGH);',
    '    analogWrite(PWMA, right);',
    '  } else {',
    '    digitalWrite(AIN1, LOW);',
    '    analogWrite(PWMA, -right);',
    '  }',
    '}'];
  var SETUP_L = ['  Serial.begin(9600);', '  pinMode(BUTTON, INPUT_PULLUP);'].concat(K.SETUP_MOTORS);
  var FOLLOW = K.join(['// R6 part 2: follow the line with simple rules'], K.PINS, K.BUTTON_PIN, LINE_PINS, [
    'const int THRESHOLD = 450;   // above this = black tape (use YOUR calibration)', '',
    'void setup() {'], SETUP_L, ['  waitForButton();', '}', '',
    'void loop() {',
    '  bool onLeft = analogRead(LINE_L) > THRESHOLD;     // true if the left sensor sees tape',
    '  bool onMiddle = analogRead(LINE_M) > THRESHOLD;',
    '  bool onRight = analogRead(LINE_R) > THRESHOLD;',
    '',
    '  if (onMiddle && !onLeft && !onRight) {',
    '    drive(130, 130);        // centred: straight ahead',
    '  } else if (onLeft) {',
    '    drive(20, 150);         // line is to the left: steer left',
    '  } else if (onRight) {',
    '    drive(150, 20);         // line is to the right: steer right',
    '  } else {',
    '    drive(0, 0);            // no line at all: stop',
    '  }',
    '}', ''], K.WAIT_BUTTON, [''], DRIVE_FN);
  var MEMORY = K.join(['// R6 part 3: remember which way the line went'], K.PINS, K.BUTTON_PIN, LINE_PINS, [
    'const int THRESHOLD = 450;', '',
    'int lastSide = 0;   // -1 = line was last seen on the left, 1 = on the right', '',
    'void setup() {'], SETUP_L, ['  waitForButton();', '}', '',
    'void loop() {',
    '  int l = analogRead(LINE_L);',
    '  int m = analogRead(LINE_M);',
    '  int r = analogRead(LINE_R);',
    '',
    '  // picked up? (all three see "black" because there is no floor) -> stop',
    '  if (l > 950 && m > 950 && r > 950) {',
    '    drive(0, 0);',
    '    return;   // skip the rest of loop() this time',
    '  }',
    '',
    '  bool onLeft = l > THRESHOLD;',
    '  bool onMiddle = m > THRESHOLD;',
    '  bool onRight = r > THRESHOLD;',
    '',
    '  if (onLeft) {',
    '    lastSide = -1;',
    '  }',
    '  if (onRight) {',
    '    lastSide = 1;',
    '  }',
    '',
    '  if (onMiddle && !onLeft && !onRight) {',
    '    drive(150, 150);',
    '  } else if (onLeft) {',
    '    drive(20, 160);',
    '  } else if (onRight) {',
    '    drive(160, 20);',
    '  } else if (lastSide == -1) {',
    '    drive(-90, 130);        // lost it: spin back toward the left',
    '  } else {',
    '    drive(130, -90);        // lost it: spin back toward the right',
    '  }',
    '}', ''], K.WAIT_BUTTON, [''], DRIVE_FN);
  var SMOOTH = K.join(['// R6 part 4: smooth (proportional) steering'], K.PINS, K.BUTTON_PIN, LINE_PINS, [
    'const int BASE = 150;      // speed when the line is dead centre',
    'const float KP = 0.12;     // how hard to steer for each unit of error (tune this!)', '',
    'int lastSide = 0;', '',
    'void setup() {'], SETUP_L, ['  waitForButton();', '}', '',
    'void loop() {',
    '  int l = analogRead(LINE_L);',
    '  int m = analogRead(LINE_M);',
    '  int r = analogRead(LINE_R);',
    '',
    '  if (l < 450 && m < 450 && r < 450) {   // lost the line: spin toward where it was',
    '    if (lastSide < 0) {',
    '      drive(-90, 130);',
    '    } else {',
    '      drive(130, -90);',
    '    }',
    '    return;',
    '  }',
    '',
    '  int error = r - l;          // + means the line is to the right, - to the left',
    '  if (error > 100) {',
    '    lastSide = 1;',
    '  }',
    '  if (error < -100) {',
    '    lastSide = -1;',
    '  }',
    '  int steer = error * KP;     // bigger error -> steer harder',
    '  drive(BASE + steer, BASE - steer);',
    '}', ''], K.WAIT_BUTTON, [''], DRIVE_FN);

  /* ================= checks ================= */
  function lapCheck(w, api, maxMs, label) {
    return K.pressStart(api).then(function () {
      return new Promise(function (res) {
        var prev = null, total = 0, off = 0, t0 = Date.now(), lastT = Date.now();
        var iv = setInterval(function () {
          var p = w.pose(), a = Math.atan2(p.y - TRACK.cy, p.x - TRACK.cx), now = Date.now();
          if (prev != null) { var d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; total += d; }
          prev = a;
          if (!w.onLine()) off += now - lastT; else off = 0; lastT = now;
          if (off > 1600) { clearInterval(iv); res({ pass: false, msg: 'The car lost the line and didn’t find it again (' + Math.round(Math.abs(total) / (2 * Math.PI) * 100) + '% of a lap). Check THRESHOLD and the steering speeds.' }); }
          else if (Math.abs(total) >= 2 * Math.PI) { clearInterval(iv); res({ pass: true, msg: (label || 'A full lap') + ' in ' + ((now - t0) / 1000).toFixed(1) + ' s without losing the line.' }); }
          else if (now - t0 > maxMs) { clearInterval(iv); res({ pass: false, msg: 'Only ' + Math.round(Math.abs(total) / (2 * Math.PI) * 100) + '% of a lap in ' + Math.round(maxMs / 1000) + ' s. Is it moving?' }); }
        }, 80);
      });
    });
  }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r06, {
      lead: '<p class="lead">Warehouse robots, hospital delivery carts and some factory vehicles find their way by following lines on the floor. Your robot can too: three infrared sensors underneath it can tell black tape from a light floor.</p>' +
        '<p>You’ll find out what the sensors really measure, choose a <b>threshold</b> from your own data, write rules that steer the robot back onto the line, give it a <b>memory</b> so it can find the line again when it loses it, and finally make it steer <b>smoothly</b> — the way real line-following robots do.</p>',
      edp: [2, 3, 4, 5, 6, 7],
      demo: { sonar: false, title: 'Following a tape track', world: trackWorld(),
        cap: 'Middle sensor on the tape: straight. Left sensor on the tape: the line is curving left, so steer left. Right sensor: steer right.',
        program: async function (car) {
          var last = 1;
          for (var i = 0; i < 1300; i++) {
            var L = car.line(2) > 450, M = car.line(1) > 450, R = car.line(0) > 450;
            if (L) last = -1; if (R) last = 1;
            if (M && !L && !R) { car.say('centred → straight'); await car.drive(150, 150, 15); }
            else if (L) { car.say('left sensor → steer left'); await car.drive(20, 160, 15); }
            else if (R) { car.say('right sensor → steer right'); await car.drive(160, 20, 15); }
            else { car.say('lost → spin back'); await car.drive(last < 0 ? -90 : 130, last < 0 ? 130 : -90, 15); }
          }
        } }
    });
  } });

  steps.push({ id: 'sensor', title: 'Code it: what the sensors see', stage: '02 Research · 05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Each of the three sensors under the front of the car is a tiny pair: an <b>infrared LED</b> that shines down at the floor, and a <b>light sensor</b> beside it that measures how much light bounces back.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Why black tape looks different', w: 820, h: 260, frames: [
      { cap: 'Over a <b>white</b> floor, most of the infrared light bounces back into the sensor. On ELEGOO’s module that gives a <b>low</b> number from analogRead (around 50–200).', draw: function (svg) { refl(svg, 0); } },
      { cap: 'Over <b>black</b> tape, the tape soaks up (absorbs) most of the light. Little comes back, so the reading is <b>high</b> (around 700–900).', draw: function (svg) { refl(svg, 1); } },
      { cap: 'Half on the edge of the tape: something in between. And if you <b>pick the car up</b>, no light comes back at all — all three read “very black” (over 950). Handy for knowing when the robot has been lifted!', draw: function (svg) { refl(svg, 2); } }
    ] });
    UI.html(b, '<h2>analogRead</h2><p><code>analogRead(pin)</code> measures the voltage on an analog pin (A0–A5) and gives a number from <b>0</b> (0 V) to <b>1023</b> (5 V). The line sensors are on <b>A2</b> (left), <b>A1</b> (middle) and <b>A0</b> (right).</p>');
    RL.Code.walk(b, READ, [
      { title: 'The plan', html: '<p>Read all three sensors and print them, five times a second. Then move the car around and watch the numbers.</p>' },
      { lines: [2, 4], title: 'Names for the sensors', html: '<p><code>A2</code>, <code>A1</code>, <code>A0</code> are the analog pins. Analog pins don’t need <code>pinMode</code> to be read.</p>' },
      { lines: [K.line(READ, /int left = analogRead/), K.line(READ, /int right = analogRead/)], title: 'Three variables', html: '<p>Each reading goes into its own variable, so we can print them (and later, compare them).</p>' }
    ], { name: 'line_sensors' });
    UI.html(b, '<h2>Try it</h2><p>Run it, then <b>drag the car</b> slowly across the black tape. Watch the numbers change as each sensor crosses (look at the dots under the car too).</p>');
    K.sim(b, { title: 'What the line sensors see', code: READ, name: 'line_sensors', key: 'sim-read', ctx: ctx, runHint: 'drag the car across the tape and watch the numbers.', checkAfter: 1500,
      world: { w: 160, h: 90, start: { x: 50, y: 45, h: 90 }, lines: [{ pts: [[100, 5], [100, 85]] }] },
      check: function (w, api) { return /\d+\s+\d+\s+\d+/.test(api.serialText()) ? { pass: true, msg: 'Readings are coming in. Now measure your real track.' } : { pass: false, msg: 'No readings yet.' }; } });
    UI.html(b, '<h2>Calibrate on your real floor</h2><p>Upload it (keep the USB cable in), put the car on your floor with all three sensors on the light floor, then with each sensor in turn over the tape. Write down the numbers.</p>');
    K.uploadSteps(b, { keepUsb: true });
    UI.note(b, ctx, { id: 'n-cal', label: 'Your readings: all three on the floor, and each one on the tape.', placeholder: 'On floor: 85  70  92\nOn tape: 790  810  760', rows: 3 });
    UI.html(b, '<p>The <b>threshold</b> is the number that separates “floor” from “tape”. Put it halfway between your floor and tape readings: then small changes in light won’t fool it.</p>');
    UI.numq(b, ctx, { id: 'q-thr', q: 'Your floor reads about <b>120</b> and your tape about <b>780</b>. What threshold should you use?', answer: 450, tol: 10, unit: '', explain: '(120 + 780) ÷ 2 = 450. Anything above 450 counts as tape.', hint: 'Halfway between: add them and divide by 2.' });
  } });
  function refl(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 260, fill: '#070d17' }, svg);
    var floorY = 200;
    S('rect', { x: 60, y: floorY, width: 700, height: 30, fill: '#dfe5ea' }, svg);
    if (k > 0) S('rect', { x: k === 1 ? 330 : 400, y: floorY - 1, width: 160, height: 31, fill: '#15181c' }, svg);
    S('rect', { x: 300, y: 70, width: 220, height: 40, rx: 6, fill: '#1d3b2a', stroke: '#3f7a57', 'stroke-width': 2 }, svg);
    S('circle', { cx: 380, cy: 110, r: 12, fill: '#7c3aed' }, svg); S('circle', { cx: 440, cy: 110, r: 12, fill: '#111' }, svg);
    T(svg, 380, 60, 'IR LED', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 }); T(svg, 440, 60, 'SENSOR', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
    var back = [0.9, 0.12, 0.5][k];
    S('line', { x1: 380, y1: 124, x2: 410, y2: floorY, stroke: '#c084fc', 'stroke-width': 5, opacity: 0.85 }, svg);
    S('line', { x1: 410, y1: floorY, x2: 440, y2: 124, stroke: '#c084fc', 'stroke-width': 1 + back * 6, opacity: Math.max(0.15, back) }, svg);
    var val = [110, 790, 460][k];
    T(svg, 640, 120, 'analogRead → ' + val, { fill: CY, 'font-size': 20, 'font-weight': 700, 'text-anchor': 'middle' });
    T(svg, 640, 150, ['white floor: lots comes back', 'black tape: little comes back', 'edge of the tape: in between'][k], { fill: MUT, 'font-size': 13, 'text-anchor': 'middle' });
  }

  steps.push({ id: 'track', title: 'Make a track', stage: '03 Imagine · 05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Lay a loop of <b>black electrical tape</b> (19 mm wide) on a light, smooth floor — or on big sheets of poster paper taped together, so you can roll it up and take it home.</p>');
    UI.html(b, '<h2>Track rules</h2><ul><li><b>A closed loop</b> about 1.5–2 m long to start with.</li><li><b>Gentle curves</b>: no corner tighter than a dinner plate (about 15 cm radius). Lay the tape in short overlapping pieces on curves so it stays flat.</li><li>Keep it <b>at least 20 cm</b> from walls, table legs and other tracks.</li><li>No wrinkles or bubbles — the sensors see them.</li><li>Later, for a challenge: a tighter curve, an S-bend, a crossing, a finish line.</li></ul>');
    UI.callout(b, '', 'Shiny floors', '<p>Very shiny or dark floors can confuse the sensors. If your floor reads more than 300, use poster paper.</p>');
    UI.note(b, ctx, { id: 'n-track', label: 'Describe or sketch your track: its length, its tightest curve, anything tricky.', placeholder: 'An oval about 1.8 m around with one S-bend…' });
  } });

  steps.push({ id: 'rules', title: 'Think like a line follower', stage: '04 Plan', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">With three sensors, there are eight possible combinations of “on the tape” and “off the tape”. For each one, the robot needs a rule. Tap each combination to see what it means and what the robot should do.</p>');
    truthTable(b, ctx);
    UI.html(b, '<h2>Logic: &amp;&amp;, || and !</h2><table class="fx-plan"><thead><tr><th>Code</th><th>Means</th><th>Example</th></tr></thead><tbody>' +
      '<tr><td><code>a &amp;&amp; b</code></td><td><b>and</b>: true only if both are true</td><td><code>onMiddle &amp;&amp; !onLeft</code></td></tr>' +
      '<tr><td><code>a || b</code></td><td><b>or</b>: true if either (or both) is true</td><td><code>onLeft || onRight</code></td></tr>' +
      '<tr><td><code>!a</code></td><td><b>not</b>: flips true and false</td><td><code>!onLeft</code> = “left is NOT on the tape”</td></tr></tbody></table>');
    UI.mcq(b, ctx, { id: 'q-logic', q: 'The left sensor is on the tape, the middle and right are not. Which condition is <b>true</b>?', options: ['onMiddle && !onLeft', 'onLeft && onRight', 'onLeft || onRight', '!onLeft'], answer: 2, explain: 'onLeft is true, so “onLeft or onRight” is true. The others each need something that isn’t the case.' });
    UI.mcq(b, ctx, { id: 'q-order', q: 'In an <code>if … else if … else if</code> chain, what happens when two conditions are both true?', options: ['Both blocks run', 'Only the first true one runs; the rest are skipped', 'Only the last one runs', 'It’s an error'], answer: 1, explain: 'The chain checks in order and runs the first match only. That’s why the order of your rules matters.' });
  } });
  function truthTable(b, ctx) {
    var rows = [
      ['0', '1', '0', 'Centred on the line', 'Straight ahead', 'drive(130, 130)'],
      ['1', '1', '0', 'The line is curving left', 'Steer left', 'drive(20, 150)'],
      ['1', '0', '0', 'The line is well to the left', 'Steer left harder', 'drive(20, 150)'],
      ['0', '1', '1', 'The line is curving right', 'Steer right', 'drive(150, 20)'],
      ['0', '0', '1', 'The line is well to the right', 'Steer right harder', 'drive(150, 20)'],
      ['0', '0', '0', 'Lost the line!', 'Stop — or (part 3) turn back the way it went', 'drive(0, 0)'],
      ['1', '1', '1', 'All black: a crossing, a finish line, or the car was picked up', 'Depends! (a challenge)', '…'],
      ['1', '0', '1', 'Very strange (two lines?)', 'Carry on straight', 'drive(130, 130)']];
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Explore</span><h3>Eight combinations</h3></div>';
    var grid = el('div', 'r6-tt'); box.appendChild(grid); var info = el('div', 'xp-cap'); box.appendChild(info); b.appendChild(box);
    rows.forEach(function (r, i) {
      var bt = el('button', 'r6-combo'); bt.type = 'button';
      bt.innerHTML = ['L', 'M', 'R'].map(function (n, j) { return '<span class="' + (r[j] === '1' ? 'on' : '') + '">' + n + '</span>'; }).join('');
      bt.addEventListener('click', function () { grid.querySelectorAll('button').forEach(function (x) { x.classList.remove('sel'); }); bt.classList.add('sel'); info.innerHTML = '<p><b>' + r[3] + '.</b> ' + r[4] + ': <code>' + r[5] + '</code></p>'; });
      grid.appendChild(bt);
    });
    info.innerHTML = '<p class="muted">Orange = that sensor is over the tape. Tap a combination.</p>';
  }

  steps.push({ id: 'follow', title: 'Code it: follow the line', stage: '05 Create', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now turn the rules into code. Two new tools: a <code>drive(left, right)</code> function that sets each side’s speed (negative = backward), and <code>bool</code> variables that are true when a sensor is over the tape.</p>');
    RL.Code.walk(b, FOLLOW, [
      { title: 'The plan', html: '<p>Each time round loop(): read the three sensors, turn each reading into true/false using the threshold, then pick an action with an if / else if chain.</p>' },
      { lines: [K.line(FOLLOW, /THRESHOLD = 450/), K.line(FOLLOW, /THRESHOLD = 450/)], title: 'Your threshold', html: '<p>Put the number from your own calibration here.</p>' },
      { lines: [K.line(FOLLOW, /bool onLeft/), K.line(FOLLOW, /bool onRight/)], title: 'Booleans from readings', html: '<p><code>analogRead(LINE_L) &gt; THRESHOLD</code> is a comparison, so it’s either true or false. That answer goes straight into a <code>bool</code> variable. From now on the code can say <code>onLeft</code> instead of the whole comparison.</p>' },
      { lines: [K.line(FOLLOW, /if \(onMiddle && !onLeft/), K.line(FOLLOW, /drive\(0, 0\);\s+\/\/ no line/) + 1], title: 'The rules', html: '<p>Centred (middle only) → straight. Left sensor on → steer left by slowing the left wheels (20) and speeding up the right (150). Right → the opposite. None → stop.</p><p>Notice <code>else if (onLeft)</code> also catches “left <i>and</i> middle”, because the first rule needed left to be off.</p>' },
      { lines: K.fn(FOLLOW, 'drive'), title: 'drive(left, right)', html: '<p>One function for every kind of move. A positive number drives that side forward at that speed; a negative number drives it backward (<code>-left</code> turns −80 into 80 for analogWrite, which can’t take negatives). <code>drive(150, 150)</code> is forward, <code>drive(-120, 120)</code> spins left, <code>drive(160, 60)</code> curves right.</p>' }
    ], { name: 'line_follow' });
    UI.html(b, '<h2>Try it</h2><p>Hold MODE and watch it go round the track. Then experiment: what happens with speeds of 200? With steering of <code>drive(60, 150)</code> instead of <code>drive(20, 150)</code>?</p>');
    K.sim(b, { title: 'Follow the line', code: FOLLOW, name: 'line_follow', key: 'sim-follow', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300, world: trackWorld(),
      check: function (w, api) { return lapCheck(w, api, 40000); } });
    UI.html(b, '<h2>On your real track</h2>');
    K.uploadSteps(b);
    UI.callout(b, 'plain', 'Troubleshooting', '<ul><li><b>Drives straight off the line</b> — the threshold is wrong (print the readings again), or left and right are swapped in your rules.</li><li><b>Wobbles side to side a lot</b> — normal for this simple version! Part 4 fixes it. Lower speeds help.</li><li><b>Runs off on curves</b> — steer harder (smaller inside speed) or slow down.</li></ul>');
  } });

  steps.push({ id: 'memory', title: 'Code it: find the line again', stage: '05 Create · 07 Improve', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">On a tight curve the line can slip out from under all three sensors before the robot steers enough. With the simple version it just stops. But the robot <i>knew</i> which way the line was going a moment ago — so give it a <b>memory</b>: remember which side last saw the line, and if it’s lost, spin back that way.</p>');
    RL.Code.walk(b, MEMORY, [
      { title: 'The plan', html: '<p>A global variable remembers the last side that saw the tape. When nothing sees the tape, spin toward that side until it does again. Also: stop if the car is picked up.</p>' },
      { lines: [K.line(MEMORY, /int lastSide/), K.line(MEMORY, /int lastSide/)], title: 'The memory', html: '<p>Made at the top, outside loop(), so it keeps its value from one loop to the next.</p>' },
      { lines: [K.line(MEMORY, /picked up/), K.line(MEMORY, /picked up/) + 4], title: 'Picked up?', html: '<p>All three over 950 means no floor at all. <code>return;</code> ends this run of loop() early — the rest is skipped, and loop() starts again from the top. So it stays stopped until it’s put down.</p>' },
      { lines: [K.line(MEMORY, /if \(onLeft\) \{/), K.line(MEMORY, /lastSide = 1;/) + 1], title: 'Update the memory', html: '<p>Whenever a side sensor sees the tape, write down which side.</p>' },
      { lines: [K.line(MEMORY, /else if \(lastSide == -1\)/), K.line(MEMORY, /else if \(lastSide == -1\)/) + 4], title: 'Lost → search the right way', html: '<p>Spin with one side backward and the other forward, toward where the line was last seen, until a sensor finds it again.</p>' }
    ], { name: 'line_memory' });
    K.sim(b, { title: 'Find the line again', code: MEMORY, name: 'line_memory', key: 'sim-memory', ctx: ctx, runHint: 'click “Hold the MODE button”. Try dragging it off the line!', checkAfter: 300,
      world: trackWorld({ lines: [{ pts: rrect(TRACK.cx, TRACK.cy, 200, 120, 9), closed: true }], start: { x: 110, y: 25, h: 90 } }),
      check: function (w, api) { return lapCheck(w, api, 40000, 'A full lap of the tight track'); } });
    UI.html(b, '<p>Test it for real: add one <b>tight corner</b> to your track (about 8–10 cm radius, smaller than a saucer). Run the part 2 code first and watch it lose the line, then this version.</p>');
    UI.mcq(b, ctx, { id: 'q-return', q: 'What does <code>return;</code> do inside loop()?', options: ['Stops the program forever', 'Ends this run of loop() early; loop() then starts again from the top', 'Goes back to setup()', 'Returns the sensor value'], answer: 1, explain: 'loop() is a function; return leaves it. The UNO immediately calls loop() again.' });
  } });

  steps.push({ id: 'smooth', title: 'Code it: smooth steering', stage: '05 Create · 07 Improve', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The rules version only has three moods: straight, hard left, hard right. So it zig-zags. A human driver steers <b>a little</b> when slightly off and <b>a lot</b> when far off. That’s called <b>proportional control</b>: the steering is proportional to (grows with) the error.</p>');
    UI.html(b, '<h2>Error and steering</h2><p>Use the analog numbers themselves. <code>error = right − left</code>: if the right sensor reads more “black” than the left, the line is to the right and the error is positive. Then <code>steer = error × KP</code>, and the left wheels get <code>BASE + steer</code>, the right <code>BASE − steer</code>. A small error gives a gentle curve; a big error a sharp one. <b>KP</b> (the “gain”) sets how strongly it reacts.</p>');
    pLab(b);
    RL.Code.walk(b, SMOOTH, [
      { title: 'The plan', html: '<p>Measure how far off the line we are (the error), and steer by an amount proportional to it.</p>' },
      { lines: [K.line(SMOOTH, /BASE = 150/), K.line(SMOOTH, /KP = 0.12/)], title: 'Two numbers to tune', html: '<p><code>BASE</code> is the cruising speed. <code>KP</code> is the gain. Too small: lazy, runs wide on curves. Too big: twitchy, zig-zags again. Engineers tune it by testing.</p>' },
      { lines: [K.line(SMOOTH, /int error = r - l/), K.line(SMOOTH, /drive\(BASE \+ steer/)], title: 'Error → steer → drive', html: '<p>Example: right reads 600, left 100 → error 500 → steer 500 × 0.12 = 60 → left side 210, right side 90: a firm right curve. If both read about the same, error ≈ 0 and it drives straight.</p>' },
      { lines: [K.line(SMOOTH, /lost the line/), K.line(SMOOTH, /lost the line/) + 7], title: 'Still remember', html: '<p>If all three see floor, use the memory from part 3 to spin back toward the line.</p>' }
    ], { name: 'line_smooth' });
    K.sim(b, { title: 'Smooth steering', code: SMOOTH, name: 'line_smooth', key: 'sim-smooth', ctx: ctx, runHint: 'click “Hold the MODE button”. Then try KP = 0.05 and KP = 0.4.', checkAfter: 300,
      world: trackWorld({ lines: [{ pts: wavy(TRACK.cx, TRACK.cy), closed: true }], start: { x: 130, y: 127, h: 270 } }),
      check: function (w, api) { return lapCheck(w, api, 40000, 'A full lap of the wavy track'); } });
    UI.note(b, ctx, { id: 'n-kp', label: 'Tuning log (real track): KP and BASE you tried, lap time, and how it looked.', placeholder: 'KP 0.12, BASE 150: 9.8 s, smooth\nKP 0.3: 9.1 s but wobbly…', rows: 4 });
  } });
  function pLab(b) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>Error → steering</h3></div>';
    var stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 820 220', role: 'img', 'aria-label': 'Proportional steering' }); stage.appendChild(svg); box.appendChild(stage);
    var cap = el('div', 'xp-cap'); box.appendChild(cap); b.appendChild(box);
    var mk = function (label, min, max, step, val) { var row = el('div', 'slider-row'); row.innerHTML = '<label>' + label + '</label>'; var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; var o = el('b', '', String(val)); row.appendChild(r); row.appendChild(o); cap.appendChild(row); return { r: r, o: o }; };
    var off = mk('Line position under the car', -3, 3, 0.1, 1.2), kp = mk('KP', 0, 0.4, 0.01, 0.12);
    var out = el('p', 'small', ''); cap.appendChild(out);
    function draw() {
      while (svg.lastChild) svg.removeChild(svg.lastChild);
      S('rect', { x: 0, y: 0, width: 820, height: 220, fill: '#070d17' }, svg);
      var o = Number(off.r.value), k = Number(kp.r.value); off.o.textContent = (o > 0 ? '+' : '') + o.toFixed(1) + ' cm'; kp.o.textContent = k.toFixed(2);
      var val = function (x) { var d = Math.abs(x - o) - 0.95, t = Math.max(0, Math.min(1, (0.6 - d) / 1.0)); return Math.round(105 + 685 * t); };
      var L = val(-2), M = val(0), R = val(2), err = R - L, steer = Math.round(err * k), ls = Math.max(-255, Math.min(255, 150 + steer)), rs = Math.max(-255, Math.min(255, 150 - steer));
      S('rect', { x: 60, y: 30, width: 380, height: 90, fill: '#dfe5ea', rx: 6 }, svg); S('rect', { x: 250 + o * 40 - 38, y: 30, width: 76, height: 90, fill: '#15181c' }, svg);
      [[-2, L, 'L'], [0, M, 'M'], [2, R, 'R']].forEach(function (s) { var x = 250 + s[0] * 40; S('circle', { cx: x, cy: 75, r: 11, fill: s[1] > 450 ? SIG : '#9fb3c8', stroke: '#0b1320', 'stroke-width': 2 }, svg); T(svg, x, 145, s[2] + ' ' + s[1], { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); });
      T(svg, 490, 50, 'error = R − L = ' + err, { fill: '#e6f1fa', 'font-size': 15 }); T(svg, 490, 80, 'steer = error × KP = ' + steer, { fill: '#e6f1fa', 'font-size': 15 });
      T(svg, 490, 118, 'left wheels  ' + ls, { fill: CY, 'font-size': 15 }); T(svg, 490, 144, 'right wheels ' + rs, { fill: CY, 'font-size': 15 });
      out.textContent = Math.abs(o) < 0.3 ? 'Centred: no error, so it drives straight.' : (err === 0 ? 'Only the middle sensor sees the tape, so the error is 0 — the side sensors only react once the line drifts toward them.' : 'The line is to the ' + (err > 0 ? 'right' : 'left') + ', so it curves ' + (err > 0 ? 'right' : 'left') + ' — harder the farther off it is.');
      // a tiny car showing the curve
      var g = S('g', { transform: 'translate(760 120) rotate(' + Math.max(-60, Math.min(60, steer / 3)) + ') scale(2.4)' }, svg); RL.Car.art(g);
    }
    off.r.addEventListener('input', draw); kp.r.addEventListener('input', draw); draw();
  }

  steps.push({ id: 'test', title: 'Time trials & improve', stage: '06 Test · 07 Improve', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Race! Each team gets three timed laps on a shared track. Fastest clean lap wins (a lap is clean if the robot never fully leaves the line).</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      'Your threshold comes from your own measurements.',
      'The rules version gets all the way round your track.',
      'The memory version finds the line again on the tightest curve.',
      'The smooth version is faster or smoother than the rules version.',
      'Picking the car up makes it stop.'
    ] });
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Finish line', html: 'Put a short strip of tape across the track. When all three sensors see black at once, stop and flash the LED green.' },
      { tag: 'Code', title: 'Lap counter', html: 'Count the finish-line crossings and stop after 3 laps.', hint: 'Careful: the robot stays over the strip for several loops. Only count when it goes from “not all black” to “all black”.' },
      { tag: 'Sensors', title: 'Traffic stop', html: 'Add the ultrasonic sensor: if something is on the track ahead, wait until it moves.' },
      { tag: 'Tuning', cls: 'c', title: 'Speed run', html: 'Push BASE as high as you can while still finishing clean laps. What KP works best at high speed?' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Your best lap time, the settings you used, and what you learned from tuning.', placeholder: 'Best lap 7.4 s with BASE 190, KP 0.18…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r06 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your line follower. Upload a photo of your track, your video and code, answer the questions, then press Submit.', [
      K.photoFile('A photo of your track', 'Your whole track from above.', 2),
      K.videoFile('Under 45 seconds: one full lap with your best version (smooth steering if you got it working).'),
      K.codeFile('line_follow')
    ], [
      { id: 'r1', q: 'Explain how a line sensor can tell black tape from the floor. What numbers did yours give, and how did you choose your threshold?' },
      { id: 'r2', q: 'Explain your if / else if rules. Why does the order of the rules matter? Use && or || in your answer.' },
      { id: 'r3', q: 'What does lastSide remember, and how does it help the robot find the line again?' },
      { id: 'r4', q: 'Explain proportional steering using error, KP and the wheel speeds. How did changing KP change the robot’s driving?' }
    ])
  };
})(window);
