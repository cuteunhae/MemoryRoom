"use strict";

// 학교 실내는 에셋 그림 두 장을 겹쳐 그린다. 두 그림은 문 부분만 다르고 나머지는 같다.
// - assets/school-doors-closed.png: 문이 모두 닫힌 그림 (887×1774, 위쪽 절반이 1층, 아래쪽 절반이 2층)
// - assets/school-doors-open.png: 문이 모두 열린 그림
// 닫힌 그림을 깔고, 열린 문 자리만 열린 그림에서 잘라 덮어 그린다.
// 아래 좌표는 모두 그림 전체(887×1774)의 픽셀 위치이며, 사각형은 { left, top, right, bottom }으로 적는다.
// 파일 맨 아래에서 층이 그림에서 시작하는 위치(crop.top)를 빼고 scale을 곱해 게임 속 픽셀(가운데 x·y, width·height)로 바꾼다.
// TODO: 걸을 수 있는 곳·장애물·문·계단 좌표는 그림을 눈으로 재서 맞춘 임시 값이다. 플레이 테스트에서 조정한다.
const SCHOOL_DATA = {
  placeId: "C02",
  images: { closed: "assets/school-doors-closed.png", open: "assets/school-doors-open.png" },
  // 그림 1픽셀을 게임 속 몇 픽셀로 키울지 정한다.
  scale: 4.5,
  floorSize: 887,
  interactDistance: 140,
  floors: [
    { number: 1, name: "학교 1층", crop: { left: 0, top: 0, right: 887, bottom: 887 },
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
        { left: 135, top: 265, right: 312, bottom: 355 }, { left: 88, top: 345, right: 180, bottom: 410 }, // 교무실 책상·탁자
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
      // 정문은 사용자 결정으로 항상 열린 그림을 쓴다(유리문 없음).
      alwaysOpen: [{ left: 285, top: 722, right: 605, bottom: 872 }],
      // 계단은 클릭하면 다른 층으로 간다. arrival은 이 층에 도착했을 때 발밑 위치다.
      stairs: { left: 385, top: 130, right: 500, bottom: 312, arrival: { x: 443, footY: 330 } },
    },
    { number: 2, name: "학교 2층", crop: { left: 0, top: 887, right: 887, bottom: 1774 },
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
    boardIntro: "층마다 위쪽 줄과 아래쪽 줄로 나누어 왼쪽 → 오른쪽 순서로 적었습니다.\n\n" },
  objects: [
    // 반 배치 게시판은 로비 왼쪽 게시판 그림이다. 그림이 있으므로 따로 그리지 않는다(hidden).
    { id: "school-board", placeId: "C02", floor: 1, type: "board", name: "반 배치 게시판", hidden: true, solid: true,
      rect: { left: 172, top: 495, right: 280, bottom: 555 }, interactDistance: 160, color: "#97744b", messages: { tooFar: "게시판 가까이에서 클릭해 주세요." } },
    // TODO: 선생님 그림이 없어 임시 도형으로 그린다.
    { id: "school-teacher", placeId: "C02", floor: 1, type: "dialogue", name: "선생님",
      rect: { left: 324, top: 622, right: 335, bottom: 634 }, interactDistance: 140, color: "#557d78", messages: {
      tooFar: "선생님 가까이에서 클릭해 주세요.",
      dialogue: "오랜만이구나! 졸업하고 어떻게 지내는지 궁금했단다. 아참, 저 게시판에는 새로 입학한 학생들을 위한 반 배치도가 있단다. 한번 살펴보렴.",
    } },
  ],
};

// 그림 좌표 사각형을 게임 속 픽셀의 가운데 기준 사각형으로 바꾼다. top은 그 층이 그림에서 시작하는 세로 위치다.
function schoolRect(rect, top = 0) {
  const scale = SCHOOL_DATA.scale;
  return { x: (rect.left + rect.right) / 2 * scale, y: ((rect.top + rect.bottom) / 2 - top) * scale,
    width: (rect.right - rect.left) * scale, height: (rect.bottom - rect.top) * scale };
}
for (const floor of SCHOOL_DATA.floors) {
  const top = floor.crop.top;
  floor.walkableRects = floor.walkable.map(rect => schoolRect(rect, top));
  floor.obstacleRects = floor.obstacles.map(rect => schoolRect(rect, top));
  // 방은 왼쪽 위 기준(x, y)과 크기를 쓴다. 방 안에 있는지 검사할 때 사용한다.
  floor.rooms = floor.rooms.map(room => {
    const rect = schoolRect(room.floor, top);
    return { ...room, x: rect.x - rect.width / 2, y: rect.y - rect.height / 2, width: rect.width, height: rect.height };
  });
  floor.doors = floor.doors.map(door => ({ ...door, floorNumber: floor.number, openingRect: schoolRect(door.opening, top), pictureRect: schoolRect(door.picture, top) }));
  const stairs = schoolRect(floor.stairs, top);
  floor.stairs = { ...stairs, arrival: { x: floor.stairs.arrival.x * SCHOOL_DATA.scale, footY: (floor.stairs.arrival.footY - top) * SCHOOL_DATA.scale } };
}
// 물체는 모두 1층에 있다.
for (const object of SCHOOL_DATA.objects) Object.assign(object, schoolRect(object.rect, SCHOOL_DATA.floors[object.floor - 1].crop.top));

// 학교 실내 크기·정문·시작 위치를 그림 크기에 맞춘다.
const schoolInterior = CITY_DATA.interiors.find(room => room.placeId === SCHOOL_DATA.placeId);
Object.assign(schoolInterior, {
  width: SCHOOL_DATA.floorSize * SCHOOL_DATA.scale,
  height: SCHOOL_DATA.floorSize * SCHOOL_DATA.scale,
  wall: 0,
  exit: { ...schoolRect(SCHOOL_DATA.exit), side: "south" },
  spawn: { x: SCHOOL_DATA.spawn.x * SCHOOL_DATA.scale, footY: SCHOOL_DATA.spawn.footY * SCHOOL_DATA.scale, facing: "up" },
});
