// Un-bracketed "While <condition>, …" abilities: keyword grants, stat buffs and hand cost/Lv reductions
// must switch on and off with the board state they name.
const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const R=[]; const t=(n,got,want)=>R.push((String(got)===String(want)?'  ok  ':'  !!  ')+n+'   got='+got+(String(got)===String(want)?'':'  want='+want));
function board(){ drainTasks();
  Object.assign(G,{turn:'player',turnNumber:3,phase:'main',mode:'idle',pending:null,over:false,selected:null,
    player:A.makeSide('player'),enemy:A.makeSide('enemy')});
  for(const s of [G.player,G.enemy]){ s.resMax=5; s.resAvail=5; s.ex=0; s.base=null; s.deck=[]; s.shields=[]; } }
function put(id,who){ const u=A.makeCard(A.CARD_BY_ID.get(id),who); u.sick=false; (who==='player'?G.player:G.enemy).field.push(u); return u; }
function stick(who,trait,lv){ const u={uid:9e5+Math.floor(Math.random()*1e5),owner:who,def:'T',name:'S',type:'unit',color:'Blue',cost:1,lv:lv||1,trait:trait||'(T)',
  link:[],effect:'',baseAp:1,baseHp:1,ap:1,hp:1,maxHp:1,baseLv:lv||1,rested:false,sick:false,tempAp:0,battleAp:0,pilot:null,pilotCard:null,linked:false,
  blocker:false,firstStrike:false,highManeuver:false,breach:0,suppression:false,support:0,repair:0,token:false};
  (who==='player'?G.player:G.enemy).field.push(u); return u; }

// Byarlant Custom: <Blocker> while 4+ enemy Units
board(); const by=put('GD01-019','player');
t('Byarlant: no Blocker vs 3 enemies', (stick('enemy'),stick('enemy'),stick('enemy'),A.effBlocker(by)), false);
stick('enemy'); t('Byarlant: Blocker vs 4 enemies', A.effBlocker(by), true);
// Gaelio's Schwalbe Graze: <Blocker> while another (Gjallarhorn) Unit
board(); const gg=put('GD02-082','player');
t('Schwalbe: no Blocker alone', A.effBlocker(gg), false);
stick('player','(Gjallarhorn)'); t('Schwalbe: Blocker with a (Gjallarhorn) friend', A.effBlocker(gg), true);
// Duel Gundam: <Breach 3> while 5+ AP
board(); const du=put('GD01-054','player');
t('Duel: Breach off below 5 AP', A.effBreach(du), 0);
du.tempAp = 5 - A.effAp(du); t('Duel: Breach 3 at 5 AP', A.effBreach(du), 3);
// Barbatos 6th Form: <Repair 3> while at 1 HP
board(); const b6=put('GD03-061','player');
t('Barbatos 6th: no Repair at full HP', A.effRepair(b6), 0);
b6.hp=1; t('Barbatos 6th: Repair 3 at 1 HP', A.effRepair(b6), 3);
// Barbatos 2nd Form: AP+2 while damaged
board(); const b2=put('ST05-002','player'); const ap0=A.effAp(b2);
b2.hp -= 1; t('Barbatos 2nd: AP+2 when damaged', A.effAp(b2), ap0+2);
b2.hp = A.effMaxHp(b2); t('Barbatos 2nd: back to base when healed', A.effAp(b2), ap0);
// AGE-1 Titus: AP+2 while you are Lv.7+
board(); const ti=put('GD02-031','player'); const tap=A.effAp(ti);
t('Titus: no buff at Lv5', A.effAp(ti), tap); G.player.resMax=7; t('Titus: AP+2 at Lv7', A.effAp(ti), tap+2);
// Jegan: cost -1 in hand while 2+ (Earth Federation) Units
board(); const jg=A.makeCard(A.CARD_BY_ID.get('GD01-016'),'player'); G.player.hand.push(jg);
t('Jegan: full cost with 1 EF unit', (stick('player','(Earth Federation)'),A.effectiveCost(G.player,jg)), jg.cost);
stick('player','(Earth Federation)'); t('Jegan: cost -1 with 2 EF units', A.effectiveCost(G.player,jg), jg.cost-1);
// Destroy Gundam: Lv -3 and cost -3 while the enemy trash has 7+
board(); const dg=A.makeCard(A.CARD_BY_ID.get('GD05-037'),'player'); G.player.hand.push(dg);
G.player.resMax = dg.lv-3; G.player.resAvail = dg.cost-3;
t('Destroy Gundam: blocked by Lv without the trash gate', !!A.affordIssue(G.player,dg), true);
for(let i=0;i<7;i++) G.enemy.trash.push(A.makeCard(A.CARD_BY_ID.get('ST01-003'),'enemy'));
t('Destroy Gundam: playable at Lv-3 / cost-3 with 7 in enemy trash', A.affordIssue(G.player,dg), null);
// Akatsuki: Lv-1 and cost-1 per (Orb) Unit while no Lv6+ Unit
board(); const ak=A.makeCard(A.CARD_BY_ID.get('GD05-004'),'player'); G.player.hand.push(ak);
stick('player','(Orb)'); stick('player','(Orb)');
t('Akatsuki: cost -2 with two (Orb) Units', A.effectiveCost(G.player,ak), Math.max(0,ak.cost-2));
stick('player','(Orb)',6); t('Akatsuki: reduction off once a Lv6+ Unit is out', A.effectiveCost(G.player,ak), ak.cost);
// Kyrios (Tail Unit): cost -1 while a (CB) Link Unit is in play
board(); const ky=A.makeCard(A.CARD_BY_ID.get('GD03-030'),'player'); G.player.hand.push(ky);
const cb=stick('player','(CB)'); t('Kyrios: full cost with an unlinked (CB) Unit', A.effectiveCost(G.player,ky), ky.cost);
cb.linked=true; cb.pilot={name:'x',pAp:0,pHp:0}; t('Kyrios: cost -1 with a (CB) LINK Unit', A.effectiveCost(G.player,ky), ky.cost-1);
// reductions never apply when there is no game (card instantiation must not crash)
t('makeCard outside a game is safe', (()=>{ try{ G.player=null; const c=A.makeCard(A.CARD_BY_ID.get('GD01-019'),'player'); A.effBlocker(c); return 'ok'; }catch(e){ return e.message; } })(), 'ok');
console.log('\n== while-condition abilities =='); R.forEach(r=>console.log(r)); console.log('\nfailures:', R.filter(r=>r.startsWith('  !!')).length);
