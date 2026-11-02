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
for (const file of ["city-data.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "game-state.js", "game.js", "inventory-list.js", "inventory-ui.js", "studio-ui.js", "registry.js", "park-ui.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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

// 실제 이벤트 처리에 CSS 축소 좌표를 전달하고 지워진 픽셀 수를 검사한다.
const cover = elements['registry-cover'];
let captured = null, renderedPixels = null;
cover.getContext = () => ({
  createImageData: (width,height) => ({data:new Uint8ClampedArray(width*height*4)}),
  putImageData: pixels => { renderedPixels = pixels; },
});
cover.getBoundingClientRect = () => ({left:25,top:30,width:300,height:160});
cover.setPointerCapture = id => {captured=id;};
cover.hasPointerCapture = id => captured===id;
cover.releasePointerCapture = () => {captured=null;};
const registry = read('INSPECTION_OBJECTS.find(object=>object.type==="registry")');
run(`scene.interiorId=SCHOOL_DATA.placeId; scene.schoolFloor=1; player.x=${registry.x}; player.y=${registry.y+100}-player.footOffset; updateCamera()`);
assert.ok(run('canStand(player.x,player.y)'));
const pointer = (type,x,y,buttons=1) => cover.handlers[type]({pointerId:1,button:0,buttons,clientX:25+x/2,clientY:30+y/2,preventDefault(){}});
const stroke = (x1,y1,x2,y2) => {pointer('pointerdown',x1,y1);pointer('pointermove',x2,y2);pointer('pointerup',x2,y2,0);};
const open = () => { advance(); click(registry); assert.equal(run('inspectionUiState.mode'),'registry'); };
const close = () => elements['inspection-close'].handlers.click();
open();
stroke(10,30,590,30);
assert.equal(run('registryProgress.erased'),0);
assert.equal(run('gameState.registrySolved'),false);
close();
run('acquireItem(REGISTRY_DATA.requiredItemId)');
open(); stroke(10,30,590,30);
assert.equal(run('registryProgress.erased'),0);
close();
run('selectInventoryItem(REGISTRY_DATA.requiredItemId)');
open();
pointer('pointerdown',20,20);pointer('pointerup',20,20,0);
assert.equal(run('registryProgress.erased'),0);
stroke(10,30,590,30);
const erased=run('registryProgress.erased');
assert.ok(erased>0);
assert.equal(renderedPixels.data.filter((_,i)=>i%4===3 && renderedPixels.data[i]===0).length,erased);
stroke(10,30,590,30);
assert.equal(run('registryProgress.erased'),erased);
close();
assert.equal(run('registryProgress.mask'),null);
open();assert.equal(run('registryProgress.erased'),0);
pointer('pointerdown',10,10);pointer('pointercancel',10,10,0);pointer('pointermove',590,300);
assert.equal(run('registryProgress.erased'),0);
// 명부를 먼저 완료해도 알림장을 나중에 얻으면 업적 조건이 충족된다.
for(let y=30;y<320;y+=50) stroke(5,y,595,y);
assert.equal(run('gameState.registrySolved'),true);
assert.equal(cover.hidden,true);
assert.equal(run('gameState.achievementConditions[ACHIEVEMENT_CONDITIONS[0].id] === true'),false);
close();open();assert.equal(cover.hidden,true);close();
run('acquireItem(ACHIEVEMENT_CONDITIONS[0].items[0])');
assert.equal(run('gameState.achievementConditions[ACHIEVEMENT_CONDITIONS[0].id]'),true);
// 잘못 선택한 물건과 70% 경계, 반대 획득 순서도 확인한다.
run('gameState.registrySolved=false; gameState.achievementConditions={}; selectInventoryItem(ACHIEVEMENT_CONDITIONS[0].items[0])');
open();stroke(5,20,595,20);assert.equal(run('registryProgress.erased'),0);
close();run('selectInventoryItem(REGISTRY_DATA.requiredItemId)');open();
run(`registryProgress.mask.fill(1); registryProgress.mask[0]=0; registryProgress.erased=REGISTRY_DATA.width*REGISTRY_DATA.height*REGISTRY_DATA.solvedRatio-1`);
run('rubRegistry({x:300,y:150},{x:301,y:150})');
assert.equal(run('gameState.registrySolved'),false);
run('rubRegistry({x:0,y:0},{x:1,y:0})');
assert.equal(run('gameState.registrySolved'),true);
assert.equal(run('gameState.achievementConditions[ACHIEVEMENT_CONDITIONS[0].id]'),true);
assert.ok(!JSON.stringify(read('gameState')).includes('mask'));
close();
console.log('통과: 크레파스 보유·선택 제한, 실제 드래그·픽셀 중복 제외·70% 경계, 취소·미완료 초기화·완료 재열기, 순서 독립·업적 조건');

