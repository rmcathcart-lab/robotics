// Equipment → "Email Carla for orders": the linked list + total go on the clipboard (mock backend from run_e2e.sh).
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const T = await ctx.newPage(); T.on('pageerror', e => console.log('pageerror:', e.message));
  await T.goto('http://localhost:8790/teacher/?key=testkey'); await T.waitForTimeout(1200);
  await T.click('.dash-tabs >> text=Equipment'); await T.waitForTimeout(600);
  console.log('bar:', (await T.locator('.eq-bar').innerText()).replace(/\n/g, ' | '));
  await T.evaluate(() => { window.__mail = null; const d = Object.getOwnPropertyDescriptor(Location.prototype, 'href'); });
  T.on('request', r => { if (r.url().startsWith('mailto:')) console.log('mailto request'); });
  await T.click('.eq-bar >> text=Email Carla for orders'); await T.waitForTimeout(800);
  const clip = await T.evaluate(async () => { const it = await navigator.clipboard.read(); const out = {}; for (const i of it) for (const t of i.types) out[t] = await (await i.getType(t)).text(); return out; });
  console.log('plain:\n' + clip['text/plain']);
  console.log('html:', clip['text/html'].slice(0, 400));
  await br.close();
})();
