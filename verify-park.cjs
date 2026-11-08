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

const layout = read('parkLayout()');
const rides = read('carouselRides()');
// 사용자 결정: 회전목마 그림에 맞춰 말 5·마차 3이다.
assert.equal(rides.filter(ride=>ride.type==='horse').length,5);
assert.equal(rides.filter(ride=>ride.type==='carriage').length,3);
assert.deepEqual(read('city.locations.find(place=>place.id===PARK_DATA.placeId)').x,1243);
assert.equal(run('scene.interiorId'),null);
// 실제 충돌 판정으로 입구에서 시설과 관찰 지점까지 갈 수 있는지 검사한다.
assert.equal(run(`(() => {
  const layout=parkLayout(), step=18;
  const start=[0,0], origin={x:layout.gateX,y:layout.bottom-36};
  const queue=[start], seen=new Set(['0,0']);
  for(let i=0;i<queue.length;i++) {
    const [gx,gy]=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=gx+dx,ny=gy+dy,key=nx+','+ny;
      const x=origin.x+nx*step,y=origin.y+ny*step;
      if(seen.has(key)||x<layout.left||x>layout.right||y<layout.top||y>layout.bottom+72||!canStandCity(x,y-player.footOffset))continue;
      seen.add(key);queue.push([nx,ny]);
    }
  }
  const points=[{x:layout.gateX,y:layout.bottom+36},
    {x:layout.ticket.x,y:layout.ticket.y-layout.ticket.height/2-36},
    {x:layout.shop.x,y:layout.shop.y+layout.shop.height/2+36},
    {x:layout.stand.x,y:layout.stand.y+layout.stand.height/2+36}];
  for(let i=0;i<12;i++) points.push({x:layout.center.x+Math.cos(i*Math.PI/6)*360,y:layout.center.y+Math.sin(i*Math.PI/6)*360});
  return points.every(point=>queue.some(([gx,gy])=>Math.hypot(origin.x+gx*step-point.x,origin.y+gy*step-point.y)<30));
})()`),true);
// 사용자 결정: 가림 없이 모든 탈것이 보인다. 가림 함수가 남아 있지 않아야 한다.
assert.equal(run('typeof visibleCarouselRide'),'undefined');
// 위쪽 큰길에서 분홍 길로 걸어 들어오고 나갈 수 있어야 하며, 분홍 길 옆 울타리는 막혀 있어야 한다.
const northGate=read('parkLayout().northGateX'), parkTop=read('parkLayout().top');
run(`player.x=${northGate};player.y=900-player.footOffset;pressedKeys.clear();pressedKeys.add('ArrowDown');update(0.5);pressedKeys.clear()`);
assert.ok(run('player.y+player.footOffset')>parkTop+60,'위쪽 큰길에서 놀이공원으로 들어가지 못했습니다.');
run("pressedKeys.add('ArrowUp');update(0.5);pressedKeys.clear()");
assert.ok(run('player.y+player.footOffset')<parkTop-60,'놀이공원에서 위쪽 큰길로 나가지 못했습니다.');
run(`player.x=${northGate-400};player.y=900-player.footOffset;pressedKeys.add('ArrowDown');update(1);pressedKeys.clear()`);
assert.ok(run('player.y+player.footOffset')<parkTop,'분홍 길이 아닌 곳으로 놀이공원에 들어갔습니다.');
for(const fence of read('parkFences(parkLayout())')) assert.equal(run(`canStandCity(${fence.x},${fence.y}-player.footOffset)`),false);
const standAt = (target,side=1) => run(`player.x=${target.x};player.y=${target.y+side*(target.height/2+36)}-player.footOffset;updateCamera()`);
standAt(layout.ticket,-1);
assert.ok(run('canStand(player.x,player.y)'));
click(layout.ticket,2);assert.equal(run('gameState.inventory.itemIds.length'),0);
click(layout.ticket);click(layout.ticket);
assert.deepEqual(read('gameState.inventory.itemIds'),['ITM-04']);
for(const zoom of [1,1.5,3]) {
 run(`settings.cameraZoom=${zoom}`);standAt(layout.shop);click(layout.shop);
 assert.equal(run('inspectionUiState.mode'),'carousel');
 const before=read('({x:player.x,y:player.y})');
 run("pressedKeys.add('ArrowRight');update(0.2)");
 assert.deepEqual(read('({x:player.x,y:player.y})'),before);
 elements['inspection-close'].handlers.click();
}
standAt(layout.shop);click(layout.shop);
const horses=elements['carousel-horses'],carriages=elements['carousel-carriages'];
const submit=()=>elements['carousel-panel'].handlers.submit({preventDefault(){}});
const message=elements['inspection-message'].textContent;
for(const [h,c] of [['',''],['6','3'],['5','4'],['5x','3'],['5.0','3']]) {
 horses.value=h;carriages.value=c;submit();
 assert.equal(run('gameState.carouselSolved'),false);
 assert.equal(horses.value,h);assert.equal(carriages.value,c);
 assert.equal(elements['inspection-message'].textContent,message);
}
// 관찰 이력이나 머리띠 보유 여부가 정답 처리를 막으면 안 된다.
run('gameState.inventory.itemIds=[];gameState.acquiredItems={}');
horses.value='5';carriages.value='3';submit();submit();
assert.equal(run('gameState.carouselSolved'),true);
assert.equal(run('gameState.inventory.itemIds.length'),0);
elements['inspection-close'].handlers.click();
standAt(layout.stand);click(layout.stand);
assert.equal(run('inspectionUiState.mode'),null);
assert.equal(run('gameState.inventory.itemIds.length'),0);
standAt(layout.shop);click(layout.shop);
assert.equal(elements['carousel-confirm'].disabled,true);
assert.equal(elements['inspection-message'].textContent,run('PARK_DATA.text.solved'));
assert.equal(run('scene.interiorId'),null);
console.log('통과: 아래쪽 정문·위쪽 분홍 길 출입·시설 접근·말 5·마차 3(가림 없음), 머리띠 중복 방지, 오답 유지·정답 선입력·해결 재방문·거치대만 클릭하면 미획득');

