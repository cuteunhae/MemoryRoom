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
  assert.equal(run(`canStand(${x} * schoolFloor().scale, ${y} * schoolFloor().scale - player.footOffset)`), false, name);
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
// 문 가까이에 가면 E 키·클릭 안내가 나오고, 열린 문 앞에서는 닫기 안내로 바뀐다.
assert.equal(run('schoolDoorHint()'), 'E 키를 누르거나 문을 클릭해 열기');
run('currentBindings().interact = null'); assert.equal(run('schoolDoorHint()'), '문을 클릭해 열기'); run('currentBindings().interact = "KeyE"');
pressKey('KeyE'); assert.equal(run('schoolDoorHint()'), 'E 키를 누르거나 문을 클릭해 닫기'); pressKey('KeyE');
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
assert.equal(run('schoolDoorHint()'), '', '문에서 멀리 있는데 안내가 나옵니다.');
// 시작 위치는 출구 앞이라 E 키로 나가진다. 출구·문·선생님에서 모두 먼 로비에서 검사한다.
run('player.x = 443 * schoolFloor().scale; player.y = 600 * schoolFloor().scale - player.footOffset; updateCamera()');
pressKey('KeyE'); assert.equal(run('schoolDoorUi.open.size'), 1); assert.equal(run('scene.interiorId'), run('SCHOOL_DATA.placeId'));
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
    // 안내도 그림과 함께, 같은 내용을 글로도 넣어 둔다.
    assert.equal(elements['school-board-panel'].hidden, false);
    assert.ok(elements['school-board-map'].attributes['aria-label'].includes(floor.name));
    for (const room of floor.rooms) assert.ok(elements['school-board-map'].attributes['aria-label'].includes(room.name));
  }
  const before = run('player.y');
  run("pressedKeys.add('ArrowUp'); update(1)");
  assert.equal(run('player.y'), before);
  elements['inspection-close'].handlers.click();
}
// 친구는 2층에만 보이고, 앞에 서서 대화한 뒤에도 이동 경로를 유지한다.
run('scene.schoolFloor = 2');
const friend = read('SCHOOL_DATA.objects.find(object => object.id === "school-friend")');
run(`player.x = ${friend.x}; player.y = ${friend.y + friend.height / 2 + 45} - player.footOffset; updateCamera()`);
assert.ok(run('canStand(player.x, player.y)'));
click(friend);
assert.equal(run('inspectionUiState.mode'), 'dialogue');
assert.equal(elements['inspection-message'].textContent, friend.messages.dialogue);
elements['inspection-close'].handlers.click();
pressKey('KeyE');
assert.equal(run('inspectionUiState.mode'), 'dialogue');
elements['inspection-close'].handlers.click();
run('scene.schoolFloor = 1');
assert.equal(run('inspectionObjectsFor(currentInterior()).some(object => object.id === "school-friend")'), false);
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
    // 계단 가까이에 서면 이동 안내가 나온다.
    assert.equal(run('schoolStairsHint()'), run(floorNumber === 1 ? 'SCHOOL_DATA.text.stairsUpKeyHint' : 'SCHOOL_DATA.text.stairsDownKeyHint').replace('{key}', 'E'));
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
// 선생님 가까이에서는 키 안내가 나오고, 상호작용 키로 대화가 열린다. 멀어지면 안내가 없다.
run('closeInspection&&inspectionUiState.mode&&closeInspection();scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=1;finishMapTransition()');
const teacherObject=read('SCHOOL_DATA.objects.find(object=>object.id==="school-teacher")');
run(`player.x=${teacherObject.x};player.y=${teacherObject.y+teacherObject.height/2+40}-player.footOffset;updateCamera()`);
assert.ok(run('canStand(player.x,player.y)'));
assert.equal(run('keyObjectHint()'),'E 키 또는 클릭해 대화하기');
assert.equal(run('interactNearbyObject()'),true);assert.equal(run('inspectionUiState.mode'),'dialogue');run('closeInspection()');
run('player.x=schoolStairs().arrival.x;player.y=schoolStairs().arrival.footY-player.footOffset');
assert.equal(run('keyObjectHint()'),'');
// E 키로 계단을 오르내린다. 층을 옮긴 직후 연속 입력으로는 되돌아가지 않고, 키가 할당 없음이면 클릭 안내만 나온다.
run('scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=1;schoolDoorUi.open.clear();finishMapTransition();player.x=schoolStairs().arrival.x;player.y=schoolStairs().arrival.footY-player.footOffset;updateCamera()');
advance();assert.equal(run('schoolKeyHint()'),'E 키를 누르거나 계단을 클릭해 2층으로 올라가기');
run('currentBindings().interact=null');assert.equal(run('schoolKeyHint()'),run('SCHOOL_DATA.text.stairsUpHint'));run('currentBindings().interact="KeyE"');
pressKey('KeyE');assert.equal(run('scene.schoolFloor'),2);assert.ok(run('canStand(player.x,player.y)'));
pressKey('KeyE');assert.equal(run('scene.schoolFloor'),2,'층을 옮긴 직후 되돌아갔습니다.');
advance();assert.equal(run('schoolKeyHint()'),'E 키를 누르거나 계단을 클릭해 1층으로 내려가기');
pressKey('KeyE');assert.equal(run('scene.schoolFloor'),1);advance();
// 계단 옆 문 앞에서는 더 가까운 문이 먼저 반응한다.
run('scene.schoolFloor=2;finishMapTransition()');advance();
const nearStairsDoor=read('[...schoolFloor().doors].sort((a,b)=>Math.hypot(a.openingRect.x-schoolStairs().x,a.openingRect.y-schoolStairs().y)-Math.hypot(b.openingRect.x-schoolStairs().x,b.openingRect.y-schoolStairs().y))[0]');
run(`player.x=${nearStairsDoor.openingRect.x};player.y=${nearStairsDoor.openingRect.y}-player.footOffset;updateCamera()`);
assert.equal(run('schoolKeyTarget().id'),nearStairsDoor.id);
assert.equal(run('schoolKeyHint()'),'E 키를 누르거나 문을 클릭해 열기');
pressKey('KeyE');assert.equal(run('scene.schoolFloor'),2);assert.equal(run(`schoolDoorUi.open.has(${JSON.stringify(nearStairsDoor.id)})`),true);
// 학교에서만 플레이어를 1.5배로 그린다. 선생님 그림은 클릭 범위 안에 있다.
assert.ok(Math.abs(run('playerDrawScale()') - 2.295) < 1e-10);
run('scene.interiorId=null');assert.equal(run('playerDrawScale()'),1.53);run('scene.interiorId="C01"');assert.equal(run('playerDrawScale()'),1.53);run('scene.interiorId=SCHOOL_DATA.placeId');
assert.deepEqual(read('SCHOOL_DATA.objects.find(object=>object.id==="school-teacher").sprite'),{src:'assets/npc-teacher.png',width:90,height:162});
assert.ok(run('(() => { const t = SCHOOL_DATA.objects.find(object=>object.id==="school-teacher"); return t.height >= 160 && t.width >= 70; })()'));
assert.equal(run('settings.cameraZoom'), run('settings.baseCameraZoom * 0.8'));
run('scene.interiorId=null');
assert.equal(run('settings.cameraZoom'), run('settings.baseCameraZoom'));
run('scene.interiorId=SCHOOL_DATA.placeId');
// 벤치 앞에 서서 게시판과 벤치 어느 쪽을 클릭해도 반 배치 게시판이 열린다.
run('if (inspectionUiState.mode) closeInspection(); scene.interiorId=SCHOOL_DATA.placeId; scene.schoolFloor=1; finishMapTransition()');
{
  const scale = run('schoolFloor().scale');
  run(`player.x = ${226 * scale}; player.y = ${626 * scale} - player.footOffset; updateCamera()`);
  assert.ok(run('canStand(player.x, player.y)'), '벤치 앞에 설 수 없습니다.');
  for (const [name, px, py] of [['게시판', 226, 505], ['벤치', 226, 600]]) {
    advance(); click({ x: px * scale, y: py * scale });
    assert.equal(run('inspectionUiState.mode'), 'board', name + ' 클릭으로 열리지 않았습니다.');
    run('closeInspection()');
  }
}
// 키 안내는 플레이어가 아니라 대상 위에 나온다. 게시판은 E 키로 열고 닫는다. 선생님과 함께 가까우면 더 가까운 쪽이다.
{
  const anchor = () => read('(() => { const hint = currentKeyHint(); return hint && { text: hint.text, x: hint.x, y: hint.y, center: !!hint.center }; })()');
  const boardObject = read('SCHOOL_DATA.objects.find(object => object.type === "board")');
  const teacherNow = read('SCHOOL_DATA.objects.find(object => object.id === "school-teacher")');
  const scale = run('schoolFloor().scale');
  run(`scene.schoolFloor = 1; finishMapTransition(); player.x = ${226 * scale}; player.y = ${626 * scale} - player.footOffset; updateCamera()`);
  // 게시판은 벤치를 뺀 게시판 그림의 한가운데다.
  assert.deepEqual(anchor(), { text: 'E 키를 누르거나 클릭해 안내도 보기', x: boardObject.pictureRect.x, y: boardObject.pictureRect.y, center: true });
  run('currentBindings().interact = null'); assert.equal(anchor().text, '클릭해 안내도 보기'); run('currentBindings().interact = "KeyE"');
  advance(); pressKey('KeyE'); assert.equal(run('inspectionUiState.mode'), 'board');
  assert.equal(elements['inspection-close'].textContent, '닫기 ');
  pressKey('KeyE'); assert.equal(run('inspectionUiState.mode'), null);
  run(`player.x = ${teacherNow.x}; player.y = ${teacherNow.y + teacherNow.height / 2 + 40} - player.footOffset; updateCamera()`);
  assert.deepEqual(anchor(), { text: 'E 키 또는 클릭해 대화하기', x: teacherNow.x, y: teacherNow.y + teacherNow.height / 2 - teacherNow.sprite.height, center: false });
  // 문과 계단은 한가운데다.
  const officeDoor = read('schoolFloor().doors[0]');
  run(`player.x = ${officeDoor.openingRect.x}; player.y = ${officeDoor.openingRect.y + officeDoor.openingRect.height / 2 + 30} - player.footOffset; updateCamera()`);
  assert.deepEqual(anchor(), { text: 'E 키를 누르거나 문을 클릭해 열기', x: officeDoor.pictureRect.x, y: officeDoor.pictureRect.y, center: true });
  run('player.x = schoolStairs().arrival.x; player.y = schoolStairs().arrival.footY - player.footOffset; updateCamera()');
  const stairsNow = read('schoolStairs()');
  assert.deepEqual(anchor(), { text: 'E 키를 누르거나 계단을 클릭해 2층으로 올라가기', x: stairsNow.x, y: stairsNow.y, center: true });
}
// 교무실: 탁자와 책상 사이로 왼쪽 끝까지 걸어가고, 왼쪽 세로 통로를 따라 위로 올라갈 수 있다.
{
  run('scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=1;schoolDoorUi.open.add("door-office");finishMapTransition()');
  const scale = run('schoolFloor().scale');
  run(`player.x = ${230 * scale}; player.y = ${356 * scale} - player.footOffset; pressedKeys.clear(); pressedKeys.add('ArrowLeft'); update(1); pressedKeys.clear()`);
  assert.ok(run('player.x') / scale < 80, '탁자와 책상 사이로 지나가지 못했습니다: ' + run('player.x') / scale);
  run(`player.x = ${118 * scale}; player.y = ${356 * scale} - player.footOffset; pressedKeys.add('ArrowUp'); update(0.5); pressedKeys.clear()`);
  assert.ok((run('player.y') + run('player.footOffset')) / scale < 280, '왼쪽 세로 통로로 올라가지 못했습니다.');
  // 탁자와 책상 자체는 계속 막혀 있다.
  assert.equal(run(`canStand(${130 * scale}, ${385 * scale} - player.footOffset)`), false);
  assert.equal(run(`canStand(${220 * scale}, ${310 * scale} - player.footOffset)`), false);
  run('schoolDoorUi.open.clear()');
}
// 2층에는 1~9반 번호 표지가 모두 있고, 표지는 복도 바닥 위에 있으며 서로 겹치지 않는다. 1층에는 없다.
{
  run('scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=2;finishMapTransition()');
  const plates = read('schoolDoorPlates()');
  assert.deepEqual(plates.map(plate => plate.text).sort(), ['1반', '2반', '3반', '4반', '5반', '6반', '7반', '8반', '9반']);
  const corridor = read('schoolFloor().walkableRects[0]');
  for (const plate of plates) assert.ok(Math.abs(plate.y - corridor.y) + plate.height / 2 <= corridor.height / 2 + 1, plate.text + ' 표지가 복도 밖에 있습니다.');
  for (const a of plates) for (const b of plates) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= a.width || Math.abs(a.y - b.y) >= a.height, a.text + '·' + b.text + ' 표지가 겹칩니다.');
  run('scene.schoolFloor=1;finishMapTransition()');
  assert.equal(run('schoolDoorPlates().length'), 0);
}
// 문을 열 때 덮는 범위는 문 그림과 문 틈 전체를 포함하고 그림 안에 있다. 클릭 범위는 그대로다.
for (const floorIndex of [0, 1]) {
  for (const door of read(`SCHOOL_DATA.floors[${floorIndex}].doors.map(door => ({ id: door.id, picture: door.picture, opening: door.opening, overlay: schoolDoorOverlay(door) }))`)) {
    assert.ok(door.overlay.left < door.picture.left && door.overlay.right > door.picture.right && door.overlay.top < door.picture.top && door.overlay.bottom > door.picture.bottom, door.id);
    assert.ok(door.overlay.left <= door.opening.left && door.overlay.right >= door.opening.right && door.overlay.bottom >= door.opening.bottom, door.id + ' 문 틈이 덮는 범위 밖에 있습니다.');
    assert.ok(door.overlay.left >= 0 && door.overlay.right <= 887 && door.overlay.top >= 0 && door.overlay.bottom <= 1774, door.id);
  }
}
console.log('통과: 그림 기준 문 닫힘 차단·문 가까이 안내 문구·E/클릭 열고 닫기·문 틈 닫기 방지·퇴장 시 닫힘, 문을 열면 모든 방·정문 도달, 벽/가구 충돌, 게시판·확정 대사·입력 차단, 줌별 계단 왕복·연속 클릭 방지, 2층 퇴장 차단, 입구 복귀');

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
