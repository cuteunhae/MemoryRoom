"use strict";

function classroomRoom() {
  return SCHOOL_DATA.floors.find(floor => floor.number === CLASSROOM_DATA.floor).rooms.find(room => room.name === CLASSROOM_DATA.roomName);
}

function classroomObjects() {
  const room = classroomRoom(), config = CLASSROOM_DATA;
  const totalWidth = config.deskWidth * 6 + config.pairAisle * 2;
  const totalHeight = config.deskHeight * 5 + config.rowAisle * 4;
  const left = room.x + (room.width - totalWidth) / 2;
  const top = room.y + (room.height - totalHeight) / 2;
  const common = { placeId: SCHOOL_DATA.placeId, floor: config.floor, interactDistance: config.interactDistance, messages: { tooFar: config.text.near }, roomName: config.roomName };
  const desks = config.seats.flatMap((row, r) => row.map((number, c) => ({
    ...common, id: `desk-${number}`, type: "desk", number, name: `${number}${config.text.desk}`,
    x: left + c * config.deskWidth + Math.floor(c / 2) * config.pairAisle + config.deskWidth / 2,
    y: top + r * (config.deskHeight + config.rowAisle) + config.deskHeight / 2,
    width: config.deskWidth, height: config.deskHeight, clickPadding: config.clickPadding,
    color: "#ba946d", solid: true, itemIds: config.assignments[number],
  })));
  return [...desks, { ...common, id: "classroom-seating-board", type: "seating", name: config.text.board,
    x: room.x + config.board.sideMargin, y: room.y + room.height - config.board.rearMargin,
    width: config.board.width, height: config.board.height, color: "#758675" }];
}

function canInspectSchoolObject(object) {
  if (!object.roomName) return true;
  const room = classroomRoom();
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
    for (const room of SCHOOL_DATA.floors[0].rooms) {
      const cell = document.createElement("span"); cell.textContent = room.name; map.append(cell);
    }
    const corridor = document.createElement("p"); corridor.textContent = SCHOOL_DATA.text.corridor;
    const landmarks = document.createElement("p"); landmarks.textContent = CLASSROOM_DATA.text.mapBottom;
    panel.append(map, corridor, landmarks);
  }
}
