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

const entrance = read('outdoorDoors().find(door => door.placeId === SCHOOL_DATA.placeId)');
positionAt(entrance); advance(); click(entrance); advance();
const savedReturn = read('scene.returnPoint');
// 층마다 계단 도착 지점에서 실제 충돌 판정으로 걸어서 닿는 곳을 찾는다(격자 탐색).
// openAll이 true면 그 층의 문을 모두 연 상태로 검사하고, 끝나면 원래대로 닫는다.
const reachable = (floorNumber, openAll) => read(`(() => {
  scene.schoolFloor = ${floorNumber};
  const before = new Set(schoolDoorUi.open);
  if (${openAll}) for (const door of schoolFloor().doors) schoolDoorUi.open.add(door.id);
  const step = 15, start = schoolStairs().arrival, seen = new Set(['0,0']), queue = [[0, 0]];
  const standAt = (gx, gy) => canStand(start.x + gx * step, start.footY + gy * step - player.footOffset);
  for (let i = 0; i < queue.length; i++) {
    const [gx, gy] = queue[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const key = (gx + dx) + ',' + (gy + dy);
      if (seen.has(key) || !standAt(gx + dx, gy + dy)) continue;
      seen.add(key); queue.push([gx + dx, gy + dy]);
    }
  }
  const near = (x, y) => queue.some(([gx, gy]) => Math.hypot(start.x + gx * step - x, start.footY + gy * step - y) < 30);
  // 방 안의 한 곳이라도 걸어서 닿으면 들어갈 수 있는 방이다(가운데는 가구가 있을 수 있다).
  const inside = room => queue.some(([gx, gy]) => { const x = start.x + gx * step, y = start.footY + gy * step; return x > room.x && x < room.x + room.width && y > room.y && y < room.y + room.height; });
  const result = { rooms: schoolFloor().rooms.map(room => [room.name, inside(room)]) };
  if (${floorNumber} === 1) result.exit = near(currentInterior().exit.x, currentInterior().exit.y);
  schoolDoorUi.open = before;
  scene.schoolFloor = 1;
  return result;
})()`);
// 문이 닫혀 있으면 방에 들어갈 수 없고, 문을 열면 단서·아이템 없이 모든 방에 걸어서 닿는다. 정문은 항상 열려 있다.
for (const floorNumber of [1, 2]) {
  const closed = reachable(floorNumber, false);
  for (const [name, ok] of closed.rooms) assert.equal(ok, false, name + ' 문이 닫혀 있는데 들어갈 수 있습니다.');
  const opened = reachable(floorNumber, true);
  for (const [name, ok] of opened.rooms) assert.ok(ok, name + '까지 걸어갈 수 없습니다.');
  if (floorNumber === 1) { assert.ok(closed.exit, '정문까지 걸어갈 수 없습니다.'); assert.ok(opened.exit); }
}
// 벽·가구·바닥 밖에는 설 수 없다(그림 좌표 × 배율).
for (const [floorNumber, x, y, name] of [[1, 200, 210, '교무실 책장'], [1, 443, 200, '계단 위'], [1, 100, 560, '사물함'], [1, 345, 380, '교무실과 계단 사이 벽'], [1, 282, 430, '닫힌 교무실 문'], [2, 150, 318, '1반 앞 벽'], [2, 209, 663, '5반과 6반 사이 벽'], [2, 443, 803, '2층 아래쪽 벽']]) {
  run(`scene.schoolFloor = ${floorNumber}`);
  assert.equal(run(`canStand(${x} * SCHOOL_DATA.scale, ${y} * SCHOOL_DATA.scale - player.footOffset)`), false, name);
}
run('scene.schoolFloor = 1');
// 9반은 그림의 오른쪽 아래 교실이며 책상 통로 폭을 유지한다.
assert.deepEqual(read('({x:classroomRoom().x,y:classroomRoom().y,width:classroomRoom().width,height:classroomRoom().height})'), {x:3141,y:2488.5,width:630,height:967.5});
assert.equal(run('CLASSROOM_DATA.pairAisle'), 80);
assert.equal(run('CLASSROOM_DATA.rowAisle'), 100);
run('player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()');
assert.ok(run('canStand(player.x, player.y)'), '학교 시작 위치에 설 수 없습니다.');
// 문 열기·닫기: 문 앞에서 E 키 또는 문 클릭으로 열고, 다시 누르면 닫힌다. 멀면 클릭해도 열리지 않는다.
const pressKey = code => { for (const fn of windowHandlers.keydown) fn({ code, key: code, preventDefault() {} }); };
const office = read('schoolFloor().doors.find(door => door.id === "door-office")');
const insideDoor = `canStand(${office.openingRect.x}, ${office.openingRect.y} - player.footOffset)`;
run(`player.x = ${office.openingRect.x}; player.y = ${office.openingRect.y + office.openingRect.height / 2 + 30} - player.footOffset; updateCamera()`);
assert.ok(run('canStand(player.x, player.y)'));
assert.equal(run(insideDoor), false, '닫힌 문 틈에 설 수 있습니다.');
pressKey('KeyE'); assert.equal(run('schoolDoorUi.open.has("door-office")'), true); assert.equal(run(insideDoor), true);
pressKey('KeyE'); assert.equal(run('schoolDoorUi.open.has("door-office")'), false);
click(office.pictureRect); assert.equal(run('schoolDoorUi.open.has("door-office")'), true);
click(office.pictureRect); assert.equal(run('schoolDoorUi.open.has("door-office")'), false);
// 문을 연 뒤 문 틈 안에 서 있으면 닫히지 않는다.
pressKey('KeyE'); run(`player.x = ${office.openingRect.x}; player.y = ${office.openingRect.y} - player.footOffset`);
pressKey('KeyE'); assert.equal(run('schoolDoorUi.open.has("door-office")'), true);
// 멀리서 클릭하면 안내만 하고 그대로다. 멀리서 E를 누르면 아무 문도 바뀌지 않는다.
run('player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()');
click(office.pictureRect); assert.equal(run('schoolDoorUi.open.has("door-office")'), true);
pressKey('KeyE'); assert.equal(run('schoolDoorUi.open.size'), 1);
// E 키도 설정에서 바꿀 수 있는 기능이다.
assert.equal(run('currentBindings().interact'), 'KeyE');
const board = read('SCHOOL_DATA.objects[0]');
const teacher = read('SCHOOL_DATA.objects[1]');
for (const object of [board, teacher]) {
  // 물체 바로 아래 바닥에 선다.
  run(`player.x = ${object.x}; player.y = ${object.y + object.height / 2 + 45} - player.footOffset; updateCamera()`);
  assert.ok(run('canStand(player.x, player.y)'), object.name + ' 앞에 설 수 없습니다.');
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
    if (floorNumber === 2) {
      assert.equal(run('currentInterior().exit'), null);
      assert.equal(run('exitInterior()'), false);
      assert.equal(run('inspectionObjectsFor(currentInterior()).filter(object => object.floor === 1).length'), 0);
    }
    const stairs = read('schoolStairs()');
    run('player.x = schoolStairs().arrival.x; player.y = schoolStairs().arrival.footY - player.footOffset; updateCamera()');
    assert.ok(run('canStand(player.x, player.y)'));
    advance(); click(stairs, 2); assert.equal(run('scene.schoolFloor'), floorNumber);
    click(stairs); assert.equal(run('scene.schoolFloor'), 3 - floorNumber);
    assert.ok(run('canStand(player.x, player.y)'));
    // 바로 다시 클릭해도 연속 전환되지 않는다.
    click(read('schoolStairs()')); assert.equal(run('scene.schoolFloor'), 3 - floorNumber);
    assert.deepEqual(read('scene.returnPoint'), savedReturn);
    advance();
  }
}
// 계단에서 멀리 떨어져 클릭하면 이동하지 않고 안내만 한다.
run('player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()');
click(read('schoolStairs()')); assert.equal(run('scene.schoolFloor'), 1);
run('player.x = currentInterior().spawn.x; player.y = currentInterior().spawn.footY - player.footOffset; updateCamera()');
advance(); click(read('currentInterior().exit'));
assert.equal(run('scene.interiorId'), null);
assert.equal(run('schoolDoorUi.open.size'), 0, '학교를 나가도 문이 열려 있습니다.');
assert.equal(run('player.x'), savedReturn.x);
assert.equal(run('player.y'), savedReturn.y);
assert.equal(run('gameState.photoCollected'), false);
assert.equal(run('gameState.inventory.itemIds.length'), 0);
console.log('통과: 그림 기준 문 닫힘 차단·E/클릭 열고 닫기·문 틈 닫기 방지·퇴장 시 닫힘, 문을 열면 모든 방·정문 도달, 벽/가구 충돌, 게시판·확정 대사·입력 차단, 줌별 계단 왕복·연속 클릭 방지, 2층 퇴장 차단, 입구 복귀');

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
