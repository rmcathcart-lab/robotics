/* Mission F4: Desk organizer — shell, sketch on a face, rectangular pattern, cut extrude, mirror, offset planes. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion;
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f04, {
      lead: '<p class="lead">Designers measure first. In this mission you’ll design an organizer for <i>your</i> desk, locker or workbench — with a compartment sized for each thing you want it to hold.</p>' +
        '<p>You’ll hollow out a block with <b>Shell</b>, sketch right on the inside floor, and use a <b>Rectangular Pattern</b> so one divider becomes several. Finger notches are cut into the walls and copied to the other side with <b>Mirror</b>.</p>',
      edp: [1, 2, 4, 5, 6, 7], hand: ['Your design (.f3d)', 'A print file (.stl)', 'A screenshot', 'Your measurements'],
      previewCap: 'A 120 × 80 × 50 mm block, shelled to 2.5 mm walls, with one divider patterned along the box and two mirrored finger notches.',
      preview: function (api, T) {
        var g = new T.Group(), w = 2.5, L = 120, W = 80, H = 50;
        var s = new T.Shape(); s.moveTo(-L / 2, -W / 2); s.lineTo(L / 2, -W / 2); s.lineTo(L / 2, W / 2); s.lineTo(-L / 2, W / 2); s.closePath();
        var h = new T.Path(); h.moveTo(-L / 2 + w, -W / 2 + w); h.lineTo(-L / 2 + w, W / 2 - w); h.lineTo(L / 2 - w, W / 2 - w); h.lineTo(L / 2 - w, -W / 2 + w); h.closePath(); s.holes.push(h);
        g.add(F.solid(T, F.extrude(T, s, H - w, w))); var fl = new T.BoxGeometry(L, W, w); fl.translate(0, 0, w / 2); g.add(F.solid(T, fl));
        [35, 95].forEach(function (x) { var d = new T.BoxGeometry(w, W - 2 * w, 40); d.translate(-L / 2 + w + x + w / 2, 0, w + 20); g.add(F.solid(T, d)); });
        api.root.add(g); return new T.Box3(new T.Vector3(-60, -40, 0), new T.Vector3(60, 40, 50));
      }
    });
  } });

  steps.push({ id: 'measure', title: 'Ask & measure', stage: '01 Ask · 02 Research', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Pick 2–4 things your organizer will hold (pencils, a phone, sticky notes, earbuds, a calculator…). Measure each one with a ruler or calipers. Add a few millimetres so things drop in easily.</p>');
    UI.note(b, ctx, { id: 'n-items', label: 'What will it hold? For each thing: its width × depth × height in mm, plus the space you’ll give it.', placeholder: 'Pencils: Ø8, 175 long → compartment 30 mm wide\nSticky notes: 76 × 76 → compartment 80 mm wide', rows: 5 });
    UI.html(b, '<h2>Try it</h2><p>A <b>shell</b> hollows out a solid, leaving walls of the thickness you choose. A <b>rectangular pattern</b> copies a feature in a row: you set the quantity and the distance between copies. Try to make compartments that would fit your things.</p>');
    F.organizerLab(b, ctx, 'lab-org');
    UI.mcq(b, ctx, { id: 'q-pattern', q: 'You need 4 identical dividers 30 mm apart. What’s the best way in Fusion?', options: ['Sketch and extrude all 4 separately', 'Make one divider, then Rectangular Pattern it: quantity 4, distance 30 mm', 'Make one and use Copy/Paste 3 times', 'Shell the box 4 times'], answer: 1, explain: 'With a pattern, changing one number (the quantity or the distance) updates every divider. Copies made by hand don’t update together.' });
  } });

  steps.push({ id: 'shell', title: 'Block & shell', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Start a new design. Use what you learned in Mission F1 to make the block: a <b>Center Rectangle</b> sketch on the XY plane (120 × 80 mm, or your sizes) and a 50 mm Extrude. Then hollow it out.</p>');
    F.shots(b, { title: 'Shell the block', ctx: ctx, key: 'w-shell', steps: [
      { img: 'f4-shell0', view: 'full', cap: '<b>MODIFY ▸ Shell</b>. The panel asks for <b>Faces/Body</b>: the faces you click will be removed (left open).', marks: [{ t: 'click', x: 500, y: 123 }, { t: 'click', x: 434, y: 202 }, { t: 'box', x: 1143, y: 262, w: 224, h: 140 }] },
      { img: 'f4-shell', view: [860, 420, 900], cap: 'Click the <b>top face</b>, type <b>2.5</b> for the <b>Inside Thickness</b> and click <b>OK</b>. The block becomes a tray with 2.5 mm walls and floor.', marks: [{ t: 'click', x: 686, y: 330 }, { t: 'type', x: 1235, y: 296, w: 90, h: 20, text: '2.5', align: 'left' }, { t: 'click', x: 1257, y: 440 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-shell', q: 'You shell the box but forget to click the top face first. What do you get?', options: ['An open tray', 'A hollow closed box: walls all round with the empty space sealed inside', 'An error', 'A solid block'], answer: 1, explain: 'With no face removed, Shell hollows the inside and keeps every face closed — useful for some designs, but not for an organizer.' });
  } });

  steps.push({ id: 'divider', title: 'Sketch on a face', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">You don’t have to sketch on the origin planes. Click <b>any flat face</b> of your model to sketch right on it. Here you’ll sketch the first divider on the inside floor.</p>');
    F.shots(b, { title: 'Sketch the first divider', ctx: ctx, key: 'w-div', steps: [
      { img: 'f4-facesketch', view: [680, 490, 760], cap: '<b>Create Sketch</b> and click the inside floor. Press <kbd>R</kbd> for a 2-point rectangle and draw a thin strip from the back wall to the front wall. Dimension it <b>2.5</b> thick and <b>35</b> from the left wall (or your size).', marks: [{ t: 'key', k: 'R' }, { t: 'click', x: 601, y: 341 }, { t: 'click', x: 611, y: 641 }, { t: 'key', k: 'D' }] },
      { img: 'f4-divider', view: [760, 430, 960], cap: '<b>Finish Sketch</b>, press <kbd>E</kbd>, click the thin strip and extrude it up <b>40</b> mm — a little lower than the walls, so it’s easy to reach in.', marks: [{ t: 'key', k: 'E' }, { t: 'click', x: 601, y: 450 }, { t: 'type', x: 1282, y: 437, w: 108, h: 22, text: '40', align: 'left' }, { t: 'click', x: 1257, y: 534 }] }
    ] });
  } });

  steps.push({ id: 'pattern', title: 'Rectangular pattern', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    F.shots(b, { title: 'Pattern the divider', ctx: ctx, key: 'w-pat', steps: [
      { img: 'createmenu', view: [300, 380, 600], cap: 'Open <b>CREATE ▾</b> and point at <b>Pattern</b>…', marks: [{ t: 'click', x: 252, y: 123 }, { t: 'click', x: 157, y: 509 }] },
      { img: 'patternmenu', view: [300, 420, 600], cap: '…and choose <b>Rectangular Pattern</b>.', marks: [{ t: 'click', x: 345, y: 509 }] },
      { img: 'f4-pattern', view: 'full', cap: 'Set <b>Object Type</b> to <b>Features</b>, then click the divider’s Extrude in the timeline. Click the <b>Axis</b> box and pick a long bottom edge of the box: that’s the direction. Type the <b>Distance</b> (60) and set <b>Quantity</b> to 2 (the second direction stays at 1). The blue copies preview. <b>OK</b>.', marks: [{ t: 'click', x: 1268, y: 324 }, { t: 'click', x: 227, y: 870 }, { t: 'click', x: 1230, y: 380 }, { t: 'click', x: 540, y: 684 }, { t: 'type', x: 1268, y: 530, w: 100, h: 20, text: '60', align: 'left' }, { t: 'click', x: 1257, y: 749 }] }
    ] });
    UI.callout(b, '', 'Pattern going the wrong way?', '<p>If the copies go outside the box, type a negative distance (<b>-60</b>) or click the flip arrow. To make the gaps equal, use <b>Distance Type: Extent</b> and the total length instead.</p>');
  } });

  steps.push({ id: 'notch', title: 'Cut & mirror', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Finger notches make it easy to grab things out. You’ll sketch a circle on an outside wall, <b>cut</b> it into the top edge, then <b>mirror</b> the cut to the opposite wall so both sides match.</p>');
    F.shots(b, { title: 'A notch on each side', ctx: ctx, key: 'w-notch', steps: [
      { img: 'f4-notch', view: [700, 380, 700], cap: '<b>Create Sketch</b> on the long outside wall. Draw a circle with its centre on the top edge, and dimension it <b>Ø30</b>.', marks: [{ t: 'click', x: 216, y: 97 }, { t: 'click', x: 791, y: 228 }, { t: 'circle', x: 791, y: 228, r: 78 }] },
      { img: 'f4-cut', view: [760, 430, 960], cap: '<b>Finish Sketch</b>, <kbd>E</kbd>, and click the half of the circle that’s <i>on</i> the wall. Type <b>-3</b> to go into the wall: Fusion switches the <b>Operation</b> to <b>Cut</b> by itself. <b>OK</b>.', marks: [{ t: 'key', k: 'E' }, { t: 'click', x: 618, y: 548 }, { t: 'type', x: 1282, y: 437, w: 108, h: 22, text: '-3', align: 'left' }, { t: 'click', x: 1257, y: 562 }] },
      { img: 'f4-mirror', view: 'full', cap: '<b>CREATE ▸ Mirror</b>. <b>Object Type: Features</b>, click the cut in the timeline, then pick the <b>XZ</b> plane in the browser’s Origin folder as the <b>Mirror Plane</b> — it runs through the middle of the box. <b>OK</b>.', marks: [{ t: 'click', x: 293, y: 870 }, { t: 'click', x: 1230, y: 352 }, { t: 'click', x: 127, y: 415 }, { t: 'click', x: 1257, y: 412 }] },
      { img: 'f4-final', view: 'full', cap: 'Your organizer: shelled, divided and notched — and every part of it still changes when you change a number in the timeline.', marks: [] }
    ] });
    UI.callout(b, '', 'Offset planes', '<p>Need to sketch somewhere there’s no face, like halfway up the box? <b>CONSTRUCT ▸ Offset Plane</b> makes a new plane a set distance from another one. You’ll use these in Mission F7.</p>');
    F.exportReminder(b);
    F.stlCheck(b, ctx, 'stl');
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Fit:</b> Measure each compartment: every item you planned for fits with a little room.',
      '<b>Walls:</b> at least 2 mm thick everywhere.',
      '<b>Pattern:</b> the dividers come from one feature and a pattern (check the timeline).',
      '<b>Mirror:</b> the notches match on both sides.',
      '<b>Size:</b> it fits on the Bambu Lab A1 bed (256 × 256 mm) and prints in a reasonable time.'
    ] });
    UI.challenges(b, [
      { tag: 'Pattern', cls: 'c', title: 'A grid', html: 'Use the second direction of the Rectangular Pattern to make a grid of pen holes in a raised block.' },
      { tag: 'Design', title: 'Label it', html: 'Engrave a word on each compartment’s front wall (Text, then Extrude Cut −0.6 mm).' },
      { tag: 'Modify', title: 'Soft corners', html: 'Fillet the outside vertical edges (5 mm) and the top edges (1 mm). Do it last, so the fillets don’t get in the way of the other features.' },
      { tag: 'Shell', cls: 'c', title: 'Save plastic', html: 'Reduce the wall thickness to 1.6 mm and check the print time in Bambu Studio. How much faster is it?' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What did you change after testing, and why?', placeholder: 'I found that… so I…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f04 = {
    steps: steps,
    evidence: F.evidence('organizer', 'Hand in your organizer: the Fusion design, the STL and a screenshot. If it’s been printed, add a photo with your things in it.', [
      { id: 'r1', q: 'What does Shell do? Which face did you remove, and how thick were your walls?' },
      { id: 'r2', q: 'Explain how you made your dividers with a pattern instead of drawing each one.' },
      { id: 'r3', q: 'How did your measurements decide the size of each compartment? Give an example.' },
      { id: 'r4', q: 'Why use Mirror for the second notch instead of drawing it again?' }
    ], [{ id: 'photo', kind: 'photo', label: 'A photo of your printed organizer (optional)', help: 'With the things it holds.', required: false, max: 2 }])
  };
})(window);
