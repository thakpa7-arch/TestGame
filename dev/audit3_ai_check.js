// Audit 3, AI: the Commands the AI never played. Every Command card of the pool that no AI path cast (main phase, action step) is
// now played by the AI when its printed text helps on the board — and held when it doesn't. For each card: a board where playing
// it is clearly right (the AI plays it, pays for it, and the effect resolves) and one where it is clearly wrong (the AI keeps it).
// The inventory at the top lists the cards (base ids) and fails if a Command appears in the pool that no AI path covers.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=950000;
const FILL='ST01-005';   // GM — a plain Lv.2 Unit with no effect text
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'enemy',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,modalQueue:[],
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,endActionStep:false,activateRestSub:null,_aiPostDeploy:false,_aiPostCombat:null,_aiPostUtil:null,_aiTradePlan:null,_aiAct:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get(FILL), s.who)); }
  el('log').children.length=0;
}
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const side=who=>who==='player'?G.player:G.enemy;
const hand=(who, ids)=>{ const s=side(who); s.hand=ids.map(id=>card(id, who)); return s.hand.slice(); };
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const seat=(u, pid)=>{ const p=card(pid, u.owner); u.pilotCard=p; u.pilot={ name:p.name, pAp:p.pAp||0, pHp:p.pHp||0 }; return p; };
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent)) && x.onclick); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<10){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) { const b=[...el('blockBtns').children].find(x=>x.onclick); if (!b) break; b.onclick(); drainTasks(); } } };
// A deck-look overlay (Premium Unit Assembly's chooser for the player): take its first button.
function closeOverlay(){ const ov=(doc.body.children||[]).find(n=>String(n.className||'').includes('modal-overlay')); if (!ov) return false;
  const walk=e=>{ for (const ch of e.children||[]){ if (ch.onclick){ ch.onclick(); return true; } if (ch._l && ch._l.click){ ch.fire('click'); return true; } if (walk(ch)) return true; } return false; };
  const r=walk(ov); drainTasks(); return r; }
const inTrash=(who, name)=>side(who).trash.some(c=>c.name===name);
const inHand=(who, name)=>side(who).hand.some(c=>c.name===name);
const alive=u=>(G.player.field.includes(u) || G.enemy.field.includes(u)) && u.hp>0;
const NAME=id=>A.CARD_BY_ID.get(id).name;
const played=id=>inTrash('enemy', NAME(id)) && !inHand('enemy', NAME(id));
const held=id=>inHand('enemy', NAME(id)) && !inTrash('enemy', NAME(id));
// The AI's main phase: its actions one after another (pre- or post-combat).
function main(post){ G._aiPostCombat = post ? G.turnSeq : null; let n=0; while (n<10 && A.aiMainStep()){ n++; drainTasks(); passAll(); } drainTasks(); return n; }
// The player attacks enemy Unit `t` (or the enemy player with t=null) through the board taps; the AI gets its action step.
function playerAttacks(atk, t){ G.turn='player'; G.selected=atk.uid; G.mode='attack-target'; if (t) A.fieldClick(t.uid); else A.attackDirect(); drainTasks(); passAll(); }
function aiAttacks(atk, t){ G.turn='enemy'; let done=false; A.resolveAiAttack(atk, ()=>{ done=true; }, t||null); drainTasks(); passAll(); return done; }
// The AI's attack step after its main phase (its plan), then its post-combat Commands.
function aiCombat(){ G.turn='enemy'; A.aiPostMain(); drainTasks(); passAll(); drainTasks(); }
const setTrash=(who, ids)=>{ side(who).trash=ids.map(i=>card(i, who)); A.refreshTrashStats(side(who)); return side(who).trash; };
const deckOf=(who, id, n)=>{ side(who).deck=[]; for (let i=0;i<(n||20);i++) side(who).deck.push(card(id, who)); };
const BASE_OF=d=>d.id.replace(/-p\d+$/,'');

// ---- 1. The inventory: the Command cards no AI path used to cast (base ids) ----
const NEWLY=['ST01-013','ST02-012','ST06-012','GD01-102','GD01-103','GD01-107','GD01-109','GD01-110','GD01-112','GD01-118','GD01-121',
  'GD02-100','GD02-103','GD02-104','GD02-108','GD02-110','GD02-111','GD02-112','GD02-116','GD02-117',
  'GD03-101','GD03-102','GD03-103','GD03-105','GD03-110','GD03-113','GD03-119','GD03-120','GD03-121',
  'GD04-101','GD04-102','GD04-103','GD04-105','GD04-106','GD04-107','GD04-115','GD04-116','GD04-119',
  'ST07-014','ST08-012','EB01-073','EB01-074','EB01-078','EB01-079','EB01-080','EB01-084',
  'GD05-104','GD05-107','GD05-111','GD05-112','GD05-114','GD05-115','GD05-118','GD05-120','GD05-121',
  'ST11-014','ST11-015','ST12-013','ST12-014','ST13-014','ST13-015','ST14-015','GD06-116','GD06-118'];
{ const cmds=[...new Set(A.GUNDAM_CARDS.filter(d=>d.type==='command').map(BASE_OF))];
  ok(`inventory: ${NEWLY.length} Command cards (of ${cmds.length}) had no AI path`, NEWLY.every(id=>cmds.includes(id)) && NEWLY.length===64, NEWLY.filter(id=>!cmds.includes(id)).join(',')); }

// ---- 2. Main phase, before combat ----
// Kai's Resolve — "Choose 1 friendly Unit. It recovers 3 HP."
{ fresh(); const u=stick('enemy',3,5); u.hp=2; hand('enemy',['ST01-013']); main();
  ok("Kai's Resolve: heals its damaged Unit (2 -> 5)", played('ST01-013') && u.hp===5 && G.enemy.resAvail===9, `hp ${u.hp} res ${G.enemy.resAvail}`); }
{ fresh(); stick('enemy',3,5); hand('enemy',['ST01-013']); main(); ok("Kai's Resolve: held with no damaged Unit", held('ST01-013')); }
// Dramatic Turnabout — "Choose 1 friendly damaged Unit. It recovers 2 HP. Then, draw 1."
{ fresh(); const u=stick('enemy',3,5); u.hp=2; hand('enemy',['GD02-100']); const d=G.enemy.deck.length; main();
  ok('Dramatic Turnabout: heals 2 and draws 1', played('GD02-100') && u.hp===4 && G.enemy.deck.length===d-1, `hp ${u.hp}`); }
{ fresh(); stick('enemy',3,5); hand('enemy',['GD02-100']); main(); ok('Dramatic Turnabout: held with no damaged Unit', held('GD02-100')); }
// Securing the Supply Line — "All friendly Units that are Lv.4 or lower recover 2 HP."
{ fresh(); const a=stick('enemy',2,5), b=stick('enemy',2,5); a.hp=3; b.hp=3; hand('enemy',['GD01-102']); main();
  ok('Securing the Supply Line: heals two damaged Units', played('GD01-102') && a.hp===5 && b.hp===5); }
{ fresh(); const a=stick('enemy',2,5); a.hp=4; hand('enemy',['GD01-102']); main(); ok('Securing the Supply Line: held for 1 HP of healing', held('GD01-102')); }
// <Breach> grants on an attacker the plan sends to destroy a Unit
{ fresh(); const u=stick('enemy',5,5,{lv:4}); stick('player',3,3,{rested:true}); hand('enemy',['ST02-012']); main();
  ok('Simultaneous Fire: <Breach 3> on the attacker that will destroy a Unit', played('ST02-012') && A.effBreach(u)>=3, A.effBreach(u));
  const sh=G.player.shields.length; aiCombat(); ok('Simultaneous Fire: the kill breaks a shield', G.player.shields.length<sh, `${sh}->${G.player.shields.length}`); }
{ fresh(); stick('enemy',5,5); hand('enemy',['ST02-012']); main(); ok('Simultaneous Fire: held with no enemy Unit to destroy', held('ST02-012')); }
{ fresh(); const u=stick('enemy',5,5,{linked:true}); stick('player',3,3,{rested:true}); hand('enemy',['ST08-012']); main();
  ok('Words for Hathaway: <Breach 1> on its attacking Link Unit', played('ST08-012') && A.effBreach(u)>=1); }
{ fresh(); stick('enemy',5,5); stick('player',3,3,{rested:true}); hand('enemy',['ST08-012']); main(); ok('Words for Hathaway: held without a Link Unit', held('ST08-012')); }
{ fresh(); const u=stick('enemy',5,5,{trait:'(MF)'}); stick('player',3,3,{rested:true}); hand('enemy',['GD05-112']); main();
  ok('Hoka Kyoten Juzetsujin: <Breach 3> on its (MF) attacker, then pairs from the trash', A.effBreach(u)>=3 && !!u.pilotCard && !inHand('enemy', NAME('GD05-112')) && !inTrash('enemy', NAME('GD05-112')), `${A.effBreach(u)} ${u.pilotCard&&u.pilotCard.name}`); }
{ fresh(); stick('enemy',5,5); stick('player',3,3,{rested:true}); hand('enemy',['GD05-112']); main(); ok('Hoka Kyoten Juzetsujin: held without an (MF) Unit', held('GD05-112')); }
// Active-attack grants: a ready attacker gets to destroy an active threat
{ fresh(); const u=stick('enemy',6,5,{lv:4}); const t=stick('player',4,4); hand('enemy',["GD01-110"]); main();
  ok("Rasid's Orders: granted to its ready Lv.4 attacker", played('GD01-110') && (u.activeAttackGrants||[]).length===1);
  aiCombat(); ok("Rasid's Orders: the attacker destroys the active 4-AP Unit", !alive(t) && alive(u)); }
{ fresh(); stick('enemy',6,5,{lv:3}); stick('player',4,4); hand('enemy',["GD01-110"]); main(); ok("Rasid's Orders: held with no Lv.4+ attacker", held('GD01-110')); }
{ fresh(); stick('enemy',8,8,{lv:4}); stick('player',7,4); hand('enemy',["GD01-110"]); main(); ok("Rasid's Orders: held when the active Unit has 7 AP", held('GD01-110')); }
// …and a favourable trade into a far more valuable active Unit
{ fresh(); const u=stick('enemy',5,2,{lv:4}); const t=stick('player',4,3); seat(t,'ST01-010'); t.hp=4; hand('enemy',["GD01-110"]); main();
  ok("Rasid's Orders: a favourable trade (its 5/2 for a paired 6/4)", played('GD01-110'));
  aiCombat(); ok("Rasid's Orders: the trade happens", !alive(t), `t ${t.hp}`); }
{ fresh(); const u=stick('enemy',5,5,{trait:'(G Generation)'}); const t=stick('player',4,4,{lv:7}); hand('enemy',['EB01-080']); main();
  ok('Sturm Faust: its (G Generation) attacker may attack the active Unit', played('EB01-080')); aiCombat(); ok('Sturm Faust: the active Unit is destroyed', !alive(t)); }
{ fresh(); stick('enemy',5,5); stick('player',4,4); hand('enemy',['EB01-080']); main(); ok('Sturm Faust: held without a (G Generation) Unit', held('EB01-080')); }
{ fresh(); stick('enemy',5,5,{trait:'(Clan)'}); const t=stick('player',4,4,{lv:4}); hand('enemy',['GD02-108']); main();
  ok('That One Looks A Lot Stronger?: on its (Clan) attacker vs an active Lv.4 Unit', played('GD02-108')); aiCombat(); ok('That One Looks A Lot Stronger?: destroyed', !alive(t)); }
{ fresh(); stick('enemy',5,5,{trait:'(Clan)'}); stick('player',4,4,{lv:5}); hand('enemy',['GD02-108']); main(); ok('That One Looks A Lot Stronger?: held vs a Lv.5 Unit', held('GD02-108')); }
{ fresh(); stick('enemy',5,5,{trait:'(Vulture)'}); const t=stick('player',4,4,{lv:3}); setTrash('enemy', Array(7).fill(FILL)); hand('enemy',['GD02-116']); main();
  ok('Comrades Come First: with 7 cards in the trash', played('GD02-116')); aiCombat(); ok('Comrades Come First: destroyed', !alive(t)); }
{ fresh(); stick('enemy',5,5,{trait:'(Vulture)'}); stick('player',4,4,{lv:3}); setTrash('enemy', Array(6).fill(FILL)); hand('enemy',['GD02-116']); main();
  ok('Comrades Come First: held with 6 cards in the trash (condition unmet)', held('GD02-116')); }
{ fresh(); stick('enemy',5,5); const t=stick('player',4,4); hand('enemy',['GD03-105']); main();
  ok('Bridge Crew: vs an active Unit with no Pilot', played('GD03-105')); aiCombat(); ok('Bridge Crew: destroyed', !alive(t)); }
{ fresh(); stick('enemy',6,5); const t=stick('player',3,3); seat(t,'ST01-010'); t.hp=4; hand('enemy',['GD03-105']); main(); ok('Bridge Crew: held vs a paired Unit', held('GD03-105')); }
{ fresh(); stick('enemy',5,5,{trait:'(Academy)'}); const t=stick('player',4,4); hand('enemy',['GD04-106']); main();
  ok('Indiscriminate Violence: (Academy) attacker vs an active 4-AP Unit', played('GD04-106')); aiCombat(); ok('Indiscriminate Violence: destroyed', !alive(t)); }
{ fresh(); stick('enemy',7,7,{trait:'(Academy)'}); stick('player',6,4); hand('enemy',['GD04-106']); main(); ok('Indiscriminate Violence: held vs a 6-AP Unit', held('GD04-106')); }
// Extreme Hatred — "Choose 2 of your active Units. Rest them. If you do, … Deal 3 damage" — summoning-sick Units pay for a kill
{ fresh(); const a=stick('enemy',2,2,{sick:true}), b=stick('enemy',2,2,{sick:true}); const t=stick('player',4,3); hand('enemy',['GD01-112']); main();
  ok('Extreme Hatred: rests 2 summoning-sick Units and destroys the 4/3', played('GD01-112') && a.rested && b.rested && !alive(t)); }
{ fresh(); const a=stick('enemy',3,3), b=stick('enemy',3,3); stick('player',4,3); hand('enemy',['GD01-112']); main();
  ok('Extreme Hatred: held when resting would cost two attacks', held('GD01-112') && !a.rested && !b.rested); }
// Eternal Road — rest a (G Generation) Unit; the player rests one of their active Units (they choose)
{ fresh(); stick('enemy',2,2,{sick:true,trait:'(G Generation)'}); stick('enemy',4,4); const bl=stick('player',2,3,{blocker:true}); hand('enemy',['EB01-074']); main();
  ok("Eternal Road: the player's only active Unit, a Blocker, is rested", played('EB01-074') && bl.rested); }
{ fresh(); stick('enemy',2,2,{sick:true,trait:'(G Generation)'}); stick('enemy',4,4); stick('player',2,3,{blocker:true}); stick('player',1,1); hand('enemy',['EB01-074']); main();
  ok('Eternal Road: held when the player can rest a 1/1 instead', held('EB01-074')); }
// Human Karma (main) — rest a summoning-sick Lv.5 Unit to deal 3 to a Lv.4 threat
{ fresh(); const s=stick('enemy',3,3,{sick:true,lv:5}); const t=stick('player',4,3,{lv:4}); hand('enemy',['GD03-113']); main();
  ok('Human Karma: rests its summoning-sick Unit, destroys the Lv.4 4/3', played('GD03-113') && s.rested && !alive(t)); }
{ fresh(); stick('enemy',6,6,{lv:5}); stick('player',4,3,{lv:4}); hand('enemy',['GD03-113']); main(); ok('Human Karma: held when the only Unit to rest is its 6/6 attacker', held('GD03-113')); }
// The Stubborn Cog — rest a summoning-sick (EF) Unit and the player's active Blocker
{ fresh(); const f=stick('enemy',1,1,{sick:true,trait:'(Earth Federation)'}); stick('enemy',4,4); const bl=stick('player',2,3,{blocker:true}); hand('enemy',['GD01-103']); main();
  ok('The Stubborn Cog: rests its idle (EF) Unit and the enemy Blocker', played('GD01-103') && f.rested && bl.rested); }
{ fresh(); stick('enemy',1,1,{sick:true,trait:'(Earth Federation)'}); stick('enemy',4,4); hand('enemy',['GD01-103']); main(); ok('The Stubborn Cog: held with no active enemy Unit', held('GD01-103')); }
// Backup — the attacker destroys the Lv.5-or-lower Unit it damages
{ fresh(); const u=stick('enemy',3,5); const t=stick('player',2,6,{lv:4,rested:true}); hand('enemy',['GD04-115']); main();
  ok('Backup: granted to the attacker that can now destroy a 2/6', played('GD04-115') && u.battleDestroyGrant && u.battleDestroyGrant.turnSeq===G.turnSeq);
  aiCombat(); ok('Backup: the 2/6 is destroyed by the battle damage', !alive(t)); }
{ fresh(); stick('enemy',3,5); stick('player',2,6,{lv:6,rested:true}); hand('enemy',['GD04-115']); main(); ok('Backup: held vs a Lv.6 Unit', held('GD04-115')); }
// Modification — "can't receive battle damage from enemy Units that are Lv.3 or lower" on an attacker that would trade
{ fresh(); const u=stick('enemy',4,3,{trait:'(G Generation)'}); const t=stick('player',3,3,{lv:3,rested:true}); hand('enemy',['EB01-079']); main();
  ok('Modification: guards its (G Generation) attacker', played('EB01-079')); aiCombat(); ok('Modification: the attacker destroys the Lv.3 Unit and survives', !alive(t) && alive(u), `u ${u.hp}`); }
{ fresh(); stick('enemy',4,3,{trait:'(G Generation)'}); stick('player',3,3,{lv:4,rested:true}); hand('enemy',['EB01-079']); main(); ok('Modification: held vs a Lv.4 Unit', held('EB01-079')); }
// Cyclone Punch / Incendiary Spark — AP-2 when it turns a trade into a clean kill (Cyclone Punch: or for its pair)
{ fresh(); const u=stick('enemy',3,3); const t=stick('player',3,3,{rested:true}); hand('enemy',['GD05-118']); main();
  ok('Incendiary Spark: AP-2 on the Unit its attacker then destroys', played('GD05-118') && A.effAp(t)===1); aiCombat(); ok('Incendiary Spark: destroyed, attacker survives', !alive(t) && alive(u)); }
{ fresh(); stick('enemy',3,3); hand('enemy',['GD05-118']); stick('player',1,1); main(); ok('Incendiary Spark: held when it changes nothing', held('GD05-118')); }
{ fresh(); const m=stick('enemy',3,3,{trait:'(MF)',sick:true}); stick('player',3,3); hand('enemy',['GD05-121']); main();
  ok('Cyclone Punch: played for its pair onto the unpaired (MF) Unit', !inHand('enemy', NAME('GD05-121')) && !inTrash('enemy', NAME('GD05-121')) && !!m.pilotCard && G.enemy.resAvail===9); }
{ fresh(); stick('enemy',3,3,{sick:true}); stick('player',3,3); hand('enemy',['GD05-121']); main(); ok('Cyclone Punch: held with no (MF) Unit and no kill', held('GD05-121')); }
// Awkward Approach — set the rested Base active; all enemy Units AP-1 lets an attacker survive a kill
{ fresh(); G.enemy.base=A.exBaseToken('enemy'); G.enemy.base.rested=true; const u=stick('enemy',3,3); const t=stick('player',3,3,{rested:true}); hand('enemy',['GD03-119']); main();
  ok('Awkward Approach: readies its Base, enemy Units AP-1', played('GD03-119') && !G.enemy.base.rested && A.effAp(t)===2); }
{ fresh(); G.enemy.base=A.exBaseToken('enemy'); stick('enemy',3,3); stick('player',3,3,{rested:true}); hand('enemy',['GD03-119']); main(); ok('Awkward Approach: held with an active Base', held('GD03-119')); }
// Immortal Colasour — arm the ready-on-kill when a (UN) Unit will destroy a Unit
{ fresh(); const u=stick('enemy',5,5,{trait:'(UN)'}); const t=stick('player',3,3,{rested:true}); hand('enemy',['GD03-120']); main();
  ok('Immortal Colasour: played before its (UN) Unit destroys one', played('GD03-120')); aiCombat(); ok('Immortal Colasour: the (UN) Unit is set active after the kill', !alive(t) && !u.rested); }
{ fresh(); stick('enemy',5,5); stick('player',3,3,{rested:true}); hand('enemy',['GD03-120']); main(); ok('Immortal Colasour: held without a (UN)/(Superpower Bloc) killer', held('GD03-120')); }

// ---- 3. Main phase: removal-like Commands ----
{ fresh(); const a=stick('player',3,3,{lv:4}), b=stick('player',4,3,{lv:3}); stick('enemy',5,5,{lv:6}); hand('enemy',['GD05-114']); main();
  ok('Widespread Annihilation: destroys the 2 Lv.4-or-lower enemy Units, keeps its Lv.6', played('GD05-114') && !alive(a) && !alive(b) && G.enemy.field.length===1); }
{ fresh(); stick('player',3,3,{lv:4}); stick('player',1,1,{lv:3}); stick('enemy',5,5,{lv:4}); stick('enemy',4,4,{lv:4}); hand('enemy',['GD05-114']); main(); ok('Widespread Annihilation: held when it costs more of its own', held('GD05-114')); }
{ fresh(); G.enemy.resMax=10; hand('enemy',['GD05-107']); const n=G.player.shields.length; main();
  ok('Interwoven Blessings: destroys the first 2 shield area cards', played('GD05-107') && G.player.shields.length===n-2, `${n}->${G.player.shields.length}`); }
{ fresh(); G.player.shields=[]; hand('enemy',['GD05-107']); main(); ok('Interwoven Blessings: held with nothing in the shield area', held('GD05-107')); }
{ fresh(); const t=stick('player',5,5); setTrash('enemy', Array(6).fill('ST05-004')); hand('enemy',['GD02-111']); main();
  ok('Decisive Last Resort: exiles 6 purple Units and destroys the 5/5', played('GD02-111') && !alive(t) && G.enemy.exile.length===6); }
{ fresh(); stick('player',5,5); setTrash('enemy', Array(5).fill('ST05-004')); hand('enemy',['GD02-111']); main(); ok('Decisive Last Resort: held with 5 purple Units in the trash', held('GD02-111')); }
{ fresh(); const bl=stick('player',3,3,{blocker:true}); stick('enemy',4,4); setTrash('enemy', Array(3).fill(FILL)); hand('enemy',['ST13-015']); main();
  ok('Operation to Intercept Solomon (main): exiles 3 Units, destroys the Blocker in its way', played('ST13-015') && !alive(bl) && G.enemy.exile.length===3); }
{ fresh(); stick('player',3,3,{blocker:true}); stick('enemy',4,4); setTrash('enemy', Array(2).fill(FILL)); hand('enemy',['ST13-015']); main(); ok('Operation to Intercept Solomon: held with 2 Unit cards in the trash', held('ST13-015')); }
{ fresh(); const t=stick('player',2,1,{lv:4}); seat(t,'ST01-011'); t.hp=2; hand('enemy',['GD03-110']); main();
  ok('Eliminate Target (main): its Pilot was all that kept the Unit alive', played('GD03-110') && !alive(t) && inTrash('player', NAME('ST01-011'))); }
{ fresh(); stick('player',5,5,{lv:4}); hand('enemy',['GD03-110']); main(); ok('Eliminate Target: held with no enemy Pilot', held('GD03-110')); }
{ fresh(); stick('player',1,1); stick('player',1,1); const t=stick('player',3,2,{rested:true}); hand('enemy',['GD03-103']); main();
  ok('Field Directive: 3 enemy Units — 2 damage destroys the rested 3/2', played('GD03-103') && !alive(t)); }
{ fresh(); stick('player',1,1); stick('player',3,2,{rested:true}); hand('enemy',['GD03-103']); main(); ok('Field Directive: held with 2 enemy Units', held('GD03-103')); }
{ fresh(); stick('enemy',6,6,{firstStrike:true}); const a=stick('player',2,2), b=stick('player',3,3); hand('enemy',['ST12-013']); main(); passAll();
  ok('The Final Victor: its 6/6 <First Strike> duels — the player loses a Unit whichever it picks', played('ST12-013') && (!alive(a) || !alive(b))); }
{ fresh(); stick('enemy',4,4); stick('player',7,7); stick('player',1,1); hand('enemy',['ST12-013']); main(); ok('The Final Victor: held when the player can answer with a 7/7', held('ST12-013')); }

// ---- 4. Main phase: card advantage with spare resources ----
const CLOSE='ST03-013';
const PILOT='ST01-010';   // a Pilot card: it stays in hand with no Unit to pair
const has=(who, name)=>inHand(who, name) || side(who).field.some(u=>u.name===name);   // an 【Action】 Command (cost 2) the AI keeps resources for on the player's turn
for (const [id, label, chk] of [
  ['GD01-118','Overflowing Affection (draw 2, discard 1)', n=>G.enemy.hand.length===n+1],
  ['GD02-117','A New Sign (draw 3, discard 2)', n=>G.enemy.hand.length===n+1],
  ['GD03-101','A Healthy Curiosity (draw 1)', n=>G.enemy.hand.length===n+1],
]){
  { fresh(); deckOf('enemy', PILOT); hand('enemy',[id]); const n=G.enemy.hand.length-1; main(); ok(`${label}: played with spare resources`, played(id) && chk(n), G.enemy.hand.length); }
  { fresh(); G.enemy.resAvail=2+A.effectiveCost(G.enemy, card(id,'enemy'))-1; hand('enemy',[id, CLOSE]); main(); ok(`${label}: held — the resources are kept for its 【Action】 Command`, held(id)); }
}
{ fresh(); deckOf('enemy', PILOT); hand('enemy',['GD05-111', PILOT]); main(); ok('Airframe Seizure: discards 1, draws 2', played('GD05-111') && G.enemy.hand.length===2, G.enemy.hand.length); }
{ fresh(); hand('enemy',['GD05-111']); main(); ok('Airframe Seizure: held with nothing to discard', held('GD05-111')); }
{ fresh(); for (let i=0;i<3;i++){ stick('enemy',1,1,{rested:true}); stick('player',1,1,{rested:true}); } hand('enemy',['EB01-073']); const d=G.enemy.deck.length; main();
  ok('Character Requests: 6 rested Units in play — draws 2', played('EB01-073') && G.enemy.deck.length===d-2); }
{ fresh(); for (let i=0;i<5;i++) stick('player',1,1,{rested:true}); hand('enemy',['EB01-073']); main(); ok('Character Requests: held with 5 rested Units', held('EB01-073')); }
for (const [id, unitId, label] of [['ST06-012','ST06-005','Schoolgirl and Smuggler'],['GD01-109','ST02-004','The Path to Victory or Defeat'],
                                   ['GD04-105','ST01-010','Encounter'],['ST07-014','GD03-030','Tactical Visionary']]){
  { fresh(); deckOf('enemy', unitId); hand('enemy',[id]); main(); ok(`${label}: digs a ${NAME(unitId)} from a deck full of them`, played(id) && has('enemy', NAME(unitId))); }
  { fresh(); hand('enemy',[id]); main(); ok(`${label}: held when its deck has nothing it can take`, held(id)); }
}
{ fresh(); hand('enemy',['GD02-104']); main(); ok('Turning Point of History: played with spare resources', played('GD02-104')); }
{ fresh(); G.enemy.resAvail=2; hand('enemy',['GD02-104', CLOSE]); main(); ok('Turning Point of History: held for its 【Action】 Command', held('GD02-104')); }
{ fresh(); deckOf('enemy','ST01-001'); hand('enemy',['EB01-078']); main(); closeOverlay();
  ok('Premium Unit Assembly: its deck is all Units — it adds the top one', played('EB01-078') && has('enemy', NAME('ST01-001'))); }
{ fresh(); deckOf('enemy','ST01-012'); hand('enemy',['EB01-078']); main(); ok('Premium Unit Assembly: held when its deck has no Units', held('EB01-078')); }
{ fresh(); setTrash('enemy',['ST05-010']); hand('enemy',['GD02-112']); main(); ok('Momentary Respite: takes back the purple Pilot', played('GD02-112') && inHand('enemy', NAME('ST05-010'))); }
{ fresh(); setTrash('enemy',[FILL]); hand('enemy',['GD02-112']); main(); ok('Momentary Respite: held with no purple Pilot in the trash', held('GD02-112')); }
{ fresh(); setTrash('enemy',['ST03-010']); hand('enemy',['GD05-115']); main(); ok('Newtype Labs Director: takes back the (Neo Zeon) Pilot', played('GD05-115') && inHand('enemy', NAME('ST03-010'))); }
{ fresh(); setTrash('enemy',['ST05-010']); hand('enemy',['GD05-115']); main(); ok('Newtype Labs Director: held with no (Neo Zeon) Pilot', held('GD05-115')); }
{ fresh(); G.enemy.resMax=5; G.enemy.resAvail=5; hand('enemy',['GD01-107','GD01-024']); const r=G.enemy.resMax; main();
  ok('First Contact: ramps toward the Lv.8 card in hand', played('GD01-107') && G.enemy.resMax===r+1); }
{ fresh(); G.enemy.resMax=5; G.enemy.resAvail=5; hand('enemy',['GD01-107']); main(); ok('First Contact: held with nothing that needs a higher Lv.', held('GD01-107')); }
{ fresh(); G.enemy.resMax=5; G.enemy.resAvail=5; hand('enemy',['ST14-015','GD01-024']); const r=G.enemy.resMax; main();
  ok('Battlefield Emotions: places a Resource and sets one active', played('ST14-015') && G.enemy.resMax===r+1 && G.enemy.resAvail===2, `${G.enemy.resMax} ${G.enemy.resAvail}`); }
{ fresh(); G.enemy.resMax=5; G.enemy.resAvail=5; hand('enemy',['ST14-015']); main(); ok('Battlefield Emotions: held with nothing that needs a higher Lv.', held('ST14-015')); }
{ fresh(); stick('enemy',2,2,{trait:'(AGE System)'}); hand('enemy',['GD02-103']); main(); ok('AGE Device: places an EX Resource (its (AGE System) Unit in play)', played('GD02-103') && G.enemy.ex===1); }
{ fresh(); hand('enemy',['GD02-103']); main(); ok('AGE Device: held without an (AGE System) Unit', held('GD02-103')); }
{ fresh(); deckOf('enemy','GD04-056'); const t=stick('player',3,2); hand('enemy',['GD04-116']); main();
  ok('Reliable Big Brother: a (Minerva Squad) deck — 2 damage destroys the 3/2', played('GD04-116') && !alive(t)); }
{ fresh(); stick('player',3,2); hand('enemy',['GD04-116']); main(); ok('Reliable Big Brother: held with no (Minerva Squad) cards in its deck', held('GD04-116')); }
// Reanimation into a free slot
{ fresh(); setTrash('enemy',['ST02-004']); hand('enemy',['GD02-110']); main();
  ok('Awakened Power: pays to deploy the 4/3 from its trash', played('GD02-110') && G.enemy.field.some(u=>u.name===NAME('ST02-004')) && G.enemy.resAvail===10-2-2, G.enemy.resAvail); }
{ fresh(); setTrash('enemy',[FILL]); hand('enemy',['GD02-110']); main(); ok('Awakened Power: held for a 2/2', held('GD02-110')); }
{ fresh(); setTrash('enemy',['ST11-001']); hand('enemy',['ST11-015']); main(); ok('A Twinkle from the Abyss: deploys the (Marine) Unit rested', played('ST11-015') && G.enemy.field.some(u=>u.name===NAME('ST11-001') && u.rested)); }
{ fresh(); setTrash('enemy',['ST11-001']); for (let i=0;i<6;i++) stick('enemy',1,1); hand('enemy',['ST11-015']); main(); ok('A Twinkle from the Abyss: held with a full battle area', held('ST11-015')); }
{ fresh(); setTrash('enemy',['GD06-052']); hand('enemy',['GD06-116']); main(); ok('Afterglow of Zeon: deploys the cost-4 (Zeon) Unit', played('GD06-116') && G.enemy.field.some(u=>u.name===NAME('GD06-052'))); }
{ fresh(); setTrash('enemy',['ST12-007']); hand('enemy',['GD06-116']); main(); ok('Afterglow of Zeon: held for a cost-2 Unit', held('GD06-116')); }

// ---- 5. Main phase, after combat ----
{ fresh(); const b=stick('enemy',2,4,{blocker:true,rested:true}); stick('player',3,3); hand('enemy',['GD01-121']); main(true);
  ok('Midair Modifications: after combat, its Blocker stands up for the player\'s turn', played('GD01-121') && !b.rested); }
{ fresh(); stick('enemy',2,4,{blocker:true,rested:true}); stick('player',3,3); hand('enemy',['GD01-121']); main(false); ok('Midair Modifications: held before combat', held('GD01-121')); }
{ fresh(); const b=stick('enemy',2,4,{blocker:true,rested:true}); stick('player',3,3); hand('enemy',['EB01-084']); main(true); ok('30cm Cannon: after combat, its Blocker stands up', played('EB01-084') && !b.rested); }
{ fresh(); stick('enemy',2,4,{rested:true}); stick('player',3,3); hand('enemy',['EB01-084']); main(true); ok('30cm Cannon: held with no rested Blocker', held('EB01-084')); }
{ fresh(); const u=stick('enemy',3,6); u.hp=2; hand('enemy',['GD04-103']); main(true); ok('Spiritual Support: <Repair 2> on its damaged Unit after combat', played('GD04-103') && A.effRepair(u)>=2); }
{ fresh(); stick('enemy',3,6); hand('enemy',['GD04-103']); main(true); ok('Spiritual Support: held with no damaged Unit', held('GD04-103')); }
{ fresh(); const t=stick('player',5,5,{lv:5,rested:true}); hand('enemy',['GD04-102']); main(true); ok('Moment of Rest: the rested 5/5 stays rested next turn', played('GD04-102') && t.stunned); }
{ fresh(); stick('player',5,5,{lv:5,rested:true}); stick('enemy',6,6); hand('enemy',['GD04-102']); main(false); ok('Moment of Rest: held before its attacks', held('GD04-102')); }
{ fresh(); stick('enemy',1,1,{token:true}); deckOf('enemy','ST01-001'); hand('enemy',['ST13-014']); main(true);
  ok('Final Duty: its 1/1 token for a Lv.4 Unit from the top 4', played('ST13-014') && G.enemy.field.some(u=>u.name===NAME('ST01-001'))); }
{ fresh(); stick('enemy',1,1,{token:true}); deckOf('enemy','GD01-024'); hand('enemy',['ST13-014']); main(true); ok('Final Duty: held when no Lv.4-or-lower Unit can come', held('ST13-014')); }
// …and the normal AI's turn end runs them: aiPostMain → attacks → post-combat Commands → end of turn
{ fresh(); const b=stick('enemy',4,4,{blocker:true}); const t=stick('player',3,2,{rested:true}); stick('player',2,2); hand('enemy',['GD01-121']); aiCombat();
  ok('Midair Modifications (whole turn): its Blocker attacks, then is set active before the turn ends', !alive(t) && played('GD01-121') && !b.rested && G.turn==='player', `${G.turn} ${b.rested}`); }

// ---- 6. Action steps ----
// Human Karma on the player's turn: an idle Unit rests to destroy the attacker before it destroys the AI's Unit
{ fresh('player'); stick('enemy',1,1,{lv:5}); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',3,3,{lv:4}); hand('enemy',['GD03-113']);
  playerAttacks(atk, mine); ok('Human Karma (action): 3 damage destroys the attacker, its Unit survives', played('GD03-113') && !alive(atk) && alive(mine)); }
{ fresh('player'); stick('enemy',1,1,{lv:3}); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',3,3,{lv:4}); hand('enemy',['GD03-113']);
  playerAttacks(atk, mine); ok('Human Karma (action): held — its only active Unit is Lv.3 (the Lv.4 attacker can\'t be chosen)', held('GD03-113')); }
// Operation to Intercept Solomon in an action step
{ fresh('player'); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',3,3); setTrash('enemy', Array(3).fill(FILL)); hand('enemy',['ST13-015']);
  playerAttacks(atk, mine); ok('Operation to Intercept Solomon (action): destroys the attacker', played('ST13-015') && !alive(atk) && alive(mine)); }
{ fresh('player'); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',3,3); setTrash('enemy', Array(2).fill(FILL)); hand('enemy',['ST13-015']);
  playerAttacks(atk, mine); ok('Operation to Intercept Solomon (action): held with 2 Unit cards in the trash', held('ST13-015')); }
// Eliminate Target in an action step: the attacker loses its Pilot and dies
{ fresh('player'); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',3,1,{lv:4}); seat(atk,'ST01-011'); atk.hp=2; hand('enemy',['GD03-110']);
  playerAttacks(atk, mine); ok('Eliminate Target (action): the attacker dies with its Pilot', played('GD03-110') && !alive(atk) && alive(mine)); }
{ fresh('player'); const mine=stick('enemy',2,2,{rested:true}); const atk=stick('player',1,1,{lv:4}); hand('enemy',['GD03-110']);
  playerAttacks(atk, mine); ok('Eliminate Target (action): held vs an unpaired attacker', held('GD03-110')); }
// Unheralded Attack — rest an enemy Blocker (3 or less HP) that hasn't attacked yet
{ fresh('player'); G.enemy.base=A.exBaseToken('enemy'); const atk=stick('player',1,1); const bl=stick('player',2,3,{blocker:true}); stick('enemy',3,3); hand('enemy',['GD03-121']);
  playerAttacks(atk, null); ok('Unheralded Attack: rests the enemy Blocker still to act', played('GD03-121') && bl.rested); }
{ fresh('player'); const atk=stick('player',1,1); stick('player',2,3,{blocker:true}); stick('enemy',3,3); hand('enemy',['GD03-121']);
  playerAttacks(atk, null); ok('Unheralded Attack: held with no friendly Base to rest (Q253: both must be choosable)', held('GD03-121')); }
{ fresh('player'); G.enemy.base=A.exBaseToken('enemy'); const atk=stick('player',1,1); stick('player',2,4,{blocker:true}); stick('enemy',3,3); hand('enemy',['GD03-121']);
  playerAttacks(atk, null); ok('Unheralded Attack: held with no enemy Unit of 3 or less HP to rest', held('GD03-121')); }
// Infinite Variations — AP-2 on the attacker (one white Blocker in play)
{ fresh('player'); stick('enemy',1,1,{color:'White',blocker:true}); const mine=stick('enemy',2,3,{rested:true}); const atk=stick('player',3,3); hand('enemy',['GD06-118']);
  playerAttacks(atk, mine); ok('Infinite Variations: AP-2 on the attacker saves its Unit', played('GD06-118') && alive(mine)); }
{ fresh('player'); const mine=stick('enemy',2,3,{rested:true}); const atk=stick('player',3,3); hand('enemy',['GD06-118']);
  playerAttacks(atk, mine); ok('Infinite Variations: held with no white Blocker (it may choose none)', held('GD06-118')); }
// Kindhearted — speculative protection + a draw with resources that ready again
{ fresh('player'); stick('enemy',4,4,{rested:true}); hand('player',[FILL,FILL]); const atk=stick('player',1,1); hand('enemy',['GD04-101']); const d=G.enemy.deck.length;
  playerAttacks(atk, null); ok('Kindhearted: on the player\'s turn — its Units are guarded, it draws 1', played('GD04-101') && G.enemy.noEnemyEffDestroyTurn===G.turnSeq && G.enemy.deck.length===d-1); }
{ fresh('player'); stick('enemy',1,1,{rested:true}); const atk=stick('player',1,1); hand('enemy',['GD04-101']); playerAttacks(atk, null); ok('Kindhearted: held with no Unit worth guarding', held('GD04-101')); }
// Fighting Alone — the player's Unit can deal lethal effect damage to the AI's Newtype-paired Unit
{ fresh('player'); const u=stick('enemy',4,3,{rested:true}); seat(u,'ST01-010'); stick('player',2,2,{effect:'【Activate･Action】①：Choose 1 enemy Unit. Deal 3 damage to it.'}); const atk=stick('player',1,1);
  hand('enemy',['GD04-119']); playerAttacks(atk, null); ok('Fighting Alone: guards its (Newtype)-paired Unit from effect damage', played('GD04-119') && u.noUnitEffDmgTurn===G.turnSeq); }
{ fresh('player'); const u=stick('enemy',4,3,{rested:true}); seat(u,'ST01-010'); const atk=stick('player',1,1); hand('enemy',['GD04-119']); playerAttacks(atk, null);
  ok('Fighting Alone: held with no enemy effect damage in sight', held('GD04-119')); }
// Destined Battle — its sturdy rested Unit soaks the attacks still to come (2 shields left)
{ fresh('player'); G.enemy.shields.length=2; const L=stick('enemy',1,8,{rested:true}); const atk=stick('player',1,1); const y=stick('player',3,3); hand('enemy',['GD04-107']);
  playerAttacks(atk, null); ok('Destined Battle: the 1/8 must be attacked by the rest of the turn', played('GD04-107') && L.lureTurn===G.turnSeq);
  const sh=G.enemy.shields.length; G.selected=y.uid; G.mode='attack-target'; A.attackDirect(); drainTasks(); passAll();
  ok('Destined Battle: the next direct attack is refused while the lure stands', G.enemy.shields.length===sh && !y.rested, `${sh}->${G.enemy.shields.length}`); }
{ fresh('player'); const L=stick('enemy',1,2,{rested:true}); const atk=stick('player',1,1); stick('player',3,3); hand('enemy',['GD04-107']); playerAttacks(atk, null);
  ok('Destined Battle: held when the lure would just die (6 shields)', held('GD04-107') && !L.lureTurn); }
// The Orca of Red Sea — its rested (Marine) Unit a Unit still to attack would destroy
{ fresh('player'); const m=stick('enemy',2,2,{rested:true,trait:'(Marine)'}); const atk=stick('player',1,1); stick('player',3,3); hand('enemy',['ST11-014']);
  playerAttacks(atk, null); ok('The Orca of Red Sea: its rested (Marine) Unit can\'t be chosen as an attack target', played('ST11-014') && m.noTargetTurn===G.turnSeq); }
{ fresh('player'); stick('enemy',2,2,{rested:true,trait:'(Marine)'}); const atk=stick('player',1,1); hand('enemy',['ST11-014']); playerAttacks(atk, null);
  ok('The Orca of Red Sea: held when no enemy Unit is left to attack', held('ST11-014')); }
// 30cm Cannon in the player's action step: a rested Blocker stands up for the attacks still to come
{ fresh('player'); const b=stick('enemy',2,4,{blocker:true,rested:true}); const atk=stick('player',1,1); stick('player',3,3); hand('enemy',['EB01-084']);
  playerAttacks(atk, null); ok('30cm Cannon (action): its rested Blocker is set active', played('EB01-084') && !b.rested); }
{ fresh('player'); stick('enemy',2,4,{blocker:true,rested:true}); const atk=stick('player',1,1); hand('enemy',['EB01-084']); playerAttacks(atk, null);
  ok('30cm Cannon (action): held with no enemy attack left', held('EB01-084')); }
// Privileged Position — its (Titans) Link Unit survives the battle and ends active
{ fresh('player'); const u=stick('enemy',2,6,{rested:true,linked:true,trait:'(Titans)'}); const atk=stick('player',2,2); hand('enemy',['GD03-102']);
  playerAttacks(atk, u); ok('Privileged Position: its (Titans) Link Unit battling the attacker is set active', played('GD03-102') && !u.rested && alive(u)); }
{ fresh('player'); const u=stick('enemy',2,2,{rested:true,linked:true,trait:'(Titans)'}); const atk=stick('player',6,6); hand('enemy',['GD03-102']); playerAttacks(atk, u);
  ok('Privileged Position: held when its Unit dies in the battle anyway', held('GD03-102')); }
// At the Risk of One's Life — its (Shrike Team) Link Unit is about to die: a (League Militaire) Unit stands up
{ fresh('player'); const u=stick('enemy',1,2,{rested:true,linked:true,trait:'(Shrike Team)'}); const lm=stick('enemy',3,3,{rested:true,trait:'(League Militaire)'}); const atk=stick('player',4,4); hand('enemy',['GD05-104']);
  playerAttacks(atk, u); ok("At the Risk of One's Life: its Unit dies and the (League Militaire) Unit is set active", played('GD05-104') && !alive(u) && !lm.rested); }
{ fresh('player'); const u=stick('enemy',1,6,{rested:true,linked:true,trait:'(Shrike Team)'}); stick('enemy',3,3,{rested:true,trait:'(League Militaire)'}); const atk=stick('player',2,2); hand('enemy',['GD05-104']);
  playerAttacks(atk, u); ok("At the Risk of One's Life: held when its Unit survives", held('GD05-104')); }
// Wise Leader's Pride — its attacker destroys the Unit it battles; a 2-AP enemy Unit goes too
{ fresh(); const u=stick('enemy',5,5); const t=stick('player',3,3,{rested:true}); const b=stick('player',2,4); hand('enemy',['ST12-014']);
  aiAttacks(u, t); ok("Wise Leader's Pride: the battle kill destroys the 2-AP Unit too", played('ST12-014') && !alive(t) && !alive(b)); }
{ fresh(); const u=stick('enemy',5,5); const t=stick('player',3,3,{rested:true}); hand('enemy',['ST12-014']); aiAttacks(u, t);
  ok("Wise Leader's Pride: held with no other 2-AP enemy Unit", held('ST12-014')); }
// Shining Finger — <First Strike> alone (no enemy Unit to rest) turns its Shining Gundam's trade into a kill
{ fresh(); const u=stick('enemy',3,2,{name:'Shining Gundam'}); const t=stick('player',2,3,{rested:true}); hand('enemy',['GD05-120']);
  aiAttacks(u, t); ok('Shining Finger: <First Strike> for its attacking Shining Gundam — destroys and survives', played('GD05-120') && !alive(t) && alive(u)); }
{ fresh(); const u=stick('enemy',3,4,{name:'Shining Gundam'}); const t=stick('player',1,3,{rested:true}); hand('enemy',['GD05-120']); aiAttacks(u, t);
  ok('Shining Finger: held when the battle is already won', held('GD05-120') && !alive(t)); }

// ---- 7. Rules: costs, timing, flags ----
// 【Main】-only Commands aren't cast in an action step; an 【Action】-only one isn't cast in the main phase
{ fresh('player'); const u=stick('enemy',3,5); u.hp=2; const atk=stick('player',1,1); hand('enemy',['ST01-013']); playerAttacks(atk, null);
  ok("timing: Kai's Resolve (【Main】) isn't played in the player's action step", held('ST01-013')); }
{ fresh(); G.enemy.shields.length=2; stick('enemy',1,8,{rested:true}); stick('player',3,3); hand('enemy',['GD04-107']); main(true); ok('timing: Destined Battle (【Action】) isn\'t played in the main phase', held('GD04-107')); }
// Lv. requirement: Rasid's Orders is Lv.3 — at Lv.2 it waits
{ fresh(); G.enemy.resMax=2; G.enemy.resAvail=2; stick('enemy',6,5,{lv:4}); stick('player',4,4); hand('enemy',['GD01-110']); main(); ok("Lv.: Rasid's Orders held at Lv.2", held('GD01-110')); }
// EX Resources aren't spent on a utility play
{ fresh(); G.enemy.resAvail=1; G.enemy.ex=1; hand('enemy',['GD01-118']); main(); ok('EX: Overflowing Affection is not paid with an EX Resource', held('GD01-118') && G.enemy.ex===1); }
// commandPlayed watchers see the AI's play: "(T) Command activated this turn"
{ fresh(); const u=stick('enemy',3,5); u.hp=2; hand('enemy',['ST01-013']); main();
  ok('flags: the play is recorded for "activated a (T) Command this turn"', G.enemy.cmdTraits && G.enemy.cmdTraits.turnSeq===G.turnSeq && G.enemy.cmdTraits.set.has('white base team')); }
// The hard AI keeps the resources its held deploys need before combat
{ fresh(); const lvlSave=null; G.enemy.resAvail=3; hand('enemy',['GD01-118','ST01-001']); G._aiPostDeploy=false;
  const res0=G.enemy.resAvail; main(); ok('normal AI: deploys first, then has no spare resources for Overflowing Affection', G.enemy.field.some(u=>u.name===NAME('ST01-001')) && held('GD01-118') && G.enemy.resAvail===0, `${res0}->${G.enemy.resAvail}`); }

console.log('\n== audit3 AI: the Commands the AI never played ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  FAIL '+f));
console.log('Errors:', fail.length + (H.ERRORS ? H.ERRORS.length : 0));
if (H.ERRORS && H.ERRORS.length) H.ERRORS.slice(0,5).forEach(e=>console.log('  ERR', e.ctx, e.msg, e.stack));
