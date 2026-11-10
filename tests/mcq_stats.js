// Where does the right answer land after UI.mcqOrder? Prints a count per letter, and any question whose
// options are mixed in a way worth a look (numbers sorted, options kept at the end).   node tests/mcq_stats.js [-v]
const fs = require('fs');
global.window = { RL: { el: () => ({}), esc: s => s } }; window.document = {};
require('../js/kit/ui.js'); const UI = window.RL.UI;
const qs = [];
const files = fs.readdirSync('js/missions').filter(f => f.endsWith('.js'));
const count = { A: 0, B: 0, C: 0, D: 0, E: 0 }, before = { A: 0, B: 0, C: 0, D: 0, E: 0 }; let total = 0;
for (const f of files) {
  const src = fs.readFileSync('js/missions/' + f, 'utf8'); let i = 0;
  while ((i = src.indexOf('UI.mcq(b, ctx, {', i)) >= 0) {
    let k = src.indexOf('{', i), d = 0, j = k;
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } }
    let o; try { o = new Function('return ' + src.slice(k, j + 1))(); } catch (e) { console.log('skip', f, src.slice(k, k + 60)); i = j; continue; }
    qs.push(o);
    const ord = UI.mcqOrder(o), pos = ord.indexOf(o.answer), L = 'ABCDE'[pos];
    count[L]++; before['ABCDE'[o.answer]]++; total++;
    if (process.argv[2] === '-v') console.log(f.padEnd(8), (o.id || '').padEnd(14), 'was', 'ABCDE'[o.answer], 'now', L, ord.join(''));
    i = j;
  }
}
console.log(total, 'questions. Right answer before:', JSON.stringify(before), ' after:', JSON.stringify(count));

if (process.argv[2] === '--salt') {   // find the salt that spreads the answers most evenly
  let best = null;
  for (let salt = 0; salt < 5000; salt++) {
    UI.MCQ_SALT = salt; const c = [0, 0, 0, 0, 0]; let streak = 0, run = 0, prev = -1;
    for (const o of qs) { const p = UI.mcqOrder(o).indexOf(o.answer); c[p]++; run = p === prev ? run + 1 : 1; prev = p; streak = Math.max(streak, run); }
    const spread = Math.max(c[0], c[1], c[2], c[3]) - Math.min(c[0], c[1], c[2], c[3]);
    const score = spread * 10 + streak;
    if (!best || score < best.score) best = { salt, score, c, streak };
  }
  console.log('best salt', JSON.stringify(best));
}
