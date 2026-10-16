// Instantiate every card and run every parser over it. Must report Errors: 0.
const H=require('./harness.js'); const {A,drainTasks,recordErr,ERRORS,setCtx}=H;
let cards=0,trigs=0,acts=0,cmds=0,bursts=0;
const LABELS=['Deploy','When Paired','When Linked','Attack','Destroyed','Main','Action','Burst','When Attacked','End'];
for (const def of A.GUNDAM_CARDS){
  setCtx(def.id+' '+def.name);
  try {
    const c=A.makeCard(def,'player'); cards++;
    if (c.burst) bursts++;
    if (c.action || A.inferCommand(def.effect)) cmds++;
    if (A.parseActivate(def.effect)) acts++;
    for (const l of LABELS){ const t=A.parseTrigger(def.effect,l); if(t) trigs++; }
    A.parseOnKill(def.effect); A.parseTokenSpecs(def.effect); A.parseLink(def.link);
    A.breachAmount(def.effect); A.repairAmount(def.effect); A.supportAmount(def.effect);
    if (c.type==='unit'){ A.effAp(c); A.effMaxHp(c); A.effBlocker(c); A.effBreach(c); A.effRepair(c); A.effSupport(c); A.effUntargetable(c); }
    if (c.pilotMode) A.inferCommand(def.effect);
  } catch(e){ recordErr('card', e); }
}
drainTasks();
console.log(`cards instantiated: ${cards} | triggers parsed: ${trigs} | activates: ${acts} | commands: ${cmds} | bursts: ${bursts}`);
console.log('Errors:', ERRORS.length);
const by={}; for(const e of ERRORS){ (by[e.msg||'?']=by[e.msg||'?']||[]).push(e); }
for(const k of Object.keys(by).slice(0,8)){ console.log(`\n### ${k} (${by[k].length})`);
  by[k].slice(0,3).forEach(e=>console.log('   '+e.ctx+'\n       '+(e.stack||''))); }
