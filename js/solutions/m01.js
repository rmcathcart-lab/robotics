/* Solutions for the Mission 01 (Crosswalk signal) extension challenges, keyed by challenge title.
 * Each one is a complete sketch built from the mission's finished code, with comments for first-time coders. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};
  RL.SOLUTIONS.m01 = {

    'Make it talk': { name: 'crosswalk_talk',
      note: '<p><b>Wiring:</b> active buzzer <b>+ leg → pin 7</b>, <b>− leg → GND</b> (the − rail). An active buzzer is just like an LED to the code: HIGH = sound, LOW = quiet.</p><p><b>The idea:</b> a new function, <code>chirp()</code>, makes one short beep. While WALK is lit we chirp slowly; while WALK flashes, the buzzer turns on and off together with the light.</p>',
      code: `
/*
  Mission 01 extension: Make it talk
  A crosswalk that beeps for people who can't see the signal.
  The buzzer chirps slowly while WALK is on, and beeps along with
  the flashing WALK light when time is running out.
*/

// Which pin each part is connected to
const int RED_LIGHT = 12;
const int YELLOW_LIGHT = 11;
const int GREEN_LIGHT = 10;
const int WALK_LIGHT = 8;
const int BUTTON = 2;
const int BUZZER = 7;          // NEW: the active buzzer's + leg

int buttonState = 0;   // will hold HIGH (pressed) or LOW (not pressed)

void setup() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(YELLOW_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
  pinMode(WALK_LIGHT, OUTPUT);
  pinMode(BUTTON, INPUT);
  pinMode(BUZZER, OUTPUT);     // the buzzer is an output, just like an LED
}

// One short "chirp": 50 ms of sound, then 450 ms of quiet.
// Altogether it takes half a second (50 + 450 = 500 ms).
void chirp() {
  digitalWrite(BUZZER, HIGH);  // sound on
  delay(50);
  digitalWrite(BUZZER, LOW);   // sound off
  delay(450);
}

void loop() {
  // cars go: green on, everything else off
  digitalWrite(GREEN_LIGHT, HIGH);
  digitalWrite(YELLOW_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  digitalWrite(WALK_LIGHT, LOW);
  digitalWrite(BUZZER, LOW);   // and the buzzer is quiet

  buttonState = digitalRead(BUTTON);

  if (buttonState == HIGH) {
    // someone wants to cross
    delay(1000);                       // a short wait, like a real crosswalk
    digitalWrite(GREEN_LIGHT, LOW);
    digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down
    delay(2000);
    digitalWrite(YELLOW_LIGHT, LOW);
    digitalWrite(RED_LIGHT, HIGH);     // cars: stop
    digitalWrite(WALK_LIGHT, HIGH);    // people: walk

    // Instead of delay(5000), chirp 10 times.
    // Each chirp takes 500 ms, so 10 chirps = 5000 ms: the same 5 seconds.
    for (int i = 0; i < 10; i++) {
      chirp();
    }

    // flash the WALK light: time is running out.
    // The buzzer goes on and off WITH the light, so it beeps faster than before.
    for (int i = 0; i < 6; i++) {
      digitalWrite(WALK_LIGHT, LOW);
      digitalWrite(BUZZER, LOW);       // light off = quiet
      delay(300);
      digitalWrite(WALK_LIGHT, HIGH);
      digitalWrite(BUZZER, HIGH);      // light on = beep
      delay(300);
    }
    digitalWrite(WALK_LIGHT, LOW);
    digitalWrite(BUZZER, LOW);         // don't leave the buzzer on!
    delay(1000);                       // everyone clear before cars go
  }
}` },

    'Hurry-up countdown': { name: 'crosswalk_hurry',
      note: '<p><b>The idea:</b> the for loop already counts flashes with <code>i</code> (0, 1, 2, 3, 4, 5). If the delay gets <b>smaller</b> as <code>i</code> gets bigger, the flashes speed up. <code>400 - i * 50</code> gives 400, 350, 300, 250, 200, 150 ms.</p><p>To make it even more dramatic we also do more flashes (10 instead of 6) with a smaller step (30 ms).</p>',
      code: `
/*
  Mission 01 extension: Hurry-up countdown
  The WALK light flashes faster and faster as time runs out.
*/

// Which pin each part is connected to
const int RED_LIGHT = 12;
const int YELLOW_LIGHT = 11;
const int GREEN_LIGHT = 10;
const int WALK_LIGHT = 8;
const int BUTTON = 2;

int buttonState = 0;   // will hold HIGH (pressed) or LOW (not pressed)

void setup() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(YELLOW_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
  pinMode(WALK_LIGHT, OUTPUT);
  pinMode(BUTTON, INPUT);
}

void loop() {
  // cars go: green on, everything else off
  digitalWrite(GREEN_LIGHT, HIGH);
  digitalWrite(YELLOW_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  digitalWrite(WALK_LIGHT, LOW);

  buttonState = digitalRead(BUTTON);

  if (buttonState == HIGH) {
    // someone wants to cross
    delay(1000);                       // a short wait, like a real crosswalk
    digitalWrite(GREEN_LIGHT, LOW);
    digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down
    delay(2000);
    digitalWrite(YELLOW_LIGHT, LOW);
    digitalWrite(RED_LIGHT, HIGH);     // cars: stop
    digitalWrite(WALK_LIGHT, HIGH);    // people: walk
    delay(5000);

    // flash the WALK light, faster and faster.
    // i counts 0, 1, 2 ... 9. Each time round, the wait is 30 ms shorter:
    //   i = 0 -> 400 ms,  i = 1 -> 370 ms,  ...  i = 9 -> 130 ms
    for (int i = 0; i < 10; i++) {
      int wait = 400 - i * 30;         // work out this flash's wait ONCE, and store it
      digitalWrite(WALK_LIGHT, LOW);
      delay(wait);
      digitalWrite(WALK_LIGHT, HIGH);
      delay(wait);
    }
    digitalWrite(WALK_LIGHT, LOW);
    delay(1000);                       // everyone clear before cars go
  }
}` },

    'Night mode': { name: 'crosswalk_night',
      note: '<p><b>The idea:</b> at night the yellow light flashes on its own. The tricky part is that a long <code>delay()</code> is “deaf”: the UNO can’t notice the button while it waits. So we split each half-second wait into <b>ten 50 ms waits</b> and check the button between them. That’s what the new function <code>waitAndWatch()</code> does: it waits, but it also tells us if the button was pressed.</p><p>When someone presses the button, the cars get a red light and the WALK light comes on. Then it goes back to flashing yellow.</p>',
      code: `
/*
  Mission 01 extension: Night mode
  Late at night the yellow light flashes on its own.
  Press the button to cross: the cars stop, WALK comes on,
  then the light goes back to flashing yellow.
*/

// Which pin each part is connected to
const int RED_LIGHT = 12;
const int YELLOW_LIGHT = 11;
const int GREEN_LIGHT = 10;
const int WALK_LIGHT = 8;
const int BUTTON = 2;

void setup() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(YELLOW_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
  pinMode(WALK_LIGHT, OUTPUT);
  pinMode(BUTTON, INPUT);
}

// Waits for "ms" milliseconds, checking the button every 50 ms.
// It gives back (returns) true if the button was pressed, or false if not.
// "bool" means the answer is true or false.
bool waitAndWatch(int ms) {
  for (int t = 0; t < ms; t = t + 50) {      // t counts up 0, 50, 100 ... in steps of 50
    if (digitalRead(BUTTON) == HIGH) {
      return true;                           // pressed! stop waiting and say so
    }
    delay(50);
  }
  return false;                              // waited the whole time: nobody pressed
}

// the crossing, the same steps as the mission (starting from the yellow light)
void crossing() {
  digitalWrite(GREEN_LIGHT, LOW);
  digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down
  delay(2000);
  digitalWrite(YELLOW_LIGHT, LOW);
  digitalWrite(RED_LIGHT, HIGH);     // cars: stop
  digitalWrite(WALK_LIGHT, HIGH);    // people: walk
  delay(5000);

  // flash the WALK light: time is running out
  for (int i = 0; i < 6; i++) {
    digitalWrite(WALK_LIGHT, LOW);
    delay(300);
    digitalWrite(WALK_LIGHT, HIGH);
    delay(300);
  }
  digitalWrite(WALK_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  delay(1000);                       // everyone clear before the lights flash again
}

void loop() {
  // night mode: only the yellow light, flashing on and off
  digitalWrite(GREEN_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  digitalWrite(WALK_LIGHT, LOW);

  digitalWrite(YELLOW_LIGHT, HIGH);
  bool pressed = waitAndWatch(500);      // yellow on for half a second (watching the button)
  digitalWrite(YELLOW_LIGHT, LOW);
  if (!pressed) {                        // "!" means NOT: only wait again if nobody pressed yet
    pressed = waitAndWatch(500);         // yellow off for half a second
  }

  if (pressed) {
    crossing();                          // someone wants to cross
  }
}` },

    'Don’t walk': { name: 'crosswalk_dont_walk',
      note: '<p><b>Wiring:</b> an orange or red LED for DON’T WALK, with its 220 Ω resistor, on a free pin. Pins 9, 7, 6, 5, 4 and 3 are all free: this uses <b>pin 9</b> (long leg to pin 9 through the resistor, short leg to GND).</p><p><b>The idea:</b> DON’T WALK must always be the opposite of WALK. Instead of remembering to switch both every time, a new function <code>setWalk()</code> does it for us: give it HIGH and WALK goes on and DON’T WALK goes off, give it LOW and the opposite happens.</p>',
      code: `
/*
  Mission 01 extension: Don't walk
  A DON'T WALK light that is on whenever WALK is off.
*/

// Which pin each part is connected to
const int RED_LIGHT = 12;
const int YELLOW_LIGHT = 11;
const int GREEN_LIGHT = 10;
const int WALK_LIGHT = 8;
const int DONT_WALK_LIGHT = 9;   // NEW: orange/red LED + 220 ohm resistor
const int BUTTON = 2;

int buttonState = 0;   // will hold HIGH (pressed) or LOW (not pressed)

void setup() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(YELLOW_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
  pinMode(WALK_LIGHT, OUTPUT);
  pinMode(DONT_WALK_LIGHT, OUTPUT);
  pinMode(BUTTON, INPUT);
}

// Switches the pedestrian lights.
// setWalk(HIGH): WALK on, DON'T WALK off.   setWalk(LOW): WALK off, DON'T WALK on.
void setWalk(int walk) {
  digitalWrite(WALK_LIGHT, walk);
  if (walk == HIGH) {
    digitalWrite(DONT_WALK_LIGHT, LOW);
  } else {
    digitalWrite(DONT_WALK_LIGHT, HIGH);
  }
}

void loop() {
  // cars go: green on, everything else off, and people see DON'T WALK
  digitalWrite(GREEN_LIGHT, HIGH);
  digitalWrite(YELLOW_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  setWalk(LOW);

  buttonState = digitalRead(BUTTON);

  if (buttonState == HIGH) {
    // someone wants to cross
    delay(1000);                       // a short wait, like a real crosswalk
    digitalWrite(GREEN_LIGHT, LOW);
    digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down
    delay(2000);
    digitalWrite(YELLOW_LIGHT, LOW);
    digitalWrite(RED_LIGHT, HIGH);     // cars: stop
    setWalk(HIGH);                     // people: walk (DON'T WALK goes off by itself)
    delay(5000);

    // Flash the WALK light: time is running out.
    // Because we use setWalk(), DON'T WALK blinks in turn with WALK.
    for (int i = 0; i < 6; i++) {
      setWalk(LOW);
      delay(300);
      setWalk(HIGH);
      delay(300);
    }
    setWalk(LOW);                      // DON'T WALK stays on now
    delay(1000);                       // everyone clear before cars go
  }
}` },

    'Two sides of the street': { name: 'crosswalk_two_buttons',
      note: '<p><b>Wiring:</b> build a second button exactly like the first one — button between <b>5V</b> and the pin, with a <b>10 kΩ pull-down</b> resistor from the pin to GND — but connect it to <b>pin 3</b>.</p><p><b>The idea:</b> read both buttons, then use <code>||</code> (“or”) so either one starts the crossing.</p>',
      code: `
/*
  Mission 01 extension: Two sides of the street
  A button on each side of the road. Either one starts the crossing.
*/

// Which pin each part is connected to
const int RED_LIGHT = 12;
const int YELLOW_LIGHT = 11;
const int GREEN_LIGHT = 10;
const int WALK_LIGHT = 8;
const int BUTTON = 2;       // the button on this side
const int BUTTON_2 = 3;     // NEW: the button on the other side (also with a 10k pull-down)

int buttonState = 0;        // will hold HIGH (pressed) or LOW (not pressed)
int buttonState2 = 0;       // NEW: the same, for the second button

void setup() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(YELLOW_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
  pinMode(WALK_LIGHT, OUTPUT);
  pinMode(BUTTON, INPUT);
  pinMode(BUTTON_2, INPUT);
}

void loop() {
  // cars go: green on, everything else off
  digitalWrite(GREEN_LIGHT, HIGH);
  digitalWrite(YELLOW_LIGHT, LOW);
  digitalWrite(RED_LIGHT, LOW);
  digitalWrite(WALK_LIGHT, LOW);

  buttonState = digitalRead(BUTTON);
  buttonState2 = digitalRead(BUTTON_2);

  // || means "or": this is true if the first button is pressed,
  // OR the second one is pressed (or both at once).
  if (buttonState == HIGH || buttonState2 == HIGH) {
    // someone wants to cross
    delay(1000);                       // a short wait, like a real crosswalk
    digitalWrite(GREEN_LIGHT, LOW);
    digitalWrite(YELLOW_LIGHT, HIGH);  // cars: slow down
    delay(2000);
    digitalWrite(YELLOW_LIGHT, LOW);
    digitalWrite(RED_LIGHT, HIGH);     // cars: stop
    digitalWrite(WALK_LIGHT, HIGH);    // people: walk
    delay(5000);

    // flash the WALK light: time is running out
    for (int i = 0; i < 6; i++) {
      digitalWrite(WALK_LIGHT, LOW);
      delay(300);
      digitalWrite(WALK_LIGHT, HIGH);
      delay(300);
    }
    digitalWrite(WALK_LIGHT, LOW);
    delay(1000);                       // everyone clear before cars go
  }
}` }
  };
})(window);
