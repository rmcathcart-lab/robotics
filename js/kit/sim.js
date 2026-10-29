/* RL.Sim — the Virtual UNO: a code editor plus a picture of the circuit that runs real Arduino sketches.
 * The sketch is checked like the Arduino compiler would (missing semicolons, capital letters, braces, missing #include),
 * translated to JavaScript (every line keeps its line number) and run against a model of the circuit.
 *
 *   RL.Sim.create(container, {
 *     title, code, name (Download .ino file name), key (save edits under ctx.answer(key)), ctx,
 *     board: { parts, show, view, vb },                  the circuit drawing (RL.Board)
 *     leds:     { 12: 'partId', 13: 'L' },               an LED on each pin ('L' = the UNO's own LED on pin 13)
 *     buttons:  { 2: { part, wiring: 'pulldown'|'pullup', toggle, label } }   click the part (toggle: tilt switches)
 *     analog:   { 0: { label, value, part } }            sliders for analogRead(A0…); part._setValue follows the slider
 *     rgb:      { part, r: 9, g: 10, b: 11, anode: false }
 *     buzzers:  { 8: { part, type: 'active'|'passive' } }
 *     servos:   { 9: 'partId' }                          Servo library
 *     lcd:      'partId'                                 LiquidCrystal library
 *     dht:      { pin: 2, temp: 22, hum: 40 }            DHT library (sliders)
 *     sonar:    { trig: 12, echo: 11, part, cm: 40 }     pulseIn on the echo pin (distance slider)
 *     joystick: { x: 0, y: 1, part, sw }                 a drag pad sets A<x>/A<y>; sw = the SW pin (adds a “Press joystick” button)
 *     ir:       { pin: 11, part }                        IRremote library (an on-screen remote)
 *     stepper:  'partId'                                 Stepper library
 *     motor:    { en: 5, in1: 3, in2: 4, part, relay }   DC motor through an L293D (relay: a pin that must be HIGH)
 *     relays:   { 7: 'partId' }
 *     shift:    { data, clock, latch, leds: [Q0…Q7 part ids] | seg: 'partId' }   74HC595 + shiftOut()
 *     seg4:     { part, digits: [D1, D2, D3, D4 pins] }  4-digit display; segments come from `shift` (or segPins)
 *     serialInput: true                                  a box to type into the Serial Monitor
 *     check: function (log, sim) → { pass, msg } | Promise   (the Check my code button), checkAfter (ms) })
 * log entries: { t, pin, v } for pin writes, and { t, dev: 'servo'|'lcd'|'tone'|'motor'|'stepper'|'shift'|'rgb', v }. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var TYPES = '(?:unsigned\\s+long|unsigned\\s+int|unsigned\\s+char|long\\s+long|long\\s+int|int|long|float|double|bool|boolean|byte|char|word|String|short|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t)';
  var CLASSES = ['Servo', 'LiquidCrystal', 'Stepper', 'DHT', 'IRrecv', 'decode_results'];
  var LIBS = { Servo: 'Servo.h', LiquidCrystal: 'LiquidCrystal.h', Stepper: 'Stepper.h', DHT: 'DHT.h', IRrecv: 'IRremote', IrReceiver: 'IRremote' };
  var API = ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'delayMicroseconds', 'millis', 'micros', 'tone', 'noTone',
    'map', 'constrain', 'random', 'randomSeed', 'abs', 'min', 'max', 'pow', 'sqrt', 'sq', 'log', 'log10', 'exp', 'sin', 'cos', 'tan', 'floor', 'ceil', 'round', 'isnan',
    'Serial', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'DEC', 'HEX', 'BIN', 'MSBFIRST', 'LSBFIRST',
    'int', 'float', 'long', 'byte', 'word', 'bitRead', 'bitWrite', 'bitSet', 'bitClear', 'pulseIn', 'shiftOut', 'F', 'PI', 'true', 'false',
    'Servo', 'LiquidCrystal', 'Stepper', 'DHT', 'DHT11', 'DHT22', 'IRrecv', 'decode_results', 'IrReceiver', 'ENABLE_LED_FEEDBACK', 'DISABLE_LED_FEEDBACK', '__t', '__y', '__idiv', '__int', '__F', '__u8'];
  API = API.filter(function (n) { return n !== 'true' && n !== 'false'; });
  var ASYNC_API = ['delay', 'delayMicroseconds', 'pulseIn'];
  var KNOWN = ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'delayMicroseconds', 'millis', 'micros', 'tone', 'noTone', 'map', 'constrain', 'random', 'Serial', 'println', 'print', 'begin', 'setup', 'loop', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'shiftOut', 'pulseIn', 'MSBFIRST', 'LSBFIRST', 'setCursor'];
  /* the ELEGOO remote: label, IRremote 4 command code */
  var REMOTE = [['POWER', 0x45], ['VOL+', 0x46], ['FUNC/STOP', 0x47], ['|◀◀', 0x44], ['▶||', 0x40], ['▶▶|', 0x43], ['▼', 0x07], ['VOL−', 0x15], ['▲', 0x09], ['0', 0x16], ['EQ', 0x19], ['ST/REPT', 0x0D],
    ['1', 0x0C], ['2', 0x18], ['3', 0x5E], ['4', 0x08], ['5', 0x1C], ['6', 0x5A], ['7', 0x42], ['8', 0x52], ['9', 0x4A]];
  RL.REMOTE = REMOTE;
  function rev8(b) { var r = 0; for (var i = 0; i < 8; i++) { r = (r << 1) | (b & 1); b >>= 1; } return r; }
  function necCode(cmd) { return (0xFF0000 | (rev8(cmd) << 8) | rev8(~cmd & 255)) >>> 0; }

  /* ---------- checking (like the Arduino compiler) ---------- */
  function mask(src) { // blank out comments and replace strings with placeholders (newlines kept) so checks/translation don't touch them
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
    var lower = {}; KNOWN.forEach(function (w) { lower[w.toLowerCase()] = w; });
    lines.forEach(function (ln, k) {
      if (/^\s*#/.test(ln)) return;
      (ln.match(/[A-Za-z_]\w*/g) || []).forEach(function (w) { var right = lower[w.toLowerCase()]; if (right && right !== w) errs.push({ line: k + 1, msg: "'" + w + "' was not declared. Capital letters matter — did you mean " + right + '?' }); });
      if (/\bif\s*\([^=!<>]*[^=!<>]=[^=][^)]*\)/.test(ln)) warns.push({ line: k + 1, msg: 'This if uses a single = (which sets a value). To compare, use == .' });
    });
    function nextCode(k) { for (var j = k + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim(); return ''; }
    var initLine = {}; (function () { var dd = 0, stack = [], ln = 0; for (var q = 0; q < t.length; q++) { var ch = t[q]; if (ch === '\n') { ln++; if (stack.length && stack[stack.length - 1]) initLine[ln] = 1; continue; } if (ch === '{') { var before = t.slice(Math.max(0, q - 40), q).replace(/\s+$/, ''); stack.push(/=$/.test(before) || (stack.length && stack[stack.length - 1] && /[{,]$/.test(before))); } else if (ch === '}') stack.pop(); } })();
    lines.forEach(function (ln, k) {
      var s = ln.trim(); if (!s || s[0] === '#') return;
      if (initLine[k] && !/;\s*$/.test(s) && !/^}/.test(s)) return; // inside an array's { … } list
      if (/[{};,(\[:\\&|+\-*\/=<>?!]$/.test(s)) return;
      if (/^(if|for|while|switch)\b.*\)$/.test(s) || /^}?\s*else(\s+if\b.*\))?$/.test(s) || /^do$/.test(s)) return;
      if (/^(case\b.*|default)\s*:?$/.test(s)) return;
      if (/\)$/.test(s) && /^\{/.test(nextCode(k)) && /^[A-Za-z_][\w\s*&]*\s[A-Za-z_]\w*\s*\(/.test(s)) return;
      if (/^[\.\?:,]/.test(nextCode(k)) || /^(&&|\|\||\+|-|\*|\/)/.test(nextCode(k))) return;
      errs.push({ line: k + 1, msg: "Missing ; at the end of this line. In Arduino code every instruction ends with a semicolon." });
    });
    // libraries need their #include
    var incs = (src.match(/#include\s*[<"][^>"]+[>"]/g) || []).join(' ');
    Object.keys(LIBS).forEach(function (cls) {
      var re = new RegExp('\\b' + cls + '\\b'), lk = lines.findIndex(function (l) { return !/^\s*#/.test(l) && re.test(l); });
      if (lk >= 0 && incs.indexOf(LIBS[cls]) < 0) errs.push({ line: lk + 1, msg: "'" + cls + "' needs its library: add #include <" + (LIBS[cls] === 'IRremote' ? 'IRremote.hpp' : LIBS[cls]) + '> at the top of the sketch.' });
    });
    if (!/\bvoid\s+setup\s*\(/.test(t)) errs.push({ line: 1, msg: 'Every sketch needs a void setup() function.' });
    if (!/\bvoid\s+loop\s*\(/.test(t)) errs.push({ line: 1, msg: 'Every sketch needs a void loop() function.' });
    var seen = {}; errs = errs.filter(function (e) { if (seen[e.line]) return false; seen[e.line] = 1; return true; }).sort(function (a, b) { return a.line - b.line; });
    return { errors: errs, warnings: warns };
  }

  /* ---------- translating to JavaScript ---------- */
  function translate(src) {
    var m = mask(src), t = m.text;
    t = t.replace(/^[ \t]*#include[^\n]*/gm, function (x) { return x.replace(/./g, ' '); });
    t = t.replace(/^[ \t]*#define[ \t]+(\w+)[ \t]+([^\n]+)/gm, 'const $1 = $2;');
    t = t.replace(/^[ \t]*#(if|ifdef|ifndef|endif|else|pragma)[^\n]*/gm, function (x) { return x.replace(/./g, ' '); });
    t = t.replace(/\bB([01]{1,8})\b/g, '0b$1');
    t = t.replace(/\b(?:const\s+)?char\s*\*\s*(?:const\s+)?(?=[A-Za-z_])/g, 'String ');           // char* text → String
    t = t.replace(/\(\s*char\s*\)\s*(\d+|[A-Za-z_]\w*|\([^()]*\))/g, 'String.fromCharCode($1)'); // (char)223                                                 // B00101100 binary literals
    t = t.replace(new RegExp('\\(\\s*' + TYPES + '\\s*\\)', 'g'), ' ');                        // casts
    t = t.replace(/([(,]\s*)&(?=[A-Za-z_])/g, '$1');                                          // &results → results
    t = t.replace(/\.length\s*\(\s*\)/g, '.length');
    // library objects: Servo arm;  LiquidCrystal lcd(7, 8, 9, 10, 11, 12);
    var objs = ['IrReceiver'];
    t = t.replace(new RegExp('\\b(' + CLASSES.join('|') + ')\\s+([A-Za-z_]\\w*)\\s*(?:\\(([^;]*)\\))?\\s*;', 'g'), function (all, cls, name, args) { objs.push(name); return 'let ' + name + ' = new ' + cls + '(' + (args || '') + ');'; });
    // which names hold whole numbers (Arduino does integer maths with these: 7 / 2 = 3)
    var INTT = /^(?:unsigned\s+long|unsigned\s+int|unsigned\s+char|long\s+long|long\s+int|int|long|byte|word|short|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|char)$/;
    var ints = {}, floats = {}, bytes = {};
    function topSplit(str) { var parts = [], d = 0, cur = ''; for (var q = 0; q < str.length; q++) { var ch = str[q]; if ('([{'.indexOf(ch) >= 0) d++; else if (')]}'.indexOf(ch) >= 0) d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; }
    t.replace(new RegExp('\\b(?:const\\s+|static\\s+|volatile\\s+)*(' + TYPES + ')\\s+([^;{}]+);', 'g'), function (all, ty, list) { topSplit(list).forEach(function (d) { var nm = /^\s*([A-Za-z_]\w*)/.exec(d); if (!nm) return; if (/^(?:byte|uint8_t|unsigned\s+char)$/.test(ty.trim()) && !/\[/.test(d)) bytes[nm[1]] = 1; if (INTT.test(ty.trim())) ints[nm[1]] = 1; else if (/float|double/.test(ty)) floats[nm[1]] = 1; }); return all; });
    t.replace(new RegExp('[(,]\\s*(' + TYPES + ')\\s+([A-Za-z_]\\w*)\\s*(?=[,)])', 'g'), function (all, ty, nm) { if (INTT.test(ty.trim())) ints[nm] = 1; else if (/float|double/.test(ty)) floats[nm] = 1; return all; });
    Object.keys(floats).forEach(function (k) { delete ints[k]; });
    var fnames = [];
    t = t.replace(new RegExp('\\b(?:static\\s+|inline\\s+)*(?:void|' + TYPES + ')\\s+([A-Za-z_]\\w*)\\s*\\(([^()]*)\\)(?=\\s*\\{)', 'g'), function (all, name, params) {
      fnames.push(name);
      var ps = params.trim() === '' || params.trim() === 'void' ? '' : params.split(',').map(function (p) { return p.replace(/\[\s*\]/g, '').trim().split(/[\s&*]+/).pop(); }).join(', ');
      return 'async function ' + name + '(' + ps + ')';
    });
    // char text[] = "hello";
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*(?:\\[[^\\]]*\\])+\\s*=\\s*(\\u0001\\d+\\u0001)', 'g'), 'let $1 = $2');
    // arrays with values (also 2-D): int notes[] = { … };  → let notes = [ … ];
    var arrRe = new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*(?:\\[[^\\]]*\\])+\\s*=\\s*\\{', 'g'), mm;
    while ((mm = arrRe.exec(t))) {
      var start = mm.index, open = start + mm[0].length - 1, d = 0, k;
      for (k = open; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}') { d--; if (d === 0) break; } }
      var inner = t.slice(open + 1, k).replace(/\{/g, '[').replace(/\}/g, ']');
      var rep = 'let ' + mm[1] + ' = [' + inner + ']';
      t = t.slice(0, start) + rep + t.slice(k + 1); arrRe.lastIndex = start + rep.length;
    }
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*\\[\\s*([^\\]]+)\\]\\s*\\[\\s*([^\\]]+)\\]\\s*;', 'g'), 'let $1 = Array.from({ length: $2 }, function () { return new Array($3).fill(0); });');
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+)*' + TYPES + '\\s+([A-Za-z_]\\w*)\\s*\\[\\s*([^\\]]+)\\]\\s*;', 'g'), 'let $1 = new Array($2).fill(0);');
    t = t.replace(new RegExp('\\b(?:const\\s+|static\\s+|volatile\\s+)*' + TYPES + '(?=\\s+[A-Za-z_])', 'g'), 'let');
    // integer division and assignments to whole-number variables
    var INTCALL = 'millis|micros|analogRead|digitalRead|pulseIn|random|map|constrain|abs';
    var term = '(?:(?:' + INTCALL + ')\\s*\\([^()]*\\)|[A-Za-z_]\\w*(?:\\[[^\\]]+\\])?|\\d+(?:\\.\\d+)?[fFlLuU]*|\\([^()]*\\))';
    var chainRe = new RegExp(term + '(?:\\s*[*\\/%]\\s*' + term + ')+', 'g'), termRe = new RegExp('^\\s*(' + term + ')\\s*([*\\/%]?)');
    function isInt(x) {
      x = x.trim(); if (/^\d+[lLuU]*$/.test(x)) return true; if (/^\d/.test(x)) return false;
      if (new RegExp('^(?:' + INTCALL + ')\\s*\\(').test(x)) return true;
      if (/^__idiv\(/.test(x)) return true;
      if (x[0] === '(') { var inside = x.slice(1, -1).replace(/__idiv\([^()]*\)/g, '0'); if (/\//.test(inside) || /\d\.\d/.test(inside)) return false; var parts = inside.split(/[+\-*%]/).filter(function (q) { return q.trim(); }); return parts.length > 0 && parts.every(function (q) { return isInt(q); }); }
      var nm = /^([A-Za-z_]\w*)/.exec(x); return !!(nm && ints[nm[1]] && !/\(/.test(x.slice(nm[1].length).replace(/^\[[^\]]*\]/, '')));
    }
    function divFix(src) { return src.replace(chainRe, function (all, off, str) {
      if (str[off - 1] === '.' || /[\w.]$/.test(str.slice(0, off))) return all; // part of a member access / name
      if (all.indexOf('/') < 0) return all;
      var rest = all, toks = [], m2, changed = false;
      while (rest.length && (m2 = termRe.exec(rest))) { toks.push(m2[1]); if (m2[2]) toks.push(m2[2]); rest = rest.slice(m2[0].length); }
      if (rest.trim()) return all;
      for (var g = 0; g < toks.length; g += 2) if (toks[g][0] === '(' && toks[g].indexOf('/') >= 0) { var fx = '(' + divFix(toks[g].slice(1, -1)) + ')'; if (fx !== toks[g]) { toks[g] = fx; changed = true; } } // (n / 10) % 10
      var acc = toks[0], accInt = isInt(toks[0]);
      for (var q = 1; q < toks.length; q += 2) {
        var op = toks[q], tk = toks[q + 1], ti = isInt(tk);
        if (op === '/' && accInt && ti) { acc = '__idiv(' + acc + ', ' + tk + ')'; changed = true; }
        else { acc = acc + ' ' + op + ' ' + tk; accInt = accInt && ti && op !== '/'; }
      }
      return changed ? acc : all;
    }); }
    t = divFix(t);
    t = t.replace(/(^|[;{})]\s*|\n\s*|\belse\s+)(bitSet|bitClear|bitWrite)\s*\(\s*([A-Za-z_]\w*(?:\[[^\]]+\])?)\s*,/g, '$1$3 = $2($3,');
    var names = Object.keys(ints);
    if (names.length) t = t.replace(new RegExp('(^|[^.\\w])(' + names.join('|') + ')(\\s*=\\s*)(?!=)([^;\\n]+);', 'g'), function (all, pre, name, eq, expr) { if (topSplit(expr).length > 1) return all; if (/^\s*(\d+|[A-Za-z_]\w*|\u0001\d+\u0001|true|false|HIGH|LOW)\s*$/.test(expr) || /^\s*\[/.test(expr) || /new /.test(expr)) return all; return pre + name + eq + (bytes[name] ? '__u8(' : '__int(') + expr + ');'; });
    // print(float) shows 2 decimals on a real UNO even when the value is whole (5.0 → "5.00"): mark float arguments.
    (function () {
      var fl = Object.keys(floats), flRe = fl.length ? new RegExp('(^|[^.\\w])(' + fl.join('|') + ')(?![\\w(])') : null, out = '', k = 0, m, re = /\.(print|println)\s*\(/g;
      while ((m = re.exec(t))) {
        var st = m.index + m[0].length, d = 1, q = st; for (; q < t.length && d; q++) { if (t[q] === '(') d++; else if (t[q] === ')') d--; }
        var inner = t.slice(st, q - 1), args = topSplit(inner), a0 = args[0];
        if (a0.trim() && (/(^|[^\w.])\d+\.\d*|(^|[^\w])\.\d+/.test(a0) || (flRe && flRe.test(a0))) && !/\u0001/.test(a0)) {
          out += t.slice(k, st) + '__F(' + a0 + ')' + (args.length > 1 ? ',' + args.slice(1).join(',') : ''); k = q - 1;
        }
      }
      t = out + t.slice(k);
    })();
    // await the slow calls (delay…), the sketch's own functions and library objects' methods
    var awaitNames = ASYNC_API.concat(fnames);
    t = t.replace(/([A-Za-z_]\w*)(\s*\()/g, function (all, name, paren, off, str) {
      if (awaitNames.indexOf(name) < 0) return all;
      var before = str.slice(Math.max(0, off - 12), off);
      if (/function\s+$/.test(before) || /\.\s*$/.test(before)) return all;
      return '\u0002' + name + paren;
    });
    t = t.replace(/\u0002/g, 'await ');
    if (objs.length) t = t.replace(new RegExp('(^|[^.\\w])(' + objs.join('|') + ')(\\s*\\.\\s*\\w+\\s*\\()', 'g'), '$1await $2$3');
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
    return { js: t, fnames: fnames, objs: objs };
  }

  /* ---------- the runtime: pins + the parts connected to them ---------- */
  function Runtime(opts, hooks, B) {
    var R = this, mode = {}, val = {}, pressed = {}, warned = {}, log = [], t0 = 0, stopped = true, lastYield = 0, audio = null, osc = null, beep = null;
    var PINS = { A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19 };
    var STOP = { stop: true };
    var state = R.state = { servo: {}, lcd: ['', ''], motor: 0, stepper: 0, tone: 0, shift: 0, rgb: [0, 0, 0], seg: [0, 0, 0, 0], ir: [] };
    function part(id) { return id && B.parts[id]; }
    function pinNo(p) { return typeof p === 'string' ? (PINS[p] != null ? PINS[p] : Number(p)) : Number(p); }
    function warn(key, msg) { if (warned[key]) return; warned[key] = 1; hooks.warn(msg); }
    function now() { return Math.floor(performance.now() - t0); }
    function trim() { if (log.length > 40000) log.splice(0, 20000); } // keep the pin log bounded on long runs
    function dev(name, v) { log.push({ t: now(), dev: name, v: v }); trim(); }
    function level(p) { var v = val[p] || 0; return mode[p] === 'OUT' ? v : 0; }
    /* ---- sound ---- */
    function ac() { try { audio = audio || new (root.AudioContext || root.webkitAudioContext)(); return audio; } catch (e) { return null; } }
    function playTone(f, dur) {
      var a = ac(); try { if (osc) osc.stop(); } catch (e) {} osc = null; if (!a || !f) return;
      try { osc = a.createOscillator(); var g = a.createGain(); g.gain.value = 0.04; osc.type = 'square'; osc.frequency.value = f; osc.connect(g); g.connect(a.destination); osc.start(); if (dur) { var o = osc; setTimeout(function () { try { o.stop(); } catch (e) {} if (osc === o) osc = null; }, dur); } } catch (e) {}
    }
    /* ---- update the parts after a pin changes ---- */
    function update(p) {
      var id = (opts.leds || {})[p];
      if (p === 13 || id) { var lit = mode[p] === 'OUT' ? (val[p] || 0) : (val[p] ? 0.1 : 0); hooks.led(p, lit); }
      var rg = opts.rgb;
      if (rg && (p === rg.r || p === rg.g || p === rg.b)) {
        var c = [level(rg.r), level(rg.g), level(rg.b)]; if (rg.anode) c = c.map(function (x) { return 1 - x; });
        state.rgb = c; var g = part(rg.part); if (g && g._setRGB) g._setRGB(c[0], c[1], c[2]); dev('rgb', c);
      }
      var bz = (opts.buzzers || {})[p];
      if (bz && bz.type !== 'passive') { var on = level(p) > 0.5, gb = part(bz.part); if (gb && gb._sound) gb._sound(on); if (on && !beep) { beep = 1; playTone(2300); dev('tone', 2300); } else if (!on && beep) { beep = null; playTone(0); dev('tone', 0); } }
      var rl = (opts.relays || {})[p]; if (rl) { var gr = part(rl); if (gr && gr._click) gr._click(level(p) > 0.5); dev('relay', level(p) > 0.5 ? 1 : 0); }
      var mo = opts.motor;
      if (mo && (p === mo.en || p === mo.in1 || p === mo.in2 || p === mo.relay)) {
        var dir = (level(mo.in1) > 0.5 ? 1 : 0) - (level(mo.in2) > 0.5 ? 1 : 0);
        var spd = (mo.en != null ? level(mo.en) : 1) * dir;
        if (mo.relay != null) spd = level(mo.relay) > 0.5 ? (mo.en != null || mo.in1 != null ? spd : 1) : 0;
        if (spd !== state.motor) { state.motor = spd; var gm = part(mo.part); if (gm && gm._spin) gm._spin(spd); dev('motor', spd); }
      }
      var sh = opts.shift;
      if (sh && p === sh.latch && level(p) > 0.5 && R._latchLow) { R._latchLow = false; applyShift(); }
      if (sh && p === sh.latch && level(p) < 0.5) R._latchLow = true;
      var s4 = opts.seg4; if (s4 && (s4.digits || []).indexOf(p) >= 0) segRefresh();
      var so = opts.sonar; if (so && p === so.trig) { if (level(p) > 0.5) R._trigHigh = now(); else if (R._trigHigh != null) { R._pinged = now(); var gs = part(so.part); if (gs && gs._ping) gs._ping(); } }
    }
    var shiftReg = 0;
    function applyShift() {
      state.shift = shiftReg; dev('shift', shiftReg);
      var sh = opts.shift;
      if (sh.leds) sh.leds.forEach(function (id, i) { if (id) B.setLit(id, (shiftReg >> i) & 1); });
      if (sh.seg) { var g = part(sh.seg); if (g && g._setDigit) g._setDigit(0, shiftReg); state.seg[0] = shiftReg; }
      if (opts.seg4) segRefresh();
    }
    var segLast = [0, 0, 0, 0], segT = [0, 0, 0, 0];
    function segBits() { var s4 = opts.seg4; if (s4.segPins) { var b = 0; ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].forEach(function (k, i) { if (level(s4.segPins[k]) > 0.5) b |= 1 << i; }); return b; } return shiftReg; }
    function segRefresh() { var s4 = opts.seg4, bits = segBits(), t = performance.now(); (s4.digits || []).forEach(function (pin, i) { if (mode[pin] === 'OUT' && !(val[pin] > 0.5)) { segLast[i] = bits; segT[i] = t; } }); }
    R._segTimer = null;
    function segLoop() {
      var s4 = opts.seg4; if (!s4) return; var g = part(s4.part), t = performance.now();
      segRefresh();
      for (var i = 0; i < 4; i++) { var b = t - segT[i] < 90 ? segLast[i] : 0; if (state.seg[i] !== b) { state.seg[i] = b; if (g && g._setDigit) g._setDigit(i, b); } }
    }
    /* ---- library classes ---- */
    function Servo() { this.pin = null; this.a = 90; }
    Servo.prototype.attach = function (p) { this.pin = pinNo(p); if (!(opts.servos || {})[this.pin]) warn('servo' + p, 'There’s no servo connected to pin ' + p + ' in this circuit.'); return 1; };
    Servo.prototype.write = function (a) { a = Math.max(0, Math.min(180, Number(a) || 0)); this.a = a; state.servo[this.pin] = a; var g = part((opts.servos || {})[this.pin]); if (g && g._setAngle) g._setAngle(a); dev('servo', a); };
    Servo.prototype.read = function () { return this.a; };
    Servo.prototype.attached = function () { return this.pin != null; };
    Servo.prototype.detach = function () { this.pin = null; };
    function LiquidCrystal() { this.buf = [new Array(16).fill(' '), new Array(16).fill(' ')]; this.c = 0; this.r = 0; this.on = true; }
    var LP = LiquidCrystal.prototype;
    LP._draw = function () { var lines = this.on ? this.buf.map(function (b) { return b.join(''); }) : ['', '']; state.lcd = lines; var g = part(opts.lcd); if (g && g._setText) g._setText(lines); dev('lcd', lines.slice()); };
    LP.begin = function () { this.clear(); };
    LP.clear = function () { this.buf = [new Array(16).fill(' '), new Array(16).fill(' ')]; this.c = 0; this.r = 0; this._draw(); };
    LP.home = function () { this.c = 0; this.r = 0; };
    LP.setCursor = function (c, r) { this.c = Math.max(0, c | 0); this.r = Math.max(0, Math.min(1, r | 0)); };
    LP.print = function (x, base) { var s = fmt(x, base).replace(/\u00df/g, '°'); for (var i = 0; i < s.length; i++) { if (this.c < 40 && this.c < 16) this.buf[this.r][this.c] = s[i]; this.c++; } this._draw(); return s.length; };
    LP.write = function (x) { return this.print(typeof x === 'number' ? String.fromCharCode(x) : x); };
    LP.noDisplay = function () { this.on = false; this._draw(); }; LP.display = function () { this.on = true; this._draw(); };
    LP.scrollDisplayLeft = function () { this.buf.forEach(function (b) { b.push(b.shift()); }); this._draw(); };
    LP.scrollDisplayRight = function () { this.buf.forEach(function (b) { b.unshift(b.pop()); }); this._draw(); };
    LP.cursor = LP.noCursor = LP.blink = LP.noBlink = LP.createChar = function () {};
    function DHT(pin) { this.pin = pinNo(pin); }
    DHT.prototype.begin = function () { if (!opts.dht) warn('dht', 'There’s no DHT11 sensor in this circuit.'); };
    DHT.prototype.readTemperature = function (f) { var t = opts.dht ? Number(opts.dht.temp) : NaN; return (f ? t * 9 / 5 + 32 : t) + 1e-9; };
    DHT.prototype.readHumidity = function () { return opts.dht ? Number(opts.dht.hum) + 1e-9 : NaN; };
    function Stepper(steps) { this.steps = Number(steps) || 2048; this.rpm = 10; }
    Stepper.prototype.setSpeed = function (r) { this.rpm = Math.max(0.1, Number(r) || 1); if (this.rpm > 17 && this.steps >= 2000) warn('rpm', 'The 28BYJ-48 stepper can’t go faster than about 15 RPM — at ' + this.rpm + ' RPM a real one would just buzz.'); };
    Stepper.prototype.step = function (n) {
      var self = this, total = Math.abs(n | 0), dir = n < 0 ? -1 : 1, msPer = 60000 / (self.rpm * self.steps), g = part(opts.stepper), done = 0, phase = 0;
      var PAT = [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]];
      return new Promise(function (res, rej) {
        var start = performance.now();
        (function tick() {
          if (stopped) return rej(STOP);
          var target = Math.min(total, Math.floor((performance.now() - start) / msPer)), d = target - done;
          if (d > 0) { done = target; state.stepper += d * dir; if (g) { g._step && g._step(d * dir, self.steps); phase = (phase + d * dir + 400) % 4; g._coils && g._coils(PAT[phase]); } }
          if (done >= total) { dev('stepper', state.stepper); lastYield = performance.now(); res(); } else setTimeout(tick, 16);
        })();
      });
    };
    function decode_results() { this.value = 0; }
    var irQueue = state.ir;
    function IRrecv(pin) { this.pin = pinNo(pin); }
    IRrecv.prototype.enableIRIn = function () {};
    var irPaused = false;
    IRrecv.prototype.decode = function (res) { if (irPaused || !irQueue.length) return false; var c = irQueue.shift(); if (res) res.value = c === 'rep' ? 0xFFFFFFFF : necCode(c); irPaused = true; return true; };
    IRrecv.prototype.resume = function () { irPaused = false; };
    var IrReceiver = { decodedIRData: { command: 0, address: 0, flags: 0, decodedRawData: 0 },
      begin: function () {}, start: function () {}, enableIRIn: function () {}, resume: function () { irPaused = false; },
      decode: function () { if (irPaused) { if (irQueue.length && !R._irWarned) { R._irWarned = true; warn('irres', 'The receiver is waiting: call IrReceiver.resume() after each code, or it won’t read the next one.'); } return false; } if (!irQueue.length) return false; irPaused = true; var c = irQueue.shift(); this.decodedIRData = { command: c === 'rep' ? 0 : c, address: 0, flags: c === 'rep' ? 1 : 0, decodedRawData: c === 'rep' ? 0 : necCode(c) }; return true; },
      printIRResultShort: function () { R.api.Serial.println('Protocol=NEC Address=0x0 Command=0x' + this.decodedIRData.command.toString(16).toUpperCase()); } };
    R.irPress = function (cmd) { irQueue.push(cmd); var g = part(opts.ir && opts.ir.part); if (g && g._blink) g._blink(); };
    /* ---- serial input ---- */
    var serIn = '';
    R.serialSend = function (s) { serIn += s + '\n'; };
    function fmt(x, base) {
      if (typeof x === 'boolean') return x ? '1' : '0';
      if (x && typeof x === 'object' && '__f' in x) { var dp = base == null ? 2 : Math.max(0, Math.min(10, base)); return Number(x.__f).toFixed(dp); }
      if (typeof x === 'number') { if (base === 16) return (x >>> 0).toString(16).toUpperCase(); if (base === 2) return (x >>> 0).toString(2); if (!Number.isInteger(x) || (base != null && base < 10)) return x.toFixed(base == null || base > 9 ? 2 : base); }
      return String(x);
    }
    R.api = {
      HIGH: 1, LOW: 0, INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP', LED_BUILTIN: 13, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, DEC: 10, HEX: 16, BIN: 2, PI: Math.PI,
      MSBFIRST: 1, LSBFIRST: 0, DHT11: 11, DHT22: 22, ENABLE_LED_FEEDBACK: true, DISABLE_LED_FEEDBACK: false,
      Servo: Servo, LiquidCrystal: LiquidCrystal, Stepper: Stepper, DHT: DHT, IRrecv: IRrecv, decode_results: decode_results, IrReceiver: IrReceiver,
      pinMode: function (p, m) { p = pinNo(p); if (m === 'OUTPUT') mode[p] = 'OUT'; else if (m === 'INPUT_PULLUP') mode[p] = 'PU'; else if (m === 'INPUT') mode[p] = 'IN'; else warn('mode' + p, 'pinMode needs OUTPUT, INPUT or INPUT_PULLUP (in capitals).'); update(p); },
      digitalWrite: function (p, v) {
        p = pinNo(p); v = v ? 1 : 0;
        if (mode[p] === 'IN' || mode[p] === 'PU') { if ((opts.buttons || {})[p] || (opts.sonar && p === opts.sonar.echo)) { mode[p] = v ? 'PU' : 'IN'; return; } } // HIGH on an input = turn on the pull-up
        if (mode[p] !== 'OUT' && ((opts.leds || {})[p] || p === 13)) warn('dw' + p, 'Pin ' + p + ' isn’t set as an OUTPUT, so the LED will barely glow. Add pinMode(' + p + ', OUTPUT); to setup().');
        if (mode[p] !== 'OUT' && !(opts.leds || {})[p] && p !== 13 && mode[p] == null) warn('dwm' + p, 'Pin ' + p + ' has no pinMode — add pinMode(' + p + ', OUTPUT); in setup().');
        if (mode[p] == null && !(opts.leds || {})[p] && p !== 13) mode[p] = 'OUT';
        val[p] = v; log.push({ t: now(), pin: p, v: v }); trim(); update(p);
      },
      analogWrite: function (p, v) {
        p = pinNo(p); var pwm = [3, 5, 6, 9, 10, 11].indexOf(p) >= 0;
        if (!pwm) warn('pwm' + p, 'Pin ' + p + ' can’t fade: only the pins marked ~ (3, 5, 6, 9, 10, 11) can use analogWrite.');
        mode[p] = 'OUT'; v = Math.max(0, Math.min(255, Math.round(Number(v) || 0))); val[p] = pwm ? v / 255 : (v >= 128 ? 1 : 0); log.push({ t: now(), pin: p, v: val[p] }); trim(); update(p);
      },
      digitalRead: function (p) {
        p = pinNo(p); var b = (opts.buttons || {})[p];
        if (mode[p] === 'OUT') return val[p] > 0.5 ? 1 : 0;
        if (b) { var down = !!pressed[p]; if (b.wiring === 'pullup') return down ? 0 : (mode[p] === 'PU' ? 1 : (Math.random() < 0.5 ? 1 : 0)); return down ? 1 : 0; }
        if (mode[p] === 'PU') return 1;
        warn('float' + p, 'Nothing is connected to pin ' + p + ', so digitalRead gives random HIGHs and LOWs (the pin is “floating”).');
        return Math.random() < 0.5 ? 1 : 0;
      },
      analogRead: function (p) { p = pinNo(p); var ch = p >= 14 ? p - 14 : p, a = (opts.analog || {})[ch]; if (!a) { warn('ar' + ch, 'Nothing is connected to A' + ch + ', so analogRead gives random numbers.'); return Math.floor(Math.random() * 1024); } return Math.max(0, Math.min(1023, Math.round(a.value + (a.noise === false ? 0 : (Math.random() - 0.5) * 3)))); },
      delay: function (ms) { ms = Math.max(0, Number(ms) || 0); return new Promise(function (res, rej) { var end = performance.now() + ms; (function tick() { if (stopped) return rej(STOP); var left = end - performance.now(); if (left <= 0) { lastYield = performance.now(); res(); } else setTimeout(tick, Math.min(left, 30)); })(); }); },
      delayMicroseconds: function (us) { return us >= 2000 ? R.api.delay(us / 1000) : Promise.resolve(); },
      millis: function () { return now(); }, micros: function () { return Math.floor((performance.now() - t0) * 1000); },
      tone: function (p, f, dur) { p = pinNo(p); state.tone = f; dev('tone', f); playTone(f, dur); var bz = (opts.buzzers || {})[p], g = bz && part(bz.part); if (g && g._sound) { g._sound(true); if (dur) setTimeout(function () { g._sound(false); }, dur); } if (bz && bz.type === 'active') warn('act', 'That’s the active buzzer: it only makes one sound. Use the passive buzzer for tone().'); },
      noTone: function (p) { state.tone = 0; dev('tone', 0); playTone(0); var bz = (opts.buzzers || {})[pinNo(p)], g = bz && part(bz.part); if (g && g._sound) g._sound(false); },
      pulseIn: function (p, lvl, timeout) {
        p = pinNo(p); var so = opts.sonar;
        if (!so || p !== so.echo) return Promise.resolve(0);
        if (R._pinged == null) { warn('trig', 'The sensor never got a trigger pulse: set the Trig pin HIGH for 10 µs, then LOW, before pulseIn.'); return Promise.resolve(0); }
        R._pinged = null; var cm = Number(so.cm), us = cm > 400 || cm < 2 ? 0 : Math.round(cm * 58.3 * (0.98 + Math.random() * 0.04));
        return new Promise(function (res) { setTimeout(function () { res(us); }, 2); });
      },
      shiftOut: function (dp, cp, order, v) {
        v = Number(v) & 255; var sh = opts.shift;
        if (!sh || pinNo(dp) !== sh.data || pinNo(cp) !== sh.clock) { warn('sh', 'shiftOut is using pins ' + dp + ' and ' + cp + ', but the 74HC595 is wired to DS = ' + (sh ? sh.data : '?') + ' and SHCP = ' + (sh ? sh.clock : '?') + '.'); return; }
        shiftReg = order ? v : rev8(v);
      },
      map: function (x, a, b, c, d) { return Math.trunc((x - a) * (d - c) / (b - a) + c); },
      constrain: function (x, a, b) { return Math.min(b, Math.max(a, x)); },
      random: function (a, b) { if (b === undefined) { b = a; a = 0; } return Math.floor(Math.random() * (b - a)) + a; },
      randomSeed: function () {}, abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt, sq: function (x) { return x * x; },
      log: Math.log, log10: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, floor: Math.floor, ceil: Math.ceil, round: Math.round, isnan: isNaN,
      int: function (x) { return Math.trunc(Number(x)); }, float: function (x) { return Number(x); }, long: function (x) { return Math.trunc(Number(x)); }, byte: function (x) { return Math.trunc(Number(x)) & 255; }, word: function (x) { return Math.trunc(Number(x)) & 65535; },
      bitRead: function (x, n) { return (x >> n) & 1; }, bitWrite: function (x, n, b) { return b ? x | (1 << n) : x & ~(1 << n); }, bitSet: function (x, n) { return x | (1 << n); }, bitClear: function (x, n) { return x & ~(1 << n); },
      F: function (s) { return s; },
      __idiv: function (a, b) { return b ? Math.trunc(a / b) : 0; }, __int: function (x) { return typeof x === 'number' ? Math.trunc(x) : x; }, __u8: function (x) { return typeof x === 'number' ? ((Math.trunc(x) % 256) + 256) % 256 : x; },
      Serial: {
        begin: function () { R.serialOn = true; },
        print: function (x, base) { if (!R.serialOn) warn('ser', 'Serial.print needs Serial.begin(9600); in setup() first.'); hooks.serial(fmt(x, base)); },
        println: function (x, base) { if (!R.serialOn) warn('ser', 'Serial.println needs Serial.begin(9600); in setup() first.'); hooks.serial((x === undefined ? '' : fmt(x, base)) + '\n'); },
        write: function (x) { hooks.serial(typeof x === 'number' ? String.fromCharCode(x) : String(x)); },
        available: function () { return serIn.length; },
        read: function () { if (!serIn.length) return -1; var c = serIn.charCodeAt(0); serIn = serIn.slice(1); return c; },
        peek: function () { return serIn.length ? serIn.charCodeAt(0) : -1; },
        readString: function () { var s = serIn; serIn = ''; return s; },
        readStringUntil: function (ch) { var c = typeof ch === 'number' ? String.fromCharCode(ch) : ch, i = serIn.indexOf(c); var s = i < 0 ? serIn : serIn.slice(0, i); serIn = i < 0 ? '' : serIn.slice(i + 1); return s; },
        parseInt: function () { var m = /-?\d+/.exec(serIn); if (!m) { serIn = ''; return 0; } serIn = serIn.slice(m.index + m[0].length); return Number(m[0]); },
        parseFloat: function () { var m = /-?\d+(\.\d+)?/.exec(serIn); if (!m) { serIn = ''; return 0; } serIn = serIn.slice(m.index + m[0].length); return Number(m[0]); },
        flush: function () {}
      },
      __t: function () { return performance.now() - lastYield > 14; },
      __F: function (v) { return typeof v === 'number' ? { __f: v } : v; },
      __y: function () { return new Promise(function (res, rej) { setTimeout(function () { lastYield = performance.now(); if (stopped) rej(STOP); else res(); }, 0); }); }
    };
    R.millis = now;
    R.press = function (pin, on) { pressed[pin] = on; };
    R.isPressed = function (pin) { return !!pressed[pin]; };
    R.log = log;
    R.running = function () { return !stopped; };
    R.pin = function (p) { return { mode: mode[p], v: val[p] || 0 }; };
    R.stop = function () {
      stopped = true; playTone(0); beep = null; clearInterval(R._segTimer);
      Object.keys(opts.buzzers || {}).forEach(function (p) { var g = part(opts.buzzers[p].part); if (g && g._sound) g._sound(false); });
      if (opts.motor) { var gm = part(opts.motor.part); if (gm && gm._spin) gm._spin(0); }
    };
    R.run = function (fns) {
      stopped = false; t0 = performance.now(); lastYield = t0; R.serialOn = false;
      Object.keys(opts.leds || {}).forEach(function (p) { hooks.led(Number(p), 0); }); hooks.led(13, 0);
      if (opts.lcd) { var gl = part(opts.lcd); if (gl && gl._setText) gl._setText(['', '']); }
      if (opts.seg4) R._segTimer = setInterval(segLoop, 30);
      // A flat loop (not a promise chain), so a long-running sketch doesn't hold on to memory.
      return (async function () {
        await fns.setup();
        while (!stopped) { await fns.loop(); if (R.api.__t()) await R.api.__y(); }
      })().catch(function (e) { if (e === STOP) return; throw e; });
    };
    R.STOP = STOP;
  }

  function friendly(e, src) {
    var msg = String(e && e.message || e), line = null, mm = /<anonymous>:(\d+):\d+/.exec(String(e && e.stack || ''));
    if (mm) line = Number(mm[1]) - 2;
    var r;
    if ((r = /^(\w+) is not defined/.exec(msg))) msg = "'" + r[1] + "' was not declared. Check the spelling (capital letters matter) or declare it as a variable first.";
    else if ((r = /(\w+) is not a function/.exec(msg))) msg = "'" + r[1] + "' isn't a function the UNO knows. Check the spelling.";
    else if (/Cannot read properties of undefined/.test(msg)) msg = 'Something is used before it has a value (often an array index past the end). ' + msg;
    else if (/Unexpected token|Unexpected identifier|missing \) after|Invalid or unexpected/.test(msg)) msg = 'Something on this line isn’t valid Arduino code: ' + msg;
    var n = src.split('\n').length; if (line && (line < 1 || line > n)) line = null;
    return { line: line, msg: msg };
  }

  /* ---------- the editor + board widget ---------- */
  RL.Sim = {
    check: check, translate: translate, REMOTE: REMOTE, necCode: necCode,
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
      var B = RL.Board.render({ parts: opts.board.parts, show: opts.board.show, view: opts.board.view, vb: opts.board.vb, hover: false, label: 'Virtual circuit' });
      boardBox.appendChild(B.svg);
      var ctl = el('div', 'sim-ctl');
      var run = el('button', 'btn btn-primary btn-small', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l12 8-12 8z" fill="currentColor" stroke="none"/></svg>Upload &amp; run'); run.type = 'button';
      var stop = el('button', 'btn btn-ghost btn-small', 'Stop'); stop.type = 'button'; stop.disabled = true;
      var reset = el('button', 'btn btn-ghost btn-small', 'Reset code'); reset.type = 'button';
      var dl = el('button', 'btn btn-ghost btn-small', 'Download .ino'); dl.type = 'button';
      ctl.appendChild(run); ctl.appendChild(stop); ctl.appendChild(reset); ctl.appendChild(dl);
      var chk = null; if (opts.check) { chk = el('button', 'btn btn-ghost btn-small', 'Check my code'); chk.type = 'button'; ctl.appendChild(chk); }
      out.appendChild(ctl);
      var inputs = el('div', 'sim-inputs'); out.appendChild(inputs);
      var msg = el('div', 'sim-msg'); out.appendChild(msg);
      var serial = el('div', 'sim-serial'); out.appendChild(serial);
      var rt = null;
      function slider(label, min, max, step, get, set, unit) {
        var row = el('div', 'slider-row'); row.innerHTML = '<label>' + esc(label) + '</label>';
        var r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step || 1; r.value = get(); r.setAttribute('aria-label', label);
        var o = el('b', '', esc(get() + (unit || '')));
        r.addEventListener('input', function () { set(Number(r.value)); o.textContent = r.value + (unit || ''); });
        row.appendChild(r); row.appendChild(o); inputs.appendChild(row);
        return { set: function (v) { r.value = v; set(Number(v)); o.textContent = v + (unit || ''); } };
      }
      var sliders = {};
      var joyCh = opts.joystick ? [opts.joystick.x, opts.joystick.y] : [];
      opts.analog = opts.analog || {};
      if (opts.joystick) { [opts.joystick.x, opts.joystick.y].forEach(function (ch) { if (!opts.analog[ch]) opts.analog[ch] = { value: 512, hidden: true }; }); }
      Object.keys(opts.analog).forEach(function (k) {
        var a = opts.analog[k]; if (a.hidden || joyCh.indexOf(Number(k)) >= 0) return;
        var g = a.part && B.parts[a.part]; if (g && g._setValue) g._setValue(a.value);
        sliders['A' + k] = slider('A' + k + ' · ' + (a.label || 'sensor'), 0, 1023, 1, function () { return a.value; }, function (v) { a.value = v; if (g && g._setValue) g._setValue(v); });
      });
      if (opts.dht) { sliders.temp = slider('DHT11 · temperature', 0, 50, 1, function () { return opts.dht.temp; }, function (v) { opts.dht.temp = v; }, ' °C'); sliders.hum = slider('DHT11 · humidity', 20, 90, 1, function () { return opts.dht.hum; }, function (v) { opts.dht.hum = v; }, ' %'); }
      if (opts.sonar) sliders.cm = slider('Distance to object', 2, 200, 1, function () { return opts.sonar.cm; }, function (v) { opts.sonar.cm = v; }, ' cm');
      if (opts.joystick) {
        var jr = el('div', 'slider-row'); jr.innerHTML = '<label>Joystick · drag the dot</label>';
        var pad = el('div', 'joy-pad'), dot = el('div', 'joy-dot'); pad.appendChild(dot); jr.appendChild(pad);
        var jro = el('b', 'small', 'X 512 · Y 512'); jr.appendChild(jro); inputs.appendChild(jr);
        var jg = B.parts[opts.joystick.part];
        var setJ = function (x, y) { opts.analog[opts.joystick.x].value = x; opts.analog[opts.joystick.y].value = y; dot.style.left = (x / 1023 * 100) + '%'; dot.style.top = (y / 1023 * 100) + '%'; jro.textContent = 'X ' + x + ' · Y ' + y; if (jg && jg._setStick) jg._setStick(x, y, rt && opts.joystick.sw != null && rt.isPressed(opts.joystick.sw)); };
        var drag = false;
        var mv = function (e) { if (!drag) return; var r = pad.getBoundingClientRect(); setJ(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 1023), Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 1023)); };
        pad.addEventListener('pointerdown', function (e) { drag = true; pad.setPointerCapture(e.pointerId); mv(e); });
        pad.addEventListener('pointermove', mv);
        pad.addEventListener('pointerup', function () { drag = false; setJ(512, 512); });
        sliders.joy = { set: setJ }; setJ(512, 512);
      }
      if (opts.ir) {
        var rem = el('div', 'remote'); rem.innerHTML = '<span class="label">Remote · click a key</span>';
        var keys = el('div', 'remote-keys');
        REMOTE.forEach(function (k) { var b = el('button', '', esc(k[0])); b.type = 'button'; b.title = k[0] + ' (command 0x' + k[1].toString(16).toUpperCase() + ')'; b.addEventListener('click', function () { if (rt && rt.running()) rt.irPress(k[1]); else show('warn', 'Run the sketch first, then press keys on the remote.'); }); keys.appendChild(b); });
        rem.appendChild(keys); inputs.appendChild(rem);
      }
      if (opts.serialInput) {
        var sr = el('form', 'serial-in'); sr.innerHTML = '<input type="text" placeholder="Type a message for the Serial Monitor" aria-label="Serial input"><button class="btn btn-ghost btn-small" type="submit">Send</button>';
        sr.addEventListener('submit', function (e) { e.preventDefault(); var i = sr.querySelector('input'); if (rt && rt.running()) { rt.serialSend(i.value); serial.textContent += '> ' + i.value + '\n'; } i.value = ''; });
        out.appendChild(sr);
      }
      container.appendChild(wrap);
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
          return false;
        }
        var js = translate(src).js, fns;
        try {
          var AF = Object.getPrototypeOf(async function () {}).constructor;
          var fn = new AF(API.join(','), js + '\n;return { setup: typeof setup === "function" ? setup : null, loop: typeof loop === "function" ? loop : null };');
          rt = new Runtime(opts, hooks(), B);
          var args = API.map(function (n) { return rt.api[n]; });
          fn.apply(null, args).then(function (f) {
            fns = f; if (!fns.setup || !fns.loop) throw new Error('setup() and loop() are both needed');
            run.disabled = true; stop.disabled = false;
            show('ok', '<b>Uploaded.</b> Your sketch is running' + (opts.runHint ? ' — ' + opts.runHint : opts.buttons ? ' — press the button on the breadboard.' : '.'));
            if (c.warnings.length) show('warn', 'Line ' + c.warnings[0].line + ': ' + c.warnings[0].msg);
            return rt.run(fns);
          }).catch(function (e) { stopRun(); var f = friendly(e, src); show('err', '<b>Error' + (f.line ? ' · line ' + f.line : '') + '</b><br>' + esc(f.msg), f.line); });
        } catch (e) { var f = friendly(e, src); show('err', '<b>Compile error</b><br>' + esc(f.msg)); return false; }
        return true;
      }
      run.addEventListener('click', start);
      stop.addEventListener('click', function () { stopRun(); show('clear'); Object.keys(opts.leds || {}).forEach(function (p) { hooks().led(Number(p), 0); }); });
      reset.addEventListener('click', function () { if (ta.value !== original && !confirmReset()) return; ta.value = original; ta.dispatchEvent(new Event('input')); });
      function confirmReset() { return root.confirm ? root.confirm('Put the original code back? Your changes will be lost.') : true; }
      dl.addEventListener('click', function () { RL.Code.download(opts.name || 'sketch', ta.value); });
      var api = {
        press: function (pin, on) { pressBtn(pin, on); },
        setAnalog: function (ch, v) { if (sliders['A' + ch]) sliders['A' + ch].set(v); else if (opts.analog[ch]) opts.analog[ch].value = v; },
        setJoystick: function (x, y) { if (sliders.joy) sliders.joy.set(x, y); },
        setDistance: function (cm) { if (sliders.cm) sliders.cm.set(cm); },
        setTemp: function (t) { if (sliders.temp) sliders.temp.set(t); }, setHum: function (h) { if (sliders.hum) sliders.hum.set(h); },
        ir: function (cmd) { if (rt) rt.irPress(cmd); }, serial: function (s) { if (rt) rt.serialSend(s); },
        serialText: function () { return serial.textContent; },
        state: function () { return rt ? rt.state : null; }, pin: function (p) { return rt ? rt.pin(p) : null; },
        wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
      };
      if (chk) chk.addEventListener('click', function () {
        if (!rt || !rt.running()) { if (start() === false) return; setTimeout(doCheck, opts.checkAfter || 6000); show('ok', '<b>Checking…</b> running your sketch for a few seconds.'); } else doCheck();
        function doCheck() { if (!rt || !rt.running()) return; api.runtime = rt; var r = opts.check(rt.log, api); if (r && r.then) r.then(fin); else fin(r); }
        function fin(r) { if (!r) return; show(r.pass ? 'ok' : 'err', '<b>' + (r.pass ? 'PASS' : 'RETRY') + '</b> · ' + r.msg); if (r.pass && opts.onPass) opts.onPass(); }
      });
      function pressBtn(pin, on) { if (rt) rt.press(pin, on); var b = (opts.buttons || {})[pin]; if (b) { var g = B.parts[b.part]; if (g && g._tilt) g._tilt(on); else B.press(b.part, on); } if (opts.joystick && opts.joystick.sw === pin && sliders.joy) { var jg2 = B.parts[opts.joystick.part]; if (jg2 && jg2._setStick) jg2._setStick(opts.analog[opts.joystick.x].value, opts.analog[opts.joystick.y].value, on); } }
      Object.keys(opts.buttons || {}).forEach(function (pin) {
        var b = opts.buttons[pin], g = B.parts[b.part]; if (!g) return;
        g.classList.add('sim-btn'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', (b.label || 'Push button') + ' on pin ' + pin);
        if (b.toggle) {
          var on = false; g.addEventListener('click', function () { on = !on; pressBtn(Number(pin), on); });
          g.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on = !on; pressBtn(Number(pin), on); } });
          return;
        }
        var down = function (e) { e.preventDefault(); pressBtn(Number(pin), true); }, up = function () { pressBtn(Number(pin), false); };
        g.addEventListener('pointerdown', down); g.addEventListener('pointerup', up); g.addEventListener('pointerleave', up); g.addEventListener('pointercancel', up);
        g.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressBtn(Number(pin), true); } });
        g.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') pressBtn(Number(pin), false); });
      });
      if (opts.joystick && opts.joystick.sw != null && !(opts.buttons || {})[opts.joystick.sw]) {
        var jb = el('button', 'btn btn-ghost btn-small', 'Press joystick (SW)'); jb.type = 'button';
        opts.buttons = opts.buttons || {}; opts.buttons[opts.joystick.sw] = { wiring: 'pullup', part: null };
        jb.addEventListener('pointerdown', function () { pressBtn(opts.joystick.sw, true); }); jb.addEventListener('pointerup', function () { pressBtn(opts.joystick.sw, false); }); jb.addEventListener('pointerleave', function () { pressBtn(opts.joystick.sw, false); });
        inputs.appendChild(jb);
      }
      if (RL.onLeave) RL.onLeave(stopRun);
      api.board = B; api.run = start; api.stop = stopRun; api.editor = ta;
      return api;
    }
  };
})(window);
