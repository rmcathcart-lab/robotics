/* Mission 03: Arcade synth — the guide.
 * A passive buzzer on pin 8 plays notes with tone(); an active buzzer on pin 7 beeps for comparison; four push
 * buttons on pins 3–6 (INPUT_PULLUP, each button between its pin and GND) are a mini keyboard; a joystick module
 * (VRx → A0, VRy → A1, SW → pin 2) changes octave, bends the pitch and fires a sound effect.
 * Same shape as m01: steps { id, title, stage, time, render(body, ctx) }, the last one is the evidence form. */
(function (root) {
  'use strict';
  var RL = root.RL, UI = RL.UI, B = RL.Board, el = RL.el, esc = RL.esc;
  var S = function () { return B.el.apply(null, arguments); };
  function T(parent, x, y, str, a) { var t = B.el('text', Object.assign({ x: x, y: y, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, fill: '#e6f1fa' }, a || {}), parent); t.textContent = str; return t; }
  function P(parent, x, y, str, a) { return T(parent, x, y, str, Object.assign({ 'font-family': 'IBM Plex Sans, sans-serif', 'font-size': 14 }, a || {})); }
  function clear(svg) { while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild); }
  var CY = '#22d3ee', SIG = '#ff8a3d', INK = '#e6f1fa', MUT = '#8ea6bb', GRID = '#22364f', GO = '#4ade80', NAVY = '#070d17', WIREC = '#9fb3c8';
  var CB = '#b98d55', CBD = '#8a6438', CBL = '#d3aa72';
  var LBL = { 'font-size': 11, fill: MUT, 'letter-spacing': '2' };
  function bg(svg, w, h) { S('rect', { x: 0, y: 0, width: w, height: h, fill: NAVY }, svg); }
  function defsOf(svg) { return svg.querySelector('defs') || svg.insertBefore(S('defs', {}), svg.firstChild); }
  var GID = 0;
  function grad(svg, c) {
    var id = 'm03g' + (++GID), g = S('radialGradient', { id: id }, defsOf(svg));
    var st = [S('stop', { offset: '0%', 'stop-opacity': 0.95 }, g), S('stop', { offset: '45%', 'stop-opacity': 0.35 }, g), S('stop', { offset: '100%', 'stop-opacity': 0 }, g)];
    var o = { url: 'url(#' + id + ')', set: function (col) { st.forEach(function (s) { s.setAttribute('stop-color', col); }); } };
    o.set(c || '#ffffff'); return o;
  }
  function clipRect(svg, x, y, w, h) { var id = 'm03c' + (++GID); S('rect', { x: x, y: y, width: w, height: h }, S('clipPath', { id: id }, defsOf(svg))); return 'url(#' + id + ')'; }
  function loop(st, fn) {
    var last = performance.now(), t = 0;
    function tick(now) { var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; fn(dt, t); st.raf = requestAnimationFrame(tick); }
    st.raf = requestAnimationFrame(tick);
    st.stop = function () { cancelAnimationFrame(st.raf); };
  }
  function ease(cur, target, dt, k) { return cur + (target - cur) * Math.min(1, dt * (k || 5)); }
  function amap(x, a, b, c, d) { return Math.trunc((x - a) * (d - c) / (b - a) + c); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ln(src, s) { var a = src.split('\n'); for (var i = 0; i < a.length; i++) if (a[i].indexOf(s) >= 0) return i + 1; throw new Error('m03: no line containing ' + s); }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  var NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  function noteName(f) { if (!f || f < 16) return '—'; var n = Math.round(12 * Math.log2(f / 440)) + 57; return NAMES[((n % 12) + 12) % 12] + Math.floor(n / 12); }
  /* a tiny sound maker for the labs (Web Audio). Quiet on purpose. */
  var AC = null;
  function audio() { try { AC = AC || new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  function voice() {
    var osc = null, g = null;
    return {
      play: function (f, type) { var a = audio(); if (!a) return; if (!osc) { osc = a.createOscillator(); g = a.createGain(); osc.connect(g); g.connect(a.destination); osc.start(); } osc.type = type || 'square'; osc.frequency.setValueAtTime(f, a.currentTime); g.gain.setValueAtTime(osc.type === 'square' ? 0.03 : 0.08, a.currentTime); },
      stop: function () { if (osc) { try { osc.stop(); osc.disconnect(); } catch (e) {} osc = null; } },
      on: function () { return !!osc; }
    };
  }

  /* ================= circuit parts ================= */
  var VBM = [0, 0, 1002, 650];   // breadboard + a module on the right, with room below for the long joystick wires
  var POWER = {
    p5v: { type: 'wire', from: '5V', to: 'L+2', color: 'red', via: [[10, 250], [12, 70], [120, 22], [330, 22], [392, 52]], name: 'Red wire: 5V → + rail' },
    pgnd: { type: 'wire', from: 'GNDd', to: 'L-4', color: 'black', name: 'Black wire: GND → − rail' },
    pbr1: { type: 'wire', from: 'L+30', to: 'R+30', color: 'red', via: [[416, 556], [664, 556]], name: 'Red bridge: + rail to + rail' },
    pbr2: { type: 'wire', from: 'L-28', to: 'R-28', color: 'black', via: [[432, 540], [648, 540]], name: 'Black bridge: − rail to − rail' }
  };
  var BUZZ = {
    bz_p: { type: 'buzzer', a: 'e3', k: 'f3', variant: 'passive', label: 'PASSIVE', name: 'Passive buzzer: + leg in e3, − leg in f3' },
    w_p: { type: 'wire', from: 'D8', to: 'a3', color: 'orange', name: 'Wire: pin 8 → a3' },
    g_p: { type: 'wire', from: 'j3', to: 'R-3', color: 'black', name: 'Black jumper: j3 → − rail' },
    bz_a: { type: 'buzzer', a: 'e7', k: 'f7', variant: 'active', label: 'ACTIVE', name: 'Active buzzer: + leg in e7, − leg in f7' },
    w_a: { type: 'wire', from: 'D7', to: 'a7', color: 'brown', name: 'Wire: pin 7 → a7' },
    g_a: { type: 'wire', from: 'j7', to: 'R-7', color: 'black', name: 'Black jumper: j7 → − rail' }
  };
  var KEYS = {
    k_g: { type: 'button', at: 'e9', label: 'G', name: 'Button G (e9, f9, e11, f11)' },
    w_kg: { type: 'wire', from: 'D6', to: 'a9', color: 'yellow', name: 'Wire: pin 6 → a9' },
    g_kg: { type: 'wire', from: 'j11', to: 'R-11', color: 'black', name: 'Black jumper: j11 → − rail' },
    k_e: { type: 'button', at: 'e12', label: 'E', name: 'Button E (e12, f12, e14, f14)' },
    w_ke: { type: 'wire', from: 'D5', to: 'a12', color: 'green', name: 'Wire: pin 5 → a12' },
    g_ke: { type: 'wire', from: 'j14', to: 'R-14', color: 'black', name: 'Black jumper: j14 → − rail' },
    k_d: { type: 'button', at: 'e15', label: 'D', name: 'Button D (e15, f15, e17, f17)' },
    w_kd: { type: 'wire', from: 'D4', to: 'a15', color: 'blue', name: 'Wire: pin 4 → a15' },
    g_kd: { type: 'wire', from: 'j17', to: 'R-17', color: 'black', name: 'Black jumper: j17 → − rail' },
    k_c: { type: 'button', at: 'e18', label: 'C', name: 'Button C (e18, f18, e20, f20)' },
    w_kc: { type: 'wire', from: 'D3', to: 'a18', color: 'purple', name: 'Wire: pin 3 → a18' },
    g_kc: { type: 'wire', from: 'j20', to: 'R-20', color: 'black', name: 'Black jumper: j20 → − rail' }
  };
  var JOY = {
    joy: { type: 'joystick', at: [780, 380], name: 'Joystick module' },
    j_g: { type: 'wire', from: 'joy.GND', to: 'R-21', color: 'black', via: [[730, 384]], name: 'Black F-M wire: GND → − rail' },
    j_v: { type: 'wire', from: 'joy.V', to: 'R+23', color: 'red', via: [[730, 414]], name: 'Red F-M wire: +5V → + rail' },
    j_x: { type: 'wire', from: 'joy.X', to: 'A0', color: 'white', via: [[714, 436], [708, 590], [676, 622], [330, 624], [34, 622], [4, 584], [4, 390]], name: 'White F-M wire: VRx → A0' },
    j_y: { type: 'wire', from: 'joy.Y', to: 'A1', color: 'grey', via: [[730, 452], [724, 580], [690, 606], [330, 607], [44, 604], [16, 572], [16, 404]], name: 'Grey F-M wire: VRy → A1' },
    j_sw: { type: 'wire', from: 'joy.SW', to: 'D2', color: '#f472b6', via: [[748, 468], [742, 560], [704, 588], [400, 590], [354, 566], [350, 420], [332, 364]], name: 'Pink F-M wire: SW → pin 2' }
  };
  var ALL = merge(POWER, BUZZ, KEYS, JOY);
  var IDS_BUZZ = Object.keys(merge(POWER, BUZZ)), IDS_KEYS = Object.keys(merge(POWER, BUZZ, KEYS)), IDS_ALL = Object.keys(ALL);
  var VIEW_KEYS = [236, 34, 480, 420], VIEW_ALL = [228, 18, 774, 624];
  var KEYBTNS = function () { return { 3: { part: 'k_c', wiring: 'pullup', label: 'C key' }, 4: { part: 'k_d', wiring: 'pullup', label: 'D key' }, 5: { part: 'k_e', wiring: 'pullup', label: 'E key' }, 6: { part: 'k_g', wiring: 'pullup', label: 'G key' } }; };
  var BUZZERS = function () { return { 8: { part: 'bz_p', type: 'passive' }, 7: { part: 'bz_a', type: 'active' } }; };

  /* ================= code ================= */
  var FIRST = [
    '// Mission 03, part 1: meet the two buzzers',
    '',
    'const int ACTIVE_BUZZER = 7;',
    'const int PASSIVE_BUZZER = 8;',
    '',
    'void setup() {',
    '  pinMode(ACTIVE_BUZZER, OUTPUT);',
    '}',
    '',
    'void loop() {',
    '  // active buzzer: power on = beep (always the same pitch)',
    '  digitalWrite(ACTIVE_BUZZER, HIGH);',
    '  delay(300);',
    '  digitalWrite(ACTIVE_BUZZER, LOW);',
    '  delay(700);',
    '',
    '  // passive buzzer: tone() picks the pitch',
    '  tone(PASSIVE_BUZZER, 262);   // C (middle C)',
    '  delay(400);',
    '  tone(PASSIVE_BUZZER, 330);   // E',
    '  delay(400);',
    '  tone(PASSIVE_BUZZER, 392);   // G',
    '  delay(400);',
    '  tone(PASSIVE_BUZZER, 523);   // C again, one octave higher',
    '  delay(400);',
    '  noTone(PASSIVE_BUZZER);      // silence',
    '  delay(1000);',
    '}'].join('\n');
  var MELODY = [
    '/*',
    '  Mission 03, part 2: play a melody from two arrays',
    '*/',
    '',
    'const int BUZZER = 8;',
    '',
    '// note frequencies in hertz (Hz)',
    'const int NOTE_C4 = 262;',
    'const int NOTE_D4 = 294;',
    'const int NOTE_E4 = 330;',
    'const int NOTE_F4 = 349;',
    'const int NOTE_G4 = 392;',
    'const int NOTE_A4 = 440;',
    'const int NOTE_B4 = 494;',
    'const int NOTE_C5 = 523;',
    '',
    '// YOUR TURN: replace this tune with your own, at least 8 notes long.',
    '// Keep both arrays the same length, and update NOTE_COUNT to match.',
    'int melody[] = { NOTE_C4, NOTE_C4, NOTE_G4, NOTE_G4, NOTE_A4, NOTE_A4, NOTE_G4 };',
    'int durations[] = { 400, 400, 400, 400, 400, 400, 800 };   // milliseconds',
    'const int NOTE_COUNT = 7;',
    '',
    'void setup() {',
    '}',
    '',
    'void loop() {',
    '  for (int i = 0; i < NOTE_COUNT; i++) {',
    '    tone(BUZZER, melody[i]);   // start note number i',
    '    delay(durations[i]);       // hold it',
    '    noTone(BUZZER);            // a short gap, so repeated notes don\'t blur together',
    '    delay(50);',
    '  }',
    '  delay(1500);                 // pause, then play it again',
    '}'].join('\n');
  var KEYCODE = [
    '/*',
    '  Mission 03, part 3: a four-key keyboard',
    '  Each button connects its pin to GND when you press it.',
    '  With INPUT_PULLUP: not pressed = HIGH, pressed = LOW.',
    '*/',
    '',
    'const int BUZZER = 8;',
    '',
    'int keys[] = { 3, 4, 5, 6 };              // the pins of the four buttons',
    'int notes[] = { 262, 294, 330, 392 };     // C, D, E, G (in Hz)',
    '',
    'int playing = 0;   // the note the buzzer is playing now (0 = silent)',
    '',
    'void setup() {',
    '  for (int k = 0; k < 4; k++) {',
    '    pinMode(keys[k], INPUT_PULLUP);',
    '  }',
    '}',
    '',
    'void loop() {',
    '  int note = 0;                            // start with silence',
    '  for (int k = 0; k < 4; k++) {',
    '    if (digitalRead(keys[k]) == LOW) {     // LOW = pressed',
    '      note = notes[k];',
    '    }',
    '  }',
    '',
    '  if (note != playing) {                   // only change the sound when the note changes',
    '    if (note == 0) {',
    '      noTone(BUZZER);',
    '    } else {',
    '      tone(BUZZER, note);',
    '    }',
    '    playing = note;',
    '  }',
    '  delay(10);',
    '}'].join('\n');
  var SYNTH = [
    '/*',
    '  Mission 03: Arcade synth',
    '  Four keys play C, D, E and G. The joystick changes the sound:',
    '    up / down    = one octave higher / lower',
    '    left / right = bend the pitch',
    '    click it     = laser sound effect',
    '*/',
    '',
    'const int BUZZER = 8;',
    'const int JOY_X = A0;',
    'const int JOY_Y = A1;',
    'const int JOY_SW = 2;',
    '',
    'int keys[] = { 3, 4, 5, 6 };',
    'int notes[] = { 262, 294, 330, 392 };     // C, D, E, G',
    '',
    'int playing = 0;',
    '',
    'void setup() {',
    '  for (int k = 0; k < 4; k++) {',
    '    pinMode(keys[k], INPUT_PULLUP);',
    '  }',
    '  pinMode(JOY_SW, INPUT_PULLUP);          // the joystick button works the same way',
    '  Serial.begin(9600);',
    '}',
    '',
    '// a falling "pew" sound effect',
    'void laser() {',
    '  for (int f = 2000; f > 200; f = f - 40) {',
    '    tone(BUZZER, f);',
    '    delay(4);',
    '  }',
    '  noTone(BUZZER);',
    '  playing = 0;',
    '}',
    '',
    'void loop() {',
    '  if (digitalRead(JOY_SW) == LOW) {       // joystick clicked',
    '    laser();',
    '  }',
    '',
    '  int note = 0;',
    '  for (int k = 0; k < 4; k++) {',
    '    if (digitalRead(keys[k]) == LOW) {',
    '      note = notes[k];',
    '    }',
    '  }',
    '',
    '  if (note > 0) {',
    '    int y = analogRead(JOY_Y);            // 0 = up, about 512 = middle, 1023 = down',
    '    if (y < 200) {',
    '      note = note * 2;                    // up: one octave higher',
    '    }',
    '    if (y > 823) {',
    '      note = note / 2;                    // down: one octave lower',
    '    }',
    '    int x = analogRead(JOY_X);            // 0 = left, 1023 = right',
    '    note = note + map(x, 0, 1023, -60, 60);   // bend the pitch by up to 60 Hz',
    '  }',
    '',
    '  if (note != playing) {',
    '    if (note == 0) {',
    '      noTone(BUZZER);',
    '    } else {',
    '      tone(BUZZER, note);',
    '    }',
    '    playing = note;',
    '    Serial.print("note: ");',
    '    Serial.println(note);',
    '  }',
    '  delay(10);',
    '}'].join('\n');

  /* ================= the steps ================= */
  var steps = [];

  /* ---------- 01 brief ---------- */
  steps.push({ id: 'brief', title: 'Mission brief', time: '5 min', render: function (b, ctx) {
    var m = RL.MISSIONS.m03;
    var wrap = el('div', 'brief'), left = el('div', '');
    left.innerHTML = '<p class="lead">Every beep, blip and jingle in an arcade game is a number: how many times per second a speaker vibrates. In this mission you’ll build a <b>playable synth</b>: four buttons are a keyboard, a joystick bends the notes, and the UNO can play a tune you compose.</p>' +
      '<p>You’ll learn what sound physically is, why one buzzer can play music and the other can’t, how to store a whole melody in <b>arrays</b>, and a neater way to wire buttons than Mission 01’s pull-down resistor. Then you’ll build it all into a cardboard arcade controller.</p>';
    UI.edp(left, [2, 3, 5, 6, 7]);
    wrap.appendChild(left);
    var meta = el('div', 'brief-meta panel'); meta.style.padding = '16px';
    meta.innerHTML = '<div class="meta-row"><span class="label">Time</span><b>' + m.days + ' classes</b></div>' +
      '<div class="meta-row"><span class="label">Level</span><span class="lvl">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= m.level ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' +
      '<div class="meta-row"><span class="label">You’ll discover</span>' + m.discover.map(function (d) { return '<span class="tag c">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">From your kit</span>' + m.parts.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>' +
      '<div class="meta-row"><span class="label">Also grab</span>' + m.extras.map(function (d) { return '<span class="tag">' + esc(d) + '</span>'; }).join('') + '</div>';
    wrap.appendChild(meta); b.appendChild(wrap);
    preview(b);
    UI.callout(b, 'plain', 'Be a good neighbour', '<p>Buzzers are loud and piercing — twenty of them at once is a lot. Test at a low volume by putting a small piece of tape over the buzzer’s hole, and only play your synth out loud when it’s your turn to demo.</p>');
  } });
  function preview(b) {
    UI.explainer(b, { label: 'Preview', title: 'What you’re building', w: 800, h: 360,
      init: function (svg, S, st) {
        bg(svg, 800, 360);
        // the controller (a slanted box)
        S('path', { d: 'M110 250 L690 250 L650 140 L150 140 Z', fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: 'M110 250 L690 250 L690 290 L110 290 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        T(svg, 400, 278, 'ARCADE SYNTH', { 'text-anchor': 'middle', 'font-size': 13, fill: '#3a2a16', 'letter-spacing': '4' });
        // joystick
        S('ellipse', { cx: 240, cy: 200, rx: 46, ry: 18, fill: '#1c2129' }, svg);
        st.stick = S('line', { x1: 240, y1: 200, x2: 240, y2: 130, stroke: '#2b3038', 'stroke-width': 10, 'stroke-linecap': 'round' }, svg);
        st.ball = S('circle', { cx: 240, cy: 126, r: 17, fill: '#3b4350', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        // keys
        st.keys = ['C', 'D', 'E', 'G'].map(function (n, i) {
          var x = 380 + i * 64, g = S('g', {}, svg);
          S('path', { d: 'M' + (x - 22) + ' 222 L' + (x + 22) + ' 222 L' + (x + 18) + ' 186 L' + (x - 18) + ' 186 Z', fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 1.5 }, g);
          var top = S('path', { d: 'M' + (x - 18) + ' 186 L' + (x + 18) + ' 186 L' + (x + 16) + ' 176 L' + (x - 16) + ' 176 Z', fill: '#4b5563' }, g);
          T(g, x, 212, n, { 'text-anchor': 'middle', 'font-size': 14, fill: INK, 'font-weight': 600 });
          return { g: g, top: top };
        });
        // speaker grille + waves
        [0, 1, 2].forEach(function (r) { [0, 1, 2].forEach(function (c) { S('circle', { cx: 612 + c * 12, cy: 160 + r * 10, r: 3, fill: '#3a2a16' }, svg); }); });
        st.waves = S('g', {}, svg);
        st.arcs = [0, 1, 2, 3, 4].map(function () { return S('path', { fill: 'none', stroke: CY, 'stroke-width': 3, opacity: 0 }, st.waves); });
        st.read = T(svg, 400, 52, '', { 'text-anchor': 'middle', 'font-size': 22, fill: CY, 'font-weight': 600 });
        st.sub = T(svg, 400, 80, '', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT, 'letter-spacing': '1.5' });
        st.notes = S('g', {}, svg);
        var tune = [[0, 0], [0, 0], [3, 0], [3, 0], [2, 0], [2, 0], [3, 0], [null, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, -1], [null, 0], ['laser', 0]];
        var FREQ = [262, 294, 330, 392], k = -1, tk = 0, phase = 0, fNow = 0, fl = [];
        loop(st, function (dt, t) {
          tk -= dt;
          if (tk <= 0) {
            k = (k + 1) % tune.length; var s = tune[k];
            st.keys.forEach(function (kk, i) { kk.top.setAttribute('fill', s[0] === i ? CY : '#4b5563'); kk.g.setAttribute('transform', s[0] === i ? 'translate(0 3)' : ''); });
            var jy = s[1] === 1 ? -16 : s[1] === -1 ? 16 : 0; st.jy = jy;
            if (s[0] === null) { fNow = 0; st.read.textContent = ''; st.sub.textContent = ''; tk = 0.6; }
            else if (s[0] === 'laser') { st.laser = 0; st.ball.setAttribute('fill', CY); tk = 1.4; st.sub.textContent = 'CLICK THE JOYSTICK: LASER'; }
            else { fNow = FREQ[s[0]] * (s[1] === 1 ? 2 : s[1] === -1 ? 0.5 : 1); st.read.textContent = noteName(fNow) + ' · ' + Math.round(fNow) + ' Hz'; st.sub.textContent = s[1] === 1 ? 'STICK UP: ONE OCTAVE HIGHER' : s[1] === -1 ? 'STICK DOWN: ONE OCTAVE LOWER' : 'KEY ' + ['C', 'D', 'E', 'G'][s[0]]; tk = 0.42; fl.push({ el: T(st.notes, 640, 150, '♪', { 'font-size': 22, fill: CY }), y: 150, x: 640 + Math.random() * 40 }); }
          }
          if (st.laser != null) { st.laser += dt; fNow = Math.max(200, 2000 - st.laser * 1800); st.read.textContent = Math.round(fNow) + ' Hz'; if (st.laser > 1.0) { st.laser = null; fNow = 0; st.ball.setAttribute('fill', '#3b4350'); st.read.textContent = ''; } }
          st.jyc = ease(st.jyc || 0, st.jy || 0, dt, 8);
          st.ball.setAttribute('cy', 126 + st.jyc); st.stick.setAttribute('y2', 130 + st.jyc);
          phase += dt * (fNow ? Math.min(6, fNow / 120) : 0);
          var gap = fNow ? clamp(9000 / fNow, 6, 34) : 20;
          st.arcs.forEach(function (a, i) { var r = 20 + ((phase * 20 + i * gap) % (gap * 5)); a.setAttribute('d', 'M' + (650 + r * 0.6) + ' ' + (170 - r * 0.8) + ' A' + r + ' ' + r + ' 0 0 1 ' + (650 + r * 0.6) + ' ' + (170 + r * 0.8)); a.setAttribute('opacity', fNow ? Math.max(0, 1 - r / (gap * 5 + 20)) : 0); });
          fl = fl.filter(function (n) { n.y -= dt * 60; n.el.setAttribute('x', n.x); n.el.setAttribute('y', n.y); n.el.setAttribute('opacity', Math.max(0, (n.y - 60) / 90)); if (n.y < 60) { n.el.remove(); return false; } return true; });
        });
      },
      frames: [{ cap: 'Press a key to play a note. Push the joystick up for the same note one octave higher, down for one octave lower, and click it for a laser sound. The numbers are the frequency: how many times per second the buzzer vibrates.', draw: function () {} }] });
  }

  /* ---------- 02 sound, frequency & pitch ---------- */
  steps.push({ id: 'sound', title: 'Sound, frequency & pitch', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Before you make sounds, you need to know what a sound <i>is</i>. Hint: it’s not a thing that flies through the air. It’s the air itself, being pushed and pulled.</p>');
    soundXp(b);
    UI.html(b, '<h2>The pitch lab</h2><p>Every musical note is a frequency. Press <b>Play</b> (keep the volume low), then drag the slider or tap a note. Switch to <b>Buzzer (square)</b> to hear the harsher wave your buzzer makes.</p>');
    waveLab(b, ctx);
    UI.html(b, '<h2>The notes you’ll use</h2><p>Musicians name notes with a letter and an octave number. <b>Middle C</b> is C4, at about <b>262 Hz</b>.</p>');
    var nt = el('div', 'readouts'); nt.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))'; nt.style.border = '1px solid var(--grid)'; nt.style.borderRadius = '6px'; nt.style.overflow = 'hidden';
    nt.innerHTML = [['C4', 262], ['D4', 294], ['E4', 330], ['F4', 349], ['G4', 392], ['A4', 440], ['B4', 494], ['C5', 523]].map(function (n) { return '<div><span class="label">' + n[0] + '</span><b>' + n[1] + ' Hz</b></div>'; }).join('');
    b.appendChild(nt);
    UI.callout(b, '', 'The octave rule', '<p>Go up one <b>octave</b> and the frequency <b>doubles</b>: C3 = 131 Hz, C4 = 262 Hz, C5 = 523 Hz, C6 = 1047 Hz. Notes an octave apart sound like “the same note, higher” — that’s why they share a letter. You’ll use this in your synth: <code>note * 2</code> is one octave up.</p>');
    UI.numq(b, ctx, { id: 'q-snd1', q: 'A4 is <b>440 Hz</b>. What is the frequency of A5, one octave higher?', answer: 880, tol: 1, unit: 'Hz', explain: 'One octave up doubles the frequency: 440 × 2 = <b>880 Hz</b>.', hint: 'Octave up = double.' });
    UI.numq(b, ctx, { id: 'q-snd2', q: 'Middle C vibrates 262 times per second. How many <b>milliseconds</b> does one vibration take? (1 s = 1000 ms)', answer: 3.82, tol: 0.06, unit: 'ms', explain: '1000 ms ÷ 262 = <b>3.82 ms</b>. That’s the <b>period</b>: frequency and period are opposites (one is 1 ÷ the other).', hint: 'Divide 1000 by 262.' });
    UI.mcq(b, ctx, { id: 'q-snd3', q: 'You make the buzzer vibrate <b>harder</b> but at the same frequency. What changes?', options: ['The pitch goes up', 'It gets louder; the pitch stays the same', 'It gets quieter', 'Nothing'], answer: 1, explain: 'A harder push is a bigger <b>amplitude</b> = louder. Pitch only depends on frequency.', hints: { 0: 'Pitch is set by how many vibrations per second, not how big they are.' } });
  } });
  function soundXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'What sound is', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        // speaker
        S('rect', { x: 20, y: 70, width: 40, height: 180, rx: 4, fill: '#1c2129', stroke: '#3b4350' }, svg);
        st.cone = S('path', { d: '', fill: '#2b3038', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        T(svg, 60, 290, 'SPEAKER', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        // ear
        S('path', { d: 'M760 110 C 800 110, 800 200, 770 220 C 755 230, 760 250, 742 252', fill: 'none', stroke: '#c9a27e', 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
        st.drum = S('line', { x1: 734, y1: 140, x2: 734, y2: 200, stroke: CY, 'stroke-width': 3 }, svg);
        T(svg, 760, 290, 'EAR', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
        st.dots = [];
        for (var c = 0; c < 46; c++) for (var r = 0; r < 9; r++) { var x0 = 130 + c * 13 + (r % 2) * 6, d = S('circle', { cx: x0, cy: 80 + r * 20, r: 3, fill: '#5f7a94' }, svg); st.dots.push({ el: d, x0: x0 }); }
        st.hl = S('circle', { r: 6, fill: CY }, svg); st.hlX0 = 130 + 20 * 13;
        st.hlRange = S('line', { y1: 268, y2: 268, stroke: CY, 'stroke-width': 2 }, svg);
        st.press = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 2, opacity: 0.8 }, svg);
        T(svg, 120, 312, 'PRESSURE', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5', 'text-anchor': 'end' });
        st.lab = S('g', {}, svg);
        st.p = { lam: 220, f: 1.0, amp: 12, hl: false }; st.cur = { lam: 220, f: 1, amp: 12 }; var ph = 0;
        loop(st, function (dt) {
          var c = st.cur, p = st.p; c.lam = ease(c.lam, p.lam, dt, 3); c.f = ease(c.f, p.f, dt, 3); c.amp = ease(c.amp, p.amp, dt, 3);
          ph += dt * 2 * Math.PI * c.f; var k = 2 * Math.PI / c.lam;
          var cx = 60 + c.amp * Math.sin(ph);
          st.cone.setAttribute('d', 'M' + (cx - 4) + ' 100 L' + (cx + 40) + ' 70 L' + (cx + 40) + ' 250 L' + (cx - 4) + ' 220 Z');
          st.dots.forEach(function (d) { d.el.setAttribute('cx', d.x0 + c.amp * Math.sin(ph - k * (d.x0 - 120))); });
          var hx = st.hlX0 + c.amp * Math.sin(ph - k * (st.hlX0 - 120));
          st.hl.setAttribute('cx', hx); st.hl.setAttribute('cy', 160); st.hl.setAttribute('opacity', p.hl ? 1 : 0);
          st.hlRange.setAttribute('x1', st.hlX0 - c.amp); st.hlRange.setAttribute('x2', st.hlX0 + c.amp); st.hlRange.setAttribute('opacity', p.hl ? 1 : 0);
          var pts = []; for (var x = 130; x <= 720; x += 6) pts.push(x + ',' + (308 - c.amp * 1.2 * Math.cos(ph - k * (x - 120)))); st.press.setAttribute('points', pts.join(' '));
          st.drum.setAttribute('transform', 'translate(' + (c.amp * 0.4 * Math.sin(ph - k * (734 - 120))) + ' 0)');
        });
        st.set = function (p, labels) { st.p = Object.assign({ lam: 220, f: 1, amp: 12, hl: false }, p); while (st.lab.firstChild) st.lab.removeChild(st.lab.firstChild); (labels || []).forEach(function (l) { T(st.lab, l[0], l[1], l[2], { 'text-anchor': 'middle', 'font-size': 11, fill: l[3] || CY, 'letter-spacing': '1.5' }); }); };
      },
      frames: [
        { cap: '<b>A speaker pushes air.</b> Its cone moves forward and squashes the air molecules in front of it together (a <b>compression</b>), then moves back and leaves a gap where they spread out (a <b>rarefaction</b>). Do this over and over and you get a wave of squashed and stretched air.', draw: function (svg, S, st) { st.set({}, [[400, 40, 'COMPRESSIONS AND RAREFACTIONS']]); } },
        { cap: '<b>The air doesn’t travel — the wave does.</b> Watch the cyan molecule: it only jiggles back and forth around one spot. The <i>pattern</i> moves forward at about <b>343 metres per second</b> until it reaches your ear and makes your eardrum vibrate.', draw: function (svg, S, st) { st.set({ hl: true }, [[400, 40, 'EACH MOLECULE JUST JIGGLES']]); } },
        { cap: '<b>Frequency = vibrations per second</b>, measured in <b>hertz (Hz)</b>. Middle C vibrates 262 times every second. A higher frequency packs the compressions closer together, and your brain hears it as a <b>higher pitch</b>. (Here the wave is slowed down millions of times so you can see it.)', draw: function (svg, S, st) { st.set({ lam: 110, f: 2 }, [[400, 40, 'DOUBLE THE FREQUENCY = ONE OCTAVE HIGHER']]); } },
        { cap: '<b>Amplitude = how hard it pushes.</b> Bigger squashes make a <b>louder</b> sound. Same frequency, so the pitch doesn’t change.', draw: function (svg, S, st) { st.set({ amp: 21 }, [[400, 40, 'BIGGER AMPLITUDE = LOUDER']]); } },
        { cap: '<b>What you can hear.</b> Human ears hear from about <b>20 Hz</b> (a deep rumble) to <b>20 000 Hz</b> (a thin whine). Your buzzer is loudest around 2000–4000 Hz — the range your ears are most sensitive to, which is exactly why alarms use it.', draw: function (svg, S, st) { st.set({ lam: 70, f: 3 }, [[400, 40, 'HUMANS HEAR 20 Hz TO 20 000 Hz']]); } }
      ] });
  }
  function waveLab(b, ctx) {
    var box = el('div', 'xp'); box.innerHTML = '<div class="xp-h"><span class="label">Lab</span><h3>The pitch lab</h3></div>';
    var stage = el('div', 'xp-stage'); box.appendChild(stage);
    var svg = S('svg', { viewBox: '0 0 800 250', role: 'img', 'aria-label': 'A sound wave whose frequency you can change' }); stage.appendChild(svg);
    bg(svg, 800, 250);
    var X0 = 80, XW = 640, MID = 120, A = 70;
    T(svg, X0, 30, 'A 10-MILLISECOND SLICE OF SOUND', LBL);
    for (var gx = 0; gx <= 10; gx++) { S('line', { x1: X0 + gx * XW / 10, y1: 44, x2: X0 + gx * XW / 10, y2: 196, stroke: GRID, opacity: 0.6 }, svg); T(svg, X0 + gx * XW / 10, 214, gx + ' ms', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT }); }
    S('line', { x1: X0, y1: MID, x2: X0 + XW, y2: MID, stroke: GRID }, svg);
    var clip = clipRect(svg, X0, 40, XW, 160);
    var path = S('path', { fill: 'none', stroke: CY, 'stroke-width': 2.5, 'clip-path': clip }, svg);
    var br = S('path', { fill: 'none', stroke: SIG, 'stroke-width': 2 }, svg), brT = T(svg, 0, 242, '', { 'font-size': 11, fill: SIG });
    var big = T(svg, 760, 30, '', { 'text-anchor': 'end', 'font-size': 18, fill: CY, 'font-weight': 600 });
    var row = el('div', 'slider-row'); row.innerHTML = '<label>Frequency</label>';
    var r = el('input'); r.type = 'range'; r.min = 0; r.max = 1000; r.setAttribute('aria-label', 'Frequency');
    var out = el('b', ''); out.style.minWidth = '80px';
    var play = el('button', 'btn btn-primary btn-small', 'Play'); play.type = 'button';
    row.appendChild(r); row.appendChild(out); row.appendChild(play); box.appendChild(row);
    var pr1 = el('div', 'slider-row'); pr1.innerHTML = '<label>Notes</label>'; var notes = el('div', 'res-pills'); pr1.appendChild(notes); box.appendChild(pr1);
    var pr2 = el('div', 'slider-row'); pr2.innerHTML = '<label>Wave</label>'; var waves = el('div', 'res-pills'); pr2.appendChild(waves); box.appendChild(pr2);
    var ro = el('div', 'readouts'); box.appendChild(ro);
    b.appendChild(box);
    var f = 262, type = 'sine', v = voice(), ph = 0;
    function fToPos(x) { return Math.round(1000 * Math.log(x / 100) / Math.log(20)); }
    function posToF(p) { return Math.round(100 * Math.pow(20, p / 1000)); }
    [['C4', 262], ['D4', 294], ['E4', 330], ['F4', 349], ['G4', 392], ['A4', 440], ['B4', 494], ['C5', 523], ['C6', 1047], ['Alarm', 2000]].forEach(function (n) {
      var bt = el('button', '', n[0]); bt.type = 'button'; bt.addEventListener('click', function () { set(n[1]); }); notes.appendChild(bt);
    });
    [['sine', 'Smooth (sine)'], ['square', 'Buzzer (square)']].forEach(function (w) { var bt = el('button', w[0] === type ? 'on' : '', w[1]); bt.type = 'button'; bt.dataset.w = w[0]; bt.addEventListener('click', function () { type = w[0]; waves.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x.dataset.w === type); }); upd(); ctx.check('lab-square', 1); }); waves.appendChild(bt); });
    r.addEventListener('input', function () { f = posToF(Number(r.value)); upd(); });
    play.addEventListener('click', function () { if (v.on()) { v.stop(); play.textContent = 'Play'; } else { v.play(f, type); play.textContent = 'Stop'; ctx.check('lab-play', 1); } });
    function set(x) { f = x; r.value = fToPos(x); upd(); }
    var seen = {};
    function upd() {
      out.textContent = f + ' Hz'; if (v.on()) v.play(f, type);
      var per = 1000 / f, px = per / 10 * XW;
      br.setAttribute('d', 'M' + X0 + ' 222 v8 h' + Math.min(XW, px) + ' v-8');
      brT.setAttribute('x', X0); brT.textContent = 'one vibration = ' + per.toFixed(2) + ' ms';
      big.textContent = noteName(f) + ' · ' + f + ' Hz';
      ro.innerHTML = '<div><span class="label">Frequency</span><b>' + f + ' Hz</b><span class="small muted">vibrations per second</span></div><div><span class="label">Nearest note</span><b>' + noteName(f) + '</b></div>' +
        '<div><span class="label">Period</span><b>' + per.toFixed(2) + ' ms</b><span class="small muted">one vibration</span></div><div><span class="label">Wavelength in air</span><b>' + (34300 / f).toFixed(0) + ' cm</b><span class="small muted">343 m/s ÷ ' + f + ' Hz</span></div>';
      seen[noteName(f)] = 1; if (Object.keys(seen).length >= 4) ctx.check('lab-notes', 1);
    }
    set(262);
    var st = {}; loop(st, function (dt) {
      ph += dt * 2 * Math.PI * clamp(f / 260, 0.4, 3);
      var cyc = f * 0.01, pts = [];
      for (var i = 0; i <= 640; i++) { var x = X0 + i, a = 2 * Math.PI * cyc * i / 640 - ph, s = Math.sin(a), y = type === 'square' ? (s >= 0 ? -1 : 1) : -s; pts.push((i ? 'L' : 'M') + x + ' ' + (MID + y * A)); }
      path.setAttribute('d', pts.join(' '));
    });
    if (RL.onLeave) RL.onLeave(function () { st.stop(); v.stop(); });
  }

  /* ---------- 03 buzzers ---------- */
  steps.push({ id: 'buzzers', title: 'Active vs passive buzzers', time: '15 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Your kit has two buzzers that look almost the same. One can only beep. The other can play any note you like. Knowing which is which — and why — saves a lot of confusion.</p>');
    buzzXp(b);
    UI.html(b, '<div class="two"><div class="callout plain"><span class="label">Passive buzzer</span><p>A <b>green circuit board</b> shows underneath. Just a coil and a metal disc: it only makes a sound when you send it a vibrating signal, and <code>tone(pin, frequency)</code> lets you pick <b>any pitch</b>. This is your synth’s voice.</p></div><div class="callout plain"><span class="label">Active buzzer</span><p>Sealed in black underneath, often with a white sticker on top. Slightly taller. Has its own oscillator inside, so <code>digitalWrite(pin, HIGH)</code> makes it beep at <b>one fixed pitch</b> (about 2300 Hz). Great for alarms, timers and warnings.</p></div></div>');
    UI.mcq(b, ctx, { id: 'q-bz1', q: 'You connect the <b>passive</b> buzzer to pin 8 and run <code>digitalWrite(8, HIGH);</code>. What do you hear?', options: ['A steady beep', 'A single click, then silence', 'Middle C', 'It plays a random note'], answer: 1, explain: 'A steady voltage pulls the disc in once (click) and holds it there. No vibration means no sound. A passive buzzer needs a signal that switches on and off — that’s what tone() makes.', hints: { 0: 'That’s what the <i>active</i> buzzer does, because it has its own oscillator.' } });
    UI.mcq(b, ctx, { id: 'q-bz2', q: 'What does <code>tone(8, 440);</code> actually do to pin 8?', options: ['Sets it to 4.4 V', 'Switches it HIGH and LOW 440 times every second', 'Plays a recording of an A', 'Turns it on for 440 ms'], answer: 1, explain: 'tone() makes a <b>square wave</b>: pin 8 flips between 5 V and 0 V, 440 full cycles per second. The buzzer’s disc follows it, vibrating at 440 Hz.', hints: { 3: 'The second number is a frequency in Hz, not a time.' } });
  } });
  function buzzXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'Inside the two buzzers', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        st.look = S('g', {}, svg);
        [[200, 'PASSIVE', 'green board underneath', true], [560, 'ACTIVE', 'sealed underneath', false]].forEach(function (z) {
          var g = S('g', {}, st.look), x = z[0];
          T(g, x, 46, z[1], { 'text-anchor': 'middle', 'font-size': 13, fill: CY, 'letter-spacing': '2' });
          S('circle', { cx: x - 70, cy: 150, r: 52, fill: '#16191e', stroke: '#4b5563', 'stroke-width': 2 }, g);
          if (z[3]) { S('circle', { cx: x - 70, cy: 150, r: 34, fill: '#1c2129' }, g); }
          else { S('circle', { cx: x - 70, cy: 150, r: 26, fill: '#f4f7fb', opacity: 0.85 }, g); T(g, x - 70, 167, 'REMOVE', { 'text-anchor': 'middle', 'font-size': 7, fill: '#1c2733' }); }
          S('circle', { cx: x - 70, cy: 150, r: 5, fill: '#0b0d10' }, g);
          T(g, x - 70, 226, 'TOP', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          S('circle', { cx: x + 70, cy: 150, r: 52, fill: z[3] ? '#1f6b3a' : '#0d0f12', stroke: '#4b5563', 'stroke-width': 2 }, g);
          if (z[3]) { S('path', { d: 'M' + (x + 40) + ' 130 h40 v20 h18 M' + (x + 50) + ' 170 h34', stroke: '#c9a227', 'stroke-width': 2.5, fill: 'none' }, g); S('rect', { x: x + 56, y: 138, width: 14, height: 8, fill: '#111' }, g); }
          else S('circle', { cx: x + 70, cy: 150, r: 40, fill: '#15171b' }, g);
          S('circle', { cx: x + 52, cy: 150, r: 3.5, fill: '#c0c6cc' }, g); S('circle', { cx: x + 88, cy: 150, r: 3.5, fill: '#c0c6cc' }, g);
          T(g, x + 70, 226, 'BOTTOM', { 'text-anchor': 'middle', 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' });
          P(g, x, 262, z[2], { 'text-anchor': 'middle', fill: INK, 'font-size': 14 });
        });
        S('line', { x1: 380, y1: 30, x2: 380, y2: 290, stroke: GRID }, st.look);
        // cross-section
        st.cut = S('g', {}, svg);
        T(st.cut, 60, 40, 'INSIDE (CUT IN HALF)', LBL);
        S('path', { d: 'M70 120 L70 260 L330 260 L330 120', fill: 'none', stroke: '#4b5563', 'stroke-width': 4 }, st.cut);
        S('rect', { x: 92, y: 200, width: 46, height: 56, fill: '#3b4350' }, st.cut); S('rect', { x: 262, y: 200, width: 46, height: 56, fill: '#3b4350' }, st.cut);
        T(st.cut, 115, 280, 'MAGNET', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT });
        st.coil = S('rect', { x: 170, y: 176, width: 60, height: 80, rx: 4, fill: '#b87333' }, st.cut);
        for (var i = 0; i < 7; i++) S('line', { x1: 170, y1: 184 + i * 10, x2: 230, y2: 184 + i * 10, stroke: '#7a4a1e', 'stroke-width': 2 }, st.cut);
        T(st.cut, 200, 280, 'COIL', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT });
        st.disc = S('path', { d: '', fill: 'none', stroke: '#c0c6cc', 'stroke-width': 5, 'stroke-linecap': 'round' }, st.cut);
        T(st.cut, 345, 150, 'METAL DISC', { 'font-size': 9, fill: MUT });
        st.osc = S('g', {}, st.cut); S('rect', { x: 150, y: 292, width: 100, height: 26, rx: 3, fill: '#111', stroke: CY }, st.osc); S('line', { x1: 200, y1: 260, x2: 200, y2: 292, stroke: CY, 'stroke-width': 2 }, st.osc); T(st.osc, 200, 310, 'OSCILLATOR', { 'text-anchor': 'middle', 'font-size': 9, fill: CY, 'letter-spacing': '1' });
        st.arcs = [0, 1, 2].map(function (k) { return S('path', { d: 'M' + (150 + k * 0) + ' ' + (100 - k * 18) + ' Q200 ' + (80 - k * 18) + ' 250 ' + (100 - k * 18), fill: 'none', stroke: CY, 'stroke-width': 3, opacity: 0 }, st.cut); });
        st.click = T(st.cut, 200, 70, '', { 'text-anchor': 'middle', 'font-size': 14, fill: SIG, 'letter-spacing': '2' });
        // signal on the right
        T(st.cut, 430, 40, 'THE SIGNAL ON THE + LEG', LBL);
        S('line', { x1: 430, y1: 90, x2: 770, y2: 90, stroke: GRID, 'stroke-dasharray': '3 5' }, st.cut); T(st.cut, 422, 94, '5 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        S('line', { x1: 430, y1: 190, x2: 770, y2: 190, stroke: GRID, 'stroke-dasharray': '3 5' }, st.cut); T(st.cut, 422, 194, '0 V', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        st.sig = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, st.cut);
        st.code = T(st.cut, 430, 240, '', { 'font-size': 14, fill: CY });
        st.note = P(st.cut, 430, 270, '', { fill: MUT, 'font-size': 13 });
        st.inner = S('g', {}, st.cut); T(st.inner, 430, 304, 'INSIDE THE OSCILLATOR:', { 'font-size': 10, fill: MUT, 'letter-spacing': '1' }); st.isig = S('polyline', { points: '', fill: 'none', stroke: SIG, 'stroke-width': 2 }, st.inner);
        st.mode = 'look'; var hist = [], acc = 0, tt = 0, d = 0;
        loop(st, function (dt) {
          tt += dt; acc += dt; var m = st.mode, v;
          if (m === 'dc') v = tt > 0.6 ? 1 : 0; else if (m === 'tone') v = Math.floor(tt * 4) % 2 === 0 ? 1 : 0; else if (m === 'active') v = 1; else v = 0;
          if (acc > 1 / 50) { acc = 0; hist.push(v); if (hist.length > 86) hist.shift(); st.sig.setAttribute('points', hist.map(function (h, i) { var x = 430 + (86 - hist.length + i) * 4, y = 190 - h * 100, pv = hist[i - 1]; return pv !== undefined && pv !== h ? x + ',' + (190 - pv * 100) + ' ' + x + ',' + y : x + ',' + y; }).join(' ')); }
          var target = m === 'dc' ? v : m === 'tone' ? v : m === 'active' ? (Math.floor(tt * 16) % 2) : 0;
          d = ease(d, target, dt, 30);
          st.disc.setAttribute('d', 'M78 130 Q200 ' + (130 + 30 * d) + ' 322 130');
          var vib = m === 'tone' || m === 'active';
          st.arcs.forEach(function (a, k) { a.setAttribute('opacity', vib ? 0.4 + 0.6 * Math.abs(Math.sin(tt * 6 + k)) : 0); });
          if (m === 'dc') st.click.textContent = tt > 0.6 && tt < 1.1 ? 'CLICK!' : tt >= 1.1 ? '…silence' : '';
          if (m === 'active') { var ip = []; for (var k = 0; k < 85; k++) ip.push((600 + k * 2) + ',' + (Math.floor((k + tt * 40) / 4) % 2 ? 292 : 312)); st.isig.setAttribute('points', ip.join(' ')); }
        });
        st.set = function (m, code, note) {
          st.mode = m; tt = 0; hist = [];
          st.look.setAttribute('opacity', m === 'look' ? 1 : 0); st.cut.setAttribute('opacity', m === 'look' ? 0 : 1);
          st.osc.setAttribute('opacity', m === 'active' ? 1 : 0); st.inner.setAttribute('opacity', m === 'active' ? 1 : 0);
          st.code.textContent = code || ''; st.note.textContent = note || ''; st.click.textContent = '';
        };
      },
      frames: [
        { cap: '<b>Tell them apart.</b> Turn both buzzers over. The <b>passive</b> buzzer shows a <b>green circuit board</b>. The <b>active</b> one is sealed in black (and often has a white “remove seal” sticker on top). On both, the <b>longer leg is +</b>, and there’s a little + on top.', draw: function (svg, S, st) { st.set('look'); } },
        { cap: '<b>Inside a passive buzzer</b> is a coil of wire under a thin metal disc. When current flows, the coil becomes an electromagnet and pulls the disc down. A steady HIGH pulls it down <b>once</b> — click — and holds it. No movement, no sound.', draw: function (svg, S, st) { st.set('dc', 'digitalWrite(8, HIGH);', 'one click, then nothing'); } },
        { cap: '<b>tone() makes it vibrate.</b> <code>tone(8, 262)</code> switches pin 8 on and off 262 times a second: a <b>square wave</b>. The disc is pulled in and released 262 times a second, pushing the air at 262 Hz: middle C. (Shown here very slowed down.)', draw: function (svg, S, st) { st.set('tone', 'tone(8, 262);', 'the disc follows the wave: sound!'); } },
        { cap: '<b>An active buzzer has its own oscillator</b> — a tiny circuit that makes the square wave for you. Give it a steady HIGH and it beeps at its one built-in frequency (about 2300 Hz). Easy to use, but you can only switch it on and off, never change the note.', draw: function (svg, S, st) { st.set('active', 'digitalWrite(7, HIGH);', 'steady 5 V in, but the disc still vibrates'); } }
      ] });
  }

  /* ---------- 04 build & code: first notes ---------- */
  steps.push({ id: 'first', title: 'Build & code: first notes', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Put both buzzers on the breadboard and hear the difference for yourself.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable while you wire. Keep the 5V and GND wires from Mission 01 and clear everything else off the breadboard.</p>');
    B.guide(b, { title: 'Two buzzers', parts: ALL, base: [], steps: [
      { title: 'Power the rails', add: ['p5v', 'pgnd', 'pbr1', 'pbr2'], html: '<p>Same as always: <b>red</b> from <b>5V</b> to the left <b>+</b> rail, <b>black</b> from <b>GND</b> (beside pin 13) to the <b>−</b> rail, and the two bridges at the bottom.</p>' },
      { title: 'The passive buzzer', add: ['bz_p'], html: '<p>Find the buzzer with the <b>green board</b> underneath. Its legs are about 3 holes apart, so it straddles the centre gap: <b>+ leg (the longer one) in e3</b>, − leg in <b>f3</b>.</p>' },
      { title: 'Wire it up', add: ['w_p', 'g_p'], html: '<p>A wire from <b>pin 8 → a3</b> (the + side), and a <b>black</b> jumper from <b>j3 → the right − rail</b>.</p><p class="small muted">No resistor needed: the buzzer’s coil limits the current itself.</p>' },
      { title: 'The active buzzer', add: ['bz_a', 'w_a', 'g_a'], html: '<p>The sealed buzzer goes four rows lower: <b>+ leg in e7</b>, − leg in <b>f7</b>. Wire <b>pin 7 → a7</b> and a <b>black</b> jumper from <b>j7 → − rail</b>.</p>' },
      { title: 'Check your build', view: [236, 30, 480, 380], html: '<p>Two buzzers, same pattern: + leg on the left side of the gap, wired to a pin; − leg on the right side, wired to the − rail. Passive on pin 8, active on pin 7.</p>' }
    ] });
    UI.html(b, '<h2>Read the code</h2>');
    RL.Code.walk(b, FIRST, [
      { lines: [ln(FIRST, 'ACTIVE_BUZZER = 7'), ln(FIRST, 'PASSIVE_BUZZER = 8')], title: 'Two buzzers, two pins', html: '<p>Names that match your wiring.</p>' },
      { lines: [ln(FIRST, 'pinMode(ACTIVE'), ln(FIRST, 'pinMode(ACTIVE')], title: 'Only one pinMode?', html: '<p>The active buzzer is switched with <code>digitalWrite</code>, so it needs <code>pinMode(…, OUTPUT)</code> like an LED. <code>tone()</code> sets up its own pin automatically.</p>' },
      { lines: [ln(FIRST, 'digitalWrite(ACTIVE_BUZZER, HIGH)'), ln(FIRST, 'digitalWrite(ACTIVE_BUZZER, LOW)') + 1], title: 'Active: on, off', html: '<p>HIGH = beep, LOW = quiet. Exactly like blinking an LED — the buzzer’s own oscillator picks the pitch.</p>' },
      { lines: [ln(FIRST, 'tone(PASSIVE_BUZZER, 262)'), ln(FIRST, 'tone(PASSIVE_BUZZER, 262)') + 1], title: 'tone(pin, frequency)', html: '<p><code>tone(PASSIVE_BUZZER, 262)</code> starts a 262 Hz square wave on pin 8 and <b>keeps it going</b> while the code moves on. The <code>delay(400)</code> is what decides how long the note lasts.</p>' },
      { lines: [ln(FIRST, 'tone(PASSIVE_BUZZER, 330)'), ln(FIRST, 'tone(PASSIVE_BUZZER, 523)') + 1], title: 'A chord, one note at a time', html: '<p>C, E, G is a C major chord played as an <b>arpeggio</b>. The last C is 523 Hz: double 262, so one octave higher.</p>' },
      { lines: [ln(FIRST, 'noTone'), ln(FIRST, 'noTone') + 1], title: 'noTone()', html: '<p>Stops the square wave. Without it, the last note would keep playing forever.</p>' }
    ], { name: 'two_buzzers' });
    UI.html(b, '<h2>Try it on the Virtual UNO</h2><p>Turn your volume down a little, then press <b>Upload &amp; run</b>. The sound waves on each buzzer show which one is playing.</p>');
    RL.Sim.create(b, { title: 'Two buzzers', code: FIRST, name: 'two_buzzers', key: 'sim-first', ctx: ctx, board: { parts: ALL, show: IDS_BUZZ, view: [236, 34, 480, 260], vb: VBM }, buzzers: BUZZERS(), runHint: 'listen for the beep, then the four notes.',
      checkAfter: 4000,
      check: function (log) {
        var on7 = log.some(function (e) { return e.pin === 7 && e.v; }), off7 = log.some(function (e) { return e.pin === 7 && !e.v; });
        var tones = log.filter(function (e) { return e.dev === 'tone'; }).map(function (e) { return e.v; });
        var want = [262, 330, 392, 523].filter(function (f) { return tones.indexOf(f) < 0; });
        var r;
        if (!on7 || !off7) r = { pass: false, msg: 'The active buzzer on pin 7 should switch HIGH and then LOW.' };
        else if (want.length) r = { pass: false, msg: 'These notes never played: ' + want.join(', ') + ' Hz. Check the tone() lines use PASSIVE_BUZZER.' };
        else if (tones.indexOf(0) < 0) r = { pass: false, msg: 'Don’t forget noTone() to stop the last note.' };
        else r = { pass: true, msg: 'Beep from the active buzzer, then C–E–G–C from the passive one. Two very different buzzers.' };
        ctx.check('sim-first-pass', r.pass ? 1 : 0); return r;
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Upload to your board. Then try this: swap the pin numbers in the two constants (7 ↔ 8) and upload again. The active buzzer can’t play the notes — you’ll hear the same pitch every time, maybe crackly — and the passive buzzer just clicks. Swap them back.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Silence</b><br><span class="small muted">Check the + leg is on the left side of the gap (column e) and wired to the right pin. Push the legs in firmly: buzzer legs are short.</span></div></div><div class="trow"><div><b>Clicks instead of notes</b><br><span class="small muted">The two buzzers are swapped. The one with the green board underneath goes on pin 8.</span></div></div><div class="trow"><div><b>Very quiet</b><br><span class="small muted">The buzzer may be in backwards. Turn it around so the + leg is in e3 (or e7).</span></div></div></div>');
  } });

  /* ---------- 05 melodies with arrays ---------- */
  steps.push({ id: 'melody', title: 'Code it: melodies with arrays', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A melody is a list: which note, for how long, then the next note. Writing a <code>tone</code> and a <code>delay</code> line for every note gets long fast. Instead, programmers keep lists of numbers in <b>arrays</b> and let a <code>for</code> loop walk through them.</p>');
    arrayXp(b);
    UI.mcq(b, ctx, { id: 'q-arr1', q: 'With <code>int melody[] = { 262, 294, 330, 349 };</code>, what is <code>melody[2]</code>?', options: ['294', '330', '349', 'An error: there is no [2]'], answer: 1, explain: 'Arrays count from 0: melody[0] = 262, melody[1] = 294, <b>melody[2] = 330</b>, melody[3] = 349.', hints: { 0: 'That’s melody[1]. Count from 0!' } });
    UI.html(b, '<h2>Read the code</h2><p>Here’s the first line of “Twinkle, twinkle, little star” as two arrays.</p>');
    RL.Code.walk(b, MELODY, [
      { lines: [ln(MELODY, 'const int NOTE_C4'), ln(MELODY, 'const int NOTE_C5')], title: 'Name the notes', html: '<p>Nobody wants to remember that G is 392 Hz. These constants let you write <code>NOTE_G4</code> instead.</p>' },
      { lines: [ln(MELODY, 'int melody[]'), ln(MELODY, 'int melody[]')], title: 'The notes array', html: '<p><code>int melody[] = { … };</code> makes an <b>array</b> of whole numbers. The square brackets <code>[]</code> mean “a list,” and the values go inside curly brackets, separated by commas.</p>' },
      { lines: [ln(MELODY, 'int durations[]'), ln(MELODY, 'NOTE_COUNT = 7')], title: 'The durations array', html: '<p>A second array holds how long each note lasts, in milliseconds, in the <b>same order</b>. The last note is held twice as long. <code>NOTE_COUNT</code> says how many notes there are.</p>' },
      { lines: [ln(MELODY, 'void setup'), ln(MELODY, 'void setup') + 1], title: 'An empty setup()', html: '<p>Nothing to set up: <code>tone()</code> prepares its own pin.</p>' },
      { lines: [ln(MELODY, 'for (int i'), ln(MELODY, 'for (int i')], title: 'Walk through the list', html: '<p>The <code>for</code> loop counts <code>i</code> = 0, 1, 2 … 6. Each time round, <code>i</code> is the position of the note to play.</p>' },
      { lines: [ln(MELODY, 'tone(BUZZER, melody[i])'), ln(MELODY, 'delay(durations[i])')], title: 'melody[i] and durations[i]', html: '<p>The same <code>i</code> picks a note <i>and</i> its length from the two arrays: when i is 2, it plays <code>melody[2]</code> (G) for <code>durations[2]</code> (400 ms).</p>' },
      { lines: [ln(MELODY, 'noTone(BUZZER)'), ln(MELODY, 'delay(50)')], title: 'A tiny gap', html: '<p>Without a gap, two Cs in a row would sound like one long C. 50 ms of silence separates them, the way a pianist lifts a finger.</p>' },
      { lines: [ln(MELODY, 'delay(1500)'), ln(MELODY, 'delay(1500)')], title: 'And again', html: '<p>After the last note, wait 1.5 seconds and loop() plays the tune again.</p>' }
    ], { name: 'melody' });
    UI.html(b, '<h2>Your turn: compose a tune</h2><p>In the Virtual UNO below, replace “Twinkle” with your own tune of <b>at least 8 notes</b> — a song you know, a game theme, or something you make up. Add notes to <b>both</b> arrays and change <code>NOTE_COUNT</code> to match. <b>Check my code</b> listens to one full play-through.</p>');
    RL.Sim.create(b, { title: 'Melody', code: MELODY, name: 'melody', key: 'sim-melody', ctx: ctx, board: { parts: ALL, show: IDS_BUZZ, view: [236, 34, 480, 260], vb: VBM }, buzzers: BUZZERS(), runHint: 'listen to the tune.',
      checkAfter: 500,
      check: function (log, sim) {
        return new Promise(function (res) {
          var t0 = Date.now();
          (function poll() {
            var ev = log.filter(function (e) { return e.dev === 'tone'; }), notes = [], offT = null, done = false;
            for (var i = 0; i < ev.length; i++) { var e = ev[i]; if (e.v > 0) { if (offT != null && e.t - offT > 1000 && notes.length) { done = true; break; } notes.push(e.v); offT = null; } else if (offT == null) offT = e.t; }
            if (!done && offT != null && sim.runtime && sim.runtime.millis() - offT > 1100 && notes.length) done = true;
            if (!done && Date.now() - t0 < 16000) return setTimeout(poll, 300);
            var distinct = notes.filter(function (v, k) { return notes.indexOf(v) === k; }).length, r;
            var broken = ev.some(function (e) { return typeof e.v !== 'number' || isNaN(e.v); });
            if (broken) r = { pass: false, msg: 'The loop tried to play a note that isn’t in your array. Is NOTE_COUNT bigger than the number of notes? (Count both arrays.)' };
            else if (!notes.length) r = { pass: false, msg: 'No notes played. Check that tone() uses BUZZER and melody[i].' };
            else if (notes.some(function (v) { return !(v > 30); })) r = { pass: false, msg: 'Some notes had no frequency. Is NOTE_COUNT bigger than the number of notes in your arrays?' };
            else if (notes.length < 8) r = { pass: false, msg: 'Your tune has ' + notes.length + ' notes. The challenge is at least 8: add notes to both arrays and update NOTE_COUNT.' };
            else if (distinct < 3) r = { pass: false, msg: 'Use at least 3 different notes so it’s a real tune.' };
            else r = { pass: true, msg: notes.length + ' notes, ' + distinct + ' different pitches: ' + notes.slice(0, 10).map(noteName).join(' ') + (notes.length > 10 ? ' …' : '') + '. Nice tune!' };
            ctx.check('sim-melody-pass', r.pass ? 1 : 0); res(r);
          })();
        });
      } });
    var hint = el('details', 'chal'); hint.innerHTML = '<summary>Stuck? Show “Mary had a little lamb”</summary><p class="small">13 notes. Replace the two arrays and NOTE_COUNT with:</p>';
    RL.Code.block(hint, 'int melody[] = { NOTE_E4, NOTE_D4, NOTE_C4, NOTE_D4, NOTE_E4, NOTE_E4, NOTE_E4,\n                 NOTE_D4, NOTE_D4, NOTE_D4, NOTE_E4, NOTE_G4, NOTE_G4 };\nint durations[] = { 400, 400, 400, 400, 400, 400, 800,\n                    400, 400, 800, 400, 400, 800 };\nconst int NOTE_COUNT = 13;', { download: false });
    b.appendChild(hint);
    UI.mcq(b, ctx, { id: 'q-arr2', q: 'Your arrays have 8 notes but you set <code>NOTE_COUNT = 9</code>. What happens?', options: ['It plays 8 notes and stops', 'The loop reads <code>melody[8]</code>, which doesn’t exist: you get a random, wrong note', 'It won’t upload', 'It plays the first note twice'], answer: 1, explain: 'C++ doesn’t check: melody[8] reads whatever happens to be in memory after the array. On a real UNO that’s a random “note.” Always keep NOTE_COUNT equal to the array length.' });
    UI.html(b, '<p style="margin-top:20px">Upload your tune to the real board and play it for your partner. Can they name it?</p>');
  } });
  function arrayXp(b) {
    var MEL = [262, 262, 392, 392, 440, 440, 392], DUR = [400, 400, 400, 400, 400, 400, 800];
    UI.explainer(b, { label: 'Explainer', title: 'Arrays: numbered boxes', w: 800, h: 330,
      init: function (svg, S, st) {
        bg(svg, 800, 330);
        var X0 = 190, W = 74, G = 10;
        T(svg, 40, 104, 'melody[]', { 'font-size': 15, fill: CY });
        st.durL = T(svg, 40, 214, 'durations[]', { 'font-size': 15, fill: CY });
        st.cells = MEL.map(function (v, i) {
          var x = X0 + i * (W + G);
          var idx = T(svg, x + W / 2, 66, '[' + i + ']', { 'text-anchor': 'middle', 'font-size': 12, fill: MUT });
          var r1 = S('rect', { x: x, y: 78, width: W, height: 44, rx: 4, fill: '#0e1826', stroke: WIREC, 'stroke-width': 2 }, svg);
          T(svg, x + W / 2, 106, String(v), { 'text-anchor': 'middle', 'font-size': 16, fill: INK });
          T(svg, x + W / 2, 140, noteName(v), { 'text-anchor': 'middle', 'font-size': 10, fill: MUT });
          var g2 = S('g', {}, svg);
          var r2 = S('rect', { x: x, y: 188, width: W, height: 44, rx: 4, fill: '#0e1826', stroke: WIREC, 'stroke-width': 2 }, g2);
          T(g2, x + W / 2, 216, String(DUR[i]), { 'text-anchor': 'middle', 'font-size': 16, fill: INK });
          return { r1: r1, r2: r2, g2: g2, idx: idx, x: x };
        });
        st.ptr = S('g', {}, svg);
        S('path', { d: 'M0 0 l-9 -14 h18 z', fill: CY }, st.ptr);
        st.ptrT = T(st.ptr, 0, -20, '', { 'text-anchor': 'middle', 'font-size': 13, fill: CY });
        st.code1 = T(svg, 40, 278, '', { 'font-size': 14, fill: INK });
        st.code2 = T(svg, 40, 304, '', { 'font-size': 14, fill: INK });
        st.var = S('g', {}, svg);
        S('rect', { x: 600, y: 250, width: 74, height: 44, rx: 4, fill: '#0e1826', stroke: MUT, 'stroke-width': 2, 'stroke-dasharray': '4 4' }, st.var);
        T(st.var, 637, 278, '262', { 'text-anchor': 'middle', 'font-size': 16, fill: INK }); T(st.var, 590, 278, 'int note =', { 'text-anchor': 'end', 'font-size': 13, fill: MUT });
        st.hl = function (i, both) {
          st.cells.forEach(function (c, k) { var on = k === i; c.r1.setAttribute('stroke', on ? CY : WIREC); c.r1.setAttribute('fill', on ? '#0a2a36' : '#0e1826'); c.r2.setAttribute('stroke', on && both ? CY : WIREC); c.r2.setAttribute('fill', on && both ? '#0a2a36' : '#0e1826'); c.idx.setAttribute('fill', on ? CY : MUT); });
          if (i == null || i < 0) { st.ptr.setAttribute('opacity', 0); return; }
          st.ptr.setAttribute('opacity', 1); st.ptr.setAttribute('transform', 'translate(' + (st.cells[i].x + W / 2) + ' 48)'); st.ptrT.textContent = 'i = ' + i;
        };
        st.show = function (dur, vr) { st.cells.forEach(function (c) { c.g2.setAttribute('opacity', dur ? 1 : 0); }); st.durL.setAttribute('opacity', dur ? 1 : 0); st.var.setAttribute('opacity', vr ? 1 : 0); };
        st.codeAt = function (i) { st.code1.textContent = i == null ? '' : 'tone(BUZZER, melody[' + i + ']);   → tone(8, ' + MEL[i] + ');'; st.code2.textContent = i == null ? '' : 'delay(durations[' + i + ']);      → delay(' + DUR[i] + ');'; };
      },
      frames: [
        { cap: '<b>One name, a whole list.</b> A normal variable (like <code>int note</code>) holds one number. An <b>array</b> holds a row of numbers under one name: <code>int melody[] = { 262, 262, 392, … };</code>', draw: function (svg, S, st) { st.show(false, true); st.hl(null); st.codeAt(null); } },
        { cap: '<b>Count from zero.</b> Each box has a number called its <b>index</b>, starting at <b>0</b>. <code>melody[0]</code> is the first note (262) and <code>melody[6]</code> is the seventh (392). Seven boxes, numbered 0 to 6.', draw: function (svg, S, st) { st.show(false, false); st.codeAt(null); st.hl(0); st.later(function () { st.hl(6); }, 1500); st.later(function () { st.hl(2); }, 3000); } },
        { cap: '<b>Two arrays, same index.</b> <code>durations[]</code> holds how long each note lasts, lined up box-for-box with <code>melody[]</code>. Index 6 means “the 7th note, for 800 ms.”', draw: function (svg, S, st) { st.show(true, false); st.codeAt(null); st.hl(6, true); } },
        { cap: '<b>A for loop walks along both.</b> <code>for (int i = 0; i &lt; 7; i++)</code> sets i to 0, 1, 2 … 6. Each time round, <code>melody[i]</code> and <code>durations[i]</code> pick the next note and its length. Change the numbers in the boxes and you’ve written a new song — without touching the loop.', draw: function (svg, S, st) {
          st.show(true, false); var t = 0;
          DUR.forEach(function (d, i) { st.later(function () { st.hl(i, true); st.codeAt(i); }, t); t += d * 1.6; });
          st.later(function () { st.hl(null); st.codeAt(null); }, t);
        } }
      ] });
  }

  /* ---------- 06 keyboard & INPUT_PULLUP ---------- */
  steps.push({ id: 'keys', title: 'Build & code: the keyboard', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Four buttons, four notes. In Mission 01 every button needed a 10 kΩ pull-down resistor. This time you’ll use a resistor that’s <b>already inside the UNO</b> — so each button needs just two wires.</p>');
    pullupXp(b);
    UI.mcq(b, ctx, { id: 'q-pu1', q: 'A button is wired between pin 4 and GND, with <code>pinMode(4, INPUT_PULLUP)</code>. What does <code>digitalRead(4)</code> give when nobody is pressing it?', options: ['LOW', 'HIGH', 'Random HIGHs and LOWs', '512'], answer: 1, explain: 'The internal pull-up resistor holds pin 4 at 5 V, so it reads HIGH. Pressing connects it to GND and it reads LOW.', hints: { 0: 'LOW is what you get when it’s pressed. What’s holding the pin when it isn’t?', 2: 'That’s a floating pin. INPUT_PULLUP stops it floating.' } });
    UI.html(b, '<h2>Build the keyboard</h2>');
    UI.callout(b, 'safety', 'Safety', '<p>Unplug the USB cable. Keep both buzzers where they are.</p>');
    B.guide(b, { title: 'Four-key keyboard', parts: ALL, base: IDS_BUZZ.slice(), steps: [
      { title: 'Start from the buzzers', view: [236, 30, 480, 420], html: '<p>Your two buzzers stay in rows 3 and 7. The four buttons go below them, three rows apart.</p>' },
      { title: 'Key G → pin 6', add: ['k_g', 'w_kg', 'g_kg'], html: '<p>Press a button across the gap with its legs in <b>e9, f9, e11 and f11</b>. Wire <b>pin 6 → a9</b>, and add a <b>black</b> jumper from <b>j11 → the − rail</b>.</p><p>That’s it: pressing the button connects pin 6 (row 9) to GND (row 11). <b>No resistor.</b></p>' },
      { title: 'Key E → pin 5', add: ['k_e', 'w_ke', 'g_ke'], html: '<p>Same pattern, three rows down: button in <b>e12, f12, e14, f14</b>; <b>pin 5 → a12</b>; black jumper <b>j14 → − rail</b>.</p>' },
      { title: 'Key D → pin 4', add: ['k_d', 'w_kd', 'g_kd'], html: '<p>Button in <b>e15, f15, e17, f17</b>; <b>pin 4 → a15</b>; black jumper <b>j17 → − rail</b>.</p>' },
      { title: 'Key C → pin 3', add: ['k_c', 'w_kc', 'g_kc'], html: '<p>Button in <b>e18, f18, e20, f20</b>; <b>pin 3 → a18</b>; black jumper <b>j20 → − rail</b>.</p>' },
      { title: 'Check your build', view: [236, 30, 480, 420], html: '<p>Every key: pin wire into column a of its top row, black jumper from column j of its bottom row to the − rail. Pins 3, 4, 5, 6 play C, D, E, G.</p><p class="small muted">The keys are in reverse order on the board (G at the top) so no wires cross. You can arrange them any way you like in your controller.</p>' }
    ] });
    UI.html(b, '<h2>Read the code</h2><p>Arrays again: one for the button pins and one for their notes, so a single <code>for</code> loop handles all four keys.</p>');
    RL.Code.walk(b, KEYCODE, [
      { lines: [ln(KEYCODE, 'int keys[]'), ln(KEYCODE, 'int notes[]')], title: 'Pins and notes, side by side', html: '<p><code>keys[0]</code> is pin 3 and <code>notes[0]</code> is 262 Hz (C). Same index, same key.</p>' },
      { lines: [ln(KEYCODE, 'int playing'), ln(KEYCODE, 'int playing')], title: 'Remember what’s playing', html: '<p>This variable remembers the note the buzzer is making right now, so the code can tell when it changes.</p>' },
      { lines: [ln(KEYCODE, 'for (int k = 0; k < 4; k++) {'), ln(KEYCODE, 'pinMode(keys[k], INPUT_PULLUP)') + 1], title: 'INPUT_PULLUP', html: '<p>A loop sets all four pins to <code>INPUT_PULLUP</code>: an input with the internal pull-up resistor switched on. <code>keys[k]</code> is 3, then 4, then 5, then 6.</p>' },
      { lines: [ln(KEYCODE, 'int note = 0;'), ln(KEYCODE, 'note = notes[k]') + 2], title: 'Which key is down?', html: '<p>Start with <code>note = 0</code> (silence). Check each key: <code>== LOW</code> means <b>pressed</b> (the opposite of Mission 01). If it is, take that key’s frequency from <code>notes[k]</code>.</p>' },
      { lines: [ln(KEYCODE, 'if (note != playing)'), ln(KEYCODE, 'playing = note;') + 1], title: 'Only change when it changes', html: '<p><code>!=</code> means “is not equal to.” loop() runs hundreds of times a second; restarting the same note every time would make it crackle. So the code only calls <code>tone</code> or <code>noTone</code> when the note is <i>different</i> from what’s playing, then remembers the new one.</p>' },
      { lines: [ln(KEYCODE, 'delay(10)'), ln(KEYCODE, 'delay(10)')], title: 'A short pause', html: '<p>Checking 100 times a second is plenty fast for fingers.</p>' }
    ], { name: 'keyboard' });
    UI.html(b, '<h2>Play it on the Virtual UNO</h2><p>Run it and <b>press and hold the buttons</b> on the breadboard. <b>Check my code</b> presses each key for you.</p>');
    RL.Sim.create(b, { title: 'Four-key keyboard', code: KEYCODE, name: 'keyboard', key: 'sim-keys', ctx: ctx, board: { parts: ALL, show: IDS_KEYS, view: VIEW_KEYS, vb: VBM }, buzzers: BUZZERS(), buttons: KEYBTNS(), runHint: 'press and hold the buttons to play.',
      checkAfter: 500,
      check: function (log, sim) {
        var want = [[3, 262, 'C'], [4, 294, 'D'], [5, 330, 'E'], [6, 392, 'G']], got = [];
        return new Promise(function (res) {
          (function next(i) {
            if (i >= want.length) {
              setTimeout(function () {
                var silent = (sim.state() || {}).tone === 0, bad = got.filter(function (g) { return g[1] !== g[0][1]; }), r;
                if (bad.length) r = { pass: false, msg: 'Key ' + bad[0][0][2] + ' (pin ' + bad[0][0][0] + ') played ' + (bad[0][1] || 'nothing') + (bad[0][1] ? ' Hz' : '') + ' instead of ' + bad[0][0][1] + ' Hz. Check INPUT_PULLUP and that a press reads LOW.' };
                else if (!silent) r = { pass: false, msg: 'All four notes play, but the sound doesn’t stop when you let go. Check the noTone() part.' };
                else r = { pass: true, msg: 'C, D, E and G all play, and it goes quiet when you let go. You built a keyboard.' };
                ctx.check('sim-keys-pass', r.pass ? 1 : 0); res(r);
              }, 250);
              return;
            }
            sim.press(want[i][0], true);
            setTimeout(function () { got.push([want[i], (sim.state() || {}).tone]); sim.press(want[i][0], false); setTimeout(function () { next(i + 1); }, 150); }, 220);
          })(0);
        });
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Upload and play. Try a tune: E D C D E E E is the start of “Mary had a little lamb.”</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>A note plays by itself, without pressing</b><br><span class="small muted">That pin is reading LOW: its button is turned 90° (the legs that are always connected are in the wrong rows), or the wire is in the GND row.</span></div></div><div class="trow"><div><b>One key does nothing</b><br><span class="small muted">Check its black jumper goes from the button’s bottom row to the − rail, and its pin wire matches the code (C 3, D 4, E 5, G 6).</span></div></div><div class="trow"><div><b>Notes crackle or stutter</b><br><span class="small muted">Make sure the tone() call is inside <code>if (note != playing)</code>.</span></div></div></div>');
    UI.mcq(b, ctx, { id: 'q-pu2', q: 'Compared with Mission 01’s pull-down button, what’s different with INPUT_PULLUP?', options: ['Pressed reads HIGH, and you need a 10 kΩ resistor', 'Pressed reads LOW, and no extra resistor is needed', 'It only works on pins 3–6', 'The button must go between the pin and 5V'], answer: 1, explain: 'The pull-up resistor is built into the chip, so you save a resistor per button. The catch: the logic is flipped. Pressed = LOW.' });
  } });
  function pullupXp(b) {
    UI.explainer(b, { label: 'Explainer', title: 'INPUT_PULLUP: a resistor inside the UNO', w: 800, h: 340,
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        function btn(g, x, y, id) { S('circle', { cx: x, cy: y, r: 4, fill: WIREC }, g); S('circle', { cx: x, cy: y + 42, r: 4, fill: WIREC }, g); var l = S('line', { x1: x, y1: y + 42, x2: x + 20, y2: y + 6, stroke: WIREC, 'stroke-width': 3, 'stroke-linecap': 'round' }, g); st[id] = l; T(g, x + 26, y + 26, 'BUTTON', { 'font-size': 10, fill: MUT, 'letter-spacing': '1.5' }); }
        function gnd(g, x, y) { S('path', { d: 'M' + (x - 18) + ' ' + y + ' h36 M' + (x - 12) + ' ' + (y + 7) + ' h24 M' + (x - 6) + ' ' + (y + 14) + ' h12', stroke: WIREC, 'stroke-width': 3 }, g); }
        // M01 pull-down
        st.pd = S('g', {}, svg);
        T(st.pd, 40, 34, 'MISSION 01: PULL-DOWN', LBL);
        T(st.pd, 120, 66, '5V', { 'text-anchor': 'middle', 'font-size': 13, fill: '#e5484d' });
        S('line', { x1: 120, y1: 72, x2: 120, y2: 96, stroke: WIREC, 'stroke-width': 3 }, st.pd);
        btn(st.pd, 120, 100, 'lpd');
        S('line', { x1: 120, y1: 146, x2: 120, y2: 230, stroke: WIREC, 'stroke-width': 3 }, st.pd);
        S('line', { x1: 120, y1: 180, x2: 260, y2: 180, stroke: WIREC, 'stroke-width': 3 }, st.pd);
        S('rect', { x: 260, y: 162, width: 70, height: 36, rx: 3, fill: '#15497a', stroke: '#2e6aa3' }, st.pd); T(st.pd, 295, 185, 'PIN 2', { 'text-anchor': 'middle', 'font-size': 12 });
        S('rect', { x: 110, y: 216, width: 20, height: 56, fill: NAVY }, st.pd);
        RL.drawResistorBody(S('g', { transform: 'translate(120 244) rotate(90)' }, st.pd), 10000, 50, 20);
        T(st.pd, 140, 248, '10 kΩ (on the breadboard)', { 'font-size': 11, fill: MUT });
        S('line', { x1: 120, y1: 270, x2: 120, y2: 290, stroke: WIREC, 'stroke-width': 3 }, st.pd); gnd(st.pd, 120, 290);
        // pull-up
        st.pu = S('g', {}, svg);
        T(st.pu, 40, 34, 'MISSION 03: INPUT_PULLUP', LBL);
        S('rect', { x: 40, y: 50, width: 320, height: 150, rx: 8, fill: 'none', stroke: CY, 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, st.pu);
        T(st.pu, 350, 68, 'INSIDE THE UNO', { 'text-anchor': 'end', 'font-size': 10, fill: CY, 'letter-spacing': '1.5' });
        T(st.pu, 120, 76, '5V', { 'text-anchor': 'middle', 'font-size': 13, fill: '#e5484d' });
        S('line', { x1: 120, y1: 82, x2: 120, y2: 176, stroke: WIREC, 'stroke-width': 3 }, st.pu);
        S('rect', { x: 110, y: 96, width: 20, height: 56, fill: NAVY }, st.pu);
        RL.drawResistorBody(S('g', { transform: 'translate(120 124) rotate(90)' }, st.pu), 33000, 50, 20);
        T(st.pu, 140, 128, '≈ 20–50 kΩ', { 'font-size': 11, fill: MUT }); T(st.pu, 140, 144, 'switched on by INPUT_PULLUP', { 'font-size': 10, fill: MUT });
        S('line', { x1: 120, y1: 176, x2: 250, y2: 176, stroke: WIREC, 'stroke-width': 3 }, st.pu);
        S('rect', { x: 250, y: 158, width: 70, height: 36, rx: 3, fill: '#15497a', stroke: '#2e6aa3' }, st.pu); st.pinT = T(st.pu, 285, 181, 'PIN 3', { 'text-anchor': 'middle', 'font-size': 12 });
        S('line', { x1: 120, y1: 176, x2: 120, y2: 230, stroke: WIREC, 'stroke-width': 3 }, st.pu);
        btn(st.pu, 120, 230, 'lpu');
        S('line', { x1: 120, y1: 276, x2: 120, y2: 292, stroke: WIREC, 'stroke-width': 3 }, st.pu); gnd(st.pu, 120, 292);
        st.cur = S('text', { x: 150, y: 330, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, fill: CY }, st.pu);
        // trace
        T(svg, 420, 60, 'WHAT THE PIN READS', LBL);
        S('line', { x1: 420, y1: 110, x2: 770, y2: 110, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 410, 114, 'HIGH', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        S('line', { x1: 420, y1: 230, x2: 770, y2: 230, stroke: GRID, 'stroke-dasharray': '3 5' }, svg); T(svg, 410, 234, 'LOW', { 'text-anchor': 'end', 'font-size': 10, fill: MUT });
        st.trace = S('polyline', { points: '', fill: 'none', stroke: CY, 'stroke-width': 3 }, svg);
        st.read = T(svg, 595, 282, '', { 'text-anchor': 'middle', 'font-size': 14, fill: CY, 'letter-spacing': '1' });
        st.code = T(svg, 595, 312, '', { 'text-anchor': 'middle', 'font-size': 13, fill: INK });
        var pts = [], x = 0, last = 0; st.mode = 'pd'; st.pressed = false;
        loop(st, function (dt, t) {
          last += dt; if (last < 0.04) return; last = 0; x += 4;
          var hi = st.mode === 'pd' ? st.pressed : !st.pressed;
          pts.push([420 + x, hi ? 110 : 230]); if (x > 350) { x = 0; pts = []; }
          st.trace.setAttribute('points', pts.map(function (p, i) { var pv = pts[i - 1]; return (pv ? p[0] + ',' + pv[1] + ' ' : '') + p[0] + ',' + p[1]; }).join(' '));
          st.read.textContent = hi ? 'HIGH' + (st.mode === 'pd' ? ' (pressed)' : ' (not pressed)') : 'LOW' + (st.mode === 'pd' ? ' (not pressed)' : ' (pressed)');
        });
        st.set = function (mode, pressed, code, cur) {
          st.mode = mode; st.pressed = pressed; st.pd.setAttribute('opacity', mode === 'pd' ? 1 : 0); st.pu.setAttribute('opacity', mode === 'pu' ? 1 : 0);
          var l = mode === 'pd' ? st.lpd : st.lpu, y0 = mode === 'pd' ? 100 : 230;
          l.setAttribute('x2', pressed ? 120 : 140); l.setAttribute('y2', pressed ? y0 : y0 + 6);
          st.code.textContent = code || ''; st.cur.textContent = cur || '';
        };
      },
      frames: [
        { cap: '<b>Remember Mission 01?</b> The button connected pin 2 to <b>5V</b>, and a 10 kΩ <b>pull-down</b> resistor held the pin at 0 V the rest of the time. Pressed = HIGH. It works, but every button needs its own resistor.', draw: function (svg, S, st) { st.set('pd', false, 'pressed = HIGH'); st.later(function () { st.set('pd', true, 'pressed = HIGH'); }, 1400); st.later(function () { st.set('pd', false, 'pressed = HIGH'); }, 2600); } },
        { cap: '<b>The UNO has pull-up resistors built in.</b> Every pin has a resistor (about 20–50 kΩ) to 5V inside the chip. <code>pinMode(3, INPUT_PULLUP)</code> switches it on. With the button not pressed, the resistor <b>pulls the pin up</b> to 5V: it reads a steady <b>HIGH</b>.', draw: function (svg, S, st) { st.set('pu', false, 'pinMode(3, INPUT_PULLUP);'); } },
        { cap: '<b>So the button goes to GND instead.</b> Press it and the pin is connected straight to 0 V: it reads <b>LOW</b>. A tiny current trickles through the internal resistor (5 V ÷ about 35 kΩ ≈ 0.14 mA) — harmless.', draw: function (svg, S, st) { st.set('pu', true, 'pressed → LOW', 'current: 5 V ÷ 35 kΩ ≈ 0.14 mA'); } },
        { cap: '<b>The catch: the logic is upside down.</b> With INPUT_PULLUP, <b>LOW means pressed</b>. In your code that means <code>if (digitalRead(3) == LOW)</code>. The reward: no resistors, two wires per button, and a much tidier breadboard.', draw: function (svg, S, st) { st.set('pu', false, 'if (digitalRead(3) == LOW) { … pressed … }'); [700, 1500, 2300, 2900].forEach(function (t, i) { st.later(function () { st.set('pu', i % 2 === 0, 'if (digitalRead(3) == LOW) { … pressed … }'); }, t); }); } }
      ] });
  }

  /* ---------- 07 joystick ---------- */
  steps.push({ id: 'joystick', title: 'Build & code: joystick pitch bend', stage: '05 Create', time: '25 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">The joystick turns your keyboard into an instrument. Push it to bend a note or jump an octave, click it to fire a sound effect. Inside, it’s nothing new: <b>two potentiometers and a button</b>.</p>');
    joyXp(b);
    UI.numq(b, ctx, { id: 'q-joy1', q: 'You push the stick all the way right, so X reads <b>1023</b>. What does <code>map(1023, 0, 1023, -60, 60)</code> give?', answer: 60, tol: 0.5, unit: 'Hz', explain: 'The top of the input range maps to the top of the output range: <b>60</b>. Holding C (262 Hz) then plays 262 + 60 = 322 Hz.', hint: '1023 is the very top of the “from” range.' });
    UI.html(b, '<h2>Add the joystick</h2><p>The joystick module has five pins on a header. Use <b>female-to-male</b> wires: the socket end slides onto the joystick’s pin, the other end goes into the breadboard or the UNO.</p>');
    B.guide(b, { title: 'Joystick module', parts: ALL, base: IDS_KEYS.slice(), vb: VBM, steps: [
      { title: 'Start from the keyboard', view: 'all', html: '<p>Buzzers and four keys stay as they are. The joystick sits beside the breadboard, connected with five female-to-male wires.</p>' },
      { title: 'Power the joystick', add: ['joy', 'j_g', 'j_v'], html: '<p>Joystick <b>GND → the right − rail</b> (black) and <b>+5V → the right + rail</b> (red). The two pots inside now have 5V and GND across them, just like your knob in Mission 02.</p>' },
      { title: 'VRx → A0, VRy → A1', add: ['j_x', 'j_y'], html: '<p><b>VRx</b> (left–right) goes to <b>A0</b> and <b>VRy</b> (up–down) to <b>A1</b>, on the far side of the UNO. Run the wires around the bottom of the breadboard.</p>' },
      { title: 'SW → pin 2', add: ['j_sw'], html: '<p><b>SW</b> (the click button) goes to <b>pin 2</b>. Like your keys, it connects to GND when pressed, so the code uses INPUT_PULLUP for it too.</p>' },
      { title: 'Check your build', view: 'all', html: '<p>Joystick: GND → − rail, +5V → + rail, VRx → A0, VRy → A1, SW → pin 2. Keys on 3–6, passive buzzer on 8, active buzzer on 7.</p>' }
    ] });
    UI.html(b, '<h2>Read the code</h2><p>The keyboard code plus three new ideas: an octave jump, a pitch bend with <code>map()</code>, and a sound effect in its own function.</p>');
    RL.Code.walk(b, SYNTH, [
      { lines: [ln(SYNTH, 'JOY_X = A0'), ln(SYNTH, 'JOY_SW = 2')], title: 'Joystick pins', html: '<p>Two analog pins for the pots, one digital pin for the button.</p>' },
      { lines: [ln(SYNTH, 'pinMode(JOY_SW'), ln(SYNTH, 'pinMode(JOY_SW')], title: 'Another pull-up', html: '<p>The joystick’s SW pin connects to GND when you press the stick down, so it’s <code>INPUT_PULLUP</code> too.</p>' },
      { lines: [ln(SYNTH, 'void laser()'), ln(SYNTH, 'void laser()') + 7], title: 'A sound effect function', html: '<p>The <code>for</code> loop counts <i>down</i>: f starts at 2000 Hz and drops by 40 each time until it reaches 200. Each step plays for 4 ms, so the whole “pew” takes about 0.2 seconds. Sweeping the frequency is how most game sound effects are made.</p>' },
      { lines: [ln(SYNTH, 'if (digitalRead(JOY_SW) == LOW)'), ln(SYNTH, 'if (digitalRead(JOY_SW) == LOW)') + 2], title: 'Click = laser', html: '<p>Pressed reads LOW, so <code>laser()</code> runs.</p>' },
      { lines: [ln(SYNTH, 'int y = analogRead'), ln(SYNTH, 'note = note / 2;') + 1], title: 'Up and down: octaves', html: '<p>Y is about 512 in the middle. Push up (below 200) and <code>note * 2</code> doubles the frequency: one octave higher. Push down (above 823) and <code>note / 2</code> halves it: one octave lower.</p><p class="small muted">If up and down are backwards on your joystick, swap the * 2 and / 2 lines.</p>' },
      { lines: [ln(SYNTH, 'int x = analogRead'), ln(SYNTH, 'map(x, 0, 1023, -60, 60)')], title: 'Left and right: pitch bend', html: '<p><code>map</code> turns X (0–1023) into a number from −60 to +60, which is added to the note. Centre = no change, left = flatter, right = sharper. Real synths have a pitch-bend wheel that does exactly this.</p>' },
      { lines: [ln(SYNTH, 'if (note != playing)'), ln(SYNTH, 'Serial.println(note)') + 1], title: 'Play it (and print it)', html: '<p>The same “only change when it changes” trick as before, plus a line in the Serial Monitor every time the note changes.</p>' }
    ], { name: 'arcade_synth' });
    UI.html(b, '<h2>Play it on the Virtual UNO</h2><p>Run it. Hold a key on the breadboard, then drag the dot on the <b>joystick pad</b> (below the board) up, down, left and right. Press <b>Press joystick (SW)</b> for the laser.</p>');
    RL.Sim.create(b, { title: 'Arcade synth', code: SYNTH, name: 'arcade_synth', key: 'sim-synth', ctx: ctx, board: { parts: ALL, show: IDS_ALL, view: VIEW_ALL, vb: VBM }, buzzers: BUZZERS(), buttons: KEYBTNS(), joystick: { x: 0, y: 1, part: 'joy', sw: 2 }, runHint: 'hold a key and move the joystick.',
      checkAfter: 500,
      check: function (log, sim) {
        function tone() { return (sim.state() || {}).tone; }
        return new Promise(function (res) {
          var r = null, out = {}, idle = log.length;
          sim.setJoystick(512, 512);
          setTimeout(function () {
          if (log.slice(idle).some(function (e) { return e.dev === 'tone' && e.v > 0; })) { r = { pass: false, msg: 'Sounds play when nothing is pressed. If it’s the laser, pin 2 is floating: add pinMode(JOY_SW, INPUT_PULLUP). Otherwise check the keys use INPUT_PULLUP.' }; ctx.check('sim-synth-pass', 0); return res(r); }
          sim.press(3, true);
          setTimeout(function () { out.c = tone(); sim.setJoystick(512, 0);
            setTimeout(function () { out.up = tone(); sim.setJoystick(512, 1023);
              setTimeout(function () { out.down = tone(); sim.setJoystick(1023, 512);
                setTimeout(function () { out.bend = tone(); sim.setJoystick(512, 512); sim.press(3, false);
                  setTimeout(function () { out.off = tone(); var start = log.length; sim.press(2, true); setTimeout(function () { sim.press(2, false); }, 120);
                    setTimeout(function () {
                      var sweep = log.slice(start).filter(function (e) { return e.dev === 'tone' && e.v > 0; }).map(function (e) { return e.v; });
                      var near = function (a, b) { return Math.abs((a || 0) - b) <= 3; };
                      if (!near(out.c, 262)) r = { pass: false, msg: 'Holding the C key with the stick in the middle should play 262 Hz, not ' + (out.c || 0) + '. Check the keys and the bend line.' };
                      else if (!near(out.up, 524)) r = { pass: false, msg: 'Stick up should double the note (524 Hz), but it played ' + (out.up || 0) + '. Check the y < 200 part.' };
                      else if (!near(out.down, 131)) r = { pass: false, msg: 'Stick down should halve the note (131 Hz), but it played ' + (out.down || 0) + '. Check the y > 823 part.' };
                      else if (!near(out.bend, 322)) r = { pass: false, msg: 'Stick right should bend C up by 60 Hz (322 Hz), but it played ' + (out.bend || 0) + '. Check the map() line.' };
                      else if (out.off !== 0) r = { pass: false, msg: 'Letting go of the key should make it quiet.' };
                      else if (!(sweep.length > 10 && sweep[0] > 1500 && Math.min.apply(null, sweep) < 400)) r = { pass: false, msg: 'Clicking the joystick should play the laser sweep from 2000 Hz down. Check pinMode(JOY_SW, INPUT_PULLUP) and the laser() call.' };
                      else r = { pass: true, msg: 'C = 262 Hz, up = 524, down = 131, bend right = 322, and a laser sweep from ' + sweep[0] + ' Hz. Your synth works.' };
                      ctx.check('sim-synth-pass', r.pass ? 1 : 0); res(r);
                    }, 700);
                  }, 200);
                }, 220);
              }, 220);
            }, 220);
          }, 260);
          }, 400);
        });
      } });
    UI.html(b, '<h2>Upload it for real</h2><p>Upload, open the Serial Monitor at 9600 baud, and play. Watch the note numbers change as you bend.</p>');
    UI.html(b, '<div class="tests"><div class="trow"><div><b>Notes always play an octave high (or low)</b><br><span class="small muted">VRx and VRy are swapped, or the joystick isn’t powered so Y reads near 0. Check +5V and GND on the joystick.</span></div></div><div class="trow"><div><b>The pitch wobbles by itself</b><br><span class="small muted">That’s normal: the stick never rests at exactly 512. Bonus fix: ignore small bends with <code>if (abs(x - 512) &lt; 30) x = 512;</code></span></div></div><div class="trow"><div><b>Lasers fire on their own</b><br><span class="small muted">SW isn’t on pin 2, or <code>pinMode(JOY_SW, INPUT_PULLUP)</code> is missing, so pin 2 is floating.</span></div></div></div>');
  } });
  function joyXp(b) {
    var api = UI.explainer(b, { label: 'Explainer', title: 'Inside the joystick', w: 800, h: 340, interactive: true,
      extra: function (box) {
        var row = el('div', 'slider-row'); row.innerHTML = '<label>Try it</label><span class="small muted">Drag the stick. It springs back to the middle, like a real one.</span>';
        var sw = el('button', 'btn btn-small', 'Press the stick (SW)'); sw.type = 'button'; row.appendChild(sw); box.appendChild(row);
        sw.addEventListener('pointerdown', function () { if (api) api.state.sw = true; }); sw.addEventListener('pointerup', function () { if (api) api.state.sw = false; }); sw.addEventListener('pointerleave', function () { if (api) api.state.sw = false; });
      },
      init: function (svg, S, st) {
        bg(svg, 800, 340);
        var cx = 190, cy = 170;
        S('rect', { x: 50, y: 30, width: 280, height: 280, rx: 10, fill: '#16191e', stroke: '#3b4350', 'stroke-width': 2 }, svg);
        S('rect', { x: cx - 80, y: cy - 80, width: 160, height: 160, rx: 8, fill: '#2b3038' }, svg);
        // X pot along the bottom, Y pot along the right
        S('rect', { x: cx - 70, y: 286, width: 140, height: 12, rx: 3, fill: '#5b4a3a' }, svg); st.xw = S('path', { d: '', fill: CY }, svg);
        T(svg, cx, 280, 'X POT → VRx → A0', { 'text-anchor': 'middle', 'font-size': 9, fill: MUT, 'letter-spacing': '1' });
        S('rect', { x: 306, y: cy - 70, width: 12, height: 140, rx: 3, fill: '#5b4a3a' }, svg); st.yw = S('path', { d: '', fill: CY }, svg);
        T(svg, 300, cy - 84, 'Y POT', { 'text-anchor': 'end', 'font-size': 9, fill: MUT, 'letter-spacing': '1' });
        st.stick = S('line', { x1: cx, y1: cy, x2: cx, y2: cy, stroke: '#4b5563', 'stroke-width': 12, 'stroke-linecap': 'round' }, svg);
        st.knob = S('circle', { cx: cx, cy: cy, r: 34, fill: '#3b4350', stroke: '#6b7280', 'stroke-width': 3, style: 'cursor:grab' }, svg);
        T(svg, 190, 22, 'DRAG THE STICK', { 'text-anchor': 'middle', 'font-size': 10, fill: CY, 'letter-spacing': '2' });
        // readouts
        var RX = 400;
        function rowT(y, label) { T(svg, RX, y, label, LBL); return [T(svg, RX, y + 28, '', { 'font-size': 22, fill: INK, 'font-weight': 600 }), T(svg, RX + 120, y + 28, '', { 'font-size': 12, fill: MUT })]; }
        st.rx = rowT(40, 'X · analogRead(A0)'); st.ry = rowT(110, 'Y · analogRead(A1)'); st.rs = rowT(180, 'SW · digitalRead(2)');
        T(svg, RX, 262, 'IF YOU HOLD THE C KEY', LBL);
        st.syn = T(svg, RX, 292, '', { 'font-size': 18, fill: CY, 'font-weight': 600 }); st.syn2 = T(svg, RX, 316, '', { 'font-size': 12, fill: MUT });
        st.jx = 512; st.jy = 512; st.tx = 512; st.ty = 512; st.drag = false; st.sw = false; st.auto = null;
        function toVB(e) { var m = svg.getScreenCTM(); if (!m) return null; var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(m.inverse()); }
        function mv(e) { if (!st.drag) return; var p = toVB(e); if (!p) return; var dx = clamp(p.x - cx, -70, 70), dy = clamp(p.y - cy, -70, 70); st.tx = Math.round(512 + dx / 70 * 511.5); st.ty = Math.round(512 + dy / 70 * 511.5); }
        st.knob.addEventListener('pointerdown', function (e) { st.drag = true; st.auto = null; st.knob.setPointerCapture(e.pointerId); mv(e); e.preventDefault(); });
        st.knob.addEventListener('pointermove', mv);
        st.knob.addEventListener('pointerup', function () { st.drag = false; st.tx = 512; st.ty = 512; });
        loop(st, function (dt, t) {
          if (st.auto && !st.drag) { var a = st.auto(t); st.tx = a[0]; st.ty = a[1]; if (a[2] != null) st.autoSw = a[2]; } else st.autoSw = false;
          st.jx = ease(st.jx, st.tx, dt, 10); st.jy = ease(st.jy, st.ty, dt, 10);
          var x = clamp(Math.round(st.jx), 0, 1023), y = clamp(Math.round(st.jy), 0, 1023), sw = st.sw || st.autoSw;
          var kx = cx + (x - 512) / 512 * 70, ky = cy + (y - 512) / 512 * 70;
          st.knob.setAttribute('cx', kx); st.knob.setAttribute('cy', ky); st.knob.setAttribute('fill', sw ? CY : '#3b4350'); st.knob.setAttribute('r', sw ? 31 : 34);
          st.stick.setAttribute('x2', kx); st.stick.setAttribute('y2', ky);
          var wx = cx - 70 + x / 1023 * 140, wy = cy - 70 + y / 1023 * 140;
          st.xw.setAttribute('d', 'M' + wx + ' 300 l-7 10 h14 z'); st.yw.setAttribute('d', 'M304 ' + wy + ' l-10 -7 v14 z');
          st.rx[0].textContent = x; st.rx[1].textContent = (x * 5 / 1023).toFixed(2) + ' V · ' + (x < 200 ? 'left' : x > 823 ? 'right' : 'middle');
          st.ry[0].textContent = y; st.ry[1].textContent = (y * 5 / 1023).toFixed(2) + ' V · ' + (y < 200 ? 'up' : y > 823 ? 'down' : 'middle');
          st.rs[0].textContent = sw ? 'LOW' : 'HIGH'; st.rs[0].setAttribute('fill', sw ? CY : INK); st.rs[1].textContent = sw ? 'pressed (to GND)' : 'not pressed (pull-up)';
          if (sw) { st.syn.textContent = 'pew! (laser)'; st.syn2.textContent = '2000 Hz sweeping down to 200 Hz'; }
          else { var n = 262, how = []; if (y < 200) { n *= 2; how.push('× 2 (octave up)'); } if (y > 823) { n = Math.trunc(n / 2); how.push('÷ 2 (octave down)'); } var bend = amap(x, 0, 1023, -60, 60); n += bend; if (bend) how.push((bend > 0 ? '+ ' : '− ') + Math.abs(bend) + ' Hz bend'); st.syn.textContent = n + ' Hz  (' + noteName(n) + ')'; st.syn2.textContent = '262 ' + (how.join(', ') || '· no change'); }
        });
      },
      frames: [
        { cap: '<b>Two pots and a button.</b> The stick tilts two potentiometers at right angles: one for left–right (<b>X</b>) and one for up–down (<b>Y</b>). Each is a voltage divider, exactly like your Mission 02 knob, so <code>analogRead</code> gives 0–1023. In the middle both read about <b>512</b>.', draw: function (svg, S, st) { st.auto = function () { return [512, 512, false]; }; } },
        { cap: '<b>Left and right move the X pot:</b> about 0 all the way left, 1023 all the way right. Your synth uses this to bend the pitch.', draw: function (svg, S, st) { st.auto = function (t) { return [512 + 511 * Math.sin(t * 1.4), 512, false]; }; } },
        { cap: '<b>Up and down move the Y pot:</b> about 0 at the top, 1023 at the bottom. Your synth jumps an octave up or down when Y goes past 200 or 823.', draw: function (svg, S, st) { st.auto = function (t) { return [512, 512 - 511 * Math.sin(t * 1.4), false]; }; } },
        { cap: '<b>Press the stick down</b> and a small button underneath (<b>SW</b>) connects to GND. Use <code>INPUT_PULLUP</code>, just like your keys: pressed reads LOW.', draw: function (svg, S, st) { st.auto = function (t) { return [512, 512, Math.floor(t * 1.2) % 2 === 1]; }; } },
        { cap: '<b>Diagonals move both at once.</b> Circle the stick and both numbers change together. Now drag the stick yourself and watch what the synth would play.', draw: function (svg, S, st) { st.auto = function (t) { return [512 + 480 * Math.cos(t * 1.6), 512 + 480 * Math.sin(t * 1.6), false]; }; } }
      ] });
  }

  /* ---------- 08 controller case ---------- */
  steps.push({ id: 'case', title: 'Design & build the controller', stage: '03 Imagine · 05 Create', time: '20 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">A synth on a breadboard is hard to play. Arcade controllers put big buttons and a stick where your hands naturally go. Design a cardboard case that makes yours fun to play.</p>');
    UI.callout(b, 'safety', 'Safety', '<p>Cut away from your body on a cutting mat. Hot glue burns: hold pieces by the edges and keep glue off the joystick’s moving parts and the buttons’ tops. Unplug the USB cable while you move parts.</p>');
    caseXp(b);
    UI.callout(b, '', 'Spread the keys out first', '<p>The build guide packed the buttons 3 rows apart to fit the drawing. Your real breadboard is longer (63 rows), so move the buttons further apart — about <b>8 rows (2 cm)</b> — so big key caps fit. Move each button <b>together with</b> its pin wire and black jumper, keep the same columns, and the code doesn’t change.</p>');
    UI.callout(b, '', 'Design ideas', '<ul><li>Classic arcade: joystick on the left, keys in a row on the right.</li><li>Colour-code the keys and label them with their notes (C, D, E, G).</li><li>Add a label for each joystick direction: “octave up,” “bend,” “laser.”</li><li>Make the lid slope towards you so it’s comfortable to play.</li><li>Leave a gap for the USB cable, and sound holes above the passive buzzer.</li></ul>');
    UI.note(b, ctx, { id: 'n-design', label: 'Describe one design decision you made for your controller, and why.', placeholder: 'I put the joystick… because…' });
  } });
  function caseXp(b) {
    function base(svg) { clear(svg); bg(svg, 800, 380); }
    function lid(svg, x, y, w, h) { S('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: CB, stroke: CBD, 'stroke-width': 3 }, svg); }
    UI.explainer(b, { label: 'Build guide', title: 'A cardboard arcade controller', w: 800, h: 380, frames: [
      { cap: '<b>Step 1 · Plan the layout.</b> Use a shallow box (a shoebox lid or a box about 25 × 15 × 6 cm) that fits over your breadboard and UNO. Sketch where the joystick, the four keys and the sound holes will go. Put the keys right above where the buttons are on the breadboard.', draw: function (svg, S, st) {
        base(svg); lid(svg, 120, 60, 560, 260);
        S('rect', { x: 190, y: 140, width: 80, height: 80, rx: 6, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
        T(svg, 230, 245, 'JOYSTICK', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 11, 'letter-spacing': '1.5' });
        ['C', 'D', 'E', 'G'].forEach(function (n, i) { S('rect', { x: 340 + i * 70, y: 160, width: 50, height: 50, rx: 6, fill: 'none', stroke: '#3a2a16', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg); T(svg, 365 + i * 70, 192, n, { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 16 }); });
        for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) S('circle', { cx: 590 + c * 14, cy: 90 + r * 14, r: 3, fill: '#3a2a16' }, svg);
        T(svg, 610, 146, 'SOUND', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 10, 'letter-spacing': '1.5' });
        S('rect', { x: 120, y: 290, width: 40, height: 30, fill: NAVY }, svg); T(svg, 170, 344, '← gap for the USB cable', { fill: CY, 'font-size': 12 });
        S('line', { x1: 120, y1: 40, x2: 680, y2: 40, stroke: CY }, svg); T(svg, 400, 32, 'about 25 cm', { 'text-anchor': 'middle', fill: CY });
      } },
      { cap: '<b>Step 2 · Cut the holes.</b> A <b>3 cm</b> square for the joystick, a <b>1.5 cm</b> square above each button, and a few pencil holes above the passive buzzer so the sound gets out.', draw: function (svg, S, st) {
        base(svg); lid(svg, 120, 60, 560, 260);
        var holes = [[205, 155, 50, 50]].concat([0, 1, 2, 3].map(function (i) { return [352 + i * 70, 172, 26, 26]; }));
        holes.forEach(function (h, i) { st.later(function () { S('rect', { x: h[0], y: h[1], width: h[2], height: h[3], rx: 3, fill: '#1a1208', 'class': 'part-new' }, svg); S('circle', { cx: h[0] + h[2] / 2, cy: h[1] + h[3] / 2, r: h[2] / 2 + 10, 'class': 'ring' }, svg); }, 200 + i * 350); });
        st.later(function () { for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) S('circle', { cx: 590 + c * 14, cy: 90 + r * 14, r: 3.5, fill: '#1a1208', 'class': 'part-new' }, svg); }, 2100);
        T(svg, 230, 350, '3 cm square', { 'text-anchor': 'middle', fill: CY }); T(svg, 457, 350, '1.5 cm squares', { 'text-anchor': 'middle', fill: CY }); T(svg, 610, 350, 'pencil holes', { 'text-anchor': 'middle', fill: CY });
      } },
      { cap: '<b>Step 3 · Make the key caps.</b> Glue three or four small cardboard squares into a stack, then glue a bigger square (about 2.5 cm) on top. Set the stack on the button through the hole: when you press the cap, it presses the button. Test the height before gluing — the cap should sit just above the lid.', draw: function (svg, S, st) {
        base(svg);
        T(svg, 400, 36, 'SIDE VIEW (CUT THROUGH ONE KEY)', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        S('rect', { x: 160, y: 300, width: 480, height: 30, rx: 3, fill: '#d3dbe4' }, svg); T(svg, 400, 352, 'BREADBOARD', { 'text-anchor': 'middle', fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        S('rect', { x: 120, y: 170, width: 240, height: 14, fill: CB, stroke: CBD }, svg); S('rect', { x: 440, y: 170, width: 240, height: 14, fill: CB, stroke: CBD }, svg); T(svg, 160, 162, 'LID', { fill: MUT, 'font-size': 10, 'letter-spacing': '1.5' });
        S('rect', { x: 370, y: 282, width: 60, height: 18, rx: 2, fill: '#1c2129' }, svg);
        var cap = S('rect', { x: 389, y: 272, width: 22, height: 10, rx: 2, fill: '#2b3038', stroke: '#6b7280' }, svg);
        var g = S('g', {}, svg);
        for (var i = 0; i < 4; i++) S('rect', { x: 386, y: 196 + i * 18, width: 28, height: 16, fill: CBL, stroke: CBD }, g);
        S('rect', { x: 360, y: 150, width: 80, height: 44, rx: 4, fill: '#e5484d', stroke: '#9b2c2c', 'stroke-width': 2 }, g); T(g, 400, 179, 'C', { 'text-anchor': 'middle', fill: INK, 'font-size': 18, 'font-weight': 600 });
        T(svg, 448, 160, '← key cap', { fill: CY, 'font-size': 12 }); T(svg, 470, 250, '← cardboard stack', { fill: CY, 'font-size': 12 }); T(svg, 450, 296, '← button', { fill: CY, 'font-size': 12 });
        var dn = false; (function press() { dn = !dn; g.setAttribute('transform', dn ? 'translate(0 6)' : ''); cap.setAttribute('fill', dn ? CY : '#2b3038'); st.later(press, dn ? 400 : 900); })();
      } },
      { cap: '<b>Step 4 · Mount the joystick.</b> Put five female-to-male wires on its pins first. From underneath the lid, push the stick up through the square hole and hot-glue only the <b>corners of the circuit board</b> to the lid. Keep glue away from the stick so it can still move and click.', draw: function (svg, S, st) {
        base(svg);
        T(svg, 400, 36, 'UNDERNEATH THE LID', { 'text-anchor': 'middle', fill: MUT, 'font-size': 11, 'letter-spacing': '2' });
        lid(svg, 160, 60, 480, 280);
        S('rect', { x: 340, y: 140, width: 120, height: 120, rx: 6, fill: '#16191e', stroke: '#3b4350', 'stroke-width': 2, 'class': 'part-new' }, svg);
        S('rect', { x: 370, y: 170, width: 60, height: 60, rx: 4, fill: '#2b3038' }, svg); S('circle', { cx: 400, cy: 200, r: 18, fill: '#3b4350', stroke: '#6b7280', 'stroke-width': 2 }, svg);
        [[346, 146], [454, 146], [346, 254], [454, 254]].forEach(function (p, i) { st.later(function () { S('circle', { cx: p[0], cy: p[1], r: 9, fill: '#f4f7fb', opacity: 0.85, 'class': 'part-new' }, svg); }, 500 + i * 300); });
        T(svg, 640, 364, 'hot glue on the four corners only', { 'text-anchor': 'end', fill: CY, 'font-size': 12 });
        var cols = ['#30363f', '#e5484d', '#e5e7eb', '#9ca3af', '#f472b6'];
        cols.forEach(function (c, i) { S('path', { d: 'M340 ' + (176 + i * 12) + ' C 280 ' + (176 + i * 12) + ', 250 ' + (300 + i * 6) + ', 180 ' + (300 + i * 6), stroke: c, 'stroke-width': 4, fill: 'none' }, svg); });
        T(svg, 160, 364, 'wires → breadboard and UNO', { fill: MUT, 'font-size': 12 });
      } },
      { cap: '<b>Step 5 · Close it up and play.</b> Set the lid over the breadboard so every cap sits on its button. Test every key and every joystick direction again — moving parts loosens wires. Then decorate: labels, colours, a name for your synth.', draw: function (svg, S, st) {
        base(svg);
        S('path', { d: 'M110 270 L690 270 L650 150 L150 150 Z', fill: CBL, stroke: CBD, 'stroke-width': 2 }, svg);
        S('path', { d: 'M110 270 L690 270 L690 310 L110 310 Z', fill: CB, stroke: CBD, 'stroke-width': 2 }, svg);
        S('ellipse', { cx: 250, cy: 214, rx: 40, ry: 15, fill: '#1c2129' }, svg); S('line', { x1: 250, y1: 214, x2: 250, y2: 160, stroke: '#2b3038', 'stroke-width': 9, 'stroke-linecap': 'round' }, svg); S('circle', { cx: 250, cy: 156, r: 15, fill: '#e5484d' }, svg);
        var cols = ['#e5484d', '#facc15', '#22c55e', '#3b82f6'], keys = ['C', 'D', 'E', 'G'].map(function (n, i) { var x = 390 + i * 62; var r = S('rect', { x: x - 22, y: 196, width: 44, height: 30, rx: 4, fill: cols[i], stroke: '#1c2733', 'stroke-width': 1.5 }, svg); T(svg, x, 217, n, { 'text-anchor': 'middle', fill: '#1c2733', 'font-size': 14, 'font-weight': 600 }); return r; });
        var nt = S('g', {}, svg), k = 0;
        (function play() { var i = [0, 1, 2, 1, 0, 0, 0][k % 7]; keys.forEach(function (r, j) { r.setAttribute('transform', j === i ? 'translate(0 3)' : ''); }); var tx = T(nt, 420 + i * 62, 180, '♪', { 'font-size': 22, fill: CY, 'class': 'part-new' }); st.later(function () { tx.remove(); }, 900); k++; st.later(play, 450); })();
        T(svg, 400, 296, 'MY SYNTH', { 'text-anchor': 'middle', fill: '#3a2a16', 'font-size': 13, 'letter-spacing': '4' });
      } }
    ] });
  }

  /* ---------- 09 test & improve ---------- */
  steps.push({ id: 'test', title: 'Test & improve', stage: '06 Test · 07 Improve', time: '10 min', render: function (b, ctx) {
    UI.html(b, '<p class="lead">Hand your controller to someone who hasn’t used it. Run each test three times and mark it PASS or RETRY. Fix anything that fails, then test again.</p>');
    UI.tests(b, ctx, { id: 'tests', rows: [
      '<b>Keys:</b> each key plays its own note, and the sound stops the moment you let go.',
      '<b>Octaves:</b> stick up plays the same note higher, stick down plays it lower.',
      '<b>Bend:</b> moving the stick left and right while holding a key bends the pitch smoothly.',
      '<b>Laser:</b> clicking the stick plays the sound effect, and only when you click.',
      '<b>Playable:</b> a classmate can play the start of a simple tune without help.'
    ] });
    UI.html(b, '<h2>Improve it: pick at least one challenge</h2>');
    UI.challenges(b, [
      { tag: 'Code', cls: 'c', title: 'Record & replay', html: 'Hold the joystick button for a second to start recording, play up to 16 notes, then click again to hear your recording played back.', hint: 'Make two arrays, <code>int recNotes[16];</code> and <code>int recCount = 0;</code>. Every time a new note starts, store it with <code>recNotes[recCount] = note; recCount++;</code>. To replay, loop from 0 to <code>recCount</code> and use tone() with a delay.' },
      { tag: 'Code', title: 'Arpeggiator', html: 'Holding a key plays a fast rolling arpeggio instead of one note: the note, then 1.25 ×, then 1.5 × its frequency, over and over (that’s a major chord).', hint: 'Inside <code>if (note &gt; 0)</code>, play <code>note</code>, <code>note * 5 / 4</code> and <code>note * 3 / 2</code> with <code>delay(60)</code> between them.' },
      { tag: 'Code', title: 'Game sound kit', html: 'Write three more sound-effect functions — a coin pickup (two quick high notes going up), a power-up (a fast upward sweep) and game over (three falling notes) — and trigger them from the joystick directions with no key held.', hint: 'Coin: <code>tone(BUZZER, 988); delay(80); tone(BUZZER, 1319); delay(300); noTone(BUZZER);</code>' },
      { tag: 'Build + code', title: 'A fifth key', html: 'Add a fifth button for A (440 Hz) so you have the whole pentatonic scale C D E G A. Which pin is free? Remember to make both arrays longer.', hint: 'Pins 9–13 are free. Add the pin to <code>keys[]</code>, 440 to <code>notes[]</code>, and change every <code>4</code> in the for loops to <code>5</code>.' },
      { tag: 'Science', cls: 'c', title: 'Find the loudest note', html: 'Buzzers have a <b>resonant frequency</b> where they’re much louder. Write a sketch that sweeps from 200 Hz to 5000 Hz slowly and prints the frequency to the Serial Monitor. Where does it sound loudest?', hint: 'A for loop with <code>f = f + 20</code>, <code>tone(BUZZER, f)</code>, <code>Serial.println(f)</code> and <code>delay(30)</code>. Most small buzzers peak somewhere between 2000 and 4000 Hz.' }
    ]);
    UI.note(b, ctx, { id: 'n-improve', label: 'Which challenge did you try? What happened, and what did you change to make it work?', placeholder: 'I tried…' });
  } });

  /* Phone widths: the kit's one-column grids (.walk, .sim-body, .bg-body, .brief) use plain 1fr tracks, so a long code
   * line or a long tag would stretch the whole page sideways. Let this mission's grid items shrink instead. */
  function fit(b) {
    b.querySelectorAll('.walk > *, .sim-body > *, .bg-body > *, .brief > *, .two > *').forEach(function (e) { e.style.minWidth = '0'; });
    b.querySelectorAll('.brief-meta .tag').forEach(function (t) { t.style.whiteSpace = 'normal'; });
  }
  steps.forEach(function (s) { if (!s.render) return; var r = s.render; s.render = function (b, ctx) { r(b, ctx); fit(b); }; });

  /* ---------- 10 submit ---------- */
  steps.push({ id: 'submit', title: 'Hand in your evidence', submit: true });

  RL.guides.m03 = {
    steps: steps,
    evidence: {
      intro: 'Show your teacher your working arcade synth. Upload your photos, video and code, answer the four questions, then press Submit. You can update your submission until it’s graded.',
      files: [
        { id: 'photos', kind: 'photo', label: 'Photos of your build', help: 'At least one photo of your controller and one close-up of your breadboard wiring. Up to 4 photos.', required: true, max: 4 },
        { id: 'video', kind: 'video', label: 'A video of it working', help: 'Under 45 seconds: play a few notes on the keys, show the octave jump, the pitch bend and the laser, and play your composed melody.', required: true, max: 1 },
        { id: 'code', kind: 'code', label: 'Your code', help: 'Upload your synth .ino and your melody .ino (in the Arduino IDE: File → Save, then find the files) or paste the code.', required: true, max: 2, fileName: 'arcade_synth' }
      ],
      questions: [
        { id: 'r1', q: 'Explain what tone(8, 262) makes pin 8 do, and how that turns into a sound you can hear. Why does tone(8, 523) sound one octave higher?' },
        { id: 'r2', q: 'Why can the passive buzzer play a tune when the active buzzer can’t? Use the word oscillator.' },
        { id: 'r3', q: 'Your keys use INPUT_PULLUP. Why does a pressed key read LOW, and how is this different from the pull-down button in Mission 01?' },
        { id: 'r4', q: 'Explain how your melody code uses two arrays and a for loop. What does melody[i] mean when i is 3?' }
      ]
    }
  };
})(window);
