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
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "studio-ui.js", "registry.js", "park-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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
// 실제 보행 판정으로 쪽문에서 안방·부엌·인형까지 도달하고 아이 방은 막히는지 확인한다.
const reach=read(`(() => {
 const queue=[[600,112]],seen=new Set(['600,112']),step=10;
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
  const x=queue[i][0]+dx,y=queue[i][1]+dy,key=x+','+y;
  if(seen.has(key)||!canStand(x,y-player.footOffset))continue;
  seen.add(key);queue.push([x,y]);
 }
 const near=(x,y)=>queue.some(([qx,qy])=>Math.hypot(qx-x,qy-y)<16);
 return { dolls:HOUSE_DATA.dolls.every(doll=>near(doll.x,doll.y+doll.height/2+30)),kitchen:near(1000,450),child:near(600,760) };
})()`);
assert.equal(reach.dolls,true);assert.equal(reach.kitchen,true);assert.equal(reach.child,false);
run(`player.x=${door.x};player.y=${door.y-60}-player.footOffset;updateCamera()`);advance();click(door);
assert.equal(run('gameState.childRoomUnlocked'),false);
run("pressedKeys.add('ArrowDown');update(1);pressedKeys.clear()");
assert.ok(run('player.y+player.footOffset')<child.y);
for(const doll of dolls) {
 run('player.x=600;player.y=450-player.footOffset;updateCamera()');click(doll);
 assert.equal(run(`gameState.acquiredItems[${JSON.stringify(doll.itemId)}]===true`),false);
 run(`player.x=${doll.x};player.y=${doll.y+doll.height/2+30}-player.footOffset;updateCamera()`);
 assert.ok(run('canStand(player.x,player.y)'));
 click(doll,2);assert.equal(run(`gameState.acquiredItems[${JSON.stringify(doll.itemId)}]===true`),false);
 click(doll);click(doll);
 assert.equal(read('gameState.inventory.itemIds').filter(id=>id===doll.itemId).length,1);
 assert.equal(run(`ITEM_DATA.find(item=>item.id===${JSON.stringify(doll.itemId)}).cabinetUsable`),doll.kind==='bear');
}
assert.equal(run('gameState.inventory.itemIds.length'),5);
assert.equal(run('gameState.childRoomUnlocked'),false);
// 실제 플레이에서는 다음 장식장 단계에서 지급할 열쇠를 검사에서만 주입한다.
run('acquireItem(HOUSE_DATA.keyId);player.x=600;player.y=590-player.footOffset;updateCamera()');
assert.equal(run('gameState.childRoomUnlocked'),false);
click(door);assert.equal(run('gameState.childRoomUnlocked'),true);
run("pressedKeys.add('ArrowDown');update(0.25);pressedKeys.clear()");assert.ok(run('player.y+player.footOffset')>child.y+30);
assert.ok(run('canStand(player.x,player.y)'));
run('player.x=currentInterior().spawn.x;player.y=currentInterior().spawn.footY-player.footOffset;updateCamera()');
advance();click(read('currentInterior().exit'));assert.equal(run('scene.interiorId'),null);
assert.equal(run('player.x'),originalReturn.x);assert.equal(run('player.y'),originalReturn.y);
positionAt(locked);advance();click(locked);assert.equal(run('scene.interiorId'),null);
positionAt(side);advance();click(side);assert.equal(run('gameState.childRoomUnlocked'),true);
assert.equal(run('gameState.inventory.itemIds.length'),6);
console.log('통과: 정문 잠금·무조건 쪽문 출입·퇴장 복귀, 안방/부엌/인형 접근, 5개 고유 ID·중복 방지·오답 인형 장식장 불가, 열쇠 없이 아이 방 차단·열쇠 클릭 개방·재방문 유지');

