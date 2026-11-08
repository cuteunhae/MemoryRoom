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
  document: { getElementById: id => id === "game" ? canvas : (elements[id] ??= element()), createElement: element, addEventListener(name,fn) {(documentHandlers[name]??=[]).push(fn)} },
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


for(const file of ['data/save.js','save.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox,{filename:file});
return {storage,control,run,read,elements,windowHandlers,documentHandlers,canvasHandlers,positionAt,click,advance,advanceMs(ms){now+=ms},key(event){for(const fn of windowHandlers.keydown)fn({preventDefault(){},...event})}};
}

let a=session();
const progress=a.run('SAVE_DATA.progressKey');
const saved=()=>JSON.parse(a.storage.get(progress));
const tick=ms=>{a.advanceMs(ms);a.run('updateHints()');};
assert.equal(a.elements['hint-gift'].hidden,true);
tick(179999);assert.equal(a.elements['hint-gift'].hidden,true);
tick(1);assert.equal(a.elements['hint-gift'].hidden,false);
a.elements['hint-gift'].handlers.click();assert.equal(a.run('hintUi.open'),true);assert.equal(a.run('gameState.hints.history.length'),1);
// 처음 받은 힌트는 위에만 보이고 누적 목록은 비어 있다.
assert.equal(a.elements['hint-current'].hidden,false);assert.equal(a.elements['hint-current'].textContent,a.run('HINT_DATA.entries[0].text'));assert.equal(a.elements['hint-previous'].hidden,true);assert.equal(a.elements['hint-list'].children.length,0);
const before=a.read('({x:player.x,y:player.y})');a.key({key:'ArrowRight',code:'ArrowRight'});a.run('update(.2)');assert.deepEqual(a.read('({x:player.x,y:player.y})'),before);
a.key({code:'KeyI'});assert.equal(a.run('inventoryUiState.open'),false);a.key({code:'Tab'});assert.equal(a.run('achievementUi.open'),false);
// 새 힌트가 없어도 선물상자는 남아 있고, 누르면 누적된 힌트만 보인다. 같은 힌트를 중복 지급하지 않는다.
a.run('closeHints()');assert.equal(a.elements['hint-gift'].hidden,false);assert.equal(a.run('newHintAvailable()'),false);
a.run('openHints()');assert.equal(a.run('hintUi.open'),true);assert.equal(a.elements['hint-current'].hidden,true);assert.equal(a.elements['hint-previous'].hidden,false);assert.equal(a.elements['hint-list'].children.length,1);a.run('closeHints()');assert.equal(a.run('gameState.hints.history.length'),1);
a.run('acquireItem("ITM-01");updateHints()');assert.equal(a.run('gameState.hints.idleMs'),0);assert.equal(a.elements['hint-gift'].hidden,false);assert.equal(a.run('newHintAvailable()'),false);
tick(1000);a.run('acquireItem("ITM-01");updateHints()');assert.equal(a.run('gameState.hints.idleMs'),1000);
a.run('markHintClue("photo-front")');assert.equal(a.run('gameState.hints.idleMs'),0);const progressTime=a.run('gameState.hints.lastProgressAt');
tick(2000);a.run('markHintClue("photo-front")');assert.equal(a.run('gameState.hints.idleMs'),2000);assert.equal(a.run('gameState.hints.lastProgressAt'),progressTime);
a.run('gameState.swingUsed=true;updateAchievementConditions()');assert.equal(a.run('gameState.hints.idleMs'),0);tick(2000);a.run('updateAchievementConditions()');assert.equal(a.run('gameState.hints.idleMs'),2000);
// 다른 탭·다른 창과 게임을 닫은 시간은 누적하지 않는다.
for(const fn of a.windowHandlers.blur)fn();tick(100000);assert.equal(a.run('gameState.hints.idleMs'),2000);
for(const fn of a.windowHandlers.focus)fn();tick(1000);assert.equal(a.run('gameState.hints.idleMs'),3000);
a.run('document.hidden=true');for(const fn of a.documentHandlers.visibilitychange)fn();tick(100000);assert.equal(a.run('gameState.hints.idleMs'),3000);
a.run('document.hidden=false');for(const fn of a.documentHandlers.visibilitychange)fn();tick(1000);assert.equal(a.run('gameState.hints.idleMs'),4000);
let b=session(a.storage);assert.equal(b.run('gameState.hints.idleMs'),4000);assert.deepEqual(b.read('gameState.hints.history'),a.read('gameState.hints.history'));assert.equal(b.run('gameState.hints.lastProgressAt'),a.run('gameState.hints.lastProgressAt'));
b.advanceMs(1000);b.run('updateHints()');assert.equal(b.run('gameState.hints.idleMs'),5000);
a=session();a.run('city.debug=true');tick(179999);assert.equal(a.elements['hint-gift'].hidden,true);tick(1);assert.equal(a.elements['hint-gift'].hidden,false);
// 3분·6분·9분마다 아직 받지 않은 다음 힌트를 하나씩 받고, 9분 이후에는 더 늘지 않는다.
a=session();const take=()=>{a.elements['hint-gift'].handlers.click();const id=a.run('hintUi.current');a.run('closeHints()');return id;};
tick(180000);const first=take();assert.equal(a.elements['hint-gift'].hidden,false);assert.equal(a.run('newHintAvailable()'),false);
tick(179999);assert.equal(a.run('newHintAvailable()'),false);tick(1);assert.equal(a.run('newHintAvailable()'),true);const second=take();
tick(180000);const third=take();assert.deepEqual([first,second,third],['HNT-01','HNT-02','HNT-18']);assert.deepEqual(a.read('gameState.hints.received'),[first,second,third]);
// 9분 이후에는 새 힌트가 없고, 선물상자를 누르면 누적된 3개만 보인다.
tick(600000);assert.equal(a.run('newHintAvailable()'),false);assert.equal(a.elements['hint-gift'].hidden,false);
a.run('openHints()');assert.equal(a.run('hintUi.current'),null);assert.equal(a.elements['hint-current'].hidden,true);assert.equal(a.elements['hint-list'].children.length,3);a.run('closeHints()');
b=session(a.storage);assert.deepEqual(b.read('gameState.hints.received'),[first,second,third]);assert.equal(b.elements['hint-gift'].hidden,false);assert.equal(b.run('newHintAvailable()'),false);
a.run('acquireItem("ITM-01");updateHints()');assert.deepEqual(a.read('gameState.hints.received'),[]);assert.equal(a.run('newHintAvailable()'),false);
// 새 힌트는 위에, 나머지 누적 힌트는 아래 목록에 겹치지 않게 보인다.
tick(180000);assert.equal(a.run('newHintAvailable()'),true);a.elements['hint-gift'].handlers.click();
assert.equal(a.run('hintUi.current'),'HNT-02');assert.equal(a.elements['hint-current'].hidden,false);assert.equal(a.elements['hint-list'].children.length,2);a.run('closeHints()');
// 기존 1버전 저장을 읽어도 인벤토리와 완료 기록을 잃지 않는다.
a.run('acquireItem("ITM-01")');let old=saved();old.saveVersion=1;delete old.hints;a.storage.set(progress,JSON.stringify(old));b=session(a.storage);
assert.equal(b.run('gameState.photoCollected'),true);assert.equal(b.run('gameState.hints.history.length'),0);assert.equal(saved().saveVersion,3);
// 플레이어 위치와 관계없이 사진관→학교→놀이공원→놀이터→집 순서로 고른다. 한 장소의 힌트를 다 준 뒤 다음 장소로 넘어간다.
a=session();assert.equal(a.run('chooseHint().id'),'HNT-01');
// 다른 장소(놀이터 안, 집 안)에 있어도 앞 순서 장소의 힌트가 먼저다.
a.run('player.x=playgroundLayout().swing.x;player.y=playgroundLayout().swing.y');assert.equal(a.run('chooseHint().id'),'HNT-01');
a.run('scene.interiorId=HOUSE_DATA.placeId');assert.equal(a.run('chooseHint().id'),'HNT-01');a.run('scene.interiorId=null');
a.run('gameState.acquiredItems[HINT_DATA.items.photo]=true');assert.equal(a.run('chooseHint().id'),'HNT-02');
a.run('gameState.hints.clues.push("class-nine")');assert.equal(a.run('chooseHint().id'),'HNT-03');
// 크레파스 힌트(HNT-18)는 게시판·배치도 힌트 다음이다.
a.run('gameState.hints.received.push("HNT-03")');assert.equal(a.run('chooseHint().id'),'HNT-18');a.run('gameState.hints.received=[]');
a.run('gameState.acquiredItems[HINT_DATA.items.notebook]=true;gameState.acquiredItems[HINT_DATA.items.crayon]=true');assert.equal(a.run('chooseHint().id'),'HNT-04');
a.run('delete gameState.acquiredItems[HINT_DATA.items.crayon]');assert.equal(a.run('chooseHint().id'),'HNT-03');
a.run('gameState.acquiredItems[HINT_DATA.items.crayon]=true;gameState.registrySolved=true');
// 놀이공원은 남은 두 힌트(머리띠→회전목마)를 연달아 준 뒤 놀이터로 넘어간다.
assert.equal(a.run('chooseHint().id'),'HNT-09');
a.run('gameState.hints.received.push("HNT-09")');assert.equal(a.run('chooseHint().id'),'HNT-05');
a.run('gameState.hints.received.push("HNT-05")');assert.equal(a.run('chooseHint().id'),'HNT-06');
a.run('gameState.hints.received=[];gameState.acquiredItems[PARK_DATA.headbandId]=true');assert.equal(a.run('chooseHint().id'),'HNT-05');
a.run('gameState.carouselSolved=true');assert.equal(a.run('chooseHint().id'),'HNT-10');
a.run('gameState.acquiredItems[PARK_DATA.balloonId]=true;gameState.acquiredItems[PARK_DATA.memoId]=true;gameState.playgroundMemoViewed=true');assert.equal(a.run('chooseHint().id'),'HNT-06');
a.run('gameState.swingUsed=true;gameState.seesawUsed=true');assert.equal(a.run('chooseHint().id'),'HNT-12');
// 집에 들어가기 전에는 집 힌트(HNT-07→HNT-19→HNT-13)를 먼저 주고, 그다음 미끄럼틀 힌트(HNT-14)를 준다.
a.run('gameState.acquiredItems[PLAYGROUND_DATA.toyId]=true');assert.equal(a.run('chooseHint().id'),'HNT-07');
a.run('gameState.hints.received.push("HNT-07")');assert.equal(a.run('chooseHint().id'),'HNT-19');
a.run('gameState.hints.received.push("HNT-19")');assert.equal(a.run('chooseHint().id'),'HNT-13');
a.run('gameState.hints.received.push("HNT-13")');assert.equal(a.run('chooseHint().id'),'HNT-14');
a.run('gameState.hints.received=[];gameState.slideUsed=true');assert.equal(a.run('chooseHint().id'),'HNT-07');
// 집 안에서는 집 외곽 힌트가 나오지 않는다.
// 집 안에서도 곰 인형이 없으면 HNT-19 다음에 HNT-15를 준다.
a.run('scene.interiorId=HOUSE_DATA.placeId');assert.equal(a.run('chooseHint().id'),'HNT-19');
a.run('gameState.hints.received.push("HNT-19")');assert.equal(a.run('chooseHint().id'),'HNT-15');a.run('gameState.hints.received=[]');assert.equal(a.run('hintCandidates().some(c=>c.id==="HNT-13")'),false);
a.run('CABINET_DATA.answer.forEach(id=>gameState.acquiredItems[id]=true)');assert.equal(a.run('chooseHint().id'),'HNT-08');
// 곰 인형을 얻은 뒤에는 집 밖에서도 HNT-19가 나오지 않는다.
a.run('scene.interiorId=null');assert.equal(a.run('hintCandidates().some(c=>c.id==="HNT-19")'),false);a.run('scene.interiorId=HOUSE_DATA.placeId');
a.run('gameState.cabinetSolved=true');assert.equal(a.run('chooseHint().id'),'HNT-16');
a.run('gameState.childRoomUnlocked=true');assert.equal(a.run('chooseHint().id'),'HNT-17');
// 마지막 활동까지 끝나면 새 힌트를 만들지 않으며 기존 기록은 유지된다.
a.run('HINT_DATA.progressFlags.forEach(flag=>gameState[flag]=true);Object.values(HINT_DATA.items).forEach(id=>gameState.acquiredItems[id]=true)');assert.equal(a.run('chooseHint()'),null);
const exact=[
 '촬영구역 아래에 있는 테이블 위를 살펴보세요.',
 '복도 게시판에는 각 반의 위치가 표시되어 있어요.',
 '교실 뒤쪽 게시판의 자리 배치도를 확인해 보세요.',
 '흐릿한 명부에 크레파스를 사용해 보세요.',
 '회전목마의 반대편에서도 말과 마차를 세어 보세요.',
 '그네와 시소를 모두 사용해 보세요.',
 '집의 앞문만 보지 말고 옆으로 이어지는 길도 살펴보세요.',
 '다섯 장소에서 얻은 추억의 물건을 순서에 맞게 놓아보세요.',
];assert.deepEqual(a.read('HINT_DATA.entries.slice(0,8).map(e=>e.text)'),exact);
// HNT-05는 놀이공원 회전목마 힌트, 크레파스 힌트는 학교의 HNT-18이다. ID는 겹치지 않는다.
assert.equal(a.run('HINT_DATA.entries.find(e=>e.id==="HNT-05").placeId'),'C03');
assert.deepEqual(a.read('HINT_DATA.entries.find(e=>e.id==="HNT-18")'),{id:'HNT-18',placeId:'C02',text:'크레파스는 학생의 자리에 있겠죠? 돌잔치 사진과 연결해보세요.'});
assert.equal(a.run('new Set(HINT_DATA.entries.map(e=>e.id)).size'),a.run('HINT_DATA.entries.length'));
console.log('PASS: exact hints, 3-minute boundaries in normal/debug modes, extra hints at 6/9 minutes (max 3), gift stays for accumulated hints, visible time only, progress deduplication, saved timer/history, v1 migration, place-order selection (C01→C05, finish a place before the next), modal blocking');

