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

function drawPhotoRoads() {
  const picture = document.getElementById("photo-road-picture");
  const context = picture.getContext("2d"), config = PHOTO_ROAD_DATA;
  picture.width = config.width; picture.height = config.height;
  context.fillStyle = config.paper;
  context.fillRect(0, 0, picture.width, picture.height);
  const anchorRoad = city.roads.find(road => road.id === config.anchorRoadId);
  if (!anchorRoad?.points.length) return;
  const anchor = anchorRoad.points[anchorRoad.points.length - 1];
  const crop = config.crop;
  const left = anchor[0] + crop.offsetX, top = anchor[1] + crop.offsetY;
  const scale = Math.min(picture.width / crop.width, picture.height / crop.height);
  context.save();
  context.beginPath();
  context.rect(0, 0, crop.width * scale, crop.height * scale);
  context.clip();
  context.scale(scale, scale);
  context.translate(-left, -top);
  context.strokeStyle = config.ink;
  context.lineWidth = config.lineWidth;
  context.lineCap = "round"; context.lineJoin = "round";
  // 도시와 같은 도로 중심선을 그리고 범위 밖만 잘라낸다. 회전하거나 별도의 길을 덧그리지 않는다.
  for (const road of city.roads) {
    context.beginPath();
    road.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.stroke();
  }
  context.restore();
}

function renderInspection() {
  const { mode, object, item, back } = inspectionUiState;
  inspectionDialog.dataset.mode = mode;
  // 대화창·게시판은 상호작용 키로도 닫을 수 있어 버튼에 키 이름을 함께 보여 준다.
  inspectionClose.textContent = object?.messages?.keyHint ? bindingCloseLabel("interact") : SETTINGS_DATA.text.close;
  const collected = mode === "album" && gameState.photoCollected;
  inspectionTitle.textContent = item && ["photo", "infirmary", "playgroundMemo", "diary"].includes(mode) ? item.name : object.name;
  inspectionMessage.textContent = mode === "board" ? SCHOOL_DATA.boardMap.hint : mode === "dialogue" ? object.messages.dialogue :
    mode === "photo" ? STUDIO_TEXT.flip : collected ? STUDIO_TEXT.emptyAlbum : STUDIO_TEXT.albumPrompt;
  photoButton.hidden = !["photo", "album"].includes(mode) || collected;
  emptyPhoto.hidden = !collected;
  emptyPhoto.textContent = STUDIO_TEXT.emptyAlbum;
  photoFront.hidden = mode === "photo" && back;
  photoBack.hidden = mode !== "photo" || !back;
  photoDate.textContent = item?.date || "";
  photoButton.setAttribute("aria-label", mode === "album" ? STUDIO_TEXT.collect : back ? STUDIO_TEXT.back : STUDIO_TEXT.front);
  if (mode === "photo" && back) drawPhotoRoads();
  renderSchoolBoardMap();
  renderClassroomPanel();
  renderRegistry();
  renderCarouselPanel();
  renderPlaygroundMemo();
  renderSlideGraffiti();
  renderCabinetPanel();
  renderDiaryPanel();
  if (typeof recordInspectionHint === "function") recordInspectionHint();
}

function showInspection() {
  if (inspectionUiState.mode === "diary") diaryUi.page = 0;
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

function closeInspection(options = {}) {
  const diaryFinished = inspectionUiState.mode === "diary" && finishDiaryReading(options.confirmDiary === true);
  if (inspectionUiState.mode === "cabinet") restoreUnsolvedCabinet();
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
  if (diaryFinished) startEnding();
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
inspectionClose.addEventListener("click", () => closeInspection({confirmDiary:true}));
inspectionDialog.addEventListener("cancel", event => event.preventDefault());
