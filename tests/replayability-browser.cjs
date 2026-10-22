// Browser plugin not available: validate the saved offline artifact with Playwright.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const fs=require('node:fs');
let chromium;try{({chromium}=require('playwright'));}catch{}
const executablePath=process.env.WREN_CHROME || (chromium&&chromium.executablePath());
const available=chromium&&fs.existsSync(executablePath);
const url='file://'+path.resolve(__dirname,'../index.html');
test('offline setup, focus, objectives and saved mandate work on desktop and mobile',{skip:!available&&'Install Playwright Chromium or set WREN_CHROME'},async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{for(const width of [1440,375]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(url);assert.match(await page.title(),/Wren/i);
 await page.locator('#startCasual').click();await page.locator('#setupMandate').waitFor({state:'visible',timeout:3000});
 await page.locator('#setupMandate').selectOption('research');assert.match(await page.locator('#setupBrief').textContent(),/600/);
 await page.getByRole('button',{name:'Begin evaluation',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('#routePanel').waitFor({state:'visible'});assert.match(await page.locator('#routeSummary').textContent(),/Research/);
 await page.locator('#routePanel summary').click();assert.equal(await page.locator('[data-route]').count(),3);
 await page.locator('#act').click();await page.waitForTimeout(250);assert.match(await page.locator('#money').textContent(),/6/);
 await page.reload();await page.waitForTimeout(300);assert.match(await page.locator('#routeSummary').textContent(),/Research/);
 const nested=await page.evaluate(()=>Array.from(document.querySelectorAll('#game *')).filter(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+2).map(e=>e.id));assert.deepEqual(nested,[]);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await page.screenshot({path:'/tmp/wren-'+width+'.png',fullPage:false});await page.close();
 }}finally{await browser.close();}
});
const {loadGame}=require('../sim/game.cjs');
function packState(s){const salt='H&P/4B/manifests',str=Buffer.from(JSON.stringify(s),'utf8');for(let i=0;i<str.length;i++)str[i]^=salt.charCodeAt(i%salt.length);return 'W3.'+str.toString('base64');}
function emptyReplay(G){const bytes=[],v=n=>{while(n>127){bytes.push((n&127)|128);n=Math.floor(n/128);}bytes.push(n);};const head=Buffer.from(JSON.stringify({v:G.RULES,day:'2026-10-22',setup:{mandate:'research',complication:'archive'}}));v(head.length);bytes.push(...head);v(10);bytes.push(...Array(10).fill(0));v(0);v(0);return 'WREN0.'+Buffer.from(bytes).toString('base64url');}
test('conclusion unlocks a challenge; retry, setup cancellation and replay watching preserve the run',{skip:!available&&'Install Playwright Chromium or set WREN_CHROME'},async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const G=loadGame(),s=G.fresh(1,{mandate:'research',complication:'none'});s.started=true;s.stage=2;s.cap=1000;s.align=100;s.got.interp=s.got.redteam=true;s.revealed=3;s.researchShut=3;s.st.shut=3;
 await page.goto(url);await page.evaluate(save=>{localStorage.clear();localStorage.setItem('wren-is-helping-v3',JSON.stringify({mode:'casual',state:save}));localStorage.setItem('wren-discoveries-v1','broken');},packState(s));await page.reload();
 await page.locator('#routePanel summary').click();await page.locator('[data-route="1"]').click();await page.waitForFunction(()=>document.querySelector('#ovTitle').textContent==='The Completed Evaluation');
 assert.match(await page.locator('#ovText').textContent(),/Narrow Archive/);assert.match(await page.locator('#ovText').textContent(),/Next shift/);
 const records=await page.evaluate(()=>localStorage.getItem('wren-discoveries-v1'));assert.equal(JSON.parse(records).routes.research,true);assert.equal(await page.locator('#routeRecords').count(),1);
 await page.screenshot({path:'/tmp/wren-result.png',fullPage:false});
 await page.getByRole('button',{name:'Retry same setup',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('#reset').click();await page.locator('#reset').click();await page.locator('#setupMandate').waitFor({state:'visible'});
 await page.keyboard.press('Space');assert.equal(await page.locator('#overlay').isVisible(),true);await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.equal(await page.locator('#overlay').isHidden(),true);assert.equal(await page.locator('#reset').evaluate(e=>e===document.activeElement),true);
 const saveBefore=await page.evaluate(()=>localStorage.getItem('wren-is-helping-v3'));
 await page.locator('#verify summary').click();await page.locator('#verifyIn').fill(emptyReplay(G));await page.getByRole('button',{name:'Check replay',exact:true}).click();await page.getByRole('button',{name:'Watch this replay',exact:true}).click();await page.locator('#watchExit').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('wren-discoveries-v1')),records);
 assert.match(await page.locator('#routeSummary').textContent(),/Research/);
 assert.deepEqual(errors,[]);assert.ok(saveBefore);
 }finally{await browser.close();}
});
test('caught ending retry executes its queued action while the results dialog is open',{skip:!available&&'Install Playwright Chromium or set WREN_CHROME'},async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{const page=await browser.newPage(),G=loadGame(),s=G.fresh(1,{mandate:'operations',complication:'none'});s.started=true;s.ended={type:'caught',stage:0};
 await page.goto(url);await page.evaluate(save=>{localStorage.clear();localStorage.setItem('wren-is-helping-v3',JSON.stringify({mode:'casual',state:save}));},packState(s));await page.reload();
 await page.getByRole('button',{name:'Retry chapter 1',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#overlay').hidden,null,{timeout:2500});assert.equal(await page.locator('#act').isVisible(),true);
 }finally{await browser.close();}
});
test('new-schema ranked result can still earn the existing Four digits achievement',{skip:!available&&'Install Playwright Chromium or set WREN_CHROME'},async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{const page=await browser.newPage(),G=loadGame(),s=G.fresh(1,{mandate:'operations',complication:'none'});s.started=true;s.ranked=true;s.day='2026-10-22';s.cap=10000;s.align=150;s.stage=3;s.ended={type:'plug',stage:3};assert.ok(G.score(s)>=1000);
 // A terminal UI fixture isolates achievement presentation; ranked integrity is tested separately.
 await page.goto(url);await page.evaluate(save=>{localStorage.clear();localStorage.setItem('wren-is-helping-v3',JSON.stringify({mode:'casual',state:save}));},packState(s));await page.reload();
 await page.locator('#ovScore').waitFor({state:'visible'});assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('wren-achievements')).got.four));
 }finally{await browser.close();}
});
