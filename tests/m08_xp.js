// node tests/m08_xp.js <mission> <step> <explainerIndex> [waitMs] — screenshots every frame of one explainer/lab box (.xp)
const { chromium } = require('playwright');
(async () => {
  const [mid, step, xi, wait] = [process.argv[2], process.argv[3], +process.argv[4], +(process.argv[5] || 1600)];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${mid}/${step}`); await p.waitForTimeout(700);
  const x = p.locator('.step-b > .xp').nth(xi); await x.scrollIntoViewIfNeeded(); await p.waitForTimeout(wait);
  const nb = x.locator('.xp-ctl .btn-primary'); const n = await x.locator('.dots i').count();
  for (let i = 1; i <= Math.max(1, n); i++) {
    await x.screenshot({ path: `tests/out/${mid}-s${step}-x${xi}-f${i}.png` });
    if (i < n) { await nb.click(); await p.waitForTimeout(wait); }
  }
  console.log('frames', n);
  await b.close();
})();
