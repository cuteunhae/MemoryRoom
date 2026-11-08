"use strict";

const HOUSE_DATA = {
  placeId: "C05", keyId: "ITM-09", wallThickness: 0, interactDistance: 120,
  // 집 그림(픽셀 = 게임 좌표) 기준 위치다. door는 걸어서 지나는 틈, picture는 문 그림(클릭 범위), floor는 문이 열렸을 때 덮을 바닥 그림의 왼쪽 위다.
  // 부엌에는 문이 이어져 있지 않아 들어가지 못한다.
  // TODO: 방·문·인형 위치와 크기는 임시 설정이다.
  rooms: [
    { id: "bedroom", name: "안방", x: 945, y: 232, width: 293, height: 265,
      door: { x: 985, y: 509, width: 66, height: 24, picture: { x: 985, y: 465, width: 80, height: 100 }, floor: { x: 1045, y: 380 } } },
    { id: "kitchen", name: "부엌", x: 435, y: 225, width: 490, height: 125 },
    { id: "child", name: "아이 방", x: 18, y: 232, width: 294, height: 265,
      door: { x: 270, y: 509, width: 64, height: 24, picture: { x: 270, y: 465, width: 80, height: 100 }, floor: { x: 120, y: 380 } } },
  ],
  cabinet: { x: 832, y: 590, width: 135, height: 170 },
  text: { hall: "마루", cabinet: "장식장", locked: "아이 방 문이 잠겨 있습니다.", unlocked: "열쇠로 아이 방 문을 열었습니다.", near: "가까이에서 클릭해 주세요.", acquired: "획득했습니다.", already: "이미 가져간 인형입니다." },
  // 인형은 안방 침대 위에 놓는다. 사용자 결정(2026-11-08): 고양이 인형 그림이 없어 돼지 인형으로 바꿨다(기획서와 다름).
  dolls: [
    { id: "DOLL-01", itemId: "ITM-08", kind: "bear", name: "곰 인형", x: 1030, y: 270, width: 46, height: 46, sprite: { src: "assets/item-bear.png" } },
    { id: "DOLL-02", itemId: "DOLL-ITEM-02", kind: "rabbit", name: "토끼 인형", x: 1082, y: 270, width: 46, height: 46, sprite: { src: "assets/item-rabbit.png" } },
    { id: "DOLL-03", itemId: "DOLL-ITEM-03", kind: "dog", name: "강아지 인형", x: 1134, y: 270, width: 46, height: 46, sprite: { src: "assets/item-dog.png" } },
    { id: "DOLL-04", itemId: "DOLL-ITEM-04", kind: "pig", name: "돼지 인형", x: 1056, y: 330, width: 46, height: 46, sprite: { src: "assets/item-pig.png" } },
    { id: "DOLL-05", itemId: "DOLL-ITEM-05", kind: "dolphin", name: "돌고래 인형", x: 1110, y: 330, width: 46, height: 46, sprite: { src: "assets/item-dolphin.png" } },
  ],
};
// 장식장에서는 허용된 아이템 ID와 속성을 함께 검사할 수 있도록 명시한다.
for (const item of ITEM_DATA) item.cabinetUsable = CABINET_DATA.allowedItemIds.includes(item.id);
ITEM_DATA.push(...HOUSE_DATA.dolls.filter(doll => doll.kind !== "bear").map(doll => ({
  id: doll.itemId, name: doll.name, icon: doll.sprite.src, purpose: "장식장 사용 불가", cabinetUsable: false, puzzleUse: false,
})));
