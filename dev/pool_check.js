// Pool-wide card checks: abilities from every set (ST, GD01–GD05, EB01) that needed bespoke engine
// support, each exercised with the real card on a small board.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(turn){
  drainTasks();
  Object.assign(G,{turn:turn||'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,effSrc:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true;
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
let UID=600000;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Test ${UID}`, type:'unit', color:'Blue', cost:1, lv:1,
    trait:'(Test)', link:[], effect:'', baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false, breach:0, suppression:false,
    support:0, repair:0, token:false };
  Object.assign(c, extra||{});
  (who==='player'?G.player:G.enemy).field.push(c);
  return c;
}
function put(id, who, extra){ const u=A.makeCard(A.CARD_BY_ID.get(id), who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; }
function card(id, who){ return A.makeCard(A.CARD_BY_ID.get(id), who); }
const effHit=(src, srcSide, target, amount)=>A.applyToTarget(src, srcSide, {kind:'damage', amount}, target, 'Test');
const cmd=(who)=>({ uid:UID++, owner:who, name:'Test Command', type:'command', lv:3, cost:1, effect:'', trait:'' });

// ===== damage-prevention statics =====
// EB01-014 Gouf Vijayanta — opponent's turn: no effect damage from enemy Units Lv.5 or lower
fresh('enemy'); { const g=put('EB01-014','player'); const lo=stick('enemy',1,1,{lv:5}); const hi=stick('enemy',1,1,{lv:6});
  effHit(lo, G.enemy, g, 2); const a=g.hp; effHit(hi, G.enemy, g, 2); const b=g.hp;
  ok('Gouf Vijayanta ignores effect damage from a Lv.5 enemy Unit, not from Lv.6', a===3 && b===1, `${a},${b}`); }
fresh('player'); { const g=put('EB01-014','player'); const lo=stick('enemy',1,1,{lv:2}); effHit(lo, G.enemy, g, 2);
  ok('Gouf Vijayanta: only during the opponent\'s turn', g.hp===1, 'hp='+g.hp); }
// GD02-064 Gundam Leopard — your turn, 7+ cards in trash: no effect damage from enemy Commands
fresh('player'); { const l=put('GD02-064','player'); for(let i=0;i<7;i++) G.player.trash.push(card('ST01-003','player'));
  effHit(cmd('enemy'), G.enemy, l, 3); const a=l.hp; G.player.trash.length=6; effHit(cmd('enemy'), G.enemy, l, 3);
  ok('Gundam Leopard ignores enemy Command damage with 7 in trash, not with 6', a===4 && l.hp===1, `${a},${l.hp}`); }
// ST11-002 Acguy — opponent's turn, while rested: friendly (Marine) Units with 2 or less HP can't receive enemy effect damage
fresh('enemy'); { const ac=put('ST11-002','player',{rested:true}); const m2=stick('player',1,2,{trait:'(Marine)'}); const m3=stick('player',1,3,{trait:'(Marine)'}); const e=stick('enemy',1,1);
  effHit(e, G.enemy, m2, 1); effHit(e, G.enemy, m3, 1);
  ok('Acguy (rested) shields a 2-HP (Marine) Unit but not a 3-HP one', m2.hp===2 && m3.hp===2, `${m2.hp},${m3.hp}`);
  ac.rested=false; effHit(e, G.enemy, m2, 1); ok('Acguy: only while rested', m2.hp===1, 'hp='+m2.hp); }
// GD03-070 Freedom Gundam — while rested, friendly Shields can't receive battle damage from enemy Units
fresh('enemy'); { const fr=put('GD03-070','player',{rested:true}); const atk=stick('enemy',3,3); const s0=G.player.shields.length;
  A.strikePlayer(atk, G.player, ()=>{}); drainTasks(); const a=G.player.shields.length;
  fr.rested=false; A.strikePlayer(atk, G.player, ()=>{}); drainTasks();
  ok('Freedom (rested) protects the Shields; active it does not', a===s0 && G.player.shields.length===s0-1, `${s0}->${a}->${G.player.shields.length}`); }
// ST11-006 Shamblo — another (Marine) Unit at the start of the opponent's turn: shield-area effect damage -5 this turn
fresh('player'); { put('ST11-006','player'); stick('player',1,1,{trait:'(Marine)'}); A.beginTurn('enemy'); G.mode='idle';
  const atk=stick('enemy',3,3,{breach:3}); const s0=G.player.shields.length; A.breachShield(atk, G.player);   // checked before the queued AI turn runs
  ok('Shamblo reduces <Breach> damage to the shield area by 5', G.player.shields.length===s0, `${s0}->${G.player.shields.length}`); }
fresh('player'); { put('ST11-006','player'); A.beginTurn('enemy'); G.mode='idle';
  const atk=stick('enemy',3,3,{breach:3}); const s0=G.player.shields.length; A.breachShield(atk, G.player);
  ok('Shamblo needs another (Marine) Unit', G.player.shields.length===s0-1); }
// GD05-055 Destiny Gundam — 【Once per Turn】 enemy battle damage -2 (effect damage untouched)
fresh('enemy'); { const d=put('GD05-055','player',{rested:true}); const atk=stick('enemy',4,9); A.battle(atk, d, G.enemy, G.player); drainTasks();
  const a=d.hp; const atk2=stick('enemy',1,9); A.battle(atk2, d, G.enemy, G.player); drainTasks();
  ok('Destiny reduces the first battle hit by 2, not the second', a===4 && d.hp===3, `${a},${d.hp}`); }
fresh('enemy'); { const d=put('GD05-055','player'); effHit(stick('enemy',1,1), G.enemy, d, 3);
  ok('Destiny does not reduce effect damage', d.hp===3, 'hp='+d.hp); }

// ===== event watchers =====
const lv3gg=(who)=>stick(who,1,1,{trait:'(G Generation)', lv:3});
// EB01-035 Gundam Lfrith Thorn — another friendly Lv.3 (G Generation) Unit deployed: <Breach 1> this turn
fresh(); { const th=put('EB01-035','player'); const u=lv3gg('player'); A.onUnitDeployed(u, G.player, null, true); drainTasks();
  const a=A.effBreach(th); const u4=stick('player',1,1,{trait:'(G Generation)', lv:4}); A.onUnitDeployed(u4, G.player, null, true);
  ok('Lfrith Thorn gains <Breach 1> from a Lv.3 (G Generation) deploy, not from Lv.4', a===1 && A.effBreach(th)===1, `${a},${A.effBreach(th)}`);
  A.endTurn(); drainTasks(); ok('…and it ends with the turn', A.effBreach(th)===0, 'breach='+A.effBreach(th)); }
// GD05-016 Murasame — one of your (Orb) Units deployed: <High-Maneuver> this turn
fresh(); { const mu=put('GD05-016','player'); const o=stick('player',1,1,{trait:'(Orb)'}); A.onUnitDeployed(o, G.player, null, true);
  ok('Murasame gains <High-Maneuver> when an (Orb) Unit is deployed', A.effHighManeuver(mu)===true); }
// EB01-086 Kycilia Zabi & Gwazine / ST06-015 Kaneban — a friendly (T) Unit links: it gains <Repair 2> / <Breach 3> (once per turn)
function linkWith(u, side){ const pd=A.GUNDAM_CARDS.find(d=>d.type==='pilot' && !/【(When|Deploy|Attack|During|Once|Activate)/.test(d.effect||'')); const p=A.makeCard(pd, u.owner);
  u.link=[p.name]; A.attachPilot(u, p, ()=>{}); drainTasks(); return u; }
fresh(); { G.player.base=A.makeCard(A.CARD_BY_ID.get('EB01-086'),'player'); const u=linkWith(stick('player',2,4,{trait:'(G Generation)'}), G.player);
  ok('Kycilia & Gwazine: the linked (G Generation) Unit gains <Repair 2>', u.linked && A.effRepair(u)===2, 'repair='+A.effRepair(u)); }
fresh(); { G.player.base=A.makeCard(A.CARD_BY_ID.get('ST06-015'),'player'); const u=linkWith(stick('player',2,4,{trait:'(Clan)'}), G.player); const v=linkWith(stick('player',2,4,{trait:'(Clan)'}), G.player);
  ok('Kaneban: the first (Clan) link gains <Breach 3>, the second does not (once per turn)', A.effBreach(u)===3 && A.effBreach(v)===0, `${A.effBreach(u)},${A.effBreach(v)}`); }
// ST14-016 Gryphios 2 — your turn, a friendly Unit links: an enemy Unit Lv.5 or lower gets AP-1
fresh(); { G.player.base=A.makeCard(A.CARD_BY_ID.get('ST14-016'),'player'); const e=stick('enemy',3,3,{lv:4}); const big=stick('enemy',6,6,{lv:7}); linkWith(stick('player',2,4), G.player);
  ok('Gryphios 2: a Lv.5-or-lower enemy Unit gets AP-1 when a friendly Unit links', A.effAp(e)===2 && A.effAp(big)===6, `${A.effAp(e)},${A.effAp(big)}`); }
// GD02-022 G-Exes / GD03-023 G-Bouncer — EX Resource placed: an (AGE System) Unit gains <Breach 2> / <High-Maneuver>
fresh(); { put('GD02-022','player'); const age=stick('player',3,3,{trait:'(AGE System)'}); A.runTrigger({name:'EX',effect:'',owner:'player'}, G.player, {kind:'exResource', amount:1}, 'EX');
  ok('G-Exes: placing an EX Resource gives an (AGE System) Unit <Breach 2>', A.effBreach(age)===2, 'breach='+A.effBreach(age)); }
fresh(); { put('GD03-023','player'); const age=stick('player',3,3,{trait:'(AGE System)'}); A.runTrigger({name:'EX',effect:'',owner:'player'}, G.player, {kind:'exResource', amount:1}, 'EX');
  ok('G-Bouncer: placing an EX Resource gives an (AGE System) Unit <High-Maneuver>', A.effHighManeuver(age)===true); }
// GD05-018 Gundam Calibarn — an EX Resource is exiled: one of your Units takes 3 less enemy damage this turn
fresh(); { const cb=put('GD05-018','player'); G.player.resMax=1; G.player.ex=1; G.player.resAvail=2; A.payCost(G.player, 2);
  const e=stick('enemy',1,1); A.applyToTarget(e, G.enemy, {kind:'damage', amount:4}, cb, 'Test');
  ok('Calibarn: after an EX Resource is used, 4 effect damage becomes 1', cb.hp===4, 'hp='+cb.hp); }
// GD04-020 Gundam Lfrith Ur — your turn, a (Dawn of Fold) Command paid with an EX Resource: draw 1
fresh(); { put('GD04-020','player'); const s=G.player; s.resMax=0; s.ex=1; s.resAvail=1; const h=s.hand.length;
  A.payCost(s, 1); A.commandPlayed({name:'DoF Cmd', type:'command', trait:'(Dawn of Fold)'}, s);
  ok('Lfrith Ur draws when a (Dawn of Fold) Command is paid with an EX Resource', s.hand.length===h+1, `${h}->${s.hand.length}`);
  A.payCost(s, 0); A.commandPlayed({name:'DoF Cmd', type:'command', trait:'(Dawn of Fold)'}, s);
  ok('…not when no EX Resource paid for it', s.hand.length===h+1); }
// GD04-085 Suletta Mercury (pilot, 【During Link】) — (Academy) Command paid with EX, none left: place 1 rested EX Resource
fresh(); { const s=G.player; const host=stick('player',2,2,{linked:true}); host.pilot={pAp:2,pHp:2}; host.pilotCard=card('GD04-085','player');
  s.resMax=2; s.ex=1; s.resAvail=3; A.payCost(s, 3); A.commandPlayed({name:'Ac Cmd', type:'command', trait:'(Academy)'}, s);
  ok('Suletta (GD04-085): places a rested EX Resource after the last one is used', s.ex===0 && s.exRested===1 && A.totalRes(s)===3, `ex=${s.ex} rested=${s.exRested}`);
  A.endTurn(); drainTasks(); A.endTurn(); drainTasks();
  ok('…which stands up at the start of the next turn', s.ex===1 && !s.exRested, `ex=${s.ex} rested=${s.exRested}`); }
// GD04-100 Sochie / GD04-129 Willgem / GD05-101 Gavane — paying ① or more for a Unit's effect
fresh(); { const s=G.player; const host=stick('player',2,4,{trait:'(Militia)'}); host.pilot={pAp:0,pHp:2}; host.pilotCard=card('GD04-100','player');
  const payer=stick('player',1,1); payer.activate={phase:'main', cost:{type:'resource', amount:2}, action:{kind:'setActive', scope:'self'}, text:'t'};
  A.applyActivateEffect(payer, null, s);
  ok('Sochie Heim: the host gets AP+2 after paying ②', A.effAp(host)===4, 'ap='+A.effAp(host)); }
fresh(); { const s=G.player; const wg=A.makeCard(A.CARD_BY_ID.get('GD04-129'),'player'); wg.hp=3; s.base=wg;
  const payer=stick('player',1,1); payer.activate={phase:'main', cost:{type:'resource', amount:1}, action:{kind:'setActive', scope:'self'}, text:'t'};
  A.applyActivateEffect(payer, null, s); ok('Willgem recovers 2 HP when ① is paid for a Unit effect', wg.hp===5, 'hp='+wg.hp); }
fresh(); { const s=G.player; const host=stick('player',2,4,{trait:'(Militia)'}); host.hp=1; host.pilot={pAp:1,pHp:1}; host.pilotCard=card('GD05-101','player');
  const payer=stick('player',1,1); payer.activate={phase:'main', cost:{type:'resource', amount:1}, action:{kind:'setActive', scope:'self'}, text:'t'};
  A.applyActivateEffect(payer, null, s); ok('Gavane Goonny: the (Militia) host recovers 2', host.hp===3, 'hp='+host.hp); }
// GD02-010 Raider / GD03-095 Azee / GD03-060 CGS Commander — receiving effect damage
fresh('player'); { const r=put('GD02-010','player'); const h=G.player.hand.length; A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:1}, r, 'T');
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:1}, r, 'T');
  ok('Raider draws 1 on enemy effect damage, once per turn', G.player.hand.length===h+1, `${h}->${G.player.hand.length}`); }
fresh('player'); { const host=stick('player',2,4); host.pilot={pAp:1,pHp:2}; host.pilotCard=card('GD03-095','player'); const e=stick('enemy',3,3);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:1}, host, 'T');
  ok('Azee Gurumin: an enemy Unit gets AP-1 when the host takes effect damage', A.effAp(e)===2, 'ap='+A.effAp(e)); }
fresh('player'); { const cg=put('GD03-060','player'); G.effSrc=cg; A.damage(cg, 1, G.player, 'self');   // your own effect pings it
  const toks=G.player.field.filter(u=>u.token);
  ok('CGS Commander: your turn effect damage deploys a rested CGS Mobile Worker token', toks.length===1 && toks[0].rested && /CGS/.test(toks[0].name), JSON.stringify(toks.map(t=>t.name+':'+t.rested))); }
// GD02-009 Calamity — its AP reduced by an enemy effect: 2 damage to a rested enemy Unit
fresh('enemy'); { const ca=put('GD02-009','player'); const r=stick('enemy',2,5,{rested:true});
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'debuff', amount:1}, ca, 'T');
  ok('Calamity deals 2 to a rested enemy Unit when its AP is reduced', r.hp===3, 'hp='+r.hp); }
// GD03-128 Doritea — opponent's turn, one of your Units rested by an opponent's effect: 1 damage to an enemy Unit
fresh('enemy'); { G.player.base=A.makeCard(A.CARD_BY_ID.get('GD03-128'),'player'); const mine=stick('player',2,2); const e=stick('enemy',2,3);
  A.applyToTarget(e, G.enemy, {kind:'rest'}, mine, 'T');
  ok('Doritea pings an enemy Unit when your Unit is rested by an enemy effect', mine.rested && e.hp===2, 'e hp='+e.hp); }
// GD02-085 Four Murasame (pilot, 【During Link】) — your turn, the host recovers HP with ≤4 cards in hand: draw 1
fresh('player'); { const host=stick('player',2,5,{linked:true}); host.hp=2; host.pilot={pAp:2,pHp:1}; host.pilotCard=card('GD02-085','player'); G.player.hand=[];
  A.applyToTarget({name:'Heal',owner:'player'}, G.player, {kind:'heal', amount:1}, host, 'T');
  ok('Four Murasame draws when the linked host recovers HP', G.player.hand.length===1, 'hand='+G.player.hand.length); }

// ===== kill payoffs =====
const killBattle=(atk, hp)=>{ const d=stick('enemy',0,hp||1,{rested:true}); A.battle(atk, d, G.player, G.enemy); drainTasks(); return d; };
// GD02-002 Gundam Epyon — 【During Link】 your turn, one of your Units destroys an enemy Unit: set this Unit as active (once per turn)
fresh(); { const ep=put('GD02-002','player',{linked:true,rested:true}); ep.pilot={pAp:0,pHp:0};
  const a=stick('player',3,3); killBattle(a); const first=!ep.rested; ep.rested=true; killBattle(stick('player',3,3));
  ok('Epyon is set active after a friendly battle kill, once per turn', first && ep.rested, `first=${first} after2=${ep.rested}`); }
fresh(); { const ep=put('GD02-002','player',{rested:true}); killBattle(stick('player',3,3));
  ok('Epyon needs 【During Link】', ep.rested===true); }
// EB01-087 Marina Ismail & Ptolemaios 2 — a friendly green (G Generation) Unit destroys an enemy Unit: a friendly Unit recovers 2
fresh(); { G.player.base=A.makeCard(A.CARD_BY_ID.get('EB01-087'),'player'); const hurt=stick('player',1,5); hurt.hp=1;
  killBattle(stick('player',3,3,{trait:'(G Generation)',color:'Green'}));
  ok('Marina & Ptolemaios 2: a damaged friendly Unit recovers 2', hurt.hp===3, 'hp='+hurt.hp); }
// GD03-125 Peacemillion — a friendly (Operation Meteor)/(G Team) Lv.6+ Unit destroys an enemy Unit: it may recover 2
fresh(); { G.player.base=A.makeCard(A.CARD_BY_ID.get('GD03-125'),'player'); const k=stick('player',3,6,{trait:'(G Team)',lv:6}); k.hp=3;
  killBattle(k); ok('Peacemillion: the Lv.6 (G Team) killer recovers 2', k.hp===5, 'hp='+k.hp);
  const k5=stick('player',3,6,{trait:'(G Team)',lv:5}); k5.hp=3; killBattle(k5); ok('…not a Lv.5 one', k5.hp===3); }
// ST12-003 Tallgeese Ⅲ — your turn, destroys an enemy Unit with (any) damage: 1 damage to every enemy Unit with 3 or less AP
fresh(); { const tg=put('ST12-003','player'); const small=stick('enemy',3,3); const big=stick('enemy',5,5); const victim=stick('enemy',1,1);
  A.applyToTarget(tg, G.player, {kind:'damage', amount:1}, victim, 'T');
  ok('Tallgeese Ⅲ: an effect kill pings every ≤3 AP enemy Unit', !G.enemy.field.includes(victim) && small.hp===2 && big.hp===5, `small=${small.hp} big=${big.hp}`); }
// GD01-094 Yzak Jule — an enemy Link Unit destroyed with damage while this Unit is attacking: draw 1
fresh(); { const host=stick('player',4,4); host.pilot={pAp:1,pHp:1}; host.pilotCard=card('GD01-094','player'); const h=G.player.hand.length;
  A.declareAttack(host, G.player); const d=stick('enemy',1,1,{rested:true, linked:true}); A.battle(host, d, G.player, G.enemy); drainTasks();
  ok('Yzak: draw 1 when the attacker destroys an enemy Link Unit', G.player.hand.length===h+1, `${h}->${G.player.hand.length}`); }
fresh(); { const host=stick('player',4,4); host.pilot={pAp:1,pHp:1}; host.pilotCard=card('GD01-094','player'); const h=G.player.hand.length;
  A.declareAttack(host, G.player); const d=stick('enemy',1,1,{rested:true}); A.battle(host, d, G.player, G.enemy); drainTasks();
  ok('Yzak: not for an unlinked Unit', G.player.hand.length===h); }
// ST13-012 Suletta Mercury — an enemy Unit destroyed with EFFECT damage while this Unit is attacking: draw 1
fresh(); { const host=stick('player',4,4); host.pilot={pAp:1,pHp:1}; host.pilotCard=card('ST13-012','player'); const h=G.player.hand.length;
  A.declareAttack(host, G.player); A.applyToTarget(host, G.player, {kind:'damage', amount:2}, stick('enemy',1,2), 'Attack');
  ok('Suletta (ST13): draw 1 for an effect kill during the attack', G.player.hand.length===h+1, `${h}->${G.player.hand.length}`);
  A.clearBattleScoped(); A.applyToTarget(host, G.player, {kind:'damage', amount:2}, stick('enemy',1,2), 'T');
  ok('…but not outside an attack', G.player.hand.length===h+1); }
// GD03-097 Wistario Afam / GD04-090 Hallelujah Haptism / GD05-069 Gundam Maxter — dig on-kill
fresh(); { const host=stick('player',4,4,{linked:true}); host.pilot={pAp:1,pHp:2}; host.pilotCard=card('GD03-097','player'); const t0=G.player.trash.length, d0=G.player.deck.length;
  killBattle(host); ok('Wistario Afam: top 2 — one back on top, one to the trash', G.player.trash.length===t0+1 && G.player.deck.length===d0-1, `trash+${G.player.trash.length-t0} deck-${d0-G.player.deck.length}`); }
fresh(); { const host=stick('player',4,4,{linked:true}); host.pilot={pAp:2,pHp:1}; host.pilotCard=card('GD04-090','player'); const cb=card('GD01-004','player'); cb.trait='(CB)'; G.player.deck.push(cb); const h=G.player.hand.length;
  killBattle(host); ok('Hallelujah: a (CB) top card is added to the hand', G.player.hand.includes(cb) && G.player.hand.length===h+1); }
fresh(); { const mx=put('GD05-069','player'); const sp=A.GUNDAM_CARDS.find(d=>d.type==='command' && /\(Special Move\)/.test(d.trait||'')); const c=A.makeCard(sp,'player'); G.player.deck.splice(G.player.deck.length-2,0,c);
  killBattle(mx); ok('Gundam Maxter: a (Special Move) Command among the top 4 goes to hand', G.player.hand.includes(c)); }
// ST10-001 Zeta Gundam (EX) — destroys an enemy shield-area card: set active, can't attack that player again
fresh(); { const z=put('ST10-001','player'); A.declareAttack(z, G.player); A.strikePlayer(z, G.enemy, ()=>{}); drainTasks();
  ok('Zeta Gundam (EX) is set active and can\'t hit the player again this turn', !z.rested && A.cantHitPlayer(z)===true, `rested=${z.rested}`); }
// once-per-turn on a Pilot's on-kill is tracked on the Pilot card
fresh(); { const host=stick('player',4,9,{linked:true}); host.pilot={pAp:1,pHp:2}; host.pilotCard=card('GD03-097','player'); const t0=G.player.trash.length;
  killBattle(host); killBattle(host); ok('a Pilot\'s 【Once per Turn】 on-kill fires once', G.player.trash.length===t0+1, 'trash+'+(G.player.trash.length-t0)); }

// ===== continuous auras / attack rules =====
// GD04-002 Penelope (Flight Form) — during your turn, all your (Earth Federation) Units get AP+1
fresh('player'); { put('GD04-002','player'); const ef=stick('player',2,2,{trait:'(Earth Federation)'}); const o=stick('player',2,2);
  const a=A.effAp(ef); G.turn='enemy'; const b=A.effAp(ef);
  ok('Penelope: (Earth Federation) Units get AP+1 on your turn only', a===3 && b===2 && A.effAp(o)===2, `${a},${b}`); }
// EB01-036 Darilbalde — during your turn, all OTHER Lv.3 (G Generation) Units get AP+1
fresh('player'); { const da=put('EB01-036','player'); const g3=lv3gg('player'); const g4=stick('player',1,1,{trait:'(G Generation)',lv:4});
  ok('Darilbalde: other Lv.3 (G Generation) Units +1, not itself, not Lv.4', A.effAp(g3)===2 && A.effAp(g4)===1 && A.effAp(da)===4, `${A.effAp(g3)},${A.effAp(g4)},${A.effAp(da)}`); }
// GD04-013 Core Fighter — while rested, your (League Militaire) Unit tokens gain <Blocker>
fresh(); { const cf=put('GD04-013','player'); const tk=A.makeToken({name:'Parts',ap:1,hp:1,trait:'(League Militaire)'},'player'); G.player.field.push(tk);
  const a=A.effBlocker(tk); cf.rested=true; ok('Core Fighter (rested) gives (League Militaire) tokens <Blocker>', !a && A.effBlocker(tk)===true); }
// GD04-022 Kikeroga (MS Mode) (GQ) — all your Unit tokens gain <Breach 1>; 【During Link】 Lv.3-or-lower non-token Units deploy rested
fresh(); { const kk=put('GD04-022','player'); const tk=A.makeToken({name:'T',ap:1,hp:1},'player'); G.player.field.push(tk);
  ok('Kikeroga: your Unit tokens have <Breach 1>', A.effBreach(tk)===1, 'breach='+A.effBreach(tk));
  kk.linked=true; const e=stick('enemy',2,2,{lv:3}); A.onUnitDeployed(e, G.enemy, null, true); const e5=stick('enemy',2,2,{lv:4}); A.onUnitDeployed(e5, G.enemy, null, true);
  ok('Kikeroga (linked): an enemy Lv.3 Unit is deployed rested, a Lv.4 is not', e.rested===true && e5.rested===false); }
// GD01-063 ZnO — during your turn, <First Strike> while battling an enemy Unit Lv.2 or lower
fresh(); { const z=put('GD01-063','player'); const d=stick('enemy',5,2,{rested:true,lv:2}); A.battle(z, d, G.player, G.enemy); drainTasks();
  ok('ZnO strikes first vs a Lv.2 Unit and survives', G.player.field.includes(z) && !G.enemy.field.includes(d)); }
fresh(); { const z=put('GD01-063','player'); const d=stick('enemy',5,2,{rested:true,lv:3}); A.battle(z, d, G.player, G.enemy); drainTasks();
  ok('ZnO: no First Strike vs a Lv.3 Unit', !G.player.field.includes(z)); }
// GD02-073 Carta's Graze Ritter — opponent's turn: the enemy Unit battling it gains <First Strike>
fresh('enemy'); { const cg=put('GD02-073','player',{rested:true}); const atk=stick('enemy',4,3); A.battle(atk, cg, G.enemy, G.player); drainTasks();
  ok("Carta's Graze Ritter gives its attacker <First Strike> (attacker kills it, takes nothing)", !G.player.field.includes(cg) && atk.hp===3, 'atk hp='+atk.hp); }
// GD03-042 Duel Gundam (Assault Shroud) — with 5+ AP it may attack an active enemy Unit Lv.5 or lower
fresh(); { const du=put('GD03-042','player'); const t=stick('enemy',1,1,{lv:5}); const a=A.canHitActive(du,t); du.tempAp=2; du.ap=A.effAp(du);
  ok('Duel AS may attack an active Lv.5 Unit only with 5+ AP', !a && A.canHitActive(du,t)===true && A.canHitActive(du, stick('enemy',1,1,{lv:6}))===false); }
// GD03-058 Farsia — this card in your trash gets cost -1
fresh(); { const f=card('GD03-058','player'); G.player.trash.push(f); ok('Farsia costs 1 less in the trash', A.effectiveCost(G.player, f)===f.cost-1, A.effectiveCost(G.player,f)+' vs '+f.cost); }
// GD03-081 AEU Enact — can only attack during a turn when one of your (Superpower Bloc)/(UN) Units was deployed
fresh(); { const ae=put('GD03-081','player'); const a=A.trashBlocksAttack(ae, G.player); const sb=stick('player',1,1,{trait:'(UN)'}); A.onUnitDeployed(sb, G.player, null, true);
  ok('AEU Enact may attack only after a (Superpower Bloc)/(UN) deploy this turn', a===true && A.trashBlocksAttack(ae, G.player)===false); }
// GD05-041 Gaia Gundam (MA Mode) — cost -2 in hand during a turn your effect made the opponent discard
fresh(); { const g=card('GD05-041','player'); G.player.hand.push(g); const c0=A.effectiveCost(G.player,g);
  G.enemy.hand.push(card('ST01-003','enemy')); A.runTrigger({name:'Discard',effect:'',owner:'player'}, G.player, {kind:'foeDiscard', amount:1}, 'T');
  ok('Gaia (MA Mode) costs 2 less after the opponent discards to your effect', A.effectiveCost(G.player,g)===Math.max(0,c0-2), `${c0}->${A.effectiveCost(G.player,g)}`); }
// EB01-042 Psycho Haro (EX) — while rested, all Units gain <Blocker>; 【Attack】 Lv.7-or-lower Units can't block this battle
fresh(); { const ph=put('EB01-042','player',{rested:true}); const e=stick('enemy',1,1); ok('Psycho Haro (rested): every Unit has <Blocker>', A.effBlocker(e)===true);
  ph.rested=false; ok('…not while active', A.effBlocker(e)===false); }
fresh(); { const ph=put('EB01-042','player'); stick('enemy',1,5,{blocker:true,lv:7}); const s0=G.enemy.shields.length;
  G.selected=ph.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok("Psycho Haro's attack can't be blocked by a Lv.7 Blocker", G.enemy.shields.length<s0, `${s0}->${G.enemy.shields.length}`); }
// EB01-028 Gundam Plutone — another Unit attacks an enemy Unit while it's rested: the attacker gains <Breach 2> this battle
fresh(); { put('EB01-028','player',{rested:true}); const atk=stick('player',3,3); const d=stick('enemy',1,1,{rested:true}); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(d.uid); drainTasks();
  ok('Plutone (rested): the attacker gets <Breach 2> and breaks a Shield after the kill', G.enemy.shields.length===s0-1 && A.effBreach(atk)===0, `${s0}->${G.enemy.shields.length} breach after=${A.effBreach(atk)}`); }
// "during this turn" grants end with the turn
fresh(); { const u=stick('player',1,1); A.grantKeyword(u,'blocker'); A.grantKeyword(u,'breach',2); const a=A.effBlocker(u)&&A.effBreach(u)===2; A.endTurn(); drainTasks();
  ok('granted <Blocker>/<Breach> end at the cleanup step', a && !A.effBlocker(u) && A.effBreach(u)===0); }

// ===== one-offs =====
// EB01-023 Le Cygne (EX) — 【Attack】 all players look at their top card; Lv.5 or higher may be added to hand
fresh(); { const lc=put('EB01-023','player'); const hi=card(A.GUNDAM_CARDS.find(d=>d.type==='unit'&&d.lv>=6).id,'player'); G.player.deck.push(hi);
  const lo=card('ST01-003','enemy'); G.enemy.deck.push(lo); const hp=G.player.hand.length, he=G.enemy.hand.length;
  A.runTrigger(lc, G.player, A.gatedAttackAction(lc.effect, lc), 'Attack');
  // "they MAY reveal it and add it": you decide for your own top card (the top-card chooser), the AI for its own.
  { const ov=(global.document.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay')).pop();
    const add=ov ? ov.children[0].children.flatMap(k=>k.children||[]).find(b=>b.onclick && /add to hand/i.test(b.innerHTML||'')) : null;
    ok('Le Cygne: you are offered to reveal and add your own Lv.6 top card', !!add); if (add){ add.onclick(); drainTasks(); } }
  ok('Le Cygne: a Lv.6 top card goes to its owner\'s hand; a Lv.3 one does not', G.player.hand.includes(hi) && G.player.hand.length===hp+1 && G.enemy.hand.length===he); }
// GD04-087 Elan Ceres (pilot, 【During Link】【Attack】) — battle damage the host would receive goes to an (Academy) Unit
fresh(); { const host=stick('player',3,3,{linked:true}); host.pilot={pAp:1,pHp:2}; host.pilotCard=card('GD04-087','player'); const ac=stick('player',1,6,{trait:'(Academy)'});
  A.declareAttack(host, G.player); A.resolveAttackTriggers(host, G.player, ()=>{}); drainTasks();
  // "You may choose 1 of your (Academy) Units" — the player picks it in the chooser
  { const b=[...el('blockBtns').children].find(x=>(x.innerHTML||'').includes(ac.name)); if (b){ el('blockModal').classList.remove('show'); b.onclick(); } drainTasks(); }
  const d=stick('enemy',2,9,{rested:true});
  A.battle(host, d, G.player, G.enemy); drainTasks();
  ok('Elan Ceres: the (Academy) Unit takes the battle damage instead', host.hp===3 && ac.hp===4, `host=${host.hp} academy=${ac.hp}`); }
// GD05-034 Gaia Gundam — 【During Pair】 shield-area destruction: the enemy may discard 1; if not, deploy a (Phantom Pain) Lv.4- Unit
const ppDef=()=>A.GUNDAM_CARDS.find(d=>d.type==='unit'&&/\(Phantom Pain\)/.test(d.trait||'')&&d.lv<=4);
fresh('enemy'); { const gg=put('GD05-034','enemy'); gg.pilot={pAp:0,pHp:0}; const pp=card(ppDef().id,'enemy'); G.enemy.hand.push(pp);
  G.player.hand=[]; A.strikePlayer(gg, G.player, ()=>{}); drainTasks();
  ok('Gaia: a defender with no cards to discard lets the (Phantom Pain) Unit deploy', G.enemy.field.includes(pp)); }
fresh('enemy'); { const gg=put('GD05-034','enemy'); gg.pilot={pAp:0,pHp:0}; const pp=card(ppDef().id,'enemy'); G.enemy.hand.push(pp);
  const mine=card('ST01-003','player'); G.player.hand=[mine]; A.strikePlayer(gg, G.player, ()=>{}); drainTasks();
  const shown=el('blockModal').classList.contains('show'); const btns=[...el('blockBtns').children].map(b=>b.textContent);
  if (shown) el('blockBtns').children[0].onclick(); drainTasks();
  ok('Gaia: the player is offered discard-or-not, and discarding stops the deploy', shown && btns.length===2 && G.player.trash.includes(mine) && !G.enemy.field.includes(pp), JSON.stringify(btns)); }
fresh(); { const gg=put('GD05-034','player'); gg.pilot={pAp:0,pHp:0}; const pp=card(A.GUNDAM_CARDS.find(d=>d.type==='unit'&&/\(Phantom Pain\)/.test(d.trait||'')&&d.lv<=4).id,'player'); G.player.hand.push(pp);
  G.enemy.hand=[card('ST01-003','enemy')]; A.strikePlayer(gg, G.enemy, ()=>{}); drainTasks();
  ok('Gaia: the AI discards a cheap card to stop the deploy', G.enemy.hand.length===0 && !G.player.field.includes(pp) && G.enemy.discardedTurn===G.turnSeq); }
// GD05-089 Master Asia — its 【Burst】: with 3+ (MF) cards in the trash it may be deployed as an AP3/HP3 Unit instead of going to hand;
// leaving play it is a Pilot again. (From hand it is only played as a Pilot — the Unit option is part of the 【Burst】 sentence.)
fresh(); { const s=G.player; const ma=card('GD05-089','player'); for(let i=0;i<3;i++){ const m=card('GD05-069','player'); s.trash.push(m); }
  A.triggerBurst(ma, s, ()=>{}, true); drainTasks(); const opened=el('blockModal').classList.contains('show') && el('blockBtns').children.length===2;
  if (opened) el('blockBtns').children[1].onclick(); drainTasks();
  ok('Master Asia Burst offers hand / Unit and deploys as an AP3/HP3 Unit', opened && s.field.includes(ma) && ma.type==='unit' && A.effAp(ma)===3 && ma.hp===3, `opened=${opened} type=${ma.type}`);
  const e=stick('enemy',5,5); A.applyToTarget(e, G.enemy, {kind:'damage', amount:3}, ma, 'T');
  ok('…and goes to the trash as a Pilot card', s.trash.includes(ma) && ma.type==='pilot'); }
fresh(); { const host=stick('player',3,3,{linked:true}); host.pilot={pAp:2,pHp:2}; host.pilotCard=card('GD05-089','player'); const e=stick('enemy',1,4);
  const act=A.gatedAttackAction(host.pilotCard.effect, host); A.runTrigger(host, G.player, act, 'Attack'); const a=e.hp;
  A.commandPlayed({name:'Shining Finger', type:'command', trait:'(Gundam Fighter) (Special Move)'}, G.player); A.runTrigger(host, G.player, act, 'Attack');
  ok('Master Asia 【Attack】: 2 damage only after a (Special Move) Command this turn', a===4 && e.hp===2, `${a}->${e.hp}`); }

// ===== official-text updates (gcg-api sync) =====
const hostWith=(pid, x, who)=>{ const h=stick(who||'player',2,4,x); const p=card(pid, who||'player'); h.pilot={pAp:p.pAp||0,pHp:p.pHp||0}; h.pilotCard=p; h.maxHp=A.effMaxHp(h); h.hp=h.maxHp; h.ap=A.effAp(h); return h; };
fresh(); { const sz=put('GD05-049','player'); ok('Sazabi: the official wording still parses as its self-sacrifice', (A.gatedAttackAction(sz.effect, sz)||{}).kind==='gd05Sac'); }
fresh(); { const te=card('GD05-038','player'); ok('Throne Eins: its 【Activate】 is not gated by the 【During Link】 line above it', te.activate && te.activate.requireLink===false); }
fresh(); { const u=stick('player',2,2); const h=G.player.hand.length; const p=card('GD01-088-p1','player'); u.link=['Someone Else']; A.attachPilot(u, p, ()=>{}); drainTasks();
  const a=G.player.hand.length; const v=stick('player',2,2); v.link=['Banagher Links']; A.attachPilot(v, card('GD01-088-p1','player'), ()=>{}); drainTasks();
  ok('Banagher (GD01-088_p1): draws only when the pairing makes a Link Unit', a===h && G.player.hand.length===h+1, `${h}->${a}->${G.player.hand.length}`); }
fresh(); { const o=stick('player',2,2,{trait:'(Orb)'}); o.link=['Kira Yamato']; const h=G.player.hand.length; A.attachPilot(o, card('GD05-081','player'), ()=>{}); drainTasks(); const a=G.player.hand.length;
  const z=stick('player',2,2,{trait:'(ZAFT)'}); z.link=['Kira Yamato']; A.attachPilot(z, card('GD05-081','player'), ()=>{}); drainTasks();
  ok('Kira (GD05-081): draws only when linked to an (Orb)/(Triple Ship Alliance) Unit', a===h+1 && G.player.hand.length===h+1, `${h}->${a}->${G.player.hand.length}`); }
fresh(); { const ag=put('GD05-021','player'); A.applyActivateEffect(ag, null, G.player); const a=A.effAp(ag); A.clearBattleScoped();
  ok('AGE-2 Double Bullet: AP+4 for this battle only', ag.activate.phase==='action' && a===ag.baseAp+4 && A.effAp(ag)===ag.baseAp, `${a} then ${A.effAp(ag)}`); }
fresh(); { const sp=card('GD05-118','player'); const e=stick('enemy',4,4); G.player.resMax=0; G.player.ex=1; G.player.resAvail=1; A.payCost(G.player,1);
  A.applyToTarget(sp, G.player, sp.action, e, 'T'); ok('Incendiary Spark: paid with an EX Resource it also rests the target', A.effAp(e)===2 && e.rested===true); }
fresh(); { const sf=card('GD05-120','player'); const sg=stick('player',3,3,{name:'Shining Gundam'}); const e=stick('enemy',1,3);
  A.runTrigger(sf, G.player, sf.action, 'T'); ok('Shining Finger: rests the target and gives a "Shining Gundam" First Strike', e.rested && A.effFirstStrike(sg)===true); }
fresh(); { const w=card('GD05-119','player'); const mine=stick('player',3,3,{lv:5}); const e=stick('enemy',3,3,{lv:2}); const other=stick('enemy',3,3,{lv:9});
  G.curBattle={atk:e, def:mine}; const ts=A.enemyTargets(G.enemy, w.action);
  ok('A Wind Against Fires: only the enemy Unit battling your Lv.5+ Unit is a target', ts.length===1 && ts[0]===e, ts.map(x=>x.lv).join(',')); G.curBattle=null; }
fresh(); { const hm=put('GD05-006','player'); ok('Hashmal: no flat Repair', A.effRepair(hm)===0, 'repair='+A.effRepair(hm));
  const d=stick('enemy',0,1,{rested:true}); A.battle(hm, d, G.player, G.enemy); drainTasks();
  const toks=G.player.field.filter(u=>u.token && /Pluma/.test(u.name));
  ok('Hashmal: a battle kill deploys a Pluma token, and it gains <Repair 1> per (Calamity War) token', toks.length===1 && A.effRepair(hm)===1, `toks=${toks.length} repair=${A.effRepair(hm)}`); }
fresh('enemy'); { const sf=put('GD05-002','enemy'); sf.pilot={pAp:0,pHp:0}; G.enemy.hand=[card('ST01-003','enemy'),card('ST01-003','enemy'),card('ST01-003','enemy')]; const e=stick('player',2,2,{lv:1});
  const act=A.gatedAttackAction(sf.effect, sf); A.runTrigger(sf, G.enemy, act, 'Attack');
  ok('Strike Freedom: the bounce costs 2 discards', G.enemy.hand.length===1 && !G.player.field.includes(e), 'hand='+G.enemy.hand.length); }
fresh('enemy'); { const lr=put('GD05-051','enemy'); const t=stick('enemy',3,3,{trait:'(Tekkadan)',rested:true}); G.mode='idle'; A.endTurn(); drainTasks();
  ok('Barbatos Lupus Rex: at the end of turn a rested (Tekkadan) Unit takes 1 and is set active', t.hp===2 && t.rested===false, `hp=${t.hp} rested=${t.rested}`); }
fresh('enemy'); { const sm=card('GD05-121','enemy'); G.enemy.hand=[sm]; const e=stick('player',4,4); const dom={name:'Domon',effect:'',owner:'enemy'};
  const act=A.parseTrigger(card('GD05-097','enemy').effect,'When Paired'); A.runTrigger(dom, G.enemy, act, 'Pair'); drainTasks();
  ok("Domon: discarding a (Special Move) Command activates its 【Main】", G.enemy.trash.includes(sm) && A.effAp(e)===2, 'ap='+A.effAp(e)); }
fresh(); { const ar=card('GD05-104','player'); const sh=stick('player',2,2,{trait:'(Shrike Team)',linked:true}); const lm=stick('player',2,2,{trait:'(League Militaire)',rested:true});
  A.applyToTarget(ar, G.player, ar.action, sh, 'T'); A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:5}, sh, 'T');
  ok("At the Risk of One's Life: the linked Unit's 【Destroyed】 sets a (League Militaire) Unit active", !G.player.field.includes(sh) && lm.rested===false); }
fresh('enemy'); { const cp=card('GD05-121','enemy'); const mf=stick('enemy',3,3,{trait:'(MF)'}); G.enemy.trash.push(cp);
  A.commandPlayed(cp, G.enemy); /* the AI's play paths schedule it after resolving */ setTimeout(()=>{},0); drainTasks();
  global.__after = true; }   // (scheduling is exercised by the full games; resolve it directly here)
fresh('enemy'); { const cp=card('GD05-121','enemy'); const mf=stick('enemy',3,3,{trait:'(MF)'}); G.enemy.trash.push(cp);
  const H2=require('./harness.js'); const run=global.__G.afterCommandMain; if (run) run(cp, G.enemy); drainTasks();
  ok('Cyclone Punch: after its 【Main】 it can be paired from the trash with an (MF) Unit', mf.pilotCard && mf.pilotCard.name==='Chibodee Crocket' && !G.enemy.trash.includes(cp), 'pilot='+(mf.pilotCard&&mf.pilotCard.name)); }
// Pilot continuous text, gained by the paired Unit
fresh(); { const h=hostWith('GD01-089'); const a=A.effAp(h); h.repair=1; ok('Riddhe Marcenas: AP+1 while the Unit has <Repair>', A.effAp(h)===a+1, `${a}->${A.effAp(h)}`); }
fresh(); { const h=hostWith('GD01-091'); h.breach=1; const d=stick('enemy',3,9,{rested:true}); const hp=h.hp; A.battle(h, d, G.player, G.enemy); drainTasks();
  ok('Chang Wufei: with <Breach>, no battle damage from a 3-AP Unit on your turn', h.hp===hp, `${hp}->${h.hp}`); }
fresh('enemy'); { hostWith('GD05-084'); const tk=A.makeToken({name:'P',ap:1,hp:3,trait:'(League Militaire)'},'player'); G.player.field.push(tk); A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:2}, tk, 'T');
  ok('Odelo Henrik: your (League Militaire) tokens take 1 less enemy effect damage', tk.hp===2, 'hp='+tk.hp); }
fresh(); { const h=hostWith('GD05-088'); const lf=stick('player',2,2,{name:'Gundam Lfrith Ur'}); const o=stick('player',2,2);
  ok('Prospera Mercury: the host and "Gundam Lfrith" Units get AP+1', A.effAp(h)===h.baseAp+(h.pilot.pAp||0)+1 && A.effAp(lf)===3 && A.effAp(o)===2, `${A.effAp(h)},${A.effAp(lf)},${A.effAp(o)}`); }
fresh(); { const h=hostWith('GD01-087',{color:'Blue'}); ok('Sayla Mass: a blue host has <Repair 1>', A.effRepair(h)===1); }
fresh(); { const h=hostWith('GD02-097'); const a=A.effAp(h); G.player.base=A.makeCard(A.GUNDAM_CARDS.find(d=>d.type==='base'&&d.color==='White'),'player'); ok('Kamille Bidan: AP+2 with a friendly white Base', A.effAp(h)===a+2); }
fresh(); { hostWith('GD04-083'); const tk=A.makeToken({name:'P',ap:1,hp:1,trait:'(League Militaire)'},'player'); G.player.field.push(tk); ok('Marbet Fingerhat: (League Militaire) tokens AP+1', A.effAp(tk)===2); }
fresh(); { const h=hostWith('ST07-012'); stick('player',1,1,{trait:'(CB)',linked:true}); const d=stick('enemy',3,9,{rested:true}); const hp=h.hp; A.battle(h, d, G.player, G.enemy); drainTasks();
  ok('Allelujah Haptism: with a (CB) Link Unit, no battle damage from a 3-AP Unit', h.hp===hp); }
fresh(); { const h=hostWith('GD04-088'); stick('enemy',3,9,{lv:4,blocker:true}); const hp=h.hp; G.selected=h.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('Tokwan: blocked by a Lv.4 Unit, it takes no battle damage', h.hp===hp, `${hp}->${h.hp}`); }
fresh(); { const h=hostWith('GD05-098'); const e=stick('enemy',3,3); A.strikePlayer(h, G.enemy, ()=>{}); drainTasks();
  ok('Heero Yuy (GD05-098): breaking a Shield gives an enemy Unit AP-2', A.effAp(e)===1, 'ap='+A.effAp(e)); }
fresh(); { const h=hostWith('ST08-011',{color:'Blue'}); A.draw(G.player); ok('Lane Aim: an effect draw gives the blue host <High-Maneuver>', A.effHighManeuver(h)===true); }
// alternate printings are the same card (2-1-1): a -pN copy of a bespoke card keeps its effect
fresh(); { const nu=A.CARD_BY_ID.get('GD05-017-p1') ? card('GD05-017-p1','player') : null;
  ok('a -p1 printing keeps its bespoke hook (Nu Gundam GD05-017_p1)', !nu || (A.gd05Custom(nu,'When Paired')||{}).kind==='gd05NuBattle'); }

// ===== Base / Unit continuous text found by the line-based coverage check =====
const base=(id, who)=>{ const b=card(id, who||'player'); b.rested=false; b.sick=false; (who==='enemy'?G.enemy:G.player).base=b; return b; };
fresh('player'); { base('GD02-124'); const g=stick('player',2,2,{trait:'(Earth Federation)',color:'Green'}); G.player.resMax=6; const a=A.effAp(g); G.player.resMax=7;
  ok('Diva: green (Earth Federation) Units AP+1 on your turn at Lv.7+', a===2 && A.effAp(g)===3, `${a}->${A.effAp(g)}`); }
fresh('enemy'); { const b=base('GD02-129'); const hp=b.hp; const atk=stick('enemy',3,3,{breach:2}); A.breachShield(atk, G.player);
  ok('Argama (GD02-129): <Breach> (enemy effect damage) can\'t hurt it', b.hp===hp, `${hp}->${b.hp}`); }
fresh('enemy'); { put('GD03-020','player',{rested:true}); stick('player',1,1,{name:'Ad Balloon'}); const fz=G.player.field[0]; const atk=stick('enemy',5,5); const hp=fz.hp;
  A.battle(atk, fz, G.enemy, G.player); drainTasks(); ok('Zaku Ⅱ FZ: no enemy battle damage with an "Ad Balloon" Unit in play', fz.hp===hp && G.player.field.includes(fz)); }
fresh('enemy'); { base('GD03-126'); const tk=A.makeToken({name:'T',ap:1,hp:1},'player'); G.player.field.push(tk); const a=A.effAp(tk); G.turn='player';
  ok('Cyclops Team: friendly tokens AP+1 during the opponent\'s turn only', a===2 && A.effAp(tk)===1, `${a},${A.effAp(tk)}`); }
fresh('player'); { const b=base('GD03-129'); const t=stick('player',2,4,{trait:'(Tekkadan)'}); const tr=G.player.trash.length; G.effSrc=t; A.damage(t, 1, G.player, 'self');
  ok('Hotarubi: your (Tekkadan) Unit takes effect damage → it rests and mills 1', b.rested && G.player.trash.length===tr+1); }
fresh('enemy'); { const b=base('GD04-123'); stick('player',1,1,{trait:'(Zeon)',rested:true}); const hp=b.hp; A.strikePlayer(stick('enemy',3,3,{lv:4}), G.player, ()=>{}); drainTasks();
  const a=b.hp; A.strikePlayer(stick('enemy',3,3,{lv:5}), G.player, ()=>{}); drainTasks();
  ok('A Baoa Qu: no battle damage from a Lv.4 attacker while you have a rested (Zeon) Unit; Lv.5 still hits', a===hp && b.hp===hp-3, `${hp}->${a}->${b.hp}`); }
fresh('player'); { base('GD04-124'); const ac=stick('player',2,2,{trait:'(Academy)'}); A.runTrigger({name:'EX',effect:'',owner:'player'}, G.player, {kind:'exResource', amount:1}, 'EX');
  ok('9th Tactical Testing Sector: placing an EX Resource gives an (Academy) Unit AP+2', A.effAp(ac)===4); }
fresh('enemy'); { const b=base('ST07-015'); stick('player',1,1,{trait:'(CB)',rested:true}); const hp=b.hp; A.strikePlayer(stick('enemy',3,3,{lv:3}), G.player, ()=>{}); drainTasks();
  const a=b.hp; const tk=A.makeToken({name:'T',ap:2,hp:2},'enemy'); G.enemy.field.push(tk); A.strikePlayer(tk, G.player, ()=>{}); drainTasks();
  ok('Ptolemaios: no damage from a Lv.3 enemy Unit with a rested (CB) Unit; a token still hits', a===hp && b.hp===hp-2, `${hp}->${a}->${b.hp}`); }
fresh('enemy'); { base('EB01-088'); const g=lv3gg('player'); const a=A.effAp(g); G.turn='player';
  ok('Miorine & Academy Ship: Lv.3 (G Generation) Units AP+1 during the opponent\'s turn', a===2 && A.effAp(g)===1); }
fresh('enemy'); { base('GD05-123'); const o=stick('player',2,4,{trait:'(Orb)'}); A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:2}, o, 'T'); const a=o.hp;
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage',amount:3}, o, 'T');
  ok('Archangel (GD05-123): (Orb) Units ignore 2-or-less enemy effect damage on the opponent\'s turn', a===4 && o.hp===1, `${a},${o.hp}`); }
fresh('player'); { const sm=put('GD05-068','player'); A.commandPlayed({name:'SF', type:'command', trait:'(Special Move)'}, G.player);
  ok('Shining Gundam (Super Mode): a (Special Move) Command gives it <Suppression> this turn', A.effSuppression(sm)===true); }
fresh('player'); { const b=base('GD05-124'); const lm=stick('player',2,2,{trait:'(League Militaire)'}); const other=stick('player',1,1,{trait:'(League Militaire)'});
  lm.activate={phase:'main', cost:{type:'restUnit', count:1, trait:null, excludeSelf:true}, action:{kind:'setActive', scope:'self'}, text:'t'};
  A.applyActivateEffect(lm, null, G.player);
  ok('White Ark: rests itself instead of one of your Units for a (League Militaire) cost', b.rested===true && other.rested===false); }

console.log('\n== pool card checks ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  ! '+f));
