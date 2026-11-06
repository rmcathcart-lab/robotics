/* Mission R1: Build & systems check — assemble the ELEGOO Smart Robot Car V4.0, test the factory program, set up the
 * Arduino IDE, upload a first program and a systems check that exercises every part of the car. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, K = RL.CarKit, el = RL.el, esc = RL.esc;
  var S = function () { return RL.Board.el.apply(null, arguments); };
  function T(p, x, y, s, a) { var t = S('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), p); t.textContent = s; return t; }
  function clear(svg) { while (svg.lastChild) svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', MUT = '#8ea6bb', GO = '#4ade80';

  /* ================= code ================= */
  var HELLO = [
    '// R1: my first robot program',
    '#include <FastLED.h>        // a library that knows how to control colour LEDs',
    '',
    'CRGB leds[1];               // our car has 1 colour LED',
    '',
    'void setup() {',
    '  Serial.begin(9600);                      // start talking to the computer',
    '  FastLED.addLeds<NEOPIXEL, 4>(leds, 1);   // the LED is connected to pin 4',
    '  FastLED.setBrightness(40);               // 0 to 255 (40 is plenty)',
    '  Serial.println("Hello! I am a robot.");',
    '}',
    '',
    'void loop() {',
    '  leds[0] = CRGB::Blue;     // choose blue...',
    '  FastLED.show();           // ...and send it to the LED',
    '  delay(500);               // wait 500 ms (half a second)',
    '  leds[0] = CRGB::Black;    // black = off',
    '  FastLED.show();',
    '  delay(500);',
    '}'].join('\n');

  var CHECK = [
    '// R1 Systems check: tests every part of the robot car, one at a time.',
    '// BEFORE YOU START: put the car on a box so the wheels are off the table!',
    '#include <Servo.h>',
    '#include <FastLED.h>',
    '#include <IRremote.hpp>',
    ''].concat(K.PINS).concat([
    'const int LED_PIN = 4;     // colour LED',
    'const int BUTTON = 2;      // MODE button',
    'const int IR_PIN = 9;      // infrared receiver',
    'const int SERVO_PIN = 10;  // servo that turns the ultrasonic sensor',
    'const int TRIG = 13;       // ultrasonic sensor: Trig',
    'const int ECHO = 12;       // ultrasonic sensor: Echo',
    '',
    'CRGB leds[1];',
    'Servo head;',
    '',
    'void setup() {',
    '  Serial.begin(9600);'].concat(K.SETUP_MOTORS).concat([
    '  pinMode(TRIG, OUTPUT);',
    '  pinMode(ECHO, INPUT);',
    '  pinMode(BUTTON, INPUT_PULLUP);',
    '  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);',
    '  FastLED.setBrightness(40);',
    '  head.attach(SERVO_PIN);',
    '  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);',
    '',
    '  Serial.println("=== SYSTEMS CHECK ===");',
    '  checkBattery();',
    '  checkLed();',
    '  checkServo();',
    '  checkWheels();',
    '  Serial.println("5. Sensors: wave your hand in front, slide white and black");',
    '  Serial.println("   paper under the car, press remote keys and the MODE button.");',
    '}',
    '',
    'void loop() {',
    '  Serial.print("Distance: ");',
    '  Serial.print(readDistance());',
    '  Serial.print(" cm   Line L M R: ");',
    '  Serial.print(analogRead(A2));',
    '  Serial.print(" ");',
    '  Serial.print(analogRead(A1));',
    '  Serial.print(" ");',
    '  Serial.print(analogRead(A0));',
    '  if (digitalRead(BUTTON) == LOW) {',
    '    Serial.print("   MODE button: PRESSED");',
    '  }',
    '  Serial.println();',
    '  if (IrReceiver.decode()) {',
    '    Serial.print(">>> Remote key code: 0x");',
    '    Serial.println(IrReceiver.decodedIRData.command, HEX);',
    '    IrReceiver.resume();',
    '  }',
    '  delay(300);',
    '}',
    '',
    'void checkBattery() {',
    '  float volts = analogRead(A3) * 0.0375;   // the board measures the battery on A3',
    '  Serial.print("1. Battery: ");',
    '  Serial.print(volts);',
    '  Serial.println(" V");',
    '  if (volts < 7.0) {',
    '    Serial.println("   LOW! Charge the battery (or is the power switch off?)");',
    '  } else {',
    '    Serial.println("   OK");',
    '  }',
    '}',
    '',
    'void checkLed() {',
    '  Serial.println("2. LED: red, green, blue");',
    '  leds[0] = CRGB::Red;   FastLED.show(); delay(700);',
    '  leds[0] = CRGB::Green; FastLED.show(); delay(700);',
    '  leds[0] = CRGB::Blue;  FastLED.show(); delay(700);',
    '  leds[0] = CRGB::Black; FastLED.show();',
    '}',
    '',
    'void checkServo() {',
    '  Serial.println("3. Servo: middle, right, left, middle");',
    '  head.write(90);  delay(700);',
    '  head.write(30);  delay(700);   // less than 90 = look right',
    '  head.write(150); delay(700);   // more than 90 = look left',
    '  head.write(90);  delay(700);',
    '}',
    '',
    'void checkWheels() {',
    '  Serial.println("4. Wheels (is the car up on a box?)");',
    '  Serial.println("   RIGHT wheels: forward");',
    '  digitalWrite(AIN1, HIGH);',
    '  analogWrite(PWMA, 150);',
    '  delay(1000);',
    '  analogWrite(PWMA, 0);',
    '  delay(400);',
    '  Serial.println("   RIGHT wheels: backward");',
    '  digitalWrite(AIN1, LOW);',
    '  analogWrite(PWMA, 150);',
    '  delay(1000);',
    '  analogWrite(PWMA, 0);',
    '  delay(400);',
    '  Serial.println("   LEFT wheels: forward");',
    '  digitalWrite(BIN1, HIGH);',
    '  analogWrite(PWMB, 150);',
    '  delay(1000);',
    '  analogWrite(PWMB, 0);',
    '  delay(400);',
    '  Serial.println("   LEFT wheels: backward");',
    '  digitalWrite(BIN1, LOW);',
    '  analogWrite(PWMB, 150);',
    '  delay(1000);',
    '  analogWrite(PWMB, 0);',
    '}',
    ''
  ])).concat(K.READ_DIST).join('\n');
  function lineOf(src, re) { var ls = src.split('\n'); for (var i = 0; i < ls.length; i++) if (re.test(ls[i])) return i + 1; return 1; }

  /* ================= steps ================= */
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    K.brief(b, RL.MISSIONS.r01, {
      lead: '<p class="lead">For the rest of the semester your team gets a robot. Not a kit that just sits there — a car with four motors, eyes that see with sound, sensors that feel a line on the floor, a head that turns, a colour light and a brain you program yourself.</p>' +
        '<p>This mission is all about getting it ready. You’ll <b>build</b> the car, <b>test-drive</b> it with the program it came with, set up the <b>Arduino IDE</b>, upload your <b>first program</b>, and run a <b>systems check</b> that tests every motor and sensor one at a time. After that, every mission is about teaching it something new with code.</p>',
      edp: [2, 4, 5, 6],
      hand: ['Photos of your finished car', 'A video of the test drive', 'A screenshot of your systems check', 'Answers to 4 questions'],
      demo: {
        title: 'What your robot can do', world: { w: 240, h: 150, start: { x: 50, y: 110, h: 30 }, boxes: [{ x: 180, y: 18, w: 34, h: 24, label: 'BOX' }], lines: [{ pts: [[20, 136], [220, 136]] }] },
        cap: 'By the end of the unit your code will make it drive, turn its head to look around, measure how far away things are, notice lines on the floor and react — all on its own.',
        program: async function (car) {
          car.say('DRIVE'); car.led(0, 120, 255); await car.drive(150, 150, 1500);
          car.say('TURN'); await car.drive(150, -150, 450);
          car.say('LOOK AROUND'); car.led(255, 160, 0); await car.servo(30, 600); await car.servo(150, 900); await car.servo(90, 500);
          car.say('SEE THE BOX'); car.led(0, 255, 90); await car.drive(140, 140, 900);
          car.say('STOP'); car.led(255, 0, 0); await car.stop(1200); car.say('');
        }
      }
    });
    UI.callout(b, 'safety', 'Safety', '<p>The car runs on a <b>rechargeable lithium battery pack</b>. Charge it only with the cable that came with it, never leave it charging unattended, and don’t crush, puncture or short the battery (keep screws and metal away from its contacts). <b>Switch the power off</b> whenever you change wiring. Keep fingers clear of the wheels when the car is on.</p>');
    UI.callout(b, '', 'Team roles', '<p>Swap roles at every stage of the build so everyone builds something:</p><ul><li><b>Reader</b> — follows the manual and reads out each step.</li><li><b>Builder</b> — does the screwing and plugging.</li><li><b>Checker</b> — checks each stage against this page before you move on, and ticks it off.</li><li><b>Parts manager</b> — keeps the screws sorted and finds the next bag.</li></ul>');
  } });

  steps.push({ id: 'tour', title: 'Meet your robot', stage: '02 Research', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Every robot, from a vacuum cleaner to a Mars rover, does the same three things over and over: it <b>senses</b> the world, <b>thinks</b> about what it sensed, and <b>acts</b>. Your car is built the same way.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Sense → think → act', w: 820, h: 300, frames: [
      { cap: '<b>Sense.</b> The sensors turn the world into numbers: the ultrasonic sensor measures distance, the line sensors measure how much light bounces off the floor, the IR receiver catches codes from the remote.', draw: function (svg) { stv(svg, 0); } },
      { cap: '<b>Think.</b> The Arduino UNO runs <b>your program</b>. It reads the numbers and decides: “something is 12 cm ahead, so stop.” The UNO only does exactly what your code tells it — nothing more, nothing less.', draw: function (svg) { stv(svg, 1); } },
      { cap: '<b>Act.</b> The UNO sends signals out to the motor driver (which powers the four motors), the servo (which turns the sensor) and the colour LED.', draw: function (svg) { stv(svg, 2); } },
      { cap: '<b>…and again.</b> The loop repeats many times a second. Every time the robot moves, what it senses changes, so it thinks again and acts again. That loop is what makes a machine feel “smart”.', draw: function (svg) { stv(svg, 3); } }
    ] });
    function stv(svg, k) {
      clear(svg); S('rect', { x: 0, y: 0, width: 820, height: 300, fill: '#070d17' }, svg);
      var cols = [['SENSE', 'Ultrasonic · line sensors · IR remote · button', 120], ['THINK', 'Arduino UNO + your code', 410], ['ACT', 'Motors · servo · colour LED', 700]];
      cols.forEach(function (c, i) {
        var on = k === i || k === 3;
        S('rect', { x: c[2] - 110, y: 70, width: 220, height: 130, rx: 14, fill: on ? '#0f2a3a' : '#0d1726', stroke: on ? CY : '#22364f', 'stroke-width': on ? 2.5 : 1.5 }, svg);
        T(svg, c[2], 118, c[0], { 'text-anchor': 'middle', 'font-size': 26, fill: on ? CY : MUT, 'font-weight': 700, 'letter-spacing': '4' });
        var words = c[1].split(' · ');
        words.forEach(function (w, j) { T(svg, c[2], 146 + j * 15, w, { 'text-anchor': 'middle', 'font-size': 12, fill: on ? '#e6f1fa' : MUT }); });
      });
      [[232, 298], [522, 588]].forEach(function (a, i) { var on = k === i + 1 || k === 3; S('path', { d: 'M' + a[0] + ' 135 L' + a[1] + ' 135', stroke: on ? SIG : '#22364f', 'stroke-width': 3, 'marker-end': '' }, svg); S('path', { d: 'M' + (a[1] - 10) + ' 127 L' + a[1] + ' 135 L' + (a[1] - 10) + ' 143', fill: 'none', stroke: on ? SIG : '#22364f', 'stroke-width': 3 }, svg); });
      S('path', { d: 'M700 205 Q700 270 410 270 Q120 270 120 205', fill: 'none', stroke: k === 3 ? SIG : '#22364f', 'stroke-width': 3, 'stroke-dasharray': k === 3 ? '0' : '6 6' }, svg);
      T(svg, 410, 290, k === 3 ? 'the world changes → sense again' : 'loop', { 'text-anchor': 'middle', 'font-size': 12, fill: k === 3 ? SIG : MUT });
    }
    UI.html(b, '<h2>Tour the car</h2><p>Here’s your car from above, with the front at the top. Tap every dot. You’ll use all of these parts this unit, so learn their names — the checker will ask you to point at them.</p>');
    var at = K.at;
    UI.hotspots(b, { title: 'Parts of the smart robot car', label: 'Explore', svg: K.carSvg(), ctx: ctx, key: 'tour', spots: [
      { id: 'uno', title: 'Arduino UNO + expansion board', ...at(-1.6, -0.6), html: '<p>The <b>brain</b>. Underneath is an Arduino UNO, the same kind of board as in the Arduino unit. On top sits ELEGOO’s <b>expansion board</b> (the “shield”), which has plugs for every part so you don’t need a breadboard. Your programs live here.</p>' },
      { id: 'driver', title: 'Motor driver (TB6612)', ...at(2.0, -2.0), html: '<p>A chip on the expansion board that powers the motors. The UNO can’t power a motor itself — its pins give a tiny current. The driver takes the UNO’s small signals (which way? how fast?) and switches the big battery current to the motors. It drives the <b>left</b> pair and the <b>right</b> pair separately. The chip should say <b>TB6612</b> on it — check yours.</p>' },
      { id: 'motors', title: 'Motors & wheels (ports M1–M4)', ...at(8.6, -6), html: '<p>Four small DC motors with gearboxes, one per wheel. The two on each side always turn together. They plug into ports <b>M1–M4</b>: left front → M1, right front → M2, right rear → M3, left rear → M4. Plug one in the wrong port and the car will drive in circles.</p>' },
      { id: 'sonar', title: 'Ultrasonic sensor (the “eyes”)', ...at(-2.4, -12.8), html: '<p>It isn’t a camera — it measures <b>distance</b> with sound, like a bat. One silver can chirps a very high-pitched ping, the other listens for the echo. The longer the echo takes, the farther away the object. Good from about 2 cm to 4 m. Pins: <b>Trig 13</b>, <b>Echo 12</b>.</p>' },
      { id: 'servo', title: 'Servo (the “neck”)', ...at(1.6, -8.4), html: '<p>A small motor that turns to an exact angle and holds it. It turns the ultrasonic sensor so the robot can look left and right without moving. <b>90°</b> = straight ahead, smaller numbers look right, bigger numbers look left. Pin <b>10</b>.</p>' },
      { id: 'line', title: 'Line-tracking module (underneath)', ...at(-3.1, -10.2), html: '<p>Three infrared sensors under the front that point at the floor. Each shines invisible light down and measures how much bounces back: lots from a white floor, very little from black tape. That’s how the robot follows a line. Left = <b>A2</b>, middle = <b>A1</b>, right = <b>A0</b>.</p>' },
      { id: 'ir', title: 'IR receiver', ...at(3.6, 2.6), html: '<p>A tiny black dome that catches invisible infrared flashes from the remote. Each key sends its own code number. Pin <b>9</b>. A small green light beside it flickers when a signal arrives.</p>' },
      { id: 'led', title: 'Colour LED', ...at(2.2, 1.0), html: '<p>A “smart” RGB LED that can show any colour. It’s controlled with the <b>FastLED</b> library through pin <b>4</b>. Great for showing what the robot is thinking: green = driving, red = stopped…</p>' },
      { id: 'mode', title: 'MODE button', ...at(-3.6, 2.2), html: '<p>A push button on pin <b>2</b>. The factory program uses it to switch modes. In your programs it makes a perfect <b>start button</b>: the car waits until you press it, so it doesn’t drive off the table the moment you switch it on.</p>' },
      { id: 'switch', title: 'Upload / Cam switch', ...at(-3.4, -3.4), html: '<p>A tiny slide switch on the expansion board. <b>Upload</b> connects the UNO to the USB port so you can send it programs. <b>Cam</b> connects it to the camera module so the phone app can control it. <b>If an upload fails, check this switch first.</b></p>' },
      { id: 'battery', title: 'Battery pack & power switch', ...at(1.6, 7.6), html: '<p>A rechargeable lithium battery box with an <b>on/off switch</b> and a USB charging port. Its light is green while charging and goes out when it’s full. Motors only run on battery power — USB alone isn’t enough. The UNO measures the battery voltage on <b>A3</b>.</p>' },
      { id: 'cam', title: 'Camera module (ESP32)', ...at(-4.2, 6.3), html: '<p>A small computer with a camera and Wi-Fi. It makes its own Wi-Fi network (called <b>ELEGOO-…</b>) so the ElegooKit phone app can show live video and drive the car. You won’t program it in this unit, but you can use it for fun once you’re done.</p>' }
    ] });
    UI.mcq(b, ctx, { id: 'q-tour1', q: 'The car is driving toward a wall. Which part <b>senses</b> the wall?', options: ['The servo', 'The ultrasonic sensor', 'The motor driver', 'The line-tracking module'], answer: 1, explain: 'The ultrasonic sensor measures the distance to the wall with an echo. The servo only aims it.', hints: { 0: 'The servo turns the sensor, but doesn’t measure anything itself.', 3: 'The line sensors look down at the floor, not ahead.' } });
    UI.mcq(b, ctx, { id: 'q-tour2', q: 'Why does the car need a motor driver between the UNO and the motors?', options: ['To make the motors quieter', 'The UNO’s pins can’t supply enough current for motors, so the driver switches the battery’s power for them', 'To count how many times the wheels turn', 'It converts the code into motor language'], answer: 1, explain: 'An UNO pin gives about 20 mA. A motor needs hundreds. The driver is a set of electronic switches controlled by the UNO’s small signals.' });
    UI.mcq(b, ctx, { id: 'q-tour3', q: 'Your upload keeps failing with a “not in sync” error. What should you check first?', options: ['The battery', 'The Upload / Cam switch', 'The servo', 'The wheels'], answer: 1, explain: 'In the Cam position the camera module is connected to the UNO’s serial line, which blocks uploads from USB.' });
  } });

  steps.push({ id: 'unpack', title: 'Unpack, sort & charge', stage: '04 Plan', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Start by charging the battery — it takes a while — then lay out every part and check nothing is missing before you build.</p>');
    UI.callout(b, '', 'Charge first', '<p>Plug the battery box into a USB charger with the cable from the kit. Its light glows <b>green while charging</b> and turns off when full. Build while it charges.</p>');
    UI.html(b, '<h2>Find every part</h2><p>Tap each part when you’ve found it. The screws come in labelled bags (“FOR MOTOR”, “FOR UNO, LINE TRACKING”…) — <b>keep them in their bags</b> until the step that needs them, or sort them into an egg carton.</p>');
    function icon(draw) { return function (svg, S) { draw(svg, S); }; }
    UI.gear(b, ctx, 'parts', [
      { id: 'plates', name: 'Bottom & top plates', note: 'Peel off the protective film!', icon: icon(function (svg, S) { S('rect', { x: 20, y: 14, width: 80, height: 42, rx: 12, fill: '#1b1f24', stroke: '#454d58', 'stroke-width': 2 }, svg); S('circle', { cx: 40, cy: 35, r: 4, fill: '#0b1320' }, svg); S('circle', { cx: 80, cy: 35, r: 4, fill: '#0b1320' }, svg); }) },
      { id: 'motors', name: 'Motors ×4', note: 'With aluminium blocks', icon: icon(function (svg, S) { [0, 1].forEach(function (i) { S('rect', { x: 18 + i * 46, y: 22, width: 38, height: 26, rx: 4, fill: '#f2c94c', stroke: '#b7912f', 'stroke-width': 2 }, svg); S('circle', { cx: 37 + i * 46, cy: 35, r: 6, fill: '#e5e7eb' }, svg); }); }) },
      { id: 'wheels', name: 'Wheels ×4', note: 'Rubber tyres, yellow rims', icon: icon(function (svg, S) { [36, 84].forEach(function (x) { S('circle', { cx: x, cy: 35, r: 22, fill: '#1b1f24' }, svg); S('circle', { cx: x, cy: 35, r: 11, fill: '#f2b705' }, svg); }); }) },
      { id: 'uno', name: 'UNO + expansion board', note: 'Check the chip says TB6612', icon: icon(function (svg, S) { S('rect', { x: 22, y: 12, width: 76, height: 46, rx: 4, fill: '#14507e', stroke: '#2f78b0', 'stroke-width': 2 }, svg); S('rect', { x: 52, y: 26, width: 18, height: 12, fill: '#222' }, svg); }) },
      { id: 'battery', name: 'Battery box', note: 'With power switch', icon: icon(function (svg, S) { S('rect', { x: 20, y: 18, width: 80, height: 34, rx: 5, fill: '#0f1216', stroke: '#2b3038', 'stroke-width': 2 }, svg); S('rect', { x: 86, y: 28, width: 8, height: 12, fill: '#cbd5e1' }, svg); }) },
      { id: 'sonar', name: 'Ultrasonic sensor + holder', note: '', icon: icon(function (svg, S) { S('rect', { x: 18, y: 20, width: 84, height: 30, rx: 4, fill: '#1d5fa8' }, svg); [42, 78].forEach(function (x) { S('circle', { cx: x, cy: 35, r: 11, fill: '#c0c6cc' }, svg); }); }) },
      { id: 'servo', name: 'SG90 servo', note: 'Blue, with arms', icon: icon(function (svg, S) { S('rect', { x: 36, y: 18, width: 48, height: 34, rx: 4, fill: '#1f5fbf' }, svg); S('rect', { x: 52, y: 8, width: 30, height: 8, rx: 4, fill: '#f8fafc' }, svg); }) },
      { id: 'line', name: 'Line-tracking module', note: 'Three sensors underneath', icon: icon(function (svg, S) { S('rect', { x: 20, y: 22, width: 80, height: 26, rx: 4, fill: '#1d3b2a', stroke: '#3f7a57', 'stroke-width': 2 }, svg); [40, 60, 80].forEach(function (x) { S('circle', { cx: x, cy: 35, r: 5, fill: '#111' }, svg); }); }) },
      { id: 'cam', name: 'Camera module + bracket', note: 'ESP32', icon: icon(function (svg, S) { S('rect', { x: 36, y: 14, width: 48, height: 42, rx: 4, fill: '#222831' }, svg); S('circle', { cx: 60, cy: 35, r: 9, fill: '#09101a', stroke: '#5b6573', 'stroke-width': 2 }, svg); }) },
      { id: 'cables', name: 'Cables', note: 'Motor, sensor & camera cables', icon: icon(function (svg, S) { [0, 1, 2].forEach(function (i) { S('path', { d: 'M20 ' + (22 + i * 12) + ' Q60 ' + (8 + i * 12) + ' 100 ' + (22 + i * 12), fill: 'none', stroke: ['#ef4444', '#f8fafc', '#facc15'][i], 'stroke-width': 3 }, svg); }); }) },
      { id: 'remote', name: 'IR remote', note: 'Pull out the plastic tab', icon: icon(function (svg, S) { S('rect', { x: 46, y: 6, width: 28, height: 58, rx: 6, fill: '#111418' }, svg); S('circle', { cx: 60, cy: 22, r: 6, fill: '#1e3a5f' }, svg); }) },
      { id: 'tools', name: 'Screwdrivers + USB cable', note: 'Green hex driver for the motors', icon: icon(function (svg, S) { S('rect', { x: 18, y: 30, width: 50, height: 10, rx: 3, fill: '#16a34a' }, svg); S('rect', { x: 68, y: 33, width: 34, height: 4, fill: '#cbd5e1' }, svg); }) }
    ]);
    UI.callout(b, 'plain', 'Something missing?', '<p>Tell your teacher straight away, before you start. A missing screw at step 9 is a lot more annoying than at step 1.</p>');
  } });

  steps.push({ id: 'build', title: 'Build the car', stage: '05 Create', time: '2 classes', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Follow the <b>ELEGOO user manual</b> (or the animated <b>Build</b> guide in the <b>ElegooKit</b> phone app — tap your car, then Build). This page doesn’t repeat every picture: it’s your <b>checklist</b>. After each stage the checker compares your car to the notes below and marks it PASS. Don’t move on until it passes.</p>');
    UI.callout(b, '', 'Two golden rules', '<ul><li><b>Don’t force anything.</b> If a screw won’t go in or a part won’t sit flat, something is the wrong way round. Undo it and look again.</li><li><b>Leave the top plate loose</b> until the car passes every test — you’ll probably need to get at a cable.</li></ul>');
    UI.tests(b, ctx, { id: 'build', rows: [
      '<b>1 · Motors.</b> Each motor gets an aluminium block with two long screws and nuts (bag “FOR MOTOR”, green hex screwdriver). The <b>wired side of every motor faces inward</b> toward the middle of the car. All four motors sit flat and don’t wobble.<br><span class="small muted">If a motor won’t sit flush, its block is probably on backwards.</span>',
      '<b>2 · Line-tracking module.</b> Screwed under the front of the bottom plate with the spacers. The <b>three sensors face down</b> and the module points <b>forward</b>.<br><span class="small muted">The front of the car is the end with the line sensor. Write FRONT on a piece of tape.</span>',
      '<b>3 · UNO + expansion board.</b> The UNO sits on its copper pillars. The expansion board’s pins go <b>straight into every hole</b> of the UNO’s headers — none bent, none hanging outside. The small gyro module plugs into its socket.',
      '<b>4 · Battery box.</b> Screwed down firmly with its switch reachable. (Battery charging in the meantime is fine.)',
      '<b>5 · Camera module.</b> On its bracket, lens facing forward, with the 4-pin cable attached.',
      '<b>6 · Ultrasonic sensor + servo.</b> Sensor in its holder (the cans face forward), holder on the servo. <b>Before you fix the holder to the servo’s arm, centre the servo</b>: the factory program turns it to 90° when the car is switched on, so plug the servo in, switch on for a second, switch off, then attach the holder pointing straight ahead.',
      '<b>7 · Wiring.</b> Every cable on the right port (see the table below). Motor cables pushed fully in. Wires tucked away from the wheels.',
      '<b>8 · Top plate.</b> On, with only two diagonally opposite screws done up a little — you’ll tighten everything after testing.',
      '<b>9 · Wheels.</b> Pushed onto the motor shafts (they only fit one way: line up the flat side) and screwed in. Each wheel spins freely and doesn’t rub on anything.'
    ] });
    UI.html(b, '<h2>Which cable goes where</h2>' +
      '<table class="fx-plan"><thead><tr><th>Part</th><th>Port on the expansion board</th><th>Pins it uses</th></tr></thead><tbody>' +
      '<tr><td>Left front motor</td><td><b>M1</b></td><td rowspan="4">Left motors: PWMB 6 + BIN1 8<br>Right motors: PWMA 5 + AIN1 7<br>STBY 3 (on/off for both)</td></tr>' +
      '<tr><td>Right front motor</td><td><b>M2</b></td></tr><tr><td>Right rear motor</td><td><b>M3</b></td></tr><tr><td>Left rear motor</td><td><b>M4</b></td></tr>' +
      '<tr><td>Servo (SG90)</td><td><b>Servo 1</b> (brown wire to −)</td><td>10</td></tr>' +
      '<tr><td>Ultrasonic sensor</td><td>Ultrasonic port</td><td>Trig 13 · Echo 12</td></tr>' +
      '<tr><td>Line-tracking module</td><td>Line-tracking port</td><td>A0 · A1 · A2</td></tr>' +
      '<tr><td>Camera module</td><td>Camera (4-pin) port</td><td>The UNO’s serial line (0 · 1)</td></tr>' +
      '<tr><td>Battery box</td><td>Power plug</td><td>Voltage measured on A3</td></tr></tbody></table>' +
      '<p class="small muted">The IR receiver (pin 9), colour LED (pin 4) and MODE button (pin 2) are already on the expansion board.</p>');
    UI.mcq(b, ctx, { id: 'q-build', q: 'When you test it, the car spins in a circle when it should drive forward. What’s the most likely cause?', options: ['The battery is flat', 'Motors on one side are plugged into the wrong ports (or a motor is in backwards)', 'The servo isn’t centred', 'The line sensor is upside down'], answer: 1, explain: 'If the motors on one side turn the wrong way, the two sides fight each other and the car spins. Check M1–M4 against the table.' });
    UI.note(b, ctx, { id: 'n-build', label: 'Build log: what went wrong at any stage, and how did you fix it?', placeholder: 'Stage 1: the second motor wouldn’t sit flat because… we fixed it by…', rows: 4 });
  } });

  steps.push({ id: 'factory', title: 'Test drive (factory program)', stage: '06 Test', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your car already has a program on it from the factory. Test with it first: if something doesn’t work now, it’s the <b>build</b>, not your code. Fix it before you write a single line.</p>');
    UI.callout(b, 'safety', 'On the floor', '<p>Test on the floor, not on a table. Clear a space about 2 m × 2 m. Keep the power switch where you can reach it.</p>');
    UI.html(b, '<h2>Run the tests</h2><p>Pull the plastic tab out of the remote first. Switch the car on and work down the list. Mark each one.</p>');
    UI.tests(b, ctx, { id: 'factory', rows: [
      '<b>Power on.</b> The status light comes on and the servo turns the sensor to face straight ahead.',
      '<b>Remote: arrows.</b> ▲ drives forward, ▼ backward, ◀ and ▶ turn. OK stops. (The number keys switch modes and change speed — the manual has a table.)',
      '<b>Drives straight.</b> Forward goes forward — it doesn’t spin or veer hard to one side.',
      '<b>MODE button: line tracking.</b> Press MODE until the light is <b>green</b>, put the car on a black tape line: it follows it.',
      '<b>MODE button: obstacle avoidance.</b> <b>Yellow</b>: it drives around and turns away before hitting things.',
      '<b>MODE button: follow.</b> <b>Blue</b>: hold your hand or a book about 20 cm in front of it and walk backward — it follows.',
      '<b>App (optional).</b> Slide the Upload/Cam switch to <b>Cam</b>, join the Wi-Fi called <b>ELEGOO-…</b> on a phone, open the ElegooKit app: live video and driving. (Switch back to <b>Upload</b> afterward.)'
    ] });
    UI.html(b, '<h2>If something fails</h2><div class="tests">' +
      '<div class="trow"><div><b>It spins or goes backward when you press ▲</b><br><span class="small muted">Motor cables on the wrong ports. Find the front (the line-sensor end), then check M1 left front, M2 right front, M3 right rear, M4 left rear.</span></div></div>' +
      '<div class="trow"><div><b>One wheel never turns</b><br><span class="small muted">Its cable is loose or in the wrong socket, or the wheel is rubbing on the plate or a screw head.</span></div></div>' +
      '<div class="trow"><div><b>The remote does nothing</b><br><span class="small muted">Plastic tab still in? Aim at the black dome on the expansion board. Try the MODE button — if that works, it’s the remote.</span></div></div>' +
      '<div class="trow"><div><b>It drifts to one side</b><br><span class="small muted">A little drift is normal (no two motors are identical). A lot: check a wheel isn’t rubbing, and that the gyro module is pushed firmly into its socket.</span></div></div>' +
      '<div class="trow"><div><b>Nothing at all / red status light</b><br><span class="small muted">Battery flat — charge it. Red means low battery.</span></div></div></div>');
    UI.callout(b, '', 'Good to know', '<p>When you upload your own programs, the factory program gets replaced. That’s fine — your teacher can put it back any time from the kit’s files (<b>SmartRobotCarV4.0_V1</b>).</p>');
  } });

  steps.push({ id: 'ide', title: 'Set up the IDE & your first program', stage: '05 Create', time: '40 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>program</b> is a list of instructions, written in a language the computer understands. You’ll write yours in the <b>Arduino IDE</b> (the app for writing Arduino code), then <b>upload</b> it: the IDE translates it into the UNO’s own language and copies it onto the car through the USB cable.</p>');
    UI.html(b, '<h2>1 · Set up the Arduino IDE</h2><ol>' +
      '<li>Open the <b>Arduino IDE</b> (version 2). If it isn’t installed, download it free from <b>arduino.cc/en/software</b> (Mac or Windows).</li>' +
      '<li>Plug the car into the computer with the USB cable (car power switch <b>off</b>, Upload/Cam switch on <b>Upload</b>).</li>' +
      '<li><b>Tools ▸ Board ▸ Arduino AVR Boards ▸ Arduino Uno.</b></li>' +
      '<li><b>Tools ▸ Port</b>: pick the one that appeared when you plugged in (on Windows <b>COM3</b> or similar; on a Mac <b>/dev/cu.usbserial-…</b> or <b>/dev/cu.wchusbserial-…</b>). No port? The board uses a <b>CH340</b> USB chip that some computers need a driver for — ask your teacher.</li>' +
      '<li>Install two <b>libraries</b> (ready-made code other people wrote, so you don’t have to): click the <b>Library Manager</b> icon (the books on the left), search and install <b>FastLED</b> (by Daniel Garcia) and <b>IRremote</b> (by shirriff, z3t0, ArminJo). The <b>Servo</b> library is already built in.</li></ol>' +
      '<p class="small muted">Did the Arduino unit on this computer? Then you probably only need FastLED.</p>');
    UI.html(b, '<h2>2 · Your first program</h2><p>This program says hello in the Serial Monitor and blinks the car’s LED blue. Step through it with the <b>Next</b> button — read every explanation. You’ll see these same pieces in every program you write.</p>');
    RL.Code.walk(b, HELLO, [
      { title: 'The big picture', html: '<p>Every Arduino program (a “sketch”) has two main parts: <code>setup()</code>, which runs <b>once</b> when the car switches on, and <code>loop()</code>, which runs <b>over and over, forever</b>. Everything else is details.</p>' },
      { lines: [1, 1], title: 'Comments', html: '<p>Anything after <code>//</code> is a <b>comment</b>: a note for humans. The UNO ignores it. Good programmers write lots of comments so their teammates (and future selves) know what the code does.</p>' },
      { lines: [2, 2], title: 'Including a library', html: '<p><code>#include &lt;FastLED.h&gt;</code> pulls in the FastLED library, which knows the complicated timing that colour LEDs need. Without this line, words like <code>CRGB</code> and <code>FastLED</code> would mean nothing to the IDE.</p>' },
      { lines: [4, 4], title: 'A place to store the colour', html: '<p><code>CRGB leds[1];</code> makes a box called <code>leds</code> that holds one colour (our car has one LED). <code>leds[0]</code> is that first (and only) LED — computers start counting at 0.</p><p>Notice the <b>semicolon</b> <code>;</code> at the end. Every instruction ends with one, like a full stop at the end of a sentence. Forgetting it is the #1 beginner error.</p>' },
      { lines: [6, 11], title: 'setup(): runs once', html: '<p>The code between the curly braces <code>{ }</code> is setup’s job. Braces always come in pairs: <code>{</code> starts a block, <code>}</code> ends it.</p><ul><li><code>Serial.begin(9600)</code> opens a chat line to the computer at 9600 “baud” (speed).</li><li><code>FastLED.addLeds&lt;NEOPIXEL, 4&gt;(leds, 1)</code> tells FastLED what kind of LED we have, that it’s on <b>pin 4</b>, and to use our <code>leds</code> box.</li><li><code>Serial.println("…")</code> prints a line of text in the Serial Monitor. Text always goes in double quotes.</li></ul>' },
      { lines: [13, 20], title: 'loop(): runs forever', html: '<p>Four instructions, then back to the top, again and again:</p><ol><li>put blue in the box,</li><li><code>FastLED.show()</code> sends the box to the real LED,</li><li><code>delay(500)</code> waits 500 milliseconds (1000 ms = 1 second) — the UNO just sits there,</li><li>black (off), show, wait.</li></ol><p>That’s a blink: half a second on, half a second off.</p>' },
      { title: 'Capital letters matter', html: '<p>Arduino code is <b>case-sensitive</b>: <code>Serial</code> works, <code>serial</code> doesn’t. <code>CRGB::Blue</code> works, <code>crgb::blue</code> doesn’t. If the IDE says something “was not declared”, check the capitals first.</p>' }
    ], { name: 'hello_robot' });
    UI.html(b, '<h2>3 · Try it on the virtual car</h2><p>Every mission has a <b>virtual robot car</b> that runs real Arduino code, so you can test ideas before you upload. Click <b>Upload &amp; run</b>. Watch the LED on the car (and the dot under the floor) and the Serial Monitor. Then try changing <code>Blue</code> to <code>Green</code>, or the delays to <code>100</code>, and run it again.</p>');
    K.sim(b, { title: 'Hello, robot', code: HELLO, name: 'hello_robot', key: 'sim-hello', ctx: ctx, runHint: 'watch the LED on the car and the Serial Monitor.', world: { w: 160, h: 90, start: { x: 80, y: 50, h: 0 }, grid: 10 }, checkAfter: 2500,
      check: function (w, api) { var s = api.serialText(); if (!/Hello/.test(s)) return { pass: false, msg: 'Nothing in the Serial Monitor yet — is Serial.println still in setup()?' }; return { pass: true, msg: 'Your first program runs. Now upload it to the real car.' }; } });
    UI.html(b, '<h2>4 · Upload it to the real car</h2>');
    K.uploadSteps(b, { keepUsb: true });
    UI.html(b, '<p>Then click the <b>Serial Monitor</b> icon (top right of the IDE, it looks like a magnifying glass) and set the speed menu to <b>9600 baud</b>. Press the <b>RESET</b> button on the UNO (or unplug and replug): “Hello! I am a robot.” appears and the LED blinks blue.</p>');
    UI.html(b, '<h2>When it goes wrong</h2><div class="tests">' +
      '<div class="trow"><div><b>“FastLED.h: No such file or directory”</b><br><span class="small muted">The library isn’t installed. Library Manager → search FastLED → Install.</span></div></div>' +
      '<div class="trow"><div><b>“expected ‘;’ before …”</b><br><span class="small muted">A missing semicolon on the line <i>before</i> the one it points to.</span></div></div>' +
      '<div class="trow"><div><b>“not in sync” / “programmer is not responding”</b><br><span class="small muted">Upload/Cam switch on Cam, or the wrong port selected.</span></div></div>' +
      '<div class="trow"><div><b>The Serial Monitor shows rubbish like ⸮⸮⸮</b><br><span class="small muted">The speed menu isn’t set to 9600 baud.</span></div></div></div>');
    UI.mcq(b, ctx, { id: 'q-loop', q: 'How many times does the code inside <code>setup()</code> run?', options: ['Once, when the board starts', 'Forever, over and over', 'Twice', 'Once per second'], answer: 0, explain: 'setup() runs once. loop() is the part that repeats forever.' });
  } });

  steps.push({ id: 'check', title: 'Systems check', stage: '06 Test', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now a program that tests every part of the car, one at a time: battery, LED, servo, each side’s wheels, then every sensor live. You don’t need to understand every line yet — you’ll write all of these pieces yourself in the coming missions — but look at how it’s organised.</p>');
    UI.callout(b, 'safety', 'Wheels up!', '<p>Put the car on a box or a roll of tape so the wheels spin in the air. Otherwise it will drive off during the wheel test.</p>');
    RL.Code.walk(b, CHECK, [
      { title: 'How it’s organised', html: '<p>The sketch is long, but it’s made of small, named pieces called <b>functions</b>: <code>checkBattery()</code>, <code>checkLed()</code>, <code>checkServo()</code>, <code>checkWheels()</code>, <code>readDistance()</code>. <code>setup()</code> just calls them in order. Breaking a big job into named pieces is the most important habit in programming.</p>' },
      { lines: [3, 5], title: 'Three libraries', html: '<p><b>Servo</b> (turns the sensor), <b>FastLED</b> (colour LED) and <b>IRremote</b> (remote). If any of these lines turns red when you compile, install that library.</p>' },
      { lines: [7, 18], title: 'Names for pins', html: '<p>Instead of remembering “the right motors’ speed is pin 5”, we give each pin a name with <code>const int</code>. <code>int</code> means a whole number; <code>const</code> means it never changes. From now on the code says <code>PWMA</code> instead of <code>5</code>, which is much easier to read and to fix.</p>' },
      { lines: K.fn(CHECK, 'setup'), title: 'setup()', html: '<p>Sets every pin up (<code>pinMode</code> = “is this pin an output or an input?”), starts the libraries, then runs the four checks in order. Each check prints what it’s doing, so you can follow along in the Serial Monitor.</p>' },
      { lines: K.fn(CHECK, 'loop'), title: 'loop(): the live sensor report', html: '<p>About three times a second it prints the distance and the three line-sensor numbers, says if the MODE button is pressed, and prints the code of any remote key that arrives. Watch the numbers change as you move things around the car.</p>' },
      { lines: K.fn(CHECK, 'checkBattery'), title: 'checkBattery()', html: '<p><code>float</code> is a number with decimals. The expansion board feeds a scaled-down copy of the battery voltage to pin A3, and <code>analogRead(A3) * 0.0375</code> turns the reading back into volts. A full pack reads about 8.4 V; under 7 V it needs charging. (Running on USB with the power switch off, it reads low — that’s expected.)</p>' },
      { lines: K.fn(CHECK, 'checkServo'), title: 'checkServo()', html: '<p><code>head.write(angle)</code> turns the servo: 90 is straight ahead, 30 looks right, 150 looks left. The <code>delay</code> gives it time to get there.</p>' },
      { lines: K.fn(CHECK, 'checkWheels'), title: 'checkWheels()', html: '<p>For each side: set the <b>direction</b> pin (HIGH = forward, LOW = backward), set the <b>speed</b> with <code>analogWrite</code> (0–255), wait a second, then speed 0 to stop. You’ll learn exactly how this works in the next mission.</p>' }
    ], { name: 'systems_check', maxHeight: '520px' });
    UI.html(b, '<h2>Run it on the virtual car</h2><p>The virtual car is on the floor (no box!), so during the wheel test it will turn on the spot. While the sensor report runs, drag the box in front of the car, drag the car over the black tape, click remote keys and hold the MODE button. Watch the Serial Monitor.</p>');
    K.sim(b, { remote: true, title: 'Systems check', code: CHECK, name: 'systems_check', key: 'sim-check', ctx: ctx, runHint: 'follow the Serial Monitor, then move the box, the car and press remote keys.', checkAfter: 15000,
      world: { w: 200, h: 120, start: { x: 70, y: 70, h: 0 }, boxes: [{ x: 60, y: 8, w: 30, h: 16, drag: true, label: 'BOX' }], lines: [{ pts: [[130, 10], [130, 110]] }] },
      check: function (w, api) { var s = api.serialText(); if (!/SYSTEMS CHECK/.test(s)) return { pass: false, msg: 'The check didn’t start — look for a compile error.' }; if (!/Distance/.test(s)) return { pass: false, msg: 'Wait for the wheel test to finish and the sensor report to start, then check again.' }; return { pass: true, msg: 'Every test ran. Now run it on the real car and fill in your log below.' }; } });
    UI.html(b, '<h2>Run it on the real car</h2>');
    K.uploadSteps(b, { keepUsb: true });
    UI.html(b, '<p>Mark each result. If something fails, use the troubleshooting from the test drive, fix it, and run the check again until everything passes.</p>');
    UI.tests(b, ctx, { id: 'syscheck', rows: [
      '<b>Battery</b> reads above 7 V (with the power switch on).',
      '<b>LED</b> shows red, then green, then blue.',
      '<b>Servo</b> looks ahead, right, left, ahead.',
      '<b>Right wheels</b> spin forward then backward — and it’s the <i>right</i> side (as seen from behind the car).',
      '<b>Left wheels</b> spin forward then backward on the left side.',
      '<b>Distance</b> changes when you move your hand in front of the sensor.',
      '<b>Line sensors</b>: all three numbers change between white paper and black tape.',
      '<b>Remote</b>: pressing a key prints a code.',
      '<b>MODE button</b>: “PRESSED” appears while you hold it.'
    ] });
    UI.note(b, ctx, { id: 'n-log', label: 'Systems log: write down your battery voltage, the line-sensor numbers on white and on black, and the code for ▲ on your remote.', placeholder: 'Battery: 8.1 V\nLine sensors on white: 60 55 70 · on black: 820 790 810\n▲ = 0x46', rows: 4 });
    UI.callout(b, '', 'Wheels on the wrong side or turning backward?', '<p>If “RIGHT wheels” makes the <b>left</b> side spin, the left and right motor cables are swapped. If one wheel spins the opposite way to its partner, that motor is on the wrong port (check M1–M4 against the table in the build step). <b>Fix the wiring, not the code</b>, so every program in the course works on your car.</p>');
  } });

  steps.push({ id: 'finish', title: 'Finish & care', stage: '07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Everything passes? Then finish the build properly so the car survives the next five weeks of crashes and tests.</p>');
    UI.tests(b, ctx, { id: 'finish', rows: [
      'All screws tightened, including the top plate. Give the car a gentle shake: nothing rattles.',
      'Cables tucked away from the wheels (a twist tie or tape helps). None stretched tight.',
      'Your team name on a piece of masking tape on the car — and on the battery and the remote.',
      'The battery is on charge at the end of each class (or swapped for a charged one).',
      'The Upload/Cam switch is on <b>Upload</b>.'
    ] });
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Your colours', html: 'Change the first program so the LED cycles through three colours of your choice. FastLED knows names like <code>CRGB::Purple</code>, <code>CRGB::Orange</code>, <code>CRGB::Pink</code> — or mix your own with <code>CRGB(255, 80, 0)</code> (red, green, blue, each 0–255).' },
      { tag: 'Code', title: 'Morse code', html: 'Make the LED blink your initials in Morse code (a dot is 200 ms on, a dash is 600 ms on, 200 ms off between them).' },
      { tag: 'Explore', title: 'Battery meter', html: 'Use the battery reading to set the LED colour: green above 7.6 V, yellow above 7.0 V, red below.', hint: 'You’ll need <code>if</code> and <code>else</code>: <code>if (volts &gt; 7.6) { … } else if (volts &gt; 7.0) { … } else { … }</code>' },
      { tag: 'Design', cls: 'c', title: 'Decorate it', html: 'Design a 3D-printed nameplate, bumper or mascot for the top plate in Fusion (keep it light and away from the sensors).' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What would you improve about your build, or which challenge did you try?', placeholder: 'We added…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.r01 = {
    steps: steps,
    evidence: K.evidence('Show your teacher your finished, tested robot car. Upload the photos, video and screenshot, answer the questions, then press Submit.', [
      K.photoFile('Photos of your car', 'One from above showing the whole car, and one close-up of the expansion board with all the cables plugged in. Up to 4.', 4),
      K.videoFile('Under 30 seconds: the factory test drive — drive it with the remote, then show one of the modes (line tracking, obstacle avoidance or follow).'),
      { id: 'shot', kind: 'photo', label: 'A screenshot of your systems check', help: 'The Serial Monitor showing the battery result and a few lines of the sensor report.', required: true, max: 2 }
    ], [
      { id: 'r1', q: 'Name three sensors on your car. For each one, what does it measure and which pin does the UNO read it on?' },
      { id: 'r2', q: 'Explain sense → think → act using your car as the example. Which parts do each job?' },
      { id: 'r3', q: 'What is the difference between setup() and loop()? Use your first program as an example.' },
      { id: 'r4', q: 'Describe one problem you found during the build or testing. How did you track down the cause, and how did you fix it?' }
    ])
  };
})(window);
