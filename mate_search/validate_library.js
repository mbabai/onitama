const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {replay}=require('./rules_reference');
const MateRecords=require('./record_schema');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'mate_starting_states.json'),'utf8'));
const window={};new Function('window',fs.readFileSync(path.join(__dirname,'mate_starting_states.js'),'utf8'))(window);
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
assert.equal(digest(data.starting_states),digest(window.MATE_STARTING_STATES),'JSON/JS records must match');
assert.deepEqual(data.search,window.MATE_STARTING_STATES_META.search);
assert.deepEqual(data.audit,window.MATE_STARTING_STATES_META.audit);
const seen=new Set(),counts={};let moves=0;
for(const record of data.starting_states){
 assert.ok(MateRecords.verified(record));assert.ok(!seen.has(record.game_state));seen.add(record.game_state);
 assert.equal(record.mate_moves,(record.mate_plies+1)/2);
 replay(record);moves+=record.principal_variation.length;
 counts[record.mate_plies]=(counts[record.mate_plies]||0)+1;
}
assert.equal(data.audit.verified_count,seen.size);assert.deepEqual(data.audit.distribution,counts);
console.log(JSON.stringify({records:seen.size,legal_pv_moves:moves,distribution:counts,next_index:data.search.next_index,records_sha256:digest(data.starting_states)}));
