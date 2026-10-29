// node tests/m08_labs.js — drives the Mission 08 labs (H-bridge lab, PWM lab)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m08/3'); await p.waitForTimeout(700);
  const lab = p.locator('.xp', { hasText: 'The H-bridge lab' }); await lab.scrollIntoViewIfNeeded();
  const btn = t => lab.locator('.res-pills button', { hasText: t });
  const fan = async () => (await lab.locator('.readouts > div').first().innerText()).replace(/\s+/g, ' ');
  console.log('start:', await fan());
  await btn('IN1').click(); console.log('IN1 low:', await fan());
  await btn('IN2').click(); console.log('IN2 high:', await fan());
  await btn('ENABLE').click(); console.log('EN low:', await fan());
  await btn('ENABLE').click(); await btn('IN2').click(); console.log('both low:', await fan());
  await p.waitForTimeout(800); await lab.screenshot({ path: 'tests/out/m08-lab-hb.png' });
  await p.goto('http://localhost:8765/index.html?preview=1#/m/m08/6'); await p.waitForTimeout(700);
  const pw = p.locator('.xp', { hasText: 'PWM on the enable pin' }); await pw.scrollIntoViewIfNeeded();
  const r = pw.locator('input[type=range]');
  for (const v of [40, 70, 30, 255]) { await r.fill(String(v)); console.log('pwm', v, (await pw.locator('.readouts').innerText()).replace(/\s+/g, ' ')); }
  console.log('page errors:', errs.length);
  await b.close();
})();
