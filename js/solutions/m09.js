/* Solutions for the Mission 09 (Reaction timer) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};

  var PINS = `const int DATA_PIN = 8;      // 74HC595 DS
const int LATCH_PIN = 9;     // 74HC595 ST_CP
const int CLOCK_PIN = 10;    // 74HC595 SH_CP
const int DIGIT_PINS[4] = {2, 3, 4, 5};   // D1 to D4 (LOW = on)`;
  var BUTTONS = `const int P1_BUTTON = 6;
const int P2_BUTTON = 7;
const int BUZZER = 12;`;
  var SEGS = `// segment patterns: bit 0 = a ... bit 6 = g, bit 7 = dp
const byte DIGITS[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66,
                         0x6D, 0x7D, 0x07, 0x7F, 0x6F};
const byte BLANK = 0x00;
const byte DASH = 0x40;
const byte DOT = 0x80;
const byte LETTER_F = 0x71;
const byte LETTER_S = 0x6D;
const byte LETTER_G = 0x3D;
const byte LETTER_O = 0x3F;`;
  var STATES = `// the game's states
const int WAITING = 0;
const int READY = 1;
const int GO = 2;
const int RESULT = 3;
int state = WAITING;`;
  var VARS = `byte screen[4] = {DASH, DASH, DASH, DASH};  // what each digit shows
int current = 0;               // the digit that is lit right now
unsigned long goTime = 0;      // when GO happens (ms)
unsigned long resultTime = 0;  // when the last round ended
unsigned long p1Time = 0;      // reaction times (0 = not pressed yet)
unsigned long p2Time = 0;`;
  var SETUP_TOP = `  pinMode(DATA_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  for (int i = 0; i < 4; i++) {
    pinMode(DIGIT_PINS[i], OUTPUT);
    digitalWrite(DIGIT_PINS[i], HIGH);   // all digits off
  }`;
  var SETUP = `void setup() {
` + SETUP_TOP + `
  pinMode(P1_BUTTON, INPUT_PULLUP);       // pressed = LOW
  pinMode(P2_BUTTON, INPUT_PULLUP);
  pinMode(BUZZER, OUTPUT);
  randomSeed(analogRead(A0));             // A0 is unconnected: random noise
  Serial.begin(9600);
  Serial.println("Reaction timer: press a button to start");
}`;
  var START = `void startRound() {
  setScreen(DASH, DASH, DASH, DASH);
  Serial.println("Get ready...");
  while (digitalRead(P1_BUTTON) == LOW || digitalRead(P2_BUTTON) == LOW) {
    showNextDigit();                      // wait until both buttons are released
    delay(2);
  }
  goTime = millis() + random(2000, 5000); // GO comes in 2 to 5 seconds
  p1Time = 0;
  p2Time = 0;
  state = READY;
}`;
  var GO_BRANCH = `  } else if (state == READY) {
    if (p1 || p2) {                       // pressed before GO
      falseStart(p1 ? 1 : 2);
    } else if (now >= goTime) {           // the random wait is over: GO!
      digitalWrite(BUZZER, HIGH);
      setScreen(BLANK, LETTER_G, LETTER_O, BLANK);
      goTime = now;
      state = GO;
    }
  } else if (state == GO) {
    if (now - goTime > 200) digitalWrite(BUZZER, LOW);   // a short beep
    if (p1 && p1Time == 0) p1Time = now - goTime;
    if (p2 && p2Time == 0) p2Time = now - goTime;
    if ((p1Time > 0 && p2Time > 0) || now - goTime > 3000) {
      finishRound();                      // both pressed, or time is up
    }`;
  var LOOP_HEAD = `void loop() {
  showNextDigit();                        // keep the display alive
  unsigned long now = millis();
  bool p1 = digitalRead(P1_BUTTON) == LOW;
  bool p2 = digitalRead(P2_BUTTON) == LOW;

  if (state == WAITING) {
    if (p1 || p2) startRound();`;
  var LOOP = LOOP_HEAD + `
` + GO_BRANCH + `
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    if (now - resultTime > 1500 && (p1 || p2)) startRound();
  }
  delay(2);
}`;
  var FALSE = `void falseStart(int player) {
  setScreen(LETTER_F, LETTER_S, DASH, DIGITS[player]);   // "FS-1" or "FS-2"
  Serial.print("False start by player ");
  Serial.println(player);
  digitalWrite(BUZZER, HIGH);             // a long buzz (switched off in RESULT)
  state = RESULT;
  resultTime = millis();
}`;
  var FINISH = `void finishRound() {
  digitalWrite(BUZZER, LOW);
  Serial.print("Player 1: ");
  printTime(p1Time);
  Serial.print("   Player 2: ");
  printTime(p2Time);
  Serial.println();
  if (p1Time == 0 && p2Time == 0) {
    setScreen(DASH, DASH, DASH, DASH);
    Serial.println("Nobody pressed!");
  } else if (p2Time == 0 || (p1Time > 0 && p1Time <= p2Time)) {
    showResult(1, p1Time);
    Serial.println("Player 1 wins!");
  } else {
    showResult(2, p2Time);
    Serial.println("Player 2 wins!");
  }
  state = RESULT;
  resultTime = millis();
}`;
  var RESULT_FN = `// winner number with a dot, then the time: 1.234
void showResult(int player, unsigned long ms) {
  if (ms > 999) ms = 999;
  setScreen(DIGITS[player] | DOT, DIGITS[ms / 100], DIGITS[ms / 10 % 10], DIGITS[ms % 10]);
}`;
  var PRINT = `void printTime(unsigned long ms) {
  if (ms == 0) {
    Serial.print("--");
  } else {
    Serial.print(ms);
    Serial.print(" ms");
  }
}`;
  var SCREEN = `void setScreen(byte a, byte b, byte c, byte d) {
  screen[0] = a;
  screen[1] = b;
  screen[2] = c;
  screen[3] = d;
}`;
  var WRITE = `void writeSegments(byte pattern) {
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);
  digitalWrite(LATCH_PIN, HIGH);
}`;
  var NEXT = `void showNextDigit() {
  digitalWrite(DIGIT_PINS[current], HIGH);  // switch off the digit that was on
  current = (current + 1) % 4;
  writeSegments(screen[current]);
  digitalWrite(DIGIT_PINS[current], LOW);   // switch on the next one
}`;
  function sketch(head, parts) { return '\n/*\n' + head + '\n*/\n\n' + parts.join('\n\n'); }

  RL.SOLUTIONS.m09 = {

    'Best of 5': { name: 'reaction_best_of_5',
      note: '<p><b>The idea:</b> two <code>int</code> variables keep the score. The winner of each round gets a point; a false start gives the <b>other</b> player a point. Between rounds the display shows the score, like <b>2-1</b>.</p><p>When someone reaches 3, a new state, <code>CHAMPION</code>, takes over: it flashes “P1” or “P2” for 4 seconds, then resets the scores for a new match. The flashing uses the clock, not <code>delay()</code>, because the display has to be refreshed all the time: <code>(t / 250) % 2</code> flips between 0 and 1 every 250 ms.</p>',
      code: sketch(`  Mission 09 extension: Best of 5
  A tournament: the winner of each round gets a point (a false start
  gives the other player the point). The score shows between rounds.
  First to 3 wins the match: their number flashes, then a new match starts.`, [PINS, BUTTONS, SEGS + `
const byte LETTER_P = 0x73;   // NEW: P for "player"`, `// the game's states
const int WAITING = 0;
const int READY = 1;
const int GO = 2;
const int RESULT = 3;
const int CHAMPION = 4;       // NEW: someone has won the match
int state = WAITING;`, VARS + `

// NEW: the match
const int WIN_SCORE = 3;      // first to 3 points (best of 5)
int score1 = 0;
int score2 = 0;
int champ = 0;                // who won the match (1 or 2)`, SETUP,
      LOOP_HEAD + `
` + GO_BRANCH + `
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    if (now - resultTime > 1500) {
      // NEW: after the round's result, check for a match winner, or show the score
      if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
        champ = (score1 >= WIN_SCORE) ? 1 : 2;
        Serial.print("PLAYER ");
        Serial.print(champ);
        Serial.println(" WINS THE MATCH!");
        state = CHAMPION;
        resultTime = now;
      } else {
        setScreen(BLANK, DIGITS[score1], DASH, DIGITS[score2]);   // the score, like " 2-1"
        if (p1 || p2) startRound();
      }
    }
  } else if (state == CHAMPION) {
    // NEW: flash "P1" or "P2" for 4 seconds
    unsigned long t = now - resultTime;
    if ((t / 250) % 2 == 0) {
      setScreen(LETTER_P, DIGITS[champ], BLANK, BLANK);
    } else {
      setScreen(BLANK, BLANK, BLANK, BLANK);
    }
    if (t > 4000) {                       // then start a new match
      score1 = 0;
      score2 = 0;
      setScreen(DASH, DASH, DASH, DASH);
      state = WAITING;
      Serial.println("New match: press a button to start");
    }
  }
  delay(2);
}`, START,
      `void falseStart(int player) {
  setScreen(LETTER_F, LETTER_S, DASH, DIGITS[player]);   // "FS-1" or "FS-2"
  Serial.print("False start by player ");
  Serial.println(player);
  // NEW: a false start gives the OTHER player the point
  if (player == 1) {
    score2++;
  } else {
    score1++;
  }
  printScore();
  digitalWrite(BUZZER, HIGH);             // a long buzz (switched off in RESULT)
  state = RESULT;
  resultTime = millis();
}`,
      `void finishRound() {
  digitalWrite(BUZZER, LOW);
  Serial.print("Player 1: ");
  printTime(p1Time);
  Serial.print("   Player 2: ");
  printTime(p2Time);
  Serial.println();
  if (p1Time == 0 && p2Time == 0) {
    setScreen(DASH, DASH, DASH, DASH);
    Serial.println("Nobody pressed!");    // no points for anyone
  } else if (p2Time == 0 || (p1Time > 0 && p1Time <= p2Time)) {
    showResult(1, p1Time);
    Serial.println("Player 1 wins!");
    score1++;                             // NEW: a point for player 1
  } else {
    showResult(2, p2Time);
    Serial.println("Player 2 wins!");
    score2++;                             // NEW: a point for player 2
  }
  printScore();
  state = RESULT;
  resultTime = millis();
}

// NEW: prints the score in the Serial Monitor
void printScore() {
  Serial.print("Score: ");
  Serial.print(score1);
  Serial.print(" - ");
  Serial.println(score2);
}`, RESULT_FN, PRINT, SCREEN, WRITE, NEXT]) },

    'High score': { name: 'reaction_high_score',
      note: '<p><b>The idea:</b> a variable <code>best</code> holds the fastest winning time ever. It starts at 9999, so the first real time beats it. When a winner is faster, <code>best</code> is updated and a flag, <code>newRecord</code>, tells the RESULT state to show <b>HI</b> and then the record.</p><p><b>The extra:</b> <code>EEPROM.put(0, best)</code> saves the record in memory that survives a reset or being unplugged; <code>EEPROM.get(0, best)</code> in <code>setup()</code> loads it back. A brand-new EEPROM reads as a huge number, so anything over 9999 is treated as “no record yet”. (In the Virtual UNO the EEPROM is kept until you reload the page, so a record survives Stop and Upload &amp; run.)</p><p>To <b>clear</b> the record, hold both buttons while switching on.</p>',
      code: sketch(`  Mission 09 extension: High score
  Remembers the fastest winning time ever. When someone beats it,
  the display shows HI, then the new record.
  The record is saved in EEPROM, so it survives a reset.
  Hold both buttons while switching on to clear the record.`, ['#include <EEPROM.h>       // NEW: memory that survives being switched off', PINS, BUTTONS, SEGS + `
const byte LETTER_H = 0x76;   // NEW
const byte LETTER_I = 0x06;   // NEW (the same segments as a 1)`, STATES, VARS + `

unsigned long best = 9999;    // NEW: the record (fastest winning time, ms). 9999 = no record yet
bool newRecord = false;       // NEW: did the last round set a new record?`,
      `void setup() {
` + SETUP_TOP + `
  pinMode(P1_BUTTON, INPUT_PULLUP);       // pressed = LOW
  pinMode(P2_BUTTON, INPUT_PULLUP);
  pinMode(BUZZER, OUTPUT);
  randomSeed(analogRead(A0));             // A0 is unconnected: random noise
  Serial.begin(9600);

  // NEW: load the record from EEPROM (address 0)
  EEPROM.get(0, best);
  if (best > 9999) best = 9999;           // a new EEPROM reads as a huge number: no record yet
  if (digitalRead(P1_BUTTON) == LOW && digitalRead(P2_BUTTON) == LOW) {
    best = 9999;                          // both buttons held at switch-on: clear the record
    EEPROM.put(0, best);
    Serial.println("Record cleared");
  }
  Serial.print("Reaction timer. Record: ");
  printTime(best == 9999 ? 0 : best);
  Serial.println();
}`,
      LOOP_HEAD + `
` + GO_BRANCH + `
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    // NEW: after a record, show "HI" from 1.5 s, then the record time from 2.5 s
    if (newRecord && now - resultTime > 1500 && now - resultTime <= 2500) {
      setScreen(BLANK, LETTER_H, LETTER_I, BLANK);
    } else if (newRecord && now - resultTime > 2500) {
      setScreen(BLANK, DIGITS[best / 100 % 10], DIGITS[best / 10 % 10], DIGITS[best % 10]);
    }
    if (now - resultTime > 1500 && (p1 || p2)) startRound();
  }
  delay(2);
}`, START, FALSE,
      `void finishRound() {
  digitalWrite(BUZZER, LOW);
  Serial.print("Player 1: ");
  printTime(p1Time);
  Serial.print("   Player 2: ");
  printTime(p2Time);
  Serial.println();
  unsigned long winTime = 0;              // NEW: the winner's time (0 = nobody pressed)
  if (p1Time == 0 && p2Time == 0) {
    setScreen(DASH, DASH, DASH, DASH);
    Serial.println("Nobody pressed!");
  } else if (p2Time == 0 || (p1Time > 0 && p1Time <= p2Time)) {
    showResult(1, p1Time);
    Serial.println("Player 1 wins!");
    winTime = p1Time;
  } else {
    showResult(2, p2Time);
    Serial.println("Player 2 wins!");
    winTime = p2Time;
  }

  // NEW: is it a new record?
  newRecord = (winTime > 0 && winTime < best);
  if (newRecord) {
    best = winTime;
    EEPROM.put(0, best);                  // save it for ever (well, until it's beaten)
    Serial.print("NEW RECORD: ");
    printTime(best);
    Serial.println();
  }
  state = RESULT;
  resultTime = millis();
}`, RESULT_FN, PRINT, SCREEN, WRITE, NEXT]) },

    'Three players': { name: 'reaction_three_players',
      note: '<p><b>Wiring:</b> a third button between <b>pin 11</b> and GND, like the other two.</p><p><b>The idea:</b> instead of copying every “player 2” line to make “player 3”, the players become <b>arrays</b>: <code>BUTTONS[3]</code> holds the three pins, <code>times[3]</code> the three reaction times, and <code>pressed[3]</code> whether each button is down right now. A for loop with <code>i</code> going 0, 1, 2 handles every player with the same lines of code. (Player numbers on the display are <code>i + 1</code>, because people count from 1 but arrays count from 0.)</p><p>The winner is the player with the <b>smallest time that isn’t 0</b> (0 means they didn’t press). With arrays, a 4th player would only mean changing <code>NUM_PLAYERS</code> and adding a pin!</p>',
      code: sketch(`  Mission 09 extension: Three players
  Three players, one button each (pins 6, 7 and 11). Press any button
  to start a round. The display shows the winner (1, 2 or 3) and their time.
  The players are stored in arrays, so the same code handles all three.`, [PINS + `

const int NUM_PLAYERS = 3;                         // NEW
const int BUTTONS[NUM_PLAYERS] = {6, 7, 11};       // NEW: player 1, 2 and 3's buttons
const int BUZZER = 12;`, SEGS, STATES,
      `byte screen[4] = {DASH, DASH, DASH, DASH};  // what each digit shows
int current = 0;               // the digit that is lit right now
unsigned long goTime = 0;      // when GO happens (ms)
unsigned long resultTime = 0;  // when the last round ended
unsigned long times[NUM_PLAYERS];   // NEW: each player's reaction time (0 = not pressed yet)
bool pressed[NUM_PLAYERS];          // NEW: is each button down right now?`,
      `void setup() {
` + SETUP_TOP + `
  for (int i = 0; i < NUM_PLAYERS; i++) {
    pinMode(BUTTONS[i], INPUT_PULLUP);    // pressed = LOW
  }
  pinMode(BUZZER, OUTPUT);
  randomSeed(analogRead(A0));             // A0 is unconnected: random noise
  Serial.begin(9600);
  Serial.println("Reaction timer, 3 players: press a button to start");
}`,
      `void loop() {
  showNextDigit();                        // keep the display alive
  unsigned long now = millis();

  // NEW: read every button into the pressed[] array, and note the first one that's down
  int firstDown = 0;                      // 0 = nobody; otherwise the player number (1 to 3)
  for (int i = 0; i < NUM_PLAYERS; i++) {
    pressed[i] = digitalRead(BUTTONS[i]) == LOW;
    if (pressed[i] && firstDown == 0) firstDown = i + 1;
  }

  if (state == WAITING) {
    if (firstDown > 0) startRound();
  } else if (state == READY) {
    if (firstDown > 0) {                  // pressed before GO
      falseStart(firstDown);
    } else if (now >= goTime) {           // the random wait is over: GO!
      digitalWrite(BUZZER, HIGH);
      setScreen(BLANK, LETTER_G, LETTER_O, BLANK);
      goTime = now;
      state = GO;
    }
  } else if (state == GO) {
    if (now - goTime > 200) digitalWrite(BUZZER, LOW);   // a short beep
    bool everyone = true;                 // has everyone pressed? (true until we find someone who hasn't)
    for (int i = 0; i < NUM_PLAYERS; i++) {
      if (pressed[i] && times[i] == 0) times[i] = now - goTime;   // record their time
      if (times[i] == 0) everyone = false;
    }
    if (everyone || now - goTime > 3000) {
      finishRound();                      // all pressed, or time is up
    }
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    if (now - resultTime > 1500 && firstDown > 0) startRound();
  }
  delay(2);
}`,
      `// true if any button is held down
bool anyHeld() {
  for (int i = 0; i < NUM_PLAYERS; i++) {
    if (digitalRead(BUTTONS[i]) == LOW) return true;
  }
  return false;
}

void startRound() {
  setScreen(DASH, DASH, DASH, DASH);
  Serial.println("Get ready...");
  while (anyHeld()) {
    showNextDigit();                      // wait until every button is released
    delay(2);
  }
  goTime = millis() + random(2000, 5000); // GO comes in 2 to 5 seconds
  for (int i = 0; i < NUM_PLAYERS; i++) {
    times[i] = 0;                         // nobody has pressed yet
  }
  state = READY;
}`, FALSE,
      `void finishRound() {
  digitalWrite(BUZZER, LOW);

  // NEW: find the winner = the smallest time that isn't 0
  int winner = 0;                         // 0 = nobody pressed
  unsigned long bestTime = 0;
  for (int i = 0; i < NUM_PLAYERS; i++) {
    Serial.print("Player ");
    Serial.print(i + 1);
    Serial.print(": ");
    printTime(times[i]);
    Serial.print("   ");
    if (times[i] > 0 && (winner == 0 || times[i] < bestTime)) {
      winner = i + 1;                     // the fastest so far
      bestTime = times[i];
    }
  }
  Serial.println();

  if (winner == 0) {
    setScreen(DASH, DASH, DASH, DASH);
    Serial.println("Nobody pressed!");
  } else {
    showResult(winner, bestTime);
    Serial.print("Player ");
    Serial.print(winner);
    Serial.println(" wins!");
  }
  state = RESULT;
  resultTime = millis();
}`, RESULT_FN, PRINT, SCREEN, WRITE, NEXT]) },

    'Difficulty levels': { name: 'reaction_difficulty',
      note: '<p><b>How to use it:</b> while the display shows dashes, <b>hold player 2’s button for 1 second</b> to switch between <b>EASY</b> and <b>HArd</b>. A quick press of either button starts a round, as before.</p><p><b>Hard mode:</b></p><ul><li>The wait before GO is shorter and less predictable: 1–3 s instead of 2–5 s.</li><li>Before the real beep there’s a <b>fake-out</b>: a quick “beep-beep” at a random moment. It’s still the READY state, so anyone who presses on it gets a false start!</li></ul><p>The fake beep must keep the display alive and keep watching the buttons, so it uses a helper, <code>holdFor()</code>, that waits by refreshing the display in a loop instead of calling <code>delay()</code>.</p>',
      code: sketch(`  Mission 09 extension: Difficulty levels
  EASY: the normal game.
  HARD: shorter random waits, plus a fake "double beep" before GO.
        Press on the fake and it's a false start!
  While waiting, hold player 2's button for 1 second to switch EASY / HARD.`, [PINS, BUTTONS, SEGS + `
const byte LETTER_E = 0x79;   // NEW letters for "EASY" and "HArd"
const byte LETTER_A = 0x77;
const byte LETTER_Y = 0x6E;
const byte LETTER_H = 0x76;
const byte LETTER_R = 0x50;   // a small r
const byte LETTER_D = 0x5E;   // a small d`, STATES, VARS + `

bool hard = false;             // NEW: false = EASY, true = HARD
unsigned long fakeTime = 0;    // NEW: when the fake beep happens (HARD only)
bool fakeDone = true;          // NEW: has the fake beep happened this round?`, SETUP,
      `void loop() {
  showNextDigit();                        // keep the display alive
  unsigned long now = millis();
  bool p1 = digitalRead(P1_BUTTON) == LOW;
  bool p2 = digitalRead(P2_BUTTON) == LOW;

  if (state == WAITING) {
    if (p1) {
      startRound();
    } else if (p2) {
      // NEW: player 2's button: a long hold switches the level, a short press starts
      unsigned long pressStart = millis();
      while (digitalRead(P2_BUTTON) == LOW) {
        showNextDigit();                  // keep the display alive while it's held
        delay(2);
      }
      if (millis() - pressStart > 1000) {
        switchLevel();
      } else {
        startRound();
      }
    }
  } else if (state == READY) {
    if (p1 || p2) {                       // pressed before GO
      falseStart(p1 ? 1 : 2);
    } else if (!fakeDone && now >= fakeTime) {
      fakeDone = true;                    // NEW: time for the fake-out
      int cheater = fakeBeep();
      if (cheater > 0) falseStart(cheater);
    } else if (now >= goTime) {           // the random wait is over: GO!
      digitalWrite(BUZZER, HIGH);
      setScreen(BLANK, LETTER_G, LETTER_O, BLANK);
      goTime = now;
      state = GO;
    }
  } else if (state == GO) {
    if (now - goTime > 200) digitalWrite(BUZZER, LOW);   // a short beep
    if (p1 && p1Time == 0) p1Time = now - goTime;
    if (p2 && p2Time == 0) p2Time = now - goTime;
    if ((p1Time > 0 && p2Time > 0) || now - goTime > 3000) {
      finishRound();                      // both pressed, or time is up
    }
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    if (now - resultTime > 1500 && (p1 || p2)) startRound();
  }
  delay(2);
}

// NEW: switches between EASY and HARD and shows which
void switchLevel() {
  hard = !hard;
  if (hard) {
    setScreen(LETTER_H, LETTER_A, LETTER_R, LETTER_D);
    Serial.println("Level: HARD");
  } else {
    setScreen(LETTER_E, LETTER_A, LETTER_S, LETTER_Y);
    Serial.println("Level: EASY");
  }
}

// NEW: waits ms milliseconds while keeping the display alive.
// Returns the number of a player who pressed during the wait (0 = nobody).
int holdFor(int ms) {
  unsigned long start = millis();
  while (millis() - start < (unsigned long) ms) {
    showNextDigit();
    if (digitalRead(P1_BUTTON) == LOW) return 1;
    if (digitalRead(P2_BUTTON) == LOW) return 2;
    delay(2);
  }
  return 0;
}

// NEW: the fake-out, a quick "beep-beep". Returns who pressed during it (0 = nobody).
int fakeBeep() {
  int who = 0;
  for (int i = 0; i < 2 && who == 0; i++) {
    digitalWrite(BUZZER, HIGH);
    who = holdFor(60);
    digitalWrite(BUZZER, LOW);
    if (who == 0) who = holdFor(60);
  }
  return who;
}

void startRound() {
  setScreen(DASH, DASH, DASH, DASH);
  Serial.println(hard ? "Get ready... (HARD)" : "Get ready...");
  while (digitalRead(P1_BUTTON) == LOW || digitalRead(P2_BUTTON) == LOW) {
    showNextDigit();                      // wait until both buttons are released
    delay(2);
  }
  unsigned long now = millis();
  if (hard) {
    long wait = random(1000, 3000);       // NEW: HARD: GO comes in 1 to 3 seconds...
    goTime = now + wait;
    fakeTime = now + random(400, wait - 300);   // ...with a fake beep some time before it
    fakeDone = false;
  } else {
    goTime = now + random(2000, 5000);    // EASY: GO comes in 2 to 5 seconds
    fakeDone = true;                      // no fake beep
  }
  p1Time = 0;
  p2Time = 0;
  state = READY;
}`, FALSE, FINISH, RESULT_FN, PRINT, SCREEN, WRITE, NEXT]) },

    'Get-ready light': { name: 'reaction_ready_bar',
      note: '<p><b>Wiring:</b> a second 74HC595 next to the first, with the 8-LED bar (each LED through a 220 Ω resistor) on its Q0–Q7. It gets power like the first chip (VCC and MR → 5V, GND and OE → GND). Its <b>clock (SH_CP)</b> and <b>latch (ST_CP)</b> pins connect to the same UNO pins as the first chip’s (10 and 9). Its <b>data in (DS)</b> comes from the first chip’s <b>Q7′ (pin 9)</b>, not from the UNO: bits overflow from the first chip into the second.</p><p><b>The idea:</b> with two chips chained, you shift out <b>two bytes</b> before latching. The first byte gets pushed all the way through into the far chip (the bar), the second stays in the near chip (the digits).</p><p>During READY the bar fills up over the first 2 seconds. GO never comes before 2 seconds, so a full bar means “any moment now” — but it doesn’t give away exactly when!</p>',
      code: sketch(`  Mission 09 extension: Get-ready light
  The LED bar is back, on a second 74HC595 chained from the first
  one's Q7' pin. During READY it fills up as a "get ready" countdown.`, [PINS, BUTTONS, SEGS, STATES, VARS + `
byte bar = 0;                  // NEW: which LEDs of the bar are on (one bit per LED)
unsigned long readyStart = 0;  // NEW: when the READY state began`, SETUP,
      LOOP_HEAD + `
  } else if (state == READY) {
    // NEW: fill the bar over the first 2 seconds. lit = how many LEDs (0 to 8)
    unsigned long waited = now - readyStart;
    int lit = waited * 8 / 2000;
    if (lit > 8) lit = 8;
    bar = (1 << lit) - 1;                 // e.g. lit = 3 -> 1000 - 1 = 0111 in binary: 3 LEDs on

    if (p1 || p2) {                       // pressed before GO
      falseStart(p1 ? 1 : 2);
    } else if (now >= goTime) {           // the random wait is over: GO!
      digitalWrite(BUZZER, HIGH);
      setScreen(BLANK, LETTER_G, LETTER_O, BLANK);
      bar = 0;                            // NEW: bar off at GO
      goTime = now;
      state = GO;
    }
  } else if (state == GO) {
    if (now - goTime > 200) digitalWrite(BUZZER, LOW);   // a short beep
    if (p1 && p1Time == 0) p1Time = now - goTime;
    if (p2 && p2Time == 0) p2Time = now - goTime;
    if ((p1Time > 0 && p2Time > 0) || now - goTime > 3000) {
      finishRound();                      // both pressed, or time is up
    }
  } else if (state == RESULT) {
    if (now - resultTime > 400) digitalWrite(BUZZER, LOW);
    if (now - resultTime > 1500 && (p1 || p2)) startRound();
  }
  delay(2);
}`,
      `void startRound() {
  setScreen(DASH, DASH, DASH, DASH);
  Serial.println("Get ready...");
  while (digitalRead(P1_BUTTON) == LOW || digitalRead(P2_BUTTON) == LOW) {
    showNextDigit();                      // wait until both buttons are released
    delay(2);
  }
  goTime = millis() + random(2000, 5000); // GO comes in 2 to 5 seconds
  readyStart = millis();                  // NEW: the bar starts filling now
  p1Time = 0;
  p2Time = 0;
  state = READY;
}`,
      `void falseStart(int player) {
  setScreen(LETTER_F, LETTER_S, DASH, DIGITS[player]);   // "FS-1" or "FS-2"
  bar = 0;                                // NEW: bar off
  Serial.print("False start by player ");
  Serial.println(player);
  digitalWrite(BUZZER, HIGH);             // a long buzz (switched off in RESULT)
  state = RESULT;
  resultTime = millis();
}`, FINISH, RESULT_FN, PRINT, SCREEN,
      `// NEW: two chips in a chain, so two bytes before the latch.
// The FIRST byte shifted out ends up in the FAR chip (the bar);
// the second byte stays in the near chip (the digit's segments).
void writeSegments(byte pattern) {
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, bar);       // -> second chip: the LED bar
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, pattern);   // -> first chip: the segments
  digitalWrite(LATCH_PIN, HIGH);
}`, NEXT]) }
  };
})(window);
