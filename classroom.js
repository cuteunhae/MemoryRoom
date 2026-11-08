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

// 9반이 아닌 교실의 책상. 사용자 요청으로 놓은 배경 가구이며 부딪히기만 하고 조사할 수 없다. 위치가 변하지 않아 한 번만 계산한다.
let classroomDecorCache = null;
function classroomDecorDesks() {
  if (classroomDecorCache) return classroomDecorCache;
  const config = CLASSROOM_DATA, floor = SCHOOL_DATA.floors.find(floor => floor.number === config.floor);
  classroomDecorCache = floor.rooms.filter(room => room.name !== config.roomName).flatMap(room =>
    classroomDeskPositions(room).map(position => ({ roomName: room.name, x: position.x, y: position.y, width: config.deskWidth, height: config.deskHeight, sprite: config.sprite })));
  return classroomDecorCache;
}

// 배경 책상을 그린다. 그림을 불러오지 못하면 색 블록으로 그린다.
function drawClassroomDecorDesks() {
  for (const desk of classroomDecorDesks()) {
    if (drawObjectSprite(desk)) continue;
    ctx.fillStyle = "#ba946d";
    ctx.fillRect(desk.x - desk.width / 2, desk.y - desk.height / 2, desk.width, desk.height);
  }
}

function classroomObjects() {
  const room = classroomRoom(), config = CLASSROOM_DATA;
  const common = { placeId: SCHOOL_DATA.placeId, floor: config.floor, interactDistance: config.interactDistance, messages: { tooFar: config.text.near }, roomName: config.roomName };
  const flip = config.frontSide === "south";
  // 사용자 요청: 책상 위에 번호를 쓰지 않는다(label은 빈 글자). 번호는 자리 배치도와 물건 창 제목에서만 볼 수 있다.
  const desks = classroomDeskPositions(room).map(({ number, x, y }) => ({
    ...common, id: `desk-${number}`, type: "desk", number, name: `${number}${config.text.desk}`, label: "",
    x, y,
    width: config.deskWidth, height: config.deskHeight, clickPadding: config.clickPadding,
    color: "#ba946d", solid: true, sprite: config.sprite, itemIds: config.assignments[number],
  }));
  // 자리 배치도는 뒤쪽 벽(문이 있는 쪽)에 붙인다.
  const rearY = flip ? room.y + config.board.rearMargin : room.y + room.height - config.board.rearMargin;
  const boardX = flip ? room.x + room.width - config.board.sideMargin : room.x + config.board.sideMargin;
  return [...desks, { ...common, id: "classroom-seating-board", type: "seating", name: config.text.board,
    x: boardX, y: rearY,
    width: config.board.width, height: config.board.height, color: "#758675" }];
}

function canInspectSchoolObject(object) {
  if (!object.roomName) return true;
  const room = SCHOOL_DATA.floors.find(floor => floor.number === object.floor)?.rooms.find(room => room.name === object.roomName);
  if (!room) return false;
  const footY = player.y + player.footOffset;
  return player.x > room.x && player.x < room.x + room.width && footY > room.y && footY < room.y + room.height;
}

function renderClassroomPanel() {
  const panel = document.getElementById("classroom-panel");
  panel.replaceChildren();
  const { mode, object } = inspectionUiState;
  panel.hidden = !["desk", "seating", "infirmary"].includes(mode);
  if (panel.hidden) return;
  if (mode === "desk") {
    inspectionMessage.textContent = object.itemIds.length ? CLASSROOM_DATA.text.prompt : CLASSROOM_DATA.text.empty;
    for (const id of object.itemIds) {
      const item = ITEM_DATA.find(item => item.id === id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desk-item";
      button.disabled = !!gameState.acquiredItems[id];
      button.textContent = `${item.name} · ${button.disabled ? CLASSROOM_DATA.text.acquired : CLASSROOM_DATA.text.take}`;
      button.addEventListener("click", () => {
        if (inspectionUiState.mode !== "desk" || inspectionUiState.object !== object) return;
        acquireItem(id);
        renderClassroomPanel();
        inspectionClose.focus();
      });
      panel.append(button);
    }
  } else if (mode === "seating") {
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
