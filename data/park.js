"use strict";

const PARK_DATA = {
  placeId: "C03", headbandId: "ITM-04", balloonId: "ITM-05", memoId: "ITM-06",
  // 정답을 맞히면 거치대 위에 돌고래 풍선 그림이 나타난다.
  balloon: { offsetY: -120, radiusX: 30, radiusY: 60, clickPadding: 12, sprite: { src: "assets/item-balloon.png" } },
  // 매표소에 놓인 머리띠 그림.
  headbandSprite: { src: "assets/item-headband.png" },
  // TODO: 위치는 놀이공원 대표점 기준 논리 좌표(도시 그림 픽셀)이며 크기·거리·가림 구조는 임시 설정이다.
  // 정문은 그림의 아치처럼 남쪽 울타리에 있다. gateX는 대표점 기준 정문 중심의 가로 위치다.
  fenceInset: 9, fenceThickness: 6, gateX: 0, gateWidth: 110, interactDistance: 140,
  // 사용자 결정(2026-11-08): 그림의 위쪽 분홍 길로도 드나든다(기획서의 진입로 한 곳과 다름). 북쪽 울타리를 이만큼 비운다.
  northGateX: 17, northGateWidth: 120,
  // 매표소·판매대 크기는 그림의 가로세로 비율에 맞췄다. 충돌·클릭 범위와 그림 크기가 같다.
  ticket: { x: -43, y: 113, width: 72, height: 66 },
  shop: { x: 250, y: -150, width: 96, height: 73 },
  stand: { x: 178, y: -136, width: 48, height: 44 },
  // 회전목마는 도시 그림 가운데 별 자리에 둔다.
  // 사용자 결정(2026-11-08): 회전목마 그림(말 5·마차 3)에 맞춰 정답을 말 5·마차 3으로 하고, 가림 없이 모든 탈것이 보이게 한다.
  // 기획서(말 6·마차 3, 일부 탈것이 가려져야 함)와 다르다.
  carousel: { x: 0, y: -27, horseCount: 5, carriageCount: 3, rideRadius: 64, platformRadius: 85, coreRadius: 40 },
  // 시설 그림. crop은 그림 안에서 실제 내용이 있는 범위다. 그림을 불러오지 못하면 임시 도형으로 그린다.
  sprites: {
    ticket: { src: "assets/park-ticket.png", crop: { x: 228, y: 17, width: 1080, height: 990 } },
    shop: { src: "assets/park-shop.png", crop: { x: 205, y: 116, width: 1126, height: 859 } },
    carousel: { src: "assets/park-carousel.png", crop: { x: 11, y: 9, width: 1230, height: 1231 } },
    stand: { src: "assets/park-stand.png", crop: { x: 0, y: 0, width: 640, height: 580 } },
  },
  text: {
    ticket: "매표소", shop: "기념품 판매대", stand: "풍선 거치대", carousel: "회전목마",
    headband: "머리띠", acquired: "머리띠를 획득했습니다. (I: 인벤토리)", already: "이미 머리띠를 가져갔습니다.",
    near: "가까이에서 클릭해 주세요.", lock: "판매대 잠금장치", horse: "말 개수", carriage: "마차 개수", confirm: "확인",
    prompt: "말과 마차의 개수를 입력하세요.", solved: "잠금장치가 풀렸습니다.",
    memo: "놀이터 메모", memoHint: "놀이터의 시설 배치가 그려져 있습니다.",
    swing: "그네", seesaw: "시소", slide: "미끄럼틀", entrance: "출입구",
  },
};
