"use strict";

// 저장 대상은 이 객체에 모은다. 실제 자동 저장·복원은 구현 순서 5에서 연결한다.
const gameState = {
  inventory: { itemIds: [], selectedItemId: null },
  acquiredItems: {},
};
const inventoryUiState = { open: false };

function acquireItem(itemId) {
  if (!ITEM_DATA.some(item => item.id === itemId) ||
      gameState.acquiredItems[itemId] || gameState.inventory.itemIds.includes(itemId)) return false;
  gameState.inventory.itemIds.push(itemId);
  gameState.acquiredItems[itemId] = true;
  return true;
}

function selectInventoryItem(itemId) {
  if (!gameState.inventory.itemIds.includes(itemId)) return false;
  gameState.inventory.selectedItemId = itemId;
  return true;
}
