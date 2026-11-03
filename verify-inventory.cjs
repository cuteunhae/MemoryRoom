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

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
const key = (code, key, repeat = false) => {
  for (const handler of windowHandlers.keydown) handler({ code, key, repeat, preventDefault() {} });
};
const album = read("INSPECTION_OBJECTS[0]");
const entrance = read("outdoorDoors().find(door => door.placeId === INSPECTION_OBJECTS[0].placeId)");
positionAt(entrance); advance(); click(entrance); advance();
click(album);
assert.equal(run("gameState.inventory.itemIds.length"), 0);
assert.equal(run("scene.message"), album.messages.tooFar);
run(`player.x = ${album.x}; player.y = ${album.y + 90} - player.footOffset; updateCamera()`);
assert.ok(run("canStand(player.x, player.y)"));
assert.equal(run(`canStand(${album.x}, ${album.y} - player.footOffset)`), false);
click(album, 2);
assert.equal(run("gameState.inventory.itemIds.length"), 0);
key("KeyI", "i");
assert.equal(run("inventoryUiState.open"), true);
click(album);
assert.equal(run("gameState.inventory.itemIds.length"), 0);
const before = read("({x: player.x, y: player.y})");
key("ArrowRight", "ArrowRight");
run("update(0.1)");
assert.deepEqual(read("({x: player.x, y: player.y})"), before);
key("KeyI", "i", true);
assert.equal(run("inventoryUiState.open"), true);
key("KeyI", "i");
for (const zoom of [1, 1.5, 3]) {
  run(`settings.cameraZoom = ${zoom}; updateCamera()`);
  click(album);
  if (!run('gameState.photoCollected')) {
    assert.equal(run('gameState.inventory.itemIds.length'), 0);
    assert.equal(run('inspectionUiState.mode'), 'album');
    const albumBefore = read('({x: player.x, y: player.y})');
    key('ArrowLeft', 'ArrowLeft'); run('update(0.1)');
    assert.deepEqual(read('({x: player.x, y: player.y})'), albumBefore);
    click(album);
    assert.equal(run('gameState.photoCollected'), false);
    elements['studio-photo'].handlers.click();
  }
  assert.equal(run('gameState.photoCollected'), true);
  assert.equal(elements['empty-photo'].hidden, false);
  elements['inspection-close'].handlers.click();
  assert.deepEqual(read("gameState.inventory.itemIds"), [album.rewardId]);
}
assert.equal(run("scene.message"), album.messages.acquired);
assert.equal(run(`gameState.acquiredItems[${JSON.stringify(album.rewardId)}]`), true);
key("KeyI", "i");
elements["inventory-list"].children[0].handlers.click();
assert.equal(run("gameState.inventory.selectedItemId"), album.rewardId);
assert.equal(elements["inventory-list"].children[0].attributes["aria-pressed"], "true");
assert.equal(run('inspectionUiState.mode'), 'photo');
assert.equal(elements['photo-date'].textContent, '2003.09.01');
assert.equal(elements['photo-front'].hidden, false);
elements['studio-photo'].handlers.click();
assert.equal(elements['photo-back'].hidden, false);
elements['studio-photo'].handlers.click();
assert.equal(elements['photo-front'].hidden, false);
elements['studio-photo'].handlers.click();
elements['inspection-close'].handlers.click();
assert.equal(run('inventoryUiState.open'), true);
elements['inventory-list'].children[0].handlers.click();
assert.equal(elements['photo-front'].hidden, false);
key('KeyI', 'i');
assert.equal(run('inspectionUiState.mode'), null);
assert.equal(run('inventoryUiState.open'), false);
key('KeyI', 'i');
elements["inventory-close"].handlers.click();
assert.equal(run("inventoryUiState.open"), false);
assert.equal(run("pressedKeys.size"), 0);
run("player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()");
click(read("currentInterior().exit"));
assert.equal(run("scene.interiorId"), null);
advance(); click(entrance); advance();
run(`player.x = ${album.x}; player.y = ${album.y + 90} - player.footOffset; updateCamera()`);
click(album);
assert.deepEqual(read("gameState.inventory.itemIds"), [album.rewardId]);
assert.equal(run("gameState.inventory.selectedItemId"), album.rewardId);
elements['inspection-close'].handlers.click();
const staff = read('INSPECTION_OBJECTS.find(object => object.type === "dialogue")');
click(staff);
assert.equal(run('inspectionUiState.mode'), null);
run(`player.x = ${staff.x}; player.y = ${staff.y + 100} - player.footOffset; updateCamera()`);
assert.ok(run('canStand(player.x, player.y)'));
click(staff);
assert.equal(elements['inspection-message'].textContent, staff.messages.dialogue);
assert.equal(run('inspectionUiState.mode'), 'dialogue');
const npcBefore = read('({x: player.x, y: player.y})');
key('ArrowRight', 'ArrowRight'); run('update(0.1)');
assert.deepEqual(read('({x: player.x, y: player.y})'), npcBefore);
key('KeyI', 'i');
assert.equal(run('inventoryUiState.open'), false);
click(album);
assert.equal(run('inspectionUiState.mode'), 'dialogue');
elements['inspection-close'].handlers.click();
assert.equal(run('acquireItem("unknown")'), false);
run("ITEM_DATA.forEach(item => acquireItem(item.id))");
assert.equal(run("gameState.inventory.itemIds.length"), 20);
assert.equal(Object.keys(read("gameState.acquiredItems")).length, 20);
key("KeyI", "i");
assert.equal(elements["inventory-list"].children.length, 20);
console.log("통과: 직원 확정 대사·선택적 대화, 사진첩 열기→사진 획득, photoCollected·중복 방지·빈 자리, 날짜·앞뒤 전환·앞면 초기화, 모달 입력 차단·I 닫기, 선택 유지·재입장·아이템 20종");

