// clicks an option of the first checkpoint whose question contains TEXT, then reloads and shows what is remembered
const { chromium } = require('playwright');
const [M, STEP, TEXT, OPT] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let st = Number(STEP);
  for (; st < 20; st++) { await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + st); await p.waitForTimeout(600); if (await p.locator('.chk', { hasText: TEXT }).count()) break; }
  console.log('step', st);
  const q = p.locator('.chk', { hasText: TEXT }).first();
  console.log('order:', (await q.locator('.chk-opt').allTextContents()).join(' | '));
  await q.locator('.chk-opt', { hasText: OPT }).click(); await p.waitForTimeout(200);
  console.log('feedback:', (await q.locator('.chk-fb').textContent()).slice(0, 80));
  await p.reload(); await p.waitForTimeout(900);
  const q2 = p.locator('.chk', { hasText: TEXT }).first();
  console.log('after reload: right =', await q2.locator('.chk-opt.right').allTextContents(), 'wrong =', await q2.locator('.chk-opt.wrong').allTextContents());
  console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
