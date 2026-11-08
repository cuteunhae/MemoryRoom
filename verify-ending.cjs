"use strict";
const assert=require('node:assert/strict');
function session(storage=new Map(),control={}) {

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
const documentHandlers = {};
const sandbox = {
 localStorage: {getItem(k){if(control.failRead)throw Error("denied");return storage.get(k)??null;},setItem(k,v){if(control.failWrite)throw Error("quota");storage.set(k,v);},removeItem(k){if(control.failWrite)throw Error("denied");storage.delete(k);}},
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener(name,fn) {documentHandlers[name]=fn} },
  window: { confirm(){control.confirmCount=(control.confirmCount||0)+1;return control.confirm!==false;}, innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { (windowHandlers[name] ??= []).push(handler); } },
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


for(const file of ['data/save.js','save.js','settings-ui.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox,{filename:file});
return {storage,control,run,read,elements,windowHandlers,documentHandlers,canvasHandlers,positionAt,click,advance,advanceMs(ms){now+=ms},key(event){for(const fn of windowHandlers.keydown)fn({preventDefault(){},...event})}};
}

let a=session();
a.run('openInspection({type:"diary",name:DIARY_DATA.text.title})');
a.elements['diary-paper'].handlers.click();assert.equal(a.run('endingUi.mode'),null);
a.elements['diary-next'].onclick();a.elements['diary-next'].onclick();assert.equal(a.run('gameState.endingReached'),false);
assert.deepEqual(a.read('DIARY_DATA.pages.map(p=>p.body.split(String.fromCharCode(10)).length)'),[4,4,3]);
assert.ok(a.elements['diary-body'].children.some(group=>group.children.some(character=>character.attributes.style?.includes('rotate('))));
a.elements['diary-paper'].handlers.click();assert.equal(a.run('endingUi.mode'),'playing');assert.equal(a.run('gameState.endingReached'),true);
assert.equal(JSON.parse(a.storage.get(a.run('SAVE_DATA.progressKey'))).puzzles.endingReached,true);
assert.equal(JSON.parse(a.storage.get(a.run('SAVE_DATA.progressKey'))).puzzles.endingCompleted,true);
const resumedDuring=session(a.storage);assert.equal(resumedDuring.run('endingUi.mode'),null);assert.equal(resumedDuring.run('isGameInputBlocked()'),false);assert.equal(resumedDuring.run('gameState.endingCompleted'),true);
a.key({code:'Escape'});assert.equal(a.run('settingsUi.open'),false);a.key({code:'KeyI'});assert.equal(a.run('inventoryUiState.open'),false);
const started=a.run('endingUi.startedAt');a.run('startEnding()');assert.equal(a.run('endingUi.startedAt'),started);
assert.equal(a.read('ENDING_DATA.scenes.reduce((sum,s)=>sum+s.durationMs,0)'),9000);
a.advanceMs(220);a.run('updateEnding()');assert.equal(a.elements['ending-art'].attributes.style,'opacity:1');
a.advanceMs(1060);a.run('updateEnding()');assert.equal(a.elements['ending-art'].attributes.style,'opacity:1');
a.advanceMs(110);a.run('updateEnding()');assert.equal(a.elements['ending-art'].attributes.style,'opacity:0.5');
a.advanceMs(-1390);
for(let i=0;i<6;i++) {assert.equal(a.run('endingUi.scene'),i);a.advanceMs(1500);a.run('updateEnding()');}
assert.equal(a.run('endingUi.mode'),'menu');assert.equal(a.elements['ending-menu'].hidden,false);
a.control.confirm=false;a.elements['ending-restart'].handlers.click();assert.equal(a.run('endingUi.mode'),'menu');
a.elements['ending-exit'].handlers.click();assert.equal(a.run('endingUi.mode'),'exited');
assert.equal(a.elements['ending-message'].textContent,a.run('ENDING_DATA.text.exitMessage'));
assert.equal(a.elements['ending-restart'].hidden,true);assert.equal(a.elements['ending-exit'].hidden,true);
a=session(a.storage);assert.equal(a.run('endingUi.mode'),null);assert.equal(a.run('isGameInputBlocked()'),false);
assert.equal(a.run('gameState.endingCompleted'),true);
a.run('openInspection({type:"diary",name:DIARY_DATA.text.title})');assert.equal(a.run('diaryUi.page'),0);
a.elements['diary-next'].onclick();a.elements['diary-next'].onclick();a.elements['inspection-close'].handlers.click();assert.equal(a.run('endingUi.mode'),'playing');
a.advanceMs(9000);a.run('updateEnding()');a.control.confirm=true;a.elements['ending-restart'].handlers.click();assert.equal(a.run('endingUi.mode'),null);assert.equal(a.run('gameState.endingReached'),false);
assert.equal(a.run('gameState.endingCompleted'),false);
// 이전 저장의 엔딩 도달 기록을 새 완료 기록으로 변환하고 자동 재생하지 않는다.
const progress=a.run('SAVE_DATA.progressKey');
for(const version of [1,2]) {
  const old=JSON.parse(a.storage.get(progress));old.saveVersion=version;old.puzzles.endingReached=true;delete old.puzzles.endingCompleted;
  if(version===1)delete old.hints;
  a.storage.set(progress,JSON.stringify(old));a=session(a.storage);
  assert.equal(a.run('gameState.endingCompleted'),true);assert.equal(a.run('endingUi.mode'),null);
  assert.equal(JSON.parse(a.storage.get(progress)).saveVersion,3);
}
console.log('PASS: extra-click confirmation, start-time completion save, six scenes/nine seconds/fades, exit notice, free exploration after reload, legacy migration, confirmed restart');

