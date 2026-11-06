/* Mission R7: Maze runner — algorithms and pseudocode, the right-hand (wall-follower) rule, arrays and for loops,
 * functions that return bool, state machines with switch, millis() timing, and debugging with Serial. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb', GO = '#4ade80', WALL = '#b98d55';

  /* ================= mazes =================
   * A maze is drawn in text: '+' corners, '-' and '|' walls, ' ' gaps, 'S' the start cell, 'G' the goal cell.
   * Cells are 50 cm; the floor has a 5 cm margin. Directions: 0 = north (up), 1 = east, 2 = south, 3 = west. */
  var CELL = 50, MAR = 5;
  var MAZE_A = [
    '+-+-+-+-+',
    '|S|     |',
    '+ + +-+ +',
    '|   |   |',
    '+-+ + +-+',
    '|   |  G|',
    '+-+-+-+-+'];
  var MAZE_B = [
    '+-+-+-+-+',
    '|S  |   |',
    '+-+ + + +',
    '|   | | |',
    '+ +-+ + +',
    '|     |G|',
    '+-+-+-+-+'];
  var ISLAND = [
    '+-+-+-+-+',
    '|S      |',
    '+ +-+-+ +',
    '| |G    |',
    '+ +-+-+ +',
    '|       |',
    '+-+-+-+-+'];
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  function parse(spec) {
    var m = { spec: spec, rows: (spec.length - 1) / 2, cols: (spec[0].length - 1) / 2 };
    spec.forEach(function (ln, i) { for (var j = 0; j < ln.length; j++) { if (ln[j] === 'S') m.start = { c: (j - 1) / 2, r: (i - 1) / 2 }; if (ln[j] === 'G') m.goal = { c: (j - 1) / 2, r: (i - 1) / 2 }; } });
    m.open = function (c, r, d) { var i = 2 * r + 1 + DY[d], j = 2 * c + 1 + DX[d], ch = (spec[i] || '')[j]; return ch === ' '; };
    return m;
  }
  function centre(c, r) { return [MAR + CELL * c + CELL / 2, MAR + CELL * r + CELL / 2]; }
  /* the right-hand rule, run on paper: returns the cells visited (stops at the goal or after max moves) */
  function rhPath(m, dir, max) {
    var c = m.start.c, r = m.start.r, d = dir, path = [[c, r]], moves = [];
    for (var k = 0; k < (max || 60) && !(c === m.goal.c && r === m.goal.r); k++) {
      var t = m.open(c, r, (d + 1) % 4) ? 1 : m.open(c, r, d) ? 0 : m.open(c, r, (d + 3) % 4) ? -1 : 2;
      d = (d + (t === -1 ? 3 : t) + 4) % 4; c += DX[d]; r += DY[d]; path.push([c, r]); moves.push(t);
    }
    return { path: path, moves: moves, solved: c === m.goal.c && r === m.goal.r };
  }
  function mazeWorld(spec, dir) {
    var m = parse(spec), walls = [], i, j;
    spec.forEach(function (ln, i) {
      for (j = 0; j < ln.length; j++) {
        if (i % 2 === 0 && j % 2 === 1 && ln[j] === '-') walls.push({ x: MAR + CELL * (j - 1) / 2 - 1, y: MAR + CELL * i / 2 - 1, w: CELL + 2, h: 2 });
        if (i % 2 === 1 && j % 2 === 0 && ln[j] === '|') walls.push({ x: MAR + CELL * j / 2 - 1, y: MAR + CELL * (i - 1) / 2 - 1, w: 2, h: CELL + 2 });
      }
    });
    var s = centre(m.start.c, m.start.r), g = centre(m.goal.c, m.goal.r);
    return { w: m.cols * CELL + 2 * MAR, h: m.rows * CELL + 2 * MAR, grid: 10, walls: walls, start: { x: s[0], y: s[1], h: (dir || 0) * 90 },
      lines: [{ pts: [[g[0] - 8, g[1]], [g[0] + 8, g[1]]], w: 30 }],
      zones: [{ id: 'goal', x: g[0] - 23, y: g[1] - 23, w: 46, h: 46, label: 'GOAL', color: GO }] };
  }
  /* draws a maze into an svg (scale 2 px per cm) with an optional trail */
  function drawMaze(svg, spec, o) {
    o = o || {}; var m = parse(spec), Z = 2, W = (m.cols * CELL + 2 * MAR) * Z, H = (m.rows * CELL + 2 * MAR) * Z;
    var g = S('g', { transform: 'translate(' + (o.x || 0) + ' ' + (o.y || 0) + ')' }, svg);
    S('rect', { x: 0, y: 0, width: W, height: H, rx: 8, fill: '#dfe5ea' }, g);
    var gc = centre(m.goal.c, m.goal.r); S('rect', { x: (gc[0] - 15) * Z, y: (gc[1] - 15) * Z, width: 60, height: 60, rx: 6, fill: '#15181c' }, g);
    T(g, gc[0] * Z, gc[1] * Z + 4, 'GOAL', { 'text-anchor': 'middle', fill: GO, 'font-size': 11, 'font-weight': 700 });
    if (o.trail) {
      var pts = o.trail.map(function (p) { var q = centre(p[0], p[1]); return (q[0] * Z) + ',' + (q[1] * Z); }).join(' ');
      S('polyline', { points: pts, fill: 'none', stroke: o.trailColor || CY, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.85 }, g);
    }
    spec.forEach(function (ln, i) {
      for (var j = 0; j < ln.length; j++) {
        var isl = o.island && o.island(i, j), col = isl ? SIG : WALL;
        if (i % 2 === 0 && j % 2 === 1 && ln[j] === '-') S('rect', { x: (MAR + CELL * (j - 1) / 2) * Z - 3, y: (MAR + CELL * i / 2) * Z - 3, width: CELL * Z + 6, height: 6, rx: 2, fill: col }, g);
        if (i % 2 === 1 && j % 2 === 0 && ln[j] === '|') S('rect', { x: (MAR + CELL * j / 2) * Z - 3, y: (MAR + CELL * (i - 1) / 2) * Z - 3, width: 6, height: CELL * Z + 6, rx: 2, fill: col }, g);
      }
    });
    var sc = centre(m.start.c, m.start.r); T(g, sc[0] * Z, sc[1] * Z + 42, 'START', { 'text-anchor': 'middle', fill: '#0b1320', 'font-size': 10, 'font-weight': 700 });
    if (o.robot) { var rc = centre(o.robot.c, o.robot.r); var a = S('g', { transform: 'translate(' + rc[0] * Z + ' ' + rc[1] * Z + ') rotate(' + o.robot.d * 90 + ')' }, g); S('polygon', { points: '0,-22 16,16 0,8 -16,16', fill: CY, stroke: '#0b1320', 'stroke-width': 2 }, a); }
    return { g: g, W: W, H: H, m: m };
  }

  /* ================= code ================= */
  var SETUP_ALL = ['  Serial.begin(9600);', '  pinMode(BUTTON, INPUT_PULLUP);', '  pinMode(TRIG, OUTPUT);', '  pinMode(ECHO, INPUT);'].concat(K.SETUP_MOTORS);
  var ARRAYS = [
    'const int RIGHT = 0;   // position (index) of each direction in the arrays',
    'const int AHEAD = 1;',
    'const int LEFT = 2;',
    'const int ANGLES[3] = {10, 90, 170};   // servo angles: look right, ahead, left',
    'int dist[3];                           // the distance seen in each direction'];
  var SCAN_FN = [
    '// looks right, ahead and left, and stores each distance in the dist array',
    'void scan() {',
    '  for (int i = 0; i < 3; i++) {',
    '    head.write(ANGLES[i]);   // turn the sensor',
    '    delay(300);              // give the servo time to get there',
    '    dist[i] = readDistance();',
    '  }',
    '  head.write(90);            // eyes front again',
    '  delay(200);',
    '}'];
  var SCAN = K.join(['// R7 part 1: scan with an array', '#include <Servo.h>'], K.PINS, K.BUTTON_PIN, K.SONAR, [''], ARRAYS, ['',
    'Servo head;', '',
    'void setup() {'], SETUP_ALL, ['  head.attach(10);', '  head.write(90);', '}', '',
    'void loop() {',
    '  waitForButton();',
    '  scan();',
    '  Serial.print("right: ");',
    '  Serial.print(dist[RIGHT]);',
    '  Serial.print("   ahead: ");',
    '  Serial.print(dist[AHEAD]);',
    '  Serial.print("   left: ");',
    '  Serial.println(dist[LEFT]);',
    '}', ''], SCAN_FN, [''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);

  var CAL = [
    'const int SPEED = 150;',
    'const float CM_PER_SEC = 29.3;    // your calibration from R2 / R3',
    'const float MS_PER_DEGREE = 7.0;',
    'const int CELL_CM = 50;           // size of one maze square',
    'const int OPEN_CM = 35;           // farther than this = no wall that way',
    'const int THRESHOLD = 450;        // line sensors: above this = black (from R6)'];
  var MOVE_FNS = [
    '// drives forward one maze square',
    'void moveCell() {',
    '  forward(SPEED);',
    '  delay(CELL_CM / CM_PER_SEC * 1000);',
    '  stopCar();',
    '  delay(250);',
    '}',
    '',
    '// turns on the spot: positive = right, negative = left',
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
  var GOAL_FN = [
    '// true if all three line sensors see the black goal square',
    'bool atGoal() {',
    '  return analogRead(A2) > THRESHOLD && analogRead(A1) > THRESHOLD && analogRead(A0) > THRESHOLD;',
    '}'];
  var SOLVE = K.join(['// R7 part 2: escape the maze with the right-hand rule', '#include <Servo.h>'], K.PINS, K.BUTTON_PIN, K.SONAR, [''], CAL, [''], ARRAYS, ['',
    'Servo head;', '',
    'void setup() {'], SETUP_ALL, ['  head.attach(10);', '  head.write(90);', '  waitForButton();', '}', '',
    'void loop() {',
    '  if (atGoal()) {',
    '    stopCar();',
    '    Serial.println("Made it out!");',
    '    while (true) {',
    '      delay(100);           // stay here (until the reset button)',
    '    }',
    '  }',
    '',
    '  scan();',
    '',
    '  // the right-hand rule: right if you can, else straight, else left, else turn around',
    '  if (dist[RIGHT] > OPEN_CM) {',
    '    Serial.println("right");',
    '    turnDeg(90);',
    '  } else if (dist[AHEAD] > OPEN_CM) {',
    '    Serial.println("straight");',
    '  } else if (dist[LEFT] > OPEN_CM) {',
    '    Serial.println("left");',
    '    turnDeg(-90);',
    '  } else {',
    '    Serial.println("dead end: turn around");',
    '    turnDeg(180);',
    '  }',
    '  moveCell();',
    '}', ''], GOAL_FN, [''], SCAN_FN, [''], MOVE_FNS, [''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);

  var STATES = K.join(['// R7 part 3: the maze runner as a state machine', '#include <Servo.h>', '#include <FastLED.h>'], K.PINS, K.BUTTON_PIN, K.SONAR, [
    'const int LED_PIN = 4;', ''], CAL, [
    'const int CELL_MS = CELL_CM / CM_PER_SEC * 1000;   // time to drive one square',
    'const int FRONT_CM = 15;          // a wall this close ahead = we are in the middle of the square', ''], ARRAYS, ['',
    '// the states: what the robot is doing right now',
    'const int SCANNING = 0;',
    'const int TURNING = 1;',
    'const int DRIVING = 2;',
    'const int FINISHED = 3;',
    'String NAMES[4] = {"SCANNING", "TURNING", "DRIVING", "FINISHED"};', '',
    'int state = SCANNING;',
    'unsigned long driveStart = 0;     // when the current drive began (from millis)', '',
    'Servo head;',
    'CRGB leds[1];', '',
    'void setup() {'], SETUP_ALL, [
    '  head.attach(10);',
    '  head.write(90);',
    '  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);',
    '  FastLED.setBrightness(40);',
    '  waitForButton();',
    '  setState(SCANNING);',
    '}', '',
    'void loop() {',
    '  switch (state) {',
    '    case SCANNING:',
    '      if (atGoal()) {',
    '        setState(FINISHED);',
    '      } else {',
    '        scan();',
    '        setState(TURNING);',
    '      }',
    '      break;',
    '',
    '    case TURNING:',
    '      if (dist[RIGHT] > OPEN_CM) {',
    '        turnDeg(90);',
    '      } else if (dist[AHEAD] > OPEN_CM) {',
    '        // no turn needed',
    '      } else if (dist[LEFT] > OPEN_CM) {',
    '        turnDeg(-90);',
    '      } else {',
    '        turnDeg(180);',
    '      }',
    '      forward(SPEED);',
    '      driveStart = millis();',
    '      setState(DRIVING);',
    '      break;',
    '',
    '    case DRIVING:',
    '      // stop when the time is up OR a wall ahead says we are in the middle of the square',
    '      if (millis() - driveStart >= CELL_MS || readDistance() < FRONT_CM) {',
    '        stopCar();',
    '        delay(250);',
    '        setState(SCANNING);',
    '      }',
    '      break;',
    '',
    '    case FINISHED:',
    '      stopCar();',
    '      leds[0] = CHSV(millis() / 10 % 256, 255, 255);   // rainbow party lights',
    '      FastLED.show();',
    '      delay(20);',
    '      break;',
    '  }',
    '}', '',
    '// changes state, prints it (for debugging) and shows a colour for each state',
    'void setState(int newState) {',
    '  state = newState;',
    '  Serial.print("-> ");',
    '  Serial.println(NAMES[state]);',
    '  if (state == SCANNING) {',
    '    leds[0] = CRGB::Blue;',
    '  } else if (state == TURNING) {',
    '    leds[0] = CRGB::Yellow;',
    '  } else if (state == DRIVING) {',
    '    leds[0] = CRGB::Green;',
    '  }',
    '  FastLED.show();',
    '}', ''], GOAL_FN, [''], SCAN_FN, [''], MOVE_FNS.slice(8), [''], K.READ_DIST, [''], K.WAIT_BUTTON, [''], K.MOVES);

  /* ================= checks ================= */
  function escapeCheck(w, api, maxMs) {
    return K.pressStart(api).then(function () {
      return new Promise(function (res) {
        var t0 = Date.now(), stillSince = null;
        var iv = setInterval(function () {
          var now = Date.now();
          if (w.inZone('goal')) { if (w.moving()) stillSince = null; else if (!stillSince) stillSince = now; }
          else stillSince = null;
          if (stillSince && now - stillSince > 1500) { clearInterval(iv); var b = w.bumps(); res({ pass: b <= 2, msg: b <= 2 ? 'Out of the maze in ' + ((now - t0) / 1000).toFixed(0) + ' s' + (b ? ' (' + b + ' light bump' + (b > 1 ? 's' : '') + ')' : ' without touching a wall') + '.' : 'It got out, but bumped the walls ' + b + ' times. Check your turns and OPEN_CM.' }); }
          else if (now - t0 > maxMs) { clearInterval(iv); res({ pass: false, msg: 'Still not at the goal after ' + Math.round(maxMs / 1000) + ' s. Watch the Serial monitor: are the decisions right?' }); }
        }, 200);
      });
    });
  }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var mA = parse(MAZE_A);
    K.brief(b, RL.MISSIONS.r07, {
      lead: '<p class="lead">Drop your robot into a maze it has never seen. No remote, no list of moves: it has to <b>look</b>, <b>decide</b> and <b>drive</b>, square by square, until it finds the way out — and then celebrate.</p>' +
        '<p>To do it you’ll learn what an <b>algorithm</b> is and plan one in plain English (pseudocode), store several measurements in an <b>array</b>, and organise your program as a <b>state machine</b> — the way the programs in real robots, traffic lights and video games are built.</p>',
      edp: [2, 3, 4, 5, 6, 7],
      demo: { title: 'Escaping a maze', world: mazeWorld(MAZE_A, 2),
        cap: 'Look right, ahead and left. Right if it’s open, else straight, else left, else turn around. Drive one square. Repeat until the floor turns black.',
        program: async function (car) {
          for (var k = 0; k < 30; k++) {
            if (car.line(0) > 450 && car.line(1) > 450 && car.line(2) > 450) { car.say('GOAL! Made it out'); car.led(0, 255, 0); await car.wait(2500); return; }
            car.say('scanning…'); car.led(0, 80, 255);
            await car.servo(10, 300); var R = car.dist(); await car.servo(90, 300); var A = car.dist(); await car.servo(170, 300); var L = car.dist(); await car.servo(90, 200);
            car.led(255, 200, 0);
            if (R > 35) { car.say('right is open → turn right'); await car.drive(150, -150, 630); await car.stop(250); }
            else if (A > 35) { car.say('right blocked, ahead open → straight'); await car.wait(400); }
            else if (L > 35) { car.say('only left is open → turn left'); await car.drive(-150, 150, 630); await car.stop(250); }
            else { car.say('dead end → turn around'); await car.drive(150, -150, 1260); await car.stop(250); }
            car.led(0, 255, 0); await car.drive(150, 150, 1707); await car.stop(250);
          }
        } }
    });
  } });

  steps.push({ id: 'algorithm', title: 'Plan the algorithm', stage: '02 Research · 04 Plan', time: '35 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">An <b>algorithm</b> is a set of steps that always solves a problem — like a recipe. Before writing any code, programmers work out the algorithm in plain words. Here’s a famous one for mazes.</p>' +
      '<h2>The right-hand rule</h2><p>Imagine walking through a maze in the dark. Put your <b>right hand on the wall</b> and never take it off. Keep walking, and you will eventually reach the exit. It isn’t the shortest way — you’ll walk into some dead ends — but it <b>always</b> works in a maze whose walls are all joined together.</p>');
    var mA = parse(MAZE_A), sol = rhPath(mA, 2), mI = parse(ISLAND), loop = rhPath(mI, 2, 14);
    UI.explainer(b, { label: 'Explainer', title: 'Keep your right hand on the wall', w: 820, h: 360, frames: [
      { cap: 'At every square the robot asks, <b>in this order</b>: can I go <b>right</b>? If not, <b>straight</b>? If not, <b>left</b>? If not, it’s a dead end: <b>turn around</b>.', draw: function (svg) { clear(svg); drawMaze(svg, MAZE_A, { x: 200, y: 10, robot: { c: 0, r: 0, d: 2 } }); } },
      { cap: 'Following that rule from the start, the robot explores one dead end (bottom left), turns around, and still gets out: <b>' + sol.moves.length + ' moves</b>. Trace it with your finger.', draw: function (svg) { clear(svg); drawMaze(svg, MAZE_A, { x: 200, y: 10, trail: sol.path, robot: { c: mA.goal.c, r: mA.goal.r, d: 1 } }); } },
      { cap: 'The catch: if the goal sits next to walls that are <b>not joined</b> to the outside (orange), the right hand never touches them. The robot goes round and round the outside forever. Mazes with “islands” need a smarter algorithm.', draw: function (svg) { clear(svg); drawMaze(svg, ISLAND, { x: 200, y: 10, trail: loop.path, trailColor: SIG, island: function (i, j) { return i >= 2 && i <= 4 && j >= 2 && j <= 6; } }); } }
    ] });
    UI.html(b, '<h2>Pseudocode</h2><p><b>Pseudocode</b> is an algorithm written in plain words, set out like code but with no special rules. Programmers write it first so they can think about <i>what</i> to do before worrying about <i>how</i> to type it.</p>' +
      '<pre class="r7-pseudo">repeat until the robot is on the goal:\n    look right, ahead and left\n    if right is open:\n        turn right\n    otherwise, if ahead is open:\n        don’t turn\n    otherwise, if left is open:\n        turn left\n    otherwise:\n        turn around (dead end)\n    drive forward one square\ncelebrate!</pre>');
    UI.html(b, '<h2>Be the robot</h2><p>Use the algorithm to drive the arrow out of this maze. At each square, choose what the right-hand rule says.</p>');
    beRobot(b, ctx);
    UI.mcq(b, ctx, { id: 'q-order', q: 'Why does the robot have to check the directions <b>in the same order</b> every time?', options: ['It’s faster', 'Otherwise it isn’t keeping its hand on the same wall, and it can go round in circles', 'The servo can only turn that way', 'It doesn’t matter'], answer: 1, explain: 'Always preferring right means the robot always hugs the right-hand wall. Mix up the order and it can loop forever.' });
    UI.mcq(b, ctx, { id: 'q-left', q: 'Would a <b>left</b>-hand rule (left, else straight, else right, else turn around) also work?', options: ['Yes — it just follows the other wall', 'No, only the right hand works', 'Only in square mazes'], answer: 0, explain: 'Either hand works. It may take a different path — sometimes shorter, sometimes longer. (Try it as a challenge.)' });
  } });
  function clear(svg) { while (svg.lastChild) svg.removeChild(svg.lastChild); S('rect', { x: 0, y: 0, width: 820, height: 360, fill: '#070d17' }, svg); }
  function beRobot(b, ctx) {
    var m = parse(MAZE_B), saved = ctx.check('be-robot');
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Interactive</span><h3>Be the robot</h3></div>';
    var stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 820 340', role: 'img', 'aria-label': 'Maze game' }); stage.appendChild(svg); box.appendChild(stage);
    var cap = el('div', 'xp-cap'), btns = el('div', 'car-tools'), msg = el('p', '', ''); cap.appendChild(msg); cap.appendChild(btns); box.appendChild(cap); b.appendChild(box);
    var pos, trail, moves;
    function reset() { pos = { c: m.start.c, r: m.start.r, d: 2 }; trail = [[pos.c, pos.r]]; moves = 0; msg.innerHTML = 'The arrow is the robot, facing down. Which way does the right-hand rule say to go?'; draw(); }
    function draw() {
      while (svg.lastChild) svg.removeChild(svg.lastChild); S('rect', { x: 0, y: 0, width: 820, height: 340, fill: '#070d17' }, svg);
      drawMaze(svg, MAZE_B, { x: 200, y: 0, trail: trail, robot: pos });
    }
    var names = { 1: 'Turn right', 0: 'Straight', '-1': 'Turn left', 2: 'Turn around' };
    [1, 0, -1, 2].forEach(function (t) {
      var bt = el('button', 'btn', names[t]); bt.type = 'button'; btns.appendChild(bt);
      bt.addEventListener('click', function () {
        if (pos.c === m.goal.c && pos.r === m.goal.r) return;
        var d = pos.d, want = m.open(pos.c, pos.r, (d + 1) % 4) ? 1 : m.open(pos.c, pos.r, d) ? 0 : m.open(pos.c, pos.r, (d + 3) % 4) ? -1 : 2;
        if (t !== want) {
          var why = { 1: 'right is open, so the rule says turn right', 0: 'right is blocked but ahead is open, so go straight', '-1': 'right and ahead are blocked, but left is open: turn left', 2: 'right, ahead and left are all blocked: dead end, turn around' }[want];
          msg.innerHTML = '<b style="color:' + SIG + '">Not quite.</b> Look again: ' + why + '.'; return;
        }
        pos.d = (d + (t === -1 ? 3 : t) + 4) % 4; pos.c += DX[pos.d]; pos.r += DY[pos.d]; trail.push([pos.c, pos.r]); moves++; draw();
        if (pos.c === m.goal.c && pos.r === m.goal.r) { msg.innerHTML = '<b style="color:' + GO + '">Out in ' + moves + ' moves!</b> That’s exactly what your code will make the robot do.'; ctx.check('be-robot', { done: true, moves: moves }); }
        else msg.innerHTML = names[t] + ' ✓. Next square: what does the rule say?';
      });
    });
    var rb = el('button', 'btn ghost', 'Start again'); rb.type = 'button'; rb.addEventListener('click', reset); btns.appendChild(rb);
    reset(); if (saved && saved.done) msg.innerHTML += ' <span class="muted">(You solved it before in ' + saved.moves + ' moves.)</span>';
  }

  steps.push({ id: 'scan', title: 'Code it: scan with an array', stage: '05 Create', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The robot needs to remember <b>three</b> distances at once — right, ahead and left. You could make three variables, but there’s a neater way: an <b>array</b>.</p>' +
      '<h2>Arrays: a row of boxes</h2><p>An array is one name for a whole row of boxes. <code>int dist[3];</code> makes three whole-number boxes called <code>dist[0]</code>, <code>dist[1]</code> and <code>dist[2]</code>. The number in the square brackets is the <b>index</b>: which box. <b>Counting starts at 0</b>, so a 3-box array has indexes 0, 1 and 2 (there is no <code>dist[3]</code>!).</p>');
    arrayPic(b);
    UI.html(b, '<p>Arrays and <code>for</code> loops are best friends: a loop with <code>i</code> going 0, 1, 2 can visit every box. And with a second array holding the servo angles, the same three lines of code can look in all three directions.</p>');
    RL.Code.walk(b, SCAN, [
      { title: 'The plan', html: '<p>When you press MODE, look right, ahead and left, store the three distances in an array, and print them.</p>' },
      { lines: [K.line(SCAN, /const int RIGHT = 0/), K.line(SCAN, /const int LEFT = 2/)], title: 'Names for the indexes', html: '<p><code>dist[RIGHT]</code> is much easier to read than <code>dist[0]</code>. These constants just give the index numbers names.</p>' },
      { lines: [K.line(SCAN, /ANGLES\[3\]/), K.line(SCAN, /int dist\[3\]/)], title: 'Two arrays', html: '<p><code>ANGLES</code> is filled in straight away with <code>{10, 90, 170}</code>: box 0 holds 10 (look right), box 1 holds 90 (ahead), box 2 holds 170 (left). In R4 you used 30 and 150; here the sensor looks almost straight sideways, so it measures the wall <i>beside</i> the robot, not one diagonally ahead. It’s <code>const</code> because it never changes. <code>dist</code> starts empty; scan() fills it.</p>' },
      { lines: K.fn(SCAN, 'scan'), title: 'scan(): a loop through the arrays', html: '<p>The loop runs three times, with <code>i</code> = 0, then 1, then 2. Each time: point the sensor at <code>ANGLES[i]</code>, wait, and save the distance in <code>dist[i]</code>. So box 0 of dist gets the distance at the angle in box 0 of ANGLES (right), and so on.</p>' },
      { lines: [K.line(SCAN, /Serial.print\(dist\[RIGHT\]\)/) - 1, K.line(SCAN, /Serial.println\(dist\[LEFT\]\)/)], title: 'Read the boxes back', html: '<p>After scan(), the three distances are waiting in the array for any part of the program to use.</p>' }
    ], { name: 'maze_scan' });
    UI.html(b, '<h2>Try it</h2><p>The car is in a dead-end corridor with walls on its right and ahead. Press MODE and check: small numbers right and ahead, a big one on the left? Then drag the car somewhere else (Shift-drag turns it) and scan again.</p>');
    K.sim(b, { title: 'Scan with an array', code: SCAN, name: 'maze_scan', key: 'sim-scan', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300,
      world: { w: 160, h: 110, start: { x: 80, y: 60, h: 0 }, walls: [{ x: 104, y: 20, w: 2, h: 90 }, { x: 54, y: 20, w: 52, h: 2 }] },
      check: function (w, api) {
        return K.pressStart(api).then(function () { return new Promise(function (r) { setTimeout(r, 2200); }); }).then(function () {
          var m = /right:\s*(\d+)\s+ahead:\s*(\d+)\s+left:\s*(\d+)/.exec(api.serialText());
          if (!m) return { pass: false, msg: 'Couldn’t find “right: … ahead: … left: …” in the Serial monitor.' };
          var R = +m[1], A = +m[2], L = +m[3];
          return R < 35 && A < 35 && L > 35 ? { pass: true, msg: 'right ' + R + ', ahead ' + A + ', left ' + L + ' cm: walls on the right and ahead, the left is open.' } : { pass: false, msg: 'Got right ' + R + ', ahead ' + A + ', left ' + L + '. Expected small numbers right and ahead. Are the ANGLES in the right order?' };
        });
      } });
    UI.mcq(b, ctx, { id: 'q-index', q: '<code>int scores[5];</code> — what is the index of the <b>last</b> box?', options: ['5', '4', '6', '0'], answer: 1, explain: 'Five boxes, counting from 0: indexes 0, 1, 2, 3, 4.' });
    UI.html(b, '<h2>On the real car</h2><p>Upload it with the USB cable still in, open the Serial Monitor, and scan in a corner of a box. If <b>right</b> and <b>left</b> are swapped, your servo turns the other way: swap 10 and 170 in ANGLES.</p>');
    K.uploadSteps(b, { keepUsb: true });
  } });
  function arrayPic(b) {
    var box = el('div', 'xp'), stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 820 170', role: 'img', 'aria-label': 'An array of three boxes' });
    stage.appendChild(svg); box.appendChild(stage); b.appendChild(box);
    S('rect', { x: 0, y: 0, width: 820, height: 170, fill: '#070d17' }, svg);
    T(svg, 40, 92, 'dist', { fill: CY, 'font-size': 22, 'font-weight': 700 });
    [['dist[0]', 'RIGHT', '18'], ['dist[1]', 'AHEAD', '16'], ['dist[2]', 'LEFT', '72']].forEach(function (c, i) {
      var x = 150 + i * 170;
      S('rect', { x: x, y: 50, width: 150, height: 66, rx: 8, fill: '#0e1a2a', stroke: CY, 'stroke-width': 2 }, svg);
      T(svg, x + 75, 93, c[2] + ' cm', { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700 });
      T(svg, x + 75, 38, c[0], { 'text-anchor': 'middle', fill: SIG, 'font-size': 14 });
      T(svg, x + 75, 140, 'index ' + i + ' = ' + c[1], { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
    });
    T(svg, 680, 80, 'one name,', { fill: MUT, 'font-size': 13 }); T(svg, 680, 100, 'three boxes', { fill: MUT, 'font-size': 13 });
  }

  steps.push({ id: 'solve', title: 'Code it: escape the maze', stage: '05 Create', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now turn the pseudocode into code, line by line. Put them side by side: almost every line of pseudocode becomes one or two lines of C++.</p>' +
      '<table class="fx-plan"><thead><tr><th>Pseudocode</th><th>Code</th></tr></thead><tbody>' +
      '<tr><td>repeat until on the goal</td><td><code>loop()</code> repeats, and <code>if (atGoal())</code> stops it</td></tr>' +
      '<tr><td>look right, ahead and left</td><td><code>scan();</code></td></tr>' +
      '<tr><td>if right is open: turn right</td><td><code>if (dist[RIGHT] &gt; OPEN_CM) { turnDeg(90); }</code></td></tr>' +
      '<tr><td>otherwise if ahead is open</td><td><code>else if (dist[AHEAD] &gt; OPEN_CM) { }</code></td></tr>' +
      '<tr><td>otherwise if left is open: turn left</td><td><code>else if (dist[LEFT] &gt; OPEN_CM) { turnDeg(-90); }</code></td></tr>' +
      '<tr><td>otherwise: turn around</td><td><code>else { turnDeg(180); }</code></td></tr>' +
      '<tr><td>drive forward one square</td><td><code>moveCell();</code></td></tr></tbody></table>');
    RL.Code.walk(b, SOLVE, [
      { title: 'The plan', html: '<p>Each time round loop(): if we’re on the goal, stop for good. Otherwise scan, turn the way the right-hand rule says, and drive one square.</p>' },
      { lines: [K.line(SOLVE, /const int SPEED = 150/), K.line(SOLVE, /THRESHOLD = 450/)], title: 'Settings', html: '<p>Your calibration numbers from R2 and R3 go here. <code>OPEN_CM</code> is 35: a wall in the next half of the square reads closer than that; an open way reads much farther.</p>' },
      { lines: K.fn(SOLVE, 'atGoal'), title: 'atGoal(): a bool function', html: '<p>The goal square has black tape on the floor. This function <b>returns</b> true or false: true only if all three line sensors (from R6) see black. Because it returns a <code>bool</code>, you can use it straight in an if: <code>if (atGoal())</code>.</p>' },
      { lines: [K.line(SOLVE, /if \(atGoal\(\)\)/), K.line(SOLVE, /if \(atGoal\(\)\)/) + 6], title: 'Stop for good', html: '<p><code>while (true)</code> is a loop whose condition is always true, so it never ends: the robot stays parked on the goal until you press the reset button.</p>' },
      { lines: [K.line(SOLVE, /the right-hand rule:/), K.line(SOLVE, /turnDeg\(180\)/) + 1], title: 'The right-hand rule', html: '<p>The same order as the pseudocode. The <code>Serial.println</code> lines print each decision: when the robot does something odd, the Serial monitor tells you what it was “thinking”. That’s called <b>debugging with Serial</b>.</p>' },
      { lines: K.fn(SOLVE, 'moveCell'), title: 'moveCell()', html: '<p>Drive for exactly as long as it takes to go 50 cm: time = distance ÷ speed.</p>' }
    ], { name: 'maze_solve' });
    UI.html(b, '<h2>Try it</h2><p>This takes about a minute. Watch the Serial monitor — each line is a decision.</p>');
    K.sim(b, { title: 'Escape the maze', code: SOLVE, name: 'maze_solve', key: 'sim-solve', ctx: ctx, runHint: 'click “Hold the MODE button”.', checkAfter: 300, stack: true,
      world: mazeWorld(MAZE_A, 2),
      check: function (w, api) { return escapeCheck(w, api, 110000); } });
    UI.callout(b, 'plain', 'Debugging tips', '<ul><li><b>Crashes into walls after a few squares</b> — the turns aren’t exactly 90°. Adjust MS_PER_DEGREE until four right turns bring it back to where it started.</li><li><b>Stops short of / overshoots the middle of squares</b> — adjust CM_PER_SEC (part 3 also fixes this).</li><li><b>Goes the wrong way</b> — read the Serial monitor. Is the decision right for what the robot saw? If not, check OPEN_CM and the ANGLES order.</li><li><b>Never stops at the goal</b> — check the tape square is big enough (30 × 30 cm) and THRESHOLD is right.</li></ul>');
  } });

  steps.push({ id: 'states', title: 'Code it: a state machine', stage: '05 Create · 07 Improve', time: '50 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Real robots don’t drive with their eyes shut. In part 2, while <code>moveCell()</code> is waiting in a <code>delay</code>, the robot can’t check anything. If it drives a bit too far, it hits the wall ahead.</p>' +
      '<p>The fix is to organise the program as a <b>state machine</b>: the robot is always in exactly one <b>state</b> (like SCANNING or DRIVING), loop() runs again and again very quickly, and each time it does a little bit of the current state’s job and decides whether to <b>switch</b> to another state. While DRIVING, it can keep checking the sensor every loop.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'States and the arrows between them', w: 820, h: 300, frames: [
      { cap: 'The four states. The robot is always in one of them. The LED shows which: <b style="color:#60a5fa">blue</b> scanning, <b style="color:#facc15">yellow</b> turning, <b style="color:#4ade80">green</b> driving, rainbow finished.', draw: function (svg) { sm(svg, -1); } },
      { cap: '<b>SCANNING</b>: if the floor is black → FINISHED. Otherwise look three ways, then → TURNING.', draw: function (svg) { sm(svg, 0); } },
      { cap: '<b>TURNING</b>: turn the way the right-hand rule says, start the motors, note the time with <code>millis()</code>, → DRIVING.', draw: function (svg) { sm(svg, 1); } },
      { cap: '<b>DRIVING</b>: every loop, check two things. Has enough time passed for one square? <i>Or</i> is there a wall 15 cm ahead (meaning we’re in the middle of the square)? Either → stop → SCANNING.', draw: function (svg) { sm(svg, 2); } },
      { cap: '<b>FINISHED</b>: stay stopped and show rainbow lights. There’s no arrow out — the job is done.', draw: function (svg) { sm(svg, 3); } }
    ] });
    RL.Code.walk(b, STATES, [
      { title: 'The plan', html: '<p>Same algorithm, new shape: one <code>state</code> variable, a <code>switch</code> that runs the code for the current state, and a <code>setState()</code> function for moving between states.</p>' },
      { lines: [K.line(STATES, /the states: what/), K.line(STATES, /String NAMES/)], title: 'Naming the states', html: '<p>The states are just numbers 0–3 with names, so the code reads like English. <code>NAMES</code> is an array of <code>String</code> (text) so we can print the state’s name: <code>NAMES[2]</code> is "DRIVING".</p>' },
      { lines: [K.line(STATES, /int state = SCANNING/), K.line(STATES, /unsigned long driveStart/)], title: 'Memory', html: '<p><code>state</code> remembers what the robot is doing. <code>driveStart</code> remembers when the current drive began.</p>' },
      { lines: [K.line(STATES, /switch \(state\)/), K.line(STATES, /case SCANNING:/) + 7], title: 'switch (state)', html: '<p>You met <code>switch</code> in R5. It jumps to the <code>case</code> that matches the state and runs until <code>break</code>. Only one state’s code runs each loop.</p>' },
      { lines: [K.line(STATES, /case DRIVING:/), K.line(STATES, /case DRIVING:/) + 7], title: 'Driving with eyes open', html: '<p><code>millis()</code> is the number of milliseconds since the robot was switched on. <code>millis() - driveStart</code> is how long we’ve been driving. Stop if that’s long enough for one square, <b>or</b> (<code>||</code>) the wall ahead is closer than 15 cm. No <code>delay</code>, so this check happens hundreds of times a second.</p>' },
      { lines: K.fn(STATES, 'setState'), title: 'setState()', html: '<p>Every change of state goes through here, so it’s the perfect place to print it (the Serial monitor becomes a diary of what the robot did) and to set the LED colour.</p>' }
    ], { name: 'maze_states' });
    K.sim(b, { title: 'Maze runner (state machine)', code: STATES, name: 'maze_states', key: 'sim-states', ctx: ctx, runHint: 'click “Hold the MODE button” and watch the LED and the Serial monitor.', checkAfter: 300, stack: true,
      world: mazeWorld(MAZE_B, 2),
      check: function (w, api) { return escapeCheck(w, api, 110000); } });
    UI.mcq(b, ctx, { id: 'q-delay', q: 'Why does the DRIVING state use <code>millis()</code> instead of <code>delay()</code>?', options: ['millis() is more accurate', 'delay() freezes the program, so the robot couldn’t check the sensor while driving', 'delay() doesn’t work with motors', 'To save battery'], answer: 1, explain: 'During delay() nothing else happens. With millis() the loop keeps running, checking the time and the sensor every pass.' });
    UI.mcq(b, ctx, { id: 'q-state', q: 'The LED is <b>yellow</b> and the Serial monitor just printed “-> TURNING”. What will the robot do next?', options: ['Scan', 'Turn (or not) using the distances from the last scan, then start driving', 'Celebrate', 'Stop forever'], answer: 1, explain: 'TURNING uses dist[] from the scan, turns, starts the motors and switches to DRIVING.' });
  } });
  function sm(svg, hi) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    S('rect', { x: 0, y: 0, width: 820, height: 300, fill: '#070d17' }, svg);
    var defs = S('defs', {}, svg), mk = S('marker', { id: 'r7arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); S('path', { d: 'M0,0 L10,5 L0,10 z', fill: MUT }, mk);
    var N = [['SCANNING', 150, 90, '#60a5fa'], ['TURNING', 410, 90, '#facc15'], ['DRIVING', 410, 220, '#4ade80'], ['FINISHED', 670, 90, '#f472b6']];
    function arrow(x1, y1, x2, y2, label, lx, ly, on) { S('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: on ? CY : MUT, 'stroke-width': on ? 3 : 2, 'marker-end': 'url(#r7arr)' }, svg); T(svg, lx, ly, label, { fill: on ? CY : MUT, 'font-size': 11, 'text-anchor': 'middle' }); }
    arrow(225, 82, 335, 82, 'scanned', 280, 72, hi === 0);
    arrow(410, 112, 410, 196, 'turned, motors on', 480, 160, hi === 1);
    arrow(335, 220, 160, 116, 'time up OR wall at 15 cm', 150, 222, hi === 2);
    S('path', { d: 'M150,66 C150,20 670,20 670,66', fill: 'none', stroke: hi === 0 ? CY : MUT, 'stroke-width': hi === 0 ? 3 : 2, 'marker-end': 'url(#r7arr)' }, svg); T(svg, 410, 30, 'on the black goal', { fill: hi === 0 ? CY : MUT, 'font-size': 11, 'text-anchor': 'middle' });
    N.forEach(function (n, i) {
      var on = hi === i || hi === -1;
      S('rect', { x: n[1] - 75, y: n[2] - 22, width: 150, height: 44, rx: 22, fill: on ? '#0e1a2a' : '#0a121e', stroke: n[3], 'stroke-width': hi === i ? 4 : 2, opacity: on ? 1 : 0.55 }, svg);
      S('circle', { cx: n[1] - 52, cy: n[2], r: 7, fill: n[3] }, svg);
      T(svg, n[1] + 8, n[2] + 5, n[0], { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, opacity: on ? 1 : 0.6 });
    });
  }

  steps.push({ id: 'build', title: 'Design & build your maze', stage: '03 Imagine · 05 Create · 06 Test', time: '60 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Design a maze on the grid, test it with the virtual car, then build it for real out of cardboard.</p>');
    designer(b, ctx);
    UI.html(b, '<h2>Build it</h2><ul>' +
      '<li><b>Squares 50 cm × 50 cm</b> (the car is 25 cm long and needs room to turn). Mark the grid on the floor with masking tape first.</li>' +
      '<li><b>Walls at least 15 cm tall</b> so the ultrasonic sensor sees them. Cardboard strips folded into an L stand up on their own; tape or hot-glue the corners.</li>' +
      '<li>Make walls <b>flat and straight-on</b>. Sound bounces off at an angle from slanted or crumpled walls and the robot thinks there’s nothing there.</li>' +
      '<li><b>Goal</b>: a 30 × 30 cm square of black tape (or black paper) in the middle of the goal square.</li>' +
      '<li>Keep every wall joined to the outside wall (no islands!).</li></ul>');
    UI.callout(b, '', 'Share mazes', '<p>Swap mazes with another team. A robot that only works in the maze it was built for hasn’t really solved mazes!</p>');
    UI.note(b, ctx, { id: 'n-maze', label: 'Describe your maze: size, number of dead ends, anything that caused trouble while building it.', placeholder: '4 × 3 squares, 2 dead ends. The cardboard leaned, so we added L-shaped feet…' });
  } });
  function designer(b, ctx) {
    var COLS = 4, ROWS = 3, saved = ctx.check('maze-design');
    var spec = (saved && saved.spec) ? saved.spec.map(function (s) { return s.split(''); }) : MAZE_A.map(function (s) { return s.split(''); });
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Design</span><h3>Maze designer</h3></div>';
    var stage = el('div', 'xp-stage'), svg = S('svg', { viewBox: '0 0 820 340', role: 'img', 'aria-label': 'Maze designer' }); stage.appendChild(svg); box.appendChild(stage);
    var cap = el('div', 'xp-cap'), info = el('p', '', ''), tools = el('div', 'car-tools'); cap.appendChild(info); cap.appendChild(tools); box.appendChild(cap); b.appendChild(box);
    var simBox = el('div', ''); b.appendChild(simBox);
    function str() { return spec.map(function (r) { return r.join(''); }); }
    function analyse() {
      var m = parse(str()), cells = COLS * ROWS, edges = 0, seen = {}, q = [[m.start.c, m.start.r]];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (m.open(c, r, 1) && c < COLS - 1) edges++; if (m.open(c, r, 2) && r < ROWS - 1) edges++; }
      seen[m.start.c + ',' + m.start.r] = 1;
      while (q.length) { var p = q.shift(); for (var d = 0; d < 4; d++) if (m.open(p[0], p[1], d)) { var k = (p[0] + DX[d]) + ',' + (p[1] + DY[d]); if (!seen[k]) { seen[k] = 1; q.push([p[0] + DX[d], p[1] + DY[d]]); } } }
      var reach = !!seen[m.goal.c + ',' + m.goal.r], sol = rhPath(m, 2, 80);
      return { reach: reach, loops: edges > cells - 1 || false, sol: sol, unreached: cells - Object.keys(seen).length };
    }
    function draw() {
      while (svg.lastChild) svg.removeChild(svg.lastChild); S('rect', { x: 0, y: 0, width: 820, height: 340, fill: '#070d17' }, svg);
      var a = analyse(), d = drawMaze(svg, str(), { x: 200, y: 0, trail: a.reach && a.sol.solved ? a.sol.path : null });
      // click targets for inner walls
      for (var i = 1; i < 2 * ROWS; i++) for (var j = 1; j < 2 * COLS; j++) {
        var hz = i % 2 === 0 && j % 2 === 1, vt = i % 2 === 1 && j % 2 === 0;
        if (!hz && !vt) continue;
        (function (i, j, hz) {
          var x = (MAR + CELL * (hz ? (j - 1) / 2 : j / 2)) * 2, y = (MAR + CELL * (hz ? i / 2 : (i - 1) / 2)) * 2;
          var hit = S('rect', { x: hz ? x + 10 : x - 12, y: hz ? y - 12 : y + 10, width: hz ? 80 : 24, height: hz ? 24 : 80, fill: spec[i][j] === ' ' ? 'rgba(34,211,238,0.10)' : 'transparent', 'class': 'r7-hit' }, d.g);
          hit.addEventListener('click', function () { spec[i][j] = spec[i][j] === ' ' ? (hz ? '-' : '|') : ' '; save(); draw(); });
        })(i, j, hz);
      }
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) (function (c, r) {
        if (c === 0 && r === 0) return;
        var cc = centre(c, r), hit = S('circle', { cx: cc[0] * 2, cy: cc[1] * 2, r: 16, fill: 'transparent', stroke: 'rgba(74,222,128,0.35)', 'stroke-dasharray': '3 3', 'class': 'r7-hit' }, d.g);
        hit.addEventListener('click', function () { spec.forEach(function (row) { for (var k = 0; k < row.length; k++) if (row[k] === 'G') row[k] = ' '; }); spec[2 * r + 1][2 * c + 1] = 'G'; save(); draw(); });
      })(c, r);
      info.innerHTML = 'Click a gap between squares to add or remove a wall. Click a dashed circle to move the goal. The robot starts top-left, facing down. ' +
        (!a.reach ? '<b style="color:' + SIG + '">The goal can’t be reached!</b>' : !a.sol.solved ? '<b style="color:' + SIG + '">The right-hand rule never reaches the goal in this maze — it goes round in circles. Remove a loop.</b>' :
          '<b style="color:' + GO + '">Solvable: the right-hand rule takes ' + a.sol.moves.length + ' moves.</b>' + (a.loops ? ' (It has a loop, but the rule still gets out.)' : '') + (a.unreached ? ' ' + a.unreached + ' square(s) can’t be reached at all.' : ''));
    }
    function save() { ctx.check('maze-design', { spec: str() }); }
    var test = el('button', 'btn', 'Test it with the virtual car'); test.type = 'button'; tools.appendChild(test);
    var rs = el('button', 'btn ghost', 'Reset to the example'); rs.type = 'button'; tools.appendChild(rs);
    rs.addEventListener('click', function () { spec = MAZE_A.map(function (s) { return s.split(''); }); save(); draw(); });
    test.addEventListener('click', function () {
      simBox.innerHTML = '';
      K.sim(simBox, { title: 'Your maze', code: STATES, name: 'maze_states', key: 'sim-design', ctx: ctx, runHint: 'click “Hold the MODE button”. (Paste in your own code from the last step if you changed it.)', checkAfter: 300, stack: true,
        world: mazeWorld(str(), 2), check: function (w, api) { return escapeCheck(w, api, 150000); } });
      simBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    draw();
  }

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Test in your own maze, then in another team’s. Time each run and keep a log: what went wrong, what you changed.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      'scan() prints sensible distances for right, ahead and left.',
      'Four right turns bring the robot back to facing the way it started.',
      'The robot gets out of your maze without help.',
      'It gets out from a different starting square too.',
      'It gets out of another team’s maze.',
      'It stops and celebrates on the goal.'
    ] });
    UI.challenges(b, [
      { tag: 'Algorithm', cls: 'c', title: 'Left-hand rule', html: 'Change the order to left, straight, right. Which is faster in your maze? In the other team’s?' },
      { tag: 'Arrays', title: 'Remember the route', html: 'Record every decision in an array: <code>char route[40];</code> with <code>route[count] = \'R\'; count++;</code> (R, S, L or B for back). Print the route at the goal.', hint: 'A char holds one letter, written in single quotes: <code>\'R\'</code>.' },
      { tag: 'Algorithm', title: 'The shortcut', html: 'In your route, every “B” (dead end) is wasted. The pattern R B R is the same as going straight, and S B R is the same as L… work out the rules, shorten the route, and make the robot drive the shortcut on its second run.', hint: 'Search for “maze solving shortest path L B L”. Real micromouse robots do exactly this.' },
      { tag: 'Sensors', cls: 'c', title: 'Wall hugging', html: 'Instead of square-by-square, keep the sensor pointing right and steer to stay 15 cm from the right-hand wall (like proportional steering in R6). Turn left when a wall appears ahead.' },
      { tag: 'Speed', title: 'Speedrun', html: 'How fast can it get out? Try a faster SPEED (re-calibrate!) and shorter servo delays.' }
    ]);
    UI.note(b, ctx, { id: 'n-log', label: 'Test log: each run, what happened, and what you changed.', placeholder: 'Run 1: hit the wall after the 3rd turn → MS_PER_DEGREE 7.0 → 7.4\nRun 2: out in 58 s…', rows: 5 });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r07 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your robot escaping a maze. Upload a photo of the maze, your video and code, answer the questions, then press Submit.', [
      K.photoFile('A photo of your maze', 'From above, so the whole maze is visible.', 2),
      K.videoFile('Under 90 seconds: the robot getting out of a maze on its own (speed it up if it’s longer).'),
      K.codeFile('maze_states')
    ], [
      { id: 'r1', q: 'Write the right-hand rule as pseudocode. Why does it always work in a maze with no islands?' },
      { id: 'r2', q: 'What is an array? Explain how scan() uses the ANGLES and dist arrays together with a for loop.' },
      { id: 'r3', q: 'Describe your state machine: the states, and what makes the robot switch from one to another. Why is it better than one long list with delays?' },
      { id: 'r4', q: 'Describe a bug you found by reading the Serial monitor, and how you fixed it.' }
    ])
  };
})(window);
