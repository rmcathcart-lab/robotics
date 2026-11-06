// node tests/xp_frames.js r08 3 [explainerIndex] → screenshots each frame of an explainer
const { chromium } = require('playwright');
const [M, STEP, IDX] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(1200);
  const xp = p.locator('.xp').nth(Number(IDX || 0)); await xp.scrollIntoViewIfNeeded();
  for (let i = 0; i < 6; i++) { await xp.screenshot({ path: `tests/out/xp_${M}_${STEP}_${i}.png` }); const n = xp.locator('button:has-text("Next")'); if (!(await n.count()) || await n.isDisabled()) break; await n.click(); await p.waitForTimeout(300); }
  await b.close(); })();
