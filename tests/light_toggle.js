// Light ↔ dark: drawings switch both ways, a Virtual UNO still runs and passes in light mode.
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/m01/3'); await p.waitForTimeout(900);
  const count = (c) => p.evaluate(c => document.querySelectorAll('.ms-main svg [fill="' + c + '"]').length, c);
  console.log('dark: navy fills', await count('#070d17'), 'light fills', await count('#f7f9fc'));
  await p.evaluate(() => RL.setTheme('light')); await p.waitForTimeout(400);
  console.log('light: navy fills', await count('#070d17'), 'light fills', await count('#f7f9fc'));
  await p.evaluate(() => RL.setTheme('dark')); await p.waitForTimeout(400);
  console.log('dark again: navy fills', await count('#070d17'), 'light fills', await count('#f7f9fc'));
  await p.evaluate(() => RL.setTheme('light'));
  await p.goto('http://localhost:8765/?preview=1#/m/m01/9'); await p.waitForTimeout(900);
  const sim = p.locator('.sim').first(); await sim.scrollIntoViewIfNeeded();
  const t0 = Date.now(); await sim.locator('text=Check my code').click();
  for (let i = 0; i < 80; i++) { const m = await sim.locator('.sim-msg').innerText(); if (/PASS|RETRY|error/i.test(m)) { console.log('light sim:', m.split('\n')[0], (Date.now() - t0) + ' ms'); break; } await p.waitForTimeout(250); }
  await p.evaluate(() => RL.setTheme('dark'));
  await br.close();
})();
