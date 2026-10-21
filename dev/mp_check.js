// Online multiplayer end-to-end (Chromium): host + guest + spectator in three browser contexts through the real UI — lobby, room code,
// deck picks, dice, mulligans, then a random game where every page answers its own prompts (block / Burst / action hand-offs).
// Needs the PeerJS broker (0.peerjs.com) to be reachable. Reports JS errors.
// Usage: node mptest.js <outdir> [maxSteps]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
(async()=>{
  const out=path.resolve(process.argv[2]||'mpshots'); fs.mkdirSync(out,{recursive:true});
  const MAX=+process.argv[3]||600;
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const errs=[]; const pages={};
  const mk=async(name)=>{ const ctx=await b.newContext({ viewport:{ width:1280, height:860 } }); const p=await ctx.newPage();
    p.on('pageerror', e=>errs.push(name+' ERR '+e.message));
    p.on('console', m=>{ const t=m.text(); if (m.type()==='error' && !/ERR_TUNNEL|Failed to load resource|net::|WebSocket/.test(t)) errs.push(name+' CON '+t.slice(0,200)); });
    await p.route('**://images.weserv.nl/**', r=>r.abort());
    await p.goto('file://'+path.resolve(__dirname,'../gundam-card-game.html')); await p.waitForTimeout(400);
    await p.evaluate(()=>{ window.__rv=[]; const _rd=revealDraw; revealDraw=(c,t)=>{ __rv.push([c&&c.name,t||'DREW',G.turnNumber+G.turn[0],Math.round(performance.now()/100)/10, new Error().stack.split('\n').slice(2,4).map(x=>x.trim().replace(/\(.*\//,'(')).join(' <- ')]); _rd(c,t); }; window.__prompts=[]; });
    pages[name]=p; return p; };
  const H=await mk('host'), U=await mk('guest'), S=await mk('spec');
  const rnd=n=>Math.floor(Math.random()*n);
  // ---- lobby ----
  await H.click('#mpBtn'); await H.fill('#mpName','Alice'); await H.click('#mpCreate');
  await H.waitForFunction(()=>NET.open && NET.code.length===5, null, { timeout:20000 });
  const code=await H.evaluate(()=>NET.code); console.log('room code', code);
  await H.screenshot({ path:path.join(out,'01_host_lobby.png') });
  await U.click('#mpBtn'); await U.fill('#mpName','Bob'); await U.fill('#mpCode', code); await U.click('#mpJoin');
  await U.waitForFunction(()=>NET.role==='guest' && NET.names.host==='Alice', null, { timeout:20000 });
  await S.click('#mpBtn'); await S.fill('#mpName','Carol'); await S.fill('#mpCode', code); await S.click('#mpWatch');
  await S.waitForFunction(()=>NET.role==='spec' && NET.names.host==='Alice', null, { timeout:20000 });
  await H.waitForFunction(()=>NET.names.guest==='Bob' && NET.specNames.includes('Carol'), null, { timeout:10000 });
  await H.screenshot({ path:path.join(out,'02_host_lobby_full.png') }); await U.screenshot({ path:path.join(out,'03_guest_lobby.png') });
  const lobby=await U.evaluate(()=>document.getElementById('setupModal').innerText.replace(/\s+/g,' ').slice(0,300));
  console.log('guest lobby:', lobby);
  // ---- decks ----
  await U.click('#mpPickDeck'); await U.waitForSelector('.mp-deck-p'); await U.click('.mp-deck-p >> nth=1');
  await H.click('#mpPickDeck'); await H.waitForSelector('.mp-deck-p'); await H.click('.mp-deck-p >> nth=0');
  await H.waitForFunction(()=>NET.started, null, { timeout:10000 });
  // ---- setup + game loop: every page answers whatever is in front of it; the active engine plays ----
  const stats={ steps:0, hops:{}, turns:0, blocks:0 };
  let lastTurnKey=''; let forcedLeft=3, forcedNext=0;
  for (let step=0; step<MAX; step++){
    stats.steps++;
    let overAll=true;
    for (const [name,p] of Object.entries(pages)){
      const did=await p.evaluate(()=>{
        const rnd=n=>Math.floor(Math.random()*n);
        const vis=x=>x && x.offsetParent!==null;
        // setup prompts (dice / mulligan / shields)
        for (const id of ['goFirst','keepHand','beginBtl']){ const e=document.getElementById(id); if (vis(e)){ e.click(); return 'setup:'+id; } }
        if (document.getElementById('blockModal').classList.contains('show')){
          const msg=document.getElementById('blockMsg').textContent; if (!window.__lastMsg || window.__lastMsg!==msg){ window.__prompts.push(msg.slice(0,70)); window.__lastMsg=msg; }
          const bs=[...document.getElementById('blockBtns').children]; if (!bs.length) return 'modal-empty';
          let pick = /Activate its 【Burst】|Support|choose 1 of your Units/.test(msg) ? bs[0] : bs[rnd(bs.length)];
          if (/Intercept with a/.test(msg)) { window.__blocks=(window.__blocks||0)+1; pick = Math.random()<0.6 ? bs[0] : bs[bs.length-1]; }
          pick.click(); return 'modal:'+msg.slice(0,40); }
        const ov=document.querySelector('.modal-overlay');
        if (ov){ const items=[...ov.querySelectorAll('*')].filter(x=>(x.matches('.card, button') || typeof x.onclick==='function') && !x.disabled && vis(x)); if (items.length){ items[rnd(items.length)].click(); return 'overlay'; } }
        if (G.over) return 'over';
        if (!NET.active) return 'watch';
        if (NET.inHop) return 'hop-wait';
        const sm=document.getElementById('setupModal'); if (sm && getComputedStyle(sm).display!=='none') return 'setup-wait';   // dice tumbling / hands being dealt
        if (G.turn!=='player') return 'wait';
        if (G.mode!=='idle'){
          const sel=[...document.querySelectorAll('.selectable, .targetable')].filter(vis);
          if (sel.length && (G.mode==='discard' || Math.random()<0.85)){ sel[rnd(sel.length)].click(); return 'select'; }
          const c=document.getElementById('cancelBtn'); if (vis(c)){ c.click(); return 'cancel'; }
          return 'stuck:'+G.mode;
        }
        if (G.phase==='end') return 'endphase';
        const r=Math.random();
        if (r<0.45){ const h=G.player.hand.filter(c=>!affordIssue(G.player,c)); if (h.length){ playFromHand(h[rnd(h.length)].uid, true); return 'play'; } }
        if (r<0.85){ const a=G.player.field.filter(u=>!u.rested && !u.sick && u.ap>0 && !trashBlocksAttack(u,G.player));
          if (a.length){ const u=a[rnd(a.length)]; G.selected=u.uid; G.mode='attack-target';
            const tg=G.enemy.field.filter(t=>t.rested && t.hp>0); if (tg.length && Math.random()<0.5) fieldClick(tg[rnd(tg.length)].uid); else attackDirect(); return 'attack'; } }
        endTurn(); return 'endTurn';
      }).catch(e=>'evalerr:'+e.message);
      if (did!=='over') overAll=false;
      if (/^modal:/.test(did)) { const m=await p.evaluate(()=>window.__lastMsg||''); if (/Intercept/.test(m)) stats.blocks++; }
      if (did.startsWith('evalerr')) errs.push(name+' '+did);
    }
    if (step>=10 && forcedLeft>0 && step>=forcedNext){
      for (const [name,p] of Object.entries(pages)){
        const did=await p.evaluate(()=>{
          if (!NET.active || NET.inHop || G.turn!=='player' || G.mode!=='idle' || G.phase==='end' || G.over || document.getElementById('blockModal').classList.contains('show')) return null;
          const sm=document.getElementById('setupModal'); if (sm && getComputedStyle(sm).display!=='none') return null;   // still setting up
          const blkDef=GUNDAM_CARDS.filter(d=>d.type==='unit' && /Blocker/i.test(d.effect||'') && !/Maneuver/i.test(d.effect||'') && d.img).sort((a,b)=>(a.effect||'').length-(b.effect||'').length)[0];
          const b=makeCard(blkDef,'enemy'); b.sick=false; b.rested=false; if (G.enemy.field.length<6) G.enemy.field.push(b);
          const bDef=GUNDAM_CARDS.find(d=>/【Burst】Add this card to your hand/.test(d.effect||'') && d.img);
          const sh=makeCard(bDef,'enemy'); G.enemy.shields.push(sh);
          const aDef=GUNDAM_CARDS.filter(d=>d.type==='unit' && (d.ap||0)>=3 && (d.hp||0)>=4 && d.img).sort((a,b)=>(a.effect||'').length-(b.effect||'').length)[0];
          const a=makeCard(aDef,'player'); a.sick=false; a.rested=false; if (G.player.field.length<6) G.player.field.push(a);
          render(); G.selected=a.uid; G.mode='attack-target'; attackDirect();
          return 'forced attack by '+a.name+' into blocker '+b.name+' / burst shield '+sh.name; });
        if (did){ console.log('step',step,name,did); forcedLeft--; forcedNext=step+12; }
      }
    }
    const key=await H.evaluate(()=>G.turnNumber+'/'+G.turn);
    if (key!==lastTurnKey){ lastTurnKey=key; stats.turns++; }
    if (step===40){ await H.screenshot({ path:path.join(out,'04_host_mid.png') }); await U.screenshot({ path:path.join(out,'05_guest_mid.png') }); await S.screenshot({ path:path.join(out,'06_spec_mid.png') });
      // consistency: the guest's enemy field is the host's player field; the spectator mirrors the host
      const hv=await H.evaluate(()=>({ pf:G.player.field.map(u=>u.name), ef:G.enemy.field.map(u=>u.name), turn:G.turn, tn:G.turnNumber, ph:G.player.hand.length, eh:G.enemy.hand.length }));
      const uv=await U.evaluate(()=>({ pf:G.player.field.map(u=>u.name), ef:G.enemy.field.map(u=>u.name), turn:G.turn, tn:G.turnNumber, ph:G.player.hand.length, eh:G.enemy.hand.length, labels:[document.getElementById('playerName').textContent, document.getElementById('enemyName').textContent] }));
      const sv=await S.evaluate(()=>({ pf:G.player.field.map(u=>u.name), ef:G.enemy.field.map(u=>u.name), turn:G.turn, tn:G.turnNumber, hand:document.getElementById('hand').innerText.replace(/\s+/g,' ').slice(0,60), labels:[document.getElementById('playerName').textContent, document.getElementById('enemyName').textContent] }));
      console.log('mid host', JSON.stringify(hv)); console.log('mid guest', JSON.stringify(uv)); console.log('mid spec', JSON.stringify(sv)); }
    if (overAll) break;
    await new Promise(r=>setTimeout(r, 90));
  }
  await H.waitForTimeout(1200);
  const fin={};
  for (const [name,p] of Object.entries(pages)){
    fin[name]=await p.evaluate(()=>({ reveals:window.__rv.slice(0,16), revealCount:window.__rv.length, drTiles:(document.getElementById('drawReveal')||{children:[]}).children.length, prompts:window.__prompts.filter(x=>/Intercept|Burst/.test(x)).slice(0,8), over:G.over, turnNo:G.turnNumber, overlay:document.getElementById('overlay').innerText.replace(/\s+/g,' ').slice(0,160), results:(JSON.parse(localStorage.getItem('gtcg_mp_results')||'[]')).length, wait:(document.getElementById('mpWait')||{}).textContent, logTop:[...document.getElementById('log').children].slice(0,3).map(x=>x.textContent) }));
    await p.screenshot({ path:path.join(out,'07_'+name+'_end.png') });
  }
  console.log('final', JSON.stringify(fin, null, 1));
  console.log('stats', JSON.stringify(stats), 'blocks answered', stats.blocks);
  console.log('errors', errs.length, errs.slice(0,12));
  await b.close();
})();
