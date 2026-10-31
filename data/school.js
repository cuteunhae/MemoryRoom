"use strict";

// TODO: 교실 수, 방 크기, 문·계단·게시판·NPC 좌표와 조사 거리는 임시 배치다.
const SCHOOL_DATA = {
  placeId: "C02", wallThickness: 14, interactDistance: 140,
  floors: [
    { number: 1, name: "학교 1층", rooms: [
      { name: "1반", x: 50, y: 100, width: 250, height: 450, doorX: 175, doorWidth: 100 },
      { name: "2반", x: 300, y: 100, width: 250, height: 450, doorX: 425, doorWidth: 100 },
      { name: "3반", x: 550, y: 100, width: 250, height: 450, doorX: 675, doorWidth: 100 },
      { name: "4반", x: 800, y: 100, width: 250, height: 450, doorX: 925, doorWidth: 100 },
      { name: "교무실", x: 1050, y: 100, width: 250, height: 450, doorX: 1175, doorWidth: 100 },
      { name: "보건실", x: 1300, y: 100, width: 250, height: 450, doorX: 1425, doorWidth: 100 },
    ] },
    { number: 2, name: "학교 2층", rooms: [
      { name: "5반", x: 50, y: 100, width: 300, height: 450, doorX: 200, doorWidth: 100 },
      { name: "6반", x: 350, y: 100, width: 300, height: 450, doorX: 500, doorWidth: 100 },
      { name: "7반", x: 650, y: 100, width: 300, height: 450, doorX: 800, doorWidth: 100 },
      { name: "8반", x: 950, y: 100, width: 300, height: 450, doorX: 1100, doorWidth: 100 },
      { name: "9반", x: 1250, y: 100, width: 300, height: 450, doorX: 1400, doorWidth: 100 },
    ] },
  ],
  stairs: { x: 1450, y: 800, width: 140, height: 100, arrival: { x: 1450, footY: 900 } },
  text: { up: "2층으로 올라가기", down: "1층으로 내려가기", near: "계단 가까이에서 클릭해 주세요.", corridor: "복도", boardIntro: "복도에서 위쪽 교실들을 바라본 기준입니다.\n각 층 왼쪽 → 오른쪽 순서\n\n" },
  objects: [
    { id: "school-board", placeId: "C02", floor: 1, type: "board", name: "반 배치 게시판", x: 350, y: 730, width: 140, height: 60, interactDistance: 140, color: "#86734f", messages: { tooFar: "게시판 가까이에서 클릭해 주세요." } },
    { id: "school-teacher", placeId: "C02", floor: 1, type: "dialogue", name: "선생님", x: 520, y: 730, width: 48, height: 54, interactDistance: 140, color: "#557d78", messages: {
      tooFar: "선생님 가까이에서 클릭해 주세요.",
      dialogue: "오랜만이구나! 졸업하고 어떻게 지내는지 궁금했단다. 아참, 저 게시판에는 새로 입학한 학생들을 위한 반 배치도가 있단다. 한번 살펴보렴.",
    } },
  ],
};
