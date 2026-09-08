const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('./engine_node');
const {createSolver}=require('./forced_mate');
const {mergePayloads,buildJsText,parsePayloadText,buildJsonText}=require('./merge_starting_states');
const solver=createSolver(engine.move_dictionary);
const start=cards=>'ppmpp'+'e'.repeat(15)+'PPMPP'+cards;

// Deliberately simple string-board oracle: no bitboards, cache, move ordering,
// alpha-beta, or shared transition/terminal functions with the proof engine.
const {oracleMoves,oracleNext,oracleWinner,replay}=require('./rules_reference');
function oracle(state,depth,attacker=state.at(-1)){
 const winner=oracleWinner(state);if(winner)return winner===attacker;if(!depth)return false;
 const outcomes=oracleMoves(state).map(move=>()=>oracle(oracleNext(state,move),depth-1,attacker));
 return state.at(-1)===attacker?outcomes.some(f=>f()):outcomes.every(f=>f());
}
test('shortest forced mate, every defender reply, and complete main line',()=>{
 const state=start('04-27-01-02-00XB'),result=solver.solve(state,11);
 assert.equal(result.mate_plies,5);assert.equal(oracle(state,3),false);assert.equal(oracle(state,5),true);replay(result);
 const first=result.principal_variation[0];const move=oracleMoves(state).find(m=>m.from===first.from&&m.to===first.to&&state.slice(25,39).split('-')[m.slot]===first.card_id);
 const defenseState=oracleNext(state,move);
 for(const reply of oracleMoves(defenseState)) assert.equal(oracle(oracleNext(defenseState,reply),3,'B'),true);
});
test('cooperative line is not a forced mate; independent oracle agrees on varied positions',()=>{
 let seed=17;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 let state=start('03-06-01-02-00XB');
 for(let i=0;i<80;i++){
  if(oracleWinner(state))state=start('03-06-01-02-00XB');
  const expected=oracle(state,3),actual=solver.solve(state,3);
  assert.equal(actual.status==='verified',expected,state);
  if(expected)replay(actual);
  const moves=oracleMoves(state);state=oracleNext(state,moves[random(moves.length)]);
 }
});
test('horizon cannot leak: historic mate-in-7/8 claims are not proofs within 11 plies',()=>{
 for(const cards of ['11-31-21-27-02XR','06-25-01-27-21XR']){
  const result=solver.solve(start(cards),11);assert.equal(result.status,'not_proven');assert.equal(result.mate_plies,undefined);
 }
});
test('both historical mate-in-8 outliers have a shortest forced mate in 7',()=>{
 for(const cards of ['06-25-01-27-21XR','06-26-01-27-21XR']){
  const result=solver.solve(start(cards),15);assert.equal(result.mate_plies,13);assert.equal(result.mate_moves,7);replay(result);
 }
});
test('forced passes exchange either card and leave pieces in place in both engines',()=>{
 const state='m'+'e'.repeat(23)+'M'+'16-15-02-03-00XR';
 const s=solver.parse(state),moves=solver.moves(s);
 assert.equal(moves.length,2);assert.ok(moves.every(m=>solver.describe(s,m).pass));
 for(const move of moves){const child=solver.next(s,move);assert.equal(child.o,s.o);assert.equal(child.r,s.r);assert.equal(child.m,s.m);assert.notEqual(child.c,s.c);assert.equal(child.t,1);}
 const fast=engine.createFastSearch(state,0);const count=engine.fastGenerateLegalMoves(fast,0);
 assert.equal(count,2);
 for(const move of fast.moveBuffers[0].slice(0,count)){
  assert.equal(engine.fastDecodeMove(fast,move).pass,true);
  const before=[fast.occupiedMask,fast.redMask,fast.masterMask,fast.cardBits,fast.hashA,fast.hashB];
  engine.fastMakeMove(fast,move,0);assert.deepEqual([fast.occupiedMask,fast.redMask,fast.masterMask],before.slice(0,3));
  engine.fastUnmakeMove(fast,0);assert.deepEqual([fast.occupiedMask,fast.redMask,fast.masterMask,fast.cardBits,fast.hashA,fast.hashB],before);
 }
});
test('move generation and make/unmake agree with independent rules over random legal games',()=>{
 let state=start('01-21-02-03-00XR');
 for(let i=0;i<150;i++){
  if(oracleWinner(state))state=start('01-21-02-03-00XR');
  const s=solver.parse(state),expected=oracleMoves(state),cards=state.slice(25,39).split('-');
  const key=m=>m.card_id+':'+(m.pass?'pass':m.from+'-'+m.to);
  const actual=solver.moves(s).map(m=>solver.describe(s,m));
  assert.deepEqual(actual.map(key).sort(),expected.map(m=>key({...m,card_id:cards[m.slot]})).sort());
  const fast=engine.createFastSearch(state,0),count=engine.fastGenerateLegalMoves(fast,0);
  const fm=Array.from(fast.moveBuffers[0].slice(0,count)).map(m=>engine.fastDecodeMove(fast,m));
  assert.deepEqual(fm.map(m=>key({card_id:m.cardID,from:m.startLocation,to:m.targetLocation,pass:m.pass})).sort(),actual.map(key).sort());
  state=oracleNext(state,expected[(i*73+7)%expected.length]);
 }
});
test('small collision-heavy cache gives identical forced results',()=>{
 const tiny=createSolver(engine.move_dictionary,1);
 for(const cards of ['04-27-01-02-00XB','03-06-01-21-00XB','03-06-01-02-00XB'])assert.equal(tiny.solve(start(cards),5).mate_plies,solver.solve(start(cards),5).mate_plies);
});
test('merge preserves verification/PV, supersedes legacy claims, and retains resume metadata',()=>{
 const verified=solver.solve(start('04-27-01-02-00XB'),5);
 const legacy={game_state:verified.game_state,mate_plies:3};
 for(const records of [[legacy,verified],[verified,legacy]]){
  const merged=mergePayloads([{starting_states:records,search:{next_index:6041280,max_depth:11},audit:{version:'forced-v1'}}]);
  assert.equal(merged.records.length,1);assert.deepEqual(merged.records[0],verified);assert.equal(merged.metadata.search.next_index,6041280);
  const roundtrip=parsePayloadText(buildJsonText(merged.records,merged.metadata));assert.deepEqual(roundtrip.records,[verified]);
  const window={};new Function('window',buildJsText(merged.records,merged.metadata))(window);assert.deepEqual(window.MATE_STARTING_STATES,[verified]);
 }
});
test('file and HTTP workers use the same implementation',()=>{
 const window={};new Function('window',fs.readFileSync(path.join(__dirname,'worker_bundle.js'),'utf8'))(window);
 const expected=fs.readFileSync(path.join(__dirname,'forced_mate.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'mate_search_worker.js'),'utf8').replace(/^importScripts\([^\n]+\);\r?\n/,'');
 assert.equal(window.MATE_SEARCH_WORKER_SOURCE,expected);
});

module.exports={oracleMoves,oracleNext,oracleWinner,replay};
