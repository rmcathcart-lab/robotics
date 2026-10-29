// node tests/m03_check.js — Mission 03: build guides to the last step (screenshots), every Virtual UNO check
// with the provided code (expect PASS) and a broken version (expect RETRY), plus the your-turn melody completed.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html?preview=1#/m/m03/';
const MARY = `int melody[] = { NOTE_E4, NOTE_D4, NOTE_C4, NOTE_D4, NOTE_E4, NOTE_E4, NOTE_E4,
                 NOTE_D4, NOTE_D4, NOTE_D4, NOTE_E4, NOTE_G4, NOTE_G4 };
int durations[] = { 400, 400, 400, 400, 400, 400, 800,
                    400, 400, 800, 400, 400, 800 };
const int NOTE_COUNT = 13;`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('pageerror:', e.message); });
  p.on('dialog', d => d.accept());
  async function go(step) { await p.goto('about:blank'); await p.goto(URL + step); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + step); await p.waitForTimeout(900); }
  async function guide(step, idx, name) {
    await go(step);
    const g = p.locator('.bg').nth(idx); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const n = Number((await g.locator('.bg-ctl .label').innerText()).split('/')[1]);
    for (let i = 1; i < n; i++) { await g.locator('text=Next →').click(); await p.waitForTimeout(350); }
    await p.waitForTimeout(1400); await g.screenshot({ path: `tests/out/m03-${name}-last.png` });
    await g.locator('.bg-zoom button').click(); await p.waitForTimeout(900); await g.screenshot({ path: `tests/out/m03-${name}-whole.png` });
  }
  async function check(step, idx, label, edit, wait) {
    await go(step);
    const sim = p.locator('.sim').nth(idx); await sim.scrollIntoViewIfNeeded();
    if (edit) { const ta = sim.locator('textarea'); const code = await ta.inputValue(); const nc = edit(code); if (nc === code) console.log('  !! edit did not change the code for', label); await ta.fill(nc); }
    await sim.locator('text=Check my code').click();
    await p.waitForTimeout(wait);
    const msg = (await sim.locator('.sim-msg').innerText()).replace(/\s+/g, ' ');
    console.log(label.padEnd(36), '→', msg.slice(0, 190));
    return sim;
  }
  await guide(4, 0, 'guide-buzzers');
  await guide(6, 0, 'guide-keys');
  await guide(7, 0, 'guide-joystick');
  let s = await check(4, 0, 'first notes (expect PASS)', null, 5200);
  await s.screenshot({ path: 'tests/out/m03-sim-first.png' });
  await check(4, 0, 'first notes, no 392 (expect RETRY)', c => c.replace('tone(PASSIVE_BUZZER, 392);', 'tone(PASSIVE_BUZZER, 349);'), 5200);
  await check(5, 0, 'melody template (expect RETRY)', null, 7500);
  s = await check(5, 0, 'melody + Mary (expect PASS)', c => c.replace(/int melody\[\][^\n]*\nint durations\[\][^\n]*\nconst int NOTE_COUNT = 7;/, MARY), 9500);
  await s.screenshot({ path: 'tests/out/m03-sim-melody.png' });
  await check(5, 0, 'melody, COUNT too big (expect RETRY)', c => c.replace('NOTE_COUNT = 7;', 'NOTE_COUNT = 9;'), 7500);
  s = await check(6, 0, 'keys (expect PASS)', null, 2600);
  await s.screenshot({ path: 'tests/out/m03-sim-keys.png' });
  await check(6, 0, 'keys, INPUT not PULLUP (expect RETRY)', c => c.replace('pinMode(keys[k], INPUT_PULLUP);', 'pinMode(keys[k], INPUT);'), 2600);
  await check(6, 0, 'keys, == HIGH (expect RETRY)', c => c.replace('if (digitalRead(keys[k]) == LOW)', 'if (digitalRead(keys[k]) == HIGH)'), 2600);
  s = await check(7, 0, 'synth (expect PASS)', null, 2900);
  await s.screenshot({ path: 'tests/out/m03-sim-synth.png' });
  console.log('   serial:', (await s.locator('.sim-serial').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await check(7, 0, 'synth, no octave (expect RETRY)', c => c.replace('note = note * 2;', 'note = note;'), 2900);
  await check(7, 0, 'synth, no SW pullup (expect RETRY)', c => c.replace('pinMode(JOY_SW, INPUT_PULLUP);', 'pinMode(JOY_SW, INPUT);'), 2900);
  console.log('page errors:', errs.length);
  await b.close();
})();
