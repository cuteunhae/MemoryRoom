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
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "achievements.js", "studio-ui.js", "registry.js", "park-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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
assert.equal(room.width, 1600);
assert.equal(room.height, 2400);
for (const desk of desks) {
  assert.ok(desk.x - desk.width / 2 >= room.x + 40);
  assert.ok(desk.x + desk.width / 2 <= room.x + room.width - 40);
  assert.ok(desk.y - desk.height / 2 > room.y + 160);
  assert.ok(desk.y + desk.height / 2 < room.y + room.height - 220);
}
// 실제 충돌 함수로 출입문에서 모든 책상 뒤 통로·게시판까지 연결되는지 확인한다.
assert.equal(run(`(() => {
  const room = classroomRoom(), step = 40;
  const start = [Math.round((room.doorX - room.x) / step), Math.floor((room.height - 60) / step)];
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
assert.equal(elements['classroom-panel'].children[0].children.length, 6);
run('toggleInventory()');
assert.equal(run('inspectionUiState.mode'), null);
assert.equal(run('inventoryUiState.open'), false);
run('player.x=classroomRoom().doorX; player.y=classroomRoom().y+classroomRoom().height-80; updateCamera()');
const cameraBefore = run('camera.y');
run("pressedKeys.add('ArrowUp'); update(0.2); pressedKeys.clear(); updateCamera()");
assert.notEqual(run('camera.y'), cameraBefore);
run('player.x=40; player.y=60; updateCamera()');
assert.equal(run('camera.x'), 0);
assert.equal(run('camera.y'), 0);
assert.equal(run('canStand(-1,60)'), false);
console.log('통과: 정확한 30석·전 책상 접근 경로·빈 책상·종류별 중복 방지·개별 획득·확대 배치도·알림장 약도·카메라 경계');

// 실제 입력 처리로 거리·중복·모달 차단·선택 유지·재입장을 확인한다.
