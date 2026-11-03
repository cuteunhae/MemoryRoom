"use strict";

// 표시 문구와 조건은 기획서 6.3을 따른다. order는 안내 순서다.
const ACHIEVEMENT_CONDITIONS = [
  { id: "ACH-02", order: 2, name: "그날의 교실", description: "알림장·크레파스 획득 + 명부 해결", items: ["ITM-02", "ITM-03"], flag: "registrySolved" },
  { id: "ACH-03", order: 3, name: "웃음이 남은 곳", description: "머리띠 획득 + 회전목마 해결 + 놀이터 약도 확인", items: ["ITM-04"], flags: ["carouselSolved", "playgroundMemoViewed"] },
  { id: "ACH-04", order: 4, name: "다시 뛰노는 하루", description: "그네·시소·미끄럼틀 이용", items: [], flags: ["swingUsed", "seesawUsed", "slideUsed"] },
  { id: "ACH-05", order: 5, name: "기억을 채우는 다섯 칸", description: "장식장 해결", items: [], flag: "cabinetSolved" },
  { id: "ACH-06", order: 6, name: "일곱 살의 꿈", description: "일기장 최초 발견", items: [], flag: "diaryDiscovered" },
  { id: "ACH-01", order: 1, name: "첫 번째 추억", description: "돌잔치 사진 획득", items: [], flag: "photoCollected" },
];
const ACHIEVEMENT_SETTINGS = {
  // TODO: 달성 알림 표시 시간은 임시 설정이다.
  notificationMs: 3000,
};
const ACHIEVEMENT_TEXT = { title: "업적", close: "닫기 (Tab)", active: "진행 중", completed: "달성 완료", notification: "업적 달성" };
