const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const T = await b.newPage({ viewport: { width: 1360, height: 900 } });
  T.on('pageerror', e => console.log('pageerror:', e.message));
  await T.goto('http://localhost:8790/teacher/?key=testkey'); await T.waitForTimeout(1500);
  await T.click('.dash-tabs >> text=Equipment'); await T.waitForTimeout(800);
  console.log('cards', await T.locator('.eq-card').count(), '|', await T.locator('.eq-bar .small').first().innerText());
  const href = await T.getAttribute('.eq-bar a.btn-primary', 'href');
  console.log(decodeURIComponent(href).slice(0, 700));
  await T.screenshot({ path: 'tests/out/t-equip.png', fullPage: false });
  await b.close();
})();
