/* Solutions for the Mission 08 (Smart fan) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};

  var PINS = `#include <DHT.h>

const int ENABLE = 5;      // L293D pin 1: speed (PWM)
const int IN1 = 3;         // L293D pin 2: direction
const int IN2 = 4;         // L293D pin 7: direction
const int RELAY = 7;       // relay module S: the fan's power
const int KNOB = A0;       // potentiometer middle leg
const int DHT_PIN = 2;     // DHT11 S`;
  var CONSTS = `const float ON_TEMP = 26.0;
const float OFF_TEMP = 24.0;
const int AUTO_ZONE = 40;  // knob readings below this mean AUTO

DHT dht(DHT_PIN, DHT11);
bool hot = false;            // thermostat memory: too warm?
float temp = 20.0;           // last good reading
unsigned long lastRead = 0;  // when we last read the sensor (ms)`;
  var SETUP_BODY = `  pinMode(ENABLE, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(RELAY, OUTPUT);
  digitalWrite(IN1, HIGH);   // spin forward
  digitalWrite(IN2, LOW);
  dht.begin();
  Serial.begin(9600);`;
  var SENSE = `  // 1. read the sensor every 2 seconds, without pausing everything else
  if (millis() - lastRead >= 2000) {
    lastRead = millis();
    float t = dht.readTemperature();
    if (!isnan(t)) {
      temp = t;
    }
    if (!hot && temp > ON_TEMP) hot = true;    // hysteresis: on above 26
    if (hot && temp < OFF_TEMP) hot = false;   // off below 24
    Serial.print("Temp: ");
    Serial.print(temp);
    Serial.print(" C   too warm: ");
    Serial.println(hot ? "yes" : "no");
  }`;
  var MODE = `  // 2. pick the mode from the knob
  int knob = analogRead(KNOB);
  bool fanOn;
  int speed;
  if (knob < AUTO_ZONE) {
    // AUTO: the thermostat decides; warmer = faster (24 C -> 150, 32 C -> 255)
    fanOn = hot;
    speed = constrain(map(temp, 24, 32, 150, 255), 150, 255);
  } else {
    // MANUAL: always on, and the knob sets the speed
    fanOn = true;
    speed = map(knob, AUTO_ZONE, 1023, 90, 255);
  }`;
  var DRIVE = `  // 3. drive the relay and the L293D
  digitalWrite(RELAY, fanOn ? HIGH : LOW);
  analogWrite(ENABLE, speed);`;
  function sketch(head, parts) { return '\n/*\n' + head + '\n*/\n' + parts.join('\n\n'); }

  RL.SOLUTIONS.m08 = {

    'Oscillating fan': { name: 'fan_oscillate',
      note: '<p><b>Wiring:</b> servo brown → GND, red → 5V, orange → <b>pin 9</b>. Mount the fan’s motor and blade on the servo horn (hot glue, or a cardboard bracket). If the servo makes the UNO reset, power it from the breadboard’s 5V rail with a separate supply, sharing GND.</p><p><b>The idea:</b> we must not use <code>delay()</code> for the sweep, or the knob and thermostat would freeze. Instead we check the clock: every 30 ms, the servo moves <b>one degree</b>. A variable <code>direction</code> is +1 (sweeping one way) or −1 (the other way); when the angle reaches an end, we flip it. The fan only sweeps while it’s running.</p>',
      code: sketch(`  Mission 08 extension: Oscillating fan
  The fan head sits on a servo that sweeps slowly left and right
  while the fan runs, like a real desk fan.`, ['#include <Servo.h>          // NEW: for the servo\n' + PINS + `
const int SERVO_PIN = 9;   // NEW: the servo's orange wire`, CONSTS + `

// NEW: the sweep
Servo swivel;
int angle = 90;              // where the fan is pointing now (degrees)
int direction = 1;           // +1 = sweeping one way, -1 = sweeping back
unsigned long lastMove = 0;  // when the servo last moved (ms)
const int LEFT_END = 30;     // how far it sweeps each way
const int RIGHT_END = 150;`,
      `void setup() {
` + SETUP_BODY + `
  swivel.attach(SERVO_PIN);    // NEW
  swivel.write(angle);
}`,
      `void loop() {
` + SENSE + `

` + MODE + `

` + DRIVE + `

  // NEW: 4. sweep the fan head one degree every 30 ms, but only while the fan is running
  if (fanOn && millis() - lastMove >= 30) {
    lastMove = millis();
    angle = angle + direction;               // one degree further
    if (angle >= RIGHT_END || angle <= LEFT_END) {
      direction = -direction;                // reached an end: turn round (+1 becomes -1, -1 becomes +1)
    }
    swivel.write(angle);
  }
  delay(5);   // shorter than the mission's 50 ms, so the sweep stays smooth
}`]) },

    'Speed presets': { name: 'fan_presets',
      note: '<p><b>Wiring:</b> two push buttons, each between a pin and <b>GND</b> (no resistor: <code>INPUT_PULLUP</code> uses one inside the UNO). LOW button → <b>pin 8</b>, HIGH button → <b>pin 12</b>. Pressed reads LOW.</p><p><b>The idea:</b> a variable <code>preset</code> remembers whether a button has taken over: 0 = no (the knob is in charge), otherwise it holds the preset speed. When a button is pressed we also note where the knob was. If the knob later moves by more than 20 from that spot, someone is turning it, so the knob takes control back. <code>abs()</code> gives the size of a difference, ignoring whether it’s up or down.</p>',
      code: sketch(`  Mission 08 extension: Speed presets
  Two buttons set LOW and HIGH speed presets. A preset overrides the
  knob until the knob is turned again.`, [PINS + `
const int LOW_BUTTON = 8;    // NEW: button to GND (INPUT_PULLUP)
const int HIGH_BUTTON = 12;  // NEW: button to GND (INPUT_PULLUP)`, CONSTS + `

// NEW: the presets
const int LOW_SPEED = 110;
const int HIGH_SPEED = 255;
int preset = 0;              // 0 = no preset (the knob is in charge), otherwise the preset speed
int knobAtPress = 0;         // where the knob was when the preset button was pressed`,
      `void setup() {
` + SETUP_BODY + `
  pinMode(LOW_BUTTON, INPUT_PULLUP);    // NEW
  pinMode(HIGH_BUTTON, INPUT_PULLUP);
}`,
      `void loop() {
` + SENSE + `

  int knob = analogRead(KNOB);

  // NEW: the preset buttons
  if (digitalRead(LOW_BUTTON) == LOW && preset != LOW_SPEED) {     // pressed (and not already on LOW)
    preset = LOW_SPEED;
    knobAtPress = knob;                   // remember where the knob is now
    Serial.println("Preset: LOW");
  }
  if (digitalRead(HIGH_BUTTON) == LOW && preset != HIGH_SPEED) {   // pressed (and not already on HIGH)
    preset = HIGH_SPEED;
    knobAtPress = knob;
    Serial.println("Preset: HIGH");
  }
  // NEW: has the knob been turned since? abs() = how big the change is, up or down
  if (preset > 0 && abs(knob - knobAtPress) > 20) {
    preset = 0;                           // yes: the knob takes control back
    Serial.println("Knob is back in charge");
  }

  // 2. pick the mode: a preset, or the knob as before
  bool fanOn;
  int speed;
  if (preset > 0) {
    fanOn = true;                         // NEW: a preset is on: run at the preset speed
    speed = preset;
  } else if (knob < AUTO_ZONE) {
    // AUTO: the thermostat decides; warmer = faster (24 C -> 150, 32 C -> 255)
    fanOn = hot;
    speed = constrain(map(temp, 24, 32, 150, 255), 150, 255);
  } else {
    // MANUAL: always on, and the knob sets the speed
    fanOn = true;
    speed = map(knob, AUTO_ZONE, 1023, 90, 255);
  }

` + DRIVE + `
  delay(50);
}`]) },

    'Report the room': { name: 'fan_report',
      note: '<p><b>The idea:</b> one tidy line, every 2 seconds, with everything someone would want to know. It uses the same clock trick as the sensor: remember when we last printed, and print again once 2000 ms have passed.</p><p>The mode and speed are worked out later in loop() than the sensor reading, so the report goes at the <b>end</b> of loop(), where all the numbers are ready. Example line:</p><p><code>24.5 C | 41 % | AUTO | fan OFF | speed 150</code></p><p>To show it on the LCD from Mission 06 instead, use <code>lcd.setCursor()</code> and <code>lcd.print()</code> in the same place (with the LCD on free pins, for example 6, 8, 9, 10, 11, 12).</p>',
      code: sketch(`  Mission 08 extension: Report the room
  Every 2 seconds, prints one tidy status line:
  temperature, humidity, mode, fan on/off and speed.`, [PINS, CONSTS + `
float humidity = 0;            // NEW: last good humidity reading
unsigned long lastReport = 0;  // NEW: when we last printed the status line`,
      `void setup() {
` + SETUP_BODY + `
}`,
      `void loop() {
  // 1. read the sensor every 2 seconds, without pausing everything else
  if (millis() - lastRead >= 2000) {
    lastRead = millis();
    float t = dht.readTemperature();
    if (!isnan(t)) {
      temp = t;
    }
    float h = dht.readHumidity();          // NEW: humidity too
    if (!isnan(h)) {
      humidity = h;
    }
    if (!hot && temp > ON_TEMP) hot = true;    // hysteresis: on above 26
    if (hot && temp < OFF_TEMP) hot = false;   // off below 24
  }

` + MODE + `

` + DRIVE + `

  // NEW: 4. one tidy status line every 2 seconds
  if (millis() - lastReport >= 2000) {
    lastReport = millis();
    Serial.print(temp, 1);
    Serial.print(" C | ");
    Serial.print(humidity, 0);
    Serial.print(" % | ");
    Serial.print(knob < AUTO_ZONE ? "AUTO" : "MANUAL");
    Serial.print(" | fan ");
    Serial.print(fanOn ? "ON " : "OFF");
    Serial.print(" | speed ");
    Serial.println(speed);
  }
  delay(50);
}`]) },

    'Kick-start': { name: 'fan_kick_start',
      note: '<p><b>The idea:</b> a motor needs more push to <b>start</b> turning than to <b>keep</b> turning (it has to overcome friction first). So whenever the fan goes from off to on, we give it a short burst at full power (255) for 150 ms, then drop to the speed it should really run at.</p><p>To know when the fan has <b>just</b> switched on, a <code>bool</code> called <code>wasOn</code> remembers whether it was running last time round loop(). “On now, but not on last time” means it’s just started.</p>',
      code: sketch(`  Mission 08 extension: Kick-start
  When the fan switches on, it gets a short burst at full speed first,
  so it starts reliably even at a low speed setting.`, [PINS, CONSTS + `
bool wasOn = false;          // NEW: was the fan running last time through loop()?
const int KICK_MS = 150;     // NEW: how long the full-power kick lasts`,
      `void setup() {
` + SETUP_BODY + `
}`,
      `void loop() {
` + SENSE + `

` + MODE + `

  // 3. drive the relay and the L293D
  digitalWrite(RELAY, fanOn ? HIGH : LOW);

  // NEW: just switched on (on now, but not last time)? Give it a kick first.
  if (fanOn && !wasOn) {
    analogWrite(ENABLE, 255);   // full power...
    delay(KICK_MS);             // ...for a moment
    Serial.println("Kick-start!");
  }
  wasOn = fanOn;                // remember for next time

  analogWrite(ENABLE, speed);   // then the speed it should really run at
  delay(50);
}`]) },

    'Measure the breeze': { name: 'fan_breeze_test',
      note: '<p><b>The idea:</b> a little <b>test program</b> to make the experiment fair. It runs the fan at each test speed for 10 seconds — long enough for the tissue to settle — and tells you in the Serial Monitor when to measure. The speeds live in an <b>array</b>, so you can add more (try 120 and 230 too!).</p><p><b>How to use it:</b> hang a strip of tissue paper 30 cm in front of the fan. Open the Serial Monitor. When it says “measure now”, measure how far the bottom of the tissue has lifted (or its angle). Put your results in a table and draw a graph of lift against speed. Is it a straight line?</p>',
      code: `
/*
  Mission 08 extension: Measure the breeze
  A test program: runs the fan at 100, 150, 200 and 255 for 10 seconds
  each, and tells you in the Serial Monitor when to measure.
*/

const int ENABLE = 5;      // L293D pin 1: speed (PWM)
const int IN1 = 3;         // L293D pin 2: direction
const int IN2 = 4;         // L293D pin 7: direction
const int RELAY = 7;       // relay module S: the fan's power

int testSpeeds[] = { 100, 150, 200, 255 };   // the speeds to test (add more if you like)
const int NUM_TESTS = 4;                     // how many speeds are in the list
const int SETTLE_MS = 7000;                  // time for the tissue to settle before measuring
const int MEASURE_MS = 3000;                 // time to take the measurement

void setup() {
  pinMode(ENABLE, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(RELAY, OUTPUT);
  digitalWrite(IN1, HIGH);   // spin forward
  digitalWrite(IN2, LOW);
  Serial.begin(9600);
  Serial.println("Breeze test starts in 5 seconds. Get your ruler ready!");
  delay(5000);

  digitalWrite(RELAY, HIGH);                 // power the fan for the whole test
  for (int i = 0; i < NUM_TESTS; i++) {
    analogWrite(ENABLE, 255);                // a quick kick so slow speeds start reliably
    delay(150);
    analogWrite(ENABLE, testSpeeds[i]);      // then the test speed

    Serial.print("Speed ");
    Serial.print(testSpeeds[i]);
    Serial.println(": wait for the tissue to settle...");
    delay(SETTLE_MS);
    Serial.println("   >>> MEASURE NOW <<<");
    delay(MEASURE_MS);
  }

  analogWrite(ENABLE, 0);                    // all done: switch everything off
  digitalWrite(RELAY, LOW);
  Serial.println("Test finished. Press the UNO's reset button to run it again.");
}

void loop() {
  // nothing: the test runs once, in setup()
}` }
  };
})(window);
