// Pilot-requirement gates and follow-up clauses: every card printed with 【During Pair･(Trait) / Lv.N or Lower / Lv.N or
// Higher / colour Pilot】 is exercised with a qualifying Pilot and with one that doesn't qualify, plus the "Then, discard 1"
// and "You may discard 1 Unit card. If you do, …" clauses that were dropped before.
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
let UID=950000;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Test ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:1,
    trait:'(Test)', link:[], effect:'', baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false, breach:0, suppression:false,
    support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
const card=(id, who)=>{ const c=A.makeCard(A.CARD_BY_ID.get(id), who); c.sick=false; return c; };
const put=(id, who)=>{ const u=card(id, who); (who==='player'?G.player:G.enemy).field.push(u); return u; };
const pilots=[...A.CARD_BY_ID.values()].filter(d=>d.type==='pilot' && !/-p\d+$/.test(d.id));
// A Pilot card meeting `pred` that isn't a Link Pilot for `unitId` (so a Link never muddies the test).
function pilotWhere(pred, unitId){ const u=unitId && A.CARD_BY_ID.get(unitId); const link=(u&&u.link||'').toLowerCase();
  const d=pilots.find(p=>pred(p) && !(link && p.name.toLowerCase().startsWith(link))); if(!d) throw new Error('no pilot for test'); return d.id; }
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');
const pair=(u, pid)=>{ const p=A.makeCard(A.CARD_BY_ID.get(pid), u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const kill=u=>{ const side=u.owner==='player'?G.player:G.enemy, foe=side===G.player?G.enemy:G.player;
  A.applyToTarget(stick(foe.who,1,1), foe, {kind:'damage', amount:99}, u, 'T'); drainTasks(); };
const hand=(who, ids)=>{ const s=who==='player'?G.player:G.enemy; s.hand=ids.map(id=>A.makeCard(A.CARD_BY_ID.get(id), who)); return s.hand; };

// ---- the requirement parser ----
{ const r=A.pilotReqOf;
  ok('gate parser: (Trait) Pilot', JSON.stringify(r('【During Pair･(Vulture) Pilot】'))==='{"type":"pairedPilotReq","trait":"vulture"}');
  ok('gate parser: Lv.3 or Lower Pilot', JSON.stringify(r('【During Pair･Lv.3 or Lower Pilot】'))==='{"type":"pairedPilotReq","maxLv":3}');
  ok('gate parser: Lv.5 or Higher Pilot', JSON.stringify(r('【During Pair･Lv.5 or Higher Pilot】'))==='{"type":"pairedPilotReq","minLv":5}');
  ok('gate parser: Red Pilot', JSON.stringify(r('【During Pair･Red Pilot】'))==='{"type":"pairedPilotReq","color":"red"}');
  ok('gate parser: plain 【During Pair】 has no requirement', r('【During Pair】')===null); }

// GQuuuuuuX GD02-034 — 【During Pair･Red Pilot】This Unit gets AP+2.
{ const red=pilotWhere(p=>/red/i.test(p.color), 'GD02-034'), blue=pilotWhere(p=>!/red/i.test(p.color), 'GD02-034');
  fresh(); const a=put('GD02-034','player'); const pa=pair(a, red); const apR=A.effAp(a)-a.baseAp-pa.pAp;
  fresh(); const b=put('GD02-034','player'); const pb=pair(b, blue); const apB=A.effAp(b)-b.baseAp-pb.pAp;
  ok('GQuuuuuuX: AP+2 with a red Pilot, not with another colour', apR===2 && apB===0, `red +${apR}, other +${apB}`); }
// Waldfeld's Gaia Gundam GD06-015 — 【During Pair･(Orb) Pilot】This Unit gains <Blocker>.
{ const orb=pilotWhere(p=>hasT(p,'orb'), 'GD06-015'), other=pilotWhere(p=>!hasT(p,'orb'), 'GD06-015');
  fresh(); const a=put('GD06-015','player'); pair(a, orb); fresh(); const b=put('GD06-015','player'); pair(b, other);
  ok("Waldfeld's Gaia Gundam: <Blocker> with an (Orb) Pilot only", A.effBlocker(a) && !A.effBlocker(b), `${A.effBlocker(a)}/${A.effBlocker(b)}`); }
// Providence Gundam GD03-033 — 【During Pair･(ZAFT) Pilot】During your turn, all your (ZAFT) Units get AP+2.
{ const z=pilotWhere(p=>hasT(p,'zaft'), 'GD03-033'), o=pilotWhere(p=>!hasT(p,'zaft'), 'GD03-033');
  fresh('player'); const a=put('GD03-033','player'); pair(a, z); const ally=stick('player',2,2,{trait:'(ZAFT)'}); const withZ=A.effAp(ally);
  fresh('player'); const b=put('GD03-033','player'); pair(b, o); const ally2=stick('player',2,2,{trait:'(ZAFT)'}); const withO=A.effAp(ally2);
  ok('Providence Gundam: (ZAFT) Units get AP+2 with a (ZAFT) Pilot only', withZ===4 && withO===2, `${withZ}/${withO}`); }
// Qubeley GD02-036 — 【During Pair･(Neo Zeon) Pilot】【Attack】Choose 1 damaged enemy Unit. Deal 2 damage to it.
{ const nz=pilotWhere(p=>hasT(p,'neo zeon'), 'GD02-036'), o=pilotWhere(p=>!hasT(p,'neo zeon'), 'GD02-036');
  const act=A.parseTrigger(A.CARD_BY_ID.get('GD02-036').effect,'Attack');
  fresh(); const a=put('GD02-036','player'); pair(a, nz); const yes=A.condMet(act.cond, G.player, a);
  fresh(); const b=put('GD02-036','player'); pair(b, o); const no=A.condMet(act.cond, G.player, b);
  fresh(); const c=put('GD02-036','player'); const none=A.condMet(act.cond, G.player, c);
  ok('Qubeley: its 【Attack】 needs a (Neo Zeon) Pilot', yes && !no && !none, `${yes}/${no}/${none}`); }
// Gundam X GD02-056 — 【During Pair･(Vulture) Pilot】【Destroyed】Choose 1 (Vulture) Unit card that is Lv.5 or higher from your trash. Add it to your hand.
{ const v=pilotWhere(p=>hasT(p,'vulture'), 'GD02-056'), o=pilotWhere(p=>!hasT(p,'vulture'), 'GD02-056');
  const prize=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && hasT(d,'vulture') && d.lv>=5 && !/-p\d/.test(d.id));
  const run=(pid)=>{ fresh('player'); const u=put('GD02-056','enemy'); pair(u, pid); const t=A.makeCard(prize,'enemy'); G.enemy.trash.push(t); kill(u); return G.enemy.hand.includes(t); };
  const a=run(v), b=run(o);
  ok('Gundam X: 【Destroyed】 trash retrieve needs a (Vulture) Pilot', a && !b, `${a}/${b}`); }
// Jamil's Gundam X GD04-058 — 【During Pair･(Vulture) Pilot】【Destroyed】If it is your turn, return this Unit's paired Pilot to its owner's hand.
{ const v=pilotWhere(p=>hasT(p,'vulture'), 'GD04-058'), o=pilotWhere(p=>!hasT(p,'vulture'), 'GD04-058');
  const run=(pid)=>{ fresh('enemy'); const u=put('GD04-058','enemy'); const p=pair(u, pid); kill(u); return G.enemy.hand.includes(p); };
  const a=run(v), b=run(o);
  ok("Jamil's Gundam X: the Pilot returns only if it is a (Vulture) Pilot", a && !b, `${a}/${b}`); }
// Gundam Mk-II (Titans) GD02-003 — 【During Pair･Lv.3 or Lower Pilot】【Destroyed】You may discard 1 Unit card. If you do, return the card paired with this Unit to your hand.
{ const lo=pilotWhere(p=>(p.lv||0)<=3, 'GD02-003'), hi=pilotWhere(p=>(p.lv||0)>=4, 'GD02-003');
  const unitId=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && !/【/.test(d.effect||'')).id, cmdId=[...A.CARD_BY_ID.values()].find(d=>d.type==='command').id;
  const run=(pid, ids)=>{ fresh('player'); const h=[...hand('enemy', ids)]; const u=put('GD02-003','enemy'); const p=pair(u, pid); kill(u);
    return { back:G.enemy.hand.includes(p), unitPaid: h.filter(c=>c.type==='unit').some(c=>G.enemy.trash.includes(c)), cmdPaid: h.filter(c=>c.type==='command').some(c=>G.enemy.trash.includes(c)) }; };
  const a=run(lo, [unitId, cmdId, cmdId]), b=run(lo, [cmdId, cmdId]), c=run(hi, [unitId, cmdId, cmdId]);
  ok('Gundam Mk-II (Titans): a Lv.3-or-lower Pilot returns by discarding a Unit card', a.back && a.unitPaid && !a.cmdPaid, JSON.stringify(a));
  ok('Gundam Mk-II (Titans): no Unit card in hand, no return (a Command can\'t pay)', !b.back && !b.cmdPaid, JSON.stringify(b));
  ok('Gundam Mk-II (Titans): a Lv.4+ Pilot never returns', !c.back && !c.unitPaid, JSON.stringify(c)); }
{ // the player is asked, and may only pick a Unit card
  const lo=pilotWhere(p=>(p.lv||0)<=3, 'GD02-003');
  const unitId=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && !/【/.test(d.effect||'')).id, cmdId=[...A.CARD_BY_ID.values()].find(d=>d.type==='command').id;
  fresh('enemy'); const h=hand('player', [cmdId, unitId]); const u=put('GD02-003','player'); const p=pair(u, lo); kill(u);
  const asked=el('blockModal').classList.contains('show') && /discard 1 Unit card/.test(el('blockMsg').innerHTML);
  const yes=[...el('blockBtns').children].find(b=>/Discard/.test(b.textContent)); if (yes) yes.onclick(); drainTasks();
  const typeOk = G.mode==='discard' && G.pending && G.pending.discardType==='unit';
  ok('Gundam Mk-II (Titans): the player is offered the Unit-card discard', asked && typeOk, `asked=${asked} mode=${G.mode}`); }
// Gundam Airmaster Burst GD04-051 — 【During Pair･(Vulture) Pilot】If there are 7 or more cards in your trash, this Unit may choose an
// active enemy Unit with a keyword effect as its attack target.
{ const v=pilotWhere(p=>hasT(p,'vulture'), 'GD04-051'), o=pilotWhere(p=>!hasT(p,'vulture'), 'GD04-051');
  const run=(pid, trash, kw)=>{ fresh('player'); const u=put('GD04-051','player'); if (pid) pair(u, pid);
    for (let i=0;i<trash;i++) G.player.trash.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'),'player'));
    const t=stick('enemy',2,2, kw?{blocker:true}:{}); return A.canHitActive(u, t); };
  ok('Gundam Airmaster Burst: active keyword Unit with a (Vulture) Pilot and 7 in trash', run(v,7,true));
  ok('Gundam Airmaster Burst: not without a keyword on the target', !run(v,7,false));
  ok('Gundam Airmaster Burst: not with 6 cards in trash', !run(v,6,true));
  ok('Gundam Airmaster Burst: not with a non-(Vulture) Pilot', !run(o,7,true));
  ok('Gundam Airmaster Burst: not unpaired', !run(null,7,true)); }
// Gundam Epyon ST12-001 — 【During Pair･Lv.5 or Higher Pilot】During your turn, when this Unit destroys an enemy Unit with damage, deal 2 damage to all enemy Units with 5 or less AP.
{ const hi=pilotWhere(p=>(p.lv||0)>=5, 'ST12-001'), lo=pilotWhere(p=>(p.lv||0)<=4, 'ST12-001');
  const run=(pid)=>{ fresh('player'); const u=put('ST12-001','player'); if (pid) pair(u, pid); const by=stick('enemy',3,3); A.applyOnKill(u, G.player, u.onKill, u); drainTasks(); return by.hp; };
  const a=run(hi), b=run(lo), c=run(null);
  ok('Gundam Epyon: the on-kill sweep needs a Lv.5-or-higher Pilot', a===1 && b===3 && c===3, `${a}/${b}/${c}`); }
// Psycho Gundam GD02-001 — 【During Pair･(Cyber-Newtype) Pilot】When one of your (Titans) Units destroys an enemy shield area card with damage, this Unit recovers 2 HP.
{ const cn=pilotWhere(p=>hasT(p,'cyber-newtype'), 'GD02-001'), o=pilotWhere(p=>!hasT(p,'cyber-newtype'), 'GD02-001');
  const run=(pid, trait, what)=>{ fresh('player'); const u=put('GD02-001','player'); pair(u, pid); u.hp=Math.max(1, u.hp-3); const h0=u.hp;
    const atk=stick('player',3,3,{trait}); A.enemyCardDestroyed(atk, G.player, what); return u.hp-h0; };
  ok('Psycho Gundam: a (Titans) Unit breaking a Shield heals it 2 with a (Cyber-Newtype) Pilot', run(cn,'(Titans)','shield')===2);
  ok('Psycho Gundam: a Base counts as a shield area card', run(cn,'(Titans)','base')===2);
  ok('Psycho Gundam: an enemy Unit kill does not count', run(cn,'(Titans)','unit')===0);
  ok('Psycho Gundam: a non-(Titans) attacker does not count', run(cn,'(Zeon)','shield')===0);
  ok('Psycho Gundam: not with another Pilot', run(o,'(Titans)','shield')===0); }
// Buster Gundam GD01-046 — 【During Pair･(Coordinator) Pilot】【Once per Turn】When you use this Unit's <Support> to increase a (ZAFT) Unit's AP, set this Unit as active.
{ const co=pilotWhere(p=>hasT(p,'coordinator'), 'GD01-046'), o=pilotWhere(p=>!hasT(p,'coordinator'), 'GD01-046');
  const run=(pid, trait, twice)=>{ fresh('player'); const u=put('GD01-046','player'); pair(u, pid); const atk=stick('player',2,2,{trait});
    A.useSupport(u, atk, G.player); const first=!u.rested; if (twice){ A.useSupport(u, atk, G.player); return [first, !u.rested]; } return first; };
  ok('Buster Gundam: Supporting a (ZAFT) Unit with a (Coordinator) Pilot sets it active', run(co,'(ZAFT)')===true);
  ok('Buster Gundam: once per turn', JSON.stringify(run(co,'(ZAFT)',true))==='[true,false]');
  ok('Buster Gundam: not for a non-(ZAFT) Unit', run(co,'(Earth Federation)')===false);
  ok('Buster Gundam: not with another Pilot', run(o,'(ZAFT)')===false); }
// Gundam Exia (EX) EB01-022 — 【During Pair･(G Generation) Pilot】At the end of your turn, you may destroy this Unit. If you do, deploy 3 [Gundam Exia] tokens.
{ const gg=pilotWhere(p=>hasT(p,'g generation'), 'EB01-022'), o=pilotWhere(p=>!hasT(p,'g generation'), 'EB01-022');
  const run=(pid)=>{ fresh('enemy'); const u=put('EB01-022','enemy'); pair(u, pid); let resumed=false; A.endTurnChoices(G.enemy, ()=>{ resumed=true; }); drainTasks();
    return { gone:!G.enemy.field.includes(u), tokens:G.enemy.field.filter(x=>x.token && /exia/i.test(x.name)).length }; };
  const a=run(gg), b=run(o);
  ok('Gundam Exia (EX): with a (G Generation) Pilot it becomes 3 Gundam Exia tokens at the end of turn', a.gone && a.tokens===3, JSON.stringify(a));
  ok('Gundam Exia (EX): not with another Pilot', !b.gone && b.tokens===0, JSON.stringify(b));
  fresh('player'); const u=put('EB01-022','player'); pair(u, gg); let resumed=false; const waiting=A.endTurnChoices(G.player, ()=>{ resumed=true; });
  const asked=el('blockModal').classList.contains('show') && /destroy it to deploy 3/.test(el('blockMsg').innerHTML);
  const keep=[...el('blockBtns').children].find(b=>/Keep/.test(b.textContent)); if (keep) keep.onclick(); drainTasks();
  ok('Gundam Exia (EX): the player chooses; keeping it resumes the end phase', waiting && asked && resumed && G.player.field.includes(u), `${waiting}/${asked}/${resumed}`); }
// Gundam Psycho / plain 【During Pair】 statics still work with any Pilot (regression)
{ const anyP=pilots[0].id; fresh(); const c=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && /^【During Pair】This Unit gets AP\+\d/.test(A.plain(d.effect||'')) && !/-p\d/.test(d.id));
  if (c){ const u=put(c.id,'player'); const p=pair(u, anyP); ok(`plain 【During Pair】 AP bonus still applies with any Pilot (${c.id})`, A.effAp(u)-u.baseAp-p.pAp>0); } }

// ---- "Then, discard 1." after returning the Pilot ----
// Unicorn Gundam (Unicorn Mode) GD01-005 — 【During Link】【Destroyed】Return this Unit's paired Pilot to its owner's hand. Then, discard 1.
{ fresh('player'); hand('enemy', ['ST01-001','ST01-002']); const u=put('GD01-005','enemy'); const p=pair(u,'GD01-088'); const h0=G.enemy.hand.length; kill(u);
  ok('Unicorn Gundam: the Link Pilot returns, then 1 card is discarded (AI)', G.enemy.hand.includes(p) && G.enemy.hand.length===h0, `hand ${h0}->${G.enemy.hand.length}`); }
{ fresh('enemy'); hand('player', ['ST01-001','ST01-002']); const u=put('GD01-005','player'); const p=pair(u,'GD01-088'); kill(u);
  ok('Unicorn Gundam: the player chooses the discard', G.player.hand.includes(p) && G.mode==='discard' && G.pending && G.pending.discardLeft===1, `mode=${G.mode}`); }
// Gundam GP01 GD06-004 — 【During Link】【Destroyed】If it is your turn, return this Unit's paired Pilot to its owner's hand. Then, discard 1.
{ const gp=A.CARD_BY_ID.get('GD06-004'); const link=pilots.find(p=>A.linkMatches(A.makeCard(gp,'enemy'), A.makeCard(p,'enemy')));
  if (link){ fresh('enemy'); hand('enemy', ['ST01-001','ST01-002']); const u=put('GD06-004','enemy'); const p=pair(u, link.id); const h0=G.enemy.hand.length; kill(u);
    ok('Gundam GP01: on your turn the Link Pilot returns, then 1 is discarded', G.enemy.hand.includes(p) && G.enemy.hand.length===h0, `hand ${h0}->${G.enemy.hand.length}`);
    fresh('player'); hand('enemy', ['ST01-001']); const v=put('GD06-004','enemy'); const q=pair(v, link.id); kill(v);
    ok("Gundam GP01: not on the opponent's turn", !G.enemy.hand.includes(q) && G.enemy.hand.length===1); }
  else ok('Gundam GP01: a Link Pilot exists for the test', false); }

// ---- "Enemy Units choose this rested Unit as their attack target if possible when attacking." ----
// Gundam AGE-2 Normal GD03-019 (【During Pair】) and Kayra Su GD05-086 (a Pilot's 【During Link】, "other than Link Units")
{ const anyP=pilotWhere(p=>true, 'GD03-019');
  fresh('enemy'); const a=put('GD03-019','player'); pair(a, anyP); a.rested=true; const other=stick('player',1,1,{rested:true}); const atk=stick('enemy',3,3);
  const L=A.lureTargets(atk, G.player);
  ok('AGE-2 Normal (paired, rested) must be attacked if possible', L.length===1 && L[0]===a);
  a.rested=false; ok('AGE-2 Normal: not while active', !A.lureTargets(atk, G.player).length);
  fresh('enemy'); const b=put('GD03-019','player'); b.rested=true; stick('player',1,1,{rested:true}); ok('AGE-2 Normal: not while unpaired', !A.lureTargets(stick('enemy',3,3), G.player).length);
  // the player's attack is refused on another target
  fresh('player'); const c=put('GD03-019','enemy'); pair(c, anyP); c.rested=true; const o=stick('enemy',1,1,{rested:true}); const me=stick('player',3,3);
  G.mode='attack-target'; G.selected=me.uid; A.fieldClick(o.uid); drainTasks();
  ok("AGE-2 Normal: the player can't attack another rested Unit instead", !me.rested && G.enemy.field.includes(o) && o.hp===1, `rested=${me.rested}`); }
{ const kayra=A.CARD_BY_ID.get('GD05-086'); const host=[...A.CARD_BY_ID.values()].find(u=>u.type==='unit' && !/-p\d/.test(u.id) && A.linkMatches(A.makeCard(u,'player'), A.makeCard(kayra,'player')));
  fresh('enemy'); const u=put(host.id,'player'); pair(u,'GD05-086'); u.rested=true; stick('player',1,1,{rested:true});
  const plainAtk=stick('enemy',3,3), linkAtk=stick('enemy',3,3,{linked:true});
  ok('Kayra Su (linked, rested): enemy Units must attack it', A.lureTargets(plainAtk, G.player).includes(u));
  ok('Kayra Su: Link Units are exempt', !A.lureTargets(linkAtk, G.player).length);
  fresh('enemy'); const v=stick('player',2,2); pair(v,'GD05-086'); v.rested=true; ok('Kayra Su: not unless linked', !A.lureTargets(stick('enemy',3,3), G.player).length); }
// Asemu Asuno GD03-088 — 【During Link】If this is an (AGE System) Unit, it gets AP+1 and <Breach 1>.
{ fresh(); const age=put('GD03-019','player'); const p=pair(age,'GD03-088'); 
  ok('Asemu Asuno: a linked (AGE System) Unit gets AP+1 and <Breach 1>', age.linked && A.effAp(age)===age.baseAp+p.pAp+1 && A.effBreach(age)===1, `AP ${A.effAp(age)} breach ${A.effBreach(age)}`);
  fresh(); const loto=put('GD01-011','player'); const q=pair(loto,'GD03-088');
  ok('Asemu Asuno: a linked non-(AGE System) Unit gets neither', loto.linked && A.effAp(loto)===loto.baseAp+q.pAp && A.effBreach(loto)===0, `AP ${A.effAp(loto)} breach ${A.effBreach(loto)}`); }

console.log('== pilot-requirement gates and follow-up clauses ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
