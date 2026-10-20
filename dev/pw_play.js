// Browser smoke (NG=<games>, default 4): start real games through the UI (title → deck pick → dice → mulligans), then play by
// deploying what's affordable, attacking, answering every modal, and ending turns. Reports JS errors.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const errs=[]; const results=[];
  for (let g=0; g<(+process.env.NG||4); g++){
    const p=await b.newPage({ viewport:{ width:1280, height:860 } });
    p.on('pageerror', e=>errs.push('G'+g+' ERR '+e.message));
    p.on('console', m=>{ const t=m.text(); if (m.type()==='error' && !/ERR_TUNNEL|Failed to load resource|net::/.test(t)) errs.push('G'+g+' CON '+t.slice(0,200)); });
    await p.route('**://images.weserv.nl/**', r=>r.abort());
    await p.goto('file://'+require('path').resolve(__dirname,'../gundam-card-game.html')); await p.waitForTimeout(400);
    await p.click('#startBtn'); await p.waitForTimeout(500);
    const decks = await p.evaluate(()=>PRESET_DECKS.map(d=>d.name));
    await p.click(`text="${decks[(g*2) % decks.length]}"`); await p.waitForTimeout(600);
    const setupLog=[];
    for (let i=0;i<40;i++){
      const st = await p.evaluate(()=>({ hand:G.player.hand.length, sh:G.player.shields.length, enemySh:G.enemy.shields.length, mode:G.mode }));
      const vis = await p.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null).map(x=>(x.textContent||'').trim().slice(0,40)));
      const skip=/^(End Turn|Rules|🔊|← .*|⧉|Easy|Normal|Hard|＋DECKBUILDER)$/;
      const cand=vis.filter(t=>t && !skip.test(t));
      if (st.sh===6 && st.enemySh===6 && !cand.length) break;           // dealt and no setup prompt left
      if (cand.length){
        const pick=cand.find(t=>/keep|start|go first|first|ok|continue|confirm|done/i.test(t)) || cand[0];
        setupLog.push(pick);
        await p.click(`button:has-text("${pick.replace(/"/g,'\\"')}")`, { timeout:3000 }).catch(()=>{});
      }
      await p.waitForTimeout(700);
    }
    results.push({ setup: setupLog.join(' > ') });
    let steps=0, turns=0, waits=0, stallInfo=null;
    for (; steps<1400; steps++){
      const st = await p.evaluate(()=>({ over:G.over, turn:G.turn, mode:G.mode, modal:document.getElementById('blockModal').classList.contains('show'),
        overlay:!!document.querySelector('.modal-overlay'), turnNo:G.turnNumber }));
      if (st.over) break;
      const did = await p.evaluate(()=>{
        const rnd = (n)=>Math.floor(Math.random()*n);
        // any modal: answer it
        if (document.getElementById('blockModal').classList.contains('show')){
          const bs=[...document.getElementById('blockBtns').children]; if (bs.length){ bs[rnd(bs.length)].click(); return 'modal'; } }
        const ov=document.querySelector('.modal-overlay');
        if (ov){ const items=[...ov.querySelectorAll('*')].filter(x=>x.offsetParent!==null && (x.matches('.card, button') || x.onclick)); if (items.length){ items[rnd(items.length)].click(); return 'overlay'; } }
        if (G.turn!=='player' && G.mode==='idle') return 'wait';
        if (G.mode!=='idle'){
          // targeting / choosing: click a highlighted Unit, or Cancel
          const sel=[...document.querySelectorAll('.selectable, .targetable')].filter(x=>x.offsetParent!==null);
          if (sel.length && (G.mode==='discard' || Math.random()<0.85)){ sel[rnd(sel.length)].click(); return 'select'; }   // a discard must be made
          const c=document.getElementById('cancelBtn'); if (c && c.offsetParent!==null){ c.click(); return 'cancel'; }
          if (G.turn!=='player') return 'wait';
          return 'stuck:'+G.mode;
        }
        // idle on our turn: play something affordable, attack, or end the turn
        const r=Math.random();
        if (r<0.45){ const h=G.player.hand.filter(c=>!affordIssue(G.player,c)); if (h.length){ playFromHand(h[rnd(h.length)].uid, true); return 'play'; } }
        if (r<0.8){ const a=G.player.field.filter(u=>!u.rested && !u.sick && u.ap>0 && !trashBlocksAttack(u,G.player));
          if (a.length){ const u=a[rnd(a.length)]; G.selected=u.uid; G.mode='attack-target';
            const tg=G.enemy.field.filter(t=>t.rested && t.hp>0); if (tg.length && Math.random()<0.5) fieldClick(tg[rnd(tg.length)].uid); else attackDirect(); return 'attack'; } }
        document.getElementById('endTurnBtn').click(); return 'end';
      });
      if (did==='end') turns++;
      (global.DID=global.DID||{})[did]=(global.DID[did]||0)+1;
      if (did==='wait') waits++; else waits=0;
      if (waits>120){ stallInfo = await p.evaluate(()=>({ turn:G.turn, mode:G.mode, pending:G.pending?Object.keys(G.pending):null, modal:document.getElementById('blockModal').classList.contains('show'), overlay:!!document.querySelector('.modal-overlay'), cancelVisible:(document.getElementById('cancelBtn')||{}).offsetParent!==null, prompt:(document.getElementById('prompt')||{}).textContent, aiGuard:G._aiGuard, log:[...document.querySelectorAll('#log > *')].slice(0,10).map(e=>e.textContent.slice(0,140)) })); break; }
      if (/^stuck/.test(did)){ await p.evaluate(()=>{ clearSel(); render(); }); }
      await p.waitForTimeout(did==='wait' ? 250 : 60);
    }
    const fin = await p.evaluate(()=>({ over:G.over, winner:G.winner, turnNo:G.turnNumber, deck:G.playerDeckName+' vs '+G.enemyDeckName, turn:G.turn, mode:G.mode, modal:document.getElementById('blockModal').classList.contains('show'), overlay:!!document.querySelector('.modal-overlay'), prompt:(document.getElementById('prompt')||{}).textContent, logTail:[...document.querySelectorAll('#log > *')].slice(-8).map(e=>e.textContent.slice(0,120)) }));
    fin.did=global.DID; global.DID={};
    results.push(Object.assign(fin, { steps, turns, stallInfo }));
    await p.close();
  }
  console.log(JSON.stringify(results));
  console.log('JS ERRORS:', errs.length ? errs.slice(0,20).join(' | ') : 'none');
  await b.close();
})();
