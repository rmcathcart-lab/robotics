// Opens every step of every mission at a given width; reports page errors and sideways scrolling.
// node tests/all_steps.js 390
const { chromium } = require('playwright');
const W = Number(process.argv[2] || 390);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 860 } });
  let errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/'); await p.waitForTimeout(800);
  const counts = await p.evaluate(() => Object.fromEntries(Object.keys(RL.guides).map(k => [k, RL.guides[k].steps.length])));
  let bad = 0;
  for (const [m, n] of Object.entries(counts)) {
    for (let i = 1; i <= n; i++) {
      errs = [];
      await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + i); await p.waitForTimeout(450);
      const r = await p.evaluate(() => { const sw = document.documentElement.scrollWidth, iw = window.innerWidth; let wide = null; if (sw > iw + 1) { for (const e of document.querySelectorAll('.ms-main *')) { const rc = e.getBoundingClientRect(); if (rc.right > iw + 1 && rc.width > 0 && getComputedStyle(e).position !== 'fixed') { wide = e.tagName + '.' + e.className.toString().slice(0, 40); break; } } } return { sw, iw, wide }; });
      if (r.sw > r.iw + 1 || errs.length) { bad++; console.log(m, 'step', i, r.sw > r.iw + 1 ? 'WIDE ' + r.sw + ' ' + r.wide : '', errs.join(' | ')); }
    }
  }
  console.log('checked', Object.values(counts).reduce((a, c) => a + c, 0), 'steps at', W, 'px;', bad, 'problems');
  await b.close();
})();
