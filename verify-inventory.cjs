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
for (const file of ["city-data.js", "data/items.js", "data/objects.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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
  assert.deepEqual(read("gameState.inventory.itemIds"), [album.rewardId]);
}
assert.equal(run("scene.message"), album.messages.alreadyAcquired);
assert.equal(run(`gameState.acquiredItems[${JSON.stringify(album.rewardId)}]`), true);
key("KeyI", "i");
elements["inventory-list"].children[0].handlers.click();
assert.equal(run("gameState.inventory.selectedItemId"), album.rewardId);
assert.equal(elements["inventory-list"].children[0].attributes["aria-pressed"], "true");
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
assert.equal(run('acquireItem("unknown")'), false);
run("ITEM_DATA.forEach(item => acquireItem(item.id))");
assert.equal(run("gameState.inventory.itemIds.length"), 10);
assert.equal(Object.keys(read("gameState.acquiredItems")).length, 10);
key("KeyI", "i");
assert.equal(elements["inventory-list"].children.length, 10);
console.log("통과: 거리·우클릭·중복 획득 제한, 줌별 클릭, 이동·배경 클릭 차단, 선택 강조·유지, 재입장, 아이템 10종");

