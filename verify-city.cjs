"use strict";

// 실제 게임의 이동 판정으로 도로 연결과 장애물을 검사한다.
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assert = require("node:assert/strict");

// 선분과 사각형 사이의 최단 거리를 구한다. 도로 폭·둥근 끝·테두리까지 검사하기 위해 사용한다.
function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared)) : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}

function segmentRectangleDistance(a, b, rectangle) {
  const left = rectangle.x - rectangle.width / 2, right = rectangle.x + rectangle.width / 2;
  const top = rectangle.y - rectangle.height / 2, bottom = rectangle.y + rectangle.height / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let enter = 0, leave = 1;
  for (const [p, q] of [[-dx, a[0] - left], [dx, right - a[0]], [-dy, a[1] - top], [dy, bottom - a[1]]]) {
    if (p === 0) {
      if (q < 0) { enter = 2; break; }
    } else if (p < 0) enter = Math.max(enter, q / p);
    else leave = Math.min(leave, q / p);
  }
  if (enter <= leave) return 0;
  const distanceToPoint = point => Math.hypot(Math.max(left - point[0], 0, point[0] - right), Math.max(top - point[1], 0, point[1] - bottom));
  return Math.min(distanceToPoint(a), distanceToPoint(b),
    ...[[left, top], [left, bottom], [right, top], [right, bottom]].map(point => pointSegmentDistance(point, a, b)));
}

assert.equal(segmentRectangleDistance([-5, 0], [5, 0], { x: 0, y: 0, width: 2, height: 2 }), 0);
assert.equal(segmentRectangleDistance([-5, 4], [5, 4], { x: 0, y: 0, width: 2, height: 2 }), 3);
const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) });
const canvas = { width: 1280, height: 720, getContext: () => context, addEventListener() {} };
const sandbox = {
  document: { getElementById: () => canvas, addEventListener() {} },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
  requestAnimationFrame() {},
  assert,
  console,
  segmentRectangleDistance,
};
vm.createContext(sandbox);
for (const file of ["city-data.js", "data/playground.js", "playground.js", "slide.js", "bubbles.js", "data/park.js", "park.js", "data/school.js", "school.js", "data/items.js", "data/ordinary-items.js", "data/cabinet.js", "cabinet.js", "data/diary.js", "diary.js", "data/house.js", "house.js", "data/classroom.js", "classroom.js", "data/objects.js", "data/registry.js", "data/achievement-conditions.js", "data/hints.js", "data/settings.js", "input.js", "game-state.js", "game.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, { filename: file });
}
vm.runInContext(`
  // 도시 그림(1672×941)의 픽셀을 논리 좌표로 쓰고 화면에서는 3배로 키운다.
  assert.equal(city.width, 1672);
  assert.equal(city.height, 941);
  assert.equal(world.width, 5016);
  assert.equal(world.height, 2823);
  assert.equal(settings.cameraZoom, 0.75);
  assert.equal(settings.locationScale, settings.worldScale);
  assert.equal(city.mapImage, "assets/city-map.png");
  assert.equal(city.buildings.length, 0);
  assert.deepEqual(JSON.stringify(city.locations.map(p => [p.id, p.x, p.y])),
    JSON.stringify([["C01",1230,121],["C02",442,125],["C03",1243,562],["C04",365,598],["C05",846,100]]));
  const canWalk = (x, y) => canStand(x * settings.worldScale, y * settings.worldScale - player.footOffset);
  // 집: 남쪽 정문은 잠김, 오른쪽 담장의 나무 쪽문으로 출입한다. 쪽문은 R16 골목을 통해서만 닿는다.
  const house = city.locations.find(place => place.id === "C05");
  assert.equal(house.doors.find(door => door.side === "south").kind, "locked");
  assert.equal(house.doors.find(door => door.side === "east").kind, "side");
  const sideDoor = city.accessPoints.find(point => point.placeId === "C05" && point.door === "east");
  const frontDoor = city.accessPoints.find(point => point.placeId === "C05" && point.door === "south");
  assert.ok(canWalk(sideDoor.x, sideDoor.y));
  assert.ok(canWalk(frontDoor.x, frontDoor.y));
  const allRoads = city.roads;
  try {
    city.roads = allRoads.filter(road => road.id !== "R16");
    assert.equal(canWalk(sideDoor.x, sideDoor.y), false, "쪽문 골목 외의 길이 문 앞으로 직접 연결됩니다.");
  } finally { city.roads = allRoads; }
  assert.ok(canStand(player.x, player.y), "시작점이 보행 구역 밖입니다.");
  // 잔디·나무·연못·건물·화단에는 들어갈 수 없다.
  for (const [x, y, name] of [[150, 150, "왼쪽 위 숲"], [600, 120, "학교와 집 사이 숲"], [820, 450, "가운데 길 옆 잔디"], [1650, 600, "오른쪽 숲"], [100, 900, "왼쪽 아래 개울"]]) {
    assert.equal(canWalk(x, y), false, name + "에 진입할 수 있습니다.");
  }
  for (const landmark of city.landmarks) assert.equal(canWalk(landmark.x, landmark.y), false, landmark.name);
  for (const obstacle of city.obstacles) assert.equal(canWalk(obstacle.x, obstacle.y), false, obstacle.id);
  // 놀이공원 중심에는 회전목마가 있어 보행할 수 없다.
  for (const place of city.locations) assert.equal(canWalk(place.x, place.y), !place.solid && place.id !== PARK_DATA.placeId, place.id);
  // 큰길은 중심선 전체를 걸을 수 있다.
  for (const road of city.roads.filter(r => r.kind === "main")) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i-1], b = road.points[i];
      const samples = Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 2);
      for (let n = 0; n <= samples; n++) {
        assert.ok(canWalk(a[0]+(b[0]-a[0])*n/samples, a[1]+(b[1]-a[1])*n/samples), road.id + " 큰길이 막혀 있습니다.");
      }
    }
  }
  // 놀이터 바닥은 중심선에서 떨어진 곳도 이동 가능해야 한다. 놀이공원은 verify-park.cjs에서 검사한다.
  for (const place of city.locations.filter(p => !p.solid && p.id !== PARK_DATA.placeId)) {
    const size = locationBounds(place);
    const inset = PLAYGROUND_DATA.fenceInset + PLAYGROUND_DATA.fenceThickness + 5;
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      assert.ok(canWalk(size.x + dx * (size.width / 2 - inset), size.y + dy * (size.height / 2 - inset)), place.id + " 모서리");
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
  console.log("통과: 그림 기준 장소 좌표·월드 크기, 잔디·숲·연못·화단 충돌, 쪽문 골목, 큰길, 놀이터 바닥, 6개 접근 지점, 카메라");
`, sandbox);
