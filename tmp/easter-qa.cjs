const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe')});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}}), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    const initial = await page.evaluate(() => {
      openingUi.active=false;openingDialog.close();gameState.onboarding.introSeen=true;gameState.onboarding.studioVisited=true;
      const legacy=createProgressSnapshot();delete legacy.easterEgg;
      const restored=decodeProgress(JSON.stringify(legacy));
      scene.interiorId=null;
      const reachable=[];
      for(let y=296;y>=84;y--) reachable.push(canStandCity(1019*settings.worldScale,y*settings.worldScale-player.footOffset));
      player.x=1019*settings.worldScale;player.y=84*settings.worldScale-player.footOffset;updateCamera();
      toggleSettings();updateEasterEgg();const blocked=!gameState.easterEgg.shopMet;closeSettings();
      updateEasterEgg();
      return {legacy:restored.state.easterEgg.shopMet, reachable:reachable.every(Boolean), blocked,
        wall:canStandCity(1019*settings.worldScale,40*settings.worldScale-player.footOffset), mode:inspectionUiState.mode,
        count:ACHIEVEMENT_CONDITIONS.length};
    });
    assert.deepEqual(initial,{legacy:false,reachable:true,blocked:true,wall:false,mode:'dialogue',count:6});
    await page.locator('#inspection-close').click();
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>inspectionUiState.mode),null);
    await page.screenshot({path:'tmp/easter-shop.png'});
    const target=await page.evaluate(()=>({x:(EASTER_EGG_DATA.snack.x*settings.worldScale-camera.x)*settings.cameraZoom,y:(EASTER_EGG_DATA.snack.y*settings.worldScale-camera.y)*settings.cameraZoom}));
    await page.mouse.click(target.x,target.y);
    assert.equal(await page.locator('.snack-star').count(),4);
    await page.locator('.snack-star').first().click();
    assert.equal(await page.locator('.snack-star-glow').first().evaluate(e=>e.getAnimations().length),1);
    await page.locator('#inspection-dialog').screenshot({path:'tmp/easter-snack.png'});
    await page.locator('#inspection-close').click();
    await page.mouse.click(target.x,target.y);
    assert.equal(await page.evaluate(()=>gameState.inventory.itemIds.filter(id=>id===EASTER_EGG_DATA.itemId).length),1);
    await page.locator('#inspection-close').click();
    await page.reload();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>gameState.easterEgg.shopMet && inspectionUiState.mode===null),true);
    await page.keyboard.press('i');
    await page.locator('[data-item-id="EGG-ITEM-01"]').click();
    assert.equal(await page.locator('#easter-snack-panel').isVisible(),true);
    await page.keyboard.press('i');
    assert.equal(await page.evaluate(()=>!inventoryUiState.open && inspectionUiState.mode===null),true);
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(()=>inspectionUiState.mode),'dialogue');
    await page.keyboard.press('e');
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>{
      const old=createProgressSnapshot();delete old.easterEgg;
      old.position.x=1019*settings.worldScale;old.position.y=20*settings.worldScale-player.footOffset;
      localStorage.setItem(SAVE_DATA.progressKey,JSON.stringify(old));
    });
    await page.reload();
    assert.equal(await page.evaluate(()=>gameState.inventory.itemIds.includes(EASTER_EGG_DATA.itemId) &&
      canStandCity(player.x,player.y) && player.x===EASTER_EGG_DATA.approach.x*settings.worldScale),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: route, collision, blocked auto-dialogue, once-only meeting, snack pickup/deduplication, sparkle, legacy save, reload, inventory viewer, E interaction, six achievements unchanged');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
