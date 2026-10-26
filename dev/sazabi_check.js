// Sazabi: GD05-049 【Attack】 (you may destroy 1 of your Units → the opponent destroys 1 of their non-battling Units) and
// GD05-052 【Deploy】 (you may destroy 1 of your other Units → mill 3, add a milled (Neo Zeon) Unit). The sacrificed Unit's
// own 【Destroyed】 (Char's Zaku Ⅱ: look at the top 3) waits until Sazabi's effect has finished. Also the Axis self-kill flag.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
const overlays=()=>(global.document.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay'));
const txt=n=>String((n&&(n.textContent||n.innerHTML))||'').replace(/<[^>]+>/g,'');
const ovTitle=o=>txt(o.children[0]);
const walk=(n,f)=>{ if(f(n)) return n; for(const c of n.children||[]){ const r=walk(c,f); if(r) return r; } return null; };
const pickInOverlay=(o, re)=>{ const c=walk(o, n=>n!==o && typeof n.onclick==='function' && n.tagName!=='BUTTON' && (!re || re.test(txt(n)))); if(c){ c.onclick(); drainTasks(); } return !!c; };
const skipOverlay=o=>{ const b=walk(o, n=>n.tagName==='BUTTON'); if(b){ b.onclick(); drainTasks(); } return !!b; };
const modalOpen=()=>el('blockModal').classList.contains('show');
const btns=()=>[...el('blockBtns').children];
const clickBtn=re=>{ const b=btns().find(b=>re.test(txt(b))); if(b){ b.onclick(); drainTasks(); } return !!b; };
const logLines=()=>[...el('log').children].map(txt).reverse();   // oldest first
function clearUi(){ el('blockModal').classList.remove('show'); el('blockBtns').innerHTML=''; for(const o of overlays()) o.remove(); el('log').innerHTML=''; }
function fresh(turn){
  drainTasks(); clearUi();
  Object.assign(G,{turn:turn||'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=0; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=s.deck.splice(0,6);
  }
}
const card=(id, who)=>{ const c=A.makeCard(A.CARD_BY_ID.get(id), who); c.sick=false; return c; };
const put=(id, who)=>{ const u=card(id, who); (who==='player'?G.player:G.enemy).field.push(u); return u; };
const onTop=(side, ids)=>{ for(const id of ids) side.deck.push(card(id, side.who)); };   // last id = top card

// ── GD05-052 【Deploy】 (player): sacrifice Char's Zaku Ⅱ → Sazabi's mill + add first, then the Zaku's look-at-top-3.
for (const id of ['GD05-052','GD05-052-p1']){
  fresh(); put('ST03-006','player'); const sz=card(id,'player'); sz.sick=true; G.player.hand.push(sz);
  onTop(G.player, ['ST01-001','ST01-001','ST01-001','GD05-053','ST01-001','ST01-001']);   // Sazabi mills the top 3 (incl. Quess's Jagd Doga)
  A.playFromHand(sz.uid); drainTasks();
  ok(`${id}: deploying offers the sacrifice`, modalOpen() && btns().some(b=>/Zaku/.test(txt(b))), btns().map(txt).join(' / '));
  clickBtn(/Zaku/);
  let o=overlays();
  ok(`${id}: after the sacrifice only Sazabi's add-a-card choice is open`, o.length===1 && /^Sazabi: add 1/.test(ovTitle(o[0])), o.map(ovTitle).join(' | '));
  ok(`${id}: the sacrifice sets the Axis self-kill flag`, G.player.neoZeonSelfKill===true);
  const ll=logLines(); const iMill=ll.findIndex(l=>/Sazabi: places 3 cards in trash/.test(l));
  ok(`${id}: Sazabi milled 3 (incl. Quess's Jagd Doga)`, iMill>=0 && /Quess/.test(ll[iMill]), ll.slice(-4).join(' || '));
  if (o.length) pickInOverlay(o[0]);                         // the only (Neo Zeon) Unit milled
  ok(`${id}: the milled (Neo Zeon) Unit is added to hand`, G.player.hand.some(c=>c.name==="Quess's Jagd Doga"), G.player.hand.map(c=>c.name).join(','));
  o=overlays();
  ok(`${id}: then Char's Zaku Ⅱ's 【Destroyed】 looks at the top 3`, o.length===1 && /^Char's Zaku/.test(ovTitle(o[0])), o.map(ovTitle).join(' | '));
  if (o.length) skipOverlay(o[0]) || pickInOverlay(o[0]);
  ok(`${id}: nothing is left open`, !overlays().length && !modalOpen());
}
// Declining: no mill.
{ fresh(); put('ST03-006','player'); const sz=card('GD05-052','player'); G.player.hand.push(sz); const deck=G.player.deck.length;
  A.playFromHand(sz.uid); drainTasks(); clickBtn(/Don't destroy/);
  ok('GD05-052: declining keeps the Unit and mills nothing', G.player.field.length===2 && G.player.deck.length===deck && !overlays().length); }

// ── GD05-052 (AI): its Zaku's 【Destroyed】 resolves after the mill.
{ fresh('enemy'); put('ST03-006','enemy'); const sz=put('GD05-052','enemy');
  onTop(G.enemy, ['GD05-053','GD05-053','ST01-001','ST01-001','ST01-001','GD05-053']);
  A.selfSacMillAI(G.enemy, sz, { kind:'selfSacMill', amount:3, retrieveFilter:'(Neo Zeon)' }); drainTasks();
  const ll=logLines(); const iMill=ll.findIndex(l=>/places 3 cards in trash/.test(l)), iAdd=ll.findIndex(l=>/the AI adds/.test(l));
  ok('GD05-052 (AI): sacrifices, mills 3 and adds a Neo Zeon Unit', iMill>=0 && iAdd>iMill && G.enemy.neoZeonSelfKill===true, ll.join(' || '));
  ok('GD05-052 (AI): nothing opens on the player', !overlays().length && !modalOpen()); }

// ── GD05-049 【Attack】 (player): sacrifice another Unit / Sazabi itself / decline; the attack goes on.
function playerAttack(id, sacRe){
  fresh(); const sz=put(id,'player'); put('ST01-001','player'); put('ST01-001','enemy');
  G.selected=sz.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  const offered=modalOpen() && btns().some(b=>/No target/.test(txt(b)));
  clickBtn(sacRe);
  for (let k=0;k<6 && modalOpen();k++){ if(!clickBtn(/^(No|Don|Pass|Skip)/)) break; }   // block / action steps
  drainTasks(); return { sz, offered };
}
for (const id of ['GD05-049','GD05-049-p1','GD05-049-p2'].filter(x=>A.CARD_BY_ID.get(x))){
  const r=playerAttack(id, /Gundam/);
  ok(`${id}: attacking offers the sacrifice (with No target)`, r.offered);
  ok(`${id}: sacrificing another Unit → the AI loses its non-battling Unit`, G.player.field.length===1 && G.enemy.field.length===0, `p ${G.player.field.map(u=>u.name)} e ${G.enemy.field.map(u=>u.name)}`);
  ok(`${id}: the attack still deals its damage`, G.enemy.shields.length<6, 'shields '+G.enemy.shields.length);
}
{ playerAttack('GD05-049', /Sazabi/);
  ok('GD05-049: Sazabi may sacrifice itself', !G.player.field.some(u=>u.name==='Sazabi') && G.enemy.field.length===0 && G.player.neoZeonSelfKill===true); }
{ playerAttack('GD05-049', /No target/);
  ok('GD05-049: declining destroys nothing and the attack lands', G.player.field.length===2 && G.enemy.field.length===1 && G.enemy.shields.length<6); }
// Sacrificing Char's Zaku Ⅱ: its 【Destroyed】 opens once Sazabi's effect is done (the AI has already lost its Unit).
{ fresh(); const sz=put('GD05-049','player'); put('ST03-006','player'); put('ST01-001','enemy');
  G.selected=sz.uid; G.mode='attack-target'; A.attackDirect(); drainTasks(); clickBtn(/Zaku/);
  const o=overlays();
  ok('GD05-049: the sacrificed Zaku\'s 【Destroyed】 comes after the AI\'s destroy', G.enemy.field.length===0 && o.length===1 && /^Char's Zaku/.test(ovTitle(o[0])),
    `e ${G.enemy.field.length} ov ${o.map(ovTitle)}`); }

// The choice is live on the board too (the attack-target prompt doesn't linger): tap a Unit, tap Sazabi, or Cancel.
function boardAttack(){ fresh(); const sz=put('GD05-049','player'); const gm=put('ST01-001','player'); put('ST01-001','enemy');
  G.selected=sz.uid; G.mode='attack-target'; A.attackDirect(); drainTasks(); return { sz, gm, mode:G.mode }; }
const finishAttack=()=>{ for (let k=0;k<6 && modalOpen();k++){ if(!clickBtn(/^(No|Don|Pass|Skip)/)) break; } drainTasks(); };
{ const r=boardAttack();
  ok('GD05-049: while the sacrifice is open the board is in its own pick mode', r.mode==='gd05-sac-own', r.mode);
  // The dialog has no backdrop then, or it covers the field and a tap on Sazabi lands on "No target".
  ok('GD05-049: the choice leaves the board uncovered (board-pick dialog)', el('blockModal').classList.contains('board-pick'));
  A.fieldClick(r.gm.uid); drainTasks();
  ok('GD05-049: the board-pick look goes when the choice closes', !el('blockModal').classList.contains('board-pick'));
  ok('GD05-049: tapping your Unit on the board sacrifices it and closes the choice', !G.player.field.includes(r.gm) && G.enemy.field.length===0 && G.mode!=='gd05-sac-own');
  finishAttack();
  ok('GD05-049: …and the attack still lands', G.enemy.shields.length<6, 'shields '+G.enemy.shields.length); }
{ const r=boardAttack(); A.fieldClick(r.sz.uid); drainTasks();
  ok('GD05-049: tapping Sazabi on the board sacrifices Sazabi (not a back-out)', !G.player.field.includes(r.sz) && G.enemy.field.length===0 && G.player.neoZeonSelfKill===true, `p ${G.player.field.map(u=>u.name)} e ${G.enemy.field.length}`); }
{ const r=boardAttack(); const foe=G.enemy.field[0]; A.fieldClick(foe.uid); drainTasks();
  ok('GD05-049: tapping an enemy Unit doesn\'t start a new attack or close the choice', G.mode==='gd05-sac-own' && modalOpen() && G.enemy.field.includes(foe));
  A.cancelAction(); drainTasks();
  ok('GD05-049: Cancel declines the sacrifice', G.player.field.length===2 && G.enemy.field.length===1 && !(modalOpen() && btns().some(b=>/No target/.test(txt(b)))) && G.mode!=='gd05-sac-own');
  finishAttack();
  ok('GD05-049: …and the attack still lands after Cancel', G.enemy.shields.length<6, 'shields '+G.enemy.shields.length); }
// Gyunei's Jagd Doga 【Activate】: the same board pick, but it's not optional.
{ fresh(); const gy=put('GD05-057','player'); gy.rested=true; const z=put('ST01-001','player');
  A.gd05GyuneiActivate(gy, G.player); drainTasks();
  ok('GD05-057: the destroy choice opens (no decline button)', G.mode==='gd05-sac-own' && modalOpen() && btns().length===1, btns().map(txt).join(' / '));
  A.cancelAction(); A.fieldClick(gy.uid); drainTasks();
  ok('GD05-057: Cancel / tapping itself keeps the choice open', G.mode==='gd05-sac-own' && modalOpen() && G.player.field.length===2);
  A.fieldClick(z.uid); drainTasks();
  ok('GD05-057: tapping the other Unit destroys it and sets Gyunei active', G.player.field.length===1 && !gy.rested && G.mode==='idle' && !modalOpen()); }

// ── GD05-049 (AI): the player chooses which of their non-battling Units to destroy; the attack completes.
{ fresh('enemy'); const sz=put('GD05-049','enemy'); put('GD05-053','enemy'); put('ST01-001','player'); put('ST03-006','player');
  let done=false; A.resolveAiAttack(sz, ()=>{ done=true; }, null); drainTasks();
  ok('GD05-049 (AI): the player is asked to destroy one of their non-battling Units', modalOpen() && /Choose 1 of your non-battling Units/.test(txt(el('blockMsg'))) && btns().length===2);
  clickBtn(/Zaku/);
  ok('GD05-049 (AI): Quess\'s Jagd Doga went back to the AI\'s hand', G.enemy.hand.some(c=>c.name==="Quess's Jagd Doga") && G.enemy.neoZeonSelfKill===true);
  for (let k=0;k<8;k++){
    if (modalOpen()){ if(!clickBtn(/^(No|Don|Pass|Skip)/)) btns().slice(-1)[0].onclick(); drainTasks(); continue; }
    const o=overlays(); if (o.length){ pickInOverlay(o[o.length-1]) || skipOverlay(o[o.length-1]); continue; }
    break;
  }
  ok('GD05-049 (AI): the chosen Unit is destroyed and the attack finishes', done && G.player.field.length===1 && G.player.field[0].name==='Gundam', `done ${done} pf ${G.player.field.map(u=>u.name)}`); }

// ── Axis: deployable once a (Neo Zeon) Unit was destroyed by its own effect this turn.
{ fresh(); G.player.base=card('GD05-129','player'); G.player.hand.push(card('GD05-053','player'));
  ok('Axis: needs a self-kill first', !G.player.neoZeonSelfKill);
  G.player.neoZeonSelfKill=true;
  ok('Axis: with the flag and a Lv.≤3 (Neo Zeon) Unit in hand it can deploy', A.gd05AxisDeployable(G.player)); }

console.log('passed: '+pass+' | failed: '+fail.length); for(const f of fail) console.log('  ! '+f);
console.log('Errors: '+H.ERRORS.length);
