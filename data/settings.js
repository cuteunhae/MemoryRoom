"use strict";
const SETTINGS_DATA = {
  keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", map: "KeyM", inventory: "KeyI", achievements: "Tab", settings: "Escape", interact: "KeyE" },
  actions: { up: "위로 이동", down: "아래로 이동", left: "왼쪽 이동", right: "오른쪽 이동", map: "지도", inventory: "인벤토리", achievements: "업적", settings: "설정", interact: "상호작용(문 열기·닫기, 대화)" },
  text: { title: "설정", close: "닫기", restore: "키 기본값 복원", unassigned: "할당 없음", listening: "새 키를 누르세요", help: "항목을 클릭하고 새 키를 누르세요. 중복 키는 기존 기능에서 해제됩니다.", unsupported: "문자·숫자·방향키·Esc·Tab·Enter·Space 등 단일 키를 눌러주세요.", cancel: "키 지정 취소", bgm: "배경음악", sfx: "효과음", soundNote: "현재는 볼륨 값만 저장합니다.", failed: "설정을 저장하지 못했습니다. 기존 설정을 유지합니다.", map: "지도" },
};
