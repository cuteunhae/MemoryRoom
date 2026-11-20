const path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe')});
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.evaluate(()=>{openingUi.active=false;openingDialog.close();gameState.onboarding.introSeen=true;acquireItem(EASTER_EGG_DATA.itemId);});
  const open=async()=>{await page.keyboard.press('i');await page.locator('[data-item-id="EGG-ITEM-01"]').click();};
  await open();await page.locator('.snack-star').first().click();
  assert.equal(await page.evaluate(()=>snackCollection.size),1);
  await page.keyboard.press('i');assert.equal(await page.evaluate(()=>snackCollection.size),0);
  await page.reload();await open();assert.equal(await page.locator('.snack-star:not(:disabled)').count(),4);
  assert.equal(await page.evaluate(()=>gameState.achievements['ACH-H01']),'hidden');
  await page.locator('#inspection-close').click();await page.keyboard.press('i');
  assert.equal(await page.evaluate(()=>{const s=createProgressSnapshot();delete s.achievements['ACH-H01'];delete s.easterEgg.starsCompleted;return decodeProgress(JSON.stringify(s)).state.easterEgg.starsCompleted;}),false);
  await open();
  for(let i=0;i<4;i++)await page.locator('.snack-star:not(:disabled)').first().click();
  assert.equal(await page.evaluate(()=>gameState.achievements['ACH-H01']),'completed');
  assert.equal(await page.locator('.snack-star:not(:disabled)').count(),0);
  await page.keyboard.press('i');await page.keyboard.press('Tab');
  assert.equal(await page.locator('[data-achievement-id="ACH-H01"]').count(),1);
  assert.equal(await page.locator('#achievement-progress').evaluate(e=>e.value),0);
  await page.reload();assert.equal(await page.evaluate(()=>gameState.achievements['ACH-H01']),'completed');
  await open();
  await page.evaluate(()=>{achievementUi.current=null;achievementUi.queue=[];});
  for(let i=0;i<4;i++)await page.locator('.snack-star:not(:disabled)').first().click();
  assert.equal(await page.evaluate(()=>achievementUi.queue.length===0 && achievementUi.current===null),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: partial reset/refresh, legacy migration, hidden unlock, gauge exclusion, persistence, no duplicate notification');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
