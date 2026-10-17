// Alternate-art printings: every printing shows its own official printed text, and that wording means the same as
// its base card's current text. The engine plays a printing with the base text (cards with the same card number are
// the same card, 2-1-1), so this suite proves the printed wording builds the same abilities and, for every reworded
// printing, plays the same in real scenarios when the engine reads the printed wording itself.
//   node printings_check.js [cards.ndjson]   (optional: the gcg-api bulk file, to compare shown text with the official list)
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G; const fs=require('fs');
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }

// Superseded templating on older printings (and a few official records), rewritten to the current form. Each
// rewrite is exact in meaning: "【When Paired】If this is a Link Unit, X" is 【When Linked】X, and so on.
function currentTemplating(t){
  return String(t==null?'':t)
    .replace(/&amp;/g, '&')
    .replace(/(\w)' (s|t|re|ll|ve|d|m)\b/g, "$1'$2")
    .replace(/\bif you have 0 Units in play\b/g, 'if you have no Units in play')
    .replace(/【\s*When Paired\s*】\s*If this is a Link Unit,\s*(\w)/g, (m,a)=>'【When Linked】'+a.toUpperCase())
    .replace(/【\s*During (?:Pair|Link)\s*】((?:【[^】]+】)*)\s*If this is a Link Unit,\s*(\w)/g, (m,tags,a)=>'【During Link】'+tags+a.toUpperCase())
    .replace(/(【During Link】(?:【[^】]+】)*)Return its paired Pilot/g, "$1Return this Unit's paired Pilot")
    .replace(/(^|<br\s*\/?>|\n)(This Unit gets [^.<【]+?) while linked\./g, '$1【During Link】$2.')
    .replace(/\bDuring your turn, if this Unit has &lt;/g, 'During your turn, while this Unit has &lt;');
}
const norm=s=>String(s||'').replace(/<br\s*\/?>/gi,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\n/g,' ').replace(/\s+/g,' ').trim();
const shown=d=>d.printText||d.effect;
const printings=[...A.CARD_BY_ID.values()].filter(d=>/-p\d+$/i.test(d.id));

// ---- 1. every printing shows its own record's text (the official printed text) and keeps the base stats ----
const rawText=new Map(); for (const r of A.GUNDAM_CARDS) if (r.effect) rawText.set(r.id, r.effect);
let shownOk=0, statsOk=0; const shownBad=[], statsBad=[];
for (const d of printings){ const b=A.CARD_BY_ID.get(A.cardNum(d.id)); const own=rawText.get(d.id);
  if (own===undefined ? shown(d)===b.effect : shown(d)===own) shownOk++; else shownBad.push(d.id);
  if (d.effect===b.effect && ['name','type','color','cost','lv','ap','hp','trait','link'].every(k=>JSON.stringify(d[k])===JSON.stringify(b[k]))) statsOk++; else statsBad.push(d.id);
}
ok(`every printing shows its own printed text (${shownOk}/${printings.length})`, !shownBad.length, shownBad.slice(0,8).join(' '));
ok(`every printing plays with its base card's text and stats (${statsOk}/${printings.length})`, !statsBad.length, statsBad.slice(0,8).join(' '));

// ---- 2. the printed wording builds the same abilities as the base text ----
const labels=['Deploy','Attack','Destroyed','When Paired','Pair','When Linked','Link','Burst','Action','Main'];
const ser=o=>JSON.stringify(o,(k,v)=>typeof v==='function'?'fn:'+v.toString().length:(['uid','img','effect','printText','source','id','owner','def'].includes(k)?undefined:v));
function sig(d){ const r={};
  for (const l of labels){ try{ const a=A.parseTrigger(d.effect,l); if(a) r[l]=ser(a); }catch(e){ r[l]='ERR '+e.message; } }
  try{ const a=A.parseActivate(d.effect); if(a) r.activate=ser(a); }catch(e){ r.activate='ERR'; }
  if (d.type==='command'){ try{ r.cmd=ser(A.inferCommand(d.effect)); }catch(e){ r.cmd='ERR'; } }
  const c=A.makeCard(d,'player'); for (const k of Object.keys(c)) if(!['uid','img','effect','printText','def'].includes(k)) r['card.'+k]=ser(c[k]);
  return r; }
const asPrintedDef=id=>{ const d=A.CARD_BY_ID.get(id); return Object.assign({}, d, { effect: currentTemplating(shown(d)) }); };
// A structural difference that is equivalent: the reordered ST05-001 printing also records its "While this is damaged,
// it gains <Suppression>" line as a while-keyword; the base text reaches the same rule through suppressionWhenDamaged.
// Section 3 plays it.
const EQUIV={ 'ST05-001-p3': ['card.whileKw'] };
let worded=0, same=0; const diffs=[];
for (const d of printings){ if (!d.printText || norm(d.printText)===norm(d.effect)) continue; worded++;
  const b=A.CARD_BY_ID.get(A.cardNum(d.id)); const s1=sig(b), s2=sig(asPrintedDef(d.id));
  const ks=[...new Set([...Object.keys(s1),...Object.keys(s2)])].filter(k=>s1[k]!==s2[k] && !(EQUIV[d.id]||[]).includes(k));
  if (ks.length) diffs.push(d.id+' ['+ks.join(',')+']'); else same++; }
ok(`every printing whose wording differs builds the same abilities as its base card (${same}/${worded})`, !diffs.length, diffs.join(' '));

// ---- 3. the reworded printings play the same as their base card ----
function fresh(turn){
  drainTasks();
  Object.assign(G,{turn:turn||'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=0; s.hand=[];
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
let UID=900000;
function stick(who, ap, hp, extra){
  const c = { uid: UID++, owner:who, def:'TEST', name:`Test ${ap}/${hp}#${UID}`, type:'unit', color:'Blue', cost:1, lv:1,
    trait:'(Test)', link:[], effect:'', baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false, breach:0, suppression:false,
    support:0, repair:0, token:false };
  Object.assign(c, extra||{}); (who==='player'?G.player:G.enemy).field.push(c); return c;
}
// make(id, who, printed): the base card, or a printing built from its own printed wording
const make=(id, who, printed)=>{ const c=A.makeCard(printed? asPrintedDef(id) : A.CARD_BY_ID.get(A.cardNum(id)), who); c.sick=false; return c; };
const put=(id, who, printed)=>{ const u=make(id, who, printed); (who==='player'?G.player:G.enemy).field.push(u); return u; };
const pair=(u, id, printed)=>{ const p=make(id, u.owner, printed); A.attachPilot(u, p); drainTasks(); return p; };
const kill=u=>{ const side=u.owner==='player'?G.player:G.enemy, foe=side===G.player?G.enemy:G.player;
  A.applyToTarget(stick(foe.who,1,1), foe, {kind:'damage', amount:99}, u, 'T'); drainTasks(); };
fresh(); { const u=A.makeCard(A.CARD_BY_ID.get('GD01-088-p1'),'player'); A.inspect(u);
  const h=global.document.getElementById('insEff').innerHTML;
  ok('the card viewer shows the printing\'s own wording', /【When Paired】If this is a Link Unit, draw 1\./.test(h), h.slice(0,120));
  const b=A.makeCard(A.CARD_BY_ID.get('GD01-088'),'player'); A.inspect(b);
  ok('the card viewer shows the base card\'s wording on the base card', /【When Linked】Draw 1\./.test(global.document.getElementById('insEff').innerHTML)); }
// Run a scenario with the base card and with each printing's own wording; the results must match.
function same3(label, ids, run){ const base=JSON.stringify(run(ids[0], false));
  for (const id of ids.slice(1)){ const r=JSON.stringify(run(id, true)); ok(`${id} ${label}`, r===base, `printed ${r} vs base ${base}`); }
  return JSON.parse(base); }

// Banagher Links: 【When Paired】If this is a Link Unit, draw 1  ==  【When Linked】Draw 1
{ const r=same3('draws 1 only when it pairs as a Link Pilot', ['GD01-088','GD01-088-p1','GD01-088-p2'], (id, pr)=>{
    fresh(); const u=put('GD01-005','player'); const h0=G.player.hand.length; pair(u, id, pr); const linked=G.player.hand.length-h0;
    fresh(); const s=stick('player',2,2); const h1=G.player.hand.length; pair(s, id, pr); const unlinked=G.player.hand.length-h1;
    return {linked, unlinked}; });
  ok('Banagher Links base: draw 1 linked, 0 unlinked', r.linked===1 && r.unlinked===0, JSON.stringify(r)); }
// Unicorn Gundam (Unicorn Mode): 【During Pair】【Destroyed】If this is a Link Unit, return its paired Pilot  ==  【During Link】【Destroyed】Return…
{ const r=same3('returns its Link Pilot when destroyed (and not an unlinked one)', ['GD01-005','GD01-005-p1','GD01-005-p2','GD01-005-p3'], (id, pr)=>{
    fresh('player'); G.enemy.hand=[make('ST01-001','enemy'), make('ST01-002','enemy')];
    const u=put(id,'enemy',pr); const p=pair(u,'GD01-088',false); const h0=G.enemy.hand.length; kill(u);
    const linkedBack=G.enemy.hand.some(x=>x.uid===p.uid), dLinked=G.enemy.hand.length-h0;
    fresh('player'); G.enemy.hand=[make('ST01-001','enemy')];
    const v=put(id,'enemy',pr); const q=pair(v,'ST01-010',false); kill(v);
    return {linkedBack, dLinked, unlinkedBack:G.enemy.hand.some(x=>x.uid===q.uid)}; });
  ok('Unicorn base: the Link Pilot returns, then 1 discarded', r.linkedBack && r.dLinked===0 && !r.unlinkedBack, JSON.stringify(r)); }
// Heero Yuy: "This Unit gets AP+1 and HP+1 while linked."  ==  【During Link】This Unit gets AP+1 and HP+1.
{ const r=same3('gives AP+1 and HP+1 only while linked', ['ST02-010','ST02-010-p1','ST02-010-p2'], (id, pr)=>{
    fresh(); const u=put('ST02-001','player'); pair(u, id, pr); const linked=[A.effAp(u), A.effMaxHp(u)];
    fresh(); const s=stick('player',2,2); pair(s, id, pr); return {linked, unlinked:[A.effAp(s), A.effMaxHp(s)]}; });
  const wing=A.CARD_BY_ID.get('ST02-001'), heero=A.makeCard(A.CARD_BY_ID.get('ST02-010'),'player');
  ok('Heero Yuy base: linked to Wing Gundam it adds its pilot stats and AP+1/HP+1; unlinked only its pilot stats',
     r.linked[0]===wing.ap+heero.pAp+1 && r.linked[1]===wing.hp+heero.pHp+1 && r.unlinked[0]===2+heero.pAp && r.unlinked[1]===2+heero.pHp, JSON.stringify(r)+' pilot +'+heero.pAp+'/+'+heero.pHp); }
// Chang Wufei: "During your turn, if this Unit has <Breach>, it can't receive battle damage from enemy Units with 3 or less AP"
{ const r=same3('shields a <Breach> Unit from 3-or-less-AP battle damage on your turn', ['GD01-091','GD01-091-p1'], (id, pr)=>{
    fresh('player'); const u=stick('player',3,3,{breach:1}); pair(u, id, pr);
    const lo=stick('enemy',3,3), hi=stick('enemy',4,4);
    const mine=[A.preventsLowApBattle(u, lo, G.player), A.preventsLowApBattle(u, hi, G.player)];
    G.turn='enemy'; const theirs=A.preventsLowApBattle(u, lo, G.player);
    fresh('player'); const n=stick('player',3,3); pair(n, id, pr); const noBreach=A.preventsLowApBattle(n, stick('enemy',3,3), G.player);
    return {mine, theirs, noBreach}; });
  ok('Chang Wufei base: blocks AP3 not AP4, only on your turn, only with <Breach>', r.mine[0] && !r.mine[1] && !r.theirs && !r.noBreach, JSON.stringify(r)); }
// Freedom Gundam (METEOR): "…return the enemy Unit to its owner' s hand" (spacing)  ==  "owner's hand"
{ const r=same3('returns the enemy Unit its (Triple Ship Alliance) Unit damaged', ['GD03-076','GD03-076-p1'], (id, pr)=>{
    fresh('enemy'); put(id,'enemy',pr); const atk=stick('enemy',3,3,{trait:'(Triple Ship Alliance)'}); const def=stick('player',2,5);
    A.battleBounceHook(atk, def, G.enemy, G.player); drainTasks();
    return {bounced:G.player.hand.some(x=>x.uid===def.uid), onField:G.player.field.includes(def)}; });
  ok('Freedom (METEOR) base: the damaged enemy Unit goes back to hand', r.bounced && !r.onField, JSON.stringify(r)); }
// Tieria Erde: "【Destroyed】If it is your opponent' s turn and this is a (CB) Unit, draw 1."
{ const r=same3('draws 1 when its (CB) Unit is destroyed on the opponent\'s turn only', ['ST07-010','ST07-010-p2','ST07-010-p3'], (id, pr)=>{
    fresh('enemy'); const u=stick('player',2,2,{trait:'(CB)'}); pair(u, id, pr); const h0=G.player.hand.length; kill(u); const opp=G.player.hand.length-h0;
    fresh('player'); const v=stick('player',2,2,{trait:'(CB)'}); pair(v, id, pr); const h1=G.player.hand.length; kill(v); const own=G.player.hand.length-h1;
    return {opp, own}; });
  ok('Tieria Erde base: draw on the opponent\'s turn, not your own', r.opp===1 && r.own===0, JSON.stringify(r)); }
// Gundam Barbatos 4th Form (reordered paragraphs): gains <Suppression> only while damaged
{ const r=same3('gains <Suppression> only while damaged', ['ST05-001','ST05-001-p3'], (id, pr)=>{
    fresh(); const u=put(id,'player',pr); const fresh0=A.effSuppression(u); u.hp-=1; return {undamaged:fresh0, damaged:A.effSuppression(u)}; });
  ok('Barbatos 4th Form base: Suppression while damaged', !r.undamaged && r.damaged, JSON.stringify(r)); }
// Sinanju (reordered paragraphs): 【During Pair】<High-Maneuver>
{ const r=same3('has <High-Maneuver> only while paired', ['ST03-001','ST03-001-p2','ST03-001-p3'], (id, pr)=>{
    fresh(); const u=put(id,'player',pr); const before=A.effHighManeuver(u); pair(u,'ST01-010',false); return {before, paired:A.effHighManeuver(u)}; });
  ok('Sinanju base: High-Maneuver while paired', !r.before && r.paired, JSON.stringify(r)); }

// ---- 4. optional: what the card shows equals the official list, for every deck card and printing ----
if (process.argv[2]){
  const rs=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>/^(UNIT|PILOT|COMMAND|BASE)$/i.test(r.card_type||''));
  let n=0, eq=0; const bad=[], miss=[];
  for (const r of rs){ const id=String(r.product_id).replace(/_p(\d+)$/i,'-p$1'); const d=A.CARD_BY_ID.get(id); if(!d){ miss.push(id); continue; } n++;
    if (norm(shown(d))===norm(r.effect) || (norm(r.effect)==='' && /^-?$/.test(norm(shown(d))))) eq++; else bad.push(id); }
  console.log(`official list: ${rs.length} deck cards and printings | in the sim: ${n} | shown text identical to the official text: ${eq}/${n}`);
  ok('every official deck card and printing is in the sim', !miss.length, miss.slice(0,8).join(' '));
  ok('every card shows its official text', !bad.length, bad.slice(0,8).join(' '));
}

console.log('== alternate-art printing checks ==');
console.log(`printings: ${printings.length} | with their own printed text: ${printings.filter(d=>d.printText).length} | reworded: ${worded}`);
console.log(`passed: ${pass} | failed: ${fail.length}`); for (const f of fail) console.log('  FAIL '+f);
console.log('Errors: '+(H.ERRORS.length+fail.length)); for (const e of H.ERRORS.slice(0,5)) console.log('  ERR', e.ctx, e.phase, e.msg);
