"use strict";

const REGISTRY_DATA = {
  requiredItemId: "ITM-03", solvedRatio: 0.7,
  // TODO: 붓 지름과 화면 크기, 명부·테이블 위치 및 조사 거리는 임시 설정이다.
  brushDiameter: 60, width: 600, height: 320,
  roomName: "보건실", offsetX: -240, distanceFromDoor: 320,
  text: {
    name: "보건실 명부", near: "명부 가까이에서 클릭해 주세요.",
    instruction: "가려진 명부입니다.",
    clue: "시계탑이 있는 길에서 큰 길을 따라 도시 위쪽을 지나 오른쪽 끝까지 걸어가 보세요.\n길이 오른쪽 아래로 휘어지기 시작하면 연못을 찾아보세요.\n연못 근처에 즐거운 웃음소리가 기다리고 있을 거예요.",
  },
};
const registryRoom = SCHOOL_DATA.floors[0].rooms.find(room => room.name === REGISTRY_DATA.roomName);
INSPECTION_OBJECTS.push({
  id: "school-registry", placeId: SCHOOL_DATA.placeId, floor: 1, type: "registry",
  roomName: REGISTRY_DATA.roomName, name: REGISTRY_DATA.text.name,
  x: registryRoom.doorX + REGISTRY_DATA.offsetX,
  y: registryRoom.y + registryRoom.height - REGISTRY_DATA.distanceFromDoor,
  width: 110, height: 70, color: "#737c86", interactDistance: 140,
  table: { x: registryRoom.doorX + REGISTRY_DATA.offsetX, y: registryRoom.y + registryRoom.height - REGISTRY_DATA.distanceFromDoor, width: 220, height: 120, color: "#b58b65" },
  messages: { tooFar: REGISTRY_DATA.text.near },
});
