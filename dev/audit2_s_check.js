// Audit 2, group s (statics): printed vs. named keywords (innateKeyword / innateKwAmount), conditional "While …" grants and buffs
// (parseWhileSentences: "During your turn,", "gets AP+1 and <Kw>", "for each enemy Unit"), one bonus per sentence (trashBuff /
// trashCostReduce vs whileBuff / handReduce), board auras (continuous text only, "your other", trash count, both sides, a Pilot's
// 【During Link】 aura), turn-gated 【During Link】 AP, and the statics that were missing (Forbidden Gundam, Pharact, Virtue (Trans-Am),
// The-O, Tieren Taozi, ∀ Gundam's 【Activate】, Strike Rouge, Earth House, Aspite).
// Player choices go through the real UI (startActivate / fieldClick / the card chooser / the block prompt); the AI side through
// runTrigger / aiActivate / applyActivateEffect / resolveAiAttack.
const H=require('./harness.js'); const {A,drainTasks,ERRORS}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=880000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'S',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const side=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null;
const tiles=()=>{ const o=overlay(); return o ? o.children[0].children[0].children : []; };
function pickTile(re){ const t=tiles().find(x=>re.test(x.textContent||'')); if (!t || !t.onclick) return false; t.onclick(); drainTasks(); return true; }
const real=d=>!/-p\d+$/.test(d.id);
const findDef=p=>[...A.CARD_BY_ID.values()].find(d=>real(d)&&p(d));
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');
const trashOf=(who, pred, n)=>{ const d=findDef(pred); for (let i=0;i<n;i++) side(who).trash.push(card(d.id, who)); };
// The AI attacks the player directly; returns the names offered in the player's block prompt (or []).
function blockOffer(){ G.aiForceFace=true; const atk=stick('enemy',1,9); A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); G.aiForceFace=false;
  const m=modal(); return m ? m.btns : []; }
function fight(atk, def){ const as=side(atk.owner), ds=side(def.owner); atk.rested=false; A.battle(atk, def, as, ds); drainTasks(); }

// =========================================================================================== printed vs named keywords
// A keyword named as a target / condition / grant ("enemy Unit with <Blocker>", "can't activate <Blocker>", "all Units gain
// <Blocker>", "Unit card with <Repair>/…") is not the card's own.
{ const named = ['GD01-027','GD01-029','GD01-032','GD01-069','GD01-081','GD03-018','GD03-029','GD04-067','EB01-024','EB01-029','EB01-037','EB01-042','EB01-043','EB01-049','GD06-024'];
  for (const id of named){ fresh('enemy'); const u=put(id,'player'); const offer=blockOffer();
    ok(`${id} ${u.name}: no <Blocker> of its own — not offered as a blocker`, !u.blocker && !A.effBlocker(u) && !offer.some(b=>b.includes(u.name)), offer.join(' / ')); }
  // Bases that only name <Blocker> (Archangel ST04-015, Girty Lue GD05-127, Endra GD06-123) carry no blocker flag either
  for (const id of ['ST04-015','GD05-127','GD06-123']) ok(`${id}: no blocker flag`, !card(id,'player').blocker);
  // control: a real <Blocker> is still offered
  fresh('enemy'); const fb=put('GD02-006','player'); const offer=blockOffer();
  ok('control: Forbidden Gundam (printed <Blocker>) is offered as a blocker', offer.some(b=>b.includes(fb.name)), offer.join(' / '));
  const v=card('GD04-067','player');
  ok('∀ Gundam GD04-067: no innate Blocker/First Strike/High-Maneuver/Suppression/Repair/Breach/Support',
     !v.blocker && !v.firstStrike && !v.highManeuver && !v.suppression && !v.repair && !v.breach && !v.support);
  ok("Stero's Mahiroo GD06-026: no printed <Repair>", card('GD06-026','player').repair===0);
  ok('Hizack GD03-013: no printed <Repair>', card('GD03-013','player').repair===0);
  // printed keywords still read: "【Activate･Main】<Support 2>", "<Breach 4> (…)", "<Blocker> (…) While …"
  ok('printed keywords still read (Support after 【Activate･Main】, Breach, Blocker)', card('GD05-040','player').support===2 && card('GD01-027','player').breach===4 && card('GD06-064','player').blocker); }

// Big Zam GD01-027: "【Deploy】If there are 10 or more (Zeon)/(Neo Zeon) Unit cards in your trash, deal 4 damage to all Units with <Blocker>."
{ fresh('enemy'); trashOf('enemy', d=>d.type==='unit' && hasT(d,'zeon'), 10);
  const bz=put('GD01-027','enemy'); const foeB=put('GD02-006','player'); const foeN=stick('player',1,9);
  A.runTrigger(bz, G.enemy, A.parseTrigger(bz.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Big Zam (AI): its 【Deploy】 hits the Blocker, not itself or a non-Blocker', bz.hp===6 && foeB.hp===A.effMaxHp(foeB)-4 && foeN.hp===9, `${bz.hp} ${foeB.hp} ${foeN.hp}`); }
// Gundam Astaroth Rinascimento (EX) EB01-029: "【Deploy】If 5 or more enemy Units are in play, deal 2 damage to all Units with <Blocker> that are Lv.4 or lower."
{ fresh('enemy'); const r=put('EB01-029','enemy'); for (let i=0;i<5;i++) stick('player',1,5);
  A.runTrigger(r, G.enemy, A.parseTrigger(r.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Astaroth Rinascimento (AI): its 【Deploy】 does not damage itself', r.hp===A.effMaxHp(r), `${r.hp}/${A.effMaxHp(r)}`); }

// =========================================================================================== conditional "While …" keywords
// M1 Astray GD01-081: "While you have another (Triple Ship Alliance) Unit in play, this Unit gets AP+1 and <Blocker>."
{ fresh('enemy'); const m=put('GD01-081','player'); const alone=[A.effBlocker(m), A.effAp(m)]; const offer1=blockOffer();
  fresh('enemy'); const m2=put('GD01-081','player'); stick('player',1,1,{trait:'(Triple Ship Alliance)'}); const offer2=blockOffer();
  ok('M1 Astray: no <Blocker> alone (AP 2), <Blocker> and AP 3 with another (TSA) Unit', !alone[0] && alone[1]===2 && A.effBlocker(m2) && A.effAp(m2)===3, JSON.stringify(alone));
  ok('M1 Astray: offered as a blocker only with another (TSA) Unit', !offer1.some(b=>b.includes('M1 Astray')) && offer2.some(b=>b.includes('M1 Astray')), offer1.join('/')+' | '+offer2.join('/')); }
// Hizack GD03-013: "While you have another (Jupitris) Unit in play, this Unit gets AP+1 and <Repair 1>."
{ fresh('player'); const h=put('GD03-013','player'); h.hp=1; const r0=A.effRepair(h); A.finishEndPhase(); drainTasks(); const hpAlone=h.hp;
  fresh('player'); const h2=put('GD03-013','player'); stick('player',1,1,{trait:'(Jupitris)'}); h2.hp=1; const r1=A.effRepair(h2); A.finishEndPhase(); drainTasks();
  ok('Hizack: no <Repair> alone (stays at 1 HP); <Repair 1> with another (Jupitris) Unit', r0===0 && hpAlone===1 && r1===1 && h2.hp===2, `${r0} ${hpAlone} ${r1} ${h2.hp}`); }
// Gundam Kyrios ST07-007: "During your turn, while you have a (CB) Pilot in play, this Unit gets AP+2."
{ const cb=findDef(d=>d.type==='pilot' && hasT(d,'cb') && !/allelujah|hallelujah/i.test(d.name));
  fresh('player'); const k=put('ST07-007','player'); pair(k, cb.id); const mine=A.effAp(k)-k.pilot.pAp; G.turn='enemy'; const theirs=A.effAp(k)-k.pilot.pAp;
  ok('Gundam Kyrios: AP+2 on your turn only', mine===4 && theirs===2, `${mine}/${theirs}`); }
// ZnO GD01-063 (same "During your turn, while …" prefix): First Strike vs a Lv.2 Unit on your turn only.
{ fresh('player'); const z=put('GD01-063','player'); const lv2=stick('enemy',1,5,{lv:2}); G.curBattle={atk:z, def:lv2}; const mine=A.effFirstStrike(z);
  G.turn='enemy'; G.curBattle={atk:lv2, def:z}; const theirs=A.effFirstStrike(z); G.curBattle=null;
  ok('ZnO: <First Strike> while battling a Lv.2 Unit during your turn only', mine && !theirs, `${mine}/${theirs}`); }
// Freedom Gundam ST09-004: "While a friendly Base in play, this Unit gains <Suppression>." (printed without "is")
{ fresh('player'); const f=put('ST09-004','player'); const none=A.effSuppression(f);
  G.player.base=card('GD04-128','player'); const armory=A.effSuppression(f);
  G.player.base=A.exBaseToken('player'); const exb=A.effSuppression(f);
  fresh('enemy'); const f2=put('ST09-004','enemy'); G.enemy.base=A.exBaseToken('enemy'); const ai=A.effSuppression(f2);
  ok('Freedom Gundam: <Suppression> with a friendly Base (Armory One or EX Base), not without', !none && armory && exb && ai, `${none} ${armory} ${exb} ${ai}`);
  // knock-on: Gundam Hajiroboshi GD03-068 reads the same condition
  fresh('player'); const hj=put('GD03-068','player'); const hj0=A.effBlocker(hj); G.player.base=A.exBaseToken('player');
  ok('Gundam Hajiroboshi ("While a friendly Base is in play, … <Blocker>"): an EX Base counts', !hj0 && A.effBlocker(hj)); }
// Pale Rider (Ground Heavy Equipment Type) EB01-049: "While a friendly (G Generation) Unit with <Blocker> is in play, this Unit gains <Suppression>."
{ const gb=findDef(d=>d.type==='unit' && hasT(d,'g generation') && /^&lt;Blocker&gt;|^<Blocker>/.test(d.effect||'') );
  fresh('player'); const p=put('EB01-049','player'); const none=A.effSuppression(p);
  stick('player',1,1,{trait:'(G Generation)'}); const noKw=A.effSuppression(p);
  const b=put(gb.id,'player'); const yes=A.effSuppression(p);
  ok(`Pale Rider: <Suppression> with a friendly (G Generation) <Blocker> Unit (${gb.name}) only`, !none && !noKw && yes, `${none} ${noKw} ${yes}`);
  fresh('enemy'); const p2=put('EB01-049','enemy'); put(gb.id,'enemy'); ok('Pale Rider (AI side): <Suppression> too', A.effSuppression(p2)); }
// Gundam AGE-1 Spallow GD02-023: "【During Link】While you are Lv.7 or higher, this Unit gains <First Strike>."
{ const flit=findDef(d=>d.type==='pilot' && /^Flit Asuno/.test(d.name));
  fresh('player'); G.player.resMax=4; const s=put('GD02-023','player'); pair(s, flit.id); const lv4=A.effFirstStrike(s);
  const foe=stick('enemy',4,3,{rested:true}); fight(s, foe);
  fresh('player'); G.player.resMax=7; const s7=put('GD02-023','player'); pair(s7, flit.id); const lv7=A.effFirstStrike(s7);
  ok('Spallow: linked at Lv.4 no <First Strike> (both take damage); at Lv.7 it has it', s.linked && !lv4 && foe.hp<=0 && s.hp===A.effMaxHp(s)-4 && lv7, `${lv4} foe ${foe.hp} spallow ${s.hp}/${A.effMaxHp(s)} lv7 ${lv7}`);
  fresh('enemy'); G.enemy.resMax=4; const se=put('GD02-023','enemy'); pair(se, flit.id); G.enemy.resMax=8; const aiOn=A.effFirstStrike(se); G.enemy.resMax=4; const aiOff=A.effFirstStrike(se);
  ok('Spallow (AI side): follows its own Lv.', aiOn && !aiOff); }

// =========================================================================================== one bonus per sentence
{ fresh('player'); trashOf('player', d=>d.type==='command', 4); const mi=put('GD01-076','player'); const ae=card('GD01-070','player'); G.player.hand=[ae];
  ok('Michaelis: 4/4 (not 5/5) with 4 Commands in trash', A.effAp(mi)===4 && A.effMaxHp(mi)===4, `${A.effAp(mi)}/${A.effMaxHp(mi)}`);
  ok('Gundam Aerial: cost 3 -> 1 (not 0) with 4 Commands in trash', A.effectiveCost(G.player, ae)===1, A.effectiveCost(G.player, ae));
  G.player.trash.length=3; ok('… and 3/3, cost 3 with 3 Commands', A.effAp(mi)===3 && A.effMaxHp(mi)===3 && A.effectiveCost(G.player, ae)===3);
  G.player.resAvail=0; G.player.trash=[]; trashOf('player', d=>d.type==='command', 4); A.playFromHand(ae.uid); drainTasks();
  ok('Gundam Aerial: not deployable with 0 resources available', G.player.hand.includes(ae) && !G.player.field.includes(ae)); }
{ fresh('enemy'); trashOf('enemy', d=>hasT(d,'neo zeon'), 8); const rz=card('GD04-039','enemy'); G.enemy.hand=[rz];
  ok('Rozen Zulu: cost 6 -> 2 (not 0) with 8 (Neo Zeon) cards in trash', A.effectiveCost(G.enemy, rz)===2, A.effectiveCost(G.enemy, rz)); }
{ fresh('player'); trashOf('player', d=>d.type==='unit' && hasT(d,'zeon'), 4); const z=put('GD06-060','player'); const foe=stick('enemy',1,9,{rested:true});
  fight(z, foe); ok('Zaku Ⅱ F2: AP 3 (not 4) with 4 (Zeon) Unit cards in trash; deals 3', A.effAp(z)===3 && foe.hp===6, `${A.effAp(z)} ${foe.hp}`); }
// Ξ Gundam ST08-001: "…this card in your hand gets Lv. -1 and cost -1 for each enemy Unit in play."
{ fresh('player'); const xi=card('ST08-001','player'); G.player.hand=[xi]; for (let i=0;i<3;i++) stick('enemy',1,1);
  const hr=A.handReduction(G.player, xi); const c3=A.effectiveCost(G.player, xi);
  stick('player',1,1,{lv:6}); const blocked=A.effectiveCost(G.player, xi);
  ok('Ξ Gundam: 3 enemy Units -> cost 8 -> 5, Lv 9 -> 6; none with your Lv.6+ Unit', c3===5 && hr.lv===3 && blocked===8, `${c3} ${hr.lv} ${blocked}`); }

// =========================================================================================== auras
// Gundam X GD02-053: "【During Link】During your turn, while there are 7 or more cards in your trash, all your other (Vulture) Units get AP+2."
{ const garrod=findDef(d=>d.type==='pilot' && /^Garrod Ran/.test(d.name)); const jen=findDef(d=>d.type==='unit' && hasT(d,'vulture') && d.id!=='GD02-053');
  fresh('player'); const gx=put('GD02-053','player'); pair(gx, garrod.id); const v=put(jen.id,'player'); trashOf('player', d=>d.type==='command', 8);
  const on=A.effAp(v)-v.baseAp, self=A.effAp(gx)-gx.baseAp-gx.pilot.pAp; G.turn='enemy'; const opp=A.effAp(v)-v.baseAp; G.turn='player';
  G.player.trash.length=6; const few=A.effAp(v)-v.baseAp;
  ok('Gundam X: other (Vulture) Units +2 on your turn with 7+ trash while linked; not itself, not on the opponent\'s turn, not with 6', on===2 && self===0 && opp===0 && few===0, `${on} ${self} ${opp} ${few}`);
  fresh('player'); const gx2=put('GD02-053','player'); const v2=put(jen.id,'player'); trashOf('player', d=>d.type==='command', 8);
  ok('Gundam X: no aura while not linked', A.effAp(v2)===v2.baseAp); }
// Darilbalde EB01-036 (ruling: literal "all other (G Generation) Units" = both players' Units): "During your turn, all other (G Generation) Units that are Lv.3 get AP+1."
{ const gg3=findDef(d=>d.type==='unit' && hasT(d,'g generation') && d.lv===3 && d.id!=='EB01-036' && !/【|While|while/.test(d.effect||''));
  fresh('player'); put('EB01-036','player'); const mine=put(gg3.id,'player'); const theirs=put(gg3.id,'enemy');
  const a=[A.effAp(mine)-mine.baseAp, A.effAp(theirs)-theirs.baseAp]; G.turn='enemy'; const b=[A.effAp(mine)-mine.baseAp, A.effAp(theirs)-theirs.baseAp];
  ok("Darilbalde: during its controller's turn every other Lv.3 (G Generation) Unit gets AP+1 (yours and the opponent's); not on the other turn", a[0]===1 && a[1]===1 && b[0]===0 && b[1]===0, JSON.stringify([a,b])); }
// Aspite GD06-124: "【Activate･Main】Rest this Base：If you have 3 or more (Ghingnham Fleet)/(Long-Range Weapon) Units in play, all your (Ghingnham Fleet) Units get AP+1 during this turn." — no static aura.
{ const gh=findDef(d=>d.type==='unit' && hasT(d,'ghingnham fleet') && !/【Activate|While|while/.test(d.effect||''));
  fresh('player'); G.player.base=card('GD06-124','player'); const z=put(gh.id,'player'); const o=stick('player',3,3,{trait:'(AEUG)'});
  const stat=A.effAp(z)-z.baseAp; A.startActivate(G.player.base); drainTasks(); const one=[A.effAp(z)-z.baseAp, A.effAp(o)-3];
  fresh('player'); G.player.base=card('GD06-124','player'); const z1=put(gh.id,'player'); put(gh.id,'player'); const lr=stick('player',3,3,{trait:'(Long-Range Weapon)'}); const o2=stick('player',3,3,{trait:'(AEUG)'});
  A.startActivate(G.player.base); drainTasks(); const three=[A.effAp(z1)-z1.baseAp, A.effAp(lr)-3, A.effAp(o2)-3];
  ok('Aspite: no static aura; its 【Activate】 needs 3 (Ghingnham Fleet)/(Long-Range Weapon) Units and buffs only (Ghingnham Fleet) Units', stat===0 && one[0]===0 && one[1]===0 && three[0]===1 && three[1]===0 && three[2]===0, JSON.stringify([stat,one,three]));
  fresh('enemy'); G.enemy.base=card('GD06-124','enemy'); const e1=put(gh.id,'enemy'); put(gh.id,'enemy'); put(gh.id,'enemy'); const eo=stick('enemy',3,3,{trait:'(AEUG)'});
  A.applyActivateEffect(G.enemy.base, null, G.enemy); drainTasks();
  ok('Aspite (AI): buffs its (Ghingnham Fleet) Units only', A.effAp(e1)-e1.baseAp===1 && A.effAp(eo)===3); }
// Gym Ghingnham GD06-085 (a Pilot): "【During Link】All your (Ghingnham Fleet) Units get AP+1 during your opponent's turn."
{ const host=findDef(d=>d.type==='unit' && /gym ghingnham/i.test(d.link||'')); const gh=findDef(d=>d.type==='unit' && hasT(d,'ghingnham fleet') && d.id!==host.id && !/While|while|【During/.test(d.effect||''));
  fresh('player'); const h=put(host.id,'player'); pair(h, 'GD06-085'); const z=put(gh.id,'player');
  const mine=A.effAp(z)-z.baseAp; G.turn='enemy'; const opp=A.effAp(z)-z.baseAp;
  fresh('player'); const h2=stick('player',2,2,{trait:'(Moonrace)'}); pair(h2,'GD06-085'); const z2=put(gh.id,'player'); G.turn='enemy'; const notLinked=A.effAp(z2)-z2.baseAp;
  ok(`Gym Ghingnham: linked (on ${host.name}) your (Ghingnham Fleet) Units get AP+1 on the opponent's turn only; not unlinked`, h.linked && mine===0 && opp===1 && !h2.linked && notLinked===0, `${h.linked} ${mine} ${opp} ${h2.linked} ${notLinked}`); }
// One-shot "all your (T) Units get AP+1 (during this turn)" text is never a standing aura (Setsuna F. Seiei ST07-009, Char Aznable ST11-011)
ok('Setsuna F. Seiei / Char Aznable: no standing board aura', !card('ST07-009','player').boardAura && !card('ST11-011','player').boardAura && !card('GD06-124','player').boardAura);

// =========================================================================================== turn-gated 【During Link】 AP
// Landman Rodi GD05-065: "【During Link】This Unit gets AP+2 during your turn."
{ const lp=findDef(d=>d.type==='pilot' && hasT(d,'tekkadan'));
  fresh('enemy'); const r=put('GD05-065','player'); pair(r, lp.id); const atk=stick('enemy',1,9); r.rested=true;
  const oppAp=A.effAp(r)-r.pilot.pAp; A.resolveAiAttack(atk, ()=>{}, r); drainTasks(); for (let g=0;g<6 && modal();g++){ if(!press(/Pass|Don't|No/)) break; }
  G.turn='player'; const myAp=A.effAp(r)-r.pilot.pAp;
  ok("Landman Rodi: linked AP 3 on your turn, 1 on the opponent's (deals 1 back when attacked)", r.linked && myAp===3 && oppAp===1 && atk.hp===9-(1+r.pilot.pAp), `${r.linked} ${myAp} ${oppAp} atk ${atk.hp}`); }

// =========================================================================================== missing statics
// Forbidden Gundam GD02-006: "During your turn, this Unit can't receive battle damage from enemy Units that are Lv.2 or lower."
{ fresh('player'); const f=put('GD02-006','player'); const lv2=stick('enemy',3,5,{lv:2,rested:true}); fight(f, lv2); const a=f.hp;
  fresh('player'); const f2=put('GD02-006','player'); const lv3=stick('enemy',3,5,{lv:3,rested:true}); fight(f2, lv3); const b=f2.hp;
  fresh('enemy'); const f3=put('GD02-006','player'); f3.rested=true; const e2=stick('enemy',3,9,{lv:2}); fight(e2, f3); const c=f3.hp;
  ok("Forbidden Gundam: no battle damage from a Lv.2 Unit on your turn; damage from Lv.3, and on the opponent's turn", a===4 && b===1 && c===1, `${a} ${b} ${c}`); }
// Gundam Heavyarms Custom GD03-029: "During your turn, when this Unit destroys an enemy Unit with battle damage, deal 2 damage to all enemy Units with <Blocker>."
{ fresh('player'); const hv=put('GD03-029','player'); const v=stick('enemy',1,1,{rested:true}); const nb=stick('enemy',1,9); const bl=stick('enemy',1,9,{blocker:true});
  fight(hv, v); ok('Heavyarms Custom: after its battle kill only enemy <Blocker> Units take 2', v.hp<=0 && nb.hp===9 && bl.hp===7, `${nb.hp} ${bl.hp}`); }
// Tieren Taozi GD03-074: "【During Pair】While you have another (Superpower Bloc) Unit in play, enemy Units choose this rested Unit as their attack target if possible when attacking."
{ const pl=findDef(d=>d.type==='pilot' && !/soma|super soldier/i.test(d.name+d.trait));
  fresh('player'); const t=put('GD03-074','enemy',{rested:true}); const x=stick('enemy',1,9,{rested:true}); const atk=stick('player',2,5);
  const lone=A.lureTargets(atk, G.enemy).includes(t);
  stick('enemy',1,1,{trait:'(Superpower Bloc)'}); const unpaired=A.lureTargets(atk, G.enemy).includes(t);
  pair(t, pl.id); t.rested=true; const both=A.lureTargets(atk, G.enemy).includes(t);
  fresh('player'); const t2=put('GD03-074','enemy',{rested:true}); pair(t2, pl.id); t2.rested=true; const pairedAlone=A.lureTargets(atk, G.enemy).includes(t2);
  ok('Tieren Taozi: lures only while paired AND with another (Superpower Bloc) Unit', !lone && !unpaired && both && !pairedAlone, `${lone} ${unpaired} ${both} ${pairedAlone}`);
  fresh('player'); const t3=put('GD03-074','enemy',{rested:true}); const x3=stick('enemy',1,9,{rested:true}); const a3=put('ST01-001','player');
  A.fieldClick(a3.uid); drainTasks(); A.fieldClick(x3.uid); drainTasks(); for (let g=0;g<6 && modal();g++){ if(!press(/Pass|Don't|No/)) break; } drainTasks();
  ok('Tieren Taozi: the player may attack another rested Unit while the lure is off', x3.hp<9 && t3.hp===A.effMaxHp(t3), `mode ${G.mode} ${x3.hp}`); }
// Gundam Pharact GD04-018: "【Once per Turn】During your turn, when one of your other (Academy) Units receives damage from an enemy, place 1 EX Resource."
{ const ac=findDef(d=>d.type==='unit' && hasT(d,'academy') && d.id!=='GD04-018' && !/【|While|while/.test(d.effect||''));
  fresh('player'); const ph=put('GD04-018','player'); const a=put(ac.id,'player'); a.baseHp=9; a.hp=9;
  G.effSrc=stick('enemy',1,1); A.damage(a, 1, G.player, 'effect'); G.effSrc=null; const ex1=G.player.ex;
  G.effSrc=G.enemy.field[0]; A.damage(a, 1, G.player, 'effect'); G.effSrc=null; const ex2=G.player.ex;
  G.effSrc=G.enemy.field[0]; A.damage(ph, 1, G.player, 'effect'); G.effSrc=null;
  ok('Gundam Pharact: 1 EX Resource the first time another (Academy) Unit takes enemy damage on your turn (once per turn)', ex1===1 && ex2===1, `${ex1} ${ex2}`);
  fresh('player'); put('GD04-018','player'); const a2=put(ac.id,'player'); a2.hp=a2.baseHp=9; const foe=stick('enemy',2,9,{rested:true}); fight(a2, foe);
  ok('Gundam Pharact: battle damage counts too', G.player.ex===1, G.player.ex);
  fresh('enemy'); put('GD04-018','player'); const a3=put(ac.id,'player'); a3.hp=a3.baseHp=9; G.effSrc=stick('enemy',1,1); A.damage(a3, 1, G.player, 'effect'); G.effSrc=null;
  ok("Gundam Pharact: nothing on the opponent's turn", G.player.ex===0);
  fresh('enemy'); put('GD04-018','enemy'); const a4=put(ac.id,'enemy'); a4.hp=a4.baseHp=9; G.effSrc=stick('player',1,1); A.damage(a4, 1, G.enemy, 'effect'); G.effSrc=null;
  ok('Gundam Pharact (AI): places its EX Resource', G.enemy.ex===1, G.enemy.ex); }
// Gundam Virtue (Trans-Am) GD04-054: "When this Unit deals battle damage to an enemy Unit, destroy that enemy Unit."
{ fresh('player'); const v=put('GD04-054','player'); const foe=stick('enemy',1,9,{rested:true}); fight(v, foe);
  fresh('enemy'); const v2=put('GD04-054','player'); v2.rested=true; const atk=stick('enemy',1,9); fight(atk, v2);
  ok('Gundam Virtue (Trans-Am): any Unit it deals battle damage to is destroyed (attacking and defending)', !G.enemy.field.includes(foe) && !G.enemy.field.includes(atk), `${foe.hp} ${atk.hp}`);
  // knock-ons: Gundam Virtue GD03-052 (Lv.5 or lower, with a (CB) Pilot), Ennil El GD04-096 (【During Link】, read off the Pilot)
  const cb=findDef(d=>d.type==='pilot' && hasT(d,'cb') && !/tieria/i.test(d.name));
  fresh('player'); const g=put('GD03-052','player'); const f5=stick('enemy',1,9,{rested:true,lv:5}); fight(g, f5); const noPilot=G.enemy.field.includes(f5);
  fresh('player'); const g2=put('GD03-052','player'); pair(g2, cb.id); const f5b=stick('enemy',1,9,{rested:true,lv:5}); fight(g2, f5b); const withPilot=!G.enemy.field.includes(f5b);
  fresh('player'); const g3=put('GD03-052','player'); pair(g3, cb.id); const f6=stick('enemy',1,9,{rested:true,lv:6}); fight(g3, f6); const lv6=G.enemy.field.includes(f6);
  ok('Gundam Virtue GD03-052: destroys a Lv.5-or-lower Unit it damages only while you have a (CB) Pilot', noPilot && withPilot && lv6, `${noPilot} ${withPilot} ${lv6}`); }
// The-O ST14-001: "Each enemy player's rested Units with the lowest Lv. won't be set as active during the start phase of their turn."
{ fresh('enemy'); put('ST14-001','enemy'); const l2=stick('player',1,3,{lv:2,rested:true}); const l2b=stick('player',1,3,{lv:2,rested:true}); const l4=stick('player',1,3,{lv:4,rested:true}); const act1=stick('player',1,3,{lv:1});
  A.beginTurn('player'); drainTasks();
  ok("The-O: at the opponent's start phase its rested lowest-Lv. Units stay rested; the others ready", l2.rested && l2b.rested && !l4.rested && !act1.rested, `${l2.rested} ${l2b.rested} ${l4.rested}`);
  fresh('player'); put('ST14-001','player'); const e2=stick('enemy',1,3,{lv:2,rested:true}); const e5=stick('enemy',1,3,{lv:5,rested:true}); G.enemy.deck.length=20;
  const realAi=global.setTimeout; A.beginTurn('enemy'); const r=[e2.rested, e5.rested];
  fresh('player'); const own=stick('player',1,3,{lv:2,rested:true}); put('ST14-001','player'); A.beginTurn('player'); drainTasks();
  ok("The-O (on the player's side): the AI's lowest-Lv. rested Unit stays rested; your own Units are unaffected", r[0] && !r[1] && !own.rested, JSON.stringify(r)); }
// Altron Gundam (EW) GD06-064: "While an enemy Unit that is Lv.5 or higher is in play, this Unit gets AP+3."
{ fresh('player'); const al=put('GD06-064','player'); const lo=A.effAp(al); const big=stick('enemy',1,9,{lv:5,rested:true}); const hi=A.effAp(al); fight(al, big);
  ok('Altron Gundam (EW): AP 3 -> 6 with an enemy Lv.5 Unit in play; deals 6', lo===3 && hi===6 && big.hp===3, `${lo} ${hi} ${big.hp}`); }

// =========================================================================================== 【Activate】 bodies
// Asticassia School of Technology, Earth House ST01-016: "【Activate･Main】Rest this Base：All friendly Link Units get AP+1 during this turn."
{ const wingP=findDef(d=>d.type==='pilot' && /^Heero Yuy/.test(d.name)); const wing=findDef(d=>d.type==='unit' && /heero yuy/i.test(d.link||'') && !/While|while/.test(d.effect||''));
  fresh('player'); G.player.base=card('ST01-016','player'); const w=put(wing.id,'player'); pair(w, wingP.id); const u2=stick('player',4,4);
  const before=A.effAp(w); A.startActivate(G.player.base); drainTasks();
  ok('Earth House (player): only Link Units get AP+1', w.linked && A.effAp(w)===before+1 && A.effAp(u2)===4 && G.player.base.rested, `${before}->${A.effAp(w)} ${A.effAp(u2)}`);
  fresh('enemy'); G.enemy.base=card('ST01-016','enemy'); const we=put(wing.id,'enemy'); pair(we, wingP.id); const ue=stick('enemy',4,4); const b2=A.effAp(we);
  A.applyActivateEffect(G.enemy.base, null, G.enemy); ok('Earth House (AI): only Link Units get AP+1', A.effAp(we)===b2+1 && A.effAp(ue)===4); }
// Strike Rouge GD01-069: "【Activate･Main】【Once per Turn】①：Choose 1 of your rested white Units with <Blocker>. Set it as active. It can't attack during this turn."
{ const wb=findDef(d=>d.type==='unit' && /white/i.test(d.color) && /^&lt;Blocker&gt;/.test(d.effect||''));
  fresh('player'); const sr=put('GD01-069','player'); const good=put(wb.id,'player',{rested:true}); const good2=put(wb.id,'player',{rested:true});
  const blue=stick('player',3,3,{rested:true,color:'Blue',blocker:true}); const wNoB=stick('player',3,3,{rested:true,color:'White'}); const act=put(wb.id,'player');
  A.startActivate(sr); drainTasks(); const cands=G.activateCands||[];
  const okC = G.mode==='activate-target' && cands.length===2 && cands.includes(good.uid) && cands.includes(good2.uid);
  A.fieldClick(good2.uid); drainTasks();
  ok('Strike Rouge (player): only your rested white <Blocker> Units can be chosen; the chosen one is set active and can\'t attack this turn', okC && !good2.rested && good2.noAttackTurn===G.turnSeq && blue.rested && wNoB.rested, `${G.mode} ${cands.length}`);
  fresh('enemy'); const sr2=put('GD01-069','enemy'); const eg=put(wb.id,'enemy',{rested:true}); const eb=stick('enemy',5,5,{rested:true,color:'Blue'});
  const used=A.aiActivate(sr2); drainTasks();
  ok('Strike Rouge (AI): readies its rested white <Blocker>, not the blue non-Blocker', !eg.rested && eb.rested && eg.noAttackTurn===G.turnSeq, `${used} ${eg.rested} ${eb.rested}`); }
// Archangel ST04-015 (same wording): "Choose 1 friendly Unit with <Blocker>. Set it as active. It can't attack during this turn."
{ const wb=findDef(d=>d.type==='unit' && /^&lt;Blocker&gt;/.test(d.effect||''));
  fresh('player'); G.player.base=card('ST04-015','player'); const b=put(wb.id,'player',{rested:true}); stick('player',3,3,{rested:true});
  A.startActivate(G.player.base); drainTasks();
  ok('Archangel: only friendly <Blocker> Units are candidates', G.mode==='activate-target' ? (G.activateCands||[]).length===1 && G.activateCands[0]===b.uid : !b.rested, `${G.mode} ${(G.activateCands||[]).length}`); }
// ∀ Gundam GD04-067: "①：Choose 1 Unit card with <Repair>/…/<Blocker> from any player's trash. During this turn, this Unit gets AP+1 and all <…> on that Unit card."
{ const fs=findDef(d=>d.type==='unit' && /^&lt;First Strike&gt;/.test(d.effect||'')); const bl=findDef(d=>d.type==='unit' && /^&lt;Blocker&gt;/.test(d.effect||''));
  const rp=findDef(d=>d.type==='unit' && /^&lt;Repair (\d)&gt;/.test(d.effect||''));
  fresh('player'); const v=put('GD04-067','player'); const other=stick('player',2,2);
  const plainU=findDef(d=>d.type==='unit' && (d.effect||'').trim()==='-');
  const t1=card(fs.id,'player'), t2=card(bl.id,'enemy'), t3=card(plainU.id,'player'); t1.img=t2.img=t3.img=null; G.player.trash.push(t1, t3); G.enemy.trash.push(t2);
  A.startActivate(v); drainTasks(); const names=tiles().map(x=>x.textContent);
  const offered = names.length===2 && names.includes(fs.name) && names.includes(bl.name);
  const picked = pickTile(new RegExp('^'+fs.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));
  ok('∀ Gundam (player): chooses among Unit cards with a listed keyword in both trashes; this Unit gets AP+1 and that card\'s <First Strike>; no other Unit buffed',
     offered && picked && A.effAp(v)===5 && A.effFirstStrike(v) && !A.effBlocker(v) && A.effAp(other)===2 && G.player.resAvail===9, `${names} ${A.effAp(v)} ${A.effFirstStrike(v)} ${A.effAp(other)}`);
  fresh('player'); const v2=put('GD04-067','player'); A.startActivate(v2); drainTasks();
  ok('∀ Gundam (player, empty trashes): only its own AP+1', A.effAp(v2)===5 && !A.effFirstStrike(v2) && !overlay());
  fresh('enemy'); const v3=put('GD04-067','enemy'); G.player.trash.push(card(bl.id,'player')); G.enemy.trash.push(card(fs.id,'enemy'));
  A.applyActivateEffect(v3, null, G.enemy); drainTasks();
  ok('∀ Gundam (AI): picks a card and copies its keyword (First Strike over Blocker)', A.effAp(v3)===5 && A.effFirstStrike(v3), `${A.effAp(v3)}`);
  A.beginTurn('enemy'); ok('∀ Gundam: the copied keyword ends with the turn', !A.effFirstStrike(v3)); }
// Stero's Mahiroo GD06-026: "【Attack】If you have 3 or more other (Ghingnham Fleet)/(Long-Range Weapon) Units in play, choose 1 of your Units. It gets AP+1 and <Repair 2> during this turn."
{ const gh=findDef(d=>d.type==='unit' && hasT(d,'ghingnham fleet') && d.id!=='GD06-026' && !/【|While|while/.test(d.effect||''));
  fresh('player'); const m=put('GD06-026','player'); m.hp=1; A.finishEndPhase(); drainTasks();
  ok("Stero's Mahiroo: no Repair of its own (stays at 1 HP)", m.hp===1, m.hp);
  fresh('enemy'); const me=put('GD06-026','enemy'); const zs=[put(gh.id,'enemy'),put(gh.id,'enemy'),put(gh.id,'enemy')];
  A.runTrigger(me, G.enemy, A.parseTrigger(me.effect,'Attack'), 'Attack'); drainTasks();
  const got=[me, ...zs].find(u=>(u.tempAp||0)===1);
  ok("Stero's Mahiroo (AI): the chosen Unit gets AP+1 and <Repair 2> this turn", got && A.effRepair(got)===2, got && `${got.name} ${A.effRepair(got)}`);
  fresh('player'); const mp=put('GD06-026','player'); const zp=[put(gh.id,'player'),put(gh.id,'player'),put(gh.id,'player')];
  A.resolvePlayerTrigger(mp, G.player, A.parseTrigger(mp.effect,'Attack'), 'Attack', ()=>{}); drainTasks();
  if (G.mode && /target/.test(G.mode)) A.fieldClick(zp[1].uid); else if (modal()) press(new RegExp(zp[1].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  drainTasks(); const gp=[mp, ...zp].find(u=>(u.tempAp||0)===1);
  ok("Stero's Mahiroo (player): the Unit you choose gets AP+1 and <Repair 2>", gp && A.effRepair(gp)===2, `${G.mode} ${gp && gp.name}`); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL', f);
console.log(`Errors: ${ERRORS.length}`); for (const e of ERRORS.slice(0,5)) console.log('  ', e.phase, e.msg, e.stack);
