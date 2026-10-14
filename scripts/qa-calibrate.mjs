#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {startFixture} from './qa/fixture-server.mjs';
import {run,parseArgs} from './qa-evaluate.mjs';
const root=resolve(process.argv[2]||'qa-results/calibration');await mkdir(root,{recursive:true});
const fixture=await startFixture();const results=[];
const cases=[
 ...[1,4,6,9].map(slot=>({name:`reference-slot-${slot}`,slot,expected:'VALID_OBSERVED_WIN',steps:200})),
 {name:'reference-negative',probe:true,slot:4,expected:'INCOMPLETE',coverage:'R12',steps:3},
 {name:'wrong-score',mutation:'wrong-score',expected:'WIN_CLAIM_WITH_VIOLATIONS',rule:'R15',steps:200},
 {name:'missing-modal',mutation:'missing-modal',expected:'INCOMPLETE',rule:'R16',steps:200},
 {name:'premature-win',mutation:'premature-win',expected:'WIN_CLAIM_WITH_VIOLATIONS',rule:'R16',steps:1},
 {name:'no-reveal',mutation:'no-reveal',rule:'R10',steps:2},
 {name:'double-draw',mutation:'double-draw',rule:'R02',steps:32},
 {name:'reject-legal',mutation:'reject-legal',slot:4,rule:'R06',steps:2},
 {name:'duplicate-card',mutation:'duplicate-card',rule:'R22',steps:1},
 {name:'lose-card',mutation:'lose-card',rule:'R22',steps:1},
 {name:'wrong-progress',mutation:'wrong-progress',rule:'R13',steps:1},
 {name:'wrong-denominator',mutation:'wrong-denominator',rule:'R13',steps:1},
 {name:'accept-illegal',mutation:'accept-illegal',probe:true,rule:'R08',steps:1},
];
try{for(const test of cases){
 const c=parseArgs(['--url',`${fixture.url}?mutation=${test.mutation||'none'}`,'--observer','dom','--calibration','--games','1','--profile-slot',String(test.slot||1),'--max-steps',String(test.steps),'--max-seconds','240','--settle-ms','20','--output',join(root,test.name),...(test.probe?['--probe']:[])]);
 const r=await run(c),g=r.games[0],confirmed=g.ledger.findings.filter(f=>f.status==='confirmed');
 const passed=(!test.coverage||g.ledger.coverage[test.coverage].pass>0)&&(!test.expected||g.outcome===test.expected)&&(!test.rule||confirmed.some(f=>f.ruleId===test.rule))&&(test.mutation||!confirmed.length)&&(!test.mutation||g.outcome!=='VALID_OBSERVED_WIN');
 results.push({case:test.name,passed:Boolean(passed),expected:test.expected||`Detect ${test.rule}`,outcome:g.outcome,actions:g.actions,gaps:g.ledger.gaps,completed:g.ledger.completed.length,findings:confirmed});
 await writeFile(join(root,'calibration.json'),JSON.stringify({scope:'Controlled fixtures only; not live-game evidence',cases:results},null,2));console.log(`CALIBRATION ${test.name}: ${passed?'PASS':'FAIL'}`);
}}finally{await fixture.close();}
if(results.some(r=>!r.passed))process.exitCode=1;
