import {describe,it,expect} from 'vitest';
import {normalizeObservation,legality,Ledger,chooseAction,OUTCOMES} from '../scripts/qa/oracle.mjs';
import {DECK,CATEGORIES,TOTAL_CARDS} from '../scripts/qa/deck.mjs';
import {parseArgs,profiles} from '../scripts/qa-evaluate.mjs';
const vp={width:1440,height:900};
const card=label=>({label,point:[30,40],confidence:1});
function board(extra={}){return normalizeObservation({boardVisible:true,winClaim:false,score:0,stock:{empty:false,point:[10,20]},waste:{empty:true},columns:Array.from({length:5},()=>({empty:true,cards:[],point:[100,200]})),foundations:Array.from({length:5},()=>({empty:true,point:[100,100]})),...extra},vp);}
const move={kind:'move',source:{zone:'waste'},dest:{zone:'foundation',index:0}};
describe('independent observation and outcomes',()=>{
 it('freezes the exact 86 card deck',()=>expect(TOTAL_CARDS).toBe(86));
 it('rejects truthy false strings and keeps unknown counters unknown',()=>{expect(()=>board({winClaim:'false'})).toThrow();expect(board().stock.count).toBeNull();});
 it('never treats score or a planner claim as a validated win',()=>{const l=new Ledger();l.observeInitial(board());expect(l.outcome(board({score:1300}))).toBe('INCOMPLETE');expect(l.outcome(board({score:1300,winClaim:true}))).toBe('WIN_CLAIM_UNVERIFIED');});
 it('identifies premature win claims',()=>{const l=new Ledger(),b=board();l.verify(b,{kind:'draw'},board({winClaim:true,score:10}));expect(l.outcome(board({winClaim:true}))).toBe('WIN_CLAIM_WITH_VIOLATIONS');});
 it('retains unknown identities as evidence gaps',()=>expect(board({waste:{top:card('made up')}}).warnings).toContain('Unrecognized card identity'));
 it('does not call missed gestures confirmed legal blocks',()=>{const b=board({waste:{top:card('King'),empty:false}}),l=new Ledger();l.verify(b,move,b,{confirmed:true});expect(l.findings[0].status).toBe('suspected');});
 it('detects illegal item accepted in empty foundation',()=>{const b=board({waste:{top:card('Orb'),empty:false}}),a=board({foundations:[{empty:false,category:'King',top:card('Orb')}]});const l=new Ledger();expect(legality(b,move).status).toBe('ILLEGAL');l.verify(b,move,a);expect(l.findings.some(f=>f.type==='illegal_action_accepted'&&f.status==='confirmed')).toBe(true);});
 it('detects score inflation on a title move',()=>{const b=board({waste:{top:card('King'),empty:false}}),a=board({score:10,foundations:[{empty:false,category:'King',top:card('King')}]});const l=new Ledger();l.verify(b,move,a);expect(l.findings.some(f=>f.ruleId==='R15')).toBe(true);});
 it('requires full independent deposits for a validated win',()=>{
   const l=new Ledger();l.observeInitial(board());let score=0;
   for(const category of CATEGORIES){
     let b=board({score,waste:{top:card(category),empty:false}});
     let a=board({score,foundations:[{empty:false,category,count:0,top:card(category)}]});l.verify(b,move,a);
     for(let i=0;i<DECK[category].length;i++){
       b=board({score,waste:{top:card(DECK[category][i]),empty:false},foundations:[{empty:false,category,count:i,top:card(category)}]});
       const last=i===DECK[category].length-1;if(last)score+=100;
       a=board({score,foundations:last?undefined:[{empty:false,category,count:i+1,top:card(DECK[category][i])}]});
       // Explicit complete fixture, independent of any application implementation.
       if(last)a=board({score,winClaim:score===1300});l.verify(b,move,a);
     }
   }
   expect(l.completed.size).toBe(13);expect(l.gaps).toBe(0);
   expect(l.outcome(board({score:1300,winClaim:true,stock:{empty:true},waste:{empty:true}}))).toBe('VALID_OBSERVED_WIN');
 });
 it('excludes uncertain group-to-foundation actions',()=>{const b=board();b.columns[0].cards=[{...card('Orb'),kind:'item',category:'King'},{...card('Throne'),kind:'item',category:'King'}];expect(legality(b,{...move,source:{zone:'tableau',index:0,offset:0}}).status).toBe('UNKNOWN');});
 it('normal policy never selects known illegal actions',()=>expect(chooseAction(board({waste:{top:card('Orb')}})).status).toBe('LEGAL'));
 it('preschedules ten balanced modalities and validates budgets',()=>{expect(profiles).toHaveLength(10);expect(profiles.filter(p=>p.mobile)).toHaveLength(5);expect(profiles.filter(p=>p.input==='drag')).toHaveLength(5);expect(()=>parseArgs(['--url','https://example.com','--games','0'])).toThrow();expect(OUTCOMES).toHaveLength(5);});
});
