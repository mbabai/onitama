// Resumable audit: node mate_search/audit_starting_states.js [worker count]
// Every input survives either in the verified library or the unproven file.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {Worker, isMainThread, parentPort, workerData} = require('node:worker_threads');
const {createHash} = require('node:crypto');
const {VERSION, createSolver} = require('./forced_mate');
const dir = __dirname;
if(!isMainThread){
 const {move_dictionary} = require('./engine_node');
 const solver = createSolver(move_dictionary);
 parentPort.on('message', batch => {
  const results=batch.map(record=>{
   const result=solver.solve(record.game_state, Math.max(11,record.mate_plies));
   delete result.nodes;
   if(result.principal_variation) result.principal_variation=result.principal_variation.map(m=>m.pass?{card_id:m.card_id,pass:true}:{card_id:m.card_id,from:m.from,to:m.to});
   return {...result,previous_mate_plies:record.mate_plies};
  });
  parentPort.postMessage(results);
 });
} else {
 const inputPath=path.join(dir,'mate_starting_states.json');
 const inputText=fs.readFileSync(inputPath,'utf8'), input=JSON.parse(inputText);
 const digest=createHash('sha256').update(inputText).digest('hex');
 const workDir=path.join(dir,'.audit');fs.mkdirSync(workDir,{recursive:true});
 const checkpoint=path.join(workDir,VERSION+'-'+digest+'.jsonl');
 const done=new Map();
 if(fs.existsSync(checkpoint)){
  const lines=fs.readFileSync(checkpoint,'utf8').split('\n');
  for(let i=0;i<lines.length;i++) if(lines[i].trim()){
   try {const r=JSON.parse(lines[i]);done.set(r.game_state,r);}
   catch(error){if(i<lines.length-2) throw error;fs.writeFileSync(checkpoint,lines.slice(0,i).join('\n')+'\n');}
  }
 }
 const pending=input.starting_states.filter(r=>!done.has(r.game_state)||done.get(r.game_state).verified_depth<Math.max(11,r.mate_plies));
 const count=Math.max(1,Math.min(16,Number(process.argv[2])||Math.max(1,os.availableParallelism()-2)));
 const workers=[];let cursor=0,active=0,lastLog=0;
 console.log(`Auditing ${input.starting_states.length} saved claims; ${done.size} resumed; ${count} workers.`);
 function finish(){
  const verified=[],unproven=[],changes=[];
  for(const original of input.starting_states){
   const r=done.get(original.game_state);
   if(r.status==='verified'){
    const {previous_mate_plies,...record}=r;verified.push(record);
    if(previous_mate_plies!==r.mate_plies) changes.push({game_state:r.game_state,previous_mate_plies,mate_plies:r.mate_plies});
   } else unproven.push(r);
  }
  const distribution={};for(const r of verified) distribution[r.mate_plies]=(distribution[r.mate_plies]||0)+1;
  const audit={version:VERSION,input_sha256:digest,completed_at:new Date().toISOString(),input_count:input.starting_states.length,verified_count:verified.length,unproven_count:unproven.length,scan_max_depth:11,max_verification_depth:input.starting_states.reduce((d,r)=>Math.max(d,r.mate_plies),11),beyond_scan_count:verified.filter(r=>r.mate_plies>11).length,distribution,changed_count:changes.length,changes};
  // Compact records keep both downloadable and file:// bundles practical.
  const metadata={schema_version:3,exported_at:input.exported_at,search:input.search,audit};
  fs.writeFileSync(path.join(dir,'mate_audit_unproven.json'),JSON.stringify({audit,starting_states:unproven},null,2)+'\n');
  fs.writeFileSync(path.join(dir,'mate_audit_report.json'),JSON.stringify(audit,null,2)+'\n');
  require('./merge_starting_states').writeMergedFiles(verified,metadata,inputPath,path.join(dir,'mate_starting_states.js'));
  console.log(JSON.stringify({...audit,changes:undefined}));
  for(const w of workers) w.terminate();
 }
 function dispatch(w){
  if(cursor>=pending.length){if(!active) finish();return;}
  const batch=pending.slice(cursor,cursor+25);cursor+=batch.length;active++;w.postMessage(batch);
 }
 if(!pending.length) finish();
 else for(let i=0;i<count;i++){
  const w=new Worker(__filename);workers.push(w);
  w.on('error',error=>{console.error(error);process.exit(1);});
  w.on('message',results=>{
   fs.appendFileSync(checkpoint,results.map(r=>JSON.stringify(r)).join('\n')+'\n');
   for(const r of results) done.set(r.game_state,r);active--;
   if(Date.now()-lastLog>15000){console.log(`${done.size}/${input.starting_states.length} audited`);lastLog=Date.now();}
   dispatch(w);
  });dispatch(w);
 }
}
