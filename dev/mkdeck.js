// Auto-build a legal test deck from one set and register it as a preset, so pt_games exercises the
// new cards. Rules: 50 cards, at most 4 of an id, at most 2 colours, no parallel printings.
//   node mkdeck.js <SET_CODE> [deckName]
const fs=require('fs'); const H=require('./harness.js'); const A=H.A;
const argv=process.argv.slice(2); const hi=argv.indexOf('--html');
const GAME=hi>=0?argv.splice(hi,2)[1]:(process.env.GAME_HTML||require('path').resolve(__dirname,'../gundam-card-game.html'));
const SET=argv[0]; const NAME=argv[1]||(SET+' Test Deck');
const pool=A.GUNDAM_CARDS.filter(d=>d.id.startsWith(SET+'-') && !/-p\d$/.test(d.id) && ['unit','pilot','base','command'].includes(d.type));
if (!pool.length){ console.log('no '+SET+' cards in the pool'); process.exit(0); }
// pick the two colours with the most cards, then fill by a sensible curve
const byColor={}; for(const d of pool) (byColor[d.color]=byColor[d.color]||[]).push(d);
const colors=Object.keys(byColor).sort((a,b)=>byColor[b].length-byColor[a].length).slice(0,2);
const cands=pool.filter(d=>colors.includes(d.color));
const order=t=>({unit:0,pilot:1,base:2,command:3})[t];
cands.sort((a,b)=>order(a.type)-order(b.type)||(a.cost-b.cost)||a.id.localeCompare(b.id));
const want={unit:30,pilot:10,base:4,command:6}; const picked=[]; const count={};
for (const type of ['unit','pilot','base','command']){
  const list=cands.filter(d=>d.type===type); let i=0;
  while (picked.length<50 && (count[type]||0)<want[type] && list.length){
    const d=list[i%list.length]; const n=picked.filter(x=>x===d.id).length;
    if (n<4){ picked.push(d.id); count[type]=(count[type]||0)+1; }
    i++; if (i>list.length*4) break;
  }
}
// top up to 50 with any remaining legal copies
let guard=0;
while (picked.length<50 && guard++<1000){ const d=cands[guard%cands.length]; if (picked.filter(x=>x===d.id).length<4) picked.push(d.id); }
if (picked.length<50){ console.log(SET+': only '+picked.length+' legal cards — not enough for a 50-card deck, skipping preset'); process.exit(0); }
const tally={}; for(const id of picked) tally[id]=(tally[id]||0)+1;
const dg=Object.entries(tally).map(([id,n])=>n+'n'+id).join('a');
let html=fs.readFileSync(GAME,'utf8');
if (html.includes("name:'"+NAME.replace(/'/g,"\\'")+"'")){ console.log('preset '+NAME+' already present'); process.exit(0); }
const anchor="  { name:'B/P Big Preen', dg:";
const i=html.indexOf(anchor); if(i<0){ console.log('could not find the preset table'); process.exit(1); }
const lineEnd=html.indexOf('\n', i);
html=html.slice(0,lineEnd+1)+"  { name:'"+NAME.replace(/'/g,"\\'")+"', dg:'"+dg+"' },\n"+html.slice(lineEnd+1);
fs.writeFileSync(GAME, html);
console.log(`preset "${NAME}": 50 cards, ${Object.keys(tally).length} distinct, colours ${colors.join('/')}, `+
  Object.entries(count).map(([k,v])=>k+' '+v).join(' · '));
