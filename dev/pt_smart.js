// Full games of a SMART scripted player (blocker-aware attacks, value-based blocks, resource-maximizing deploys) against the AI
// at the level in $AI (default hard) across every PRESET deck pairing. Its win rate is the benchmark the hard AI is tuned against;
// the same card-conservation and rules invariants as pt_games.js apply.
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
      if (es.hand.length>10 && !/\|final$/.test(tag)) viol(tag,`${CHK.lastTurn==='player'?'P':'A'} ended its turn with hand>10 (${es.hand.length})`);
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

// ---- the smart player: the plays a decent human makes ----
const SV=u=>A.keepVal(u);
// What a landed direct hit on `foe` is worth to the attacker.
function faceVal(atk, foe){
  if (A.cantHitPlayer(atk)) return -1e9;
  const ap=A.effAp(atk);
  if (foe.base && foe.base.hp>0){ const bh=foe.base.hp; return ap>=bh ? 3 : 1.2*ap/bh; }
  const sh=foe.shields.length; if (sh<=0) return 1000;
  const n=A.effSuppression(atk)?2:1;
  return (sh<=1 ? 6 : sh===2 ? 4.5 : sh===3 ? 3.5 : 2.5) * Math.min(n, sh);
}
// Cost of `u` sitting rested through `foe`'s next turn: its best killer there.
function exposure(u, foe){
  let worst=0;
  for (const k of foe.field){ if (k.hp<=0 || A.effAp(k)<u.hp) continue;
    const surv = k.hp>A.effAp(u) || A.effFirstStrike(k);
    worst=Math.max(worst, surv ? Math.max(0, SV(u)*0.8-1.5) : Math.max(0, SV(u)-SV(k))*0.5); }
  return worst;
}
// The defender's best block of `atk` (attacking `target`, or face when null): the blocker and its value to the defender.
function bestBlock(atk, target, def){
  if (A.effHighManeuver(atk)) return null;
  const bl=def.field.filter(b=>A.effBlocker(b)&&!b.rested&&b.hp>0&&b!==target&&A.blockerAllowed(b,atk));
  let best=null;
  const must = !target && !(def.base&&def.base.hp>0) && def.shields.length===0;
  for (const b of bl){
    const gain = target ? (A.effAp(atk)>=target.hp ? SV(target) : 0.3) : faceVal(atk, def);
    const kill = (A.effAp(b)>=atk.hp && !(A.effFirstStrike(atk)&&A.effAp(atk)>=b.hp)) ? SV(atk) : 0;
    const loss = A.effAp(atk)>=b.hp ? SV(b) : 0;
    const v = gain + kill - loss - 0.5;
    if (must || v>0) if (!best || v>best.v) best={ b, v };
  }
  return best;
}
function smartBlock(atk, target){
  const bl=G.player.field.filter(b=>A.effBlocker(b)&&!b.rested&&b.hp>0&&b!==target&&A.blockerAllowed(b,atk));
  const bb=bestBlock(atk, target, G.player);
  return bb ? bl.indexOf(bb.b) : -1;
}
function answerBlockModal(){
  let g=0;
  while (el('blockModal').classList.contains('show') && g++<40){
    const b=el('blockBtns').children; if(!b.length) break;
    const msg=el('blockMsg').innerHTML||'';
    let pick;
    if (/Intercept with a/.test(msg) && G.curAttack){
      const atk=G.curAttack, target=(G.curBattle&&G.curBattle.atk===atk&&G.curBattle.def&&G.curBattle.def.type==='unit')?G.curBattle.def:null;
      const i=smartBlock(atk, target); pick = i>=0 ? b[i] : b[b.length-1];
    }
    else pick=/Support|choose 1 of your Units|Activate its 【Burst】/.test(msg) ? b[0] : b[Math.floor(Math.random()*b.length)];
    el('blockModal').classList.remove('show');
    try{ if(pick&&pick.onclick) pick.onclick(); }catch(e){recordErr('modal',e);}
    drainTasks();
  }
  driveBodyModal();
}
// Mirror of the AI's lethal check from the player's side.
function hasLethal(attackers){
  const foe=G.enemy;
  const f=attackers.filter(u=>!A.cantHitPlayer(u)&&A.effAp(u)>0).sort((a,b)=>A.effAp(b)-A.effAp(a));
  if (!f.length) return false;
  const blockers=foe.field.filter(b=>A.effBlocker(b)&&!b.rested&&b.hp>0).length;
  const hm=f.filter(A.effHighManeuver), normal=f.filter(u=>!A.effHighManeuver(u));
  const landing=[...hm, ...normal.slice(blockers)]; if (!landing.length) return false;
  let idx=0, baseHp=foe.base?foe.base.hp:0;
  if (baseHp>0){ let d=0; while(idx<landing.length&&d<baseHp){ d+=A.effAp(landing[idx]); idx++; } if (d<baseHp) return false; }
  let sh=foe.shields.length; while(idx<landing.length&&sh>0){ sh-=(A.effSuppression(landing[idx])?2:1); idx++; }
  return sh<=0 && idx<landing.length;
}
let attacksSeen=0;
function playerTurn(tag, base){
  const s=G.player, foe=G.enemy;
  const play=(card, after)=>{ setCtx(tag+'|play:'+card.name); check(tag, base);
    try { A.playFromHand(card.uid, true); if (after) after(); } catch(e){ recordErr('playFromHand',e); G.mode='idle'; G.pending=null; }
    autoResolve(tag, base); };
  // 1. Commands that kill, and draw when the hand is small.
  for (let k=0;k<4;k++){
    const c=s.hand.find(c=>c.type==='command'&&!A.affordIssue(s,c)&&c.action&&/【\s*Main/.test(A.plain(c.effect||''))&&(
      (c.action.kind==='damage'&&c.action.scope!=='all-enemy'&&c.action.scope!=='all-both'&&A.enemyTargets(foe,c.action).some(u=>u.hp<=(c.action.amount||0)))
      || (c.action.kind==='draw'&&(c.action.amount||0)>=2&&s.hand.length<=4)));
    if (!c) break;
    const t=c.action.kind==='damage' ? A.enemyTargets(foe,c.action).filter(u=>u.hp<=c.action.amount).sort((a,b)=>SV(b)-SV(a))[0] : null;
    const before=s.hand.length;
    play(c, ()=>{ if (G.mode==='command-target'&&t) A.fieldClick(t.uid); });
    if (s.hand.length===before) break;
  }
  // 2. Deploys: the affordable set of Units (+ a Base when it guards better) with the most stats, then Pilots (Links first).
  const room=()=>Math.max(0, A.FIELD_MAX - s.field.length);
  const cands=s.hand.filter(c=>(c.type==='unit' || (c.type==='base'&&(!s.base||c.hp>s.base.hp))) && !A.affordIssue(s,c));
  const val=c=>c.type==='base' ? c.hp*0.6 : c.baseAp+c.baseHp + (s.hand.some(p=>p.type==='pilot'&&A.linkMatches(c,p))?3:0);
  let bestSet=[], bestV=0;
  const n=Math.min(cands.length, 8);
  for (let m=1;m<(1<<n);m++){
    let cost=0, v=0, units=0, bases=0; const set=[];
    for (let i=0;i<n;i++) if (m&(1<<i)){ const c=cands[i]; cost+=A.effectiveCost(s,c); v+=val(c); if (c.type==='unit') units++; else bases++; set.push(c); }
    if (cost>s.resAvail || units>room() || bases>1) continue;
    if (v>bestV){ bestV=v; bestSet=set; }
  }
  for (const c of bestSet.sort((a,b)=>val(b)-val(a))){ if (G.over) return; if (G.mode!=='idle') autoResolve(tag, base); if (A.affordIssue(s,c)) continue; play(c); }
  for (let k=0;k<3;k++){
    if (G.over) return;
    const pilots=s.hand.filter(p=>p.type==='pilot'&&!A.affordIssue(s,p));
    const units=s.field.filter(u=>u.type==='unit'&&!u.pilot&&!u.noPilot);
    let best=null;
    for (const p of pilots) for (const u of units){ if (A.effectiveCost(s,p,u)>s.resAvail) continue;
      const sc=(p.pAp||0)+(p.pHp||0)*0.5+(A.linkMatches(u,p)?7+(u.sick?5:0):0)+A.effAp(u)*0.2;
      if (!best||sc>best.sc) best={p,u,sc}; }
    if (!best) break;
    const before=s.hand.length;
    play(best.p, ()=>{ if (G.mode==='pilot-target') A.fieldClick(best.u.uid); });
    if (s.hand.length===before) break;
  }
  // 3. Ready abilities.
  for (const u of [...s.field, s.base].filter(Boolean)){
    if (G.over) break;
    if (A.activateReady(u)){ setCtx(tag+'|act:'+u.name);
      try { A.startActivate(u); } catch(e){ recordErr('startActivate',e); G.mode='idle'; G.pending=null; }
      autoResolve(tag, base); }
  }
  // 4. Attacks: lethal goes all in; otherwise each attack must be worth more than staying home.
  let ag=0;
  while (ag++<10 && !G.over){
    if (G.mode!=='idle') autoResolve(tag, base);
    const ready=s.field.filter(u=>!u.sick&&!u.rested&&A.effAp(u)>0&&!A.trashBlocksAttack(u,s));
    if (!ready.length) break;
    const lethal=hasLethal(ready);
    let best=null;
    for (const atk of ready){
      const opts=[];
      const units=foe.field.filter(u=>u.hp>0&&!A.effUntargetable(u)&&(u.rested||A.canHitActive(atk,u)));
      for (const u of units){
        const kills=A.aiKillsInBattle(atk,u), dies=A.effAp(u)>=atk.hp && !(A.effFirstStrike(atk)&&kills);
        let v=(kills?SV(u)+1:0.3*A.effAp(atk)) - (dies?SV(atk):0) - (dies?0:exposure(atk, foe));
        const bb=bestBlock(atk, u, foe); if (bb){ const b=bb.b; const bk=A.effAp(b)>=atk.hp, bd=A.effAp(atk)>=b.hp; v=(bd?SV(b):0)-(bk?SV(atk):0)-(bk?0:exposure(atk,foe)); }
        opts.push({ t:u, v });
      }
      if (!A.cantHitPlayer(atk)){
        let v=lethal ? 1000 : faceVal(atk, foe) - exposure(atk, foe);
        const bb=lethal?null:bestBlock(atk, null, foe); if (bb){ const b=bb.b; const bk=A.effAp(b)>=atk.hp, bd=A.effAp(atk)>=b.hp; v=(bd?SV(b):0)-(bk?SV(atk):0)-(bk?0:exposure(atk,foe)); }
        opts.push({ t:null, v });
      }
      for (const o of opts) if (o.v>0 && (!best||o.v>best.v)) best={ atk, t:o.t, v:o.v };
    }
    if (!best) break;
    const atk=best.atk;
    setCtx(tag+'|atk:'+atk.name); check(tag, base);
    attacksSeen++;
    G.selected=atk.uid; G.mode='attack-target';
    try { if (best.t) A.fieldClick(best.t.uid); else A.attackDirect(); }
    catch(e){ recordErr('attack',e); atk.rested=true; G.mode='idle'; G.selected=null; }
    autoResolve(tag, base);
    if (!atk.rested && s.field.includes(atk)){ atk.rested=true; }   // never loop on an attack that didn't happen
  }
  if (G.mode!=='idle') autoResolve(tag, base);
  G.mode='idle'; G.selected=null;
  setCtx(tag+'|endTurn'); check(tag, base);
  try { A.endTurn(); } catch(e){ recordErr('endTurn',e); }
  autoResolve(tag, base);
}
function winnerOf(){ const logs=(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
  for(const l of logs){ if(/you win!/i.test(l)) return 'player'; if(/you are defeated/i.test(l)) return 'ai'; } return null; }

A.setAiLevel(process.env.AI||'hard');
const D=A.PRESET_DECKS; const R=+(process.env.ROUNDS||4);
let games=0, over=0, pw=0, aw=0;
for (let i=0;i<D.length;i++) for (let j=0;j<D.length;j++){
  if (i===j) continue;
  for (let r=0;r<R;r++){
    const tag=`${D[i].name}(P) vs ${D[j].name}(AI) #${r}`; setCtx(tag); Math.random();
    try {
      CHK.lastTurn=null;
      initGame(D[i], D[j], r%2?'player':'enemy');
      // TRACE=<AI deck substring>: print the full log of every game that AI deck loses (AIDBG=1 adds the hard planner's [plan] lines).
      const full=[]; if (process.env.TRACE){ const lg=el('log'); lg.innerHTML=''; const pre=lg.prepend.bind(lg); lg.prepend=(d)=>{ full.push((d.innerHTML||'').replace(/<[^>]+>/g,'')); pre(d); }; G.aiDebug=!!process.env.AIDBG; }
      const base={ p:new Set(census(G.player)), a:new Set(census(G.enemy)) };
      A.beginTurn(G.firstPlayer); autoResolve(tag, base);
      let turns=0, stall=0;
      while(!G.over && turns<28 && stall<140){
        stall++; autoResolve(tag, base); drainTasks(); answerBlockModal(); if(G.over) break;
        if(G.turn==='player'&&G.mode==='idle'){ playerTurn(tag, base); turns++; continue; }
        if(G.turn==='player'){ autoResolve(tag, base); continue; }
        if(G.turn==='enemy'){ drainTasks(); answerBlockModal(); check(tag+'|ai', base); turns++; }
      }
      if (G.over){ over++; const w=winnerOf(); if(w==='player')pw++; else if(w==='ai')aw++; if (process.env.PAIRS) console.log(`PAIR ${tag} -> ${w} turns=${turns} P=${G.player.shields.length} A=${G.enemy.shields.length}`);
        if (process.env.TRACE && w==='player' && D[j].name.includes(process.env.TRACE)) console.log(`\n#### ${tag}\n`+full.filter(l=>!/^Burst|draw /.test(l)).join('\n')); }
      check(tag+'|final', base);
    } catch(e){ recordErr('game',e); }
    games++;
  }
}
console.log(`\n== smart player vs ${A.getAiLevel()} AI over ${D.length} preset decks ==`);
console.log(`games: ${games} | reached game-over: ${over} | attacks: ${attacksSeen}`);
console.log('WIN RATE (smart player vs AI):  player', pw, '| AI', aw);
console.log('Interactive modes exercised:', JSON.stringify(MODES));
console.log('violations:', VIOL.length);
VIOL.slice(0,25).forEach(v=>console.log('  ! '+v));
console.log('Errors:', ERRORS.length);
const by={}; for(const e of ERRORS){ (by[e.msg||'?']=by[e.msg||'?']||[]).push(e); }
for(const k of Object.keys(by).slice(0,8)){ console.log(`\n### ${k} (${by[k].length})`);
  by[k].slice(0,3).forEach(e=>console.log('   ['+e.phase+'] '+e.ctx+'\n       '+(e.stack||''))); }
