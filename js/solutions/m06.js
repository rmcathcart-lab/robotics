/* Solutions for the Mission 06 (Fortune teller) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};

  // pieces of the mission's sketch that the solutions share
  var TOP = `#include <LiquidCrystal.h>

LiquidCrystal lcd(7, 8, 9, 10, 11, 12);   // RS, E, D4, D5, D6, D7
const int TILT = 2;                       // tilt switch to ground (INPUT_PULLUP)
const int THERMISTOR = A0;                // thermistor + 10 kΩ divider`;
  var ANSWERS = `String answers[] = {
  "Yes!", "No way", "Ask again later", "Without a doubt",
  "Not today", "Signs say yes", "Very doubtful", "Try a pizza",
};
const int NUM_ANSWERS = 8;`;
  var MODES = `// the two modes
const int FORTUNE = 0;
const int THERMO = 1;
int mode = FORTUNE;`;
  var STATE = `int lastReading = LOW;           // the switch, last time through loop()
unsigned long tipStart = 0;      // when the box was last tipped (ms)
bool handled = true;             // has this tip already done its job?
unsigned long lastTemp = 0;      // when the temperature was last updated`;
  var SETUP = `void setup() {
  lcd.begin(16, 2);
  pinMode(TILT, INPUT_PULLUP);
  randomSeed(analogRead(A1));
  titleScreen();
  lastReading = digitalRead(TILT);
}`;
  function loopFn(onShake) {
    return `void loop() {
  int reading = digitalRead(TILT);

  if (reading == HIGH && lastReading == LOW) {      // just tipped: start the timer
    tipStart = millis();
    handled = false;
  }
  if (reading == HIGH && !handled && millis() - tipStart > 2000) {   // tipped for 2 s
    switchMode();
    handled = true;
  }
  if (reading == LOW && lastReading == HIGH && !handled) {           // upright again
` + onShake + `
    handled = true;
  }
  lastReading = reading;

  switch (mode) {
    case FORTUNE:
      break;                     // the answer stays on screen until the next shake
    case THERMO:
      if (millis() - lastTemp > 500) {
        showTemperature();
        lastTemp = millis();
      }
      break;
  }
}`;
  }
  var SHAKE = `    if (millis() - tipStart > 30 && mode == FORTUNE) {   // a real shake, not a tiny bounce
      tellFortune();
    }`;
  var TITLE = `void titleScreen() {
  lcd.clear();
  lcd.print("* MAGIC  BOX *");
  lcd.setCursor(0, 1);
  lcd.print("Shake to ask...");
}`;
  var SWITCH = `void switchMode() {
  if (mode == FORTUNE) {
    mode = THERMO;
    lcd.clear();
    lcd.print("Thermometer");
  } else {
    mode = FORTUNE;
    titleScreen();
  }
}`;
  var THERM = `void showTemperature() {
  int reading = analogRead(THERMISTOR);
  float resistance = 10000.0 * (1024.0 / reading - 1);
  float logR = log(resistance);
  float tempK = 1 / (0.001129148 + (0.000234125 + 0.0000000876741 * logR * logR) * logR);
  float tempC = tempK - 273.15;
  lcd.setCursor(0, 1);
  lcd.print(tempC, 1);
  lcd.print(" C      ");
}`;
  function sketch(head, parts) { return '\n/*\n' + head + '\n*/\n' + parts.join('\n\n'); }

  RL.SOLUTIONS.m06 = {

    'Thinking countdown': { name: 'fortune_countdown',
      note: '<p><b>The idea:</b> a for loop that counts <b>down</b>: <code>for (int i = 3; i &gt; 0; i--)</code> gives i = 3, then 2, then 1. (<code>i--</code> means “take one away from i”.) Each number goes in the middle of the top row.</p><p>At the same time, a bar fills up across the bottom row, one solid block (<code>lcd.write(255)</code>) at a time: 5 blocks per number, 15 blocks altogether, so the bar is full just as the countdown ends.</p>',
      code: sketch(`  Mission 06 extension: Thinking countdown
  A shake shows a dramatic "3... 2... 1..." countdown while a bar fills
  across the bottom row, then the answer appears.`, [TOP, ANSWERS, MODES, STATE, SETUP, loopFn(SHAKE), TITLE,
      `// NEW: the countdown version of tellFortune()
void tellFortune() {
  lcd.clear();
  int blocks = 0;                     // how many blocks of the bar are drawn so far

  for (int i = 3; i > 0; i--) {       // i = 3, then 2, then 1 (i-- takes 1 away each time)
    lcd.setCursor(7, 0);              // the middle of the top row (column 7)
    lcd.print(i);

    for (int b = 0; b < 5; b++) {     // add 5 blocks to the bar for each number
      lcd.setCursor(blocks, 1);       // the next empty spot on the bottom row
      lcd.write(255);                 // character 255 is a solid block
      blocks++;
      delay(100);                     // 5 blocks x 100 ms = half a second per number
    }
  }
  delay(300);

  int pick = random(NUM_ANSWERS);
  lcd.clear();
  lcd.print("The box says:");
  lcd.setCursor(0, 1);
  lcd.print(answers[pick]);
}`, SWITCH, THERM]) },

    'Scrolling answers': { name: 'fortune_scroll',
      note: '<p><b>The idea:</b> the screen is only 16 characters wide, so a longer answer is shown <b>one 16-character slice at a time</b>, moving one letter along each time — like a news ticker.</p><p><code>answer.substring(i, i + 16)</code> cuts out the letters from position <code>i</code> up to (not including) <code>i + 16</code>. As <code>i</code> goes 0, 1, 2 … the slice slides along the answer. <code>answer.length()</code> tells us how many letters it has, so we know when to stop.</p><p>This only scrolls the bottom row (unlike <code>lcd.scrollDisplayLeft()</code>, which moves both rows).</p>',
      code: sketch(`  Mission 06 extension: Scrolling answers
  Answers can be longer than 16 characters: long ones scroll
  across the bottom row like a news ticker.`, [TOP,
      `// NEW: some longer answers (more than 16 characters scroll)
String answers[] = {
  "Yes!", "No way", "Ask again later", "Without a doubt",
  "Not today", "Signs say yes", "Very doubtful", "Try a pizza",
  "The stars say yes, but the moon is not so sure",
  "Ask your teacher... they know everything",
};
const int NUM_ANSWERS = 10;`, MODES, STATE, SETUP, loopFn(SHAKE), TITLE,
      `void tellFortune() {
  lcd.clear();
  lcd.print("Thinking");
  for (int i = 0; i < 3; i++) {   // three dots, one every 0.4 s
    delay(400);
    lcd.print(".");
  }
  delay(400);
  int pick = random(NUM_ANSWERS);
  lcd.clear();
  lcd.print("The box says:");
  showAnswer(answers[pick]);      // NEW: shows it, scrolling if it's too long
}

// NEW: shows an answer on the bottom row, scrolling it if it's longer than 16 characters
void showAnswer(String answer) {
  lcd.setCursor(0, 1);
  lcd.print(answer.substring(0, 16));      // the first 16 characters (or all of it, if shorter)
  if (answer.length() <= 16) {
    return;                                // it fits: nothing more to do
  }
  delay(1000);                             // let people start reading

  int extra = answer.length() - 16;        // how many letters don't fit
  for (int i = 1; i <= extra; i++) {       // slide along one letter at a time
    lcd.setCursor(0, 1);
    lcd.print(answer.substring(i, i + 16));   // the 16 letters starting at position i
    delay(300);                            // scroll speed: smaller = faster
  }
}`, SWITCH, THERM]) },

    'Custom characters': { name: 'fortune_custom_chars',
      note: '<p><b>The idea:</b> each character on the LCD is a grid of 5 × 8 tiny dots. You can design up to 8 of your own. Each one is an array of 8 numbers, one per row, written in <b>binary</b>: <code>B01110</code> means dot off, on, on, on, off. Draw it on squared paper first!</p><p><code>lcd.createChar(0, eye)</code> saves the eye as character number 0 (in setup). Then <code>lcd.write(byte(0))</code> prints it, just like a letter.</p><p>The Virtual UNO doesn’t draw custom characters, so test this one on your real LCD.</p>',
      code: sketch(`  Mission 06 extension: Custom characters
  Three home-made 5 x 8 pixel symbols (an eye, a star and a skull)
  appear around the answer.`, [TOP, ANSWERS, MODES, STATE,
      `// NEW: our symbols. Each row is 5 dots: 1 = dot on, 0 = dot off.
byte eye[8] = {
  B00000,
  B01110,
  B10001,
  B10101,
  B10001,
  B01110,
  B00000,
  B00000
};
byte star[8] = {
  B00100,
  B00100,
  B11111,
  B01110,
  B01010,
  B10001,
  B00000,
  B00000
};
byte skull[8] = {
  B01110,
  B11111,
  B10101,
  B11111,
  B01110,
  B01010,
  B00000,
  B00000
};`,
      `void setup() {
  lcd.begin(16, 2);
  lcd.createChar(0, eye);      // NEW: save the eye as character 0
  lcd.createChar(1, star);     //      the star as character 1
  lcd.createChar(2, skull);    //      and the skull as character 2
  pinMode(TILT, INPUT_PULLUP);
  randomSeed(analogRead(A1));
  titleScreen();
  lastReading = digitalRead(TILT);
}`, loopFn(SHAKE),
      `void titleScreen() {
  lcd.clear();
  lcd.write(byte(0));          // NEW: an eye at each end of the title
  lcd.print(" MAGIC  BOX ");
  lcd.write(byte(0));
  lcd.setCursor(0, 1);
  lcd.print("Shake to ask...");
}`,
      `void tellFortune() {
  lcd.clear();
  lcd.print("Thinking");
  for (int i = 0; i < 3; i++) {   // three dots, one every 0.4 s
    delay(400);
    lcd.print(".");
  }
  delay(400);
  int pick = random(NUM_ANSWERS);
  lcd.clear();
  lcd.print("The box says:");

  // NEW: a symbol in the top-right corner. Good answers get a star,
  // bad ones a skull, the rest an eye. (Answers 0, 3 and 5 are the "yes" ones.)
  lcd.setCursor(15, 0);
  if (pick == 0 || pick == 3 || pick == 5) {
    lcd.write(byte(1));           // star
  } else if (pick == 1 || pick == 4 || pick == 6) {
    lcd.write(byte(2));           // skull
  } else {
    lcd.write(byte(0));           // eye
  }

  lcd.setCursor(0, 1);
  lcd.print(answers[pick]);
}`, SWITCH, THERM]) },

    'Dice mode': { name: 'fortune_dice',
      note: '<p><b>The idea:</b> a third mode. A new constant <code>DICE = 2</code> names it, and <code>switchMode()</code> now goes round in a circle: FORTUNE → THERMO → DICE → FORTUNE.</p><p>When the box is shaken, an <code>if / else if</code> picks what to do for the current mode. <code>random(1, 7)</code> gives a whole number from 1 to 6 — the 7 is <b>not</b> included, which catches a lot of people out! A quick “rolling” animation flashes random numbers before the real roll.</p>',
      code: sketch(`  Mission 06 extension: Dice mode
  A third mode: a dice roller. Shake to roll two dice; the screen
  shows both numbers and the total.
  Hold the box tipped for 2 seconds to go FORTUNE -> THERMO -> DICE -> FORTUNE.`, [TOP, ANSWERS,
      `// the three modes
const int FORTUNE = 0;
const int THERMO = 1;
const int DICE = 2;              // NEW
int mode = FORTUNE;`, STATE, SETUP, loopFn(`    if (millis() - tipStart > 30) {    // a real shake, not a tiny bounce
      if (mode == FORTUNE) {
        tellFortune();
      } else if (mode == DICE) {       // NEW: in dice mode, a shake rolls the dice
        rollDice();
      }
    }`), TITLE,
      `void tellFortune() {
  lcd.clear();
  lcd.print("Thinking");
  for (int i = 0; i < 3; i++) {   // three dots, one every 0.4 s
    delay(400);
    lcd.print(".");
  }
  delay(400);
  int pick = random(NUM_ANSWERS);
  lcd.clear();
  lcd.print("The box says:");
  lcd.setCursor(0, 1);
  lcd.print(answers[pick]);
}

// NEW: rolls two dice and shows them
void rollDice() {
  // a little "rolling" animation: flash random numbers 8 times
  for (int i = 0; i < 8; i++) {
    lcd.setCursor(0, 0);
    lcd.print("Rolling: ");
    lcd.print(random(1, 7));
    lcd.print(" ");
    lcd.print(random(1, 7));
    lcd.print("   ");
    delay(80);
  }

  int die1 = random(1, 7);        // 1 to 6 (the 7 is NOT included)
  int die2 = random(1, 7);
  lcd.clear();
  lcd.print("Dice: ");
  lcd.print(die1);
  lcd.print(" + ");
  lcd.print(die2);
  lcd.setCursor(0, 1);
  lcd.print("Total: ");
  lcd.print(die1 + die2);
  if (die1 == die2) {
    lcd.print(" DOUBLE!");        // doubles get a mention
  }
}`,
      `// NEW: three modes, in a circle
void switchMode() {
  if (mode == FORTUNE) {
    mode = THERMO;
    lcd.clear();
    lcd.print("Thermometer");
  } else if (mode == THERMO) {
    mode = DICE;
    lcd.clear();
    lcd.print("Dice roller");
    lcd.setCursor(0, 1);
    lcd.print("Shake to roll!");
  } else {
    mode = FORTUNE;
    titleScreen();
  }
}`, THERM]) },

    'Mood lighting': { name: 'fortune_mood_light',
      note: '<p><b>Wiring:</b> an LED (purple or blue looks great) with its 220 Ω resistor: long leg → resistor → <b>pin 6</b>, short leg → GND. Put it inside the box, behind the screen or under a paper “crystal ball”.</p><p><b>The idea:</b> pin 6 can fade with <code>analogWrite()</code> (it has a ~ next to it on the UNO). While the box is “thinking”, the LED glows brighter and brighter; when the answer appears it does a quick flash, then fades back down to a dim glow.</p>',
      code: sketch(`  Mission 06 extension: Mood lighting
  An LED inside the box glows brighter while the box is "thinking",
  flashes when the answer appears, then fades back to a dim glow.`, [TOP,
      `const int MOOD_LED = 6;                   // NEW: LED + 220 ohm resistor (pin 6 can fade)
const int DIM = 10;                       // NEW: the resting glow (0 = off, 255 = full)`, ANSWERS, MODES, STATE,
      `void setup() {
  lcd.begin(16, 2);
  pinMode(TILT, INPUT_PULLUP);
  pinMode(MOOD_LED, OUTPUT);
  analogWrite(MOOD_LED, DIM);    // NEW: start with a dim glow
  randomSeed(analogRead(A1));
  titleScreen();
  lastReading = digitalRead(TILT);
}`, loopFn(SHAKE), TITLE,
      `void tellFortune() {
  lcd.clear();
  lcd.print("Thinking");

  // NEW: the light glows up from dim to full while the dots appear.
  // 3 dots x 40 steps x 10 ms = 1.2 seconds, the same as the mission's dots.
  int glow = DIM;
  for (int i = 0; i < 3; i++) {
    for (int step = 0; step < 40; step++) {
      glow = glow + 2;                     // a little brighter each step
      if (glow > 255) glow = 255;
      analogWrite(MOOD_LED, glow);
      delay(10);
    }
    lcd.print(".");
  }
  delay(400);

  int pick = random(NUM_ANSWERS);
  lcd.clear();
  lcd.print("The box says:");
  lcd.setCursor(0, 1);
  lcd.print(answers[pick]);

  // NEW: flash twice, then fade back down to the dim glow
  for (int i = 0; i < 2; i++) {
    analogWrite(MOOD_LED, 0);
    delay(80);
    analogWrite(MOOD_LED, 255);
    delay(80);
  }
  for (int b = 255; b >= DIM; b = b - 5) {
    analogWrite(MOOD_LED, b);
    delay(15);
  }
}`, SWITCH, THERM]) }
  };
})(window);
