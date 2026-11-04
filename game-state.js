"use strict";

// 영구 진행 상태를 모은다. save.js에서 임시 조작을 제외하여 저장한다.
const gameState = {
  inventory: { itemIds: [], selectedItemId: null },
  acquiredItems: {},
  photoCollected: false,
  registrySolved: false,
  carouselSolved: false,
  playgroundMemoPending: false,
  playgroundMemoViewed: false,
  swingUsed: false,
  seesawUsed: false,
  slideUsed: false,
  childRoomUnlocked: false,
  diaryDiscovered: false,
  endingReached: false,
  cabinet: { slots: Array(CABINET_DATA.rules.slotCount).fill(null) },
  cabinetSolved: false,
  cabinetKeyGranted: false,
  achievementConditions: {},
  hints: createHintState(),
  achievements: Object.fromEntries(ACHIEVEMENT_CONDITIONS.map(entry => [entry.id, entry.order === 1 ? "active" : "hidden"])),
};
const achievementUi = { open: false, queue: [], current: null, until: 0 };
const inventoryUiState = { open: false };
// 창 상태와 사진의 앞뒷면은 저장하지 않는 임시 화면 상태다.
const inspectionUiState = { mode: null, object: null, item: null, back: false };

function isGameInputBlocked() {
  return (typeof endingUi !== "undefined" && endingUi.mode !== null) || settingsUi.open || mapUi.open || (typeof hintUi !== "undefined" && hintUi.open) || achievementUi.open || inventoryUiState.open || inspectionUiState.mode !== null;
}

function acquireItem(itemId) {
  const item = ITEM_DATA.find(item => item.id === itemId);
  if (!item || (item.acquisitionFlag && gameState[item.acquisitionFlag]) ||
      gameState.acquiredItems[itemId] || gameState.inventory.itemIds.includes(itemId)) return false;
  gameState.inventory.itemIds.push(itemId);
  gameState.acquiredItems[itemId] = true;
  if (item.acquisitionFlag) gameState[item.acquisitionFlag] = true;
  updateAchievementConditions();
  return true;
}

function updateAchievementConditions() {
  const ordered = [...ACHIEVEMENT_CONDITIONS].sort((a,b) => a.order-b.order);
  for (const condition of ordered) {
    const flags = condition.flags || [condition.flag];
    if (flags.every(flag => gameState[flag]) && condition.items.every(id => gameState.acquiredItems[id])) {
      gameState.achievementConditions[condition.id] = true;
    }
    if (gameState.achievementConditions[condition.id] && gameState.achievements[condition.id] !== "completed") {
      gameState.achievements[condition.id] = "completed";
      achievementUi.queue.push(condition.id);
    }
  }
  let activeAssigned = false;
  for (const condition of ordered) {
    if (gameState.achievements[condition.id] === "completed") continue;
    gameState.achievements[condition.id] = activeAssigned ? "hidden" : "active";
    activeAssigned = true;
  }
  if (typeof syncHintProgress === "function") syncHintProgress();
  if (typeof saveProgress === "function") saveProgress();
}

function selectInventoryItem(itemId) {
  if (!gameState.inventory.itemIds.includes(itemId)) return false;
  gameState.inventory.selectedItemId = itemId;
  return true;
}
