import {describe,it,expect} from 'vitest';
import {DECK,CATEGORIES} from '../scripts/qa/deck.mjs';
import {Ledger,normalizeObservation,legality,chooseAction} from '../scripts/qa/oracle.mjs';
const c=label=>({label,confidence:1,point:[100,100]});
const b=(extra={})=>normalizeObservation({boardVisible:true,winClaim:false,score:0,stock:{empty:false,count:56},waste:{empty:true,count:0},foundations:Array.from({length:5},()=>({empty:true})),columns:['King','Chimera','Vase','Io','Imagine'].map((label,i)=>({empty:false,hidden:i+3,cards:[c(label)]})),...extra},{width:1440,height:900});
const action={kind:'move',source:{zone:'waste'},dest:{zone:'foundation',index:0}};
describe('rule calibration matrices',()=>{
 for(const category of CATEGORIES)it(`${category}: item/title destination matrix`,()=>{
  for(const other of CATEGORIES){
   for(const label of [category,DECK[category][0]]){
    const o=b({waste:{top:c(label),empty:false},foundations:[{empty:false,category:other}],columns:[{empty:false,cards:[c(DECK[other][0])]}]});
    expect(legality(o,action).status).toBe(label===category?'ILLEGAL':category===other?'LEGAL':'ILLEGAL');
    expect(legality(o,{...action,dest:{zone:'tableau',index:0}}).status).toBe(category===other?'LEGAL':'ILLEGAL');
    o.columns[0].cards=[{...c(other),kind:'title',category:other}];expect(legality(o,{...action,dest:{zone:'tableau',index:0}}).status).toBe('ILLEGAL');
   }
  }
 });
 it('recognizes exact opening and complete observable inventory',()=>{const l=new Ledger();l.observeInitial(b());expect(l.findings).toEqual([]);expect(l.coverage.R01.pass).toBe(1);expect(l.coverage.R22.pass).toBe(1);});
 it('detects opening count and inventory loss mutations',()=>{const l=new Ledger(),o=b();o.stock.count=55;l.observeInitial(o);expect(l.findings.map(f=>f.ruleId)).toEqual(expect.arrayContaining(['R01','R22']));});
 it('detects duplicated visible identities',()=>{const l=new Ledger(),o=b();o.columns[1].cards=o.columns[0].cards;l.audit(o);expect(l.findings.some(f=>f.type==='duplicate_visible_card')).toBe(true);});
 it('keeps unknown inventory unproved',()=>{const l=new Ledger(),o=b();o.stock.count=null;l.audit(o);expect(l.findings).toEqual([]);expect(l.coverage.R22.unknown).toBe(1);});
 it('detects missing automatic reveal',()=>{const l=new Ledger(),before=b(),after=b();after.columns[0].cards=[];after.foundations[0]={...after.foundations[0],empty:false,category:'King',count:0,total:3,top:{...c('King'),kind:'title',category:'King'}};l.observeInitial(before);l.verify(before,{...action,source:{zone:'tableau',index:0,offset:0}},after);expect(l.findings.some(f=>f.ruleId==='R10')).toBe(true);});
 it('detects two-card stock activation',()=>{const l=new Ledger(),before=b(),after=b({stock:{count:54,empty:false},waste:{count:2,empty:false,top:c('Scent')}});l.observeInitial(before);l.verify(before,{kind:'draw'},after);expect(l.findings.filter(f=>f.type==='incorrect_draw_count')).toHaveLength(2);});
 it('detects incorrect foundation denominator and overflow',()=>{const l=new Ledger(),o=b();o.stock.count=null;o.foundations[0]={empty:false,category:'King',count:4,total:4};l.audit(o);expect(l.findings.filter(f=>f.ruleId==='R13')).toHaveLength(2);});
 it('requires two independent selection receipts for a confirmed legal block',()=>{const l=new Ledger(),o=b({waste:{top:c('King'),empty:false,count:null},stock:{count:null,empty:false}});l.verify(o,action,o,{confirmed:true});expect(l.findings.some(f=>f.type==='legal_action_blocked'&&f.status==='confirmed')).toBe(false);l.verify(o,action,o,{confirmed:true});expect(l.findings.some(f=>f.type==='legal_action_blocked'&&f.status==='confirmed')).toBe(true);});
 it('never confirms legal blockage from repeated missed deliveries',()=>{const l=new Ledger(),o=b({waste:{top:c('King'),empty:false,count:null},stock:{count:null,empty:false}});for(let i=0;i<4;i++)l.verify(o,action,o,{confirmed:false});expect(l.findings.some(f=>f.type==='legal_action_blocked'&&f.status==='confirmed')).toBe(false);});
 it('rejects mixed-category and title-containing groups',()=>{for(const labels of [['Orb','Goat'],['King','Orb']]){const o=b();o.columns[0].cards=normalizeObservation({boardVisible:true,winClaim:false,columns:[{cards:labels.map(c)}]},{width:1440,height:900}).columns[0].cards;expect(legality(o,{...action,source:{zone:'tableau',index:0,offset:0},dest:{zone:'tableau',index:1}}).status).toBe('ILLEGAL');}});
 it('detects premature victory even on the first observation',()=>{const l=new Ledger(),o=b({winClaim:true});l.observeInitial(o);expect(l.outcome(o)).toBe('WIN_CLAIM_WITH_VIOLATIONS');});
 it('does not certify a forged score-1300 banner',()=>{const l=new Ledger(),o=b({winClaim:true,score:1300,stock:{empty:true,count:null},columns:Array.from({length:5},()=>({empty:true,hidden:null,cards:[]}))});l.observeInitial(o);expect(l.outcome(o)).not.toBe('VALID_OBSERVED_WIN');});
});

describe('perception and policy guardrails',()=>{
 it('nonfinite confidence can never authorize a move',()=>{const o=b({waste:{top:{...c('King'),confidence:NaN}}});expect(legality(o,action).status).toBe('UNKNOWN');});
 it('does not invent a title for an illegally populated foundation',()=>{const l=new Ledger(),o=b({stock:{count:55,empty:false},foundations:[{empty:false,category:'King',count:1,top:c('Orb')}]});l.audit(o);expect(l.findings.some(f=>f.type==='card_conservation')).toBe(false);expect(l.coverage.R22.unknown).toBe(1);});
});

it('draws instead of endlessly rearranging fully exposed groups',()=>{const o=b({stock:{empty:false,point:[20,20]},columns:[{empty:false,hidden:0,cards:[c('Orb'),c('Throne')],point:[50,100]},{empty:false,hidden:0,cards:[c('Scepter')],point:[150,100]},{empty:true,hidden:0,cards:[],point:[250,100]},{empty:true,hidden:0,cards:[],point:[350,100]},{empty:true,hidden:0,cards:[],point:[450,100]}]});expect(chooseAction(o).kind).toBe('draw');});
