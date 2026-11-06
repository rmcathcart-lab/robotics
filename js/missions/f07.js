/* Mission F7: Bottle & handle — offset planes, loft, shell, plane along path, sweep. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion;
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f07, {
      lead: '<p class="lead">Extrude and revolve make boxy and round shapes. But a bottle that’s round at the bottom and hexagonal at the top, or a curved mug handle? For those, Fusion has <b>Loft</b> and <b>Sweep</b>.</p>' +
        '<p>You’ll stack profiles on <b>offset planes</b>, loft a smooth vase through them, shell it, then sweep a circle along a curved path to add a handle.</p>',
      edp: [3, 4, 5, 6, 7],
      previewCap: 'Loft through a Ø40 circle, a Ø24 circle and a hexagon, shelled to 2 mm walls.',
      preview: function (api, T) {
        var n = 96, pr = [['circle', 40, 0], ['circle', 24, 35], ['hexagon', 36, 75]].map(function (p) {
          var out = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, r = p[1] / 2; if (p[0] === 'hexagon') { var seg = Math.PI / 3, a0 = Math.floor(a / seg) * seg, x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r, x1 = Math.cos(a0 + seg) * r, y1 = Math.sin(a0 + seg) * r, dx = x1 - x0, dy = y1 - y0, det = Math.cos(a) * dy - Math.sin(a) * dx, s = (x0 * dy - y0 * dx) / det; out.push([Math.cos(a) * s, Math.sin(a) * s]); } else out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out; });
        api.root.add(new T.Mesh(F.loftGeometry(T, pr, [0, 35, 75], n), new T.MeshStandardMaterial({ color: 0xa3a8ad, metalness: 0.2, roughness: 0.45, side: T.DoubleSide })));
        return new T.Box3(new T.Vector3(-22, -22, 0), new T.Vector3(22, 22, 75));
      }
    });
  } });

  steps.push({ id: 'loft', title: 'Loft', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead"><b>Loft</b> builds a smooth shape through two or more profiles on different planes, in order — like stretching a skin over rings. The profiles can be different shapes: a circle can turn into a square.</p><h2>Try it</h2><p>Pick a shape and size for each profile and move the middle one up and down.</p>');
    F.loftLab(b, ctx, 'lab-loft');
    UI.mcq(b, ctx, { id: 'q-loft', q: 'Which job needs Loft rather than Extrude or Revolve?', options: ['A square block', 'A round cup with straight sides', 'A bottle that’s round at the bottom and square at the top', 'A flat name tag'], answer: 2, explain: 'Changing from one shape to another along the way is exactly what Loft does. The others are simple extrudes or revolves.' });
  } });

  steps.push({ id: 'planes', title: 'Profiles on offset planes', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Each profile needs its own sketch on its own plane. <b>Offset planes</b> are copies of a plane, a set distance away.</p>');
    F.shots(b, { title: 'Stack three profiles', ctx: ctx, key: 'w-planes', steps: [
      { img: 'constructmenu', view: [900, 300, 600], cap: 'Sketch a <b>Ø40</b> circle at the origin on the XY plane and finish the sketch. Then <b>CONSTRUCT ▾ ▸ Offset Plane</b>.', marks: [{ t: 'click', x: 853, y: 123 }, { t: 'click', x: 861, y: 163 }] },
      { img: 'f7-offsetplane', view: [860, 440, 900], cap: 'Click the XY plane, type <b>35</b> and click <b>OK</b>. Make another one at <b>75</b> mm. They appear in a <b>Construction</b> folder in the browser.', marks: [{ t: 'click', x: 790, y: 498 }, { t: 'type', x: 958, y: 432, w: 110, h: 22, text: '35' }, { t: 'click', x: 1257, y: 468 }] },
      { img: 'f7-profiles', view: [760, 440, 700], cap: 'Sketch on the first offset plane: a <b>Ø24</b> circle at the projected origin. On the top plane, use <b>CREATE ▸ Polygon ▸ Inscribed Polygon</b> for a hexagon: radius <b>18</b>, <b>6</b> sides. Seen from the top, the three profiles nest inside each other.', marks: [{ t: 'ring', x: 686, y: 491, r: 48 }, { t: 'ring', x: 686, y: 491, r: 80 }] }
    ] });
  } });

  steps.push({ id: 'loftit', title: 'Loft & shell', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    F.shots(b, { title: 'Loft through the profiles', ctx: ctx, key: 'w-loft', steps: [
      { img: 'createmenu', view: [300, 300, 600], cap: '<b>CREATE ▾ ▸ Loft</b>.', marks: [{ t: 'click', x: 252, y: 123 }, { t: 'click', x: 149, y: 278 }] },
      { img: 'f7-loft', view: 'full', cap: 'Click the profiles <b>in order</b>: bottom circle, middle circle, top hexagon. The panel lists Profile 1, 2, 3 and the preview stretches through them. <b>OK</b>.', marks: [{ t: 'click', x: 640, y: 745 }, { t: 'click', x: 668, y: 640 }, { t: 'click', x: 650, y: 520 }, { t: 'box', x: 1008, y: 342, w: 330, h: 74 }, { t: 'click', x: 1257, y: 729 }] },
      { img: 'f7-vase', view: 'full', cap: '<b>MODIFY ▸ Shell</b>, click the top (hexagon) face, <b>2</b> mm. Now it’s a vase.', marks: [{ t: 'click', x: 686, y: 512 }] }
    ] });
    UI.callout(b, '', 'Loft looks twisted?', '<p>Fusion matches the points of each profile. If the surface twists, try sketching the profiles so their corners line up, or add <b>Rails</b> (guide curves) in the Loft panel.</p>');
  } });

  steps.push({ id: 'sweep', title: 'Sweep a handle', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead"><b>Sweep</b> pulls a profile along a <b>path</b>, like squeezing icing out of a bag along a line. Handles, pipes, springs and rails are all sweeps.</p>');
    F.shots(b, { title: 'Add a curved handle', ctx: ctx, key: 'w-sweep', steps: [
      { img: 'f7-path', view: [700, 650, 560], cap: 'Sketch on the <b>XZ</b> plane (it cuts through the middle of the vase). Use <b>Fit Point Spline</b> to draw the handle’s path: start on the side of the vase, loop out, and end lower down on the side. Finish the sketch.', marks: [{ t: 'click', x: 650, y: 585 }, { t: 'click', x: 722, y: 610 }, { t: 'click', x: 728, y: 690 }, { t: 'click', x: 648, y: 735 }] },
      { img: 'constructmenu', view: [900, 300, 600], cap: 'The handle’s cross-section needs a plane at the start of the path, square to it: <b>CONSTRUCT ▸ Plane Along Path</b>. Click the path and set the distance to <b>0</b> (the start). Sketch a <b>Ø10</b> circle on that plane, centred on the path’s end.', marks: [{ t: 'click', x: 853, y: 123 }, { t: 'click', x: 872, y: 297 }] },
      { img: 'f7-sweep', view: 'full', cap: '<b>CREATE ▸ Sweep</b>. <b>Profile</b>: the small circle. <b>Path</b>: the spline. The handle previews along the curve. Set <b>Operation</b> to <b>Join</b> so it becomes part of the vase. <b>OK</b>.', marks: [{ t: 'click', x: 724, y: 590 }, { t: 'click', x: 1228, y: 379 }, { t: 'click', x: 789, y: 670 }, { t: 'click', x: 1257, y: 580 }] },
      { img: 'f7-final', view: 'full', cap: 'Hide the sketches and construction planes (the eye icons in the browser). A lofted, shelled body with a swept handle: shapes you couldn’t make with extrude and revolve alone.', marks: [{ t: 'click', x: 62, y: 328 }, { t: 'click', x: 62, y: 350 }] }
    ] });
    F.exportReminder(b);
    F.stlCheck(b, ctx, 'stl');
  } });

  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Loft:</b> the body passes through at least three profiles on offset planes.',
      '<b>Shell:</b> walls are at least 1.6 mm and the top is open.',
      '<b>Sweep:</b> the handle is joined to the body (one body in the browser).',
      '<b>Comfort:</b> the handle has room for a finger: at least 20 mm inside.',
      '<b>STL:</b> closed, and under 100 mm tall.'
    ] });
    UI.challenges(b, [
      { tag: 'Loft', cls: 'c', title: 'Twist', html: 'Rotate the top hexagon sketch 30° (a sketch dimension on an angle). What happens to the loft?' },
      { tag: 'Sweep', title: 'Taper', html: 'Edit the sweep and add a <b>Taper Angle</b> so the handle gets thinner toward the bottom.' },
      { tag: 'Loft', title: 'Rails', html: 'Draw a curved line from the bottom profile to the top one and use it as a <b>Rail</b> in the loft to control the shape of the side.' },
      { tag: 'Design', cls: 'c', title: 'A pencil cup', html: 'Use loft and sweep to design a pencil cup with a handle for your desk.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'What would you design next with loft or sweep?', placeholder: 'I’d like to…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f07 = {
    steps: steps,
    evidence: F.evidence('vase and handle', 'Hand in your vase: the Fusion design, the STL and a screenshot showing the timeline.', [
      { id: 'r1', q: 'Explain how Loft made your vase. Why did you need offset planes?' },
      { id: 'r2', q: 'Explain how Sweep made the handle. What was the profile and what was the path?' },
      { id: 'r3', q: 'When would you choose Loft, Sweep, Revolve or Extrude? Give an example object for each.' },
      { id: 'r4', q: 'What problem did you run into, and how did you fix it?' }
    ])
  };
})(window);
