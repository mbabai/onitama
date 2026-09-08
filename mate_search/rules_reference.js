// Independent, readable rules oracle for audits and tests.
const assert=require('node:assert/strict');
const engine=require('./engine_node');
function oracleMoves(state){
 const turn=state.at(-1),cards=state.slice(25,39).split('-'),result=[];
 for(let from=0;from<25;from++){
  const p=state[from];if(p==='e'||(p===p.toUpperCase())!==(turn==='R'))continue;
  for(let slot=turn==='R'?0:2;slot<(turn==='R'?2:4);slot++){
   for(const raw of engine.move_dictionary[cards[slot]].moves){
    let x=from%5,y=Math.floor(from/5),sign=turn==='R'?1:-1;
    for(const c of raw){if(c==='r')x+=sign;if(c==='l')x-=sign;if(c==='f')y-=sign;if(c==='b')y+=sign;}
    if(x<0||x>4||y<0||y>4)continue;
    const to=y*5+x,q=state[to];if(q!=='e'&&(q===q.toUpperCase())===(turn==='R'))continue;
    result.push({slot,from,to});
   }
  }
 }
 if(!result.length)for(let slot=turn==='R'?0:2;slot<(turn==='R'?2:4);slot++)result.push({slot,pass:true});
 return result;
}
function oracleNext(state,move){
 const board=state.slice(0,25).split(''),cards=state.slice(25,39).split('-');
 if(!move.pass){board[move.to]=board[move.from];board[move.from]='e';}
 [cards[move.slot],cards[4]]=[cards[4],cards[move.slot]];
 return board.join('')+cards.join('-')+'X'+(state.at(-1)==='R'?'B':'R');
}
function oracleWinner(state){if(!state.includes('m')||state[2]==='M')return 'R';if(!state.includes('M')||state[22]==='m')return 'B';return null;}
function replay(record){
 let state=record.game_state;
 for(const m of record.principal_variation){
  assert.equal(oracleWinner(state),null,'PV must stop at the first terminal state');
  const cards=state.slice(25,39).split('-');
  const legal=oracleMoves(state).find(x=>cards[x.slot]===m.card_id&&(m.pass?x.pass:x.from===m.from&&x.to===m.to));
  assert.ok(legal,'PV contains only legal moves');state=oracleNext(state,legal);
 }
 assert.equal(oracleWinner(state),record.game_state.at(-1));
}

module.exports={oracleMoves,oracleNext,oracleWinner,replay};
