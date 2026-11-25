"use strict";
const ENDING_DATA = {
  fadeMs: 220,
  // 실제 게임 에셋을 원본 그대로 합성한다. 배치 좌표는 900×500 회상 화면 기준이다.
  // image를 지정하면 합성 대신 해당 완성 그림을 표시한다.
  scenes: [
    { id: "END-01", title: "어린 시절의 돌잔치 사진", durationMs: 1500, image: null, background: "#efe0c0" },
    { id: "END-02", title: "학교 책상과 파스텔", durationMs: 1500, image: null, background: "#e8ddbf" },
    { id: "END-03", title: "놀이공원의 회전목마", durationMs: 1500, image: null, background: "#e7d8c5" },
    { id: "END-04", title: "놀이터의 곰 모양 비눗방울", durationMs: 1500, image: null, background: "#dce7dc" },
    { id: "END-05", title: "어린 시절의 집", durationMs: 1500, image: null, background: "#edddc0" },
    { id: "END-06", title: "어린 주인공과 현재 주인공의 모습이 겹쳐지는 장면", durationMs: 1500, image: null, background: "#e1d9c9" },
  ],
  compositions: [
    { layers: [{ src: "assets/item-photo.png", x: 450, y: 250, width: 660, height: 460, shadow: true }] },
    { layers: [
      { src: "assets/school-desk.png", x: 450, y: 265, width: 440, height: 430, shadow: true },
      { src: "assets/item-notice.png", x: 383, y: 115, width: 88, height: 70, angle: -0.08 },
      { src: "assets/item-pastel.svg", x: 490, y: 115, width: 100, height: 75, angle: 0.06 },
    ] },
    { backdrop: { src: CITY_DATA.mapImage, crop: [900, 350, 720, 400] }, layers: [
      { src: "assets/park-carousel.png", x: 450, y: 250, width: 410, height: 410, shadow: true },
    ] },
    { backdrop: { src: CITY_DATA.mapImage, crop: [40, 360, 630, 350] }, layers: [
      { src: PLAYGROUND_DATA.sprites.swing.src, sprite: PLAYGROUND_DATA.sprites.swing, x: 180, y: 250, width: 230, height: 260, opacity: 0.75 },
      { src: "assets/bear-bubble.png", x: 470, y: 245, width: 290, height: 350, shadow: true },
      { src: "assets/bear-bubble.png", x: 710, y: 125, width: 80, height: 100, opacity: 0.55 },
    ] },
    { backdrop: { src: CITY_DATA.mapImage, crop: [690, 0, 360, 200] }, layers: [] },
    { layers: [
      { src: "assets/player-front.png", x: 490, y: 250, width: 240, height: 420, opacity: 0.55, shadow: true },
      { src: "assets/player-child-age7.png", x: 405, y: 290, width: 225, height: 350, opacity: 0.9, shadow: true },
    ] },
  ],
  text: { title: "도시 속 빛나는 존재", exitMessage: "게임이 종료되었습니다. 탭을 닫아주세요.", restart: "다시 시작", exit: "게임 종료" },
};
