import {buildSync} from '/home/joezen777/categorysolitaire/node_modules/esbuild/lib/main.js';
import {writeFileSync} from 'node:fs';
const root='/home/joezen777/categorysolitaire-experiments-20261014',b=process.argv[2],out=`${root}/evidence/${b}`;
const paths={'claude.cli.sonnet-5-5.vibe':'src/game.js','claude.cli.sonnet-5-5.steering':'src/game/state.js','claude.cli.opus-5-5.steering':'src/game/engine.ts','claude.cli.opus-5-5.vibe':'src/game/engine.js','claude.cli.opus-5-5.spec':'src/game/rules.js','claude.cli.sonnet-5-5.spec':'src/game/moves.js'};
buildSync({entryPoints:[`${root}/${b}/${paths[b]}`],bundle:true,platform:'node',format:'esm',outfile:`${out}/rules.bundle.mjs`});const api=await import(`${out}/rules.bundle.mjs`);
function trial(kind){
 const mixed=kind==='mixed',single=kind==='single',foundation=kind==='group-foundation'||single;
 if(b==='claude.cli.opus-5-5.vibe'){
  const t={id:'t',type:'title',category:'X',label:'X',total:3},item=id=>({id,type:'item',category:'X',label:id,total:3}),up=card=>({card,faceUp:true});
  const cards=single?[item('x1')]:mixed?[item('x1'),t]:[item('x1'),item('x2')];
  const state={stock:[],waste:[],tableau:[cards.map(up),[],[],[],[]],foundation:[mixed?null:{title:t,items:[],completing:false},null,null,null,null],score:0,completedCategories:0,categoryCount:1,moves:0};
  const from={zone:'tableau',col:0,index:0},to=foundation?{zone:'foundation',slot:0}:{zone:'tableau',col:1};return {actualAllowed:api.canMove(state,from,to),stateChanged:api.applyMove(state,from,to)!==state};
 }
 if(b==='claude.cli.opus-5-5.steering'){
  const t={id:'t',role:'title',category:'X',label:'X'},item=id=>({id,role:'item',category:'X',label:id}),byId={t,x1:item('x1'),x2:item('x2')},up=id=>({id,faceUp:true});
  const cards=single?['x1']:mixed?['x1','t']:['x1','x2'];const empty=()=>({category:null,cardIds:[]});
  const state={deck:{cards:Object.values(byId),byId,categories:{X:{itemCount:3}},categoryCount:1},stock:[],waste:[],tableau:[cards.map(up),[],[],[],[]],foundations:[mixed?empty():{category:'X',cardIds:['t']},empty(),empty(),empty(),empty()],score:0,completedCategories:[]};
  const result=api.applyMove(state,{kind:'tableau',column:0,cardId:'x1'},foundation?{kind:'foundation',slot:0}:{kind:'tableau',column:1});return {actualAllowed:result.ok,stateChanged:result.ok&&result.state!==state};
 }
 if(b==='claude.cli.sonnet-5-5.steering'){
  const t={id:'t',role:'title',category:'X',label:'X'},item=id=>({id,role:'item',category:'X',label:id}),cards={t,x1:item('x1'),x2:item('x2')},up=id=>({id,faceUp:true});
  const ids=single?['x1']:mixed?['x1','t']:['x1','x2'];const state={deck:{cards,categories:{X:{name:'X',total:3}}},phase:'playing',score:0,stock:[],waste:[],tableau:[ids.map(up),[],[],[],[]],foundations:[mixed?null:{pile:['t'],clearing:false},null,null,null,null]};
  const result=api.move(state,{zone:'tableau',col:0,index:0},foundation?{zone:'foundation',slot:0}:{zone:'tableau',col:1});return {actualAllowed:result.ok,stateChanged:result.state!==state};
 }
 if(b==='claude.cli.sonnet-5-5.vibe'){
  const t={id:'t',categoryTitle:'X',itemName:null,total:3},item=id=>({id,categoryTitle:'X',itemName:id,total:3}),up=card=>({card,up:true});
  const cards=single?[item('x1')]:mixed?[item('x1'),t]:[item('x1'),item('x2')];const state={stock:[],waste:[],tableau:[cards.map(up),[],[],[],[]],foundation:[mixed?null:{category:'X',total:3,count:0,complete:false},null,null,null,null],score:0,won:false};
  const from={type:'tab',col:0,idx:0},to=foundation?{type:'found',slot:0}:{type:'tab',col:1};const result=api.applyMove(state,from,to);return {actualAllowed:api.canMove(state,from,to),stateChanged:!!result&&result.state!==state};
 }
 if(b==='claude.cli.sonnet-5-5.spec'){
  const t={id:'t',type:'title',categoryTitle:'X',itemCount:3},item=id=>({id,type:'item',categoryTitle:'X',itemName:id});const cards=single?[item('x1')]:mixed?[item('x1'),t]:[item('x1'),item('x2')];
  const state={source:[],draft:[],tableau:[cards,[],[],[],[]],faceUpCounts:[cards.length,0,0,0,0],foundations:[mixed?[]:[t],[],[],[],[]],cleared:[],score:0};
  const result=api.moveCards(state,{type:'tableau',col:0,index:0},foundation?{type:'foundation',slot:0}:{type:'tableau',col:1});return {actualAllowed:result.ok,stateChanged:result.game!==state};
 }
 const t={id:'t',kind:'title',categoryTitle:'X',itemName:null,itemCount:3},item=id=>({id,kind:'item',categoryTitle:'X',itemName:id}),byId={t,x1:item('x1'),x2:item('x2')},up=id=>({id,faceUp:true});
 const cards=single?['x1']:mixed?['x1','t']:['x1','x2'];const state={source:[],draft:[],tableau:[cards.map(up),[],[],[],[]],foundations:[mixed?null:{categoryTitle:'X',cards:[up('t')]},null,null,null,null],score:0};
 const result=api.moveCards(state,byId,{type:'tableau',col:0,index:0},foundation?{type:'foundation',slot:0}:{type:'tableau',col:1});return {actualAllowed:result.ok,stateChanged:result.state!==state};
}
const cases=[['R01','item group to foundation must be rejected','group-foundation',false],['R02','group containing a title must be rejected','mixed',false],['P01','matching item group to empty column is allowed','group-column',true],['P02','single matching item to foundation is allowed','single',true]];
const report=cases.map(([id,name,kind,expectedAllowed])=>{const actual=trial(kind);return {id,name,expectedAllowed,...actual,status:actual.actualAllowed===expectedAllowed&&actual.stateChanged===expectedAllowed?'passed':'failed'};});
writeFileSync(`${out}/independent-rules.json`,JSON.stringify(report,null,2));console.log(b,report);
