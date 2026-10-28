// End-to-end test against backend/mock_server.js (start it first: node backend/mock_server.js 8790)
const { chromium } = require('playwright');
const B = 'http://localhost:8790';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const T = await br.newPage({ viewport: { width: 1360, height: 900 } });
  const log = p => { p.on('pageerror', e => console.log('pageerror:', e.message)); p.on('dialog', d => d.accept()); p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|fonts/.test(m.text())) console.log('console:', m.text()); }); };
  log(T);
  // teacher creates a class
  await T.goto(B + '/teacher/?key=testkey'); await sleep(1200);
  await T.fill('input[placeholder^="Class code"]', 'robotics-a');
  await T.fill('input[placeholder^="Name, e.g."]', 'Robotics · Block A');
  await T.fill('textarea[placeholder^="Student names"]', 'Ada Lovelace\nGrace Hopper\nAlan Turing');
  await T.click('text=Create class'); await sleep(1500);
  console.log('roster rows:', await T.locator('.tbl tbody tr').count());
  // calendar
  await T.click('.dash-tabs >> text=Calendar'); await sleep(500);
  const d = new Date(); d.setDate(d.getDate() - 1); const iso = d.toISOString().slice(0, 10);
  await T.fill('input[type=date]', iso); await T.click('text=Create calendar'); await sleep(1500);
  await T.locator('.mrow').first().locator('button[title="One class longer"]').click(); await sleep(1200);
  console.log('first mission row:', await T.locator('.mrow').first().innerText());
  await T.screenshot({ path: 'tests/out/t-calendar.png' });

  // student signs in
  const S = await br.newPage({ viewport: { width: 1280, height: 900 } }); log(S);
  await S.goto(B + '/index.html?c=robotics-a'); await sleep(500);
  await S.click('text=Next'); await sleep(800);
  await S.click('text=Ada Lovelace'); await sleep(300);
  await S.fill('#pin', '1234'); await S.fill('#pin2', '1234'); await S.click('text=Save PIN'); await sleep(1500);
  console.log('home head:', (await S.locator('.home-head').innerText()).replace(/\n/g, ' | '));
  await S.screenshot({ path: 'tests/out/s-home.png' });
  await S.click('.cal-btn'); await sleep(800); await S.screenshot({ path: 'tests/out/s-calendar.png' }); await S.keyboard.press('Escape');
  // mission progress
  await S.click('.mcard.ready'); await sleep(800);
  await S.click('text=Done — next step'); await sleep(500);
  await S.click('text=Done — next step'); await sleep(500);
  await S.locator('.chk-opt').nth(1).click(); await sleep(3500);
  // teacher live
  await T.click('.dash-tabs >> text=Live'); await sleep(11000);
  console.log('live:', (await T.locator('.lcard').first().innerText()).replace(/\n/g, ' | '));
  await T.screenshot({ path: 'tests/out/t-live.png' });
  // submit
  await S.goto(B + '/index.html#/m/m01/13'); await sleep(1000);
  await S.setInputFiles('#f-photos', 'tests/fixtures/photo.png'); await sleep(800);
  await S.setInputFiles('#f-video', 'tests/fixtures/big.mp4'); await sleep(600);
  await S.click('text=Paste code instead'); await S.fill('.ev-paste', 'void setup() {}\nvoid loop() {}\n');
  for (const q of ['r1', 'r2', 'r3', 'r4']) await S.fill('#rq-' + q, 'Answer for ' + q);
  await S.click('text=Submit my work');
  for (let i = 0; i < 40; i++) { await sleep(500); if (await S.locator('.sub-status').count()) break; }
  console.log('student status:', (await S.locator('.sub-status').innerText().catch(() => 'none')).replace(/\n/g, ' | '));
  await S.screenshot({ path: 'tests/out/s-submitted.png', fullPage: false });
  // teacher grades
  await T.click('.dash-tabs >> text=Submissions'); await sleep(1500);
  await T.click('text=Refresh').catch(() => {});
  await T.reload(); await sleep(1500); await T.click('.dash-tabs >> text=Submissions'); await sleep(600);
  console.log('subs rows:', await T.locator('.tbl tbody tr').count());
  await T.locator('.tbl tbody tr').first().click(); await sleep(2500);
  await T.screenshot({ path: 'tests/out/t-grade.png' });
  const rows = T.locator('.crit-g .row');
  for (let i = 0; i < await rows.count(); i++) await rows.nth(i).locator('.lvls button').nth(3).click();
  await T.fill('.g-side textarea', 'Great wiring. Add comments to your code.');
  await T.click('text=Save grade'); await sleep(1500);
  console.log('grade msg:', await T.locator('.g-acts .small').innerText().catch(() => '?'));
  // student sees feedback
  await S.reload(); await sleep(2000);
  console.log('after grade:', (await S.locator('.sub-status').innerText()).replace(/\n/g, ' | '));
  await S.screenshot({ path: 'tests/out/s-graded.png' });
  await T.keyboard.press('Escape'); await T.click('.dash-tabs >> text=Progress'); await sleep(500); await T.screenshot({ path: 'tests/out/t-progress.png' });
  await br.close();
})();
