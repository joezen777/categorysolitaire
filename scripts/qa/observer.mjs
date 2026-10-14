import {writeFile} from 'node:fs/promises';
import {DECK,identify} from './deck.mjs';
import {normalizeObservation} from './oracle.mjs';

export async function observe(page,config,profile,path){
  const image=await page.screenshot({path});
  let raw;
  if(config.observer==='vision'){
    const prompt=`Describe only the visible Category Solitaire board in this screenshot. Return JSON only. Never infer hidden cards. Known deck: ${JSON.stringify(DECK)}. Schema: {boardVisible:boolean,winClaim:boolean,score:number|null,stock:{point:[x,y],empty:boolean|null,count:number|null},waste:{top:card|null,empty:boolean|null},columns:[five {point:[x,y],empty:boolean|null,hidden:number|null,cards:[card in top-to-bottom order]}],foundations:[five {point:[x,y],empty:boolean|null,category:string|null,count:number|null,total:number|null,top:card|null}],controls:[{name: start|restart|menu|quit|sound|play-again,point:[x,y]}],warnings:[]}. card={label:exact known item or category name,point:[x,y] in its exposed clickable area,confidence:0..1}. Coordinates are screenshot pixels (${profile.width}x${profile.height}). Category captions on item cards are not separate cards. Count foundation deposited ITEMS only. Unknown values must be null. winClaim true only for explicit visible victory message; empty board or high score alone is insufficient.`;
    const response=await fetch(`${config.visionUrl}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,stream:false,think:false,format:'json',options:{temperature:0,num_predict:4500},messages:[{role:'user',content:prompt,images:[image.toString('base64')]}]}),signal:AbortSignal.timeout(config.inferenceMs)});
    if(!response.ok)throw new Error(`Vision HTTP ${response.status}`);
    const data=await response.json();await writeFile(`${path}.provider.json`,JSON.stringify(data,null,2));
    raw=JSON.parse(data.message.content);
  }else raw=await visibleDOM(page);
  await writeFile(`${path}.observation.json`,JSON.stringify(raw,null,2));
  return normalizeObservation(raw,profile);
}

// This optional adapter reads painted text and rectangles only. It never reads
// application state, data attributes, storage, source, or hidden card identities.
const layouts=new WeakMap();
export async function visibleDOM(page){
  const surfaces=await page.evaluate(()=>{
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity)!==0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;};
    const texts=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode;if(!n.textContent.trim()||!visible(n.parentElement))continue;
      const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();
      const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
      const hit=document.elementFromPoint(x,y);
      if(r.y<0||r.bottom>innerHeight||!hit||!(n.parentElement.contains(hit)||hit.contains(n.parentElement)))continue;
      texts.push({text:n.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height});
    }
    const boxes=[...document.body.querySelectorAll('*')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,border:s.borderStyle,shadow:s.boxShadow};}).filter(r=>r.w>=40&&r.w<=180&&r.h>=65&&r.h<=240&&r.w/r.h>.45&&r.w/r.h<.9&&(r.border!=='none'||r.shadow!=='none'));
    return {texts,boxes};
  });
  const unique=surfaces.boxes.filter((b,i,all)=>!all.slice(0,i).some(a=>Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2&&Math.abs(a.w-b.w)<2));
  const groups=new Map();for(const b of unique){const key=Math.round(b.w/4)*4;groups.set(key,[...(groups.get(key)||[]),b]);}
  const boxes=[...groups.values()].sort((a,b)=>b.length-a.length)[0]||[];
  const rows=[];for(const b of boxes){let row=rows.find(r=>Math.abs(r[0].y-b.y)<5);if(!row)rows.push(row=[]);row.push(b);}
  let foundationRow=rows.filter(r=>r.length===5).sort((a,b)=>a[0].y-b[0].y)[0];
  const text=surfaces.texts.map(t=>t.text).join(' ');
  const base={boardVisible:false,winClaim:/\b(?:you win|you won|congratulations|victory)\b/i.test(text),score:null,columns:[],foundations:[],stock:{},waste:{},controls:[],warnings:['Visible DOM geometry adapter; unrecognized layouts remain unknown.']};
  const score=text.match(/Score\s*:?\s*(\d+)/i);if(score)base.score=Number(score[1]);
  for(const t of surfaces.texts){if(/^(start|play|new game|play again)$/i.test(t.text))base.controls.push({name:'start',point:[t.x+t.w/2,t.y+t.h/2]});}
  if(foundationRow)layouts.set(page,foundationRow);else foundationRow=layouts.get(page);
  if(!foundationRow||boxes.length<5)return base;
  foundationRow.sort((a,b)=>a.x-b.x);const fy=foundationRow[0].y,h=foundationRow[0].h,w=foundationRow[0].w;
  const inside=b=>surfaces.texts.filter(t=>t.x+t.w/2>=b.x&&t.x+t.w/2<=b.x+b.w&&t.y+t.h/2>=b.y&&t.y+t.h/2<=b.y+b.h);
  const card=b=>{const ts=inside(b),matches=ts.map(t=>({t,id:identify(t.text)})).filter(x=>x.id);const selected=matches.find(x=>x.id.kind==='item')||matches[0];return selected?{label:selected.id.label,point:[selected.t.x+selected.t.w/2,selected.t.y+selected.t.h/2],confidence:1}:null;};
  base.boardVisible=true;
  base.foundations=foundationRow.map(b=>{const top=card(b),identity=identify(top?.label),counter=inside(b).map(t=>t.text).join(' ').match(/(\d+)\s*\/\s*(\d+)/);return {point:[b.x+w/2,b.y+h/2],empty:!top&&inside(b).some(t=>/^(title|empty|category)$/i.test(t.text))?true:top?false:null,category:identity?.category,count:counter?Number(counter[1]):null,total:counter?Number(counter[2]):null,top};});
  const upper=boxes.filter(b=>b.y<fy-h/2).sort((a,b)=>a.x-b.x);
  if(upper.length===2){base.stock={point:[upper[0].x+w/2,upper[0].y+h/2],empty:inside(upper[0]).some(t=>/recycle|↻|⟳/.test(t.text))?true:inside(upper[0]).some(t=>/♦|♠|♣|♥/.test(t.text))?false:null};const top=card(upper[1]);base.waste={top,empty:top?false:null};}
  base.columns=foundationRow.map(f=>{const pile=boxes.filter(b=>b.y>fy+h-5&&Math.abs(b.x-f.x)<w/3).sort((a,b)=>a.y-b.y);const cards=pile.map(card).filter(Boolean);return {point:[f.x+w/2,pile[0]?.y+h/2||fy+h*1.7],empty:null,hidden:null,cards};});
  return base;
}
