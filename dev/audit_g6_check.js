// Audit group g6: static abilities, watchers, 【Activate】 parsing, deploy-turn attack permissions and attack-target lures.
// Each case uses the real card, on the player's side through the UI path when the player chooses, and on the AI's side.
const H=require('./harness.js'); const {A,drainTasks,ERRORS}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=870000;
function fresh(turn){
  G.over=true; drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';   // (an AI turn queued by a previous case must not run)
  doc.body.children.length=0; G.modalQueue=[];
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'Audit',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-001'), s.who)); }
}
const side=who=>who==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
function pressNoDrain(re){ const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept|block/i.test(m.msg) && press(/Don't|No/)) continue; if (!press(/Pass|Done|Skip|Don't|No/)) break; } };
const logs=()=>(el('log').children||[]).map(c=>(c.innerHTML||'').replace(/<[^>]+>/g,''));
const pilotOf=(pred)=>[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && !/-p\d+$/.test(d.id) && pred(d));
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');

// ---- tests are appended below ----

// ---- Gundam X GD02-053: "[Suppression]" (printed in square brackets) is the <Suppression> keyword ----
{ fresh('enemy'); const gx=put('GD02-053','enemy'); A.resolveAiAttack(gx, ()=>{}, null); drainTasks(); passAll();
  ok('Gundam X [Suppression]: its direct attack breaks 2 of your shields (AI)', G.player.shields.length===4, 'shields '+G.player.shields.length);
  fresh('player'); const px=put('GD02-053','player'); A.fieldClick(px.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll();
  ok('Gundam X [Suppression]: your direct attack breaks 2 enemy shields', G.enemy.shields.length===4, 'shields '+G.enemy.shields.length); }

// ---- Hyaku-Shiki GD02-072: "While a friendly white Base is in play, this Unit gains <Repair 1>." (after a reminder ending ".)") ----
{ fresh('player'); const h=put('GD02-072','player'); const noBase=A.effRepair(h); G.player.base=card('ST01-016','player'); const withBase=A.effRepair(h);
  h.hp=1; A.finishEndPhase(); drainTasks(); passAll();
  ok('Hyaku-Shiki: <Repair 1> only while a friendly white Base is in play, and it heals at the end of your turn', noBase===0 && withBase===1 && h.hp===2, `${noBase}/${withBase} hp ${h.hp}`);
  fresh('enemy'); const e=put('GD02-072','enemy'); G.enemy.base=card('ST01-016','enemy'); ok('Hyaku-Shiki (AI): <Repair 1> with its white Base', A.effRepair(e)===1); }

// ---- Gundam Kyrios (Trans-Am) GD04-037: red (Super Soldier) Pilot -> <First Strike>; green (Super Soldier) Pilot -> <Breach 3> ----
{ fresh('player'); const k=put('GD04-037','player'); pair(k,'GD04-090');   // Hallelujah Haptism: red (Super Soldier)
  const fsRed=A.effFirstStrike(k), brRed=A.effBreach(k);
  fresh('enemy'); const k2=put('GD04-037','enemy'); pair(k2,'ST07-012');   // Allelujah Haptism: green (Super Soldier)
  const fsGreen=A.effFirstStrike(k2), brGreen=A.effBreach(k2);
  fresh('enemy'); const k3=put('GD04-037','enemy'); const other=stick('enemy',1,1); pair(other,'ST07-012'); const brElsewhere=A.effBreach(k3);
  ok('Kyrios (Trans-Am): a red (Super Soldier) Pilot gives <First Strike> (not <Breach>)', fsRed && brRed===0, `${fsRed}/${brRed}`);
  ok('Kyrios (Trans-Am): a green (Super Soldier) Pilot gives <Breach 3> (not <First Strike>)', !fsGreen && brGreen===3, `${fsGreen}/${brGreen}`);
  ok('Kyrios (Trans-Am): a green (Super Soldier) Pilot on another Unit also counts ("in play")', brElsewhere===3, 'breach '+brElsewhere); }

// ---- Alvatore GD04-080: 【Destroyed】If you have another (UN)/(Superpower Bloc) Unit in play, deploy 1 rested [Alvaaron] token ----
{ const run=(who, trait)=>{ fresh(who==='player'?'enemy':'player'); const a=put('GD04-080', who); if (trait) stick(who,1,5,{trait}); const before=side(who).field.length;
    const foe=who==='player'?'enemy':'player'; A.applyToTarget(stick(foe,1,1), side(foe), {kind:'damage', amount:99}, a, 'T'); drainTasks(); passAll();
    return side(who).field.some(x=>x.token && /Alvaaron/.test(x.name)); };
  ok('Alvatore: with another (UN) Unit the [Alvaaron] token is deployed (AI)', run('enemy','(UN)'));
  ok('Alvatore: with another (Superpower Bloc) Unit the [Alvaaron] token is deployed (player)', run('player','(Superpower Bloc)'));
  ok('Alvatore: another Unit that is neither (UN) nor (Superpower Bloc) does not count', !run('enemy','(Test)') && !run('player','(Test)')); }

// ---- AP that scales: Barbatos Lupus Rex (damage received), GQuuuuuuX (cards in hand), Bernard Wiseman (unique (Cyclops Team) cards) ----
{ fresh('player'); const lr=put('GD05-051','player'); const ap0=A.effAp(lr); A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, lr, 'T');
  ok('Lupus Rex: AP rises by the damage it has received (4 -> 7 after 3 damage)', ap0===4 && A.effAp(lr)===7, `${ap0} -> ${A.effAp(lr)}`);
  fresh('enemy'); const lr2=put('GD05-051','enemy'); lr2.hp=3; const foe=stick('player',1,9,{rested:true}); A.resolveAiAttack(lr2, ()=>{}, foe); drainTasks(); passAll();
  ok('Lupus Rex (AI): attacks with AP 4+3 = 7', foe.hp===2, 'foe hp '+foe.hp); }
{ fresh('player'); const gq=put('GD06-003','player'); G.player.hand=[card('ST01-001','player'),card('ST01-002','player'),card('ST01-003','player'),card('ST01-004','player')];
  const foe=stick('enemy',1,9,{rested:true}); A.fieldClick(gq.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll();
  ok('GQuuuuuuX (Omega Psycommu Released): AP 2 + 4 cards in hand = 6 in battle', foe.hp===3, 'foe hp '+foe.hp);
  fresh('enemy'); const g2=put('GD06-003','enemy'); G.enemy.hand=[]; const a0=A.effAp(g2); G.enemy.hand=[card('ST01-001','enemy')]; ok('GQuuuuuuX (AI): AP follows its hand size', a0===2 && A.effAp(g2)===3); }
{ const cyc=[...A.CARD_BY_ID.values()].filter(d=>!/-p\d+$/.test(d.id) && hasT(d,'cyclops team') && (d.type==='pilot'||d.type==='command'));
  const names=[...new Set(cyc.map(d=>d.name))].slice(0,3); const ids=names.map(n=>cyc.find(d=>d.name===n).id);
  fresh('player'); const u=stick('player',3,3); pair(u,'GD03-089'); const base=A.effAp(u);
  for (const id of ids) G.player.trash.push(card(id,'player')); G.player.trash.push(card(ids[0],'player')); G.player.trash.push(card('ST01-001','player'));
  ok('Bernard Wiseman: AP + the number of unique-named (Cyclops Team) Pilot/Command cards in your trash', A.effAp(u)===base+ids.length, `${base} -> ${A.effAp(u)} (${ids.length} names)`);
  fresh('enemy'); const e=stick('enemy',3,3); pair(e,'GD03-089'); for (const id of ids) G.enemy.trash.push(card(id,'enemy')); ok('Bernard Wiseman (AI): same bonus on its paired Unit', A.effAp(e)===e.baseAp+0+ids.length+0, 'ap '+A.effAp(e)); }

// ---- Duo Maxwell GD01-090: 【During Link】This Unit's AP can't be reduced by enemy effects ----
{ fresh('player'); const ds=put('GD01-025','enemy'); pair(ds,'GD01-090'); const ap=A.effAp(ds);
  A.applyToTarget(stick('player',1,1), G.player, {kind:'debuff', amount:3, dur:'turn'}, ds, 'T');
  A.applyToTarget(stick('player',1,1), G.player, {kind:'debuff', amount:2, dur:'battle'}, ds, 'T');
  ok('Duo Maxwell: a linked Unit ignores your AP-N effects (AI side)', ds.linked && A.effAp(ds)===ap, `${ap} -> ${A.effAp(ds)}`);
  fresh('enemy'); const mine=put('GD01-025','player'); pair(mine,'GD01-090'); const ap2=A.effAp(mine);
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'debuff', amount:3, dur:'turn'}, mine, 'T');
  ok("Duo Maxwell: your linked Unit ignores the AI's AP-N", A.effAp(mine)===ap2, `${ap2} -> ${A.effAp(mine)}`);
  fresh('player'); const nl=stick('enemy',4,4); pair(nl,'GD01-090'); const ap3=A.effAp(nl);
  A.applyToTarget(stick('player',1,1), G.player, {kind:'debuff', amount:3, dur:'turn'}, nl, 'T');
  ok('Duo Maxwell: not linked -> the AP reduction applies', A.effAp(nl)===ap3-3, `${ap3} -> ${A.effAp(nl)}`); }

const overlay=()=>(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null;
// Click the tile named `re` in an open card chooser (showLookAtTop / pickExileCards); returns false if absent.
function pickTile(re){ const o=overlay(); if(!o) return false; const box=o.children[0]; const row=box && box.children[0]; const t=row && row.children.find(x=>re.test(x.textContent||'') || re.test(x._name||''));
  if (!t || !t.onclick) return false; t.onclick(); drainTasks(); return true; }
// Tiles show the card art (no text) when a card has an image: give the test the names back.
const tileNames=()=>{ const o=overlay(); if(!o) return []; return o.children[0].children[0].children.map(x=>x.textContent); };
const noImg=cs=>{ for (const c of cs) c.img=null; return cs; };

// ---- Freedom Gundam GD01-065: 【During Pair】【Once per Turn】When you pair a Pilot with this Unit or one of your white Units,
//      choose 1 enemy Unit. It gets AP-2 during this turn. ----
{ fresh('player'); const fr=put('GD01-065','player'); const e1=stick('enemy',5,5), e2=stick('enemy',4,4);
  G.player.hand=[card('ST04-010','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(fr.uid); drainTasks();
  const chose = G.mode==='trigger-target' && G.pending && G.pending.cands.length===2;
  A.fieldClick(e1.uid); drainTasks();
  ok('Freedom Gundam: pairing a Pilot with it lets you choose an enemy Unit to get AP-2 (player)', chose && A.effAp(e1)===3 && A.effAp(e2)===4, `${chose} ${A.effAp(e1)}/${A.effAp(e2)}`);
  const w=stick('player',2,2,{color:'White'}); G.player.hand=[card(pilotOf(d=>d.lv<=3 && !/【When|【During/.test(d.effect||'')).id,'player')];
  A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(w.uid); drainTasks();
  ok('Freedom Gundam: only once per turn', G.mode!=='trigger-target' && A.effAp(e2)===4, G.mode); }
{ fresh('enemy'); const fr=put('GD01-065','enemy'); const p1=stick('player',5,5); pair(fr,'ST04-010');
  const w=stick('enemy',2,2,{color:'White'}); const blue=stick('enemy',2,2,{color:'Blue'});
  ok('Freedom Gundam (AI): pairing Kira with it gives your Unit AP-2', A.effAp(p1)===3, 'ap '+A.effAp(p1));
  fresh('enemy'); const fr2=put('GD01-065','enemy'); pair(fr2,'ST04-010'); G.turnSeq++; const p2=stick('player',5,5); const blue2=stick('enemy',2,2,{color:'Blue'}); pair(blue2,'GD01-091');
  const blueNo=A.effAp(p2); const w2=stick('enemy',2,2,{color:'White'}); pair(w2,'GD01-096');
  ok('Freedom Gundam (AI): a non-white Unit does not trigger it, a white one does', blueNo===5 && A.effAp(p2)===3, `${blueNo}/${A.effAp(p2)}`);
  fresh('enemy'); const nf=put('GD01-065','enemy'); const p3=stick('player',5,5); const w3=stick('enemy',2,2,{color:'White'}); pair(w3,'GD01-091');
  ok('Freedom Gundam (AI): unpaired (【During Pair】 off) it does nothing', A.effAp(p3)===5); }

// ---- Ribo Colony GD03-124: 【Once per Turn】When you pair a Pilot that is Lv.3 or lower with one of your Units, choose 1 enemy Unit
//      with 3 or less HP. Rest it. ----
{ fresh('player'); G.player.base=card('GD03-124','player'); const u=stick('player',2,2); const small=stick('enemy',2,3), big=stick('enemy',4,5);
  G.player.hand=[card('ST03-011','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); A.fieldClick(u.uid); drainTasks();
  const cands=G.mode==='trigger-target' ? G.pending.cands.slice() : [];
  A.fieldClick(small.uid); drainTasks();
  ok('Ribo Colony: a Lv.3 Pilot paired -> you rest an enemy Unit with 3 or less HP (player)', cands.length===1 && cands[0]===small.uid && small.rested && !big.rested, `${cands.length} ${small.rested}/${big.rested}`); }
{ fresh('enemy'); G.enemy.base=card('GD03-124','enemy'); const u=stick('enemy',2,2), u2=stick('enemy',2,2); const small=stick('player',2,3);
  pair(u,'GD01-091'); const afterLv4=small.rested; pair(u2,'ST03-011');
  ok('Ribo Colony (AI): a Lv.4 Pilot does nothing, a Lv.3 Pilot rests your 3-HP Unit', !afterLv4 && small.rested, `${afterLv4}/${small.rested}`); }

// ---- Psycho Gundam Mk-Ⅱ GD04-004 (same watcher wording): "When you pair a (Cyber-Newtype) Pilot with one of your blue Units, draw 1." ----
{ const cn=pilotOf(d=>hasT(d,'cyber-newtype') && !/【When|【During/.test(d.effect||''));
  fresh('enemy'); put('GD04-004','enemy'); const b=stick('enemy',2,2,{color:'Blue'}); const h0=G.enemy.hand.length; if (cn) pair(b, cn.id);
  ok('Psycho Gundam Mk-Ⅱ: pairing a (Cyber-Newtype) Pilot with a blue Unit draws 1', cn && G.enemy.hand.length===h0+1, `${cn&&cn.id} ${h0}->${G.enemy.hand.length}`); }

// ---- The-O GD03-002: 【During Pair】When one of your other Units with <Repair> attacks, choose 1 enemy Unit whose Lv. is equal to or
//      lower than that Unit. Rest it. ----
{ fresh('player'); const o=put('GD03-002','player'); pair(o,'GD01-091'); const ds=put('GD01-033','player');   // Deathscythe Lv.4 <Repair 1>
  const lo=stick('enemy',2,2,{lv:3}), hi=stick('enemy',2,2,{lv:5});
  A.fieldClick(ds.uid); drainTasks(); A.attackDirect(); drainTasks();
  const cands=G.mode==='trigger-target' ? G.pending.cands.slice() : [];
  if (cands.length) { A.fieldClick(lo.uid); drainTasks(); } passAll();
  ok('The-O: your <Repair> Unit attacks -> you rest an enemy Unit of its Lv. or lower', cands.length===1 && lo.rested && !hi.rested, `${cands} ${lo.rested}/${hi.rested}`);
  fresh('player'); const o2=put('GD03-002','player'); const ds2=put('GD01-033','player'); const lo2=stick('enemy',2,2,{lv:3});
  A.fieldClick(ds2.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll();
  ok('The-O: unpaired, nothing happens', !lo2.rested && G.mode!=='trigger-target'); }
{ fresh('enemy'); const o=put('GD03-002','enemy'); pair(o,'GD01-091'); const atk=put('GD01-033','enemy'); const mine=stick('player',2,2,{lv:4}), big=stick('player',2,2,{lv:6});
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); passAll();
  ok('The-O (AI): its <Repair> attacker makes it rest your Lv.4 Unit (not the Lv.6 one)', mine.rested && !big.rested, `${mine.rested}/${big.rested}`);
  fresh('enemy'); const o3=put('GD03-002','enemy'); pair(o3,'GD01-091'); const plain=stick('enemy',3,3); const m3=stick('player',2,2,{lv:2});
  A.resolveAiAttack(plain, ()=>{}, null); drainTasks(); passAll();
  ok('The-O (AI): an attacker without <Repair> does not trigger it', !m3.rested); }

// ---- GuAIZ (Commander Type) GD03-038: <Support 1> is the keyword (not a free AP+2 ability); "During your turn, when this Unit is
//      rested by an effect, choose 1 of your (ZAFT) Units. It gets AP+2 during this turn." ----
{ fresh('player'); const g=put('GD03-038','player'); const z1=put('ST04-008','player'), other=stick('player',3,3);
  ok('GuAIZ: no misparsed 【Activate】 ability (its <Support 1> is the keyword)', !g.activate && A.effSupport(g)===1 && !A.activateReady(g));
  A.effectRest(g, G.player); drainTasks();
  const m=modal(); const offered = m && m.btns.length===2 && m.btns.some(b=>/Ginn/.test(b)) && !m.btns.some(b=>/Dummy/.test(b));
  press(/Ginn/);
  ok('GuAIZ: rested by an effect on your turn -> you choose a (ZAFT) Unit for AP+2', offered && A.effAp(z1)===z1.baseAp+2 && A.effAp(g)===g.baseAp, `${offered} ${A.effAp(z1)}`);
  fresh('enemy'); const g2=put('GD03-038','player'); const z2=put('ST04-008','player'); A.effectRest(g2, G.player); drainTasks();
  ok("GuAIZ: on your opponent's turn nothing happens", !modal() && A.effAp(z2)===z2.baseAp && A.effAp(g2)===g2.baseAp); }
{ fresh('enemy'); const g=put('GD03-038','enemy'); const z=put('ST04-008','enemy'); z.sick=false; A.effectRest(g, G.enemy); drainTasks();
  ok('GuAIZ (AI): rested by an effect on its turn -> one of its (ZAFT) Units gets AP+2', A.effAp(z)+A.effAp(g)===z.baseAp+g.baseAp+2, `${A.effAp(z)}/${A.effAp(g)}`); }

// ---- Gundam Sandrock Custom GD03-025: Enemy Units choose one of your rested (Maganac Corps) Units as their attack target if possible ----
{ fresh('player'); put('GD03-025','enemy'); const mg=put('ST02-005','enemy',{rested:true}); const other=stick('enemy',1,9,{rested:true}); const a=put('ST01-001','player');
  A.fieldClick(a.uid); drainTasks(); A.attackDirect(); drainTasks();
  const faceRefused = G.enemy.shields.length===6 && G.mode==='attack-target';
  A.fieldClick(other.uid); drainTasks(); const otherRefused = other.hp===9;
  A.fieldClick(mg.uid); drainTasks(); passAll();
  ok('Sandrock Custom: your attack must target the rested (Maganac Corps) Unit', faceRefused && otherRefused && mg.hp<2, `${faceRefused} ${otherRefused} mg ${mg.hp}`); }
{ fresh('enemy'); put('GD03-025','player'); const mg=put('ST02-005','player',{rested:true}); const atk=stick('enemy',3,3);
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks(); passAll();
  ok('Sandrock Custom (AI): the AI attacks your rested (Maganac Corps) Unit instead of your shields', G.player.shields.length===6 && mg.hp<=0, `shields ${G.player.shields.length} mg ${mg.hp}`); }

// ---- Turn X GD06-019: Enemy Units choose one of your rested Unit tokens as their attack target if possible; 【Attack】If you have no
//      (Ghingnham Fleet) Unit tokens in play, deploy the two rested tokens ----
{ fresh('player'); put('GD06-019','enemy'); const tk=stick('enemy',1,3,{token:true,rested:true,trait:'(Test)'}); const a=put('ST01-001','player');
  A.fieldClick(a.uid); drainTasks(); A.attackDirect(); drainTasks(); const refused=G.enemy.shields.length===6;
  A.fieldClick(tk.uid); drainTasks(); passAll();
  ok('Turn X: your attack must target its rested Unit token', refused && tk.hp<=1, `${refused} tok ${tk.hp}`); }
{ fresh('enemy'); const tx=put('GD06-019','enemy'); const n0=G.enemy.field.length; A.resolveAiAttack(tx, ()=>{}, null); drainTasks(); passAll();
  const made=G.enemy.field.filter(x=>x.token).length;
  fresh('enemy'); const tx2=put('GD06-019','enemy'); stick('enemy',1,1,{token:true,trait:'(Ghingnham Fleet)'}); A.resolveAiAttack(tx2, ()=>{}, null); drainTasks(); passAll();
  const made2=G.enemy.field.filter(x=>x.token).length;
  ok('Turn X 【Attack】: deploys its 2 tokens only when no (Ghingnham Fleet) token is in play', made===2 && made2===1, `${made}/${made2}`); }

// ---- "On the turn this Unit is deployed, it may choose a rested enemy Unit as its attack target and attack it." ----
for (const id of ['GD06-058','GD05-030','GD05-048','GD05-078']){
  fresh('player'); const rest=stick('enemy',1,9,{rested:true}); const act=stick('enemy',1,9);
  G.player.hand=[card(id,'player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll(); drainTasks();
  const u=G.player.field.find(x=>x.def===id);
  A.fieldClick(u.uid); drainTasks(); const inMode=G.mode==='attack-target';
  A.attackDirect(); drainTasks(); const noFace=G.enemy.shields.length===6;
  A.fieldClick(act.uid); drainTasks(); const noActive=act.hp===9;
  A.fieldClick(rest.uid); drainTasks(); passAll();
  ok(`${u.name}: attacks a rested enemy Unit on its deploy turn (not the player or an active Unit)`, u.sick && inMode && noFace && noActive && rest.hp<9, `${u.sick} ${inMode} ${noFace} ${noActive} rest ${rest.hp}`); }
{ fresh('player'); G.player.hand=[card('GD06-058','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll();
  const u=G.player.field.find(x=>x.def==='GD06-058'); A.fieldClick(u.uid); drainTasks();
  ok('Blast Impulse: with no rested enemy Unit it still has summoning sickness', G.mode!=='attack-target');
  fresh('enemy'); const r=stick('player',1,2,{rested:true}); const bi=card('GD06-058','enemy'); G.enemy.field.push(bi); A.aiPostMain(); drainTasks(); drainTasks();
  ok('Blast Impulse (AI): attacks (and destroys) your rested Unit the turn it is deployed, never your shields', r.hp<=0 && G.player.shields.length===6, `r ${r.hp} shields ${G.player.shields.length}`);
  fresh('enemy'); stick('player',1,2); const bi2=card('GD06-058','enemy'); G.enemy.field.push(bi2); A.aiPostMain(); drainTasks(); drainTasks();
  ok('Blast Impulse (AI): with no rested Unit of yours it does not attack on its deploy turn', G.player.shields.length===6); }

// ---- Gundam Aerial Rebuild GD05-026: enemy Units whose Lv. <= (your "Gundam Lfrith"/"Gundnode" Units + itself) are deployed rested ----
{ fresh('player'); put('GD05-026','enemy'); stick('enemy',2,2,{name:'Gundnode'}); stick('enemy',2,2,{name:'Gundam Lfrith Ur'});
  G.player.hand=[card('ST01-005','player'), card('GD01-054','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll();
  const gm=G.player.field.find(x=>x.def==='ST01-005');
  ok('Aerial Rebuild: with 2 Gundnode/Lfrith + itself (3), your Lv.'+(gm&&gm.lv)+' Unit is deployed rested', gm && gm.rested, gm && gm.lv);
  fresh('player'); put('GD05-026','enemy'); G.player.hand=[card('ST01-005','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll();
  const gm2=G.player.field.find(x=>x.def==='ST01-005');
  ok('Aerial Rebuild: alone (count 1) a Lv.'+(gm2&&gm2.lv)+' Unit enters active', gm2 && (gm2.lv>1 ? !gm2.rested : gm2.rested)); }
{ fresh('enemy'); put('GD05-026','player'); stick('player',2,2,{name:'Gundnode'}); const u=card('ST01-005','enemy'); G.enemy.field.push(u); A.onUnitDeployed(u, G.enemy, null, true); drainTasks();
  ok('Aerial Rebuild (player\'s): the AI\'s Lv.'+u.lv+' Unit is deployed rested (count 2)', u.lv<=2 ? u.rested : !u.rested, u.lv+' '+u.rested); }

// ---- End-of-turn statics ----
// Graham's Union Flag Custom GD03-069: 【During Link】At the end of the turn when this Unit is paired with a Pilot, set it as active.
{ fresh('player'); const g=put('GD03-069','player'); pair(g,'GD03-098'); g.rested=true; A.finishEndPhase();
  ok("Graham's Union Flag Custom: linked this turn -> set active at the end of the turn", g.linked && !g.rested, `${g.linked} ${g.rested}`);
  fresh('player'); const g2=put('GD03-069','player'); pair(g2,'GD03-098'); G.turnSeq++; g2.rested=true; A.finishEndPhase();
  ok("Graham's Union Flag Custom: paired on an earlier turn -> stays rested", g2.rested);
  fresh('enemy'); const g3=put('GD03-069','enemy'); pair(g3,'GD03-098'); g3.rested=true; A.finishEndPhase();
  ok("Graham's Union Flag Custom (AI): set active at the end of the turn it linked", !g3.rested); }
// ∀ Gundam GD04-069: 【During Link】At the end of a turn where you have paid ① or more for one of your other (Militia)/(Dianna Counter)
// Units' effects, choose 1 of your (Militia) Units. Set it as active.
{ fresh('enemy'); const tg=put('GD04-069','enemy'); pair(tg,'GD04-097'); const pay=put('GD04-073','enemy'); const res=stick('enemy',2,2,{trait:'(Militia)',rested:true});
  A.applyActivateEffect(pay, null, G.enemy); const paid=G.enemy.resAvail; A.finishEndPhase();
  ok('∀ Gundam (AI): paid ① for another (Militia) Unit -> a rested (Militia) Unit is set active at the end of the turn', paid===9 && !res.rested, `${paid} ${res.rested}`);
  fresh('enemy'); const tg2=put('GD04-069','enemy'); pair(tg2,'GD04-097'); const res2=stick('enemy',2,2,{trait:'(Militia)',rested:true}); A.finishEndPhase();
  ok('∀ Gundam (AI): nothing paid -> nothing set active', res2.rested); }
{ fresh('player'); const tg=put('GD04-069','player'); pair(tg,'GD04-097'); const pay=put('GD04-073','player'); const r1=stick('player',2,2,{trait:'(Militia)',rested:true,name:'Militia A'}), r2=stick('player',3,3,{trait:'(Militia)',rested:true,name:'Militia B'});
  A.startActivate(pay); drainTasks(); const selfBuff=A.effAp(pay)===pay.baseAp+2 && G.player.resAvail===9; A.finishEndPhase();
  const m=modal(); const offered=m && m.btns.some(b=>/Militia A/.test(b)) && m.btns.some(b=>/Militia B/.test(b)); pressNoDrain(/Militia A/);
  ok('∀ Gundam: you choose which rested (Militia) Unit is set active', offered && !r1.rested && r2.rested, `${offered} ${r1.rested}/${r2.rested}`);
  ok('∀ Gundam GD04-073: its ① ability gives AP+2 to itself (no target choice)', selfBuff); }
// Narrative Gundam A-Packs (EX) EB01-003: At the end of your turn, if this Unit is rested, rest all Units. If this effect rested 3 or
// more Units, draw 1.
{ fresh('player'); const n=put('EB01-003','player',{rested:true}); const a=stick('player',1,1), b=stick('player',1,1), c=stick('enemy',1,1), d=stick('enemy',1,1);
  const h0=G.player.hand.length; A.finishEndPhase();   // (the AI's own Units are set active again at the start of its turn)
  ok('Narrative A-Packs: rested at the end of your turn -> all Units rested, and 4 rested -> draw 1', a.rested && b.rested && logs().some(l=>/rests all Units \(4\)/.test(l)) && G.player.hand.length===h0+1, `${a.rested}${b.rested} hand ${h0}->${G.player.hand.length}`);
  fresh('player'); const n2=put('EB01-003','player'); const e=stick('player',1,1); A.finishEndPhase();
  ok('Narrative A-Packs: active -> nothing is rested', !e.rested);
  fresh('enemy'); const n3=put('EB01-003','enemy',{rested:true}); const f1=stick('enemy',1,1); stick('player',1,1); const h1=G.enemy.hand.length; A.finishEndPhase();
  ok('Narrative A-Packs (AI): rests all Units at the end of its turn (2 rested -> no draw)', f1.rested && logs().some(l=>/rests all Units \(2\)/.test(l)) && G.enemy.hand.length===h1, `${f1.rested} ${h1}->${G.enemy.hand.length}`); }
// Gundam Exia ST07-001: At the end of your turn, if there are 7 or more (CB) cards in your trash, choose 1 of your Resources. Set it as active.
{ const cbId='GD03-026'; fresh('player'); put('ST07-001','player'); for (let i=0;i<7;i++) G.player.trash.push(card(cbId,'player')); G.player.resAvail=5; A.finishEndPhase();
  const r7=G.player.resAvail;
  fresh('player'); put('ST07-001','player'); for (let i=0;i<6;i++) G.player.trash.push(card(cbId,'player')); G.player.resAvail=5; A.finishEndPhase();
  ok('Gundam Exia: 7 (CB) cards in trash -> a Resource is set active at the end of your turn (6 -> none)', r7===6 && G.player.resAvail===5, `${r7}/${G.player.resAvail}`); }

// ---- Eagail GD06-070: 【Attack】If you have paid a total of ③ or more for your Units' effects this turn, choose 1 enemy Unit. AP-5 ----
{ fresh('enemy'); const eg=put('GD06-070','enemy'); const mine=stick('player',6,6); A.resolveAiAttack(eg, ()=>{}, null); drainTasks(); passAll();
  const noPay=A.effAp(mine);
  fresh('enemy'); const eg2=put('GD06-070','enemy'); const mine2=stick('player',6,6); G.enemy.paidFx={ turnSeq:G.turnSeq, total:3, payers:[] };
  const noPayLog=logs().some(l=>/gets AP-5/.test(l)); A.resolveAiAttack(eg2, ()=>{}, null); drainTasks(); passAll();
  ok('Eagail (AI): no AP-5 unless ③ or more was paid for Units\' effects this turn', noPay===6 && !noPayLog && logs().some(l=>/gets AP-5/.test(l)), `${noPay} ${noPayLog}`); }
{ fresh('player'); const eg=put('GD06-070','player'); const foe=stick('enemy',6,6); G.player.paidFx={ turnSeq:G.turnSeq, total:3, payers:[] };
  A.fieldClick(eg.uid); drainTasks(); A.attackDirect(); drainTasks(); const tt=G.mode==='trigger-target'; if (tt){ A.fieldClick(foe.uid); drainTasks(); }
  passAll();
  ok('Eagail: with ③ paid you choose the enemy Unit to get AP-5 during this battle (it ends with the battle)', tt && logs().some(l=>l.includes(foe.name+' gets AP-5 this battle')) && A.effAp(foe)===6, `${tt}`); }

// ---- Gundam Lfrith Thorn GD04-021: play a (Dawn of Fold) Command with an EX Resource -> you may pair it from your trash ----
{ fresh('player'); const th=put('GD04-021','player'); const ac=stick('player',2,2,{trait:'(Academy)'}); G.player.resMax=4; G.player.ex=1; G.player.resAvail=1;
  G.player.hand=[card('GD04-106','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); press(/use EX/i); press(/Command effect/);
  if (modal() && /choose (?:1|up to \d+) of your Units/i.test(modal().msg)){ press(/Dummy/); if (modal() && /choose up to/i.test(modal().msg)) press(/Done/); }   // (paid with EX it may choose up to 2 — g7)
  const m=modal(); const offered=m && /pair/i.test(m.msg) && m.btns.some(b=>/Thorn/.test(b)); press(/Thorn/);
  ok('Lfrith Thorn: you are offered to pair the EX-paid (Dawn of Fold) Command from your trash, and it pairs', offered && th.pilot && th.pilot.name==='Norea Du Noc' && !G.player.trash.some(c=>c.def==='GD04-106'), `${offered} ${th.pilot&&th.pilot.name}`);
  ok('Lfrith Thorn: Norea Du Noc links it', th.linked); }
{ fresh('enemy'); const th=put('GD04-021','enemy'); const cmd=card('GD04-106','enemy'); G.enemy.resMax=4; G.enemy.ex=1; G.enemy.resAvail=1;
  A.payCost(G.enemy, 1); A.sendToTrash(cmd, G.enemy); A.commandPlayed(cmd, G.enemy); drainTasks();
  const paired=!!(th.pilot && th.pilot.name==='Norea Du Noc');
  fresh('enemy'); const th2=put('GD04-021','enemy'); const cmd2=card('GD04-106','enemy'); A.payCost(G.enemy, 1); A.sendToTrash(cmd2, G.enemy); A.commandPlayed(cmd2, G.enemy); drainTasks();
  ok('Lfrith Thorn (AI): pairs the Command when an EX Resource paid for it, not otherwise', paired && !th2.pilot, `${paired} ${!!th2.pilot}`); }

// ---- Graham's Union Flag Custom Ⅱ (GN Flag) GD04-071: Choose 1 (Superpower Bloc) card and 1 (UN) card from your trash. Exile them.
//      If you do, set this Unit as active. It can't attack during this turn. ----
{ fresh('player'); const f=put('GD04-071','player',{rested:true});
  ok('GN Flag: with an empty trash the ability is not available', !A.activateReady(f));
  G.player.trash=[card('GD03-098','player')]; ok('GN Flag: one card that is both (Superpower Bloc) and (UN) cannot pay for both', !A.activateReady(f));
  G.player.trash=noImg([card('GD03-098','player'), card('GD03-069','player'), card('GD04-080','player')]);
  A.startActivate(f); drainTasks(); const t1=tileNames(); pickTile(/Graham's Union Flag Custom$/); const t2=tileNames(); pickTile(/Alvatore/); drainTasks();
  ok('GN Flag: you choose 1 (Superpower Bloc) card, then 1 (UN) card; both are exiled and it is set active', t1.length===2 && t2.length===2 && !f.rested && G.player.exile.length===2 && G.player.trash.length===1 && G.player.trash[0].def==='GD03-098', `${t1}|${t2} rested ${f.rested} trash ${G.player.trash.map(c=>c.def)}`);
  ok("GN Flag: it can't attack this turn", A.trashBlocksAttack(f, G.player)); }
{ fresh('enemy'); const f=put('GD04-071','enemy',{rested:true}); G.enemy.trash=[card('GD03-069','enemy'), card('GD04-080','enemy'), card('ST01-001','enemy')];
  A.applyActivateEffect(f, null, G.enemy);
  ok('GN Flag (AI): exiles one (Superpower Bloc) and one (UN) card, then readies', !f.rested && G.enemy.exile.length===2 && G.enemy.trash.length===1); }

// ---- Zeta Gundam GD02-069 + G-Defenser GD03-079: "Choose 1 active friendly Base. Rest it. If you do, set this Unit as active."
//      "When you rest your Base with one of your Units' effects, you may rest this Unit instead." ----
{ fresh('player'); const z=put('GD02-069','player'); pair(z,'GD02-097'); z.rested=true; G.player.base=card('ST01-016','player'); const gd=put('GD03-079','player');
  A.startActivate(z); drainTasks(); const m=modal(); const offered=m && m.btns.some(b=>/G-Defenser instead/.test(b)) && m.btns.some(b=>/Asticassia/.test(b));
  press(/G-Defenser instead/);
  ok('Zeta + G-Defenser: you may rest G-Defenser instead of your Base, and Zeta is set active', offered && gd.rested && !G.player.base.rested && !z.rested && A.cantHitPlayer(z), `${offered} gd ${gd.rested} base ${G.player.base.rested} z ${z.rested}`);
  fresh('player'); const z2=put('GD02-069','player'); pair(z2,'GD02-097'); z2.rested=true;
  ok('Zeta Gundam: no active friendly Base -> the ability is not available (it was free before)', !A.activateReady(z2));
  G.player.base=card('ST01-016','player'); A.startActivate(z2); drainTasks();
  ok('Zeta Gundam: rests your Base, then it is set active', G.player.base.rested && !z2.rested); }
{ fresh('enemy'); const z=put('GD02-069','enemy'); pair(z,'GD02-097'); z.rested=true; G.enemy.base=card('ST01-016','enemy'); A.applyActivateEffect(z, null, G.enemy);
  ok('Zeta Gundam (AI): rests its Base and readies', G.enemy.base.rested && !z.rested); }

// ---- Gundam Exia Repair GD05-050: battle damage to a Lv.4-or-lower enemy Unit with no paired Pilot destroys it ----
{ fresh('player'); const ex=put('GD05-050','player'); const t=stick('enemy',1,6,{lv:4,rested:true}); A.fieldClick(ex.uid); drainTasks(); A.fieldClick(t.uid); drainTasks(); passAll();
  const killed=!G.enemy.field.includes(t) && t.hp===4;   // destroyed by the effect after taking the 2 battle damage
  fresh('player'); const ex2=put('GD05-050','player'); const t2=stick('enemy',1,6,{lv:4,rested:true}); pair(t2,'GD01-091'); const hp2=t2.hp; A.fieldClick(ex2.uid); drainTasks(); A.fieldClick(t2.uid); drainTasks(); passAll();
  const paired=G.enemy.field.includes(t2) && t2.hp===hp2-2;
  fresh('player'); const ex3=put('GD05-050','player'); const t3=stick('enemy',1,6,{lv:5,rested:true}); A.fieldClick(ex3.uid); drainTasks(); A.fieldClick(t3.uid); drainTasks(); passAll();
  const lv5=G.enemy.field.includes(t3) && t3.hp===4;
  ok('Exia Repair: destroys an unpaired Lv.4 Unit it deals battle damage to', killed, `hp ${t.hp}`);
  ok('Exia Repair: a paired Lv.4 Unit and an unpaired Lv.5 Unit only take the damage', paired && lv5, `${paired} ${lv5}`); }
{ fresh('enemy'); const ex=put('GD05-050','enemy'); const t=stick('player',1,6,{lv:3,rested:true}); A.resolveAiAttack(ex, ()=>{}, t); drainTasks(); passAll();
  ok('Exia Repair (AI): destroys your unpaired Lv.3 Unit it damages', !G.player.field.includes(t)); }

// ---- Alpha Azieru GD05-054: 【Once per Turn】When one of your Units is destroyed by an effect, draw 1 ----
{ fresh('enemy'); put('GD05-054','player'); const a=stick('player',1,1), b=stick('player',1,1), c=stick('player',1,5,{rested:true}); const h0=G.player.hand.length;
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, a, 'T'); const h1=G.player.hand.length;
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, b, 'T'); const h2=G.player.hand.length;
  ok('Alpha Azieru: your Unit destroyed by an effect -> draw 1, once per turn', h1===h0+1 && h2===h1, `${h0}->${h1}->${h2}`);
  fresh('enemy'); put('GD05-054','player'); const v=stick('player',1,1,{rested:true}); const atk=stick('enemy',5,5); const h3=G.player.hand.length; A.resolveAiAttack(atk, ()=>{}, v); drainTasks(); passAll();
  ok('Alpha Azieru: a Unit destroyed in battle does not count', !G.player.field.includes(v) && G.player.hand.length===h3); }
{ fresh('player'); put('GD05-054','enemy'); const a=stick('enemy',1,1); const h0=G.enemy.hand.length; A.applyToTarget(stick('player',1,1), G.player, {kind:'destroy'}, a, 'T');
  ok('Alpha Azieru (AI): its Unit destroyed by your effect -> it draws 1', G.enemy.hand.length===h0+1); }

// ---- Quiet Zero GD05-126: 【Activate･Main】【Once per Turn】②：If you have a Unit with "Gundam Aerial" in its card name that is Lv.5 or
//      higher in play, deploy 1 [Gundnode] Unit token ----
{ fresh('player'); G.player.base=card('GD05-126','player');
  const without=A.activateReady(G.player.base); put('ST01-007','player');   // Gundam Aerial (Bit on Form) Lv.4
  const lv4=A.activateReady(G.player.base); put('GD05-026','player');       // Gundam Aerial Rebuild Lv.5
  const lv5=A.activateReady(G.player.base); A.startActivate(G.player.base); drainTasks(); passAll();
  ok('Quiet Zero: needs a "Gundam Aerial" Unit of Lv.5 or higher, then deploys a [Gundnode] token', !without && !lv4 && lv5 && G.player.field.some(x=>x.token && /Gundnode/.test(x.name)) && G.player.resAvail===8, `${without}/${lv4}/${lv5} res ${G.player.resAvail}`);
  fresh('enemy'); G.enemy.base=card('GD05-126','enemy'); ok('Quiet Zero (AI): not usable without the Aerial', !A.activateReady(G.enemy.base)); }

// ---- Gundam Kyrios (Tail Booster) GD04-023: 【Deploy】Choose 1 of your Units paired with a (Super Soldier) Pilot ----
{ fresh('player'); const p=stick('player',3,3,{lv:5}); pair(p,'GD03-100'); const np=stick('player',3,3,{lv:3});
  G.player.hand=[card('GD04-023','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll();
  ok('Kyrios (Tail Booster): only your Unit paired with a (Super Soldier) Pilot gets the grant', A.canHitActive(p, null) && !A.canHitActive(np, null), `${A.canHitActive(p, null)}/${A.canHitActive(np, null)}`); }   // (g7's limited active-attack grant)
{ fresh('enemy'); const np=stick('enemy',3,3,{lv:3}); const k=card('GD04-023','enemy'); G.enemy.field.push(k); A.runTrigger(k, G.enemy, A.parseTrigger(k.effect,'Deploy'), 'Deploy');
  ok('Kyrios (Tail Booster) (AI): with no (Super Soldier)-paired Unit nothing is granted', !A.canHitActive(np, null) && !A.canHitActive(k, null)); }

// ---- Riddhe Marcenas GD04-098: 【During Link】When this Unit receives effect damage from an enemy, reduce it by 2 ----
{ fresh('enemy'); const d=put('GD02-017','player'); pair(d,'GD04-098'); const hp=d.hp; A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, d, 'T');
  ok('Riddhe Marcenas: your linked Unit takes 3 enemy effect damage as 1', d.linked && d.hp===hp-1, `${d.linked} ${hp}->${d.hp}`);
  fresh('player'); const e=put('GD02-017','enemy'); pair(e,'GD04-098'); const hp2=e.hp; A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:3}, e, 'T');
  const atk=stick('player',3,1); const hp3=e.hp; e.rested=true; A.fieldClick(atk.uid); drainTasks(); A.fieldClick(e.uid); drainTasks(); passAll();
  ok('Riddhe Marcenas (AI): effect damage -2, battle damage unchanged', hp2-1===hp3 && (e.hp===hp3-3 || !G.enemy.field.includes(e)), `${hp2}->${hp3}->${e.hp}`); }

// ---- Izuma Colony GD04-126: battle damage from an enemy Unit with 3 or less AP -> deal 1 damage to that Unit ----
{ fresh('enemy'); G.player.base=card('GD04-126','player'); const a3=stick('enemy',3,3); A.resolveAiAttack(a3, ()=>{}, null); drainTasks(); passAll();
  const hit=a3.hp;
  fresh('enemy'); G.player.base=card('GD04-126','player'); const a4=stick('enemy',4,3); A.resolveAiAttack(a4, ()=>{}, null); drainTasks(); passAll();
  ok('Izuma Colony: a 3-AP attacker that hits it takes 1 damage (a 4-AP one does not)', hit===2 && a4.hp===3, `${hit}/${a4.hp}`);
  fresh('player'); G.enemy.base=card('GD04-126','enemy'); const m3=stick('player',3,3); A.fieldClick(m3.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll();
  ok("Izuma Colony (AI's): your 3-AP attacker takes 1 damage", m3.hp===2, 'hp '+m3.hp); }

// ---- Presidential Office GD05-130: 【Destroyed】You may exile this card in your trash. If you do, you may deploy 1 Base card with
//      "Presidential Office" in its card name from your hand ----
{ fresh('enemy'); G.player.base=card('GD05-130','player'); G.player.hand=noImg([card('GD05-130','player')]); const atk=stick('enemy',6,6); const sh=G.player.shields.length;
  A.resolveAiAttack(atk, ()=>{}, null); drainTasks();
  const asked=modal() && /exile/i.test(modal().msg); press(/Exile it/); const tiles=tileNames(); pickTile(/Presidential/); drainTasks(); passAll();
  ok('Presidential Office: destroyed -> you may exile it and deploy another Presidential Office from hand', asked && tiles.length===1 && G.player.base && G.player.base.def==='GD05-130' && G.player.exile.some(c=>c.def==='GD05-130') && G.player.hand.length>=1, `${asked} ${tiles} base ${G.player.base&&G.player.base.def} exile ${G.player.exile.length}`); }
{ fresh('enemy'); G.player.base=card('GD05-130','player'); G.player.hand=[]; const atk=stick('enemy',6,6); A.resolveAiAttack(atk, ()=>{}, null); drainTasks();
  const asked=modal() && /exile/i.test(modal().msg); press(/Don't/);
  ok("Presidential Office: declining keeps it in the trash", asked && G.player.trash.some(c=>c.def==='GD05-130') && !G.player.base); }
{ fresh('player'); G.enemy.base=card('GD05-130','enemy'); G.enemy.hand=[card('GD05-130','enemy')]; const atk=stick('player',6,6); A.fieldClick(atk.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll(); drainTasks();
  ok('Presidential Office (AI): exiles the destroyed copy and deploys the one in hand', G.enemy.base && G.enemy.base.def==='GD05-130' && G.enemy.exile.length===1 && !G.enemy.hand.some(c=>c.def==='GD05-130')); }

// ---- Gundam AGE-2 Double Bullet GD05-021: 【Once per Turn】When this Unit receives enemy damage, if you have an (Earth Federation) Pilot
//      in play, reduce it by 2 ----
{ fresh('enemy'); const a=put('GD05-021','player'); pair(a,'ST01-010'); const hp=a.hp;
  A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, a, 'T'); const h1=a.hp; A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, a, 'T');
  ok('AGE-2 Double Bullet: with an (Earth Federation) Pilot the first enemy hit each turn is reduced by 2', h1===hp-1 && a.hp===h1-3, `${hp}->${h1}->${a.hp}`);
  fresh('enemy'); const b=put('GD05-021','player'); const hp2=b.hp; A.applyToTarget(stick('enemy',1,1), G.enemy, {kind:'damage', amount:3}, b, 'T');
  ok('AGE-2 Double Bullet: no (Earth Federation) Pilot -> full damage', b.hp===hp2-3);
  fresh('player'); const c=put('GD05-021','enemy'); const u=stick('enemy',1,1); pair(u,'ST01-010'); const hp3=c.hp; c.rested=true; const atk=stick('player',3,1);
  A.fieldClick(atk.uid); drainTasks(); A.fieldClick(c.uid); drainTasks(); passAll();
  ok('AGE-2 Double Bullet (AI): battle damage 3 -> 1 with its (Earth Federation) Pilot in play', c.hp===hp3-1, `${hp3}->${c.hp}`); }

// ---- Duo Maxwell GD06-098: 【During Link】While this Unit is rested, friendly Bases can't receive damage from enemy Units whose Lv. are
//      equal to or lower than this Unit ----
{ fresh('enemy'); const ds=put('GD05-078','player'); pair(ds,'GD06-098'); ds.rested=true; G.player.base=card('ST01-016','player'); const bhp=G.player.base.hp;
  const bh=()=>G.player.base?G.player.base.hp:0;
  const low=stick('enemy',3,3,{lv:3}); A.resolveAiAttack(low, ()=>{}, null); drainTasks(); passAll(); const after1=bh();
  const high=stick('enemy',3,3,{lv:6}); A.resolveAiAttack(high, ()=>{}, null); drainTasks(); passAll();
  ok('Duo Maxwell (GD06-098): rested & linked -> your Base takes no damage from a Lv.3 attacker, but does from a Lv.6 one', ds.linked && after1===bhp && bh()===bhp-3, `${ds.linked} ${bhp}->${after1}->${bh()}`);
  fresh('player'); const e=put('GD05-078','enemy'); pair(e,'GD06-098'); G.enemy.base=card('ST01-016','enemy'); const b2=G.enemy.base.hp; const m=stick('player',3,3,{lv:3});
  A.fieldClick(m.uid); drainTasks(); A.attackDirect(); drainTasks(); passAll();
  ok("Duo Maxwell (GD06-098, AI): while its Unit is active the guard is off", G.enemy.base.hp===b2-3, `${b2}->${G.enemy.base.hp}`); }

// ---- Unicorn Gundam 02 Banshee (Destroy Mode) ST12-006: its second ability 【Activate･Action】Exile 4 cards: <Suppression> during this battle ----
{ fresh('player'); const b=put('ST12-006','player'); for (let i=0;i<4;i++) G.player.trash.push(card('ST01-001','player')); G.enemy.base=null;
  // Its 【Activate･Action】 isn't usable in the main phase (13-2-2-1) and the 【Activate･Main】 needs a Pilot, so a tap starts its attack.
  A.fieldClick(b.uid); drainTasks(); const insp=G.mode==='attack-target' && !A.activateReadyAny(b);
  A.attackDirect(); drainTasks();
  const m=modal(); const offered=insp && m && m.btns.some(x=>/Banshee/.test(x)); press(/Banshee/); passAll(); drainTasks();
  ok('Banshee: its 【Activate･Action】 is offered in the action step and gives <Suppression> for the battle (2 shields)', offered && G.enemy.shields.length===4 && G.player.exile.length===4, `${offered} shields ${G.enemy.shields.length} exile ${G.player.exile.length}`);
  ok('Banshee: the <Suppression> ends with the battle', !A.effSuppression(b)); }
{ fresh('enemy'); const b=put('ST12-006','enemy'); for (let i=0;i<4;i++) G.enemy.trash.push(card('ST01-001','enemy'));
  ok('Banshee (AI): both abilities are built', b.activate && b.activate2 && b.activate2.phase==='action' && b.activate2.action.kw==='suppression');
  A.resolveAiAttack(b, ()=>{}, null); drainTasks(); passAll();
  ok('Banshee (AI): uses its 【Activate･Action】 on a direct attack — 2 of your shields break', G.player.shields.length===4 && G.enemy.exile.length===4, `shields ${G.player.shields.length}`); }

// ---- Ple-Twelve ST12-012: 【When Linked】… If there is a player with 3 or less Shields, add the card to your hand instead ----
{ fresh('player'); G.enemy.shields.length=3; const b=put('ST12-006','player'); G.player.deck=noImg([card('ST01-001','player'), card('ST01-002','player')]);
  const h0=G.player.hand.length; pair(b,'ST12-012'); drainTasks(); const tiles=tileNames(); pickTile(/Gundam/); drainTasks();
  ok('Ple-Twelve: with a player at 3 Shields the kept card goes to your hand', b.linked && tiles.length===2 && G.player.hand.length===h0+1 && G.player.deck.length===0 && G.player.trash.length===1, `${b.linked} ${tiles} hand ${h0}->${G.player.hand.length} deck ${G.player.deck.length}`); }
{ fresh('enemy'); const b=put('ST12-006','enemy'); const d0=G.enemy.deck.length, h0=G.enemy.hand.length; pair(b,'ST12-012');
  const normal = G.enemy.deck.length===d0-1 && G.enemy.hand.length===h0;
  fresh('enemy'); G.enemy.shields.length=2; const b2=put('ST12-006','enemy'); const d1=G.enemy.deck.length, h1=G.enemy.hand.length; pair(b2,'ST12-012');
  ok('Ple-Twelve (AI): top of the deck normally, to hand when a player has 3 or less Shields', normal && G.enemy.deck.length===d1-2 && G.enemy.hand.length===h1+1, `${normal} ${d1}->${G.enemy.deck.length} ${h1}->${G.enemy.hand.length}`); }

// ---- Master Asia GD05-089: "【Burst】Add this card to your hand. If there are 3 or more (MF) cards in your trash, you may deploy it as an
//      (AP3・HP3) Unit instead." — a 【Burst】 option only; from hand it is played as a Pilot ----
{ fresh('player'); for (let i=0;i<3;i++) G.player.trash.push(card('GD05-069','player')); const host=stick('player',2,2); G.player.hand=[card('GD05-089','player')]; const ma0=G.player.hand[0];
  A.playFromHand(ma0.uid); drainTasks(); if (G.mode==='pilot-target') { A.fieldClick(host.uid); drainTasks(); }
  ok('Master Asia: played from hand it pairs as a Pilot (no Unit option)', host.pilotCard===ma0 && !G.player.field.includes(ma0), G.mode);
  fresh('enemy'); for (let i=0;i<3;i++) G.player.trash.push(card('GD05-069','player')); const ma=card('GD05-089','player');
  A.triggerBurst(ma, G.player, ()=>{}, true); drainTasks(); const m=modal(); const offered=m && m.btns.some(b=>/hand/i.test(b)) && m.btns.some(b=>/Unit/.test(b)); press(/hand/i);
  ok('Master Asia Burst: you may keep it as a card in hand instead', offered && G.player.hand.includes(ma) && ma.type==='pilot');
  fresh('enemy'); const two=card('GD05-089','enemy'); G.enemy.hand=[two]; for (let i=0;i<3;i++) G.enemy.trash.push(card('GD05-069','enemy')); A.aiMainStep(); drainTasks();
  ok('Master Asia (AI): never played from hand as a Unit', !G.enemy.field.includes(two) && two.type==='pilot', two.type); }
{ fresh('player'); for (let i=0;i<3;i++) G.enemy.trash.push(card('GD05-069','enemy')); const mb=card('GD05-089','enemy'); A.triggerBurst(mb, G.enemy, ()=>{}, false); drainTasks();
  ok('Master Asia (AI): Burst -> deployed as an (AP3・HP3) Unit', G.enemy.field.includes(mb) && mb.type==='unit' && A.effAp(mb)===3); }

// ---- the slash-trait condition also gates GD05-071 / GD05-079 / GD06-072 ("another (G Team)/(Preventer) Unit") ----
{ fresh('player'); const u=put('GD05-071','player'); const act=A.parseTrigger(A.CARD_BY_ID.get('GD05-071').effect,'Attack');
  const none=A.condMet(act.cond, G.player, u, act.other); stick('player',1,1,{trait:'(Test)'}); const wrong=A.condMet(act.cond, G.player, u, act.other);
  stick('player',1,1,{trait:'(Preventer)'}); const yes=A.condMet(act.cond, G.player, u, act.other);
  ok('GD05-071: "another (G Team)/(Preventer) Unit" needs one of those traits', !none && !wrong && yes, `${none}/${wrong}/${yes}`); }

console.log(fail.length ? 'FAILURES:\n  '+fail.join('\n  ') : 'all audit_g6 checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log(`Errors: ${ERRORS.length}`); if (ERRORS.length) console.log(ERRORS.slice(0,5));
