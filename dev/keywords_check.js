// Keyword mechanics, checked against the printed reminder text rather than against the engine's own
// assumptions. Each case builds a tiny board and asserts the outcome.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const el=id=>global.document.getElementById(id);
let pass=0; const fail=[];
function ok(name, cond, extra){ if(cond) pass++; else fail.push(name+(extra?'  ('+extra+')':'')); }
function fresh(){
  drainTasks();   // flush anything a previous case left queued, or it fires into the next board
  Object.assign(G,{turn:'player',turnNumber:3,phase:'main',mode:'idle',pending:null,over:false,
    selected:null,firstPlayer:'player',skipDrawSide:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy'),playerDeckName:'T',enemyDeckName:'T'});
  for(const s of [G.player,G.enemy]){
    s.resMax=10; s.resAvail=10; s.base=null;   // no Base: shield tests must reach the shields
    // Burst-free cards only: a Burst can take another Shield to hand, which would muddy the counts.
    const plainCards = A.GUNDAM_CARDS.filter(d=>!A.makeCard(d, s.who).burst);
    s.deck=[]; for(let i=0;i<24;i++) s.deck.push(A.makeCard(plainCards[(i*7)%plainCards.length], s.who));
    s.shields=[]; for(let i=0;i<6;i++) s.shields.push(s.deck.pop());
  }
}
function stick(who, ap, hp, extra){
  const c = { uid: 900000 + Math.floor(Math.random()*100000), owner:who, def:'TEST', name:`Test ${ap}/${hp}`,
    type:'unit', color:'Blue', cost:1, lv:1, trait:'(Test)', link:[], effect:'',
    baseAp:ap, baseHp:hp, ap, hp, maxHp:hp, rested:false, sick:false, tempAp:0, battleAp:0,
    pilot:null, pilotCard:null, linked:false, blocker:false, firstStrike:false, highManeuver:false,
    breach:0, suppression:false, support:0, repair:0, token:false };
  Object.assign(c, extra||{});
  (who==='player'?G.player:G.enemy).field.push(c);
  return c;
}
// First Strike
fresh(); { const atk=stick('player',3,2,{firstStrike:true}); const def=stick('enemy',5,3,{rested:true}); const h=atk.hp;
  A.battle(atk,def,G.player,G.enemy); drainTasks();
  ok('First Strike: attacker survives after killing the defender', atk.hp===h, `hp ${h}->${atk.hp}`);
  ok('First Strike: defender was destroyed', !G.enemy.field.includes(def)); }
fresh(); { const atk=stick('player',2,5,{firstStrike:true}); const def=stick('enemy',4,6,{rested:true});
  A.battle(atk,def,G.player,G.enemy); drainTasks();
  ok('First Strike: a surviving defender still hits back', atk.hp===1, 'atk hp='+atk.hp);
  ok('First Strike: defender took the attacker AP', def.hp===4, 'def hp='+def.hp); }
// High-Maneuver / Blocker
fresh(); { const atk=stick('player',3,3,{highManeuver:true}); stick('enemy',2,4,{blocker:true}); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('High-Maneuver: a Blocker does not intercept', G.enemy.shields.length<s0, `shields ${s0}->${G.enemy.shields.length}`); }
fresh(); { const atk=stick('player',3,3); const blk=stick('enemy',2,4,{blocker:true}); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('Blocker: an active Blocker can intercept', blk.rested||blk.hp<4||G.enemy.shields.length===s0); }
fresh(); { const atk=stick('player',3,3); stick('enemy',2,4,{blocker:true,rested:true}); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('Blocker: a RESTED Blocker cannot intercept', G.enemy.shields.length<s0); }
// Breach
fresh(); { const atk=stick('player',4,5,{breach:3}); const def=stick('enemy',1,2,{rested:true}); const s0=G.enemy.shields.length;
  A.battle(atk,def,G.player,G.enemy); drainTasks();
  ok('Breach: the defender died', !G.enemy.field.includes(def));
  ok('Breach: the first shield was hit', G.enemy.shields.length<s0, `shields ${s0}->${G.enemy.shields.length}`); }
fresh(); { const atk=stick('player',1,5,{breach:3}); const def=stick('enemy',1,9,{rested:true}); const s0=G.enemy.shields.length;
  A.battle(atk,def,G.player,G.enemy); drainTasks();
  ok('Breach: no shield hit when the defender survives', G.enemy.shields.length===s0); }
// Repair
fresh(); { const u=stick('player',2,5,{repair:2}); u.hp=1; A.endTurn(); drainTasks();
  ok('Repair: heals at the end of your turn', u.hp===3, 'hp='+u.hp); ok('Repair: never exceeds max HP', u.hp<=A.effMaxHp(u)); }
fresh(); { const u=stick('enemy',2,5,{repair:2}); u.hp=1; A.endTurn();
  ok("Repair: does not heal at the end of YOUR turn", u.hp===1, 'hp='+u.hp); }
// Support
// <Support N> is 【Activate･Main】 Rest this Unit: one of your other Units gets AP+N this turn (13-1-3-1) — used in the
// main phase, before an attack is declared. (a) Offered when the chosen target needs it:
fresh(); { const atk=stick('player',2,5); const helper=stick('player',1,3,{support:2}); const def=stick('enemy',1,4,{rested:true});
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(def.uid);
  const asked=el('blockModal').classList.contains('show') && /Support/.test(el('blockMsg').innerHTML);
  const notYetDeclared=!atk.rested;                       // the offer comes before the attack is declared
  if (asked) el('blockBtns').children[0].onclick(); drainTasks();
  ok('Support: offered before the attack is declared', asked && notYetDeclared);
  ok('Support: the helper rested', helper.rested===true); ok('Support: the boost let the attacker kill', !G.enemy.field.includes(def)); }
// (b) Used from the Unit itself in the main phase
fresh(); { const a=stick('player',2,5); const helper=stick('player',1,3,{support:2});
  G.mode='support-target'; G.pending={ src:helper }; A.fieldClick(a.uid);
  ok('Support: activated from the Unit gives another Unit AP+N this turn', helper.rested && A.effAp(a)===4 && G.mode==='idle'); }
fresh(); { const atk=stick('player',2,5); stick('player',1,3,{support:2,rested:true}); const def=stick('enemy',1,4,{rested:true});
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(def.uid); drainTasks();
  ok('Support: a rested helper cannot be used', !el('blockModal').classList.contains('show') && (def.hp===2||G.enemy.field.includes(def))); }
// Suppression vs plain
fresh(); { const atk=stick('player',2,3,{suppression:true}); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('Suppression: two shields break at once', G.enemy.shields.length===s0-2, `shields ${s0}->${G.enemy.shields.length}`); }
fresh(); { const atk=stick('player',2,3); const s0=G.enemy.shields.length;
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('a plain attack breaks exactly one shield', G.enemy.shields.length===s0-1); }
// Base guards shields
fresh(); { const bd=A.GUNDAM_CARDS.find(d=>d.type==='base'&&(d.hp||0)>=4); const bs=A.makeCard(bd,'enemy'); bs.rested=false; bs.sick=false; G.enemy.base=bs;
  const bhp=bs.hp, s0=G.enemy.shields.length; const atk=stick('player',2,3);
  G.selected=atk.uid; G.mode='attack-target'; A.attackDirect(); drainTasks();
  ok('Base absorbs the hit before the shields', G.enemy.shields.length===s0);
  ok('Base took the damage', (G.enemy.base?G.enemy.base.hp:0)===bhp-2||G.enemy.base===null); }
// attack legality
fresh(); { const atk=stick('player',3,3); const active=stick('enemy',2,2,{rested:false});
  G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(active.uid); drainTasks();
  ok('cannot attack an ACTIVE enemy Unit', active.hp===2&&G.enemy.field.includes(active));
  active.rested=true; G.selected=atk.uid; G.mode='attack-target'; A.fieldClick(active.uid); drainTasks();
  ok('can attack a RESTED enemy Unit', !G.enemy.field.includes(active)||active.hp<2); }
// Lv requirement uses total resources
fresh(); { const s=G.player; const hi=A.GUNDAM_CARDS.find(d=>d.type==='unit'&&(d.lv||0)>=7&&(d.cost||0)<=5); const c=A.makeCard(hi,'player'); s.hand.push(c);
  s.resMax=5; s.ex=0; s.resAvail=5; ok(`Lv${hi.lv} card is blocked at 5 resources`, !!A.affordIssue(s,c));
  s.resMax=hi.lv; s.resAvail=hi.cost; ok(`Lv${hi.lv} card is playable at ${hi.lv} resources`, !A.affordIssue(s,c), A.affordIssue(s,c));
  s.resAvail=Math.max(0,hi.cost-1); ok('…but not without enough available resources', !!A.affordIssue(s,c)); }
console.log('\n== keyword & core-rule checks ==');
console.log('passed:', pass, '| failed:', fail.length);
fail.forEach(f=>console.log('  ! '+f));
