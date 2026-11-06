// R3 part 3: for loops
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

  // a square: the same two moves, 4 times
  for (int i = 0; i < 5; i++) {
    driveCm(50);
    turnDeg(144);
  }
}

void loop() {
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