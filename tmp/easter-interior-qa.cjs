const path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe')});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    assert.equal(await page.evaluate(()=>{
      openingUi.active=false;openingDialog.close();gameState.onboarding.introSeen=true;gameState.onboarding.studioVisited=true;
      for(let y=296;y>=30;y--)if(!canStandCity(1019*settings.worldScale,y*settings.worldScale-player.footOffset))return false;
      player.x=1019*settings.worldScale;player.y=30*settings.worldScale-player.footOffset;
      updateEasterEgg();return inEasterShop() && canStand(player.x,player.y);
    }),true);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>{
      player.x=450;player.y=300-player.footOffset;updateEasterEgg();return inspectionUiState.mode;
    }),'dialogue');
    await page.locator('#inspection-close').click();
    await page.screenshot({path:'tmp/easter-interior.png'});
    const point=await page.evaluate(()=>({x:(EASTER_EGG_DATA.snack.x-camera.x)*settings.cameraZoom,y:(EASTER_EGG_DATA.snack.y-camera.y)*settings.cameraZoom}));
    await page.mouse.click(point.x,point.y);
    assert.equal(await page.locator('#easter-snack-panel').isVisible(),true);
    await page.locator('.snack-star').first().click();
    await page.locator('#inspection-close').click();
    await page.reload();await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>inEasterShop() && inspectionUiState.mode===null && gameState.acquiredItems[EASTER_EGG_DATA.itemId]),true);
    assert.equal(await page.evaluate(()=>{
      for(let y=300;y<=600;y++)if(!canStandInterior(450,y-player.footOffset,currentInterior()))return false;
      player.x=450;player.y=590-player.footOffset;updateEasterEgg();
      return scene.interiorId===null && (player.y+player.footOffset)/settings.worldScale===100;
    }),true);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>scene.interiorId),null);
    await page.screenshot({path:'tmp/easter-alley-hidden.png'});
    await page.keyboard.press('i');await page.locator('[data-item-id="EGG-ITEM-01"]').click();
    assert.equal(await page.locator('#easter-snack-panel').isVisible(),true);await page.keyboard.press('i');
    assert.equal(await page.evaluate(()=>{
      player.y=30*settings.worldScale-player.footOffset;updateEasterEgg();return inEasterShop();
    }),true);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>{player.y=300-player.footOffset;updateEasterEgg();return inspectionUiState.mode}),null);
    await page.keyboard.press('e');assert.equal(await page.evaluate(()=>inspectionUiState.mode),'dialogue');
    await page.keyboard.press('e');
    assert.deepEqual(errors,[]);
    console.log('PASS: alley access, automatic entrance/exit, furniture collision, greeting once, snack/inventory, indoor save reload, no bounce, repeat E dialogue');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
