// Official Q&A — target filters: Bertigo's "enemy Unit with a 【Destroyed】 effect" (Q222), White Ark's prerequisite Unit (Q417),
// change-the-attack-target Commands choosing the Unit already battling (Q545, Q549, Q553, Q555), already-rested Units chosen
// by "Rest it." effects (Q466, Q529, Q554), and With Iron and Blood's "Choose 1 of your Units" in an action step.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=990000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy, other=w=>w==='player'?'enemy':'player';
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const offered=re=>!!modal() && modal().btns.some(b=>re.test(b));
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const esc=s=>s.replace(/[.*+?^${}()|[\]\\#/]/g,'\\$&');
const setTrash=(who, n)=>{ side(who).trash=Array.from({length:n}, ()=>card('ST01-003', who)); A.refreshTrashStats(side(who)); };

// ---- Q222 Bertigo GD03-037: "【During Link】During your turn, while this Unit is battling an enemy Unit with a 【Destroyed】 effect,
// it gains <First Strike>." A 【During Pair/Link】【Destroyed】 effect that isn't active doesn't count.
{ const pilots=[...A.CARD_BY_ID.values()].filter(d=>d.type==='pilot' && !/-p\d+$/.test(d.id));
  const vulture=pilots.find(p=>/\(vulture\)/i.test(p.trait||'')).id, nonV=pilots.find(p=>!/\(vulture\)/i.test(p.trait||'') && !/Destroyed/.test(p.effect||'')).id;
  const cases=[
    ["unpaired Char's Zaku Ⅱ (【During Pair】【Destroyed】)", 'GD01-026', null, false, false],
    ["paired Char's Zaku Ⅱ", 'GD01-026', nonV, false, true],
    ['unpaired Unicorn Gundam (Unicorn Mode) (【During Link】【Destroyed】)', 'GD01-005', null, false, false],
    ['Gundam X paired with a non-(Vulture) Pilot (【During Pair･(Vulture) Pilot】【Destroyed】)', 'GD02-056', nonV, false, false],
    ['Gundam X paired with a (Vulture) Pilot', 'GD02-056', vulture, false, true],
    ["a Unit paired with Emma Sheen, not linked (her 【During Link】【Destroyed】)", null, 'GD03-099', false, false],
    ['a Unit linked with Emma Sheen', null, 'GD03-099', true, true]];
  for (const [lab, foeId, pid, linked, expect] of cases) for (const w of ['player','enemy']){
    fresh(w); const b=put('GD03-037', w); seat(b,'ST01-010'); b.linked=true;
    const f = foeId ? put(foeId, other(w), {rested:true}) : stick(other(w), 1, 9, {rested:true}); if (pid){ seat(f, pid); f.linked=linked; }
    G.curBattle={ atk:b, def:f }; const fs=A.effFirstStrike(b); G.curBattle=null;
    ok(`Q222 ${w} Bertigo vs ${lab}: <First Strike>=${expect}`, fs===expect, `got ${fs}`);
  }
  // Through a real battle: a 1-HP Bertigo dies to the unpaired Zaku's simultaneous damage (player attack, AI attack).
  for (const w of ['player','enemy']){
    fresh(w); const b=put('GD03-037', w); seat(b,'ST01-010'); b.linked=true; b.hp=1; const f=put('GD01-026', other(w), {rested:true});
    if (w==='player'){ A.fieldClick(b.uid); drainTasks(); A.fieldClick(f.uid); drainTasks(); } else { A.resolveAiAttack(b, ()=>{}, f); drainTasks(); }
    passAll();
    ok(`Q222 ${w} Bertigo attacks an unpaired Char's Zaku Ⅱ: no <First Strike>, both destroyed`, !logs().some(l=>/Bertigo.*First Strike/.test(l)) && !side(w).field.includes(b) && !side(other(w)).field.includes(f), logs().slice(0,4).join(' / '));
  }
}

// ---- Q417 White Ark GD05-124 + V-Dash Gundam GD04-006 ("Rest 1 of your other (League Militaire) Units:"): the Base only stands
// in for a Unit that could be rested.
{ fresh('player'); const wa=card('GD05-124','player'); G.player.base=wa; const v=put('GD04-006','player'); const e=stick('enemy',1,4);
  const ready=A.activateReady(v), pay=A.activateCostPayable(v, G.player);
  A.startActivate(v); drainTasks(); passAll(); if (G.mode==='activate-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Q417 player: no other (League Militaire) Unit — V-Dash\'s ability is not usable through White Ark', !ready && !pay && !wa.rested && !e.rested, `ready=${ready} pay=${pay} base=${wa.rested} enemy=${e.rested}`); }
{ fresh('player'); const wa=card('GD05-124','player'); G.player.base=wa; const v=put('GD04-006','player'); const lm=stick('player',1,3,{trait:'(League Militaire)'}); const e=stick('enemy',1,4);
  const ready=A.activateReady(v); A.startActivate(v); drainTasks(); const m=modal(); press(/Rest White Ark/); if (G.mode==='activate-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Q417 player: with a (League Militaire) Unit, White Ark may be rested instead of it', ready && !!m && /instead/.test(m.msg) && wa.rested && !lm.rested && e.rested, `ready=${ready} m=${JSON.stringify(m)} base=${wa.rested} lm=${lm.rested} e=${e.rested}`); }
{ fresh('enemy'); const wa=card('GD05-124','enemy'); G.enemy.base=wa; const v=put('GD04-006','enemy'); const p=stick('player',1,4);
  const ready=A.activateReady(v), pay=A.activateCostPayable(v, G.enemy); if (ready){ A.aiActivate(v); drainTasks(); }
  ok('Q417 AI: no other (League Militaire) Unit — V-Dash\'s ability is not usable through White Ark', !ready && !pay && !wa.rested && !p.rested, `ready=${ready} pay=${pay} base=${wa.rested} p=${p.rested}`); }
{ fresh('enemy'); const wa=card('GD05-124','enemy'); G.enemy.base=wa; const v=put('GD04-006','enemy'); const lm=stick('enemy',1,3,{trait:'(League Militaire)'}); const p=stick('player',1,4);
  ok('Q417 AI: with a (League Militaire) Unit the cost is payable (White Ark may stand in)', A.activateReady(v) && A.activateCostPayable(v, G.enemy));
  A.applyActivateEffect(v, p, G.enemy, null); drainTasks();
  ok('Q417 AI: it rests White Ark instead of the Unit', wa.rested && !lm.rested && p.rested, `base=${wa.rested} lm=${lm.rested} p=${p.rested}`); }

// ---- Q545 / Q549 / Q553 / Q555: "Choose 1 rested friendly (T) Unit. Change a battling enemy Unit's attack target to it." — the
// rested Unit already battling the attacker may be chosen.
for (const [q, id, trait] of [['Q545','GD06-117','(Zeon) (Delaz Fleet)'],['Q549','ST07-013','(CB)'],['Q553','GD05-108','(Academy)'],['Q555','EB01-077','(G Generation)']]){
  const nm=A.CARD_BY_ID.get(id).name;
  { fresh('enemy'); const d=stick('player',1,9,{trait, rested:true}); const c=card(id,'player'); G.player.hand=[c]; const atk=stick('enemy',3,9);
    A.resolveAiAttack(atk, ()=>{}, d); drainTasks(); const off=offered(new RegExp(esc(nm)));
    press(new RegExp(esc(nm))); passAll();
    ok(`${q} player ${nm}: offered with only the attacked rested ${trait} Unit, and the attack stays on it`, off && G.player.trash.includes(c) && d.hp===6 && logs().some(l=>new RegExp(esc(nm)+'.*attack target changes').test(l)), `offered=${off} hp=${d.hp} ${logs().slice(0,3).join(' / ')}`); }
  { fresh('enemy'); const d=stick('player',1,9,{trait, rested:true}); const o=stick('player',1,8,{trait, rested:true}); const c=card(id,'player'); G.player.hand=[c]; const atk=stick('enemy',3,9);
    A.resolveAiAttack(atk, ()=>{}, d); drainTasks(); press(new RegExp(esc(nm))); const m=modal();
    const lists = !!m && m.btns.some(b=>b.includes(d.name)) && m.btns.some(b=>b.includes(o.name));
    press(new RegExp(esc(d.name))); passAll();
    ok(`${q} player ${nm}: with two rested ${trait} Units both are listed, and the battling one can be chosen`, lists && d.hp===6 && o.hp===8, `m=${JSON.stringify(m)} d=${d.hp} o=${o.hp}`); }
  { fresh('player'); const d=stick('enemy',1,9,{trait, rested:true}); const c=card(id,'enemy'); const atk=stick('player',3,9);
    G.curBattle={ atk, def:d }; const rc=A.retargetCands(G.enemy, c.action, atk); G.curBattle=null;
    ok(`${q} AI ${nm}: the battling rested ${trait} Unit is a legal choice too`, rc.includes(d), rc.map(u=>u.name).join(',')); }
}

// ---- Q466 G-Falcon DX ST14-005 / Q529 Gundam Heavyarms Custom (EW) GD06-068: an already-rested enemy Unit can be chosen by
// "Choose 1 enemy Unit … Rest it." and still gets the AP-2 rider.
{ fresh('player'); setTrash('player', 7); const r=stick('enemy',5,9,{lv:6, rested:true}); const c=card('ST14-005','player'); G.player.hand=[c];
  A.playFromHand(c.uid); drainTasks(); const tgt=G.mode==='trigger-target'; A.fieldClick(r.uid); drainTasks();
  ok('Q466 player G-Falcon DX: the only (rested) Lv.6 enemy can be chosen and gets AP-2', tgt && A.effAp(r)===3, `mode=${tgt} ap=${A.effAp(r)}`); }
{ fresh('enemy'); setTrash('enemy', 7); const r=stick('player',5,9,{lv:6, rested:true}); const g=put('ST14-005','enemy');
  A.runTrigger(g, G.enemy, A.parseTrigger(g.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q466 AI G-Falcon DX: the only (rested) Lv.6 Unit gets AP-2', A.effAp(r)===3, `ap=${A.effAp(r)}`); }
{ fresh('enemy'); setTrash('enemy', 7); const r=stick('player',5,9,{lv:6, rested:true}); const a=stick('player',4,9,{lv:6}); const g=put('ST14-005','enemy');
  A.runTrigger(g, G.enemy, A.parseTrigger(g.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q466 AI G-Falcon DX: it prefers resting an active Unit', a.rested && A.effAp(a)===2 && A.effAp(r)===5, `a=${a.rested}/${A.effAp(a)} r=${A.effAp(r)}`); }
{ fresh('player'); put('GD03-021','player'); const r=stick('enemy',4,3,{lv:3, rested:true}); const a=stick('enemy',4,3,{lv:3}); const c=card('GD06-068','player'); G.player.hand=[c];
  A.playFromHand(c.uid); drainTasks(); A.fieldClick(r.uid); drainTasks();
  ok('Q529 player Heavyarms Custom (EW): tapping the rested Lv.3 enemy gives it AP-2', G.mode==='idle' && A.effAp(r)===2 && A.effAp(a)===4 && !a.rested, `mode=${G.mode} r=${A.effAp(r)} a=${A.effAp(a)}`); }
{ fresh('enemy'); put('GD03-021','enemy'); const r=stick('player',4,3,{lv:3, rested:true}); const u=put('GD06-068','enemy');
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Q529 AI Heavyarms Custom (EW): the only (rested) Lv.3 Unit gets AP-2', A.effAp(r)===2, `ap=${A.effAp(r)}`); }
// Q554 Shining Finger GD05-120 (【Main】/【Action】Choose 1 enemy Unit with 4 or less HP. Rest it. …): a rested one can be chosen.
{ fresh('player'); const r=stick('enemy',2,4,{rested:true}); const c=card('GD05-120','player'); G.player.hand=[c];
  ok('Q554 Shining Finger: an already-rested enemy Unit with 4 or less HP is a legal choice', A.enemyTargets(G.enemy, c.action.kind==='chain' ? c.action.steps[0] : c.action).includes(r), JSON.stringify(c.action).slice(0,120)); }

// ---- With Iron and Blood ST05-013 "【Main】/【Action】Choose 1 of your Units. Deal 1 damage to it. It gets AP+3 during this turn."
// In an action step the player chooses which of their Units.
{ fresh('enemy'); const d=stick('player',1,9,{rested:true}); const o=stick('player',2,5); const c=card('ST05-013','player'); G.player.hand=[c]; const atk=stick('enemy',3,9);
  A.resolveAiAttack(atk, ()=>{}, d); drainTasks(); press(/With Iron/); const m=modal();
  const lists = !!m && m.btns.some(b=>b.includes(d.name)) && m.btns.some(b=>b.includes(o.name));
  press(new RegExp(esc(o.name))); passAll();
  ok('With Iron and Blood (AI attack): the player chooses which Unit — the other one takes 1 and gets AP+3', lists && o.hp===4 && A.effAp(o)===5 && A.effAp(d)===1, `m=${JSON.stringify(m)} o=${o.hp}/${A.effAp(o)} d=${A.effAp(d)}`); }
{ fresh('player'); const atk=stick('player',3,9); const o=stick('player',1,5); stick('enemy',1,1,{blocker:false}); const c=card('ST05-013','player'); G.player.hand=[c];
  A.fieldClick(atk.uid); drainTasks(); A.attackDirect(); drainTasks(); press(/With Iron/); const m=modal();
  const lists = !!m && m.btns.some(b=>b.includes(atk.name)) && m.btns.some(b=>b.includes(o.name));
  press(new RegExp(esc(atk.name))); passAll();
  ok('With Iron and Blood (your attack): the attacker can be chosen — it takes 1 and gets AP+3', lists && atk.hp===8 && A.effAp(atk)===6 && o.hp===5, `m=${JSON.stringify(m)} atk=${atk.hp}/${A.effAp(atk)} o=${o.hp}`); }

console.log('== official Q&A: target filters ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
