"use strict";

const ITEM_DATA = [
  { id: "ITM-01", name: "돌잔치 사진", icon: "assets/item-photo.png", purpose: "학교 단서, 장식장", acquisitionFlag: "photoCollected", viewer: "photo", date: "2003.09.01" },
  { id: "ITM-02", name: "알림장", purpose: "보건실 약도", viewer: "infirmary" },
  { id: "ITM-03", name: "크레파스", icon: "assets/item-crayon.png", purpose: "보건실 명부, 장식장" },
  { id: "ITM-04", name: "머리띠", icon: "assets/item-headband.png", purpose: "장식장" },
  { id: "ITM-05", name: "풍선", icon: "assets/item-balloon.png", purpose: "놀이공원 획득" },
  { id: "ITM-06", name: "놀이터 메모", purpose: "놀이터 약도", viewer: "playgroundMemo" },
  { id: "ITM-07", name: "비눗방울 장난감", icon: "assets/item-toy.png", purpose: "곰 인형 단서, 장식장" },
  { id: "ITM-08", name: "곰 인형", icon: "assets/item-bear.png", purpose: "장식장" },
  { id: "ITM-09", name: "아이 방 열쇠", purpose: "아이 방문" },
  { id: "ITM-10", name: "일기장", icon: "assets/item-diary.png", purpose: "3페이지 읽기", viewer: "diary" },
];

const INVENTORY_TEXT = {
  empty: "아직 획득한 아이템이 없습니다.",
  selected: "선택됨",
};
