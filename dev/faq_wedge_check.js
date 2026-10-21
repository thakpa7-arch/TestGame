// 【Activate】 cost pickers can always be finished or cancelled (the 'activate-cost' wedge, B/P Big Preen vs P/W Impulse).
// Qubeley ST13-001's "choose 1 of your Unit tokens" picker listed tokens when it opened; a token placed in the trash to make room
// right after stayed listed, a tap on it did nothing, and the board sat in 'activate-cost'. The picker now keeps only the Units
// that can still pay, closes (nothing paid) when the cost no longer can be, and an activation can't start under another open
// choice. The cost overlays (discard / exile / per-trait exile / Zeta's Base rest, main phase and action step) have a Cancel;
// a mandatory pick the opponent's card forces (Gundam Pharact) can be completed. Big Preen's own 【Activate】 cards (Qubeley, Axis)
// are only offered when payable and their pickers finish.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
const fn=n=>A[n]||global[n];   // the game's top-level functions are globals in the harness
let pass=0; const fail=[];
function ok(name, cond, extra){ if (process.env.DEBUG) console.log((cond?"ok   ":"FAIL ")+name+(extra!==undefined?"  ["+extra+"]":"")); if(cond) pass++; else fail.push(name+(extra!==undefined?'  ('+extra+')':'')); }
let UID=995000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML=''; G.modalQueue=[];
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,activateCands:null,activateCostPicked:null,activateCostNeed:null,activatePickVerb:null,activateRestSub:null,
    activateDiscardPicks:null,activatePrepaid:false,activateCostUnit:null,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
  el('log').children.length=0;
}
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const tok=(who)=>stick(who, 2, 2, { token:true, name:'Bit / Funnel', noPilot:true });
const txt=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:txt(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>txt(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); if(!modal()) return false; const b=[...el('blockBtns').children].find(x=>re.test(txt(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const overlays=()=>(doc.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay'));
const walk=(n,out=[])=>{ for (const c of (n.children||[])){ out.push(c); walk(c,out); } return out; };
const clickables=o=>walk(o).filter(x=>typeof x.onclick==='function');
const label=x=>txt(x.textContent||x.innerHTML);
const ovButton=(re)=>{ const o=overlays()[0]; return o ? clickables(o).find(x=>re.test(label(x))) : null; };
const ovTiles=()=>{ const o=overlays()[0]; return o ? clickables(o).filter(x=>!label(x) || x.dataset.uid || x.title) .filter(x=>!/^(Confirm|Exile|Cancel|Take none)/.test(label(x))) : []; };
const logs=()=>(el('log').children||[]).map(c=>txt(c.innerHTML)).reverse();
const unitsWith=(pred, n)=>{ const out=[], seen=new Set(); for (const [id,d] of A.CARD_BY_ID){ if (/-p\d|r$/.test(id) || seen.has(d.name)) continue; if (pred(d)){ seen.add(d.name); out.push(id); if (out.length>=n) break; } } return out; };
const hasT=(d,t)=>new RegExp('\\('+t+'\\)','i').test(d.trait||'');

// ---- 1. Qubeley's token picker: a listed token leaves before it is tapped (the wedge) ----
{ fresh('player'); const q=put('ST13-001','player'); const t1=tok('player'), t2=tok('player'); const foe=stick('enemy',1,1);
  A.startActivate(q);
  ok('Qubeley with two Unit tokens opens the board token picker', G.mode==='activate-cost' && String(G.activateCands)===String([t1.uid,t2.uid]), G.mode+' '+G.activateCands);
  G.player.field.splice(G.player.field.indexOf(t1),1);           // placed in the trash to make room — a token simply ceases to exist
  // The test bot taps the first listed candidate, over and over: it must get through.
  for (let i=0; i<6 && G.mode==='activate-cost'; i++) A.fieldClick((G.activateCands||[])[0]);
  ok('tapping the first listed token gets past the picker once a listed token has left', G.mode==='activate-target', G.mode+' '+G.activateCands);
  ok('the token that left is no longer offered', !(G.activateCands||[]).includes(t1.uid));
  if (G.mode==='activate-target') A.fieldClick(foe.uid); drainTasks();
  ok('the duel resolves with the token still in play, paying ①', G.mode==='idle' && G.player.resAvail===9 && q.activatedThisTurn && !G.enemy.field.includes(foe), `mode ${G.mode} res ${G.player.resAvail}`); }
{ fresh('player'); const q=put('ST13-001','player'); const t1=tok('player'), t2=tok('player'); stick('enemy',1,1);
  A.startActivate(q);
  G.player.field=G.player.field.filter(x=>!x.token);               // both tokens gone: the cost can't be paid any more
  A.fieldClick(t1.uid);
  ok('every listed token gone: the picker closes instead of waiting forever', G.mode==='idle' && !G.pending, G.mode);
  ok('… and nothing was paid, the 【Once per Turn】 use not spent', G.player.resAvail===10 && !q.activatedThisTurn); }
{ fresh('player'); const q=put('ST13-001','player'); tok('player'); const t2=tok('player'); stick('enemy',1,1);
  A.startActivate(q); G.player.field.splice(G.player.field.indexOf(q),1); G.player.trash.push(q);
  A.fieldClick(t2.uid);
  ok('Qubeley itself left: its picker closes, nothing paid', G.mode==='idle' && G.player.resAvail===10, G.mode); }
{ fresh('player'); const q=put('ST13-001','player'); const t1=tok('player'); tok('player'); stick('enemy',1,1);
  A.startActivate(q); A.render();
  ok('the token picker shows Cancel', el('cancelBtn').style.display==='inline-block', el('cancelBtn').style.display);
  fn('cancelAction')();
  ok('Cancel backs out: idle, ① and the 【Once per Turn】 use kept, no token rested', G.mode==='idle' && G.player.resAvail===10 && !q.activatedThisTurn && !t1.rested); }
// A multi-Unit rest cost (V2 Gundam: rest 2 Units) — one of the picks is rested by something else before the last tap.
{ fresh('player'); const v2=put('GD05-001','player', { rested:false }); const a=stick('player',1,1), b=stick('player',1,1); stick('player',1,1);
  v2.rested=true;                               // "set this Unit as active" needs it rested
  if (A.activateReady(v2)){
    A.startActivate(v2);
    const was=G.mode;
    if (G.mode==='activate-cost'){ A.fieldClick(a.uid); a.rested=true; b.rested=true; A.fieldClick(b.uid); }
    ok('V2 Gundam: a rest-2 picker whose picks were rested by something else meanwhile closes (nothing paid)', was==='activate-cost' && G.mode==='idle' && !G.pending && v2.rested, was+' -> '+G.mode);
  } else ok('V2 Gundam: rest-2 ability ready for the picker test', false); }

// ---- 2. No 【Activate】 starts under another open choice (how the wedge was reached) ----
{ fresh('player'); const q=put('ST13-001','player'); tok('player'); tok('player'); stick('enemy',1,1);
  let answered=null; fn('promptTargetChoice')([...G.player.field.filter(x=>x.token)], 'Battle area full — choose one of YOUR Units to place in the trash.', t=>{ answered=t; }, 'Skip');
  A.startActivate(q);
  ok('with a choice modal open, the activation is refused (no cost picker under it)', G.mode==='idle' && !G.activateCands, G.mode+' '+G.activateCands);
  press(/Bit/); const t=answered; if (t){ G.player.field.splice(G.player.field.indexOf(t),1); }
  A.startActivate(q);
  ok('once it is answered the ability can be used', G.mode==='activate-target' || G.mode==='activate-cost', G.mode); }
// The real sequence: Haman Karn pairs with Qubeley on a full battle area; Qubeley's pair trigger deploys a Bit / Funnel and asks
// which Unit makes room. Activating Qubeley then must wait for that answer, and afterwards finish.
{ fresh('player'); const q=put('ST13-001','player'); const t0=tok('player'); for (let i=0;i<4;i++) stick('player',1,3); const foe=stick('enemy',1,1);
  G.player.deck=[]; for (let i=0;i<20;i++) G.player.deck.push(card('ST03-008','player'));
  A.attachPilot(q, card('ST13-011','player')); drainTasks();
  for (let g=0; g<12; g++){ drainTasks();
    const m=modal();
    if (m && /battle area full/i.test(m.msg)) break;
    if (m){ const b=[...el('blockBtns').children]; const one=b.find(x=>/^1\b|1 token/i.test(txt(x.innerHTML||x.textContent))); (one||b[0]).onclick(); continue; }
    const tn=ovButton(/take none|cancel|skip/i); if (tn){ tn.onclick(); continue; }
    const o=overlays()[0]; if (o){ const c=clickables(o)[0]; if (c) c.onclick(); continue; }
    break; }
  const full=modal() && /battle area full/i.test(modal().msg);
  ok('Haman Karn pairing on a full board: Qubeley asks which Unit makes room for the token', full, JSON.stringify(modal()));
  A.startActivate(q);
  ok('activating Qubeley while that prompt is open is refused', G.mode==='idle', G.mode);
  if (full){ const b=[...el('blockBtns').children].find(x=>/Bit/.test(txt(x.innerHTML||x.textContent))); if (b) b.onclick(); drainTasks(); }
  ok('the old token made room for the new one', !G.player.field.includes(t0) && G.player.field.filter(x=>x.token).length>=1, G.player.field.map(x=>x.name).join(','));
  A.startActivate(q);
  for (let i=0; i<6 && G.mode==='activate-cost'; i++) A.fieldClick((G.activateCands||[])[0]);
  if (G.mode==='activate-target') A.fieldClick((G.activateCands||[])[0]); drainTasks();
  ok('… then the activation completes', G.mode==='idle' && q.activatedThisTurn && G.player.resAvail===9, `${G.mode} res ${G.player.resAvail}`); }

// ---- 3. Cost overlays: Cancel backs out before anything is paid; completing still works ----
const tek=unitsWith(d=>d.type==='unit' && (hasT(d,'tekkadan')||hasT(d,'teiwaz')), 4);
{ fresh('player'); const lu=put('GD03-050','player'); stick('enemy',1,5);
  for (const id of tek) G.player.trash.push(card(id,'player'));
  const ready=A.activateReady(lu); A.startActivate(lu); drainTasks();
  const cb=ovButton(/^Cancel$/);
  ok('Barbatos Lupus: its exile-3 picker has a Cancel', ready && !!cb, `ready ${ready} trash ${G.player.trash.length} overlays ${overlays().length}`);
  if (cb) cb.onclick();
  ok('… Cancel exiles nothing and leaves the board idle', !overlays().length && G.mode==='idle' && G.player.trash.length===tek.length && !G.player.exile.length);
  A.startActivate(lu); const tiles=ovTiles(); tiles.slice(0,3).forEach(t=>t.onclick()); const ex=ovButton(/^Exile/); if (ex) ex.onclick();
  ok('… and picking 3 then Exile completes the cost (on to the target)', G.player.exile.length===3 && G.mode==='activate-target', `exile ${G.player.exile.length} mode ${G.mode}`); }
const sbloc=unitsWith(d=>hasT(d,'superpower bloc') && !hasT(d,'un'), 2), un=unitsWith(d=>hasT(d,'un') && !hasT(d,'superpower bloc'), 2);
{ fresh('player'); const gf=put('GD04-071','player', { rested:true });
  for (const id of [...sbloc, ...un]) G.player.trash.push(card(id,'player'));
  const ready=A.activateReady(gf); A.startActivate(gf); drainTasks();
  const cb=ovButton(/^Cancel$/);
  ok('GN Flag: its per-trait exile picker has a Cancel', ready && !!cb, `ready ${ready} ${sbloc}/${un} overlays ${overlays().length}`);
  if (cb) cb.onclick();
  ok('… Cancel exiles nothing', !overlays().length && G.mode==='idle' && !G.player.exile.length && !(gf.activatedThisTurn));
  A.startActivate(gf);
  for (let g=0; g<3 && overlays().length; g++){ const t=ovTiles()[0]; if (t) t.onclick(); drainTasks(); }
  ok('… and picking one card per part completes it', G.player.exile.length===2 && !overlays().length, `exile ${G.player.exile.length}`); }
{ fresh('player'); const gg=put('GD01-023','player');
  const zu=unitsWith(d=>d.type==='unit' && (hasT(d,'zeon')||hasT(d,'neo zeon')), 3); for (const id of zu) G.player.hand.push(card(id,'player'));
  G.player.trash.push(card('ST03-006','player'));    // something for "pair from trash" to find
  for (const id of ['ST01-010','GD05-093']) G.player.trash.push(card(id,'player'));
  const ready=A.activateReady(gg);
  if (ready){ A.startActivate(gg); drainTasks(); const cb=ovButton(/^Cancel$/);
    ok("Char's Gelgoog: its discard-cost picker has a Cancel", !!cb, `overlays ${overlays().length}`);
    if (cb) cb.onclick();
    ok('… Cancel discards nothing', !overlays().length && G.mode==='idle' && G.player.hand.length===zu.length); }
  else ok("Char's Gelgoog ready for the discard-picker test", false, JSON.stringify(gg.activate && gg.activate.cost)); }
{ fresh('player'); const z=put('GD02-069','player', { rested:true, linked:true, pilot:true, pilotCard:card('ST01-010','player') });   // 【During Link】
  G.player.base=A.exBaseToken('player'); put('GD03-079','player', { baseRestSubstitute:true });
  const ready=A.activateReady(z); A.startActivate(z); drainTasks();
  const m=modal();
  ok('Zeta Gundam: "rest the Base or the G-Defenser" offers Cancel', ready && !!m && m.btns.includes('Cancel'), JSON.stringify(m));
  press(/^Cancel$/);
  ok('… Cancel rests nothing', !modal() && G.mode==='idle' && !G.player.base.rested && z.rested); }
// Action step (the opponent's attack): the cost pickers of an 【Activate･Action】 cancel back into the action step.
{ fresh('enemy'); const sw=put('GD05-022','player'); for (const id of ['GD05-111','ST03-013','GD03-109']) G.player.trash.push(card(id,'player'));
  const att=stick('enemy',3,3); G.curAttack=att; G.curBattle={ attacker:att, defender:sw };
  let done=0, back=0; fn('actionStepActivate')(sw, att, ()=>{ done++; }, null, ()=>{ back++; }); drainTasks();
  const cb=ovButton(/^Cancel$/);
  ok('Gundam Schwarzette (action step): its exile picker has a Cancel', !!cb, `overlays ${overlays().length}`);
  if (cb) cb.onclick(); drainTasks();
  ok('… Cancel returns to the action step: nothing exiled, ability unused', back===1 && done===0 && !G.player.exile.length && !overlays().length, `back ${back} done ${done}`); }
{ fresh('enemy'); const ae=put('ST13-006','player'); stick('player',1,1); const att=stick('enemy',3,3, { lv:3 }); G.curAttack=att;
  let done=0, back=0; fn('actionStepActivate')(ae, att, ()=>{ done++; }, null, ()=>{ back++; }); drainTasks();
  const m=modal();
  ok('Gundam Aerial (action step): "choose 1 of your Units to rest as the cost" offers Cancel', !!m && m.btns.includes('Cancel'), JSON.stringify(m));
  press(/^Cancel$/);
  ok('… Cancel rests nothing and returns to the action step', back===1 && done===0 && !G.player.field.some(x=>x.rested)); }

// ---- 4. A mandatory pick forced on you (Gundam Pharact: "that player chooses 2 Unit cards from their trash") can be finished ----
{ fresh('enemy'); const ids=unitsWith(d=>d.type==='unit', 4); for (const id of ids) G.player.trash.push(card(id,'player'));
  const ph=put('ST13-009','enemy'); A.runTrigger(ph, G.enemy, A.parseTrigger(ph.effect,'Attack'), 'Attack'); drainTasks();
  const o=overlays()[0], conf=o && clickables(o).find(x=>x.dataset && x.dataset.role==='confirm');
  ok('Pharact: your exile choice opens as a pick (no Cancel — it is mandatory)', !!conf && !ovButton(/^Cancel$/));
  ovTiles().slice(0,2).forEach(t=>t.onclick());
  ok('… two picks enable Confirm', conf && !conf.disabled);
  if (conf) conf.onclick();
  ok('… and Confirm exiles them and closes it', !overlays().length && G.player.exile.length===2 && G.player.trash.length===ids.length-2); }

// ---- 5. B/P Big Preen's 【Activate】 cards: offered only when payable, and each picker finishes ----
{ const deck=A.PRESET_DECKS.find(d=>/Big Preen/.test(d.name));
  const ids=[...new Set((deck.dg.match(/[A-Z]{2}\d{2}-\d{3}/g)||[]))];
  const acts=ids.map(id=>card(id,'player')).filter(c=>c.activate || c.activate2);
  ok('Big Preen: its 【Activate】 cards are Qubeley and Axis (no discard / exile / trash costs)', acts.map(c=>c.name).sort().join(',')==='Axis,Qubeley' && acts.every(c=>['resource','rest'].includes(c.activate.cost.type)), acts.map(c=>c.name+':'+c.activate.cost.type).join(',')); }
{ fresh('player'); const q=put('ST13-001','player'); tok('player'); stick('enemy',1,1);
  G.player.resAvail=0; ok('Qubeley: not offered without ①', !A.activateReady(q)); G.player.resAvail=10;
  ok('Qubeley: offered with ①, a token and an enemy Unit', A.activateReady(q));
  G.enemy.field=[]; ok('Qubeley: not offered without an enemy Unit', !A.activateReady(q)); stick('enemy',1,1);
  G.player.field=G.player.field.filter(x=>!x.token); ok('Qubeley: not offered without a Unit token', !A.activateReady(q)); }
{ fresh('player'); const ax=card('GD05-129','player'); G.player.base=ax; ax.hp=ax.hp||6;
  const nz=unitsWith(d=>d.type==='unit' && (d.lv||0)<=3 && hasT(d,'neo zeon'), 2); for (const id of nz) G.player.hand.push(card(id,'player'));
  ok('Axis: not offered unless a Unit was destroyed by your (Neo Zeon) effect this turn', !A.activateReady(ax));
  G.player.neoZeonSelfKill=true;
  ok('Axis: offered once one was (and a Lv.3-or-lower (Neo Zeon) Unit is in hand)', A.activateReady(ax), nz.join(','));
  A.startActivate(ax); drainTasks();
  const t=ovTiles()[0]; if (t) t.onclick(); drainTasks();
  ok('Axis: choosing the Unit deploys it and rests Axis', ax.rested && G.player.field.length===1 && G.player.hand.length===nz.length-1 && !overlays().length && G.mode==='idle', `field ${G.player.field.length} hand ${G.player.hand.length} mode ${G.mode}`);
  ok('Axis: not offered again this turn', !A.activateReady(ax)); }
{ fresh('player'); const ax=card('GD05-129','player'); G.player.base=ax; ax.hp=ax.hp||6; G.player.neoZeonSelfKill=true;
  G.player.hand.push(card('GD05-049','player'));   // Sazabi: Lv.7 — not a legal pick
  ok('Axis: not offered with no Lv.3-or-lower (Neo Zeon) Unit in hand', !A.activateReady(ax)); }

console.log('== 【Activate】 cost pickers: finish or cancel (activate-cost wedge, Big Preen) ==');
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
