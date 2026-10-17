// Comprehensive-rules conformance (Gundam Card Game Comprehensive Rules v1.10.0, Oct 16 2026).
// Each case cites the rule number it checks and builds a tiny board to exercise the engine's actual
// code paths (no engine internals are mocked).
const fs=require('fs');
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
const SRC=fs.readFileSync(__dirname+'/game.js','utf8');
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(){
  drainTasks();
  Object.assign(G,{turn:'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true;
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
let UID=800000;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Test ${ap}/${hp}`, type:'unit', color:'Blue', cost:1, lv:1,
    trait:'(Test)', link:[], effect:'', baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false, breach:0, suppression:false,
    support:0, repair:0, token:false };
  Object.assign(c, extra||{});
  (who==='player'?G.player:G.enemy).field.push(c);
  return c;
}
const vanillaUnit = A.GUNDAM_CARDS.find(d=>d.type==='unit' && (d.effect==='-'||!d.effect) && d.cost<=2);
const vanillaPilot = A.GUNDAM_CARDS.find(d=>d.type==='pilot' && !/【(When Paired|Deploy|Attack|Once|During)/.test(d.effect||''));
const plainBases = A.GUNDAM_CARDS.filter(d=>d.type==='base' && !/-p\d$/.test(d.id));
const clickModal = (i)=>{ const b=el('blockBtns').children[i||0]; if(!b) return false; b.onclick(); return true; };

// 7-3-1 — the draw phase has no first-turn exception: Player One draws on turn 1.
fresh(); { G.turnNumber=1; G.firstPlayer='player'; const h=G.player.hand.length; A.beginTurn('player');
  ok('7-3-1 first player draws on their first turn', G.player.hand.length===h+1, 'hand '+h+'->'+G.player.hand.length);
  ok('7-3-1 no first-turn draw skip remains in the setup code', !/skipDrawSide\s*=\s*first\b/.test(SRC)); }
// 7-3-1-1 / 11-2-1-2 — a player whose deck becomes empty loses at once (not when they next try to draw).
fresh(); { G.player.deck.length=1; A.draw(G.player);
  ok('7-3-1-1 drawing the last card of the deck is an immediate defeat', G.over===true && G.winner==='enemy', 'over='+G.over+' winner='+G.winner); }
fresh(); { G.enemy.deck.length=0; A.deckOutCheck(G.enemy);
  ok('11-2-1-2 an empty deck (e.g. milled out) is a defeat at rules management', G.over===true && G.winner==='player'); }
fresh(); { G.player.deck.length=2; A.draw(G.player); ok('7-3-1 drawing with cards left is not a loss', !G.over); }
// 4-8-4 / 7-6-5 — the hand may exceed 10 during a turn; discard down to 10 in the end phase's hand step.
fresh(); { const s=G.player; s.hand=[]; for(let i=0;i<10;i++) s.hand.push(A.makeCard(vanillaUnit,'player'));
  A.draw(s); ok('4-8-4 an 11th card drawn stays in hand (no mid-turn discard)', s.hand.length===11 && s.trash.length===0, 'hand='+s.hand.length+' trash='+s.trash.length);
  A.draw(s); A.endTurn();
  // 7-6-5-1: the player discards cards OF THEIR CHOOSING — the engine asks (discard mode) instead of picking.
  const asked = G.mode==='discard' && G.pending && G.pending.discardLeft===2 && s.hand.length===12;
  ok('7-6-5-1 the player chooses which cards to discard in the hand step', asked, 'mode='+G.mode+' left='+(G.pending&&G.pending.discardLeft)+' hand='+s.hand.length);
  const pick=[s.hand[11], s.hand[3]];   // two particular cards — exactly these must be the ones discarded
  for (const c of pick){ if (G.mode!=='discard') break; s.hand.splice(s.hand.indexOf(c),1); A.sendToTrash(c,s); G.pending.discardLeft--;
    if (G.pending.discardLeft<=0){ const af=G.pending.after; G.mode='idle'; G.pending=null; if (af) af(); } }
  ok('7-6-5 hand step discards down to 10 at the end phase', s.hand.length===10 && s.trash.length===2 && pick.every(c=>s.trash.includes(c)), 'hand='+s.hand.length+' trash='+s.trash.length);
  ok('7-6-5 the turn passes once the discard is done', G.turn==='enemy', 'turn='+G.turn); }
fresh(); { const s=G.player; s.hand=[]; for(let i=0;i<10;i++) s.hand.push(A.makeCard(vanillaUnit,'player'));
  const u=stick('player',2,2); const p=A.makeCard(vanillaPilot,'player'); u.pilot={pAp:p.pAp,pHp:p.pHp}; u.pilotCard=p;
  A.returnToHand(u, s);
  ok('4-8-4 a Unit returned to a full hand is still added to the hand', s.hand.includes(u) && s.hand.length===12, 'hand='+s.hand.length);
  ok('3-3-6 the paired Pilot moves to the hand with it', s.hand.includes(p) && !s.trash.includes(p)); }
// 4-4-2 / 4-4-2-1 — resource area holds at most 15 Resources, at most 5 of them EX.
fresh(); { const s=G.player; s.resMax=10; s.ex=0;
  A.runTrigger({name:'Ramp',effect:''}, s, {kind:'resourceRamp', amount:2}, 'Ramp');
  ok('4-4-2 effects can place Resources beyond the 10-card resource deck', s.resMax===12, 'resMax='+s.resMax);
  s.resMax=15; A.runTrigger({name:'Ramp',effect:''}, s, {kind:'resourceRamp', amount:1}, 'Ramp');
  ok('4-4-2 never more than 15 Resources', s.resMax===15, 'resMax='+s.resMax);
  s.resMax=10; s.ex=5; s.resAvail=15; A.runTrigger({name:'EX',effect:''}, s, {kind:'exResource', amount:1}, 'EX');
  ok('4-4-2-1 never more than 5 EX Resources', s.ex===5, 'ex='+s.ex);
  s.resMax=14; s.ex=1; A.runTrigger({name:'EX',effect:''}, s, {kind:'exResource', amount:1}, 'EX');
  ok('4-4-2 an EX Resource still counts toward the 15', s.ex===1 && s.resMax+s.ex===15, 'ex='+s.ex+' total='+(s.resMax+s.ex)); }
// 5-17-3-2-3 — an EX Resource used to pay a cost leaves the game immediately (so it stops counting for Lv).
fresh(); { const s=G.player; s.resMax=2; s.ex=1; s.resAvail=3; A.payCost(s,3);
  ok('5-17-3-2-3 EX Resource is removed the moment it pays a cost', s.ex===0 && A.totalRes(s)===2, 'ex='+s.ex+' total='+A.totalRes(s));
  s.resMax=2; s.ex=1; s.resAvail=3; A.payCost(s,2);
  ok('2-10-1 paying with ordinary Resources first keeps the EX Resource', s.ex===1 && s.resAvail===1); }
fresh(); { const s=G.player; s.resMax=1; s.ex=1; s.resAvail=2; const c=A.makeCard(A.GUNDAM_CARDS.find(d=>d.type==='unit'&&d.cost===2&&d.lv<=2&&!/【/.test(d.effect||'')),'player'); s.hand.push(c);
  A.playFromHand(c.uid, true); drainTasks();
  ok('5-17-3-2-3 deploying with the EX Resource consumes it right away', s.field.includes(c) && s.ex===0, 'ex='+s.ex+' onField='+s.field.includes(c)); }
// 8-2-1 — the attacking Unit is rested when the attack is declared (before 【Attack】 effects and the action step).
fresh(); { const atk=stick('player',3,3); A.declareAttack(atk, G.player); ok('8-2-1 declaring an attack rests the attacker', atk.rested===true); }
// 1-3-2-1 — resting an already-rested attacker changes nothing: the attack goes on.
fresh(); { G.turn='enemy'; const atk=stick('enemy',2,3); const s0=G.player.shields.length;
  A.declareAttack(atk, G.enemy); A.resolveAiAttackInner(atk, ()=>{}, null); drainTasks();
  ok('1-3-2-1 an attack by an (already rested) attacker still resolves', G.player.shields.length===s0-1, `shields ${s0}->${G.player.shields.length}`); }
// 8-4-2 / 8-3-5 — if the attack target has left the battle area before the damage step, no damage is dealt.
fresh(); { const atk=stick('player',3,3); const def=stick('enemy',5,3,{rested:true}); G.enemy.field.splice(G.enemy.field.indexOf(def),1);
  A.battle(atk, def, G.player, G.enemy); drainTasks();
  ok('8-4-2 a target that left play before the damage step deals no damage', atk.hp===3 && G.player.field.includes(atk), 'atk hp='+atk.hp); }
// 5-5-5 / 8-5-2-3-1 — zero damage is not dealt: a 0-AP attack breaks no Shield and cannot defeat the player.
fresh(); { const atk=stick('player',0,3); const s0=G.enemy.shields.length; A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('5-5-5 a 0 AP attack destroys no Shield', G.enemy.shields.length===s0, `shields ${s0}->${G.enemy.shields.length}`); }
fresh(); { const atk=stick('player',0,3); G.enemy.shields=[]; G.enemy.base=null; A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('8-5-2-2 a 0 AP attack on an open player is not a defeat (no battle damage received)', !G.over); }
fresh(); { const atk=stick('player',1,3); G.enemy.shields=[]; G.enemy.base=null; A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('8-5-2-2 battle damage with no Shields and no Base defeats the player', G.over && G.winner==='player'); }
// 8-5-2-4 / 13-1-5-2 — a Base battles back with its AP; <First Strike> that destroys the Base takes nothing.
function fort(ap,hp,who){ const b=A.makeCard(Object.assign({}, plainBases[0], {ap, hp, effect:'-'}), who); b.rested=false; b.sick=false; return b; }
fresh(); { const b=fort(2,4,'enemy'); G.enemy.base=b; const atk=stick('player',3,3); A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('8-5-2-4 the Base takes the attacker AP', b.hp===1, 'base hp='+b.hp);
  ok('13-1-5-2 the attacker receives the Base AP as battle damage', atk.hp===1, 'atk hp='+atk.hp); }
fresh(); { const b=fort(2,4,'enemy'); G.enemy.base=b; const atk=stick('player',4,3,{firstStrike:true}); A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('8-5-2-4-2 <First Strike> destroys the Base first and takes no damage back', G.enemy.base===null && atk.hp===3, 'base='+(G.enemy.base&&G.enemy.base.hp)+' atk hp='+atk.hp); }
fresh(); { const b=fort(0,3,'enemy'); G.enemy.base=b; const atk=stick('player',2,3); A.strikePlayer(atk, G.enemy, ()=>{}); drainTasks();
  ok('5-5-5 a 0 AP Base deals no damage back', atk.hp===3 && b.hp===1); }
// 11-4-2 — a Unit deployed by an effect into a full battle area still arrives: one Unit already there goes to the trash.
fresh(); { const s=G.enemy; for(let i=0;i<6;i++) stick('enemy',1+i,1+i); const weak=s.field[0]; weak.effect='【Destroyed】Draw 1.';
  const c=A.makeCard(vanillaUnit,'enemy'); s.hand.push(c); const h=s.hand.length;
  A.deployFromHand({name:'Src'}, s, {filter:null}, null); drainTasks();
  ok('11-4-2 effect deploy into a full battle area replaces a Unit', s.field.includes(c) && s.field.length===6, 'field='+s.field.length+' deployed='+s.field.includes(c));
  ok('11-4-2 the AI gives up its least valuable Unit', s.trash.includes(weak) && !s.field.includes(weak));
  ok('11-4-2-1 the Unit placed in the trash this way is not destroyed (no 【Destroyed】 trigger)', s.hand.length===h-1, 'hand '+h+'->'+s.hand.length); }
fresh(); { const s=G.player; for(let i=0;i<6;i++) stick('player',2,2); let ran=false;
  A.makeRoom(s, 1, 'Test', ()=>{ ran=true; });
  const opened = el('blockBtns').children.length>=6;
  ok('11-4-2 the player is asked which Unit to place in the trash', opened, 'buttons='+el('blockBtns').children.length);
  if (opened) clickModal(2);
  ok('11-4-2 after the choice there is room and the deploy continues', ran && s.field.length===5 && s.trash.length===1, 'ran='+ran+' field='+s.field.length); }
fresh(); { const s=G.enemy; for(let i=0;i<6;i++) stick('enemy',1,1); const n=A.deployTokens({specs:[{name:'Tok',ap:2,hp:2,count:1}]}, s, 'T', 'T', 'ai');
  ok('11-4-2 a token deployed into a full battle area also replaces a Unit', n===1 && s.field.length===6 && s.field.some(u=>u.token), 'n='+n+' field='+s.field.length); }
// 5-17-2-5-1 / 3-3-6 — a token returned to hand is removed from the game; its Pilot goes to the hand.
fresh(); { const s=G.player; const tok=A.makeToken({name:'Tok',ap:1,hp:1},'player'); s.field.push(tok); const p=A.makeCard(vanillaPilot,'player');
  tok.pilot={pAp:p.pAp,pHp:p.pHp}; tok.pilotCard=p; s.field.splice(s.field.indexOf(tok),1); A.returnToHand(tok, s);   // callers lift it off the field first
  ok('5-17-2-5 the returned token leaves the game', !s.field.includes(tok) && !s.hand.includes(tok) && !s.trash.includes(tok));
  ok('3-3-6 its Pilot goes to the hand (where the token went), not the trash', s.hand.includes(p) && !s.trash.includes(p)); }
// 10-1-6-4 — a "when this Unit destroys an enemy Unit" effect still activates when the attacker is destroyed too.
fresh(); { const atk=stick('player',3,2,{onKill:{kind:'draw',amount:1}}); const def=stick('enemy',5,3,{rested:true}); const h=G.player.hand.length;
  A.battle(atk, def, G.player, G.enemy); drainTasks();
  ok('10-1-6-4 on-kill effect fires even though both Units were destroyed', !G.player.field.includes(atk) && !G.enemy.field.includes(def) && G.player.hand.length===h+1, 'hand '+h+'->'+G.player.hand.length); }
// 13-1-2-3 — <Breach> activates even when both battling Units are destroyed.
fresh(); { const atk=stick('player',3,2,{breach:1}); const def=stick('enemy',5,3,{rested:true}); const s0=G.enemy.shields.length;
  A.battle(atk, def, G.player, G.enemy); drainTasks();
  ok('13-1-2-3 Breach hits the shield area when both Units die', G.enemy.shields.length===s0-1, `shields ${s0}->${G.enemy.shields.length}`); }
// 7-6-6-1 — "during this turn" effects end at the cleanup step for BOTH players' cards.
fresh(); { const e=stick('enemy',2,2); e.tempAp=2; e.ap=A.effAp(e); A.endTurn();
  ok('7-6-6-1 an enemy Unit buffed "during this turn" loses the buff at the end of the turn', e.tempAp===0 && e.ap===2, 'tempAp='+e.tempAp+' ap='+e.ap); }
// 13-2-13-1 — 【Once per Turn】 resets every turn (the opponent's turn is a new turn).
fresh(); { const u=stick('player',3,5,{pairPreventLowAp:true, pilot:{pAp:0,pHp:0}}); const foe=stick('enemy',2,2);
  const first=A.preventsWeakBattleDamage(u, foe, G.player); const second=A.preventsWeakBattleDamage(u, foe, G.player);
  A.beginTurn('enemy');   // the opponent's turn starts (AI turn stays queued, not drained)
  const third=A.preventsWeakBattleDamage(u, foe, G.player);
  ok('13-2-13-1 once per turn: usable once, then again on the very next turn', first && !second && third, [first,second,third].join(',')); }
// 13-1-1-2 / 13-1-2-5 — a gained copy of <Repair>/<Breach> adds its amount to the printed one.
fresh(); { const u=stick('player',1,5,{repair:1, whileKw:[{cond:null,kw:'repair',amount:2}]});
  ok('13-1-1-2 <Repair 1> gaining <Repair 2> becomes <Repair 3>', A.effRepair(u)===3, 'repair='+A.effRepair(u));
  const b=stick('player',1,5,{breach:1}); A.grantKeyword(b,'breach',2);
  ok('13-1-2-5 <Breach 1> gaining <Breach 2> becomes <Breach 3>', A.effBreach(b)===3, 'breach='+A.effBreach(b)); }
// 6-1-1-2 — a deck uses one or two colours.
{ const three={}; for (const col of ['Blue','Green','Red']){ const d=A.GUNDAM_CARDS.find(x=>x.color===col && x.type==='unit'); three[d.id]=4; }
  const two={}; for (const col of ['Blue','Green']){ const d=A.GUNDAM_CARDS.find(x=>x.color===col && x.type==='unit'); two[d.id]=4; }
  ok('6-1-1-2 a three-colour deck is rejected', !!A.deckColorIssue(three), String(A.deckColorIssue(three)));
  ok('6-1-1-2 a two-colour deck is legal', !A.deckColorIssue(two)); }
// 8-3-3 — the Unit originally targeted cannot activate its own <Blocker>.
ok('8-3-3 the attacked Unit is excluded from the blocker choice (player attack path)', /effBlocker\(b\)\s*&&\s*!b\.rested\s*&&\s*b\.hp>0\s*&&\s*b!==target/.test(SRC));
// 11-5-2 — deploying a second Base places the old one in the trash (not destroyed).
fresh(); { const s=G.player; const b1=A.makeCard(plainBases[0],'player'); s.base=b1; const b2=A.makeCard(plainBases[1]||plainBases[0],'player'); s.hand.push(b2);
  A.playFromHand(b2.uid, true); drainTasks();
  ok('11-5-2 a new Base replaces the old one, which goes to the trash', s.base===b2 && s.trash.includes(b1)); }
// 2-9-1 — the Lv condition counts rested Resources too.
fresh(); { const s=G.player; s.resMax=5; s.resAvail=0; const c=A.makeCard(A.GUNDAM_CARDS.find(d=>d.type==='unit'&&d.lv===5),'player');
  ok('2-9-1 Lv is met by total Resources, active or rested', A.levelOk(s,c)===true); }
// 3-2-4 / 3-2-6-3 — a deployed Unit can't attack this turn unless it becomes a Link Unit.
fresh(); { const s=G.player; const ud=A.GUNDAM_CARDS.find(d=>d.id==='ST01-001'); const u=A.makeCard(ud,'player'); u.sick=true; s.field.push(u);
  const pd=A.GUNDAM_CARDS.find(d=>d.type==='pilot' && d.name==='Amuro Ray'); const p=A.makeCard(pd,'player');
  A.attachPilot(u, p, ()=>{}); drainTasks();
  ok('3-2-6-3 a Link Unit may attack on the turn it was deployed', u.linked===true && u.sick===false, 'linked='+u.linked+' sick='+u.sick); }
console.log('\n== comprehensive-rules conformance ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  ! '+f));
