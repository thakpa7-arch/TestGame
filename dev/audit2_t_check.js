// Audit 2, group t: triggered / activated ability bodies — target restrictions read off the choose sentence ("friendly Unit
// with <Blocker>", "of your other Units", "(Phantom Pain) Linked Units", "damaged (Dianna Counter) Units", "whose Lv./AP is
// equal to or … than this Unit", "other Unit that is being attacked", "or 1 of your (Neo Zeon) Bases"), every-Unit effects
// ("All friendly (Marine) Units get AP+1", "all … recover 1 HP", "All your Units gain <Repair 1>", "Deal 3 damage to all
// Bases"), costs and riders ("Destroy this and …", "You may discard 1 <filter> card. If you do, … Then, …", "you may return a
// blue Pilot", "to the top of its owner's deck", "Rest it. It won't be set as active …", "1 to 3 … Return them"), trash
// retrieval filters ("with <Suppression>", "with/without "X" in its card name"), and per-Unit keyword counts.
// Player choices go through the real UI (playFromHand, fieldClick, the action-step modal, the choosers); the AI side through
// runTrigger / aiActivate / its attack and block steps.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=880000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
// Seat a Pilot without firing its triggers (only the paired state matters).
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; return p; };
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const kill=u=>{ const s=side(u.owner), foe=s===G.player?G.enemy:G.player; A.applyToTarget(stick(foe.who,1,1), foe, {kind:'damage', amount:99}, u, 'T'); drainTasks(); };
const trig=(id, kw)=>A.parseTrigger(A.CARD_BY_ID.get(id).effect, kw);
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
function lookModal(){ const ov=[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay')); if(!ov) return null;
  const box=ov.children[0]; const row=box && box.children[0]; return { ov, tiles:row?[...row.children]:[] }; }
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };

// ---- Archangel ST04-015: 【Activate･Main】②：Choose 1 friendly Unit with <Blocker>. Set it as active. It can't attack during this turn.
{ fresh('player'); const b=card('ST04-015','player'); b.sick=false; G.player.base=b;
  const moe=put('ST04-004','player',{rested:true}), gm=put('ST01-005','player',{rested:true}); const foe=stick('enemy',1,1,{rested:true});
  A.startActivate(b); drainTasks();
  ok('Archangel: only a friendly Unit with <Blocker> can be chosen', G.mode==='activate-target' && JSON.stringify(G.activateCands)===JSON.stringify([moe.uid]), JSON.stringify(G.activateCands));
  A.fieldClick(gm.uid); drainTasks(); ok('Archangel: the non-Blocker GM is refused', gm.rested && G.mode==='activate-target');
  A.fieldClick(moe.uid); drainTasks();
  ok('Archangel: Moebius is set active', !moe.rested);
  A.fieldClick(moe.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok("Archangel: the readied Unit can't attack during this turn", foe.hp===1 && !moe.rested, `foe hp ${foe.hp}`); }
{ fresh('enemy'); const b=card('ST04-015','enemy'); b.sick=false; G.enemy.base=b;
  const moe=put('ST04-004','enemy',{rested:true}), gm=put('ST01-005','enemy',{rested:true});
  A.aiActivate(b); drainTasks();
  ok("Archangel (AI): readies its Blocker, not the GM, and it can't attack this turn", !moe.rested && gm.rested && moe.noAttackTurn===G.turnSeq); }

// ---- Gundam Barbatos 4th Form ST05-001: 【Deploy】Choose 1 of your other Units. Deal 1 damage to it. It gets AP+1 during this turn.
{ fresh('enemy'); const o=stick('enemy',2,3); const u=put('ST05-001','enemy'); A.runTrigger(u, G.enemy, trig('ST05-001','Deploy'), 'Deploy'); drainTasks();
  ok('Barbatos 4th Form (AI): pings the other Unit, never itself', o.hp===2 && A.effAp(o)===3 && u.hp===u.maxHp, `o ${o.hp}/${A.effAp(o)} self ${u.hp}`); }
{ fresh('enemy'); const u=put('ST05-001','enemy'); A.runTrigger(u, G.enemy, trig('ST05-001','Deploy'), 'Deploy'); drainTasks();
  ok('Barbatos 4th Form (AI): alone, nothing happens', u.hp===u.maxHp); }
{ fresh('player'); const o1=stick('player',2,3), o2=stick('player',3,4); G.player.hand=[card('ST05-001','player')]; const bb=G.player.hand[0];
  A.playFromHand(bb.uid); drainTasks();
  const cands=(G.pending&&G.pending.cands)||[];
  ok('Barbatos 4th Form: the player chooses among the OTHER Units only', G.mode==='trigger-target' && cands.length===2 && !cands.includes(bb.uid), JSON.stringify(cands));
  A.fieldClick(o2.uid); drainTasks(); ok('Barbatos 4th Form: the chosen Unit takes 1 and gets AP+1', o2.hp===3 && A.effAp(o2)===4 && bb.hp===bb.maxHp); }
{ fresh('player'); G.player.hand=[card('ST05-001','player')]; const bb=G.player.hand[0]; A.playFromHand(bb.uid); drainTasks();
  ok('Barbatos 4th Form: deployed alone it never damages itself', G.player.field.includes(bb) && bb.hp===bb.maxHp && G.mode==='idle'); }

// ---- Gundam AGE-1 Normal GD02-021: 【Deploy】You may discard 1 green (Earth Federation) Unit card. If you do, place 1 EX Resource.
//      Then, if you are Lv.7 or higher, draw 1.
{ fresh('player'); G.player.resMax=8; G.player.hand=[card('GD02-021','player'), card('GD02-029','player'), card('ST01-001','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); const m=modal();
  ok('AGE-1 Normal: you are asked, and only the green (EF) Unit card is offered', !!m && m.btns.length===2 && /AGE-1 Normal/.test(m.btns[0]) && /Don't/.test(m.btns[1]), JSON.stringify(m));
  press(/AGE-1 Normal/);
  ok('AGE-1 Normal: discarding places 1 EX Resource, then Lv.8 draws 1', G.player.ex===1 && G.player.trash.some(c=>c.def==='GD02-029') && G.player.hand.length===2, `ex ${G.player.ex} hand ${G.player.hand.map(c=>c.def)}`); }
{ fresh('player'); G.player.resMax=8; G.player.hand=[card('GD02-021','player'), card('GD02-029','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/Don't/);
  ok('AGE-1 Normal: declining places no EX Resource — and no Lv.7 draw either (the "Then" needs the discard — Q175)', G.player.ex===0 && G.player.hand.length===1, `ex ${G.player.ex} hand ${G.player.hand.length}`); }
{ fresh('player'); G.player.resMax=4; G.player.hand=[card('GD02-021','player'), card('ST01-001','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok('AGE-1 Normal: no green (EF) Unit card — no prompt, no EX Resource, no draw below Lv.7', !modal() && G.player.ex===0 && G.player.hand.length===1, `ex ${G.player.ex} hand ${G.player.hand.length}`); }
{ fresh('enemy'); G.enemy.resMax=8; G.enemy.hand=[card('GD02-029','enemy'), card('ST01-001','enemy')]; const u=put('GD02-021','enemy');
  A.runTrigger(u, G.enemy, trig('GD02-021','Deploy'), 'Deploy'); drainTasks();
  ok('AGE-1 Normal (AI): discards the green (EF) Unit card, places 1 EX, draws 1', G.enemy.ex===1 && G.enemy.trash.some(c=>c.def==='GD02-029') && G.enemy.hand.length===2 && G.enemy.hand.some(c=>c.def==='ST01-001'), `ex ${G.enemy.ex} hand ${G.enemy.hand.map(c=>c.def)}`); }

// ---- Gaza C GD02-047: 【Activate･Main】Rest this Unit：Destroy this and choose 1 enemy Unit that is Lv.5 or lower. Deal 1 damage to it.
{ fresh('player'); const g=put('GD02-047','player'); const e=stick('enemy',1,3,{lv:5}), hi=stick('enemy',1,3,{lv:6});
  A.startActivate(g); drainTasks(); ok('Gaza C: only a Lv.5-or-lower enemy Unit can be chosen', G.mode==='activate-target' && JSON.stringify(G.activateCands)===JSON.stringify([e.uid]));
  A.fieldClick(e.uid); drainTasks();
  ok('Gaza C: it is destroyed, and the enemy Unit takes 1', !G.player.field.includes(g) && G.player.trash.includes(g) && e.hp===2 && hi.hp===3); }
{ fresh('enemy'); const g=put('GD02-047','enemy'); const p=stick('player',1,3,{lv:2}); A.aiActivate(g); drainTasks();
  ok('Gaza C (AI): destroys itself and deals 1', !G.enemy.field.includes(g) && p.hp===2); }

// ---- Gamow GD01-127: 【Activate･Action】Rest this Base：Choose 1 friendly (ZAFT) Unit with 5 or more AP. It gains <Breach 3> during this battle.
{ fresh('player'); const b=card('GD01-127','player'); b.sick=false; G.player.base=b;
  const z=stick('player',5,5,{trait:'(ZAFT)'}), nz=stick('player',6,5,{trait:'(OZ)'}), z4=stick('player',4,5,{trait:'(ZAFT)'}), z2=stick('player',6,5,{trait:'(ZAFT)'});
  ok('Gamow: not usable in the main phase (【Activate･Action】)', !A.activateReady(b));
  // In the action step of z's attack: the chooser lists only the (ZAFT) Units with 5 or more AP.
  const foe=stick('enemy',1,9,{rested:true}); A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Gamow/); const m=modal();
  const names=m ? m.btns.join('|') : '';
  ok('Gamow: only a (ZAFT) Unit with 5 or more AP is a candidate (never the Base)', !!m && names.includes(z.name) && names.includes(z2.name) && !names.includes(nz.name) && !names.includes(z4.name) && !names.includes(b.name), names);
  G.over=true; }
{ fresh('player'); const b=card('GD01-127','player'); b.sick=false; G.player.base=b;
  const z=stick('player',5,5,{trait:'(ZAFT)'}); const foe=stick('enemy',1,2,{rested:true}); const sh0=G.enemy.shields.length;
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Gamow is offered in the action step of your attack', !!modal() && modal().btns.some(x=>/Gamow/.test(x)));
  press(/Gamow/); passAll();
  ok('Gamow: the attacking (ZAFT) Unit gains <Breach 3> for the battle; the Base gains nothing', logs().some(l=>l.includes(`${z.name} gains &lt;Breach 3&gt; during this battle`)) && !(b.tempBreach) && !(b.battleBreach) && b.rested, JSON.stringify(logs().slice(0,4)));
  ok('Gamow: the <Breach 3> hits a Shield, and ends with the battle', G.enemy.shields.length===sh0-1 && A.effBreach(z)===0, `shields ${G.enemy.shields.length} breach after ${A.effBreach(z)}`); }
{ fresh('enemy'); const b=card('GD01-127','enemy'); b.sick=false; G.enemy.base=b; const z=stick('enemy',5,5,{trait:'(ZAFT)'}); const enz=stick('enemy',7,5,{trait:'(OZ)'});
  ok("Gamow (AI): not used in the main phase (\"during this battle\")", !A.aiActivate(b) && !b.rested);
  const t=stick('player',1,2,{rested:true}); const sh0=G.player.shields.length;
  A.resolveAiAttack(z, ()=>{}, t); drainTasks(); passAll();
  ok('Gamow (AI): its attacking (ZAFT) Unit gains <Breach 3> and breaks a Shield', b.rested && G.player.shields.length===sh0-1 && !G.player.field.includes(t), `rested ${b.rested} shields ${G.player.shields.length}`); }

// ---- Bertigo GD03-037: 【During Link】During your turn, while this Unit is battling an enemy Unit with a 【Destroyed】 effect, it gains <First Strike>.
ok("Bertigo: the 【Destroyed】 named in its text is not a trigger of its own", trig('GD03-037','Destroyed')===null);
{ fresh('player'); const b=put('GD03-037','player',{linked:true}); const nt=put('GD03-007','enemy',{rested:true});
  A.fieldClick(b.uid); drainTasks(); A.fieldClick(nt.uid); drainTasks(); passAll();
  ok('Bertigo: linked, battling a Unit with a 【Destroyed】 effect, it strikes first', b.hp===4 && !G.enemy.field.includes(nt), `hp ${b.hp}`); }
{ fresh('player'); const b=put('GD03-037','player',{linked:true}); const s=stick('enemy',2,9,{rested:true});
  A.fieldClick(b.uid); drainTasks(); A.fieldClick(s.uid); drainTasks(); passAll();
  ok('Bertigo: against a Unit with no 【Destroyed】 effect, no <First Strike>', b.hp===2, `hp ${b.hp}`); }
{ fresh('player'); const b=put('GD03-037','player'); const nt=put('GD03-007','enemy',{rested:true});
  A.fieldClick(b.uid); drainTasks(); A.fieldClick(nt.uid); drainTasks(); passAll();
  ok('Bertigo: not linked, no <First Strike>', b.hp===2, `hp ${b.hp}`); }
{ fresh('enemy'); const b=put('GD03-037','enemy',{linked:true}); const nt=put('GD03-007','player',{rested:true});
  A.resolveAiAttack(b, ()=>{}, nt); drainTasks(); passAll();
  ok('Bertigo (AI): strikes first against a 【Destroyed】 Unit on its turn', b.hp===4, `hp ${b.hp}`); }
{ fresh('enemy'); const b=put('GD03-037','player',{linked:true, rested:true}); const nt=put('GD03-007','enemy');
  A.resolveAiAttack(nt, ()=>{}, b); drainTasks(); passAll();
  ok("Bertigo: on the opponent's turn it doesn't strike first", b.hp===2, `hp ${b.hp}`); }

// ---- Justice Gundam (METEOR) GD03-077: 【When Linked】Choose 1 to 3 enemy Units with 3 or less HP. Return them to their owners' hands.
{ fresh('enemy'); const j=put('GD03-077','enemy'); const a=put('ST01-005','player'), b=put('ST01-005','player'), c=put('ST01-005','player'), big=put('ST01-001','player');
  A.runTrigger(j, G.enemy, trig('GD03-077','When Linked'), 'When Linked'); drainTasks();
  ok('Justice (METEOR) (AI): returns all 3 eligible Units, not the 4-HP one', G.player.field.length===1 && G.player.field[0]===big && G.player.hand.length===3, `field ${G.player.field.length} hand ${G.player.hand.length}`); }
{ fresh('player'); const j=put('GD03-077','player'); const a=put('ST01-005','enemy'), b=put('ST01-005','enemy'), c=put('ST01-005','enemy'), big=put('ST01-001','enemy');
  A.resolvePlayerTrigger(j, G.player, trig('GD03-077','When Linked'), 'When Linked', ()=>{}); drainTasks();
  const m1=modal(); ok('Justice (METEOR): the player chooses up to 3 of the eligible Units (not the 4-HP one)', !!m1 && /1 to 3/.test(m1.msg) && m1.btns.filter(x=>x.includes(a.name)).length===3 && !m1.btns.some(x=>x.includes(big.name)), m1&&m1.btns.join('|'));
  press(new RegExp(a.name.replace(/[()]/g,'.'))); press(new RegExp(a.name.replace(/[()]/g,'.'))); const m2=modal(); press(/^Done/);
  ok('Justice (METEOR): the 2 chosen return to hand (the player stopped at 2)', !!m2 && m2.btns.includes('Done') && G.enemy.field.length===2 && G.enemy.field.includes(big) && G.enemy.hand.length===2, `field ${G.enemy.field.length} hand ${G.enemy.hand.length}`); }

// ---- Patulia GD03-041: 【Deploy】Deal 3 damage to all Bases.
{ fresh('player'); G.player.base=card('ST03-015','player'); G.enemy.base=card('ST03-015','enemy'); const mine=stick('player',2,9), theirs=stick('enemy',2,9);
  G.player.hand=[card('GD03-041','player')]; const p=G.player.hand[0]; A.playFromHand(p.uid); drainTasks();
  ok("Patulia: both players' Bases take 3; no Unit is damaged", G.player.base.hp===2 && G.enemy.base.hp===2 && mine.hp===9 && theirs.hp===9 && p.hp===p.maxHp, `bases ${G.player.base.hp}/${G.enemy.base.hp} units ${mine.hp}/${theirs.hp}/${p.hp}`); }
{ fresh('enemy'); G.player.base=card('ST03-015','player'); const p=put('GD03-041','enemy'); const theirs=stick('player',2,9);
  A.runTrigger(p, G.enemy, trig('GD03-041','Deploy'), 'Deploy'); drainTasks();
  ok('Patulia (AI): the Base takes 3 (no enemy Base on its own side to hit)', G.player.base.hp===2 && theirs.hp===9 && p.hp===p.maxHp); }

// ---- Zedas R GD03-059: 【Attack】You may choose 1 (Vagan) card from your trash. Exile it from the game. If you do, choose 1 of your
//      (Vagan) Units. It gets AP+2 during this turn.
{ fresh('enemy'); setTrash('enemy',['GD02-067']); const z=put('GD03-059','enemy'); const nv=stick('enemy',6,6), bq=put('GD02-067','enemy');
  A.runTrigger(z, G.enemy, trig('GD03-059','Attack'), 'Attack'); drainTasks();
  ok('Zedas R (AI): only a (Vagan) Unit gets AP+2', A.effAp(nv)===6 && (A.effAp(z)===z.baseAp+2 || A.effAp(bq)===bq.baseAp+2), `nv ${A.effAp(nv)} z ${A.effAp(z)} bq ${A.effAp(bq)}`); }
{ fresh('player'); setTrash('player',['GD02-067']); const z=put('GD03-059','player'); const nv=stick('player',6,6), bq=put('GD02-067','player');
  A.resolvePlayerTrigger(z, G.player, trig('GD03-059','Attack'), 'Attack', ()=>{}); drainTasks(); press(/Exile/);
  const m=modal(); ok('Zedas R: the chooser lists the (Vagan) Units only', !!m && m.btns.length===2 && !m.btns.some(x=>/Dummy/.test(x)), JSON.stringify(m&&m.btns));
  press(/Baqto/); ok('Zedas R: the chosen (Vagan) Unit gets AP+2', A.effAp(bq)===bq.baseAp+2 && A.effAp(nv)===6); }

// ---- Gwadan GD02-125: 【Deploy】Add 1 of your Shields to your hand. Then, if it is your turn, you may discard 1 red card. If you do, draw 1.
{ fresh('player'); const b=card('GD02-125','player'); G.player.base=b; G.player.hand=[card('ST01-005','player'), card('ST03-003','player')];
  A.resolvePlayerTrigger(b, G.player, trig('GD02-125','Deploy'), 'Deploy', ()=>{}); drainTasks(); const m=modal();
  ok('Gwadan: you may discard — only the red card is offered', !!m && m.btns.length===2 && /Geara Zulu/.test(m.btns[0]) && /Don't/.test(m.btns[1]), JSON.stringify(m&&m.btns));
  const h0=G.player.hand.length; press(/Geara Zulu/);
  ok('Gwadan: the red card is discarded and you draw 1', G.player.trash.some(c=>c.def==='ST03-003') && G.player.hand.length===h0); }
{ fresh('player'); const b=card('GD02-125','player'); G.player.base=b; G.player.hand=[card('ST01-005','player'), card('ST01-001','player')];
  A.resolvePlayerTrigger(b, G.player, trig('GD02-125','Deploy'), 'Deploy', ()=>{}); drainTasks();
  ok('Gwadan: with no red card in hand nothing is discarded and nothing drawn', !modal() && !G.player.trash.length && G.player.hand.length===3, `hand ${G.player.hand.length}`); }
{ fresh('enemy'); const b=card('GD02-125','enemy'); G.enemy.base=b; G.enemy.hand=[card('ST01-005','enemy'), card('ST01-001','enemy')];
  A.runTrigger(b, G.enemy, trig('GD02-125','Deploy'), 'Deploy'); drainTasks();
  ok('Gwadan (AI): no red card — no discard', !G.enemy.trash.length && G.enemy.hand.length===3); }
{ fresh('enemy'); const b=card('GD02-125','enemy'); G.enemy.base=b; G.enemy.hand=[card('ST01-005','enemy'), card('ST03-003','enemy')];
  A.runTrigger(b, G.enemy, trig('GD02-125','Deploy'), 'Deploy'); drainTasks();
  ok('Gwadan (AI): discards its red card and draws', G.enemy.trash.some(c=>c.def==='ST03-003') && !G.enemy.trash.some(c=>c.def==='ST01-005') && G.enemy.hand.length===3); }

// ---- Yazan Gable GD03-086: 【Attack】Choose 1 of your (Titans) Units whose Lv. is equal to or lower than this Unit. It gets AP+1.
{ fresh('player'); const h=put('GD04-010','player'); seat(h, 'GD03-086'); const hi=put('GD03-003','player'), lo=put('GD02-013','player'); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(h.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok("Yazan Gable: the Lv.6 (Titans) Unit isn't offered (host is Lv.4)", !!m && /choose 1 of your Units/.test(m.msg) && m.btns.length===2 && !m.btns.some(x=>/Messala/.test(x)), JSON.stringify(m&&m.btns));
  press(/Hizack/); passAll(); ok('Yazan Gable: the chosen Lv.2 Unit gets AP+1', A.effAp(lo)===lo.baseAp+1 && A.effAp(hi)===hi.baseAp); }
{ fresh('enemy'); const h=put('GD04-010','enemy'); seat(h, 'GD03-086'); const hi=put('GD03-003','enemy'); const t=stick('player',1,9,{rested:true});
  A.resolveAiAttack(h, ()=>{}, t); drainTasks(); passAll();
  ok('Yazan Gable (AI): never buffs the higher-Lv. (Titans) Unit', A.effAp(hi)===hi.baseAp); }

// ---- Gundam GD04-001: 【During Link】【Attack】If you are attacking an enemy Unit, you may return a blue Pilot paired with this Unit to its owner's hand.
{ fresh('player'); const g=put('GD04-001','player',{linked:true}); const p=seat(g, 'GD01-089'); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(g.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Gundam GD04-001: you are asked whether to return the blue Pilot', !!m && /return/i.test(m.msg) && m.btns.some(x=>/Return/.test(x)), JSON.stringify(m));
  press(/Return/); passAll(); ok('Gundam GD04-001: yes — the blue Pilot goes to your hand', G.player.hand.includes(p) && !g.pilotCard); }
{ fresh('player'); const g=put('GD04-001','player',{linked:true}); const p=seat(g, 'GD01-089'); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(g.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Don't/); passAll();
  ok('Gundam GD04-001: no — the Pilot stays', g.pilotCard===p && !G.player.hand.includes(p)); }
{ fresh('player'); const g=put('GD04-001','player',{linked:true}); const p=seat(g, 'GD01-094'); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(g.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Gundam GD04-001: a red Pilot is never offered or returned', !(modal() && /return/i.test(modal().msg)) && g.pilotCard===p); passAll(); }
{ fresh('enemy'); const g=put('GD04-001','enemy',{linked:true}); const p=seat(g, 'GD01-094'); const t=stick('player',1,9,{rested:true});
  A.resolveAiAttack(g, ()=>{}, t); drainTasks(); passAll();
  ok('Gundam GD04-001 (AI): a red Pilot is not returned', g.pilotCard===p && !G.enemy.hand.includes(p)); }

// ---- Trash retrieval filters: Pala Sys GD04-094 (purple Unit card with <Suppression>), Reformationist GD04-114 【Burst】 ("Trans-Am"
//      in its card name), Force Impulse Gundam ST09-002 (without "Force Impulse Gundam" in its card name)
{ fresh('enemy'); setTrash('enemy',['GD04-064']); const u=put('GD04-061','enemy'); A.runTrigger(u, G.enemy, trig('GD04-094','When Linked'), 'When Linked'); drainTasks();
  ok('Pala Sys (AI): a purple Unit card without <Suppression> is not retrieved', !G.enemy.hand.length);
  fresh('enemy'); setTrash('enemy',['GD04-064','GD04-049']); const u2=put('GD04-061','enemy'); A.runTrigger(u2, G.enemy, trig('GD04-094','When Linked'), 'When Linked'); drainTasks();
  ok('Pala Sys (AI): the purple <Suppression> Unit card is retrieved', G.enemy.hand.length===1 && G.enemy.hand[0].def==='GD04-049'); }
{ fresh('player'); setTrash('player',['GD04-064','GD04-049','GD03-049']); const u=put('GD04-061','player');
  A.resolvePlayerTrigger(u, G.player, trig('GD04-094','When Linked'), 'When Linked', ()=>{}); drainTasks(); const lm=lookModal();
  const names=lm ? lm.tiles.map(t=>t.textContent||'') : [];
  ok('Pala Sys: the chooser offers only the <Suppression> purple Unit cards', !!lm && lm.tiles.length===2 && !names.some(n=>/^Gundam Exia$/.test(n)), JSON.stringify(names));
  if (lm) lm.tiles[0].onclick(); drainTasks(); ok('Pala Sys: the chosen card goes to hand', G.player.hand.length===1 && G.player.hand[0].suppression); }
{ fresh('enemy'); setTrash('player',['GD04-064']); A.triggerBurst(card('GD04-114','player'), G.player, ()=>{}, true); drainTasks(); while (modal() && press(/Exia|Add|Activate|Use|Yes/)){}
  ok('Reformationist 【Burst】: a Unit without "Trans-Am" in its name is not retrieved', !G.player.hand.some(c=>c.def==='GD04-064'));
  fresh('player'); setTrash('enemy',['GD04-064','GD03-049']); A.triggerBurst(card('GD04-114','enemy'), G.enemy, ()=>{}, false); drainTasks();
  ok('Reformationist 【Burst】 (AI): takes the "Trans-Am" Unit card', G.enemy.hand.some(c=>c.def==='GD03-049') && !G.enemy.hand.some(c=>c.def==='GD04-064')); }
{ fresh('enemy'); setTrash('player',['GD05-064','GD04-055']); const fi=put('ST09-002','player'); kill(fi); const lm=lookModal(); if (lm && lm.tiles[0]) lm.tiles[0].onclick(); drainTasks();
  ok('Force Impulse Gundam ST09-002: only a (Minerva Squad) Unit without "Force Impulse Gundam" in its name', G.player.hand.length===1 && G.player.hand[0].def==='GD04-055', JSON.stringify(G.player.hand.map(c=>c.def)));
  fresh('player'); setTrash('enemy',['GD05-064','GD04-055']); const fi2=put('ST09-002','enemy'); kill(fi2);
  ok('Force Impulse Gundam ST09-002 (AI): takes the other (Minerva Squad) Unit', G.enemy.hand.length===1 && G.enemy.hand[0].def==='GD04-055');
  fresh('player'); setTrash('enemy',['GD05-064']); const fi3=put('ST09-002','enemy'); kill(fi3);
  ok('Force Impulse Gundam ST09-002 (AI): only Force Impulse Gundam in the trash — nothing', !G.enemy.hand.length); }

// ---- Willgem GD04-129: 【Deploy】Add 1 of your Shields to your hand. Then, deal 3 damage to this Base.
{ fresh('player'); const b=card('GD04-129','player'); G.player.base=b; const e=stick('enemy',2,5); const sh=G.player.shields.length;
  A.resolvePlayerTrigger(b, G.player, trig('GD04-129','Deploy'), 'Deploy', ()=>{}); drainTasks();
  ok('Willgem: the Base takes 3 (7 -> 4); no enemy Unit is chosen', b.hp===4 && e.hp===5 && G.mode==='idle' && G.player.shields.length===sh-1, `base ${b.hp} e ${e.hp}`); }
{ fresh('enemy'); const b=card('GD04-129','enemy'); G.enemy.base=b; const p=stick('player',2,5);
  A.runTrigger(b, G.enemy, trig('GD04-129','Deploy'), 'Deploy'); drainTasks();
  ok('Willgem (AI): its own Base takes 3', b.hp===4 && p.hp===5); }

// ---- Gundam Astray Red Frame Custom (EX) EB01-001: … Rest it. It won't be set as active during the start phase of your opponent's next turn.
{ fresh('player'); const u=put('EB01-001','player'); setTrash('player',['ST01-012','ST01-013']); const d=stick('enemy',3,5,{lv:7}); d.hp=3;
  A.startActivate(u); drainTasks(); A.fieldClick(d.uid); drainTasks();
  ok('Red Frame Custom (EX): the target is rested and stays down', d.rested && d.stunned===true);
  A.beginTurn('enemy'); ok("Red Frame Custom (EX): it isn't set active in the opponent's start phase", d.rested); G.over=true; }
{ fresh('enemy'); const u=put('EB01-001','enemy'); setTrash('enemy',['ST01-012','ST01-013']); const d=stick('player',3,5,{lv:7}); d.hp=3;
  A.aiActivate(u); drainTasks(); ok('Red Frame Custom (EX) (AI): stuns the damaged Unit', d.rested && d.stunned===true); }

// ---- Taurus (Sanc Kingdom) EB01-033: 【Activate･Action】【Once per Turn】①：Choose 1 other Unit that is being attacked. It gets AP+1 during this battle.
{ fresh('enemy'); const t=put('EB01-033','player'); const x=stick('player',2,9,{rested:true}); const atk=stick('enemy',3,3);
  A.resolveAiAttack(atk, ()=>{}, x); drainTasks();
  ok('Taurus: offered in the action step while your Unit is being attacked', !!modal() && modal().btns.some(b=>/Taurus/.test(b)));
  press(/Taurus/); passAll();
  ok('Taurus: the attacked Unit gets AP+1 for the battle', logs().some(l=>l.includes(`${x.name} gets AP+1 during this battle`)) && !t.battleAp, JSON.stringify(logs().slice(0,4)));
  ok('Taurus: the boosted Unit destroys the attacker, and the AP+1 ends with the battle', !G.enemy.field.includes(atk) && A.effAp(x)===2); }
{ fresh('player'); const t=put('EB01-033','player'); const atk=stick('player',3,9); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Taurus/); passAll();
  ok("Taurus: your own attacker (not being attacked) never gets the AP+1", foe.hp===9-3, `foe hp ${foe.hp}`); }
{ fresh('player'); const t=put('EB01-033','enemy'); const y=stick('enemy',2,9,{rested:true}); const atk=stick('player',3,3);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(y.uid); drainTasks(); passAll();
  ok('Taurus (AI): boosts its Unit being attacked when that lets it destroy the attacker', !G.player.field.includes(atk) && G.enemy.resAvail===9, `atk hp ${atk.hp} res ${G.enemy.resAvail}`); }
{ fresh('enemy'); const t=put('EB01-033','enemy'); ok("Taurus (AI): no Unit is being attacked — it isn't used", !A.aiActivate(t) && G.enemy.resAvail===10); }

// ---- Chall Acustica EB01-068: 【During Link】【Destroyed】You may return the card paired with this Unit to the top of its owner's deck.
{ fresh('enemy'); const u=put('EB01-028','player'); const p=seat(u,'EB01-068'); u.linked=true; const d0=G.player.deck.length;
  kill(u); const m=modal(); ok('Chall Acustica: you are asked', !!m && /top of your deck/.test(m.msg), JSON.stringify(m));
  press(/Return/); ok('Chall Acustica: yes — the Pilot goes to the top of your deck, not your hand', G.player.deck[G.player.deck.length-1]===p && G.player.deck.length===d0+1 && !G.player.hand.includes(p)); }
{ fresh('enemy'); const u=put('EB01-028','player'); const p=seat(u,'EB01-068'); u.linked=true; kill(u); press(/Don't/);
  ok('Chall Acustica: no — the Pilot stays in the trash', G.player.trash.includes(p) && !G.player.hand.includes(p)); }
{ fresh('player'); const u=put('EB01-028','enemy'); const p=seat(u,'EB01-068'); u.linked=true; kill(u);
  ok('Chall Acustica (AI): returns the Pilot to the top of its deck', G.enemy.deck[G.enemy.deck.length-1]===p && !G.enemy.hand.includes(p)); }

// ---- Luna Mana & Carry Base ST10-016: 【Deploy】Add 1 of your Shields to your hand. Then, all friendly (G Generation) Units recover 1 HP.
{ fresh('player'); const b=card('ST10-016','player'); G.player.base=b; const a=put('EB01-007','player'), c=put('EB01-003','player'), o=stick('player',2,5); a.hp=1; c.hp=1; o.hp=1;
  A.resolvePlayerTrigger(b, G.player, trig('ST10-016','Deploy'), 'Deploy', ()=>{}); drainTasks();
  ok('Luna Mana & Carry Base: every friendly (G Generation) Unit recovers 1, with no choice', !modal() && a.hp===2 && c.hp===2 && o.hp===1, `${a.hp}/${c.hp}/${o.hp}`); }
{ fresh('enemy'); const b=card('ST10-016','enemy'); G.enemy.base=b; const a=put('EB01-007','enemy'), c=put('EB01-003','enemy'); a.hp=1; c.hp=1;
  A.runTrigger(b, G.enemy, trig('ST10-016','Deploy'), 'Deploy'); drainTasks(); ok('Luna Mana & Carry Base (AI): both recover 1', a.hp===2 && c.hp===2); }

// ---- Chaos Gundam GD05-039: 【Attack】Choose 1 of your (Phantom Pain) Linked Units. It gains <High-Maneuver> during this turn.
{ fresh('player'); const c=put('GD05-039','player'); const unl=stick('player',3,3,{trait:'(Phantom Pain)'}); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(c.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok('Chaos Gundam: with no (Phantom Pain) Link Unit nothing is offered or gained', !(modal() && /choose 1 of your Units/.test(modal().msg)) && !A.effHighManeuver(unl) && !A.effHighManeuver(c)); passAll(); }
{ fresh('player'); const c=put('GD05-039','player'); const l1=stick('player',3,3,{trait:'(Phantom Pain)', linked:true}), l2=stick('player',2,3,{trait:'(Phantom Pain)', linked:true}), unl=stick('player',4,3,{trait:'(Phantom Pain)'}); const foe=stick('enemy',1,9,{rested:true});
  A.fieldClick(c.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const m=modal();
  ok('Chaos Gundam: only the (Phantom Pain) Link Units are offered', !!m && m.btns.length===2 && !m.btns.some(b=>b.includes(unl.name)), JSON.stringify(m&&m.btns));
  press(new RegExp(l2.name.replace(/[#/]/g,'.'))); passAll(); ok('Chaos Gundam: the chosen Link Unit gains <High-Maneuver>', A.effHighManeuver(l2) && !A.effHighManeuver(unl)); }
{ fresh('enemy'); const c=put('GD05-039','enemy'); const l=stick('enemy',3,3,{trait:'(Phantom Pain)', linked:true}), unl=stick('enemy',5,3,{trait:'(Phantom Pain)'}); const t=stick('player',1,9,{rested:true});
  A.resolveAiAttack(c, ()=>{}, t); drainTasks(); passAll();
  ok('Chaos Gundam (AI): the Link Unit gains it, not the unlinked one or itself', A.effHighManeuver(l) && !A.effHighManeuver(unl) && !A.effHighManeuver(c)); }

// ---- Char Aznable ST11-011: 【When Paired】All friendly (Marine) Units get AP+1 during this turn.
{ fresh('player'); const z=put('ST11-003','player'), d=put('ST11-008','player'), nm=stick('player',1,1); const a0=A.effAp(d);
  pair(z, 'ST11-011');
  ok('Char Aznable: every (Marine) Unit gets AP+1, the others nothing, with no choice', !modal() && A.effAp(d)===a0+1 && A.effAp(nm)===1 && z.tempAp===1, `d ${A.effAp(d)} nm ${A.effAp(nm)} z.tempAp ${z.tempAp}`); }
{ fresh('enemy'); const z=put('ST11-003','enemy'), d=put('ST11-008','enemy'), nm=stick('enemy',1,1); pair(z, 'ST11-011');
  ok('Char Aznable (AI): both (Marine) Units get AP+1', z.tempAp===1 && d.tempAp===1 && !nm.tempAp); }

// ---- Red Gundam GD06-011: 【When Linked】All your Units gain <Repair 1> during this turn.
{ fresh('player'); const r=put('GD06-011','player'); const o=stick('player',2,5); o.hp=2; r.hp=3;
  A.resolvePlayerTrigger(r, G.player, trig('GD06-011','When Linked'), 'When Linked', ()=>{}); drainTasks();
  ok('Red Gundam: every friendly Unit gains <Repair 1> (no healing now, no choice)', !modal() && A.effRepair(o)===1 && A.effRepair(r)===1 && o.hp===2 && r.hp===3); }
{ fresh('enemy'); const r=put('GD06-011','enemy'); const o=stick('enemy',2,5); o.hp=2; const e=stick('player',2,5);
  A.runTrigger(r, G.enemy, trig('GD06-011','When Linked'), 'When Linked'); drainTasks();
  ok('Red Gundam (AI): its Units gain <Repair 1>, the enemy\'s do not', A.effRepair(o)===1 && A.effRepair(e)===0 && o.hp===2); }

// ---- Elpeo Ple's Qubeley Mk-II GD06-018: … Choose 1 of your (Neo Zeon)/(Long-Range Weapon) Units or 1 of your (Neo Zeon) Bases. …
{ fresh('enemy'); const q=put('GD06-018','player',{rested:true}); seat(q, 'GD06-084'); G.player.base=card('ST03-015','player'); const atk=stick('enemy',3,9);
  A.resolveAiAttack(atk, ()=>{}, q); drainTasks();
  ok("Qubeley Mk-II: with only a (Neo Zeon) Base, the redirect is offered", !!modal() && modal().btns.some(b=>/Qubeley/.test(b)));
  press(/Qubeley/); passAll();
  ok('Qubeley Mk-II: the battle damage goes to the (Neo Zeon) Base', G.player.field.includes(q) && G.player.base && G.player.base.hp===2); }
{ fresh('enemy'); const q=put('GD06-018','player',{rested:true}); seat(q, 'GD06-084'); G.player.base=card('ST04-015','player'); const atk=stick('enemy',3,9);
  A.resolveAiAttack(atk, ()=>{}, q); drainTasks();
  ok("Qubeley Mk-II: a non-(Neo Zeon) Base isn't a legal choice", !(modal() && modal().btns.some(b=>/Qubeley/.test(b)))); passAll(); }
{ fresh('player'); const q=put('GD06-018','enemy'); seat(q, 'GD06-084'); G.enemy.base=card('ST03-015','enemy'); q.rested=true; const atk=stick('player',3,9);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(q.uid); drainTasks(); passAll();
  ok('Qubeley Mk-II (AI): redirects the lethal hit to its (Neo Zeon) Base', G.enemy.field.includes(q) && G.enemy.base && G.enemy.base.hp===2); }

// ---- Elpeo Ple GD06-084: 【When Paired】During this turn, this Unit gains the same number of <Breach 1> as the number of (Neo Zeon)/
//      (Long-Range Weapon) Units you have in play.
{ fresh('player'); const g=put('GD06-028','player'); put('ST03-003','player'); put('GD01-051','player'); stick('player',1,1); const p=pair(g, 'GD06-084');
  ok('Elpeo Ple: the paired Unit gains <Breach 3> (3 (Neo Zeon) Units), the Pilot nothing', A.effBreach(g)===3 && !(p.tempBreach), `breach ${A.effBreach(g)}`); }
{ fresh('enemy'); const g=put('GD06-028','enemy'); const p=pair(g, 'GD06-084'); ok('Elpeo Ple (AI): alone — <Breach 1>', A.effBreach(g)===1); }

// ---- Neo Lorrnoke GD06-092: 【When Paired】If this is a (Phantom Pain)/(Orb) Unit, choose 1 enemy Unit whose AP is equal to or less than this Unit. Deal 1 damage to it.
{ fresh('enemy'); const w=put('GD06-047','enemy'); const big=stick('player',6,6); pair(w, 'GD06-092');
  ok("Neo Lorrnoke (AI): an enemy Unit with more AP than the paired Unit isn't hit", big.hp===6, `hp ${big.hp}`);
  fresh('enemy'); const w2=put('GD06-047','enemy'); const big2=stick('player',6,6), lo=stick('player',3,6); pair(w2, 'GD06-092');
  ok('Neo Lorrnoke (AI): the enemy Unit within its AP takes 1', big2.hp===6 && lo.hp===5); }
{ fresh('player'); const w=put('GD06-047','player'); const big=stick('enemy',6,6), lo=stick('enemy',3,6), lo2=stick('enemy',2,6); pair(w, 'GD06-092');
  ok('Neo Lorrnoke: the AP-6 enemy Unit is not a candidate', G.mode==='trigger-target' && !G.pending.cands.includes(big.uid) && G.pending.cands.length===2, JSON.stringify(G.pending&&G.pending.cands));
  A.fieldClick(big.uid); drainTasks(); ok('Neo Lorrnoke: tapping it is refused', big.hp===6);
  A.fieldClick(lo.uid); drainTasks(); ok('Neo Lorrnoke: the chosen legal Unit takes 1', lo.hp===5); }
// Haman Karn GD02-091 (same reading of "this Unit" for a Pilot): "…choose 1 enemy Unit whose Lv. is equal to or lower than this Unit."
{ fresh('enemy'); const k=put('GD01-051','enemy'); const l5=stick('player',2,5,{lv:5}), l4=stick('player',1,5,{lv:4}); pair(k, 'GD02-091');
  ok("Haman Karn: capped by the paired Unit's Lv.4, not the Pilot's Lv.5", l5.hp===5 && l4.hp===4, `${l5.hp}/${l4.hp}`); }

// ---- SUMO Silver Type GD06-069: 【Activate･Action】【Once per Turn】①：Choose 1 of your damaged (Dianna Counter) Units. It recovers 1 HP.
{ fresh('player'); const s=put('GD06-069','player'); const n=put('GD02-080','player'); n.hp=1;
  G.endActionStep=true; ok("SUMO Silver Type: with only a damaged non-(Dianna Counter) Unit it can't be used", !A.activateReady(s)); G.endActionStep=false;
  const f=put('GD06-074','player'); f.hp=1; ok('SUMO Silver Type: not usable in the main phase (【Activate･Action】)', !A.activateReady(s));
  // The End Phase's action step (7-6-3): End Turn opens it.
  A.endTurn(); drainTasks(); ok('SUMO Silver Type: a damaged (Dianna Counter) Unit makes it usable', !!modal() && modal().btns.some(b=>/SUMO Silver/.test(b)));
  press(/SUMO Silver/); ok('SUMO Silver Type: only the (Dianna Counter) Unit is a candidate (no choice to make)', !(modal() && /choose the Unit/.test(modal().msg)));
  ok('SUMO Silver Type: it recovers 1', f.hp===2 && n.hp===1); G.over=true; }
{ fresh('enemy'); const s=put('GD06-069','player'); const f1=put('GD06-074','player',{rested:true}), f2=put('GD06-079','player'); f1.hp=1; f2.hp=1; const n=put('GD02-080','player'); n.hp=1; const atk=stick('enemy',1,9);
  A.resolveAiAttack(atk, ()=>{}, f1); drainTasks(); if (modal() && /intercept/i.test(modal().msg)) press(/Don't/); press(/SUMO Silver/); const m=modal();
  ok('SUMO Silver Type in an action step: with two damaged (Dianna Counter) Units you choose (no (AEUG) Unit listed)', !!m && m.btns.length===2 && !m.btns.some(b=>/Nemo/.test(b)), JSON.stringify(m&&m.btns));
  press(/Muttowooo/); ok('SUMO Silver Type: the chosen one recovers 1', f2.hp===2 && n.hp===1); passAll(); }
{ fresh('enemy'); const s=put('GD06-069','enemy'); const n=put('GD02-080','enemy'); n.hp=1; const f=put('GD06-074','enemy'); f.hp=1;
  A.aiActivate(s); drainTasks(); ok('SUMO Silver Type (AI): heals the (Dianna Counter) Unit, not the (AEUG) one', f.hp===2 && n.hp===1); }

// ---- Other cards with the same wordings ----
// Graceful Demeanor GD04-117 / MAP Weapon EB01-081: "Choose 1 to 2 enemy Units … Return them to their owners' hands."
{ fresh('enemy'); const a=put('ST01-005','player'), b=put('ST01-005','player'); const c=card('EB01-081','enemy');
  A.applyCommand(c, G.enemy, null); drainTasks(); ok('MAP Weapon (AI): returns both 2-HP Units', !G.player.field.length && G.player.hand.length===2); }
{ fresh('player'); const a=put('ST01-005','enemy'), b=put('ST01-005','enemy'), c=put('ST01-005','enemy'); G.player.hand=[card('EB01-081','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); const mm=modal(); ok('MAP Weapon: the player chooses up to 2', !!mm && /1 to 2/.test(mm.msg), mm&&mm.msg);
  press(new RegExp(a.name.replace(/[()]/g,'.'))); press(new RegExp(a.name.replace(/[()]/g,'.'))); ok('MAP Weapon: the 2 chosen return', G.enemy.field.length===1 && G.player.trash.length>=1, `field ${G.enemy.field.length}`); }
// Citizens, Take a Stand! GD01-105: "【Main】All your Units get AP+2 during this turn."
{ fresh('player'); const a=stick('player',2,2), b=stick('player',3,3); G.player.hand=[card('GD01-105','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok('Citizens, Take a Stand!: every one of your Units gets AP+2, no choice', !modal() && A.effAp(a)===4 && A.effAp(b)===5); }
// Aspite GD06-124: "…all your (Ghingnham Fleet) Units get AP+1" — only those.
{ fresh('player'); const b=card('GD06-124','player'); b.sick=false; G.player.base=b; const g1=stick('player',2,2,{trait:'(Ghingnham Fleet)'}), o=stick('player',2,2), l1=stick('player',2,2,{trait:'(Long-Range Weapon)'}), l2=stick('player',2,2,{trait:'(Long-Range Weapon)'});   // 3 (Ghingnham Fleet)/(Long-Range Weapon) Units meet its condition
  const g0=A.effAp(g1); A.applyActivateEffect(b, null, G.player); ok('Aspite: only (Ghingnham Fleet) Units get AP+1', A.effAp(g1)===g0+1 && g1.tempAp===1 && A.effAp(o)===2 && !o.tempAp && !l1.tempAp); }
// Force Impulse Gundam GD05-064 【Deploy】: "Choose 1 Pilot card with "Shinn Asuka" in its card name from your trash."
ok('Force Impulse Gundam GD05-064: its trash retrieve keeps the card-name requirement', /shinn asuka/.test(String((trig('GD05-064','Deploy')||{}).filter||JSON.stringify(trig('GD05-064','Deploy')))));

console.log('== audit2 group t: triggered / activated ability bodies ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg, e.stack);
