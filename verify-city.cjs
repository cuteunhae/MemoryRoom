"use strict";

// 실제 게임의 이동 판정으로 도로 연결과 장애물을 검사한다.
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assert = require("node:assert/strict");
const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
const canvas = { width: 1280, height: 720, getContext: () => context, addEventListener() {} };
const sandbox = {
  document: { getElementById: () => canvas, addEventListener() {} },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
  requestAnimationFrame() {},
  assert,
  console,
};
vm.createContext(sandbox);
for (const file of ["city-data.js", "game.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
}
vm.runInContext(`
  assert.equal(world.width, 9000);
  assert.equal(world.height, 8100);
  assert.equal(settings.cameraZoom, 1);
  assert.equal(city.frame.length, 5);
  assert.equal(city.landmarks.length, 4);
  assert.equal(city.buildings.length, 30);
  assert.deepEqual(JSON.stringify(city.locations.map(p => [p.x, p.y])),
    JSON.stringify([[170,565],[265,305],[774,345],[809,571],[533,778]]));
  const canWalk = (x, y) => canStand(x * settings.worldScale, y * settings.worldScale - player.footOffset);
  assert.ok(canStand(player.x, player.y), "시작점이 보행 구역 밖입니다.");
  for (const point of city.coast) assert.ok(pointInPolygon(...point, city.frame), "해안선이 오각형 밖입니다.");
  assert.equal(canWalk(500, 100), false, "도로 밖 잔디에 진입할 수 있습니다.");
  assert.equal(canWalk(10, 10), false, "바다에 진입할 수 있습니다.");
  for (const building of city.buildings) assert.equal(canWalk(building.x, building.y), false);
  for (const landmark of city.landmarks) assert.equal(canWalk(landmark.x, landmark.y), false);
  for (const place of city.locations) assert.equal(canWalk(place.x, place.y), !place.solid);
  for (const road of city.roads.filter(r => r.kind === "ring")) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i-1], b = road.points[i];
      const samples = Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 2);
      for (let n = 0; n <= samples; n++) {
        assert.ok(canWalk(a[0]+(b[0]-a[0])*n/samples, a[1]+(b[1]-a[1])*n/samples), "순환도로가 막혀 있습니다.");
      }
    }
  }
  // 두 야외 장소는 중심선에서 떨어진 바닥도 이동 가능해야 한다.
  for (const place of city.locations.filter(p => !p.solid)) {
    const size = locationSize(place);
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      assert.ok(canWalk(place.x + dx * (size.width / 2 - 5), place.y + dy * (size.height / 2 - 5)));
    }
  }

  // 2논리 좌표 간격으로 연결성을 탐색한다. 연결선도 4등분해 얇은 벽을 뛰어넘지 않게 검사한다.
  const step = 2;
  const start = [city.spawn.x, city.spawn.y + player.footOffset / settings.worldScale];
  const queue = [[0, 0]];
  const visited = new Set(["0,0"]);
  const checked = new Map();
  function reachableStep(x, y, nx, ny) {
    for (let i = 1; i <= 4; i++) if (!canWalk(x + (nx - x) * i / 4, y + (ny - y) * i / 4)) return false;
    return true;
  }
  for (let index = 0; index < queue.length; index++) {
    const [gx, gy] = queue[index];
    const x = start[0] + gx * step, y = start[1] + gy * step;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = gx + dx, ny = gy + dy, key = nx + "," + ny;
      if (visited.has(key)) continue;
      const worldX = start[0] + nx * step, worldY = start[1] + ny * step;
      if (!checked.has(key)) checked.set(key, canWalk(worldX, worldY));
      if (!checked.get(key) || !reachableStep(x, y, worldX, worldY)) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }
  for (const target of city.accessPoints) {
    const name = target.placeId + (target.door ? " " + target.door : "");
    assert.ok(canWalk(target.x, target.y), name + " 문 앞이 막혀 있습니다.");
    const gx = Math.round((target.x - start[0]) / step), gy = Math.round((target.y - start[1]) / step);
    let reachable = false;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (visited.has((gx+dx) + "," + (gy+dy)) && reachableStep(start[0]+(gx+dx)*step, start[1]+(gy+dy)*step, target.x, target.y)) reachable = true;
    }
    assert.ok(reachable, name + "까지 길이 이어지지 않습니다.");
    console.log("접근 가능:", name);
  }

  // 긴 입력도 도로 밖으로 빠져나가지 않아야 한다.
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    player.x = city.spawn.x * settings.worldScale;
    player.y = city.spawn.y * settings.worldScale;
    pressedKeys.clear(); pressedKeys.add(key); update(15);
    assert.ok(canStand(player.x, player.y));
    updateCamera();
    assert.ok(camera.x >= 0 && camera.x <= world.width - canvas.width / settings.cameraZoom);
    assert.ok(camera.y >= 0 && camera.y <= world.height - canvas.height / settings.cameraZoom);
  }
  console.log("통과: 장소 좌표, 오각형·해안선, 도로 제한, 건물·랜드마크 충돌, 야외 바닥, 6개 접근 지점, 카메라");
`, sandbox);
