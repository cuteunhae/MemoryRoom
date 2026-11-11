"use strict";

// 학교 실내는 에셋 그림 두 장을 겹쳐 그린다. 두 그림은 문 부분만 다르고 나머지는 같다.
// - assets/school-doors-closed.png: 문이 모두 닫힌 그림 (887×1774, 위쪽 절반이 1층, 아래쪽 절반이 2층)
// - assets/school-doors-open.png: 문이 모두 열린 그림
// 닫힌 그림을 깔고, 열린 문 자리만 열린 그림에서 잘라 덮어 그린다.
// 아래 좌표는 모두 그림 전체(887×1774)의 픽셀 위치이며, 사각형은 { left, top, right, bottom }으로 적는다.
// 파일 맨 아래에서 층이 그림에서 시작하는 위치(crop.top)를 빼고 그 층의 scale을 곱해 게임 속 픽셀(가운데 x·y, width·height)로 바꾼다.
// TODO: 걸을 수 있는 곳·장애물·문·계단 좌표는 그림을 눈으로 재서 맞춘 임시 값이다. 플레이 테스트에서 조정한다.
const SCHOOL_DATA = {
  placeId: "C02",
  images: { closed: "assets/school-doors-closed.png", open: "assets/school-doors-open.png" },
  floorSize: 887,
  interactDistance: 140,
  floors: [
    // scale: 그림 1픽셀을 게임 속 몇 픽셀로 키울지 층마다 정한다. 사용자 요청으로 1층만 작게 했다.
    // TODO: 층별 배율은 임시 값이다. 플레이 테스트에서 조정한다.
    { number: 1, name: "학교 1층", scale: 3.5, crop: { left: 0, top: 0, right: 887, bottom: 887 },
      // 걸을 수 있는 바닥. 여러 사각형을 합친 모양이다. 문 틈은 doors에 따로 적고, 열렸을 때만 걸을 수 있다.
      walkable: [
        { left: 352, top: 310, right: 535, bottom: 462 }, // 계단 앞 가운데 통로
        { left: 38, top: 458, right: 826, bottom: 735 }, // 로비
        { left: 312, top: 728, right: 576, bottom: 818 }, // 정문 현관
        { left: 48, top: 255, right: 340, bottom: 405 }, // 교무실 바닥
        { left: 545, top: 280, right: 840, bottom: 405 }, // 보건실 바닥
      ],
      // 바닥 위에 있어 지나갈 수 없는 가구.
      obstacles: [
        { left: 60, top: 515, right: 145, bottom: 615 }, { left: 742, top: 515, right: 826, bottom: 615 }, // 사물함
        { left: 170, top: 575, right: 265, bottom: 620 }, { left: 618, top: 575, right: 715, bottom: 620 }, // 벤치
        { left: 275, top: 540, right: 312, bottom: 612 }, { left: 572, top: 540, right: 610, bottom: 612 }, // 화분
        { left: 605, top: 495, right: 715, bottom: 555 }, // 오른쪽 게시판(왼쪽 게시판은 반 배치 게시판 물체)
        // 교무실 책상·탁자. 사용자 요청: 둘 사이로 지나가도록 탁자 둘레 의자와 책상 아래쪽 끝은 지나갈 수 있게 줄였다.
        { left: 135, top: 265, right: 312, bottom: 345 }, { left: 95, top: 366, right: 172, bottom: 410 },
        { left: 48, top: 265, right: 100, bottom: 340 }, // 교무실 복사기
        { left: 555, top: 262, right: 595, bottom: 305 }, { left: 548, top: 312, right: 580, bottom: 395 }, // 보건실 수레·침상
        { left: 648, top: 356, right: 680, bottom: 395 }, { left: 800, top: 295, right: 840, bottom: 380 }, // 보건실 의자·가림막
        { left: 638, top: 220, right: 672, bottom: 292 }, // 보건실 체중계
      ],
      rooms: [
        { name: "교무실", row: "위쪽", floor: { left: 48, top: 255, right: 340, bottom: 405 } },
        { name: "보건실", row: "위쪽", floor: { left: 545, top: 280, right: 840, bottom: 405 } },
      ],
      // 문. opening은 열렸을 때 걸을 수 있는 틈, picture는 열림·닫힘 그림을 바꿔 그리는 범위이자 클릭 범위다.
      doors: [
        { id: "door-office", room: "교무실", opening: { left: 262, top: 400, right: 302, bottom: 462 }, picture: { left: 255, top: 402, right: 309, bottom: 468 } },
        { id: "door-infirmary", room: "보건실", opening: { left: 584, top: 400, right: 624, bottom: 462 }, picture: { left: 577, top: 402, right: 631, bottom: 468 } },
      ],
      // 정문은 기본 학교 이미지의 양문형 유리문을 표시한다. E 키·클릭 퇴장은 기존대로 동작한다.
      alwaysOpen: [],
      // 계단은 클릭하면 다른 층으로 간다. arrival은 이 층에 도착했을 때 발밑 위치다.
      stairs: { left: 385, top: 130, right: 500, bottom: 312, arrival: { x: 443, footY: 330 } },
    },
    // 2층 배율은 9반 책상 30개가 들어가도록 유지한다.
    { number: 2, name: "학교 2층", scale: 4.5, crop: { left: 0, top: 887, right: 887, bottom: 1774 },
      walkable: [
        { left: 38, top: 1232, right: 850, bottom: 1398 }, // 가운데 복도
        { left: 398, top: 1172, right: 488, bottom: 1236 }, // 계단 앞
        // 교실 바닥
        { left: 52, top: 960, right: 208, bottom: 1170 }, { left: 236, top: 960, right: 370, bottom: 1170 },
        { left: 516, top: 960, right: 652, bottom: 1170 }, { left: 680, top: 960, right: 836, bottom: 1170 },
        { left: 48, top: 1440, right: 196, bottom: 1655 }, { left: 222, top: 1440, right: 355, bottom: 1655 },
        { left: 380, top: 1440, right: 512, bottom: 1655 }, { left: 537, top: 1440, right: 672, bottom: 1655 },
        { left: 698, top: 1440, right: 838, bottom: 1655 },
      ],
      obstacles: [],
      rooms: [
        { name: "1반", row: "위쪽", floor: { left: 52, top: 960, right: 208, bottom: 1170 } },
        { name: "2반", row: "위쪽", floor: { left: 236, top: 960, right: 370, bottom: 1170 } },
        { name: "3반", row: "위쪽", floor: { left: 516, top: 960, right: 652, bottom: 1170 } },
        { name: "4반", row: "위쪽", floor: { left: 680, top: 960, right: 836, bottom: 1170 } },
        { name: "5반", row: "아래쪽", floor: { left: 48, top: 1440, right: 196, bottom: 1655 } },
        { name: "6반", row: "아래쪽", floor: { left: 222, top: 1440, right: 355, bottom: 1655 } },
        { name: "7반", row: "아래쪽", floor: { left: 380, top: 1440, right: 512, bottom: 1655 } },
        { name: "8반", row: "아래쪽", floor: { left: 537, top: 1440, right: 672, bottom: 1655 } },
        { name: "9반", row: "아래쪽", floor: { left: 698, top: 1440, right: 838, bottom: 1655 } },
      ],
      doors: [
        { id: "door-1", room: "1반", opening: { left: 74, top: 1165, right: 110, bottom: 1240 }, picture: { left: 68, top: 1180, right: 116, bottom: 1242 } },
        { id: "door-2", room: "2반", opening: { left: 257, top: 1165, right: 293, bottom: 1240 }, picture: { left: 251, top: 1180, right: 299, bottom: 1242 } },
        { id: "door-3", room: "3반", opening: { left: 520, top: 1165, right: 558, bottom: 1240 }, picture: { left: 514, top: 1180, right: 564, bottom: 1242 } },
        { id: "door-4", room: "4반", opening: { left: 700, top: 1165, right: 738, bottom: 1240 }, picture: { left: 694, top: 1180, right: 744, bottom: 1242 } },
        { id: "door-5", room: "5반", opening: { left: 77, top: 1394, right: 111, bottom: 1445 }, picture: { left: 71, top: 1392, right: 117, bottom: 1450 } },
        { id: "door-6", room: "6반", opening: { left: 245, top: 1394, right: 281, bottom: 1445 }, picture: { left: 239, top: 1392, right: 287, bottom: 1450 } },
        { id: "door-7", room: "7반", opening: { left: 404, top: 1394, right: 441, bottom: 1445 }, picture: { left: 398, top: 1392, right: 447, bottom: 1450 } },
        { id: "door-8", room: "8반", opening: { left: 561, top: 1394, right: 598, bottom: 1445 }, picture: { left: 555, top: 1392, right: 604, bottom: 1450 } },
        { id: "door-9", room: "9반", opening: { left: 724, top: 1394, right: 760, bottom: 1445 }, picture: { left: 718, top: 1392, right: 766, bottom: 1450 } },
      ],
      alwaysOpen: [],
      stairs: { left: 405, top: 1005, right: 480, bottom: 1175, arrival: { x: 443, footY: 1198 } },
    },
  ],
  // 1층 정문(현관 안쪽 끝). 가까이에서 '나가기'를 클릭하면 밖으로 나간다. spawn은 학교에 들어왔을 때 발밑 위치다.
  exit: { left: 380, top: 796, right: 508, bottom: 818 },
  spawn: { x: 444, footY: 795 },
  text: { up: "2층으로 올라가기", down: "1층으로 내려가기", near: "계단 가까이에서 클릭해 주세요.", corridor: "복도",
    doorNear: "문 가까이에서 클릭해 주세요.", doorBlocked: "문 앞에서 비켜 주세요.",
    // 열 수 있는 문 가까이에 가면 나오는 안내. {key}는 설정에서 지정한 문 열기 키로 바뀐다.
    doorOpenHint: "{key} 키를 누르거나 문을 클릭해 열기", doorCloseHint: "{key} 키를 누르거나 문을 클릭해 닫기",
    doorOpenClickHint: "문을 클릭해 열기", doorCloseClickHint: "문을 클릭해 닫기",
    // 계단 가까이에 가면 나오는 이동 안내.
    // ...KeyHint의 {key}는 설정에서 지정한 상호작용 키로 바뀐다. 키가 할당 없음이면 stairsUpHint·stairsDownHint를 쓴다.
    stairsUpKeyHint: "{key} 키를 누르거나 계단을 클릭해 2층으로 올라가기", stairsDownKeyHint: "{key} 키를 누르거나 계단을 클릭해 1층으로 내려가기",
    stairsUpHint: "계단을 클릭해 2층으로 올라가기", stairsDownHint: "계단을 클릭해 1층으로 내려가기",
    boardIntro: "층마다 위쪽 줄과 아래쪽 줄로 나누어 왼쪽 → 오른쪽 순서로 적었습니다.\n\n" },
  // 문을 열 때 열린 그림으로 덮는 범위. picture(클릭 범위)보다 이만큼 넓혀 문짝 전체와 그림자를 덮는다. 단위는 학교 그림 픽셀이다.
  // assets/school-doors-open.png는 닫힌 그림 위에 이 범위만 열린 원본을 합성한 사본이라, 이 값을 바꾸면 그림도 다시 만들어야 한다.
  doorOverlay: { side: 8, top: 8, bottom: 22 },
  // 2층 교실 문 앞 복도에 그리는 반 번호 표지. 문구는 rooms의 name을 쓴다. 단위는 게임 속 픽셀이다.
  // TODO: 표지 크기와 문까지의 간격은 임시 값이다.
  doorPlate: { floor: 2, width: 96, height: 46, gap: 8, font: 30 },
  // 반 배치 게시판을 열면 나오는 안내도. 학교 그림을 바탕으로 방 이름·계단·현위치를 표기한다.
  // labels의 x·y는 학교 그림(887×1774) 픽셀이다. 방 이름은 rooms, 계단은 stairs, 현위치는 게시판 자리에 자동으로 놓는다.
  // 플레이어 도시 지도(M)가 아니라 학교 안에 걸린 안내도이므로 장소명과 현위치를 표기한다.
  // TODO: 크기와 글자 크기는 임시 값이다. 단위는 안내도 캔버스 픽셀이다.
  boardMap: {
    floorSize: 800, gap: 40, titleHeight: 60, labelFont: 30, titleFont: 36,
    hint: "", here: "현위치",
    // 현위치 표시 자리. 학교 그림의 왼쪽 게시판 가운데다.
    herePoint: { floor: 1, x: 226, y: 525 },
    stairs: { 1: "2층 계단", 2: "1층 계단" },
    labels: [
      { floor: 1, name: "로비", x: 443, y: 620 },
      { floor: 1, name: "출입구", x: 444, y: 790 },
      { floor: 2, name: "복도", x: 230, y: 1315 },
    ],
  },
  objects: [
    // 반 배치 게시판은 로비 왼쪽 게시판 그림이다. 그림이 있으므로 따로 그리지 않는다(hidden).
    { id: "school-board", placeId: "C02", floor: 1, type: "board", name: "반 배치 게시판", hidden: true, solid: true,
      // 게시판 앞에 벤치가 있어 플레이어가 게시판에 붙어 설 수 없다. 사용자 요청으로 클릭·조사 범위를 벤치까지 넓혔다.
      // picture는 게시판 그림 범위다. 키 안내를 이 가운데에 표시한다.
      rect: { left: 170, top: 495, right: 280, bottom: 620 }, picture: { left: 172, top: 495, right: 280, bottom: 555 }, interactDistance: 160, color: "#97744b", messages: { tooFar: "게시판 가까이에서 클릭해 주세요.",
      keyHint: "{key} 키를 누르거나 클릭해 안내도 보기", keyHintClick: "클릭해 안내도 보기" } },
    { id: "school-teacher", placeId: "C02", floor: 1, type: "dialogue", name: "선생님",
      // 사용자 요청: 발밑 위치를 유지하며 그림과 클릭 범위를 기존보다 10% 줄였다.
      rect: { left: 319.15, top: 588.1, right: 339.85, bottom: 634 }, interactDistance: 140, color: "#557d78", sprite: { src: "assets/npc-teacher.png", width: 90, height: 162 }, messages: {
      tooFar: "선생님 가까이에서 클릭해 주세요.",
      // 가까이 가면 나오는 안내. {key}는 설정에서 지정한 상호작용 키로 바뀐다. keyHintClick은 키가 할당 없음일 때 쓴다.
      keyHint: "{key} 키 또는 클릭해 대화하기", keyHintClick: "클릭해 대화하기",
      dialogue: "오랜만이구나! 졸업하고 어떻게 지내는지 궁금했단다. \n 아참, 저 게시판에는 새로 입학한 학생들을 위한 반 배치도가 있단다. 한번 살펴보렴.",
      dialogueBold: "반 배치도",
    } },
    // TODO: 2층 계단 오른쪽 복도의 임시 위치·크기·대화 거리. 계단 도착 지점과 교실 문은 비워 둔다.
    { id: "school-friend", placeId: "C02", floor: 2, type: "dialogue", name: "친구", solid: true,
      rect: { left: 476, top: 1234, right: 500, bottom: 1266 }, interactDistance: 140, color: "#557d78",
      // 사용자 요청: 높이는 유지하고 그림의 가로 폭만 10% 넓힌다.
      sprite: { src: "assets/npc-school-friend.png", width: 134, height: 144, stretchX: 1.1 }, messages: {
        tooFar: "친구 가까이에서 클릭해 주세요.",
        keyHint: "{key} 키 또는 클릭해 대화하기", keyHintClick: "클릭해 대화하기",
        dialogue: "오랜만이야, 반갑다! 너 그때 그거 기억나?\n돌잔치 사진에 적힌 날짜가 네 반이랑 자리 번호 같다고 했잖아. \n사진을 다시 보면 생각날지도 몰라!",
        // 대사 중 굵게 표시할 구절. dialogue에 있는 문구와 같게 적는다.
        dialogueBold: "돌잔치 사진에 적힌 날짜가 네 반이랑 자리 번호 같다",
      } },
  ],
};

// 그림 좌표 사각형을 게임 속 픽셀의 가운데 기준 사각형으로 바꾼다. top은 그 층이 그림에서 시작하는 세로 위치, scale은 그 층의 배율이다.
function schoolRect(rect, top, scale) {
  return { x: (rect.left + rect.right) / 2 * scale, y: ((rect.top + rect.bottom) / 2 - top) * scale,
    width: (rect.right - rect.left) * scale, height: (rect.bottom - rect.top) * scale };
}
for (const floor of SCHOOL_DATA.floors) {
  const top = floor.crop.top, scale = floor.scale;
  // 이 층의 게임 속 가로·세로 크기.
  floor.size = SCHOOL_DATA.floorSize * scale;
  floor.walkableRects = floor.walkable.map(rect => schoolRect(rect, top, scale));
  floor.obstacleRects = floor.obstacles.map(rect => schoolRect(rect, top, scale));
  // 방은 왼쪽 위 기준(x, y)과 크기를 쓴다. 방 안에 있는지 검사할 때 사용한다.
  floor.rooms = floor.rooms.map(room => {
    const rect = schoolRect(room.floor, top, scale);
    return { ...room, x: rect.x - rect.width / 2, y: rect.y - rect.height / 2, width: rect.width, height: rect.height };
  });
  floor.doors = floor.doors.map(door => ({ ...door, floorNumber: floor.number, openingRect: schoolRect(door.opening, top, scale), pictureRect: schoolRect(door.picture, top, scale) }));
  const stairs = schoolRect(floor.stairs, top, scale);
  floor.stairs = { ...stairs, arrival: { x: floor.stairs.arrival.x * scale, footY: (floor.stairs.arrival.footY - top) * scale } };
}
// 물체가 속한 층의 그림 좌표를 게임 좌표로 바꾼다.
for (const object of SCHOOL_DATA.objects) {
  const floor = SCHOOL_DATA.floors[object.floor - 1];
  Object.assign(object, schoolRect(object.rect, floor.crop.top, floor.scale));
  if (object.picture) object.pictureRect = schoolRect(object.picture, floor.crop.top, floor.scale);
}

// 학교 실내 크기·정문·시작 위치를 1층 그림에 맞춘다. 2층 크기는 currentInterior()에서 층마다 바꾼다.
const schoolInterior = CITY_DATA.interiors.find(room => room.placeId === SCHOOL_DATA.placeId);
const schoolFirstFloor = SCHOOL_DATA.floors[0];
Object.assign(schoolInterior, {
  width: schoolFirstFloor.size,
  height: schoolFirstFloor.size,
  wall: 0,
  exit: { ...schoolRect(SCHOOL_DATA.exit, 0, schoolFirstFloor.scale), side: "south" },
  spawn: { x: SCHOOL_DATA.spawn.x * schoolFirstFloor.scale, footY: SCHOOL_DATA.spawn.footY * schoolFirstFloor.scale, facing: "up" },
});
