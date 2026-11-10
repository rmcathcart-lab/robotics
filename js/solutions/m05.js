/* Solutions for the Mission 05 (Parking assistant) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};

  // the parts of the mission's sketch that every solution shares, written once here
  var PINS = `const int TRIG = 12;
const int ECHO = 11;
const int BUZZER = 8;
const int GREEN_LED = 7;
const int YELLOW_LED = 6;
const int RED_LED = 5;`;
  var READ = `// pings once; returns cm (999 = nothing there)
int readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);   // 10 us HIGH = ping!
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000);  // max 30 ms
  if (duration == 0) return 999;   // no echo
  return duration / 58;
}`;
  var BUZZ = `// turns the buzzer on or off, but only if it needs to change
void setBuzzer(bool on) {
  if (on != buzzing) {
    digitalWrite(BUZZER, on);
    buzzing = on;
  }
}`;
  var SETUP_PINS = `  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);`;
  var PRINT = `  if (now - lastPrint >= 500) {   // twice a second
    lastPrint = now;
    Serial.print("Distance: ");
    if (cm == 999) {
      Serial.println("nothing in range");
    } else {
      Serial.print(cm);
      Serial.println(" cm");
    }
  }`;
  function zone(near) {
    return `// lights the LED for distance d
void showZone(int d) {
  if (d > FAR_CM) {                 // far away: green
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, LOW);
  } else if (d > ` + near + `) {         // getting close: yellow
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, LOW);
  } else {                          // nearly there: red
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, HIGH);
  }
}`;
  }
  function beeper(stop) {
    return `// beeps faster as the car gets closer, never stopping
void updateBeeper(unsigned long now) {
  if (cm <= ` + stop + `) {
    setBuzzer(true);    // too close: solid tone
  } else if (cm <= FAR_CM) {
    int gap = map(cm, ` + stop + `, FAR_CM, 60, 600);
    if (now - lastBeep >= gap) {      // time to beep?
      lastBeep = now;
      setBuzzer(true);
    }
    if (now - lastBeep >= BEEP_MS) {  // beep long enough?
      setBuzzer(false);
    }
  } else {
    setBuzzer(false);   // far away: quiet
  }
}`;
  }
  var VARS = `int cm = 999;                 // latest distance
unsigned long lastPing = 0;   // last measurement
unsigned long lastBeep = 0;   // last beep start
bool buzzing = false;         // is the buzzer on now?
unsigned long lastPrint = 0;  // last report`;

  RL.SOLUTIONS.m05 = {

    'Smooth it out': { name: 'parking_smooth',
      note: '<p><b>The idea:</b> keep the last 5 readings in an <b>array</b>, <code>last[5]</code>, and use their <b>average</b>. A new reading goes into the box after the one used last time; <code>% 5</code> makes the box number go 0, 1, 2, 3, 4, 0, 1, … so the newest reading always replaces the oldest one. That’s called a <b>moving average</b>.</p><p>One odd reading now only moves the average a fifth of the way, so the LEDs stop flickering between two zones.</p>',
      code: `
/*
  Mission 05 extension: Smooth it out
  The parking assistant uses the average of the last 5 readings,
  so the LEDs don't flicker when the car sits right on a zone line.
*/
` + PINS + `

const int FAR_CM = 50;    // beyond: green, quiet
const int NEAR_CM = 20;   // closer: red
const int STOP_CM = 10;   // closer: solid tone
const int BEEP_MS = 40;   // beep length (ms)

` + VARS + `

// NEW: the moving average
const int HOW_MANY = 5;       // how many readings to average
int last[HOW_MANY];           // the last 5 readings (a row of 5 boxes)
int slot = 0;                 // which box the next reading goes in (0 to 4)

void setup() {
` + SETUP_PINS + `
  // fill all 5 boxes with a first reading, so the first average makes sense
  int first = readDistance();
  for (int i = 0; i < HOW_MANY; i++) {
    last[i] = first;
  }
}

// NEW: takes a new reading, stores it, and returns the average of the last 5
int smoothDistance() {
  last[slot] = readDistance();        // the new reading replaces the oldest one
  slot = (slot + 1) % HOW_MANY;       // next box: 0, 1, 2, 3, 4, then back to 0

  int total = 0;                      // add up all 5 boxes...
  for (int i = 0; i < HOW_MANY; i++) {
    total = total + last[i];
  }
  return total / HOW_MANY;            // ...and divide by 5
  // (if nothing is in range, the readings are 999, so the average is big too: green)
}

void loop() {
  unsigned long now = millis();

  if (now - lastPing >= 60) {     // ~16 times a second
    lastPing = now;
    cm = smoothDistance();        // NEW: the smoothed distance instead of a single reading
    showZone(cm);
  }

  updateBeeper(now);

` + PRINT + `
}

` + READ + `

` + zone('NEAR_CM') + `

` + BUZZ + `

` + beeper('STOP_CM') },

    'Adjustable stop line': { name: 'parking_adjustable',
      note: '<p><b>Wiring:</b> a potentiometer: outer legs to <b>5V</b> and <b>GND</b>, middle leg (the wiper) to <b>A0</b>.</p><p><b>The idea:</b> the stop distance can’t be a <code>const</code> any more, because it changes while the program runs. It becomes a normal variable, <code>stopCm</code>, set every loop with <code>map()</code>: the knob’s 0–1023 becomes 5–30 cm.</p><p>The red zone has to stay <b>further out</b> than the stop line, so it moves too: it starts 10 cm before the stop line.</p>',
      code: `
/*
  Mission 05 extension: Adjustable stop line
  A knob on A0 sets the stop distance anywhere from 5 to 30 cm.
  The red zone moves with it (it starts 10 cm before the stop line).
*/
` + PINS + `
const int KNOB = A0;      // NEW: potentiometer wiper

const int FAR_CM = 50;    // beyond: green, quiet
const int BEEP_MS = 40;   // beep length (ms)

int stopCm = 10;          // NEW: closer than this = solid tone. A variable now, not a const!
int nearCm = 20;          // NEW: closer than this = red (always 10 cm more than stopCm)

` + VARS + `

void setup() {
` + SETUP_PINS + `
}

void loop() {
  unsigned long now = millis();

  // NEW: read the knob and turn 0-1023 into a stop distance of 5-30 cm
  stopCm = map(analogRead(KNOB), 0, 1023, 5, 30);
  nearCm = stopCm + 10;

  if (now - lastPing >= 60) {     // ~16 times a second
    lastPing = now;
    cm = readDistance();
    showZone(cm);
  }

  updateBeeper(now);

  if (now - lastPrint >= 500) {   // twice a second
    lastPrint = now;
    Serial.print("Stop line: ");
    Serial.print(stopCm);
    Serial.print(" cm   Distance: ");
    if (cm == 999) {
      Serial.println("nothing in range");
    } else {
      Serial.print(cm);
      Serial.println(" cm");
    }
  }
}

` + READ + `

` + zone('nearCm') + `

` + BUZZ + `

` + beeper('stopCm') },

    'Sonar radar': { name: 'sonar_radar',
      note: '<p><b>Wiring:</b> tape or rubber-band the distance sensor onto the servo horn so it turns with it. Servo: brown → GND, red → 5V, orange (signal) → <b>pin 9</b>. The sensor stays on pins 12 and 11.</p><p><b>The idea:</b> a for loop turns the servo a few degrees at a time; at each angle it measures and prints <code>angle,distance</code>. A second for loop sweeps back. In <b>Tools → Serial Plotter</b> the distance line dips wherever something is close — that’s your radar picture. The LEDs still show the zone for whatever it’s pointing at.</p>',
      code: `
/*
  Mission 05 extension: Sonar radar
  The distance sensor sits on a servo that sweeps from 0 to 180 degrees
  and back. At each step it prints  angle,distance  for the Serial Plotter.
*/
#include <Servo.h>

const int TRIG = 12;
const int ECHO = 11;
const int GREEN_LED = 7;
const int YELLOW_LED = 6;
const int RED_LED = 5;
const int SERVO_PIN = 9;   // NEW: the servo's orange wire

const int FAR_CM = 50;    // beyond: green
const int NEAR_CM = 20;   // closer: red
const int STEP = 3;       // degrees per step (smaller = slower, more detailed)

Servo turret;             // the servo that turns the sensor

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  turret.attach(SERVO_PIN);
}

// points the sensor at one angle, measures, and prints "angle,distance"
void scanAt(int angle) {
  turret.write(angle);
  delay(30);                     // give the servo time to get there
  int d = readDistance();
  if (d > 200) d = 200;          // keep "nothing there" (999) from squashing the plot
  showZone(d);
  Serial.print(angle);
  Serial.print(",");             // the Serial Plotter draws each comma-separated number as a line
  Serial.println(d);
}

void loop() {
  // sweep left to right...
  for (int a = 0; a <= 180; a = a + STEP) {
    scanAt(a);
  }
  // ...and back again
  for (int a = 180; a >= 0; a = a - STEP) {
    scanAt(a);
  }
}

` + READ + `

` + zone('NEAR_CM') },

    'Temperature-corrected': { name: 'parking_temp_corrected',
      note: '<p><b>Wiring:</b> the DHT11 from Mission 04: <b>S → pin 2</b>, middle → 5V, − → GND.</p><p><b>The science:</b> sound travels faster in warm air. At 20 °C it’s about 343 m/s; at 0 °C only 331 m/s. The mission’s <code>/ 58</code> assumes one temperature. Here we work it out properly:</p><ul><li><code>v = 331.3 + 0.606 × temperature</code> (metres per second)</li><li>Divide by 10 000 to get <b>centimetres per microsecond</b> (100 cm in a metre, 1 000 000 µs in a second).</li><li>The echo time is there <b>and back</b>, so distance = time × speed ÷ 2.</li></ul><p>These need decimals, so they’re <code>float</code>s. Redo your accuracy log and compare!</p>',
      code: `
/*
  Mission 05 extension: Temperature-corrected
  Uses the DHT11 to work out the real speed of sound, so the
  distance is right whether the garage is cold or warm.
*/
#include <DHT.h>

` + PINS + `
const int DHT_PIN = 2;    // NEW: DHT11 signal pin

const int FAR_CM = 50;    // beyond: green, quiet
const int NEAR_CM = 20;   // closer: red
const int STOP_CM = 10;   // closer: solid tone
const int BEEP_MS = 40;   // beep length (ms)

DHT dht(DHT_PIN, DHT11);

` + VARS + `
float tempC = 20.0;           // NEW: latest temperature (20 C until the first reading)
unsigned long lastTemp = 0;   // NEW: when we last read the temperature

void setup() {
` + SETUP_PINS + `
  dht.begin();
}

void loop() {
  unsigned long now = millis();

  // NEW: read the temperature every 2 seconds (it doesn't change quickly)
  if (now - lastTemp >= 2000) {
    lastTemp = now;
    float t = dht.readTemperature();
    if (!isnan(t)) {
      tempC = t;
    }
  }

  if (now - lastPing >= 60) {     // ~16 times a second
    lastPing = now;
    cm = readDistance();
    showZone(cm);
  }

  updateBeeper(now);

  if (now - lastPrint >= 500) {   // twice a second
    lastPrint = now;
    Serial.print(tempC, 1);
    Serial.print(" C   Distance: ");
    if (cm == 999) {
      Serial.println("nothing in range");
    } else {
      Serial.print(cm);
      Serial.println(" cm");
    }
  }
}

// pings once; returns cm (999 = nothing there)
// NEW: uses the speed of sound for the current temperature
int readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);   // 10 us HIGH = ping!
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000);  // max 30 ms
  if (duration == 0) return 999;   // no echo

  float speed = 331.3 + 0.606 * tempC;      // speed of sound in metres per second
  float cmPerMicro = speed / 10000.0;       // the same speed in cm per microsecond
  float distance = duration * cmPerMicro / 2.0;   // there and back, so halve it
  return round(distance);                   // round to the nearest whole cm
}

` + zone('NEAR_CM') + `

` + BUZZ + `

` + beeper('STOP_CM') },

    'Readout display': { name: 'parking_lcd',
      note: '<p><b>Wiring</b> (the LCD1602, as in Mission 06, but on the pins this project has free): <b>RS → 2</b>, <b>E → 3</b>, <b>D4 → 4</b>, <b>D5 → 9</b>, <b>D6 → 10</b>, <b>D7 → 13</b>. Also: VSS and RW → GND, VDD → 5V, V0 → the contrast potentiometer’s middle leg, A → 5V through 220 Ω, K → GND.</p><p><b>The idea:</b> the top row shows the distance in big friendly words; the bottom row is a <b>bar</b> that gets shorter as the car gets closer, made of solid block characters (<code>lcd.write(255)</code>). We only update the screen twice a second, because writing to the LCD is slow and would make the beeper stutter.</p>',
      code: `
/*
  Mission 05 extension: Readout display
  The parking assistant also shows the distance on an LCD1602:
  the number on the top row, and a shrinking bar on the bottom row.
*/
#include <LiquidCrystal.h>

` + PINS + `

LiquidCrystal lcd(2, 3, 4, 9, 10, 13);   // NEW: RS, E, D4, D5, D6, D7 (pins this project isn't using)

const int FAR_CM = 50;    // beyond: green, quiet
const int NEAR_CM = 20;   // closer: red
const int STOP_CM = 10;   // closer: solid tone
const int BEEP_MS = 40;   // beep length (ms)

` + VARS + `

void setup() {
` + SETUP_PINS + `
  lcd.begin(16, 2);        // NEW: a 16-character, 2-row screen
  lcd.print("Parking helper");
}

// NEW: shows the distance on the LCD
void showOnLcd(int d) {
  lcd.setCursor(0, 0);                 // top row
  if (d == 999) {
    lcd.print("All clear       ");     // the spaces wipe out any old letters
  } else if (d <= STOP_CM) {
    lcd.print("STOP!           ");
  } else {
    lcd.print("Distance: ");
    lcd.print(d);
    lcd.print(" cm   ");
  }

  // bottom row: a bar of up to 16 blocks. Far = long bar, close = short bar.
  int blocks = map(constrain(d, STOP_CM, FAR_CM), STOP_CM, FAR_CM, 0, 16);
  lcd.setCursor(0, 1);
  for (int i = 0; i < 16; i++) {
    if (i < blocks) {
      lcd.write(255);                  // character 255 is a solid block
    } else {
      lcd.print(" ");                  // the rest of the row is blank
    }
  }
}

void loop() {
  unsigned long now = millis();

  if (now - lastPing >= 60) {     // ~16 times a second
    lastPing = now;
    cm = readDistance();
    showZone(cm);
  }

  updateBeeper(now);

  if (now - lastPrint >= 500) {   // twice a second
    lastPrint = now;
    showOnLcd(cm);                // NEW: update the screen at the same time as the Serial Monitor
    Serial.print("Distance: ");
    if (cm == 999) {
      Serial.println("nothing in range");
    } else {
      Serial.print(cm);
      Serial.println(" cm");
    }
  }
}

` + READ + `

` + zone('NEAR_CM') + `

` + BUZZ + `

` + beeper('STOP_CM') }
  };
})(window);
