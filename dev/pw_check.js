const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('ERR '+e.message));
  p.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(t)) errs.push('CON '+t.slice(0,180));});
  await p.route('**://images.weserv.nl/**', r=>r.abort());
  await p.goto('file:///home/user/TestGame/gundam-card-game.html'); await p.waitForTimeout(500);
  const R=await p.evaluate(()=>{
    const out={ presets: PRESET_DECKS.map(d=>d.name), hasM: PRESET_DECKS.some(d=>d.name==='M') };
    const d=PRESET_DECKS.find(x=>x.name==='B/P Big Preen');
    out.found=!!d;
    if(d){ const built=buildPresetDeck('player',d);
      const counts={},colors={}; for(const c of built){counts[c.def]=(counts[c.def]||0)+1; if(c.color!=='-')colors[c.color]=(colors[c.color]||0)+1;}
      out.size=built.length; out.maxCopies=Math.max(...Object.values(counts)); out.colors=colors;
      out.distinct=Object.keys(counts).length;
      out.allResolved=built.every(c=>c&&c.name&&!isNaN(c.ap!==undefined?c.ap:0));
    }
    // every preset still builds
    out.allPresetSizes=PRESET_DECKS.map(x=>{try{return buildPresetDeck('player',x).length}catch(e){return 'ERR'}});
    return out;
  });
  console.log(JSON.stringify(R,null,1));
  // the deck picker must list it
  await p.click('#startBtn'); await p.waitForTimeout(500);
  const tiles=await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>!e.children.length && e.offsetParent!==null).map(e=>(e.textContent||'').trim()).filter(t=>/Preen/.test(t)));
  console.log('deck picker shows:', JSON.stringify(tiles));
  console.log('JS ERRORS:', errs.length?errs.join(' | '):'none');
  await b.close();
})();
