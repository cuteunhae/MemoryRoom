"use strict";

const PARK_DATA = {
  placeId: "C03", headbandId: "ITM-04",
  // TODO: 위치는 놀이공원 대표점 기준 논리 좌표이며 크기·거리·가림 구조는 임시 설정이다.
  fenceInset: 3, fenceThickness: 2, gateWidth: 36, interactDistance: 140,
  ticket: { x: -78, y: 30, width: 24, height: 18 },
  shop: { x: 72, y: 40, width: 30, height: 20 },
  stand: { x: 96, y: 40, width: 8, height: 12 },
  carousel: { x: 0, y: 0, horseCount: 6, carriageCount: 3, rideRadius: 33, platformRadius: 44, coreRadius: 21, pillarRadius: 3, pillarOrbit: 39, pillarCount: 6 },
  text: {
    ticket: "매표소", shop: "기념품 판매대", stand: "풍선 거치대", carousel: "회전목마",
    headband: "머리띠", acquired: "머리띠를 획득했습니다. (I: 인벤토리)", already: "이미 머리띠를 가져갔습니다.",
    near: "가까이에서 클릭해 주세요.", lock: "판매대 잠금장치", horse: "말 개수", carriage: "마차 개수", confirm: "확인",
    prompt: "말과 마차의 개수를 입력하세요.", solved: "잠금장치가 풀렸습니다.",
  },
};
