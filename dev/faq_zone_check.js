// Official Q&A checks, group "zone": cards moving between zones.
//  - Q339 / Q427: a Unit returned to the bottom of its owner's deck takes its paired Pilot with it (3-3-6), and the owner
//    of the cards chooses their order (Strike Freedom GD05-002, Char's Z'Gok ST11-001; also Impulse Gundam ST09-001's cost).
//  - Q117 / Q429: a mandatory token deployed into a full battle area: place one of your Units in the trash, then deploy the
//    token. There is no "skip" (Gouf ST03-009, ZnO ST11-004).
//  - Q521 + EX note: "Choose 1 of your Resources. Set it as active." can choose a rested EX Resource. That EX Resource then
//    leaves the game when it is used (5-17-3-2-3) (Xavier's Gyan GD06-053, Suletta ST01-011, Gundam Exia ST07-001).
//  - Q10: a redraw puts the whole hand on the BOTTOM of the deck, draws 5 new cards, then shuffles; the first player redraws first.
//  - Q440 note: the card viewer's 【Activate】 button shows "<First Strike>" (it was read as an HTML tag and vanished).
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document, el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=960000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for (const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for (let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for (let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const side=w=>w==='player'?G.player:G.enemy;
const other=w=>w==='player'?'enemy':'player';
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who)=>{ const u=card(id, who); u.sick=false; side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c={ uid:UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const pair=(u, pid)=>{ const p=card(pid, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (/very bottom/.test(m.msg)) break; else if (!press(/Pass/)) break; } };
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function insPress(re){ const b=[...(el('insBtns').children||[])].find(x=>re.test(strip(x.innerHTML||x.textContent))); if(!b) return false; (b.onclick||(()=>b.fire('click')))(); drainTasks(); return true; }
function selectAttacker(u){ A.fieldClick(u.uid); drainTasks(); if (G.mode!=='attack-target') insPress(/Attack with/); return G.mode==='attack-target'; }
function discardTap(c){ if (G.mode!=='discard') return false; G.player.hand.splice(G.player.hand.indexOf(c),1); A.sendToTrash(c, G.player);
  G.pending.discardLeft--; if (G.pending.discardLeft<=0){ const after=G.pending.after; G.mode='idle'; G.pending=null; if (after) after(); } drainTasks(); return true; }

// ============ Q339 / Q427: a returned Unit takes its Pilot to the bottom of the deck; the owner orders them ============
// Strike Freedom GD05-002 【During Pair】【Attack】You may discard 2. If you do, choose 1 enemy Unit with the lowest Lv. Return it …
for (const w of ['player','enemy']){
  fresh(w); const sf=put('GD05-002',w); pair(sf,'GD05-081'); const foe=side(other(w));
  const victim=stick(other(w),1,1,{lv:2}); const pc=pair(victim,'ST01-010'); const t=stick(other(w),1,9,{lv:6,rested:true});
  side(w).hand=[card('ST01-001',w),card('ST01-001',w),card('ST01-001',w),card('ST01-001',w)];
  let asked=null;
  if (w==='player'){ selectAttacker(sf); A.fieldClick(t.uid); drainTasks(); press(/Discard 2/); discardTap(G.player.hand[0]); discardTap(G.player.hand[0]);
    if (G.mode==='trigger-target'){ A.fieldClick(victim.uid); drainTasks(); } passAll(); asked=modal(); }
  else { A.resolveAiAttack(sf, ()=>{}, t); drainTasks(); passAll(); asked=modal();
    if (asked) press(new RegExp('^'+esc(victim.name)+' at the very bottom')); }
  const b2=foe.deck.slice(0,2);
  ok(`Q339 Strike Freedom (${w}): the Unit and its paired Pilot both go to the bottom of the owner's deck`, b2.includes(victim) && b2.includes(pc) && !foe.trash.includes(pc) && !foe.field.includes(victim),
     `bottom ${b2.map(c=>c.name)} pilotInTrash ${foe.trash.includes(pc)}`);
  if (w==='player') ok('Q339 Strike Freedom (player): the AI owns the cards, so you are not asked for their order', !asked, JSON.stringify(asked));
  else ok('Q339 Strike Freedom (AI): you own the cards and choose their order (Unit at the very bottom)', !!asked && /very bottom/.test(asked.msg) && foe.deck[0]===victim && foe.deck[1]===pc,
     `${JSON.stringify(asked)} bottom ${foe.deck.slice(0,2).map(c=>c.name)}`);
}
// Char's Z'Gok ST11-001 【Deploy】If another friendly (Marine) Unit is in play, choose 1 enemy Unit that is Lv.2 or lower. Return it …
{ fresh('player'); stick('player',1,1,{trait:'(Marine)'}); const t=stick('enemy',1,3,{lv:2}); const pc=pair(t,'GD01-088'); const d0=G.enemy.deck.length;
  const z=card('ST11-001','player'); G.player.hand=[z]; A.playFromHand(z.uid); drainTasks();
  if (G.mode==='trigger-target'){ A.fieldClick(t.uid); drainTasks(); } else press(new RegExp('^'+esc(t.name)));
  const b2=G.enemy.deck.slice(0,2);
  ok("Q427 Z'Gok (player): the AI's Unit and its Pilot go to the bottom of the AI's deck; the AI orders them (no prompt)",
     b2.includes(t) && b2.includes(pc) && !G.enemy.trash.includes(pc) && G.enemy.deck.length===d0+2 && !modal(), `bottom ${b2.map(c=>c.name)} modal ${JSON.stringify(modal())}`); }
{ fresh('enemy'); stick('enemy',1,1,{trait:'(Marine)'}); const t=stick('player',1,3,{lv:2}); const pc=pair(t,'GD01-088'); const d0=G.player.deck.length;
  const z=card('ST11-001','enemy'); G.enemy.field.push(z); A.runTrigger(z, G.enemy, A.parseTrigger(z.effect,'Deploy'),'Deploy'); drainTasks();
  const m=modal(); const choice=m && press(new RegExp('^'+esc(pc.name)+' at the very bottom'));
  ok("Q427 Z'Gok (AI): your Unit and its Pilot go to the bottom of YOUR deck and you choose the order (Pilot at the very bottom)",
     !!choice && G.player.deck[0]===pc && G.player.deck[1]===t && G.player.deck.length===d0+2 && !G.player.trash.includes(pc), `${JSON.stringify(m)} bottom ${G.player.deck.slice(0,2).map(c=>c.name)}`); }
// Impulse Gundam ST09-001 【Activate･Main】②, return this Unit to the bottom of its owner's deck: … — the cost takes its Pilot along.
{ fresh('player'); const u=put('ST09-001','player'); const pc=pair(u,'ST09-008'); G.player.trash=[card('ST09-001','player')]; A.refreshTrashStats(G.player);
  A.applyActivateEffect(u, null, G.player); drainTasks(); const m=modal(); if (m && /very bottom/.test(m.msg)) press(/at the very bottom/);
  const b2=G.player.deck.slice(0,2);
  ok('Impulse Gundam (cost "return this Unit to the bottom of its owner\'s deck"): its paired Pilot goes there too, and you order them',
     !!m && /very bottom/.test(m.msg) && b2.includes(u) && b2.includes(pc) && !G.player.trash.includes(pc), `${JSON.stringify(m)} bottom ${b2.map(c=>c.name)} trash ${G.player.trash.map(c=>c.name)}`); }
// A Command paired through its 【Pilot】 mode goes back to the deck as that Command card; a token's Pilot goes to the deck alone.
{ fresh('player'); const t=stick('enemy',1,3,{lv:2}); const cmd=card('ST13-013','enemy'); const pp=A.pilotFromMode(cmd); A.attachPilot(t, pp); drainTasks();
  A.applyToTarget(stick('player',1,1), G.player, A.parseClause("Choose 1 enemy Unit that is Lv.2 or lower. Return it to the bottom of its owner's deck."), t, 'T'); drainTasks();
  const back=G.enemy.deck.slice(0,2).find(c=>c.uid===cmd.uid);
  ok('A paired 【Pilot】 Command returns to the deck as its Command card', !!back && back.type==='command' && !back.cmdPilot && !!back.pilotMode, back ? `${back.type} ${back.name}` : 'missing');
  fresh('player'); const tk=A.makeToken({ name:'Zaku Ⅱ', ap:1, hp:1, trait:'(Zeon)' }, 'enemy'); tk.sick=false; G.enemy.field.push(tk); const tp=pair(tk,'GD01-088');
  A.applyToTarget(stick('player',1,1), G.player, A.parseClause("Choose 1 enemy Unit that is Lv.2 or lower. Return it to the bottom of its owner's deck."), tk, 'T'); drainTasks();
  ok("A token's paired Pilot goes to the bottom of the deck (the token is removed)", G.enemy.deck[0]===tp && !G.enemy.deck.includes(tk) && !G.enemy.trash.includes(tp) && !G.enemy.field.includes(tk), `bottom ${G.enemy.deck[0]&&G.enemy.deck[0].name}`); }

// ============ Q117 / Q429: the token deploy into a full battle area is mandatory ============
for (const [q,id] of [['Q117 Gouf','ST03-009'],['Q429 ZnO','ST11-004']]){
  fresh('player'); const five=[]; for (let i=0;i<5;i++) five.push(stick('player',1,1));
  const g=card(id,'player'); G.player.hand=[g]; A.playFromHand(g.uid); drainTasks();
  const m=modal(); const skip=!!m && m.btns.some(b=>/skip/i.test(b));
  const picked=!!m && press(new RegExp(esc(five[0].name)));
  const tok=G.player.field.find(u=>u.token);
  ok(`${q} (player): no "Skip" — you place one of your Units in the trash, then the token is deployed`, !!m && !skip && picked && !!tok && G.player.trash.includes(five[0]) && G.player.field.length===6 && G.player.field.includes(g),
     `${JSON.stringify(m)} tok ${!!tok} field ${G.player.field.length}`);
  fresh('enemy'); for (let i=0;i<5;i++) stick('enemy',1,1); const e=card(id,'enemy'); G.enemy.hand=[e]; G._aiPostDeploy=true; A.aiMainStep(); drainTasks(); G._aiPostDeploy=false;
  ok(`${q} (AI): it places one of its Units in the trash and deploys the token`, G.enemy.field.includes(e) && G.enemy.field.some(u=>u.token) && G.enemy.field.length===6 && G.enemy.trash.length===1,
     `field ${G.enemy.field.map(u=>u.name)} trash ${G.enemy.trash.map(u=>u.name)}`);
}

// ============ Q521 + EX note: a rested EX Resource can be set active, and it leaves the game when it is used ============
for (const w of ['player','enemy']){
  fresh(w); const s=side(w); s.resMax=3; s.resAvail=3; s.exRested=1; const g=put('GD06-053',w);
  A.gd05DestroyUnit(g, s, false); drainTasks();
  const after=`resAvail ${s.resAvail} ex ${s.ex} exRested ${s.exRested}`;
  ok(`Q521 Xavier's Gyan (${w}): with every ordinary Resource active, the rested EX Resource is set active`, s.resAvail===4 && s.ex===1 && s.exRested===0, after);
  A.payCost(s, 4);
  ok(`Q521 Xavier's Gyan (${w}): the EX Resource leaves the game when it pays`, A.totalRes(s)===3 && s.ex===0 && (s.exRested||0)===0, `total ${A.totalRes(s)} ex ${s.ex} exRested ${s.exRested}`);
  fresh(w); const t=side(w); t.resMax=3; t.resAvail=2; t.exRested=1; const g2=put('GD06-053',w); A.gd05DestroyUnit(g2, t, false); drainTasks();
  ok(`Q521 Xavier's Gyan (${w}): a rested ordinary Resource is set active first (it stays after use)`, t.resAvail===3 && t.ex===0 && t.exRested===1, `resAvail ${t.resAvail} ex ${t.ex} exRested ${t.exRested}`);
}
// Suletta Mercury ST01-011 【Attack】【Once per Turn】Choose 1 of your Resources. Set it as active. — player attack (UI)
{ fresh('player'); const s=G.player; s.resMax=4; s.ex=0; s.exRested=1; s.resAvail=4; const u=stick('player',2,5); pair(u,'ST01-011'); s.resAvail=4;
  const t=stick('enemy',1,20,{rested:true}); selectAttacker(u); A.fieldClick(t.uid); drainTasks(); passAll();
  const mid=`resAvail ${s.resAvail} ex ${s.ex} exRested ${s.exRested}`;
  A.payCost(s, 5); G.over=false; A.beginTurn('player'); drainTasks();
  ok('EX note, Suletta (player): the rested EX Resource is set active, then removed when it is spent (not back next turn)', /resAvail 5 ex 1 exRested 0/.test(mid) && s.ex===0 && (s.exRested||0)===0, `${mid} → next turn ex ${s.ex} exRested ${s.exRested}`); }
// Gundam Exia ST07-001: "At the end of your turn, if there are 7 or more (CB) cards in your trash, choose 1 of your Resources. Set it as active."
for (const w of ['player','enemy']){
  fresh(w); const s=side(w); s.resMax=3; s.resAvail=3; s.exRested=1; put('ST07-001',w);
  const cb=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && /\(CB\)/.test(d.trait||'') && !/-p\d/.test(d.id));
  s.trash=[]; for (let i=0;i<7;i++) s.trash.push(card(cb.id,w)); A.refreshTrashStats(s);
  G.endActionStep=false; A.finishEndPhase(); const ex=s.ex, er=s.exRested; G.over=true; drainTasks(); G.over=false;
  ok(`EX note, Gundam Exia (${w}): the end-of-turn readying can set a rested EX Resource active`, ex===1 && !er, `ex ${ex} exRested ${er}`);
}

// ============ Q10: redraw = old hand to the bottom, draw 5 new, then shuffle; Player One first ============
{ let pl=0, ai=0, sizes=true; const N=30;
  for (let r=0;r<N;r++){ fresh('player'); const s=G.player; s.hand=[]; s.deck=[]; for (let i=0;i<50;i++) s.deck.push(card('GD01-013','player'));
    for (let i=0;i<5;i++) A.draw(s,true); const orig=[...s.hand]; A.setupHandMulligan(true); el('mullHand').onclick();
    if (s.hand.some(c=>orig.includes(c))) pl++; if (s.hand.length!==5 || s.deck.length!==45 || !orig.every(c=>s.deck.includes(c))) sizes=false; }
  for (let r=0;r<N;r++){ fresh('enemy'); const s=G.enemy; s.hand=[]; s.deck=[]; for (let i=0;i<50;i++) s.deck.push(card('GD01-013','enemy'));
    for (let i=0;i<5;i++) A.draw(s,true); s.hand.forEach(c=>c.lv=9); const orig=[...s.hand]; A.aiMulligan(s); if (s.hand.some(c=>orig.includes(c))) ai++; }
  ok('Q10 (player, Mulligan button): the new hand never holds a returned card; the old hand stays in the deck', pl===0 && sizes, `${pl}/${N} drew back a returned card`);
  ok('Q10 (AI): the new hand never holds a returned card', ai===0, `${ai}/${N}`);
  // Real setup flow: deal hands, then the first player redraws first.
  const pre={ name:'P', dg:'50nGD01-013' }, hi=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && d.lv>=6 && !/-p\d/.test(d.id));
  for (const first of ['player','enemy']){
    fresh('player'); G.setup={ playerPreset:pre, enemyPreset:{ name:'E', dg:'50n'+hi.id } }; G.firstPlayer=first;
    A.setupDealHands(); const aiHand0=[...G.enemy.hand]; const sameBefore=aiHand0.length>0;
    const pHand=[...G.player.hand]; el('mullHand').onclick(); const redrew=G.player.hand.every(c=>!pHand.includes(c));
    const aiUntouched = G.enemy.hand.every((c,i)=>c===aiHand0[i]);
    el('keepHand').onclick(); drainTasks();
    const aiChanged = !G.enemy.hand.some(c=>aiHand0.includes(c));
    if (first==='player') ok('Q10 setup flow (you go first): you redraw first; the AI redraws after you', sameBefore && redrew && aiUntouched && aiChanged && G.player.shields.length===6,
      `redrew ${redrew} aiUntouched ${aiUntouched} aiChanged ${aiChanged}`);
    else ok('Q10 setup flow (the AI goes first): the AI has already redrawn before you are asked', sameBefore && redrew && !G.aiMullPending && G.player.shields.length===6, `redrew ${redrew}`);
    if (el('beginBtl') && el('beginBtl').onclick){ G.over=true; }
  }
}

// ============ Q440 note: the viewer's 【Activate】 button escapes keyword brackets ============
{ fresh('player'); const b=put('ST12-006','player'); pair(b,'ST12-012'); G.player.trash=[]; for (let i=0;i<8;i++) G.player.trash.push(card('ST01-001','player')); A.refreshTrashStats(G.player);
  A.inspect(b); const labels=[...(el('insBtns').children||[])].map(x=>x.innerHTML||x.textContent||'');
  const fs=labels.find(l=>/First Strike/.test(l));
  ok('Q440 Banshee viewer: the 【Activate】 button shows "&lt;First Strike&gt;" (escaped, so the browser keeps the keyword)', !!fs && /&lt;First Strike&gt;/.test(fs) && !/<First Strike>/.test(fs), labels.join(' | ')); }

console.log('== FAQ checks: zone (Pilot to the deck bottom, mandatory tokens, EX Resources, redraw, labels) ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
