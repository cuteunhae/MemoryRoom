"use strict";

const PARK_DATA = {
  placeId: "C03", headbandId: "ITM-04", balloonId: "ITM-05", memoId: "ITM-06",
  balloon: { offsetY: -110, radiusX: 26, radiusY: 34, clickPadding: 12 },
  // TODO: 위치는 놀이공원 대표점 기준 논리 좌표(도시 그림 픽셀)이며 크기·거리·가림 구조는 임시 설정이다.
  // 정문은 그림의 아치처럼 남쪽 울타리에 있다. gateX는 대표점 기준 정문 중심의 가로 위치다.
  fenceInset: 9, fenceThickness: 6, gateX: 0, gateWidth: 110, interactDistance: 140,
  ticket: { x: -163, y: 173, width: 72, height: 54 },
  shop: { x: 250, y: -150, width: 90, height: 60 },
  stand: { x: 178, y: -150, width: 24, height: 36 },
  // 회전목마는 그림 가운데 별 자리에 둔다.
  carousel: { x: 0, y: -27, horseCount: 6, carriageCount: 3, rideRadius: 64, platformRadius: 85, coreRadius: 40, pillarRadius: 6, pillarOrbit: 76, pillarCount: 6 },
  text: {
    ticket: "매표소", shop: "기념품 판매대", stand: "풍선 거치대", carousel: "회전목마",
    headband: "머리띠", acquired: "머리띠를 획득했습니다. (I: 인벤토리)", already: "이미 머리띠를 가져갔습니다.",
    near: "가까이에서 클릭해 주세요.", lock: "판매대 잠금장치", horse: "말 개수", carriage: "마차 개수", confirm: "확인",
    prompt: "말과 마차의 개수를 입력하세요.", solved: "잠금장치가 풀렸습니다.",
    memo: "놀이터 메모", memoHint: "놀이터의 시설 배치가 그려져 있습니다.",
    swing: "그네", seesaw: "시소", slide: "미끄럼틀", entrance: "출입구",
  },
};
