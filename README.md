# Robotics Lab

Mr. Cathcart's robotics class site: https://rmcathcart-lab.github.io/robotics/

| Part | Where | Folder |
|---|---|---|
| **Student site** — sign in with the class code + a 4-digit PIN; home page with the next due mission, the class calendar and every unit's missions; self-paced mission guides; evidence upload | `/robotics/` | `index.html`, `js/`, `assets/` |
| **Teacher ledger** — Live (who's on and where), Submissions (view + grade), Progress, Calendar (mission lengths, days off), Equipment (extra materials + “Email Carla for orders”), Roster | `/robotics/teacher/` | `teacher/` |
| **Backend** — Google Apps Script web app + the "Robotics Lab Records" spreadsheet + the "Robotics Lab Submissions" Drive folder | — | `backend/Code.gs` |

Uses the Robotics Lab design system (navy, cyan, signal orange; Chakra Petch / IBM Plex Sans / IBM Plex Mono).

## Files

| Path | What it is |
|---|---|
| `js/ns.js` | First script on every page: keeps browser storage under `rl/` so this site and the math sites (same web address) don't overwrite each other |
| `js/config.js` | The Apps Script web-app URL (`backend`). Empty = preview mode (no sign-in, progress on the device only) |
| `js/catalog.js` | Units and missions (title, default number of classes, parts, grading criteria). A mission with `ready: true` has a guide |
| `js/api.js` | Talking to the backend, including chunked uploads into Google Drive |
| `js/cal.js` | The class calendar: missions back to back, each `len` class days, due on its last day; the month view |
| `js/app.js` | The student site |
| `js/kit/board.js` | SVG UNO + breadboard + wires/LEDs/resistors (blue 5-band)/buttons, and the animated step-by-step **build guide** |
| `js/kit/parts.js` | Every other kit part: RGB LED, potentiometer, photoresistor, thermistor, tilt switch, buzzers, chips (74HC595, L293D), LCD1602, power module, servo, DHT11, HC-SR04, joystick, IR receiver, relay, stepper + driver, DC motor, 7-segment displays |
| `js/kit/sim.js` | The **Virtual UNO**: checks a sketch like the Arduino compiler (missing `;`, capital letters, braces, missing `#include`), translates it to JavaScript (with Arduino integer maths) and runs it on the drawn circuit — including Servo, LiquidCrystal, Stepper, DHT, IRremote, shiftOut/74HC595, pulseIn, tone, motors, relays and 7-segment multiplexing |
| `js/kit/code.js` | Arduino code colouring, code blocks (copy / download .ino) and line-by-line code walkthroughs |
| `js/kit/ui.js` | Checkpoints, notes, explainer animations, hotspot diagrams, test checklists, challenge cards, kit checklist |
| `js/missions/m01.js` … `m09.js` | The nine Arduino missions (see `docs/MISSION_GUIDE.md` for how to write one) |
| `teacher/` | The teacher ledger |
| `backend/Code.gs` | Apps Script backend. `backend/mock_server.js` runs it locally with stand-ins for the Google services |
| `tests/` | `node tests/sim_test.js` (sketch checker/translator), `tests/run_e2e.sh` (whole flow against the mock), `node tests/steps.js` (screenshots of every step) |

## Adding a mission

Read `docs/MISSION_GUIDE.md` first.


1. Set `ready: true` (and `criteria`) for it in `js/catalog.js`.
2. Write `js/missions/mNN.js` with `RL.guides.mNN = { steps: [...], evidence: {...} }` (copy the shape of `m01.js`).
3. Add a `<script>` tag for it in `index.html` and `teacher/index.html`.

## Backend

`backend/Code.gs` runs as an Apps Script web app (Execute as: me · Who has access: Anyone). Run `setup()` once: it
creates the spreadsheet, the Drive folder and the teacher key (Project Settings → Script properties → `TEACHER_KEY`).
Put the web-app URL in `js/config.js`. After changing `Code.gs`, deploy a **new version of the same deployment** so
the URL stays the same.

Student uploads go to `Robotics Lab Submissions / <class> / <student>` in the teacher's Drive (photos are shrunk in the
browser first; videos up to 250 MB go up in 4 MB pieces).

## Equipment and orders

Extra materials per mission (with Amazon.ca search links) are in `RL.ORDERS` in `js/catalog.js`. The Equipment tab multiplies
per-group items by the number of groups, lets the teacher tick items and change quantities, and opens an email to
Carla (cmutch@rockyview.ab.ca) with the list.
