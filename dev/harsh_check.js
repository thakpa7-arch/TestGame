// Harsh Meta Slave Deck reports, replayed through the real UI paths (attack declaration, the action-step modal, Blocker
// prompts, the card viewer's 【Activate】 button, the target choosers): ZZ Gundam's +1, Argama (Red), Judau Ashta's
// pick-up, Rivalry with Roux, Familial Love, Sazabi's 【Attack】, Hyaku-Shiki's choice. Browser twin: dev/pw_harsh.js.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=860000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'Harsh',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; };
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<6){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const hand4=(first)=>{ G.player.hand=[card(first,'player'), card('ST01-001','player'), card('ST01-002','player'), card('ST01-003','player')]; };

// ---- Familial Love: 【Action】AP+2 during this battle; then draw if you have 3 or less cards (it has left your hand) ----
{ fresh('player'); const z=put('GD06-035','player'); const foe=stick('enemy',1,9,{rested:true}); hand4('GD06-110');
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Familial Love is offered in the action step of your attack', !!modal() && modal().btns.some(b=>/Familial/.test(b)));
  press(/Familial/); passAll();
  ok('Familial Love: your attacker gets AP+2 for the battle', foe.hp===9-6, 'foe hp '+foe.hp);
  ok('Familial Love: played from a 4-card hand it draws (3 left)', G.player.hand.length===4, 'hand '+G.player.hand.length); }
{ fresh('player'); const a=put('GD06-044','player'); const b=put('GD06-046','player'); const h=put('GD06-045','player'); const foe=stick('enemy',1,9,{rested:true}); hand4('GD06-110');
  A.fieldClick(h.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Familial/);
  ok('Familial Love: with several Units you choose (the battling one listed first)', !!modal() && /choose 1 of your Units/.test(modal().msg) && /Core Base/.test(modal().btns[0]));
  press(/Core Base/); passAll(); ok('Familial Love: the chosen Unit fights with AP+2', foe.hp===9-5, 'foe hp '+foe.hp); }
{ fresh('enemy'); const z=put('GD06-035','player',{rested:true}); const atk=stick('enemy',5,5); hand4('GD06-110');
  A.resolveAiAttack(atk, ()=>{}, z); drainTasks(); press(/Familial/); passAll();
  ok('Familial Love on defence: your Unit hits back with AP+2 and you draw', atk.hp===5-6 && G.player.hand.length===4, `atk ${atk.hp} hand ${G.player.hand.length}`); }
{ fresh('player'); hand4('GD06-110'); A.startCommand && A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok("Familial Love can't be played in the main phase (【Action】 only)", G.player.hand.some(c=>c.def==='GD06-110')); }

// ---- Rivalry with Roux: 【Action】2 damage to an enemy Unit battling a friendly (AEUG) Unit ----
{ fresh('player'); const z=put('GD06-035','player'); const foe=stick('enemy',1,9,{rested:true}); G.player.hand=[card('GD06-112','player')];
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Rivalry/); const afterRiv=foe.hp; passAll();
  ok('Rivalry with Roux: 2 damage to the Unit your (AEUG) attacker battles', foe.hp===9-2-4, 'foe hp '+foe.hp); }
{ fresh('enemy'); const ct=put('GD06-044','player',{rested:true}); const atk=stick('enemy',4,9); G.player.hand=[card('GD06-112','player')];
  A.resolveAiAttack(atk, ()=>{}, ct); drainTasks(); press(/Rivalry/); passAll();
  ok('Rivalry with Roux on defence: 2 damage to the attacker', atk.hp===9-2-3, 'atk hp '+atk.hp); }
{ fresh('enemy'); const rd=put('GD02-079','player'); const atk=stick('enemy',4,9); G.player.base=A.exBaseToken('player'); G.player.hand=[card('GD06-112','player')];
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); press(/Rick Dias/); press(/Rivalry/); passAll();
  ok('Rivalry with Roux after your (AEUG) Rick Dias blocks a direct attack', atk.hp===9-2-3, 'atk hp '+atk.hp); }
{ fresh('player'); const z=put('GD06-035','player'); const blk=stick('enemy',1,9,{blocker:true}); G.enemy.base=A.exBaseToken('enemy'); G.player.hand=[card('GD06-112','player')];
  A.fieldClick(z.uid); drainTasks(); A.attackDirect(); drainTasks(); press(/Rivalry/); passAll();
  ok("Rivalry with Roux on the AI's Blocker that intercepts your attack", blk.hp===9-2-4, 'blocker hp '+blk.hp); }

// ---- ZZ Gundam: "When your (AEUG) cards deal damage to enemy Units, increase the damage dealt by 1." ----
{ fresh('player'); put('GD06-033','player'); const z=put('GD06-035','player'); const foe=stick('enemy',1,12,{rested:true}); G.player.hand=[card('GD06-112','player')];
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Rivalry/); const r=foe.hp; passAll();
  const logs=(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
  ok('ZZ Gundam: Rivalry with Roux deals 3', logs.some(l=>/Rivalry with Roux's damage is increased by 1/.test(l)) && logs.some(l=>/Rivalry with Roux deals 2/.test(l)));
  ok('ZZ Gundam: your (AEUG) attacker deals battle damage +1', foe.hp===12-3-5, 'foe hp '+foe.hp); }
{ fresh('enemy'); put('GD06-033','player'); const ct=put('GD06-044','player',{rested:true}); const atk=stick('enemy',1,9); A.resolveAiAttack(atk, ()=>{}, ct); drainTasks(); passAll();
  ok('ZZ Gundam: your (AEUG) Unit defending deals battle damage +1', atk.hp===9-4, 'atk hp '+atk.hp); }
{ fresh('player'); put('GD06-033','player'); const e1=stick('enemy',1,9), e2=stick('enemy',1,9); const cb=put('GD06-045','player');
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:9}, cb, 'T'); drainTasks(); press(/Dummy 1\/9/);
  ok("ZZ Gundam: Core Base's 【Destroyed】 ping deals 2", (e1.hp===7) !== (e2.hp===7), `${e1.hp}/${e2.hp}`); }
{ fresh('player'); put('GD06-033','player'); const z=put('GD06-035','player'); const foe=stick('enemy',1,1,{rested:true}); const e2=stick('enemy',3,9);
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll(); if (G.mode==='trigger-target'){ A.fieldClick(e2.uid); drainTasks(); }
  ok("ZZ Gundam: Zeta Gundam's on-kill 2 damage becomes 3", e2.hp===6, 'hp '+e2.hp); }
{ fresh('player'); const f1=stick('enemy',1,9), f2=stick('enemy',1,9); G.player.hand=[card('GD06-033','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/./);
  ok("ZZ Gundam: its own 【Deploy】 2 damage to all enemy Units becomes 3", f1.hp===6 && f2.hp===6, `${f1.hp}/${f2.hp}`); }
{ fresh('enemy'); put('GD06-033','enemy'); const ai=put('GD06-044','enemy'); const mine=stick('player',1,9,{rested:true}); A.resolveAiAttack(ai, ()=>{}, mine); drainTasks(); passAll();
  ok("ZZ Gundam on the AI's side boosts the AI's (AEUG) Units", mine.hp===9-4, 'hp '+mine.hp); }
{ fresh('player'); put('GD06-033','player'); const foe=stick('enemy',1,9,{rested:true}); const nz=stick('player',4,4,{trait:'(Zeon)'});
  A.fieldClick(nz.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('ZZ Gundam: a non-(AEUG) Unit gets no bonus', foe.hp===9-4, 'foe hp '+foe.hp); }

// ---- Argama (Red) GD06-125: when it receives battle damage while you have a rested (AEUG) Unit, 1 damage to an enemy Unit ----
for (const id of ['GD06-039','GD06-044','GD06-045','GD06-046','GD06-035','GD06-033','GD02-079','GD03-071']){
  fresh('enemy'); const r=put(id,'player',{rested:true}); G.player.base=card('GD06-125','player'); const e1=stick('enemy',3,9), e2=stick('enemy',1,9);
  G.aiForceFace=true; A.resolveAiAttack(e1, ()=>{}, null); drainTasks(); G.aiForceFace=false; press(/Dummy 3\/9/); passAll();
  const ping = id==='GD06-033' ? 2 : 1;   // with ZZ Gundam in play Argama's own ping is +1 too (Argama is (AEUG))
  ok(`Argama (Red) pings with a rested ${A.CARD_BY_ID.get(id).name}`, e1.hp===9-ping && G.player.base && G.player.base.hp===3, `e1 ${e1.hp} base ${G.player.base&&G.player.base.hp}`); }
{ fresh('enemy'); put('GD06-044','player',{rested:true}); G.player.base=card('GD06-125','player'); G.player.base.hp=2; const e1=stick('enemy',3,9), e2=stick('enemy',1,9);
  G.aiForceFace=true; A.resolveAiAttack(e1, ()=>{}, null); drainTasks(); G.aiForceFace=false; press(/Dummy 3\/9/); passAll();
  ok('Argama (Red) pings even when the hit destroys it', e1.hp===8 && !G.player.base, `e1 ${e1.hp}`); }
{ fresh('enemy'); put('GD06-044','player'); G.player.base=card('GD06-125','player'); const e1=stick('enemy',3,9);
  G.aiForceFace=true; A.resolveAiAttack(e1, ()=>{}, null); drainTasks(); G.aiForceFace=false; passAll();
  ok('Argama (Red): no ping without a rested (AEUG) Unit', e1.hp===9); }

// ---- Judau Ashta: 【During Link】【Destroyed】Choose 1 (Gundam Team) Unit card that is Lv.2 or lower from your trash. Add it to your hand. ----
{ fresh('player'); const ncf=put('GD06-039','player'); const ct=put('GD06-044','player'); const cb=put('GD06-045','player'); pair(ct,'GD06-088');
  const zz=card('GD06-033','player'); G.player.hand=[zz, card('ST01-001','player')];
  A.inspect(ncf); const b=[...el('insBtns').children].find(x=>/⚡/.test((x.textContent||'')+(x.innerHTML||''))); if (b){ b.onclick(); drainTasks(); }
  passAll();
  ok("Judau (linked on Core Top): Neo Core Fighter's 【Activate】 returns Neo Core Fighter to hand and deploys ZZ", G.player.hand.includes(ncf) && G.player.field.includes(zz), `ncf in hand ${G.player.hand.includes(ncf)}`); }
{ fresh('enemy'); const ct=put('GD06-044','player',{rested:true}); pair(ct,'GD06-088'); ct.rested=true; const ncf=card('GD06-039','player'); G.player.trash.push(ncf);
  A.resolveAiAttack(stick('enemy',9,9), ()=>{}, ct); drainTasks(); passAll();
  ok('Judau: an AI attack destroying his linked Unit returns Neo Core Fighter', G.player.hand.includes(ncf)); }
{ fresh('enemy'); const zz=put('GD06-033','player'); pair(zz,'GD06-088'); const ncf=card('GD06-039','player'); G.player.trash.push(ncf);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:20}, zz, 'AI'); drainTasks(); passAll();
  ok('Judau linked on ZZ Gundam: AI effect damage destroying ZZ returns Neo Core Fighter', G.player.hand.includes(ncf)); }
{ fresh('enemy'); const cb=put('GD06-045','player'); pair(cb,'GD06-088'); const ncf=card('GD06-039','player'); G.player.trash.push(ncf);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:20}, cb, 'AI'); drainTasks(); passAll();
  ok("Judau on Core Base (no Link): his 【During Link】 pick-up correctly doesn't happen", !cb.linked && !G.player.hand.includes(ncf)); }

// ---- Sazabi GD05-049 【Attack】: you may destroy 1 of your Units; if you do, the opponent chooses 1 of their non-battling Units ----
{ fresh('enemy'); const sz=put('GD05-049','enemy'); const fodder=stick('enemy',1,1);
  const ct=put('GD06-044','player',{rested:true}); const hs=put('GD06-046','player'); const rd=put('GD02-079','player',{rested:true});
  A.resolveAiAttack(sz, ()=>{}, ct); drainTasks(); const m=modal();
  ok("AI's Sazabi: you choose which of your Units is destroyed", !!m && /Choose 1 of your non-battling Units/.test(m.msg) && m.btns.some(b=>/Rick Dias/.test(b)) && m.btns.some(b=>/Hyaku-Shiki/.test(b)), m&&m.msg);
  ok("AI's Sazabi: the Unit it attacks is battling, so it isn't offered", !!m && !m.btns.some(b=>/Core Top/.test(b)));
  press(/Rick Dias/); passAll();
  ok("AI's Sazabi: your choice is destroyed, the others stay", !G.player.field.includes(rd) && G.player.field.includes(hs) && !G.enemy.field.includes(fodder)); }
{ fresh('player'); const sz=put('GD05-049','player'); const mine=put('GD06-045','player'); const tgt=stick('enemy',2,9,{rested:true}); const other=stick('enemy',1,2);
  A.fieldClick(sz.uid); drainTasks(); A.fieldClick(tgt.uid); drainTasks(); const m=modal();
  ok('Your Sazabi: optional, Sazabi itself listed', !!m && m.btns.some(b=>/No target/.test(b)) && m.btns.some(b=>/Sazabi/.test(b)));
  press(/Core Base/); passAll();
  ok("Your Sazabi: the AI destroys a non-battling Unit, not the one you attack", !G.enemy.field.includes(other) && (G.enemy.field.includes(tgt) || tgt.hp<=0) && !G.player.field.includes(mine)); }
{ fresh('player'); const sz=put('GD05-049','player'); const mine=put('GD06-045','player'); stick('enemy',1,2);
  A.fieldClick(sz.uid); drainTasks(); A.attackDirect(); drainTasks(); press(/No target/); passAll();
  ok('Your Sazabi: declining keeps your Units', G.player.field.includes(mine)); }

// ---- Hyaku-Shiki 【Attack】: "Choose 1 of your other (Gundam Team) Units. It gets AP+2" — your choice ----
{ fresh('player'); const ct=put('GD06-044','player'); const cb=put('GD06-045','player'); const h=put('GD06-046','player'); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(h.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Hyaku-Shiki: you choose which (Gundam Team) Unit gets AP+2', !!m && /choose 1 of your Units/.test(m.msg) && m.btns.length===2, m&&m.msg);
  press(/Core Base/); passAll(); ok('Hyaku-Shiki: the chosen Unit gets AP+2', A.effAp(cb)===5 && A.effAp(ct)===3); }

// "【Activate･Main】②, return this Unit to the bottom of its owner's deck：…" (Impulse Gundam): the paired Pilot goes to the trash
// instead of vanishing with the Unit (found by fuzz_ui with the P/W Impulse preset).
for (const who of ['player','enemy']){ fresh(who); const s=who==='player'?G.player:G.enemy;
  const imp=put('ST09-001', who); const kira=pair(imp, 'ST04-010');
  const lv4=A.GUNDAM_CARDS.find(c=>c.type==='unit' && /Impulse Gundam/.test(c.name) && c.lv>=4); s.trash=[card(lv4.id, who)];
  A.applyActivateEffect(imp, null, s); drainTasks(); for (let g=0; g<4 && modal(); g++) if (!press(new RegExp(lv4.name.replace(/[()]/g,'.')))) press(/./);
  ok(`Impulse Gundam (${who}): returns to the bottom of the deck, its paired Pilot goes to the trash`,
    s.deck[0]===imp && !s.field.includes(imp) && s.trash.includes(kira) && !imp.pilotCard, `deck0=${s.deck[0]&&s.deck[0].name} trash=${s.trash.map(c=>c.name)}`); }

// An open "choose 1 of your Units" whose listed Units leave play meanwhile (Mikazuki Augus 【When Paired】 while Qubeley's token
// makes room by trashing one): the gone ones aren't offered, and with none left play carries on (found by pt_games).
{ fresh('player'); const q=put('GD01-007','player'); const a=put('ST01-005','player'); const e=stick('enemy',1,9); let done=0;
  A.resolvePlayerTrigger(card('ST05-010','player'), G.player, A.parseTrigger(A.CARD_BY_ID.get('ST05-010').effect,'When Paired'), 'Pair', ()=>{ done++; }); drainTasks();
  const open=G.mode==='trigger-target' && G.pending.cands.length===2;
  G.player.field.splice(G.player.field.indexOf(a),1); A.sendToTrash(a, G.player); A.render(); drainTasks();
  const pruned=G.mode==='trigger-target' && G.pending.cands.length===1 && G.pending.cands[0]===q.uid;
  G.player.field.splice(G.player.field.indexOf(q),1); A.sendToTrash(q, G.player); A.render(); drainTasks();
  ok('Mikazuki Augus: a chosen-from Unit that left play is dropped; with none left the choice closes and play carries on', open && pruned && G.mode==='idle' && done===1, `open=${open} pruned=${pruned} mode=${G.mode} done=${done}`); }

console.log('== Harsh Meta Slave Deck reports (UI paths) ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
