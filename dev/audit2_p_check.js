// Audit 2, group p (player choices): the human player gets the choice the card text promises — a chooser when two or more legal
// Units/cards qualify, a yes/no (or a decline button) for every "you may" even with one — through the real UI path (modal
// buttons, deck-look overlay, card picker, discard mode, board taps), while the AI keeps resolving the same effects itself.
// Also: field-tap messages for attack restrictions that used to throw, a discard owed mid-battle surviving the battle's
// clean-up, and Saint Gabriel Institute's "1 to the top and 1 to the bottom".
const H=require('./harness.js'); const {A}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=940000;
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
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
const pair=(u, id)=>{ const p=typeof id==='string'?card(id, u.owner):id; A.attachPilot(u, p); drainTasks(); return p; };
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
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+' '));
const btnsHave=(m, us)=>!!m && us.every(u=>m.btns.some(b=>b.startsWith(u.name+' ')));
// Pass every action-step / block prompt of a battle.
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (!/Action Step|block|Block|intercept/i.test(m.msg)) break; if (!press(/^Pass|No block|Don't block|Take it/i)) break; } };
const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null;
const ovTitle=()=>{ const o=overlay(); return o ? strip(o.children[0]._h||o.children[0].innerHTML) : null; };
const ovTiles=()=>{ const o=overlay(); return o ? [...o.children[0].children[0].children] : []; };
function pickLook(i){ const t=ovTiles()[i]; if(!t||!t.onclick) return false; t.onclick(); drainTasks(); return true; }
function lookSkip(){ const o=overlay(); if(!o) return false; const b=o.children[0].children.find(x=>/Take none/.test(x.textContent||'')); if(!b) return false; b.onclick(); drainTasks(); return true; }
function pickTiles(uids){ const o=overlay(); if(!o) return false; const box=o.children[0]; const row=box.children[0];
  for (const t of row.children) if (t.style.borderColor==='#34d399') t.onclick();
  for (const t of row.children) if (uids.includes(+t.dataset.uid)) t.onclick();
  const conf=box.children.find(x=>x.dataset && x.dataset.role==='confirm'); if(!conf) return false; conf.onclick(); drainTasks(); return true; }
// G.mode==='discard': what tapping a hand card does (bind()).
function discardPick(c){ const p=G.pending; const s=G.player; s.hand.splice(s.hand.indexOf(c),1); A.sendToTrash(c, s); p.discardLeft--; if (p.discardLeft<=0){ const after=p.after; G.mode='idle'; G.pending=null; if (after) after(); } drainTasks(); }
const attack=(atk, def)=>{ A.fieldClick(atk.uid); drainTasks(); if (def) A.fieldClick(def.uid); else A.attackDirect(); drainTasks(); };
const kill=(u)=>{ const own=u.owner==='player'?G.player:G.enemy, foe=own===G.player?G.enemy:G.player; A.applyToTarget(stick(foe.who,1,1), foe, {kind:'damage', amount:99}, u, 'T'); drainTasks(); };
const promptText=()=>el('prompt').textContent||'';

// ===== Saint Gabriel Institute ST02-015 — "look at the top 2 cards of your deck and return 1 to the top and 1 to the bottom" =====
{ fresh('player'); const g1=card('ST01-001','player'), w=card('ST02-001','player'); G.player.deck.push(g1, w); const d0=G.player.deck.length; const sg=card('ST02-015','player'); G.player.hand=[sg];
  A.playFromHand(sg.uid); drainTasks(); const title=ovTitle()||''; const i=ovTiles().findIndex(t=>(t.textContent||'')===w.name || (w.img && (t.style.cssText||'').includes(w.img)));
  pickLook(i>=0?i:0); const top=G.player.deck[G.player.deck.length-1];
  ok('Saint Gabriel Institute player: you choose the top card; the other goes to the BOTTOM, nothing is trashed', /BOTTOM/.test(title) && top===w && G.player.deck[0]===g1 && G.player.deck.length===d0 && !G.player.trash.includes(g1), `title "${title}" deck ${G.player.deck.length-d0}`);
  fresh('enemy'); const d1=G.enemy.deck.length; const sg2=put('ST02-015','enemy'); G.enemy.base=sg2; G.enemy.field=[]; A.runTrigger(sg2, G.enemy, A.parseTrigger(sg2.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Saint Gabriel Institute AI: deck size unchanged (1 top, 1 bottom), nothing trashed', G.enemy.deck.length===d1 && G.enemy.trash.length===0, `${G.enemy.deck.length-d1} / ${G.enemy.trash.length}`);
  fresh('enemy'); A.triggerBurst(card('ST02-015','player'), G.player, ()=>{}, true); drainTasks(); const shown=!!overlay(); pickLook(0);
  ok("Saint Gabriel Institute: Burst-deployed on the opponent's turn it still looks (no turn condition is printed)", shown && G.player.base && G.player.base.def==='ST02-015' && G.player.trash.filter(c=>c.def===FILL).length===0);
  fresh('enemy'); const d2=G.player.deck.length; A.triggerBurst(card('ST09-010','player'), G.player, ()=>{}, true); drainTasks();
  ok("Minerva (\"if it is your turn, look at the top 2 …\"): no look on the opponent's turn", !overlay() && G.player.deck.length===d2); }

// ===== G-Exes GD02-022 / G-Bouncer GD03-023 / 9th Tactical Testing Sector GD04-124 — "When you place an EX Resource, choose 1 …" =====
{ fresh('player'); put('GD02-022','player'); const big=stick('player',5,5,{trait:'(AGE System)',name:'AGE big'}), small=stick('player',2,2,{trait:'(AGE System)',name:'AGE small'});
  const src=put('GD03-019','player'); A.resolvePlayerTrigger(src, G.player, A.parseTrigger(src.effect,'When Linked'), 'When Linked', ()=>{}); drainTasks();
  const m=modal(); pressUnit(small);
  ok('G-Exes player: you choose which (AGE System) Unit gains <Breach 2>', btnsHave(m,[big,small]) && A.effBreach(small)===2 && !A.effBreach(big), JSON.stringify(m));
  fresh('enemy'); put('GD02-022','enemy'); const b2=stick('enemy',5,5,{trait:'(AGE System)'}), s2=stick('enemy',2,2,{trait:'(AGE System)'}); const src2=put('GD03-019','enemy');
  A.runTrigger(src2, G.enemy, A.parseTrigger(src2.effect,'When Linked'), 'When Linked'); drainTasks();
  ok('G-Exes AI: its strongest (AGE System) Unit gains <Breach 2>, no prompt', !modal() && A.effBreach(b2)===2 && !A.effBreach(s2)); }
{ fresh('player'); put('GD03-023','player'); const a=stick('player',2,2,{trait:'(AGE System)',name:'AGE small'}), b=stick('player',5,2,{trait:'(AGE System)',name:'AGE big'});
  const src=put('GD03-019','player'); A.resolvePlayerTrigger(src, G.player, A.parseTrigger(src.effect,'When Linked'), 'When Linked', ()=>{}); drainTasks();
  const m=modal(); pressUnit(a);
  ok('G-Bouncer player: you choose which (AGE System) Unit gains <High-Maneuver>', btnsHave(m,[a,b]) && A.effHighManeuver(a) && !A.effHighManeuver(b), JSON.stringify(m));
  fresh('enemy'); put('GD03-023','enemy'); const a2=stick('enemy',2,2,{trait:'(AGE System)'}), b2=stick('enemy',5,2,{trait:'(AGE System)'}); const src2=put('GD03-019','enemy');
  A.runTrigger(src2, G.enemy, A.parseTrigger(src2.effect,'When Linked'), 'When Linked'); drainTasks();
  ok('G-Bouncer AI: its strongest (AGE System) Unit, no prompt', !modal() && A.effHighManeuver(b2) && !A.effHighManeuver(a2)); }
{ fresh('player'); G.player.base=card('GD04-124','player'); const a=stick('player',2,2,{trait:'(Academy)',name:'Ac small'}), b=stick('player',5,2,{trait:'(Academy)',name:'Ac big'});
  const src=put('GD03-019','player'); A.resolvePlayerTrigger(src, G.player, A.parseTrigger(src.effect,'When Linked'), 'When Linked', ()=>{}); drainTasks();
  const m=modal(); pressUnit(a);
  ok('9th Tactical Testing Sector player: you choose which (Academy) Unit gets AP+2', btnsHave(m,[a,b]) && A.effAp(a)===4 && A.effAp(b)===5, JSON.stringify(m)); }

// ===== Calamity Gundam GD02-009 — "When this Unit's AP is reduced by an enemy effect, choose 1 rested enemy Unit. Deal 2 damage to it." =====
{ fresh('enemy'); put('GD02-009','player'); const e1=stick('enemy',2,5,{rested:true}), e2=stick('enemy',5,5,{rested:true}); const src=put('GD02-013','enemy');
  A.runTrigger(src, G.enemy, {kind:'debuff',amount:2,scope:'enemy',dur:'turn',filter:null}, 'Deploy'); drainTasks();
  const m=modal(); pressUnit(e1);
  ok('Calamity Gundam player: you choose which rested enemy Unit takes 2', btnsHave(m,[e1,e2]) && e1.hp===3 && e2.hp===5, JSON.stringify(m));
  fresh('player'); put('GD02-009','enemy'); const p1=stick('player',2,5,{rested:true}), p2=stick('player',5,5,{rested:true}); const src2=put('GD02-013','player');
  A.runTrigger(src2, G.player, {kind:'debuff',amount:2,scope:'enemy',dur:'turn',filter:null}, 'Deploy'); drainTasks();
  ok('Calamity Gundam AI: deals 2 to a rested enemy Unit itself', !modal() && (p1.hp===3 || p2.hp===3)); }

// ===== Graze Ritter (Ground Type) GD02-083 — 【Destroyed】If it is your opponent's turn, choose 1 of your (Gjallarhorn) Units. Set it as active. =====
{ fresh('enemy'); const gr=put('GD02-083','player',{rested:true}); const g1=put('GD02-077','player',{rested:true}); const g2=put('GD02-082','player',{rested:true});
  A.resolveAiAttack(stick('enemy',9,9), ()=>{}, gr); drainTasks(); passAll(); const m=modal(); pressUnit(g2);
  ok('Graze Ritter (Ground Type) player: you choose which rested (Gjallarhorn) Unit is set active', btnsHave(m,[g1,g2]) && !g2.rested && g1.rested, JSON.stringify(m));
  fresh('player'); const gr2=put('GD02-083','enemy',{rested:true}); const h1=put('GD02-077','enemy',{rested:true}); const h2=put('GD02-082','enemy',{rested:true}); kill(gr2);
  ok('Graze Ritter (Ground Type) AI: sets one of its (Gjallarhorn) Units active itself', !modal() && (!h1.rested || !h2.rested)); }

// ===== Gundam Mk-II (AEUG) GD02-071 / Al-Saachez's AEU Enact Custom GD04-070 — "you may pair 1 … Pilot card from your hand" =====
{ fresh('player'); G.player.base=card('GD01-130','player'); const mk=card('GD02-071','player'), kam=card('GD02-097','player'); G.player.hand=[mk, kam];
  A.playFromHand(mk.uid); drainTasks(); const offered=!!overlay(); lookSkip();
  ok('Gundam Mk-II (AEUG) player: one (AEUG) Pilot in hand — you are still asked, and may decline', offered && !mk.pilot && G.player.hand.includes(kam));
  fresh('player'); G.player.base=card('GD01-130','player'); const mk2=card('GD02-071','player'), kam2=card('GD02-097','player'); G.player.hand=[mk2, kam2];
  A.playFromHand(mk2.uid); drainTasks(); pickLook(0);
  ok('Gundam Mk-II (AEUG) player: …or pair it', mk2.pilotCard===kam2 && !G.player.hand.includes(kam2));
  fresh('enemy'); G.enemy.base=card('GD01-130','enemy'); const mk3=put('GD02-071','enemy'); const kam3=card('GD02-097','enemy'); G.enemy.hand=[kam3];
  A.runTrigger(mk3, G.enemy, A.parseTrigger(mk3.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Gundam Mk-II (AEUG) AI: pairs its (AEUG) Pilot', mk3.pilotCard===kam3 && !overlay()); }
{ fresh('player'); const ae=card('GD04-070','player'), ali=card('GD04-099','player'); G.player.hand=[ae, ali]; A.playFromHand(ae.uid); drainTasks(); const offered=!!overlay(); lookSkip();
  ok("Al-Saachez's AEU Enact Custom player: asked even with one Ali al-Saachez Pilot; declining keeps it in hand", offered && !ae.pilot && G.player.hand.includes(ali));
  fresh('enemy'); const ae2=put('GD04-070','enemy'); const ali2=card('GD04-099','enemy'); G.enemy.hand=[ali2]; A.runTrigger(ae2, G.enemy, A.parseTrigger(ae2.effect,'Deploy'), 'Deploy'); drainTasks();
  ok("Al-Saachez's AEU Enact Custom AI: pairs Ali al-Saachez", ae2.pilotCard===ali2); }

// ===== AEU Enact Demonstration Color GD03-081 / Immortal Colasour GD03-120 — tapping a Unit that can't attack =====
{ fresh('player'); const e=put('GD03-081','player'); stick('enemy',1,9,{rested:true}); let err=null, msg='';
  try { A.fieldClick(e.uid); msg=promptText(); drainTasks(); } catch(x){ err=x.message; }
  ok('AEU Enact Demonstration Color: tapping it with no (Superpower Bloc)/(UN) Unit deployed says why it can\'t attack (no crash)', !err && G.mode==='idle' && /only attack during a turn/.test(msg), err||msg);
  fresh('player'); const atk=stick('player',5,5,{name:'Killer',trait:'(UN)'}); const r=stick('player',2,2,{name:'RestedUN',trait:'(Superpower Bloc)',rested:true}); const foe=stick('enemy',1,2,{rested:true,name:'Foe'});
  const cmd=card('GD03-120','player'); G.player.hand.push(cmd); A.playFromHand(cmd.uid); drainTasks(); press(/Command effect/); attack(atk, foe); passAll(); pressUnit(r);
  stick('enemy',1,2,{rested:true}); let err2=null, msg2='';
  try { A.fieldClick(r.uid); msg2=promptText(); drainTasks(); } catch(x){ err2=x.message; }
  ok("Immortal Colasour: the Unit it set active can't attack this turn — tapping it says so (no crash)", !r.rested && !err2 && G.mode==='idle' && /can't attack during this turn/.test(msg2), err2||msg2); }

// ===== Rouei GD03-067 — 【Deploy】You may choose 1 of your Units. Deal 1 damage to it. It gets AP+1 during this turn. =====
{ fresh('player'); const r=card('GD03-067','player'); G.player.hand=[r]; A.playFromHand(r.uid); drainTasks(); const m=modal(); press(/Don't/);
  ok('Rouei player: alone in play — you are asked and may decline (no self-damage)', !!m && /deal 1 damage/.test(m.msg) && r.hp===r.maxHp, JSON.stringify(m));
  fresh('player'); const r2=card('GD03-067','player'); G.player.hand=[r2]; A.playFromHand(r2.uid); drainTasks(); press(/^Yes/);
  ok('Rouei player: …or accept: it takes 1 and gets AP+1', r2.hp===r2.maxHp-1 && A.effAp(r2)===r2.baseAp+1);
  fresh('player'); const tok=stick('player',1,3,{token:true,name:'Tok'}); const r3=card('GD03-067','player'); G.player.hand=[r3]; A.playFromHand(r3.uid); drainTasks(); press(/^Yes/);
  const offered=G.mode==='trigger-target' && G.pending.cands.includes(tok.uid); if (offered){ A.fieldClick(tok.uid); drainTasks(); }
  ok('Rouei player: a Unit token is one of "your Units" and can be chosen', offered && tok.hp===2 && r3.hp===r3.maxHp);
  fresh('enemy'); const r4=put('GD03-067','enemy'); A.runTrigger(r4, G.enemy, A.parseTrigger(r4.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Rouei AI: resolves it itself, no prompt', !modal() && r4.hp===r4.maxHp-1); }

// ===== Freedom Gundam (METEOR) GD03-076 — "you may return the enemy Unit to its owner's hand" =====
{ for (const yes of [false,true]){ fresh('player'); put('GD03-076','player'); const t=stick('player',3,9,{trait:'(Triple Ship Alliance)'}); const foe=stick('enemy',1,9,{rested:true});
    attack(t, foe); passAll(); const m=modal(); press(yes?/Return it/:/Don't/);
    ok(`Freedom Gundam (METEOR) player: you are asked whether to return the enemy Unit (${yes?'yes':'no'})`, !!m && /return it/i.test(m.msg) && G.enemy.field.includes(foe)===!yes && G.enemy.hand.includes(foe)===yes, JSON.stringify(m)); }
  fresh('enemy'); put('GD03-076','enemy'); const t2=stick('enemy',3,9,{trait:'(Triple Ship Alliance)'}); const mine=stick('player',1,9,{rested:true});
  A.resolveAiAttack(t2, ()=>{}, mine); drainTasks(); passAll();
  ok('Freedom Gundam (METEOR) AI: returns your Unit itself', G.player.hand.includes(mine)); }

// ===== Azee Gurumin GD03-095 — "When this Unit receives effect damage, choose 1 enemy Unit. It gets AP-1 during this turn." =====
{ fresh('enemy'); const h=stick('player',3,6,{name:'Host'}); pair(h, 'GD03-095'); const f1=stick('enemy',4,4,{name:'FoeA'}); const src=stick('enemy',1,1,{name:'Src'});
  G.effSrc=src; A.damage(h,1,G.player,'effect',src); drainTasks(); const m=modal(); pressUnit(src);
  ok('Azee Gurumin player: you choose which enemy Unit gets AP-1', btnsHave(m,[f1,src]) && A.effAp(src)===0 && A.effAp(f1)===4, JSON.stringify(m));
  fresh('player'); const h2=stick('enemy',3,6); pair(h2, 'GD03-095'); const p1=stick('player',4,4), p2=stick('player',1,1); G.effSrc=p2; A.damage(h2,1,G.enemy,'effect',p2); drainTasks();
  ok('Azee Gurumin AI: debuffs your strongest Unit itself', !modal() && A.effAp(p1)===3); }

// ===== Wistario Afam GD03-097 — "look at the top 2 cards of your deck and return 1 to the top. Place the remaining card into your trash." =====
{ fresh('player'); const h=stick('player',5,5,{name:'Host',link:['Wistario Afam']}); pair(h, 'GD03-097'); const x=card('ST01-001','player'); G.player.deck.push(x); const d0=G.player.deck.length;
  const foe=stick('enemy',1,1,{rested:true}); attack(h, foe); passAll(); const shown=!!overlay(); const second=G.player.deck[G.player.deck.length-2];
  pickLook(1);   // keep the second card
  ok('Wistario Afam player: you look at the top 2 and choose which stays on top (the other is trashed)', shown && G.player.deck[G.player.deck.length-1]===second && G.player.trash.includes(x) && G.player.deck.length===d0-1);
  fresh('enemy'); const h2=stick('enemy',5,5,{link:['Wistario Afam']}); pair(h2, 'GD03-097'); const d1=G.enemy.deck.length; const mine=stick('player',1,1,{rested:true});
  A.resolveAiAttack(h2, ()=>{}, mine); drainTasks(); passAll();
  ok('Wistario Afam AI: keeps one, trashes one itself', !overlay() && G.enemy.deck.length===d1-1 && G.enemy.trash.filter(c=>c.def===FILL).length===1); }

// ===== Doritea GD03-128 — "when one of your Units is rested by one of your opponent's effects, choose 1 enemy Unit. Deal 1 damage to it." =====
{ fresh('enemy'); G.player.base=card('GD03-128','player'); G.player.base.hp=5; const mine=stick('player',1,3,{name:'Mine'}); const e1=stick('enemy',1,5,{name:'E1'}), e2=stick('enemy',1,5,{name:'E2'});
  A.runTrigger(card('GD03-087','enemy'), G.enemy, {kind:'rest',filter:{}}, 'Main'); drainTasks(); const m=modal(); pressUnit(e2);
  ok('Doritea player: you choose which enemy Unit takes 1', mine.rested && btnsHave(m,[e1,e2]) && e2.hp===4 && e1.hp===5, JSON.stringify(m));
  fresh('player'); G.enemy.base=card('GD03-128','enemy'); G.enemy.base.hp=5; const theirs=stick('enemy',1,3); const p1=stick('player',1,5), p2=stick('player',1,5);
  A.runTrigger(card('GD03-087','player'), G.player, {kind:'rest',filter:{}}, 'Main'); drainTasks();
  ok('Doritea AI: pings one of your Units itself', theirs.rested && !modal() && (p1.hp===4 || p2.hp===4)); }

// ===== Hotarubi GD03-129 — "you may rest this Base. If you do, place the top card of your deck into your trash." =====
{ for (const yes of [true,false]){ fresh('player'); G.player.base=card('GD03-129','player'); G.player.base.hp=5; const t=stick('player',1,5,{trait:'(Tekkadan)'}); G.player.deck.length=8;
    const src=stick('enemy',1,1); G.effSrc=src; A.damage(t,1,G.player,'effect',src); drainTasks(); const m=modal(); press(yes?/Rest/:/Don't/);
    ok(`Hotarubi player: you are asked (even with a short deck) — ${yes?'yes: it rests and mills 1':'no: nothing happens'}`, !!m && G.player.base.rested===yes && G.player.trash.length===(yes?1:0) && G.player.deck.length===(yes?7:8), JSON.stringify(m)); }
  fresh('enemy'); G.enemy.base=card('GD03-129','enemy'); G.enemy.base.hp=5; const t2=stick('enemy',1,5,{trait:'(Tekkadan)'}); const src2=stick('player',1,1); G.effSrc=src2; A.damage(t2,1,G.enemy,'effect',src2); drainTasks();
  ok('Hotarubi AI: rests and mills with a deep deck, no prompt', !modal() && G.enemy.base.rested && G.enemy.trash.length===1); }

// ===== Kudelia Aina Bernstein & Isaribi EB01-085 — "Then, you may choose 1 active friendly blue (G Generation) Unit and 1 enemy Unit. Rest them." =====
{ fresh('player'); const g=put('EB01-016','player'); const e=stick('enemy',3,3); const c=card('EB01-085','player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks();
  const m=modal(); press(/Don't/);
  ok('Kudelia & Isaribi player: one candidate each — you are still asked; declining rests nothing', !!m && /rest/i.test(m.msg) && !g.rested && !e.rested, JSON.stringify(m));
  fresh('player'); const g2=put('EB01-016','player'); const e2=stick('enemy',3,3); const c2=card('EB01-085','player'); G.player.hand.push(c2); A.playFromHand(c2.uid); drainTasks(); press(/^Yes/);
  ok('Kudelia & Isaribi player: …accepting rests both', g2.rested && e2.rested);
  fresh('enemy'); const ga=put('EB01-016','player'), gb=put('EB01-016','player'); const ea=stick('enemy',3,3), eb=stick('enemy',4,4);
  A.triggerBurst(card('EB01-085','player'), G.player, ()=>{}, true); drainTasks(); press(/^Yes/); const m1=modal(); press(/./); const m2=modal(); pressUnit(eb);
  ok("Kudelia & Isaribi Burst on the opponent's turn: you choose your Unit and the enemy Unit from choosers", !!m1 && !!m2 && [ga,gb].filter(x=>x.rested).length===1 && eb.rested && !ea.rested, JSON.stringify([m1,m2]));
  fresh('enemy'); const g3=put('EB01-016','enemy'); const p=stick('player',3,3); const k=put('EB01-085','enemy'); A.runTrigger(k, G.enemy, A.parseTrigger(k.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Kudelia & Isaribi AI: rests one of its blue (G Generation) Units and yours itself', !modal() && (g3.rested || k.rested) && p.rested); }

// ===== Gundam Rose GD05-044 / Gundam Maxter GD05-069 / Dragon Gundam GD05-035 — "【During Link】【Attack】Activate 【Main】 on the card paired with this Unit." =====
const pairCmd=(u, cmdId)=>{ const c=card(cmdId,'player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks(); press(/Pilot/); if (G.mode!=='idle'){ A.fieldClick(u.uid); drainTasks(); } press(new RegExp(esc(u.name))); drainTasks(); return c; };
{ fresh('player'); const u=put('GD05-069','player'); pairCmd(u,'GD05-121'); const e=stick('enemy',5,9,{rested:true,name:'E'}), e2=stick('enemy',6,9,{name:'E2'});
  attack(u, e); const tap=G.mode==='trigger-target' && G.pending.cands.includes(e.uid) && G.pending.cands.includes(e2.uid); if (tap){ A.fieldClick(e2.uid); drainTasks(); } passAll();
  ok('Gundam Maxter + Cyclone Punch player: you choose which enemy Unit gets AP-2', u.linked && tap && A.effAp(e2)===4 && A.effAp(e)===5, `linked ${u.linked} mode ${G.mode}`);
  fresh('player'); const r=put('GD05-044','player'); pairCmd(r,'GD05-113'); const other=stick('player',2,2,{trait:'(MF)',name:'OtherMF'}); const e3=stick('enemy',5,9,{rested:true});
  attack(r, e3); const m=modal(); pressUnit(other); passAll();
  ok('Gundam Rose + Rose Screamer player: you choose which (MF) Unit gets AP+2', r.linked && btnsHave(m,[r,other]) && A.effAp(other)===4, JSON.stringify(m));
  fresh('enemy'); const ru=put('GD05-044','enemy'); A.attachPilot(ru, card('GD05-113','enemy')); drainTasks(); const om=stick('enemy',2,2,{trait:'(MF)'}); const p=stick('player',1,9,{rested:true}); const ap0=A.effAp(ru)+A.effAp(om);
  A.resolveAiAttack(ru, ()=>{}, p); drainTasks(); passAll();
  ok('Gundam Rose AI: its paired card\'s 【Main】 still resolves on its own (no prompt)', !modal() && (ru.linked ? A.effAp(ru)+A.effAp(om)>=ap0 : true)); }

// ===== Strike Freedom Gundam GD05-002 — "【Deploy】Choose 1 to 2 of your Units. During this turn, when they destroy an enemy card with battle damage, draw 1." =====
{ fresh('player'); const a=stick('player',3,3,{name:'A1'}), b=stick('player',3,3,{name:'B1'}), c=stick('player',3,3,{name:'C1'}); const sf=card('GD05-002','player'); G.player.hand=[sf];
  A.playFromHand(sf.uid); drainTasks(); const m1=modal(); pressUnit(b); const m2=modal(); pressUnit(c);
  ok('Strike Freedom Gundam player: you choose 1 to 2 of your Units for the on-kill draw', !!m1 && !!m2 && b.killDrawTurn && c.killDrawTurn && !a.killDrawTurn && !sf.killDrawTurn, JSON.stringify(m1));
  fresh('player'); const a2=stick('player',3,3,{name:'A2'}), b2=stick('player',3,3,{name:'B2'}); const sf2=card('GD05-002','player'); G.player.hand=[sf2];
  A.playFromHand(sf2.uid); drainTasks(); pressUnit(a2); press(/^Done$/);
  ok('Strike Freedom Gundam player: …or just 1 (Done)', a2.killDrawTurn && !b2.killDrawTurn && !sf2.killDrawTurn);
  fresh('enemy'); const x=stick('enemy',1,1), y=stick('enemy',4,4); const sf3=put('GD05-002','enemy'); A.runTrigger(sf3, G.enemy, A.parseTrigger(sf3.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Strike Freedom Gundam AI: picks its two strongest itself', !modal() && sf3.killDrawTurn && y.killDrawTurn && !x.killDrawTurn); }

// ===== Gundam Calibarn GD05-018 — "When one of your EX Resources is exiled from the game, you may choose 1 of your Units. … reduce it by 3." =====
{ fresh('player'); const cb=put('GD05-018','player'); const o=stick('player',1,9,{name:'O'}); G.player.ex=1; G.player.resMax=0; G.player.resAvail=1; A.payCost(G.player, 1); drainTasks();
  const m=modal(); pressUnit(o);
  ok('Gundam Calibarn player: you choose which of your Units gets the reduction', btnsHave(m,[cb,o]) && m.btns.some(b=>/Don't/.test(b)) && o.dmgReduce===3 && !cb.dmgReduce, JSON.stringify(m));
  fresh('player'); const cb2=put('GD05-018','player'); G.player.ex=1; G.player.resMax=0; G.player.resAvail=1; A.payCost(G.player, 1); drainTasks(); const m2=modal(); press(/Don't/);
  ok('Gundam Calibarn player: "you may" — asked even when it is your only Unit, and you may decline', !!m2 && !cb2.dmgReduce);
  fresh('enemy'); const cb3=put('GD05-018','enemy'); G.enemy.ex=1; G.enemy.resMax=0; G.enemy.resAvail=1; A.payCost(G.enemy, 1); drainTasks();
  ok('Gundam Calibarn AI: takes the reduction itself', !modal() && cb3.dmgReduce===3); }

// ===== Gundam Heavyarms Custom (EW) GD05-079 — "If you have another (G Team)/(Preventer) Unit in play, choose 1 enemy Unit that is Lv.4 or lower." =====
{ fresh('player'); const h=put('GD05-079','player'); stick('player',1,1,{trait:'(Preventer)'}); const e4=stick('enemy',3,3,{lv:4}), e5=stick('enemy',3,3,{lv:5});
  A.startActivate(h); drainTasks(); const cands=(G.activateCands||[]).slice(); if (G.mode==='activate-target'){ A.fieldClick(e5.uid); drainTasks(); A.fieldClick(e4.uid); drainTasks(); }
  ok('Gundam Heavyarms Custom (EW) player: only Lv.4-or-lower enemy Units can be chosen', cands.length===1 && cands[0]===e4.uid && A.effAp(e4)===2 && A.effAp(e5)===3, JSON.stringify(cands)); }

// ===== Domon Kasshu GD05-097 — 【When Paired】Draw 1. Then, discard 1. If you discard a (Special Move) Command card with this effect, you may activate its 【Main】. =====
{ fresh('player'); const u=stick('player',1,5,{name:'Host'}); const rs=card('GD05-113','player'), ma=card('ST01-002','player'); G.player.hand=[rs, ma]; const mf=stick('player',2,2,{trait:'(MF)',name:'MF'}), mfb=stick('player',3,3,{trait:'(MF)',name:'MFb'});
  pair(u, 'GD05-097'); const disc=G.mode==='discard'; if (disc) discardPick(rs); const m=modal(); press(/Activate it/); const m2=modal(); if (m2) pressUnit(mf); press(/Don't pair/); drainTasks();
  ok('Domon Kasshu player: you choose the discard; discarding a (Special Move) Command asks whether to activate its 【Main】 (with your own target)', disc && !!m && /activate its/.test(m.msg) && btnsHave(m2,[mf,mfb]) && A.effAp(mf)===4 && A.effAp(mfb)===3 && G.player.trash.includes(rs), JSON.stringify([m,m2]));
  fresh('player'); const u2=stick('player',1,5); const rs2=card('GD05-113','player'), ma2=card('ST01-002','player'); G.player.hand=[rs2, ma2]; const mf2=stick('player',2,2,{trait:'(MF)'});
  pair(u2, 'GD05-097'); if (G.mode==='discard') discardPick(rs2); press(/Don't/);
  ok('Domon Kasshu player: …and may decline', A.effAp(mf2)===2 && G.player.trash.includes(rs2) && G.mode==='idle');
  fresh('player'); const u3=stick('player',1,5); const ma3=card('ST01-002','player'); G.player.hand=[ma3]; pair(u3, 'GD05-097'); const disc3=G.mode==='discard'; if (disc3) discardPick(ma3);
  ok('Domon Kasshu player: discarding another card asks nothing more', disc3 && !modal() && G.player.trash.includes(ma3));
  fresh('enemy'); const u4=stick('enemy',1,5); G.enemy.hand=[card('GD05-113','enemy')]; stick('enemy',2,2,{trait:'(MF)'}); pair(u4, 'GD05-097');
  ok('Domon Kasshu AI: resolves it itself (no discard mode, no prompt)', G.mode==='idle' && !modal() && G.enemy.hand.length===1 && !G.enemy.hand.some(c=>c.def==='GD05-113')); }

// ===== Noin's Taurus GD05-074 — 【Destroyed】Draw 1. Then, discard 1. =====
{ fresh('enemy'); const n=put('GD05-074','player',{rested:true}); const h1=card('ST01-002','player'), h2=card('ST01-003','player'); G.player.hand=[h1,h2];
  A.resolveAiAttack(stick('enemy',5,9), ()=>{}, n); drainTasks(); passAll(); const disc=G.mode==='discard'; if (disc) discardPick(h2);
  ok("Noin's Taurus player (destroyed in battle): you choose the discard", disc && G.player.trash.includes(h2) && G.player.hand.includes(h1) && G.player.hand.length===2);
  fresh('player'); const n2=put('GD05-074','player'); G.player.hand=[card('ST01-002','player'),card('ST01-003','player')]; const g=put('GD05-057','player',{rested:true}); A.startActivate(g); drainTasks(); press(/Noin/);
  ok("Noin's Taurus player (destroyed as a cost): you choose the discard", !G.player.field.includes(n2) && G.mode==='discard');
  fresh('player'); const n3=put('GD05-074','enemy'); G.enemy.hand=[card('ST01-002','enemy')]; kill(n3);
  ok("Noin's Taurus AI: draws and discards itself", G.mode==='idle' && G.enemy.hand.length===1); }

// ===== At the Risk of One's Life GD05-104 — ■【During Link】【Destroyed】Choose 1 friendly (League Militaire) Unit. Set it as active. =====
{ fresh('enemy'); const sh=stick('player',3,2,{rested:true,trait:'(League Militaire) (Shrike Team)',name:'Shrike',link:['X']}); pair(sh, vpilot('player','X'));
  const big=stick('player',5,5,{rested:true,trait:'(League Militaire)',name:'LM big'}), small=stick('player',1,1,{rested:true,trait:'(League Militaire)',name:'LM small'});
  G.player.hand=[card('GD05-104','player')]; A.resolveAiAttack(stick('enemy',5,9), ()=>{}, sh); drainTasks(); press(/Don't/); press(/Risk/); if (G.mode==='trigger-target'){ A.fieldClick(sh.uid); drainTasks(); }
  passAll(); const m=modal(); pressUnit(small);
  ok("At the Risk of One's Life player: you choose which rested (League Militaire) Unit is set active", !G.player.field.includes(sh) && btnsHave(m,[big,small]) && !small.rested && big.rested, JSON.stringify(m));
  fresh('player'); const sh2=stick('enemy',3,2,{trait:'(League Militaire)'}); sh2.tempOnDestroyed={ turnSeq:G.turnSeq, readyTrait:'league militaire', link:false };
  const b2=stick('enemy',5,5,{rested:true,trait:'(League Militaire)'}), s2=stick('enemy',1,1,{rested:true,trait:'(League Militaire)'}); kill(sh2);
  ok("At the Risk of One's Life AI: sets its best one active itself", !modal() && !b2.rested && s2.rested); }

// ===== Gundam AGE-2 Normal (SP Ver.) GD05-024 — the discard after "Add it to your hand. If you do, discard 1." survives the battle =====
{ fresh('enemy'); const a=put('GD05-024','player',{rested:true}); G.player.trash.push(card('GD05-086','player'), card('GD05-081','player')); G.player.hand=[card('ST01-001','player'),card('ST01-002','player')];
  A.resolveAiAttack(stick('enemy',9,9), ()=>{}, a); drainTasks(); if (overlay()) pickLook(0); passAll(); A.render(); drainTasks(); const disc=G.mode==='discard'; if (disc) discardPick(G.player.hand[0]);
  ok('Gundam AGE-2 Normal (SP Ver.) player: destroyed in an AI attack — the "discard 1" is still owed after the battle and you choose it', disc && G.player.hand.length===2, `mode ${G.mode} hand ${G.player.hand.length}`); }

// ===== Girty Lue GD05-127 — "When a friendly (Phantom Pain) Unit links, choose 1 enemy Unit. It can't activate <Blocker> during this turn." =====
{ fresh('player'); G.player.base=card('GD05-127','player'); const b1=stick('enemy',1,5,{blocker:true}), b2=stick('enemy',1,3,{blocker:true}); const ab=put('ST11-010','player'); pair(ab,'GD05-092');
  const m=modal(); pressUnit(b2);
  ok('Girty Lue player: you choose which enemy Unit loses <Blocker>', ab.linked && btnsHave(m,[b1,b2]) && b2.noBlockTurn===G.turnSeq && b1.noBlockTurn!==G.turnSeq, JSON.stringify(m));
  fresh('enemy'); G.enemy.base=card('GD05-127','enemy'); const p1=stick('player',1,5,{blocker:true}), p2=stick('player',1,3,{blocker:true}); const ab2=put('ST11-010','enemy'); pair(ab2,'GD05-092');
  ok('Girty Lue AI: picks your toughest Blocker itself', !modal() && p1.noBlockTurn===G.turnSeq && p2.noBlockTurn!==G.turnSeq); }

// ===== Gryphios 2 ST14-016 — "when a friendly Unit links, choose 1 enemy Unit that is Lv.5 or lower. It gets AP-1 during this turn." =====
{ fresh('player'); G.player.base=card('ST14-016','player'); const e1=stick('enemy',3,3,{lv:5}), e2=stick('enemy',4,4,{lv:5}), e3=stick('enemy',4,4,{lv:6}); const u=put('ST11-010','player'); pair(u,'GD05-092');
  const m=modal(); pressUnit(e1);
  ok('Gryphios 2 player: you choose which Lv.5-or-lower enemy Unit gets AP-1', btnsHave(m,[e1,e2]) && !m.btns.some(b=>b.startsWith(e3.name+' ')) && A.effAp(e1)===2 && A.effAp(e2)===4, JSON.stringify(m));
  fresh('enemy'); G.enemy.base=card('ST14-016','enemy'); const p1=stick('player',3,3,{lv:5}), p2=stick('player',4,4,{lv:5}); const u2=put('ST11-010','enemy'); pair(u2,'GD05-092');
  ok('Gryphios 2 AI: debuffs your strongest Lv.5-or-lower Unit itself', !modal() && A.effAp(p2)===3 && A.effAp(p1)===3); }

// ===== Trowa Barton GD05-099 — "During your turn, when this Unit destroys an enemy Unit with battle damage, draw 1. Then, discard 1." =====
{ fresh('player'); const u=put('ST01-001','player'); pair(u,'GD05-099'); const f=stick('enemy',1,1,{rested:true}); const h1=card('ST01-002','player'), h2=card('ST01-003','player'); G.player.hand=[h1,h2];
  attack(u, f); passAll(); const disc=G.mode==='discard'; if (disc) discardPick(h1);
  ok('Trowa Barton player: you choose the discard after the on-kill draw', disc && G.player.trash.includes(h1) && G.player.hand.includes(h2) && G.player.hand.length===2);
  fresh('enemy'); const u2=put('ST01-001','enemy'); pair(u2,'GD05-099'); G.enemy.hand=[card('ST01-002','enemy')]; const mine=stick('player',1,1,{rested:true});
  A.resolveAiAttack(u2, ()=>{}, mine); drainTasks(); passAll();
  ok('Trowa Barton AI: draws and discards itself', G.mode==='idle' && G.enemy.hand.length===1 && G.enemy.trash.length===1); }

// ===== Gundam Pharact ST13-009 — "Choose 1 enemy player. That player chooses 2 Unit cards from their trash. Exile them." =====
{ fresh('enemy'); const tr=['ST01-001','ST01-002','ST01-003','ST01-004'].map(id=>card(id,'player')); G.player.trash.push(...tr, card('GD05-110','player'));
  const ph=put('ST13-009','enemy'); A.resolveAiAttack(ph, ()=>{}, stick('player',1,9,{rested:true})); drainTasks(); passAll(); const shown=!!overlay(); pickTiles([tr[0].uid, tr[1].uid]);
  ok('Gundam Pharact (AI) — you, the chosen player, choose which 2 Unit cards leave your trash', shown && G.player.exile.includes(tr[0]) && G.player.exile.includes(tr[1]) && G.player.trash.includes(tr[2]) && G.player.trash.includes(tr[3]));
  fresh('player'); const etr=['ST01-001','ST01-002','ST01-003'].map(id=>card(id,'enemy')); G.enemy.trash.push(...etr); const ph2=put('ST13-009','player'); const r=A.parseTrigger(ph2.effect,'Attack')||A.gatedAttackAction(ph2.effect, ph2);
  A.runTrigger(ph2, G.player, r, 'Attack'); drainTasks();
  ok('Gundam Pharact (yours): the AI chooses its own 2 Unit cards', !overlay() && G.enemy.exile.length===2 && G.enemy.trash.length===1); }

// ===== White Ark GD05-124 — "when you would rest a Unit with a friendly (League Militaire) Unit's effect, you may rest this Base instead." =====
{ for (const sub of [true,false]){ fresh('player'); G.player.base=card('GD05-124','player'); const vd=put('GD04-006','player'); const lm=stick('player',1,3,{trait:'(League Militaire)'}); const e=stick('enemy',1,4);
    A.startActivate(vd); drainTasks(); const m=modal(); press(sub?/Rest White Ark/:/Rest a Unit/); if (G.mode==='activate-cost'){ A.fieldClick(lm.uid); drainTasks(); } if (G.mode==='activate-target'){ A.fieldClick(e.uid); drainTasks(); }
    ok(`White Ark player: you choose to rest ${sub?'the Base':'the (League Militaire) Unit'} for V-Dash Gundam's cost`, !!m && /instead/.test(m.msg) && G.player.base.rested===sub && lm.rested===!sub && e.rested, JSON.stringify(m)); }
  fresh('enemy'); G.enemy.base=card('GD05-124','enemy'); const vd2=put('GD04-006','enemy'); const lm2=stick('enemy',1,3,{trait:'(League Militaire)'}); const p=stick('player',1,4);
  A.applyActivateEffect(vd2, p, G.enemy, null); drainTasks();
  ok('White Ark AI: rests the Base instead itself', !modal() && G.enemy.base.rested && !lm2.rested); }

// ===== GFreD GD06-054 — 【Deploy】You may choose 1 of your Units and 1 enemy Unit. Deal 1 damage to them. =====
{ fresh('player'); const foe=stick('enemy',1,3); const g=card('GD06-054','player'); G.player.hand=[g]; A.playFromHand(g.uid); drainTasks(); const m=modal(); press(/Don't/);
  ok('GFreD player: one Unit each — you are asked and may decline', !!m && g.hp===g.maxHp && foe.hp===3, JSON.stringify(m));
  fresh('player'); const foe2=stick('enemy',1,3); const g2=card('GD06-054','player'); G.player.hand=[g2]; A.playFromHand(g2.uid); drainTasks(); press(/^Yes/);
  ok('GFreD player: …accepting deals 1 to both', g2.hp===g2.maxHp-1 && foe2.hp===2);
  fresh('enemy'); const p=stick('player',1,3); const g3=put('GD06-054','enemy'); A.runTrigger(g3, G.enemy, A.parseTrigger(g3.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('GFreD AI: resolves it itself', !modal() && p.hp===2); }

// ===== the same on-kill choices on other cards: Zeta Gundam GD06-035 (choose 1 enemy Unit), Gundam Maxter GD05-069 (reveal 1 (Special Move) card) =====
{ const zid=[...A.CARD_BY_ID.values()].find(d=>/^GD06-035$/.test(d.id)); if (zid){ fresh('player'); const z=put('GD06-035','player'); const f=stick('enemy',1,1,{rested:true}); const e1=stick('enemy',2,5), e2=stick('enemy',2,5);
    const k=A.parseOnKill(z.effect); if (k && k.kind==='damageEnemy'){ A.applyOnKill(z, G.player, Object.assign({}, k, { yourTurn:false, requireLink:false, requirePair:false, oncePerTurn:false }), null); drainTasks(); const m=modal(); pressUnit(e2);
      ok('Zeta Gundam (on-kill "choose 1 enemy Unit"): you choose', btnsHave(m,[e1,e2]) && e2.hp<5 && e1.hp===5, JSON.stringify(m)); } else ok('Zeta Gundam GD06-035 parses as an on-kill damageEnemy', false, JSON.stringify(k)); } }
{ fresh('player'); const mx=put('GD05-069','player'); const k=A.parseOnKill(mx.effect); const sp=A.GUNDAM_CARDS.find(d=>d.type==='command' && /\(Special Move\)/.test(d.trait||'') && !/-p\d/.test(d.id)); const c=card(sp.id,'player');
  G.player.deck.splice(G.player.deck.length-2, 0, c); A.applyOnKill(mx, G.player, Object.assign({}, k, { yourTurn:false, requireLink:false, requirePair:false, oncePerTurn:false }), null); drainTasks();
  const shown=!!overlay(); const pickable=ovTiles().filter(t=>t.onclick).length; lookSkip();
  ok('Gundam Maxter (on-kill "you may reveal 1 (Special Move) Command card among them"): you choose, and may take none', k && k.kind==='digAdd' && shown && pickable===1 && !G.player.hand.includes(c) && G.player.deck.includes(c)); }

console.log(fail.length ? 'FAILURES:\n  '+fail.join('\n  ') : 'all audit2_p checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+H.ERRORS.length); if (H.ERRORS.length) console.log(H.ERRORS.slice(0,5));
