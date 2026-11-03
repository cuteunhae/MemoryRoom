"use strict";

// 업적 표시·알림은 구현 순서 5에서 연결한다. 지금은 조건 충족 여부만 기록한다.
const ACHIEVEMENT_CONDITIONS = [
  { id: "ACH-02", items: ["ITM-02", "ITM-03"], flag: "registrySolved" },
  { id: "ACH-03", items: ["ITM-04"], flags: ["carouselSolved", "playgroundMemoViewed"] },
  { id: "ACH-04", items: [], flags: ["swingUsed", "seesawUsed", "slideUsed"] },
];
