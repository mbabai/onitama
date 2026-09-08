const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {oracleMoves,oracleNext,oracleWinner}=require('./mate_search/rules_reference');
const source=fs.readFileSync('main.js','utf8');
const api=new Function(source+`
 return {create:s=>createFastSearch(s,getNow()),evaluate:s=>fastStaticEvaluation(s,0),display:staticEvaluation,
 canWin:fastCanWin,distance:fastTempleDistance,pressure:s=>fastThreatPressure(s,0),
 q(s,a=-1000001,b=1000001){s.maxThinkingTime=null;return fastQuiescence(s,a,b,0,2)},
 leaf(s){s.maxThinkingTime=null;return fastAlphaBeta(s,0,-1000001,1000001,0)},
 timeout(s){s.thinkingStartTime=getNow()-100;s.maxThinkingTime=0;return fastQuiescence(s,-1000001,1000001,0,2)},
 threshold:FAST_MATE_THRESHOLD, dictionary:move_dictionary};`)();
const start='ppmppeeeeeeeeeeeeeeePPMPP03-06-01-02-00XB';
function win(state,color){const s=state.slice(0,-1)+color;return oracleMoves(s).some(m=>oracleWinner(oracleNext(s,m))===color)}
function flip(s){const cards=s.slice(25,39).split('-');return [...s.slice(0,25)].reverse().map(p=>p==='e'?p:p===p.toUpperCase()?p.toLowerCase():p.toUpperCase()).join('')+[...cards.slice(2,4),...cards.slice(0,2),cards[4]].join('-')+'X'+(s.at(-1)==='R'?'B':'R')}
function snapshot(s){return JSON.stringify(Object.fromEntries(['occupiedMask','redMask','masterMask','cardBits','turn','hashA','hashB','redPawnsCount','bluePawnsCount','redMasterPos','blueMasterPos','redCenterControl','blueCenterControl'].map(k=>[k,s[k]])))}
let seed=1741;
function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n}
const positions=[];let state=start;
for(let i=0;i<100;i++){if(oracleWinner(state))state=start;positions.push(state);const moves=oracleMoves(state);state=oracleNext(state,moves[random(moves.length)])}

test('card-aware evaluation is symmetric, agrees with display, and preserves state',()=>{
 for(const state of positions){const s=api.create(state),before=snapshot(s),score=api.evaluate(s);
  assert.equal(score,-api.evaluate(api.create(flip(state))),state);
  assert.equal(api.display(state),score/8);assert.equal(snapshot(s),before);
  assert.ok(Math.abs(score)<api.threshold);
  for(const [color,value] of [['R',1],['B',-1]])assert.equal(api.canWin(s,value),win(state,color),state);
 }
 assert.notEqual(api.display(start),api.display(start.slice(0,25)+'00-02-03-06-01XB'),'same board, different hands');
});

test('threat pressure counts actual surviving replies including non-master defenses',()=>{
 let threatened=0;
 for(const state of positions){const color=state.at(-1),enemy=color==='R'?'B':'R',s=api.create(state),before=snapshot(s);
  let expected=0;
  if(win(state,enemy)&&!win(state,color)){
   threatened++;const survivors=oracleMoves(state).filter(m=>!win(oracleNext(state,m),enemy)).length;
   expected=-(color==='R'?1:-1)*(survivors===0?160:Math.max(0,32-8*survivors));
  }
  assert.equal(api.pressure(s),expected,state);assert.equal(snapshot(s),before);
 }
 assert.ok(threatened>0);
});

function referenceQ(state,remaining){
 const winner=oracleWinner(state);if(winner)return winner==='R'?8000:-8000;
 const stand=api.display(state)*8;if(!remaining)return stand;
 const color=state.at(-1),enemy=color==='R'?'B':'R',max=color==='R',threatened=win(state,enemy);
 const moves=oracleMoves(state);if(win(state,color))return max?8000:-8000;
 let best=threatened?(max?-9000:9000):stand;
 for(const move of moves){const next=oracleNext(state,move);
  if(!threatened&&(move.pass||state[move.to]==='e')&&!win(next,color))continue;
  const score=win(next,enemy)?(max?-7900:7900):referenceQ(next,remaining-1);
  best=max?Math.max(best,score):Math.min(best,score);
 }
 return best;
}
test('bounded tactical search matches an independent unpruned oracle and restores state',()=>{
 for(const state of positions.slice(0,25)){
  const s=api.create(state),before=snapshot(s),expected=referenceQ(state,2);
  assert.equal(api.q(s).score,expected,state);assert.equal(snapshot(s),before);
  const bound=api.q(s,-20,20);
  if(bound.bound==='lower')assert.ok(expected>=bound.score);else if(bound.bound==='upper')assert.ok(expected<=bound.score);else assert.equal(bound.score,expected);
  assert.ok(Math.abs(expected)<api.threshold);
 }
});

test('mate-only cutoff is unchanged and tactical search obeys timeout',()=>{
 const s=api.create(start);s.mateOnly=true;assert.equal(api.leaf(s).score,0);
 const before=snapshot(s);assert.equal(api.timeout(s).timedOut,true);assert.equal(snapshot(s),before);
});

test('tactical extensions respond to threats instead of accepting a static stand-pat score',()=>{
 let checked=0;
 for(const state of positions){
  const color=state.at(-1),enemy=color==='R'?'B':'R';
  if(!win(state,enemy)||win(state,color))continue;
  const escapes=oracleMoves(state).filter(m=>!win(oracleNext(state,m),enemy));
  if(!escapes.length)continue;
  const result=api.q(api.create(state)),slot=result.move&7,from=(result.move>>3)&31,to=(result.move>>8)&31;
  const move=oracleMoves(state).find(m=>m.slot===slot&&(m.pass?from===31:m.from===from&&m.to===to));
  assert.ok(move);assert.equal(win(oracleNext(state,move),enemy),false);checked++;
 }
 assert.ok(checked>0);
});

test('temple routes match independent card-move breadth-first search',()=>{
 for(const state of positions.slice(0,20))for(const color of ['R','B']){
  const cards=state.slice(25,39).split('-').slice(color==='R'?0:2,color==='R'?2:4),sign=color==='R'?1:-1;
  const start=state.indexOf(color==='R'?'M':'m'),goal=color==='R'?2:22,seen=new Set([start]),queue=[[start,0]];
  let expected=8;
  while(queue.length){const [square,d]=queue.shift();if(square===goal){expected=Math.min(d,8);break}
   for(const card of cards)for(const move of api.dictionary[card].moves){let x=square%5,y=Math.floor(square/5);
    for(const c of move){if(c==='r')x+=sign;if(c==='l')x-=sign;if(c==='f')y-=sign;if(c==='b')y+=sign}
    const target=y*5+x;if(x<0||x>4||y<0||y>4||seen.has(target))continue;seen.add(target);queue.push([target,d+1]);
   }
  }
  assert.equal(api.distance(api.create(state),sign),expected);
 }
});
