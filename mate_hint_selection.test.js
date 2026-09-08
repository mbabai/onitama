const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function setup(){
 const piece={style:{}};
 const context={GameHasStarted:true,PlayerCanMove:true,AIIsThinking:false,
  GameState:'unchanged',currentMoveUI:{cardID:'other',startLocation:9,targetLocation:10},
  document:{getElementById:id=>({innerText:id==='pBc1'?'01':'02'}),querySelector:()=>piece},
  clearMoveSelection(){delete context.currentMoveUI.startLocation;delete context.currentMoveUI.targetLocation;piece.style.outline='';},
  setClassAttributeToValue(){},updatePlayableCardStyles(slot){context.slot=slot;},
  highlightLegalTargets(){context.highlighted=true;}
 };
 vm.createContext(context);vm.runInContext(fs.readFileSync('mate_hint.js','utf8'),context);
 return {context,piece};
}
test('hint replaces selection, highlights its piece, and leaves destination and game untouched',()=>{
 const {context:c,piece}=setup();
 const move={color:'B',cardID:'01',startLocation:2,targetLocation:12};
 c.selectMateHintMove(move);c.selectMateHintMove(move);
 assert.deepEqual({...c.currentMoveUI},{color:'B',cardID:'01',startLocation:2});
 assert.equal(c.slot,'pBc1');assert.equal(piece.style.outline,'3px solid gold');
 assert.equal(c.highlighted,true);assert.equal(c.GameState,'unchanged');
});
test('pass hints select only the card without executing a move',()=>{
 const {context:c}=setup();c.selectMateHintMove({color:'B',cardID:'02',pass:true});
 assert.deepEqual({...c.currentMoveUI},{color:'B',cardID:'02'});
 assert.equal(c.slot,'pBc2');assert.equal(c.GameState,'unchanged');
});
test('hint selection respects game-start and AI turn guards',()=>{
 for(const flags of [{GameHasStarted:false},{PlayerCanMove:false},{AIIsThinking:true}]){
  const {context:c}=setup();Object.assign(c,flags);
  c.selectMateHintMove({color:'B',cardID:'01',startLocation:2,targetLocation:12});
  assert.equal(c.currentMoveUI.cardID,'other');assert.equal(c.highlighted,undefined);
 }
});
