const H=require('./harness.js'); const {A,drainTasks}=H; const G=A.G;
const doc=global.document; const el=id=>doc.getElementById(id);
const R=[]; const t=(n,got,want)=>R.push((String(got)===String(want)?'  ok  ':'  !!  ')+n+'   got='+got+(String(got)===String(want)?'':'  want='+want));
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
function tok(ap,hp){ const k=A.makeToken({name:'Bit / Funnel',trait:'(Long-Range Weapon)',ap,hp},'player');
  k.sick=false; G.player.field.push(k); return k; }

// --- the player is asked WHICH token, and the one they pick is the one that fights ---
board(); const q=qub();
const small=tok(1,1), big=tok(4,4);          // auto-pick would always take `big`
const foe=unit('enemy',3,2,9);
A.startActivate(q); drainTasks();
t('asked which token', G.mode, 'activate-cost');
t('both tokens offered', (G.activateCands||[]).length, 2);
t('prompt names the duel', /duel/i.test(el('prompt').innerHTML||el('prompt').textContent||''), true);
A.fieldClick(small.uid); drainTasks();          // deliberately pick the WEAK one
t('now picking the enemy', G.mode, 'activate-target');
A.fieldClick(foe.uid); drainTasks();
t('the token I PICKED fought (1 dmg dealt)', foe.hp, 8);
t('the small token took 2 and died', G.player.field.includes(small), false);
t('the big token was untouched', big.hp, 4);

// --- one token: no prompt, straight to the enemy ---
board(); const q2=qub(); const only=tok(2,2); const foe2=unit('enemy',3,3,3);
A.startActivate(q2); drainTasks();
t('single token skips the prompt', G.mode, 'activate-target');
A.fieldClick(foe2.uid); drainTasks();
t('single token duelled', foe2.hp, 1);

// --- the AI still auto-picks its biggest ---
board(); const qa=A.makeCard(A.CARD_BY_ID.get('ST13-001'),'enemy'); qa.sick=false; G.enemy.field.push(qa);
const aSmall=A.makeToken({name:'Bit / Funnel',trait:'(Long-Range Weapon)',ap:1,hp:1},'enemy'); aSmall.sick=false; G.enemy.field.push(aSmall);
const aBig=A.makeToken({name:'Bit / Funnel',trait:'(Long-Range Weapon)',ap:4,hp:4},'enemy'); aBig.sick=false; G.enemy.field.push(aBig);
const mine=unit('player',3,1,9);
A.applyActivateEffect(qa, mine, G.enemy, null); drainTasks();
t('AI used its biggest token (4 dmg)', mine.hp, 5);

// --- damage prevention now applies inside the duel ---
board(); const q4=qub(); const tk4=tok(2,5);
const fa=A.makeCard(A.CARD_BY_ID.get('ST14-006'),'enemy'); fa.sick=false; fa.pilot={name:'x',pAp:0,pHp:0}; G.enemy.field.push(fa);
const hp0=fa.hp;
A.applyActivateEffect(q4, fa, G.player, tk4); drainTasks();
t('ST14-006 prevented the weak duel damage', fa.hp, hp0);

console.log('\n== Qubeley: choosing the duellist ==');
R.forEach(r=>console.log(r));
console.log('\nfailures:', R.filter(r=>r.startsWith('  !!')).length);
