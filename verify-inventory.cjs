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
run(`player.x = ${album.x}; player.y = ${album.y - 80} - player.footOffset; updateCamera()`);
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
run(`player.x = ${album.x}; player.y = ${album.y - 80} - player.footOffset; updateCamera()`);
click(album);
assert.deepEqual(read("gameState.inventory.itemIds"), [album.rewardId]);
assert.equal(run("gameState.inventory.selectedItemId"), album.rewardId);
elements['inspection-close'].handlers.click();
const staff = read('INSPECTION_OBJECTS.find(object => object.type === "dialogue")');
// 멀리 있으면 안내가 없고 상호작용 키도 반응하지 않는다.
assert.equal(run('keyObjectHint()'), '');
assert.equal(run('interactNearbyObject()'), false);
click(staff);
assert.equal(run('inspectionUiState.mode'), null);
run(`player.x = ${staff.x}; player.y = ${staff.y + 100} - player.footOffset; updateCamera()`);
assert.ok(run('canStand(player.x, player.y)'));
click(staff);
assert.equal(elements['inspection-message'].textContent, staff.messages.dialogue);
// 가까이 가면 키 안내가 나오고, 상호작용 키로도 대화가 열린다. 키가 할당 없음이면 클릭 안내만 나온다.
run('closeInspection()');
assert.equal(run('keyObjectHint()'), 'E 키를 누르거나 클릭해 대화하기');
// 키 안내는 인물의 머리 바로 위를 가리키고, 화면 가장자리에서는 화면 안으로 밀려 들어온다.
assert.deepEqual(read('(() => { const hint = currentKeyHint(); return { x: hint.x, y: hint.y }; })()'), { x: staff.x, y: staff.y + staff.height / 2 - staff.sprite.height });
assert.ok(run(`(() => { const box = keyHintBox(200, { x: camera.x + 300 / settings.cameraZoom, y: camera.y + 300 / settings.cameraZoom }); return box.y + box.height <= box.anchorY && box.anchorY - (box.y + box.height) <= 20 && box.x <= box.anchorX && box.anchorX <= box.x + box.width; })()`));
// center면 상자 가운데가 그 점에 맞는다.
assert.ok(run(`(() => { const anchor = { x: camera.x + 300 / settings.cameraZoom, y: camera.y + 300 / settings.cameraZoom, center: true }; const box = keyHintBox(200, anchor); return Math.abs(box.x + box.width / 2 - box.anchorX) < 0.001 && Math.abs(box.y + box.height / 2 - box.anchorY) < 0.001; })()`));
assert.equal(run(`keyHintBox(200, { x: camera.x - 500, y: camera.y + 100 }).x`), run('KEY_HINT_BOX.margin'));
assert.equal(run(`(() => { const box = keyHintBox(200, { x: camera.x + 9000, y: camera.y + 100 }); return box.x + box.width; })()`), run('canvas.width - KEY_HINT_BOX.margin'));
run('currentBindings().interact = null');assert.equal(run('keyObjectHint()'), '클릭해 대화하기');run('currentBindings().interact = "KeyE"');
assert.equal(run('interactNearbyObject()'), true);assert.equal(run('inspectionUiState.mode'), 'dialogue');
assert.equal(elements['inspection-message'].textContent, staff.messages.dialogue);
assert.equal(elements['inspection-close'].textContent, '닫기 (E)');
// E 키로 대화창을 닫고 다시 열 수 있다. 키를 누르고 있는 동안(반복 입력)에는 닫히지 않는다.
key('KeyE', 'e', true);assert.equal(run('inspectionUiState.mode'), 'dialogue');
key('KeyE', 'e');assert.equal(run('inspectionUiState.mode'), null);
key('KeyE', 'e');assert.equal(run('inspectionUiState.mode'), 'dialogue');
// 대화창이 아닌 창은 E 키로 닫히지 않고, 닫기 버튼에 키 이름도 없다.
run('closeInspection();openInspection(INSPECTION_OBJECTS[0])');assert.equal(elements['inspection-close'].textContent, '닫기');
key('KeyE', 'e');assert.equal(run('inspectionUiState.mode'), 'album');
run('closeInspection();openInspection(INSPECTION_OBJECTS.find(object => object.type === "dialogue"))');
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
// E 키로 건물에 들어가고 나온다. 입구에서 멀면 반응하지 않고, 잠긴 문은 잠금 안내만 나온다.
run('if (inspectionUiState.mode) closeInspection(); if (inventoryUiState.open) closeInventory(); scene.interiorId = null; scene.returnPoint = null; scene.schoolFloor = 1; finishMapTransition()');
for (const door of read('outdoorDoors()')) {
  run('player.x = city.spawn.x * settings.worldScale; player.y = city.spawn.y * settings.worldScale; updateCamera()');
  advance(); key('KeyE', 'e');
  assert.equal(run('scene.interiorId'), null, '멀리서 E 키로 들어갔습니다.');
  assert.equal(run('entranceKeyHint()'), '');
  run(`player.x = ${door.approach.x}; player.y = ${door.approach.footY} - player.footOffset; player.facing = "up"; updateCamera()`);
  advance();
  if (door.kind === 'locked') {
    assert.equal(run('entranceKeyHint()'), '');
    key('KeyE', 'e');
    assert.equal(run('scene.interiorId'), null);
    assert.equal(run('scene.message'), run('city.interiorUi.locked'));
    continue;
  }
  assert.equal(run('entranceKeyHint()'), 'E키를 클릭해 들어가기');
  // 입구 안내는 그림 속 문 자리에 나오고, 문 앞에 선 플레이어의 머리를 가리지 않는다.
  assert.deepEqual(read('(() => { const hint = currentKeyHint(); return { x: hint.x, y: hint.y, center: hint.center }; })()'), { x: door.hintX, y: door.hintY, center: true });
  assert.ok(run(`(() => { const box = keyHintBox(ctx.measureText(currentKeyHint().text).width, currentKeyHint()); return box.y + box.height <= (player.y + PLAYER_SPRITE.feetOffset - PLAYER_SPRITE.height - camera.y) * settings.cameraZoom; })()`), door.placeId + ' 입구 안내가 플레이어 머리를 가립니다.');
  run('currentBindings().interact = null');assert.equal(run('entranceKeyHint()'), '문을 클릭해 들어가기');run('currentBindings().interact = "KeyE"');
  key('KeyE', 'e');
  assert.equal(run('scene.interiorId'), door.placeId, 'E 키로 들어가지 못했습니다: ' + door.placeId);
  assert.ok(run('canStand(player.x, player.y)'));
  // 들어온 직후 연속 입력으로 바로 나가지 않는다.
  key('KeyE', 'e');assert.equal(run('scene.interiorId'), door.placeId);
  advance();
  assert.equal(run('entranceKeyHint()'), 'E키를 클릭해 나가기');
  // 출구 안내는 출구 한가운데에 나온다.
  assert.equal(run('currentKeyHint().x'), run('currentInterior().exit.x'));
  assert.equal(run('currentKeyHint().y'), run('currentInterior().exit.y'));
  assert.equal(run('currentKeyHint().center'), true);
  key('KeyE', 'e');
  assert.equal(run('scene.interiorId'), null, 'E 키로 나오지 못했습니다: ' + door.placeId);
  assert.equal(run('player.x'), door.approach.x);
  assert.equal(run('player.y'), door.approach.footY - run('player.footOffset'));
}
console.log("통과: 직원 확정 대사·선택적 대화, 사진첩 열기→사진 획득, photoCollected·중복 방지·빈 자리, 날짜·앞뒤 전환·앞면 초기화, 모달 입력 차단·I 닫기, 선택 유지·재입장·아이템 20종");

