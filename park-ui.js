"use strict";

const carouselPanel = document.getElementById("carousel-panel");
const horseInput = document.getElementById("carousel-horses");
const carriageInput = document.getElementById("carousel-carriages");
const carouselConfirm = document.getElementById("carousel-confirm");

function renderCarouselPanel() {
  carouselPanel.hidden = inspectionUiState.mode !== "carousel";
  if (carouselPanel.hidden) return;
  inspectionMessage.textContent = gameState.carouselSolved ? PARK_DATA.text.solved : PARK_DATA.text.prompt;
  document.getElementById("carousel-horse-label").textContent = PARK_DATA.text.horse;
  document.getElementById("carousel-carriage-label").textContent = PARK_DATA.text.carriage;
  carouselConfirm.textContent = PARK_DATA.text.confirm;
  horseInput.disabled = carriageInput.disabled = carouselConfirm.disabled = gameState.carouselSolved;
}

carouselPanel.addEventListener("submit", event => {
  event.preventDefault();
  if (inspectionUiState.mode !== "carousel" || gameState.carouselSolved) return;
  // 빈칸이나 잘못된 문자는 정답으로 처리하지 않고, 오답은 입력 상태를 유지한다.
  if (!/^\d+$/.test(horseInput.value) || !/^\d+$/.test(carriageInput.value)) return;
  if (Number(horseInput.value) !== PARK_DATA.carousel.horseCount || Number(carriageInput.value) !== PARK_DATA.carousel.carriageCount) return;
  gameState.carouselSolved = true;
  updateAchievementConditions();
  renderCarouselPanel();
});

function collectParkBalloon() {
  if (isGameInputBlocked() || !gameState.carouselSolved) return;
  if (!gameState.acquiredItems[PARK_DATA.balloonId]) {
    // 풍선 지급과 메모 지급 예약을 같은 동기 처리에서 기록한다.
    gameState.playgroundMemoPending = true;
    acquireItem(PARK_DATA.balloonId);
  }
  if (gameState.playgroundMemoPending) openInspection({ type: "playgroundMemo", name: PARK_DATA.text.memo });
}

function finishPlaygroundMemo() {
  if (!gameState.playgroundMemoPending) return;
  acquireItem(PARK_DATA.memoId);
  // 지급 확인 후에만 대기 기록을 지운다. 여러 번 호출해도 중복 지급되지 않는다.
  if (gameState.inventory.itemIds.includes(PARK_DATA.memoId)) gameState.playgroundMemoPending = false;
}

function renderPlaygroundMemo() {
  const panel = document.getElementById("playground-memo");
  panel.hidden = inspectionUiState.mode !== "playgroundMemo";
  if (panel.hidden) return;
  inspectionMessage.textContent = PARK_DATA.text.memoHint;
  for (const key of ["swing", "seesaw", "slide", "entrance"]) {
    document.getElementById(`memo-${key}`).textContent = PARK_DATA.text[key];
  }
}
