// R2 part 4: drive a 50 cm square and end where you started
// ---- motor pins (ELEGOO Smart Robot Car V4, TB6612 driver) ----
const int STBY = 3;   // standby: HIGH lets the motors run
const int PWMA = 5;   // right motors: speed (0-255)
const int AIN1 = 7;   // right motors: direction (HIGH = forward)
const int PWMB = 6;   // left motors: speed (0-255)
const int BIN1 = 8;   // left motors: direction (HIGH = forward)
const int BUTTON = 2;  // the MODE button on the car
const int SPEED = 150;
const int SIDE_MS = 1710;   // TODO: how long to drive 50 cm? (use your calibration)
const int TURN_MS = 630;    // TODO: how long to turn 90 degrees?

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(STBY, OUTPUT);
  pinMode(PWMA, OUTPUT);
  pinMode(AIN1, OUTPUT);
  pinMode(PWMB, OUTPUT);
  pinMode(BIN1, OUTPUT);
  digitalWrite(STBY, HIGH);   // wake up the motor driver
  waitForButton();

  // side 1
  forward(SPEED);
  delay(SIDE_MS);
  stopCar();
  delay(300);
  spinRight(SPEED);
  delay(TURN_MS);
  stopCar();
  delay(300);

  forward(SPEED);
  delay(SIDE_MS);
  stopCar();
  delay(300);
  spinRight(SPEED);
  delay(TURN_MS);
  stopCar();
  delay(300);
  forward(SPEED);
  delay(SIDE_MS);
  stopCar();
  delay(300);
  spinRight(SPEED);
  delay(TURN_MS);
  stopCar();
  delay(300);
  forward(SPEED);
  delay(SIDE_MS);
  stopCar();
  delay(300);
  spinRight(SPEED);
  delay(TURN_MS);
  stopCar();
  delay(300);
}

void loop() {
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