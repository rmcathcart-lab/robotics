/* Mission 07: Remote turntable — the guide.
 * A cardboard display turntable on a 28BYJ-48 stepper (ULN2003 driver, own power from the power supply module) that
 * turns to exact angles when you press keys on the ELEGOO IR remote (IRremote 4.x). Same structure as m01.
 * Circuit parts are shared below so the build guides and the Virtual UNO always match. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', BG = '#070d17';
  var SANS = 'IBM Plex Sans, sans-serif';
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  function ln(src, s, from) { var a = src.split('\n'); for (var i = (from || 1) - 1; i < a.length; i++) if (a[i].indexOf(s) >= 0) return i + 1; throw new Error('m07: line not found: ' + s); }
  function bgGrid(svg, w, h) { S('rect', { x: 0, y: 0, width: w, height: h, fill: BG }, svg); for (var x = 0; x <= w; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: h, stroke: GRID, opacity: 0.35 }, svg); for (var y = 0; y <= h; y += 64) S('line', { x1: 0, y1: y, x2: w, y2: y, stroke: GRID, opacity: 0.35 }, svg); }
  function glowDefs(svg) {
    var d = svg.querySelector('defs') || S('defs', {}, svg);
    [['cyan', CY], ['ir', '#c084fc'], ['red', '#ff4d4d'], ['white', '#f4f7fb']].forEach(function (c) {
      if (d.querySelector('#m7g-' + c[0])) return;
      var gr = S('radialGradient', { id: 'm7g-' + c[0] }, d);
      S('stop', { offset: '0%', 'stop-color': c[1], 'stop-opacity': 0.95 }, gr); S('stop', { offset: '100%', 'stop-color': c[1], 'stop-opacity': 0 }, gr);
    });
  }
  /* dots that move along a path: returns { setSpeed(px per s), stop(), g } */
  function flow(svg, pathEl, n, color, r) {
    var L = pathEl.getTotalLength(), dots = [], speed = 60, off = 0, last = performance.now(), raf = null, g = S('g', {}, svg);
    for (var i = 0; i < n; i++) dots.push(S('circle', { r: r || 4, fill: color || CY }, g));
    function tick(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; off = (off + speed * dt) % L; dots.forEach(function (d, i) { var p = pathEl.getPointAtLength((off + i * L / n) % L); d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); }); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return { setSpeed: function (v) { speed = v; g.setAttribute('opacity', v ? 1 : 0); }, stop: function () { cancelAnimationFrame(raf); }, g: g };
  }
  var KEY = {}; RL.REMOTE.forEach(function (k) { KEY[k[0]] = k[1]; });
  function hex(n) { return '0x' + (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }

  /* ================= circuit parts ================= */
  var VB7 = [0, -18, B.WIDE[2], B.WIDE[3] + 18];
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var IR = {
    ir: { type: 'ir', at: [800, 452], name: 'IR receiver module' },
    ir_s: { type: 'wire', from: 'D2', to: 'ir.S', color: 'yellow', via: [[420, 372], [640, 420], [740, 462]], name: 'Yellow: pin 2 → S' },
    ir_v: { type: 'wire', from: 'R+25', to: 'ir.V', color: 'red', via: [[730, 470]], name: 'Red: + rail → +' },
    ir_g: { type: 'wire', from: 'R-27', to: 'ir.G', color: 'black', via: [[700, 500], [760, 500]], name: 'Black: − rail → −' }
  };
  var MOTOR = {
    psu: { type: 'psu', name: 'Power supply module (both jumpers on 5V)' },
    st: { type: 'stepper', at: [770, 150], name: 'ULN2003 driver + 28BYJ-48 motor' },
    st1: { type: 'wire', from: 'D8', to: 'st.IN1', color: 'orange', via: [[560, 252], [700, 250]], name: 'Orange: pin 8 → IN1' },
    st2: { type: 'wire', from: 'D9', to: 'st.IN2', color: 'yellow', via: [[560, 236], [708, 232]], name: 'Yellow: pin 9 → IN2' },
    st3: { type: 'wire', from: 'D10', to: 'st.IN3', color: 'green', via: [[560, 220], [716, 214]], name: 'Green: pin 10 → IN3' },
    st4: { type: 'wire', from: 'D11', to: 'st.IN4', color: 'blue', via: [[560, 204], [724, 206]], name: 'Blue: pin 11 → IN4' },
    st_g: { type: 'wire', from: 'R-11', to: 'st.GND', color: 'black', via: [[720, 236]], name: 'Black: − rail → driver −' },
    st_v: { type: 'wire', from: 'R+12', to: 'st.VCC', color: 'red', via: [[730, 254]], name: 'Red: + rail → driver +' }
  };
  var ALL = merge(POWER, IR, MOTOR);
  var IDS_IR = Object.keys(merge(POWER, IR));
  var IDS_MOTOR = IDS_IR.filter(function (k) { return k !== 'p5v'; }).concat(Object.keys(MOTOR));
  var SIM_VIEW_IR = [296, 30, 580, 530], SIM_VIEW = [296, -16, 580, 590];

  /* ================= code ================= */
  var IRCODES = [
    '// Show the command code of every remote button you press',
    '#include <IRremote.hpp>      // "IRremote" library by shirriff, z3t0, ArminJo (version 4)',
    '',
    'const int IR_PIN = 2;        // the receiver\'s S (signal) pin',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);   // start listening; the L LED flickers on a signal',
    '  Serial.println("Press a button on the remote...");',
    '}',
    '',
    'void loop() {',
    '  if (IrReceiver.decode()) {                       // has a complete code arrived?',
    '    int code = IrReceiver.decodedIRData.command;   // the button\'s command number',
    '    Serial.print("Command: 0x");',
    '    Serial.println(code, HEX);                     // print it in hexadecimal',
    '    IrReceiver.resume();                           // get ready for the next one',
    '  }',
    '}'].join('\n');
  var STEPTEST = [
    '// Stepper test: a quarter turn one way, then back',
    '#include <Stepper.h>',
    '',
    'const int STEPS_PER_REV = 2048;                // the 28BYJ-48 with its gearbox',
    'Stepper motor(STEPS_PER_REV, 8, 10, 9, 11);    // IN1, IN3, IN2, IN4: see why above',
    '',
    'void setup() {',
    '  motor.setSpeed(10);      // 10 RPM (this motor tops out around 15)',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  Serial.println("Clockwise 90 degrees");',
    '  motor.step(512);         // 2048 / 4 = 512 steps',
    '  delay(1000);',
    '  Serial.println("Back 90 degrees");',
    '  motor.step(-512);        // negative = the other way',
    '  delay(1000);',
    '}'].join('\n');
  var REMOTE45 = [
    '/*',
    '  Mission 07, part 2: turn 45 degrees per button press',
    '*/',
    '#include <IRremote.hpp>',
    '#include <Stepper.h>',
    '',
    'const int IR_PIN = 2;',
    'const int STEPS_PER_REV = 2048;',
    'const int STEPS_45 = STEPS_PER_REV / 8;        // 2048 / 8 = 256 steps = 45 degrees',
    'Stepper motor(STEPS_PER_REV, 8, 10, 9, 11);',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);',
    '  motor.setSpeed(10);',
    '}',
    '',
    'void loop() {',
    '  if (IrReceiver.decode()) {',
    '    int code = IrReceiver.decodedIRData.command;',
    '    IrReceiver.resume();             // listen for the next press while we work',
    '',
    '    switch (code) {',
    '      case 0x43:                     // the >>| button: clockwise',
    '        Serial.println("Clockwise 45");',
    '        motor.step(STEPS_45);',
    '        break;',
    '',
    '      // YOUR TURN: case 0x44 (the |<< button) turns 45 degrees the other way',
    '',
    '      default:                       // any other button',
    '        Serial.print("Not used: 0x");',
    '        Serial.println(code, HEX);',
    '        break;',
    '    }',
    '  }',
    '}'].join('\n');
  var REMOTE45_HINT = [
    '      case 0x44:                     // the |<< button: anticlockwise',
    '        Serial.println("Anticlockwise 45");',
    '        motor.step(-STEPS_45);',
    '        break;'].join('\n');
  var FINAL = [
    '/*',
    '  Mission 07: Remote turntable',
    '  >>| and |<<   turn 45 degrees          up / down   nudge a little',
    '  1 to 7        go to 45, 90 ... 315     0           go home (0 degrees)',
    '  >||           one full turn            ST/REPT     make this spot home',
    '*/',
    '#include <IRremote.hpp>',
    '#include <Stepper.h>',
    '',
    'const int IR_PIN = 2;',
    'const int STEPS_PER_REV = 2048;',
    'const int STEPS_45 = STEPS_PER_REV / 8;',
    'Stepper motor(STEPS_PER_REV, 8, 10, 9, 11);',
    '',
    'long position = 0;     // where the turntable is, in steps from home (0 to 2047)',
    '',
    'void setup() {',
    '  Serial.begin(9600);',
    '  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);',
    '  motor.setSpeed(10);',
    '  Serial.println("Turntable ready. Home is 0 degrees.");',
    '}',
    '',
    'void loop() {',
    '  if (IrReceiver.decode()) {',
    '    int code = IrReceiver.decodedIRData.command;',
    '    IrReceiver.resume();',
    '    switch (code) {',
    '      case 0x43: turnBy(STEPS_45); break;       // >>|',
    '      case 0x44: turnBy(-STEPS_45); break;      // |<<',
    '      case 0x09: turnBy(8); break;              // up: nudge',
    '      case 0x07: turnBy(-8); break;             // down: nudge back',
    '      case 0x40: turnBy(STEPS_PER_REV); break;  // >||: a full turn',
    '      case 0x16: goToAngle(0); break;           // 0 = home',
    '      case 0x0C: goToAngle(45); break;          // 1',
    '      case 0x18: goToAngle(90); break;          // 2',
    '      case 0x5E: goToAngle(135); break;         // 3',
    '      case 0x08: goToAngle(180); break;         // 4',
    '      case 0x1C: goToAngle(225); break;         // 5',
    '      case 0x5A: goToAngle(270); break;         // 6',
    '      case 0x42: goToAngle(315); break;         // 7',
    '      case 0x0D:                                // ST/REPT: this spot is home now',
    '        position = 0;',
    '        report();',
    '        break;',
    '    }',
    '  }',
    '}',
    '',
    '// turn by some steps (+ = clockwise) and keep track of where we are',
    'void turnBy(long steps) {',
    '  motor.step(steps);',
    '  position = position + steps;',
    '  position = position % STEPS_PER_REV;                     // a full turn is back to the start...',
    '  if (position < 0) position = position + STEPS_PER_REV;   // ...and keep it 0 to 2047',
    '  report();',
    '}',
    '',
    '// turn to an angle measured from home, the short way round',
    'void goToAngle(long angle) {',
    '  long target = (angle * STEPS_PER_REV) / 360;              // degrees to steps',
    '  long change = target - position;',
    '  if (change > STEPS_PER_REV / 2) change = change - STEPS_PER_REV;    // over half a turn?',
    '  if (change < -STEPS_PER_REV / 2) change = change + STEPS_PER_REV;   // go the other way',
    '  turnBy(change);',
    '}',
    '',
    'void report() {',
    '  long degrees = (position * 360) / STEPS_PER_REV;',
    '  Serial.print("Position: ");',
    '  Serial.print(degrees);',
    '  Serial.println(" degrees");',
    '}'].join('\n');

  /* ================= art helpers ================= */
  /* the ELEGOO remote (small): returns { press(label) } */
  function remoteArt(svg, x, y, sc) {
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + sc + ')' }, svg), keys = {};
    S('rect', { x: 0, y: 0, width: 120, height: 270, rx: 18, fill: '#16191e', stroke: '#3b4350', 'stroke-width': 2 }, g);
    var led = S('circle', { cx: 60, cy: -2, r: 5, fill: '#3b2a4f' }, g);
    var glow = S('circle', { cx: 60, cy: -6, r: 26, fill: 'url(#m7g-ir)', opacity: 0 }, g);
    RL.REMOTE.forEach(function (k, i) {
      var cx = 22 + (i % 3) * 38, cy = 28 + Math.floor(i / 3) * 34;
      var r = S('rect', { x: cx - 15, y: cy - 11, width: 30, height: 22, rx: 6, fill: i === 0 ? '#b42318' : '#2b3038', stroke: '#3b4350' }, g);
      T(g, cx, cy + 4, k[0], { 'text-anchor': 'middle', 'font-size': k[0].length > 3 ? 6 : 9, fill: INK });
      keys[k[0]] = r;
    });
    return { g: g, press: function (lab, on, hidden) { var r = keys[lab]; if (r) r.setAttribute('fill', on ? CY : (lab === 'POWER' ? '#b42318' : '#2b3038')); glow.setAttribute('opacity', on && !hidden ? 0.9 : 0); led.setAttribute('fill', on && !hidden ? '#c084fc' : '#3b2a4f'); } };
  }
  /* turntable seen from above: returns { set(angleDeg) } */
  function platterArt(svg, cx, cy, r, o) {
    o = o || {};
    var g = S('g', {}, svg);
    S('rect', { x: cx - r - 18, y: cy - r - 18, width: 2 * r + 36, height: 2 * r + 36, rx: 10, fill: '#8a6438', stroke: '#6b4a26', 'stroke-width': 2 }, g);
    T(g, cx, cy - r - 26, 'HOME', { 'text-anchor': 'middle', fill: CY, 'font-size': 10, 'letter-spacing': '2' });
    S('path', { d: 'M' + cx + ' ' + (cy - r - 16) + ' l-6 -0 l6 10 l6 -10 z', fill: CY }, g);
    for (var a = 0; a < 360; a += 45) { var rad = (a - 90) * Math.PI / 180; S('line', { x1: cx + Math.cos(rad) * (r + 4), y1: cy + Math.sin(rad) * (r + 4), x2: cx + Math.cos(rad) * (r + 14), y2: cy + Math.sin(rad) * (r + 14), stroke: '#d3aa72', 'stroke-width': 2 }, g); if (o.labels) T(g, cx + Math.cos(rad) * (r + 30), cy + Math.sin(rad) * (r + 30) + 4, a + '°', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10 }); }
    var top = S('g', {}, g);
    S('circle', { cx: cx, cy: cy, r: r, fill: '#d3aa72', stroke: '#b98d55', 'stroke-width': 3 }, top);
    S('circle', { cx: cx, cy: cy, r: r * 0.08, fill: '#8a6438' }, top);
    S('path', { d: 'M' + cx + ' ' + (cy - r + 8) + ' l-9 16 h18 z', fill: SIG }, top);
    // a star-shaped model on display
    var pts = []; for (var k = 0; k < 10; k++) { var rr = k % 2 ? r * 0.14 : r * 0.34, aa = (k * 36 - 90) * Math.PI / 180; pts.push((cx + Math.cos(aa) * rr).toFixed(1) + ',' + (cy + Math.sin(aa) * rr).toFixed(1)); }
    S('polygon', { points: pts.join(' '), fill: '#3b82f6', stroke: '#93c5fd', 'stroke-width': 2, 'stroke-linejoin': 'round' }, top);
    var ang = 0;
    return { g: g, set: function (a) { ang = a; top.setAttribute('transform', 'rotate(' + a + ' ' + cx + ' ' + cy + ')'); }, get: function () { return ang; } };
  }
  /* animate a value from a to b over ms, calling fn(v); returns a cancel function */
  function tween(a, b2, ms, fn, done) { var t0 = performance.now(), raf; (function tk(t) { var f = Math.min(1, (t - t0) / ms); fn(a + (b2 - a) * f); if (f < 1) raf = requestAnimationFrame(tk); else if (done) done(); })(t0); return function () { cancelAnimationFrame(raf); }; }

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '10 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m07;
    var wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = '<p class="lead">Product photographers, museums and shop windows use motorised turntables to show off objects from every side. In this mission you’ll build one out of cardboard that turns to <b>exact angles</b> — 45°, 90°, a full turn — when you press buttons on an infrared remote.</p>' +
      '<p>You’ll discover how a remote talks in invisible flashes of light, how to decode its messages, and how a <b>stepper motor</b> moves in precise little steps. You’ll also meet two rules every robot builder lives by: motors need a <b>driver</b>, and they need their <b>own power</b>.</p>';
    UI.edp(left, [3, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360, frames: [{
      cap: 'Press a key and the turntable spins to that exact angle — then holds it. The motor counts its steps, so it always knows where it is.',
      draw: function (svg, _, st) {
        clear(svg); glowDefs(svg); bgGrid(svg, 800, 360);
        var rm = remoteArt(svg, 80, 60, 0.95), pl = platterArt(svg, 420, 190, 120), lab = T(svg, 620, 150, '', { 'font-size': 13, 'letter-spacing': '2', fill: CY }), lab2 = T(svg, 620, 176, '', { 'font-size': 12, fill: MUT });
        T(svg, 620, 210, 'position', { fill: MUT, 'font-size': 10, 'letter-spacing': '2' }); var pos = T(svg, 620, 240, '0°', { fill: INK, 'font-size': 26, 'font-weight': 600 });
        var beam = S('path', { d: 'M196 50 Q 300 40 400 54', stroke: '#c084fc', 'stroke-width': 3, 'stroke-dasharray': '4 8', fill: 'none', opacity: 0 }, svg);
        var cur = 0, cancel = null;
        function go(key, to, l1, l2, ms) { rm.press(key, true); beam.setAttribute('opacity', 0.8); st.later(function () { rm.press(key, false); beam.setAttribute('opacity', 0); }, 300);
          lab.textContent = l1; lab2.textContent = l2; var from = cur; cur = to; if (cancel) cancel(); cancel = tween(from, to, Math.max(400, Math.abs(to - from) * 16), function (v) { pl.set(v); pos.textContent = Math.round(((v % 360) + 360) % 360) + '°'; }); }
        var seq = [['▶▶|', 45, 'PRESS ▶▶|', 'turn 45°'], ['▶▶|', 90, 'PRESS ▶▶|', 'another 45°'], ['4', 180, 'PRESS 4', 'go to 180°'], ['7', 315, 'PRESS 7', 'go to 315°'], ['▶||', 675, 'PRESS ▶||', 'a full turn to show off'], ['0', 720, 'PRESS 0', 'home, the short way round']], k = 0;
        (function next() { var s = seq[k % seq.length]; if (k % seq.length === 0) { cur = 0; pl.set(0); } go(s[0], s[1], s[2], s[3]); k++; st.later(next, s[0] === '▶||' ? 6500 : 2600); })();
        st.stop = function () { if (cancel) cancel(); };
      } }] });
    UI.callout(b, 'safety', 'Safety', '<p>The motor runs from a <b>9 V battery</b> through the power supply module. Never let the battery’s two snaps touch each other or anything metal. Unplug the battery whenever you change wiring, and when you’re done. Keep fingers and hair clear of the turntable while it turns, and if the motor gets hot, give it a rest.</p>');
  } });

  /* ---------- 02 infrared ---------- */
  steps.push({ id: 'infrared', title: 'Invisible light, secret codes', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Press a button on a TV remote and nothing seems to happen at the front — but the remote is flashing a light at the TV. It’s <b>infrared</b> light: real light, just a colour your eyes can’t see.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'How a remote talks', w: 820, h: 340,
      init: function (svg, S2, st) { glowDefs(svg); S('rect', { x: 0, y: 0, width: 820, height: 340, fill: BG }, svg); st.layer = S('g', {}, svg); },
      frames: [
        { cap: '<b>Infrared is just past red.</b> Light comes in wavelengths: violet is about 400 nanometres, red about 700. Your remote’s LED shines at <b>940 nm</b> — longer than red, so your eyes can’t detect it. The receiver on your breadboard is tuned to exactly that colour.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer, d = svg.querySelector('defs');
          if (!d.querySelector('#m7spec')) { var gr = S('linearGradient', { id: 'm7spec', x1: 0, x2: 1, y1: 0, y2: 0 }, d); [['0', '#7c3aed'], ['0.2', '#2563eb'], ['0.4', '#22c55e'], ['0.6', '#facc15'], ['0.8', '#f97316'], ['1', '#dc2626']].forEach(function (s) { S('stop', { offset: s[0], 'stop-color': s[1] }, gr); }); }
          function x(nm) { return 80 + (nm - 380) * 1.1; }
          S('rect', { x: x(400), y: 120, width: x(700) - x(400), height: 70, fill: 'url(#m7spec)' }, g);
          S('rect', { x: x(700), y: 120, width: x(1000) - x(700), height: 70, fill: '#1a1033', stroke: '#3b2a4f' }, g);
          T(g, (x(400) + x(700)) / 2, 106, 'VISIBLE LIGHT', { 'text-anchor': 'middle', fill: INK, 'font-size': 11, 'letter-spacing': '2' });
          T(g, (x(700) + x(1000)) / 2, 106, 'INFRARED (INVISIBLE)', { 'text-anchor': 'middle', fill: '#c084fc', 'font-size': 11, 'letter-spacing': '2' });
          [400, 500, 600, 700, 800, 900, 1000].forEach(function (nm) { S('line', { x1: x(nm), y1: 190, x2: x(nm), y2: 200, stroke: MUT }, g); T(g, x(nm), 216, nm + ' nm', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10 }); });
          var m = S('g', {}, g); S('line', { x1: x(940), y1: 112, x2: x(940), y2: 250, stroke: CY, 'stroke-width': 3 }, m); T(m, x(940), 272, 'REMOTE: 940 nm', { 'text-anchor': 'middle', fill: CY, 'font-size': 12 });
          var p = S('circle', { cx: x(940), cy: 155, r: 26, fill: 'url(#m7g-ir)', opacity: 0 }, g);
          (function blink(k) { p.setAttribute('opacity', k % 2 ? 0.8 : 0); st.later(function () { blink(k + 1); }, 400); })(0);
        } },
        { cap: '<b>Try the phone-camera trick.</b> A camera sensor <i>can</i> see near-infrared. Point the remote at your phone’s camera (the selfie camera usually works best) and press a button: the LED flickers purple-white on the screen. If you see nothing, the remote’s battery may be flat — a great first test.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          var rm = remoteArt(g, 90, 50, 0.9);
          S('rect', { x: 470, y: 40, width: 200, height: 270, rx: 22, fill: '#111418', stroke: '#3b4350', 'stroke-width': 3 }, g);
          S('rect', { x: 484, y: 70, width: 172, height: 210, rx: 6, fill: '#0b1020' }, g);
          T(g, 570, 64, '● CAMERA', { 'text-anchor': 'middle', fill: MUT, 'font-size': 9 });
          var sr = S('g', {}, g); S('rect', { x: 530, y: 150, width: 80, height: 120, rx: 10, fill: '#2b3038' }, sr); var dot = S('circle', { cx: 570, cy: 150, r: 6, fill: '#3b2a4f' }, sr); var gl = S('circle', { cx: 570, cy: 148, r: 34, fill: 'url(#m7g-ir)', opacity: 0 }, sr);
          T(g, 230, 320, 'your eyes: nothing', { 'text-anchor': 'middle', fill: MUT, 'font-family': SANS, 'font-size': 14 });
          T(g, 570, 330, 'the camera: flashes!', { 'text-anchor': 'middle', fill: CY, 'font-family': SANS, 'font-size': 14 });
          (function blink(k) { var on = k % 4 < 2 && k % 2 === 0; rm.press('▲', k % 8 < 4, true); gl.setAttribute('opacity', on ? 0.95 : 0); dot.setAttribute('fill', on ? '#f0e6ff' : '#3b2a4f'); st.later(function () { blink(k + 1); }, 120); })(0);
        } },
        { cap: '<b>Each flash is really a fast flicker — 38 000 times a second (38 kHz).</b> Sunlight and lamps give off infrared too, but they don’t flicker at 38 kHz. The receiver module contains a filter that ignores everything else, so only remote signals get through. It turns each burst into a clean LOW on its S pin.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer;
          T(g, 60, 60, 'LIGHT FROM THE REMOTE (ZOOMED IN)', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          var pts = [], y0 = 140, y1 = 90;
          for (var x = 60; x < 760; x += 2) { var inBurst = (x > 140 && x < 330) || (x > 470 && x < 560), on = inBurst && Math.floor(x / 6) % 2 === 0; pts.push(x + ',' + (on ? y1 : y0)); }
          S('polyline', { points: pts.join(' '), fill: 'none', stroke: '#c084fc', 'stroke-width': 2 }, g);
          T(g, 235, 166, 'one burst = hundreds of 38 kHz flickers', { 'text-anchor': 'middle', fill: '#c084fc', 'font-size': 11 });
          T(g, 60, 214, 'RECEIVER’S S PIN', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
          S('polyline', { points: '60,240 140,240 140,290 330,290 330,240 470,240 470,290 560,290 560,240 760,240', fill: 'none', stroke: CY, 'stroke-width': 3 }, g);
          T(g, 770, 244, 'HIGH', { fill: MUT, 'font-size': 10 }); T(g, 770, 294, 'LOW', { fill: MUT, 'font-size': 10 });
          T(g, 235, 316, 'burst → LOW', { 'text-anchor': 'middle', fill: CY, 'font-size': 11 });
          var lamp = S('g', {}, g); S('circle', { cx: 700, cy: 110, r: 16, fill: '#facc15', opacity: 0.6 }, lamp); T(lamp, 700, 70, 'lamp: steady → ignored', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10 });
        } },
        { cap: '<b>A button press is a message in Morse-code-like bursts.</b> Your remote uses the <b>NEC code</b>: a long 9 ms “wake up” burst, then 32 short bursts. The <i>gap</i> after each burst is a bit: a short gap means 0, a long gap means 1. Those 32 bits carry an <b>address</b> (which device) and a <b>command</b> (which button) — each sent twice, the second time flipped, so the receiver can check nothing got garbled.', draw: function (svg, S2, st) {
          clear(st.layer); var g = st.layer; necDraw(g, 0x09, 60, 130, 700, st, true);
          T(g, 60, 232, 'ONE BIT = A BURST + A GAP', { fill: MUT, 'font-size': 10, 'letter-spacing': '2' });
          [[60, 0, '0: short gap (0.56 ms)'], [420, 1, '1: long gap (1.69 ms)']].forEach(function (e) { var x = e[0], gw = e[1] ? 120 : 40; S('polyline', { points: [x, 300, x + 20, 300, x + 20, 260, x + 60, 260, x + 60, 300, x + 60 + gw, 300, x + 60 + gw, 260, x + 80 + gw, 260].join(' '), fill: 'none', stroke: '#c084fc', 'stroke-width': 2.5 }, g); S('rect', { x: x + 60, y: 300, width: gw, height: 6, fill: CY }, g); T(g, x + 110 + gw, 290, e[2], { fill: CY, 'font-size': 12 }); });
        } }
      ] });
    UI.html(b, '<h2>Read a button’s message</h2><p>Pick a key to see the exact flashes it sends. The whole message takes about 68 ms — here it’s slowed down about 50 times.</p>');
    necLab(b, ctx);
    UI.mcq(b, ctx, { id: 'q-ir1', q: 'The classroom lights and the sun both give off infrared. Why doesn’t the receiver get confused?', options: ['They’re too far away', 'The receiver only responds to infrared flickering at 38 kHz', 'Infrared can’t pass through windows', 'The UNO filters it out in code'], answer: 1, explain: 'The receiver module has a 38 kHz filter built in. Steady infrared (or light flickering at any other speed) is ignored, so only remote signals get through.', hints: { 3: 'The filtering happens before the UNO ever sees the signal — inside the receiver module.' } });
    UI.mcq(b, ctx, { id: 'q-ir2', q: 'In the NEC code, how does the remote send a <b>1</b> instead of a <b>0</b>?', options: ['A brighter burst', 'A longer gap after the burst', 'A different colour of infrared', 'Two bursts in a row'], answer: 1, explain: 'Every burst is the same 0.56 ms. The gap after it is the bit: about 0.56 ms for a 0, about 1.69 ms for a 1.' });
  } });
  /* draw an NEC frame for a command; animate a playhead if st given */
  function necDraw(g, cmd, X, Y, W, st, labels) {
    var bits = [], i;
    function addByte(v) { for (i = 0; i < 8; i++) bits.push((v >> i) & 1); }
    addByte(0x00); addByte(0xFF); addByte(cmd); addByte(~cmd & 255);
    var segs = [[9, 1], [4.5, 0]]; bits.forEach(function (bt) { segs.push([0.5625, 1]); segs.push([bt ? 1.6875 : 0.5625, 0]); }); segs.push([0.5625, 1]);
    var total = segs.reduce(function (a, s) { return a + s[0]; }, 0), k = W / total, x = X, pts = [], bursts = [];
    segs.forEach(function (s) { var y = s[1] ? Y - 40 : Y; pts.push(x + ',' + y, (x + s[0] * k) + ',' + y); if (s[1]) bursts.push([x, x + s[0] * k]); x += s[0] * k; });
    T(g, X, Y - 64, 'IR BURSTS FROM THE REMOTE', { fill: MUT, 'font-size': 10, 'letter-spacing': '2' });
    S('polyline', { points: pts.join(' '), fill: 'none', stroke: '#c084fc', 'stroke-width': 2.5 }, g);
    // groups
    var groupNames = [['ADDRESS', '0x00', MUT], ['ADDRESS FLIPPED', '0xFF', MUT], ['COMMAND', hex(cmd), CY], ['COMMAND FLIPPED', hex(~cmd & 255), MUT]];
    var start = X + 13.5 * k;
    var bx = [start];
    var xx = start; bits.forEach(function (bt) { xx += (0.5625 + (bt ? 1.6875 : 0.5625)) * k; bx.push(xx); });
    T(g, X + 4.5 * k, Y + 22, 'START', { 'text-anchor': 'middle', fill: MUT, 'font-size': 9, 'letter-spacing': '1' });
    groupNames.forEach(function (gn, j) {
      var a = bx[j * 8], z = bx[j * 8 + 8];
      S('path', { d: 'M' + (a + 2) + ' ' + (Y + 10) + ' v6 H' + (z - 2) + ' v-6', stroke: gn[2], fill: 'none', 'stroke-width': 1.5 }, g);
      T(g, (a + z) / 2, Y + 32, gn[0], { 'text-anchor': 'middle', fill: gn[2], 'font-size': 9, 'letter-spacing': '1' });
      T(g, (a + z) / 2, Y + 48, gn[1], { 'text-anchor': 'middle', fill: gn[2], 'font-size': 12 });
      if (labels !== false) for (var q = 0; q < 8; q++) T(g, (bx[j * 8 + q] + bx[j * 8 + q + 1]) / 2, Y - 46, String(bits[j * 8 + q]), { 'text-anchor': 'middle', fill: j === 2 ? CY : '#4b6a8a', 'font-size': 8 });
    });
    if (st) {
      var ph = S('line', { x1: X, y1: Y - 58, x2: X, y2: Y + 6, stroke: SIG, 'stroke-width': 2 }, g), led = S('circle', { cx: X + W + 26, cy: Y - 20, r: 18, fill: 'url(#m7g-ir)', opacity: 0 }, g);
      S('circle', { cx: X + W + 26, cy: Y - 20, r: 6, fill: '#3b2a4f' }, g);
      var t0 = performance.now(), dur = 3400;
      if (st.raf) cancelAnimationFrame(st.raf);
      (function tk(t) { var f = ((t - t0) % (dur + 800)) / dur; if (f > 1) f = 1; var px = X + f * W; ph.setAttribute('x1', px); ph.setAttribute('x2', px); led.setAttribute('opacity', bursts.some(function (bb) { return px >= bb[0] && px <= bb[1]; }) && f < 1 ? 1 : 0); st.raf = requestAnimationFrame(tk); })(t0);
      st.stop = function () { cancelAnimationFrame(st.raf); };
    }
    return bits;
  }
  function necLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Decode a button</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 820 200', role: 'img', 'aria-label': 'The NEC infrared message for a remote key' }); stage.appendChild(svg); glowDefs(svg);
    S('rect', { x: 0, y: 0, width: 820, height: 200, fill: BG }, svg);
    var layer = S('g', {}, svg), st = {};
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Key</label>';
    var pills = el('div', 'res-pills'); row.appendChild(pills); box.appendChild(row);
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var seen = ctx.check('neclab') || {};
    function show(lab) {
      var c = KEY[lab]; clear(layer); necDraw(layer, c, 40, 110, 700, st, true);
      var bin = ('0000000' + c.toString(2)).slice(-8);
      ro.innerHTML = '<div><span class="label">Key</span><b>' + esc(lab) + '</b></div><div><span class="label">Command</span><b>' + hex(c) + '</b></div><div><span class="label">In binary</span><span class="small">' + bin.slice(0, 4) + ' ' + bin.slice(4) + ' (sent right to left: ' + bin.split('').reverse().join('').replace(/(.{4})/, '$1 ') + ')</span></div><div><span class="label">In decimal</span><b>' + c + '</b></div>';
      pills.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.k === lab); });
      seen[lab] = 1; ctx.check('neclab', seen);
    }
    RL.REMOTE.forEach(function (k) { var bt = el('button', '', esc(k[0])); bt.type = 'button'; bt.dataset.k = k[0]; bt.addEventListener('click', function () { show(k[0]); }); pills.appendChild(bt); });
    if (RL.onLeave) RL.onLeave(function () { if (st.stop) st.stop(); });
    show('▲');
  }

  /* ---------- 03 build: IR receiver + read codes ---------- */
  steps.push({ id: 'build-ir', title: 'Build: the IR receiver', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The receiver module has three pins: <b>S</b> (signal), <b>+</b> and <b>−</b>. Some modules label them <b>Y</b> (signal), <b>R</b> (+) and <b>G</b> (ground) instead. Connect it with three female-to-male wires.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable while you wire. Double-check + and − before plugging back in: a receiver wired backwards gets hot and can be ruined.</p>');
    B.guide(b, { title: 'IR receiver', vb: VB7, parts: ALL, base: [], steps: [
      { title: 'Power the rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p>The same power setup as Mission 01: red <b>5V → left + rail</b>, black <b>GND → left − rail</b>, and red and black bridges to the right-hand rails at the bottom.</p>' },
      { title: 'Place the receiver', add: ['ir'], html: '<p>Push three <b>female-to-male</b> wires onto the receiver’s pins (socket end on the module). Stand it where it can “see” the remote: the dark dome is the sensor.</p>' },
      { title: '+ and −', add: ['ir_v', 'ir_g'], html: '<p>Wire <b>+</b> to the right <b>+ rail</b> and <b>−</b> to the right <b>− rail</b>. The receiver needs only about 1 mA.</p>' },
      { title: 'Signal → pin 2', add: ['ir_s'], html: '<p>Wire <b>S</b> to <b>pin 2</b>. When a burst arrives, S goes LOW, and the IRremote library times every burst and gap to rebuild the 32 bits.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>S → pin 2, + → + rail, − → − rail. Plug in the USB: the receiver’s little red LED should blink when you press a remote button near it.</p>' }
    ] });
    UI.html(b, '<h2>Install the IRremote library</h2><p>Decoding those 32 bits by hand would be a lot of work, so you’ll use a library. In the Arduino IDE: <b>Sketch → Include Library → Manage Libraries…</b>, search <b>IRremote</b>, and install the one <b>by shirriff, z3t0, ArminJo</b> (version 4.x). In the Cloud Editor, open <b>Libraries</b>, search <b>IRremote</b> and add it.</p>');
    UI.callout(b, 'plain', 'Old tutorials, new library', '<p>Many tutorials online (including ELEGOO’s) were written for IRremote version 2, with lines like <code>IRrecv irrecv(11);</code> and long codes like <code>0xFF629D</code>. Version 4 works differently: it gives you a short <b>command</b> number for each button, like <code>0x46</code>. Use the code on this page.</p>');
    UI.html(b, '<h2>Code it: discover your remote’s codes</h2>');
    RL.Code.walk(b, IRCODES, [
      { lines: [2, 2], title: 'The library', html: '<p><code>IRremote.hpp</code> is version 4 of the library. It creates a ready-made object called <code>IrReceiver</code> for you.</p>' },
      { lines: [8, 8], title: 'Start listening', html: '<p><code>IrReceiver.begin(pin, ENABLE_LED_FEEDBACK)</code> starts watching pin 2 in the background, and flickers the UNO’s L LED whenever a signal arrives — handy for testing.</p>' },
      { lines: [13, 13], title: 'Did a message arrive?', html: '<p><code>decode()</code> is <code>true</code> once a complete message has been received and checked. Most passes through loop() it’s false and nothing happens.</p>' },
      { lines: [14, 14], title: 'The command number', html: '<p>The decoded message is stored in <code>IrReceiver.decodedIRData</code>. Its <code>.command</code> is the button’s number (the COMMAND byte you saw in the lab).</p>' },
      { lines: [15, 16], title: 'Print in hexadecimal', html: '<p>Programmers write these codes in <b>hexadecimal</b> (base 16, digits 0–9 then A–F), marked with <code>0x</code>. <code>Serial.println(code, HEX)</code> prints it that way.</p>' },
      { lines: [17, 17], title: 'resume()', html: '<p>Tells the library you’re done with this message so it can receive the next one. Forget it and you’ll only ever get one button press.</p>' }
    ], { name: 'ir_codes' });
    UI.html(b, '<p>Run it, then click keys on the Virtual UNO’s remote and watch the Serial Monitor.</p>');
    RL.Sim.create(b, { title: 'Read remote codes', code: IRCODES, name: 'ir_codes', key: 'sim-ircodes', ctx: ctx, board: { parts: ALL, show: IDS_IR, view: SIM_VIEW_IR, vb: VB7 }, ir: { pin: 2, part: 'ir' }, runHint: 'click keys on the remote.', checkAfter: 800,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          sim.ir(0x09); setTimeout(function () { sim.ir(0x16); }, 300);
          setTimeout(function () {
            var t = sim.serialText(), r;
            if (!/0x9\b|0x09\b/i.test(t) || !/0x16\b/i.test(t)) r = { pass: false, msg: 'Pressing ▲ and 0 should print Command: 0x9 and Command: 0x16 in the Serial Monitor. Check decode(), .command and resume().' };
            else r = { pass: true, msg: '▲ printed 0x9 and 0 printed 0x16. Your receiver code works.' };
            ctx.check('sim-ircodes-pass', r.pass ? 1 : 0); resolve(r);
          }, 900);
        });
      } });
    UI.html(b, '<h2>Upload it and fill in your code table</h2><p>Upload the sketch, open the <b>Serial Monitor</b> (magnifying glass, top right; set it to <b>9600 baud</b>), and press every button. Write down the codes you’ll use. Hold a button down and notice it repeats — the remote keeps sending while you hold it.</p>');
    UI.note(b, ctx, { id: 'n-codes', label: 'Your remote’s codes: write the command for ▶▶|, |◀◀, ▲, ▼, ▶|| and 0 to 7.', placeholder: '▶▶| = 0x43, |◀◀ = …', rows: 4 });
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Nothing prints at all</b><br><span class="small muted">Is the Serial Monitor at 9600 baud? Does the receiver’s LED blink when you press? If not, check + and − and try the phone-camera test on the remote.</span></div></div><div class="trow"><div><b>“IrReceiver was not declared”</b><br><span class="small muted">The library isn’t installed, or you installed an old version. Install IRremote 4.x by shirriff, z3t0, ArminJo.</span></div></div><div class="trow"><div><b>Only the first press prints</b><br><span class="small muted">IrReceiver.resume() is missing.</span></div></div></div>');
  } });

  /* ---------- 04 stepper motors ---------- */
  steps.push({ id: 'stepper', title: 'How a stepper motor steps', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">An ordinary motor just spins. A <b>stepper motor</b> moves in exact little jumps called <b>steps</b> — so if you send 512 steps, it turns exactly 90°, every time, without needing a sensor. That’s why 3D printers, robot arms and camera sliders use them.</p>');
    UI.explainer(b, { label: 'Explainer', title: 'Coils, a magnet and a sequence', w: 820, h: 360,
      init: function (svg, S2, st) {
        glowDefs(svg); S('rect', { x: 0, y: 0, width: 820, height: 360, fill: BG }, svg);
        var cx = 230, cy = 180, R = 110;
        T(svg, 20, 30, 'INSIDE (SIMPLIFIED)', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        S('circle', { cx: cx, cy: cy, r: R + 34, fill: 'none', stroke: GRID, 'stroke-width': 2 }, svg);
        st.coils = {}; st.glows = {};
        [['A', -90], ['B', 0], ['C', 90], ['D', 180]].forEach(function (c) {
          var a = c[1] * Math.PI / 180, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          st.glows[c[0]] = S('circle', { cx: x, cy: y, r: 40, fill: 'url(#m7g-cyan)', opacity: 0 }, svg);
          var g = S('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + (c[1] + 90) + ')' }, svg);
          st.coils[c[0]] = S('rect', { x: -22, y: -16, width: 44, height: 32, rx: 4, fill: '#7a5b2a', stroke: '#c9a24d', 'stroke-width': 2 }, g);
          for (var i = -16; i <= 16; i += 6) S('line', { x1: i, y1: -16, x2: i, y2: 16, stroke: '#c9a24d', 'stroke-width': 1.5 }, g);
          T(svg, cx + Math.cos(a) * (R + 52), cy + Math.sin(a) * (R + 52) + 5, c[0], { 'text-anchor': 'middle', fill: INK, 'font-size': 15, 'font-weight': 600 });
        });
        st.rotor = S('g', {}, svg);
        S('circle', { cx: 0, cy: 0, r: 52, fill: '#121c2b', stroke: '#9fb3c8', 'stroke-width': 2 }, st.rotor);
        S('path', { d: 'M-10 0 L-10 -46 A46 46 0 0 1 10 -46 L10 0 Z', fill: '#e5484d' }, st.rotor); S('path', { d: 'M-10 0 L-10 46 A46 46 0 0 0 10 46 L10 0 Z', fill: '#3b82f6' }, st.rotor);
        T(st.rotor, 0, -24, 'N', { 'text-anchor': 'middle', 'font-size': 13, fill: '#fff', 'font-weight': 700 }); T(st.rotor, 0, 34, 'S', { 'text-anchor': 'middle', 'font-size': 13, fill: '#fff', 'font-weight': 700 });
        S('circle', { cx: 0, cy: 0, r: 7, fill: '#facc15' }, st.rotor);
        // driver LEDs
        T(svg, 560, 50, 'ULN2003 LEDS', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        st.leds = {};
        ['A', 'B', 'C', 'D'].forEach(function (k, i) { T(svg, 500 + i * 40, 104, k, { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); st.leds[k] = S('circle', { cx: 500 + i * 40, cy: 80, r: 10, fill: '#5b1d1d', stroke: '#7a2a2a' }, svg); });
        st.patT = T(svg, 560, 150, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 16 });
        st.info = T(svg, 560, 190, '', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
        st.angT = T(svg, 560, 250, '', { 'text-anchor': 'middle', fill: INK, 'font-size': 28, 'font-weight': 600 });
        st.warn = T(svg, 560, 300, '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 13, 'letter-spacing': '1' });
        var ang = 0, target = 0, wob = 0;
        (function tk(t) { ang += (target - ang) * 0.18; var w = wob ? Math.sin(t / 30) * wob : 0; st.rotor.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + (ang + w) + ')'); st.raf = requestAnimationFrame(tk); })(0);
        st.stop = function () { cancelAnimationFrame(st.raf); };
        st.energise = function (on, tgt, wobble) {
          ['A', 'B', 'C', 'D'].forEach(function (k) { var o = on.indexOf(k) >= 0; st.coils[k].setAttribute('fill', o ? '#0e7490' : '#7a5b2a'); st.coils[k].setAttribute('stroke', o ? CY : '#c9a24d'); st.glows[k].setAttribute('opacity', o ? 0.8 : 0); st.leds[k].setAttribute('fill', o ? '#ff4d4d' : '#5b1d1d'); });
          if (tgt != null) { while (tgt - target > 180) tgt -= 360; while (target - tgt > 180) tgt += 360; target = tgt; }
          wob = wobble || 0;
          st.patT.textContent = ['A', 'B', 'C', 'D'].map(function (k) { return on.indexOf(k) >= 0 ? '1' : '0'; }).join(' ');
        };
      },
      frames: [
        { cap: '<b>A coil is an electromagnet.</b> Current through a coil of wire makes it magnetic. In the middle sits the <b>rotor</b>, a permanent magnet on the shaft. Switch on coil A and the rotor’s north pole swings to face it.', draw: function (svg, S2, st) { st.energise(['A'], 0); st.info.textContent = 'only coil A has current'; st.angT.textContent = ''; st.warn.textContent = ''; } },
        { cap: '<b>Switch the coils on in order and the rotor follows.</b> A, then B, then C, then D: each change pulls the magnet one step further round. The four red LEDs on your driver board show exactly this — they light up with the coils.', draw: function (svg, S2, st) { st.warn.textContent = ''; var seq = [['A', 0], ['B', 90], ['C', 180], ['D', 270]], k = 0; st.info.textContent = 'one coil at a time'; (function go() { var s = seq[k % 4]; st.energise([s[0]], s[1]); st.angT.textContent = 'step ' + (k + 1); k++; st.later(go, 800); })(); } },
        { cap: '<b>Two coils at once is stronger.</b> The Stepper library switches on two neighbours at a time: AB, BC, CD, DA. The rotor settles <i>between</i> them and pulls harder. Run it backwards (DA, CD, BC, AB) and the motor turns the other way.', draw: function (svg, S2, st) { st.warn.textContent = ''; var seq = [[['A', 'B'], 45], [['B', 'C'], 135], [['C', 'D'], 225], [['D', 'A'], 315]], k = 0; st.info.textContent = 'AB → BC → CD → DA'; (function go() { var s = seq[k % 4]; st.energise(s[0], s[1]); st.angT.textContent = 'step ' + (k + 1); k++; st.later(go, 800); })(); } },
        { cap: '<b>Why <code>Stepper motor(2048, 8, 10, 9, 11)</code>?</b> The library was written for a different kind of motor, so it switches its four pins in the pattern 1010, 0110, 0101, 1001. Listed in order (8, 9, 10, 11) that turns on <b>opposite</b> coils — A and C pull against each other — and the motor just buzzes back and forth.', draw: function (svg, S2, st) { var seq = [[['A', 'C'], null, 25], [['B', 'C'], 135, 0], [['B', 'D'], null, 25], [['A', 'D'], 315, 0]], k = 0; st.info.textContent = 'pins listed 8, 9, 10, 11 (wrong)'; st.angT.textContent = ''; (function go() { var s = seq[k % 4]; st.energise(s[0], s[1], s[2]); st.warn.textContent = s[2] ? 'OPPOSITE COILS: STUCK' : ''; k++; st.later(go, 700); })(); } },
        { cap: '<b>Swap the middle two and it works.</b> Listing the pins as 8, 10, 9, 11 (IN1, IN3, IN2, IN4) turns the library’s pattern into AB, BC, CD, DA — neighbours, in order. Same wires, same library, just the right order in one line of code.', draw: function (svg, S2, st) { st.warn.textContent = ''; var seq = [[['A', 'B'], 45], [['B', 'C'], 135], [['C', 'D'], 225], [['D', 'A'], 315]], k = 0; st.info.textContent = 'pins listed 8, 10, 9, 11 (right)'; (function go() { var s = seq[k % 4]; st.energise(s[0], s[1]); st.angT.textContent = 'step ' + (k + 1); k++; st.later(go, 700); })(); } }
      ] });
    UI.html(b, '<h2>2048 steps per turn</h2><p>The real 28BYJ-48 has more teeth than the drawing: its rotor needs <b>32 steps</b> to turn once. Then a <b>gearbox</b> inside slows the shaft down 64 times (and makes it 64 times stronger). So the shaft needs 32 × 64 = <b>2048 steps</b> for one full turn — each step is just 0.18°.</p>');
    gearLab(b, ctx);
    UI.numq(b, ctx, { id: 'q-steps90', q: 'How many steps turn the shaft <b>90°</b>?', answer: 512, tol: 0, unit: 'steps', explain: '90° is a quarter of a turn: 2048 ÷ 4 = <b>512 steps</b>.', hint: 'What fraction of 360° is 90°? Take that fraction of 2048.' });
    UI.numq(b, ctx, { id: 'q-steps30', q: 'How many steps for <b>30°</b>? Round to the nearest whole step.', answer: 171, tol: 0.6, unit: 'steps', explain: '30 × 2048 ÷ 360 = 170.67, so <b>171 steps</b>. You can’t send part of a step, so angles that don’t divide evenly are off by a tiny fraction of a degree.', hint: 'Steps = angle × 2048 ÷ 360.' });
    UI.mcq(b, ctx, { id: 'q-order', q: 'Your partner writes <code>Stepper motor(2048, 8, 9, 10, 11);</code>. The driver’s LEDs flicker but the shaft just vibrates. Why?', options: ['The motor is broken', 'The library energises opposite coils with that pin order, so they fight each other', 'The speed is too high', '2048 is the wrong number of steps'], answer: 1, explain: 'With pins in the order 8, 9, 10, 11, the library’s pattern switches on A + C and B + D, which pull in opposite directions. Listing them as 8, 10, 9, 11 fixes it.', hints: { 2: 'Too fast would make it skip, but the LEDs show the coils themselves are in a strange pattern.' } });
  } });
  function gearLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>Angles to steps</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 260', role: 'img', 'aria-label': 'Motor rotor and output shaft turning' }); stage.appendChild(svg);
    S('rect', { x: 0, y: 0, width: 800, height: 260, fill: BG }, svg);
    T(svg, 160, 30, 'ROTOR (32 STEPS / TURN)', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    T(svg, 430, 30, 'SHAFT (2048 STEPS / TURN)', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
    function gear(cx, cy, r, n) { var g = S('g', {}, svg), d = ''; for (var i = 0; i < n * 2; i++) { var a = i * Math.PI / n, rr = i % 2 ? r : r + 6; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr) + ' ' + (cy + Math.sin(a) * rr); } S('path', { d: d + 'Z', fill: '#1a2636', stroke: '#9fb3c8', 'stroke-width': 1.5 }, g); S('line', { x1: cx, y1: cy, x2: cx, y2: cy - r + 4, stroke: CY, 'stroke-width': 3 }, g); S('circle', { cx: cx, cy: cy, r: 5, fill: '#facc15' }, g); return g; }
    var rotor = gear(160, 140, 60, 16);
    var shaft = S('g', {}, svg); S('circle', { cx: 430, cy: 140, r: 86, fill: '#d3aa72', stroke: '#b98d55', 'stroke-width': 3 }, shaft); S('path', { d: 'M430 62 l-9 16 h18 z', fill: SIG }, shaft); S('circle', { cx: 430, cy: 140, r: 8, fill: '#8a6438' }, shaft);
    T(svg, 295, 146, '÷ 64', { 'text-anchor': 'middle', fill: CY, 'font-size': 16 });
    var codeT = T(svg, 560, 120, '', { fill: CY, 'font-size': 15 }), sub = T(svg, 560, 150, '', { fill: MUT, 'font-size': 12 });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Angle</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 360; r.value = 90; r.setAttribute('aria-label', 'Angle'); var o = el('b', '', '90°');
    var pills = el('div', 'res-pills'); [45, 90, 180, 360].forEach(function (a) { var bt = el('button', '', a + '°'); bt.type = 'button'; bt.addEventListener('click', function () { r.value = a; upd(); }); pills.appendChild(bt); });
    row.appendChild(r); row.appendChild(o); row.appendChild(pills); box.appendChild(row);
    var ro = el('div', 'readouts'); box.appendChild(ro); b.appendChild(box);
    var shown = 90, cancel = null;
    function upd() {
      var a = Number(r.value), steps = Math.round(a * 2048 / 360);
      o.textContent = a + '°'; codeT.textContent = 'motor.step(' + steps + ');'; sub.textContent = a + ' × 2048 ÷ 360 = ' + (a * 2048 / 360).toFixed(2);
      ro.innerHTML = '<div><span class="label">Steps</span><b>' + steps + '</b></div><div><span class="label">Rotor turns</span><b>' + (steps / 32).toFixed(1) + '</b></div><div><span class="label">Time at 10 RPM</span><b>' + (steps * 60 / (10 * 2048)).toFixed(1) + ' s</b></div>';
      if (cancel) cancel(); var from = shown; cancel = tween(from, a, 900, function (v) { shown = v; shaft.setAttribute('transform', 'rotate(' + v + ' 430 140)'); rotor.setAttribute('transform', 'rotate(' + (v * 64 % 360) + ' 160 140)'); });
      ctx.check('gearlab', 1);
    }
    r.addEventListener('input', upd); upd();
    if (RL.onLeave) RL.onLeave(function () { if (cancel) cancel(); });
  }

  /* ---------- 05 driver, power & build ---------- */
  steps.push({ id: 'power', title: 'Build: driver & motor power', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">You can’t plug a motor straight into the UNO’s pins. It needs a <b>driver</b> to switch its big current, and a <b>power supply</b> of its own. Here’s why — then you’ll wire it.</p>');
    driverExplainer(b);
    UI.mcq(b, ctx, { id: 'q-driver', q: 'Why does the motor connect through the ULN2003 driver instead of straight to pins 8–11?', options: ['The driver makes the motor turn faster', 'Each coil needs about 100 mA, but an UNO pin can only safely give about 20 mA', 'The UNO’s pins can’t make a sequence', 'The driver decodes the remote'], answer: 1, explain: 'The UNO only sends a tiny signal into the driver. The driver’s transistors switch the coils’ much bigger current, which comes from the power module, not the UNO.', hints: { 2: 'The UNO makes the sequence fine. The problem is how much current a pin can supply.' } });
    UI.mcq(b, ctx, { id: 'q-ground', q: 'Everything is wired except the black wire from the UNO’s GND to the − rail. What happens?', options: ['Nothing — the battery powers the motor anyway', 'The motor doesn’t move properly: the signals have no path back to the UNO, so the driver can’t read HIGH and LOW', 'The UNO is damaged instantly', 'The motor spins non-stop'], answer: 1, explain: 'A signal is a voltage measured against ground. Without a shared ground, the driver has no reference for the UNO’s HIGH and LOW, and the signal current has no way back. Common ground: always.' });
    UI.html(b, '<h2>Build it</h2><p>You’ll add the power supply module, which plugs onto the top of the breadboard and feeds both pairs of rails from a 9 V battery. Since the module powers the rails now, the UNO’s 5V wire comes <b>out</b>. The UNO’s GND wire stays — that’s the common ground.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB and keep the battery disconnected until the last step. Set <b>both</b> yellow jumpers on the module to <b>5V</b> (the motor is too weak on 3.3 V). Never connect the UNO’s 5V pin to rails that the power module is feeding: two supplies fighting can damage your laptop’s USB port or the UNO.</p>');
    B.guide(b, { title: 'Stepper + power', vb: VB7, parts: ALL, base: IDS_IR, steps: [
      { title: 'Start from the IR circuit', view: 'all', html: '<p>The receiver and its wires stay. You’re about to change where the rails get their power.</p>' },
      { title: 'Remove the UNO’s 5V wire', remove: ['p5v'], html: '<p>Pull out the <b>red wire from the UNO’s 5V pin</b>. Keep the black GND wire: the UNO and the power module must share ground.</p>' },
      { title: 'Plug in the power module', add: ['psu'], html: '<p>Press the power supply module onto the <b>top end</b> of the breadboard so its pins go into all four rails. Line up its + and − markings with the red and blue rail lines. Move both yellow jumpers to <b>5V</b>.</p>' },
      { title: 'Connect the motor to the driver', add: ['st'], html: '<p>The motor’s white plug fits the driver board’s socket only one way. Push it in firmly.</p>' },
      { title: 'Signal wires IN1–IN4', add: ['st1', 'st2', 'st3', 'st4'], html: '<p>Four female-to-male wires: <b>pin 8 → IN1</b>, <b>pin 9 → IN2</b>, <b>pin 10 → IN3</b>, <b>pin 11 → IN4</b>. (The swapped order happens in the code, not the wiring.)</p>' },
      { title: 'Driver power', add: ['st_g', 'st_v'], html: '<p>Driver <b>− → − rail</b> and <b>+ → + rail</b>. The motor’s current now flows from the power module through the driver, and never through the UNO.</p>' },
      { title: 'Check, then power up', view: 'all', html: '<p>Check: UNO 5V wire <b>removed</b>, UNO GND wire <b>still there</b>, both jumpers on 5V, driver + and − to the rails. Plug in the USB, connect the 9 V battery to the module and press its power button: its green LED lights.</p>' }
    ] });
  } });
  function driverExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Drivers, power and a shared ground', w: 820, h: 360,
      init: function (svg, S2, st) {
        glowDefs(svg); S('rect', { x: 0, y: 0, width: 820, height: 360, fill: BG }, svg);
        function blk(x, y, w, h, fill, label, sub) { S('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: fill, stroke: '#3b4350', 'stroke-width': 2 }, svg); T(svg, x + w / 2, y + h / 2 + (sub ? -4 : 5), label, { 'text-anchor': 'middle', 'font-size': 13, 'letter-spacing': '1' }); if (sub) T(svg, x + w / 2, y + h / 2 + 14, sub, { 'text-anchor': 'middle', 'font-size': 10, fill: MUT }); }
        // wires first, then the moving dots, then the parts on top (so dots pass "through" the parts)
        S('path', { d: 'M160 130 H330', stroke: '#9fb3c8', 'stroke-width': 2, fill: 'none' }, svg);
        S('path', { d: 'M600 262 C 600 236, 650 214, 660 190 M640 96 C 600 60, 520 70, 480 120', stroke: '#9fb3c8', 'stroke-width': 4, fill: 'none' }, svg);
        S('path', { d: 'M95 200 V300 H500 M405 200 V280 H500', stroke: '#9fb3c8', 'stroke-width': 3, fill: 'none' }, svg);
        st.gap = S('rect', { x: 210, y: 290, width: 40, height: 20, fill: BG, opacity: 0 }, svg);
        st.gapT = T(svg, 230, 332, '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 11, 'letter-spacing': '1' });
        T(svg, 300, 318, 'GROUND', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        st.fSig = flow(svg, S('path', { d: 'M160 130 H330 L405 150 L405 280 H500 V300 H95 V200 L95 140', fill: 'none', stroke: 'none' }, svg), 12, CY, 2.5);
        st.fBig = flow(svg, S('path', { d: 'M600 262 C 600 236, 650 214, 660 190 L640 96 C 600 60, 520 70, 480 120 L405 170 V280 H600 V262', fill: 'none', stroke: 'none' }, svg), 18, CY, 5);
        st.unoLine = S('path', { d: 'M95 90 V40 H680 V86', stroke: SIG, 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '6 6', opacity: 0 }, svg);
        st.fUno = flow(svg, S('path', { d: 'M95 90 V40 H680 V86', fill: 'none', stroke: 'none' }, svg), 16, SIG, 5);
        blk(30, 90, 130, 110, '#15497a', 'UNO', 'pin 8');
        blk(330, 90, 150, 110, '#1f7a3e', 'ULN2003', 'a switch per coil');
        S('circle', { cx: 680, cy: 140, r: 54, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, svg); T(svg, 680, 145, 'COIL', { 'text-anchor': 'middle', fill: '#1c2733', 'font-size': 13 });
        st.psu = S('g', {}, svg); S('rect', { x: 500, y: 262, width: 170, height: 64, rx: 6, fill: '#16191e', stroke: '#3b4350', 'stroke-width': 2 }, st.psu); T(st.psu, 585, 290, 'POWER MODULE', { 'text-anchor': 'middle', 'font-size': 12 }); T(st.psu, 585, 308, '9 V battery → 5 V', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT });
        st.meter = T(svg, 245, 116, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 13 });
        st.meter2 = T(svg, 560, 210, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 13 });
        st.big = T(svg, 410, 30, '', { 'text-anchor': 'middle', fill: SIG, 'font-size': 13, 'letter-spacing': '1' });
        st.set = function (o) {
          st.fSig.setSpeed(o.sig ? 50 : 0); st.fBig.setSpeed(o.bigFlow ? 90 : 0); st.fUno.setSpeed(o.uno ? 120 : 0); st.unoLine.setAttribute('opacity', o.uno ? 0.7 : 0);
          st.psu.setAttribute('opacity', o.psu === false ? 0.2 : 1);
          st.gap.setAttribute('opacity', o.noGnd ? 1 : 0); st.gapT.textContent = o.noGnd ? 'GROUND WIRE MISSING' : '';
          st.meter.textContent = o.m1 || ''; st.meter2.textContent = o.m2 || ''; st.big.textContent = o.warn || '';
        };
        st.stop = function () { st.fSig.stop(); st.fBig.stop(); st.fUno.stop(); };
      },
      frames: [
        { cap: '<b>A coil needs about 100 mA</b> (two are on at a time, so about 200 mA for the motor). An UNO pin can safely give only about <b>20 mA</b> — ask for more and the pin’s voltage sags, the chip heats up, and eventually the pin dies. The orange path is what you must <i>not</i> do.', draw: function (svg, S2, st) { st.set({ uno: true, psu: false, warn: 'PIN 8 → COIL DIRECTLY: 100 mA FROM A 20 mA PIN', m1: '' }); } },
        { cap: '<b>The driver is a set of electronic switches.</b> The ULN2003 has a transistor for each coil. A tiny current from the UNO pin (under 1 mA) switches it on, and the transistor lets the coil’s big current flow to ground. Small signal in, big current out — like using a light switch instead of carrying the electricity yourself.', draw: function (svg, S2, st) { st.set({ sig: true, bigFlow: true, m1: 'signal < 1 mA', m2: 'coil ~100 mA' }); } },
        { cap: '<b>The big current comes from its own supply.</b> The power module turns the 9 V battery into 5 V on the rails. The motor’s current flows battery → driver → coil and back, without ever passing through the UNO. Motors also cause electrical spikes; keeping them off the UNO’s supply stops your UNO from randomly resetting.', draw: function (svg, S2, st) { st.set({ bigFlow: true, m2: 'from the battery, not the UNO' }); } },
        { cap: '<b>One ground for everyone.</b> “HIGH” means 5 V <i>above ground</i>, so the UNO and the driver must agree on where ground is. The signal current also needs a path back to the UNO. That’s the job of the black wire from the UNO’s GND to the − rail: the <b>common ground</b>.', draw: function (svg, S2, st) { st.set({ sig: true, bigFlow: true, m1: 'signal → driver → ground → back' }); } },
        { cap: '<b>Forget it, and nothing works.</b> Without the shared ground wire, the signal’s loop is broken. The driver can’t tell HIGH from LOW, so the motor twitches randomly or does nothing — even though both boards have power. If a motor project misbehaves, check the common ground first.', draw: function (svg, S2, st) { st.set({ noGnd: true, m1: 'no loop: no signal', warn: 'NO COMMON GROUND' }); } }
      ] });
  }

  /* ---------- 06 step the motor ---------- */
  steps.push({ id: 'step', title: 'Code it: step the motor', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">First, make sure the motor works on its own: a quarter turn one way, a quarter turn back. The <code>Stepper</code> library comes with the Arduino IDE — nothing to install.</p>');
    RL.Code.walk(b, STEPTEST, [
      { lines: [4, 5], title: 'Make a stepper object', html: '<p>Tell the library how many steps make a full turn (2048) and which pins drive IN1, IN3, IN2, IN4 — the swapped order from the explainer.</p>' },
      { lines: [8, 8], title: 'setSpeed()', html: '<p>Sets the speed in RPM (revolutions per minute). The 28BYJ-48 is slow and strong: above about 15 RPM it can’t keep up and just buzzes.</p>' },
      { lines: [14, 14], title: 'step()', html: '<p><code>motor.step(512)</code> sends 512 steps and <b>waits until they’re done</b> before the next line runs. At 10 RPM, 512 steps take 1.5 seconds.</p>' },
      { lines: [17, 17], title: 'Negative = backwards', html: '<p>A negative number runs the coil sequence in reverse.</p>' }
    ], { name: 'stepper_test' });
    RL.Sim.create(b, { title: 'Stepper test', code: STEPTEST, name: 'stepper_test', key: 'sim-step', ctx: ctx, board: { parts: ALL, show: IDS_MOTOR, view: SIM_VIEW, vb: VB7 }, stepper: 'st', checkAfter: 4600,
      check: function (log) {
        var v = log.filter(function (e) { return e.dev === 'stepper'; }).map(function (e) { return e.v; }), r;
        if (v.indexOf(512) < 0) r = { pass: false, msg: 'The motor never reached +512 steps (90°). Check motor.step(512).' };
        else if (v.indexOf(0) < 0) r = { pass: false, msg: 'The motor went 90° but never came back to 0. Check motor.step(-512).' };
        else r = { pass: true, msg: 'Forward 512 steps, back to 0. Watch the four coil LEDs light in sequence.' };
        ctx.check('sim-step-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Power the module, upload, and watch the shaft (stick a bit of tape on it like a flag so you can see it turn) and the four red LEDs on the driver.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>LEDs light but the shaft only buzzes</b><br><span class="small muted">The pin order in the Stepper line must be 8, 10, 9, 11. Also check the speed is 15 RPM or less.</span></div></div><div class="trow"><div><b>No LEDs, no movement</b><br><span class="small muted">Is the power module switched on, with both jumpers on 5V? Are driver + and − on the rails? Is the battery fresh?</span></div></div><div class="trow"><div><b>Twitches randomly</b><br><span class="small muted">Check the common ground: the black wire from UNO GND to the − rail.</span></div></div></div>');
  } });

  /* ---------- 07 remote → 45° ---------- */
  steps.push({ id: 'remote', title: 'Code it: 45° per press', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now join the two halves: read a code from the remote, and turn the motor. With more than a couple of buttons, a chain of <code>if</code>s gets messy. <b><code>switch / case</code></b> is made for exactly this.</p>');
    switchExplainer(b);
    RL.Code.walk(b, REMOTE45, [
      { lines: [ln(REMOTE45, 'STEPS_45 ='), ln(REMOTE45, 'STEPS_45 =')], title: 'Steps for 45°', html: '<p>45° is one eighth of a turn, so 2048 ÷ 8 = 256 steps. Writing it as <code>STEPS_PER_REV / 8</code> shows where the number comes from.</p>' },
      { lines: [ln(REMOTE45, 'int code ='), ln(REMOTE45, 'IrReceiver.resume();')], title: 'Read, then resume', html: '<p>Copy the command into <code>code</code> first, then call <code>resume()</code> straight away, so the receiver can catch the next press while the motor is busy turning.</p>' },
      { lines: [ln(REMOTE45, 'switch (code)'), ln(REMOTE45, 'switch (code)')], title: 'switch on the code', html: '<p><code>switch (code)</code> jumps to the <code>case</code> whose number matches.</p>' },
      { lines: [ln(REMOTE45, 'case 0x43'), ln(REMOTE45, 'case 0x43') + 3], title: 'One case', html: '<p>For ▶▶| (0x43): print a message and step 256. <code>break;</code> means “done, leave the switch.” Without it, the code would carry on into the next case.</p>' },
      { lines: [ln(REMOTE45, 'YOUR TURN'), ln(REMOTE45, 'YOUR TURN')], title: 'Your turn', html: '<p>Add a case for |◀◀ (0x44) that turns 45° the other way. Copy the pattern of the ▶▶| case.</p>' },
      { lines: [ln(REMOTE45, 'default:'), ln(REMOTE45, 'default:') + 3], title: 'default', html: '<p>Runs when no case matches: any other button. Printing its code is useful for finding codes later.</p>' }
    ], { name: 'turn_45', download: false });
    RL.Sim.create(b, { title: '45° per press', code: REMOTE45, name: 'turn_45', key: 'sim-45', ctx: ctx, board: { parts: ALL, show: IDS_MOTOR, view: SIM_VIEW, vb: VB7 }, ir: { pin: 2, part: 'ir' }, stepper: 'st', runHint: 'press ▶▶| and |◀◀ on the remote.', checkAfter: 700,
      check: function (log, sim) {
        return new Promise(function (resolve) {
          var s0 = sim.state().stepper; sim.ir(0x43);
          setTimeout(function () {
            var s1 = sim.state().stepper; sim.ir(0x44);
            setTimeout(function () {
              var s2 = sim.state().stepper, r;
              if (s1 - s0 !== 256) r = { pass: false, msg: '▶▶| should turn exactly 256 steps; it turned ' + (s1 - s0) + '.' };
              else if (s2 - s1 !== -256) r = { pass: false, msg: '|◀◀ should turn 256 steps the other way (−256); it turned ' + (s2 - s1) + '. Add a case 0x44 with motor.step(-STEPS_45); and a break;' };
              else r = { pass: true, msg: '▶▶| turned +256 steps (45°) and |◀◀ turned −256. Your remote drives the motor.' };
              ctx.check('sim-45-pass', r.pass ? 1 : 0); resolve(r);
            }, 1300);
          }, 1300);
        });
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show the |◀◀ case</summary><p class="small">Put this where the YOUR TURN comment is:</p>';
    RL.Code.block(hint, REMOTE45_HINT, { download: false }); b.appendChild(hint);
    UI.html(b, '<p style="margin-top:20px">Upload it and try your real remote. If ▶▶| turns your motor anticlockwise, that’s fine: it depends on how the motor is wound. Just swap the signs if you want ▶▶| to go clockwise.</p>');
    UI.mcq(b, ctx, { id: 'q-break', q: 'You forget the <code>break;</code> at the end of the 0x43 case. What happens when you press ▶▶|?', options: ['A compile error', 'The code “falls through” into the next case too, so it also runs the |◀◀ code', 'Nothing happens', 'The motor turns twice as fast'], answer: 1, explain: 'Without break, C++ keeps running into the next case’s code. Here the turntable would turn +45° and then straight back −45°: it would seem to do nothing.' });
  } });
  function switchExplainer(b) {
    var CASES = [['0x43', '▶▶|', 'step +256'], ['0x44', '|◀◀', 'step −256'], ['0x16', '0', 'go home'], ['default', 'other', 'print the code']];
    UI.explainer(b, { label: 'Explainer', title: 'switch / case: a menu for codes', w: 820, h: 300,
      init: function (svg, S2, st) {
        glowDefs(svg); S('rect', { x: 0, y: 0, width: 820, height: 300, fill: BG }, svg);
        st.rm = remoteArt(svg, 40, 24, 0.9);
        S('rect', { x: 230, y: 110, width: 150, height: 60, rx: 6, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg);
        st.codeT = T(svg, 305, 134, 'switch (code)', { 'text-anchor': 'middle', fill: INK, 'font-size': 13 }); st.val = T(svg, 305, 156, '', { 'text-anchor': 'middle', fill: CY, 'font-size': 13 });
        st.rows = CASES.map(function (c, i) { var y = 40 + i * 62; var r = S('rect', { x: 470, y: y, width: 310, height: 46, rx: 6, fill: '#0e1826', stroke: '#9fb3c8', 'stroke-width': 2 }, svg); T(svg, 488, y + 28, (c[0] === 'default' ? 'default:' : 'case ' + c[0] + ':'), { fill: INK, 'font-size': 13 }); T(svg, 640, y + 28, c[2], { fill: MUT, 'font-size': 12 }); S('path', { d: 'M380 140 C 420 140, 430 ' + (y + 23) + ', 470 ' + (y + 23), stroke: GRID, 'stroke-width': 2, fill: 'none' }, svg); return r; });
        st.hl = function (i) { st.rows.forEach(function (r, j) { r.setAttribute('stroke', j === i ? CY : '#9fb3c8'); r.setAttribute('fill', j === i ? '#0a2a36' : '#0e1826'); r.setAttribute('stroke-width', j === i ? 3 : 2); }); };
      },
      frames: [
        { cap: '<b>One value, many possible matches.</b> <code>switch (code)</code> looks at the code once, then jumps straight to the <code>case</code> with the same number and runs it until <code>break;</code>. If nothing matches, it runs <code>default:</code>.', draw: function (svg, S2, st) {
          var seq = [['▶▶|', 0], ['0', 2], ['|◀◀', 1], ['EQ', 3]], k = 0;
          (function go() { var s = seq[k % 4]; st.rm.press(s[0], true); st.later(function () { st.rm.press(s[0], false); }, 300); st.val.textContent = 'code = ' + hex(KEY[s[0]]); st.hl(s[1]); k++; st.later(go, 1500); })();
        } }
      ] });
  }

  /* ---------- 08 presets & final ---------- */
  steps.push({ id: 'presets', title: 'Code it: presets & home', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A stepper has no sensor: it doesn’t know where it is. But your code knows every step it sent. Keep a running total in a variable, and the turntable can go to any angle, find its way home, and even take the short way round.</p>');
    positionExplainer(b);
    UI.numq(b, ctx, { id: 'q-pos', q: 'The turntable is at <code>position = 768</code> (135°). You press <b>1</b> (go to 45°, which is 256 steps). What is <code>change</code>, the number of steps sent?', answer: -512, tol: 0, unit: 'steps', explain: 'change = target − position = 256 − 768 = <b>−512</b>: 90° anticlockwise. It’s less than half a turn, so it goes that way.', hint: 'change = target − position. It can be negative.' });
    RL.Code.walk(b, FINAL, [
      { lines: [ln(FINAL, 'long position'), ln(FINAL, 'long position')], title: 'The position variable', html: '<p>Steps from home, kept between 0 and 2047. It’s a <code>long</code> because the maths below multiplies it by 360, and an <code>int</code> on the UNO tops out at 32 767.</p>' },
      { lines: [ln(FINAL, 'switch (code)'), ln(FINAL, 'case 0x42')], title: 'Every button gets a case', html: '<p>Short cases fit on one line. Turning buttons call <code>turnBy()</code>; number keys call <code>goToAngle()</code>. Moving the work into functions keeps the switch easy to read.</p>' },
      { lines: [ln(FINAL, 'case 0x0D'), ln(FINAL, 'case 0x0D') + 3], title: 'Set home', html: '<p>If the turntable slips, or you turn it by hand, the variable is wrong. Line it up with the home mark by eye (▲/▼ nudge it), press ST/REPT, and that spot becomes 0 again.</p>' },
      { lines: [ln(FINAL, 'void turnBy'), ln(FINAL, 'void turnBy') + 7], title: 'turnBy(): move and count', html: '<p>Step the motor, then add the steps to <code>position</code>. The <code>%</code> (remainder) keeps it within one turn: after a full 2048-step turn you’re back where you started. If it goes negative, adding 2048 brings it back into 0–2047.</p>' },
      { lines: [ln(FINAL, 'void goToAngle'), ln(FINAL, 'void goToAngle') + 2], title: 'goToAngle(): degrees → steps', html: '<p>Convert the angle into a target step, then work out the change needed from where we are now. The brackets around <code>angle * STEPS_PER_REV</code> make sure the multiplication happens <i>before</i> the division (whole-number division would throw away the fraction).</p>' },
      { lines: [ln(FINAL, 'if (change > STEPS_PER_REV'), ln(FINAL, 'turnBy(change);')], title: 'The short way round', html: '<p>If the change is more than half a turn (1024 steps), going the other way is shorter: subtract a full turn. 270° clockwise becomes 90° anticlockwise.</p>' },
      { lines: [ln(FINAL, 'void report'), ln(FINAL, 'void report') + 5], title: 'Report the angle', html: '<p>Convert steps back into degrees for the Serial Monitor, so you can see what the turntable thinks.</p>' }
    ], { name: 'turntable' });
    UI.html(b, '<h2>Test it on the Virtual UNO</h2><p>Try the number keys, then 0 to come home. Watch the Serial Monitor. <b>Check my code</b> presses 2, 7 and 0 and checks the turntable takes the short way each time.</p>');
    RL.Sim.create(b, { title: 'Remote turntable', code: FINAL, name: 'turntable', key: 'sim-final', ctx: ctx, board: { parts: ALL, show: IDS_MOTOR, view: SIM_VIEW, vb: VB7 }, ir: { pin: 2, part: 'ir' }, stepper: 'st', runHint: 'press number keys, 0 for home.', checkAfter: 700,
      check: function (log, sim) {
        function mod(n) { return ((n % 2048) + 2048) % 2048; }
        // wait until the motor has stopped moving (polls the step count), then call fn
        function settle(fn) { var last = null, same = 0, t0 = Date.now(); (function poll() { var v = sim.state().stepper; same = v === last ? same + 1 : 0; last = v; if (same >= 3 || Date.now() - t0 > 7000) fn(); else setTimeout(poll, 150); })(); }
        return new Promise(function (resolve) {
          function fin(r) { ctx.check('sim-final-pass', r.pass ? 1 : 0); resolve(r); }
          var s0 = sim.state().stepper; sim.ir(0x18);
          setTimeout(function () { settle(function () {
            var s1 = sim.state().stepper;
            if (mod(s1 - s0) !== 512) return fin({ pass: false, msg: 'Key 2 should go to 90° (512 steps from home). The motor moved ' + (s1 - s0) + ' steps.' });
            sim.ir(0x42);
            setTimeout(function () { settle(function () {
              var s2 = sim.state().stepper;
              if (mod(s2 - s0) !== 1792) return fin({ pass: false, msg: 'Key 7 should go to 315° (1792 steps from home). The turntable ended ' + mod(s2 - s0) + ' steps from home.' });
              if (s2 - s1 !== -768) return fin({ pass: false, msg: 'Key 7 reached 315°, but it went the long way (' + (s2 - s1) + ' steps). From 90° the short way is 135° anticlockwise (−768). Check the “short way round” lines in goToAngle().' });
              sim.ir(0x16);
              setTimeout(function () { settle(function () {
                var s3 = sim.state().stepper, t = sim.serialText();
                if (mod(s3 - s0) !== 0) return fin({ pass: false, msg: 'Key 0 should bring the turntable home, but it stopped ' + mod(s3 - s0) + ' steps away.' });
                if (s3 - s2 !== 256) return fin({ pass: false, msg: 'From 315° home the short way is +45° (256 steps), but it moved ' + (s3 - s2) + '.' });
                if (!/Position/.test(t)) return fin({ pass: false, msg: 'The turntable moves correctly, but nothing about its position appeared in the Serial Monitor. Is report() called?' });
                fin({ pass: true, msg: '2 → 90° (+512), 7 → 315° the short way (−768), 0 → home the short way (+256). Position tracking works.' });
              }); }, 400);
            }); }, 400);
          }); }, 400);
        });
      } });
    UI.html(b, '<h2>Upload to your board</h2><p>Mark a <b>home arrow</b> on your motor or base with tape, line up the shaft flag with it, then press reset (or ST/REPT) so position 0 really is home. Try every button.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>It turns twice, or keeps going while you hold a key</b><br><span class="small muted">The remote sends repeat signals while a key is held. Tap keys quickly.</span></div></div><div class="trow"><div><b>Presses during a turn get lost</b><br><span class="small muted">The UNO is busy inside motor.step(); it catches one press, which runs when the turn ends. Wait for each move to finish.</span></div></div><div class="trow"><div><b>Home slowly drifts</b><br><span class="small muted">The motor skipped steps: the platter is too heavy or rubbing. Lighten it, centre the load, or slow down with setSpeed(8).</span></div></div></div>');
  } });
  function positionExplainer(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Keeping track of position', w: 820, h: 340,
      init: function (svg, S2, st) {
        glowDefs(svg); S('rect', { x: 0, y: 0, width: 820, height: 340, fill: BG }, svg);
        st.pl = platterArt(svg, 220, 180, 110, { labels: true });
        T(svg, 470, 70, 'position', { fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        st.pos = T(svg, 470, 104, '', { fill: CY, 'font-size': 26, 'font-weight': 600 });
        st.l1 = T(svg, 470, 160, '', { fill: INK, 'font-size': 14 }); st.l2 = T(svg, 470, 190, '', { fill: INK, 'font-size': 14 }); st.l3 = T(svg, 470, 220, '', { fill: MUT, 'font-size': 13 });
        st.arc = S('path', { d: '', stroke: CY, 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '6 6' }, svg);
        st.p = 0; st.cancel = null;
        st.showPos = function (p) { var q = ((Math.round(p) % 2048) + 2048) % 2048; st.pos.textContent = q + ' steps  (' + Math.round(q * 360 / 2048) + '°)'; };
        st.move = function (to, ms, done) { var from = st.p; st.p = to; if (st.cancel) st.cancel(); st.cancel = tween(from, to, ms || 1200, function (v) { st.pl.set(v * 360 / 2048); st.showPos(v); }, done); };
        st.arcTo = function (a0, a1) { if (a0 === a1) { st.arc.setAttribute('d', ''); return; } var r = 92, cx = 220, cy = 180, s = (a0 - 90) * Math.PI / 180, e = (a1 - 90) * Math.PI / 180, large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0; st.arc.setAttribute('d', 'M' + (cx + r * Math.cos(s)) + ' ' + (cy + r * Math.sin(s)) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + (cx + r * Math.cos(e)) + ' ' + (cy + r * Math.sin(e))); };
        st.reset = function (p) { if (st.cancel) st.cancel(); st.p = p; st.pl.set(p * 360 / 2048); st.showPos(p); st.arcTo(0, 0); };
        st.stop = function () { if (st.cancel) st.cancel(); };
      },
      frames: [
        { cap: '<b>Count every step.</b> The turntable starts at home: position 0. Each ▶▶| press sends 256 steps and adds 256 to <code>position</code>. The motor doesn’t know where it is, but the variable does.', draw: function (svg, S2, st) {
          st.reset(0); st.l1.textContent = 'press ▶▶|'; st.l2.textContent = 'position = position + 256;'; st.l3.textContent = '';
          var k = 0; (function go() { if (k >= 3) { st.later(function () { st.reset(0); k = 0; go(); }, 1400); return; } st.move((k + 1) * 256, 900); k++; st.later(go, 1400); })();
        } },
        { cap: '<b>Go to an exact angle.</b> To reach 270°, the code converts it to a <b>target</b> (270 × 2048 ÷ 360 = 1536) and sends the difference: <code>change = target − position</code>. From 90° (512) that’s 1536 − 512 = 1024 steps.', draw: function (svg, S2, st) {
          st.reset(512); st.l1.textContent = 'press 6: goToAngle(270)'; st.l2.textContent = 'target = 1536'; st.l3.textContent = 'change = 1536 − 512 = 1024'; st.arcTo(90, 270); st.later(function () { st.move(1536, 1800); }, 700);
        } },
        { cap: '<b>Take the short way round.</b> From 45° to 315° the change is +1536 steps (270°). But anything over half a turn is shorter the other way: 1536 − 2048 = <b>−512</b>, just 90° back. The code checks for this before it moves.', draw: function (svg, S2, st) {
          st.reset(256); st.l1.textContent = 'press 7: goToAngle(315)'; st.l2.textContent = 'change = 1792 − 256 = 1536'; st.l3.textContent = 'more than 1024? → 1536 − 2048 = −512'; st.arcTo(45, -45); st.later(function () { st.move(-256, 1200); }, 900);
        } },
        { cap: '<b>Home, and why it can drift.</b> Pressing 0 goes back to position 0. If the platter is too heavy, the motor can <i>skip</i> steps, or someone turns it by hand — then the variable no longer matches reality. Real machines (like 3D printers) solve this with a limit switch; your turntable has a “set home” button instead.', draw: function (svg, S2, st) {
          st.reset(1536); st.l1.textContent = 'press 0: goToAngle(0)'; st.l2.textContent = 'change = 0 − 1536 = −1536 → +512'; st.l3.textContent = 'ST/REPT: position = 0 (set home)'; st.arcTo(270, 360); st.later(function () { st.move(2048, 1300); }, 700);
        } }
      ] });
  }

  /* ---------- 09 build the turntable ---------- */
  steps.push({ id: 'turntable', title: 'Design & build the turntable', stage: '03 Imagine · 05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Now give the motor a job. A turntable needs three things: a <b>platter</b> that grips the motor’s shaft, a <b>base</b> that holds the motor still, and a <b>stand</b> that points the receiver at you.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut on a cutting mat, away from your body. Hot glue burns: let it cool before touching. Disconnect the 9 V battery while you build. Don’t glue the motor’s shaft solid — you may want the motor back.</p>');
    turntableBuild(b);
    UI.callout(b, '', 'Make it work well', '<ul><li><b>Keep it light and centred.</b> The 28BYJ-48 is strong for its size (it can hold about 300 g at 1 cm from the shaft), but a heavy or lopsided load makes it skip steps.</li><li><b>No rubbing.</b> Leave a gap between the platter and the base, or add a ring of smooth paper for the platter to slide on.</li><li><b>Mark home.</b> Draw an arrow on the platter and a matching one on the base.</li></ul>');
    UI.callout(b, '', 'Design ideas', '<ul><li>Add degree marks around the edge of the base (every 45°) and check the turntable stops on them.</li><li>Build a little stage or diorama on the platter for your favourite figure, model or LEGO build.</li><li>Hide the driver board and battery inside the base, with a slot for the power button.</li><li>Make a phone stand that faces the turntable, ready for the photo challenge.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your turntable, and why. How did you attach the platter to the shaft?', placeholder: 'I attached the platter by… because…' });
  } });
  function turntableBuild(b) {
    var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72';
    function base(svg) { clear(svg); glowDefs(svg); S('rect', { x: 0, y: 0, width: 800, height: 380, fill: BG }, svg); }
    function motorSide(svg, x, y) { S('rect', { x: x - 28, y: y, width: 56, height: 40, rx: 6, fill: '#c0c6cc', stroke: '#e1e8ef', 'stroke-width': 2 }, svg); S('rect', { x: x - 44, y: y + 4, width: 88, height: 8, rx: 3, fill: '#9aa5b1' }, svg); S('rect', { x: x - 3, y: y - 18, width: 6, height: 18, fill: '#facc15' }, svg); S('rect', { x: x - 30, y: y + 40, width: 60, height: 12, rx: 3, fill: '#2563eb' }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard turntable', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Make the hub.</b> The shaft is only 5 mm wide, with two flat sides. Cut three cardboard circles about 4 cm across, glue them into a stack, and poke a hole in the centre slightly <i>smaller</i> than the shaft (a sharp pencil works). Press it onto the shaft: the flats grip it.', draw: function (svg, S2, st) {
        base(svg);
        [0, 1, 2].forEach(function (i) { st.later(function () { S('ellipse', { cx: 260, cy: 240 - i * 16, rx: 80, ry: 26, fill: i % 2 ? CBL : CB, stroke: CBD, 'stroke-width': 2, 'class': 'part-new' }, svg); }, 200 + i * 350); });
        st.later(function () { S('ellipse', { cx: 260, cy: 208, rx: 5, ry: 3, fill: '#1a1208' }, svg); T(svg, 260, 300, '3 layers, 4 cm', { 'text-anchor': 'middle', fill: CY }); }, 1300);
        S('circle', { cx: 560, cy: 190, r: 60, fill: '#121c2b', stroke: GRID }, svg); S('path', { d: 'M530 172 A35 35 0 0 1 590 172 L590 208 A35 35 0 0 1 530 208 Z', fill: '#facc15' }, svg); T(svg, 560, 280, 'the shaft from above:', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 }); T(svg, 560, 298, 'round with two flats', { 'text-anchor': 'middle', fill: MUT, 'font-size': 12 });
      } },
      { cap: '<b>Step 2 · Mount the motor in the base.</b> Use a sturdy box as the base. Cut a hole in the lid for the shaft (it’s off-centre on the motor!). Fix the motor under the lid by its two mounting tabs: small screws, split pins or a ring of hot glue on the tabs only.', draw: function (svg) {
        base(svg);
        S('rect', { x: 200, y: 160, width: 400, height: 170, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); S('rect', { x: 190, y: 148, width: 420, height: 14, fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        S('rect', { x: 395, y: 146, width: 10, height: 18, fill: BG }, svg);
        motorSide(svg, 400, 166); S('rect', { x: 396, y: 128, width: 8, height: 36, fill: '#facc15', 'class': 'part-new' }, svg);
        T(svg, 615, 172, 'tabs fixed under lid', { fill: CY, 'font-size': 12 }); S('path', { d: 'M609 168 H448', stroke: CY }, svg);
        T(svg, 615, 132, 'shaft pokes through', { fill: CY, 'font-size': 12 }); S('path', { d: 'M609 128 H410', stroke: CY }, svg);
        T(svg, 400, 300, 'BASE BOX', { 'text-anchor': 'middle', fill: '#3a2a16', 'letter-spacing': '2' });
      } },
      { cap: '<b>Step 3 · Add the platter.</b> Glue the hub to the centre of a cardboard circle (15–20 cm; a cake board is perfect). Find the centre by drawing two lines across the circle. Push the hub onto the shaft so the platter floats just above the lid without touching it.', draw: function (svg, S2, st) {
        base(svg);
        S('rect', { x: 200, y: 230, width: 400, height: 110, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); S('rect', { x: 190, y: 218, width: 420, height: 14, fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        var g = S('g', {}, svg);
        S('rect', { x: 396, y: 194, width: 8, height: 24, fill: '#facc15' }, svg);
        S('rect', { x: 375, y: 180, width: 50, height: 24, fill: CB, stroke: CBD }, g); S('ellipse', { cx: 400, cy: 172, rx: 180, ry: 22, fill: CBL, stroke: CBD, 'stroke-width': 3 }, g);
        var y = -120; (function drop() { y = Math.min(0, y + 8); g.setAttribute('transform', 'translate(0 ' + y + ')'); if (y < 0) st.later(drop, 30); })();
        T(svg, 615, 212, 'gap: no rubbing', { fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 4 · A stand for the receiver.</b> Glue two popsicle sticks into an L, tape the receiver to the top facing the front, and run its three female-to-male wires down to the breadboard. Hide the breadboard, driver and battery behind or inside the base.', draw: function (svg) {
        base(svg);
        S('rect', { x: 120, y: 230, width: 360, height: 110, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); S('ellipse', { cx: 300, cy: 214, rx: 160, ry: 20, fill: CBL, stroke: CBD, 'stroke-width': 3 }, svg);
        S('rect', { x: 560, y: 120, width: 14, height: 220, fill: '#e8d3a8', stroke: '#c4a978', 'class': 'part-new' }, svg); S('rect', { x: 520, y: 330, width: 100, height: 14, fill: '#e8d3a8', stroke: '#c4a978' }, svg);
        S('rect', { x: 540, y: 90, width: 52, height: 40, rx: 4, fill: '#16191e', 'class': 'part-new' }, svg); S('circle', { cx: 556, cy: 110, r: 9, fill: '#2b3038' }, svg);
        S('path', { d: 'M580 130 C 600 200, 640 260, 700 300', stroke: '#facc15', 'stroke-width': 3, fill: 'none' }, svg); S('path', { d: 'M586 130 C 610 200, 650 250, 710 290', stroke: '#e5484d', 'stroke-width': 3, fill: 'none' }, svg); S('path', { d: 'M574 130 C 590 210, 630 270, 690 310', stroke: '#30363f', 'stroke-width': 3, fill: 'none' }, svg);
        T(svg, 520, 80, 'receiver faces you', { fill: CY, 'font-size': 12 });
      } },
      { cap: '<b>Step 5 · Line up home and test.</b> Draw an arrow on the platter and a matching one on the base. Turn the platter by hand until they line up, then press reset. Now try 1–7, 0, and ▶||.', draw: function (svg, S2, st) {
        base(svg); var pl = platterArt(svg, 400, 190, 120, { labels: true }), angs = [45, 90, 180, 315, 360, 720, 720], k = 0, cur = 0, c;
        (function go() { var to = angs[k % angs.length]; if (k % angs.length === 0) { cur = 0; pl.set(0); } var from = cur; cur = to; c = tween(from, to, 1000, pl.set); k++; st.later(go, 1700); })();
        st.stop = function () { if (c) c(); };
      } }
    ] });
  }

  /* ---------- 10 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Test it like a museum would: it has to work every time, from across the room, for hours. Run each test three times and mark it PASS or RETRY.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Exact:</b> pressing ▶▶| eight times brings the home arrows back into line.',
      '<b>Presets:</b> keys 1–7 stop on the right 45° marks, and 0 always comes home.',
      '<b>Short way:</b> going from 7 (315°) to 1 (45°) turns 90° forward, not 270° back.',
      '<b>Range:</b> the remote works from 3 metres away.',
      '<b>Smooth:</b> with an object on it, the platter turns without wobbling, rubbing or skipping.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Slow display spin', html: 'Make FUNC/STOP (0x47) start a slow, continuous spin for showing off an object, and stop it with the same button.', hint: 'Use a <code>bool spinning</code> variable. In loop(), if spinning is true, call <code>motor.step(8);</code> each time around (small steps, so the remote is still checked often), and update position.' },
      { tag: 'Code', title: 'Speed control', html: 'Use VOL+ (0x46) and VOL− (0x15) to change the speed between 2 and 15 RPM, and print the speed in the Serial Monitor.', hint: 'Keep <code>int rpm = 10;</code>. On VOL+: <code>rpm = rpm + 1;</code>, then <code>rpm = constrain(rpm, 2, 15);</code> and <code>motor.setSpeed(rpm);</code>.' },
      { tag: 'Code', title: 'Remember where it was', html: 'Right now position resets to 0 whenever the UNO restarts. Save it so the turntable remembers its angle after being switched off.', hint: 'The UNO has a small permanent memory called EEPROM: <code>#include &lt;EEPROM.h&gt;</code>, then <code>EEPROM.put(0, position);</code> after each move and <code>EEPROM.get(0, position);</code> in setup(). (Test this one on the real board.)' },
      { tag: 'Build + code', cls: 'c', title: 'Photo turntable timelapse', html: 'Make ▶|| take a set of 8 photos all the way round: turn 45°, pause 3 seconds for a photo (or a phone timelapse), repeat 8 times.', hint: 'A for loop: <code>for (int i = 0; i &lt; 8; i++) { turnBy(STEPS_45); delay(3000); }</code>. Set your phone to timelapse or burst mode, and stitch the photos into a GIF.' },
      { tag: 'Code', title: 'Cool the motor', html: 'The coils stay powered while the motor sits still, so it gets warm. Switch all four pins off after each move.', hint: 'After <code>motor.step()</code>, use <code>digitalWrite(8, LOW);</code> for pins 8, 9, 10 and 11. The motor holds less firmly, but the turntable doesn’t need much holding.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* ---------- 11 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m07 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working turntable. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of the finished turntable and one close-up of your wiring (driver, power module and common ground). Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 30 seconds: press ▶▶| a few times, then a number key, then 0 to come home.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your final code', help: 'Upload your .ino file (in the Arduino IDE: File → Save, then find the file) or paste the code.', required: true, max: 2, fileName: 'turntable' }
      ],
      questions: [
        { id: 'r1', q: 'Explain how a button press on the remote becomes a number in your code. Use the words infrared, 38 kHz, bits and command.' },
        { id: 'r2', q: 'How does a stepper motor move in exact steps? Explain the coils, the sequence, and why 45° is 256 steps.' },
        { id: 'r3', q: 'Why does the motor need the ULN2003 driver, its own power supply, and a common ground with the UNO?' },
        { id: 'r4', q: 'How does your code know where the turntable is? Explain the position variable and how goToAngle() takes the short way round.' }
      ]
    }
  };
})(window);
