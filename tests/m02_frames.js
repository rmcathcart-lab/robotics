// node tests/m02_frames.js [M] [steps…] — screenshots every frame of every explainer on the given steps, then
// tiles them into one contact sheet per step: tests/out/<M>-frames-stepNN.png (needs python3 + Pillow).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const M = process.argv[2] || 'm02';
const steps = process.argv.slice(3).map(Number);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  for (const st of steps) {
    await p.goto('about:blank'); await p.goto(`http://localhost:8765/index.html?preview=1#/m/${M}/${st}`); await p.waitForTimeout(700);
    const xps = p.locator('.xp:has(.xp-cap)'); const n = await xps.count(); const files = [];
    for (let i = 0; i < n; i++) {
      const x = xps.nth(i); await x.scrollIntoViewIfNeeded(); await p.waitForTimeout(700);
      const dots = await x.locator('.dots i').count();
      for (let f = 0; f < Math.max(1, dots); f++) {
        if (f > 0) await x.locator('.xp-ctl .btn-primary').click();
        await p.waitForTimeout(f === 0 ? 1600 : 2400);
        const fn = `tests/out/_f-${M}-${st}-${i}-${f}.png`; await x.locator('.xp-stage').screenshot({ path: fn }); files.push(fn);
      }
    }
    if (files.length) execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs = sys.argv[2:]; ims = [Image.open(f) for f in fs]
w = 640; ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
cols = 2; rows = (len(ims) + 1) // 2; hs = [max(ims[r*2+c].height for c in range(cols) if r*2+c < len(ims)) for r in range(rows)]
out = Image.new('RGB', (w * cols + 10, sum(hs) + 10 * rows), (40, 40, 40)); y = 0
for r in range(rows):
  for c in range(cols):
    k = r * 2 + c
    if k < len(ims): out.paste(ims[k], (c * (w + 10), y))
  y += hs[r] + 10
out.save(sys.argv[1])`, `tests/out/${M}-frames-step${String(st).padStart(2, '0')}.png`, ...files]);
    console.log('step', st, files.length, 'frames');
  }
  await b.close();
})();
