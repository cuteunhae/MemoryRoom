"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const pressedKeys = new Set();


// 월드 배율은 논리 좌표 1칸에 대응하는 픽셀 수, 이동 속도는 초당 픽셀 수다.
// TODO: 도시 그림 1픽셀이 화면 3픽셀이 되도록 임시로 정한 배율이다. 플레이 테스트에서 조정한다.
const settings = {
  worldScale: 3,
  locationScale: 3, // 장소 크기를 그림 픽셀 그대로 쓰도록 worldScale과 같게 둔다.
  // TODO: 1보다 작을수록 카메라가 멀어져 더 넓게 보인다. 임시 값이다.
  cameraZoom: 0.75,
  playerSpeed: 630,
  // 그림을 확대할 때 부드럽게 번지게 할지 여부. false면 픽셀이 또렷하게 보인다.
  mapSmoothing: false,
};

// 지도 데이터는 그리기와 이동 판정에서 함께 참조한다.
const city = CITY_DATA;
const world = {
  width: city.width * settings.worldScale,
  height: city.height * settings.worldScale,
};
const camera = { x: 0, y: 0 };
// 도시 그림. 불러오지 못하면 기존 임시 도형으로 그린다.
const cityMapImage = typeof Image === "function" && city.mapImage ? new Image() : null;
if (cityMapImage) {
  cityMapImage.addEventListener("load", () => draw());
  cityMapImage.src = city.mapImage;
}
function cityMapReady() {
  return !!cityMapImage && cityMapImage.complete && cityMapImage.naturalWidth > 0;
}
const scene = {
  interiorId: null,
  schoolFloor: 1,
  returnPoint: null,
  nextTransitionAt: 0,
  message: "",
  messageUntil: 0,
};
const player = {
  x: city.spawn.x * settings.worldScale,
  y: city.spawn.y * settings.worldScale,
  width: 32,
  height: 48,
  facing: "down",
  // TODO: 발밑의 원을 임시 충돌 범위로 사용한다. 최종 캐릭터에 맞춰 조정한다.
  collisionRadius: 10,
  footOffset: 18,
};

// 다른 창이나 탭으로 이동할 때 키가 눌린 상태로 남지 않도록 처리한다.
window.addEventListener("blur", () => pressedKeys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pressedKeys.clear();
});
canvas.addEventListener("pointerdown", handleDoorClick);

function currentInterior() {
  const interior = city.interiors.find(interior => interior.placeId === scene.interiorId) || null;
  // 학교는 층마다 크기가 다르다(1층만 작게). 정문은 1층에만 있다.
  if (interior?.placeId === SCHOOL_DATA.placeId) return { ...interior, name: schoolFloor().name, width: schoolFloor().size, height: schoolFloor().size, exit: scene.schoolFloor === 1 ? interior.exit : null };
  return interior;
}

// 문 위치(논리 좌표). x·y를 직접 적은 문은 그대로 쓰고, 아니면 건물 변(side)과 offset으로 계산한다.
function doorRectangle(building, door) {
  const width = door.width ?? 10, height = door.height ?? 4;
  if (Number.isFinite(door.x) && Number.isFinite(door.y)) return { x: door.x, y: door.y, width, height };
  const horizontal = door.side === "north" || door.side === "south";
  return {
    x: horizontal ? building.x + building.width * (door.offset ?? 0) : building.x + (door.side === "west" ? -1 : 1) * building.width / 2,
    y: horizontal ? building.y + (door.side === "north" ? -1 : 1) * building.height / 2 : building.y + building.height * (door.offset ?? 0),
    width,
    height,
  };
}

function outdoorDoors() {
  return city.locations.flatMap(place => (place.doors || []).map(door => {
    const rectangle = doorRectangle(locationBounds(place), door);
    const approach = city.accessPoints.find(point => point.placeId === place.id && (!point.door || point.door === door.side));
    return {
      placeId: place.id,
      kind: door.kind,
      side: door.side,
      x: rectangle.x * settings.worldScale,
      y: rectangle.y * settings.worldScale,
      width: rectangle.width * settings.worldScale,
      height: rectangle.height * settings.worldScale,
      hintX: (rectangle.x + (door.hintOffset?.x ?? 0)) * settings.worldScale,
      hintY: (rectangle.y + (door.hintOffset?.y ?? 0)) * settings.worldScale,
      approach: approach ? { x: approach.x * settings.worldScale, footY: approach.y * settings.worldScale } : null,
    };
  }));
}

function nearOutdoorDoor(target) {
  if (!target.approach) return false;
  const footY = player.y + player.footOffset;
  if (Math.hypot(player.x - target.approach.x, footY - target.approach.footY) > city.entrances.interactDistance) return false;
  // 문 바깥쪽에 서 있어야 한다. 북쪽 문은 위, 남쪽 문은 아래, 동쪽 문은 오른쪽, 서쪽 문은 왼쪽이다.
  const outside = { north: footY <= target.y, south: footY >= target.y, east: player.x >= target.x, west: player.x <= target.x };
  if (!outside[target.side]) return false;
  // 문 가까이에 있어도 벽이나 잔디를 가로질러 출입하지 않도록 접근 지점까지 검사한다.
  const steps = Math.max(1, Math.ceil(Math.hypot(player.x - target.approach.x, footY - target.approach.footY) / 5));
  for (let i = 0; i <= steps; i++) {
    const x = player.x + (target.approach.x - player.x) * i / steps;
    const y = footY + (target.approach.footY - footY) * i / steps - player.footOffset;
    if (!canStandCity(x, y)) return false;
  }
  return true;
}

function nearInteriorExit(interior) {
  return !!interior.exit && Math.hypot(player.x - interior.exit.x, player.y + player.footOffset - interior.exit.y) <= city.entrances.interactDistance;
}

function showDoorMessage(message) {
  scene.message = message;
  scene.messageUntil = Date.now() + city.entrances.messageDurationMs;
}

function enterInterior(target) {
  if (scene.interiorId || Date.now() < scene.nextTransitionAt || !nearOutdoorDoor(target)) return false;
  if (target.kind === "locked" || (target.placeId === "C05" && target.kind !== "side")) {
    showDoorMessage(city.interiorUi.locked);
    return false;
  }
  const interior = city.interiors.find(room => room.placeId === target.placeId);
  if (!interior) return false;
  const returnPoint = {
    x: target.approach.x,
    y: target.approach.footY - player.footOffset,
    facing: { north: "up", south: "down", east: "right", west: "left" }[target.side],
  };
  if (!canStandCity(returnPoint.x, returnPoint.y) ||
      !canStandInterior(interior.spawn.x, interior.spawn.footY - player.footOffset, interior)) return false;
  scene.schoolFloor = 1;
  scene.returnPoint = returnPoint;
  scene.interiorId = interior.placeId;
  player.x = interior.spawn.x;
  player.y = interior.spawn.footY - player.footOffset;
  player.facing = interior.spawn.facing;
  finishMapTransition();
  return true;
}

function exitInterior() {
  const interior = currentInterior();
  if (!interior || Date.now() < scene.nextTransitionAt || !nearInteriorExit(interior)) return false;
  const returnPoint = scene.returnPoint;
  if (!returnPoint || !canStandCity(returnPoint.x, returnPoint.y)) return false;
  scene.interiorId = null;
  scene.returnPoint = null;
  Object.assign(player, returnPoint);
  finishMapTransition();
  return true;
}

function finishMapTransition() {
  if (inspectionUiState.mode === "cabinet") closeInspection();
  else restoreUnsolvedCabinet();
  // 학교를 나가면 열어 둔 문을 모두 닫는다(층 이동은 유지).
  if (scene.interiorId !== SCHOOL_DATA.placeId) schoolDoorUi.open.clear();
  // 집을 나가면 안방 문을 닫는다.
  if (scene.interiorId !== HOUSE_DATA.placeId) houseDoorUi.bedroomOpen = false;
  clearBubbleEffects();
  // 누르고 있던 방향키와 이전 화면의 시간 차가 새 맵에 남지 않게 한다.
  pressedKeys.clear();
  previousTime = null;
  scene.message = "";
  scene.nextTransitionAt = Date.now() + city.entrances.cooldownMs;
  if (typeof saveProgress === "function") saveProgress();
  updateCamera();
  draw();
}

function handleDoorClick(event) {
  stopBubbleDrag();
  if (isGameInputBlocked()) return;
  canvas.focus();
  if (event.button !== 0 || Date.now() < scene.nextTransitionAt) return;
  const rectangle = canvas.getBoundingClientRect();
  if (!rectangle.width || !rectangle.height) return;
  // 화면 크기·카메라 위치·줌을 반영해 클릭을 현재 맵의 좌표로 바꾼다.
  const x = (event.clientX - rectangle.left) * canvas.width / rectangle.width / settings.cameraZoom + camera.x;
  const y = (event.clientY - rectangle.top) * canvas.height / rectangle.height / settings.cameraZoom + camera.y;
  const hit = target => Math.abs(x - target.x) <= target.width / 2 + city.entrances.clickPadding &&
    Math.abs(y - target.y) <= target.height / 2 + city.entrances.clickPadding;
  const interior = currentInterior();
  if (interior) {
    if (interior.placeId === HOUSE_DATA.placeId && handleHouseClick(x, y)) return;
    if (interior.placeId === SCHOOL_DATA.placeId && handleSchoolStairs(x, y)) return;
    if (interior.placeId === SCHOOL_DATA.placeId && handleSchoolDoorClick(x, y)) return;
    const object = inspectionObjectsFor(interior).sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y)).find(object =>
      Math.abs(x - object.x) <= object.width / 2 + (object.clickPadding || 0) && Math.abs(y - object.y) <= object.height / 2 + (object.clickPadding || 0));
    if (object) {
      if (!canInspectSchoolObject(object) || Math.hypot(Math.max(0, Math.abs(player.x - object.x) - object.width / 2), Math.max(0, Math.abs(player.y + player.footOffset - object.y) - object.height / 2)) > object.interactDistance) {
        showDoorMessage(object.messages.tooFar);
      } else {
        openInspection(object);
      }
      return;
    }
    if (!interior.exit || !hit(interior.exit)) {
      startBubbleDrag(event, x, y);
      return;
    }
    if (!nearInteriorExit(interior)) showDoorMessage(city.interiorUi.tooFar);
    else exitInterior();
    return;
  }
  if (handleParkClick(x, y)) return;
  if (handlePlaygroundClick(x, y)) return;
  const target = outdoorDoors().find(hit);
  if (!target) {
    startBubbleDrag(event, x, y);
    return;
  }
  if (!nearOutdoorDoor(target)) showDoorMessage(city.interiorUi.tooFar);
  else enterInterior(target);
}

// 창 크기에 맞춰 실제 그리기 영역을 바꿔 화면이 늘어나거나 찌그러지는 것을 막는다.
function resizeCanvas() {
  canvas.width = Math.max(1, window.innerWidth);
  canvas.height = Math.max(1, window.innerHeight);
  updateCamera();
  draw();
}
window.addEventListener("resize", resizeCanvas);

function update(deltaSeconds) {
  player.moving = false;
  if (isGameInputBlocked()) return;
  let dx = Number(pressedKeys.has("ArrowRight")) - Number(pressedKeys.has("ArrowLeft"));
  let dy = Number(pressedKeys.has("ArrowDown")) - Number(pressedKeys.has("ArrowUp"));
  const length = Math.hypot(dx, dy);
  if (length === 0) return;
  player.moving = true;

  if (dy !== 0) player.facing = dy > 0 ? "down" : "up";
  else player.facing = dx > 0 ? "right" : "left";

  // 대각선 이동도 상하좌우 이동과 같은 속도를 사용한다.
  dx /= length;
  dy /= length;
  // 작은 간격으로 나눠 검사해 벽이나 해안선을 뛰어넘지 않도록 한다.
  const distance = settings.playerSpeed * deltaSeconds;
  const steps = Math.max(1, Math.ceil(distance / (player.collisionRadius / 2)));
  for (let step = 0; step < steps; step += 1) {
    const nextX = player.x + dx * distance / steps;
    if (canStand(nextX, player.y)) player.x = nextX;
    const nextY = player.y + dy * distance / steps;
    if (canStand(player.x, nextY)) player.y = nextY;
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function pointInIsland(x, y) {
  return pointInPolygon(x, y, city.coast);
}

function distanceToSegment(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(x - a[0], y - a[1]);
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function circleInsidePolygon(x, y, radius, points) {
  if (!pointInPolygon(x, y, points)) return false;
  return points.every((point, i) => distanceToSegment(x, y, point, points[(i + 1) % points.length]) >= radius);
}

function circleHitsRectangle(x, y, radius, rectangle) {
  const nearestX = Math.max(rectangle.x - rectangle.width / 2, Math.min(rectangle.x + rectangle.width / 2, x));
  const nearestY = Math.max(rectangle.y - rectangle.height / 2, Math.min(rectangle.y + rectangle.height / 2, y));
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function isWalkableSurface(x, y, radius) {
  // 놀이공원·놀이터 바닥은 사용자의 요청에 따라 전체를 보행 구역으로 취급한다.
  for (const place of city.locations) {
    if (place.solid) continue;
    if (place.walkArea) {
      if (circleInsidePolygon(x, y, radius, place.walkArea)) return true;
      continue;
    }
    const bounds = locationBounds(place);
    if (Math.abs(x - bounds.x) <= bounds.width / 2 - radius &&
        Math.abs(y - bounds.y) <= bounds.height / 2 - radius) return true;
  }
  // 둥근 도로 끝과 교차로도 도로 중심선·폭으로 판정한다.
  return city.roads.some(road => road.points.some((point, i) =>
    i > 0 && distanceToSegment(x, y, road.points[i - 1], point) <= road.width / 2 - radius));
}

function hitsLandmark(x, y, radius, landmark) {
  if (landmark.type === "clock") return circleHitsRectangle(x, y, radius, landmark);
  if (landmark.type === "pond") {
    return ((x - landmark.x) / (landmark.radiusX + radius)) ** 2 +
      ((y - landmark.y) / (landmark.radiusY + radius)) ** 2 < 1;
  }
  const obstacleRadius = landmark.type === "tree" ? landmark.trunkRadius : landmark.radius;
  return Math.hypot(x - landmark.x, y - landmark.y) < obstacleRadius + radius;
}

function canStand(x, y) {
  const interior = currentInterior();
  return interior ? canStandInterior(x, y, interior) : canStandCity(x, y);
}

// 발밑 원의 가운데와 상하좌우 끝점이 모두 바닥 안이고 가구에 닿지 않으면 설 수 있다.
function pictureCanStand(x, footY, radius, picture) {
  const points = [[x, footY], [x - radius, footY], [x + radius, footY], [x, footY - radius], [x, footY + radius]];
  if (!points.every(([px, py]) => picture.walkableRects.some(rect => insideRect(px, py, rect)))) return false;
  return !picture.obstacleRects.some(rect => circleHitsRectangle(x, footY, radius, rect));
}

function canStandInterior(x, y, interior) {
  const footY = y + player.footOffset;
  if (interior.placeId === HOUSE_DATA.placeId && houseObstacles().some(rectangle => circleHitsRectangle(x, footY, player.collisionRadius, rectangle))) return false;
  // 학교는 그림의 바닥 사각형 안만 걸을 수 있다.
  if (interior.placeId === SCHOOL_DATA.placeId && !schoolCanStand(x, footY, player.collisionRadius)) return false;
  // 사진관·집은 그림의 바닥 사각형 안만 걸을 수 있고 가구는 지나가지 못한다.
  if (interior.picture && !pictureCanStand(x, footY, player.collisionRadius, interior.picture)) return false;
  if (inspectionObjectsFor(interior).some(object => object.solid && circleHitsRectangle(x, footY, player.collisionRadius, object))) return false;
  if (inspectionObjectsFor(interior).some(object => object.table &&
      circleHitsRectangle(x, footY, player.collisionRadius, object.table))) return false;
  return x - player.width / 2 >= interior.wall && x + player.width / 2 <= interior.width - interior.wall &&
    y - player.height / 2 >= interior.wall && y + player.height / 2 <= interior.height - interior.wall &&
    footY - player.collisionRadius >= interior.wall && footY + player.collisionRadius <= interior.height - interior.wall;
}

function canStandCity(x, y) {
  // 캐릭터 전체가 픽셀 기준 월드 경계를 넘지 못하게 한다.
  if (x < player.width / 2 || x > world.width - player.width / 2 ||
      y < player.height / 2 || y > world.height - player.height / 2) return false;

  // 발밑 충돌 원을 논리 좌표로 변환해 원본 도시 배치와 비교한다.
  const logicalX = x / settings.worldScale;
  const footY = (y + player.footOffset) / settings.worldScale;
  const radius = player.collisionRadius / settings.worldScale;
  if (!circleInsidePolygon(logicalX, footY, radius, city.frame) ||
      !circleInsidePolygon(logicalX, footY, radius, city.coast)) return false;
  if (!isWalkableSurface(logicalX, footY, radius)) return false;
  if (hitsPark(x, y + player.footOffset, player.collisionRadius)) return false;
  if (hitsPlayground(x, y + player.footOffset, player.collisionRadius)) return false;
  for (const place of city.locations) {
    if (!place.solid) continue;
    if (circleHitsRectangle(logicalX, footY, radius, locationBounds(place))) return false;
  }
  if (city.buildings.some(building => circleHitsRectangle(logicalX, footY, radius, building))) return false;
  if ((city.obstacles || []).some(obstacle => circleHitsRectangle(logicalX, footY, radius, obstacle))) return false;
  if (city.landmarks.some(landmark => hitsLandmark(logicalX, footY, radius, landmark))) return false;
  return true;
}

function updateCamera() {
  // 줌인 후 화면에 보이는 월드 범위로 추적과 경계를 계산한다.
  const viewWidth = canvas.width / settings.cameraZoom;
  const viewHeight = canvas.height / settings.cameraZoom;
  const bounds = currentInterior() || world;
  // 화면보다 작은 실내는 가운데에 두고, 큰 실내에서는 플레이어를 따라간다.
  camera.x = viewWidth >= bounds.width ? (bounds.width - viewWidth) / 2 : Math.max(0, Math.min(bounds.width - viewWidth, player.x - viewWidth / 2));
  camera.y = viewHeight >= bounds.height ? (bounds.height - viewHeight) / 2 : Math.max(0, Math.min(bounds.height - viewHeight, player.y - viewHeight / 2));
}

function locationSize(place) {
  // 장소 크기를 월드 배율과 별도로 정하고 충돌용 논리 좌표로 환산한다.
  const scale = settings.locationScale / settings.worldScale;
  return { width: place.width * scale, height: place.height * scale };
}

function locationBounds(place) {
  // 기획서 대표점과 실제 건물 영역을 분리하고, 그리기·문 위치·충돌에 같은 영역을 사용한다.
  return {
    ...place,
    ...locationSize(place),
    x: place.x + (place.offset?.x ?? 0),
    y: place.y + (place.offset?.y ?? 0),
  };
}

function tracePath(points, close = false) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  if (close) ctx.closePath();
}

function drawCity() {
  if (cityMapReady()) {
    ctx.save();
    ctx.imageSmoothingEnabled = settings.mapSmoothing;
    ctx.drawImage(cityMapImage, 0, 0, city.width, city.height);
    ctx.restore();
    return;
  }
  tracePath(city.frame, true);
  ctx.fillStyle = "#a9cdd4";
  ctx.fill();
  ctx.strokeStyle = "#668c93";
  ctx.lineWidth = 4;
  ctx.stroke();

  tracePath(city.coast, true);
  ctx.fillStyle = "#dbe3ce";
  ctx.fill();
  ctx.strokeStyle = "#eee0b9";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.save();
  tracePath(city.coast, true);
  ctx.clip();
  // 바닥 무늬는 카메라가 아닌 도시 좌표에 고정한다.
  ctx.fillStyle = "#c5d3b6";
  for (let x = 32; x < city.width; x += 48) {
    for (let y = 32; y < city.height; y += 48) ctx.fillRect(x, y, 3, 3);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // 모든 도로의 테두리를 먼저 그려 교차로 가운데에 테두리가 남지 않게 한다.
  for (const road of city.roads) {
    tracePath(road.points);
    ctx.strokeStyle = "#e7deca";
    ctx.lineWidth = road.width + 3;
    ctx.stroke();
  }
  for (const road of city.roads) {
    tracePath(road.points);
    ctx.strokeStyle = road.kind === "alley" ? "#a69f8e" : "#92948c";
    ctx.lineWidth = road.width;
    ctx.stroke();
  }
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#eee2b0";
  ctx.lineWidth = 0.8;
  for (const road of city.roads.filter(road => road.kind === "ring")) {
    tracePath(road.points);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // 야외 장소의 바닥을 먼저 깔고 일반 건물과 주요 건물을 그린다.
  for (const place of city.locations) {
    if (place.solid) continue;
    const { x, y, width, height } = locationBounds(place);
    const left = x - width / 2;
    const top = y - height / 2;
    ctx.fillStyle = place.color;
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = "#ffffff35";
    ctx.lineWidth = 0.6;
    for (let x = left + 10; x < left + width; x += 10) {
      tracePath([[x, top], [x, top + height]]);
      ctx.stroke();
    }
    for (let y = top + 10; y < top + height; y += 10) {
      tracePath([[left, y], [left + width, y]]);
      ctx.stroke();
    }
  }
  for (const building of city.buildings) drawBuilding(building);
  for (const place of city.locations) {
    if (place.solid) drawBuilding(locationBounds(place));
  }
  for (const landmark of city.landmarks) drawLandmark(landmark);
}

function drawBuilding(building) {
  const { x, y, width, height } = building;
  const left = x - width / 2;
  const top = y - height / 2;
  ctx.fillStyle = "#45503a24";
  ctx.fillRect(left + 3, top + 3, width, height);
  ctx.fillStyle = building.color;
  ctx.fillRect(left, top, width, height);
  ctx.strokeStyle = "#746e60";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
  ctx.fillStyle = "#ffffff30";
  ctx.fillRect(left + 2, top + 2, width - 4, Math.max(3, height * 0.14));
  ctx.strokeStyle = "#746e6040";
  tracePath([[left + 3, y], [left + width - 3, y]]);
  ctx.stroke();
  ctx.fillStyle = "#f5e8be";
  for (let wx = left + 5; wx < left + width - 5; wx += 14) {
    ctx.fillRect(wx, top + height * 0.68, 5, Math.min(6, height * 0.16));
  }
  for (const door of building.doors || []) {
    const { x: doorX, y: doorY, width: doorWidth, height: doorHeight } = doorRectangle(building, door);
    ctx.fillStyle = door.kind === "locked" ? "#6e5547" : "#45675c";
    ctx.fillRect(doorX - doorWidth / 2, doorY - doorHeight / 2, doorWidth, doorHeight);
    ctx.fillStyle = "#f2db9d";
    ctx.fillRect(doorX + 2, doorY - 0.5, 1, 1);
    if (door.kind === "locked") {
      ctx.strokeStyle = "#d7c3a0";
      ctx.lineWidth = 0.8;
      tracePath([[doorX - 4, doorY - 1], [doorX + 4, doorY + 1]]);
      ctx.stroke();
    }
  }
}

function fillEllipse(x, y, radiusX, radiusY, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLandmark(landmark) {
  const { x, y, type } = landmark;
  if (type === "fountain") {
    fillEllipse(x, y, landmark.radius, landmark.radius, "#9caaab");
    fillEllipse(x, y, landmark.radius - 2, landmark.radius - 2, "#8fc6d6");
    fillEllipse(x, y, 4, 4, "#d8e5df");
    ctx.strokeStyle = "#effcff";
    ctx.lineWidth = 1;
    for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dx, y + dy - 5, x + dx, y + dy);
      ctx.stroke();
    }
  } else if (type === "clock") {
    ctx.fillStyle = "#9c8066";
    ctx.fillRect(x - landmark.width / 2, y - landmark.height / 2, landmark.width, landmark.height);
    ctx.fillStyle = "#6d7770";
    ctx.fillRect(x - 9, y - 11, 18, 4);
    fillEllipse(x, y - 1, 6, 6, "#f8efd7");
    ctx.strokeStyle = "#665b4d";
    ctx.lineWidth = 1;
    tracePath([[x, y - 5], [x, y - 1], [x + 3, y + 1]]);
    ctx.stroke();
  } else if (type === "pond") {
    fillEllipse(x, y, landmark.radiusX + 2, landmark.radiusY + 2, "#bdcda7");
    fillEllipse(x, y, landmark.radiusX, landmark.radiusY, "#82b5c4");
    ctx.strokeStyle = "#c3e3e4";
    ctx.lineWidth = 1;
    for (const offset of [-6, 1, 8]) {
      tracePath([[x - 9, y + offset], [x - 2, y + offset + 1], [x + 7, y + offset]]);
      ctx.stroke();
    }
  } else if (type === "tree") {
    fillEllipse(x + 3, y + 3, landmark.radius, landmark.radius * 0.8, "#45503a24");
    fillEllipse(x, y, landmark.trunkRadius, landmark.trunkRadius, "#80634b");
    fillEllipse(x, y - 5, landmark.radius, landmark.radius * 0.8, "#82a072");
    fillEllipse(x - 5, y - 9, landmark.radius * 0.55, landmark.radius * 0.5, "#9bb789");
  }
}

function drawDebug() {
  if (!city.debug) return;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  for (const place of city.locations) {
    const bounds = locationBounds(place);
    ctx.fillStyle = "#292f35";
    ctx.fillText(`${place.id} ${place.name} (${place.x}, ${place.y})`, bounds.x, bounds.y - bounds.height / 2 - 10);
    ctx.fillRect(place.x - 2, place.y - 2, 4, 4);
  }
  for (const landmark of city.landmarks) {
    ctx.fillText(`${landmark.id} ${landmark.name}`, landmark.x, landmark.y - 25);
  }
  ctx.fillStyle = "#b93d4e";
  for (const point of city.accessPoints) ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
}

// 플레이어 그림. 걷기 그림은 4칸×4줄이며 줄 순서는 아래·위·왼쪽·오른쪽이다. 아래를 보고 서 있을 때만 정면 그림을 쓴다.
// TODO: 그림 높이와 걸음 속도는 임시 값이다. 플레이 테스트에서 조정한다.
const PLAYER_SPRITE = {
  front: "assets/player-front.png", walk: "assets/player-walk.png",
  columns: 4, rows: { down: 0, up: 1, left: 2, right: 3 }, rowCount: 4,
  height: 56, feetOffset: 24, frameMs: 140,
  // 장소별 그림 배율. 사용자 요청: 학교에서만 1.5배로 그린다. 부딪히는 범위는 그대로다.
  placeScale: { C02: 1.5 },
};

// 현재 장소에서 플레이어를 그릴 배율.
function playerDrawScale() {
  return PLAYER_SPRITE.placeScale[scene.interiorId] ?? 1;
}

// 플레이어 그림을 발끝에 맞춰 그린다. 그림이 준비되지 않았으면 false를 돌려준다.
function drawPlayerSprite(x, y) {
  const config = PLAYER_SPRITE;
  const front = objectSpriteImage(config.front), walk = objectSpriteImage(config.walk);
  const top = y + config.feetOffset - config.height;
  if (!player.moving && player.facing === "down") {
    if (!front) return false;
    const width = config.height * front.naturalWidth / front.naturalHeight;
    ctx.drawImage(front, x - width / 2, top, width, config.height);
    return true;
  }
  if (!walk) return false;
  const cellWidth = walk.naturalWidth / config.columns, cellHeight = walk.naturalHeight / config.rowCount;
  const frame = player.moving ? Math.floor(Date.now() / config.frameMs) % config.columns : 0;
  const width = config.height * cellWidth / cellHeight;
  ctx.drawImage(walk, frame * cellWidth, config.rows[player.facing] * cellHeight, cellWidth, cellHeight, x - width / 2, top, width, config.height);
  return true;
}

// 발끝을 기준으로 배율을 적용해 플레이어를 그린다. 발 위치는 그대로라 걷는 위치가 달라 보이지 않는다.
function drawPlayer() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const scale = playerDrawScale(), feetY = y + PLAYER_SPRITE.feetOffset;
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);
  ctx.translate(-x, -feetY);
  drawPlayerBody(x, y);
  ctx.restore();
}

function drawPlayerBody(x, y) {
  ctx.fillStyle = "#00000018";
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (drawPlayerSprite(x, y)) return;

  // 임시 캐릭터: 신발, 바지, 상의, 얼굴, 머리카락.
  ctx.fillStyle = "#485159";
  ctx.fillRect(x - 10, y + 10, 8, 14);
  ctx.fillRect(x + 2, y + 10, 8, 14);
  ctx.fillStyle = "#b46e4f";
  ctx.fillRect(x - 13, y - 4, 26, 19);
  ctx.fillStyle = "#efd0ac";
  ctx.fillRect(x - 16, y + 2, 4, 10);
  ctx.fillRect(x + 12, y + 2, 4, 10);
  ctx.fillRect(x - 11, y - 20, 22, 19);
  ctx.fillStyle = "#514237";
  ctx.fillRect(x - 12, y - 24, 24, 8);
  ctx.fillRect(x - 12, y - 16, 4, 8);
  ctx.fillRect(x + 8, y - 16, 4, 8);

  if (player.facing === "up") {
    ctx.fillRect(x - 11, y - 20, 22, 17);
  } else {
    ctx.fillStyle = "#3e3935";
    if (player.facing !== "right") ctx.fillRect(x - 6, y - 11, 3, 3);
    if (player.facing !== "left") ctx.fillRect(x + 3, y - 11, 3, 3);
  }
}

// 실내 그림을 그린다. 그림을 불러오지 못하면 바닥과 가구를 임시 색 블록으로 그린다.
function drawInteriorPicture(interior) {
  const picture = interior.picture, image = objectSpriteImage(picture.src);
  if (image) {
    ctx.drawImage(image, 0, 0, interior.width, interior.height);
    return;
  }
  ctx.fillStyle = interior.wallColor;
  ctx.fillRect(0, 0, interior.width, interior.height);
  ctx.fillStyle = interior.floorColor;
  for (const rect of picture.walkableRects) ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
  ctx.fillStyle = interior.wallColor;
  for (const rect of picture.obstacleRects) ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
}

function drawInterior(interior) {
  // 학교·사진관·집은 그림이 바닥·벽을 모두 그린다.
  if (interior.placeId === SCHOOL_DATA.placeId) drawSchool();
  else drawInteriorPicture(interior);
  if (interior.placeId === HOUSE_DATA.placeId) drawHouse();
  const exit = interior.exit;
  if (exit) {
  ctx.font = "16px 'Malgun Gothic', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#45675c";
  // 출입문은 그림에 있으므로 '나가기' 글자 상자만 작게 그린다.
  ctx.fillRect(exit.x - 48, exit.y - 16, 96, 32);
  ctx.fillStyle = "#f5eee3";
  ctx.textAlign = "center";
  ctx.fillText(city.interiorUi.exitLabel, exit.x, exit.y);
  }
  ctx.textAlign = "center";
  for (const object of inspectionObjectsFor(interior)) {
    const table = object.table;
    if (table && !table.hidden) {
      ctx.fillStyle = table.color;
      ctx.fillRect(table.x - table.width / 2, table.y - table.height / 2, table.width, table.height);
      ctx.strokeStyle = "#76583f";
      ctx.strokeRect(table.x - table.width / 2, table.y - table.height / 2, table.width, table.height);
    }
    // hidden 물체는 그림에 이미 있으므로 그리지 않는다(클릭·충돌은 그대로).
    if (object.hidden) continue;
    // 그림이 있는 물체는 그림만 그린다.
    if (object.sprite && drawObjectSprite(object)) continue;
    ctx.fillStyle = object.color;
    ctx.fillRect(object.x - object.width / 2, object.y - object.height / 2, object.width, object.height);
    ctx.fillStyle = "#fff8e9";
    ctx.font = "14px 'Malgun Gothic', sans-serif";
    ctx.fillText(object.label ?? object.name, object.x, object.y);
  }
}

// 조사 물체 그림을 경로마다 한 번만 불러 둔다. 다 불러오지 못했으면 null이다.
const objectSpriteImages = {};
function objectSpriteImage(src) {
  if (typeof Image !== "function") return null;
  if (!objectSpriteImages[src]) {
    const image = new Image();
    image.src = src;
    objectSpriteImages[src] = image;
  }
  const image = objectSpriteImages[src];
  return image.complete && image.naturalWidth > 0 ? image : null;
}

// 그림을 sprite 크기(없으면 물체 크기) 안에 비율대로 맞추고, 그림 아래쪽을 물체 범위 아래쪽에 맞춰 그린다.
function drawObjectSprite(object) {
  const image = objectSpriteImage(object.sprite.src);
  if (!image) return false;
  const boxWidth = object.sprite.width ?? object.width, boxHeight = object.sprite.height ?? object.height;
  const scale = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, object.x - width / 2, object.y + object.height / 2 - height, width, height);
  return true;
}

// 상호작용 키로 열 수 있는 가까운 물체(messages.keyHint가 있는 인물·게시판·명부). 없으면 null이다.
function nearbyKeyObject() {
  const interior = currentInterior();
  if (!interior) return null;
  const footY = player.y + player.footOffset;
  const distance = object => Math.hypot(Math.max(0, Math.abs(player.x - object.x) - object.width / 2), Math.max(0, Math.abs(footY - object.y) - object.height / 2));
  // 여럿이 가까우면 가장 가까운 대상에 반응한다.
  // 특정 방 안에서만 조사할 수 있는 물체는 벽 너머에서 반응하지 않는다.
  return inspectionObjectsFor(interior).filter(object => object.messages?.keyHint && distance(object) <= object.interactDistance && canInspectSchoolObject(object))
    .sort((a, b) => distance(a) - distance(b))[0] || null;
}

// 상호작용 키: 가까운 인물과 대화하거나 게시판·명부를 연다. 열었으면 true를 돌려준다.
function interactNearbyObject() {
  const object = nearbyKeyObject();
  if (!object) return false;
  openInspection(object);
  return true;
}

// 가까운 인물·게시판·명부의 화면 안내 문구. 키가 지정되지 않았으면 클릭 안내만 보여 준다.
function keyObjectHint() {
  const object = nearbyKeyObject();
  if (!object) return "";
  const key = interactKeyLabel();
  return key ? object.messages.keyHint.replace("{key}", key) : object.messages.keyHintClick;
}

// 상호작용 키: 가까운 입구로 들어가거나 가까운 출구로 나간다. 잠긴 문이면 잠금 안내를 보여 준다.
function interactNearbyEntrance() {
  if (currentInterior()) return exitInterior();
  const target = outdoorDoors().find(nearOutdoorDoor);
  return target ? enterInterior(target) : false;
}

// 가까운 입구·출구의 안내 문구. 잠긴 문은 키 안내를 하지 않는다. 키가 지정되지 않았으면 클릭 안내만 보여 준다.
function entranceKeyHint() {
  const interior = currentInterior(), text = city.interiorUi;
  // 키 이름은 안내가 필요할 때만 읽는다.
  const format = (keyText, clickText) => {
    const key = interactKeyLabel();
    return key ? keyText.replace("{key}", key) : clickText;
  };
  if (interior) return nearInteriorExit(interior) ? format(text.exit, text.exitClick) : "";
  const target = outdoorDoors().find(nearOutdoorDoor);
  return target && target.kind !== "locked" ? format(text.enter, text.enterClick) : "";
}

// 상호작용 키 안내 상자의 크기와 대상까지의 간격. 단위는 화면 픽셀이다.
// TODO: 크기와 간격은 임시 값이다. 플레이 테스트에서 조정한다.
const KEY_HINT_BOX = { height: 30, paddingX: 12, gap: 4, arrow: 6, margin: 8 };

// 안내 상자의 화면 위치를 구한다. anchor는 게임 좌표이고, center가 true면 상자 가운데를 그 점에 맞추고 아니면 그 점 바로 위에 놓는다.
// 화면 밖으로 나가지 않게 안쪽으로 밀어 넣는다.
function keyHintBox(textWidth, anchor) {
  const box = KEY_HINT_BOX, width = Math.min(textWidth + box.paddingX * 2, canvas.width - box.margin * 2);
  const anchorX = (anchor.x - camera.x) * settings.cameraZoom;
  const anchorY = (anchor.y - camera.y) * settings.cameraZoom;
  const x = Math.max(box.margin, Math.min(canvas.width - box.margin - width, anchorX - width / 2));
  const wanted = anchor.center ? anchorY - box.height / 2 : anchorY - box.gap - box.arrow - box.height;
  const y = Math.max(box.margin, Math.min(canvas.height - box.margin - box.height, wanted));
  return { x, y, width, height: box.height, anchorX, anchorY };
}

// 지금 보여 줄 상호작용 키 안내와 그 위치. 상호작용 키가 반응하는 순서와 같다. 없으면 null이다.
// 사용자 결정: NPC는 머리 바로 위, 그 밖의 대상(게시판·문·계단·입구·출구)은 대상 한가운데에 표시한다.
function currentKeyHint() {
  const target = schoolKeyTarget();
  if (target === "stairs") {
    const stairs = schoolStairs();
    return { text: schoolStairsHint(), x: stairs.x, y: stairs.y, center: true };
  }
  if (target) {
    const rect = target.pictureRect;
    return { text: schoolDoorHint(), x: rect.x, y: rect.y, center: true };
  }
  if (nearHouseBedroomDoor()) {
    const rect = houseBedroomDoor().picture;
    return { text: houseBedroomDoorHint(), x: rect.x, y: rect.y, center: true };
  }
  const object = nearbyKeyObject();
  if (object) {
    if (object.type !== "dialogue") {
      // 클릭 범위가 그림보다 넓은 물체는 그림(pictureRect)의 가운데를 쓴다.
      const rect = object.pictureRect ?? object;
      return { text: keyObjectHint(), x: rect.x, y: rect.y, center: true };
    }
    // NPC는 그림의 머리 위다.
    return { text: keyObjectHint(), x: object.x, y: object.y + object.height / 2 - (object.sprite?.height ?? object.height) };
  }
  const text = entranceKeyHint();
  if (!text) return null;
  const interior = currentInterior();
  if (interior) return { text, x: interior.exit.x, y: interior.exit.y, center: true };
  const door = outdoorDoors().find(nearOutdoorDoor);
  return { text, x: door.hintX, y: door.hintY, center: true };
}

// 상호작용 키 안내를 대상에 맞춰 그린다. 창이 열려 있으면 그리지 않는다.
function drawKeyHint() {
  if (isGameInputBlocked()) return;
  const hint = currentKeyHint();
  if (!hint) return;
  ctx.save();
  ctx.font = "15px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rect = keyHintBox(ctx.measureText(hint.text).width, hint);
  ctx.fillStyle = "#26342df2";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  // 상자가 NPC 머리 위에 있을 때만 머리를 가리키는 작은 삼각형을 그린다.
  const bottom = rect.y + rect.height;
  if (!hint.center && bottom + KEY_HINT_BOX.arrow <= rect.anchorY) {
    tracePath([[rect.anchorX - KEY_HINT_BOX.arrow, bottom], [rect.anchorX + KEY_HINT_BOX.arrow, bottom], [rect.anchorX, bottom + KEY_HINT_BOX.arrow]], true);
    ctx.fill();
  }
  ctx.fillStyle = "#fff8e9";
  ctx.fillText(hint.text, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width - 8);
  ctx.restore();
}

function drawDoorHint() {
  const interior = currentInterior();
  let message = scene.messageUntil > Date.now() ? scene.message : "";
  if (!message && !interior) {
    const target = outdoorDoors().find(nearOutdoorDoor);
    if (target?.kind === "locked") message = city.interiorUi.locked;
  }
  if (!message) return;
  ctx.save();
  const width = Math.min(340, canvas.width - 24);
  // 남쪽 출구의 글자를 가리지 않도록 안내는 화면 위쪽에 표시한다.
  const top = interior?.exit?.side === "south" ? 16 : canvas.height - 62;
  ctx.fillStyle = "#26342de6";
  ctx.fillRect((canvas.width - width) / 2, top, width, 42);
  ctx.font = "15px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff8e9";
  ctx.fillText(message, canvas.width / 2, top + 21, width - 20);
  ctx.restore();
}

function draw() {
  const interior = currentInterior();
  ctx.fillStyle = interior ? "#434640" : "#6f8e93";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(settings.cameraZoom, settings.cameraZoom);
  ctx.translate(-camera.x, -camera.y);
  if (interior) drawInterior(interior);
  else {
    ctx.save();
    ctx.scale(settings.worldScale, settings.worldScale);
    drawCity();
    ctx.restore();
  }
  if (!interior) drawPark();
  if (!interior) drawPlayground();
  drawPlayer();
  drawBearBubbles();
  if (!interior) {
    ctx.save();
    ctx.scale(settings.worldScale, settings.worldScale);
    drawDebug();
    ctx.restore();
  }
  ctx.restore();
  drawDoorHint();
  drawKeyHint();
}

let previousTime = null;
function frame(time) {
  if (typeof updateEnding === "function") updateEnding();
  updateAchievementNotifications();
  const deltaSeconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  update(deltaSeconds);
  if (typeof updateHints === "function") updateHints();
  if (typeof updatePositionSave === "function") updatePositionSave();
  updateCamera();
  draw();
  requestAnimationFrame(frame);
}

initBubbleInput();
resizeCanvas();
requestAnimationFrame(frame);
