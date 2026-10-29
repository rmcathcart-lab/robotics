// Screenshots of every drawing (explainers, labs, build guides, Virtual UNOs, hotspots) in the light display, per mission:
// tests/out/light/<mission>-<step>-<n>.png. node tests/light_shots.js [mNN]
const { chromium } = require('playwright'); const fs = require('fs');
const only = process.argv[2];
(async () => {
  fs.mkdirSync('tests/out/light', { recursive: true });
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rl/theme', 'light'); } catch (e) {} });
  await p.goto('http://localhost:8765/?preview=1#/'); await p.waitForTimeout(600);
  await p.screenshot({ path: 'tests/out/light/home.png' });
  const counts = await p.evaluate(() => Object.fromEntries(Object.keys(RL.guides).map(k => [k, RL.guides[k].steps.length])));
  for (const [m, n] of Object.entries(counts)) {
    if (only && m !== only) continue;
    for (let i = 1; i <= n; i++) {
      await p.goto('http://localhost:8765/?preview=1#/m/' + m + '/' + i); await p.waitForTimeout(700);
      const els = await p.$$('.ms-main .xp, .ms-main .sim, .ms-main .bg, .ms-main .gear');
      for (let k = 0; k < els.length; k++) { await els[k].scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await els[k].screenshot({ path: 'tests/out/light/' + m + '-' + String(i).padStart(2, '0') + '-' + k + '.png' }); }
    }
  }
  await br.close();
})();
