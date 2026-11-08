"use strict";

const REGISTRY_DATA = {
  requiredItemId: "ITM-03", solvedRatio: 0.7,
  // TODO: 붓 지름과 화면 크기, 명부·테이블 위치 및 조사 거리는 임시 설정이다.
  brushDiameter: 60, width: 600, height: 320,
  roomName: "보건실",
  // 보건실 그림의 책상 위에 명부를 둔다. 학교 그림의 픽셀 좌표이며 SCHOOL_DATA.scale을 곱해 쓴다.
  paper: { left: 697, top: 362, right: 727, bottom: 380 },
  desk: { left: 683, top: 338, right: 790, bottom: 398 },
  text: {
    name: "보건실 명부", near: "명부 가까이에서 클릭해 주세요.",
    instruction: "가려진 명부입니다.",
    clue: "시계탑이 있는 길에서 큰 길을 따라 도시 위쪽을 지나 오른쪽 끝까지 걸어가 보세요.\n길이 오른쪽 아래로 휘어지기 시작하면 연못을 찾아보세요.\n연못 근처에 즐거운 웃음소리가 기다리고 있을 거예요.",
  },
};
INSPECTION_OBJECTS.push({
  id: "school-registry", placeId: SCHOOL_DATA.placeId, floor: 1, type: "registry",
  roomName: REGISTRY_DATA.roomName, name: REGISTRY_DATA.text.name,
  // 책상 위아래 어느 쪽에서도 닿도록 조사 거리를 넉넉히 둔다.
  ...schoolRect(REGISTRY_DATA.paper), color: "#737c86", interactDistance: 180,
  // 책상은 그림에 있으므로 그리지 않고(hidden) 충돌에만 쓴다.
  table: { ...schoolRect(REGISTRY_DATA.desk), color: "#b58b65", hidden: true },
  messages: { tooFar: REGISTRY_DATA.text.near },
});
