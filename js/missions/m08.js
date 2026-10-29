/* Mission 08: Smart fan — the guide.
 * A cardboard desk fan: DC motor + fan blade driven through an L293D H-bridge (speed on pin 5, direction on pins 3 and 4),
 * powered from the power-supply module, with a speed knob on A0, a relay "power switch" on pin 7 and a DHT11 thermostat
 * on pin 2. Circuit parts are shared below so the build guides and the Virtual UNOs always match. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function P(parent, x, y, str, a) { return T(parent, x, y, str, Object.assign({ 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 13 }, a || {})); }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', BG = '#070d17', LINE = '#9fb3c8', PANEL = '#0e1826';
  var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72', COPPER = '#d08a3c', NCOL = '#b93a3a', SCOL = '#2f62c9';

  function defs(svg) { var d = svg.querySelector('defs'); if (!d) { d = S('defs', {}, null); svg.insertBefore(d, svg.firstChild); } return d; }
  function glowDefs(svg) {
    var d = defs(svg);
    [['red', '#ff4d4d'], ['cyan', CY], ['orange', SIG], ['green', GO], ['white', '#f4f7fb']].forEach(function (c) {
      if (d.querySelector('#m8g-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm8g-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.9 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  function arrowDefs(svg) {
    var d = defs(svg);
    [['c', CY], ['o', SIG], ['l', LINE], ['g', GO]].forEach(function (c) {
      if (d.querySelector('#m8a-' + c[0])) return;
      var m = S('marker', { id: 'm8a-' + c[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, d);
      S('path', { d: 'M0 0 L10 5 L0 10 z', fill: c[1] }, m);
    });
  }
  function bg(svg, w, h) { S('rect', { x: 0, y: 0, width: w, height: h, fill: BG }, svg); }
  function grid(svg, w, h) { for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, opacity: 0.35 }, svg); for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, opacity: 0.35 }, svg); }
  /* dots that move along a path: returns { setSpeed(px per s), stop() } */
  function flow(svg, pathEl, n, color, r) {
    var L = pathEl.getTotalLength(), dots = [], speed = 60, off = 0, last = performance.now(), raf = null, g = S('g', {}, svg);
    for (var i = 0; i < n; i++) dots.push(S('circle', { r: r || 4, fill: color || CY }, g));
    function tick(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; off = ((off + speed * dt) % L + L) % L; dots.forEach(function (d, i) { var p = pathEl.getPointAtLength((off + i * L / n) % L); d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); }); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return { setSpeed: function (v) { speed = v; }, stop: function () { cancelAnimationFrame(raf); g.remove(); }, g: g };
  }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  function minus(list, drop) { return list.filter(function (x) { return drop.indexOf(x) < 0; }); }

  /* ================= a power-supply module with the right-hand jumper set to OFF ================= */
  B.part('m08-psu', {
    draw: function (g, p, c) {
      var BBx = B.BB, x = BBx[0] - 6, y = BBx[1] - 30, W = BBx[2];
      c.s('rect', { x: x, y: y, width: W + 12, height: 62, rx: 4, fill: '#16191e', stroke: '#3b4350' }, g);
      c.s('rect', { x: x + W / 2 - 26, y: y - 16, width: 52, height: 40, rx: 3, fill: '#0b0d10', stroke: '#3b4350' }, g);
      c.s('rect', { x: x + W / 2 + 34, y: y + 8, width: 26, height: 20, rx: 2, fill: '#c0c6cc' }, g);
      // 3-pin jumper headers: 5V · OFF · 3.3V ; the left cap sits on 5V, the right cap on OFF
      [[x + 14, 0, '5V'], [x + W - 44, 1, 'OFF']].forEach(function (j) {
        for (var k = 0; k < 3; k++) c.s('rect', { x: j[0] + k * 10, y: y + 20, width: 5, height: 5, fill: '#c9b458' }, g);
        c.s('rect', { x: j[0] - 3 + j[1] * 10, y: y + 15, width: 21, height: 15, rx: 2, fill: j[1] ? '#9ca3af' : '#facc15' }, g);
        c.txt(g, j[0] + 12, y + 44, j[2], { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 9, fill: j[1] ? '#9ca3af' : '#facc15', 'text-anchor': 'middle' });
      });
      c.s('circle', { cx: x + 80, cy: y + 22, r: 3.5, fill: '#4ade80' }, g);
      c.txt(g, x + W / 2, y + 54, 'POWER MODULE · 9V IN · LEFT 5V · RIGHT OFF', { 'font-family': 'IBM Plex Mono, monospace', 'font-size': 8, fill: '#8ea6bb', 'text-anchor': 'middle' });
      g._ends = [];
    }
  });

  /* ================= circuit parts ================= */
  var POWER = {
    psu: { type: 'm08-psu', name: 'Power supply module' },
    gnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: UNO GND → left − rail' },
    gbr: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 542], [648, 542]], name: 'Black bridge: − rail to − rail (common ground)' },
    p5v: { type: 'wire', from: '5V', to: 'R+29', color: 'red', via: [[10, 296], [8, 470], [70, 562], [380, 568], [700, 566]], name: 'Red wire: UNO 5V → right + rail' }
  };
  var L293 = ['EN1', 'IN1', 'OUT1', 'GND', 'GND', 'OUT2', 'IN2', 'VCC2', 'EN2', 'IN3', 'OUT3', 'GND', 'GND', 'OUT4', 'IN4', 'VCC1'];
  var DRIVER = {
    chip: { type: 'chip', at: 'e5', pins: 16, label: 'L293D', pinNames: L293, name: 'L293D chip (notch up)' },
    cg1: { type: 'wire', from: 'a8', to: 'L-8', color: 'black', name: 'Black jumper: pin 4 → − rail' },
    cg2: { type: 'wire', from: 'a9', to: 'L-9', color: 'black', name: 'Black jumper: pin 5 → − rail' },
    cg3: { type: 'wire', from: 'j8', to: 'R-8', color: 'black', name: 'Black jumper: pin 13 → − rail' },
    cg4: { type: 'wire', from: 'j9', to: 'R-9', color: 'black', name: 'Black jumper: pin 12 → − rail' },
    cv1: { type: 'wire', from: 'j5', to: 'R+5', color: 'red', name: 'Red jumper: VCC1 (pin 16) → right + (UNO 5V)' },
    cv2: { type: 'wire', from: 'a12', to: 'L+12', color: 'red', name: 'Red jumper: VCC2 (pin 8) → left + (module 5V)' },
    wen: { type: 'wire', from: 'D5', to: 'a5', color: 'orange', via: [[350, 300], [420, 150]], name: 'Wire: pin 5 → EN1 (a5)' },
    win1: { type: 'wire', from: 'D3', to: 'a6', color: 'yellow', via: [[356, 334], [432, 162]], name: 'Wire: pin 3 → IN1 (a6)' },
    win2: { type: 'wire', from: 'D4', to: 'a11', color: 'green', via: [[364, 318], [436, 236]], name: 'Wire: pin 4 → IN2 (a11)' },
    motor: { type: 'dcmotor', at: [826, 196], label: 'DC MOTOR + FAN', name: 'DC motor + fan blade' },
    ma: { type: 'wire', from: 'c7', to: 'motor.A', color: 'blue', via: [[560, 150], [722, 168], [790, 222]], name: 'Wire: OUT1 (c7) → motor' },
    mb: { type: 'wire', from: 'c10', to: 'motor.B', color: 'purple', via: [[560, 226], [726, 248]], name: 'Wire: OUT2 (c10) → motor' },
    pot: { type: 'pot', at: 'f22', label: 'SPEED', name: '10 kΩ potentiometer (speed knob)' },
    kv: { type: 'wire', from: 'j22', to: 'R+22', color: 'red', name: 'Red jumper: knob → right + rail' },
    kg: { type: 'wire', from: 'j26', to: 'R-26', color: 'black', name: 'Black jumper: knob → right − rail' },
    kw: { type: 'wire', from: 'h24', to: 'A0', color: 'white', via: [[598, 520], [560, 556], [370, 556], [60, 548], [8, 460], [10, 380]], name: 'White wire: knob middle leg → A0' }
  };
  var RELAY = {
    relay: { type: 'relay', at: [750, 40], name: 'Relay module' },
    rs: { type: 'wire', from: 'D7', to: 'relay.S', color: 'orange', via: [[420, 278], [700, 276], [714, 200], [718, 96]], name: 'Wire: pin 7 → relay S' },
    rv: { type: 'wire', from: 'relay.V', to: 'R+3', color: 'red', name: 'Red wire: relay + → right + rail' },
    rg: { type: 'wire', from: 'relay.G', to: 'R-4', color: 'black', name: 'Black wire: relay − → right − rail' },
    rcom: { type: 'wire', from: 'c7', to: 'relay.COM', color: 'blue', via: [[560, 150], [722, 160], [868, 158], [872, 104]], name: 'Wire: OUT1 (c7) → relay COM' },
    rno: { type: 'wire', from: 'relay.NO', to: 'motor.A', color: 'blue', via: [[886, 58], [890, 170], [800, 204]], name: 'Wire: relay NO → motor' }
  };
  var SENSOR = {
    dht: { type: 'dht', at: [760, 330], name: 'DHT11 module' },
    ds: { type: 'wire', from: 'D2', to: 'dht.S', color: 'yellow', via: [[420, 358], [700, 356]], name: 'Wire: pin 2 → DHT11 S' },
    dv: { type: 'wire', from: 'dht.V', to: 'R+20', color: 'red', name: 'Red wire: DHT11 + → right + rail' },
    dg: { type: 'wire', from: 'dht.G', to: 'R-21', color: 'black', name: 'Black wire: DHT11 − → right − rail' }
  };
  var PARTS = merge(POWER, DRIVER, RELAY, SENSOR);
  var BASE_IDS = Object.keys(POWER).concat(Object.keys(DRIVER));
  var RELAY_IDS = minus(BASE_IDS, ['ma']).concat(Object.keys(RELAY));
  var FULL_IDS = RELAY_IDS.concat(Object.keys(SENSOR));
  var WIDE = B.WIDE;
  var SIM_VIEW = [280, 0, WIDE[2] - 280, WIDE[3]];
  var MOTOR = { en: 5, in1: 3, in2: 4, part: 'motor' };
  var MOTOR_R = { en: 5, in1: 3, in2: 4, part: 'motor', relay: 7 };

  /* ================= code ================= */
  var SPIN = [
    '// Mission 08, part 1: spin the fan forward, brake, spin backward, coast',
    '',
    'const int ENABLE = 5;   // L293D pin 1: on/off and speed',
    'const int IN1 = 3;      // L293D pin 2: direction',
    'const int IN2 = 4;      // L293D pin 7: direction',
    '',
    'void setup() {',
    '  pinMode(ENABLE, OUTPUT);',
    '  pinMode(IN1, OUTPUT);',
    '  pinMode(IN2, OUTPUT);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  Serial.println("Forward");',
    '  digitalWrite(IN1, HIGH);      // OUT1 = +, OUT2 = GND',
    '  digitalWrite(IN2, LOW);',
    '  digitalWrite(ENABLE, HIGH);   // driver on, full speed',
    '  delay(3000);',
    '',
    '  Serial.println("Brake");',
    '  digitalWrite(IN1, LOW);       // both LOW: motor wires joined = fast stop',
    '  delay(1500);',
    '',
    '  Serial.println("Backward");',
    '  digitalWrite(IN2, HIGH);      // OUT1 = GND, OUT2 = +',
    '  delay(3000);',
    '',
    '  Serial.println("Coast");',
    '  digitalWrite(ENABLE, LOW);    // driver off: the fan freewheels to a stop',
    '  digitalWrite(IN2, LOW);',
    '  delay(2500);',
    '}'].join('\n');
  var KNOB = [
    '// Mission 08, part 2: the knob sets the fan speed',
    '',
    'const int ENABLE = 5;',
    'const int IN1 = 3;',
    'const int IN2 = 4;',
    'const int KNOB = A0;    // potentiometer middle leg',
    '',
    'int knob = 0;           // 0 to 1023 from analogRead',
    'int speed = 0;          // 0 to 255 for analogWrite',
    '',
    'void setup() {',
    '  pinMode(ENABLE, OUTPUT);',
    '  pinMode(IN1, OUTPUT);',
    '  pinMode(IN2, OUTPUT);',
    '  digitalWrite(IN1, HIGH);   // always forward',
    '  digitalWrite(IN2, LOW);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  knob = analogRead(KNOB);',
    '',
    '  // YOUR TURN: use map() to turn knob (0 to 1023) into speed (0 to 255)',
    '',
    '  analogWrite(ENABLE, speed);   // PWM on the enable pin',
    '  Serial.print("knob ");',
    '  Serial.print(knob);',
    '  Serial.print("   speed ");',
    '  Serial.println(speed);',
    '  delay(100);',
    '}'].join('\n');
  var CLICK = [
    '// Mission 08, part 3: relay click test',
    '// The fan runs at a steady speed. The relay clicks its power on and off.',
    '',
    'const int ENABLE = 5;',
    'const int IN1 = 3;',
    'const int IN2 = 4;',
    'const int RELAY = 7;    // relay module S pin',
    '',
    'void setup() {',
    '  pinMode(ENABLE, OUTPUT);',
    '  pinMode(IN1, OUTPUT);',
    '  pinMode(IN2, OUTPUT);',
    '  pinMode(RELAY, OUTPUT);',
    '  digitalWrite(IN1, HIGH);     // forward',
    '  digitalWrite(IN2, LOW);',
    '  analogWrite(ENABLE, 200);    // a steady speed',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  digitalWrite(RELAY, HIGH);   // coil on: click! COM joins NO',
    '  Serial.println("Relay ON: the fan has power");',
    '  delay(3000);',
    '  digitalWrite(RELAY, LOW);    // coil off: the spring snaps COM back to NC',
    '  Serial.println("Relay OFF: no power to the fan");',
    '  delay(3000);',
    '}'].join('\n');
  var THERMO = [
    '// Mission 08, part 4: automatic fan (a thermostat with hysteresis)',
    '#include <DHT.h>',
    '',
    'const int ENABLE = 5;',
    'const int IN1 = 3;',
    'const int IN2 = 4;',
    'const int RELAY = 7;',
    'const int DHT_PIN = 2;',
    '',
    'const float ON_TEMP = 26.0;    // fan switches on above this',
    'const float OFF_TEMP = 24.0;   // ...and only switches off below this',
    '',
    'DHT dht(DHT_PIN, DHT11);',
    'bool fanOn = false;            // remembers what the fan is doing',
    '',
    'void setup() {',
    '  pinMode(ENABLE, OUTPUT);',
    '  pinMode(IN1, OUTPUT);',
    '  pinMode(IN2, OUTPUT);',
    '  pinMode(RELAY, OUTPUT);',
    '  digitalWrite(IN1, HIGH);     // forward',
    '  digitalWrite(IN2, LOW);',
    '  analogWrite(ENABLE, 220);    // speed whenever it runs',
    '  dht.begin();',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  float temp = dht.readTemperature();   // degrees Celsius',
    '  if (isnan(temp)) {                    // no answer from the sensor',
    '    Serial.println("DHT11 not responding: check the wire to pin 2");',
    '    delay(2000);',
    '    return;                             // skip the rest of loop() this time',
    '  }',
    '',
    '  if (!fanOn && temp > ON_TEMP) {',
    '    fanOn = true;                       // too warm: switch on',
    '  } else if (fanOn && temp < OFF_TEMP) {',
    '    fanOn = false;                      // cool enough: switch off',
    '  }',
    '  // between 24 and 26 nothing changes: the fan keeps doing what it was doing',
    '',
    '  if (fanOn) {',
    '    digitalWrite(RELAY, HIGH);',
    '  } else {',
    '    digitalWrite(RELAY, LOW);',
    '  }',
    '',
    '  Serial.print("Temperature: ");',
    '  Serial.print(temp);',
    '  Serial.print(" C   fan: ");',
    '  if (fanOn) Serial.println("ON"); else Serial.println("OFF");',
    '  delay(2000);                          // the DHT11 needs about 2 s between readings',
    '}'].join('\n');
  var SMART = [
    '/*',
    '  Mission 08: Smart fan',
    '  Knob turned all the way down -> AUTO: the DHT11 decides. The fan switches on',
    '                                 above 26 C, off below 24 C, and spins faster',
    '                                 the warmer it gets.',
    '  Knob turned up               -> MANUAL: the knob sets the speed.',
    '  The relay is the fan\'s power switch: it clicks on whenever the fan should run.',
    '*/',
    '#include <DHT.h>',
    '',
    'const int ENABLE = 5;      // L293D pin 1: speed (PWM)',
    'const int IN1 = 3;         // L293D pin 2: direction',
    'const int IN2 = 4;         // L293D pin 7: direction',
    'const int RELAY = 7;       // relay module S: the fan\'s power',
    'const int KNOB = A0;       // potentiometer middle leg',
    'const int DHT_PIN = 2;     // DHT11 S',
    '',
    'const float ON_TEMP = 26.0;',
    'const float OFF_TEMP = 24.0;',
    'const int AUTO_ZONE = 40;  // knob readings below this mean AUTO',
    '',
    'DHT dht(DHT_PIN, DHT11);',
    'bool hot = false;            // thermostat memory: too warm?',
    'float temp = 20.0;           // last good reading',
    'unsigned long lastRead = 0;  // when we last read the sensor (ms)',
    '',
    'void setup() {',
    '  pinMode(ENABLE, OUTPUT);',
    '  pinMode(IN1, OUTPUT);',
    '  pinMode(IN2, OUTPUT);',
    '  pinMode(RELAY, OUTPUT);',
    '  digitalWrite(IN1, HIGH);   // spin forward',
    '  digitalWrite(IN2, LOW);',
    '  dht.begin();',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  // 1. read the sensor every 2 seconds, without pausing everything else',
    '  if (millis() - lastRead >= 2000) {',
    '    lastRead = millis();',
    '    float t = dht.readTemperature();',
    '    if (!isnan(t)) {',
    '      temp = t;',
    '    }',
    '    if (!hot && temp > ON_TEMP) hot = true;    // hysteresis: on above 26',
    '    if (hot && temp < OFF_TEMP) hot = false;   // off below 24',
    '    Serial.print("Temp: ");',
    '    Serial.print(temp);',
    '    Serial.print(" C   too warm: ");',
    '    Serial.println(hot ? "yes" : "no");',
    '  }',
    '',
    '  // 2. pick the mode from the knob',
    '  int knob = analogRead(KNOB);',
    '  bool fanOn;',
    '  int speed;',
    '  if (knob < AUTO_ZONE) {',
    '    // AUTO: the thermostat decides; warmer = faster (24 C -> 150, 32 C -> 255)',
    '    fanOn = hot;',
    '    speed = constrain(map(temp, 24, 32, 150, 255), 150, 255);',
    '  } else {',
    '    // MANUAL: always on, and the knob sets the speed',
    '    fanOn = true;',
    '    speed = map(knob, AUTO_ZONE, 1023, 90, 255);',
    '  }',
    '',
    '  // 3. drive the relay and the L293D',
    '  digitalWrite(RELAY, fanOn ? HIGH : LOW);',
    '  analogWrite(ENABLE, speed);',
    '  delay(50);',
    '}'].join('\n');

  /* ================= art helpers ================= */
  /* a cardboard desk fan; returns { set(speed 0..1), stop() } */
  function fanArt(svg, x, y, sc) {
    sc = sc || 1;
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + sc + ')' }, svg);
    S('rect', { x: -110, y: 168, width: 220, height: 22, rx: 4, fill: CBD }, g);
    S('path', { d: 'M-22 168 L-12 -40 L12 -40 L22 168 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, g);
    S('circle', { cx: 0, cy: -52, r: 30, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, g);
    S('circle', { cx: 0, cy: -52, r: 92, fill: 'none', stroke: CBL, 'stroke-width': 7 }, g);
    for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; S('line', { x1: 14 * Math.cos(a), y1: -52 + 14 * Math.sin(a), x2: 90 * Math.cos(a), y2: -52 + 90 * Math.sin(a), stroke: '#e8d3a8', 'stroke-width': 3, opacity: 0.55 }, g); }
    var blade = S('g', {}, g);
    for (var i = 0; i < 3; i++) S('ellipse', { cx: 0, cy: -100, rx: 20, ry: 46, fill: '#fcd34d', opacity: 0.9, transform: 'rotate(' + (i * 120) + ' 0 -52)' }, blade);
    S('circle', { cx: 0, cy: -52, r: 11, fill: '#f59e0b' }, g);
    var blur = S('circle', { cx: 0, cy: -52, r: 88, fill: '#fcd34d', opacity: 0 }, g);
    var ang = 0, spd = 0, cur = 0, last = performance.now(), raf;
    (function tick(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; cur += (spd - cur) * Math.min(1, dt * 1.6); ang += cur * 900 * dt; blade.setAttribute('transform', 'rotate(' + ang + ' 0 -52)'); blur.setAttribute('opacity', Math.max(0, cur - 0.4) * 0.35); raf = requestAnimationFrame(tick); })(last);
    return { set: function (v) { spd = v; }, stop: function () { cancelAnimationFrame(raf); }, g: g };
  }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m08;
    var wrap = el('div', 'brief');
    var left = el('div', '');
    left.innerHTML = '<p class="lead">Motors move the world: fans, drones, electric cars, the hard drive in a server. In this mission you’ll build a desk fan that thinks for itself — it switches on when the room gets warm, off when it’s cool again, and lets you take over with a speed knob.</p>' +
      '<p>A motor is the first part in this course that’s too hungry for an Arduino pin. You’ll learn why, and how engineers solve it: a <b>driver chip</b> that switches the motor’s current, its own <b>power supply</b>, a <b>relay</b> that clicks the power on and off, and a thermostat that doesn’t flicker. Then you’ll build a safe cardboard stand for it.</p>';
    UI.edp(left, [2, 4, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360,
      init: function (svg, S2, st) {
        glowDefs(svg); bg(svg, 800, 360); grid(svg, 800, 360);
        var fan = fanArt(svg, 190, 160, 0.95);
        // thermometer card
        S('rect', { x: 400, y: 40, width: 360, height: 280, rx: 6, fill: PANEL, stroke: GRID }, svg);
        T(svg, 420, 66, 'AUTO MODE', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        var tt = T(svg, 420, 110, '22.0 °C', { 'font-size': 34, 'font-weight': 600, fill: INK });
        var stx = T(svg, 620, 100, 'FAN OFF', { 'font-size': 14, 'letter-spacing': '2', fill: MUT });
        var click = T(svg, 620, 124, '', { 'font-size': 12, 'letter-spacing': '1.5', fill: CY });
        // mini graph
        var gx = 420, gy = 150, gw = 320, gh = 140, lo = 21, hi = 28;
        function Y(t) { return gy + gh - (t - lo) / (hi - lo) * gh; }
        S('rect', { x: gx, y: gy, width: gw, height: gh, fill: BG, stroke: GRID }, svg);
        [[26, 'ON 26 °C'], [24, 'OFF 24 °C']].forEach(function (l) { S('line', { x1: gx, y1: Y(l[0]), x2: gx + gw, y2: Y(l[0]), stroke: l[0] === 26 ? CY : LINE, 'stroke-dasharray': '4 4', opacity: 0.8 }, svg); T(svg, gx + gw - 4, Y(l[0]) - 5, l[1], { 'text-anchor': 'end', 'font-size': 10, fill: l[0] === 26 ? CY : MUT }); });
        var trace = S('polyline', { points: '', fill: 'none', stroke: INK, 'stroke-width': 2 }, svg);
        var temp = 22, on = false, pts = [], last = performance.now(), acc = 0;
        (function tick(t) {
          var dt = Math.min(0.05, (t - last) / 1000); last = t; acc += dt;
          while (acc > 0.05) {
            acc -= 0.05;
            temp += on ? -0.035 : 0.03;
            if (!on && temp > 26) { on = true; click.textContent = 'CLICK · RELAY ON'; st.later(function () { click.textContent = ''; }, 1200); }
            if (on && temp < 24) { on = false; click.textContent = 'CLACK · RELAY OFF'; st.later(function () { click.textContent = ''; }, 1200); }
            pts.push(temp); if (pts.length > 160) pts.shift();
          }
          fan.set(on ? 0.85 : 0);
          tt.textContent = temp.toFixed(1) + ' °C';
          stx.textContent = on ? 'FAN ON' : 'FAN OFF'; stx.setAttribute('fill', on ? GO : MUT);
          trace.setAttribute('points', pts.map(function (v, i) { return (gx + i * 2) + ',' + Y(v); }).join(' '));
          st.raf = requestAnimationFrame(tick);
        })(last);
        st.stop = function () { cancelAnimationFrame(st.raf); fan.stop(); };
      },
      frames: [{ cap: 'In AUTO mode the room warms up, the fan clicks on above <b>26 °C</b>, cools the air, and clicks off below <b>24 °C</b>. Turn the knob and you take over the speed yourself.', draw: function () {} }] });
    UI.callout(b, 'safety', 'Safety', '<ul><li><b>Fingers, hair and cords away from the blade.</b> Even a small fan blade spinning at a few thousand RPM can cut skin or yank hair. Build the guard before you run it at full speed.</li><li><b>Never connect the motor straight to an Arduino pin</b> (or to the UNO’s 5V pin). You’ll see why in Step 02.</li><li><b>Battery care:</b> switch the power module off whenever you’re not testing, never let the battery snap’s two contacts touch, and unplug the battery at the end of class. A 9V battery that’s shorted gets hot fast.</li></ul>');
  } });

  /* ---------- 02 motors ---------- */
  steps.push({ id: 'motor', title: 'How a DC motor spins', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Inside your little silver motor there’s no magic: a <b>coil of wire</b>, two <b>magnets</b>, and a clever rotating switch called a <b>commutator</b>. Put current through the coil and the magnets push it around.</p>');
    motorExplainer(b);
    UI.mcq(b, ctx, { id: 'q-comm', q: 'What does the commutator do?', options: ['It stores energy like a battery', 'It flips the current in the coil every half turn, so the push always turns the coil the same way', 'It makes the magnets stronger', 'It measures how fast the motor spins'], answer: 1, explain: 'Without it, the coil would rock back and forth and stop. The commutator swaps which brush touches which end of the coil at the right moment, so the motor keeps turning.', hints: { 0: 'The battery is outside the motor. Think about what changes every half turn.', 2: 'The magnets are permanent — nothing changes them.' } });
    UI.html(b, '<h2>Why not plug it into a pin?</h2><p>An LED was easy: one pin, one resistor. A motor is a different animal.</p>');
    driverExplainer(b);
    UI.mcq(b, ctx, { id: 'q-driver', q: 'Your partner says, “Let’s skip the chip and wire the motor between pin 5 and GND.” What’s the best reply?', options: ['Fine, it just spins slower', 'The motor needs far more current than a pin can give (about 20 mA), and its kickback spike can damage the UNO — use the L293D and the power module', 'It works if we add a 220 Ω resistor', 'It only works on a ~ pin'], answer: 1, explain: 'A pin is a signal, not a power source. The L293D takes the pin’s tiny signal and switches the battery’s big current, and its built-in diodes swallow the kickback.', hints: { 2: '5 V ÷ 220 Ω ≈ 23 mA — nowhere near enough to turn the motor. And the kickback would still hit the pin.', 3: 'The ~ means PWM. It doesn’t add any current.' } });
  } });
  function motorExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Magnets, a coil and a commutator', w: 820, h: 360,
      init: function (svg, S2, st) {
        arrowDefs(svg); glowDefs(svg); bg(svg, 820, 360);
        var cx = 300, cy = 170, R = 92;
        // field lines
        st.field = S('g', {}, svg);
        for (var y = 96; y <= 244; y += 37) S('line', { x1: 156, y1: y, x2: 444, y2: y, stroke: CY, 'stroke-width': 1.5, 'stroke-dasharray': '6 8', opacity: 0.5, 'marker-end': 'url(#m8a-c)', 'class': 'm8-fl' }, st.field);
        // magnets
        S('rect', { x: 70, y: 70, width: 86, height: 200, rx: 6, fill: NCOL }, svg); T(svg, 113, 180, 'N', { 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 700, fill: '#ffe1e1' });
        S('rect', { x: 444, y: 70, width: 86, height: 200, rx: 6, fill: SCOL }, svg); T(svg, 487, 180, 'S', { 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 700, fill: '#e1eaff' });
        T(svg, 113, 292, 'MAGNET', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); T(svg, 487, 292, 'MAGNET', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // coil (end-on: the two long sides of the loop are the dots)
        st.coil = S('line', { x1: cx - R, y1: cy, x2: cx + R, y2: cy, stroke: COPPER, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
        st.ring = S('g', {}, svg);
        st.segA = S('path', { d: '', fill: 'none', stroke: '#c9a227', 'stroke-width': 9 }, st.ring);
        st.segB = S('path', { d: '', fill: 'none', stroke: '#c9a227', 'stroke-width': 9 }, st.ring);
        st.brushL = S('rect', { x: cx - 50, y: cy - 7, width: 16, height: 14, rx: 2, fill: '#3b4350', stroke: LINE }, st.ring);
        st.brushR = S('rect', { x: cx + 34, y: cy - 7, width: 16, height: 14, rx: 2, fill: '#3b4350', stroke: LINE }, st.ring);
        st.ends = [0, 1].map(function () { var g = S('g', {}, svg); S('circle', { r: 15, fill: '#3a2410', stroke: COPPER, 'stroke-width': 3 }, g); var dot = S('circle', { r: 4, fill: INK }, g); var x = S('path', { d: 'M-7 -7 L7 7 M7 -7 L-7 7', stroke: INK, 'stroke-width': 2.5 }, g); return { g: g, dot: dot, x: x }; });
        st.forces = [0, 1].map(function () { return S('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: CY, 'stroke-width': 4, 'marker-end': 'url(#m8a-c)', opacity: 0 }, svg); });
        // battery + brush wires
        st.bat = S('g', {}, svg);
        S('path', { d: 'M' + (cx - 42) + ' ' + (cy + 7) + ' L' + (cx - 42) + ' 330 L' + (cx - 24) + ' 330 M' + (cx + 42) + ' ' + (cy + 7) + ' L' + (cx + 42) + ' 330 L' + (cx + 24) + ' 330', stroke: LINE, 'stroke-width': 2, fill: 'none' }, st.bat);
        S('line', { x1: cx - 24, y1: 318, x2: cx - 24, y2: 342, stroke: INK, 'stroke-width': 3 }, st.bat); S('line', { x1: cx + 24, y1: 322, x2: cx + 24, y2: 338, stroke: INK, 'stroke-width': 5 }, st.bat);
        st.batL = T(st.bat, cx - 40, 316, '+', { 'text-anchor': 'middle', fill: '#ff6b6b', 'font-size': 16 }); st.batR = T(st.bat, cx + 40, 316, '−', { 'text-anchor': 'middle', fill: '#7da2ff', 'font-size': 16 });
        // legend / readouts
        var lx = 580;
        T(svg, lx, 60, 'END-ON VIEW OF THE COIL', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        var l1 = S('g', { transform: 'translate(' + (lx + 12) + ' 92)' }, svg); S('circle', { r: 11, fill: '#3a2410', stroke: COPPER, 'stroke-width': 2 }, l1); S('circle', { r: 3, fill: INK }, l1); P(svg, lx + 32, 97, 'current out of the screen');
        var l2 = S('g', { transform: 'translate(' + (lx + 12) + ' 122)' }, svg); S('circle', { r: 11, fill: '#3a2410', stroke: COPPER, 'stroke-width': 2 }, l2); S('path', { d: 'M-5 -5 L5 5 M5 -5 L-5 5', stroke: INK, 'stroke-width': 2 }, l2); P(svg, lx + 32, 127, 'current into the screen');
        S('line', { x1: lx, y1: 152, x2: lx + 26, y2: 152, stroke: CY, 'stroke-width': 3, 'marker-end': 'url(#m8a-c)' }, svg); P(svg, lx + 32, 157, 'push on the wire');
        S('rect', { x: lx + 4, y: 172, width: 16, height: 10, fill: '#c9a227' }, svg); P(svg, lx + 32, 182, 'commutator + brushes');
        st.big = T(svg, lx, 232, '', { fill: CY, 'font-size': 15, 'letter-spacing': '1.5' });
        st.small = P(svg, lx, 256, '', { fill: MUT });
        st.swap = T(svg, cx, 40, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 13, 'letter-spacing': '2' });
        var th = 0, w = 0, last = performance.now(), prevSide = 1;
        st.cfg = { field: 1, cur: 0, mode: 'still', dir: 1, v: 1 };
        st.reset = function (a) { th = a || 0; w = 0; };
        function arc(a0, a1) { var r = 26, x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1); return 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 0 0 ' + x1 + ' ' + y1; }
        (function tick(t) {
          var dt = Math.min(0.04, (t - last) / 1000); last = t; var c = st.cfg;
          if (c.mode === 'rock') { var acc = 9 * Math.cos(th) * c.dir - 1.6 * w; w += acc * dt; th += w * dt; }
          else if (c.mode === 'run') { var acc2 = 14 * Math.abs(Math.cos(th)) * c.dir * c.v + 1.2 * c.dir * c.v - 2.2 * w; w += acc2 * dt; th += w * dt; }
          else { w *= 0.9; th += w * dt; }
          var ex = R * Math.cos(th), ey = -R * Math.sin(th);
          st.coil.setAttribute('x1', cx - ex); st.coil.setAttribute('y1', cy - ey); st.coil.setAttribute('x2', cx + ex); st.coil.setAttribute('y2', cy + ey);
          var pos = [[cx + ex, cy + ey], [cx - ex, cy - ey]];
          // which end carries current "out": with a commutator, whichever end is on the right (for dir 1)
          var side = Math.cos(th) >= 0 ? 1 : -1;
          if (c.mode === 'run' && side !== prevSide) { st.swap.textContent = 'COMMUTATOR SWAPS THE CURRENT'; st.later(function () { st.swap.textContent = ''; }, 380); }
          prevSide = side;
          var outEnd = c.mode === 'run' ? (side === 1 ? 0 : 1) : 0;
          if (c.dir < 0 && c.mode === 'run') outEnd = 1 - outEnd;
          st.ends.forEach(function (e, i) {
            e.g.setAttribute('transform', 'translate(' + pos[i][0] + ' ' + pos[i][1] + ')');
            var out = i === outEnd; e.dot.setAttribute('opacity', c.cur && out ? 1 : 0); e.x.setAttribute('opacity', c.cur && !out ? 1 : 0);
            var f = st.forces[i], up = out ? -1 : 1;
            f.setAttribute('x1', pos[i][0]); f.setAttribute('y1', pos[i][1] + up * 18); f.setAttribute('x2', pos[i][0]); f.setAttribute('y2', pos[i][1] + up * 58); f.setAttribute('opacity', c.cur ? 1 : 0);
          });
          var gapA = th + Math.PI / 2;
          st.segA.setAttribute('d', arc(gapA + 0.2, gapA + Math.PI - 0.2)); st.segB.setAttribute('d', arc(gapA + Math.PI + 0.2, gapA + 2 * Math.PI - 0.2));
          st.ring.setAttribute('opacity', c.mode === 'rock' ? 0.15 : 1);
          st.field.setAttribute('opacity', c.field ? 1 : 0.15);
          st.raf = requestAnimationFrame(tick);
        })(last);
        var dash = 0; st.fl = setInterval(function () { dash = (dash + 2) % 14; st.field.querySelectorAll('.m8-fl').forEach(function (l) { l.setAttribute('stroke-dashoffset', -dash); }); }, 50);
        st.stop = function () { cancelAnimationFrame(st.raf); clearInterval(st.fl); };
        st.say = function (a, b2) { st.big.textContent = a; st.small.textContent = b2 || ''; };
        st.flip = function (d) { st.batL.textContent = d > 0 ? '+' : '−'; st.batR.textContent = d > 0 ? '−' : '+'; st.batL.setAttribute('fill', d > 0 ? '#ff6b6b' : '#7da2ff'); st.batR.setAttribute('fill', d > 0 ? '#7da2ff' : '#ff6b6b'); };
      },
      frames: [
        { cap: '<b>Two magnets make a magnetic field</b> that runs from the north pole to the south pole (the cyan lines). Between them sits a coil of copper wire on a shaft. You’re looking at it end-on: each round dot is one side of the coil.', draw: function (svg, S2, st) { st.cfg = { field: 1, cur: 0, mode: 'still', dir: 1, v: 1 }; st.reset(0); st.flip(1); st.say('MAGNETIC FIELD', 'N → S, always on'); } },
        { cap: '<b>A wire carrying current in a magnetic field gets pushed.</b> Current comes out of one side of the coil and goes back in the other, so one side is pushed up and the other down — the coil twists. But a plain loop only twists until it’s upright, then the push drags it back: it rocks and stops.', draw: function (svg, S2, st) { st.cfg = { field: 1, cur: 1, mode: 'rock', dir: 1, v: 1 }; st.reset(0.05); st.flip(1); st.say('ROCKS, THEN STOPS', 'no commutator'); } },
        { cap: '<b>The commutator keeps it turning.</b> It’s a split copper ring on the shaft, touched by two brushes. Every half turn, just as the coil passes upright, the ring swaps which end of the coil gets the +. The current flips, the push flips, and the coil keeps spinning the same way. Real motors use several coils and an iron core so the push is smooth.', draw: function (svg, S2, st) { st.cfg = { field: 1, cur: 1, mode: 'run', dir: 1, v: 1 }; st.flip(1); st.say('SPINS', 'commutator flips the current'); } },
        { cap: '<b>Swap the battery and it spins the other way.</b> Reverse the current and every push reverses too. That’s why your fan will need a way to flip the motor’s two wires: an <b>H-bridge</b> (Step 03).', draw: function (svg, S2, st) { st.cfg = { field: 1, cur: 1, mode: 'run', dir: -1, v: 1 }; st.flip(-1); st.say('REVERSED', 'swap + and − → spins backward'); } },
        { cap: '<b>More voltage, more current, more push: faster.</b> Your kit’s motor is made for about 3–6 V and can spin thousands of times a minute with no load. To control the speed, you’ll control how much of the time it gets power (PWM, Step 06).', draw: function (svg, S2, st) { st.cfg = { field: 1, cur: 1, mode: 'run', dir: 1, v: 2.4 }; st.flip(1); st.say('FASTER', 'more voltage = more push'); } }
      ] });
  }
  function driverExplainer(b) {
    function fresh(svg, st) { (st.flows || []).forEach(function (f) { f.stop(); }); st.flows = []; clear(svg); glowDefs(svg); arrowDefs(svg); bg(svg, 820, 360); }
    function uno(svg, x, y, lab) { S('rect', { x: x, y: y, width: 120, height: 150, rx: 6, fill: '#15497a', stroke: '#2e6aa3' }, svg); T(svg, x + 60, y + 26, lab || 'UNO', { 'text-anchor': 'middle', 'font-size': 11, 'letter-spacing': '2', fill: '#cfe3f5' }); }
    function motorIcon(svg, x, y, spin, st) {
      S('rect', { x: x - 40, y: y - 26, width: 80, height: 52, rx: 20, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, svg);
      T(svg, x, y + 5, 'M', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#33404e' });
      if (spin) { var g = S('g', {}, svg); for (var i = 0; i < 3; i++) S('ellipse', { cx: x + 70, cy: y - 18, rx: 7, ry: 18, fill: '#fcd34d', transform: 'rotate(' + i * 120 + ' ' + (x + 70) + ' ' + y + ')' }, g); var a = 0; st.int = setInterval(function () { a += 24 * spin; g.setAttribute('transform', 'rotate(' + a + ' ' + (x + 70) + ' ' + y + ')'); }, 40); }
    }
    UI.explainer(b, { label: 'Explainer', title: 'Why a motor needs a driver and its own power', w: 820, h: 360,
      init: function (svg, S2, st) { st.flows = []; st.stop = function () { (st.flows || []).forEach(function (f) { f.stop(); }); clearInterval(st.int); }; },
      frames: [
        { cap: '<b>Current is the problem.</b> An UNO pin is designed for about <b>20 mA</b> (40 mA is the absolute maximum before damage). That’s plenty for an LED. Your motor needs about <b>150–250 mA</b> just to keep spinning, and <b>500 mA or more</b> for a moment every time it starts or gets blocked.', draw: function (svg, S2, st) {
          fresh(svg, st); clearInterval(st.int);
          T(svg, 60, 50, 'CURRENT (mA)', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var bars = [['LED', 15, CY], ['PIN LIMIT', 20, INK], ['PIN MAX', 40, SIG], ['MOTOR RUNNING', 200, CY], ['MOTOR STARTING', 550, SIG]], x0 = 220, sc = 0.9;
          bars.forEach(function (bb, i) {
            var y = 80 + i * 52; T(svg, x0 - 14, y + 22, bb[0], { 'text-anchor': 'end', 'font-size': 12, 'letter-spacing': '1', fill: MUT });
            var r = S('rect', { x: x0, y: y + 6, width: 0, height: 26, rx: 3, fill: bb[2], opacity: 0.85 }, svg);
            var lab = T(svg, x0 + 8, y + 24, '', { 'font-size': 13, fill: INK });
            st.later(function () { r.style.transition = 'width 0.8s ease'; r.setAttribute('width', bb[1] * sc); lab.setAttribute('x', x0 + Math.max(bb[1], 40) * sc + 10); lab.textContent = '≈ ' + bb[1] + ' mA'; }, 150 + i * 350);
          });
          S('line', { x1: x0 + 40 * sc, y1: 70, x2: x0 + 40 * sc, y2: 340, stroke: SIG, 'stroke-dasharray': '4 4' }, svg);
          T(svg, x0 + 40 * sc + 6, 344, 'a pin can’t go past here', { 'font-size': 11, fill: SIG });
        } },
        { cap: '<b>Wire it to a pin anyway and something gives.</b> The pin can’t supply the current, so the motor barely twitches, the pin overheats, and the whole UNO can brown out and reset. Do it often enough and that pin (or the chip) is dead for good.', draw: function (svg, S2, st) {
          fresh(svg, st); clearInterval(st.int);
          uno(svg, 80, 100); T(svg, 140, 180, 'PIN 5', { 'text-anchor': 'middle', 'font-size': 12 });
          var p = S('path', { d: 'M200 160 L420 160 L420 260 L200 260', fill: 'none', stroke: SIG, 'stroke-width': 3 }, svg);
          motorIcon(svg, 480, 210, 0, st);
          S('path', { d: 'M420 160 L480 160 L480 184 M480 236 L480 260 L420 260', fill: 'none', stroke: SIG, 'stroke-width': 3 }, svg);
          var f = flow(svg, p, 6, SIG, 4); f.setSpeed(30); st.flows.push(f);
          var w1 = T(svg, 140, 300, 'OVERLOADED', { 'text-anchor': 'middle', fill: SIG, 'font-size': 14, 'letter-spacing': '2' });
          S('circle', { cx: 140, cy: 175, r: 60, fill: 'url(#m8g-orange)', opacity: 0.5 }, svg);
          T(svg, 600, 160, 'motor: barely twitches', { 'font-size': 13, fill: MUT }); T(svg, 600, 186, 'pin: too hot', { 'font-size': 13, fill: SIG }); T(svg, 600, 212, 'UNO: may reset', { 'font-size': 13, fill: SIG });
          var on = true; st.int = setInterval(function () { on = !on; w1.setAttribute('opacity', on ? 1 : 0.3); }, 400);
        } },
        { cap: '<b>Then there’s the kickback.</b> A motor’s coil is an electromagnet, and it stores energy in its magnetic field. Switch it off suddenly and the field collapses, pushing out a <b>voltage spike</b> that can be dozens of volts, far above 5 V. Sensitive chips hate that.', draw: function (svg, S2, st) {
          fresh(svg, st); clearInterval(st.int);
          var gx = 90, gy = 60, gw = 640, gh = 240; S('rect', { x: gx, y: gy, width: gw, height: gh, fill: BG, stroke: GRID }, svg);
          T(svg, gx, gy - 14, 'VOLTAGE ACROSS THE MOTOR', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          function Y(v) { return gy + gh - (v + 10) / 50 * gh; }
          [0, 5, 30].forEach(function (v) { S('line', { x1: gx, y1: Y(v), x2: gx + gw, y2: Y(v), stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, gx - 8, Y(v) + 4, v + ' V', { 'text-anchor': 'end', 'font-size': 11, fill: MUT }); });
          var pts = [], line = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg), i = 0;
          var lab = T(svg, gx + 360, Y(33), '', { fill: SIG, 'font-size': 13, 'letter-spacing': '1.5' });
          (function stepG() {
            if (i > 160) return; var x = gx + i * 4, v = i < 30 ? 0 : i < 90 ? 5 : i < 93 ? 32 - (i - 90) * 6 : 0;
            pts.push(x + ',' + Y(v)); line.setAttribute('points', pts.join(' ')); if (i === 91) { lab.textContent = 'SWITCH OFF → SPIKE!'; line.setAttribute('stroke', SIG); } i++; st.later(stepG, 16);
          })();
          T(svg, gx + 130, Y(5) - 10, 'ON: 5 V', { fill: CY, 'font-size': 12 });
        } },
        { cap: '<b>The fix: a driver chip and a separate power supply.</b> The UNO pin only sends a tiny signal (about 1 mA) to the <b>L293D</b>. The L293D does the heavy switching, taking the motor’s current from the <b>power supply module</b>, not from the UNO. The “D” in L293D stands for its built-in <b>diodes</b>, which give the kickback a safe path so the spike never reaches your board.', draw: function (svg, S2, st) {
          fresh(svg, st); clearInterval(st.int);
          uno(svg, 40, 110); T(svg, 100, 180, 'PIN 5', { 'text-anchor': 'middle', 'font-size': 12 });
          S('rect', { x: 290, y: 130, width: 120, height: 110, rx: 4, fill: '#1a1d22', stroke: '#3b4350' }, svg); T(svg, 350, 190, 'L293D', { 'text-anchor': 'middle', 'font-size': 14, 'letter-spacing': '2' });
          var sig = S('path', { d: 'M160 170 L290 170', fill: 'none', stroke: LINE, 'stroke-width': 2 }, svg);
          var f1 = flow(svg, sig, 3, CY, 3); f1.setSpeed(40); st.flows.push(f1); T(svg, 225, 160, 'signal ≈ 1 mA', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
          S('rect', { x: 330, y: 20, width: 150, height: 52, rx: 4, fill: '#16191e', stroke: '#3b4350' }, svg); T(svg, 405, 42, 'POWER MODULE', { 'text-anchor': 'middle', 'font-size': 10, 'letter-spacing': '1.5', fill: MUT }); T(svg, 405, 60, '9V battery → 5 V', { 'text-anchor': 'middle', 'font-size': 11 });
          var big = S('path', { d: 'M400 72 L400 130 M410 240 L410 290 L600 290 L600 236 M600 184 L600 150 L480 150 L480 72', fill: 'none', stroke: LINE, 'stroke-width': 3 }, svg);
          var pth = S('path', { d: 'M400 72 L400 130 L400 240 L410 290 L600 290 L600 150 L480 150 L480 72 Z', fill: 'none', stroke: 'none' }, svg);
          var f2 = flow(svg, pth, 14, CY, 4.5); f2.setSpeed(90); st.flows.push(f2);
          motorIcon(svg, 600, 210, 1, st);
          T(svg, 640, 300, 'motor current ≈ 200 mA', { 'font-size': 12, fill: CY }); T(svg, 640, 318, 'from the battery, not the UNO', { 'font-size': 11, fill: MUT });
          S('path', { d: 'M300 252 l10 -14 l10 14 z M300 238 h20', stroke: GO, 'stroke-width': 2, fill: 'none' }, svg); T(svg, 330, 254, 'built-in diodes', { 'font-size': 11, fill: GO });
        } },
        { cap: '<b>One more rule: a common ground.</b> “HIGH” means “5 V higher than ground.” The L293D can only understand the UNO’s signal if they agree where ground is, so the UNO’s GND and the power module’s GND must be joined. The + sides stay separate.', draw: function (svg, S2, st) {
          fresh(svg, st); clearInterval(st.int);
          uno(svg, 60, 90, 'UNO (USB)'); S('rect', { x: 600, y: 90, width: 160, height: 150, rx: 6, fill: '#16191e', stroke: '#3b4350' }, svg); T(svg, 680, 116, 'POWER MODULE', { 'text-anchor': 'middle', 'font-size': 11, 'letter-spacing': '1.5', fill: MUT });
          S('rect', { x: 340, y: 110, width: 120, height: 100, rx: 4, fill: '#1a1d22', stroke: '#3b4350' }, svg); T(svg, 400, 166, 'L293D', { 'text-anchor': 'middle', 'font-size': 14, 'letter-spacing': '2' });
          S('path', { d: 'M180 130 L340 130', stroke: '#e5484d', 'stroke-width': 3 }, svg); T(svg, 260, 122, '5V (logic, VCC1)', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
          S('path', { d: 'M600 130 L460 130', stroke: '#e5484d', 'stroke-width': 3 }, svg); T(svg, 530, 122, '5V (motor, VCC2)', { 'text-anchor': 'middle', 'font-size': 11, fill: MUT });
          var gl = S('path', { d: 'M120 240 L120 300 L680 300 L680 240 M400 210 L400 300', stroke: CY, 'stroke-width': 4, fill: 'none' }, svg);
          T(svg, 400, 330, 'GND — ALL JOINED (COMMON GROUND)', { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '1.5' });
          T(svg, 400, 60, 'the two + sides are NOT connected', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
        } }
      ] });
  }

  /* ---------- 03 H-bridge ---------- */
  /* draws the 4-switch bridge; returns an object to set switch states and run the animation */
  function hbridge(svg, st, w) {
    arrowDefs(svg); glowDefs(svg); bg(svg, w, 360);
    var X1 = 230, X2 = 530, TOP = 50, BOT = 310, MID = 180, MX = 380;
    S('path', { d: 'M110 ' + TOP + ' L' + X2 + ' ' + TOP + ' M110 ' + BOT + ' L' + X2 + ' ' + BOT, stroke: LINE, 'stroke-width': 3 }, svg);
    S('path', { d: 'M110 ' + TOP + ' L110 158 M110 202 L110 ' + BOT, stroke: LINE, 'stroke-width': 3 }, svg);
    S('line', { x1: 90, y1: 160, x2: 130, y2: 160, stroke: INK, 'stroke-width': 3 }, svg); S('line', { x1: 98, y1: 200, x2: 122, y2: 200, stroke: INK, 'stroke-width': 6 }, svg);
    T(svg, 76, 150, '+', { fill: '#ff6b6b', 'font-size': 16, 'text-anchor': 'middle' }); T(svg, 76, 214, '−', { fill: '#7da2ff', 'font-size': 16, 'text-anchor': 'middle' });
    T(svg, 60, 250, 'MOTOR', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' }); T(svg, 60, 264, 'POWER', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    S('path', { d: 'M' + X1 + ' ' + TOP + ' L' + X1 + ' 84 M' + X1 + ' 136 L' + X1 + ' 224 M' + X1 + ' 276 L' + X1 + ' ' + BOT, stroke: LINE, 'stroke-width': 3 }, svg);
    S('path', { d: 'M' + X2 + ' ' + TOP + ' L' + X2 + ' 84 M' + X2 + ' 136 L' + X2 + ' 224 M' + X2 + ' 276 L' + X2 + ' ' + BOT, stroke: LINE, 'stroke-width': 3 }, svg);
    S('path', { d: 'M' + X1 + ' ' + MID + ' L' + (MX - 44) + ' ' + MID + ' M' + (MX + 44) + ' ' + MID + ' L' + X2 + ' ' + MID, stroke: LINE, 'stroke-width': 3 }, svg);
    var sw = {};
    [['S1', X1, 84, 136], ['S2', X1, 224, 276], ['S3', X2, 84, 136], ['S4', X2, 224, 276]].forEach(function (s) {
      var g = S('g', {}, svg);
      S('circle', { cx: s[1], cy: s[2], r: 4.5, fill: LINE }, g); S('circle', { cx: s[1], cy: s[3], r: 4.5, fill: LINE }, g);
      var lev = S('line', { x1: s[1], y1: s[3], x2: s[1] + 24, y2: s[2] + 8, stroke: LINE, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
      T(g, s[1] + (s[1] === X1 ? -18 : 34), (s[2] + s[3]) / 2 + 5, s[0], { 'text-anchor': s[1] === X1 ? 'end' : 'start', 'font-size': 13, fill: MUT, 'letter-spacing': '1' });
      sw[s[0]] = { lev: lev, x: s[1], y1: s[2], y2: s[3] };
    });
    T(svg, X1 - 16, MID + 22, 'A', { 'text-anchor': 'end', 'font-size': 12, fill: MUT }); T(svg, X2 + 16, MID + 22, 'B', { 'font-size': 12, fill: MUT });
    S('circle', { cx: MX, cy: MID, r: 44, fill: '#1b2533', stroke: '#c0c6cc', 'stroke-width': 3 }, svg);
    var rotor = S('g', {}, svg);
    for (var i = 0; i < 3; i++) S('ellipse', { cx: MX, cy: MID - 20, rx: 8, ry: 20, fill: '#fcd34d', opacity: 0.9, transform: 'rotate(' + i * 120 + ' ' + MX + ' ' + MID + ')' }, rotor);
    S('circle', { cx: MX, cy: MID, r: 6, fill: '#f59e0b' }, svg);
    var mode = T(svg, MX, 345, '', { 'text-anchor': 'middle', 'font-size': 15, 'letter-spacing': '2', fill: CY });
    var dirA = T(svg, MX, 120, '', { 'text-anchor': 'middle', 'font-size': 22, fill: CY });
    var pathEl = S('path', { d: 'M0 0', fill: 'none', stroke: 'none' }, svg), fl = null, glow = S('path', { d: '', fill: 'none', stroke: CY, 'stroke-width': 7, opacity: 0.18, 'stroke-linejoin': 'round' }, svg);
    var spd = 0, target = 0, rate = 1.2, ang = 0, last = performance.now(), raf;
    (function tick(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; spd += (target - spd) * Math.min(1, dt * rate); ang += spd * 600 * dt; rotor.setAttribute('transform', 'rotate(' + ang + ' ' + MX + ' ' + MID + ')'); if (fl && fl.decay) fl.setSpeed(Math.abs(spd) * 160 * Math.sign(fl.decay)); raf = requestAnimationFrame(tick); })(last);
    var PATHS = {
      fwd: 'M110 ' + BOT + ' L110 ' + TOP + ' L' + X1 + ' ' + TOP + ' L' + X1 + ' ' + MID + ' L' + X2 + ' ' + MID + ' L' + X2 + ' ' + BOT + ' Z',
      rev: 'M110 ' + BOT + ' L110 ' + TOP + ' L' + X2 + ' ' + TOP + ' L' + X2 + ' ' + MID + ' L' + X1 + ' ' + MID + ' L' + X1 + ' ' + BOT + ' Z',
      brakeLo: 'M' + X1 + ' ' + MID + ' L' + X2 + ' ' + MID + ' L' + X2 + ' ' + BOT + ' L' + X1 + ' ' + BOT + ' Z',
      brakeHi: 'M' + X1 + ' ' + MID + ' L' + X2 + ' ' + MID + ' L' + X2 + ' ' + TOP + ' L' + X1 + ' ' + TOP + ' Z',
      short: 'M110 ' + BOT + ' L110 ' + TOP + ' L' + X1 + ' ' + TOP + ' L' + X1 + ' ' + BOT + ' Z'
    };
    var api = {
      set: function (o) { // o: { S1..S4: bool, kind: 'fwd'|'rev'|'brakeLo'|'brakeHi'|'short'|null, label }
        ['S1', 'S2', 'S3', 'S4'].forEach(function (k) { var s = sw[k], on = !!o[k]; s.lev.setAttribute('x2', on ? s.x : s.x + 24); s.lev.setAttribute('y2', on ? s.y1 : s.y1 + 8); s.lev.setAttribute('stroke', on ? (o.kind === 'short' ? SIG : CY) : LINE); });
        if (fl) { fl.stop(); fl = null; }
        glow.setAttribute('d', o.kind ? PATHS[o.kind] : ''); glow.setAttribute('stroke', o.kind === 'short' ? SIG : CY);
        if (o.kind) { pathEl.setAttribute('d', PATHS[o.kind]); fl = flow(svg, pathEl, o.kind === 'short' ? 22 : 16, o.kind === 'short' ? SIG : CY, 4); fl.setSpeed(o.kind === 'short' ? 320 : 110); if (/brake/.test(o.kind)) fl.decay = spd >= 0 ? -1 : 1; }
        target = o.kind === 'fwd' ? 1 : o.kind === 'rev' ? -1 : 0; rate = /brake/.test(o.kind || '') ? 5 : o.kind ? 1.4 : 0.35;
        mode.textContent = o.label || ''; mode.setAttribute('fill', o.kind === 'short' ? SIG : CY);
        dirA.textContent = o.kind === 'fwd' ? '↻' : o.kind === 'rev' ? '↺' : ''; dirA.setAttribute('x', MX);
      },
      stop: function () { cancelAnimationFrame(raf); if (fl) fl.stop(); }
    };
    return api;
  }
  steps.push({ id: 'hbridge', title: 'The H-bridge', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">To run a fan backward you have to swap its two wires. An <b>H-bridge</b> does that with four electronic switches — no rewiring. Drawn out, the switches and the motor make the letter H.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Four switches, four moves', w: 820, h: 360,
      init: function (svg, S2, st) {
        st.hb = hbridge(svg, st, 820);
        st.tbl = S('g', {}, svg);
        T(svg, 620, 60, 'CLOSED SWITCHES', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        st.rows = [['S1 + S4', 'FORWARD'], ['S3 + S2', 'BACKWARD'], ['S2 + S4', 'BRAKE'], ['none', 'COAST'], ['S1 + S2', 'SHORT!']].map(function (r, i) {
          var g = S('g', {}, svg), y = 86 + i * 40; var bx = S('rect', { x: 610, y: y - 20, width: 190, height: 32, rx: 4, fill: PANEL, stroke: GRID }, g);
          T(g, 622, y, r[0], { 'font-size': 12 }); T(g, 790, y, r[1], { 'font-size': 12, 'text-anchor': 'end', fill: i === 4 ? SIG : MUT, 'letter-spacing': '1' }); return bx;
        });
        st.hl = function (k) { st.rows.forEach(function (r, i) { r.setAttribute('stroke', i === k ? (k === 4 ? SIG : CY) : GRID); r.setAttribute('fill', i === k ? (k === 4 ? '#2a160b' : '#0a2a36') : PANEL); }); };
        st.stop = function () { st.hb.stop(); };
      },
      frames: [
        { cap: '<b>Four switches, one motor.</b> S1 and S3 connect to + (the motor supply); S2 and S4 connect to −. The motor sits across the middle, between points A and B. With every switch open, nothing flows: the motor <b>coasts</b>.', draw: function (svg, S2, st) { st.hb.set({ label: 'COAST' }); st.hl(3); } },
        { cap: '<b>Forward: close S1 and S4.</b> Current flows from + through S1, into the motor at A, out at B, and down through S4 to −. The fan spins one way.', draw: function (svg, S2, st) { st.hb.set({ S1: 1, S4: 1, kind: 'fwd', label: 'FORWARD' }); st.hl(0); } },
        { cap: '<b>Backward: close S3 and S2 instead.</b> Now current enters the motor at B and leaves at A — the opposite direction through the coil — so the fan spins the other way. Same motor, same wires, no rewiring.', draw: function (svg, S2, st) { st.hb.set({ S3: 1, S2: 1, kind: 'rev', label: 'BACKWARD' }); st.hl(1); } },
        { cap: '<b>Brake: close both bottom switches.</b> Both ends of the motor are joined. A spinning motor works as a generator, and with its wires joined that current fights the spin — the fan stops quickly. Compare with coasting, where it slowly freewheels to a stop.', draw: function (svg, S2, st) { st.hb.set({ S1: 1, S4: 1, kind: 'fwd', label: 'FORWARD' }); st.hl(0); st.later(function () { st.hb.set({ S2: 1, S4: 1, kind: 'brakeLo', label: 'BRAKE' }); st.hl(2); }, 1500); } },
        { cap: '<b>Never close both switches on one side.</b> S1 + S2 connects + straight to −: a short circuit (“shoot-through”) that skips the motor. The L293D is built so this can’t happen — each side always has exactly one switch closed. Its four switches are transistors, flipping thousands of times a second.', draw: function (svg, S2, st) { st.hb.set({ S1: 1, S2: 1, kind: 'short', label: 'SHORT CIRCUIT' }); st.hl(4); } }
      ] });
    UI.html(b, '<h2>Inside the L293D</h2><p>The L293D holds two H-bridges (enough for two motors — you’ll use one). You don’t control the switches one by one: you give each side of the bridge an input, and the chip closes the right switches. Try it:</p>');
    hbLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-hb', q: 'ENABLE is HIGH, IN1 is <b>LOW</b> and IN2 is <b>HIGH</b>. What does the fan do?', options: ['Spins forward', 'Spins backward', 'Brakes', 'Coasts'], answer: 1, explain: 'OUT1 goes to − and OUT2 to +, so current flows through the motor the opposite way: backward.', hints: { 0: 'Forward is IN1 HIGH, IN2 LOW. This is the reverse.', 2: 'Braking happens when both inputs are the same.', 3: 'Coasting happens when ENABLE is LOW.' } });
    l293Tour(b, ctx);
  } });
  function hbLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The H-bridge lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 360', role: 'img', 'aria-label': 'H-bridge driven by IN1, IN2 and ENABLE' }); stage.appendChild(svg);
    var hb = hbridge(svg, {}, 820);
    var pinsG = S('g', {}, svg);
    T(pinsG, 620, 60, 'L293D OUTPUTS', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    var o1 = T(pinsG, 620, 90, '', { 'font-size': 13 }), o2 = T(pinsG, 620, 116, '', { 'font-size': 13 });
    var expl = P(pinsG, 620, 160, '', { fill: MUT, 'font-size': 12 }), expl2 = P(pinsG, 620, 178, '', { fill: MUT, 'font-size': 12 });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Pins</label>';
    var pills = el('div', 'res-pills'); row.appendChild(pills); box.appendChild(row);
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var s = { en: 1, in1: 1, in2: 0 }, seen = ctx.check('hblab') || {};
    [['en', 'ENABLE (pin 5)'], ['in1', 'IN1 (pin 3)'], ['in2', 'IN2 (pin 4)']].forEach(function (k) {
      var bt = el('button', '', ''); bt.type = 'button'; bt.dataset.k = k[0];
      bt.addEventListener('click', function () { s[k[0]] = s[k[0]] ? 0 : 1; upd(); }); pills.appendChild(bt); k.push(bt);
      bt._lab = k[1];
    });
    function upd() {
      pills.querySelectorAll('button').forEach(function (bt) { var v = s[bt.dataset.k]; bt.textContent = bt._lab + ': ' + (v ? 'HIGH' : 'LOW'); bt.classList.toggle('on', !!v); });
      var o = {}, kind = null, name;
      if (!s.en) { name = 'COAST'; }
      else {
        o.S1 = s.in1; o.S2 = !s.in1; o.S3 = s.in2; o.S4 = !s.in2;
        if (s.in1 && !s.in2) { kind = 'fwd'; name = 'FORWARD'; } else if (!s.in1 && s.in2) { kind = 'rev'; name = 'BACKWARD'; } else { kind = s.in1 ? 'brakeHi' : 'brakeLo'; name = 'BRAKE'; }
      }
      o.kind = kind; o.label = name; hb.set(o);
      o1.textContent = 'OUT1 (A): ' + (!s.en ? 'off (floating)' : s.in1 ? '+ (5 V)' : '− (GND)'); o2.textContent = 'OUT2 (B): ' + (!s.en ? 'off (floating)' : s.in2 ? '+ (5 V)' : '− (GND)');
      var why = { FORWARD: ['A is +, B is −: current', 'flows A → B through the coil.'], BACKWARD: ['B is +, A is −: current', 'flows B → A. Reversed!'], BRAKE: ['Both ends at the same voltage:', 'the motor’s wires are joined.'], COAST: ['ENABLE is LOW: every switch', 'opens, the fan freewheels.'] }[name];
      expl.textContent = why[0]; expl2.textContent = why[1];
      seen[name] = 1; ctx.check('hblab', seen);
      ro.innerHTML = '<div><span class="label">Fan</span><b style="color:var(--cyan,#22d3ee)">' + name + '</b></div><div><span class="label">Code</span><span class="small"><code>digitalWrite(5, ' + (s.en ? 'HIGH' : 'LOW') + ');<br>digitalWrite(3, ' + (s.in1 ? 'HIGH' : 'LOW') + ');<br>digitalWrite(4, ' + (s.in2 ? 'HIGH' : 'LOW') + ');</code></span></div><div><span class="label">Found</span><span class="small">' + ['FORWARD', 'BACKWARD', 'BRAKE', 'COAST'].map(function (k) { return seen[k] ? '<span style="color:var(--go);font-weight:600">' + k.toLowerCase() + '</span>' : '<span class="muted">' + k.toLowerCase() + '</span>'; }).join(' · ') + '</span></div>';
    }
    upd();
    if (RL.onLeave) RL.onLeave(hb.stop);
    UI.html(b, '<p class="small muted">Find all four moves. Notice that IN1 = IN2 = HIGH also brakes (both motor wires are at +), and that ENABLE overrides everything — that’s why it’s the pin you’ll use for speed.</p>');
  }
  function l293Tour(b, ctx) {
    var svg = S('svg', { viewBox: '0 0 520 380', role: 'img', 'aria-label': 'L293D pinout' });
    S('rect', { x: 0, y: 0, width: 520, height: 380, fill: BG }, svg);
    S('rect', { x: 190, y: 30, width: 140, height: 320, rx: 6, fill: '#1a1d22', stroke: '#3b4350', 'stroke-width': 2 }, svg);
    S('path', { d: 'M248 30 a12 12 0 0 0 24 0', fill: '#3b4350' }, svg); S('circle', { cx: 206, cy: 48, r: 4, fill: '#3b4350' }, svg);
    T(svg, 260, 196, 'L293D', { 'text-anchor': 'middle', 'font-size': 14, fill: '#c9d3de', 'letter-spacing': '2', transform: 'rotate(90 260 190)' });
    L293.forEach(function (n, i) {
      var left = i < 8, k = left ? i : 15 - i, y = 54 + k * 38, x = left ? 172 : 330;
      S('rect', { x: x, y: y - 6, width: 18, height: 12, fill: '#c0c6cc' }, svg);
      T(svg, left ? x - 8 : x + 26, y + 4, (i + 1) + ' ' + n, { 'text-anchor': left ? 'end' : 'start', 'font-size': 12, fill: /GND/.test(n) ? MUT : INK });
    });
    UI.hotspots(b, { title: 'Explore the L293D pins', label: 'Chip tour', svg: svg, ctx: ctx, key: 'l293tour', intro: 'Tap each dot to find out what those pins do. The notch marks the top; pin 1 is the one beside the dot, and the numbers go down the left side and back up the right.', spots: [
      { id: 'en', x: 181, y: 54, title: 'Pin 1 · ENABLE 1,2', html: '<p>The master switch for the left H-bridge. HIGH = the outputs follow the inputs; LOW = every switch opens and the motor coasts. You’ll connect it to <b>pin 5</b> (a ~ PWM pin) and switch it on and off fast to set the speed.</p>' },
      { id: 'in', x: 181, y: 92, title: 'Pins 2 and 7 · IN1, IN2', html: '<p>The direction inputs, from UNO <b>pins 3 and 4</b>. Each one decides whether its output connects to + (HIGH) or − (LOW).</p>' },
      { id: 'out', x: 181, y: 130, title: 'Pins 3 and 6 · OUT1, OUT2', html: '<p>The motor connects between these two. They carry the motor’s full current, up to 600 mA per output.</p>' },
      { id: 'gnd', x: 181, y: 187, title: 'Pins 4, 5, 12, 13 · GND', html: '<p>All four go to ground. They also pull heat out of the chip into the breadboard, which is why there are four.</p>' },
      { id: 'vcc2', x: 181, y: 320, title: 'Pin 8 · VCC2 (motor power)', html: '<p>The supply the motor actually runs on, from the <b>power module</b> (4.5 to 36 V is allowed). This is where the battery’s current comes in.</p>' },
      { id: 'vcc1', x: 339, y: 54, title: 'Pin 16 · VCC1 (logic power)', html: '<p>5 V from the UNO to run the chip’s own brain. Keeping logic and motor power separate means a hungry motor can’t brown out the UNO.</p>' },
      { id: 'right', x: 339, y: 244, title: 'Pins 9–15 · the second bridge', html: '<p>ENABLE 3,4, IN3, IN4, OUT3 and OUT4: a second, identical H-bridge for another motor. Leave them empty in this mission.</p>' }
    ] });
  }

  /* ---------- 04 build ---------- */
  steps.push({ id: 'build', title: 'Build: the motor driver', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">This circuit has two power systems: the <b>left rails</b> carry motor power from the power module, and the <b>right rails</b> carry 5 V from the UNO for the chip’s logic, the knob and (later) the sensors. The two grounds are joined; the two + rails are not.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Keep the USB cable unplugged, the battery disconnected, and the power module switched off until the last step. Don’t fit the fan blade yet: test the bare motor shaft first.</p>');
    B.guide(b, { title: 'Motor driver + speed knob', parts: PARTS, vb: WIDE, base: [], steps: [
      { title: 'Fit the power module', add: ['psu'], html: '<p>Press the power supply module onto the top end of your breadboard so its pins go into the rails. Check that its <b>+</b> pins line up with the red <b>+</b> lines and its <b>−</b> pins with the blue <b>−</b> lines on <i>both</i> sides.</p><p>Set the <b>left jumper to 5V</b> and the <b>right jumper to OFF</b>. Now only the left rails get the module’s power.</p>' },
      { title: 'Common ground', add: ['gnd', 'gbr'], html: '<p>Black wire from the UNO’s <b>GND</b> (beside pin 13) to the <b>left − rail</b>. Then a black bridge at the bottom from the <b>left − rail to the right − rail</b>.</p><p>Now the UNO, the module and both sides of the board share one ground.</p>' },
      { title: 'UNO 5V to the right + rail', add: ['p5v'], html: '<p>Red wire from the UNO’s <b>5V</b> pin, around the bottom, to the <b>right + rail</b>. This rail is for logic only.</p><p class="small muted">Never bridge the two + rails in this circuit: that would connect two power supplies together.</p>' },
      { title: 'Place the L293D', add: ['chip'], html: '<p>Find the notch (a half-moon dent) at one end of the chip. Point it <b>up</b>. Press the chip across the centre gap so <b>pin 1</b> (beside the dot) is in <b>e5</b>. Pins 1–8 go down column e; pins 9–16 come back up column f.</p><p class="small muted">Press gently and evenly: chip legs bend easily.</p>' },
      { title: 'Four ground pins', add: ['cg1', 'cg2', 'cg3', 'cg4'], html: '<p>The four middle pins are GND. Short black jumpers: <b>a8 and a9 → left − rail</b>, <b>j8 and j9 → right − rail</b>.</p>' },
      { title: 'Two power pins', add: ['cv1', 'cv2'], html: '<p><b>VCC1</b> (pin 16, row 5 right): red jumper <b>j5 → right + rail</b> (UNO 5V, logic).</p><p><b>VCC2</b> (pin 8, row 12 left): red jumper <b>a12 → left + rail</b> (module 5V, motor power).</p>' },
      { title: 'Control wires from the UNO', add: ['wen', 'win1', 'win2'], html: '<p><b>Pin 5 → a5</b> (ENABLE, the speed pin — it has a ~). <b>Pin 3 → a6</b> (IN1). <b>Pin 4 → a11</b> (IN2).</p>' },
      { title: 'Connect the motor', add: ['motor', 'ma', 'mb'], html: '<p>The motor has two wires (or two tabs). Connect one to <b>c7</b> (OUT1) and the other to <b>c10</b> (OUT2). A motor has no + or − — swapping them just swaps forward and backward.</p><p>Leave the blade off for now. Tape the motor to the desk so it can’t roll away.</p>' },
      { title: 'Add the speed knob', add: ['pot', 'kv', 'kg', 'kw'], html: '<p>Push the potentiometer’s three legs into <b>f22, f24 and f26</b>. Red jumper <b>j22 → right + rail</b>, black jumper <b>j26 → right − rail</b>, and a white wire from the middle leg’s row (<b>h24</b>) around the bottom to <b>A0</b>.</p><p class="small muted">Same voltage-divider knob as Mission 02 — but powered from the UNO’s 5V so its readings match the UNO.</p>' },
      { title: 'Check your build, then power up', view: 'all', html: '<p>Check row by row: chip notch up, four GND jumpers, VCC1 to the <b>right</b> + rail, VCC2 to the <b>left</b> + rail, wires on pins 5, 3, 4, motor on c7/c10.</p><p>Plug the 9V battery into the module, then the USB cable. Switch the module on: its green LED lights. Nothing spins yet — that’s the code’s job.</p>' }
    ] });
    UI.callout(b, 'plain', 'Why two different + rails?', '<p>When a motor starts, it gulps current and the supply voltage dips for a moment. If the UNO shared that supply, the dip could reset it mid-program. With its own USB power for logic and the battery for the motor, the UNO never notices. Only the grounds are joined, so both sides agree what “0 V” means.</p>');
    UI.mcq(b, ctx, { id: 'q-gnd', q: 'You forget the black bridge between the two − rails. What happens?', options: ['Nothing — it’s just a spare wire', 'The motor spins backward', 'The L293D’s right-side ground pins and the UNO lose their shared ground, so the chip can’t read the pins properly and the motor may not run', 'The battery drains faster'], answer: 2, explain: 'Without a common ground the UNO’s HIGH has no reference on the chip’s side. Grounds must always be joined between the parts that talk to each other.' });
  } });

  /* ---------- 05 code: spin ---------- */
  steps.push({ id: 'spin', title: 'Code it: spin both ways', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your first motor program uses only <code>digitalWrite</code>: the two direction pins choose forward or backward, and the enable pin turns the driver on or off. It’s the H-bridge lab, in code.</p>');
    RL.Code.walk(b, SPIN, [
      { lines: [3, 5], title: 'Three pins, three jobs', html: '<p>ENABLE (pin 5) turns the driver on and off. IN1 and IN2 (pins 3 and 4) set the direction. Check these match your wiring.</p>' },
      { lines: [7, 12], title: 'setup()', html: '<p>All three are outputs. <code>Serial.begin(9600)</code> lets the sketch tell you what it’s doing in the Serial Monitor.</p>' },
      { lines: [16, 19], title: 'Forward', html: '<p>IN1 HIGH and IN2 LOW: OUT1 connects to + and OUT2 to −. Then ENABLE HIGH switches the bridge on. Full speed for 3 seconds.</p>' },
      { lines: [21, 23], title: 'Brake', html: '<p>IN1 goes LOW too. Both outputs are now at −, the motor’s wires are joined, and it stops fast.</p>' },
      { lines: [25, 27], title: 'Backward', html: '<p>Only IN2 changes to HIGH: OUT2 is now + and OUT1 is −. Current flows the other way through the motor.</p>' },
      { lines: [29, 32], title: 'Coast', html: '<p>ENABLE LOW opens every switch. Compare how long the motor takes to stop here with the brake: coasting is much slower.</p>' }
    ], { name: 'fan_spin' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Run it and watch the fan blade and the Serial Monitor. <b>Check my code</b> watches for the motor turning both ways.</p>');
    RL.Sim.create(b, { title: 'Spin both ways', code: SPIN, name: 'fan_spin', key: 'sim-spin', ctx: ctx, board: { parts: PARTS, show: BASE_IDS, view: SIM_VIEW, vb: WIDE }, motor: MOTOR, runHint: 'watch the fan.',
      checkAfter: 8200,
      check: function (log) {
        var m = log.filter(function (e) { return e.dev === 'motor'; });
        var fwd = m.some(function (e) { return e.v > 0.5; }), back = m.some(function (e) { return e.v < -0.5; });
        var r = !fwd ? { pass: false, msg: 'The motor never spun forward. Forward needs IN1 HIGH, IN2 LOW and ENABLE HIGH.' } : !back ? { pass: false, msg: 'It spins forward but never backward. Backward needs IN1 LOW and IN2 HIGH (with ENABLE still HIGH).' } : { pass: true, msg: 'Forward, brake, backward, coast. Your H-bridge code works.' };
        ctx.check('sim-spin-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Battery in, module on, USB in. Upload the sketch and open the Serial Monitor (the magnifying glass, top right of the IDE) at <b>9600 baud</b>. Hold a small strip of tape on the motor shaft like a flag so you can see which way it turns.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Nothing happens at all</b><br><span class="small muted">Is the module switched on (green LED) with the left jumper on 5V? Is the battery fresh? Check VCC2 (a12) goes to the <i>left</i> + rail.</span></div></div><div class="trow"><div><b>It only spins one way</b><br><span class="small muted">One of the direction wires is loose or on the wrong row: pin 3 → a6, pin 4 → a11.</span></div></div><div class="trow"><div><b>It hums but doesn’t turn</b><br><span class="small muted">The battery is weak, or the shaft is touching something. Give it a flick to start it.</span></div></div><div class="trow"><div><b>The UNO resets when the motor starts</b><br><span class="small muted">Motor power is reaching the UNO side. Check the right jumper on the module is OFF and that the two + rails aren’t connected.</span></div></div></div>');
  } });

  /* ---------- 06 PWM speed ---------- */
  steps.push({ id: 'speed', title: 'PWM: speed from a knob', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">In Mission 02, PWM dimmed an LED by switching it on and off faster than your eye can see. A motor gets the same trick: <code>analogWrite</code> on the <b>ENABLE</b> pin switches the whole H-bridge on and off about 1000 times a second. The spinning rotor is too heavy to follow every pulse, so it settles at a speed that matches the average.</p>');
    pwmLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-pwm', q: '<code>analogWrite(5, 64);</code> — what percentage of the time is the driver switched on? (255 = 100%)', answer: 25, tol: 1, unit: '%', explain: '64 ÷ 255 ≈ 0.25 = <b>25%</b>. With a 5 V supply, that’s an average of about 1.25 V — probably not enough to get the fan started.', hint: 'Divide 64 by 255, then multiply by 100.' });
    UI.html(b, '<h2>Your turn: the speed knob</h2><p>The knob gives <code>analogRead</code> values from 0 to 1023, but <code>analogWrite</code> wants 0 to 255. You’ve met the function that converts one range into another: <code>map()</code>. Finish the sketch so the knob sets the speed.</p>');
    RL.Code.walk(b, KNOB, [
      { lines: [8, 9], title: 'Two variables', html: '<p><code>knob</code> holds the reading (0–1023). <code>speed</code> holds what you send to the driver (0–255).</p>' },
      { lines: [15, 16], title: 'Pick a direction once', html: '<p>The direction never changes in this sketch, so it’s set once in setup().</p>' },
      { lines: [21, 23], title: 'Your turn', html: '<p>Write one line: <code>speed = map(…);</code> with the knob’s range (0 to 1023) and the driver’s range (0 to 255).</p>' },
      { lines: [25, 25], title: 'PWM on ENABLE', html: '<p>The speed goes to the <b>enable</b> pin, not to IN1. The direction pins say <i>which way</i>; the enable pin says <i>how much</i>.</p>' }
    ], { name: 'fan_knob', download: false });
    RL.Sim.create(b, { title: 'Speed knob', code: KNOB, name: 'fan_knob', key: 'sim-knob', ctx: ctx, board: { parts: PARTS, show: BASE_IDS, view: SIM_VIEW, vb: WIDE }, motor: MOTOR, analog: { 0: { label: 'speed knob', value: 300, part: 'pot' } }, runHint: 'drag the A0 slider to turn the knob.',
      checkAfter: 400,
      check: function (log, sim) {
        var tests = [[1023, 1], [512, 0.5], [0, 0]], res = [];
        return tests.reduce(function (p, t) { return p.then(function () { sim.setAnalog(0, t[0]); return sim.wait(500); }).then(function () { res.push([t, Math.abs(sim.state().motor)]); }); }, Promise.resolve()).then(function () {
          var bad = res.filter(function (r) { return Math.abs(r[1] - r[0][1]) > 0.06; });
          var r = !bad.length ? { pass: true, msg: 'Knob at 1023 → full speed, 512 → half, 0 → stopped. map() is doing its job.' }
            : res.every(function (x) { return x[1] < 0.01; }) ? { pass: false, msg: 'The motor never moves: speed stays 0. Add the map() line that sets speed from knob.' }
            : { pass: false, msg: 'At knob = ' + bad[0][0][0] + ' the speed was ' + Math.round(bad[0][1] * 255) + ' (expected about ' + Math.round(bad[0][0][1] * 255) + '). Check the order of the numbers in map(value, fromLow, fromHigh, toLow, toHigh).' };
          ctx.check('sim-knob-pass', r.pass ? 1 : 0); return r;
        });
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the map() line</summary><p class="small">From the knob’s range to the driver’s range:</p>';
    RL.Code.block(hint, '  speed = map(knob, 0, 1023, 0, 255);', { download: false });
    b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">Upload it and turn the knob slowly up from zero. Watch the Serial Monitor: at what <b>speed</b> value does your real motor actually start turning? It won’t be 1.</p>');
    UI.note(b, ctx, { id: 'n-start', label: 'At what speed value did your real motor start? Why doesn’t it start at very low values, even though the pin is switching?', placeholder: 'It started at about… because…' });
  } });
  function pwmLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>PWM on the enable pin</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 300', role: 'img', 'aria-label': 'PWM wave and motor speed' }); stage.appendChild(svg);
    bg(svg, 820, 300);
    var gx = 40, gy = 50, gw = 480, gh = 170;
    T(svg, gx, 32, 'ENABLE PIN (5 PERIODS ≈ 5 ms)', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    S('rect', { x: gx, y: gy, width: gw, height: gh, fill: BG, stroke: GRID }, svg);
    T(svg, gx - 6, gy + 14, '5V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); T(svg, gx - 6, gy + gh, '0V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
    var wave = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
    var avg = S('line', { x1: gx, x2: gx + gw, y1: 0, y2: 0, stroke: GO, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
    var avgT = T(svg, gx + gw + 8, 0, '', { 'font-size': 11, fill: GO });
    var fan = fanArt(svg, 720, 180, 0.6);
    var stat = T(svg, 720, 28, '', { 'text-anchor': 'middle', 'font-size': 12, 'letter-spacing': '1.5' });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>analogWrite(5, …)</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 255; r.value = 128; r.setAttribute('aria-label', 'PWM value');
    var out = el('b', '', '128'); row.appendChild(r); row.appendChild(out); box.appendChild(row);
    var ro = el('div', 'readouts'); box.appendChild(ro); b.appendChild(box);
    var running = false;
    function upd() {
      var v = Number(r.value), d = v / 255, pts = [], per = gw / 5, hi = gy + 12, lo = gy + gh;
      for (var k = 0; k < 5; k++) { var x0 = gx + k * per; if (d > 0) { pts.push(x0 + ',' + lo, x0 + ',' + hi, (x0 + per * d) + ',' + hi, (x0 + per * d) + ',' + lo); } else pts.push(x0 + ',' + lo); }
      pts.push((gx + gw) + ',' + lo); wave.setAttribute('points', pts.join(' '));
      var ay = lo - d * (lo - hi); avg.setAttribute('y1', ay); avg.setAttribute('y2', ay); avgT.setAttribute('y', ay + 4); avgT.textContent = 'avg ' + (5 * d).toFixed(1) + ' V';
      // a real motor needs a push to get going (static friction), but keeps turning at lower settings once it's moving
      if (!running && d >= 0.3) running = true; if (running && d < 0.18) running = false;
      var spin = running ? d : 0;
      fan.set(spin);
      stat.textContent = running ? 'SPINNING' : d > 0 ? 'HUMMING, STUCK' : 'OFF'; stat.setAttribute('fill', running ? CY : d > 0 ? SIG : MUT);
      out.textContent = v;
      ro.innerHTML = '<div><span class="label">On time</span><b>' + Math.round(d * 100) + '%</b></div><div><span class="label">Average voltage</span><b>' + (5 * d).toFixed(2) + ' V</b></div><div><span class="label">Fan</span>' + (running ? '<b>spinning</b>' : d > 0 ? '<b style="color:var(--signal)">stuck: not enough push to start</b>' : '<b class="muted">off</b>') + '</div>';
      var seen = ctx.check('pwmlab') || {}; seen[running ? 'run' : d > 0 ? 'stuck' : 'off'] = 1; ctx.check('pwmlab', seen);
    }
    r.addEventListener('input', upd); upd();
    if (RL.onLeave) RL.onLeave(fan.stop);
    UI.html(b, '<p class="small muted">Try this: slide down to about 60 so the fan stops, then slowly back up. It needs about 30% to <i>start</i>, but once it’s spinning it keeps going down to a much lower setting. Getting a stopped motor moving takes extra push to beat friction — real motors do exactly this (it’s the “kick-start” challenge in Step 11).</p>');
  }

  /* ---------- 07 relay ---------- */
  steps.push({ id: 'relay', title: 'Relays: a switch you can hear', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>relay</b> is a switch flipped by an electromagnet. A tiny signal from the UNO moves a real metal contact — with a satisfying <b>click</b> — that can switch a completely separate circuit. Thermostats, car headlights and elevators all click with relays.</p>');
    relayExplainer(b);
    UI.mcq(b, ctx, { id: 'q-relay', q: 'Why can a relay controlled by your UNO safely switch a circuit with a completely different power supply?', options: ['Because the relay changes the voltage to 5 V', 'Because the coil side and the contact side never touch electrically — only the magnetic pull crosses between them', 'Because relays only work with batteries', 'Because the UNO’s ground is connected to the contacts'], answer: 1, explain: 'That separation is called <b>isolation</b>. The UNO only powers the coil; the switched circuit has its own wires and supply.', hints: { 0: 'A relay doesn’t convert anything — it just closes or opens a contact.', 3: 'The contacts aren’t connected to the UNO at all. That’s the point.' } });
    UI.html(b, '<h2>Build: the relay as the fan’s power switch</h2><p>The relay goes in the motor’s wire. When it clicks on, the motor is connected; when it clicks off, the motor is cut off no matter what the L293D is doing — just like the power switch on a real fan.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB and switch the module off before rewiring. The relay module is rated for mains voltage, but in this class it <b>only ever switches the 5 V motor circuit</b>. Never connect anything that plugs into a wall.</p>');
    B.guide(b, { title: 'Relay power switch', parts: PARTS, vb: WIDE, base: BASE_IDS, steps: [
      { title: 'Start from the motor driver', view: 'all', html: '<p>Everything from Step 04 stays: power, the L293D, the motor and the knob.</p>' },
      { title: 'Power the relay’s coil side', add: ['relay', 'rv', 'rg', 'rs'], html: '<p>Place the relay module to the right of the board. Its three header pins are the <b>coil side</b>: <b>+ → right + rail</b> (red), <b>− → right − rail</b> (black), and <b>S → pin 7</b> (orange).</p><p class="small muted">The coil side runs on the UNO’s 5V, like the knob.</p>' },
      { title: 'Put the switch in the motor wire', add: ['rcom', 'rno'], remove: ['ma'], html: '<p>Unplug the blue motor wire from c7. Now run a wire from <b>c7 (OUT1) to the relay’s COM</b> screw terminal, and another from <b>NO to the motor</b>. Loosen each screw, slide the wire in, tighten.</p><p>COM = common, NO = normally open (connected only when the relay is on), NC = normally closed (unused here).</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Trace the motor’s path: OUT1 → COM → (relay contact) → NO → motor → OUT2. The relay’s coil side connects to the UNO; its screw terminals connect only to the motor circuit.</p>' }
    ] });
    UI.html(b, '<h2>Code it: the click test</h2>');
    RL.Code.walk(b, CLICK, [
      { lines: [14, 16], title: 'A steady fan', html: '<p>The L293D is set to forward at speed 200 once, in setup(), and never changes.</p>' },
      { lines: [21, 23], title: 'Click on', html: '<p>Pin 7 HIGH powers the relay’s coil (through a little transistor on the module). The electromagnet pulls the contact over: <b>click</b>. COM joins NO and the fan gets power.</p>' },
      { lines: [24, 26], title: 'Click off', html: '<p>Pin 7 LOW: the coil lets go, the spring pulls the contact back, and the fan coasts to a stop.</p>' }
    ], { name: 'relay_click' });
    RL.Sim.create(b, { title: 'Relay click test', code: CLICK, name: 'relay_click', key: 'sim-click', ctx: ctx, board: { parts: PARTS, show: RELAY_IDS, view: SIM_VIEW, vb: WIDE }, motor: MOTOR_R, relays: { 7: 'relay' }, analog: { 0: { label: 'speed knob', value: 512, part: 'pot' } }, runHint: 'watch the relay’s red LED and the fan.',
      checkAfter: 6600,
      check: function (log) {
        var rl = log.filter(function (e) { return e.dev === 'relay'; }), m = log.filter(function (e) { return e.dev === 'motor'; });
        var on = rl.some(function (e) { return e.v === 1; }), off = rl.some(function (e) { return e.v === 0; });
        var spun = m.some(function (e) { return Math.abs(e.v) > 0.3; }), stopped = m.some(function (e) { return e.v === 0; });
        var r = !on ? { pass: false, msg: 'The relay never switched on. Is pin 7 an OUTPUT, set HIGH?' } : !off ? { pass: false, msg: 'The relay switched on but never off.' } : !spun ? { pass: false, msg: 'The relay clicks, but the fan never spins. Check ENABLE and the direction pins in setup().' } : !stopped ? { pass: false, msg: 'The fan should stop while the relay is off.' } : { pass: true, msg: 'Click on, fan spins. Click off, fan stops. The relay is your power switch.' };
        ctx.check('sim-click-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<p style="margin-top:16px">Upload it to your board and listen. You should hear a click, see the module’s little LED light, and the fan should start; three seconds later, a clack and it coasts to a stop.</p>');
    UI.callout(b, 'plain', 'Clicks the wrong way round?', '<p>Some relay modules are <b>active-low</b>: they switch on when the pin is LOW. If your fan runs while the code says “Relay OFF,” swap HIGH and LOW for the relay in your code. If the relay never clicks, check S is on pin 7 and the module’s + and − go to the <i>right</i> rails.</p>');
  } });
  function relayExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Inside a relay', w: 820, h: 360,
      init: function (svg, S2, st) {
        glowDefs(svg); arrowDefs(svg); bg(svg, 820, 360);
        // control side box + load side box
        st.ctrlBox = S('rect', { x: 20, y: 40, width: 330, height: 290, rx: 8, fill: 'none', stroke: GRID, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, svg);
        st.loadBox = S('rect', { x: 430, y: 40, width: 370, height: 290, rx: 8, fill: 'none', stroke: GRID, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, svg);
        st.ctrlT = T(svg, 36, 64, 'COIL SIDE · UNO', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        st.loadT = T(svg, 446, 64, 'CONTACT SIDE · FAN CIRCUIT', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        // coil on an iron core
        S('rect', { x: 200, y: 140, width: 60, height: 124, rx: 4, fill: '#5b6472' }, svg);
        st.coilG = S('g', {}, svg);
        for (var i = 0; i < 9; i++) S('rect', { x: 192, y: 146 + i * 13, width: 76, height: 8, rx: 4, fill: COPPER }, st.coilG);
        st.coilGlow = S('circle', { cx: 230, cy: 202, r: 90, fill: 'url(#m8g-cyan)', opacity: 0 }, svg);
        T(svg, 230, 292, 'COIL + IRON CORE', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        st.fieldG = S('g', { opacity: 0 }, svg);
        [44, 64].forEach(function (r) { S('ellipse', { cx: 230, cy: 202, rx: r, ry: r * 1.2, fill: 'none', stroke: CY, 'stroke-width': 1.5, 'stroke-dasharray': '5 6' }, st.fieldG); });
        // control wires from S and −
        S('path', { d: 'M40 180 L192 180 M40 250 L192 250', stroke: LINE, 'stroke-width': 2.5, fill: 'none' }, svg);
        T(svg, 40, 172, 'S · PIN 7', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' }); T(svg, 40, 242, '− · GND', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' });
        st.sig = T(svg, 40, 218, 'LOW', { 'font-size': 13, fill: MUT, 'letter-spacing': '1' });
        // armature: hinged at the left (120,120), lies across the top of the coil
        S('rect', { x: 104, y: 112, width: 16, height: 30, rx: 2, fill: '#3b4350' }, svg);
        st.arm = S('g', {}, svg);
        S('rect', { x: 112, y: 113, width: 338, height: 14, rx: 3, fill: '#aab6c3' }, st.arm);
        st.insul = S('rect', { x: 450, y: 110, width: 30, height: 20, rx: 3, fill: '#e8d3a8' }, st.arm);
        S('line', { x1: 480, y1: 120, x2: 638, y2: 120, stroke: '#facc15', 'stroke-width': 5, 'stroke-linecap': 'round' }, st.arm);
        S('circle', { cx: 638, cy: 120, r: 7, fill: '#facc15' }, st.arm);
        S('circle', { cx: 120, cy: 120, r: 6, fill: LINE }, svg);
        T(svg, 120, 100, 'HINGE', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // spring pulls the armature up
        S('line', { x1: 330, y1: 50, x2: 384, y2: 50, stroke: LINE, 'stroke-width': 3 }, svg);
        st.spring = S('path', { d: '', stroke: LINE, 'stroke-width': 2, fill: 'none' }, svg);
        T(svg, 392, 74, 'SPRING', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // NC (top) and NO (bottom) contacts, and COM on a flexible lead
        S('circle', { cx: 652, cy: 78, r: 7, fill: '#c0c6cc' }, svg); T(svg, 652, 62, 'NC', { 'font-size': 12, fill: MUT, 'text-anchor': 'middle' });
        S('circle', { cx: 652, cy: 176, r: 7, fill: '#c0c6cc' }, svg); T(svg, 652, 202, 'NO', { 'font-size': 12, fill: MUT, 'text-anchor': 'middle' });
        st.braid = S('line', { x1: 500, y1: 120, x2: 500, y2: 210, stroke: '#facc15', 'stroke-width': 2, 'stroke-dasharray': '3 2' }, svg);
        S('circle', { cx: 500, cy: 210, r: 5, fill: '#c0c6cc' }, svg); T(svg, 510, 214, 'COM', { 'font-size': 12, fill: MUT });
        // load circuit: COM → battery → fan → NO
        S('path', { d: 'M500 210 L500 290 L540 290 M562 290 L760 290 L760 176 L652 176', stroke: LINE, 'stroke-width': 2.5, fill: 'none' }, svg);
        S('line', { x1: 548, y1: 276, x2: 548, y2: 304, stroke: INK, 'stroke-width': 3 }, svg); S('line', { x1: 562, y1: 282, x2: 562, y2: 298, stroke: INK, 'stroke-width': 5 }, svg);
        S('line', { x1: 540, y1: 290, x2: 548, y2: 290, stroke: LINE, 'stroke-width': 2.5 }, svg);
        T(svg, 555, 322, 'MOTOR POWER', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        st.fan = fanArt(svg, 760, 250, 0.32);
        st.loadPath = S('path', { d: 'M500 210 L500 290 L760 290 L760 176 L652 176 L637 170 L500 157 Z', fill: 'none', stroke: 'none' }, svg);
        st.click = T(svg, 560, 230, '', { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, fill: CY, 'letter-spacing': '3' });
        st.extra = S('g', {}, svg);
        var last = performance.now(), fl = null;
        var a = -4, target = -4;
        (function tick(t) {
          var dt = Math.min(0.05, (t - last) / 1000); last = t; a += (target - a) * Math.min(1, dt * 14);
          st.arm.setAttribute('transform', 'rotate(' + a + ' 120 120)');
          var sn = Math.sin(a * Math.PI / 180), ys = 120 + 237 * sn - 7, yb = 120 + 380 * sn;
          var d = 'M357 50', n = 8, h = (ys - 50) / n; for (var k = 1; k <= n; k++) d += ' L' + (357 + (k % 2 ? 7 : -7)) + ' ' + (50 + k * h).toFixed(1);
          st.spring.setAttribute('d', d + ' L357 ' + ys.toFixed(1)); st.braid.setAttribute('y1', yb.toFixed(1));
          st.raf = requestAnimationFrame(tick);
        })(last);
        st.set = function (on, opts) {
          opts = opts || {}; target = on ? 5.5 : -4; st.insul.setAttribute('stroke', opts.iso ? GO : 'none'); st.insul.setAttribute('stroke-width', 2);
          st.coilGlow.setAttribute('opacity', on ? 0.45 : 0); st.fieldG.setAttribute('opacity', on ? 1 : 0);
          st.sig.textContent = on ? 'HIGH' : 'LOW'; st.sig.setAttribute('fill', on ? CY : MUT);
          st.fan.set(on ? 0.8 : 0);
          if (fl) { fl.stop(); fl = null; } if (on) { fl = flow(svg, st.loadPath, 12, CY, 4); fl.setSpeed(80); }
          st.ctrlBox.setAttribute('stroke', opts.iso ? CY : GRID); st.loadBox.setAttribute('stroke', opts.iso ? GO : GRID);
          st.ctrlT.setAttribute('fill', opts.iso ? CY : MUT); st.loadT.setAttribute('fill', opts.iso ? GO : MUT);
        };
        st.say = function (s) { st.click.textContent = s; };
        st.stop = function () { cancelAnimationFrame(st.raf); st.fan.stop(); if (fl) fl.stop(); };
      },
      frames: [
        { cap: '<b>Off: the spring wins.</b> A metal arm (the armature) is held up by a spring, so the moving contact <b>COM</b> touches <b>NC</b> (normally closed). The fan’s circuit goes through NO (normally open), which isn’t touching — so the fan is off.', draw: function (svg, S2, st) { st.extra.innerHTML = ''; st.set(false); st.say(''); } },
        { cap: '<b>On: the electromagnet wins.</b> Pin 7 goes HIGH and current flows through the coil. The coil and its iron core become a magnet strong enough to pull the armature down — <b>click</b> — so COM touches NO and the fan’s circuit is complete.', draw: function (svg, S2, st) { st.extra.innerHTML = ''; st.set(false); st.say(''); st.later(function () { st.set(true); st.say('CLICK'); }, 700); st.later(function () { st.say(''); }, 1700); } },
        { cap: '<b>Isolation: two circuits that never touch.</b> The cyan box (coil side) is connected to the UNO. The green box (contact side) has its own wires and power. Only the <b>magnetic pull</b> crosses the gap, and the moving contact sits on an insulating block, so the switched circuit could even be a different voltage. The click you hear is the contact slamming over.', draw: function (svg, S2, st) { st.extra.innerHTML = ''; st.set(true, { iso: true }); st.say(''); S('rect', { x: 356, y: 190, width: 68, height: 40, rx: 4, fill: BG, stroke: SIG, 'stroke-dasharray': '3 3' }, st.extra); T(st.extra, 390, 215, 'NO WIRE', { 'text-anchor': 'middle', 'font-size': 10, fill: SIG, 'letter-spacing': '1' }); T(st.extra, 465, 100, 'INSULATOR', { 'text-anchor': 'middle', 'font-size': 10, fill: GO, 'letter-spacing': '1' }); } },
        { cap: '<b>Off again: clack.</b> Pin 7 LOW, the coil lets go, and the spring snaps the contact back to NC. A relay is either fully on or fully off — it can’t do in-between speeds, and it can only click a few times a second. So the L293D handles speed, and the relay is the master power switch.', draw: function (svg, S2, st) { st.extra.innerHTML = ''; st.set(true); st.say(''); st.later(function () { st.set(false); st.say('CLACK'); }, 700); st.later(function () { st.say(''); }, 1700); } },
        { cap: '<b>On the module:</b> the coil needs about 70 mA, more than a pin should give, so the module has a small <b>transistor</b> that switches the coil for you (the pin only supplies a few mA). It also has a <b>diode</b> across the coil to catch its kickback (the same problem as the motor) and an <b>LED</b> that shows when the coil is on.', draw: function (svg, S2, st) {
          st.extra.innerHTML = ''; st.set(true); st.say('');
          var g = st.extra; S('rect', { x: 34, y: 262, width: 120, height: 60, rx: 4, fill: PANEL, stroke: CY }, g);
          T(g, 94, 280, 'TRANSISTOR', { 'text-anchor': 'middle', 'font-size': 10, fill: CY, 'letter-spacing': '1' }); T(g, 94, 296, 'DIODE', { 'text-anchor': 'middle', 'font-size': 10, fill: CY, 'letter-spacing': '1' }); T(g, 94, 312, 'LED', { 'text-anchor': 'middle', 'font-size': 10, fill: '#ff4d4d', 'letter-spacing': '1' });
        } }
      ] });
  }

  /* ---------- 08 thermostat ---------- */
  steps.push({ id: 'thermo', title: 'Thermostat logic', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now the fan gets a sense of touch for the air: the <b>DHT11</b> measures temperature and humidity. The obvious rule — “on above 26 °C, off below 26 °C” — has a nasty problem. Watch.</p>');
    hystExplainer(b);
    UI.mcq(b, ctx, { id: 'q-hyst', q: 'The fan is <b>on</b> and the room reads <b>25 °C</b>. With ON = 26 °C and OFF = 24 °C, what does the code do?', options: ['Turns the fan off, because 25 is below 26', 'Keeps the fan on: it only turns off below 24', 'Turns the fan off and on again', 'Speeds the fan up'], answer: 1, explain: 'Between 24 and 26 the fan keeps doing whatever it was already doing. That memory is what stops the flicker.', hints: { 0: 'That’s the single-threshold rule — the one that flickers. What’s the OFF temperature?' } });
    UI.html(b, '<h2>Wire the DHT11</h2><p>The DHT11 module has three pins: <b>S</b> (signal), <b>+</b> and <b>−</b>. It sends its readings as a burst of digital pulses on one wire, and a library decodes them for you.</p>');
    B.guide(b, { title: 'DHT11 thermostat sensor', parts: PARTS, vb: WIDE, base: RELAY_IDS, steps: [
      { title: 'Start from the relay circuit', view: 'all', html: '<p>Everything from Step 07 stays.</p>' },
      { title: 'Add the DHT11', add: ['dht', 'dv', 'dg', 'ds'], html: '<p>Place the DHT11 module below the relay. <b>+ → right + rail</b> (red), <b>− → right − rail</b> (black), <b>S → pin 2</b> (yellow).</p><p class="small muted">Check the labels printed on your module: some DHT11 boards order the pins differently.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Three modules on the right, all powered from the right rails (UNO 5V): relay (S → 7), DHT11 (S → 2). The motor gets its power through the L293D from the left rails.</p>' }
    ] });
    UI.callout(b, '', 'Install the DHT library (first time only)', '<ol><li>In the Arduino IDE: <b>Sketch → Include Library → Manage Libraries…</b></li><li>Search for <b>DHT sensor library</b> and install the one <b>by Adafruit</b>.</li><li>If it asks to install <b>Adafruit Unified Sensor</b> too, click <b>Install all</b>.</li></ol><p class="small">Cloud Editor: the library is already available — just keep the <code>#include &lt;DHT.h&gt;</code> line.</p>');
    UI.html(b, '<h2>Code it: automatic mode</h2>');
    RL.Code.walk(b, THERMO, [
      { lines: [2, 2], title: 'The library', html: '<p><code>#include &lt;DHT.h&gt;</code> brings in Adafruit’s code that decodes the DHT11’s pulses.</p>' },
      { lines: [10, 11], title: 'Two thresholds', html: '<p>A <code>float</code> can hold decimals like 26.0. The gap between ON and OFF (2 °C) is the <b>hysteresis</b>.</p>' },
      { lines: [13, 14], title: 'A sensor object and a memory', html: '<p><code>DHT dht(DHT_PIN, DHT11);</code> creates a sensor called <code>dht</code> on pin 2. <code>fanOn</code> is a <code>bool</code> (true or false) that remembers what the fan is doing — the memory that makes hysteresis work.</p>' },
      { lines: [29, 34], title: 'Read, and check the reading', html: '<p><code>readTemperature()</code> returns degrees Celsius. If the sensor doesn’t answer, it returns NaN (“not a number”); <code>isnan()</code> catches that, prints a warning and <code>return</code> ends this pass of loop() early.</p>' },
      { lines: [36, 41], title: 'The hysteresis rule', html: '<p>If the fan is off <b>and</b> it’s above 26: switch on. If the fan is on <b>and</b> it’s below 24: switch off. <code>!fanOn</code> means “fan is not on”, and <code>&amp;&amp;</code> means “and”. In between, neither condition is true, so nothing changes.</p>' },
      { lines: [43, 47], title: 'Click the relay', html: '<p>The relay follows <code>fanOn</code>. The L293D was set to forward at speed 220 in setup(), so the relay alone switches the fan.</p>' },
      { lines: [49, 53], title: 'Report, then wait', html: '<p>Print the temperature and the fan’s state, then wait 2 seconds. The DHT11 can only take a new reading about once every 1–2 seconds.</p>' }
    ], { name: 'fan_auto' });
    UI.html(b, '<p>Run it, then drag the <b>temperature</b> slider up past 26, down to 25, and down past 24. <b>Check my code</b> does the same and makes sure the fan doesn’t switch off at 25.</p>');
    RL.Sim.create(b, { title: 'Automatic fan', code: THERMO, name: 'fan_auto', key: 'sim-auto', ctx: ctx, board: { parts: PARTS, show: FULL_IDS, view: SIM_VIEW, vb: WIDE }, motor: MOTOR_R, relays: { 7: 'relay' }, dht: { pin: 2, temp: 22, hum: 40 }, analog: { 0: { label: 'speed knob', value: 512, part: 'pot' } }, runHint: 'drag the temperature slider.',
      checkAfter: 300,
      check: function (log, sim) {
        var seq = [[22, 0, 'At 22 °C the fan should be off.'], [28, 1, 'At 28 °C the fan should switch on. Check the ON rule and that the relay pin goes HIGH.'], [25, 1, 'At 25 °C (on the way down) the fan switched off — that’s a single threshold. It should stay on until it drops below 24 °C.'], [23, 0, 'At 23 °C the fan should switch off. Check the OFF rule.']], i = 0;
        function stepT() {
          if (i >= seq.length) { ctx.check('sim-auto-pass', 1); return Promise.resolve({ pass: true, msg: '22 → off, 28 → on, 25 → still on, 23 → off. Hysteresis works: no flicker.' }); }
          var s = seq[i++]; sim.setTemp(s[0]);
          return sim.wait(2500).then(function () { var on = Math.abs(sim.state().motor) > 0.2; if (on !== !!s[1]) { ctx.check('sim-auto-pass', 0); return { pass: false, msg: s[2] }; } return stepT(); });
        }
        return stepT();
      } });
    UI.html(b, '<p style="margin-top:16px">On your real board, warm the DHT11 by holding it between your fingers (or breathing gently near it) and watch the Serial Monitor climb. When it passes 26 °C, the relay clicks and the fan starts. Let go and wait for it to cool below 24 °C.</p>');
    UI.callout(b, 'plain', 'Room already warmer than 26 °C?', '<p>Change ON_TEMP and OFF_TEMP to a couple of degrees above the room temperature the Serial Monitor shows (keep a 2 °C gap). The DHT11 is accurate to about ±2 °C, so don’t be surprised if it disagrees a little with the classroom thermostat.</p>');
  } });
  function hystExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Why one threshold makes it flicker', w: 820, h: 360,
      init: function (svg, S2, st) {
        bg(svg, 820, 360);
        var gx = 70, gy = 40, gw = 600, gh = 200, lo = 22, hi = 28;
        function Y(t) { return gy + gh - (t - lo) / (hi - lo) * gh; }
        st.Y = Y;
        S('rect', { x: gx, y: gy, width: gw, height: gh, fill: BG, stroke: GRID }, svg);
        for (var t = 22; t <= 28; t += 2) { S('line', { x1: gx, y1: Y(t), x2: gx + gw, y2: Y(t), stroke: GRID, 'stroke-dasharray': '2 6' }, svg); T(svg, gx - 8, Y(t) + 4, t + ' °C', { 'text-anchor': 'end', 'font-size': 10, fill: MUT }); }
        T(svg, gx, gy - 14, 'TEMPERATURE THE SENSOR READS', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        st.lineOn = S('line', { x1: gx, x2: gx + gw, y1: Y(26), y2: Y(26), stroke: CY, 'stroke-width': 2 }, svg);
        st.lineOff = S('line', { x1: gx, x2: gx + gw, y1: Y(24), y2: Y(24), stroke: CY, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
        st.band = S('rect', { x: gx, y: Y(26), width: gw, height: Y(24) - Y(26), fill: CY, opacity: 0.07 }, svg);
        st.labOn = T(svg, gx + gw + 8, Y(26) + 4, 'ON 26', { 'font-size': 11, fill: CY }); st.labOff = T(svg, gx + gw + 8, Y(24) + 4, 'OFF 24', { 'font-size': 11, fill: CY });
        st.trace = S('polyline', { points: '', fill: 'none', stroke: INK, 'stroke-width': 1.8 }, svg);
        T(svg, gx, 272, 'FAN', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        S('rect', { x: gx, y: 280, width: gw, height: 26, fill: PANEL, stroke: GRID }, svg);
        st.fanBars = S('g', {}, svg);
        st.clicks = T(svg, gx + gw + 8, 298, '', { 'font-size': 13, fill: INK });
        st.big = T(svg, 410, 340, '', { 'text-anchor': 'middle', 'font-size': 13, 'letter-spacing': '1.5', fill: CY });
        var raf = null;
        st.run = function (hyst) {
          cancelAnimationFrame(raf);
          var on = false, temp = 24.5, n = 0, clicks = 0, pts = [], rnd = 1;
          st.fanBars.innerHTML = '';
          function noise() { rnd = (rnd * 16807) % 2147483647; return ((rnd / 2147483647) - 0.5) * 0.5; }
          st.lineOff.setAttribute('opacity', hyst ? 1 : 0); st.band.setAttribute('opacity', hyst ? 0.07 : 0); st.labOff.setAttribute('opacity', hyst ? 1 : 0); st.labOn.textContent = hyst ? 'ON 26' : 'ON/OFF 26';
          var barStart = null;
          (function tick(t) {
            var steps2 = 3;
            for (var k = 0; k < steps2 && n < 600; k++, n++) {
              temp += on ? -0.012 : 0.009;
              var read = temp + noise();
              var was = on;
              if (hyst) { if (!on && read > 26) on = true; else if (on && read < 24) on = false; }
              else on = read > 26;
              if (on !== was) { clicks++; if (on) barStart = n; else if (barStart != null) { S('rect', { x: gx + barStart, y: 283, width: Math.max(1, n - barStart), height: 20, fill: GO, opacity: 0.75 }, st.fanBars); barStart = null; } }
              pts.push((gx + n) + ',' + Y(read));
            }
            st.trace.setAttribute('points', pts.join(' '));
            if (on && barStart != null) { var cur = st.fanBars.querySelector('.live') || S('rect', { 'class': 'live', y: 283, height: 20, fill: GO, opacity: 0.75 }, st.fanBars); cur.setAttribute('x', gx + barStart); cur.setAttribute('width', Math.max(1, n - barStart)); }
            else { var lv = st.fanBars.querySelector('.live'); if (lv) lv.remove(); }
            st.clicks.textContent = clicks + ' clicks';
            st.clicks.setAttribute('fill', !hyst && clicks > 12 ? SIG : INK);
            if (n < 600) raf = requestAnimationFrame(tick);
          })(performance.now());
        };
        st.stop = function () { cancelAnimationFrame(raf); };
      },
      frames: [
        { cap: '<b>One threshold: on above 26 °C, off below 26 °C.</b> The fan cools the room, so the temperature hovers right at 26. Every sensor reading wobbles a little (that’s noise), so it crosses the line again and again: the relay clicks again and again, hundreds of times. That wears out the relay and the motor, and it sounds terrible.', draw: function (svg, S2, st) { st.run(false); st.big.textContent = 'SINGLE THRESHOLD: CHATTER'; st.big.setAttribute('fill', SIG); } },
        { cap: '<b>Two thresholds: on above 26 °C, off below 24 °C.</b> This gap is called <b>hysteresis</b> (or a dead band). Once the fan is on, small wobbles can’t switch it off — the room has to really cool down to 24. Then it stays off until it really warms up to 26. A few clean clicks instead of dozens.', draw: function (svg, S2, st) { st.run(true); st.big.textContent = 'HYSTERESIS: CALM'; st.big.setAttribute('fill', GO); } },
        { cap: '<b>You live with hysteresis every day.</b> Furnaces, fridges, air conditioners and electric kettles all use it. The trick is that the code has to <b>remember</b> whether the fan is on, because in the middle of the band the answer depends on what it was doing before.', draw: function (svg, S2, st) { st.run(true); st.big.textContent = 'REMEMBER THE STATE'; st.big.setAttribute('fill', CY); } }
      ] });
  }

  /* ---------- 09 final code ---------- */
  steps.push({ id: 'smart', title: 'Code it: the smart fan', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time to put it all together. The knob chooses the mode: turned all the way down it’s <b>AUTO</b> (the thermostat decides, and the fan spins faster the warmer it gets); turned up it’s <b>MANUAL</b> (the knob sets the speed). The relay is the power switch in both modes.</p>');
    modesExplainer(b);
    RL.Code.walk(b, SMART, [
      { lines: [1, 8], title: 'Say what it does', html: '<p>A block comment at the top explains the two modes, so anyone picking up your fan knows how to use it.</p>' },
      { lines: [18, 20], title: 'Settings in one place', html: '<p>The thresholds and the size of the AUTO zone are constants. Want AUTO to switch on at 28 °C? Change one number.</p>' },
      { lines: [23, 25], title: 'Memory', html: '<p><code>hot</code> is the thermostat’s memory, <code>temp</code> keeps the last good reading, and <code>lastRead</code> remembers <i>when</i> it read the sensor. <code>unsigned long</code> holds the big numbers <code>millis()</code> returns.</p>' },
      { lines: [40, 42], title: 'Read every 2 s without delay()', html: '<p><code>millis()</code> is how many milliseconds the UNO has been running. If 2000 ms have passed since the last reading, take a new one. Unlike <code>delay(2000)</code>, the rest of loop() keeps running, so the knob responds instantly.</p>' },
      { lines: [46, 51], title: 'Hysteresis + report', html: '<p>The same two-threshold rule as before, written as two one-line <code>if</code>s. <code>hot ? "yes" : "no"</code> is a shortcut: if <code>hot</code> is true use "yes", otherwise "no".</p>' },
      { lines: [55, 61], title: 'AUTO mode', html: '<p>A knob reading under 40 means AUTO. The relay follows the thermostat, and <code>map()</code> turns 24–32 °C into speeds 150–255, so warmer = faster. <code>constrain()</code> keeps the result between 150 and 255 even if it’s hotter than 32 °C.</p>' },
      { lines: [62, 66], title: 'MANUAL mode', html: '<p>Anywhere else, the fan is always on and the knob sets the speed. The speed starts at 90, not 0, so the lowest manual setting still turns the motor.</p>' },
      { lines: [68, 71], title: 'Drive the hardware', html: '<p>One line for the relay, one for the speed. A short delay keeps loop() from running needlessly fast.</p>' }
    ], { name: 'smart_fan' });
    RL.Sim.create(b, { title: 'Smart fan', code: SMART, name: 'smart_fan', key: 'sim-smart', ctx: ctx, board: { parts: PARTS, show: FULL_IDS, view: SIM_VIEW, vb: WIDE }, motor: MOTOR_R, relays: { 7: 'relay' }, dht: { pin: 2, temp: 22, hum: 40 }, analog: { 0: { label: 'speed knob', value: 600, part: 'pot' } }, runHint: 'turn the knob to 0 for AUTO, then change the temperature.',
      checkAfter: 300,
      check: function (log, sim) {
        var seq = [[800, 22, 600, function (m) { return m > 0.6; }, 'In MANUAL (knob 800) the fan should spin fast.'],
          [0, 22, 2600, function (m) { return m < 0.05; }, 'In AUTO at 22 °C the fan should be off.'],
          [0, 29, 2600, function (m) { return m > 0.4; }, 'In AUTO at 29 °C the fan should switch on.'],
          [0, 25, 2600, function (m) { return m > 0.4; }, 'In AUTO at 25 °C (cooling down) the fan should still be on — hysteresis.'],
          [0, 23, 2600, function (m) { return m < 0.05; }, 'In AUTO at 23 °C the fan should switch off.']], i = 0;
        function stepF() {
          if (i >= seq.length) { ctx.check('sim-smart-pass', 1); return Promise.resolve({ pass: true, msg: 'MANUAL works, and AUTO switches on at 29, stays on at 25, and switches off at 23. Your smart fan is ready.' }); }
          var s = seq[i++]; sim.setAnalog(0, s[0]); sim.setTemp(s[1]);
          return sim.wait(s[2]).then(function () { var m = Math.abs(sim.state().motor); if (!s[3](m)) { ctx.check('sim-smart-pass', 0); return { pass: false, msg: s[4] + ' (motor speed was ' + Math.round(m * 255) + ')' }; } return stepF(); });
        }
        return stepF();
      } });
    UI.html(b, '<p style="margin-top:16px">Upload it and try both modes on the real fan. In AUTO, warm the sensor with your fingers: it should click on, then speed up as it gets warmer.</p>');
    UI.note(b, ctx, { id: 'n-millis', label: 'This sketch reads the sensor with millis() instead of delay(2000). What would go wrong with the knob if it used delay(2000) instead?', placeholder: 'With delay(2000), the knob would…' });
  } });
  function modesExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Two modes, one knob', w: 820, h: 300,
      init: function (svg, S2, st) {
        bg(svg, 820, 300); arrowDefs(svg);
        // the knob dial
        var cx = 170, cy = 150;
        S('circle', { cx: cx, cy: cy, r: 96, fill: PANEL, stroke: GRID, 'stroke-width': 2 }, svg);
        function pt(v, r) { var a = (-135 + 270 * v / 1023) * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
        var a0 = pt(0, 104), a1 = pt(40, 104); S('path', { d: 'M' + a0 + ' A104 104 0 0 1 ' + a1, stroke: CY, 'stroke-width': 10, fill: 'none' }, svg);
        var m0 = pt(40, 104), m1 = pt(1023, 104); S('path', { d: 'M' + m0 + ' A104 104 0 1 1 ' + m1, stroke: GO, 'stroke-width': 10, fill: 'none', opacity: 0.6 }, svg);
        var tl = pt(0, 128); T(svg, tl[0] - 14, tl[1] + 14, 'AUTO', { 'text-anchor': 'middle', 'font-size': 11, fill: CY, 'letter-spacing': '1.5' });
        var tm = pt(700, 132); T(svg, tm[0] + 6, tm[1], 'MANUAL', { 'font-size': 11, fill: GO, 'letter-spacing': '1.5' });
        S('circle', { cx: cx, cy: cy, r: 54, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        st.needle = S('line', { x1: cx, y1: cy, x2: cx, y2: cy - 50, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
        st.read = T(svg, cx, 280, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
        // decision panel
        S('rect', { x: 330, y: 30, width: 200, height: 56, rx: 4, fill: PANEL, stroke: GRID }, svg); T(svg, 430, 64, 'knob < 40 ?', { 'text-anchor': 'middle', 'font-size': 14 });
        st.boxA = S('rect', { x: 300, y: 150, width: 230, height: 110, rx: 4, fill: PANEL, stroke: GRID }, svg);
        st.boxM = S('rect', { x: 560, y: 150, width: 230, height: 110, rx: 4, fill: PANEL, stroke: GRID }, svg);
        S('path', { d: 'M400 86 L400 148', stroke: LINE, 'stroke-width': 2, 'marker-end': 'url(#m8a-l)' }, svg); S('path', { d: 'M530 58 L675 58 L675 148', stroke: LINE, 'stroke-width': 2, fill: 'none', 'marker-end': 'url(#m8a-l)' }, svg);
        T(svg, 408, 120, 'YES', { 'font-size': 11, fill: GO }); T(svg, 600, 50, 'NO', { 'font-size': 11, fill: SIG });
        T(svg, 316, 176, 'AUTO', { 'font-size': 13, fill: CY, 'letter-spacing': '2' }); P(svg, 316, 200, 'relay = thermostat (26/24 °C)', { 'font-size': 12 }); P(svg, 316, 220, 'speed = 150 → 255 as it warms', { 'font-size': 12 });
        st.tA = T(svg, 316, 246, '', { 'font-size': 12, fill: MUT });
        T(svg, 576, 176, 'MANUAL', { 'font-size': 13, fill: GO, 'letter-spacing': '2' }); P(svg, 576, 200, 'relay = always on', { 'font-size': 12 }); P(svg, 576, 220, 'speed = map(knob, 40, 1023, 90, 255)', { 'font-size': 12 });
        st.tM = T(svg, 576, 246, '', { 'font-size': 12, fill: MUT });
        st.set = function (v, txt) {
          var a = -135 + 270 * v / 1023; st.needle.setAttribute('transform', 'rotate(' + a + ' ' + cx + ' ' + cy + ')');
          st.read.textContent = 'analogRead(A0) = ' + v;
          var auto = v < 40; st.boxA.setAttribute('stroke', auto ? CY : GRID); st.boxM.setAttribute('stroke', auto ? GRID : GO);
          st.tA.textContent = auto ? txt : ''; st.tM.textContent = auto ? '' : txt;
        };
      },
      frames: [
        { cap: '<b>Knob fully down (reading under 40): AUTO.</b> The fan is the thermostat’s. A small zone at the bottom of the dial is easy to hit by feel: turn it all the way down and let go.', draw: function (svg, S2, st) { st.set(8, '27.5 °C → relay ON, speed 199'); } },
        { cap: '<b>Turn it up: MANUAL.</b> As soon as the reading passes 40, the knob takes over. The speed range starts at 90 so the motor always has enough push to turn.', draw: function (svg, S2, st) { st.set(300, 'knob 300 → speed 133'); st.later(function () { st.set(700, 'knob 700 → speed 200'); }, 1400); st.later(function () { st.set(1023, 'knob 1023 → speed 255'); }, 2800); } }
      ] });
  }

  /* ---------- 10 the stand ---------- */
  steps.push({ id: 'stand', title: 'Build the fan stand', stage: '03 Imagine · 05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A motor that spins a blade pushes back on whatever holds it. Your stand has to be heavy and wide enough not to walk across the desk, hold the motor firmly, and keep fingers out of the blade.</p><p>Here’s one design. Change it however you like, as long as it’s stable and guarded.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue burns: hold pieces by the edges and let glue cool. <b>Switch the power module off whenever your hands are near the blade.</b> Test the finished fan at low speed first.</p>');
    standExplainer(b);
    UI.callout(b, '', 'Design ideas', '<ul><li>Make the base heavier with a few coins or washers glued inside.</li><li>Mount the knob and the DHT11 on a little control panel at the front of the base.</li><li>Label AUTO at the bottom of the knob’s turn.</li><li>Put the DHT11 <b>out of the fan’s own breeze</b> — otherwise the fan cools its sensor, switches off, and the room never really cools.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your stand or guard, and why.', placeholder: 'I made the… because…' });
  } });
  function standExplainer(b) {
    function base(svg, st) { if (st && st.f) { st.f.stop(); st.f = null; } clear(svg); glowDefs(svg); bg(svg, 800, 380); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard fan stand', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Base.</b> Cut two pieces of cardboard about <b>14 cm × 10 cm</b> and glue them together with the corrugations crossed (much stiffer). A wide base stops the fan from tipping when it starts.', draw: function (svg, S2, st) {
        base(svg, st); var x0 = 246, y0 = 90, sc = 22;
        S('rect', { x: x0, y: y0, width: 14 * sc, height: 10 * sc, fill: CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg);
        for (var i = 1; i < 14; i++) S('line', { x1: x0 + i * sc, y1: y0, x2: x0 + i * sc, y2: y0 + 10 * sc, stroke: CBD, opacity: 0.35 }, svg);
        S('line', { x1: x0, y1: y0 - 18, x2: x0 + 14 * sc, y2: y0 - 18, stroke: CY }, svg); T(svg, x0 + 7 * sc, y0 - 26, '14 cm', { 'text-anchor': 'middle', fill: CY });
        S('line', { x1: x0 - 18, y1: y0, x2: x0 - 18, y2: y0 + 10 * sc, stroke: CY }, svg); T(svg, x0 - 26, y0 + 5 * sc + 4, '10 cm', { 'text-anchor': 'end', fill: CY });
        T(svg, x0 + 7 * sc, y0 + 10 * sc + 34, '× 2, glued with the ridges crossed', { 'text-anchor': 'middle', fill: MUT });
      } },
      { cap: '<b>Step 2 · Upright.</b> Fold a strip <b>4 cm × 24 cm</b> into a triangular tube (three 7 cm sides plus a glue tab) and hot-glue it standing up near the back of the base. Triangles don’t wobble.', draw: function (svg, S2, st) {
        base(svg, st);
        S('path', { d: 'M180 300 L620 300 L660 270 L220 270 Z', fill: CBD }, svg);
        var g = S('g', { 'class': 'part-new' }, svg);
        S('path', { d: 'M380 290 L380 90 L420 70 L420 270 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, g);
        S('path', { d: 'M420 270 L420 70 L450 90 L450 290 Z', fill: CBD, stroke: '#6b4a26', 'stroke-width': 2 }, g);
        T(svg, 480, 150, '← triangular tube', { fill: MUT, 'font-size': 12 }); T(svg, 480, 170, '   24 cm tall', { fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 3 · Motor clip.</b> Wrap a cardboard strip around the motor body and glue it to the top of the upright, with the shaft pointing forward. Keep glue <b>off the shaft and the vents</b> — the motor needs to breathe and turn freely.', draw: function (svg, S2, st) {
        base(svg, st);
        S('path', { d: 'M380 340 L380 160 L420 140 L420 320 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        var g = S('g', { 'class': 'part-new' }, svg);
        S('rect', { x: 350, y: 100, width: 100, height: 60, rx: 22, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, g);
        S('rect', { x: 372, y: 96, width: 40, height: 68, rx: 3, fill: CBL, stroke: CBD, 'stroke-width': 2 }, g);
        S('rect', { x: 450, y: 124, width: 30, height: 12, fill: '#9aa5b1' }, g);
        T(svg, 490, 134, '← shaft: no glue here', { fill: SIG, 'font-size': 12 });
        S('path', { d: 'M350 140 C 300 150, 290 220, 330 260', stroke: '#e5484d', 'stroke-width': 3, fill: 'none' }, svg); S('path', { d: 'M352 150 C 310 160, 300 230, 340 270', stroke: '#30363f', 'stroke-width': 3, fill: 'none' }, svg);
        T(svg, 300, 300, 'motor wires down the back', { fill: MUT, 'font-size': 12, 'text-anchor': 'end' });
      } },
      { cap: '<b>Step 4 · Guard.</b> Cut a cardboard ring a little bigger than the blade (the blade is about 8 cm across, so cut a 10 cm ring) and glue popsicle sticks across the front. Glue the ring to the stand so the blade spins inside it with a finger-width of clearance.', draw: function (svg, S2, st) {
        base(svg, st); var f = st.f = fanArt(svg, 400, 200, 0.9); f.set(0.6);
        T(svg, 600, 120, 'ring: 10 cm across', { fill: CY, 'font-size': 12 }); T(svg, 600, 140, 'sticks: across the front', { fill: CY, 'font-size': 12 }); T(svg, 600, 160, 'gap to blade ≥ 1 cm', { fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 5 · Tidy and test.</b> Run the motor wires down the back of the upright and tape them so they can’t reach the blade. Fit the blade firmly on the shaft. Switch on at low speed first, check nothing rubs or wobbles, then try AUTO.', draw: function (svg, S2, st) {
        base(svg, st); var f = st.f = fanArt(svg, 360, 200, 0.9);
        var sp = [0.3, 0.6, 0.95, 0], k = 0; (function cyc() { f.set(sp[k % 4]); k++; if (k < 40) st.later(cyc, 1500); })();
        S('rect', { x: 540, y: 250, width: 160, height: 70, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('circle', { cx: 580, cy: 285, r: 16, fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg); T(svg, 580, 316, 'SPEED', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 9 });
        S('rect', { x: 630, y: 266, width: 40, height: 40, rx: 3, fill: '#4aa3f0' }, svg); T(svg, 650, 316, 'DHT11', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 9 });
        T(svg, 620, 240, 'CONTROL PANEL', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
      } }
    ], init: function (svg, S2, st) { st.stop = function () { if (st.f) st.f.stop(); }; } });
  }

  /* ---------- 11 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Manual:</b> turning the knob up smoothly speeds the fan up; every setting above AUTO actually turns the blade.',
      '<b>Auto on:</b> warming the sensor past 26 °C clicks the relay on within a few seconds.',
      '<b>No flicker:</b> while the reading sits at 25 °C, the relay doesn’t click at all.',
      '<b>Auto off:</b> below 24 °C the relay clicks off and the fan coasts to a stop.',
      '<b>Stable and safe:</b> at full speed the stand doesn’t walk or tip, and no finger can reach the blade.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Build + code', cls: 'c', title: 'Oscillating fan', html: 'Mount the whole fan head on the <b>servo</b> so it sweeps slowly left and right while it runs, like a real desk fan. (A servo on pin 9: brown → GND, red → 5V, orange → pin 9.)', hint: 'Use <code>millis()</code> to move the servo one degree every 30 ms, so the sweep doesn’t freeze the rest of loop() the way a <code>delay()</code> would.' },
      { tag: 'Code', title: 'Speed presets', html: 'Add two push buttons for LOW and HIGH presets (wired with <code>INPUT_PULLUP</code>, so no resistor needed). A press overrides the knob until the knob is turned again.', hint: 'Remember the last knob reading; if it changes by more than about 20, the knob takes control back.' },
      { tag: 'Code', title: 'Report the room', html: 'Print a tidy status line once every 2 seconds: temperature, humidity (<code>dht.readHumidity()</code>), the mode and the speed — or show them on the LCD from Mission 06.' },
      { tag: 'Code', cls: 'c', title: 'Kick-start', html: 'At low speeds the motor won’t start from a standstill. When the fan is switched on at a low speed, give it a short burst at full speed first, then drop to the chosen speed.', hint: 'Keep a <code>bool</code> that remembers whether the fan was running last time. If it wasn’t, <code>analogWrite(ENABLE, 255)</code> for about 150 ms first.' },
      { tag: 'Physics', title: 'Measure the breeze', html: 'Hang a strip of tissue paper 30 cm in front of the fan and measure how far it lifts at speeds 100, 150, 200 and 255. Is the relationship a straight line?' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 12 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m08 = {
    steps: steps,
    _dev: { parts: PARTS, sets: { base: BASE_IDS, relay: RELAY_IDS, full: FULL_IDS }, vb: WIDE },
    evidence: {
      intro: 'Show your teacher your working smart fan. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of the finished fan and stand, and one close-up of the L293D wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: show MANUAL speed with the knob, then AUTO — warm the sensor until the relay clicks on.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file or paste the code.', required: true, max: 2, fileName: 'smart_fan' }
      ],
      questions: [
        { id: 'r1', q: 'Why can’t the motor be connected straight to an Arduino pin? Explain what the L293D and the power module each do, and why the grounds must be joined.' },
        { id: 'r2', q: 'Explain how the H-bridge makes the motor spin backward. Which pins does your code change, and what happens to the current through the motor?' },
        { id: 'r3', q: 'Your thermostat turns on at 26 °C and off at 24 °C. What would happen with a single 26 °C threshold, and why does the code need to remember whether the fan is on?' },
        { id: 'r4', q: 'How does the relay switch the fan without the UNO touching the fan’s circuit? Describe one problem you ran into and how you solved it.' }
      ]
    }
  };
})(window);
