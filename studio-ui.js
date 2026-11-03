"use strict";

const inspectionDialog = document.getElementById("inspection-dialog");
const inspectionTitle = document.getElementById("inspection-title");
const inspectionMessage = document.getElementById("inspection-message");
const inspectionClose = document.getElementById("inspection-close");
const photoButton = document.getElementById("studio-photo");
const photoFront = document.getElementById("photo-front");
const photoBack = document.getElementById("photo-back");
const photoDate = document.getElementById("photo-date");
const emptyPhoto = document.getElementById("empty-photo");

function renderInspection() {
  const { mode, object, item, back } = inspectionUiState;
  const collected = mode === "album" && gameState.photoCollected;
  inspectionTitle.textContent = item && ["photo", "infirmary", "playgroundMemo"].includes(mode) ? item.name : object.name;
  inspectionMessage.textContent = mode === "board" ? schoolBoardText() : mode === "dialogue" ? object.messages.dialogue :
    mode === "photo" ? STUDIO_TEXT.flip : collected ? STUDIO_TEXT.emptyAlbum : STUDIO_TEXT.albumPrompt;
  photoButton.hidden = !["photo", "album"].includes(mode) || collected;
  emptyPhoto.hidden = !collected;
  emptyPhoto.textContent = STUDIO_TEXT.emptyAlbum;
  photoFront.hidden = mode === "photo" && back;
  photoBack.hidden = mode !== "photo" || !back;
  photoDate.textContent = item?.date || "";
  photoButton.setAttribute("aria-label", mode === "album" ? STUDIO_TEXT.collect : back ? STUDIO_TEXT.back : STUDIO_TEXT.front);
  document.getElementById("photo-back-label").textContent = STUDIO_TEXT.temporaryBack;
  renderClassroomPanel();
  renderRegistry();
  renderCarouselPanel();
  renderPlaygroundMemo();
  renderSlideGraffiti();
}

function showInspection() {
  stopBubbleDrag();
  pressedKeys.clear();
  renderInspection();
  inspectionDialog.showModal();
  if (inspectionUiState.mode === "playgroundMemo") {
    gameState.playgroundMemoViewed = true;
    updateAchievementConditions();
  }
  inspectionClose.focus();
}

function openInspection(object) {
  if (isGameInputBlocked()) return;
  inspectionUiState.mode = object.type;
  inspectionUiState.object = object;
  inspectionUiState.item = ITEM_DATA.find(item => item.id === object.rewardId) || null;
  inspectionUiState.back = false;
  showInspection();
}

function openPhotoViewer(item) {
  if (!inventoryUiState.open || inspectionUiState.mode || !gameState.inventory.itemIds.includes(item.id)) return;
  inspectionUiState.mode = item.viewer;
  inspectionUiState.object = null;
  inspectionUiState.item = item;
  inspectionUiState.back = false;
  showInspection();
}

function closeInspection() {
  if (inspectionUiState.mode === "playgroundMemo") finishPlaygroundMemo();
  resetRegistryProgress();
  inspectionUiState.mode = null;
  inspectionUiState.object = null;
  inspectionUiState.item = null;
  inspectionUiState.back = false;
  pressedKeys.clear();
  inspectionDialog.close();
  if (inventoryUiState.open) {
    Array.from(inventoryList.children).find(button => button.dataset.itemId === gameState.inventory.selectedItemId)?.focus();
  } else canvas.focus();
}

photoButton.addEventListener("click", () => {
  if (inspectionUiState.mode === "album") {
    if (!gameState.photoCollected && acquireItem(inspectionUiState.object.rewardId)) {
      showDoorMessage(inspectionUiState.object.messages.acquired);
    }
  } else if (inspectionUiState.mode === "photo") {
    inspectionUiState.back = !inspectionUiState.back;
  } else return;
  renderInspection();
  if (photoButton.hidden) inspectionClose.focus();
});
inspectionClose.addEventListener("click", closeInspection);
inspectionDialog.addEventListener("cancel", event => event.preventDefault());
