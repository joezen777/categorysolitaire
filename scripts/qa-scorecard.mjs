#!/usr/bin/env node
// Builds qa/results/scorecard.json from ten-game evaluator reports plus the
// frozen Claude CLI rule probes. Usage:
//   node scripts/qa-scorecard.mjs <runs-dir> [review.json]
// <runs-dir> holds one evaluator output folder per deploy branch.
// review.json (optional) lists finding keys rejected after screenshot review:
//   {"<deployBranch>": {"rejected": {"<bug key>": "reason"}}}
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {CATEGORIES} from './qa/deck.mjs';
import {replay} from './qa-replay.mjs';

const [runsDir,reviewPath]=process.argv.slice(2);
if(!runsDir)throw new Error('Usage: qa-scorecard.mjs <runs-dir> [review.json]');
const review=reviewPath?JSON.parse(readFileSync(reviewPath,'utf8')):{};
const experiments=JSON.parse(readFileSync(new URL('../experiments/claude-cli-20261014/results.json',import.meta.url),'utf8'));
const probeDefects=Object.fromEntries(experiments.map(r=>[r.branch.replaceAll('.','-'),{checks:r.ruleChecks,defects:r.defects||[]}]));

// A complete win: a visible victory claim, score 1300 and no confirmed
// violation, with at least 12 categories independently observed completing.
// The victory overlay usually hides the 13th completion, so such wins are
// flagged terminalReview and their final frames must be checked by hand.
export function isCompleteWin(game){
  if(game.outcome==='VALID_OBSERVED_WIN')return true;
  return game.outcome==='WIN_CLAIM_UNVERIFIED'&&game.finalScore===CATEGORIES.length*100
    &&(game.ledger?.completed?.length??0)>=CATEGORIES.length-1
    &&!game.ledger.findings.some(f=>f.status==='confirmed');
}

export function summarize(branch,report,probes,rejected={}){
  const bugs=new Map();
  const add=(key,description,evidence)=>{if(rejected[key])return;const b=bugs.get(key)||{key,description,occurrences:0,games:new Set()};b.occurrences++;if(evidence)b.games.add(evidence);bugs.set(key,b);};
  for(const g of report.games){
    for(const f of g.ledger?.findings||[])if(f.status==='confirmed')add(`${f.ruleId}:${f.type}`,f.message.replace(/\d+/g,'N'),g.id);
    for(const e of g.runtime||[])if(e.type==='pageerror')add(`runtime:${e.message}`,`Uncaught error: ${e.message}`,g.id);
  }
  for(const d of probes?.defects||[])add(`probe:${d.id}`,`Rule probe failed: ${d.name}`,null);
  const list=[...bugs.values()].map(b=>({...b,games:[...b.games]}));
  const games=report.games.length,started=report.games.filter(g=>g.started).length;
  const wins=report.games.filter(isCompleteWin).map(g=>g.id);
  const terminalReview=report.games.filter(g=>isCompleteWin(g)&&g.outcome!=='VALID_OBSERVED_WIN').map(g=>g.id);
  const probesPassed=!probes||probes.checks.passed===probes.checks.total;
  return {branch,games,started,wins:wins.length,winningGames:wins,terminalReview,bugs:list.length,bugList:list,
    ruleProbes:probes?.checks||null,threeStars:list.length===0&&probesPassed&&wins.length>0,
    outcomes:report.counts||null};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const implementations={};
  for(const branch of readdirSync(runsDir).sort()){
    const path=join(runsDir,branch,'report.json');if(!existsSync(path))continue;
    const report=JSON.parse(readFileSync(path,'utf8'));
    // Re-derive each ledger from its saved trace with the current oracle.
    for(const g of report.games){
      const trace=join(runsDir,branch,g.id,'events.jsonl');if(!g.started||!existsSync(trace))continue;
      try{const r=await replay(trace,null,join(tmpdir(),'qa-scorecard',branch,g.id));g.ledger=r.ledger;g.outcome=r.outcome;g.replayed=true;}
      catch(e){g.replayError=e.message;}
    }
    implementations[branch]=summarize(branch,report,probeDefects[branch],review[branch]?.rejected);
  }
  const out={generatedAt:new Date().toISOString(),
    criteria:'Three stars: zero confirmed bugs, all targeted rule probes passed, and at least one of ten games won completely (13 categories, score 1300, victory shown, no confirmed violation).',
    bugDefinition:'Distinct confirmed evaluator findings (rule + type), distinct uncaught page errors, and failed Claude CLI rule probes, minus findings rejected on screenshot review.',
    implementations};
  writeFileSync(new URL('../qa/results/scorecard.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
  for(const [k,v] of Object.entries(implementations))console.log(`${k}: ${v.bugs} bugs, ${v.wins}/${v.games} wins${v.threeStars?' ★★★':''}`);
}
