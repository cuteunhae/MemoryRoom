"use strict";

const HINT_DATA = {
  waitMs: 3 * 60 * 1000, debugWaitMs: 3 * 60 * 1000, checkpointMs: 1000,
  // 대기 시간(waitMs)이 지날 때마다 힌트를 하나씩 더 받을 수 있다. 3이면 3분·6분·9분에 하나씩, 최대 3개다.
  maxHints: 3,
  text: { gift: "🎁", available: "지금 받을 수 있는 힌트", history: "힌트 기록", title: "힌트", close: "닫기", empty: "아직 확인한 힌트가 없습니다.", current: "현재 힌트", previous: "이전에 본 힌트" },
  progressFlags: ["photoCollected", "registrySolved", "carouselSolved", "playgroundMemoViewed", "swingUsed", "seesawUsed", "slideUsed", "cabinetSolved", "childRoomUnlocked", "diaryDiscovered", "endingReached"],
  clueModes: { board: "school-board", seating: "seating", infirmary: "infirmary-map", playgroundMemo: "playground-map", slideGraffiti: "graffiti", registry: "registry", diary: "diary" },
  clueIds: ["school-board", "seating", "infirmary-map", "playground-map", "graffiti", "registry", "diary", "photo-front", "photo-back", "class-nine", "desk-one", "bear-bubble"],
  items: { photo: "ITM-01", notebook: "ITM-02", crayon: "ITM-03", headband: "ITM-04", balloon: "ITM-05", memo: "ITM-06", toy: "ITM-07", bear: "ITM-08" },
  entries: [

    { id: "HNT-01", placeId: "C01", text: "촬영구역 아래에 있는 테이블 위를 살펴보세요." },
    { id: "HNT-02", placeId: "C02", text: "복도 게시판에는 각 반의 위치가 표시되어 있어요." },
    { id: "HNT-03", placeId: "C02", text: "교실 뒤쪽 게시판의 자리 배치도를 확인해 보세요." },
    { id: "HNT-04", placeId: "C02", text: "흐릿한 명부에 크레파스를 사용해 보세요." },
    { id: "HNT-05", placeId: "C03", text: "회전목마의 반대편에서도 말과 마차를 세어 보세요." },
    { id: "HNT-06", placeId: "C04", text: "그네와 시소를 모두 사용해 보세요." },
    { id: "HNT-07", placeId: "C05", text: "집의 앞문만 보지 말고 옆으로 이어지는 길도 살펴보세요." },
    { id: "HNT-08", placeId: "C05", text: "다섯 장소에서 얻은 추억의 물건을 순서에 맞게 놓아보세요." },
    
    { id: "HNT-09", placeId: "C03", text: "입구의 매표소에 남겨진 물건을 살펴보세요." },
    { id: "HNT-10", placeId: "C03", text: "기념품 판매대 옆에 달라진 것이 있는지 살펴보세요." },
    { id: "HNT-11", placeId: "C03", text: "풍선과 함께 발견한 메모를 인벤토리에서 확인해 보세요." },
    { id: "HNT-12", placeId: "C04", text: "놀이시설을 움직인 뒤, 놀이터에 달라진 것이 있는지 찾아보세요." },
    { id: "HNT-13", placeId: "C05", text: "집 외곽을 따라 돌다 보면 숨겨진 다른 길을 발견할 지도 모릅니다." },
    { id: "HNT-14", placeId: "C04", text: "아직 타 보지 않은 미끄럼틀에도 올라가 보세요." },
    { id: "HNT-15", placeId: "C05", text: "안방의 인형들을 비눗방울 속 모습과 비교해 보세요." },
    { id: "HNT-16", placeId: "C05", text: "새로 얻은 열쇠로 열 수 있는 문을 찾아보세요." },
    { id: "HNT-17", placeId: "C05", text: "아이 방 침대 위에 남겨진 일기를 끝까지 읽어 보세요." },
    // 알림장·크레파스를 아직 못 얻었을 때, 게시판(HNT-02) 또는 자리 배치도(HNT-03) 힌트 다음에 준다.
    { id: "HNT-18", placeId: "C02", text: "크레파스는 학생의 자리에 있겠죠? 돌잔치 사진과 연결해보세요." },
  ],
};

function createHintState() {
  // received: 마지막 진전 이후에 받은 힌트 ID 목록이다. 새 진전이 생기면 비운다.
  return { history: [], clues: [], received: [], lastProgressAt: Date.now(), idleMs: 0 };
}
