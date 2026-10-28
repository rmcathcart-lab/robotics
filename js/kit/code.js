/* RL.Code — Arduino syntax colouring, code blocks (copy / download .ino) and step-by-step code walkthroughs.
 *   RL.Code.block(container, src, { name: 'crosswalk', highlight: [3,5], download: true })
 *   RL.Code.walk(container, src, segments [{ lines: [from, to], title, html }], { name })  */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var KW = 'if else for while do return break continue switch case default const static true false void new'.split(' ');
  var TY = 'int long float double bool boolean byte char word String unsigned short uint8_t uint16_t uint32_t int8_t int16_t int32_t size_t'.split(' ');
  var CONST = 'HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 A1 A2 A3 A4 A5'.split(' ');
  var FN = 'setup loop pinMode digitalWrite digitalRead analogWrite analogRead delay delayMicroseconds millis micros tone noTone map constrain random randomSeed abs min max pulseIn Serial begin print println available read parseInt'.split(' ');
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  // returns an array of HTML strings, one per line (handles block comments across lines)
  function highlight(src) {
    var out = [], inBlock = false;
    src.split('\n').forEach(function (line) {
      var h = '', i = 0;
      while (i < line.length) {
        if (inBlock) { var e = line.indexOf('*/', i); if (e < 0) { h += '<span class="tk-com">' + esc(line.slice(i)) + '</span>'; i = line.length; } else { h += '<span class="tk-com">' + esc(line.slice(i, e + 2)) + '</span>'; i = e + 2; inBlock = false; } continue; }
        var rest = line.slice(i), m;
        if (rest.indexOf('//') === 0) { h += '<span class="tk-com">' + esc(rest) + '</span>'; break; }
        if (rest.indexOf('/*') === 0) { inBlock = true; continue; }
        if (/^\s*#/.test(line) && i === line.search(/#/)) { h += '<span class="tk-pre">' + esc(rest) + '</span>'; break; }
        if ((m = /^"(?:[^"\\]|\\.)*"?|^'(?:[^'\\]|\\.)*'?/.exec(rest))) { h += '<span class="tk-str">' + esc(m[0]) + '</span>'; i += m[0].length; continue; }
        if ((m = /^\d+(\.\d+)?[fFlLuU]*/.exec(rest)) && !/[A-Za-z_]/.test(line[i - 1] || '')) { h += '<span class="tk-num">' + m[0] + '</span>'; i += m[0].length; continue; }
        if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
          var w = m[0], cls = KW.indexOf(w) >= 0 ? 'tk-kw' : TY.indexOf(w) >= 0 ? 'tk-ty' : CONST.indexOf(w) >= 0 ? 'tk-const' : (FN.indexOf(w) >= 0 && /^\s*\(|^\./.test(line.slice(i + w.length))) || w === 'Serial' ? 'tk-fn' : '';
          h += cls ? '<span class="' + cls + '">' + w + '</span>' : w; i += w.length; continue;
        }
        h += esc(line[i]); i++;
      }
      out.push(h);
    });
    return out;
  }
  function download(name, src) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([src], { type: 'text/plain' }));
    a.download = (name || 'sketch') + '.ino'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copy(src, btn) {
    function ok() { if (btn) { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1400); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(src).then(ok, function () { fallback(); });
    else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = src; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
  }
  function render(src, opts) {
    opts = opts || {};
    var box = document.createElement('div'); box.className = 'code';
    var pre = document.createElement('pre'), lines = highlight(src);
    lines.forEach(function (h, i) { var s = document.createElement('span'); s.className = 'ln'; s.dataset.n = i + 1; s.innerHTML = h || ' '; pre.appendChild(s); });
    box.appendChild(pre);
    if (opts.tools !== false) {
      var tools = document.createElement('div'); tools.className = 'code-tools';
      var c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn-ghost'; c.textContent = 'Copy'; c.addEventListener('click', function () { copy(src, c); }); tools.appendChild(c);
      if (opts.download !== false) { var d = document.createElement('button'); d.type = 'button'; d.className = 'btn btn-ghost'; d.textContent = 'Download .ino'; d.addEventListener('click', function () { download(opts.name, src); }); tools.appendChild(d); }
      box.insertBefore(tools, pre);
    }
    box.mark = function (from, to, dimOthers) {
      var ls = pre.children;
      for (var i = 0; i < ls.length; i++) { var n = i + 1, on = from != null && n >= from && n <= to; ls[i].classList.toggle('hl', on); ls[i].classList.toggle('dim', !!dimOthers && from != null && !on); }
      if (from != null && ls[from - 1]) { var top = ls[from - 1].offsetTop - 40; if (box.scrollHeight > box.clientHeight) box.scrollTop = top; }
    };
    if (opts.highlight) box.mark(opts.highlight[0], opts.highlight[1] || opts.highlight[0]);
    return box;
  }
  RL.Code = {
    highlight: highlight, download: download, copy: copy, render: render,
    block: function (container, src, opts) { var b = render(src, opts); container.appendChild(b); return b; },
    walk: function (container, src, segs, opts) {
      opts = opts || {};
      var w = document.createElement('div'); w.className = 'walk';
      var code = render(src, { name: opts.name, download: opts.download });
      code.style.maxHeight = opts.maxHeight || '560px';
      var note = document.createElement('div'); note.className = 'walk-note';
      w.appendChild(code); w.appendChild(note); container.appendChild(w);
      var i = 0;
      function show(k) {
        i = Math.max(0, Math.min(segs.length - 1, k)); var s = segs[i];
        code.mark(s.lines ? s.lines[0] : null, s.lines ? s.lines[1] || s.lines[0] : null, true);
        note.innerHTML = '<div class="label c">' + (s.lines ? 'Line' + (s.lines[1] && s.lines[1] !== s.lines[0] ? 's ' + s.lines[0] + '–' + s.lines[1] : ' ' + s.lines[0]) : 'Overview') + '</div><h3>' + s.title + '</h3>' + s.html;
        var ctl = document.createElement('div'); ctl.className = 'walk-ctl';
        var p = document.createElement('button'); p.type = 'button'; p.className = 'btn btn-ghost btn-small'; p.textContent = '← Back'; p.disabled = i === 0; p.addEventListener('click', function () { show(i - 1); });
        var n = document.createElement('button'); n.type = 'button'; n.className = 'btn btn-primary btn-small'; n.textContent = i === segs.length - 1 ? 'Start over' : 'Next →'; n.addEventListener('click', function () { show(i === segs.length - 1 ? 0 : i + 1); });
        var lab = document.createElement('span'); lab.className = 'label'; lab.textContent = (i + 1) + ' / ' + segs.length;
        ctl.appendChild(p); ctl.appendChild(n); ctl.appendChild(lab); note.appendChild(ctl);
        var dots = document.createElement('div'); dots.className = 'walk-dots';
        segs.forEach(function (_, j) { var b = document.createElement('button'); b.type = 'button'; b.className = j === i ? 'on' : ''; b.setAttribute('aria-label', 'Part ' + (j + 1)); b.addEventListener('click', function () { show(j); }); dots.appendChild(b); });
        note.appendChild(dots);
        if (opts.onShow) opts.onShow(i);
      }
      show(0);
      return { show: show, code: code };
    }
  };
})(window);
