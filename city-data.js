"use strict";

// 모든 좌표와 도로 폭은 기획서 PART 2의 1000×900 논리 좌표 기준이다.
// TODO: 장소 5곳의 중심 외에는 사용자가 허용한 임시 배치다. 최종 아트·단서 제작 시 확정한다.
const CITY_DATA = {
  width: 1000,
  height: 900,
  spawn: { x: 500, y: 450 },
  debug: false,
  frame: [[500, 8], [992, 245], [920, 892], [80, 892], [8, 245]],
  coast: [
    [500, 38], [555, 68], [605, 92], [660, 110], [710, 132], [760, 155],
    [820, 177], [870, 210], [920, 235], [950, 275], [948, 340], [930, 395],
    [940, 445], [925, 485], [930, 550], [915, 610], [900, 660], [855, 712],
    [805, 752], [740, 790], [670, 820], [590, 856], [520, 866], [440, 855],
    [370, 850], [300, 820], [235, 785], [180, 740], [125, 690], [90, 630],
    [75, 560], [65, 500], [70, 445], [60, 390], [65, 330], [70, 275],
    [112, 235], [165, 204], [225, 175], [290, 145], [350, 114], [415, 84], [470, 62],
  ],
  // points가 도로 중심선, width가 실제 보행 가능한 전체 폭이다.
  // 도로 그림과 이동 판정이 이 데이터를 함께 사용한다. 연결하려는 끝점은 같은 좌표로 둔다.
  roads: [
    { id: "R01", kind: "ring", width: 28, points: [
      [265, 405], [390, 405], [400, 295], [410, 210], [525, 180], [615, 195],
      [645, 225], [640, 275], [620, 345], [630, 445], [655, 470], [670, 530],
      [670, 625], [625, 680], [585, 710], [450, 710], [340, 685], [275, 640],
      [275, 485], [265, 405],
    ] },
    { id: "R02", kind: "branch", width: 22, points: [[500, 450], [390, 405]] },
    { id: "R03", kind: "branch", width: 22, points: [[500, 450], [520, 330], [525, 180]] },
    { id: "R04", kind: "branch", width: 22, points: [[500, 450], [630, 445]] },
    { id: "R05", kind: "branch", width: 22, points: [[500, 450], [500, 710]] },
    { id: "R06", kind: "branch", width: 22, points: [[500, 450], [390, 550], [275, 570]] },
    // 둥근 도로 끝·테두리가 건물과 그림자 아래까지 들어가지 않게 끝점을 조정한다.
    { id: "R07", kind: "street", width: 20, points: [[275, 640], [180, 650], [140, 640], [140, 633]] },
    { id: "R08", kind: "street", width: 18, points: [[265, 405], [265, 384]] },
    { id: "R09", kind: "street", width: 20, points: [[620, 345], [685, 345]] },
    { id: "R10", kind: "street", width: 20, points: [[670, 625], [690, 660], [730, 670], [740, 640]] },
    // 집 뒤편과 간격을 두고 쪽문 전용 골목으로 연결한다.
    { id: "R11", kind: "street", width: 28, points: [[450, 710], [585, 710]] },
    // 주택가 남쪽 도로는 잠긴 정문 쪽으로 이어진다.
    { id: "R12", kind: "street", width: 26, points: [
      [450, 710], [435, 740], [435, 800], [450, 840], [533, 842], [585, 842],
      [615, 820], [635, 755], [625, 680],
    ] },
    { id: "R13", kind: "alley", width: 14, points: [[390, 405], [345, 435], [345, 475], [380, 490], [420, 490], [445, 510], [500, 510]] },
    { id: "R14", kind: "alley", width: 14, points: [[500, 585], [550, 585], [575, 615], [625, 615], [670, 625]] },
    { id: "R15", kind: "alley", width: 14, points: [[275, 485], [220, 470], [200, 440], [140, 440], [125, 410]] },
    // 북쪽 쪽문은 이 골목을 통해서만 접근한다.
    { id: "R16", kind: "alley", width: 8, points: [[570, 710], [570, 720], [525, 720], [525, 722.667]] },
    // 남쪽 정문은 접근만 가능하며 잠금 상태를 유지한다.
    { id: "R17", kind: "street", width: 8, points: [[533, 842], [525, 842], [525, 824]] },
  ],
  // 크기는 기존 원본 값이다. game.js의 locationScale을 적용한다.
  locations: [
    { id: "C01", name: "사진관", x: 170, y: 565, width: 86, height: 64, color: "#c68f79", solid: true,
      doors: [{ side: "south", offset: -0.21, kind: "entrance" }] },
    { id: "C02", name: "학교", x: 265, y: 305, width: 126, height: 78, color: "#d4b572", solid: true,
      doors: [{ side: "south", offset: 0, kind: "entrance" }] },
    { id: "C03", name: "놀이공원", x: 774, y: 345, width: 134, height: 112, color: "#e9c9b1", solid: false },
    { id: "C04", name: "놀이터", x: 809, y: 571, width: 112, height: 94, color: "#e6d5a0", solid: false },
    // 대표점은 유지한다. offset은 대표점에 대한 실제 건물 중심의 논리 좌표 차이다.
    { id: "C05", name: "집", x: 533, y: 778, width: 76, height: 52, offset: { x: -8, y: -6 }, color: "#a6b7bd", solid: true,
      doors: [{ side: "south", offset: 0, kind: "locked" }, { side: "north", offset: 0, kind: "side" }] },
  ],
  // 일반 건물은 논리 좌표 크기를 그대로 쓴다. 자동 무작위 배치를 하지 않는다.
  buildings: [
    { x: 445, y: 145, width: 34, height: 28, color: "#bcb6a7" },
    { x: 500, y: 120, width: 32, height: 24, color: "#b6c2bc" },
    { x: 565, y: 140, width: 35, height: 26, color: "#cfb9a2" },
    { x: 450, y: 250, width: 34, height: 30, color: "#c7ac94" },
    { x: 465, y: 315, width: 30, height: 28, color: "#b4c2bf" },
    { x: 445, y: 365, width: 30, height: 28, color: "#cbbba6" },
    { x: 460, y: 395, width: 26, height: 22, color: "#b4b8c2" },
    { x: 555, y: 340, width: 26, height: 28, color: "#cbb09f" },
    { x: 565, y: 405, width: 28, height: 24, color: "#b1bfb9" },
    { x: 565, y: 495, width: 34, height: 26, color: "#c9bb9e" },
    { x: 590, y: 550, width: 28, height: 30, color: "#bac0c5" },
    { x: 535, y: 650, width: 30, height: 30, color: "#c8ad99" },
    { x: 585, y: 660, width: 26, height: 24, color: "#b6bfb2" },
    { x: 430, y: 570, width: 30, height: 28, color: "#c3b4a3" },
    { x: 445, y: 635, width: 34, height: 30, color: "#b0c2c5" },
    { x: 375, y: 625, width: 32, height: 30, color: "#c7bfa8" },
    { x: 315, y: 455, width: 22, height: 26, color: "#c3aca0" },
    { x: 315, y: 520, width: 28, height: 28, color: "#aebeba" },
    { x: 155, y: 390, width: 30, height: 28, color: "#c6b79f" },
    { x: 125, y: 340, width: 26, height: 26, color: "#b3c1bb" },
    { x: 175, y: 480, width: 30, height: 24, color: "#c6b2a7" },
    { x: 730, y: 215, width: 32, height: 26, color: "#c5bba7" },
    { x: 790, y: 215, width: 30, height: 26, color: "#b5c4bd" },
    { x: 855, y: 225, width: 30, height: 26, color: "#c7b3a9" },
    { x: 785, y: 700, width: 34, height: 26, color: "#c9b7a2" },
    { x: 835, y: 690, width: 30, height: 26, color: "#b8c1bd" },
    { x: 720, y: 740, width: 32, height: 28, color: "#c7ac9e" },
    { x: 305, y: 745, width: 34, height: 28, color: "#bac2b3" },
    { x: 355, y: 770, width: 32, height: 28, color: "#cbb99f" },
    { x: 395, y: 795, width: 28, height: 24, color: "#b4bec6" },
  ],
  landmarks: [
    { id: "L01", name: "분수대", type: "fountain", x: 210, y: 670, radius: 12 },
    { id: "L02", name: "시계탑", type: "clock", x: 335, y: 382, width: 16, height: 16 },
    { id: "L03", name: "연못", type: "pond", x: 585, y: 260, radiusX: 24, radiusY: 18 },
    { id: "L04", name: "큰 나무", type: "tree", x: 698, y: 570, radius: 18, trunkRadius: 5 },
  ],
  // 실제 이동 판정으로 시작점에서 각 지점까지 이어지는지 검사할 때 사용한다.
  // 목표 좌표는 캐릭터 중심이 아닌 발밑 기준이다.
  accessPoints: [
    { placeId: "C01", x: 140, y: 625 },
    { placeId: "C02", x: 265, y: 377 },
    { placeId: "C03", x: 680, y: 345 },
    { placeId: "C04", x: 740, y: 640 },
    { placeId: "C05", door: "north", x: 525, y: 725.5 },
    { placeId: "C05", door: "south", x: 525, y: 822 },
  ],
  // TODO: 허용된 임시 실내와 출입 판정 값이다. 실내 좌표는 월드 픽셀 단위이며 도시 배율을 적용하지 않는다.
  entrances: {
    interactDistance: 100,
    clickPadding: 12,
    cooldownMs: 250,
    messageDurationMs: 1800,
  },
  interiorUi: {
    enter: "문을 클릭해 들어가기",
    exit: "출구를 클릭해 나가기",
    exitLabel: "나가기",
    locked: "잠긴 문입니다.",
    tooFar: "문 가까이 이동하세요.",
  },
  interiors: [
    { placeId: "C01", name: "사진관", width: 1100, height: 800, wall: 32,
      floorColor: "#e4d8c8", wallColor: "#a38774", tileSize: 64,
      exit: { x: 550, y: 784, width: 96, height: 32, side: "south" },
      spawn: { x: 550, footY: 688, facing: "up" } },
    { placeId: "C02", name: "학교 1층", width: 1600, height: 1000, wall: 32,
      floorColor: "#e6dfc6", wallColor: "#a59c7d", tileSize: 64,
      exit: { x: 800, y: 984, width: 96, height: 32, side: "south" },
      spawn: { x: 800, footY: 888, facing: "up" } },
    { placeId: "C05", name: "집", width: 1200, height: 900, wall: 32,
      floorColor: "#d7c5ac", wallColor: "#998674", tileSize: 64,
      exit: { x: 600, y: 16, width: 96, height: 32, side: "north" },
      spawn: { x: 600, footY: 112, facing: "down" } },
  ],
};
