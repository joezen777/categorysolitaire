"""Private stdio lifecycle bridge. Never write signed headers to disk/logs."""
import json, os, signal, sys, time
from pathlib import Path
import boto3
from botocore.config import Config
from bedrock_agentcore.tools.browser_client import BrowserClient

cfg=json.loads(sys.stdin.readline())
region=cfg['region']; browser_id=cfg['browserId']; record=Path(cfg['record'])
sdk=boto3.client('bedrock-agentcore',region_name=region,config=Config(connect_timeout=10,read_timeout=30,retries={'max_attempts':2}))
record.parent.mkdir(parents=True,exist_ok=True)
state={'browserId':browser_id,'clientToken':cfg['clientToken'],'name':cfg['name'],'region':region,'status':'starting'}
def save():
    tmp=record.with_suffix('.tmp');tmp.write_text(json.dumps(state,indent=2));tmp.replace(record)
def stop_signal(*_): raise SystemExit(130)
signal.signal(signal.SIGTERM,stop_signal);signal.signal(signal.SIGINT,stop_signal)
save()
try:
    response=sdk.start_browser_session(browserIdentifier=browser_id,name=cfg['name'],clientToken=cfg['clientToken'],sessionTimeoutSeconds=cfg['timeout'],viewPort=cfg['viewport'])
    state.update(sessionId=response['sessionId'],status='running');save()
    client=BrowserClient(region=region)
    client._identifier=browser_id; client._session_id=state['sessionId']
    url,headers=client.generate_ws_headers()
    print(json.dumps({'sessionId':state['sessionId'],'url':url,'headers':headers}),flush=True)
    # stdin EOF also cleans up when the owning Node process exits unexpectedly.
    sys.stdin.readline()
except Exception as error:
    print(json.dumps({'error':str(error)}),flush=True)
finally:
    # Reconcile a successful start whose response was lost; restrict to our unique name.
    if not state.get('sessionId'):
        try:
            token=None
            while True:
                args={'browserIdentifier':browser_id}
                if token:args['nextToken']=token
                data=sdk.list_browser_sessions(**args)
                for item in data.get('items',[]):
                    if item.get('name')==cfg['name']:state['sessionId']=item['sessionId']
                token=data.get('nextToken')
                if not token:break
        except Exception as error:state['reconcileError']=str(error)
    if state.get('sessionId'):
        for attempt in range(3):
            try:
                sdk.stop_browser_session(browserIdentifier=browser_id,sessionId=state['sessionId'])
                state['status']='stopped';break
            except Exception as error:
                state['cleanupError']=str(error);state['status']='cleanup_failed';time.sleep(1)
    save()
