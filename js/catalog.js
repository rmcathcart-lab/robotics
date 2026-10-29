/* The course: units and missions. A mission with `ready: true` has a guide in js/missions/<id>.js; the others show
 * on the home page as "In development" so students can see what's coming. `days` is the default number of class
 * days a mission gets on the class calendar (the teacher changes it per class in the dashboard's Calendar tab).
 * `criteria` are the rows the teacher grades on (each on the 5-level scale in RL.LEVELS). */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};

  RL.LEVELS = [
    { id: 'NM', name: 'Not meeting' },
    { id: 'BEG', name: 'Beginning' },
    { id: 'PRG', name: 'Progressing' },
    { id: 'ADV', name: 'Advancing' },
    { id: 'MAS', name: 'Mastery' }
  ];

  RL.UNITS = [
    { n: 1, title: 'Design & 3D modeling', blurb: 'Design thinking, Fusion 360 and your first 3D print.', soon: true, missions: [] },
    { n: 2, title: 'Arduino: sense, think, act', blurb: 'Wire real circuits, write code, and make things that react to the world.',
      missions: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09'] }
  ];

  RL.MISSIONS = {
    m01: {
      id: 'm01', unit: 2, num: '01', title: 'Crosswalk signal', days: 3, ready: true, level: 1,
      tagline: 'Build a working traffic light with a push-to-cross button, inside a cardboard housing you design.',
      discover: ['Voltage, current & resistance', 'Breadboards', 'LEDs & resistors', 'Your first program', 'Digital input & output', 'if / else'],
      parts: ['UNO R3 + USB cable', 'Breadboard', 'Red, yellow, green & white LEDs', '220 Ω resistors ×4', '10 kΩ resistor', 'Push button', 'Jumper wires'],
      extras: ['Cardboard', 'Popsicle stick', 'Hot glue', 'Markers'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'Wired correctly and neatly; every LED has its resistor; the button uses a pull-down.' },
        { id: 'code', name: 'Code', desc: 'The full crosswalk cycle works from the button, with readable names and comments.' },
        { id: 'design', name: 'Housing & testing', desc: 'A finished housing that makes the signal readable; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Uses voltage, current, resistance and digital input/output to explain how it works.' }
      ]
    },
    m02: {
      id: 'm02', unit: 2, num: '02', title: 'Mood lamp', days: 2, ready: true, level: 2,
      tagline: 'Mix any colour with an RGB LED, dial it in with a knob, and make it glow brighter as the room gets dark.',
      discover: ['Analog vs digital', 'PWM & analogWrite()', 'Colour mixing', 'Potentiometers & voltage dividers', 'Photoresistors', 'The Serial Monitor', 'map()'],
      parts: ['RGB LED', 'Potentiometer', 'Photoresistor', '220 Ω resistors ×3', '10 kΩ resistor', 'Jumper wires'], extras: ['Paper, tissue or a frosted cup (lampshade)', 'Tape'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'RGB LED on three PWM pins with resistors; knob and light sensor wired as voltage dividers to analog pins.' },
        { id: 'code', name: 'Code', desc: 'Reads both sensors, uses map() and analogWrite() to control colour and brightness, prints values to the Serial Monitor.' },
        { id: 'design', name: 'Lamp & testing', desc: 'A lampshade that blends the colours; tested in light and dark and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains PWM, analog input (0–1023) and how the light sensor changes the voltage.' }
      ]
    },
    m03: {
      id: 'm03', unit: 2, num: '03', title: 'Arcade synth', days: 2, ready: true, level: 2,
      tagline: 'Turn a joystick and buttons into a playable synth, then program it to play a tune you choose.',
      discover: ['Sound waves & frequency', 'Active vs passive buzzers', 'tone()', 'Arrays', 'INPUT_PULLUP', 'Analog joystick input'],
      parts: ['Passive buzzer', 'Active buzzer', 'Joystick module', 'Push buttons ×4', 'Jumper wires', 'Female-to-male wires'], extras: ['Cardboard (controller case)', 'Hot glue', 'Markers'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'Buzzers, note buttons (INPUT_PULLUP) and the joystick wired correctly.' },
        { id: 'code', name: 'Code', desc: 'Plays a melody from arrays and turns button presses and joystick moves into notes.' },
        { id: 'design', name: 'Controller & testing', desc: 'A playable cardboard controller; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains frequency and pitch, and how the code turns inputs into sounds.' }
      ]
    },
    m04: {
      id: 'm04', unit: 2, num: '04', title: 'Weather gauge', days: 2, ready: true, level: 3,
      tagline: 'Read temperature and humidity, then swing a servo needle across a dial you design.',
      discover: ['Sensors & libraries', 'Temperature & humidity', 'Servo motors', 'Mapping a range', 'Thermistors', 'Averaging readings'],
      parts: ['DHT11 sensor module', 'SG90 servo', 'Thermistor', '10 kΩ resistor', 'Jumper wires', 'Female-to-male wires'], extras: ['Cardboard (dial)', 'Popsicle stick (needle)', 'Hot glue', 'Markers'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'DHT11, servo and thermistor wired correctly to the right pins and power.' },
        { id: 'code', name: 'Code', desc: 'Uses the DHT library, maps temperature to an angle, moves the servo smoothly and prints readings.' },
        { id: 'design', name: 'Dial & testing', desc: 'A labelled, calibrated dial that reads accurately; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains how the sensors measure, how the servo knows its angle, and what map() does.' }
      ]
    },
    m05: {
      id: 'm05', unit: 2, num: '05', title: 'Parking assistant', days: 2, ready: true, level: 3,
      tagline: 'Measure distance with sound and beep faster and faster as something gets closer, like a real car.',
      discover: ['Echolocation', 'The speed of sound', 'pulseIn()', 'Functions that return values', 'millis() timing'],
      parts: ['HC-SR04 ultrasonic sensor', 'Active buzzer', 'Green, yellow & red LEDs', '220 Ω resistors ×3', 'Jumper wires', 'Female-to-male wires'], extras: ['Cardboard (garage wall)', 'A toy car or small box', 'Tape'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'Sensor, buzzer and LED bar wired correctly.' },
        { id: 'code', name: 'Code', desc: 'Measures distance in cm, shows zones with LEDs and beeps faster as things get closer without freezing the program.' },
        { id: 'design', name: 'Garage & testing', desc: 'A test setup with measured stopping distances; accuracy tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Uses the speed of sound to explain how the sensor measures distance.' }
      ]
    },
    m06: {
      id: 'm06', unit: 2, num: '06', title: 'Fortune teller', days: 2, ready: true, level: 3,
      tagline: 'Shake it, and an LCD screen answers your question. Then add a live thermometer readout.',
      discover: ['LCD displays', 'Tilt switches', 'random()', 'Arrays of text', 'switch / case', 'Detecting a change'],
      parts: ['LCD1602 display', 'Potentiometer', 'Tilt ball switch', 'Thermistor', '10 kΩ resistor', '220 Ω resistor', 'Jumper wires'], extras: ['Small cardboard box', 'Hot glue', 'Markers'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'LCD (with contrast knob), tilt switch and thermistor wired correctly.' },
        { id: 'code', name: 'Code', desc: 'Detects a shake, picks a random answer with switch/case or an array, and shows a temperature mode.' },
        { id: 'design', name: 'Case & testing', desc: 'A finished case that hides the wiring and shows the screen; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains how the tilt switch works, how random() picks answers and how the LCD gets its text.' }
      ]
    },
    m07: {
      id: 'm07', unit: 2, num: '07', title: 'Remote turntable', days: 2, ready: true, level: 4,
      tagline: 'Build a display stand that spins to exact angles when you press buttons on an IR remote.',
      discover: ['Infrared signals', 'Libraries & codes', 'Stepper motors', 'Motor drivers', 'External power', 'Keeping track of position'],
      parts: ['IR receiver + remote', 'Stepper motor + ULN2003 driver', 'Power supply module + 9V battery', 'Jumper wires', 'Female-to-male wires'], extras: ['Cardboard circle (turntable)', 'Hot glue', 'Double-sided tape'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'IR receiver, stepper driver and external power wired correctly with a shared ground.' },
        { id: 'code', name: 'Code', desc: 'Reads remote codes with switch/case, turns exact angles and keeps track of the turntable’s position.' },
        { id: 'design', name: 'Turntable & testing', desc: 'A turntable that spins smoothly and stops where it should; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains how the remote sends codes and how the stepper moves in exact steps.' }
      ]
    },
    m08: {
      id: 'm08', unit: 2, num: '08', title: 'Smart fan', days: 2, ready: true, level: 4,
      tagline: 'Drive a DC motor with an H-bridge, control speed and direction, and switch it on automatically when it gets warm.',
      discover: ['DC motors', 'H-bridges (L293D)', 'PWM speed control', 'Relays', 'Why motors need their own power', 'Thermostat logic'],
      parts: ['DC motor + fan blade', 'L293D chip', 'Relay module', 'Power supply module + 9V battery', 'DHT11 sensor module', 'Potentiometer', 'Jumper wires'], extras: ['Cardboard (fan stand)', 'Hot glue', 'Popsicle sticks'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'Motor powered through the L293D from the power module, with a shared ground; relay and sensor wired correctly.' },
        { id: 'code', name: 'Code', desc: 'Controls speed and direction, and switches on automatically above a set temperature without flickering on and off.' },
        { id: 'design', name: 'Fan & testing', desc: 'A safe, sturdy fan stand; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains why the motor needs a driver and its own power, and how the H-bridge changes direction.' }
      ]
    },
    m09: {
      id: 'm09', unit: 2, num: '09', title: 'Reaction timer', days: 3, ready: true, level: 5,
      tagline: 'Build a two-player reaction game with an LED countdown bar and a four-digit score display.',
      discover: ['Binary', 'Shift registers (74HC595)', '7-segment displays', 'Multiplexing', 'Timing with millis()', 'Game logic'],
      parts: ['74HC595 chip', '8 LEDs + 220 Ω resistors', '4-digit 7-segment display', 'Push buttons ×2', 'Active buzzer', 'Jumper wires'], extras: ['Cardboard (game board)', 'Hot glue', 'Markers'],
      criteria: [
        { id: 'build', name: 'Circuit', desc: 'Shift register, LED bar and 4-digit display wired correctly and neatly.' },
        { id: 'code', name: 'Code', desc: 'Runs a fair game: random wait, catches early presses, times reactions with millis() and shows the result.' },
        { id: 'design', name: 'Game & testing', desc: 'A finished game board people can play; tested and improved.' },
        { id: 'explain', name: 'Explain it', desc: 'Explains how 3 pins control 8 outputs and how 4 digits share the same wires.' }
      ]
    }
  };

  /* Extra materials the teacher may need to order (Equipment tab → "Email Carla for orders").
   * per: 'group' (multiplied by the number of groups) or 'class' (one per class). link: an amazon.ca search. */
  function az(q) { return 'https://www.amazon.ca/s?k=' + encodeURIComponent(q); }
  RL.ORDERS = {
    m01: [
      { item: 'Mini hot glue sticks (100 pack)', per: 'class', qty: 1, link: az('mini hot glue sticks 100 pack') },
      { item: 'Jumbo craft sticks (popsicle sticks)', per: 'class', qty: 1, link: az('jumbo craft sticks 100') },
      { item: 'Corrugated cardboard sheets', per: 'class', qty: 1, link: az('corrugated cardboard sheets 12x12') }
    ],
    m02: [
      { item: 'Frosted plastic cups (lampshades)', per: 'class', qty: 1, link: az('frosted plastic cups 50 pack') },
      { item: 'Vellum / tracing paper', per: 'class', qty: 1, link: az('vellum paper 8.5 x 11') }
    ],
    m03: [
      { item: 'Female-to-male jumper wires (spares)', per: 'class', qty: 1, link: az('female to male dupont jumper wires 120') },
      { item: 'Mini hot glue sticks (100 pack)', per: 'class', qty: 1, link: az('mini hot glue sticks 100 pack') }
    ],
    m04: [
      { item: 'Jumbo craft sticks (needles)', per: 'class', qty: 1, link: az('jumbo craft sticks 100') },
      { item: 'Brass paper fasteners', per: 'class', qty: 1, link: az('brass paper fasteners') },
      { item: 'DHT11 sensor modules, spares (optional)', per: 'class', qty: 1, link: az('DHT11 temperature humidity sensor module') }
    ],
    m05: [
      { item: 'Small toy cars (test vehicles)', per: 'class', qty: 1, link: az('pull back toy cars pack') },
      { item: 'Masking tape', per: 'class', qty: 2, link: az('masking tape 6 pack') },
      { item: 'Measuring tapes (multi-pack)', per: 'class', qty: 1, link: az('measuring tape metric 3m pack') }
    ],
    m06: [
      { item: 'Small kraft gift boxes (cases)', per: 'group', qty: 1, link: az('small kraft boxes 4x4x2') }
    ],
    m07: [
      { item: '9V batteries, 12-pack (spares: the kit comes with one)', per: 'class', qty: 1, link: az('9V batteries 12 pack') },
      { item: 'Cardboard cake circles (turntables)', per: 'class', qty: 1, link: az('cardboard cake circles 8 inch') },
      { item: 'Double-sided foam tape', per: 'class', qty: 1, link: az('double sided foam mounting tape') }
    ],
    m08: [
      { item: '9V batteries, 12-pack (spares: the kit comes with one)', per: 'class', qty: 1, link: az('9V batteries 12 pack') },
      { item: 'Mini hot glue sticks (100 pack)', per: 'class', qty: 1, link: az('mini hot glue sticks 100 pack') }
    ],
    m09: [
      { item: 'Female-to-male jumper wires, 40-pack (the display needs about 14)', per: 'group', qty: 1, link: az('dupont jumper wires female to male 40 pin') },
      { item: 'Large arcade-style push buttons (optional)', per: 'group', qty: 2, link: az('arcade push button 30mm') },
      { item: 'Corrugated cardboard sheets', per: 'class', qty: 1, link: az('corrugated cardboard sheets 12x12') }
    ]
  };

  RL.missionList = function () { var out = []; RL.UNITS.forEach(function (u) { u.missions.forEach(function (id) { if (RL.MISSIONS[id]) out.push(RL.MISSIONS[id]); }); }); return out; };
  RL.unitOf = function (id) { var m = RL.MISSIONS[id]; return m ? RL.UNITS.filter(function (u) { return u.n === m.unit; })[0] : null; };
  /* colour for each unit (calendar chips, unit headers) */
  RL.UNIT_COLOURS = { 1: '#8ea6bb', 2: '#22d3ee', 3: '#7dd3fc', 4: '#fcd34d', 5: '#93c5fd' };
  RL.unitColour = function (n) { return RL.UNIT_COLOURS[n] || '#22d3ee'; };
  RL.guides = {}; // filled by js/missions/*.js
})(window);
