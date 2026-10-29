// node tests/dev_view.js <view> → tests/out/view_<view>.png (the ViewCube in a given view)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 940, height: 480 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/tests/dev_fusion.html'); await p.waitForFunction(() => window.READY);
  for (const v of process.argv.slice(2)) { await p.evaluate(v => V.view(v, 0), v); await p.waitForTimeout(300); await p.screenshot({ path: 'tests/out/view_' + v + '.png', clip: { x: 20, y: 20, width: 900, height: 400 } }); }
  await b.close();
})();
