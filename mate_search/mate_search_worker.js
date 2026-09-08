importScripts("../main.js?v=20260907", "forced_mate.js?v=20260907");

const MS_TOTAL_CONFIGS = 6041280;
const MS_CONFIGS_PER_NEUTRAL = 188790;
const MS_OPPONENT_PAIR_COUNT = 406;
function msTwoDigit(n){return String(n).padStart(2,"0");}
function msCardStartColor(n){return move_dictionary[msTwoDigit(n)].startColor;}
function pairs(n, part){const a=[];for(let i=0;i<n-1;i++)for(let j=i+1;j<n;j++)a.push(part?j:i);return a;}
const msPairFirst31=pairs(31,0),msPairSecond31=pairs(31,1),msPairFirst29=pairs(29,0),msPairSecond29=pairs(29,1);
function msStarterCard(neutral, position){
	return position < neutral ? position : position + 1;
}

function msNthRemainingCard(neutral, firstStarter, secondStarter, position){
	let seen = 0;
	for(let card=0;card<32;card++){
		if(card == neutral || card == firstStarter || card == secondStarter) continue;
		if(seen == position) return card;
		seen += 1;
	}
	return 0;
}

function msPositionWithoutCard(card, excluded){
	return card < excluded ? card : card - 1;
}

function msPositionWithoutCards(card, excludedA, excludedB, excludedC){
	let position = card;
	if(excludedA < card) position -= 1;
	if(excludedB < card) position -= 1;
	if(excludedC < card) position -= 1;
	return position;
}

function msPairIndexFromPositions(first, second, size){
	return first * (2 * size - first - 1) / 2 + (second - first - 1);
}

function msFillConfigAtIndex(index, config){
	const neutral = Math.floor(index / MS_CONFIGS_PER_NEUTRAL);
	const neutralOffset = index - neutral * MS_CONFIGS_PER_NEUTRAL;
	const starterPairIndex = Math.floor(neutralOffset / MS_OPPONENT_PAIR_COUNT);
	const opponentPairIndex = neutralOffset - starterPairIndex * MS_OPPONENT_PAIR_COUNT;
	const starterFirst = msStarterCard(neutral, msPairFirst31[starterPairIndex]);
	const starterSecond = msStarterCard(neutral, msPairSecond31[starterPairIndex]);
	const opponentFirst = msNthRemainingCard(neutral, starterFirst, starterSecond, msPairFirst29[opponentPairIndex]);
	const opponentSecond = msNthRemainingCard(neutral, starterFirst, starterSecond, msPairSecond29[opponentPairIndex]);
	const startingPlayer = msCardStartColor(neutral);
	config.index = index;
	config.neutral = neutral;
	config.startingPlayer = startingPlayer;
	if(startingPlayer == "R"){
		config.red0 = starterFirst;
		config.red1 = starterSecond;
		config.blue0 = opponentFirst;
		config.blue1 = opponentSecond;
	} else {
		config.red0 = opponentFirst;
		config.red1 = opponentSecond;
		config.blue0 = starterFirst;
		config.blue1 = starterSecond;
	}
	return config;
}


const solver=ForcedMate.createSolver(move_dictionary);
let running=false, nextIndex=0, maxDepth=11;
function runBatch(){
 if(!running) return;
 const started=performance.now();
 const batch={type:"batch",configs:0,searched_configs:0,skipped_configs:0,nodes:0,mates:[],nextIndex};
 try {
  do {
   if(nextIndex>=MS_TOTAL_CONFIGS) break;
   const config=msFillConfigAtIndex(nextIndex,{});
   const state="ppmpp"+"e".repeat(15)+"PPMPP"+[config.red0,config.red1,config.blue0,config.blue1,config.neutral].map(msTwoDigit).join("-")+"X"+config.startingPlayer;
   const result=solver.solve(state,maxDepth);
   batch.nodes+=result.nodes;batch.configs++;batch.searched_configs++;
   if(result.status==="verified") batch.mates.push({...result,mate_found:true,config_index:nextIndex,config_id:"setup-"+nextIndex,starting_player:config.startingPlayer,search_depth:maxDepth});
   nextIndex++;batch.nextIndex=nextIndex;
  } while(performance.now()-started<250&&batch.configs<250);
  batch.elapsed_ms=performance.now()-started;
  postMessage(batch);
  if(nextIndex>=MS_TOTAL_CONFIGS){running=false;postMessage({type:"done",index:nextIndex});}
  else setTimeout(runBatch,0);
 } catch(error){running=false;postMessage({type:"error",message:error.message});}
}
self.onmessage=function(event){
 const message=event.data;
 if(message.type==="stop"){running=false;postMessage({type:"paused",index:nextIndex});return;}
 if(message.type!=="start"||running) return;
 maxDepth=Number(message.maxDepth)||11;
 nextIndex=Math.max(0,Math.min(MS_TOTAL_CONFIGS,Math.floor(Number(message.nextIndex)||0)));
 running=true;runBatch();
};
