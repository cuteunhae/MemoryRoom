"use strict";

// TODO: 임시 실내 기준 픽셀 좌표·크기·조사 거리. 최종 실내 제작 시 조정한다.
const INSPECTION_OBJECTS = [{
  id: "studio-album", placeId: "C01", name: "사진첩", type: "album", rewardId: "ITM-01",
  x: 820, y: 370, width: 64, height: 44, interactDistance: 140,
  color: "#785e79",
  table: { x: 820, y: 370, width: 200, height: 110, color: "#b58b65" },
  messages: {
    tooFar: "사진첩 가까이에서 클릭해 주세요.",
    acquired: "돌잔치 사진을 획득했습니다. (I: 인벤토리)",
    alreadyAcquired: "이미 돌잔치 사진을 가져갔습니다.",
  },
}, {
  id: "studio-staff", placeId: "C01", name: "직원", type: "dialogue",
  x: 280, y: 370, width: 42, height: 54, interactDistance: 140,
  color: "#557d78",
  table: { x: 280, y: 410, width: 220, height: 70, color: "#b58b65" },
  messages: {
    tooFar: "직원 가까이에서 클릭해 주세요.",
    dialogue: "드디어 사진을 찾으러 오셨군요! 사진은 사진첩 안에 들어있습니다. 오신 김에 사진관도 둘러보고 가세요.",
  },
}];

const STUDIO_TEXT = {
  albumPrompt: "사진을 클릭해서 가져가세요.",
  emptyAlbum: "사진을 가져간 자리입니다.",
  collect: "돌잔치 사진 가져가기",
  flip: "사진을 클릭하면 앞면과 뒷면이 바뀝니다.",
  front: "사진 앞면", back: "사진 뒷면",
  temporaryBack: "임시 도로선 그림",
};
