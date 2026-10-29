// node tests/m03_mobile.js — checks every step of Missions 02 and 03 at phone width (390 px) for horizontal page scroll
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  for (const [M, n] of [['m02', 11], ['m03', 10]]) for (let i = 1; i <= n; i++) {
    await p.goto('about:blank'); await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${i}`); await p.waitForTimeout(700);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    if (w > 392) console.log(M, 'step', i, 'scrollWidth', w);
    if ((M === 'm02' && [2, 3, 4].includes(i)) || (M === 'm03' && [2, 7].includes(i))) await p.screenshot({ path: `tests/out/${M}-step${String(i).padStart(2, '0')}-390.png`, fullPage: true });
  }
  console.log('done'); await b.close();
})();
