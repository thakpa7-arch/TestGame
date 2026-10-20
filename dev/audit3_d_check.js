// Audit round 3, group d: statics / damage guards / targeting.
//   Michaelis GD01-076 (and Sting Oakley GD05-091): a conditional "this Unit gets HP+N" raises the Unit's HP, not only its cap.
//   Gundam Ashtaron GD02-040: "can't receive battle damage from enemy Units with 2 or less HP" reads the enemy's HP before the
//     battle's (simultaneous) damage.
//   Gundam DX GD04-049: "choose 1 enemy Unit/Base that is Lv.8 or lower. Destroy it." — the enemy Base is a legal target.
//   Zudah Unit 1 EB01-037: "During your turn, while this Unit is battling an enemy Unit with <Blocker>, this Unit can't receive
//     battle damage."
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document, el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
const plainDefs = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d,'player').burst && !/【/.test(d.effect||'') && !/-p\d/.test(d.id));
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(plainDefs[(i*7)%plainDefs.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(plainDefs[(i*5+3)%plainDefs.length], s.who)); }
  el('log').children.length=0;
}
let UID=930000;
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const modal=()=>el('blockModal').classList.contains('show') ? { msg:(el('blockMsg').innerHTML||'').replace(/<[^>]+>/g,''), btns:[...el('blockBtns').children].map(b=>(b.innerHTML||b.textContent||'').replace(/<[^>]+>/g,'')) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test((x.innerHTML||x.textContent||'').replace(/<[^>]+>/g,''))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const esc=s=>s.replace(/[.*+?^${}()|[\]\\#/]/g,'\\$&');
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass|Don't use Support/)) break; } };
const overlay=()=>[...(doc.body.children||[])].find(n=>String(n.className||'').includes('modal-overlay'))||null;
function walk(n, f){ f(n); for (const c of (n.children||[])) walk(c, f); }
function confirmOverlay(){ const o=overlay(); if (!o) return false; let conf=null; walk(o, n=>{ if (n.dataset && n.dataset.role==='confirm') conf=n; });
  if (!conf){ const btns=[]; walk(o, n=>{ if (n.onclick) btns.push(n); }); conf=btns[btns.length-1]; }
  if (!conf) return false; conf.onclick(); drainTasks(); return true; }
const logs=()=>(el('log').children||[]).map(n=>(n.innerHTML||'').replace(/<[^>]+>/g,'')).join(' | ');
const patk=(a,t)=>{ G.selected=a.uid; G.mode='attack-target'; if(t) A.fieldClick(t.uid); else A.attackDirect(); drainTasks(); };
const cmds=(who, n)=>{ for (let i=0;i<n;i++) side(who).trash.push(card('GD01-100', who)); A.refreshTrashStats(side(who)); };

// ---------------- Michaelis GD01-076: "While there are 4 or more Command cards in your trash, this Unit gets AP+1 and HP+1." ----------------
{ fresh('player'); cmds('player', 4); const c=card('GD01-076','player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks();
  const m=G.player.field.find(x=>x.def==='GD01-076'); A.render(); A.render(); drainTasks();
  ok('Michaelis (player): deployed with 4 Commands in trash it is a 4/4', m && m.hp===4 && A.effMaxHp(m)===4 && A.effAp(m)===4, m && `hp ${m.hp} max ${A.effMaxHp(m)} ap ${A.effAp(m)}`);
  A.damage(m, 3, G.player); drainTasks();
  ok('Michaelis (player): survives 3 damage with 1 HP', G.player.field.includes(m) && m.hp===1, `hp ${m.hp}`); }
{ fresh('player'); cmds('player', 3); const m=put('GD01-076','player'); A.render();
  ok('Michaelis: with 3 Commands in trash it is 3/3', m.hp===3 && A.effMaxHp(m)===3);
  const c=card('GD01-118','player'); G.player.hand=[c]; A.playFromHand(c.uid); drainTasks(); if (modal()) press(/./); drainTasks();
  const n=G.player.trash.filter(x=>x.type==='command').length;
  ok('Michaelis: the 4th Command reaching the trash raises its HP to 4', n===4 && m.hp===4 && A.effMaxHp(m)===4, `cmds ${n} hp ${m.hp}`);
  A.damage(m, 3, G.player); drainTasks();
  ok('Michaelis: …and it survives 3 damage', G.player.field.includes(m) && m.hp===1, `hp ${m.hp}`); }
{ fresh('player'); cmds('player', 4); const m=put('GD01-076','player'); A.render(); A.damage(m, 2, G.player); drainTasks();
  G.player.exile.push(G.player.trash.pop()); A.refreshTrashStats(G.player); drainTasks();
  ok('Michaelis: losing the condition takes the HP back (4/4 with 2 damage -> 3/3 with 1 HP left)', m.hp===1 && A.effMaxHp(m)===3 && G.player.field.includes(m), `hp ${m.hp}`);
  G.player.trash.push(card('GD01-100','player')); A.refreshTrashStats(G.player); A.render();
  ok('Michaelis: …and gives it again when the condition returns', m.hp===2 && A.effMaxHp(m)===4, `hp ${m.hp}`);
  A.damage(m, 1, G.player); drainTasks(); G.player.exile.push(G.player.trash.pop()); A.refreshTrashStats(G.player); drainTasks();
  ok('Michaelis: with 3 damage on it, losing the HP+1 destroys it (0 HP)', !G.player.field.includes(m) && G.player.trash.includes(m), `hp ${m.hp}`); }
{ fresh('enemy'); cmds('enemy', 4); const m=put('GD01-076','enemy'); A.refreshTrashStats(G.enemy);
  ok('Michaelis (AI): HP 4 with 4 Commands in its trash', m.hp===4 && A.effMaxHp(m)===4, `hp ${m.hp}`);
  A.damage(m, 3, G.enemy); drainTasks();
  ok('Michaelis (AI): survives 3 damage', G.enemy.field.includes(m) && m.hp===1); }
// Sting Oakley GD05-091 (Pilot): "While an enemy player has 7 or more cards in their trash, this Unit gets AP+1 and HP+1."
{ fresh('player'); const u=stick('player', 3, 3); const p=card('GD05-091','player'); A.attachPilot(u, p); drainTasks(); A.render();
  const h0=u.hp; for (let i=0;i<7;i++) G.enemy.trash.push(card('GD01-100','enemy')); A.refreshTrashStats(G.enemy);
  ok('Sting Oakley: the paired Unit gains 1 HP when the enemy trash reaches 7', u.hp===h0+1 && A.effMaxHp(u)===h0+1, `hp ${h0} -> ${u.hp}`);
  A.render(); A.render();
  ok('Sting Oakley: refreshing again does not add it twice', u.hp===h0+1, `hp ${u.hp}`);
  G.enemy.exile.push(G.enemy.trash.pop()); A.refreshTrashStats(G.enemy);
  ok('Sting Oakley: and loses it when the enemy trash drops to 6', u.hp===h0 && A.effMaxHp(u)===h0, `hp ${u.hp}`); }

// ---------------- Gundam Ashtaron GD02-040 ----------------
function ashtaronPlayer(nuAp, foeHp){
  fresh('player'); const nu=stick('player', nuAp, 5, {trait:'(New UNE)'}); stick('player', 3, 5, {trait:'(New UNE)'});
  const c=card('GD02-040','player'); G.player.hand.push(c); A.playFromHand(c.uid); drainTasks();
  press(new RegExp(esc(nu.name)));
  const foe=stick('enemy', 4, foeHp, {rested:true});
  A.fieldClick(nu.uid); drainTasks(); A.fieldClick(foe.uid); drainTasks(); passAll(); drainTasks();
  return { nu, foe };
}
{ const r=ashtaronPlayer(3, 4); ok('Ashtaron (player): protected 3-AP Unit attacking a 4/4 takes 4 (its HP is read before damage)', r.nu.hp===1, `hp ${r.nu.hp}`); }
{ const r=ashtaronPlayer(3, 3); ok('Ashtaron (player): …attacking a 4/3 (destroyed by the hit) still takes 4', r.nu.hp===1, `hp ${r.nu.hp}`); }
{ const r=ashtaronPlayer(1, 3); ok('Ashtaron (player): a 1-AP Unit attacking a 4/3 takes 4', r.nu.hp===1, `hp ${r.nu.hp}`); }
{ const r=ashtaronPlayer(3, 2); ok('Ashtaron (player): attacking a 4/2 it takes no battle damage', r.nu.hp===5, `hp ${r.nu.hp}`); }
function ashtaronAi(foeHp){
  fresh('enemy'); const nu=stick('enemy', 3, 5, {trait:'(New UNE)'}); const a=put('GD02-040','enemy');
  A.runTrigger(a, G.enemy, A.parseTrigger(a.effect, 'Deploy'), 'Deploy'); drainTasks();
  const foe=stick('player', 4, foeHp, {rested:true});
  A.resolveAiAttack(nu, ()=>{}, foe); drainTasks(); passAll(); drainTasks();
  return { nu, foe };
}
{ const r=ashtaronAi(4); ok('Ashtaron (AI): protected Unit attacking a 4/4 takes 4', r.nu.hp===1, `hp ${r.nu.hp} log ${logs().slice(0,300)}`); }
{ const r=ashtaronAi(2); ok('Ashtaron (AI): protected Unit attacking a 4/2 takes none', r.nu.hp===5, `hp ${r.nu.hp}`); }

// ---------------- Gundam DX GD04-049 ----------------
const vult=()=>A.GUNDAM_CARDS.filter(d=>/Vulture/.test(d.trait)&&!/-p/.test(d.id));
function dxSetup(who){ const s=side(who); const dx=put('GD04-049', who); const p=card('ST02-010', who); Object.assign(p, { effect:'', name:'Plain Pilot', pAp:0, pHp:0 }); A.attachPilot(dx, p); drainTasks();
  for (const d of vult().slice(0,8)) s.trash.push(A.makeCard(d, who)); A.refreshTrashStats(s); return dx; }
{ fresh('player'); const dx=dxSetup('player'); const b=G.enemy.base=card('GD03-132','enemy'); const t0=G.player.trash.length;
  A.fieldClick(dx.uid); drainTasks(); A.attackDirect(); drainTasks();
  const m1=modal(); press(/Exile 7/); confirmOverlay(); const m2=modal();
  ok('DX (player): with only a Lv.2 enemy Base, the effect is offered', !!m1 && m1.btns.some(x=>/Exile 7/.test(x)), JSON.stringify(m1));
  ok('DX (player): after exiling, the chooser lists the enemy Base', !!m2 && m2.btns.length===1 && /Radish/.test(m2.btns[0]), JSON.stringify(m2));
  press(/Radish/); passAll(); drainTasks();
  ok('DX (player): the chosen Base is destroyed and 7 cards are exiled', G.enemy.base!==b && G.enemy.trash.includes(b) && G.player.trash.length===t0-7, `base ${G.enemy.base&&G.enemy.base.name} trash ${t0}->${G.player.trash.length}`); }
{ fresh('player'); const dx=dxSetup('player'); const b=G.enemy.base=card('GD03-132','enemy'); b.hp=99; const e=stick('enemy', 1, 9, {lv:8}); stick('enemy', 1, 9, {lv:9});
  A.fieldClick(dx.uid); drainTasks(); A.attackDirect(); drainTasks(); press(/Exile 7/); confirmOverlay(); const m=modal();
  ok('DX (player): Unit + Base: both are listed (not the Lv.9 Unit)', !!m && m.btns.length===2 && m.btns.some(x=>/Radish/.test(x)) && m.btns.some(x=>x.includes(e.name)), JSON.stringify(m));
  press(new RegExp(esc(e.name))); passAll(); drainTasks();
  ok('DX (player): choosing the Unit destroys it and leaves the Base', !G.enemy.field.includes(e) && G.enemy.base===b); }
{ fresh('player'); const dx=dxSetup('player'); G.enemy.base=card('GD03-132','enemy'); G.enemy.base.lv=9;
  A.fieldClick(dx.uid); drainTasks(); A.attackDirect(); drainTasks(); const m=modal();
  ok('DX (player): a Base above Lv.8 is not a target (nothing offered)', !m || !m.btns.some(x=>/Exile 7/.test(x)), JSON.stringify(m)); }
{ fresh('enemy'); const dx=dxSetup('enemy'); const b=G.player.base=card('GD03-132','player'); const t0=G.enemy.trash.length;
  A.resolveAiAttack(dx, ()=>{}, null); drainTasks(); passAll(); drainTasks();
  ok('DX (AI): with only a player Base, the AI exiles 7 and destroys the Base', G.enemy.trash.length===t0-7 && G.player.base!==b && G.player.trash.includes(b), `trash ${t0}->${G.enemy.trash.length}`); }
{ fresh('player'); const t=A.enemyTargets(G.enemy, { kind:'destroy', filter:{ maxLv:8 } }); G.enemy.base=card('GD03-132','enemy');
  ok('enemyTargets: a plain "enemy Unit" destroy never lists the Base', !A.enemyTargets(G.enemy, { kind:'destroy', filter:{ maxLv:8 } }).includes(G.enemy.base) && t.length===0); }

// ---------------- Zudah Unit 1 EB01-037 ----------------
{ fresh('player'); const z=put('EB01-037','player'); const s=put('EB01-048','enemy',{rested:true});
  ok('Zudah: the <Blocker> in its condition is not a printed keyword', !A.effBlocker(z));
  patk(z, s); passAll(); drainTasks();
  ok('Zudah (player): attacking a rested <Blocker> on your turn, it takes no battle damage', G.player.field.includes(z) && z.hp===1 && !G.enemy.field.includes(s), `hp ${z.hp}`); }
{ fresh('player'); const z=put('EB01-037','player'); const b=put('EB01-011','enemy');
  patk(z, null); passAll(); drainTasks();
  ok('Zudah (player): intercepted by a <Blocker>, it takes no battle damage', G.player.field.includes(z) && z.hp===1 && !G.enemy.field.includes(b), `hp ${z.hp} ${logs().slice(0,200)}`); }
{ fresh('player'); const z=put('EB01-037','player'); const s=stick('enemy', 2, 9, {rested:true});
  patk(z, s); passAll(); drainTasks();
  ok('Zudah (player): attacking a Unit without <Blocker> it takes damage', !G.player.field.includes(z)); }
{ fresh('player'); const z=put('EB01-037','player'); const s=stick('enemy', 2, 9, {rested:true, tempBlocker:true});
  patk(z, s); passAll(); drainTasks();
  ok('Zudah (player): a granted <Blocker> counts too', G.player.field.includes(z) && z.hp===1); }
{ fresh('enemy'); const z=put('EB01-037','enemy'); const g=put('EB01-054','player',{rested:true});
  A.resolveAiAttack(z, ()=>{}, g); drainTasks(); passAll(); drainTasks();
  ok("Zudah (AI): attacking the player's rested <Blocker> on its turn, it takes no battle damage", G.enemy.field.includes(z) && z.hp===1, `hp ${z.hp}`); }
{ fresh('enemy'); const z=put('EB01-037','player',{rested:true}); const g=put('EB01-054','enemy');
  A.resolveAiAttack(g, ()=>{}, z); drainTasks(); passAll(); drainTasks();
  ok("Zudah: on the opponent's turn the protection does not apply", !G.player.field.includes(z), `hp ${z.hp}`); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all audit3 group d checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
