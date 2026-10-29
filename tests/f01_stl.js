const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/f01/10'); await p.waitForTimeout(800);
  for (const f of ['tag.stl', 'tag_cm_open.stl']) {
    await p.locator('.fx-lab input[type=file]').setInputFiles('tests/fixtures/' + f); await p.waitForTimeout(1500);
    console.log(f, '→', (await p.locator('.fx-lab .fx-labinfo').innerText()).replace(/\n/g, ' | '));
  }
  await p.locator('.fx-lab').screenshot({ path: 'tests/out/lab_stl.png' });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
