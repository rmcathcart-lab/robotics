// Run after tests/run_e2e.sh (uses its class): a student hands in F1 (.f3d + .stl + screenshot), the teacher opens it.
const { chromium } = require('playwright');
const B = 'http://localhost:8790', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const log = p => { p.on('pageerror', e => console.log('pageerror:', e.message)); p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|fonts/.test(m.text())) console.log('console:', m.text()); }); };
  const S = await br.newPage({ viewport: { width: 1280, height: 900 } }); log(S);
  await S.goto(B + '/index.html?c=robotics-a'); await sleep(500);
  await S.click('text=Next'); await sleep(800); await S.click('text=Grace Hopper'); await sleep(300);
  await S.fill('#pin', '4321'); await S.fill('#pin2', '4321'); await S.click('text=Save PIN'); await sleep(1500);
  await S.goto(B + '/index.html#/m/f01/12'); await sleep(1000);
  await S.setInputFiles('#f-f3d', 'tests/fixtures/tag.stl'); await sleep(300); // wrong type: refused
  console.log('wrong file toast:', await S.locator('.toast').last().innerText().catch(() => 'none'));
  await S.setInputFiles('#f-f3d', 'tests/fixtures/keychain.f3d'); await S.setInputFiles('#f-stl', 'tests/fixtures/tag.stl'); await S.setInputFiles('#f-shot', 'tests/fixtures/photo.png'); await sleep(800);
  for (const q of ['r1', 'r2', 'r3', 'r4']) await S.fill('#rq-' + q, 'Answer for ' + q);
  await S.click('text=Submit my work');
  for (let i = 0; i < 40; i++) { await sleep(500); if (await S.locator('.sub-status').count()) break; }
  console.log('student status:', (await S.locator('.sub-status').innerText().catch(() => 'none')).replace(/\n/g, ' | '));
  const T = await br.newPage({ viewport: { width: 1360, height: 900 } }); log(T);
  await T.goto(B + '/teacher/?key=testkey'); await sleep(1500); await T.click('.dash-tabs >> text=Submissions'); await sleep(800);
  await T.locator('.tbl tbody tr', { hasText: 'Grace' }).first().click(); await sleep(4000);
  console.log('grade title:', await T.locator('.modal h2').innerText());
  console.log('files:', (await T.locator('.g-file').allInnerTexts()).map(s => s.replace(/\n/g, ' ').slice(0, 120)).join(' || '));
  console.log('3D canvas in grading view:', await T.locator('.g-file canvas').count());
  await T.screenshot({ path: 'tests/out/t-grade-f01.png' });
  await br.close();
})();
