const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  p.on('dialog', d => d.accept());
  // crosswalk check
  await p.goto('http://localhost:8765/index.html#/m/m01/10'); await p.waitForTimeout(800);
  const sim = p.locator('.sim');
  await sim.locator('text=Check my code').click();
  await p.waitForTimeout(12500);
  console.log('cross:', await sim.locator('.sim-msg').innerText());
  await sim.scrollIntoViewIfNeeded(); await sim.screenshot({ path: 'tests/out/sim-cross.png' });
  // cycle: incomplete then complete
  await p.goto('http://localhost:8765/index.html#/m/m01/9'); await p.waitForTimeout(800);
  const ta = p.locator('.sim textarea');
  const code = await ta.inputValue();
  const done = code.replace('  // YOUR TURN: yellow on for 1.5 seconds, then off\n', '  digitalWrite(YELLOW_LIGHT, HIGH);\n  delay(1500);\n  digitalWrite(YELLOW_LIGHT, LOW)\n')
    .replace('  // YOUR TURN: red on for 4 seconds, then off\n', '  digitalWrite(RED_LIGHT, HIGH);\n  delay(4000);\n  digitalWrite(RED_LIGHT, LOW);\n');
  await ta.fill(done);
  await p.locator('.sim >> text=Upload').click(); await p.waitForTimeout(500);
  console.log('cycle err:', await p.locator('.sim-msg').innerText());
  await ta.fill(done.replace('LOW)\n', 'LOW);\n'));
  await p.locator('.sim >> text=Check my code').click(); await p.waitForTimeout(11500);
  console.log('cycle:', await p.locator('.sim-msg').innerText());
  // blink
  await p.goto('http://localhost:8765/index.html#/m/m01/7'); await p.waitForTimeout(800);
  await p.locator('.sim >> text=Upload').click(); await p.waitForTimeout(1300);
  await p.locator('.sim').screenshot({ path: 'tests/out/sim-blink.png' });
  // build guide through to the end
  await p.goto('http://localhost:8765/index.html#/m/m01/8'); await p.waitForTimeout(800);
  const g = p.locator('.bg').first(); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  for (let i = 0; i < 6; i++) { await g.locator('text=Next →').click(); await p.waitForTimeout(400); }
  await p.waitForTimeout(1500); await g.screenshot({ path: 'tests/out/guide7.png' });
  await g.locator('text=Next →').click(); await p.waitForTimeout(1200); await g.screenshot({ path: 'tests/out/guide8.png' });
  await b.close();
})();
