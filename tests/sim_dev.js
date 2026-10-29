const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8765/tests/dev_sim.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { for (const k in SIMS) SIMS[k].run(); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { SIMS.ir.ir(0x09); SIMS.joy.setJoystick(1023, 512); SIMS.joy.press(2, true); });
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => ({
    servo: SIMS.servo.state().servo, lcd: SIMS.servo.state().lcd, seg: SIMS.seg.state().seg, stepper: SIMS.ir.state().stepper, irSerial: SIMS.ir.serialText(),
    dhtSerial: SIMS.dht.serialText().slice(0, 60), motor: SIMS.dht.state().motor, rgb: SIMS.joy.state().rgb, tone: SIMS.joy.state().tone,
    msgs: [...document.querySelectorAll('.sim-msg')].map(m => m.textContent)
  }));
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: 'tests/out/sim_dev.png', fullPage: true });
  await b.close();
})();
