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
  showModal() { this.open = true; }, close() { this.open = false; }
 };
}
const documentHandlers = {};
const sandbox = {
 localStorage: {getItem(k){if(control.failRead)throw Error("denied");return storage.get(k)??null;},setItem(k,v){if(control.failWrite)throw Error("quota");storage.set(k,v);},removeItem(k){if(control.failWrite)throw Error("denied");storage.delete(k);}},
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener(name,fn) {(documentHandlers[name]??=[]).push(fn)} },
  window: { confirm(){control.confirmCount=(control.confirmCount||0)+1;return control.confirm!==false;}, innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { (windowHandlers[name] ??= []).push(handler); } },
  Date: class extends Date { static now() { return now; } },
  requestAnimationFrame() {},
};
vm.createContext(sandbox);
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "data/hints.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "achievements.js", "studio-ui.js", "registry.js", "park-ui.js", "hints.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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
const progress=a.run('SAVE_DATA.progressKey');
const saved=()=>JSON.parse(a.storage.get(progress));
const tick=ms=>{a.advanceMs(ms);a.run('updateHints()');};
assert.equal(a.elements['hint-gift'].hidden,true);
tick(599999);assert.equal(a.elements['hint-gift'].hidden,true);
tick(1);assert.equal(a.elements['hint-gift'].hidden,false);
a.elements['hint-gift'].handlers.click();assert.equal(a.run('hintUi.open'),true);assert.equal(a.run('gameState.hints.history.length'),1);
const before=a.read('({x:player.x,y:player.y})');a.key({key:'ArrowRight',code:'ArrowRight'});a.run('update(.2)');assert.deepEqual(a.read('({x:player.x,y:player.y})'),before);
a.key({code:'KeyI'});assert.equal(a.run('inventoryUiState.open'),false);a.key({code:'Tab'});assert.equal(a.run('achievementUi.open'),false);
a.run('closeHints();openHints(true);closeHints()');assert.equal(a.run('gameState.hints.history.length'),1);
a.run('acquireItem("ITM-01");updateHints()');assert.equal(a.run('gameState.hints.idleMs'),0);assert.equal(a.elements['hint-gift'].hidden,true);
a.run('openHints(false)');assert.equal(a.elements['hint-list'].children.length,1);a.run('closeHints()');
tick(1000);a.run('acquireItem("ITM-01");updateHints()');assert.equal(a.run('gameState.hints.idleMs'),1000);
a.run('markHintClue("photo-front")');assert.equal(a.run('gameState.hints.idleMs'),0);const progressTime=a.run('gameState.hints.lastProgressAt');
tick(2000);a.run('markHintClue("photo-front")');assert.equal(a.run('gameState.hints.idleMs'),2000);assert.equal(a.run('gameState.hints.lastProgressAt'),progressTime);
a.run('gameState.swingUsed=true;updateAchievementConditions()');assert.equal(a.run('gameState.hints.idleMs'),0);tick(2000);a.run('updateAchievementConditions()');assert.equal(a.run('gameState.hints.idleMs'),2000);
// 다른 탭·다른 창과 게임을 닫은 시간은 누적하지 않는다.
for(const fn of a.windowHandlers.blur)fn();tick(100000);assert.equal(a.run('gameState.hints.idleMs'),2000);
for(const fn of a.windowHandlers.focus)fn();tick(1000);assert.equal(a.run('gameState.hints.idleMs'),3000);
a.run('document.hidden=true');for(const fn of a.documentHandlers.visibilitychange)fn();tick(100000);assert.equal(a.run('gameState.hints.idleMs'),3000);
a.run('document.hidden=false');for(const fn of a.documentHandlers.visibilitychange)fn();tick(1000);assert.equal(a.run('gameState.hints.idleMs'),4000);
let b=session(a.storage);assert.equal(b.run('gameState.hints.idleMs'),4000);assert.deepEqual(b.read('gameState.hints.history'),a.read('gameState.hints.history'));assert.equal(b.run('gameState.hints.lastProgressAt'),a.run('gameState.hints.lastProgressAt'));
b.advanceMs(1000);b.run('updateHints()');assert.equal(b.run('gameState.hints.idleMs'),5000);
a=session();a.run('city.debug=true');tick(9999);assert.equal(a.elements['hint-gift'].hidden,true);tick(1);assert.equal(a.elements['hint-gift'].hidden,false);
// 기존 1버전 저장을 읽어도 인벤토리와 완료 기록을 잃지 않는다.
a.run('acquireItem("ITM-01")');let old=saved();old.saveVersion=1;delete old.hints;a.storage.set(progress,JSON.stringify(old));b=session(a.storage);
assert.equal(b.run('gameState.photoCollected'),true);assert.equal(b.run('gameState.hints.history.length'),0);assert.equal(saved().saveVersion,2);
// 현재 실내·층과 필수 아이템을 우선하고, 야외에서는 실제 거리를 비교한다.
a=session();a.run('scene.interiorId="C01"');assert.equal(a.run('chooseHint().id'),'HNT-01');
a.run('scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=1');assert.equal(a.run('chooseHint().id'),'HNT-02');
a.run('scene.schoolFloor=2;player.x=classroomRoom().x+40;player.y=classroomRoom().y+80');assert.equal(a.run('chooseHint().id'),'HNT-03');
a.run('gameState.acquiredItems[HINT_DATA.items.crayon]=true;scene.schoolFloor=1;player.x=INSPECTION_OBJECTS.find(o=>o.type==="registry").x;player.y=INSPECTION_OBJECTS.find(o=>o.type==="registry").y');assert.equal(a.run('chooseHint().id'),'HNT-04');
a.run('delete gameState.acquiredItems[HINT_DATA.items.crayon]');assert.notEqual(a.run('chooseHint().id'),'HNT-04');
a.run('scene.interiorId=null;player.x=parkLayout().center.x;player.y=parkLayout().center.y;gameState.acquiredItems[PARK_DATA.headbandId]=true');assert.equal(a.run('chooseHint().id'),'HNT-05');
a.run('player.x=playgroundLayout().swing.x;player.y=playgroundLayout().swing.y');assert.equal(a.run('chooseHint().id'),'HNT-06');
a.run('player.x=city.locations.find(p=>p.id===HOUSE_DATA.placeId).x*settings.worldScale;player.y=city.locations.find(p=>p.id===HOUSE_DATA.placeId).y*settings.worldScale');assert.equal(a.run('chooseHint().id'),'HNT-07');
a.run('scene.interiorId=HOUSE_DATA.placeId;CABINET_DATA.answer.forEach(id=>gameState.acquiredItems[id]=true)');assert.equal(a.run('chooseHint().id'),'HNT-08');
a.run('gameState.cabinetSolved=true;gameState.childRoomUnlocked=true');assert.equal(a.run('chooseHint().id'),'HNT-16');
// 마지막 활동까지 끝나면 새 힌트를 만들지 않으며 기존 기록은 유지된다.
a.run('HINT_DATA.progressFlags.forEach(flag=>gameState[flag]=true);Object.values(HINT_DATA.items).forEach(id=>gameState.acquiredItems[id]=true)');assert.equal(a.run('chooseHint()'),null);
const exact=[
 '촬영구역의 테이블 위를 살펴보세요.',
 '복도 게시판에는 각 반의 위치가 표시되어 있어요.',
 '교실 뒤쪽 게시판의 자리 배치도를 확인해 보세요.',
 '흐릿한 명부에 크레파스를 사용해 보세요.',
 '회전목마의 반대편에서도 말과 마차를 세어 보세요.',
 '그네와 시소를 모두 움직여 보세요.',
 '집의 앞문만 보지 말고 옆으로 이어지는 길도 살펴보세요.',
 '다섯 장소에서 얻은 추억의 물건을 순서에 맞게 놓아보세요.',
];assert.deepEqual(a.read('HINT_DATA.entries.slice(0,8).map(e=>e.text)'),exact);
console.log('PASS: exact hints, 10-minute/10-second boundaries, visible time only, progress deduplication, saved timer/history, v1 migration, context/prerequisite/distance selection, modal blocking');

