/* Solutions for the Mission 07 (Remote turntable) extension challenges, keyed by challenge title. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}; RL.SOLUTIONS = RL.SOLUTIONS || {};

  var TOP = `#include <IRremote.hpp>
#include <Stepper.h>

const int IR_PIN = 2;
const int STEPS_PER_REV = 2048;
const int STEPS_45 = STEPS_PER_REV / 8;
Stepper motor(STEPS_PER_REV, 8, 10, 9, 11);

long position = 0;     // where the turntable is, in steps from home (0 to 2047)`;
  var SETUP = `void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  motor.setSpeed(10);
  Serial.println("Turntable ready. Home is 0 degrees.");
}`;
  // the remote's buttons; "extra" adds cases, "full" replaces the >|| line
  function loopFn(extra, full, after) {
    return `void loop() {
  if (IrReceiver.decode()) {
    int code = IrReceiver.decodedIRData.command;
    IrReceiver.resume();
    switch (code) {
      case 0x43: turnBy(STEPS_45); break;       // >>|
      case 0x44: turnBy(-STEPS_45); break;      // |<<
      case 0x09: turnBy(8); break;              // up: nudge
      case 0x07: turnBy(-8); break;             // down: nudge back
` + (full || `      case 0x40: turnBy(STEPS_PER_REV); break;  // >||: a full turn`) + `
      case 0x16: goToAngle(0); break;           // 0 = home
      case 0x0C: goToAngle(45); break;          // 1
      case 0x18: goToAngle(90); break;          // 2
      case 0x5E: goToAngle(135); break;         // 3
      case 0x08: goToAngle(180); break;         // 4
      case 0x1C: goToAngle(225); break;         // 5
      case 0x5A: goToAngle(270); break;         // 6
      case 0x42: goToAngle(315); break;         // 7
      case 0x0D:                                // ST/REPT: this spot is home now
        position = 0;
        report();
        break;` + (extra ? '\n' + extra : '') + `
    }
  }` + (after ? '\n' + after : '') + `
}`;
  }
  var TURN = `// turn by some steps (+ = clockwise) and keep track of where we are
void turnBy(long steps) {
  motor.step(steps);
  position = position + steps;
  position = position % STEPS_PER_REV;                     // a full turn is back to the start...
  if (position < 0) position = position + STEPS_PER_REV;   // ...and keep it 0 to 2047
  report();
}`;
  var GOTO = `// turn to an angle measured from home, the short way round
void goToAngle(long angle) {
  long target = (angle * STEPS_PER_REV) / 360;              // degrees to steps
  long change = target - position;
  if (change > STEPS_PER_REV / 2) change = change - STEPS_PER_REV;    // over half a turn?
  if (change < -STEPS_PER_REV / 2) change = change + STEPS_PER_REV;   // go the other way
  turnBy(change);
}`;
  var REPORT = `void report() {
  long degrees = (position * 360) / STEPS_PER_REV;
  Serial.print("Position: ");
  Serial.print(degrees);
  Serial.println(" degrees");
}`;
  function sketch(head, parts) { return '\n/*\n' + head + '\n*/\n' + parts.join('\n\n'); }

  RL.SOLUTIONS.m07 = {

    'Slow display spin': { name: 'turntable_display_spin',
      note: '<p><b>The idea:</b> a <code>bool</code> called <code>spinning</code> remembers whether display mode is on. FUNC/STOP flips it with <code>spinning = !spinning</code> (<code>!</code> means “not”, so true becomes false and false becomes true).</p><p>The trick is to spin in <b>tiny pieces</b>. <code>motor.step(2048)</code> would take 6 seconds and the remote would be ignored all that time. So each time round loop() we only take 8 steps (about 1.4°, a few hundredths of a second), then go back and check the remote. Over and over, that looks like one smooth, slow spin.</p>',
      code: sketch(`  Mission 07 extension: Slow display spin
  FUNC/STOP starts a slow, continuous spin for showing off an object.
  Press it again to stop. All the other buttons still work.`, [TOP,
      `bool spinning = false;   // NEW: is display-spin mode on?`, SETUP,
      loopFn(`      case 0x47:                                // NEW: FUNC/STOP turns the display spin on or off
        spinning = !spinning;
        Serial.println(spinning ? "Display spin ON" : "Display spin OFF");
        if (!spinning) report();
        break;`, null, `
  // NEW: if display mode is on, turn a tiny bit, then go back round loop() to check the remote again
  if (spinning) {
    motor.step(8);                                         // 8 steps = about 1.4 degrees
    position = (position + 8) % STEPS_PER_REV;             // keep track, without printing every time
  }`), TURN, GOTO, REPORT]) },

    'Speed control': { name: 'turntable_speed',
      note: '<p><b>The idea:</b> the speed lives in a variable, <code>rpm</code> (revolutions per minute). VOL+ adds 1, VOL− takes 1 away. <code>constrain(rpm, 2, 15)</code> keeps it between 2 and 15: if it tries to go to 16, it’s pushed back to 15. (Above about 15 RPM the 28BYJ-48 motor starts skipping steps.) Then <code>motor.setSpeed(rpm)</code> tells the motor.</p>',
      code: sketch(`  Mission 07 extension: Speed control
  VOL+ and VOL- change the speed from 2 to 15 RPM.
  The Serial Monitor shows the new speed.`, [TOP,
      `int rpm = 10;            // NEW: the speed in revolutions per minute`,
      `void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  motor.setSpeed(rpm);                   // start at the speed in the variable
  Serial.println("Turntable ready. Home is 0 degrees.");
}`,
      loopFn(`      case 0x46:                                // NEW: VOL+ = faster
        changeSpeed(1);
        break;
      case 0x15:                                // NEW: VOL- = slower
        changeSpeed(-1);
        break;`), `// NEW: changes the speed by "amount" (+1 or -1), keeping it between 2 and 15 RPM
void changeSpeed(int amount) {
  rpm = rpm + amount;
  rpm = constrain(rpm, 2, 15);   // too low? make it 2. too high? make it 15.
  motor.setSpeed(rpm);
  Serial.print("Speed: ");
  Serial.print(rpm);
  Serial.println(" RPM");
}`, TURN, GOTO, REPORT]) },

    'Remember where it was': { name: 'turntable_eeprom',
      note: '<p><b>The idea:</b> normal variables are wiped when the power goes off. The UNO also has 1 KB of <b>EEPROM</b>: memory that keeps its contents with no power, like a tiny USB stick.</p><ul><li><code>EEPROM.put(0, position)</code> saves <code>position</code> at address 0 (the first spot in the EEPROM).</li><li><code>EEPROM.get(0, position)</code> in <code>setup()</code> reads it back when the UNO starts.</li></ul><p>A brand-new EEPROM is full of 255s, which reads as a nonsense position, so we check it’s between 0 and 2047 and use 0 if not.</p><p><b>Note:</b> each EEPROM spot survives about 100 000 saves — plenty for this, but don’t save inside a fast loop. In the Virtual UNO, the EEPROM is kept until you reload the page: move the turntable, press Stop, then Upload &amp; run again and it remembers.</p>',
      code: sketch(`  Mission 07 extension: Remember where it was
  The turntable saves its position in EEPROM (memory that survives
  being switched off), so it still knows its angle after a restart.`, ['#include <EEPROM.h>                 // NEW: the permanent memory\n' + TOP,
      `void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  motor.setSpeed(10);

  // NEW: read the saved position back from EEPROM address 0
  EEPROM.get(0, position);
  if (position < 0 || position >= STEPS_PER_REV) {
    position = 0;     // nothing sensible saved yet (a new EEPROM is full of 255s)
  }
  Serial.println("Turntable ready (position remembered from last time):");
  report();
}`,
      loopFn(null, null).replace(`        position = 0;
        report();`, `        position = 0;
        EEPROM.put(0, position);                // NEW: save the new home too
        report();`),
      `// turn by some steps (+ = clockwise) and keep track of where we are
void turnBy(long steps) {
  motor.step(steps);
  position = position + steps;
  position = position % STEPS_PER_REV;                     // a full turn is back to the start...
  if (position < 0) position = position + STEPS_PER_REV;   // ...and keep it 0 to 2047
  EEPROM.put(0, position);    // NEW: save the position after every move
  report();
}`, GOTO, REPORT]) },

    'Photo turntable timelapse': { name: 'turntable_timelapse',
      note: '<p><b>The idea:</b> ▶|| (0x40) used to do one full turn. Now it runs a <b>for loop 8 times</b>: turn 45°, then pause 3 seconds for a photo. 8 × 45° = 360°, so it ends up back where it started, with 8 photos taken from all the way round.</p><p>The L LED blinks at the start of each pause, so you know when the photo is being taken. Set your phone to <b>timelapse</b> or <b>interval</b> mode (or press the shutter on each blink), then stitch the photos into a spinning GIF.</p>',
      code: sketch(`  Mission 07 extension: Photo turntable timelapse
  >|| takes a set of 8 photos all the way round:
  turn 45 degrees, pause 3 seconds for a photo, 8 times.`, [TOP,
      `const int PHOTOS = 8;            // NEW: photos per turn (8 x 45 degrees = 360)
const int PAUSE_MS = 3000;       // NEW: how long to hold still for each photo`,
      `void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  motor.setSpeed(10);
  pinMode(LED_BUILTIN, OUTPUT);  // NEW: the L LED blinks for each photo
  Serial.println("Turntable ready. Home is 0 degrees.");
}`,
      loopFn(null, `      case 0x40: photoSet(); break;             // >||: NEW - a set of 8 photos`),
      `// NEW: turn 45 degrees, pause for a photo, 8 times
void photoSet() {
  Serial.println("Photo set: starting");
  for (int i = 0; i < PHOTOS; i++) {
    turnBy(STEPS_45);                   // turn to the next spot
    delay(500);                         // let the turntable stop wobbling
    digitalWrite(LED_BUILTIN, HIGH);    // blink: "take the photo now!"
    Serial.print("Photo ");
    Serial.print(i + 1);                // i starts at 0, but people count from 1
    Serial.print(" of ");
    Serial.println(PHOTOS);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(PAUSE_MS);                    // hold still while the photo is taken
  }
  Serial.println("Photo set: done");
}`, TURN, GOTO, REPORT]) },

    'Cool the motor': { name: 'turntable_cool',
      note: '<p><b>The idea:</b> after <code>motor.step()</code> finishes, the Stepper library leaves some of the four coils switched on, so the motor holds its position firmly — and keeps using power and getting warm. Writing LOW to all four driver pins (8, 9, 10, 11) switches the coils off.</p><p>A for loop does all four at once, using an array of the pin numbers. The motor holds less firmly afterwards, but a turntable doesn’t need much holding: its gearbox stops it slipping.</p>',
      code: sketch(`  Mission 07 extension: Cool the motor
  After every move, all four coils are switched off,
  so the motor doesn't sit there getting warm.`, [TOP,
      `const int COIL_PINS[4] = {8, 9, 10, 11};   // NEW: the ULN2003 driver's IN1 to IN4`, SETUP, loopFn(),
      `// turn by some steps (+ = clockwise) and keep track of where we are
void turnBy(long steps) {
  motor.step(steps);
  releaseMotor();             // NEW: switch the coils off after every move
  position = position + steps;
  position = position % STEPS_PER_REV;                     // a full turn is back to the start...
  if (position < 0) position = position + STEPS_PER_REV;   // ...and keep it 0 to 2047
  report();
}

// NEW: switches off all four coils (the motor stops using power and cools down)
void releaseMotor() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(COIL_PINS[i], LOW);
  }
}`, GOTO, REPORT]) }
  };
})(window);
