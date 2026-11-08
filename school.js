"use strict";

// 문 닫힌 그림과 열린 그림을 미리 불러온다. 불러오지 못하면 바닥과 문을 임시 색 블록으로 그린다.
const schoolImages = {};
if (typeof Image === "function") {
  for (const [kind, src] of Object.entries(SCHOOL_DATA.images)) {
    const image = new Image();
    image.src = src;
    schoolImages[kind] = image;
  }
}
function schoolImageReady(kind) {
  const image = schoolImages[kind];
  return !!image && image.complete && image.naturalWidth > 0;
}

// 열려 있는 문 ID. 학교를 나가거나 새 게임을 시작하면 비운다. 저장하지 않는다.
const schoolDoorUi = { open: new Set() };

function schoolFloor() {
  return SCHOOL_DATA.floors.find(floor => floor.number === scene.schoolFloor);
}

// 현재 층의 계단.
function schoolStairs() {
  return schoolFloor().stairs;
}

function schoolBoardText() {
  return SCHOOL_DATA.text.boardIntro + SCHOOL_DATA.floors.map(floor => {
    const rows = [...new Set(floor.rooms.map(room => room.row))];
    return `${floor.name}\n${rows.map(row => `${row}: ${floor.rooms.filter(room => room.row === row).map(room => room.name).join(" → ")}`).join("\n")}`;
  }).join("\n\n");
}

function inspectionObjectsFor(interior) {
  return [...INSPECTION_OBJECTS, ...SCHOOL_DATA.objects, ...classroomObjects()].filter(object =>
    object.placeId === interior.placeId && (!object.floor || object.floor === scene.schoolFloor));
}

function insideRect(x, y, rect, padding = 0) {
  return Math.abs(x - rect.x) <= rect.width / 2 + padding && Math.abs(y - rect.y) <= rect.height / 2 + padding;
}

// 점이 걸을 수 있는 바닥(열린 문 틈 포함) 안에 있는지 검사한다.
function insideSchoolFloor(x, y) {
  const floor = schoolFloor();
  return floor.walkableRects.some(rect => insideRect(x, y, rect)) ||
    floor.doors.some(door => schoolDoorUi.open.has(door.id) && insideRect(x, y, door.openingRect));
}

// 발밑 원이 바닥 안에 있고 가구에 닿지 않으면 설 수 있다. 원의 가운데와 상하좌우 끝점이 모두 바닥 안이어야 한다.
function schoolCanStand(x, footY, radius) {
  const points = [[x, footY], [x - radius, footY], [x + radius, footY], [x, footY - radius], [x, footY + radius]];
  if (!points.every(([px, py]) => insideSchoolFloor(px, py))) return false;
  return !schoolFloor().obstacleRects.some(rect => circleHitsRectangle(x, footY, radius, rect));
}

// 플레이어 발밑에서 문(틈)까지의 거리.
function schoolDoorDistance(door) {
  const rect = door.openingRect, footY = player.y + player.footOffset;
  return Math.hypot(Math.max(0, Math.abs(player.x - rect.x) - rect.width / 2), Math.max(0, Math.abs(footY - rect.y) - rect.height / 2));
}

// 문을 열거나 닫는다. 플레이어가 문 틈에 서 있으면 닫지 않는다.
function toggleSchoolDoor(door) {
  if (schoolDoorUi.open.has(door.id)) {
    if (circleHitsRectangle(player.x, player.y + player.footOffset, player.collisionRadius, door.openingRect)) {
      showDoorMessage(SCHOOL_DATA.text.doorBlocked);
      return false;
    }
    schoolDoorUi.open.delete(door.id);
  } else {
    schoolDoorUi.open.add(door.id);
  }
  return true;
}

// 문 그림을 클릭하면 가까울 때 열고 닫는다. 문을 클릭했으면 true를 돌려준다.
function handleSchoolDoorClick(x, y) {
  const door = schoolFloor().doors.find(door => insideRect(x, y, door.pictureRect, city.entrances.clickPadding));
  if (!door) return false;
  if (schoolDoorDistance(door) > SCHOOL_DATA.interactDistance) showDoorMessage(SCHOOL_DATA.text.doorNear);
  else toggleSchoolDoor(door);
  return true;
}

// 열고 닫을 수 있는 거리 안에서 가장 가까운 문. 없으면 null이다.
function nearestSchoolDoor() {
  if (scene.interiorId !== SCHOOL_DATA.placeId) return null;
  return schoolFloor().doors
    .filter(door => schoolDoorDistance(door) <= SCHOOL_DATA.interactDistance)
    .sort((a, b) => schoolDoorDistance(a) - schoolDoorDistance(b))[0] || null;
}

// 문 열기 키(기본 E): 학교 안에서 가장 가까운 문을 열고 닫는다. 가까운 문이 없으면 아무 일도 하지 않는다.
function interactNearbyDoor() {
  const door = nearestSchoolDoor();
  return door ? toggleSchoolDoor(door) : false;
}

// 상호작용 키의 화면 표시 이름. 키가 지정되지 않았으면 null이다.
function interactKeyLabel() {
  const code = currentBindings().interact;
  return code ? code.replace(/^Key/, "").replace(/^Digit/, "") : null;
}

// 가까운 문이 있으면 화면 안내 문구를 돌려준다. 문 열기 키가 지정되지 않았으면 클릭 안내만 보여 준다.
function schoolDoorHint() {
  const door = nearestSchoolDoor();
  if (!door) return "";
  const open = schoolDoorUi.open.has(door.id), key = interactKeyLabel(), text = SCHOOL_DATA.text;
  if (!key) return open ? text.doorCloseClickHint : text.doorOpenClickHint;
  return (open ? text.doorCloseHint : text.doorOpenHint).replace("{key}", key);
}

// 저장에서 이어 할 때 문 틈에 서 있었다면 그 문을 열어 둔다.
function openSchoolDoorsAtPlayer() {
  const footY = player.y + player.footOffset;
  for (const door of schoolFloor().doors) {
    if (circleHitsRectangle(player.x, footY, player.collisionRadius, door.openingRect)) schoolDoorUi.open.add(door.id);
  }
}

// 플레이어 발밑에서 계단 사각형 가장자리까지의 거리.
function schoolStairsDistance() {
  const stairs = schoolStairs(), footY = player.y + player.footOffset;
  return Math.hypot(Math.max(0, Math.abs(player.x - stairs.x) - stairs.width / 2), Math.max(0, Math.abs(footY - stairs.y) - stairs.height / 2));
}

// 계단을 클릭할 수 있는 거리 안이면 이동 안내 문구를 돌려준다.
function schoolStairsHint() {
  if (scene.interiorId !== SCHOOL_DATA.placeId || schoolStairsDistance() > SCHOOL_DATA.interactDistance) return "";
  return scene.schoolFloor === 1 ? SCHOOL_DATA.text.stairsUpHint : SCHOOL_DATA.text.stairsDownHint;
}

function handleSchoolStairs(x, y) {
  const stairs = schoolStairs();
  if (Math.abs(x - stairs.x) > stairs.width / 2 || Math.abs(y - stairs.y) > stairs.height / 2) return false;
  // 계단 사각형 가장자리까지의 거리로 가까운지 판단한다.
  if (schoolStairsDistance() > SCHOOL_DATA.interactDistance) {
    showDoorMessage(SCHOOL_DATA.text.near);
    return true;
  }
  scene.schoolFloor = scene.schoolFloor === 1 ? 2 : 1;
  const arrival = schoolStairs().arrival;
  player.x = arrival.x;
  player.y = arrival.footY - player.footOffset;
  player.facing = "down";
  finishMapTransition();
  return true;
}

// 그림 좌표 사각형(rect)을 열린 그림에서 잘라 같은 자리에 덮어 그린다.
function drawOpenPicture(rect, top, scale) {
  const width = rect.right - rect.left, height = rect.bottom - rect.top;
  ctx.drawImage(schoolImages.open, rect.left, rect.top, width, height, rect.left * scale, (rect.top - top) * scale, width * scale, height * scale);
}

// 학교 바닥을 그린다. 그림이 있으면 닫힌 그림 위에 열린 문·정문만 열린 그림으로 덮고, 없으면 임시 색 블록으로 그린다.
function drawSchool() {
  const floor = schoolFloor(), crop = floor.crop;
  const size = floor.size;
  ctx.save();
  if (schoolImageReady("closed") && schoolImageReady("open")) {
    ctx.drawImage(schoolImages.closed, crop.left, crop.top, crop.right - crop.left, crop.bottom - crop.top, 0, 0, size, size);
    for (const rect of floor.alwaysOpen) drawOpenPicture(rect, crop.top, floor.scale);
    for (const door of floor.doors) if (schoolDoorUi.open.has(door.id)) drawOpenPicture(door.picture, crop.top, floor.scale);
  } else {
    ctx.fillStyle = "#6c6a60";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#efe8d5";
    for (const rect of floor.walkableRects) ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    ctx.fillStyle = "#a59c7d";
    for (const rect of floor.obstacleRects) ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    // 닫힌 문은 갈색, 열린 문은 바닥색으로 그린다.
    for (const door of floor.doors) {
      const rect = door.openingRect;
      ctx.fillStyle = schoolDoorUi.open.has(door.id) ? "#efe8d5" : "#9a6a42";
      ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    }
    const stairs = floor.stairs;
    ctx.fillStyle = "#b5b6ad";
    ctx.fillRect(stairs.x - stairs.width / 2, stairs.y - stairs.height / 2, stairs.width, stairs.height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "18px 'Malgun Gothic', sans-serif"; ctx.fillStyle = "#403a32";
    ctx.fillText(scene.schoolFloor === 1 ? SCHOOL_DATA.text.up : SCHOOL_DATA.text.down, stairs.x, stairs.y);
    for (const room of floor.rooms) ctx.fillText(room.name, room.x + room.width / 2, room.y + 30);
  }
  // 9반 그림은 빈 교실이므로 앞쪽 벽에 임시 칠판을 그린다.
  if (scene.schoolFloor === CLASSROOM_DATA.floor) {
    const room = classroomRoom(), board = CLASSROOM_DATA.blackboard;
    const y = CLASSROOM_DATA.frontSide === "south" ? room.y + room.height - board.margin - board.height : room.y + board.margin;
    ctx.fillStyle = "#416553";
    ctx.fillRect(room.x + room.width / 2 - board.width / 2, y, board.width, board.height);
    ctx.fillStyle = "#fff8e9";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "18px 'Malgun Gothic', sans-serif";
    ctx.fillText(CLASSROOM_DATA.text.front, room.x + room.width / 2, y + board.height / 2);
  }
  ctx.restore();
}
