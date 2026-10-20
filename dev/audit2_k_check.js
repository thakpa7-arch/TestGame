// Audit 2, group k — conditions and trigger gates: 【When Paired･X Pilot】 requirements, "other" Units from a Pilot's text,
// "N or more (other) rested Units", "<A> and <B>" with amounts, "If you deploy this Unit from your trash", 【Burst】 conditions,
// "destroyed with battle damage", paired battle kills this turn. Each card is replayed with real cards: on the player's side
// through the real UI paths (attack declaration, playing a Pilot from hand, the target prompts) and on the AI's side.
const H=require('./harness.js'); const {A}=H; const drainTasks=require('./burst_yes.js')(H); const G=A.G;   // drainTasks answers the 【Burst】 yes/no with yes
const doc=global.document; const el=id=>doc.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
let UID=880000;
function fresh(turn){
  drainTasks(); el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  for (const n of [...(doc.body.children||[])]) if (String(n.className||'').includes('modal-overlay')) n.remove();
  Object.assign(G,{turn:turn||'player',turnNumber:4,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,modalQueue:[],player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'Audit',enemyDeckName:'AI'});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=5; s.hand=[];
    s.deck=[]; for(let i=0;i<20;i++) s.deck.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'), s.who)); }
}
const side=w=>w==='player'?G.player:G.enemy;
const card=(id, who)=>A.makeCard(A.CARD_BY_ID.get(id), who);
const put=(id, who, extra)=>{ const u=card(id, who); u.sick=false; Object.assign(u, extra||{}); side(who).field.push(u); return u; };
const pair=(u, id)=>{ const p=card(id, u.owner); A.attachPilot(u, p); drainTasks(); return p; };
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Dummy ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:3, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0, pilot:null, pilotCard:null, linked:false, blocker:false,
    firstStrike:false, highManeuver:false, breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{}); side(who).field.push(c); return c;
}
const strip=s=>String(s||'').replace(/<[^>]+>/g,'');
const logs=()=>(el('log').children||[]).map(c=>c.innerHTML||'');
const modal=()=>el('blockModal').classList.contains('show') ? { msg:strip(el('blockMsg').innerHTML), btns:[...el('blockBtns').children].map(b=>strip(b.innerHTML||b.textContent)) } : null;
function press(re){ drainTasks(); const m=modal(); if(!m) return false; const b=[...el('blockBtns').children].find(x=>re.test(strip(x.innerHTML||x.textContent))); if(!b) return false; b.onclick(); drainTasks(); return true; }
const passAll=()=>{ let g=0; while (modal() && g++<8){ const m=modal(); if (/intercept/i.test(m.msg)) press(/Don't/); else if (!press(/Pass/)) break; } };
function overlay(){ const m=(doc.body.children||[]).filter(n=>String(n.className||'').includes('modal-overlay')).pop(); if(!m) return null;
  const tiles=[]; const walk=n=>{ if (n.onclick && n.style && /height:182px/.test(n.style.cssText||'')) tiles.push(n); for (const c of n.children||[]) walk(c); }; walk(m);
  return { tiles, pick(i){ const t=tiles[i]; if(t){ t.onclick(); drainTasks(); } return !!t; } }; }
const playMain=(id)=>{ const c=card(id,'player'); G.player.hand.push(c); A.playFromHand(c.uid, true); drainTasks();
  if (modal() && /Play .* as:/.test(modal().msg)) press(/Command effect/); return c; };
// The player plays Pilot `pid` from hand onto `u` (the real pairing path).
const playPilot=(u, pid)=>{ const p=card(pid,'player'); G.player.hand.push(p); A.playFromHand(p.uid); drainTasks(); if (G.mode!=='idle' && !u.pilot){ A.fieldClick(u.uid); drainTasks(); } return p; };
// The player declares an attack with `atk` on `def` (null: the enemy player).
const attack=(atk, def)=>{ A.fieldClick(atk.uid); drainTasks(); if (G.selected!==atk.uid){ G.selected=atk.uid; G.mode='attack-target'; } if (def) A.fieldClick(def.uid); else A.attackDirect(); drainTasks(); };
const aiAttack=(atk, target)=>{ G.aiForceFace=!target; A.resolveAiAttack(atk, ()=>{}, target||null); drainTasks(); G.aiForceFace=false; passAll(); };
const pilots=[...A.CARD_BY_ID.values()].filter(d=>d.type==='pilot' && !/-p\d+$/.test(d.id));
// A Pilot meeting `pred` with no 【…】 ability besides its 【Burst】 (so its own text never muddies a test).
const quiet=d=>!/【(?!\s*Burst)/.test(A.plain(d.effect||'').replace(/【\s*Burst\s*】[^【]*/,''));
const pilotWhere=(pred)=>{ const d=pilots.find(p=>pred(p) && quiet(p)) || pilots.find(pred); if(!d) throw new Error('no pilot'); return d.id; };
const hasT=(d,t)=>(d.trait||'').toLowerCase().includes('('+t+')');
const colorIs=(d,c)=>String(d.color||'').toLowerCase()===c;
// A Pilot that links with Unit card `id` (its [Link Condition]).
const linkPilot=(id)=>{ const u=A.makeCard(A.CARD_BY_ID.get(id),'player'); const d=pilots.find(p=>quiet(p) && A.linkMatches(u, A.makeCard(p,'player'))) || pilots.find(p=>A.linkMatches(u, A.makeCard(p,'player'))); if(!d) throw new Error('no link pilot for '+id); return d.id; };

// ======== 【When Paired･X Pilot】 requirements (parseTrigger qualifier → pairedPilotReq) ========
// Aile Strike Gundam ST04-001 — 【When Paired･Lv.4 or Higher Pilot】Choose 1 enemy Unit with 4 or less HP. Return it to its owner's hand.
{ const lo='ST03-011', hi=pilotWhere(p=>p.lv>=4 && !/kira/i.test(p.name));
  fresh('enemy'); let w=put('ST04-001','enemy'); let t=stick('player',1,4); pair(w, lo);
  ok('Aile Strike Gundam (AI): a Lv.3 Pilot does not bounce', G.player.field.includes(t));
  fresh('enemy'); w=put('ST04-001','enemy'); t=stick('player',1,4); pair(w, hi);
  ok('Aile Strike Gundam (AI): a Lv.4+ Pilot bounces the HP4 Unit', !G.player.field.includes(t) && G.player.hand.some(c=>c.uid===t.uid||c===t));
  fresh('player'); w=put('ST04-001','player'); t=stick('enemy',1,4); stick('enemy',1,3); playPilot(w, lo);
  ok('Aile Strike Gundam (player, Pilot from hand): a Lv.3 Pilot opens no prompt', !!w.pilot && G.mode==='idle' && G.enemy.field.includes(t), G.mode);
  fresh('player'); w=put('ST04-001','player'); t=stick('enemy',1,4); stick('enemy',1,3); playPilot(w, hi);
  const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(t.uid); drainTasks(); }
  ok('Aile Strike Gundam (player): a Lv.4+ Pilot lets you choose the Unit to bounce', asked && !G.enemy.field.includes(t), G.mode); }
// Gundam Sandrock Custom (EW) GD06-067 — 【When Paired･Lv.4 or Higher Pilot】Choose 1 rested enemy Unit with 3 or less HP. It won't be set as active…
{ const lo=pilotWhere(p=>p.lv===3), hi=pilotWhere(p=>p.lv>=4);
  fresh('enemy'); let u=put('GD06-067','enemy'); let t=stick('player',1,3,{rested:true}); pair(u, lo);
  ok('Gundam Sandrock Custom (EW) (AI): no stun with a Lv.3 Pilot', !t.stunned);
  fresh('enemy'); u=put('GD06-067','enemy'); t=stick('player',1,3,{rested:true}); pair(u, hi);
  ok('Gundam Sandrock Custom (EW) (AI): stun with a Lv.4+ Pilot', !!t.stunned);
  fresh('player'); u=put('GD06-067','player'); t=stick('enemy',1,3,{rested:true}); playPilot(u, lo);
  ok('Gundam Sandrock Custom (EW) (player): no prompt / stun with a Lv.3 Pilot', G.mode==='idle' && !t.stunned, G.mode); }
// Kshatriya GD01-044 — 【When Paired･(Cyber-Newtype)/(Newtype) Pilot】Choose 1 to 2 enemy Units. Deal 1 damage to them.
{ const cnt=pilotWhere(p=>hasT(p,'cyber-newtype') && !hasT(p,'newtype')), plainP=pilotWhere(p=>!hasT(p,'cyber-newtype') && !hasT(p,'newtype'));
  fresh('enemy'); let k=put('GD01-044','enemy'); let a=stick('player',1,5), b=stick('player',1,5); pair(k, 'GD01-093');   // Marida Cruz (Cyber-Newtype)
  ok('Kshatriya (AI): fires for the (Cyber-Newtype) Marida Cruz', a.hp<5 || b.hp<5, `${a.hp}/${b.hp}`);
  fresh('enemy'); k=put('GD01-044','enemy'); a=stick('player',1,5); b=stick('player',1,5); pair(k, cnt);
  ok('Kshatriya (AI): fires for any (Cyber-Newtype) Pilot', a.hp<5 || b.hp<5);
  fresh('enemy'); k=put('GD01-044','enemy'); a=stick('player',1,5); b=stick('player',1,5); pair(k, plainP);
  ok('Kshatriya (AI): nothing for a Pilot with neither trait', a.hp===5 && b.hp===5);
  fresh('player'); k=put('GD01-044','player'); a=stick('enemy',1,5); b=stick('enemy',1,5); playPilot(k, 'GD01-093');
  ok('Kshatriya (player): Marida Cruz opens the 1-to-2 target choice', /trigger/.test(G.mode), G.mode); }
// Hyakuri GD02-061 — 【When Paired･Purple Pilot】If there are 3 or more (Teiwaz)/(Tekkadan) cards in your trash, … Rest it.
{ const purple=pilotWhere(p=>colorIs(p,'purple')), green='GD02-089';
  const setup=(who)=>{ fresh(who); const h=put('GD02-061',who); for(let i=0;i<3;i++) side(who).trash.push(card('GD02-062',who)); return h; };
  let h=setup('enemy'); let t=stick('player',2,3); pair(h, green);
  ok('Hyakuri (AI): a green Pilot rests nothing', !t.rested);
  h=setup('enemy'); t=stick('player',2,3); pair(h, purple);
  ok('Hyakuri (AI): a purple Pilot rests the 2-AP Unit', t.rested);
  h=setup('player'); t=stick('enemy',2,3); stick('enemy',1,3); playPilot(h, green);
  ok('Hyakuri (player): a green Pilot from hand opens no prompt', G.mode==='idle' && !t.rested, G.mode);
  h=setup('player'); t=stick('enemy',2,3); stick('enemy',1,3); playPilot(h, purple); const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(t.uid); drainTasks(); }
  ok('Hyakuri (player): a purple Pilot lets you choose the Unit to rest', asked && t.rested, G.mode); }
// Gundam Hajiroboshi (2nd Form) GD03-055 — 【When Paired･Purple Pilot】Choose 1 enemy Unit that is Lv.2 or lower. Destroy it.
{ const purple=pilotWhere(p=>colorIs(p,'purple'));
  fresh('enemy'); let u=put('GD03-055','enemy'); let t=stick('player',1,3,{lv:2}); pair(u, 'GD01-089');   // blue Riddhe Marcenas
  ok('Gundam Hajiroboshi (2nd Form) (AI): a blue Pilot destroys nothing', G.player.field.includes(t));
  fresh('enemy'); u=put('GD03-055','enemy'); t=stick('player',1,3,{lv:2}); pair(u, purple);
  ok('Gundam Hajiroboshi (2nd Form) (AI): a purple Pilot destroys the Lv.2 Unit', !G.player.field.includes(t));
  fresh('player'); u=put('GD03-055','player'); t=stick('enemy',1,3,{lv:2}); stick('enemy',1,3,{lv:1}); playPilot(u, 'GD01-089');
  ok('Gundam Hajiroboshi (2nd Form) (player): a blue Pilot opens no prompt', G.mode==='idle' && G.enemy.field.includes(t), G.mode); }
// The requirement parser itself.
{ const q=A.parseTrigger(A.CARD_BY_ID.get('GD01-044').effect,'When Paired');
  ok('parser: "(Cyber-Newtype)/(Newtype) Pilot" keeps both traits', q && q.cond && q.cond.type==='pairedPilotReq' && q.cond.trait==='cyber-newtype/newtype', JSON.stringify(q&&q.cond)); }

// ======== "this Unit" / "other" in a Pilot's text = the Unit it is paired with ========
// McGillis Fareed ST05-012 — 【When Paired】If you have 2 or more other (Gjallarhorn)/(Tekkadan) Units in play, choose 1 enemy Unit with 3 or less HP. Rest it.
{ const run=(who, others)=>{ fresh(who); const host=put('ST05-008',who); for (let i=0;i<others;i++) put('ST05-009',who); const t=stick(who==='player'?'enemy':'player',1,3);
    if (who==='player'){ playPilot(host,'ST05-012'); const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(t.uid); drainTasks(); } return { asked, rested:t.rested }; }
    pair(host,'ST05-012'); return { rested:t.rested }; };
  ok('McGillis Fareed (AI): host + 1 other Gjallarhorn Unit is only 1 "other" — nothing rested', !run('enemy',1).rested);
  ok('McGillis Fareed (AI): host + 2 others rests the enemy Unit', run('enemy',2).rested);
  const p1=run('player',1); ok('McGillis Fareed (player): no prompt with only 1 other Unit', !p1.asked && !p1.rested);
  const p2=run('player',2); ok('McGillis Fareed (player): 2 other Units — the prompt opens and the Unit is rested', p2.rested); }
// Haman Karn GD02-091 — 【When Paired】If this Unit is red, choose 1 enemy Unit whose Lv. is equal to or lower than this Unit. Deal 1 damage to it.
{ fresh('enemy'); let h=put('GD02-013','enemy'); let t=stick('player',1,3,{lv:1}); pair(h,'GD02-091');   // blue Hizack
  ok('Haman Karn (AI): paired with a blue Unit — no damage', t.hp===3);
  fresh('enemy'); h=put('GD02-039','enemy'); t=stick('player',1,3,{lv:1}); pair(h,'GD02-091');      // red Haman Karn's Gaza C (its own 【When Paired】 also pings)
  ok('Haman Karn (AI): paired with a red Unit — the damage happens', t.hp<3, t.hp);
  fresh('player'); h=put('GD02-013','player'); t=stick('enemy',1,3,{lv:1}); stick('enemy',1,3,{lv:1}); playPilot(h,'GD02-091');
  ok('Haman Karn (player): a blue Unit opens no prompt', G.mode==='idle' && t.hp===3, G.mode); }

// ======== "<A> and <B>" with amounts in it ========
// LaGOWE GD01-050 — 【Attack】If this Unit has 5 or more AP and it is attacking an enemy Unit, choose 1 enemy Unit. Deal 2 damage to it.
{ fresh('player'); let l=put('GD01-050','player',{tempAp:3}); let o=stick('enemy',1,9); attack(l, null); if (G.mode==='trigger-target'){ A.fieldClick(o.uid); drainTasks(); } passAll();
  ok('LaGOWE (player): 5 AP attacking the player — no damage, no prompt', o.hp===9);
  fresh('player'); l=put('GD01-050','player',{tempAp:3}); let d=stick('enemy',1,9,{rested:true}); o=stick('enemy',1,9); attack(l, d); const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(o.uid); drainTasks(); } passAll();
  ok('LaGOWE (player): 5 AP attacking a Unit — you choose the Unit to deal 2 to', asked && o.hp===7, `${G.mode} ${o.hp}`);
  fresh('enemy'); l=put('GD01-050','enemy',{tempAp:3}); o=stick('player',1,9); aiAttack(l, null);
  ok('LaGOWE (AI): 5 AP attacking the player — no damage', o.hp===9);
  fresh('enemy'); l=put('GD01-050','enemy',{tempAp:3}); d=stick('player',1,9,{rested:true}); aiAttack(l, d);
  ok('LaGOWE (AI): 5 AP attacking a Unit — 2 damage to an enemy Unit', d.hp<9, d.hp); }
// GINN Long-Range Reconnaissance Type GD02-045 — 【Attack】If this Unit has 5 or more AP and it is attacking an enemy Unit, draw 1.
{ fresh('player'); let g=put('GD02-045','player',{tempAp:5}); let h0=G.player.hand.length; attack(g, null); passAll();
  ok('GINN Long-Range Reconnaissance Type (player): attacking the player draws nothing', G.player.hand.length===h0);
  fresh('player'); g=put('GD02-045','player',{tempAp:5}); h0=G.player.hand.length; attack(g, stick('enemy',1,9,{rested:true})); passAll();
  ok('GINN Long-Range Reconnaissance Type (player): attacking a Unit draws 1', G.player.hand.length===h0+1);
  fresh('enemy'); g=put('GD02-045','enemy',{tempAp:5}); h0=G.enemy.hand.length; aiAttack(g, null);
  ok('GINN Long-Range Reconnaissance Type (AI): attacking the player draws nothing', G.enemy.hand.length===h0); }
// Lafter Frankland GD02-095 — 【Attack】If this Unit is damaged and Lv.5 or lower, it gains <High-Maneuver> during this battle.
{ // The opponent holds an active <Blocker>: a <High-Maneuver> attacker can't be blocked, so the hit lands on the shields.
  const run=(who, unitId)=>{ fresh(who); const u=put(unitId, who); pair(u,'GD02-095'); u.hp=Math.max(1,u.hp-1); const foe=who==='player'?G.enemy:G.player;
    const blk=stick(foe.who,0,20,{blocker:true}); const s0=foe.shields.length; el('log').innerHTML='';
    if (who==='player'){ attack(u, null); passAll(); } else { aiAttack(u, null); }
    const gained=logs().some(l=>/gains &lt;High-Maneuver&gt; during this battle/.test(l));
    return { during: gained && blk.hp===20, after:A.effHighManeuver(u) }; };
  const big=run('player','GD02-013');
  const lv6=[...A.CARD_BY_ID.values()].find(d=>d.type==='unit' && d.lv===6 && !/【|</.test(A.plain(d.effect||'')) && !/-p\d/.test(d.id));
  const r6=run('player', lv6.id, null), r6ai=run('enemy', lv6.id, null);
  ok('Lafter Frankland: a damaged Lv.6 Unit gains no <High-Maneuver> (player / AI)', !r6.during && !r6ai.during);
  ok('Lafter Frankland: a damaged Lv.2 Unit has <High-Maneuver> during the battle, not after it', big.during===true && big.after===false, JSON.stringify(big));
  const rai=run('enemy','GD02-013', null); ok('Lafter Frankland (AI): <High-Maneuver> ends with the battle', rai.after===false); }
// GQuuuuuuX (Omega Psycommu Released) GD06-003 — 【Attack】If another friendly (Alphacide) Unit is in play and you have 5 or less cards in your hand, draw 1.
{ const run=(who, n)=>{ fresh(who); const g=put('GD06-003',who); stick(who,1,1,{trait:'(Alphacide)'}); const s=side(who);
    s.hand=[]; for (let i=0;i<n;i++) s.hand.push(card('ST01-003',who)); const h0=s.hand.length;
    if (who==='player'){ attack(g, null); passAll(); } else aiAttack(g, null); return s.hand.length-h0; };
  ok('GQuuuuuuX (Omega Psycommu Released): 6 cards in hand — no draw (player / AI)', run('player',6)===0 && run('enemy',6)===0);
  ok('GQuuuuuuX (Omega Psycommu Released): 5 cards in hand — draw 1 (player / AI)', run('player',5)===1 && run('enemy',5)===1); }
// Endra GD06-123 — 【Deploy】Add 1 of your Shields to your hand. Then, if it is your turn and you have a (Neo Zeon) Unit paired with a
// Pilot that is Lv.3 or lower in play, choose 1 enemy Unit with <Blocker> and 3 or less AP. Destroy it.
{ const lv3=pilotWhere(p=>p.lv===3), lv4=pilotWhere(p=>p.lv>=4);
  const run=(pid, nz)=>{ fresh('enemy'); if (nz){ const u=put('GD06-028','enemy'); pair(u, pid); } const b=stick('player',3,3,{blocker:true});
    const e=card('GD06-123','enemy'); G.enemy.base=e; A.runTrigger(e, G.enemy, A.parseTrigger(e.effect,'Deploy'), 'Deploy'); drainTasks(); return G.player.field.includes(b); };
  ok('Endra (AI): no (Neo Zeon) Unit — the <Blocker> survives', run(null,false));
  ok('Endra (AI): (Neo Zeon) Unit with a Lv.4 Pilot — the <Blocker> survives', run(lv4,true));
  ok('Endra (AI): (Neo Zeon) Unit with a Lv.3 Pilot — the <Blocker> is destroyed', !run(lv3,true));
  fresh('player'); const b=stick('enemy',3,3,{blocker:true}); G.player.hand=[card('GD06-123','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); passAll();
  if (G.mode==='trigger-target'){ A.fieldClick(b.uid); drainTasks(); }
  ok('Endra (player): played with no (Neo Zeon) Unit — the enemy <Blocker> survives', G.enemy.field.includes(b) && G.player.base && G.player.base.def==='GD06-123'); }

// ======== rested Units ========
// Shamblo GD01-047 — 【Attack】If 2 or more other rested friendly Units are in play, choose 1 enemy Unit. Deal 3 damage to it.
{ fresh('player'); let s=put('GD01-047','player'); stick('player',1,1,{rested:true}); stick('player',1,1,{rested:true});
  let d=stick('enemy',1,9,{rested:true}), o=stick('enemy',1,9); attack(s, d); const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(o.uid); drainTasks(); } passAll();
  ok('Shamblo (player): 2 other rested friendly Units — you choose the Unit to deal 3 to', asked && o.hp===6, `${G.mode} ${o.hp}`);
  fresh('player'); s=put('GD01-047','player'); stick('player',1,1,{rested:true}); stick('player',1,1); d=stick('enemy',1,9,{rested:true}); o=stick('enemy',1,9); attack(s, d);
  ok('Shamblo (player): only 1 other rested Unit — no prompt', G.mode!=='trigger-target'); passAll();
  fresh('enemy'); s=put('GD01-047','enemy'); stick('enemy',1,1,{rested:true}); stick('enemy',1,1,{rested:true}); o=stick('player',1,9); aiAttack(s, null);
  ok('Shamblo (AI): 2 other rested friendly Units — 3 damage to an enemy Unit', o.hp===6, o.hp); }
// Character Requests EB01-073 — 【Main】If there are 6 or more rested Units in play, draw 2.
{ const run=(mine, theirs)=>{ fresh('player'); for(let i=0;i<mine;i++) stick('player',1,1,{rested:true}); for(let i=0;i<theirs;i++) stick('enemy',1,1,{rested:true});
    const h0=G.player.hand.length; playMain('EB01-073'); return G.player.hand.length-h0; };
  ok('Character Requests: 3 friendly + 3 enemy rested Units — draw 2', run(3,3)===2);
  ok('Character Requests: 5 rested Units — no draw', run(3,2)===0);
  fresh('enemy'); for(let i=0;i<4;i++) stick('enemy',1,1,{rested:true}); for(let i=0;i<2;i++) stick('player',1,1,{rested:true});
  const c=card('EB01-073','enemy'); const h0=G.enemy.hand.length; A.runTrigger(c, G.enemy, c.action || A.parseTrigger(c.effect,'Main'), 'Main'); drainTasks();
  ok('Character Requests (AI): 4 + 2 rested Units — draw 2', G.enemy.hand.length-h0===2); }
// Hi-Nu Gundam (EX) EB01-002 — 【During Link】【Attack】【Once per Turn】If 3 or more other rested Units are in play, set this Unit as active.
{ const linkP={ id:linkPilot('EB01-002') };
  fresh('enemy'); const h=put('EB01-002','enemy'); pair(h, linkP.id); stick('enemy',1,1,{rested:true}); stick('player',1,1,{rested:true}); stick('player',1,1,{rested:true});
  aiAttack(h, null);
  ok('Hi-Nu Gundam (EX) (AI): 1 friendly + 2 enemy other rested Units — set active', !!h.linked && !h.rested, `linked ${h.linked} rested ${h.rested}`);
  fresh('player'); const h2=put('EB01-002','player'); pair(h2, linkP.id); stick('player',1,1,{rested:true}); stick('enemy',1,1,{rested:true}); stick('enemy',1,1,{rested:true}); attack(h2, null); passAll();
  ok('Hi-Nu Gundam (EX) (player): 3 other rested Units on either side — set active', !h2.rested);
  fresh('player'); const h3=put('EB01-002','player'); pair(h3, linkP.id); stick('player',1,1,{rested:true}); stick('enemy',1,1,{rested:true}); attack(h3, null); passAll();
  ok('Hi-Nu Gundam (EX) (player): only 2 other rested Units — stays rested', h3.rested); }
// Kamille Bidan ST10-011 — 【When Linked】If 2 or more rested Units are in play, choose 1 enemy Unit whose Lv. is equal to or lower than this Unit. Rest it.
{ fresh('enemy'); const z=put('ST10-002','enemy'); stick('enemy',1,1,{rested:true}); stick('player',1,1,{rested:true,lv:1}); const t=stick('player',1,3,{lv:2});
  pair(z,'ST10-011');
  ok('Kamille Bidan (AI): 1 AI + 1 player rested Unit — the Lv.2 Unit is rested', z.linked && t.rested, `linked ${z.linked}`);
  fresh('enemy'); const z2=put('ST10-002','enemy'); stick('enemy',1,1,{rested:true}); const t2=stick('player',1,3,{lv:2}); pair(z2,'ST10-011');
  ok('Kamille Bidan (AI): only 1 rested Unit — nothing rested', !t2.rested); }

// ======== "another … Link Unit" ========
// Kikeroga (MA Mode) (GQ) GD02-033 — While another friendly (Zeon) Link Unit is in play, this Unit gains <Breach 5>.
{ const linkP={ id:linkPilot('GD02-033') };
  fresh('player'); const k=put('GD02-033','player'); pair(k, linkP.id);
  ok('Kikeroga (MA Mode) (GQ): linked itself, no other Link Unit — no <Breach>', k.linked && A.effBreach(k)===0, `${k.linked} ${A.effBreach(k)}`);
  stick('player',1,1,{trait:'(Zeon)', linked:true});
  ok('Kikeroga (MA Mode) (GQ): another (Zeon) Link Unit — <Breach 5>', A.effBreach(k)===5, A.effBreach(k)); }

// ======== battle-dependent conditions ========
// Gadeel GD04-044 — 【Attack】If you are attacking a damaged enemy Unit, this Unit gains <Breach 3> during this battle.
{ fresh('player'); let g=put('GD04-044','player'); let d=stick('enemy',3,1,{rested:true}); const s0=G.enemy.shields.length; attack(g, d); passAll();
  ok('Gadeel (player): attacking an undamaged Unit — no <Breach>, no shield lost', G.enemy.shields.length===s0);
  fresh('player'); g=put('GD04-044','player'); d=stick('enemy',1,2,{rested:true,hp:1}); el('log').innerHTML=''; const s2=G.enemy.shields.length; attack(g, d); passAll(); const during=logs().some(l=>/gains &lt;Breach 3&gt; during this battle/.test(l));
  ok('Gadeel (player): attacking a damaged Unit — <Breach 3> during that battle (a shield is hit), gone after it', during && G.enemy.shields.length===s2-1 && A.effBreach(g)===0, `${during} ${s2}->${G.enemy.shields.length} ${A.effBreach(g)}`);
  fresh('enemy'); g=put('GD04-044','enemy'); d=stick('player',3,1,{rested:true}); const s1=G.player.shields.length; aiAttack(g, d);
  ok('Gadeel (AI): attacking an undamaged Unit — no shield lost', G.player.shields.length===s1); }

// ======== "If you deploy this Unit from your trash" ========
{ const fromHand=(id, who, foeSetup)=>{ fresh(who); const foe=foeSetup ? foeSetup(who==='player'?'enemy':'player') : null; const s=side(who); const d0=s.deck.length;
    if (who==='player'){ G.player.hand=[card(id,'player')]; A.playFromHand(G.player.hand[0].uid); drainTasks(); }
    else { const c=put(id,'enemy'); A.runTrigger(c, G.enemy, A.parseTrigger(c.effect,'Deploy'), 'Deploy'); drainTasks(); }
    return { foe, drew:d0-s.deck.length, mode:G.mode }; };
  const fromTrash=(id, who, foeSetup)=>{ fresh(who); const foe=foeSetup ? foeSetup(who==='player'?'enemy':'player') : null; const s=side(who); const c=card(id,who); s.trash.push(c); const d0=s.deck.length;
    A.reanimate(card('GD02-110',who), s, { kind:'reanimate', filter:'unit', free:true }, null); drainTasks();
    if (who==='player'){ const o=overlay(); if (o) o.pick(0); }
    return { foe, c, drew:d0-s.deck.length, mode:G.mode }; };
  // GX-Bit GD03-062 — choose 1 enemy Unit with 4 or less AP. Deal 2 damage to it.
  let r=fromHand('GD03-062','player', w=>stick(w,3,9));
  ok('GX-Bit (player): deployed from hand — no prompt, no damage', r.mode==='idle' && r.foe.hp===9, r.mode);
  r=fromHand('GD03-062','enemy', w=>stick(w,3,9)); ok('GX-Bit (AI): deployed from hand — no damage', r.foe.hp===9);
  r=fromTrash('GD03-062','enemy', w=>stick(w,3,9)); ok('GX-Bit (AI): deployed from the trash — 2 damage', r.foe.hp===7, r.foe.hp);
  r=fromTrash('GD03-062','player', w=>{ const a=stick(w,3,9); stick(w,2,9); return a; }); const asked=G.mode==='trigger-target'; if (asked){ A.fieldClick(r.foe.uid); drainTasks(); }
  ok('GX-Bit (player): deployed from the trash — you choose the Unit, 2 damage', asked && r.foe.hp===7, `${G.mode} ${r.foe.hp}`);
  // Esperansa GD04-060 — draw 1.
  ok('Esperansa: deployed from hand draws nothing (player / AI)', fromHand('GD04-060','player').drew===0 && fromHand('GD04-060','enemy').drew===0);
  ok('Esperansa: deployed from the trash draws 1 (player / AI)', fromTrash('GD04-060','player').drew===1 && fromTrash('GD04-060','enemy').drew===1);
  // Sword Impulse Gundam ST09-006 — choose 1 enemy Unit that is Lv.3 or lower. Destroy it.
  r=fromHand('ST09-006','player', w=>stick(w,1,5,{lv:2})); ok('Sword Impulse Gundam (player): from hand — nothing destroyed', r.mode==='idle' && G.enemy.field.includes(r.foe));
  r=fromHand('ST09-006','enemy', w=>stick(w,1,5,{lv:2})); ok('Sword Impulse Gundam (AI): from hand — nothing destroyed', G.player.field.includes(r.foe));
  r=fromTrash('ST09-006','enemy', w=>stick(w,1,5,{lv:2})); ok('Sword Impulse Gundam (AI): from the trash — the Lv.2 Unit is destroyed', !G.player.field.includes(r.foe));
  // Force Impulse Gundam GD05-064 — choose 1 Pilot card with "Shinn Asuka" in its card name from your trash. Add it to your hand.
  const seed=(who)=>{ const s=side(who); const shinn=card('ST09-008',who), kira=card('GD05-081',who); s.trash.push(kira, shinn); return { shinn, kira }; };
  fresh('player'); let p=seed('player'); G.player.hand=[card('GD05-064','player')]; A.playFromHand(G.player.hand[0].uid); drainTasks();
  ok('Force Impulse Gundam (player): from hand — no Pilot retrieved', !G.player.hand.includes(p.shinn) && !G.player.hand.includes(p.kira) && !overlay());
  fresh('enemy'); p=seed('enemy'); { const c=put('GD05-064','enemy'); A.runTrigger(c, G.enemy, A.parseTrigger(c.effect,'Deploy'), 'Deploy'); drainTasks(); }
  ok('Force Impulse Gundam (AI): from hand — no Pilot retrieved', !G.enemy.hand.includes(p.shinn) && !G.enemy.hand.includes(p.kira));
  fresh('enemy'); p=seed('enemy'); G.enemy.trash.push(card('GD05-064','enemy')); A.reanimate(card('GD02-110','enemy'), G.enemy, { kind:'reanimate', filter:'unit', free:true }, null); drainTasks();
  ok('Force Impulse Gundam (AI): from the trash — Shinn Asuka retrieved, never Kira Yamato', G.enemy.hand.includes(p.shinn) && !G.enemy.hand.includes(p.kira));
  fresh('player'); p=seed('player'); G.player.trash.push(card('GD05-064','player'));
  A.reanimate(card('GD02-110','player'), G.player, { kind:'reanimate', filter:'unit', free:true }, null); drainTasks();
  { const o=overlay(); const fi=G.player.trash.filter(c=>c.type==='unit'); if (o) o.pick(0); drainTasks(); const o2=overlay(); if (o2) o2.pick(0); drainTasks(); }
  ok('Force Impulse Gundam (player): from the trash — Shinn Asuka retrieved, never Kira Yamato', G.player.hand.includes(p.shinn) && !G.player.hand.includes(p.kira)); }

// ======== 【Burst】 condition ========
// Graham's Union Flag Custom Ⅱ (GN Flag) GD04-071 — 【Burst】If an enemy (CB) Unit is in play, add this card to your hand.
{ for (const who of ['player','enemy']){
    fresh(who==='player'?'enemy':'player'); let c=card('GD04-071',who); A.triggerBurst(c, side(who), null, true); drainTasks();
    ok(`GN Flag burst (${who}): no enemy (CB) Unit — to the trash`, side(who).trash.includes(c) && !side(who).hand.includes(c));
    fresh(who==='player'?'enemy':'player'); stick(who==='player'?'enemy':'player',1,1,{trait:'(CB)'}); c=card('GD04-071',who); A.triggerBurst(c, side(who), null, true); drainTasks();
    ok(`GN Flag burst (${who}): an enemy (CB) Unit — to the hand`, side(who).hand.includes(c)); } }

// ======== 【Destroyed】 with battle damage ========
// Haro EB01-017 — 【Destroyed】If this Unit is destroyed with battle damage, you and the player who destroyed this Unit draw 1.
{ fresh('enemy'); let h=put('EB01-017','player',{rested:true}); let a=stick('enemy',5,9); let ph=G.player.hand.length, eh=G.enemy.hand.length; aiAttack(a, h);
  ok('Haro: destroyed in battle — both players draw 1', !G.player.field.includes(h) && G.player.hand.length-ph===1 && G.enemy.hand.length-eh===1, `${G.player.hand.length-ph}/${G.enemy.hand.length-eh}`);
  fresh('player'); h=put('EB01-017','enemy'); ph=G.player.hand.length; eh=G.enemy.hand.length; A.applyToTarget(stick('player',1,1), G.player, {kind:'damage', amount:5}, h, 'Test'); drainTasks();
  ok('Haro: destroyed by effect damage — nobody draws', !G.enemy.field.includes(h) && G.player.hand.length===ph && G.enemy.hand.length===eh); }

// ======== Libra ST12-016 — 【Activate･Main】Rest this Base：If a friendly Unit paired with a Pilot has destroyed an enemy Unit with battle damage this turn, … Deal 1 damage to it.
{ const quietP=pilotWhere(p=>true);
  fresh('player'); let lib=card('ST12-016','player'); G.player.base=lib; let e=stick('enemy',1,3,{lv:2}); A.startActivate(lib); drainTasks(); if (/target/.test(G.mode)){ A.fieldClick(e.uid); drainTasks(); }
  ok('Libra (player): no paired battle kill this turn — no damage', e.hp===3, e.hp);
  fresh('player'); lib=card('ST12-016','player'); G.player.base=lib; const atk=stick('player',4,5); pair(atk, quietP); const v=stick('enemy',1,1,{rested:true}); e=stick('enemy',1,3,{lv:2});
  attack(atk, v); passAll(); G.mode='idle'; G.selected=null; A.startActivate(lib); drainTasks(); if (/target/.test(G.mode)){ A.fieldClick(e.uid); drainTasks(); }
  ok('Libra (player): after a paired Unit destroyed an enemy Unit in battle — 1 damage', !G.enemy.field.includes(v) && e.hp===2, `${G.enemy.field.includes(v)} ${e.hp}`);
  fresh('enemy'); lib=card('ST12-016','enemy'); G.enemy.base=lib; e=stick('player',1,3,{lv:2}); A.aiActivate(lib); drainTasks();
  ok('Libra (AI): no paired battle kill — no damage', e.hp===3);
  fresh('enemy'); lib=card('ST12-016','enemy'); G.enemy.base=lib; const a2=stick('enemy',1,5); stick('player',1,1,{rested:true}); e=stick('player',1,3,{lv:2});
  const v2=G.player.field[0]; aiAttack(a2, v2); A.aiActivate(lib); drainTasks();
  ok('Libra (AI): an UNpaired Unit\'s battle kill does not count', e.hp===3); }

// ======== rulings ========
// Gundam Hajiroboshi GD03-068 — While a friendly Base is in play, this Unit gains <Blocker>. Reading: the EX Base token is a Base in play.
{ fresh('player'); const u=put('GD03-068','player'); ok('Gundam Hajiroboshi: no Base — no <Blocker>', !A.effBlocker(u));
  G.player.base=A.exBaseToken('player'); ok('Gundam Hajiroboshi: the EX Base token counts as a friendly Base', A.effBlocker(u)); }
// Two Unicorns ST12-015 — ■Choose 1 friendly Unit and 1 enemy Unit that is Lv.5 or higher. Deal 2 damage to them. Reading: only the enemy Unit must be Lv.5+.
{ const md=A.CARD_BY_ID.get('ST12-015'); const c=A.makeCard(md,'player'); const mode=(c.action&&c.action.modes||[]).find(m=>m.kind==='damageBoth');
  ok('Two Unicorns: the Lv.5-or-higher requirement is on the enemy Unit only', mode && !mode.filter && mode.enemyFilter && mode.enemyFilter.minLv===5, JSON.stringify(mode));
  fresh('player'); const f=stick('player',3,4,{lv:4}); const e5=stick('enemy',1,5,{lv:5}); const e3=stick('enemy',1,5,{lv:3}); stick('enemy',1,5,{lv:2}); const tgt=stick('enemy',1,20,{rested:true,lv:3});
  G.player.hand=[card('ST12-015','player')]; attack(f, tgt); press(/Two Unicorns/); const offered=!!modal() && modal().btns.some(b=>/friendly Unit and 1 enemy/.test(b)); press(/friendly Unit and 1 enemy/);
  for (let g=0; g<4 && /target/.test(G.mode); g++){ A.fieldClick((G.pending && G.pending.stage==='enemy' || G.mode==='cmd-target-enemy') ? e5.uid : f.uid); drainTasks(); }
  passAll();
  ok('Two Unicorns (player): with only a Lv.4 friendly Unit the mode is offered, and only the Lv.5 enemy Unit can be hit', offered && e5.hp===3 && e3.hp===5, `${offered} f${f.hp} e5 ${e5.hp} e3 ${e3.hp} ${G.mode}`); }

console.log(fail.length ? 'FAILED:\n  '+fail.join('\n  ') : 'all audit2 group k checks passed');
console.log(`passed: ${pass} | failed: ${fail.length}`);
console.log('Errors: '+((H.ERRORS||[]).length));
