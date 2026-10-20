// Audit 3, group k: Command / condition gaps.
//  • Striker Pack ST04-012: "If you have no (Earth Alliance) Unit tokens in play, deploy …" is an "If" condition — the player can still
//    play it while one is in play (paid, trashed, no token); the AI resolver deploys nothing then.
//  • Comrades Come First GD02-116 (and Steely Loyalty GD06-111): a Command doesn't count itself toward "N or more cards in your trash".
//  • Gundam Rose GD05-044 activating the 【Main】 of its paired (Special Move) Command (Rose Screamer GD05-113) counts as activating that
//    Command's 【Main】: Master Asia GD05-089's 【Attack】 condition and Shining Gundam (Super Mode) GD05-068's <Suppression>.
//  • Zaku Ⅱ F2 GD06-060 / Val Walo GD06-052: "(Zeon) Unit cards in your trash" are whole-trait matches — (Neo Zeon) doesn't count.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=953000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,activateRestSub:null,_aiPostDeploy:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const sideOf=who=>who==='player'?G.player:G.enemy;
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); sideOf(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); sideOf(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pressUnit=u=>press(new RegExp('^'+esc(u.name)+' '));
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (!/Action Step|block|Block|intercept/i.test(m.msg)) break; if (!press(/^Pass|No block|Don't block|Take it/i)) break; } };
const attack=(atk, def)=>{ A.fieldClick(atk.uid); drainTasks(); if (def) A.fieldClick(def.uid); else A.attackDirect(); drainTasks(); };
const handPlay=id=>{ const c=card(id,'player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks(); return c; };
const logs=()=>(el('log').children||[]).map(c=>strip(c.innerHTML||c.textContent));
const fillTrash=(who, id, n)=>{ const s=sideOf(who); s.trash=[]; for (let i=0;i<n;i++) s.trash.push(card(id, who)); };
// A 【Pilot】 Command paired through its Pilot mode (the same shape as the game's pilotFromMode).
function pairCmdPilot(u, id){
  const c=card(id, u.owner), pm=c.pilotMode;
  const p={ uid:c.uid, owner:c.owner, def:c.def, name:pm.name, type:'pilot', cmdPilot:true, color:c.color, cost:c.cost, lv:c.lv, trait:pm.trait||c.trait,
            effect:'', srcEffect:c.effect, img:c.img, pAp:pm.pAp, pHp:pm.pHp, trashCostReduce:null };
  A.attachPilot(u, p); drainTasks(); return p;
}
const EA_TOKEN={ token:true, trait:'(Earth Alliance)', name:'Aile Strike Gundam' };
const eaTokens=who=>sideOf(who).field.filter(u=>u.token && /\(earth alliance\)/i.test(u.trait||'')).length;

// ---- Striker Pack ST04-012 ----
{ fresh('player'); stick('player',3,3,EA_TOKEN);
  const sp=handPlay('ST04-012');
  ok('Striker Pack (player): playable while an (Earth Alliance) token is in play — leaves the hand, goes to the trash', !G.player.hand.includes(sp) && G.player.trash.includes(sp), G.mode);
  ok('Striker Pack (player): its cost is paid (10 -> 8)', G.player.resAvail===8, G.player.resAvail);
  ok('Striker Pack (player): no second (Earth Alliance) token, no chooser', eaTokens('player')===1 && !modal(), JSON.stringify(modal()));
  ok('Striker Pack (player): the log says why nothing is deployed', logs().some(l=>/already have a \(Earth Alliance\) Unit token/i.test(l))); }
{ fresh('player'); handPlay('ST04-012'); const m=modal();
  ok('Striker Pack (player): with no token the Sword / Launcher chooser opens', !!m && m.btns.length>=2, JSON.stringify(m));
  press(/Launcher/);
  ok('Striker Pack (player): picking Launcher deploys the Launcher Strike Gundam token', G.player.field.some(u=>u.token && /Launcher Strike/.test(u.name)), G.player.field.map(u=>u.name).join(',')); }
{ fresh('enemy'); stick('enemy',3,3,EA_TOKEN); const c=card('ST04-012','enemy'); G.enemy.trash.push(c); A.applyCommand(c, G.enemy, null); drainTasks();
  ok('Striker Pack (AI): resolving it with a token in play deploys nothing', eaTokens('enemy')===1, eaTokens('enemy')); }

// ---- Comrades Come First GD02-116 (the Command doesn't count itself) ----
for (const [n, want] of [[6,false],[7,true]]){
  fresh('player'); const v=put('GD03-062','player'); fillTrash('player', FILL, n); const e=stick('enemy',1,5,{lv:4});
  handPlay('GD02-116'); press(/Command effect/); if (G.mode==='trigger-target'||G.mode==='cmd-target'){ A.fieldClick(v.uid); drainTasks(); }
  ok(`Comrades Come First (player): ${n} other cards in the trash -> the (Vulture) Unit ${want?'may':"may not"} attack an active Lv.4 enemy Unit`, A.canHitActive(v,e)===want, `${A.canHitActive(v,e)} mode ${G.mode}`);
  fresh('enemy'); const v2=put('GD03-062','enemy'); fillTrash('enemy', FILL, n); const e2=stick('player',1,5,{lv:4});
  const c=card('GD02-116','enemy'); G.enemy.trash.push(c); A.applyCommand(c, G.enemy, null); drainTasks();
  ok(`Comrades Come First (AI): ${n} other cards + the Command itself -> ${want?'granted':'not granted'}`, A.canHitActive(v2,e2)===want, A.canHitActive(v2,e2));
}
// Steely Loyalty GD06-111 — a (Gjallarhorn) Command: "4 or more (Gjallarhorn) cards in your trash" needs 4 others.
for (const [n, want] of [[3,false],[4,true]]){
  fresh('enemy'); fillTrash('enemy', 'GD02-099', n); const t=stick('player',1,5);
  const c=card('GD06-111','enemy'); G.enemy.trash.push(c); A.applyCommand(c, G.enemy, t); drainTasks();
  ok(`Steely Loyalty (AI): ${n} other (Gjallarhorn) cards -> ${want?'2 damage':'no damage'}`, (t.hp===3)===want, t.hp);
}
// A Unit's own trash condition is unchanged: Big Zam GD01-027 counts (Zeon)/(Neo Zeon) Unit cards (both traits).
{ fresh('enemy'); const g=card('GD06-028','enemy'); ok('Gaza D GD06-028 is a (Neo Zeon) Unit (test premise)', /\(neo zeon\)/i.test(g.trait) && !/\(zeon\)/i.test(g.trait), g.trait);
  fillTrash('player', 'GD06-028', 10); ok('trash cond "(Zeon)/(Neo Zeon) Unit" still counts (Neo Zeon) cards', A.trashCount(G.player, '(Zeon)/(Neo Zeon) Unit')===10, A.trashCount(G.player, '(Zeon)/(Neo Zeon) Unit')); }

// ---- Zaku Ⅱ F2 GD06-060 / Val Walo GD06-052: whole-trait (Zeon) ----
{ fresh('player'); const z=put('GD06-060','player'), vw=put('GD06-052','player'); const base=A.effAp(z);
  fillTrash('player', 'GD06-028', 5);
  ok('Zaku Ⅱ F2: 5 (Neo Zeon) Unit cards in the trash give no AP+1', A.effAp(z)===base, `${A.effAp(z)} vs ${base}`);
  ok('Val Walo: 5 (Neo Zeon) Unit cards in the trash give no <High-Maneuver>', !A.effHighManeuver || !A.effHighManeuver(vw));
  fillTrash('player', 'GD06-060', 5);
  ok('Zaku Ⅱ F2: 4+ (Zeon) Unit cards in the trash give AP+1', A.effAp(z)===base+1, `${A.effAp(z)} vs ${base}`);
  ok('Val Walo: 5 (Zeon) Unit cards in the trash give <High-Maneuver>', !A.effHighManeuver || A.effHighManeuver(vw));
  ok('matchTrashTrait: (Neo Zeon) card is not a (Zeon) card; a (Zeon) card is', !A.matchTrashTrait(card('GD06-028','player'),'(Zeon) Unit') && A.matchTrashTrait(card('GD06-060','player'),'(Zeon) Unit')); }

// ---- Gundam Rose GD05-044 activating its paired (Special Move) Command's 【Main】 ----
const GEORGE=A.GUNDAM_CARDS.find(d=>d.type==='pilot' && d.name==='George de Sand');
{ fresh('player'); const r=put('GD05-044','player'); pairCmdPilot(r,'GD05-113'); const sm=put('GD05-068','player');
  const ma=stick('player',3,9,{name:'MAhost',trait:'(MF)',link:['Master Asia']}); A.attachPilot(ma, card('GD05-089','player')); drainTasks(); passAll();
  const e1=stick('enemy',1,9,{rested:true,name:'E1'}), e2=stick('enemy',1,9,{rested:true,name:'E2'});
  ok('premise: Gundam Rose linked with Rose Screamer as Pilot; Master Asia host linked', r.linked && ma.linked, `${r.linked} ${ma.linked}`);
  ok('premise: no (Special Move) Command activated yet -> Shining Gundam (Super Mode) has no <Suppression>', !A.effSuppression(sm));
  attack(r, e1); if (modal()) pressUnit(r); else if (G.mode==='trigger-target'){ A.fieldClick(r.uid); drainTasks(); } passAll();
  ok('Gundam Rose (player): activating the paired Rose Screamer 【Main】 records a (Special Move) Command activation', !!(G.player.cmdTraits && G.player.cmdTraits.set.has('special move')));
  ok('Gundam Rose (player): Shining Gundam (Super Mode) gains <Suppression>', A.effSuppression(sm));
  attack(ma, e2); const tt=G.mode==='trigger-target' || !!modal();
  ok('Master Asia (player): its 【Attack】 condition is met -> the player chooses the enemy Unit', tt, G.mode);
  const before=e2.hp, atkAp=A.effAp(ma); if (G.mode==='trigger-target'){ A.fieldClick(e2.uid); drainTasks(); } else press(/E2/); passAll();
  ok('Master Asia (player): 2 damage to the chosen enemy Unit (plus the battle damage)', before-e2.hp===2+atkAp, `${before} -> ${e2.hp}, attacker AP ${atkAp}`); }
if (GEORGE){ fresh('player'); const r=put('GD05-044','player'); A.attachPilot(r, card(GEORGE.id,'player')); drainTasks(); const sm=put('GD05-068','player');
  const e1=stick('enemy',1,9,{rested:true,name:'E1'}); attack(r, e1); if (modal()) pressUnit(r); passAll();
  ok('Gundam Rose with a real George de Sand Pilot card: no Command activation is recorded', !(G.player.cmdTraits && G.player.cmdTraits.set.has('special move')) && !A.effSuppression(sm)); }
{ fresh('enemy'); const r=put('GD05-044','enemy'); pairCmdPilot(r,'GD05-113'); const sm=put('GD05-068','enemy'); const t=stick('player',1,9,{rested:true});
  ok('premise (AI): Gundam Rose linked', r.linked);
  A.resolveAiAttack(r, ()=>{}, t); drainTasks(); passAll();
  ok('Gundam Rose (AI): the paired Rose Screamer 【Main】 counts as a (Special Move) Command activation', !!(G.enemy.cmdTraits && G.enemy.cmdTraits.set.has('special move')));
  ok('Gundam Rose (AI): Shining Gundam (Super Mode) gains <Suppression>', A.effSuppression(sm)); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all audit3 group k checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
