// node tests/guide_steps.js m08 7 [guideIndex] -> screenshots every step of a build guide: tests/out/guide_<m>_<step>_<k>.png
const { chromium } = require('playwright');
const [M, STEP, IDX] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(900);
  const g = p.locator('.bg').nth(Number(IDX || 0)); await g.scrollIntoViewIfNeeded();
  for (let k = 0; k < 14; k++) { await p.waitForTimeout(900); await g.screenshot({ path: `tests/out/guide_${M}_${STEP}_${k}.png` }); const n = g.getByRole('button', { name: /Next/ }); if (!(await n.count()) || await n.isDisabled()) break; await n.click(); }
  console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
