#!/usr/bin/env node
import {mkdir,writeFile,appendFile,rename} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {openBrowser,perform} from './qa/browser.mjs';
import {observe} from './qa/observer.mjs';
import {Ledger,OUTCOMES,chooseAction,stateKey,actionKey} from './qa/oracle.mjs';

export function parseArgs(args){
  const c={backend:'local',observer:'vision',model:'qwen3.6:latest',visionUrl:'http://localhost:11434',inferenceMs:120000,awsProfile:'opensearchprod',region:'us-east-1',browserId:'aws.browser.v1',settleMs:600,maxSteps:1500,maxSeconds:1200,games:10,probe:false,output:`qa-results/${new Date().toISOString().replace(/[:.]/g,'-')}`};
  const keys={'settle-ms':'settleMs','url':'url','output':'output','backend':'backend','observer':'observer','model':'model','vision-url':'visionUrl','python':'python','aws-profile':'awsProfile','region':'region','browser-id':'browserId','max-steps':'maxSteps','max-seconds':'maxSeconds','games':'games','inference-ms':'inferenceMs'};
  for(let i=0;i<args.length;i++){const k=args[i].replace(/^--/,'');if(['probe','headed','video','validate-only','calibration'].includes(k)){c[k.replace('-only','Only')]=true;continue;}if(!keys[k]||!args[i+1])throw new Error(`Unknown/missing option ${args[i]}`);const key=keys[k],v=args[++i];c[key]=typeof c[key]==='number'?Number(v):v;}
  if(!c.url||!['http:','https:'].includes(new URL(c.url).protocol))throw new Error('--url must be an HTTP(S) game URL');
  if(!['local','agentcore'].includes(c.backend)||!['vision','dom'].includes(c.observer))throw new Error('Unsupported backend/observer');
  for(const k of ['maxSteps','maxSeconds','games','inferenceMs','settleMs'])if(!Number.isInteger(c[k])||c[k]<1)throw new Error(`${k} must be a positive integer`);
  if(c.games>10)throw new Error('Use separate batches for more than ten slots');
  c.output=resolve(c.output);return c;
}
export const profiles=Array.from({length:10},(_,i)=>({width:i<5?1440:390,height:i<5?900:844,mobile:i>=5,input:i<3||i>=8?'drag':'tap'}));
const atomic=async(path,value)=>{await writeFile(path+'.tmp',JSON.stringify(value,null,2));await rename(path+'.tmp',path);};
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function report(config,rows){
  const counts=Object.fromEntries(OUTCOMES.map(x=>[x,rows.filter(r=>r.outcome===x).length]));
  const metrics={confirmedRuleViolationGames:rows.filter(r=>r.ledger?.findings.some(f=>f.status==='confirmed')).length,runtimeErrorGames:rows.filter(r=>r.runtime?.some(e=>e.type==='pageerror')).length,illegalAcceptedOccurrences:rows.reduce((n,r)=>n+(r.ledger?.findings.filter(f=>f.type==='illegal_action_accepted'&&f.status==='confirmed').length||0),0),suspectedLegalBlockedOccurrences:rows.reduce((n,r)=>n+(r.ledger?.findings.filter(f=>f.type==='legal_action_blocked').length||0),0)};
  const data={metrics,schemaVersion:1,config,scope:'exploratory; live build identity unverified; calibration incomplete',cohort:config.calibration?'controlled-calibration-fixture':config.probe?'isolated-negative-probes':'normal',counts,started:rows.filter(r=>r.started).length,games:rows};
  await atomic(join(config.output,'report.json'),data);
  await writeFile(join(config.output,'report.csv'),'game,outcome,stop,actions,seconds,confirmed,suspected\n'+rows.map(r=>[r.id,r.outcome,r.stop,r.actions,r.seconds,r.ledger?.findings.filter(f=>f.status==='confirmed').length||0,r.ledger?.findings.filter(f=>f.status==='suspected').length||0].map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'));
  const link=p=>p?escape(relative(config.output,p)):'';
  await writeFile(join(config.output,'index.html'),`<!doctype html><meta charset="utf-8"><title>Solitaire QA</title><style>body{font:16px system-ui;max-width:1200px;margin:40px auto;padding:20px;background:#f4f6fa;color:#18243a}table{border-collapse:collapse;width:100%;background:white}td,th{padding:12px;border:1px solid #ddd;text-align:left}code{white-space:pre-wrap}a{color:#1352b5}</style><h1>Solitaire UI QA — ${config.calibration?'CONTROLLED FIXTURE — not live-game evidence':config.probe?'separate probes':'normal games'}</h1><p>${escape(config.url)}</p><p><strong>Exploratory: build identity unverified; calibration incomplete.</strong> ${config.observer==='dom'?'Visible DOM assisted':'Screenshot vision'} observations. No hidden app state. Audio and source requirements are not observed. Unexercised rules are not passes. Failure to win does not prove an unwinnable deal.</p><p>${rows.filter(r=>r.started).length}/${config.games} started; ${config.probe?'probe outcomes excluded from normal win rate':`${counts.VALID_OBSERVED_WIN}/${config.games} validated wins`}. ${escape(JSON.stringify(counts))}</p><p>Overlapping metrics: ${escape(JSON.stringify(metrics))}</p><p><a href="report.json">Complete JSON, coverage and findings</a> · <a href="report.csv">CSV</a></p><table><tr><th>Slot / input</th><th>Outcome / stop</th><th>Actions / time</th><th>Evidence</th></tr>${rows.map(r=>`<tr><td>${escape(r.id)}<br>${r.profile.mobile?'phone':'desktop'} ${r.profile.input}</td><td>${escape(r.outcome)}<br>${escape(r.stop)}<br>${escape(r.error||'')}</td><td>${r.actions} / ${r.seconds}s</td><td><a href="${link(r.opening)}">Opening</a> <a href="${link(r.final)}">Final</a> <a href="${link(r.trace)}">Trace</a><br>${escape((r.cleanupErrors||[]).join('; '))}</td></tr>`).join('')}</table><h2>Findings and runtime errors</h2>${rows.map(r=>`<h3>${escape(r.id)}</h3><pre>${escape(JSON.stringify({findings:r.ledger?.findings||[],runtime:r.runtime||[]},null,2))}</pre>`).join('')}`);
  return data;
}
export async function run(config){
  await mkdir(config.output,{recursive:true});
  const hashes=Object.fromEntries(['deck.mjs','oracle.mjs','observer.mjs','browser.mjs'].map(f=>[f,createHash('sha256').update(readFileSync(new URL(`./qa/${f}`,import.meta.url))).digest('hex')]));
  await atomic(join(config.output,'manifest.json'),{config,hashes,startedAt:new Date().toISOString(),buildIdentity:'unverified',learning:false,gameSeed:'unavailable',node:process.version});
  if(config.validateOnly)return {validated:true,config};
  const rows=Array.from({length:config.games},(_,i)=>({id:`${config.probe?'probe':'game'}-${String(i+1).padStart(2,'0')}`,profile:profiles[i],actions:0,seconds:0,started:false,outcome:'NOT_STARTED',stop:'PENDING'}));
  await report(config,rows);
  for(let i=0;i<config.games;i++){
    const id=`${config.probe?'probe':'game'}-${String(i+1).padStart(2,'0')}`,dir=join(config.output,id),profile=profiles[i];await mkdir(dir,{recursive:true});
    const row={id,profile,actions:0,started:false,outcome:'NOT_STARTED',stop:'STARTUP',trace:join(dir,'events.jsonl'),solvability:'UNKNOWN'},ledger=new Ledger(),begin=Date.now();let session,o;
    const event=async e=>appendFile(row.trace,JSON.stringify({at:new Date().toISOString(),elapsedMs:Date.now()-begin,...e})+'\n');
    try{
      session=await openBrowser(config,profile,dir);await session.page.goto(config.url,{waitUntil:'domcontentloaded'});await session.page.waitForTimeout(1000);
      row.observationMs=0;row.modelCalls=0;
      const get=async n=>{if(config.observer==='vision'&&row.modelCalls>=1600)throw new Error('MODEL_CALL_BUDGET');if(Date.now()-begin>config.maxSeconds*1000)throw new Error('WALL_TIME_BUDGET');const file=join(dir,`${String(n).padStart(4,'0')}.png`);row.final=file;const t=Date.now();if(config.observer==='vision')row.modelCalls++;try{return await observe(session.page,{...config,inferenceMs:Math.min(config.inferenceMs,Math.max(1,config.maxSeconds*1000-(Date.now()-begin)))},profile,file);}finally{row.observationMs+=Date.now()-t;}};
      o=await get(0);row.opening=row.final;
      if(!o.boardVisible&&o.controls.find(c=>c.name==='start')){await perform(session.page,o,{kind:'control',...o.controls.find(c=>c.name==='start')},profile);await session.page.waitForTimeout(config.settleMs??600);o=await get('start');}
      ledger.observeInitial(o);row.started=o.boardVisible;await event({type:'initial',observation:o});
      const triedByState=new Map();
      row.stop=o.boardVisible?'ACTION_BUDGET':'BOARD_NOT_RECOGNIZED';
      for(let step=0;o.boardVisible&&!o.winClaim&&step<config.maxSteps;step++){
        if(Date.now()-begin>=config.maxSeconds*1000){row.stop='WALL_TIME_BUDGET';break;}
        const key=stateKey(o),tried=triedByState.get(key)||new Set();triedByState.set(key,tried);
        const a=chooseAction(o,tried,config.probe);if(!a){row.stop=config.probe?'PROBE_PREREQUISITES_EXHAUSTED':'POLICY_EXHAUSTED';break;}
        tried.add(actionKey(a));const before=o,pre=row.final;row.actions++;
        const during=join(dir,`gesture-${row.actions}.png`);const delivery=await perform(session.page,before,a,profile,during);
        await session.page.waitForTimeout(config.settleMs??600);o=await get(row.actions);
        // Two independently read settled observations must agree before adjudication.
        await session.page.waitForTimeout(Math.min(250,config.settleMs??600));const settled=await get(`${row.actions}-settled`);
        let verdict;if(stateKey(o)!==stateKey(settled)||o.winClaim!==settled.winClaim){ledger.gaps++;verdict={effect:'UNKNOWN',reason:'UNSETTLED'};}else verdict=ledger.verify(before,a,settled,delivery);
        o=settled;await event({type:'action',action:a,delivery,verdict,before,after:o,evidence:{before:pre,during,after:row.final}});
        row.ledger=ledger.json();row.seconds=(Date.now()-begin)/1000;await atomic(join(dir,'checkpoint.json'),row);
        if(config.probe&&verdict.effect==='ACCEPTED'){row.stop='PROBE_CHANGED_STATE';break;}
      }
      row.finalScore=o.score;row.outcome=ledger.outcome(o);if(row.started&&row.outcome==='NOT_STARTED')row.outcome='INCOMPLETE';if(o.winClaim)row.stop='WIN_CLAIM';else if(!o.boardVisible)row.stop=session.runtime.some(e=>e.type==='pageerror')?'BOARD_LOST_WITH_RUNTIME_ERROR':'BOARD_NOT_RECOGNIZED';
    }catch(e){row.error=e.message;row.stop=e.message==='WALL_TIME_BUDGET'?'WALL_TIME_BUDGET':'HARNESS_OR_OBSERVATION_ERROR';row.outcome=row.started?'INCOMPLETE':'NOT_STARTED';await event({type:'error',message:e.message});}
    finally{if(session){row.runtime=session.runtime;row.cleanupErrors=await session.close();}row.ledger=ledger.json();row.seconds=Math.round((Date.now()-begin)/100)/10;rows[i]=row;await report(config,rows);console.log(`${id}: ${row.outcome} (${row.stop}), ${row.actions} actions`);}
  }
  return report(config,rows);
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(parseArgs(process.argv.slice(2))).then(r=>console.log(`Report: ${r.config.output}/index.html`)).catch(e=>{console.error(e.message);process.exitCode=1;});
