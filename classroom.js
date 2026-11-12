"use strict";

function classroomRoom() {
  return SCHOOL_DATA.floors.find(floor => floor.number === CLASSROOM_DATA.floor).rooms.find(room => room.name === CLASSROOM_DATA.roomName);
}

// 교실 가운데에 놓는 책상 30개의 위치. 자리표 번호와 함께 돌려준다.
function classroomDeskPositions(room) {
  const config = CLASSROOM_DATA;
  const totalWidth = config.deskWidth * 6 + config.pairAisle * 2;
  const totalHeight = config.deskHeight * 5 + config.rowAisle * 4;
  const left = room.x + (room.width - totalWidth) / 2;
  const top = room.y + (room.height - totalHeight) / 2;
  // 칠판이 아래쪽(south)이면 자리표를 180도 돌려 1행을 아래쪽, 왼쪽 쌍을 화면 오른쪽에 둔다.
  const flip = config.frontSide === "south";
  const offsetX = c => c * config.deskWidth + Math.floor(c / 2) * config.pairAisle + config.deskWidth / 2;
  const offsetY = r => r * (config.deskHeight + config.rowAisle) + config.deskHeight / 2;
  return config.seats.flatMap((row, r) => row.map((number, c) => ({
    number,
    x: flip ? left + totalWidth - offsetX(c) : left + offsetX(c),
    y: flip ? top + totalHeight - offsetY(r) : top + offsetY(r),
  })));
}

// 항상 같은 순서로 나오는 불규칙한 수(0 이상 1 미만). 교실과 자리 번호로 정해지므로 다시 시작해도 배치가 같다.
function classroomDecorRandom(roomIndex, seatIndex, salt) {
  const value = Math.sin((roomIndex + 1) * 127.1 + (seatIndex + 1) * 311.7 + salt * 74.7 + CLASSROOM_DATA.decorItems.seed) * 43758.5453;
  return value - Math.floor(value);
}

// 책상 하나의 물건 목록. 비어 있거나 1종이다.
function classroomDecorItemIds(roomIndex, seatIndex) {
  const decor = CLASSROOM_DATA.decorItems;
  if (classroomDecorRandom(roomIndex, seatIndex, 1) >= decor.itemRate) return [];
  return [decor.ids[Math.floor(classroomDecorRandom(roomIndex, seatIndex, 2) * decor.ids.length)]];
}

// 9반이 아닌 교실의 책상. 클릭하면 그 자리의 물건을 얻는다. 위치가 변하지 않아 한 번만 계산한다.
let classroomDecorCache = null;
function classroomDecorDesks() {
  if (classroomDecorCache) return classroomDecorCache;
  const config = CLASSROOM_DATA, floor = SCHOOL_DATA.floors.find(floor => floor.number === config.floor);
  classroomDecorCache = floor.rooms.filter(room => room.name !== config.roomName).flatMap((room, roomIndex) =>
    classroomDeskPositions(room).map((position, seatIndex) => ({
      id: `class-${roomIndex + 1}-desk-${position.number}`,
      roomName: room.name, x: position.x, y: position.y, width: config.deskWidth, height: config.deskHeight, sprite: config.sprite,
      type: "desk", floor: config.floor, interactDistance: config.interactDistance, clickPadding: config.clickPadding,
      messages: { tooFar: config.text.near }, itemIds: classroomDecorItemIds(roomIndex, seatIndex),
    })));
  return classroomDecorCache;
}

// 모든 교실의 칠판 위치. 문 반대쪽 벽에 붙인다. 위쪽 줄 교실은 위쪽 벽, 아래쪽 줄 교실은 아래쪽 벽이다.
// 사용자 요청: 위쪽 줄 교실(1~4반)의 칠판 그림은 위아래를 뒤집어 그린다(flip).
function classroomBlackboards() {
  const board = CLASSROOM_DATA.blackboard, floor = SCHOOL_DATA.floors.find(floor => floor.number === CLASSROOM_DATA.floor);
  return floor.rooms.map(room => ({
    roomName: room.name,
    left: room.x + room.width / 2 - board.width / 2,
    top: room.row === "위쪽" ? room.y + board.topMargin : room.y + room.height - board.margin - board.height,
    width: board.width, height: board.height,
    flip: room.row === "위쪽",
  }));
}

// 학교 방문 중 경과 시간. 화면 갱신이 느려도 실제 90초에 맞춰 안내한다.
const schoolCrayonGuide = { elapsedMs: 0, lastTick: Date.now(), inside: false };
// 다른 탭에 있던 시간을 다음 프레임에 한꺼번에 더하지 않는다.
document.addEventListener("visibilitychange", () => { schoolCrayonGuide.lastTick = Date.now(); });
function updateSchoolCrayonGuide() {
  const now = Date.now(), elapsed = Math.max(0, now - schoolCrayonGuide.lastTick);
  schoolCrayonGuide.lastTick = now;
  if (scene.interiorId !== SCHOOL_DATA.placeId) {
    schoolCrayonGuide.elapsedMs = 0;
    schoolCrayonGuide.inside = false;
    return;
  }
  if (!schoolCrayonGuide.inside) {
    schoolCrayonGuide.inside = true;
    return;
  }
  if (document.hidden || gameState.acquiredItems[CLASSROOM_DATA.crayonGuide.itemId]) return;
  schoolCrayonGuide.elapsedMs += elapsed;
}

function drawCrayonStars(x, y) {
  const config = CLASSROOM_DATA.crayonGuide;
  if (scene.interiorId !== SCHOOL_DATA.placeId || gameState.acquiredItems[config.itemId] || schoolCrayonGuide.elapsedMs < config.waitMs) return;
  const image = objectSpriteImage(config.src);
  if (!image) return;
  ctx.save();
  for (let index = 0; index < config.count; index++) {
    const angle = index * Math.PI * 2 / config.count - Math.PI / 2;
    const pulse = (Math.sin(Date.now() * Math.PI * 2 / config.pulseMs + index * 2) + 1) / 2;
    const width = config.size * (0.75 + pulse * 0.25), height = width * image.naturalHeight / image.naturalWidth;
    ctx.globalAlpha = 0.2 + pulse * 0.8;
    ctx.drawImage(image, x + Math.cos(angle) * config.radius - width / 2,
      y + Math.sin(angle) * config.radius - height / 2, width, height);
  }
  ctx.restore();
}

function classroomDeskIcons(desk) {
  return desk.itemIds.filter(id => !(gameState.deskCollected[desk.id] || []).includes(id) &&
    !(id === CLASSROOM_DATA.crayonGuide.itemId && gameState.acquiredItems[id]))
    .map(id => ITEM_DATA.find(item => item.id === id).icon).filter(Boolean);
}

// 책상 위에 아이템 그림을 그린다. 2종이 남은 자리(9반 1번 책상)는 나란히 놓는다.
function drawClassroomDeskIcons(desk) {
  const decor = CLASSROOM_DATA.decorItems, icons = classroomDeskIcons(desk);
  // 그림 아래쪽을 맞춰 그리는 함수이므로 아이콘 칸의 가운데 위치를 계산해 넘긴다.
  const top = desk.y + desk.height / 2 - CLASSROOM_DATA.sprite.height + decor.iconTop;
  icons.forEach((src, index) => {
    const x = desk.x + (index - (icons.length - 1) / 2) * decor.iconSize;
    drawObjectSprite({ x, y: top + decor.iconSize / 2, width: decor.iconSize, height: decor.iconSize, sprite: { src } });
    // 알림장 획득으로 아이콘 위치가 달라져도 현재 크레파스 위치를 따라간다.
    if (src === ITEM_DATA.find(item => item.id === CLASSROOM_DATA.crayonGuide.itemId)?.icon) {
      drawCrayonStars(x, top + decor.iconSize / 2);
    }
  });
}

// 1~8반 책상과 그 위의 아이템을 그린다. 그림을 불러오지 못하면 책상은 색 블록으로 그린다.
function drawClassroomDecorDesks() {
  for (const desk of classroomDecorDesks()) {
    if (!drawObjectSprite(desk)) {
      ctx.fillStyle = "#ba946d";
      ctx.fillRect(desk.x - desk.width / 2, desk.y - desk.height / 2, desk.width, desk.height);
    }
    drawClassroomDeskIcons(desk);
  }
}

function classroomObjects() {
  const room = classroomRoom(), config = CLASSROOM_DATA;
  const common = { placeId: SCHOOL_DATA.placeId, floor: config.floor, interactDistance: config.interactDistance, messages: { tooFar: config.text.near }, roomName: config.roomName };
  const flip = config.frontSide === "south";
  // 사용자 요청: 책상 위에 번호를 쓰지 않는다(label은 빈 글자). 번호는 자리 배치도에서만 볼 수 있다.
  // 9반의 교실 번호는 1~8반 다음(8)이다. 1~8반의 배치는 그대로 유지된다.
  const roomIndex = SCHOOL_DATA.floors.find(floor => floor.number === config.floor).rooms.length - 1;
  const desks = classroomDeskPositions(room).map(({ number, x, y }, seatIndex) => ({
    ...common, id: `desk-${number}`, type: "desk", number, name: `${number}${config.text.desk}`, label: "",
    x, y,
    width: config.deskWidth, height: config.deskHeight, clickPadding: config.clickPadding,
    color: "#ba946d", solid: true, sprite: config.sprite, itemIds: config.assignments[number] ?? classroomDecorItemIds(roomIndex, seatIndex),
  }));
  // 자리 배치도는 뒤쪽 벽(문이 있는 쪽)에 붙인다.
  const rearY = flip ? room.y + config.board.rearMargin : room.y + room.height - config.board.rearMargin;
  const boardX = flip ? room.x + room.width - config.board.sideMargin : room.x + config.board.sideMargin;
  return [...desks, { ...common, id: "classroom-seating-board", type: "seating", name: config.text.board,
    messages: { ...common.messages, keyHint: config.board.hint, keyHintClick: config.board.hint },
    x: boardX, y: rearY,
    width: config.board.width, height: config.board.height, color: "#758675", sprite: config.board.sprite }];
}

function canInspectSchoolObject(object) {
  if (!object.roomName) return true;
  const room = SCHOOL_DATA.floors.find(floor => floor.number === object.floor)?.rooms.find(room => room.name === object.roomName);
  if (!room) return false;
  const footY = player.y + player.footOffset;
  return player.x > room.x && player.x < room.x + room.width && footY > room.y && footY < room.y + room.height;
}

// 책상을 클릭하면 창 없이 그 자리의 아이템을 모두 바로 얻는다. 사용자 결정으로 기획서 SCH-05~07(물건을 하나씩 클릭)과 다르다.
function collectDeskItems(desk) {
  const text = CLASSROOM_DATA.text;
  if (isGameInputBlocked()) return;
  if (desk.number === 1) markHintClue("desk-one");
  const remaining = desk.itemIds.filter(id => !(gameState.deskCollected[desk.id] || []).includes(id));
  // 종류별 소지 기록과 별도로 실제 조사한 책상만 비운다.
  if (remaining.length) gameState.deskCollected[desk.id] = [...desk.itemIds];
  const gained = remaining.filter(id => acquireItem(id));
  if (remaining.length && typeof saveProgress === "function") saveProgress();
  if (gained.length) showDoorMessage(text.gained.replace("{items}", gained.map(id => ITEM_DATA.find(item => item.id === id).name).join(", ")));
  else showDoorMessage(desk.itemIds.length ? text.taken : text.empty);
}

function renderClassroomPanel() {
  const panel = document.getElementById("classroom-panel");
  panel.replaceChildren();
  const { mode } = inspectionUiState;
  panel.hidden = !["seating", "infirmary"].includes(mode);
  if (panel.hidden) return;
  if (mode === "seating") {
    inspectionMessage.textContent = CLASSROOM_DATA.text.front;
    for (const row of CLASSROOM_DATA.seats) {
      const line = document.createElement("div"); line.className = "seat-row";
      for (let pair = 0; pair < 3; pair++) {
        const group = document.createElement("div"); group.className = "seat-pair";
        for (const number of row.slice(pair * 2, pair * 2 + 2)) {
          const cell = document.createElement("span"); cell.textContent = String(number); group.append(cell);
        }
        line.append(group);
      }
      panel.append(line);
    }
    const rear = document.createElement("p"); rear.textContent = CLASSROOM_DATA.text.rear; panel.append(rear);
  } else {
    inspectionMessage.textContent = CLASSROOM_DATA.text.mapHint;
    // TODO: 실제 1층 배치를 참조하는 임시 약도. 최종 그림으로 교체한다.
    const map = document.createElement("div"); map.className = "infirmary-map";
    // 1층 방을 그림과 같은 순서(왼쪽 → 오른쪽)로 보여 준다.
    for (const room of SCHOOL_DATA.floors[0].rooms) {
      const cell = document.createElement("span"); cell.textContent = room.name; map.append(cell);
    }
    const corridor = document.createElement("p"); corridor.textContent = SCHOOL_DATA.text.corridor;
    const landmarks = document.createElement("p"); landmarks.textContent = CLASSROOM_DATA.text.mapBottom;
    panel.append(map, corridor, landmarks);
  }
}
