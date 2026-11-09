"use strict";

// 사진관 그림을 0.8배로 그린 게임 좌표다. 사진첩은 소파 앞 탁자 위, 사진작가는 안내 데스크 오른쪽에 둔다.
// TODO: 위치·크기·조사 거리는 임시 값이다. 플레이 테스트에서 조정한다.
const INSPECTION_OBJECTS = [{
  id: "studio-album", placeId: "C01", name: "사진첩", type: "album", rewardId: "ITM-01",
  x: 225, y: 515, width: 64, height: 56, interactDistance: 140,
  color: "#785e79", sprite: { src: "assets/studio-album.png" },
  messages: {
    tooFar: "사진첩 가까이에서 클릭해 주세요.",
    acquired: "돌잔치 사진을 획득했습니다. (I: 인벤토리)",
    alreadyAcquired: "이미 돌잔치 사진을 가져갔습니다.",
  },
}, {
  id: "studio-staff", placeId: "C01", name: "직원", type: "dialogue",
  // 사용자 요청: 사진작가를 2배로 키웠다. 이 범위가 클릭·충돌 범위이며 그림 전체를 덮는다.
  x: 420, y: 228, width: 72, height: 144, interactDistance: 140, solid: true,
  color: "#557d78", sprite: { src: "assets/npc-photographer.png", width: 88, height: 144 },
  messages: {
    tooFar: "직원 가까이에서 클릭해 주세요.",
    // 가까이 가면 나오는 안내. {key}는 설정에서 지정한 상호작용 키로 바뀐다. keyHintClick은 키가 할당 없음일 때 쓴다.
    keyHint: "{key} 키를 누르거나 클릭해 대화하기", keyHintClick: "클릭해 대화하기",
    dialogue: "드디어 사진을 찾으러 오셨군요! 사진은 사진첩 안에 들어있습니다. 오신 김에 사진관도 둘러보고 가세요.",
  },
}];

const STUDIO_TEXT = {
  albumPrompt: "사진을 클릭해서 가져가세요.",
  emptyAlbum: "사진을 가져간 자리입니다.",
  collect: "돌잔치 사진 가져가기",
  flip: "사진을 클릭하면 앞면과 뒷면이 바뀝니다.",
  front: "사진 앞면", back: "사진 뒷면",
};

const PHOTO_ROAD_DATA = {
  // R07(학교 앞마당)의 마지막 점은 위쪽 큰길과 만나는 학교 앞 분기다.
  anchorRoadId: "R07",
  // TODO: 사진에 담는 범위와 종이·선 색상은 임시 미술 설정이다. 좌표와 방향은 도시 데이터를 그대로 쓴다.
  crop: { offsetX: -200, offsetY: -110, width: 560, height: 336 },
  width: 800, height: 480, paper: "#f2e9d4", ink: "#77766c", lineWidth: 3,
};
