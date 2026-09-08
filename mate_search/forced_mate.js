/* Exact, bounded AND/OR proof search. No evaluation scores or probabilistic keys.
 * Attacker chooses one winning move; EVERY defender reply must remain winning.
 * Depth is individual turns (plies), including compulsory card-exchange passes.
 */
(function(root){
"use strict";
const VERSION = "forced-v1";
function createSolver(dictionary, bits = 19){
 const size = 1 << bits, mask = size - 1;
 const occupied = new Uint32Array(size), red = new Uint32Array(size), masters = new Uint32Array(size);
 const cards = new Uint32Array(size), depths = new Uint8Array(size), generations = new Uint32Array(size);
 const outcomes = new Uint8Array(size), best = new Uint16Array(size);
 const targets = [], names = [];
 for(let c=0;c<32;c++){
  const entry = dictionary[String(c).padStart(2,"0")]; names[c] = entry.name;
  for(let side=0;side<2;side++) for(let from=0;from<25;from++){
   const list=[];
   for(const raw of entry.moves){
    let dx=0,dy=0;
    for(const ch of raw){if(ch==="r") dx++; if(ch==="l") dx--; if(ch==="f") dy--; if(ch==="b") dy++;}
    if(side){dx=-dx;dy=-dy;}
    const x=from%5+dx,y=Math.floor(from/5)+dy;
    if(x>=0 && x<5 && y>=0 && y<5) list.push(y*5+x);
   }
   targets[(c*2+side)*25+from]=list;
  }
 }
 let generation=0, attacker=0, nodes=0;
 const buffers=Array.from({length:64},()=>new Uint16Array(210));
 const scores=Array.from({length:64},()=>new Int32Array(210));
 function parse(state){
  if(!/^[epPmM]{25}(\d{2}-){4}\d{2}X[RB]$/.test(state)) throw Error("Invalid game state");
  let o=0,r=0,m=0,c=0;
  for(let i=0;i<25;i++){const p=state[i];if(p!=="e"){o|=1<<i;if(p===p.toUpperCase()) r|=1<<i;if(p.toLowerCase()==="m") m|=1<<i;}}
  const ids=state.slice(25,39).split("-").map(Number);
  if(ids.some(v=>v>31)||new Set(ids).size!==5) throw Error("Invalid cards");
  ids.forEach((v,i)=>c|=v<<(i*5));
  return {o,r,m,c,t:state[40]==="R"?0:1};
 }
 function winner(s){
  if(!(s.m&~s.r)||(s.m&s.r&4)) return 0;
  if(!(s.m&s.r)||(s.m&~s.r&(1<<22))) return 1;
  return -1;
 }
 function moves(s,ply,hint=0){
  const list=buffers[ply],rank=scores[ply],own=s.t?s.o&~s.r:s.r;
  let count=0,pieces=own;
  while(pieces){
   const bit=pieces&-pieces,from=31-Math.clz32(bit);pieces^=bit;
   for(let slot=s.t*2;slot<s.t*2+2;slot++){
    const card=(s.c>>>(slot*5))&31;
    for(const to of targets[(card*2+s.t)*25+from]){
     const target=1<<to;if(own&target) continue;
     const move=1+slot+(from<<2)+(to<<7);
     let score=move===hint?100000:0;
     if(s.o&target) score+=(s.m&target)?90000:100;
     if(s.m&bit) score+=to===(s.t?22:2)?90000:20+(s.t?Math.floor(to/5):4-Math.floor(to/5));
     let j=count;while(j>0&&rank[j-1]<score){list[j]=list[j-1];rank[j]=rank[j-1];j--;}
     list[j]=move;rank[j]=score;count++;
    }
   }
  }
  // A pass is legal only when neither card permits any piece move.
  if(!count){list[count++]=4097+s.t*2;list[count++]=4098+s.t*2;}
  return count;
 }
 function next(s,move){
  const code=move-1,slot=code&3,delta=((s.c>>>(slot*5))&31)^((s.c>>>20)&31);
  const c=s.c^(delta<<(slot*5))^(delta<<20);
  if(code&4096) return {o:s.o,r:s.r,m:s.m,c,t:1-s.t};
  const from=(code>>>2)&31,to=(code>>>7)&31,a=1<<from,b=1<<to;
  return {o:(s.o&~a)|b,r:(s.r&~a&~b)|(s.t?0:b),m:(s.m&~a&~b)|((s.m&a)?b:0),c,t:1-s.t};
 }
 function index(s,d){return (Math.imul(s.o,31)^Math.imul(s.r,131)^Math.imul(s.m,8191)^Math.imul(s.c,524287)^(s.t<<16)^Math.imul(d,2654435761))&mask;}
 function hit(s,d,i){return generations[i]===generation&&depths[i]===d&&occupied[i]===s.o&&red[i]===s.r&&masters[i]===s.m&&cards[i]===(s.c|(s.t<<25));}
 function prove(s,d,ply){
  nodes++;
  const w=winner(s);if(w>=0) return w===attacker;
  if(d===0) return false;
  const i=index(s,d);if(hit(s,d,i)) return outcomes[i]===1;
  const count=moves(s,ply),list=buffers[ply],attack=s.t===attacker;
  let result=!attack,chosen=list[0];
  for(let j=0;j<count;j++){
   const move=list[j],win=prove(next(s,move),d-1,ply+1);
   if(win===attack){result=win;chosen=move;break;}
  }
  generations[i]=generation;depths[i]=d;occupied[i]=s.o;red[i]=s.r;masters[i]=s.m;cards[i]=s.c|(s.t<<25);outcomes[i]=result?1:0;best[i]=chosen;
  return result;
 }
 function distance(s,bound,ply){
  const w=winner(s);if(w>=0) return w===attacker?0:Infinity;
  for(let d=s.t===attacker?1:2;d<=bound;d+=2) if(prove(s,d,ply)) return d;
  return Infinity;
 }
 function describe(s,move){
  const code=move-1,slot=code&3,card=(s.c>>>(slot*5))&31;
  const out={color:s.t?"B":"R",card:names[card],card_id:String(card).padStart(2,"0")};
  if(code&4096) return {...out,pass:true};
  const from=(code>>>2)&31,to=(code>>>7)&31,coord=n=>String.fromCharCode(65+n%5)+(Math.floor(n/5)+1);
  return {...out,from,to,from_coord:coord(from),to_coord:coord(to)};
 }
 function solve(state,maxDepth=11){
  if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>31) throw Error("Depth must be 1–31 plies");
  const initial=parse(state);attacker=initial.t;generation=(generation+1)>>>0;if(!generation){generations.fill(0);generation=1;}nodes=0;
  const d=distance(initial,maxDepth,0);
  if(!Number.isFinite(d)) return {game_state:state,verification:VERSION,status:"not_proven",verified_depth:maxDepth,nodes};
  const line=[];let s=initial,remaining=d;
  while(remaining){
   const count=moves(s,0),list=Array.from(buffers[0].subarray(0,count));
   let chosen=0,childDistance=s.t===attacker?Infinity:-1;
   for(const move of list){
    const child=next(s,move);
    // At attacker nodes a witness within d-1 is sufficient: minimality was proved.
    if(s.t===attacker){if(prove(child,remaining-1,1)){chosen=move;childDistance=remaining-1;break;}}
    else {const n=distance(child,remaining-1,1);if(n>childDistance){childDistance=n;chosen=move;}if(n===remaining-1) break;}
   }
   if(!chosen||childDistance!==remaining-1) throw Error("Inconsistent principal variation");
   line.push(describe(s,chosen));s=next(s,chosen);remaining--;
  }
  if(line.length!==d||winner(s)!==attacker) throw Error("Incomplete principal variation");
  return {game_state:state,mate_plies:d,mate_moves:Math.ceil(d/2),verification:VERSION,status:"verified",verified_depth:maxDepth,principal_variation:line,nodes};
 }
 return {solve,parse,moves:(s)=>{const n=moves(s,0);return Array.from(buffers[0].subarray(0,n));},next,winner,describe};
}
const api={VERSION,createSolver};
if(typeof module!=="undefined"&&module.exports) module.exports=api;
else root.ForcedMate=api;
})(typeof self!=="undefined"?self:globalThis);
