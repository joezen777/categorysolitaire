import pathlib,subprocess,json,sys,os,re,time,datetime,uuid
root=pathlib.Path('/home/joezen777/categorysolitaire-experiments-20261014')
b,step=sys.argv[1:3]; clone=root/b; evidence=root/'evidence'/b; evidence.mkdir(parents=True,exist_ok=True)
statefile=evidence/'state.json'; state=json.loads(statefile.read_text()) if statefile.exists() else {'sessionId':str(uuid.uuid4()),'activeSeconds':0,'steps':[]}
if step in [s['step'] for s in state['steps']]: raise SystemExit('Step already submitted')
meta=json.loads((clone/'experiment.json').read_text())
blocks=re.findall(r'```text\n(.*?)\n```',(clone/'README.md').read_text(),re.S)
prompt=next(p for p in blocks if p.startswith(step+':')) if step.startswith('S') else blocks[0]
env=dict(os.environ); env.update(PATH='/home/joezen777/.nvm/versions/node/v24.18.0/bin:'+env['PATH'],CLAUDE_CODE_DISABLE_AUTO_MEMORY='1',npm_config_cache=str(root/'npm-cache'/b))
def git(*args): return subprocess.check_output(['git',*args],cwd=clone,env=env,text=True).strip()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
if not state['steps'] and 'preparedSha' not in state:
    assert not git('status','--porcelain')
    state['preparedSha']=git('rev-parse','HEAD')
    git('commit','--allow-empty','-m','[tokens-est:0] [kind:event] [phase:run-start] begin measured run')
cmd=['/home/joezen777/.local/bin/claude','-p','--model',meta['modelId'],'--effort','medium','--setting-sources','project','--strict-mcp-config','--disable-slash-commands','--no-chrome','--permission-mode','acceptEdits','--allowedTools','Bash,Read,Edit,Write,Glob,Grep','--disallowedTools','Agent,Task','--output-format','stream-json','--verbose']
cmd+=['--resume',state['sessionId']] if state['steps'] else ['--session-id',state['sessionId']]
event={'step':step,'startUtc':now(),'command':cmd}; start=time.monotonic()
(evidence/(step+'.prompt.txt')).write_text(prompt)
state['running']=event; statefile.write_text(json.dumps(state,indent=2))
with (evidence/(step+'.jsonl')).open('w') as out,(evidence/(step+'.stderr')).open('w') as err:
    p=subprocess.Popen(cmd,cwd=clone,env=env,stdin=subprocess.PIPE,stdout=out,stderr=err,start_new_session=True,text=True)
    try: p.communicate(prompt,timeout=max(1,5400-state['activeSeconds'])); event['exitCode']=p.returncode
    except subprocess.TimeoutExpired:
        import signal
        os.killpg(p.pid,signal.SIGTERM);p.wait();event['exitCode']=124
        event['timeout']=True
event.update(stopUtc=now(),activeSeconds=time.monotonic()-start,head=git('rev-parse','HEAD'),dirty=git('status','--porcelain'))
state['activeSeconds']+=event['activeSeconds'];state['steps'].append(event);state.pop('running',None)
messages=[json.loads(line) for line in (evidence/(step+'.jsonl')).read_text().splitlines() if line.strip()]
results=[m for m in messages if m.get('type')=='result'];result=results[-1] if results else {}
event['resolvedModels']=list(result.get('modelUsage',{}))
event['modelMismatch']=any(model != meta['modelId'] for model in event['resolvedModels'])
(evidence/(step+'.result.json')).write_text(json.dumps(result,indent=2))
if step in ['zero-shot','S08'] or result.get('is_error') or event['exitCode'] or event.get('modelMismatch'):
    state['firstPassSha']=event['head'];state['stopUtc']=event['stopUtc']
    git('commit','--allow-empty','-m','[tokens-est:0] [kind:event] [phase:run-end] end measured first pass')
statefile.write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps(event,indent=2));print(result.get('result',result))

