// Audit 3, group q (player choices for discard / exile costs): the human player chooses which hand card is discarded and which
// trash cards are exiled — for a 【When Linked】"Discard 1. If you do, draw 1." (Dearka Elthman), an 【Activate･Main】 discard
// cost (Char's Gelgoog), a "You may choose 3 (Londo Bell) cards … Exile them" (Nu Gundam) and 【Activate･Action】 costs paid
// from an action step (Gundam Schwarzette, Banshee, Gundam Aerial's "Rest 1 friendly Unit"). The AI keeps auto-paying.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=970000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,activateRestSub:null,activatePrepaid:false,activateDiscardPicks:null,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
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
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (!/Action Step|block|Block|intercept/i.test(m.msg)) break; if (!press(/^Pass|No block|Don't block|Take it/i)) break; } };
const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null;
const ovTitle=()=>{ const o=overlay(); return o ? strip(o.children[0].innerHTML) : ''; };
const ovUids=()=>{ const o=overlay(); return o ? [...o.children[0].children[0].children].map(t=>+t.dataset.uid) : []; };
function pickTiles(uids){ const o=overlay(); if(!o) return false; const box=o.children[0]; const row=box.children[0];
  for (const t of row.children) if (t.style.borderColor==='#34d399') t.onclick();
  for (const t of row.children) if (uids.includes(+t.dataset.uid)) t.onclick();
  const conf=box.children.find(x=>x.dataset && x.dataset.role==='confirm'); if(!conf) return false; conf.onclick(); drainTasks(); return true; }
// G.mode==='discard': what tapping a hand card does.
function discardPick(c){ const p=G.pending; const s=G.player; s.hand.splice(s.hand.indexOf(c),1); A.sendToTrash(c, s); p.discardLeft--; if (p.discardLeft<=0){ const after=p.after; G.mode='idle'; G.pending=null; if (after) after(); } drainTasks(); }
const attack=(atk, def)=>{ A.fieldClick(atk.uid); drainTasks(); if (G.selected!==atk.uid){ G.selected=atk.uid; G.mode='attack-target'; } if (def) A.fieldClick(def.uid); else A.attackDirect(); drainTasks(); };
const logs=()=>(el('log').children||[]).map(c=>strip(c.innerHTML||c.textContent));

// ── GD01-095 Dearka Elthman 【When Linked】Discard 1. If you do, draw 1. ──
{ fresh('player'); const u=put('GD01-046','player');                      // Buster Gundam (link: Dearka Elthman)
  const keep=card('ST01-002','player'), cheap=card('ST01-003','player'); G.player.hand=[keep, cheap];
  const d=card('GD01-095','player'); G.player.hand.push(d); const deck0=G.player.deck.length;
  A.playFromHand(d.uid); drainTasks(); if (G.mode!=='idle' && !u.pilot){ A.fieldClick(u.uid); drainTasks(); }
  ok('Dearka (player): linking opens the discard choice, nothing discarded or drawn yet', u.linked && G.mode==='discard' && G.player.hand.length===2 && G.player.deck.length===deck0, `${u.linked} ${G.mode} ${G.player.hand.length}`);
  discardPick(keep);   // the card autoDiscard would NOT pick (it throws away the cheaper one)
  ok('Dearka (player): the chosen card is discarded, then 1 is drawn', G.player.trash.includes(keep) && G.player.hand.includes(cheap) && G.player.hand.length===2 && G.player.deck.length===deck0-1 && G.mode==='idle',
     `${G.player.trash.map(c=>c.name)} | ${G.player.hand.map(c=>c.name)} ${G.mode}`); }
{ fresh('player'); const u=put('GD01-046','player'); const d=card('GD01-095','player'); G.player.hand=[d]; const deck0=G.player.deck.length;
  A.playFromHand(d.uid); drainTasks(); if (G.mode!=='idle' && !u.pilot){ A.fieldClick(u.uid); drainTasks(); }
  ok('Dearka (player): with an empty hand nothing is discarded, so nothing is drawn', u.linked && G.mode==='idle' && G.player.deck.length===deck0 && G.player.hand.length===0, `${G.mode} ${G.player.deck.length}`); }
{ fresh('enemy'); const u=put('GD01-046','enemy'); G.enemy.hand=[card('ST01-002','enemy'), card('ST01-003','enemy')]; const deck0=G.enemy.deck.length;
  pair(u, 'GD01-095');
  ok('Dearka (AI): links, discards 1 by itself and draws 1', u.linked && G.enemy.trash.length===1 && G.enemy.hand.length===2 && G.enemy.deck.length===deck0-1 && !modal() && !overlay(), `${u.linked} ${G.enemy.trash.length} ${G.enemy.hand.length}`); }

// ── GD01-023 Char's Gelgoog 【Activate･Main】Discard 1 (Zeon)/(Neo Zeon) Unit card：pair a (Newtype) Pilot from the trash ──
{ fresh('player'); const g=put('GD01-023','player');
  const zaku=card('GD01-035','player'), wing=card('GD01-024','player'), geara=card('GD01-052','player'); G.player.hand=[zaku, wing, geara];
  G.player.trash=[card('ST03-011','player')];
  A.startActivate(g); drainTasks();
  const ids=ovUids();
  ok("Char's Gelgoog (player): a chooser of the 2 (Zeon)/(Neo Zeon) Unit cards opens before anything is paid", !!overlay() && /discard/i.test(ovTitle()) && ids.length===2 && ids.includes(zaku.uid) && ids.includes(geara.uid) && G.player.hand.length===3, `${ovTitle()} ${ids}`);
  pickTiles([geara.uid]);
  ok("Char's Gelgoog (player): the chosen card (Geara Zulu) is discarded, Zaku II stays, and Char is paired", G.player.trash.includes(geara) && G.player.hand.includes(zaku) && G.player.hand.includes(wing) && g.pilot && /Char/.test(g.pilot.name||g.pilotCard&&g.pilotCard.name||''),
     `${G.player.hand.map(c=>c.name)} | ${g.pilot && g.pilot.name}`); }
{ fresh('player'); const g=put('GD01-023','player'); const zaku=card('GD01-035','player'), wing=card('GD01-024','player'); G.player.hand=[zaku, wing];
  G.player.trash=[card('ST03-011','player')];
  A.startActivate(g); drainTasks();
  ok("Char's Gelgoog (player): with one eligible card it is discarded without a chooser", !overlay() && G.player.trash.includes(zaku) && G.player.hand.includes(wing) && !!g.pilot, `${!!overlay()} ${G.player.hand.map(c=>c.name)}`); }
{ fresh('enemy'); const g=put('GD01-023','enemy'); const zaku=card('GD01-035','enemy'), geara=card('GD01-052','enemy'); G.enemy.hand=[zaku, geara];
  G.enemy.trash=[card('ST03-011','enemy')];
  A.applyActivateEffect(g, null, G.enemy); drainTasks();
  ok("Char's Gelgoog (AI): pays the discard itself (lowest value) and pairs the Pilot", !overlay() && G.enemy.hand.length===1 && G.enemy.trash.some(c=>c===zaku||c===geara) && !!g.pilot, `${G.enemy.hand.map(c=>c.name)} ${!!g.pilot}`); }

// ── GD05-017 Nu Gundam 【When Paired】You may choose 3 (Londo Bell) cards from your trash. Exile them … ──
{ fresh('player'); const nu=put('GD05-017','player');
  const tr=['GD05-027','GD05-019','GD05-023','GD05-020'].map(id=>card(id,'player')); G.player.trash.push(...tr); A.refreshTrashStats(G.player);
  const e=stick('enemy',1,2,{name:'E'});
  pair(nu, vpilot('player','Amuro Ray',{trait:'(Earth Federation) (Newtype)'}));
  const m=modal(); ok('Nu Gundam (player): the "you may" prompt offers the enemy Unit and a decline', !!m && m.btns.some(b=>/^E /.test(b)) && m.btns.some(b=>/Don't use/.test(b)), JSON.stringify(m));
  pressUnit(e);
  const ids=ovUids();
  ok('Nu Gundam (player): with 4 (Londo Bell) cards in the trash, a 3-card exile chooser opens', !!overlay() && /exile/i.test(ovTitle()) && ids.length===4 && G.player.exile.length===0, `${ovTitle()} ${ids.length}`);
  pickTiles([tr[1].uid, tr[2].uid, tr[3].uid]);
  ok('Nu Gundam (player): exactly the 3 chosen cards are exiled (the first one stays) and the battle happens', G.player.trash.includes(tr[0]) && [tr[1],tr[2],tr[3]].every(c=>G.player.exile.includes(c)) && !G.enemy.field.includes(e),
     `${G.player.exile.map(c=>c.name)} | trash ${G.player.trash.map(c=>c.name)} | e ${G.enemy.field.includes(e)}`); }
{ fresh('player'); const nu=put('GD05-017','player');
  const tr=['GD05-027','GD05-019','GD05-023'].map(id=>card(id,'player')); G.player.trash.push(...tr); A.refreshTrashStats(G.player);
  const e=stick('enemy',1,2,{name:'E'});
  pair(nu, vpilot('player','Amuro Ray',{trait:'(Earth Federation) (Newtype)'}));
  pressUnit(e);
  ok('Nu Gundam (player): with exactly 3 (Londo Bell) cards there is no chooser — all 3 are exiled', !overlay() && tr.every(c=>G.player.exile.includes(c)) && !G.enemy.field.includes(e), `${!!overlay()} ${G.player.exile.length}`); }
{ fresh('player'); const nu=put('GD05-017','player');
  const tr=['GD05-027','GD05-019','GD05-023','GD05-020'].map(id=>card(id,'player')); G.player.trash.push(...tr); A.refreshTrashStats(G.player);
  const e=stick('enemy',1,2,{name:'E'});
  pair(nu, vpilot('player','Amuro Ray',{trait:'(Earth Federation) (Newtype)'}));
  press(/Don't use/);
  ok('Nu Gundam (player): declining exiles nothing and starts no battle', !overlay() && G.player.exile.length===0 && G.enemy.field.includes(e)); }
{ fresh('enemy'); const nu=put('GD05-017','enemy');
  const tr=['GD05-027','GD05-019','GD05-023','GD05-020'].map(id=>card(id,'enemy')); G.enemy.trash.push(...tr); A.refreshTrashStats(G.enemy);
  const p=stick('player',1,2,{name:'P'});
  A.gd05NuBattleResolve(G.enemy, nu, p); drainTasks();
  ok('Nu Gundam (AI): exiles 3 (Londo Bell) cards itself and battles', !overlay() && G.enemy.exile.length===3 && !G.player.field.includes(p), `${G.enemy.exile.length}`); }

// ── GD05-022 Gundam Schwarzette 【Activate･Action】Exile 2 Command cards in your trash：during this battle, reduce enemy damage by 2 ──
{ fresh('player'); const sw=put('GD05-022','player'); const cs=[card('GD05-121','player'), card('GD05-108','player'), card('GD05-113','player')];
  G.player.trash.push(...cs); A.refreshTrashStats(G.player);
  const t=stick('enemy',4,9,{rested:true});
  attack(sw, t);
  const m=modal(); ok('Schwarzette (player): its 【Activate･Action】 is offered in the attack\'s action step', !!m && /Action Step/.test(m.msg) && m.btns.some(b=>/Schwarzette/.test(b)), JSON.stringify(m));
  press(/Schwarzette/);
  ok('Schwarzette (player): choosing it in the action step opens a 2-of-3 Command chooser, nothing exiled yet', !!overlay() && /exile/i.test(ovTitle()) && ovUids().length===3 && G.player.exile.length===0, `${ovTitle()} ${G.player.exile.length}`);
  pickTiles([cs[1].uid, cs[2].uid]);
  ok('Schwarzette (player): exactly the chosen 2 Commands are exiled, the first stays', G.player.trash.includes(cs[0]) && G.player.exile.includes(cs[1]) && G.player.exile.includes(cs[2]) && G.player.exile.length===2, `${G.player.exile.map(c=>c.name)}`);
  passAll();
  ok('Schwarzette (player): the reduction applies in that battle (4 damage reduced to 2)', sw.maxHp-sw.hp===2 && !G.activatePrepaid && !G.curBattle, `${sw.maxHp} -> ${sw.hp}`); }
{ fresh('enemy'); const sw=put('GD05-022','enemy'); const cs=[card('GD05-121','enemy'), card('GD05-108','enemy'), card('GD05-113','enemy')];
  G.enemy.trash.push(...cs); A.refreshTrashStats(G.enemy);
  A.applyActivateEffect(sw, null, G.enemy); drainTasks();
  ok('Schwarzette (AI): pays its exile cost itself (2 Commands)', !overlay() && G.enemy.exile.length===2 && G.enemy.trash.length===1, `${G.enemy.exile.length}`); }

// ── ST12-006 Banshee (Destroy Mode) 【Activate･Action】Exile 4 cards in your trash：<Suppression> during this battle (same path) ──
{ fresh('player'); const b=put('ST12-006','player'); pair(b, vpilot('player','Marida Cruz'));
  const cs=['GD05-121','GD05-108','GD05-113','GD05-027','GD05-019'].map(id=>card(id,'player')); G.player.trash.push(...cs); A.refreshTrashStats(G.player);
  const t=stick('enemy',1,9,{rested:true});
  attack(b, t);
  press(/Banshee/);
  ok('Banshee (player): the action-step exile cost opens a 4-of-5 chooser', !!overlay() && ovUids().length===5 && G.player.exile.length===0, `${ovTitle()} ${G.player.exile.length}`);
  pickTiles([cs[1].uid, cs[2].uid, cs[3].uid, cs[4].uid]);
  ok('Banshee (player): exactly the chosen 4 are exiled', G.player.trash.includes(cs[0]) && G.player.exile.length===4, `${G.player.exile.map(c=>c.name)}`);
  passAll(); }

// ── ST13-006 Gundam Aerial 【Activate･Action】【Once per Turn】Rest 1 friendly Unit：deal 1 to an enemy Unit Lv.4 or lower ──
{ fresh('player'); const ae=put('ST13-006','player'); const f1=stick('player',1,1,{name:'F1'}), f2=stick('player',5,5,{name:'F2'});
  const t=stick('enemy',1,9,{rested:true, name:'T'});
  attack(ae, t);
  press(/Aerial/);
  const m=modal();
  ok('Aerial (player): the action-step rest cost asks which friendly Unit to rest', !!m && /rest as the cost/.test(m.msg) && m.btns.some(b=>/^F1 /.test(b)) && m.btns.some(b=>/^F2 /.test(b)), JSON.stringify(m));
  const ap=A.effAp(ae); press(/^F2 /); passAll();
  ok('Aerial (player): the chosen Unit (not the lowest-AP one) is rested and the 1 damage is dealt (then the battle)', f2.rested && !f1.rested && t.hp===9-1-ap, `${f1.rested} ${f2.rested} ${t.hp} ${JSON.stringify(modal())}`);
  passAll(); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all audit3 group q checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
