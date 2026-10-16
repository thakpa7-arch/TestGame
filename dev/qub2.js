const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document;
const R=[]; const t=(n,got,want)=>R.push((String(got)===String(want)?'  ok  ':'  !!  ')+n+'   got='+got+(String(got)===String(want)?'':'  want='+want));
// a Pilot with NO trigger text, so pairing leaves the board idle
const PLAIN_PILOT = A.GUNDAM_CARDS.find(d=>d.type==='pilot' && !A.parseTrigger(d.effect,'When Paired') && !A.parseTrigger(d.effect,'When Linked'));
function board(){ drainTasks();
  Object.assign(G,{turn:'player',turnNumber:3,phase:'main',mode:'idle',pending:null,over:false,selected:null,
    firstPlayer:'player',skipDrawSide:null,player:A.makeSide('player'),enemy:A.makeSide('enemy')});
  for(const s of [G.player,G.enemy]){ s.resMax=10; s.resAvail=10; s.base=null; s.deck=[]; s.shields=[]; } }
function qub(){ const u=A.makeCard(A.CARD_BY_ID.get('ST13-001'),'player'); u.sick=false; G.player.field.push(u); return u; }
function unit(who,lv,ap,hp,extra){ const u={uid:9e5+Math.floor(Math.random()*1e5),owner:who,def:'T',name:who[0]+ap+'/'+hp,
  type:'unit',color:'Blue',cost:1,lv:lv,trait:'(T)',link:[],effect:'',baseAp:ap,baseHp:hp,ap,hp,maxHp:hp,baseLv:lv,
  rested:false,sick:false,tempAp:0,battleAp:0,pilot:null,pilotCard:null,linked:false,blocker:false,firstStrike:false,
  highManeuver:false,breach:0,suppression:false,support:0,repair:0,token:false};
  Object.assign(u,extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; }
const el=id=>doc.getElementById(id);
// pairing may now ask how many tokens to deploy — always take the maximum in tests
function answerCount(){ let g=0; while(el('blockModal').classList.contains('show')&&g++<10){
  const b=el('blockBtns').children; el('blockModal').classList.remove('show');
  if(!b.length) break; b[b.length-1].onclick(); drainTasks(); } }
function pairPlain(u){ A.attachPilot(u, A.makeCard(PLAIN_PILOT,'player'), ()=>{}); drainTasks(); answerCount(); }
function toks(){ return G.player.field.filter(u=>u.token); }
function settle(){ answerCount(); let g=0; while(G.mode!=='idle'&&g++<25){ const p=G.pending;
  if (G.activateCands&&G.activateCands.length) A.fieldClick(G.activateCands[0]);
  else if (p&&p.cands&&p.cands.length) A.fieldClick(p.cands[0]);
  else { G.mode='idle'; G.pending=null; } drainTasks(); } }

console.log('plain pilot used:', PLAIN_PILOT.id, PLAIN_PILOT.name);

// A. pair payoff, clean board
board(); const qA=qub(); const hA=unit('player',2,2,2);
pairPlain(hA);
t('A pairing deploys tokens', toks().length, 2);
t('A board left idle', G.mode, 'idle');

// B. "1 to 2" — is the player offered a choice?
board(); const qB=qub(); const hB=unit('player',2,2,2);
A.attachPilot(hB, A.makeCard(PLAIN_PILOT,'player'), ()=>{}); drainTasks();
t('B a how-many choice was offered', el('blockModal').classList.contains('show'), true);
t('B options are 1 and 2', el('blockBtns').children.map(b=>b.innerHTML).join(','), '1,2');
el('blockBtns').children[0].onclick(); drainTasks();
t('B choosing 1 deploys exactly 1', toks().length, 1);

// C. the activate duel, fully driven
board(); const qC=qub(); const hC=unit('player',2,2,2); const eC=unit('enemy',3,3,3);
pairPlain(hC); settle();
t('C activate ready', A.activateReady(qC), true);
const res0=G.player.resAvail, eHp0=eC.hp, nTok=toks().length;
A.startActivate(qC); settle();
t('C ① paid', G.player.resAvail, res0-1);
t('C enemy took 2', eC.hp, eHp0-2);
t('C the duelling token died to 3 AP', toks().length, nTok-1);
t('C Qubeley untouched', qC.hp, 5);
t('C OPT burned', A.activateReady(qC), false);

// D. full battle area: is the 2nd token lost silently?
board(); const qD=qub();
for (let i=0;i<4;i++) unit('player',1,1,1);        // Qubeley + 4 = 5 of 6
const hD=G.player.field[1];
pairPlain(hD); settle();
t('D field at FIELD_MAX', G.player.field.length, 6);
t('D tokens that fit', toks().length, 1);

// E. tokens cannot attack and cannot be piloted
board(); const qE=qub(); const hE=unit('player',2,2,2);
pairPlain(hE); settle();
const tkE=toks()[0];
t('E token noPilot', tkE.noPilot, true);
t("E token can't attack", A.trashBlocksAttack(tkE,G.player), true);
t('E token trait is parenthesised', /^\(.*\)$/.test(String(tkE.trait||'')), true);

console.log('\n== Qubeley re-test ==');
R.forEach(r=>console.log(r));
console.log('\nfailures:', R.filter(r=>r.startsWith('  !!')).length);
