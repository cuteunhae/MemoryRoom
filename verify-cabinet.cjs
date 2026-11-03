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
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "data/hints.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "achievements.js", "studio-ui.js", "registry.js", "park-ui.js", "hints.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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


const side=read('outdoorDoors().find(d=>d.placeId===HOUSE_DATA.placeId&&d.kind==="side")');
positionAt(side);advance();click(side);
const cabinet=read('HOUSE_DATA.cabinet');
run('player.x=600;player.y=550-player.footOffset;updateCamera()');advance();click(cabinet);assert.equal(run('inspectionUiState.mode'),null);
run('player.x=600;player.y=190-player.footOffset;updateCamera()');click(cabinet);
assert.equal(run('inspectionUiState.mode'),'cabinet');assert.equal(run('isGameInputBlocked()'),true);
run('CABINET_DATA.answer.forEach(acquireItem);acquireItem("ITM-02");acquireItem("DOLL-ITEM-02");renderCabinetPanel()');
assert.equal(run('selectCabinetInventory("ITM-02")'),false);
assert.equal(run('selectCabinetInventory("DOLL-ITEM-02")'),false);
const conserved=()=>{const all=read('[...gameState.inventory.itemIds,...gameState.cabinet.slots.filter(Boolean)]');assert.equal(new Set(all).size,all.length);for(const id of read('CABINET_DATA.answer'))assert.ok(all.includes(id));};
run('selectCabinetInventory("ITM-01");clickCabinetSlot(4)');conserved();
assert.equal(run('acquireItem("ITM-01")'),false);
run('selectCabinetInventory("ITM-03");clickCabinetSlot(4)');conserved();assert.ok(read('gameState.inventory.itemIds').includes('ITM-01'));
run('clickCabinetSlot(4);clickCabinetSlot(0)');conserved();assert.equal(run('gameState.cabinet.slots[0]'),'ITM-03');
run('selectCabinetInventory("ITM-01");clickCabinetSlot(4);clickCabinetSlot(0);clickCabinetSlot(4)');conserved();
assert.equal(run('gameState.cabinet.slots[0]'),'ITM-01');assert.equal(run('gameState.cabinet.slots[4]'),'ITM-03');
run('closeInspection();restoreUnsolvedCabinet();restoreUnsolvedCabinet()');conserved();assert.deepEqual(read('gameState.cabinet.slots'),[null,null,null,null,null]);assert.equal(run('gameState.cabinetSolved'),false);
click(cabinet);run('selectCabinetInventory("ITM-07");clickCabinetSlot(0);player.x=currentInterior().spawn.x;player.y=currentInterior().spawn.footY-player.footOffset;exitInterior()');conserved();assert.equal(run('inspectionUiState.mode'),null);assert.ok(read('gameState.cabinet.slots').every(x=>x===null));
positionAt(side);advance();click(side);advance();run('player.x=600;player.y=190-player.footOffset;updateCamera()');click(cabinet);
run('CABINET_DATA.answer.forEach((id,i)=>{selectCabinetInventory(id);clickCabinetSlot(4-i)})');conserved();assert.equal(run('gameState.cabinetSolved'),false);
run('clickCabinetSlot(0);clickCabinetSlot(4);clickCabinetSlot(1);clickCabinetSlot(3)');conserved();
assert.equal(run('gameState.cabinetSolved'),true);assert.equal(run('gameState.cabinetKeyGranted'),true);assert.equal(run('gameState.achievementConditions["ACH-05"]'),true);
assert.deepEqual(read('gameState.cabinet.slots'),read('CABINET_DATA.answer'));
assert.equal(read('gameState.inventory.itemIds').filter(id=>id==='ITM-09').length,1);
assert.equal(run('clickCabinetSlot(0)'),false);assert.equal(run('acquireItem("ITM-09")'),false);
run('closeInspection();restoreUnsolvedCabinet()');click(cabinet);assert.deepEqual(read('gameState.cabinet.slots'),read('CABINET_DATA.answer'));conserved();
run('closeInspection();player.x=600;player.y=590-player.footOffset;updateCamera()');click(read('houseDoor(HOUSE_DATA.rooms.find(r=>r.id==="child"))'));assert.equal(run('gameState.childRoomUnlocked'),true);
console.log('통과: 장식장 거리·입력 차단, 자유 배치·교환·반환, 닫기/퇴장 복구, 아이템 보존·중복 방지, 정답 고정·열쇠 1회·ACH-05·아이 방 개방');
