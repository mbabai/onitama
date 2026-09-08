const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const CardPreferences=require('./card_preferences');
const MateRecords=require('./mate_search/record_schema');
const engine=require('./mate_search/engine_node');
const {createSolver}=require('./mate_search/forced_mate');
const ids=Object.keys(engine.move_dictionary);
const starting='ppmppeeeeeeeeeeeeeeePPMPP04-27-01-02-00XB';
const record=createSolver(engine.move_dictionary).solve(starting,5);
const runtime=new Function('CardPreferences','MateRecords','window',
 fs.readFileSync('main.js','utf8')+'\n'+fs.readFileSync('mate_hint.js','utf8')+`
 return {
  setModes(modes){CardModes=modes;},deal:createRandomGameState,filter:getFilteredMateStartingStateRecordsForPlies,
  setState(state,root=state){GameState=state;GameHistory.gameStart=root;GameHistory.moveHistory=[];precomputeOnBoardMoves(getThisGameCardsMoveSet(move_dictionary,state));},
  evaluate(evaluation){LatestAIEvalMove=evaluation;},hint:currentMateHint,saved:savedMateEvaluation,move:doMove,
  cache:rememberLiveMateLine,reuse:getReusableMateEvaluation,worker:getAIMoveInWorker,
  remember(evaluation){rememberKnownMateEvaluation(evaluation);return getCurrentKnownMateEvaluation();},
  source(state){const s=createFastSearch(state,0);return fastResultToEval(s,{score:999995,move:0,exact:true,bound:'exact'}).sourceState;}
 };`)(CardPreferences,MateRecords,{MATE_STARTING_STATES:[record]});

test('required cards appear in every five-card deal; excludes never appear; slots are shuffled',()=>{
 let modes=CardPreferences.normalize(ids);
 modes['01']='require';modes['21']='require';modes['02']='exclude';
 runtime.setModes(modes);const slots=new Set();
 for(let i=0;i<200;i++){
  const state=runtime.deal(),cards=state.slice(25,39).split('-');
  assert.equal(new Set(cards).size,5);assert.ok(cards.includes('01')&&cards.includes('21'));assert.ok(!cards.includes('02'));
  assert.equal(state.at(-1),engine.move_dictionary[cards[4]].startColor);slots.add(cards.indexOf('01'));
 }
 assert.equal(slots.size,5,'required cards are not fixed to a player or neutral slot');
});
test('five required cards produce exactly that set; sixth and fewer than five available are rejected',()=>{
 let modes=CardPreferences.normalize(ids);for(const id of ids.slice(0,5))modes=CardPreferences.change(modes,id,'require').modes;
 assert.match(CardPreferences.change(modes,ids[5],'require').error,/at most five/);
 for(let i=0;i<20;i++)assert.deepEqual(CardPreferences.deal(modes).sort(),ids.slice(0,5).sort());
 for(const id of ids.slice(5))modes=CardPreferences.change(modes,id,'exclude').modes;
 assert.match(CardPreferences.change(modes,ids[0],'exclude').error,/at least five/);
});
test('the puzzle filter applies the same include/exclude/require rules as dealing',()=>{
 let modes=CardPreferences.normalize(ids);runtime.setModes(modes);
 assert.equal(runtime.filter(5).length,1);
 modes={...modes,'01':'require'};runtime.setModes(modes);assert.equal(runtime.filter(5).length,1);
 modes={...modes,'21':'require'};runtime.setModes(modes);assert.equal(runtime.filter(5).length,0);
 modes={...modes,'21':'include','02':'exclude'};runtime.setModes(modes);assert.equal(runtime.filter(5).length,0);
});
test('old included-card settings migrate without losing selections',()=>{
 const selected=ids.slice(0,8),modes=CardPreferences.normalize(ids,{},selected);
 assert.deepEqual(ids.filter(id=>modes[id]!=='exclude'),selected);
 assert.deepEqual(CardPreferences.normalize(ids,modes),modes);
});

test('starting configuration totals account for excluded and required cards',()=>{
 const modes=CardPreferences.normalize(ids);
 assert.equal(CardPreferences.startingConfigurations(modes),6041280);
 modes[ids[0]]='exclude';
 assert.equal(CardPreferences.startingConfigurations(modes),5097330);
 modes[ids[1]]='require';
 assert.equal(CardPreferences.startingConfigurations(modes),822150);
 for(const id of ids.slice(2,6))modes[id]='require';
 assert.equal(CardPreferences.startingConfigurations(modes),30);
});
test('saved hints follow the main line for attacker and defender and stop on deviations',()=>{
 runtime.setState(starting);runtime.evaluate(null);
 const first=runtime.hint();assert.equal(first.color,'B');assert.equal(first.cardID,record.principal_variation[0].card_id);
 const child=runtime.move(starting,first);runtime.setState(child,starting);
 const reply=runtime.hint();assert.equal(reply.color,'R');assert.equal(reply.cardID,record.principal_variation[1].card_id);
 runtime.setState('ppmppeeeeeeeeeeeeeeePPMPP03-06-01-02-00XB',starting);
 assert.equal(runtime.hint(),null);
});
test('current engine forced-line hints work for the losing side and reject stale or illegal moves',()=>{
 const state='ppmppeeeeeeeeeeeeeeePPMPP03-06-01-02-00XB';runtime.setState(state);
 const evaluation={sourceState:state,e:Infinity,d:4,exact:true,m:{color:'B',cardID:'01',startLocation:2,targetLocation:12}};
 runtime.evaluate(evaluation);assert.deepEqual(runtime.hint(),evaluation.m);
 assert.deepEqual(runtime.remember(evaluation).m,evaluation.m,'remembered evaluation retains its root move');
 runtime.evaluate({...evaluation,sourceState:starting});assert.equal(runtime.hint(),null);
 runtime.evaluate({...evaluation,m:{...evaluation.m,color:'R'}});assert.equal(runtime.hint(),null);
 runtime.evaluate({...evaluation,exact:false});assert.equal(runtime.hint(),null);
 assert.equal(runtime.source(state),state,'engine evaluations identify the board they searched');
});

test('saved forced-line moves bypass the worker, including the defending turn',async()=>{
 runtime.setState(starting);
 const first=await runtime.worker(starting,'B');assert.equal(first.nodes,0);assert.equal(first.reused,true);
 const child=runtime.move(starting,first.evalMove.m);runtime.setState(child,starting);
 const second=await runtime.worker(child,'R');assert.equal(second.nodes,0);assert.equal(second.evalMove.m.color,'R');
});
test('live cache is position-specific, ignores bounds, and resets for a new game',()=>{
 const state='ppmppeeeeeeeeeeeeeeePPMPP03-06-01-02-00XB';runtime.setState(state);
 const move=engine.getLegalMoves(state)[0],child=runtime.move(state,move);
 const reply=engine.getLegalMoves(child)[0];
 const proof={sourceState:state,e:Infinity,d:4,exact:true,m:move,principalLine:[{e:Infinity,d:4,exact:true,m:move},{e:Infinity,d:3,exact:false,m:reply}]};
 runtime.cache(proof);assert.deepEqual(runtime.reuse(state).m,move);assert.equal(runtime.reuse(child),null);
 runtime.cache({...proof,sourceState:child,m:reply,d:3,principalLine:[]});assert.deepEqual(runtime.reuse(child).m,reply);
 runtime.setState(starting);assert.equal(runtime.reuse(state),null);
});
