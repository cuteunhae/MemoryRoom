"use strict";
const SETTINGS_DATA = {
  launcherIcon: "assets/ui-settings-gear-flat.png",
  music: { src: "assets/background-music.mp3", loop: true },
  fullscreen: { enter: "⛶ 전체화면", exit: "⛶ 전체화면 해제", unavailable: "이 브라우저에서는 전체화면을 사용할 수 없습니다.", failed: "전체화면 전환이 되지 않았습니다. 버튼을 다시 눌러주세요." },
  keys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", map: "KeyM", inventory: "KeyI", achievements: "Tab", settings: "Escape", interact: "KeyE" },
  // 안내에 글자 대신 그림으로 보여 줄 키. 다른 키로 바꾸면 그 키 이름을 글자로 보여 준다.
  keyIcons: { KeyE: "assets/key-e.png" },
  actions: { up: "위로 이동", down: "아래로 이동", left: "왼쪽 이동", right: "오른쪽 이동", map: "지도", inventory: "책가방", achievements: "업적", settings: "설정", interact: "상호작용(문·건물 출입, 계단, 대화)" },
  text: { title: "설정", close: "닫기", restore: "키 기본값 복원", unassigned: "할당 없음", listening: "새 키를 누르세요", unsupported: "문자·숫자·방향키·Esc·Tab·Enter·Space 등 단일 키를 눌러주세요.", cancel: "키 지정 취소", bgm: "배경음악", sfx: "효과음",  failed: "설정을 저장하지 못했습니다. 기존 설정을 유지합니다.", map: "지도" },
};
