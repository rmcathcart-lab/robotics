/* Mission R2: Driving school — the TB6612 motor driver, PWM speed, sequences with delay(), writing move functions,
 * calibrating speed and turning, and driving a square. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb';

  /* ================= code ================= */
  var SETUP_ALL = ['  pinMode(BUTTON, INPUT_PULLUP);'].concat(K.SETUP_MOTORS);
  var FIRST = K.join(['// R2 part 1: first moves'], K.PINS, K.BUTTON_PIN, [
    '',
    'void setup() {'], SETUP_ALL, [
    '',
    '  // wait here until the MODE button is pressed',
    '  while (digitalRead(BUTTON) == HIGH) {',
    '    delay(10);',
    '  }',
    '  delay(500);',
    '',
    '  // 1. forward for 1 second',
    '  digitalWrite(AIN1, HIGH);   // right side: forward',
    '  digitalWrite(BIN1, HIGH);   // left side: forward',
    '  analogWrite(PWMA, 150);     // right side: speed 150',
    '  analogWrite(PWMB, 150);     // left side: speed 150',
    '  delay(1000);',
    '',
    '  // 2. stop for half a second',
    '  analogWrite(PWMA, 0);',
    '  analogWrite(PWMB, 0);',
    '  delay(500);',
    '',
    '  // 3. backward for 1 second',
    '  digitalWrite(AIN1, LOW);    // right side: backward',
    '  digitalWrite(BIN1, LOW);    // left side: backward',
    '  analogWrite(PWMA, 150);',
    '  analogWrite(PWMB, 150);',
    '  delay(1000);',
    '',
    '  // 4. stop',
    '  analogWrite(PWMA, 0);',
    '  analogWrite(PWMB, 0);',
    '}',
    '',
    'void loop() {',
    '  // empty: we only want the moves to happen once',
    '}']);

  var DANCE = K.join(['// R2 part 2: moves as functions'], K.PINS, K.BUTTON_PIN, [
    'const int SPEED = 150;   // one number to change the speed of everything',
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  forward(SPEED);',
    '  delay(1000);',
    '  spinLeft(SPEED);',
    '  delay(600);',
    '  forward(SPEED);',
    '  delay(1000);',
    '  spinRight(SPEED);',
    '  delay(1200);',
    '  backward(SPEED);',
    '  delay(800);',
    '  stopCar();',
    '}',
    '',
    'void loop() {',
    '}',
    ''], K.WAIT_BUTTON, [''], K.MOVES);

  var CALIB = K.join(['// R2 part 3: calibration — how far, how fast, how much turn?'], K.PINS, K.BUTTON_PIN, [
    'const int SPEED = 150;',
    'const int DRIVE_MS = 2000;   // drive for this long, then measure how far it went',
    'const int TURN_MS = 500;     // change this until the car turns exactly 90 degrees',
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  forward(SPEED);       // test 1: distance',
    '  delay(DRIVE_MS);',
    '  stopCar();',
    '  delay(1500);',
    '',
    '  spinRight(SPEED);     // test 2: a 90 degree turn',
    '  delay(TURN_MS);',
    '  stopCar();',
    '}',
    '',
    'void loop() {',
    '}',
    ''], K.WAIT_BUTTON, [''], K.MOVES);

  var SQUARE = K.join(['// R2 part 4: drive a 50 cm square and end where you started'], K.PINS, K.BUTTON_PIN, [
    'const int SPEED = 150;',
    'const int SIDE_MS = 1000;   // TODO: how long to drive 50 cm? (use your calibration)',
    'const int TURN_MS = 500;    // TODO: how long to turn 90 degrees?',
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  // side 1',
    '  forward(SPEED);',
    '  delay(SIDE_MS);',
    '  stopCar();',
    '  delay(300);',
    '  spinRight(SPEED);',
    '  delay(TURN_MS);',
    '  stopCar();',
    '  delay(300);',
    '',
    '  // TODO: sides 2, 3 and 4 (copy side 1 three more times)',
    '}',
    '',
    'void loop() {',
    '}',
    ''], K.WAIT_BUTTON, [''], K.MOVES);
  var SQUARE_SIDE = ['  forward(SPEED);', '  delay(SIDE_MS);', '  stopCar();', '  delay(300);', '  spinRight(SPEED);', '  delay(TURN_MS);', '  stopCar();', '  delay(300);'];

  /* ================= helpers for checks ================= */
  function runPressed(world, api, max) { return K.pressStart(api).then(function () { return K.waitStill(world, api, max || 15000); }); }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r02, {
      lead: '<p class="lead">Before a robot can do anything clever, it has to <b>move exactly how you tell it to</b>. In this mission you’ll take control of the motors yourself: forward, backward, spin, stop.</p>' +
        '<p>You’ll learn how the motor driver works, write your first <b>functions</b> (your own commands like <code>forward()</code> and <code>spinLeft()</code>), then <b>calibrate</b> your robot — measure how fast it really drives and turns — so it can drive a square and end up right where it started.</p>',
      edp: [2, 4, 5, 6, 7],
      demo: { sonar: false, title: 'A 50 cm square', world: { w: 180, h: 140, start: { x: 50, y: 110, h: 0 }, guides: [{ pts: [[50, 110], [50, 60], [100, 60], [100, 110]], closed: true }] },
        cap: 'Forward, stop, turn 90°, four times. Simple — once you know exactly how long “50 cm” and “90°” take for your robot.',
        program: async function (car) { for (var i = 0; i < 4; i++) { car.say('SIDE ' + (i + 1)); await car.drive(150, 150, 1710); await car.stop(300); car.say('TURN 90°'); await car.drive(150, -150, 630); await car.stop(300); } car.say('BACK AT THE START'); } }
    });
    UI.callout(b, 'safety', 'Safety', '<p>Test new code with the <b>wheels off the ground</b> first (car on a box), then on the floor. Every program in this unit waits for the <b>MODE button</b> before it moves — so it can’t drive off a table the moment you switch it on.</p>');
  } });

  steps.push({ id: 'driver', title: 'How the car drives', stage: '02 Research', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The UNO can’t power the motors itself, so it sends instructions to the <b>motor driver</b> chip (the TB6612), which switches the battery power to the motors. The driver has two channels: <b>A</b> drives the two <b>right</b> motors, <b>B</b> drives the two <b>left</b> motors.</p>' +
      '<p>For each side, the UNO sets two things: <b>which way</b> (a direction pin, HIGH or LOW) and <b>how fast</b> (a speed pin, 0 to 255). One more pin, <b>STBY</b> (standby), has to be HIGH or the driver ignores everything.</p>');
    UI.html(b, '<table class="fx-plan"><thead><tr><th>Name in code</th><th>Pin</th><th>What it does</th><th>Write it with</th></tr></thead><tbody>' +
      '<tr><td><code>STBY</code></td><td>3</td><td>HIGH = motors allowed to run</td><td><code>digitalWrite(STBY, HIGH)</code></td></tr>' +
      '<tr><td><code>AIN1</code></td><td>7</td><td>Right side direction: HIGH = forward, LOW = backward</td><td><code>digitalWrite</code></td></tr>' +
      '<tr><td><code>PWMA</code></td><td>5</td><td>Right side speed: 0 (stopped) to 255 (full)</td><td><code>analogWrite</code></td></tr>' +
      '<tr><td><code>BIN1</code></td><td>8</td><td>Left side direction: HIGH = forward, LOW = backward</td><td><code>digitalWrite</code></td></tr>' +
      '<tr><td><code>PWMB</code></td><td>6</td><td>Left side speed: 0 to 255</td><td><code>analogWrite</code></td></tr></tbody></table>');
    UI.html(b, '<h2>Speed with PWM</h2><p><code>digitalWrite</code> can only say ON or OFF. To get “a bit fast” the UNO uses a trick called <b>PWM</b> (pulse-width modulation): it switches the pin on and off about 1000 times a second. <code>analogWrite(PWMA, 64)</code> means “on a quarter of the time”. The motor can’t start and stop that fast, so it just runs at about a quarter of full power. Drag the slider.</p>');
    pwmLab(b);
    UI.numq(b, ctx, { id: 'q-pwm', q: 'About what percentage of full power is <code>analogWrite(PWMB, 191)</code>?', answer: 75, tol: 2, unit: '%', explain: '191 ÷ 255 ≈ 0.75, so the pin is on about 75 % of the time.', hint: 'Divide by 255 (full power), then multiply by 100.' });
    UI.html(b, '<h2>Steering without a steering wheel</h2><p>Your car has no steering wheel. It turns like a tank or a wheelchair: by running the two sides at <b>different speeds</b> or in <b>different directions</b>. This is called <b>differential drive</b>. Watch:</p>');
    K.demo(b, { sonar: false, label: 'Explainer', title: 'Differential drive', world: { w: 200, h: 130, start: { x: 60, y: 90, h: 90 } },
      cap: 'Same speed, same way → straight. Opposite directions → spin on the spot. One side faster → curve toward the slower side.',
      program: async function (car) {
        car.say('L 150 fwd · R 150 fwd → STRAIGHT'); await car.drive(150, 150, 1400); await car.stop(500);
        car.say('L 150 back · R 150 fwd → SPIN LEFT'); await car.drive(-150, 150, 1260); await car.stop(500);
        car.say('L 150 fwd · R 150 back → SPIN RIGHT'); await car.drive(150, -150, 1260); await car.stop(500);
        car.say('L 200 · R 90 → CURVE RIGHT'); await car.drive(200, 90, 2600); await car.stop(500);
        car.say('L 150 back · R 150 back → BACKWARD'); await car.drive(-150, -150, 1200); await car.stop(400); car.say('');
      } });
    UI.mcq(b, ctx, { id: 'q-spin', q: 'To <b>spin right</b> on the spot, the left side should go… and the right side should go…', options: ['Left forward, right forward', 'Left forward, right backward', 'Left backward, right forward', 'Left stopped, right forward'], answer: 1, explain: 'The left side pushes forward and the right side pulls back, so the car rotates clockwise (to the right) around its middle.', hints: { 2: 'That spins it to the left.', 3: 'That would make it pivot left around the stopped wheels.' } });
    UI.mcq(b, ctx, { id: 'q-stby', q: 'Your code sets both direction pins and both speeds, but nothing moves. Which line is probably missing?', options: ['delay(1000);', 'digitalWrite(STBY, HIGH);', 'Serial.begin(9600);', 'analogWrite(STBY, 255);'], answer: 1, explain: 'With STBY LOW the driver is in standby and ignores the other pins.' });
  } });
  function pwmLab(b) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Try it</span><h3>analogWrite → PWM → speed</h3></div>';
    var stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 820 240', role: 'img', 'aria-label': 'A PWM signal and the wheel it drives' }); stage.appendChild(svg); box.appendChild(stage);
    S('rect', { x: 0, y: 0, width: 820, height: 240, fill: '#070d17' }, svg);
    T(svg, 30, 32, 'PIN 5 (PWMA)', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
    var wave = S('path', { d: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
    S('line', { x1: 30, y1: 190, x2: 560, y2: 190, stroke: '#22364f' }, svg); T(svg, 566, 194, '0 V', { fill: MUT, 'font-size': 11 }); T(svg, 566, 64, '5 V', { fill: MUT, 'font-size': 11 });
    var wheel = S('g', { transform: 'translate(700 125)' }, svg);
    S('circle', { r: 70, fill: '#1b1f24', stroke: '#3a414b', 'stroke-width': 4 }, wheel); S('circle', { r: 36, fill: '#f2b705' }, wheel);
    var spokes = S('g', {}, wheel); [0, 60, 120].forEach(function (a) { S('rect', { x: -4, y: -34, width: 8, height: 68, fill: '#b58900', transform: 'rotate(' + a + ')' }, spokes); });
    var lab = T(svg, 700, 228, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 13 });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>analogWrite(PWMA, …)</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 255; r.value = 150; r.setAttribute('aria-label', 'Speed value'); var o = el('b', '', '150');
    row.appendChild(r); row.appendChild(o); var ctl = el('div', 'xp-cap'); ctl.appendChild(row); var note = el('p', 'small muted', ''); ctl.appendChild(note); box.appendChild(ctl);
    b.appendChild(box);
    var v = 150, ang = 0, last = performance.now(), alive = true;
    function draw() {
      var duty = v / 255, d = 'M30 190', per = 106;
      for (var i = 0; i < 5; i++) { var x0 = 30 + i * per, x1 = x0 + per * duty; if (duty > 0) d += ' L' + x0 + ' 60 L' + x1.toFixed(1) + ' 60 L' + x1.toFixed(1) + ' 190'; d += ' L' + (x0 + per) + ' 190'; }
      wave.setAttribute('d', d); o.textContent = v; lab.textContent = Math.round(duty * 100) + '% on';
      note.textContent = v === 0 ? 'Off: the motor is stopped.' : v < 31 ? 'Too little power: a real motor just hums and doesn’t turn (it needs a push to get going). Use at least about 60.' : v === 255 ? 'Always on: full speed.' : 'On ' + Math.round(duty * 100) + '% of the time → about ' + Math.round(duty * 100) + '% of full power.';
    }
    r.addEventListener('input', function () { v = Number(r.value); draw(); });
    draw();
    (function spin(t) { if (!alive || !box.isConnected && t - last > 2000) return; var dt = (t - last) / 1000; last = t; var sp = v < 31 ? 0 : (v - 31) / 224 * 540; ang = (ang + sp * dt) % 360; spokes.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ')'); requestAnimationFrame(spin); })(last);
    if (RL.onLeave) RL.onLeave(function () { alive = false; });
  }

  steps.push({ id: 'first', title: 'Code it: first moves', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your first driving program: wait for the button, drive forward for a second, stop, drive backward for a second, stop. Step through it — every line is explained.</p>');
    RL.Code.walk(b, FIRST, [
      { title: 'The plan', html: '<p>A robot program is a <b>sequence</b>: instructions that run one after another, top to bottom, in exactly the order you wrote them. Here the whole sequence is inside <code>setup()</code>, so it happens <b>once</b>. <code>loop()</code> is left empty.</p>' },
      { lines: [2, 8], title: 'Names for the pins', html: '<p><code>const int PWMA = 5;</code> creates a <b>constant</b>: a name that always means 5. <code>int</code> means it holds a whole number. Using names means the code says <code>analogWrite(PWMA, 150)</code> (“right side speed 150”) instead of <code>analogWrite(5, 150)</code>, which nobody can read.</p>' },
      { lines: [K.line(FIRST, /void setup/) + 1, K.line(FIRST, /void setup/) + 1], title: 'The button is an input', html: '<p><code>pinMode(BUTTON, INPUT_PULLUP)</code> makes pin 2 an <b>input</b> with a built-in “pull-up”: it reads <code>HIGH</code> when the button is <b>not</b> pressed, and <code>LOW</code> while it is pressed.</p>' },
      { lines: [K.line(FIRST, /pinMode\(STBY/), K.line(FIRST, /digitalWrite\(STBY/)], title: 'Motor pins are outputs', html: '<p>The five motor pins are <b>outputs</b> (the UNO sends signals out on them). Then <code>digitalWrite(STBY, HIGH)</code> wakes the driver up.</p>' },
      { lines: [K.line(FIRST, /while \(digitalRead/), K.line(FIRST, /delay\(500\)/)], title: 'Wait for the button', html: '<p>A <code>while</code> loop repeats the code inside its braces <b>as long as</b> its condition is true. Here: “while the button reads HIGH (not pressed), wait 10 ms and check again”. The moment you press it, the condition is false and the program moves on. Then half a second so you can take your hand away.</p><p><code>==</code> (two equals signs) means “is equal to?”. One <code>=</code> means “set to”. Mixing them up is a classic bug.</p>' },
      { lines: [K.line(FIRST, /1\. forward/), K.line(FIRST, /1\. forward/) + 5], title: 'Forward for 1 second', html: '<p>Both direction pins <code>HIGH</code> (forward), both speeds <code>150</code> (about 60 % power). Then <code>delay(1000)</code>: the UNO waits 1000 ms <b>while the motors keep running</b>. The motors don’t stop when the UNO waits — they keep doing whatever they were last told.</p>' },
      { lines: [K.line(FIRST, /2\. stop/), K.line(FIRST, /2\. stop/) + 3], title: 'Stop', html: '<p>Speed 0 on both sides = stop. Without these lines the car would just keep going forever.</p>' },
      { lines: [K.line(FIRST, /3\. backward/), K.line(FIRST, /4\. stop/) + 2], title: 'Backward, then stop', html: '<p>Direction pins <code>LOW</code> = backward. Same speed, same time — so it should end up back where it started. (Does it? Try it!)</p>' },
      { lines: K.fn(FIRST, 'loop'), title: 'An empty loop()', html: '<p>Every sketch needs a <code>loop()</code>, even an empty one. After setup() finishes, the UNO runs this empty loop forever, so the car just sits still.</p>' }
    ], { name: 'first_moves' });
    UI.html(b, '<h2>Try it on the virtual car</h2><p>Click <b>Upload &amp; run</b>. Nothing happens — it’s waiting for the button! Click <b>Hold the MODE button</b>. Watch the car and the trail it leaves. Then make changes and run it again:</p><ul><li>Change the speeds to <code>255</code>. How much farther does it go?</li><li>Make it go forward for <code>2000</code> ms but backward for only <code>1000</code> ms.</li><li>Add a <b>spin</b> at the end: right side forward, left side backward, for 600 ms. Which way does it turn?</li></ul>');
    K.sim(b, { title: 'First moves', code: FIRST, name: 'first_moves', key: 'sim-first', ctx: ctx, runHint: 'it’s waiting — click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 200, h: 120, start: { x: 60, y: 80, h: 90 } },
      check: function (w, api) { return runPressed(w, api, 9000).then(function () { var far = 0, t = w.trail(), s = t[0]; t.forEach(function (p) { far = Math.max(far, Math.hypot(p[0] - s[0], p[1] - s[1])); }); if (far < 15) return { pass: false, msg: 'The car barely moved. Is STBY HIGH, and are both speeds above 60?' }; return { pass: true, msg: 'It drove ' + Math.round(far) + ' cm out and came back. Now try it on the real car.' }; }); } });
    UI.html(b, '<h2>On the real car</h2><p>Upload it and test it <b>on a box first</b> (both sides should spin forward, then backward), then on the floor.</p>');
    K.uploadSteps(b);
    UI.note(b, ctx, { id: 'n-first', label: 'Did the real car end up exactly where it started? If not, where did it end up, and why might that be?', placeholder: 'It ended up 5 cm to the left because…' });
  } });

  steps.push({ id: 'functions', title: 'Code it: your own commands', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Writing four lines every time you want to go forward gets old fast, and it’s easy to get one wrong. Programmers package a job like that into a <b>function</b>: a named block of code you can run any time just by writing its name.</p>');
    UI.html(b, '<h2>Anatomy of a function</h2>');
    RL.Code.block(b, ['void forward(int speed) {', '  digitalWrite(AIN1, HIGH);   // right side: forward', '  analogWrite(PWMA, speed);', '  digitalWrite(BIN1, HIGH);   // left side: forward', '  analogWrite(PWMB, speed);', '}'].join('\n'), { download: false });
    UI.html(b, '<ul><li><code>void</code> — this function does a job but doesn’t give back an answer (“void” = nothing).</li><li><code>forward</code> — its name. Pick names that say what it does.</li><li><code>(int speed)</code> — a <b>parameter</b>: a value you hand the function each time you use it. Inside the function, <code>speed</code> is whatever number you passed in.</li><li><code>{ … }</code> — the code that runs.</li></ul>' +
      '<p>Now <code>forward(150);</code> anywhere in the program runs those four lines with <code>speed</code> = 150, and <code>forward(255);</code> runs them at full speed. That’s called <b>calling</b> the function.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'What happens when you call a function', w: 820, h: 300, frames: [0, 1, 2, 3].map(function (k) {
      return { cap: ['The UNO runs setup() line by line and reaches <code>forward(SPEED);</code>', 'It <b>jumps</b> to the forward() function, with <code>speed</code> = 150…', '…runs its four lines, which set the motor pins…', '…then jumps <b>back</b> to the line after the call and carries on: <code>delay(1000);</code> lets the car drive for a second.'][k], draw: function (svg) { callDiagram(svg, k); } };
    }) });
    UI.html(b, '<h2>The full set of moves</h2><p>Here are five move functions, plus <code>waitForButton()</code> (the button wait from part 1, now with a name). Notice how short and readable <code>setup()</code> becomes — it reads almost like English. The functions go <b>below</b> loop(); the order doesn’t matter to the IDE.</p>');
    RL.Code.walk(b, DANCE, [
      { title: 'The idea', html: '<p>The moves are now commands. <code>setup()</code> is just a list: forward, spin left, forward, spin right, backward, stop. Want a different dance? Change the list, not the motor code.</p>' },
      { lines: [K.line(DANCE, /const int SPEED/), K.line(DANCE, /const int SPEED/)], title: 'One speed for everything', html: '<p>Every move uses <code>SPEED</code>. Change this one number and the whole program speeds up or slows down.</p>' },
      { lines: [K.line(DANCE, /waitForButton\(\);/), K.line(DANCE, /stopCar\(\);/)], title: 'The sequence', html: '<p>Each move function <b>starts</b> the motors and returns immediately. The <code>delay()</code> after it decides how long that move lasts. So <code>spinLeft(SPEED); delay(600);</code> means “spin left for 0.6 seconds”.</p>' },
      { lines: K.fn(DANCE, 'waitForButton'), title: 'waitForButton()', html: '<p>The button wait from part 1, packaged up. <code>while (digitalRead(BUTTON) == HIGH)</code> keeps checking until the button is pressed.</p>' },
      { lines: K.fn(DANCE, 'forward'), title: 'forward(speed)', html: '<p>Both sides forward at the speed you pass in.</p>' },
      { lines: K.fn(DANCE, 'backward'), title: 'backward(speed)', html: '<p>Both direction pins LOW.</p>' },
      { lines: [K.fn(DANCE, 'spinLeft')[0], K.fn(DANCE, 'spinRight')[1]], title: 'spinLeft() and spinRight()', html: '<p>One side forward, the other backward. Spin left = right side forward, left side backward.</p>' },
      { lines: K.fn(DANCE, 'stopCar'), title: 'stopCar()', html: '<p>Speed 0 on both sides. (We can’t call it <code>stop</code> because that word is already used inside Arduino.)</p>' }
    ], { name: 'robot_dance' });
    UI.html(b, '<h2>Your turn: choreograph a dance</h2><p>Edit <code>setup()</code> to make your own robot dance with <b>at least six moves</b> using all five functions. Try different speeds too: <code>forward(255)</code> or <code>spinLeft(100)</code>. Then hold the MODE button.</p>');
    K.sim(b, { title: 'Robot dance', code: DANCE, name: 'robot_dance', key: 'sim-dance', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 220, h: 150, start: { x: 110, y: 90, h: 0 } },
      check: function (w, api) {
        var src = api.editor.value, body = src.slice(src.indexOf('void setup'), src.indexOf('void loop')), calls = (body.match(/\b(forward|backward|spinLeft|spinRight|stopCar)\s*\(/g) || []), kinds = {};
        calls.forEach(function (c) { kinds[c.replace(/\s*\(/, '')] = 1; });
        if (calls.length < 6) return { pass: false, msg: 'Your setup() has ' + calls.length + ' moves. Make it at least six.' };
        if (Object.keys(kinds).length < 5) return { pass: false, msg: 'Use all five moves (forward, backward, spinLeft, spinRight, stopCar). Missing: ' + ['forward', 'backward', 'spinLeft', 'spinRight', 'stopCar'].filter(function (k) { return !kinds[k]; }).join(', ') + '.' };
        return runPressed(w, api, 20000).then(function () { return w.travelled() > 20 ? { pass: true, msg: 'Nice moves! ' + calls.length + ' moves, ' + Math.round(w.travelled()) + ' cm of dancing.' } : { pass: false, msg: 'The car hardly moved — are the delays long enough?' }; });
      } });
    UI.mcq(b, ctx, { id: 'q-fn', q: 'What does <code>spinRight(200); delay(300);</code> do?', options: ['Spins right forever', 'Spins right at speed 200 for 0.3 seconds, then whatever comes next starts', 'Spins right 300 degrees', 'Waits 300 ms, then spins right'], answer: 1, explain: 'The function starts the spin at speed 200, the delay keeps it going for 300 ms, then the next instruction runs (and should probably be another move or stopCar()).', hints: { 0: 'It would keep spinning if nothing came after… but the next instruction changes the motors.', 2: 'The delay is a time in milliseconds, not an angle. How many degrees you get depends on your robot — that’s the next step!' } });
  } });
  function callDiagram(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 300, fill: '#070d17' }, svg);
    var L = ['void setup() {', '  waitForButton();', '  forward(SPEED);', '  delay(1000);', '  stopCar();', '}'], R = ['void forward(int speed) {', '  digitalWrite(AIN1, HIGH);', '  analogWrite(PWMA, speed);', '  digitalWrite(BIN1, HIGH);', '  analogWrite(PWMB, speed);', '}'];
    function col(x, lines, hl, title) {
      S('rect', { x: x, y: 40, width: 330, height: 220, rx: 10, fill: '#0d1726', stroke: '#22364f' }, svg); T(svg, x + 14, 30, title, { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
      lines.forEach(function (l, i) { var on = hl.indexOf(i) >= 0; if (on) S('rect', { x: x + 6, y: 60 + i * 30, width: 318, height: 26, rx: 4, fill: '#0f2a3a', stroke: CY }, svg); T(svg, x + 16, 78 + i * 30, l, { fill: on ? '#e6f1fa' : MUT, 'font-size': 13 }); });
    }
    col(40, L, k === 0 ? [2] : k === 3 ? [3] : [], 'SETUP()'); col(450, R, k === 1 ? [0] : k === 2 ? [1, 2, 3, 4] : [], 'FORWARD()');
    if (k === 1) { S('path', { d: 'M330 138 C 400 138 380 78 456 78', fill: 'none', stroke: SIG, 'stroke-width': 3 }, svg); T(svg, 392, 100, 'speed = 150', { fill: SIG, 'font-size': 12, 'text-anchor': 'middle' }); }
    if (k === 3) S('path', { d: 'M456 228 C 380 228 400 168 330 168', fill: 'none', stroke: SIG, 'stroke-width': 3 }, svg);
    if (k === 2) T(svg, 615, 282, 'motors now running at 150', { fill: CY, 'font-size': 12, 'text-anchor': 'middle' });
  }

  steps.push({ id: 'calibrate', title: 'Calibrate your robot', stage: '06 Test', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your program can only say “drive for 1000 milliseconds”. But you want to say “drive 50 cm” and “turn 90°”. To translate, you need to <b>measure your robot</b>: how many centimetres does it cover per second, and how long does a 90° turn take? That’s called <b>calibration</b>, and real engineers do it for every robot, because no two are exactly alike.</p>');
    UI.html(b, '<h2>Practise on the virtual car</h2><p>This sketch drives forward for <code>DRIVE_MS</code> (2 seconds), stops, then spins right for <code>TURN_MS</code>. The grid squares on the floor are <b>10 cm</b> (the darker lines every 50 cm).</p><ol><li>Run it and measure how far the car drove using the grid.</li><li>Change <code>TURN_MS</code> and run it again until the turn is <b>exactly 90°</b> (the car ends up facing right).</li></ol>');
    K.sim(b, { title: 'Calibration', code: CALIB, name: 'calibration', key: 'sim-calib', ctx: ctx, runHint: 'click “Hold the MODE button”, then measure with the grid.', checkAfter: 300,
      world: { w: 160, h: 120, start: { x: 40, y: 105, h: 0 } },
      check: function (w, api) {
        return runPressed(w, api, 9000).then(function () { var h = w.pose().h, err = Math.abs(((h - 90) % 360 + 540) % 360 - 180); return err < 6 ? { pass: true, msg: 'Spot on: the car turned ' + Math.round(h) + '°. Write down your TURN_MS.' } : { pass: false, msg: 'The car turned about ' + Math.round(h) + '°. ' + (h < 90 || h > 270 ? 'Make TURN_MS bigger.' : 'Make TURN_MS smaller.') }; });
      } });
    UI.numq(b, ctx, { id: 'q-vdist', q: 'On the virtual car: how far did it drive in 2 seconds at speed 150, to the nearest 5 cm?', answer: 58, tol: 6, unit: 'cm', explain: 'About 58 cm, so the virtual car drives about 29 cm per second at speed 150.', hint: 'Count the 10 cm squares between where it started and where it stopped.' });
    UI.numq(b, ctx, { id: 'q-vturn', q: 'What TURN_MS gave you a 90° turn on the virtual car?', answer: 630, tol: 35, unit: 'ms', explain: 'About 630 ms. Your real car will be different — the floor, the battery and the motors all change it.', hint: 'Try 600, then adjust in steps of 20.' });
    UI.html(b, '<h2>Now measure the real robot</h2><ol><li>Put a strip of masking tape on the floor as a start line. Line up the back of the wheels with it.</li><li>Upload the calibration sketch. Press MODE. When it stops, measure from the start line to the back of the wheels with a tape measure.</li><li>Do it <b>three times</b> and take the average. Divide by 2 (seconds) to get <b>cm per second</b>.</li><li>Adjust <code>TURN_MS</code> until the turn is 90°. Tip: put a strip of tape along the side of the car before the turn, and check it ends up at right angles.</li></ol>');
    UI.note(b, ctx, { id: 'n-calib', label: 'Calibration log (real robot, speed 150): three distances in 2 s, the average, cm per second, and your 90° TURN_MS.', placeholder: 'Run 1: 61 cm, run 2: 59 cm, run 3: 63 cm → average 61 cm → 30.5 cm/s\nTURN_MS for 90°: 540', rows: 4 });
    UI.numq(b, ctx, { id: 'q-time', q: 'A robot drives 30 cm per second. How many milliseconds should it drive to go <b>50 cm</b>?', answer: 1667, tol: 15, unit: 'ms', explain: '50 ÷ 30 = 1.667 seconds = <b>1667 ms</b>. Time = distance ÷ speed, then × 1000 to get milliseconds.', hint: 'Time in seconds = distance ÷ speed. Then multiply by 1000.' });
    UI.callout(b, '', 'Why do the runs come out different?', '<p>Battery level (a fuller battery = faster), the floor (carpet vs tile), wheels slipping when they start, and the motors themselves. That’s why you measure several times and average. It’s also why you should <b>re-check your numbers</b> if the battery gets low or you move to a different floor.</p>');
  } });

  steps.push({ id: 'square', title: 'Challenge: drive a square', stage: '05 Create · 06 Test', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Put four strips of masking tape on the floor in a <b>50 cm × 50 cm square</b>. Your robot starts at one corner, drives around the square and stops back at the start corner, facing the same way.</p>');
    UI.html(b, '<p>The starter code does side 1. Use your calibration to set <code>SIDE_MS</code> and <code>TURN_MS</code>, then add sides 2, 3 and 4 (copy and paste is fine — in the next mission you’ll learn a better way). The dashed square shows where it should go.</p>');
    K.sim(b, { title: 'Drive a square', code: SQUARE, name: 'square', key: 'sim-square', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 160, h: 140, start: { x: 40, y: 115, h: 0 }, guides: [{ pts: [[40, 115], [40, 65], [90, 65], [90, 115]], closed: true }] },
      check: function (w, api) {
        return runPressed(w, api, 25000).then(function () {
          var t = w.trail(), s = t[0], p = w.pose(), back = Math.hypot(p.x - s[0], p.y - s[1]), far = 0; t.forEach(function (q) { far = Math.max(far, Math.hypot(q[0] - s[0], q[1] - s[1])); });
          var herr = Math.abs(((p.h - 0) % 360 + 540) % 360 - 180);
          if (w.travelled() < 150) return { pass: false, msg: 'The car only drove ' + Math.round(w.travelled()) + ' cm. A full 50 cm square is 200 cm — did you add all four sides?' };
          if (far < 55 || far > 85) return { pass: false, msg: 'The square came out the wrong size (its far corner was ' + Math.round(far) + ' cm from the start; it should be about 71). Check SIDE_MS.' };
          if (back > 12) return { pass: false, msg: 'Close! It finished ' + Math.round(back) + ' cm from the start. Fine-tune TURN_MS (a few ms at a time) and SIDE_MS.' };
          return { pass: true, msg: 'Square! It finished ' + Math.round(back) + ' cm from the start, facing ' + Math.round(herr) + '° off. Now the real thing.' };
        });
      } });
    var hint = el('details', ''); hint.innerHTML = '<summary>Show one side (if you’re stuck)</summary>'; RL.Code.block(hint, SQUARE_SIDE.join('\n'), { download: false }); b.appendChild(hint);
    UI.html(b, '<h2>On the real floor</h2><p>Upload it and run it at least three times. After each run, measure how far from the start corner it stopped. Change one number at a time and run it again.</p>');
    UI.note(b, ctx, { id: 'n-square', label: 'Square log: for each test, write SIDE_MS, TURN_MS and how far from the start it finished.', placeholder: 'Test 1: 1670 / 540 → 18 cm off (turns too small)\nTest 2: 1670 / 560 → 6 cm off', rows: 5 });
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '30 min', render: function (b, ctx) {
    UI.tests(b, ctx, { id: 'tests', rows: [
      'The program waits for the MODE button before moving.',
      'All five move functions work on the real car (forward, backward, spin left, spin right, stop).',
      'The square ends within 10 cm of the start corner.',
      'Same result three runs in a row (within a few centimetres).',
      'Every function and constant has a comment explaining it.'
    ] });
    UI.challenges(b, [
      { tag: 'Geometry', cls: 'c', title: 'Triangle & hexagon', html: 'Make the robot drive an equilateral triangle (turns of 120°) and a hexagon (turns of 60°). Work out the TURN_MS from your 90° time.', hint: 'If 90° takes 560 ms, 1° takes 560 ÷ 90 ms.' },
      { tag: 'Code', title: 'Curves', html: 'Write <code>curveRight(int speed)</code> where the left side goes faster than the right. Use it to drive a circle — then a figure 8.' },
      { tag: 'Test', title: 'Speed vs accuracy', html: 'Drive the square at speed 100 and at speed 220 (re-calibrate each time). Which is more accurate, and why?' },
      { tag: 'Code', cls: 'c', title: 'Light it up', html: 'Add the colour LED from R1: green while driving, red while turning.', hint: 'Copy <code>#include &lt;FastLED.h&gt;</code>, <code>CRGB leds[1];</code> and the two FastLED lines in setup() from your first program.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What made the biggest difference to your square’s accuracy?', placeholder: 'Fully charging the battery…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r02 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your robot driving its square. Upload your video and code, answer the questions, then press Submit.', [
      K.videoFile('Under 30 seconds, filmed from above if you can: the robot drives the 50 cm tape square and stops at the start corner.'),
      K.codeFile('square')
    ], [
      { id: 'r1', q: 'Explain how the motor driver makes the car go forward at about half speed. Name the pins and what you write to each one.' },
      { id: 'r2', q: 'What is a function? Use one of your move functions as an example and explain what its parameter does.' },
      { id: 'r3', q: 'Show your calibration: your measurements, your cm per second, and how you worked out SIDE_MS for a 50 cm side.' },
      { id: 'r4', q: 'Why doesn’t the robot drive exactly the same distance every time? What did you do to make the square more accurate?' }
    ])
  };
})(window);
