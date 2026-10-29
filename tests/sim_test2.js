// node tests/sim_test2.js — translation tests for the library sketches
global.window = global; global.performance = require('perf_hooks').performance;
require('../js/kit/sim.js');
const S = window.RL.Sim, fs = require('fs');
const AF = Object.getPrototypeOf(async function(){}).constructor;
const samples = {
servo: `#include <Servo.h>
Servo myservo;
void setup() { myservo.attach(9); myservo.write(90); }
void loop() { for (int a = 0; a <= 180; a += 10) { myservo.write(a); delay(20); } }`,
lcd: `#include <LiquidCrystal.h>
LiquidCrystal lcd(7, 8, 9, 10, 11, 12);
void setup() { lcd.begin(16, 2); lcd.print("Hello, World!"); }
void loop() { lcd.setCursor(0, 1); lcd.print(millis() / 1000); }`,
dht: `#include <DHT.h>
#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
void setup() { Serial.begin(9600); dht.begin(); }
void loop() { float t = dht.readTemperature(); float h = dht.readHumidity(); if (isnan(t)) { return; } Serial.println(t); delay(2000); }`,
ir: `#include <IRremote.hpp>
const int IR_PIN = 11;
void setup() { Serial.begin(9600); IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK); }
void loop() { if (IrReceiver.decode()) { int cmd = IrReceiver.decodedIRData.command; switch (cmd) { case 0x45: Serial.println("POWER"); break; default: break; } IrReceiver.resume(); } }`,
irold: `#include "IRremote.h"
IRrecv irrecv(11);
decode_results results;
void setup() { irrecv.enableIRIn(); }
void loop() { if (irrecv.decode(&results)) { Serial.println(results.value, HEX); irrecv.resume(); } }`,
shift: fs.readFileSync('/home/claude/elegoo/code_Four_Digital.ino','utf8'),
stepper: fs.readFileSync('/home/claude/elegoo/code_stepper_Example.ino','utf8'),
joy: fs.readFileSync('/home/claude/elegoo/code_Analog_Joystick.ino','utf8'),
sonar: `const int trigPin = 12; const int echoPin = 11;
long duration; int cm;
byte pattern = B10101010;
int grid[2][3] = {{1,2,3},{4,5,6}};
char msg[] = "hi";
void setup() { pinMode(trigPin, OUTPUT); pinMode(echoPin, INPUT); Serial.begin(9600); }
void loop() { digitalWrite(trigPin, LOW); delayMicroseconds(2); digitalWrite(trigPin, HIGH); delayMicroseconds(10); digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH); cm = duration / 58; Serial.println(cm); delay(100); }`
};
for (const [n, src] of Object.entries(samples)) {
  const c = S.check(src);
  if (c.errors.length) { console.log('==', n, 'CHECK ERRORS', JSON.stringify(c.errors)); continue; }
  const t = S.translate(src);
  try { new AF('a', t.js); console.log('==', n, 'OK', t.objs.join(',')); } catch (e) { console.log('==', n, 'COMPILE FAIL', e.message); console.log(t.js); }
}
