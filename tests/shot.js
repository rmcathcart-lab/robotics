// usage: node tests/shot.js <url> <out.png> [width] [height] [fullPage]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w, h, full] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +(w || 1280), height: +(h || 900) } });
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.screenshot({ path: out, fullPage: full === '1' }); await b.close();
})();
