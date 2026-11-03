"use strict";

const PLAYGROUND_DATA = {
  placeId: "C04", toyId: "ITM-07", treeId: "L04",
  // TODO: 대표점 기준 논리 좌표, 임시 시설 크기·울타리·조사 거리·연출 시간.
  fenceInset: 3, fenceThickness: 1.5, gateX: -69, gateWidth: 32,
  interactDistance: 140, animationMs: 2000,
  swing: { x: -44, y: -35, width: 26, height: 22 },
  seesaw: { x: 46, y: 8, width: 30, height: 16 },
  slide: { x: 40, y: -37, width: 25, height: 27 },
  // TODO: 상단 표지·낙서 크기와 탑승 연출은 임시 픽셀 설정이다.
  slideDetail: { graffitiOffsetX: 175, graffitiOffsetY: -28, graffitiWidth: 90, graffitiHeight: 70,
    rideMs: 2000, homeId: "C05", alleyId: "R16", canvasWidth: 640, canvasHeight: 400 },
  gift: { x: -5, y: 14, width: 22, height: 20 },
  text: {
    swing: "그네", seesaw: "시소", slide: "미끄럼틀", gift: "선물상자", entrance: "출입구",
    near: "가까이에서 클릭해 주세요.", acquired: "비눗방울 장난감을 획득했습니다. (I: 인벤토리)",
    toyHelp: "인벤토리를 닫고 배경을 클릭하거나 드래그해 보세요.",
    slideWarning: "조심히 타세요!", graffiti: "미끄럼틀 낙서",
  },
};

const BUBBLE_DATA = {
  // TODO: 임시 비눗방울 크기·수명·생성 간격. 집의 곰 인형도 아래 외형을 공유한다.
  lifetimeMs: 3000, intervalMs: 180, maxCount: 24, radius: 52, riseSpeed: 34,
  bear: { fur: "#96643f", muzzle: "#d0a775", ribbon: "#4a8fc5", outline: "#65432f" },
};
