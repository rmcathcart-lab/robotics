// Light display: finds text that would be light-on-light (or dark-on-dark) on every step of every mission.
// For each SVG text and short HTML text, looks at what is drawn underneath it (elementsFromPoint) and compares brightness.
// node tests/light_check.js [mNN]   (needs the static server on :8765)
const { chromium } = require('playwright');
const only = process.argv[2];
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 7000 } });
  let errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rl/theme', 'light'); } catch (e) {} });
  await p.goto('http://localhost:8765/?preview=1#/'); await p.waitForTimeout(700);
  const counts = await p.evaluate(() => Object.fromEntries(Object.keys(RL.guides).map(k => [k, RL.guides[k].steps.length])));
  let total = 0;
  const pages = [['home', 'http://localhost:8765/?preview=1#/']];
  for (const [m, n] of Object.entries(counts)) { if (only && m !== only) continue; for (let i = 1; i <= n; i++) pages.push([m + ' step ' + i, 'http://localhost:8765/?preview=1#/m/' + m + '/' + i]); }
  for (const [name, url] of pages) {
    errs = [];
    await p.goto(url); await p.waitForTimeout(600);
    const bad = await p.evaluate(() => {
      function rgb(s) { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s || ''); if (!m) return null; return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] }; }
      function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
      function under(elx, x, y) {
        const st = document.elementsFromPoint(x, y); let i = st.indexOf(elx); if (i < 0) i = 0;
        for (let k = i + 1; k < st.length; k++) {
          const e = st[k], cs = getComputedStyle(e);
          if (e instanceof SVGElement && e.tagName !== 'svg' && e.tagName !== 'g' && e.tagName !== 'text' && e.tagName !== 'tspan') { const f = rgb(cs.fill); if (f && f.a > 0.5 && cs.fillOpacity > 0.5 && cs.opacity > 0.5) return f; continue; }
          const bg = rgb(cs.backgroundColor); if (bg && bg.a > 0.5) return bg;
        }
        return { r: 255, g: 255, b: 255 };
      }
      const out = [];
      document.querySelectorAll('.ms-main svg text, .ms-main svg tspan, .home-wrap svg text').forEach(t => {
        if (!t.textContent.trim() || t.closest('[opacity="0"]')) return;
        if (t.closest('.xp-stage, .bg-stage, .sim-ed, .sim-board, .sim-serial, .code, .hs-stage, .dark-island')) return; // drawn dark on purpose
        const r = t.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        const cs = getComputedStyle(t); if (cs.visibility === 'hidden' || +cs.opacity < 0.3) return;
        const f = rgb(cs.fill); if (!f) return;
        const b = under(t, r.left + r.width / 2, r.top + r.height / 2), L1 = lum(f), L2 = lum(b);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (ratio < 1.6) out.push(t.textContent.trim().slice(0, 30) + ' [' + cs.fill + ' on rgb(' + b.r + ',' + b.g + ',' + b.b + ')]');
      });
      return out.slice(0, 8);
    });
    total += bad.length;
    if (bad.length || errs.length) console.log(name + ':', bad.join(' | '), errs.join(' | '));
  }
  console.log('checked', pages.length, 'pages; low-contrast labels:', total);
  await br.close();
})();
