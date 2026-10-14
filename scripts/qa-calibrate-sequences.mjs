#!/usr/bin/env node
import {chromium} from 'playwright';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {startFixture} from './qa/fixture-server.mjs';
import {observe} from './qa/observer.mjs';
import {Ledger} from './qa/oracle.mjs';
import {perform} from './qa/browser.mjs';
const root=resolve(process.argv[2]||'qa-results/sequences');await mkdir(root,{recursive:true});const fixture=await startFixture();const browser=await chromium.launch();const results=[];
const profile={width:1440,height:900,mobile:false,input:'tap'};
try{for(const mutation of ['none','unicode-recycle','reverse-recycle']){
 const context=await browser.newContext({viewport:profile});const page=await context.newPage();const dir=join(root,mutation);await mkdir(dir,{recursive:true});let n=0;
 const get=()=>observe(page,{observer:'dom'},profile,join(dir,`${n++}.png`));
 try{await page.goto(`${fixture.url}?mutation=${mutation}`);let o=await get();const ledger=new Ledger();ledger.observeInitial(o);
 // Draw all 56 stock cards, recycle through the public control, then draw all 56 again.
 for(let i=0;i<113;i++){
  const a={kind:i===56?'recycle':'draw'};const before=o;const delivery=await perform(page,o,a,profile);await page.waitForTimeout(20);o=await get();const verdict=ledger.verify(before,a,o,delivery);await appendFile(join(dir,'events.jsonl'),JSON.stringify({step:i,before,action:a,after:o,verdict})+'\n');
 }
 const errors=ledger.findings.filter(f=>f.status==='confirmed');const passed=mutation!=='reverse-recycle'?!errors.length:errors.some(f=>f.ruleId==='R03');results.push({case:mutation,passed,findings:errors,coverage:ledger.coverage,gaps:ledger.gaps});
 }finally{await context.close();}
 await writeFile(join(root,'calibration.json'),JSON.stringify(results,null,2));console.log(mutation,results.at(-1).passed?'PASS':'FAIL');
}}finally{await browser.close();await fixture.close();}
if(results.some(x=>!x.passed))process.exitCode=1;
