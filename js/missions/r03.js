/* Mission R3: Spell your name — decomposition, functions with parameters (driveCm, turnDeg), maths in code, one
 * function per letter, for loops; planned on grid paper with an interactive letter planner. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb';
  var VCM = 29.25, VMSD = 7.0; // the virtual car at speed 150: cm per second, ms per degree

  /* ================= code ================= */
  var SETUP_ALL = ['  pinMode(BUTTON, INPUT_PULLUP);'].concat(K.SETUP_MOTORS);
  var CAL = [
    'const int SPEED = 150;',
    'const float CM_PER_SEC = 29.3;    // from your calibration in R2 (this is the virtual car)',
    'const float MS_PER_DEGREE = 7.0;  // your 90-degree TURN_MS divided by 90'];
  var MOVE_FNS = [
    '// drives a distance in cm (a negative distance drives backward)',
    'void driveCm(float cm) {',
    '  if (cm > 0) {',
    '    forward(SPEED);',
    '  } else {',
    '    backward(SPEED);',
    '  }',
    '  float ms = abs(cm) / CM_PER_SEC * 1000;   // time = distance / speed',
    '  delay(ms);',
    '  stopCar();',
    '  delay(250);   // a short pause so the car settles',
    '}',
    '',
    '// turns on the spot: positive = right (clockwise), negative = left',
    'void turnDeg(float degrees) {',
    '  if (degrees > 0) {',
    '    spinRight(SPEED);',
    '  } else {',
    '    spinLeft(SPEED);',
    '  }',
    '  delay(abs(degrees) * MS_PER_DEGREE);',
    '  stopCar();',
    '  delay(250);',
    '}'];
  var TAIL = function () { return [''].concat(MOVE_FNS, [''], K.WAIT_BUTTON, [''], K.MOVES); };
  var DRIVE = K.join(['// R3 part 1: move in centimetres and degrees'], K.PINS, K.BUTTON_PIN, CAL, [
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  driveCm(50);     // forward 50 cm',
    '  turnDeg(90);     // turn right 90 degrees',
    '  driveCm(30);',
    '  turnDeg(-90);    // turn left 90 degrees',
    '  driveCm(-20);    // backward 20 cm',
    '}',
    '',
    'void loop() {',
    '}'], TAIL());
  var LETTERS = [
    '// ---- letters: 40 cm tall, 20 cm wide ----',
    '// each one starts at its bottom-left corner facing up',
    '// and ends at its bottom-right corner facing up',
    '',
    'void letterL() {',
    '  driveCm(40);     // up the stem...',
    '  driveCm(-40);    // ...and back down it',
    '  turnDeg(90);',
    '  driveCm(20);     // along the bottom',
    '  turnDeg(-90);    // face up again',
    '}',
    '',
    'void letterI() {',
    '  driveCm(40);',
    '  driveCm(-40);',
    '}',
    '',
    'void letterH() {',
    '  driveCm(40);     // left side, all the way up',
    '  driveCm(-20);    // back down to the middle',
    '  turnDeg(90);',
    '  driveCm(20);     // the bar across',
    '  turnDeg(-90);',
    '  driveCm(20);     // right side: up to the top',
    '  driveCm(-40);    // and all the way down',
    '}',
    '',
    '// moves 10 cm along the bottom to the start of the next letter',
    'void space() {',
    '  turnDeg(90);',
    '  driveCm(10);',
    '  turnDeg(-90);',
    '}'];
  var NAME = K.join(['// R3 part 2: spell a name, one function per letter'], K.PINS, K.BUTTON_PIN, CAL, [
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  letterH();',
    '  space();',
    '  letterI();',
    '}',
    '',
    'void loop() {',
    '}',
    ''], LETTERS, TAIL());
  var LOOPS = K.join(['// R3 part 3: for loops'], K.PINS, K.BUTTON_PIN, CAL, [
    '',
    'void setup() {'], SETUP_ALL, [
    '  waitForButton();',
    '',
    '  // a square: the same two moves, 4 times',
    '  for (int i = 0; i < 4; i++) {',
    '    driveCm(30);',
    '    turnDeg(90);',
    '  }',
    '}',
    '',
    'void loop() {',
    '}'], TAIL());

  /* the scripted demo: "HI" */
  function demoMoves(car) {
    var D = function (cm) { return car.drive(cm > 0 ? 150 : -150, cm > 0 ? 150 : -150, Math.abs(cm) / VCM * 1000).then(function () { return car.stop(250); }); };
    var R = function (d) { return car.drive(d > 0 ? 150 : -150, d > 0 ? -150 : 150, Math.abs(d) * VMSD).then(function () { return car.stop(250); }); };
    return { D: D, R: R };
  }

  /* ================= the letter planner ================= */
  function planner(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Tool</span><h3>Robot letter planner</h3></div>';
    var body = el('div', 'r3-plan'); box.appendChild(body);
    var svg = S('svg', { viewBox: '0 0 260 400', role: 'img', 'aria-label': 'Letter grid' }), side = el('div', 'r3-plan-side');
    body.appendChild(svg); body.appendChild(side); b.appendChild(box);
    var X0 = 50, Y0 = 360, U = 6.5; // 1 cm = 6.5 px; grid 0–20 cm × 0–40 cm, dots every 10 cm (5 cm for in-between)
    var saved = ctx.check('planner') || {}, pts = saved.pts || [[0, 0]];
    function sx(x) { return X0 + x * U; } function sy(y) { return Y0 - y * U; }
    S('rect', { x: 0, y: 0, width: 260, height: 400, fill: '#070d17' }, svg);
    for (var gx = 0; gx <= 20; gx += 5) S('line', { x1: sx(gx), y1: sy(0), x2: sx(gx), y2: sy(40), stroke: gx % 10 ? '#16243a' : '#22364f' }, svg);
    for (var gy = 0; gy <= 40; gy += 5) S('line', { x1: sx(0), y1: sy(gy), x2: sx(20), y2: sy(gy), stroke: gy % 10 ? '#16243a' : '#22364f' }, svg);
    T(svg, sx(10), 386, '20 cm wide', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11 }); T(svg, 22, sy(20), '40 cm', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, transform: 'rotate(-90 22 ' + sy(20) + ')' });
    var path = S('polyline', { points: '', fill: 'none', stroke: SIG, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    var nums = S('g', {}, svg), dots = S('g', {}, svg), robot = S('path', { d: '', fill: CY }, svg);
    for (var x = 0; x <= 20; x += 5) for (var y = 0; y <= 40; y += 5) (function (x, y) {
      var c = S('circle', { cx: sx(x), cy: sy(y), r: x % 10 || y % 10 ? 3 : 5, fill: x % 10 || y % 10 ? '#2b4565' : '#4b6f96', 'class': 'r3-dot', tabindex: 0, role: 'button', 'aria-label': 'Point ' + x + ', ' + y }, dots);
      c.addEventListener('click', function () { add([x, y]); });
    })(x, y);
    var codeBox = el('pre', 'r3-plan-code'), tools = el('div', 'car-tools');
    var undo = el('button', 'btn btn-ghost btn-small', 'Undo'), clr = el('button', 'btn btn-ghost btn-small', 'Clear'), cp = el('button', 'btn btn-ghost btn-small', 'Copy code');
    [undo, clr, cp].forEach(function (q) { q.type = 'button'; tools.appendChild(q); });
    side.innerHTML = '<p class="small">Click dots to draw a letter as one continuous path (the robot can’t lift its pen, but it <b>can</b> drive backward over a line it already drew). It starts at the bottom-left corner, facing up. Try to finish at the <b>bottom-right</b> corner so the next letter can start there.</p>';
    side.appendChild(tools); side.appendChild(codeBox);
    var nameIn = el('input'); nameIn.type = 'text'; nameIn.maxLength = 12; nameIn.placeholder = 'letter name, e.g. N'; nameIn.value = saved.name || ''; nameIn.setAttribute('aria-label', 'Letter name');
    var nr = el('div', 'slider-row'); nr.innerHTML = '<label>Function name: letter…</label>'; nr.appendChild(nameIn); side.insertBefore(nr, tools);
    function code() {
      var h = 0, out = [], nm = (nameIn.value || 'X').replace(/[^A-Za-z0-9_]/g, '') || 'X';
      out.push('void letter' + nm + '() {');
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], q = pts[i], dx = q[0] - a[0], dy = q[1] - a[1], d = Math.round(Math.hypot(dx, dy) * 10) / 10, ang = Math.atan2(dx, dy) * 180 / Math.PI, turn = ((ang - h) % 360 + 540) % 360 - 180;
        if (Math.abs(Math.abs(turn) - 180) < 0.5) { out.push('  driveCm(' + (-d) + ');'); continue; }
        if (Math.abs(turn) > 0.5) { out.push('  turnDeg(' + Math.round(turn * 10) / 10 + ');'); h = ang; }
        out.push('  driveCm(' + d + ');');
      }
      var back = ((0 - h) % 360 + 540) % 360 - 180; if (Math.abs(back) > 0.5) out.push('  turnDeg(' + Math.round(back * 10) / 10 + ');   // face up again');
      var end = pts[pts.length - 1]; if (pts.length > 1 && (end[0] !== 20 || end[1] !== 0)) out.push('  // (ends at ' + end[0] + ', ' + end[1] + ' — not the bottom-right corner)');
      out.push('}'); return out.join('\n');
    }
    function draw() {
      path.setAttribute('points', pts.map(function (p) { return sx(p[0]) + ',' + sy(p[1]); }).join(' '));
      while (nums.lastChild) nums.removeChild(nums.lastChild);
      pts.forEach(function (p, i) { if (i) T(nums, sx(p[0]) + 8, sy(p[1]) - 6, String(i), { fill: SIG, 'font-size': 11, 'font-weight': 700 }); });
      var e = pts[pts.length - 1], cx = sx(e[0]), cy = sy(e[1]); robot.setAttribute('d', 'M' + cx + ' ' + (cy - 11) + ' L' + (cx + 7) + ' ' + (cy + 6) + ' L' + (cx - 7) + ' ' + (cy + 6) + ' Z');
      codeBox.textContent = code();
      ctx.check('planner', { pts: pts, name: nameIn.value });
    }
    function add(p) { var l = pts[pts.length - 1]; if (l[0] === p[0] && l[1] === p[1]) return; pts.push(p); draw(); }
    undo.addEventListener('click', function () { if (pts.length > 1) pts.pop(); draw(); });
    clr.addEventListener('click', function () { pts = [[0, 0]]; draw(); });
    cp.addEventListener('click', function () { RL.Code.copy(code(), cp); });
    nameIn.addEventListener('input', draw);
    draw();
  }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r03, {
      lead: '<p class="lead">Your robot is going to write. You’ll program it to drive the shapes of the letters of your name across the floor — each letter 40 cm tall — and film it from above (or tape a marker to it and let it draw on paper).</p>' +
        '<p>A whole name is too big to code in one go, so you’ll do what programmers always do: <b>break it into smaller problems</b>. First two commands that move in centimetres and degrees, then one function per letter, then a program that calls them in order. Along the way you’ll learn <b>parameters</b>, <b>maths in code</b> and <b>for loops</b>.</p>',
      edp: [3, 4, 5, 6, 7],
      demo: { sonar: false, title: 'Spelling “HI”', world: { w: 120, h: 80, start: { x: 30, y: 62, h: 0 }, grid: 10 },
        cap: 'Each letter is a function made of driveCm() and turnDeg() moves. The robot can’t lift its pen, so it drives backward over lines it already drew.',
        program: async function (car) { var m = demoMoves(car), D = m.D, R = m.R; car.say('letterH()'); await D(40); await D(-20); await R(90); await D(20); await R(-90); await D(20); await D(-40); car.say('space()'); await R(90); await D(10); await R(-90); car.say('letterI()'); await D(40); await D(-40); car.say('HI!'); } }
    });
  } });

  steps.push({ id: 'drive', title: 'Code it: centimetres & degrees', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">In Driving school you worked out how many milliseconds “50 cm” takes. Doing that maths for every single line of a letter would be painful. Instead, let the robot do the maths: write two functions that take a <b>distance</b> or an <b>angle</b> and work out the time themselves.</p>');
    UI.html(b, '<h2>Numbers with decimals</h2><p>So far every number has been an <code>int</code> (a whole number). For measurements you need decimals, so these use <code>float</code> (a “floating-point” number, like 29.3). Your calibration from R2 goes into two constants:</p>');
    RL.Code.block(b, CAL.join('\n'), { download: false });
    UI.numq(b, ctx, { id: 'q-msd', q: 'Your 90° turn took <b>540 ms</b>. What should <code>MS_PER_DEGREE</code> be?', answer: 6, tol: 0.01, unit: 'ms', explain: '540 ÷ 90 = 6 ms per degree. So 45° would take 270 ms and 180° would take 1080 ms.', hint: 'Divide the time for 90° by 90.' });
    RL.Code.walk(b, DRIVE, [
      { title: 'The idea', html: '<p>Two new functions: <code>driveCm(50)</code> drives 50 cm, <code>turnDeg(90)</code> turns 90° right. Inside, they use your calibration numbers to work out how long to run the motors. Look at <code>setup()</code>: it reads like directions you’d give a person.</p>' },
      { lines: [K.line(DRIVE, /const int SPEED/), K.line(DRIVE, /MS_PER_DEGREE =/)], title: 'Calibration constants', html: '<p>Put <b>your real robot’s</b> numbers here before you upload. The ones shown are for the virtual car.</p>' },
      { lines: [K.line(DRIVE, /driveCm\(50\)/), K.line(DRIVE, /driveCm\(-20\)/)], title: 'Using them', html: '<p>The value in the brackets is the <b>argument</b>: the actual number you’re handing over. A <b>negative distance</b> drives backward; a <b>negative angle</b> turns left.</p>' },
      { lines: [K.fn(DRIVE, 'driveCm')[0], K.fn(DRIVE, 'driveCm')[0]], title: 'A parameter', html: '<p><code>void driveCm(float cm)</code>: when you call <code>driveCm(50)</code>, a variable called <code>cm</code> is created inside the function holding 50. Call <code>driveCm(-20)</code> and this time <code>cm</code> holds −20. Same code, different number each time.</p>' },
      { lines: [K.fn(DRIVE, 'driveCm')[0] + 1, K.fn(DRIVE, 'driveCm')[0] + 5], title: 'if / else: which way?', html: '<p><code>if (cm &gt; 0)</code> asks a question. If it’s true (the distance is positive) the code in the first braces runs: forward. <code>else</code> (otherwise) the second braces run: backward. Exactly one of them runs, never both.</p>' },
      { lines: [K.fn(DRIVE, 'driveCm')[0] + 6, K.fn(DRIVE, 'driveCm')[0] + 7], title: 'Maths in code', html: '<p><code>abs(cm)</code> is the <b>absolute value</b>: the number without its minus sign (abs(−20) is 20), because time can’t be negative. Then time = distance ÷ speed, and × 1000 turns seconds into milliseconds. <code>/</code> means divide and <code>*</code> means multiply.</p><p>Example: <code>driveCm(50)</code> → 50 ÷ 29.3 × 1000 = 1706 ms.</p>' },
      { lines: [K.fn(DRIVE, 'driveCm')[0] + 8, K.fn(DRIVE, 'driveCm')[1]], title: 'Drive, stop, settle', html: '<p>Wait that long with the motors running, stop, then pause 250 ms so the car stops rolling before the next move. That pause makes letters much neater.</p>' },
      { lines: K.fn(DRIVE, 'turnDeg'), title: 'turnDeg(degrees)', html: '<p>The same pattern for turning. Positive = spin right, negative = spin left, and the time is the angle × your ms per degree.</p>' }
    ], { name: 'drive_cm' });
    UI.html(b, '<h2>Try it</h2><p>Run it (hold the MODE button). Check with the grid that the first move really is 50 cm. Then change <code>setup()</code> to drive a staircase: three steps, each 20 cm up and 20 cm across.</p>');
    K.sim(b, { title: 'Centimetres & degrees', code: DRIVE, name: 'drive_cm', key: 'sim-drive', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 180, h: 130, start: { x: 40, y: 115, h: 0 } },
      check: function (w, api) {
        var src = api.editor.value; if (!/void\s+driveCm\s*\(\s*float/.test(src) || !/void\s+turnDeg\s*\(\s*float/.test(src)) return { pass: false, msg: 'Keep the driveCm(float cm) and turnDeg(float degrees) functions.' };
        return K.pressStart(api).then(function () { return K.waitStill(w, api, 20000); }).then(function () { var t = w.trail(); return t.length > 10 && w.travelled() > 40 ? { pass: true, msg: 'It moves in centimetres and degrees. ' + Math.round(w.travelled()) + ' cm in total.' } : { pass: false, msg: 'The car hardly moved.' }; });
      } });
    UI.mcq(b, ctx, { id: 'q-neg', q: 'Which call drives <b>backward 15 cm</b>?', options: ['driveCm(15);', 'driveCm(-15);', 'turnDeg(-15);', 'backward(15);'], answer: 1, explain: 'A negative distance makes the if choose backward(), and abs() makes the time positive.', hints: { 3: 'backward() takes a <i>speed</i>, not a distance — speed 15 is too slow to even move.' } });
  } });

  steps.push({ id: 'plan', title: 'Plan your letters', stage: '03 Imagine · 04 Plan', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before coding a letter, plan it. Every letter in our “robot font” lives in a box <b>20 cm wide × 40 cm tall</b>. It starts at the <b>bottom-left corner facing up</b> and ends at the <b>bottom-right corner facing up</b>, so the next letter can start right after a 10 cm space.</p>');
    UI.html(b, '<h2>Rules of the robot font</h2><ul><li>The robot can’t lift its pen, so draw each letter in <b>one continuous path</b>.</li><li>It <b>can</b> drive backward over a line it already drew — that’s how <b>L</b> and <b>H</b> work (look at the demo again).</li><li>Straight lines only. Turns of 90° and 45° are easiest; others work too.</li><li>Curvy letters (O, S, C…) become boxy: O is a rectangle, S is a zigzag.</li></ul>');
    planner(b, ctx);
    UI.html(b, '<h2>Plan on grid paper</h2><p>Use the planner or grid paper (one square = 5 cm). For each letter in your name, draw the path, number the moves, and write the list of <code>driveCm()</code> and <code>turnDeg()</code> calls next to it. Long name? Do your initials, or a nickname of at least three letters.</p>');
    UI.callout(b, '', 'Diagonals', '<p>For a diagonal across a 20 × 40 box (like the middle of an <b>N</b>), the angle isn’t 45°: the planner works it out for you (about 26.6°, and the line is about 44.7 cm long — Pythagoras!).</p>');
    UI.note(b, ctx, { id: 'n-plan', label: 'Your name (or initials) and the plan for each letter: its moves in order.', placeholder: 'N: driveCm(40), turnDeg(153.4), driveCm(44.7), turnDeg(-153.4), driveCm(40), driveCm(-40)', rows: 6 });
    UI.mcq(b, ctx, { id: 'q-plan', q: 'Why should every letter start at its bottom-left and end at its bottom-right, facing up?', options: ['It looks nicer', 'So the letter functions can be joined in any order with space() between them', 'The robot can only drive up', 'To save battery'], answer: 1, explain: 'When every letter starts and ends the same way, they snap together like Lego: letterR(); space(); letterO(); … works for any name.' });
  } });

  steps.push({ id: 'letters', title: 'Code it: one function per letter', stage: '05 Create', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now each letter becomes its own function. This program spells <b>HI</b>. Read how <code>letterH()</code> follows the plan, then replace the letters with your own name.</p>');
    RL.Code.walk(b, NAME, [
      { title: 'Breaking it down', html: '<p><b>Decomposition</b> means splitting a big problem into small ones you can solve one at a time: “spell a name” → “draw each letter” → “drive each line”. Each level is a function that uses the level below.</p>' },
      { lines: [K.line(NAME, /letterH\(\);/), K.line(NAME, /letterI\(\);/)], title: 'The top level', html: '<p><code>setup()</code> only says <i>what</i> to draw. To spell <b>LIL</b> you’d write <code>letterL(); space(); letterI(); space(); letterL();</code> — and <code>letterL()</code> only has to be written once.</p>' },
      { lines: K.fn(NAME, 'letterL'), title: 'letterL()', html: '<p>Up the stem and back down, turn right, along the bottom, turn left to face up again. It ends at the bottom-right, facing up, like every letter should.</p>' },
      { lines: K.fn(NAME, 'letterH'), title: 'letterH()', html: '<p>Follow it with your finger on the grid: up 40, back down 20 (to the middle), right 20 (the bar), up 20, back down 40.</p>' },
      { lines: K.fn(NAME, 'space'), title: 'space()', html: '<p>The gap between letters is a function too. Want letters farther apart? Change one number.</p>' }
    ], { name: 'spell_name' });
    UI.html(b, '<h2>Your turn: your name</h2><p>Add a function for every letter of your name (paste them from the planner), then change <code>setup()</code> to call them in order. Test each new letter on its own first.</p>');
    K.sim(b, { stack: true, title: 'Spell your name', code: NAME, name: 'spell_name', key: 'sim-name', ctx: ctx, runHint: 'click “Hold the MODE button” and watch the trail.', checkAfter: 300,
      world: { w: 300, h: 80, start: { x: 25, y: 65, h: 0 } },
      check: function (w, api) {
        var src = api.editor.value, defs = (src.match(/void\s+letter\w+\s*\(\s*\)/g) || []).length, body = src.slice(src.indexOf('void setup'), src.indexOf('void loop')), calls = (body.match(/letter\w+\s*\(\s*\)/g) || []).length;
        if (defs < 3) return { pass: false, msg: 'You have ' + defs + ' letter functions. Write one for each letter of your name (at least three).' };
        if (calls < 3) return { pass: false, msg: 'setup() only calls ' + calls + ' letters. Call your letter functions in order, with space() between them.' };
        return K.pressStart(api).then(function () { return K.waitStill(w, api, 90000, 1500); }).then(function () { return w.travelled() > 150 ? { pass: true, msg: calls + ' letters, ' + Math.round(w.travelled()) + ' cm of driving. Check the trail: can you read it?' } : { pass: false, msg: 'Only ' + Math.round(w.travelled()) + ' cm of driving — did every letter run?' }; });
      } });
  } });

  steps.push({ id: 'loops', title: 'Code it: for loops', stage: '05 Create', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Some shapes repeat the same moves again and again — a square is “drive, turn” four times. Instead of copying lines, use a <b>for loop</b>: code that runs a set number of times.</p>');
    RL.Code.block(b, ['for (int i = 0; i < 4; i++) {', '  driveCm(30);', '  turnDeg(90);', '}'].join('\n'), { download: false });
    UI.explainer(b, { label: 'Explainer', title: 'How a for loop counts', w: 820, h: 260, frames: [0, 1, 2, 3, 4, 5].map(function (k) {
      return { cap: ['<code>int i = 0</code> — make a counter called <b>i</b> and start it at 0.', '<code>i &lt; 4</code>? 0 is less than 4, so run the code inside: drive, turn. Then <code>i++</code> adds 1: i is now 1.', '1 &lt; 4 → run it again. i becomes 2.', '2 &lt; 4 → again. i becomes 3.', '3 &lt; 4 → again (the 4th time). i becomes 4.', '4 &lt; 4? <b>No</b> — so the loop ends and the program carries on after the closing brace. The code ran exactly 4 times: i was 0, 1, 2, 3.'][k], draw: function (svg) { loopDiagram(svg, k); } };
    }) });
    UI.mcq(b, ctx, { id: 'q-for', q: 'How many times does the code inside <code>for (int i = 0; i &lt; 6; i++)</code> run?', options: ['5', '6', '7', 'Forever'], answer: 1, explain: 'i takes the values 0, 1, 2, 3, 4, 5 — six times. When i reaches 6, 6 &lt; 6 is false and the loop stops.' });
    UI.html(b, '<h2>Your turn: shapes with loops</h2><p>Change the loop to draw these (one at a time):</p><ol><li>A <b>hexagon</b>: 6 sides of 25 cm, turning 60° each time.</li><li>A <b>star</b>: 5 lines of 50 cm, turning <b>144°</b> each time.</li><li>A <b>zigzag</b> (like the middle of a W): repeat “turn right 45°, drive 20, turn left 90°, drive 20, turn right 45°” 3 times.</li></ol>');
    K.sim(b, { title: 'Loops', code: LOOPS, name: 'loops', key: 'sim-loops', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 200, h: 160, start: { x: 70, y: 140, h: 0 } },
      check: function (w, api) {
        var src = api.editor.value; if (!/for\s*\(\s*int\s+\w+\s*=\s*0\s*;/.test(src)) return { pass: false, msg: 'Use a for loop: for (int i = 0; i < 5; i++) { … }' };
        var n = (/for\s*\([^;]*;\s*\w+\s*<\s*(\d+)/.exec(src) || [])[1], ang = (/turnDeg\(\s*(-?\d+(\.\d+)?)\s*\)/.exec(src.slice(src.indexOf('for'))) || [])[1];
        if (n !== '5' || Number(ang) !== 144) return { pass: false, msg: 'Now make the star: 5 times, driveCm(50) and turnDeg(144). (Your loop runs ' + (n || '?') + ' times with a ' + (ang || '?') + '° turn.)' };
        return K.pressStart(api).then(function () { return K.waitStill(w, api, 30000, 1500); }).then(function () { var p = w.pose(), s = w.trail()[0], d = Math.hypot(p.x - s[0], p.y - s[1]); return d < 15 ? { pass: true, msg: 'A star! It closed up within ' + Math.round(d) + ' cm.' } : { pass: false, msg: 'The star didn’t close (ended ' + Math.round(d) + ' cm from the start). Check the angle and the number of points.' }; });
      } });
    UI.html(b, '<p>Now look at your name code: is there a letter that repeats moves (M, W, E)? Can a loop make it shorter?</p>');
  } });
  function loopDiagram(svg, k) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 260, fill: '#070d17' }, svg);
    var i = Math.min(4, Math.max(0, k - 1)), run = k >= 1 && k <= 4;
    T(svg, 40, 50, 'for (int i = 0; i < 4; i++) {', { 'font-size': 16, fill: '#e6f1fa' }); T(svg, 70, 80, 'driveCm(30);', { 'font-size': 16, fill: run ? CY : MUT }); T(svg, 70, 108, 'turnDeg(90);', { 'font-size': 16, fill: run ? CY : MUT }); T(svg, 40, 136, '}', { 'font-size': 16 });
    S('rect', { x: 470, y: 30, width: 130, height: 90, rx: 10, fill: '#0d1726', stroke: CY, 'stroke-width': 2 }, svg); T(svg, 535, 56, 'i', { 'text-anchor': 'middle', fill: MUT, 'font-size': 13 }); T(svg, 535, 102, String(k === 0 ? 0 : k === 5 ? 4 : i), { 'text-anchor': 'middle', fill: CY, 'font-size': 40, 'font-weight': 700 });
    T(svg, 640, 80, k === 0 ? 'start' : k === 5 ? '4 < 4 ? NO → done' : (i) + ' < 4 ? YES', { fill: k === 5 ? SIG : '#4ade80', 'font-size': 14 });
    var g = S('g', { transform: 'translate(120 210)' }, svg), L = 40, x = 0, y = 0, h = 0, d = 'M0 0';
    for (var s = 0; s < (k === 0 ? 0 : k === 5 ? 4 : i + 1); s++) { x += Math.sin(h) * L; y -= Math.cos(h) * L; d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1); h += Math.PI / 2; }
    S('path', { d: d, fill: 'none', stroke: SIG, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    T(svg, 300, 200, k === 0 ? '' : 'drawn so far: ' + (k === 5 ? 4 : i + 1) + ' side' + ((k === 5 ? 4 : i + 1) > 1 ? 's' : ''), { fill: MUT, 'font-size': 12 });
  }

  steps.push({ id: 'floor', title: 'Spell it on the floor', stage: '05 Create · 06 Test', time: '50 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time for the real thing. Put your real calibration numbers into <code>CM_PER_SEC</code> and <code>MS_PER_DEGREE</code>, upload, and spell your name on the floor.</p>');
    UI.html(b, '<h2>Ways to see the letters</h2><ul><li><b>Film from above</b>: stand on a chair (carefully!) or hold the phone high, and record the whole run. Pause the video at the end of each letter.</li><li><b>Draw it</b>: tape a washable marker to the back of the car so its tip just touches big paper on the floor (the marker is behind the wheels, so the letters come out slightly different — that’s part of the fun).</li><li><b>Trace it</b>: put a strip of masking tape down along each path the car drove.</li></ul>');
    K.uploadSteps(b);
    UI.html(b, '<h2>Debug one letter at a time</h2><p>If a letter comes out wrong, don’t run the whole name again. Change <code>setup()</code> to draw <b>only that letter</b>, fix it, then put the name back. Common fixes:</p><ul><li>Lines too short or too long everywhere → re-measure <code>CM_PER_SEC</code>.</li><li>Letters lean or don’t close → <code>MS_PER_DEGREE</code> is a little off. Adjust it by 0.1 at a time.</li><li>Only one letter is wrong → check that letter’s moves against your plan.</li></ul>');
    UI.note(b, ctx, { id: 'n-floor', label: 'Test log: which letters came out wrong, what you changed, and the result.', placeholder: 'Test 1: H leaned right → MS_PER_DEGREE 6.0 → 5.8\nTest 2: …', rows: 5 });
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.tests(b, ctx, { id: 'tests', rows: [
      'driveCm(50) really drives 50 cm on the floor (within 3 cm).',
      'turnDeg(90) really turns 90° (within about 5°).',
      'Each letter is its own function, and setup() just calls them in order.',
      'A classmate can read your name from the video or drawing.',
      'You used a for loop somewhere a move repeats.'
    ] });
    UI.challenges(b, [
      { tag: 'Design', cls: 'c', title: 'Print a pen holder', html: 'Design a marker holder in Fusion that clips onto the car and holds a marker <b>exactly between the wheels</b>, so it draws the same path the trail shows. Print it on the A1.' },
      { tag: 'Code', title: 'Bigger and smaller', html: 'Add a <code>float SIZE = 1.0;</code> constant and multiply every distance by it, so <code>SIZE = 0.5</code> writes half-size letters.', hint: '<code>driveCm(40 * SIZE);</code>' },
      { tag: 'Loops', title: 'Spirograph', html: 'Put a loop inside a loop: draw a square, turn 30°, draw another square… 12 times. What pattern appears?' },
      { tag: 'Code', cls: 'c', title: 'Curvy letters', html: 'Write <code>arc()</code> that drives with the left side faster than the right for a set time. Use it to make round letters like O, C and S.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What would you change to make your letters neater?', placeholder: 'A slower speed for the short lines…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r03 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your robot spelling your name. Upload your plan, video and code, answer the questions, then press Submit.', [
      K.photoFile('A photo of your plan', 'Your grid-paper plan (or a screenshot of the planner) with the moves for each letter.', 3),
      K.videoFile('Filmed from above if you can: the robot spelling your name (or the drawing it made).'),
      K.codeFile('spell_name')
    ], [
      { id: 'r1', q: 'What is decomposition? Show how you broke “spell my name” into smaller problems and functions.' },
      { id: 'r2', q: 'Explain how driveCm() turns a distance into a time. Use one of your letters as an example and show the maths.' },
      { id: 'r3', q: 'What is a parameter? Why is driveCm(float cm) better than writing a separate function for every distance?' },
      { id: 'r4', q: 'Which letter was hardest to get right? What was wrong, and how did you fix it?' }
    ])
  };
})(window);
