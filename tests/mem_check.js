// Runs Mission 05's millis() sim (no delay) for 20 s and reports JS heap growth.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/m05/' + (process.argv[2] || '7'));
  await p.waitForTimeout(1500);
  const btn = await p.$$('.sim-ctl .btn-primary');
  if (!btn.length) { console.log('no run button'); await b.close(); return; }
  await btn[btn.length - 1].click();
  const heap = async () => { await p.evaluate(() => window.gc && window.gc()); return p.evaluate(() => performance.memory.usedJSHeapSize / 1e6); };
  await p.waitForTimeout(2000); const a = await heap();
  await p.waitForTimeout(20000); const z = await heap();
  console.log('heap MB after 2 s:', a.toFixed(1), ' after 22 s:', z.toFixed(1));
  await b.close();
})();
