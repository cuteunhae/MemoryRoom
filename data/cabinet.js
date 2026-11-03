"use strict";

const CABINET_DATA = {
  answer: ["ITM-01", "ITM-03", "ITM-04", "ITM-07", "ITM-08"],
  keyId: "ITM-09",
  rules: { slotCount: 5, occupiedFromInventory: "returnToInventory", occupiedFromSlot: "swap", resetWhenUnsolved: true, lockWhenSolved: true },
  text: {
    title: "장식장 배치", help: "보유 아이템을 선택하고 칸을 클릭하세요. 배치한 아이템을 클릭하면 다른 칸으로 옮길 수 있습니다.",
    empty: "빈 칸", slot: "번 칸", inventory: "보유 아이템", unusable: "장식장에 넣을 수 없는 아이템입니다.",
    solved: "장식장이 완성되었습니다. 아이 방 열쇠를 얻었습니다.",
    resetNotice: "완성 전에 닫으면 배치한 아이템이 모두 인벤토리로 돌아갑니다.",
  },
};
CABINET_DATA.allowedItemIds = [...CABINET_DATA.answer];
