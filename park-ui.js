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
  renderCarouselPanel();
});
