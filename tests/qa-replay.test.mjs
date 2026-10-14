import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeObservation} from '../scripts/qa/oracle.mjs';
import {replay} from '../scripts/qa-replay.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'qa-review-'));try{
 const before=normalizeObservation({boardVisible:true,winClaim:false,score:0,stock:{empty:false},waste:{empty:true},foundations:Array.from({length:5},()=>({empty:true})),columns:Array.from({length:5},()=>({empty:true,cards:[]}))},{width:1440,height:900});
 const after=structuredClone(before);after.waste={empty:false,count:null,top:{label:'Orb',category:'King',kind:'item',point:[10,10],confidence:1}};
 const events=[{type:'initial',observation:before},{type:'action',before,after,action:{kind:'draw'},verdict:{effect:'ACCEPTED'},delivery:{confirmed:true}}];
 const trace=events.map(JSON.stringify).join('\n')+'\n';await writeFile(join(dir,'events.jsonl'),trace);await writeFile(join(dir,'evidence.png'),'test evidence bytes');
 const review={schemaVersion:1,reviewer:'test fixture',traceSHA256:sha(trace),corrections:[{actionNumber:1,field:'foundations.0.empty',value:true,reason:'Test evidence binding only',evidence:[{file:'evidence.png',sha256:sha('test evidence bytes')}]}]};
 const execute=async()=>{await writeFile(join(dir,'review.json'),JSON.stringify(review));return replay(join(dir,'events.jsonl'),join(dir,'review.json'),join(dir,'out'));};await fn({dir,events,trace,review,execute});
 }finally{await rm(dir,{recursive:true,force:true});}}
it('replays an explicitly assisted review without modifying the original trace',()=>fixture(async({dir,trace,execute})=>{const r=await execute();expect(r.assisted).toBe(true);expect(r.outcome).toBe('INCOMPLETE');expect(r.corrections).toHaveLength(1);expect(await readFile(join(dir,'events.jsonl'),'utf8')).toBe(trace);}));
it('rejects a changed trace',()=>fixture(async({review,execute})=>{review.traceSHA256='bad';await expect(execute()).rejects.toThrow('trace hash');}));
it('rejects changed screenshot evidence',()=>fixture(async({review,execute})=>{review.corrections[0].evidence[0].sha256='bad';await expect(execute()).rejects.toThrow('Evidence hash');}));
it('cannot override score, victory or ledger conclusions',()=>fixture(async({review,execute})=>{review.corrections[0].field='score';review.corrections[0].value=1300;await expect(execute()).rejects.toThrow('Unsupported');}));
it('rejects corrections with no matching action',()=>fixture(async({review,execute})=>{review.corrections[0].actionNumber=2;await expect(execute()).rejects.toThrow('did not match');}));
it('rejects an observation continuity break',()=>fixture(async({dir,events,review,execute})=>{events[1].before=structuredClone(events[1].before);events[1].before.score=10;const text=events.map(JSON.stringify).join('\n');await writeFile(join(dir,'events.jsonl'),text);review.traceSHA256=sha(text);await expect(execute()).rejects.toThrow('continuity');}));
