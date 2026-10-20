// Audit round 3, group b: Burst → deploy / trash-retrieve player resolution, and deploy-from-trash continuations.
//  - Impulse Gundam ST09-001 【Activate･Main】 deploying Sword Impulse ST09-006 from the trash: its 【Deploy】 "If you deploy this Unit
//    from your trash, choose 1 enemy Unit that is Lv.3 or lower. Destroy it." keeps its target mode for the player (it was wiped).
//  - Burst-deployed Bases "Add 1 of your Shields to your hand. Then, choose …" (Valiant ST08-014, Freeden Ⅱ GD04-127, Rewloola
//    ST03-015): the player chooses the Unit from a modal chooser.
//  - Reformationist GD04-114 【Burst】 "Choose 1 Unit card with "Trans-Am" in its card name from your trash": the player chooses.
const H=require('./harness.js'); const {A}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=973000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  G.modalQueue=[];
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>{ const c=A.makeCard(A.CARD_BY_ID.get(id), who); c.img=null; return c; };
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const overlays=()=>(doc.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay'));
function clickables(n, out){ out=out||[]; if (n.onclick) out.push(n); for (const c of n.children||[]) clickables(c,out); return out; }
const ovTexts=()=>{ const o=overlays().slice(-1)[0]; return o ? clickables(o).map(c=>strip(c.textContent||c.innerHTML)) : null; };
function ovPick(re){ const o=overlays().slice(-1)[0]; if(!o) return false; const c=clickables(o).find(x=>re.test(strip(x.textContent||x.innerHTML))); if(!c) return false; c.onclick(); drainTasks(); return true; }
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i,who)); A.refreshTrashStats(side(who)); };
const shieldTop=(who, id)=>{ side(who).shields[side(who).shields.length-1]=card(id, who); };

// ======== Sword Impulse Gundam ST09-006 via Impulse Gundam ST09-001 【Activate･Main】 ========
{ // player, a single eligible card in the trash (the path that lost the target mode)
  fresh('player'); setTrash('player',['ST09-006']); const imp=put('ST09-001','player'); const lo=stick('enemy',1,5,{lv:3}); const hi=stick('enemy',1,5,{lv:4});
  A.startActivate(imp); drainTasks();
  const tmode=G.mode==='trigger-target', cands=(G.pending&&G.pending.cands)||[];
  ok('Sword Impulse (player, 1 card in trash): the 【Deploy】 target mode stays open after the 【Activate】 resolves', tmode, G.mode);
  ok('Sword Impulse (player): only the Lv.3-or-lower enemy Unit can be chosen', cands.includes(lo.uid) && !cands.includes(hi.uid), JSON.stringify(cands));
  if (tmode){ A.fieldClick(lo.uid); drainTasks(); }
  ok('Sword Impulse (player): the chosen Lv.3 enemy Unit is destroyed, the Lv.4 one stays', !G.enemy.field.includes(lo) && G.enemy.field.includes(hi));
  ok('Sword Impulse (player): it is in play, Impulse went to the deck bottom', G.player.field.some(u=>u.def==='ST09-006') && !G.player.field.includes(imp) && G.player.deck[0]===imp);
  ok('Sword Impulse (player): mode back to idle afterwards', G.mode==='idle', G.mode);
  ok('Sword Impulse (player): counted as deployed this turn (onUnitDeployed)', !!(G.player.deployedTraits && G.player.deployedTraits.turnSeq===G.turnSeq && G.player.deployedTraits.set.size));
}
{ // player, two eligible cards (chooser path) still works
  fresh('player'); setTrash('player',['ST09-006','ST09-007']); const imp=put('ST09-001','player'); const lo=stick('enemy',1,5,{lv:3});
  A.startActivate(imp); drainTasks(); const offered=ovTexts(); ovPick(/Sword/);
  if (G.mode==='trigger-target'){ A.fieldClick(lo.uid); drainTasks(); }
  ok('Sword Impulse (player, 2 cards in trash): the player picks the card, then the enemy Unit', !!offered && offered.length>=2 && G.player.field.some(u=>u.def==='ST09-006') && !G.enemy.field.includes(lo), JSON.stringify(offered));
}
{ // player, no Lv.3-or-lower enemy Unit: deploys, no target mode left hanging
  fresh('player'); setTrash('player',['ST09-006']); const imp=put('ST09-001','player'); const hi=stick('enemy',1,5,{lv:5});
  A.startActivate(imp); drainTasks();
  ok('Sword Impulse (player): with no legal enemy Unit, nothing is destroyed and the board is idle', G.player.field.some(u=>u.def==='ST09-006') && G.enemy.field.includes(hi) && G.mode==='idle', G.mode);
}
{ // AI
  fresh('enemy'); setTrash('enemy',['ST09-006']); const imp=put('ST09-001','enemy'); const lo=stick('player',1,5,{lv:3});
  A.aiActivate(imp); drainTasks();
  ok('Sword Impulse (AI): deployed from the trash and destroys a Lv.3 player Unit', G.enemy.field.some(u=>u.def==='ST09-006') && !G.player.field.includes(lo));
  ok('Sword Impulse (AI): counted as deployed this turn (onUnitDeployed)', !!(G.enemy.deployedTraits && G.enemy.deployedTraits.turnSeq===G.turnSeq));
}

// ======== Valiant ST08-014 【Burst】Deploy → 【Deploy】Add 1 Shield to hand. Then, choose 1 of your Units. AP+2 ========
{ fresh('enemy'); const w1=stick('player',3,3), w2=stick('player',2,2); shieldTop('player','ST08-014');
  const atk=stick('enemy',4,9); const hand0=G.player.hand.length;
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks();
  let m=modal(), g=0; while (m && !/Valiant/.test(m.msg) && g++<6){ if (!press(/Pass|Don't|No block/i)) break; m=modal(); }
  ok('Valiant (player Burst): a chooser lists both of your Units', !!m && /Valiant/.test(m.msg) && m.btns.length===2, JSON.stringify(m));
  press(/2\/2/);
  ok('Valiant (player Burst): the chosen Unit gets AP+2, the other does not', A.effAp(w2)===4 && A.effAp(w1)===3, `${A.effAp(w1)} ${A.effAp(w2)}`);
  ok('Valiant (player Burst): it is your Base and a Shield went to your hand', G.player.base && G.player.base.def==='ST08-014' && G.player.hand.length===hand0+1);
}
{ fresh('enemy'); const w1=stick('player',3,3); shieldTop('player','ST08-014');
  A.triggerBurst(G.player.shields.pop(), G.player, ()=>{}, true); drainTasks();
  ok('Valiant (player Burst): a single Unit simply gets AP+2', !modal() && A.effAp(w1)===5, A.effAp(w1));
}
{ fresh('player'); const e1=stick('enemy',3,3), e2=stick('enemy',2,2);
  A.triggerBurst(card('ST08-014','enemy'), G.enemy, ()=>{}, true); drainTasks();
  ok('Valiant (AI Burst): one AI Unit gets AP+2, no chooser for the player', !modal() && (A.effAp(e1)+A.effAp(e2))===7 && G.enemy.base && G.enemy.base.def==='ST08-014');
}

// ======== Freeden Ⅱ GD04-127 — Then, if 7+ (Vulture) cards in your trash, choose 1 enemy Unit with 2 or less AP. Destroy it. ========
{ fresh('enemy'); setTrash('player', Array(7).fill('GD04-061')); shieldTop('player','GD04-127');
  const big=stick('enemy',1,9), small=stick('enemy',2,2), strong=stick('enemy',3,3); const atk=stick('enemy',4,9);
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks();
  let m=modal(), g=0; while (m && !/Freeden/.test(m.msg) && g++<6){ if (!press(/Pass|Don't|No block/i)) break; m=modal(); }
  ok('Freeden Ⅱ (player Burst): a chooser lists the enemy Units with 2 or less AP only', !!m && m.btns.length===2 && !m.btns.some(b=>/3\/3/.test(b)), JSON.stringify(m));
  press(/2\/2/);
  ok('Freeden Ⅱ (player Burst): the chosen Unit is destroyed, the others stay', !G.enemy.field.includes(small) && G.enemy.field.includes(big) && G.enemy.field.includes(strong));
}
{ fresh('enemy'); setTrash('player', Array(6).fill('GD04-061')); const big=stick('enemy',1,9), small=stick('enemy',2,2);
  A.triggerBurst(card('GD04-127','player'), G.player, ()=>{}, true); drainTasks();
  ok('Freeden Ⅱ (player Burst): with 6 (Vulture) cards — no chooser, nothing destroyed', !modal() && G.enemy.field.includes(big) && G.enemy.field.includes(small));
}
{ fresh('player'); setTrash('enemy', Array(7).fill('GD04-061')); const a=stick('player',1,9), b=stick('player',2,2), c=stick('player',3,3);
  A.triggerBurst(card('GD04-127','enemy'), G.enemy, ()=>{}, true); drainTasks();
  ok('Freeden Ⅱ (AI Burst): destroys one player Unit with 2 or less AP, no chooser', !modal() && G.player.field.includes(c) && [a,b].filter(x=>!G.player.field.includes(x)).length===1);
}
// Rewloola ST03-015 — same shape ("Then, choose 1 enemy Unit with 5 or less AP. Deal 1 damage to it.")
{ fresh('enemy'); const e1=stick('enemy',2,3), e2=stick('enemy',4,3), e3=stick('enemy',6,3);
  A.triggerBurst(card('ST03-015','player'), G.player, ()=>{}, true); drainTasks();
  const m=modal(); ok('Rewloola (player Burst): the chooser lists the enemy Units with 5 or less AP', !!m && m.btns.length===2, JSON.stringify(m));
  press(/4\/3/); ok('Rewloola (player Burst): 1 damage to the chosen Unit', e2.hp===2 && e1.hp===3 && e3.hp===3);
}

// ======== Reformationist GD04-114 【Burst】Choose 1 Unit card with "Trans-Am" in its card name from your trash. Add it to your hand. ========
{ fresh('enemy'); setTrash('player',['GD04-064','GD03-049','GD04-019']); shieldTop('player','GD04-114'); const atk=stick('enemy',4,9);
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks();
  const offered=ovTexts();
  ok('Reformationist (player Burst): a chooser lists the two "Trans-Am" Unit cards only', !!offered && offered.length===2 && offered.every(t=>/Trans-Am/.test(t)), JSON.stringify(offered));
  ovPick(/GN Armor/);
  ok('Reformationist (player Burst): the chosen card goes to hand, the other stays in the trash', G.player.hand.some(c=>c.def==='GD04-019') && G.player.trash.some(c=>c.def==='GD03-049') && !G.player.hand.some(c=>c.def==='GD03-049'));
  ok('Reformationist (player Burst): the Command itself ends in the trash', G.player.trash.some(c=>c.def==='GD04-114'));
}
{ fresh('enemy'); setTrash('player',['GD04-064','GD03-049']);
  A.triggerBurst(card('GD04-114','player'), G.player, ()=>{}, true); drainTasks();
  ok('Reformationist (player Burst): a single eligible card is simply added', !ovTexts() && G.player.hand.some(c=>c.def==='GD03-049'));
}
{ fresh('enemy'); setTrash('player',['GD03-049','GD04-019']); shieldTop('player','GD04-114'); const u2=stick('enemy',3,3,{breach:3});
  A.breachShield(u2, G.player); drainTasks();
  ok('Reformationist (player Burst from <Breach>): the player chooses too', !!ovTexts() && ovTexts().length===2, JSON.stringify(ovTexts()));
  ovPick(/GN Armor/); ok('Reformationist (Breach): the chosen card goes to hand', G.player.hand.some(c=>c.def==='GD04-019'));
}
{ fresh('player'); setTrash('enemy',['GD03-049','GD04-019']);
  A.triggerBurst(card('GD04-114','enemy'), G.enemy, ()=>{}, true); drainTasks();
  ok('Reformationist (AI Burst): adds one "Trans-Am" Unit card, no chooser', !ovTexts() && G.enemy.hand.filter(c=>/Trans-Am/.test(c.name)).length===1);
}

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all audit3 group b checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
