"use strict";

// 문구와 출처 표기는 사용자가 제공한 목록을 따른다.
const FORTUNE_DATA = {
  title: "오늘의 한마디", again: "다시 뽑기",
  // TODO: 뽑기 기계 조사 거리는 실내 픽셀 단위다.
  interactDistance: 160,
  turnDurationMs: 550,
  entries: [
    { id: "FORTUNE-01", quote: "매일 행복하진 않지만, 행복한 일은 매일 있어.", author: "곰돌이 푸" },
    { id: "FORTUNE-02", quote: "넌 네가 믿는 것보다 더 용감하고,\n네가 보는 것보다 더 강하며,\n네가 생각하는 것보다 더 똑똑하단다.", author: "곰돌이 푸" },
    { id: "FORTUNE-03", quote: "가장 중요한 것은 눈에 보이지 않아.\n마음으로 봐야 잘 보이거든.", author: "어린 왕자" },
    { id: "FORTUNE-04", quote: "어른들은 누구나 처음엔 어린이였다.\n하지만 그것을 기억하는 어른은 별로 없다.", author: "어린 왕자" },
    { id: "FORTUNE-05", quote: "강물은 서두르지 않아.\n언젠가는 도착할 거라는 걸 알거든.", author: "곰돌이 푸" },
    { id: "FORTUNE-06", quote: "인생은 폭풍우가 지나가기를 기다리는 것이 아니라,\n빗속에서 춤추는 법을 배우는 것이다.", author: "스누피" },
    { id: "FORTUNE-07", quote: "걱정한다고 해서 내일의 슬픔이 사라지는 건 아니야.\n오늘의 힘만 뺄 뿐이지.", author: "스누피" },
    { id: "FORTUNE-08", quote: "헛된 일이란 건 정말로 없는 걸까?\n응, 헛된 일은 없어.\n그저 헛되다고 생각하는 것뿐이야.", author: "보노보노" },
    { id: "FORTUNE-09", quote: "가끔은 아주 작은 것들이 네 마음속에서 가장 큰 자리를 차지하기도 해.", author: "피글렛" },
  ],
};
