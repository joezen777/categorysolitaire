import {describe,it,expect} from 'vitest';
import {chromium} from 'playwright';
import {perform} from '../scripts/qa/browser.mjs';
import {visibleDOM} from '../scripts/qa/observer.mjs';
import {normalizeObservation} from '../scripts/qa/oracle.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
describe('browser gesture calibration',()=>{
 for(const mobile of [false,true])for(const input of ['tap','drag'])it(`${mobile?'touch':'pointer'} ${input} delivers native events`,async()=>{
  const browser=await chromium.launch(),dir=await mkdtemp(join(tmpdir(),'qa-gesture-'));
  try{const context=await browser.newContext({viewport:{width:600,height:600},hasTouch:mobile,isMobile:mobile});const page=await context.newPage();
   await page.setContent('<style>body{touch-action:none}button{position:absolute;width:100px;height:100px}#a{left:50px;top:50px}#b{left:250px;top:50px}</style><button id="a">King</button><button id="b">Title</button><script>window.events=[];for(const t of ["pointerdown","pointerup","touchstart","touchmove","touchend","click"])document.addEventListener(t,e=>window.events.push({type:t,pointerType:e.pointerType}));</script>');
   const o=normalizeObservation({boardVisible:true,winClaim:false,waste:{top:{label:'King',confidence:1,point:[100,100]}},foundations:[{empty:true,point:[300,100]}]}, {width:600,height:600});
   await perform(page,o,{kind:'move',source:{zone:'waste'},dest:{zone:'foundation',index:0}},{mobile,input},join(dir,'gesture.png'));
   const events=await page.evaluate(()=>window.events);expect(events.some(e=>e.type==='pointerdown')).toBe(true);expect(events.some(e=>e.type==='pointerup')).toBe(true);
   if(mobile)expect(events.some(e=>e.type==='touchstart')).toBe(true);if(mobile&&input==='drag')expect(events.some(e=>e.type==='touchmove')).toBe(true);
   if(!mobile)expect(events.some(e=>e.type==='touchstart')).toBe(false);
  }finally{await browser.close();await rm(dir,{recursive:true,force:true});}
 },20000);
 it('does not recognize an empty page as a board',async()=>{const b=await chromium.launch();try{const p=await b.newPage();await p.setContent('<p>Loading</p>');expect((await visibleDOM(p)).boardVisible).toBe(false);}finally{await b.close();}});
});
