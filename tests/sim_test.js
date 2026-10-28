// node tests/sim_test.js — checks the Virtual UNO's checker and translator on sample sketches
global.window = global; global.performance = require('perf_hooks').performance;
require('../js/kit/sim.js');
const S = window.RL.Sim;
const blink = `// Blink
void setup() {
  pinMode(13, OUTPUT); // the L LED
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;
const cross = `const int RED = 12;
const int YELLOW = 11;
const int GREEN = 10;
const int WALK = 8;
const int BUTTON = 2;
int notes[] = {262, 294, 330};
int buttonState = 0;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(BUTTON, INPUT);
  Serial.begin(9600);
}

void flashWalk(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(WALK, HIGH);
    delay(250);
    digitalWrite(WALK, LOW);
    delay(250);
  }
}

void loop() {
  buttonState = digitalRead(BUTTON);
  if (buttonState == HIGH) {
    Serial.println("Button pressed: it's time to cross");
    flashWalk(3);
  } else {
    digitalWrite(GREEN, HIGH);
  }
  while (digitalRead(BUTTON) == HIGH) {
  }
}
`;
const bad = `void setup() {
  pinmode(13, OUTPUT)
}
void loop() {
  digitalWrite(13, HIGH);
`;
for (const [n, src] of [['blink', blink], ['cross', cross], ['bad', bad]]) {
  const c = S.check(src); console.log('==', n, JSON.stringify(c.errors));
  if (!c.errors.length) { const t = S.translate(src).js; console.log(t); console.log('lines', src.split('\n').length, t.split('\n').length);
    const AF = Object.getPrototypeOf(async function(){}).constructor; try { new AF('a', t); console.log('compiles OK'); } catch (e) { console.log('COMPILE FAIL', e.message); } }
}
