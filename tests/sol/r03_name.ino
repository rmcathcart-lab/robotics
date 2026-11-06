// R3 part 2: spell a name, one function per letter
// ---- motor pins (ELEGOO Smart Robot Car V4, TB6612 driver) ----
const int STBY = 3;   // standby: HIGH lets the motors run
const int PWMA = 5;   // right motors: speed (0-255)
const int AIN1 = 7;   // right motors: direction (HIGH = forward)
const int PWMB = 6;   // left motors: speed (0-255)
const int BIN1 = 8;   // left motors: direction (HIGH = forward)
const int BUTTON = 2;  // the MODE button on the car
const int SPEED = 150;
const float CM_PER_SEC = 29.3;    // from your calibration in R2 (this is the virtual car)
const float MS_PER_DEGREE = 7.0;  // your 90-degree TURN_MS divided by 90

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(STBY, OUTPUT);
  pinMode(PWMA, OUTPUT);
  pinMode(AIN1, OUTPUT);
  pinMode(PWMB, OUTPUT);
  pinMode(BIN1, OUTPUT);
  digitalWrite(STBY, HIGH);   // wake up the motor driver
  waitForButton();

  letterH();
  space();
  letterI();
  space();
  letterL();
}

void loop() {
}

// ---- letters: 40 cm tall, 20 cm wide ----
// each one starts at its bottom-left corner facing up
// and ends at its bottom-right corner facing up

void letterL() {
  driveCm(40);     // up the stem...
  driveCm(-40);    // ...and back down it
  turnDeg(90);
  driveCm(20);     // along the bottom
  turnDeg(-90);    // face up again
}

void letterI() {
  driveCm(40);
  driveCm(-40);
}

void letterH() {
  driveCm(40);     // left side, all the way up
  driveCm(-20);    // back down to the middle
  turnDeg(90);
  driveCm(20);     // the bar across
  turnDeg(-90);
  driveCm(20);     // right side: up to the top
  driveCm(-40);    // and all the way down
}

// moves 10 cm along the bottom to the start of the next letter
void space() {
  turnDeg(90);
  driveCm(10);
  turnDeg(-90);
}

// drives a distance in cm (a negative distance drives backward)
void driveCm(float cm) {
  if (cm > 0) {
    forward(SPEED);
  } else {
    backward(SPEED);
  }
  float ms = abs(cm) / CM_PER_SEC * 1000;   // time = distance / speed
  delay(ms);
  stopCar();
  delay(250);   // a short pause so the car settles
}

// turns on the spot: positive = right (clockwise), negative = left
void turnDeg(float degrees) {
  if (degrees > 0) {
    spinRight(SPEED);
  } else {
    spinLeft(SPEED);
  }
  delay(abs(degrees) * MS_PER_DEGREE);
  stopCar();
  delay(250);
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