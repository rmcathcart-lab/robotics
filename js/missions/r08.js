/* Mission R8: Robot challenge — choose (or invent) a challenge, plan it with success criteria, a flowchart and
 * pseudocode, build it in milestones with a toolbox of everything from R1–R7, debug systematically, and demo it. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb', GO = '#4ade80';

  /* ================= the challenges ================= */
  var CARDS = [
    { id: 'sumo', title: 'Sumo bot', level: 3, tag: 'Sensors · decisions',
      goal: 'Push a box (or another team’s robot!) out of a ring of black tape — without ever leaving the ring yourself.',
      setup: 'A circle of black tape about 1 m across on a light floor. A light box as the opponent.',
      success: ['Finds the opponent from anywhere in the ring', 'Pushes it completely out', 'Never drives over the edge (backs up and turns when a line sensor sees black)'],
      uses: ['R4 seek & stop', 'R6 line sensors', 'R7 state machine'],
      start: 'Get the edge-detection working first: drive forward, and back up + turn whenever any line sensor sees black. Then add searching.',
      hint: 'Two states work well: SEARCHING (spin slowly, watching the sonar) and ATTACKING (full speed ahead). The edge check comes first in every loop, in every state.' },
    { id: 'delivery', title: 'Delivery bot', level: 3, tag: 'Line following · remote',
      goal: 'Follow a tape route with several stations. Press a number on the remote to pick a station; the robot drives there, stops, flashes, and waits to be sent back.',
      setup: 'A tape line with short cross-strips as stations (all three sensors see black at a strip).',
      success: ['Follows the route smoothly', 'Counts stations and stops at the one chosen with the remote', 'Comes back to the start when told to'],
      uses: ['R5 remote', 'R6 line follower', 'variables that count'],
      start: 'Make the line follower stop at the first cross-strip. Then count strips with a variable.',
      hint: 'Count a strip only when the sensors go from “not all black” to “all black” — otherwise one strip counts many times.' },
    { id: 'dance', title: 'Dance & light show', level: 2, tag: 'Arrays · timing',
      goal: 'Choreograph a 30–60 second routine to a song: moves, spins, head nods with the servo, and LED colours that change with the beat.',
      setup: 'A clear floor space about 1.5 m square and a speaker.',
      success: ['At least 8 different moves', 'Moves and colours stay in time with the music', 'The routine is stored in arrays, not a long list of copy-pasted code'],
      uses: ['R2 functions', 'R7 arrays & for loops', 'FastLED'],
      start: 'Measure the song’s beat (count beats in 15 s, ×4 = beats per minute). One beat in ms = 60000 ÷ BPM.',
      hint: 'Store the routine as arrays: <code>int moves[] = {1, 1, 3, 2, …};</code> and <code>int beats[] = {2, 2, 4, …};</code> then a for loop plays it.' },
    { id: 'parking', title: 'Parking pro', level: 3, tag: 'Sonar · precision',
      goal: 'Drive along a row of “parked cars” (boxes), find a gap big enough, and park in it neatly — like a self-parking car.',
      setup: 'Boxes in a row with one gap about 40 cm wide. A wall or tape line as the kerb.',
      success: ['Measures the gap with the sideways-looking sensor', 'Only parks in a gap that is big enough', 'Ends up inside the gap without touching anything'],
      uses: ['R3 driveCm / turnDeg', 'R4 servo + sonar', 'millis()'],
      start: 'Point the sensor sideways and drive slowly along the boxes, printing the distance. Watch the numbers jump when you pass the gap.',
      hint: 'Time how long the side distance stays big: gap length = time × speed (CM_PER_SEC).' },
    { id: 'guard', title: 'Guard bot', level: 2, tag: 'Sensors · states',
      goal: 'Guard a treasure. The robot sweeps its sensor head back and forth; when something comes closer than 40 cm it turns to face it, flashes red and beeps — until you disarm it with the remote.',
      setup: 'A “treasure” (any small object) behind the robot.',
      success: ['Sweeps smoothly and keeps watching', 'Turns to face an intruder and raises the alarm', 'Arm / disarm with the remote (LED green = armed, blue = off)'],
      uses: ['R4 servo + sonar', 'R5 remote', 'R7 state machine'],
      start: 'Make the head sweep from 20° to 160° and back, measuring at each step. Print the closest distance.',
      hint: 'States: DISARMED, WATCHING, ALARM. A for loop that moves the head 10° at a time makes a smooth sweep.' },
    { id: 'art', title: 'Art bot', level: 2, tag: 'Geometry · loops',
      goal: 'Tape a marker to the back of the car and make it draw on paper: a star, a spiral, a flower or your initials.',
      setup: 'Big paper (taped down) and a washable marker held by a clothes peg or tape so it just touches the paper.',
      success: ['Draws a recognisable picture', 'Uses loops for repeated parts (petals, star points)', 'Uses at least one variable that changes (a spiral that grows)'],
      uses: ['R3 driveCm / turnDeg & loops', 'maths in code'],
      start: 'Draw a square with a for loop. Then a star (5 points, turn 144° each time).',
      hint: 'A spiral: <code>for (int i = 1; i &lt;= 20; i++) { driveCm(i * 2); turnDeg(30); }</code>' },
    { id: 'rescue', title: 'Rescue bot', level: 4, tag: 'Everything',
      goal: 'Search an area bounded by tape for a “person to rescue” (a can or small box), then push it to the safe zone (a patch of black tape).',
      setup: 'A rectangle of tape about 1.5 × 1 m. The can somewhere inside; a black safe zone in one corner.',
      success: ['Stays inside the area', 'Finds the can wherever it is put', 'Delivers it to the safe zone and stops'],
      uses: ['R4 seek', 'R6 line sensors', 'R7 states'],
      start: 'Start with search-and-push (R4) and the boundary check (R6). Then work out how to steer to the zone.',
      hint: 'Simplify: always start in the same place and corner, so you know which way the safe zone is.' },
    { id: 'own', title: 'Invent your own', level: 0, tag: 'Your idea',
      goal: 'Have a better idea? Design your own challenge. It must use at least two sensors and a decision the robot makes on its own.',
      setup: 'You decide — and write it down.',
      success: ['Write 3 success criteria that someone else could check', 'Uses at least two of: sonar, line sensors, remote, servo, LED', 'Agree it with your teacher before you start'],
      uses: ['your choice'],
      start: 'Describe it in one sentence: “Our robot will … when …”.',
      hint: 'Keep it small enough to finish in 3 days, with an “extra” version if you finish early.' }
  ];

  /* ================= code ================= */
  var TOOLBOX = K.join(['// R8 TOOLBOX: everything from R1–R7, ready to use. Write your program in loop() (and add states/functions).',
    '#include <Servo.h>', '#include <FastLED.h>', '#include <IRremote.hpp>'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int LINE_L = A2;   // line sensors',
    'const int LINE_M = A1;',
    'const int LINE_R = A0;',
    'const int LED_PIN = 4;',
    'const int IR_PIN = 9;',
    '',
    '// ---- settings (use YOUR calibration) ----',
    'const int SPEED = 150;',
    'const float CM_PER_SEC = 29.3;',
    'const float MS_PER_DEGREE = 7.0;',
    'const int THRESHOLD = 450;   // line sensors: above this = black',
    '',
    'Servo head;',
    'CRGB leds[1];',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  pinMode(BUTTON, INPUT_PULLUP);',
    '  pinMode(TRIG, OUTPUT);',
    '  pinMode(ECHO, INPUT);'], K.SETUP_MOTORS, [
    '  head.attach(10);',
    '  head.write(90);',
    '  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);',
    '  FastLED.setBrightness(40);',
    '  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);',
    '  showColour(CRGB::Blue);',
    '  waitForButton();',
    '}',
    '',
    'void loop() {',
    '  // ---- your program goes here. This example: drive until something is close, then turn away ----',
    '  if (readDistance() < 25) {',
    '    showColour(CRGB::Red);',
    '    turnDeg(90);',
    '  } else {',
    '    showColour(CRGB::Green);',
    '    drive(SPEED, SPEED);',
    '  }',
    '}',
    '',
    '// =================== TOOLBOX FUNCTIONS ===================',
    '',
    '// each side\'s speed from -255 (full backward) to 255 (full forward)',
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
    '}',
    '',
    'void stopCar() {',
    '  drive(0, 0);',
    '}',
    '',
    '// drives a distance in cm (negative = backward), then stops',
    'void driveCm(float cm) {',
    '  if (cm > 0) {',
    '    drive(SPEED, SPEED);',
    '  } else {',
    '    drive(-SPEED, -SPEED);',
    '  }',
    '  delay(abs(cm) / CM_PER_SEC * 1000);',
    '  stopCar();',
    '  delay(200);',
    '}',
    '',
    '// turns on the spot: positive = right, negative = left',
    'void turnDeg(float degrees) {',
    '  if (degrees > 0) {',
    '    drive(SPEED, -SPEED);',
    '  } else {',
    '    drive(-SPEED, SPEED);',
    '  }',
    '  delay(abs(degrees) * MS_PER_DEGREE);',
    '  stopCar();',
    '  delay(200);',
    '}',
    ''], K.READ_DIST, ['',
    '// turns the sensor head (10 = right, 90 = ahead, 170 = left) and measures',
    'int lookAt(int angle) {',
    '  head.write(angle);',
    '  delay(300);',
    '  return readDistance();',
    '}',
    '',
    '// true if that line sensor (LINE_L, LINE_M or LINE_R) sees black tape',
    'bool onBlack(int sensor) {',
    '  return analogRead(sensor) > THRESHOLD;',
    '}',
    '',
    '// sets the LED, e.g. showColour(CRGB::Purple);',
    'void showColour(CRGB colour) {',
    '  leds[0] = colour;',
    '  FastLED.show();',
    '}',
    '',
    '// returns the code of a remote key that was just pressed, or -1 if none (codes: see R5)',
    'int readKey() {',
    '  if (!IrReceiver.decode()) {',
    '    return -1;',
    '  }',
    '  int code = IrReceiver.decodedIRData.command;',
    '  IrReceiver.resume();',
    '  return code;',
    '}',
    ''], K.WAIT_BUTTON);

  var BUGGY = K.join(['// R8 bug hunt: this SHOULD drive up to the wall, stop 20 cm away and turn the LED green.',
    '// It has THREE bugs. Find and fix them one at a time.', '#include <FastLED.h>'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int LED_PIN = 4;',
    'const int STOP_CM = 20;',
    '',
    'CRGB leds[1];',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  pinMode(BUTTON, INPUT_PULLUP);',
    '  pinMode(TRIG, INPUT);',
    '  pinMode(ECHO, INPUT);'], K.SETUP_MOTORS, [
    '  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);',
    '  FastLED.setBrightness(40);',
    '}',
    '',
    'void loop() {',
    '  waitForButton();',
    '  leds[0] = CRGB::Blue;',
    '  FastLED.show();',
    '  forward(140);',
    '  while (readDistance() < STOP_CM) {',
    '    delay(20);',
    '  }',
    '  stopCar();',
    '  leds[0] = CRGB::Green',
    '  FastLED.show();',
    '}',
    ''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r08, {
      lead: '<p class="lead">This is the big one. You know how to make the robot move, measure, see lines, take orders from a remote, decide, remember and follow an algorithm. Now <b>you</b> choose what it does.</p>' +
        '<p>Pick a challenge (or invent your own), plan it like an engineer, build it one working piece at a time, hunt down the bugs, and show it off on <b>demo day</b>.</p>',
      edp: [1, 3, 4, 5, 6, 7],
      demo: { title: 'Guard bot (one of the challenges)', world: { w: 240, h: 160, start: { x: 120, y: 95, h: 0 }, boxes: [{ x: 40, y: 20, w: 18, h: 18, label: 'INTRUDER' }] },
        cap: 'Sweep the head back and forth. Something within 40 cm? Turn to face it and raise the alarm.',
        program: async function (car) {
          car.say('WATCHING'); car.led(0, 255, 0);
          for (var k = 0; k < 2; k++) for (var a = 20; a <= 160; a += 10) { await car.servo(k ? 180 - a : a, 70); }
          car.say('WATCHING'); var found = -1;
          for (a = 160; a >= 20; a -= 10) { await car.servo(a, 90); if (car.dist() < 60) { found = a; break; } }
          if (found < 0) found = 140;
          car.say('INTRUDER! turning to face it'); car.led(255, 0, 0);
          await car.servo(90, 100); await car.drive(-150, 150, (found - 90) * 7); await car.stop(100);
          for (var i = 0; i < 6; i++) { car.led(i % 2 ? 255 : 40, 0, 0); await car.wait(250); }
          car.say('ALARM!'); await car.wait(1200);
        } }
    });
    UI.html(b, '<h2>The plan for the week</h2><table class="fx-plan"><thead><tr><th>Day</th><th>What you’ll do</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>Choose a challenge, write success criteria, draw a flowchart, write pseudocode.</td></tr>' +
      '<tr><td>2–3</td><td>Coding sprints: build it one milestone at a time, test, debug, log.</td></tr>' +
      '<tr><td>4</td><td>Finish, polish and rehearse. Film your best run.</td></tr>' +
      '<tr><td>5</td><td>Demo day! Then reflect, restore the factory program and pack the kit.</td></tr></tbody></table>');
  } });

  steps.push({ id: 'choose', title: 'Choose your challenge', stage: '01 Ask · 03 Imagine', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Read all the cards with your team. Pick one that excites you <i>and</i> that you can finish. The stars show how hard it is.</p>');
    var saved = ctx.check('challenge'), sel = saved && saved.id;
    var grid = el('div', 'r8-cards'), detail = el('div', 'r8-detail'); b.appendChild(grid); b.appendChild(detail);
    function show(c) {
      sel = c.id; grid.querySelectorAll('.r8-card').forEach(function (x) { x.classList.toggle('sel', x.dataset.id === c.id); });
      detail.innerHTML = '<div class="r8-d-h"><span class="label">' + esc(c.tag) + '</span><h3>' + esc(c.title) + '</h3></div>' +
        '<p><b>Goal.</b> ' + c.goal + '</p><p><b>Set-up.</b> ' + c.setup + '</p>' +
        '<p><b>Success looks like:</b></p><ul>' + c.success.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
        '<p><b>Uses:</b> ' + c.uses.join(' · ') + '</p>' +
        '<p><b>Start here.</b> ' + c.start + '</p><details><summary>Hint</summary><p>' + c.hint + '</p></details>';
      var pick = el('button', 'btn', saved && saved.id === c.id ? 'Chosen ✓' : 'Choose this challenge'); pick.type = 'button';
      pick.addEventListener('click', function () { saved = { id: c.id, title: c.title }; ctx.check('challenge', saved); pick.textContent = 'Chosen ✓'; grid.querySelectorAll('.r8-card').forEach(function (x) { x.classList.toggle('chosen', x.dataset.id === c.id); }); });
      detail.appendChild(pick);
    }
    CARDS.forEach(function (c) {
      var card = el('button', 'r8-card' + (saved && saved.id === c.id ? ' chosen' : '')); card.type = 'button'; card.dataset.id = c.id;
      card.innerHTML = '<span class="r8-stars">' + (c.level ? '★★★★'.slice(0, c.level) + '<i>' + '★★★★'.slice(c.level) + '</i>' : '✎') + '</span><b>' + esc(c.title) + '</b><span class="small">' + esc(c.tag) + '</span>';
      card.addEventListener('click', function () { show(c); }); grid.appendChild(card);
    });
    show(CARDS.filter(function (c) { return c.id === sel; })[0] || CARDS[0]);
    UI.note(b, ctx, { id: 'n-choice', label: 'Our challenge, in one sentence: “Our robot will … when …”. Why did you pick it?', placeholder: 'Our robot will guard the treasure and flash red when anyone comes within 40 cm…' });
  } });

  steps.push({ id: 'plan', title: 'Plan it', stage: '04 Plan', time: '50 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Engineers plan before they build. Three tools: <b>success criteria</b> (how you’ll know it works), a <b>flowchart</b> (a picture of the program’s decisions) and <b>pseudocode</b> (the algorithm in plain words).</p>' +
      '<h2>1 · Success criteria</h2><p>Write 3 to 5 things that someone else could <b>check</b>. “It works well” can’t be checked. “It stops within 5 cm of the target, 4 times out of 5” can.</p>');
    UI.note(b, ctx, { id: 'n-criteria', label: 'Our success criteria', placeholder: '1. Finds the box from any starting direction\n2. Pushes it out of the ring in under 30 s\n3. Never drives over the edge', rows: 5 });
    UI.html(b, '<h2>2 · Flowchart</h2><p>A flowchart shows the steps and decisions with shapes and arrows. Follow the arrows with your finger: if you can trace what the robot will do in every situation, your plan is complete.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Reading a flowchart', w: 820, h: 420, frames: [
      { cap: 'Four shapes. <b>Rounded</b>: start or end. <b>Rectangle</b>: do something. <b>Diamond</b>: a yes/no question (an <code>if</code>). <b>Arrows</b>: what happens next. An arrow that goes back up is a loop.', draw: function (svg) { flow(svg, 0); } },
      { cap: 'The Guard bot as a flowchart. Each diamond becomes an <code>if</code>; the arrow back to “Sweep and measure” is <code>loop()</code> repeating.', draw: function (svg) { flow(svg, 1); } },
      { cap: 'Turned into code, every shape has a matching line. Draw your own flowchart on paper first — you’ll photograph it for your evidence.', draw: function (svg) { flow(svg, 2); } }
    ] });
    UI.html(b, '<h2>3 · Pseudocode and milestones</h2><p>Write your algorithm in plain words. Then split the job into <b>milestones</b>: small versions that each work on their own, smallest first. If time runs out, you still have something that works.</p>' +
      '<table class="fx-plan"><thead><tr><th>Milestone</th><th>Example (Sumo bot)</th></tr></thead><tbody>' +
      '<tr><td>1 · The core</td><td>Drives forward; backs up and turns when it reaches the edge.</td></tr>' +
      '<tr><td>2 · The main trick</td><td>Spins until it sees the box, then charges.</td></tr>' +
      '<tr><td>3 · Make it reliable</td><td>Tuned speeds and thresholds; works from any start.</td></tr>' +
      '<tr><td>4 · Extras</td><td>LED colours for each state; remote start; a victory dance.</td></tr></tbody></table>');
    UI.note(b, ctx, { id: 'n-pseudo', label: 'Our pseudocode', placeholder: 'repeat forever:\n    if any line sensor sees black:\n        back up and turn\n    otherwise if the box is closer than 50 cm:\n        charge\n    otherwise:\n        spin slowly', rows: 8 });
    UI.note(b, ctx, { id: 'n-milestones', label: 'Our milestones (and who does what)', placeholder: '1. Edge detection — Sam codes, Lee builds the ring\n2. …', rows: 5 });
  } });
  function box(svg, kind, x, y, w, h, label, hi) {
    var st = { fill: hi ? '#0e2433' : '#0e1a2a', stroke: hi ? CY : '#4b6680', 'stroke-width': hi ? 3 : 2 };
    if (kind === 'term') S('rect', Object.assign({ x: x - w / 2, y: y - h / 2, width: w, height: h, rx: h / 2 }, st), svg);
    else if (kind === 'do') S('rect', Object.assign({ x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4 }, st), svg);
    else S('polygon', Object.assign({ points: [x, y - h / 2, x + w / 2, y, x, y + h / 2, x - w / 2, y].join(' ') }, st), svg);
    String(label).split('\n').forEach(function (ln, i, a) { T(svg, x, y + 4 + (i - (a.length - 1) / 2) * 15, ln, { 'text-anchor': 'middle', 'font-size': 12 }); });
  }
  function arr(svg, pts, label, lx, ly) {
    S('polyline', { points: pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: MUT, 'stroke-width': 2, 'marker-end': 'url(#r8arr)' }, svg);
    if (label) T(svg, lx, ly, label, { fill: SIG, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
  }
  function flow(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 420, fill: '#070d17' }, svg);
    var defs = S('defs', {}, svg), mk = S('marker', { id: 'r8arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); S('path', { d: 'M0,0 L10,5 L0,10 z', fill: MUT }, mk);
    if (k === 0) {
      box(svg, 'term', 140, 120, 160, 46, 'Start / End'); T(svg, 140, 175, 'rounded', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      box(svg, 'do', 340, 120, 160, 50, 'Do something'); T(svg, 340, 175, 'rectangle: an action', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      box(svg, 'ask', 560, 120, 190, 90, 'A question?'); T(svg, 560, 185, 'diamond: yes / no (an if)', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      arr(svg, [[100, 290], [300, 290]]); T(svg, 200, 320, 'arrow: then…', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      box(svg, 'do', 560, 300, 150, 44, 'Do it again'); arr(svg, [[635, 300], [690, 300], [690, 240], [560, 240], [560, 276]]); T(svg, 600, 350, 'an arrow back up = a loop', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 });
      return;
    }
    var hi = k === 2;
    box(svg, 'term', 160, 40, 150, 40, 'Start'); arr(svg, [[160, 60], [160, 88]]);
    box(svg, 'do', 160, 112, 210, 48, 'Sweep the head\nand measure'); arr(svg, [[160, 136], [160, 168]]);
    box(svg, 'ask', 160, 220, 230, 100, 'Something closer\nthan 40 cm?'); arr(svg, [[45, 220], [20, 220], [20, 112], [55, 112]], 'NO', 32, 210);
    arr(svg, [[160, 270], [160, 300]], 'YES', 182, 290);
    box(svg, 'do', 160, 330, 230, 50, 'Turn to face it\nFlash red, beep'); arr(svg, [[275, 330], [310, 330], [310, 112], [265, 112]]);
    if (k === 2) {
      var code = ['void loop() {', '  int closest = sweep();      // Sweep and measure', '  if (closest < 40) {          // the diamond', '    faceIntruder();           // Turn to face it', '    alarm();                  // Flash red, beep', '  }', '}                             // back to the top'];
      S('rect', { x: 360, y: 70, width: 440, height: 200, rx: 8, fill: '#0b1422', stroke: CY, 'stroke-width': 1 }, svg);
      code.forEach(function (ln, i) { T(svg, 378, 102 + i * 24, ln, { 'font-size': 13, style: 'white-space: pre', fill: i === 2 ? SIG : '#e6f1fa' }); });
    } else {
      T(svg, 560, 140, 'Start at the top.', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 });
      T(svg, 560, 165, 'At the diamond, follow YES or NO.', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 });
      T(svg, 560, 190, 'Both paths lead back to the sweep:', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 });
      T(svg, 560, 215, 'the robot keeps guarding forever.', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 });
    }
  }

  steps.push({ id: 'toolbox', title: 'Your toolbox & playground', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Don’t start from a blank page. This <b>toolbox</b> sketch has everything set up — motors, sensors, servo, LED and remote — and a ready-made function for each job. Copy it, delete the example in <code>loop()</code>, and build your program on top.</p>');
    UI.html(b, '<table class="fx-plan"><thead><tr><th>Function</th><th>What it does</th><th>From</th></tr></thead><tbody>' +
      '<tr><td><code>drive(left, right)</code></td><td>Each side’s speed, −255 to 255. <code>drive(150, 150)</code> forward, <code>drive(-120, 120)</code> spin left.</td><td>R6</td></tr>' +
      '<tr><td><code>stopCar()</code></td><td>Stops both sides.</td><td>R2</td></tr>' +
      '<tr><td><code>driveCm(cm)</code> · <code>turnDeg(deg)</code></td><td>Move a distance / turn an angle, then stop. Needs your calibration.</td><td>R3</td></tr>' +
      '<tr><td><code>readDistance()</code></td><td>Distance ahead of the sensor in cm (999 = nothing).</td><td>R4</td></tr>' +
      '<tr><td><code>lookAt(angle)</code></td><td>Turn the sensor head and measure. 10 right, 90 ahead, 170 left.</td><td>R4, R7</td></tr>' +
      '<tr><td><code>onBlack(LINE_L)</code></td><td>True if that line sensor sees black tape.</td><td>R6</td></tr>' +
      '<tr><td><code>showColour(CRGB::Red)</code></td><td>Sets the LED colour.</td><td>R5</td></tr>' +
      '<tr><td><code>readKey()</code></td><td>The code of a remote key just pressed, or −1.</td><td>R5</td></tr>' +
      '<tr><td><code>waitForButton()</code></td><td>Waits for the MODE button.</td><td>R2</td></tr>' +
      '<tr><td><code>millis()</code></td><td>Milliseconds since switch-on: time things without stopping.</td><td>R5, R7</td></tr></tbody></table>');
    UI.html(b, '<h2>The playground</h2><p>A virtual floor with a ring of tape, boxes and a can you can drag around (Shift-drag the car to turn it). Use it to try ideas before you test on the real car. The remote works too.</p>');
    K.sim(b, { title: 'Playground', code: TOOLBOX, name: 'my_challenge', key: 'sim-play', ctx: ctx, runHint: 'click “Hold the MODE button”. Drag the boxes into its way.', stack: true, remote: true,
      world: { w: 280, h: 200, start: { x: 140, y: 100, h: 0 }, lines: [{ pts: ring(140, 100, 70, 36), closed: true }], boxes: [{ x: 210, y: 30, w: 20, h: 20, drag: true, label: 'BOX' }, { x: 30, y: 150, w: 26, h: 18, drag: true, label: 'BOX' }], cans: [{ x: 60, y: 45, r: 6, drag: true, label: 'CAN' }] } });
    UI.callout(b, '', 'Save often', '<p>Download your .ino after every milestone (<b>Download .ino</b> here, or File → Save As in the Arduino IDE with a new name: <i>sumo_v1</i>, <i>sumo_v2</i>…). If a change breaks everything, you can go back.</p>');
  } });
  function ring(cx, cy, r, n) { var p = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; p.push([Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10]); } return p; }

  steps.push({ id: 'debug', title: 'Debug like a pro', stage: '06 Test · 07 Improve', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Every programmer writes bugs — even professionals. What makes a pro is having a <b>method</b> for finding them, instead of changing random things and hoping.</p>' +
      '<h2>The debugging method</h2><ol class="r8-steps">' +
      '<li><b>Reproduce it.</b> Make the bug happen again on purpose. When exactly does it go wrong?</li>' +
      '<li><b>Read the error.</b> If it won’t upload, read the first red error message and look at the line it names (and the line just before it).</li>' +
      '<li><b>Make it talk.</b> Add <code>Serial.println</code> lines to print sensor values and which part of the code is running. Is the robot seeing what you think it sees?</li>' +
      '<li><b>Isolate it.</b> Test one part on its own: just the sensor, just the turn. Comment out the rest with <code>//</code>.</li>' +
      '<li><b>Change one thing at a time</b>, test, and write down what happened.</li>' +
      '<li><b>Check the hardware</b> too: charged battery? Upload/Cam switch on Upload? Wires pushed in? Wheels rubbing?</li></ol>');
    UI.html(b, '<table class="fx-plan"><thead><tr><th>Symptom</th><th>Likely cause</th></tr></thead><tbody>' +
      '<tr><td>Upload fails</td><td>Wrong board or port, Upload/Cam switch on Cam, a missing <code>;</code> or <code>}</code>.</td></tr>' +
      '<tr><td>Does nothing at all</td><td>Waiting for the MODE button; battery off or flat; STBY not set HIGH.</td></tr>' +
      '<tr><td>Distance always 999 or 0</td><td><code>pinMode(TRIG, OUTPUT)</code> missing; sensor cable loose.</td></tr>' +
      '<tr><td>Turns the wrong way</td><td>Left and right swapped (in your code or the motor wires).</td></tr>' +
      '<tr><td>Works on the desk, not on the floor</td><td>Battery low under load; floor too shiny for the line sensors; threshold needs re-calibrating.</td></tr>' +
      '<tr><td>An if never happens</td><td><code>=</code> instead of <code>==</code>; <code>&lt;</code> and <code>&gt;</code> mixed up; the value is never in that range (print it!).</td></tr></tbody></table>');
    UI.html(b, '<h2>Bug hunt</h2><p>This program should drive up to the box, stop 20 cm away and turn the LED green. It has <b>three</b> bugs. Use the method: run it, read any error, add Serial prints, fix one bug at a time.</p>');
    K.sim(b, { title: 'Bug hunt', code: BUGGY, name: 'bug_hunt', key: 'sim-bugs', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 220, h: 90, start: { x: 35, y: 45, h: 90 }, boxes: [{ x: 160, y: 20, w: 20, h: 50, label: 'BOX' }] },
      check: function (w, api) {
        return K.pressStart(api).then(function () { return K.waitStill(w, api, 12000, 1500); }).then(function () {
          var d = w.distTo(w.cfg.boxes[0]), led = w.led(), green = led && led.g > 150 && led.r < 80;
          if (w.bumps()) return { pass: false, msg: 'It crashed into the box. Is it measuring the distance? Print readDistance() to find out.' };
          if (w.travelled() < 20) return { pass: false, msg: 'It stopped straight away. Look at the while loop’s condition: when should it keep driving?' };
          if (d < 14 || d > 27) return { pass: false, msg: 'It stopped ' + Math.round(d) + ' cm from the box. Aim for about 20.' };
          return green ? { pass: true, msg: 'All three bugs fixed: stopped ' + Math.round(d) + ' cm from the box with the LED green.' } : { pass: false, msg: 'It stopped in the right place, but the LED isn’t green.' };
        });
      } });
    UI.html(b, '<details class="r8-spoil"><summary>Stuck? The three bugs</summary><ol><li>A missing <code>;</code> after <code>leds[0] = CRGB::Green</code> — here the error names that line, but the real Arduino IDE often points at the line <i>after</i> it, so always check the line before too.</li><li><code>pinMode(TRIG, INPUT)</code> should be <code>OUTPUT</code>: the sensor never pings, so every reading is 999.</li><li><code>while (readDistance() &lt; STOP_CM)</code> should be <code>&gt;</code>: keep driving <i>while</i> the box is farther than 20 cm.</li></ol></details>');
  } });

  steps.push({ id: 'sprints', title: 'Coding sprints', stage: '05 Create · 06 Test · 07 Improve', time: '2–3 classes', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now build it. Work in short <b>sprints</b>: pick the next milestone, code it, test it on the real car, write down what happened, repeat.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'One sprint', w: 820, h: 240, frames: [
      { cap: '<b>Plan</b> the next small step (one milestone). <b>Code</b> it — just that. <b>Test</b> it on the floor. <b>Log</b> what happened. Then go round again.', draw: function (svg) { cycle(svg, -1); } },
      { cap: 'Test <b>early and often</b>. Ten small tests find bugs faster than one big test at the end, because you know the bug is in the few lines you just changed.', draw: function (svg) { cycle(svg, 2); } },
      { cap: 'The log is your memory. When something stops working tomorrow, it tells you what you changed today.', draw: function (svg) { cycle(svg, 3); } }
    ] });
    UI.tests(b, ctx, { id: 'milestones', rows: ['Milestone 1 works on the real car.', 'Milestone 2 works on the real car.', 'Milestone 3 works on the real car.', 'All success criteria tested at least 3 times each.', 'Code tidied: clear names, comments, no leftover junk.'] });
    UI.note(b, ctx, { id: 'n-sprint1', label: 'Sprint log — day 2: what we built, what we tested, what went wrong, what we changed.', placeholder: 'Built edge detection. Test: backed up at the edge 5/5. Problem: turned too far → MS_PER_DEGREE 7.0 → 6.5…', rows: 5 });
    UI.note(b, ctx, { id: 'n-sprint2', label: 'Sprint log — day 3', placeholder: 'Added searching. Test: found the box 3/5 times. The sonar missed it when…', rows: 5 });
    UI.note(b, ctx, { id: 'n-sprint3', label: 'Sprint log — day 4 (polish & rehearse)', placeholder: 'Added LED colours for each state. Filmed best run…', rows: 4 });
  } });
  function cycle(svg, hi) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 240, fill: '#070d17' }, svg);
    var defs = S('defs', {}, svg), mk = S('marker', { id: 'r8arr2', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs); S('path', { d: 'M0,0 L10,5 L0,10 z', fill: MUT }, mk);
    var N = ['PLAN', 'CODE', 'TEST', 'LOG'], X = [130, 320, 510, 700];
    N.forEach(function (n, i) {
      S('rect', { x: X[i] - 70, y: 80, width: 140, height: 56, rx: 28, fill: '#0e1a2a', stroke: hi === i || hi === -1 ? CY : '#4b6680', 'stroke-width': hi === i ? 4 : 2 }, svg);
      T(svg, X[i], 114, n, { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700 });
      if (i < 3) S('line', { x1: X[i] + 72, y1: 108, x2: X[i + 1] - 74, y2: 108, stroke: MUT, 'stroke-width': 2, 'marker-end': 'url(#r8arr2)' }, svg);
    });
    S('path', { d: 'M700,138 C700,210 130,210 130,140', fill: 'none', stroke: MUT, 'stroke-width': 2, 'marker-end': 'url(#r8arr2)' }, svg);
    T(svg, 415, 200, 'next milestone', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
    T(svg, 415, 45, ['', '', 'Small change → quick test → you know where the bug is', 'Write it down every time'][hi + 1] || '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 13 });
  }

  steps.push({ id: 'demo', title: 'Demo day', stage: '06 Test · 08 Share', time: '1 class', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Show the class what your robot can do. Each team gets about 3 minutes.</p>' +
      '<h2>Your 3 minutes</h2><ol class="r8-steps"><li><b>The challenge</b> (20 s): what your robot will do, and your success criteria.</li><li><b>The run</b> (1 min): let it do its thing. If it fails, you get one restart — say what you think went wrong.</li><li><b>Under the hood</b> (1 min): show the flowchart or one clever part of your code, and explain it.</li><li><b>The story</b> (30 s): your toughest bug and how you found it.</li></ol>');
    UI.tests(b, ctx, { id: 'ready', rows: ['Battery charged (and a spare if possible).', 'The final code is uploaded and the Upload/Cam switch is back on Cam (or the car just runs).', 'The course / props are set up and tested in the demo room.', 'Everyone in the team knows their part of the talk.', 'Best run filmed (in case the demo goes wrong!).'] });
    UI.note(b, ctx, { id: 'n-feedback', label: 'Feedback: one thing another team did really well, and one idea you’d borrow.', placeholder: 'Team 4’s guard bot used a for loop to sweep smoothly…', rows: 3 });
  } });

  steps.push({ id: 'wrap', title: 'Wrap up & pack the kit', stage: '07 Improve · 08 Share', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before the kit goes back: put the factory program back on, check every part is there, and think about how far you’ve come.</p>' +
      '<h2>Restore the factory program</h2><p>Your programs replaced the one the car came with. Put it back so the next class can do the R1 test drive:</p><ol class="r8-steps">' +
      '<li>In the ELEGOO files for the kit, open the factory program folder (<b>SmartRobotCarV4.0_V1_…</b>) and double-click the <b>.ino</b> file inside it. The IDE opens it with several tabs.</li>' +
      '<li>Set the Upload/Cam switch to <b>Upload</b>, plug in the USB cable, choose <b>Arduino Uno</b> and the port, and click <b>Upload</b>.</li>' +
      '<li>If it complains about a missing library, ask your teacher: the libraries are in the same ELEGOO download.</li>' +
      '<li>Switch back to <b>Cam</b>, unplug, switch on, and check the remote drives it.</li></ol>');
    UI.tests(b, ctx, { id: 'pack', rows: ['Factory program back on and tested with the remote', 'Battery switched off (and charged, if your teacher asks)', 'Remote, USB cable and charger in the box', 'Line sensor, sonar and servo all firmly attached', 'Tape and cardboard from your course tidied away'] });
    UI.note(b, ctx, { id: 'n-reflect', label: 'Look back: what could you do at the end of this unit that you couldn’t at the start? What are you most proud of?', placeholder: 'At the start I had never written code. Now I can…', rows: 4 });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r08 = {
    steps: steps,
    evidence: K.evidence('Hand in your challenge: your plan, the video of your best run, your code and your reflection. Then press Submit.', [
      K.photoFile('Your plan', 'A photo of your flowchart (and anything else from your planning).', 3),
      K.videoFile('Under 90 seconds: your robot completing the challenge. Say what it’s doing as it goes, or add captions.'),
      K.codeFile('my_challenge')
    ], [
      { id: 'r1', q: 'What was your challenge, and what were your success criteria? Which ones did your robot meet on demo day?' },
      { id: 'r2', q: 'Explain how your program works. Use your flowchart, and name the coding ideas you used (variables, if/else, loops, functions, arrays, states, millis…).' },
      { id: 'r3', q: 'Describe your hardest bug: what happened, how you tracked it down, and how you fixed it.' },
      { id: 'r4', q: 'What two improvements did you make because of testing? What would you add with one more week?' }
    ])
  };
})(window);
