import { DECK,CATEGORIES,identify,RULE_IDS } from './deck.mjs';

export const OUTCOMES=['VALID_OBSERVED_WIN','WIN_CLAIM_WITH_VIOLATIONS','WIN_CLAIM_UNVERIFIED','INCOMPLETE','NOT_STARTED'];
const num=x=>typeof x==='number'&&Number.isInteger(x)&&x>=0?x:null;
const bool=x=>typeof x==='boolean'?x:null;
export function point(p,viewport){
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[1]<0||p[0]>=viewport.width||p[1]>=viewport.height) return null;
  return p;
}
export function normalizeObservation(raw,viewport){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new Error('Observation must be an object');
  for(const field of ['boardVisible','winClaim']) if(typeof raw[field]!=='boolean') throw new Error(`${field} must be boolean`);
  const warnings=[...(raw.warnings||[])];
  const card=c=>{const identity=identify(c?.label);if(c&&!identity)warnings.push('Unrecognized card identity');return identity?{...identity,point:point(c.point,viewport),confidence:typeof c.confidence==='number'?Math.min(1,Math.max(0,c.confidence)):0}:null;};
  const columns=Array.from({length:5},(_,i)=>({index:i,point:point(raw.columns?.[i]?.point,viewport),hidden:num(raw.columns?.[i]?.hidden),empty:bool(raw.columns?.[i]?.empty),cards:(raw.columns?.[i]?.cards||[]).map(card).filter(Boolean)}));
  const foundations=Array.from({length:5},(_,i)=>{const f=raw.foundations?.[i]||{};return {index:i,point:point(f.point,viewport),category:CATEGORIES.includes(f.category)?f.category:null,empty:bool(f.empty),count:num(f.count),total:num(f.total),top:card(f.top)};});
  return {boardVisible:raw.boardVisible,winClaim:raw.winClaim,score:num(raw.score),stock:{point:point(raw.stock?.point,viewport),empty:bool(raw.stock?.empty),count:num(raw.stock?.count)},waste:{top:card(raw.waste?.top),empty:bool(raw.waste?.empty),count:num(raw.waste?.count)},columns,foundations,controls:(raw.controls||[]).filter(c=>['start','restart','menu','quit','sound','play-again'].includes(c.name)&&point(c.point,viewport)).map(c=>({name:c.name,point:c.point})),warnings};
}
export function sourceCards(o,a){
  if(a.source?.zone==='waste') return o.waste.top?[o.waste.top]:[];
  if(a.source?.zone==='tableau') return (o.columns[a.source.index]?.cards||[]).slice(a.source.offset);
  return [];
}
const labels=cards=>cards.map(c=>c.label);
export function legality(o,a){
  if(a.kind==='draw')return {status:o.stock.empty===false?'LEGAL':'UNKNOWN',ruleId:'R02'};
  if(a.kind==='recycle')return {status:o.stock.empty===true&&o.waste.empty===false?'LEGAL':'UNKNOWN',ruleId:'R03'};
  if(a.kind!=='move')return {status:'UNKNOWN',ruleId:'R17'};
  const cards=sourceCards(o,a),c=cards[0];
  if(!c||cards.some(x=>x.confidence<.9))return {status:'UNKNOWN',ruleId:'R04'};
  const grouped=cards.length>1;
  if(grouped&&cards.some(x=>x.kind!=='item'||x.category!==c.category))return {status:'ILLEGAL',ruleId:'R09'};
  if(a.dest.zone==='foundation'){
    const f=o.foundations[a.dest.index];const ruleId=c.kind==='title'?'R06':'R08';
    if(!f||grouped)return {status:'UNKNOWN',ruleId:'R09'};
    if(c.kind==='title')return {status:f.empty===true?'LEGAL':f.empty===false?'ILLEGAL':'UNKNOWN',ruleId};
    return {status:f.empty===true?'ILLEGAL':f.category===c.category?'LEGAL':f.category?'ILLEGAL':'UNKNOWN',ruleId};
  }
  const t=o.columns[a.dest.index];const ruleId=grouped?'R09':c.kind==='title'?'R05':'R07';
  if(!t||a.source.zone==='tableau'&&a.source.index===a.dest.index)return {status:'UNKNOWN',ruleId};
  const last=t.cards.at(-1);
  if(t.empty===true)return {status:'LEGAL',ruleId};
  if(!last||last.confidence<.9)return {status:'UNKNOWN',ruleId};
  return {status:last.kind==='item'&&last.category===c.category?'LEGAL':'ILLEGAL',ruleId};
}
export function candidates(o){
  const sources=[];
  if(o.waste.top?.point)sources.push({zone:'waste'});
  for(const c of o.columns)for(let offset=0;offset<c.cards.length;offset++)if(c.cards[offset].point)sources.push({zone:'tableau',index:c.index,offset});
  const out=[];
  for(const source of sources)for(const zone of ['foundation','tableau'])for(let index=0;index<5;index++){
    const target=zone==='foundation'?o.foundations[index]:o.columns[index];
    if(!target.point)continue;
    const a={kind:'move',source,dest:{zone,index}};const verdict=legality(o,a);
    out.push({...a,...verdict});
  }
  if(o.stock.point&&o.stock.empty===false)out.push({kind:'draw',status:'LEGAL',ruleId:'R02'});
  if(o.stock.point&&o.stock.empty===true&&o.waste.empty===false)out.push({kind:'recycle',status:'LEGAL',ruleId:'R03'});
  return out;
}
export function stateKey(o){return JSON.stringify([o.score,o.stock.empty,o.waste.top?.label,o.columns.map(c=>[c.hidden,c.empty,labels(c.cards)]),o.foundations.map(f=>[f.empty,f.category,f.count,f.top?.label])]);}
export function actionKey(a){return JSON.stringify([a.kind,a.source,a.dest]);}
export function chooseAction(o,tried=new Set(),negative=false){
  const options=candidates(o).filter(a=>a.status===(negative?'ILLEGAL':'LEGAL')&&!tried.has(actionKey(a))).filter(a=>negative||!(a.kind==='move'&&a.source.zone==='tableau'&&a.dest.zone==='tableau'&&o.columns[a.dest.index].empty===true&&a.source.offset===0&&o.columns[a.source.index].hidden===0));
  const priority=a=>a.kind==='recycle'?0:a.kind==='draw'?1:a.dest.zone==='foundation'?100:sourceCards(o,a).length>1?25:sourceCards(o,a)[0].kind==='item'?30:15;
  options.sort((a,b)=>priority(b)-priority(a));return options[0]||null;
}
export class Ledger{
  constructor(){this.deposits={};this.completed=new Set();this.findings=[];this.coverage=Object.fromEntries(RULE_IDS.map(id=>[id,{pass:0,fail:0,unknown:0}]));this.gaps=0;this.started=false;this.drawHistory=[];this.recycleExpected=null;}
  observeInitial(o){this.started=o.boardVisible&&o.score===0&&o.foundations.every(f=>f.empty===true);if(!this.started)this.gaps++;if(o.warnings.includes('Unrecognized card identity'))this.gaps++;this.audit(o);
    const known=o.columns.every(c=>c.hidden!==null)&&o.stock.count!==null&&o.waste.empty!==null;
    if(known){if(o.columns.some((c,i)=>c.hidden!==i+3||c.cards.length!==1)||o.stock.count!==56||!o.waste.empty||!o.foundations.every(f=>f.empty===true)||o.score!==0)this.finding('R01','incorrect_deal','Opening layout/counts differ from 4/5/6/7/8 tableau, 56 stock, empty waste/foundations and zero score',true);else this.coverage.R01.pass++;}else this.coverage.R01.unknown++;
  }
  audit(o){
    if(!o.boardVisible)return;
    const cards=[...o.columns.flatMap(c=>c.cards),...(o.waste.top?[o.waste.top]:[]),...o.foundations.flatMap(f=>f.top?[f.top]:[])].filter(c=>c.confidence>=.9);
    const seen=new Set();for(const c of cards){if(seen.has(c.label))this.finding('R22','duplicate_visible_card',`Unique card visible twice: ${c.label}`,true);seen.add(c.label);}
    for(const f of o.foundations){if(f.category&&f.total!==null&&f.total!==DECK[f.category].length)this.finding('R13','incorrect_total',`${f.category} progress denominator ${f.total}`,true);if(f.category&&f.count!==null&&f.count>DECK[f.category].length)this.finding('R13','incorrect_progress',`${f.category} progress exceeds category size`,true);}
    if(o.stock.count!==null&&o.waste.count!==null&&o.columns.every(c=>c.hidden!==null)&&o.foundations.every(f=>f.empty===true||f.category&&f.count!==null)){
      const total=o.stock.count+o.waste.count+o.columns.reduce((n,c)=>n+c.hidden+c.cards.length,0)+o.foundations.reduce((n,f)=>n+(f.empty?0:1+f.count),0)+[...this.completed].reduce((n,c)=>n+1+DECK[c].length,0);
      if(total!==86)this.finding('R22','card_conservation',`Observable live plus independently completed inventory is ${total}; expected 86`,true);else this.coverage.R22.pass++;
    }else this.coverage.R22.unknown++;
  }
  finding(ruleId,type,message,confirmed=false){const f={ruleId,type,message,status:confirmed?'confirmed':'suspected'};this.findings.push(f);if(confirmed)this.coverage[ruleId].fail++;return f;}
  verify(before,a,after,delivery={}){
    const findingStart=this.findings.length;
    if(after.warnings.includes('Unrecognized card identity'))this.gaps++;
    const v=legality(before,a),result={...v,effect:'UNKNOWN',findings:[]};
    const report=(id,type,msg,confirmed=true)=>result.findings.push(this.finding(id,type,msg,confirmed));
    if(a.kind==='draw'){
      if(after.waste.top&&after.waste.top.label!==before.waste.top?.label){
        result.effect='ACCEPTED';this.coverage.R02.pass++;
        if(before.stock.count!==null&&after.stock.count!==null&&before.stock.count-after.stock.count!==1)report('R02','incorrect_draw_count',`Stock changed by ${before.stock.count-after.stock.count}, expected one`);
        if(before.waste.count!==null&&after.waste.count!==null&&after.waste.count-before.waste.count!==1)report('R02','incorrect_draw_count',`Waste changed by ${after.waste.count-before.waste.count}, expected one`);
        if(this.recycleExpected){const expected=this.recycleExpected.shift();if(expected&&expected!==after.waste.top.label)report('R03','incorrect_transition',`Expected recycled ${expected}, observed ${after.waste.top.label}`);if(!this.recycleExpected.length)this.recycleExpected=null;}
        this.drawHistory.push(after.waste.top.label);
      }
    }else if(a.kind==='recycle'){
      if(after.waste.empty===true&&after.stock.empty===false){result.effect='ACCEPTED';this.recycleExpected=[...this.drawHistory];this.drawHistory=[];this.coverage.R03.pass++;}
    }else if(a.kind==='move'){
      const moved=sourceCards(before,a),first=moved[0],srcAfter=a.source.zone==='waste'?(after.waste.top?[after.waste.top]:[]):after.columns[a.source.index].cards;
      const removed=moved.length>0&&moved.every(c=>!srcAfter.some(x=>x.label===c.label));
      const target=a.dest.zone==='foundation'?after.foundations[a.dest.index]:after.columns[a.dest.index];
      let accepted=false,completed=false;
      if(first&&a.dest.zone==='tableau')accepted=removed&&labels(target.cards).slice(-moved.length).join('|')===labels(moved).join('|');
      if(first&&a.dest.zone==='foundation'){
        const old=before.foundations[a.dest.index];
        completed=removed&&old.category===first.category&&old.count===DECK[first.category].length-1&&target.empty===true;
        accepted=removed&&(completed||target.top?.label===first.label||(first.kind==='title'&&target.category===first.category&&target.empty===false)||(first.kind==='item'&&old.count!==null&&target.category===old.category&&target.count===old.count+1));
      }
      if(accepted){
        if(a.source.zone==='tableau'){const old=before.columns[a.source.index],next=after.columns[a.source.index];if(old.cards.length===moved.length&&old.hidden>0&&next.hidden!==null){if(next.hidden!==old.hidden-1||next.cards.length!==1)report('R10','missing_or_incorrect_reveal','Removing all face-up cards must reveal exactly one hidden card');else this.coverage.R10.pass++;}
        const retained=old.cards.slice(0,a.source.offset);if(retained.some((c,i)=>next.cards[i]?.label!==c.label))report('R11','face_up_card_lost','Previously face-up source cards disappeared or changed order');}
        if(!completed&&before.score!==null&&after.score!==null&&after.score!==before.score)report('R15','incorrect_score',`Score changed by ${after.score-before.score} without category completion`);
        result.effect='ACCEPTED';
        if(v.status==='ILLEGAL')report(v.ruleId,'illegal_action_accepted',`${first.label} accepted at ${a.dest.zone} ${a.dest.index+1}`);
        else if(v.status==='LEGAL'){
          this.coverage[v.ruleId].pass++;
          if(a.source.zone==='waste')this.drawHistory=this.drawHistory.filter(x=>x!==first.label);
          if(a.dest.zone==='foundation'){
            const category=first.category;
            if(first.kind==='title')this.deposits[category]=new Set();
            else if(this.deposits[category]){
              if(this.deposits[category].has(first.label))report('R14','duplicate_completion',`Repeated deposit ${first.label}`);
              this.deposits[category].add(first.label);
            }else this.gaps++;
            if(completed){
              const complete=DECK[category].every(x=>this.deposits[category]?.has(x));
              if(complete&&!this.completed.has(category)){this.completed.add(category);this.coverage.R14.pass++;}else this.gaps++;
              if(before.score!==null&&after.score!==null&&after.score-before.score!==100)report('R15','incorrect_score',`Completion score delta ${after.score-before.score}, expected 100`);
              else if(after.score!==null)this.coverage.R15.pass++;
            }
          }
        }else this.gaps++;
      }else if(stateKey(before)===stateKey(after)){
        result.effect='UNCHANGED';
        if(v.status==='LEGAL')report(v.ruleId,'legal_action_blocked',`No visible effect for ${first?.label||a.kind}; ${delivery.confirmed?'selection/pickup observed':'delivery not established'}`,false);
        else if(v.status==='ILLEGAL'&&delivery.confirmed)this.coverage.R12.pass++;
        else this.coverage[v.ruleId].unknown++;
      }else {this.coverage[v.ruleId].unknown++;this.gaps++;}
    }
    if(result.effect==='UNKNOWN'){this.coverage[v.ruleId].unknown++;this.gaps++;}
    this.audit(after);
    const empty=after.stock.empty===true&&after.waste.empty===true&&after.columns.every(c=>c.empty===true)&&after.foundations.every(f=>f.empty===true);
    if(this.completed.size===13&&empty&&!after.winClaim)report('R16','missing_win_display','Complete independent ledger and empty board without a visible victory claim');
    if(after.winClaim&&after.score!==null&&after.score!==CATEGORIES.length*100)report('R16','premature_win',`Win claim with score ${after.score}, expected ${CATEGORIES.length*100}`);
    result.findings=this.findings.slice(findingStart);return result;
  }
  outcome(o){
    if(!o?.boardVisible&&!o?.winClaim)return this.started?'INCOMPLETE':'NOT_STARTED';
    if(!o.winClaim)return 'INCOMPLETE';
    if(this.findings.some(x=>x.status==='confirmed'))return 'WIN_CLAIM_WITH_VIOLATIONS';
    const empty=o.stock.empty===true&&o.waste.empty===true&&o.columns.every(c=>c.empty===true)&&o.foundations.every(f=>f.empty===true);
    if(this.started&&!this.gaps&&this.completed.size===CATEGORIES.length&&empty&&o.score===CATEGORIES.length*100)return 'VALID_OBSERVED_WIN';
    return 'WIN_CLAIM_UNVERIFIED';
  }
  json(){return {started:this.started,gaps:this.gaps,completed:[...this.completed],deposits:Object.fromEntries(Object.entries(this.deposits).map(([k,v])=>[k,[...v]])),findings:this.findings,coverage:this.coverage};}
}
