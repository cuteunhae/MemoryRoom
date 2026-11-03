"use strict";

// 읽던 페이지는 저장하지 않는다. 조사 화면을 열 때마다 첫 페이지로 돌아간다.
const diaryUi = { page: 0 };

function investigateDiary() {
  if (isGameInputBlocked() || !gameState.childRoomUnlocked) return;
  acquireItem(DIARY_DATA.itemId);
  gameState.diaryDiscovered = true;
  updateAchievementConditions();
  openInspection({ type: "diary", name: DIARY_DATA.text.title });
}

function renderDiaryPanel() {
  const panel = document.getElementById("diary-panel");
  panel.hidden = inspectionUiState.mode !== "diary";
  if (panel.hidden) return;
  const page = DIARY_DATA.pages[diaryUi.page];
  const last = diaryUi.page === DIARY_DATA.pages.length - 1;
  inspectionMessage.textContent = last ? DIARY_DATA.text.last : "";
  document.getElementById("diary-page-number").textContent = `${diaryUi.page + 1} / ${DIARY_DATA.pages.length} ${DIARY_DATA.text.page}`;
  document.getElementById("diary-heading").textContent = page.title;
  document.getElementById("diary-heading").hidden = !page.title;
  document.getElementById("diary-body").textContent = page.body;
  const next = document.getElementById("diary-next");
  next.textContent = DIARY_DATA.text.next;
  next.hidden = last;
  next.onclick = () => {
    if (inspectionUiState.mode !== "diary" || diaryUi.page >= DIARY_DATA.pages.length - 1) return;
    diaryUi.page += 1;
    renderDiaryPanel();
    if (diaryUi.page === DIARY_DATA.pages.length - 1) inspectionClose.focus();
  };
}

function finishDiaryReading() {
  if (diaryUi.page === DIARY_DATA.pages.length - 1) {
    // TODO: 구현 순서 6에서 이 완료 지점에 엔딩 회상 연출을 연결한다.
    gameState.endingReached = true;
  }
  diaryUi.page = 0;
}

function drawChildRoomFurniture() {
  const bed = DIARY_DATA.bed, book = DIARY_DATA.book;
  ctx.fillStyle = "#a88364";
  ctx.fillRect(bed.x-bed.width/2, bed.y-bed.height/2, bed.width, bed.height);
  ctx.fillStyle = "#c5d7cf";
  ctx.fillRect(bed.x-bed.width/2+6, bed.y-bed.height/2+6, bed.width-12, bed.height-12);
  ctx.fillStyle = "#fff3df";
  ctx.fillRect(bed.x-bed.width/2+12, bed.y-bed.height/2+12, bed.width-24, 28);
  ctx.fillStyle = "#8a646b";
  ctx.fillRect(book.x-book.width/2, book.y-book.height/2, book.width, book.height);
  ctx.fillStyle = "#f7e8c8";
  ctx.fillRect(book.x-book.width/2+5, book.y-book.height/2+5, 3, book.height-10);
  ctx.fillStyle = "#4e443c";
  ctx.font = "14px 'Malgun Gothic', sans-serif";
  ctx.fillText(DIARY_DATA.text.title, book.x, bed.y+bed.height/2+14);
}
