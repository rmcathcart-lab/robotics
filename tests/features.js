// Roster (PowerSchool template, levels), Comments, Equipment, Calendar and the light display, against the mock backend
// left running by tests/run_e2e.sh (run that first).
const { chromium } = require('playwright');
const B = 'http://localhost:8790', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const T = await br.newPage({ viewport: { width: 1280, height: 900 } });
  T.on('pageerror', e => console.log('pageerror:', e.message)); T.on('dialog', d => d.accept());
  await T.goto(B + '/teacher/?key=testkey'); await sleep(1200);
  await T.click('.dash-tabs >> text=Roster'); await sleep(800);
  const wide = async (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log('roster overflow @1280:', await wide(T));
  await T.setInputFiles('.rpanel .file-btn input', 'tests/fixtures/ps_dtfi25.csv'); await sleep(400);
  console.log('preview:', (await T.locator('.ps-preview').innerText()).replace(/\n/g, ' | '));
  await T.click('text=Update the class list'); await sleep(1800);
  const rows = await T.$$eval('.rtbl tbody tr', trs => trs.map(tr => [tr.querySelector('.rn').innerText, tr.querySelector('.rl select').value, tr.querySelector('.rnum input').value].join(' / ')));
  console.log('roster:', rows.join(' ; '));
  await T.selectOption('.rtbl tbody tr:nth-child(1) .rp select', 'she'); await sleep(900);
  await T.screenshot({ path: 'tests/out/f-roster.png', fullPage: true });
  await T.setViewportSize({ width: 1024, height: 800 }); await sleep(300); console.log('roster overflow @1024:', await wide(T));
  await T.setViewportSize({ width: 390, height: 800 }); await sleep(300); console.log('roster overflow @390:', await wide(T));
  await T.screenshot({ path: 'tests/out/f-roster-390.png', fullPage: true });
  await T.setViewportSize({ width: 1280, height: 900 });
  // comments
  await T.click('.dash-tabs >> text=Comments'); await sleep(800);
  console.log('comment 1:', await T.locator('.rc-text').first().inputValue());
  console.log('sign 1:', await T.locator('.rc-sign').first().inputValue());
  console.log('comments overflow:', await wide(T));
  await T.screenshot({ path: 'tests/out/f-comments.png', fullPage: true });
  // equipment
  await T.click('.dash-tabs >> text=Equipment'); await sleep(600);
  await T.locator('.eq-item .btn', { hasText: 'Change product' }).first().click();
  await T.fill('.eq-edit input >> nth=0', 'https://www.amazon.ca/dp/B000PCVLNS'); await T.fill('.eq-edit input >> nth=1', 'Adtech mini glue sticks (100)');
  await T.click('.eq-edit >> text=Save'); await sleep(1200);
  console.log('glue rows:', (await T.locator('.eq-item', { hasText: 'Hot glue' }).allInnerTexts()).map(s => s.replace(/\n/g, ' ')).join(' || '));
  const href = await T.getAttribute('.eq-bar a.btn-primary', 'href');
  console.log('email body starts:', decodeURIComponent(href.split('body=')[1]).slice(0, 420).replace(/\n/g, ' ⏎ '));
  await T.screenshot({ path: 'tests/out/f-equip.png', fullPage: true });
  // calendar
  await T.click('.dash-tabs >> text=Calendar'); await sleep(900);
  const m0 = await T.locator('.calmain .calv-month').innerText();
  await T.click('.calmain .calv-mon[title="Next month"]'); await sleep(900);
  const m1 = await T.locator('.calmain .calv-month').innerText();
  await T.evaluate(() => { document.querySelector('.calmain .calv-scroll').scrollBy(0, 120); }); await sleep(120);
  const scrolling = await T.evaluate(() => document.querySelector('.calmain .calv').classList.contains('calv-scrolling'));
  await T.screenshot({ path: 'tests/out/f-calendar-scroll.png' });
  console.log('calendar months:', m0, '→', m1, '· big names while scrolling:', scrolling);
  // light display
  await T.evaluate(() => RL.setTheme('light')); await T.click('.dash-tabs >> text=Roster'); await sleep(600);
  await T.screenshot({ path: 'tests/out/f-roster-light.png', fullPage: true });
  await T.evaluate(() => RL.setTheme('dark'));
  // student side
  const S = await br.newPage({ viewport: { width: 1280, height: 900 } }); S.on('pageerror', e => console.log('S pageerror:', e.message));
  await S.goto(B + '/index.html?preview=1#/'); await sleep(900);
  await S.click('.home-foot .theme-switch button:has-text("Light")'); await sleep(300);
  console.log('theme after click:', await S.evaluate(() => document.documentElement.dataset.theme + ' / saved ' + localStorage.getItem('theme')));
  await S.screenshot({ path: 'tests/out/f-home-light.png', fullPage: true });
  await S.reload(); await sleep(800);
  console.log('theme after reload:', await S.evaluate(() => document.documentElement.dataset.theme));
  await S.click('.cal-btn'); await sleep(900); await S.screenshot({ path: 'tests/out/f-cal-light.png' }); await S.keyboard.press('Escape');
  await S.goto(B + '/index.html?preview=1#/m/m01/9'); await sleep(1200); await S.screenshot({ path: 'tests/out/f-m01-9-light.png', fullPage: true });
  await S.goto(B + '/index.html?preview=1#/m/m02/2'); await sleep(1200); await S.screenshot({ path: 'tests/out/f-m02-2-light.png', fullPage: true });
  await S.evaluate(() => RL.setTheme('dark'));
  await br.close();
})();
