"use strict";

const SAVE_DATA = {
  saveVersion: 3,
  progressKey: "memoryRoom.progress",
  preferencesKey: "memoryRoom.preferences",
  positionIntervalMs: 1000,
  debugResetCode: "Delete",
  text: {
    restart: "처음부터",
    confirm: "지금까지의 진행을 지우고 처음부터 시작할까요? 키·소리 설정은 유지됩니다.",
    invalid: "저장 데이터를 읽을 수 없거나 버전이 달라 새 게임으로 시작했습니다.",
    unavailable: "브라우저 저장 공간을 사용할 수 없습니다. 현재 진행은 저장되지 않습니다.",
    resetFailed: "진행 데이터를 지우지 못했습니다. 현재 게임을 유지합니다.",
    preferencesFailed: "키·소리 설정을 저장하지 못했습니다.",
  },
  defaultPreferences: {
    keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", map: "KeyM", inventory: "KeyI", achievements: "Tab", settings: "Escape" },
    // TODO: 소리 자산과 설정 화면을 연결할 때 조정할 임시 기본값이다.
    sound: { muted: false, volume: 1, bgmVolume: 1, sfxVolume: 1 },
  },
};
