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
  /* the course levels in one class (each student is set to one in the dashboard's Roster tab). Every level does the same
     missions for now; a mission can later be limited to some levels. */
  RL.COURSE_LEVELS = [
    { id: '15', short: 'DTFI 15', name: 'Design Thinking for Innovation 15' },
    { id: '25', short: 'DTFI 25', name: 'Design Thinking for Innovation 25' },
    { id: '35', short: 'DTFI 35', name: 'Design Thinking for Innovation 35' }
  ];
  RL.courseLevel = function (id) { return RL.COURSE_LEVELS.filter(function (c) { return c.id === String(id || ''); })[0] || null; };
  /* a PowerSchool class name like "Design Thinking for Innovation 25" or "DTFI 35 - Block B" → '25' / '35' */
  RL.levelFromCourse = function (s) { var m = /(?:^|[^0-9])(15|25|35)(?![0-9])/.exec(String(s || '')); return m ? m[1] : ''; };

  RL.UNITS = [
    { n: 1, title: 'Design & 3D modeling', blurb: 'Learn Fusion 360 one tool at a time by building real, printable things.',
      missions: ['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08'] },
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

  /* Unit 1: Fusion 360. Each mission teaches a few tools through one build and ends with the student's 3D files. */
  var FUSION_KIT = ['A computer with Autodesk Fusion', 'Your Autodesk sign-in'], MOUSE = ['A mouse with a scroll wheel'];
  function fcrit(sketch, model, design, explain) {
    return [{ id: 'sketch', name: 'Sketch', desc: sketch }, { id: 'model', name: '3D model', desc: model }, { id: 'design', name: 'Design & testing', desc: design }, { id: 'explain', name: 'Explain it', desc: explain }];
  }
  var FUSION = {
    f01: {
      id: 'f01', unit: 1, num: 'F1', title: 'Name tag keychain', days: 2, ready: true, level: 1,
      tagline: 'Find your way around Fusion and model a keychain with your name on it, ready to 3D print.',
      discover: ['The Fusion window', 'Orbit, pan & zoom', 'Sketches & profiles', 'Dimensions', 'Fully defined (black) sketches', 'Extrude', 'Fillet', 'Text', 'Saving & exporting'],
      parts: FUSION_KIT, extras: MOUSE,
      criteria: fcrit('Fully defined sketch (all black) with the planned dimensions: a 50 × 20 mm tag and a Ø5 mm hole placed with dimensions.',
        'A 4 mm extrude with a clean hole through it, 4 filleted corners, and a name raised or engraved 1 mm.',
        'The name fits and reads clearly; the student tested their model (STL check) and tried an improvement.',
        'Uses sketch, profile, dimension, extrude and fillet correctly to explain how the keychain was built.')
    },
    f02: {
      id: 'f02', unit: 1, num: 'F2', title: 'Phone stand', days: 3, ready: false, level: 2,
      tagline: 'Draw a side profile with lines and arcs, lock it with constraints, and extrude a stand that holds your phone at the perfect angle.',
      discover: ['Lines & arcs', 'Constraints', 'Symmetric extrude', 'Chamfer', 'Measure', 'Design for a real object'],
      parts: FUSION_KIT, extras: ['A phone (or a block the same size) and a ruler'],
      criteria: fcrit('Profile drawn with lines and arcs, fully defined using constraints and dimensions.', 'Symmetric extrude, chamfers or fillets on edges, measured to fit a real phone.', 'Holds a phone at a chosen angle; tested against measurements and improved.', 'Explains how constraints and dimensions work together.')
    },
    f03: {
      id: 'f03', unit: 1, num: 'F3', title: 'Spinning top', days: 3, ready: false, level: 2,
      tagline: 'Sketch half a shape and revolve it into a top that really spins. Use the centre of mass to make it balance.',
      discover: ['Revolve', 'Construction lines', 'Splines', 'Centre of mass', 'Appearances'],
      parts: FUSION_KIT, extras: MOUSE,
      criteria: fcrit('Half-profile with a construction axis, fully defined.', 'Revolved body; low centre of mass checked with Inspect.', 'A top that spins for a long time; tested, timed and improved.', 'Explains revolve and why the centre of mass matters.')
    },
    f04: {
      id: 'f04', unit: 1, num: 'F4', title: 'Desk organizer', days: 3, ready: false, level: 3,
      tagline: 'Design a desk tidy with compartments for your things using shell, patterns, mirror and sketches on faces.',
      discover: ['Shell', 'Offset planes', 'Rectangular pattern', 'Mirror', 'Sketch on a face', 'Cut extrudes'],
      parts: FUSION_KIT, extras: ['A ruler, and the things you want it to hold'],
      criteria: fcrit('Sketches on faces and planes, dimensioned from measurements of real objects.', 'Shelled body with patterned or mirrored compartments and cut features.', 'Every compartment fits what it’s for; checked with measurements and improved.', 'Explains shell, pattern and mirror, and how they saved time.')
    },
    f05: {
      id: 'f05', unit: 1, num: 'F5', title: 'Fidget spinner', days: 3, ready: false, level: 3,
      tagline: 'Use parameters and a circular pattern to design a spinner around a real skateboard bearing, with a press fit that holds.',
      discover: ['User parameters', 'Circular pattern', 'Hole tool', 'Tolerances & press fits', 'Change a design with one number'],
      parts: FUSION_KIT, extras: ['A 608 skateboard bearing (22 mm), calipers if you have them'],
      criteria: fcrit('Parametric sketch: the bearing size and arm count are user parameters.', 'Circular pattern of arms, holes sized with a tolerance for a press fit.', 'The bearing fits snugly after printing; the fit was tested and adjusted.', 'Explains parameters and why a hole needs a tolerance.')
    },
    f06: {
      id: 'f06', unit: 1, num: 'F6', title: 'Box with a snap lid', days: 4, ready: false, level: 4,
      tagline: 'Model a box and lid as separate components, connect them with joints, and design a lid that snaps shut.',
      discover: ['Components', 'Joints & motion', 'Interference', 'Section analysis', 'Clearance'],
      parts: FUSION_KIT, extras: MOUSE,
      criteria: fcrit('Each part sketched in its own component, dimensioned to match the other part.', 'Box and lid as components with joints; no interference; clearance for the fit.', 'Lid opens, closes and snaps; tested with a section view and improved.', 'Explains components, joints and clearance.')
    },
    f07: {
      id: 'f07', unit: 1, num: 'F7', title: 'Bottle & handle', days: 3, ready: false, level: 4,
      tagline: 'Blend between shapes with loft and pull a profile along a path with sweep to make smooth, organic forms.',
      discover: ['Loft', 'Sweep', 'Construction planes', 'Paths', 'Smooth forms'],
      parts: FUSION_KIT, extras: MOUSE,
      criteria: fcrit('Profiles on offset planes and a path sketch, all defined.', 'A loft between at least 3 profiles and a sweep along a path, joined into one body.', 'Comfortable to hold; shape tested and refined.', 'Explains loft and sweep and when to use each.')
    },
    f08: {
      id: 'f08', unit: 1, num: 'F8', title: 'Design challenge', days: 4, ready: false, level: 5,
      tagline: 'Use the design process to solve a real problem for a real person, then model it, make a drawing, slice it and print it.',
      discover: ['The design process', 'Interviewing a user', 'Drawings', 'Slicing', '3D printing'],
      parts: FUSION_KIT, extras: ['Access to the 3D printer'],
      criteria: fcrit('Sketches and a drawing with dimensions that someone else could build from.', 'A complete model using tools from the unit, sliced and printed.', 'Designed for a real user; prototype tested with them and improved.', 'Explains the design decisions and the tools used.')
    }
  };
  Object.keys(FUSION).forEach(function (k) { FUSION[k].cardTags = FUSION[k].discover.slice(FUSION[k].id === 'f01' ? 3 : 0); RL.MISSIONS[k] = FUSION[k]; });

  /* Extra materials to order (the Equipment tab). Each item is one specific Amazon.ca product (checked Oct 28, 2026):
     { item: what it's for, name: what to call it in the order email, product: the listing's name, asin, pack: units in one order, unit: what a unit is,
       each: units each group needs (→ packs = groups × each ÷ pack, rounded up) or packs: a fixed number of packs for
       the class, price: as seen }. The teacher can swap any product for another link in the dashboard. */
  var P = {
    glue: { name: 'Hot Glue Sticks', product: 'Surebonder DT-100 mini glue sticks, 4 in (100)', asin: 'B003JZII34', pack: 100, unit: 'sticks', price: '$11.62' },
    craft: { name: 'Jumbo Craft Sticks', product: 'Jumbo craft sticks, plain (500)', asin: 'B09H99YJVT', pack: 500, unit: 'sticks', price: '$16.04' },
    cardboard: { name: 'Cardboard Sheets', product: 'RLAVBL 12×12 in corrugated cardboard sheets (50)', asin: 'B0F4JGSC2J', pack: 50, unit: 'sheets', price: '$29.99' },
    cups: { name: 'White Plastic Cups', product: '12 oz white plastic cups (50)', asin: 'B07KMFDHY8', pack: 50, unit: 'cups', price: '$29.83' },
    vellum: { name: 'Vellum Paper', product: 'Goefun translucent vellum paper, 8.5×11 (50 sheets)', asin: 'B0GVDSWYHP', pack: 50, unit: 'sheets', price: '$13.99' },
    fmwires: { name: 'Female-to-Male Jumper Wires', product: 'ELEGOO 20 cm 40-pin female-to-male jumper wires (40)', asin: 'B0H6F7ZZFX', pack: 40, unit: 'wires', price: '$6.99' },
    fasteners: { name: 'Brass Paper Fasteners', product: 'ACCO brass paper fasteners, 1 in (100)', asin: 'B004LWSFAK', pack: 100, unit: 'fasteners', price: '$6.99' },
    dht11: { name: 'DHT11 Sensors', product: 'HiLetgo DHT11 temperature & humidity modules (5)', asin: 'B01DKC2GQ0', pack: 5, unit: 'modules', price: '$17.49' },
    cars: { name: 'Pull-Back Toy Cars', product: 'JOYIN pull-back city cars and trucks (18)', asin: 'B08KTW2DT4', pack: 18, unit: 'vehicles', price: '$19.99' },
    masking: { name: 'Masking Tape', product: 'Scotch contractor grade masking tape, 24 mm (6 rolls)', asin: 'B008LAQYXI', pack: 6, unit: 'rolls', price: '$14.42' },
    tapes: { name: 'Tape Measures', product: 'LEXIVON 3 m tape measures, metric + imperial (3)', asin: 'B07MH66JQ1', pack: 3, unit: 'tape measures', price: '$24.99' },
    boxes: { name: 'Small Kraft Boxes', product: 'PHAREGE 4×4×2 in boxes with tuck lids (25)', asin: 'B08X25JQML', pack: 25, unit: 'boxes', price: '$23.09' },
    nine: { name: '9V Batteries', product: 'Amazon Basics 9 V alkaline batteries (8)', asin: 'B00MH4QM1S', pack: 8, unit: 'batteries', price: '$18.64' },
    cake: { name: 'Cake Boards', product: 'qiqee 8 in round white cake boards (30)', asin: 'B0DGPV679D', pack: 30, unit: 'boards', price: '$17.88' },
    foam: { name: 'Double-Sided Mounting Tape', product: 'Scotch-Mount double-sided mounting tape, ¾ in × 350 in', asin: 'B009NP1OBC', pack: 1, unit: 'roll', price: '$17.77' },
    arcade: { name: 'Arcade Push Buttons', product: 'EG Starts 30 mm arcade push buttons (12)', asin: 'B01MRWL6DW', pack: 12, unit: 'buttons', price: '$15.99' }
  };
  function it(item, k, o) { var p = P[k]; return Object.assign({ item: item, key: k, link: 'https://www.amazon.ca/dp/' + p.asin }, p, o); }
  RL.ORDERS = {
    m01: [it('Hot glue sticks', 'glue', { packs: 1 }), it('Craft sticks (popsicle sticks)', 'craft', { packs: 1 }), it('Cardboard sheets (signal housings)', 'cardboard', { each: 2 })],
    m02: [it('Lampshades', 'cups', { each: 2 }), it('Vellum (light diffuser)', 'vellum', { each: 2 })],
    m03: [it('Female-to-male jumper wires (joystick)', 'fmwires', { each: 5 }), it('Hot glue sticks', 'glue', { packs: 1 })],
    m04: [it('Brass paper fasteners (needle pivots)', 'fasteners', { each: 1 }), it('DHT11 sensors, spares (optional)', 'dht11', { packs: 1, optional: true })],
    m05: [it('Toy cars (test vehicles)', 'cars', { each: 1 }), it('Masking tape', 'masking', { packs: 1 }), it('Tape measures (shared)', 'tapes', { packs: 2 })],
    m06: [it('Small boxes (magic box cases)', 'boxes', { each: 1 })],
    m07: [it('9 V batteries, spares (the kit comes with one)', 'nine', { packs: 1 }), it('Turntable tops', 'cake', { each: 1 }), it('Double-sided mounting tape', 'foam', { packs: 1 })],
    m08: [it('9 V batteries, spares', 'nine', { packs: 1, optional: true }), it('Hot glue sticks', 'glue', { packs: 1 })],
    m09: [it('Female-to-male jumper wires (the display needs about 14)', 'fmwires', { each: 10 }), it('30 mm arcade buttons (optional)', 'arcade', { each: 2, optional: true }), it('Cardboard sheets (game boards)', 'cardboard', { each: 1 })]
  };
  /* how many packs to order for g groups */
  RL.orderQty = function (o, g) { return o.packs != null ? o.packs : Math.max(1, Math.ceil((g || 1) * (o.each || 1) / (o.pack || 1))); };

  /* short code for a mission: M01 (Arduino) or F1 (Fusion) */
  RL.mcode = function (num) { num = String(num && num.num != null ? num.num : num); return /^\d/.test(num) ? 'M' + num : num; };
  RL.missionList = function () { var out = []; RL.UNITS.forEach(function (u) { u.missions.forEach(function (id) { if (RL.MISSIONS[id]) out.push(RL.MISSIONS[id]); }); }); return out; };
  RL.unitOf = function (id) { var m = RL.MISSIONS[id]; return m ? RL.UNITS.filter(function (u) { return u.n === m.unit; })[0] : null; };
  /* colour for each unit (calendar chips, unit headers) */
  RL.UNIT_COLOURS = { 1: '#8ea6bb', 2: '#22d3ee', 3: '#7dd3fc', 4: '#fcd34d', 5: '#93c5fd' };
  RL.unitColour = function (n) { return RL.UNIT_COLOURS[n] || '#22d3ee'; };
  RL.guides = {}; // filled by js/missions/*.js
})(window);
