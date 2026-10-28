// node tests/steps.js [from] [to] [width] — screenshots every Mission 01 step (preview mode)
const { chromium } = require('playwright');
(async () => {
  const [from, to, w] = [+(process.argv[2] || 1), +(process.argv[3] || 13), +(process.argv[4] || 1280)];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL/.test(m.text())) console.log('console:', m.text()); });
  await p.goto('http://localhost:8765/index.html#/m/m01/' + from); await p.waitForTimeout(800);
  for (let i = from; i <= to; i++) {
    await p.goto('http://localhost:8765/index.html#/m/m01/' + i); await p.waitForTimeout(400);
    // scroll through so explainers start
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(150); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
    await p.screenshot({ path: `tests/out/step${String(i).padStart(2, '0')}-${w}.png`, fullPage: true });
    console.log('step', i, 'height', h);
  }
  await b.close();
})();
