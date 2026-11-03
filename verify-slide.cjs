"use strict";

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
const sandbox = {
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener() {} },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { (windowHandlers[name] ??= []).push(handler); } },
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

elements['slide-graffiti-picture'] ??= element();
elements['slide-graffiti-picture'].getContext=()=>context;
const layout=read('playgroundLayout()');
const graffiti=read('slideGraffitiTarget()');
const geometry=read('graffitiGeometry()');
assert.deepEqual(geometry.alley,read('city.roads.find(road=>road.id===PLAYGROUND_DATA.slideDetail.alleyId).points'));
assert.ok(geometry.home.x<geometry.playground.x && geometry.home.y>geometry.playground.y);
assert.ok(geometry.side.y<geometry.locked.y);
const achievement=read('ACHIEVEMENT_CONDITIONS.find(condition=>condition.flags?.includes("slideUsed"))');
const approach=target=>{
 run(`player.x=${target.x};player.y=${target.y+target.height/2+36}-player.footOffset;updateCamera()`);
 assert.ok(run('canStand(player.x,player.y)'));
};
// 낙서 화면을 열기 전에, 아무 아이템 없이 집 쪽문부터 출입한다.
const house=read('outdoorDoors().find(door=>door.placeId===PLAYGROUND_DATA.slideDetail.homeId && door.kind==="side")');
positionAt(house);advance();click(house);
assert.equal(run('scene.interiorId'),house.placeId);
run('player.x=currentInterior().spawn.x;player.y=currentInterior().spawn.footY-player.footOffset;updateCamera()');
advance();click(read('currentInterior().exit'));assert.equal(run('scene.interiorId'),null);
advance();
// 시설 이용 순서 6가지 모두 업적이 마지막 이용 때만 충족된다.
for(const order of [['slide','swing','seesaw'],['slide','seesaw','swing'],['swing','slide','seesaw'],['seesaw','slide','swing'],['swing','seesaw','slide'],['seesaw','swing','slide']]){
 run('gameState.slideUsed=false;gameState.swingUsed=false;gameState.seesawUsed=false;gameState.achievementConditions={}');
 for(let i=0;i<order.length;i++){
  approach(layout[order[i]]);click(layout[order[i]]);
  assert.equal(run(`gameState.${order[i]}Used`),true);
  assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}]===true`),i===2);
  assert.equal(run('playgroundGiftVisible()'),run('gameState.swingUsed && gameState.seesawUsed'));
  assert.equal(run('inspectionUiState.mode'),null);
 }
}
assert.equal(run('gameState.inventory.itemIds.length'),0);
const end=run('playgroundAnimation.slideUntil');advance();approach(layout.slide);click(layout.slide);
assert.ok(run('playgroundAnimation.slideUntil')>end);
assert.equal(run('gameState.slideUsed'),true);
// 상자 획득은 이미 충족한 시설 이용 업적 조건을 바꾸지 않는다.
approach(layout.gift);click(layout.gift);
assert.equal(run('playgroundGiftVisible()'),false);
assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}]`),true);
run('gameState.slideUsed=false;gameState.achievementConditions={};player.x=city.spawn.x*settings.worldScale;player.y=city.spawn.y*settings.worldScale;updateCamera()');
click(graffiti);assert.equal(run('inspectionUiState.mode'),null);
for(const zoom of [1,1.5,3]) {
 run(`settings.cameraZoom=${zoom}`);approach(graffiti);
 click(graffiti,2);assert.equal(run('inspectionUiState.mode'),null);
 click(graffiti);assert.equal(run('inspectionUiState.mode'),'slideGraffiti');
 assert.equal(run('gameState.slideUsed'),false);
 assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}]===true`),false);
 assert.equal(elements['slide-graffiti'].hidden,false);
 const before=run('player.y');run("pressedKeys.add('ArrowDown');update(0.5)");assert.equal(run('player.y'),before);
 click(layout.slide);assert.equal(run('gameState.slideUsed'),false);
 elements['inspection-close'].handlers.click();assert.equal(run('inspectionUiState.mode'),null);
}
positionAt(house);advance();click(house);assert.equal(run('scene.interiorId'),house.placeId);
console.log('통과: 탑승·낙서 클릭 분리, 원거리·우클릭·모달 입력 제한, 재탑승·6가지 이용 순서·보상과 업적 독립, 실제 골목 좌표, 낙서 전후 쪽문 입장');

