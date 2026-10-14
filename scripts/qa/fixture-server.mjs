import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {DECK} from './deck.mjs';
export async function startFixture(port=0){
 const html=(await readFile(new URL('../../qa/fixtures/reference.html',import.meta.url),'utf8')).replace('__DECK__',JSON.stringify(DECK));
 const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const fixture=await startFixture(Number(process.argv[2]||4179));console.log(fixture.url);for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{await fixture.close();process.exit();});}
