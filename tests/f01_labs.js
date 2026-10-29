// Drives the F1 labs like a student would and screenshots the results → tests/out/lab_*.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?preview=1#/m/f01/5'); await p.waitForTimeout(800);
  const lab = p.locator('.fx-sk'); await lab.scrollIntoViewIfNeeded();
  // drag the circle centre: it moves
  const ctr = async () => (await p.locator('.fx-sk .fx-pt').first().boundingBox());
  let c = await ctr(); await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down(); await p.mouse.move(c.x - 30, c.y + 20, { steps: 5 }); await p.mouse.up();
  await p.keyboard.press('Escape');
  await p.locator('.fx-sk .fx-bar button').nth(1).click(); // Sketch Dimension
  async function clickEdge(e) { const bb = await p.locator('.fx-sk [data-edge=' + e + ']').boundingBox(); await p.mouse.click(bb.x + bb.width * (e === 'top' || e === 'bottom' ? 0.75 : 0.5), bb.y + bb.height * (e === 'left' || e === 'right' ? 0.8 : 0.5)); }
  async function type(v) { await p.waitForTimeout(80); await p.keyboard.type(v); await p.keyboard.press('Enter'); await p.waitForTimeout(450); }
  await clickEdge('top'); await type('50');
  await clickEdge('left'); await type('20');
  // circle outline
  c = await ctr(); const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
  const r = await p.evaluate(() => { const cs = [...document.querySelectorAll('.fx-sk svg circle')].filter(x => x.getAttribute('stroke') === 'transparent')[0]; return cs.getBoundingClientRect().width / 2 - 6; });
  await p.mouse.click(cx + r, cy); await type('5');
  c = await ctr(); await p.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await clickEdge('left'); await type('6');
  c = await ctr(); await p.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await clickEdge('bottom'); await type('10');
  await lab.screenshot({ path: 'tests/out/lab_sketch.png' });
  console.log('sketch:', await p.locator('.fx-sk .fx-labinfo').innerText());
  // extrude lab
  await p.goto('http://localhost:8765/?preview=1#/m/f01/7'); await p.waitForTimeout(2000);
  const cv = p.locator('.fx-lab canvas').first(); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
  await p.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.58); await p.waitForTimeout(300);
  await p.locator('.fx-lab .fx-num').first().fill('4'); await p.locator('.fx-lab .fx-num').first().dispatchEvent('change'); await p.waitForTimeout(300);
  await p.locator('.fx-lab .fx-pb button').first().click(); await p.waitForTimeout(500);
  await p.locator('.fx-lab').first().screenshot({ path: 'tests/out/lab_extrude.png' });
  console.log('extrude:', await p.locator('.fx-lab .fx-labinfo').first().innerText());
  // fillet lab: set radius first, then try corners
  await p.goto('http://localhost:8765/?preview=1#/m/f01/8'); await p.waitForTimeout(2000);
  await p.locator('.fx-lab').first().scrollIntoViewIfNeeded();
  await p.locator('.fx-lab .fx-num').first().fill('4'); await p.locator('.fx-lab .fx-num').first().dispatchEvent('change');
  const proj = () => p.evaluate(() => { const v = document.querySelector('.fx-lab .fx-view').__fx, T = v.T, r = v.canvas.getBoundingClientRect();
    return [[-25, -10], [25, -10], [25, 10], [-25, 10]].map(c => { const q = new T.Vector3(c[0], c[1], 2).project(v.camera); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; }); });
  let pts = await proj(); for (const i of [0, 1]) await p.mouse.click(pts[i][0], pts[i][1]);
  // orbit to the back, then pick the other two
  const vb = await p.locator('.fx-lab canvas').first().boundingBox(); await p.mouse.move(vb.x + 200, vb.y + 200); await p.mouse.down(); await p.mouse.move(vb.x + 560, vb.y + 200, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(300); pts = await proj(); for (const i of [2, 3]) await p.mouse.click(pts[i][0], pts[i][1]);
  await p.locator('.fx-lab .fx-pb button').first().click(); await p.waitForTimeout(400);
  await p.locator('.fx-lab').first().screenshot({ path: 'tests/out/lab_fillet.png' });
  console.log('fillet:', await p.locator('.fx-lab .fx-labinfo').first().innerText());
  // text lab
  await p.goto('http://localhost:8765/?preview=1#/m/f01/9'); await p.waitForTimeout(2500);
  await p.locator('.fx-lab').first().scrollIntoViewIfNeeded();
  await p.locator('.fx-lab .fx-seg button').nth(1).click(); await p.waitForTimeout(800);
  await p.locator('.fx-lab').first().screenshot({ path: 'tests/out/lab_text.png' });
  console.log('text:', await p.locator('.fx-lab .fx-labinfo').first().innerText());
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
