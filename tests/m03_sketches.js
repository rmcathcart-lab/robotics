// node tests/m03_sketches.js <outdir> — saves every Virtual UNO starting sketch from Missions 02 and 03 as .ino files
// (plus the your-turn sketches completed with their hints) so they can be compiled outside the browser.
const { chromium } = require('playwright'); const fs = require('fs');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [M, steps] of [['m02', [4, 6, 7, 8]], ['m03', [4, 5, 6, 7]]]) for (const s of steps) {
    await p.goto('about:blank'); await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${s}`); await p.evaluate(() => localStorage.clear());
    await p.goto('about:blank'); await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${s}`); await p.waitForTimeout(600);
    let code = await p.locator('.sim textarea').first().inputValue();
    const hint = await p.locator('details.chal .code pre').allTextContents();
    fs.writeFileSync(`${out}/${M}_s${s}.ino`, code);
    if (hint.length) {
      let h = hint[0];
      if (M === 'm02') code = code.replace('  // YOUR TURN: mix purple (red + blue) and show it for 1 second\n', h + '\n');
      else code = code.replace(/int melody\[\][^\n]*\nint durations\[\][^\n]*\nconst int NOTE_COUNT = 7;/, h);
      fs.writeFileSync(`${out}/${M}_s${s}_done.ino`, code);
    }
  }
  await b.close();
})();
