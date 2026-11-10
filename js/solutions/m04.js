/* Solutions for the Mission 04 (Weather gauge) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};
  RL.SOLUTIONS.m04 = {

    'Highs and lows': { name: 'gauge_high_low',
      note: '<p><b>The idea:</b> two variables remember the extremes. <code>lowest</code> starts impossibly high (100 °C) and <code>highest</code> impossibly low (−100 °C), so the very first reading beats both. After that, a reading only replaces <code>lowest</code> if it’s lower, and only replaces <code>highest</code> if it’s higher.</p><p><b>The bonus:</b> while the button is held down we watch the clock. If it’s still down after 2 seconds, the needle swings to the high temperature and stays there until you let go. A short press still switches modes, as before.</p>',
      code: `
/*
  Mission 04 extension: Highs and lows
  The gauge remembers the lowest and highest temperature since it was
  switched on, and prints them whenever they change.
  Bonus: hold the button for 2 seconds to show the HIGH on the needle.
*/
#include <Servo.h>
#include <DHT.h>

const int DHT_PIN = 2;
const int MODE_BUTTON = 4;
const int SERVO_PIN = 9;

// the scales on your dial (left end = 0, right end = 180)
const int LOW_TEMP = 0;
const int HIGH_TEMP = 40;
const int LOW_HUM = 20;
const int HIGH_HUM = 90;

DHT dht(DHT_PIN, DHT11);
Servo needle;

bool showHumidity = false;   // true = humidity mode
int needleAngle = 90;        // where the needle is now
int lastTarget = -1;         // last target printed

float lowest = 100;          // NEW: lowest temperature so far (starts silly-high so any reading beats it)
float highest = -100;        // NEW: highest temperature so far (starts silly-low)

void setup() {
  Serial.begin(9600);
  dht.begin();
  needle.attach(SERVO_PIN);
  needle.write(needleAngle);
  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED_BUILTIN, OUTPUT);
}

// NEW: points the needle at the highest temperature so far
void showHigh() {
  int angle = map(highest, LOW_TEMP, HIGH_TEMP, 0, 180);
  angle = constrain(angle, 0, 180);
  needle.write(angle);
  needleAngle = angle;       // remember where the needle went, so it moves back smoothly later
  Serial.print("Highest so far: ");
  Serial.println(highest, 1);
}

void loop() {
  // 1. the button: a short press switches modes, a 2-second hold shows the high
  if (digitalRead(MODE_BUTTON) == LOW) {
    unsigned long pressStart = millis();     // when the press began
    bool showedHigh = false;
    while (digitalRead(MODE_BUTTON) == LOW) {
      // still held down: has it been 2 seconds yet?
      if (!showedHigh && millis() - pressStart >= 2000) {
        showHigh();
        showedHigh = true;                   // only do it once per hold
      }
    }
    if (!showedHigh) {                       // it was a short press: switch modes
      showHumidity = !showHumidity;
      digitalWrite(LED_BUILTIN, showHumidity);
    }
    delay(50);
  }

  // NEW: always read the temperature, even in humidity mode, so we never miss a high or low
  float t = dht.readTemperature();
  if (!isnan(t)) {
    if (t < lowest) {                        // colder than ever before?
      lowest = t;
      Serial.print("New LOW: ");
      Serial.println(lowest, 1);
    }
    if (t > highest) {                       // warmer than ever before?
      highest = t;
      Serial.print("New HIGH: ");
      Serial.println(highest, 1);
    }
  }

  // 2. read the sensor and work out where the needle should point
  float reading;
  if (showHumidity) reading = dht.readHumidity();
  else reading = t;
  if (isnan(reading)) return;   // no reading this time

  int target;
  if (showHumidity) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);
  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);
  target = constrain(target, 0, 180);   // stay on the dial

  if (target != lastTarget) {   // print only changes
    Serial.print(showHumidity ? "Humidity " : "Temperature ");
    Serial.print(reading, 0);
    Serial.print(" -> needle to ");
    Serial.println(target);
    lastTarget = target;
  }

  // 3. move the needle one degree at a time (smooth)
  if (needleAngle < target) needleAngle++;
  if (needleAngle > target) needleAngle--;
  needle.write(needleAngle);
  delay(15);
}` },

    'Comfort light': { name: 'gauge_comfort',
      note: '<p><b>Wiring:</b> a green LED with a 220 Ω resistor: long leg → resistor → <b>pin 7</b>, short leg → GND. (Pins 3, 5, 6, 7, 8 and 10–12 are free.)</p><p><b>The idea:</b> <code>&amp;&amp;</code> means “and”. <code>t &gt;= 19 &amp;&amp; t &lt;= 24</code> is only true when <b>both</b> parts are true: warm enough <b>and</b> cool enough. We check it every loop, in both modes.</p>',
      code: `
/*
  Mission 04 extension: Comfort light
  A green LED is on only when the temperature is in the comfort zone (19-24 C).
*/
#include <Servo.h>
#include <DHT.h>

const int DHT_PIN = 2;
const int MODE_BUTTON = 4;
const int SERVO_PIN = 9;
const int COMFORT_LED = 7;      // NEW: green LED + 220 ohm resistor

// the scales on your dial (left end = 0, right end = 180)
const int LOW_TEMP = 0;
const int HIGH_TEMP = 40;
const int LOW_HUM = 20;
const int HIGH_HUM = 90;

// NEW: your comfort zone (change these to suit you)
const float COMFY_LOW = 19.0;
const float COMFY_HIGH = 24.0;

DHT dht(DHT_PIN, DHT11);
Servo needle;

bool showHumidity = false;   // true = humidity mode
int needleAngle = 90;        // where the needle is now
int lastTarget = -1;         // last target printed

void setup() {
  Serial.begin(9600);
  dht.begin();
  needle.attach(SERVO_PIN);
  needle.write(needleAngle);
  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(COMFORT_LED, OUTPUT);
}

void loop() {
  // 1. the button switches modes
  if (digitalRead(MODE_BUTTON) == LOW) {
    showHumidity = !showHumidity;
    digitalWrite(LED_BUILTIN, showHumidity);
    while (digitalRead(MODE_BUTTON) == LOW) {
      // wait until the button is let go
    }
    delay(50);
  }

  // NEW: the comfort light, checked in both modes
  float t = dht.readTemperature();
  if (!isnan(t)) {
    // && means AND: both have to be true
    if (t >= COMFY_LOW && t <= COMFY_HIGH) {
      digitalWrite(COMFORT_LED, HIGH);   // comfy!
    } else {
      digitalWrite(COMFORT_LED, LOW);    // too cold or too warm
    }
  }

  // 2. read the sensor and work out where the needle should point
  float reading;
  if (showHumidity) reading = dht.readHumidity();
  else reading = t;
  if (isnan(reading)) return;   // no reading this time

  int target;
  if (showHumidity) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);
  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);
  target = constrain(target, 0, 180);   // stay on the dial

  if (target != lastTarget) {   // print only changes
    Serial.print(showHumidity ? "Humidity " : "Temperature ");
    Serial.print(reading, 0);
    Serial.print(" -> needle to ");
    Serial.println(target);
    lastTarget = target;
  }

  // 3. move the needle one degree at a time (smooth)
  if (needleAngle < target) needleAngle++;
  if (needleAngle > target) needleAngle--;
  needle.write(needleAngle);
  delay(15);
}` },

    'Fahrenheit mode': { name: 'gauge_three_modes',
      note: '<p><b>The idea:</b> with three modes, true/false isn’t enough any more, so <code>showHumidity</code> becomes a number, <code>mode</code>: 0 = °C, 1 = humidity, 2 = °F. Each press adds 1, and <code>% 3</code> (the remainder after dividing by 3) wraps 3 back round to 0: 0 → 1 → 2 → 0 → …</p><p>Draw a third scale on your dial for °F. 0–40 °C is 32–104 °F, so the needle points to the same place for the same temperature on both scales.</p>',
      code: `
/*
  Mission 04 extension: Fahrenheit mode
  The button cycles through three modes:
    0 = temperature in C   1 = humidity   2 = temperature in F
  The L LED is on in humidity mode.
*/
#include <Servo.h>
#include <DHT.h>

const int DHT_PIN = 2;
const int MODE_BUTTON = 4;
const int SERVO_PIN = 9;

// the scales on your dial (left end = 0, right end = 180)
const int LOW_TEMP = 0;
const int HIGH_TEMP = 40;
const int LOW_HUM = 20;
const int HIGH_HUM = 90;
const int LOW_F = 32;        // NEW: 0 C = 32 F
const int HIGH_F = 104;      // NEW: 40 C = 104 F (same needle angles as the C scale)

// NEW: names for the three modes
const int CELSIUS = 0;
const int HUMIDITY = 1;
const int FAHRENHEIT = 2;
int mode = CELSIUS;          // replaces the true/false showHumidity

DHT dht(DHT_PIN, DHT11);
Servo needle;

int needleAngle = 90;        // where the needle is now
int lastTarget = -1;         // last target printed

void setup() {
  Serial.begin(9600);
  dht.begin();
  needle.attach(SERVO_PIN);
  needle.write(needleAngle);
  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  // 1. the button moves on to the next mode: 0 -> 1 -> 2 -> back to 0
  if (digitalRead(MODE_BUTTON) == LOW) {
    mode = (mode + 1) % 3;        // % 3 = remainder after dividing by 3, so 3 becomes 0
    digitalWrite(LED_BUILTIN, mode == HUMIDITY);
    Serial.print("Mode: ");
    if (mode == CELSIUS) Serial.println("temperature C");
    if (mode == HUMIDITY) Serial.println("humidity");
    if (mode == FAHRENHEIT) Serial.println("temperature F");
    while (digitalRead(MODE_BUTTON) == LOW) {
      // wait until the button is let go
    }
    delay(50);
  }

  // 2. read the sensor the right way for this mode
  float reading;
  if (mode == HUMIDITY) reading = dht.readHumidity();
  else if (mode == FAHRENHEIT) reading = dht.readTemperature(true);   // true = give me Fahrenheit
  else reading = dht.readTemperature();
  if (isnan(reading)) return;   // no reading this time

  // ...and use the right scale for this mode
  int target;
  if (mode == HUMIDITY) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);
  else if (mode == FAHRENHEIT) target = map(reading, LOW_F, HIGH_F, 0, 180);
  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);
  target = constrain(target, 0, 180);   // stay on the dial

  if (target != lastTarget) {   // print only changes
    Serial.print(reading, 0);
    if (mode == HUMIDITY) Serial.print(" %");
    if (mode == CELSIUS) Serial.print(" C");
    if (mode == FAHRENHEIT) Serial.print(" F");
    Serial.print(" -> needle to ");
    Serial.println(target);
    lastTarget = target;
  }

  // 3. move the needle one degree at a time (smooth)
  if (needleAngle < target) needleAngle++;
  if (needleAngle > target) needleAngle--;
  needle.write(needleAngle);
  delay(15);
}` },

    'Humidity alarm': { name: 'gauge_humidity_alarm',
      note: '<p><b>Wiring:</b> a red LED with its 220 Ω resistor on <b>pin 7</b>, and (optional) the <b>active buzzer</b>: + leg → <b>pin 8</b>, − leg → GND.</p><p><b>The idea:</b> the humidity is read every loop, in <b>both</b> modes. <code>||</code> means “or”: the alarm goes off if it’s too dry <b>or</b> too damp. To flash without <code>delay()</code> (which would freeze the needle), we use the clock: <code>(millis() / 250) % 2</code> flips between 0 and 1 every 250 ms.</p>',
      code: `
/*
  Mission 04 extension: Humidity alarm
  Warns you when the air is too dry (below 25%) or too damp (above 70%):
  a red LED flashes and the buzzer beeps. Works in both modes.
*/
#include <Servo.h>
#include <DHT.h>

const int DHT_PIN = 2;
const int MODE_BUTTON = 4;
const int SERVO_PIN = 9;
const int ALARM_LED = 7;     // NEW: red LED + 220 ohm resistor
const int ALARM_BUZZER = 8;  // NEW: active buzzer (optional)

// the scales on your dial (left end = 0, right end = 180)
const int LOW_TEMP = 0;
const int HIGH_TEMP = 40;
const int LOW_HUM = 20;
const int HIGH_HUM = 90;

// NEW: the alarm limits
const float TOO_DRY = 25.0;
const float TOO_DAMP = 70.0;

DHT dht(DHT_PIN, DHT11);
Servo needle;

bool showHumidity = false;   // true = humidity mode
int needleAngle = 90;        // where the needle is now
int lastTarget = -1;         // last target printed
bool alarmOn = false;        // NEW: is the air too dry or too damp right now?

void setup() {
  Serial.begin(9600);
  dht.begin();
  needle.attach(SERVO_PIN);
  needle.write(needleAngle);
  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(ALARM_LED, OUTPUT);
  pinMode(ALARM_BUZZER, OUTPUT);
}

void loop() {
  // 1. the button switches modes
  if (digitalRead(MODE_BUTTON) == LOW) {
    showHumidity = !showHumidity;
    digitalWrite(LED_BUILTIN, showHumidity);
    while (digitalRead(MODE_BUTTON) == LOW) {
      // wait until the button is let go
    }
    delay(50);
  }

  // NEW: check the humidity every loop, whatever the mode
  float h = dht.readHumidity();
  if (!isnan(h)) {
    bool wasOn = alarmOn;
    alarmOn = (h < TOO_DRY || h > TOO_DAMP);   // || means OR: too dry, or too damp
    if (alarmOn && !wasOn) {                   // print only when the alarm starts
      Serial.print("ALARM! Humidity is ");
      Serial.print(h, 0);
      Serial.println(h < TOO_DRY ? "% - too dry" : "% - too damp");
    }
  }

  // NEW: flash the alarm without delay(). millis() / 250 goes up by 1 every 250 ms,
  // and % 2 turns that into 0, 1, 0, 1 ... so the alarm is on for 250 ms, off for 250 ms.
  if (alarmOn && (millis() / 250) % 2 == 1) {
    digitalWrite(ALARM_LED, HIGH);
    digitalWrite(ALARM_BUZZER, HIGH);
  } else {
    digitalWrite(ALARM_LED, LOW);
    digitalWrite(ALARM_BUZZER, LOW);
  }

  // 2. read the sensor and work out where the needle should point
  float reading;
  if (showHumidity) reading = h;
  else reading = dht.readTemperature();
  if (isnan(reading)) return;   // no reading this time

  int target;
  if (showHumidity) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);
  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);
  target = constrain(target, 0, 180);   // stay on the dial

  if (target != lastTarget) {   // print only changes
    Serial.print(showHumidity ? "Humidity " : "Temperature ");
    Serial.print(reading, 0);
    Serial.print(" -> needle to ");
    Serial.println(target);
    lastTarget = target;
  }

  // 3. move the needle one degree at a time (smooth)
  if (needleAngle < target) needleAngle++;
  if (needleAngle > target) needleAngle--;
  needle.write(needleAngle);
  delay(15);
}` },

    'Two sensors, one answer': { name: 'gauge_average',
      note: '<p><b>Wiring:</b> keep (or rebuild) the thermistor circuit from part 4: thermistor and 10 kΩ resistor as a divider, middle point to <b>A0</b>.</p><p><b>The idea:</b> bring back the <code>readThermistor()</code> function from part 4, then average the two: <code>(dhtTemp + thermTemp) / 2</code>. The Serial Monitor prints all three numbers so you can compare them with a real thermometer and decide whether the average really is better.</p><p><b>Test it fairly:</b> check against a trusted thermometer in a few places (room, near a window, in your hand) and record which of the three is closest each time.</p>',
      code: `
/*
  Mission 04 extension: Two sensors, one answer
  In temperature mode, the needle shows the AVERAGE of the DHT11
  and the thermistor. The Serial Monitor shows all three.
*/
#include <Servo.h>
#include <DHT.h>

const int DHT_PIN = 2;
const int MODE_BUTTON = 4;
const int SERVO_PIN = 9;
const int THERM_PIN = A0;    // NEW: the thermistor divider from part 4

// the scales on your dial (left end = 0, right end = 180)
const int LOW_TEMP = 0;
const int HIGH_TEMP = 40;
const int LOW_HUM = 20;
const int HIGH_HUM = 90;

DHT dht(DHT_PIN, DHT11);
Servo needle;

bool showHumidity = false;   // true = humidity mode
int needleAngle = 90;        // where the needle is now
int lastTarget = -1;         // last target printed
unsigned long lastPrint = 0; // NEW: when we last printed the comparison

void setup() {
  Serial.begin(9600);
  dht.begin();
  needle.attach(SERVO_PIN);
  needle.write(needleAngle);
  pinMode(MODE_BUTTON, INPUT_PULLUP);   // pressed = LOW
  pinMode(LED_BUILTIN, OUTPUT);
}

// NEW (from part 4): returns the thermistor temperature in degrees C
float readThermistor() {
  long total = 0;
  for (int i = 0; i < 10; i++) {
    total = total + analogRead(THERM_PIN);
    delay(2);
  }
  float reading = total / 10.0;   // the average of 10 readings
  float resistance = 10000.0 * (1024.0 / reading - 1);   // ohms
  float logR = log(resistance);
  float kelvin = 1 / (0.001129148 + (0.000234125 + 0.0000000876741 * logR * logR) * logR);
  return kelvin - 273.15;   // kelvin to degrees C
}

void loop() {
  // 1. the button switches modes
  if (digitalRead(MODE_BUTTON) == LOW) {
    showHumidity = !showHumidity;
    digitalWrite(LED_BUILTIN, showHumidity);
    while (digitalRead(MODE_BUTTON) == LOW) {
      // wait until the button is let go
    }
    delay(50);
  }

  // 2. read the sensor and work out where the needle should point
  float reading;
  if (showHumidity) {
    reading = dht.readHumidity();
  } else {
    // NEW: two thermometers, one answer
    float dhtTemp = dht.readTemperature();
    float thermTemp = readThermistor();
    if (isnan(dhtTemp)) return;              // no DHT reading this time
    reading = (dhtTemp + thermTemp) / 2;     // the average: add them up, divide by how many

    if (millis() - lastPrint >= 2000) {      // print the comparison every 2 seconds
      lastPrint = millis();
      Serial.print("DHT11: ");
      Serial.print(dhtTemp, 1);
      Serial.print("   Thermistor: ");
      Serial.print(thermTemp, 1);
      Serial.print("   Average: ");
      Serial.println(reading, 1);
    }
  }
  if (isnan(reading)) return;   // no reading this time

  int target;
  if (showHumidity) target = map(reading, LOW_HUM, HIGH_HUM, 0, 180);
  else target = map(reading, LOW_TEMP, HIGH_TEMP, 0, 180);
  target = constrain(target, 0, 180);   // stay on the dial
  lastTarget = target;

  // 3. move the needle one degree at a time (smooth)
  if (needleAngle < target) needleAngle++;
  if (needleAngle > target) needleAngle--;
  needle.write(needleAngle);
  delay(15);
}` }
  };
})(window);
