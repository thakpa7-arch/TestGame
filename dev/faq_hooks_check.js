// Official Q&A checks (group "hooks"): paying a cost to deploy from the trash is paying for a Unit's effect (Q286/Q297/Q400),
// Gundam Calibarn's EX-exiled timing and stacking (Q349/Q484), a Link Unit losing its Pilot on its deploy turn (Q249), effect
// damage isn't "destroyed by an effect" (Q368), 【Destroyed】 conditions read the last-known state (Q340/Q432), <Support> copies
// add up (Q58), and a Pilot-conditional keyword ends when the Pilot leaves (Waldfeld's Gaia Gundam).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=990000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy;
const other=w=>w==='player'?'enemy':'player';
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const txt=n=>String(n.innerHTML||n.textContent||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:txt(el('blockMsg')), btns:[...el('blockBtns').children].map(txt) } : null;
function press(re){ drainTasks(); if(!modal()) return false; const b=[...el('blockBtns').children].find(x=>re.test(txt(x))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ if (!press(/Pass|Don't|No /)) break; } };
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };
function walk(n, f){ f(n); for(const c of (n.children||[])) walk(c,f); }
const overlays=()=>[...(doc.body.children||[])].filter(n=>String(n.className||'').includes('modal-overlay'));
function ovButtons(){ const bs=[]; for (const ov of overlays()) walk(ov, n=>{ if (typeof n.onclick==='function') bs.push(n); }); return bs; }
const ovTxt=b=>String(b._t||b._h||b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'');
// Resolve whatever the player is asked: pick the first card tile of a look-at overlay, answer yes to a yes/no.
function playerAccept(){ let k=0; while (k++<8){ drainTasks();
  if (modal()){ if (!press(/Yes|Deploy|Pay|Recover|Increase|Gets? AP/i)) break; }
  else if (overlays().length){ const t=ovButtons().find(b=>!/Take none|Skip|Don't|Cancel/i.test(ovTxt(b))); if(!t) break; t.onclick(); drainTasks(); }
  else break; } }

// ---------------------------------------------------------------------------------------------------------------------------
// Q286 / Q297 / Q400: paying the cost to deploy a Unit with Gundam X Divider's 【When Linked】 is paying for one of your Units'
// effects — Sochie Heim's Unit gets AP+cost, Willgem recovers 2 HP, Gavane Goonny's (Militia) Unit recovers 2 HP.
function xDivider(w, setup){
  fresh(w); setTrash(w,['ST01-003']);   // Guncannon: cost 2, Lv.3
  const ctx=setup(w); const x=put('GD03-051',w); const p=card('GD03-096',w);
  if (w==='player'){ side(w).hand=[p]; A.playFromHand(p.uid); drainTasks(); if (G.mode==='pilot-target'){ A.fieldClick(x.uid); drainTasks(); } playerAccept(); }
  else { A.attachPilot(x, p); drainTasks(); }
  ctx.deployed=side(w).field.some(u=>u.def==='ST01-003'); ctx.linked=x.linked; return ctx;
}
for (const w of ['player','enemy']){
  const s=xDivider(w, w=>{ const host=put('ST01-001',w); pair(host,'GD04-100'); return { host, ap0:A.effAp(host) }; });
  ok(`Q286 Sochie Heim (${w}): X Divider pays 2 to deploy from the trash -> its Unit gets AP+2`, s.linked && s.deployed && A.effAp(s.host)===s.ap0+2, `linked ${s.linked} deployed ${s.deployed} AP ${s.ap0}->${A.effAp(s.host)}`);
  const v=xDivider(w, w=>{ const b=card('GD04-129',w); b.hp=3; side(w).base=b; return { b }; });
  ok(`Q297 Willgem (${w}): X Divider pays to deploy from the trash -> Willgem recovers 2 HP`, v.deployed && v.b.hp===5, `deployed ${v.deployed} hp ${v.b.hp}`);
  const g=xDivider(w, w=>{ const host=put('GD04-067',w); pair(host,'GD05-101'); host.hp=host.hp-3; return { host, hp0:host.hp }; });
  ok(`Q400 Gavane Goonny (${w}): X Divider pays to deploy from the trash -> its (Militia) Unit recovers 2 HP`, g.deployed && g.host.hp===g.hp0+2, `deployed ${g.deployed} hp ${g.hp0}->${g.host.hp}`);
}
// A paired Pilot's "pay its cost to deploy it" (Desil Galette) is its Unit's effect too; a Command's (Awakened Power) isn't.
for (const w of ['player','enemy']){
  fresh(w); const b=card('GD04-129',w); b.hp=3; side(w).base=b; setTrash(w,['ST01-003']); const host=put('GD02-057',w); const dg=pair(host,'GD02-096');
  b.hp=3; const res0=side(w).resAvail;
  A.reanimate(dg, side(w), { kind:'reanimate', filter:'Unit card', maxLv:4 }, null); playerAccept(); drainTasks();
  ok(`Q297 Willgem (${w}): a paired Pilot's "pay its cost to deploy it" counts as its Unit's effect`, side(w).resAvail===res0-2 && b.hp===5, `res ${res0}->${side(w).resAvail} hp ${b.hp}`);
  fresh(w); const b2=card('GD04-129',w); b2.hp=3; side(w).base=b2; setTrash(w,['ST01-003']); const ap=card('GD02-110',w);
  A.reanimate(ap, side(w), { kind:'reanimate', filter:'Unit card', maxLv:5 }, null); playerAccept(); drainTasks();
  ok(`Q297 Willgem (${w}): a Command's "pay its cost to deploy it" isn't a Unit's effect`, side(w).field.some(u=>u.def==='ST01-003') && b2.hp===3, `hp ${b2.hp}`);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Q349 Gundam Calibarn: the EX-exiled trigger resolves with the paid-for Unit's 【Deploy】 (that Unit can be chosen) / after the
// Command resolves (the token it deployed can be chosen) — not at payment.
{ fresh('player'); G.player.resAvail=3; G.player.ex=1; put('GD05-018','player'); const gouf=card('ST03-009','player'); G.player.hand=[gouf];
  A.playFromHand(gouf.uid, true); drainTasks(); const m=modal();
  ok('Q349 player: a Unit paid with an EX Resource can be chosen by Calibarn (it resolves with that Unit\'s 【Deploy】)', !!m && /EX Resource was exiled/.test(m.msg) && m.btns.some(b=>b.startsWith('Gouf')), JSON.stringify(m));
  press(/^Gouf/); ok('Q349 player: the chosen Unit takes 3 less enemy damage', (gouf.dmgGuards||[]).some(g=>g.amount===3 && g.enemy), JSON.stringify(gouf.dmgGuards)); }
{ fresh('player'); G.player.resAvail=1; G.player.ex=1; put('GD05-018','player'); const c=card('GD03-108','player'); G.player.hand=[c];
  A.playFromHand(c.uid); drainTasks(); press(/use EX/); press(/Command effect/); drainTasks(); const m=modal();
  ok('Q349 player: after a Command paid with an EX Resource resolves, the token it deployed can be chosen', !!m && m.btns.some(b=>/Hy-Gogg/.test(b)) && G.player.field.some(u=>u.token), JSON.stringify(m));
  passAll(); }
{ // a Command cancelled while choosing its target gives the EX Resource back: nothing was exiled, Calibarn doesn't trigger
  fresh('player'); G.player.resAvail=2; G.player.ex=1; put('GD05-018','player'); stick('enemy',2,2); stick('enemy',2,2); const c=card('ST03-013','player'); G.player.hand=[c];
  const isCmd=c.type==='command'; A.playFromHand(c.uid, true); drainTasks(); const inFlight=!!G.cmdInFlight; A.cancelAction(); drainTasks();
  ok('Q349 player: a cancelled Command paid with EX doesn\'t trigger Calibarn', isCmd && inFlight && !modal() && G.player.ex===1 && G.player.hand.includes(c), `cmd ${isCmd} inFlight ${inFlight} modal ${JSON.stringify(modal())} ex ${G.player.ex}`); }
{ // AI: its Calibarn picks when the trigger resolves — the Unit it just deployed is a candidate (it is the most valuable one here)
  fresh('enemy'); G.enemy.resAvail=7; G.enemy.ex=1; const cal=put('GD05-018','enemy'); const big=stick('enemy',9,9,{sick:true}); G.enemy.field.splice(G.enemy.field.indexOf(big),1);
  A.payCost(G.enemy, 7); G.enemy.field.push(big); A.onUnitDeployed(big, G.enemy, null, true);
  const early=(big.dmgGuards||[]).length+(cal.dmgGuards||[]).length; drainTasks();
  ok('Q349 AI: Calibarn resolves after the play, and the just-deployed Unit can be chosen', early===0 && (big.dmgGuards||[]).some(g=>g.amount===3), `early ${early} big ${JSON.stringify(big.dmgGuards)} cal ${JSON.stringify(cal.dmgGuards)}`); }

// Q484: two Calibarns both choosing the same Unit reduce enemy damage by a total of 6.
{ fresh('enemy'); put('GD05-018','player'); put('GD05-018','player'); const u=stick('player',1,9,{rested:true}); G.player.ex=1; G.player.resAvail=1;
  A.payCost(G.player,1); drainTasks(); let k=0;
  while (modal() && /EX Resource was exiled/.test(modal().msg) && k++<4){ [...el('blockBtns').children].find(x=>txt(x).startsWith(u.name)).onclick(); drainTasks(); }
  const atk=stick('enemy',7,9); A.resolveAiAttack(atk, ()=>{}, u); drainTasks(); passAll();
  ok('Q484 player: two Calibarn reductions on one Unit stack (7 damage -> 1)', u.hp===8, `hp ${u.hp} guards ${JSON.stringify(u.dmgGuards)}`); }
{ fresh('player'); const c1=put('GD05-018','enemy'); put('GD05-018','enemy'); G.enemy.ex=1; G.enemy.resAvail=1; A.payCost(G.enemy,1); drainTasks();
  const picked=G.enemy.field.filter(x=>(x.dmgGuards||[]).length); const t=picked[0];
  const hp0=t ? t.hp : 0; const a=stick('player',9,9); if (t){ A.damage(t, 7, G.enemy, 'battle', a); drainTasks(); }
  ok('Q484 AI: both of its Calibarns pick the same Unit and it takes 6 less (7 -> 1)', picked.length===1 && t.dmgGuards.length===2 && t.hp===hp0-1, `picked ${picked.length} hp ${hp0}->${t&&t.hp}`); }
{ // "enemy damage" only: the Unit's own effect damage to itself isn't reduced
  fresh('player'); put('GD05-018','player'); const u=stick('player',1,9); G.player.ex=1; G.player.resAvail=1; A.payCost(G.player,1); drainTasks(); press(new RegExp('^'+u.name.replace(/[#/]/g,'.')));
  G.effSrc=u; A.damage(u, 2, G.player, 'self'); drainTasks();
  ok('Q484: Calibarn reduces enemy damage only (a friendly effect\'s damage is not reduced)', u.hp===7, `hp ${u.hp}`); }

// ---------------------------------------------------------------------------------------------------------------------------
// Q249 Eliminate Target: a Link Unit deployed this turn that loses its Pilot can't attack; one deployed earlier still can.
for (const thisTurn of [true,false]){
  fresh('player'); const u=card('ST01-001','player'); const foe=stick('enemy',1,9,{rested:true});
  if (thisTurn){ G.player.hand=[u]; A.playFromHand(u.uid); drainTasks(); } else { u.sick=false; G.player.field.push(u); }
  pair(u,'ST01-010'); passAll(); const linked=u.linked;
  A.applyCommand(card('GD03-110','enemy'), G.enemy, u); drainTasks();
  A.fieldClick(u.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); const attacked=foe.hp<9 || u.rested; passAll();
  ok(`Q249 player: Link Unit deployed ${thisTurn?'this turn':'earlier'}, Pilot destroyed -> ${thisTurn?"can't":'can'} attack`, linked && !u.pilot && attacked===!thisTurn, `linked ${linked} attacked ${attacked} sick ${u.sick}`);
  fresh('enemy'); const e=card('ST01-001','enemy'); e.sick=thisTurn; G.enemy.field.push(e); pair(e,'ST01-010'); const el2=e.linked, sickLinked=e.sick;
  A.applyCommand(card('GD03-110','player'), G.player, e); drainTasks();
  const atk=(A.planAiAttacks ? (A.planAiAttacks()||[]) : []);
  ok(`Q249 AI: Link Unit deployed ${thisTurn?'this turn':'earlier'}, Pilot destroyed -> ${thisTurn?'not':'still'} able to attack`, el2 && !sickLinked && !e.pilot && e.sick===thisTurn, `linked ${el2} sick ${e.sick}`);
}
{ // a Pilot returned to hand (not destroyed) has the same effect; pairing a new Link Pilot makes it ready again
  fresh('player'); const u=card('ST01-001','player'); G.player.hand=[u]; A.playFromHand(u.uid); drainTasks(); pair(u,'ST01-010'); passAll();
  A.applyCommand(card('GD03-110','enemy'), G.enemy, u); drainTasks(); const s1=u.sick; pair(u,'ST01-010'); passAll();
  ok('Q249: re-linking the Unit lets it attack again', s1===true && u.linked && u.sick===false, `${s1} ${u.linked} ${u.sick}`); }

// ---------------------------------------------------------------------------------------------------------------------------
// Q368 Alpha Azieru: a Unit destroyed by effect damage isn't "destroyed by an effect"; "destroy it" is.
for (const w of ['player','enemy']){
  const foeW=other(w);
  fresh(foeW); put('GD05-054',w); const v=stick(w,1,2); const h0=side(w).hand.length;
  A.applyCommand(card('ST03-013',foeW), side(foeW), v); drainTasks(); passAll();
  ok(`Q368 ${w}: Alpha Azieru doesn't draw when a Unit is destroyed by effect damage`, !side(w).field.includes(v) && side(w).hand.length===h0, `gone ${!side(w).field.includes(v)} hand ${h0}->${side(w).hand.length}`);
  fresh(foeW); put('GD05-054',w); const v2=stick(w,1,2); const h1=side(w).hand.length;
  A.applyCommand(card('ST05-014',foeW), side(foeW), v2); drainTasks(); passAll();
  ok(`Q368 ${w}: Alpha Azieru draws when a Unit is destroyed by a "destroy it" effect`, !side(w).field.includes(v2) && side(w).hand.length===h1+1, `hand ${h1}->${side(w).hand.length}`);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Q340 Waldfeld's Murasame / Q432 Kapool: 【Destroyed】 checks the card's last state — its own Pilot / itself count.
for (const w of ['player','enemy']){
  fresh(other(w)); const s=side(w); const m=put('GD05-003',w); pair(m,'GD05-082'); const hb=s.hand.length;
  A.damage(m, 99, s); drainTasks(); passAll();
  ok(`Q340 ${w}: Murasame destroyed with its (Orb) Pilot and no other -> draw 1`, s.hand.length===hb+1, `${hb}->${s.hand.length}`);
  fresh(other(w)); const k=put('ST11-009',w); const hk=side(w).hand.length; A.damage(k, 99, side(w)); drainTasks(); passAll();
  ok(`Q432 ${w}: Kapool alone destroyed on the opponent's turn -> draw 1`, side(w).hand.length===hk+1, `${hk}->${side(w).hand.length}`);
  fresh(w); const k2=put('ST11-009',w); const hk2=side(w).hand.length; A.damage(k2, 99, side(w)); drainTasks(); passAll();
  ok(`Q432 ${w}: Kapool destroyed on its own turn -> no draw`, side(w).hand.length===hk2, `${hk2}->${side(w).hand.length}`);
  fresh(other(w)); const n=put('GD01-007',w); const hn=side(w).hand.length; A.damage(n, 99, side(w)); drainTasks(); passAll();
  ok(`Q340 control ${w}: "another (OZ) Unit" still doesn't count the destroyed Noin's Aries itself`, side(w).hand.length===hn, `${hn}->${side(w).hand.length}`);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Q58: a Unit with <Support 1> whose Pilot gives it <Support 2> has <Support 3>.
{ fresh('player'); const z=put('GD01-048','player'); pair(z,'GD04-089'); const t=stick('player',1,1);
  ok('Q58: <Support 1> + a Pilot\'s <Support 2> = <Support 3>', A.effSupport(z)===3, A.effSupport(z));
  A.useSupport(z, t, G.player); drainTasks(); ok('Q58: using it gives AP+3', A.effAp(t)===4, A.effAp(t)); }
{ fresh('enemy'); const z=put('GD01-048','enemy'); pair(z,'GD04-089'); ok('Q58 AI: same total for the AI', A.effSupport(z)===3, A.effSupport(z)); }

// ---------------------------------------------------------------------------------------------------------------------------
// Waldfeld's Gaia Gundam GD06-015 (【During Pair･(Orb) Pilot】<Blocker>) and Gundam GP01Fb (【During Pair】<High-Maneuver>): the keyword
// ends when the Pilot leaves; a printed keyword stays.
for (const w of ['player','enemy']){
  fresh(w); const g=put('GD06-015',w); pair(g,'GD05-082'); const on=A.effBlocker(g);
  A.applyCommand(card('GD03-110',other(w)), side(other(w)), g); drainTasks(); passAll();
  ok(`Gaia Gundam (${w}): <Blocker> while paired with an (Orb) Pilot, gone once the Pilot is destroyed`, on && !g.pilot && !A.effBlocker(g), `${on} ${!!g.pilot} ${A.effBlocker(g)}`);
  fresh(w); const s=put('GD06-001',w); pair(s,'GD05-082'); const hm=A.effHighManeuver(s);
  A.applyCommand(card('GD03-110',other(w)), side(other(w)), s); drainTasks(); passAll();
  ok(`Gundam GP01Fb (${w}): 【During Pair】<High-Maneuver> ends with its Pilot`, hm && !A.effHighManeuver(s), `${hm} ${A.effHighManeuver(s)}`);
  fresh(w); const a=put('ST01-008',w); pair(a,'GD05-082'); A.applyCommand(card('GD03-110',other(w)), side(other(w)), a); drainTasks(); passAll();
  ok(`printed <Blocker> (${w}) stays after the Pilot leaves`, A.effBlocker(a), A.effBlocker(a));
}

console.log(`passed: ${pass} | failed: ${fail.length}`); if (fail.length) console.log(fail.join('\n'));
console.log('Errors:', H.ERRORS.length, H.ERRORS.slice(0,5).map(e=>e.msg+' '+(e.stack||'').split('\n').slice(0,3).join(' | ')).join('\n'));
