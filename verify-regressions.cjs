"use strict";

// 기존 설정 검사의 격리된 게임 환경을 재사용한다. 실제 브라우저 저장에는 접근하지 않는다.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const source = fs.readFileSync("verify-settings.cjs", "utf8");
const boundary = source.indexOf("let a=session();");
assert.ok(boundary > 0);
const session = new Function("require", "__dirname", source.slice(0, boundary) + "return session;")(require, __dirname);

// 화면 갱신이 드물어도 반짝임은 실제 경과 시간에 맞춰 시작한다.
const timer = session();
timer.run('scene.interiorId="C01";updateStudioAlbumGuide()');
const wait = timer.run("STUDIO_ALBUM_GUIDE.waitMs");
timer.advanceMs(wait - 1); timer.run("updateStudioAlbumGuide()");
assert.equal(timer.run("studioAlbumGuide.elapsedMs"), wait - 1);
timer.advanceMs(1); timer.run("updateStudioAlbumGuide()");
assert.equal(timer.run("studioAlbumGuide.elapsedMs"), wait);
timer.run("studioAlbumGuide.found=true");
timer.advanceMs(5000); timer.run("updateStudioAlbumGuide()");
assert.equal(timer.run("studioAlbumGuide.elapsedMs"), wait);
timer.run('scene.interiorId="C02";updateSchoolCrayonGuide()');
timer.advanceMs(90000); timer.run("updateSchoolCrayonGuide()");
assert.equal(timer.run("schoolCrayonGuide.elapsedMs"), 90000);
timer.run("resetSession()");
assert.equal(timer.run("studioAlbumGuide.found"), false);
assert.equal(timer.run("studioAlbumGuide.elapsedMs + schoolCrayonGuide.elapsedMs"), 0);

// 이동·설정에 숫자를 할당해도 퍼즐 입력칸에서는 숫자를 입력할 수 있다.
const input = session();
input.run('userPreferences.keys.up="Digit5";userPreferences.keys.settings="Digit3"');
for (const code of ["Digit5", "Digit3"]) {
  let prevented = false;
  input.key({ code, target: { tagName: "INPUT" }, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
}
assert.equal(input.run("pressedKeys.size"), 0);
assert.equal(input.run("settingsUi.open"), false);
input.run('userPreferences.keys.settings="Escape"');
input.key({ code: "Escape", target: { tagName: "INPUT" } });
assert.equal(input.run("settingsUi.open"), true);

// 모든 반의 물건을 그림 위치에서 하나씩 클릭해도 다른 책상과 인벤토리가 꼬이지 않는다.
const desks = session();
desks.run('scene.interiorId="C02";scene.schoolFloor=2;scene.nextTransitionAt=0');
const targets = desks.read('[...classroomObjects().filter(d=>d.type==="desk"),...classroomDecorDesks()]');
assert.equal(new Set(targets.map(desk => desk.id)).size, targets.length);
let collected = 0;
for (const desk of targets) for (const itemId of desk.itemIds) {
  desks.run(`player.x=${desk.x};player.y=${desk.y + desk.height / 2 + 40}-player.footOffset;updateCamera()`);
  const item = desks.read(`classroomDeskItemTargets([...classroomObjects(),...classroomDecorDesks()].find(d=>d.id===${JSON.stringify(desk.id)})).find(t=>t.itemId===${JSON.stringify(itemId)})`);
  assert.ok(item);
  desks.click(item);
  assert.ok(desks.read(`gameState.deskCollected[${JSON.stringify(desk.id)}]`).includes(itemId));
  collected++;
}
const inventory = desks.read("gameState.inventory.itemIds");
assert.equal(inventory.length, new Set(inventory).size);
desks.run('scene.interiorId=null;scene.returnPoint=null');
assert.deepEqual(desks.read("decodeProgress(JSON.stringify(createProgressSnapshot())).state.deskCollected"), desks.read("gameState.deskCollected"));

// 삭제된 낙서 확인 기록이 든 이전 저장도 그대로 읽을 수 있다.
desks.run('gameState.hints.clues.push("graffiti")');
assert.ok(desks.read("decodeProgress(JSON.stringify(createProgressSnapshot())).state.hints.clues").includes("graffiti"));

// 알림음은 새 힌트마다 한 번, 효과음 0%에서는 재생하지 않는다.
const sound = session();
sound.run(`let tones=0;hintSound.context={state:"running",currentTime:0,destination:{},
  createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){tones++},stop(){}}},
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}}`);
sound.advanceMs(60000); sound.run("updateHints();updateHints()");
assert.equal(sound.run("tones"), 2);
sound.run("openHints();closeHints();updateHints()");
assert.equal(sound.run("tones"), 2);
sound.run("userPreferences.sound.sfxVolume=0");
sound.advanceMs(60000); sound.run("updateHints()");
assert.equal(sound.run("tones"), 2);
console.log(`PASS: real-time guides/reset, remapped puzzle input, ${collected} desk items/save, legacy clues, hint audio`);
