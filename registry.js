"use strict";

// 문지른 중간 영역은 저장하지 않고 이 화면 전용 상태에만 둔다.
const registryProgress = { mask: null, erased: 0, pointerId: null, last: null };
const registryPanel = document.getElementById("registry-panel");
const registryCanvas = document.getElementById("registry-cover");

function resetRegistryProgress() {
  stopRegistryStroke();
  registryProgress.mask = null;
  registryProgress.erased = 0;
}

function renderRegistry() {
  registryPanel.hidden = inspectionUiState.mode !== "registry";
  if (registryPanel.hidden) return;
  inspectionMessage.textContent = gameState.registrySolved ? "" : REGISTRY_DATA.text.instruction;
  document.getElementById("registry-clue").textContent = REGISTRY_DATA.text.clue;
  registryCanvas.width = REGISTRY_DATA.width;
  registryCanvas.height = REGISTRY_DATA.height;
  registryCanvas.hidden = gameState.registrySolved;
  registryProgress.mask = new Uint8Array(REGISTRY_DATA.width * REGISTRY_DATA.height);
  registryProgress.erased = 0;
  drawRegistryCover();
}

function drawRegistryCover() {
  if (!registryProgress.mask || gameState.registrySolved) return;
  const context = registryCanvas.getContext("2d");
  const pixels = context.createImageData(REGISTRY_DATA.width, REGISTRY_DATA.height);
  for (let i = 0; i < registryProgress.mask.length; i++) {
    const shade = (i % 17 < 8) ? 184 : 188;
    pixels.data[i * 4] = shade;
    pixels.data[i * 4 + 1] = shade - 4;
    pixels.data[i * 4 + 2] = shade - 12;
    pixels.data[i * 4 + 3] = registryProgress.mask[i] ? 0 : 255;
  }
  context.putImageData(pixels, 0, 0);
}

function canRubRegistry() {
  return inspectionUiState.mode === "registry" && !gameState.registrySolved &&
    gameState.inventory.selectedItemId === REGISTRY_DATA.requiredItemId &&
    gameState.inventory.itemIds.includes(REGISTRY_DATA.requiredItemId);
}

function rubRegistry(from, to) {
  if (!canRubRegistry() || !registryProgress.mask) return;
  const { width, height, brushDiameter, solvedRatio } = REGISTRY_DATA;
  const radius = brushDiameter / 2;
  const dx = to.x - from.x, dy = to.y - from.y, lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return;
  const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
  const right = Math.min(width - 1, Math.ceil(Math.max(from.x, to.x) + radius));
  const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(from.y, to.y) + radius));
  // 실제 지운 픽셀을 한 번만 세어 같은 곳을 반복해서 문질러도 비율이 늘지 않는다.
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const index = y * width + x;
    if (registryProgress.mask[index]) continue;
    const t = Math.max(0, Math.min(1, ((x + 0.5 - from.x) * dx + (y + 0.5 - from.y) * dy) / lengthSquared));
    if ((x + 0.5 - from.x - t * dx) ** 2 + (y + 0.5 - from.y - t * dy) ** 2 <= radius * radius) {
      registryProgress.mask[index] = 1;
      registryProgress.erased++;
    }
  }
  if (registryProgress.erased / (width * height) >= solvedRatio) {
    gameState.registrySolved = true;
    updateAchievementConditions();
    registryCanvas.hidden = true;
    inspectionMessage.textContent = "";
    stopRegistryStroke();
  } else drawRegistryCover();
}

function registryPoint(event) {
  const bounds = registryCanvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  const x = (event.clientX - bounds.left) * REGISTRY_DATA.width / bounds.width;
  const y = (event.clientY - bounds.top) * REGISTRY_DATA.height / bounds.height;
  return x >= 0 && y >= 0 && x <= REGISTRY_DATA.width && y <= REGISTRY_DATA.height ? { x, y } : null;
}

function stopRegistryStroke() {
  const id = registryProgress.pointerId;
  registryProgress.pointerId = null;
  registryProgress.last = null;
  if (id !== null && registryCanvas.hasPointerCapture(id)) registryCanvas.releasePointerCapture(id);
}

registryCanvas.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !canRubRegistry() || registryProgress.pointerId !== null) return;
  const point = registryPoint(event);
  if (!point) return;
  event.preventDefault();
  registryProgress.pointerId = event.pointerId;
  registryProgress.last = point;
  registryCanvas.setPointerCapture(event.pointerId);
});
registryCanvas.addEventListener("pointermove", event => {
  if (event.pointerId !== registryProgress.pointerId) return;
  if (!(event.buttons & 1) || !canRubRegistry()) return stopRegistryStroke();
  const point = registryPoint(event);
  if (point && registryProgress.last) rubRegistry(registryProgress.last, point);
  registryProgress.last = registryProgress.pointerId === null ? null : point;
});
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
  registryCanvas.addEventListener(name, event => {
    if (event.pointerId === registryProgress.pointerId) stopRegistryStroke();
  });
}
window.addEventListener("blur", stopRegistryStroke);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopRegistryStroke(); });
