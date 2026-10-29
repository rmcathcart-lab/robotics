// Mission 09 brief: the preview demo loops, and the game is playable (tap pads / keys A and L).
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/m09/1'); await p.waitForTimeout(600);
  await p.locator('.xp').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const lab = () => p.evaluate(() => { const t = [...document.querySelectorAll('.xp-stage svg text')]; return t.filter(x => /PRESS|READY|GO|WINS|EARLY|ROUND|PLAYER \d:/.test(x.textContent) && +x.getAttribute('y') > 300).map(x => x.textContent).join('|'); });
  const seen = new Set(); for (let i = 0; i < 5; i++) { seen.add(await lab()); await p.waitForTimeout(900); }
  console.log('demo labels:', [...seen].join(' / '));
  // play: start, wait for GO, both press
  await p.keyboard.press('a'); await p.waitForTimeout(200); console.log('after start:', await lab());
  for (let k = 0; k < 60 && (await lab()) !== 'GO!'; k++) await p.waitForTimeout(100);
  console.log('go:', await lab()); await p.waitForTimeout(230); await p.keyboard.press('l'); await p.waitForTimeout(110); await p.keyboard.press('a'); await p.waitForTimeout(300);
  console.log('result:', await lab());
  await p.locator('.xp').first().screenshot({ path: 'tests/out/m09-preview-result.png' });
  // false start by clicking the red pad twice
  const box = await p.locator('.xp-stage svg').first().boundingBox();
  const sx = box.width / 800, sy = box.height / 360;
  await p.mouse.click(box.x + 170 * sx, box.y + 180 * sy); await p.waitForTimeout(300); await p.mouse.click(box.x + 170 * sx, box.y + 180 * sy); await p.waitForTimeout(300);
  console.log('false start:', await lab());
  await br.close();
})();
