const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
await p.goto('http://localhost:8765/?preview=1#/m/'+process.argv[2]+'/'+process.argv[3]);await p.waitForTimeout(1500);
const t=await p.locator('body').innerText().catch(()=>'' );console.log(t.slice(0,600));console.log('sims',await p.locator('.sim').count());console.log(e.join('\n'));await b.close();})();
