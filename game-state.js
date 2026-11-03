"use strict";

// 저장 대상은 이 객체에 모은다. 실제 자동 저장·복원은 구현 순서 5에서 연결한다.
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
};
const inventoryUiState = { open: false };
// 창 상태와 사진의 앞뒷면은 저장하지 않는 임시 화면 상태다.
const inspectionUiState = { mode: null, object: null, item: null, back: false };

function isGameInputBlocked() {
  return inventoryUiState.open || inspectionUiState.mode !== null;
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
  for (const condition of ACHIEVEMENT_CONDITIONS) {
    const flags = condition.flags || [condition.flag];
    if (flags.every(flag => gameState[flag]) && condition.items.every(id => gameState.acquiredItems[id])) {
      gameState.achievementConditions[condition.id] = true;
    }
  }
}

function selectInventoryItem(itemId) {
  if (!gameState.inventory.itemIds.includes(itemId)) return false;
  gameState.inventory.selectedItemId = itemId;
  return true;
}
