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
for (const file of ["city-data.js", "data/school.js", "school.js", "data/items.js", "data/objects.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "studio-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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

const entrance = read('outdoorDoors().find(door => door.placeId === SCHOOL_DATA.placeId)');
positionAt(entrance); advance(); click(entrance); advance();
const savedReturn = read('scene.returnPoint');
const stairs = read('SCHOOL_DATA.stairs');
click(stairs); assert.equal(run('scene.schoolFloor'), 1);
const board = read('SCHOOL_DATA.objects[0]');
const teacher = read('SCHOOL_DATA.objects[1]');
for (const object of [board, teacher]) {
  run(`player.x = ${object.x}; player.y = ${object.y + 90} - player.footOffset; updateCamera()`);
  click(object);
  assert.equal(run('inspectionUiState.mode'), object.type);
  assert.equal(elements['studio-photo'].hidden, true);
  if (object.type === 'dialogue') assert.equal(elements['inspection-message'].textContent, object.messages.dialogue);
  else for (const floor of read('SCHOOL_DATA.floors')) {
    assert.ok(elements['inspection-message'].textContent.includes(floor.name));
    for (const room of floor.rooms) assert.ok(elements['inspection-message'].textContent.includes(room.name));
  }
  const before = run('player.y');
  run("pressedKeys.add('ArrowUp'); update(1)");
  assert.equal(run('player.y'), before);
  elements['inspection-close'].handlers.click();
}
for (const zoom of [1, 1.5, 3]) {
  run(`settings.cameraZoom = ${zoom}`);
  for (const floorNumber of [1, 2]) {
    assert.equal(run('scene.schoolFloor'), floorNumber);
    for (const room of read('schoolFloor().rooms')) {
      run(`player.x = ${room.doorX}; player.y = 620 - player.footOffset; pressedKeys.add('ArrowUp'); update(0.5); pressedKeys.clear()`);
      assert.ok(run('canStand(player.x, player.y)'));
      assert.ok(run('player.y + player.footOffset') < room.y + room.height - 30, room.name);
      run("pressedKeys.add('ArrowDown'); update(0.5); pressedKeys.clear()");
      assert.ok(run('player.y + player.footOffset') > room.y + room.height + 30);
      run(`player.x = ${room.x + 40}; player.y = 620 - player.footOffset; pressedKeys.add('ArrowUp'); update(1); pressedKeys.clear()`);
      assert.ok(run('player.y + player.footOffset') >= room.y + room.height);
    }
    if (floorNumber === 2) {
      assert.equal(run('currentInterior().exit'), null);
      assert.equal(run('exitInterior()'), false);
      assert.equal(run('inspectionObjectsFor(currentInterior()).length'), 0);
    }
    run('player.x = SCHOOL_DATA.stairs.arrival.x; player.y = SCHOOL_DATA.stairs.arrival.footY - player.footOffset; updateCamera()');
    advance(); click(stairs, 2); assert.equal(run('scene.schoolFloor'), floorNumber);
    click(stairs); assert.equal(run('scene.schoolFloor'), 3 - floorNumber);
    assert.ok(run('canStand(player.x, player.y)'));
    click(stairs); assert.equal(run('scene.schoolFloor'), 3 - floorNumber);
    assert.deepEqual(read('scene.returnPoint'), savedReturn);
  }
}
run('player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()');
advance(); click(read('currentInterior().exit'));
assert.equal(run('scene.interiorId'), null);
assert.equal(run('player.x'), savedReturn.x);
assert.equal(run('player.y'), savedReturn.y);
assert.equal(run('gameState.photoCollected'), false);
assert.equal(run('gameState.inventory.itemIds.length'), 0);
console.log('통과: 단서 없이 모든 방 출입·벽 충돌, 게시판·확정 대사·입력 차단, 줌별 계단 왕복·연속 클릭 방지, 2층 퇴장 차단, 입구 복귀');

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
