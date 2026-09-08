// A hint always belongs to the current board, including the side to move.
let mateHintVisible=false,mateHintState='',savedHintRoot='',savedHintPositions=new Map();
let liveMateRoot='',liveMatePositions=new Map();
function currentLiveMateCache(){
 const root=GameHistory.gameStart;
 if(root!==liveMateRoot){liveMateRoot=root;liveMatePositions.clear();}
 return liveMatePositions;
}
function rememberLiveMateLine(evaluation){
 if(!evaluation?.sourceState)return;
 const cache=currentLiveMateCache();
 let state=evaluation.sourceState;
 const remember=(entry)=>{
  if(!isMateEvaluation(entry)||entry.d<=0||!isLegal(state,entry.m))return;
  cache.set(state,{e:entry.e,d:entry.d,exact:true,m:cloneMove(entry.m),sourceState:state,searchDepth:entry.searchDepth});
 };
 remember(evaluation);
 for(const entry of evaluation.principalLine||[]){
  if(!isLegal(state,entry.m))break;
  remember(entry);state=doMove(state,entry.m);
 }
 while(cache.size>2048)cache.delete(cache.keys().next().value);
}
function getReusableMateEvaluation(state){
 const evaluation=savedMateEvaluation(state)||currentLiveMateCache().get(state);
 return isMateEvaluation(evaluation)&&evaluation.sourceState===state&&evaluation.d>0&&isLegal(state,evaluation.m)?evaluation:null;
}
function savedMateEvaluation(state){
 const root=GameHistory.gameStart;
 if(root!==savedHintRoot){
  savedHintRoot=root;savedHintPositions=new Map();
  const record=(window.MATE_STARTING_STATES||[]).find(r=>r.game_state===root);
  if(MateRecords.verified(record)){
   let current=root;
   record.principal_variation.forEach((m,i)=>{
    const move={cardID:m.card_id,color:whosTurn(current),startLocation:m.from??-1,targetLocation:m.to??-1,pass:!!m.pass};
    savedHintPositions.set(current,{e:whosTurn(root)==='R'?Infinity:-Infinity,exact:true,d:record.mate_plies-i,m:move,sourceState:current});
    current=doMove(current,move);
   });
  }
 }
 return savedHintPositions.get(state)||null;
}
function currentMateHint(){
 const evaluation=getReusableMateEvaluation(GameState)||LatestAIEvalMove;
 if(!isMateEvaluation(evaluation)||evaluation.d<=0||evaluation.sourceState!==GameState)return null;
 const move=evaluation.m;
 return move&&isLegal(GameState,move)?move:null;
}
function hideMateHint(){
 mateHintVisible=false;mateHintState='';
 document.getElementById('mateHintArrow')?.remove();
 const note=document.getElementById('mateHintNote');if(note)note.hidden=true;
 getEvaluationBar()?.setAttribute('aria-pressed','false');
}
function updateMateHintControl(){
 const bar=getEvaluationBar();if(!bar)return;
 const available=!!currentMateHint()&&!CustomSetupActive&&!GameIsOver;
 bar.setAttribute('role','button');bar.tabIndex=available?0:-1;
 bar.setAttribute('aria-disabled',String(!available));
 bar.setAttribute('aria-pressed',String(mateHintVisible));
 bar.onclick=toggleMateHint;
 bar.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleMateHint();}};
 if(available){bar.title+=' — click to show the next forced-line move';bar.setAttribute('aria-label',bar.title);}
 if(mateHintVisible){if(!available||mateHintState!==GameState)hideMateHint();else drawMateHint();}
}
function toggleMateHint(){
 if(mateHintVisible){hideMateHint();return;}
 if(!currentMateHint()||GameIsOver||CustomSetupActive)return;
 mateHintVisible=true;mateHintState=GameState;drawMateHint();
 getEvaluationBar().setAttribute('aria-pressed','true');
}
function drawMateHint(){
 document.getElementById('mateHintArrow')?.remove();
 const move=currentMateHint();if(!move)return hideMateHint();
 let note=document.getElementById('mateHintNote');
 if(!note){note=document.createElement('div');note.id='mateHintNote';note.setAttribute('role','status');document.getElementById('gameArea').append(note);}
 note.hidden=false;
 note.textContent=(move.color==='R'?'Red':'Blue')+' · '+titleCase(move_dictionary[move.cardID].name)+(move.pass?' — pass and exchange this card':' — next move on the forced line');
 if(move.pass)return;
 const from=document.getElementById('s'+move.startLocation),to=document.getElementById('s'+move.targetLocation);
 const x=from.offsetLeft+50,y=from.offsetTop+50,tx=to.offsetLeft+50,ty=to.offsetTop+50;
 const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
 const ex=tx-ux*9,ey=ty-uy*9,bx=ex-ux*36,by=ey-uy*36,sx=x+ux*12,sy=y+uy*12;
 const points=[[sx-uy*10,sy+ux*10],[bx-uy*10,by+ux*10],[bx-uy*25,by+ux*25],[ex,ey],[bx+uy*25,by-ux*25],[bx+uy*10,by-ux*10],[sx+uy*10,sy-ux*10]];
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 const squares=Array.from(document.querySelectorAll('.boardSquare'));
 const left=Math.min(...squares.map(s=>s.offsetLeft)),top=Math.min(...squares.map(s=>s.offsetTop));
 svg.id='mateHintArrow';svg.setAttribute('viewBox',left+' '+top+' 504 504');svg.setAttribute('aria-hidden','true');
 Object.assign(svg.style,{left:left+'px',top:top+'px',width:'504px',height:'504px'});
 const arrow=document.createElementNS(svg.namespaceURI,'polygon');arrow.setAttribute('points',points.map(p=>p.join(',')).join(' '));
 arrow.setAttribute('fill',move.color==='R'?'#b31f19':'#184cbb');arrow.setAttribute('stroke','#fff8dd');arrow.setAttribute('stroke-width','2');
 svg.append(arrow);document.getElementById('board').append(svg);
}
