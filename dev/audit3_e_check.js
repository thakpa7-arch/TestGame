// Audit 3, group e (hooks):
//  - Gundam Throne Drei GD04-041 "【Once per Turn】When this Unit is rested by an effect, set it as active." — your OWN effects that
//    rest it (Throne Eins' 【Deploy】, Human Karma, "choose 1 of your Units. Rest it. If you do") count too; the Unit still counts as
//    rested for "if you do" / "the number of Units rested". Own-effect rests never wake Doritea (opponent's effects only).
//  - Tallgeese III GD05-070: "choose 1 of your rested (Preventer)/(G Team) Link Units. Set it as active." — no "other": itself too.
//  - Alpha Azieru GD05-054: Units destroyed by the GD05 self-destroy effects (Gyunei's Jagd Doga, both Sazabis) are destroyed by an effect.
//  - White Ark GD05-124: a friendly (League Militaire) Unit's effect that rests your Unit (Gun EZ GD04-015) may rest the Base instead.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=950000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,activateRestSub:null,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
  el('log').children.length=0;
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
const inHand=(id, who)=>{ const c=card(id, who||'player'); sideOf(who||'player').hand.push(c); return c; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const vpilot=(who, name, extra)=>Object.assign({ uid:UID++, owner:who, def:'TESTP', name, type:'pilot', color:'Blue', cost:1, lv:3, trait:'(Test)', effect:'', pAp:1, pHp:1 }, extra||{});
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\#/]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+'( |$)'));
const btnsHave=(m, us)=>!!m && us.every(u=>m.btns.some(b=>b===u.name || b.startsWith(u.name+' ')));
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)){ if(!press(/Don't|No block/)) break; } else if (!/Action Step|block|Block/i.test(m.msg) || !press(/^Pass|No block|Don't block|Take it/i)) break; } };
const attack=(atk, def)=>{ A.fieldClick(atk.uid); drainTasks(); if (def) A.fieldClick(def.uid); else A.attackDirect(); drainTasks(); };
function aiAttacks(atk, t){ let done=false; A.resolveAiAttack(atk, ()=>{ done=true; }, t||null); drainTasks(); return done; }
const play=(c)=>{ A.playFromHand(c.uid); drainTasks(); if (modal() && modal().btns.some(b=>/Command effect/.test(b))) press(/Command effect/); };
// Choose a Unit in whichever chooser is open (modal button or a board tap in a selection mode).
const tap=(u)=>{ if (modal()) return pressUnit(u); if (G.mode!=='idle'){ A.fieldClick(u.uid); drainTasks(); return true; } return false; };
const logs=()=>(el('log').children||[]).map(n=>strip(n.innerHTML||n.textContent)).join(' | ');

const DREI='GD04-041', EINS='GD04-036', KARMA='GD03-113', DORITEA='GD03-128';
const TALL='GD05-070', AZIERU='GD05-054', GYUNEI='GD05-057', SAZ52='GD05-052', SAZ49='GD05-049', WARK='GD05-124', GUNEZ4='GD04-015', GUNEZ5='GD05-013';

// ===================== Gundam Throne Drei =====================
{ fresh('player'); const d=put(DREI,'player'); const e1=stick('enemy',2,5,{lv:6}); play(inHand(EINS)); if (/may/i.test((modal()||{}).msg||'')) press(/^Yes|Choose|Rest/);
  tap(d); if (G.mode!=='idle'){ A.cancelAction(); drainTasks(); }
  ok('Drei: player Throne Eins rests it — 1 damage dealt (it counts as rested) and Drei is set active again', e1.hp===4 && !d.rested, `e1 hp ${e1.hp}, rested ${d.rested}; ${logs()}`); }
{ fresh('enemy'); const d=put(DREI,'enemy'); const ein=card(EINS,'enemy'); const p=stick('player',5,3,{lv:6});
  A.runTrigger(ein, G.enemy, A.parseTrigger(ein.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Drei: AI Throne Eins rests it — damage dealt and Drei set active again', !d.rested && p.hp<3, `rested ${d.rested}, p hp ${p.hp}; ${logs()}`); }
{ fresh('player'); const d=put(DREI,'player'); const e=stick('enemy',2,5,{lv:5}); play(inHand(KARMA)); tap(d); tap(e);
  ok('Drei: player Human Karma rests it — 3 damage dealt and Drei set active again', e.hp===2 && !d.rested, `e hp ${e.hp}, rested ${d.rested}; ${logs()}`);
  const e2=stick('enemy',2,5,{lv:5}); play(inHand(KARMA)); tap(d); tap(e2);
  ok('Drei: once per turn — a second Human Karma the same turn leaves it rested (damage still dealt)', d.rested && e2.hp===2, `rested ${d.rested}, e2 hp ${e2.hp}`); }
{ fresh('enemy'); const d=put(DREI,'enemy'); const p=stick('player',2,5,{lv:5}); const k=card(KARMA,'enemy'); A.applyCommand(k, G.enemy, null); drainTasks();
  ok('Drei: AI Human Karma rests its Drei — damage dealt, Drei set active again', !d.rested && p.hp===2, `rested ${d.rested}, p hp ${p.hp}; ${logs()}`); }
// Same wording elsewhere: Extreme Hatred GD01-112 "Choose 2 of your active Units. Rest them. If you do, …"
{ fresh('enemy'); const d=put(DREI,'enemy'); const o=stick('enemy',1,3); const p=stick('player',2,5); A.applyCommand(card('GD01-112','enemy'), G.enemy, null); drainTasks();
  ok('Drei: AI Extreme Hatred rests it and another Unit — 3 damage dealt, Drei set active again', !d.rested && o.rested && p.hp===2, `d ${d.rested} o ${o.rested} p hp ${p.hp}; ${logs()}`); }
// Doritea: "During your opponent's turn, when one of your Units is rested by one of your opponent's effects" — never by your own.
{ fresh('player'); G.enemy.base=card(DORITEA,'enemy'); const mine=stick('enemy',2,5,{lv:5}); const p=stick('player',1,5,{lv:2}); const k=card(KARMA,'enemy');
  A.applyCommand(k, G.enemy, null); drainTasks();
  ok("Doritea: the AI's own Human Karma rests its Unit on the player's turn — no Doritea ping", mine.rested && p.hp===2, `mine rested ${mine.rested}, p hp ${p.hp}; ${logs()}`); }
{ fresh('player'); G.enemy.base=card(DORITEA,'enemy'); const mine=stick('enemy',2,5); const p=stick('player',1,5);
  A.runTrigger(card('GD03-087','player'), G.player, {kind:'rest',filter:{}}, 'X'); drainTasks();
  ok("Doritea control: the player's rest effect on the AI's Unit still pings", mine.rested && p.hp===4, `mine rested ${mine.rested}, p hp ${p.hp}`); }

// ===================== Tallgeese III =====================
const tall=(who)=>{ const t=put(TALL,who); A.attachPilot(t, vpilot(who,'Zechs Merquise',{trait:'(Preventer)'})); drainTasks(); return t; };
{ fresh('player'); const t=tall('player'); const e=stick('enemy',1,1,{rested:true}); attack(t,e); passAll();
  ok('Tallgeese III: alone, it sets itself active after its battle kill and can\'t attack this turn', t.linked && !G.enemy.field.includes(e) && !t.rested && t.noAttackTurn===G.turnSeq, `linked ${t.linked} rested ${t.rested} noAtk ${t.noAttackTurn}`); }
{ fresh('player'); const t=tall('player'); const o=stick('player',2,2,{trait:'(G Team)',name:'GLink',rested:true,linked:true,pilot:true}); const e=stick('enemy',1,1,{rested:true});
  attack(t,e); passAll(); const m=modal();
  ok('Tallgeese III: with another rested (G Team) Link Unit the player gets a chooser listing both', btnsHave(m,[t,o]), JSON.stringify(m));
  pressUnit(t);
  ok('Tallgeese III: choosing itself sets it active, the other stays rested', !t.rested && o.rested, `t ${t.rested} o ${o.rested}`); }
{ fresh('player'); const t=tall('player'); const o=stick('player',2,2,{trait:'(G Team)',name:'GLink',rested:true,linked:true,pilot:true}); const e=stick('enemy',1,1,{rested:true});
  attack(t,e); passAll(); pressUnit(o);
  ok('Tallgeese III: choosing the other Link Unit sets it active (can\'t attack), Tallgeese stays rested', !o.rested && t.rested && o.noAttackTurn===G.turnSeq); }
{ fresh('player'); const t=put(TALL,'player'); const e=stick('enemy',1,1,{rested:true}); attack(t,e); passAll();
  ok('Tallgeese III: unlinked it isn\'t a Link Unit — stays rested', t.rested && !G.enemy.field.includes(e)); }
{ fresh('enemy'); const t=tall('enemy'); const p=stick('player',1,1,{rested:true}); aiAttacks(t, p); passAll();
  ok('Tallgeese III (AI): sets itself active after its battle kill', !G.player.field.includes(p) && !t.rested, `rested ${t.rested}`); }

// ===================== Alpha Azieru =====================
{ fresh('enemy'); put(AZIERU,'enemy'); const gy=put(GYUNEI,'enemy',{rested:true}); const f=stick('enemy',1,1,{name:'Fodder'});
  const h0=G.enemy.hand.length; A.gd05GyuneiActivate(gy, G.enemy); drainTasks();
  ok("Alpha Azieru: AI Gyunei's Jagd Doga destroys its Unit — draw 1", !G.enemy.field.includes(f) && G.enemy.hand.length-h0===1, `drew ${G.enemy.hand.length-h0}`);
  const f2=stick('enemy',1,1,{name:'Fodder2'}); const h1=G.enemy.hand.length; A.gd05DestroyUnit(f2, G.enemy, true); drainTasks();
  ok('Alpha Azieru: once per turn — a second self-destroy draws nothing', !G.enemy.field.includes(f2) && G.enemy.hand.length===h1); }
{ fresh('player'); put(AZIERU,'player'); const f=stick('player',1,1,{name:'Fodder'}); const sz=inHand(SAZ52); A.playFromHand(sz.uid); drainTasks();
  const h0=G.player.hand.length; tap(f); drainTasks(); for (let i=0;i<3 && document.body && (modal()||G.mode!=='idle');i++){ if(!press(/Take none|Don't|Skip/)) { if (G.mode!=='idle'){ A.cancelAction(); drainTasks(); } else break; } }
  ok('Alpha Azieru: player Sazabi GD05-052 destroys a Unit — draw 1', !G.player.field.includes(f) && /Alpha Azieru.*draw 1/.test(logs()), logs()); }
{ fresh('player'); const s49=put(SAZ49,'player'); put(AZIERU,'enemy'); const ef=stick('enemy',1,1,{name:'EnemyFodder'}); const tgt=stick('enemy',1,9,{rested:true,name:'T'}); const f=stick('player',1,1,{name:'Fodder'});
  const h0=G.enemy.hand.length; attack(s49,tgt); press(/Fodder/); passAll();
  ok('Alpha Azieru: player Sazabi GD05-049 makes the AI destroy a non-battling Unit — the AI draws 1', !G.enemy.field.includes(ef) && G.enemy.hand.length-h0===1, `drew ${G.enemy.hand.length-h0}`); }
{ fresh('player'); put(AZIERU,'player'); const f=stick('player',1,1); const h0=G.player.hand.length; A.gd05DestroyUnit(f, G.player, false, 'cost'); drainTasks();
  ok('Alpha Azieru: a Unit destroyed as a cost (gd05DestroyUnit cause "cost") draws nothing', G.player.hand.length===h0); }

// ===================== White Ark =====================
function gunEzPlayer(choice){
  fresh('player'); G.player.base=card(WARK,'player'); const own=put(GUNEZ5,'player'); const e=stick('enemy',2,2,{lv:3});
  play(inHand(GUNEZ4)); let m=null;
  for (let i=0;i<5;i++){ m=modal(); if (m && /instead/.test(m.msg)) break; if (m){ if(!pressUnit(own)) pressUnit(e); } else if (G.mode!=='idle'){ A.fieldClick(own.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); } else break; }
  m=modal(); const asked=!!m && /White Ark/.test(m.msg) && /instead/.test(m.msg);
  if (asked) press(choice);
  return { own, e, asked, b:G.player.base };
}
{ const r=gunEzPlayer(/^Rest White Ark/);
  ok('White Ark: player Gun EZ — asked whether to rest White Ark instead', r.asked);
  ok('White Ark: player takes it — Base rested, own Unit stays active, enemy rested', r.b.rested && !r.own.rested && r.e.rested, `b ${r.b.rested} own ${r.own.rested} e ${r.e.rested}`); }
{ const r=gunEzPlayer(/^Rest Gun EZ/);
  ok('White Ark: player declines — own Unit rested, Base stays active, enemy rested', r.asked && !r.b.rested && r.own.rested && r.e.rested, `b ${r.b.rested} own ${r.own.rested} e ${r.e.rested}`); }
{ fresh('enemy'); G.enemy.base=card(WARK,'enemy'); const own=put(GUNEZ5,'enemy'); const e=stick('player',2,2,{lv:3});
  const g=put(GUNEZ4,'enemy'); A.runTrigger(g, G.enemy, A.parseTrigger(g.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('White Ark (AI): rests the Base instead of its own Unit', G.enemy.base.rested && !own.rested && e.rested, `b ${G.enemy.base.rested} own ${own.rested} e ${e.rested}`); }
{ fresh('player'); G.enemy.base=card(WARK,'enemy'); const own=put(GUNEZ5,'enemy'); const e=stick('player',2,2,{lv:3});
  const g=put(GUNEZ4,'enemy'); A.runTrigger(g, G.enemy, A.parseTrigger(g.effect,'Deploy'), 'Deploy'); drainTasks();
  ok("White Ark: not during the opponent's turn — the Unit is rested", !G.enemy.base.rested && own.rested); }
{ fresh('player'); G.player.base=card(WARK,'player'); const own=put(GUNEZ5,'player'); const e=stick('enemy',2,2,{lv:3}); G.player.base.rested=true;
  play(inHand(GUNEZ4)); for (let i=0;i<4 && (modal()||G.mode!=='idle');i++){ if (modal()){ if(!pressUnit(own)) pressUnit(e); } else { A.fieldClick(own.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); } }
  ok('White Ark: already rested — no offer, own Unit rested', !modal() && own.rested && e.rested); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
for (const f of fail) console.log('  FAIL '+f);
console.log('Errors:', H.ERRORS.length);
for (const e of H.ERRORS.slice(0,6)) console.log('  ', e.phase, e.msg, e.stack);
