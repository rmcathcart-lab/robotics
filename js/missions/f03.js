/* Mission F3: Spinning top — construction lines, splines, revolve, centre of mass, appearance. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion;
  var steps = [];
  var TOP = [[0, 0], [22, 9], [22, 15], [6, 17], [4, 17], [4, 42], [0, 42]];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f03, {
      lead: '<p class="lead">Tops are one of the oldest toys in the world, and every one is round. Round things — cups, wheels, bottles, knobs — are made in Fusion with <b>Revolve</b>: you sketch half of the outline and spin it around an axis.</p>' +
        '<p>You’ll design a top, use Fusion to find its <b>centre of mass</b>, and tune the shape so it spins for as long as possible. Then you’ll race it against your classmates’ tops.</p>',
      edp: [3, 4, 5, 6, 7],
      previewCap: 'One half-profile, revolved 360° around a construction line. The orange dot is the centre of mass: the lower it is, the steadier the spin.',
      preview: function (api, T) {
        var g = new T.LatheGeometry(TOP.map(function (p) { return new T.Vector2(Math.max(0.001, p[0]), p[1]); }), 72); g.rotateX(Math.PI / 2);
        api.root.add(new T.Mesh(g, new T.MeshStandardMaterial({ color: 0xb53a32, roughness: 0.35, side: T.DoubleSide })));
        var d = new T.Mesh(new T.SphereGeometry(1.6, 16, 12), new T.MeshBasicMaterial({ color: 0xff6a13, depthTest: false })); d.renderOrder = 5; d.position.z = F.revolveStats(TOP).com; api.root.add(d);
        return new T.Box3(new T.Vector3(-23, -23, 0), new T.Vector3(23, 23, 42));
      }
    });
  } });

  steps.push({ id: 'revolve', title: 'Revolve & centre of mass', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead"><b>Revolve</b> sweeps a profile around an <b>axis</b>, like a potter’s wheel. The profile only needs to be half of the shape: one side of the axis.</p>' +
      '<p>The <b>centre of mass</b> is the balance point of an object — where all its weight seems to act. A top stays upright while it spins if its centre of mass is low and its weight is spread out in a wide disc.</p><h2>Try it</h2><p>Drag the blue points to reshape the half-profile. The 3D top and the orange centre-of-mass dot update as you go.</p>');
    F.revolveLab(b, ctx, 'lab-rev');
    UI.mcq(b, ctx, { id: 'q-com', q: 'Two tops weigh the same. Top A has a heavy disc near the tip; top B has a heavy knob at the top of the stem. Which spins longer?', options: ['Top A: its centre of mass is lower', 'Top B: weight at the top helps it spin', 'They spin the same because they weigh the same', 'Whichever is taller'], answer: 0, explain: 'A low centre of mass and a wide disc keep a top upright. Top B is top-heavy and falls over quickly.' });
  } });

  steps.push({ id: 'sketchit', title: 'Build it: the half-profile', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Start a new design in your Robotics Missions project. You’ll draw an upright <b>construction line</b> for the axis, then the outline of half the top beside it. A construction line is a helper: it’s dashed and never becomes part of a profile.</p>');
    F.shots(b, { title: 'Sketch half a top', ctx: ctx, key: 'w-sketch', steps: [
      { img: 'f2-planes', view: [700, 470, 560], cap: '<b>Create Sketch</b> on the <b>XZ plane</b> (the upright one), so the top stands up.', marks: [{ t: 'click', x: 712, y: 503 }] },
      { img: 'f3-profile', view: [600, 610, 480], cap: '(This is the finished sketch, so you can see where you’re going.) Press <kbd>L</kbd> and draw a line straight up from the <b>origin</b>. Press <kbd>Esc</kbd>, click the line and press <kbd>X</kbd>: it turns dashed — a <b>construction line</b>. This is the axis the top will spin around.', marks: [{ t: 'key', k: 'L' }, { t: 'drag', x1: 560, y1: 700, x2: 560, y2: 520 }, { t: 'key', k: 'X' }, { t: 'label', x: 560, y: 560, text: 'axis', dx: -80, dy: 0 }] },
      { img: 'f3-profile', view: [600, 610, 480], cap: 'Draw the outline to the right of the axis with Line: from the tip, out and up to the rim, up the rim edge… then up the stem and back to the axis. Leave the curved part (rim to stem) for the next tool.', marks: [{ t: 'click', x: 560, y: 700 }, { t: 'click', x: 648, y: 652 }, { t: 'click', x: 648, y: 628 }, { t: 'key', k: 'Esc' }, { t: 'click', x: 580, y: 612 }, { t: 'click', x: 580, y: 532 }, { t: 'click', x: 560, y: 532 }] },
      { img: 'f3-splinemenu', view: [300, 300, 600], cap: 'A <b>spline</b> is a smooth curve through points you click. <b>CREATE ▸ Spline ▸ Fit Point Spline</b>.', marks: [{ t: 'click', x: 232, y: 123 }, { t: 'click', x: 153, y: 296 }, { t: 'click', x: 364, y: 296 }] },
      { img: 'f3-spline', view: [610, 620, 420], cap: 'Click the top of the rim, one point in between, and the bottom of the stem. Then click the green check (or press <kbd>Enter</kbd>) to finish the curve.', marks: [{ t: 'click', x: 648, y: 628 }, { t: 'click', x: 620, y: 614 }, { t: 'click', x: 580, y: 612 }, { t: 'click', x: 583, y: 658 }] },
      { img: 'f3-profile', view: [600, 610, 480], cap: 'Close the shape down the axis (Line from the stem top to the tip), then add dimensions: radius <b>22</b> from the axis to the rim and height <b>42</b>. The inside turns light blue. <b>Finish Sketch</b>.', marks: [{ t: 'key', k: 'D' }, { t: 'click', x: 648, y: 642 }, { t: 'click', x: 560, y: 660 }, { t: 'type', x: 604, y: 730, w: 70, h: 20, text: '22' }, { t: 'type', x: 515, y: 616, w: 60, h: 20, text: '42' }] }
    ] });
    UI.callout(b, '', 'Rules for a revolve profile', '<ul><li>It must be <b>closed</b> (light blue inside).</li><li>It must stay on <b>one side</b> of the axis — if it crosses, Revolve fails.</li><li>The edge along the axis can be the axis line itself, or a line on top of it.</li></ul>');
  } });

  steps.push({ id: 'revolveit', title: 'Revolve it', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    F.shots(b, { title: 'Spin the profile into a top', ctx: ctx, key: 'w-rev', steps: [
      { img: 'f3-revolve0', view: 'full', cap: 'Click <b>Revolve</b> (the third icon under CREATE). The panel asks for a <b>Profile</b> and an <b>Axis</b>. Click the shaded profile.', marks: [{ t: 'click', x: 216, y: 97 }, { t: 'box', x: 1143, y: 262, w: 224, h: 250 }] },
      { img: 'f3-revolve', view: [860, 450, 900], cap: 'Click the <b>Axis</b> button, then the dashed construction line. A preview spins round: <b>Full</b> 360°. Click <b>OK</b>.', marks: [{ t: 'click', x: 686, y: 340 }, { t: 'click', x: 1257, y: 497 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-axis', q: 'You picked the outside edge of the rim as the axis by mistake. What happens?', options: ['Nothing changes', 'The shape spins around the wrong line: you get a ring-shaped donut instead of a top', 'Fusion picks the right axis for you', 'The top gets taller'], answer: 1, explain: 'Revolve spins around whatever line you pick. The construction line is there so you pick the centre.' });
  } });

  steps.push({ id: 'com', title: 'Centre of mass & appearance', stage: '06 Test', time: '20 min', render: function (b, ctx) {
    F.shots(b, { title: 'Find the balance point, then make it look real', ctx: ctx, key: 'w-com', steps: [
      { img: 'inspectmenu', view: [940, 260, 560], cap: '<b>INSPECT ▾ ▸ Center of Mass</b>.', marks: [{ t: 'click', x: 943, y: 123 }, { t: 'click', x: 962, y: 336 }] },
      { img: 'f3-com', view: 'full', cap: 'Click the body and <b>OK</b>. A marker shows the centre of mass. Look from the <b>FRONT</b> (ViewCube) to see how high it sits. Lower is better: if it’s above the disc, make the disc heavier or the stem thinner.', marks: [{ t: 'ring', x: 686, y: 470, r: 26 }, { t: 'click', x: 1306, y: 200 }] },
      { img: 'f3-appearance', view: 'full', cap: 'Press <kbd>A</kbd> for <b>Appearance</b>. Search the library (try “plastic”), then drag a material onto your top. Appearance only changes how it looks on screen — the printer uses whatever filament is loaded.', marks: [{ t: 'key', k: 'A' }, { t: 'type', x: 1160, y: 559, w: 200, h: 22, text: 'plastic glossy red', align: 'left' }, { t: 'drag', x1: 1016, y1: 778, x2: 690, y2: 440 }] },
      { img: 'f3-final', view: 'full', cap: 'Your top. Two steps in the timeline: the sketch and the revolve.', marks: [{ t: 'box', x: 128, y: 856, w: 52, h: 30 }] }
    ] });
    F.exportReminder(b);
    F.stlCheck(b, ctx, 'stl');
    UI.callout(b, '', 'Printing a top', '<p>Print it standing on its flat top with the tip pointing up, so the tip comes out sharp. In Bambu Studio turn on <b>supports</b> for the overhang under the disc.</p>');
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Real engineers test, change one thing, and test again. Once your top is printed, spin it three times and time each spin.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Profile:</b> closed, on one side of the axis, fully defined.',
      '<b>Revolve:</b> a full 360° revolve around the construction line.',
      '<b>Balance:</b> the centre of mass is in the lower third of the top.',
      '<b>Size:</b> under Ø50 mm and 50 mm tall (fits in your hand and prints quickly).',
      '<b>Spin:</b> once printed, it spins for at least 10 seconds.'
    ] });
    UI.note(b, ctx, { id: 'n-spins', label: 'Spin times (seconds) for 3 tries, and the average:', placeholder: 'Try 1: … Try 2: … Try 3: … Average: …', rows: 2 });
    UI.challenges(b, [
      { tag: 'Revolve', cls: 'c', title: 'Change one thing', html: 'Make one change (wider disc, thinner stem, lower disc) and test again. Did the centre of mass drop? Did it spin longer?' },
      { tag: 'Revolve', title: 'Partial revolve', html: 'Change the revolve angle from Full to 180° to see inside your top. Why is this useful for checking a design?' },
      { tag: 'Modify', title: 'Grip', html: 'Fillet the top of the stem so it’s comfortable to twist, and add grip rings by revolving small half-circles around the stem.' },
      { tag: 'Physics', cls: 'c', title: 'Spin-off', html: 'Race your top against a classmate’s. Compare your centres of mass. Does the lower one always win?' }
    ]);
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f03 = {
    steps: steps,
    evidence: F.evidence('spinning top', 'Hand in your top: the Fusion design, the STL and a screenshot (with the centre of mass showing if you can). Add a video of it spinning once it’s printed.', [
      { id: 'r1', q: 'Explain how Revolve made your top. Use the words profile, axis and construction line.' },
      { id: 'r2', q: 'Where was your top’s centre of mass, and how did you change the shape to move it?' },
      { id: 'r3', q: 'What was a spline used for in your top, and why not just use straight lines?' },
      { id: 'r4', q: 'Describe one test you did and what you changed because of it.' }
    ], [{ id: 'video', kind: 'video', label: 'A video of it spinning (optional)', help: 'Once it’s printed: under 30 seconds.', required: false, max: 1 }])
  };
})(window);
