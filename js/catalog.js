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
      id: 'm02', unit: 2, num: '02', title: 'Mood lamp', days: 2, level: 2,
      tagline: 'Mix any colour with an RGB LED, dial it in with a knob, and make it glow brighter as the room gets dark.',
      discover: ['Analog vs digital', 'PWM & analogWrite()', 'Potentiometers', 'Photoresistors', 'The serial monitor', 'map()'],
      parts: ['RGB LED', 'Potentiometer', 'Photoresistor', 'Resistors'], extras: ['Paper or a frosted cup for a lampshade']
    },
    m03: {
      id: 'm03', unit: 2, num: '03', title: 'Arcade synth', days: 2, level: 2,
      tagline: 'Turn a joystick and buttons into a playable synth, then program it to play a tune you choose.',
      discover: ['Sound waves & frequency', 'tone()', 'Arrays', 'Analog joystick input', 'Active vs passive buzzers'],
      parts: ['Passive buzzer', 'Active buzzer', 'Joystick module', 'Push buttons'], extras: ['Cardboard for a controller case']
    },
    m04: {
      id: 'm04', unit: 2, num: '04', title: 'Weather gauge', days: 2, level: 3,
      tagline: 'Read temperature and humidity, then swing a servo needle across a dial you design.',
      discover: ['Sensors & libraries', 'Servo motors', 'Mapping a range', 'Temperature & humidity'],
      parts: ['DHT11 sensor', 'SG90 servo', 'Thermistor'], extras: ['Cardboard dial', 'Popsicle-stick needle']
    },
    m05: {
      id: 'm05', unit: 2, num: '05', title: 'Parking assistant', days: 2, level: 3,
      tagline: 'Measure distance with sound and beep faster and faster as something gets closer, like a real car.',
      discover: ['Ultrasonic echo timing', 'The speed of sound', 'millis() timing', 'Feedback design'],
      parts: ['HC-SR04 ultrasonic sensor', 'Active buzzer', 'LEDs'], extras: ['Cardboard "garage wall"']
    },
    m06: {
      id: 'm06', unit: 2, num: '06', title: 'Fortune teller', days: 2, level: 3,
      tagline: 'Shake it, and an LCD screen answers your question. Then add a live thermometer readout.',
      discover: ['LCD displays', 'Tilt switches', 'random()', 'switch / case'],
      parts: ['LCD1602 display', 'Potentiometer', 'Tilt ball switch', 'Thermistor'], extras: ['Cardboard box']
    },
    m07: {
      id: 'm07', unit: 2, num: '07', title: 'Remote turntable', days: 2, level: 4,
      tagline: 'Build a display stand that spins to exact angles when you press buttons on an IR remote.',
      discover: ['Infrared signals', 'Stepper motors & drivers', 'External power', 'Precise motion'],
      parts: ['IR receiver + remote', 'Stepper motor + ULN2003 driver', 'Power supply module'], extras: ['Cardboard turntable', 'Hot glue']
    },
    m08: {
      id: 'm08', unit: 2, num: '08', title: 'Smart fan', days: 2, level: 4,
      tagline: 'Drive a DC motor with an H-bridge, control speed and direction, and switch it on automatically when it gets warm.',
      discover: ['DC motors', 'H-bridges (L293D)', 'Relays', 'Why motors need their own power'],
      parts: ['DC motor + fan blade', 'L293D chip', 'Relay', 'Power supply module', 'DHT11 sensor'], extras: ['Cardboard fan stand']
    },
    m09: {
      id: 'm09', unit: 2, num: '09', title: 'Reaction timer', days: 2, level: 5,
      tagline: 'Build a two-player reaction game with an LED countdown bar and a four-digit score display.',
      discover: ['Shift registers (74HC595)', '7-segment displays', 'Binary', 'Timing with millis()'],
      parts: ['74HC595 chip', '8 LEDs', '4-digit 7-segment display', 'Push buttons'], extras: ['Cardboard game board']
    }
  };

  RL.missionList = function () { var out = []; RL.UNITS.forEach(function (u) { u.missions.forEach(function (id) { if (RL.MISSIONS[id]) out.push(RL.MISSIONS[id]); }); }); return out; };
  RL.unitOf = function (id) { var m = RL.MISSIONS[id]; return m ? RL.UNITS.filter(function (u) { return u.n === m.unit; })[0] : null; };
  /* colour for each unit (calendar chips, unit headers) */
  RL.UNIT_COLOURS = { 1: '#8ea6bb', 2: '#22d3ee', 3: '#7dd3fc', 4: '#fcd34d', 5: '#93c5fd' };
  RL.unitColour = function (n) { return RL.UNIT_COLOURS[n] || '#22d3ee'; };
  RL.guides = {}; // filled by js/missions/*.js
})(window);
