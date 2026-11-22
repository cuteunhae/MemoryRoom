const path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe')});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);
 await page.evaluate(()=>{
 openingUi.active=false;openingDialog.close();gameState.onboarding.introSeen=true;gameState.onboarding.studioVisited=true;
 gameState.easterEgg.shopMet=true;
 player.x=1019*settings.worldScale;player.y=30*settings.worldScale-player.footOffset;updateEasterEgg();
 });
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>{
 player.x=100;player.y=500-player.footOffset;handleEasterClick(760,260);return inspectionUiState.mode;
 }),null);
 await page.evaluate(()=>{player.x=760;player.y=450-player.footOffset;});
 await page.waitForTimeout(100);
 const point=await page.evaluate(()=>({x:(760-camera.x)*settings.cameraZoom,y:(260-camera.y)*settings.cameraZoom}));
 await page.mouse.click(point.x,point.y);
 assert.equal(await page.locator('#fortune-panel').isVisible(),true);
 assert.equal(await page.evaluate(()=>isGameInputBlocked()),true);
 assert.equal(await page.evaluate(()=>FORTUNE_DATA.entries.length),9);
 for(let i=0;i<9;i++){
 assert.equal(await page.evaluate(i=>{
 const random=Math.random;Math.random=()=> (i+.5)/9;
 try{document.getElementById('fortune-again').click();}finally{Math.random=random;}
 return document.getElementById('fortune-quote').textContent.includes(FORTUNE_DATA.entries[i].quote)&&document.getElementById('fortune-author').textContent.includes(FORTUNE_DATA.entries[i].author);
 },i),true);
 }
 await page.screenshot({path:'tmp/fortune-panel.png'});
 await page.locator('#inspection-close').click();
 assert.equal(await page.evaluate(()=>inspectionUiState.mode),null);
 await page.mouse.click(point.x,point.y);
 assert.equal(await page.locator('#fortune-panel').isVisible(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: near/far machine click, all nine random results, unlimited redraw, input block, close/reopen, no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
