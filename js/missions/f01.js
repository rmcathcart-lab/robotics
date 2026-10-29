/* Mission F1: Name tag keychain — the first Fusion 360 mission.
 * Each "In Fusion" walk-through uses real screenshots of Fusion (assets/fusion/), with the cursor, clicks, typing and key
 * presses animated on top (RL.Fusion.shots). Each tool is tried first in a lab on the page, then done in Fusion. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, F = RL.Fusion, el = RL.el, esc = RL.esc;
  var steps = [];
  function fig(b, html) { UI.html(b, '<figure class="fx-fig">' + html + '</figure>'); }
  /* a small screenshot strip with labels under it (navigation bar, timeline) */
  function strip(b, img, w, h, labels, caption) {
    var svg = '<svg viewBox="0 0 ' + w + ' ' + (h + 58) + '" style="width:100%;max-width:' + Math.round(w * 1.25) + 'px;display:block">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="6" fill="#f4f5f6"/><image href="' + F.img(img) + '" x="0" y="0" width="' + w + '" height="' + h + '"/>' +
      labels.map(function (l) { return '<line x1="' + l[0] + '" y1="' + (h - 4) + '" x2="' + l[0] + '" y2="' + (h + 10 + (l[2] || 0)) + '" stroke="#22d3ee" stroke-width="1.5"/><text x="' + l[0] + '" y="' + (h + 24 + (l[2] || 0)) + '" text-anchor="middle" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="13" fill="#e6f1fa">' + esc(l[1]) + '</text>'; }).join('') + '</svg>';
    fig(b, svg + (caption ? '<figcaption>' + caption + '</figcaption>' : ''));
  }

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var m = RL.MISSIONS.f01, wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = '<p class="lead">Almost everything around you — your phone case, a chair, a bike part — was designed first as a 3D model on a computer. Engineers and designers use programs like <b>Autodesk Fusion</b> to do it. In this unit, you’ll learn Fusion one tool at a time by building real things you can 3D print.</p>' +
      '<p>Your first build: a keychain with your name on it. On the way you’ll learn to move around in 3D, draw an exact 2D sketch, turn it into a solid, round the corners, add text, and export a file a 3D printer can use.</p>';
    UI.edp(left, [4, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll need</span>' + m.parts.concat(m.extras).map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">You’ll hand in</span><span class="tag">Your design (.f3d)</span><span class="tag">A print file (.stl)</span><span class="tag">A screenshot</span></div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Preview</span><h3>What you’re building</h3></div>'; b.appendChild(box);
    var v = F.viewer(box, { height: 320, gridSize: 75, helpText: 'Drag to turn it around · Scroll or pinch to zoom' });
    box.appendChild(el('div', 'xp-cap', '<p>A 50 × 20 mm tag, 4 mm thick, with rounded corners, a hole for the key ring and your name raised 1 mm. It takes about an hour to print.</p>'));
    Promise.all([v.ready, F.font()]).then(function (r) {
      var T = v.T, k = F.keychain(T, r[1], { text: 'ALEX', size: 9, style: 'raised', r: 4 }); v.root.add(k);
      var hb = new T.Box3(new T.Vector3(-26, -11, 0), new T.Vector3(26, 11, 5)); v.setHome(hb, 1.1); v.fit(hb, { now: true, pad: 1.1 });
      var spin = true; v.canvas.addEventListener('pointerdown', function () { spin = false; }); v.canvas.addEventListener('wheel', function () { spin = false; });
      (function sp() { if (!spin || !v.canvas.isConnected) return; v.state.theta += 0.0035; v.render(); requestAnimationFrame(sp); })();
    }).catch(function () {});
    UI.callout(b, '', 'How this guide works', '<p>Each Fusion step has a walk-through made from real Fusion screens. It zooms in on the part that matters, the cursor shows you exactly what to click, and anything you type or any key you press pops up. Press <b>▶ Play all</b> to watch it like a video, or go one step at a time with <b>Next</b>. Then do it yourself in Fusion.</p><p>Before each tool there’s a <b>Try it</b> lab on this page, so you know what the tool does before you use it for real.</p>');
    UI.callout(b, '', 'Tip', '<p>Put this guide and Fusion side by side (or on two screens) so you can follow along without switching back and forth.</p>');
  } });

  /* ---------- 02 open Fusion ---------- */
  steps.push({ id: 'setup', title: 'Open Fusion', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Open Autodesk Fusion and sign in with the Autodesk account your teacher set up for you. When it opens you’ll see an empty design: a grid floating in space.</p>' +
      '<p>Fusion saves your work to the cloud, inside <b>projects</b> (like folders). Your teacher will tell you which project to use for this class.</p>');
    F.shots(b, { title: 'Start a new design and check the units', ctx: ctx, key: 'w-setup', steps: [
      { img: 'ui-empty', view: 'full', cap: 'This is a new, empty design. If Fusion opened something else, use <b>File ▸ New Design</b> (or the <b>+</b> at the top for a new tab).', marks: [{ t: 'ring', x: 1183, y: 44, r: 16 }, { t: 'label', x: 1183, y: 44, text: 'New tab', dx: -40, dy: 40 }] },
      { img: 'ui-empty', view: [240, 200, 520], cap: 'The top-left box says <b>DESIGN</b>: you’re in the Design workspace, where 3D models are made. Leave it there.', marks: [{ t: 'box', x: 12, y: 70, w: 98, h: 52 }] },
      { img: 'ui-empty', view: [240, 220, 520], cap: 'Under <b>Document Settings</b> in the browser it should say <b>Units: mm, g</b> — millimetres. Every size in this unit is in millimetres. If it says something else, hover over Units, click the pencil that appears and choose <b>Millimeter</b>.', marks: [{ t: 'box', x: 70, y: 208, w: 100, h: 22 }, { t: 'move', x: 135, y: 219 }] }
    ] });
    UI.callout(b, '', 'Good habits', '<p>Give every design a clear name (you’ll make a lot of them this unit), save often with <kbd>Ctrl</kbd> + <kbd>S</kbd> (<kbd>⌘</kbd> + <kbd>S</kbd> on a Mac), and only ever work in your own files.</p>');
  } });

  /* ---------- 03 tour ---------- */
  steps.push({ id: 'tour', title: 'Tour the Fusion window', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Fusion looks busy, but you only need a few parts of the window to start. Tap each glowing dot to see what that part does.</p>');
    F.hotspotShot(b, { title: 'The Fusion window', img: 'ui-empty', ctx: ctx, key: 'tour', spots: [
      { id: 'tabs', x: 152, y: 68, title: 'Toolbar tabs', html: '<p><b>SOLID</b> is where you’ll spend this unit: it has the tools for solid 3D models. The other tabs (SURFACE, MESH, SHEET METAL…) are for other kinds of models.</p>' },
      { id: 'create', x: 252, y: 123, title: 'CREATE', html: '<p>Tools that make new things: <b>Create Sketch</b> (the first icon), <b>Extrude</b>, Revolve and more. Click the word <b>CREATE ▾</b> to see the full list.</p>' },
      { id: 'modify', x: 535, y: 123, title: 'MODIFY', html: '<p>Tools that change what you’ve made: <b>Fillet</b> (round edges), Chamfer (bevel edges), Shell (hollow out) and Move.</p>' },
      { id: 'inspect', x: 942, y: 123, title: 'INSPECT', html: '<p><b>Measure</b> lives here: click two things to see the distance between them.</p>' },
      { id: 'browser', x: 30, y: 152, title: 'Browser', html: '<p>A list of everything in your design: settings, sketches, bodies and the <b>Origin</b> (the planes and axes everything is built from). The eye icons hide and show things.</p>' },
      { id: 'cube', x: 1305, y: 200, title: 'ViewCube', html: '<p>Shows which way you’re looking. Click a face (TOP, FRONT, RIGHT…), an edge or a corner to jump to that view. The little house beside it is the <b>Home</b> view.</p>' },
      { id: 'canvas', x: 686, y: 491, title: 'Canvas & origin', html: '<p>The big grid is the <b>canvas</b>, where your model appears. The dot in the middle is the <b>origin</b>: the point (0, 0, 0). Good designs are built around it.</p>' },
      { id: 'nav', x: 690, y: 829, title: 'Navigation bar', html: '<p>Tools to <b>orbit</b>, <b>pan</b>, <b>zoom</b> and <b>fit</b> the view, plus display settings. Handy if you don’t have a mouse with a wheel.</p>' },
      { id: 'timeline', x: 60, y: 871, title: 'Timeline', html: '<p>Every step you do (each sketch, extrude, fillet…) is saved here in order. You can double-click a step to change it later, and the model rebuilds itself. This is what makes Fusion <b>parametric</b>.</p>' },
      { id: 'file', x: 78, y: 44, title: 'File menu', html: '<p>Save, Export (to make files to hand in or print) and 3D Print.</p>' }
    ] });
    UI.mcq(b, ctx, { id: 'q-tour', q: 'You made a mistake three steps ago. Where can you find that step to fix it?', options: ['The browser', 'The timeline', 'The ViewCube', 'The navigation bar'], answer: 1, explain: 'The timeline keeps every step in order. Double-click a step to change it — everything after it updates.', hints: { 0: 'The browser lists what’s in the design (sketches, bodies), not the order you did things in.', 2: 'The ViewCube only changes which way you’re looking.', 3: 'The navigation bar moves the view, it doesn’t change the model.' } });
  } });

  /* ---------- 04 navigation ---------- */
  steps.push({ id: 'navigate', title: 'Move around in 3D', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before you build anything, you need to be able to look at it from any side. There are three moves: <b>zoom</b> (closer and farther), <b>pan</b> (slide sideways) and <b>orbit</b> (turn around it).</p>' +
      '<table class="fx-plan"><thead><tr><th>To…</th><th>With a mouse in Fusion</th></tr></thead><tbody>' +
      '<tr><td><b>Zoom</b></td><td>Roll the scroll wheel. It zooms toward wherever the cursor is.</td></tr>' +
      '<tr><td><b>Pan</b></td><td>Hold the scroll wheel down (it’s also a button) and drag.</td></tr>' +
      '<tr><td><b>Orbit</b></td><td>Hold <kbd>Shift</kbd>, hold the scroll wheel down, and drag.</td></tr>' +
      '<tr><td><b>Jump to a view</b></td><td>Click a face, edge or corner of the ViewCube.</td></tr>' +
      '<tr><td><b>Get un-lost</b></td><td>Click the <b>Home</b> house beside the ViewCube, or <b>Fit</b> in the navigation bar (<kbd>F6</kbd>) to see the whole model.</td></tr></tbody></table>');
    strip(b, 'navbar', 507, 62, [[45, 'Orbit'], [110, 'Look At', 14], [163, 'Pan'], [210, 'Zoom', 14], [262, 'Fit'], [326, 'Display', 14], [382, 'Grid'], [446, 'Viewports', 14]], 'No mouse? The navigation bar at the bottom of Fusion has the same moves: click <b>Orbit</b>, <b>Pan</b> or <b>Zoom</b>, then drag in the canvas. Press <kbd>Esc</kbd> to stop. (A mouse with a wheel makes Fusion much easier.)');
    UI.html(b, '<h2>Practise: find the hidden word</h2><p>Each face of this cube has a letter. Orbit until you’re looking straight at a face to reveal it. Here you can drag with the left button to orbit (or <kbd>Shift</kbd> + middle-drag like in Fusion), right-drag to pan, and scroll to zoom. Try the ViewCube in the corner and the Home button too.</p>');
    F.navTrainer(b, ctx, 'nav');
    UI.mcq(b, ctx, { id: 'q-nav', q: 'In Fusion, how do you <b>orbit</b> (turn the view around the model) with a mouse?', options: ['Roll the scroll wheel', 'Hold the scroll wheel down and drag', 'Hold Shift, hold the scroll wheel down and drag', 'Left-click and drag'], answer: 2, explain: 'Shift + middle-drag orbits. Without Shift, middle-drag pans.', hints: { 0: 'The wheel zooms.', 1: 'That pans (slides) the view.', 3: 'In Fusion, left-drag draws a selection box.' } });
    UI.callout(b, '', 'In Fusion', '<p>Try the same moves in your empty Fusion design now: zoom in and out on the grid, pan it sideways, orbit underneath it, then click Home. Keep practising until it feels natural — you’ll do it hundreds of times.</p>');
  } });

  /* ---------- 05 sketches ---------- */
  steps.push({ id: 'sketch', title: 'Sketches & dimensions', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Nearly every 3D model in Fusion starts as a flat <b>sketch</b>: lines, rectangles and circles drawn on a plane. A closed shape in a sketch is called a <b>profile</b> — Fusion shades it light blue. Later you’ll pull profiles up into 3D.</p>' +
      '<p>Sketches need exact sizes. You add them with <b>dimensions</b>: numbers attached to the sketch that lock a length, a diameter or a distance. Fusion colours your sketch to show what’s locked:</p>');
    UI.html(b, '<div class="fx-pair" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">' +
      '<figure class="fx-fig" style="margin:0"><img src="' + F.img('underdefined') + '" alt="A rectangle with a blue circle in it"><figcaption><b>Blue</b> = under-defined. The circle can still be dragged around, because nothing says exactly where it goes.</figcaption></figure>' +
      '<figure class="fx-fig" style="margin:0"><img src="' + F.img('defined') + '" alt="The same sketch, all black, with dimensions"><figcaption><b>Black</b> = fully defined. Every size and position is set by a dimension, so nothing can move by accident.</figcaption></figure></div>');
    UI.html(b, '<p style="margin-top:16px">A fully defined (all black) sketch is a habit of good designers: when you change one number later, the rest of the design changes the way you expect.</p><h2>Try it</h2><p>Here’s a sketch that’s still blue. Drag things to see what can move. Then use <b>Sketch Dimension</b> to lock it down until it’s all black, using the keychain plan: a <b>50 × 20</b> tag, a <b>Ø5</b> hole, <b>6 mm</b> from the left edge and <b>10 mm</b> from the bottom edge.</p>');
    F.sketchLab(b, ctx, 'lab-sketch');
    UI.mcq(b, ctx, { id: 'q-sketch', q: 'You finish a sketch and one line is still <b>blue</b>. What does that mean?', options: ['It’s selected', 'It isn’t fully defined: it could still move or change size', 'It has an error and won’t extrude', 'It’s a construction line'], answer: 1, explain: 'Blue means under-defined. It will still extrude, but it could change by accident. Add a dimension or constraint to make it black.', hints: { 2: 'Under-defined sketches still work — they just aren’t locked.', 3: 'Construction lines are dashed, not blue.' } });
  } });

  /* ---------- 06 build the sketch ---------- */
  steps.push({ id: 'sketchit', title: 'Build it: the tag sketch', stage: '05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Time for the real thing. You’ll draw the keychain’s sketch in Fusion: a rectangle centred on the origin and a circle for the key-ring hole, fully defined.</p>' +
      '<table class="fx-plan"><thead><tr><th>Part</th><th>Plan</th></tr></thead><tbody><tr><td>Tag</td><td>Center rectangle on the origin, <b>50 mm</b> wide × <b>20 mm</b> tall</td></tr><tr><td>Hole</td><td>Circle, <b>Ø5 mm</b>, centre <b>6 mm</b> from the left edge and <b>10 mm</b> from the bottom edge</td></tr></tbody></table>');
    F.shots(b, { title: 'Sketch the tag', ctx: ctx, key: 'w-sketch', steps: [
      { img: 'ui-empty', view: [330, 220, 660], cap: 'In the SOLID tab, click <b>Create Sketch</b>: the first icon under CREATE.', marks: [{ t: 'ring', x: 137, y: 97, r: 20 }, { t: 'click', x: 137, y: 97 }, { t: 'label', x: 137, y: 97, text: 'Create Sketch', dx: 30, dy: 50 }] },
      { img: 'planes', view: [720, 450, 620], cap: 'Three planes appear. Click the flat one lying on the ground: the <b>XY plane</b>. The view turns to look straight down at it.', marks: [{ t: 'label', x: 770, y: 492, text: 'XY plane', dx: 60, dy: 40 }, { t: 'click', x: 770, y: 492 }] },
      { img: 'sketchmode', view: 'full', cap: 'You’re sketching now. The toolbar switched to the <b>SKETCH</b> tab, the ViewCube says <b>TOP</b>, and the <b>Sketch Palette</b> opened on the right. The green check, <b>Finish Sketch</b>, is how you leave when you’re done.', marks: [{ t: 'ring', x: 765, y: 68, r: 24 }, { t: 'ring', x: 1307, y: 200, r: 36 }, { t: 'box', x: 1143, y: 262, w: 224, h: 420 }, { t: 'ring', x: 1289, y: 97, r: 22 }, { t: 'label', x: 1289, y: 97, text: 'Finish Sketch', dx: -150, dy: 48 }] },
      { img: 'rectmenu', view: [310, 300, 640], cap: 'Open <b>CREATE ▾</b>, point at <b>Rectangle</b> and choose <b>Center Rectangle</b>. A center rectangle grows out from its middle, so yours will be centred on the origin.', marks: [{ t: 'click', x: 232, y: 123 }, { t: 'move', x: 163, y: 182 }, { t: 'click', x: 372, y: 220 }, { t: 'ring', x: 372, y: 220, r: 18 }] },
      { img: 'rectdraw', view: [686, 510, 640], cap: 'Click the <b>origin</b> (the dot in the middle) to put the centre there. Then move the mouse outward — don’t click again yet. Two boxes appear for typing the size.', marks: [{ t: 'click', x: 686, y: 491 }, { t: 'move', x: 800, y: 432, ms: 900 }, { t: 'ring', x: 535, y: 478, r: 30 }, { t: 'ring', x: 720, y: 611, r: 30 }] },
      { img: 'recttype', view: [640, 520, 600], cap: 'The first box is highlighted: type <b>20</b> for the height. Press <kbd>Tab</kbd> to jump to the other box, type <b>50</b> for the width, and press <kbd>Enter</kbd>.', marks: [{ t: 'type', x: 540, y: 495, w: 82, h: 24, text: '20' }, { t: 'key', k: 'Tab' }, { t: 'type', x: 717, y: 610, w: 120, h: 24, text: '50' }, { t: 'key', k: 'Enter' }] },
      { img: 'rectdone', view: [660, 515, 560], cap: 'A 50 × 20 mm rectangle, with its two dimensions. Its lines are black: the size is set and the centre is stuck to the origin.', marks: [{ t: 'label', x: 686, y: 594, text: 'width 50', dx: 90, dy: 30 }, { t: 'label', x: 505, y: 490, text: 'height 20', dx: -10, dy: 80 }] },
      { img: 'rectdone', view: [660, 515, 560], cap: 'Press <kbd>C</kbd> for <b>Circle</b>. Click inside the rectangle near its left end to place the centre, type <b>5</b> for the diameter and press <kbd>Enter</kbd>. The circle is <b>blue</b>: it can still move.', marks: [{ t: 'key', k: 'C' }, { t: 'click', x: 610, y: 491 }, { t: 'circle', x: 610, y: 491, r: 10 }, { t: 'type', x: 655, y: 462, w: 70, h: 22, text: '5' }, { t: 'key', k: 'Enter' }] },
      { img: 'dimtype', view: [660, 525, 520], cap: 'Press <kbd>D</kbd> for <b>Sketch Dimension</b>. Click the circle’s <b>centre</b>, then the rectangle’s <b>left edge</b>. Move down to place the dimension, type <b>6</b> and press <kbd>Enter</kbd>.', marks: [{ t: 'key', k: 'D' }, { t: 'click', x: 594, y: 491 }, { t: 'click', x: 563, y: 466 }, { t: 'move', x: 600, y: 583 }, { t: 'type', x: 628, y: 583, w: 112, h: 22, text: '6' }, { t: 'key', k: 'Enter' }] },
      { img: 'sketchfull', view: [660, 525, 520], cap: 'Still in Sketch Dimension: click the centre again, then the <b>bottom edge</b>. Place the dimension to the left, type <b>10</b> and press <kbd>Enter</kbd>. Now the circle is black too: the sketch is <b>fully defined</b>.', marks: [{ t: 'click', x: 594, y: 491 }, { t: 'click', x: 650, y: 541 }, { t: 'move', x: 528, y: 516 }, { t: 'type', x: 552, y: 516, w: 56, h: 22, text: '10' }, { t: 'key', k: 'Enter' }, { t: 'label', x: 594, y: 491, text: 'all black', dx: 40, dy: -70 }] },
      { img: 'sketchfull', view: [980, 300, 820], cap: 'Click <b>Finish Sketch</b>. (Press <kbd>Esc</kbd> first if a tool is still active.)', marks: [{ t: 'ring', x: 1289, y: 97, r: 22 }, { t: 'click', x: 1289, y: 97 }] }
    ] });
    UI.tests(b, ctx, { id: 't-sketch', rows: ['Every line and the circle in my sketch are <b>black</b>.', 'The rectangle is <b>50 × 20</b> and its centre is on the origin.', 'The circle is <b>Ø5</b>, <b>6</b> from the left edge and <b>10</b> from the bottom edge.'] });
    UI.callout(b, '', 'Fixing mistakes', '<p><kbd>Ctrl</kbd> + <kbd>Z</kbd> (<kbd>⌘</kbd> + <kbd>Z</kbd> on a Mac) undoes. To change a number, double-click the dimension. Something still blue? Drag it to see which way it can move, then add a dimension that stops that. Finished the sketch too early? Double-click the sketch in the timeline to go back in.</p>');
  } });

  /* ---------- 07 extrude ---------- */
  steps.push({ id: 'extrude', title: 'Extrude: 2D to 3D', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead"><b>Extrude</b> takes a profile and pulls it straight out into a solid, like pushing play-dough through a shape. Which profiles you pick matters: a circle you <i>don’t</i> pick becomes a hole.</p>');
    F.extrudeLab(b, ctx, 'lab-extrude');
    UI.mcq(b, ctx, { id: 'q-extrude', q: 'You select <b>both</b> the tag area and the circle, then extrude. What happens?', options: ['The circle becomes a hole', 'The tag comes out solid, with no hole for the key ring', 'Fusion shows an error', 'Only the circle is extruded'], answer: 1, explain: 'Selecting the circle too fills it in. Pick only the big area, and the circle stays empty: a hole.' });
    UI.html(b, '<h2>In Fusion</h2>');
    F.shots(b, { title: 'Extrude the tag', ctx: ctx, key: 'w-extrude', steps: [
      { img: 'extrude0', view: 'full', cap: 'Press <kbd>E</kbd> (or click <b>Extrude</b> under CREATE). The <b>Extrude</b> panel opens and the view turns to 3D. <b>Profiles: Select</b> means Fusion is waiting for you to pick a profile.', marks: [{ t: 'key', k: 'E' }, { t: 'box', x: 1143, y: 262, w: 224, h: 232 }, { t: 'ring', x: 1256, y: 324, r: 22 }] },
      { img: 'extrude', view: 'full', cap: 'Click the big shaded area of the tag — <b>not</b> the circle. The panel now says <b>1 selected</b> and a blue preview and an arrow appear.', marks: [{ t: 'click', x: 780, y: 620 }, { t: 'ring', x: 1265, y: 324, r: 26 }, { t: 'label', x: 423, y: 339, text: 'circle not selected = hole', dx: -150, dy: -110 }] },
      { img: 'extrude', view: [900, 470, 900], cap: 'Drag the arrow up, or just type <b>4</b> and press <kbd>Enter</kbd>. In the panel, check that <b>Operation</b> says <b>New Body</b>.', marks: [{ t: 'drag', x1: 685, y1: 414, x2: 685, y2: 380 }, { t: 'type', x: 860, y: 473, w: 118, h: 24, text: '4' }, { t: 'box', x: 1148, y: 490, w: 200, h: 26 }, { t: 'key', k: 'Enter' }] },
      { img: 'body', view: 'full', cap: 'A solid body, 4 mm thick, with a hole through it. A <b>Bodies</b> folder appeared in the browser, and the timeline at the bottom now shows two steps: a sketch and an extrude.', marks: [{ t: 'box', x: 74, y: 296, w: 80, h: 22 }, { t: 'box', x: 128, y: 856, w: 52, h: 30 }] }
    ] });
    UI.callout(b, '', 'If it went wrong', '<p>No hole? You selected the circle too: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd>, then try again. Wrong thickness? Double-click the extrude in the timeline and change the number.</p>');
  } });

  /* ---------- 08 fillet ---------- */
  steps.push({ id: 'fillet', title: 'Fillet: round the corners', stage: '05 Create', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Sharp corners poke through pockets and snap easily. A <b>fillet</b> rounds an edge with a radius you choose. You pick edges (not faces), so you can round just the ones you want.</p>');
    F.filletLab(b, ctx, 'lab-fillet');
    UI.numq(b, ctx, { id: 'q-fillet', q: 'The tag is 20 mm tall. What is the <b>biggest</b> fillet radius you could put on its four corners?', answer: 10, tol: 0, unit: 'mm', explain: 'Half of 20 mm is 10 mm. At 10 mm, the two corners on each end meet and the end becomes a half circle.', hint: 'Two corners share each 20 mm end. How much of that end can each corner use?' });
    UI.html(b, '<h2>In Fusion</h2>');
    F.shots(b, { title: 'Fillet the corners', ctx: ctx, key: 'w-fillet', steps: [
      { img: 'fillet0', view: [1000, 500, 900], cap: 'Press <kbd>F</kbd> (or <b>MODIFY ▸ Fillet</b>). Click the short vertical edge at the front corner. It turns blue and the <b>Fillet</b> panel opens.', marks: [{ t: 'key', k: 'F' }, { t: 'click', x: 893, y: 728 }, { t: 'ring', x: 893, y: 728, r: 20 }, { t: 'box', x: 962, y: 262, w: 404, h: 345 }] },
      { img: 'fillet', view: [1080, 430, 700], cap: '<b>Orbit</b> (<kbd>Shift</kbd> + middle-drag) to see the other corners, and click each short vertical edge. The panel counts them: <b>4 Edges</b>. Type <b>4</b> for the radius and click <b>OK</b>.', marks: [{ t: 'ring', x: 993, y: 328, r: 30 }, { t: 'type', x: 1096, y: 328, w: 66, h: 22, text: '4', align: 'left' }, { t: 'click', x: 1258, y: 592 }] },
      { img: 'filleted', view: 'full', cap: 'Four rounded corners. Orbit around to check all of them, then click the <b>Home</b> icon beside the ViewCube. There’s a third step in the timeline now.', marks: [{ t: 'ring', x: 1060, y: 610, r: 50 }, { t: 'ring', x: 330, y: 340, r: 50 }, { t: 'box', x: 128, y: 856, w: 72, h: 30 }] }
    ] });
    UI.callout(b, '', 'Tip', '<p>Picked a wrong edge? Click it again to unselect it. Picked the top face by mistake? That rounds all its edges — click it again, or use <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd>.</p>');
  } });

  /* ---------- 09 text ---------- */
  steps.push({ id: 'text', title: 'Add your name', stage: '03 Imagine · 05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now make it yours. Text in Fusion is a sketch too: you put it on the top face, then extrude it. Letters can stick up (<b>raised</b>) or be cut in (<b>engraved</b>). Plan yours first.</p>');
    F.textLab(b, ctx, 'lab-text');
    UI.mcq(b, ctx, { id: 'q-text', q: 'Which extrude <b>Operation</b> makes raised letters part of the tag (one solid piece)?', options: ['New Body', 'Join', 'Cut', 'Intersect'], answer: 1, explain: 'Join adds the letters to the tag. Cut would carve them in instead (engraved). New Body would make them a separate piece.', hints: { 0: 'New Body makes the letters a separate object sitting on the tag.', 2: 'Cut removes material — that’s for engraved letters.' } });
    UI.html(b, '<h2>In Fusion</h2>');
    F.shots(b, { title: 'Put your name on it', ctx: ctx, key: 'w-text', steps: [
      { img: 'filleted', view: [560, 380, 1100], cap: 'Click <b>Create Sketch</b>, then click the <b>top face</b> of the tag. The view turns to look straight down at it.', marks: [{ t: 'click', x: 137, y: 97 }, { t: 'click', x: 700, y: 470 }, { t: 'label', x: 700, y: 470, text: 'top face', dx: 70, dy: -60 }] },
      { img: 'rectmenu', view: [310, 300, 640], cap: 'Open <b>CREATE ▾</b> and choose <b>Text</b>.', marks: [{ t: 'click', x: 232, y: 123 }, { t: 'click', x: 150, y: 354 }, { t: 'ring', x: 150, y: 354, r: 16 }] },
      { img: 'paramtext', view: [680, 400, 760], cap: 'The first time, a <b>Parametric Text</b> message pops up. Tick <b>Don’t show this again</b> and click <b>OK</b>.', marks: [{ t: 'click', x: 467, y: 560 }, { t: 'click', x: 874, y: 592 }] },
      { img: 'textframe', view: [686, 470, 1000], cap: 'Click two corners to draw a box for the text, in the space beside the hole.', marks: [{ t: 'click', x: 432, y: 395 }, { t: 'box', x: 432, y: 395, w: 652, h: 196 }, { t: 'click', x: 1084, y: 591 }] },
      { img: 'text', view: [880, 470, 800], cap: 'In the <b>Text</b> box, type your name <b>between the quote marks</b> (keep the \' \'). Click <b>B</b> for bold, set <b>Height</b> to <b>9 mm</b> (or what you planned), choose <b>centre</b> alignment, and click <b>OK</b>.', marks: [{ t: 'type', x: 1028, y: 328, w: 150, h: 22, text: '\'ALEX\'', align: 'left' }, { t: 'click', x: 962, y: 466 }, { t: 'type', x: 1028, y: 494, w: 150, h: 22, text: '9', align: 'left' }, { t: 'click', x: 991, y: 578 }, { t: 'click', x: 1028, y: 639 }] },
      { img: 'textdone', view: 'full', cap: 'Your name as sketch text. Click <b>Finish Sketch</b>.', marks: [] },
      { img: 'textextrude0', view: [720, 470, 1000], cap: 'Press <kbd>E</kbd> for Extrude and click the text. All the letters are selected together.', marks: [{ t: 'key', k: 'E' }, { t: 'click', x: 600, y: 420 }] },
      { img: 'textextrude', view: [900, 470, 900], cap: 'Type <b>1</b> for the distance. Fusion picks <b>Operation: Join</b> by itself, so the letters become part of the tag. Click <b>OK</b>.', marks: [{ t: 'type', x: 910, y: 524, w: 120, h: 24, text: '1' }, { t: 'box', x: 1148, y: 490, w: 200, h: 26 }, { t: 'click', x: 1258, y: 534 }] },
      { img: 'final', view: 'full', cap: 'Your keychain, ready to save and export. Five steps in the timeline: sketch, extrude, fillet, sketch, extrude.', marks: [{ t: 'box', x: 128, y: 856, w: 116, h: 30 }] }
    ] });
    UI.callout(b, '', 'Engraved instead?', '<p>For engraved letters, type <b>-1</b> (minus one) for the distance so the extrude goes <i>down</i> into the tag, and check that <b>Operation</b> says <b>Cut</b>. Keep engraved text at least 7 mm tall so it prints clearly.</p>');
  } });

  /* ---------- 10 timeline, save, export ---------- */
  steps.push({ id: 'export', title: 'Save, export & check', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Look at the timeline at the bottom of Fusion. Each icon is one step you did, in order.</p>');
    strip(b, 'timeline', 705, 79, [[132, 'Play the steps back', 0], [305, 'Sketch', 14], [350, 'Extrude', 0], [400, 'Fillet', 14], [445, 'Sketch', 0], [490, 'Extrude', 14], [517, 'Marker', 28]], 'Double-click any step to change it, and Fusion rebuilds everything after it. Drag the <b>marker</b> back to see your model as it was at that step.');
    UI.mcq(b, ctx, { id: 'q-timeline', q: 'You decide the keychain should be 5 mm thick instead of 4. What’s the fastest way to change it?', options: ['Start a new design', 'Double-click the first Extrude in the timeline and change 4 to 5', 'Extrude the top face up another 1 mm', 'Scale the whole model'], answer: 1, explain: 'Editing the step in the timeline changes it and everything after it (the fillets and the text move up with it). That’s what parametric means.', hints: { 2: 'That works, but it adds an extra step and puts the letters underneath the new layer.', 3: 'Scaling would make the tag and the letters bigger in every direction.' } });
    UI.html(b, '<h2>Save, then export two files</h2><p>A <b>.f3d</b> file is your whole design, timeline and all: your teacher can open it and see exactly how you built it. An <b>.stl</b> file is just the shape, made of tiny triangles: that’s what a 3D printer’s slicer needs.</p>');
    F.shots(b, { title: 'Save and export', ctx: ctx, key: 'w-export', steps: [
      { img: 'filemenu', view: [330, 250, 700], cap: 'Open the <b>File</b> menu and click <b>Save</b>.', marks: [{ t: 'click', x: 78, y: 44 }, { t: 'click', x: 95, y: 167 }] },
      { img: 'save', view: [686, 340, 800], cap: 'Name it <b>F1 Keychain - your name</b>. For <b>Location</b>, pick the project your teacher told you to use. Click <b>Save</b>. It saves to the cloud, so you can open it on any computer you sign in on.', marks: [{ t: 'type', x: 686, y: 284, w: 634, h: 28, text: 'F1 Keychain - Alex', align: 'left' }, { t: 'type', x: 664, y: 364, w: 592, h: 28, text: 'Your class project', align: 'left' }, { t: 'click', x: 975, y: 507 }] },
      { img: 'filemenu', view: [330, 250, 700], cap: 'Now make the files you’ll hand in: <b>File ▸ Export…</b>', marks: [{ t: 'click', x: 78, y: 44 }, { t: 'click', x: 104, y: 225 }] },
      { img: 'export', view: [686, 360, 800], cap: 'Leave <b>Type</b> on <b>Autodesk Fusion Archive Files (*.f3d)</b>. Choose a folder on your computer you’ll find again (the <b>…</b> button) and click <b>Export</b>.', marks: [{ t: 'type', x: 686, y: 285, w: 634, h: 28, text: 'F1 Keychain - Alex', align: 'left' }, { t: 'box', x: 365, y: 328, w: 642, h: 26 }, { t: 'ring', x: 993, y: 396, r: 16 }, { t: 'click', x: 966, y: 530 }] },
      { img: 'exporttypes', view: [686, 420, 800], cap: 'Do <b>File ▸ Export…</b> once more, but open the <b>Type</b> list and choose <b>STL Files (*.stl)</b>. Click <b>Export</b>.', marks: [{ t: 'type', x: 686, y: 285, w: 634, h: 28, text: 'F1 Keychain - Alex', align: 'left' }, { t: 'click', x: 686, y: 340 }, { t: 'click', x: 418, y: 513 }, { t: 'box', x: 372, y: 504, w: 110, h: 20 }] }
    ] });
    UI.html(b, '<h2>Check your STL</h2><p>Open the .stl you just exported. It shows up below in 3D, with its size, so you can catch problems before you hand it in.</p>');
    F.stlCheck(b, ctx, 'stl');
    UI.callout(b, '', 'Screenshot', '<p>You’ll also hand in a screenshot of the whole Fusion window showing your keychain and the timeline. Windows: <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> · Mac: <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>4</kbd> · Chromebook: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Show windows</kbd>.</p>');
  } });

  /* ---------- 11 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Designers check their work against the plan before anything gets made. Go through each check in Fusion and mark it PASS or RETRY. Fix anything that fails.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Sketch:</b> double-click the first sketch in the timeline. Is everything black? (Click Finish Sketch to leave.)',
      '<b>Size:</b> use <b>INSPECT ▸ Measure</b> on the tag: 50 mm long, 20 mm wide, 4 mm thick.',
      '<b>Hole:</b> the hole goes all the way through and is at least 2 mm from the edge.',
      '<b>Text:</b> your name fits inside the tag, with space around it, and reads the right way round from the top view.',
      '<b>File:</b> your STL opened in the checker with the right size and “Closed: Yes”.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Timeline', cls: 'c', title: 'Make it bigger', html: 'Double-click the first sketch in the timeline and change 50 to 60 and 20 to 25. Watch the extrude, fillet and text follow along. What happened to your text, and why?', hint: 'The text sketch is on the top face, so it moves with it. Its frame may need adjusting: double-click the text sketch.' },
      { tag: 'Extrude', title: 'Engrave it', html: 'Make a second version with engraved letters: Extrude <b>-1 mm</b> with <b>Operation: Cut</b>. Which do you think will look better when it’s printed?', hint: 'Save the raised version first, then use File ▸ Save As to make a copy before you change it.' },
      { tag: 'Modify', title: 'Soften every edge', html: 'Use <b>MODIFY ▸ Chamfer</b> or a small fillet (0.5 mm) on the top edges of the tag so it feels smooth in your hand.', hint: 'Click the top face’s outer edge loop. A small radius works best: big ones can swallow your text.' },
      { tag: 'Sketch', title: 'Add a symbol', html: 'Sketch a simple symbol with the Line tool (a star, a lightning bolt, a heart) on the top face and extrude it 1 mm, like your name.', hint: 'The shape must be closed (the last line ends where the first began) to make a profile.' },
      { tag: 'Design', cls: 'c', title: 'Your own shape', html: 'Replace the rectangle with a different outline — a circle, a hexagon (CREATE ▸ Polygon) or a shield — and keep the sketch fully defined.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What did you change, and how did it turn out?', placeholder: 'I tried…' });
  } });

  /* ---------- 12 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.f01 = {
    steps: steps,
    evidence: {
      intro: 'Hand in your keychain: your Fusion design, the STL for printing and a screenshot. Answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'f3d', kind: 'model', ext: ['f3d'], extHelp: 'In Fusion: File → Export… → Type: Autodesk Fusion Archive Files (*.f3d).', label: 'Your Fusion design (.f3d)', help: 'File → Export… → Type: Autodesk Fusion Archive Files (*.f3d).', required: true, max: 1 },
        { id: 'stl', kind: 'model', ext: ['stl'], extHelp: 'In Fusion: File → Export… → Type: STL Files (*.stl).', label: 'Your print file (.stl)', help: 'File → Export… → Type: STL Files (*.stl). Check it in step 10 first.', required: true, max: 1 },
        { id: 'shot', kind: 'photo', label: 'A screenshot of Fusion', help: 'The whole Fusion window, showing your keychain and the timeline at the bottom.', required: true, max: 2 }
      ],
      questions: [
        { id: 'r1', q: 'What is the difference between a sketch and a body? Use the word “profile” in your answer.' },
        { id: 'r2', q: 'Your sketch turned black when it was fully defined. What does that mean, and why is it a good habit?' },
        { id: 'r3', q: 'When you extruded the tag, you clicked the big area but not the circle. Explain what would have happened if you had clicked both.' },
        { id: 'r4', q: 'Describe one change you made (or would make) to improve your keychain, and which Fusion tool you used for it.' }
      ]
    }
  };
})(window);
