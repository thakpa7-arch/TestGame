// Full player-driven games across every PRESET deck, with card-conservation and rules invariants.
const H = require('./harness.js');
const { A, drainTasks, recordErr, ERRORS, setCtx } = H;
const G = A.G;
const doc = global.document; const el = id => doc.getElementById(id);

const VIOL=[]; const seenKey=new Set();
let PEND=new Map();   // uid -> pending loss, cleared if the card reappears
function viol(tag,msg){ const k=msg.replace(/\d+/g,'#').slice(0,90); if(seenKey.has(k)&&VIOL.length>40) return; seenKey.add(k); VIOL.push(tag+' :: '+msg); }
function zones(s){ return [s.deck,s.hand,s.field,s.shields,s.trash,s.exile]; }
function allCards(s){ const o=[]; for(const z of zones(s)) for(const c of z) o.push(c);
  for(const u of s.field) if(u&&u.pilotCard) o.push(u.pilotCard);
  if(s.base){ o.push(s.base); if(s.base.pilotCard) o.push(s.base.pilotCard); } return o; }
function census(s){ return allCards(s).filter(c=>c&&!c.token).map(c=>c.uid); }
const CHK={ lastTurn:null };
function check(tag, base){
  if (G.turn!==CHK.lastTurn){
    if (CHK.lastTurn){ const es = CHK.lastTurn==='player'?G.player:G.enemy;   // the side whose turn just ended
      if (es.hand.length>10) viol(tag,`${CHK.lastTurn==='player'?'P':'A'} ended its turn with hand>10 (${es.hand.length})`);
      if (process.env.TRACEHAND) console.log(`  [handover] ${CHK.lastTurn} -> ${G.turn}: P hand ${G.player.hand.length} A hand ${G.enemy.hand.length}`); }
    CHK.lastTurn=G.turn;
  }
  for (const s of [G.player,G.enemy]){
    const w=s===G.player?'P':'A';
    if (s.resAvail<0) viol(tag,`${w} resAvail<0 (${s.resAvail})`);
    if (s.resAvail>s.resMax+s.ex) viol(tag,`${w} resAvail>total (${s.resAvail}/${s.resMax+s.ex})`);
    if (s.field.length>6) viol(tag,`${w} field>6 (${s.field.length})`);
    // The hand may exceed 10 at any time except when your own turn ends (4-8-4, 7-6-5): off-turn Bursts
    // ("add this card to your hand") and draws can push it past 10 legally. Checked at the turn handover below.
    if (s.shields.length>A.SHIELD_MAX) viol(tag,`${w} shields>${A.SHIELD_MAX}`);
    if (s.base && s.base.type!=='base') viol(tag,`${w} non-base in base zone: ${s.base.name}`);
    for (const u of s.field){
      if (u.type!=='unit') viol(tag,`${w} non-unit on field: ${u.name}`);
      if (u.hp<=0) viol(tag,`${w} dead-on-field ${u.name} hp=${u.hp}`);
      if (u.hp>A.effMaxHp(u)) viol(tag,`${w} hp>maxHp ${u.name} ${u.hp}/${A.effMaxHp(u)}`);
      if (isNaN(u.ap)||isNaN(u.hp)) viol(tag,`${w} NaN stat ${u.name}`);
      if (A.effAp(u)<0) viol(tag,`${w} negative AP ${u.name}`);
      if (u.pilot&&!u.pilotCard) viol(tag,`${w} ${u.name} pilot without pilotCard`);
      if (u.linked&&!u.pilot) viol(tag,`${w} ${u.name} linked without a Pilot`);
    }
    const ids=allCards(s).filter(Boolean).map(c=>c.uid);
    const dup=ids.filter((v,i)=>ids.indexOf(v)!==i);
    if (dup.length) viol(tag,`${w} card in two zones (uid ${dup[0]})`);
  }
  const pu=new Set(allCards(G.player).filter(Boolean).map(c=>c.uid));
  for (const c of allCards(G.enemy)) if (c && pu.has(c.uid)) viol(tag,`uid ${c.uid} on both sides (${c.name})`);
  // Conservation: a card sitting in an OPEN modal (a look-at-top-N pick) is legitimately in no zone
  // for a moment, so a loss only counts once it survives to the end of the game.
  if (base){
    for (const [w,s,b] of [['P',G.player,base.p],['A',G.enemy,base.a]]){
      const now=new Set(census(s));
      for (const u of b) if (!now.has(u) && !PEND.has(u)) PEND.set(u, `${w} lost a card from all zones (uid ${u})`);
      for (const u of [...PEND.keys()]) if (now.has(u)) PEND.delete(u);
      const gained=[...now].filter(u=>!b.has(u));
      if (gained.length) viol(tag,`${w} gained ${gained.length} unexpected card(s)`);
    }
    if (/\|final$/.test(tag)){
      for (const msg of PEND.values()) viol(tag, msg);
      PEND.clear();
    }
  }
}
function driveBodyModal(){
  for (const modal of [...(doc.body.children||[])]){
    const box=modal.children&&modal.children[0]; if(!box||!box.children) continue;
    let confirm=null,row=null,skip=null;
    for (const ch of box.children){ const t=(ch.textContent||ch.innerHTML||'');
      if (ch.onclick&&/exile|add|confirm|done|return|keep|bottom/i.test(t)) confirm=ch;
      if (ch.onclick&&/take none|none|skip|cancel/i.test(t)) skip=ch;
      if (ch.children&&ch.children.length) row=ch; }
    if (confirm&&row){ const tiles=row.children.filter(x=>x.onclick);
      for(let i=0;i<tiles.length&&confirm.disabled;i++){ try{tiles[i].onclick();}catch(e){recordErr('tile',e);} }
      try{ if(confirm.onclick) confirm.onclick(); }catch(e){recordErr('confirm',e);} continue; }
    if (row){ const tiles=row.children.filter(x=>x.onclick);
      try{ if(tiles.length&&Math.random()<0.7) tiles[Math.floor(Math.random()*tiles.length)].onclick();
           else if(skip) skip.onclick(); else if(tiles.length) tiles[0].onclick(); }catch(e){recordErr('pickmodal',e);} }
  }
}
function answerBlockModal(){
  let g=0;
  while (el('blockModal').classList.contains('show') && g++<40){
    const b=el('blockBtns').children; if(!b.length) break;
    // A <Support> offer only appears when the boost wins the fight, and a "choose 1 of your Units" chooser lists the
    // game's recommended Unit first: the heuristic player takes those.
    const pick=/Support|choose 1 of your Units/.test(el('blockMsg').innerHTML||'') ? b[0] : b[Math.floor(Math.random()*b.length)];
    el('blockModal').classList.remove('show');
    try{ if(pick&&pick.onclick) pick.onclick(); }catch(e){recordErr('modal',e);}
    drainTasks();
  }
  driveBodyModal();
}
const MODES={};
function autoResolve(tag, base){
  let guard=0;
  while (!G.over && guard++<90){
    drainTasks(); answerBlockModal();
    const m=G.mode, p=G.pending;
    if (m==='idle'||m==='attack-target') return;
    MODES[m]=(MODES[m]||0)+1; check(tag, base); setCtx(tag+'|'+m);
    try {
      if (m==='discard'){ const c=G.player.hand[0]; if(!c){G.mode='idle';G.pending=null;continue;}
        G.player.hand.splice(0,1); A.sendToTrash(c,G.player); p.discardLeft--;
        if(p.discardLeft<=0){const af=p.after;G.mode='idle';G.pending=null;if(af)af();} }
      else if (m==='field-replace'){ const v=G.player.field[0]; if(v)A.fieldClick(v.uid); else {G.mode='idle';G.pending=null;} }
      else if (m==='token-replace'){ const v=G.player.field.find(x=>!p.protect.has(x.uid)); if(v)A.fieldClick(v.uid); else {const af=p.after;G.mode='idle';G.pending=null;if(af)af();} }
      else if (m==='pilot-target'){ const u=G.player.field.find(x=>x.type==='unit'&&!x.pilot&&!x.noPilot); if(u)A.fieldClick(u.uid); else {G.mode='idle';G.pending=null;} }
      else if (m==='command-target'){ const a=p.action; const ene=['damage','rest','destroy','bounce','debuff'].includes(a.kind);
        const pool=(ene?G.enemy:G.player).field; const legal=ene?A.enemyTargets(G.enemy,a):pool; const t=legal[0]||pool[0];
        if(t)A.fieldClick(t.uid); else {G.mode='idle';G.pending=null;} }
      else if (m==='activate-cost'){ const c=G.activateCands||G.player.field.map(x=>x.uid); if(c.length)A.fieldClick(c[0]); else {G.mode='idle';G.pending=null;} }
      else if (m==='activate-target'){ const sc=p.activate.action.scope; const c=G.activateCands||(sc==='enemy'?G.enemy:G.player).field.map(x=>x.uid); if(c.length)A.fieldClick(c[0]); else {G.mode='idle';G.pending=null;} }
      else if (m==='self-rest-pick'||m==='trigger-multi'){ const n=p.cands.find(u=>!p.picked.includes(u)); if(n!=null)A.fieldClick(n); else {G.mode='idle';G.pending=null;} }
      else if (p&&p.cands&&p.cands.length) A.fieldClick(p.cands[0]);
      else { G.mode='idle'; G.pending=null; }
    } catch(e){ recordErr('resolve:'+m,e); G.mode='idle'; G.pending=null; }
  }
  if (!G.over && G.mode!=='idle' && G.mode!=='attack-target'){ viol(tag,`WEDGED in mode '${G.mode}'`); G.mode='idle'; G.pending=null; }
}
function initGame(pp, ep, fp){
  Object.assign(G, { turn:'player', turnNumber:1, phase:'main', selected:null, mode:'idle',
    pending:null, pendingHandIdx:-1, over:false, firstPlayer:fp, skipDrawSide:fp,
    player:A.makeSide('player'), enemy:A.makeSide('enemy'),
    playerDeckName:pp.name, enemyDeckName:ep.name, aiForceFace:false });
  G.player.deck=A.buildPresetDeck('player',pp); G.enemy.deck=A.buildPresetDeck('enemy',ep);
  for(let i=0;i<5;i++){ A.draw(G.player,true); A.draw(G.enemy,true); }
  for(const s of [G.player,G.enemy]){ for(let i=0;i<6&&s.deck.length;i++) s.shields.push(s.deck.pop()); s.base=A.exBaseToken(s.who); }
  (fp==='player'?G.enemy:G.player).ex=1;
}
let attacksSeen=0;
function playerTurn(tag, base){
  const s=G.player; let tries=0;
  while (tries++<12 && !G.over && G.mode==='idle'){
    const playable=s.hand.filter(c=>!A.affordIssue(s,c)); if(!playable.length) break;
    const card=playable[Math.floor(Math.random()*playable.length)];
    setCtx(tag+'|play:'+card.name); check(tag, base);
    const before=s.resAvail, cost=A.effectiveCost(s,card);
    const lvOk = (s.resMax+s.ex) >= Math.min(card.lv||0, card.altPlay ? card.altPlay.lv : 99);   // "…play it as if it has N Lv. and cost" (altPlay)
    try { A.playFromHand(card.uid, true); } catch(e){ recordErr('playFromHand',e); G.mode='idle'; G.pending=null; }
    if (!s.hand.includes(card)){
      if (!lvOk) viol('cost', `played ${card.name} Lv${card.lv} with only ${s.resMax+s.ex} resources`);
      if (s.resAvail<0) viol('cost', `${card.name} drove resAvail negative`);
      if (!/resource/i.test(String(card.effect||'')) && cost>0 && s.resAvail > before-cost)
        viol('cost', `${card.name} cost ${cost} but resAvail went ${before}->${s.resAvail}`);
    }
    autoResolve(tag, base);
  }
  for (const u of [...s.field, s.base].filter(Boolean)){
    if (G.over) break;
    if (A.activateReady(u)){ setCtx(tag+'|act:'+u.name);
      try { A.startActivate(u); } catch(e){ recordErr('startActivate',e); G.mode='idle'; G.pending=null; }
      autoResolve(tag, base); }
  }
  let ag=0;
  while (ag++<10 && !G.over){
    if (G.mode!=='idle') autoResolve(tag, base);
    const atk=s.field.find(u=>!u.sick&&!u.rested&&A.effAp(u)>0&&!A.trashBlocksAttack(u,s)); if(!atk) break;
    setCtx(tag+'|atk:'+atk.name); check(tag, base);
    attacksSeen++;
    if (atk.sick) viol(tag,`attack by a SICK unit: ${atk.name}`);
    if (atk.rested) viol(tag,`attack by a RESTED unit: ${atk.name}`);
    G.selected=atk.uid; G.mode='attack-target';
    try {
      const hit=G.enemy.field.filter(u=>u.hp>0&&!A.effUntargetable(u)&&(u.rested||A.canHitActive(atk,u)));
      if (hit.length&&Math.random()<0.5) A.fieldClick(hit[0].uid);
      else if (!A.cantHitPlayer(atk)) A.attackDirect();
      else if (hit.length) A.fieldClick(hit[0].uid);
      else { atk.rested=true; G.mode='idle'; G.selected=null; }
    } catch(e){ recordErr('attack',e); atk.rested=true; G.mode='idle'; G.selected=null; }
    autoResolve(tag, base);
  }
  if (G.mode!=='idle') autoResolve(tag, base);
  G.mode='idle'; G.selected=null;
  setCtx(tag+'|endTurn'); check(tag, base);
  try { A.endTurn(); } catch(e){ recordErr('endTurn',e); }
  autoResolve(tag, base);
}
function winnerOf(){ const logs=(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
  for(const l of logs){ if(/you win!/i.test(l)) return 'player'; if(/you are defeated/i.test(l)) return 'ai'; } return null; }

const D=A.PRESET_DECKS; const R=+(process.env.ROUNDS||4);
let games=0, over=0, pw=0, aw=0;
for (let i=0;i<D.length;i++) for (let j=0;j<D.length;j++){
  if (i===j) continue;
  for (let r=0;r<R;r++){
    const tag=`${D[i].name}(P) vs ${D[j].name}(AI) #${r}`; setCtx(tag); Math.random();
    try {
      CHK.lastTurn=null;
      initGame(D[i], D[j], r%2?'player':'enemy');
      const base={ p:new Set(census(G.player)), a:new Set(census(G.enemy)) };
      A.beginTurn(G.firstPlayer); autoResolve(tag, base);
      let turns=0, stall=0;
      while(!G.over && turns<28 && stall<140){
        stall++; autoResolve(tag, base); drainTasks(); answerBlockModal(); if(G.over) break;
        if(G.turn==='player'&&G.mode==='idle'){ playerTurn(tag, base); turns++; continue; }
        if(G.turn==='player'){ autoResolve(tag, base); continue; }
        if(G.turn==='enemy'){ drainTasks(); answerBlockModal(); check(tag+'|ai', base); turns++; }
      }
      if (G.over){ over++; const w=winnerOf(); if(w==='player')pw++; else if(w==='ai')aw++; }
      check(tag+'|final', base);
    } catch(e){ recordErr('game',e); }
    games++;
  }
}
console.log(`\n== full games over ${D.length} preset decks ==`);
console.log(`games: ${games} | reached game-over: ${over} | attacks: ${attacksSeen}`);
console.log('WIN RATE (heuristic player vs AI):  player', pw, '| AI', aw);
console.log('Interactive modes exercised:', JSON.stringify(MODES));
console.log('violations:', VIOL.length);
VIOL.slice(0,25).forEach(v=>console.log('  ! '+v));
console.log('Errors:', ERRORS.length);
const by={}; for(const e of ERRORS){ (by[e.msg||'?']=by[e.msg||'?']||[]).push(e); }
for(const k of Object.keys(by).slice(0,8)){ console.log(`\n### ${k} (${by[k].length})`);
  by[k].slice(0,3).forEach(e=>console.log('   ['+e.phase+'] '+e.ctx+'\n       '+(e.stack||''))); }
