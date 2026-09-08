// Equal-time smoke comparison against the former material/center/temple evaluator.
// Usage: node mate_search/evaluation_benchmark.js [milliseconds-per-move]
const fs=require('node:fs'),path=require('node:path');
const {oracleMoves,oracleNext,oracleWinner}=require('./rules_reference');
const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
const oldEvaluation=`function fastStaticEvaluation(search,ply){
 const terminal=fastTerminalScore(search,ply);if(terminal)return terminal;
 const red=(4-Math.floor(search.redMasterPos/5))-Math.abs(search.redMasterPos%5-2);
 const blue=Math.floor(search.blueMasterPos/5)-Math.abs(search.blueMasterPos%5-2);
 return 40*(search.redPawnsCount-search.bluePawnsCount)+10*(8-search.redPawnsCount-search.bluePawnsCount)*(red-blue)+8*(search.redCenterControl-search.blueCenterControl);
}`;
const baseline=source.replace(/function fastStaticEvaluation\(search, ply\)\{[\s\S]*?\n\}/,oldEvaluation)
 .replace('return fastQuiescence(search, alpha, beta, ply, 2)','return {score:fastStaticEvaluation(search,ply),move:0,exact:true,bound:"exact"}');
const budget=Number(process.argv[2]||75);
function runtime(code){return new Function('console',code.replace(/const MaxThinkingTime\s*=\s*[^\r\n]+/,'const MaxThinkingTime = '+budget)+`
 const tt=createFastTranspositionTable(),memory=createFastSearchMemory();
 return state=>{const session=createFastSearchSession('benchmark',state,tt,memory);const start=getNow();
 const result=continueTimeBasedMinMax(state,start,whosTurn(state),session);
 return {...result,elapsed:getNow()-start,nodes:AImovesEvaluated};};`)({log(){}})}
const bots={old:runtime(baseline),new:runtime(source)};
const totals={old:{moves:0,ms:0,depth:0},new:{moves:0,ms:0,depth:0}};
const results=[];
for(const cards of ['03-06-01-02-00XB','04-27-01-02-00XB'])for(const newColor of ['R','B']){
 let state='ppmppeeeeeeeeeeeeeeePPMPP'+cards,plies=0;
 while(!oracleWinner(state)&&plies<60){
  const bot=state.at(-1)===newColor?'new':'old',result=bots[bot](state),m=result.m;
  const cards=state.slice(25,39).split('-');
  const move=oracleMoves(state).find(x=>cards[x.slot]===m.cardID&&(x.pass?m.pass:x.from===m.startLocation&&x.to===m.targetLocation));
  if(!move)throw Error('Illegal move: '+JSON.stringify(result));
  const stats=totals[bot];stats.moves++;stats.ms+=result.elapsed;stats.depth+=result.searchDepth||0;
  state=oracleNext(state,move);plies++;
 }
 const winner=oracleWinner(state);results.push({cards,newColor,plies,winner:winner?(winner===newColor?'new':'old'):'move limit'});
}
console.log(JSON.stringify({budget,results,totals},null,2));
