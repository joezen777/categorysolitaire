#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {Ledger,stateKey} from './qa/oracle.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function replay(tracePath,reviewPath,output){
 const storedBytes=await readFile(tracePath),traceBytes=tracePath.endsWith('.gz')?gunzipSync(storedBytes):storedBytes,events=traceBytes.toString().trim().split('\n').map(JSON.parse);
 const review=reviewPath?JSON.parse(await readFile(reviewPath)):null;
 const terminalAction=events.filter(e=>e.type==='action').length;
 const ledger=new Ledger();let last=null,actionNumber=0;const applied=[];
 if(review&&(review.schemaVersion!==1||!review.reviewer||!Array.isArray(review.corrections)))throw new Error('Invalid review schema');
 if(review&&review.traceSHA256!==hash(traceBytes))throw new Error('Review trace hash mismatch');
 for(const event of events){
  if(event.type==='initial'){ledger.observeInitial(event.observation);last=event.observation;continue;}
  if(event.type!=='action')continue;actionNumber++;
  if(!last||stateKey(last)!==stateKey(event.before))throw new Error(`Observation continuity mismatch at action ${actionNumber}`);
  const after=structuredClone(event.after);
  for(const correction of review?.corrections.filter(c=>c.actionNumber===actionNumber)||[]){
   if(correction.actionNumber!==terminalAction)throw new Error('Only terminal foundation-observation reviews are supported');
   if(!/^foundations\.[0-4]\.empty$/.test(correction.field)||typeof correction.value!=='boolean'||!correction.reason||!correction.evidence?.length)throw new Error('Unsupported or insufficiently evidenced perception correction');
   for(const evidence of correction.evidence){const file=resolve(dirname(tracePath),evidence.file);if(!file.startsWith(dirname(resolve(tracePath))+'/'))throw new Error('Evidence must be within the game directory');if(hash(await readFile(file))!==evidence.sha256)throw new Error(`Evidence hash mismatch: ${evidence.file}`);}
   after.foundations[Number(correction.field.split('.')[1])].empty=correction.value;applied.push(correction);
  }
  if(event.verdict?.reason==='UNSETTLED'){ledger.unsettled();}else ledger.verify(event.before,event.action,after,event.delivery);
  last=after;
 }
 if(review&&applied.length!==review.corrections.length)throw new Error('Some corrections did not match trace actions');
 const outcome=ledger.outcome(last);
 const result={scope:review?'Supplemental perception-assisted review; original automatic report unchanged':'Deterministic trace replay',assisted:Boolean(review),reviewer:review?.reviewer||null,outcome,actions:actionNumber,finalScore:last?.score,traceSHA256:hash(traceBytes),oracleSHA256:hash(await readFile(new URL('./qa/oracle.mjs',import.meta.url))),corrections:applied,ledger:ledger.json()};
 await mkdir(output,{recursive:true});await writeFile(join(output,'reviewed-result.json'),JSON.stringify(result,null,2));
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [trace,review,output]=process.argv.slice(2);if(!trace||!output)throw new Error('Usage: node scripts/qa-replay.mjs TRACE REVIEW_JSON_OR_- OUTPUT_DIRECTORY');
 const result=await replay(resolve(trace),review==='-'?null:resolve(review),resolve(output));console.log(`${result.outcome}: ${result.ledger.completed.length} independently completed categories, ${result.ledger.gaps} gaps, assisted=${result.assisted}`);
}
