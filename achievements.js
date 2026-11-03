"use strict";

function renderAchievements() {
  const list = document.getElementById("achievement-list");
  list.replaceChildren();
  for (const entry of [...ACHIEVEMENT_CONDITIONS].sort((a,b) => a.order-b.order)) {
    const status = gameState.achievements[entry.id];
    if (status === "hidden") continue;
    const row = document.createElement("li");
    row.dataset.status = status;
    row.dataset.achievementId = entry.id;
    const title = document.createElement("h2");
    title.textContent = entry.name;
    const condition = document.createElement("p");
    condition.textContent = entry.description;
    const label = document.createElement("strong");
    label.textContent = ACHIEVEMENT_TEXT[status];
    row.append(title, condition, label);
    list.append(row);
  }
}

function closeAchievements() {
  achievementUi.open = false;
  pressedKeys.clear();
  document.getElementById("achievement-dialog").close();
  canvas.focus();
}

function toggleAchievements() {
  if (achievementUi.open) return closeAchievements();
  if (isGameInputBlocked()) return;
  stopBubbleDrag();
  pressedKeys.clear();
  updateAchievementConditions();
  renderAchievements();
  achievementUi.open = true;
  document.getElementById("achievement-dialog").showModal();
  document.getElementById("achievement-close").focus();
}

function updateAchievementNotifications() {
  if (achievementUi.current && Date.now() >= achievementUi.until) achievementUi.current = null;
  if (!achievementUi.current && achievementUi.queue.length) {
    achievementUi.current = achievementUi.queue.shift();
    achievementUi.until = Date.now() + ACHIEVEMENT_SETTINGS.notificationMs;
  }
  const entry = ACHIEVEMENT_CONDITIONS.find(entry => entry.id === achievementUi.current);
  // 조사나 인벤토리 창 위에서도 읽을 수 있도록 각 화면에 같은 알림을 둔다.
  for (const id of ["achievement-toast", "achievement-toast-inventory", "achievement-toast-inspection", "achievement-toast-list"]) {
    const toast = document.getElementById(id);
    toast.hidden = !entry;
    const message = entry ? `${ACHIEVEMENT_TEXT.notification}: ${entry.name}` : "";
    if (toast.textContent !== message) toast.textContent = message;
  }
}

document.getElementById("achievement-title").textContent = ACHIEVEMENT_TEXT.title;
document.getElementById("achievement-close").textContent = ACHIEVEMENT_TEXT.close;
document.getElementById("achievement-close").addEventListener("click", closeAchievements);
document.getElementById("achievement-dialog").addEventListener("cancel", event => event.preventDefault());
window.addEventListener("keydown", event => {
  if (event.code !== "Tab" || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
  if (!achievementUi.open && isGameInputBlocked()) return;
  event.preventDefault();
  if (!event.repeat) toggleAchievements();
});
