// Opens every "See a solution" pop-up in the Arduino missions, then runs each solution in the mission's
// final Virtual UNO for a few seconds and reports compile/run errors.   node tests/solutions_check.js [m03]
const { chromium } = require('playwright');
const ONLY = process.argv[2];
const FINAL = { m01: 'crosswalk', m02: 'mood_lamp', m03: 'arcade_synth', m04: 'weather_gauge', m05: 'parking', m06: 'fortune_teller', m07: 'turntable', m08: 'smart_fan', m09: 'reaction_timer' };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let problems = 0;
  for (const m of Object.keys(FINAL)) {
    if (ONLY && m !== ONLY) continue;
    // find the step with the challenges and the step with the final sim
    let chalStep = 0, simStep = 0;
    for (let s = 1; s <= 16; s++) {
      await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + s); await p.waitForTimeout(500);
      if (await p.locator('.chal-sol').count()) chalStep = s;
      const sims = await p.locator('.sim h3').allTextContents();
      if (sims.length) simStep = s;   // the last step with a sim before the challenges
      if (chalStep) break;
    }
    await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + chalStep); await p.waitForTimeout(700);
    const n = await p.locator('.chal-sol').count();
    const sols = [];
    for (let i = 0; i < n; i++) {
      await p.locator('.chal-sol').nth(i).click(); await p.waitForTimeout(200);
      const title = await p.locator('#modal h2').textContent();
      const lines = await p.locator('#modal .ln').count(), added = await p.locator('#modal .ln.add').count();
      const code = await p.locator('#modal .ln').evaluateAll(ls => ls.map(l => l.textContent === ' ' ? '' : l.textContent).join('\n'));
      if (i === 0) await p.locator('#modal .modal-box').screenshot({ path: `tests/out/sol_${m}.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      if (await p.locator('#modal').count()) { console.log(m, 'modal did not close'); problems++; }
      sols.push({ title, code, lines, added });
    }
    console.log(`${m}: challenges on step ${chalStep}, ${n} solutions; final sim on step ${simStep}`);
    // run each solution in the final sim
    await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + simStep); await p.waitForTimeout(900);
    const sim = p.locator('.sim').last();
    for (const s of sols) {
      await sim.locator('textarea').evaluate((ta, c) => { ta.value = c; ta.dispatchEvent(new Event('input')); }, s.code);
      const before = errs.length;
      await sim.getByRole('button', { name: 'Upload & run' }).click(); await p.waitForTimeout(2500);
      const msg = (await sim.locator('.sim-msg').textContent()) || '';
      const cls = await sim.locator('.sim-msg').getAttribute('class');
      const bad = /err/.test(cls) || errs.length > before;
      if (bad) problems++;
      console.log(`  ${bad ? 'PROBLEM' : 'ok     '} ${s.title.padEnd(28)} ${String(s.lines).padStart(3)} lines, ${String(s.added).padStart(3)} new  ${bad ? msg.slice(0, 200) + ' ' + errs.slice(before).join(' | ') : ''}`);
      const stop = sim.getByRole('button', { name: 'Stop', exact: true });
      if (await stop.isEnabled()) await stop.click();
      await p.waitForTimeout(200);
    }
  }
  console.log(problems ? problems + ' problem(s)' : 'all good', errs.length ? '\npage errors: ' + errs.join(' | ') : '');
  await b.close();
})();
