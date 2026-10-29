// Light display: finds SVG text that ends up hard to read (low contrast against what's drawn under it) on every step of
// every mission, and page errors. node tests/light_check.js [mNN] [minRatio=2]   (needs the static server on :8765)
const { chromium } = require('playwright');
const only = process.argv[2] && /^m\d\d$/.test(process.argv[2]) ? process.argv[2] : null, MIN = +(process.argv[3] || 2);
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 7000 } });
  let errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rl/theme', 'light'); } catch (e) {} });
  await p.goto('http://localhost:8765/?preview=1#/'); await p.waitForTimeout(700);
  const counts = await p.evaluate(() => Object.fromEntries(Object.keys(RL.guides).map(k => [k, RL.guides[k].steps.length])));
  let total = 0;
  const pages = [];
  for (const [m, n] of Object.entries(counts)) { if (only && m !== only) continue; for (let i = 1; i <= n; i++) pages.push([m + ' step ' + i, 'http://localhost:8765/?preview=1#/m/' + m + '/' + i]); }
  for (const [name, url] of pages) {
    errs = [];
    await p.goto(url); await p.waitForTimeout(900);
    const bad = await p.evaluate((MIN) => {
      function rgb(s) { s = String(s || '').trim(); let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s); if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }; m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s); if (m) return { r: parseInt(m[1] + m[1], 16), g: parseInt(m[2] + m[2], 16), b: parseInt(m[3] + m[3], 16) }; m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s); return m ? { r: +m[1], g: +m[2], b: +m[3] } : null; }
      function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
      function pageBg(el) { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { if (e instanceof SVGElement) continue; const c = getComputedStyle(e).backgroundColor; const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); if (m && (m[4] == null || +m[4] > 0.5)) return { r: +m[1], g: +m[2], b: +m[3] }; } return { r: 243, g: 246, b: 250 }; }
      const out = [];
      document.querySelectorAll('.ms-main svg text').forEach(t => {
        if (!t.textContent.trim()) return;
        for (let e = t; e && e.tagName !== 'svg'; e = e.parentNode) { if (e.getAttribute && (e.getAttribute('opacity') === '0' || getComputedStyle(e).display === 'none')) return; }
        const r = t.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        const f = rgb(getComputedStyle(t).fill); if (!f) return;
        const x = r.left + r.width / 2, y = r.top + r.height / 2, svg = t.ownerSVGElement; let best = null;
        for (const s of svg.querySelectorAll('rect,circle,ellipse,path,polygon')) {
          if (!(s.compareDocumentPosition(t) & 4)) break;
          const fa = s.getAttribute('fill'); if (!fa || fa === 'none' || /^url/.test(fa)) continue;
          if (+(s.getAttribute('opacity') || 1) * +(s.getAttribute('fill-opacity') || 1) < 0.6) continue;
          let hidden = false; for (let e = s; e && e !== svg; e = e.parentNode) if (e.getAttribute && e.getAttribute('opacity') === '0') { hidden = true; break; } if (hidden) continue;
          const b = s.getBoundingClientRect(); if (b.width < 4 || b.height < 4) continue;
          if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) best = s;
        }
        const u = best ? rgb(getComputedStyle(best).fill) : pageBg(svg); if (!u) return;
        const L1 = lum(f), L2 = lum(u), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (ratio < MIN) out.push(t.textContent.trim().slice(0, 24) + ' [' + getComputedStyle(t).fill + ' on rgb(' + u.r + ',' + u.g + ',' + u.b + ') ' + ratio.toFixed(1) + ']');
      });
      return out;
    }, MIN);
    total += bad.length;
    if (bad.length || errs.length) console.log(name + ' (' + bad.length + '):', bad.slice(0, 6).join(' | '), errs.join(' | '));
  }
  console.log('checked', pages.length, 'pages; low-contrast labels:', total);
  await br.close();
})();
