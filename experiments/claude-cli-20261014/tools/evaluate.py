import pathlib,subprocess,json,sys,os,time,datetime,re
root=pathlib.Path('/home/joezen777/categorysolitaire-experiments-20261014');b=sys.argv[1];clone=root/b;out=root/'evidence'/b
env=dict(os.environ);env['CI']='true';env['PATH']='/home/joezen777/.nvm/versions/node/v24.18.0/bin:/usr/local/bin:/usr/bin:/bin'
state=json.loads((out/'state.json').read_text());assert 'firstPassSha' in state,'Freeze run first'
def git(*args):return subprocess.check_output(['git',*args],cwd=clone,text=True).strip()
checks={}
pkg=json.loads((clone/'package.json').read_text()) if (clone/'package.json').exists() else {}
for name,cmd in [('test',['npm','test']),('build',['npm','run','build'])]:
 if name not in pkg.get('scripts',{}):checks[name]={'status':'unavailable','reason':'No script'};continue
 start=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=clone,env=env,capture_output=True,text=True,timeout=120)
  (out/(name+'.log')).write_text(p.stdout+p.stderr)
  checks[name]={'status':'passed' if p.returncode==0 else 'failed','exitCode':p.returncode,'seconds':time.monotonic()-start}
 except subprocess.TimeoutExpired:checks[name]={'status':'timeout'}
expected=[];category=None
for line in (clone/'prompts/original.md').read_text().splitlines():
 item=re.match(r'^\s*-\s+-\s+(.+)$',line)
 title=re.match(r'^\s*-\s+([^-].*)$',line)
 if item and category:expected.append((category,item[1].strip()))
 elif title:category=title[1].strip()
deckCheck={'status':'unavailable','reason':'No flat JSON deck found'}
for name in git('ls-files','*.json').splitlines():
 try:data=json.loads((clone/name).read_text())
 except (json.JSONDecodeError,OSError):continue
 if isinstance(data,list) and data and all(isinstance(x,dict) and {'id','categoryTitle','itemName'} <= x.keys() for x in data):
  items=[(x['categoryTitle'],x['itemName']) for x in data if x['itemName'] is not None and x['itemName']!='']
  deckCheck={'status':'passed' if sorted(items)==sorted(expected) and len({x['id'] for x in data})==len(data) else 'failed','file':name,'items':len(items),'categories':len(set(c for c,n in items)),'expectedItems':len(expected),'uniqueIds':len({x['id'] for x in data})==len(data)};break
checks['independentDeck']=deckCheck
metrics={k:None for k in ['sloc','fileCount','avgFileSize','bundleSize','maintainability','maxComplexity','duplication','securityIssues','tsErrors','unusedExports','commits','churn','coverage','lighthouseA11y','depCount','bundleWeight']}
files=git('ls-files').splitlines();source=[f for f in files if pathlib.Path(f).suffix in ['.js','.jsx','.ts','.tsx','.css'] and not re.search(r'(^|/)(tests?|scripts)/|\.(test|spec)\.|config\.',f)]
metrics['fileCount']=len(source)
if checks.get('build',{}).get('status')=='passed':
 dist=[p for p in (clone/'dist').rglob('*') if p.is_file() and p.suffix!='.map'];metrics['bundleSize']=sum(p.stat().st_size for p in dist)/1024;metrics['bundleWeight']=sum(p.stat().st_size for p in dist if p.suffix=='.js')/1024
try:
 audit=subprocess.run(['npm','audit','--json'],cwd=clone,env=env,capture_output=True,text=True,timeout=30)
 data=json.loads(audit.stdout);(out/'audit.json').write_text(json.dumps(data,indent=2))
 metrics['securityIssues']=data.get('metadata',{}).get('vulnerabilities',{}).get('total')
except (subprocess.TimeoutExpired,json.JSONDecodeError):pass
try:
 dup=subprocess.run(['/home/joezen777/categorysolitaire/node_modules/.bin/jscpd','--min-lines','5','--min-tokens','50','--reporters','json','--output',str(out/'jscpd'),*source],cwd=clone,env=env,capture_output=True,text=True,timeout=30)
 data=json.loads((out/'jscpd/jscpd-report.json').read_text());metrics['duplication']=data['statistics']['total']['percentage']
except (subprocess.TimeoutExpired,FileNotFoundError,KeyError,json.JSONDecodeError):pass
try:
 compiler=clone/'node_modules/.bin/tsc'
 if compiler.exists():
  conf=subprocess.run([str(compiler),'--showConfig'],cwd=clone,env=env,capture_output=True,text=True,timeout=10)
  if conf.returncode==0 and json.loads(conf.stdout).get('compilerOptions',{}).get('strict'):
   typed=subprocess.run([str(compiler),'--noEmit','--pretty','false'],cwd=clone,env=env,capture_output=True,text=True,timeout=20)
   (out/'typescript.log').write_text(typed.stdout+typed.stderr)
   if typed.returncode==0:metrics['tsErrors']=0
   elif re.search(r'error TS\d+',typed.stdout):metrics['tsErrors']=len(re.findall(r'error TS\d+',typed.stdout))
except (subprocess.TimeoutExpired,json.JSONDecodeError):pass
metrics['depCount']=len(set(pkg.get('dependencies',{}))|set(pkg.get('devDependencies',{}))) if pkg else None
commits=[];estimated=0;churn=0
for line in git('log','--reverse','--format=%H%x09%cI%x09%s',state['preparedSha']+'..'+state['firstPassSha']).splitlines():
 sha,date,subject=line.split('\t',2)
 if '[kind:event]' in subject:continue
 nums=git('show','--numstat','--format=',sha)
 if not nums:continue
 estimate=re.search(r'\[tokens-est:(\d+)\]',subject)
 if estimate:estimated+=int(estimate[1])
 for n in nums.splitlines():
  a,d,_=n.split('\t',2)
  if a.isdigit() and d.isdigit():churn+=int(a)+int(d)
 commits.append(dict(sha=sha,date=date,subject=subject))
metrics.update(commits=len(commits),churn=churn)
usage=[]
for step in state['steps']:
 messages=[json.loads(line) for line in (out/(step['step']+'.jsonl')).read_text().splitlines() if line.strip()]
 init=messages[0]; seen=set()
 for index,result in enumerate(m for m in messages if m.get('type')=='result'):
  key=result.get('uuid',str(index))
  if key in seen:continue
  seen.add(key)
  usage.append(dict(step=step['step'],resultIndex=index,resultUuid=key,initialization={k:init.get(k) for k in ['model','claude_code_version','permissionMode','mcp_servers','skills','plugins']},usage=result.get('usage'),modelUsage=result.get('modelUsage'),costUSD=result.get('total_cost_usd'),report=result.get('result'),permissionDenials=result.get('permission_denials'),subagentStats=result.get('subagent_stats')))

report=dict(branch=b,resultSha=state['firstPassSha'],checks=checks,metrics=metrics,metricReasons={k:'Not collected by a validated independent analyzer; N/A, not zero.' for k,v in metrics.items() if v is None},sourceScope=source,commits=commits,estimatedCommitTokens=estimated,usage=usage,gameplayStatus='Not yet independently evaluated',evaluatedUtc=datetime.datetime.now(datetime.timezone.utc).isoformat())
(out/'evaluation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'branch':b,'checks':checks,'metrics':metrics},indent=2))
