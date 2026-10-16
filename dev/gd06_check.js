// GD06 "Stardust Trails" — per-card checks for the clauses that needed bespoke engine support. Each
// case builds a small board with the real card and asserts the printed effect's outcome.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(turn){
  drainTasks();
  Object.assign(G,{turn:turn||'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true;
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
let UID=700000;
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
function pairWith(u, p){ u.pilot={pAp:p.pAp||0,pHp:p.pHp||0}; u.pilotCard=p; u.ap=A.effAp(u); u.maxHp=A.effMaxHp(u); u.hp=u.maxHp; return u; }
const clickModal=(i)=>{ const b=el('blockBtns').children[i||0]; if(!b) return false; el('blockModal').classList.remove('show'); b.onclick(); return true; };

// GD06-001 Gundam GP01Fb — 【Once per Turn】When this Unit is attacked, draw 1.
fresh(); { const gp=put('GD06-001','player',{rested:true}); const h=G.player.hand.length;
  A.fireAttacked(gp, G.player); A.fireAttacked(gp, G.player);
  ok('GP01Fb draws 1 when attacked, once per turn', G.player.hand.length===h+1, 'hand '+h+'->'+G.player.hand.length); }
fresh('enemy'); { const gp=put('GD06-001','player',{rested:true}); const atk=stick('enemy',1,9); const h=G.player.hand.length;
  A.resolveAiAttackInner(atk, ()=>{}, gp); drainTasks();
  ok('GP01Fb triggers from a real AI attack on it', G.player.hand.length===h+1, 'hand '+h+'->'+G.player.hand.length); }
// GD06-002 Infinite Justice — destroys an enemy CARD with battle damage → an (Orb) Unit recovers 3 (once per turn)
fresh(); { const ij=put('GD06-002','player'); ij.hp=1; const d=stick('enemy',0,1,{rested:true});
  A.battle(ij, d, G.player, G.enemy); drainTasks();
  ok('Infinite Justice: an (Orb) Unit recovers 3 HP after a battle kill', ij.hp===4, 'hp='+ij.hp); }
fresh(); { const ij=put('GD06-002','player'); ij.hp=1; A.strikePlayer(ij, G.enemy, ()=>{}); drainTasks();
  ok('Infinite Justice: destroying a Shield counts as an enemy card', ij.hp===4, 'hp='+ij.hp);
  ij.hp=1; A.strikePlayer(ij, G.enemy, ()=>{}); drainTasks();
  ok('Infinite Justice: only once per turn', ij.hp===1, 'hp='+ij.hp); }
// GD06-035 Zeta Gundam — on battle kill, deal 2 to an enemy Unit with 3 or less AP (once per turn)
fresh(); { const z=put('GD06-035','player'); const d=stick('enemy',1,1,{rested:true}); const big=stick('enemy',4,5); const small=stick('enemy',3,5);
  A.battle(z, d, G.player, G.enemy); drainTasks();
  ok('Zeta: 2 damage to a 3-or-less-AP enemy Unit after a kill', small.hp===3 && big.hp===5, 'small='+small.hp+' big='+big.hp); }
// GD06-020 Hamma-Hamma — when one of your (Neo Zeon) Units destroys an enemy card with damage, recover 1
fresh(); { const hh=put('GD06-020','player'); hh.hp=2; const nz=stick('player',3,3,{trait:'(Neo Zeon)'}); const d=stick('enemy',1,1,{rested:true});
  A.battle(nz, d, G.player, G.enemy); drainTasks();
  ok('Hamma-Hamma recovers 1 when a (Neo Zeon) Unit destroys an enemy card', hh.hp===3, 'hp='+hh.hp);
  const other=stick('player',3,3); const d2=stick('enemy',1,1,{rested:true}); A.battle(other, d2, G.player, G.enemy); drainTasks();
  ok('Hamma-Hamma ignores kills by non-(Neo Zeon) Units', hh.hp===3, 'hp='+hh.hp); }
// GD06-021 Turn X (Top) — 【Deploy】copy one of your Unit tokens (rested)
fresh(); { const tk=A.makeToken({name:'Zaku Token',ap:2,hp:2},'player'); tk.rested=false; G.player.field.push(tk); const tx=put('GD06-021','player');
  A.runTrigger(tx, G.player, null, 'Deploy'); drainTasks();
  const copies=G.player.field.filter(u=>u.token && u.name==='Zaku Token');
  ok('Turn X deploys a rested copy of a Unit token', copies.length===2 && copies.some(u=>u.rested), 'copies='+copies.length); }
// GD06-022 Merrybell's Bandit — 【When Linked】damage-step-only battle vs an enemy Unit with 3 or less AP
fresh(); { const mb=put('GD06-022','player'); const d=stick('enemy',3,3); const tough=stick('enemy',4,4);
  A.runTrigger(mb, G.player, null, 'When Linked'); drainTasks();
  ok("Merrybell's Bandit duels a 3-AP enemy (it dies, Bandit takes 3)", !G.enemy.field.includes(d) && mb.hp===1 && tough.hp===4, 'd on field='+G.enemy.field.includes(d)+' mb hp='+mb.hp); }
// GD06-030 Mahiroo — AP+2 while 3+ other (Ghingnham Fleet)/(Long-Range Weapon) Units
fresh(); { const m=put('GD06-030','player'); stick('player',1,1,{trait:'(Ghingnham Fleet)'}); stick('player',1,1,{trait:'(Long-Range Weapon)'});
  const before=A.effAp(m); stick('player',1,1,{trait:'(Ghingnham Fleet)'}); const after=A.effAp(m);
  ok('Mahiroo gets AP+2 with 3 other fleet/long-range Units', before===2 && after===4, before+'->'+after); }
// GD06-037 Reginlaze Julia — <First Strike> while battling a damaged enemy Unit (your turn)
fresh(); { const rj=put('GD06-037','player'); const d=stick('enemy',5,5,{rested:true}); d.hp=3;   // damaged
  A.battle(rj, d, G.player, G.enemy); drainTasks();
  ok('Reginlaze Julia strikes first vs a damaged Unit and takes nothing back', !G.enemy.field.includes(d) && rj.hp===4, 'rj hp='+rj.hp); }
fresh(); { const rj=put('GD06-037','player'); const d=stick('enemy',5,3,{rested:true});   // undamaged
  A.battle(rj, d, G.player, G.enemy); drainTasks();
  ok('Reginlaze Julia has no First Strike vs an undamaged Unit', !G.player.field.includes(rj), 'rj hp='+rj.hp); }
// GD06-039 Neo Core Fighter — destroy 2 Lv.3 (Gundam Team) Units with unique names + itself: deploy a Lv.8+ (Gundam Team) Unit from hand
fresh(); { const ncf=put('GD06-039','player'); const a=stick('player',1,1,{trait:'(Gundam Team)',lv:3,name:'A'}); const b=stick('player',1,1,{trait:'(Gundam Team)',lv:3,name:'B'});
  const zz=A.makeCard(A.CARD_BY_ID.get('GD06-033'),'player'); G.player.hand.push(zz);
  ok('Neo Core Fighter is ready with 2 unique Lv.3 (Gundam Team) Units and ZZ in hand', A.activateReady(ncf)===true);
  A.applyActivateEffect(ncf, null, G.player); drainTasks();
  ok('Neo Core Fighter: the cost Units and itself are destroyed, ZZ Gundam is deployed', G.player.field.includes(zz) && !G.player.field.includes(ncf) && !G.player.field.includes(a) && G.player.trash.includes(a), 'field='+G.player.field.map(u=>u.name).join(',')); }
fresh(); { const ncf=put('GD06-039','player'); stick('player',1,1,{trait:'(Gundam Team)',lv:3,name:'A'}); stick('player',1,1,{trait:'(Gundam Team)',lv:3,name:'A'});
  G.player.hand.push(A.makeCard(A.CARD_BY_ID.get('GD06-033'),'player'));
  ok('Neo Core Fighter needs UNIQUE card names', A.activateReady(ncf)===false); }
// GD06-042 Destroy Gundam (MA Mode) — 【Deploy】look at 4, may pair a (Biological CPU) Pilot among them
fresh(); { const dg=put('GD06-042','enemy'); const p=A.makeCard(A.CARD_BY_ID.get('GD02-087'),'enemy'); G.enemy.deck.push(p); const n=G.enemy.deck.length;
  A.runTrigger(dg, G.enemy, null, 'Deploy'); drainTasks();
  ok('Destroy Gundam pairs a (Biological CPU) Pilot from the top 4', dg.pilotCard===p && G.enemy.deck.length===n-1, 'pilot='+(dg.pilotCard&&dg.pilotCard.name)+' deck '+n+'->'+G.enemy.deck.length); }
// GD06-049 Gundam GP02A — 【When Paired】10+ (Zeon) Unit cards in trash → destroy the enemy Base
fresh(); { const gp=put('GD06-049','player'); G.enemy.base=A.exBaseToken('enemy'); for(let i=0;i<10;i++) G.player.trash.push(A.makeCard(A.CARD_BY_ID.get('ST03-006'),'player'));
  A.runTrigger(gp, G.player, null, 'When Paired'); drainTasks();
  ok('GP02A destroys the enemy Base with 10 (Zeon) Units in the trash', G.enemy.base===null); }
fresh(); { const gp=put('GD06-049','player'); G.enemy.base=A.exBaseToken('enemy'); for(let i=0;i<9;i++) G.player.trash.push(A.makeCard(A.CARD_BY_ID.get('ST03-006'),'player'));
  A.runTrigger(gp, G.player, null, 'When Paired'); drainTasks();
  ok('GP02A does nothing with only 9', G.enemy.base!==null); }
// GD06-050 Legend Gundam — Lv.-3 / cost -3 in the trash while you have a (ZAFT) Link Unit
fresh(); { const lg=A.makeCard(A.CARD_BY_ID.get('GD06-050'),'player'); G.player.trash.push(lg);
  const c0=A.effectiveCost(G.player, lg); stick('player',1,1,{trait:'(ZAFT)',linked:true}); const c1=A.effectiveCost(G.player, lg);
  G.player.resMax=3; G.player.resAvail=3;
  ok('Legend Gundam costs 3 less in the trash with a (ZAFT) Link Unit and needs only Lv.3', c0===5 && c1===2 && A.levelOk(G.player, lg), `cost ${c0}->${c1}`); }
// GD06-051 GFreD — 【Activate･Main】②, rest: deploy an (Alphacide) Unit Lv.5 or lower from the trash
fresh(); { const gf=put('GD06-051','player'); const al=A.makeCard(A.CARD_BY_ID.get('GD06-006'),'player'); const other=A.makeCard(A.CARD_BY_ID.get('ST03-006'),'player'); G.player.trash.push(other, al);
  ok('GFreD is ready', A.activateReady(gf)===true);
  A.applyActivateEffect(gf, null, G.player); drainTasks();
  ok('GFreD pays 2 + rests and deploys the (Alphacide) Unit from the trash', G.player.field.includes(al) && !G.player.field.includes(other) && gf.rested && G.player.resAvail===8, 'res='+G.player.resAvail); }
// GD06-065 SUMO Gold Type — ④: set your (Dianna Counter)/(Militia) <Blocker> Units active; they can't attack this turn
fresh(); { const sg=put('GD06-065','player'); const dc=stick('player',1,1,{trait:'(Dianna Counter)',blocker:true,rested:true}); const mi=stick('player',1,1,{trait:'(Militia)',rested:true}); const o=stick('player',1,1,{trait:'(Zeon)',blocker:true,rested:true});
  ok('SUMO Gold is ready with a rested eligible Blocker', A.activateReady(sg)===true);
  A.applyActivateEffect(sg, null, G.player); drainTasks();
  ok('SUMO Gold readies only the (Dianna Counter)/(Militia) Blockers', !dc.rested && mi.rested && o.rested && G.player.resAvail===6, `dc=${dc.rested} mi=${mi.rested} o=${o.rested} res=${G.player.resAvail}`);
  ok("…and they can't attack this turn", A.trashBlocksAttack(dc, G.player)===true); }
// GD06-066 Shadow Gundam — 【During Link】【Attack】activate the paired card's 【Action】
fresh(); { const sg=put('GD06-066','player',{linked:true}); sg.pilot={pAp:0,pHp:0}; sg.pilotCard={ name:'Cmd', type:'pilot', srcEffect:'【Action】Draw 1.', effect:'', trait:'' };
  const h=G.player.hand.length; A.runTrigger(sg, G.player, A.gatedAttackAction(sg.effect, sg), 'Attack'); drainTasks();
  ok("Shadow Gundam fires the paired Command's 【Action】 when attacking (linked)", G.player.hand.length===h+1, 'hand '+h+'->'+G.player.hand.length);
  sg.linked=false; ok('…but not while unlinked', A.gatedAttackAction(sg.effect, sg)===null); }
// GD06-071 Shining Gundam (Meikyo Shisui) — on a (Special Move) Command: enemy Unit AP-2, this Unit AP+2 (once per turn)
fresh(); { const sm=put('GD06-071','player'); const e=stick('enemy',3,3);
  A.commandPlayed({ name:'Sturm und Drang', type:'command', trait:'(Gundam Fighter) (Special Move) (DG Cells)' }, G.player);
  A.commandPlayed({ name:'Sturm und Drang', type:'command', trait:'(Gundam Fighter) (Special Move) (DG Cells)' }, G.player);
  ok('Shining (Meikyo Shisui): enemy AP-2 and self AP+2 on a (Special Move) Command, once per turn', A.effAp(e)===1 && A.effAp(sm)===6, `e=${A.effAp(e)} self=${A.effAp(sm)}`);
  A.commandPlayed({ name:'Plain', type:'command', trait:'' }, G.player);
  ok('…and nothing on a Command without the trait', A.effAp(e)===1); }
// GD06-073 Wing Gundam Zero (EW) — 【During Pair】【Once per Turn】destroying a shield-area card: rest an enemy Unit Lv.3 or lower
fresh(); { const wz=put('GD06-073','player'); wz.pilot={pAp:0,pHp:0}; const e=stick('enemy',2,2,{lv:3}); const hi=stick('enemy',2,2,{lv:5});
  A.strikePlayer(wz, G.enemy, ()=>{}); drainTasks();
  ok('Wing Zero EW rests a Lv.3-or-lower enemy Unit after breaking a Shield', e.rested===true && hi.rested===false); }
fresh(); { const wz=put('GD06-073','player'); const e=stick('enemy',2,2,{lv:3}); A.strikePlayer(wz, G.enemy, ()=>{}); drainTasks();
  ok('Wing Zero EW needs a Pilot (【During Pair】)', e.rested===false); }
// GD06-080 Kou Uraki — 【Activate･Action】【Once per Turn】if you drew with an effect this turn: a Unit recovers 2
fresh(); { const u=stick('player',3,5); u.hp=1; const kou=A.makeCard(A.CARD_BY_ID.get('GD06-080'),'player'); A.attachPilot(u, kou, ()=>{}); drainTasks();
  ok('Kou Uraki gives the paired Unit his 【Activate･Action】', !!(u.activate && u.activate.phase==='action'));
  let opts=A.collectPlayerActions(null);
  ok('…not usable before drawing with an effect', !opts.some(o=>o.label.includes('⚡')));
  A.draw(G.player); opts=A.collectPlayerActions(null);
  ok('…usable after an effect draw', opts.some(o=>o.label.includes('⚡')));
  const hp0=u.hp; const o=opts.find(o=>o.label.includes('⚡')); if (o) o.run(()=>{}); drainTasks();
  ok('…and the damaged Unit recovers 2 HP', u.hp===hp0+2, `hp ${hp0}->${u.hp}`); }
// GD06-086 Mashymre Cello / GD06-100 Corin Nander — cost -1 when a qualifying Unit is there to pair with
fresh(); { const m=A.makeCard(A.CARD_BY_ID.get('GD06-086'),'player'); G.player.hand.push(m); const c0=A.effectiveCost(G.player, m);
  put('GD06-020','player'); const c1=A.effectiveCost(G.player, m);   // Hamma-Hamma links with [Mashymre Cello]
  ok('Mashymre Cello costs 1 less with a [Mashymre Cello]-link Unit to pair with', c0===1 && c1===0, `${c0}->${c1}`); }
fresh(); { const c=A.makeCard(A.CARD_BY_ID.get('GD06-100'),'player'); G.player.hand.push(c); const c0=A.effectiveCost(G.player, c);
  put('GD06-065','player'); const c1=A.effectiveCost(G.player, c);   // SUMO Gold: (Dianna Counter) Lv.6
  ok('Corin Nander costs 1 less with a Lv.5+ (Dianna Counter) Unit to pair with', c0===1 && c1===0, `${c0}->${c1}`); }
// GD06-093 Anavel Gato — 【Attack】this battle, damage from an enemy Unit of equal or lower Lv is reduced by 2
fresh(); { const u=put('GD06-049','player'); const gato=A.makeCard(A.CARD_BY_ID.get('GD06-093'),'player'); pairWith(u, gato);
  const d=stick('enemy',4,9,{rested:true, lv:5}); const hp=u.hp; A.declareAttack(u, G.player); A.battle(u, d, G.player, G.enemy); drainTasks();
  ok('Gato: battle damage from a Lv.5 Unit vs a Lv.5 attacker is reduced by 2', u.hp===hp-2, `hp ${hp}->${u.hp}`); }
fresh(); { const u=put('GD06-049','player'); const gato=A.makeCard(A.CARD_BY_ID.get('GD06-093'),'player'); pairWith(u, gato);
  const d=stick('enemy',4,9,{rested:true, lv:6}); const hp=u.hp; A.declareAttack(u, G.player); A.battle(u, d, G.player, G.enemy); drainTasks();
  ok('Gato: no reduction from a higher-Lv Unit', u.hp===hp-4, `hp ${hp}->${u.hp}`); }
// GD06-097 Harry Ord — 【Once per Turn】when this Unit activates <Blocker>, set it as active
fresh(); { const b=stick('player',2,4,{blocker:true}); const harry=A.makeCard(A.CARD_BY_ID.get('GD06-097'),'player'); pairWith(b, harry);
  b.rested=true; A.afterBlockDeclared(b, G.player); const first=!b.rested;
  b.rested=true; A.afterBlockDeclared(b, G.player); const second=!b.rested;
  ok('Harry Ord re-readies the blocker, once per turn', first && !second, `first=${first} second=${second}`); }
// GD06-125 Argama — 【Once per Turn】battle damage to this Base with a rested (AEUG) Unit: deal 1 to an enemy Unit
fresh('enemy'); { const ar=A.makeCard(A.CARD_BY_ID.get('GD06-125'),'player'); ar.rested=false; ar.sick=false; G.player.base=ar; stick('player',1,1,{trait:'(AEUG)',rested:true});
  const atk=stick('enemy',2,5); A.strikePlayer(atk, G.player, ()=>{}); drainTasks();
  ok('Argama deals 1 damage to an enemy Unit after taking battle damage', atk.hp===4 && ar.hp===4, `atk hp=${atk.hp} base hp=${ar.hp}`); }
// GD06-018 Elpeo Ple's Qubeley Mk-II — 【During Pair】【Activate･Action】battle damage it would receive goes to a chosen friendly Unit
fresh('enemy'); { const qm=put('GD06-018','player',{rested:true}); qm.pilot={pAp:0,pHp:0}; const soak=stick('player',1,6,{trait:'(Neo Zeon)'});
  ok('Qubeley Mk-II parses the redirect ability', !!(qm.activate && qm.activate.action.kind==='redirectBattle'));
  A.applyActivateEffect(qm, soak, G.player);
  const atk=stick('enemy',3,3); A.battle(atk, qm, G.enemy, G.player); drainTasks();
  ok('Qubeley Mk-II: the chosen Unit takes the battle damage instead', qm.hp===2 && soak.hp===3 && G.player.field.includes(qm), `qm hp=${qm.hp} soak hp=${soak.hp}`); }
console.log('\n== GD06 card checks ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  ! '+f));
