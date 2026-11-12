"use strict";

const CLASSROOM_DATA = {
  roomName: "9반", floor: 2,
  seats: [[14, 8, 23, 5, 17, 29], [3, 20, 11, 25, 6, 18], [27, 12, 9, 16, 21, 4], [10, 24, 30, 7, 13, 26], [19, 2, 22, 1, 15, 28]],
  // 9반 문은 교실 위쪽(북쪽)에 있으므로 칠판은 아래쪽(남쪽)이 앞이다.
  // 자리표는 칠판을 바라보는 방향 기준이라, 화면에서는 180도 돌려 놓는다(1행은 아래쪽, 왼쪽 쌍은 화면 오른쪽).
  frontSide: "south",
  // TODO: 책상 크기, 쌍 사이 통로, 행 사이 통로, 조사 거리·클릭 여유는 임시 설정이다. 단위는 게임 속 픽셀이다.
  deskWidth: 64, deskHeight: 48, pairAisle: 80, rowAisle: 100,
  interactDistance: 180, clickPadding: 16,
  // TODO: 별의 크기·간격·반짝임 주기는 임시 값이다. 학교 방문 중 90초 뒤부터 안내한다.
  crayonGuide: { itemId: "ITM-03", waitMs: 90 * 1000, src: "assets/guide-star.png",
    size: 32, radius: 26, pulseMs: 1100, count: 3 },
  // 학생 자리 그림. 사용자 요청으로 원본과 같은 방향이다(책상이 위, 의자가 아래). 칠판은 아래쪽에 있어 학생이 칠판을 등지는 모양이다.
  // 그림 아래쪽을 책상 범위 아래쪽에 맞추고, 책상 윗면은 위쪽 통로로 조금 튀어나온다.
  // TODO: 그림 크기는 임시 설정이다. 단위는 게임 속 픽셀이다.
  sprite: { src: "assets/school-desk.png", width: 64, height: 72 },
  // 자리 배치도는 뒤쪽(문 쪽) 벽 오른쪽에 둔다. 칠판은 앞쪽(아래쪽) 벽에 그린다.
  // sprite는 벽에 거는 그림이다. 그림을 불러오지 못하면 색 블록으로 그린다.
  board: { width: 150, height: 98, rearMargin: 40, sideMargin: 110, sprite: { src: "assets/school-seating-board.png" },
    hint: "클릭해 자리 배치도 보기" },
  // 칠판은 문 반대쪽 벽에 건다. 위쪽 줄 교실(문이 아래)은 위쪽 벽, 아래쪽 줄 교실(문이 위)은 아래쪽 벽이다.
  // margin은 교실 바닥 범위 끝에서 칠판까지의 거리다. 그림의 벽이 바닥 범위보다 바깥에 있어 음수로 벽에 붙인다.
  blackboard: { width: 340, height: 100, margin: -42, topMargin: 8, src: "assets/school-blackboard.png" },
  text: { desk: "번 책상", empty: "빈 책상입니다.", taken: "이미 가져간 물건입니다.", gained: "{items} 획득!", near: "가까이 가세요.", board: "자리 배치도", front: "칠판", rear: "교실 뒤편 · 출입문", map: "보건실 약도", mapHint: "1층 계단 오른쪽 방이 보건실입니다. (임시 약도)", mapBottom: "아래쪽 가운데: 출입구　 /　 위쪽 가운데: 2층 계단" },
  // 모든 교실의 책상 물건. 사용자 결정: 책상마다 최대 1종이고, 책상 위에 그림이 보이며, 클릭하면 얻는다. 알림장은 1번 책상과 같은 아이템(ITM-02)이다.
  // 인벤토리는 종류마다 하나만 보관한다. 그림은 실제로 가져간 책상에서만 사라진다.
  // iconSize는 책상 위 그림 크기, iconTop은 책상 그림 맨 위에서 아이콘 맨 위까지의 거리다(음수면 책상 위로 올라간다). 단위는 게임 속 픽셀이다.
  // 배치는 불규칙해 보이지만 항상 같다(저장 불필요). itemRate는 물건이 있는 책상의 비율, seed를 바꾸면 배치가 달라진다.
  // TODO: 비율은 임시 값이다.
  decorItems: { ids: ["GEN-06", "GEN-07", "ITM-02", "GEN-01", "GEN-05"], itemRate: 0.5, seed: 7, iconSize: 30, iconTop: -12 },
  // 9반에서 물건이 정해진 자리. 1번 책상은 퍼즐에 필요한 알림장과 크레파스 2종을 둔다. 나머지 자리는 decorItems 규칙을 따른다.
  assignments: { 1: ["ITM-02", "ITM-03"] },
};
