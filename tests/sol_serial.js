// node tests/sol_serial.js m07 8 file.ino [seconds] -> runs a sketch in a mission step's last sim and prints the Serial Monitor
const { chromium } = require('playwright'); const fs = require('fs');
const [M, STEP, FILE, SEC] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(900);
  const sim = p.locator('.sim').last();
  await sim.locator('textarea').evaluate((ta, c) => { ta.value = c; ta.dispatchEvent(new Event('input')); }, fs.readFileSync(FILE, 'utf8'));
  await sim.getByRole('button', { name: 'Upload & run' }).click(); await p.waitForTimeout(1000 * Number(SEC || 3));
  console.log((await sim.locator('.sim-msg').textContent()).slice(0, 200));
  console.log(await sim.evaluate(s => { const m = s.querySelector('.serial, .sim-serial, pre.ser, .ser'); return m ? m.textContent.slice(-600) : 'no serial box: ' + [...s.querySelectorAll('[class]')].map(e => e.className).filter(c => /ser/i.test(c)).join(','); }));
  console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
