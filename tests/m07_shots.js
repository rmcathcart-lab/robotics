// node tests/m06_shots.js [mission] [steps e.g. 2,3] [frames=1] — element screenshots of every explainer frame,
// lab, build guide (every step) and Virtual UNO, into tests/out/<m>-sNN-<kind><i>[-fK].png. Reports page errors.
const { chromium } = require('playwright');
(async () => {
  const M = process.argv[2] || 'm06';
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  const frames = process.argv[4] !== '0';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) console.log('console:', m.text()); });
  await p.goto('http://localhost:8765/index.html?preview=1#/m/' + M + '/1'); await p.waitForTimeout(600);
  const n = await p.evaluate(m => RL.guides[m].steps.length, M);
  for (let i = 1; i <= n; i++) {
    if (only && only.indexOf(i) < 0) continue;
    await p.goto('http://localhost:8765/index.html?preview=1#/m/' + M + '/' + i); await p.waitForTimeout(500);
    const tag = `${M}-s${String(i).padStart(2, '0')}`;
    const xps = p.locator('.step-b > .xp, .step-b > .bg, .step-b > .sim, .step-b details > .xp');
    const cnt = await xps.count();
    for (let k = 0; k < cnt; k++) {
      const x = xps.nth(k); await x.scrollIntoViewIfNeeded(); await p.waitForTimeout(700);
      const cls = await x.getAttribute('class');
      if (/\bbg\b/.test(cls)) {
        const tot = Number((await x.locator('.bg-ctl .label').innerText()).split('/')[1]);
        for (let s = 0; s < tot; s++) { await p.waitForTimeout(1300); await x.screenshot({ path: `tests/out/${tag}-guide${k}-${s + 1}.png` }); if (s < tot - 1) await x.locator('text=Next →').click(); }
      } else if (/\bsim\b/.test(cls)) {
        await x.locator('text=Upload').click(); await p.waitForTimeout(1500);
        await x.screenshot({ path: `tests/out/${tag}-sim${k}.png` });
        await x.getByRole('button', { name: 'Stop', exact: true }).click();
      } else {
        const nf = await x.locator('.dots i').count();
        if (!frames || nf <= 1) { await p.waitForTimeout(1500); await x.screenshot({ path: `tests/out/${tag}-xp${k}.png` }); continue; }
        for (let f = 0; f < nf; f++) { await p.waitForTimeout(2200); await x.screenshot({ path: `tests/out/${tag}-xp${k}-f${f + 1}.png` }); if (f < nf - 1) await x.locator('.xp-ctl >> text=Next →').click(); }
      }
    }
    console.log('step', i, cnt, 'blocks');
  }
  console.log(errs.length ? 'PAGE ERRORS: ' + errs.length : 'no page errors');
  await b.close();
})();
