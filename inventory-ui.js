"use strict";

const inventoryDialog = document.getElementById("inventory-dialog");
const inventoryList = document.getElementById("inventory-list");
const inventoryClose = document.getElementById("inventory-close");

function refreshInventoryList() {
  renderInventoryList(inventoryList, id => {
    if (!selectInventoryItem(id)) return;
    refreshInventoryList();
    Array.from(inventoryList.children).find(button => button.dataset.itemId === id)?.focus();
    const item = ITEM_DATA.find(item => item.id === id);
    if (["photo", "infirmary"].includes(item.viewer)) openPhotoViewer(item);
  });
}

function closeInventory() {
  if (["photo", "infirmary"].includes(inspectionUiState.mode)) closeInspection();
  inventoryUiState.open = false;
  pressedKeys.clear();
  inventoryDialog.close();
  canvas.focus();
}

function toggleInventory() {
  if (inspectionUiState.mode && !["photo", "infirmary"].includes(inspectionUiState.mode)) return;
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
window.addEventListener("keydown", event => {
  if (event.code !== "KeyI" || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  if (!event.repeat && !event.isComposing) toggleInventory();
});
