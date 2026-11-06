/* Mission F6: Box with a snap lid — hybrid designs, components, clearance, joints, interference, section analysis. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion;
  var steps = [];

  function boxModel(T, open) {
    var g = new T.Group(), L = 60, W = 40, H = 30, w = 2;
    var s = new T.Shape(); s.moveTo(-L / 2, -W / 2); s.lineTo(L / 2, -W / 2); s.lineTo(L / 2, W / 2); s.lineTo(-L / 2, W / 2); s.closePath();
    var h = new T.Path(); h.moveTo(-L / 2 + w, -W / 2 + w); h.lineTo(-L / 2 + w, W / 2 - w); h.lineTo(L / 2 - w, W / 2 - w); h.lineTo(L / 2 - w, -W / 2 + w); h.closePath(); s.holes.push(h);
    g.add(F.solid(T, F.extrude(T, s, H - w, w))); var fl = new T.BoxGeometry(L, W, w); fl.translate(0, 0, w / 2); g.add(F.solid(T, fl));
    var lid = new T.Group(), top = new T.BoxGeometry(L, W, 2); top.translate(0, 0, 1); lid.add(F.solid(T, top, new T.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.5 })));
    var lip = new T.BoxGeometry(L - 4.4, W - 4.4, 3); lip.translate(0, 0, -1.5); lid.add(F.solid(T, lip, new T.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.5 })));
    lid.position.set(open ? 0 : 0, 0, H + (open ? 18 : 0)); if (open) lid.rotation.x = -0.35;
    g.add(lid); return g;
  }

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f06, {
      lead: '<p class="lead">Most products are made of more than one part that have to fit together. In this mission you’ll design a small box and a lid that <b>snaps on</b> — two parts, modelled as two <b>components</b> in one design.</p>' +
        '<p>You’ll leave just the right <b>clearance</b> between them, connect them with a <b>joint</b>, and use Fusion’s <b>Interference</b> and <b>Section Analysis</b> to check the fit before anything is printed.</p>',
      edp: [3, 4, 5, 6, 7], hand: ['Your design (.f3d)', 'STL files for the box and the lid', 'A screenshot of your section analysis'],
      previewCap: 'Two components: the box (grey) and the lid (blue). The lid’s lip is 0.2 mm smaller than the opening on every side.',
      preview: function (api, T) { api.root.add(boxModel(T, true)); return new T.Box3(new T.Vector3(-32, -30, 0), new T.Vector3(32, 30, 60)); }
    });
  } });

  steps.push({ id: 'components', title: 'Components', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">So far every design had one body. When a product has parts that move or come apart, each part should be its own <b>component</b>. A component is like a folder for one part: its own sketches, bodies and origin. Components can be joined with joints, moved, and exported separately.</p>' +
      '<table class="fx-plan"><thead><tr><th>Body</th><th>Component</th></tr></thead><tbody><tr><td>A chunk of solid shape</td><td>A part: it holds bodies, sketches and its own origin</td></tr><tr><td>Bodies in one component can be joined or cut together</td><td>Components can be connected with joints and move</td></tr><tr><td>Fine for one-part designs (F1–F5)</td><td>Use for anything with more than one part</td></tr></tbody></table>');
    F.shots(b, { title: 'A design with components', ctx: ctx, key: 'w-comp', steps: [
      { img: 'f6-hybrid', view: [680, 430, 820], cap: 'Start a new design and choose <b>Hybrid Design</b> in the window that opens: it can hold several components. (Already in a Part Design? Start a new one.) <b>Create New</b>.', marks: [{ t: 'click', x: 644, y: 320 }, { t: 'click', x: 1003, y: 638 }] },
      { img: 'f6-assemblemenu', view: [760, 300, 560], cap: 'The <b>ASSEMBLE</b> group now has the tools for components and joints. <b>New Component</b> is near the top of the menu (and on the toolbar: the icon with the green +).', marks: [{ t: 'click', x: 741, y: 123 }, { t: 'box', x: 686, y: 152, w: 190, h: 22 }] },
      { img: 'f6-newcomp', view: [1000, 400, 760], cap: 'Click <b>New Component</b>, name it <b>Box</b> and click <b>OK</b>. It appears in the browser with a dot beside it: that’s the <b>active</b> component, where new sketches and bodies go.', marks: [{ t: 'click', x: 743, y: 97 }, { t: 'type', x: 1237, y: 455, w: 196, h: 22, text: 'Box', align: 'left' }, { t: 'click', x: 1257, y: 543 }] }
    ] });
    UI.html(b, '<p>With <b>Box</b> active, make the box like the organizer in F4: a <b>60 × 40</b> centre rectangle on the XY plane, extruded <b>30</b> mm, then <b>Shell</b> it with the top face removed and <b>2</b> mm walls.</p>');
    UI.mcq(b, ctx, { id: 'q-comp', q: 'Why should the lid be a separate component instead of just another body?', options: ['Components print faster', 'So it can move, be joined to the box, and be exported as its own part', 'Bodies can’t be blue', 'Fusion only allows one body per design'], answer: 1, explain: 'Components are parts. They can be connected with joints that move, checked for interference, and exported separately.' });
  } });

  steps.push({ id: 'lid', title: 'Model the lid with clearance', stage: '05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The lid is a flat plate with a <b>lip</b> underneath that fits inside the box opening. If the lip is the exact same size as the opening, it won’t fit: printed parts come out a tiny bit bigger. You need <b>clearance</b>.</p><h2>Try it</h2>');
    F.clearanceLab(b, ctx, 'lab-clear');
    UI.numq(b, ctx, { id: 'q-lip', q: 'The opening inside the box is 56 × 36 mm. With 0.2 mm clearance on every side, how long should the lip be (the 56 mm direction)?', answer: 55.6, tol: 0.001, unit: 'mm', explain: '56 − 0.2 − 0.2 = 55.6 mm. Clearance is on both sides, so you take it off twice.', hint: 'The gap is on the left side and the right side.' });
    F.shots(b, { title: 'Sketch the lid', ctx: ctx, key: 'w-lid', steps: [
      { img: 'f6-lidsketch', view: [860, 500, 720], cap: 'Activate the top level of the design (hover over it in the browser and click the dot), make a <b>New Component</b> called <b>Lid</b>, and sketch on the XY plane beside the box: a <b>60 × 40</b> centre rectangle and, at the same centre, a <b>55.6 × 35.6</b> one.', marks: [{ t: 'click', x: 1006, y: 491 }, { t: 'label', x: 1006, y: 640, text: '60 × 40', dx: 0, dy: 26 }, { t: 'label', x: 812, y: 490, text: '35.6', dx: -60, dy: 50 }] }
    ] });
    UI.html(b, '<p><b>Finish Sketch</b>. Extrude <b>both</b> profiles up <b>2</b> mm (the plate). Then extrude only the inner profile <b>−3</b> mm (down) with <b>Operation: Join</b>: that’s the lip.</p>');
  } });

  steps.push({ id: 'joint', title: 'Join them with a joint', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>joint</b> connects two components and says how they can move: <b>Rigid</b> (locked together), <b>Revolute</b> (turns like a hinge), <b>Slider</b> and more. You click a snap point on each component, and Fusion brings them together.</p>');
    F.shots(b, { title: 'Snap the lid onto the box', ctx: ctx, key: 'w-joint', steps: [
      { img: 'f6-joint1', view: [860, 560, 860], cap: 'Press <kbd>J</kbd>. Hover over the <b>underside</b> of the lid’s plate (orbit to see it): snap points appear at corners, edge midpoints and the centre. Click the <b>centre</b>.', marks: [{ t: 'key', k: 'J' }, { t: 'click', x: 868, y: 664 }] },
      { img: 'f6-joint2', view: [700, 420, 860], cap: 'Now hover over the box’s top rim and click the matching snap point. The lid jumps into place. On the <b>Motion</b> tab, <b>Rigid</b> locks it shut; <b>Slider</b> lets it lift straight up. Click <b>OK</b>.', marks: [{ t: 'move', x: 405, y: 355 }, { t: 'box', x: 1120, y: 285, w: 108, h: 24 }] }
    ] });
    UI.callout(b, '', 'Joint jumped the wrong way?', '<p>Use <b>Flip</b> in the Joint panel, or <b>Offset Z</b> to move it up or down. You can also move the lid into place with <b>MODIFY ▸ Move/Copy</b> (press <kbd>M</kbd>) — type X, Y and Z distances — and then use <b>As-Built Joint</b>.</p>');
  } });

  steps.push({ id: 'check', title: 'Check the fit', stage: '06 Test', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Two checks catch problems before you waste plastic.</p>');
    F.shots(b, { title: 'Interference and section analysis', ctx: ctx, key: 'w-check', steps: [
      { img: 'f6-interference', view: 'full', cap: '<b>INSPECT ▸ Interference</b>. Select both components and click the <b>Compute</b> button. Here Fusion found <b>384 mm³</b> where the lid and box overlap (red): the lid sat 1 mm too low. Fix the position, compute again until it says there’s no interference.', marks: [{ t: 'box', x: 370, y: 336, w: 498, h: 58 }] },
      { img: 'f6-section', view: 'full', cap: '<b>INSPECT ▸ Section Analysis</b> and pick the YZ plane: it slices the model so you can see inside. Yellow and blue hatching are the cut faces of the two parts. Zoom in on the lip to see the gap.', marks: [{ t: 'ring', x: 680, y: 545, r: 70 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-int', q: 'Interference finds 0 mm³ of overlap, but Section Analysis shows the lip touching the wall with no gap. Will the printed lid fit?', options: ['Yes: no interference means it fits', 'Probably not: zero gap is too tight for printed parts', 'Yes, if you print slowly', 'Only if the lid is printed first'], answer: 1, explain: 'No interference just means the parts don’t overlap on screen. Printed parts need real clearance (about 0.2 mm) to fit.' });
    UI.callout(b, '', 'Export both parts', '<p>Right-click each component in the browser and choose <b>Save As Mesh</b> (STL), or use <b>File ▸ Export…</b> for the whole design. Print the lid upside down (flat top on the bed) so the lip comes out clean.</p>');
    F.stlCheck(b, ctx, 'stl');
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Components:</b> the browser shows Box and Lid, each with its own body.',
      '<b>Clearance:</b> the lip is 0.2 mm smaller than the opening on every side.',
      '<b>Interference:</b> the check finds no overlap.',
      '<b>Section:</b> a section view shows a gap between the lip and the wall.',
      '<b>Print:</b> once printed, the lid goes on and stays on.'
    ] });
    UI.challenges(b, [
      { tag: 'Joints', cls: 'c', title: 'Hinged lid', html: 'Replace the snap lid with a hinge: add a pin and knuckles and use a <b>Revolute</b> joint. Use <b>ASSEMBLE ▸ Drive Joints</b> to open and close it.' },
      { tag: 'Clearance', title: 'Snap bump', html: 'Add a small bump (0.4 mm) around the lip and a groove inside the box wall so it clicks shut.' },
      { tag: 'Components', title: 'A third part', html: 'Add a removable tray inside the box as a third component. Check it with Interference too.' },
      { tag: 'Design', cls: 'c', title: 'For something', html: 'Size the box for something real: earbuds, a USB stick, a set of dice. Measure first!' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'How did the fit turn out, and what would you change?', placeholder: 'The lid was… so I…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f06 = {
    steps: steps,
    evidence: F.evidence('box and lid', 'Hand in your box and lid: the Fusion design, STL files for both parts, and a screenshot of a section view through the lid.', [
      { id: 'r1', q: 'What is the difference between a body and a component? Why are the box and lid components?' },
      { id: 'r2', q: 'How much clearance did you use, and how did you work out the lip size?' },
      { id: 'r3', q: 'What did the Interference check and the Section Analysis show you?' },
      { id: 'r4', q: 'What kind of joint did you use, and what does it allow?' }
    ])
  };
})(window);
