"use strict";

// 도시 그림(assets/city-map.png, 1672×941)의 픽셀 위치를 그대로 논리 좌표로 쓴다.
// 사용자 결정(2026-11-07): 기획서 PART 2 좌표 대신 그림의 배치를 따른다.
// TODO: 보행 구역·문·장애물 좌표는 그림을 눈으로 재서 맞춘 값이다. 플레이 테스트에서 조정한다.
const CITY_DATA = {
  width: 1672,
  height: 941,
  mapImage: "assets/city-map.png",
  spawn: { x: 748, y: 640 },
  debug: false,
  // 그림 전체가 이동 가능한 범위의 바깥 경계다. 바다·해안선이 없으므로 두 값을 같게 둔다.
  frame: [[0, 0], [1672, 0], [1672, 941], [0, 941]],
  coast: [[0, 0], [1672, 0], [1672, 941], [0, 941]],
  // points가 도로 중심선, width가 실제 보행 가능한 전체 폭이다. 그림의 포장된 길에 맞춘다.
  // 다른 길과 만나는 끝은 둥글게 처리되므로, 끝이 큰길 반대쪽으로 튀어나오지 않게 끝점을 큰길 안쪽에 둔다.
  // 튀어나오면 그 안에 들어갔을 때 좌우로 움직일 수 없다.
  // 그림을 불러오지 못했을 때의 임시 그림과 이동 판정이 이 데이터를 함께 사용한다.
  roads: [
    // 위쪽 가로 큰길: 학교·집·사진관 앞을 지난다.
    { id: "R01", kind: "main", width: 48, points: [[80, 296], [1465, 296]] },
    // 집과 사진관 사이에서 지도 위쪽 끝까지 이어지는 세로 길.
    { id: "R02", kind: "street", width: 30, points: [[1019, 296], [1019, 10]] },
    // 가운데 세로 큰길: 위쪽 큰길에서 아래쪽 큰길까지 이어진다.
    { id: "R03", kind: "main", width: 70, points: [[748, 310], [748, 860]] },
    // 가운데 별 모양 원형 광장. 길이 0인 선이라 폭이 지름이 된다.
    { id: "R04", kind: "plaza", width: 170, points: [[748, 612], [748, 612]] },
    // 아래쪽 가로 큰길: 놀이터 출입구와 놀이공원 정문 앞을 지난다.
    { id: "R05", kind: "main", width: 60, points: [[255, 866], [1600, 866]] },
    // 왼쪽 아래 나무다리.
    { id: "R06", kind: "street", width: 62, points: [[296, 868], [296, 934]] },
    // 학교 앞마당. 마지막 점은 위쪽 큰길과 만나는 분기점이며 사진 뒷면의 기준이다.
    { id: "R07", kind: "street", width: 90, points: [[442, 206], [442, 275]] },
    // 집 정문으로 가는 돌길. 정문은 잠겨 있다.
    { id: "R08", kind: "street", width: 40, points: [[846, 192], [846, 296]] },
    // 사진관 앞마당.
    { id: "R09", kind: "street", width: 90, points: [[1228, 212], [1228, 275]] },
    // 놀이터 남쪽 출입구.
    { id: "R10", kind: "street", width: 100, points: [[388, 845], [388, 790]] },
    // 놀이공원 정문(아치).
    { id: "R11", kind: "street", width: 100, points: [[1243, 840], [1243, 778]] },
    // 세로 길(R02)에서 집 뒤편 나무 쪽문으로 들어가는 짧은 골목. 쪽문은 이 골목을 통해서만 닿는다.
    { id: "R16", kind: "alley", width: 20, points: [[1019, 205], [1005, 205]] },
    // 위쪽 큰길에서 놀이공원 북쪽 분홍 길로 내려가는 연결로. 폭은 그림의 분홍 길(x 1200~1320)에 맞춘다.
    { id: "R17", kind: "street", width: 120, points: [[1260, 335], [1260, 360]] },
  ],
  // locationScale과 worldScale이 같으므로 width·height는 그림 픽셀 크기 그대로다.
  locations: [
    { id: "C01", name: "사진관", x: 1230, y: 121, width: 206, height: 158, color: "#c68f79", solid: true,
      doors: [{ side: "south", offset: 0, kind: "entrance", width: 40, height: 12 }] },
    { id: "C02", name: "학교", x: 442, y: 125, width: 266, height: 150, color: "#d4b572", solid: true,
      doors: [{ side: "south", offset: 0, kind: "entrance", width: 40, height: 12 }] },
    // 야외 장소는 walkArea 다각형 안을 걸을 수 있다. 없으면 사각형 전체를 걷는다.
    { id: "C03", name: "놀이공원", x: 1243, y: 562, width: 736, height: 454, color: "#e9c9b1", solid: false,
      walkArea: [[1000, 338], [1490, 338], [1530, 358], [1562, 400], [1600, 470], [1612, 520], [1612, 740],
        [1580, 776], [1300, 778], [1300, 792], [1186, 792], [1186, 778], [905, 772], [878, 740], [875, 560],
        [880, 480], [920, 420], [960, 368]] },
    { id: "C04", name: "놀이터", x: 365, y: 598, width: 594, height: 404, color: "#e6d5a0", solid: false },
    // 정문(남쪽)은 잠겨 있고, 오른쪽 담장의 나무 쪽문으로 들어간다. 쪽문은 건물 밖 담장에 있어 위치를 직접 적는다.
    { id: "C05", name: "집", x: 846, y: 100, width: 168, height: 160, color: "#a6b7bd", solid: true,
      doors: [{ side: "south", offset: 0, kind: "locked", width: 30, height: 12 },
        { side: "east", kind: "side", x: 990, y: 200, width: 12, height: 45 }] },
  ],
  // 그림 속 큰 장애물(놀이공원 안 화단). 논리 좌표 사각형이다.
  obstacles: [
    { id: "park-garden-west", x: 1035, y: 615, width: 180, height: 150 },
    { id: "park-garden-east", x: 1458, y: 615, width: 180, height: 150 },
  ],
  // 일반 건물은 그림에 없으므로 비워 둔다. 그림이 없을 때의 임시 그림에만 쓰인다.
  buildings: [],
  landmarks: [
    { id: "L02", name: "시계탑", type: "clock", x: 441, y: 85, width: 16, height: 16 },
    { id: "L03", name: "연못", type: "pond", x: 1505, y: 115, radiusX: 82, radiusY: 55 },
    { id: "L04", name: "큰 나무", type: "tree", x: 30, y: 590, radius: 18, trunkRadius: 5 },
  ],
  // 실제 이동 판정으로 시작점에서 각 지점까지 이어지는지 검사할 때 사용한다.
  // 목표 좌표는 캐릭터 중심이 아닌 발밑 기준이다.
  accessPoints: [
    { placeId: "C01", x: 1230, y: 215 },
    { placeId: "C02", x: 442, y: 215 },
    { placeId: "C03", x: 1243, y: 800 },
    { placeId: "C04", x: 388, y: 815 },
    { placeId: "C05", door: "east", x: 1003, y: 205 },
    { placeId: "C05", door: "south", x: 846, y: 205 },
  ],
  // TODO: 허용된 임시 실내와 출입 판정 값이다. 실내 좌표는 월드 픽셀 단위이며 도시 배율을 적용하지 않는다.
  entrances: {
    interactDistance: 100,
    clickPadding: 12,
    cooldownMs: 250,
    messageDurationMs: 1800,
  },
  interiorUi: {
    enter: "E키를 클릭해 들어가기",
    exit: "E키를 클릭해 나가기",
    exitLabel: "나가기",
    locked: "잠긴 문입니다.",
    tooFar: "문 가까이 이동하세요.",
  },
  interiors: [
    // 사진관은 그림(1671×941)을 0.8배로 그린다. walkable·obstacles는 그림 픽셀 좌표이고, 아래에서 게임 좌표로 바꾼다.
    // TODO: 배율과 걷는 범위는 임시 값이다. 플레이 테스트에서 조정한다.
    { placeId: "C01", name: "사진관", wall: 0, floorColor: "#e4d8c8", wallColor: "#a38774", tileSize: 64,
      picture: { src: "assets/studio-interior.png", imageWidth: 1671, imageHeight: 941, scale: 0.8,
        walkable: [
          { left: 42, top: 275, right: 1628, bottom: 840 },
          // 아래쪽 문 틈.
          { left: 785, top: 840, right: 885, bottom: 915 },
        ],
        obstacles: [
          { left: 85, top: 285, right: 468, bottom: 420 }, // 안내 데스크
          { left: 815, top: 200, right: 890, bottom: 402 }, // 가운데 칸막이
          { left: 42, top: 525, right: 178, bottom: 785 }, // 소파
          { left: 218, top: 597, right: 345, bottom: 690 }, // 탁자
          { left: 212, top: 703, right: 350, bottom: 790 }, // 발받침
          { left: 1048, top: 275, right: 1118, bottom: 332 }, // 왼쪽 조명
          { left: 1550, top: 275, right: 1615, bottom: 332 }, // 오른쪽 조명
          { left: 1302, top: 275, right: 1378, bottom: 308 }, // 촬영 의자
          { left: 1272, top: 335, right: 1380, bottom: 505 }, // 카메라
        ] },
      exit: { x: 668, y: 716, width: 96, height: 32, side: "south" },
      spawn: { x: 668, footY: 650, facing: "up" } },
    { placeId: "C02", name: "학교 1층", width: 1600, height: 1000, wall: 32,
      floorColor: "#e6dfc6", wallColor: "#a59c7d", tileSize: 64,
      exit: { x: 800, y: 984, width: 96, height: 32, side: "south" },
      spawn: { x: 800, footY: 888, facing: "up" } },
    // 집은 그림(1254×1254) 픽셀이 곧 게임 좌표다. 사용자 결정(2026-11-08): 부엌은 그림에서 벽으로 막혀 있어 들어가지 못한다.
    // TODO: 걷는 범위는 임시 값이다. 플레이 테스트에서 조정한다.
    { placeId: "C05", name: "집", wall: 0, floorColor: "#d7c5ac", wallColor: "#998674", tileSize: 64,
      picture: { src: "assets/house-interior.png", imageWidth: 1254, imageHeight: 1254, scale: 1,
        walkable: [
          { left: 18, top: 232, right: 312, bottom: 497 }, // 아이 방
          { left: 238, top: 497, right: 302, bottom: 521 }, // 아이 방 문 틈
          { left: 945, top: 232, right: 1238, bottom: 497 }, // 안방
          { left: 952, top: 497, right: 1018, bottom: 521 }, // 안방 문 틈
          { left: 332, top: 232, right: 418, bottom: 372 }, // 부엌 왼쪽 복도
          { left: 332, top: 372, right: 925, bottom: 521 }, // 마루 위쪽
          { left: 212, top: 520, right: 1042, bottom: 932 }, // 마루
          { left: 212, top: 930, right: 353, bottom: 952 }, // 마루 왼쪽 아래
          { left: 897, top: 930, right: 1042, bottom: 952 }, // 마루 오른쪽 아래
          { left: 382, top: 930, right: 868, bottom: 1130 }, // 현관
          { left: 575, top: 1130, right: 665, bottom: 1215 }, // 현관문 틈
        ],
        obstacles: [
          { left: 168, top: 165, right: 302, bottom: 262 }, // 아이 방 책상과 의자
          { left: 995, top: 170, right: 1172, bottom: 372 }, // 안방 침대(인형이 놓여 있다)
          { left: 1170, top: 205, right: 1232, bottom: 305 }, // 안방 협탁
          { left: 463, top: 455, right: 742, bottom: 521 }, // 벽 그림과 시계
          { left: 333, top: 585, right: 398, bottom: 768 }, // TV
          { left: 472, top: 558, right: 678, bottom: 672 }, // 소파
          { left: 675, top: 600, right: 755, bottom: 725 }, // 1인 소파
          { left: 502, top: 695, right: 650, bottom: 762 }, // 거실 탁자
          { left: 387, top: 950, right: 498, bottom: 1088 }, // 옷장
          { left: 730, top: 950, right: 858, bottom: 1070 }, // 신발장
        ] },
      exit: { x: 620, y: 1180, width: 96, height: 32, side: "south" },
      spawn: { x: 620, footY: 1110, facing: "up" } },
  ],
};

// 그림을 쓰는 실내: 크기를 그림에 맞추고, 그림 픽셀 사각형을 게임 좌표(가운데 x·y, width·height)로 바꾼다.
for (const interior of CITY_DATA.interiors) {
  const picture = interior.picture;
  if (!picture) continue;
  const convert = rect => ({
    x: (rect.left + rect.right) / 2 * picture.scale, y: (rect.top + rect.bottom) / 2 * picture.scale,
    width: (rect.right - rect.left) * picture.scale, height: (rect.bottom - rect.top) * picture.scale,
  });
  interior.width = Math.round(picture.imageWidth * picture.scale);
  interior.height = Math.round(picture.imageHeight * picture.scale);
  picture.walkableRects = picture.walkable.map(convert);
  picture.obstacleRects = picture.obstacles.map(convert);
}
