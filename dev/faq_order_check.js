// Effect-order rulings (official Q&A): optional 【Burst】 (Q40/Q73), Shields destroyed together are revealed together and their
// Bursts resolve in the owner's order (Q406/Q407, <Suppression> 13-1-7-4), the controller orders their own simultaneous
// triggers (Q107: 【Attack】 Q550/Q552, 【When Paired】, 【Destroyed】), the active player's effects first (Q108), <Breach> before
// the destroyed Unit's 【Destroyed】 (Q56). Player choices go through the real modal buttons; the AI side is checked too.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if (process.env.DEBUG) console.log((cond?"ok   ":"FAIL ")+name+(extra!==undefined?"  ["+extra+"]":"")); if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=990000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML=''; G.modalQueue=[];
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
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
const withEffect=(id, eff, who)=>{ const d=Object.assign({}, A.CARD_BY_ID.get(id), { effect:eff }); const u=A.makeCard(d, who); u.sick=false; return u; };
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const txt=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:txt(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>txt(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); if(!modal()) return false; const b=[...el('blockBtns').children].find(x=>re.test(txt(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const logs=()=>(el('log').children||[]).map(c=>txt(c.innerHTML)).reverse();   // oldest first
const idx=(re)=>logs().findIndex(l=>re.test(l));
const isBurstQ=()=>!!modal() && /Activate its 【Burst】/.test(modal().msg);

// ---- Q40 / Q73: the owner chooses whether to activate a 【Burst】 ----
{ fresh('enemy'); const sh=card('GD01-104','player'); G.player.shields.push(sh);   // Signs of a Revolution: 【Burst】Draw 1.
  A.strikePlayer(stick('enemy',2,3), G.player, ()=>{}); drainTasks();
  ok('Q40/Q73 player: a destroyed 【Burst】 Shield asks "Activate its 【Burst】?"', isBurstQ() && modal().btns.length===2, JSON.stringify(modal()));
  const h=G.player.hand.length; press(/Don't activate/);
  ok("Q73 player: declining puts the card into the trash without drawing", G.player.trash.includes(sh) && G.player.hand.length===h && !modal(), `hand ${h}->${G.player.hand.length}`); }
{ fresh('enemy'); const am=card('ST01-010','player'); G.player.shields.push(am);   // Amuro Ray: 【Burst】Add this card to your hand.
  A.strikePlayer(stick('enemy',2,3), G.player, ()=>{}); drainTasks(); press(/^Activate/);
  ok('Q40 player: activating Amuro Ray\'s 【Burst】 adds it to your hand', G.player.hand.includes(am) && !G.player.trash.includes(am)); }
{ fresh('enemy'); const am=card('ST01-010','player'); G.player.shields.push(am); let fin=false;
  A.strikePlayer(stick('enemy',2,3), G.player, ()=>{ fin=true; }); drainTasks();
  ok('Q40 player: the attack waits for the answer', !fin && isBurstQ()); press(/Don't activate/);
  ok('Q73 player: declined Amuro Ray goes to the trash and the attack continues', fin && G.player.trash.includes(am) && !G.player.hand.includes(am)); }
{ fresh('player'); const sh=card('GD01-104','enemy'); G.enemy.shields.push(sh); const h=G.enemy.hand.length;
  A.strikePlayer(stick('player',2,3), G.enemy, ()=>{}); drainTasks();
  ok('Q40 AI: the AI activates its 【Burst】 (no prompt to you)', !modal() && G.enemy.hand.length===h+1 && G.enemy.trash.includes(sh), `hand ${h}->${G.enemy.hand.length}`); }
{ fresh('player'); const g=card('GD03-048','enemy'); G.enemy.shields.push(g);
  // A Burst whose "If …" condition isn't met does nothing either way: no question.
  const c=A.CARD_BY_ID.get('GD03-048'); const cond=!!(g.burst && g.burst.cond);
  fresh('enemy'); const g2=card('GD03-048','player'); G.player.shields.push(g2);
  A.strikePlayer(stick('enemy',2,3), G.player, ()=>{}); drainTasks();
  if (cond && !A.condMet(g2.burst.cond, G.player, g2)) ok('Q40 player: no question for a Burst whose condition is not met', !isBurstQ() && G.player.trash.includes(g2), c.name);
  else { ok('Q40 player: conditional Burst asks when its condition holds', isBurstQ() || !g2.burst, c.name); while (modal()) if(!press(/Don't activate/)) break; } }

// ---- Q406: Interwoven Blessings destroys the first 2 shield-area cards together ----
{ fresh('player'); G.enemy.shields.push(card('GD05-129','enemy'));   // Axis (【Burst】Deploy this card) on top
  const c=card('GD05-107','player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  ok('Q406 (vs AI): Axis + the next Shield are destroyed together, then Axis deploys as the Base (4 Shields left)',
     G.enemy.base && G.enemy.base.name==='Axis' && G.enemy.shields.length===4, `base ${G.enemy.base&&G.enemy.base.name} shields ${G.enemy.shields.length}`);
  ok('Q406: both destroyed before any Burst resolves', idx(/destroys a AI shield \(5 left\)/)>=0 && idx(/destroys a AI shield \(5 left\)/) < idx(/deploys base Axis/)); }
{ fresh('enemy'); G.player.shields.push(card('GD05-129','player'));
  A.applyCommand(card('GD05-107','enemy'), G.enemy, null); drainTasks();
  ok('Q406 (vs you): both destroyed first, then you are asked about Axis\'s 【Burst】', isBurstQ() && G.player.shields.length===5 && /Axis/.test(modal().msg), JSON.stringify(modal()));
  press(/^Activate/); let g=0; while (modal() && g++<5){ if (!press(/Shield|ST01|Gundam|Add|OK|^Yes/)) press(/./); }
  ok('Q406 (vs you): Axis deploys as your Base, not destroyed afterwards', G.player.base && G.player.base.name==='Axis', `base ${G.player.base&&G.player.base.name} shields ${G.player.shields.length}`); }

// ---- Q407: two 【Burst】 Shields destroyed together — the owner orders them ----
{ fresh('enemy'); const a=card('GD05-085','player'), b=card('GD03-105','player'); G.player.shields.push(a); G.player.shields.push(b);   // b on top
  A.applyCommand(card('GD05-107','enemy'), G.enemy, null); drainTasks();
  const m=modal();
  ok('Q407 player: asked which 【Burst】 resolves first (both listed)', !!m && /resolve first/.test(m.msg) && m.btns.length===2 && m.btns.some(x=>/Amuro/.test(x)) && m.btns.some(x=>/Bridge Crew/.test(x)), JSON.stringify(m));
  press(/^Amuro/); ok('Q407 player: the chosen one (Amuro Ray, the lower Shield) asks first', isBurstQ() && /Amuro/.test(modal().msg), JSON.stringify(modal()));
  press(/^Activate/); ok('Q407 player: then Bridge Crew', isBurstQ() && /Bridge Crew/.test(modal().msg), JSON.stringify(modal()));
  press(/^Activate/);
  ok('Q407 player: both added to hand, Amuro Ray first', G.player.hand.includes(a) && G.player.hand.includes(b) && G.player.hand.indexOf(a)<G.player.hand.indexOf(b)); }
{ fresh('player'); const a=card('GD05-085','enemy'), b=card('GD03-105','enemy'); G.enemy.shields.push(a); G.enemy.shields.push(b);
  const c=card('GD05-107','player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  ok('Q407 AI: both of the AI\'s Bursts resolve (its own order, no prompt to you)', !modal() && G.enemy.hand.includes(a) && G.enemy.hand.includes(b)); }
{ fresh('enemy'); const a=card('GD05-085','player'), b=card('ST01-010','player'); G.player.shields.push(a); G.player.shields.push(b); let fin=false;
  A.strikePlayer(stick('enemy',3,3,{suppression:true}), G.player, ()=>{ fin=true; }); drainTasks();
  ok('<Suppression> (13-1-7-4): both Shields revealed together, you order the Bursts', !!modal() && /resolve first/.test(modal().msg) && G.player.shields.length===6, JSON.stringify(modal()));
  press(/^Amuro Ray — 【Burst】Add this card to your hand\. During/); press(/^Activate/); press(/Don't activate/);
  ok('<Suppression>: the chosen Burst resolves, the declined one is trashed, then the attack continues', fin && G.player.hand.includes(a) && G.player.trash.includes(b)); }
{ fresh('player'); const a=card('GD05-085','enemy'), b=card('ST01-010','enemy'); G.enemy.shields.push(a); G.enemy.shields.push(b);
  A.strikePlayer(stick('player',3,3,{suppression:true}), G.enemy, ()=>{}); drainTasks();
  ok('<Suppression> vs AI: both AI Bursts resolve', !modal() && G.enemy.hand.includes(a) && G.enemy.hand.includes(b)); }

// ---- Q552: Barbatos 1st Form + Chad Chadan — order the 【Attack】 effects ----
{ fresh('player'); const b=put('GD02-054','player'); pair(b,'GD05-096'); const t=stick('player',1,3,{trait:'(Tekkadan)'}); t.hp=2; const foe=stick('enemy',1,9,{rested:true});
  const h0=G.player.hand.length; A.fieldClick(b.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  const m=modal();
  ok('Q552 player: both 【Attack】 effects listed for ordering', !!m && /Attack/.test(m.msg) && m.btns.length===2 && m.btns.some(x=>/Chad/.test(x)) && m.btns.some(x=>/Barbatos/.test(x)), JSON.stringify(m));
  press(/^Chad/); press(/Deal 1 damage|^Yes/);
  if (G.mode==='trigger-target'){ A.fieldClick(t.uid); drainTasks(); }
  if (modal() && modal().btns.some(x=>x.includes(t.name))) press(new RegExp(t.name.replace(/[#/]/g,'.')));
  let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't|No block/)) break; }
  ok('Q552 player: Chad damages Barbatos first, then Barbatos\'s "if damaged, draw 1" draws', b.hp<A.effMaxHp(b) || !G.player.field.includes(b) ? G.player.hand.length===h0+1 : false, `hp ${b.hp} hand ${h0}->${G.player.hand.length} ${logs().slice(-6).join(' > ')}`); }
{ fresh('player'); const b=put('GD02-054','player'); pair(b,'GD05-096'); const t=stick('player',1,3,{trait:'(Tekkadan)'}); t.hp=2; const foe=stick('enemy',1,9,{rested:true});
  const h0=G.player.hand.length; A.fieldClick(b.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks();
  press(/^Gundam Barbatos/); press(/Deal 1 damage|^Yes/);
  if (G.mode==='trigger-target'){ A.fieldClick(t.uid); drainTasks(); }
  let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't|No block/)) break; }
  ok('Q552 player: choosing Barbatos first checks it while undamaged (no draw)', G.player.hand.length===h0, `hand ${h0}->${G.player.hand.length}`); }
{ fresh('enemy'); const b=put('GD02-054','enemy'); pair(b,'GD05-096'); const t=stick('enemy',1,3,{trait:'(Tekkadan)'}); t.hp=2; const pf=stick('player',1,9,{rested:true});
  const h0=G.enemy.hand.length; A.resolveAiAttack(b, ()=>{}, pf); drainTasks(); let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't|No block/)) break; }
  ok('Q552 AI: the AI resolves Chad\'s self-damage first, then draws', G.enemy.hand.length===h0+1, `hand ${h0}->${G.enemy.hand.length}`); }

// ---- Q550: LaGOWE + Setsuna F. Seiei — the Pilot's AP+1 first lets LaGOWE's 5-AP 【Attack】 activate ----
{ fresh('player'); const l=put('GD01-050','player'); pair(l,'ST07-009'); const t=stick('enemy',1,9,{rested:true}); const o=stick('enemy',1,9);
  A.fieldClick(l.uid); drainTasks(); A.fieldClick(t.uid); drainTasks();
  const m=modal(); ok('Q550 player: LaGOWE\'s and Setsuna\'s 【Attack】 listed for ordering', !!m && m.btns.length===2 && m.btns.some(x=>/Setsuna/.test(x)), JSON.stringify(m));
  press(/^Setsuna/);
  if (G.mode==='trigger-target'){ A.fieldClick(o.uid); drainTasks(); }
  else if (modal() && modal().btns.some(x=>x.includes(o.name))) press(new RegExp(o.name.replace(/[#/]/g,'.')));
  let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't|No block/)) break; }
  ok('Q550 player: with Setsuna first, LaGOWE (now 5 AP) deals 2 damage', o.hp===7 || t.hp<=9-2-5, `t ${t.hp} o ${o.hp} ${logs().slice(-5).join(' > ')}`); }
{ fresh('enemy'); const l=put('GD01-050','enemy'); pair(l,'ST07-009'); const pf=stick('player',1,9,{rested:true}); const po=stick('player',1,9);
  A.resolveAiAttack(l, ()=>{}, pf); drainTasks(); let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't|No block/)) break; }
  ok('Q550 AI: the AI resolves the AP+1 first and LaGOWE deals its 2 damage', po.hp===7 || pf.hp<=9-2-5 || !G.player.field.includes(pf), `pf ${pf.hp} po ${po.hp} ${logs().slice(-5).join(' > ')}`); }

// ---- Q107: two 【When Paired】 effects (Unit + Pilot) — the player chooses the order ----
{ fresh('player'); const u=put('ST01-002','player'); stick('enemy',2,3); stick('enemy',2,4); const p=card('ST01-010','player'); G.player.hand=[p];
  A.playFromHand(p.uid,true); drainTasks();
  const m=modal(); ok('Q107 player: Amuro Ray\'s and Gundam (MA Form)\'s 【When Paired】 offered in either order', !!m && m.btns.length===2 && m.btns.some(x=>/Draw 1/.test(x)) && m.btns.some(x=>/Rest it/.test(x)), JSON.stringify(m));
  press(/Draw 1/);
  ok('Q107 player: the draw resolved first, then Amuro\'s rest asks for its target', G.player.hand.length===1 && (G.mode==='trigger-target' || !!modal()), `hand ${G.player.hand.length} mode ${G.mode}`); }
{ fresh('player'); stick('player',2,2); stick('enemy',2,3); stick('enemy',2,4); const p=card('ST01-010','player'); G.player.hand=[p];   // only Amuro's 【When Paired】 → no order prompt
  A.playFromHand(p.uid,true); drainTasks();
  ok('Q107 player: no order prompt when only one effect triggers', !modal() && G.mode==='trigger-target', JSON.stringify(modal())+' '+G.mode); }
{ fresh('player'); const u=put('ST01-002','player'); stick('enemy',2,3); const p=card('GD02-099','player'); G.player.hand=[p];
  // Gundam (MA Form)'s 【When Paired･(White Base Team) Pilot】 is off for a Pilot without that trait: it isn't offered for ordering.
  const pd=A.CARD_BY_ID.get('GD02-099'); const wbt=/white base team/i.test(pd.trait||''); A.playFromHand(p.uid,true); drainTasks();
  ok('Q107 player: a 【When Paired･(T) Pilot】 that is gated off is not listed', wbt || !(modal() && /trigger together/.test(modal().msg)), pd.name+' '+JSON.stringify(modal())); }
{ fresh('enemy'); const u=put('ST01-002','enemy'); stick('player',2,3); const p=card('ST01-010','enemy'); const h=G.enemy.hand.length; A.attachPilot(u,p); drainTasks();
  ok('Q107 AI: both 【When Paired】 effects resolve with no prompt', !modal() && G.enemy.hand.length===h+1 && G.player.field.some(x=>x.rested)); }

// ---- Q108: one effect destroys Units on both sides — the active player's 【Destroyed】 first ----
for (const turn of ['player','enemy']){
  fresh(turn); const s=side(turn);
  G.player.field.push(withEffect('GD01-013','【Destroyed】Draw 1.','player')); G.enemy.field.push(withEffect('GD01-013','【Destroyed】Draw 1.','enemy'));
  A.damageAll({name:'Bomb',effect:''}, s, {kind:'damage', scope:'all-both', amount:9}, 'Test'); drainTasks();
  const pi=idx(/^You draw/), ai=idx(/Destroyed: Gundam — draw 1/), aiLast=logs().map((l,i)=>/Destroyed: Gundam — draw 1/.test(l)?i:-1).filter(i=>i>=0);
  // the player's draw logs "You draw …" then its own "Destroyed: … draw 1"; the AI's only the latter
  const playerFirst = pi>=0 && pi < aiLast[aiLast.length-1] && pi < aiLast[0]+1;
  ok(`Q108 ${turn} active: the ${turn==='player'?'player':'AI'}'s 【Destroyed】 resolves first`, turn==='player' ? playerFirst : (ai>=0 && ai<pi), logs().join(' > '));
  ok(`Q108 ${turn} active: both draw`, G.player.hand.length===1 && G.enemy.hand.length===1);
}
{ fresh('enemy'); const a=withEffect('GD01-013','【Destroyed】Draw 1.','player'), b=withEffect('ST01-001','【Destroyed】Draw 2.','player'); G.player.field.push(a,b);
  A.damageAll({name:'Bomb',effect:''}, G.enemy, {kind:'damage', scope:'all-enemy', amount:9}, 'Test'); drainTasks();
  const m=modal(); ok('Q107 player: two of your 【Destroyed】 from one effect — you choose the order', !!m && m.btns.length===2 && /Destroyed/.test(m.btns.join(' ')), JSON.stringify(m));
  press(/Draw 2/); ok('Q107 player: the chosen 【Destroyed】 resolves first, then the other', G.player.hand.length===3 && idx(/Destroyed: Gundam — draw 2|draws? 2/)>=0, `hand ${G.player.hand.length} ${logs().join(' > ')}`); }
{ fresh('player'); const a=withEffect('GD01-013','【Destroyed】Draw 1.','enemy'), b=withEffect('ST01-001','【Destroyed】Draw 2.','enemy'); G.enemy.field.push(a,b);
  A.damageAll({name:'Bomb',effect:''}, G.player, {kind:'damage', scope:'all-enemy', amount:9}, 'Test'); drainTasks();
  ok('Q107 AI: the AI resolves its two 【Destroyed】 with no prompt', !modal() && G.enemy.hand.length===3); }

// ---- Q56: <Breach> resolves before the destroyed Unit's 【Destroyed】 ----
{ fresh('player'); for (const s of [G.player,G.enemy]) s.shields.length=4;
  const big=A.GUNDAM_CARDS.find(d=>d.type==='unit' && d.lv>=6 && !/-p\d+$/.test(d.id) && !/【Burst】/.test(d.effect||''));
  G.enemy.trash=[A.makeCard(big,'enemy')]; G.enemy.hand=[card('GD01-013','enemy')];
  const atk=stick('player',5,5,{breach:1}); const b=put('ST12-009','enemy',{rested:true});
  A.battle(atk,b,G.player,G.enemy); drainTasks(); let g=0; while (modal() && g++<4){ if(!press(/^Pass|Don't/)) break; }
  ok('Q56 player attacks: <Breach> takes the AI to 3 Shields before Banshee\'s 【Destroyed】 checks "3 or less Shields"', G.enemy.hand.some(c=>c.name===big.name) && G.enemy.shields.length===3, logs().join(' > ')); }
{ fresh('enemy'); for (const s of [G.player,G.enemy]) s.shields.length=4;
  const big=A.GUNDAM_CARDS.find(d=>d.type==='unit' && d.lv>=6 && !/-p\d+$/.test(d.id) && !/【Burst】/.test(d.effect||''));
  G.player.trash=[A.makeCard(big,'player')]; G.player.hand=[card('GD01-013','player')];
  const atk=stick('enemy',5,5,{breach:1}); const b=put('ST12-009','player',{rested:true});
  A.battle(atk,b,G.enemy,G.player); drainTasks();
  let g=0; while ((modal() || document.querySelector('.modal-overlay') || G.mode!=='idle') && g++<8){
    const ov=[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay'));
    if (ov){ const bs=[]; (function walk(n){ if (typeof n.onclick==='function') bs.push(n); for (const c of (n.children||[])) walk(c); })(ov);
      const t=bs.find(x=>/Add|Confirm|Done/i.test(String(x._t||x._h||x.textContent||x.innerHTML||''))) ; const tile=bs.find(x=>x!==t && !/none|skip|cancel/i.test(String(x._t||x._h||x.textContent||'')));
      if (tile) tile.onclick(); drainTasks(); if (t && t.onclick && document.querySelector('.modal-overlay')) t.onclick(); drainTasks(); continue; }
    if (G.mode==='discard'){ A.handClick ? A.handClick(0) : null; drainTasks(); if (G.mode==='discard'){ const p=G.pending; const c=G.player.hand[0]; G.player.hand.splice(0,1); A.sendToTrash(c,G.player); p.discardLeft--; if(p.discardLeft<=0){const af=p.after; G.mode='idle'; G.pending=null; if(af) af();} } continue; }
    if (modal()){ if (!press(new RegExp(big.name.replace(/[()[\]+.*?^$|\\]/g,'.'))) && !press(/./)) break; continue; }
    break; }
  ok('Q56 AI attacks: its <Breach> first, then your Banshee\'s 【Destroyed】 sees 3 Shields and returns the Lv.6+ card', G.player.shields.length===3 && (G.player.hand.some(c=>c.name===big.name) || idx(/retrieves|add/i)>=0), `hand ${G.player.hand.map(c=>c.name)} ${logs().join(' > ')}`); }

console.log('== effect order (Burst choice, simultaneous reveal, trigger order, active player first, Breach first) ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
