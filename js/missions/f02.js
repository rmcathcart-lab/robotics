/* Mission F2: Phone stand — lines, constraints, symmetric extrude, chamfer, measure.
 * Walk-throughs use real Fusion screenshots (assets/fusion/f2-*.jpg) with the clicks animated on top. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion, el = RL.el;
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f02, {
      lead: '<p class="lead">A good design starts with the thing it’s for. In this mission you’ll design a stand that holds <b>your</b> phone at a comfortable angle for watching videos or a video call — measured to fit, not guessed.</p>' +
        '<p>You’ll draw the stand’s side view with the Line tool, lock it down with <b>constraints</b> and dimensions, then extrude it out to both sides at once. Chamfers take the sharp edges off, and Measure checks it against your phone.</p>',
      edp: [1, 4, 5, 6, 7], hand: ['Your design (.f3d)', 'A print file (.stl)', 'A screenshot', 'Your phone measurements'],
      previewCap: 'The side profile (one sketch) extruded 70 mm wide, with chamfered edges. Change one angle and the whole stand changes.',
      preview: function (api, T) {
        var prof = F.standProfile(T, { angle: 110, lip: 15, base: 90, back: 62, top: 14, shelf: 7, lipT: 4 });
        var g = F.extrude(T, prof.shape, 70); g.translate(0, 0, -35); g.rotateX(Math.PI / 2); g.translate(-45, 0, 0);
        api.root.add(F.solid(T, g)); return new T.Box3(new T.Vector3(-46, -36, 0), new T.Vector3(46, 36, 62));
      }
    });
    UI.callout(b, '', 'Before you start', '<p>You need your phone’s <b>thickness with its case on</b>. Measure it with a ruler or calipers now and write it down. No phone? Use 11 mm.</p>');
    UI.note(b, ctx, { id: 'n-phone', label: 'My phone (with case) is ___ mm thick, ___ mm wide and ___ mm tall.', placeholder: 'e.g. 11 mm thick, 76 mm wide, 160 mm tall', rows: 2 });
  } });

  steps.push({ id: 'plan', title: 'Plan it: a profile', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Look at the stand from the side and you see one flat shape: a base, a back support leaning at an angle, a shelf, and a lip at the front that stops the phone sliding off. That shape is a <b>profile</b>. Draw it once, extrude it, and you have the whole stand.</p>' +
      '<p>Most real products are designed like this: find the view that shows the shape best and sketch that.</p><h2>Try it</h2><p>Change the numbers and watch the checks. Set the phone thickness to your phone’s, then find an angle and lip that pass every check.</p>');
    F.standLab(b, ctx, 'lab-stand');
    UI.mcq(b, ctx, { id: 'q-profile', q: 'Why sketch the <b>side</b> of the stand instead of the top or the front?', options: ['The side view is the only one Fusion allows', 'The side view shows the stand’s whole shape; extruding it makes the stand', 'It prints faster', 'The top view would be harder to dimension'], answer: 1, explain: 'Every slice of the stand, from left to right, is the same side shape. Sketch that shape once and extrude it.', hints: { 0: 'You can sketch on any plane.', 2: 'The sketch view doesn’t change how it prints.' } });
  } });

  steps.push({ id: 'constraints', title: 'Constraints', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">In Mission F1 you used dimensions to lock sizes. <b>Constraints</b> lock <i>relationships</i> instead: this line stays horizontal, these two lines are always equal, this point sits on that line. Together, constraints and dimensions make a sketch fully defined (black).</p>' +
      '<table class="fx-plan"><thead><tr><th>Constraint</th><th>What it does</th><th>Used in the stand</th></tr></thead><tbody>' +
      '<tr><td><b>Horizontal / Vertical</b></td><td>Makes a line perfectly level or upright.</td><td>The base, shelf and lip. Fusion adds these by itself when a line snaps level.</td></tr>' +
      '<tr><td><b>Coincident</b></td><td>Sticks a point onto another point or line.</td><td>Each corner joins the next line.</td></tr>' +
      '<tr><td><b>Equal</b></td><td>Two lines stay the same length.</td><td>The lip is as thick as it is wide.</td></tr>' +
      '<tr><td><b>Parallel / Perpendicular</b></td><td>Lines run side by side, or meet at 90°.</td><td>The lip’s inside face is parallel to its outside face.</td></tr>' +
      '<tr><td><b>Tangent</b></td><td>A line meets a curve smoothly, with no bump.</td><td>You’ll need it for arcs in Mission F3.</td></tr>' +
      '<tr><td><b>Fix</b></td><td>Nails something in place (use rarely: dimensions are better).</td><td>—</td></tr></tbody></table>');
    F.shots(b, { title: 'The constraints in Fusion', ctx: ctx, key: 'w-cons', steps: [
      { img: 'f2-constraints', view: [700, 300, 760], cap: 'While you’re sketching, the <b>CONSTRAINTS</b> menu lists them all. The little icons on your sketch (like = or ⊥) show which constraints are already there.', marks: [{ t: 'click', x: 624, y: 123 }, { t: 'box', x: 492, y: 134, w: 214, h: 276 }, { t: 'ring', x: 562, y: 239, r: 14 }] },
      { img: 'f2-equal1', view: [760, 470, 700], cap: '<b>Equal</b>: click the first line (it turns blue), then the second. Now they’re always the same length. If you change one, the other follows.', marks: [{ t: 'click', x: 862, y: 511 }, { t: 'move', x: 845, y: 528 }, { t: 'label', x: 845, y: 528, text: 'then this one', dx: 40, dy: 50 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-cons', q: 'You want the lip to always be as thick as it is tall, even if you change one later. Which constraint?', options: ['Horizontal', 'Equal', 'Coincident', 'Fix'], answer: 1, explain: 'Equal links the two lengths. Dimension one of them and the other follows.' });
  } });

  steps.push({ id: 'sketchit', title: 'Build it: sketch the profile', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Start a new design in your Robotics Missions project. Sketch the profile rough first — the sizes don’t matter yet — then let constraints and dimensions pull it into shape.</p>' +
      '<table class="fx-plan"><thead><tr><th>Dimension</th><th>Plan (use your lab numbers if they’re different)</th></tr></thead><tbody><tr><td>Base length</td><td>90 mm</td></tr><tr><td>Back height</td><td>62 mm</td></tr><tr><td>Top of the back</td><td>14 mm</td></tr><tr><td>Support angle</td><td>110°</td></tr><tr><td>Shelf height</td><td>7 mm</td></tr><tr><td>Lip height</td><td>15 mm (lip thickness equal to the lip top)</td></tr></tbody></table>');
    F.shots(b, { title: 'Sketch the stand’s profile', ctx: ctx, key: 'w-sketch', steps: [
      { img: 'f2-planes', view: [700, 470, 560], cap: '<b>Create Sketch</b>, then pick the <b>XZ plane</b> — the upright one facing you. That way the stand is drawn standing up, as seen from the front.', marks: [{ t: 'click', x: 712, y: 503 }, { t: 'label', x: 712, y: 503, text: 'XZ plane', dx: 60, dy: 40 }] },
      { img: 'f2-line', view: [860, 470, 620], cap: 'Press <kbd>L</kbd> for <b>Line</b>. Click the <b>origin</b> to start, then click to place each corner. Don’t drag — click, move, click. Here the base line goes right and the next line heads up.', marks: [{ t: 'key', k: 'L' }, { t: 'click', x: 686, y: 491 }, { t: 'click', x: 1046, y: 491 }, { t: 'move', x: 1046, y: 431 }] },
      { img: 'f2-rough', view: [700, 450, 680], cap: 'Keep clicking around the shape: up the front of the lip, across, down, back along the shelf, up the slanted support, across the top and down to the origin. Click the start point to close it: the inside turns light blue, so it’s a <b>profile</b>. Press <kbd>Esc</kbd>.', marks: [{ t: 'click', x: 876, y: 511 }, { t: 'click', x: 844, y: 511 }, { t: 'click', x: 844, y: 539 }, { t: 'click', x: 644, y: 539 }, { t: 'click', x: 572, y: 323 }, { t: 'click', x: 516, y: 323 }, { t: 'click', x: 516, y: 571 }, { t: 'key', k: 'Esc' }] },
      { img: 'f2-equal1', view: [760, 470, 700], cap: 'Make the lip square: <b>CONSTRAINTS ▸ Equal</b>, then click the lip’s top line and its inside line.', marks: [{ t: 'click', x: 862, y: 511 }, { t: 'click', x: 844, y: 527 }] },
      { img: 'f2-angle', view: [640, 450, 620], cap: 'Press <kbd>D</kbd>. Click a line and place its dimension to set a length. For the <b>angle</b>, click the shelf line and then the slanted line: Fusion measures the angle between them. Type <b>110</b> and press <kbd>Enter</kbd>.', marks: [{ t: 'key', k: 'D' }, { t: 'click', x: 770, y: 541 }, { t: 'click', x: 610, y: 440 }, { t: 'move', x: 700, y: 490 }, { t: 'type', x: 775, y: 515, w: 140, h: 22, text: '110', align: 'left' }] },
      { img: 'f2-defined', view: [690, 450, 640], cap: 'Add the other dimensions from the plan: base <b>90</b>, back <b>62</b>, top <b>14</b>, shelf <b>7</b>, lip <b>15</b>. When every line is black, the profile is fully defined. Click <b>Finish Sketch</b>.', marks: [{ t: 'label', x: 760, y: 615, text: '90', dx: 0, dy: 30 }, { t: 'label', x: 476, y: 440, text: '62', dx: -50, dy: 0 }, { t: 'label', x: 700, y: 490, text: '110°', dx: 30, dy: -40 }] }
    ] });
    UI.tests(b, ctx, { id: 't-sketch', rows: ['The profile is closed (it’s shaded light blue).', 'Every line is <b>black</b>: no blue left.', 'The angle and the lip match your plan.'] });
    UI.callout(b, '', 'Still blue?', '<p>Drag a blue line to see how it can move, then stop that movement: a dimension for a size, a constraint for a direction. If a line won’t take a dimension because it’s “over-constrained”, you’ve set the same thing twice — undo the last one.</p>');
  } });

  steps.push({ id: 'extrude', title: 'Symmetric extrude', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">You drew the profile in the middle of the stand (on the XZ plane). A <b>symmetric</b> extrude grows it out to both sides equally, so the stand ends up centred on the origin — handy for adding things later.</p>');
    F.shots(b, { title: 'Extrude both ways', ctx: ctx, key: 'w-extrude', steps: [
      { img: 'f2-direction', view: [960, 430, 820], cap: 'Press <kbd>E</kbd> and click the profile. In the Extrude panel, open <b>Direction</b> and choose <b>Symmetric</b>.', marks: [{ t: 'key', k: 'E' }, { t: 'click', x: 1282, y: 380 }, { t: 'click', x: 1234, y: 452 }] },
      { img: 'f2-symmetric', view: [940, 470, 860], cap: 'Set <b>Measurement</b> to <b>Whole Length</b> and type <b>70</b>: 35 mm each side. Your phone is about 76 mm wide, so 70 mm holds it without poking out. Click <b>OK</b>.', marks: [{ t: 'click', x: 1268, y: 457 }, { t: 'type', x: 1282, y: 486, w: 108, h: 22, text: '70', align: 'left' }, { t: 'click', x: 1257, y: 562 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-sym', q: 'With <b>Symmetric</b> and <b>Whole Length</b> set to 70 mm, how far does the stand reach on each side of the sketch?', options: ['70 mm', '35 mm', '140 mm', '17.5 mm'], answer: 1, explain: 'Whole Length splits the distance: 35 mm each way. (With “One side” measurement, 70 would go each way: 140 total.)' });
  } });

  steps.push({ id: 'finish', title: 'Chamfer & measure', stage: '05 Create · 06 Test', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>chamfer</b> cuts a flat slope on an edge (a fillet makes it round). Chamfers print well and take the sharp corners off. Then <b>Measure</b> checks the stand against your real phone.</p>');
    F.shots(b, { title: 'Chamfer the edges, then measure', ctx: ctx, key: 'w-finish', steps: [
      { img: 'modifymenu', view: [420, 300, 640], cap: 'Open <b>MODIFY ▾</b> and choose <b>Chamfer</b>.', marks: [{ t: 'click', x: 500, y: 123 }, { t: 'click', x: 442, y: 183 }] },
      { img: 'f2-chamfer', view: [860, 430, 900], cap: 'Click the two top edges of the back support (orbit if you need to). Type <b>3</b> for the distance and click <b>OK</b>. Do the same for the lip’s top edges.', marks: [{ t: 'click', x: 726, y: 312 }, { t: 'click', x: 686, y: 290 }, { t: 'type', x: 1210, y: 324, w: 70, h: 20, text: '3', align: 'left' }, { t: 'click', x: 1257, y: 536 }] },
      { img: 'f2-measure', view: 'full', cap: '<b>INSPECT ▸ Measure</b> (or press <kbd>I</kbd>). Click the shelf, then the top of the lip: the panel shows the distance between them. Measure the slot too, and compare both with your phone.', marks: [{ t: 'click', x: 926, y: 97 }, { t: 'click', x: 760, y: 560 }, { t: 'click', x: 1022, y: 527 }, { t: 'box', x: 1143, y: 262, w: 224, h: 420 }] },
      { img: 'f2-final', view: 'full', cap: 'Your stand: three steps in the timeline (sketch, extrude, chamfer). If the slot is too tight for your phone, double-click the sketch in the timeline and change a dimension — everything updates.', marks: [{ t: 'box', x: 128, y: 856, w: 72, h: 30 }] }
    ] });
    F.exportReminder(b);
    F.stlCheck(b, ctx, 'stl');
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Check your stand against the plan before it’s printed.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Fit:</b> Measure the slot: it’s at least 1 mm wider than your phone (with its case).',
      '<b>Sketch:</b> the profile sketch is fully defined (all black).',
      '<b>Symmetric:</b> the stand is centred on the origin (look from the TOP view).',
      '<b>Edges:</b> the top of the back and the lip are chamfered.',
      '<b>STL:</b> your STL opened in the checker, closed, about 90 × 70 × 62 mm.'
    ] });
    UI.challenges(b, [
      { tag: 'Design', cls: 'c', title: 'Charging cable slot', html: 'Cut a slot through the shelf and the base so a charging cable can plug in while the phone stands. Sketch a rectangle on the shelf face and Extrude it with <b>Operation: Cut</b>.', hint: 'Make the slot about 12 mm wide so the plug fits. Use <b>Extent: All</b> to cut right through.' },
      { tag: 'Constraints', title: 'One number to rule them', html: 'Change only the angle to 100° and then 125°. Does the stand still work at both? What else would you need to change?' },
      { tag: 'Modify', title: 'Lighten it', html: 'Cut a window through the back support to save plastic (sketch on its face, extrude Cut). Keep at least 6 mm of support on each side.' },
      { tag: 'Personal', cls: 'c', title: 'Make it yours', html: 'Add your initials or a logo to the base with Text (like Mission F1), raised or engraved.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What did you change after measuring, and why?', placeholder: 'I measured… so I changed…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f02 = {
    steps: steps,
    evidence: F.evidence('phone stand', 'Hand in your phone stand: the Fusion design, the STL and a screenshot. If it’s been printed, add a photo with your phone in it. Answer the questions, then press Submit.', [
      { id: 'r1', q: 'What is a constraint? Give two constraints you used and what each one did in your stand.' },
      { id: 'r2', q: 'Why did you sketch the side of the stand and use a symmetric extrude?' },
      { id: 'r3', q: 'How did you make sure your phone would fit? Include the measurements you used.' },
      { id: 'r4', q: 'What would you change in version 2, and which tool would you use?' }
    ], [{ id: 'photo', kind: 'photo', label: 'A photo of your printed stand (optional)', help: 'With your phone in it, once it’s printed.', required: false, max: 2 }])
  };
})(window);
