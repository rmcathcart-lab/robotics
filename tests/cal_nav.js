// The calendar's month header, ‹ Today › arrows and big month names while scrolling (mock backend from run_e2e.sh).
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8790/teacher/?key=testkey'); await p.waitForTimeout(1200);
  await p.click('.dash-tabs >> text=Calendar'); await p.waitForTimeout(900);
  console.log('month:', await p.locator('.calv-month').innerText());
  await p.evaluate(() => { const s = document.querySelector('.calv-scroll'); s.scrollTop += 300; });
  await p.waitForTimeout(150);
  console.log('scrolling class:', await p.evaluate(() => document.querySelector('.calv').className));
  await p.screenshot({ path: 'tests/out/f-cal-scroll.png' });
  await p.waitForTimeout(900);
  console.log('after stop:', await p.evaluate(() => document.querySelector('.calv').className), await p.locator('.calv-month').innerText());
  await p.click('.calv-mon[title="Next month"]'); await p.waitForTimeout(900); console.log('next:', await p.locator('.calv-month').innerText());
  await p.click('.calv-mon[title="Previous month"]'); await p.click('.calv-mon[title="Previous month"]'); await p.waitForTimeout(1000); console.log('prev x2:', await p.locator('.calv-month').innerText());
  await br.close();
})();
