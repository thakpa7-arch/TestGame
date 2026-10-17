// Randomized UI-driven fuzzer: the HUMAN side takes random legal actions through the real UI entry points,
// the AI plays its normal turns. Usage: node fuzz_ui.js [startSeed] [nGames]   (env VERBOSE=1, TRACE=1)
const H = require(__dirname + '/fuzz_harness.js');
const { A, drainTasks, setSeed, qlen, recordErr, ERRORS, setCtx } = H;
const G = A.G;
const doc = global.document; const el = id => doc.getElementById(id);
const START = +(process.argv[2] || 1), N = +(process.argv[3] || 150);
const TRACE = !!process.env.TRACE;
const ONLY_DECKS = process.env.DECKS; // "P,A" preset indexes

let rs = 1; function R(){ rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; }
const pick = a => a[Math.floor(R() * a.length)];

const VIOL = []; const seen = new Map();
function viol(seed, kind, msg, extra){
  const k = kind + '|' + msg.replace(/\d+/g, '#').slice(0, 100);
  if (!seen.has(k)) { seen.set(k, { kind, msg, seeds: [], extra }); }
  const e = seen.get(k); if (e.seeds.length < 8) e.seeds.push(seed);
  VIOL.push(k);
}
function zones(s){ return [s.deck, s.hand, s.field, s.shields, s.trash, s.exile]; }
function allCards(s){ const o = []; for (const z of zones(s)) for (const c of z) o.push(c);
  for (const u of s.field) if (u && u.pilotCard) o.push(u.pilotCard);
  if (s.base){ o.push(s.base); if (s.base.pilotCard) o.push(s.base.pilotCard); } return o; }
function census(s){ return allCards(s).filter(c => c && !c.token).map(c => c.uid); }
function overlays(){ return (doc.body.children || []).filter(n => String(n.className || '').includes('modal-overlay')); }
function blockOpen(){ return el('blockModal').classList.contains('show'); }

let SEED = 0, BASE = null, turnsSeen = 0, lastLog = [];
function cardInFlight(){ // cards legitimately outside every zone right now
  const ids = new Set();
  if (G.cmdInFlight && G.cmdInFlight.card) ids.add(G.cmdInFlight.card.uid);
  if (G.pending && G.pending.uid) ids.add(G.pending.uid);
  if (G.pending && G.pending.card && G.pending.card.uid) ids.add(G.pending.card.uid);
  if (G.pending && G.pending.cmd && G.pending.cmd.uid) ids.add(G.pending.cmd.uid);
  return ids;
}
function checkState(tag){
  for (const s of [G.player, G.enemy]){
    const w = s === G.player ? 'P' : 'A';
    if (s.resAvail < 0) viol(SEED, 'res', `${w} resAvail<0 (${s.resAvail}) @${tag}`);
    if (s.resAvail > s.resMax + s.ex) viol(SEED, 'res', `${w} resAvail>resMax+ex (${s.resAvail}/${s.resMax}+${s.ex}) @${tag}`);
    if (s.ex > 5 || s.resMax + s.ex > 15) viol(SEED, 'res', `${w} resource area too big (resMax ${s.resMax} ex ${s.ex}) @${tag}`);
    if (s.ex < 0 || s.resMax < 0) viol(SEED, 'res', `${w} negative resources (resMax ${s.resMax} ex ${s.ex})`);
    if (s.field.length > 6) viol(SEED, 'field', `${w} field>6 (${s.field.length})`);
    if (s.shields.length > A.SHIELD_MAX) viol(SEED, 'shields', `${w} shields>${A.SHIELD_MAX}`);
    if (s.base && s.base.type !== 'base') viol(SEED, 'base', `${w} non-base in base zone: ${s.base.name}`);
    for (const u of s.field){
      if (u.type !== 'unit') viol(SEED, 'field', `${w} non-unit on field: ${u.name}`);
      if (u.hp <= 0) viol(SEED, 'field', `${w} dead-on-field ${u.name} hp=${u.hp} @${tag}`);
      if (u.hp > A.effMaxHp(u)) viol(SEED, 'field', `${w} hp>maxHp ${u.name} ${u.hp}/${A.effMaxHp(u)} @${tag}`);
      if (isNaN(u.ap) || isNaN(u.hp)) viol(SEED, 'field', `${w} NaN stat ${u.name}`);
      if (u.pilot && !u.pilotCard) viol(SEED, 'field', `${w} ${u.name} pilot without pilotCard`);
    }
    const ids = allCards(s).filter(Boolean).map(c => c.uid);
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
    if (dup.length){ const c = allCards(s).find(x => x && x.uid === dup[0]); viol(SEED, 'dup', `${w} card in two zones (${c && c.name}) @${tag}`); }
  }
  const pu = new Set(allCards(G.player).filter(Boolean).map(c => c.uid));
  for (const c of allCards(G.enemy)) if (c && pu.has(c.uid)) viol(SEED, 'dup', `uid on both sides (${c.name})`);
}
let PEND = new Map();
function conservation(tag, final){
  if (!BASE) return;
  const fl = cardInFlight();
  for (const [w, s, b] of [['P', G.player, BASE.p], ['A', G.enemy, BASE.a]]){
    const now = new Set(census(s));
    for (const u of b) if (!now.has(u) && !fl.has(u)){
      const k = w + u; const c = BASE.byUid.get(u);
      if (PEND.has(k) || final || !overlays().length) viol(SEED, 'lost', `${w} lost ${c && c.name} from all zones @${tag}`);
      else PEND.set(k, 1);
    }
    for (const k of [...PEND.keys()]) if (k[0] === w && now.has(+k.slice(1))) PEND.delete(k);
    const gained = [...now].filter(u => !b.has(u));
    if (gained.length){ const c = allCards(s).find(x => x && x.uid === gained[0]); viol(SEED, 'gained', `${w} gained ${gained.length} unexpected card(s) e.g. ${c && c.name} @${tag}`); }
  }
}
global.__onDeclare = (atk, side) => {
  const w = side === G.player ? 'P' : 'A';
  if (atk.rested) viol(SEED, 'attack', `${w} attack declared by an already-rested Unit ${atk.name}`);
  // "On the turn this Unit is deployed, it may choose a rested enemy Unit as its attack target and attack it." (Blast Impulse…)
  if (atk.sick && !(atk.deployTurnRestedAttack && A.cantHitPlayer(atk))) viol(SEED, 'attack', `${w} attack declared by a Unit with summoning sickness ${atk.name}`);
  if (A.trashBlocksAttack(atk, side)){ viol(SEED, 'attack', `${w} attack declared by a Unit that can't attack (${atk.name}${atk.noAttackTurn===G.turnSeq?' noAttackTurn':''})`); if (TRACE) lastLog.slice(-6).forEach(l => console.log('    ' + l)); }
  if (G.turn !== side.who) viol(SEED, 'attack', `${w} attack declared on the opponent's turn ${atk.name}`);
};
global.__onBeginTurn = (turn) => {
  turnsSeen++;
  const tag = `beginTurn(${turn}) t${G.turnNumber}`;
  if (G.mode !== 'idle') viol(SEED, 'mode', `G.mode='${G.mode}' left non-idle at start of ${turn} turn`);
  if (blockOpen()) viol(SEED, 'mode', `blockModal still open at start of ${turn} turn: ${(el('blockMsg').innerHTML || '').replace(/<[^>]+>/g, '').slice(0, 80)}`);
  if (overlays().length) viol(SEED, 'mode', `pick overlay still open at start of ${turn} turn`);
  if (G.actionLock) viol(SEED, 'mode', `actionLock still set at start of ${turn} turn`);
  const prev = turn === 'player' ? G.enemy : G.player;
  if (prev && prev.hand && prev.hand.length > 10 && G.turnSeq > 1) viol(SEED, 'hand', `${prev.who} hand ${prev.hand.length}>10 at start of opponent's turn`);
  if (G.player && G.enemy && BASE){ checkState(tag); conservation(tag, false); }
};

function initGame(pp, ep, fp){
  Object.assign(G, { turn: 'player', turnNumber: 1, phase: 'main', selected: null, mode: 'idle', turnSeq: 0, winner: null,
    pending: null, pendingHandIdx: -1, over: false, firstPlayer: fp, skipDrawSide: null, actionLock: false, cmdInFlight: null,
    player: A.makeSide('player'), enemy: A.makeSide('enemy'),
    playerDeckName: pp.name, enemyDeckName: ep.name, aiForceFace: false, activateCands: null, activateCostUnit: null });
  G.player.deck = pp.rand ? randDeck('player', pp.focus) : A.buildPresetDeck('player', pp); G.enemy.deck = ep.rand ? randDeck('enemy', ep.focus) : A.buildPresetDeck('enemy', ep);
  for (let i = 0; i < 5; i++){ A.draw(G.player, true); A.draw(G.enemy, true); }
  for (const s of [G.player, G.enemy]){ for (let i = 0; i < 6 && s.deck.length; i++) s.shields.push(s.deck.pop()); s.base = A.exBaseToken(s.who); }
  (fp === 'player' ? G.enemy : G.player).ex = 1;
  const SR = +(process.env.START_RES || 0), PF = +(process.env.PREFILL || 0);
  for (const s of [G.player, G.enemy]){
    if (SR){ s.resMax = SR; s.resourceDeck = Math.max(0, (s.resourceDeck || 10) - SR); s.hadTurn = true; }
    for (let k = 0; k < PF; k++){ const i = s.deck.findIndex(c => c.type === 'unit'); if (i < 0) break; const u = s.deck.splice(i, 1)[0]; u.sick = false; u.rested = false; s.field.push(u); }
  }
}
const GD06 = A.GUNDAM_CARDS.filter(d => /^GD06-\d+$/.test(d.id));
const FOCUS = ['001','002','018','019','020','021','022','026','027','029','030','035','037','039','042','049','050','051','054','055','063','065','066','069','071','073','080','085','086','087','093','097','100','109','125'].map(n => A.CARD_BY_ID.get('GD06-' + n)).filter(Boolean);
function randDeck(who, focus){ // 50 random GD06 cards, <=4 copies; low-curve weighted so games develop
  const out = []; const cnt = {};
  const pool = GD06.filter(d => d.type !== 'resource' && d.type !== 'token');
  let guard = 0;
  while (out.length < 50 && guard++ < 5000){ const d = (focus && R() < 0.7) ? pick(FOCUS) : pick(pool); if ((cnt[d.id] || 0) >= 4) continue; if ((d.lv || 0) > 5 && R() < 0.5) continue;
    cnt[d.id] = (cnt[d.id] || 0) + 1; out.push(A.makeCard(d, who)); }
  return A.shuffle(out);
}
function clickables(node, out){ out = out || [];
  for (const ch of (node.children || [])){ if (ch.onclick && !ch.disabled) out.push(ch); clickables(ch, out); } return out; }
function cancel(){ const h = el('cancelBtn')._ls && el('cancelBtn')._ls.click; if (h) h[0]({}); }
function endTurnBtn(){ const h = el('endTurnBtn')._ls && el('endTurnBtn')._ls.click; if (h) h[0]({}); }
function discardClick(c){ // copy of the hand-card onclick in discard mode (bind())
  G.player.hand.splice(G.player.hand.indexOf(c), 1);
  A.sendToTrash(c, G.player);
  G.pending.discardLeft--;
  if (G.pending.discardLeft <= 0){ const after = G.pending.after; G.mode = 'idle'; G.pending = null; if (after){ after(); } else { A.clearSel(); A.render(); A.checkEnd(); } }
  else { A.render(); }
}
let actionsThisTurn = 0;
const ACTS={}; const MODES={};
function act(desc, fn){ const kk=desc.split(/[ :]/)[0]+(G.mode!=='idle'?'@'+G.mode:''); ACTS[kk]=(ACTS[kk]||0)+1; if (TRACE) lastLog.push(`[${G.turn} t${G.turnNumber} ${G.mode}] ${desc}`); if (lastLog.length > 200) lastLog.shift();
  setCtx(`seed${SEED}|${desc}`);
  try { fn(); } catch (e){ recordErr('sync:' + desc.split(':')[0], e); }
  drainTasks();
}
function modeStep(){
  const m = G.mode, p = G.pending, me = G.player, fo = G.enemy;
  const onPlayerTurn = G.turn === 'player';
  if (onPlayerTurn && R() < 0.07 && m !== 'discard'){ act('cancel in ' + m, cancel); return; }
  if (m === 'discard'){ const c = pick(me.hand); if (!c){ act('cancel discard (empty hand)', cancel); return; } act('discard ' + c.name, () => discardClick(c)); return; }
  if (m === 'attack-target'){
    const atk = me.field.find(c => c.uid === G.selected);
    const tg = fo.field.filter(u => u.rested || (atk && A.canHitActive(atk, u)));
    if (tg.length && R() < 0.55){ const t = pick(tg); act('attack ' + (atk && atk.name) + ' -> ' + t.name, () => A.fieldClick(t.uid)); return; }
    if (R() < 0.85){ act('attackDirect ' + (atk && atk.name), () => A.attackDirect()); return; }
    if (fo.field.length && R() < 0.5){ const t = pick(fo.field); act('attack(any) -> ' + t.name, () => A.fieldClick(t.uid)); return; }
    act('cancel attack', cancel); return;
  }
  let cands = null;
  if (G.activateCands && (m === 'activate-cost' || m === 'activate-target')) cands = G.activateCands;
  else if (p && p.cands) cands = p.cands.filter(u => !(p.picked || []).includes(u));
  else if (m === 'field-replace' || m === 'pilot-target') cands = me.field.map(c => c.uid);
  else if (m === 'token-replace') cands = me.field.filter(x => !p.protect.has(x.uid)).map(c => c.uid);
  else if (m === 'activate-target'){ const sc = p.activate.action.scope; cands = (sc === 'enemy' ? fo : me).field.map(x => x.uid); }
  else if (m === 'activate-cost') cands = me.field.map(x => x.uid);
  else cands = me.field.concat(fo.field).map(c => c.uid);
  if (R() < 0.05){ const all = me.field.concat(fo.field); if (all.length){ const c = pick(all); act(`stray click ${c.name} in ${m}`, () => A.fieldClick(c.uid)); return; } }
  if (!cands || !cands.length){ act('cancel (no cands) in ' + m, cancel); return; }
  const u = pick(cands); const c = me.field.concat(fo.field).find(x => x.uid === u);
  act(`pick ${c && c.name} in ${m}`, () => A.fieldClick(u));
}
function idleStep(){
  const s = G.player;
  const opts = [];
  const playable = s.hand.filter(c => !A.affordIssue(s, c) && !(c.type === 'pilot' && !s.field.some(u => u.type === 'unit' && !u.pilot && !u.noPilot)));
  if (playable.length) opts.push([4, () => { const c = pick(playable); act('play ' + c.name + ' (' + c.type + ')', () => A.playFromHand(c.uid, R() < 0.5)); }]);
  if (R() < 0.08 && s.hand.length) opts.push([1, () => { const c = pick(s.hand); act('try play ' + c.name, () => A.playFromHand(c.uid)); }]);
  const actv = [...s.field, s.base].filter(u => u && A.activateReady(u));
  if (actv.length) opts.push([2, () => { const u = pick(actv); act('activate ' + u.name, () => A.startActivate(u)); }]);
  const atk = s.field.filter(u => !u.rested && !u.sick && u.ap > 0 && !A.trashBlocksAttack(u, s));
  if (atk.length) opts.push([4, () => { const u = pick(atk);
    act('select attacker ' + u.name, () => { A.fieldClick(u.uid); if (G.mode === 'idle'){ A.closeInspect(); G.selected = u.uid; G.mode = 'attack-target'; A.render(); } }); }]);
  if (R() < 0.15){ const mine = [...s.field, s.base, ...s.hand].filter(Boolean); if (mine.length) opts.push([1.5, () => { const c = pick(mine);
    act('inspect ' + c.name, () => { A.inspect(c); const bs = (el('insBtns').children || []).filter(b => b.onclick && !b.disabled); if (bs.length){ const b = pick(bs); lastLog.push('   inspector -> ' + (b.innerHTML || b.textContent || '').replace(/<[^>]+>/g, '').slice(0, 40)); b.onclick(); } }); }]); }
  if (R() < 0.05){ const all = s.field.concat(G.enemy.field); if (all.length) opts.push([1, () => { const c = pick(all); act('idle click ' + c.name, () => A.fieldClick(c.uid)); }]); }
  opts.push([opts.length ? (+process.env.ENDW || 0.6) + actionsThisTurn * 0.05 : 1, () => { act('endTurn', () => { actionsThisTurn = 0; endTurnBtn(); }); }]);
  const tot = opts.reduce((a, o) => a + o[0], 0); let r = R() * tot;
  for (const o of opts){ r -= o[0]; if (r <= 0){ actionsThisTurn++; o[1](); return; } }
  opts[opts.length - 1][1]();
}
function sig(){
  const sd = s => [s.hand.length, s.deck.length, s.trash.length, s.shields.length, s.resAvail, s.ex,
    s.field.map(u => u.uid + ':' + u.hp + (u.rested ? 'r' : '') + (u.pilot ? 'p' : '')).join(','), s.base ? s.base.uid + ':' + s.base.hp : ''].join('/');
  return [G.turn, G.turnSeq, G.mode, G.selected, blockOpen() ? el('blockBtns').children.length : 0, overlays().length, sd(G.player), sd(G.enemy), ERRORS.length, qlen()].join('|');
}
function step(){
  drainTasks();
  if (G.over) return;
  if (blockOpen()){
    const bs = el('blockBtns').children.filter(b => b.onclick && !b.disabled);
    if (!bs.length) return;
    const b = pick(bs); act('modal: ' + (el('blockMsg').innerHTML || '').replace(/<[^>]+>/g, '').slice(0, 50) + ' => ' + (b.textContent || b.innerHTML || '').replace(/<[^>]+>/g, '').slice(0, 40), () => b.onclick());
    return;
  }
  const ov = overlays();
  if (ov.length){ const m = ov[ov.length - 1]; const cl = clickables(m); if (!cl.length) return;
    // A multi-pick picker (choose N cards, then confirm): once its confirm button is enabled, press it often
    // enough that random tile toggling doesn't read as a stall.
    const confirmBtn = cl.find(x => /\(\d+\/\d+\)/.test(x.textContent || ''));
    const b = (confirmBtn && R() < 0.35) ? confirmBtn : pick(cl);
    act('overlay click ' + (b.textContent || '').slice(0, 30), () => b.onclick()); return; }
  if (G.mode !== 'idle' && (G.turn === 'player' || G.mode === 'action-step-target' || G.mode === 'discard')){ modeStep(); return; }
  if (G.turn === 'player' && G.mode === 'idle'){
    if (G.actionLock) return; // waiting on something
    idleStep(); return;
  }
}
function describeStall(){
  return { turn: G.turn, turnNumber: G.turnNumber, mode: G.mode, phase: G.phase, actionLock: G.actionLock, selected: G.selected,
    pending: G.pending ? Object.keys(G.pending).join(',') + (G.pending.name ? ' name=' + G.pending.name : '') + (G.pending.card ? ' card=' + G.pending.card.name : '') : null,
    blockModal: blockOpen() ? (el('blockMsg').innerHTML || '').replace(/<[^>]+>/g, '').slice(0, 120) + ' btns=' + el('blockBtns').children.length : false,
    overlays: overlays().length, qlen: qlen(), prompt: (el('prompt').innerHTML || el('prompt').textContent || '').replace(/<[^>]+>/g, '').slice(0, 120),
    activateCands: G.activateCands, cmdInFlight: !!G.cmdInFlight };
}
const D0 = A.PRESET_DECKS; const D = new Proxy(D0, { get(t, k){ if (k === '-1') return { name: 'RANDOM-GD06', rand: true }; if (k === '-2') return { name: 'FOCUS-GD06', rand: true, focus: true }; return t[k]; } }); const gi = D.findIndex(d => d.name === 'GD06 Test Deck');
let stats = { games: 0, over: 0, pw: 0, aw: 0, long: 0, stalls: 0, turns: 0 };
const deckUse = {};
for (let g = 0; g < N; g++){
  SEED = START + g; rs = SEED * 2654435761 >>> 0; setSeed(SEED * 7919 + 13); R(); R();
  let pi, ai;
  if (ONLY_DECKS){ [pi, ai] = ONLY_DECKS.split(',').map(Number); }
  else { const ch = () => { const r = R(); return r < 0.5 ? gi : r < (0.5 + (+process.env.RAND || 0)) ? -1 : Math.floor(R() * D.length); }; pi = ch(); ai = ch(); }
  deckUse[D[pi].name + ' v ' + D[ai].name] = (deckUse[D[pi].name + ' v ' + D[ai].name] || 0) + 1;
  lastLog = []; PEND = new Map(); BASE = null; turnsSeen = 0; actionsThisTurn = 0;
  const e0 = ERRORS.length;
  try {
    // close any leftover UI from a previous game
    el('blockModal').classList.remove('show'); for (const o of overlays()) o.remove();
    initGame(D[pi], D[ai], R() < 0.5 ? 'player' : 'enemy');
    const byUid = new Map(); for (const s of [G.player, G.enemy]) for (const c of allCards(s)) if (c) byUid.set(c.uid, c);
    BASE = { p: new Set(census(G.player)), a: new Set(census(G.enemy)), byUid };
    if (BASE.p.size !== 50 || BASE.a.size !== 50) viol(SEED, 'setup', `deck sizes ${BASE.p.size}/${BASE.a.size}`);
    setCtx('seed' + SEED + '|begin');
    A.beginTurn(G.firstPlayer); drainTasks();
    let last = sig(), same = 0, steps = 0;
    while (!G.over && steps < 6000 && turnsSeen < 140){
      steps++; step(); if (G.over) break;
      const sNow = sig();
      if (sNow === last) same++; else { same = 0; last = sNow; }
      if (same > (+process.env.STALL || 80)){ if (TRACE){ for (const o of overlays()){ const dump=(n,d)=>{ console.log(' '.repeat(d*2)+'<'+(n.className||'')+'> h=['+String(n._h||'').replace(/<[^>]+>/g,'').slice(0,80)+'] t=['+(n._t||'')+'] onclick='+!!n.onclick+' disabled='+!!n.disabled); (n.children||[]).forEach(c=>dump(c,d+1)); }; dump(o,0); } lastLog.slice(-40,-15).forEach(l=>console.log('  '+l)); } stats.stalls++; viol(SEED, 'stall', `STALL ${G.turn} mode=${G.mode} ${JSON.stringify(describeStall())}`, lastLog.slice(-15)); break; }
      if (steps % 25 === 0 || process.env.CHECKALL){ const n0 = VIOL.length; checkState('step' + steps); if (process.env.CHECKALL && VIOL.length > n0 && !global.__dumped){ global.__dumped = 1; console.log('FIRST VIOLATION at step', steps, VIOL[VIOL.length-1]); lastLog.slice(-25).forEach(l => console.log('   ' + l)); console.log('--- game log (last 40) ---'); (el('log').children || []).slice(0, 40).reverse().forEach(c => console.log('   ' + (c.innerHTML || '').replace(/<[^>]+>/g, ''))); } }
    }
    if (!G.over && same <= (+process.env.STALL || 80)){ stats.long++; if (process.env.VERBOSE) console.log('seed', SEED, 'did not finish: turns', turnsSeen, 'steps', steps, describeStall()); }
    if (G.over) stats.over++;
    if (G.winner === 'player') stats.pw++; else if (G.winner === 'enemy') stats.aw++;
    stats.turns += turnsSeen;
    if (G.over && !overlays().length && !blockOpen()) conservation('final', true);
    { const n0 = VIOL.length; checkState('final'); if (process.env.CHECKALL && VIOL.length > n0 && !global.__dumped){ global.__dumped = 1; console.log('FINAL VIOLATION', VIOL[VIOL.length-1]); lastLog.slice(-25).forEach(l => console.log('   ' + l)); console.log('--- game log ---'); (el('log').children || []).slice(0, 40).reverse().forEach(c => console.log('   ' + (c.innerHTML || '').replace(/<[^>]+>/g, ''))); } }
  } catch (e){ recordErr('game', e); }
  for (let i = e0; i < ERRORS.length; i++) ERRORS[i].seed = SEED;
  stats.games++;
}
console.log(`seeds ${START}..${START + N - 1}`, JSON.stringify(stats));
if (process.env.VERBOSE) console.log(deckUse, ACTS);
console.log('distinct violations:', seen.size);
for (const [k, v] of seen){ console.log(`  ! [${v.kind}] ${v.msg}  seeds=${v.seeds.join(',')}`); if (v.extra && process.env.VERBOSE) v.extra.forEach(l => console.log('       ' + l)); }
console.log('Errors:', ERRORS.length);
const by = {}; for (const e of ERRORS){ const k = (e.msg || '?') + ' @ ' + (e.stack || '').split(' | ')[1]; (by[k] = by[k] || []).push(e); }
for (const k of Object.keys(by)){ console.log(`\n### ${k} (${by[k].length})`);
  by[k].slice(0, 3).forEach(e => console.log('   [' + e.phase + '] seed=' + e.seed + ' ' + e.ctx + '\n       ' + (e.stack || ''))); }
if (global.__cov) console.log('COVERAGE', JSON.stringify(global.__cov));
