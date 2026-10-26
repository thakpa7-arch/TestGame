// Optional costs with nothing to buy: "You may discard 2. If you do, choose 1 enemy Unit…" (Strike Freedom GD05-002) isn't
// offered when there's no enemy Unit, and still is when there is one.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(){
  drainTasks();
  el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  Object.assign(G,{turn:'player',turnNumber:3,turnSeq:(G.turnSeq||0)+1,phase:'main',mode:'idle',pending:null,over:false,winner:null,
    selected:null,firstPlayer:'player',skipDrawSide:null,aiForceFace:false,actionLock:false,cmdInFlight:null,curBattle:null,curAttack:null,effSrc:null,retarget:null,
    endStepDone:false,player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.ex=0; s.base=null; s.hadTurn=true; s.resourceDeck=0; s.hand=[];
    const plain = A.GUNDAM_CARDS.filter(d=>d.type==='unit' && !A.makeCard(d, s.who).burst && !/【/.test(d.effect||''));
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plain[(i*7)%plain.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
    s.hand=s.deck.splice(0,4);
  }
}
const card=(id, who)=>{ const c=A.makeCard(A.CARD_BY_ID.get(id), who); c.sick=false; return c; };
const put=(id, who)=>{ const u=card(id, who); (who==='player'?G.player:G.enemy).field.push(u); return u; };
// A Pilot with no 【Attack】 / pairing trigger of its own, so Strike Freedom's 【Attack】 is the only thing asking.
const plainPilot=[...A.CARD_BY_ID.values()].find(d=>d.type==='pilot' && !/【(Attack|When Paired|When Linked)】/.test(d.effect||'') && !/^Kira/.test(d.name) && !/-p\d+$/.test(d.id));
function attackWith(enemyUnit){
  fresh(); const sf=put('GD05-002','player'); A.attachPilot(sf, A.makeCard(plainPilot, 'player')); drainTasks(); sf.sick=false; sf.rested=false;
  let foe=null; if (enemyUnit) foe=put('ST01-001','enemy');
  el('blockModal').classList.remove('show'); el('blockBtns').innerHTML='';
  G.selected=sf.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  const btns=[...el('blockBtns').children].map(b=>b.textContent);
  return { shown: el('blockModal').classList.contains('show') && btns.some(t=>/^Discard 2/.test(t)), hand:G.player.hand.length, btns, foe };
}
{ const r=attackWith(false);
  ok('Strike Freedom: no enemy Unit → the "discard 2" option is not offered', !r.shown, JSON.stringify(r.btns));
  ok('Strike Freedom: no enemy Unit → no cards are discarded', r.hand===4, 'hand '+r.hand); }
{ const r=attackWith(true);
  ok('Strike Freedom: an enemy Unit → the "discard 2" option is offered', r.shown, JSON.stringify(r.btns));
  const yes=[...el('blockBtns').children].find(b=>/^Discard 2/.test(b.textContent)); if (yes) yes.onclick(); drainTasks();
  ok('Strike Freedom: taking the offer asks for the 2 cards to discard', G.mode==='discard' && G.pending && G.pending.discardLeft===2, `mode ${G.mode}`); }
console.log('passed: '+pass+' | failed: '+fail.length); for(const f of fail) console.log('  ! '+f);
console.log('Errors: '+H.ERRORS.length);
