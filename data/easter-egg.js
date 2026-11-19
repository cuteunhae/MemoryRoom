"use strict";

const EASTER_EGG_DATA = {
  id: "EGG-STATIONERY", itemId: "EGG-ITEM-01", viewer: "starSnack",
  // TODO: R02 북쪽 끝의 임시 문방구. 좌표·크기는 도시 그림의 논리 픽셀이다.
  shop: { x: 1019, y: 32, width: 94, height: 60, sprite: null },
  owner: { x: 1007, y: 39, width: 26, height: 27 },
  snack: { x: 1031, y: 54, width: 20, height: 17 },
  approach: { x: 1019, y: 84 },
  hint: { x: 1113, y: 26 },
  autoDistance: 35, interactDistance: 48, clickPadding: 3,
  // TODO: 봉지 안 배치는 백분율 좌표다. 최종 간식 그림으로 교체할 수 있다.
  crumbs: Array.from({ length: 54 }, (_, i) => ({ x: 5 + i % 9 * 10 + Math.sin(i * 3) * 2,
    y: 10 + Math.floor(i / 9) * 14 + Math.cos(i * 5) * 3, turn: i * 47 % 180 })),
  stars: [{ id: "STAR-01", x: 18, y: 27 }, { id: "STAR-02", x: 69, y: 19 },
    { id: "STAR-03", x: 43, y: 55 }, { id: "STAR-04", x: 80, y: 74 }],
  sparkleMs: 1100, sparkleImage: "assets/guide-star.png",
  text: {
    shop: "골목 문방구", owner: "문방구 주인", snack: "별뽀빠이", draw: "뽑기",
    purpose: "골목 문방구에서 받은 기념품", star: "별사탕",
    dialogue: ["어머, 너 오랜만이다. 잘 지냈어?", "넌 이거 사면 꼭 별사탕부터 골라 먹었잖아.",
      "봉지 안에 별이 몇 개 들었나 한참 들여다보고.", "하나 가져가. 오늘은 별이 좀 많이 들었으려나."],
    keyHint: "{key}키로 대화하기", keyHintClick: "클릭해서 대화하기",
    tooFar: "가까이에서 살펴보세요.", acquired: "별뽀빠이를 기념품으로 받았습니다.",
    look: "과자 사이에 작은 별사탕이 들어 있어요.",
  },
};
ITEM_DATA.push({ id: EASTER_EGG_DATA.itemId, name: EASTER_EGG_DATA.text.snack,
  purpose: EASTER_EGG_DATA.text.purpose, viewer: EASTER_EGG_DATA.viewer });
