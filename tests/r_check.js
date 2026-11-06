// Runs "Check my code" on the virtual cars of a mission step (optionally with replacement code).
// node tests/r_check.js r02 3 [simIndex] [codeFile]
const { chromium } = require('playwright'); const fs = require('fs');
const [M, STEP, IDX, FILE] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(1200);
  const n = await p.locator('.sim').count();
  const list = IDX != null && IDX !== '' && IDX !== 'all' ? [Number(IDX)] : [...Array(n).keys()];
  for (const i of list) {
    const sim = p.locator('.sim').nth(i); await sim.scrollIntoViewIfNeeded();
    if (FILE) { const code = fs.readFileSync(FILE, 'utf8'); await sim.locator('textarea').evaluate((ta, c) => { ta.value = c; ta.dispatchEvent(new Event('input')); }, code); }
    const btn = sim.locator('text=Check my code');
    if (!(await btn.count())) { await sim.locator('text=Upload & run').click(); await p.waitForTimeout(3000); console.log(i, 'run:', (await sim.locator('.sim-msg').textContent()).slice(0, 160)); continue; }
    await btn.click();
    let msg = '';
    for (let k = 0; k < 300; k++) { await p.waitForTimeout(500); msg = await sim.locator('.sim-msg').textContent(); if (/PASS|RETRY|error/i.test(msg) && !/Checking/.test(msg)) break; }
    console.log(i, msg.slice(0, 220));
    await sim.screenshot({ path: `tests/out/rc_${M}_${STEP}_${i}.png` });
  }
  console.log(errs.join('\n') || 'no page errors'); await b.close();
})();
