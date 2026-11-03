"use strict";

const HOUSE_DATA = {
  placeId: "C05", keyId: "ITM-09", wallThickness: 16, interactDistance: 120,
  // TODO: 방·문·인형 위치와 크기는 현재 1200×900 실내용 임시 픽셀 설정이다.
  rooms: [
    { id: "bedroom", name: "안방", x: 32, y: 220, width: 400, height: 430, door: { side: "east", center: 450, width: 140 } },
    { id: "kitchen", name: "부엌", x: 768, y: 220, width: 400, height: 430, door: { side: "west", center: 450, width: 140 } },
    { id: "child", name: "아이 방", x: 432, y: 650, width: 336, height: 218, door: { side: "north", center: 600, width: 140 } },
  ],
  cabinet: { x: 600, y: 290, width: 100, height: 140 },
  text: { hall: "마루", cabinet: "장식장", locked: "아이 방 문이 잠겨 있습니다.", unlocked: "열쇠로 아이 방 문을 열었습니다.", near: "가까이에서 클릭해 주세요.", acquired: "획득했습니다.", already: "이미 가져간 인형입니다." },
  dolls: [
    { id: "DOLL-01", itemId: "ITM-08", kind: "bear", name: "곰 인형", x: 120, y: 330, width: 64, height: 90 },
    { id: "DOLL-02", itemId: "DOLL-ITEM-02", kind: "rabbit", name: "토끼 인형", x: 240, y: 330, width: 64, height: 90 },
    { id: "DOLL-03", itemId: "DOLL-ITEM-03", kind: "dog", name: "강아지 인형", x: 350, y: 330, width: 64, height: 90 },
    { id: "DOLL-04", itemId: "DOLL-ITEM-04", kind: "cat", name: "고양이 인형", x: 150, y: 530, width: 64, height: 80 },
    { id: "DOLL-05", itemId: "DOLL-ITEM-05", kind: "dolphin", name: "돌고래 인형", x: 300, y: 530, width: 86, height: 64 },
  ],
};
// 장식장에서는 허용된 아이템 ID와 속성을 함께 검사할 수 있도록 명시한다.
for (const item of ITEM_DATA) item.cabinetUsable = CABINET_DATA.allowedItemIds.includes(item.id);
ITEM_DATA.push(...HOUSE_DATA.dolls.filter(doll => doll.kind !== "bear").map(doll => ({
  id: doll.itemId, name: doll.name, purpose: "장식장 사용 불가", cabinetUsable: false, puzzleUse: false,
})));
