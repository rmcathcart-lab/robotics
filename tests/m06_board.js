// node tests/m06_board.js <mission> <stepNo> <guideIndex> — big render of a build guide's last step (all parts) for checking holes
const { chromium } = require('playwright');
(async () => {
  const [M, st, gi, out, view] = [process.argv[2] || 'm06', process.argv[3] || '3', +(process.argv[4] || 0), process.argv[5] || 'board', process.argv[6]];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 1400 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${st}`); await p.waitForTimeout(800);
  const g = p.locator('.bg').nth(gi); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const tot = Number((await g.locator('.bg-ctl .label').innerText()).split('/')[1]);
  for (let i = 1; i < tot; i++) { await g.locator('text=Next →').click(); await p.waitForTimeout(100); }
  await g.locator('text=Whole board').click().catch(() => {});
  await p.waitForTimeout(1500);
  await p.evaluate((v) => { const s = document.querySelectorAll('.bg')[0].ownerDocument.querySelectorAll('.bg svg'); const svg = s[s.length > 1 ? 0 : 0]; }, view);
  const svg = g.locator('.bg-stage svg');
  await p.evaluate(([gi, v]) => { const svg = document.querySelectorAll('.bg')[gi].querySelector('.bg-stage svg'); const host = document.createElement('div'); host.id = 'big'; host.style.cssText = 'position:fixed;left:0;top:0;width:1800px;background:#0a1220;z-index:9999'; const c = svg.cloneNode(true); if (v) c.setAttribute('viewBox', v); c.style.width = '1800px'; c.style.height = 'auto'; host.appendChild(c); document.body.appendChild(host); }, [gi, view]);
  await p.waitForTimeout(2500);
  await p.locator('#big').screenshot({ path: `tests/out/${M}-${out}.png` });
  await b.close();
})();
