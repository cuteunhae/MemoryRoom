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

const expected = [[14,8,23,5,17,29],[3,20,11,25,6,18],[27,12,9,16,21,4],[10,24,30,7,13,26],[19,2,22,1,15,28]];
assert.deepEqual(read('CLASSROOM_DATA.seats'), expected);
const desks = read('classroomObjects().filter(object => object.type === "desk")');
assert.equal(desks.length, 30);
assert.deepEqual(desks.map(desk => desk.number).sort((a,b)=>a-b), Array.from({length:30}, (_,i)=>i+1));
assert.deepEqual(desks.map(desk => desk.number), expected.flat());
run('scene.interiorId = SCHOOL_DATA.placeId; scene.schoolFloor = 2');
const room = read('classroomRoom()');
// 학교 2층 그림의 9반(오른쪽 아래 교실) 크기다. 책상은 문 쪽 게시판과 칠판 사이에 들어간다.
assert.equal(room.width, 630);
assert.equal(room.height, 967.5);
for (const desk of desks) {
  assert.ok(desk.x - desk.width / 2 >= room.x + 20);
  assert.ok(desk.x + desk.width / 2 <= room.x + room.width - 20);
  assert.ok(desk.y - desk.height / 2 > room.y + 100);
  assert.ok(desk.y + desk.height / 2 < room.y + room.height - 100);
}
// 칠판이 아래쪽이므로 1행(14·8·23·5·17·29)은 가장 아래, 1번 책상은 가장 위 행이다.
// 칠판을 바라보는 학생 기준 '왼쪽 쌍'은 화면 오른쪽이다.
const at = n => desks.find(desk => desk.number === n);
assert.ok(at(14).y > at(19).y);
assert.ok(at(14).x > at(29).x);
assert.equal(at(1).y, Math.min(...desks.map(desk => desk.y)));
assert.ok(at(22).x > at(1).x && at(1).x > at(15).x);
// 실제 충돌 함수로 출입문에서 모든 책상 뒤 통로·게시판까지 연결되는지 확인한다.
assert.equal(run(`(() => {
  const room = classroomRoom(), step = 40;
  // 9반 문은 교실 위쪽에 있다. 문 바로 안쪽에서 출발한다.
  const start = [Math.round((schoolFloor().doors.find(door => door.room === CLASSROOM_DATA.roomName).openingRect.x - room.x) / step), 1];
  const queue = [start], seen = new Set([start.join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const [gx, gy] = queue[i];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=gx+dx, ny=gy+dy, key=nx+','+ny;
      const x=room.x+nx*step, footY=room.y+ny*step;
      if (seen.has(key) || x<=room.x || x>=room.x+room.width || footY<=room.y || footY>=room.y+room.height || !canStand(x,footY-player.footOffset)) continue;
      seen.add(key); queue.push([nx,ny]);
    }
  }
  return classroomObjects().every(object => queue.some(([gx,gy]) => {
    const x=room.x+gx*step, y=room.y+gy*step;
    return Math.abs(x-object.x)<40 && y>object.y+object.height/2 && y<object.y+object.height/2+100;
  }));
})()`), true);
function inspect(desk) {
  run(`player.x=${desk.x}; player.y=${desk.y + desk.height/2 + 40}-player.footOffset; updateCamera()`);
  advance(); click(desk);
}
const first = desks.find(desk => desk.number === 1);
inspect(first);
assert.equal(run('gameState.inventory.itemIds.length'), 0);
let buttons = elements['classroom-panel'].children;
assert.equal(buttons.length, 2);
buttons[0].handlers.click();
assert.deepEqual(read('gameState.inventory.itemIds'), ['ITM-02']);
elements['classroom-panel'].children[1].handlers.click();
elements['inspection-close'].handlers.click();
inspect(first);
assert.ok(elements['classroom-panel'].children.every(button => button.disabled));
elements['inspection-close'].handlers.click();
for (const desk of desks.filter(desk => desk.number !== 1)) {
  inspect(desk);
  if (!desk.itemIds.length) assert.equal(elements['inspection-message'].textContent, run('CLASSROOM_DATA.text.empty'));
  else for (const button of elements['classroom-panel'].children) button.handlers.click();
  elements['inspection-close'].handlers.click();
}
assert.equal(run('gameState.inventory.itemIds.length'), 8);
inspect(desks.find(desk=>desk.number===11));
assert.equal(elements['classroom-panel'].children[0].disabled, true);
elements['inspection-close'].handlers.click();
inspect(read('classroomObjects().find(object => object.type === "seating")'));
assert.deepEqual(elements['classroom-panel'].children.slice(0,5).map(row=>row.children.flatMap(pair=>pair.children.map(cell=>Number(cell.textContent)))), expected);
elements['inspection-close'].handlers.click();
run('toggleInventory()');
elements['inventory-list'].children.find(button=>button.dataset.itemId==='ITM-02').handlers.click();
assert.equal(run('inspectionUiState.mode'), 'infirmary');
// 1층에는 교무실·보건실 두 방이 있다.
assert.equal(elements['classroom-panel'].children[0].children.length, 2);
run('toggleInventory()');
assert.equal(run('inspectionUiState.mode'), null);
assert.equal(run('inventoryUiState.open'), false);
run('player.x=classroomRoom().x+classroomRoom().width/2; player.y=classroomRoom().y+classroomRoom().height-80; updateCamera()');
const cameraBefore = run('camera.y');
run("pressedKeys.add('ArrowUp'); update(0.2); pressedKeys.clear(); updateCamera()");
assert.notEqual(run('camera.y'), cameraBefore);
run('player.x=40; player.y=60; updateCamera()');
assert.equal(run('camera.x'), 0);
assert.equal(run('camera.y'), 0);
assert.equal(run('canStand(-1,60)'), false);
// 책상 위에는 번호를 쓰지 않는다. 물건 창 제목에는 번호가 남는다.
assert.ok(read('classroomObjects().filter(object => object.type === "desk")').every(desk => desk.label === '' && desk.name.endsWith(' 책상') || desk.label === '' && /번 책상$/.test(desk.name)));
// 9반이 아닌 8개 교실에도 책상 30개씩 있다. 방 안에 있고 부딪히며, 조사 물체가 아니고, 문에서 가장 먼 책상 옆까지 걸어갈 수 있다.
{
  run('scene.interiorId=SCHOOL_DATA.placeId;scene.schoolFloor=CLASSROOM_DATA.floor;finishMapTransition()');
  const decor = read('classroomDecorDesks().map(({ roomName, x, y, width, height }) => ({ roomName, x, y, width, height }))');
  const rooms = read('schoolFloor().rooms.filter(room => room.name !== CLASSROOM_DATA.roomName)');
  assert.equal(rooms.length, 8);
  assert.equal(decor.length, 240);
  for (const room of rooms) {
    const desks = decor.filter(desk => desk.roomName === room.name);
    assert.equal(desks.length, 30, room.name);
    for (const desk of desks) {
      assert.ok(desk.x - desk.width / 2 >= room.x && desk.x + desk.width / 2 <= room.x + room.width && desk.y - desk.height / 2 >= room.y && desk.y + desk.height / 2 <= room.y + room.height, room.name + ' 책상이 교실 밖에 있습니다.');
      assert.equal(run(`canStand(${desk.x}, ${desk.y} - player.footOffset)`), false, room.name + ' 책상을 통과합니다.');
    }
  }
  assert.equal(run('inspectionObjectsFor(currentInterior()).filter(object => object.type === "desk").length'), 30);
  assert.ok(run(`(() => {
    for (const door of schoolFloor().doors) schoolDoorUi.open.add(door.id);
    const start = schoolStairs().arrival, step = 15, seen = new Set(['0,0']), queue = [[0, 0]];
    for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const gx = queue[i][0] + dx, gy = queue[i][1] + dy, key = gx + ',' + gy;
      if (seen.has(key) || !canStand(start.x + gx * step, start.footY + gy * step - player.footOffset)) continue;
      seen.add(key); queue.push([gx, gy]);
    }
    const ok = classroomDecorDesks().every(desk => queue.some(([gx, gy]) => Math.hypot(start.x + gx * step - desk.x, start.footY + gy * step - desk.y) < 110));
    schoolDoorUi.open.clear();
    return ok;
  })()`), '걸어서 닿지 못하는 책상이 있습니다.');
}
console.log('통과: 정확한 30석·전 책상 접근 경로·빈 책상·종류별 중복 방지·개별 획득·확대 배치도·알림장 약도·카메라 경계');

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
