/* Solutions for the Mission 02 (Mood lamp) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};
  RL.SOLUTIONS.m02 = {

    'Mood mode': { name: 'mood_mode',
      note: '<p><b>The idea:</b> the colour wheel code doesn’t care where its 0–1023 number comes from. In the mission it came from the knob. Here it comes from a variable, <code>hue</code>, that counts up by itself and starts again at 0 when it passes 1023. So the lamp drifts all the way round the colour wheel, over and over.</p><p><code>hue</code> must be a <b>global</b> variable (made at the top, outside loop()), so it remembers its value from one loop to the next.</p>',
      code: `
/*
  Mission 02 extension: Mood mode
  The lamp drifts slowly round the colour wheel on its own.
  The light sensor still sets the brightness.
*/

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;
const int LIGHT = A1;

// light readings for YOUR room (check them in the Serial Monitor)
const int DARK = 200;     // sensor covered with your hand
const int BRIGHT = 900;   // normal room light

int red = 0;
int green = 0;
int blue = 0;

int hue = 0;              // NEW: our place on the colour wheel, 0 to 1023 (replaces the knob)

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // 1. move a little further round the colour wheel
  hue = hue + 2;            // bigger number = faster colour changes
  if (hue > 1023) {
    hue = 0;                // past the end of the wheel: start again at red
  }

  // the same colour wheel as the mission, but using hue instead of the knob
  if (hue < 341) {
    green = map(hue, 0, 340, 0, 255);
    red = 255 - green;
    blue = 0;
  } else if (hue < 682) {
    blue = map(hue, 341, 681, 0, 255);
    green = 255 - blue;
    red = 0;
  } else {
    red = map(hue, 682, 1023, 0, 255);
    blue = 255 - red;
    green = 0;
  }

  // 2. the light sensor picks the brightness (dark room = bright lamp)
  int light = analogRead(LIGHT);
  int brightness = map(light, DARK, BRIGHT, 255, 10);
  brightness = constrain(brightness, 10, 255);

  // 3. dim all three colours by the same amount, so the colour stays the same
  analogWrite(RED_PIN, map(red, 0, 255, 0, brightness));
  analogWrite(GREEN_PIN, map(green, 0, 255, 0, brightness));
  analogWrite(BLUE_PIN, map(blue, 0, 255, 0, brightness));

  Serial.print("hue ");
  Serial.println(hue);

  // 512 steps round the wheel (1024 / 2) x 20 ms = about 10 seconds per lap.
  // Make this bigger for a slower, calmer lamp.
  delay(20);
}` },

    'Mode button': { name: 'mood_lamp_modes',
      note: '<p><b>Wiring:</b> a push button between <b>5V</b> and <b>pin 2</b>, with a <b>10 kΩ pull-down</b> resistor from pin 2 to GND — the same as Mission 01. Pressed = HIGH.</p><p><b>The idea:</b> a variable <code>mode</code> remembers which mode we’re in: 0 = knob colour, 1 = mood mode. Each press flips it: <code>mode = 1 - mode</code> turns 0 into 1 and 1 into 0. Then an <code>if</code> picks where the colour wheel number comes from.</p><p>After a press we wait until the button is <b>let go</b>, so one press only counts once.</p>',
      code: `
/*
  Mission 02 extension: Mode button
  Press the button to switch between:
    mode 0 = the knob picks the colour
    mode 1 = mood mode: the colour drifts round the wheel on its own
*/

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;
const int KNOB = A0;
const int LIGHT = A1;
const int BUTTON = 2;      // NEW: button to 5V, 10k pull-down to GND

// light readings for YOUR room (check them in the Serial Monitor)
const int DARK = 200;     // sensor covered with your hand
const int BRIGHT = 900;   // normal room light

int red = 0;
int green = 0;
int blue = 0;

int mode = 0;             // NEW: 0 = knob colour, 1 = mood mode
int hue = 0;              // NEW: the drifting colour for mood mode

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  pinMode(BUTTON, INPUT);
  Serial.begin(9600);
}

void loop() {
  // 0. the button switches modes
  if (digitalRead(BUTTON) == HIGH) {
    mode = 1 - mode;                 // 0 becomes 1, 1 becomes 0
    Serial.print("mode ");
    Serial.println(mode);
    while (digitalRead(BUTTON) == HIGH) {
      delay(10);                     // wait here until the button is let go
    }
    delay(50);                       // and a moment more, so the button stops "bouncing"
  }

  // 1. pick a number on the colour wheel, 0 to 1023
  int wheel;
  if (mode == 0) {
    wheel = analogRead(KNOB);        // knob mode: the knob decides
  } else {
    hue = hue + 2;                   // mood mode: creep round the wheel
    if (hue > 1023) {
      hue = 0;
    }
    wheel = hue;
  }

  // the colour wheel (the same as the mission, using "wheel" instead of "knob")
  if (wheel < 341) {
    green = map(wheel, 0, 340, 0, 255);
    red = 255 - green;
    blue = 0;
  } else if (wheel < 682) {
    blue = map(wheel, 341, 681, 0, 255);
    green = 255 - blue;
    red = 0;
  } else {
    red = map(wheel, 682, 1023, 0, 255);
    blue = 255 - red;
    green = 0;
  }

  // 2. the light sensor picks the brightness (dark room = bright lamp)
  int light = analogRead(LIGHT);
  int brightness = map(light, DARK, BRIGHT, 255, 10);
  brightness = constrain(brightness, 10, 255);

  // 3. dim all three colours by the same amount, so the colour stays the same
  analogWrite(RED_PIN, map(red, 0, 255, 0, brightness));
  analogWrite(GREEN_PIN, map(green, 0, 255, 0, brightness));
  analogWrite(BLUE_PIN, map(blue, 0, 255, 0, brightness));

  delay(20);
}` },

    'Sunrise alarm': { name: 'sunrise_alarm',
      note: '<p><b>The idea:</b> the whole sunrise happens once, so it goes in <code>setup()</code>. A for loop counts <code>i</code> from 0 to 255 and works out the colour from <code>i</code>:</p><ul><li><b>Red</b> rises fastest (<code>i * 2</code>, capped at 255), so the start is a deep red glow.</li><li><b>Green</b> rises more slowly (<code>i * 6 / 10</code>), turning red into orange, then yellow-ish.</li><li>A little <b>blue</b> (<code>i / 4</code>) at the end makes it a warm white.</li></ul><p>256 steps × 235 ms ≈ 60 seconds. <code>loop()</code> is left empty, so the light just stays on.</p><p>Tip: change <code>delay(235)</code> to <code>delay(5)</code> while testing, so you don’t wait a minute every time!</p>',
      code: `
/*
  Mission 02 extension: Sunrise alarm
  Starting from off, the lamp fades from deep red, through orange,
  to warm white over about 60 seconds, then stays on.
*/

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;

// sets all three colours at once (each 0 to 255)
void setColor(int r, int g, int b) {
  analogWrite(RED_PIN, r);
  analogWrite(GREEN_PIN, g);
  analogWrite(BLUE_PIN, b);
}

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  Serial.begin(9600);

  // the sunrise: i goes 0, 1, 2 ... 255
  for (int i = 0; i <= 255; i++) {
    int r = i * 2;            // red climbs quickly...
    if (r > 255) {
      r = 255;                // ...but can't go past 255 (full brightness)
    }
    int g = i * 6 / 10;       // green climbs slowly: red -> orange -> yellow
    int b = i / 4;            // a little blue at the end: warm white

    setColor(r, g, b);

    if (i % 32 == 0) {        // "%" is the remainder: print every 32 steps, not every step
      Serial.print("step ");
      Serial.print(i);
      Serial.print(": ");
      Serial.print(r);
      Serial.print(", ");
      Serial.print(g);
      Serial.print(", ");
      Serial.println(b);
    }
    delay(235);               // 256 steps x 235 ms = about 60 seconds
  }
  Serial.println("Good morning!");
}

void loop() {
  // nothing to do: the light stays at its last colour (warm white)
}` },

    'Candle flicker': { name: 'candle_flicker',
      note: '<p><b>The idea:</b> a real flame never holds still. Each time round loop(), <code>random(150, 256)</code> picks a new brightness between 150 and 255, and <code>random(30, 120)</code> picks how long to hold it. Because both are random, it never repeats.</p><p>The colour is a warm orange: full red, about 40% green, no blue. We scale both by the same flicker amount so the colour stays orange while the brightness jumps around.</p>',
      code: `
/*
  Mission 02 extension: Candle flicker
  The lamp flickers like a candle: warm orange, with a brightness
  that jumps around a little, many times a second.
*/

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  randomSeed(analogRead(A5));   // A5 isn't connected: its noise makes the randomness different every time
}

void loop() {
  // pick a random brightness: random(150, 256) gives 150 up to 255
  int flicker = random(150, 256);

  // warm orange: all of the red, 40% of the green, no blue
  analogWrite(RED_PIN, flicker);
  analogWrite(GREEN_PIN, flicker * 40 / 100);
  analogWrite(BLUE_PIN, 0);

  // hold this brightness for a random short time, then flicker again
  delay(random(30, 120));
}` },

    'Smooth the sensor': { name: 'mood_lamp_smooth',
      note: '<p><b>The idea:</b> a <b>running average</b>. Instead of using each new reading straight away, we keep a variable <code>smooth</code> and move it only a <b>little</b> towards each new reading:</p><p><code>smooth = (smooth * 9 + light) / 10;</code></p><p>That’s “90% of what it was, plus 10% of the new reading”. One sudden reading only nudges it, so the lamp changes gently. Change the 9 and 10 to 19 and 20 for even smoother (but slower) changes.</p><p><code>smooth</code> is a <code>float</code> (a number with decimals) so the small nudges aren’t lost when the maths rounds down.</p>',
      code: `
/*
  Mission 02 extension: Smooth the sensor
  The mood lamp, but the light reading is averaged so the
  brightness changes smoothly instead of jumping.
*/

const int RED_PIN = 11;
const int GREEN_PIN = 10;
const int BLUE_PIN = 9;
const int KNOB = A0;
const int LIGHT = A1;

// light readings for YOUR room (check them in the Serial Monitor)
const int DARK = 200;     // sensor covered with your hand
const int BRIGHT = 900;   // normal room light

int red = 0;
int green = 0;
int blue = 0;

float smooth = 500;       // NEW: the smoothed light reading (float = it can have decimals)

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  Serial.begin(9600);
  smooth = analogRead(LIGHT);   // start from a real reading, not a guess
}

void loop() {
  // 1. the knob picks the colour
  int knob = analogRead(KNOB);
  if (knob < 341) {
    green = map(knob, 0, 340, 0, 255);
    red = 255 - green;
    blue = 0;
  } else if (knob < 682) {
    blue = map(knob, 341, 681, 0, 255);
    green = 255 - blue;
    red = 0;
  } else {
    red = map(knob, 682, 1023, 0, 255);
    blue = 255 - red;
    green = 0;
  }

  // 2. the light sensor picks the brightness (dark room = bright lamp)
  int light = analogRead(LIGHT);
  smooth = (smooth * 9 + light) / 10;     // NEW: move only 10% of the way to the new reading
  int brightness = map(smooth, DARK, BRIGHT, 255, 10);   // use the SMOOTH value, not the raw one
  brightness = constrain(brightness, 10, 255);

  // 3. dim all three colours by the same amount, so the colour stays the same
  analogWrite(RED_PIN, map(red, 0, 255, 0, brightness));
  analogWrite(GREEN_PIN, map(green, 0, 255, 0, brightness));
  analogWrite(BLUE_PIN, map(blue, 0, 255, 0, brightness));

  // print both, so you can compare them in the Serial Plotter (Tools -> Serial Plotter)
  Serial.print(light);
  Serial.print(" ");
  Serial.println(smooth);
  delay(50);
}` }
  };
})(window);
