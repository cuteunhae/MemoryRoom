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


const side=read('outdoorDoors().find(d=>d.placeId===HOUSE_DATA.placeId&&d.kind==="side")');
positionAt(side);advance();click(side);advance();
const door=read('houseDoor(HOUSE_DATA.rooms.find(r=>r.id==="child"))');
const book=read('DIARY_DATA.book');
// 기획서의 확정 문장을 그대로 사용하는지 검사한다.
const specification=fs.readFileSync(path.join(__dirname,'도시속빛나는존재기획서.txt'),'utf8');
for(const [index,page] of read('DIARY_DATA.pages').entries()) {
  const line=specification.split(/\r?\n/).find(line=>line.startsWith(`- [${index+1}페이지]: `));
  assert.equal(line.split(']: ')[1],page.title ? `${page.title} / ${page.body}` : page.body);
}
run('player.x=600;player.y=590-player.footOffset;updateCamera()');click(door);
assert.equal(run('gameState.childRoomUnlocked'),false);click(book);
assert.equal(run('gameState.diaryDiscovered'),false);assert.equal(run('inspectionUiState.mode'),null);
run('acquireItem(HOUSE_DATA.keyId)');click(door);assert.equal(run('gameState.childRoomUnlocked'),true);
click(book);assert.equal(run('gameState.diaryDiscovered'),false);
run('player.x=620;player.y=785-player.footOffset;updateCamera()');assert.equal(run('canStand(player.x,player.y)'),true);
assert.equal(run('canStand(DIARY_DATA.bed.x,DIARY_DATA.bed.y-player.footOffset)'),false);
click(book,2);assert.equal(run('gameState.diaryDiscovered'),false);
click(book);assert.equal(run('inspectionUiState.mode'),'diary');assert.equal(run('diaryUi.page'),0);
assert.equal(run('gameState.diaryDiscovered'),true);assert.equal(run('gameState.achievementConditions["ACH-06"]'),true);
assert.equal(read('gameState.inventory.itemIds').filter(id=>id==='ITM-10').length,1);
const before=read('({x:player.x,y:player.y})');run('pressedKeys.add("ArrowLeft");update(0.2);pressedKeys.clear()');assert.deepEqual(read('({x:player.x,y:player.y})'),before);
assert.equal(elements['diary-body'].textContent,run('DIARY_DATA.pages[0].body'));
elements['inspection-close'].handlers.click();assert.equal(run('gameState.endingReached'),false);
click(book);elements['diary-next'].onclick();assert.equal(run('diaryUi.page'),1);elements['inspection-close'].handlers.click();assert.equal(run('gameState.endingReached'),false);
run('toggleInventory()');const inventoryButton=elements['inventory-list'].children.find(b=>b.dataset.itemId==='ITM-10');inventoryButton.handlers.click();
assert.equal(run('inspectionUiState.mode'),'diary');assert.equal(run('diaryUi.page'),0);
elements['diary-next'].onclick();elements['diary-next'].onclick();
assert.equal(run('diaryUi.page'),2);assert.equal(elements['diary-next'].hidden,true);assert.equal(run('gameState.endingReached'),false);
assert.equal(elements['diary-body'].textContent,run('DIARY_DATA.pages[2].body'));
elements['inspection-close'].handlers.click();assert.equal(run('gameState.endingReached'),true);assert.equal(run('inspectionUiState.mode'),null);assert.equal(run('inventoryUiState.open'),true);
run('closeInventory()');click(book);assert.equal(run('diaryUi.page'),0);assert.equal(run('gameState.endingReached'),true);
assert.equal(read('gameState.inventory.itemIds').filter(id=>id==='ITM-10').length,1);assert.equal(run('acquireItem(DIARY_DATA.itemId)'),false);
run('closeInspection();toggleInventory()');elements['inventory-list'].children.find(b=>b.dataset.itemId==='ITM-10').handlers.click();
elements['diary-next'].onclick();elements['diary-next'].onclick();run('toggleInventory()');assert.equal(run('inspectionUiState.mode'),null);assert.equal(run('inventoryUiState.open'),false);
console.log('PASS: key gate, bed collision, room-only investigation, discovery/ACH-06, unique inventory item, modal input, reopen page 1, early close, final-page close, inventory viewer');
