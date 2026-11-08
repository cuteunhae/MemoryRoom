"use strict";

const CABINET_DATA = {
  answer: ["ITM-01", "ITM-03", "ITM-04", "ITM-07", "ITM-08"],
  keyId: "ITM-09",
  // 배치 화면의 열린 진열장 그림. slotRects는 1~5번 칸의 위치이며 원본 그림(1254×1254) 픽셀이다.
  // 그림의 칸은 6개이고 퍼즐은 5칸이라, 왼쪽→오른쪽·위→아래 순서로 놓고 오른쪽 아래 칸은 비워 둔다.
  openImage: { src: "assets/cabinet-open.png", width: 1254, height: 1254 },
  slotRects: [
    { left: 305, top: 238, right: 612, bottom: 425 },
    { left: 640, top: 238, right: 948, bottom: 425 },
    { left: 305, top: 465, right: 612, bottom: 640 },
    { left: 640, top: 465, right: 948, bottom: 640 },
    { left: 305, top: 682, right: 612, bottom: 900 },
  ],
  rules: { slotCount: 5, occupiedFromInventory: "returnToInventory", occupiedFromSlot: "swap", resetWhenUnsolved: true, lockWhenSolved: true },
  text: {
    title: "장식장 배치", help: "보유 아이템을 선택하고 칸을 클릭하세요. 배치한 아이템을 클릭하면 다른 칸으로 옮길 수 있습니다.",
    empty: "빈 칸", slot: "번 칸", inventory: "보유 아이템", unusable: "장식장에 넣을 수 없는 아이템입니다.",
    solved: "장식장이 완성되었습니다. 아이 방 열쇠를 얻었습니다.",
    resetNotice: "완성 전에 닫으면 배치한 아이템이 모두 인벤토리로 돌아갑니다.",
  },
};
CABINET_DATA.allowedItemIds = [...CABINET_DATA.answer];
