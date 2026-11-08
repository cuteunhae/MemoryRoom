"use strict";

const DIARY_DATA = {
  itemId: "ITM-10",
  // 집 그림 기준 위치다. 침대는 별 이불 침대, 일기장은 책상 위에 놓는다.
  // TODO: 침대·일기장 위치와 크기, 조사 거리와 클릭 여유는 임시 설정이다.
  bed: { x: 90, y: 281, width: 120, height: 182 },
  book: { x: 223, y: 190, width: 42, height: 34, sprite: { src: "assets/item-diary.png" } },
  interactDistance: 100,
  clickPadding: 10,
  text: { title: "일기장", next: "다음 페이지", last: "이야기를 다 읽었다면 공책이나 닫기 버튼을 한 번 더 눌러주세요.", page: "페이지" },
  // TODO: 손글씨 크기·기울기 변화량은 임시 시각 설정이다. 같은 글자는 다시 열어도 같은 모양이다.
  handwriting: { scaleVariation: 0.07, rotationDegrees: 3, baselinePixels: 1.4 },
  pages: [
    { title: "나의 꿈", body: "나는 엄마 아빠가 제일 멋있다.\n엄마 아빠는 내가 힘들 때 도와준다.\n내가 울면 안아 주고,\n잘했을 때는 많이 칭찬해 준다." },
    { title: "", body: "나도 커서 엄마 아빠 같은 어른이 될 거다.\n슬픈 사람이 있으면 웃게 해 주고 싶다.\n힘든 사람이 있으면 도와줄 거다.\n내가 할 수 있는 일을 많이 할 거다." },
    { title: "", body: "나는 커서 멋진 어른이 될 거예요. 엄마 아빠처럼 착하고 씩씩한 어른이 될 거예요. 다른\n사람들을 많이 도와주고 싶어요. 그리고 좋아하는 것도 많이 하고매일매일 웃으면서 살\n거예요. 나는 꼭 멋진 어른이 될 거예요!" },
  ],
};
