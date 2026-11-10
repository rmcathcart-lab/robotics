// node tests/el_shot.js m03 7 ".m3-map" out.png [nth] [theme]
const { chromium } = require('playwright');
const [M, STEP, SEL, OUT, NTH, THEME] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: THEME || 'dark' });
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(1000);
  const e = p.locator(SEL).nth(Number(NTH || 0)); await e.scrollIntoViewIfNeeded(); await e.screenshot({ path: OUT }); await b.close(); })();
