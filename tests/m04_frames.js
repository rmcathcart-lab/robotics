// node tests/m04_frames.js [mission] [steps…] — screenshots every frame of every explainer on the given steps
// → tests/out/<m>-x<step>-<explainer>-<frame>.png
const { chromium } = require('playwright');
(async () => {
  const M = process.argv[2] || 'm04', steps = process.argv.slice(3).map(Number);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (const s of steps) {
    await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${s}`); await p.waitForTimeout(700);
    const xs = p.locator('.xp');
    const n = await xs.count();
    for (let k = 0; k < n; k++) {
      const x = xs.nth(k); await x.scrollIntoViewIfNeeded(); await p.waitForTimeout(700);
      const dots = await x.locator('.xp-ctl .dots i').count();
      const frames = Math.max(1, dots);
      for (let f = 0; f < frames; f++) {
        await p.waitForTimeout(f === 0 ? 1200 : 2200);
        await x.screenshot({ path: `tests/out/${M}-x${s}-${k + 1}-${f + 1}.png` });
        if (f < frames - 1) await x.locator('.xp-ctl button:has-text("Next")').click();
      }
      console.log('step', s, 'block', k + 1, 'frames', frames);
    }
  }
  if (errs.length) console.log('PAGE ERRORS', errs);
  await b.close();
})();
