/* Solutions for the Mission 03 (Arcade synth) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};
  RL.SOLUTIONS.m03 = {

    'Record & replay': { name: 'synth_record',
      note: '<p><b>How to use it:</b> hold the joystick button for 1 second (you’ll hear two beeps) → play up to 16 notes → click the joystick button → it plays your tune back. A quick click when you’re not recording still fires the laser.</p>' +
        '<p><b>The new ideas:</b></p><ul><li><b>An array</b> <code>recNotes[16]</code> is a row of 16 boxes for notes. <code>recCount</code> says how many boxes are filled, and also which box to fill next.</li>' +
        '<li><b>Click or hold?</b> When the button goes down we note the time with <code>millis()</code>, wait for it to come back up, and work out how long it was held.</li>' +
        '<li>We only record when a <b>new key</b> is pressed, not every time the note changes — otherwise every tiny wobble of the pitch bend would fill up the array.</li></ul>',
      code: `
/*
  Mission 03 extension: Record & replay
  Hold the joystick button 1 second: start recording (two beeps).
  Play up to 16 notes. Click the joystick button: hear them played back.
  A quick click while NOT recording fires the laser, like before.
*/

const int BUZZER = 8;
const int JOY_X = A0;
const int JOY_Y = A1;
const int JOY_SW = 2;

int keys[] = { 3, 4, 5, 6 };
int notes[] = { 262, 294, 330, 392 };     // C, D, E, G

int playing = 0;

// NEW: the recording
const int MAX_NOTES = 16;
int recNotes[MAX_NOTES];     // a row of 16 boxes, one note in each
int recCount = 0;            // how many notes are recorded so far (and the next box to fill)
bool recording = false;      // are we recording right now?
int lastBase = 0;            // the key's note last time through loop (to spot NEW key presses)

void setup() {
  for (int k = 0; k < 4; k++) {
    pinMode(keys[k], INPUT_PULLUP);
  }
  pinMode(JOY_SW, INPUT_PULLUP);          // the joystick button works the same way
  Serial.begin(9600);
}

// a falling "pew" sound effect
void laser() {
  for (int f = 2000; f > 200; f = f - 40) {
    tone(BUZZER, f);
    delay(4);
  }
  noTone(BUZZER);
  playing = 0;
}

// NEW: two short high beeps = "recording!"
void startRecording() {
  recording = true;
  recCount = 0;                // empty the recording (start again from box 0)
  for (int i = 0; i < 2; i++) {
    tone(BUZZER, 1500);
    delay(80);
    noTone(BUZZER);
    delay(80);
  }
  playing = 0;
  Serial.println("Recording... click the joystick to stop and play back");
}

// NEW: play every recorded note, from box 0 up to the last one filled
void replay() {
  Serial.print("Playing back ");
  Serial.print(recCount);
  Serial.println(" notes");
  for (int i = 0; i < recCount; i++) {
    tone(BUZZER, recNotes[i]);   // recNotes[i] = the note in box number i
    delay(300);
    noTone(BUZZER);
    delay(50);                   // a tiny gap, so repeated notes sound separate
  }
  playing = 0;
}

void loop() {
  // the joystick button: a short click or a long hold?
  if (digitalRead(JOY_SW) == LOW) {
    unsigned long pressStart = millis();        // when did the press begin?
    while (digitalRead(JOY_SW) == LOW) {
      delay(5);                                 // wait until it's let go
    }
    unsigned long held = millis() - pressStart; // how long was it held (ms)?

    if (held >= 1000) {
      startRecording();                         // long hold: start recording
    } else if (recording) {
      recording = false;                        // click while recording: stop...
      replay();                                 // ...and play it back
    } else {
      laser();                                  // click while not recording: laser!
    }
  }

  int note = 0;
  for (int k = 0; k < 4; k++) {
    if (digitalRead(keys[k]) == LOW) {
      note = notes[k];
    }
  }

  if (note > 0) {
    int y = analogRead(JOY_Y);            // 0 = up, about 512 = middle, 1023 = down
    if (y < 200) {
      note = note * 2;                    // up: one octave higher
    }
    if (y > 823) {
      note = note / 2;                    // down: one octave lower
    }
  }

  // NEW: record each new key press (before the pitch bend, so wobbles don't count)
  if (recording && note > 0 && note != lastBase) {
    if (recCount < MAX_NOTES) {           // only if there's an empty box left
      recNotes[recCount] = note;          // put the note in the next box...
      recCount++;                         // ...and move on to the box after it
      Serial.print("Recorded note ");
      Serial.println(recCount);
    }
  }
  lastBase = note;

  if (note > 0) {
    int x = analogRead(JOY_X);            // 0 = left, 1023 = right
    note = note + map(x, 0, 1023, -60, 60);   // bend the pitch by up to 60 Hz
  }

  if (note != playing) {
    if (note == 0) {
      noTone(BUZZER);
    } else {
      tone(BUZZER, note);
    }
    playing = note;
  }
  delay(10);
}` },

    'Arpeggiator': { name: 'synth_arpeggio',
      note: '<p><b>The idea:</b> instead of one steady note, play three notes one after another, very fast, over and over: the note, then <b>1.25 ×</b> it, then <b>1.5 ×</b> it. Those three frequencies make a major chord, so it sounds like a rolling chord.</p><p>The UNO’s whole numbers can’t do 1.25, so we multiply first and divide after: <code>note * 5 / 4</code> is the same as × 1.25, and <code>note * 3 / 2</code> is × 1.5.</p><p>Each pass of loop() plays the three notes once (3 × 60 ms), so holding a key repeats them.</p>',
      code: `
/*
  Mission 03 extension: Arpeggiator
  Holding a key plays a fast rolling major chord (an arpeggio):
  the note, 1.25 x the note, 1.5 x the note, over and over.
  The joystick still changes the octave and bends the pitch.
*/

const int BUZZER = 8;
const int JOY_X = A0;
const int JOY_Y = A1;
const int JOY_SW = 2;

const int ARP_MS = 60;                    // NEW: how long each note of the arpeggio lasts

int keys[] = { 3, 4, 5, 6 };
int notes[] = { 262, 294, 330, 392 };     // C, D, E, G

void setup() {
  for (int k = 0; k < 4; k++) {
    pinMode(keys[k], INPUT_PULLUP);
  }
  pinMode(JOY_SW, INPUT_PULLUP);
  Serial.begin(9600);
}

// a falling "pew" sound effect
void laser() {
  for (int f = 2000; f > 200; f = f - 40) {
    tone(BUZZER, f);
    delay(4);
  }
  noTone(BUZZER);
}

void loop() {
  if (digitalRead(JOY_SW) == LOW) {       // joystick clicked
    laser();
  }

  int note = 0;
  for (int k = 0; k < 4; k++) {
    if (digitalRead(keys[k]) == LOW) {
      note = notes[k];
    }
  }

  if (note > 0) {
    int y = analogRead(JOY_Y);            // 0 = up, about 512 = middle, 1023 = down
    if (y < 200) {
      note = note * 2;                    // up: one octave higher
    }
    if (y > 823) {
      note = note / 2;                    // down: one octave lower
    }
    int x = analogRead(JOY_X);            // 0 = left, 1023 = right
    note = note + map(x, 0, 1023, -60, 60);   // bend the pitch by up to 60 Hz

    // NEW: the arpeggio - three notes of a major chord, one after another
    tone(BUZZER, note);                   // 1st: the note itself
    delay(ARP_MS);
    tone(BUZZER, note * 5 / 4);           // 2nd: 1.25 x (multiply by 5, then divide by 4)
    delay(ARP_MS);
    tone(BUZZER, note * 3 / 2);           // 3rd: 1.5 x  (multiply by 3, then divide by 2)
    delay(ARP_MS);
    // loop() comes straight back here, so the chord keeps rolling while the key is held
  } else {
    noTone(BUZZER);                       // no key held: silence
    delay(10);
  }
}` },

    'Game sound kit': { name: 'synth_sound_kit',
      note: '<p><b>How to use it:</b> with no key held, push the joystick <b>right</b> for a coin, <b>up</b> for a power-up, <b>down</b> for game over. Click it for the laser. Holding a key still plays notes, as before.</p><p><b>The idea:</b> each sound effect is its own <b>function</b>: a short recipe of tones and delays with a name. Once it’s written, one line like <code>coin();</code> plays it.</p><p>After a sound effect we wait until the stick is back in the middle, so holding it doesn’t repeat the sound over and over.</p>',
      code: `
/*
  Mission 03 extension: Game sound kit
  With no key held, the joystick fires sound effects:
    right = coin pickup    up = power-up    down = game over    click = laser
  Holding a key still plays notes (the joystick bends them, like before).
*/

const int BUZZER = 8;
const int JOY_X = A0;
const int JOY_Y = A1;
const int JOY_SW = 2;

int keys[] = { 3, 4, 5, 6 };
int notes[] = { 262, 294, 330, 392 };     // C, D, E, G

int playing = 0;

void setup() {
  for (int k = 0; k < 4; k++) {
    pinMode(keys[k], INPUT_PULLUP);
  }
  pinMode(JOY_SW, INPUT_PULLUP);
  Serial.begin(9600);
}

// a falling "pew" sound effect
void laser() {
  for (int f = 2000; f > 200; f = f - 40) {
    tone(BUZZER, f);
    delay(4);
  }
  noTone(BUZZER);
  playing = 0;
}

// NEW: coin pickup - two quick high notes going up (B, then a higher E)
void coin() {
  tone(BUZZER, 988);
  delay(80);
  tone(BUZZER, 1319);
  delay(300);
  noTone(BUZZER);
  playing = 0;
}

// NEW: power-up - a fast sweep upwards (the opposite of the laser)
void powerUp() {
  for (int f = 300; f < 2000; f = f + 30) {   // f climbs from 300 Hz to 2000 Hz
    tone(BUZZER, f);
    delay(6);
  }
  noTone(BUZZER);
  playing = 0;
}

// NEW: game over - three slow falling notes
void gameOver() {
  int sadNotes[] = { 392, 330, 262 };        // G, E, C: going down sounds sad
  for (int i = 0; i < 3; i++) {
    tone(BUZZER, sadNotes[i]);
    delay(350);
    noTone(BUZZER);
    delay(80);
  }
  tone(BUZZER, 196);                          // and a long low G to finish
  delay(700);
  noTone(BUZZER);
  playing = 0;
}

// NEW: waits until the stick springs back to the middle
void waitForCentre() {
  while (analogRead(JOY_X) > 700 || analogRead(JOY_Y) < 300 || analogRead(JOY_Y) > 700) {
    delay(10);
  }
}

void loop() {
  if (digitalRead(JOY_SW) == LOW) {       // joystick clicked
    laser();
  }

  int note = 0;
  for (int k = 0; k < 4; k++) {
    if (digitalRead(keys[k]) == LOW) {
      note = notes[k];
    }
  }

  int x = analogRead(JOY_X);              // 0 = left, 1023 = right
  int y = analogRead(JOY_Y);              // 0 = up, 1023 = down

  if (note == 0) {
    // NEW: no key held, so the joystick fires sound effects
    if (x > 823) {
      coin();
      waitForCentre();
    } else if (y < 200) {
      powerUp();
      waitForCentre();
    } else if (y > 823) {
      gameOver();
      waitForCentre();
    }
  } else {
    // a key is held: the joystick changes the note, like the mission
    if (y < 200) {
      note = note * 2;                    // up: one octave higher
    }
    if (y > 823) {
      note = note / 2;                    // down: one octave lower
    }
    note = note + map(x, 0, 1023, -60, 60);   // bend the pitch by up to 60 Hz
  }

  if (note != playing) {
    if (note == 0) {
      noTone(BUZZER);
    } else {
      tone(BUZZER, note);
    }
    playing = note;
  }
  delay(10);
}` },

    'A fifth key': { name: 'synth_five_keys',
      note: '<p><b>Wiring:</b> a fifth push button, exactly like the other four: one leg to <b>pin 9</b>, the other leg to <b>GND</b>. (<code>INPUT_PULLUP</code> means no resistor is needed.)</p><p><b>The idea:</b> the keys and their notes live in two arrays, so adding a key is just adding one more item to each. To avoid hunting for every <code>4</code> in the code, we make a constant <code>NUM_KEYS</code> and use it in both for loops. Next time you add a key, you only change one number!</p>',
      code: `
/*
  Mission 03 extension: A fifth key
  Five keys play C, D, E, G and A: the whole pentatonic scale.
  The joystick works the same as before.
*/

const int BUZZER = 8;
const int JOY_X = A0;
const int JOY_Y = A1;
const int JOY_SW = 2;

const int NUM_KEYS = 5;                          // NEW: how many keys there are
int keys[NUM_KEYS] = { 3, 4, 5, 6, 9 };          // NEW: pin 9 for the fifth key
int notes[NUM_KEYS] = { 262, 294, 330, 392, 440 };   // C, D, E, G and NEW: A (440 Hz)

int playing = 0;

void setup() {
  for (int k = 0; k < NUM_KEYS; k++) {    // NUM_KEYS instead of 4: sets up all five keys
    pinMode(keys[k], INPUT_PULLUP);
  }
  pinMode(JOY_SW, INPUT_PULLUP);
  Serial.begin(9600);
}

// a falling "pew" sound effect
void laser() {
  for (int f = 2000; f > 200; f = f - 40) {
    tone(BUZZER, f);
    delay(4);
  }
  noTone(BUZZER);
  playing = 0;
}

void loop() {
  if (digitalRead(JOY_SW) == LOW) {       // joystick clicked
    laser();
  }

  int note = 0;
  for (int k = 0; k < NUM_KEYS; k++) {    // checks all five keys
    if (digitalRead(keys[k]) == LOW) {
      note = notes[k];
    }
  }

  if (note > 0) {
    int y = analogRead(JOY_Y);            // 0 = up, about 512 = middle, 1023 = down
    if (y < 200) {
      note = note * 2;                    // up: one octave higher
    }
    if (y > 823) {
      note = note / 2;                    // down: one octave lower
    }
    int x = analogRead(JOY_X);            // 0 = left, 1023 = right
    note = note + map(x, 0, 1023, -60, 60);   // bend the pitch by up to 60 Hz
  }

  if (note != playing) {
    if (note == 0) {
      noTone(BUZZER);
    } else {
      tone(BUZZER, note);
    }
    playing = note;
    Serial.print("note: ");
    Serial.println(note);
  }
  delay(10);
}` },

    'Find the loudest note': { name: 'buzzer_sweep',
      note: '<p><b>The idea:</b> a for loop climbs from 200 Hz to 5000 Hz in steps of 20 Hz, playing each one for 30 ms and printing it. Listen for where it suddenly gets much louder — that’s the buzzer’s <b>resonant frequency</b>, where the little disc inside naturally wants to wobble.</p><p><b>How to use it:</b> open the Serial Monitor. When it sounds loudest, look at the numbers scrolling past. It sweeps again every few seconds, so you can listen several times and narrow it down. Then try changing the start and end of the sweep to zoom in on that area.</p>',
      code: `
/*
  Mission 03 extension: Find the loudest note
  Sweeps the passive buzzer slowly from 200 Hz to 5000 Hz and prints
  each frequency. Listen for where it's loudest: that's its resonant frequency.
*/

const int BUZZER = 8;

// change these to zoom in on the loud part (for example 2000 to 4000)
const int START_HZ = 200;
const int END_HZ = 5000;
const int STEP_HZ = 20;     // smaller step = slower, more careful sweep

void setup() {
  Serial.begin(9600);
  Serial.println("Listen! Note the frequency where it's loudest.");
}

void loop() {
  // f starts at 200 and goes up by 20 each time, until it passes 5000
  for (int f = START_HZ; f <= END_HZ; f = f + STEP_HZ) {
    tone(BUZZER, f);        // play this frequency...
    Serial.println(f);      // ...and print it, so you can see what you're hearing
    delay(30);
  }
  noTone(BUZZER);
  Serial.println("--- end of sweep, starting again in 3 seconds ---");
  delay(3000);
}` }
  };
})(window);
