"use strict";

const CLASSROOM_DATA = {
  roomName: "9반", floor: 2,
  seats: [[14, 8, 23, 5, 17, 29], [3, 20, 11, 25, 6, 18], [27, 12, 9, 16, 21, 4], [10, 24, 30, 7, 13, 26], [19, 2, 22, 1, 15, 28]],
  // TODO: 책상 크기, 쌍 사이 통로, 행 사이 통로, 조사 거리·클릭 여유는 임시 설정이다.
  deskWidth: 160, deskHeight: 100, pairAisle: 240, rowAisle: 220,
  interactDistance: 180, clickPadding: 16,
  board: { width: 260, height: 70, rearMargin: 140, sideMargin: 300 },
  text: { desk: "번 책상", empty: "빈 책상", acquired: "이미 획득함", take: "획득", prompt: "물건을 클릭해서 가져가세요.", near: "가까이에서 클릭해 주세요.", board: "자리 배치도", front: "칠판", rear: "교실 뒤편 · 출입문", map: "보건실 약도", mapHint: "1층 복도 오른쪽 끝에 보건실이 있습니다. (임시 약도)", mapBottom: "아래쪽 가운데: 출입구　 /　 오른쪽: 2층 계단" },
  // TODO: 임시 고정 배정. 빈 배열은 빈 책상이며 무작위 배정하지 않는다.
  assignments: {
    1: ["ITM-02", "ITM-03"], 2: [], 3: ["GEN-01"], 4: ["GEN-02"], 5: [],
    6: ["GEN-03"], 7: ["GEN-04"], 8: ["GEN-05"], 9: [], 10: ["GEN-06"],
    11: ["GEN-01"], 12: [], 13: ["GEN-02"], 14: ["GEN-03"], 15: [],
    16: ["GEN-04"], 17: ["GEN-05"], 18: [], 19: ["GEN-06"], 20: ["GEN-01"],
    21: [], 22: ["GEN-02"], 23: ["GEN-03"], 24: [], 25: ["GEN-04"],
    26: ["GEN-05"], 27: [], 28: ["GEN-06"], 29: ["GEN-01"], 30: [],
  },
};
