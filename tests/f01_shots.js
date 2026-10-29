// Screenshots every step of Mission F1 (node tests/f01_shots.js [width] [theme] [steps]) → tests/out/f01_<theme>_<n>.png
const { chromium } = require('playwright');
const W = Number(process.argv[2] || 1280), TH = process.argv[3] || 'dark', ONLY = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/?preview=1#/'); await p.evaluate(t => { try { localStorage.setItem('rl-theme', t); } catch (e) {} RL.setTheme && RL.setTheme(t); }, TH);
  const n = await p.evaluate(() => RL.guides.f01.steps.length);
  for (let i = 1; i <= n; i++) {
    if (ONLY.length && !ONLY.includes(i)) continue;
    await p.goto('http://localhost:8765/?preview=1#/m/f01/' + i); await p.waitForTimeout(2500);
    await p.screenshot({ path: `tests/out/f01_${TH}_${i}.png`, fullPage: true });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
