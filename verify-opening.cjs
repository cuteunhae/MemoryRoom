"use strict";
const fs = require("node:fs"), assert = require("node:assert/strict");
// 기존 저장·입력 검사와 같은 가상 브라우저 환경에 도입 연출을 함께 불러온다.
const source = fs.readFileSync(require("node:path").join(__dirname, "verify-hints.cjs"), "utf8");
const harness = source.slice(0, source.indexOf("let a=session();"))
  .replace("['data/save.js','save.js']", "['data/opening.js','opening.js','data/save.js','save.js']");
const session = new Function("require", "__dirname", harness + "\nreturn session;")(require, __dirname);
let a = session();
const tick = ms => { a.advanceMs(ms); a.run("updateOpening()"); };
assert.equal(a.run("openingUi.active"), true);
assert.equal(a.run("openingUi.line"), 0);
const start = a.read("({x:player.x,y:player.y})");
a.key({code: "ArrowRight"}); a.key({code: "KeyE"}); a.key({code: "Escape"}); a.key({code: "KeyI"});
a.run("update(1)");
assert.deepEqual(a.read("({x:player.x,y:player.y})"), start);
assert.equal(a.run("inventoryUiState.open || settingsUi.open"), false);
tick(2999); assert.equal(a.run("openingUi.line"), 0);
tick(1); assert.equal(a.run("openingUi.line"), 1);
tick(3999); assert.equal(a.run("openingUi.line"), 1);
tick(1); assert.equal(a.run("openingUi.line"), 2);
tick(3999); assert.equal(a.run("openingUi.active"), true);
tick(1); assert.equal(a.run("openingUi.active"), false);
assert.equal(a.run("openingGuideVisible()"), true);
a.run("updateOpeningRoute()");
assert.ok(a.run("openingUi.path.length") > 1);
assert.equal(a.run("openingUi.path.slice(1).every((p,i)=>openingSegmentWalkable(openingUi.path[i],p))"), true);
const goal = a.read("city.accessPoints.find(p=>p.placeId===OPENING_DATA.destinationId)");
assert.deepEqual(a.read("openingUi.path.at(-1)"), [goal.x,goal.y]);
// 경로에서 벗어나도 실제로 걸을 수 있는 길로 다시 안내한다.
a.run("player.x=388*settings.worldScale;player.y=815*settings.worldScale-player.footOffset");
a.advanceMs(1000); a.run("updateOpeningRoute()");
assert.ok(a.run("openingUi.path.length") > 1);
assert.equal(a.run("openingUi.path.slice(1).every((p,i)=>openingSegmentWalkable(openingUi.path[i],p))"), true);
// 사진관 이외의 자유 방문은 안내 완료로 처리하지 않는다.
a.run("finishOpeningGuide('C02')"); assert.equal(a.run("gameState.onboarding.studioVisited"), false);
const door = a.read("outdoorDoors().find(d=>d.placeId===OPENING_DATA.destinationId)");
a.positionAt(door); a.advance(); a.run("enterInterior(outdoorDoors().find(d=>d.placeId===OPENING_DATA.destinationId))");
assert.equal(a.run("scene.interiorId"), "C01");
assert.equal(a.run("gameState.onboarding.studioVisited"), true);
assert.equal(a.run("openingGuideVisible()"), false);
let b = session(new Map(a.storage));
assert.equal(b.run("openingUi.active"), false);
assert.equal(b.run("gameState.onboarding.studioVisited"), true);
// 새 게임은 다시 표시하고, 도중 새로고침은 독백 반복 없이 길 안내를 이어 간다.
b.run("requestNewGame()"); assert.equal(b.run("openingUi.active"), true);
const c = session(b.storage);
assert.equal(c.run("openingUi.active"), false); assert.equal(c.run("openingGuideVisible()"), true);
// 이전 저장은 진행을 유지하고 도입 연출을 끼워 넣지 않는다.
const key = a.run("SAVE_DATA.progressKey"), legacy = JSON.parse(a.storage.get(key));
delete legacy.onboarding; a.storage.set(key,JSON.stringify(legacy));
const old = session(a.storage);
assert.equal(old.run("scene.interiorId"), "C01");
assert.equal(old.run("openingUi.active || openingGuideVisible()"), false);
console.log("PASS: 3/4/4 seconds, input blocking, walkable routes/rerouting, studio arrival, reload, new game, old-save migration");
