// ---- DOM + timing stubs ----
let RNG = (()=>{ let s=12345; return ()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }; })();
Math.random = RNG;

const taskQ = [];
global.setTimeout = (fn, ms)=>{ taskQ.push(fn); return 0; };
global.clearTimeout = ()=>{};
function drainTasks(limit=5000){ let n=0; while(taskQ.length && n++<limit){ const f=taskQ.shift(); try{ f(); }catch(e){ recordErr('async', e); } } }

function stubEl(){
  const e = {
    style:{}, _cls:new Set(),
    classList:{ add(c){e._cls.add(c);}, remove(c){e._cls.delete(c);}, contains(c){return e._cls.has(c);}, toggle(c){ e._cls.has(c)?e._cls.delete(c):e._cls.add(c); } },
    children:[], dataset:{}, parent:null,
    appendChild(c){ c.parent=this; this.children.push(c); return c; },
    prepend(c){ c.parent=this; this.children.unshift(c); return c; },
    removeChild(c){ const i=this.children.indexOf(c); if(i>=0) this.children.splice(i,1); return c; },
    remove(){ if(this.parent){ const i=this.parent.children.indexOf(this); if(i>=0) this.parent.children.splice(i,1); } },
    addEventListener(type, fn){ (this._l=this._l||{})[type]=fn; }, removeEventListener(){},   // recorded so tests can fire real handlers (el.fire('click'))
    fire(type, ev){ const f=this._l&&this._l[type]; if (f) f(ev||{ target:this, stopPropagation(){}, preventDefault(){} }); return !!f; },
    querySelector(){ return stubEl(); }, querySelectorAll(){ return []; },
    setAttribute(){}, getAttribute(){return null;}, focus(){}, click(){}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0};},
    insertBefore(){}, cloneNode(){ return stubEl(); },
    get firstChild(){return this.children[0]||null;}, get lastChild(){return this.children[this.children.length-1]||null;},
  };
  Object.defineProperty(e,'innerHTML',{ get(){return this._h||'';}, set(v){ this._h=v; this.children.length=0; }, configurable:true });
  Object.defineProperty(e,'textContent',{ get(){return this._t||'';}, set(v){ this._t=v; }, configurable:true });
  return e;
}
const _els = {};
global.document = {
  getElementById(id){ return _els[id] || (_els[id]=stubEl()); },
  createElement(){ return stubEl(); },
  createElementNS(){ return stubEl(); },
  querySelector(sel){ if(sel==='.modal-overlay'){ const b=global.document.body; return (b.children||[]).find(n=>String(n.className||'').includes('modal-overlay'))||null; } return null; }, querySelectorAll(){ return []; },
  addEventListener(){}, removeEventListener(){}, body: stubEl(), head: stubEl(),
};
const _audioParam=()=>({value:0,setValueAtTime(){return this;},exponentialRampToValueAtTime(){return this;},linearRampToValueAtTime(){return this;},setTargetAtTime(){return this;},cancelScheduledValues(){return this;}});
global.window = { addEventListener(){}, AudioContext:function(){ return {
  createOscillator(){return {connect(){},start(){},stop(){},frequency:_audioParam(),detune:_audioParam(),type:''};},
  createGain(){return {connect(){},gain:_audioParam()};},
  createBuffer(){return {getChannelData(){return new Float32Array(1024);}};},
  createBufferSource(){return {connect(){},start(){},stop(){},buffer:null,playbackRate:_audioParam()};},
  createBiquadFilter(){return {connect(){},frequency:_audioParam(),Q:_audioParam(),gain:_audioParam(),type:''};},
  destination:{}, currentTime:0, sampleRate:44100, resume(){}, state:'running' }; },
  localStorage:{ getItem(){return null;}, setItem(){}, removeItem(){} } };
global.AudioContext = global.window.AudioContext;
global.localStorage = global.window.localStorage;
global.requestAnimationFrame = (fn)=>{ taskQ.push(fn); return 0; };
global.cancelAnimationFrame = ()=>{};
global.navigator = { vibrate(){} };

// ---- error capture ----
const ERRORS = [];
let CTX = '';
function recordErr(phase, e){ ERRORS.push({ ctx:CTX, phase, msg:e&&e.message, stack:(e&&e.stack||'').split('\n').slice(0,4).join(' | ') }); }

// ---- load game ----
const fs = require('fs');
let src = fs.readFileSync(process.env.GAMEJS || (__dirname+'/game.js'), 'utf8');
src += '\nglobal.__G = { ' + [
  'G','PRESET_DECKS','CARD_BY_ID','GUNDAM_CARDS','makeCard','buildPresetDeck','makeSide','parsePreset',
  'parseTrigger','runTrigger','parseActivate','parseActivateEffect','applyActivateEffect','parseBurst',
  'inferCommand','applyCommand','deployTokens','onUnitDeployed','attachPilot','declareAttack','damage',
  'effAp','effMaxHp','effBlocker','render','beginTurn','draw','exBaseToken','effectiveCost','canAfford',
  'enemyTargets','friendlyTargets','staticSelfBuff','parseLink','linkMatches','endTurn','aiTurn','SHIELD_MAX','HAND_START','RES_MAX',
  'battle','resolveAiAttackInner','resolveAiAttack','checkEnd','sendToTrash','strikePlayer',
  'aiWantsBlock','pickAiBlocker','cantHitPlayer','canHitActive','makeToken','aiPostMain',
  'playFromHand','startActivate','attackDirect','fieldClick','activateReady','affordIssue','startCommand',
  'resolvePlayerTrigger','effSuppression','trashBlocksAttack',
  'aiMainStep','planAiAttacks','aiThreatScore','aiHasLethal','showPileViewer','inspect','sound','fx',
  'rankTarget','refundCommandInFlight','gd05DestroyUnit','gd05SacInteractive','gd05SacResolve',
  'cardFace','resolveAttackTriggers','condMet','pingFriendly','benefitsFromDamage','AI_LVL',
  'aiActivate','gd05Sacrifice','gd05GyuneiActivate','effRepair','condKeyword','matchFilter','parseFilter','playerDig','showLookAtTop','fireDestroyed',
  'parseOnKill','applyOnKill','breachShield','firePilotDestroyed','breachAmount','gd05Custom',
  'applyToTarget','onKillMatches','gd05NuBattleResolve','gd05NuGundamBattlePlayer','autoDiscard','parseClause','parseCondition',
  'matchTrashTrait','trashCount','refreshTrashStats','deployUnit',
  'digDeploy','finishMultiDamage','gd05AxisDeploy','gd05AxisDeployable','gd05DeployBaseFromTrash',
  'effBreach','repairAmount','supportAmount','parseTokenSpecs','effUntargetable','effSupport',
  'activateCostPayable','linkDenyBlockerHook','battleBounceHook','effectRest','preventsWeakBattleDamage',
  'gatedAttackAction','pairFromHand','pilotMainAction','triggerBurst','burstResolvePlayer','returnToHand',
  'doShieldToHand','attackerStillOut','effFirstStrike','effHighManeuver','whileKwAmount','handReduction','totalRes','levelOk','shuffle','cardValue','plain','FIELD_MAX','HAND_MAX',
  'grantKeyword','payCost','settleEx','deckOutCheck','deckColorIssue','makeRoom','deployFromHand','reanimate','finishEndPhase','applySupport','applyToTarget','aiBlockStep','RES_AREA_MAX','EX_MAX',
  'afterCommandMain','resolveAttackTriggers','clearBattleScoped','readyDenied','effReady','pilotActionAction','trashLv','trashDeployAct','supportHelper','retargetCands','attackDefender','aiRetarget','swapActivate','activateReadyAny','dropPilotActivate','cloneToken','placeBaseToken','nameAliases','pairDiscountOk','digRest','endPhaseTail','bindActSource','autoActivateTarget','commit','startCommand','aiTurn','aiPostMain','offerPlayerActionStep','chooseTokenCount','pairDeployHook','tokenMakerQueue','deployTokensInteractive','burstResolvePlayer','finishMultiDamage','enemyTargets','friendlyTargets','reanimate','cardNum','printingsOf','dbNumCount','onUnitDeployed','effHighManeuver','totalRes','payCost','gd06SelfDuel','gd06DigPair','fireAttacked','afterBlockDeclared','commandPlayed','resolveBaseDamagedTrigger','enemyCardDestroyed','trashReduction','parseShieldBreak','activateReady','activateCostPayable','collectPlayerActions','genericToken','clearBattleScoped',
].map(n=>n+':typeof '+n+'!=="undefined"?'+n+':undefined').join(',') + ' };\n';

try { eval.call(null, src); } catch(e){ console.error('LOAD FAILED:', e.message, '\n', e.stack); process.exit(1); }
const A = global.__G;
console.log('Loaded. functions present:', Object.keys(A).filter(k=>A[k]!==undefined).length, '/', Object.keys(A).length);
const missing = Object.keys(A).filter(k=>A[k]===undefined);
if (missing.length) console.log('  missing:', missing.join(', '));

module.exports = { A, drainTasks, recordErr, ERRORS, setCtx:(s)=>{CTX=s;}, getCtx:()=>CTX };
