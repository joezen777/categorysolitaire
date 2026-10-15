import {writeFile} from 'node:fs/promises';
import {DECK,identify} from './deck.mjs';
import {normalizeObservation} from './oracle.mjs';

export async function observeImage(image,config,profile,path){
  let raw;
    const prompt=`Describe only the visible Category Solitaire board in this screenshot. Return JSON only. Never infer hidden cards. Known deck: ${JSON.stringify(DECK)}. Schema: {boardVisible:boolean,winClaim:boolean,score:number|null,stock:{point:[x,y],empty:boolean|null,count:number|null},waste:{top:card|null,empty:boolean|null},columns:[five {point:[x,y],empty:boolean|null,hidden:number|null,cards:[card in top-to-bottom order]}],foundations:[five {point:[x,y],empty:boolean|null,category:string|null,count:number|null,total:number|null,top:card|null}],controls:[{name: start|restart|menu|quit|sound|play-again,point:[x,y]}],warnings:[]}. card={label:exact known item or category name,point:[x,y] in its exposed clickable area,confidence:0..1}. Return point coordinates normalized to 0..1000 in BOTH axes (x=1000 is the right edge, y=1000 is the bottom edge), irrespective of image resolution. The image is ${profile.width}x${profile.height} pixels. The upper pair is stock/waste; the five slots immediately below it are foundations; the five lower stacks are tableau columns. Empty dashed placeholders with words such as Empty, Title, Foundation or Draft contain NO card: top=null or cards=[], empty=true. Recycle or a recycle icon in the stock slot means stock empty=true; it is a control, never a card. Never put placeholder/control text into card labels. Category captions on item cards are not separate cards. Count foundation deposited ITEMS only. Unknown values must be null. winClaim true only for explicit visible victory message; empty board or high score alone is insufficient.`;
    const response=await fetch(`${config.visionUrl}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,stream:false,think:false,format:'json',options:{temperature:0,num_predict:4500},messages:[{role:'user',content:prompt,images:[image.toString('base64')]}]}),signal:AbortSignal.timeout(config.inferenceMs)});
    if(!response.ok)throw new Error(`Vision HTTP ${response.status}`);
    const data=await response.json();await writeFile(`${path}.provider.json`,JSON.stringify(data,null,2));
    raw=JSON.parse(data.message.content);
    const scale=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value.point)&&value.point.length===2)value.point=[value.point[0]*profile.width/1000,value.point[1]*profile.height/1000];for(const [key,child]of Object.entries(value))if(key!=='point')scale(child);};scale(raw);
    raw.coordinateSpace='screenshot-pixels; converted from normalized 0..1000 model coordinates';
  await writeFile(`${path}.observation.json`,JSON.stringify(raw,null,2));
  return normalizeObservation(raw,profile);
}
export async function observe(page,config,profile,path){
  const image=await page.screenshot({path});
  if(config.observer==='vision')return observeImage(image,config,profile,path);
  const raw=await visibleDOM(page);
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
      texts.push({text:n.textContent.trim().replace(/[\uFE0E\uFE0F]/g,''),x:r.x,y:r.y,w:r.width,h:r.height});
    }
    const boxes=[...document.body.querySelectorAll('*')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,border:s.borderStyle,shadow:s.boxShadow,back:/gradient|url\(/.test(s.backgroundImage)&&!e.innerText.trim()};}).filter(r=>r.w>=40&&r.w<=180&&r.h>=65&&r.h<=240&&r.w/r.h>.45&&r.w/r.h<.9&&(r.border!=='none'||r.shadow!=='none'));
    return {texts,boxes};
  });
  // A card resting on an identically sized placeholder hides that placeholder.
  const unique=[...surfaces.boxes].sort((a,b)=>a.border.includes('dashed')-b.border.includes('dashed')).filter((b,i,all)=>!all.slice(0,i).some(a=>Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2&&Math.abs(a.w-b.w)<2));
  const groups=new Map();for(const b of unique){const key=Math.round(b.w/4)*4;groups.set(key,[...(groups.get(key)||[]),b]);}
  const rowsOf=list=>{const rows=[];for(const b of list){let row=rows.find(r=>Math.abs(r[0].y-b.y)<5);if(!row)rows.push(row=[]);row.push(b);}return rows;};
  // Foundations, stock and tableau cards may be sized differently; find the topmost five-slot row in any size group.
  const allRows=[...groups.values()].flatMap(rowsOf);
  let foundationRow=allRows.filter(r=>r.length===5).sort((a,b)=>a[0].y-b[0].y)[0],sharedUpper=null;
  // Some layouts place stock, waste and the five foundations in one top row.
  const topRow=[...allRows].filter(r=>r.length===7).sort((a,b)=>a[0].y-b[0].y)[0];
  if(topRow&&(!foundationRow||topRow[0].y<foundationRow[0].y)){const row=[...topRow].sort((a,b)=>a.x-b.x);sharedUpper=row.slice(0,2);foundationRow=row.slice(2);}
  const below=foundationRow?unique.filter(b=>b.y>foundationRow[0].y+foundationRow[0].h-5):[];
  const tableauGroups=new Map();for(const b of below){const key=Math.round(b.w/4)*4;tableauGroups.set(key,[...(tableauGroups.get(key)||[]),b]);}
  const boxes=[...tableauGroups.values()].sort((a,b)=>b.length-a.length)[0]||[];
  const text=surfaces.texts.map(t=>t.text).join(' ');
  const base={boardVisible:false,winClaim:/\b(?:you win|you won|congratulations|victory)\b/i.test(text),score:null,columns:[],foundations:[],stock:{},waste:{},controls:[],warnings:['Visible DOM geometry adapter; unrecognized layouts remain unknown.']};
  const score=text.match(/Score\s*:?\s*(\d+)/i);if(score)base.score=Number(score[1]);
  for(const t of surfaces.texts){if(/^(start|play|play game|new game|play again)$/i.test(t.text))base.controls.push({name:'start',point:[t.x+t.w/2,t.y+t.h/2]});}
  let columnAnchors;
  if(layouts.has(page))({foundationRow,sharedUpper,columnAnchors}=layouts.get(page));
  else if(foundationRow){
    // Columns need not sit under foundations; anchor them on the opening deal's five piles.
    const clusters=[];
    for(const b of [...boxes].sort((a,b)=>a.x-b.x)){const c=clusters.find(c=>Math.abs(c.x-b.x)<b.w/3);if(!c)clusters.push(b);}
    columnAnchors=clusters.length===5?clusters:[...foundationRow].sort((a,b)=>a.x-b.x);
    layouts.set(page,{foundationRow,sharedUpper,columnAnchors});
  }
  if(!foundationRow||!columnAnchors||boxes.length<5)return base;
  foundationRow.sort((a,b)=>a.x-b.x);const fy=foundationRow[0].y,h=foundationRow[0].h,w=foundationRow[0].w;
  const inside=b=>surfaces.texts.filter(t=>t.x+t.w/2>=b.x&&t.x+t.w/2<=b.x+b.w&&t.y+t.h/2>=b.y&&t.y+t.h/2<=b.y+b.h);
  const card=(b,limit=Infinity)=>{const ts=inside(b).filter(t=>t.y+t.h/2<limit),matches=ts.map(t=>({t,id:identify(t.text)})).filter(x=>x.id);const selected=matches.find(x=>x.id.kind==='item')||matches[0];if(selected?.id.kind==='title'&&!/title card|\d+\s*(?:items|(?:item\s+)?cards)|\+\s*items/i.test(ts.map(t=>t.text).join(' '))&&matches.length<2)return null;return selected?{label:selected.id.label,point:[selected.t.x+selected.t.w/2,selected.t.y+selected.t.h/2],confidence:1}:null;};
  base.boardVisible=true;
  base.foundations=foundationRow.map(b=>{const top=card(b),identity=identify(top?.label)||inside(b).map(t=>identify(t.text)).find(Boolean),blank=!inside(b).length&&!b.back,counter=inside({...b,y:b.y-30,h:b.h+30}).map(t=>t.text).join(' ').match(/(\d+)\s*\/\s*(\d+)/);return {point:[b.x+w/2,b.y+h/2],empty:!identity&&(blank||inside(b).some(t=>/^(title|empty|category|foundation|category slot|\d)$/i.test(t.text)))?true:identity?false:null,category:identity?.category,count:counter?Number(counter[1]):null,total:counter?Number(counter[2]):null,top};});
  // Offset depth shadows behind the stock are one pile, not an extra slot.
  const upper=sharedUpper||unique.filter(b=>b.y<fy+h/2&&!foundationRow.some(f=>Math.abs(f.x-b.x)<w/2&&Math.abs(f.y-b.y)<h/2)).sort((a,b)=>a.x-b.x).filter((b,i,all)=>!all.slice(0,i).some(a=>Math.abs(a.x-b.x)<w/4&&Math.abs(a.y-b.y)<h/4));
  const knownCount=(b,name)=>{const own=inside(b).map(t=>t.text),match=own.join(' ').match(new RegExp(`${name}\\s*:?\\s*(\\d+)`,'i'));if(match)return Number(match[1]);if(own.length===1&&/^\d+$/.test(own[0]))return Number(own[0]);const nearby=surfaces.texts.filter(t=>/^\d+$/.test(t.text)&&Math.abs(t.x+t.w/2-(b.x+b.w/2))<b.w&&t.y>=b.y+b.h&&t.y<=b.y+b.h+30);return nearby.length===1?Number(nearby[0].text):null;};
  const emptyBox=b=>inside(b).some(t=>/^(empty|draft|foundation|recycle|♻|↺|⟲|↻|⟳)$/i.test(t.text))||(!inside(b).length&&b.border.includes('dashed'));
  if(upper.length===2){const count=knownCount(upper[0],'(?:stock|deck)');base.stock={point:[upper[0].x+upper[0].w/2,upper[0].y+upper[0].h/2],count,empty:count!==null?count===0:emptyBox(upper[0])?true:upper[0].back||inside(upper[0]).some(t=>/♦|♠|♣|♥/.test(t.text))?false:null};const top=card(upper[1]),empty=!top&&emptyBox(upper[1]);base.waste={top,empty:top?false:empty?true:null,count:empty?0:knownCount(upper[1],'(?:waste|draft)')};}
  base.columns=columnAnchors.map(f=>{
    const pile=boxes.filter(b=>b.y>fy+h-5&&Math.abs(b.x-f.x)<f.w/3).sort((a,b)=>a.y-b.y);
    // Branded backs print only the game name in their exposed strip.
    const backText=(b,limit)=>{const ts=inside(b).filter(t=>t.y>=b.y&&t.y+t.h/2<limit);return ts.length>0&&ts.every(t=>/^(category|solitaire|category solitaire)$/i.test(t.text));};
    let hidden=0,unknown=false;const cards=[];
    for(let i=0;i<pile.length;i++){
      const b=pile[i],limit=pile[i+1]?.y??Infinity,c=card(b,limit);
      if(c)cards.push(c);
      else if(b.back||inside(b).some(t=>t.y+t.h/2<limit&&/^[♦♠♣♥]$/.test(t.text))||backText(b,limit))hidden++;
      else if(!emptyBox(b))unknown=true;
    }
    // Visible item labels in compressed stacks need not occupy full card-sized boxes.
    for(const t of surfaces.texts){const id=identify(t.text);if(id?.kind==='item'&&Math.abs(t.x+t.w/2-(f.x+f.w/2))<f.w/2&&t.y>=fy+h&&!cards.some(c=>c.label===id.label))cards.push({label:id.label,point:[t.x+t.w/2,t.y+t.h/2],confidence:1});}
    cards.sort((a,b)=>a.point[1]-b.point[1]);
    const empty=pile.length===1&&emptyBox(pile[0])&&!cards.length;
    return {point:[f.x+f.w/2,(pile[0]?.y??fy+h*1.2)+f.h/2],empty:empty?true:cards.length||hidden?false:null,hidden:unknown?null:hidden,cards};
  });
  return base;
}
