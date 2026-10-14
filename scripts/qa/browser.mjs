import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const bounded=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error(`${label} timeout`)),ms);timer.unref();})]);

export async function openBrowser(config,profile,dir){
  let browser,context,bridge;const errors=[];
  const close=async()=>{
    if(context)await bounded(context.close(),10000,'Context cleanup').catch(e=>errors.push(e.message));
    if(browser)await bounded(browser.close(),10000,'Browser cleanup').catch(e=>errors.push(e.message));
    if(bridge){
      const ended=bridge.exitCode!==null?Promise.resolve():new Promise(resolve=>bridge.once('exit',resolve));
      bridge.stdin.end('stop\n');
      await Promise.race([ended,new Promise(resolve=>setTimeout(resolve,12000).unref())]);
      if(bridge.exitCode===null){bridge.kill('SIGTERM');await Promise.race([ended,new Promise(resolve=>setTimeout(resolve,4000).unref())]);}
      try{const state=JSON.parse(readFileSync(join(dir,'agentcore-session.json')));if(state.status!=='stopped')errors.push(`Cloud cleanup: ${state.status}; use recorded session ID to reconcile`);}catch(e){errors.push(`Session receipt: ${e.message}`);}
    }
    return errors;
  };
  try{
    if(config.backend==='agentcore'){
      const path=fileURLToPath(new URL('./agentcore_bridge.py',import.meta.url));
      bridge=spawn(config.python||'python3',[path],{env:{...process.env,AWS_PROFILE:config.awsProfile,AWS_REGION:config.region},stdio:['pipe','pipe','pipe']});
      let stderr='';bridge.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-3000);});
      const lines=createInterface({input:bridge.stdout});
      const ready=new Promise((resolve,reject)=>{bridge.once('error',reject);bridge.once('exit',code=>reject(new Error(`AgentCore bridge exited ${code}: ${stderr}`)));lines.once('line',line=>{try{const data=JSON.parse(line);if(data.error)reject(new Error(data.error));else resolve(data);}catch(e){reject(e);}});});
      bridge.stdin.write(JSON.stringify({region:config.region,browserId:config.browserId,name:`qa-${randomUUID()}`,clientToken:randomUUID(),timeout:1800,viewport:{width:profile.width,height:profile.height},record:join(dir,'agentcore-session.json')})+'\n');
      const connection=await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('AgentCore startup timeout')),60000).unref())]);
      browser=await chromium.connectOverCDP(connection.url,{headers:connection.headers,timeout:30000});
      context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,hasTouch:profile.mobile,isMobile:profile.mobile});
    }else{
      browser=await chromium.launch({headless:!config.headed});
      context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,hasTouch:profile.mobile,isMobile:profile.mobile,recordVideo:config.video?{dir:join(dir,'video')}:undefined});
    }
    const page=await context.newPage();
    page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);
    const runtime=[];
    page.on('pageerror',e=>runtime.push({type:'pageerror',message:e.message,time:new Date().toISOString()}));
    page.on('console',m=>{if(m.type()==='error')runtime.push({type:'console',message:m.text(),time:new Date().toISOString()});});
    page.on('requestfailed',r=>runtime.push({type:'requestfailed',url:r.url().split('?')[0],message:r.failure()?.errorText,time:new Date().toISOString()}));
    return {page,context,runtime,close,capabilities:{backend:config.backend,browser:'chromium',touch:profile.mobile,audio:false,video:config.backend==='local'&&config.video,visibleDOM:true}};
  }catch(e){await close();throw e;}
}
export async function perform(page,observation,action,profile,gestureFile){
  const at=point=>{if(!point)throw new Error('Missing actionable point');return point;};
  const tap=async([x,y])=>profile.mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
  if(action.kind==='draw'||action.kind==='recycle'){await tap(at(observation.stock.point));return {confirmed:false,method:'source-activation'};}
  if(action.kind==='control'){await tap(at(action.point));return {confirmed:false,method:'control'};}
  const cards=action.source.zone==='waste'?[observation.waste.top]:observation.columns[action.source.index].cards.slice(action.source.offset);
  const from=at(cards[0]?.point);const target=action.dest.zone==='foundation'?observation.foundations[action.dest.index]:observation.columns[action.dest.index];
  const to=at(action.dest.zone==='tableau'&&target.cards.length?target.cards.at(-1).point:target.point);
  if(profile.input==='tap'){
    await tap(from);await page.waitForTimeout(100);
    const selected=await page.evaluate(([x,y])=>Boolean(document.elementFromPoint(x,y)?.closest('[aria-selected="true"],[aria-pressed="true"]')),from);
    await page.screenshot({path:gestureFile});await tap(to);return {confirmed:selected,method:profile.mobile?'touch-tap':'pointer-tap'};
  }
  if(profile.mobile){
    const cdp=await page.context().newCDPSession(page);
    try{
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from[0],y:from[1],id:0}]});await page.waitForTimeout(250);
      for(let i=1;i<=16;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from[0]+(to[0]-from[0])*i/16,y:from[1]+(to[1]-from[1])*i/16,id:0}]});await page.waitForTimeout(15);}
      await page.screenshot({path:gestureFile});
    }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await cdp.detach();}
    return {confirmed:false,method:'touch-drag',gestureEvidence:gestureFile};
  }
  await page.mouse.move(...from);await page.mouse.down();
  try{await page.mouse.move(...to,{steps:20});await page.waitForTimeout(100);await page.screenshot({path:gestureFile});}
  finally{await page.mouse.up();}
  return {confirmed:false,method:'pointer-drag',gestureEvidence:gestureFile};
}
