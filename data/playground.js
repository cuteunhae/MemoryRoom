"use strict";

const PLAYGROUND_DATA = {
  placeId: "C04", toyId: "ITM-07", treeId: "L04",
  // TODO: 대표점 기준 논리 좌표(도시 그림 픽셀), 임시 시설 크기·울타리·조사 거리·연출 시간.
  // 출입구는 그림의 남쪽 벽돌 기둥 사이다.
  fenceInset: 9, fenceThickness: 4.5, gateX: 23, gateWidth: 140,
  interactDistance: 140, animationMs: 2000,
  // 크기는 그림의 가로세로 비율에 맞췄다. 충돌·클릭 범위와 그림 크기가 같다.
  // 사용자 요청: 시설을 2배로 키워 놀이터 가운데로 모았다.
  swing: { x: -125, y: -85, width: 156, height: 142 },
  seesaw: { x: 125, y: 75, width: 180, height: 104 },
  slide: { x: 110, y: -85, width: 162, height: 160 },
  // TODO: 상단 표지·낙서 크기와 탑승 연출은 임시 픽셀 설정이다.
  slideDetail: { graffitiOffsetX: 297, graffitiOffsetY: -28, graffitiWidth: 90, graffitiHeight: 70,
    rideMs: 2000, homeId: "C05", alleyId: "R16", canvasWidth: 640, canvasHeight: 400 },
  gift: { x: -15, y: 25, width: 60, height: 60 },
  // 시설 그림. 그네·시소는 2줄×5칸, 10장면짜리 그림이며 왼쪽 위부터 오른쪽으로 차례대로 재생한다.
  // crop은 한 칸(또는 한 장) 안에서 실제 그림이 있는 부분이다. 칸마다 같은 위치를 잘라 움직임이 흔들리지 않는다.
  // restFrame은 움직이지 않을 때 보여 줄 장면 번호(0부터)다. frameMs는 장면 하나를 보여 주는 시간이다.
  // TODO: 장면 속도와 멈춤 장면은 임시 값이다.
  sprites: {
    swing: { src: "assets/playground-swing.png", columns: 5, rows: 2, frameCount: 10, restFrame: 9, frameMs: 100,
      crop: { x: 29, y: 41, width: 340, height: 310 } },
    seesaw: { src: "assets/playground-seesaw.png", columns: 5, rows: 2, frameCount: 10, restFrame: 0, frameMs: 100,
      crop: { x: 20, y: 79, width: 403, height: 234 } },
    slide: { src: "assets/playground-slide.png", crop: { x: 12, y: 45, width: 1227, height: 1209 } },
    gift: { src: "assets/playground-gift.png", crop: { x: 0, y: 25, width: 1232, height: 1229 } },
  },
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
  // 곰 인형 모양 비눗방울 그림. 그림이 없으면 아래 bear 색으로 임시 도형을 그린다.
  image: "assets/bear-bubble.png",
  bear: { fur: "#96643f", muzzle: "#d0a775", ribbon: "#4a8fc5", outline: "#65432f" },
};
