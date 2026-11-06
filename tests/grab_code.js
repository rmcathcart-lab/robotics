// node tests/grab_code.js r06 5 [simIndex] > out.ino — prints the starting code of a sim
const { chromium } = require('playwright');
const [M, STEP, IDX] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/?preview=1#/m/' + M + '/' + STEP); await p.waitForTimeout(1200);
  process.stdout.write(await p.locator('.sim').nth(Number(IDX || 0)).locator('textarea').inputValue()); await b.close(); })();
