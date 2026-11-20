"use strict";

const EASTER_EGG_DATA = {
  id: "EGG-STATIONERY", itemId: "EGG-ITEM-01", viewer: "starSnack",
  // TODO: 도시 입장 영역은 논리 픽셀, 실내 배치와 조사 거리는 실내 픽셀이다.
  entrance: { x: 1019, y: 24, width: 26, height: 28 },
  returnPoint: { x: 1019, footY: 100, facing: "down" },
  interior: { placeId: "EGG-STATIONERY", name: "골목 문방구", width: 900, height: 650,
    wall: 24, cameraFillViewport: true, wallColor: "#95795d", floorColor: "#ead5ae",
    spawn: { x: 450, footY: 490, facing: "up" },
    exit: { x: 450, y: 600, width: 140, height: 40, side: "south" } },
  owner: { x: 450, y: 120, width: 50, height: 70 },
  snack: { x: 545, y: 186, width: 60, height: 45 },
  counter: { x: 450, y: 190, width: 400, height: 90 },
  shelves: [{ x: 100, y: 260, width: 110, height: 320, kind: "stationery" },
    { x: 800, y: 260, width: 110, height: 320, kind: "draw" }],
  interactDistance: 190, clickPadding: 12,
  // TODO: 봉지 안 배치는 백분율 좌표다. 최종 간식 그림으로 교체할 수 있다.
  crumbs: Array.from({ length: 54 }, (_, i) => ({ x: 5 + i % 9 * 10 + Math.sin(i * 3) * 2,
    y: 10 + Math.floor(i / 9) * 14 + Math.cos(i * 5) * 3, turn: i * 47 % 180 })),
  stars: [{ id: "STAR-01", x: 18, y: 27 }, { id: "STAR-02", x: 69, y: 19 },
    { id: "STAR-03", x: 43, y: 55 }, { id: "STAR-04", x: 80, y: 74 }],
  sparkleMs: 1100, sparkleImage: "assets/guide-star.png",
  text: {
    shop: "골목 문방구", owner: "문방구 주인", snack: "별뽀빠이", draw: "뽑기",
    stationery: "공책 · 지우개", exit: "골목으로 나가기", exitHint: "출입구까지 걸어가면 나갑니다.",
    purpose: "골목 문방구에서 받은 기념품", star: "별사탕",
    dialogue: ["어머, 너 오랜만이다. 잘 지냈어?", "넌 이거 사면 꼭 별사탕부터 골라 먹었잖아.",
      "봉지 안에 별이 몇 개 들었나 한참 들여다보고.", "하나 가져가. 오늘은 별이 좀 많이 들었으려나."],
    keyHint: "{key}키로 대화하기", keyHintClick: "클릭해서 대화하기",
    tooFar: "가까이에서 살펴보세요.", acquired: "별뽀빠이를 기념품으로 받았습니다.",
    look: "과자 사이에 작은 별사탕이 들어 있어요.",
  },
};
CITY_DATA.interiors.push(EASTER_EGG_DATA.interior);
ITEM_DATA.push({ id: EASTER_EGG_DATA.itemId, name: EASTER_EGG_DATA.text.snack,
  purpose: EASTER_EGG_DATA.text.purpose, viewer: EASTER_EGG_DATA.viewer });
