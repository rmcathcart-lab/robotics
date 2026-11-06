const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/tests/dev_car.html'); await p.waitForTimeout(800);
  await p.click('text=Upload & run'); await p.waitForTimeout(5500);
  console.log(await p.evaluate(() => JSON.stringify({ pose: api.world.pose(), bumps: api.world.bumps(), serial: api.serialText().slice(0, 200), led: api.world.led(), msg: document.querySelector('.sim-msg').textContent })));
  await p.locator('.sim').screenshot({ path: 'tests/out/car_dev.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
