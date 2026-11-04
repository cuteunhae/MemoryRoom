"use strict";

const inventoryDialog = document.getElementById("inventory-dialog");
const inventoryList = document.getElementById("inventory-list");
const inventoryClose = document.getElementById("inventory-close");

function refreshInventoryList() {
  inventoryClose.textContent = bindingCloseLabel("inventory");
  renderInventoryList(inventoryList, id => {
    if (!selectInventoryItem(id)) return;
    refreshInventoryList();
    Array.from(inventoryList.children).find(button => button.dataset.itemId === id)?.focus();
    const item = ITEM_DATA.find(item => item.id === id);
    if (id === PLAYGROUND_DATA.toyId) showDoorMessage(PLAYGROUND_DATA.text.toyHelp);
    if (["photo", "infirmary", "playgroundMemo", "diary"].includes(item.viewer)) openPhotoViewer(item);
  });
}

function closeInventory() {
  if (["photo", "infirmary", "playgroundMemo", "diary"].includes(inspectionUiState.mode)) closeInspection();
  inventoryUiState.open = false;
  pressedKeys.clear();
  inventoryDialog.close();
  canvas.focus();
}

function toggleInventory() {
  if (settingsUi.open || mapUi.open) return;
  if (typeof hintUi !== "undefined" && hintUi.open) return;
  if (achievementUi.open) return;
  stopBubbleDrag();
  if (inspectionUiState.mode && (!inventoryUiState.open || !["photo", "infirmary", "playgroundMemo", "diary"].includes(inspectionUiState.mode))) return;
  if (gameState.playgroundMemoPending && !inspectionUiState.mode) {
    openInspection({ type: "playgroundMemo", name: PARK_DATA.text.memo });
    return;
  }
  if (inventoryUiState.open) return closeInventory();
  pressedKeys.clear();
  refreshInventoryList();
  inventoryUiState.open = true;
  inventoryDialog.showModal();
  inventoryClose.focus();
}

inventoryClose.addEventListener("click", closeInventory);
// 닫기는 I 키와 닫기 버튼으로만 처리한다.
inventoryDialog.addEventListener("cancel", event => event.preventDefault());
