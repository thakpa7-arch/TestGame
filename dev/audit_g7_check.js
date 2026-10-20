// Audit group g7: Unit-token specs (multi-trait, <Breach N>, restrictions, "1 to N", per-sentence conditions, the destroy-
// then-tokens Command), damage-prevention grants (battle-only, AP/Lv/HP caps, "during this battle", "the next damage",
// EX-paid amounts, Lv.7 "instead"), restricted "may choose an active enemy Unit … as its attack target" grants, and dig
// filters ("/Pilot card", "/Command card", "Lv.N or lower", "that is Lv.3", a named-card alternative).
// Player choices go through the real UI (playFromHand, the action-step modal, the choosers); the AI side through
// runTrigger / applyCommand.
const H=require('./harness.js'); const {A}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=870000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'G7',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
// Pair a Pilot card without firing its triggers (only the paired state matters for the filter tests).
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; return p; };
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
// Play a Command from hand through the UI (a 【Pilot】 Command first asks how to play it: take the Command effect).
function playCmd(c, exOk){ A.playFromHand(c.uid, exOk); drainTasks(); if (modal() && /Play .* as/.test(modal().msg)) press(/Command effect/); }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// The look-at-top modal (showLookAtTop): its card tiles, pickable ones carry an onclick.
function lookModal(){ const ov=[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay')); if(!ov) return null;
  const box=ov.children[0]; const row=box && box.children[0]; return { ov, title:(box&&box._h||''), tiles:row?[...row.children]:[] }; }
const real=d=>!/-p\d+$/.test(d.id);
const findDef=p=>[...A.CARD_BY_ID.values()].find(d=>real(d)&&p(d));
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');
const tokens=s=>s.field.filter(u=>u.token);
// Run a battle with the attacker on `atkSide` hitting `def` (the AI-side tests: no action-step UI).
function fight(atk, def){ const as=atk.owner==='player'?G.player:G.enemy, ds=def.owner==='player'?G.player:G.enemy; atk.rested=false; A.battle(atk, def, as, ds); drainTasks(); }

// =========================================================================================== tokens
// ---- parseTokenSpecs: multi-trait specs keep both traits and their AP/HP (ZnO, Turn X, God of War Ghingnham) ----
{ const zno=A.parseTrigger(A.CARD_BY_ID.get('ST11-004').effect,'Deploy');
  ok('ZnO: [GOOhN] is (ZAFT) (Marine) 1/1 rested', zno.specs.length===1 && zno.specs[0].trait==='(ZAFT) (Marine)' && zno.specs[0].ap===1 && zno.specs[0].hp===1 && zno.specs[0].rested, JSON.stringify(zno.specs));
  fresh('enemy'); const z=put('ST11-004','enemy'); A.runTrigger(z, G.enemy, zno, 'Deploy'); drainTasks();
  const tk=tokens(G.enemy)[0]; ok('ZnO (AI): the GOOhN token carries both traits', tk && /\(ZAFT\)/.test(tk.trait) && /\(Marine\)/.test(tk.trait), tk&&tk.trait);
  fresh('player'); G.player.hand=[card('ST11-004','player')]; playCmd(G.player.hand[0]);
  const tk2=tokens(G.player)[0]; ok('ZnO (player, played from hand): GOOhN (ZAFT) (Marine) 1/1 rested', tk2 && tk2.trait==='(ZAFT) (Marine)' && tk2.baseAp===1 && tk2.rested, tk2&&JSON.stringify([tk2.trait,tk2.baseAp,tk2.rested]));
  // knock-on: Char's Z'Gok counts "2 or more other friendly (Marine) Units" — ZnO and its GOOhN token
  fresh('enemy'); const zg=put('ST11-001','enemy'); const ca=findDef(d=>d.type==='pilot'&&d.name==='Char Aznable'); A.attachPilot(zg, card(ca.id,'enemy')); drainTasks();
  const z3=put('ST11-004','enemy'); A.runTrigger(z3, G.enemy, zno, 'Deploy'); drainTasks();
  ok("ZnO + GOOhN make Char's Z'Gok (paired) untargetable (two other (Marine) Units)", A.effUntargetable(zg)); }
{ const sp=A.makeCard(A.CARD_BY_ID.get('GD06-109'),'player').action.specs;
  ok('God of War Ghingnham: Turn X (Arms) 2/3 and (Legs) 3/2, (Ghingnham Fleet) (Long-Range Weapon)', sp.length===2 && sp[0].ap===2 && sp[0].hp===3 && sp[1].ap===3 && sp[1].hp===2
     && sp.every(s=>s.trait==='(Ghingnham Fleet) (Long-Range Weapon)' && s.rested), JSON.stringify(sp.map(s=>[s.name,s.ap,s.hp,s.trait])));
  fresh('player'); G.player.hand=[card('GD06-109','player')]; playCmd(G.player.hand[0]);
  const m=modal(); ok('God of War Ghingnham (player): choose Arms (⚔2/❤3) or Legs (⚔3/❤2)', m && m.btns.length===2 && /Arms.*2\/❤3/.test(m.btns[0]) && /Legs.*3\/❤2/.test(m.btns[1]), m&&JSON.stringify(m.btns));
  press(/Legs/); const t=tokens(G.player)[0];
  ok('God of War Ghingnham (player): the chosen Legs token is 3/2, rested, both traits', t && t.name==='Turn X (Legs)' && t.baseAp===3 && t.baseHp===2 && t.rested && /Long-Range Weapon/.test(t.trait), t&&JSON.stringify([t.name,t.baseAp,t.baseHp,t.trait]));
  fresh('enemy'); const c=card('GD06-109','enemy'); A.applyCommand(c, G.enemy, null); drainTasks(); const at=tokens(G.enemy);
  ok('God of War Ghingnham (AI): one Turn X token with real stats', at.length===1 && at[0].baseAp+at[0].baseHp===5 && /Long-Range Weapon/.test(at[0].trait), JSON.stringify(at.map(x=>[x.name,x.baseAp,x.baseHp]))); }
{ // Turn X 【Attack】: "If you have no (Ghingnham Fleet) Unit tokens in play, deploy … Arms and … Legs" — the limit was dropped
  const act=A.parseTrigger(A.CARD_BY_ID.get('GD06-019').effect,'Attack');
  ok('Turn X 【Attack】: both tokens with real stats, gated on having no (Ghingnham Fleet) token', act && act.kind==='token' && act.tokenLimit==='ghingnham fleet' && act.specs.map(s=>s.ap+'/'+s.hp).join()==='2/3,3/2', JSON.stringify(act));
  fresh('enemy'); const tx=put('GD06-019','enemy'); A.runTrigger(tx, G.enemy, act, 'Attack'); drainTasks(); const n1=tokens(G.enemy).length;
  A.runTrigger(tx, G.enemy, act, 'Attack'); drainTasks();
  ok('Turn X (AI): deploys Arms + Legs once; a second 【Attack】 with them in play deploys nothing', n1===2 && tokens(G.enemy).length===2, `${n1} then ${tokens(G.enemy).length}`); }
// ---- makeToken: <Breach N> in the stats (Grace Under Pressure's Aerial Rebuild, Quiet Zero's Gundnode) ----
{ fresh('player'); G.player.hand=[card('GD06-105','player')]; playCmd(G.player.hand[0]);
  const m=modal(); ok('Grace Under Pressure: the choice shows Aerial Rebuild with Breach 3', m && m.btns.some(b=>/Aerial Rebuild.*Breach 3/.test(b)), m&&JSON.stringify(m.btns));
  press(/Aerial Rebuild/); const t=tokens(G.player)[0];
  ok('Grace Under Pressure (player): the Aerial Rebuild token has <Breach 3>', t && t.name==='Gundam Aerial Rebuild' && A.effBreach(t)===3, t&&('breach '+A.effBreach(t)));
  const qa=A.makeCard(A.CARD_BY_ID.get('GD05-126'),'enemy').activate.action, qz=qa.kind==='cond' ? qa.inner : qa;   // (its Aerial condition wraps the token deploy — g6)
  const gn=A.makeToken(qz.specs[0],'enemy'); ok('Quiet Zero: the Gundnode token has <Breach 1>', A.effBreach(gn)===1 && gn.baseAp===2, 'breach '+A.effBreach(gn)); }
// ---- makeToken: "can't be set as active or paired with a Pilot" (Zaku Ⅱ FZ's Ad Balloon) ----
{ const act=A.parseTrigger(A.CARD_BY_ID.get('GD03-020').effect,'When Paired');
  const ab=A.makeToken(act.inner.specs[0],'player');
  ok("Ad Balloon: can't be set as active AND can't be paired with a Pilot", ab.noActive && ab.noPilot, `noActive ${ab.noActive} noPilot ${ab.noPilot}`); }
// ---- Striker Pack 【Burst】: "If you have no (Earth Alliance) Unit tokens in play" ----
{ for (const who of ['enemy','player']){
    fresh(who==='enemy'?'player':'enemy'); const s=who==='player'?G.player:G.enemy;
    s.field.push(A.makeToken({name:'Sword Strike Gundam',trait:'(Earth Alliance)',ap:4,hp:2,blocker:true}, who));
    const c=card('ST04-012', who); A.triggerBurst(c, s, ()=>{}, true); drainTasks(); for (let g=0; g<3 && modal(); g++) press(/./);
    ok(`Striker Pack 【Burst】 (${who}): no Aile Strike while an (Earth Alliance) token is in play`, tokens(s).length===1, tokens(s).map(t=>t.name).join());
    fresh(who==='enemy'?'player':'enemy'); const s2=who==='player'?G.player:G.enemy;
    const c2=card('ST04-012', who); A.triggerBurst(c2, s2, ()=>{}, true); drainTasks(); for (let g=0; g<3 && modal(); g++) press(/./);
    ok(`Striker Pack 【Burst】 (${who}): deploys Aile Strike with no (Earth Alliance) token`, tokens(s2).length===1 && tokens(s2)[0].name==='Aile Strike Gundam', tokens(s2).map(t=>t.name).join()); } }
// ---- I'm a Newtype: "Deploy 1 to 2 [Bit / Funnel]" (was a draw-1 fallback) ----
{ const a=A.makeCard(A.CARD_BY_ID.get('ST13-013'),'player').action;
  ok("I'm a Newtype: parsed as a 1-to-2 Bit / Funnel token deploy", a.kind==='token' && a.specs[0].min===1 && a.specs[0].count===2 && a.specs[0].ap===2, JSON.stringify(a).slice(0,160));
  fresh('player'); G.player.hand=[card('ST13-013','player')]; const d0=G.player.deck.length; playCmd(G.player.hand[0]);
  const m=modal(); ok("I'm a Newtype (player): asked how many tokens (1 or 2)", m && /how many/.test(m.msg) && m.btns.length===2, m&&JSON.stringify(m));
  press(/^1/); ok("I'm a Newtype (player): chose 1 — one 2/2 token, no card drawn", tokens(G.player).length===1 && G.player.deck.length===d0, `${tokens(G.player).length} tokens, deck ${d0}->${G.player.deck.length}`);
  fresh('enemy'); const d1=G.enemy.deck.length; A.applyCommand(card('ST13-013','enemy'), G.enemy, null); drainTasks();
  ok("I'm a Newtype (AI): two Bit / Funnel tokens, no draw", tokens(G.enemy).length===2 && G.enemy.deck.length===d1 && tokens(G.enemy).every(t=>t.noAttack && t.noPilot), `${tokens(G.enemy).length} tokens, deck ${d1}->${G.enemy.deck.length}`); }
// ---- Orga's Order: each token behind its own enemy-Unit-count condition ----
{ const run=(who, n)=>{ fresh(who); const s=who==='player'?G.player:G.enemy, foe=who==='player'?G.enemy:G.player;
    for (let i=0;i<n;i++) stick(foe.who,1,1);
    if (who==='player'){ s.hand=[card('GD03-117','player')]; A.playFromHand(s.hand[0].uid); drainTasks(); }
    else { A.applyCommand(card('GD03-117','enemy'), s, null); drainTasks(); }
    return tokens(s).map(t=>t.name).join('|'); };
  for (const who of ['player','enemy']){
    ok(`Orga's Order (${who}): no enemy Unit → no token`, run(who,0)==='', run(who,0));
    ok(`Orga's Order (${who}): 2 enemy Units → Graze Custom only`, run(who,2)==='Graze Custom', run(who,2));
    ok(`Orga's Order (${who}): 5 enemy Units → Barbatos 4th Form only`, run(who,5)==='Gundam Barbatos 4th Form', run(who,5)); }
  fresh('enemy'); G.enemy.hand=[card('GD03-117','enemy')];
  ok("Orga's Order: the AI doesn't spend it while no enemy Unit is in play", A.aiMainStep()===false || G.enemy.hand.length===1, 'hand '+G.enemy.hand.length); }
// ---- Teaching New Techniques: destroy, then your Sazabi; the destroyed Unit's owner gets the Nu Gundam ----
{ fresh('player'); const e3=stick('enemy',3,3,{lv:3,name:'Enemy Lv3'}), e4=stick('enemy',2,2,{lv:4,name:'Enemy Lv4'}), e5=stick('enemy',5,5,{lv:5,name:'Enemy Lv5'});
  G.player.hand=[card('GD06-115','player')]; playCmd(G.player.hand[0]);
  const m=modal(); ok('Teaching New Techniques (player): choose among the Lv.4-or-lower enemy Units only', m && m.btns.length===2 && m.btns.some(b=>/Lv3/.test(b)) && m.btns.some(b=>/Lv4/.test(b)) && !m.btns.some(b=>/Lv5/.test(b)), m&&JSON.stringify(m.btns));
  press(/Enemy Lv4/);
  ok('Teaching New Techniques (player): the chosen Unit is destroyed', !G.enemy.field.includes(e4) && G.enemy.field.includes(e3));
  ok('Teaching New Techniques (player): you get a Sazabi 4/4, the destroyed Unit\'s owner a Nu Gundam 3/3 <First Strike>',
     tokens(G.player).map(t=>t.name).join()==='Sazabi' && tokens(G.enemy).length===1 && tokens(G.enemy)[0].name==='Nu Gundam' && tokens(G.enemy)[0].firstStrike, `you ${tokens(G.player).map(t=>t.name)} | foe ${tokens(G.enemy).map(t=>t.name)}`);
  fresh('enemy'); const p3=stick('player',3,3,{lv:3,name:'Player Lv3'}); A.applyCommand(card('GD06-115','enemy'), G.enemy, null); drainTasks();
  ok('Teaching New Techniques (AI): destroys your Lv.3 Unit; AI Sazabi, your Nu Gundam', !G.player.field.includes(p3) && tokens(G.enemy).map(t=>t.name).join()==='Sazabi' && tokens(G.player).map(t=>t.name).join()==='Nu Gundam');
  // Its "Then" token doesn't make it playable without a Lv.4-or-lower enemy Unit to choose (10-1-8-1-2, Q408/Q413).
  fresh('player'); stick('enemy',5,5,{lv:5}); G.player.hand=[card('GD06-115','player')]; const tnt=G.player.hand[0]; playCmd(tnt);
  ok("Teaching New Techniques: with no Lv.4-or-lower enemy it can't be played (stays in hand, no tokens)", G.player.hand.includes(tnt) && G.player.resAvail===10 && tokens(G.player).length===0 && tokens(G.enemy).length===0, `hand ${G.player.hand.length} res ${G.player.resAvail} ${tokens(G.player).map(t=>t.name)} / ${tokens(G.enemy).length}`); }

// =========================================================================================== damage guards
// AI attacks the player's `target`; the player answers in the action step with `cmdRe`, then (optionally) picks `pickRe`.
function aiAttackWith(atk, target, cmdRe, pickRe){ A.resolveAiAttack(atk, ()=>{}, target); drainTasks(); const offered=press(cmdRe); let asked=modal(); if (pickRe) press(pickRe); passAll(); return { offered, asked }; }
// ---- Valedictorian: only a Unit token; battle damage only; this battle only ----
{ fresh('enemy'); const tA=A.makeToken({name:'Tok A',trait:'(Test)',ap:1,hp:5},'player'), tB=A.makeToken({name:'Tok B',trait:'(Test)',ap:1,hp:5},'player');
  tA.sick=tB.sick=false; tA.rested=true; G.player.field.push(tA, tB); const nt=stick('player',1,5,{name:'NonToken'});
  const atk=stick('enemy',4,9); G.player.hand=[card('GD02-105','player')];
  const r=aiAttackWith(atk, tA, /Valedictorian/, /Tok A/);
  ok('Valedictorian (player): you choose among your Unit tokens only', r.offered && r.asked && r.asked.btns.length===2 && r.asked.btns.every(b=>/Tok/.test(b)), r.asked&&JSON.stringify(r.asked.btns));
  ok('Valedictorian: the chosen token takes no battle damage', tA.hp===5, 'hp '+tA.hp);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:2}, tA, 'T'); drainTasks();
  ok('Valedictorian: effect damage still lands', tA.hp===3, 'hp '+tA.hp);
  const atk2=stick('enemy',2,9); tA.rested=true; A.resolveAiAttack(atk2, ()=>{}, tA); drainTasks(); passAll();
  ok('Valedictorian: a later battle the same turn is not protected', tA.hp===1, 'hp '+tA.hp); }
{ fresh('enemy'); const nt=stick('player',1,5,{name:'NonToken',rested:true}); const atk=stick('enemy',3,9); G.player.hand=[card('GD02-105','player')];
  aiAttackWith(atk, nt, /Valedictorian/, null);
  ok('Valedictorian: with no Unit token it protects nothing', nt.hp===2, 'hp '+nt.hp); }
// ---- Distant Reunion: an (X-Rounder)-paired Unit; 2 or less AP; Lv.7 → 5 or less AP instead ----
{ const xr=findDef(d=>d.type==='pilot'&&hasT(d,'x-rounder')).id, other=findDef(d=>d.type==='pilot'&&!hasT(d,'x-rounder')&&hasT(d,'newtype')).id;
  const run=(lv, ap, pid, extra)=>{ fresh('enemy'); G.player.resMax=lv; const u=stick('player',1,9,{rested:true, name:'Paired'}); seat(u, pid);
    if (extra) { const v=stick('player',1,9,{rested:true, name:'Other'}); seat(v, xr); }
    const atk=stick('enemy',ap,9); G.player.hand=[card('GD03-115','player')]; const r=aiAttackWith(atk, u, /Distant Reunion/, /Paired/); return { taken:9-u.hp, r }; };
  ok('Distant Reunion (Lv.3): a 2-AP attacker deals nothing', run(3,2,xr).taken===0);
  ok('Distant Reunion (Lv.3): a 4-AP attacker deals its damage (2 or less AP only)', run(3,4,xr).taken===4);
  ok('Distant Reunion (Lv.7): a 5-AP attacker deals nothing ("instead" 5 or less AP)', run(7,5,xr).taken===0);
  ok('Distant Reunion (Lv.7): a 6-AP attacker deals its damage', run(7,6,xr).taken===6);
  ok('Distant Reunion: a Unit paired with a non-(X-Rounder) Pilot is not a legal choice', run(3,2,other).taken===2);
  const two=run(3,2,xr,true); ok('Distant Reunion (player): two eligible Units → you choose', two.r.asked && two.r.asked.btns.length===2, two.r.asked&&JSON.stringify(two.r.asked.btns)); }
// ---- The Blue Giant: 2 or less AP, battle damage, this battle ----
{ fresh('enemy'); const u=stick('player',1,9,{rested:true}); const atk=stick('enemy',5,9); G.player.hand=[card('ST03-014','player')];
  aiAttackWith(atk, u, /Blue Giant/, null); ok('The Blue Giant: a 5-AP attacker still deals 5', u.hp===4, 'hp '+u.hp);
  fresh('enemy'); const v=stick('player',1,9,{rested:true}); const atk2=stick('enemy',2,9); G.player.hand=[card('ST03-014','player')];
  aiAttackWith(atk2, v, /Blue Giant/, null); ok('The Blue Giant: a 2-AP attacker deals nothing', v.hp===9, 'hp '+v.hp);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, v, 'T'); drainTasks();
  ok('The Blue Giant: effect damage afterwards lands', v.hp===6, 'hp '+v.hp); }
// ---- Damage Control: "During this battle, reduce battle damage it receives by 3" ----
{ fresh('enemy'); const u=stick('player',1,9,{rested:true}); const atk=stick('enemy',4,9); G.player.hand=[card('GD04-113','player')];
  aiAttackWith(atk, u, /Damage Control/, null); ok('Damage Control: 4 battle damage → 1', u.hp===8, 'hp '+u.hp);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, u, 'T'); drainTasks();
  ok('Damage Control: enemy effect damage is not reduced', u.hp===5, 'hp '+u.hp);
  u.rested=true; A.resolveAiAttack(stick('enemy',4,9), ()=>{}, u); drainTasks(); passAll();
  ok('Damage Control: a second battle this turn is not reduced', u.hp===1, 'hp '+u.hp); }
// ---- Witches from Earth: the NEXT damage only; EX-paid → 4 ----
{ fresh('player'); const u=stick('player',1,12,{trait:'(Academy)'}); G.player.hand=[card('GD04-108','player')]; playCmd(G.player.hand[0]);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:5}, u, 'T'); drainTasks(); const a=12-u.hp;
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, u, 'T'); drainTasks(); const b=12-u.hp-a;
  ok('Witches from Earth: the next damage is reduced by 2, the one after is not', a===3 && b===3, `${a} then ${b}`);
  fresh('player'); const v=stick('player',1,12,{trait:'(Academy)'}); const w=card('GD04-108','player'); G.player.hand=[w];
  G.player.ex=1; G.player.resAvail=A.effectiveCost(G.player,w); playCmd(w, true);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:5}, v, 'T'); drainTasks();
  ok('Witches from Earth: paid with an EX Resource → the next damage is reduced by 4', 12-v.hp===1, 'took '+(12-v.hp));
  fresh('player'); const x=stick('player',1,12,{trait:'(Academy)'}), y=stick('player',1,12,{trait:'(Academy)',name:'Second Academy'}); stick('player',1,12,{trait:'(Zeon)',name:'Zeon one'});
  G.player.hand=[card('GD04-108','player')]; playCmd(G.player.hand[0]); const m=modal();
  ok('Witches from Earth (player): you choose among your (Academy) Units only', m && m.btns.length===2 && !m.btns.some(b=>/Zeon one/.test(b)), m&&JSON.stringify(m.btns)); press(/Second Academy/);
  ok('Witches from Earth (player): the chosen Unit gets it', (y.dmgGuards||[]).length===1 && !(x.dmgGuards||[]).length); }
// ---- Fierce Unity: 1 to 2 (Clan) Units; enemy Units that are Lv.2 or lower; this turn ----
{ fresh('enemy'); const c1=stick('player',1,9,{trait:'(Clan)',name:'Clan One',rested:true}), c2=stick('player',1,9,{trait:'(Clan)',name:'Clan Two',rested:true}); stick('player',1,9,{name:'Not Clan'});
  const atk=stick('enemy',4,9,{lv:2}); G.player.hand=[card('ST06-013','player')];
  A.resolveAiAttack(atk, ()=>{}, c1); drainTasks(); press(/Fierce Unity/); const m1=modal(); press(/Clan One/); const m2=modal(); press(/Clan Two/); passAll();
  ok('Fierce Unity (player): up to 2 (Clan) Units chosen one by one', m1 && m1.btns.length===2 && m2 && m2.btns.some(b=>/Done/.test(b)) && (c2.dmgGuards||[]).length===1, JSON.stringify([m1&&m1.btns, m2&&m2.btns]));
  ok('Fierce Unity: a Lv.2 attacker deals no battle damage', c1.hp===9, 'hp '+c1.hp);
  c2.rested=true; A.resolveAiAttack(stick('enemy',4,9,{lv:3}), ()=>{}, c2); drainTasks(); passAll();
  ok('Fierce Unity: a Lv.3 attacker is not stopped', c2.hp===5, 'hp '+c2.hp); }
// ---- Modification (EB01-079): Lv.3-or-lower attackers, whole turn (AI side) ----
{ fresh('player'); const g=stick('enemy',1,9,{trait:'(G Generation)'}); stick('enemy',1,9,{trait:'(Zeon)'});
  A.applyCommand(card('EB01-079','enemy'), G.enemy, null); drainTasks();
  ok('Modification (AI): only its (G Generation) Unit is protected', (g.dmgGuards||[]).length===1);
  fight(stick('player',3,9,{lv:3}), g); const a=g.hp; fight(stick('player',3,9,{lv:3}), g); const b=g.hp; fight(stick('player',3,9,{lv:4}), g);
  ok('Modification: two Lv.3 attackers this turn deal nothing, a Lv.4 one does', a===9 && b===9 && g.hp===6, `${a}/${b}/${g.hp}`); }
// ---- Gundam Ashtaron 【Deploy】: another (New UNE) Unit; enemy Units with 2 or less HP ----
{ fresh('player'); const ally=stick('enemy',1,9,{trait:'(New UNE)'}); const ash=put('GD02-040','enemy'); A.runTrigger(ash, G.enemy, A.parseTrigger(ash.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Gundam Ashtaron (AI): the other (New UNE) Unit is protected, not Ashtaron itself', (ally.dmgGuards||[]).length===1 && !(ash.dmgGuards||[]).length);
  fight(stick('player',4,2), ally); const a=ally.hp; fight(stick('player',4,3), ally);
  ok('Gundam Ashtaron: a 2-HP attacker deals nothing, a 3-HP one deals its damage', a===9 && ally.hp===5, `${a}/${ally.hp}`); }
// ---- Rey Za Burrel 【When Linked】: a (ZAFT) Link Unit; the next damage −2 ----
{ fresh('player'); const lk=stick('enemy',1,9,{trait:'(ZAFT)',linked:true,name:'Linked ZAFT'}), nl=stick('enemy',5,9,{trait:'(ZAFT)',name:'Unlinked ZAFT'});
  const rey=card('GD04-093','enemy'); A.runTrigger(rey, G.enemy, A.parseTrigger(rey.effect,'When Linked'), 'Link'); drainTasks();
  ok('Rey Za Burrel (AI): only a (ZAFT) Link Unit can be chosen', (lk.dmgGuards||[]).length===1 && !(nl.dmgGuards||[]).length);
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:3}, lk, 'T'); drainTasks(); const a=9-lk.hp;
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:3}, lk, 'T'); drainTasks();
  ok('Rey Za Burrel: 3 then 3 damage → 1 then 3 (used up)', a===1 && 9-lk.hp===4, `${a} / ${9-lk.hp}`); }
// ---- Lunamaria Hawke 【When Linked】: battle damage to the chosen (Minerva Squad) Unit goes to this Unit instead ----
{ const lunaUnit=findDef(d=>d.type==='unit'&&(d.link||'').includes('Lunamaria Hawke')&&hasT(d,'minerva squad'));
  fresh('player'); const host=put(lunaUnit.id,'player'); const mate=stick('player',1,6,{trait:'(Minerva Squad)',name:'Squadmate',rested:true}); const hp0=host.hp;
  A.attachPilot(host, card('GD04-095','player')); drainTasks(); const m=modal(); press(/Squadmate/);
  ok('Lunamaria Hawke (player): you choose which (Minerva Squad) Unit (no immunity is granted)', m && m.btns.some(b=>/Squadmate/.test(b)) && !(mate.dmgGuards||[]).length, m&&JSON.stringify(m.btns));
  const hpLinked=host.hp; G.turn='enemy'; mate.rested=true; A.resolveAiAttack(stick('enemy',3,9), ()=>{}, mate); drainTasks(); passAll();
  ok("Lunamaria Hawke: the Squadmate's battle damage is dealt to Lunamaria's Unit instead", mate.hp===6 && host.hp===hpLinked-3, `mate ${mate.hp} host ${hpLinked}->${host.hp}`);
  fresh('player'); const h2=put(lunaUnit.id,'enemy'); const m2=stick('enemy',1,6,{trait:'(Minerva Squad)',name:'AI Squadmate'});
  A.attachPilot(h2, card('GD04-095','enemy')); drainTasks();
  ok('Lunamaria Hawke (AI): redirects another (Minerva Squad) Unit to its own', m2.redirectTurn && m2.redirectTurn.to===h2 && !h2.redirectTurn); }
// ---- Quess Paraya 【Destroyed】 / Gwaden / Ra Cailum / Loni Garvey / Alphaciders / Schwarzette: battle-only vs any enemy damage, duration ----
{ fresh('player'); const nz=stick('enemy',1,9,{trait:'(Neo Zeon)'}); const host=stick('enemy',1,1,{trait:'(Neo Zeon)'}); seat(host,'GD05-094');
  A.applyToTarget(stick('player',9,9), G.player, {kind:'damage', amount:9}, host, 'T'); drainTasks();
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:3}, nz, 'T'); drainTasks(); const eff=9-nz.hp;
  fight(stick('player',3,9), nz);
  ok('Quess Paraya 【Destroyed】 (AI): enemy battle damage −2, effect damage untouched', eff===3 && 9-nz.hp===eff+1, `effect ${eff}, after battle ${9-nz.hp}`); }
{ fresh('player'); const gw=put('GD06-128','enemy'); G.enemy.field.splice(G.enemy.field.indexOf(gw),1); G.enemy.base=gw; const z=stick('enemy',1,9,{trait:'(Zeon)'}); stick('enemy',9,9,{trait:'(Neo Zeon)'});
  A.applyActivateEffect(gw, null, G.enemy); drainTasks();
  ok('Gwaden (AI): a (Zeon) Unit — not a (Neo Zeon) one — is chosen', (z.dmgGuards||[]).length===1);
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:2}, z, 'T'); drainTasks(); const e=9-z.hp; fight(stick('player',3,9), z);
  ok('Gwaden: battle damage −1, effect damage untouched', e===2 && 9-z.hp===4, `${e} / ${9-z.hp}`); }
{ fresh('player'); const rc=put('GD05-125','enemy'); G.enemy.field.splice(G.enemy.field.indexOf(rc),1); G.enemy.base=rc; const lb=stick('enemy',1,9,{trait:'(Londo Bell)'});
  A.applyActivateEffect(rc, null, G.enemy); drainTasks();
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:2}, lb, 'T'); drainTasks(); const e=9-lb.hp; fight(stick('player',3,9), lb);
  ok('Ra Cailum: enemy effect AND battle damage −1, every hit this turn', e===1 && 9-lb.hp===3, `${e} / ${9-lb.hp}`); }
{ fresh('player'); const mr=stick('enemy',1,9,{trait:'(Marine)'}); const loni=card('ST11-012','enemy'); A.runTrigger(loni, G.enemy, A.parseTrigger(loni.effect,'When Paired'), 'Pair'); drainTasks();
  A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:2}, mr, 'T'); drainTasks(); const e=9-mr.hp; fight(stick('player',3,9), mr); const b1=9-mr.hp-e; fight(stick('player',3,9), mr);
  ok('Loni Garvey: battle damage from an enemy Unit −2 (each battle this turn), effect damage untouched', e===2 && b1===1 && 9-mr.hp===e+2, `${e} / ${b1} / ${9-mr.hp}`); }
{ fresh('player'); const atk=stick('player',4,9); const al=stick('enemy',1,9,{trait:'(Alphacide)',rested:true}); G.curBattle={atk, def:al};
  A.applyCommand(card('GD06-114','enemy'), G.enemy, null); drainTasks(); fight(atk, al); const a=9-al.hp; fight(stick('player',4,9), al);
  ok('Alphaciders (first mode): enemy battle damage −3 during that battle only', a===1 && 9-al.hp===5, `${a} / ${9-al.hp}`); }
{ fresh('player'); const sw=put('GD05-022','enemy'); const atk=stick('player',4,9); G.curBattle={atk, def:sw}; for (let i=0;i<2;i++) G.enemy.trash.push(card('GD04-113','enemy'));
  A.applyActivateEffect(sw, null, G.enemy); drainTasks(); const g=(sw.dmgGuards||[])[0];
  ok('Gundam Schwarzette 【Activate･Action】: itself, any enemy damage −2, during this battle', g && g.amount===2 && !g.battle && g.dur==='battle', JSON.stringify(g)); }
{ fresh('player'); const u=stick('enemy',1,9); A.runTrigger(card('GD02-105','enemy'), G.enemy, A.makeCard(A.CARD_BY_ID.get('GD02-105'),'enemy').action, 'T');
  ok('"During this battle" outside a battle grants nothing', !(u.dmgGuards||[]).length); }

// =========================================================================================== active-attack grants
const can=(u, t)=>A.canHitActive(u, t);
// ---- Banagher Links 【When Paired】: a Lv.5+ friendly Unit; active enemy Units with 5 or less AP ----
{ fresh('player'); const lo=stick('enemy',1,1,{lv:1}); const bl=card('ST14-012','enemy');
  A.runTrigger(bl, G.enemy, A.parseTrigger(bl.effect,'When Paired'), 'Pair'); drainTasks();
  ok('Banagher Links (AI): with no Lv.5+ Unit nobody gets it', !can(lo, stick('player',3,3)) && !bl.activeAttackGrants);
  fresh('player'); const hi=stick('enemy',4,4,{lv:5}), lo2=stick('enemy',4,4,{lv:4}); A.runTrigger(bl, G.enemy, A.parseTrigger(bl.effect,'When Paired'), 'Pair'); drainTasks();
  ok('Banagher Links (AI): the Lv.5 Unit may attack an active 5-AP Unit, not a 7-AP one; the Lv.4 Unit gets nothing', can(hi, stick('player',5,5)) && !can(hi, stick('player',7,7)) && !can(lo2, stick('player',3,3)));
  fresh('player'); const a=stick('player',4,4,{lv:5,name:'High A'}), b=stick('player',4,4,{lv:6,name:'High B'}); stick('player',4,4,{lv:2,name:'Low C'});
  A.attachPilot(a, card('ST14-012','player')); drainTasks(); const m=modal(); press(/High B/);
  ok('Banagher Links (player): you choose among your Lv.5+ Units', m && m.btns.length===2 && !m.btns.some(x=>/Low C/.test(x)), m&&JSON.stringify(m.btns));
  ok('Banagher Links (player): the chosen Unit gets the limited grant', can(b, stick('enemy',5,5)) && !can(b, stick('enemy',6,6)) && !can(a, stick('enemy',1,1))); }
// ---- Indiscriminate Violence: (Academy); 5 or less AP; EX-paid → choose 1 to 2 ----
{ fresh('player'); const x=stick('player',3,3,{trait:'(Academy)',name:'Acad X'}), y=stick('player',3,3,{trait:'(Academy)',name:'Acad Y'});
  const c=card('GD04-106','player'); G.player.hand=[c]; G.player.ex=1; G.player.resAvail=A.effectiveCost(G.player,c); playCmd(c, true);
  const m1=modal(); press(/Acad X/); const m2=modal(); press(/Acad Y/);
  ok('Indiscriminate Violence (player, EX-paid): choose up to 2 (Academy) Units', m1 && /up to 2/.test(m1.msg) && m2 && can(x, stick('enemy',5,5)) && can(y, stick('enemy',5,5)), JSON.stringify([m1&&m1.msg,m2&&m2.btns]));
  ok('Indiscriminate Violence: not an active 6-AP Unit', !can(x, stick('enemy',6,6)));
  fresh('player'); const z1=stick('player',3,3,{trait:'(Academy)',name:'Acad 1'}), z2=stick('player',3,3,{trait:'(Academy)',name:'Acad 2'});
  G.player.hand=[card('GD04-106','player')]; playCmd(G.player.hand[0]); const m3=modal(); press(/Acad 1/);
  ok('Indiscriminate Violence (player, no EX): exactly one Unit', m3 && !/up to/.test(m3.msg) && !modal() && can(z1, stick('enemy',5,5)) && !can(z2, stick('enemy',5,5))); }
// ---- Bridge Crew: an active enemy Unit that has no Pilot paired with it ----
{ fresh('player'); const u=stick('player',3,3); G.player.hand=[card('GD03-105','player')]; playCmd(G.player.hand[0]);
  const paired=stick('enemy',1,1); seat(paired,'ST01-010');
  ok('Bridge Crew: may attack an active unpaired enemy Unit, not a paired one', can(u, stick('enemy',1,1)) && !can(u, paired)); }
// ---- Gundam Kyrios (Tail Booster): a (Super Soldier)-paired Unit; Lv.4 or lower; not a permanent ability of Kyrios ----
{ fresh('player'); const ss=findDef(d=>d.type==='pilot'&&hasT(d,'super soldier')).id;
  const k=put('GD04-023','player'); const pu=stick('player',3,3,{name:'SS paired'}); seat(pu, ss); const un=stick('player',3,3,{name:'Unpaired'});
  A.resolvePlayerTrigger(k, G.player, A.parseTrigger(k.effect,'Deploy'), 'Deploy', ()=>{}); drainTasks();
  ok('Kyrios (Tail Booster): Kyrios itself has no permanent active-attack ability', !k.innateActiveAttack && !can(k, stick('enemy',1,1,{lv:2})));
  ok('Kyrios (Tail Booster): only the (Super Soldier)-paired Unit gets it, vs Lv.4 or lower', can(pu, stick('enemy',1,1,{lv:4})) && !can(pu, stick('enemy',1,1,{lv:5})) && !can(un, stick('enemy',1,1,{lv:2}))); }
// ---- other Units whose triggered grant leaked into a permanent ability ----
{ for (const id of ['ST06-007','GD01-043','GD03-021','GD04-030','GD05-028','GD06-027','GD03-035']){ const c=card(id,'player'); ok(`${id} ${c.name}: no permanent active-attack ability`, !c.innateActiveAttack); }
  for (const id of ['ST02-001','GD01-042','EB01-031','GD04-051']) ok(`${id}: its printed active-attack ability stays`, card(id,'player').innateActiveAttack); }
// ---- Ortega's Rick Dom 【Deploy】: another (Clan) Unit, 3 or less AP (AI) ----
{ fresh('enemy'); const o=put('GD06-027','enemy'); fresh('enemy'); const rd=put('ST06-007','enemy'); const cl=stick('enemy',3,3,{trait:'(Clan)'});
  A.runTrigger(rd, G.enemy, A.parseTrigger(rd.effect,'Deploy'), 'Deploy'); drainTasks();
  ok("Ortega's Rick Dom (AI): the other (Clan) Unit may attack an active 3-AP Unit, not a 4-AP one; not itself", can(cl, stick('player',3,3)) && !can(cl, stick('player',4,4)) && !can(rd, stick('player',1,1))); }
// ---- That One Looks A Lot Stronger?: the Lv cap is on the ENEMY Unit (a Lv.5 friendly may be chosen) ----
{ fresh('player'); const big=stick('player',5,5,{trait:'(Clan)',lv:6}); G.player.hand=[card('GD02-108','player')]; playCmd(G.player.hand[0]);
  ok('That One Looks A Lot Stronger?: a Lv.6 (Clan) Unit may attack an active Lv.4 Unit, not a Lv.5 one', can(big, stick('enemy',1,1,{lv:4})) && !can(big, stick('enemy',1,1,{lv:5}))); }
// ---- Rasid's Orders: a Unit that is Lv.4 or higher; 6 or less AP ----
{ fresh('player'); const l3=stick('player',3,3,{lv:3,name:'Lv3'}), l4=stick('player',3,3,{lv:4,name:'Lv4'}); G.player.hand=[card('GD01-110','player')]; playCmd(G.player.hand[0]);
  ok("Rasid's Orders: only the Lv.4 Unit (no choice with one legal Unit), vs 6 or less AP", !modal() && can(l4, stick('enemy',6,6)) && !can(l4, stick('enemy',7,7)) && !can(l3, stick('enemy',1,1))); }
// ---- Sturm Faust: "Choose 1 (G Generation) Unit" ----
{ fresh('player'); const gg=stick('player',3,3,{trait:'(G Generation)'}), ot=stick('player',5,5); G.player.hand=[card('EB01-080','player')]; playCmd(G.player.hand[0]);
  ok('Sturm Faust: the (G Generation) Unit gets it, the other Unit does not', can(gg, stick('enemy',9,9)) && !can(ot, stick('enemy',1,1))); }
// ---- Kämpfer 【When Paired･(Cyclops Team) Pilot】: all your (Cyclops Team) Units, 5 or less AP ----
{ fresh('player'); const k=put('GD03-017','player'); const ct=stick('player',3,3,{trait:'(Zeon) (Cyclops Team)'}), ot=stick('player',3,3,{trait:'(Zeon)'});
  A.attachPilot(k, card('GD03-090','player')); drainTasks();
  ok('Kämpfer: every (Cyclops Team) Unit (Kämpfer included) may attack an active 5-AP Unit — not other Units, not 6 AP',
     can(k, stick('enemy',5,5)) && can(ct, stick('enemy',5,5)) && !can(ct, stick('enemy',6,6)) && !can(ot, stick('enemy',1,1))); }
// ---- GFreD 【When Linked】 / Athrun Zala 【When Linked】: "this Unit" is the Unit, only after the link ----
{ fresh('player'); const g=put('GD03-035','player'); ok('GFreD: before linking it may not attack active Units', !can(g, stick('enemy',1,1)));
  A.attachPilot(g, card('GD03-092','player')); drainTasks(); require('./burst_yes.js').resolveFirst(H)(null);   // the trigger-order chooser (10-1-6-5)
  ok('GFreD: linked, it may attack an active Unit with AP ≤ its own only', g.linked && can(g, stick('enemy',1,1)) && !can(g, stick('enemy',99,1)));
  const aeg=findDef(d=>d.type==='unit'&&(d.link||'')==='Athrun Zala'); fresh('player'); const a=put(aeg.id,'player'); const az=card('ST04-011','player'); A.attachPilot(a, az); drainTasks();
  ok('Athrun Zala 【When Linked】: the linked Unit may attack an active Lv.5 Unit, not Lv.6 (the Pilot card itself gets nothing)', can(a, stick('enemy',1,1,{lv:5})) && !can(a, stick('enemy',1,1,{lv:6})) && !az.activeAttackGrants); }
// ---- Gundam Throne Zwei (damaged), Reiji (<Blocker>), Sodon (a Unit token, 5 or less AP) ----
{ fresh('enemy'); const z=put('GD04-045','enemy'); const cb=stick('enemy',3,3,{trait:'(CB)'}); A.runTrigger(z, G.enemy, A.parseTrigger(z.effect,'When Linked'), 'Link'); drainTasks();
  const dmg=stick('player',1,5,{hp:2}), full=stick('player',1,5);
  const who=[z,cb].find(u=>u.activeAttackGrants); ok('Gundam Throne Zwei: a damaged active enemy Unit only', who && can(who, dmg) && !can(who, full));
  fresh('enemy'); const gg=stick('enemy',3,3,{trait:'(G Generation)'}); A.runTrigger(card('EB01-066','enemy'), G.enemy, A.parseTrigger(A.CARD_BY_ID.get('EB01-066').effect,'When Paired'), 'Pair'); drainTasks();
  ok('Reiji: an active enemy Unit with <Blocker> only', can(gg, stick('player',1,1,{blocker:true})) && !can(gg, stick('player',1,1)));
  fresh('enemy'); const tk=A.makeToken({name:'Tok',trait:'(Test)',ap:2,hp:2},'enemy'); G.enemy.field.push(tk); const nt=stick('enemy',5,5);
  const so=card('GD02-123','enemy'); A.runTrigger(so, G.enemy, A.parseTrigger(so.effect,'Deploy'), 'Deploy'); drainTasks();
  ok('Sodon 【Deploy】: the Unit token (not the other Unit) may attack an active 5-AP Unit, not a 6-AP one', can(tk, stick('player',5,5)) && !can(tk, stick('player',6,6)) && !can(nt, stick('player',1,1))); }

// =========================================================================================== dig filters
function digAI(srcId, kw, topIds){ fresh('enemy'); const s=G.enemy; for (const id of topIds) s.deck.push(card(id,'enemy'));
  const src=card(srcId,'enemy'); const act = src.type==='command' ? src.action : A.parseTrigger(src.effect, kw); A.runTrigger(src, s, act, 'T'); drainTasks(); return s.hand.map(c=>c.name); }
function digPlayer(srcId, kw, topIds){ fresh('player'); const s=G.player; for (const id of topIds) s.deck.push(card(id,'player'));
  const src=card(srcId,'player'); const act = src.type==='command' ? src.action : A.parseTrigger(src.effect, kw); A.resolvePlayerTrigger(src, s, act, 'T', ()=>{}); drainTasks();
  const lm=lookModal(); return lm ? lm.tiles.map(t=>!!t.onclick) : null; }
const filler=findDef(d=>d.type==='command'&&!/clan|cb|g generation|academy|operation meteor|g team|earth federation|zeon/i.test(d.trait||'')&&!/AGE Device/.test(d.name));
{ const clanP=findDef(d=>d.type==='pilot'&&hasT(d,'clan')), cbP=findDef(d=>d.type==='pilot'&&hasT(d,'cb'));
  ok('Schoolgirl and Smuggler (AI): a (Clan) Pilot card is taken', digAI('ST06-012','Main',[filler.id,filler.id,clanP.id]).includes(clanP.name));
  ok('Schoolgirl and Smuggler (player): the (Clan) Pilot tile is pickable', JSON.stringify(digPlayer('ST06-012','Main',[filler.id,filler.id,clanP.id]))==='[false,false,true]');
  ok('Tactical Visionary (AI): a (CB) Pilot card is taken', digAI('ST07-014','Main',[filler.id,filler.id,cbP.id]).includes(cbP.name));
  const omP=findDef(d=>d.type==='pilot'&&hasT(d,'operation meteor'));
  ok('The Path to Victory or Defeat (AI): an (Operation Meteor) Pilot card is taken', digAI('GD01-109','Main',[filler.id,filler.id,filler.id,filler.id,omP.id]).includes(omP.name)); }
{ const gg3=findDef(d=>d.type==='unit'&&hasT(d,'g generation')&&d.lv===3), gg5=findDef(d=>d.type==='unit'&&hasT(d,'g generation')&&d.lv===5), gg2=findDef(d=>d.type==='unit'&&hasT(d,'g generation')&&d.lv===2);
  ok('Big-Rang (AI): a Lv.5 (G Generation) Unit is not taken', digAI('EB01-030','Deploy',[filler.id,filler.id,gg5.id]).length===0);
  ok('Big-Rang (AI): a Lv.3 one is', digAI('EB01-030','Deploy',[filler.id,gg2.id,gg3.id]).join()===gg3.name);
  ok('Gundam Lfrith Ur (player): only the Lv.3 (G Generation) tile is pickable', JSON.stringify(digPlayer('EB01-034','When Linked',[gg2.id,gg5.id,gg3.id]))==='[false,false,true]'); }
{ const zu=findDef(d=>d.type==='unit'&&hasT(d,'zeon')), nzu=findDef(d=>d.type==='unit'&&hasT(d,'neo zeon')), efu=findDef(d=>d.type==='unit'&&hasT(d,'earth federation')&&!hasT(d,'zeon'));
  ok('Zaku I Sniper Type (AI): a (Zeon) Unit on top is added', digAI('GD01-048','Deploy',[zu.id]).join()===zu.name);
  ok('Zaku I Sniper Type (AI): a (Neo Zeon) Unit on top is added', digAI('GD01-048','Deploy',[nzu.id]).join()===nzu.name);
  ok('Zaku I Sniper Type (AI): an (Earth Federation) Unit on top is not', digAI('GD01-048','Deploy',[efu.id]).length===0);
  ok('Zaku I Sniper Type (AI): a (Zeon) Pilot on top is not (Unit card only)', digAI('GD01-048','Deploy',['ST03-011']).length===0); }
{ const age=findDef(d=>/AGE Device/.test(d.name));
  ok('Flit Asuno (AI): a card with "AGE Device" in its name is taken', digAI('GD02-088','When Linked',[filler.id,filler.id,age.id]).join()===age.name); }
{ const cb7=findDef(d=>d.type==='unit'&&hasT(d,'cb')&&d.lv>=6), cb4=findDef(d=>d.type==='unit'&&hasT(d,'cb')&&d.lv<=5);
  ok('GN Armor Type-D (AI): a Lv.6+ (CB) Unit is not taken', digAI('GD04-019','Destroyed',[filler.id,filler.id,cb7.id]).length===0);
  ok('GN Armor Type-D (AI): a Lv.5-or-lower (CB) Unit is', digAI('GD04-019','Destroyed',[filler.id,filler.id,cb4.id]).join()===cb4.name); }
{ const ac=findDef(d=>d.type==='command'&&hasT(d,'academy'));
  ok('Gundam Aerial Rebuild (AI): an (Academy) Command card is taken', digAI('GD04-024','Deploy',[filler.id,filler.id,ac.id]).join()===ac.name);
  ok('Gundam Aerial Rebuild (player): the (Academy) Command tile is pickable', JSON.stringify(digPlayer('GD04-024','Deploy',[filler.id,filler.id,ac.id]))==='[false,false,true]'); }
{ const nzg=findDef(d=>d.type==='pilot'&&hasT(d,'neo zeon')&&/green/i.test(d.color)), zg=findDef(d=>d.type==='pilot'&&hasT(d,'zeon')&&!hasT(d,'neo zeon')&&/green/i.test(d.color));
  ok('Elmeth (AI): a green (Neo Zeon) Pilot is not a (Zeon) Pilot', digAI('GD02-020','Deploy',[filler.id,filler.id,filler.id,filler.id,nzg.id]).length===0);
  ok('Elmeth (AI): a green (Zeon) Pilot is taken', digAI('GD02-020','Deploy',[filler.id,filler.id,filler.id,filler.id,zg.id]).join()===zg.name); }
{ const pil=findDef(d=>d.type==='pilot'&&d.lv<=3), pHi=findDef(d=>d.type==='pilot'&&d.lv>=6);
  fresh('enemy'); const host=stick('enemy',3,3,{lv:4}); for (const id of [filler.id,filler.id,filler.id,pHi.id,pil.id]) G.enemy.deck.push(card(id,'enemy'));
  const hk=card('ST13-011','enemy'); host.pilotCard=hk; A.runTrigger(hk, G.enemy, A.parseTrigger(hk.effect,'When Paired'), 'Pair'); drainTasks();
  ok('Haman Karn: a Pilot card with Lv ≤ this Unit is still taken (the "whose Lv." phrase is not a Unit filter)', G.enemy.hand.map(c=>c.name).join()===pil.name, G.enemy.hand.map(c=>c.name).join()); }

// ---- every card text still parses (no new dead clauses) ----
{ let errs=0; for (const d of A.GUNDAM_CARDS){ try { A.makeCard(d,'player'); } catch(e){ errs++; } } ok('every card still builds', errs===0, errs+' errors'); }

console.log(`passed: ${pass} | failed: ${fail.length}`);
fail.forEach(f=>console.log('  FAIL', f));
console.log(`Errors: ${H.ERRORS.length}`);
H.ERRORS.slice(0,5).forEach(e=>console.log('  ERR', e.ctx, e.phase, e.msg, e.stack));
