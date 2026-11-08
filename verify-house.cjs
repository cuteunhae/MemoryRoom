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

const doors=read('outdoorDoors().filter(door=>door.placeId===HOUSE_DATA.placeId)');
const locked=doors.find(door=>door.kind==='locked'), side=doors.find(door=>door.kind==='side');
positionAt(locked);advance();click(locked);assert.equal(run('scene.interiorId'),null);
positionAt(side);advance();click(side);assert.equal(run('scene.interiorId'),side.placeId);
assert.equal(run('gameState.inventory.itemIds.length'),0);
const originalReturn=read('scene.returnPoint');
const dolls=read('HOUSE_DATA.dolls');
assert.equal(new Set(dolls.map(doll=>doll.id)).size,5);
assert.equal(new Set(dolls.map(doll=>doll.itemId)).size,5);
const child=read('HOUSE_DATA.rooms.find(room=>room.id==="child")');
const door=read('houseDoor(HOUSE_DATA.rooms.find(room=>room.id==="child"))');
// 실제 보행 판정으로 쪽문에서 마루·복도·안방·부엌까지 도달하고 인형에 손이 닿으며, 아이 방은 막히는지 확인한다.
// 안방 문은 닫혀 있으면 막히고, 열면 지나갈 수 있다.
const walkable=open=>read(`(() => {
 houseDoorUi.bedroomOpen=${open};
 const start=currentInterior().spawn,queue=[[start.x,start.footY]],seen=new Set([start.x+','+start.footY]),step=10;
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
  const x=queue[i][0]+dx,y=queue[i][1]+dy,key=x+','+y;
  if(seen.has(key)||!canStand(x,y-player.footOffset))continue;
  seen.add(key);queue.push([x,y]);
 }
 const near=(x,y)=>queue.some(([qx,qy])=>Math.hypot(qx-x,qy-y)<16);
 return { dolls:HOUSE_DATA.dolls.every(doll=>queue.some(([qx,qy])=>qx>945&&qy<497&&Math.hypot(Math.max(0,Math.abs(qx-doll.x)-doll.width/2),Math.max(0,Math.abs(qy-doll.y)-doll.height/2))<=HOUSE_DATA.interactDistance)),bedroom:near(1080,420),corridor:near(375,300),kitchen:near(680,280),child:near(150,420) };
})()`);
const closedReach=walkable(false);
assert.equal(closedReach.bedroom,false,'닫힌 안방 문을 통과합니다.');assert.equal(closedReach.corridor,true);
const reach=walkable(true);
assert.equal(reach.dolls,true);assert.equal(reach.bedroom,true);assert.equal(reach.corridor,true);assert.equal(reach.kitchen,true);assert.equal(reach.child,false);
run(`player.x=${door.x};player.y=${door.y+60}-player.footOffset;updateCamera()`);advance();click(door);
assert.equal(run('gameState.childRoomUnlocked'),false);
run("pressedKeys.add('ArrowUp');update(1);pressedKeys.clear()");
assert.ok(run('player.y+player.footOffset')>child.y+child.height);
for(const doll of dolls) {
 run('player.x=600;player.y=450-player.footOffset;updateCamera()');click(doll);
 assert.equal(run(`gameState.acquiredItems[${JSON.stringify(doll.itemId)}]===true`),false);
 run(`player.x=${doll.x};player.y=390-player.footOffset;updateCamera()`);
 assert.ok(run('canStand(player.x,player.y)'));
 click(doll,2);assert.equal(run(`gameState.acquiredItems[${JSON.stringify(doll.itemId)}]===true`),false);
 click(doll);click(doll);
 assert.equal(read('gameState.inventory.itemIds').filter(id=>id===doll.itemId).length,1);
 assert.equal(run(`ITEM_DATA.find(item=>item.id===${JSON.stringify(doll.itemId)}).cabinetUsable`),doll.kind==='bear');
}
assert.equal(run('gameState.inventory.itemIds.length'),5);
assert.equal(run('gameState.childRoomUnlocked'),false);
// 실제 플레이에서는 다음 장식장 단계에서 지급할 열쇠를 검사에서만 주입한다.
run(`acquireItem(HOUSE_DATA.keyId);player.x=${door.x};player.y=${door.y+70}-player.footOffset;updateCamera()`);
assert.equal(run('gameState.childRoomUnlocked'),false);
click(door);assert.equal(run('gameState.childRoomUnlocked'),true);
run("pressedKeys.add('ArrowUp');update(0.25);pressedKeys.clear()");assert.ok(run('player.y+player.footOffset')<child.y+child.height);
assert.ok(run('canStand(player.x,player.y)'));
run('player.x=currentInterior().spawn.x;player.y=currentInterior().spawn.footY-player.footOffset;updateCamera()');
advance();click(read('currentInterior().exit'));assert.equal(run('scene.interiorId'),null);
assert.equal(run('player.x'),originalReturn.x);assert.equal(run('player.y'),originalReturn.y);
positionAt(locked);advance();click(locked);assert.equal(run('scene.interiorId'),null);
positionAt(side);advance();click(side);assert.equal(run('gameState.childRoomUnlocked'),true);
assert.equal(run('gameState.inventory.itemIds.length'),6);
// 쪽문으로 들어오면 복도 끝 문 앞에 서고, 그 문으로 나간다. 아래쪽 현관에서는 나갈 수 없다. 안방은 통로로 걸어 들어간다.
{
  const outside = read('outdoorDoors().find(door => door.placeId === HOUSE_DATA.placeId && door.kind === "side")');
  run(`scene.interiorId = null; scene.returnPoint = null; finishMapTransition(); player.x = ${outside.approach.x}; player.y = ${outside.approach.footY} - player.footOffset; updateCamera()`);
  advance(); click(outside);
  assert.equal(run('scene.interiorId'), run('HOUSE_DATA.placeId'));
  assert.equal(run('player.x'), 376);
  assert.equal(run('player.y + player.footOffset'), 262);
  assert.equal(run('nearInteriorExit(currentInterior())'), true);
  run('player.x = 620; player.y = 1110 - player.footOffset; updateCamera()');
  assert.ok(run('canStand(player.x, player.y)'));
  assert.equal(run('nearInteriorExit(currentInterior())'), false, '현관에서 나가기가 됩니다.');
  // 닫힌 안방 문: 막히고, 안내가 나오며, E 키로 열면 들어가고, 문 틈에서는 닫히지 않으며, 집을 나가면 다시 닫힌다.
  const pressE = () => { for (const fn of windowHandlers.keydown) fn({ code: 'KeyE', key: 'e', preventDefault() {} }); };
  run('houseDoorUi.bedroomOpen = false; player.x = 985; player.y = 560 - player.footOffset; updateCamera()');
  run("pressedKeys.clear(); pressedKeys.add('ArrowUp'); update(0.2); pressedKeys.clear()");
  assert.ok(run('player.y + player.footOffset') > 515, '닫힌 안방 문을 지나갔습니다.');
  assert.deepEqual(read('(() => { const hint = currentKeyHint(); return { text: hint.text, x: hint.x, y: hint.y }; })()'), { text: 'E 키를 누르거나 문을 클릭해 열기', x: 985, y: 465 });
  run('currentBindings().interact = null'); assert.equal(run('houseBedroomDoorHint()'), '문을 클릭해 열기'); run('currentBindings().interact = "KeyE"');
  pressE(); assert.equal(run('houseDoorUi.bedroomOpen'), true);
  assert.equal(run('currentKeyHint().text'), 'E 키를 누르거나 문을 클릭해 닫기');
  run('player.y = 509 - player.footOffset'); pressE();
  assert.equal(run('houseDoorUi.bedroomOpen'), true, '문 틈에 서 있는데 닫혔습니다.');
  run('player.y = 545 - player.footOffset; updateCamera()');
  advance(); click({ x: 985, y: 465 }); assert.equal(run('houseDoorUi.bedroomOpen'), false, '클릭으로 닫히지 않았습니다.');
  advance(); click({ x: 985, y: 465 }); assert.equal(run('houseDoorUi.bedroomOpen'), true, '클릭으로 열리지 않았습니다.');
  run("pressedKeys.clear(); pressedKeys.add('ArrowUp'); update(0.2); pressedKeys.clear()");
  assert.ok(run('player.y + player.footOffset') < 497, '열린 안방 문으로 들어가지 못했습니다.');
  run('player.x = 376; player.y = 262 - player.footOffset; updateCamera()');
  advance(); click(read('currentInterior().exit'));
  assert.equal(run('scene.interiorId'), null);
  assert.equal(run('player.x'), outside.approach.x);
  assert.equal(run('houseDoorUi.bedroomOpen'), false, '집을 나가도 안방 문이 열려 있습니다.');
}
// 마루에서 위로 걸어 부엌으로 들어갈 수 있고, 시계·액자 자리도 걸어 다닐 수 있다. 식탁과 싱크대는 막혀 있다.
{
  run(`scene.interiorId = HOUSE_DATA.placeId; finishMapTransition(); player.x = 600; player.y = 500 - player.footOffset; pressedKeys.clear(); pressedKeys.add('ArrowUp'); update(0.4); pressedKeys.clear()`);
  assert.ok(run('player.y + player.footOffset') < 300, '마루에서 부엌으로 들어가지 못했습니다.');
  assert.equal(run('canStand(600, 485 - player.footOffset)'), true);
  assert.equal(run('canStand(770, 230 - player.footOffset)'), false);
  assert.equal(run('canStand(560, 200 - player.footOffset)'), false);
  run('scene.interiorId = null; scene.returnPoint = null; finishMapTransition()');
}
console.log('통과: 정문 잠금·무조건 쪽문 출입·퇴장 복귀, 안방/부엌/인형 접근, 5개 고유 ID·중복 방지·오답 인형 장식장 불가, 열쇠 없이 아이 방 차단·열쇠 클릭 개방·재방문 유지');

