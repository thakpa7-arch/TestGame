// Command-parsing audit fixes (ST / EB / GD01 / GD02 Commands): each card replayed with real cards, on the player's side through
// the real UI paths (Main-phase play, the action-step modal, the choosers) and on the AI's side (its own resolution).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=870000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'Audit',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who)); }
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
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
// The open card-picker / top-card overlay: its title, its card tiles and its buttons.
function overlay(){ const m=(doc.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay')).pop(); if(!m) return null;
  const box=m.children[0]; const kids=box.children; const row=kids.find(k=>k.children&&k.children.length&&k.children.every(x=>x.style&&/height:182px/.test(x.style.cssText||'')));
  const buttons=[]; for (const k of kids){ if (k.onclick) buttons.push(k); if (k.children) for (const b of k.children) if (b.onclick && !(b.style&&/height:182px/.test(b.style.cssText||''))) buttons.push(b); }
  return { title:strip(box._h), tiles: row ? row.children : [], buttons, btn(re){ const b=buttons.find(x=>re.test(strip(x.innerHTML||x.textContent))); if(b){ b.onclick(); drainTasks(); } return !!b; },
           pick(i){ const t=(row?row.children:[]).filter(x=>x.onclick)[i]; if(t){ t.onclick(); drainTasks(); } return !!t; } }; }
// Play a Command from hand in the main phase (a 【Pilot】 Command asks how to play it first: as the Command).
const playMain=(id)=>{ const c=card(id,'player'); G.player.hand.push(c); A.playFromHand(c.uid, true); drainTasks();
  if (modal() && /Play .* as:/.test(modal().msg)) press(/Command effect/); return c; };
const aiAttack=(atk, target)=>{ G.aiForceFace=!target; A.resolveAiAttack(atk, ()=>{}, target||null); drainTasks(); G.aiForceFace=false; };
const offered=(re)=>!!modal() && modal().btns.some(b=>re.test(b));
const logs=()=>(el('log').children||[]).map(c=>strip(c.innerHTML));

// ======== ST02-013 Peaceful Timbre / GD02-106 White Wolf / GD06-106 Presence Detected ========
// "【Action】During this battle, your shield area cards can't receive damage from enemy Units that are Lv.4 or lower."
{ fresh('enemy'); const atk=stick('enemy',4,4,{lv:4}); G.player.hand=[card('ST02-013','player')];
  aiAttack(atk); ok('Peaceful Timbre is offered while a Lv.4 enemy Unit attacks you', offered(/Peaceful Timbre/));
  press(/Peaceful Timbre/); passAll();
  ok('Peaceful Timbre: the Lv.4 attacker breaks no Shield', G.player.shields.length===6, 'shields '+G.player.shields.length);
  ok('Peaceful Timbre: it no longer draws a card (old fallback)', G.player.hand.length===0 && G.player.trash.some(c=>c.def==='ST02-013'), 'hand '+G.player.hand.length);
  ok('Peaceful Timbre: the protection ends with the battle', !G.player.shieldGuard); }
{ fresh('enemy'); const atk=stick('enemy',4,4,{lv:5}); G.player.hand=[card('ST02-013','player')];
  aiAttack(atk); press(/Peaceful Timbre/); passAll();
  ok('Peaceful Timbre: a Lv.5 attacker still breaks a Shield', G.player.shields.length===5, 'shields '+G.player.shields.length); }
{ fresh('enemy'); G.player.base=A.exBaseToken('player'); const bhp=G.player.base.hp; const atk=stick('enemy',4,4,{lv:3}); G.player.hand=[card('ST02-013','player')];
  aiAttack(atk); press(/Peaceful Timbre/); passAll();
  ok('Peaceful Timbre: your Base (a shield area card) takes no damage either', G.player.base && G.player.base.hp===bhp, 'base '+(G.player.base&&G.player.base.hp)); }
{ fresh('enemy'); const mine=stick('player',1,1,{rested:true}); const atk=stick('enemy',4,4,{lv:4, breach:3}); G.player.hand=[card('ST02-013','player')];
  aiAttack(atk, mine); press(/Peaceful Timbre/); passAll();
  ok('Peaceful Timbre: <Breach> from a Lv.4 attacker is stopped too', !G.player.field.includes(mine) && G.player.shields.length===6, 'shields '+G.player.shields.length); }
{ fresh('player'); const z=stick('player',4,4); const foe=stick('enemy',1,9,{rested:true}); G.player.hand=[card('ST02-013','player')];
  A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok("Peaceful Timbre isn't offered when it's your own Unit attacking", !offered(/Peaceful Timbre/)); passAll(); }
{ fresh('player'); const atk=stick('player',4,4,{lv:4}); const pt=card('ST02-013','enemy'); G.curAttack=atk;
  A.runTrigger(pt, G.enemy, pt.action, 'Action'); A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok("AI's Peaceful Timbre: your Lv.4 attacker breaks none of its Shields", G.enemy.shields.length===6, 'shields '+G.enemy.shields.length); }
{ fresh('enemy'); const atk=stick('enemy',4,4,{lv:3}); G.player.hand=[card('GD02-106','player')];
  aiAttack(atk); press(/White Wolf/); passAll();
  ok('White Wolf: a Lv.3 attacker breaks no Shield', G.player.shields.length===6, 'shields '+G.player.shields.length); }
{ fresh('enemy'); const atk=stick('enemy',4,4,{lv:4}); G.player.hand=[card('GD02-106','player')];
  aiAttack(atk); press(/White Wolf/); passAll();
  ok('White Wolf: a Lv.4 attacker still breaks a Shield', G.player.shields.length===5, 'shields '+G.player.shields.length); }
{ fresh('enemy'); const atk=stick('enemy',6,4,{lv:7}); G.player.hand=[card('GD06-106','player')];
  aiAttack(atk); press(/Presence Detected/); passAll();
  ok('Presence Detected (same wording, AP cap): a 6-AP attacker breaks no Shield', G.player.shields.length===6, 'shields '+G.player.shields.length); }
{ fresh('enemy'); const atk=stick('enemy',7,4,{lv:2}); G.player.hand=[card('GD06-106','player')];
  aiAttack(atk); press(/Presence Detected/); passAll();
  ok('Presence Detected: a 7-AP attacker still breaks a Shield', G.player.shields.length===5, 'shields '+G.player.shields.length); }

// ======== ST08-013 Lady Luck: "Deal 1 damage to it. If a friendly (Mafty) Link Unit is in play, deal 2 damage instead." ========
{ fresh('player'); const x=put('GD04-035','player'); pair(x,'ST08-010'); const e=stick('enemy',3,5); playMain('ST08-013');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Lady Luck with a (Mafty) Link Unit in play deals 2', x.linked && e.hp===3, 'linked '+x.linked+' hp '+e.hp); }
{ fresh('player'); put('GD04-035','player'); const e=stick('enemy',3,5); playMain('ST08-013');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Lady Luck without a Link Unit deals 1', e.hp===4, 'hp '+e.hp); }
{ fresh('enemy'); const x=put('GD04-035','player'); pair(x,'ST08-010'); const atk=stick('enemy',1,5); G.player.hand=[card('ST08-013','player')];
  aiAttack(atk); press(/Lady Luck/); passAll();
  ok('Lady Luck in your action step (Mafty Link Unit in play) deals 2 to the attacker', atk.hp===3, 'hp '+atk.hp); }
{ fresh('enemy'); const x=put('GD04-035','enemy'); pair(x,'ST08-010'); const e=stick('player',3,5); const c=card('ST08-013','enemy');
  A.applyCommand(c, G.enemy, e); drainTasks();
  ok("AI's Lady Luck with its (Mafty) Link Unit deals 2", e.hp===3, 'hp '+e.hp); }

// ======== EB01-074 Eternal Road: "Choose 1 active friendly (G Generation) Unit. Rest it. If you do, all enemy players each choose
// 1 of their active Units. Rest them." ========
{ fresh('player'); const g=put('EB01-007','player'); const e1=stick('enemy',5,5), e2=stick('enemy',1,1); playMain('EB01-074');
  ok('Eternal Road: your (G Generation) Unit is rested', g.rested);
  ok('Eternal Road: the AI rests exactly one of its own active Units', [e1,e2].filter(u=>u.rested).length===1, `${e1.rested}/${e2.rested}`);
  ok('Eternal Road: the card left your hand', !G.player.hand.length); }
{ fresh('player'); const g1=put('EB01-007','player'), g2=put('EB01-003','player'); stick('enemy',2,2); playMain('EB01-074');
  ok('Eternal Road with two (G Generation) Units: you choose which to rest', !!modal() && /choose 1 of your active Units to rest/.test(modal().msg), modal()&&modal().msg);
  press(/Narrative/); ok('Eternal Road: the Unit you chose is rested', g2.rested && !g1.rested); }
{ fresh('enemy'); const g=put('EB01-007','player'); const atk=stick('enemy',3,3), idle=stick('enemy',4,4); G.player.hand=[card('EB01-074','player')];
  aiAttack(atk); press(/Eternal Road/);
  ok('Eternal Road in your action step: your (G Generation) Unit and an active AI Unit are rested', g.rested && idle.rested, `g ${g.rested} idle ${idle.rested}`); passAll(); }
{ fresh('player'); put('ST01-003','player'); stick('enemy',2,2); const c=playMain('EB01-074');
  ok("Eternal Road can't be played without an active (G Generation) Unit", G.player.hand.includes(c)); }
{ fresh('enemy'); const g=put('EB01-007','enemy'); const m1=stick('player',3,3), m2=stick('player',4,4); const c=card('EB01-074','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's Eternal Road: it rests its (G Generation) Unit", g.rested);
  ok("AI's Eternal Road: YOU choose which of your active Units is rested", !!modal() && /choose 1 of your active Units to rest/.test(modal().msg));
  press(/Dummy 4\/4/); ok("AI's Eternal Road: the Unit you chose is rested", m2.rested && !m1.rested); }
{ fresh('enemy'); const m1=stick('player',3,3), m2=stick('player',4,4); const u=put('EB01-009','enemy');
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok("Gundam Full Armor (Thunderbolt) (EX) 【Deploy】 (same wording): you choose your Unit to rest", !!modal() && /choose 1 of your active Units/.test(modal().msg));
  press(/Dummy 3\/3/); ok('Gundam Full Armor (Thunderbolt): the chosen Unit is rested', m1.rested && !m2.rested); }

// ======== EB01-078 Premium Unit Assembly: all players look at their top card; a Unit card may be revealed and added ========
{ fresh('player'); const myTop=card('ST01-002','player'), aiTop=card('ST11-008','enemy'); G.player.deck.push(myTop); G.enemy.deck.push(aiTop);
  const dl=G.player.deck.length; playMain('EB01-078'); const o=overlay();
  ok('Premium Unit Assembly: you see your top card and may add the Unit', !!o && o.buttons.some(b=>/add to hand/i.test(strip(b.innerHTML))), o&&o.title);
  o && o.btn(/add to hand/i);
  ok('Premium Unit Assembly: your Unit card is added to your hand', G.player.hand.includes(myTop) && G.player.deck.length===dl-1);
  ok("Premium Unit Assembly: the AI's top Unit card goes to its hand", G.enemy.hand.includes(aiTop)); }
{ fresh('player'); const myTop=card('GD01-100','player'), aiTop=card('GD01-100','enemy'); G.player.deck.push(myTop); G.enemy.deck.push(aiTop);
  playMain('EB01-078'); const o=overlay();
  ok("Premium Unit Assembly: a Command on top can't be added", !!o && !o.buttons.some(b=>/add to hand/i.test(strip(b.innerHTML))));
  o && o.btn(/bottom/i);
  ok('Premium Unit Assembly: you send the Command to the bottom', G.player.deck[0]===myTop && !G.player.hand.includes(myTop));
  ok("Premium Unit Assembly: the AI's Command stays in its deck", G.enemy.deck.includes(aiTop) && !G.enemy.hand.includes(aiTop)); }
{ fresh('enemy'); const myTop=card('ST11-008','player'); G.player.deck.push(myTop); const c=card('EB01-078','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks(); const o=overlay();
  ok("AI's Premium Unit Assembly: you still decide for your own top card", !!o && o.btn(/add to hand/i) && G.player.hand.includes(myTop)); }
{ fresh('enemy'); const lc=put('EB01-023','enemy'); const hi=card('ST11-006','player'); G.player.deck.push(hi); put('ST02-008','player'); let done=false;
  G.aiForceFace=true; A.resolveAiAttack(lc, ()=>{ done=true; }, null); drainTasks(); G.aiForceFace=false; const o=overlay();
  ok("AI's Le Cygne (EX) 【Attack】 (same handler): you choose for your own Lv.6 top card", !!o && o.buttons.some(b=>/add to hand/i.test(strip(b.innerHTML))));
  o && o.btn(/keep on top/i);
  ok("Le Cygne: after your choice the attack goes on (block step offered)", !!modal() && /intercept/i.test(modal().msg) && G.player.deck[G.player.deck.length-1]===hi);
  press(/Don't/); passAll(); ok('Le Cygne: the attack resolves', done && G.player.shields.length===5, 'shields '+G.player.shields.length); }

// ======== EB01-084 30cm Cannon / GD01-121 Midair Modifications: "Choose 1 (rested) Unit with <Blocker>. Set it as active.
// It can't attack during this turn." ========
{ fresh('enemy'); const blk=put('ST02-008','player',{rested:true}); const big=stick('player',6,6,{rested:true}); const atk=stick('enemy',3,3);
  G.player.hand=[card('EB01-084','player')]; aiAttack(atk); press(/30cm Cannon/);
  ok('30cm Cannon: your rested <Blocker> is set active, not the bigger non-Blocker', !blk.rested && big.rested, `blk ${blk.rested} big ${big.rested}`);
  ok("30cm Cannon: it can't attack during this turn", A.trashBlocksAttack(blk, G.player)); passAll(); }
{ fresh('player'); const b1=put('ST02-008','player',{rested:true}), b2=put('ST02-009','player',{rested:true}); stick('player',6,6,{rested:true});
  playMain('GD01-121');
  ok('Midair Modifications: with two rested Blockers you choose', !!modal() && /rested Unit with (<|&lt;)Blocker/.test(modal().msg), modal()&&modal().msg);
  press(/Tragos/); ok('Midair Modifications: the chosen Blocker is set active and can\'t attack', !b2.rested && b1.rested && A.trashBlocksAttack(b2, G.player)); }
{ fresh('player'); stick('player',6,6,{rested:true}); const c=playMain('GD01-121');
  ok("Midair Modifications can't be played with no rested Unit with <Blocker>", G.player.hand.includes(c)); }
{ fresh('enemy'); const blk=put('ST02-008','enemy',{rested:true}); const big=stick('enemy',6,6,{rested:true}); const c=card('GD01-121','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's Midair Modifications readies its <Blocker> (not the bigger Unit), which can't attack", !blk.rested && big.rested && A.trashBlocksAttack(blk, G.enemy)); }
{ fresh('enemy'); const b1=put('ST02-008','player',{rested:true}), b2=put('ST02-009','player',{rested:true}); const sh=card('GD01-121','player');
  A.triggerBurst(sh, G.player, ()=>{}, true); drainTasks();
  ok("Midair Modifications' 【Burst】 (its 【Main】): you choose the Blocker", !!modal() && /rested Unit with (<|&lt;)Blocker/.test(modal().msg), modal()&&modal().msg);
  press(/Aries/); ok("Midair Modifications' 【Burst】: the chosen Blocker is set active", !b1.rested && b2.rested); }

// ======== ST11-013 Poorly Planned Offensive: "Return it to its owner's hand. If you do, draw 1." ========
{ fresh('player'); const e=stick('enemy',2,3,{rested:true}); stick('enemy',2,9,{rested:true}); playMain('ST11-013');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Poorly Planned Offensive: the rested 3-HP Unit returns to hand and you draw 1', !G.enemy.field.includes(e) && G.player.hand.length===1, 'hand '+G.player.hand.length); }
{ fresh('enemy'); const atk=stick('enemy',2,3); G.player.hand=[card('ST11-013','player')]; aiAttack(atk); press(/Poorly Planned/); passAll();
  ok('Poorly Planned Offensive in your action step: the (rested) attacker returns to hand and you draw 1', !G.enemy.field.includes(atk) && G.player.hand.length===1 && G.player.shields.length===6); }
{ fresh('enemy'); const e=stick('player',2,3,{rested:true}); const c=card('ST11-013','enemy'); A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's Poorly Planned Offensive: bounces and draws 1", !G.player.field.includes(e) && G.enemy.hand.length===1, 'hand '+G.enemy.hand.length); }

// ======== ST11-014 The Orca of Red Sea: "Choose 1 friendly (Marine) Unit. Enemy Units can't choose it as their attack target this turn." ========
{ fresh('enemy'); const mar=put('ST11-008','player',{rested:true}); const other=stick('player',2,2,{rested:true}); const a1=stick('enemy',3,3), a2=stick('enemy',5,5);
  G.player.hand=[card('ST11-014','player')]; aiAttack(a1); press(/Orca/);
  ok('The Orca of Red Sea: your (Marine) Unit is protected (the only Marine — no choice needed)', A.effUntargetable(mar) && !A.effUntargetable(other)); passAll();
  A.resolveAiAttack(a2, ()=>{}, mar); drainTasks(); passAll();
  ok('The Orca of Red Sea: a later enemy attack this turn can\'t target it', mar.hp===2 && G.player.field.includes(mar), 'hp '+mar.hp); }
{ fresh('enemy'); const m1=put('ST11-008','player',{rested:true}), m2=put('ST11-007','player',{rested:true}); const a1=stick('enemy',3,3);
  G.player.hand=[card('ST11-014','player')]; aiAttack(a1); press(/Orca/);
  ok('The Orca of Red Sea with two (Marine) Units: you choose', !!modal() && /choose 1 of your Units/.test(modal().msg));
  press(/Leopard/); ok('The Orca of Red Sea: the chosen Marine is protected', A.effUntargetable(m2) && !A.effUntargetable(m1)); passAll(); }
{ fresh('player'); const mar=put('ST11-008','enemy',{rested:true}); const c=card('ST11-014','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  const z=stick('player',5,5); A.fieldClick(z.uid); drainTasks(); A.fieldClick(mar.uid); drainTasks();
  ok("AI's Orca: you can't choose its (Marine) Unit as your attack target", G.enemy.field.includes(mar) && mar.hp===2 && !z.rested); }
{ fresh('player'); const mar=put('ST11-008','enemy',{rested:true}); const c=card('ST11-014','enemy'); A.runTrigger(c, G.enemy, c.action, c.name); G.turnSeq++;
  ok('The Orca of Red Sea lasts this turn only', !A.effUntargetable(mar)); }

// ======== ST11-015 A Twinkle from the Abyss: "Choose 1 (Marine) Unit card that is Lv.4 or lower from your trash. Deploy it rested." ========
{ fresh('player'); const z=card('ST11-001','player'), d=card('ST11-008','player'), big=card('ST11-005','player'), non=card('ST01-003','player');
  G.player.trash.push(z, d, big, non); playMain('ST11-015'); const o=overlay();
  ok('A Twinkle from the Abyss: you choose among the Lv.4-or-lower (Marine) Units in your trash', !!o && o.tiles.length===2, o&&('tiles '+o.tiles.length));
  o && o.pick(0);
  ok('A Twinkle from the Abyss: the chosen Unit is deployed rested', G.player.field.includes(z) && z.rested && !G.player.trash.includes(z));
  ok("A Twinkle from the Abyss: it doesn't draw", G.player.hand.length===0); }
{ fresh('player'); G.player.trash.push(card('ST11-005','player')); const c=playMain('ST11-015');
  ok("A Twinkle from the Abyss can't be played with no eligible card in the trash", G.player.hand.includes(c)); }
{ fresh('enemy'); const z=card('ST11-001','enemy'), d=card('ST11-008','enemy'); G.enemy.trash.push(z, d); const c=card('ST11-015','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's A Twinkle from the Abyss: deploys its best eligible Unit rested", G.enemy.field.includes(z) && z.rested && G.enemy.trash.includes(d)); }
{ fresh('player'); const z=card('GD01-049','player'); z.color='Purple'; z.trait='(Zeon)'; z.lv=4; G.player.trash.push(z); playMain('GD06-116'); { const o=overlay(); if (o) o.pick(0); }   // the trash chooser (also with one card)
  ok('Afterglow of Zeon (same wording, "Deploy it."): deploys from the trash, active', G.player.field.includes(z) && !z.rested); }

// ======== ST12-013 The Final Victor: you and the opponent each choose 1 of your own Units; damage-step-only battle ========
{ fresh('player'); const mine=stick('player',5,5), small=stick('player',2,2); const t3=stick('enemy',3,3), t1=stick('enemy',1,1); playMain('ST12-013');
  ok('The Final Victor: you choose your Unit first', !!modal() && /choose 1 of your Units to battle/.test(modal().msg));
  press(/Dummy 5\/5/);
  ok('The Final Victor: the AI chose its Unit, and they battle (damage step only)', !G.enemy.field.includes(t1) && mine.hp===4 && t3.hp===3, `mine ${mine.hp} t3 ${t3.hp} t1 ${G.enemy.field.includes(t1)}`);
  ok("The Final Victor: it doesn't draw", G.player.hand.length===0); }
{ fresh('player'); const mine=stick('player',5,5); const t=stick('enemy',3,3); playMain('ST12-013');
  ok('The Final Victor with one Unit each: they battle at once', !G.enemy.field.includes(t) && mine.hp===2); }
{ fresh('player'); stick('player',5,5); const c=playMain('ST12-013');
  ok("The Final Victor can't be played when the opponent has no Unit", G.player.hand.includes(c)); }
{ fresh('enemy'); const ai=stick('enemy',4,4); const m1=stick('player',5,5), m2=stick('player',1,1); const c=card('ST12-013','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's Final Victor: you choose which of your Units battles its Unit", !!modal() && /Choose 1 of your Units to battle it/.test(modal().msg), modal()&&modal().msg);
  press(/Dummy 5\/5/); ok("AI's Final Victor: your chosen Unit battles the AI's", !G.enemy.field.includes(ai) && m1.hp===1 && m2.hp===1, `ai ${ai.hp} m1 ${m1.hp}`); }

// ======== ST12-014 Wise Leader's Pride: grant "when this Unit destroys an enemy Unit with battle damage, destroy 1 enemy Unit
// with 2 or less AP" during this battle ========
{ fresh('player'); const z=stick('player',5,5); const foe=stick('enemy',1,2,{rested:true}); const s1=stick('enemy',2,9), s2=stick('enemy',1,9), big=stick('enemy',5,9);
  G.player.hand=[card('ST12-014','player')]; A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  ok("Wise Leader's Pride is offered in your attack's action step", offered(/Wise Leader/));
  press(/Wise Leader/); passAll();   // (the battle follows at once: no other 【Action】 to offer)
  ok("Wise Leader's Pride destroys nothing by itself (only the battle's loser is gone)", !G.enemy.field.includes(foe) && [s1,s2,big].every(u=>G.enemy.field.includes(u)));
  ok("Wise Leader's Pride: after the kill you choose an enemy Unit with 2 or less AP", !!modal() && modal().btns.length===2 && !modal().btns.some(b=>/5\/9/.test(b)), modal()&&modal().btns.join(','));
  press(/Dummy 1\/9/); ok("Wise Leader's Pride: the chosen Unit is destroyed", !G.enemy.field.includes(s2) && G.enemy.field.includes(s1) && G.enemy.field.includes(big)); }
{ fresh('player'); const z=stick('player',2,5); const foe=stick('enemy',1,9,{rested:true}); const s1=stick('enemy',2,9);
  G.player.hand=[card('ST12-014','player')]; A.fieldClick(z.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); press(/Wise Leader/); passAll();
  ok("Wise Leader's Pride: no kill, no destruction", G.enemy.field.includes(s1) && !modal()); }
{ fresh('enemy'); const atk=stick('enemy',5,5); const mine=stick('player',1,2,{rested:true}); const weak=stick('player',2,9); const c=card('ST12-014','enemy');
  G.curBattle={ atk, def:mine }; G.curAttack=atk; A.runTrigger(c, G.enemy, c.action, c.name); A.battle(atk, mine, G.enemy, G.player); drainTasks();
  ok("AI's Wise Leader's Pride: its Unit's kill destroys your 2-AP Unit", !G.player.field.includes(mine) && !G.player.field.includes(weak)); }
{ fresh('enemy'); const atk=stick('enemy',2,2); const blk=stick('player',3,5,{blocker:true}); const weak=stick('enemy',1,9,{sick:true}); G.player.hand=[card('ST12-014','player')];
  G.aiForceFace=true; A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); G.aiForceFace=false;
  ok("Wise Leader's Pride: your Blocker may intercept first", !!modal() && /intercept/i.test(modal().msg), modal()&&modal().msg);
  press(/Dummy 3\/5/); press(/Wise Leader/); passAll();
  ok("Wise Leader's Pride on your blocking Unit: its kill destroys an enemy 2-AP Unit", !G.enemy.field.includes(atk) && !G.enemy.field.includes(weak), `atk ${G.enemy.field.includes(atk)} weak ${G.enemy.field.includes(weak)}`); }

// ======== ST14-014 Blazing Mobile Suit Rider: "If there are 4 or more Command cards in your trash, choose 1 enemy Unit instead."
// (This card that is being activated is not counted.) ========
{ fresh('player'); for (let i=0;i<4;i++) G.player.trash.push(card('GD01-100','player')); const big=stick('enemy',7,7,{lv:7}); playMain('ST14-014');
  if (G.mode==='trigger-target'){ A.fieldClick(big.uid); drainTasks(); }
  ok('Blazing Mobile Suit Rider with 4 Commands in your trash: a Lv.7 Unit gets AP-3', A.effAp(big)===4, 'ap '+A.effAp(big)); }
{ fresh('player'); for (let i=0;i<3;i++) G.player.trash.push(card('GD01-100','player')); stick('enemy',7,7,{lv:7}); const c=playMain('ST14-014');
  ok("Blazing Mobile Suit Rider: itself isn't counted (3 + itself) — the Lv.7 Unit is out of reach", G.player.hand.includes(c)); }
{ fresh('enemy'); for (let i=0;i<4;i++) G.player.trash.push(card('GD01-100','player')); const atk=stick('enemy',7,7,{lv:7}); G.player.hand=[card('ST14-014','player')];
  aiAttack(atk); press(/Blazing/); passAll();
  ok('Blazing Mobile Suit Rider in your action step: AP-3 on the Lv.7 attacker', A.effAp(atk)===4, 'ap '+A.effAp(atk)); }
{ fresh('enemy'); for (let i=0;i<4;i++) G.enemy.trash.push(card('GD01-100','enemy')); const big=stick('player',7,7,{lv:7}); const c=card('ST14-014','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); ok("AI's Blazing Mobile Suit Rider with 4 Commands in its trash hits your Lv.7 Unit", A.effAp(big)===4); }
{ fresh('player'); for (let i=0;i<10;i++) G.player.trash.push(card('ST01-003','player')); const e=stick('enemy',3,3,{lv:4}); const c=card('GD03-114','player');
  ok('Look of Determination (same wording): with 10 cards in your trash an active Lv.4 Unit is a legal target', A.enemyTargets(G.enemy, c.action).includes(e)); }
{ fresh('player'); for (let i=0;i<4;i++) G.player.trash.push(Object.assign(card('ST01-003','player'),{trait:'(Gjallarhorn)'})); const e=stick('enemy',3,5,{lv:6});
  const h=put('GD06-048','player'); A.resolvePlayerTrigger(h, G.player, A.parseTrigger(h.effect,'Deploy'), 'Deploy', ()=>{}); drainTasks();
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Helmwige Reincar (same wording): 4 (Gjallarhorn) cards lift the Lv cap', e.hp===4, 'hp '+e.hp); }

// ======== GD01-120 Naval Bombardment: "Choose 1 friendly Unit with <Blocker>. It gets AP+3 during this turn." ========
{ fresh('enemy'); stick('player',2,2); const atk=stick('enemy',3,3); G.player.hand=[card('GD01-120','player')]; aiAttack(atk);
  ok("Naval Bombardment isn't offered without a friendly <Blocker>", !offered(/Naval Bombardment/)); passAll(); }
{ fresh('enemy'); const non=stick('player',2,2); const blk=put('ST02-008','player'); const atk=stick('enemy',3,3); G.player.hand=[card('GD01-120','player')]; aiAttack(atk);
  if (/intercept/i.test((modal()||{}).msg||'')) press(/Don't/);
  press(/Naval Bombardment/);
  ok('Naval Bombardment: only the <Blocker> gets AP+3', A.effAp(blk)===5 && A.effAp(non)===2, `blk ${A.effAp(blk)} non ${A.effAp(non)}`); passAll(); }
{ fresh('enemy'); const non=stick('enemy',2,2); const blk=put('ST02-008','enemy'); const c=card('GD01-120','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Naval Bombardment buffs its <Blocker>, not the other Unit", A.effAp(blk)===5 && A.effAp(non)===2); }
{ fresh('enemy'); const non=stick('player',2,2); const blk=put('ST02-008','player'); const sh=card('EB01-069','player'); const u=stick('player',3,3);
  u.pilotCard=sh; ok('Beside Pain (same wording, 【Attack】): its buff is limited to a Unit with <Blocker>', A.friendlyTargets(G.player, A.parseTrigger(sh.effect,'Attack')).every(x=>x===blk)); }

// ======== GD01-112 Extreme Hatred: "Choose 2 of your active Units. Rest them. If you do, choose 1 enemy Unit. Deal 3 damage to it." ========
{ fresh('player'); const a=stick('player',1,1), b=stick('player',2,2), c3=stick('player',3,3); const e1=stick('enemy',5,5), e2=stick('enemy',2,9);
  playMain('GD01-112');
  ok('Extreme Hatred: you choose 2 of your active Units', !!modal() && /choose 2 of your active Units to rest/.test(modal().msg));
  press(/Dummy 1\/1/); press(/Dummy 2\/2/);
  ok('Extreme Hatred: the two chosen Units are rested', a.rested && b.rested && !c3.rested);
  ok('Extreme Hatred: then you choose an enemy Unit', G.mode==='trigger-target'); A.fieldClick(e1.uid); drainTasks();
  ok('Extreme Hatred: 3 damage to it; your Units are not the AI\'s', e1.hp===2 && !e1.rested && !e2.rested, 'hp '+e1.hp); }
{ fresh('player'); stick('player',1,1); stick('player',2,2,{rested:true}); stick('enemy',5,5); const c=playMain('GD01-112');
  ok("Extreme Hatred can't be played with only 1 active Unit", G.player.hand.includes(c)); }
{ fresh('enemy'); const a=stick('enemy',1,1), b=stick('enemy',2,2,{sick:true}), c3=stick('enemy',6,6); const m=stick('player',4,4); const c=card('GD01-112','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name); drainTasks();
  ok("AI's Extreme Hatred: rests 2 of its own Units (keeps its best attacker) and deals 3", a.rested && b.rested && !c3.rested && m.hp===1, `m ${m.hp}`); }
{ fresh('player'); const a=put('ST01-001','player'); const e2=stick('enemy',1,9,{lv:2}), e6=stick('enemy',1,9,{lv:6}); playMain('GD03-113');
  ok('Human Karma (same wording): the enemy Unit must be Lv. ≤ the rested Unit', a.rested && G.mode==='trigger-target' && G.pending.cands.length===1 && G.pending.cands[0]===e2.uid);
  if (G.mode==='trigger-target'){ A.fieldClick(e2.uid); drainTasks(); } ok('Human Karma: 3 damage', e2.hp===6); }

{ fresh('player'); const ef=put('ST01-003','player'); const e1=stick('enemy',2,2), e2=stick('enemy',5,5); playMain('GD01-103');
  if (G.mode==='trigger-target' && G.pending && G.pending.scope==='rest-both-enemy'){ A.fieldClick(e2.uid); drainTasks(); }
  ok('The Stubborn Cog ("…and 1 active enemy Unit", same misread as Extreme Hatred): your (Earth Federation) Unit and ONE enemy Unit are rested', ef.rested && e2.rested && !e1.rested, `ef ${ef.rested} e1 ${e1.rested} e2 ${e2.rested}`); }

// ======== GD01-114 Assault on Torrington Base: "Choose 2 friendly Units. They get AP+1 during this turn." ========
{ fresh('enemy'); const a=stick('player',1,1), b=stick('player',2,2), c3=stick('player',3,3); const atk=stick('enemy',3,3); G.player.hand=[card('GD01-114','player')];
  aiAttack(atk); press(/Assault on Torrington/);
  ok('Assault on Torrington Base: you choose 2 of your Units', !!modal() && /choose 2 of your Units/.test(modal().msg));
  press(/Dummy 1\/1/); press(/Dummy 3\/3/);
  ok('Assault on Torrington Base: both chosen Units get AP+1', A.effAp(a)===2 && A.effAp(c3)===4 && A.effAp(b)===2); passAll(); }
{ fresh('enemy'); const a=stick('player',1,1), b=stick('player',2,2); const atk=stick('enemy',3,3); G.player.hand=[card('GD01-114','player')];
  aiAttack(atk); press(/Assault on Torrington/);
  ok('Assault on Torrington Base with exactly 2 Units: both get AP+1', A.effAp(a)===2 && A.effAp(b)===3); passAll(); }
{ fresh('enemy'); const a=stick('enemy',1,1), b=stick('enemy',2,2), c3=stick('enemy',3,3); const c=card('GD01-114','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Assault on Torrington Base: two of its Units get AP+1", [a,b,c3].filter(u=>A.effAp(u)===u.baseAp+1).length===2); }

// ======== GD01-122 Covert Operative: "If you have a Link Unit in play, choose 1 enemy Unit with 4 or less HP instead." ========
{ fresh('player'); stick('player',2,2,{linked:true}); const e=stick('enemy',3,4); playMain('GD01-122');
  if (G.mode==='trigger-target'){ A.fieldClick(e.uid); drainTasks(); }
  ok('Covert Operative with a Link Unit: the 4-HP enemy Unit returns to hand', !G.enemy.field.includes(e) && G.enemy.hand.includes(e)); }
{ fresh('player'); stick('player',2,2); stick('enemy',3,4); const c=playMain('GD01-122');
  ok('Covert Operative without a Link Unit: a 4-HP Unit is out of reach', G.player.hand.includes(c)); }
{ fresh('enemy'); stick('enemy',2,2,{linked:true}); const e=stick('player',3,4); const c=card('GD01-122','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Covert Operative with a Link Unit bounces your 4-HP Unit", !G.player.field.includes(e)); }

// ======== GD02-100 Dramatic Turnabout: "Choose 1 friendly damaged Unit. It recovers 2 HP. Then, draw 1." ========
{ fresh('player'); const d1=stick('player',1,5,{hp:1}), d2=stick('player',2,5,{hp:4}); stick('player',3,3); playMain('GD02-100');
  ok('Dramatic Turnabout: you choose among your damaged Units', !!modal() && modal().btns.length===2, modal()&&modal().btns.join(','));
  press(/Dummy 2\/5/);
  ok('Dramatic Turnabout: the chosen Unit recovers 2 HP, then you draw 1', d2.hp===5 && d1.hp===1 && G.player.hand.length===1, `d2 ${d2.hp} hand ${G.player.hand.length}`); }
{ fresh('player'); stick('player',3,3); playMain('GD02-100');
  ok('Dramatic Turnabout with no damaged Unit still draws 1 ("Then")', G.player.hand.length===1); }
{ fresh('enemy'); const d=stick('enemy',1,5,{hp:1}); const c=card('GD02-100','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Dramatic Turnabout: heals 2 and draws 1", d.hp===3 && G.enemy.hand.length===1); }

// ======== GD02-104 Turning Point of History: look at 3, return 1 to the top, the rest to the bottom; then draw 1 with a (Newtype) Pilot ========
{ fresh('player'); const t1=card('ST11-008','player'), t2=card('ST11-007','player'), t3=card('ST11-001','player'); G.player.deck.push(t1,t2,t3);
  playMain('GD02-104'); const o=overlay();
  ok('Turning Point of History: you look at the top 3 and must return 1 to the top', !!o && o.tiles.length===3 && !o.buttons.some(b=>/take none/i.test(strip(b.textContent||b.innerHTML))), o&&o.title);
  o && o.pick(1);
  const dk=G.player.deck;
  ok('Turning Point of History: the chosen card is on top, the other two at the bottom', dk[dk.length-1]===t2 && dk.slice(0,2).includes(t1) && dk.slice(0,2).includes(t3));
  ok('Turning Point of History: no draw without a (Newtype) Pilot', G.player.hand.length===0); }
{ fresh('player'); const u=put('ST01-001','player'); pair(u,'ST01-010'); drainTasks(); if (G.mode!=='idle'){ G.mode='idle'; G.pending=null; }
  const t1=card('ST11-008','player'), t2=card('ST11-007','player'), t3=card('ST11-001','player'); G.player.deck.push(t1,t2,t3);
  playMain('GD02-104'); const o=overlay(); o && o.pick(2);
  ok('Turning Point of History with a (Newtype) Pilot: you draw the card you put on top', G.player.hand.length===1 && G.player.hand[0]===t3); }
{ fresh('enemy'); const u=stick('enemy',2,2); u.pilotCard=card('ST01-010','enemy'); u.pilot=u.pilotCard;
  const t1=card('ST11-008','enemy'), t2=card('ST11-005','enemy'), t3=card('ST11-009','enemy'); G.enemy.deck.push(t1,t2,t3); const c=card('GD02-104','enemy');
  A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Turning Point of History: keeps its best card on top and draws it (it has a Newtype Pilot)", G.enemy.hand.length===1 && G.enemy.hand[0]===t2 && G.enemy.deck.slice(0,2).includes(t1)); }

// ======== GD02-120 Aspiring Pilot: "Choose 1 of your (AEUG) Units/Bases. It recovers 2 HP." ========
{ fresh('enemy'); G.player.base=card('GD02-129','player'); G.player.base.hp=1; const atk=stick('enemy',1,3); G.player.hand=[card('GD02-120','player')];
  aiAttack(atk); ok('Aspiring Pilot is offered for a damaged (AEUG) Base with no Unit', offered(/Aspiring Pilot/)); press(/Aspiring Pilot/); passAll();
  ok('Aspiring Pilot: your (AEUG) Base recovers 2 HP (then takes the 1-AP hit)', G.player.base && G.player.base.hp===2 && G.player.trash.some(c=>c.def==='GD02-120'), 'base '+(G.player.base&&G.player.base.hp)); }
{ fresh('enemy'); const non=stick('player',2,5,{hp:1}); const ae=put('GD02-080','player',{hp:1}); const atk=stick('enemy',3,3); G.player.hand=[card('GD02-120','player')];
  aiAttack(atk); press(/Aspiring Pilot/);
  ok('Aspiring Pilot: only the (AEUG) Unit recovers', ae.hp===2 && non.hp===1, `ae ${ae.hp} non ${non.hp}`); passAll(); }
{ fresh('enemy'); const ae=put('GD02-080','player',{hp:1}); G.player.base=card('GD02-129','player'); G.player.base.hp=2; const atk=stick('enemy',1,3); G.player.hand=[card('GD02-120','player')];
  aiAttack(atk); press(/Aspiring Pilot/);
  ok('Aspiring Pilot: you choose between your (AEUG) Unit and Base', !!modal() && modal().btns.some(b=>/Argama/.test(b)) && modal().btns.some(b=>/Nemo/.test(b)), modal()&&modal().btns.join(','));
  press(/Argama/); passAll(); ok('Aspiring Pilot: the chosen Base recovers (then takes the 1-AP hit)', G.player.base && G.player.base.hp===3 && ae.hp===1, 'base '+(G.player.base&&G.player.base.hp)); }
{ fresh('enemy'); G.enemy.base=card('GD02-129','enemy'); G.enemy.base.hp=2; stick('enemy',2,2,{hp:1}); const c=card('GD02-120','enemy'); A.runTrigger(c, G.enemy, c.action, c.name);
  ok("AI's Aspiring Pilot heals its (AEUG) Base, not its non-(AEUG) Unit", G.enemy.base.hp===4); }

// ======== same root causes elsewhere: friendly-target restrictions now applied ========
{ fresh('player'); const l=stick('player',2,5,{hp:1, linked:true}), n=stick('player',2,5,{hp:1}); playMain('GD01-101');
  ok('Deep Devotion: only a friendly Link Unit recovers', l.hp===4 && n.hp===1, `l ${l.hp} n ${n.hp}`); }
{ fresh('player'); const g=put('EB01-007','player',{hp:1}), n=stick('player',2,5,{hp:1}); playMain('EB01-076');
  ok('Gerbera Straight: only the (G Generation) Unit recovers', g.hp===4 && n.hp===1, `g ${g.hp} n ${n.hp}`); }
{ fresh('player'); const d=stick('player',2,5,{hp:3}), f=stick('player',5,5); playMain('GD02-114');
  ok("It's Name is Ryusei-Go: only the damaged Unit gets AP+2", A.effAp(d)===4 && A.effAp(f)===5); }
{ fresh('player'); const l=stick('player',2,5,{linked:true}), n=stick('player',5,5); playMain('ST08-012');
  ok('Words for Hathaway: the Link Unit gains <Breach 1>', (l.tempBreach||0)===1 && !(n.tempBreach)); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all ok');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log(`Errors: ${H.ERRORS.length}`); if (H.ERRORS.length) console.log(H.ERRORS.slice(0,5));
