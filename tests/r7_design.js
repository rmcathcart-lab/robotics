const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/r07/6'); await p.waitForTimeout(1200);
  // remove the wall between (1,1) and (2,1) to change the maze
  await p.locator('.xp').first().screenshot({ path: 'tests/out/r7_designer.png' });
  await p.getByRole('button', { name: 'Test it with the virtual car' }).click(); await p.waitForTimeout(800);
  const sim = p.locator('.sim').first(); await sim.locator('text=Check my code').click();
  let msg = ''; for (let k = 0; k < 340; k++) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').textContent(); if (/PASS|RETRY|error/i.test(msg) && !/Checking/.test(msg)) break; }
  console.log(msg); console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
