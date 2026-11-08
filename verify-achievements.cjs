"use strict";

// 실제 클릭 처리와 이동 함수를 사용해 입장·퇴장·잠금·카메라 전환을 검사한다.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
let now = 10000;
const canvasHandlers = {};
const windowHandlers = {};
const context = new Proxy({ measureText: () => ({ width: 100 }) }, { get: (target, key) => target[key] ?? (() => {}) });
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
const sandbox = {
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener() {} },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { (windowHandlers[name] ??= []).push(handler); } },
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


const initial=read('gameState');
const reset=()=>{run('Object.assign(gameState,'+JSON.stringify(initial)+');achievementUi.queue=[];achievementUi.current=null;achievementUi.open=false');};
const key=(code,repeat=false)=>{let prevented=false;for(const handler of windowHandlers.keydown)handler({code,key:code,repeat,preventDefault(){prevented=true}});return prevented;};
assert.equal(run('gameState.achievements["ACH-01"]'),'active');assert.equal(read('Object.values(gameState.achievements)').filter(x=>x==='hidden').length,5);
key('Tab');assert.equal(run('achievementUi.open'),true);assert.equal(elements['achievement-list'].children.length,1);
assert.equal(elements['achievement-list'].children[0].dataset.achievementId,'ACH-01');
const before=read('({x:player.x,y:player.y})');key('ArrowRight');run('update(0.2)');assert.deepEqual(read('({x:player.x,y:player.y})'),before);
key('KeyI');assert.equal(run('inventoryUiState.open'),false);key('Tab',true);assert.equal(run('achievementUi.open'),true);
const side=read('outdoorDoors().find(d=>d.placeId===HOUSE_DATA.placeId&&d.kind==="side")');positionAt(side);advance();click(side);assert.equal(run('scene.interiorId'),null);
key('Tab');assert.equal(run('achievementUi.open'),false);key('KeyI');assert.equal(key('Tab'),false);assert.equal(run('achievementUi.open'),false);key('KeyI');
run('openInspection({type:"dialogue",name:"test",messages:{dialogue:"test"}})');assert.equal(key('Tab'),false);assert.equal(run('inspectionUiState.mode'),'dialogue');run('closeInspection()');
run('acquireItem("ITM-02");acquireItem("ITM-03")');assert.equal(run('gameState.achievements["ACH-02"]'),'hidden');
run('gameState.registrySolved=true;updateAchievementConditions()');assert.equal(run('gameState.achievements["ACH-02"]'),'completed');assert.equal(run('gameState.achievements["ACH-01"]'),'active');
key('Tab');assert.equal(elements['achievement-list'].children.length,2);elements['achievement-close'].handlers.click();
run('updateAchievementNotifications()');assert.equal(elements['achievement-toast'].hidden,false);assert.equal(run('achievementUi.current'),'ACH-02');
run('updateAchievementConditions();updateAchievementConditions()');assert.equal(run('achievementUi.queue.length'),0);
now+=2999;run('updateAchievementNotifications()');assert.equal(elements['achievement-toast'].hidden,false);now+=1;run('updateAchievementNotifications()');assert.equal(elements['achievement-toast'].hidden,true);
run('acquireItem("ITM-01")');assert.equal(run('gameState.achievements["ACH-03"]'),'active');
reset();run('gameState.carouselSolved=true;acquireItem("ITM-04")');assert.equal(run('gameState.achievements["ACH-03"]'),'hidden');run('gameState.playgroundMemoViewed=true;updateAchievementConditions()');assert.equal(run('gameState.achievements["ACH-03"]'),'completed');
reset();run('gameState.swingUsed=true;gameState.seesawUsed=true;updateAchievementConditions()');assert.equal(run('gameState.achievements["ACH-04"]'),'hidden');run('gameState.slideUsed=true;updateAchievementConditions()');assert.equal(run('gameState.achievements["ACH-04"]'),'completed');
const ids=read('[...ACHIEVEMENT_CONDITIONS].sort((a,b)=>a.order-b.order).map(e=>e.id)');
const permutations=arr=>arr.length?arr.flatMap((id,i)=>permutations(arr.filter((_,j)=>j!==i)).map(rest=>[id,...rest])):[[]];
for(const order of permutations(ids)){
 reset();const completed=new Set();
 for(const id of order){
  run('(()=>{const c=ACHIEVEMENT_CONDITIONS.find(e=>e.id==='+JSON.stringify(id)+');for(const f of c.flags||[c.flag])gameState[f]=true;for(const item of c.items)gameState.acquiredItems[item]=true;updateAchievementConditions()})()');
  completed.add(id);const active=ids.find(id=>!completed.has(id));
  for(const [id,state] of Object.entries(read('gameState.achievements')))assert.equal(state,completed.has(id)?'completed':id===active?'active':'hidden');
 }
 assert.equal(run('achievementUi.queue.length'),6);assert.equal(run('gameState.endingReached'),false);
}
run('updateAchievementNotifications()');assert.equal(run('achievementUi.queue.length'),5);const first=run('achievementUi.current');now+=3000;run('updateAchievementNotifications()');assert.notEqual(run('achievementUi.current'),first);assert.equal(run('achievementUi.queue.length'),4);
reset();run('openInspection({type:"diary",name:DIARY_DATA.text.title});diaryUi.page=2;closeInspection({confirmDiary:true})');assert.equal(run('gameState.endingReached'),true);assert.equal(read('Object.values(gameState.achievements)').filter(x=>x==='completed').length,0);
console.log('PASS: Tab/modal blocking, independent requirements, 720 completion orders, hidden/active/completed transitions, skip completed, notification timing/queue/deduplication, ending independence');
