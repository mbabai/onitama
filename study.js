/* Saved principal-variation playback, independent of live game/AI state. */
let studyRecord=null,studyStates=[],studyPly=0,studyTimer=null;
function openStudy(record){
 if(!MateRecords.verified(record)) return;
 stopStudy();studyRecord=record;studyPly=0;studyStates=[record.game_state];
 for(const m of record.principal_variation){
  const state=studyStates[studyStates.length-1];
  studyStates.push(doMove(state,{cardID:m.card_id,color:whosTurn(state),startLocation:m.from??-1,targetLocation:m.to??-1,pass:!!m.pass}));
 }
 renderStudy();document.getElementById('studyDialog').showModal();
}
function studySelected(moves){openStudy(getSelectedMateStartingState(moves));}
function stopStudy(){clearInterval(studyTimer);studyTimer=null;const b=document.getElementById('studyPlay');if(b)b.textContent='Play line';}
function stepStudy(delta){stopStudy();studyPly=Math.max(0,Math.min(studyStates.length-1,studyPly+delta));renderStudy();}
function playStudy(){
 if(studyTimer){stopStudy();return;}
 if(studyPly===studyStates.length-1)studyPly=0;
 document.getElementById('studyPlay').textContent='Pause';renderStudy();
 studyTimer=setInterval(()=>{studyPly++;renderStudy();if(studyPly===studyStates.length-1)stopStudy();},1100);
}
function renderStudy(){
 if(!studyRecord)return;
 const state=studyStates[studyPly],last=studyRecord.principal_variation[studyPly-1];
 document.getElementById('studyTitle').textContent='Forced mate in '+studyRecord.mate_moves;
 document.getElementById('studyStatus').textContent=studyPly===studyStates.length-1?(whosTurn(studyRecord.game_state)==='R'?'Red':'Blue')+' wins':(whosTurn(state)==='R'?'Red':'Blue')+' to move · Ply '+studyPly+' / '+studyRecord.mate_plies;
 const board=document.getElementById('studyBoard');board.replaceChildren();
 for(let i=0;i<25;i++){
  const cell=document.createElement('div');cell.className='studySquare'+(i===2||i===22?' temple':'')+(last&&(last.from===i||last.to===i)?' lineSquare':'');
  if(i===2||i===22)cell.dataset.templeColor=i===2?'blue':'red';
  const coord=String.fromCharCode(65+i%5)+(Math.floor(i/5)+1);
  const label=document.createElement('small');label.textContent=coord;cell.append(label);
  if(state[i]!=='e'){
   const piece=document.createElement('span');piece.className='studyPiece '+(state[i]===state[i].toUpperCase()?'red':'blue')+(state[i].toLowerCase()==='m'?' master':'');
   piece.textContent=state[i].toLowerCase()==='m'?'王':'';cell.append(piece);
   cell.setAttribute('aria-label',coord+' '+(state[i]===state[i].toUpperCase()?'red':'blue')+' '+(state[i].toLowerCase()==='m'?'master':'student'));
  }else cell.setAttribute('aria-label',coord+' empty');
  board.append(cell);
 }
 const hands=document.getElementById('studyCards');hands.replaceChildren();
 [['Red',0,2],['Neutral',4,5],['Blue',2,4]].forEach(([name,a,b])=>{
  const group=document.createElement('div');const title=document.createElement('strong');title.textContent=name;group.append(title);
  getGameStateCardIDs(state).slice(a,b).forEach(id=>{const card=document.createElement('img');card.src='images/'+move_dictionary[id].name+'.jpeg';card.alt=titleCase(move_dictionary[id].name);group.append(card);});hands.append(group);
 });
 const list=document.getElementById('studyLine');list.replaceChildren();
 studyRecord.principal_variation.forEach((m,i)=>{
  const b=document.createElement('button');b.type='button';b.className='lineMove'+(i+1===studyPly?' current':'');b.setAttribute('aria-current',i+1===studyPly?'step':'false');
  const coord=n=>String.fromCharCode(65+n%5)+(Math.floor(n/5)+1);
  b.textContent=(i+1)+'. '+titleCase(move_dictionary[m.card_id].name)+' · '+(m.pass?'pass & exchange':coord(m.from)+' → '+coord(m.to));
  b.onclick=()=>{stopStudy();studyPly=i+1;renderStudy();};list.append(b);
 });
 document.getElementById('studyPrevious').disabled=studyPly===0;
 document.getElementById('studyNext').disabled=studyPly===studyStates.length-1;
}
function fitGame(){
	const area=document.getElementById('gameArea');if(!area)return;
	// innerWidth can include overflowing content on mobile; use the layout viewport.
	const width=document.documentElement.clientWidth;
	const base=window.matchMedia('(orientation:portrait)').matches?600:1280;
	const scale=Math.min(1,Math.max(1,width-24)/base);
	area.style.setProperty('--game-scale',scale);
	area.style.zoom=scale;area.style.marginLeft=Math.max(12,(width-base*scale)/2)/scale+'px';
}
window.addEventListener('resize',fitGame);
new ResizeObserver(fitGame).observe(document.documentElement);
document.getElementById('studyDialog').addEventListener('close',stopStudy);
fitGame();
