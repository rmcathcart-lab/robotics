// R8 bug hunt: this SHOULD drive up to the wall, stop 20 cm away and turn the LED green.
// It has THREE bugs. Find and fix them one at a time.
#include <FastLED.h>
// ---- motor pins (ELEGOO Smart Robot Car V4, TB6612 driver) ----
const int STBY = 3;   // standby: HIGH lets the motors run
const int PWMA = 5;   // right motors: speed (0-255)
const int AIN1 = 7;   // right motors: direction (HIGH = forward)
const int PWMB = 6;   // left motors: speed (0-255)
const int BIN1 = 8;   // left motors: direction (HIGH = forward)
const int BUTTON = 2;  // the MODE button on the car
const int TRIG = 13;  // ultrasonic sensor: Trig pin
const int ECHO = 12;  // ultrasonic sensor: Echo pin
const int LED_PIN = 4;
const int STOP_CM = 20;

CRGB leds[1];

void setup() {
  Serial.begin(9600);
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(STBY, OUTPUT);
  pinMode(PWMA, OUTPUT);
  pinMode(AIN1, OUTPUT);
  pinMode(PWMB, OUTPUT);
  pinMode(BIN1, OUTPUT);
  digitalWrite(STBY, HIGH);   // wake up the motor driver
  FastLED.addLeds<NEOPIXEL, LED_PIN>(leds, 1);
  FastLED.setBrightness(40);
}

void loop() {
  waitForButton();
  leds[0] = CRGB::Blue;
  FastLED.show();
  forward(140);
  while (readDistance() > STOP_CM) {
    delay(20);
  }
  stopCar();
  leds[0] = CRGB::Green;
  FastLED.show();
}

// pings once and returns the distance in cm (999 = nothing there)
int readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);   // a 10 microsecond pulse = "ping!"
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000);   // wait up to 30 ms for the echo
  if (duration == 0) {
    return 999;   // no echo came back
  }
  return duration / 58;   // microseconds -> centimetres
}

// waits here until someone presses the MODE button
void waitForButton() {
  while (digitalRead(BUTTON) == HIGH) {   // HIGH = not pressed
    delay(10);
  }
  delay(500);   // half a second to take your hand away
}

// ---- moves ----
void forward(int speed) {
  digitalWrite(AIN1, HIGH);   // right side: forward
  analogWrite(PWMA, speed);
  digitalWrite(BIN1, HIGH);   // left side: forward
  analogWrite(PWMB, speed);
}

void backward(int speed) {
  digitalWrite(AIN1, LOW);    // right side: backward
  analogWrite(PWMA, speed);
  digitalWrite(BIN1, LOW);    // left side: backward
  analogWrite(PWMB, speed);
}

void spinLeft(int speed) {
  digitalWrite(AIN1, HIGH);   // right side forward...
  analogWrite(PWMA, speed);
  digitalWrite(BIN1, LOW);    // ...left side backward
  analogWrite(PWMB, speed);
}

void spinRight(int speed) {
  digitalWrite(AIN1, LOW);    // right side backward...
  analogWrite(PWMA, speed);
  digitalWrite(BIN1, HIGH);   // ...left side forward
  analogWrite(PWMB, speed);
}

void stopCar() {
  analogWrite(PWMA, 0);
  analogWrite(PWMB, 0);
}
