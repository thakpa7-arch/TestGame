// Regression checks for the adversarial-review findings on the rules / GD06 / full-pool commits: each
// scenario reproduces a reported failure with the real cards and asserts the fixed behaviour.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(turn){
  drainTasks();
  el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  Object.assign(G,{turn:turn||'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=0; s.hand=[];
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
let UID=700000;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Test ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:1,
    trait:'(Test)', link:[], effect:'', baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false, breach:0, suppression:false,
    support:0, repair:0, token:false };
  Object.assign(c, extra||{});
  (who==='player'?G.player:G.enemy).field.push(c);
  return c;
}
function card(id, who){ return A.makeCard(A.CARD_BY_ID.get(id), who); }
function put(id, who, extra){ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; }
function inHand(id, who){ const c=card(id, who); (who==='player'?G.player:G.enemy).hand.push(c); return c; }
function pair(u, pid){ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; }
const btns=()=>el('blockBtns').children;
const modalUp=()=>el('blockModal').classList.contains('show');
const clickBtn=(re)=>{ const b=[...btns()].find(x=>re.test(String(x.innerHTML||x.textContent||''))); if(!b) return false; b.onclick(); return true; };
const cancel=()=>el('cancelBtn').fire('click');

// #1 — an AI whose deck runs out during its own turn loses at once (11-1-2 / 11-2-1-2)
fresh('enemy'); { G.enemy.deck.length=0; A.aiTurn(); drainTasks();
  ok('#1 AI with an empty deck loses at rules management on its turn', G.over && G.winner==='player', 'over='+G.over+' winner='+G.winner); }

// #2 / #11 — Mashymre Cello's pair discount is charged as shown, and only onto a qualifying Unit
fresh('player'); { put('GD06-020','player'); const m=inHand('GD06-086','player'); G.player.resAvail=1;
  A.playFromHand(m.uid, true); drainTasks();
  ok('#2 Mashymre Cello pairs for 0 with its discount (resource not spent)', G.player.resAvail===1 && !G.player.hand.includes(m), 'resAvail='+G.player.resAvail); }
fresh('player'); { const hh=put('GD06-020','player'); const plainU=stick('player',2,2); const m=inHand('GD06-086','player'); G.player.resAvail=0;
  A.playFromHand(m.uid, true); drainTasks();
  const asked=G.mode==='pilot-target';
  A.fieldClick(plainU.uid);
  ok('#11 the discount does not apply to a non-qualifying Unit (pairing refused at 0 resources)', asked && !plainU.pilot && G.player.hand.includes(m), 'mode='+G.mode+' pilot='+!!plainU.pilot);
  A.fieldClick(hh.uid); drainTasks();
  ok('#11 … and pairing onto Hamma-Hamma is free', hh.pilotCard===m && G.player.resAvail===0, 'paired='+(hh.pilotCard===m)); }
fresh('enemy'); { const hh=put('GD06-020','enemy'); const m=inHand('GD06-086','enemy'); G.enemy.resAvail=0; G.enemy.ex=0;
  ok('#2 AI sees the discounted pairing as affordable', A.effectiveCost(G.enemy, m, hh)===0 && A.effectiveCost(G.enemy, m, stick('enemy',1,1))===1); }

// #3 — "Place 1 rested Resource" takes it from the resource deck
fresh('player'); { const s=G.player; s.resMax=3; s.resourceDeck=7; A.runTrigger(card('GD01-107','player'), s, {kind:'resourceRamp', amount:1}, 'Test');
  const a=[s.resMax, s.resourceDeck]; s.resourceDeck=0; A.runTrigger(card('GD01-107','player'), s, {kind:'resourceRamp', amount:1}, 'Test');
  ok('#3 resource ramp moves a card out of the resource deck; none left → nothing placed', a[0]===4 && a[1]===6 && s.resMax===4, a.join(',')+' -> '+s.resMax); }

// #5 / #14 — Shining Gundam's Special Move trigger waits for the Command; Cancel leaves no trace; the player picks the target
fresh('player'); { const sh=put('GD06-071','player'); const e1=stick('enemy',5,5,{rested:true}); const e2=stick('enemy',4,4,{rested:true});
  const df=inHand('GD05-110','player'); const ap0=A.effAp(sh);
  A.startCommand(df, G.player.hand.indexOf(df));
  const targeting = G.mode==='trigger-target' && !!G.cmdInFlight;
  cancel();
  ok('#5 cancelling Darkness Finger leaves Shining and the enemies untouched', targeting && A.effAp(sh)===ap0 && A.effAp(e1)===5 && A.effAp(e2)===4 && sh.specialMoveTurn!==G.turnSeq && G.player.hand.includes(df),
    `targeting=${targeting} sh=${A.effAp(sh)} e1=${A.effAp(e1)} e2=${A.effAp(e2)}`);
  A.startCommand(df, G.player.hand.indexOf(df)); A.fieldClick(e1.uid);
  const asked = modalUp() && btns().length===2;
  clickBtn(new RegExp(e2.name.replace(/[#/]/g,'.')));
  drainTasks();
  ok('#14 the player chooses which enemy Unit gets AP-2; Shining gets AP+2', asked && A.effAp(e2)===2 && A.effAp(sh)===ap0+2 && e1.hp===3, `asked=${asked} e2=${A.effAp(e2)} sh=${A.effAp(sh)} e1hp=${e1.hp}`); }

// #6 / #21 / #25 — Qubeley Mk-II's redirect only exists inside a battle it's in, and ends with that battle
fresh('player'); { const q=put('GD06-018','player'); pair(q,'GD06-097'); const nz=stick('player',1,6,{trait:'(Neo Zeon)'});
  ok('#21 the redirect is not offered outside a battle', !A.activateReadyAny(q));
  G.curBattle={ atk:stick('enemy',3,3), def:q }; G.curAttack=G.curBattle.atk;
  ok('#21 … and is offered while Qubeley is battling', A.activateReadyAny(q)); q.redirectTo=nz;
  A.strikePlayer(G.curAttack, G.player, ()=>{}); drainTasks();
  ok('#6 an attack on the player ends its battle-scoped effects (redirect cleared)', q.redirectTo==null && G.curBattle==null, 'redirect='+(q.redirectTo&&q.redirectTo.name)); }
fresh('enemy'); { const q=put('GD06-018','enemy'); pair(q,'GD06-097'); const ef=stick('enemy',3,3,{trait:'(Earth Federation)'}); const nz=stick('enemy',1,6,{trait:'(Neo Zeon)'});
  const a0=A.aiActivate(q);
  G.curBattle={ atk:stick('player',3,3), def:q }; const a1=A.aiActivate(q);
  ok('#25 AI: no redirect outside a battle; in battle it soaks onto a (Neo Zeon) Unit only', !a0 && a1 && q.redirectTo===nz, `a0=${a0} a1=${a1} to=${q.redirectTo&&q.redirectTo.name}`);
  q.redirectTo=nz; A.finishEndPhase(); drainTasks();
  ok('#21 the turn cleanup clears a leftover redirect', q.redirectTo==null); }

// #7 — Cancel at an 【Attack】 target pick skips that effect; the attack still happens
fresh('player'); { const wz=put('GD05-067','player'); stick('enemy',2,2); stick('enemy',2,2); const sh0=G.enemy.shields.length;
  G.selected=wz.uid; G.mode='attack-target'; A.attackDirect();
  const picking = G.mode==='trigger-target';
  cancel(); drainTasks();
  ok('#7 cancelling Wing Zero\'s 【Attack】 choice still lets the attack break a shield', picking && G.enemy.shields.length===sh0-1 && wz.rested, `picking=${picking} shields ${sh0}->${G.enemy.shields.length}`); }

// #8 — <Support> against a Base: never a partial boost, and the player decides
fresh('player'); { const atk=stick('player',1,3); const sup=stick('player',3,3,{support:1}); G.enemy.base=A.exBaseToken('enemy');
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('#8 a Support boost that can\'t destroy the Base isn\'t used', !sup.rested && !modalUp(), 'rested='+sup.rested); }
fresh('player'); { const atk=stick('player',1,3); const sup=stick('player',3,3,{support:2}); G.enemy.base=A.exBaseToken('enemy');
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  const asked=modalUp(); clickBtn(/Don't use/); drainTasks();
  ok('#8 the player is asked before their Support Unit rests; declining keeps it active', asked && !sup.rested && G.enemy.base && G.enemy.base.hp===2, `asked=${asked} rested=${sup.rested} base=${G.enemy.base&&G.enemy.base.hp}`); }

// #9 — "Change a battling enemy Unit's attack target to it" (Veterans Joining Forces), both sides
fresh('enemy'); { const x=put('GD06-056','player',{rested:true}); inHand('GD06-117','player'); const atk=stick('enemy',3,3); G.enemy.field.forEach(u=>u.sick=false);
  const sh0=G.player.shields.length; let done=false;
  A.resolveAiAttackInner(atk, ()=>{ done=true; }, null); drainTasks();
  const offered=modalUp() && clickBtn(/Veterans/); drainTasks();
  while (modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('#9 Veterans Joining Forces moves the AI\'s attack onto the rested (Delaz Fleet) Unit', offered && done && G.player.shields.length===sh0 && x.hp===1, `offered=${offered} shields ${sh0}->${G.player.shields.length} xamel=${x.hp}`); }
fresh('player'); { const x=put('GD06-056','enemy',{rested:true}); inHand('GD06-117','enemy'); const atk=stick('player',3,3); const sh0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('#9 the AI answers a direct attack with its retarget Command', G.enemy.shields.length===sh0 && x.hp===1 && !G.enemy.hand.length, `shields ${sh0}->${G.enemy.shields.length} xamel=${x.hp}`); }
fresh('player'); { const v=inHand('GD06-117','player'); A.startCommand(v, 0);
  ok('#9 a retarget Command isn\'t wasted in the main phase', G.player.hand.includes(v) && G.player.resAvail===10); }

// #10 — a Pilot's 【Activate】 keeps its condition and rider; a Unit keeps its own ability as well
fresh('player'); { const u=stick('player',3,3); pair(u,'GD01-097'); for(let i=0;i<3;i++) G.enemy.hand.push(card('ST01-005','enemy'));
  u.rested=true; const a=A.activateReadyAny(u); for(let i=0;i<5;i++) G.enemy.hand.push(card('ST01-005','enemy')); const b=A.activateReadyAny(u);
  A.applyActivateEffect(u, null, G.player);
  ok('#10 Guel Jeturk: only with 8+ cards in the opponent\'s hand, and the Unit can\'t attack afterwards', !a && b && !u.rested && u.noAttackTurn===G.turnSeq, `a=${a} b=${b} rested=${u.rested} noAtk=${u.noAttackTurn}`); }
fresh('player'); { const u=stick('player',3,3); pair(u,'GD01-098'); const e=stick('enemy',2,2); u.hp=A.effMaxHp(u)-1;
  const a=A.activateReadyAny(u); e.ap=1; e.baseAp=1; const b=A.activateReadyAny(u); const hp0=u.hp; A.applyActivateEffect(u, null, G.player);
  ok('#10 Elan Ceres: needs an enemy at 1 AP or less, and heals its own Unit', !a && b && u.hp===hp0+1, `a=${a} b=${b} hp ${hp0}->${u.hp}`); }
fresh('player'); { const u=stick('player',3,3); pair(u,'ST12-011'); const e=stick('enemy',3,5); e.hp=4;
  const outside=A.collectPlayerActions(null).some(o=>/Milliardo|damaged/i.test(o.sub+o.label));
  G.curBattle={ atk:e, def:u }; G.curAttack=e; const inside=A.collectPlayerActions(e).length>0;
  ok('#10 Milliardo: only a damaged enemy Unit battling this Unit', !outside && inside, `outside=${outside} inside=${inside}`); }
fresh('player'); { const g=put('GD01-058','player'); const own=g.activate; pair(g,'GD06-080');
  const both = g.activate===own && g.activate2 && g.activate2.fromPilot;
  G.player.drewByEffectTurn=G.turnSeq; G.player.effDrewTurn=G.turnSeq;
  A.dropPilotActivate(g);
  ok('#10 a Unit with its own 【Activate】 keeps it and gains Kou Uraki\'s; losing the Pilot drops only Kou\'s', both && g.activate===own && !g.activate2, `both=${!!both}`); }

// #12 / #17 — Legend Gundam from the trash: reduced cost actually paid, reduced Lv for filters, 1–2 destroys
fresh('enemy'); { const s=G.enemy; const zl=stick('enemy',1,1,{trait:'(ZAFT)', linked:true}); for(let i=0;i<5;i++) stick('enemy',5,5);
  const leg=card('GD06-050','enemy'); s.trash.push(leg); const e1=stick('player',2,2,{lv:3}); const e2=stick('player',2,2,{lv:2}); stick('player',2,2,{lv:5});
  const shown=A.effectiveCost(s, leg);
  A.reanimate(card('GD04-050','enemy'), s, {kind:'reanimate', filter:'(minerva squad) unit', maxLv:null}, null); drainTasks();
  ok('#17 Legend: the cost shown (2) is the cost paid even when the ZAFT Link Unit is trashed for room', shown===2 && s.resAvail===8 && s.field.includes(leg), `shown=${shown} resAvail=${s.resAvail} onField=${s.field.includes(leg)}`);
  ok('#12 Legend deployed from the trash destroys up to 2 Lv.3-or-lower enemy Units', !G.player.field.includes(e1) && !G.player.field.includes(e2) && G.player.field.length===1, 'left='+G.player.field.length); }
fresh('player'); { const s=G.player; stick('player',1,1,{trait:'(ZAFT)', linked:true}); const leg=card('GD06-050','player'); s.trash.push(leg);
  ok('#12 Legend counts as Lv.3 in the trash for "Lv.5 or lower" (Awakened Power)', A.trashLv(s, leg)===3); }

// #13 — Reginlaze Julia (paired): the opponent's effects can't set their Units active
fresh('player'); { const j=put('GD06-037','enemy'); pair(j,'ST01-010'); const mine=stick('player',3,3,{rested:true});
  A.runTrigger(card('ST01-005','player'), G.player, {kind:'setActiveFriendly'}, 'Test');
  const blocked=mine.rested; j.pilot=null; A.runTrigger(card('ST01-005','player'), G.player, {kind:'setActiveFriendly'}, 'Test');
  ok('#13 Julia paired stops the player\'s set-active effects; unpaired it doesn\'t', blocked && !mine.rested, `blocked=${blocked} now=${mine.rested}`); }

// #15 — Hamma-Hamma heals when a (Neo Zeon) Unit destroys an enemy card with EFFECT damage too
fresh('enemy'); { const hh=put('GD06-020','enemy'); hh.hp=1; const src=stick('enemy',2,4,{trait:'(Neo Zeon)'}); const t=stick('player',1,1);
  G.effSrc=src; A.damage(t, 1, G.player);
  ok('#15 Hamma-Hamma recovers 1 HP from a (Neo Zeon) effect-damage kill', hh.hp===2, 'hp='+hh.hp); }

// #16 — Turn X (Top): the player picks the token to copy and the Unit that makes room
fresh('player'); { for(let i=0;i<4;i++) stick('player',3,3); const t1=A.makeToken({name:'Aile Strike Gundam', trait:'(Earth Alliance)', ap:3, hp:3}, 'player'); const t2=A.makeToken({name:'Funnel', trait:'(Neo Zeon)', ap:1, hp:1}, 'player');
  G.player.field.push(t1, t2); const victim=G.player.field[0]; let done=false;
  A.cloneToken(card('GD06-021','player'), G.player, 'Deploy', ()=>{ done=true; });
  const askedTok=modalUp() && btns().length===2; clickBtn(/Funnel/);
  const askedRoom=modalUp(); clickBtn(new RegExp(victim.name.replace(/[#/]/g,'.'))); drainTasks();
  const copies=G.player.field.filter(u=>u.name==='Funnel');
  ok('#16 Turn X: player chooses the token kind and which Unit is trashed for room', askedTok && askedRoom && done && copies.length===2 && copies.some(c=>c.rested) && !G.player.field.includes(victim), `tok=${askedTok} room=${askedRoom} done=${done} funnels=${copies.length}`); }

// #18 — the AI takes only the mandatory token on a full battle area for "deploy 1 to 2"
fresh('enemy'); { for(let i=0;i<6;i++) stick('enemy',4,4); const spec={count:2, min:1, name:'Funnel', trait:'(Neo Zeon)', ap:2, hp:2};
  const q6=A.tokenMakerQueue({kind:'token', specs:[spec]}, G.enemy).length; G.enemy.field.length=5; const q5=A.tokenMakerQueue({kind:'token', specs:[spec]}, G.enemy).length; G.enemy.field.length=3; const q3=A.tokenMakerQueue({kind:'token', specs:[spec]}, G.enemy).length;
  ok('#18 "1 to 2" tokens for the AI: extras only into free slots', q6===1 && q5===1 && q3===2, `${q6},${q5},${q3}`); }
fresh('enemy'); { const paired=stick('enemy',2,2); paired.pilotCard=card('GD05-097','enemy'); paired.pilot={name:'Domon',pAp:2,pHp:1}; const plain=stick('enemy',2,2); for(let i=0;i<4;i++) stick('enemy',4,4);
  A.makeRoom(G.enemy, 1, 'Test', null);
  ok('#18 making room, the AI keeps a paired Unit over an equal unpaired one', G.enemy.field.includes(paired) && !G.enemy.field.includes(plain)); }

// #19 — Axis works on a full battle area, and its deploy is mandatory
fresh('player'); { const s=G.player; s.base=card('GD05-129','player'); s.base.sick=false; s.neoZeonSelfKill=true; for(let i=0;i<6;i++) stick('player',3,3);
  inHand('GD06-027','player');
  ok('#19 Axis can be activated with 6 Units in play', A.activateReady(s.base)); }
fresh('enemy'); { const s=G.enemy; s.base=card('GD05-129','enemy'); s.base.sick=false; s.neoZeonSelfKill=true; for(let i=0;i<6;i++) stick('enemy',1,1);
  const gz=inHand('GD06-027','enemy'); const used=A.aiActivate(s.base); drainTasks();
  ok('#19 AI: rests Axis and the (Neo Zeon) Unit arrives, a weaker Unit making room', used && s.field.includes(gz) && s.field.length===6, `used=${used} onField=${s.field.includes(gz)} n=${s.field.length}`); }

// #20 — GFreD: nothing at deploy; 2 Resources set active at the end of the turn, only with another (Alphacide) Unit
fresh('player'); { const s=G.player; s.resAvail=5; const gf=put('GD06-051','player'); A.runTrigger(gf, s, A.parseTrigger(gf.effect,'Deploy'), 'Deploy');
  const a=s.resAvail; A.finishEndPhase(); drainTasks();
  ok('#20 GFreD alone: no Resources set active (deploy or end of turn)', a===5, 'resAvail='+a); }
fresh('player'); { const s=G.player; s.resAvail=5; put('GD06-017','player'); const gf=put('GD06-051','player'); A.runTrigger(gf, s, A.parseTrigger(gf.effect,'Deploy'), 'Deploy');
  const a=s.resAvail; G.endStepDone=false; A.finishEndPhase();
  ok('#20 GFreD with another (Alphacide) Unit: 2 Resources set active at the end of the turn, not at deploy', a===5 && s.resAvail===7, `deploy=${a} end=${s.resAvail}`); drainTasks(); }

// #22 — Shadow Gundam only uses the paired card's 【Action】
fresh('player'); { const u=stick('player',3,3); u.pilotCard=card('GD05-097','player');            // Domon Kasshu: 【Burst】/【When Paired】 only
  const a=A.pilotActionAction(u); u.pilotCard=card('GD01-097','player');                             // Guel Jeturk: 【Activate･Main】 only
  const b=A.pilotActionAction(u); const cmdPilot=card('GD05-110','player'); u.pilotCard={ name:'Domon', srcEffect:cmdPilot.effect }; // Darkness Finger as a Pilot: 【Main】/【Action】
  const c=A.pilotActionAction(u);
  ok('#22 Shadow Gundam: nothing from a card with no 【Action】; a 【Main】/【Action】 card gives its effect', a===null && b===null && c && c.kind==='damage', `a=${JSON.stringify(a)} b=${JSON.stringify(b)} c=${c&&c.kind}`); }

// #23 — GP02A's 【Destroyed】 dig puts the other cards into the trash
fresh('enemy'); { const s=G.enemy; const gp=card('GD06-049','enemy'); s.deck.push(card('ST03-007','enemy'), card('GD06-060','enemy'), card('ST03-007','enemy'));
  const d0=s.deck.length, t0=s.trash.length, h0=s.hand.length;
  A.runTrigger(gp, s, A.parseTrigger(gp.effect,'Destroyed'), 'Destroyed');
  ok('#23 GP02A: deck -3, the (Delaz Fleet) card to hand, the other 2 to the trash', s.deck.length===d0-3 && s.hand.length===h0+1 && s.trash.length===t0+2, `deck ${d0}->${s.deck.length} hand ${h0}->${s.hand.length} trash ${t0}->${s.trash.length}`); }

// #24 — "(Zeon) Unit cards in your trash" doesn't count (Neo Zeon)
fresh('enemy'); { const s=G.enemy; for(let i=0;i<10;i++) s.trash.push(card('ST03-001','enemy'));
  const nz=A.condMet({type:'trashUnits', trait:'zeon', min:10}, s); s.trash=[]; for(let i=0;i<10;i++) s.trash.push(card('ST03-007','enemy'));
  ok('#24 ten (Neo Zeon) Units are not ten (Zeon) Units', !nz && A.condMet({type:'trashUnits', trait:'zeon', min:10}, s)); }

// extra — 5th Luna's [Axis] Base token goes to the base section; name aliases count for Links
fresh('player'); { const s=G.player; s.base=null; A.runTrigger(card('GD06-129','player'), s, A.parseTrigger(card('GD06-129','player').effect,'Destroyed'), 'Destroyed');
  ok('5th Luna: the [Axis] token is a Base (base section, not the battle area)', s.base && s.base.type==='base' && s.base.name==='Axis' && s.base.hp===5 && !s.field.some(u=>u.name==='Axis')); }
fresh('player'); { const u=stick('player',3,3,{link:['Zechs Merquise']}); const m=card('ST12-011','player');
  ok('Milliardo Peacecraft satisfies a [Zechs Merquise] Link', A.linkMatches(u, m)); }

// extra — a Base destroyed by an attack fires its own 【Destroyed】 (5th Luna → [Axis] Base token), for both players
for (const who of ['player','enemy']){ fresh(who==='player'?'enemy':'player'); const s=G[who]; s.base=card('GD06-129', who); s.base.rested=false;
  const atk=stick(who==='player'?'enemy':'player',5,5); A.strikePlayer(atk, s, ()=>{}); drainTasks();
  ok(`5th Luna destroyed by an attack (${who}) leaves an [Axis] Base token`, s.base && s.base.name==='Axis' && s.base.type==='base', 'base='+(s.base&&s.base.name)); }
// extra — Sodon as a Burst on a full battle area: the player picks which Unit makes room for its Funnel
fresh('enemy'); { for(let i=0;i<6;i++) stick('player',1+i,1+i); G.player.shields.push(card('ST13-016','player')); const atk=stick('enemy',3,3);
  A.strikePlayer(atk, G.player, ()=>{}); const asked=modalUp() && /battle area full/.test(el('blockMsg').innerHTML);
  ok('Sodon Burst on a full board asks the player what to trash for the token', asked && G.player.base && G.player.base.name==='Sodon'); }

// ===== second review round =====
// The hand-limit discard can't be cancelled, and nothing more can be played or attacked once the End Phase began
fresh('player'); { for (let i=0;i<12;i++) inHand('ST01-005','player'); const atk=stick('player',3,3); const rep=stick('player',1,3,{repair:1}); rep.hp=1;
  A.endTurn(); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  const hp1=rep.hp; cancel(); el('cancelBtn').fire('click'); drainTasks();
  const stillDiscard=G.mode==='discard'; const n0=G.player.field.length; A.playFromHand(G.player.hand[0].uid, true);
  A.endTurn(); drainTasks();
  ok('round2: Cancel can\'t skip the hand-limit discard; no plays or a second End Step meanwhile', stillDiscard && G.mode==='discard' && G.player.field.length===n0 && rep.hp===hp1 && G.turn==='player', `mode=${G.mode} field ${n0}->${G.player.field.length} hp ${hp1}->${rep.hp}`); }
// Declining an optional 【Attack】 discard ("You may discard 1. If you do…") keeps the attack going
fresh('player'); { const u=put('ST12-005','player'); inHand('ST01-005','player'); inHand('ST01-005','player'); const sh0=G.enemy.shields.length;
  G.selected=u.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  clickBtn(/Discard 1/); const inDiscard=G.mode==='discard'; cancel(); drainTasks(); while(modalUp() && clickBtn(/Pass|Don't/)) drainTasks();
  ok('round2: cancelling an optional 【Attack】 discard still lets the attack break a shield', inDiscard && G.enemy.shields.length===sh0-1 && G.player.hand.length===2, `inDiscard=${inDiscard} shields ${sh0}->${G.enemy.shields.length} hand=${G.player.hand.length}`); }
// <Support> against a Unit: no partial boost for the player; asked when it would destroy the target
fresh('player'); { const a=stick('player',1,3); const sup=stick('player',3,3,{support:1}); const e=stick('enemy',1,5,{rested:true});
  G.selected=a.uid; G.mode='attack-target'; A.fieldClick(e.uid); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('round2: a Support boost that can\'t destroy the Unit isn\'t used', !sup.rested && e.hp===4, `rested=${sup.rested} e=${e.hp}`); }
fresh('player'); { const a=stick('player',1,3); const sup=stick('player',3,3,{support:2}); const e=stick('enemy',1,3,{rested:true});
  G.selected=a.uid; G.mode='attack-target'; A.fieldClick(e.uid); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  const asked=modalUp() && /Support/.test(el('blockMsg').innerHTML); clickBtn(/Rest|Test/); drainTasks();
  ok('round2: the player is asked to use Support when it destroys the target, and it does', asked && sup.rested && !G.enemy.field.includes(e), `asked=${asked} rested=${sup.rested}`); }
// Qubeley Mk-II: the action-step offer only in its own battle; the AI uses it when its Qubeley would die
fresh('enemy'); { const q=put('GD06-018','player',{rested:true}); pair(q,'GD06-097'); stick('player',1,6,{trait:'(Neo Zeon)'}); const a1=stick('enemy',2,2);
  const offeredDirect=A.collectPlayerActions(a1).some(o=>/Qubeley/.test(o.label));
  G.curBattle={atk:a1, def:q}; const offeredOwn=A.collectPlayerActions(a1).some(o=>/Qubeley/.test(o.label));
  ok('round2: Qubeley\'s redirect is offered in its own battle, not in someone else\'s', !offeredDirect && offeredOwn, `direct=${offeredDirect} own=${offeredOwn}`); }
fresh('player'); { const q=put('GD06-018','enemy',{rested:true}); pair(q,'GD06-097'); const nz=stick('enemy',1,6,{trait:'(Neo Zeon)'}); const atk=stick('player',5,5);
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(q.uid); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('round2: the AI redirects the lethal hit on its Qubeley onto its (Neo Zeon) Unit', G.enemy.field.includes(q) && nz.hp===1, `q=${G.enemy.field.includes(q)} nz=${nz.hp}`); }
// A pair-discount Pilot paired onto a non-qualifying Unit asks before it burns an EX Resource
fresh('player'); { put('GD06-020','player'); const plainU=stick('player',2,2); const m=inHand('GD06-086','player'); const s=G.player; s.resMax=3; s.resAvail=1; s.ex=1;
  A.playFromHand(m.uid); drainTasks(); A.fieldClick(plainU.uid);
  const asked=modalUp() && /EX Resource/.test(el('blockMsg').innerHTML); const before=!plainU.pilot;
  clickBtn(/Play/); drainTasks();
  ok('round2: EX confirmation before pairing Mashymre Cello onto a non-qualifying Unit', asked && before && plainU.pilotCard===m, `asked=${asked}`); }
// A full battle area: the deploy cost shown is the cost paid even if the trashed Unit gave the discount
fresh('player'); { const s=G.player; for(let i=0;i<4;i++) stick('player',2,2); const ef1=stick('player',1,1,{trait:'(Earth Federation)'}); stick('player',1,1,{trait:'(Earth Federation)'});
  const j=inHand('GD01-016','player'); s.resAvail=5; const shown=A.effectiveCost(s,j); A.playFromHand(j.uid, true); A.fieldClick(ef1.uid); drainTasks();
  ok('round2: Jegan pays its shown cost after an (Earth Federation) Unit is trashed for room', shown===1 && s.field.includes(j) && s.resAvail===4, `shown=${shown} resAvail=${s.resAvail}`); }
// Battlefield Emotions: places a rested Resource from the resource deck, then sets one active
fresh('player'); { const s=G.player; s.resMax=5; s.resourceDeck=5; s.resAvail=4; const be=inHand('ST14-015','player');
  A.startCommand(be, s.hand.indexOf(be)); drainTasks();
  ok('round2: Battlefield Emotions = ramp 1 (from the resource deck) + ready 1', s.resMax===6 && s.resourceDeck===4 && s.resAvail===1, `resMax=${s.resMax} deck=${s.resourceDeck} avail=${s.resAvail}`); }

// ===== third review round =====
// A conditional token Burst (GFreD GD03-048) on a full board also asks the player what to trash
fresh('enemy'); { for(let i=0;i<6;i++) stick('player',1+i,1+i); G.enemy.shields.length=3; G.player.shields.push(card('GD03-048','player')); const atk=stick('enemy',3,3);
  A.strikePlayer(atk, G.player, ()=>{}); const asked=modalUp() && /battle area full/.test(el('blockMsg').innerHTML);
  ok('round3: GFreD\'s "If … deploy a token" Burst asks which Unit makes room', asked); }
// "All players draw 1" (Armory One's 【Destroyed】) — both players draw
fresh('enemy'); { const s=G.player; s.base=card('GD04-128','player'); s.base.hp=1; const atk=stick('enemy',5,5); const h0=[G.player.hand.length, G.enemy.hand.length];
  A.strikePlayer(atk, s, ()=>{}); drainTasks();
  ok('round3: Armory One destroyed — all players draw 1', G.player.hand.length===h0[0]+1 && G.enemy.hand.length===h0[1]+1, `${h0} -> ${G.player.hand.length},${G.enemy.hand.length}`); }
// Two of the player's 【Destroyed】 choices from one hit (a Unit, then the Base via <Breach>) both get resolved
fresh('enemy'); { const cb=put('GD06-045','player',{rested:true}); const s=G.player; s.base=card('GD02-126','player'); s.base.hp=1;
  const atk=stick('enemy',4,6,{breach:1, lv:3}); const x=stick('enemy',2,3,{lv:2}); const y=stick('enemy',2,3,{lv:3});
  A.battle(atk, cb, G.enemy, G.player); drainTasks();
  const first=modalUp(); clickBtn(new RegExp(x.name.replace(/[#/]/g,'.'))); drainTasks();
  const second=modalUp(); clickBtn(new RegExp(y.name.replace(/[#/]/g,'.'))); drainTasks();
  ok('round3: the Unit\'s and the Base\'s 【Destroyed】 prompts both resolve, one after the other', first && second && x.hp===2 && y.hp===2, `first=${first} second=${second} x=${x.hp} y=${y.hp}`); }
// The AI won't trash a paired Unit (Unit + Pilot) for a weaker reanimate / Axis deploy
fresh('enemy'); { const s=G.enemy; const p=stick('enemy',1,2); p.pilotCard=card('GD05-097','enemy'); p.pilot={name:'Domon',pAp:2,pHp:1}; for(let i=0;i<5;i++) stick('enemy',4,4);
  s.trash.push(card('ST01-009','enemy')); A.reanimate(card('GD04-050','enemy'), s, {kind:'reanimate', filter:'unit', maxLv:null}, null); drainTasks();
  ok('round3: AI declines a reanimate that would trash its paired Unit for less', s.field.includes(p) && s.resAvail===10); }
// Shadow Gundam + Master Asia: the 【Main】/【Action】 inside Master Asia's sentence isn't an 【Action】 ability
fresh('player'); { const u=stick('player',3,3); u.pilotCard=card('GD05-089','player');
  ok('round3: Master Asia gives Shadow Gundam no 【Action】', A.pilotActionAction(u)===null); }
// The AI's "Choose 1 damaged enemy Unit" Commands only target a damaged Unit
fresh('enemy'); { const ai=G.enemy; inHand('GD06-113','enemy'); const u=stick('player',4,5); A.aiMainStep(); drainTasks();
  const a=u.hp===5 && ai.hand.length===1; const d=stick('player',3,5); d.hp=3; A.aiMainStep(); drainTasks();
  ok('round3: AI plays Unsanctioned Ordnance only on a damaged Unit', a && u.hp===5 && !G.player.field.includes(d), `a=${a} u=${u.hp}`); }
// Hamma-Hamma doesn't heal off a Command's kill (stale effect source)
fresh('enemy'); { const hh=put('GD06-020','enemy'); hh.hp=2; G.effSrc=stick('enemy',1,3,{trait:'(Neo Zeon)'}); inHand('ST03-013','enemy'); stick('player',2,2); A.aiMainStep(); drainTasks();
  ok('round3: a Command\'s kill doesn\'t count as a (Neo Zeon) Unit\'s for Hamma-Hamma', hh.hp===2, 'hp='+hh.hp); }
// Guel Jeturk under the opponent's paired Reginlaze Julia isn't offered (it couldn't do anything)
fresh('player'); { const j=put('GD06-037','enemy'); pair(j,'ST01-010'); const u=stick('player',3,3,{rested:true}); pair(u,'GD01-097'); for(let i=0;i<8;i++) G.enemy.hand.push(card('ST01-005','enemy'));
  ok('round3: Guel Jeturk isn\'t offered while Julia stops set-active effects', !A.activateReadyAny(u)); }

// An End Phase whose hand-limit discard got dropped is resumed by End Turn, never wedged and never re-run
fresh('player'); { for (let i=0;i<12;i++) inHand('ST01-005','player'); const rep=stick('player',1,3,{repair:1}); rep.hp=1;
  A.endTurn(); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  const hp1=rep.hp; G.mode='idle'; G.pending=null;          // the discard lost (simulated)
  A.endTurn(); const reAsked=G.mode==='discard' && G.pending && G.pending.discardLeft===2;
  for (let k=0;k<2 && G.mode==='discard';k++){ const c=G.player.hand[0]; G.player.hand.splice(0,1); A.sendToTrash(c,G.player); G.pending.discardLeft--; if (G.pending.discardLeft<=0){ const af=G.pending.after; G.mode='idle'; G.pending=null; af(); } }
  ok('extra: End Turn resumes an interrupted hand step (no wedge, Repair not re-applied)', reAsked && G.turn==='enemy' && rep.hp===hp1 && G.player.hand.length===10, `reAsked=${reAsked} turn=${G.turn} hp ${hp1}->${rep.hp}`); drainTasks(); }

// ===== fourth review round =====
// An AoE that destroys one Unit keeps resolving as itself: Acguy still protects the later (Marine) Units
fresh('enemy'); { put('ST11-002','player',{rested:true}); const w=stick('player',1,1); const m1=stick('player',1,2,{trait:'(Marine)'}); const m2=stick('player',1,1,{trait:'(Marine)'});
  G.player.field=[w, ...G.player.field.filter(x=>x!==w)];   // the unprotected 1/1 is hit first
  const ara=inHand('GD02-107','enemy'); A.damageAll(ara, G.enemy, ara.action, ara.name); drainTasks();
  ok('round4: after the AoE destroys one Unit, Acguy still shields the (Marine) Units', !G.player.field.includes(w) && m1.hp===2 && m2.hp===1, `m1=${m1.hp} m2=${m2.hp}`); }
// The AI doesn't play an 【Action】-only Command in its main phase; "battling a friendly (AEUG) Unit" is a real limit
fresh('enemy'); { inHand('GD06-112','enemy'); const u=stick('player',3,2); const done=A.aiMainStep(); drainTasks();
  ok('round4: AI keeps Rivalry with Roux (【Action】 only) in its main phase', G.player.field.includes(u) && G.enemy.hand.length===1, 'played='+done); }
fresh('player'); { const roux=card('GD06-112','player'); const e=stick('enemy',3,3); const mine=stick('player',2,2,{trait:'(AEUG)'}); const other=stick('player',2,2);
  const out=A.enemyTargets(G.enemy, roux.action).length; G.curBattle={ atk:e, def:other }; const notAeug=A.enemyTargets(G.enemy, roux.action).length;
  G.curBattle={ atk:e, def:mine }; const aeug=A.enemyTargets(G.enemy, roux.action).includes(e);
  ok('round4: Rivalry with Roux only targets an enemy battling a friendly (AEUG) Unit', out===0 && notAeug===0 && aeug, `${out},${notAeug},${aeug}`); }
// AoE filters, and the AI weighs its own losses on an "all Units" Command
fresh('player'); { const sa=card('GD01-108','player'); const b=stick('enemy',1,2,{blocker:true}); const nb=stick('enemy',1,2); A.damageAll(sa, G.player, sa.action, sa.name);
  ok('round4: Strategic Arms only hits Units with <Blocker>', !G.enemy.field.includes(b) && nb.hp===2); }
fresh('player'); { const ara=card('GD02-107','player'); const l=stick('enemy',3,1,{linked:true}); const n=stick('enemy',3,1); A.damageAll(ara, G.player, ara.action, ara.name);
  ok('round4: All-Range Attack skips Link Units', G.enemy.field.includes(l) && !G.enemy.field.includes(n)); }
fresh('enemy'); { inHand('GD04-112','enemy'); for(let i=0;i<4;i++) stick('enemy',3,1,{lv:2}); stick('player',1,1,{lv:1}); stick('player',1,1,{lv:1}); A.aiMainStep(); drainTasks();
  ok('round4: AI won\'t trade four of its Units for two with Inspector', G.enemy.field.length===4 && G.enemy.hand.length===1, `ai=${G.enemy.field.length}`); }
// Two of the player's 【Destroyed】 choices from one AoE both resolve
fresh('enemy'); { const g1=put('GD01-056','player'); const g2=put('GD01-056','player'); g1.hp=1; g2.hp=1; const x=stick('enemy',2,3); const y=stick('enemy',2,3);
  const ara=inHand('GD02-107','enemy'); A.damageAll(ara, G.enemy, ara.action, ara.name); drainTasks();
  const p1=modalUp(); clickBtn(new RegExp(x.name.replace(/[#/]/g,'.'))); drainTasks(); const p2=modalUp(); clickBtn(new RegExp(y.name.replace(/[#/]/g,'.'))); drainTasks();
  ok('round4: both Geara Doga (Sleeves) 【Destroyed】 choices resolve', p1 && p2 && x.hp===2 && y.hp===2, `p1=${p1} p2=${p2} x=${x.hp} y=${y.hp}`); }
// <Support> is used before the attack is declared, so the AI's block step / redirect see the boosted AP
fresh('player'); { const q=put('GD06-018','enemy',{rested:true}); pair(q,'GD06-097'); const nz=stick('enemy',1,8,{trait:'(Neo Zeon)'}); const a=stick('player',2,9); stick('player',1,1,{support:2});
  G.selected=a.uid; G.mode='attack-target'; A.fieldClick(q.uid); clickBtn(/Test/); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('round4: with Support taken before the attack, the AI\'s Qubeley redirects the lethal hit', G.enemy.field.includes(q) && nz.hp===4, `q=${G.enemy.field.includes(q)} nz=${nz.hp}`); }
fresh('enemy'); { const atk=stick('enemy',3,5); stick('enemy',1,3,{support:2}); const t=stick('player',2,4,{rested:true}); const blk=stick('player',2,4,{blocker:true});
  A.resolveAiAttackInner(atk, ()=>{}, t); const apAtBlock=A.effAp(atk); drainTasks();
  ok('round4: the AI uses Support before declaring (the block step sees AP 5)', apAtBlock===5, 'AP at block='+apAtBlock); while(modalUp() && clickBtn(/Don't|Pass/)) drainTasks(); }
// The AI's own Qubeley Mk-II attacks and is blocked by a lethal Unit: it redirects
fresh('enemy'); { const q=put('GD06-018','enemy'); pair(q,'GD06-097'); q.sick=false; const nz=stick('enemy',1,9,{trait:'(Neo Zeon)'}); const t=stick('player',1,1,{rested:true}); const blk=stick('player',5,6,{blocker:true});
  A.resolveAiAttackInner(q, ()=>{}, t); drainTasks(); clickBtn(new RegExp(blk.name.replace(/[#/]/g,'.'))); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('round4: the AI\'s attacking Qubeley redirects a lethal block', G.enemy.field.includes(q) && nz.hp===4, `q=${G.enemy.field.includes(q)} nz=${nz.hp}`); }
// Escape on the AI's turn doesn't end the AI's battle
fresh('enemy'); { const atk=stick('enemy',3,3); G.curAttack=atk; G.curBattle={atk, def:null}; A.G.mode='idle';
    ok('round4: (setup) cancelAction exported', typeof A.cancelAction==='function');
  if (A.cancelAction) A.cancelAction();
  ok('round4: Escape/Cancel on the AI\'s turn keeps the battle in progress', G.curAttack===atk && G.curBattle && G.curBattle.atk===atk); }

// ===== Harsh Meta Slave Deck cards (user reports) =====
// ZZ Gundam: "When your (AEUG) cards deal damage to enemy Units, increase the damage dealt by 1."
fresh('player'); { put('GD06-033','player'); const ct=put('GD06-044','player'); const plain=stick('player',1,1,{trait:'(Zeon)'}); const e1=stick('enemy',1,9,{rested:true}); const e2=stick('enemy',1,9);
  G.effSrc=ct; A.applyToTarget(ct, G.player, {kind:'damage', amount:1}, e1, 'Test'); const eff=9-e1.hp;
  G.effSrc=plain; A.applyToTarget(plain, G.player, {kind:'damage', amount:1}, e2, 'Test'); const nonAeug=9-e2.hp;
  const e3=stick('enemy',1,9,{rested:true}); G.selected=ct.uid; G.mode='attack-target'; A.fieldClick(e3.uid); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  ok('ZZ Gundam: +1 to (AEUG) effect and battle damage to enemy Units, not to other cards', eff===2 && nonAeug===1 && 9-e3.hp===A.effAp(ct)+1, `eff=${eff} non=${nonAeug} battle=${9-e3.hp}`); }
fresh('player'); { const zz=inHand('GD06-033','player'); const e=stick('enemy',1,9); G.player.resAvail=10; G.player.resMax=10; A.playFromHand(zz.uid, true); drainTasks();
  ok('ZZ Gundam: its own 【Deploy】 2 damage to all enemy Units becomes 3', e.hp===6, 'hp='+e.hp); }
// Judau Ashta: 【During Link】【Destroyed】 fetch a Lv.2-or-lower (Gundam Team) Unit — including in the Neo Core Fighter combo
fresh('player'); { const ncf=put('GD06-039','player'), top=put('GD06-044','player'); put('GD06-045','player'); pair(top,'GD06-088'); inHand('GD06-033','player');
  A.startActivate(ncf); drainTasks(); let g=0; while (G.mode==='activate-cost' && g++<5){ const c=G.activateCands.find(x=>!(G.activateCostPicked||[]).includes(x)); A.fieldClick(c); drainTasks(); }
  while(modalUp() && g++<10){ el('blockBtns').children[0].onclick(); drainTasks(); }
  ok('Judau Ashta: the Neo Core Fighter combo returns Neo Core Fighter to hand', G.player.hand.some(c=>c.name==='Neo Core Fighter') && G.player.field.some(u=>u.name==='ZZ Gundam'), 'hand='+G.player.hand.map(c=>c.name)); }
fresh('enemy'); { const top=put('GD06-044','player'); pair(top,'GD06-088'); G.player.trash.push(card('GD06-033','player')); G.player.trash.push(card('ST01-005','player'));
  G.effSrc=stick('enemy',5,5); A.damage(top, 9, G.player); drainTasks();
  ok('Judau Ashta: only a Lv.2-or-lower (Gundam Team) Unit qualifies (nothing taken here)', G.player.hand.length===0, 'hand='+G.player.hand.map(c=>c.name)); }
// Pilot 【Destroyed】 in general fires when the Unit dies (Soma Peries: an enemy Unit gets AP-3)
fresh('player'); { const u=put('ST01-005','enemy'); pair(u,'GD03-100'); const mine=stick('player',4,4); G.effSrc=mine; A.damage(u, 9, G.enemy); drainTasks();
  ok('Pilot 【Destroyed】 fires with its Unit (Soma Peries gives AP-3)', A.effAp(mine)===1, 'ap='+A.effAp(mine)); }
// Familial Love: 【Action】 only; the player picks the Unit; AP+2 for this battle; draw 1 at 3 or fewer cards
fresh('player'); { const fl=inHand('GD06-110','player'); put('GD06-044','player'); A.playFromHand(fl.uid, true); drainTasks();
  ok('Familial Love can\'t be played in the main phase (【Action】 only)', G.player.hand.includes(fl) && G.player.resAvail===10); }
fresh('enemy'); { const ct=put('GD06-044','player',{rested:true}); const other=stick('player',5,5); inHand('GD06-110','player'); for(let i=0;i<3;i++) inHand('ST01-005','player');
  const e=stick('enemy',1,9); A.resolveAiAttackInner(e, ()=>{}, ct); drainTasks(); clickBtn(/Familial/); drainTasks();
  const asked=modalUp() && btns().length===2 && /Core Top/.test(String(btns()[0].innerHTML||btns()[0].textContent));
  clickBtn(/Core Top/); drainTasks(); const hand=G.player.hand.length;
  while(modalUp() && clickBtn(/Pass/)) drainTasks();
  // Core Top (AP 3) dealt 3+2 in the battle, and the boost ended with it
  ok('Familial Love: you choose the Unit (the battling one first), AP+2 in the battle, then draw at 3 cards', asked && hand===4 && e.hp===9-(A.effAp(ct)+2) && ct.battleAp===0, `asked=${asked} hand=${hand} e=${e.hp} ap=${A.effAp(ct)}`); }
// Rivalry with Roux: 2 damage to the enemy Unit battling your (AEUG) Unit, in the action step
fresh('enemy'); { const rd=put('GD02-079','player',{rested:true}); inHand('GD06-112','player'); const e=stick('enemy',1,9);
  A.resolveAiAttackInner(e, ()=>{}, rd); drainTasks(); clickBtn(/Rivalry/); drainTasks(); while(modalUp() && clickBtn(/Pass/)) drainTasks();
  const logged=(el('log').children||[]).some(c=>/Rivalry with Roux deals 2 to/.test(String(c.innerHTML||'').replace(/<[^>]+>/g,'')));
  ok('Rivalry with Roux deals 2 to the enemy battling your (AEUG) Unit', logged && e.hp===9-2-A.effAp(rd), `hp=${e.hp} logged=${logged}`); }
// Argama (GD06-125): battle damage to the Base with a rested (AEUG) Unit in play → 1 damage to an enemy Unit
fresh('enemy'); { G.player.base=card('GD06-125','player'); put('GD06-044','player',{rested:true}); const e=stick('enemy',2,3); const e2=stick('enemy',3,3);
  A.resolveAiAttackInner(e, ()=>{}, null); drainTasks(); const asked=modalUp() && /Argama/.test(el('blockMsg').innerHTML); clickBtn(new RegExp(e2.name.replace(/[#/]/g,'.'))); drainTasks();
  ok('Argama: triggers on battle damage with a rested (AEUG) Unit', asked && e2.hp===2, `asked=${asked} e2=${e2.hp}`); }

console.log('\n== review regression checks ==');
console.log('passed:', pass, '| failed:', fail.length);
for (const f of fail) console.log('  !', f);
if (H.ERRORS.length){ console.log('Errors:', H.ERRORS.length); for (const e of H.ERRORS.slice(0,10)) console.log('  ', e.phase, e.msg, e.stack); } else console.log('Errors: 0');
