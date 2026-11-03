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
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "studio-ui.js", "registry.js", "park-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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

const layout = read('parkLayout()');
const balloon = { x: layout.stand.x, y: layout.stand.y + run('PARK_DATA.balloon.offsetY') };
const ids = read('({balloon:PARK_DATA.balloonId,memo:PARK_DATA.memoId,headband:PARK_DATA.headbandId})');
const achievement = read('ACHIEVEMENT_CONDITIONS.find(condition=>condition.flags?.includes("playgroundMemoViewed"))');
function approach() {
  run('player.x=parkLayout().stand.x;player.y=parkLayout().stand.y+parkLayout().stand.height/2+36-player.footOffset;updateCamera()');
  assert.ok(run('canStand(player.x,player.y)'));
}
const close = () => elements['inspection-close'].handlers.click();
approach();click(balloon);
assert.equal(run('gameState.inventory.itemIds.length'),0);
run('gameState.carouselSolved=true');
run('player.x=city.spawn.x*settings.worldScale;player.y=city.spawn.y*settings.worldScale;updateCamera()');
click(balloon);assert.equal(run('gameState.inventory.itemIds.length'),0);
for (const zoom of [1,1.5,3]) {
  run(`settings.cameraZoom=${zoom};gameState.inventory.itemIds=[];gameState.acquiredItems={};gameState.playgroundMemoPending=false;gameState.playgroundMemoViewed=false;gameState.achievementConditions={}`);
  approach();click(balloon,2);assert.equal(run('gameState.inventory.itemIds.length'),0);
  click(balloon);
  assert.equal(run('inspectionUiState.mode'),'playgroundMemo');
  assert.deepEqual(read('gameState.inventory.itemIds'),[ids.balloon]);
  assert.equal(run('gameState.playgroundMemoPending'),true);
  assert.equal(run('gameState.playgroundMemoViewed'),true);
  assert.equal(elements['playground-memo'].hidden,false);
  assert.equal(elements['memo-swing'].textContent,run('PARK_DATA.text.swing'));
  assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}] === true`),false);
  const before = read('({x:player.x,y:player.y})');
  run("pressedKeys.add('ArrowUp');update(0.3);toggleInventory()");click(balloon);
  assert.deepEqual(read('({x:player.x,y:player.y})'),before);
  assert.equal(run('inventoryUiState.open'),false);
  close();close();
  assert.equal(run('gameState.playgroundMemoPending'),false);
  assert.deepEqual(read('gameState.inventory.itemIds'),[ids.balloon,ids.memo]);
  click(balloon);
  assert.equal(run('inspectionUiState.mode'),null);
  run('toggleInventory()');
  elements['inventory-list'].children.find(button=>button.dataset.itemId===ids.memo).handlers.click();
  assert.equal(run('inspectionUiState.mode'),'playgroundMemo');
  assert.equal(elements['inspection-title'].textContent,run('ITEM_DATA.find(item=>item.id===PARK_DATA.memoId).name'));
  close();assert.equal(run('inventoryUiState.open'),true);
  elements['inventory-list'].children.find(button=>button.dataset.itemId===ids.memo).handlers.click();
  run('toggleInventory()');
  assert.equal(run('inspectionUiState.mode'),null);
  assert.equal(run('inventoryUiState.open'),false);
  run('acquireItem(PARK_DATA.headbandId)');
  assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}]`),true);
}
// 지급 대기 상태가 복원되어도 메모를 다시 보여주고 닫을 때 지급할 수 있다.
run('gameState.inventory.itemIds=[PARK_DATA.balloonId];gameState.acquiredItems={[PARK_DATA.balloonId]:true};gameState.playgroundMemoPending=true;gameState.playgroundMemoViewed=false;gameState.achievementConditions={};toggleInventory()');
assert.equal(run('inspectionUiState.mode'),'playgroundMemo');close();
assert.ok(read('gameState.inventory.itemIds').includes(ids.memo));
assert.equal(run('gameState.playgroundMemoPending'),false);
// 다른 순서로 조건이 채워져도 세 조건이 모두 필요하다.
run('gameState.carouselSolved=false;gameState.playgroundMemoViewed=false;acquireItem(PARK_DATA.headbandId);updateAchievementConditions()');
assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}] === true`),false);
run('gameState.carouselSolved=true;updateAchievementConditions()');
assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}] === true`),false);
run('toggleInventory()');elements['inventory-list'].children.find(button=>button.dataset.itemId===ids.memo).handlers.click();
assert.equal(run(`gameState.achievementConditions[${JSON.stringify(achievement.id)}]`),true);
console.log('통과: 정답·거리 제한, 풍선→메모 열기→닫을 때 지급, 연속 클릭·중복 닫기, 지급 대기 복원, 확대 재열기·I 닫기, 업적 세 조건·순서 독립');

