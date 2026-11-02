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

const layout = read('parkLayout()');
const rides = read('carouselRides()');
assert.equal(rides.filter(ride=>ride.type==='horse').length,6);
assert.equal(rides.filter(ride=>ride.type==='carriage').length,3);
assert.deepEqual(read('city.locations.find(place=>place.id===PARK_DATA.placeId)').x,774);
assert.equal(run('scene.interiorId'),null);
// 실제 충돌 판정으로 입구에서 시설과 관찰 지점까지 갈 수 있는지 검사한다.
assert.equal(run(`(() => {
  const layout=parkLayout(), step=18;
  const start=[0,0], origin={x:layout.left+36,y:layout.gateY};
  const queue=[start], seen=new Set(['0,0']);
  for(let i=0;i<queue.length;i++) {
    const [gx,gy]=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=gx+dx,ny=gy+dy,key=nx+','+ny;
      const x=origin.x+nx*step,y=origin.y+ny*step;
      if(seen.has(key)||x<layout.left-72||x>layout.right||y<layout.top||y>layout.bottom||!canStandCity(x,y-player.footOffset))continue;
      seen.add(key);queue.push([nx,ny]);
    }
  }
  const points=[{x:layout.left-36,y:layout.gateY},
    {x:layout.ticket.x,y:layout.ticket.y-layout.ticket.height/2-36},
    {x:layout.shop.x,y:layout.shop.y+layout.shop.height/2+36},
    {x:layout.stand.x,y:layout.stand.y+layout.stand.height/2+36}];
  for(let i=0;i<12;i++) points.push({x:layout.center.x+Math.cos(i*Math.PI/6)*470,y:layout.center.y+Math.sin(i*Math.PI/6)*470});
  return points.every(point=>queue.some(([gx,gy])=>Math.hypot(origin.x+gx*step-point.x,origin.y+gy*step-point.y)<30));
})()`),true);
// 관찰 가능한 모든 격자 위치에서 전부 보이는 위치가 없어야 한다.
const visibility=read(`(() => {
 const layout=parkLayout(), rides=carouselRides(), seen=new Set(); let maximum=0;
 for(let x=layout.left+30;x<layout.right;x+=45)for(let y=layout.top+30;y<layout.bottom;y+=45){
   if(!canStandCity(x,y-player.footOffset))continue;
   player.x=x;player.y=y-player.footOffset;
   let count=0;rides.forEach((ride,index)=>{if(visibleCarouselRide(ride)){count++;seen.add(index);}});
   maximum=Math.max(maximum,count);
 }
 return {maximum,seen:seen.size};
})()`);
assert.ok(visibility.maximum<9);
assert.equal(visibility.seen,9);
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
for(const [h,c] of [['',''],['5','3'],['6','4'],['6x','3'],['6.0','3']]) {
 horses.value=h;carriages.value=c;submit();
 assert.equal(run('gameState.carouselSolved'),false);
 assert.equal(horses.value,h);assert.equal(carriages.value,c);
 assert.equal(elements['inspection-message'].textContent,message);
}
// 관찰 이력이나 머리띠 보유 여부가 정답 처리를 막으면 안 된다.
run('gameState.inventory.itemIds=[];gameState.acquiredItems={}');
horses.value='6';carriages.value='3';submit();submit();
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
console.log('통과: 단일 입구·시설 접근·회전목마 가림과 전체 관찰 가능, 머리띠 중복 방지, 오답 유지·정답 선입력·해결 재방문·풍선 획득 없음');

