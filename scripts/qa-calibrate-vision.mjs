#!/usr/bin/env node
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {observeImage} from './qa/observer.mjs';
const source=resolve(process.argv[2]||'qa/fixtures/golden');
const output=resolve(process.argv[3]||'qa-results/vision-calibration');await mkdir(output,{recursive:true});
// Explicit expected facts from the controlled fixture's public deal and action sequence.
// No observations from the DOM adapter are used as the expected vision answers.
const cases=[
 {name:'opening',file:'0000.png',score:0,win:false,labels:['King','Chimera','Vase','Io','Imagine'],emptyFoundations:true},
 {name:'king-completed',file:'4-settled.png',labels:[null,'Chimera','Vase','Io','Imagine'],score:100,win:false,emptyFoundations:true,firstColumnEmpty:true},
 {name:'complete-win',file:'142-settled.png',score:1300,win:true,emptyFoundations:true,emptyBoard:true},
];
const results=[];
for(const test of cases){
 const path=join(output,`${test.name}.png`);await copyFile(join(source,test.file),path);const started=Date.now();
 try{const o=await observeImage(await readFile(path),{model:process.env.QA_VISION_MODEL||'qwen3.6:latest',visionUrl:process.env.QA_VISION_URL||'http://localhost:11434',inferenceMs:120000},{width:1440,height:900},path);
 const checks={score:o.score===test.score,win:o.winClaim===test.win,foundations:o.foundations.every(f=>f.empty===true)};
 if(test.labels){checks.labels=test.labels.every((x,i)=>x===null?o.columns[i].cards.length===0:o.columns[i].cards.length===1&&o.columns[i].cards[0].label===x);checks.sourceGeometry=Array.isArray(o.stock.point)&&Math.abs(o.stock.point[0]-566)<36&&Math.abs(o.stock.point[1]-102)<50;checks.foundationGeometry=o.foundations.every((f,i)=>Array.isArray(f.point)&&Math.abs(f.point[0]-(566+76*i))<36&&Math.abs(f.point[1]-220)<50);}
 if(test.firstColumnEmpty)checks.firstColumn=o.columns[0].empty===true;
 if(test.emptyBoard)checks.emptyBoard=o.stock.empty===true&&o.waste.empty===true&&o.columns.every(c=>c.empty===true);
 results.push({case:test.name,passed:Object.values(checks).every(Boolean),checks,seconds:(Date.now()-started)/1000,observation:o});
 }catch(e){results.push({case:test.name,passed:false,error:e.message});}
 await writeFile(join(output,'calibration.json'),JSON.stringify({scope:'Three explicit fixture screenshots; partial perception calibration, not human-independent adjudication or a live game',model:process.env.QA_VISION_MODEL||'qwen3.6:latest',results},null,2));console.log(test.name,results.at(-1).passed?'PASS':'FAIL');
}
if(results.some(x=>!x.passed))process.exitCode=1;
