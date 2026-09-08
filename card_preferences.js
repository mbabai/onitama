// Shared deal and puzzle constraints. Required cards can occupy any of the five slots.
(function(root){
function normalize(ids, saved={}, legacy=ids){
 const allowed=new Set(legacy),modes={};let required=0;
 for(const id of ids){
  const mode=saved[id]|| (allowed.has(id)?'include':'exclude');
  modes[id]=mode==='require'&&required<5?(required++,'require'):mode==='exclude'?'exclude':'include';
 }
 if(ids.filter(id=>modes[id]!=='exclude').length<5) for(const id of ids) if(modes[id]==='exclude') modes[id]='include';
 return modes;
}
function change(modes,id,mode){
 if(!(id in modes)||!['include','exclude','require'].includes(mode))return {error:'Invalid card choice.'};
 const next={...modes,[id]:mode},values=Object.values(next);
 if(values.filter(v=>v==='require').length>5)return {error:'You can require at most five cards.'};
 if(values.filter(v=>v!=='exclude').length<5)return {error:'Keep at least five cards included or required.'};
 return {modes:next};
}
function matches(ids,modes){
 return ids.every(id=>modes[id]!=='exclude')&&Object.keys(modes).every(id=>modes[id]!=='require'||ids.includes(id));
}
function deal(modes,random=Math.random){
 const required=Object.keys(modes).filter(id=>modes[id]==='require');
 const optional=Object.keys(modes).filter(id=>modes[id]==='include');
 if(required.length>5||required.length+optional.length<5)throw Error('Invalid card restrictions');
 function shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
 return shuffle(required.concat(shuffle(optional).slice(0,5-required.length)));
}
function startingConfigurations(modes){
 const values=Object.values(modes),required=values.filter(mode=>mode==='require').length;
 const optional=values.filter(mode=>mode==='include').length,needed=5-required;
 if(needed<0||optional<needed)return 0;
 let sets=1;
 for(let i=1;i<=needed;i++)sets=sets*(optional-i+1)/i;
 // Five neutral-card choices and six ways to split the remaining cards into hands.
 // The neutral card determines who starts; order within each hand is irrelevant.
 return Math.round(sets)*30;
}
const api={normalize,change,matches,deal,startingConfigurations};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CardPreferences=api;
})(typeof window!=='undefined'?window:globalThis);
