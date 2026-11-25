// node tests/board_shots.js m08 -> screenshots the board of every Virtual UNO in a mission: tests/out/board_<m>_<step>_<i>.png
const { chromium } = require('playwright');
const M = process.argv[2];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (let s = 1; s <= 14; s++) {
    await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + s); await p.waitForTimeout(700);
    const sims = p.locator('.sim .sim-board, .sim .board');
    const n = await sims.count();
    for (let i = 0; i < n; i++) { await sims.nth(i).scrollIntoViewIfNeeded(); await sims.nth(i).screenshot({ path: `tests/out/board_${M}_${s}_${i}.png` }); console.log('shot', s, i); }
  }
  console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
