// The owner of a destroyed 【Burst】 Shield is asked "Activate its 【Burst】?" first (official Q&A Q40/Q73). Suites written before
// that exercise what the Bursts do, so their drainTasks answers yes: `const drainTasks=require('./burst_yes.js')(H);`
const el = id => global.document.getElementById(id);
module.exports = H => function drainTasks(){
  H.drainTasks();
  for (let g=0; g<12; g++){
    if (!el('blockModal').classList.contains('show') || !/Activate its 【Burst】\?/.test(el('blockMsg').innerHTML||'')) break;
    const b = [...el('blockBtns').children].find(x=>/^Activate 【Burst】/.test(x.textContent||x.innerHTML||''));
    if (!b) break;
    b.onclick(); H.drainTasks();
  }
};
// Two or more of the player's effects triggering together open an order chooser (10-1-6-5, Q107). `resolveFirst(H)(re)` answers it
// with the effect matching `re` (else the first listed), repeatedly while one is open.
module.exports.resolveFirst = H => function(re){
  for (let g=0; g<6; g++){
    if (!el('blockModal').classList.contains('show') || !/trigger together/.test(el('blockMsg').innerHTML||'')) break;
    const bs=[...el('blockBtns').children]; const b=bs.find(x=>re && re.test(String(x.innerHTML||x.textContent||'')))||bs[0];
    if (!b) break;
    b.onclick(); H.drainTasks();
  }
};
