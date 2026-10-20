// Audit group g3: modal "choose 1 of the following effects" Commands, the 【…・Development N】 cost, alternative play costs
// ("play this card as if it has N Lv. and cost"), optional "You may pay ①/②" and "You may rest this Unit" costs, and the
// "If you place(d) … card with this effect" mill riders. Each case is played through the player's real UI path (the hand
// play, attack declaration, action-step modal, yes/no prompts, card pickers, target choosers) and on the AI side.
const H=require('./harness.js'); const {A}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=930000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
// The card picker overlay (pickCardsOverlay: tiles with data-uid + Confirm) / the deck-look overlay (showLookAtTop: tiles in order).
const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null;
function pickTiles(uids){ const o=overlay(); if(!o) return false; const box=o.children[0]; const row=box.children[0];
  for (const t of row.children) if (t.style.borderColor==='#34d399') t.onclick();   // clear any preselection first
  for (const t of row.children) if (uids.includes(+t.dataset.uid)) t.onclick();
  const conf=box.children.find(x=>x.dataset && x.dataset.role==='confirm'); if(!conf) return false; conf.onclick(); drainTasks(); return true; }
function pickLook(i){ const o=overlay(); if(!o) return false; const row=o.children[0].children[0]; const t=row.children[i]; if(!t||!t.onclick) return false; t.onclick(); drainTasks(); return true; }
// G.mode==='discard': what tapping a hand card does (bind()).
function discardPick(c){ const p=G.pending; const s=G.player; s.hand.splice(s.hand.indexOf(c),1); A.sendToTrash(c, s); p.discardLeft--; if (p.discardLeft<=0){ const after=p.after; G.mode='idle'; G.pending=null; if (after) after(); } drainTasks(); }
const logs=()=>(el('log').children||[]).map(c=>strip(c.innerHTML));
const ggen=['EB01-007','EB01-012','EB01-011'];   // (G Generation) cards for trash costs
const trashOf=(who, ids)=>{ const s=sideOf(who); const cs=ids.map(id=>card(id, who)); s.trash.push(...cs); return cs; };
const plainPilot=[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && !/-p\d+$/.test(d.id) && /^【Burst】Add this card to your hand\.?\s*$/.test(A.plain?A.plain(d.effect):strip(d.effect).trim())) || A.CARD_BY_ID.get('GD01-093');

// ================= 【…・Development N】 =================
// Every Development card: nothing without enough (G Generation) cards in the trash; the AI pays and resolves; the player is
// asked, picks which cards to exile, and the ■ effect follows; declining does nothing.
{
  const devCards=[...A.CARD_BY_ID.values()].filter(d=>!/-p\d+$/.test(d.id) && /Development\s*\d/.test(d.effect||''));
  ok('Development: every card in the pool parses to an exile cost gating its ■ effect', devCards.length>=9 && devCards.every(d=>{
    const kw=(strip(d.effect).match(/【\s*(Deploy|When Paired|When Linked)・Development/)||[])[1]; const a=kw && A.parseTrigger(d.effect, kw);
    return a && a.kind==='trashExile' && a.may && a.development>0 && a.trait==='g generation' && a.inner; }), devCards.map(d=>d.id).join(','));
}
// a fresh board for one Development card; returns probes for its ■ effect
function devBoard(id, who){
  const s=sideOf(who), foe=who==='player'?G.enemy:G.player;
  const hurt=stick(who,2,6,{trait:'(G Generation)'}); hurt.hp=2;
  const restedFoe=stick(foe.who,3,5,{rested:true, lv:3});
  const cmd=card('ST01-012', who); s.trash.push(cmd);   // a Lv.2 Command for ST10-007
  return { s, foe, hurt, restedFoe, cmd };
}
const DEV={
  'EB01-008': { kw:'Deploy', n:1, did:(b)=>b.hurt.hp===4 },
  'EB01-010': { kw:'Deploy', n:3, did:(b)=>b.restedFoe.hp===3 },
  'EB01-025': { kw:'Deploy', n:2, did:(b)=>b.s.ex===1 && b.foe.ex===1 },
  'EB01-027': { kw:'Deploy', n:2, did:(b,u)=>(A.effBreach(u)>=1 || A.effBreach(b.hurt)>=1) },
  'EB01-047': { kw:'When Paired', n:1, did:(b,u)=>u.highManeuver===true },
  'EB01-060': { kw:'When Paired', n:3, did:(b)=>b.foe.hand.includes(b.restedFoe) },
  'ST10-002': { kw:'Deploy', n:2, did:(b)=>b.restedFoe.rested && b.restedFoe._wasActive },
  'ST10-007': { kw:'When Linked', n:2, did:(b)=>b.s.hand.includes(b.cmd) },
  'ST10-008': { kw:'Deploy', n:2, did:(b)=>b.drew },
};
for (const [id, spec] of Object.entries(DEV)){
  const nm=A.CARD_BY_ID.get(id).name;
  // AI: too few (G Generation) cards → no effect, nothing exiled
  for (const have of [spec.n-1, spec.n+1]){
    fresh('enemy'); const b=devBoard(id, 'enemy');
    if (id==='ST10-002'){ b.restedFoe.rested=false; b.restedFoe._wasActive=true; b.restedFoe.hp=4; }
    trashOf('enemy', Array.from({length:have}, (_,i)=>ggen[i%3]));
    const u=put(id, 'enemy');
    const h0=b.s.hand.length; const t0=b.s.trash.length;
    const act=A.parseTrigger(u.effect, spec.kw);
    if (spec.kw==='When Linked'){ u.linked=true; }
    A.runTrigger(u, b.s, act, spec.kw); drainTasks();
    b.drew = b.s.deck.length<20 && b.s.hand.length===h0;   // drew 1, discarded 1
    const did=spec.did(b, u), exiled=b.s.exile.length;
    if (have<spec.n) ok(`${nm} (${id}) AI: with ${have} (G Generation) card(s) in trash, no exile and no effect`, exiled===0 && !did, `exiled ${exiled} did ${did}`);
    else ok(`${nm} (${id}) AI: exiles ${spec.n} (G Generation) card(s) and the ■ effect resolves`, exiled===spec.n && did, `exiled ${exiled} did ${did} trash ${t0}->${b.s.trash.length}`);
  }
  // Player: asked; picks which cards; then the effect (any target chosen on the board)
  for (const answer of ['yes','no']){
    fresh('player'); const b=devBoard(id, 'player');
    if (id==='ST10-002'){ b.restedFoe.rested=false; b.restedFoe._wasActive=true; b.restedFoe.hp=4; }
    const gg=trashOf('player', Array.from({length:spec.n+1}, (_,i)=>ggen[i%3]));
    if (spec.n+1===2) gg[1]=Object.assign(gg[1], {});   // two different cards (EB01-007 / EB01-012) → a real choice
    const h0=G.player.hand.length;
    let u;
    if (spec.kw==='Deploy'){ G.player.hand.push(card(id,'player')); u=G.player.hand[G.player.hand.length-1]; A.playFromHand(u.uid); }
    else { u=put(id,'player'); const pid = spec.kw==='When Linked' ? 'EB01-062' : plainPilot.id; const p=card(pid,'player'); G.player.hand.push(p); A.playFromHand(p.uid);
      if (G.mode==='pilot-target') A.fieldClick(u.uid); }   // tap the Unit to pair the Pilot with
    drainTasks();
    const asked=modal() && /exile/i.test(modal().msg) && /Development/.test(modal().msg);
    if (answer==='no'){ press(/Don't exile/); ok(`${nm} (${id}) player: declining the Development exile does nothing`, asked && G.player.exile.length===0 && !spec.did(b,u), `asked ${asked}`); continue; }
    press(/^Exile/);
    const ov=!!overlay();
    if (ov) pickTiles(gg.slice(0, spec.n).map(c=>c.uid));
    drainTasks();
    if (G.mode==='trigger-target'){ const t=G.pending.cands.includes(b.restedFoe.uid) ? b.restedFoe.uid : G.pending.cands[0]; A.fieldClick(t); drainTasks(); }
    if (modal() && /choose 1 of your Units/i.test(modal().msg)) press(new RegExp(nm.replace(/[()Ⅱ]/g,'.')));   // Tallgeese: give <Breach 1> to itself
    if (overlay()) pickLook(0);
    if (G.mode==='discard'){ discardPick(G.player.hand[0]); b.drew=true; }
    drainTasks();
    const exiledOk = G.player.exile.length===spec.n && gg.slice(0, spec.n).every(c=>G.player.exile.includes(c) || !ov);
    ok(`${nm} (${id}) player: asked, picks ${spec.n} (G Generation) card(s) to exile, then the ■ effect resolves`, asked && exiledOk && spec.did(b,u),
       `asked ${asked} picker ${ov} exiled ${G.player.exile.length} did ${spec.did(b,u)} mode ${G.mode} modal ${JSON.stringify(modal())}`);
  }
}
// Player with too few cards: no prompt at all
{ fresh('player'); const f=stick('enemy',3,5,{rested:true}); trashOf('player',['EB01-007','EB01-012']); const u=card('EB01-010','player'); G.player.hand.push(u); A.playFromHand(u.uid); drainTasks();
  ok('Gundam Barbatos 6th Form: with 2 of the 3 (G Generation) cards, no prompt and no damage', !modal() && f.hp===5 && G.player.exile.length===0); }
// ST10-008: draws 1 and the player chooses the discard
{ fresh('player'); trashOf('player',['EB01-007','EB01-012']); const u=card('ST10-008','player'); G.player.hand=[u, card('ST01-012','player'), card('ST01-013','player')];
  A.playFromHand(u.uid); drainTasks(); press(/^Exile/); drainTasks();
  const disc=G.mode==='discard'; const pick=G.player.hand.find(c=>c.def==='ST01-013'); if (disc) discardPick(pick);
  ok('Gundam Barbatos 1st Form: draw 1, then YOU choose the card to discard', disc && G.player.trash.includes(pick) && G.player.hand.length===2, `mode ${G.mode}`); }
// EB01-025: "All players place 1 EX Resource." — both players (AI side too)
{ fresh('enemy'); trashOf('enemy',['EB01-007','EB01-012']); const u=put('EB01-025','enemy'); A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy');
  ok('Tallgeese Ⅱ: all players place 1 EX Resource (AI casts)', G.enemy.ex===1 && G.player.ex===1, `${G.enemy.ex}/${G.player.ex}`); }

// ================= Tallgeese Ⅱ 【During Pair】 battle-damage guard =================
{ const run=(paired, oppEx, atkLv)=>{ fresh('enemy'); const t=put('EB01-025','player',{rested:true}); if (paired) pair(t, plainPilot.id); G.enemy.ex=oppEx;
    const atk=stick('enemy',3,9,{lv:atkLv}); const hp0=t.hp; A.battle(atk, t, G.enemy, G.player); drainTasks(); return hp0-t.hp; };
  ok('Tallgeese Ⅱ: paired, opponent has an EX Resource → no battle damage from a Lv.4 Unit', run(true,1,4)===0);
  ok('Tallgeese Ⅱ: no EX Resource on the opponent → takes the damage', run(true,0,4)===3);
  ok('Tallgeese Ⅱ: not paired → takes the damage', run(false,1,4)===3);
  ok('Tallgeese Ⅱ: a Lv.6 enemy Unit still deals battle damage', run(true,1,6)===3); }

// ================= mill riders =================
// Saikoro Gundam EB01-050 — 【Attack】mill 1; if it is Lv.3 or higher, choose 1 enemy Unit: AP-2 during this battle.
{ const run=(who, topId)=>{ fresh(who); const s=sideOf(who), foe=who==='player'?G.enemy:G.player; const sk=put('EB01-050', who); const e=stick(foe.who,5,9,{rested:true});
    s.deck.push(card(topId, who));
    if (who==='player'){ A.fieldClick(sk.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); const tt=G.mode==='trigger-target'; const ap0=A.effAp(e); if (tt) A.fieldClick(e.uid); drainTasks(); return { tt, ap:A.effAp(e), during:ap0 }; }
    A.resolveAttackTriggers(sk, s, ()=>{}); drainTasks(); return { ap:A.effAp(e) }; };
  const ai=run('enemy','GD01-031'); ok('Saikoro Gundam AI: a Lv.4 card milled → the enemy Unit gets AP-2', ai.ap===3, 'ap '+ai.ap);
  const ai2=run('enemy','ST01-005'); ok('Saikoro Gundam AI: a Lv.2 card milled → no AP-2', ai2.ap===5, 'ap '+ai2.ap);
  fresh('player'); { const sk=put('EB01-050','player'); const e=stick('enemy',5,9,{rested:true}); const e2=stick('enemy',4,9,{rested:true}); G.player.deck.push(card('GD01-031','player'));
    A.fieldClick(sk.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); const tt=G.mode==='trigger-target';
    if (tt) A.fieldClick(e2.uid); drainTasks();
    ok('Saikoro Gundam player: you choose the enemy Unit for AP-2 (it lasts only this battle)', tt && A.effAp(e2)===4, `tt ${tt} ap ${A.effAp(e2)}`); } }
// Val Walo GD06-052 — 【Deploy】mill 1; if you place a (Zeon) card, rest an enemy Unit with 4 or less AP. (Neo Zeon isn't Zeon.)
{ const run=(who, topId)=>{ fresh(who); const s=sideOf(who), foe=who==='player'?G.enemy:G.player; const e=stick(foe.who,3,5); s.deck.push(card(topId, who));
    if (who==='player'){ const u=card('GD06-052','player'); G.player.hand.push(u); A.playFromHand(u.uid); drainTasks(); if (G.mode==='trigger-target') A.fieldClick(e.uid); drainTasks(); }
    else { const u=put('GD06-052','enemy'); A.runTrigger(u, s, A.parseTrigger(u.effect,'Deploy'), 'Deploy'); }
    return e.rested; };
  ok('Val Walo AI: a (Zeon) card placed → rests the 3-AP enemy Unit', run('enemy','GD01-031')===true);
  ok('Val Walo AI: a (Neo Zeon) card placed → no rest', run('enemy','ST03-003')===false);
  ok('Val Walo player: a (Zeon) card placed → you choose and rest the enemy Unit', run('player','GD01-031')===true); }
// Xavier Olivette GD06-096 — 【During Link】【Attack】mill 1; a (Zeon)/(Alphacide) card → all enemy Units AP-1 during this battle.
{ fresh('enemy'); const u=put('GD06-053','enemy'); pair(u,'GD06-096'); const e1=stick('player',3,5), e2=stick('player',4,5); G.enemy.deck.push(card('GD06-017','enemy'));
  A.resolveAttackTriggers(u, G.enemy, ()=>{}); drainTasks(); const during=[A.effAp(e1),A.effAp(e2)]; A.clearBattleScoped(); const after=[A.effAp(e1),A.effAp(e2)];
  ok('Xavier Olivette: an (Alphacide) card placed → all enemy Units AP-1, only during this battle', u.linked && during.join()==='2,3' && after.join()==='3,4', `linked ${u.linked} ${during} -> ${after}`); }
// Yomagn'tho GD06-127 — 【Deploy】shield to hand; then on your turn mill 2; an (Alphacide) card → destroy an enemy Unit with 2 or less AP.
{ fresh('enemy'); const b=card('GD06-127','enemy'); G.enemy.base=b; const e=stick('player',2,5); G.enemy.deck.push(card('GD06-017','enemy'), card('ST01-005','enemy'));
  A.runTrigger(b, G.enemy, A.parseTrigger(b.effect,'Deploy'), 'Deploy'); drainTasks();
  ok("Yomagn'tho AI: an (Alphacide) card placed → destroys the 2-AP enemy Unit", !G.player.field.includes(e));
  fresh('player'); const e2=stick('enemy',2,5), e3=stick('enemy',1,5); G.player.deck.push(card('GD06-017','player'), card('ST01-005','player'));
  const bc=card('GD06-127','player'); G.player.hand.push(bc); A.playFromHand(bc.uid); drainTasks(); const tt=G.mode==='trigger-target'; if (tt) A.fieldClick(e3.uid); drainTasks();
  ok("Yomagn'tho player: you choose which enemy Unit with 2 or less AP is destroyed", tt && !G.enemy.field.includes(e3) && G.enemy.field.includes(e2)); }
// Gundam Exia ST07-001 — 【When Paired】mill 2; "If you place a (CB) card with this effect, draw 1."
{ fresh('enemy'); const u=put('ST07-001','enemy'); G.enemy.deck.push(card('GD03-030','enemy'), card('ST01-005','enemy')); const h0=G.enemy.hand.length;
  A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'When Paired'), 'Pair'); drainTasks();
  ok('Gundam Exia: a (CB) card placed → draw 1', G.enemy.hand.length===h0+1, `hand ${h0}->${G.enemy.hand.length}`); }
// Reliable Big Brother GD04-116 — 【Main】mill 2; damage = (Minerva Squad) cards placed, to an enemy Unit with 4 or less AP.
{ fresh('player'); const e=stick('enemy',3,5), big=stick('enemy',6,9); G.player.deck.push(card('GD04-053','player'), card('GD04-055','player'));
  const c=card('GD04-116','player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks(); const tt=G.mode==='trigger-target' && !G.pending.cands.includes(big.uid); if (G.mode==='trigger-target') A.fieldClick(e.uid); drainTasks();
  ok('Reliable Big Brother player: 2 (Minerva Squad) cards placed → you deal 2 to an enemy Unit with 4 or less AP', tt && e.hp===3, `tt ${tt} hp ${e.hp}`);
  fresh('enemy'); const e2=stick('player',3,5); G.enemy.deck.push(card('GD04-053','enemy'), card('ST01-005','enemy')); const c2=card('GD04-116','enemy');
  A.applyCommand(c2, G.enemy, null); drainTasks(); ok('Reliable Big Brother AI: 1 (Minerva Squad) card placed → 1 damage', e2.hp===4, 'hp '+e2.hp); }
// Nyaan / Zeheart (existing riders) still work
{ fresh('enemy'); const u=stick('enemy',3,3); const p=card('GD03-094','enemy'); u.pilotCard=p; const e=stick('player',4,5); G.enemy.deck.push(card('GD02-096','enemy'), card('ST01-005','enemy'));
  A.runTrigger(p, G.enemy, A.parseTrigger(p.effect,'When Paired'), 'Pair'); drainTasks();
  ok('Zeheart Galette: a (Vagan) card placed → AP-2 (unchanged)', A.effAp(e)===2, 'ap '+A.effAp(e)); }

// ================= optional costs =================
// Kapool GD04-074 — 【Attack】You may pay ①. If you do, draw 1. Then, discard 1. (the discard needs the payment too — Q175)
{ const atkWith=(answer)=>{ fresh('player'); const k=put('GD04-074','player'); const e=stick('enemy',1,9,{rested:true}); G.player.hand=[card('ST01-012','player'), card('ST01-013','player')]; G.player.resAvail=3;
    A.fieldClick(k.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); const asked=!!modal() && /pay ①/i.test(modal().msg);
    press(answer==='yes' ? /^Pay/ : /Don't/); const disc=G.mode==='discard'; if (disc) discardPick(G.player.hand[0]); drainTasks();
    return { asked, disc, hand:G.player.hand.length, res:G.player.resAvail }; };
  const y=atkWith('yes'); ok('Kapool player: pay ① → draw 1, then you choose 1 to discard', y.asked && y.disc && y.hand===2 && y.res===2, JSON.stringify(y));
  const n=atkWith('no'); ok("Kapool player: don't pay → no draw and no discard (Q175)", n.asked && !n.disc && n.hand===2 && n.res===3, JSON.stringify(n));
  for (const res of [3,0]){ fresh('enemy'); const k=put('GD04-074','enemy'); G.enemy.hand=[card('ST01-012','enemy'), card('ST01-013','enemy')]; G.enemy.resAvail=res; const d0=G.enemy.deck.length;
    A.resolveAttackTriggers(k, G.enemy, ()=>{}); drainTasks();
    if (res) ok('Kapool AI: pays ①, draws 1, discards 1', G.enemy.resAvail===2 && G.enemy.deck.length===d0-1 && G.enemy.hand.length===2);
    else ok("Kapool AI: can't pay → no draw, no discard (Q175)", G.enemy.resAvail===0 && G.enemy.deck.length===d0 && G.enemy.hand.length===2); } }
// Xamel GD06-056 — 【Attack】You may pay ②. If you do, destroy an enemy Unit that is Lv.2 or lower.
{ const run=(answer)=>{ fresh('player'); const x=put('GD06-056','player'); const e=stick('enemy',1,9,{rested:true, lv:5}); const small=stick('enemy',1,1,{lv:2}); G.player.resAvail=5;
    A.fieldClick(x.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); const asked=!!modal() && /pay ②/i.test(modal().msg);
    press(answer==='yes' ? /^Pay/ : /Don't/); if (G.mode==='trigger-target') A.fieldClick(small.uid); drainTasks();
    return { asked, gone:!G.enemy.field.includes(small), res:G.player.resAvail }; };
  const y=run('yes'); ok('Xamel player: pay ② → destroy the Lv.2 enemy Unit', y.asked && y.gone && y.res===3, JSON.stringify(y));
  const n=run('no'); ok("Xamel player: don't pay → nothing destroyed", n.asked && !n.gone && n.res===5, JSON.stringify(n));
  for (const res of [0,2]){ fresh('enemy'); const x=put('GD06-056','enemy'); const small=stick('player',1,1,{lv:2}); G.enemy.resAvail=res; A.resolveAttackTriggers(x, G.enemy, ()=>{}); drainTasks();
    ok(`Xamel AI with ${res} active Resources: ${res?'pays ② and destroys':'no destroy'}`, res ? (!G.player.field.includes(small) && G.enemy.resAvail===0) : G.player.field.includes(small)); }
  fresh('player'); { const x=put('GD06-056','player'); const e=stick('enemy',1,9,{rested:true, lv:5}); A.fieldClick(x.uid); drainTasks(); A.fieldClick(e.uid); drainTasks();
    ok('Xamel player: no Lv.2-or-lower enemy Unit → nothing to pay for (no prompt)', !modal() || !/pay/i.test(modal().msg)); } }
// Gundam Dynames GD04-046 — 【Deploy】You may rest this Unit. If you do, deal 2 to an enemy Unit that is Lv.3 or lower.
{ const run=(answer)=>{ fresh('player'); const e=stick('enemy',3,5,{lv:3}); const u=card('GD04-046','player'); G.player.hand.push(u); A.playFromHand(u.uid); drainTasks();
    const asked=!!modal() && /rest this Unit/i.test(modal().msg); press(answer==='yes' ? /Rest it/ : /Don't/); if (G.mode==='trigger-target') A.fieldClick(e.uid); drainTasks();
    return { asked, rested:u.rested, hp:e.hp }; };
  const y=run('yes'); ok('Gundam Dynames player: rest it → 2 damage to the Lv.3 enemy Unit', y.asked && y.rested && y.hp===3, JSON.stringify(y));
  const n=run('no'); ok("Gundam Dynames player: don't rest → stays active, no damage", n.asked && !n.rested && n.hp===5, JSON.stringify(n));
  fresh('enemy'); const e=stick('player',3,5,{lv:3}); const u=put('GD04-046','enemy'); A.runTrigger(u, G.enemy, A.parseTrigger(u.effect,'Deploy'), 'Deploy');
  ok('Gundam Dynames AI: rests itself and deals 2', u.rested && e.hp===3);
  fresh('enemy'); const e2=stick('player',3,5,{lv:5}); const u2=put('GD04-046','enemy'); A.runTrigger(u2, G.enemy, A.parseTrigger(u2.effect,'Deploy'), 'Deploy');
  ok('Gundam Dynames AI: no Lv.3-or-lower target → stays active', !u2.rested && e2.hp===5); }

// ================= Unicorn Gundam 02 Banshee (Destroy Mode) GD01-003 =================
{ const run=(who, n)=>{ fresh(who); const s=sideOf(who); const u=put('GD01-003', who); pair(u,'GD01-093'); u.rested=true;
    for (let i=0;i<n;i++) s.trash.push(card(i%2?'ST01-012':'ST01-013', who)); const d0=s.deck.length;
    if (who==='player'){ A.resolveAttackTriggers(u, s, ()=>{}); drainTasks(); require('./burst_yes.js').resolveFirst(H)(/Banshee/); /* its 【Attack】 and the Pilot's trigger together: Banshee's first */ const ov=!!overlay(); if (ov) pickTiles(s.trash.slice(0,12).map(c=>c.uid)); drainTasks(); return { ov, u, d:s.deck.length-d0, t:s.trash.length }; }
    A.resolveAttackTriggers(u, s, ()=>{}); drainTasks(); return { u, d:s.deck.length-d0, t:s.trash.length }; };
  const a=run('enemy',12); ok('Banshee AI: 12 trash cards back into the deck → set active, <First Strike>', a.u.linked && a.d===12 && a.t===0 && !a.u.rested && A.effFirstStrike(a.u), JSON.stringify({d:a.d,t:a.t,r:a.u.rested}));
  const b=run('enemy',11); ok("Banshee AI: only 11 cards in the trash → stays rested, no <First Strike>", b.d===0 && b.u.rested && !A.effFirstStrike(b.u));
  const c=run('player',13); ok('Banshee player: you choose 12 of your 13 trash cards; then active + <First Strike>', c.ov && c.d===12 && c.t===1 && !c.u.rested && A.effFirstStrike(c.u), JSON.stringify({ov:c.ov,d:c.d,t:c.t})); }

// ================= alternative play costs =================
// Rising Freedom Gundam EB01-039 — with 3 or more enemy Units, play it as if it has 3 Lv. and cost.
{ fresh('player'); G.player.resMax=3; G.player.resAvail=3; G.player.resourceDeck=0; for (let i=0;i<3;i++) stick('enemy',1,1);
  const rf=card('EB01-039','player'); G.player.hand.push(rf);
  ok('Rising Freedom: 3 enemy Units → Lv.3 / cost 3', A.effectiveCost(G.player, rf)===3 && A.levelOk(G.player, rf) && !A.affordIssue(G.player, rf));
  A.playFromHand(rf.uid); drainTasks(); ok('Rising Freedom player: deploys for 3 resources', G.player.field.includes(rf) && G.player.resAvail===0, 'res '+G.player.resAvail);
  fresh('player'); G.player.resMax=3; G.player.resAvail=3; for (let i=0;i<2;i++) stick('enemy',1,1); const rf2=card('EB01-039','player'); G.player.hand.push(rf2); A.playFromHand(rf2.uid); drainTasks();
  ok('Rising Freedom: only 2 enemy Units → still Lv.6 / cost 5 (stays in hand)', G.player.hand.includes(rf2) && A.effectiveCost(G.player, rf2)===5);
  fresh('enemy'); G.enemy.resMax=3; G.enemy.resAvail=3; for (let i=0;i<3;i++) stick('player',1,1); const rf3=card('EB01-039','enemy'); G.enemy.hand=[rf3];
  A.aiMainStep(); drainTasks(); ok('Rising Freedom AI: deploys it for 3 with 3 enemy Units', G.enemy.field.includes(rf3) && G.enemy.resAvail===0, 'res '+G.enemy.resAvail); }
// Unlocking the Development Diagram ST10-014 — you may discard 1 (G Generation) Unit card → Lv.2 / cost 2.
{ fresh('player'); G.player.resMax=2; G.player.resAvail=2; const cmd=card('ST10-014','player'); const gu=card('EB01-012','player'); const other=card('ST01-012','player'); G.player.hand=[cmd, gu, other];
  ok('Unlocking the Development Diagram: playable at Lv.2 with a (G Generation) Unit card in hand', !A.affordIssue(G.player, cmd));
  A.playFromHand(cmd.uid); drainTasks(); const asked=!!modal() && /discard/i.test(modal().msg) && !modal().btns.some(b=>/normally/.test(b));
  press(/^Discard/); drainTasks();
  ok('Unlocking the Development Diagram player: discard the (G Generation) Unit → pays 2, draws 2', asked && G.player.trash.includes(gu) && G.player.resAvail===0 && G.player.hand.length===3 && !G.player.hand.includes(cmd), `asked ${asked} res ${G.player.resAvail} hand ${G.player.hand.length}`);
  fresh('player'); const cmd2=card('ST10-014','player'); const gu2=card('EB01-012','player'); G.player.hand=[cmd2, gu2];
  A.playFromHand(cmd2.uid); drainTasks(); const both=!!modal() && modal().btns.some(b=>/normally/.test(b)); press(/normally/); drainTasks();
  ok('Unlocking the Development Diagram player: can afford it normally → may choose to pay 4 and keep the card', both && G.player.hand.includes(gu2) && G.player.resAvail===6, `res ${G.player.resAvail}`);
  fresh('player'); G.player.resMax=2; G.player.resAvail=2; const cmd3=card('ST10-014','player'); G.player.hand=[cmd3, card('ST01-005','player')];
  ok('Unlocking the Development Diagram: no (G Generation) Unit card → needs Lv.4', !!A.affordIssue(G.player, cmd3));
  fresh('enemy'); G.enemy.resMax=2; G.enemy.resAvail=2; const cmd4=card('ST10-014','enemy'); const gu4=card('EB01-012','enemy'); G.enemy.hand=[cmd4, gu4]; const d0=G.enemy.deck.length;
  A.aiMainStep(); drainTasks(); ok('Unlocking the Development Diagram AI: discards the (G Generation) Unit, pays 2, draws 2', G.enemy.trash.includes(gu4) && G.enemy.resAvail===0 && G.enemy.deck.length===d0-2, `res ${G.enemy.resAvail}`); }
// Unicorn Gundam (Destroy Mode) GD01-002 — destroy your Lv.5 Link Unit with "Unicorn Mode" → Lv.0 / cost 0.
{ fresh('player'); G.player.resMax=2; G.player.resAvail=2; const um=put('GD01-005','player'); pair(um,'GD01-088'); const dm=card('GD01-002','player'); G.player.hand.push(dm);
  ok('Unicorn Gundam (Destroy Mode): playable at Lv.2 with a linked Unicorn Mode', um.linked && !A.affordIssue(G.player, dm));
  A.playFromHand(dm.uid); drainTasks(); const asked=!!modal() && /destroy/i.test(modal().msg); press(/^Destroy/); drainTasks();
  if (G.mode==='discard') discardPick(G.player.hand[0]);   // Unicorn Mode's 【Destroyed】: Pilot back, then discard 1
  ok('Unicorn Gundam (Destroy Mode) player: destroys Unicorn Mode, deploys for 0 (Unicorn Mode\'s "discard 1" can\'t take the card being played)',
     asked && !G.player.field.includes(um) && G.player.field.includes(dm) && !G.player.trash.includes(dm) && G.player.resAvail===2, `asked ${asked} res ${G.player.resAvail}`);
  fresh('player'); G.player.resMax=2; G.player.resAvail=2; const um2=put('GD01-005','player'); const dm2=card('GD01-002','player'); G.player.hand.push(dm2);
  ok('Unicorn Gundam (Destroy Mode): an unlinked Unicorn Mode does not qualify', !!A.affordIssue(G.player, dm2));
  fresh('enemy'); G.enemy.resMax=2; G.enemy.resAvail=2; const um3=put('GD01-005','enemy'); pair(um3,'GD01-088'); const dm3=card('GD01-002','enemy'); G.enemy.hand=[dm3];
  A.aiMainStep(); drainTasks(); ok('Unicorn Gundam (Destroy Mode) AI: destroys its linked Unicorn Mode and deploys it for 0', !G.enemy.field.includes(um3) && G.enemy.field.includes(dm3) && !G.enemy.trash.includes(dm3) && G.enemy.resAvail===2, `res ${G.enemy.resAvail}`); }
// Christina Mackenzie GD03-085 — paired with a Unit with "Gundam NT-1" in its name: cost 0.
{ fresh('player'); G.player.resAvail=0; const nt=put('GD03-001','player'); const ch=card('GD03-085','player'); G.player.hand.push(ch);
  ok('Christina Mackenzie: cost 0 onto Gundam NT-1', A.effectiveCost(G.player, ch, nt)===0 && !A.affordIssue(G.player, ch));
  A.playFromHand(ch.uid); drainTasks(); ok('Christina Mackenzie player: pairs onto Gundam NT-1 with 0 resources', nt.pilotCard===ch);
  fresh('player'); G.player.resAvail=0; const gm=put('ST01-005','player'); const ch2=card('GD03-085','player'); G.player.hand.push(ch2);
  ok('Christina Mackenzie: full cost onto another Unit', A.effectiveCost(G.player, ch2, gm)===1 && !!A.affordIssue(G.player, ch2));
  fresh('enemy'); const nt3=put('GD03-001','enemy'); const ch3=card('GD03-085','enemy'); G.enemy.hand=[ch3]; ok('Christina Mackenzie AI: cost 0 onto its Gundam NT-1', A.effectiveCost(G.enemy, ch3, nt3)===0); }

// ================= modal Commands =================
{ const modes=['ST12-015','ST14-013','GD05-102','GD05-106','GD06-114'].map(id=>card(id,'player').action);
  ok('Modal Commands: every "choose 1 of the following effects" card has 2 parsed modes', modes.every(a=>a.kind==='modal' && a.modes.length===2 && a.modes.every(m=>m.modeText))); }
// Two Unicorns ST12-015 (【Action】) — mode 2: 2 damage to a friendly and an enemy Unit that are Lv.5 or higher.
{ fresh('player'); const f=stick('player',4,4,{lv:5}); const e=stick('enemy',5,5,{lv:6}); const low=stick('enemy',1,1,{lv:2}); G.player.hand=[card('ST12-015','player')];
  A.offerPlayerActionStep(null, ()=>{}); drainTasks(); press(/Two Unicorns/); const m=modal(); const two=m && m.btns.length>=3 && m.btns.some(b=>/Lv\.2 or lower/.test(b)) && m.btns.some(b=>/Lv\.5 or higher/.test(b));
  press(/Lv\.5 or higher/); drainTasks();
  ok('Two Unicorns player: choose the mode, then 2 damage to your Lv.5 and the enemy Lv.6 Unit', two && f.hp===2 && e.hp===3 && G.enemy.field.includes(low), `modes ${two} ${f.hp}/${e.hp}`);
  fresh('player'); const low2=stick('enemy',1,1,{lv:2}); stick('enemy',5,5,{lv:6}); G.player.hand=[card('ST12-015','player')];
  A.offerPlayerActionStep(null, ()=>{}); drainTasks(); press(/Two Unicorns/); const m2=modal(); const disabled=m2 && [...el('blockBtns').children].some(b=>/Lv\.5 or higher/.test(strip(b.innerHTML)) && !b.onclick);
  ok('Two Unicorns: no friendly Lv.5+ Unit → only the destroy mode can be picked', !!disabled || !G.enemy.field.includes(low2), JSON.stringify(m2));
  if (m2) press(/Lv\.2 or lower/); drainTasks(); ok('Two Unicorns player: destroy the Lv.2 enemy Unit', !G.enemy.field.includes(low2));
  fresh('enemy'); const af=stick('enemy',4,4,{lv:5}); const pe=stick('player',5,5,{lv:6}); A.applyCommand(card('ST12-015','enemy'), G.enemy, null); drainTasks();
  ok('Two Unicorns AI: only mode 2 is legal → 2 damage to each', af.hp===2 && pe.hp===3); }
// Natural Talent ST14-013 (【Main】/【Action】)
{ fresh('player'); const a=stick('enemy',4,3), b=stick('enemy',2,2), big=stick('enemy',6,6); G.player.hand=[card('ST14-013','player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/Rest them/); drainTasks(); const first=modal(); press(/Dummy 4\/3/); const second=modal(); press(/Dummy 2\/2/); drainTasks();
  ok('Natural Talent player: mode 1 — you choose up to 2 enemy Units with 3 or less HP to rest', !!first && !!second && /Done/.test(second.btns.join()) && a.rested && b.rested && !big.rested, `${a.rested}/${b.rested}/${big.rested}`);
  fresh('player'); const lone=stick('enemy',6,6); G.player.hand=[card('ST14-013','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok('Natural Talent player: vs a lone 6-HP Unit only mode 2 is legal → AP-3', A.effAp(lone)===3 && !G.player.hand.length, 'ap '+A.effAp(lone));
  fresh('player'); G.player.hand=[card('ST14-013','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok("Natural Talent: no enemy Unit → can't be played (stays in hand)", G.player.hand.length===1 && !G.player.trash.length);
  fresh('enemy'); const pl=stick('player',6,6); A.applyCommand(card('ST14-013','enemy'), G.enemy, null); drainTasks(); ok('Natural Talent AI: picks AP-3 vs a 6-HP Unit', A.effAp(pl)===3);
  fresh('enemy'); const p1=stick('player',5,3), p2=stick('player',4,2); const nt=card('ST14-013','enemy'); G.enemy.hand=[nt]; A.aiMainStep(); drainTasks();
  ok('Natural Talent AI main phase: rests 2 enemy Units with 3 or less HP', G.enemy.trash.includes(nt) && p1.rested && p2.rested); }
// Wings of Light GD05-102 (【Action】) — mode 2 "Choose 1 Unit. It recovers 3 HP." (any Unit) — also on the AI's turn
{ fresh('player'); const mine=stick('player',2,6); mine.hp=2; stick('enemy',9,9); G.player.hand=[card('GD05-102','player')];
  A.offerPlayerActionStep(null, ()=>{}); drainTasks(); press(/Wings of Light/); drainTasks();
  const anyUnit=modal(); const both=anyUnit && anyUnit.btns.some(b=>/Dummy 2\/6/.test(b)) && anyUnit.btns.some(b=>/Dummy 9\/9/.test(b)); press(/Dummy 2\/6/); drainTasks();
  ok('Wings of Light player: only "recover 3 HP" is legal → choose any Unit (yours or the enemy\'s); yours 2 → 5', both && mine.hp===5, `both ${both} hp ${mine.hp}`);
  fresh('enemy'); const def=stick('player',2,6,{rested:true}); def.hp=3; const atk=stick('enemy',4,5); G.player.hand=[card('GD05-102','player')];
  A.resolveAiAttack(atk, ()=>{}, def); drainTasks(); press(/Wings of Light/); const m=modal(); const two=m && /choose 1 of the following/i.test(m.msg);
  press(/Return it/); drainTasks(); const pick=modal(); if (pick && /choose 1 enemy/i.test(pick.msg)) press(/Dummy 4\/5/); let g=0; while (modal() && g++<4){ if (!press(/Pass/)) break; } drainTasks();
  ok("Wings of Light on the AI's turn: choose the mode, bounce the attacking Unit (no battle)", two && !G.enemy.field.includes(atk) && def.hp===3, `two ${two} hp ${def.hp}`);
  fresh('enemy'); const dmg=stick('enemy',3,6); dmg.hp=1; stick('player',9,9); A.applyCommand(card('GD05-102','enemy'), G.enemy, null); drainTasks();
  ok('Wings of Light AI: heals its own damaged Unit when nothing can be bounced', dmg.hp===4, 'hp '+dmg.hp); }
// Mutual Attraction GD05-106 (【Main】) — mode 2: a Lv.5+ Pilot from the trash (you choose which)
{ fresh('player'); const z=card('ST02-011','player'), b=card('GD01-088','player'); G.player.trash.push(z, b); G.player.hand=[card('GD05-106','player')]; const r0=G.player.resMax;
  A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/Pilot card/); drainTasks(); const look=!!overlay(); if (look) pickLook(1); drainTasks();
  ok('Mutual Attraction player: mode 2 — you choose the Lv.5+ Pilot to add from your trash', look && G.player.hand.includes(b) && !G.player.hand.includes(z) && G.player.resMax===r0, `look ${look}`);
  fresh('player'); G.player.hand=[card('GD05-106','player')]; const r1=G.player.resMax; A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok('Mutual Attraction player: no Lv.5+ Pilot in trash → mode 1 places a rested Resource', G.player.resMax===r1+1);
  fresh('enemy'); G.enemy.resourceDeck=0; const zz=card('ST02-011','enemy'); G.enemy.trash.push(zz); A.applyCommand(card('GD05-106','enemy'), G.enemy, null); drainTasks();
  ok('Mutual Attraction AI: no Resource left to place → takes the Pilot back', G.enemy.hand.includes(zz)); }
// Alphaciders GD06-114 (【Action】) — mode 2: destroy an enemy Unit that is Lv.2 or lower
{ fresh('player'); const low=stick('enemy',1,1,{lv:2}); G.player.hand=[card('GD06-114','player')];
  A.offerPlayerActionStep(null, ()=>{}); drainTasks(); press(/Alphaciders/); drainTasks();
  ok('Alphaciders player: no (Alphacide) Unit → the destroy mode resolves', !G.enemy.field.includes(low));
  fresh('player'); const low2=stick('enemy',1,1,{lv:2}); put('GD06-017','player'); G.player.hand=[card('GD06-114','player')];
  A.offerPlayerActionStep(null, ()=>{}); drainTasks(); press(/Alphaciders/); const m=modal(); const choice=m && m.btns.filter(b=>/^■/.test(b)).length===2; press(/Destroy it/); drainTasks();
  ok('Alphaciders player: both modes legal → you choose (destroy)', choice && !G.enemy.field.includes(low2));
  fresh('enemy'); const low3=stick('player',1,1,{lv:2}); A.applyCommand(card('GD06-114','enemy'), G.enemy, null); drainTasks();
  ok('Alphaciders AI: destroys the Lv.2 enemy Unit', !G.player.field.includes(low3)); }

console.log(fail.length ? 'FAILURES:\n  '+fail.join('\n  ') : 'all audit_g3 checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+H.ERRORS.length); if (H.ERRORS.length) console.log(H.ERRORS.slice(0,5));
