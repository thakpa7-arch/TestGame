// Chromium: start a real game with the Harsh Meta Slave Deck through the UI, then replay each reported card on the real page
// with real mouse clicks on cards and modal buttons.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FILE = process.argv[2] || require('path').resolve(__dirname,'../gundam-card-game.html');
(async()=>{
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const p=await b.newPage({ viewport:{ width:1280, height:900 } });
  const errs=[]; p.on('pageerror', e=>errs.push('ERR '+e.message));
  p.on('console', m=>{ const t=m.text(); if (m.type()==='error' && !/ERR_TUNNEL|Failed to load resource|net::/.test(t)) errs.push('CON '+t.slice(0,200)); });
  await p.route('**://images.weserv.nl/**', r=>r.abort());
  await p.goto('file://'+FILE); await p.waitForTimeout(400);
  await p.click('#startBtn'); await p.waitForTimeout(500);
  await p.click('text="Harsh Meta Slave Deck"'); await p.waitForTimeout(600);
  for (let i=0;i<30;i++){
    const done=await p.evaluate(()=>G.player.shields.length===6 && G.enemy.shields.length===6 && !document.querySelector('#blockModal.show'));
    const vis=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null).map(x=>(x.textContent||'').trim().slice(0,40)));
    const cand=vis.filter(t=>t && !/^(End Turn|Rules|🔊|← .*|⧉|Easy|Normal|Hard|＋DECKBUILDER)$/.test(t));
    if (done && !cand.length) break;
    if (cand.length){ const pick=cand.find(t=>/keep|start|go first|first|ok|continue|confirm|done|begin/i.test(t))||cand[0]; await p.click(`button:has-text("${pick.replace(/"/g,'\\"')}")`,{timeout:3000}).catch(()=>{}); }
    await p.waitForTimeout(500);
  }
  // board helper on the page
  const setup = async (turn, build)=>p.evaluate(({turn, build})=>{
    document.getElementById('blockModal').classList.remove('show');
    const mk=(id,who)=>makeCard(CARD_BY_ID.get(id), who);
    Object.assign(G,{ turn, phase:'main', mode:'idle', pending:null, selected:null, curBattle:null, curAttack:null, actionLock:false, cmdInFlight:null, turnSeq:(G.turnSeq||0)+1 });
    for (const s of [G.player,G.enemy]){ s.field=[]; s.hand=[]; s.trash=[]; s.resMax=10; s.resAvail=10; s.ex=0; s.base=exBaseToken(s.who); }
    window.__T = {};
    const put=(id,who,extra)=>{ const u=mk(id,who); u.sick=false; Object.assign(u, extra||{}); (who==='player'?G.player:G.enemy).field.push(u); return u; };
    const dummy=(who,ap,hp,extra)=>{ const u=mk('ST01-005',who)||mk('ST01-001',who); u.sick=false; u.baseAp=ap; u.ap=ap; u.baseHp=hp; u.hp=hp; u.maxHp=hp; u.name='Dummy '+ap+'/'+hp; Object.assign(u, extra||{}); u.effect=''; (who==='player'?G.player:G.enemy).field.push(u); return u; };
    (new Function('put','dummy','mk','T', build))(put, dummy, mk, window.__T);
    render(); return true; }, {turn, build});
  const clickCard = async (key)=>{ const uid=await p.evaluate(k=>window.__T[k].uid, key); await p.click(`.card[data-uid="${uid}"]`, { timeout:3000 }); await p.waitForTimeout(250); };
  const modal = async ()=>p.evaluate(()=>document.querySelector('#blockModal.show') ? { msg:document.getElementById('blockMsg').textContent, btns:[...document.querySelectorAll('#blockBtns button')].map(b=>b.textContent.trim()) } : null);
  const press = async (re)=>{ const m=await modal(); if(!m) return false; const t=m.btns.find(x=>new RegExp(re,'i').test(x)); if(!t) return false;
    await p.click(`#blockBtns button:has-text("${t.slice(0,25).replace(/"/g,'\\"')}")`, { timeout:3000 }); await p.waitForTimeout(350); return t; };
  const val = async (expr)=>p.evaluate(e=>(new Function('T','return ('+e+')'))(window.__T), expr);
  const out=[];
  const R=(name, ok, info)=>{ out.push((ok?'PASS ':'FAIL ')+name+(info?'  — '+info:'')); };

  // 1. Familial Love: you attack with Zeta, 4 cards in hand
  await setup('player', `T.z=put('GD06-035','player'); T.cb=put('GD06-045','player'); T.foe=dummy('enemy',1,9,{rested:true});
    G.player.hand=[mk('GD06-110','player'),mk('ST01-001','player'),mk('ST01-002','player'),mk('ST01-003','player')];`);
  await clickCard('z'); await clickCard('foe'); let m1=await modal(); await press('Familial'); let m2=await modal(); await press('Zeta'); await press('Pass');
  await p.waitForTimeout(600);
  R('Familial Love: AP+2 on the chosen Unit and draw at 4 cards', await val("T.foe.hp===3 && G.player.hand.length===4"), `foe hp ${await val('T.foe.hp')} hand ${await val('G.player.hand.length')} | ${m1&&m1.btns.join('/')} | ${m2&&m2.msg}`);
  // 2. Rivalry with Roux with ZZ in play, while the AI attacks your rested Core Top
  await setup('enemy', `T.zz=put('GD06-033','player'); T.ct=put('GD06-044','player',{rested:true}); T.atk=dummy('enemy',4,9); G.player.hand=[mk('GD06-112','player')];`);
  await p.evaluate(()=>resolveAiAttack(window.__T.atk, ()=>{}, window.__T.ct)); await p.waitForTimeout(500);
  let r1=await press('Rivalry'); await p.waitForTimeout(300); let mm=await modal(); if (mm && /choose/i.test(mm.msg)) await press('Dummy'); await press('Pass'); await p.waitForTimeout(600);
  R('Rivalry with Roux: 2 damage (+1 ZZ) to the battling enemy, then battle', await val("T.atk.hp<=9-3-4"), `attacker hp ${await val('T.atk.hp')} (9-3 Rivalry-4 Core Top battle+1 ZZ → 1) pressed=${r1}`);
  // 3. Argama (Red): AI attacks you directly, you have a rested Hyaku-Shiki
  await setup('enemy', `G.player.base=mk('GD06-125','player'); T.hs=put('GD06-046','player',{rested:true}); T.e1=dummy('enemy',3,9); T.e2=dummy('enemy',1,9);`);
  await p.evaluate(()=>{ G.aiForceFace=true; resolveAiAttack(window.__T.e1, ()=>{ G.aiForceFace=false; }, null); }); await p.waitForTimeout(500);
  let am=await modal(); if (am && /Argama/.test(am.msg)) await press('Dummy 3/9'); await press('Pass'); await p.waitForTimeout(500);
  R('Argama (Red): pings when it takes battle damage with a rested (AEUG) Unit', await val("T.e1.hp===8 || T.e2.hp===8"), `e1 ${await val('T.e1.hp')} e2 ${await val('T.e2.hp')} base ${await val('G.player.base&&G.player.base.hp')} modal=${am&&am.msg}`);
  // 4. Judau: Neo Core Fighter's 【Activate】 with Judau linked on Core Top, ZZ in hand
  await setup('player', `T.ncf=put('GD06-039','player'); T.ct=put('GD06-044','player'); T.cb=put('GD06-045','player'); attachPilot(T.ct, mk('GD06-088','player')); T.zz=mk('GD06-033','player'); G.player.hand=[T.zz, mk('ST01-001','player')];`);
  await clickCard('ncf'); await p.waitForTimeout(300);
  const ib=await p.evaluate(()=>[...document.querySelectorAll('#insBtns button')].map(b=>b.textContent.trim()));
  const act=ib.find(t=>/Deploy|Activate|⚡/.test(t)); if (act) await p.click(`#insBtns button:has-text("${act.slice(0,12)}")`); await p.waitForTimeout(500);
  for (let i=0;i<4;i++){ const mo=await modal(); if(!mo) break; if(!await press('ZZ|Neo Core|Confirm')) await press('.'); }
  R('Judau Ashta (linked on Core Top): Neo Core Fighter returns to hand; ZZ deployed', await val("G.player.hand.includes(T.ncf) && G.player.field.includes(T.zz)"), `viewer buttons ${ib.join('/')}`);
  // 5. Sazabi (AI) attacks your rested Core Top: you choose a non-battling Unit
  await setup('enemy', `T.sz=put('GD05-049','enemy'); T.f=dummy('enemy',1,1); T.ct=put('GD06-044','player',{rested:true}); T.hs=put('GD06-046','player'); T.rd=put('GD02-079','player',{rested:true});`);
  await p.evaluate(()=>resolveAiAttack(window.__T.sz, ()=>{}, window.__T.ct)); await p.waitForTimeout(500);
  const sm=await modal(); await press('Rick Dias'); for (let i=0;i<3;i++){ if(!await press("Don't|Pass")) break; }
  R('Sazabi: you choose which non-battling Unit to destroy (the attacked Unit is not offered)', !!(sm && sm.btns.some(t=>/Rick Dias/.test(t)) && !sm.btns.some(t=>/Core Top/.test(t))) && await val("!G.player.field.includes(T.rd) && G.player.field.includes(T.hs)"), sm&&sm.btns.join('/'));
  // 6. Hyaku-Shiki 【Attack】: you choose the Unit
  await setup('player', `T.ct=put('GD06-044','player'); T.cb=put('GD06-045','player'); T.h=put('GD06-046','player'); T.foe=dummy('enemy',1,9,{rested:true});`);
  await clickCard('h'); await clickCard('foe'); const hm=await modal(); await press('Core Base'); await press('Pass'); await p.waitForTimeout(400);
  R('Hyaku-Shiki: you choose who gets AP+2', await val("effAp(T.cb)===5 && effAp(T.ct)===3"), hm&&hm.msg);
  console.log(out.join('\n')); console.log('JS ERRORS:', errs.length? errs.join(' | ') : 'none');
  await b.close();
})();
