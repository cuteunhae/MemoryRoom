"use strict";

const backgroundMusic = new Audio(SETTINGS_DATA.music.src);
backgroundMusic.loop = SETTINGS_DATA.music.loop;
backgroundMusic.preload = "metadata";
let musicActivated = false;

function syncBackgroundMusic() {
  backgroundMusic.volume = getSoundVolume("bgm");
  if (!musicActivated || document.hidden || endingUi.mode === "exited" || backgroundMusic.volume === 0) {
    backgroundMusic.pause();
    return;
  }
  if (backgroundMusic.paused) backgroundMusic.play().catch(() => {
    // 자동 재생이 차단되면 다음 클릭·키 입력에서 다시 시도한다.
  });
}

// 브라우저 정책에 따라 첫 클릭이나 키 입력 후 음악을 시작한다.
for (const eventName of ["pointerdown", "keydown"]) {
  document.addEventListener(eventName, () => {
    musicActivated = true;
    syncBackgroundMusic();
  }, { capture: true });
}
document.addEventListener("visibilitychange", syncBackgroundMusic);
window.addEventListener("pagehide", () => backgroundMusic.pause());
window.addEventListener("pageshow", syncBackgroundMusic);
syncBackgroundMusic();
