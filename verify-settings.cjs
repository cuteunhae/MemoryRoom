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
const key=code=>a.key({code,key:code});
const release=code=>{for(const fn of a.windowHandlers.keyup)fn({code,key:code,preventDefault(){}});};
const choose=action=>a.elements['settings-keys'].children.find(b=>b.dataset.action===action).handlers.click();
key('Escape');assert.equal(a.run('settingsUi.open'),true);
const start=a.read('({x:player.x,y:player.y})');key('ArrowRight');a.run('update(.1)');assert.deepEqual(a.read('({x:player.x,y:player.y})'),start);
choose('up');key('KeyW');assert.equal(a.run('userPreferences.keys.up'),'KeyW');assert.equal(a.run('settingsUi.open'),true);
choose('inventory');key('Tab');assert.equal(a.run('userPreferences.keys.achievements'),null);assert.equal(a.run('userPreferences.keys.inventory'),'Tab');
choose('map');key('Escape');assert.equal(a.run('userPreferences.keys.settings'),null);assert.equal(a.run('settingsUi.open'),true);
a.elements['settings-close'].handlers.click();key('KeyW');assert.equal(a.run('pressedKeys.has("ArrowUp")'),true);a.run('update(.05)');release('KeyW');assert.equal(a.run('pressedKeys.size'),0);
key('ArrowUp');assert.equal(a.run('pressedKeys.size'),0);
key('Tab');assert.equal(a.run('inventoryUiState.open'),true);
// 설정 키를 해제해도 각 창의 마우스 버튼으로 설정에 접근한다.
a.elements['inventory-dialog'].children.find(b=>b.className==='settings-open').handlers.click();
assert.equal(a.run('settingsUi.open'),true);assert.equal(a.run('inventoryUiState.open'),true);
key('Tab');assert.equal(a.run('inventoryUiState.open'),true);
a.elements['settings-close'].handlers.click();assert.equal(a.run('inventoryUiState.open'),true);key('Tab');assert.equal(a.run('inventoryUiState.open'),false);
key('Escape');assert.equal(a.run('mapUi.open'),true);assert.equal(a.elements['map-picture'].width,a.run('city.width'));assert.equal(a.elements['map-picture'].height,a.run('city.height'));
a.elements['map-dialog'].children.find(b=>b.className==='settings-open').handlers.click();assert.equal(a.run('settingsUi.open'),true);
a.run('setSoundVolume("bgm",25);setSoundVolume("sfx",70)');assert.equal(a.run('getSoundVolume("bgm")'),.25);assert.equal(a.run('getSoundVolume("sfx")'),.7);
a.elements['settings-restore'].handlers.click();assert.deepEqual(a.read('userPreferences.keys'),a.read('SETTINGS_DATA.keys'));assert.equal(a.run('getSoundVolume("bgm")'),.25);
key('Escape');assert.equal(a.run('settingsUi.open'),false);assert.equal(a.run('mapUi.open'),true);key('KeyM');assert.equal(a.run('mapUi.open'),false);
// 일기장 위에서 설정을 닫아도 페이지가 유지되고 완료 처리를 하지 않는다.
a.run('openInspection({type:"diary",name:DIARY_DATA.text.title});diaryUi.page=2');key('Escape');assert.equal(a.run('settingsUi.open'),true);
key('KeyI');assert.equal(a.run('inspectionUiState.mode'),'diary');key('Escape');assert.equal(a.run('diaryUi.page'),2);assert.equal(a.run('gameState.endingReached'),false);
a.run('closeInspection()');key('Escape');choose('settings');key('KeyP');key('Escape');assert.equal(a.run('settingsUi.open'),true);key('KeyP');assert.equal(a.run('settingsUi.open'),false);
let b=session(a.storage);assert.equal(b.run('userPreferences.keys.settings'),'KeyP');assert.equal(b.run('getSoundVolume("sfx")'),.7);
b.key({code:'KeyP'});b.control.confirm=false;b.elements['settings-new-game'].handlers.click();assert.equal(b.run('settingsUi.open'),true);
b.control.confirm=true;b.elements['settings-new-game'].handlers.click();assert.equal(b.run('settingsUi.open'),false);assert.equal(b.run('userPreferences.keys.settings'),'KeyP');assert.equal(b.run('getSoundVolume("bgm")'),.25);
// 이전 단일 볼륨 저장을 두 채널로 이관한다.
const legacy=b.read('userPreferences');legacy.sound={muted:false,volume:.4};b.storage.set(b.run('SAVE_DATA.preferencesKey'),JSON.stringify(legacy));
const c=session(b.storage);assert.equal(c.run('getSoundVolume("bgm")'),.4);assert.equal(c.run('getSoundVolume("sfx")'),.4);
// 저장 실패 시 설정을 잃지 않는다.
b.control.failWrite=true;b.run('toggleSettings();settingsUi.listening="up"');assert.equal(b.run('assignSettingKey("KeyZ")'),false);assert.equal(b.run('userPreferences.keys.up'),'ArrowUp');
assert.equal(b.run('setSoundVolume("bgm",90)'),false);assert.equal(b.run('getSoundVolume("bgm")'),.25);
console.log('PASS: remapped movement/menu/map, duplicate unassignment, mouse recovery, stacked dialogs, volume channels/migration, restore keys only, persistence/new game, storage failure');

