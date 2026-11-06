/* Mission R4: Seek & stop — the ultrasonic sensor, variables, functions that return values, if/else, comparison
 * operators, while loops and the servo. The robot spins until it sees an object, drives to it and stops. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb', GO = '#4ade80';

  /* ================= code ================= */
  var SETUP_ALL = ['  Serial.begin(9600);', '  pinMode(BUTTON, INPUT_PULLUP);', '  pinMode(TRIG, OUTPUT);', '  pinMode(ECHO, INPUT);'].concat(K.SETUP_MOTORS);
  var SENSE = K.join(['// R4 part 1: what does the robot see?'], K.SONAR, [
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  pinMode(TRIG, OUTPUT);',
    '  pinMode(ECHO, INPUT);',
    '}',
    '',
    'void loop() {',
    '  int cm = readDistance();   // ask the sensor and keep the answer in a variable',
    '  Serial.print("Distance: ");',
    '  Serial.print(cm);',
    '  Serial.println(" cm");',
    '  delay(200);',
    '}',
    ''], K.READ_DIST);
  var BUMPER = K.join(['// R4 part 2: don\'t crash!'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int SPEED = 140;',
    'const int STOP_CM = 20;    // stop when something is closer than this',
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '}',
    '',
    'void loop() {',
    '  int cm = readDistance();',
    '  if (cm < STOP_CM) {',
    '    stopCar();          // too close: stop',
    '  } else {',
    '    forward(SPEED);     // the way is clear: keep going',
    '  }',
    '  delay(30);',
    '}',
    ''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);
  var SEEK = K.join(['// R4 part 3: seek & stop'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int SEE_CM = 80;     // anything closer than this counts as "found"',
    'const int STOP_CM = 12;    // stop this far from the object',
    '',
    'void setup() {'], SETUP_ALL, [
    '}',
    '',
    'void loop() {',
    '  waitForButton();',
    '',
    '  // 1. search: spin slowly until something is closer than SEE_CM',
    '  spinRight(110);',
    '  while (readDistance() > SEE_CM) {',
    '    delay(20);',
    '  }',
    '  delay(150);      // turn a little more: the sensor sees the edge first',
    '  stopCar();',
    '  Serial.println("Found something!");',
    '  delay(300);',
    '',
    '  // 2. approach: drive forward until it is STOP_CM away',
    '  forward(130);',
    '  while (readDistance() > STOP_CM) {',
    '    delay(20);',
    '  }',
    '  stopCar();',
    '  Serial.println("Arrived.");',
    '}',
    ''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);
  var LOOK = K.join(['// R4 part 4: look around first, then turn the quick way', '#include <Servo.h>'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int SEE_CM = 80;',
    'const int STOP_CM = 12;',
    '',
    'Servo head;   // the servo that turns the ultrasonic sensor',
    '',
    'void setup() {'], SETUP_ALL, [
    '  head.attach(10);',
    '  head.write(90);     // look straight ahead',
    '}',
    '',
    'void loop() {',
    '  waitForButton();',
    '',
    '  int right = lookAt(30);    // look right and measure',
    '  int left = lookAt(150);    // look left and measure',
    '  head.write(90);            // eyes front again',
    '  delay(300);',
    '  Serial.print("left: ");',
    '  Serial.print(left);',
    '  Serial.print("  right: ");',
    '  Serial.println(right);',
    '',
    '  // spin toward the side that is closer',
    '  if (left < right) {',
    '    spinLeft(110);',
    '  } else {',
    '    spinRight(110);',
    '  }',
    '  while (readDistance() > SEE_CM) {',
    '    delay(20);',
    '  }',
    '  delay(150);      // a little more, to face the middle',
    '  stopCar();',
    '  delay(300);',
    '',
    '  forward(130);',
    '  while (readDistance() > STOP_CM) {',
    '    delay(20);',
    '  }',
    '  stopCar();',
    '}',
    '',
    '// turns the sensor to an angle, waits for it to get there, and measures',
    'int lookAt(int angle) {',
    '  head.write(angle);',
    '  delay(400);              // the servo needs time to turn',
    '  return readDistance();',
    '}',
    ''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);

  /* ================= checks ================= */
  function boxOf(w) { return w.cfg.boxes[0]; }
  function arrived(w, api, max, lo, hi) {
    return K.pressStart(api).then(function () { return K.waitStill(w, api, max, 1500); }).then(function () {
      var d = w.distTo(boxOf(w));
      if (w.bumps()) return { pass: false, msg: 'The car crashed into the box. Is STOP_CM big enough, and is readDistance() called inside the while loop?' };
      if (d > hi) return { pass: false, msg: 'The car stopped ' + Math.round(d) + ' cm from the box — it should be about ' + lo + '–' + hi + ' cm. ' + (w.travelled() < 5 ? 'It never moved: did it wait for the MODE button?' : '') };
      if (d < lo - 4) return { pass: false, msg: 'Too close: ' + Math.round(d) + ' cm.' };
      return { pass: true, msg: 'Stopped ' + Math.round(d) + ' cm from the box without touching it.' };
    });
  }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r04, {
      lead: '<p class="lead">Until now your robot has been driving blind: it just followed a list of moves. In this mission it starts making its own decisions. Put an object anywhere around it, press the button, and the robot <b>spins until it spots the object</b>, <b>drives straight to it</b>, and <b>stops</b> 12 cm away — without ever touching it.</p>' +
        '<p>To do it you’ll learn how a program <b>remembers</b> things (variables), <b>asks questions</b> (if / else) and <b>repeats something until a condition changes</b> (while loops) — the building blocks of every “smart” program.</p>',
      edp: [2, 4, 5, 6, 7],
      demo: { title: 'Seek & stop', world: { w: 260, h: 220, start: { x: 100, y: 110, h: 0 }, boxes: [{ x: 185, y: 150, w: 22, h: 22, label: 'TARGET' }] },
        cap: 'Search (spin until the sensor sees something within 80 cm), approach (drive until it’s 12 cm away), stop.',
        program: async function (car) {
          car.say('SEARCHING…'); car.led(255, 160, 0); await car.drive(110, -110, 0);
          for (var i = 0; i < 300 && car.dist() > 80; i++) await car.wait(20);
          await car.wait(150); await car.stop(300); car.say('FOUND IT'); car.led(0, 200, 255); await car.drive(130, 130, 0);
          for (i = 0; i < 400 && car.dist() > 12; i++) await car.wait(20);
          await car.stop(0); car.say('STOPPED 12 cm AWAY'); car.led(0, 255, 0); await car.wait(1500);
        } }
    });
  } });

  steps.push({ id: 'sense', title: 'Code it: what does the robot see?', stage: '02 Research · 05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The ultrasonic sensor works like a bat: it sends out a very high-pitched “ping” and times how long the echo takes to bounce back. Sound travels about 343 m per second, so the time tells you the distance.</p>');
    K.demo(b, { label: 'Explainer', title: 'Pings and echoes', world: { w: 200, h: 90, start: { x: 40, y: 45, h: 90 }, boxes: [{ x: 120, y: 30, w: 16, h: 30, drag: false, label: 'BOX' }] },
      cap: 'Each ping takes a few thousandths of a second. Close object → quick echo → small number. Far object → slow echo → big number. Nothing within 4 m → no echo at all.',
      program: async function (car) { car.say('pinging…'); for (var i = 0; i < 6; i++) { car.say('distance: ' + Math.round(car.dist()) + ' cm'); await car.wait(500); } car.say('creeping closer…'); await car.drive(80, 80, 1800); await car.stop(0); for (i = 0; i < 4; i++) { car.say('distance: ' + Math.round(car.dist()) + ' cm'); await car.wait(500); } } });
    UI.html(b, '<h2>Functions that give back an answer</h2><p>In Driving school your functions were <code>void</code>: they did a job and gave nothing back. <code>readDistance()</code> is different: it’s an <code>int</code> function, which means it <b>returns</b> a whole number — the distance. Inside, the <code>return</code> line sends the answer back to wherever the function was called.</p>' +
      '<h2>Variables: boxes with names</h2><p>A <b>variable</b> is a named box that holds a value. <code>int cm = readDistance();</code> means: “make a box called <code>cm</code> that holds a whole number, and put the answer from readDistance() in it.” Later you can read the box (<code>Serial.print(cm)</code>) or put a new value in it. Unlike a <code>const</code>, a variable’s value can change.</p>');
    RL.Code.walk(b, SENSE, [
      { title: 'The plan', html: '<p>Every 200 ms: measure, print. That’s all — but it’s how you find out what the robot actually “sees”, which is the first step of every sensor project.</p>' },
      { lines: [2, 3], title: 'The sensor’s pins', html: '<p><b>Trig</b> (13) is an output: the UNO pulses it to make the sensor ping. <b>Echo</b> (12) is an input: the sensor holds it HIGH for as long as the echo took.</p>' },
      { lines: [K.line(SENSE, /int cm = readDistance/), K.line(SENSE, /int cm = readDistance/)], title: 'Store the answer', html: '<p>The right side runs first: readDistance() pings and returns, say, 37. Then <code>=</code> puts 37 into the new variable <code>cm</code>. Every time loop() runs, a fresh <code>cm</code> is made with the latest reading.</p>' },
      { lines: [K.line(SENSE, /Serial.print\("Distance/), K.line(SENSE, /Serial.println\(" cm"\)/)], title: 'Print it', html: '<p><code>Serial.print</code> prints without a new line; <code>Serial.println</code> ends the line. Together they print <code>Distance: 37 cm</code>.</p>' },
      { lines: K.fn(SENSE, 'readDistance'), title: 'readDistance()', html: '<p>A 10-microsecond pulse on Trig makes the sensor ping. <code>pulseIn(ECHO, HIGH, 30000)</code> measures how many microseconds Echo stays HIGH (giving up after 30 000 µs = 30 ms if there’s no echo). Sound takes about 58 µs to travel 1 cm there and back, so <code>duration / 58</code> is centimetres. If nothing echoes, it returns 999 — “nothing there”.</p>' }
    ], { name: 'what_it_sees' });
    UI.html(b, '<h2>Try it</h2><p>Run it and <b>drag the box</b> closer and farther. Then drag it out of the way so the sensor sees the wall. Watch the Serial Monitor and the cyan beam.</p>');
    K.sim(b, { title: 'What does the robot see?', code: SENSE, name: 'what_it_sees', key: 'sim-sense', ctx: ctx, runHint: 'drag the box and watch the Serial Monitor.', checkAfter: 2000,
      world: { w: 220, h: 120, start: { x: 40, y: 60, h: 90 }, boxes: [{ x: 120, y: 45, w: 20, h: 30, drag: true, label: 'BOX' }] },
      check: function (w, api) { var s = api.serialText(); return /Distance: \d+ cm/.test(s) ? { pass: true, msg: 'The robot can see. Upload it to the real car and test it with your hand, a book and a soft sweater.' } : { pass: false, msg: 'No distances in the Serial Monitor yet.' }; } });
    UI.html(b, '<h2>On the real car</h2>');
    K.uploadSteps(b, { keepUsb: true });
    UI.note(b, ctx, { id: 'n-sense', label: 'Test the real sensor: what does it read for a wall 50 cm away? For a sweater? For something at an angle? For nothing at all?', placeholder: 'Wall at 50 cm: 49–51 · sweater: jumps around · angled book: 999…', rows: 3 });
    UI.mcq(b, ctx, { id: 'q-return', q: 'What does <code>return duration / 58;</code> do?', options: ['Prints the distance', 'Sends the distance back to the line that called readDistance()', 'Stops the program', 'Starts readDistance() again'], answer: 1, explain: 'return ends the function and hands its answer back. In <code>int cm = readDistance();</code> that answer lands in cm.' });
  } });

  steps.push({ id: 'decide', title: 'Code it: if / else — don’t crash', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now the robot makes a decision every time round the loop: <b>if</b> something is too close, stop; <b>otherwise</b>, drive. Because loop() runs dozens of times a second, the robot reacts almost instantly when something appears.</p>');
    UI.html(b, '<h2>Comparing numbers</h2><table class="fx-plan"><thead><tr><th>Code</th><th>Means</th><th>Example (cm = 15)</th></tr></thead><tbody>' +
      '<tr><td><code>cm &lt; 20</code></td><td>less than</td><td>true</td></tr><tr><td><code>cm &gt; 20</code></td><td>greater than</td><td>false</td></tr>' +
      '<tr><td><code>cm &lt;= 15</code></td><td>less than or equal to</td><td>true</td></tr><tr><td><code>cm &gt;= 20</code></td><td>greater than or equal to</td><td>false</td></tr>' +
      '<tr><td><code>cm == 15</code></td><td>is equal to (two =)</td><td>true</td></tr><tr><td><code>cm != 15</code></td><td>is not equal to</td><td>false</td></tr></tbody></table>');
    RL.Code.walk(b, BUMPER, [
      { title: 'Sense → think → act, forever', html: '<p>Each time round loop(): <b>sense</b> (readDistance), <b>think</b> (if/else), <b>act</b> (stop or forward). Then 30 ms later, do it all again.</p>' },
      { lines: [K.line(BUMPER, /STOP_CM = 20/), K.line(BUMPER, /STOP_CM = 20/)], title: 'A constant for the rule', html: '<p>Putting 20 in a named constant makes the rule easy to read and easy to tune: try 10, try 40.</p>' },
      { lines: [K.line(BUMPER, /int cm = readDistance/), K.line(BUMPER, /int cm = readDistance/) + 5], title: 'if / else', html: '<p><code>if (cm &lt; STOP_CM)</code>: if the distance is less than 20, run the first block (stop). <code>else</code>: in every other case, run the second block (drive). One of the two always runs.</p>' },
      { lines: [K.line(BUMPER, /delay\(30\)/), K.line(BUMPER, /delay\(30\)/)], title: 'A short pause', html: '<p>The sensor needs a moment between pings (echoes from the last ping can confuse the next one). 30 ms is enough, and it still checks about 25 times a second.</p>' }
    ], { name: 'dont_crash' });
    UI.html(b, '<h2>Try it</h2><p>Hold the MODE button. The car drives toward the box and stops. Now <b>drag the box away</b> — what happens? Drag it back in front of the car while it’s moving.</p>');
    K.sim(b, { title: 'Don’t crash', code: BUMPER, name: 'dont_crash', key: 'sim-bump', ctx: ctx, runHint: 'click “Hold the MODE button”, then drag the box around.', checkAfter: 300,
      world: { w: 240, h: 110, start: { x: 35, y: 55, h: 90 }, boxes: [{ x: 170, y: 38, w: 22, h: 34, drag: true, label: 'BOX' }] },
      check: function (w, api) { return arrived(w, api, 12000, 16, 26); } });
    UI.mcq(b, ctx, { id: 'q-if', q: 'With <code>if (cm &lt; 20) stop else forward</code>, what does the car do when <code>cm</code> is exactly 20?', options: ['Stops', 'Drives forward', 'Nothing', 'Backs up'], answer: 1, explain: '20 &lt; 20 is false, so the else runs: forward. Use <code>&lt;=</code> if you want 20 to count as too close.' });
    UI.html(b, '<h2>Your turn</h2><p>Change the program so that when something is too close, the car <b>backs up for half a second and turns right</b> before carrying on. That’s the start of a robot that roams a room without getting stuck.</p>');
    var h = el('details', ''); h.innerHTML = '<summary>Hint</summary><p>In the first block, replace <code>stopCar();</code> with <code>backward(SPEED); delay(500); spinRight(SPEED); delay(400);</code></p>'; b.appendChild(h);
  } });

  steps.push({ id: 'seek', title: 'Code it: seek & stop', stage: '05 Create', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The main event. The robot needs to do two things in order: <b>search</b> until it finds something, then <b>approach</b> until it’s close. Each part is a <b>while loop</b>: “keep doing this <i>while</i> it’s not done yet”.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'while: repeat until the condition changes', w: 820, h: 250, frames: [
      { cap: '<code>spinRight(110);</code> starts the car turning. Then the while loop asks: is <code>readDistance() &gt; 80</code>? The sensor sees the far wall (190 cm), so yes — wait 20 ms and ask again.', draw: function (svg) { whileDiagram(svg, 0); } },
      { cap: 'Still turning… 175 cm… 160 cm… each time the answer is “yes, greater than 80”, so the loop keeps going. The motors keep spinning the whole time because nothing has told them to stop.', draw: function (svg) { whileDiagram(svg, 1); } },
      { cap: 'The box comes into view: 64 cm. Is 64 &gt; 80? <b>No</b> — so the loop ends and the program moves on to the next line: <code>stopCar();</code>.', draw: function (svg) { whileDiagram(svg, 2); } }
    ] });
    RL.Code.walk(b, SEEK, [
      { title: 'The plan', html: '<p>Wait for the button → search → approach → stop. Because it’s in loop(), after arriving it waits for the button again, so you can move the target and go again.</p>' },
      { lines: [K.line(SEEK, /SEE_CM = 80/), K.line(SEEK, /STOP_CM = 12/)], title: 'Two distances', html: '<p><code>SEE_CM</code>: how close something must be to count as the target (the classroom walls are farther than 80 cm, so it ignores them). <code>STOP_CM</code>: where to stop.</p>' },
      { lines: [K.line(SEEK, /1\. search/), K.line(SEEK, /Found something/)], title: 'Search', html: '<p>Start spinning slowly (110 — slower means the sensor gets more pings per degree, so it’s less likely to miss a thin object). The while loop holds the program here until a reading is 80 cm or less.</p><p>The sensor’s beam is a cone, so it notices the <b>edge</b> of the object first. <code>delay(150)</code> keeps the car turning a little longer so it ends up facing nearer the middle. Then stop.</p>' },
      { lines: [K.line(SEEK, /2\. approach/), K.line(SEEK, /Arrived/)], title: 'Approach', html: '<p>Same pattern: drive forward, and stay in the while loop while the target is still farther than 12 cm. The moment it isn’t, the loop ends and the car stops.</p>' }
    ], { name: 'seek_and_stop' });
    UI.html(b, '<h2>Try it</h2><p>Hold MODE. Then drag the target somewhere else — behind the car, close, far — and press MODE again.</p>');
    K.sim(b, { title: 'Seek & stop', code: SEEK, name: 'seek_and_stop', key: 'sim-seek', ctx: ctx, runHint: 'click “Hold the MODE button”. Then move the target and press it again.', checkAfter: 300,
      world: { w: 260, h: 240, start: { x: 120, y: 120, h: 0 }, boxes: [{ x: 185, y: 160, w: 22, h: 22, drag: true, label: 'TARGET' }] },
      check: function (w, api) { return arrived(w, api, 20000, 8, 18); } });
    UI.html(b, '<h2>Edge cases</h2><p>Programs usually work for the easy case. Engineers spend most of their time on the hard ones. Try these and fix what breaks:</p><ul><li><b>The target is very close</b> (inside 12 cm) when you press the button.</li><li><b>Nothing is there at all</b>: the car spins forever. Can you make it give up after a full turn? (Hint: count loops.)</li><li><b>The car stops at the edge of the box</b> and drives past it. Real sensors see the edge first. (See the “Aim for the middle” challenge.)</li></ul>');
  } });
  function whileDiagram(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 250, fill: '#070d17' }, svg);
    var codes = ['spinRight(110);', 'while (readDistance() > SEE_CM) {', '  delay(20);', '}', 'stopCar();'];
    codes.forEach(function (c, i) { var on = (k < 2 && (i === 1 || i === 2)) || (k === 2 && i === 4); if (on) S('rect', { x: 26, y: 40 + i * 32, width: 380, height: 28, rx: 4, fill: '#0f2a3a', stroke: CY }, svg); T(svg, 40, 59 + i * 32, c, { 'font-size': 15, fill: on ? '#e6f1fa' : MUT }); });
    var d = [190, 160, 64][k];
    T(svg, 470, 70, 'readDistance()', { fill: MUT, 'font-size': 13 }); T(svg, 470, 110, d + ' cm', { fill: CY, 'font-size': 34, 'font-weight': 700 });
    T(svg, 470, 150, d + ' > 80 ?  ' + (d > 80 ? 'YES → keep looping' : 'NO → leave the loop'), { fill: d > 80 ? GO : SIG, 'font-size': 14 });
    var g = S('g', { transform: 'translate(690 190) scale(2.2) rotate(' + [10, 40, 75][k] + ')' }, svg); RL.Car.art(g);
  }

  steps.push({ id: 'look', title: 'Code it: look around first', stage: '05 Create · 07 Improve', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Spinning right every time is slow if the target is just to the left. The robot has a neck — the servo — so it can <b>look both ways</b> first and turn the quick way.</p>');
    UI.html(b, '<h2>The Servo library</h2><p>A servo turns to an exact angle and holds it. Three lines are all you need: <code>#include &lt;Servo.h&gt;</code>, <code>Servo head;</code> (make a servo called head), <code>head.attach(10);</code> (it’s on pin 10). Then <code>head.write(angle)</code>: <b>90</b> is straight ahead, <b>30</b> looks right, <b>150</b> looks left. It takes time to turn — about 0.3 s for 60° — so wait before you measure.</p>');
    RL.Code.walk(b, LOOK, [
      { title: 'The plan', html: '<p>Look right and measure, look left and measure, then spin toward whichever side is closer. Then search and approach as before.</p>' },
      { lines: K.fn(LOOK, 'lookAt'), title: 'lookAt(angle): a parameter AND an answer', html: '<p>This function takes a parameter (where to look) <b>and</b> returns an answer (the distance there). <code>int right = lookAt(30);</code> turns the head right, waits, measures, and stores the result in <code>right</code>.</p>' },
      { lines: [K.line(LOOK, /int right = lookAt/), K.line(LOOK, /Serial.println\(right\)/)], title: 'Two variables', html: '<p>Now the robot remembers two numbers at once, <code>right</code> and <code>left</code>, and prints them so you can see what it saw.</p>' },
      { lines: [K.line(LOOK, /spin toward/), K.line(LOOK, /spin toward/) + 5], title: 'Compare and choose', html: '<p>Smaller distance = something closer on that side. If left is smaller, spin left; otherwise spin right.</p>' }
    ], { name: 'look_first' });
    K.sim(b, { title: 'Look around first', code: LOOK, name: 'look_first', key: 'sim-look', ctx: ctx, runHint: 'click “Hold the MODE button” and watch the sensor head.', checkAfter: 300,
      world: { w: 260, h: 240, start: { x: 130, y: 130, h: 0 }, boxes: [{ x: 45, y: 90, w: 22, h: 22, drag: true, label: 'TARGET' }] },
      check: function (w, api) { var src = api.editor.value; if (!/head\.write/.test(src)) return { pass: false, msg: 'Use the servo (head.write) to look around.' }; return arrived(w, api, 20000, 8, 18).then(function (r) { if (r.pass) r.msg += ' It turned the quick way.'; return r; }); } });
    UI.callout(b, '', 'Which way is right?', '<p>On ELEGOO’s car, 30° looks right and 150° looks left. If yours is the other way round, your servo arm was attached differently — just swap the numbers.</p>');
  } });

  steps.push({ id: 'arena', title: 'Test in the arena', stage: '06 Test', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Make a test arena: a masking-tape circle about <b>2 m across</b> on the floor, with nothing else inside it within 80 cm of the middle. The robot starts in the middle facing the same way each time. Put the target (a box or a can) at each spot below and run the test.</p>');
    UI.tests(b, ctx, { id: 'arena', rows: [
      'Target <b>straight ahead</b>, 60 cm away.',
      'Target <b>behind</b> the robot, 60 cm away.',
      'Target to the <b>left</b>, 40 cm away.',
      'Target to the <b>right</b>, 70 cm away.',
      'A <b>thin</b> target (a water bottle) 50 cm away.',
      'It stops 10–15 cm from the target every time, without touching it.'
    ] });
    UI.note(b, ctx, { id: 'n-arena', label: 'What failed, why do you think it failed, and what did you change?', placeholder: 'The bottle: it spun right past it. We slowed the spin from 110 to 90 and…', rows: 4 });
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '07 Improve', time: '30 min', render: function (b, ctx) {
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Aim for the middle', html: 'When the sensor first sees the target, it’s seeing its <b>edge</b>. Keep turning until the target disappears again, time how long that took with <code>millis()</code>, then turn back half that time. Now the robot faces the middle.', hint: '<code>unsigned long start = millis();<br>while (readDistance() &lt; SEE_CM) { delay(20); }<br>unsigned long seen = millis() - start;<br>spinLeft(110); delay(seen / 2); stopCar();</code>' },
      { tag: 'Code', title: 'Follow me', html: 'Make the robot keep a distance of 20 cm from your hand: forward if you’re farther than 25 cm, backward if closer than 15 cm, stop in between. Walk it around the room!' },
      { tag: 'Code', title: 'Give up', html: 'Count how many times the search loop runs. If nothing is found after a full turn, stop and flash the LED red.', hint: 'Make a variable <code>int tries = 0;</code> before the loop, add <code>tries++;</code> inside, and add <code>&amp;&amp; tries &lt; 150</code> to the while condition.' },
      { tag: 'Challenge', cls: 'c', title: 'Sumo pusher', html: 'Once it reaches the target, keep driving and push it out of the tape circle (use a light box!). Then back up to the middle.' }
    ]);
    UI.tests(b, ctx, { id: 'tests', rows: [
      'readDistance() gives sensible numbers on the real car.',
      'The robot stops before hitting things (“Don’t crash” works).',
      'Seek & stop finds targets all the way around.',
      'You tested the edge cases and fixed at least one.'
    ] });
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try and how did it go?', placeholder: 'We tried Aim for the middle…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r04 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your robot finding targets. Upload your video and code, answer the questions, then press Submit.', [
      K.videoFile('Under 45 seconds: two runs with the target in different places (one behind the robot). Show where it stops.'),
      K.codeFile('seek_and_stop')
    ], [
      { id: 'r1', q: 'What is a variable? Point to one in your code and explain what it holds and when its value changes.' },
      { id: 'r2', q: 'Explain how your while loops control the search and the approach. What makes each loop stop?' },
      { id: 'r3', q: 'Explain how readDistance() measures distance and returns it. Why does it return 999 sometimes?' },
      { id: 'r4', q: 'Describe an edge case that broke your program and how you fixed it.' }
    ])
  };
})(window);
