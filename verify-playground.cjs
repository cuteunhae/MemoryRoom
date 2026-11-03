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

let captured = null;
canvas.setPointerCapture = id => {captured=id;};
canvas.hasPointerCapture = id => captured===id;
canvas.releasePointerCapture = () => {captured=null;};
const layout=read('playgroundLayout()');
const approach = target => {run(`player.x=${target.x};player.y=${target.y+target.height/2+36}-player.footOffset;updateCamera()`);assert.ok(run('canStand(player.x,player.y)'));};
assert.equal(run('gameState.playgroundMemoViewed'),false);
assert.equal(run('playgroundGiftVisible()'),false);
assert.ok(layout.swing.x<layout.seesaw.x && layout.swing.y<layout.seesaw.y);
assert.ok(layout.slide.x>layout.swing.x && layout.slide.y<layout.seesaw.y);
assert.ok(layout.gateX<layout.swing.x && layout.bottom>layout.seesaw.y);
assert.ok(run('city.landmarks.find(item=>item.id===PLAYGROUND_DATA.treeId).x*settings.worldScale')<layout.left);
// 실제 보행 판정으로 기존 도로의 진입점부터 시설까지 연결을 확인한다.
assert.equal(run(`(() => {
 const layout=playgroundLayout(), origin={x:740*settings.worldScale,y:640*settings.worldScale},step=18;
 const queue=[[0,0]],seen=new Set(['0,0']);
 for(let i=0;i<queue.length;i++) {
  const [gx,gy]=queue[i];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
   const nx=gx+dx,ny=gy+dy,key=nx+','+ny,x=origin.x+nx*step,y=origin.y+ny*step;
   if(seen.has(key)||x<layout.left||x>layout.right||y<layout.top||y>layout.bottom+100||!canStandCity(x,y-player.footOffset))continue;
   seen.add(key);queue.push([nx,ny]);
  }
 }
 return [...playgroundTargets(),layout.gift,{x:layout.gateX,y:layout.bottom+45,height:0}].every(target=>
 queue.some(([gx,gy])=>Math.hypot(origin.x+gx*step-target.x,origin.y+gy*step-(target.y+target.height/2+36))<30));
})()`),true);
for(const fence of read('playgroundFences(playgroundLayout())')) assert.equal(run(`canStandCity(${fence.x},${fence.y}-player.footOffset)`),false);
for(const order of [['swing','seesaw'],['seesaw','swing']]) {
 run('gameState.swingUsed=false;gameState.seesawUsed=false');
 run('player.x=city.spawn.x*settings.worldScale;player.y=city.spawn.y*settings.worldScale;updateCamera()');click(layout[order[0]]);
 assert.equal(run(`gameState.${order[0]}Used`),false);
 approach(layout[order[0]]);click(layout[order[0]],2);assert.equal(run(`gameState.${order[0]}Used`),false);
 click(layout[order[0]]);assert.equal(run(`gameState.${order[0]}Used`),true);
 assert.equal(run('playgroundGiftVisible()'),false);
 const end=run(`playgroundAnimation.${order[0]}Until`);advance();click(layout[order[0]]);
 assert.ok(run(`playgroundAnimation.${order[0]}Until`)>end);
 approach(layout[order[1]]);click(layout[order[1]]);
 assert.equal(run('playgroundGiftVisible()'),true);
 assert.equal(run('scene.interiorId'),null);
}
approach(layout.gift);click(layout.gift);click(layout.gift);
assert.deepEqual(read('gameState.inventory.itemIds'),[run('PLAYGROUND_DATA.toyId')]);
assert.equal(run('playgroundGiftVisible()'),false);
const background={x:layout.gateX+200,y:layout.bottom-200};
click(background);assert.equal(run('bubbleEffect.particles.length'),0);
run('toggleInventory()');
elements['inventory-list'].children[0].handlers.click();
click(background);assert.equal(run('bubbleEffect.particles.length'),0);
run('toggleInventory()');advance();click(background);
assert.equal(run('bubbleEffect.particles.length'),1);
const pointer = (type,target,buttons=1) => {
 const screen=read(`({x:(${target.x}-camera.x)*settings.cameraZoom,y:(${target.y}-camera.y)*settings.cameraZoom})`);
 canvasHandlers[type]({pointerId:7,button:0,buttons,clientX:17+screen.x/2,clientY:29+screen.y/2});
};
advance();pointer('pointerdown',background);const count=run('bubbleEffect.particles.length');
pointer('pointermove',background);assert.equal(run('bubbleEffect.particles.length'),count);
advance();pointer('pointermove',background);assert.equal(run('bubbleEffect.particles.length'),count+1);
pointer('pointerup',background,0);advance();pointer('pointermove',background);assert.equal(run('bubbleEffect.particles.length'),count+1);
approach(layout.swing);advance();click(layout.swing);
assert.equal(run('bubbleEffect.particles.length'),count+1);
for(const interior of read('city.interiors')) {
 run(`scene.interiorId=${JSON.stringify(interior.placeId)};scene.schoolFloor=1;player.x=${interior.spawn.x};player.y=${interior.spawn.footY}-player.footOffset;finishMapTransition()`);
 advance();click({x:interior.spawn.x,y:interior.spawn.footY+(interior.exit.side==='north'?40:-40)});
 assert.equal(run('bubbleEffect.particles.length'),1);
 assert.equal(run('bubbleEffect.particles[0].interiorId'),interior.placeId);
}
for(let i=0;i<40;i++){advance();run('emitBearBubble()');}
assert.ok(run('bubbleEffect.particles.length')<=run('BUBBLE_DATA.maxCount'));
assert.equal(run('gameState.inventory.itemIds.length'),1);
now+=4000;run('drawBearBubbles()');assert.equal(run('bubbleEffect.particles.length'),0);
assert.equal(run('BUBBLE_DATA.bear.fur'),'#96643f');assert.equal(run('BUBBLE_DATA.bear.ribbon'),'#4a8fc5');
console.log('통과: 약도 없이 입장·시설 접근·단일 출입구, 이용 순서·재이용·선물 중복 방지, 배경 클릭·드래그·조사 우선, 실내 사용·비소모·수명·개수 제한');

