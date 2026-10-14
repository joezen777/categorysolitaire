import { chromium } from '/home/joezen777/categorysolitaire/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const branch=process.argv[2],step=process.argv[3];
const root='/home/joezen777/categorysolitaire-experiments-20261014';
const server=spawn('/home/joezen777/.nvm/versions/node/v24.18.0/bin/node',['node_modules/vite/bin/vite.js',...(step === 'final' ? ['preview'] : []),'--host','127.0.0.1','--port','5188','--strictPort'],{cwd:`${root}/${branch}`,stdio:'ignore'});
let browser;
try{
for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:5188');break;}catch{await new Promise(r=>setTimeout(r,200));}}
browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(() => { let seed = 20261014; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; });
await page.goto('http://127.0.0.1:5188');await page.waitForTimeout(500);
const dir=`${root}/evidence/${branch}`;mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/${step}-390.png`,fullPage:true});
if(step === 'final') { for(const [width,height] of [[360,800],[768,1024],[1440,900]]) { await page.setViewportSize({width,height}); await page.screenshot({path:`${dir}/final-${width}.png`,fullPage:true}); } await page.setViewportSize({width:390,height:844}); }
const report={errors,browserVersion:browser.version(),randomSeed:20261014,text:await page.locator('body').innerText(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
if(step === 'final' && branch === 'claude.cli.sonnet-5-5.spec') {
 const checks=[];
 const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.getByTestId('source'), draft=page.getByTestId('draft');
 const seq=[];
 for(let i=0;i<56;i++){await source.click();seq.push(await draft.innerText());}
 check('56 draws exhaust source',await source.getAttribute('data-count')==='0' && await draft.getAttribute('data-count')==='56');
 await source.click();check('recycle restores 56 source and empty draft',await source.getAttribute('data-count')==='56' && await draft.getAttribute('data-count')==='0');
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.innerText());}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2));
 await page.reload();await page.waitForTimeout(500);await page.getByText('Aviation',{exact:true}).click();await page.getByTestId('foundation').nth(0).click();
 check('title admitted to empty foundation by tap',(await page.getByTestId('foundation').nth(0).innerText()).includes('Aviation 0/8'));
 await page.getByText('Sofa bed',{exact:true}).click();await page.getByTestId('foundation').nth(1).click();
 check('item rejected from empty foundation',await page.getByTestId('foundation').nth(1).getAttribute('data-count')==='0' && (await page.getByRole('alert').innerText()).includes('Illegal'));
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('menuitem',{name:'Turn sound off'}).click();
 await page.getByRole('button',{name:'Menu',exact:true}).click();check('mute toggles menu label',await page.getByRole('menuitem',{name:'Turn sound on'}).count()===1);
 await page.getByRole('menuitem',{name:'Quit',exact:true}).click();check('quit screen appears',await page.getByText('Game quit',{exact:true}).count()===1);
 await page.getByRole('button',{name:'Start New Game'}).click();check('new game resets source and score',await source.getAttribute('data-count')==='56' && await page.getByTestId('score').innerText()==='Score: 0');
 await page.reload();await page.waitForTimeout(500);
 const from=await page.getByTestId('tableau-card').filter({hasText:'Aviation'}).boundingBox();
 const to=await page.getByTestId('foundation').nth(0).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});
 await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',(await page.getByTestId('foundation').nth(0).innerText()).includes('Aviation 0/8'));
 await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});
 report.checks=checks;
}
if(step === 'final' && branch === 'claude.cli.opus-5-5.spec') {
 const checks=[];const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.getByTestId('source'),draft=page.getByTestId('draft');
 const seq=[];for(let i=0;i<56;i++){await source.click();seq.push(await draft.innerText());}
 check('56 draws exhaust source',await source.getAttribute('data-count')==='0' && await draft.getAttribute('data-count')==='56');
 await source.click();check('recycle restores 56 source and empty draft',await source.getAttribute('data-count')==='56' && await draft.getAttribute('data-count')==='0');
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.innerText());}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2));
 const findTitle=async()=>{for(let i=0;i<56 && await page.getByTestId('title-card').count()===0;i++)await source.click();return page.getByTestId('title-card').first();};
 await page.reload();await page.waitForTimeout(500);const title=await findTitle();await title.click();await page.getByTestId('foundation-0').click();
 check('title admitted to empty foundation by tap',await page.getByTestId('foundation-0').getAttribute('data-empty')==='false');
 await page.getByTestId('item-card').first().click();await page.getByTestId('foundation-1').click();
 check('item rejected from empty foundation',await page.getByTestId('foundation-1').getAttribute('data-empty')==='true' && await page.getByTestId('rejection').count()===1);
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByTestId('menu-cog').click();await page.getByTestId('menu-sound').click();await page.getByTestId('menu-cog').click();
 check('mute toggles menu label',(await page.getByTestId('menu-sound').innerText()).includes('Turn sound on'));
 await page.getByTestId('menu-quit').click();check('quit screen appears',await page.getByTestId('quit-screen').count()===1);
 await page.getByTestId('new-game').click();check('new game resets source and score',await source.getAttribute('data-count')==='56' && await page.getByTestId('score').innerText()==='Score: 0');
 await page.reload();await page.waitForTimeout(500);const dragTitle=await findTitle();const from=await dragTitle.boundingBox();const to=await page.getByTestId('foundation-0').boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',await page.getByTestId('foundation-0').getAttribute('data-empty')==='false');await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});report.checks=checks;
}
if(step === 'final' && branch === 'claude.cli.opus-5-5.vibe') {
 const checks=[];const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.locator('.source-row .pile').nth(0).locator('button'),draft=page.locator('.source-row .pile').nth(1);
 const seq=[];for(let i=0;i<56;i++){await source.click();seq.push(await draft.locator('.card--movable').getAttribute('aria-label'));}
 check('56 draws exhaust source',(await source.getAttribute('aria-label')).includes('Flip') && await draft.locator('.pile__badge').innerText()==='56');
 await source.click();check('recycle restores 56 source and empty draft',await source.locator('.pile__badge').innerText()==='56' && await draft.locator('.card--movable').count()===0);
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.locator('.card--movable').getAttribute('aria-label'));}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2));
 await page.reload();await page.waitForTimeout(500);await page.locator('.card--title.card--movable').first().click();await page.locator('.foundation__slot').nth(0).click();
 check('title admitted to empty foundation by tap',await page.locator('.foundation__slot').nth(0).locator('.card--title').count()===1);
 const item=page.locator('.card--item.card--movable').first();const itemLabel=await item.getAttribute('aria-label');await item.click();await page.locator('.foundation__slot').nth(1).click();
 check('item rejected from empty foundation',await page.locator('.foundation__slot').nth(1).locator('.card').count()===0 && await page.getByLabel(itemLabel,{exact:true}).count()>0);
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('menuitem',{name:'Turn sound off'}).click();await page.getByRole('button',{name:'Menu',exact:true}).click();check('mute toggles menu label',await page.getByRole('menuitem',{name:'Turn sound on'}).count()===1);
 await page.getByRole('menuitem',{name:'Quit',exact:true}).click();check('quit screen appears',await page.getByText('Thanks for playing!',{exact:true}).count()===1);
 await page.getByRole('button',{name:'Start a new game'}).click();check('new game resets source and score',await source.locator('.pile__badge').innerText()==='56' && await page.getByText('Score: 0',{exact:true}).count()===1);
 await page.reload();await page.waitForTimeout(500);const from=await page.locator('.card--title.card--movable').first().boundingBox(),to=await page.locator('.foundation__slot').nth(0).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',await page.locator('.foundation__slot').nth(0).locator('.card--title').count()===1);await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});report.checks=checks;
}
if(step === 'final' && branch === 'claude.cli.opus-5-5.steering') {
 const checks=[];const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.getByRole('button',{name:/^Source deck/}),draft=page.getByRole('button',{name:/top of draft pile/});
 const seq=[];for(let i=0;i<56;i++){await source.click();seq.push(await draft.getAttribute('aria-label'));}
 check('56 draws exhaust source',(await source.getAttribute('aria-label')).includes('empty') && await page.getByText('Draft 56',{exact:true}).count()===1);
 await source.click();check('recycle restores 56 source and empty draft',await page.getByText('Deck 56',{exact:true}).count()===1 && await page.getByText('Draft 0',{exact:true}).count()===1);
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.getAttribute('aria-label'));}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2));
 await page.reload();await page.waitForTimeout(500);await page.getByRole('button',{name:/category title card.*column/}).first().click();await page.getByRole('button',{name:/^Empty category slot 1/}).click();
 check('title admitted to empty foundation by tap',await page.getByRole('button',{name:/^Category slot 1:/}).count()===1);
 await page.getByRole('button',{name:/item card.*column/}).first().click();await page.getByRole('button',{name:/^Empty category slot 2/}).click();
 check('item rejected from empty foundation',await page.getByRole('button',{name:/^Empty category slot 2/}).count()===1);
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByRole('button',{name:'Game menu',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:/Sound: On/}).click();await page.getByRole('button',{name:'Game menu',exact:true}).click();check('mute toggles menu label',await page.getByRole('menuitemcheckbox',{name:/Sound: Off/}).count()===1);
 await page.getByRole('menuitem',{name:'Quit game',exact:true}).click();check('quit screen appears',await page.getByRole('heading',{name:'Game ended',exact:true}).count()===1);
 await page.getByRole('button',{name:'Start a new game'}).click();check('new game resets source and score',await page.getByText('Deck 56',{exact:true}).count()===1 && await page.getByLabel('Score 0',{exact:true}).count()===1);
 await page.reload();await page.waitForTimeout(500);const from=await page.getByRole('button',{name:/category title card.*column/}).first().boundingBox(),to=await page.getByRole('button',{name:/^Empty category slot 1/}).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',await page.getByRole('button',{name:/^Category slot 1:/}).count()===1);await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});report.checks=checks;
}

if(step === 'final' && branch === 'claude.cli.sonnet-5-5.steering') {
 const checks=[];const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.getByRole('button',{name:/^Draw a card\.|^Source pile empty/}),piles=page.getByRole('region',{name:'Source and draft piles'}),draft=piles.locator(':scope > div').nth(1);
 const seq=[];for(let i=0;i<56;i++){await source.click();seq.push(await draft.locator('button').getAttribute('aria-label'));}
 check('56 draws exhaust source',(await source.getAttribute('aria-label')).includes('empty') && await draft.getByText('56',{exact:true}).count()===1);
 await source.click();check('recycle restores 56 source and empty draft',(await source.getAttribute('aria-label')).includes('56 left') && await page.getByLabel('Draft pile empty',{exact:true}).count()===1);
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.locator('button').getAttribute('aria-label'));}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2));
 await page.reload();await page.waitForTimeout(500);await page.getByRole('button',{name:/category, \d+ cards/}).first().click();await page.getByRole('button',{name:'Empty foundation slot 1',exact:true}).click();
 check('title admitted to empty foundation by tap',await page.getByLabel(/^Foundation slot 1:/).count()===1);
 await page.getByRole('button',{name:'Sofa bed',exact:true}).click();await page.getByRole('button',{name:'Empty foundation slot 2',exact:true}).click();
 check('item rejected from empty foundation',await page.getByRole('button',{name:'Empty foundation slot 2',exact:true}).count()===1 && await page.getByRole('button',{name:'Sofa bed',exact:true}).count()===1);
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByRole('button',{name:'Game menu',exact:true}).click();await page.getByRole('menuitem',{name:'Turn sound off'}).click();await page.getByRole('button',{name:'Game menu',exact:true}).click();check('mute toggles menu label',await page.getByRole('menuitem',{name:'Turn sound on'}).count()===1);
 await page.getByRole('menuitem',{name:'Quit',exact:true}).click();check('quit screen appears',await page.getByRole('heading',{name:'You quit the game',exact:true}).count()===1);
 await page.getByRole('button',{name:'New game',exact:true}).click();check('new game resets source and score',(await source.getAttribute('aria-label')).includes('56 left') && await page.getByTestId('score').innerText()==='0');
 await page.reload();await page.waitForTimeout(500);const from=await page.getByRole('button',{name:/category, \d+ cards/}).first().boundingBox(),to=await page.getByRole('button',{name:'Empty foundation slot 1',exact:true}).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',await page.getByLabel(/^Foundation slot 1:/).count()===1);await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});report.checks=checks;
}

if(step === 'final' && branch === 'claude.cli.sonnet-5-5.vibe') {
 const checks=[];const check=(name,ok)=>checks.push({name,status:ok?'passed':'failed'});
 const source=page.locator('.top-row > .slot-wrap').nth(0).locator('.card'),draft=page.locator('.top-row > .slot-wrap').nth(1),foundation=page.locator('.board > .row').nth(1).locator(':scope > .slot-wrap');
 const seq=[];for(let i=0;i<56;i++){await source.click();seq.push(await draft.innerText());}
 check('56 draws exhaust source',(await source.getAttribute('class')).includes('empty-slot'));
 await source.click();check('recycle restores 56 source and empty draft',(await source.getAttribute('class')).includes('card-back') && await draft.locator('.empty-slot').count()===1);
 const seq2=[];for(let i=0;i<56;i++){await source.click();seq2.push(await draft.innerText());}
 check('recycle preserves required draw order',JSON.stringify(seq)===JSON.stringify(seq2) && (await source.getAttribute('class')).includes('empty-slot'));
 await page.reload();await page.waitForTimeout(500);await page.locator('.tableau .card-title').first().click();await foundation.nth(0).click();
 check('title admitted to empty foundation by tap',await foundation.nth(0).locator('.found-pile').count()===1);
 const item=page.locator('.tableau .card-item').first();const itemLabel=await item.innerText();await item.click();await foundation.nth(1).click();
 check('item rejected from empty foundation',await foundation.nth(1).locator('.empty-slot').count()===1 && (await page.locator('.tableau').innerText()).includes(itemLabel));
 await page.screenshot({path:`${dir}/illegal-move.png`,fullPage:true});
 await page.getByRole('button',{name:'menu',exact:true}).click();await page.getByRole('menuitem',{name:'Sound: On'}).click();check('mute toggles menu label',await page.getByRole('menuitem',{name:'Sound: Off'}).count()===1);
 await page.getByRole('menuitem',{name:'Quit',exact:true}).click();check('quit screen appears',await page.getByText('Thanks for playing!',{exact:true}).count()===1);
 await page.getByRole('button',{name:'New Game',exact:true}).click();check('new game resets source and score',(await source.getAttribute('class')).includes('card-back') && await page.getByText('Score: 0',{exact:true}).count()===1);
 await page.reload();await page.waitForTimeout(500);const from=await page.locator('.tableau .card-title').first().boundingBox(),to=await foundation.nth(0).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps:4});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20});await page.mouse.up();await page.waitForTimeout(300);
 check('pointer drag admits title to foundation',await foundation.nth(0).locator('.found-pile').count()===1);await page.screenshot({path:`${dir}/after-drag.png`,fullPage:true});report.checks=checks;
}
writeFileSync(`${dir}/${step}-browser.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server.kill();}

