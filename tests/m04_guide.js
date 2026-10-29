// node tests/m04_guide.js [mission] [step] [guideIndex] — clicks through a build guide and screenshots every step
// e.g. node tests/m04_guide.js m04 3 0  → tests/out/m04-g3-01.png …
const { chromium } = require('playwright');
(async () => {
  const M = process.argv[2] || 'm04', step = +(process.argv[3] || 3), gi = +(process.argv[4] || 0);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${step}`); await p.waitForTimeout(900);
  const g = p.locator('.bg').nth(gi); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const n = Number((await g.locator('.bg-ctl .label').innerText()).split('/')[1]);
  for (let i = 1; i <= n; i++) {
    await p.waitForTimeout(1700);
    await g.screenshot({ path: `tests/out/${M}-g${step}-${String(i).padStart(2, '0')}.png` });
    if (i < n) await g.locator('text=Next →').click();
  }
  // whole board at the end
  await g.locator('.bg-zoom button').click(); await p.waitForTimeout(900);
  await g.locator('.bg-stage').screenshot({ path: `tests/out/${M}-g${step}-all.png` });
  console.log('guide steps', n);
  await b.close();
})();
