// Audit2 group h: hooks — on-kill payoffs (Lv caps, choose-from-trash, bounce, choose-your-Unit heal), shield-break payoffs
// (target restrictions, 【Once per Turn】/【During Link】 gates, conditions, a Pilot's own trigger), board watchers (effect
// damage, set active by an effect, HP recovered, a Command activated, an armed "during this turn" kill watch, damage from a
// Unit paired with a (T) Pilot), printed battle-damage slays, "during this battle" AP changes, and damage to the first card
// in the shield area. Player choices go through the real UI (fieldClick / attackDirect / the modal choosers); the AI side
// through battle() / runTrigger / its attack loop.
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
    endStepDone:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'H',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
// Pair a Pilot card without firing its triggers; a matching Link counts.
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; u.linked=A.linkMatches(u, p); return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pickUnit=u=>press(new RegExp('^'+esc(u.name)));
function lookModal(){ const ov=[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay')); if(!ov) return null;
  const box=ov.children[0]; const row=box && box.children[0]; return { ov, tiles:row?[...row.children]:[] }; }
const real=d=>!/-p\d+$/.test(d.id);
const findDef=p=>[...A.CARD_BY_ID.values()].find(d=>real(d)&&p(d));
const byName=n=>findDef(d=>d.name===n).id;
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');
// The AI-side battle (no action-step UI) and the player's attack through the board.
function fight(atk, def){ const as=atk.owner==='player'?G.player:G.enemy, ds=def.owner==='player'?G.player:G.enemy; atk.rested=false; A.battle(atk, def, as, ds); drainTasks(); }
function playerAttackUnit(atk, tgt){ A.fieldClick(atk.uid); drainTasks(); A.fieldClick(tgt.uid); drainTasks(); passAll(); }
function playerAttackFace(atk){ A.fieldClick(atk.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll(); }
function aiAttack(atk){ let fin=false; A.resolveAiAttackInner(atk, ()=>{ fin=true; }); drainTasks(); passAll(); drainTasks(); return fin; }
const trashOf=(side, id, n, extra)=>{ for (let i=0;i<n;i++) side.trash.push(Object.assign(card(id, side.who), extra||{})); A.refreshTrashStats && A.refreshTrashStats(side); };
const cbFill=findDef(d=>d.type==='unit' && hasT(d,'cb') && !/【/.test(d.effect||'')).id;

// ============================================================================ on-kill payoffs
// Gundam Heavyarms ST02-003 / Gundam Kyrios GD03-022 — "deal 1 damage to all enemy Units that are Lv.3 or lower"
{ fresh('enemy'); const h=put('ST02-003','enemy'); seat(h, byName('Trowa Barton'));
  const v=stick('player',1,1,{rested:true}), lv5=stick('player',1,5,{lv:5}), lv3=stick('player',1,5,{lv:3});
  fight(h, v);
  ok('Heavyarms (AI, paired): after the kill only the Lv.3 enemy takes 1 (Lv.5 untouched)', lv5.hp===5 && lv3.hp===4, `${lv5.hp}/${lv3.hp}`); }
{ fresh('player'); const k=put('GD03-022','player'); seat(k, byName('Allelujah Haptism'));
  const v=stick('enemy',1,1,{rested:true}), lv6=stick('enemy',1,9,{lv:6}), lv2=stick('enemy',1,9,{lv:2});
  playerAttackUnit(k, v);
  ok('Kyrios (player, linked): kill → Lv.2 enemy 9→8, Lv.6 untouched', !G.enemy.field.includes(v) && lv6.hp===9 && lv2.hp===8, `${lv6.hp}/${lv2.hp}`); }
// Gundam Heavyarms Custom GD03-029 — "deal 2 damage to all enemy Units with <Blocker>"
{ fresh('enemy'); const hc=put('GD03-029','enemy'); const v=stick('player',1,1,{rested:true}), bl=stick('player',1,9,{blocker:true}), nb=stick('player',1,9);
  fight(hc, v); ok('Heavyarms Custom (AI): only the enemy <Blocker> takes 2', bl.hp===7 && nb.hp===9, `${bl.hp}/${nb.hp}`); }

// Akihiro Altland ST05-011 — 【During Link】"choose 1 (Tekkadan) Unit card that is Lv.2 or lower from your trash. Add it to your hand."
{ const lv3t=findDef(d=>d.type==='unit'&&hasT(d,'tekkadan')&&d.lv===3).id;
  fresh('enemy'); const g=put('ST05-005','enemy'); seat(g, 'ST05-011'); trashOf(G.enemy,'ST05-004',1); trashOf(G.enemy, lv3t, 1);
  fight(g, stick('player',1,1,{rested:true}));
  ok('Akihiro (AI, linked): Graze Custom (Tekkadan Lv.2) comes back to hand, not the Lv.3', G.enemy.hand.map(c=>c.name).join()==='Graze Custom', G.enemy.hand.map(c=>c.name).join());
  fresh('player'); const p=put('ST05-005','player'); seat(p, 'ST05-011'); trashOf(G.player,'ST05-004',1); trashOf(G.player,'GD02-055',0);
  const lv1=findDef(d=>d.type==='unit'&&hasT(d,'tekkadan')&&d.lv<=2&&d.id!=='ST05-004').id; trashOf(G.player, lv1, 1); trashOf(G.player, lv3t, 1);
  playerAttackUnit(p, stick('enemy',1,1,{rested:true}));
  const lm=lookModal(); const names=lm?lm.tiles.map(t=>(t.textContent||t.title||t.innerHTML||'')):[];
  ok('Akihiro (player): a chooser opens with the 2 eligible cards only', !!lm && lm.tiles.filter(t=>t.onclick).length===2, lm?lm.tiles.length+' tiles':'no overlay');
  if (lm){ const t=lm.tiles.find(x=>x.onclick); t.onclick(); drainTasks(); }
  ok('Akihiro (player): the chosen card goes to hand', G.player.hand.length===1 && hasT(G.player.hand[0],'tekkadan') && G.player.hand[0].lv<=2, G.player.hand.map(c=>c.name).join());
  fresh('player'); const q=put('ST05-005','player'); seat(q, 'ST05-011'); q.linked=false; trashOf(G.player,'ST05-004',1);
  playerAttackUnit(q, stick('enemy',1,1,{rested:true}));
  ok('Akihiro: not linked → nothing', G.player.hand.length===0 && !lookModal()); }

// Phoenix Gundam (Power Unleashed) (EX) ST10-006 — 【During Pair】"choose 1 enemy Unit with 3 or less HP. Return it to its owner's hand."
{ fresh('enemy'); const ph=put('ST10-006','enemy'); seat(ph, byName('Mark Guilder'));
  const v=stick('player',1,1,{rested:true}), small=stick('player',1,3), big=stick('player',1,5);
  fight(ph, v);
  ok('Phoenix (AI, paired): the 3-HP enemy is returned, the 5-HP one stays', !G.player.field.includes(small) && G.player.field.includes(big));
  fresh('player'); const pp=put('ST10-006','player'); seat(pp, byName('Mark Guilder'));
  const v2=stick('enemy',1,1,{rested:true}), a=stick('enemy',1,3), b=stick('enemy',1,2), c=stick('enemy',1,6);
  playerAttackUnit(pp, v2);
  const m=modal(); ok('Phoenix (player): chooser offers only the ≤3-HP enemies', m && m.btns.length===2 && m.btns.some(x=>x.startsWith(a.name)) && m.btns.some(x=>x.startsWith(b.name)), m&&m.btns.join('|'));
  pickUnit(b); ok('Phoenix (player): the chosen Unit is returned', !G.enemy.field.includes(b) && G.enemy.field.includes(a) && G.enemy.field.includes(c));
  fresh('player'); const pu=put('ST10-006','player'); const sm=stick('enemy',1,2);
  playerAttackUnit(pu, stick('enemy',1,1,{rested:true}));
  ok('Phoenix: unpaired → nothing returned', G.enemy.field.includes(sm) && !modal()); }

// Infinite Justice Gundam GD06-002 — "choose 1 of your (Orb) Units. It recovers 3 HP." (it fires on a Shield too: "enemy card")
{ fresh('enemy'); const ij=put('GD06-002','enemy'); const dom=put('GD06-016','enemy',{hp:1}); ij.hp=4;
  fight(ij, stick('player',0,1,{rested:true}));
  ok('Infinite Justice (AI): the most damaged (Orb) Unit — Dom Trooper — recovers 3 (1→3, its max)', dom.hp===3 && ij.hp===4, `${dom.hp}/${ij.hp}`);
  fresh('player'); const pj=put('GD06-002','player'); const pd=put('GD06-016','player',{hp:1}); pj.hp=4;
  playerAttackUnit(pj, stick('enemy',0,1,{rested:true}));
  const m=modal(); ok('Infinite Justice (player): chooser offers both (Orb) Units', m && m.btns.length===2, m&&m.btns.join('|'));
  pickUnit(pd); ok('Infinite Justice (player): the chosen Dom Trooper recovers (1→3), Infinite Justice stays at 4', pd.hp===3 && pj.hp===4, `${pd.hp}/${pj.hp}`);
  fresh('player'); const sj=put('GD06-002','player'); const sd=put('GD06-016','player',{hp:2});
  playerAttackFace(sj); const m2=modal();
  ok('Infinite Justice (player): a destroyed Shield ("enemy card") also triggers it', G.enemy.shields.length===5 && m2 && /recovers? 3 HP/.test(m2.msg), m2&&m2.msg);
  if (m2) pickUnit(sd); ok('… and the chosen Unit recovers', sd.hp===3); }
// Infinite Justice 【Deploy】 — "choose 1 active enemy Unit. Return it to its owner's hand."
{ const inner=A.parseTrigger(A.CARD_BY_ID.get('GD06-002').effect,'Deploy').inner;
  ok('Infinite Justice 【Deploy】: the bounce keeps "active"', inner.kind==='bounce' && inner.filter && inner.filter.active===true, JSON.stringify(inner));
  fresh('enemy'); const u=put('GD06-002','enemy'); trashOf(G.enemy,'ST01-001',3); const r=stick('player',1,3,{rested:true});
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Infinite Justice (AI): only a rested enemy → no bounce, no exile', G.player.field.includes(r) && G.enemy.trash.length===3);
  const act=stick('player',1,3); A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Infinite Justice (AI): the active enemy Unit is returned', !G.player.field.includes(act) && G.player.field.includes(r)); }

// ============================================================================ "during this battle"
// Gundam Aerial (Mirasoul Flight Unit) GD01-082 — 【Activate･Action】"Choose 1 enemy Unit. It gets AP-1 during this battle."
{ fresh('player'); const m=put('GD01-082','player'); seat(m, byName('Suletta Mercury')); const foe=stick('enemy',4,9);
  ok('Mirasoul: the activated AP-1 is "during this battle"', m.activate.action.dur==='battle');
  G.curBattle={ atk:m, def:foe }; G.curAttack=m; A.applyActivateEffect(m, foe, G.player);
  ok('Mirasoul: in a battle the target is AP 3', A.effAp(foe)===3 && foe.tempAp===0, A.effAp(foe)); A.clearBattleScoped();
  ok('Mirasoul: the battle ends → AP 4 again', A.effAp(foe)===4, A.effAp(foe));
  fresh('player'); const m2=put('GD01-082','player'); seat(m2, byName('Suletta Mercury')); const f2=stick('enemy',4,9);
  A.applyActivateEffect(m2, f2, G.player);
  ok('Mirasoul: outside a battle "during this battle" has no effect', A.effAp(f2)===4, A.effAp(f2));
  fresh('player'); const m3=put('GD01-082','player'); seat(m3, byName('Suletta Mercury'));
  ok('Mirasoul: the ability is not offered outside a battle', !A.activateReady(m3));
  // through the UI: Mirasoul attacks a rested 4/3 enemy; in the action step it gives it AP-1, so it survives the counter (4 → 3 AP)
  const f3=stick('enemy',4,3,{rested:true}); m3.hp=4; A.fieldClick(m3.uid); drainTasks(); A.fieldClick(f3.uid); drainTasks();
  const offered=press(/Gundam Aerial/); drainTasks();
  if (G.mode==='activate-target'){ A.fieldClick(f3.uid); drainTasks(); }
  passAll();
  ok('Mirasoul (player, action step): AP-1 on the battling enemy — Mirasoul takes 3, not 4', offered && m3.hp===1 && !G.enemy.field.includes(f3), `${offered} hp ${m3.hp}`);
  ok('Mirasoul: no AP change left after the battle', !G.enemy.field.some(u=>u.battleAp)); }
// Graze Ein GD03-073 — 【During Link】【Activate･Action】"…choose 1 enemy Unit battling this Unit. It gets AP-3 during this battle."
{ fresh('player'); const ge=put('GD03-073','enemy'); seat(ge, byName('Suletta Mercury')); ge.linked=true; trashOf(G.enemy, findDef(d=>hasT(d,'gjallarhorn')).id, 6);   // (no Ein Dalton Pilot card in the pool)
  const atk=stick('player',7,9); G.curBattle={ atk, def:ge }; G.curAttack=atk;
  A.applyActivateEffect(ge, atk, G.enemy);
  ok('Graze Ein: the attacker gets AP-3 for this battle', A.effAp(atk)===4 && atk.tempAp===0, A.effAp(atk)); A.clearBattleScoped();
  ok('Graze Ein: after the battle the attacker is back to AP 7', A.effAp(atk)===7, A.effAp(atk)); }
// Auel Neider GD05-092 — 【During Link】【Attack】"If you are attacking the enemy player, this Unit gets AP+2 during this battle."
{ const baseId=findDef(d=>d.type==='base').id;
  fresh('player'); const ab=put('ST11-010','player'); seat(ab, 'GD05-092'); const ap0=A.effAp(ab);
  const b=card(baseId,'enemy'); b.baseHp=b.maxHp=b.hp=20; b.ap=0; b.baseAp=0; G.enemy.base=b;
  playerAttackFace(ab);
  ok('Auel Neider (player): AP+2 during the attack on the player (the Base takes AP+2)', b.hp===b.baseHp-(ap0+2), `${b.baseHp}→${b.hp}, AP ${ap0}`);
  ok('Auel Neider (player): back to normal AP after that battle', A.effAp(ab)===ap0 && !ab.tempAp, A.effAp(ab));
  fresh('enemy'); const ea=put('ST11-010','enemy'); seat(ea, 'GD05-092'); const e0=A.effAp(ea);
  aiAttack(ea); ok('Auel Neider (AI): no AP+2 left after its attack', A.effAp(ea)===e0, `${e0}/${A.effAp(ea)}`); }
// Zee Zulu GD01-059 — the same wording on a Unit
{ fresh('enemy'); const z=put('GD01-059','enemy'); const z0=A.effAp(z); aiAttack(z);
  ok('Zee Zulu (AI): its "during this battle" AP+2 is gone after the attack', A.effAp(z)===z0, `${z0}/${A.effAp(z)}`); }

// ============================================================================ Setsuna F. Seiei ST07-009 — "… all your (CB) Units get AP+1 instead"
{ fresh('player'); const ex=put(cbFill,'player'); seat(ex, 'ST07-009'); const other=put(cbFill,'player'); const ex0=A.effAp(ex), o0=A.effAp(other);
  ok('Setsuna: no stray board aura (the other (CB) Unit is at base AP without an attack)', o0===other.baseAp, o0);
  trashOf(G.player, cbFill, 7); A.fieldClick(ex.uid); drainTasks(); A.attackDirect(); drainTasks(); const exA=A.effAp(ex), oA=A.effAp(other); passAll();
  ok('Setsuna (7 (CB) in trash): the attacker and the other (CB) Unit get AP+1 (not +2 for the attacker)', exA===ex0+1 && oA===o0+1, `${exA}/${oA}`);
  fresh('player'); const e2=put(cbFill,'player'); seat(e2, 'ST07-009'); const o2=put(cbFill,'player'); const e20=A.effAp(e2), o20=A.effAp(o2);
  trashOf(G.player, cbFill, 6); A.fieldClick(e2.uid); drainTasks(); A.attackDirect(); drainTasks();
  ok('Setsuna (6 in trash): only this Unit gets AP+1', A.effAp(e2)===e20+1 && A.effAp(o2)===o20, `${A.effAp(e2)}/${A.effAp(o2)}`); passAll();
  fresh('enemy'); const e3=put(cbFill,'enemy'); seat(e3, 'ST07-009'); const o3=put(cbFill,'enemy'); const o30=A.effAp(o3); trashOf(G.enemy, cbFill, 7);
  aiAttack(e3); ok('Setsuna (AI, 7 in trash): its other (CB) Unit got AP+1 this turn', A.effAp(o3)===o30+1, `${o30}/${A.effAp(o3)}`); }

// ============================================================================ shield area damage
// Moebius (Peacemaker Team) GD02-011 — 0-AP attack, then 【Activate･Action】Destroy this Unit: 6 damage to the Base/Shield it battles
function moebiusPlayer(setup){
  fresh('player'); const mo=put('GD02-011','player'); setup && setup();
  A.fieldClick(mo.uid); drainTasks();
  const atkBtn=[...el('insBtns').children].find(b=>/Attack with/.test(b.innerHTML||b.textContent||''));
  if (!atkBtn) return { err:'no attack button' };
  atkBtn.onclick(); drainTasks(); A.attackDirect(); drainTasks();
  const offered = press(/Moebius/); passAll(); return { offered, mo };
}
{ const r=moebiusPlayer();
  ok('Moebius (player): the inspector offers its 0-AP attack, the action step its ability', r.offered, r.err||'');
  ok('Moebius (player): no Base → the first Shield takes 6 and is destroyed', G.enemy.shields.length===5 && !G.player.field.includes(r.mo), G.enemy.shields.length);
  moebiusPlayer(()=>{ G.enemy.base=A.exBaseToken ? A.exBaseToken('enemy') : null; });
  ok('Moebius (player): an EX Base takes the 6 and is destroyed; Shields untouched', !G.enemy.base && G.enemy.shields.length===6, `${G.enemy.base&&G.enemy.base.hp} ${G.enemy.shields.length}`);
  moebiusPlayer(()=>{ const b=card(findDef(d=>d.type==='base' && d.hp>=7).id,'enemy'); b.hp=b.baseHp; G.enemy.base=b; });
  ok('Moebius (player): a real Base takes 6', G.enemy.base && G.enemy.base.hp===G.enemy.base.baseHp-6 && G.enemy.shields.length===6, G.enemy.base&&G.enemy.base.hp);
  fresh('player'); const mo2=put('GD02-011','player');
  ok('Moebius: the ability is not offered outside its attack on the player', !A.activateReady(mo2));
  fresh('enemy'); const am=put('GD02-011','enemy'); aiAttack(am);
  ok('Moebius (AI): attacks with 0 AP and destroys itself to hit the first Shield', G.player.shields.length===5 && !G.enemy.field.includes(am), G.player.shields.length); }
// Master Gundam GD05-033 — 【Attack】"…If you do, deal 5 damage to the first card in your opponent's shield area."
{ const sm=findDef(d=>d.type==='command' && hasT(d,'special move')).id;
  ok('Master Gundam: the exile payoff is shield-area damage', A.parseTrigger(A.CARD_BY_ID.get('GD05-033').effect,'Attack').inner.kind==='shieldAreaDamage');
  fresh('enemy'); const mg=put('GD05-033','enemy'); trashOf(G.enemy, sm, 2); const blk=stick('player',1,9,{rested:true});
  G.enemy.field.splice(G.enemy.field.indexOf(mg),1); G.enemy.field.push(mg);
  A.declareAttack(mg, G.enemy); A.resolveAttackTriggers(mg, G.enemy, ()=>{}); drainTasks(); passAll();
  ok('Master Gundam (AI): 5 to the first Shield (destroyed), not to a Unit', G.player.shields.length===5 && blk.hp===9 && G.enemy.exile.length===2, `${G.player.shields.length} ${blk.hp}`);
  fresh('player'); const pm=put('GD05-033','player'); trashOf(G.player, sm, 2); G.enemy.base=A.exBaseToken('enemy');
  A.fieldClick(pm.uid); drainTasks(); A.attackDirect(); drainTasks();
  ok('Master Gundam (player): asked whether to exile', press(/Exile 2/));
  ok('Master Gundam (player): the EX Base (first card) takes 5 and is destroyed (then its 5 AP hits a Shield)', !G.enemy.base && G.enemy.shields.length===5, `${G.enemy.base&&G.enemy.base.hp} ${G.enemy.shields.length}`); passAll(); }

// ============================================================================ shield-break payoffs
// Gundam Exia (Trans-Am) GD03-049 — "…if there are 10 or more (CB) cards in your trash, choose 1 enemy Unit with the lowest HP. Destroy it."
{ fresh('enemy'); const ex=put('GD03-049','enemy'); trashOf(G.enemy, cbFill, 10); const lo=stick('player',1,1), hi=stick('player',1,4);
  aiAttack(ex); ok('Exia (Trans-Am) (AI, 10 (CB)): the lowest-HP enemy Unit is destroyed', !G.player.field.includes(lo) && G.player.field.includes(hi));
  fresh('enemy'); const e9=put('GD03-049','enemy'); trashOf(G.enemy, cbFill, 9); const l9=stick('player',1,1);
  aiAttack(e9); ok('Exia (Trans-Am) (AI, 9 (CB)): nothing', G.player.field.includes(l9));
  fresh('player'); const px=put('GD03-049','player'); trashOf(G.player, cbFill, 10); const t1=stick('enemy',1,2), t2=stick('enemy',1,2), t3=stick('enemy',1,5);
  playerAttackFace(px); const m=modal();
  ok('Exia (Trans-Am) (player): chooser offers the two tied lowest-HP Units only', m && m.btns.length===2 && !m.btns.some(b=>b.startsWith(t3.name)), m&&m.btns.join('|'));
  pickUnit(t2); ok('Exia (Trans-Am) (player): the chosen one is destroyed', !G.enemy.field.includes(t2) && G.enemy.field.includes(t1)); }
// Dragon Gundam GD05-035 — 【Once per Turn】"…choose 1 enemy Unit with 3 or less AP. Deal 2 damage to it."
{ fresh('enemy'); const dg=put('GD05-035','enemy'); const p5=stick('player',5,9);
  aiAttack(dg); ok('Dragon Gundam (AI): a 5-AP Unit is not a legal target', p5.hp===9, p5.hp);
  fresh('enemy'); const d2=put('GD05-035','enemy'); const p3=stick('player',3,9);
  aiAttack(d2); d2.rested=false; aiAttack(d2);
  ok('Dragon Gundam (AI): 2 to a 3-AP Unit, once per turn', p3.hp===7, p3.hp);
  fresh('player'); const pd=put('GD05-035','player'); const a3=stick('enemy',3,9), a2=stick('enemy',2,9), a5=stick('enemy',5,9);
  playerAttackFace(pd);
  ok('Dragon Gundam (player): only the ≤3-AP Units can be tapped', G.mode==='trigger-target' && G.pending.cands.length===2 && !G.pending.cands.includes(a5.uid), G.mode+' '+(G.pending&&G.pending.cands));
  A.fieldClick(a2.uid); drainTasks(); ok('Dragon Gundam (player): 2 damage to the chosen Unit', a2.hp===7 && a3.hp===9); }
// Psycho Gundam (GQ) GD04-042 — 【During Link】【Once per Turn】damage from one of your Units paired with a (Cyber-Newtype) Pilot
{ const cnOther=findDef(d=>d.type==='pilot' && hasT(d,'cyber-newtype') && d.name!=='Deux Murasame').id, plainP=findDef(d=>d.type==='pilot' && !hasT(d,'cyber-newtype')).id;
  fresh('enemy'); const ps=put('GD04-042','enemy'); seat(ps,'GD04-091'); const atk=put('ST01-001','enemy'); seat(atk, cnOther);
  const big=stick('player',6,9), small=stick('player',5,9);
  aiAttack(atk); ok('Psycho Gundam (GQ) (AI, linked): an ally paired with a (Cyber-Newtype) Pilot breaks a Shield → 2 to the ≤5-AP Unit', small.hp===7 && big.hp===9, `${small.hp}/${big.hp}`);
  atk.rested=false; aiAttack(atk); ok('Psycho Gundam (GQ): once per turn', small.hp===7, small.hp);
  fresh('enemy'); const p2=put('GD04-042','enemy'); seat(p2, cnOther); p2.linked=false; const s2=stick('player',5,9);
  aiAttack(p2); ok('Psycho Gundam (GQ): not linked → nothing', s2.hp===9, s2.hp);
  fresh('enemy'); const p3=put('GD04-042','enemy'); seat(p3,'GD04-091'); const a3=put('ST01-001','enemy'); seat(a3, plainP); const s3=stick('player',5,9);
  aiAttack(a3); ok('Psycho Gundam (GQ): the attacker\'s Pilot is not (Cyber-Newtype) → nothing', s3.hp===9, s3.hp);
  fresh('player'); const pp=put('GD04-042','player'); seat(pp,'GD04-091'); const x=stick('enemy',4,9), y=stick('enemy',3,9), z=stick('enemy',6,9);
  playerAttackFace(pp); const m=modal();
  ok('Psycho Gundam (GQ) (player): its own linked attack — chooser with the ≤5-AP Units', m && m.btns.length===2 && !m.btns.some(b=>b.startsWith(z.name)), m&&m.btns.join('|'));
  pickUnit(y); ok('Psycho Gundam (GQ) (player): 2 damage to the chosen Unit', y.hp===7 && x.hp===9); }
// McGillis Fareed GD06-089 — 【During Link】shield destroyed → one of your (Gjallarhorn) Units may attack an active Lv.5-or-lower enemy this turn
{ fresh('player'); const bael=put('GD06-034','player'); seat(bael,'GD06-089'); const hw=put('GD06-048','player'); const foe=stick('enemy',1,3,{lv:5});
  playerAttackFace(bael); const m=modal();
  ok('McGillis (player, linked Bael): a chooser of your (Gjallarhorn) Units opens', m && m.btns.length===2, m&&m.btns.join('|'));
  pickUnit(hw); playerAttackUnit(hw, foe);
  ok('McGillis (player): Helmwige Reincar attacks the active Lv.5 enemy', foe.hp===1 || !G.enemy.field.includes(foe), foe.hp);
  fresh('enemy'); const eb=put('GD06-034','enemy'); seat(eb,'GD06-089'); const eh=put('GD06-048','enemy');
  aiAttack(eb); ok('McGillis (AI): one of its (Gjallarhorn) Units may attack an active Lv.5-or-lower Unit', [eb,eh].some(u=>A.canHitActive(u, stick('player',1,3,{lv:5}))));
  fresh('player'); const ub=put('GD06-034','player'); seat(ub,'GD06-089'); ub.linked=false;
  playerAttackFace(ub); ok('McGillis: not linked → nothing', !modal()); }

// ============================================================================ printed battle-damage slays
// Gundam Virtue GD03-052 — "…that is Lv.5 or lower, if you have a (CB) Pilot in play, destroy that enemy Unit."
{ fresh('player'); const v=put('GD03-052','player'); seat(v,'ST07-010'); const t=stick('enemy',1,20,{lv:5,rested:true});
  playerAttackUnit(v, t); ok('Virtue (player, (CB) Pilot in play): the Lv.5 enemy it damaged is destroyed', !G.enemy.field.includes(t));
  fresh('enemy'); const ev=put('GD03-052','enemy'); const t2=stick('player',1,20,{lv:5,rested:true}); fight(ev, t2);
  ok('Virtue (AI, no (CB) Pilot): it survives', G.player.field.includes(t2));
  fresh('enemy'); const e3=put('GD03-052','enemy'); put('ST07-002','enemy'); seat(G.enemy.field[1],'ST07-010'); const t3=stick('player',1,20,{lv:6,rested:true}); fight(e3, t3);
  ok('Virtue (AI): a Lv.6 enemy is out of range', G.player.field.includes(t3)); }
// Gundam Virtue (Trans-Am) GD04-054 — no Lv cap
{ fresh('enemy'); const vt=put('GD04-054','enemy'); const t=stick('player',1,20,{lv:8,rested:true}); fight(vt, t);
  ok('Virtue (Trans-Am) (AI): any enemy Unit it deals battle damage to is destroyed', !G.player.field.includes(t)); }
// Ennil El GD04-096 — 【During Link】"When this Unit deals battle damage to an enemy Unit that is Lv.5 or lower, destroy that enemy Unit."
{ fresh('player'); const es=put('GD04-060','player'); seat(es,'GD04-096'); const t=stick('enemy',0,20,{lv:5,rested:true});
  playerAttackUnit(es, t); ok('Ennil El (player, linked Esperansa): the Lv.5 enemy is destroyed', !G.enemy.field.includes(t));
  fresh('enemy'); const e2=put('GD04-060','enemy'); seat(e2,'GD04-096'); const t2=stick('player',0,20,{lv:6,rested:true}); fight(e2, t2);
  ok('Ennil El (AI): Lv.6 → survives', G.player.field.includes(t2));
  fresh('enemy'); const e3=put('ST01-001','enemy'); seat(e3,'GD04-096'); const t3=stick('player',0,20,{lv:3,rested:true}); fight(e3, t3);
  ok('Ennil El (AI): not linked → survives', G.player.field.includes(t3)); }

// ============================================================================ board watchers
// Gundam Gusion Rebake Full City GD03-053 — 【During Pair】【Once per Turn】your (Tekkadan)/(Teiwaz) Unit receives effect damage
{ fresh('player'); const g=put('GD03-053','player'); seat(g,'ST05-011'); const tk=put('ST05-004','player'); const e4=stick('enemy',1,5,{lv:4}), e3=stick('enemy',1,5,{lv:3}), e5=stick('enemy',1,5,{lv:5});
  G.effSrc=null; A.damage(tk, 1, G.player, 'self'); drainTasks(); const m=modal();
  ok('Gusion FC (player): a chooser of the active Lv.4-or-lower enemies', m && m.btns.length===2 && !m.btns.some(b=>b.startsWith(e5.name)), m&&m.btns.join('|'));
  pickUnit(e3); ok('Gusion FC (player): the chosen enemy is rested', e3.rested && !e4.rested);
  A.damage(tk, 1, G.player, 'self'); drainTasks(); ok('Gusion FC: once per turn', !modal() && !e4.rested);
  fresh('enemy'); const ag=put('GD03-053','enemy'); seat(ag,'ST05-011'); const r=put('GD03-067','enemy'); const pe=stick('player',1,5,{lv:4});
  A.damage(r, 1, G.enemy, 'self'); drainTasks(); ok('Gusion FC (AI): its (Teiwaz) Rouei takes effect damage → the Lv.4 enemy is rested', pe.rested);
  fresh('player'); const ug=put('GD03-053','player'); const ut=put('ST05-004','player'); const ue=stick('enemy',1,5,{lv:2});
  A.damage(ut, 1, G.player, 'self'); drainTasks(); ok('Gusion FC: unpaired → nothing', !ue.rested && !modal());
  fresh('enemy'); const og=put('GD03-053','player'); seat(og,'ST05-011'); const ot=put('ST05-004','player'); const oe=stick('enemy',1,5,{lv:2});
  A.damage(ot, 1, G.player); drainTasks(); ok('Gusion FC: not during your turn → nothing', !oe.rested && !modal()); }
// Graham Aker GD03-098 — 【During Link】"When this rested Unit is set as active by an effect, choose 1 enemy Unit with 3 or less HP. Return it…"
{ fresh('player'); const gf=put('GD03-069','player',{rested:true}); seat(gf,'GD03-098'); const a=stick('enemy',1,3), b=stick('enemy',1,2), c=stick('enemy',1,5);
  A.effReady(gf, G.player); drainTasks(); const m=modal();
  ok('Graham Aker (player): set active by an effect → chooser of the ≤3-HP enemies', m && m.btns.length===2 && !m.btns.some(x=>x.startsWith(c.name)), m&&m.btns.join('|'));
  pickUnit(a); ok('Graham Aker (player): the chosen Unit is returned', !G.enemy.field.includes(a) && G.enemy.field.includes(b));
  A.effReady(gf, G.player); drainTasks(); ok('Graham Aker: an already-active Unit set active again → nothing', !modal() && G.enemy.field.includes(b));
  fresh('enemy'); const eg=put('GD03-069','enemy',{rested:true}); seat(eg,'GD03-098'); const pe=stick('player',1,3);
  A.effReady(eg, G.enemy); drainTasks(); ok('Graham Aker (AI): the 3-HP player Unit is returned', !G.player.field.includes(pe));
  fresh('enemy'); const ug=put('ST01-001','enemy',{rested:true}); seat(ug,'GD03-098'); const pu=stick('player',1,3);
  A.effReady(ug, G.enemy); drainTasks(); ok('Graham Aker: not linked → nothing', G.player.field.includes(pu)); }
// Gundam Barbatos Lupus Rex (EX) EB01-004 — 【Once per Turn】During your turn, when this Unit recovers HP, 1 damage to a rested enemy Unit
{ fresh('enemy'); const lr=put('EB01-004','enemy',{hp:2}); const r=stick('player',1,5,{rested:true}), act=stick('player',1,5);
  G.phase='main'; A.finishEndPhase(); drainTasks();
  ok('Lupus Rex (AI): its <Repair 2> at the end of its turn pings the rested enemy Unit', lr.hp===4 && r.hp===4 && act.hp===5, `${lr.hp} ${r.hp} ${act.hp}`);
  fresh('player'); const pl=put('EB01-004','player',{hp:2}); const r1=stick('enemy',1,5,{rested:true}), r2=stick('enemy',1,5,{rested:true});
  A.healUnit(pl, G.player, 1, 'test'); drainTasks(); const m=modal();
  ok('Lupus Rex (player): recovering HP opens a chooser of rested enemy Units', m && m.btns.length===2, m&&m.btns.join('|'));
  pickUnit(r2); ok('Lupus Rex (player): 1 damage to the chosen one', r2.hp===4 && r1.hp===5);
  A.healUnit(pl, G.player, 1, 'test'); drainTasks(); ok('Lupus Rex: once per turn', !modal() && r1.hp===5);
  fresh('enemy'); const ol=put('EB01-004','player',{hp:2}); const or=stick('enemy',1,5,{rested:true});
  A.healUnit(ol, G.player, 1, 'test'); drainTasks(); ok("Lupus Rex: not on the opponent's turn", or.hp===5 && !modal());
  // the player's own end step: the choice is made before the turn passes
  fresh('player'); const el2=put('EB01-004','player',{hp:2}); const q1=stick('enemy',1,5,{rested:true}), q2=stick('enemy',1,5,{rested:true}); el2.tempAp=3;
  A.finishEndPhase(); drainTasks(); const m2=modal();
  ok('Lupus Rex (player end step): the chooser waits — the cleanup step has not run yet', m2 && el2.tempAp===3, (m2?'modal ':'no modal ')+el2.tempAp);
  if (m2) pickUnit(q1); drainTasks(); ok('… after the choice the end phase goes on (cleanup ran, no second ping)', q1.hp===4 && q2.hp===5 && el2.tempAp===0 && el2.hp===4, `${q1.hp} ${q2.hp} ${el2.tempAp} ${el2.hp}`); }
// Penelope (Flight Form) GD04-002 — 【Deploy】During this turn, when one of your (Earth Federation) Units destroys an enemy Unit with battle damage …
{ fresh('enemy'); const pn=put('GD04-002','enemy'); const pr=stick('player',1,4);
  A.runTrigger(pn, G.enemy, A.parseTrigger(pn.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Penelope (AI): nothing is rested on deploy', !pr.rested);
  const ef=put('ST01-001','enemy'); fight(ef, stick('player',1,1,{rested:true}));
  ok('Penelope (AI): its (Earth Federation) Unit kills → a ≤5-HP enemy Unit is rested', pr.rested);
  fresh('player'); const pp=put('GD04-002','player'); const a=stick('enemy',1,4), b=stick('enemy',1,5), c=stick('enemy',1,7);
  A.resolvePlayerTrigger(pp, G.player, A.parseTrigger(pp.effect,'Deploy'), 'Deploy', ()=>{}); drainTasks();
  ok('Penelope (player): deploy arms it — no choice yet', !modal() && !a.rested && !b.rested);
  const pef=put('ST01-001','player'); playerAttackUnit(pef, stick('enemy',1,1,{rested:true})); const m=modal();
  ok('Penelope (player): the kill opens a chooser of the ≤5-HP active enemies', m && m.btns.length===2 && !m.btns.some(x=>x.startsWith(c.name)), m&&m.btns.join('|'));
  pickUnit(b); ok('Penelope (player): the chosen one is rested', b.rested && !a.rested);
  fresh('enemy'); const p3=put('GD04-002','enemy'); A.runTrigger(p3, G.enemy, A.parseTrigger(p3.effect,'Deploy'), 'Deploy'); const nf=stick('enemy',5,5,{trait:'(Zeon)'}); const q=stick('player',1,4);
  fight(nf, stick('player',1,1,{rested:true})); ok('Penelope: a non-(Earth Federation) killer → nothing', !q.rested); }
// Unicorn Gundam (Awakened) GD04-066 — "When you activate a Command's 【Main】/【Action】 effect, choose 1 enemy Unit. It gets AP-2 during this turn."
{ const drawCmd=findDef(d=>d.type==='command' && /^【Main】Draw \d+\.?(<br>)?$/i.test(String(d.effect||'').replace(/【Burst】[^【]*/,'').trim())) || findDef(d=>d.type==='command' && /【Main】/.test(d.effect||'') && /draw/i.test(d.effect||'') && !/choose/i.test(d.effect||''));
  fresh('player'); const un=put('GD04-066','player'); const e1=stick('enemy',5,5), e2=stick('enemy',4,4);
  const c=card(drawCmd.id,'player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks();
  if (modal() && /Play .* as/.test(modal().msg)) press(/Command effect/);
  const m=modal(); ok('Unicorn (Awakened) (player): playing a Command opens a chooser of enemy Units', m && m.btns.length===2, (m&&m.btns.join('|'))+' '+drawCmd.id);
  pickUnit(e2); ok('Unicorn (Awakened) (player): AP-2 on the chosen enemy for the turn', A.effAp(e2)===2 && A.effAp(e1)===5, `${A.effAp(e1)}/${A.effAp(e2)}`);
  fresh('enemy'); const au=put('GD04-066','enemy'); const pu=stick('player',5,5); const ac=card(drawCmd.id,'enemy');
  A.commandPlayed(ac, G.enemy); drainTasks(); ok('Unicorn (Awakened) (AI): its Command activation gives the player Unit AP-2', A.effAp(pu)===3, A.effAp(pu));
  fresh('player'); const nu=stick('player',1,1); const ne=stick('enemy',5,5); A.commandPlayed(card(drawCmd.id,'player'), G.player); drainTasks();
  ok('Unicorn (Awakened): without it nothing changes', A.effAp(ne)===5 && !modal()); }

// ---- every card text still builds, no errors ----
{ let errs=0; for (const d of A.GUNDAM_CARDS){ try { A.makeCard(d,'player'); } catch(e){ errs++; } } ok('every card still builds', errs===0, errs+' errors'); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
fail.forEach(f=>console.log('  FAIL', f));
console.log(`Errors: ${H.ERRORS.length}`);
H.ERRORS.slice(0,5).forEach(e=>console.log('  ERR', e.ctx, e.phase, e.msg, e.stack));
