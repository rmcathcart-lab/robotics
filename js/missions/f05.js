/* Mission F5: Fidget spinner — user parameters, formulas, circular pattern, holes, tolerances and a press fit. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion;
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f05, {
      lead: '<p class="lead">What if you could change a whole design by typing one number? In this mission you’ll build a fidget spinner from <b>user parameters</b> — named numbers like <code>arms</code> and <code>bearing</code> — so a 3-arm spinner becomes a 5-arm spinner in seconds.</p>' +
        '<p>It also has to fit a real part: a <b>608 skateboard bearing</b> (22 mm across, 8 mm hole, 7 mm thick). You’ll learn why a 22 mm part doesn’t go in a 22 mm hole, and design a <b>press fit</b> that holds it tight.</p>',
      edp: [2, 4, 5, 6, 7], hand: ['Your design (.f3d)', 'A print file (.stl)', 'A screenshot of your parameters'],
      previewCap: 'Every size comes from a parameter: bearing (22 mm + tolerance), arms (3), thick (7 mm).',
      preview: function (api, T) {
        api.root.add(F.spinnerGroup(T, { arms: 3, thick: 7, reach: 30, tol: 0.2, bearing: 22, wall: 7 }, F.MAT.body(T)));
        return new T.Box3(new T.Vector3(-48, -48, 0), new T.Vector3(48, 48, 7));
      }
    });
    UI.callout(b, 'safety', 'Bearings', '<p>Push bearings in by pressing on the <b>outer ring</b> only, on a flat table — never hammer them. Pushing on the middle can wreck the bearing.</p>');
  } });

  steps.push({ id: 'params', title: 'Parameters & tolerance', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>user parameter</b> is a named number you create in Fusion. Instead of typing <b>22.2</b> into a dimension, you type <code>bearing</code>. You can even type formulas like <code>bearing + 2 * thick</code>. Change the parameter later and every dimension that uses it updates.</p>' +
      '<p>A <b>tolerance</b> is the extra space you leave so parts fit. 3D printed holes come out a little smaller than designed, so a hole for a 22 mm bearing needs to be designed a little bigger.</p><h2>Try it</h2>');
    F.spinnerLab(b, ctx, 'lab-spin');
    UI.numq(b, ctx, { id: 'q-tol', q: 'The bearing is 22 mm. You want a press fit with 0.2 mm tolerance. What diameter should the hole be?', answer: 22.2, tol: 0.001, unit: 'mm', explain: '22 + 0.2 = 22.2 mm. That’s the number your <code>bearing</code> parameter will hold.', hint: 'Add the tolerance to the bearing size.' });
  } });

  steps.push({ id: 'create', title: 'Create the parameters', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Start a new design. Before you sketch anything, set up three parameters.</p><table class="fx-plan"><thead><tr><th>Name</th><th>Unit</th><th>Expression</th><th>Why</th></tr></thead><tbody><tr><td><code>bearing</code></td><td>mm</td><td>22.2</td><td>608 bearing (22) + 0.2 mm press-fit tolerance</td></tr><tr><td><code>arms</code></td><td>No Units</td><td>3</td><td>How many arms</td></tr><tr><td><code>thick</code></td><td>mm</td><td>7</td><td>As thick as the bearing</td></tr></tbody></table>');
    F.shots(b, { title: 'Add user parameters', ctx: ctx, key: 'w-par', steps: [
      { img: 'modifymenu', view: [420, 420, 640], cap: '<b>MODIFY ▾ ▸ Change Parameters</b>.', marks: [{ t: 'click', x: 500, y: 123 }, { t: 'click', x: 468, y: 550 }] },
      { img: 'f5-addparam', view: [760, 400, 820], cap: 'Click the <b>+</b> next to <b>User Parameters</b>. Type the <b>Name</b> (<code>bearing</code>), leave <b>Unit</b> as mm, type the <b>Expression</b> (<b>22.2</b>) and a comment so you remember why. <b>OK</b>.', marks: [{ t: 'click', x: 1068, y: 253 }, { t: 'type', x: 857, y: 312, w: 150, h: 22, text: 'bearing', align: 'left' }, { t: 'type', x: 857, y: 380, w: 150, h: 22, text: '22.2', align: 'left' }, { t: 'click', x: 838, y: 528 }] },
      { img: 'f5-params', view: [820, 380, 1000], cap: 'Add <code>arms</code> (choose <b>No Units</b>, expression 3) and <code>thick</code> (7 mm) the same way. All three appear under User Parameters. Close the window.', marks: [{ t: 'box', x: 296, y: 362, w: 1064, h: 82 }] }
    ] });
  } });

  steps.push({ id: 'sketch', title: 'Sketch with parameters', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    F.shots(b, { title: 'Type names instead of numbers', ctx: ctx, key: 'w-sk', steps: [
      { img: 'f5-typeparam', view: [700, 480, 500], cap: 'Sketch on the XY plane. Draw a circle at the origin and, instead of a number, type <code>bearing</code>. Fusion suggests the parameter as you type. <kbd>Enter</kbd>.', marks: [{ t: 'click', x: 216, y: 97 }, { t: 'click', x: 686, y: 491 }, { t: 'type', x: 738, y: 491, w: 110, h: 22, text: 'bearing', align: 'left' }, { t: 'key', k: 'Enter' }] },
      { img: 'f5-formula', view: [700, 430, 560], cap: 'Draw a second circle at the origin and type the formula <code>bearing+2*thick</code> — a 7 mm ring around the bearing. Then draw an arm: a circle above the middle with the same formula, and a <code>bearing</code> circle inside it.', marks: [{ t: 'click', x: 686, y: 341 }, { t: 'type', x: 760, y: 341, w: 160, h: 22, text: 'bearing+2*thick', align: 'left' }, { t: 'key', k: 'Enter' }] },
      { img: 'f5-circpattern', view: [760, 470, 760], cap: 'Join the arm to the middle with two lines. Now <b>CREATE ▸ Circular Pattern</b>: pick the arm’s circles and lines, click the <b>origin</b> as the centre, and type <code>arms</code> for the <b>Quantity</b>. <b>OK</b>.', marks: [{ t: 'click', x: 232, y: 123 }, { t: 'click', x: 176, y: 392 }, { t: 'click', x: 686, y: 269 }, { t: 'click', x: 686, y: 491 }, { t: 'type', x: 1045, y: 408, w: 100, h: 20, text: 'arms', align: 'left' }, { t: 'click', x: 1027, y: 440 }] },
      { img: 'f5-extrude', view: 'full', cap: '<b>Finish Sketch</b>, <kbd>E</kbd>, and select every area except the three bearing holes (hold <kbd>⌘</kbd>/<kbd>Ctrl</kbd> to add to the selection). Type <code>thick</code> for the distance. <b>OK</b>.', marks: [{ t: 'key', k: 'E' }, { t: 'type', x: 1280, y: 437, w: 100, h: 20, text: 'thick', align: 'left' }, { t: 'click', x: 1257, y: 534 }] }
    ] });
  } });

  steps.push({ id: 'change', title: 'Change a parameter', stage: '06 Test', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">This is the payoff. Change <code>arms</code> from 3 to 4 and watch what happens — and what doesn’t.</p>');
    F.shots(b, { title: 'From 3 arms to 4', ctx: ctx, key: 'w-chg', steps: [
      { img: 'f5-arms4', view: [820, 400, 1000], cap: 'Open <b>Change Parameters</b>, double-click <code>arms</code>’ expression and type <b>4</b>. <kbd>Enter</kbd>, then close.', marks: [{ t: 'click', x: 960, y: 402 }, { t: 'type', x: 700, y: 402, w: 120, h: 22, text: '4', align: 'left' }] },
      { img: 'f5-arms4result', view: 'full', cap: 'The sketch now has 4 arms… but the body still has 3! The extrude only uses the profiles you picked, and the new arm’s profiles weren’t picked.', marks: [{ t: 'ring', x: 686, y: 470, r: 160 }] },
      { img: 'f5-editfeature', view: 'full', cap: 'Fix it: double-click the Extrude in the timeline. The new arm shows unselected; hold <kbd>⌘</kbd>/<kbd>Ctrl</kbd>, click its areas, and <b>OK</b>. Lesson: after changing a parameter, check the features that use it.', marks: [{ t: 'click', x: 160, y: 870 }, { t: 'ring', x: 803, y: 558, r: 60 }] }
    ] });
    UI.callout(b, '', 'The Hole tool', '<p><b>CREATE ▸ Hole</b> makes holes on a face from a point, with options for counterbores and threads. For simple round holes a circle and a cut extrude work too. Holes for screws are where the Hole tool shines.</p>');
  } });

  steps.push({ id: 'fit', title: 'Test the fit', stage: '06 Test · 07 Improve', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Every printer is a little different. Before printing the whole spinner, print a <b>test ring</b>: just the middle ring, 3 mm thick. It takes a few minutes and tells you if your tolerance is right.</p>' +
      '<ol><li>Change <code>thick</code> to 3 and export just the middle ring (or make a test design).</li><li>Print it on the Bambu Lab A1.</li><li>Press a bearing in. Too tight? Make <code>bearing</code> 22.3. Falls out? Make it 22.1.</li><li>Set <code>thick</code> back to 7 and export the whole spinner.</li></ol>');
    F.exportReminder(b);
    F.stlCheck(b, ctx, 'stl');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Parameters:</b> bearing, arms and thick exist and are used in the sketch and extrude.',
      '<b>Change test:</b> changing <code>arms</code> updates the design (after fixing the extrude).',
      '<b>Fit:</b> the test ring holds a bearing snugly.',
      '<b>Balance:</b> the arms are evenly spaced (circular pattern) so it spins smoothly.'
    ] });
    UI.challenges(b, [
      { tag: 'Parameters', cls: 'c', title: 'Weighted arms', html: 'Put bearings in the arms too (as weights) — your design already has the holes. Does it spin longer?' },
      { tag: 'Parameters', title: 'New parameter', html: 'Add a <code>reach</code> parameter for the distance from the centre to each arm, and use it in a dimension.' },
      { tag: 'Modify', title: 'Smooth it', html: 'Fillet the edges where the arms meet the middle so it’s comfortable in your fingers.' },
      { tag: 'Design', cls: 'c', title: 'Your own shape', html: 'Replace the round arms with a shape of your own, keeping the bearing holes as parameters.' }
    ]);
    UI.note(b, ctx, { id: 'n-fit', label: 'What tolerance did you end up with, and how did you test it?', placeholder: 'I tried 22.2 and…' });
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f05 = {
    steps: steps,
    evidence: F.evidence('spinner', 'Hand in your spinner: the Fusion design, the STL and screenshots of the model and of your Parameters window.', [
      { id: 'r1', q: 'What is a user parameter? Explain how you used bearing, arms and thick.' },
      { id: 'r2', q: 'Why is the bearing hole bigger than 22 mm? What is a tolerance?' },
      { id: 'r3', q: 'What happened when you changed arms, and what did you have to fix?' },
      { id: 'r4', q: 'Describe your fit test and what you changed because of it.' }
    ])
  };
})(window);
