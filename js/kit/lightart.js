/* Light display for the drawings. Every explainer, lab, build guide and Virtual UNO is drawn in SVG with the Robotics
 * Lab palette (navy backgrounds, light ink, cyan highlights). In light mode this swaps those palette colours for light
 * equivalents, live: on the page as it is, on anything drawn later, and whenever an animation sets a colour. Colours of
 * real things (copper, LEDs, the blue UNO, chips, cardboard, wires) are left alone.
 * Text drawn in light ink on top of a dark object (a label on the UNO or a chip) stays light: before swapping a text's
 * colour it looks at what is drawn under it.
 * Switching back to dark puts every original colour back. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {};
  var MAP = {
    '#070d17': '#f7f9fc', // page navy → off-white
    '#0e1826': '#ffffff', // panel
    '#0b1422': '#f1f5f9', '#050a12': '#f8fafc', '#0a1220': '#f3f6fa', // deeper panels
    '#22364f': '#d3dde8', // grid
    '#e6f1fa': '#0b1a2b', // ink
    '#8ea6bb': '#55697d', // muted ink
    '#9fb3c8': '#7a8ea3', // neutral lines
    '#22d3ee': '#0e9bb5', // cyan highlight
    '#0a2a36': '#d9f1f6', // cyan wash
    '#4ade80': '#16a34a', // pass green
    '#ff8a3d': '#e0670f'  // signal orange
  };
  var LIGHT_TEXT = { '#e6f1fa': 1, '#8ea6bb': 1, '#9fb3c8': 1 };
  var ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'color'];
  var on = false, touched = new Set(), orig = new WeakMap(), darkOf = new WeakMap(), keepLight = new WeakSet(), mo = null;

  function hex2(n) { return ('0' + n.toString(16)).slice(-2); }
  function norm(v) {
    v = String(v || '').trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return v;
  }
  /* the light version of a colour value, or null if it isn't one of the palette colours */
  function mapped(v) {
    var n = norm(v); if (MAP[n]) return MAP[n];
    var m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)$/.exec(n);
    if (m) { var h = '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]); if (MAP[h]) { var L = MAP[h]; return m[4] == null ? L : 'rgba(' + parseInt(L.slice(1, 3), 16) + ', ' + parseInt(L.slice(3, 5), 16) + ', ' + parseInt(L.slice(5, 7), 16) + ', ' + m[4] + ')'; } }
    return null;
  }
  function lum(v) {
    var n = norm(v), m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(n), r, g, b;
    if (m) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16); }
    else { m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(n); if (!m) return null; r = +m[1]; g = +m[2]; b = +m[3]; }
    var f = function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function keep(el) { return !!(el.closest && el.closest('svg.robot, [data-art="keep"]')); }

  /* what's drawn under a text: the last filled shape before it (in drawing order) whose box covers its middle */
  var SHAPES = 'rect,circle,ellipse,path,polygon';
  function underFill(t) {
    var svg = t.ownerSVGElement; if (!svg) return null;
    var r = t.getBoundingClientRect(); if (!r.width && !r.height) return null;
    var x = r.left + r.width / 2, y = r.top + r.height / 2, best = null;
    var list = svg.querySelectorAll(SHAPES);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!(s.compareDocumentPosition(t) & 4)) break; // shapes after the text are drawn on top of it: stop
      var f = s.getAttribute('fill'); if (!f || f === 'none' || /^url/.test(f)) continue;
      var op = +(s.getAttribute('opacity') || 1) * +(s.getAttribute('fill-opacity') || 1); if (op < 0.6) continue;
      var b = s.getBoundingClientRect(); if (b.width < 4 || b.height < 4) continue;
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
        var p = s.closest('[opacity="0"]'); if (p && svg.contains(p) && !p.contains(t)) continue; // hidden, unless the text is hidden with it
        best = s;
      }
    }
    if (!best) return null;
    var o = orig.get(best), f2 = o && o.fill != null ? o.fill : best.getAttribute('fill');
    return f2;
  }

  function setOne(el, a, v) {
    var cur = el.getAttribute(a); if (cur == null) return;
    var rec = orig.get(el);
    if (rec && rec[a] != null) {
      if (mapped(rec[a]) === cur || (a === 'fill' && darkOf.get(el) === cur)) return; // our own change
      delete rec[a]; if (a === 'fill') darkOf.delete(el);                              // the drawing changed it since
    }
    var L = mapped(cur);
    if (!L) { if (a === 'fill') darkenBright(el); return; } // a non-palette colour stays (bright text on the page gets darker)
    if (a === 'fill' && LIGHT_TEXT[norm(cur)] && (el.tagName === 'text' || el.tagName === 'tspan')) {
      if (keepLight.has(el)) return;
      var u = underFill(el), ul = u ? lum(u) : null;
      if (u && ul != null && ul < 0.18 && !mapped(u)) { keepLight.add(el); return; } // light text on a dark object (not on a page background): stays light
    }
    if (!rec) { rec = {}; orig.set(el, rec); }
    rec[a] = cur; touched.add(el);
    el.setAttribute(a, L);
    if (a === 'fill' && LIGHT_TEXT[norm(cur)] && (el.tagName === 'text' || el.tagName === 'tspan')) recheckLater(el);
  }
  /* a text darkened before its drawing was laid out (or before the object under it was drawn): look again shortly */
  var pending = new Set(), pendT = null;
  function recheckLater(el) { pending.add(el); if (!pendT) pendT = setTimeout(recheck, 250); }
  function recheck() {
    pendT = null; var list = Array.from(pending); pending.clear();
    list.forEach(function (el) {
      if (!on || !el.isConnected) return;
      var rec = orig.get(el); if (!rec || rec.fill == null) return;
      var r = el.getBoundingClientRect(); if (!r.width && !r.height) { if ((el.__rl_tries = (el.__rl_tries || 0) + 1) < 8) recheckLater(el); return; }
      var u = underFill(el), ul = u ? lum(u) : null;
      var dark = darkOf.has(el) ? (u && !mapped(u) && ul < 0.5) : (u && ul != null && ul < 0.18 && !mapped(u));
      if (dark) { var o = rec.fill; delete rec.fill; darkOf.delete(el); keepLight.add(el); el.setAttribute('fill', o); }
    });
  }
  /* bright, non-palette text (a green "ALL CLEAR", a yellow label) drawn straight on the page background: darken it */
  function darkenBright(el) {
    if (el.tagName !== 'text' && el.tagName !== 'tspan') return;
    var cur = el.getAttribute('fill'); if (!cur || mapped(cur) || /^url|none/.test(cur)) return;
    var rec = orig.get(el); if ((rec && rec.fill != null) || keepLight.has(el)) return;
    var l = lum(cur); if (l == null || l < 0.45) return;
    var u = underFill(el); if (u && !mapped(u) && lum(u) < 0.5) return; // it's on a dark object: fine as it is
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(norm(cur)); if (!m) return;
    var k = 0.55, d = '#' + [m[1], m[2], m[3]].map(function (h) { return hex2(Math.round(parseInt(h, 16) * k)); }).join('');
    rec = rec || {}; orig.set(el, rec); rec.fill = cur; darkOf.set(el, d); touched.add(el); el.setAttribute('fill', d); recheckLater(el);
  }
  function paintEl(el) {
    if (el.nodeType !== 1 || !(el instanceof SVGElement) || keep(el)) return;
    for (var i = 0; i < ATTRS.length; i++) if (el.hasAttribute(ATTRS[i])) setOne(el, ATTRS[i]);
  }
  function paintTree(node) {
    if (node.nodeType !== 1) return;
    if (node instanceof SVGElement) paintEl(node);
    var all = node.querySelectorAll ? node.querySelectorAll('svg *, svg') : [];
    // shapes first, then text, so a text can see what its background will be
    var texts = [];
    for (var i = 0; i < all.length; i++) { var t = all[i].tagName; if (t === 'text' || t === 'tspan') texts.push(all[i]); else paintEl(all[i]); }
    for (var j = 0; j < texts.length; j++) paintEl(texts[j]);
  }
  function restore() {
    touched.forEach(function (el) { var rec = orig.get(el); if (!rec) return; Object.keys(rec).forEach(function (a) { el.setAttribute(a, rec[a]); }); orig.delete(el); darkOf.delete(el); keepLight.delete(el); });
    touched.clear();
  }
  function observe() {
    if (mo) return;
    mo = new MutationObserver(function (recs) {
      if (!on) return;
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'attributes') { if (r.target instanceof SVGElement && !keep(r.target)) setOne(r.target, r.attributeName); }
        else for (var k = 0; k < r.addedNodes.length; k++) paintTree(r.addedNodes[k]);
      }
      if (touched.size > 4000) touched.forEach(function (el) { if (!el.isConnected) { touched.delete(el); orig.delete(el); } });
    });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRS });
  }
  RL.lightArt = function (want) {
    want = !!want;
    if (want === on) return;
    on = want;
    if (on) { observe(); paintTree(document.body); }
    else restore();
  };
  RL.lightArt.mapped = mapped; RL.lightArt._under = underFill;
  function sync() { RL.lightArt(document.documentElement.getAttribute('data-theme') === 'light'); }
  // follow the theme: at start, and whenever RL.setTheme changes it
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})(window);
