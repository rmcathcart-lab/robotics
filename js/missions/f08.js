/* Mission F8: Design challenge — the whole design process, a drawing, slicing in Bambu Studio and a real print. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion, el = RL.el;
  var steps = [];

  steps.push({ id: 'brief', title: 'Mission brief', time: '15 min', render: function (b, ctx) {
    F.brief(b, RL.MISSIONS.f08, {
      lead: '<p class="lead">This time there’s no plan to follow. You’ll find a real problem that a real person has, design something to solve it, model it in Fusion with the tools from this unit, print it on the Bambu Lab A1, and test it with them.</p>' +
        '<p>That’s the design process — the same one product designers and engineers use: <b>Ask, Research, Imagine, Plan, Create, Test, Improve</b>. You’ll go around it at least twice.</p>',
      edp: [1, 2, 3, 4, 5, 6, 7], hand: ['Your design (.f3d)', 'A print file (.stl)', 'A drawing (PDF)', 'Photos: sketches, prototype, testing', 'Your design journal']
    });
    UI.html(b, '<h2>Ideas to get you started</h2><div class="fx-ideas">' + ['A cable organizer for a desk', 'A custom phone or tablet stand for a family member', 'A tool holder for a workshop wall', 'A replacement knob or part for something broken at home', 'A plant pot with a drainage tray', 'A game piece or puzzle', 'A hook or clip for a backpack', 'A holder for a hearing aid, glasses or earbuds case', 'An aid that makes a task easier for someone (opening jars, holding a pencil)'].map(function (t) { return '<span class="tag">' + t + '</span>'; }).join(' ') + '</div>');
    UI.callout(b, '', 'Rules', '<ul><li>It must solve a real problem for a real person (it can be you, but someone else is better).</li><li>It must fit on the printer (256 × 256 × 256 mm) and print in under 3 hours.</li><li>It must use at least <b>four</b> tools from this unit beyond sketch and extrude.</li><li>Check your idea with your teacher before you start modelling.</li></ul>');
  } });

  steps.push({ id: 'ask', title: 'Ask: interview your user', stage: '01 Ask', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Designers don’t guess what people need — they ask. Interview your user for 5–10 minutes. Listen more than you talk, and ask about what they do, not what they want you to make.</p>' +
      '<h2>Good interview questions</h2><ul><li>Tell me about the last time you… (did the task).</li><li>What’s the most annoying part?</li><li>What have you tried to fix it? What happened?</li><li>Where does this happen? What else is nearby?</li><li>If it worked perfectly, what would be different?</li></ul>');
    UI.note(b, ctx, { id: 'n-user', label: 'Who is your user, and what did you learn from the interview?', placeholder: 'My user is… They told me…', rows: 5 });
    UI.note(b, ctx, { id: 'n-problem', label: 'Problem statement: ___ needs a way to ___ because ___.', placeholder: 'My grandpa needs a way to hold his tablet while cooking because…', rows: 2 });
  } });

  steps.push({ id: 'research', title: 'Research & imagine', stage: '02 Research · 03 Imagine', time: '60 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Look at what already exists, measure everything your design has to fit, and then sketch lots of ideas on paper — at least five, and quickly. Quantity first; the good idea usually isn’t the first one.</p>');
    UI.note(b, ctx, { id: 'n-research', label: 'What already exists? What’s good and bad about it?', placeholder: 'I found… It’s good because… but…', rows: 3 });
    UI.note(b, ctx, { id: 'n-req', label: 'Requirements: what must your design do? (measurable where you can, e.g. “holds a 10 mm thick tablet at 60°”)', placeholder: '1. Must…\n2. Must…\n3. Should…', rows: 5 });
    UI.note(b, ctx, { id: 'n-measure', label: 'Measurements of everything it has to fit (with your clearances):', placeholder: 'Tablet: 245 × 170 × 9 mm → slot 10 mm', rows: 3 });
    UI.callout(b, '', 'Sketch on paper', '<p>Do your 5+ idea sketches on paper and take a photo for your evidence. Then pick one with your user: ask which they’d use and why.</p>');
  } });

  steps.push({ id: 'plan', title: 'Plan: choose your tools', stage: '04 Plan', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before you open Fusion, plan how you’ll build it. Which tools from this unit will make each part? Tick the ones you’ll use (at least four beyond sketch and extrude).</p>');
    var TOOLS = [['Fillet / chamfer', 'F1, F2'], ['Text', 'F1'], ['Constraints', 'F2'], ['Symmetric extrude', 'F2'], ['Revolve', 'F3'], ['Spline', 'F3'], ['Shell', 'F4'], ['Rectangular pattern', 'F4'], ['Mirror', 'F4'], ['Cut extrude', 'F4'], ['User parameters', 'F5'], ['Circular pattern', 'F5'], ['Hole', 'F5'], ['Components & joints', 'F6'], ['Clearance / tolerance', 'F5, F6'], ['Offset planes', 'F7'], ['Loft', 'F7'], ['Sweep', 'F7']];
    var saved = ctx.check('tools') || {}, grid = el('div', 'gear fx-tools');
    TOOLS.forEach(function (t, i) {
      var bt = el('button', 'gear-it' + (saved[i] ? ' got' : '')); bt.type = 'button'; bt.setAttribute('aria-pressed', saved[i] ? 'true' : 'false');
      bt.innerHTML = '<b>' + t[0] + '</b><span class="small">Mission ' + t[1] + '</span><span class="chkm">' + (saved[i] ? '✓ Using it' : 'Tap to use') + '</span>';
      bt.addEventListener('click', function () { saved[i] = !saved[i]; if (!saved[i]) delete saved[i]; bt.classList.toggle('got', !!saved[i]); bt.setAttribute('aria-pressed', saved[i] ? 'true' : 'false'); bt.querySelector('.chkm').textContent = saved[i] ? '✓ Using it' : 'Tap to use'; ctx.check('tools', saved); count(); });
      grid.appendChild(bt);
    });
    b.appendChild(grid);
    var c = el('p', 'small muted'); b.appendChild(c);
    function count() { var n = Object.keys(saved).length; c.innerHTML = n + ' tools picked' + (n >= 4 ? ' — good.' : ' (pick at least 4).'); }
    count();
    UI.note(b, ctx, { id: 'n-plan', label: 'Your build plan: which features, in what order? (e.g. 1. sketch base profile, 2. symmetric extrude, 3. shell…)', placeholder: '1.\n2.\n3.\n4.', rows: 6 });
    UI.callout(b, '', 'Use parameters', '<p>If a size might change after testing (a slot, a hole, a thickness), make it a <b>user parameter</b> now. Changing it later takes seconds.</p>');
  } });

  steps.push({ id: 'create', title: 'Create: model it', stage: '05 Create', time: '2–3 classes', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Build your design in Fusion, in a new design in your Robotics Missions project. Work through your plan one feature at a time and save often.</p>');
    UI.tests(b, ctx, { id: 'milestones', rows: [
      '<b>Milestone 1:</b> the main shape is modelled, from a fully defined sketch.',
      '<b>Milestone 2:</b> all the features from your plan are in the timeline.',
      '<b>Milestone 3:</b> Measure checks every size against your requirements.',
      '<b>Milestone 4:</b> edges are filleted or chamfered; it looks finished.',
      '<b>Milestone 5:</b> your teacher has seen it before you print.'
    ] });
    UI.callout(b, '', 'Stuck?', '<p>Go back to the mission that taught the tool you need — every walk-through is still there. Rename features in the timeline (double-click a name) so you can find them, and use <b>File ▸ Save</b> with a version note before big changes.</p>');
  } });

  steps.push({ id: 'drawing', title: 'Make a drawing', stage: '04 Plan · 05 Create', time: '30 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A <b>drawing</b> is a flat page that shows your design from standard views with dimensions, so someone else could make or check it. Fusion makes drawings straight from your 3D model. <b>Save your design first</b> (in your Robotics Missions project): a drawing needs a saved design to point to.</p>');
    F.shots(b, { title: 'Start the drawing', ctx: ctx, key: 'w-draw', steps: [
      { img: 'f8-newdrawing', view: [680, 430, 820], cap: 'With your design open, <b>File ▸ New…</b> and pick <b>Drawing</b>. The <b>Design</b> line shows which design it will draw. Untick <b>Automate</b> so you place the views yourself (leave it ticked and Fusion places views and dimensions for you). <b>Create New</b>.', marks: [{ t: 'click', x: 372, y: 508 }, { t: 'box', x: 736, y: 376, w: 140, h: 56 }, { t: 'click', x: 1003, y: 638 }] },
      { img: 'f8-createdrawing', view: [1052, 460, 640], cap: 'Choose <b>Manual</b>, keep <b>ISO</b> and <b>mm</b>, and set <b>Sheet Size</b> to <b>A4</b> so it prints on normal paper. <b>OK</b>. The drawing opens in a new tab.', marks: [{ t: 'box', x: 1196, y: 284, w: 66, h: 24 }, { t: 'click', x: 1225, y: 502 }, { t: 'click', x: 1258, y: 647 }] },
      { img: 'f8-baseview', view: 'full', cap: 'The <b>base view</b> follows your mouse. Pick the <b>Orientation</b> that shows the most about your part (here the Front view shows the stand’s profile), set the <b>Scale</b> to <b>1:1</b> if it fits, click on the sheet to place it, and click <b>OK</b>.', marks: [{ t: 'box', x: 1256, y: 305, w: 82, h: 24 }, { t: 'type', x: 1296, y: 373, w: 80, h: 22, text: '1:1', align: 'left' }, { t: 'click', x: 470, y: 380 }, { t: 'click', x: 1257, y: 630 }] }
    ] });
    F.shots(b, { title: 'Views, dimensions and a PDF', ctx: ctx, key: 'w-draw2', steps: [
      { img: 'f8-projected', view: 'full', cap: '<b>Projected View</b> (second icon), click the base view, then move the mouse to the side or above: the matching view follows. Click to place it, then press <kbd>Enter</kbd>. Hidden edges show as dashed lines.', marks: [{ t: 'click', x: 60, y: 97 }, { t: 'click', x: 470, y: 450 }, { t: 'move', x: 780, y: 385 }, { t: 'click', x: 790, y: 385 }, { t: 'key', k: 'Enter' }] },
      { img: 'f8-dimension', view: 'full', cap: '<b>Dimension</b> (first icon in DIMENSIONS): click an edge, move away from the part and click to place the number. Click two lines to dimension an angle.', marks: [{ t: 'click', x: 519, y: 97 }, { t: 'click', x: 470, y: 476 }, { t: 'click', x: 472, y: 512 }] },
      { img: 'f8-dimensioned', view: 'full', cap: 'Add the sizes that matter: overall length, width and height, and anything that has to fit (here the angle and the lip). The title block fills in the part name, your name and the date by itself.', marks: [{ t: 'box', x: 556, y: 640, w: 560, h: 147 }] },
      { img: 'f8-exportmenu', view: [1100, 300, 600], cap: '<b>EXPORT ▾ ▸ Export PDF</b>…', marks: [{ t: 'click', x: 1228, y: 123 }, { t: 'click', x: 1243, y: 143 }] },
      { img: 'f8-exportpdf', view: [1072, 300, 600], cap: '…<b>OK</b>, and save the PDF where you can find it: that’s the drawing you hand in. Save the drawing too (<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>S</kbd>); it updates when you change the design.', marks: [{ t: 'click', x: 1258, y: 264 }] }
    ] });
    UI.mcq(b, ctx, { id: 'q-draw', q: 'Which dimensions belong on your drawing?', options: ['Every single dimension from every sketch', 'The overall sizes and the sizes that have to fit something', 'None: the 3D model is enough', 'Only the height'], answer: 1, explain: 'A drawing communicates what matters. Overall sizes and fit-critical sizes (holes, slots) are what someone checking or making it needs.' });
  } });

  steps.push({ id: 'print', title: 'Slice & print', stage: '05 Create', time: '30 min + printing', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The printer doesn’t understand your design — it understands layers. <b>Bambu Studio</b> (the slicer) cuts your model into layers and works out the path for each one. Fusion can send your model straight to it.</p>');
    F.shots(b, { title: 'From Fusion to Bambu Studio', ctx: ctx, key: 'w-slice', steps: [
      { img: 'f8-sendbambu', view: 'full', cap: '<b>File ▸ 3D Print</b>. Set <b>Preparation Type</b> to <b>Print Utility</b> and <b>Application</b> to <b>Bambu Studio</b>, click your body, and <b>OK</b>. Bambu Studio opens with your model. (No Bambu Studio on this computer? Export an STL instead and drag it onto the Bambu Studio plate.)', marks: [{ t: 'box', x: 1240, y: 284, w: 98, h: 24 }, { t: 'box', x: 1240, y: 349, w: 98, h: 24 }, { t: 'click', x: 740, y: 420 }, { t: 'click', x: 1257, y: 600 }] },
      { img: 'f8-bambu-plate', view: 'full', cap: 'If it asks to simplify colours, click <b>Skip</b>. Check the left side: printer <b>Bambu Lab A1</b>, filament <b>PLA Basic</b>, process <b>0.20mm Standard @BBL A1</b>. Put the biggest flat face down: select the part and use <b>Lay on face</b> (or press <kbd>F</kbd>) and click a face.', marks: [{ t: 'box', x: 6, y: 126, w: 190, h: 86 }, { t: 'box', x: 34, y: 389, w: 122, h: 26 }, { t: 'box', x: 34, y: 471, w: 282, h: 24 }, { t: 'ring', x: 798, y: 113, r: 22 }] },
      { img: 'f8-bambu-support', view: 'full', cap: '<b>Supports:</b> overhangs steeper than about 45° need them. Tick <b>Enable support</b> on the <b>Support</b> tab only if your part needs it (and try to design them away next time). The <b>Strength</b> tab has walls and infill: 15% infill is plenty for most parts.', marks: [{ t: 'click', x: 190, y: 516 }, { t: 'box', x: 14, y: 568, w: 230, h: 22 }] },
      { img: 'f8-bambu-sliced', view: 'full', cap: 'Click <b>Slice plate</b>. The <b>Preview</b> tab shows the filament used and the print time: this stand takes 49 g and about 1 h 16 min.', marks: [{ t: 'click', x: 1190, y: 75 }, { t: 'box', x: 848, y: 160, w: 410, h: 136 }] },
      { img: 'f8-bambu-layers', view: 'full', cap: 'Drag the slider on the right down to look inside: the criss-cross pattern is the <b>infill</b>. Check the first layers sit flat on the plate.', marks: [{ t: 'drag', x1: 1341, y1: 197, x2: 1341, y2: 560 }] },
      { img: 'f8-bambu-printmenu', view: [1090, 232, 560], cap: 'The arrow beside <b>Print plate</b> has <b>Send</b> (to a printer on the network) and <b>Export plate sliced file</b> (to copy to the A1’s microSD card). <b>Ask your teacher before you print.</b>', marks: [{ t: 'click', x: 1261, y: 75 }, { t: 'box', x: 1190, y: 92, w: 180, h: 140 }] }
    ] });
    F.stlCheck(b, ctx, 'stl');
    UI.note(b, ctx, { id: 'n-slice', label: 'Bambu Studio says: print time ___, filament ___ g. Supports? Orientation?', placeholder: '1 h 20 min, 18 g, no supports, lying on its back', rows: 2 });
  } });

  steps.push({ id: 'test', title: 'Test with your user & improve', stage: '06 Test · 07 Improve', time: '45 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Give your prototype to your user and watch them use it — don’t explain it first. What works? What confuses them? What breaks?</p>');
    UI.note(b, ctx, { id: 'n-test', label: 'Test results: check each requirement. What did your user say and do?', placeholder: 'Requirement 1: PASS — …\nRequirement 2: RETRY — …\nMy user said…', rows: 6 });
    UI.note(b, ctx, { id: 'n-v2', label: 'Version 2: what will you change, and which tool will you use?', placeholder: 'The slot was too tight, so I’ll change the slot parameter from 10 to 11 mm…', rows: 3 });
    UI.callout(b, '', 'Go around again', '<p>Make your changes, print version 2 if there’s time, and test again. Your grade cares more about how you used testing to improve than about the first version being perfect.</p>');
  } });

  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f08 = {
    steps: steps,
    evidence: F.evidence('design', 'Hand in your design challenge: the Fusion design, the STL, your drawing as a PDF, and photos of your paper sketches, your prototype and your user testing it.', [
      { id: 'r1', q: 'Who was your user and what problem did you solve? How did the interview change your idea?' },
      { id: 'r2', q: 'Which Fusion tools did you use, and why did you choose each one?' },
      { id: 'r3', q: 'What happened when your user tested it? Which requirements passed and which didn’t?' },
      { id: 'r4', q: 'What did you change in version 2 (or what would you change), and why?' }
    ], [
      { id: 'drawing', kind: 'other', ext: ['pdf'], extHelp: 'In the drawing: EXPORT ▸ Export PDF.', label: 'Your drawing (PDF)', help: 'In the drawing: EXPORT ▸ Export PDF.', required: true, max: 1 },
      { id: 'photos', kind: 'photo', label: 'Photos: sketches, prototype and testing', help: 'Your paper idea sketches, the printed prototype, and your user using it. Up to 6.', required: true, max: 6 }
    ])
  };
})(window);
