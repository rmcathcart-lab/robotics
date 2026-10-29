// node tests/m08_guides.js <mission> <step> [guideIndex] [prefix] — clicks through a build guide, screenshotting every sub-step
const { chromium } = require('playwright');
(async () => {
  const [mid, step, gi, prefix] = [process.argv[2] || 'm08', process.argv[3] || '4', +(process.argv[4] || 0), process.argv[5] || 'g'];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${mid}/${step}`); await p.waitForTimeout(700);
  const g = p.locator('.bg').nth(gi); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  const n = +(await g.locator('.bg-ctl .label').innerText()).split('/')[1];
  for (let i = 1; i <= n; i++) {
    await p.waitForTimeout(1500);
    await g.screenshot({ path: `tests/out/${mid}-${prefix}${String(i).padStart(2, '0')}.png` });
    if (i < n) await g.locator('text=Next →').click();
  }
  // the whole board, larger
  await g.locator('.bg-zoom button').click(); await p.waitForTimeout(900);
  await g.locator('.bg-stage svg').screenshot({ path: `tests/out/${mid}-${prefix}-whole.png` });
  console.log('steps', n);
  await b.close();
})();
