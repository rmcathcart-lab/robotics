# Writing a mission guide

Every mission is one file, `js/missions/mNN.js`, that registers `RL.guides.mNN = { steps, evidence }`.
**Read `js/missions/m01.js` first** — it is the reference for tone, depth, structure and code style. New missions should
feel like the same book: same voice, same kinds of interactive pieces, same quality.

## The course and the students

- High school robotics class (grades 9–12), Mr. Cathcart, Room 2997. Students work through missions self-paced over
  2–3 class periods (~85 min each), usually in pairs, on laptops (some may be Chromebooks).
- Kit: **ELEGOO Super Starter Kit for UNO R3** (not the official Arduino kit). Its resistors are **blue, 5-band** metal-film
  (describe bands like `red-red-black-black-brown` for 220 Ω; use `RL.resistorName(ohms)`). Its LEDs have a **round rim
  — no flat side** (the long leg = anode is the clue). The ELEGOO tutorial texts and example code are in `/home/claude/elegoo/`
  (useful for component facts and pinouts; our guides are much better than them — project-based, theory explained).
- Extra materials available: cardboard, paper, popsicle sticks, hot glue, tape, markers. Each mission ends in a build
  that makes the circuit into a real object (a lamp, a controller, a gauge…).
- Missions build on each other: by Mission 02 students know breadboards, LEDs, resistors, Ohm's law, digitalWrite/Read,
  pull-down resistors, if/else, for loops, constants, the Arduino IDE and the Virtual UNO. Don't re-teach those; do
  re-use them and mention when a new idea contrasts with an old one (e.g. INPUT_PULLUP vs the M01 pull-down).

## Voice (Robotics Lab design system)

- Talk to students as engineers on a team: second person, present tense, short imperative sentences. "Wire the sensor to pin 7."
- Sentence case headings. No emoji. Canadian/British spelling is fine where it appears (colour, centre) — match m01.
- Explain the *why* with real science: what's physically happening, with numbers where it helps.
- Safety callouts (`UI.callout(b, 'safety', 'Safety', …)`) only where real (motors, hot glue, cutting, 9V power, shorts).
- Colours inside drawings: navy backgrounds (`#070d17`), cyan `#22d3ee` for the thing being explained, signal orange
  `#ff8a3d` only for warnings, green `#4ade80` only for PASS/good. Ink `#e6f1fa`, muted `#8ea6bb`, grid `#22364f`.
  Fonts: `IBM Plex Mono` for labels in SVG (uppercase + letter-spacing for labels), `IBM Plex Sans` for prose in SVG.

## Structure of a mission (about 9–12 steps)

1. **Mission brief** — lead paragraph (what you'll build and why it matters in the real world), `UI.edp(left, [...])`,
   meta panel (time, level, discover, parts, extras — copy m01's brief), an animated **preview** of the finished project
   (UI.explainer with one auto-looping frame), any safety callout.
2. **Theory steps** with animated explainers (`UI.explainer`, several frames each, captions do the teaching) and
   interactive labs (sliders/pills that change a drawing live, like m01's resistor lab), then 1–3 checkpoints
   (`UI.mcq` / `UI.numq`) each.
3. **Build steps** with `RL.Board.guide` (animated, step-by-step, zooms to each new part, rings show holes). Every
   build guide must be electrically correct and match the code's pin numbers exactly.
4. **Code steps**: `RL.Code.walk` line-by-line walkthroughs, then `RL.Sim.create` Virtual UNO with a `check` function.
   Use "your turn" templates where students write part of the code (with a hint `<details>`), like m01 step 09.
   Then tell them to upload to the real board, plus a troubleshooting list.
5. **Build the object** (cardboard etc.) with an illustrated/animated explainer of the build, design ideas, a
   `UI.note` for a design decision.
6. **Test & improve**: `UI.tests` PASS/RETRY rows, `UI.challenges` (3–5 extension challenges, with hints), a `UI.note`.
7. Last step: `{ id: 'submit', title: 'Hand in your evidence', submit: true }` and an `evidence` object (photos,
   video, code + 3–4 reflection questions that make students explain the science and the code). Copy m01's shape.

Each step: `{ id, title, stage?: '05 Create' etc., time: '20 min', render: function (b, ctx) {…} }`. Times should add up to
roughly the mission's class count × ~80 min. Step ids are stable keys for progress — short, lowercase.

## APIs

- `RL.UI`: `html(container, html)`, `callout(c, kind ''|'safety'|'plain', label, html)`, `edp(c, [stages])`,
  `mcq(c, ctx, {id:'q-…', q, options, answer, explain, hints})`, `numq(c, ctx, {id, q, answer, tol, unit, explain, hint})`,
  `note(c, ctx, {id:'n-…', label, placeholder})`, `explainer(c, {label, title, w, h, init(svg,S,st), frames:[{cap, draw(svg,S,st)}], interactive})`,
  `hotspots(c, {title, svg, spots:[{id,x,y,title,html}], ctx, key})`, `tests(c, ctx, {id, rows})`, `challenges(c, list)`,
  `gear(c, ctx, key, items)`. In explainers: `st.later(fn, ms)` for timers (auto-cleared), set `st.stop` to cancel RAF loops.
  Checkpoint ids start `q-`, notes `n-` (the teacher sees notes in grading — labels map in teacher/dash.js only for m01, that's fine).
- `RL.Board.el(tag, attrs, parent)` makes SVG elements (m01 aliases it as `S`). `RL.drawResistorBody(g, ohms, len, h)`
  draws the kit's blue 5-band resistor centred on 0,0 (rotate the group for vertical).
- `RL.Board.guide(container, { title, parts, base, steps:[{title, html, add, remove, lit, view}], vb })` and
  `RL.Board.render({ parts, show, view, vb, uno, bb, hover })`.
- `RL.Sim.create(container, {...})` — see the big comment at the top of `js/kit/sim.js` for every device option
  (leds, buttons, analog, rgb, buzzers, servos, lcd, dht, sonar, joystick, ir, stepper, motor, relays, shift, seg4,
  serialInput) and the `check(log, sim)` API (`sim.press`, `sim.setAnalog`, `sim.setDistance`, `sim.setTemp`, `sim.ir`,
  `sim.state()`, `sim.serialText()`, `sim.wait(ms)`). Supported libraries: Servo, LiquidCrystal, Stepper, DHT
  (Adafruit "DHT sensor library": `DHT dht(2, DHT11); dht.begin(); dht.readTemperature(); dht.readHumidity();`), IRremote 4.x
  (`#include <IRremote.hpp>`, `IrReceiver.begin(pin, ENABLE_LED_FEEDBACK)`, `IrReceiver.decode()`, `IrReceiver.decodedIRData.command`,
  `IrReceiver.resume()`; ELEGOO remote command codes are in `RL.REMOTE`). Integer maths works like Arduino (7/2 = 3).
  Code must also compile on a real UNO — only use real Arduino APIs. Tell students how to install any library
  (Arduino IDE: Sketch → Include Library → Manage Libraries…, search, Install).

### Breadboard geometry and parts (`js/kit/board.js`, `js/kit/parts.js`)

- Breadboard is vertical, rows 1–30 top to bottom, columns `a–e` | centre gap | `f–j`, rails `L+ L- R- R+` (e.g. `L+5`).
  A row's a–e are connected; f–j are connected; the gap separates them. Rails run the full length.
- UNO is to the left; its digital header (`D0…D13`, `GNDd`) faces the breadboard; `5V`, `3V3`, `GND`, `GND2`, `VIN`,
  `A0…A5` are on the far (left) edge, so wires from them need `via` points around the top or bottom of the UNO
  (see m01 `POWER.p5v`: `via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]]`). Analog-pin wires usually route
  around the bottom of the UNO, e.g. `via: [[8, 380], [10, 490], [200, 492], [380, …]]` — check the screenshot.
- Copy m01's `POWER` parts (5V → L+2, GND → L-4, rail bridges at rows 28–30).
- Breadboard parts: `wire {from,to,color,via}`, `res {from,to,ohms}`, `led {a,k,color,label}`, `button {at:'e23'}` (legs
  e/f of rows r and r+2; pressing joins row r and r+2), `rgb {at:'h5'}` (legs R, −, G, B in rows 5–8 of that column),
  `pot {at:'c9'}` (legs in rows 9, 11, 13: L, wiper, R), `ldr/therm/tilt {from,to}`, `buzzer {a:'+ hole', k:'− hole', variant:'active'|'passive'}`,
  `chip {at:'e10', pins:16, label, pinNames}` (pin 1 at e10 going down column e, pin 9–16 back up column f),
  `lcd {at:'j3'}` (pins 1–16 down column j, screen drawn beside the board), `psu` (power module on the top end).
- Modules beside the board need `vb: RL.Board.WIDE` and `at: [x, y]` with x ≥ 740; wires go to `'partId.PIN'`:
  `servo` (GND,V,S), `dht` (S,V,G), `sonar` (VCC,TRIG,ECHO,GND), `joystick` (GND,V,X,Y,SW), `ir` (S,V,G),
  `relay` (S,V,G + NO,COM,NC on its right side), `stepper` (IN1–IN4,GND,VCC; motor drawn above the driver),
  `dcmotor` (A,B), `seg1` / `seg4` (pins by number '1'…'12' or by function 'A'…'G','DP','D1'…'D4').
- Parts expose setters used by the sim; you rarely call them directly except in explainers.
- For a Virtual UNO, crop the board with `view: [x, y, w, h]` (m01 uses `[236, 30, 480, 450]` for the breadboard;
  with modules use something like `[236, 20, 760, 560]` inside a WIDE vb).
- Need a part that doesn't exist? Register it inside your own mission file with `RL.Board.part('mNN-name', {...})`.

## Rules for parallel work

- **Only create/edit your own mission files** (`js/missions/mNN.js`, and test scripts named `tests/mNN_*.js`). Do NOT
  edit shared files (kit, app, css, catalog, index.html — the script tags already exist). If a shared file has a bug or
  a missing feature you need, work around it in your file and report it clearly in your final message.
- Catalog entries (title, days, parts, criteria) already exist in `js/catalog.js`; your evidence step uses them.

## Testing (do all of this before you finish)

- Local server: `http://localhost:8765/` serves the repo (start it with `cd /home/claude/robotics && python3 -m http.server 8765 &`
  if `curl -s localhost:8765 >/dev/null` fails).
- `node --check js/missions/mNN.js`.
- Screenshots of every step: `M=mNN node tests/steps.js 1 <stepCount> 1280` → `tests/out/mNN-stepNN-1280.png`
  Look at every screenshot and fix
  layout problems, overlapping labels, wrong wiring, empty explainers.
- Click through every build guide to the last step and screenshot it (see `tests/interact.js` for the pattern), check
  every wire lands on the intended hole/pin and matches the code.
- Run every Virtual UNO's "Check my code" in Playwright and confirm PASS with the provided code, and RETRY with a
  broken version. Run the "your turn" template completed with the hint's answer. Check the Serial Monitor output looks right.
- Make sure no console errors (`page.on('pageerror')`).
