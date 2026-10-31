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
const sandbox = {
  document: { getElementById: () => canvas, addEventListener() {} },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener: (name, handler) => { windowHandlers[name] = handler; } },
  Date: class extends Date { static now() { return now; } },
  requestAnimationFrame() {},
};
vm.createContext(sandbox);
for (const file of ["city-data.js", "game.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
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

const doors = read("outdoorDoors()");
for (const target of doors) {
  // 도시 중앙에서 멀리 떨어진 문을 눌러도 이동하지 않는다.
  run("player.x = city.spawn.x * settings.worldScale; player.y = city.spawn.y * settings.worldScale; updateCamera()");
  advance(); click(target);
  assert.equal(run("scene.interiorId"), null);
}

const locked = doors.find(door => door.kind === "locked");
positionAt(locked); advance(); click(locked);
assert.equal(run("scene.interiorId"), null);
assert.equal(run("scene.message"), run("city.interiorUi.locked"));
assert.equal(run("scene.returnPoint"), null);

for (const target of doors.filter(door => door.kind !== "locked")) {
  for (const zoom of [1, 1.5, 3]) {
    run(`settings.cameraZoom = ${zoom}`);
    positionAt(target); advance();
    click(target, 2);
    assert.equal(run("scene.interiorId"), null, "오른쪽 클릭으로 입장했습니다.");
    run('pressedKeys.add("ArrowUp")');
    click(target);
    assert.equal(run("scene.interiorId"), target.placeId);
    assert.equal(run("pressedKeys.size"), 0);
    assert.ok(run("canStand(player.x, player.y)"));
    const interior = read("currentInterior()");
    const savedReturn = read("scene.returnPoint");
    assert.equal(savedReturn.x, target.approach.x);
    assert.equal(savedReturn.y, target.approach.footY - run("player.footOffset"));
    // 연속 클릭이 입장 직후 퇴장으로 이어지면 안 된다.
    click(interior.exit);
    assert.equal(run("scene.interiorId"), target.placeId);

    for (const direction of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      run(`player.x = ${interior.width / 2}; player.y = ${interior.height / 2}; pressedKeys.clear(); pressedKeys.add("${direction}"); update(5)`);
      assert.ok(run("canStand(player.x, player.y)"));
      assert.equal(run("scene.interiorId"), target.placeId, "걷기만으로 맵이 바뀌었습니다.");
    }
    run(`player.x = ${interior.width / 2}; player.y = ${interior.height / 2}; updateCamera()`);
    advance(); click(interior.exit);
    assert.equal(run("scene.interiorId"), target.placeId, "멀리서 출구를 눌러 퇴장했습니다.");

    // 창 크기 변경으로 방이 화면보다 작아져도 카메라가 방을 가운데에 표시한다.
    sandbox.window.innerWidth = 1920; sandbox.window.innerHeight = 1080;
    windowHandlers.resize();
    const cameraState = read("({x: camera.x, y: camera.y})");
    const visibleWidth = 1920 / zoom, visibleHeight = 1080 / zoom;
    if (visibleWidth >= interior.width) assert.equal(cameraState.x, (interior.width - visibleWidth) / 2);
    else assert.ok(cameraState.x >= 0 && cameraState.x <= interior.width - visibleWidth);
    if (visibleHeight >= interior.height) assert.equal(cameraState.y, (interior.height - visibleHeight) / 2);
    else assert.ok(cameraState.y >= 0 && cameraState.y <= interior.height - visibleHeight);

    run(`player.x = ${interior.spawn.x}; player.y = ${interior.spawn.footY} - player.footOffset; updateCamera()`);
    advance(); click(interior.exit);
    assert.equal(run("scene.interiorId"), null);
    assert.equal(run("scene.returnPoint"), null);
    assert.equal(run("player.x"), savedReturn.x);
    assert.equal(run("player.y"), savedReturn.y);
    assert.equal(run("player.facing"), savedReturn.facing);
    assert.ok(run("canStand(player.x, player.y)"));
    assert.equal(run("pressedKeys.size"), 0);
    click(target);
    assert.equal(run("scene.interiorId"), null, "퇴장 직후 연속 클릭으로 재입장했습니다.");
  }
  console.log("왕복 출입 통과:", target.placeId, "(줌 1·1.5·3, 실내 벽, 반환 위치, 연속 클릭)");
}

run("settings.cameraZoom = 1");
for (const place of read("city.locations.filter(place => !place.solid)")) {
  run(`player.x = ${place.x} * settings.worldScale; player.y = ${place.y} * settings.worldScale - player.footOffset; updateCamera()`);
  advance(); click({ x: place.x * 9, y: place.y * 9 });
  assert.equal(run("scene.interiorId"), null);
  assert.ok(run("canStand(player.x, player.y)"));
}
console.log("통과: 집 정문 잠금, 쪽문 출입, 야외 장소 유지, 원거리 클릭 차단, 키 해제, 창 크기 변경");
