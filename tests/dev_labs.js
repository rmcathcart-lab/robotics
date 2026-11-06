const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/tests/dev_labs.html'); await p.waitForTimeout(4000);
  const labs = p.locator('.fx-lab');
  for (let i = 0; i < await labs.count(); i++) { await labs.nth(i).scrollIntoViewIfNeeded(); await p.waitForTimeout(700); await labs.nth(i).screenshot({ path: 'tests/out/lab2_' + i + '.png' }); }
  console.log(await p.evaluate(() => JSON.stringify(store)).catch(e => e.message));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
