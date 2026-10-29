// Steps through every Fusion walk-through in F1 and saves a contact sheet per step → tests/out/walk_<step>.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const list = (process.argv[2] || '2,6,7,8,9,10').split(',').map(Number);
  for (const st of list) {
    await p.goto('http://localhost:8765/?preview=1#/m/f01/' + st); await p.waitForTimeout(600);
    const boxes = await p.locator('.fx-shots').count();
    for (let k = 0; k < boxes; k++) {
      const box = p.locator('.fx-shots').nth(k); await box.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
      const n = await box.locator('.dots i').count();
      for (let i = 0; i < n; i++) {
        if (i) await box.locator('.btn-primary').click();
        await p.waitForTimeout(5200);
        await box.locator('.fx-stage').screenshot({ path: `tests/out/w_${st}_${k}_${i}.png` });
      }
    }
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
