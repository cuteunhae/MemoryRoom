"use strict";

// TODO: 교실 수, 방 크기, 문·계단·게시판·NPC 좌표와 조사 거리는 임시 배치다.
const SCHOOL_DATA = {
  scale: 8, doorWidth: 240,
  classroomScale: 2 / 3,
  // TODO: 복도만 조절하는 픽셀 설정. 모든 교실 문을 포함하도록 길이를 유지한다.
  corridor: { x: 1160, y: 4400, length: 10480, width: 480 },
  noticeArea: { boardOffsetX: -220, npcOffsetX: 40, offsetY: 150 },
  placeId: "C02", wallThickness: 14, interactDistance: 140,
  floors: [
    { number: 1, name: "학교 1층", rooms: [
      { name: "1반", x: 50, y: 100, width: 250, height: 450, doorX: 175, doorWidth: 100 },
      { name: "2반", x: 300, y: 100, width: 250, height: 450, doorX: 425, doorWidth: 100 },
      { name: "3반", x: 550, y: 100, width: 250, height: 450, doorX: 675, doorWidth: 100 },
      { name: "4반", x: 800, y: 100, width: 250, height: 450, doorX: 925, doorWidth: 100 },
      { name: "교무실", x: 1050, y: 100, width: 250, height: 450, doorX: 1175, doorWidth: 100 },
      { name: "보건실", x: 1300, y: 100, width: 250, height: 450, doorX: 1425, doorWidth: 100 },
    ] },
    { number: 2, name: "학교 2층", rooms: [
      { name: "5반", x: 50, y: 100, width: 300, height: 450, doorX: 200, doorWidth: 100 },
      { name: "6반", x: 350, y: 100, width: 300, height: 450, doorX: 500, doorWidth: 100 },
      { name: "7반", x: 650, y: 100, width: 300, height: 450, doorX: 800, doorWidth: 100 },
      { name: "8반", x: 950, y: 100, width: 300, height: 450, doorX: 1100, doorWidth: 100 },
      { name: "9반", x: 1250, y: 100, width: 300, height: 450, doorX: 1400, doorWidth: 100 },
    ] },
  ],
  stairs: { x: 1450, y: 800, width: 140, height: 100, arrival: { x: 1450, footY: 900 } },
  text: { up: "2층으로 올라가기", down: "1층으로 내려가기", near: "계단 가까이에서 클릭해 주세요.", corridor: "복도", boardIntro: "복도에서 위쪽 교실들을 바라본 기준입니다.\n각 층 왼쪽 → 오른쪽 순서\n\n" },
  objects: [
    { id: "school-board", placeId: "C02", floor: 1, type: "board", name: "반 배치 게시판", x: 350, y: 730, width: 140, height: 60, interactDistance: 140, color: "#86734f", messages: { tooFar: "게시판 가까이에서 클릭해 주세요." } },
    { id: "school-teacher", placeId: "C02", floor: 1, type: "dialogue", name: "선생님", x: 520, y: 730, width: 48, height: 54, interactDistance: 140, color: "#557d78", messages: {
      tooFar: "선생님 가까이에서 클릭해 주세요.",
      dialogue: "오랜만이구나! 졸업하고 어떻게 지내는지 궁금했단다. 아참, 저 게시판에는 새로 입학한 학생들을 위한 반 배치도가 있단다. 한번 살펴보렴.",
    } },
  ],
};

// TODO: 원래 배치 비율을 유지하는 임시 확대 배율. 캐릭터와 이동 속도는 확대하지 않는다.
for (const floor of SCHOOL_DATA.floors) for (const room of floor.rooms) {
  for (const key of ["x", "y", "width", "height", "doorX"]) room[key] *= SCHOOL_DATA.scale;
  room.doorWidth = SCHOOL_DATA.doorWidth;
  // 반 교실만 축소한다. 복도에 맞닿은 문 중심과 아래쪽 벽은 유지한다.
  if (/^\d/.test(room.name)) {
    const bottom = room.y + room.height;
    room.width *= SCHOOL_DATA.classroomScale;
    room.height *= SCHOOL_DATA.classroomScale;
    room.x = room.doorX - room.width / 2;
    room.y = bottom - room.height;
  }
}
for (const object of SCHOOL_DATA.objects) {
  object.x *= SCHOOL_DATA.scale;
  object.y *= SCHOOL_DATA.scale;
}
SCHOOL_DATA.stairs.x *= SCHOOL_DATA.scale;
SCHOOL_DATA.stairs.y *= SCHOOL_DATA.scale;
SCHOOL_DATA.stairs.width = 240;
SCHOOL_DATA.stairs.height = 160;
SCHOOL_DATA.stairs.arrival = { x: SCHOOL_DATA.stairs.x, footY: SCHOOL_DATA.stairs.y + 100 };
const schoolInterior = CITY_DATA.interiors.find(room => room.placeId === SCHOOL_DATA.placeId);
schoolInterior.width *= SCHOOL_DATA.scale;
schoolInterior.height *= SCHOOL_DATA.scale;
schoolInterior.exit.x *= SCHOOL_DATA.scale;
schoolInterior.exit.y = schoolInterior.height - schoolInterior.wall / 2;
schoolInterior.exit.width = SCHOOL_DATA.doorWidth;
schoolInterior.spawn.x = schoolInterior.exit.x;
schoolInterior.spawn.footY = schoolInterior.exit.y - 96;

// 방·책상 좌표를 바꾸지 않고 복도 끝의 여분 공간과 깊이만 줄인다.
const corridor = SCHOOL_DATA.corridor;
schoolInterior.height = corridor.y + corridor.width + schoolInterior.wall;
schoolInterior.exit.x = corridor.x + corridor.length / 2;
schoolInterior.exit.y = schoolInterior.height - schoolInterior.wall / 2;
schoolInterior.spawn.x = schoolInterior.exit.x;
schoolInterior.spawn.footY = schoolInterior.exit.y - 96;
SCHOOL_DATA.stairs.x = corridor.x + corridor.length - 140;
SCHOOL_DATA.stairs.y = corridor.y + corridor.width / 2;
SCHOOL_DATA.stairs.arrival = { x: SCHOOL_DATA.stairs.x, footY: SCHOOL_DATA.stairs.y + 100 };
for (const object of SCHOOL_DATA.objects) {
  object.x = schoolInterior.exit.x + (object.type === "board" ? SCHOOL_DATA.noticeArea.boardOffsetX : SCHOOL_DATA.noticeArea.npcOffsetX);
  object.y = corridor.y + SCHOOL_DATA.noticeArea.offsetY;
  if (object.type === "board") {
    object.width = 200;
    object.height = 80;
    object.color = "#97744b";
  }
}
