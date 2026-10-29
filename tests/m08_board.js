// node tests/m08_board.js <mission> <set> <out.png> [x y w h] — renders a mission's circuit (from RL.guides.mNN._dev) big
const { chromium } = require('playwright');
(async () => {
  const [mid, set, out] = process.argv.slice(2, 5); const view = process.argv.slice(5).map(Number);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:8765/index.html?preview=1#/m/${mid}/1`); await p.waitForTimeout(600);
  await p.evaluate(([mid, set, view]) => {
    const d = RL.guides[mid]._dev; const R = RL.Board.render({ parts: d.parts, show: d.sets[set], vb: d.vb, view: view.length ? view : null, hover: false });
    document.body.innerHTML = ''; document.body.style.background = '#0b1220'; R.svg.style.width = '1580px'; R.svg.style.display = 'block'; document.body.appendChild(R.svg);
    if (d.lit) d.lit(R, set);
  }, [mid, set, view]);
  await p.waitForTimeout(300);
  await p.locator('svg').first().screenshot({ path: out });
  await b.close();
})();
