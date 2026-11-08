"use strict";
const assert=require('node:assert/strict');
function session(storage=new Map(),control={}) {

// 실제 클릭 처리와 이동 함수를 사용해 입장·퇴장·잠금·카메라 전환을 검사한다.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
let now = 10000;
const canvasHandlers = {};
const windowHandlers = {};
const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
const canvas = {
  width: 1280, height: 720,
  getContext: () => context,
  addEventListener: (name, handler) => { canvasHandlers[name] = handler; },
  focus() {},
  // CSS 표시 크기와 그리기 크기가 달라도 클릭 좌표가 맞아야 한다.
  getBoundingClientRect: () => ({ left: 17, top: 29, width: canvas.width / 2, height: canvas.height / 2 }),
};
const elements = {};
function element() {
 return { children: [], dataset: {}, attributes: {}, handlers: {}, textContent: '',
  addEventListener(name, fn) { this.handlers[name] = fn; },
  setAttribute(name, value) { this.attributes[name] = value; },
  append(...children) { this.children.push(...children); },
  replaceChildren() { this.children = []; }, focus() {},
  getContext() { return canvas.getContext("2d"); }, showModal() { this.open = true; }, close() { this.open = false; }
 };
}
const documentHandlers = {};
const sandbox = {
 localStorage: {getItem(k){if(control.failRead)throw Error("denied");return storage.get(k)??null;},setItem(k,v){if(control.failWrite)throw Error("quota");storage.set(k,v);},removeItem(k){if(control.failWrite)throw Error("denied");storage.delete(k);}},
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener(name,fn) {documentHandlers[name]=fn} },
  window: { confirm(){control.confirmCount=(control.confirmCount||0)+1;return control.confirm!==false;}, innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { (windowHandlers[name] ??= []).push(handler); } },
  Date: class extends Date { static now() { return now; } },
  requestAnimationFrame() {},
};
vm.createContext(sandbox);
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "data/hints.js", "data/settings.js", "input.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "achievements.js", "studio-ui.js", "registry.js", "park-ui.js", "hints.js", "map-ui.js", "data/ending.js", "ending.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
const run = code => vm.runInContext(code, sandbox);
const read = code => JSON.parse(run(`JSON.stringify(${code})`));
const advance = () => { now += 300; };
const positionAt = target => {
  run(`player.x = ${target.approach.x}; player.y = ${target.approach.footY} - player.footOffset; updateCamera()`);
};
const click = (target, button = 0) => {
  const screen = read(`({x: (${target.x} - camera.x) * settings.cameraZoom, y: (${target.y} - camera.y) * settings.cameraZoom})`);
  canvasHandlers.pointerdown({ button, clientX: 17 + screen.x / 2, clientY: 29 + screen.y / 2 });
};


for(const file of ['data/save.js','save.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox,{filename:file});
return {storage,control,run,read,elements,windowHandlers,documentHandlers,canvasHandlers,positionAt,click,advance,advanceMs(ms){now+=ms},key(event){for(const fn of windowHandlers.keydown)fn({preventDefault(){},...event})}};
}

let a=session();
const progress=a.run('SAVE_DATA.progressKey'), preferences=a.run('SAVE_DATA.preferencesKey');
const snapshot=()=>JSON.parse(a.storage.get(progress));
assert.equal(snapshot().saveVersion,3);
a.run('acquireItem("ITM-01")');assert.equal(snapshot().puzzles.photoCollected,true);
assert.equal(snapshot().achievements['ACH-01'],'completed');
let b=session(a.storage);assert.equal(b.run('gameState.photoCollected'),true);assert.equal(b.run('achievementUi.queue.length'),0);
assert.equal(b.run('acquireItem("ITM-01")'),false);
// 걷고 나서 저장 간격이 지나거나 탭을 떠나면 좌표를 기록한다.
const old=a.read('capturePosition()');
a.run('pressedKeys.add("ArrowRight");update(.05);pressedKeys.clear()');
assert.notEqual(a.run('player.x'),old.x);a.advanceMs(1000);a.run('updatePositionSave()');
b=session(a.storage);assert.equal(b.run('player.x'),a.run('player.x'));
a.run('pressedKeys.add("ArrowRight");update(.05);pressedKeys.clear()');a.windowHandlers.pagehide[0]();
b=session(a.storage);assert.equal(b.run('player.x'),a.run('player.x'));
// 미완료 배치는 저장 사본에서만 반환되고 실행 중 배치는 유지된다.
a.run('CABINET_DATA.answer.forEach(acquireItem);openInspection({type:"cabinet",name:CABINET_DATA.text.title});selectCabinetInventory("ITM-01");clickCabinetSlot(4)');
assert.equal(a.run('gameState.cabinet.slots[4]'),'ITM-01');
assert.ok(snapshot().cabinet.slots.every(id=>id===null));assert.ok(snapshot().inventory.itemIds.includes('ITM-01'));
b=session(a.storage);assert.ok(b.read('gameState.cabinet.slots').every(id=>id===null));
assert.equal(b.read('gameState.inventory.itemIds').filter(id=>id==='ITM-01').length,1);
// 이전 배치가 남은 저장을 읽어도 원자적으로 반환한 결과를 다시 기록한다.
let legacy=snapshot();legacy.inventory.itemIds=legacy.inventory.itemIds.filter(id=>id!=='ITM-01');legacy.cabinet.slots[4]='ITM-01';a.storage.set(progress,JSON.stringify(legacy));
b=session(a.storage);assert.equal(b.read('gameState.inventory.itemIds').filter(id=>id==='ITM-01').length,1);assert.ok(snapshot().cabinet.slots.every(id=>id===null));
// 완료 배치와 열쇠는 복원 뒤에도 고정되어 중복 지급되지 않는다.
a.run('closeInspection();openInspection({type:"cabinet",name:CABINET_DATA.text.title});CABINET_DATA.answer.forEach((id,i)=>{selectCabinetInventory(id);clickCabinetSlot(i)})');
assert.equal(snapshot().puzzles.cabinetSolved,true);b=session(a.storage);
assert.deepEqual(b.read('gameState.cabinet.slots'),b.read('CABINET_DATA.answer'));assert.equal(b.read('gameState.inventory.itemIds').filter(id=>id==='ITM-09').length,1);
assert.equal(b.run('acquireItem("ITM-09")'),false);
assert.ok(b.read('CABINET_DATA.answer').every(id=>!b.read('gameState.inventory.itemIds').includes(id)));
// 각 놀이시설과 명부·회전목마·발견·엔딩 결과는 영구 진행 상태다.
a.run('closeInspection();gameState.swingUsed=true;updateAchievementConditions()');b=session(a.storage);assert.equal(b.run('gameState.swingUsed'),true);assert.equal(b.run('gameState.seesawUsed'),false);
a.run('gameState.seesawUsed=true;gameState.slideUsed=true;gameState.registrySolved=true;gameState.carouselSolved=true;gameState.diaryDiscovered=true;updateAchievementConditions();openInspection({type:"diary",name:DIARY_DATA.text.title});diaryUi.page=2;closeInspection({confirmDiary:true})');
b=session(a.storage);for(const flag of ['swingUsed','seesawUsed','slideUsed','registrySolved','carouselSolved','diaryDiscovered','endingReached'])assert.equal(b.run('gameState.'+flag),true);
assert.equal(b.run('diaryUi.page'),0);assert.equal(b.run('inspectionUiState.mode'),null);
assert.ok(!JSON.stringify(snapshot()).includes('registryProgress'));assert.ok(!JSON.stringify(snapshot()).includes('diaryUi'));
// 풍선 획득 후 메모 창을 닫지 않고 재접속해도 메모 지급 예약이 남는다.
a=session(a.storage);a.run('collectParkBalloon()');b=session(a.storage);assert.equal(b.run('gameState.playgroundMemoPending'),true);
b.run('toggleInventory()');assert.equal(b.run('inspectionUiState.mode'),'playgroundMemo');b.run('closeInspection()');
let c=session(a.storage);assert.ok(c.read('gameState.inventory.itemIds').includes(c.run('PARK_DATA.memoId')));assert.equal(c.run('gameState.playgroundMemoPending'),false);
// 실내·학교 층·퇴장 좌표를 저장하고 실제 클릭으로 나올 수 있다.
a=session();
const school=a.read('outdoorDoors().find(d=>d.placeId===SCHOOL_DATA.placeId&&d.kind!=="locked")');a.positionAt(school);a.advance();a.click(school);
assert.equal(snapshot().position.interiorId,a.run('SCHOOL_DATA.placeId'));
a.run('player.x=schoolStairs().x;player.y=schoolStairs().y-player.footOffset;handleSchoolStairs(schoolStairs().x,schoolStairs().y)');
b=session(a.storage);assert.equal(b.run('scene.schoolFloor'),2);assert.deepEqual(b.read('scene.returnPoint'),a.read('scene.returnPoint'));
b.run('player.x=schoolStairs().x;player.y=schoolStairs().y-player.footOffset;handleSchoolStairs(schoolStairs().x,schoolStairs().y)');
b.advance();b.run('player.x=currentInterior().spawn.x;player.y=currentInterior().spawn.footY-player.footOffset;exitInterior()');assert.equal(b.run('scene.interiorId'),null);
// 설정은 진행 데이터와 다른 키에 저장하며 새 게임·디버그 초기화에도 유지한다.
a=session();a.run('savePreferences({keys:{...userPreferences.keys,up:"KeyW"},sound:{muted:true,volume:.25}});acquireItem("ITM-01")');
const prefs=a.storage.get(preferences);a.control.confirm=false;assert.equal(a.run('requestNewGame()'),false);assert.equal(a.run('gameState.photoCollected'),true);
a.control.confirm=true;a.run('requestNewGame()');assert.equal(a.run('gameState.photoCollected'),false);assert.equal(a.storage.get(preferences),prefs);
b=session(a.storage);assert.equal(b.run('userPreferences.keys.up'),'KeyW');assert.equal(b.run('userPreferences.sound.volume'),.25);
a.run('acquireItem("ITM-01")');a.key({code:'Delete',ctrlKey:true,shiftKey:true});assert.equal(a.run('gameState.photoCollected'),true);
a.run('city.debug=true');a.key({code:'Delete',ctrlKey:true,shiftKey:true});assert.equal(a.run('gameState.photoCollected'),false);assert.equal(a.storage.get(preferences),prefs);
// JSON 손상·잘못된 자료형·버전 차이·잘못된 위치는 새 게임으로 복구한다.
const valid=snapshot();
for(const bad of ['{',JSON.stringify({...valid,saveVersion:999}),JSON.stringify({...valid,inventory:null}),JSON.stringify({...valid,position:{...valid.position,x:-100,y:-100}})]){
 a.storage.set(progress,bad);b=session(a.storage);assert.equal(b.run('gameState.photoCollected'),false);assert.equal(b.run('canStand(player.x,player.y)'),true);assert.equal(b.elements['save-message'].hidden,false);assert.equal(a.storage.get(preferences),prefs);
}
// 저장이 거부되어도 현재 진행을 잃거나 초기화하지 않는다.
a=session();a.run('acquireItem("ITM-01")');const preserved=a.storage.get(progress);a.control.failWrite=true;
assert.equal(a.run('saveProgress()'),false);assert.equal(a.storage.get(progress),preserved);assert.equal(a.run('requestNewGame()'),false);assert.equal(a.run('gameState.photoCollected'),true);
b=session(new Map(),{failRead:true,failWrite:true});assert.equal(b.run('canStand(player.x,player.y)'),true);
console.log('PASS: fresh-session persistence, position/floors/exit, atomic cabinet recovery, solved rewards, individual flags, diary, memo recovery, preferences isolation, reset confirmation/debug gating, corrupt/version/position/storage failures');
