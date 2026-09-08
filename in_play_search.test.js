const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const runtime=new Function(fs.readFileSync('main.js','utf8')+`
 return {
  search(state){const session=getSharedFastSearchSession('reuse-test',state);const evaluation=continueTimeBasedMinMax(state,getNow(),whosTurn(state),session);return {evaluation,nodes:AImovesEvaluated};},
  move:doMove, legal:getLegalMoves, worker:buildAIWorkerScript,
  precompute(state){precomputeOnBoardMoves(getThisGameCardsMoveSet(move_dictionary,state));}
 };`)();
const start='ppmppeeeeeeeeeeeeeeePPMPP04-27-01-02-00XB';
test('exact mates reuse solved roots and retained child transpositions',()=>{
 runtime.precompute(start);
 const first=runtime.search(start);
 assert.equal(first.evaluation.exact,true);assert.equal(Math.abs(first.evaluation.e),Infinity);
 assert.ok(first.nodes>0);
 const repeat=runtime.search(start);
 assert.equal(repeat.nodes,0);assert.deepEqual(repeat.evaluation.m,first.evaluation.m);
 const child=runtime.move(start,first.evaluation.m);
 const reply=runtime.search(child);
 assert.equal(reply.evaluation.exact,true);assert.equal(reply.evaluation.e,first.evaluation.e);
 assert.equal(reply.evaluation.d,first.evaluation.d-1);
 assert.ok(reply.nodes<first.nodes);
 assert.equal(runtime.search(child).nodes,0);
 assert.ok(runtime.legal(child).some(m=>JSON.stringify(m)===JSON.stringify(reply.evaluation.m)));
 assert.ok(first.evaluation.principalLine.length>1);
 console.log(JSON.stringify({initialNodes:first.nodes,repeatedNodes:repeat.nodes,replyNodes:reply.nodes,plies:first.evaluation.d}));
});
test('generated live worker executes and reuses a solved position',()=>{
 const vm=require('node:vm'),messages=[];
 const context=vm.createContext({performance,console:{log(){}},self:{postMessage:m=>messages.push(m)}});
 vm.runInContext(runtime.worker(),context);
 const request={id:1,gameState:start,color:'B',ttKey:'worker-test',maxThinkingTime:2000};
 context.self.onmessage({data:request});context.self.onmessage({data:{...request,id:2}});
 assert.equal(messages.length,2);assert.equal(messages[0].error,undefined);assert.equal(messages[1].error,undefined);
 assert.equal(messages[1].nodes,0);assert.equal(messages[1].evalMove.exact,true);
});
