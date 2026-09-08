// Shared by browser exports and the Node merge utility.
(function(root){
const VERSION='forced-v1';
function verified(record){
 return record?.verification===VERSION && record.status==='verified'
  && Number.isInteger(record.mate_plies) && record.mate_plies>0 && record.mate_plies%2===1
  && record.verified_depth>=record.mate_plies
  && Array.isArray(record.principal_variation) && record.principal_variation.length===record.mate_plies;
}
function normalize(record){
 const d=Number(record?.mate_plies);
 if(typeof record?.game_state!=='string'||!Number.isInteger(d)||d<1||d%2!==1) throw Error('Invalid mate record');
 const result={...record,mate_plies:d};
 if(record.verification===VERSION&&!verified(result)) throw Error('Incomplete verified mate record');
 return result;
}
function prefer(a,b){
 // Historical claims can never replace a freshly verified result.
 if(verified(a)!==verified(b)) return verified(b)?b:a;
 if(b.mate_plies!==a.mate_plies) return b.mate_plies<a.mate_plies?b:a;
 return (b.principal_variation?.length||0)>(a.principal_variation?.length||0)?b:a;
}
const api={verified,normalize,prefer};
if(typeof module!=='undefined'&&module.exports) module.exports=api;else root.MateRecords=api;
})(typeof window!=='undefined'?window:globalThis);
