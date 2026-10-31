"use strict";

// TODO: 임시 실내 기준 픽셀 좌표·크기·조사 거리. 최종 실내 제작 시 조정한다.
const INSPECTION_OBJECTS = [{
  id: "studio-album", placeId: "C01", name: "사진첩", rewardId: "ITM-01",
  x: 820, y: 370, width: 64, height: 44, interactDistance: 140,
  color: "#785e79",
  table: { x: 820, y: 370, width: 200, height: 110, color: "#b58b65" },
  messages: {
    tooFar: "사진첩 가까이에서 클릭해 주세요.",
    acquired: "돌잔치 사진을 획득했습니다. (I: 인벤토리)",
    alreadyAcquired: "이미 돌잔치 사진을 가져갔습니다.",
  },
}];
