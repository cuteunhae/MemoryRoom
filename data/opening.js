"use strict";

const OPENING_DATA = {
  destinationId: "C01",
  lines: [
    { id: "OPEN-01", text: "여긴… 어디일까요?", durationMs: 3000 },
    { id: "OPEN-02", text: "처음 온 곳 같은데, 어쩐지 낯설지 않아요.", durationMs: 4000 },
    { id: "OPEN-03", text: "저 사진관에 가 보면 무언가 떠오를까요?", durationMs: 4000 },
  ],
  // TODO: 길 탐색 간격과 반짝이·간식의 크기·간격은 임시 연출 설정이다. 좌표는 도시 논리 좌표다.
  route: { gridStep: 10, sampleStep: 2, refreshMs: 750, maxNodes: 25000,
    dotSpacing: 12, dotRadius: 3, color: "#fff9dc", glow: "#ffd677",
    sparklePeriodMs: 1400, snackEvery: 3,
    // 원본 파일은 그대로 보존하고, 투명 여백은 그릴 때만 잘라 쓴다.
    snacks: [
      { src: "assets/guide-candy.png", crop: { x: 180, y: 130, width: 1170, height: 780 }, size: 18 },
      { src: "assets/guide-lollipop.png", crop: { x: 112, y: 30, width: 1102, height: 1152 }, size: 20 },
      { src: "assets/guide-chips.png", crop: { x: 370, y: 566, width: 364, height: 406 }, size: 17 },
    ] },
};
