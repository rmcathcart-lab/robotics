// Screenshots the last frame of every build guide, whole-board view → tests/out/bb_<mission>_<n>.png
const { chromium } = require('playwright');
(async () => {
  const ONLY = process.argv[2] || ''; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: ONLY ? 3 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/'); await p.waitForTimeout(600);
  const counts = await p.evaluate(() => Object.fromEntries(Object.keys(RL.guides).filter(k => /^m/.test(k)).map(k => [k, RL.guides[k].steps.length])));
  for (const [m, n] of Object.entries(counts)) for (let i = 1; i <= n; i++) { if (ONLY && !ONLY.split(',').includes(m + '/' + i)) continue;
    await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + i); await p.waitForTimeout(400);
    const g = await p.locator('.bg').count();
    for (let k = 0; k < g; k++) {
      const box = p.locator('.bg').nth(k); await box.scrollIntoViewIfNeeded();
      await box.locator('.bg-zoom button').click();
      for (let j = 0; j < 40; j++) { const nb = box.locator('.bg-ctl .btn-primary'); if ((await nb.innerText()).includes('Start over')) break; await nb.click(); }
      await p.waitForTimeout(1600);
      await box.locator('.bg-stage').screenshot({ path: `tests/out/bb_${m}_${i}_${k}.png` });
    }
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
