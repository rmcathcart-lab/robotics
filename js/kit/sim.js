/* RL.Sim — the Virtual UNO: a code editor plus a picture of the circuit that runs real Arduino sketches (the beginner
 * subset: variables, functions, if/else, for/while, arrays, pinMode, digitalWrite/Read, analogWrite/Read, delay, millis,
 * Serial, tone, map, random…). The sketch is checked like the Arduino compiler would (missing semicolons, capital letters,
 * braces) and then translated to JavaScript and run, so students can test ideas before touching hardware.
 *   RL.Sim.create(container, {
 *     title, code, name (for Download .ino), key (save edits under ctx.answer(key)), ctx,
 *     board: { parts, show, view },          the circuit drawing (RL.Board)
 *     leds: { 12: 'partId', 13: 'L' },       which LED each pin lights ('L' = the UNO's own LED on pin 13)
 *     buttons: { 2: { part: 'btn', wiring: 'pulldown' | 'pullup' } },
 *     analog: { 0: { label: 'Light sensor', value: 512 } },   sliders for analogRead
 *     check: function (log, sim) → { pass: bool, msg } (optional, run with the Check button) }) */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var TYPES = '(?:unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|long\\s+long|long\\s+int|int|long|float|double|bool|boolean|byte|char|word|String|short|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)';
  var API = ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'delayMicroseconds', 'millis', 'micros', 'tone', 'noTone',
    'map', 'constrain', 'random', 'randomSeed', 'abs', 'min', 'max', 'pow', 'sqrt', 'sq', 'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'DEC', 'HEX', 'BIN', 'int', 'float', 'long', 'byte', 'word', 'bitRead', 'bitWrite', 'pulseIn', '__t', '__y', 'PI'];
  var ASYNC_API = ['delay', 'delayMicroseconds', 'pulseIn'];
  var KNOWN = ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'delayMicroseconds', 'millis', 'micros', 'tone', 'noTone', 'map', 'constrain', 'random', 'Serial', 'println', 'print', 'begin', 'setup', 'loop', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN'];

  /* ---------- checking (like the Arduino compiler) ---------- */
  function mask(src) { // blank out comments and strings (keeping length and newlines) so checks/translation don't touch them
    var out = '', strs = [], i = 0;
    while (i < src.length) {
      var c = src[i], n = src[i + 1];
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') { out += ' '; i++; } continue; }
      if (c === '/' && n === '*') { var e = src.indexOf('*/', i + 2); e = e < 0 ? src.length : e + 2; for (; i < e; i++) out += src[i] === '\n' ? '\n' : ' '; continue; }
      if (c === '"' || c === "'") {
        var j = i + 1; while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        var lit = src.slice(i, Math.min(j + 1, src.length)); strs.push(lit);
        out += '\u0001' + (strs.length - 1) + '\u0001'; i = j + 1; continue;
      }
      out += c; i++;
    }
    return { text: out, strs: strs };
  }
  function check(src) {
    var errs = [], warns = [], m = mask(src), t = m.text, lines = t.split('\n');
    // braces / parentheses
    var depth = 0, par = 0, lastOpen = [];
    lines.forEach(function (ln, k) {
      for (var i = 0; i < ln.length; i++) {
        var c = ln[i];
        if (c === '{') { depth++; lastOpen.push(k + 1); } else if (c === '}') { depth--; lastOpen.pop(); if (depth < 0) { errs.push({ line: k + 1, msg: "There's an extra '}' here — it doesn't close anything." }); depth = 0; } }
        else if (c === '(') par++; else if (c === ')') par--;
      }
      if (par !== 0) { errs.push({ line: k + 1, msg: par > 0 ? "A '(' on this line is never closed with ')'." : "There's an extra ')' on this line." }); par = 0; }
    });
    if (depth > 0) errs.push({ line: lastOpen[lastOpen.length - 1] || lines.length, msg: "A '{' here is never closed. Every { needs a matching }." });
    // capital letters (case sensitivity)
    var lower = {}; KNOWN.forEach(function (w) { lower[w.toLowerCase()] = w; });
    lines.forEach(function (ln, k) {
      (ln.match(/[A-Za-z_]\w*/g) || []).forEach(function (w) { var right = lower[w.toLowerCase()]; if (right && right !== w) errs.push({ line: k + 1, msg: "'" + w + "' was not declared. Capital letters matter — did you mean " + right + '?' }); });
      if (/\bif\s*\([^=!<>]*[^=!<>]=[^=][^)]*\)/.test(ln)) warns.push({ line: k + 1, msg: 'This if uses a single = (which sets a value). To compare, use == .' });
    });
    // missing semicolons
    function nextCode(k) { for (var j = k + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim(); return ''; }
    lines.forEach(function (ln, k) {
      var s = ln.trim(); if (!s || s[0] === '#') return;
      if (/[{};,(\[:\\&|+\-*\/=<>?!]$/.test(s)) return;
      if (/^(if|for|while|switch)\b.*\)$/.test(s) || /^}?\s*else(\s+if\b.*\))?$/.test(s) || /^do$/.test(s)) return;
      if (/^(case\b.*|default)\s*:?$/.test(s)) return;
      if (/\)$/.test(s) && /^\{/.test(nextCode(k)) && /^[A-Za-z_][\w\s*&]*\s[A-Za-z_]\w*\s*\(/.test(s)) return; // function header with { on the next line
      if (/^[\.\?:]/.test(nextCode(k)) || /^(&&|\|\|)/.test(nextCode(k))) return; // statement continues on the next line
      errs.push({ line: k + 1, msg: "Missing ; at the end of this line. In Arduino code every instruction ends with a semicolon." });
    });
    if (!/\bvoid\s+setup\s*\(/.test(t)) errs.push({ line: 1, msg: 'Every sketch needs a void setup() function.' });
    if (!/\bvoid\s+loop\s*\(/.test(t)) errs.push({ line: 1, msg: 'Every sketch needs a void loop() function.' });
    // keep the first error per line
    var seen = {}; errs = errs.filter(function (e) { if (seen[e.line]) return false; seen[e.line] = 1; return true; }).sort(function (a, b) { return a.line - b.line; });
    return { errors: errs, warnings: warns };
  }

  /* ---------- translating to JavaScript (keeps every line on the same line number) ---------- */
  function translate(src) {
    var m = mask(src), t = m.text;
    t = t.replace(/^[ \t]*#include[^\n]*/gm, function (x) { return x.replace(/./g, ' '); });
    t = t.replace(/^[ \t]*#define[ \t]+(\w+)[ \t]+([^\n]+)/gm, 'const $1 = $2;');
    t = t.replace(new RegExp('\\(\\s*' + TYPES + '\\s*\\)', 'g'), ' ');                   // casts
    var fnames = [];
    t = t.replace(new RegExp('\\b(?:static\\s+|inline\\s+)*(?:void|' + TYPES + ')\\s+([A-Za-z_]\\w*)\\s*\\(([^()]*)\\)(?=\\s*\\{)', 'g'), function (all, name, params) {
      fnames.push(name);
      var ps = params.trim() === '' || params.trim() === 'void' ? '' : params.split(',').map(function (p) { return p.replace(/\[\s*\]/g, '').trim().split(/[\s&*]+/).pop(); }).join(', ');
      return 'async function ' + name + '(' + ps + ')';
    });
    // arrays with values: int notes[] = { … };  → let notes = [ … ];
    var arrRe = new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{', 'g'), mm;
    while ((mm = arrRe.exec(t))) {
      var start = mm.index, open = start + mm[0].length - 1, d = 0, k;
      for (k = open; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}') { d--; if (d === 0) break; } }
      var inner = t.slice(open + 1, k).replace(/\{/g, '[').replace(/\}/g, ']');
      var rep = 'let ' + mm[1] + ' = [' + inner + ']';
      t = t.slice(0, start) + rep + t.slice(k + 1); arrRe.lastIndex = start + rep.length;
    }
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*\\[\\s*([^\\]]+)\\]\\s*;', 'g'), 'let $1 = new Array($2).fill(0);');
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+|volatile\\s+)*' + TYPES + '(?=\\s+[A-Za-z_])', 'g'), 'let');
    // await the slow calls (delay…) and the sketch's own functions
    var awaitNames = ASYNC_API.concat(fnames);
    t = t.replace(/([A-Za-z_]\w*)(\s*\()/g, function (all, name, paren, off, str) {
      if (awaitNames.indexOf(name) < 0) return all;
      var before = str.slice(Math.max(0, off - 12), off);
      if (/function\s+$/.test(before) || /\.\s*$/.test(before)) return all;
      return '(await ' + name + ')' + paren; // (await f)( … ) would be wrong — handled below
    });
    t = t.replace(/\(await ([A-Za-z_]\w*)\)(\s*\()/g, 'await $1$2');
    // loop guards so a loop with no delay can't freeze the page
    t = t.replace(/\b(while|for)\s*\(/g, function (all) { return all; });
    var out = '', i = 0;
    while (i < t.length) {
      var r = /\b(while|for)\s*\(|\bdo\s*\{/g; r.lastIndex = i; var f = r.exec(t);
      if (!f) { out += t.slice(i); break; }
      if (f[0].indexOf('do') === 0) { out += t.slice(i, f.index + f[0].length) + ' if (__t()) await __y();'; i = f.index + f[0].length; continue; }
      var j = f.index + f[0].length, d2 = 1;
      while (j < t.length && d2 > 0) { if (t[j] === '(') d2++; else if (t[j] === ')') d2--; j++; }
      var after = /^\s*\{/.exec(t.slice(j));
      if (after) { out += t.slice(i, j + after[0].length) + ' if (__t()) await __y();'; i = j + after[0].length; }
      else { out += t.slice(i, j); i = j; }
    }
    t = out;
    t = t.replace(/\u0001(\d+)\u0001/g, function (a, n) { return m.strs[Number(n)]; });
    return { js: t, fnames: fnames };
  }

  /* ---------- the runtime ---------- */
  function Runtime(opts, hooks) {
    var R = this, mode = {}, val = {}, pressed = {}, warned = {}, log = [], t0 = 0, stopped = true, lastYield = 0, audio = null, osc = null;
    var PINS = { A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19 };
    function pinNo(p) { return typeof p === 'string' ? (PINS[p] != null ? PINS[p] : Number(p)) : Number(p); }
    function warn(key, msg) { if (warned[key]) return; warned[key] = 1; hooks.warn(msg); }
    function show(p) {
      var v = val[p] || 0, m = mode[p], lit;
      if (m === 'OUT') lit = v; else lit = v > 0 ? 0.1 : 0; // writing HIGH to an input pin turns on the weak pull-up: the LED barely glows
      hooks.led(p, lit);
    }
    var STOP = { stop: true };
    R.api = {
      HIGH: 1, LOW: 0, INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP', LED_BUILTIN: 13, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, DEC: 10, HEX: 16, BIN: 2, PI: Math.PI,
      pinMode: function (p, m) { p = pinNo(p); if (m === 'OUTPUT') mode[p] = 'OUT'; else if (m === 'INPUT_PULLUP') mode[p] = 'PU'; else if (m === 'INPUT') mode[p] = 'IN'; else warn('mode' + p, 'pinMode needs OUTPUT, INPUT or INPUT_PULLUP (in capitals).'); show(p); },
      digitalWrite: function (p, v) {
        p = pinNo(p); v = v ? 1 : 0;
        if (mode[p] !== 'OUT' && (opts.leds || {})[p]) warn('dw' + p, 'Pin ' + p + ' isn’t set as an OUTPUT, so the LED will barely glow. Add pinMode(' + p + ', OUTPUT); to setup().');
        val[p] = v; log.push({ t: R.millis(), pin: p, v: v }); show(p);
      },
      analogWrite: function (p, v) { p = pinNo(p); if ([3, 5, 6, 9, 10, 11].indexOf(p) < 0) warn('pwm' + p, 'Pin ' + p + ' can’t fade: only the pins marked ~ (3, 5, 6, 9, 10, 11) can use analogWrite.'); mode[p] = mode[p] || 'OUT'; v = Math.max(0, Math.min(255, Math.round(v))); val[p] = [3, 5, 6, 9, 10, 11].indexOf(p) < 0 ? (v >= 128 ? 1 : 0) : v / 255; log.push({ t: R.millis(), pin: p, v: v / 255 }); show(p); },
      digitalRead: function (p) {
        p = pinNo(p); var b = (opts.buttons || {})[p];
        if (mode[p] === 'OUT') return val[p] ? 1 : 0;
        if (b) { var down = !!pressed[p]; if (b.wiring === 'pullup') return down ? 0 : (mode[p] === 'PU' ? 1 : (Math.random() < 0.5 ? 1 : 0)); return down ? 1 : 0; }
        if (mode[p] === 'PU') return 1;
        warn('float' + p, 'Nothing is connected to pin ' + p + ', so digitalRead gives random HIGHs and LOWs (the pin is “floating”).');
        return Math.random() < 0.5 ? 1 : 0;
      },
      analogRead: function (p) { p = pinNo(p); var a = (opts.analog || {})[p - 14] || (opts.analog || {})[p]; return a ? Math.round(a.value) : Math.floor(Math.random() * 1024); },
      delay: function (ms) { ms = Math.max(0, Number(ms) || 0); return new Promise(function (res, rej) { var end = performance.now() + ms; (function tick() { if (stopped) return rej(STOP); var left = end - performance.now(); if (left <= 0) { lastYield = performance.now(); res(); } else setTimeout(tick, Math.min(left, 50)); })(); }); },
      delayMicroseconds: function (us) { return R.api.delay(us / 1000); },
      millis: function () { return R.millis(); }, micros: function () { return Math.floor(R.millis() * 1000); },
      tone: function (p, f, dur) {
        try { audio = audio || new (root.AudioContext || root.webkitAudioContext)(); if (osc) osc.stop(); osc = audio.createOscillator(); var g = audio.createGain(); g.gain.value = 0.05; osc.type = 'square'; osc.frequency.value = f; osc.connect(g); g.connect(audio.destination); osc.start(); if (dur) { var o = osc; setTimeout(function () { try { o.stop(); } catch (e) {} if (osc === o) osc = null; }, dur); } } catch (e) {}
        hooks.tone && hooks.tone(f);
      },
      noTone: function () { try { if (osc) osc.stop(); } catch (e) {} osc = null; hooks.tone && hooks.tone(0); },
      map: function (x, a, b, c, d) { return Math.trunc((x - a) * (d - c) / (b - a) + c); },
      constrain: function (x, a, b) { return Math.min(b, Math.max(a, x)); },
      random: function (a, b) { if (b === undefined) { b = a; a = 0; } return Math.floor(Math.random() * (b - a)) + a; },
      randomSeed: function () {}, abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt, sq: function (x) { return x * x; },
      int: function (x) { return Math.trunc(Number(x)); }, float: function (x) { return Number(x); }, long: function (x) { return Math.trunc(Number(x)); }, byte: function (x) { return Math.trunc(Number(x)) & 255; }, word: function (x) { return Math.trunc(Number(x)) & 65535; },
      bitRead: function (x, n) { return (x >> n) & 1; }, bitWrite: function (x, n, b) { return b ? x | (1 << n) : x & ~(1 << n); },
      pulseIn: function () { return Promise.resolve(0); },
      Serial: {
        begin: function () { R.serialOn = true; },
        print: function (x, base) { if (!R.serialOn) warn('ser', 'Serial.print needs Serial.begin(9600); in setup() first.'); hooks.serial(fmt(x, base)); },
        println: function (x, base) { if (!R.serialOn) warn('ser', 'Serial.println needs Serial.begin(9600); in setup() first.'); hooks.serial((x === undefined ? '' : fmt(x, base)) + '\n'); },
        available: function () { return 0; }, read: function () { return -1; }, parseInt: function () { return 0; }
      },
      __t: function () { return performance.now() - lastYield > 14; },
      __y: function () { return new Promise(function (res, rej) { setTimeout(function () { lastYield = performance.now(); if (stopped) rej(STOP); else res(); }, 0); }); }
    };
    function fmt(x, base) { if (typeof x === 'number') { if (base === 16) return x.toString(16).toUpperCase(); if (base === 2) return x.toString(2); if (!Number.isInteger(x)) return x.toFixed(base == null || base > 9 ? 2 : base); } return String(x); }
    R.millis = function () { return Math.floor(performance.now() - t0); };
    R.press = function (pin, on) { pressed[pin] = on; };
    R.log = log;
    R.running = function () { return !stopped; };
    R.stop = function () { stopped = true; R.api.noTone(); };
    R.run = function (fns) {
      stopped = false; t0 = performance.now(); lastYield = t0; R.serialOn = false;
      Object.keys(opts.leds || {}).forEach(function (p) { hooks.led(Number(p), 0); });
      hooks.led(13, 0);
      return Promise.resolve().then(function () { return fns.setup(); }).then(function loopy() {
        if (stopped) return;
        return Promise.resolve(fns.loop()).then(function () { if (R.api.__t()) return R.api.__y().then(loopy); return loopy(); });
      }).catch(function (e) { if (e === STOP) return; throw e; });
    };
    R.STOP = STOP;
  }

  function friendly(e, src) {
    var msg = String(e && e.message || e), line = null, mm = /<anonymous>:(\d+):\d+/.exec(String(e && e.stack || ''));
    if (mm) line = Number(mm[1]) - 2;
    var r;
    if ((r = /^(\w+) is not defined/.exec(msg))) msg = "'" + r[1] + "' was not declared. Check the spelling (capital letters matter) or declare it as a variable first.";
    else if ((r = /(\w+) is not a function/.exec(msg))) msg = "'" + r[1] + "' isn't a function the UNO knows. Check the spelling.";
    else if (/Unexpected token|Unexpected identifier|missing \) after|Invalid or unexpected/.test(msg)) msg = 'Something on this line isn’t valid Arduino code: ' + msg;
    var n = src.split('\n').length; if (line && (line < 1 || line > n)) line = null;
    return { line: line, msg: msg };
  }

  /* ---------- the editor + board widget ---------- */
  RL.Sim = {
    check: check, translate: translate,
    create: function (container, opts) {
      var el = RL.el, esc = RL.esc;
      var wrap = el('div', 'sim');
      wrap.innerHTML = '<div class="sim-h"><span class="label c">Virtual UNO</span><h3>' + esc(opts.title || 'Try the code') + '</h3></div>';
      var body = el('div', 'sim-body'); wrap.appendChild(body);
      var edBox = el('div', 'sim-ed'), out = el('div', 'sim-out'); body.appendChild(edBox); body.appendChild(out);
      var ed = el('div', 'ed'), inner = el('div', ''); inner.style.cssText = 'position:relative;min-width:100%;display:inline-block;min-height:100%';
      var gutter = el('div', 'ed-gutter'), pre = el('pre'), ta = el('textarea'), lnhl = el('div', 'lnhl hide');
      ta.spellcheck = false; ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off'); ta.setAttribute('aria-label', 'Code editor');
      inner.appendChild(lnhl); inner.appendChild(gutter); inner.appendChild(pre); inner.appendChild(ta); ed.appendChild(inner); edBox.appendChild(ed);
      var original = opts.code.replace(/\s+$/, '') + '\n';
      var saved = opts.key && opts.ctx ? opts.ctx.answer(opts.key) : '';
      ta.value = saved || original;
      var errLines = {};
      function paint() {
        var src = ta.value, lines = RL.Code.highlight(src);
        pre.innerHTML = lines.map(function (h) { return h || ' '; }).join('\n') + '\n';
        gutter.innerHTML = lines.map(function (_, i) { return errLines[i + 1] ? '<span class="err">●' + (i + 1) + '</span>' : String(i + 1); }).join('\n');
      }
      var saveT = null;
      ta.addEventListener('input', function () { errLines = {}; lnhl.classList.add('hide'); paint(); if (opts.key && opts.ctx) { clearTimeout(saveT); saveT = setTimeout(function () { opts.ctx.answer(opts.key, ta.value === original ? '' : ta.value); }, 600); } });
      ta.addEventListener('keydown', function (e) {
        var v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
        if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', a, b, 'end'); ta.dispatchEvent(new Event('input')); }
        else if (e.key === 'Enter') {
          var ls = v.lastIndexOf('\n', a - 1) + 1, cur = v.slice(ls, a), ind = /^\s*/.exec(cur)[0]; if (/\{\s*$/.test(cur)) ind += '  ';
          e.preventDefault(); ta.setRangeText('\n' + ind, a, b, 'end'); ta.dispatchEvent(new Event('input'));
        } else if (e.key === '}') {
          var ls2 = v.lastIndexOf('\n', a - 1) + 1, cur2 = v.slice(ls2, a);
          if (/^\s+$/.test(cur2) && a === b) { e.preventDefault(); ta.setRangeText(cur2.slice(0, Math.max(0, cur2.length - 2)) + '}', ls2, a, 'end'); ta.dispatchEvent(new Event('input')); }
        }
      });
      paint();
      // board
      var boardBox = el('div', 'sim-board'); out.appendChild(boardBox);
      var B = RL.Board.render({ parts: opts.board.parts, show: opts.board.show, view: opts.board.view, hover: false, label: 'Virtual circuit' });
      boardBox.appendChild(B.svg);
      var ctl = el('div', 'sim-ctl');
      var run = el('button', 'btn btn-primary btn-small', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l12 8-12 8z" fill="currentColor" stroke="none"/></svg>Upload &amp; run'); run.type = 'button';
      var stop = el('button', 'btn btn-ghost btn-small', 'Stop'); stop.type = 'button'; stop.disabled = true;
      var reset = el('button', 'btn btn-ghost btn-small', 'Reset code'); reset.type = 'button';
      var dl = el('button', 'btn btn-ghost btn-small', 'Download .ino'); dl.type = 'button';
      ctl.appendChild(run); ctl.appendChild(stop); ctl.appendChild(reset); ctl.appendChild(dl);
      var chk = null; if (opts.check) { chk = el('button', 'btn btn-ghost btn-small', 'Check my code'); chk.type = 'button'; ctl.appendChild(chk); }
      out.appendChild(ctl);
      var msg = el('div', 'sim-msg'); out.appendChild(msg);
      var serial = el('div', 'sim-serial'); out.appendChild(serial);
      // analog sliders
      Object.keys(opts.analog || {}).forEach(function (k) {
        var a = opts.analog[k], row = el('div', 'slider-row'); row.innerHTML = '<label>A' + k + ' · ' + esc(a.label) + '</label>';
        var r = el('input'); r.type = 'range'; r.min = 0; r.max = 1023; r.value = a.value; var o = el('b', '', String(a.value));
        r.addEventListener('input', function () { a.value = Number(r.value); o.textContent = r.value; }); row.appendChild(r); row.appendChild(o); out.insertBefore(row, msg);
      });
      container.appendChild(wrap);
      var rt = null;
      function hooks() {
        return {
          led: function (pin, v) { var id = (opts.leds || {})[pin]; if (pin === 13) B.setLit('L', v); if (id && id !== 'L') B.setLit(id, v); },
          serial: function (s) { serial.textContent += s; if (serial.textContent.length > 6000) serial.textContent = serial.textContent.slice(-4000); serial.scrollTop = serial.scrollHeight; },
          warn: function (w) { show('warn', w); }
        };
      }
      function show(kind, html, line) {
        if (kind === 'clear') { msg.className = 'sim-msg'; msg.innerHTML = ''; lnhl.classList.add('hide'); return; }
        if (kind === 'warn') { if (msg.classList.contains('err')) return; msg.className = 'sim-msg'; msg.innerHTML = '<b style="color:var(--signal)">Heads up:</b> ' + esc(html); return; }
        msg.className = 'sim-msg ' + kind; msg.innerHTML = html;
        if (line) { lnhl.style.top = (12 + (line - 1) * 22) + 'px'; lnhl.classList.remove('hide'); }
      }
      function stopRun() { if (rt) rt.stop(); run.disabled = false; stop.disabled = true; }
      function start() {
        stopRun(); show('clear'); serial.textContent = '';
        var src = ta.value, c = check(src);
        errLines = {}; c.errors.forEach(function (e) { errLines[e.line] = 1; }); paint();
        if (c.errors.length) {
          var e0 = c.errors[0];
          show('err', '<b>Compile error · line ' + e0.line + '</b><br>' + esc(e0.msg) + (c.errors.length > 1 ? '<br><span class="muted small">(' + (c.errors.length - 1) + ' more problem' + (c.errors.length > 2 ? 's' : '') + ' marked in the editor)</span>' : ''), e0.line);
          return;
        }
        var js = translate(src).js, fns;
        try {
          var AF = Object.getPrototypeOf(async function () {}).constructor;
          var fn = new AF(API.join(','), js + '\n;return { setup: typeof setup === "function" ? setup : null, loop: typeof loop === "function" ? loop : null };');
          rt = new Runtime(opts, hooks());
          var args = API.map(function (n) { return rt.api[n]; });
          fn.apply(null, args).then(function (f) {
            fns = f; if (!fns.setup || !fns.loop) throw new Error('setup() and loop() are both needed');
            run.disabled = true; stop.disabled = false;
            show('ok', '<b>Uploaded.</b> Your sketch is running' + (opts.buttons ? ' — press the button on the breadboard.' : '.'));
            if (c.warnings.length) show('warn', 'Line ' + c.warnings[0].line + ': ' + c.warnings[0].msg);
            return rt.run(fns);
          }).catch(function (e) { stopRun(); var f = friendly(e, src); show('err', '<b>Error' + (f.line ? ' · line ' + f.line : '') + '</b><br>' + esc(f.msg), f.line); });
        } catch (e) { var f = friendly(e, src); show('err', '<b>Compile error</b><br>' + esc(f.msg)); }
      }
      run.addEventListener('click', start);
      stop.addEventListener('click', function () { stopRun(); show('clear'); Object.keys(opts.leds || {}).forEach(function (p) { hooks().led(Number(p), 0); }); });
      reset.addEventListener('click', function () { if (ta.value !== original && !confirmReset()) return; ta.value = original; ta.dispatchEvent(new Event('input')); });
      function confirmReset() { return root.confirm ? root.confirm('Put the original code back? Your changes will be lost.') : true; }
      dl.addEventListener('click', function () { RL.Code.download(opts.name || 'sketch', ta.value); });
      if (chk) chk.addEventListener('click', function () {
        if (!rt || !rt.running()) { start(); setTimeout(doCheck, opts.checkAfter || 6000); show('ok', '<b>Checking…</b> running your sketch for a few seconds.'); } else doCheck();
        function doCheck() { if (!rt) return; var r = opts.check(rt.log, { press: pressBtn, runtime: rt }); if (r && r.then) r.then(fin); else fin(r); }
        function fin(r) { if (!r) return; show(r.pass ? 'ok' : 'err', '<b>' + (r.pass ? 'PASS' : 'RETRY') + '</b> · ' + r.msg); if (r.pass && opts.onPass) opts.onPass(); }
      });
      // buttons on the board
      function pressBtn(pin, on) { if (rt) rt.press(pin, on); var b = (opts.buttons || {})[pin]; if (b) B.press(b.part, on); }
      Object.keys(opts.buttons || {}).forEach(function (pin) {
        var b = opts.buttons[pin], g = B.parts[b.part]; if (!g) return;
        g.classList.add('sim-btn'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Push button on pin ' + pin);
        var down = function (e) { e.preventDefault(); pressBtn(Number(pin), true); }, up = function () { pressBtn(Number(pin), false); };
        g.addEventListener('pointerdown', down); g.addEventListener('pointerup', up); g.addEventListener('pointerleave', up); g.addEventListener('pointercancel', up);
        g.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressBtn(Number(pin), true); } });
        g.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') pressBtn(Number(pin), false); });
      });
      if (RL.onLeave) RL.onLeave(stopRun);
      return { board: B, run: start, stop: stopRun, editor: ta };
    }
  };
})(window);
